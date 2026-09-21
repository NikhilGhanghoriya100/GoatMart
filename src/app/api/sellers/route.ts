import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import {
  getAuthUser,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@/lib/security";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();
    if (user.role !== "admin") return forbiddenResponse("Admin access required");

    await connectDB();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const query: Record<string, unknown> = { role: "seller" };
    if (status && ["pending", "approved", "suspended"].includes(status)) {
      query["sellerProfile.status"] = status;
    }

    const sellers = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: sellers });
  } catch (error) {
    console.error("Fetch sellers error:", error);
    return serverErrorResponse();
  }
}
