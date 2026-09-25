import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import FinancialAuditLog from "@/models/FinancialAuditLog";
import {
  getAuthUser,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@/lib/security";

/**
 * GET /api/admin/audit-logs
 * 
 * Strict Admin-only access to immutable financial audit trail.
 * Supports filtering by orderId, action, entityType, actorRole, status, and date range.
 * Paginated to preserve operational efficiency.
 * NEVER allows mutation or deletion.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return unauthorizedResponse("Authentication required to access financial audit logs");
    }

    if (user.role !== "admin") {
      return forbiddenResponse("Forbidden: Administrator privileges required");
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));
    const skip = (page - 1) * limit;

    const orderId = searchParams.get("orderId");
    const action = searchParams.get("action");
    const entityType = searchParams.get("entityType");
    const actorRole = searchParams.get("actorRole");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const query: any = {};

    if (orderId) {
      query.orderId = orderId;
    }
    if (action) {
      query.action = action;
    }
    if (entityType) {
      query.entityType = entityType;
    }
    if (actorRole) {
      query.actorRole = actorRole;
    }
    if (status) {
      query.status = status;
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const [total, logs] = await Promise.all([
      FinancialAuditLog.countDocuments(query),
      FinancialAuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("[Admin Audit Logs API Error]:", error);
    return serverErrorResponse("Failed to fetch financial audit logs");
  }
}
