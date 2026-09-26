import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import connectDB from "@/lib/db";
import Goat from "@/models/Goat";
import {
  getAuthUser,
  isValidObjectId,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  badRequestResponse,
  serverErrorResponse,
  sanitizeString,
} from "@/lib/security";
import { BREEDS } from "@/types";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const goatImageSchema = z
  .string()
  .url("Image must be a valid HTTP/HTTPS URL")
  .or(z.string().regex(/^data:image\//, "Legacy image data URI"));

const updateGoatSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  breed: z.enum(BREEDS as unknown as [string, ...string[]]).optional(),
  weight: z.number().positive().max(300).optional(),
  age: z.string().min(1).max(50).optional(),
  price: z.number().positive().max(10000000).optional(),
  deliveryCharge: z.number().min(0).max(100000).optional(),
  status: z.enum(["sale", "sold", "reserved"]).optional(),
  health: z.enum(["Excellent", "Good", "Fair"]).optional(),
  vaccinated: z.boolean().optional(),
  tag: z.string().max(50).optional().nullable(),
  desc: z.string().min(10).max(2000).optional(),
  images: z.array(goatImageSchema).optional(),
  videoUrl: z.string().url().optional().nullable().or(z.literal("")),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return notFoundResponse("Goat not found");
    }

    await connectDB();
    const goat = await Goat.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true }
    ).lean();

    if (!goat) {
      return notFoundResponse("Goat not found");
    }

    return NextResponse.json(
      { success: true, data: goat },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("Get goat error:", error);
    return serverErrorResponse();
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return notFoundResponse("Goat not found");
    }

    await connectDB();
    const goat = await Goat.findById(id);
    if (!goat) {
      return notFoundResponse("Goat not found");
    }

    // Ownership Authorization: Only the listing's seller or an admin can edit
    const isOwner = goat.seller && goat.seller.toString() === user.id;
    const isAdmin = user.role === "admin";
    if (!isAdmin && !isOwner) {
      return forbiddenResponse("You are not authorized to edit this listing");
    }

    const body = await req.json();
    const parsed = updateGoatSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestResponse(parsed.error.errors[0].message);
    }

    // Explicitly whitelist updates to prevent mass assignment
    const updateData: Record<string, unknown> = {};
    const validData = parsed.data;

    if (validData.name !== undefined) updateData.name = sanitizeString(validData.name);
    if (validData.breed !== undefined) updateData.breed = validData.breed;
    if (validData.weight !== undefined) updateData.weight = validData.weight;
    if (validData.age !== undefined) updateData.age = sanitizeString(validData.age);
    if (validData.price !== undefined) updateData.price = validData.price;
    if (validData.deliveryCharge !== undefined) updateData.deliveryCharge = validData.deliveryCharge;
    if (validData.status !== undefined) updateData.status = validData.status;
    if (validData.health !== undefined) updateData.health = validData.health;
    if (validData.vaccinated !== undefined) updateData.vaccinated = validData.vaccinated;
    if (validData.tag !== undefined) updateData.tag = validData.tag ? sanitizeString(validData.tag) : undefined;
    if (validData.desc !== undefined) updateData.desc = sanitizeString(validData.desc);
    if (validData.images !== undefined) updateData.images = validData.images;
    if (validData.videoUrl !== undefined) updateData.videoUrl = validData.videoUrl || undefined;

    const updated = await Goat.findByIdAndUpdate(id, updateData, { new: true }).lean();

    revalidatePath("/", "page");
    revalidatePath("/shop", "page");
    revalidatePath(`/goat/${id}`, "page");
    revalidatePath("/seller", "page");
    revalidatePath("/", "layout");

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Update goat error:", error);
    return serverErrorResponse();
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return notFoundResponse("Goat not found");
    }

    await connectDB();
    const goat = await Goat.findById(id);
    if (!goat) {
      return notFoundResponse("Goat not found");
    }

    // Ownership Authorization: Only the listing's seller or an admin can delete
    const isOwner = goat.seller && goat.seller.toString() === user.id;
    const isAdmin = user.role === "admin";
    if (!isAdmin && !isOwner) {
      return forbiddenResponse("You are not authorized to delete this listing");
    }

    const deleteResult = await goat.deleteOne();
    if (!deleteResult || deleteResult.acknowledged === false) {
      return serverErrorResponse("Failed to delete listing from database");
    }

    // Server-side cache invalidation for all affected routes and layouts
    revalidatePath("/", "page");
    revalidatePath("/shop", "page");
    revalidatePath(`/goat/${id}`, "page");
    revalidatePath("/seller", "page");
    revalidatePath("/", "layout");

    return NextResponse.json(
      {
        success: true,
        message: "Listing deleted successfully",
        data: { id },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("Delete goat error:", error);
    return serverErrorResponse();
  }
}
