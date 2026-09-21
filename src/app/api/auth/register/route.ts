import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import {
  sanitizeString,
  checkRateLimit,
  tooManyRequestsResponse,
  badRequestResponse,
  serverErrorResponse,
} from "@/lib/security";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  email: z.string().email("Invalid email format").max(150, "Email is too long"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().max(20).optional().nullable(),
  role: z.enum(["customer", "seller"], {
    errorMap: () => ({ message: "Role must be customer or seller" }),
  }).default("customer"),
  farmName: z.string().max(100).optional().nullable(),
  farmLocation: z.string().max(100).optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    // Rate limit registrations: 15 per 5 minutes
    const ip = req.headers.get("x-forwarded-for") || "unknown_ip";
    const rateCheck = checkRateLimit(`register_${ip}`, 15, 300000);
    if (!rateCheck.allowed) {
      return tooManyRequestsResponse("Too many registration attempts. Please try again in a few minutes.");
    }

    await connectDB();
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return badRequestResponse(parsed.error.errors[0].message);
    }

    const { name, email, password, phone, role, farmName, farmLocation } = parsed.data;
    const cleanEmail = email.toLowerCase().trim();

    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Email is already registered" },
        { status: 409 }
      );
    }

    const cleanName = sanitizeString(name);
    const cleanPhone = phone ? sanitizeString(phone) : "";

    const userData: Record<string, unknown> = {
      name: cleanName,
      email: cleanEmail,
      password, // UserSchema pre('save') hashes this using bcrypt (cost factor 12)
      phone: cleanPhone,
      role,
      isEmailVerified: true,
    };

    if (role === "seller") {
      userData.sellerProfile = {
        farmName: farmName ? sanitizeString(farmName) : `${cleanName}'s Goat Farm`,
        description: `Welcome to ${farmName ? sanitizeString(farmName) : `${cleanName}'s Farm`}. We specialize in quality healthy champion breed goats with pure genetics and full veterinary care.`,
        location: farmLocation ? sanitizeString(farmLocation) : "India",
        status: "pending",
        rating: 5.0,
        totalReviews: 0,
        totalSales: 0,
        joinedAt: new Date(),
      };
    }

    const user = await User.create(userData);

    return NextResponse.json(
      {
        success: true,
        message:
          role === "seller"
            ? "Seller registration submitted! Your account is pending admin approval."
            : "Account created successfully!",
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return serverErrorResponse();
  }
}
