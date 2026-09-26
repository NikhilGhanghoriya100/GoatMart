/**
 * GoatMart Financial Commission Engine
 * 
 * Defines authoritative platform commission rules, rounding policies,
 * delivery charge accounting, cancellation refund engine, and deterministic
 * financial calculations for marketplace orders.
 */

/**
 * Safe parser for commission rate configuration.
 * Validates that rate is numeric, finite, non-negative, and <= 100%.
 * Rejects NaN, negative numbers, Infinity, and non-numeric strings.
 */
export function parseCommissionRate(value: unknown, defaultRate: number = 0): number {
  if (value === undefined || value === null || value === "") {
    return defaultRate;
  }
  const num = typeof value === "number" ? value : Number(String(value).trim());
  if (isNaN(num) || !isFinite(num) || num < 0 || num > 100) {
    console.warn(`[CommissionConfig Warning]: Invalid commission rate "${value}". Reverting to default ${defaultRate}%.`);
    return defaultRate;
  }
  return Number(num.toFixed(2));
}

/**
 * Authoritative platform commission configuration for GoatMart.
 * Active default: 0.0% Buyer Platform Fee, 0.0% Seller Platform Commission.
 * Can be configured via server-side environment variables without code rewrites (e.g. 0, 2, 3).
 * 
 * IMPORTANT: This configuration is ONLY applied when creating NEW orders.
 * Historical orders permanently store their immutable snapshot in MongoDB.
 */
export const PLATFORM_COMMISSION_RATE: number = parseCommissionRate(
  typeof process !== "undefined" ? process.env.PLATFORM_COMMISSION_RATE : undefined,
  0.0
);
export const PLATFORM_COMMISSION_BPS: number = Math.round(PLATFORM_COMMISSION_RATE * 100);

export const BUYER_PLATFORM_FEE_RATE: number = parseCommissionRate(
  typeof process !== "undefined" ? process.env.BUYER_PLATFORM_FEE_RATE : undefined,
  0.0
);
export const BUYER_PLATFORM_FEE_BPS: number = Math.round(BUYER_PLATFORM_FEE_RATE * 100);

export const REFUND_COMMISSION_BPS = 350; // 3.5% (350 / 10,000)
export const REFUND_COMMISSION_RATE = 3.5;
export const FINANCIAL_CALCULATION_VERSION = "1.0";
export const DEFAULT_CURRENCY = "INR";

export interface OrderFinancialSnapshot {
  sellerBasePrice: number;            // Authoritative goat price in INR (e.g. 20000)
  deliveryCharge?: number;            // Delivery charge in INR (e.g. 1000)
  buyerPlatformFee?: number;          // Buyer platform fee in INR (e.g. 400 = 2% of goat price only)
  buyerPlatformFeeRate?: number;      // Buyer platform fee rate percentage (e.g. 2.0)
  commissionRate: number;             // Percentage rate used at transaction time (e.g. 2.0)
  commissionAmount: number;           // Calculated platform commission in INR on goat price only (e.g. 400)
  sellerGoatNet?: number;             // Net payable to seller for goat in INR (e.g. 19600)
  sellerDeliveryAmount?: number;      // Delivery revenue to seller in INR (e.g. 1000)
  sellerNetPayable: number;           // Total net payable to seller in INR (e.g. 20600)
  totalAmount?: number;               // Total customer payment in INR (e.g. 21400 = 20000 + 1000 + 400)
  currency: string;                   // ISO Currency Code (e.g. "INR")
  financialCalculationVersion: string;// Calculation engine version (e.g. "1.0")
  financialCalculatedAt: Date;        // Timestamp when financial snapshot was generated
}

export interface RefundFinancialSnapshot {
  totalCustomerPaid: number;          // Total amount paid by customer (e.g. 21000)
  refundCommissionRate: number;       // Refund commission rate percentage (e.g. 3.5)
  refundCommissionAmount: number;     // Refund commission in INR (e.g. 735)
  platformExpense: number;            // Admin-approved platform expense (e.g. 0)
  sellerExpense: number;              // Admin-approved seller expense (e.g. 0)
  totalDeductions: number;            // Sum of refund commission + platform expense + seller expense
  finalRefundAmount: number;          // Final amount to refund to customer
  currency: string;
}

/**
 * Validates financial inputs to protect against invalid, negative, or corrupt states.
 */
export function validateFinancialInputs(
  sellerBasePrice: number,
  deliveryCharge: number = 0,
  commissionBps: number = PLATFORM_COMMISSION_BPS,
  buyerFeeBps: number = BUYER_PLATFORM_FEE_BPS
): void {
  if (typeof sellerBasePrice !== "number" || isNaN(sellerBasePrice)) {
    throw new Error("Invalid seller base price: must be a valid number");
  }
  if (!isFinite(sellerBasePrice)) {
    throw new Error("Invalid seller base price: must be a finite number");
  }
  if (sellerBasePrice <= 0) {
    throw new Error("Invalid seller base price: must be greater than zero");
  }
  if (typeof deliveryCharge !== "number" || isNaN(deliveryCharge) || !isFinite(deliveryCharge) || deliveryCharge < 0) {
    throw new Error("Invalid delivery charge: must be a non-negative finite number");
  }
  if (typeof commissionBps !== "number" || isNaN(commissionBps)) {
    throw new Error("Invalid commission rate: must be a valid number");
  }
  if (commissionBps < 0 || commissionBps > 10000) {
    throw new Error("Invalid commission rate: basis points must be between 0 and 10000 (0% - 100%)");
  }
  if (typeof buyerFeeBps !== "number" || isNaN(buyerFeeBps)) {
    throw new Error("Invalid buyer platform fee rate: must be a valid number");
  }
  if (buyerFeeBps < 0 || buyerFeeBps > 10000) {
    throw new Error("Invalid buyer platform fee rate: basis points must be between 0 and 10000 (0% - 100%)");
  }
}

export interface OrderFinancialOptions {
  deliveryCharge?: number;
  commissionBps?: number;
  buyerFeeBps?: number;
}

/**
 * Calculates platform commission, buyer platform fee, and seller net payable with deterministic integer-paise arithmetic.
 * 
 * Deterministic Policy:
 * 1. Base Price Conversion: The base price is converted to integer paise: Math.round(sellerBasePrice * 100)
 * 2. Delivery Charge Conversion: Math.round(deliveryCharge * 100)
 * 3. Buyer Platform Fee Calculation: 2.0% ONLY on goat price in integer paise:
 *    buyerFeePaise = Math.round((basePricePaise * buyerFeeBps) / 10000)
 * 4. Total Customer Amount: basePricePaise + deliveryPaise + buyerFeePaise
 * 5. Seller-side Commission Calculation: 2.0% ONLY on goat price in integer paise:
 *    commissionPaise = Math.round((basePricePaise * commissionBps) / 10000)
 * 6. Conservation of Money Invariants:
 *    sellerGoatNetPaise = basePricePaise - commissionPaise
 *    sellerDeliveryPaise = deliveryPaise (0% commission on delivery)
 *    sellerNetPayablePaise = sellerGoatNetPaise + sellerDeliveryPaise
 *    (commissionPaise + buyerFeePaise + sellerNetPayablePaise === totalAmountPaise) exactly.
 * 7. Conversion to Decimal INR: Values are safely converted back to decimal Rupees rounded to 2 decimal places.
 * 
 * @param sellerBasePrice - Authoritative goat price in Rupees from database record
 * @param deliveryOrOptionsOrBps - Delivery fee, options object ({ deliveryCharge, commissionBps, buyerFeeBps }), or legacy commissionBps
 * @param maybeCommissionBps - Optional commission rate in basis points when delivery fee is passed as 2nd arg
 * @returns OrderFinancialSnapshot - Immutable snapshot ready for persistence in Order document
 */
export function calculateOrderFinancials(
  sellerBasePrice: number,
  deliveryOrOptionsOrBps?: number | OrderFinancialOptions,
  maybeCommissionBps?: number
): OrderFinancialSnapshot {
  let deliveryCharge = 0;
  let commissionBps = PLATFORM_COMMISSION_BPS;
  let buyerFeeBps = BUYER_PLATFORM_FEE_BPS;

  if (typeof deliveryOrOptionsOrBps === "object" && deliveryOrOptionsOrBps !== null) {
    deliveryCharge = typeof deliveryOrOptionsOrBps.deliveryCharge === "number" ? deliveryOrOptionsOrBps.deliveryCharge : 0;
    commissionBps = typeof deliveryOrOptionsOrBps.commissionBps === "number" ? deliveryOrOptionsOrBps.commissionBps : PLATFORM_COMMISSION_BPS;
    buyerFeeBps = typeof deliveryOrOptionsOrBps.buyerFeeBps === "number" ? deliveryOrOptionsOrBps.buyerFeeBps : BUYER_PLATFORM_FEE_BPS;
  } else if (typeof maybeCommissionBps === "number") {
    deliveryCharge = typeof deliveryOrOptionsOrBps === "number" ? deliveryOrOptionsOrBps : 0;
    commissionBps = maybeCommissionBps;
  } else if (typeof deliveryOrOptionsOrBps === "number") {
    // 2-argument numerical call: preserves backward compatibility with regression test suites
    // where the 2nd argument was commissionBps (e.g. 0 BPS, 15000 BPS, -100 BPS)
    commissionBps = deliveryOrOptionsOrBps;
    deliveryCharge = 0;
    buyerFeeBps = 0; // Legacy 2-argument calls had no buyer platform fee
  }

  validateFinancialInputs(sellerBasePrice, deliveryCharge, commissionBps, buyerFeeBps);

  // 1. Work in integer paise to eliminate floating-point arithmetic errors
  const basePricePaise = Math.round(sellerBasePrice * 100);
  const deliveryPaise = Math.round((deliveryCharge || 0) * 100);
  const buyerFeePaise = Math.round((basePricePaise * buyerFeeBps) / 10000);
  const totalAmountPaise = basePricePaise + deliveryPaise + buyerFeePaise;

  // 2. Platform commission in paise ONLY on goat base price (rounded half-up at sub-paise level)
  const commissionPaise = Math.round((basePricePaise * commissionBps) / 10000);

  // 3. Seller Goat Net derived by subtraction (guarantees conservation of money on goat price)
  const sellerGoatNetPaise = basePricePaise - commissionPaise;

  // 4. Seller Delivery Amount is 100% to seller (0% platform commission on delivery)
  const sellerDeliveryPaise = deliveryPaise;

  // 5. Total Seller Net Payable
  const sellerNetPayablePaise = sellerGoatNetPaise + sellerDeliveryPaise;

  // Invariant assertions
  if (commissionPaise < 0) {
    throw new Error("Integrity error: calculated commission cannot be negative");
  }
  if (buyerFeePaise < 0) {
    throw new Error("Integrity error: buyer platform fee cannot be negative");
  }
  if (sellerGoatNetPaise < 0) {
    throw new Error("Integrity error: seller goat net cannot be negative");
  }
  if (sellerNetPayablePaise < 0) {
    throw new Error("Integrity error: seller net payable cannot be negative");
  }
  if (commissionPaise > basePricePaise) {
    throw new Error("Integrity error: commission amount cannot exceed seller base price");
  }
  if (commissionPaise + sellerGoatNetPaise !== basePricePaise) {
    throw new Error("Accounting invariant failed: commissionPaise + sellerGoatNetPaise !== basePricePaise");
  }
  if (commissionPaise + buyerFeePaise + sellerNetPayablePaise !== totalAmountPaise) {
    throw new Error("Accounting invariant failed: commissionPaise + buyerFeePaise + sellerNetPayablePaise !== totalAmountPaise");
  }

  // 6. Convert back to Rupees with exactly 2 decimal precision
  const commissionRate = Number((commissionBps / 100).toFixed(2));
  const commissionAmount = Number((commissionPaise / 100).toFixed(2));
  const buyerPlatformFee = Number((buyerFeePaise / 100).toFixed(2));
  const buyerPlatformFeeRate = Number((buyerFeeBps / 100).toFixed(2));
  const sellerGoatNet = Number((sellerGoatNetPaise / 100).toFixed(2));
  const sellerDeliveryAmount = Number((sellerDeliveryPaise / 100).toFixed(2));
  const sellerNetPayable = Number((sellerNetPayablePaise / 100).toFixed(2));
  const basePriceRupees = Number((basePricePaise / 100).toFixed(2));
  const deliveryRupees = Number((deliveryPaise / 100).toFixed(2));
  const totalAmountRupees = Number((totalAmountPaise / 100).toFixed(2));

  return {
    sellerBasePrice: basePriceRupees,
    deliveryCharge: deliveryRupees,
    buyerPlatformFee,
    buyerPlatformFeeRate,
    commissionRate,
    commissionAmount,
    sellerGoatNet,
    sellerDeliveryAmount,
    sellerNetPayable,
    totalAmount: totalAmountRupees,
    currency: DEFAULT_CURRENCY,
    financialCalculationVersion: FINANCIAL_CALCULATION_VERSION,
    financialCalculatedAt: new Date(),
  };
}

/**
 * Calculates authoritative refund financials for order cancellation.
 * 
 * Rules:
 * 1. Refund commission = 3.5% of TOTAL customer payment (goat price + delivery).
 * 2. Deduct actual applicable Platform Expense (defaults to 0, admin-controlled).
 * 3. Deduct actual applicable Seller Expense (defaults to 0, admin-controlled).
 * 4. Final Refund = Total Customer Payment - 3.5% refund commission - Platform Expense - Seller Expense.
 * 
 * @param totalPaid - Total customer payment in Rupees
 * @param platformExpense - Platform expenses incurred (INR, defaults to 0)
 * @param sellerExpense - Seller expenses incurred (INR, defaults to 0)
 * @param refundBps - Refund commission in basis points (defaults to 350 = 3.5%)
 */
export function calculateRefundFinancials(
  totalPaid: number,
  platformExpense: number = 0,
  sellerExpense: number = 0,
  refundBps: number = REFUND_COMMISSION_BPS
): RefundFinancialSnapshot {
  if (typeof totalPaid !== "number" || isNaN(totalPaid) || !isFinite(totalPaid) || totalPaid <= 0) {
    throw new Error("Invalid total customer paid: must be a positive finite number");
  }
  const cleanPlatformExpense = Math.max(0, typeof platformExpense === "number" && isFinite(platformExpense) ? platformExpense : 0);
  const cleanSellerExpense = Math.max(0, typeof sellerExpense === "number" && isFinite(sellerExpense) ? sellerExpense : 0);

  const totalPaidPaise = Math.round(totalPaid * 100);
  const platformExpensePaise = Math.round(cleanPlatformExpense * 100);
  const sellerExpensePaise = Math.round(cleanSellerExpense * 100);

  // Refund commission: 3.5% of TOTAL customer payment
  const refundCommissionPaise = Math.round((totalPaidPaise * refundBps) / 10000);

  const totalDeductionsPaise = refundCommissionPaise + platformExpensePaise + sellerExpensePaise;
  // Final refund cannot be negative, max totalPaidPaise
  const finalRefundPaise = Math.max(0, totalPaidPaise - totalDeductionsPaise);

  return {
    totalCustomerPaid: Number((totalPaidPaise / 100).toFixed(2)),
    refundCommissionRate: Number((refundBps / 100).toFixed(2)),
    refundCommissionAmount: Number((refundCommissionPaise / 100).toFixed(2)),
    platformExpense: Number((platformExpensePaise / 100).toFixed(2)),
    sellerExpense: Number((sellerExpensePaise / 100).toFixed(2)),
    totalDeductions: Number((totalDeductionsPaise / 100).toFixed(2)),
    finalRefundAmount: Number((finalRefundPaise / 100).toFixed(2)),
    currency: DEFAULT_CURRENCY,
  };
}

export interface ListingFeeEstimate {
  sellerBasePrice: number;
  deliveryCharge: number;
  commissionRate: number;
  estimatedCommission: number;
  estimatedBuyerPlatformFee: number;
  estimatedSellerGoatNet: number;
  estimatedSellerNet: number;
  totalCustomerPayable: number;
  isValidPrice: boolean;
}

/**
 * Client-safe helper to compute informational listing estimates.
 * Handles empty, zero, and invalid inputs gracefully without throwing.
 * Uses the exact same basis points and integer-paise rounding as the server financial engine.
 */
export function calculateListingFeeEstimate(
  priceInput: unknown,
  deliveryInput: unknown = 0,
  commissionBps: number = PLATFORM_COMMISSION_BPS,
  buyerFeeBps: number = BUYER_PLATFORM_FEE_BPS
): ListingFeeEstimate {
  const numericPrice =
    typeof priceInput === "number"
      ? priceInput
      : parseFloat(String(priceInput ?? "").trim());

  const numericDelivery =
    typeof deliveryInput === "number"
      ? deliveryInput
      : parseFloat(String(deliveryInput ?? "").trim());

  const cleanDelivery = isNaN(numericDelivery) || !isFinite(numericDelivery) || numericDelivery < 0 ? 0 : numericDelivery;

  if (isNaN(numericPrice) || !isFinite(numericPrice) || numericPrice <= 0) {
    return {
      sellerBasePrice: 0,
      deliveryCharge: cleanDelivery,
      commissionRate: Number((commissionBps / 100).toFixed(2)),
      estimatedCommission: 0,
      estimatedBuyerPlatformFee: 0,
      estimatedSellerGoatNet: 0,
      estimatedSellerNet: cleanDelivery,
      totalCustomerPayable: cleanDelivery,
      isValidPrice: false,
    };
  }

  // Work in integer paise with exact same rounding as calculateOrderFinancials
  const basePricePaise = Math.round(numericPrice * 100);
  const deliveryPaise = Math.round(cleanDelivery * 100);
  const buyerFeePaise = Math.round((basePricePaise * buyerFeeBps) / 10000);
  const commissionPaise = Math.round((basePricePaise * commissionBps) / 10000);
  const sellerGoatNetPaise = basePricePaise - commissionPaise;
  const sellerNetPayablePaise = sellerGoatNetPaise + deliveryPaise;
  const totalPayablePaise = basePricePaise + deliveryPaise + buyerFeePaise;

  return {
    sellerBasePrice: Number((basePricePaise / 100).toFixed(2)),
    deliveryCharge: Number((deliveryPaise / 100).toFixed(2)),
    commissionRate: Number((commissionBps / 100).toFixed(2)),
    estimatedCommission: Number((commissionPaise / 100).toFixed(2)),
    estimatedBuyerPlatformFee: Number((buyerFeePaise / 100).toFixed(2)),
    estimatedSellerGoatNet: Number((sellerGoatNetPaise / 100).toFixed(2)),
    estimatedSellerNet: Number((sellerNetPayablePaise / 100).toFixed(2)),
    totalCustomerPayable: Number((totalPayablePaise / 100).toFixed(2)),
    isValidPrice: true,
  };
}

/**
 * Safe currency formatter for INR with proper integer/decimal display.
 */
export function formatCurrencyINR(amount: number): string {
  if (isNaN(amount) || !isFinite(amount)) return "₹0";
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const formatted = absAmount.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(absAmount) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return (isNegative ? "-₹" : "₹") + formatted;
}
