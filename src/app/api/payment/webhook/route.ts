import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Order from "@/models/Order";
import Goat from "@/models/Goat";
import { validateWebhookSignature } from "@/lib/razorpay";
import { confirmOrderPayment, markPaymentFailed } from "@/lib/orderPayment";
import { logFinancialEvent } from "@/lib/auditLogger";

/**
 * Production-ready, idempotent Razorpay webhook handler.
 * Verifies HMAC SHA-256 signatures against the raw request body.
 * Reconciles payments independently of client browser callbacks.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Read raw request body before any parsing (required for cryptographic signature matching)
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing x-razorpay-signature header" },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[Razorpay Webhook Error]: RAZORPAY_WEBHOOK_SECRET is not configured on server");
      return NextResponse.json(
        { error: "Webhook secret not configured on server" },
        { status: 500 }
      );
    }

    // 2. Cryptographic signature check (timing-safe HMAC SHA-256)
    const isValid = validateWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      console.warn("[Razorpay Webhook Warning]: Received webhook with invalid signature");
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 }
      );
    }

    // 3. Parse JSON payload
    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    await connectDB();

    const eventName: string = event.event || "";

    // 4. Handle supported events
    switch (eventName) {
      case "payment.captured": {
        const payment = event.payload?.payment?.entity;
        if (!payment) {
          return NextResponse.json({ status: "ok", message: "No payment entity found" });
        }

        const razorpayOrderId = payment.order_id;
        const razorpayPaymentId = payment.id;
        const amount = payment.amount;
        const currency = payment.currency;
        const method = payment.method;

        if (!razorpayOrderId || !razorpayPaymentId) {
          return NextResponse.json({ status: "ok", message: "Payment missing order_id or payment_id" });
        }

        const result = await confirmOrderPayment({
          razorpayOrderId,
          razorpayPaymentId,
          method,
          amountPaidPaise: typeof amount === "number" ? amount : undefined,
          currency,
        });

        return NextResponse.json({
          status: "ok",
          received: true,
          event: eventName,
          orderConfirmed: result.success,
          alreadyPaid: result.alreadyPaid ?? false,
        });
      }

      case "order.paid": {
        const orderEntity = event.payload?.order?.entity;
        const paymentEntity = event.payload?.payment?.entity;

        const razorpayOrderId = orderEntity?.id || paymentEntity?.order_id;
        const razorpayPaymentId = paymentEntity?.id;
        const amount = paymentEntity?.amount || orderEntity?.amount;
        const currency = paymentEntity?.currency || orderEntity?.currency;
        const method = paymentEntity?.method;

        if (razorpayOrderId && razorpayPaymentId) {
          const result = await confirmOrderPayment({
            razorpayOrderId,
            razorpayPaymentId,
            method,
            amountPaidPaise: typeof amount === "number" ? amount : undefined,
            currency,
          });

          return NextResponse.json({
            status: "ok",
            received: true,
            event: eventName,
            orderConfirmed: result.success,
            alreadyPaid: result.alreadyPaid ?? false,
          });
        }

        return NextResponse.json({
          status: "ok",
          received: true,
          event: eventName,
          message: "Order entity processed",
        });
      }

      case "payment.failed": {
        const payment = event.payload?.payment?.entity;
        const razorpayOrderId = payment?.order_id;
        const razorpayPaymentId = payment?.id;
        const reason = payment?.error_description || payment?.error_code || "Payment failed";

        if (razorpayOrderId || razorpayPaymentId) {
          await markPaymentFailed({
            razorpayOrderId,
            razorpayPaymentId,
            reason,
          });
        }

        return NextResponse.json({
          status: "ok",
          received: true,
          event: eventName,
          message: "Payment failure recorded",
        });
      }

      case "refund.created": {
        const refund = event.payload?.refund?.entity;
        if (!refund) {
          return NextResponse.json({ status: "ok", message: "No refund entity found" });
        }

        const paymentId = refund.payment_id;
        const refundId = refund.id;
        const amountPaise = refund.amount;

        if (paymentId) {
          const order = await Order.findOne({ "payment.razorpayPaymentId": paymentId });
          // Monotonic check: If already processed, DO NOT downgrade back to processing
          if (order && order.refund?.status !== "processed") {
            await Order.findByIdAndUpdate(order._id, {
              $set: {
                "refund.status": "processing",
                "refund.refundId": refundId,
                "refund.amount":
                  typeof amountPaise === "number" ? amountPaise / 100 : order.amount,
                "refund.currency": refund.currency || "INR",
                "refund.initiatedAt": order.refund?.initiatedAt || new Date(),
              },
            });
            // CRITICAL: DO NOT mark payment.status as refunded
            // CRITICAL: DO NOT mark order status as refunded
            // CRITICAL: DO NOT release or relist goat

            await logFinancialEvent({
              action: "refund_initiated",
              entityType: "refund",
              entityId: refundId,
              orderId: order._id.toString(),
              actorRole: "webhook",
              actorName: "Razorpay Webhook",
              amount: typeof amountPaise === "number" ? amountPaise / 100 : order.amount,
              currency: refund.currency || "INR",
              previousState: order.refund?.status || "none",
              newState: "processing",
              providerReference: refundId,
              status: "success",
              metadata: { orderNumber: order.orderId, webhookEvent: eventName },
            });
          }
        }

        return NextResponse.json({
          status: "ok",
          received: true,
          event: eventName,
          message: "Refund creation recorded as processing",
        });
      }

      case "refund.processed": {
        const refund = event.payload?.refund?.entity;
        if (!refund) {
          return NextResponse.json({ status: "ok", message: "No refund entity found" });
        }

        const paymentId = refund.payment_id;
        const refundId = refund.id;
        const amountPaise = refund.amount;

        if (paymentId) {
          const order = await Order.findOne({ "payment.razorpayPaymentId": paymentId });
          if (order) {
            // Idempotency: If already finalized, acknowledge safely
            if (order.status !== "refunded" || order.payment?.status !== "refunded") {
              const now = new Date();
              const dateStr = now.toLocaleDateString("en-IN", { month: "short", day: "numeric" });

              await Order.findByIdAndUpdate(order._id, {
                $set: {
                  status: "refunded",
                  "payment.status": "refunded",
                  "refund.status": "processed",
                  "refund.refundId": refundId,
                  "refund.amount":
                    typeof amountPaise === "number" ? amountPaise / 100 : order.amount,
                  "refund.currency": refund.currency || "INR",
                  "refund.processedAt": now,
                  "cancellation.cancelledAt": order.cancellation?.cancelledAt || now,
                },
                $push: {
                  timeline: {
                    s: "Refund Completed",
                    d: dateStr,
                    done: true,
                    updatedAt: now,
                  },
                },
              });

              // Race-safe Goat Release:
              // Only release if the goat is in status 'sold' AND tied to this order!
              // Never release if the goat is in 'reserved' or sold to another order!
              await Goat.findOneAndUpdate(
                {
                  _id: order.goat,
                  status: "sold",
                  $or: [
                    { currentOrderId: order._id },
                    { currentOrderId: null },
                    { currentOrderId: { $exists: false } },
                  ],
                },
                { $set: { status: "sale", currentOrderId: null } }
              );

              await logFinancialEvent({
                action: "refund_processed",
                entityType: "refund",
                entityId: refundId,
                orderId: order._id.toString(),
                actorRole: "webhook",
                actorName: "Razorpay Webhook",
                amount: typeof amountPaise === "number" ? amountPaise / 100 : order.amount,
                currency: refund.currency || "INR",
                previousState: order.refund?.status || "processing",
                newState: "processed",
                providerReference: refundId,
                status: "success",
                metadata: { orderNumber: order.orderId, webhookEvent: eventName },
              });
            }
          }
        }

        return NextResponse.json({
          status: "ok",
          received: true,
          event: eventName,
          message: "Refund processed successfully",
        });
      }

      case "refund.failed": {
        const refund = event.payload?.refund?.entity;
        if (refund?.payment_id) {
          const order = await Order.findOne({ "payment.razorpayPaymentId": refund.payment_id });
          // Monotonic check: Never downgrade a terminal processed refund to failed
          if (order && order.refund?.status !== "processed") {
            await Order.findByIdAndUpdate(order._id, {
              $set: {
                "refund.status": "failed",
                "refund.failedAt": new Date(),
                "refund.failureReason": "Webhook notified refund failed",
              },
            });
            // DO NOT mark order as refunded and DO NOT release goat

            await logFinancialEvent({
              action: "refund_failed",
              entityType: "refund",
              entityId: refund?.id || "unknown",
              orderId: order._id.toString(),
              actorRole: "webhook",
              actorName: "Razorpay Webhook",
              amount: typeof refund?.amount === "number" ? refund.amount / 100 : order.amount,
              currency: refund?.currency || "INR",
              previousState: order.refund?.status || "processing",
              newState: "failed",
              providerReference: refund?.id,
              status: "failure",
              reason: "Webhook notified refund failed",
              metadata: { orderNumber: order.orderId, webhookEvent: eventName },
            });
          }
        }

        return NextResponse.json({
          status: "ok",
          received: true,
          event: eventName,
          message: "Refund failure recorded",
        });
      }

      default: {
        // Acknowledge receipt of other Razorpay events without error
        return NextResponse.json({
          status: "ok",
          received: true,
          event: eventName,
          message: `Event ${eventName} acknowledged`,
        });
      }
    }
  } catch (error: any) {
    console.error("[Razorpay Webhook Internal Error]:", error?.message || error);
    return NextResponse.json(
      { error: "Internal server error processing webhook" },
      { status: 500 }
    );
  }
}
