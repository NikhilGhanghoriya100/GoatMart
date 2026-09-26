import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import Goat from "@/models/Goat";
import Order from "@/models/Order";
import User from "@/models/User";
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
  rating: z
    .number()
    .int()
    .min(1, "Rating must be at least 1")
    .max(5, "Rating cannot exceed 5"),
  text: z
    .string()
    .min(2, "Review text must be at least 2 characters")
    .max(1000, "Review is too long"),
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

    // Verify purchase integrity & prevent duplicate reviews with atomic lock
    // Atomically claim the delivered order for review
    const order = await Order.findOneAndUpdate(
      {
        goat: new mongoose.Types.ObjectId(id),
        customer: new mongoose.Types.ObjectId(user.id),
        status: "delivered",
        reviewed: { $ne: true },
      },
      {
        $set: { reviewed: true },
      },
      { new: true }
    );

    if (!order) {
      // Check existing order details for clear and descriptive error feedback
      const existingOrder = await Order.findOne({
        goat: new mongoose.Types.ObjectId(id),
        customer: new mongoose.Types.ObjectId(user.id),
      });

      if (!existingOrder) {
        return forbiddenResponse(
          "Only verified customers who purchased this goat can submit a review"
        );
      }

      if (existingOrder.status !== "delivered") {
        return forbiddenResponse(
          "You can only review this goat after it has been delivered"
        );
      }

      if (existingOrder.reviewed) {
        return NextResponse.json(
          { success: false, error: "You have already reviewed this goat" },
          { status: 409 }
        );
      }

      return forbiddenResponse(
        "Only verified customers with delivered orders can submit a review"
      );
    }

    const goat = await Goat.findById(id);
    if (!goat) {
      // Revert order reviewed status if goat document does not exist
      await Order.findByIdAndUpdate(order._id, { $set: { reviewed: false } });
      return notFoundResponse("Goat not found");
    }

    // Defensive check: verify user hasn't already reviewed in goat.reviews
    const alreadyReviewedInGoat = goat.reviews?.some(
      (r) => r.user && r.user.toString() === user.id
    );
    if (alreadyReviewedInGoat) {
      return NextResponse.json(
        { success: false, error: "You have already reviewed this goat" },
        { status: 409 }
      );
    }

    const sanitizedText = sanitizeString(text);

    if (!Array.isArray(goat.reviews)) {
      goat.reviews = [];
    }

    goat.reviews.push({
      user: new mongoose.Types.ObjectId(user.id) as any,
      userName: user.name || "Customer",
      userAvatar: user.avatar || "",
      rating,
      text: sanitizedText,
      createdAt: new Date(),
    });

    const totalScore = goat.reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    goat.averageRating = Math.round((totalScore / goat.reviews.length) * 10) / 10;
    goat.totalReviews = goat.reviews.length;

    // Aggregate seller ratings across ALL goats belonging to this seller
    const sellerId = order.seller || goat.seller;
    if (sellerId) {
      const sellerIdStr = sellerId.toString();
      const sellerGoats = await Goat.find({
        seller: {
          $in: [new mongoose.Types.ObjectId(sellerIdStr), sellerIdStr],
        },
      })
        .select("reviews")
        .lean();

      let totalRating = 0;
      let count = 0;

      for (const g of sellerGoats) {
        if (Array.isArray(g.reviews)) {
          for (const r of g.reviews) {
            if (typeof r.rating === "number" && r.rating >= 1 && r.rating <= 5) {
              totalRating += r.rating;
              count++;
            }
          }
        }
      }

      const avgSellerRating =
        count > 0 ? Number((totalRating / count).toFixed(2)) : 0;

      await User.findByIdAndUpdate(sellerIdStr, {
        $set: {
          "sellerProfile.rating": avgSellerRating,
          "sellerProfile.totalReviews": count,
        },
      });

      goat.sellerRating = avgSellerRating;
      goat.sellerReviews = count;
    }

    await goat.save();

    return NextResponse.json({
      success: true,
      message: "Review submitted successfully!",
      data: {
        averageRating: goat.averageRating,
        totalReviews: goat.totalReviews,
      },
    });
  } catch (error) {
    console.error("Submit review error:", error);
    return serverErrorResponse();
  }
}
