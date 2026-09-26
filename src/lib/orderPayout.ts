import mongoose from "mongoose";
import Order, { IOrder, PayoutStatus } from "@/models/Order";
import User, { IUser } from "@/models/User";
import {
  createRazorpayPaymentTransfer,
  CreatePaymentTransferParams,
  RazorpayTransferResultItem,
} from "@/lib/razorpay";
import { logFinancialEvent } from "@/lib/auditLogger";

export interface InitiatePayoutParams {
  orderId: string;
  performedBy: string;
  performedByRole: "admin" | "system";
  /**
   * Optional custom/mock transfer provider for testability without live money.
   * Defaults to createRazorpayPaymentTransfer in production.
   */
  transferProvider?: (
    params: CreatePaymentTransferParams
  ) => Promise<RazorpayTransferResultItem>;
}

export interface PayoutResult {
  success: boolean;
  code?:
    | "ORDER_NOT_FOUND"
    | "UNAUTHORIZED"
    | "SELLER_NOT_FOUND"
    | "NOT_DELIVERED"
    | "PAYMENT_NOT_PAID"
    | "MISSING_PAYMENT_ID"
    | "REFUND_ACTIVE"
    | "ORDER_CANCELLED"
    | "ORDER_REFUNDED"
    | "MISSING_FINANCIAL_SNAPSHOT"
    | "INVALID_PAYOUT_AMOUNT"
    | "SELLER_NOT_APPROVED"
    | "SELLER_ONBOARDING_NOT_ACTIVE"
    | "MISSING_LINKED_ACCOUNT"
    | "ALREADY_PAID"
    | "PAYOUT_IN_PROGRESS"
    | "CONCURRENT_MODIFICATION"
    | "PROVIDER_TRANSFER_FAILED"
    | "SERVER_ERROR";
  error?: string;
  order?: IOrder | null;
  status?: PayoutStatus;
  transferId?: string;
  amount?: number;
  message?: string;
}

export interface PayoutEligibilityResult {
  eligible: boolean;
  reason?: string;
  code?: PayoutResult["code"];
  sellerNetPayable?: number;
  recipientAccountId?: string;
}

/**
 * Validates whether an order meets all 14 strict server-side payout eligibility criteria.
 * Never trusts client input or client-side financial amounts.
 */
export function checkOrderPayoutEligibility(
  order: IOrder,
  seller: IUser | null
): PayoutEligibilityResult {
  // 1. Order must not be cancelled
  if (order.status === "cancelled") {
    return {
      eligible: false,
      code: "ORDER_CANCELLED",
      reason: "Cancelled orders are not eligible for seller payout",
    };
  }

  // 2. Order must not be refunded
  if (order.status === "refunded") {
    return {
      eligible: false,
      code: "ORDER_REFUNDED",
      reason: "Refunded orders are not eligible for seller payout",
    };
  }

  // 3. Order status must be delivered
  if (order.status !== "delivered") {
    return {
      eligible: false,
      code: "NOT_DELIVERED",
      reason: `Order must be in 'delivered' status to be eligible for payout (current: '${order.status}')`,
    };
  }

  // 4. Payment status must be paid
  if (order.payment?.status !== "paid") {
    return {
      eligible: false,
      code: "PAYMENT_NOT_PAID",
      reason: `Payment must be marked 'paid' to be eligible for payout (current: '${order.payment?.status}')`,
    };
  }

  // 5. Must have original Razorpay payment ID
  if (!order.payment?.razorpayPaymentId || typeof order.payment.razorpayPaymentId !== "string") {
    return {
      eligible: false,
      code: "MISSING_PAYMENT_ID",
      reason: "Order is missing an authoritative Razorpay payment ID",
    };
  }

  // 6. Refund status must not be pending, processing, processed, or failed
  const refundStatus = order.refund?.status;
  if (
    refundStatus === "pending" ||
    refundStatus === "processing" ||
    refundStatus === "processed" ||
    refundStatus === "failed"
  ) {
    return {
      eligible: false,
      code: "REFUND_ACTIVE",
      reason: `Order has refund status '${refundStatus}' and cannot be paid out`,
    };
  }

  // 7 & 8. Financial snapshot must exist and have positive sellerNetPayable
  if (
    typeof order.sellerNetPayable !== "number" ||
    isNaN(order.sellerNetPayable) ||
    !isFinite(order.sellerNetPayable)
  ) {
    return {
      eligible: false,
      code: "MISSING_FINANCIAL_SNAPSHOT",
      reason: "Order is missing a valid immutable financial snapshot",
    };
  }

  if (order.sellerNetPayable <= 0) {
    return {
      eligible: false,
      code: "INVALID_PAYOUT_AMOUNT",
      reason: `Seller net payable must be greater than zero (current: ${order.sellerNetPayable})`,
    };
  }

  // Legacy orders lacking financialCalculationVersion cannot be auto-paid
  if (!order.financialCalculationVersion) {
    return {
      eligible: false,
      code: "MISSING_FINANCIAL_SNAPSHOT",
      reason: "Legacy orders without financialCalculationVersion require manual administrative review",
    };
  }

  // 9. Seller must exist
  if (!seller) {
    return {
      eligible: false,
      code: "SELLER_NOT_FOUND",
      reason: "Seller user record not found",
    };
  }

  // 10. Seller must be approved
  if (seller.sellerProfile?.status !== "approved") {
    return {
      eligible: false,
      code: "SELLER_NOT_APPROVED",
      reason: `Seller is not approved (current status: '${seller.sellerProfile?.status || "none"}')`,
    };
  }

  // 11. Seller payout onboarding must be active
  const onboardingStatus = seller.sellerProfile?.payoutOnboarding?.status;
  if (onboardingStatus !== "active") {
    return {
      eligible: false,
      code: "SELLER_ONBOARDING_NOT_ACTIVE",
      reason: `Seller payout onboarding is not active (current status: '${onboardingStatus || "not_started"}')`,
    };
  }

  // 12. Must have Razorpay linked account ID
  const recipientAccountId = seller.sellerProfile?.payoutOnboarding?.razorpayAccountId;
  if (!recipientAccountId || typeof recipientAccountId !== "string" || !recipientAccountId.trim()) {
    return {
      eligible: false,
      code: "MISSING_LINKED_ACCOUNT",
      reason: "Seller does not have a linked Razorpay account ID configured",
    };
  }

  // 13. Current payout status must be none, unpaid, or retryable failed
  const currentPayoutStatus = order.payout?.status || "none";
  if (currentPayoutStatus === "paid") {
    return {
      eligible: false,
      code: "ALREADY_PAID",
      reason: "This order has already been paid out to the seller",
    };
  }

  if (currentPayoutStatus === "processing") {
    return {
      eligible: false,
      code: "PAYOUT_IN_PROGRESS",
      reason: "A payout transfer is already currently in progress for this order",
    };
  }

  if (currentPayoutStatus === "reversed") {
    return {
      eligible: false,
      code: "ALREADY_PAID",
      reason: "This order's payout was reversed and cannot be re-transferred automatically",
    };
  }

  return {
    eligible: true,
    sellerNetPayable: order.sellerNetPayable,
    recipientAccountId: recipientAccountId.trim(),
  };
}

/**
 * Transitions an order to 'unpaid' payout status upon confirmed delivery if eligible.
 */
export async function markOrderPayoutEligible(orderId: string): Promise<boolean> {
  if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) return false;

  const order = await Order.findById(orderId);
  if (!order) return false;

  // Only transition if payout status is currently 'none'
  const currentStatus = order.payout?.status || "none";
  if (currentStatus !== "none") return false;

  const seller = await User.findById(order.seller);
  const eligibility = checkOrderPayoutEligibility(order, seller);

  if (eligibility.eligible) {
    await Order.findByIdAndUpdate(orderId, {
      $set: {
        "payout.status": "unpaid",
        "payout.amount": eligibility.sellerNetPayable,
        "payout.currency": order.currency || "INR",
        "payout.recipientAccountId": eligibility.recipientAccountId,
      },
    });
    return true;
  }

  return false;
}

/**
 * Core Payout Engine: Safely initiates a seller payout for an eligible delivered order.
 * Acquires an atomic MongoDB lock, preserves stable idempotency identity, derives amount
 * strictly from immutable snapshot, and interfaces with the provider transfer API.
 */
export async function initiateOrderPayout(
  params: InitiatePayoutParams
): Promise<PayoutResult> {
  const { orderId, performedBy, performedByRole, transferProvider = createRazorpayPaymentTransfer } = params;

  // Authorization check
  if (performedByRole !== "admin" && performedByRole !== "system") {
    return {
      success: false,
      code: "UNAUTHORIZED",
      error: "Only authorized administrators or system processes may initiate seller payouts",
    };
  }

  if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
    return {
      success: false,
      code: "ORDER_NOT_FOUND",
      error: "A valid Order ID is required",
    };
  }

  // 1. Authoritative order retrieval
  const order = await Order.findById(orderId);
  if (!order) {
    return {
      success: false,
      code: "ORDER_NOT_FOUND",
      error: "Order record not found",
    };
  }

  // 2. Authoritative seller retrieval
  const seller = await User.findById(order.seller);
  if (!seller) {
    return {
      success: false,
      code: "SELLER_NOT_FOUND",
      error: "Associated seller account not found",
    };
  }

  // 3. Complete Eligibility Assessment
  const eligibility = checkOrderPayoutEligibility(order, seller);
  if (!eligibility.eligible) {
    return {
      success: false,
      code: eligibility.code || "NOT_DELIVERED",
      error: eligibility.reason || "Order is not eligible for payout",
      order,
    };
  }

  const authoritativeAmountRupees = eligibility.sellerNetPayable!;
  const recipientAccountId = eligibility.recipientAccountId!;
  const paymentId = order.payment.razorpayPaymentId!;

  // Convert to integer paise using established GoatMart rounding convention
  const amountPaise = Math.round(authoritativeAmountRupees * 100);
  if (amountPaise <= 0 || !Number.isInteger(amountPaise)) {
    return {
      success: false,
      code: "INVALID_PAYOUT_AMOUNT",
      error: "Calculated payout amount in paise must be a positive integer",
    };
  }

  // Deterministic, stable idempotency identity based on Order ID
  // Does NOT generate a new random token on retries
  const idempotencyKey = `payout_${order._id.toString()}`;

  // 4. Atomic MongoDB Lock: Transition status from (none/unpaid/failed) to 'processing'
  // Guarantees only one concurrent worker or admin request can execute transfer
  const now = new Date();
  const lockedOrder = await Order.findOneAndUpdate(
    {
      _id: order._id,
      status: "delivered",
      "payment.status": "paid",
      "refund.status": { $nin: ["pending", "processing", "processed", "failed"] },
      $or: [
        { "payout.status": { $exists: false } },
        { "payout.status": "none" },
        { "payout.status": "unpaid" },
        { "payout.status": "failed" },
      ],
    },
    {
      $set: {
        "payout.status": "processing",
        "payout.idempotencyKey": idempotencyKey,
        "payout.recipientAccountId": recipientAccountId,
        "payout.amount": authoritativeAmountRupees,
        "payout.currency": order.currency || "INR",
        "payout.initiatedAt": now,
        "payout.failureReason": null,
      },
    },
    { new: true }
  );

  if (!lockedOrder) {
    // Check if another concurrent execution already locked, paid, or modified it
    const refreshed = await Order.findById(order._id);
    const refreshedStatus = refreshed?.payout?.status;

    if (refreshedStatus === "paid") {
      return {
        success: false,
        code: "ALREADY_PAID",
        error: "This order has already been paid out to the seller",
        order: refreshed,
      };
    }
    if (refreshedStatus === "processing") {
      return {
        success: false,
        code: "PAYOUT_IN_PROGRESS",
        error: "A payout transfer is already currently in progress for this order",
        order: refreshed,
      };
    }
    return {
      success: false,
      code: "CONCURRENT_MODIFICATION",
      error: "Could not acquire atomic payout lock due to a concurrent state change",
      order: refreshed,
    };
  }

  // Audit Log: Payout initiated / retried
  await logFinancialEvent({
    action: order.payout?.status === "failed" ? "payout_retried" : "payout_initiated",
    entityType: "payout",
    entityId: idempotencyKey,
    orderId: order._id.toString(),
    actorId: performedBy,
    actorRole: performedByRole,
    amount: authoritativeAmountRupees,
    currency: order.currency || "INR",
    previousState: order.payout?.status || "none",
    newState: "processing",
    providerReference: idempotencyKey,
    status: "success",
    metadata: {
      orderNumber: order.orderId,
      sellerId: order.seller.toString(),
      recipientAccountId,
    },
  });

  // 5. Invoke Provider Transfer
  let providerResult: RazorpayTransferResultItem;
  try {
    providerResult = await transferProvider({
      paymentId,
      recipientAccountId,
      amountPaise,
      currency: order.currency || "INR",
      notes: {
        orderId: order.orderId,
        goatId: order.goat.toString(),
        sellerId: order.seller.toString(),
        idempotencyKey,
      },
    });
  } catch (providerError: any) {
    // 6. Handle Provider Failure
    const failureMsg = providerError?.message || "Razorpay Route transfer request failed";
    const failedAt = new Date();

    // Monotonically record failure (never overwrite if somehow already paid)
    const failedOrder = await Order.findOneAndUpdate(
      {
        _id: order._id,
        "payout.status": "processing",
      },
      {
        $set: {
          "payout.status": "failed",
          "payout.failedAt": failedAt,
          "payout.failureReason": failureMsg,
        },
        $inc: {
          "payout.retryCount": 1,
        },
      },
      { new: true }
    );

    // Audit Log: Payout failure
    await logFinancialEvent({
      action: "payout_failed",
      entityType: "payout",
      entityId: idempotencyKey,
      orderId: order._id.toString(),
      actorId: performedBy,
      actorRole: performedByRole,
      amount: authoritativeAmountRupees,
      currency: order.currency || "INR",
      previousState: "processing",
      newState: "failed",
      providerReference: idempotencyKey,
      status: "failure",
      reason: failureMsg,
      metadata: {
        orderNumber: order.orderId,
        retryCount: (order.payout?.retryCount || 0) + 1,
      },
    });

    return {
      success: false,
      code: "PROVIDER_TRANSFER_FAILED",
      error: failureMsg,
      order: failedOrder,
      status: "failed",
    };
  }

  // 7. Handle Provider Success
  const isProcessedImmediately = providerResult.status === "processed";
  const processedAt = new Date();
  const dateStr = processedAt.toLocaleDateString("en-IN", { month: "short", day: "numeric" });

  if (isProcessedImmediately) {
    // Immediate Settlement Confirmation
    const finalOrder = await Order.findByIdAndUpdate(
      order._id,
      {
        $set: {
          "payout.status": "paid",
          "payout.transferId": providerResult.id,
          "payout.processedAt": processedAt,
          "payout.failureReason": null,
        },
        $push: {
          timeline: {
            s: "Seller Payout Completed",
            d: dateStr,
            done: true,
            updatedAt: processedAt,
          },
        },
      },
      { new: true }
    );

    // Audit Log: Payout paid
    await logFinancialEvent({
      action: "payout_paid",
      entityType: "payout",
      entityId: providerResult.id,
      orderId: order._id.toString(),
      actorId: performedBy,
      actorRole: performedByRole,
      amount: authoritativeAmountRupees,
      currency: order.currency || "INR",
      previousState: "processing",
      newState: "paid",
      providerReference: providerResult.id,
      status: "success",
      metadata: {
        orderNumber: order.orderId,
        transferId: providerResult.id,
      },
    });

    return {
      success: true,
      order: finalOrder,
      status: "paid",
      transferId: providerResult.id,
      amount: authoritativeAmountRupees,
      message: `Seller payout of ₹${authoritativeAmountRupees.toLocaleString("en-IN")} transferred successfully`,
    };
  } else {
    // Asynchronous / Pending Settlement:
    // Store transferId and retain 'processing' until confirmed via transfer.processed webhook in Step 9E
    const finalOrder = await Order.findByIdAndUpdate(
      order._id,
      {
        $set: {
          "payout.status": "processing",
          "payout.transferId": providerResult.id,
        },
        $push: {
          timeline: {
            s: "Seller Payout Initiated",
            d: dateStr,
            done: true,
            updatedAt: processedAt,
          },
        },
      },
      { new: true }
    );

    // Audit Log: Payout processing
    await logFinancialEvent({
      action: "payout_processing",
      entityType: "payout",
      entityId: providerResult.id,
      orderId: order._id.toString(),
      actorId: performedBy,
      actorRole: performedByRole,
      amount: authoritativeAmountRupees,
      currency: order.currency || "INR",
      previousState: "unpaid",
      newState: "processing",
      providerReference: providerResult.id,
      status: "success",
      metadata: {
        orderNumber: order.orderId,
        transferId: providerResult.id,
      },
    });

    return {
      success: true,
      order: finalOrder,
      status: "processing",
      transferId: providerResult.id,
      amount: authoritativeAmountRupees,
      message: "Payout transfer initiated with Razorpay; pending settlement confirmation",
    };
  }
}

export interface RecordManualPayoutParams {
  orderId: string;
  performedBy: string;
  performedByName?: string;
  payoutMethod: "UPI" | "BANK";
  referenceId: string;
  amount: number;
  paidAt?: Date | string;
  adminNote?: string;
}

export interface ManualPayoutResult {
  success: boolean;
  code?:
    | "ORDER_NOT_FOUND"
    | "UNAUTHORIZED"
    | "NOT_DELIVERED"
    | "PAYMENT_NOT_PAID"
    | "REFUND_ACTIVE"
    | "ORDER_CANCELLED"
    | "ORDER_REFUNDED"
    | "MISSING_FINANCIAL_SNAPSHOT"
    | "INVALID_PAYOUT_AMOUNT"
    | "AMOUNT_MISMATCH"
    | "MISSING_REFERENCE_ID"
    | "ALREADY_PAID"
    | "CONCURRENT_MODIFICATION"
    | "SERVER_ERROR";
  error?: string;
  message?: string;
  order?: IOrder | null;
  status?: PayoutStatus;
  referenceId?: string;
  amount?: number;
  paidAt?: Date;
}

/**
 * Records a manual seller payout performed externally by the admin (outside Razorpay Route).
 * 
 * Strict Server-Side Controls:
 * 1. Admin Authorization verified by caller.
 * 2. Order delivered, payment paid, no active refund.
 * 3. Paid amount strictly validated against authoritative order.sellerNetPayable.
 * 4. UTR/Reference ID is required.
 * 5. Atomic state update prevents double-payout.
 * 6. Permanent append-only financial audit log entry recorded.
 */
export async function recordManualOrderPayout(
  params: RecordManualPayoutParams
): Promise<ManualPayoutResult> {
  const {
    orderId,
    performedBy,
    performedByName = "Admin",
    payoutMethod,
    referenceId,
    amount,
    paidAt,
    adminNote,
  } = params;

  if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
    return {
      success: false,
      code: "ORDER_NOT_FOUND",
      error: "Invalid or missing orderId",
    };
  }

  const cleanReference = String(referenceId || "").trim();
  if (!cleanReference || cleanReference.length < 3) {
    return {
      success: false,
      code: "MISSING_REFERENCE_ID",
      error: "Transaction reference / UTR ID is required (minimum 3 characters)",
    };
  }

  if (payoutMethod !== "UPI" && payoutMethod !== "BANK") {
    return {
      success: false,
      code: "SERVER_ERROR",
      error: "Invalid payment method: must be 'UPI' or 'BANK'",
    };
  }

  const order = await Order.findById(orderId);
  if (!order) {
    return {
      success: false,
      code: "ORDER_NOT_FOUND",
      error: `Order '${orderId}' not found`,
    };
  }

  if (order.status === "cancelled") {
    return {
      success: false,
      code: "ORDER_CANCELLED",
      error: "Cannot record payout for a cancelled order",
    };
  }

  if (order.status === "refunded") {
    return {
      success: false,
      code: "ORDER_REFUNDED",
      error: "Cannot record payout for a refunded order",
    };
  }

  if (order.status !== "delivered") {
    return {
      success: false,
      code: "NOT_DELIVERED",
      error: `Order must be delivered before paying seller (current status: '${order.status}')`,
    };
  }

  if (order.payment?.status !== "paid") {
    return {
      success: false,
      code: "PAYMENT_NOT_PAID",
      error: "Order payment has not been confirmed as paid",
    };
  }

  const refundStatus = order.refund?.status;
  if (
    refundStatus === "pending" ||
    refundStatus === "processing" ||
    refundStatus === "processed" ||
    refundStatus === "failed"
  ) {
    return {
      success: false,
      code: "REFUND_ACTIVE",
      error: `Order has active refund state '${refundStatus}' and cannot be paid`,
    };
  }

  if (
    typeof order.sellerNetPayable !== "number" ||
    isNaN(order.sellerNetPayable) ||
    order.sellerNetPayable <= 0
  ) {
    return {
      success: false,
      code: "MISSING_FINANCIAL_SNAPSHOT",
      error: "Order is missing authoritative sellerNetPayable financial snapshot",
    };
  }

  // Validate admin-provided actual payout amount: must be a finite, positive number (> 0)
  const numericAmount = Number(amount);
  if (isNaN(numericAmount) || !isFinite(numericAmount) || numericAmount <= 0) {
    return {
      success: false,
      code: "INVALID_PAYOUT_AMOUNT",
      error: `Invalid payout amount (₹${amount}). Amount must be a positive number.`,
    };
  }

  // Integer-paise precision to eliminate floating-point drift
  const actualPaidPaise = Math.round(numericAmount * 100);
  const actualPaidAmount = actualPaidPaise / 100;

  // Idempotency: cannot pay an already paid order
  if (order.payout?.status === "paid") {
    return {
      success: false,
      code: "ALREADY_PAID",
      error: "Payout has already been marked as paid for this order",
      order,
      status: "paid",
    };
  }

  const paymentDate = paidAt ? new Date(paidAt) : new Date();
  const dateStr = paymentDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Atomic state transition: ensures concurrent requests cannot double-pay
  const updatedOrder = await Order.findOneAndUpdate(
    {
      _id: order._id,
      "payout.status": { $ne: "paid" },
    },
    {
      $set: {
        "payout.status": "paid",
        "payout.isManual": true,
        "payout.payoutMethod": payoutMethod,
        "payout.referenceId": cleanReference,
        "payout.utrNumber": cleanReference,
        "payout.transferId": cleanReference,
        "payout.amount": actualPaidAmount,
        "payout.currency": order.currency || "INR",
        "payout.paidAt": paymentDate,
        "payout.processedAt": paymentDate,
        "payout.paidBy": new mongoose.Types.ObjectId(performedBy),
        "payout.paidByName": performedByName,
        "payout.adminNote": adminNote ? String(adminNote).trim().slice(0, 500) : "",
      },
      $push: {
        timeline: {
          s: "Seller Payout Paid Manually",
          d: dateStr,
          done: true,
          updatedAt: paymentDate,
        },
      },
    },
    { new: true }
  );

  if (!updatedOrder) {
    return {
      success: false,
      code: "CONCURRENT_MODIFICATION",
      error: "Failed to record manual payout: payout status was modified concurrently",
    };
  }

  // Append-only audit log entry
  await logFinancialEvent({
    action: "payout_paid",
    entityType: "payout",
    entityId: updatedOrder._id.toString(),
    orderId: updatedOrder.orderId,
    actorId: performedBy,
    actorRole: "admin",
    actorName: performedByName,
    amount: actualPaidAmount,
    currency: order.currency || "INR",
    previousState: order.payout?.status || "unpaid",
    newState: "paid",
    providerReference: cleanReference,
    status: "success",
    metadata: {
      isManual: true,
      payoutMethod,
      referenceId: cleanReference,
      utrNumber: cleanReference,
      sellerId: order.seller.toString(),
      sellerName: order.sellerName,
      sellerNetPayable: order.sellerNetPayable,
      actualPaidAmount,
      difference: Number((actualPaidAmount - order.sellerNetPayable).toFixed(2)),
      adminNote,
    },
  });

  return {
    success: true,
    message: `Manual payout of ₹${actualPaidAmount.toLocaleString("en-IN")} recorded successfully (${payoutMethod}: ${cleanReference})`,
    order: updatedOrder,
    status: "paid",
    referenceId: cleanReference,
    amount: actualPaidAmount,
    paidAt: paymentDate,
  };
}
