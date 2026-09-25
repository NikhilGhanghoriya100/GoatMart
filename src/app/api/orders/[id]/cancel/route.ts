import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import {
  getAuthUser,
  isValidObjectId,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  badRequestResponse,
  serverErrorResponse,
  sanitizeString,
  checkRateLimit,
  tooManyRequestsResponse,
} from "@/lib/security";
import { cancelAndRefundOrder } from "@/lib/orderCancellation";

/**
 * POST /api/orders/[id]/cancel
 * Authoritative endpoint for order cancellation and automatic refund processing.
 * Strictly verifies user ownership and eligibility on the server.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return unauthorizedResponse("Authentication required to cancel an order");
    }

    // Rate limiting: 3 cancellation attempts per user per minute
    const rateCheck = checkRateLimit(`cancel:${user.id}`, 3, 60000);
    if (!rateCheck.allowed) {
      return tooManyRequestsResponse("Too many cancellation requests. Please try again later.");
    }

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return notFoundResponse("Order not found");
    }

    let reason: string | undefined;
    try {
      const body = await req.json();
      if (body && typeof body.reason === "string") {
        reason = sanitizeString(body.reason);
      }
    } catch {
      // Body is optional
    }

    await connectDB();

    const result = await cancelAndRefundOrder({
      orderId: id,
      userId: user.id,
      userRole: user.role,
      reason,
    });

    if (!result.success) {
      switch (result.code) {
        case "ORDER_NOT_FOUND":
          return notFoundResponse(result.error);
        case "UNAUTHORIZED":
          return forbiddenResponse(result.error);
        case "ALREADY_CANCELLED":
        case "ALREADY_REFUNDED":
        case "NOT_ELIGIBLE":
        case "REFUND_IN_PROGRESS":
          return badRequestResponse(result.error || "Order is not eligible for cancellation");
        case "CONCURRENT_MODIFICATION":
          return NextResponse.json(
            { success: false, error: result.error, code: "CONCURRENT_MODIFICATION" },
            { status: 409 }
          );
        case "REFUND_FAILED":
          return NextResponse.json(
            { success: false, error: result.error, code: "REFUND_FAILED" },
            { status: 502 }
          );
        default:
          return serverErrorResponse(result.error);
      }
    }

    const o = result.order;
    return NextResponse.json({
      success: true,
      message: result.message,
      data: {
        orderId: o?.orderId,
        status: o?.status,
        paymentStatus: o?.payment?.status,
        refundInitiated: result.refundInitiated,
        refundId: result.refundId,
        refundAmount: result.refundAmount,
        cancellation: o?.cancellation,
        refund: o?.refund,
      },
    });
  } catch (error: any) {
    console.error("Order cancellation endpoint error:", error);
    return serverErrorResponse();
  }
}
