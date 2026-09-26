import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Order, { IOrder } from "@/models/Order";
import User, { IUser } from "@/models/User";
import {
  getAuthUser,
  isValidObjectId,
  unauthorizedResponse,
  forbiddenResponse,
  badRequestResponse,
  serverErrorResponse,
  checkRateLimit,
  tooManyRequestsResponse,
} from "@/lib/security";
import {
  checkOrderPayoutEligibility,
  initiateOrderPayout,
  recordManualOrderPayout,
} from "@/lib/orderPayout";
import { sanitizeSellerPaymentDetails } from "@/lib/paymentDetails";

/**
 * GET /api/admin/payouts
 * Returns the payout queue and summary statistics for administrators.
 * Evaluates real-time eligibility for each order without modifying any database records.
 * Never exposes raw bank credentials or unmasked secret data.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return unauthorizedResponse("Authentication required to access admin payout queue");
    }

    if (user.role !== "admin") {
      return forbiddenResponse("Forbidden: Admin privileges required");
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");
    const searchQuery = searchParams.get("search")?.toLowerCase().trim();

    // Query candidate orders:
    // 1. Orders with an existing payout subdocument status
    // 2. Orders with payment status === "paid" (potential payout candidates)
    const baseQuery: any = {
      $or: [
        { "payout.status": { $in: ["unpaid", "processing", "paid", "failed", "reversed"] } },
        { "payment.status": "paid" },
      ],
    };

    if (statusFilter && ["unpaid", "processing", "paid", "failed", "reversed"].includes(statusFilter)) {
      baseQuery["payout.status"] = statusFilter;
    }

    const candidateOrders = await Order.find(baseQuery)
      .populate({
        path: "seller",
        select:
          "name email phone sellerProfile.farmName sellerProfile.status sellerProfile.paymentDetails sellerProfile.bankDetails sellerProfile.payoutOnboarding.status sellerProfile.payoutOnboarding.razorpayAccountId",
      })
      .sort({ "payout.initiatedAt": -1, createdAt: -1 })
      .lean();

    let totalEligible = 0;
    let totalUnpaid = 0;
    let totalProcessing = 0;
    let totalPaid = 0;
    let totalFailed = 0;
    let totalPaidAmount = 0;
    let totalPendingAmount = 0;

    const queue = candidateOrders.map((rawOrder: any) => {
      const sellerDoc = rawOrder.seller as any;
      const eligibility = checkOrderPayoutEligibility(
        rawOrder as IOrder,
        sellerDoc as IUser | null
      );

      const payoutStatus = rawOrder.payout?.status || (eligibility.eligible ? "unpaid" : "none");
      const sellerNetPayable = rawOrder.sellerNetPayable ?? 0;

      // Aggregate summary metrics
      if (payoutStatus === "paid") {
        totalPaid++;
        totalPaidAmount += sellerNetPayable;
      } else if (payoutStatus === "processing") {
        totalProcessing++;
        totalPendingAmount += sellerNetPayable;
      } else if (payoutStatus === "failed") {
        totalFailed++;
        totalPendingAmount += sellerNetPayable;
      } else if (payoutStatus === "unpaid") {
        totalUnpaid++;
        totalPendingAmount += sellerNetPayable;
      }

      if (
        eligibility.eligible &&
        payoutStatus !== "paid" &&
        payoutStatus !== "processing"
      ) {
        totalEligible++;
      }

      return {
        id: rawOrder._id.toString(),
        orderId: rawOrder.orderId,
        goatName: rawOrder.goatName,
        goatBreed: rawOrder.goatBreed,
        customerName: rawOrder.customerName,
        seller: {
          id: sellerDoc?._id?.toString() || rawOrder.seller?.toString() || "",
          name: sellerDoc?.name || rawOrder.sellerName || "Unknown Seller",
          email: sellerDoc?.email || "",
          phone: sellerDoc?.phone || sellerDoc?.sellerProfile?.paymentDetails?.phone || "",
          farmName: sellerDoc?.sellerProfile?.farmName || "N/A",
          isApproved: sellerDoc?.sellerProfile?.status === "approved",
          paymentDetails: sanitizeSellerPaymentDetails(sellerDoc?.sellerProfile?.paymentDetails, sellerDoc?.phone),
          onboardingStatus: sellerDoc?.sellerProfile?.payoutOnboarding?.status || "not_started",
          razorpayAccountId: sellerDoc?.sellerProfile?.payoutOnboarding?.razorpayAccountId || null,
        },
        sellerBasePrice: rawOrder.sellerBasePrice ?? rawOrder.amount,
        deliveryCharge: rawOrder.deliveryCharge ?? 0,
        sellerDeliveryAmount: rawOrder.sellerDeliveryAmount ?? (rawOrder.deliveryCharge ?? 0),
        sellerGoatNet: rawOrder.sellerGoatNet ?? (rawOrder.sellerBasePrice ? rawOrder.sellerBasePrice - (rawOrder.commissionAmount ?? 0) : rawOrder.amount),
        commissionRate: rawOrder.commissionRate ?? 2.0,
        commissionAmount: rawOrder.commissionAmount ?? 0,
        sellerNetPayable,
        currency: rawOrder.currency || "INR",
        paymentStatus: rawOrder.payment?.status || "none",
        paymentId: rawOrder.payment?.razorpayPaymentId || null,
        orderStatus: rawOrder.status,
        refundStatus: rawOrder.refund?.status || "none",
        payout: {
          status: payoutStatus,
          transferId: rawOrder.payout?.transferId || null,
          recipientAccountId: rawOrder.payout?.recipientAccountId || null,
          amount: rawOrder.payout?.amount ?? sellerNetPayable,
          currency: rawOrder.payout?.currency || rawOrder.currency || "INR",
          idempotencyKey: rawOrder.payout?.idempotencyKey || null,
          initiatedAt: rawOrder.payout?.initiatedAt || null,
          processedAt: rawOrder.payout?.processedAt || null,
          failedAt: rawOrder.payout?.failedAt || null,
          failureReason: rawOrder.payout?.failureReason || null,
          retryCount: rawOrder.payout?.retryCount || 0,
          isManual: rawOrder.payout?.isManual ?? false,
          payoutMethod: rawOrder.payout?.payoutMethod || null,
          referenceId: rawOrder.payout?.referenceId || rawOrder.payout?.utrNumber || rawOrder.payout?.transferId || null,
          utrNumber: rawOrder.payout?.utrNumber || rawOrder.payout?.referenceId || null,
          paidAt: rawOrder.payout?.paidAt || null,
          paidByName: rawOrder.payout?.paidByName || null,
          adminNote: rawOrder.payout?.adminNote || null,
        },
        eligibility: {
          eligible: eligibility.eligible,
          code: eligibility.code,
          reason: eligibility.reason,
        },
        createdAt: rawOrder.createdAt,
      };
    });

    // Optional in-memory filtering for search & "eligible" status
    let filteredQueue = queue;

    if (statusFilter === "eligible") {
      filteredQueue = filteredQueue.filter(
        (item) =>
          item.eligibility.eligible &&
          item.payout.status !== "paid" &&
          item.payout.status !== "processing"
      );
    }

    if (searchQuery) {
      filteredQueue = filteredQueue.filter(
        (item) =>
          item.orderId.toLowerCase().includes(searchQuery) ||
          item.seller.name.toLowerCase().includes(searchQuery) ||
          item.seller.farmName.toLowerCase().includes(searchQuery) ||
          item.customerName?.toLowerCase().includes(searchQuery) ||
          item.goatName?.toLowerCase().includes(searchQuery) ||
          item.payout.transferId?.toLowerCase().includes(searchQuery)
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        queue: filteredQueue,
        summary: {
          totalCandidateOrders: queue.length,
          totalEligible,
          totalUnpaid,
          totalProcessing,
          totalPaid,
          totalFailed,
          totalPaidAmount,
          totalPendingAmount,
        },
      },
    });
  } catch (error: any) {
    console.error("Admin Payout Queue Error:", error);
    return serverErrorResponse("Failed to load admin payout queue");
  }
}

/**
 * POST /api/admin/payouts
 * Initiates an authoritative seller payout for an eligible order.
 * Strictly restricted to admins.
 * Never accepts client-provided amounts, commission rates, or account numbers.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return unauthorizedResponse("Authentication required to initiate payouts");
    }

    if (user.role !== "admin") {
      return forbiddenResponse("Forbidden: Only administrators can initiate payouts");
    }

    // Rate limiting: 10 payout initiations per admin per minute
    const rateCheck = checkRateLimit(`payout_initiate:${user.id}`, 10, 60000);
    if (!rateCheck.allowed) {
      return tooManyRequestsResponse("Too many payout requests. Please wait before retrying.");
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return badRequestResponse("Invalid JSON request body");
    }

    const { orderId } = body;
    if (!orderId || !isValidObjectId(orderId)) {
      return badRequestResponse("Valid orderId is required");
    }

    await connectDB();

    // Check if admin is recording an external manual payout
    if (body.referenceId || body.utrNumber || body.payoutMethod || body.isManual) {
      const manualResult = await recordManualOrderPayout({
        orderId,
        performedBy: user.id,
        performedByName: user.name || "Admin",
        payoutMethod: body.payoutMethod === "UPI" ? "UPI" : "BANK",
        referenceId: body.referenceId || body.utrNumber,
        amount: body.amount !== undefined ? Number(body.amount) : 0,
        paidAt: body.paidAt,
        adminNote: body.adminNote || body.note,
      });

      if (!manualResult.success) {
        const statusCode =
          manualResult.code === "ORDER_NOT_FOUND"
            ? 404
            : manualResult.code === "ALREADY_PAID" ||
              manualResult.code === "CONCURRENT_MODIFICATION"
            ? 409
            : manualResult.code === "UNAUTHORIZED"
            ? 403
            : 400;

        return NextResponse.json(
          {
            success: false,
            code: manualResult.code,
            error: manualResult.error,
            status: manualResult.status,
          },
          { status: statusCode }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          orderId: manualResult.order?.orderId,
          payoutStatus: manualResult.status,
          transferId: manualResult.referenceId,
          referenceId: manualResult.referenceId,
          amount: manualResult.amount,
          message: manualResult.message,
        },
      });
    }

    // Otherwise, call automated/fallback Step 9C payout engine
    // All financial amounts, seller IDs, and account IDs are resolved server-side from DB
    const result = await initiateOrderPayout({
      orderId,
      performedBy: user.id,
      performedByRole: "admin",
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

      return NextResponse.json(
        {
          success: false,
          code: result.code,
          error: result.error,
          status: result.status,
        },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: result.order?.orderId,
        payoutStatus: result.status,
        transferId: result.transferId,
        amount: result.amount,
        message: result.message,
      },
    });
  } catch (error: any) {
    console.error("Admin Initiate Payout Error:", error);
    return serverErrorResponse("An unexpected error occurred while initiating payout");
  }
}
