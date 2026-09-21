import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Banner from "@/models/Banner";

export async function GET() {
  try {
    await dbConnect();

    const banners = await Banner.find({ isActive: true })
      .sort({ slideIndex: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: banners,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to fetch banners",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (session?.user?.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Admin only",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { slideIndex, imageUrl } = body;

    if (![0, 1, 2].includes(Number(slideIndex))) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid banner slot",
        },
        { status: 400 }
      );
    }

    if (!imageUrl || typeof imageUrl !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Banner image is required",
        },
        { status: 400 }
      );
    }

    await dbConnect();

    const banner = await Banner.findOneAndUpdate(
      { slideIndex: Number(slideIndex) },
      {
        slideIndex: Number(slideIndex),
        imageUrl,
        isActive: true,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    return NextResponse.json({
      success: true,
      data: banner,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to save banner",
      },
      { status: 500 }
    );
  }
}
