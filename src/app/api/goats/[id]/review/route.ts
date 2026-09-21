import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Goat from "@/models/Goat";
import Order from "@/models/Order";
import {
  getAuthUser,
  isValidObjectId,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  badRequestResponse,
  serverErrorResponse,
  sanitizeString,
} from "@/lib/security";
import { z } from "zod";

const reviewSchema = z.object({
  rating: z.number().int().min(1, "Rating must be at least 1").max(5, "Rating cannot exceed 5"),
  text: z.string().min(2, "Review text must be at least 2 characters").max(1000, "Review is too long"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return notFoundResponse("Goat not found");
    }

    const body = await req.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestResponse(parsed.error.errors[0].message);
    }

    const { rating, text } = parsed.data;

    await connectDB();

    // Verify purchase integrity: Must have a delivered order for this goat
    const order = await Order.findOne({
      goat: id,
      customer: user.id,
      status: "delivered",
    });

    if (!order) {
      return forbiddenResponse("Only verified customers with delivered orders can submit a review");
    }

    const goat = await Goat.findById(id);
    if (!goat) {
      return notFoundResponse("Goat not found");
    }

    // Check if user already reviewed
    const alreadyReviewed = goat.reviews.some((r) => r.user.toString() === user.id);
    if (alreadyReviewed) {
      return NextResponse.json(
        { success: false, error: "You have already reviewed this goat" },
        { status: 409 }
      );
    }

    const sanitizedText = sanitizeString(text);

    goat.reviews.push({
      user: user.id as any,
      userName: user.name,
      userAvatar: user.avatar || "",
      rating,
      text: sanitizedText,
      createdAt: new Date(),
    });

    const totalScore = goat.reviews.reduce((acc, r) => acc + r.rating, 0);
    goat.averageRating = Math.round((totalScore / goat.reviews.length) * 10) / 10;
    goat.totalReviews = goat.reviews.length;
    await goat.save();

    await Order.findByIdAndUpdate(order._id, { reviewed: true });

    return NextResponse.json({
      success: true,
      message: "Review submitted successfully!",
    });
  } catch (error) {
    console.error("Submit review error:", error);
    return serverErrorResponse();
  }
}
