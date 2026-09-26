import { v2 as cloudinary } from "cloudinary";

function cleanEnv(val: string | undefined): string {
  if (!val) return "";
  return val.trim().replace(/^["']|["']$/g, "").trim();
}

export function getCloudinaryConfig() {
  const cloudName = cleanEnv(process.env.CLOUDINARY_CLOUD_NAME);
  const apiKey = cleanEnv(process.env.CLOUDINARY_API_KEY);
  const apiSecret = cleanEnv(process.env.CLOUDINARY_API_SECRET);

  if (!cloudName || !apiKey || !apiSecret) {
    const missing: string[] = [];
    if (!cloudName) missing.push("CLOUDINARY_CLOUD_NAME");
    if (!apiKey) missing.push("CLOUDINARY_API_KEY");
    if (!apiSecret) missing.push("CLOUDINARY_API_SECRET");
    throw new Error(
      `Cloudinary configuration error: Missing required environment variable(s): ${missing.join(", ")}`
    );
  }

  return {
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  };
}

export function configureCloudinary() {
  const config = getCloudinaryConfig();
  cloudinary.config(config);
  return config;
}

// Initial configuration attempt on module load
try {
  configureCloudinary();
} catch (err: any) {
  // Warn in server logs during build/startup without exposing sensitive values
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[Cloudinary Config] ${err?.message || "Configuration incomplete"}`);
  }
}

export interface UploadResult {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

export async function uploadImage(
  source: string,
  folder = "bakrawale/goats"
): Promise<UploadResult> {
  configureCloudinary();
  const r = await cloudinary.uploader.upload(source, {
    folder,
    transformation: [
      { width: 1000, height: 1000, crop: "limit" },
      { quality: "auto:good" },
      { fetch_format: "auto" },
    ],
  });
  return {
    url: r.secure_url,
    publicId: r.public_id,
    width: r.width,
    height: r.height,
    format: r.format,
    bytes: r.bytes,
  };
}

export async function uploadVideo(
  source: string,
  folder = "bakrawale/videos"
): Promise<UploadResult> {
  configureCloudinary();
  const r = await cloudinary.uploader.upload(source, {
    resource_type: "video",
    folder,
    transformation: [{ width: 1280, height: 720, crop: "limit" }],
  });
  return {
    url: r.secure_url,
    publicId: r.public_id,
    format: r.format,
    bytes: r.bytes,
  };
}

export async function deleteFile(
  publicId: string,
  resourceType: "image" | "video" = "image"
): Promise<void> {
  configureCloudinary();
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

export function generateUploadSignature(folder: string) {
  const config = configureCloudinary();
  const timestamp = Math.round(new Date().getTime() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    config.api_secret
  );
  return {
    timestamp,
    signature,
    cloudName: config.cloud_name,
    apiKey: config.api_key,
    folder,
  };
}

export default cloudinary;

