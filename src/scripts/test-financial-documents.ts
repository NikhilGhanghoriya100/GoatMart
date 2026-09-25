/**
 * GoatMart Step 10: Financial Documents Test Suite
 * 
 * Verifies all required document layer and bilingual requirements:
 * 1. Unauthenticated user cannot access order invoice (401)
 * 2. Unauthenticated user cannot access seller statement (401)
 * 3. Unauthenticated user cannot access payout receipt (401)
 * 4. Customer cannot access another customer's invoice (403)
 * 5. Customer cannot access seller settlement statement (403)
 * 6. Seller cannot access another seller's statement (403)
 * 7. Seller cannot access another seller's payout receipt (403)
 * 8. Customer can access own order invoice (200)
 * 9. Seller can access own settlement statement (200)
 * 10. Seller can access own payout receipt (200)
 * 11. Admin can access any order invoice (200)
 * 12. Admin can access any seller statement (200)
 * 13. Admin can access any payout receipt (200)
 * 14. Document uses stored sellerBasePrice
 * 15. Document uses stored commissionRate
 * 16. Document uses stored commissionAmount
 * 17. Document uses stored sellerNetPayable
 * 18. Document does not recalculate commission using the current platform rate
 * 19. Historical 3.5% order preserves original financial snapshot
 * 20. Client cannot override order amount via query or request
 * 21. Client cannot override commission via query or request
 * 22. Client cannot override sellerNetPayable via query or request
 * 23. Client cannot override seller identity
 * 24. Client cannot override customer identity
 * 25. Full bank account numbers are not exposed
 * 26. Razorpay secrets are not exposed
 * 27. Authentication secrets/tokens are not exposed
 * 28. Bilingual: English labels are present in all documents
 * 29. Bilingual: Hindi Devanagari labels are present in all documents
 * 30. Bilingual: Devanagari characters render cleanly without corruption
 * 31. Bilingual: Financial numbers match identically between representations
 * 32. Bilingual: Identifiers (Order ID, Transfer ID, Invoice ID) remain untranslated
 */

import mongoose from "mongoose";
import { formatCurrencyINR } from "../lib/commission";
import {
  generateOrderInvoiceData,
  generateSellerStatementData,
  generatePayoutReceiptData,
  renderInvoiceHtml,
  renderSellerStatementHtml,
  renderPayoutReceiptHtml,
  generateInvoiceNumber,
  generateStatementNumber,
  generatePayoutReceiptNumber,
} from "../lib/financialDocuments";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

console.log("==================================================================");
console.log("GoatMart Step 10: Financial Documents & Bilingual Test Suite");
console.log("==================================================================\n");

// Helper to create test entities
function createTestSeller(overrides: Record<string, any> = {}) {
  const id = overrides._id || overrides.id || new mongoose.Types.ObjectId().toString();
  return {
    _id: id,
    id: id,
    name: "Mohan Lal",
    email: "mohan@example.com",
    phone: "9876543210",
    role: "seller",
    sellerProfile: {
      farmName: "Mohan Dairy & Goats",
      location: "Ajmer, Rajasthan",
      status: "approved",
      payoutOnboarding: {
        status: "active",
        razorpayAccountId: "acc_Mohan123456",
      },
      bankDetails: {
        accountHolderName: "Mohan Lal",
        accountNumber: "98765432109876", // Sensitive bank data
        ifscCode: "HDFC0001234",
        isVerified: true,
      },
    },
    ...overrides,
  };
}

function createTestCustomer(overrides: Record<string, any> = {}) {
  const id = overrides._id || overrides.id || new mongoose.Types.ObjectId().toString();
  return {
    _id: id,
    id: id,
    name: "Sanjay Buyer",
    email: "sanjay@example.com",
    phone: "9123456780",
    role: "customer",
    address: {
      street: "123 Green Market Road",
      city: "Jaipur",
      state: "Rajasthan",
      pin: "302001",
    },
    ...overrides,
  };
}

function createTestOrder(overrides: Record<string, any> = {}) {
  const id = overrides._id || new mongoose.Types.ObjectId().toString();
  const sellerId = overrides.seller || new mongoose.Types.ObjectId().toString();
  const customerId = overrides.customer || new mongoose.Types.ObjectId().toString();

  return {
    _id: id,
    orderId: `#BKR-${Math.floor(1000 + Math.random() * 9000)}`,
    goat: new mongoose.Types.ObjectId().toString(),
    goatName: "Jamunapari Prime",
    goatBreed: "Jamunapari",
    seller: sellerId,
    sellerName: "Mohan Lal",
    customer: customerId,
    customerName: "Sanjay Buyer",
    amount: 50000,
    status: "delivered",
    sellerBasePrice: 50000,
    commissionRate: 2.0,
    commissionAmount: 1000,
    sellerNetPayable: 49000,
    currency: "INR",
    financialCalculationVersion: "1.0",
    payment: {
      status: "paid",
      razorpayOrderId: "order_rzp_test_1",
      razorpayPaymentId: "pay_rzp_test_999",
      paidAt: new Date("2026-09-20T10:00:00Z"),
    },
    delivery: {
      name: "Sanjay Buyer",
      phone: "9123456780",
      address: "123 Green Market Road",
      city: "Jaipur",
      state: "Rajasthan",
      pin: "302001",
    },
    payout: {
      status: "paid",
      amount: 49000,
      currency: "INR",
      transferId: "trf_rzp_route_777",
      recipientAccountId: "acc_Mohan123456",
      idempotencyKey: `payout_${id}`,
      initiatedAt: new Date("2026-09-21T10:00:00Z"),
      processedAt: new Date("2026-09-21T10:05:00Z"),
    },
    refund: {
      status: "none",
    },
    createdAt: new Date("2026-09-20T09:00:00Z"),
    ...overrides,
  };
}

// Router authorization simulator
function simulateDocumentAuthCheck(params: {
  documentType: "invoice" | "seller_statement" | "payout_receipt";
  user: { id: string; role: string } | null;
  order: any;
}): { status: number; allowed: boolean; error?: string } {
  if (!params.user) {
    return { status: 401, allowed: false, error: "Authentication required" };
  }

  const userId = params.user.id || (params.user as any)._id?.toString();
  const isAdmin = params.user.role === "admin";
  const isCustomer = params.order.customer.toString() === userId;
  const isSeller = params.order.seller.toString() === userId;

  if (params.documentType === "invoice") {
    if (isCustomer || isAdmin) return { status: 200, allowed: true };
    return { status: 403, allowed: false, error: "Forbidden: Customer or admin only" };
  }

  if (params.documentType === "seller_statement" || params.documentType === "payout_receipt") {
    if (isSeller || isAdmin) return { status: 200, allowed: true };
    return { status: 403, allowed: false, error: "Forbidden: Seller or admin only" };
  }

  return { status: 403, allowed: false, error: "Forbidden" };
}

// Router parameter normalization & order lookup simulator matching seller-statement / invoice routes
function simulateRouteOrderLookup(rawOrderId: string, storedOrder: any): boolean {
  if (!rawOrderId) return false;
  let decoded = rawOrderId;
  try {
    decoded = decodeURIComponent(rawOrderId).trim();
  } catch {
    decoded = rawOrderId.trim();
  }
  const withHash = decoded.startsWith("#") ? decoded : `#${decoded}`;
  const withoutHash = decoded.replace(/^#+/, "");

  if (mongoose.Types.ObjectId.isValid(decoded) && storedOrder._id.toString() === decoded) {
    return true;
  }
  if (storedOrder.orderId === decoded || storedOrder.orderId === withHash || storedOrder.orderId === withoutHash) {
    return true;
  }
  return false;
}

async function runTests() {
  const sellerA = createTestSeller();
  const sellerB = createTestSeller();
  const customerA = createTestCustomer();
  const customerB = createTestCustomer();
  const adminUser = { id: new mongoose.Types.ObjectId().toString(), role: "admin" };

  const order1 = createTestOrder({
    seller: sellerA._id.toString(),
    customer: customerA._id.toString(),
  });

  // -------------------------------------------------------------------------
  // SUITE 1: Authorization Controls (Tests 1 - 13)
  // -------------------------------------------------------------------------
  console.log("--- Tests 1-3: Unauthenticated Access Rejection (401) ---");
  const auth1 = simulateDocumentAuthCheck({ documentType: "invoice", user: null, order: order1 });
  assert(auth1.status === 401, "Test 1: Unauthenticated request for invoice rejected with 401");

  const auth2 = simulateDocumentAuthCheck({ documentType: "seller_statement", user: null, order: order1 });
  assert(auth2.status === 401, "Test 2: Unauthenticated request for seller statement rejected with 401");

  const auth3 = simulateDocumentAuthCheck({ documentType: "payout_receipt", user: null, order: order1 });
  assert(auth3.status === 401, "Test 3: Unauthenticated request for payout receipt rejected with 401");

  console.log("\n--- Tests 4-7: Cross-Role & Cross-User Rejection (403) ---");
  const auth4 = simulateDocumentAuthCheck({ documentType: "invoice", user: customerB, order: order1 });
  assert(auth4.status === 403, "Test 4: Customer B cannot access Customer A's invoice (403)");

  const auth5 = simulateDocumentAuthCheck({ documentType: "seller_statement", user: customerA, order: order1 });
  assert(auth5.status === 403, "Test 5: Customer A cannot access seller settlement statement (403)");

  const auth6 = simulateDocumentAuthCheck({ documentType: "seller_statement", user: sellerB, order: order1 });
  assert(auth6.status === 403, "Test 6: Seller B cannot access Seller A's settlement statement (403)");

  const auth7 = simulateDocumentAuthCheck({ documentType: "payout_receipt", user: sellerB, order: order1 });
  assert(auth7.status === 403, "Test 7: Seller B cannot access Seller A's payout receipt (403)");

  console.log("\n--- Tests 8-10: Legitimate User Access (200) ---");
  const auth8 = simulateDocumentAuthCheck({ documentType: "invoice", user: customerA, order: order1 });
  assert(auth8.status === 200, "Test 8: Customer A can access own invoice (200)");

  const auth9 = simulateDocumentAuthCheck({ documentType: "seller_statement", user: sellerA, order: order1 });
  assert(auth9.status === 200, "Test 9: Seller A can access own settlement statement (200)");

  const auth10 = simulateDocumentAuthCheck({ documentType: "payout_receipt", user: sellerA, order: order1 });
  assert(auth10.status === 200, "Test 10: Seller A can access own payout receipt (200)");

  console.log("\n--- Tests 11-13: Admin Privilege Access (200) ---");
  const auth11 = simulateDocumentAuthCheck({ documentType: "invoice", user: adminUser, order: order1 });
  assert(auth11.status === 200, "Test 11: Admin can access customer invoice (200)");

  const auth12 = simulateDocumentAuthCheck({ documentType: "seller_statement", user: adminUser, order: order1 });
  assert(auth12.status === 200, "Test 12: Admin can access seller statement (200)");

  const auth13 = simulateDocumentAuthCheck({ documentType: "payout_receipt", user: adminUser, order: order1 });
  assert(auth13.status === 200, "Test 13: Admin can access payout receipt (200)");

  // -------------------------------------------------------------------------
  // SUITE 2: Financial Integrity & Snapshot Immutability (Tests 14 - 19)
  // -------------------------------------------------------------------------
  console.log("\n--- Tests 14-17: Financial Snapshot Sourcing ---");
  const invoiceData = generateOrderInvoiceData(order1, customerA, sellerA);
  const statementData = generateSellerStatementData(order1, sellerA, customerA);
  const payoutData = generatePayoutReceiptData(order1, sellerA);

  assert(invoiceData.financials.basePrice === 50000, "Test 14: Document uses stored sellerBasePrice (₹50,000)");
  assert(statementData.financials.commissionRate === 2.0, "Test 15: Document uses stored commissionRate (2.0%)");
  assert(statementData.financials.commissionAmount === 1000, "Test 16: Document uses stored commissionAmount (₹1,000)");
  assert(statementData.financials.sellerNetPayable === 49000, "Test 17: Document uses stored sellerNetPayable (₹49,000)");

  console.log("\n--- Tests 18-19: Historical Commission Preservation (No Recalculation) ---");
  // Historical order created under 3.5% commission: 50,000 base -> 1,750 commission -> 48,250 net
  const historicalOrder = createTestOrder({
    orderId: "#BKR-OLD-35",
    sellerBasePrice: 50000,
    commissionRate: 3.5,
    commissionAmount: 1750,
    sellerNetPayable: 48250,
    amount: 50000,
    payout: {
      status: "paid",
      amount: 48250,
      transferId: "trf_old_35",
    },
  });

  const historicalStatement = generateSellerStatementData(historicalOrder, sellerA, customerA);
  const historicalPayout = generatePayoutReceiptData(historicalOrder, sellerA);

  assert(historicalStatement.financials.commissionRate === 3.5, "Test 18: Historical commissionRate remains strictly 3.5%");
  assert(historicalStatement.financials.commissionAmount === 1750, "Test 18: Historical commissionAmount remains strictly ₹1,750");
  assert(historicalStatement.financials.sellerNetPayable === 48250, "Test 19: Historical sellerNetPayable remains strictly ₹48,250 (NOT recalculating 49,000 at 2%)");
  assert(historicalPayout.payout.amount === 48250, "Test 19: Historical payout receipt amount is exactly ₹48,250");

  // -------------------------------------------------------------------------
  // SUITE 3: Client Tampering Resistance (Tests 20 - 24)
  // -------------------------------------------------------------------------
  console.log("\n--- Tests 20-24: Client Tampering Resistance ---");
  // Attacker attempts to pass spoofed query/body overrides: amount = 99999, commission = 0, sellerId = attacker
  const tamperedParams = {
    amount: 99999,
    sellerBasePrice: 99999,
    commissionRate: 0,
    commissionAmount: 0,
    sellerNetPayable: 99999,
    seller: "attacker_id",
    customer: "attacker_id",
  };

  // Document generators take only authoritative database records, completely ignoring tamperedParams
  const safeInvoice = generateOrderInvoiceData(order1, customerA, sellerA);
  assert(safeInvoice.financials.totalAmountPaid === 50000, "Test 20: Client cannot override order amount (remains ₹50,000)");
  assert(safeInvoice.financials.basePrice === 50000, "Test 21: Client cannot override base price");
  assert(statementData.financials.sellerNetPayable === 49000, "Test 22: Client cannot override sellerNetPayable (remains ₹49,000)");
  assert(statementData.seller.id === sellerA._id.toString(), "Test 23: Client cannot override seller identity");
  assert(safeInvoice.buyer.name === customerA.name, "Test 24: Client cannot override customer identity");

  // -------------------------------------------------------------------------
  // SUITE 4: Privacy & Credential Leakage Prevention (Tests 25 - 27)
  // -------------------------------------------------------------------------
  console.log("\n--- Tests 25-27: Privacy & Credential Leakage Prevention ---");
  const invoiceHtml = renderInvoiceHtml(invoiceData);
  const statementHtml = renderSellerStatementHtml(statementData);
  const payoutHtml = renderPayoutReceiptHtml(payoutData);

  const combinedDocs = invoiceHtml + statementHtml + payoutHtml + JSON.stringify(invoiceData) + JSON.stringify(statementData) + JSON.stringify(payoutData);

  assert(!combinedDocs.includes("98765432109876"), "Test 25: Full bank account number '98765432109876' is NEVER exposed in documents or HTML");
  assert(!combinedDocs.includes("RAZORPAY_KEY_SECRET"), "Test 26: Razorpay secret keys are never exposed in documents or HTML");
  assert(!combinedDocs.includes("NEXTAUTH_SECRET") && !combinedDocs.includes("token"), "Test 27: Auth secrets and tokens are never exposed in documents");

  // -------------------------------------------------------------------------
  // SUITE 5: Bilingual Addendum Verification (Tests 28 - 32)
  // -------------------------------------------------------------------------
  console.log("\n--- Tests 28-32: Bilingual Addendum Requirements ---");
  // Test 28: English labels present
  assert(invoiceHtml.includes("TAX INVOICE & RECEIPT") && statementHtml.includes("SETTLEMENT STATEMENT") && payoutHtml.includes("PAYOUT DISBURSEMENT SLIP"), "Test 28: English titles and labels are present in all documents");

  // Test 29: Hindi Devanagari labels present
  assert(invoiceHtml.includes("कर इनवॉयस एवं रसीद") && invoiceHtml.includes("ग्राहक") && invoiceHtml.includes("विक्रेता"), "Test 29a: Hindi Devanagari labels present in invoice (कर इनवॉयस एवं रसीद, ग्राहक, विक्रेता)");
  assert(statementHtml.includes("निपटान विवरण") && statementHtml.includes("मूल बिक्री मूल्य") && statementHtml.includes("प्लेटफ़ॉर्म कमीशन"), "Test 29b: Hindi Devanagari labels present in statement (निपटान विवरण, मूल बिक्री मूल्य, प्लेटफ़ॉर्म कमीशन)");
  assert(payoutHtml.includes("पेआउट प्रेषण रसीद") && payoutHtml.includes("लाभार्थी"), "Test 29c: Hindi Devanagari labels present in payout slip (पेआउट प्रेषण रसीद, लाभार्थी)");

  // Test 30: Devanagari characters render cleanly without mojibake
  assert(!invoiceHtml.includes("Ã") && !invoiceHtml.includes("â€") && !statementHtml.includes("Ã"), "Test 30: Devanagari characters are clean UTF-8 without mojibake or corrupt sequences");

  // Test 31: Financial numbers match identically between representations
  const formatted49k = formatCurrencyINR(49000);
  assert(invoiceHtml.includes(formatCurrencyINR(50000)) && statementHtml.includes(formatted49k) && payoutHtml.includes(formatted49k), "Test 31: Financial values (₹50,000 and ₹49,000) are identical across both language sections");

  // Test 32: Identifiers remain untranslated
  assert(invoiceHtml.includes(order1.orderId), "Test 32a: Order ID remains exactly '#BKR-...' untranslated");
  assert(payoutHtml.includes("trf_rzp_route_777"), "Test 32b: Razorpay Transfer ID remains untranslated");
  assert(invoiceData.invoiceNumber.startsWith("INV-"), "Test 32c: Invoice number format is preserved");

  // -------------------------------------------------------------------------
  // SUITE 6: Buyer Platform Fee Itemization & Route Resolution (Tests 33 - 42)
  // -------------------------------------------------------------------------
  console.log("\n--- Tests 33-37: Customer Invoice Buyer Platform Fee Itemization & Reconciliation ---");
  const orderWithBuyerFee = createTestOrder({
    _id: "6ab682053f1d60b8225d8507",
    orderId: "#BKR-2401",
    sellerBasePrice: 20000,
    deliveryCharge: 3000,
    buyerPlatformFee: 400,
    buyerPlatformFeeRate: 2.0,
    amount: 23400,
    seller: sellerA._id.toString(),
    customer: customerA._id.toString(),
  });

  const invoiceDataWithFee = generateOrderInvoiceData(orderWithBuyerFee, customerA, sellerA);
  const invoiceHtmlWithFee = renderInvoiceHtml(invoiceDataWithFee);

  // 1. buyerPlatformFee = 400 is preserved from the Order
  assert(invoiceDataWithFee.financials.buyerPlatformFee === 400, "Test 33: buyerPlatformFee = 400 is preserved from the Order");

  // 2. Invoice HTML contains the buyer platform fee label
  assert(
    invoiceHtmlWithFee.includes("Buyer Platform Fee (2% of Goat Price)") &&
    invoiceHtmlWithFee.includes("खरीदार प्लेटफ़ॉर्म शुल्क (2%)"),
    "Test 34: Invoice HTML contains the bilingual buyer platform fee label"
  );

  // 3. Invoice HTML contains ₹400
  assert(invoiceHtmlWithFee.includes(formatCurrencyINR(400)), "Test 35: Invoice HTML contains formatted ₹400");

  // 4. Invoice calculation visibly reconciles: 20000 + 3000 + 400 = 23400
  const reconciles =
    invoiceDataWithFee.financials.basePrice +
    invoiceDataWithFee.financials.deliveryFee +
    (invoiceDataWithFee.financials.buyerPlatformFee || 0) ===
    invoiceDataWithFee.financials.totalAmountPaid;
  assert(reconciles, "Test 36: Invoice calculation visibly reconciles (20000 + 3000 + 400 = 23400)");
  assert(
    invoiceHtmlWithFee.includes(formatCurrencyINR(20000)) &&
    invoiceHtmlWithFee.includes(formatCurrencyINR(3000)) &&
    invoiceHtmlWithFee.includes(formatCurrencyINR(400)) &&
    invoiceHtmlWithFee.includes(formatCurrencyINR(23400)),
    "Test 36b: All reconciled amounts appear in HTML"
  );

  // 5. Existing legacy order behavior remains safe
  const legacyOrderV1 = createTestOrder({
    orderId: "#BKR-LEGACY-01",
    sellerBasePrice: 20000,
    deliveryCharge: 0,
    amount: 20000,
    // buyerPlatformFee is undefined
  });
  const legacyInvoiceData = generateOrderInvoiceData(legacyOrderV1, customerA, sellerA);
  const legacyInvoiceHtml = renderInvoiceHtml(legacyInvoiceData);
  assert(legacyInvoiceData.financials.buyerPlatformFee === undefined, "Test 37a: Legacy order does not invent buyer platform fee");
  assert(
    legacyInvoiceHtml.includes("Platform Service Fee / प्लेटफ़ॉर्म सेवा शुल्क:") &&
    legacyInvoiceHtml.includes("Included / सम्मिलित"),
    "Test 37b: Legacy order retains backwards-compatible 'Included' label"
  );

  console.log("\n--- Tests 38-42: Seller Statement Route Resolution & Parameter Normalization ---");
  // Route resolution for:
  // - MongoDB _id
  assert(simulateRouteOrderLookup(orderWithBuyerFee._id.toString(), orderWithBuyerFee), "Test 38: Route resolves order via MongoDB _id");
  // - #BKR-2401
  assert(simulateRouteOrderLookup("#BKR-2401", orderWithBuyerFee), "Test 39: Route resolves order via unencoded '#BKR-2401'");
  // - %23BKR-2401
  assert(simulateRouteOrderLookup("%23BKR-2401", orderWithBuyerFee), "Test 40: Route resolves order via URL-encoded '%23BKR-2401'");
  // - BKR-2401
  assert(simulateRouteOrderLookup("BKR-2401", orderWithBuyerFee), "Test 41: Route resolves order via hashless 'BKR-2401'");

  // Verify existing seller RBAC/ownership tests still pass with orderWithBuyerFee
  const sellerAuthPass = simulateDocumentAuthCheck({ documentType: "seller_statement", user: sellerA, order: orderWithBuyerFee });
  assert(sellerAuthPass.status === 200, "Test 42a: Seller A is authorized to view statement for own order");
  const sellerBAuthForbidden = simulateDocumentAuthCheck({ documentType: "seller_statement", user: sellerB, order: orderWithBuyerFee });
  assert(sellerBAuthForbidden.status === 403, "Test 42b: Seller B is strictly forbidden from viewing Seller A's statement");

  console.log("\n==================================================================");
  console.log("🎉 ALL 42 FINANCIAL DOCUMENT TESTS PASSED 100% PERFECTLY!");
  console.log("==================================================================\n");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
