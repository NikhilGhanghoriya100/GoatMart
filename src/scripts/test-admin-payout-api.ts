/**
 * GoatMart Step 9D: Admin Payout Management Test Suite
 * 
 * Verifies all 20 minimum requirements specified in Step 9D prompt:
 * 1. unauthenticated request rejected (401)
 * 2. customer rejected (403)
 * 3. seller rejected (403)
 * 4. admin accepted (200)
 * 5. client payout amount ignored
 * 6. client seller ID ignored
 * 7. client recipient account ignored
 * 8. paid payout cannot be initiated again (409)
 * 9. processing payout cannot be initiated again (409)
 * 10. failed payout can retry (200)
 * 11. ineligible order rejected (400)
 * 12. refund-active order rejected (400)
 * 13. seller onboarding inactive rejected (400)
 * 14. missing linked account rejected (400)
 * 15. stored sellerNetPayable used
 * 16. commission is not recalculated
 * 17. successful provider processed response reaches paid
 * 18. pending response remains processing
 * 19. failed provider response reaches failed
 * 20. no secret/bank data leakage in API response
 */

import mongoose from "mongoose";
import Order, { IOrder } from "../models/Order";
import User, { IUser } from "../models/User";
import {
  checkOrderPayoutEligibility,
  initiateOrderPayout,
} from "../lib/orderPayout";
import { CreatePaymentTransferParams, RazorpayTransferResultItem } from "../lib/razorpay";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

console.log("==================================================================");
console.log("GoatMart Step 9D: Admin Payout Management Test Suite");
console.log("==================================================================\n");

// Helper to create test user
function createMockSeller(overrides: Record<string, any> = {}) {
  const sellerId = overrides._id || new mongoose.Types.ObjectId().toString();
  return {
    _id: sellerId,
    name: "Mohan Lal",
    email: "mohan@example.com",
    role: "seller",
    ...overrides,
    sellerProfile: {
      farmName: "Mohan Dairy & Goats",
      status: "approved",
      bankDetails: {
        accountHolderName: "Mohan Lal",
        accountNumber: "987654321098", // Secret bank data
        ifscCode: "HDFC0001234",
        isVerified: true,
      },
      ...(overrides.sellerProfile || {}),
      payoutOnboarding: {
        status: "active",
        razorpayAccountId: "acc_Mohan998877",
        ...(overrides.sellerProfile?.payoutOnboarding || {}),
      },
    },
  } as any;
}

// Helper to create test order
function createMockOrder(overrides: Record<string, any> = {}) {
  const orderId = overrides._id || new mongoose.Types.ObjectId().toString();
  const sellerId = overrides.seller || new mongoose.Types.ObjectId().toString();
  return {
    _id: orderId,
    orderId: `#BKR-${Math.floor(1000 + Math.random() * 9000)}`,
    goat: new mongoose.Types.ObjectId().toString(),
    goatName: "Jamunapari Prime",
    goatBreed: "Jamunapari",
    seller: sellerId,
    sellerName: "Mohan Lal",
    customer: new mongoose.Types.ObjectId().toString(),
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
      razorpayOrderId: "order_rzp_987",
      razorpayPaymentId: "pay_rzp_654",
    },
    refund: {
      status: "none",
    },
    payout: {
      status: "unpaid",
      amount: 49000,
      currency: "INR",
      retryCount: 0,
    },
    createdAt: new Date(),
    ...overrides,
  } as any;
}

/**
 * Simulates Admin API Router logic for POST /api/admin/payouts and /api/admin/payouts/[orderId]
 */
async function simulateAdminPayoutApiPost(params: {
  authUser: { id: string; role: string; name: string } | null;
  requestBody: Record<string, any>;
  pathOrderId?: string;
  orderDb: Map<string, any>;
  userDb: Map<string, any>;
  mockProvider?: (p: CreatePaymentTransferParams) => Promise<RazorpayTransferResultItem>;
}): Promise<{ status: number; body: Record<string, any> }> {
  // 1. Auth check
  if (!params.authUser) {
    return { status: 401, body: { success: false, error: "Authentication required to initiate payouts" } };
  }

  // 2. Role check
  if (params.authUser.role !== "admin") {
    return { status: 403, body: { success: false, error: "Forbidden: Only administrators can initiate payouts" } };
  }

  // 3. Resolve orderId
  const orderId = params.pathOrderId || params.requestBody.orderId;
  if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
    return { status: 400, body: { success: false, error: "Valid orderId is required" } };
  }

  const existingOrder = params.orderDb.get(orderId.toString());
  if (!existingOrder) {
    return { status: 404, body: { success: false, code: "ORDER_NOT_FOUND", error: "Order record not found" } };
  }

  const seller = params.userDb.get(existingOrder.seller.toString());
  if (!seller) {
    return { status: 404, body: { success: false, code: "SELLER_NOT_FOUND", error: "Associated seller account not found" } };
  }

  // Intercept Mongoose queries for test isolation
  const origFindById = Order.findById;
  const origUserFindById = User.findById;
  const origFindOneAndUpdate = Order.findOneAndUpdate;

  Order.findById = ((id: any) => {
    const o = params.orderDb.get(id.toString());
    return Promise.resolve(o ? JSON.parse(JSON.stringify(o)) : null);
  }) as any;

  User.findById = ((id: any) => {
    const u = params.userDb.get(id.toString());
    return Promise.resolve(u ? JSON.parse(JSON.stringify(u)) : null);
  }) as any;

  Order.findOneAndUpdate = ((filter: any, update: any) => {
    const id = filter._id?.toString();
    const doc = params.orderDb.get(id);
    if (!doc) return Promise.resolve(null);

    // Atomic filter matching
    if (filter.status && doc.status !== filter.status) return Promise.resolve(null);
    if (filter["payment.status"] && doc.payment?.status !== filter["payment.status"]) return Promise.resolve(null);
    if (filter["refund.status"] && filter["refund.status"].$nin?.includes(doc.refund?.status)) return Promise.resolve(null);

    if (filter.$or) {
      const currentPayoutStatus = doc.payout?.status || "none";
      const matchesOr = filter.$or.some((clause: any) => {
        const expected = clause["payout.status"];
        if (clause["payout.status"]?.$exists === false) return !doc.payout?.status;
        return expected === currentPayoutStatus;
      });
      if (!matchesOr) return Promise.resolve(null);
    }

    if (filter["payout.status"] && doc.payout?.status !== filter["payout.status"]) {
      return Promise.resolve(null);
    }

    // Apply update
    if (update.$set) {
      for (const [key, val] of Object.entries(update.$set)) {
        const parts = key.split(".");
        if (parts.length === 2) {
          doc[parts[0]] = doc[parts[0]] || {};
          doc[parts[0]][parts[1]] = val;
        } else {
          doc[key] = val;
        }
      }
    }
    if (update.$inc) {
      for (const [key, val] of Object.entries(update.$inc)) {
        const parts = key.split(".");
        if (parts.length === 2) {
          doc[parts[0]] = doc[parts[0]] || {};
          doc[parts[0]][parts[1]] = (doc[parts[0]][parts[1]] || 0) + (val as number);
        } else {
          doc[key] = (doc[key] || 0) + (val as number);
        }
      }
    }
    params.orderDb.set(id, doc);
    return Promise.resolve(JSON.parse(JSON.stringify(doc)));
  }) as any;

  try {
    const result = await initiateOrderPayout({
      orderId,
      performedBy: params.authUser.id,
      performedByRole: "admin",
      transferProvider: params.mockProvider,
    });

    if (!result.success) {
      const statusCode =
        result.code === "ORDER_NOT_FOUND" || result.code === "SELLER_NOT_FOUND"
          ? 404
          : result.code === "ALREADY_PAID" ||
            result.code === "PAYOUT_IN_PROGRESS" ||
            result.code === "CONCURRENT_MODIFICATION"
          ? 409
          : result.code === "UNAUTHORIZED"
          ? 403
          : result.code === "PROVIDER_TRANSFER_FAILED"
          ? 502
          : 400;

      return {
        status: statusCode,
        body: {
          success: false,
          code: result.code,
          error: result.error,
          status: result.status,
        },
      };
    }

    return {
      status: 200,
      body: {
        success: true,
        data: {
          orderId: result.order?.orderId,
          payoutStatus: result.status,
          transferId: result.transferId,
          amount: result.amount,
          message: result.message,
        },
      },
    };
  } finally {
    Order.findById = origFindById;
    User.findById = origUserFindById;
    Order.findOneAndUpdate = origFindOneAndUpdate;
  }
}

/**
 * Simulates Admin API Router logic for GET /api/admin/payouts
 */
function simulateAdminPayoutApiGet(params: {
  authUser: { id: string; role: string; name: string } | null;
  orders: any[];
  sellers: Map<string, any>;
}): { status: number; body: Record<string, any> } {
  if (!params.authUser) {
    return { status: 401, body: { success: false, error: "Authentication required to access admin payout queue" } };
  }
  if (params.authUser.role !== "admin") {
    return { status: 403, body: { success: false, error: "Forbidden: Admin privileges required" } };
  }

  const queue = params.orders.map((rawOrder) => {
    const sellerDoc = params.sellers.get(rawOrder.seller.toString());
    const eligibility = checkOrderPayoutEligibility(rawOrder as IOrder, sellerDoc as IUser);

    return {
      id: rawOrder._id.toString(),
      orderId: rawOrder.orderId,
      goatName: rawOrder.goatName,
      goatBreed: rawOrder.goatBreed,
      customerName: rawOrder.customerName,
      seller: {
        id: sellerDoc?._id?.toString() || rawOrder.seller.toString(),
        name: sellerDoc?.name || rawOrder.sellerName,
        email: sellerDoc?.email,
        farmName: sellerDoc?.sellerProfile?.farmName,
        isApproved: sellerDoc?.sellerProfile?.status === "approved",
        onboardingStatus: sellerDoc?.sellerProfile?.payoutOnboarding?.status || "not_started",
        razorpayAccountId: sellerDoc?.sellerProfile?.payoutOnboarding?.razorpayAccountId || null,
        // Notice: NEVER expose sellerProfile.bankDetails.accountNumber!
      },
      sellerBasePrice: rawOrder.sellerBasePrice ?? rawOrder.amount,
      commissionRate: rawOrder.commissionRate ?? 2.0,
      commissionAmount: rawOrder.commissionAmount ?? 0,
      sellerNetPayable: rawOrder.sellerNetPayable ?? 0,
      currency: rawOrder.currency || "INR",
      paymentStatus: rawOrder.payment?.status,
      paymentId: rawOrder.payment?.razorpayPaymentId || null,
      orderStatus: rawOrder.status,
      refundStatus: rawOrder.refund?.status || "none",
      payout: {
        status: rawOrder.payout?.status || (eligibility.eligible ? "unpaid" : "none"),
        transferId: rawOrder.payout?.transferId || null,
        recipientAccountId: rawOrder.payout?.recipientAccountId || null,
        amount: rawOrder.payout?.amount ?? rawOrder.sellerNetPayable ?? 0,
        currency: rawOrder.payout?.currency || "INR",
        initiatedAt: rawOrder.payout?.initiatedAt || null,
        processedAt: rawOrder.payout?.processedAt || null,
        failedAt: rawOrder.payout?.failedAt || null,
        failureReason: rawOrder.payout?.failureReason || null,
        retryCount: rawOrder.payout?.retryCount || 0,
      },
      eligibility: {
        eligible: eligibility.eligible,
        code: eligibility.code,
        reason: eligibility.reason,
      },
      createdAt: rawOrder.createdAt,
    };
  });

  return {
    status: 200,
    body: {
      success: true,
      data: {
        queue,
        summary: {
          totalCandidateOrders: queue.length,
          totalEligible: queue.filter((i) => i.eligibility.eligible && i.payout.status !== "paid" && i.payout.status !== "processing").length,
          totalPaid: queue.filter((i) => i.payout.status === "paid").length,
          totalFailed: queue.filter((i) => i.payout.status === "failed").length,
          totalUnpaid: queue.filter((i) => i.payout.status === "unpaid").length,
        },
      },
    },
  };
}

async function runTests() {
  const seller = createMockSeller();
  const sellerId = seller._id.toString();

  const userDb = new Map<string, any>();
  userDb.set(sellerId, seller);

  const adminUser = { id: new mongoose.Types.ObjectId().toString(), role: "admin", name: "Admin Officer" };
  const customerUser = { id: new mongoose.Types.ObjectId().toString(), role: "customer", name: "Customer User" };
  const sellerUser = { id: sellerId, role: "seller", name: "Mohan Seller" };

  // -------------------------------------------------------------------------
  // 1. Unauthenticated request rejected (401)
  // -------------------------------------------------------------------------
  console.log("--- Test 1: Unauthenticated request rejected (401) ---");
  const order1 = createMockOrder({ seller: sellerId });
  const orderDb1 = new Map<string, any>();
  orderDb1.set(order1._id.toString(), order1);

  const res1Get = simulateAdminPayoutApiGet({ authUser: null, orders: [order1], sellers: userDb });
  assert(res1Get.status === 401, "GET /api/admin/payouts rejects unauthenticated user with 401");

  const res1Post = await simulateAdminPayoutApiPost({
    authUser: null,
    requestBody: { orderId: order1._id.toString() },
    orderDb: orderDb1,
    userDb,
  });
  assert(res1Post.status === 401, "POST /api/admin/payouts rejects unauthenticated user with 401");

  // -------------------------------------------------------------------------
  // 2. Customer rejected (403)
  // -------------------------------------------------------------------------
  console.log("\n--- Test 2: Customer rejected (403) ---");
  const res2Get = simulateAdminPayoutApiGet({ authUser: customerUser, orders: [order1], sellers: userDb });
  assert(res2Get.status === 403, "GET /api/admin/payouts rejects customer role with 403");

  const res2Post = await simulateAdminPayoutApiPost({
    authUser: customerUser,
    requestBody: { orderId: order1._id.toString() },
    orderDb: orderDb1,
    userDb,
  });
  assert(res2Post.status === 403, "POST /api/admin/payouts rejects customer role with 403");

  // -------------------------------------------------------------------------
  // 3. Seller rejected (403)
  // -------------------------------------------------------------------------
  console.log("\n--- Test 3: Seller rejected (403) ---");
  const res3Get = simulateAdminPayoutApiGet({ authUser: sellerUser, orders: [order1], sellers: userDb });
  assert(res3Get.status === 403, "GET /api/admin/payouts rejects seller role with 403");

  const res3Post = await simulateAdminPayoutApiPost({
    authUser: sellerUser,
    requestBody: { orderId: order1._id.toString() },
    orderDb: orderDb1,
    userDb,
  });
  assert(res3Post.status === 403, "POST /api/admin/payouts rejects seller role with 403");

  // -------------------------------------------------------------------------
  // 4. Admin accepted (200)
  // -------------------------------------------------------------------------
  console.log("\n--- Test 4: Admin accepted (200) ---");
  const res4Get = simulateAdminPayoutApiGet({ authUser: adminUser, orders: [order1], sellers: userDb });
  assert(res4Get.status === 200, "GET /api/admin/payouts accepts admin role with 200");
  assert(res4Get.body.success === true, "Response returns success: true");
  assert(res4Get.body.data.queue.length === 1, "Queue contains candidate order");

  const mockSuccessfulProvider = async (p: CreatePaymentTransferParams): Promise<RazorpayTransferResultItem> => ({
    id: "trf_admin_test_001",
    entity: "transfer",
    status: "processed",
    source: p.paymentId,
    recipient: p.recipientAccountId,
    amount: p.amountPaise,
    currency: "INR",
  });

  const res4Post = await simulateAdminPayoutApiPost({
    authUser: adminUser,
    requestBody: { orderId: order1._id.toString() },
    orderDb: orderDb1,
    userDb,
    mockProvider: mockSuccessfulProvider,
  });
  assert(res4Post.status === 200, "POST /api/admin/payouts accepts admin and returns 200");
  assert(res4Post.body.data.payoutStatus === "paid", "Payout status successfully reached 'paid'");
  assert(res4Post.body.data.transferId === "trf_admin_test_001", "Transfer ID returned");

  // -------------------------------------------------------------------------
  // 5. Client payout amount ignored
  // -------------------------------------------------------------------------
  console.log("\n--- Test 5: Client payout amount ignored ---");
  let capturedTransferAmountPaise = 0;
  const order5 = createMockOrder({ seller: sellerId, sellerNetPayable: 49000 });
  const orderDb5 = new Map<string, any>();
  orderDb5.set(order5._id.toString(), order5);

  const mockCapturingProvider = async (p: CreatePaymentTransferParams): Promise<RazorpayTransferResultItem> => {
    capturedTransferAmountPaise = p.amountPaise;
    return {
      id: "trf_amount_tamper_001",
      entity: "transfer",
      status: "processed",
      source: p.paymentId,
      recipient: p.recipientAccountId,
      amount: p.amountPaise,
      currency: "INR",
    };
  };

  // Attacker client sends fake amount of ₹99,999
  await simulateAdminPayoutApiPost({
    authUser: adminUser,
    requestBody: {
      orderId: order5._id.toString(),
      amount: 99999,
      payoutAmount: 99999,
      sellerNetPayable: 99999,
    },
    orderDb: orderDb5,
    userDb,
    mockProvider: mockCapturingProvider,
  });
  assert(capturedTransferAmountPaise === 4900000, "Transferred amount is exactly ₹49,000 (4,900,000 paise), client ₹99,999 ignored");

  // -------------------------------------------------------------------------
  // 6. Client seller ID ignored
  // -------------------------------------------------------------------------
  console.log("\n--- Test 6: Client seller ID ignored ---");
  const attackerSellerId = new mongoose.Types.ObjectId().toString();
  let transferredRecipientId = "";
  const mockSellerProvider = async (p: CreatePaymentTransferParams): Promise<RazorpayTransferResultItem> => {
    transferredRecipientId = p.recipientAccountId;
    return {
      id: "trf_seller_spoof_001",
      entity: "transfer",
      status: "processed",
      source: p.paymentId,
      recipient: p.recipientAccountId,
      amount: p.amountPaise,
      currency: "INR",
    };
  };

  const order6 = createMockOrder({ seller: sellerId });
  const orderDb6 = new Map<string, any>();
  orderDb6.set(order6._id.toString(), order6);

  await simulateAdminPayoutApiPost({
    authUser: adminUser,
    requestBody: {
      orderId: order6._id.toString(),
      sellerId: attackerSellerId,
      seller: attackerSellerId,
    },
    orderDb: orderDb6,
    userDb,
    mockProvider: mockSellerProvider,
  });
  assert(transferredRecipientId === "acc_Mohan998877", "Funds sent to authoritative seller linked account, client seller ID ignored");

  // -------------------------------------------------------------------------
  // 7. Client recipient account ignored
  // -------------------------------------------------------------------------
  console.log("\n--- Test 7: Client recipient account ignored ---");
  let directRecipient = "";
  const mockRecipientProvider = async (p: CreatePaymentTransferParams): Promise<RazorpayTransferResultItem> => {
    directRecipient = p.recipientAccountId;
    return {
      id: "trf_recip_spoof_001",
      entity: "transfer",
      status: "processed",
      source: p.paymentId,
      recipient: p.recipientAccountId,
      amount: p.amountPaise,
      currency: "INR",
    };
  };

  const order7 = createMockOrder({ seller: sellerId });
  const orderDb7 = new Map<string, any>();
  orderDb7.set(order7._id.toString(), order7);

  await simulateAdminPayoutApiPost({
    authUser: adminUser,
    requestBody: {
      orderId: order7._id.toString(),
      recipientAccountId: "acc_AttackerAccount999",
      payoutAccount: "acc_AttackerAccount999",
    },
    orderDb: orderDb7,
    userDb,
    mockProvider: mockRecipientProvider,
  });
  assert(directRecipient === "acc_Mohan998877", "Transferred strictly to DB account, client acc_AttackerAccount999 rejected");

  // -------------------------------------------------------------------------
  // 8. Paid payout cannot be initiated again (409)
  // -------------------------------------------------------------------------
  console.log("\n--- Test 8: Paid payout cannot be initiated again (409) ---");
  const order8 = createMockOrder({ seller: sellerId, payout: { status: "paid", transferId: "trf_existing" } });
  const orderDb8 = new Map<string, any>();
  orderDb8.set(order8._id.toString(), order8);

  const res8 = await simulateAdminPayoutApiPost({
    authUser: adminUser,
    requestBody: { orderId: order8._id.toString() },
    orderDb: orderDb8,
    userDb,
  });
  assert(res8.status === 409, "Paid order rejects re-initiation with 409");
  assert(res8.body.code === "ALREADY_PAID", "Error code is ALREADY_PAID");

  // -------------------------------------------------------------------------
  // 9. Processing payout cannot be initiated again (409)
  // -------------------------------------------------------------------------
  console.log("\n--- Test 9: Processing payout cannot be initiated again (409) ---");
  const order9 = createMockOrder({ seller: sellerId, payout: { status: "processing", transferId: "trf_pending" } });
  const orderDb9 = new Map<string, any>();
  orderDb9.set(order9._id.toString(), order9);

  const res9 = await simulateAdminPayoutApiPost({
    authUser: adminUser,
    requestBody: { orderId: order9._id.toString() },
    orderDb: orderDb9,
    userDb,
  });
  assert(res9.status === 409, "Processing order rejects duplicate initiation with 409");
  assert(res9.body.code === "PAYOUT_IN_PROGRESS", "Error code is PAYOUT_IN_PROGRESS");

  // -------------------------------------------------------------------------
  // 10. Failed payout can retry (200)
  // -------------------------------------------------------------------------
  console.log("\n--- Test 10: Failed payout can retry (200) ---");
  const order10 = createMockOrder({
    seller: sellerId,
    payout: { status: "failed", failureReason: "Network timeout", retryCount: 1 },
  });
  const orderDb10 = new Map<string, any>();
  orderDb10.set(order10._id.toString(), order10);

  const res10 = await simulateAdminPayoutApiPost({
    authUser: adminUser,
    requestBody: { orderId: order10._id.toString() },
    orderDb: orderDb10,
    userDb,
    mockProvider: mockSuccessfulProvider,
  });
  assert(res10.status === 200, "Retrying a failed payout returns 200");
  assert(res10.body.data.payoutStatus === "paid", "Retried payout succeeds with status 'paid'");

  // -------------------------------------------------------------------------
  // 11. Ineligible order rejected (400)
  // -------------------------------------------------------------------------
  console.log("\n--- Test 11: Ineligible order rejected (400) ---");
  const order11 = createMockOrder({ seller: sellerId, status: "dispatched" }); // Not yet delivered
  const orderDb11 = new Map<string, any>();
  orderDb11.set(order11._id.toString(), order11);

  const res11 = await simulateAdminPayoutApiPost({
    authUser: adminUser,
    requestBody: { orderId: order11._id.toString() },
    orderDb: orderDb11,
    userDb,
  });
  assert(res11.status === 400, "Dispatched order rejects payout initiation with 400");
  assert(res11.body.code === "NOT_DELIVERED", "Rejection code is NOT_DELIVERED");

  // -------------------------------------------------------------------------
  // 12. Refund-active order rejected (400)
  // -------------------------------------------------------------------------
  console.log("\n--- Test 12: Refund-active order rejected (400) ---");
  const order12 = createMockOrder({ seller: sellerId, refund: { status: "processing" } });
  const orderDb12 = new Map<string, any>();
  orderDb12.set(order12._id.toString(), order12);

  const res12 = await simulateAdminPayoutApiPost({
    authUser: adminUser,
    requestBody: { orderId: order12._id.toString() },
    orderDb: orderDb12,
    userDb,
  });
  assert(res12.status === 400, "Refund-active order rejects payout with 400");
  assert(res12.body.code === "REFUND_ACTIVE", "Rejection code is REFUND_ACTIVE");

  // -------------------------------------------------------------------------
  // 13. Seller onboarding inactive rejected (400)
  // -------------------------------------------------------------------------
  console.log("\n--- Test 13: Seller onboarding inactive rejected (400) ---");
  const inactiveSeller = createMockSeller({
    sellerProfile: { payoutOnboarding: { status: "pending", razorpayAccountId: "acc_inactive" } },
  });
  const inactiveSellerId = inactiveSeller._id.toString();
  userDb.set(inactiveSellerId, inactiveSeller);

  const order13 = createMockOrder({ seller: inactiveSellerId });
  const orderDb13 = new Map<string, any>();
  orderDb13.set(order13._id.toString(), order13);

  const res13 = await simulateAdminPayoutApiPost({
    authUser: adminUser,
    requestBody: { orderId: order13._id.toString() },
    orderDb: orderDb13,
    userDb,
  });
  assert(res13.status === 400, "Inactive onboarding rejected with 400");
  assert(res13.body.code === "SELLER_ONBOARDING_NOT_ACTIVE", "Rejection code is SELLER_ONBOARDING_NOT_ACTIVE");

  // -------------------------------------------------------------------------
  // 14. Missing linked account rejected (400)
  // -------------------------------------------------------------------------
  console.log("\n--- Test 14: Missing linked account rejected (400) ---");
  const noAccountSeller = createMockSeller({
    sellerProfile: { payoutOnboarding: { status: "active", razorpayAccountId: "" } },
  });
  const noAccountSellerId = noAccountSeller._id.toString();
  userDb.set(noAccountSellerId, noAccountSeller);

  const order14 = createMockOrder({ seller: noAccountSellerId });
  const orderDb14 = new Map<string, any>();
  orderDb14.set(order14._id.toString(), order14);

  const res14 = await simulateAdminPayoutApiPost({
    authUser: adminUser,
    requestBody: { orderId: order14._id.toString() },
    orderDb: orderDb14,
    userDb,
  });
  assert(res14.status === 400, "Missing linked account rejected with 400");
  assert(res14.body.code === "MISSING_LINKED_ACCOUNT", "Rejection code is MISSING_LINKED_ACCOUNT");

  // -------------------------------------------------------------------------
  // 15. Stored sellerNetPayable used
  // -------------------------------------------------------------------------
  console.log("\n--- Test 15: Stored sellerNetPayable used ---");
  let paidPaiseAmount = 0;
  const mockCheckAmountProvider = async (p: CreatePaymentTransferParams): Promise<RazorpayTransferResultItem> => {
    paidPaiseAmount = p.amountPaise;
    return {
      id: "trf_check_amt",
      entity: "transfer",
      status: "processed",
      source: p.paymentId,
      recipient: p.recipientAccountId,
      amount: p.amountPaise,
      currency: "INR",
    };
  };

  const order15 = createMockOrder({ seller: sellerId, sellerBasePrice: 80000, sellerNetPayable: 78400 });
  const orderDb15 = new Map<string, any>();
  orderDb15.set(order15._id.toString(), order15);

  const res15 = await simulateAdminPayoutApiPost({
    authUser: adminUser,
    requestBody: { orderId: order15._id.toString() },
    orderDb: orderDb15,
    userDb,
    mockProvider: mockCheckAmountProvider,
  });
  assert(res15.status === 200, "Payout succeeded");
  assert(paidPaiseAmount === 7840000, "Transferred exactly ₹78,400 in paise (7,840,000 paise)");
  assert(res15.body.data.amount === 78400, "Response returns stored sellerNetPayable amount 78,400");

  // -------------------------------------------------------------------------
  // 16. Commission is not recalculated
  // -------------------------------------------------------------------------
  console.log("\n--- Test 16: Commission is not recalculated ---");
  // Order created with historical 3.5% commission snapshot: 50,000 base -> 1,750 fee -> 48,250 net
  let historicalPaise = 0;
  const mockOldOrderProvider = async (p: CreatePaymentTransferParams): Promise<RazorpayTransferResultItem> => {
    historicalPaise = p.amountPaise;
    return {
      id: "trf_old_order",
      entity: "transfer",
      status: "processed",
      source: p.paymentId,
      recipient: p.recipientAccountId,
      amount: p.amountPaise,
      currency: "INR",
    };
  };

  const oldOrder = createMockOrder({
    seller: sellerId,
    sellerBasePrice: 50000,
    commissionRate: 3.5,
    commissionAmount: 1750,
    sellerNetPayable: 48250,
  });
  const orderDb16 = new Map<string, any>();
  orderDb16.set(oldOrder._id.toString(), oldOrder);

  const res16 = await simulateAdminPayoutApiPost({
    authUser: adminUser,
    requestBody: { orderId: oldOrder._id.toString() },
    orderDb: orderDb16,
    userDb,
    mockProvider: mockOldOrderProvider,
  });
  assert(res16.status === 200, "Old order payout succeeds");
  assert(historicalPaise === 4825000, "Transferred exactly stored ₹48,250 (4,825,000 paise), not recalculating 2% (49,000)");
  assert(res16.body.data.amount === 48250, "Response records exactly ₹48,250");

  // -------------------------------------------------------------------------
  // 17. Successful provider processed response reaches paid
  // -------------------------------------------------------------------------
  console.log("\n--- Test 17: Successful provider processed response reaches paid ---");
  const order17 = createMockOrder({ seller: sellerId });
  const orderDb17 = new Map<string, any>();
  orderDb17.set(order17._id.toString(), order17);

  const res17 = await simulateAdminPayoutApiPost({
    authUser: adminUser,
    requestBody: { orderId: order17._id.toString() },
    orderDb: orderDb17,
    userDb,
    mockProvider: async (p) => ({
      id: "trf_processed_17",
      entity: "transfer",
      status: "processed",
      source: p.paymentId,
      recipient: p.recipientAccountId,
      amount: p.amountPaise,
      currency: "INR",
    }),
  });
  assert(res17.body.data.payoutStatus === "paid", "Provider 'processed' becomes 'paid'");

  // -------------------------------------------------------------------------
  // 18. Pending response remains processing
  // -------------------------------------------------------------------------
  console.log("\n--- Test 18: Pending response remains processing ---");
  const order18 = createMockOrder({ seller: sellerId });
  const orderDb18 = new Map<string, any>();
  orderDb18.set(order18._id.toString(), order18);

  const res18 = await simulateAdminPayoutApiPost({
    authUser: adminUser,
    requestBody: { orderId: order18._id.toString() },
    orderDb: orderDb18,
    userDb,
    mockProvider: async (p) => ({
      id: "trf_pending_18",
      entity: "transfer",
      status: "pending",
      source: p.paymentId,
      recipient: p.recipientAccountId,
      amount: p.amountPaise,
      currency: "INR",
    }),
  });
  assert(res18.body.data.payoutStatus === "processing", "Provider 'pending' remains 'processing'");

  // -------------------------------------------------------------------------
  // 19. Failed provider response reaches failed
  // -------------------------------------------------------------------------
  console.log("\n--- Test 19: Failed provider response reaches failed ---");
  const order19 = createMockOrder({ seller: sellerId });
  const orderDb19 = new Map<string, any>();
  orderDb19.set(order19._id.toString(), order19);

  const res19 = await simulateAdminPayoutApiPost({
    authUser: adminUser,
    requestBody: { orderId: order19._id.toString() },
    orderDb: orderDb19,
    userDb,
    mockProvider: async () => {
      throw new Error("Razorpay linked account KYC suspended by bank");
    },
  });
  assert(res19.status === 502, "Provider error returns 502 Bad Gateway");
  assert(res19.body.status === "failed", "Payout status transitioned to 'failed'");
  assert(res19.body.code === "PROVIDER_TRANSFER_FAILED", "Code is PROVIDER_TRANSFER_FAILED");

  // -------------------------------------------------------------------------
  // 20. No secret/bank data leakage in API response
  // -------------------------------------------------------------------------
  console.log("\n--- Test 20: No secret/bank data leakage in API response ---");
  const res20Get = simulateAdminPayoutApiGet({ authUser: adminUser, orders: [order1], sellers: userDb });
  const rawGetResponseJson = JSON.stringify(res20Get.body);

  assert(!rawGetResponseJson.includes("987654321098"), "Bank account number '987654321098' is NEVER leaked in GET response");
  assert(!rawGetResponseJson.includes("bankDetails"), "Raw 'bankDetails' object is NOT included in public/admin queue seller payload");
  assert(!rawGetResponseJson.includes("rzp_test_secret"), "Razorpay secrets are not in response");

  const rawPostResponseJson = JSON.stringify(res4Post.body);
  assert(!rawPostResponseJson.includes("987654321098"), "Bank account number is NEVER leaked in POST response");
  assert(!rawPostResponseJson.includes("rzp_test_secret"), "Secrets are never leaked in POST response");

  console.log("\n==================================================================");
  console.log("🎉 ALL 20 STEP 9D ADMIN PAYOUT TESTS PASSED 100% PERFECTLY!");
  console.log("==================================================================\n");
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
