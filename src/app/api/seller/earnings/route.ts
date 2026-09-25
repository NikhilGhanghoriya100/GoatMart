import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Order from "@/models/Order";
import {
  getAuthUser,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@/lib/security";
import { PLATFORM_COMMISSION_RATE } from "@/lib/commission";

/**
 * GET /api/seller/earnings
 * Authenticated seller-only endpoint to retrieve completed earnings and immutable financial snapshots.
 * Reconciles strictly from completed/paid sales without recalculating historical commission.
 */
export async function GET(_req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse("Authentication required to view seller earnings");

    // RBAC: Only authenticated sellers and admins may access seller earnings
    if (user.role !== "seller" && user.role !== "admin") {
      return forbiddenResponse("Only registered sellers can access seller earnings");
    }

    await connectDB();

    // Authoritative seller identity derived strictly from session
    const sellerId = user.id;

    // Strict criteria for completed sales contributing to seller earnings:
    // 1. Order belongs to this authenticated seller
    // 2. Payment is confirmed and paid
    // 3. Order is not cancelled or refunded
    const query = {
      seller: sellerId,
      "payment.status": "paid",
      status: { $nin: ["cancelled", "refunded"] },
    };

    const paidOrders = await Order.find(query)
      .select(
        "orderId goat goatName goatBreed goatImage createdAt status payment.status payment.paidAt payment.razorpayPaymentId sellerBasePrice commissionRate commissionAmount sellerNetPayable currency financialCalculationVersion financialCalculatedAt amount"
      )
      .sort({ "payment.paidAt": -1, createdAt: -1 })
      .lean();

    // Deterministic integer-paise aggregation to avoid floating-point drift
    let totalSalesPaise = 0;
    let totalCommissionPaise = 0;
    let totalNetEarningsPaise = 0;

    const sales = paidOrders.map((o: any) => {
      // Use stored immutable financial snapshot fields
      const basePrice =
        typeof o.sellerBasePrice === "number" ? o.sellerBasePrice : Number(o.amount) || 0;
      const commission =
        typeof o.commissionAmount === "number" ? o.commissionAmount : 0;
      const netPayable =
        typeof o.sellerNetPayable === "number"
          ? o.sellerNetPayable
          : basePrice - commission;

      totalSalesPaise += Math.round(basePrice * 100);
      totalCommissionPaise += Math.round(commission * 100);
      totalNetEarningsPaise += Math.round(netPayable * 100);

      return {
        id: o._id.toString(),
        orderId: o.orderId,
        goatId: o.goat?.toString(),
        goatName: o.goatName || "Goat Listing",
        goatBreed: o.goatBreed || "Standard",
        goatImage: o.goatImage || "",
        saleDate: o.payment?.paidAt || o.createdAt,
        sellerBasePrice: basePrice,
        commissionRate: typeof o.commissionRate === "number" ? o.commissionRate : PLATFORM_COMMISSION_RATE,
        commissionAmount: commission,
        sellerNetPayable: netPayable,
        currency: o.currency || "INR",
        paymentId: o.payment?.razorpayPaymentId || "",
        orderStatus: o.status,
      };
    });

    const summary = {
      totalSales: totalSalesPaise / 100,
      totalCommission: totalCommissionPaise / 100,
      totalNetEarnings: totalNetEarningsPaise / 100,
      completedSalesCount: sales.length,
      currency: "INR",
    };

    return NextResponse.json({
      success: true,
      data: {
        summary,
        sales,
      },
    });
  } catch (error) {
    console.error("Fetch seller earnings error:", error);
    return serverErrorResponse();
  }
}
