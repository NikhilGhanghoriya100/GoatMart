/**
 * GoatMart Seller Payment Details & Masking Engine
 * 
 * Provides server-side validation, secure masking, and sanitization
 * for seller UPI and Bank Account payment details.
 */

export interface ValidatedPaymentDetails {
  paymentMethod: "UPI" | "BANK";
  phone: string;
  upiId?: string;
  accountHolderName?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  paymentNote?: string;
}

/**
 * Masks a bank account number showing only the last 4 digits.
 * Example: "123456789012" -> "********9012"
 */
export function maskAccountNumber(accountNumber?: string): string {
  if (!accountNumber) return "";
  const cleaned = accountNumber.trim();
  if (cleaned.length <= 4) return cleaned;
  return "*".repeat(Math.max(4, cleaned.length - 4)) + cleaned.slice(-4);
}

/**
 * Masks a phone number showing only the last 4 digits.
 * Example: "9876543210" -> "******3210"
 */
export function maskPhoneNumber(phone?: string): string {
  if (!phone) return "";
  const cleaned = phone.trim();
  if (cleaned.length <= 4) return cleaned;
  return "*".repeat(Math.max(4, cleaned.length - 4)) + cleaned.slice(-4);
}

/**
 * Validates seller payment details input server-side.
 * Throws an Error with a descriptive user-safe message if validation fails.
 */
export function validateSellerPaymentDetailsInput(input: any): ValidatedPaymentDetails {
  if (!input || typeof input !== "object") {
    throw new Error("Invalid request payload: payment details object required");
  }

  // 1. Phone number validation
  const rawPhone = String(input.phone || "").trim();
  const cleanPhone = rawPhone.replace(/[\s\-\(\)]/g, "");
  // Standard Indian 10-digit mobile or international with +
  const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
  if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
    throw new Error("Please enter a valid 10-digit mobile phone number");
  }
  const normalizedPhone = cleanPhone.replace(/^\+91/, "");

  // 2. Payment Method
  const method = String(input.paymentMethod || "").trim().toUpperCase();
  if (method !== "UPI" && method !== "BANK") {
    throw new Error("Invalid payment method: must be either 'UPI' or 'BANK'");
  }

  const paymentNote = typeof input.paymentNote === "string" ? input.paymentNote.trim().slice(0, 500) : undefined;

  if (method === "UPI") {
    const rawUpi = String(input.upiId || "").trim().toLowerCase();
    // Valid UPI regex: standard handle e.g. name@okhdfcbank, 9876543210@paytm
    const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    if (!rawUpi || !upiRegex.test(rawUpi)) {
      throw new Error("Invalid UPI ID format. Expected format: username@bankhandle (e.g. 9876543210@upi)");
    }

    return {
      paymentMethod: "UPI",
      phone: normalizedPhone,
      upiId: rawUpi,
      paymentNote,
    };
  } else {
    // BANK Method
    const holder = String(input.accountHolderName || "").trim();
    if (!holder || holder.length < 2 || holder.length > 100) {
      throw new Error("Please enter a valid account holder name (2-100 characters)");
    }

    const bankName = String(input.bankName || "").trim();
    if (!bankName || bankName.length < 2 || bankName.length > 100) {
      throw new Error("Please enter a valid bank name (e.g. HDFC Bank, SBI)");
    }

    const rawAccount = String(input.accountNumber || "").trim().replace(/\s/g, "");
    // Standard Indian bank account: 9 to 18 digits numeric
    const accountRegex = /^\d{9,18}$/;
    if (!rawAccount || !accountRegex.test(rawAccount)) {
      throw new Error("Invalid bank account number: must be 9 to 18 numeric digits");
    }

    const rawIfsc = String(input.ifscCode || "").trim().toUpperCase();
    // RBI IFSC regex: 4 letters + '0' + 6 alphanumeric
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!rawIfsc || !ifscRegex.test(rawIfsc)) {
      throw new Error("Invalid IFSC code. Format: 4 letters, 0, then 6 alphanumeric characters (e.g. HDFC0001234)");
    }

    return {
      paymentMethod: "BANK",
      phone: normalizedPhone,
      accountHolderName: holder,
      bankName,
      accountNumber: rawAccount,
      ifscCode: rawIfsc,
      paymentNote,
    };
  }
}

/**
 * Returns a sanitized, safe representation of payment details for client / admin view.
 * Account number is masked to protect financial privacy.
 */
export function sanitizeSellerPaymentDetails(details: any, sellerPhone?: string) {
  if (!details) {
    return {
      hasDetails: false,
      verificationStatus: "not_submitted",
    };
  }

  const isBank = details.paymentMethod === "BANK";
  const maskedAcc = isBank ? maskAccountNumber(details.accountNumber) : undefined;

  return {
    hasDetails: true,
    paymentMethod: details.paymentMethod || "UPI",
    phone: details.phone || sellerPhone || "",
    maskedPhone: maskPhoneNumber(details.phone || sellerPhone || ""),
    upiId: details.upiId || "",
    accountHolderName: details.accountHolderName || "",
    bankName: details.bankName || "",
    maskedAccountNumber: maskedAcc || "",
    accountNumberMasked: maskedAcc || "",
    ifscCode: details.ifscCode || "",
    paymentNote: details.paymentNote || "",
    verificationStatus: details.verificationStatus || "not_submitted",
    verifiedAt: details.verifiedAt,
    rejectionReason: details.rejectionReason,
    updatedAt: details.updatedAt,
  };
}
