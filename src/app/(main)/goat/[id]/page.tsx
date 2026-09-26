import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import Goat from "@/models/Goat";
import User from "@/models/User";
import Order from "@/models/Order";
import { isValidObjectId } from "@/lib/security";
import GoatDetailClient from "@/components/goat/GoatDetailClient";
import type { Goat as GoatType } from "@/types";
import { BUYER_PLATFORM_FEE_RATE } from "@/lib/commission";
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

async function getRecommendedGoats(currentGoatId: string, breed: string) {
  if (!isValidObjectId(currentGoatId)) {
    return [];
  }
  try {
    await connectDB();
    const goats = await Goat.find({
      _id: { $ne: new mongoose.Types.ObjectId(currentGoatId) },
      breed: breed,
      status: { $nin: ["sold", "Sold", "SOLD", "reserved", "Reserved"] },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return goats || [];
  } catch (error) {
    console.error("Fetch recommended goats error:", error);
    return [];
  }
}

async function getSellerStats(sellerId: unknown) {
  if (!sellerId) {
    return { rating: 0, totalReviews: 0, goatsSold: 0 };
  }
  const sellerIdStr = sellerId.toString();
  if (!isValidObjectId(sellerIdStr)) {
    return { rating: 0, totalReviews: 0, goatsSold: 0 };
  }
  try {
    await connectDB();
    const sellerObjId = new mongoose.Types.ObjectId(sellerIdStr);
    const [sellerUser, goatsSold] = await Promise.all([
      User.findById(sellerIdStr).select("sellerProfile").lean(),
      Order.countDocuments({
        seller: { $in: [sellerObjId, sellerIdStr] },
        "payment.status": "paid",
        status: { $nin: ["cancelled", "refunded"] },
      }),
    ]);

    const rating = sellerUser?.sellerProfile?.rating ?? 0;
    const totalReviews = sellerUser?.sellerProfile?.totalReviews ?? 0;

    return {
      rating: Number(rating.toFixed(1)),
      totalReviews,
      goatsSold,
    };
  } catch (error) {
    console.error("Fetch seller stats error:", error);
    return { rating: 0, totalReviews: 0, goatsSold: 0 };
  }
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
  const [recommendedGoats, sellerStats] = await Promise.all([
    getRecommendedGoats(id, goat.breed),
    getSellerStats(goat.seller),
  ]);

  return (
    <GoatDetailClient
      goat={serializedGoat}
      recommendedGoats={JSON.parse(JSON.stringify(recommendedGoats))}
      buyerFeeRate={BUYER_PLATFORM_FEE_RATE}
      sellerStats={sellerStats}
    />
  );
}
