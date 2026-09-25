import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Order, { OrderStatus } from "@/models/Order";
import Goat from "@/models/Goat";
import {
  getAuthUser,
  isValidObjectId,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  badRequestResponse,
  serverErrorResponse,
} from "@/lib/security";
import { cancelAndRefundOrder } from "@/lib/orderCancellation";
import { z } from "zod";

const updateOrderStatusSchema = z.object({
  status: z.enum([
    "pending",
    "payment_confirmed",
    "processing",
    "dispatched",
    "out_for_delivery",
    "delivered",
    "cancelled",
    "refunded",
  ]),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return notFoundResponse("Order not found");
    }

    await connectDB();
    const order = await Order.findById(id).lean();
    if (!order) {
      return notFoundResponse("Order not found");
    }

    // RBAC: Customer, Seller, or Admin
    const isCustomer = order.customer.toString() === user.id;
    const isSeller = order.seller.toString() === user.id;
    const isAdmin = user.role === "admin";

    if (!isCustomer && !isSeller && !isAdmin) {
      return forbiddenResponse("You are not authorized to view this order");
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error("Get order error:", error);
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
      return notFoundResponse("Order not found");
    }

    const body = await req.json();
    const parsed = updateOrderStatusSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestResponse(parsed.error.errors[0].message);
    }

    const { status } = parsed.data;

    await connectDB();
    const order = await Order.findById(id);
    if (!order) {
      return notFoundResponse("Order not found");
    }

    const isCustomer = order.customer.toString() === user.id;
    const isSeller = order.seller.toString() === user.id;
    const isAdmin = user.role === "admin";

    if (!isCustomer && !isSeller && !isAdmin) {
      return forbiddenResponse("You are not authorized to modify this order");
    }

    // If status is cancelled, route through authoritative cancel and refund engine
    if (status === "cancelled") {
      const cancelResult = await cancelAndRefundOrder({
        orderId: id,
        userId: user.id,
        userRole: user.role,
        reason: typeof body.reason === "string" ? body.reason : undefined,
      });

      if (!cancelResult.success) {
        if (cancelResult.code === "UNAUTHORIZED") {
          return forbiddenResponse(cancelResult.error);
        }
        if (cancelResult.code === "ORDER_NOT_FOUND") {
          return notFoundResponse(cancelResult.error);
        }
        return badRequestResponse(cancelResult.error || "Order cancellation failed");
      }

      return NextResponse.json({
        success: true,
        data: cancelResult.order,
        message: cancelResult.message,
      });
    }

    // Customer permissions: can only cancel orders
    if (isCustomer && !isSeller && !isAdmin) {
      return forbiddenResponse("Customers can only request order cancellation");
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    order.status = status as OrderStatus;

    // Update timeline progression
    if (order.timeline && order.timeline.length >= 5) {
      if (status === "processing" || status === "dispatched" || status === "out_for_delivery" || status === "delivered") {
        order.timeline[1] = { s: "Payment Confirmed", d: order.timeline[1]?.d || dateStr, done: true };
      }
      if (status === "dispatched" || status === "out_for_delivery" || status === "delivered") {
        order.timeline[2] = { s: "Dispatched", d: order.timeline[2]?.d || dateStr, done: true };
      }
      if (status === "out_for_delivery" || status === "delivered") {
        order.timeline[3] = { s: "Out for Delivery", d: order.timeline[3]?.d || dateStr, done: true };
      }
      if (status === "delivered") {
        order.timeline[4] = { s: "Delivered", d: dateStr, done: true };
        // Ensure goat status remains sold
        await Goat.findByIdAndUpdate(order.goat, { status: "sold" });
      }
    }

    await order.save();

    return NextResponse.json({
      success: true,
      data: order,
      message: `Order status updated to ${status}`,
    });
  } catch (error) {
    console.error("Update order status error:", error);
    return serverErrorResponse();
  }
}
