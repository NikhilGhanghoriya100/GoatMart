import Razorpay from "razorpay";
import crypto from "crypto";

const keyId = process.env.RAZORPAY_KEY_ID || "";
const keySecret = process.env.RAZORPAY_KEY_SECRET || "";

export const razorpay = new Razorpay({
  key_id: keyId || "rzp_test_placeholder",
  key_secret: keySecret || "rzp_secret_placeholder",
});

export async function createRazorpayOrder(amount: number, receipt: string) {
  const currentKey = process.env.RAZORPAY_KEY_ID;
  const currentSecret = process.env.RAZORPAY_KEY_SECRET;

  if (!currentKey || !currentSecret) {
    throw new Error(
      "Razorpay credentials missing. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.local"
    );
  }

  const rzpInstance = new Razorpay({
    key_id: currentKey,
    key_secret: currentSecret,
  });

  try {
    const order = await rzpInstance.orders.create({
      amount: Math.round(amount * 100), // Amount in paise
      currency: "INR",
      receipt,
      notes: { platform: "GoatMart" },
    });
    return order;
  } catch (error: any) {
    const desc = error?.error?.description || error?.message || "Razorpay API error";
    if (error?.statusCode === 401 || desc.toLowerCase().includes("auth")) {
      throw new Error(
        "Razorpay Authentication Failed (401): आपकी RAZORPAY_KEY_ID या RAZORPAY_KEY_SECRET गलत या एक्सपायर्ड है। कृपया Razorpay Dashboard से सही API Key '.env.local' में दर्ज करें।"
      );
    }
    throw new Error(`Razorpay Error: ${desc}`);
  }
}

export async function fetchRazorpayPayment(paymentId: string) {
  const currentKey = process.env.RAZORPAY_KEY_ID;
  const currentSecret = process.env.RAZORPAY_KEY_SECRET;

  if (!currentKey || !currentSecret) {
    throw new Error(
      "Razorpay credentials missing. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.local"
    );
  }

  const rzpInstance = new Razorpay({
    key_id: currentKey,
    key_secret: currentSecret,
  });

  try {
    const payment = await rzpInstance.payments.fetch(paymentId);
    return payment;
  } catch (error: any) {
    const desc = error?.error?.description || error?.message || "Failed to fetch Razorpay payment";
    throw new Error(`Razorpay Payment Fetch Error: ${desc}`);
  }
}

/**
 * Timing-safe HMAC verification for Razorpay payment signatures
 */
export function verifyPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean {
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return false;
  }

  const secret = process.env.RAZORPAY_KEY_SECRET || "";
  if (!secret) return false;

  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");

  try {
    const expectedBuf = Buffer.from(expected, "utf8");
    const signatureBuf = Buffer.from(razorpaySignature, "utf8");
    if (expectedBuf.length !== signatureBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, signatureBuf);
  } catch {
    return false;
  }
}

/**
 * Timing-safe HMAC verification for Razorpay webhook signatures.
 * Verifies that the raw request body was signed by Razorpay using RAZORPAY_WEBHOOK_SECRET.
 */
export function validateWebhookSignature(
  rawBody: string,
  signature: string,
  secret?: string
): boolean {
  if (!rawBody || !signature) {
    return false;
  }

  const webhookSecret = secret || process.env.RAZORPAY_WEBHOOK_SECRET || "";
  if (!webhookSecret) {
    return false;
  }

  try {
    const expected = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const expectedBuf = Buffer.from(expected, "utf8");
    const signatureBuf = Buffer.from(signature, "utf8");
    if (expectedBuf.length !== signatureBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, signatureBuf);
  } catch {
    return false;
  }
}

export const verifyWebhookSignature = validateWebhookSignature;

/**
 * Creates a server-side refund for a paid Razorpay payment.
 * Requires authoritative server credentials; never accepts client keys.
 */
export async function createRazorpayRefund(params: {
  paymentId: string;
  amountPaise?: number;
  notes?: Record<string, string>;
  receipt?: string;
}) {
  const currentKey = process.env.RAZORPAY_KEY_ID;
  const currentSecret = process.env.RAZORPAY_KEY_SECRET;

  if (!currentKey || !currentSecret) {
    throw new Error(
      "Razorpay credentials missing. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.local"
    );
  }

  const rzpInstance = new Razorpay({
    key_id: currentKey,
    key_secret: currentSecret,
  });

  try {
    const refundPayload: any = {};
    if (typeof params.amountPaise === "number" && params.amountPaise > 0) {
      refundPayload.amount = params.amountPaise;
    }
    if (params.notes) {
      refundPayload.notes = params.notes;
    }
    if (params.receipt) {
      refundPayload.receipt = params.receipt;
    }

    const refund = await rzpInstance.payments.refund(params.paymentId, refundPayload);
    return refund;
  } catch (error: any) {
    const desc = error?.error?.description || error?.message || "Razorpay Refund API error";
    throw new Error(`Razorpay Refund Error: ${desc}`);
  }
}

export interface RazorpayTransferResultItem {
  id: string;
  entity: string;
  status: "processed" | "pending" | "failed";
  source: string;
  recipient: string;
  amount: number;
  currency: string;
  amount_reversed?: number;
  notes?: Record<string, string>;
  fees?: number;
  tax?: number;
  on_hold?: boolean;
  settlement_id?: string | null;
  created_at?: number;
  processed_at?: number;
}

export interface CreatePaymentTransferParams {
  paymentId: string;
  recipientAccountId: string;
  amountPaise: number;
  currency?: string;
  notes?: Record<string, string>;
}

/**
 * Creates a server-side transfer from a captured Razorpay payment to a linked seller account.
 * Uses official Razorpay Route SDK method: `rzpInstance.payments.transfer(paymentId, params)`.
 * Requires authoritative server credentials; never accepts client keys or client-controlled amounts.
 */
export async function createRazorpayPaymentTransfer(
  params: CreatePaymentTransferParams
): Promise<RazorpayTransferResultItem> {
  const currentKey = process.env.RAZORPAY_KEY_ID;
  const currentSecret = process.env.RAZORPAY_KEY_SECRET;

  if (!currentKey || !currentSecret) {
    throw new Error(
      "Razorpay credentials missing. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.local"
    );
  }

  if (!params.paymentId || typeof params.paymentId !== "string") {
    throw new Error("Invalid paymentId: must be a valid Razorpay payment ID");
  }

  if (!params.recipientAccountId || typeof params.recipientAccountId !== "string") {
    throw new Error("Invalid recipientAccountId: must be a valid Razorpay linked account ID");
  }

  if (!Number.isInteger(params.amountPaise) || params.amountPaise <= 0) {
    throw new Error("Invalid amountPaise: must be a positive integer in paise");
  }

  const rzpInstance = new Razorpay({
    key_id: currentKey,
    key_secret: currentSecret,
  });

  try {
    const transferPayload = {
      transfers: [
        {
          account: params.recipientAccountId,
          amount: params.amountPaise,
          currency: params.currency || "INR",
          notes: params.notes || {},
        },
      ],
    };

    const response: any = await rzpInstance.payments.transfer(params.paymentId, transferPayload);
    const transferItem =
      response?.transfers?.items?.[0] || response?.items?.[0] || response;

    return transferItem as RazorpayTransferResultItem;
  } catch (error: any) {
    const desc = error?.error?.description || error?.message || "Razorpay Route Transfer API error";
    throw new Error(`Razorpay Transfer Error: ${desc}`);
  }
}


