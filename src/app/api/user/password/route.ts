import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import {
  getAuthUser,
  unauthorizedResponse,
  badRequestResponse,
  serverErrorResponse,
  checkRateLimit,
  tooManyRequestsResponse,
} from "@/lib/security";
import { z } from "zod";

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters long"),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    // Rate limit password change attempts per user
    const rateCheck = checkRateLimit(`pwd_change_${user.id}`, 5, 300000); // 5 attempts per 5 mins
    if (!rateCheck.allowed) {
      return tooManyRequestsResponse("Too many password update attempts. Please try again later.");
    }

    const body = await req.json();
    const parsed = passwordChangeSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestResponse(parsed.error.errors[0].message);
    }

    const { currentPassword, newPassword } = parsed.data;

    await connectDB();
    const dbUser = await User.findById(user.id).select("+password");
    if (!dbUser) {
      return unauthorizedResponse("User account not found");
    }

    const isMatch = await dbUser.comparePassword(currentPassword);
    if (!isMatch) {
      return badRequestResponse("Current password is incorrect");
    }

    if (currentPassword === newPassword) {
      return badRequestResponse("New password must be different from current password");
    }

    dbUser.password = newPassword;
    await dbUser.save();

    return NextResponse.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Password change error:", error);
    return serverErrorResponse();
  }
}
