import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Order from "@/models/Order";
import Goat from "@/models/Goat";
import { verifyPaymentSignature, fetchRazorpayPayment } from "@/lib/razorpay";
import {
  getAuthUser,
  isValidObjectId,
  unauthorizedResponse,
  forbiddenResponse,
  badRequestResponse,
  notFoundResponse,
  serverErrorResponse,
  checkRateLimit,
  tooManyRequestsResponse,
} from "@/lib/security";
import { z } from "zod";

import { confirmOrderPayment } from "@/lib/orderPayment";

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

    // Rate limiting: 5 payment verification attempts per user per minute
    const rateCheck = checkRateLimit(`pay_verify:${user.id}`, 5, 60000);
    if (!rateCheck.allowed) {
      return tooManyRequestsResponse("Too many payment verification attempts. Please try again later.");
    }

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

    // Authorization Integrity: Verify this order belongs to the requesting customer or an admin
    if (order.customer.toString() !== user.id && user.role !== "admin") {
      return forbiddenResponse("You are not authorized to verify this order");
    }

    // Reject payment verification on cancelled orders
    if (order.status === "cancelled") {
      return badRequestResponse("This order has been cancelled and cannot be confirmed");
    }

    // Idempotency: If order is already paid, safely return success without duplicate processing
    if (order.payment?.status === "paid") {
      if (
        order.payment.razorpayPaymentId === razorpayPaymentId ||
        order.payment.razorpayOrderId === razorpayOrderId
      ) {
        return NextResponse.json({
          success: true,
          message: "Payment has already been verified for this order",
          data: { orderId: order.orderId },
        });
      }
      return badRequestResponse("Order has already been confirmed under another payment transaction");
    }

    // Integrity: Strictly verify that the submitted razorpayOrderId matches the order record
    if (!order.payment?.razorpayOrderId || order.payment.razorpayOrderId !== razorpayOrderId) {
      return badRequestResponse("Submitted Razorpay Order ID does not match the database order record");
    }

    // Cryptographic signature check (timing-safe HMAC)
    const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) {
      return badRequestResponse("Payment signature verification failed");
    }

    // Server-side verification with Razorpay API (do not rely on client-reported amounts or status)
    let paymentDetails: any = null;
    try {
      paymentDetails = await fetchRazorpayPayment(razorpayPaymentId);
      if (paymentDetails) {
        if (paymentDetails.order_id && paymentDetails.order_id !== razorpayOrderId) {
          return badRequestResponse("Payment transaction does not match this Razorpay order");
        }

        const expectedPaise = Math.round(order.amount * 100);
        if (typeof paymentDetails.amount === "number" && paymentDetails.amount !== expectedPaise) {
          return badRequestResponse("Paid amount does not match required order amount");
        }
      }
    } catch (apiErr: any) {
      // Log for audit; if Razorpay API call fails due to credentials or network, signature has already passed
      console.warn("Razorpay payment fetch detail check warning:", apiErr?.message);
    }

    // Atomically confirm payment and transition goat from reserved to sold
    const confirmation = await confirmOrderPayment({
      orderId: order._id,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      method: paymentDetails?.method,
      amountPaidPaise: typeof paymentDetails?.amount === "number" ? paymentDetails.amount : undefined,
    });

    if (!confirmation.success) {
      if (confirmation.code === "INVENTORY_COLLISION") {
        return NextResponse.json(
          {
            success: false,
            code: "INVENTORY_COLLISION",
            error: confirmation.error,
            message: confirmation.message,
          },
          { status: 409 }
        );
      }
      return badRequestResponse(confirmation.error || "Payment confirmation failed");
    }

    return NextResponse.json({
      success: true,
      message: confirmation.message || "Payment successfully verified and order confirmed",
      data: { orderId: order.orderId },
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return serverErrorResponse();
  }
}
