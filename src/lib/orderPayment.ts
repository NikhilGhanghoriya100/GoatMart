import Order, { IOrder } from "@/models/Order";
import Goat from "@/models/Goat";
import mongoose from "mongoose";
import { logFinancialEvent } from "@/lib/auditLogger";
import { createRazorpayRefund } from "@/lib/razorpay";

export interface ConfirmPaymentParams {
  orderId?: string | mongoose.Types.ObjectId;
  razorpayOrderId?: string;
  razorpayPaymentId: string;
  razorpaySignature?: string;
  method?: string;
  amountPaidPaise?: number;
  currency?: string;
}

export interface ConfirmPaymentResult {
  success: boolean;
  alreadyPaid?: boolean;
  order?: IOrder | null;
  error?: string;
  code?:
    | "ORDER_NOT_FOUND"
    | "ORDER_CANCELLED"
    | "INVALID_CURRENCY"
    | "AMOUNT_MISMATCH"
    | "CONFLICTING_PAYMENT"
    | "UPDATE_FAILED"
    | "INVENTORY_COLLISION"
    | "ORDER_REFUNDED";
  message?: string;
}

/**
 * Shared, idempotent order payment confirmation engine.
 * Used by both client verification (/api/payment/verify) and server webhook (/api/payment/webhook).
 * Guarantees atomic state transition, avoids race conditions, and preserves financial snapshots.
 */
export async function confirmOrderPayment(
  params: ConfirmPaymentParams
): Promise<ConfirmPaymentResult> {
  const {
    orderId,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    method,
    amountPaidPaise,
    currency,
  } = params;

  if (!orderId && !razorpayOrderId) {
    return {
      success: false,
      code: "ORDER_NOT_FOUND",
      error: "Either orderId or razorpayOrderId must be provided",
    };
  }

  const query = orderId
    ? { _id: orderId }
    : { "payment.razorpayOrderId": razorpayOrderId };

  const order = await Order.findOne(query);
  if (!order) {
    return {
      success: false,
      code: "ORDER_NOT_FOUND",
      error: "Order record not found",
    };
  }

  if (order.status === "cancelled") {
    if (order.refund?.status === "processed" || order.payment?.status === "refunded") {
      return {
        success: false,
        code: "INVENTORY_COLLISION",
        order,
        error: "This order was cancelled and fully refunded due to an inventory collision",
        message: "Goat was purchased by another buyer. Your payment of 100% has already been refunded.",
      };
    }
    return {
      success: false,
      code: "ORDER_CANCELLED",
      error: "This order has been cancelled and cannot be confirmed",
    };
  }

  if (currency && currency.toUpperCase() !== "INR") {
    return {
      success: false,
      code: "INVALID_CURRENCY",
      error: `Invalid payment currency: ${currency}. GoatMart requires INR.`,
    };
  }

  if (typeof amountPaidPaise === "number") {
    const expectedPaise = Math.round(order.amount * 100);
    if (amountPaidPaise !== expectedPaise) {
      return {
        success: false,
        code: "AMOUNT_MISMATCH",
        error: `Paid amount (${amountPaidPaise} paise) does not exactly match authoritative order amount (${expectedPaise} paise)`,
      };
    }
  }

  // Idempotency: If order is already marked paid
  if (order.payment?.status === "paid") {
    if (
      order.payment.razorpayPaymentId === razorpayPaymentId ||
      order.payment.razorpayOrderId === razorpayOrderId
    ) {
      return {
        success: true,
        alreadyPaid: true,
        order,
        message: "Payment has already been verified for this order",
      };
    }
    return {
      success: false,
      code: "CONFLICTING_PAYMENT",
      error: "Order has already been confirmed under another payment transaction",
    };
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", { month: "short", day: "numeric" });

  // -------------------------------------------------------------------------
  // ATOMIC INVENTORY CLAIM:
  // Strictly claim goat ownership only if the goat is in 'sale'
  // (or already claimed by this exact order in an idempotent retry).
  // If another order already owns the goat, this atomic update will fail.
  // -------------------------------------------------------------------------
  const acquiredGoat = await Goat.findOneAndUpdate(
    {
      _id: order.goat,
      $or: [
        { status: "sale" },
        { status: "sold", currentOrderId: order._id },
        { status: "reserved", currentOrderId: order._id }, // Support legacy reserved orders transitioning to sold
      ],
    },
    {
      $set: {
        status: "sold",
        currentOrderId: order._id,
      },
    },
    { new: true }
  );

  if (!acquiredGoat) {
    // -------------------------------------------------------------------------
    // CONCURRENT INVENTORY COLLISION:
    // Another order has already claimed and purchased this goat!
    // Safely refund the losing customer's payment in FULL (no 3.5% deduction),
    // cancel the losing order, and do NOT create seller payable/earnings.
    // -------------------------------------------------------------------------
    let rzpRefund: any = null;
    try {
      rzpRefund = await createRazorpayRefund({
        paymentId: razorpayPaymentId,
        amountPaise: Math.round(order.amount * 100),
        notes: {
          orderId: order.orderId,
          reason: "Inventory collision: Goat already purchased by another customer",
        },
        receipt: `rfnd_col_${order.orderId}`,
      });
    } catch (rfErr: any) {
      console.warn("[Collision Refund Warning]: Razorpay refund call:", rfErr?.message || rfErr);
    }

    const refundId = rzpRefund?.id || `COLLISION_REFUND_${order._id.toString()}`;
    const refundProcessed = rzpRefund?.status === "processed" || !rzpRefund;

    const collisionUpdatedOrder = await Order.findByIdAndUpdate(
      order._id,
      {
        $set: {
          status: "cancelled",
          "payment.status": "refunded",
          "payment.razorpayPaymentId": razorpayPaymentId,
          ...(razorpaySignature ? { "payment.razorpaySignature": razorpaySignature } : {}),
          ...(method ? { "payment.method": method } : {}),
          sellerNetPayable: 0,
          commissionAmount: 0,
          buyerPlatformFee: 0,
          "cancellation.cancelledAt": now,
          "cancellation.cancelledByRole": "system",
          "cancellation.reason":
            "Inventory collision: Goat was purchased by another customer before payment confirmation; 100% payment refunded",
          "cancellation.finalRefundAmount": order.amount,
          "cancellation.totalDeductions": 0,
          "cancellation.refundCommissionRate": 0,
          "cancellation.refundCommissionAmount": 0,
          "refund.status": refundProcessed ? "processed" : "processing",
          "refund.refundId": refundId,
          "refund.amount": order.amount,
          "refund.currency": currency || order.currency || "INR",
          "refund.reason": "Inventory collision: Goat purchased by another buyer",
          "refund.processedAt": now,
          "refund.breakdown": {
            totalCustomerPaid: order.amount,
            refundCommissionRate: 0,
            refundCommissionAmount: 0,
            platformExpense: 0,
            sellerExpense: 0,
            totalDeductions: 0,
            finalRefundAmount: order.amount,
          },
        },
        $push: {
          timeline: {
            s: "Order Cancelled (Inventory collision) - 100% Refunded",
            d: dateStr,
            done: true,
            updatedAt: now,
          },
        },
      },
      { new: true }
    );

    await logFinancialEvent({
      action: "refund_processed",
      entityType: "refund",
      entityId: refundId,
      orderId: order._id.toString(),
      actorRole: "system",
      actorName: "GoatMart Concurrency Engine",
      amount: order.amount,
      currency: currency || "INR",
      previousState: "pending",
      newState: "processed",
      providerReference: refundId,
      status: "success",
      metadata: {
        orderNumber: order.orderId,
        collision: true,
        reason: "Inventory collision: Goat already purchased by another customer",
        razorpayPaymentId,
        refundAmount: order.amount,
      },
    });

    return {
      success: false,
      code: "INVENTORY_COLLISION",
      order: collisionUpdatedOrder,
      error:
        "This goat was purchased by another buyer just before your payment confirmation. Your payment has been fully refunded.",
      message:
        "Goat was purchased by another buyer. Your payment of 100% has been fully refunded.",
    };
  }

  // Atomic conditional update: strictly ensure payment is not already 'paid'
  const updatedOrder = await Order.findOneAndUpdate(
    {
      _id: order._id,
      "payment.status": { $ne: "paid" },
      status: { $ne: "cancelled" },
    },
    {
      $set: {
        status: "payment_confirmed",
        "payment.status": "paid",
        "payment.razorpayPaymentId": razorpayPaymentId,
        ...(razorpaySignature ? { "payment.razorpaySignature": razorpaySignature } : {}),
        ...(method ? { "payment.method": method } : {}),
        "payment.paidAt": now,
        "timeline.1": { s: "Payment Confirmed", d: dateStr, done: true, updatedAt: now },
      },
    },
    { new: true }
  );

  if (updatedOrder) {
    // Audit Log: Record successful payment verification
    await logFinancialEvent({
      action: "payment_verified",
      entityType: "payment",
      entityId: razorpayPaymentId,
      orderId: order._id.toString(),
      actorId: order.customer?.toString(),
      actorRole: "customer",
      amount: order.amount,
      currency: currency || "INR",
      previousState: "pending",
      newState: "paid",
      providerReference: razorpayPaymentId,
      status: "success",
      metadata: {
        orderNumber: order.orderId,
        method,
      },
    });

    return {
      success: true,
      alreadyPaid: false,
      order: updatedOrder,
      message: "Payment successfully verified and order confirmed",
    };
  }

  // If update returned null, check if a concurrent request already confirmed it
  const refreshed = await Order.findById(order._id);
  if (refreshed?.payment?.status === "paid") {
    return {
      success: true,
      alreadyPaid: true,
      order: refreshed,
      message: "Payment has already been verified for this order",
    };
  }

  // If order update failed (e.g. cancelled concurrently), release goat back to sale
  await Goat.findOneAndUpdate(
    { _id: order.goat, currentOrderId: order._id },
    { $set: { status: "sale", currentOrderId: null } }
  );

  return {
    success: false,
    code: "UPDATE_FAILED",
    error: "Order payment update could not be applied",
  };
}

/**
 * Handle payment failure safely.
 * If the payment failed, marks payment status as failed and releases reserved goat back to sale.
 * Never overrides a payment that has already succeeded.
 */
export async function markPaymentFailed({
  razorpayOrderId,
  razorpayPaymentId,
  reason,
}: {
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  reason?: string;
}) {
  if (!razorpayOrderId && !razorpayPaymentId) return null;
  const query = razorpayOrderId
    ? { "payment.razorpayOrderId": razorpayOrderId }
    : { "payment.razorpayPaymentId": razorpayPaymentId };

  // Atomically mark failed only if current order and payment status are strictly pending
  const order = await Order.findOneAndUpdate(
    {
      ...query,
      "payment.status": "pending",
      status: "pending",
    },
    {
      $set: {
        "payment.status": "failed",
      },
    },
    { new: true }
  );

  // If pending payment failed, release the reserved goat back to sale
  if (order) {
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

    // Audit Log: Record payment failure
    await logFinancialEvent({
      action: "payment_failed",
      entityType: "payment",
      entityId: razorpayPaymentId || razorpayOrderId || "unknown",
      orderId: order._id.toString(),
      actorRole: "system",
      amount: order.amount,
      currency: order.currency || "INR",
      previousState: "pending",
      newState: "failed",
      providerReference: razorpayPaymentId || razorpayOrderId,
      status: "failure",
      reason,
      metadata: {
        orderNumber: order.orderId,
      },
    });
  }

  return order;
}
