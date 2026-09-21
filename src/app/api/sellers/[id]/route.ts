import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import {
  getAuthUser,
  isValidObjectId,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  badRequestResponse,
  serverErrorResponse,
} from "@/lib/security";
import { z } from "zod";

const updateSellerSchema = z.object({
  status: z.enum(["pending", "approved", "suspended"], {
    errorMap: () => ({ message: "Status must be pending, approved, or suspended" }),
  }),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();
    if (user.role !== "admin") return forbiddenResponse("Admin access required");

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return notFoundResponse("Seller not found");
    }

    const body = await req.json();
    const parsed = updateSellerSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestResponse(parsed.error.errors[0].message);
    }

    const { status } = parsed.data;

    await connectDB();
    const seller = await User.findOneAndUpdate(
      { _id: id, role: "seller" },
      { "sellerProfile.status": status },
      { new: true }
    ).select("-password");

    if (!seller) {
      return notFoundResponse("Seller account not found");
    }

    return NextResponse.json({
      success: true,
      data: seller,
      message: `Seller status updated to ${status}`,
    });
  } catch (error) {
    console.error("Update seller status error:", error);
    return serverErrorResponse();
  }
}
