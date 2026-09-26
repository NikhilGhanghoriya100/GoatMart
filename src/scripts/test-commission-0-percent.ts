import assert from "assert";
import {
  PLATFORM_COMMISSION_RATE,
  PLATFORM_COMMISSION_BPS,
  BUYER_PLATFORM_FEE_RATE,
  BUYER_PLATFORM_FEE_BPS,
  calculateOrderFinancials,
  calculateListingFeeEstimate,
  formatCurrencyINR,
  parseCommissionRate,
} from "../lib/commission";
import {
  generateOrderInvoiceData,
  renderInvoiceHtml,
  generateSellerStatementData,
  renderSellerStatementHtml,
  generateRefundStatementData,
  renderRefundStatementHtml,
} from "../lib/financialDocuments";

console.log("==================================================================");
console.log("GoatMart Platform Commission 0% & Future-Proof Test Suite");
console.log("==================================================================");

// ------------------------------------------------------------------
// Test 1: Active Configuration Defaults
// ------------------------------------------------------------------
console.log("\n--- Test 1: Active Configuration Defaults ---");
assert.strictEqual(PLATFORM_COMMISSION_RATE, 0.0, "PLATFORM_COMMISSION_RATE must default to 0.0");
assert.strictEqual(PLATFORM_COMMISSION_BPS, 0, "PLATFORM_COMMISSION_BPS must default to 0");
assert.strictEqual(BUYER_PLATFORM_FEE_RATE, 0.0, "BUYER_PLATFORM_FEE_RATE must default to 0.0");
assert.strictEqual(BUYER_PLATFORM_FEE_BPS, 0, "BUYER_PLATFORM_FEE_BPS must default to 0");
console.log("✓ Active defaults verified: 0% buyer platform fee, 0% seller platform commission");

// ------------------------------------------------------------------
// Test 2: Rate Parsing & Validation Logic
// ------------------------------------------------------------------
console.log("\n--- Test 2: Rate Parsing & Validation Logic ---");
assert.strictEqual(parseCommissionRate("0", 2.0), 0);
assert.strictEqual(parseCommissionRate("0.0", 2.0), 0);
assert.strictEqual(parseCommissionRate("2", 0), 2);
assert.strictEqual(parseCommissionRate("2.5", 0), 2.5);
assert.strictEqual(parseCommissionRate("3", 0), 3);
assert.strictEqual(parseCommissionRate("100", 0), 100);
// Fallback on invalid inputs
assert.strictEqual(parseCommissionRate(undefined, 0.0), 0.0);
assert.strictEqual(parseCommissionRate("", 0.0), 0.0);
assert.strictEqual(parseCommissionRate("-5", 0.0), 0.0);
assert.strictEqual(parseCommissionRate("150", 0.0), 0.0);
assert.strictEqual(parseCommissionRate("invalid", 0.0), 0.0);
console.log("✓ Rate parsing accurately validates bounds [0, 100] and falls back safely");

// ------------------------------------------------------------------
// Test 3: Standard New Order Financials @ 0% Commission & 0% Fee
// ------------------------------------------------------------------
console.log("\n--- Test 3: Standard New Order Financials @ 0% Commission ---");
const basePrice = 25000;
const deliveryCharge = 1500;
const fin0 = calculateOrderFinancials(basePrice, { deliveryCharge });

assert.strictEqual(fin0.sellerBasePrice, 25000, "Base price is 25,000");
assert.strictEqual(fin0.deliveryCharge, 1500, "Delivery charge is 1,500");
assert.strictEqual(fin0.buyerPlatformFee, 0, "Buyer fee is 0");
assert.strictEqual(fin0.buyerPlatformFeeRate, 0, "Buyer fee rate is 0");
assert.strictEqual(fin0.commissionRate, 0, "Commission rate is 0");
assert.strictEqual(fin0.commissionAmount, 0, "Commission amount is 0");
assert.strictEqual(fin0.sellerGoatNet, 25000, "Seller goat net is full 25,000");
assert.strictEqual(fin0.sellerDeliveryAmount, 1500, "Seller gets 100% of delivery (1,500)");
assert.strictEqual(fin0.sellerNetPayable, 26500, "Seller net payable is 26,500");
assert.strictEqual(fin0.totalAmount, 26500, "Buyer pays 25,000 + 1,500 + 0 = 26,500");

// Invariant: totalAmount = sellerNetPayable + commissionAmount
assert.strictEqual(fin0.totalAmount, fin0.sellerNetPayable + fin0.commissionAmount);
console.log("✓ New order at 0% correctly computes zero deductions and reconciles perfectly");

// ------------------------------------------------------------------
// Test 4: Free Delivery Order @ 0% Commission
// ------------------------------------------------------------------
console.log("\n--- Test 4: Free Delivery Order @ 0% Commission ---");
const finFreeDelivery = calculateOrderFinancials(30000, { deliveryCharge: 0 });
assert.strictEqual(finFreeDelivery.buyerPlatformFee, 0);
assert.strictEqual(finFreeDelivery.commissionAmount, 0);
assert.strictEqual(finFreeDelivery.sellerNetPayable, 30000);
assert.strictEqual(finFreeDelivery.totalAmount, 30000);
assert.strictEqual(finFreeDelivery.totalAmount, finFreeDelivery.sellerNetPayable + finFreeDelivery.commissionAmount);
console.log("✓ Free delivery order at 0% reconciles perfectly");

// ------------------------------------------------------------------
// Test 5: Seller Listing Fee Estimate @ 0%
// ------------------------------------------------------------------
console.log("\n--- Test 5: Seller Listing Fee Estimate @ 0% ---");
const estimate = calculateListingFeeEstimate(40000, 2000);
assert.strictEqual(estimate.commissionRate, 0, "Estimate shows 0% commission");
assert.strictEqual(estimate.estimatedCommission, 0, "Estimated commission is 0");
assert.strictEqual(estimate.estimatedSellerGoatNet, 40000, "Estimated goat net is full 40,000");
assert.strictEqual(estimate.estimatedSellerNet, 42000, "Estimated net payable is 42,000");
console.log("✓ Seller listing fee estimate correctly reflects 0% rate and zero commission");

// ------------------------------------------------------------------
// Test 6: Custom Future Rate Scenarios (2% & 3%) via Options Object
// ------------------------------------------------------------------
console.log("\n--- Test 6: Custom Future Rate Scenarios via Options Object ---");
const fin2 = calculateOrderFinancials(20000, { deliveryCharge: 1000, commissionBps: 200, buyerFeeBps: 200 });
assert.strictEqual(fin2.commissionRate, 2.0);
assert.strictEqual(fin2.commissionAmount, 400); // 2% of 20,000
assert.strictEqual(fin2.buyerPlatformFee, 400); // 2% of 20,000
assert.strictEqual(fin2.sellerGoatNet, 19600);
assert.strictEqual(fin2.sellerNetPayable, 20600); // 19,600 + 1,000
assert.strictEqual(fin2.totalAmount, 21400); // 20,000 + 1,000 + 400
assert.strictEqual(fin2.totalAmount, fin2.sellerNetPayable + fin2.commissionAmount + fin2.buyerPlatformFee);

const fin3 = calculateOrderFinancials(20000, { deliveryCharge: 0, commissionBps: 300, buyerFeeBps: 300 });
assert.strictEqual(fin3.commissionRate, 3.0);
assert.strictEqual(fin3.commissionAmount, 600); // 3% of 20,000
assert.strictEqual(fin3.buyerPlatformFee, 600); // 3% of 20,000
assert.strictEqual(fin3.sellerNetPayable, 19400);
assert.strictEqual(fin3.totalAmount, 20600);
assert.strictEqual(fin3.totalAmount, fin3.sellerNetPayable + fin3.commissionAmount + fin3.buyerPlatformFee);
console.log("✓ Custom rate scenarios (2%, 3%) compute and reconcile accurately");

// ------------------------------------------------------------------
// Test 7: Historical Order Snapshot Invariance (3.5% & 2% Orders)
// ------------------------------------------------------------------
console.log("\n--- Test 7: Historical Order Snapshot Invariance ---");
// Historical Order A (3.5% commission rate, older schema)
const historicalOrderA = {
  orderId: "HIST-001",
  amount: 50000,
  sellerBasePrice: 50000,
  deliveryCharge: 0,
  commissionRate: 3.5,
  commissionAmount: 1750,
  sellerNetPayable: 48250,
  status: "delivered",
  createdAt: new Date("2024-01-15"),
};

const sellerStatementA = generateSellerStatementData(historicalOrderA);
assert.strictEqual(sellerStatementA.financials.commissionRate, 3.5, "Preserves stored 3.5% rate");
assert.strictEqual(sellerStatementA.financials.commissionAmount, 1750, "Preserves stored 1,750 commission");
assert.strictEqual(sellerStatementA.financials.sellerNetPayable, 48250, "Preserves stored 48,250 payable");

const sellerHtmlA = renderSellerStatementHtml(sellerStatementA);
assert.ok(sellerHtmlA.includes("3.5%"), "Seller statement HTML displays stored 3.5%");
assert.ok(sellerHtmlA.includes("1,750"), "Seller statement HTML displays stored 1,750");

// Historical Order B (2% commission, 2% buyer fee)
const historicalOrderB = {
  orderId: "HIST-002",
  amount: 20400,
  sellerBasePrice: 20000,
  deliveryCharge: 0,
  buyerPlatformFee: 400,
  buyerPlatformFeeRate: 2.0,
  commissionRate: 2.0,
  commissionAmount: 400,
  sellerNetPayable: 19600,
  status: "delivered",
  createdAt: new Date("2024-06-20"),
};

const invoiceDataB = generateOrderInvoiceData(historicalOrderB);
assert.strictEqual(invoiceDataB.financials.buyerPlatformFee, 400, "Preserves stored 400 buyer fee");
assert.strictEqual(invoiceDataB.financials.buyerPlatformFeeRate, 2.0, "Preserves stored 2.0% buyer rate");
const invoiceHtmlB = renderInvoiceHtml(invoiceDataB);
assert.ok(invoiceHtmlB.includes("Buyer Platform Fee (2% of Goat Price)"), "Invoice HTML displays 2% rate");
assert.ok(invoiceHtmlB.includes("खरीदार प्लेटफ़ॉर्म शुल्क (2%)"), "Invoice Hindi HTML displays 2% rate");

console.log("✓ Historical orders with 3.5% and 2.0% remain completely immutable");

// ------------------------------------------------------------------
// Test 8: New Order Invoice & Statement Documents @ 0%
// ------------------------------------------------------------------
console.log("\n--- Test 8: New Order Documents @ 0% ---");
const newOrder0 = {
  orderId: "NEW-001",
  amount: 26500,
  sellerBasePrice: 25000,
  deliveryCharge: 1500,
  buyerPlatformFee: 0,
  buyerPlatformFeeRate: 0,
  commissionRate: 0,
  commissionAmount: 0,
  sellerNetPayable: 26500,
  status: "delivered",
  createdAt: new Date(),
};

const newInvoiceData = generateOrderInvoiceData(newOrder0);
assert.strictEqual(newInvoiceData.financials.buyerPlatformFee, undefined, "Zero buyer fee is treated as included");
const newInvoiceHtml = renderInvoiceHtml(newInvoiceData);
assert.ok(newInvoiceHtml.includes("Platform Service Fee / प्लेटफ़ॉर्म सेवा शुल्क:"), "New invoice shows included platform fee");
assert.ok(newInvoiceHtml.includes("Included / सम्मिलित"), "New invoice shows Included");

const newSellerStatement = generateSellerStatementData(newOrder0);
assert.strictEqual(newSellerStatement.financials.commissionRate, 0, "Seller statement has 0% commission");
assert.strictEqual(newSellerStatement.financials.commissionAmount, 0, "Seller statement has 0 commission amount");
const newSellerHtml = renderSellerStatementHtml(newSellerStatement);
assert.ok(newSellerHtml.includes("GoatMart commission (0% only on goat price)"), "Statement HTML shows 0%");

console.log("✓ New order documents accurately render 0% platform fee and commission");

// ------------------------------------------------------------------
// Test 9: Refund Statement Documents
// ------------------------------------------------------------------
console.log("\n--- Test 9: Refund Statement Documents ---");
const refundOrder = {
  orderId: "REF-001",
  amount: 25000,
  sellerBasePrice: 25000,
  deliveryCharge: 0,
  buyerPlatformFee: 0,
  buyerPlatformFeeRate: 0,
  refund: {
    status: "processed",
    breakdown: {
      originalGoatPrice: 25000,
      deliveryCharge: 0,
      buyerPlatformFee: 0,
      buyerPlatformFeeRate: 0,
      totalCustomerPaid: 25000,
      refundCommissionRate: 3.5,
      refundCommissionAmount: 875,
      platformExpense: 0,
      sellerExpense: 0,
      totalDeductions: 875,
      finalRefundAmount: 24125,
      currency: "INR",
    },
  },
};

const refundData = generateRefundStatementData(refundOrder);
const refundHtml = renderRefundStatementHtml(refundData);
assert.strictEqual(refundData.breakdown.buyerPlatformFee, 0);
assert.strictEqual(refundData.breakdown.buyerPlatformFeeRate, 0);
assert.ok(!refundHtml.includes("Buyer Platform Fee"), "Buyer fee row omitted when 0");
assert.ok(refundHtml.includes("₹24,125"), "Refund statement includes correct refund amount");
console.log("✓ Refund statement renders accurately without spurious buyer fee");

console.log("\n==================================================================");
console.log("ALL TESTS PASSED SUCCESSFULLY! (9/9)");
console.log("==================================================================");
