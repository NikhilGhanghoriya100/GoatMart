import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Order from "@/models/Order";
import Goat from "@/models/Goat";
import { verifyPaymentSignature } from "@/lib/razorpay";
import {
  getAuthUser,
  isValidObjectId,
  unauthorizedResponse,
  forbiddenResponse,
  badRequestResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/security";
import { z } from "zod";

const verifySchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  razorpayOrderId: z.string().min(1, "Razorpay Order ID is required"),
  razorpayPaymentId: z.string().min(1, "Razorpay Payment ID is required"),
  razorpaySignature: z.string().min(1, "Razorpay Signature is required"),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const body = await req.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return badRequestResponse(parsed.error.errors[0].message);
    }

    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = parsed.data;

    if (!isValidObjectId(orderId)) {
      return badRequestResponse("Invalid order ID format");
    }

    await connectDB();
    const order = await Order.findById(orderId);
    if (!order) {
      return notFoundResponse("Order not found");
    }

    // Authorization Integrity: Verify this order belongs to the requesting customer
    if (order.customer.toString() !== user.id && user.role !== "admin") {
      return forbiddenResponse("You are not authorized to verify this order");
    }

    // Cryptographic signature check
    const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) {
      return badRequestResponse("Payment signature verification failed");
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-IN", { month: "short", day: "numeric" });

    order.status = "payment_confirmed";
    order.payment.razorpayPaymentId = razorpayPaymentId;
    order.payment.razorpaySignature = razorpaySignature;
    order.payment.status = "paid";
    order.payment.paidAt = now;

    if (order.timeline && order.timeline.length > 1) {
      order.timeline[1] = { s: "Payment Confirmed", d: dateStr, done: true };
    }

    await order.save();
    await Goat.findByIdAndUpdate(order.goat, { status: "sold" });

    return NextResponse.json({
      success: true,
      message: "Payment successfully verified and order confirmed",
      data: { orderId: order.orderId },
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return serverErrorResponse();
  }
}
