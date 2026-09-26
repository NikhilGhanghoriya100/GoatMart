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

    // Strict criteria for realized seller earnings:
    // 1. Order belongs to this authenticated seller
    // 2. Seller payout has been completed and marked as "paid" by admin
    // 3. Order is not cancelled or refunded
    const query = {
      seller: sellerId,
      "payout.status": "paid",
      status: { $nin: ["cancelled", "refunded"] },
    };

    const settledOrders = await Order.find(query)
      .select(
        "orderId goat goatName goatBreed goatImage createdAt status payment.status payment.paidAt payment.razorpayPaymentId sellerBasePrice commissionRate commissionAmount sellerNetPayable payout currency financialCalculationVersion financialCalculatedAt amount"
      )
      .sort({ "payout.paidAt": -1, createdAt: -1 })
      .lean();

    // Deterministic integer-paise aggregation to avoid floating-point drift
    let totalSalesPaise = 0;
    let totalCommissionPaise = 0;
    let totalNetEarningsPaise = 0;

    const sales = settledOrders.map((o: any) => {
      // Use stored immutable financial snapshot fields
      const basePrice =
        typeof o.sellerBasePrice === "number" ? o.sellerBasePrice : Number(o.amount) || 0;
      const commission =
        typeof o.commissionAmount === "number" ? o.commissionAmount : 0;
      
      // Actual settled amount paid to seller by admin (fallback to sellerNetPayable only for legitimately paid payouts)
      const settledAmount =
        typeof o.payout?.amount === "number"
          ? o.payout.amount
          : typeof o.sellerNetPayable === "number"
          ? o.sellerNetPayable
          : basePrice - commission;

      totalSalesPaise += Math.round(basePrice * 100);
      totalCommissionPaise += Math.round(commission * 100);
      totalNetEarningsPaise += Math.round(settledAmount * 100);

      return {
        id: o._id.toString(),
        orderId: o.orderId,
        goatId: o.goat?.toString(),
        goatName: o.goatName || "Goat Listing",
        goatBreed: o.goatBreed || "Standard",
        goatImage: o.goatImage || "",
        saleDate: o.payout?.paidAt || o.payment?.paidAt || o.createdAt,
        sellerBasePrice: basePrice,
        commissionRate: typeof o.commissionRate === "number" ? o.commissionRate : PLATFORM_COMMISSION_RATE,
        commissionAmount: commission,
        sellerNetPayable: settledAmount,
        currency: o.currency || "INR",
        paymentId: o.payment?.razorpayPaymentId || "",
        orderStatus: o.status,
        payoutStatus: o.payout?.status || "paid",
        payoutAmount: settledAmount,
        payoutReference: o.payout?.referenceId || o.payout?.utrNumber || o.payout?.transferId || "",
        payoutPaidAt: o.payout?.paidAt || null,
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
