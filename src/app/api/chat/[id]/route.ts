import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Chat from "@/models/Chat";
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
import { z } from "zod";

const messageSchema = z
  .object({
    text: z.string().max(2000, "Message is too long").optional().default(""),
    attachments: z.array(z.string()).optional().default([]),
  })
  .refine(
    (data) =>
      (data.text && data.text.trim().length > 0) ||
      (data.attachments && data.attachments.length > 0),
    { message: "Message must contain text or an attachment" }
  );

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return notFoundResponse("Chat not found");
    }

    await connectDB();
    const chat = await Chat.findById(id).lean();
    if (!chat) {
      return notFoundResponse("Chat not found");
    }

    // Authorization: Only conversation participants or admin can access
    const isCustomer = chat.customer.toString() === user.id;
    const isSeller = chat.seller.toString() === user.id;
    const isAdmin = user.role === "admin";

    if (!isCustomer && !isSeller && !isAdmin) {
      return forbiddenResponse("You are not authorized to view this chat");
    }

    return NextResponse.json({ success: true, data: chat });
  } catch (error) {
    console.error("Get chat error:", error);
    return serverErrorResponse();
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return notFoundResponse("Chat not found");
    }

    const body = await req.json();
    const parsed = messageSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestResponse(parsed.error.errors[0].message);
    }

    await connectDB();
    const chat = await Chat.findById(id);
    if (!chat) {
      return notFoundResponse("Chat not found");
    }

    // Authorization: Only participants or admin can send messages
    const isCustomer = chat.customer.toString() === user.id;
    const isSeller = chat.seller.toString() === user.id;
    const isAdmin = user.role === "admin";

    if (!isCustomer && !isSeller && !isAdmin) {
      return forbiddenResponse("You are not authorized to send messages in this chat");
    }

    const cleanText = parsed.data.text ? sanitizeString(parsed.data.text) : "";
    const attachments = parsed.data.attachments || [];

    const message = {
      from: user.id as any,
      fromName: user.name,
      fromRole: user.role,
      text: cleanText || (attachments.length > 0 ? "📎 Media attachment" : ""),
      attachments,
      read: false,
      createdAt: new Date(),
    };

    chat.messages.push(message as any);
    chat.lastMessage = cleanText || "📎 Media attachment";
    chat.lastMessageAt = new Date();

    if (user.role === "customer" || isCustomer) {
      chat.unreadCount.seller = (chat.unreadCount.seller || 0) + 1;
    } else {
      chat.unreadCount.customer = (chat.unreadCount.customer || 0) + 1;
    }

    await chat.save();
    const newMsg = chat.messages[chat.messages.length - 1];

    return NextResponse.json({ success: true, data: newMsg });
  } catch (error) {
    console.error("Send message error:", error);
    return serverErrorResponse();
  }
}
