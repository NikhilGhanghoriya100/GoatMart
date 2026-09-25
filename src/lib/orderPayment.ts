import Order, { IOrder } from "@/models/Order";
import Goat from "@/models/Goat";
import mongoose from "mongoose";
import { logFinancialEvent } from "@/lib/auditLogger";

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
    | "UPDATE_FAILED";
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
    // Transition goat atomically from reserved to sold
    // Strictly requires status: "reserved" to prevent selling an unreserved or wrong goat
    await Goat.findOneAndUpdate(
      { _id: order.goat, status: "reserved" },
      { $set: { status: "sold", currentOrderId: order._id } }
    );

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
