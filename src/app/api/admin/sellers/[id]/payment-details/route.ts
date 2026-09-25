import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { getAuthUser, hasRole, unauthorizedResponse, forbiddenResponse, isValidObjectId } from "@/lib/security";
import { sanitizeSellerPaymentDetails } from "@/lib/paymentDetails";
import { logFinancialEvent } from "@/lib/auditLogger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();
    if (!hasRole(user, ["admin"])) return forbiddenResponse("Admin access required");

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid seller ID" }, { status: 400 });
    }

    await connectDB();
    const seller = await User.findById(id).select("name email phone sellerProfile");
    if (!seller) {
      return NextResponse.json({ success: false, error: "Seller not found" }, { status: 404 });
    }

    const sanitized = sanitizeSellerPaymentDetails(seller.sellerProfile?.paymentDetails, seller.phone);

    return NextResponse.json({
      success: true,
      data: {
        sellerId: seller._id.toString(),
        sellerName: seller.name,
        sellerEmail: seller.email,
        phone: seller.phone || seller.sellerProfile?.paymentDetails?.phone || "",
        paymentDetails: sanitized,
      },
    });
  } catch (error: any) {
    console.error("GET /api/admin/sellers/[id]/payment-details error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch seller payment details" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();
    if (!hasRole(user, ["admin"])) return forbiddenResponse("Admin access required");

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid seller ID" }, { status: 400 });
    }

    const body = await req.json();
    const action = String(body.action || "").trim().toLowerCase(); // "approve" or "reject"
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { success: false, error: "Invalid action: must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    if (action === "reject" && !reason) {
      return NextResponse.json(
        { success: false, error: "Rejection reason is required" },
        { status: 400 }
      );
    }

    await connectDB();
    const seller = await User.findById(id);
    if (!seller) {
      return NextResponse.json({ success: false, error: "Seller not found" }, { status: 404 });
    }

    if (!seller.sellerProfile?.paymentDetails) {
      return NextResponse.json(
        { success: false, error: "Seller has not submitted payment details yet" },
        { status: 400 }
      );
    }

    const now = new Date();
    if (action === "approve") {
      seller.sellerProfile.paymentDetails.verificationStatus = "approved";
      seller.sellerProfile.paymentDetails.verifiedAt = now;
      seller.sellerProfile.paymentDetails.verifiedBy = user.id as any;
      seller.sellerProfile.paymentDetails.rejectionReason = undefined;

      // Sync bankDetails.isVerified for backward compatibility
      if (seller.sellerProfile.bankDetails) {
        seller.sellerProfile.bankDetails.isVerified = true;
      }
    } else {
      seller.sellerProfile.paymentDetails.verificationStatus = "rejected";
      seller.sellerProfile.paymentDetails.rejectionReason = reason;
      seller.sellerProfile.paymentDetails.verifiedAt = undefined;
      seller.sellerProfile.paymentDetails.verifiedBy = user.id as any;

      if (seller.sellerProfile.bankDetails) {
        seller.sellerProfile.bankDetails.isVerified = false;
      }
    }

    await seller.save();

    // Audit log entry
    await logFinancialEvent({
      action: "seller_payment_details_verified",
      entityType: "seller",
      entityId: seller._id.toString(),
      actorId: user.id,
      actorRole: "admin",
      actorName: user.name || "Admin",
      status: "success",
      metadata: {
        action,
        verificationStatus: seller.sellerProfile.paymentDetails.verificationStatus,
        reason: action === "reject" ? reason : undefined,
      },
    });

    const sanitized = sanitizeSellerPaymentDetails(seller.sellerProfile.paymentDetails, seller.phone);

    return NextResponse.json({
      success: true,
      message: action === "approve" ? "Seller payment details approved successfully" : "Seller payment details rejected",
      data: sanitized,
    });
  } catch (error: any) {
    console.error("POST /api/admin/sellers/[id]/payment-details error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update verification status" },
      { status: 500 }
    );
  }
}
