import { NextRequest, NextResponse } from "next/server";
import { uploadImage, uploadVideo } from "@/lib/cloudinary";
import {
  getAuthUser,
  isApprovedSeller,
  unauthorizedResponse,
  forbiddenResponse,
  badRequestResponse,
  serverErrorResponse,
} from "@/lib/security";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const ALLOWED_AUDIO_TYPES = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav"];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = (formData.get("type") as string) || "image";
    const purpose = (formData.get("purpose") as string) || "general";

    if (!file) {
      return badRequestResponse("No file provided for upload");
    }

    // RBAC: For goat listing uploads, verify approved seller or admin
    if (purpose === "listing" && !isApprovedSeller(user)) {
      return forbiddenResponse("Only approved sellers or admins can upload listing media");
    }

    if (type === "audio") {
      if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
        return badRequestResponse(
          `Invalid audio format (${file.type}). Allowed: WebM, OGG, MP4, MP3, WAV`
        );
      }
      if (file.size > MAX_AUDIO_SIZE) {
        return badRequestResponse("Audio file size exceeds 10 MB limit");
      }
    } else if (type === "video") {
      if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
        return badRequestResponse(
          `Invalid video format (${file.type}). Allowed formats: MP4, WebM, QuickTime`
        );
      }
      if (file.size > MAX_VIDEO_SIZE) {
        return badRequestResponse("Video file size exceeds maximum limit of 50 MB");
      }
    } else {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return badRequestResponse(
          `Invalid image format (${file.type}). Allowed formats: JPEG, PNG, WebP`
        );
      }
      if (file.size > MAX_IMAGE_SIZE) {
        return badRequestResponse("Image file size exceeds maximum limit of 5 MB");
      }
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    try {
      const result =
        type === "video" || type === "audio"
          ? await uploadVideo(base64)
          : await uploadImage(base64);
      if (result && result.url) {
        return NextResponse.json({ success: true, data: result });
      }
    } catch (cloudErr: any) {
      console.error("[Upload API] Cloudinary upload failed:", {
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

    return NextResponse.json(
      {
        success: false,
        error: "Image storage service unavailable",
      },
      { status: 502 }
    );
  } catch (error) {
    console.error("Upload failed:", error);
    return serverErrorResponse("File upload failed");
  }
}
