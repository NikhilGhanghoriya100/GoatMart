import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Chat from "@/models/Chat";
import Goat from "@/models/Goat";
import {
  getAuthUser,
  isValidObjectId,
  unauthorizedResponse,
  badRequestResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/security";
import { z } from "zod";

const createChatSchema = z.object({
  goatId: z.string().min(1, "Goat ID is required"),
  // Optional fallback fields for static/demo goats not in DB
  goatName: z.string().optional(),
  goatImage: z.string().optional(),
  sellerId: z.string().optional(),
  sellerName: z.string().optional(),
});

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    await connectDB();

    const query =
      user.role === "admin"
        ? {}
        : user.role === "seller"
        ? { seller: user.id }
        : { customer: user.id };

    const chats = await Chat.find(query)
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .select("-messages")
      .lean();

    return NextResponse.json({ success: true, data: chats });
  } catch (error) {
    console.error("Fetch chats error:", error);
    return serverErrorResponse();
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const body = await req.json();
    const parsed = createChatSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestResponse(parsed.error.errors[0].message);
    }

    const { goatId, goatName, goatImage, sellerId, sellerName } = parsed.data;

    if (!isValidObjectId(goatId)) {
      return badRequestResponse("Invalid Goat ID format");
    }

    await connectDB();

    // Try to find goat in MongoDB
    let goat = await Goat.findById(goatId).lean() as any;

    // Fallback: if goat not in DB (demo/static goat), use provided metadata
    let finalGoatName = goat?.name || goatName || "Goat Listing";
    let finalGoatImage = goat?.images?.[0] || goatImage || "";
    let finalSellerId = goat?.seller?.toString() || sellerId || "000000000000000000000000";
    let finalSellerName = goat?.sellerName || sellerName || "Verified Seller";

    // If goat exists in DB, check seller isn't chatting with themselves
    if (goat && goat.seller?.toString() === user.id) {
      return badRequestResponse("You cannot start a chat for your own listing");
    }

    // Find existing chat or create new one
    let chat = await Chat.findOne({ goat: goatId, customer: user.id });
    if (!chat) {
      chat = await Chat.create({
        goat: goatId,
        goatName: finalGoatName,
        goatImage: finalGoatImage,
        customer: user.id,
        customerName: user.name,
        seller: finalSellerId,
        sellerName: finalSellerName,
        messages: [],
        unreadCount: { customer: 0, seller: 0 },
      });
    }

    return NextResponse.json({ success: true, data: chat });
  } catch (error) {
    console.error("Create chat error:", error);
    return serverErrorResponse();
  }
}
