import mongoose from "mongoose";
import Order, { IOrder } from "@/models/Order";
import Goat from "@/models/Goat";
import { createRazorpayRefund } from "@/lib/razorpay";
import { logFinancialEvent } from "@/lib/auditLogger";
import { calculateRefundFinancials } from "@/lib/commission";

export interface CancelOrderParams {
  orderId: string;
  userId: string;
  userRole: "customer" | "seller" | "admin";
  reason?: string;
}

export interface CancelOrderResult {
  success: boolean;
  code?:
    | "ORDER_NOT_FOUND"
    | "UNAUTHORIZED"
    | "ALREADY_CANCELLED"
    | "ALREADY_REFUNDED"
    | "NOT_ELIGIBLE"
    | "INVENTORY_RESTORE_FAILED"
    | "REFUND_IN_PROGRESS"
    | "REFUND_FAILED"
    | "MISSING_PAYMENT_ID"
    | "CONCURRENT_MODIFICATION"
    | "SERVER_ERROR";
  error?: string;
  order?: IOrder | null;
  refundInitiated?: boolean;
  refundId?: string;
  refundAmount?: number;
  message?: string;
}

/**
 * Shared authoritative cancellation and refund handler for GoatMart.
 * 
 * STRICT BUSINESS RULES:
 * 1. Validate cancellation eligibility and server authorization.
 * 2. RESTORE GOAT TO INVENTORY FIRST:
 *    Atomically transition goat from "sold" to "sale".
 *    If inventory restoration fails or goat cannot be restored, ABORT refund,
 *    log audit event, and return error without modifying refund or order status.
 * 3. Calculate refund financials:
 *    - Refund commission = 3.5% of TOTAL customer payment (price + delivery).
 *    - Deduct admin-approved platform and seller expenses stored on the order.
 *    - Final Refund = Total Paid - 3.5% commission - platformExpense - sellerExpense.
 * 4. Call Razorpay refund API for finalRefundAmount.
 * 5. Update order status to "refunded", record breakdown and cancellation snapshot.
 */
export async function cancelAndRefundOrder(
  params: CancelOrderParams
): Promise<CancelOrderResult> {
  const { orderId, userId, userRole, reason } = params;

  if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
    return {
      success: false,
      code: "ORDER_NOT_FOUND",
      error: "Valid order ID is required",
    };
  }

  // 1. Authoritative order retrieval
  const order = await Order.findById(orderId);
  if (!order) {
    return {
      success: false,
      code: "ORDER_NOT_FOUND",
      error: "Order not found",
    };
  }

  // 2. Server-side authorization check:
  // - Customer can only cancel their own order
  // - Seller CANNOT cancel customer orders
  // - Admin can cancel/refund any order
  if (userRole === "customer") {
    if (order.customer.toString() !== userId) {
      return {
        success: false,
        code: "UNAUTHORIZED",
        error: "You are not authorized to cancel this order",
      };
    }
  } else if (userRole === "seller") {
    return {
      success: false,
      code: "UNAUTHORIZED",
      error: "Sellers are not permitted to cancel customer orders",
    };
  } else if (userRole !== "admin") {
    return {
      success: false,
      code: "UNAUTHORIZED",
      error: "Unauthorized user role",
    };
  }

  // 3. Status checks:
  if (order.status === "cancelled") {
    return {
      success: false,
      code: "ALREADY_CANCELLED",
      error: "This order has already been cancelled",
    };
  }

  if (
    order.status === "refunded" ||
    order.payment?.status === "refunded" ||
    order.refund?.status === "processed"
  ) {
    return {
      success: false,
      code: "ALREADY_REFUNDED",
      error: "This order has already been refunded",
    };
  }

  // Eligibility check: Cannot cancel if already dispatched, out for delivery, or delivered
  if (
    order.status === "dispatched" ||
    order.status === "out_for_delivery" ||
    order.status === "delivered"
  ) {
    return {
      success: false,
      code: "NOT_ELIGIBLE",
      error: `Cannot cancel an order that has reached '${order.status}' status`,
    };
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  const cancellationReason = reason?.trim() || "Customer requested cancellation";

  // 4. Branch based on authoritative payment state
  const isPaid = order.payment?.status === "paid";

  if (!isPaid) {
    // ==========================================
    // CASE A: UNPAID ORDER (pending / failed)
    // ==========================================
    // No payment collected -> No Razorpay refund required
    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: order._id,
        status: { $in: ["pending"] },
        "payment.status": { $ne: "paid" },
      },
      {
        $set: {
          status: "cancelled",
          "cancellation.cancelledAt": now,
          "cancellation.cancelledBy": new mongoose.Types.ObjectId(userId),
          "cancellation.cancelledByRole": userRole,
          "cancellation.reason": cancellationReason,
        },
        $push: {
          timeline: {
            s: "Order Cancelled",
            d: dateStr,
            done: true,
            updatedAt: now,
          },
        },
      },
      { new: true }
    );

    if (!updatedOrder) {
      // Re-read to check if race condition modified it
      const current = await Order.findById(order._id);
      if (current?.status === "cancelled") {
        return {
          success: false,
          code: "ALREADY_CANCELLED",
          error: "This order has already been cancelled",
        };
      }
      return {
        success: false,
        code: "CONCURRENT_MODIFICATION",
        error: "Unable to cancel order due to a concurrent modification. Please refresh and try again.",
      };
    }

    // Release goat from reserved back to sale if it is currently reserved for this order
    await Goat.findOneAndUpdate(
      {
        _id: order.goat,
        status: "reserved",
        $or: [
          { currentOrderId: order._id },
          { currentOrderId: null },
          { currentOrderId: { $exists: false } },
        ],
      },
      { $set: { status: "sale", currentOrderId: null } }
    );

    await logFinancialEvent({
      action: "cancellation_requested",
      entityType: "order",
      entityId: order._id.toString(),
      orderId: order._id.toString(),
      actorId: userId,
      actorRole: userRole,
      amount: order.amount,
      previousState: order.status,
      newState: "cancelled",
      reason: cancellationReason,
      metadata: { orderNumber: order.orderId },
    });

    return {
      success: true,
      order: updatedOrder,
      refundInitiated: false,
      message: "Order successfully cancelled",
    };
  }

  // ==========================================
  // CASE B: PAID ORDER -> RAZORPAY REFUND FLOW
  // ==========================================
  const razorpayPaymentId = order.payment?.razorpayPaymentId;
  if (!razorpayPaymentId) {
    return {
      success: false,
      code: "MISSING_PAYMENT_ID",
      error: "Authoritative Razorpay payment identifier is missing on this order",
    };
  }

  // Idempotency check: Is a refund currently underway or already processed?
  if (order.refund?.status === "processing") {
    return {
      success: false,
      code: "REFUND_IN_PROGRESS",
      error: "A refund is already in progress for this order. Please wait.",
    };
  }

  // STEP 2: RESTORE GOAT TO INVENTORY FIRST (Strict Business Rule)
  // Verify inventory update BEFORE calling Razorpay or marking order refunded.
  // If restoration fails, ABORT immediately.
  const restoredGoat = await Goat.findOneAndUpdate(
    {
      _id: order.goat,
      status: "sold",
      $or: [
        { currentOrderId: order._id },
        { currentOrderId: null },
        { currentOrderId: { $exists: false } },
      ],
    },
    { $set: { status: "sale", currentOrderId: null } },
    { new: true }
  );

  if (!restoredGoat) {
    await logFinancialEvent({
      action: "refund_failed",
      entityType: "order",
      entityId: order._id.toString(),
      orderId: order._id.toString(),
      actorId: userId,
      actorRole: userRole,
      amount: order.amount,
      currency: order.currency || "INR",
      previousState: order.status,
      newState: order.status,
      status: "failure",
      reason: "Inventory restoration failed: Goat listing could not be restored to sale status",
      metadata: { orderNumber: order.orderId, goatId: order.goat?.toString() },
    });

    return {
      success: false,
      code: "INVENTORY_RESTORE_FAILED",
      error: "Unable to restore goat to inventory. Cancellation and refund aborted to maintain inventory integrity.",
    };
  }

  // STEP 3: COMPUTE REFUND FINANCIALS (3.5% commission + stored expenses)
  const platformExpense = (order.expenses || [])
    .filter((e: any) => e.type === "platform")
    .reduce((acc: number, e: any) => acc + (e.amount || 0), 0);

  const sellerExpense = (order.expenses || [])
    .filter((e: any) => e.type === "seller")
    .reduce((acc: number, e: any) => acc + (e.amount || 0), 0);

  const refundFinancials = calculateRefundFinancials(order.amount, platformExpense, sellerExpense);
  const refundAmountRupees = refundFinancials.finalRefundAmount;
  const refundAmountPaise = Math.round(refundAmountRupees * 100);

  // Acquire concurrency lock via atomic conditional update:
  const lockedOrder = await Order.findOneAndUpdate(
    {
      _id: order._id,
      status: { $in: ["pending", "payment_confirmed", "processing"] },
      "payment.status": "paid",
      "refund.status": { $nin: ["processing", "processed"] },
    },
    {
      $set: {
        "refund.status": "processing",
        "refund.initiatedAt": now,
        "refund.amount": refundAmountRupees,
        "refund.currency": order.currency || "INR",
        "refund.reason": cancellationReason,
        "cancellation.cancelledBy": new mongoose.Types.ObjectId(userId),
        "cancellation.cancelledByRole": userRole,
        "cancellation.reason": cancellationReason,
      },
    },
    { new: true }
  );

  if (!lockedOrder) {
    // Revert goat back to sold if order could not be locked
    await Goat.findByIdAndUpdate(order.goat, {
      $set: { status: "sold", currentOrderId: order._id },
    });

    const refreshed = await Order.findById(order._id);
    if (refreshed?.status === "refunded" || refreshed?.refund?.status === "processed") {
      return {
        success: false,
        code: "ALREADY_REFUNDED",
        error: "This order has already been refunded",
      };
    }
    if (refreshed?.refund?.status === "processing") {
      return {
        success: false,
        code: "REFUND_IN_PROGRESS",
        error: "A refund is currently processing for this order",
      };
    }
    return {
      success: false,
      code: "CONCURRENT_MODIFICATION",
      error: "Could not initiate refund due to a concurrent state change",
    };
  }

  // STEP 4: Call Razorpay Refund API
  let rzpRefund: any = null;
  if (refundAmountPaise > 0) {
    try {
      rzpRefund = await createRazorpayRefund({
        paymentId: razorpayPaymentId,
        amountPaise: refundAmountPaise,
        notes: {
          orderId: order.orderId,
          cancellationReason,
          refundCommissionRate: String(refundFinancials.refundCommissionRate),
          refundCommissionAmount: String(refundFinancials.refundCommissionAmount),
          platformExpense: String(refundFinancials.platformExpense),
          sellerExpense: String(refundFinancials.sellerExpense),
        },
        receipt: `rfnd_${order.orderId}`,
      });
    } catch (error: any) {
      console.error("[Razorpay Refund Error]:", error?.message || error);

      // Revert goat back to sold so it remains tied to the active order
      await Goat.findByIdAndUpdate(order.goat, {
        $set: { status: "sold", currentOrderId: order._id },
      });

      // Atomically reset refund state to failed so user or admin can safely retry later
      await Order.findByIdAndUpdate(order._id, {
        $set: {
          "refund.status": "failed",
          "refund.failedAt": new Date(),
          "refund.failureReason": error?.message || "Razorpay API error",
        },
      });

      await logFinancialEvent({
        action: "refund_failed",
        entityType: "refund",
        entityId: razorpayPaymentId,
        orderId: order._id.toString(),
        actorId: userId,
        actorRole: userRole,
        amount: refundAmountRupees,
        currency: order.currency || "INR",
        previousState: "processing",
        newState: "failed",
        providerReference: razorpayPaymentId,
        status: "failure",
        reason: error?.message || "Razorpay API error",
        metadata: { orderNumber: order.orderId },
      });

      return {
        success: false,
        code: "REFUND_FAILED",
        error:
          "Payment refund request could not be completed with Razorpay. The order remains active and safe to retry.",
      };
    }
  }

  // STEP 5: Inspect Provider Refund Status & Persist Breakdown
  const isProcessedImmediately = refundAmountPaise === 0 || rzpRefund?.status === "processed";

  const refundBreakdownData = {
    totalCustomerPaid: refundFinancials.totalCustomerPaid,
    refundCommissionRate: refundFinancials.refundCommissionRate,
    refundCommissionAmount: refundFinancials.refundCommissionAmount,
    platformExpense: refundFinancials.platformExpense,
    sellerExpense: refundFinancials.sellerExpense,
    totalDeductions: refundFinancials.totalDeductions,
    finalRefundAmount: refundFinancials.finalRefundAmount,
  };

  if (isProcessedImmediately) {
    const processedAt = new Date();
    const finalOrder = await Order.findByIdAndUpdate(
      order._id,
      {
        $set: {
          status: "refunded",
          "payment.status": "refunded",
          "refund.status": "processed",
          "refund.refundId": rzpRefund?.id || "NO_REFUND_DEDUCTIONS_EXCEEDED",
          "refund.amount":
            typeof rzpRefund?.amount === "number"
              ? rzpRefund.amount / 100
              : refundAmountRupees,
          "refund.currency": rzpRefund?.currency || "INR",
          "refund.processedAt": processedAt,
          "refund.breakdown": refundBreakdownData,
          "cancellation.cancelledAt": processedAt,
          "cancellation.refundCommissionRate": refundFinancials.refundCommissionRate,
          "cancellation.refundCommissionAmount": refundFinancials.refundCommissionAmount,
          "cancellation.platformExpense": refundFinancials.platformExpense,
          "cancellation.sellerExpense": refundFinancials.sellerExpense,
          "cancellation.totalDeductions": refundFinancials.totalDeductions,
          "cancellation.finalRefundAmount": refundFinancials.finalRefundAmount,
        },
        $push: {
          timeline: {
            s: "Refund Completed",
            d: dateStr,
            done: true,
            updatedAt: processedAt,
          },
        },
      },
      { new: true }
    );

    await logFinancialEvent({
      action: "refund_processed",
      entityType: "refund",
      entityId: rzpRefund?.id || "NO_REFUND_DEDUCTIONS_EXCEEDED",
      orderId: order._id.toString(),
      actorId: userId,
      actorRole: userRole,
      amount: refundAmountRupees,
      currency: order.currency || "INR",
      previousState: "processing",
      newState: "processed",
      providerReference: rzpRefund?.id,
      status: "success",
      metadata: {
        orderNumber: order.orderId,
        refundBreakdown: refundBreakdownData,
      },
    });

    return {
      success: true,
      order: finalOrder,
      refundInitiated: true,
      refundId: rzpRefund?.id,
      refundAmount: refundAmountRupees,
      message: "Order cancelled and payment successfully refunded",
    };
  } else {
    // Provider created/initiated refund, but it is pending/processing
    const finalOrder = await Order.findByIdAndUpdate(
      order._id,
      {
        $set: {
          "refund.status": "processing",
          "refund.refundId": rzpRefund?.id,
          "refund.amount":
            typeof rzpRefund?.amount === "number"
              ? rzpRefund.amount / 100
              : refundAmountRupees,
          "refund.currency": rzpRefund?.currency || "INR",
          "refund.breakdown": refundBreakdownData,
          "cancellation.cancelledAt": new Date(),
          "cancellation.refundCommissionRate": refundFinancials.refundCommissionRate,
          "cancellation.refundCommissionAmount": refundFinancials.refundCommissionAmount,
          "cancellation.platformExpense": refundFinancials.platformExpense,
          "cancellation.sellerExpense": refundFinancials.sellerExpense,
          "cancellation.totalDeductions": refundFinancials.totalDeductions,
          "cancellation.finalRefundAmount": refundFinancials.finalRefundAmount,
        },
        $push: {
          timeline: {
            s: "Refund Initiated",
            d: dateStr,
            done: true,
            updatedAt: new Date(),
          },
        },
      },
      { new: true }
    );

    await logFinancialEvent({
      action: "refund_initiated",
      entityType: "refund",
      entityId: rzpRefund?.id || "unknown",
      orderId: order._id.toString(),
      actorId: userId,
      actorRole: userRole,
      amount: refundAmountRupees,
      currency: rzpRefund?.currency || "INR",
      previousState: "paid",
      newState: "processing",
      providerReference: rzpRefund?.id,
      status: "success",
      metadata: {
        orderNumber: order.orderId,
        refundBreakdown: refundBreakdownData,
      },
    });

    return {
      success: true,
      order: finalOrder,
      refundInitiated: true,
      refundId: rzpRefund?.id,
      refundAmount: refundAmountRupees,
      message:
        "Refund initiated with Razorpay. Status will update once confirmation is received.",
    };
  }
}
