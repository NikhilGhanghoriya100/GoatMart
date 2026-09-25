import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import Order from "@/models/Order";
import User from "@/models/User";
import {
  getAuthUser,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/security";
import {
  generatePayoutReceiptData,
  renderPayoutReceiptHtml,
} from "@/lib/financialDocuments";

/**
 * GET /api/documents/payout-receipt/[orderId]
 * Generates an authoritative, bilingual Seller Payout Disbursement Receipt for an order.
 * Strictly restricted to the seller who owns the order or platform administrators.
 * Shows verified disbursement details without exposing private bank credentials or secrets.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return unauthorizedResponse("Authentication required to view payout disbursement receipt");
    }

    const { orderId } = await context.params;
    if (!orderId) {
      return notFoundResponse("Order ID is required");
    }

    await connectDB();

    let orderQuery: any = { orderId };
    if (mongoose.Types.ObjectId.isValid(orderId)) {
      orderQuery = {
        $or: [{ _id: orderId }, { orderId }],
      };
    }

    const order = await Order.findOne(orderQuery).lean();
    if (!order) {
      return notFoundResponse("Order record not found");
    }

    // RBAC: Seller ownership or Admin role
    const isSeller = order.seller?.toString() === user.id;
    const isAdmin = user.role === "admin";

    if (!isSeller && !isAdmin) {
      return forbiddenResponse("Forbidden: You are not authorized to access this payout receipt");
    }

    const seller = await User.findById(order.seller)
      .select("name email phone sellerProfile.farmName")
      .lean();

    const receiptData = generatePayoutReceiptData(order, seller);

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format")?.toLowerCase();

    if (format === "json") {
      return NextResponse.json({
        success: true,
        data: receiptData,
      });
    }

    const html = renderPayoutReceiptHtml(receiptData);
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("Payout Disbursement Receipt Error:", error);
    return serverErrorResponse("Failed to generate payout disbursement receipt");
  }
}
