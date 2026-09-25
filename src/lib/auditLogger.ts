import connectDB from "@/lib/db";
import FinancialAuditLog, {
  FinancialAuditEventType,
  AuditActorRole,
  AuditEntityType,
  IFinancialAuditLog,
} from "@/models/FinancialAuditLog";

export interface LogFinancialEventParams {
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
  status?: "success" | "failure";
  reason?: string;
  metadata?: Record<string, any>;
}

/**
 * Sensitive field keys that must NEVER be persisted in audit logs.
 */
const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /key/i,
  /authorization/i,
  /signature/i,
  /cvv/i,
  /card/i,
  /pan/i,
  /auth/i,
  /cookie/i,
  /credential/i,
];

/**
 * Sanitizes metadata to protect customer and financial privacy.
 * Recursively redacts sensitive keys, masks bank account numbers to last 4 digits,
 * and removes any potential authorization headers or secret tokens.
 */
export function sanitizeAuditMetadata(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeAuditMetadata(item));
  }

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    const isSensitiveKey = SENSITIVE_KEY_PATTERNS.some((pattern) =>
      pattern.test(key)
    );

    if (isSensitiveKey) {
      // Redact completely
      sanitized[key] = "[REDACTED]";
      continue;
    }

    // Mask bank account numbers, showing only last 4 digits
    if (/accountnumber|bankaccount|account_no/i.test(key)) {
      if (typeof value === "string" && value.length > 4) {
        sanitized[key] = `****${value.slice(-4)}`;
      } else if (typeof value === "number") {
        const strVal = String(value);
        sanitized[key] = `****${strVal.slice(-4)}`;
      } else {
        sanitized[key] = "[REDACTED_ACCOUNT]";
      }
      continue;
    }

    if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeAuditMetadata(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Authoritative, append-only financial audit logging helper.
 * Strictly guarantees that sensitive data (passwords, tokens, secrets, full accounts)
 * are redacted before writing to MongoDB.
 * Ensures audit logging failure never crashes the calling business transaction.
 */
export async function logFinancialEvent(
  params: LogFinancialEventParams
): Promise<IFinancialAuditLog | null> {
  try {
    await connectDB();

    const sanitizedMetadata = params.metadata
      ? sanitizeAuditMetadata(params.metadata)
      : {};

    const auditEntry = new FinancialAuditLog({
      action: params.action,
      entityType: params.entityType,
      entityId: String(params.entityId),
      orderId: params.orderId ? String(params.orderId) : undefined,
      actorId: params.actorId ? String(params.actorId) : undefined,
      actorRole: params.actorRole,
      actorName: params.actorName || "",
      amount: typeof params.amount === "number" ? params.amount : undefined,
      currency: params.currency || "INR",
      previousState: params.previousState,
      newState: params.newState,
      providerReference: params.providerReference,
      status: params.status || "success",
      reason: params.reason,
      metadata: sanitizedMetadata,
      createdAt: new Date(),
    });

    return await auditEntry.save();
  } catch (err: any) {
    // Non-blocking error handling: Log error server-side without interrupting the transaction
    console.error("[FinancialAuditLog Error] Failed to write audit log:", err?.message || err);
    return null;
  }
}
