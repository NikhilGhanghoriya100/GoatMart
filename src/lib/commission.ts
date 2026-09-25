/**
 * GoatMart Financial Commission Engine
 * 
 * Defines authoritative platform commission rules, rounding policies,
 * and deterministic financial calculations for marketplace orders.
 */

/**
 * Authoritative platform commission configuration for GoatMart.
 * Rate: 2.0% = 200 basis points (1 bps = 0.01% = 0.0001).
 * 
 * IMPORTANT: This configuration is ONLY applied when creating NEW orders.
 * Historical orders permanently store their immutable snapshot in MongoDB.
 */
export const PLATFORM_COMMISSION_BPS = 200; // 2.0% (200 / 10,000)
export const PLATFORM_COMMISSION_RATE = 2.0;
export const FINANCIAL_CALCULATION_VERSION = "1.0";
export const DEFAULT_CURRENCY = "INR";

export interface OrderFinancialSnapshot {
  sellerBasePrice: number;            // Authoritative base price in INR (e.g. 18000)
  commissionRate: number;             // Percentage rate used at transaction time (e.g. 2.0)
  commissionAmount: number;           // Calculated platform commission in INR (e.g. 360)
  sellerNetPayable: number;           // Net payable to seller in INR (e.g. 17640)
  currency: string;                   // ISO Currency Code (e.g. "INR")
  financialCalculationVersion: string;// Calculation engine version (e.g. "1.0")
  financialCalculatedAt: Date;        // Timestamp when financial snapshot was generated
}

/**
 * Validates financial inputs to protect against invalid, negative, or corrupt states.
 */
export function validateFinancialInputs(sellerBasePrice: number, commissionBps: number): void {
  if (typeof sellerBasePrice !== "number" || isNaN(sellerBasePrice)) {
    throw new Error("Invalid seller base price: must be a valid number");
  }
  if (!isFinite(sellerBasePrice)) {
    throw new Error("Invalid seller base price: must be a finite number");
  }
  if (sellerBasePrice <= 0) {
    throw new Error("Invalid seller base price: must be greater than zero");
  }
  if (typeof commissionBps !== "number" || isNaN(commissionBps)) {
    throw new Error("Invalid commission rate: must be a valid number");
  }
  if (commissionBps < 0 || commissionBps > 10000) {
    throw new Error("Invalid commission rate: basis points must be between 0 and 10000 (0% - 100%)");
  }
}

/**
 * Calculates platform commission and seller net payable with deterministic integer-paise arithmetic.
 * 
 * Deterministic Rounding Policy:
 * 1. Base Price Conversion: The base price is converted to integer paise: Math.round(sellerBasePrice * 100)
 * 2. Commission Calculation: Platform commission is calculated in integer paise using basis points:
 *    commissionPaise = Math.round((basePricePaise * commissionBps) / 10000)
 *    Standard half-up rounding (Math.round) is applied at the fractional paise boundary.
 * 3. Conservation of Money Invariant:
 *    sellerNetPayablePaise = basePricePaise - commissionPaise
 *    This guarantees that (commissionPaise + sellerNetPayablePaise === basePricePaise) exactly,
 *    preventing any 1-paise discrepancy or leakage.
 * 4. Conversion to Decimal INR: Values are safely converted back to decimal Rupees rounded to 2 decimal places.
 * 
 * @param sellerBasePrice - Authoritative goat price in Rupees from database record
 * @param commissionBps - Optional commission rate in basis points (defaults to PLATFORM_COMMISSION_BPS = 200)
 * @returns OrderFinancialSnapshot - Immutable snapshot ready for persistence in Order document
 */
export function calculateOrderFinancials(
  sellerBasePrice: number,
  commissionBps: number = PLATFORM_COMMISSION_BPS
): OrderFinancialSnapshot {
  validateFinancialInputs(sellerBasePrice, commissionBps);

  // 1. Work in integer paise to eliminate floating-point arithmetic errors
  const basePricePaise = Math.round(sellerBasePrice * 100);

  // 2. Commission in paise (rounded half-up at sub-paise level)
  const commissionPaise = Math.round((basePricePaise * commissionBps) / 10000);

  // 3. Seller Net Payable in paise derived by subtraction (guarantees conservation of money)
  const sellerNetPayablePaise = basePricePaise - commissionPaise;

  // Invariant assertions
  if (commissionPaise < 0) {
    throw new Error("Integrity error: calculated commission cannot be negative");
  }
  if (sellerNetPayablePaise < 0) {
    throw new Error("Integrity error: seller net payable cannot be negative");
  }
  if (commissionPaise > basePricePaise) {
    throw new Error("Integrity error: commission amount cannot exceed seller base price");
  }
  if (commissionPaise + sellerNetPayablePaise !== basePricePaise) {
    throw new Error("Accounting invariant failed: commissionPaise + sellerNetPayablePaise !== basePricePaise");
  }

  // 4. Convert back to Rupees with exactly 2 decimal precision
  const commissionRate = Number((commissionBps / 100).toFixed(2));
  const commissionAmount = Number((commissionPaise / 100).toFixed(2));
  const sellerNetPayable = Number((sellerNetPayablePaise / 100).toFixed(2));
  const basePriceRupees = Number((basePricePaise / 100).toFixed(2));

  return {
    sellerBasePrice: basePriceRupees,
    commissionRate,
    commissionAmount,
    sellerNetPayable,
    currency: DEFAULT_CURRENCY,
    financialCalculationVersion: FINANCIAL_CALCULATION_VERSION,
    financialCalculatedAt: new Date(),
  };
}

export interface ListingFeeEstimate {
  sellerBasePrice: number;
  commissionRate: number;
  estimatedCommission: number;
  estimatedSellerNet: number;
  isValidPrice: boolean;
}

/**
 * Client-safe helper to compute informational listing estimates.
 * Handles empty, zero, and invalid inputs gracefully without throwing.
 * Uses the exact same basis points and integer-paise rounding as the server financial engine.
 */
export function calculateListingFeeEstimate(
  priceInput: unknown,
  commissionBps: number = PLATFORM_COMMISSION_BPS
): ListingFeeEstimate {
  const numericPrice =
    typeof priceInput === "number"
      ? priceInput
      : parseFloat(String(priceInput ?? "").trim());

  if (isNaN(numericPrice) || !isFinite(numericPrice) || numericPrice <= 0) {
    return {
      sellerBasePrice: 0,
      commissionRate: Number((commissionBps / 100).toFixed(2)),
      estimatedCommission: 0,
      estimatedSellerNet: 0,
      isValidPrice: false,
    };
  }

  // Work in integer paise with exact same rounding as calculateOrderFinancials
  const basePricePaise = Math.round(numericPrice * 100);
  const commissionPaise = Math.round((basePricePaise * commissionBps) / 10000);
  const sellerNetPayablePaise = basePricePaise - commissionPaise;

  return {
    sellerBasePrice: Number((basePricePaise / 100).toFixed(2)),
    commissionRate: Number((commissionBps / 100).toFixed(2)),
    estimatedCommission: Number((commissionPaise / 100).toFixed(2)),
    estimatedSellerNet: Number((sellerNetPayablePaise / 100).toFixed(2)),
    isValidPrice: true,
  };
}

/**
 * Safe currency formatter for INR with proper integer/decimal display.
 */
export function formatCurrencyINR(amount: number): string {
  if (isNaN(amount) || !isFinite(amount)) return "₹0";
  return "₹" + amount.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

