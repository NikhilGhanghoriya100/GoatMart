import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import connectDB from "@/lib/db";
import Goat from "@/models/Goat";
import { isValidObjectId } from "@/lib/security";
import GoatDetailClient from "@/components/goat/GoatDetailClient";
import type { Goat as GoatType } from "@/types";
import {
  getBaseUrl,
  getGoatProductUrl,
  getGoatImageUrl,
  translateBreed,
  formatPrice,
  formatGoatWeight,
  formatGoatAge,
} from "@/lib/shareGoat";

export const dynamic = "force-dynamic";

/**
 * Extracts incoming request origin from headers (x-forwarded-host / host).
 * Works dynamically across Localhost, Render, Vercel, Custom Domain, Cloudflare, etc.
 */
async function getRequestOrigin(): Promise<string | undefined> {
  try {
    const headersList = await headers();
    const host = headersList.get("x-forwarded-host") || headersList.get("host");
    if (!host) return undefined;

    const proto =
      headersList.get("x-forwarded-proto") ||
      (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https");

    return `${proto}://${host}`.replace(/\/+$/, "");
  } catch {
    return undefined;
  }
}

async function getGoatForMetadata(id: string) {
  if (!isValidObjectId(id)) {
    return null;
  }
  try {
    await connectDB();
    return await Goat.findById(id).lean();
  } catch (error) {
    console.error("Metadata fetch goat error:", error);
    return null;
  }
}

async function getGoatForPage(id: string) {
  if (!isValidObjectId(id)) {
    return null;
  }
  await connectDB();
  const goat = await Goat.findByIdAndUpdate(
    id,
    { $inc: { views: 1 } },
    { new: true }
  ).lean();
  return goat;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const goat = await getGoatForMetadata(id);

  if (!goat) {
    return {
      title: "Goat Not Found | GoatMart",
      description: "GoatMart पर यह बकरा उपलब्ध नहीं है।",
    };
  }

  const requestOrigin = await getRequestOrigin();
  const productUrl = getGoatProductUrl(id, requestOrigin);
  const imageUrl = getGoatImageUrl(id, requestOrigin);
  const breedName = translateBreed(goat.breed);
  const priceText = formatPrice(goat.price);
  const weightText = formatGoatWeight(goat.weight);
  const ageText = formatGoatAge(goat.age);
  const sellerName = goat.sellerName?.trim() || "विक्रेता";

  const title = `${goat.name} | ${breedName} | GoatMart`;
  const description = `GoatMart पर ${goat.name} — ${breedName}, ${weightText}, उम्र ${ageText}, कीमत ${priceText}। विक्रेता: ${sellerName}। सुरक्षित खरीदारी के लिए पूरी जानकारी देखें।`;
  const baseUrl = getBaseUrl(requestOrigin);

  return {
    metadataBase: new URL(baseUrl),
    title,
    description,
    alternates: {
      canonical: productUrl,
    },
    openGraph: {
      title,
      description,
      url: productUrl,
      siteName: "GoatMart",
      type: "website",
      locale: "hi_IN",
      images: [
        {
          url: imageUrl,
          alt: goat.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function GoatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const goat = await getGoatForPage(id);

  if (!goat) {
    notFound();
  }

  // Serialize to plain JSON object for the interactive Client Component
  const serializedGoat: GoatType = JSON.parse(JSON.stringify(goat));

  return <GoatDetailClient goat={serializedGoat} />;
}
