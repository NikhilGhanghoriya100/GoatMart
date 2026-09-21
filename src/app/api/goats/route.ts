import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import Goat from "@/models/Goat";
import User from "@/models/User";
import {
  getAuthUser,
  isApprovedSeller,
  unauthorizedResponse,
  forbiddenResponse,
  badRequestResponse,
  serverErrorResponse,
  sanitizeString,
  isValidObjectId,
} from "@/lib/security";
import { BREEDS } from "@/types";
import { z } from "zod";

const hindiBreedMap: Record<string, string> = {
  "जमुनापारी": "Jamunapari",
  "जमुना": "Jamunapari",
  "बीटल": "Beetal",
  "सिरोही": "Sirohi",
  "बरबरी": "Barbari",
  "ब्लैक बंगाल": "Black Bengal",
  "बंगाल": "Black Bengal",
  "उस्मानाबादी": "Osmanabadi",
  "तोतापारी": "Totapari",
  "तोता": "Totapari",
  "सोजत": "Sojat",
  "बोअर": "Boer",
  "कोटा": "Kota",
  "मलाबारी": "Malabari",
  "जखराना": "Jakhrana",
  "सुरती": "Surti",
};

const createGoatSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  breed: z.string().min(2, "Breed is required"),
  weight: z.number().positive("Weight must be greater than 0").max(300, "Invalid weight"),
  age: z.string().min(1, "Age is required").max(50),
  price: z.number().positive("Price must be greater than 0").max(10000000, "Price too high"),
  health: z.string().default("Good"),
  vaccinated: z.boolean().default(false),
  tag: z.string().max(50).optional().nullable(),
  desc: z.string().max(2000).optional().default(""),
  images: z.array(z.string()).optional().default([]),
  videoUrl: z.string().optional().nullable().or(z.literal("")),
});

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "12", 10) || 12));
    const breed = searchParams.get("breed");
    const status = searchParams.get("status");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const search = searchParams.get("search");
    const seller = searchParams.get("seller");
    const sort = searchParams.get("sort") || "newest";

    const query: Record<string, any> = {};

    // 1. Breed Filter (support English or Hindi breed names)
    if (breed && breed !== "All") {
      const mappedBreed = hindiBreedMap[breed] || breed;
      query.breed = { $regex: new RegExp(`^${mappedBreed}$`, "i") };
    }

    // 2. Status Filter (only filter when specifically requested and not "all")
    if (status && status !== "all") {
      query.$or = [
        { status: status },
        { status: { $regex: new RegExp(`^${status}$`, "i") } },
        ...(status === "sale" ? [{ status: { $exists: false } }, { status: "available" }, { status: "active" }] : []),
      ];
    }

    // 3. Seller Filter (flexible matching for ObjectId, String ID, or Seller Name)
    if (seller) {
      const sellerConditions: any[] = [
        { seller: seller },
        { sellerName: { $regex: seller, $options: "i" } },
      ];
      if (isValidObjectId(seller)) {
        sellerConditions.unshift({ seller: new mongoose.Types.ObjectId(seller) });
      }
      query.$or = query.$or ? { $and: [query.$or, { $or: sellerConditions }] } : sellerConditions;
    }

    // 4. Price Filter
    if (minPrice || maxPrice) {
      const priceFilter: Record<string, number> = {};
      if (minPrice && !isNaN(Number(minPrice))) priceFilter.$gte = Number(minPrice);
      if (maxPrice && !isNaN(Number(maxPrice))) priceFilter.$lte = Number(maxPrice);
      if (Object.keys(priceFilter).length > 0) query.price = priceFilter;
    }

    // 5. Multi-Field Search (supports Partial strings, English, Hindi terms)
    if (search && search.trim()) {
      const rawSearch = search.trim();
      const mappedSearchBreed = hindiBreedMap[rawSearch];
      const escaped = rawSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const orConditions: any[] = [
        { name: { $regex: escaped, $options: "i" } },
        { breed: { $regex: escaped, $options: "i" } },
        { desc: { $regex: escaped, $options: "i" } },
        { tag: { $regex: escaped, $options: "i" } },
        { sellerName: { $regex: escaped, $options: "i" } },
        { sellerLoc: { $regex: escaped, $options: "i" } },
      ];

      if (mappedSearchBreed) {
        orConditions.push({ breed: mappedSearchBreed });
      }

      query.$or = query.$or ? { $and: [query.$or, { $or: orConditions }] } : orConditions;
    }

    const sortMap: Record<string, any> = {
      newest: { createdAt: -1 },
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      weight_desc: { weight: -1 },
      popular: { views: -1 },
    };

    const total = await Goat.countDocuments(query);
    const goats = await Goat.find(query)
      .sort(sortMap[sort] || { createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: goats || [],
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error("Fetch goats error:", error);
    return NextResponse.json({
      success: true,
      data: [],
      pagination: { page: 1, limit: 12, total: 0, pages: 1 },
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    await connectDB();
    const dbUser = await User.findById(user.id).select("role sellerProfile");
    const isApproved =
      user.role === "admin" ||
      (dbUser && dbUser.role === "seller" && dbUser.sellerProfile?.status === "approved");

    // RBAC: Only approved sellers or admin can list goats
    if (!isApproved) {
      return forbiddenResponse(
        user.role === "seller"
          ? "Your seller account is pending admin approval. You cannot create listings yet until verified by admin."
          : "Only approved sellers or admins can create goat listings"
      );
    }

    const body = await req.json();
    const parsed = createGoatSchema.safeParse(body);

    if (!parsed.success) {
      return badRequestResponse(parsed.error.errors[0].message);
    }

    const data = parsed.data;

    const goat = await Goat.create({
      name: sanitizeString(data.name),
      breed: data.breed,
      weight: data.weight,
      age: sanitizeString(data.age),
      price: data.price,
      status: "sale",
      health: data.health,
      vaccinated: data.vaccinated,
      tag: data.tag ? sanitizeString(data.tag) : undefined,
      desc: sanitizeString(data.desc),
      images: data.images || [],
      videoUrl: data.videoUrl || undefined,
      seller: user.id,
      sellerName: user.name,
      sellerImg: user.avatar || "",
      sellerRating: 5.0,
      sellerReviews: 0,
      reviews: [],
      averageRating: 0,
      totalReviews: 0,
      views: 0,
      wishlistCount: 0,
    });

    return NextResponse.json({ success: true, data: goat }, { status: 201 });
  } catch (error) {
    console.error("Create goat error:", error);
    return serverErrorResponse();
  }
}
