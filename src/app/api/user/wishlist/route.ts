import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Goat from "@/models/Goat";
import {
  getAuthUser,
  isValidObjectId,
  unauthorizedResponse,
  badRequestResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/security";
import mongoose from "mongoose";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    await connectDB();
    const dbUser = await User.findById(user.id).select("wishlist");
    const goats = await Goat.find({ _id: { $in: dbUser?.wishlist || [] } }).lean();

    return NextResponse.json({ success: true, data: goats });
  } catch (error) {
    console.error("Fetch wishlist error:", error);
    return serverErrorResponse();
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const body = await req.json();
    const { goatId } = body;

    if (!isValidObjectId(goatId)) {
      return badRequestResponse("Invalid Goat ID format");
    }

    await connectDB();
    const [dbUser, goat] = await Promise.all([
      User.findById(user.id),
      Goat.findById(goatId),
    ]);

    if (!dbUser) return notFoundResponse("User not found");
    if (!goat) return notFoundResponse("Goat listing not found");

    const id = new mongoose.Types.ObjectId(goatId);
    const idx = dbUser.wishlist.findIndex((w) => w.toString() === goatId);

    if (idx > -1) {
      dbUser.wishlist.splice(idx, 1);
      await Goat.findByIdAndUpdate(goatId, { $inc: { wishlistCount: -1 } });
    } else {
      dbUser.wishlist.push(id);
      await Goat.findByIdAndUpdate(goatId, { $inc: { wishlistCount: 1 } });
    }

    await dbUser.save();

    return NextResponse.json({
      success: true,
      inWishlist: idx === -1,
    });
  } catch (error) {
    console.error("Toggle wishlist error:", error);
    return serverErrorResponse();
  }
}
