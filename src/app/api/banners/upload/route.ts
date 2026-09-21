import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Banner from "@/models/Banner";
import cloudinary from "@/lib/cloudinary";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (session?.user?.role !== "admin") {
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
        { success: false, error: "Invalid banner slot" },
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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadResult = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "bakrawale/banners",
          resource_type: "image",
          transformation: [
            {
              width: 1920,
              height: 1080,
              crop: "limit",
            },
            {
              quality: "auto:good",
            },
            {
              fetch_format: "auto",
            },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      stream.end(buffer);
    });

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
    console.error("Banner upload error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Banner upload failed",
      },
      { status: 500 }
    );
  }
}
