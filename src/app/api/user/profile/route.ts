import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import {
  getAuthUser,
  unauthorizedResponse,
  badRequestResponse,
  notFoundResponse,
  serverErrorResponse,
  sanitizeString,
} from "@/lib/security";
import { z } from "zod";

const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100).optional(),
  phone: z.string().max(20).optional().nullable(),
  avatar: z.string().optional().nullable().or(z.literal("")),
  address: z
    .object({
      street: z.string().max(200).optional(),
      city: z.string().max(100).optional(),
      state: z.string().max(100).optional(),
      pin: z.string().max(10).optional(),
    })
    .optional(),
  sellerProfile: z
    .object({
      farmName: z.string().max(100).optional(),
      description: z.string().max(2000).optional(),
      location: z.string().max(100).optional(),
      upiId: z.string().max(100).optional(),
      bankAccount: z.string().max(50).optional(),
      ifscCode: z.string().max(20).optional(),
    })
    .optional(),
});

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    await connectDB();
    const dbUser = await User.findById(user.id).select("-password").lean();
    if (!dbUser) return notFoundResponse("User not found");

    return NextResponse.json({ success: true, data: dbUser });
  } catch (error) {
    console.error("Fetch profile error:", error);
    return serverErrorResponse();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestResponse(parsed.error.errors[0].message);
    }

    const { name, phone, avatar, address, sellerProfile } = parsed.data;
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = sanitizeString(name);
    if (phone !== undefined) updateData.phone = phone ? sanitizeString(phone) : "";
    if (avatar !== undefined) updateData.avatar = avatar || "";
    if (address !== undefined) {
      updateData.address = {
        street: address.street ? sanitizeString(address.street) : "",
        city: address.city ? sanitizeString(address.city) : "",
        state: address.state ? sanitizeString(address.state) : "",
        pin: address.pin ? sanitizeString(address.pin) : "",
      };
    }
    if (sellerProfile !== undefined) {
      if (sellerProfile.farmName !== undefined) {
        updateData["sellerProfile.farmName"] = sanitizeString(sellerProfile.farmName);
      }
      if (sellerProfile.description !== undefined) {
        updateData["sellerProfile.description"] = sanitizeString(sellerProfile.description);
      }
      if (sellerProfile.location !== undefined) {
        updateData["sellerProfile.location"] = sanitizeString(sellerProfile.location);
      }
    }

    await connectDB();
    const updated = await User.findByIdAndUpdate(user.id, updateData, { new: true })
      .select("-password")
      .lean();

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Update profile error:", error);
    return serverErrorResponse();
  }
}
