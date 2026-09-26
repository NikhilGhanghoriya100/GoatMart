import Order, { IOrder } from "@/models/Order";
import { fetchRazorpayPayment } from "@/lib/razorpay";
import connectDB from "@/lib/db";

export type ReconciliationStatus = "matched" | "mismatch" | "pending" | "internal_only";

export interface DiscrepancyItem {
  field: string;
  expected: any;
  actual: any;
  severity: "error" | "warning" | "info";
  message: string;
}

export interface OrderReconciliationResult {
  orderId: string;
  orderNumber: string;
  status: ReconciliationStatus;
  reconciledAt: Date;
  discrepancies: DiscrepancyItem[];
  snapshot: {
    sellerBasePrice: number;
    commissionRate: number;
    commissionAmount: number;
    sellerNetPayable: number;
    currency: string;
    version?: string;
  };
  payment: {
    orderStatus: string;
    paymentStatus?: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    providerVerified?: boolean;
    providerStatus?: string;
  };
  refund: {
    refundStatus?: string;
    refundId?: string;
    refundAmount?: number;
  };
  payout: {
    payoutStatus?: string;
    transferId?: string;
    payoutAmount?: number;
    expectedPayoutAmount?: number;
  };
}

export interface GlobalReconciliationSummary {
  runId: string;
  executedAt: Date;
  totalOrdersAudited: number;
  matchedCount: number;
  mismatchCount: number;
  pendingCount: number;
  internalOnlyCount: number;
  totalGrossAmount: number;
  totalCommissionAmount: number;
  totalSellerNetPayable: number;
  discrepancyCount: number;
  orders: OrderReconciliationResult[];
}

/**
 * Reconciles a single order internally and against provider records when available.
 * 
 * STRICT INVARIANT:
 * This function is STRICTLY READ-ONLY. It never mutates database records, never fixes data silently,
 * and never executes transfers, refunds, or payments.
 * It strictly preserves historical commission rates (e.g. 3.5% vs 2.0%) stored in order snapshots.
 */
export async function reconcileSingleOrder(
  order: IOrder,
  options?: { checkProvider?: boolean }
): Promise<OrderReconciliationResult> {
  const discrepancies: DiscrepancyItem[] = [];
  const checkProvider = options?.checkProvider ?? false;

  // 1. Authoritative Snapshot Math Verification
  const sellerBasePrice = order.sellerBasePrice ?? order.amount ?? 0;
  const commissionRate = order.commissionRate ?? 2.0; // Preserves historical stored rate
  const commissionAmount = order.commissionAmount ?? 0;
  const sellerNetPayable = order.sellerNetPayable ?? 0;

  // Invariant 1: sellerBasePrice == commissionAmount + sellerNetPayable
  const mathSum = Math.round((commissionAmount + sellerNetPayable) * 100) / 100;
  const basePriceRounded = Math.round(sellerBasePrice * 100) / 100;

  if (Math.abs(mathSum - basePriceRounded) > 0.05) {
    discrepancies.push({
      field: "snapshotMath",
      expected: basePriceRounded,
      actual: mathSum,
      severity: "error",
      message: `Financial snapshot math mismatch: commissionAmount (${commissionAmount}) + sellerNetPayable (${sellerNetPayable}) = ${mathSum}, expected base price ${basePriceRounded}`,
    });
  }

  // Invariant 2: Stored commissionAmount matches calculated commission for the STORED commissionRate
  // Never recalculate using 2% if stored snapshot is 3.5%
  const expectedCommission = Math.round(sellerBasePrice * (commissionRate / 100) * 100) / 100;
  if (Math.abs(commissionAmount - expectedCommission) > 0.05) {
    discrepancies.push({
      field: "commissionCalculation",
      expected: expectedCommission,
      actual: commissionAmount,
      severity: "error",
      message: `Commission calculation mismatch: stored is ₹${commissionAmount}, expected ₹${expectedCommission} for rate ${commissionRate}%`,
    });
  }

  // 2. Payment Consistency Checks
  const paymentStatus = order.payment?.status;
  const razorpayPaymentId = order.payment?.razorpayPaymentId;

  if (paymentStatus === "paid") {
    if (!razorpayPaymentId) {
      discrepancies.push({
        field: "payment.razorpayPaymentId",
        expected: "valid_payment_id",
        actual: null,
        severity: "error",
        message: "Order is marked as 'paid' but is missing the Razorpay payment ID reference",
      });
    }

    if (order.status === "pending") {
      discrepancies.push({
        field: "order.status",
        expected: "payment_confirmed | processing | shipped | delivered",
        actual: order.status,
        severity: "error",
        message: "Order payment is 'paid' but order status remains 'pending'",
      });
    }
  }

  // 3. Provider Payment Verification (if requested & ID available)
  let providerVerified = false;
  let providerStatus: string = "unverified";

  if (checkProvider && razorpayPaymentId) {
    try {
      const providerPayment = await fetchRazorpayPayment(razorpayPaymentId);
      if (providerPayment) {
        providerVerified = true;
        providerStatus = providerPayment.status;

        // Verify amount
        const expectedPaise = Math.round(order.amount * 100);
        if (typeof providerPayment.amount === "number" && providerPayment.amount !== expectedPaise) {
          discrepancies.push({
            field: "provider.amount",
            expected: expectedPaise,
            actual: providerPayment.amount,
            severity: "error",
            message: `Razorpay provider amount (${providerPayment.amount} paise) does not match order amount (${expectedPaise} paise)`,
          });
        }

        if (paymentStatus === "paid" && providerPayment.status !== "captured" && providerPayment.status !== "authorized") {
          discrepancies.push({
            field: "provider.status",
            expected: "captured | authorized",
            actual: providerPayment.status,
            severity: "error",
            message: `Order payment is 'paid' locally, but provider reports '${providerPayment.status}'`,
          });
        }
      } else {
        providerStatus = "provider_unavailable";
      }
    } catch {
      providerStatus = "provider_unavailable";
    }
  }

  // 4. Refund Consistency Checks
  const refundStatus = order.refund?.status;
  const refundId = order.refund?.refundId;

  if (order.status === "refunded") {
    if (paymentStatus !== "refunded") {
      discrepancies.push({
        field: "payment.status",
        expected: "refunded",
        actual: paymentStatus,
        severity: "error",
        message: `Order status is 'refunded' but payment status is '${paymentStatus}'`,
      });
    }

    if (refundStatus !== "processed") {
      discrepancies.push({
        field: "refund.status",
        expected: "processed",
        actual: refundStatus,
        severity: "error",
        message: `Order is marked 'refunded' but refund subdocument status is '${refundStatus}'`,
      });
    }

    if (!refundId) {
      discrepancies.push({
        field: "refund.refundId",
        expected: "valid_refund_id",
        actual: null,
        severity: "error",
        message: "Order is 'refunded' but missing Razorpay refund ID reference",
      });
    }
  } else if (refundStatus === "processed") {
    discrepancies.push({
      field: "order.status",
      expected: "refunded",
      actual: order.status,
      severity: "error",
      message: `Refund status is 'processed' but order status is '${order.status}' instead of 'refunded'`,
    });
  }

  // 5. Seller Payout Consistency Checks
  const payoutStatus = order.payout?.status;
  const payoutTransferId = order.payout?.transferId || order.payout?.referenceId || order.payout?.utrNumber;
  const payoutAmount = order.payout?.amount;

  if (payoutStatus === "paid") {
    if (order.status !== "delivered") {
      discrepancies.push({
        field: "payout.deliveryStatus",
        expected: "delivered",
        actual: order.status,
        severity: "error",
        message: `Seller payout is marked 'paid' but order status is '${order.status}' (must be 'delivered')`,
      });
    }

    if (paymentStatus !== "paid") {
      discrepancies.push({
        field: "payout.paymentStatus",
        expected: "paid",
        actual: paymentStatus,
        severity: "error",
        message: `Seller payout is marked 'paid' but order payment status is '${paymentStatus}'`,
      });
    }

    if (!payoutTransferId) {
      discrepancies.push({
        field: "payout.transferId",
        expected: "valid_transfer_id_or_reference",
        actual: null,
        severity: "error",
        message: "Seller payout is marked 'paid' but lacks a provider transferId or referenceId",
      });
    }

    if (typeof payoutAmount === "number") {
      if (payoutAmount <= 0) {
        discrepancies.push({
          field: "payout.amount",
          expected: "> 0",
          actual: payoutAmount,
          severity: "error",
          message: `Payout amount must be greater than zero (found: ₹${payoutAmount})`,
        });
      } else if (Math.abs(payoutAmount - sellerNetPayable) > 0.05) {
        // Legitimate admin settlement adjustment (not a broken payout)
        const delta = Number((payoutAmount - sellerNetPayable).toFixed(2));
        discrepancies.push({
          field: "payout.settlementAdjustment",
          expected: sellerNetPayable,
          actual: payoutAmount,
          severity: "info",
          message: `Settlement adjustment: disbursed amount is ₹${payoutAmount} (${delta >= 0 ? "+" : ""}${delta} delta vs estimated payable ₹${sellerNetPayable})`,
        });
      }
    }
  }

  // 6. Overall Status Determination
  let overallStatus: ReconciliationStatus = "matched";

  const hasErrors = discrepancies.some((d) => d.severity === "error");
  const isPending =
    order.refund?.status === "processing" ||
    order.payout?.status === "processing" ||
    (order.status === "pending" && paymentStatus === "pending");

  if (hasErrors) {
    overallStatus = "mismatch";
  } else if (isPending) {
    overallStatus = "pending";
  } else if (!providerVerified) {
    overallStatus = "internal_only";
  } else {
    overallStatus = "matched";
  }

  return {
    orderId: order._id.toString(),
    orderNumber: order.orderId,
    status: overallStatus,
    reconciledAt: new Date(),
    discrepancies,
    snapshot: {
      sellerBasePrice,
      commissionRate,
      commissionAmount,
      sellerNetPayable,
      currency: order.currency || "INR",
      version: order.financialCalculationVersion,
    },
    payment: {
      orderStatus: order.status,
      paymentStatus: order.payment?.status,
      razorpayOrderId: order.payment?.razorpayOrderId,
      razorpayPaymentId: order.payment?.razorpayPaymentId,
      providerVerified,
      providerStatus,
    },
    refund: {
      refundStatus: order.refund?.status,
      refundId: order.refund?.refundId,
      refundAmount: order.refund?.amount,
    },
    payout: {
      payoutStatus: order.payout?.status,
      transferId: order.payout?.transferId,
      payoutAmount: order.payout?.amount,
      expectedPayoutAmount: sellerNetPayable,
    },
  };
}

/**
 * Executes a comprehensive, read-only reconciliation run across all matching orders.
 * Strictly guarantees idempotency and zero database mutations.
 */
export async function runFinancialReconciliation(filter?: {
  startDate?: Date;
  endDate?: Date;
  status?: string;
  checkProvider?: boolean;
}): Promise<GlobalReconciliationSummary> {
  await connectDB();

  const query: any = {};
  if (filter?.startDate || filter?.endDate) {
    query.createdAt = {};
    if (filter.startDate) query.createdAt.$gte = filter.startDate;
    if (filter.endDate) query.createdAt.$lte = filter.endDate;
  }
  if (filter?.status) {
    query.status = filter.status;
  }

  const orders = await Order.find(query).sort({ createdAt: -1 });

  const runId = `recon_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const orderResults: OrderReconciliationResult[] = [];

  let matchedCount = 0;
  let mismatchCount = 0;
  let pendingCount = 0;
  let internalOnlyCount = 0;
  let totalGross = 0;
  let totalCommission = 0;
  let totalNetPayable = 0;
  let totalDiscrepancies = 0;

  for (const order of orders) {
    const result = await reconcileSingleOrder(order, { checkProvider: filter?.checkProvider });
    orderResults.push(result);

    if (result.status === "matched") matchedCount++;
    else if (result.status === "mismatch") mismatchCount++;
    else if (result.status === "pending") pendingCount++;
    else if (result.status === "internal_only") internalOnlyCount++;

    totalGross += result.snapshot.sellerBasePrice;
    totalCommission += result.snapshot.commissionAmount;
    totalNetPayable += result.snapshot.sellerNetPayable;
    totalDiscrepancies += result.discrepancies.length;
  }

  return {
    runId,
    executedAt: new Date(),
    totalOrdersAudited: orders.length,
    matchedCount,
    mismatchCount,
    pendingCount,
    internalOnlyCount,
    totalGrossAmount: Math.round(totalGross * 100) / 100,
    totalCommissionAmount: Math.round(totalCommission * 100) / 100,
    totalSellerNetPayable: Math.round(totalNetPayable * 100) / 100,
    discrepancyCount: totalDiscrepancies,
    orders: orderResults,
  };
}
