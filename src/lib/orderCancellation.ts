import mongoose from "mongoose";
import Order, { IOrder } from "@/models/Order";
import Goat from "@/models/Goat";
import { createRazorpayRefund } from "@/lib/razorpay";
import { logFinancialEvent } from "@/lib/auditLogger";

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
 * Enforces server-side authorization, atomic state transitions, idempotent refunds,
 * safe inventory restoration, and preserves the permanent financial snapshot.
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

  // Authoritative amount strictly from the stored order document in integer paise
  const refundAmountRupees = order.amount;
  const refundAmountPaise = Math.round(refundAmountRupees * 100);

  // Acquire concurrency lock via atomic conditional update:
  // Strictly requires status to not be already cancelled/refunded and refund.status to not be processing/processed
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
    // Check if another concurrent request already refunded or locked it
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

  // Call Razorpay Refund API
  let rzpRefund: any;
  try {
    rzpRefund = await createRazorpayRefund({
      paymentId: razorpayPaymentId,
      amountPaise: refundAmountPaise,
      notes: {
        orderId: order.orderId,
        cancellationReason,
      },
      receipt: `rfnd_${order.orderId}`,
    });
  } catch (error: any) {
    console.error("[Razorpay Refund Error]:", error?.message || error);

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

  // 5. Inspect Provider Refund Status
  const isProcessedImmediately = rzpRefund.status === "processed";

  if (isProcessedImmediately) {
    const processedAt = new Date();
    const finalOrder = await Order.findByIdAndUpdate(
      order._id,
      {
        $set: {
          status: "refunded",
          "payment.status": "refunded",
          "refund.status": "processed",
          "refund.refundId": rzpRefund.id,
          "refund.amount":
            typeof rzpRefund.amount === "number"
              ? rzpRefund.amount / 100
              : refundAmountRupees,
          "refund.currency": rzpRefund.currency || "INR",
          "refund.processedAt": processedAt,
          "cancellation.cancelledAt": processedAt,
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

    // 6. Release goat safely back to "sale" ONLY if it is still 'sold' AND associated with this order
    // NEVER if it is 'reserved' by another order or sold to another order!
    await Goat.findOneAndUpdate(
      {
        _id: order.goat,
        status: "sold",
        $or: [
          { currentOrderId: order._id },
          { currentOrderId: null },
          { currentOrderId: { $exists: false } },
        ],
      },
      { $set: { status: "sale", currentOrderId: null } }
    );

    await logFinancialEvent({
      action: "refund_processed",
      entityType: "refund",
      entityId: rzpRefund.id,
      orderId: order._id.toString(),
      actorId: userId,
      actorRole: userRole,
      amount:
        typeof rzpRefund.amount === "number"
          ? rzpRefund.amount / 100
          : refundAmountRupees,
      currency: rzpRefund.currency || "INR",
      previousState: "processing",
      newState: "processed",
      providerReference: rzpRefund.id,
      status: "success",
      metadata: { orderNumber: order.orderId },
    });

    return {
      success: true,
      order: finalOrder,
      refundInitiated: true,
      refundId: rzpRefund.id,
      refundAmount:
        typeof rzpRefund.amount === "number"
          ? rzpRefund.amount / 100
          : refundAmountRupees,
      message: "Order cancelled and payment successfully refunded",
    };
  } else {
    // Provider created/initiated refund, but it is pending/processing
    // Persist processing state and wait for refund.processed webhook confirmation
    const finalOrder = await Order.findByIdAndUpdate(
      order._id,
      {
        $set: {
          "refund.status": "processing",
          "refund.refundId": rzpRefund.id,
          "refund.amount":
            typeof rzpRefund.amount === "number"
              ? rzpRefund.amount / 100
              : refundAmountRupees,
          "refund.currency": rzpRefund.currency || "INR",
          "cancellation.cancelledAt": new Date(),
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
      entityId: rzpRefund.id,
      orderId: order._id.toString(),
      actorId: userId,
      actorRole: userRole,
      amount:
        typeof rzpRefund.amount === "number"
          ? rzpRefund.amount / 100
          : refundAmountRupees,
      currency: rzpRefund.currency || "INR",
      previousState: "paid",
      newState: "processing",
      providerReference: rzpRefund.id,
      status: "success",
      metadata: { orderNumber: order.orderId },
    });

    // DO NOT release goat yet, DO NOT mark payment.status as refunded yet
    return {
      success: true,
      order: finalOrder,
      refundInitiated: true,
      refundId: rzpRefund.id,
      refundAmount:
        typeof rzpRefund.amount === "number"
          ? rzpRefund.amount / 100
          : refundAmountRupees,
      message:
        "Refund initiated with Razorpay. Status will update once confirmation is received.",
    };
  }
}
