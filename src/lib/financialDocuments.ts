/**
 * GoatMart Financial Documents Engine
 * Step 10 & Business Rules v2:
 * Bilingual Customer Invoice, Seller Settlement Statement, Payout Receipt & Refund Statement
 * 
 * Strict invariants:
 * - Read-only with respect to financial values.
 * - Always consumes authoritative stored financial snapshots from Order document.
 * - Never recalculates commission using current platform rates.
 * - Bilingual (English & Hindi) by default for accessibility across India.
 * - Preserves identifiers (Order IDs, transfer IDs, payment IDs) untranslated.
 * - Never exposes sensitive data (bank account numbers, secrets, auth tokens).
 */

import { IOrder } from "@/models/Order";
import { IUser } from "@/models/User";
import { formatCurrencyINR } from "@/lib/commission";
import { breedTranslations } from "@/lib/translations";

export interface InvoiceDocumentData {
  documentType: "invoice";
  invoiceNumber: string;
  orderId: string;
  invoiceDate: string;
  orderDate: string;
  marketplace: {
    nameEn: string;
    nameHi: string;
    taglineEn: string;
    taglineHi: string;
    platform: string;
  };
  buyer: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pin: string;
  };
  seller: {
    name: string;
    farmName: string;
    location: string;
  };
  item: {
    name: string;
    breedEn: string;
    breedHi: string;
    weightKg?: number;
    basePrice: number;
  };
  financials: {
    basePrice: number;
    platformFeeIncluded: boolean;
    deliveryFee: number;
    buyerPlatformFee?: number;
    buyerPlatformFeeRate?: number;
    totalAmountPaid: number;
    currency: string;
    calculationVersion: string;
  };
  payment: {
    status: string;
    statusLabelEn: string;
    statusLabelHi: string;
    method: string;
    paymentId: string | null;
    paidAt: string | null;
  };
  refund?: {
    status: string;
    refundId?: string;
    amount?: number;
    processedAt?: string;
  };
  customerTotalPaid?: number;
}

export interface SellerStatementData {
  documentType: "seller_statement";
  statementNumber: string;
  orderId: string;
  statementDate: string;
  saleDate: string;
  marketplace: {
    nameEn: string;
    nameHi: string;
  };
  seller: {
    id: string;
    name: string;
    farmName: string;
    email: string;
    phone: string;
  };
  buyer: {
    name: string;
    city: string;
    state: string;
  };
  item: {
    name: string;
    breedEn: string;
    breedHi: string;
  };
  financials: {
    sellerBasePrice: number;
    deliveryCharge: number;
    commissionRate: number;
    commissionAmount: number;
    sellerGoatNet: number;
    sellerDeliveryAmount: number;
    sellerNetPayable: number;
    currency: string;
    calculationVersion: string;
  };
  orderStatus: string;
  orderStatusLabelEn: string;
  orderStatusLabelHi: string;
  paymentStatus: string;
  payout: {
    status: string;
    statusLabelEn: string;
    statusLabelHi: string;
    transferId: string | null;
    recipientAccountId: string | null;
    processedAt: string | null;
  };
}

export interface PayoutReceiptData {
  documentType: "payout_receipt";
  receiptNumber: string;
  orderId: string;
  receiptDate: string;
  payoutDate: string;
  marketplace: {
    nameEn: string;
    nameHi: string;
  };
  seller: {
    id: string;
    name: string;
    farmName: string;
    email: string;
  };
  payout: {
    status: string;
    statusLabelEn: string;
    statusLabelHi: string;
    amount: number;
    currency: string;
    transferId: string | null;
    recipientAccountId: string | null;
    idempotencyKey: string | null;
    initiatedAt: string | null;
    processedAt: string | null;
    failureReason?: string | null;
    goatNet?: number;
    deliveryAmount?: number;
    isManual?: boolean;
    payoutMethod?: string;
    referenceId?: string | null;
    paidByName?: string | null;
    adminNote?: string | null;
  };
}

export interface RefundStatementData {
  documentType: "refund_statement";
  statementNumber: string;
  orderId: string;
  statementDate: string;
  orderDate: string;
  refundDate: string;
  marketplace: {
    nameEn: string;
    nameHi: string;
  };
  buyer: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pin: string;
  };
  seller: {
    name: string;
    farmName: string;
    location: string;
  };
  item: {
    name: string;
    breedEn: string;
    breedHi: string;
  };
  breakdown: {
    originalGoatPrice: number;
    deliveryCharge: number;
    buyerPlatformFee: number;
    totalCustomerPaid: number;
    refundCommissionRate: number;
    refundCommissionAmount: number;
    platformExpense: number;
    platformExpenseReason?: string;
    sellerExpense: number;
    sellerExpenseReason?: string;
    totalDeductions: number;
    finalRefundAmount: number;
    currency: string;
  };
  refund: {
    status: string;
    statusLabelEn: string;
    statusLabelHi: string;
    refundId: string | null;
    paymentId: string | null;
    reason: string;
  };
}

/**
 * Deterministic document numbering helpers
 */
export function generateInvoiceNumber(orderId?: string): string {
  const cleanId = String(orderId || "ORD").replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || "ORD";
  return `INV-${cleanId}`;
}

export function generateStatementNumber(orderId?: string): string {
  const cleanId = String(orderId || "ORD").replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || "ORD";
  return `STMT-${cleanId}`;
}

export function generatePayoutReceiptNumber(orderId?: string): string {
  const cleanId = String(orderId || "ORD").replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || "ORD";
  return `PAYOUT-${cleanId}`;
}

export function generateRefundNumber(orderId?: string): string {
  const cleanId = String(orderId || "ORD").replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || "ORD";
  return `RFND-${cleanId}`;
}

/**
 * Maps payment/order/payout statuses to standardized bilingual labels
 */
export function getBilingualStatus(status: string) {
  switch (status?.toLowerCase()) {
    case "paid":
      return { en: "PAID", hi: "भुगतान संपन्न" };
    case "pending":
      return { en: "PENDING", hi: "प्रतीक्षारत" };
    case "payment_confirmed":
      return { en: "CONFIRMED", hi: "पुष्टि हो गई" };
    case "processing":
      return { en: "PROCESSING", hi: "प्रक्रियाधीन" };
    case "dispatched":
      return { en: "DISPATCHED", hi: "भेज दिया गया" };
    case "out_for_delivery":
      return { en: "OUT FOR DELIVERY", hi: "डिलीवरी के लिए निकला" };
    case "delivered":
      return { en: "DELIVERED", hi: "वितरित" };
    case "cancelled":
      return { en: "CANCELLED", hi: "रद्द" };
    case "refunded":
    case "processed":
      return { en: "REFUNDED", hi: "रिफंड संपन्न" };
    case "unpaid":
      return { en: "UNPAID", hi: "अदत्त (लंबित)" };
    case "failed":
      return { en: "FAILED", hi: "विफल" };
    default:
      return { en: status?.toUpperCase() || "UNKNOWN", hi: "अज्ञात" };
  }
}

/**
 * Extracts breed in Hindi using established project dictionary
 */
export function getBreedHindi(breedEn: string): string {
  return breedTranslations[breedEn] || breedEn;
}

/**
 * Formats a Date to a clean Indian format
 */
export function formatDate(dateInput: Date | string | undefined | null): string {
  if (!dateInput) return "N/A";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// =========================================================================
// DATA GENERATORS (Strictly read from stored order snapshot)
// =========================================================================

export function generateOrderInvoiceData(
  order: any,
  customer?: any,
  seller?: any
): InvoiceDocumentData {
  let actualOrder = order;
  let actualCustomer = customer;
  let actualSeller = seller;
  if (order && order.order && !order.orderId && !order._id) {
    actualCustomer = order.customer || customer;
    actualSeller = order.seller || seller;
    actualOrder = order.order;
  }

  const statusInfo = getBilingualStatus(actualOrder.payment?.status || actualOrder.status);
  const breedEn = actualOrder.goatBreed || "Standard Breed";
  const breedHi = getBreedHindi(breedEn);

  // Authoritative financial fields from immutable snapshot
  const basePrice =
    typeof actualOrder.sellerBasePrice === "number" ? actualOrder.sellerBasePrice : Number(actualOrder.amount) || 0;
  const deliveryFee =
    typeof actualOrder.deliveryCharge === "number" ? actualOrder.deliveryCharge : 0;

  // Authoritative buyer platform fee from stored order snapshot (do not recalculate if stored)
  const storedBuyerPlatformFee =
    typeof actualOrder.buyerPlatformFee === "number" ? actualOrder.buyerPlatformFee : undefined;
  const storedBuyerFeeRate =
    typeof actualOrder.buyerPlatformFeeRate === "number" ? actualOrder.buyerPlatformFeeRate : 2.0;

  // Safe backwards-compatible fallback for legacy orders without stored buyerPlatformFee:
  // Only detect a fee if total amount strictly exceeds basePrice + deliveryFee
  const buyerPlatformFee =
    storedBuyerPlatformFee !== undefined
      ? storedBuyerPlatformFee
      : (typeof actualOrder.amount === "number" && actualOrder.amount > basePrice + deliveryFee)
      ? actualOrder.amount - (basePrice + deliveryFee)
      : undefined;

  const totalPaid =
    typeof actualOrder.amount === "number"
      ? actualOrder.amount
      : basePrice + deliveryFee + (buyerPlatformFee || 0);

  const invoiceDate = formatDate(actualOrder.payment?.paidAt || actualOrder.createdAt);
  const orderDate = formatDate(actualOrder.createdAt);

  return {
    documentType: "invoice",
    invoiceNumber: generateInvoiceNumber(actualOrder.orderId),
    orderId: actualOrder.orderId,
    invoiceDate,
    orderDate,
    customerTotalPaid: totalPaid,
    marketplace: {
      nameEn: "GoatMart Marketplace",
      nameHi: "बकरावाले - GoatMart बाज़ार",
      taglineEn: "India's Trusted Premium Livestock Marketplace",
      taglineHi: "भारत का विश्वसनीय प्रीमियम पशुधन बाज़ार",
      platform: "bakrawale.com / GoatMart",
    },
    buyer: {
      name: order.delivery?.name || customer?.name || order.customerName || "Valued Buyer",
      phone: order.delivery?.phone || customer?.phone || "N/A",
      address: order.delivery?.address || "Registered Address",
      city: order.delivery?.city || "N/A",
      state: order.delivery?.state || "N/A",
      pin: order.delivery?.pin || "",
    },
    seller: {
      name: seller?.name || order.sellerName || "Verified Farm Seller",
      farmName: seller?.sellerProfile?.farmName || "GoatMart Registered Breeder",
      location: seller?.sellerProfile?.location || "India",
    },
    item: {
      name: order.goatName || "Live Goat / बकरा",
      breedEn,
      breedHi,
      basePrice,
    },
    financials: {
      basePrice,
      platformFeeIncluded: !buyerPlatformFee || buyerPlatformFee <= 0,
      deliveryFee,
      buyerPlatformFee: buyerPlatformFee && buyerPlatformFee > 0 ? buyerPlatformFee : undefined,
      buyerPlatformFeeRate: buyerPlatformFee && buyerPlatformFee > 0 ? storedBuyerFeeRate : undefined,
      totalAmountPaid: totalPaid,
      currency: order.currency || "INR",
      calculationVersion: order.financialCalculationVersion || "2.0",
    },
    payment: {
      status: order.payment?.status || "pending",
      statusLabelEn: statusInfo.en,
      statusLabelHi: statusInfo.hi,
      method: "Razorpay Secure Online / रेज़रपे सुरक्षित ऑनलाइन",
      paymentId: order.payment?.razorpayPaymentId || null,
      paidAt: order.payment?.paidAt ? formatDate(order.payment.paidAt) : null,
    },
    refund:
      order.refund && order.refund.status !== "none"
        ? {
            status: order.refund.status,
            refundId: order.refund.refundId,
            amount: order.refund.amount,
            processedAt: order.refund.processedAt ? formatDate(order.refund.processedAt) : undefined,
          }
        : undefined,
  };
}

export function generateSellerStatementData(
  order: any,
  seller?: any,
  customer?: any
): SellerStatementData {
  const breedEn = order.goatBreed || "Standard Breed";
  const breedHi = getBreedHindi(breedEn);
  const orderStatusInfo = getBilingualStatus(order.status);
  const payoutStatusInfo = getBilingualStatus(order.payout?.status || "unpaid");

  // STRICT RULE: Use stored immutable snapshot fields directly
  const sellerBasePrice =
    typeof order.sellerBasePrice === "number" ? order.sellerBasePrice : Number(order.amount) || 0;
  const deliveryCharge =
    typeof order.deliveryCharge === "number" ? order.deliveryCharge : 0;
  const commissionRate =
    typeof order.commissionRate === "number" ? order.commissionRate : 2.0;
  const commissionAmount =
    typeof order.commissionAmount === "number"
      ? order.commissionAmount
      : Math.round((sellerBasePrice * commissionRate) / 100);
  const sellerGoatNet =
    typeof order.sellerGoatNet === "number"
      ? order.sellerGoatNet
      : sellerBasePrice - commissionAmount;
  const sellerDeliveryAmount =
    typeof order.sellerDeliveryAmount === "number"
      ? order.sellerDeliveryAmount
      : deliveryCharge;
  const sellerNetPayable =
    typeof order.sellerNetPayable === "number"
      ? order.sellerNetPayable
      : sellerGoatNet + sellerDeliveryAmount;

  return {
    documentType: "seller_statement",
    statementNumber: generateStatementNumber(order.orderId),
    orderId: order.orderId,
    statementDate: formatDate(new Date()),
    saleDate: formatDate(order.payment?.paidAt || order.createdAt),
    marketplace: {
      nameEn: "GoatMart Platform Settlements",
      nameHi: "बकरावाले - GoatMart विक्रेता निपटान",
    },
    seller: {
      id: seller?._id?.toString() || order.seller?.toString() || "",
      name: seller?.name || order.sellerName || "Registered Seller",
      farmName: seller?.sellerProfile?.farmName || "Seller Farm",
      email: seller?.email || "",
      phone: seller?.phone || "",
    },
    buyer: {
      name: order.delivery?.name || customer?.name || order.customerName || "Customer",
      city: order.delivery?.city || "N/A",
      state: order.delivery?.state || "N/A",
    },
    item: {
      name: order.goatName || "Live Goat / बकरा",
      breedEn,
      breedHi,
    },
    financials: {
      sellerBasePrice,
      deliveryCharge,
      commissionRate,
      commissionAmount,
      sellerGoatNet,
      sellerDeliveryAmount,
      sellerNetPayable,
      currency: order.currency || "INR",
      calculationVersion: order.financialCalculationVersion || "2.0",
    },
    orderStatus: order.status,
    orderStatusLabelEn: orderStatusInfo.en,
    orderStatusLabelHi: orderStatusInfo.hi,
    paymentStatus: order.payment?.status || "pending",
    payout: {
      status: order.payout?.status || "unpaid",
      statusLabelEn: payoutStatusInfo.en,
      statusLabelHi: payoutStatusInfo.hi,
      transferId: order.payout?.transferId || null,
      recipientAccountId: order.payout?.recipientAccountId || null,
      processedAt: order.payout?.processedAt ? formatDate(order.payout.processedAt) : null,
    },
  };
}

export function generatePayoutReceiptData(
  order: any,
  seller?: any
): PayoutReceiptData {
  let actualOrder = order;
  let actualSeller = seller;
  if (order && order.order && !order.orderId && !order._id) {
    actualSeller = order.seller || seller;
    actualOrder = order.order;
  }

  const payoutStatusInfo = getBilingualStatus(actualOrder.payout?.status || "unpaid");
  const sellerNetPayable =
    typeof actualOrder.sellerNetPayable === "number"
      ? actualOrder.sellerNetPayable
      : typeof actualOrder.payout?.amount === "number"
      ? actualOrder.payout.amount
      : 0;

  return {
    documentType: "payout_receipt",
    receiptNumber: generatePayoutReceiptNumber(actualOrder.orderId),
    orderId: actualOrder.orderId,
    receiptDate: formatDate(new Date()),
    payoutDate: formatDate(actualOrder.payout?.processedAt || actualOrder.payout?.initiatedAt || new Date()),
    marketplace: {
      nameEn: "GoatMart Seller Payout Disbursements",
      nameHi: "बकरावाले - GoatMart पेआउट प्रेषण",
    },
    seller: {
      id: actualSeller?._id?.toString() || actualOrder.seller?.toString() || "",
      name: actualSeller?.name || actualOrder.sellerName || "Seller",
      farmName: actualSeller?.sellerProfile?.farmName || "Farm",
      email: actualSeller?.email || "",
    },
    payout: {
      status: actualOrder.payout?.status || "none",
      statusLabelEn: payoutStatusInfo.en,
      statusLabelHi: payoutStatusInfo.hi,
      amount: sellerNetPayable,
      currency: actualOrder.currency || "INR",
      transferId: actualOrder.payout?.transferId || null,
      recipientAccountId: actualOrder.payout?.recipientAccountId || null,
      idempotencyKey: actualOrder.payout?.idempotencyKey || null,
      initiatedAt: actualOrder.payout?.initiatedAt ? formatDate(actualOrder.payout.initiatedAt) : null,
      processedAt: actualOrder.payout?.processedAt ? formatDate(actualOrder.payout.processedAt) : null,
      failureReason: actualOrder.payout?.failureReason || null,
      goatNet: typeof actualOrder.sellerGoatNet === "number" ? actualOrder.sellerGoatNet : undefined,
      deliveryAmount: typeof actualOrder.sellerDeliveryAmount === "number" ? actualOrder.sellerDeliveryAmount : undefined,
      isManual: actualOrder.payout?.isManual ?? false,
      payoutMethod: actualOrder.payout?.payoutMethod || undefined,
      referenceId: actualOrder.payout?.referenceId || actualOrder.payout?.utrNumber || actualOrder.payout?.transferId || null,
      paidByName: actualOrder.payout?.paidByName || null,
      adminNote: actualOrder.payout?.adminNote || null,
    },
  };
}

export function generateRefundStatementData(
  order: any,
  customer?: any,
  seller?: any
): RefundStatementData {
  const statusInfo = getBilingualStatus(order.refund?.status || "processed");
  const breedEn = order.goatBreed || "Standard Breed";
  const breedHi = getBreedHindi(breedEn);

  const totalPaid = typeof order.amount === "number" ? order.amount : (order.sellerBasePrice || 0);

  const storedBreakdown = order.refund?.breakdown || {};
  const refundCommissionRate = typeof storedBreakdown.refundCommissionRate === "number"
    ? storedBreakdown.refundCommissionRate
    : (order.cancellation?.refundCommissionRate ?? 3.5);

  const refundCommissionAmount = typeof storedBreakdown.refundCommissionAmount === "number"
    ? storedBreakdown.refundCommissionAmount
    : (order.cancellation?.refundCommissionAmount ?? Number(((totalPaid * 350) / 10000).toFixed(2)));

  const platformExpense = typeof storedBreakdown.platformExpense === "number"
    ? storedBreakdown.platformExpense
    : (order.cancellation?.platformExpense ?? 0);

  const sellerExpense = typeof storedBreakdown.sellerExpense === "number"
    ? storedBreakdown.sellerExpense
    : (order.cancellation?.sellerExpense ?? 0);

  const totalDeductions = typeof storedBreakdown.totalDeductions === "number"
    ? storedBreakdown.totalDeductions
    : (order.cancellation?.totalDeductions ?? Number((refundCommissionAmount + platformExpense + sellerExpense).toFixed(2)));

  const finalRefundAmount = typeof storedBreakdown.finalRefundAmount === "number"
    ? storedBreakdown.finalRefundAmount
    : (order.refund?.amount ?? Math.max(0, Number((totalPaid - totalDeductions).toFixed(2))));

  const originalGoatPrice = typeof order.sellerBasePrice === "number" ? order.sellerBasePrice : (order.amount || 0);
  const deliveryCharge = typeof order.deliveryCharge === "number" ? order.deliveryCharge : 0;
  const buyerPlatformFee = typeof order.buyerPlatformFee === "number" ? order.buyerPlatformFee : 0;

  const platformExpenseObj = Array.isArray(order.expenses)
    ? order.expenses.find((e: any) => e.type === "platform")
    : null;
  const sellerExpenseObj = Array.isArray(order.expenses)
    ? order.expenses.find((e: any) => e.type === "seller")
    : null;

  return {
    documentType: "refund_statement",
    statementNumber: generateRefundNumber(order.orderId),
    orderId: order.orderId,
    statementDate: formatDate(new Date()),
    orderDate: formatDate(order.createdAt),
    refundDate: formatDate(order.refund?.processedAt || order.cancellation?.cancelledAt || new Date()),
    marketplace: {
      nameEn: "GoatMart Marketplace",
      nameHi: "बकरावाले - GoatMart बाज़ार",
    },
    buyer: {
      name: order.delivery?.name || customer?.name || order.customerName || "Valued Buyer",
      phone: order.delivery?.phone || customer?.phone || "N/A",
      address: order.delivery?.address || "Registered Address",
      city: order.delivery?.city || "N/A",
      state: order.delivery?.state || "N/A",
      pin: order.delivery?.pin || "",
    },
    seller: {
      name: seller?.name || order.sellerName || "Verified Farm Seller",
      farmName: seller?.sellerProfile?.farmName || "GoatMart Registered Breeder",
      location: seller?.sellerProfile?.location || "India",
    },
    item: {
      name: order.goatName || "Live Goat / बकरा",
      breedEn,
      breedHi,
    },
    breakdown: {
      originalGoatPrice,
      deliveryCharge,
      buyerPlatformFee,
      totalCustomerPaid: totalPaid,
      refundCommissionRate,
      refundCommissionAmount,
      platformExpense,
      platformExpenseReason: platformExpense > 0 ? (platformExpenseObj?.reason || "Admin verified platform expense") : undefined,
      sellerExpense,
      sellerExpenseReason: sellerExpense > 0 ? (sellerExpenseObj?.reason || "Admin verified seller expense") : undefined,
      totalDeductions,
      finalRefundAmount,
      currency: order.currency || "INR",
    },
    refund: {
      status: order.refund?.status || "processed",
      statusLabelEn: statusInfo.en,
      statusLabelHi: statusInfo.hi,
      refundId: order.refund?.refundId || null,
      paymentId: order.payment?.razorpayPaymentId || null,
      reason: order.cancellation?.reason || order.refund?.reason || "Customer requested cancellation",
    },
  };
}

// =========================================================================
// HTML RENDERERS (Clean A4 layout with print styles & Devanagari typography)
// =========================================================================

const COMMON_CSS = `
  @page {
    size: A4;
    margin: 12mm 15mm;
  }
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  body {
    background-color: #f7f7f8;
    color: #1a1a1a;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Devanagari", "Devanagari Sangam MN", "Mukta", sans-serif;
    line-height: 1.5;
    padding: 24px 16px;
    -webkit-font-smoothing: antialiased;
  }
  .doc-container {
    max-width: 800px;
    margin: 0 auto;
    background: #ffffff;
    border: 1px solid #e5e5e7;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    overflow: hidden;
  }
  .doc-header {
    background: #111111;
    color: #ffffff;
    padding: 28px 32px;
    border-bottom: 3px solid #c8a96e;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .brand-logo {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .brand-logo .goat-icon {
    font-size: 32px;
    background: rgba(200, 169, 110, 0.15);
    border-radius: 10px;
    padding: 2px 6px;
    border: 1px solid rgba(200, 169, 110, 0.4);
  }
  .brand-title {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: #c8a96e;
    font-family: serif;
  }
  .brand-sub {
    font-size: 11px;
    color: #a0a0a5;
    margin-top: 2px;
  }
  .doc-meta {
    text-align: right;
  }
  .doc-badge {
    display: inline-block;
    background: rgba(200, 169, 110, 0.15);
    color: #c8a96e;
    border: 1px solid rgba(200, 169, 110, 0.35);
    padding: 3px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .doc-number {
    font-size: 16px;
    font-weight: 800;
    font-family: monospace;
    color: #ffffff;
    margin-top: 6px;
  }
  .doc-date {
    font-size: 12px;
    color: #a0a0a5;
    margin-top: 2px;
  }
  .doc-body {
    padding: 32px;
  }
  .parties-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    margin-bottom: 28px;
    padding-bottom: 24px;
    border-bottom: 1px solid #ebebed;
  }
  .party-card {
    background: #fcfcfd;
    border: 1px solid #ededf0;
    border-radius: 8px;
    padding: 16px;
  }
  .party-title {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    color: #71717a;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .party-name {
    font-size: 15px;
    font-weight: 700;
    color: #111111;
  }
  .party-detail {
    font-size: 12px;
    color: #52525b;
    margin-top: 3px;
  }
  .table-section {
    margin-bottom: 28px;
  }
  .doc-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  .doc-table th {
    background: #f4f4f6;
    color: #3f3f46;
    font-weight: 700;
    text-align: left;
    padding: 10px 14px;
    border-bottom: 2px solid #e4e4e7;
    font-size: 11px;
    text-transform: uppercase;
  }
  .doc-table td {
    padding: 12px 14px;
    border-bottom: 1px solid #ebebed;
    color: #18181b;
  }
  .doc-table tr:last-child td {
    border-bottom: none;
  }
  .text-right {
    text-align: right;
  }
  .financial-summary {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }
  .summary-card {
    width: 340px;
    background: #fcfcfd;
    border: 1px solid #e4e4e7;
    border-radius: 8px;
    padding: 16px;
  }
  .summary-row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    margin-bottom: 8px;
    color: #52525b;
  }
  .summary-total {
    border-top: 2px solid #111111;
    margin-top: 10px;
    padding-top: 10px;
    font-size: 16px;
    font-weight: 800;
    color: #111111;
  }
  .total-highlight {
    color: #8b5e2a;
    font-family: monospace;
  }
  .payment-callout {
    margin-top: 28px;
    padding: 16px 20px;
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 1px solid;
  }
  .status-paid {
    background: #f0fdf4;
    border-color: #bbf7d0;
    color: #166534;
  }
  .status-pending {
    background: #fffbeb;
    border-color: #fde68a;
    color: #92400e;
  }
  .status-failed {
    background: #fef2f2;
    border-color: #fecaca;
    color: #991b1b;
  }
  .doc-footer {
    background: #fcfcfd;
    padding: 20px 32px;
    border-top: 1px solid #ebebed;
    font-size: 11px;
    color: #71717a;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .print-bar {
    max-width: 800px;
    margin: 0 auto 16px auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .btn-print {
    background: #111111;
    color: #ffffff;
    border: 1px solid #333333;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .btn-print:hover {
    background: #222222;
  }
  @media print {
    body {
      background: #ffffff !important;
      padding: 0 !important;
    }
    .doc-container {
      box-shadow: none !important;
      border: none !important;
      border-radius: 0 !important;
      max-width: 100% !important;
    }
    .no-print {
      display: none !important;
    }
  }
`;

/**
 * Renders Customer Tax Invoice & Receipt (Bilingual HTML)
 */
export function renderInvoiceHtml(data: InvoiceDocumentData): string {
  const paymentClass =
    data.payment.status === "paid"
      ? "status-paid"
      : data.payment.status === "failed"
      ? "status-failed"
      : "status-pending";

  return `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GoatMart Invoice / इनवॉयस - ${data.invoiceNumber}</title>
  <style>${COMMON_CSS}</style>
</head>
<body>
  <div class="print-bar no-print">
    <div style="font-size: 12px; color: #666;">
      🇮🇳 <strong>Bilingual Financial Document / द्विभाषी वित्तीय दस्तावेज़</strong> (English / हिन्दी)
    </div>
    <button class="btn-print" onclick="window.print()">
      🖨️ Print / Save PDF (प्रिंट / पीडीएफ सेव करें)
    </button>
  </div>

  <div class="doc-container">
    <!-- Header -->
    <div class="doc-header">
      <div class="brand-logo">
        <span class="goat-icon">🐐</span>
        <div>
          <div class="brand-title">${data.marketplace.nameEn}</div>
          <div class="brand-sub">${data.marketplace.nameHi} • ${data.marketplace.taglineEn}</div>
        </div>
      </div>
      <div class="doc-meta">
        <div class="doc-badge">TAX INVOICE & RECEIPT / कर इनवॉयस एवं रसीद</div>
        <div class="doc-number">${data.invoiceNumber}</div>
        <div class="doc-date">Date / दिनांक: ${data.invoiceDate}</div>
        <div class="doc-date">Order ID / ऑर्डर आईडी: <strong>${data.orderId}</strong></div>
      </div>
    </div>

    <!-- Body -->
    <div class="doc-body">
      <!-- Parties -->
      <div class="parties-grid">
        <div class="party-card">
          <div class="party-title">👤 BILLED TO / ग्राहक (क्रेता विवरण)</div>
          <div class="party-name">${data.buyer.name}</div>
          <div class="party-detail">📞 ${data.buyer.phone}</div>
          <div class="party-detail">📍 ${data.buyer.address}</div>
          <div class="party-detail">${data.buyer.city}, ${data.buyer.state} ${data.buyer.pin ? "- " + data.buyer.pin : ""}</div>
        </div>

        <div class="party-card">
          <div class="party-title">🏪 SOLD BY / विक्रेता (फार्म विवरण)</div>
          <div class="party-name">${data.seller.name}</div>
          <div class="party-detail">🏡 Farm / फार्म: ${data.seller.farmName}</div>
          <div class="party-detail">📍 Location / स्थान: ${data.seller.location}</div>
          <div class="party-detail">🛡️ GoatMart Verified Breeder / सत्यापित ब्रीडर</div>
        </div>
      </div>

      <!-- Line Items -->
      <div class="table-section">
        <table class="doc-table">
          <thead>
            <tr>
              <th>Item & Description / वस्तु एवं विवरण</th>
              <th>Breed / नस्ल</th>
              <th class="text-right">Qty / मात्रा</th>
              <th class="text-right">Amount / राशि (${data.financials.currency})</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>${data.item.name}</strong>
                <div style="font-size: 11px; color: #71717a; margin-top: 2px;">
                  100% Veterinary Certified Livestock / पशुचिकित्सक द्वारा प्रमाणित
                </div>
              </td>
              <td>${data.item.breedEn} (${data.item.breedHi})</td>
              <td class="text-right">1</td>
              <td class="text-right font-mono font-bold">${formatCurrencyINR(data.financials.basePrice)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Financial Calculation (Authoritative Stored Snapshot) -->
      <div class="financial-summary">
        <div class="summary-card">
          <div class="summary-row">
            <span>Item Price / बकरे की कीमत:</span>
            <span>${formatCurrencyINR(data.financials.basePrice)}</span>
          </div>
          <div class="summary-row">
            <span>Delivery & Transit / डिलीवरी शुल्क:</span>
            <span>${data.financials.deliveryFee > 0 ? formatCurrencyINR(data.financials.deliveryFee) : "₹0 (Free Delivery / मुफ़्त)"}</span>
          </div>
          ${
            typeof data.financials.buyerPlatformFee === "number" && data.financials.buyerPlatformFee > 0
              ? `<div class="summary-row">
            <span>Buyer Platform Fee (${data.financials.buyerPlatformFeeRate ?? 2}% of Goat Price) / खरीदार प्लेटफ़ॉर्म शुल्क (2%):</span>
            <span style="font-weight: 600;">${formatCurrencyINR(data.financials.buyerPlatformFee)}</span>
          </div>`
              : `<div class="summary-row">
            <span>Platform Service Fee / प्लेटफ़ॉर्म सेवा शुल्क:</span>
            <span style="color: #16a34a; font-weight: 600;">Included / सम्मिलित</span>
          </div>`
          }
          <div class="summary-row summary-total">
            <span>Total Customer Payment / कुल भुगतान राशि:</span>
            <span class="total-highlight">${formatCurrencyINR(data.financials.totalAmountPaid)}</span>
          </div>
        </div>
      </div>

      <!-- Payment Callout -->
      <div class="payment-callout ${paymentClass}">
        <div>
          <div style="font-size: 12px; font-weight: 700; text-transform: uppercase;">
            Payment Status / भुगतान स्थिति: ${data.payment.statusLabelEn} (${data.payment.statusLabelHi})
          </div>
          <div style="font-size: 11px; margin-top: 3px;">
            Method / माध्यम: ${data.payment.method}
          </div>
          ${
            data.payment.paymentId
              ? `<div style="font-size: 11px; font-family: monospace; margin-top: 2px;">
                  Reference / रेज़रपे आईडी: <strong>${data.payment.paymentId}</strong>
                </div>`
              : ""
          }
        </div>
        ${
          data.payment.paidAt
            ? `<div style="font-size: 12px; text-align: right;">
                Paid On / भुगतान दिनांक:<br><strong>${data.payment.paidAt}</strong>
              </div>`
            : ""
        }
      </div>

      ${
        data.refund
          ? `<div style="margin-top: 14px; padding: 12px 16px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; font-size: 12px; color: #991b1b;">
              ⚠️ <strong>Refund Status / रिफंड स्थिति:</strong> ${data.refund.status.toUpperCase()} 
              ${data.refund.refundId ? `• Refund ID / आईडी: ${data.refund.refundId}` : ""}
              ${data.refund.amount ? `• Amount / राशि: ${formatCurrencyINR(data.refund.amount)}` : ""}
            </div>`
          : ""
      }
    </div>

    <!-- Footer -->
    <div class="doc-footer">
      <div>
        This is an official computer-generated document / यह कंप्यूटर द्वारा प्रमाणित रसीद है।<br>
        GoatMart Platform • Snapshot Version v${data.financials.calculationVersion}
      </div>
      <div style="text-align: right;">
        www.bakrawale.com
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Renders Seller Settlement Statement (Bilingual HTML)
 */
export function renderSellerStatementHtml(data: SellerStatementData): string {
  return `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GoatMart Seller Statement / विक्रेता विवरण - ${data.statementNumber}</title>
  <style>${COMMON_CSS}</style>
</head>
<body>
  <div class="print-bar no-print">
    <div style="font-size: 12px; color: #666;">
      🇮🇳 <strong>Seller Settlement Statement / विक्रेता निपटान विवरण</strong> (Bilingual / द्विभाषी)
    </div>
    <button class="btn-print" onclick="window.print()">
      🖨️ Print / Save PDF (प्रिंट / पीडीएफ सेव करें)
    </button>
  </div>

  <div class="doc-container">
    <!-- Header -->
    <div class="doc-header">
      <div class="brand-logo">
        <span class="goat-icon">💰</span>
        <div>
          <div class="brand-title">${data.marketplace.nameEn}</div>
          <div class="brand-sub">${data.marketplace.nameHi}</div>
        </div>
      </div>
      <div class="doc-meta">
        <div class="doc-badge">SETTLEMENT STATEMENT / निपटान विवरण</div>
        <div class="doc-number">${data.statementNumber}</div>
        <div class="doc-date">Statement Date / दिनांक: ${data.statementDate}</div>
        <div class="doc-date">Related Order / संबंधित ऑर्डर: <strong>${data.orderId}</strong></div>
      </div>
    </div>

    <!-- Body -->
    <div class="doc-body">
      <!-- Parties -->
      <div class="parties-grid">
        <div class="party-card">
          <div class="party-title">🏪 SELLER / विक्रेता विवरण</div>
          <div class="party-name">${data.seller.name}</div>
          <div class="party-detail">🏡 Farm / फार्म: ${data.seller.farmName}</div>
          <div class="party-detail">📧 ${data.seller.email}</div>
          <div class="party-detail">📞 ${data.seller.phone || "N/A"}</div>
        </div>

        <div class="party-card">
          <div class="party-title">👤 ORDER & BUYER / ऑर्डर एवं क्रेता</div>
          <div class="party-name">${data.buyer.name}</div>
          <div class="party-detail">📍 Location / स्थान: ${data.buyer.city}, ${data.buyer.state}</div>
          <div class="party-detail">📦 Order Status / स्थिति: <strong>${data.orderStatusLabelEn} (${data.orderStatusLabelHi})</strong></div>
          <div class="party-detail">📅 Sale Date / बिक्री दिनांक: ${data.saleDate}</div>
        </div>
      </div>

      <!-- Financial Table (Permanent Snapshot) -->
      <div class="table-section">
        <div style="font-size: 12px; font-weight: 700; color: #71717a; text-transform: uppercase; margin-bottom: 8px;">
          IMMUTABLE FINANCIAL BREAKDOWN / अपरिवर्तनीय वित्तीय विवरण (Snapshot v${data.financials.calculationVersion})
        </div>
        <table class="doc-table">
          <thead>
            <tr>
              <th>Financial Component / वित्तीय घटक</th>
              <th>Calculation Rule / गणना नियम</th>
              <th class="text-right">Rate / दर</th>
              <th class="text-right">Amount / राशि (${data.financials.currency})</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Seller Base Price / मूल बिक्री मूल्य</strong>
                <div style="font-size: 11px; color: #71717a;">Gross price set by seller for goat</div>
              </td>
              <td>Authoritative Order Snapshot</td>
              <td class="text-right">100%</td>
              <td class="text-right font-mono font-bold">${formatCurrencyINR(data.financials.sellerBasePrice)}</td>
            </tr>
            <tr>
              <td style="color: #b91c1c;">
                <strong>Platform Fee / प्लेटफ़ॉर्म कमीशन</strong>
                <div style="font-size: 11px; color: #71717a;">GoatMart commission (2% only on goat price)</div>
              </td>
              <td>Base Price × 2.0%</td>
              <td class="text-right font-mono" style="color: #b91c1c;">${data.financials.commissionRate}%</td>
              <td class="text-right font-mono font-bold" style="color: #b91c1c;">-${formatCurrencyINR(data.financials.commissionAmount)}</td>
            </tr>
            <tr>
              <td>
                <strong>Seller Goat Net / बकरे की शुद्ध कमाई</strong>
                <div style="font-size: 11px; color: #71717a;">Goat price minus platform commission</div>
              </td>
              <td>Base Price - Commission Amount</td>
              <td class="text-right font-mono">${(100 - data.financials.commissionRate).toFixed(1)}%</td>
              <td class="text-right font-mono font-bold">${formatCurrencyINR(data.financials.sellerGoatNet)}</td>
            </tr>
            <tr>
              <td style="color: #166534;">
                <strong>Delivery Revenue / डिलीवरी राजस्व</strong>
                <div style="font-size: 11px; color: #71717a;">100% delivery fee to seller (0% platform commission)</div>
              </td>
              <td>Delivery Charge</td>
              <td class="text-right font-mono" style="color: #166534;">0% fee</td>
              <td class="text-right font-mono font-bold" style="color: #166534;">+${formatCurrencyINR(data.financials.sellerDeliveryAmount)}</td>
            </tr>
            <tr style="background: #fdfaf6;">
              <td style="color: #8b5e2a;">
                <strong>Seller Net Payable / विक्रेता को कुल शुद्ध देय राशि</strong>
                <div style="font-size: 11px; color: #71717a;">Goat Net + Delivery Revenue due to seller</div>
              </td>
              <td>Goat Net + Delivery Revenue</td>
              <td class="text-right font-mono">Net Total</td>
              <td class="text-right font-mono font-bold" style="color: #8b5e2a; font-size: 15px;">
                ${formatCurrencyINR(data.financials.sellerNetPayable)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Payout Status Card -->
      <div class="payment-callout ${data.payout.status === "paid" ? "status-paid" : data.payout.status === "failed" ? "status-failed" : "status-pending"}">
        <div>
          <div style="font-size: 12px; font-weight: 700; text-transform: uppercase;">
            Payout Status / भुगतान प्रेषण स्थिति: ${data.payout.statusLabelEn} (${data.payout.statusLabelHi})
          </div>
          <div style="font-size: 11px; margin-top: 3px;">
            Target Account / लक्षित खाता: <strong>${data.payout.recipientAccountId || "Configured Linked Account"}</strong>
          </div>
          ${
            data.payout.transferId
              ? `<div style="font-size: 11px; font-family: monospace; margin-top: 2px;">
                  Provider Transfer ID / ट्रांसफर आईडी: <strong>${data.payout.transferId}</strong>
                </div>`
              : ""
          }
        </div>
        ${
          data.payout.processedAt
            ? `<div style="font-size: 12px; text-align: right;">
                Disbursed On / प्रेषण दिनांक:<br><strong>${data.payout.processedAt}</strong>
              </div>`
            : ""
        }
      </div>
    </div>

    <!-- Footer -->
    <div class="doc-footer">
      <div>
        Generated from authoritative server-side snapshot / स्थायी सर्वर रिकॉर्ड द्वारा प्रमाणित।<br>
        Snapshot Version: v${data.financials.calculationVersion} • Currency: ${data.financials.currency}
      </div>
      <div style="text-align: right;">
        GoatMart Settlements
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Renders Seller Payout Disbursement Receipt (Bilingual HTML)
 */
export function renderPayoutReceiptHtml(data: PayoutReceiptData): string {
  const isPaid = data.payout.status === "paid";
  const isFailed = data.payout.status === "failed";
  const statusClass = isPaid ? "status-paid" : isFailed ? "status-failed" : "status-pending";

  return `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GoatMart Payout Receipt / पेआउट रसीद - ${data.receiptNumber}</title>
  <style>${COMMON_CSS}</style>
</head>
<body>
  <div class="print-bar no-print">
    <div style="font-size: 12px; color: #666;">
      🇮🇳 <strong>Seller Payout Disbursement Receipt / विक्रेता पेआउट प्रेषण रसीद</strong> (Bilingual)
    </div>
    <button class="btn-print" onclick="window.print()">
      🖨️ Print / Save PDF (प्रिंट / पीडीएफ सेव करें)
    </button>
  </div>

  <div class="doc-container">
    <!-- Header -->
    <div class="doc-header">
      <div class="brand-logo">
        <span class="goat-icon">💸</span>
        <div>
          <div class="brand-title">${data.marketplace.nameEn}</div>
          <div class="brand-sub">${data.marketplace.nameHi}</div>
        </div>
      </div>
      <div class="doc-meta">
        <div class="doc-badge">PAYOUT DISBURSEMENT SLIP / पेआउट प्रेषण रसीद</div>
        <div class="doc-number">${data.receiptNumber}</div>
        <div class="doc-date">Disbursement Date / प्रेषण दिनांक: ${data.payoutDate}</div>
        <div class="doc-date">Order Reference / ऑर्डर संदर्भ: <strong>${data.orderId}</strong></div>
      </div>
    </div>

    <!-- Body -->
    <div class="doc-body">
      <!-- Beneficiary -->
      <div class="parties-grid">
        <div class="party-card">
          <div class="party-title">👤 BENEFICIARY / लाभार्थी (विक्रेता विवरण)</div>
          <div class="party-name">${data.seller.name}</div>
          <div class="party-detail">🏡 Farm / फार्म: ${data.seller.farmName}</div>
          <div class="party-detail">📧 Email / ईमेल: ${data.seller.email}</div>
        </div>

        <div class="party-card">
          <div class="party-title">💳 DESTINATION / गंतव्य बैंक या UPI खाता</div>
          <div class="party-name font-mono text-emerald-700">
            ${
              data.payout.isManual
                ? data.payout.payoutMethod === "UPI"
                  ? `UPI Transfer (${data.payout.referenceId || "Direct"})`
                  : `Bank Transfer (${data.payout.payoutMethod || "NEFT/IMPS"})`
                : data.payout.recipientAccountId
                ? `Razorpay Account: ${data.payout.recipientAccountId}`
                : "Verified Seller Account"
            }
          </div>
          <div class="party-detail">
            ${
              data.payout.isManual
                ? "🔒 Manual External Transfer verified & authorized by GoatMart Finance Administration"
                : "🔒 KYC-Verified Connected Account"
            }
          </div>
          <div class="party-detail">🛡️ Safe direct settlement via Reserve Bank of India framework</div>
        </div>
      </div>

      <!-- Payout Details Table -->
      <div class="table-section">
        <table class="doc-table">
          <thead>
            <tr>
              <th>Disbursement Field / विवरण</th>
              <th>Reference Key / संदर्भ कुंजी</th>
              <th class="text-right">Amount / राशि (${data.payout.currency})</th>
            </tr>
          </thead>
          <tbody>
            ${
              typeof data.payout.goatNet === "number"
                ? `<tr>
                    <td>Goat Net Revenue / बकरी बिक्री की शुद्ध राशि</td>
                    <td>Goat Net</td>
                    <td class="text-right font-mono">${formatCurrencyINR(data.payout.goatNet)}</td>
                  </tr>`
                : ""
            }
            ${
              typeof data.payout.deliveryAmount === "number" && data.payout.deliveryAmount > 0
                ? `<tr>
                    <td>Delivery Revenue (100% to seller) / डिलीवरी शुल्क</td>
                    <td>Delivery Charge</td>
                    <td class="text-right font-mono">${formatCurrencyINR(data.payout.deliveryAmount)}</td>
                  </tr>`
                : ""
            }
            <tr>
              <td>
                <strong>Net Disbursed Funds / कुल शुद्ध प्रेषित राशि</strong>
                <div style="font-size: 11px; color: #71717a;">Derived strictly from immutable order sellerNetPayable</div>
              </td>
              <td>Order Net Payable</td>
              <td class="text-right font-mono font-bold" style="font-size: 16px; color: #166534;">
                ${formatCurrencyINR(data.payout.amount)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Execution Callout -->
      <div class="payment-callout ${statusClass}">
        <div>
          <div style="font-size: 13px; font-weight: 700; text-transform: uppercase;">
            ${data.payout.isManual ? "MANUAL EXTERNAL TRANSFER / मैन्युअल बाह्य बैंक/UPI ट्रांसफ़र • " : ""}
            Payout Status / स्थिति: ${data.payout.statusLabelEn} (${data.payout.statusLabelHi})
          </div>
          ${
            data.payout.referenceId
              ? `<div style="font-size: 11px; font-family: monospace; margin-top: 3px;">
                  Transaction Reference / UTR ID (लेनदेन संदर्भ): <strong>${data.payout.referenceId}</strong>
                </div>`
              : data.payout.transferId
              ? `<div style="font-size: 11px; font-family: monospace; margin-top: 3px;">
                  Provider Transfer ID / रेज़रपे ट्रांसफर आईडी: <strong>${data.payout.transferId}</strong>
                </div>`
              : ""
          }
          ${
            data.payout.isManual && data.payout.payoutMethod
              ? `<div style="font-size: 11px; margin-top: 2px; color: #52525b;">
                  Payout Method / माध्यम: <strong>${data.payout.payoutMethod}</strong> ${data.payout.paidByName ? `• Disbursed By Admin: ${data.payout.paidByName}` : ""}
                </div>`
              : ""
          }
          ${
            data.payout.idempotencyKey
              ? `<div style="font-size: 11px; font-family: monospace; margin-top: 2px; color: #52525b;">
                  Idempotency Key / संदर्भ कुंजी: ${data.payout.idempotencyKey}
                </div>`
              : ""
          }
          ${
            data.payout.failureReason
              ? `<div style="font-size: 11px; color: #991b1b; margin-top: 3px;">
                  Failure Reason / कारण: ${data.payout.failureReason}
                </div>`
              : ""
          }
        </div>
        ${
          data.payout.processedAt
            ? `<div style="font-size: 12px; text-align: right;">
                Disbursed At / प्रेषण समय:<br><strong>${data.payout.processedAt}</strong>
              </div>`
            : ""
        }
      </div>
    </div>

    <!-- Footer -->
    <div class="doc-footer">
      <div>
        Official Disbursement Slip / अधिकृत प्रेषण रसीद • GoatMart Payouts Engine<br>
        All amounts reconciled from authoritative order snapshots.
      </div>
      <div style="text-align: right;">
        www.bakrawale.com
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Renders Customer Order Cancellation & Refund Statement (Bilingual HTML)
 */
export function renderRefundStatementHtml(data: RefundStatementData): string {
  return `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GoatMart Refund Statement / रिफंड विवरण - ${data.statementNumber}</title>
  <style>${COMMON_CSS}</style>
</head>
<body>
  <div class="print-bar no-print">
    <div style="font-size: 12px; color: #666;">
      🇮🇳 <strong>Cancellation & Refund Statement / रद्दीकरण एवं रिफंड विवरण</strong> (Bilingual / द्विभाषी)
    </div>
    <button class="btn-print" onclick="window.print()">
      🖨️ Print / Save PDF (प्रिंट / पीडीएफ सेव करें)
    </button>
  </div>

  <div class="doc-container">
    <!-- Header -->
    <div class="doc-header">
      <div class="brand-logo">
        <span class="goat-icon">🔄</span>
        <div>
          <div class="brand-title">${data.marketplace.nameEn}</div>
          <div class="brand-sub">${data.marketplace.nameHi}</div>
        </div>
      </div>
      <div class="doc-meta">
        <div class="doc-badge">REFUND STATEMENT / रिफंड विवरण</div>
        <div class="doc-number">${data.statementNumber}</div>
        <div class="doc-date">Statement Date / दिनांक: ${data.statementDate}</div>
        <div class="doc-date">Order ID / ऑर्डर आईडी: <strong>${data.orderId}</strong></div>
      </div>
    </div>

    <!-- Body -->
    <div class="doc-body">
      <!-- Parties -->
      <div class="parties-grid">
        <div class="party-card">
          <div class="party-title">👤 CUSTOMER / ग्राहक विवरण</div>
          <div class="party-name">${data.buyer.name}</div>
          <div class="party-detail">📞 ${data.buyer.phone}</div>
          <div class="party-detail">📍 ${data.buyer.address}</div>
          <div class="party-detail">${data.buyer.city}, ${data.buyer.state} ${data.buyer.pin ? "- " + data.buyer.pin : ""}</div>
        </div>

        <div class="party-card">
          <div class="party-title">🏪 SELLER / विक्रेता विवरण</div>
          <div class="party-name">${data.seller.name}</div>
          <div class="party-detail">🏡 Farm / फार्म: ${data.seller.farmName}</div>
          <div class="party-detail">📍 Location / स्थान: ${data.seller.location}</div>
          <div class="party-detail">📅 Original Order Date: ${data.orderDate}</div>
        </div>
      </div>

      <!-- Item Info -->
      <div style="background: #fdfaf6; border: 1px solid #fae8c8; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; font-size: 13px;">
        <strong>Cancelled Item / रद्द की गई वस्तु:</strong> ${data.item.name} (${data.item.breedEn} / ${data.item.breedHi})
      </div>

      <!-- Financial Breakdown Table -->
      <div class="table-section">
        <div style="font-size: 12px; font-weight: 700; color: #71717a; text-transform: uppercase; margin-bottom: 8px;">
          AUTHORITATIVE REFUND BREAKDOWN / अधिकृत रिफंड गणना विवरण
        </div>
        <table class="doc-table">
          <thead>
            <tr>
              <th>Component / घटक</th>
              <th>Rule / नियम</th>
              <th class="text-right">Deduction / कटौती</th>
              <th class="text-right">Amount / राशि (${data.breakdown.currency})</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Original Goat Price / बकरे की मूल कीमत</strong>
                <div style="font-size: 11px; color: #71717a;">Authoritative base goat listing price</div>
              </td>
              <td>Seller Price</td>
              <td class="text-right">-</td>
              <td class="text-right font-mono font-bold">${formatCurrencyINR(data.breakdown.originalGoatPrice)}</td>
            </tr>
            <tr>
              <td>
                <strong>Delivery Charge / डिलीवरी शुल्क</strong>
                <div style="font-size: 11px; color: #71717a;">Livestock transit & delivery charge</div>
              </td>
              <td>Transport Fee</td>
              <td class="text-right">-</td>
              <td class="text-right font-mono font-bold">${formatCurrencyINR(data.breakdown.deliveryCharge)}</td>
            </tr>
            ${
              data.breakdown.buyerPlatformFee > 0
                ? `<tr>
                    <td>
                      <strong>Buyer Platform Fee / खरीदार प्लेटफ़ॉर्म शुल्क (2%)</strong>
                      <div style="font-size: 11px; color: #71717a;">2% buyer platform facilitation fee on goat price</div>
                    </td>
                    <td>Platform Fee</td>
                    <td class="text-right">-</td>
                    <td class="text-right font-mono font-bold">${formatCurrencyINR(data.breakdown.buyerPlatformFee)}</td>
                  </tr>`
                : ""
            }
            <tr style="background: #fcfcfd; font-weight: 600;">
              <td>
                <strong>Original Total Customer Payment / कुल मूल भुगतान</strong>
                <div style="font-size: 11px; color: #71717a;">Total payment collected at checkout (Goat + Delivery + Buyer Fee)</div>
              </td>
              <td>Total Paid</td>
              <td class="text-right">-</td>
              <td class="text-right font-mono font-bold">${formatCurrencyINR(data.breakdown.totalCustomerPaid)}</td>
            </tr>
            <tr>
              <td style="color: #b91c1c;">
                <strong>Refund Commission / रिफंड प्लेटफ़ॉर्म शुल्क</strong>
                <div style="font-size: 11px; color: #71717a;">3.5% cancellation fee on total customer payment</div>
              </td>
              <td>Total Paid × 3.5%</td>
              <td class="text-right font-mono" style="color: #b91c1c;">${data.breakdown.refundCommissionRate}%</td>
              <td class="text-right font-mono font-bold" style="color: #b91c1c;">-${formatCurrencyINR(data.breakdown.refundCommissionAmount)}</td>
            </tr>
            ${
              data.breakdown.platformExpense > 0
                ? `<tr>
                    <td style="color: #b91c1c;">
                      <strong>Platform Incurred Expense / प्लेटफ़ॉर्म खर्च</strong>
                      <div style="font-size: 11px; color: #71717a;">${data.breakdown.platformExpenseReason ? `Reason / कारण: ${data.breakdown.platformExpenseReason}` : "Actual logistics / admin expense incurred"}</div>
                    </td>
                    <td>Admin Verified</td>
                    <td class="text-right font-mono" style="color: #b91c1c;">Actual</td>
                    <td class="text-right font-mono font-bold" style="color: #b91c1c;">-${formatCurrencyINR(data.breakdown.platformExpense)}</td>
                  </tr>`
                : ""
            }
            ${
              data.breakdown.sellerExpense > 0
                ? `<tr>
                    <td style="color: #b91c1c;">
                      <strong>Seller Incurred Expense / विक्रेता खर्च</strong>
                      <div style="font-size: 11px; color: #71717a;">${data.breakdown.sellerExpenseReason ? `Reason / कारण: ${data.breakdown.sellerExpenseReason}` : "Transit prep / handling expense incurred"}</div>
                    </td>
                    <td>Admin Verified</td>
                    <td class="text-right font-mono" style="color: #b91c1c;">Actual</td>
                    <td class="text-right font-mono font-bold" style="color: #b91c1c;">-${formatCurrencyINR(data.breakdown.sellerExpense)}</td>
                  </tr>`
                : ""
            }
            <tr>
              <td style="color: #b91c1c; font-weight: 700;">
                Total Deductions / कुल कटौतियां
              </td>
              <td>Commission + Verified Expenses</td>
              <td class="text-right font-mono" style="color: #b91c1c;">Total</td>
              <td class="text-right font-mono font-bold" style="color: #b91c1c;">-${formatCurrencyINR(data.breakdown.totalDeductions)}</td>
            </tr>
            <tr style="background: #f0fdf4;">
              <td style="color: #166534;">
                <strong>Final Net Refund / शुद्ध रिफंड राशि</strong>
                <div style="font-size: 11px; color: #166534;">Amount disbursed back to original payment method</div>
              </td>
              <td>Total Paid - Total Deductions</td>
              <td class="text-right font-mono" style="color: #166534;">Refund</td>
              <td class="text-right font-mono font-bold" style="color: #166534; font-size: 16px;">
                ${formatCurrencyINR(data.breakdown.finalRefundAmount)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Refund Reference Callout -->
      <div class="payment-callout status-paid">
        <div>
          <div style="font-size: 13px; font-weight: 700; text-transform: uppercase;">
            Refund Status / स्थिति: ${data.refund.statusLabelEn} (${data.refund.statusLabelHi})
          </div>
          ${
            data.refund.refundId
              ? `<div style="font-size: 11px; font-family: monospace; margin-top: 3px;">
                  Razorpay Refund ID / रिफंड आईडी: <strong>${data.refund.refundId}</strong>
                </div>`
              : ""
          }
          ${
            data.refund.paymentId
              ? `<div style="font-size: 11px; font-family: monospace; margin-top: 2px;">
                  Original Payment Reference: <strong>${data.refund.paymentId}</strong>
                </div>`
              : ""
          }
          <div style="font-size: 11px; color: #52525b; margin-top: 3px;">
            Reason / कारण: ${data.refund.reason}
          </div>
        </div>
        <div style="font-size: 12px; text-align: right;">
          Refund Date / रिफंड दिनांक:<br><strong>${data.refundDate}</strong>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="doc-footer">
      <div>
        Official Computer Generated Refund Statement / अधिकृत रिफंड रसीद<br>
        Processed via Razorpay Payment Gateway • GoatMart Platform
      </div>
      <div style="text-align: right;">
        www.bakrawale.com
      </div>
    </div>
  </div>
</body>
</html>`;
}
