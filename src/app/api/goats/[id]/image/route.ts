import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Goat from "@/models/Goat";
import { isValidObjectId } from "@/lib/security";

export const dynamic = "force-dynamic";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate MongoDB ObjectId to prevent injection or invalid queries
    if (!isValidObjectId(id)) {
      return new NextResponse("Goat not found", {
        status: 404,
        headers: { "Content-Type": "text/plain" },
      });
    }

    await connectDB();

    // Query only the images field without exposing seller, pricing, or internal data
    const goat = await Goat.findById(id).select("images").lean();

    if (!goat || !goat.images || goat.images.length === 0 || !goat.images[0]) {
      return new NextResponse("Goat image not found", {
        status: 404,
        headers: { "Content-Type": "text/plain" },
      });
    }

    const primaryImage = goat.images[0].trim();

    // Format A: External HTTP/HTTPS URL (Cloudinary, Unsplash, external CDN)
    if (primaryImage.startsWith("http://") || primaryImage.startsWith("https://")) {
      return NextResponse.redirect(primaryImage, { status: 302 });
    }

    // Format B: Base64 Data URI (e.g., data:image/jpeg;base64,... or data:image/webp;base64,...)
    if (primaryImage.startsWith("data:image/")) {
      const commaIndex = primaryImage.indexOf(",");
      if (commaIndex === -1) {
        return new NextResponse("Malformed image data", {
          status: 400,
          headers: { "Content-Type": "text/plain" },
        });
      }

      const header = primaryImage.slice(0, commaIndex);
      const base64Data = primaryImage.slice(commaIndex + 1);

      const mimeMatch = header.match(/^data:([^;]+);base64$/);
      if (!mimeMatch) {
        return new NextResponse("Malformed image data", {
          status: 400,
          headers: { "Content-Type": "text/plain" },
        });
      }

      const mimeType = mimeMatch[1].toLowerCase();

      if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        return new NextResponse("Unsupported image type", {
          status: 415,
          headers: { "Content-Type": "text/plain" },
        });
      }

      const buffer = Buffer.from(base64Data, "base64");

      if (buffer.length === 0) {
        return new NextResponse("Empty image data", {
          status: 400,
          headers: { "Content-Type": "text/plain" },
        });
      }

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": mimeType,
          "Content-Length": buffer.length.toString(),
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
        },
      });
    }

    // Unrecognized format
    return new NextResponse("Invalid image format", {
      status: 404,
      headers: { "Content-Type": "text/plain" },
    });
  } catch (error) {
    console.error("Serve goat image error:", error);
    return new NextResponse("Internal server error", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
}
