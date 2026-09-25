import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Order from "@/models/Order";
import User from "@/models/User";
import {
  getAuthUser,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@/lib/security";
import { PLATFORM_COMMISSION_RATE } from "@/lib/commission";

/**
 * GET /api/admin/financials
 * Strictly admin-only read-only financial endpoint for GoatMart platform.
 * Aggregates all completed and paid sales using permanent immutable financial snapshots.
 * Preserves monetary precision via integer-paise arithmetic without altering historical records.
 */
export async function GET(_req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return unauthorizedResponse("Authentication required to access admin financials");
    }

    // RBAC: Strictly restricted to admin role
    if (user.role !== "admin") {
      return forbiddenResponse("Forbidden: Admin access required");
    }

    await connectDB();

    // Authoritative criteria for qualifying financial orders:
    // 1. Payment status must be explicitly "paid"
    // 2. Order status must not be cancelled or refunded
    const query = {
      "payment.status": "paid",
      status: { $nin: ["cancelled", "refunded"] },
    };

    const paidOrders = await Order.find(query)
      .populate("seller", "name email phone sellerProfile.farmName")
      .select(
        "orderId goat goatName goatBreed goatImage seller sellerName customer customerName status payment.status payment.paidAt payment.razorpayPaymentId sellerBasePrice commissionRate commissionAmount sellerNetPayable currency financialCalculationVersion financialCalculatedAt amount createdAt"
      )
      .sort({ "payment.paidAt": -1, createdAt: -1 })
      .lean();

    // Integer-paise precision to prevent floating-point accumulation drift
    let totalGMVPaise = 0;
    let totalCommissionPaise = 0;
    let totalSellerNetPaise = 0;

    interface SellerGroup {
      sellerId: string;
      sellerName: string;
      farmName: string;
      email?: string;
      paidSalesCount: number;
      grossPaise: number;
      commissionPaise: number;
      netPaise: number;
    }

    const sellerMap = new Map<string, SellerGroup>();

    const orders = paidOrders.map((o: any) => {
      const isLegacy =
        typeof o.financialCalculationVersion === "undefined" &&
        typeof o.commissionAmount === "undefined";

      const basePrice =
        typeof o.sellerBasePrice === "number"
          ? o.sellerBasePrice
          : Number(o.amount) || 0;

      const commission =
        typeof o.commissionAmount === "number" ? o.commissionAmount : 0;

      const netPayable =
        typeof o.sellerNetPayable === "number"
          ? o.sellerNetPayable
          : basePrice - commission;

      const commissionRate =
        typeof o.commissionRate === "number"
          ? o.commissionRate
          : isLegacy
          ? 0
          : PLATFORM_COMMISSION_RATE;

      const basePricePaise = Math.round(basePrice * 100);
      const commissionPaise = Math.round(commission * 100);
      const netPayablePaise = Math.round(netPayable * 100);

      totalGMVPaise += basePricePaise;
      totalCommissionPaise += commissionPaise;
      totalSellerNetPaise += netPayablePaise;

      // Group by seller
      const sellerId =
        o.seller?._id?.toString() || o.seller?.toString() || "unknown-seller";
      const sellerName =
        o.seller?.name || o.sellerName || "Unknown Seller";
      const farmName = o.seller?.sellerProfile?.farmName || "";
      const email = o.seller?.email || "";

      if (!sellerMap.has(sellerId)) {
        sellerMap.set(sellerId, {
          sellerId,
          sellerName,
          farmName,
          email,
          paidSalesCount: 0,
          grossPaise: 0,
          commissionPaise: 0,
          netPaise: 0,
        });
      }

      const s = sellerMap.get(sellerId)!;
      s.paidSalesCount += 1;
      s.grossPaise += basePricePaise;
      s.commissionPaise += commissionPaise;
      s.netPaise += netPayablePaise;

      return {
        orderId: o.orderId,
        goatId: o.goat?.toString() || "",
        goatName: o.goatName || "Goat Listing",
        goatBreed: o.goatBreed || "Standard",
        goatImage: o.goatImage || "",
        sellerId,
        sellerName,
        farmName,
        customerName: o.customerName || "Customer",
        saleDate: o.payment?.paidAt || o.createdAt,
        sellerBasePrice: basePrice,
        commissionRate,
        commissionAmount: commission,
        sellerNetPayable: netPayable,
        currency: o.currency || "INR",
        paymentId: o.payment?.razorpayPaymentId || "",
        paymentStatus: o.payment?.status || "paid",
        orderStatus: o.status,
        financialCalculationVersion:
          o.financialCalculationVersion || (isLegacy ? "legacy" : "1.0"),
        financialCalculatedAt: o.financialCalculatedAt || o.createdAt,
        isLegacy,
      };
    });

    // Format seller-wise summary
    const sellerBreakdown = Array.from(sellerMap.values())
      .map((s) => ({
        sellerId: s.sellerId,
        sellerName: s.sellerName,
        farmName: s.farmName,
        email: s.email,
        paidSalesCount: s.paidSalesCount,
        totalGrossSales: s.grossPaise / 100,
        totalCommission: s.commissionPaise / 100,
        totalSellerNet: s.netPaise / 100,
      }))
      .sort((a, b) => b.totalGrossSales - a.totalGrossSales);

    // Platform-level financial summary
    const summary = {
      totalGMV: totalGMVPaise / 100,
      totalCommission: totalCommissionPaise / 100,
      totalSellerNet: totalSellerNetPaise / 100,
      paidOrdersCount: orders.length,
      currency: "INR",
      conservationVerified:
        totalCommissionPaise + totalSellerNetPaise === totalGMVPaise,
    };

    return NextResponse.json({
      success: true,
      data: {
        summary,
        sellerBreakdown,
        orders,
      },
    });
  } catch (error) {
    console.error("Admin financials API error:", error);
    return serverErrorResponse();
  }
}
