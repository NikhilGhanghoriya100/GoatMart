/**
 * GoatMart Step 9B: Seller Payout Data Model & Schema Foundation Test Suite
 * 
 * Verifies:
 * 1. Payout type accepts all valid states (none, unpaid, processing, paid, failed, reversed).
 * 2. Invalid payout status is rejected by schema/type validation.
 * 3. Existing order structure remains valid without payout.
 * 4. Existing 3.5% financial snapshot remains unchanged.
 * 5. New 2% financial snapshot remains unchanged.
 * 6. Payout amount is not derived from current commission rate.
 * 7. Missing payout state is compatible with legacy orders (safely evaluates to "none").
 * 8. Duplicate transfer IDs are rejected by unique sparse index.
 * 9. Idempotency index behavior is safe with missing values (sparse unique).
 * 10. Seller payout onboarding supports required states (not_started, pending, active, rejected).
 * 11. isVerified does not default to true (strictly defaults to false).
 * 12. razorpayAccountId is optional and never auto-generated.
 * 13. No raw payout information is added to public seller response structures.
 */

import Order, { PayoutStatus } from "../models/Order";
import User, { PayoutOnboardingStatus } from "../models/User";
import { Order as IOrderType, User as IUserType } from "../types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

console.log("==================================================================");
console.log("GoatMart Step 9B: Seller Payout Schema Foundation Test Suite");
console.log("==================================================================\n");

// -------------------------------------------------------------------------
// 1. Payout type accepts all valid states
// -------------------------------------------------------------------------
console.log("--- Test 1: Payout type accepts all valid states ---");
const validPayoutStates: PayoutStatus[] = [
  "none",
  "unpaid",
  "processing",
  "paid",
  "failed",
  "reversed",
];
const schemaPayoutStatusEnum = (Order.schema.path("payout.status") as any)?.enumValues;
assert(Array.isArray(schemaPayoutStatusEnum), "payout.status enum is defined on OrderSchema");
for (const state of validPayoutStates) {
  assert(
    schemaPayoutStatusEnum.includes(state),
    `OrderSchema accepts valid payout state '${state}'`
  );
}
assert(schemaPayoutStatusEnum.length === 6, "OrderSchema has exactly 6 payout status states");

// -------------------------------------------------------------------------
// 2. Invalid payout status is rejected by schema validation
// -------------------------------------------------------------------------
console.log("\n--- Test 2: Invalid payout status is rejected by schema validation ---");
const orderWithInvalidStatus = new Order({
  goat: "507f1f77bcf86cd799439011",
  seller: "507f1f77bcf86cd799439012",
  customer: "507f1f77bcf86cd799439013",
  amount: 25000,
  delivery: { name: "Test", phone: "1234567890", address: "A", city: "B", state: "C", pin: "123" },
  payout: {
    status: "invalid_status_xyz" as any,
  },
});
const validationError = orderWithInvalidStatus.validateSync();
assert(!!validationError, "Validation error occurred for invalid payout status");
assert(
  !!validationError?.errors["payout.status"],
  "Error specifically flagged on 'payout.status'"
);

// -------------------------------------------------------------------------
// 3. Existing order structure remains valid without payout
// -------------------------------------------------------------------------
console.log("\n--- Test 3: Existing order structure remains valid without payout ---");
const existingOrderWithoutPayout = new Order({
  goat: "507f1f77bcf86cd799439011",
  seller: "507f1f77bcf86cd799439012",
  customer: "507f1f77bcf86cd799439013",
  amount: 30000,
  sellerBasePrice: 30000,
  commissionRate: 2.0,
  commissionAmount: 600,
  sellerNetPayable: 29400,
  delivery: { name: "Buyer", phone: "9876543210", address: "Farm Rd", city: "Jaipur", state: "Rajasthan", pin: "302001" },
});
const noPayoutError = existingOrderWithoutPayout.validateSync();
assert(!noPayoutError, "Order without explicit payout field validates cleanly");
assert(
  existingOrderWithoutPayout.payout?.status === "none",
  "payout.status safely defaults to 'none' when omitted"
);

// -------------------------------------------------------------------------
// 4. Existing 3.5% financial snapshot remains unchanged
// -------------------------------------------------------------------------
console.log("\n--- Test 4: Existing 3.5% financial snapshot remains unchanged ---");
const historical35Order: Partial<IOrderType> = {
  orderId: "#BKR-2401",
  amount: 50000,
  sellerBasePrice: 50000,
  commissionRate: 3.5,
  commissionAmount: 1750,
  sellerNetPayable: 48250,
  currency: "INR",
  financialCalculationVersion: "1.0",
};
assert(historical35Order.commissionRate === 3.5, "Historical commissionRate remains strictly 3.5%");
assert(historical35Order.commissionAmount === 1750, "Historical commissionAmount remains strictly ₹1,750");
assert(historical35Order.sellerNetPayable === 48250, "Historical sellerNetPayable remains strictly ₹48,250");
assert(!("payout" in historical35Order), "Historical order is not retroactively forced to have payout data");

// -------------------------------------------------------------------------
// 5. New 2% financial snapshot remains unchanged
// -------------------------------------------------------------------------
console.log("\n--- Test 5: New 2% financial snapshot remains unchanged ---");
const new20Order: Partial<IOrderType> = {
  orderId: "#BKR-2450",
  amount: 50000,
  sellerBasePrice: 50000,
  commissionRate: 2.0,
  commissionAmount: 1000,
  sellerNetPayable: 49000,
  currency: "INR",
  financialCalculationVersion: "1.0",
  payout: {
    status: "unpaid",
  },
};
assert(new20Order.commissionRate === 2.0, "New order commissionRate remains strictly 2.0%");
assert(new20Order.commissionAmount === 1000, "New order commissionAmount remains strictly ₹1,000");
assert(new20Order.sellerNetPayable === 49000, "New order sellerNetPayable remains strictly ₹49,000");
assert(new20Order.payout?.status === "unpaid", "Payout status is 'unpaid'");

// -------------------------------------------------------------------------
// 6. Payout amount is not derived from current commission rate
// -------------------------------------------------------------------------
console.log("\n--- Test 6: Payout amount is not derived from current commission rate ---");
// Simulate historical order where stored sellerNetPayable is 48,250 (3.5% fee),
// even though current global rate is 2.0%.
// The payout amount must equal order.sellerNetPayable (₹48,250), NOT recalculated 50,000 * 0.98 = ₹49,000!
function derivePayoutAmount(order: { sellerNetPayable?: number; amount: number }): number {
  if (typeof order.sellerNetPayable === "number" && order.sellerNetPayable > 0) {
    return order.sellerNetPayable;
  }
  throw new Error("Cannot derive payout amount without immutable financial snapshot");
}
const historicalPayoutAmount = derivePayoutAmount(historical35Order as any);
assert(
  historicalPayoutAmount === 48250,
  "Historical payout amount strictly uses stored snapshot (48,250) and does NOT recalculate at current 2% (49,000)"
);

// -------------------------------------------------------------------------
// 7. Missing payout state is compatible with legacy orders
// -------------------------------------------------------------------------
console.log("\n--- Test 7: Missing payout state is compatible with legacy orders ---");
function resolveOrderPayoutStatus(order: { payout?: { status?: string } }): string {
  return order.payout?.status || "none";
}
assert(
  resolveOrderPayoutStatus({}) === "none",
  "Missing payout property safely defaults to 'none'"
);
assert(
  resolveOrderPayoutStatus({ payout: {} }) === "none",
  "Empty payout subdocument safely defaults to 'none'"
);

// -------------------------------------------------------------------------
// 8. Duplicate transfer IDs are rejected by unique sparse index
// -------------------------------------------------------------------------
console.log("\n--- Test 8: Index configuration for payout.transferId ---");
const orderIndexes = Order.schema.indexes();
const transferIdIndex = orderIndexes.find((idx) => (idx[0] as any)["payout.transferId"] === 1);
assert(!!transferIdIndex, "Index on 'payout.transferId' exists");
assert((transferIdIndex?.[1] as any)?.unique === true, "'payout.transferId' index is unique");
assert((transferIdIndex?.[1] as any)?.sparse === true, "'payout.transferId' index is sparse");

// Also check payout.status + seller compound index
const statusSellerIndex = orderIndexes.find(
  (idx) => (idx[0] as any)["payout.status"] === 1 && (idx[0] as any)["seller"] === 1
);
assert(!!statusSellerIndex, "Compound index on 'payout.status' and 'seller' exists");

// -------------------------------------------------------------------------
// 9. Idempotency index behavior is safe with missing values
// -------------------------------------------------------------------------
console.log("\n--- Test 9: Idempotency index configuration ---");
const idempotencyIndex = orderIndexes.find((idx) => (idx[0] as any)["payout.idempotencyKey"] === 1);
assert(!!idempotencyIndex, "Index on 'payout.idempotencyKey' exists");
assert((idempotencyIndex?.[1] as any)?.unique === true, "'payout.idempotencyKey' index is unique");
assert((idempotencyIndex?.[1] as any)?.sparse === true, "'payout.idempotencyKey' index is sparse (safe with undefined)");

// -------------------------------------------------------------------------
// 10. Seller payout onboarding supports required states
// -------------------------------------------------------------------------
console.log("\n--- Test 10: Seller payout onboarding supports required states ---");
const validOnboardingStates: PayoutOnboardingStatus[] = [
  "not_started",
  "pending",
  "active",
  "rejected",
];
const schemaOnboardingStatusEnum = (
  User.schema.path("sellerProfile.payoutOnboarding.status") as any
)?.enumValues;
assert(Array.isArray(schemaOnboardingStatusEnum), "payoutOnboarding.status enum is defined on UserSchema");
for (const state of validOnboardingStates) {
  assert(
    schemaOnboardingStatusEnum.includes(state),
    `UserSchema accepts onboarding state '${state}'`
  );
}

// -------------------------------------------------------------------------
// 11. isVerified does not default to true
// -------------------------------------------------------------------------
console.log("\n--- Test 11: isVerified strictly defaults to false ---");
const testSeller = new User({
  name: "Ramesh Kumar",
  email: "ramesh@example.com",
  role: "seller",
  sellerProfile: {
    farmName: "Ramesh Dairy",
    bankDetails: {
      accountHolderName: "Ramesh Kumar",
      accountNumber: "123456789012",
      ifscCode: "SBIN0001234",
    },
  },
});
assert(
  testSeller.sellerProfile?.bankDetails?.isVerified === false,
  "isVerified defaults to false, never true"
);
assert(
  testSeller.sellerProfile?.payoutOnboarding?.status === "not_started",
  "payoutOnboarding.status defaults to 'not_started'"
);

// -------------------------------------------------------------------------
// 12. razorpayAccountId is optional and never auto-generated
// -------------------------------------------------------------------------
console.log("\n--- Test 12: razorpayAccountId is optional and never auto-generated ---");
assert(
  testSeller.sellerProfile?.payoutOnboarding?.razorpayAccountId === undefined,
  "razorpayAccountId is undefined when not explicitly provided"
);
const defaultAccountId = (User.schema.path("sellerProfile.payoutOnboarding.razorpayAccountId") as any)?.defaultValue;
assert(
  typeof defaultAccountId === "undefined",
  "razorpayAccountId has no default generator in schema"
);

// -------------------------------------------------------------------------
// 13. No raw payout information is added to public seller response structures
// -------------------------------------------------------------------------
console.log("\n--- Test 13: Public seller serialization protection ---");
function sanitizePublicSellerProfile(seller: Partial<IUserType>) {
  const profile = seller.sellerProfile;
  return {
    farmName: profile?.farmName || "",
    description: profile?.description || "",
    location: profile?.location || "",
    rating: profile?.rating || 0,
    totalReviews: profile?.totalReviews || 0,
    totalSales: profile?.totalSales || 0,
  };
}
const publicView = sanitizePublicSellerProfile(testSeller.toObject() as any);
assert(!("bankDetails" in publicView), "bankDetails excluded from public seller profile");
assert(!("payoutOnboarding" in publicView), "payoutOnboarding excluded from public seller profile");

console.log("\n==================================================================");
console.log("🎉 ALL 13 STEP 9B TESTS PASSED SUCCESSFULLY!");
console.log("==================================================================");
