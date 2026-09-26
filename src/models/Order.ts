import mongoose,{Schema,Document,Model} from "mongoose";
export type OrderStatus="pending"|"payment_confirmed"|"processing"|"dispatched"|"out_for_delivery"|"delivered"|"cancelled"|"refunded";
export type PayoutStatus = "none" | "unpaid" | "processing" | "paid" | "failed" | "reversed";
export interface IOrder extends Document {
  _id: mongoose.Types.ObjectId;
  orderId: string;
  goat: mongoose.Types.ObjectId;
  goatName: string;
  goatBreed: string;
  goatImage: string;
  seller: mongoose.Types.ObjectId;
  sellerName: string;
  customer: mongoose.Types.ObjectId;
  customerName: string;
  amount: number;
  status: OrderStatus;
  payment: {
    razorpayOrderId: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    method?: string;
    status: "pending" | "paid" | "failed" | "refunded";
    paidAt?: Date;
  };
  delivery: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    city: string;
    state: string;
    pin: string;
    note?: string;
  };
  timeline: { s: string; d: string; done: boolean; updatedAt?: Date }[];
  reviewed: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Phase 2: Permanent Financial Snapshot
  sellerBasePrice?: number;
  deliveryCharge?: number;
  buyerPlatformFee?: number;
  buyerPlatformFeeRate?: number;
  sellerDeliveryAmount?: number;
  sellerGoatNet?: number;
  commissionRate?: number;
  commissionAmount?: number;
  sellerNetPayable?: number;
  currency?: string;
  financialCalculationVersion?: string;
  financialCalculatedAt?: Date;

  // Expenses Breakdown (Admin Controlled)
  expenses?: {
    type: "platform" | "seller";
    amount: number;
    reason: string;
    recordedBy?: mongoose.Types.ObjectId;
    recordedByRole?: string;
    recordedAt?: Date;
  }[];

  // Step 8: Cancellation & Refund Tracking
  cancellation?: {
    cancelledAt?: Date;
    cancelledBy?: mongoose.Types.ObjectId;
    cancelledByRole?: "customer" | "seller" | "admin" | "system";
    reason?: string;
    refundCommissionRate?: number;
    refundCommissionAmount?: number;
    platformExpense?: number;
    sellerExpense?: number;
    totalDeductions?: number;
    finalRefundAmount?: number;
  };
  refund?: {
    status: "none" | "pending" | "processing" | "processed" | "failed";
    refundId?: string;
    amount?: number;
    currency?: string;
    initiatedAt?: Date;
    processedAt?: Date;
    failedAt?: Date;
    failureReason?: string;
    reason?: string;
    breakdown?: {
      totalCustomerPaid: number;
      refundCommissionRate: number;
      refundCommissionAmount: number;
      platformExpense: number;
      sellerExpense: number;
      totalDeductions: number;
      finalRefundAmount: number;
    };
  };

  // Step 9: Seller Payout Tracking
  payout?: {
    status: "none" | "unpaid" | "processing" | "paid" | "failed" | "reversed";
    transferId?: string;
    recipientAccountId?: string;
    amount?: number;
    currency?: string;
    idempotencyKey?: string;
    initiatedAt?: Date;
    processedAt?: Date;
    failedAt?: Date;
    reversedAt?: Date;
    failureReason?: string;
    reversalReason?: string;
    retryCount?: number;

    // Manual Payout fields
    isManual?: boolean;
    payoutMethod?: "UPI" | "BANK";
    referenceId?: string;
    utrNumber?: string;
    paidAt?: Date;
    paidBy?: mongoose.Types.ObjectId;
    paidByName?: string;
    adminNote?: string;
  };
}
const OrderSchema = new Schema<IOrder>(
  {
    orderId: { type: String, unique: true },
    goat: { type: Schema.Types.ObjectId, ref: "Goat", required: true },
    goatName: String,
    goatBreed: String,
    goatImage: String,
    seller: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sellerName: String,
    customer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    customerName: String,
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: [
        "pending",
        "payment_confirmed",
        "processing",
        "dispatched",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "refunded",
      ],
      default: "pending",
    },
    payment: {
      razorpayOrderId: { type: String },
      razorpayPaymentId: String,
      razorpaySignature: String,
      method: String,
      status: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded"],
        default: "pending",
      },
      paidAt: Date,
    },
    delivery: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: String,
      address: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pin: { type: String, required: true },
      note: String,
    },
    timeline: [
      {
        s: String,
        d: String,
        done: { type: Boolean, default: false },
        updatedAt: Date,
      },
    ],
    reviewed: { type: Boolean, default: false },

    // Phase 2: Immutable Financial Snapshot
    sellerBasePrice: { type: Number },
    deliveryCharge: { type: Number, default: 0 },
    buyerPlatformFee: { type: Number, default: 0 },
    buyerPlatformFeeRate: { type: Number, default: 0 },
    sellerDeliveryAmount: { type: Number, default: 0 },
    sellerGoatNet: { type: Number },
    commissionRate: { type: Number },
    commissionAmount: { type: Number },
    sellerNetPayable: { type: Number },
    currency: { type: String, default: "INR" },
    financialCalculationVersion: { type: String, default: "1.0" },
    financialCalculatedAt: { type: Date, default: Date.now },

    // Admin-controlled order expenses
    expenses: [
      {
        type: { type: String, enum: ["platform", "seller"], required: true },
        amount: { type: Number, required: true },
        reason: { type: String, required: true },
        recordedBy: { type: Schema.Types.ObjectId, ref: "User" },
        recordedByRole: { type: String, default: "admin" },
        recordedAt: { type: Date, default: Date.now },
      },
    ],

    // Step 8: Cancellation & Refund Tracking
    cancellation: {
      cancelledAt: Date,
      cancelledBy: { type: Schema.Types.ObjectId, ref: "User" },
      cancelledByRole: {
        type: String,
        enum: ["customer", "seller", "admin", "system"],
      },
      reason: String,
      refundCommissionRate: Number,
      refundCommissionAmount: Number,
      platformExpense: Number,
      sellerExpense: Number,
      totalDeductions: Number,
      finalRefundAmount: Number,
    },
    refund: {
      status: {
        type: String,
        enum: ["none", "pending", "processing", "processed", "failed"],
        default: "none",
      },
      refundId: String,
      amount: Number,
      currency: { type: String, default: "INR" },
      initiatedAt: Date,
      processedAt: Date,
      failedAt: Date,
      failureReason: String,
      reason: String,
      breakdown: {
        totalCustomerPaid: Number,
        refundCommissionRate: Number,
        refundCommissionAmount: Number,
        platformExpense: Number,
        sellerExpense: Number,
        totalDeductions: Number,
        finalRefundAmount: Number,
      },
    },

    // Step 9: Seller Payout Tracking
    payout: {
      status: {
        type: String,
        enum: ["none", "unpaid", "processing", "paid", "failed", "reversed"],
        default: "none",
      },
      transferId: String,
      recipientAccountId: String,
      amount: Number,
      currency: { type: String, default: "INR" },
      idempotencyKey: String,
      initiatedAt: Date,
      processedAt: Date,
      failedAt: Date,
      reversedAt: Date,
      failureReason: String,
      reversalReason: String,
      retryCount: { type: Number, default: 0 },
      isManual: { type: Boolean, default: false },
      payoutMethod: { type: String, enum: ["UPI", "BANK"] },
      referenceId: String,
      utrNumber: String,
      paidAt: Date,
      paidBy: { type: Schema.Types.ObjectId, ref: "User" },
      paidByName: String,
      adminNote: String,
    },
  },
  { timestamps: true }
);
OrderSchema.pre("save", async function (next) {
  if (!this.orderId) {
    const count = await mongoose.model("Order").countDocuments();
    this.orderId = `#BKR-${2400 + count + 1}`;
  }
  next();
});
OrderSchema.index({ customer: 1, createdAt: -1 });
OrderSchema.index({ seller: 1, createdAt: -1 });
OrderSchema.index({ "payment.razorpayOrderId": 1 }, { sparse: true });
OrderSchema.index({ "payment.razorpayPaymentId": 1 }, { sparse: true });
OrderSchema.index({ "refund.refundId": 1 }, { sparse: true });
OrderSchema.index({ "payout.transferId": 1 }, { sparse: true, unique: true });
OrderSchema.index({ "payout.status": 1, seller: 1 });
OrderSchema.index({ "payout.idempotencyKey": 1 }, { sparse: true, unique: true });
const Order: Model<IOrder> = mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);
export default Order;
