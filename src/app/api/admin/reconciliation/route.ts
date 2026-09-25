import { NextRequest, NextResponse } from "next/server";
import { runFinancialReconciliation } from "@/lib/financialReconciliation";
import { logFinancialEvent } from "@/lib/auditLogger";
import {
  getAuthUser,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@/lib/security";

/**
 * GET /api/admin/reconciliation
 * 
 * Strict Admin-only read-only financial reconciliation inspection.
 * Reconciles internal records (and external provider if requested/available).
 * NEVER mutates database records or triggers financial operations.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return unauthorizedResponse("Authentication required to view financial reconciliation");
    }

    if (user.role !== "admin") {
      return forbiddenResponse("Forbidden: Administrator privileges required");
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const checkProvider = searchParams.get("checkProvider") === "true";
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : undefined;
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : undefined;

    const summary = await runFinancialReconciliation({
      status,
      checkProvider,
      startDate,
      endDate,
    });

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    console.error("[Admin Reconciliation GET Error]:", error);
    return serverErrorResponse("Failed to perform financial reconciliation check");
  }
}

/**
 * POST /api/admin/reconciliation
 * 
 * Initiates an official reconciliation check and logs an immutable audit trail event.
 * Strictly READ-ONLY on financial records (orders, payments, payouts, refunds).
 * Admin-only authorization required.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return unauthorizedResponse("Authentication required to run financial reconciliation");
    }

    if (user.role !== "admin") {
      return forbiddenResponse("Forbidden: Administrator privileges required");
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Empty or non-JSON body is valid
    }

    const checkProvider = body.checkProvider === true;
    const startDate = body.startDate ? new Date(body.startDate) : undefined;
    const endDate = body.endDate ? new Date(body.endDate) : undefined;
    const status = body.status || undefined;

    // Run strictly read-only reconciliation
    const summary = await runFinancialReconciliation({
      status,
      checkProvider,
      startDate,
      endDate,
    });

    // Record audit event for the reconciliation run
    await logFinancialEvent({
      action: "reconciliation_run",
      entityType: "reconciliation",
      entityId: summary.runId,
      actorId: user.id,
      actorRole: "admin",
      actorName: user.name || "Administrator",
      status: "success",
      metadata: {
        totalOrdersAudited: summary.totalOrdersAudited,
        matchedCount: summary.matchedCount,
        mismatchCount: summary.mismatchCount,
        pendingCount: summary.pendingCount,
        internalOnlyCount: summary.internalOnlyCount,
        discrepancyCount: summary.discrepancyCount,
        checkProvider,
      },
    });

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    console.error("[Admin Reconciliation POST Error]:", error);
    return serverErrorResponse("Failed to execute reconciliation check");
  }
}
