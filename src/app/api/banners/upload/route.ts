import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import cloudinary, { configureCloudinary } from "@/lib/cloudinary";
import dbConnect from "@/lib/db";
import Banner from "@/models/Banner";

export async function POST(req: NextRequest) {
  try {
    // getToken reads JWT directly from request cookies — reliable in App Router
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token || token.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Admin only" },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const slideIndex = Number(formData.get("slideIndex"));

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Banner image is required" },
        { status: 400 }
      );
    }

    if (![0, 1, 2].includes(slideIndex)) {
      return NextResponse.json(
        { success: false, error: "Invalid banner slot (must be 0, 1, or 2)" },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { success: false, error: "Only image files are allowed" },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "Maximum banner size is 10MB" },
        { status: 400 }
      );
    }

    // Convert file to base64 — same approach as working /api/upload route
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    console.log(`[Banner Upload] Uploading slide ${slideIndex} to Cloudinary...`);

    // Use cloudinary.uploader.upload (NOT upload_stream) with base64 — avoids stream hang
    configureCloudinary();
    let uploadResult: any;
    try {
      uploadResult = await cloudinary.uploader.upload(base64, {
        folder: "bakrawale/banners",
        resource_type: "image",
        transformation: [
          { width: 1920, height: 1080, crop: "limit" },
          { quality: "auto:good" },
          { fetch_format: "auto" },
        ],
        timeout: 60000, // 60 second timeout
      });
    } catch (cloudErr: any) {
      console.error("[Banner Upload] Cloudinary error:", {
        message: cloudErr?.message,
        http_code: cloudErr?.http_code,
        name: cloudErr?.name,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Image storage service unavailable",
        },
        { status: 502 }
      );
    }

    if (!uploadResult?.secure_url) {
      return NextResponse.json(
        { success: false, error: "Cloudinary did not return a URL" },
        { status: 500 }
      );
    }

    console.log(`[Banner Upload] Cloudinary success: ${uploadResult.secure_url}`);

    await dbConnect();

    const banner = await Banner.findOneAndUpdate(
      { slideIndex },
      {
        slideIndex,
        imageUrl: uploadResult.secure_url,
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
    console.error("[Banner Upload] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Banner upload failed",
      },
      { status: 500 }
    );
  }
}
