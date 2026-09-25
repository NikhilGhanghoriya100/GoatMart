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
  generateOrderInvoiceData,
  renderInvoiceHtml,
} from "@/lib/financialDocuments";

/**
 * GET /api/documents/invoice/[orderId]
 * Generates an authoritative, bilingual (English & Hindi) Tax Invoice & Receipt for an order.
 * Strictly restricted to the customer who placed the order or platform administrators.
 * Financial values are sourced exclusively from the order's immutable financial snapshot.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return unauthorizedResponse("Authentication required to view order invoice");
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

    // Query order by MongoDB _id if valid ObjectId, or by public orderId string (e.g., #BKR-1234 or BKR-1234)
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

    // RBAC: Customer ownership or Admin role
    const isCustomer = order.customer?.toString() === user.id;
    const isAdmin = user.role === "admin";

    if (!isCustomer && !isAdmin) {
      return forbiddenResponse("Forbidden: You are not authorized to access this invoice");
    }

    // Populate seller details safely without exposing private bank details
    const seller = await User.findById(order.seller)
      .select("name email phone sellerProfile.farmName sellerProfile.location")
      .lean();

    // Populate customer details safely
    const customer = await User.findById(order.customer)
      .select("name email phone address")
      .lean();

    const invoiceData = generateOrderInvoiceData(order, customer, seller);

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format")?.toLowerCase();

    if (format === "json") {
      return NextResponse.json({
        success: true,
        data: invoiceData,
      });
    }

    const html = renderInvoiceHtml(invoiceData);
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("Order Invoice Generation Error:", error);
    return serverErrorResponse("Failed to generate order invoice");
  }
}
