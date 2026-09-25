import mongoose, { Schema, Document, Model } from "mongoose";

export type FinancialAuditEventType =
  | "payment_initiated"
  | "payment_verified"
  | "payment_failed"
  | "webhook_received"
  | "webhook_processed"
  | "webhook_failed"
  | "snapshot_created"
  | "cancellation_requested"
  | "refund_initiated"
  | "refund_processed"
  | "refund_failed"
  | "payout_eligible"
  | "payout_initiated"
  | "payout_processing"
  | "payout_paid"
  | "payout_failed"
  | "payout_retried"
  | "reconciliation_run"
  | "expense_recorded"
  | "seller_payment_details_updated"
  | "seller_payment_details_verified";

export type AuditActorRole = "customer" | "seller" | "admin" | "system" | "webhook";
export type AuditEntityType = "order" | "payout" | "refund" | "payment" | "reconciliation" | "seller";

export interface IFinancialAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  action: FinancialAuditEventType;
  entityType: AuditEntityType;
  entityId: string;
  orderId?: string;
  actorId?: string;
  actorRole: AuditActorRole;
  actorName?: string;
  amount?: number;
  currency?: string;
  previousState?: string;
  newState?: string;
  providerReference?: string;
  status: "success" | "failure";
  reason?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const FinancialAuditLogSchema = new Schema<IFinancialAuditLog>(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      enum: ["order", "payout", "refund", "payment", "reconciliation", "seller"],
      required: true,
      index: true,
    },
    entityId: {
      type: String,
      required: true,
      index: true,
    },
    orderId: {
      type: String,
      index: true,
    },
    actorId: {
      type: String,
      index: true,
    },
    actorRole: {
      type: String,
      enum: ["customer", "seller", "admin", "system", "webhook"],
      required: true,
      index: true,
    },
    actorName: {
      type: String,
      default: "",
    },
    amount: {
      type: Number,
    },
    currency: {
      type: String,
      default: "INR",
    },
    previousState: {
      type: String,
    },
    newState: {
      type: String,
    },
    providerReference: {
      type: String,
      index: true,
    },
    status: {
      type: String,
      enum: ["success", "failure"],
      required: true,
      default: "success",
      index: true,
    },
    reason: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false, // Only createdAt, append-only
    versionKey: false,
  }
);

// Compound indexes for rapid administrative and forensic lookups
FinancialAuditLogSchema.index({ orderId: 1, createdAt: -1 });
FinancialAuditLogSchema.index({ action: 1, createdAt: -1 });
FinancialAuditLogSchema.index({ actorId: 1, createdAt: -1 });

// IMMUTABILITY HOOKS: Prevent modification and deletion of audit records
FinancialAuditLogSchema.pre(["updateOne", "updateMany", "findOneAndUpdate", "replaceOne"], function (next) {
  next(new Error("FinancialAuditLog is immutable: update operations are strictly forbidden."));
});

FinancialAuditLogSchema.pre(["deleteOne", "deleteMany", "findOneAndDelete"], function (next) {
  next(new Error("FinancialAuditLog is append-only: delete operations are strictly forbidden."));
});

const FinancialAuditLog: Model<IFinancialAuditLog> =
  mongoose.models.FinancialAuditLog ||
  mongoose.model<IFinancialAuditLog>("FinancialAuditLog", FinancialAuditLogSchema);

export default FinancialAuditLog;
