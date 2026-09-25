import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Order from "@/models/Order";
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from "@/lib/security";

/**
 * GET /api/seller/payouts
 * Returns payout history for the authenticated seller.
 * Read-only for sellers — sellers cannot mutate payout status.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    if (user.role !== "seller" && user.role !== "admin") {
      return forbiddenResponse("Only sellers or admins can view seller payout history");
    }

    await connectDB();

    // Query orders for this seller that have payout data or delivered orders
    const orders = await Order.find({
      seller: user.id,
      $or: [
        { "payout.status": { $in: ["paid", "processing", "unpaid", "failed"] } },
        { status: "delivered" },
      ],
    })
      .sort({ "payout.paidAt": -1, createdAt: -1 })
      .select("orderId goatName goatBreed amount sellerBasePrice deliveryCharge buyerPlatformFee commissionAmount sellerNetPayable status payment payout createdAt")
      .lean();

    const payouts = orders.map((o: any) => {
      const isPaid = o.payout?.status === "paid";
      const isManual = o.payout?.isManual ?? false;

      let displayStatus = "PAYOUT PENDING";
      if (isPaid) {
        displayStatus = isManual ? "PAID MANUALLY" : "PAID";
      } else if (o.payout?.status === "processing") {
        displayStatus = "PROCESSING";
      } else if (o.payout?.status === "failed") {
        displayStatus = "FAILED";
      }

      return {
        id: o._id.toString(),
        orderId: o.orderId,
        goatName: o.goatName,
        goatBreed: o.goatBreed,
        sellerPayable: o.sellerNetPayable ?? 0,
        sellerBasePrice: o.sellerBasePrice ?? o.amount,
        deliveryCharge: o.deliveryCharge ?? 0,
        status: displayStatus,
        rawStatus: o.payout?.status || (o.status === "delivered" ? "unpaid" : "none"),
        isManual,
        method: o.payout?.payoutMethod || "BANK",
        reference: o.payout?.referenceId || o.payout?.utrNumber || o.payout?.transferId || "—",
        paidDate: o.payout?.paidAt || o.payout?.processedAt || null,
        orderDate: o.createdAt,
        adminNote: o.payout?.adminNote || null,
      };
    });

    return NextResponse.json({
      success: true,
      data: payouts,
    });
  } catch (error: any) {
    console.error("GET /api/seller/payouts error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load payout history" },
      { status: 500 }
    );
  }
}
