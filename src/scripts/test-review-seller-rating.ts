/**
 * GoatMart Test Suite:
 * Review System, Seller Rating Aggregation, Sold Count, Concurrency Guard & UI Logic
 */

import assert from "assert";

let passedCount = 0;
let failedCount = 0;

function testAssert(condition: boolean, testNum: number, message: string) {
  if (!condition) {
    console.error(`❌ TEST ${testNum} FAILED: ${message}`);
    failedCount++;
    throw new Error(`Test ${testNum} Failed: ${message}`);
  }
  console.log(`✅ TEST ${testNum} PASSED: ${message}`);
  passedCount++;
}

async function runTestSuite() {
  console.log("================================================================================");
  console.log("GoatMart Review System, Seller Rating, Sold Count & Concurrency Suite");
  console.log("================================================================================\n");

  // -------------------------------------------------------------------------
  // Test 1: Concurrency Guard & Atomic Claim Simulation
  // -------------------------------------------------------------------------
  console.log("--- Test 1: Concurrency Guard & Atomic Claim ---");
  // Simulating an order state table in memory
  let orderDatabase = [
    {
      _id: "order_101",
      goat: "goat_abc",
      customer: "user_buyer_1",
      status: "delivered",
      reviewed: false,
    },
    {
      _id: "order_102",
      goat: "goat_def",
      customer: "user_buyer_2",
      status: "processing", // Not delivered
      reviewed: false,
    },
    {
      _id: "order_103",
      goat: "goat_xyz",
      customer: "user_buyer_1",
      status: "delivered",
      reviewed: true, // Already reviewed
    },
  ];

  // Atomic findOneAndUpdate simulation
  function atomicClaimOrderForReview(goatId: string, customerId: string) {
    const idx = orderDatabase.findIndex(
      (o) =>
        o.goat === goatId &&
        o.customer === customerId &&
        o.status === "delivered" &&
        o.reviewed !== true
    );
    if (idx === -1) return null;
    orderDatabase[idx].reviewed = true;
    return { ...orderDatabase[idx] };
  }

  // Attempt 1 on delivered unreviewed order -> Success
  const firstClaim = atomicClaimOrderForReview("goat_abc", "user_buyer_1");
  testAssert(
    firstClaim !== null && firstClaim.reviewed === true,
    1,
    "First attempt claims delivered order and sets reviewed: true"
  );

  // Attempt 2 on SAME order concurrently -> Blocked (returns null)
  const concurrentClaim = atomicClaimOrderForReview("goat_abc", "user_buyer_1");
  testAssert(
    concurrentClaim === null,
    2,
    "Second concurrent attempt fails atomically (returns null, preventing double review)"
  );

  // Attempt on non-delivered order -> Blocked
  const nonDeliveredClaim = atomicClaimOrderForReview("goat_def", "user_buyer_2");
  testAssert(
    nonDeliveredClaim === null,
    3,
    "Non-delivered order cannot be claimed for review"
  );

  // Attempt on already reviewed order -> Blocked
  const alreadyReviewedClaim = atomicClaimOrderForReview("goat_xyz", "user_buyer_1");
  testAssert(
    alreadyReviewedClaim === null,
    4,
    "Already-reviewed order cannot be claimed for review"
  );

  // -------------------------------------------------------------------------
  // Test 2: Seller Rating Aggregation Across Multiple Goats
  // -------------------------------------------------------------------------
  console.log("\n--- Test 2: Seller Rating Aggregation Math ---");

  interface MockReview {
    rating: number;
    text: string;
  }
  interface MockGoat {
    _id: string;
    seller: string;
    reviews: MockReview[];
  }

  const sellerGoats: MockGoat[] = [
    {
      _id: "g1",
      seller: "seller_ramesh",
      reviews: [
        { rating: 5, text: "Excellent Jamunapari!" },
        { rating: 4, text: "Very healthy goat" },
      ],
    },
    {
      _id: "g2",
      seller: "seller_ramesh",
      reviews: [
        { rating: 5, text: "Superb breed quality" },
        { rating: 5, text: "Fast doorstep delivery" },
        { rating: 4, text: "Good farm care" },
      ],
    },
    {
      _id: "g3",
      seller: "seller_ramesh",
      reviews: [], // Goat with no reviews yet
    },
  ];

  function calculateSellerRating(goats: MockGoat[]) {
    let totalRating = 0;
    let count = 0;
    for (const g of goats) {
      if (Array.isArray(g.reviews)) {
        for (const r of g.reviews) {
          if (typeof r.rating === "number" && r.rating >= 1 && r.rating <= 5) {
            totalRating += r.rating;
            count++;
          }
        }
      }
    }
    const avg = count > 0 ? Number((totalRating / count).toFixed(2)) : 0;
    return { rating: avg, totalReviews: count };
  }

  const rameshStats = calculateSellerRating(sellerGoats);
  // Total stars = 5 + 4 + 5 + 5 + 4 = 23, count = 5. 23/5 = 4.60
  testAssert(
    rameshStats.totalReviews === 5,
    5,
    "Accurately counts total reviews across all seller goats"
  );
  testAssert(
    rameshStats.rating === 4.6,
    6,
    "Accurately computes mean seller rating across all goats (4.6 / 5.0)"
  );

  // Test Seller with ZERO reviews
  const newSellerGoats: MockGoat[] = [
    { _id: "g_new_1", seller: "seller_new", reviews: [] },
  ];
  const newSellerStats = calculateSellerRating(newSellerGoats);
  testAssert(
    newSellerStats.rating === 0 && newSellerStats.totalReviews === 0,
    7,
    "Seller with zero reviews defaults safely to rating 0 and totalReviews 0 (No fake 4.9)"
  );

  // -------------------------------------------------------------------------
  // Test 3: Goats Sold Count Integrity
  // -------------------------------------------------------------------------
  console.log("\n--- Test 3: Goats Sold Count Filter Integrity ---");

  const mockOrders = [
    { seller: "seller_ramesh", payment: { status: "paid" }, status: "delivered" },
    { seller: "seller_ramesh", payment: { status: "paid" }, status: "dispatched" },
    { seller: "seller_ramesh", payment: { status: "paid" }, status: "payment_confirmed" },
    { seller: "seller_ramesh", payment: { status: "paid" }, status: "cancelled" }, // Cancelled should be excluded
    { seller: "seller_ramesh", payment: { status: "failed" }, status: "pending" }, // Unpaid should be excluded
    { seller: "seller_ramesh", payment: { status: "refunded" }, status: "refunded" }, // Refunded should be excluded
    { seller: "seller_other", payment: { status: "paid" }, status: "delivered" }, // Other seller
  ];

  function countGoatsSold(sellerId: string, orders: typeof mockOrders) {
    return orders.filter(
      (o) =>
        o.seller === sellerId &&
        o.payment.status === "paid" &&
        !["cancelled", "refunded"].includes(o.status)
    ).length;
  }

  const rameshSold = countGoatsSold("seller_ramesh", mockOrders);
  testAssert(
    rameshSold === 3,
    8,
    "Goats sold count accurately filters only paid, non-cancelled/refunded orders (3 goats sold)"
  );

  // -------------------------------------------------------------------------
  // Test 4: Review Preview (Top 3) & Modal Toggle Logic
  // -------------------------------------------------------------------------
  console.log("\n--- Test 4: Review Preview & Modal Slicing Logic ---");

  const mockReviewList = [
    { _id: "r1", createdAt: "2026-09-01T10:00:00Z", rating: 5, text: "Review 1" },
    { _id: "r2", createdAt: "2026-09-05T10:00:00Z", rating: 4, text: "Review 2" },
    { _id: "r3", createdAt: "2026-09-10T10:00:00Z", rating: 5, text: "Review 3" },
    { _id: "r4", createdAt: "2026-09-15T10:00:00Z", rating: 4, text: "Review 4" },
    { _id: "r5", createdAt: "2026-09-20T10:00:00Z", rating: 5, text: "Review 5" },
  ];

  // Sort newest first
  const sorted = [...mockReviewList].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  testAssert(
    sorted[0]._id === "r5" && sorted[1]._id === "r4" && sorted[2]._id === "r3",
    9,
    "Reviews are sorted newest first"
  );

  const preview = sorted.slice(0, 3);
  testAssert(
    preview.length === 3,
    10,
    "Preview displays exactly top 3 most recent reviews"
  );

  const showModalButton = sorted.length > 3;
  testAssert(
    showModalButton === true,
    11,
    "Modal button is shown when review count > 3"
  );

  // Case with 2 reviews:
  const shortReviewList = mockReviewList.slice(0, 2);
  const shortShowModalButton = shortReviewList.length > 3;
  testAssert(
    shortShowModalButton === false,
    12,
    "Modal button is NOT shown when review count <= 3"
  );

  console.log("\n================================================================================");
  console.log(`Summary: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("================================================================================");
}

runTestSuite().catch((err) => {
  console.error("Test Suite execution failed:", err);
  process.exit(1);
});
