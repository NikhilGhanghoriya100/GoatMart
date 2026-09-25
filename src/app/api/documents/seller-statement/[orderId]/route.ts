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
  generateSellerStatementData,
  renderSellerStatementHtml,
} from "@/lib/financialDocuments";

/**
 * GET /api/documents/seller-statement/[orderId]
 * Generates an authoritative, bilingual Seller Settlement Statement for an order.
 * Strictly restricted to the seller who owns the order or platform administrators.
 * Consumes the stored immutable financial snapshot without recalculating commission.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return unauthorizedResponse("Authentication required to view seller settlement statement");
    }

    const rawOrderId = (await context.params)?.orderId;
    if (!rawOrderId) {
      return notFoundResponse("Order ID is required");
    }

    let decodedOrderId = rawOrderId;
    try {
      decodedOrderId = decodeURIComponent(rawOrderId).trim();
    } catch {
      decodedOrderId = rawOrderId.trim();
    }

    await connectDB();

    const withHash = decodedOrderId.startsWith("#") ? decodedOrderId : `#${decodedOrderId}`;
    const withoutHash = decodedOrderId.replace(/^#+/, "");

    const queryOr: any[] = [
      { orderId: decodedOrderId },
      { orderId: withHash },
      { orderId: withoutHash },
    ];

    if (mongoose.Types.ObjectId.isValid(decodedOrderId)) {
      queryOr.push({ _id: decodedOrderId });
    }

    const order = await Order.findOne({ $or: queryOr }).lean();
    if (!order) {
      return notFoundResponse("Order record not found");
    }

    // RBAC: Seller ownership or Admin role
    const isSeller = order.seller?.toString() === user.id;
    const isAdmin = user.role === "admin";

    if (!isSeller && !isAdmin) {
      return forbiddenResponse("Forbidden: You are not authorized to access this seller settlement statement");
    }

    const seller = await User.findById(order.seller)
      .select("name email phone sellerProfile.farmName sellerProfile.location")
      .lean();

    const customer = await User.findById(order.customer)
      .select("name delivery address")
      .lean();

    const statementData = generateSellerStatementData(order, seller, customer);

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format")?.toLowerCase();

    if (format === "json") {
      return NextResponse.json({
        success: true,
        data: statementData,
      });
    }

    const html = renderSellerStatementHtml(statementData);
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("Seller Settlement Statement Error:", error);
    return serverErrorResponse("Failed to generate seller settlement statement");
  }
}
