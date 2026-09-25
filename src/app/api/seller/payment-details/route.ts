import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from "@/lib/security";
import {
  validateSellerPaymentDetailsInput,
  sanitizeSellerPaymentDetails,
} from "@/lib/paymentDetails";
import { logFinancialEvent } from "@/lib/auditLogger";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    if (user.role !== "seller" && user.role !== "admin") {
      return forbiddenResponse("Only sellers or admins can view seller payment details");
    }

    await connectDB();
    const seller = await User.findById(user.id);
    if (!seller) {
      return NextResponse.json({ success: false, error: "Seller account not found" }, { status: 404 });
    }

    const sanitized = sanitizeSellerPaymentDetails(seller.sellerProfile?.paymentDetails, seller.phone);

    return NextResponse.json({
      success: true,
      data: sanitized,
    });
  } catch (error: any) {
    console.error("GET /api/seller/payment-details error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch payment details" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    if (user.role !== "seller" && user.role !== "admin") {
      return forbiddenResponse("Only registered sellers can update payout details");
    }

    const body = await req.json();

    // Server-side validation
    let validated;
    try {
      validated = validateSellerPaymentDetailsInput(body);
    } catch (valErr: any) {
      return NextResponse.json({ success: false, error: valErr.message }, { status: 400 });
    }

    await connectDB();
    const seller = await User.findById(user.id);
    if (!seller) {
      return NextResponse.json({ success: false, error: "Seller account not found" }, { status: 404 });
    }

    if (!seller.sellerProfile) {
      seller.sellerProfile = {
        farmName: seller.name || "Goat Farm",
        description: "",
        location: "",
        status: "pending",
        rating: 5,
        totalReviews: 0,
        totalSales: 0,
        joinedAt: new Date(),
      };
    }

    const now = new Date();

    // Update paymentDetails with pending verification
    seller.sellerProfile.paymentDetails = {
      paymentMethod: validated.paymentMethod,
      phone: validated.phone,
      upiId: validated.upiId,
      accountHolderName: validated.accountHolderName,
      bankName: validated.bankName,
      accountNumber: validated.accountNumber,
      ifscCode: validated.ifscCode,
      paymentNote: validated.paymentNote,
      verificationStatus: "pending",
      rejectionReason: undefined,
      updatedAt: now,
    };

    // Update top-level seller contact phone
    seller.phone = validated.phone;

    // Backward compatibility: sync bankDetails subdocument
    if (validated.paymentMethod === "BANK") {
      seller.sellerProfile.bankDetails = {
        accountHolderName: validated.accountHolderName || "",
        accountNumber: validated.accountNumber || "",
        ifscCode: validated.ifscCode || "",
        bankName: validated.bankName,
        isVerified: false,
      };
    } else if (validated.paymentMethod === "UPI") {
      seller.sellerProfile.bankDetails = {
        accountHolderName: seller.name || "",
        accountNumber: "",
        ifscCode: "",
        upiId: validated.upiId,
        isVerified: false,
      };
    }

    await seller.save();

    // Append-only audit log
    await logFinancialEvent({
      action: "seller_payment_details_updated",
      entityType: "seller",
      entityId: seller._id.toString(),
      actorId: user.id,
      actorRole: user.role === "admin" ? "admin" : "seller",
      actorName: user.name || "Seller",
      status: "success",
      metadata: {
        paymentMethod: validated.paymentMethod,
        phone: validated.phone,
        hasUpi: !!validated.upiId,
        hasBank: validated.paymentMethod === "BANK",
        bankName: validated.bankName,
      },
    });

    const sanitized = sanitizeSellerPaymentDetails(seller.sellerProfile.paymentDetails, seller.phone);

    return NextResponse.json({
      success: true,
      message: "Payment details saved successfully. Pending admin verification.",
      data: sanitized,
    });
  } catch (error: any) {
    console.error("POST /api/seller/payment-details error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save payment details" },
      { status: 500 }
    );
  }
}
