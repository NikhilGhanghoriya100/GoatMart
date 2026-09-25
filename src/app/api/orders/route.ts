import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Order from "@/models/Order";
import Goat from "@/models/Goat";
import { createRazorpayOrder } from "@/lib/razorpay";
import { calculateOrderFinancials } from "@/lib/commission";
import {
  getAuthUser,
  isValidObjectId,
  unauthorizedResponse,
  badRequestResponse,
  notFoundResponse,
  serverErrorResponse,
  sanitizeString,
} from "@/lib/security";
import { logFinancialEvent } from "@/lib/auditLogger";
import { z } from "zod";

const deliverySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  phone: z.string().regex(/^\d{10}$/, "Phone must be a valid 10-digit number"),
  email: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  address: z.string().min(5, "Address must be at least 5 characters").max(300),
  city: z.string().min(2, "City is required").max(100),
  state: z.string().min(2, "State is required").max(100),
  pin: z.string().regex(/^\d{6}$/, "PIN code must be a valid 6-digit number"),
  note: z.string().max(500).optional().nullable(),
});

const createOrderSchema = z.object({
  goatId: z.string().min(1, "Goat ID is required"),
  delivery: deliverySchema,
});

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    await connectDB();

    // RBAC: Role-filtered orders
    const query =
      user.role === "admin"
        ? {}
        : user.role === "seller"
        ? { seller: user.id }
        : { customer: user.id };

    const orders = await Order.find(query).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    console.error("Fetch orders error:", error);
    return serverErrorResponse();
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const body = await req.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestResponse(parsed.error.errors[0].message);
    }

    const { goatId, delivery } = parsed.data;
    if (!isValidObjectId(goatId)) {
      return badRequestResponse("Invalid Goat ID format");
    }

    await connectDB();
    const goat = await Goat.findById(goatId);
    if (!goat) {
      return notFoundResponse("Goat listing not found");
    }

    // Integrity: Prevent sellers from buying their own goats
    if (goat.seller.toString() === user.id) {
      return badRequestResponse("You cannot purchase your own goat listing");
    }

    // Atomically reserve the goat only if it is currently 'sale'
    const reservedGoat = await Goat.findOneAndUpdate(
      { _id: goatId, status: "sale" },
      { $set: { status: "reserved" } },
      { new: true }
    );

    if (!reservedGoat) {
      return badRequestResponse(
        goat.status === "sold"
          ? "This goat has already been sold"
          : "This goat is currently reserved by another buyer"
      );
    }

    const deliveryCharge =
      typeof reservedGoat.deliveryCharge === "number" && reservedGoat.deliveryCharge >= 0
        ? reservedGoat.deliveryCharge
        : 0;

    // Phase 2: Compute authoritative server-side financial snapshot
    const financials = calculateOrderFinancials(reservedGoat.price, { deliveryCharge });

    const totalOrderAmount = financials.totalAmount ?? (financials.sellerBasePrice + (financials.deliveryCharge ?? 0));
    let rzpOrder: any;
    try {
      rzpOrder = await createRazorpayOrder(totalOrderAmount, `goat_${goatId}`);
    } catch (rzpErr) {
      // Revert reservation if Razorpay order creation fails
      await Goat.findByIdAndUpdate(goatId, { status: "sale" });
      throw rzpErr;
    }

    const sanitizedDelivery = {
      name: sanitizeString(delivery.name),
      phone: sanitizeString(delivery.phone),
      email: delivery.email ? sanitizeString(delivery.email) : user.email,
      address: sanitizeString(delivery.address),
      city: sanitizeString(delivery.city),
      state: sanitizeString(delivery.state),
      pin: sanitizeString(delivery.pin),
      note: delivery.note ? sanitizeString(delivery.note) : "",
    };

    let order;
    try {
      order = await Order.create({
        goat: goatId,
        goatName: reservedGoat.name,
        goatBreed: reservedGoat.breed,
        goatImage: reservedGoat.images[0] || "",
        seller: reservedGoat.seller,
        sellerName: reservedGoat.sellerName,
        customer: user.id,
        customerName: user.name,
        amount: financials.totalAmount,
        status: "pending",

        // Phase 2: Permanent immutable financial snapshot
        sellerBasePrice: financials.sellerBasePrice,
        deliveryCharge: financials.deliveryCharge,
        buyerPlatformFee: financials.buyerPlatformFee,
        sellerDeliveryAmount: financials.sellerDeliveryAmount,
        sellerGoatNet: financials.sellerGoatNet,
        commissionRate: financials.commissionRate,
        commissionAmount: financials.commissionAmount,
        sellerNetPayable: financials.sellerNetPayable,
        currency: financials.currency,
        financialCalculationVersion: financials.financialCalculationVersion,
        financialCalculatedAt: financials.financialCalculatedAt,

        payment: {
          razorpayOrderId: rzpOrder.id,
          status: "pending",
        },
        delivery: sanitizedDelivery,
        timeline: [
          {
            s: "Order Placed",
            d: new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
            done: true,
          },
          { s: "Payment Confirmed", d: "", done: false },
          { s: "Dispatched", d: "", done: false },
          { s: "Out for Delivery", d: "", done: false },
          { s: "Delivered", d: "", done: false },
        ],
      });
      // Link the reserved goat to this order
      await Goat.findByIdAndUpdate(goatId, { $set: { currentOrderId: order._id } });
    } catch (dbErr) {
      // Revert reservation if database order record creation fails
      await Goat.findByIdAndUpdate(goatId, { status: "sale", currentOrderId: null });
      throw dbErr;
    }

    // -------------------------------------------------------------------------
    // AUDIT: payment_initiated
    // Fired once, after Razorpay order + DB order are both successfully created.
    // Records the Razorpay order ID (payment session reference) and the buyer.
    // providerReference = rzpOrder.id (Razorpay order ID, not a secret/key).
    // -------------------------------------------------------------------------
    logFinancialEvent({
      action: "payment_initiated",
      entityType: "payment",
      entityId: rzpOrder.id,
      orderId: order._id.toString(),
      actorId: user.id,
      actorRole: "customer",
      actorName: user.name || "",
      amount: order.amount,
      currency: order.currency || "INR",
      previousState: undefined,
      newState: "pending",
      providerReference: rzpOrder.id,
      status: "success",
      metadata: {
        goatId,
        razorpayOrderId: rzpOrder.id,
      },
    });

    // -------------------------------------------------------------------------
    // AUDIT: snapshot_created
    // Fired once, after the immutable financial snapshot is persisted in Order.create().
    // Creation and finalization are a single atomic DB write — there is no distinct
    // "finalization" point. This single event represents the permanent snapshot.
    // Records all stored financial fields from the saved order document.
    // Does NOT recalculate values — reads them from the authoritative stored order.
    // -------------------------------------------------------------------------
    logFinancialEvent({
      action: "snapshot_created",
      entityType: "order",
      entityId: order._id.toString(),
      orderId: order._id.toString(),
      actorId: user.id,
      actorRole: "customer",
      actorName: user.name || "",
      amount: order.sellerBasePrice,
      currency: order.currency || "INR",
      previousState: undefined,
      newState: "snapshot_persisted",
      status: "success",
      metadata: {
        sellerBasePrice: order.sellerBasePrice,
        deliveryCharge: order.deliveryCharge,
        buyerPlatformFee: order.buyerPlatformFee,
        sellerDeliveryAmount: order.sellerDeliveryAmount,
        sellerGoatNet: order.sellerGoatNet,
        commissionRate: order.commissionRate,
        commissionAmount: order.commissionAmount,
        sellerNetPayable: order.sellerNetPayable,
        financialCalculationVersion: order.financialCalculationVersion,
        currency: order.currency || "INR",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        orderId: order._id.toString(),
        razorpayOrderId: rzpOrder.id,
        amount: financials.totalAmount,
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
        isMock: false,
      },
    });
  } catch (error: any) {
    console.error("Create order error:", error);
    return serverErrorResponse(error?.message || "An unexpected server error occurred");
  }
}
