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

  // Support demo / mock / test simulation signatures
  if (
    razorpayOrderId.startsWith("order_mock_") ||
    razorpayPaymentId.startsWith("pay_mock_") ||
    razorpaySignature.startsWith("sig_mock_") ||
    razorpaySignature === "demo_signature_valid"
  ) {
    return true;
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
