import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import Order from "@/models/Order";
import {
  getAuthUser,
  unauthorizedResponse,
  forbiddenResponse,
  badRequestResponse,
  notFoundResponse,
  serverErrorResponse,
  sanitizeString,
} from "@/lib/security";
import { logFinancialEvent } from "@/lib/auditLogger";
import { z } from "zod";

const addExpenseSchema = z.object({
  type: z.enum(["platform", "seller"]),
  amount: z.number().positive("Expense amount must be greater than zero"),
  reason: z.string().min(3, "Reason must be at least 3 characters").max(200),
});

/**
 * GET /api/admin/orders/[id]/expenses
 * Fetches recorded expenses for an order. Admin only.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();
    if (user.role !== "admin") return forbiddenResponse("Admin access required");

    const { id } = await context.params;
    if (!id) return notFoundResponse("Order ID is required");

    await connectDB();

    let query: any = { orderId: id };
    if (mongoose.Types.ObjectId.isValid(id)) {
      query = { $or: [{ _id: id }, { orderId: id }] };
    }

    const order = await Order.findOne(query).select("orderId expenses amount status").lean();
    if (!order) return notFoundResponse("Order record not found");

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.orderId,
        expenses: order.expenses || [],
      },
    });
  } catch (error) {
    console.error("Fetch order expenses error:", error);
    return serverErrorResponse();
  }
}

/**
 * POST /api/admin/orders/[id]/expenses
 * Records an authoritative admin-controlled expense (platform or seller) on an order.
 * Strictly forbidden from browser/customer requests.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();
    if (user.role !== "admin") return forbiddenResponse("Admin access required");

    const { id } = await context.params;
    if (!id) return notFoundResponse("Order ID is required");

    const body = await req.json();
    const parsed = addExpenseSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestResponse(parsed.error.errors[0].message);
    }

    const { type, amount, reason } = parsed.data;

    await connectDB();

    let query: any = { orderId: id };
    if (mongoose.Types.ObjectId.isValid(id)) {
      query = { $or: [{ _id: id }, { orderId: id }] };
    }

    const order = await Order.findOne(query);
    if (!order) return notFoundResponse("Order record not found");

    if (order.status === "refunded") {
      return badRequestResponse("Cannot add expenses to an order that has already been refunded");
    }

    const sanitizedReason = sanitizeString(reason);
    const now = new Date();

    const expenseEntry = {
      type,
      amount: Number(amount.toFixed(2)),
      reason: sanitizedReason,
      recordedBy: new mongoose.Types.ObjectId(user.id),
      recordedByRole: "admin",
      recordedAt: now,
    };

    order.expenses = order.expenses || [];
    order.expenses.push(expenseEntry as any);
    await order.save();

    await logFinancialEvent({
      action: "expense_recorded",
      entityType: "order",
      entityId: order._id.toString(),
      orderId: order._id.toString(),
      actorId: user.id,
      actorRole: "admin",
      amount: expenseEntry.amount,
      currency: order.currency || "INR",
      status: "success",
      reason: sanitizedReason,
      metadata: {
        orderNumber: order.orderId,
        expenseType: type,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${type === "platform" ? "Platform" : "Seller"} expense of ₹${expenseEntry.amount} recorded`,
      data: order.expenses,
    });
  } catch (error: any) {
    console.error("Record order expense error:", error);
    return serverErrorResponse(error?.message || "Failed to record order expense");
  }
}
