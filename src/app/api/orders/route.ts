import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Order from "@/models/Order";
import Goat from "@/models/Goat";
import { createRazorpayOrder } from "@/lib/razorpay";
import {
  getAuthUser,
  isValidObjectId,
  unauthorizedResponse,
  badRequestResponse,
  notFoundResponse,
  serverErrorResponse,
  sanitizeString,
} from "@/lib/security";
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

    // Integrity: Ensure goat is currently available for sale
    if (goat.status !== "sale") {
      return badRequestResponse(
        goat.status === "sold"
          ? "This goat has already been sold"
          : "This goat is currently reserved by another buyer"
      );
    }

    const rzpOrder = await createRazorpayOrder(goat.price, `goat_${goatId}`);

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

    const order = await Order.create({
      goat: goatId,
      goatName: goat.name,
      goatBreed: goat.breed,
      goatImage: goat.images[0] || "",
      seller: goat.seller,
      sellerName: goat.sellerName,
      customer: user.id,
      customerName: user.name,
      amount: goat.price,
      status: "pending",
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

    return NextResponse.json({
      success: true,
      data: {
        orderId: order._id.toString(),
        razorpayOrderId: rzpOrder.id,
        amount: goat.price,
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
        isMock: (rzpOrder as any).isMock ?? false,
      },
    });
  } catch (error: any) {
    console.error("Create order error:", error);
    return serverErrorResponse(error?.message || "An unexpected server error occurred");
  }
}
