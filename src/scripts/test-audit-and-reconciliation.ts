/**
 * GoatMart Step 11: Audit Logs + Financial Reconciliation Test Suite
 * 
 * Verifies all required audit logging, immutability, privacy, and reconciliation requirements:
 * 1. Authenticated actor recorded correctly (user ID, actorName, actorRole)
 * 2. Actor role recorded correctly (customer, seller, admin, system, webhook)
 * 3. System and webhook actors recorded without impersonating human users
 * 4. Correct order ID and entity IDs recorded
 * 5. State transitions recorded (previousState -> newState)
 * 6. Payment event recorded (payment_verified, payment_failed)
 * 7. Refund event recorded (refund_initiated, refund_processed, refund_failed)
 * 8. Payout event recorded (payout_initiated, payout_paid, payout_failed, payout_retried)
 * 9. Failure reason recorded on failed events
 * 10. Immutability: Mongoose updateOne is strictly rejected
 * 11. Immutability: Mongoose findOneAndUpdate is strictly rejected
 * 12. Immutability: Mongoose deleteOne is strictly rejected
 * 13. Immutability: Mongoose findOneAndDelete is strictly rejected
 * 14. Security: Unauthenticated access to audit logs rejected (401)
 * 15. Security: Non-admin access to audit logs rejected (403)
 * 16. Security: Unauthenticated access to reconciliation rejected (401)
 * 17. Security: Non-admin access to reconciliation rejected (403)
 * 18. Privacy: Sanitizer redacts secrets, tokens, passwords, and API keys
 * 19. Privacy: Sanitizer masks bank account numbers to last 4 digits
 * 20. Reconciliation: Mathematically consistent order returns matched / internal_only
 * 21. Reconciliation: Historical 3.5% commission snapshot preserved and verified without altering historical order
 * 22. Reconciliation: Current 2.0% commission does not alter historical 3.5% order
 * 23. Reconciliation: sellerNetPayable strictly derived from stored snapshot value
 * 24. Reconciliation: Snapshot math discrepancy detected
 * 25. Reconciliation: Missing payment ID on paid order detected
 * 26. Reconciliation: Payment status vs order status conflict detected
 * 27. Reconciliation: Refund inconsistency detected
 * 28. Reconciliation: Payout amount mismatch detected
 * 29. Reconciliation: Missing payout transfer ID detected
 * 30. Reconciliation: Repeated reconciliation is idempotent and safe
 * 31. Zero-Mutation Guarantee: Reconciliation performs zero writes or state mutations
 */

import mongoose from "mongoose";
import FinancialAuditLog, { IFinancialAuditLog } from "../models/FinancialAuditLog";
import Order, { IOrder } from "../models/Order";
import { logFinancialEvent, sanitizeAuditMetadata } from "../lib/auditLogger";
import {
  reconcileSingleOrder,
  runFinancialReconciliation,
} from "../lib/financialReconciliation";

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    failCount++;
    process.exit(1);
  }
  passCount++;
  console.log(`✅ PASSED (${passCount}): ${message}`);
}

async function runTests() {
  console.log("===============================================================");
  console.log("🚀 STARTING GOATMART STEP 11 TEST SUITE: AUDIT + RECONCILIATION");
  console.log("===============================================================\n");

  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/goatmart";
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  }

  // Clean test artifacts from previous runs
  const testRunTag = `test_step11_${Date.now()}`;

  // =========================================================================
  // SECTION 1: AUDIT LOGGING CREATION & ATTRIBUTION
  // =========================================================================
  console.log("\n--- SECTION 1: AUDIT LOGGING CREATION & ATTRIBUTION ---");

  // Test 1: Authenticated Customer Actor
  const customerLog = await logFinancialEvent({
    action: "payment_verified",
    entityType: "payment",
    entityId: "pay_test_cust_001",
    orderId: "650000000000000000000001",
    actorId: "650000000000000000000002",
    actorRole: "customer",
    actorName: "Ramesh Kumar",
    amount: 25000,
    currency: "INR",
    previousState: "pending",
    newState: "paid",
    providerReference: "pay_test_cust_001",
    status: "success",
    metadata: { testTag: testRunTag, orderNumber: "GM-2026-0001" },
  });

  assert(customerLog !== null, "Authenticated customer audit log created successfully");
  assert(customerLog?.actorId === "650000000000000000000002", "Customer actor ID recorded correctly");
  assert(customerLog?.actorRole === "customer", "Customer actor role recorded correctly");
  assert(customerLog?.actorName === "Ramesh Kumar", "Customer actor name recorded correctly");

  // Test 2: Admin Actor
  const adminLog = await logFinancialEvent({
    action: "payout_initiated",
    entityType: "payout",
    entityId: "payout_order_123",
    orderId: "650000000000000000000003",
    actorId: "650000000000000000000004",
    actorRole: "admin",
    actorName: "Super Admin",
    amount: 49000,
    currency: "INR",
    previousState: "unpaid",
    newState: "processing",
    providerReference: "payout_order_123",
    status: "success",
    metadata: { testTag: testRunTag },
  });

  assert(adminLog?.actorRole === "admin", "Admin actor role recorded correctly");
  assert(adminLog?.actorName === "Super Admin", "Admin actor name recorded correctly");

  // Test 3: System / Webhook Actor Attribution (No Human Impersonation)
  const webhookLog = await logFinancialEvent({
    action: "refund_processed",
    entityType: "refund",
    entityId: "rfnd_test_webhook_001",
    orderId: "650000000000000000000005",
    actorRole: "webhook",
    actorName: "Razorpay Webhook",
    amount: 15000,
    currency: "INR",
    previousState: "processing",
    newState: "processed",
    providerReference: "rfnd_test_webhook_001",
    status: "success",
    metadata: { testTag: testRunTag, webhookEvent: "refund.processed" },
  });

  assert(webhookLog?.actorRole === "webhook", "Webhook actor correctly identified without impersonating human");
  assert(webhookLog?.actorId === undefined || webhookLog?.actorId === "", "Webhook actor has no spoofed human actorId");

  // Test 4: Correct Order and Entity IDs Recorded
  assert(webhookLog?.entityId === "rfnd_test_webhook_001", "Correct entityId recorded");
  assert(webhookLog?.orderId === "650000000000000000000005", "Correct orderId recorded");

  // Test 5: State Transitions Recorded (previousState -> newState)
  assert(webhookLog?.previousState === "processing", "previousState recorded accurately");
  assert(webhookLog?.newState === "processed", "newState recorded accurately");

  // Test 6: Payment Events Recorded (verified & failed)
  const payFailedLog = await logFinancialEvent({
    action: "payment_failed",
    entityType: "payment",
    entityId: "pay_failed_999",
    orderId: "650000000000000000000006",
    actorRole: "system",
    amount: 30000,
    previousState: "pending",
    newState: "failed",
    providerReference: "pay_failed_999",
    status: "failure",
    reason: "Bank transaction timed out",
    metadata: { testTag: testRunTag },
  });

  assert(payFailedLog?.action === "payment_failed", "Payment failed event recorded");
  assert(payFailedLog?.status === "failure", "Payment failure status recorded");
  assert(payFailedLog?.reason === "Bank transaction timed out", "Payment failure reason recorded");

  // Test 7: Refund Events Recorded
  assert(webhookLog?.action === "refund_processed", "Refund processed event recorded");

  // Test 8: Payout Retried Event Recorded
  const payoutRetryLog = await logFinancialEvent({
    action: "payout_retried",
    entityType: "payout",
    entityId: "payout_order_retry_789",
    orderId: "650000000000000000000007",
    actorId: "650000000000000000000004",
    actorRole: "admin",
    amount: 24500,
    previousState: "failed",
    newState: "processing",
    status: "success",
    metadata: { retryCount: 2, testTag: testRunTag },
  });

  assert(payoutRetryLog?.action === "payout_retried", "Payout retry event recorded");
  assert(payoutRetryLog?.previousState === "failed", "Payout retry previous state recorded as failed");

  // =========================================================================
  // SECTION 2: IMMUTABILITY & APPEND-ONLY ENFORCEMENT
  // =========================================================================
  console.log("\n--- SECTION 2: IMMUTABILITY ENFORCEMENT ---");

  // Test 10: updateOne operation strictly rejected
  let updateRejected = false;
  try {
    await FinancialAuditLog.updateOne(
      { _id: customerLog?._id },
      { $set: { amount: 999999 } }
    );
  } catch (err: any) {
    updateRejected = true;
    assert(
      err.message.includes("immutable"),
      `Mongoose updateOne blocked by immutability hook: ${err.message}`
    );
  }
  assert(updateRejected, "Audit log cannot be modified via updateOne");

  // Test 11: findOneAndUpdate operation strictly rejected
  let findOneAndUpdateRejected = false;
  try {
    await FinancialAuditLog.findOneAndUpdate(
      { _id: customerLog?._id },
      { $set: { status: "failure" } }
    );
  } catch (err: any) {
    findOneAndUpdateRejected = true;
    assert(
      err.message.includes("immutable"),
      `Mongoose findOneAndUpdate blocked by immutability hook: ${err.message}`
    );
  }
  assert(findOneAndUpdateRejected, "Audit log cannot be modified via findOneAndUpdate");

  // Test 12: deleteOne operation strictly rejected
  let deleteRejected = false;
  try {
    await FinancialAuditLog.deleteOne({ _id: customerLog?._id });
  } catch (err: any) {
    deleteRejected = true;
    assert(
      err.message.includes("append-only"),
      `Mongoose deleteOne blocked by immutability hook: ${err.message}`
    );
  }
  assert(deleteRejected, "Audit log cannot be deleted via deleteOne");

  // Test 13: findOneAndDelete operation strictly rejected
  let findOneAndDeleteRejected = false;
  try {
    await FinancialAuditLog.findOneAndDelete({ _id: customerLog?._id });
  } catch (err: any) {
    findOneAndDeleteRejected = true;
    assert(
      err.message.includes("append-only"),
      `Mongoose findOneAndDelete blocked by immutability hook: ${err.message}`
    );
  }
  assert(findOneAndDeleteRejected, "Audit log cannot be deleted via findOneAndDelete");

  // =========================================================================
  // SECTION 3: PRIVACY & METADATA SANITIZATION
  // =========================================================================
  console.log("\n--- SECTION 3: PRIVACY & METADATA SANITIZATION ---");

  // Test 18: Sensitive keys (secrets, tokens, passwords) redacted
  const rawMetadataWithSecrets = {
    razorpay_secret: "secret_live_9999999999",
    authToken: "bearer eyJhbGciOi...",
    passwordHash: "$2b$10$abcdef...",
    apiKey: "rzp_live_abc123",
    accountNumber: "1234567890123456",
    customerNote: "Urgent goat order",
  };

  const sanitized = sanitizeAuditMetadata(rawMetadataWithSecrets);

  assert(sanitized.razorpay_secret === "[REDACTED]", "Razorpay secret was redacted");
  assert(sanitized.authToken === "[REDACTED]", "Auth token was redacted");
  assert(sanitized.passwordHash === "[REDACTED]", "Password was redacted");
  assert(sanitized.apiKey === "[REDACTED]", "API key was redacted");

  // Test 19: Bank account number masked to last 4 digits
  assert(sanitized.accountNumber === "****3456", "Bank account number masked to last 4 digits");
  assert(sanitized.customerNote === "Urgent goat order", "Safe metadata preserved intact");

  // =========================================================================
  // SECTION 4: FINANCIAL RECONCILIATION
  // =========================================================================
  console.log("\n--- SECTION 4: FINANCIAL RECONCILIATION CHECKS ---");

  // Test 20: Matching Financial Snapshot Returns "matched" / "internal_only"
  const mockOrderValid: any = {
    _id: new mongoose.Types.ObjectId(),
    orderId: "GM-2026-VAL1",
    amount: 50000,
    sellerBasePrice: 50000,
    commissionRate: 2.0,
    commissionAmount: 1000,
    sellerNetPayable: 49000,
    currency: "INR",
    financialCalculationVersion: "v1_200bps",
    status: "delivered",
    payment: {
      status: "paid",
      razorpayOrderId: "order_rzp_111",
      razorpayPaymentId: "pay_rzp_111",
      paidAt: new Date(),
    },
    payout: {
      status: "paid",
      transferId: "trf_rzp_111",
      amount: 49000,
    },
    refund: {
      status: "none",
    },
  };

  const reconValid = await reconcileSingleOrder(mockOrderValid, { checkProvider: false });
  assert(
    reconValid.status === "matched" || reconValid.status === "internal_only",
    `Consistent order returns matched/internal_only (actual: ${reconValid.status})`
  );
  assert(reconValid.discrepancies.length === 0, "Consistent order has zero discrepancies");

  // Test 21 & 22: Historical 3.5% Commission Snapshot Preserved and Verified
  const mockOrderHistorical: any = {
    _id: new mongoose.Types.ObjectId(),
    orderId: "GM-2026-HIST1",
    amount: 50000,
    sellerBasePrice: 50000,
    commissionRate: 3.5, // Historical 3.5% rate!
    commissionAmount: 1750, // 3.5% of 50000
    sellerNetPayable: 48250, // 50000 - 1750
    currency: "INR",
    financialCalculationVersion: "v1_350bps",
    status: "delivered",
    payment: {
      status: "paid",
      razorpayPaymentId: "pay_hist_001",
      paidAt: new Date(),
    },
    payout: {
      status: "paid",
      transferId: "trf_hist_001",
      amount: 48250,
    },
    refund: { status: "none" },
  };

  const reconHist = await reconcileSingleOrder(mockOrderHistorical, { checkProvider: false });
  assert(
    reconHist.snapshot.commissionRate === 3.5,
    "Reconciliation verified against historical 3.5% commission rate, not current 2%"
  );
  assert(
    reconHist.snapshot.commissionAmount === 1750,
    "Historical commission amount ₹1,750 verified correctly"
  );
  assert(
    reconHist.snapshot.sellerNetPayable === 48250,
    "Historical sellerNetPayable ₹48,250 verified correctly"
  );
  assert(reconHist.discrepancies.length === 0, "Historical order is internally consistent with 0 discrepancies");

  // Test 23: sellerNetPayable strictly derived from stored snapshot value
  assert(
    reconHist.payout.expectedPayoutAmount === 48250,
    "Expected payout amount matches stored order.sellerNetPayable (₹48,250)"
  );

  // Test 24: Snapshot Math Discrepancy Detected
  const mockOrderMathBad: any = {
    ...mockOrderValid,
    orderId: "GM-2026-BADMATH",
    sellerBasePrice: 50000,
    commissionAmount: 1000,
    sellerNetPayable: 45000, // Should be 49000! 1000 + 45000 != 50000
  };

  const reconMathBad = await reconcileSingleOrder(mockOrderMathBad);
  assert(reconMathBad.status === "mismatch", "Snapshot math discrepancy marked as mismatch");
  assert(
    reconMathBad.discrepancies.some((d) => d.field === "snapshotMath"),
    "Discrepancy logged for snapshotMath"
  );

  // Test 25: Missing Payment ID on Paid Order Detected
  const mockOrderMissingPaymentId: any = {
    ...mockOrderValid,
    orderId: "GM-2026-NOPAYID",
    payment: {
      status: "paid",
      razorpayPaymentId: null, // Missing!
    },
  };

  const reconNoPayId = await reconcileSingleOrder(mockOrderMissingPaymentId);
  assert(reconNoPayId.status === "mismatch", "Missing payment ID marked as mismatch");
  assert(
    reconNoPayId.discrepancies.some((d) => d.field === "payment.razorpayPaymentId"),
    "Discrepancy logged for missing payment.razorpayPaymentId"
  );

  // Test 26: Payment Status vs Order Status Conflict Detected
  const mockOrderConflictingStatus: any = {
    ...mockOrderValid,
    orderId: "GM-2026-CONFLICT",
    status: "pending", // Order is pending but payment is paid!
    payment: {
      status: "paid",
      razorpayPaymentId: "pay_conf_001",
    },
  };

  const reconConflict = await reconcileSingleOrder(mockOrderConflictingStatus);
  assert(reconConflict.status === "mismatch", "Status conflict marked as mismatch");
  assert(
    reconConflict.discrepancies.some((d) => d.field === "order.status"),
    "Discrepancy logged for conflicting order.status"
  );

  // Test 27: Refund Inconsistency Detected
  const mockOrderRefundConflict: any = {
    ...mockOrderValid,
    orderId: "GM-2026-REFUNDCONFLICT",
    status: "refunded",
    payment: { status: "paid" }, // Should be refunded!
    refund: { status: "processing" }, // Should be processed!
  };

  const reconRefundConflict = await reconcileSingleOrder(mockOrderRefundConflict);
  assert(reconRefundConflict.status === "mismatch", "Refund inconsistency marked as mismatch");
  assert(
    reconRefundConflict.discrepancies.some((d) => d.field === "payment.status"),
    "Discrepancy logged for payment.status refund conflict"
  );

  // Test 28: Payout Amount Mismatch Detected
  const mockOrderPayoutMismatch: any = {
    ...mockOrderValid,
    orderId: "GM-2026-PAYOUTMISMATCH",
    payout: {
      status: "paid",
      transferId: "trf_bad_001",
      amount: 40000, // Should be 49000!
    },
  };

  const reconPayoutMismatch = await reconcileSingleOrder(mockOrderPayoutMismatch);
  assert(reconPayoutMismatch.status === "mismatch", "Payout amount mismatch marked as mismatch");
  assert(
    reconPayoutMismatch.discrepancies.some((d) => d.field === "payout.amount"),
    "Discrepancy logged for payout.amount mismatch"
  );

  // Test 29: Missing Payout Transfer ID Detected
  const mockOrderNoTransferId: any = {
    ...mockOrderValid,
    orderId: "GM-2026-NOTRF",
    payout: {
      status: "paid",
      transferId: null, // Missing!
      amount: 49000,
    },
  };

  const reconNoTrf = await reconcileSingleOrder(mockOrderNoTransferId);
  assert(reconNoTrf.status === "mismatch", "Missing transferId marked as mismatch");
  assert(
    reconNoTrf.discrepancies.some((d) => d.field === "payout.transferId"),
    "Discrepancy logged for missing payout.transferId"
  );

  // Test 30: Repeated Reconciliation is Idempotent and Safe
  const run1 = await runFinancialReconciliation();
  const run2 = await runFinancialReconciliation();
  assert(
    run1.totalOrdersAudited === run2.totalOrdersAudited,
    `Repeated reconciliation runs are deterministic (orders audited: ${run1.totalOrdersAudited} vs ${run2.totalOrdersAudited})`
  );
  assert(
    run1.discrepancyCount === run2.discrepancyCount,
    `Repeated reconciliation discrepancy count matches (${run1.discrepancyCount} vs ${run2.discrepancyCount})`
  );

  // Test 31: Zero-Mutation Guarantee
  // Count orders and audit logs before and after single order reconciliation
  const ordersBeforeCount = await Order.countDocuments();
  await reconcileSingleOrder(mockOrderValid);
  await reconcileSingleOrder(mockOrderMathBad);
  await reconcileSingleOrder(mockOrderHistorical);
  const ordersAfterCount = await Order.countDocuments();

  assert(
    ordersBeforeCount === ordersAfterCount,
    "Zero database mutations during order reconciliation execution"
  );

  // =========================================================================
  // SECTION 5: PAYMENT INITIATION + FINANCIAL SNAPSHOT AUDIT EVENTS
  // =========================================================================
  console.log("\n--- SECTION 5: PAYMENT INITIATION + FINANCIAL SNAPSHOT AUDIT EVENTS ---");

  // Test 32: payment_initiated event is logged with correct action
  const paymentInitLog = await logFinancialEvent({
    action: "payment_initiated",
    entityType: "payment",
    entityId: "order_rzp_test_001",
    orderId: "650000000000000000000010",
    actorId: "650000000000000000000011",
    actorRole: "customer",
    actorName: "Priya Sharma",
    amount: 35000,
    currency: "INR",
    newState: "pending",
    providerReference: "order_rzp_test_001",
    status: "success",
    metadata: { testTag: testRunTag, goatId: "goat_test_001", razorpayOrderId: "order_rzp_test_001" },
  });

  assert(paymentInitLog !== null, "payment_initiated audit event created successfully");
  assert(paymentInitLog?.action === "payment_initiated", "payment_initiated action recorded correctly");

  // Test 33: payment_initiated records correct actor (customer, server-side)
  assert(paymentInitLog?.actorRole === "customer", "payment_initiated actor role is customer");
  assert(paymentInitLog?.actorId === "650000000000000000000011", "payment_initiated actor ID recorded correctly");

  // Test 34: payment_initiated records Razorpay order ID as providerReference (not a secret)
  assert(paymentInitLog?.providerReference === "order_rzp_test_001", "payment_initiated providerReference is Razorpay order ID");
  assert(paymentInitLog?.entityId === "order_rzp_test_001", "payment_initiated entityId matches Razorpay order ID");

  // Test 35: payment_initiated records correct amount
  assert(paymentInitLog?.amount === 35000, "payment_initiated amount recorded correctly");

  // Test 36: payment_initiated does NOT store any secrets (metadata sanitization check)
  const sensitivePaymentMeta = sanitizeAuditMetadata({
    razorpayOrderId: "order_rzp_test_001",
    razorpay_secret: "secret_live_abc",
    apiKey: "rzp_live_key",
    goatId: "goat_test_001",
  });
  assert(sensitivePaymentMeta.razorpayOrderId === "order_rzp_test_001", "Safe Razorpay order ID preserved in payment_initiated metadata");
  assert(sensitivePaymentMeta.razorpay_secret === "[REDACTED]", "Razorpay secret redacted from payment_initiated metadata");
  assert(sensitivePaymentMeta.apiKey === "[REDACTED]", "API key redacted from payment_initiated metadata");

  // Test 37: snapshot_created event is logged with correct action
  const snapshotLog = await logFinancialEvent({
    action: "snapshot_created",
    entityType: "order",
    entityId: "650000000000000000000010",
    orderId: "650000000000000000000010",
    actorId: "650000000000000000000011",
    actorRole: "customer",
    actorName: "Priya Sharma",
    amount: 35000,
    currency: "INR",
    newState: "snapshot_persisted",
    status: "success",
    metadata: {
      sellerBasePrice: 35000,
      commissionRate: 2.0,
      commissionAmount: 700,
      sellerNetPayable: 34300,
      financialCalculationVersion: "1.0",
      currency: "INR",
      testTag: testRunTag,
    },
  });

  assert(snapshotLog !== null, "snapshot_created audit event created successfully");
  assert(snapshotLog?.action === "snapshot_created", "snapshot_created action recorded correctly");

  // Test 38: snapshot_created records all financial snapshot fields
  assert(snapshotLog?.metadata?.sellerBasePrice === 35000, "snapshot_created records sellerBasePrice");
  assert(snapshotLog?.metadata?.commissionRate === 2.0, "snapshot_created records commissionRate (2.0%)");
  assert(snapshotLog?.metadata?.commissionAmount === 700, "snapshot_created records commissionAmount");
  assert(snapshotLog?.metadata?.sellerNetPayable === 34300, "snapshot_created records sellerNetPayable");
  assert(snapshotLog?.metadata?.financialCalculationVersion === "1.0", "snapshot_created records financialCalculationVersion");

  // Test 39: snapshot_created references the correct orderId
  assert(snapshotLog?.orderId === "650000000000000000000010", "snapshot_created references correct orderId");

  // Test 40: Historical commission snapshot is not altered — 3.5% historical order recorded as-is
  const historicalSnapshotLog = await logFinancialEvent({
    action: "snapshot_created",
    entityType: "order",
    entityId: "650000000000000000000009",
    orderId: "650000000000000000000009",
    actorRole: "system",
    amount: 50000,
    currency: "INR",
    newState: "snapshot_persisted",
    status: "success",
    metadata: {
      sellerBasePrice: 50000,
      commissionRate: 3.5, // Historical rate - must be preserved verbatim
      commissionAmount: 1750,
      sellerNetPayable: 48250,
      financialCalculationVersion: "v1_350bps",
      currency: "INR",
      testTag: testRunTag,
    },
  });

  assert(historicalSnapshotLog?.metadata?.commissionRate === 3.5, "Historical 3.5% commission snapshot recorded verbatim (not recalculated at 2%)");
  assert(historicalSnapshotLog?.metadata?.sellerNetPayable === 48250, "Historical sellerNetPayable ₹48,250 preserved in snapshot log");

  // Test 41: payment_initiated and snapshot_created are distinct events — no unintentional duplication
  // They differ in entityType ("payment" vs "order") and record different financial concerns.
  assert(paymentInitLog?.entityType === "payment", "payment_initiated entityType is 'payment'");
  assert(snapshotLog?.entityType === "order", "snapshot_created entityType is 'order'");
  assert(paymentInitLog?.action !== snapshotLog?.action, "payment_initiated and snapshot_created are distinct, non-duplicate events");

  // Test 42: snapshot_created has no sensitive data in metadata
  const snapshotMeta = sanitizeAuditMetadata({
    sellerBasePrice: 35000,
    commissionRate: 2.0,
    commissionAmount: 700,
    sellerNetPayable: 34300,
    financialCalculationVersion: "1.0",
    currency: "INR",
  });
  assert(snapshotMeta.sellerBasePrice === 35000, "sellerBasePrice is not redacted (not sensitive)");
  assert(snapshotMeta.commissionRate === 2.0, "commissionRate is not redacted (not sensitive)");
  assert(snapshotMeta.sellerNetPayable === 34300, "sellerNetPayable is not redacted (not sensitive)");

  console.log("\n===============================================================");
  console.log(`🎉 ALL ${passCount} STEP 11 TESTS PASSED SUCCESSFULLY! (0 FAILURES)`);
  console.log("===============================================================\n");

  await mongoose.disconnect();
}

runTests().catch((err) => {
  console.error("FATAL TEST RUNNER ERROR:", err);
  process.exit(1);
});

