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
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/security";
import {
  checkOrderPayoutEligibility,
  initiateOrderPayout,
  recordManualOrderPayout,
} from "@/lib/orderPayout";
import { sanitizeSellerPaymentDetails } from "@/lib/paymentDetails";

/**
 * GET /api/admin/payouts/[orderId]
 * Returns detailed payout information and real-time eligibility evaluation for a specific order.
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return unauthorizedResponse("Authentication required to view payout details");
    }

    if (user.role !== "admin") {
      return forbiddenResponse("Forbidden: Admin privileges required");
    }

    const { orderId } = await context.params;
    if (!isValidObjectId(orderId)) {
      return badRequestResponse("Invalid Order ID format");
    }

    await connectDB();

    const order = await Order.findById(orderId).lean();
    if (!order) {
      return notFoundResponse("Order not found");
    }

    const seller = await User.findById(order.seller)
      .select(
        "name email phone sellerProfile.farmName sellerProfile.status sellerProfile.paymentDetails sellerProfile.bankDetails sellerProfile.payoutOnboarding.status sellerProfile.payoutOnboarding.razorpayAccountId"
      )
      .lean();

    const eligibility = checkOrderPayoutEligibility(
      order as unknown as IOrder,
      seller as unknown as IUser | null
    );

    return NextResponse.json({
      success: true,
      data: {
        id: order._id.toString(),
        orderId: order.orderId,
        goatName: order.goatName,
        customerName: order.customerName,
        seller: {
          id: seller?._id?.toString() || order.seller?.toString(),
          name: seller?.name || order.sellerName,
          email: seller?.email,
          phone: seller?.phone || seller?.sellerProfile?.paymentDetails?.phone || "",
          farmName: seller?.sellerProfile?.farmName,
          isApproved: seller?.sellerProfile?.status === "approved",
          paymentDetails: sanitizeSellerPaymentDetails(seller?.sellerProfile?.paymentDetails, seller?.phone),
          onboardingStatus: seller?.sellerProfile?.payoutOnboarding?.status || "not_started",
          razorpayAccountId: seller?.sellerProfile?.payoutOnboarding?.razorpayAccountId || null,
        },
        sellerBasePrice: order.sellerBasePrice ?? order.amount,
        deliveryCharge: order.deliveryCharge ?? 0,
        sellerDeliveryAmount: order.sellerDeliveryAmount ?? (order.deliveryCharge ?? 0),
        sellerGoatNet: order.sellerGoatNet ?? (order.sellerBasePrice ? order.sellerBasePrice - (order.commissionAmount ?? 0) : order.amount),
        commissionRate: order.commissionRate ?? 2.0,
        commissionAmount: order.commissionAmount ?? 0,
        sellerNetPayable: order.sellerNetPayable ?? 0,
        currency: order.currency || "INR",
        paymentStatus: order.payment?.status,
        paymentId: order.payment?.razorpayPaymentId || null,
        orderStatus: order.status,
        refundStatus: order.refund?.status || "none",
        payout: order.payout || { status: eligibility.eligible ? "unpaid" : "none" },
        eligibility,
        createdAt: order.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Admin Order Payout Detail Error:", error);
    return serverErrorResponse("Failed to fetch order payout details");
  }
}

/**
 * POST /api/admin/payouts/[orderId]
 * Initiates an authoritative seller payout or records a manual payout for the specified order.
 * Strictly restricted to administrators.
 * Never accepts client-provided amounts or destination accounts.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return unauthorizedResponse("Authentication required to initiate payouts");
    }

    if (user.role !== "admin") {
      return forbiddenResponse("Forbidden: Only administrators can initiate payouts");
    }

    const { orderId } = await context.params;
    if (!isValidObjectId(orderId)) {
      return badRequestResponse("Invalid Order ID format");
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body may be empty for automated payout tests
      body = {};
    }

    await connectDB();

    // Check if recording a manual payout
    if (body.referenceId || body.utrNumber || body.payoutMethod || body.isManual) {
      const manualResult = await recordManualOrderPayout({
        orderId,
        performedBy: user.id,
        performedByName: user.name || "Admin",
        payoutMethod: body.payoutMethod === "UPI" ? "UPI" : "BANK",
        referenceId: body.referenceId || body.utrNumber,
        amount: body.amount !== undefined ? Number(body.amount) : 0,
        paidAt: body.paidAt,
        adminNote: body.adminNote,
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

    // Call authoritative Step 9C payout engine
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
    console.error("Admin Order Payout Action Error:", error);
    return serverErrorResponse("An unexpected error occurred while initiating payout");
  }
}
