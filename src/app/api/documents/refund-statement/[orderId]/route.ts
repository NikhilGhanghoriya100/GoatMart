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
  generateRefundStatementData,
  renderRefundStatementHtml,
} from "@/lib/financialDocuments";

/**
 * GET /api/documents/refund-statement/[orderId]
 * Generates an authoritative, bilingual (English & Hindi) Cancellation & Refund Statement.
 * Strictly restricted to the customer who placed the order, the seller, or platform administrators.
 * Financial values are sourced exclusively from the order's immutable financial snapshot and refund breakdown.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return unauthorizedResponse("Authentication required to view refund statement");
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

    // RBAC: Customer ownership, Seller of order, or Admin role
    const isCustomer = order.customer?.toString() === user.id;
    const isSeller = order.seller?.toString() === user.id;
    const isAdmin = user.role === "admin";

    if (!isCustomer && !isSeller && !isAdmin) {
      return forbiddenResponse("Forbidden: You are not authorized to access this refund statement");
    }

    // Populate seller details safely
    const seller = await User.findById(order.seller)
      .select("name email phone sellerProfile.farmName sellerProfile.location")
      .lean();

    // Populate customer details safely
    const customer = await User.findById(order.customer)
      .select("name email phone address")
      .lean();

    const refundData = generateRefundStatementData(order, customer, seller);

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format")?.toLowerCase();

    if (format === "json") {
      return NextResponse.json({
        success: true,
        data: refundData,
      });
    }

    const html = renderRefundStatementHtml(refundData);
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("Refund Statement Generation Error:", error);
    return serverErrorResponse("Failed to generate refund statement");
  }
}
