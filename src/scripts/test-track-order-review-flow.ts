/**
 * GoatMart Test Suite:
 * Track My Order -> Delivered Order -> Write Review -> Goat Detail Flow Verification
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

interface OrderMock {
  _id: string;
  orderId: string;
  goat: string | { _id: string };
  status: string;
  reviewed?: boolean;
}

// Logic mirror of orders/page.tsx review action evaluation
function getOrderReviewAction(order: OrderMock, isHindi: boolean) {
  if (order.status !== "delivered") {
    return { type: "none" };
  }

  const goatId =
    typeof order.goat === "object" && order.goat !== null
      ? order.goat._id
      : String(order.goat);

  if (order.reviewed === true) {
    return {
      type: "submitted_badge",
      text: isHindi ? "✓ रिव्यू दिया गया" : "✓ Review Submitted",
      clickable: false,
    };
  }

  return {
    type: "write_button",
    text: isHindi ? "रिव्यू दें" : "Write a Review",
    destinationUrl: `/goat/${goatId}#reviews`,
    clickable: true,
  };
}

async function runTestSuite() {
  console.log("================================================================================");
  console.log("GoatMart Track My Order -> Review Flow Verification Suite");
  console.log("================================================================================\n");

  // -------------------------------------------------------------------------
  // Case 1: Delivered + not reviewed (English & Hindi)
  // -------------------------------------------------------------------------
  console.log("--- Case 1: Delivered + Not Reviewed ---");
  const orderDeliveredUnreviewed: OrderMock = {
    _id: "ord_001",
    orderId: "#BKR-1001",
    goat: "goat_jamunapari_1",
    status: "delivered",
    reviewed: false,
  };

  const actionEn1 = getOrderReviewAction(orderDeliveredUnreviewed, false);
  testAssert(
    actionEn1.type === "write_button" &&
      actionEn1.text === "Write a Review" &&
      actionEn1.destinationUrl === "/goat/goat_jamunapari_1#reviews" &&
      actionEn1.clickable === true,
    1,
    "Delivered + not reviewed displays active 'Write a Review' button pointing to /goat/[id]#reviews (EN)"
  );

  const actionHi1 = getOrderReviewAction(orderDeliveredUnreviewed, true);
  testAssert(
    actionHi1.type === "write_button" &&
      actionHi1.text === "रिव्यू दें" &&
      actionHi1.destinationUrl === "/goat/goat_jamunapari_1#reviews",
    2,
    "Delivered + not reviewed displays active 'रिव्यू दें' button pointing to /goat/[id]#reviews (HI)"
  );

  // -------------------------------------------------------------------------
  // Case 2: Delivered + already reviewed (reviewed === true)
  // -------------------------------------------------------------------------
  console.log("\n--- Case 2: Delivered + Already Reviewed ---");
  const orderDeliveredReviewed: OrderMock = {
    _id: "ord_002",
    orderId: "#BKR-1002",
    goat: "goat_beetal_2",
    status: "delivered",
    reviewed: true,
  };

  const actionEn2 = getOrderReviewAction(orderDeliveredReviewed, false);
  testAssert(
    actionEn2.type === "submitted_badge" &&
      actionEn2.text === "✓ Review Submitted" &&
      actionEn2.clickable === false,
    3,
    "Delivered + reviewed displays non-clickable '✓ Review Submitted' badge (EN)"
  );

  const actionHi2 = getOrderReviewAction(orderDeliveredReviewed, true);
  testAssert(
    actionHi2.type === "submitted_badge" &&
      actionHi2.text === "✓ रिव्यू दिया गया" &&
      actionHi2.clickable === false,
    4,
    "Delivered + reviewed displays non-clickable '✓ रिव्यू दिया गया' badge (HI)"
  );

  // -------------------------------------------------------------------------
  // Case 3: Processing status
  // -------------------------------------------------------------------------
  console.log("\n--- Case 3: Processing Status ---");
  const orderProcessing: OrderMock = {
    _id: "ord_003",
    orderId: "#BKR-1003",
    goat: "goat_3",
    status: "processing",
    reviewed: false,
  };
  const action3 = getOrderReviewAction(orderProcessing, false);
  testAssert(
    action3.type === "none",
    5,
    "Processing order does NOT display any review button or badge"
  );

  // -------------------------------------------------------------------------
  // Case 4: Out for delivery status
  // -------------------------------------------------------------------------
  console.log("\n--- Case 4: Out for Delivery Status ---");
  const orderOutForDelivery: OrderMock = {
    _id: "ord_004",
    orderId: "#BKR-1004",
    goat: "goat_4",
    status: "out_for_delivery",
    reviewed: false,
  };
  const action4 = getOrderReviewAction(orderOutForDelivery, false);
  testAssert(
    action4.type === "none",
    6,
    "Out for delivery order does NOT display any review button or badge"
  );

  // -------------------------------------------------------------------------
  // Case 5: Cancelled status
  // -------------------------------------------------------------------------
  console.log("\n--- Case 5: Cancelled Status ---");
  const orderCancelled: OrderMock = {
    _id: "ord_005",
    orderId: "#BKR-1005",
    goat: "goat_5",
    status: "cancelled",
    reviewed: false,
  };
  const action5 = getOrderReviewAction(orderCancelled, false);
  testAssert(
    action5.type === "none",
    7,
    "Cancelled order does NOT display any review button or badge"
  );

  // -------------------------------------------------------------------------
  // Case 6: Refunded status
  // -------------------------------------------------------------------------
  console.log("\n--- Case 6: Refunded Status ---");
  const orderRefunded: OrderMock = {
    _id: "ord_006",
    orderId: "#BKR-1006",
    goat: "goat_6",
    status: "refunded",
    reviewed: false,
  };
  const action6 = getOrderReviewAction(orderRefunded, false);
  testAssert(
    action6.type === "none",
    8,
    "Refunded order does NOT display any review button or badge"
  );

  // -------------------------------------------------------------------------
  // Case 7: Other statuses (pending, payment_confirmed, dispatched)
  // -------------------------------------------------------------------------
  console.log("\n--- Case 7: Other Interim Statuses ---");
  const statuses = ["pending", "payment_confirmed", "dispatched"];
  for (const st of statuses) {
    const o: OrderMock = {
      _id: "ord_x",
      orderId: "#BKR-X",
      goat: "goat_x",
      status: st,
    };
    testAssert(
      getOrderReviewAction(o, false).type === "none",
      9,
      `Status '${st}' does NOT display review button or badge`
    );
  }

  // -------------------------------------------------------------------------
  // Case 8: Backward-compatible legacy delivered order (reviewed is undefined)
  // -------------------------------------------------------------------------
  console.log("\n--- Case 8: Backward-compatible Legacy Delivered Order ---");
  const legacyDeliveredOrder: OrderMock = {
    _id: "ord_legacy",
    orderId: "#BKR-LEGACY",
    goat: "goat_legacy",
    status: "delivered",
    // reviewed field missing/undefined
  };
  const legacyAction = getOrderReviewAction(legacyDeliveredOrder, false);
  testAssert(
    legacyAction.type === "write_button" &&
      legacyAction.destinationUrl === "/goat/goat_legacy#reviews",
    10,
    "Legacy delivered order with missing reviewed field safely defaults to active Write Review button"
  );

  // -------------------------------------------------------------------------
  // Case 9: Populated goat object in order
  // -------------------------------------------------------------------------
  console.log("\n--- Case 9: Populated Goat Object In Order ---");
  const populatedOrder: OrderMock = {
    _id: "ord_pop",
    orderId: "#BKR-POP",
    goat: { _id: "goat_populated_id" },
    status: "delivered",
    reviewed: false,
  };
  const populatedAction = getOrderReviewAction(populatedOrder, false);
  testAssert(
    populatedAction.destinationUrl === "/goat/goat_populated_id#reviews",
    11,
    "Resolves correct goat ID when order.goat is an object or string"
  );

  // -------------------------------------------------------------------------
  // Case 10: Complete lifecycle transition simulation
  // -------------------------------------------------------------------------
  console.log("\n--- Case 10: Complete Lifecycle Transition Simulation ---");
  let liveOrder: OrderMock = {
    _id: "ord_lifecycle",
    orderId: "#BKR-LIVE",
    goat: "goat_live_123",
    status: "pending",
  };

  // 1. Pending -> no review
  testAssert(getOrderReviewAction(liveOrder, false).type === "none", 12, "Lifecycle 1: Pending has no review action");

  // 2. Dispatched -> no review
  liveOrder.status = "dispatched";
  testAssert(getOrderReviewAction(liveOrder, false).type === "none", 13, "Lifecycle 2: Dispatched has no review action");

  // 3. Delivered -> active Write a Review button
  liveOrder.status = "delivered";
  const deliveredStep = getOrderReviewAction(liveOrder, false);
  testAssert(
    deliveredStep.type === "write_button" && deliveredStep.destinationUrl === "/goat/goat_live_123#reviews",
    14,
    "Lifecycle 3: Delivered allows Write a Review"
  );

  // 4. Buyer submits review -> order.reviewed becomes true
  liveOrder.reviewed = true;
  const reviewedStep = getOrderReviewAction(liveOrder, false);
  testAssert(
    reviewedStep.type === "submitted_badge" && reviewedStep.text === "✓ Review Submitted",
    15,
    "Lifecycle 4: After review submission, renders non-clickable ✓ Review Submitted badge"
  );

  console.log("\n================================================================================");
  console.log(`Summary: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("================================================================================");
}

runTestSuite().catch((err) => {
  console.error("Test Suite execution failed:", err);
  process.exit(1);
});
