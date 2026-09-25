"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { formatCurrencyINR } from "@/lib/commission";

const G = "#c8a96e";

interface AuditLogEntry {
  _id: string;
  action: string;
  entityType: string;
  entityId: string;
  orderId?: string;
  actorId?: string;
  actorRole: string;
  actorName?: string;
  amount?: number;
  currency?: string;
  previousState?: string;
  newState?: string;
  providerReference?: string;
  status: "success" | "failure";
  reason?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface ReconciliationItem {
  orderId: string;
  orderNumber: string;
  status: "matched" | "mismatch" | "pending" | "internal_only";
  reconciledAt: string;
  discrepancies: Array<{
    field: string;
    expected: any;
    actual: any;
    severity: "error" | "warning";
    message: string;
  }>;
  snapshot: {
    sellerBasePrice: number;
    commissionRate: number;
    commissionAmount: number;
    sellerNetPayable: number;
    currency: string;
  };
  payment: {
    orderStatus: string;
    paymentStatus?: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    providerVerified?: boolean;
    providerStatus?: string;
  };
  refund: {
    refundStatus?: string;
    refundId?: string;
    refundAmount?: number;
  };
  payout: {
    payoutStatus?: string;
    transferId?: string;
    payoutAmount?: number;
    expectedPayoutAmount?: number;
  };
}

interface ReconciliationSummary {
  runId: string;
  executedAt: string;
  totalOrdersAudited: number;
  matchedCount: number;
  mismatchCount: number;
  pendingCount: number;
  internalOnlyCount: number;
  totalGrossAmount: number;
  totalCommissionAmount: number;
  totalSellerNetPayable: number;
  discrepancyCount: number;
  orders: ReconciliationItem[];
}

export default function AdminAuditAndReconciliation() {
  const [subTab, setSubTab] = useState<"logs" | "recon">("logs");

  // Audit Logs State
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const [actorRoleFilter, setActorRoleFilter] = useState("");
  const [orderIdFilter, setOrderIdFilter] = useState("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Reconciliation State
  const [reconSummary, setReconSummary] = useState<ReconciliationSummary | null>(null);
  const [reconLoading, setReconLoading] = useState(false);
  const [reconActionLoading, setReconActionLoading] = useState(false);
  const [reconFilter, setReconFilter] = useState<"all" | "mismatch" | "pending" | "matched">("all");

  const fetchLogs = async () => {
    try {
      setLogsLoading(true);
      const params = new URLSearchParams({
        page: String(logsPage),
        limit: "20",
      });
      if (actionFilter) params.append("action", actionFilter);
      if (actorRoleFilter) params.append("actorRole", actorRoleFilter);
      if (orderIdFilter.trim()) params.append("orderId", orderIdFilter.trim());

      const res = await axios.get(`/api/admin/audit-logs?${params.toString()}`);
      if (res.data.success) {
        setLogs(res.data.data);
        setTotalPages(res.data.pagination.totalPages || 1);
        setTotalLogs(res.data.pagination.total || 0);
      }
    } catch {
      toast.error("Failed to load audit logs");
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchReconciliation = async () => {
    try {
      setReconLoading(true);
      const res = await axios.get("/api/admin/reconciliation");
      if (res.data.success) {
        setReconSummary(res.data.data);
      }
    } catch {
      toast.error("Failed to load reconciliation report");
    } finally {
      setReconLoading(false);
    }
  };

  const triggerReconciliationRun = async () => {
    try {
      setReconActionLoading(true);
      const res = await axios.post("/api/admin/reconciliation", {});
      if (res.data.success) {
        setReconSummary(res.data.data);
        toast.success("Reconciliation check completed");
      }
    } catch {
      toast.error("Failed to execute reconciliation check");
    } finally {
      setReconActionLoading(false);
    }
  };

  useEffect(() => {
    if (subTab === "logs") {
      fetchLogs();
    } else {
      fetchReconciliation();
    }
  }, [subTab, logsPage, actionFilter, actorRoleFilter]);

  return (
    <div className="space-y-6">
      {/* Sub navigation header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#252525]">
        <div>
          <h1 className="text-xl font-bold text-white font-serif flex items-center gap-2">
            <span>📜</span> Financial Audit & Reconciliation
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Immutable financial audit trail and read-only consistency verification engine.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#141414] p-1 rounded-xl border border-[#252525]">
          <button
            onClick={() => setSubTab("logs")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
              subTab === "logs"
                ? "bg-[#c8a96e] text-black shadow-md"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Audit Logs ({totalLogs})
          </button>
          <button
            onClick={() => setSubTab("recon")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
              subTab === "recon"
                ? "bg-[#c8a96e] text-black shadow-md"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Reconciliation Engine
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: AUDIT LOGS */}
      {subTab === "logs" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 bg-[#141414] rounded-xl border border-[#252525]">
            <div>
              <label className="text-[11px] text-gray-400 block mb-1">Filter by Action</label>
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setLogsPage(1);
                }}
                className="w-full bg-[#1c1c1c] border border-[#333] rounded-lg px-3 py-1.5 text-xs text-white"
              >
                <option value="">All Actions</option>
                <option value="payment_verified">Payment Verified</option>
                <option value="payment_failed">Payment Failed</option>
                <option value="refund_initiated">Refund Initiated</option>
                <option value="refund_processed">Refund Processed</option>
                <option value="refund_failed">Refund Failed</option>
                <option value="payout_eligible">Payout Eligible</option>
                <option value="payout_initiated">Payout Initiated</option>
                <option value="payout_paid">Payout Paid</option>
                <option value="payout_failed">Payout Failed</option>
                <option value="payout_retried">Payout Retried</option>
                <option value="reconciliation_run">Reconciliation Run</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-gray-400 block mb-1">Actor Role</label>
              <select
                value={actorRoleFilter}
                onChange={(e) => {
                  setActorRoleFilter(e.target.value);
                  setLogsPage(1);
                }}
                className="w-full bg-[#1c1c1c] border border-[#333] rounded-lg px-3 py-1.5 text-xs text-white"
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="customer">Customer</option>
                <option value="seller">Seller</option>
                <option value="system">System</option>
                <option value="webhook">Webhook</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-gray-400 block mb-1">Search Order ID</label>
              <input
                type="text"
                value={orderIdFilter}
                onChange={(e) => setOrderIdFilter(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
                placeholder="MongoDB Order ID..."
                className="w-full bg-[#1c1c1c] border border-[#333] rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={fetchLogs}
                className="w-full bg-[#252525] hover:bg-[#333] text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors border border-[#3a3a3a]"
              >
                Apply Filters
              </button>
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-[#141414] rounded-2xl border border-[#252525] overflow-hidden">
            {logsLoading ? (
              <div className="py-16 text-center text-gray-400 text-xs">Loading audit trail...</div>
            ) : logs.length === 0 ? (
              <div className="py-16 text-center text-gray-500 text-xs">
                No financial audit events match the current filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#1c1c1c] text-gray-400 border-b border-[#252525]">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Entity</th>
                      <th className="py-3 px-4">Actor</th>
                      <th className="py-3 px-4">State Transition</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222]">
                    {logs.map((log) => {
                      const isExpanded = expandedLogId === log._id;
                      return (
                        <tr key={log._id} className="hover:bg-[#181818] transition-colors">
                          <td className="py-3 px-4 text-gray-400 whitespace-nowrap font-mono text-[11px]">
                            {new Date(log.createdAt).toLocaleString("en-IN", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-white font-mono bg-[#222] px-2 py-0.5 rounded text-[11px]">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-300">
                            <div>
                              <span className="capitalize text-gray-400">{log.entityType}</span>
                              {log.orderId && (
                                <span className="block font-mono text-[10px] text-gray-500 truncate max-w-[120px]">
                                  {log.orderId}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                  log.actorRole === "admin"
                                    ? "bg-purple-900/40 text-purple-300 border border-purple-800"
                                    : log.actorRole === "webhook"
                                    ? "bg-blue-900/40 text-blue-300 border border-blue-800"
                                    : log.actorRole === "system"
                                    ? "bg-amber-900/40 text-amber-300 border border-amber-800"
                                    : "bg-gray-800 text-gray-300"
                                }`}
                              >
                                {log.actorRole}
                              </span>
                              {log.actorName && (
                                <span className="text-gray-300 text-[11px] truncate max-w-[100px]">
                                  {log.actorName}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-400">
                            {log.previousState || log.newState ? (
                              <div className="flex items-center gap-1 text-[11px] font-mono">
                                <span className="text-gray-500">{log.previousState || "—"}</span>
                                <span className="text-gray-600">→</span>
                                <span className="text-gray-200 font-semibold">{log.newState || "—"}</span>
                              </div>
                            ) : (
                              <span className="text-gray-600">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-medium text-white">
                            {typeof log.amount === "number" ? formatCurrencyINR(log.amount) : "—"}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                log.status === "success"
                                  ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
                                  : "bg-rose-950/60 text-rose-400 border border-rose-800/40"
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setExpandedLogId(isExpanded ? null : log._id)}
                              className="text-[11px] text-[#c8a96e] hover:underline"
                            >
                              {isExpanded ? "Hide" : "Inspect"}
                            </button>
                            {isExpanded && (
                              <div className="mt-2 text-left bg-[#101010] p-3 rounded-lg border border-[#252525] space-y-1 text-[11px] font-mono text-gray-300">
                                <div>
                                  <strong className="text-gray-400">Log ID:</strong> {log._id}
                                </div>
                                {log.providerReference && (
                                  <div>
                                    <strong className="text-gray-400">Provider Ref:</strong>{" "}
                                    {log.providerReference}
                                  </div>
                                )}
                                {log.reason && (
                                  <div>
                                    <strong className="text-rose-400">Reason:</strong> {log.reason}
                                  </div>
                                )}
                                {log.metadata && Object.keys(log.metadata).length > 0 && (
                                  <div className="mt-1 pt-1 border-t border-[#222]">
                                    <strong className="text-gray-400">Metadata:</strong>
                                    <pre className="text-[10px] text-gray-400 mt-1 whitespace-pre-wrap">
                                      {JSON.stringify(log.metadata, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-[#181818] border-t border-[#252525] text-xs">
                <span className="text-gray-400">
                  Page {logsPage} of {totalPages} ({totalLogs} events)
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={logsPage <= 1}
                    onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 bg-[#222] hover:bg-[#333] disabled:opacity-40 rounded text-white"
                  >
                    Previous
                  </button>
                  <button
                    disabled={logsPage >= totalPages}
                    onClick={() => setLogsPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1 bg-[#222] hover:bg-[#333] disabled:opacity-40 rounded text-white"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: RECONCILIATION ENGINE */}
      {subTab === "recon" && (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl p-4 border border-[#252525] bg-[#141414] relative overflow-hidden">
              <div className="text-2xl font-bold text-white mb-1">
                {reconSummary?.totalOrdersAudited ?? 0}
              </div>
              <div className="text-xs text-gray-400 font-sans uppercase">Total Orders Audited</div>
            </div>

            <div className="rounded-2xl p-4 border border-emerald-900/40 bg-emerald-950/20 relative overflow-hidden">
              <div className="text-2xl font-bold text-emerald-400 mb-1">
                {reconSummary?.matchedCount ?? 0}
              </div>
              <div className="text-xs text-emerald-500 font-sans uppercase">Fully Matched</div>
            </div>

            <div className="rounded-2xl p-4 border border-rose-900/40 bg-rose-950/20 relative overflow-hidden">
              <div className="text-2xl font-bold text-rose-400 mb-1">
                {reconSummary?.mismatchCount ?? 0}
              </div>
              <div className="text-xs text-rose-500 font-sans uppercase">Mismatches / Errors</div>
            </div>

            <div className="rounded-2xl p-4 border border-amber-900/40 bg-amber-950/20 relative overflow-hidden">
              <div className="text-2xl font-bold text-amber-400 mb-1">
                {reconSummary?.pendingCount ?? 0}
              </div>
              <div className="text-xs text-amber-500 font-sans uppercase">Pending Operations</div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#141414] rounded-xl border border-[#252525]">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">View Status:</span>
              <div className="flex gap-1">
                {(["all", "mismatch", "pending", "matched"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setReconFilter(filter)}
                    className={`px-3 py-1 text-xs rounded-lg uppercase font-semibold transition-colors ${
                      reconFilter === filter
                        ? "bg-[#c8a96e] text-black"
                        : "bg-[#222] text-gray-400 hover:text-white"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                disabled={reconActionLoading}
                onClick={triggerReconciliationRun}
                className="bg-[#c8a96e] hover:bg-[#b5955a] text-black text-xs font-bold py-2 px-4 rounded-xl transition-colors shadow-lg disabled:opacity-50"
              >
                {reconActionLoading ? "Running Verification..." : "Run Reconciliation Check"}
              </button>
            </div>
          </div>

          {/* Reconciliation Orders Table */}
          <div className="bg-[#141414] rounded-2xl border border-[#252525] overflow-hidden">
            {reconLoading ? (
              <div className="py-16 text-center text-gray-400 text-xs">
                Running financial reconciliation checks...
              </div>
            ) : !reconSummary || reconSummary.orders.length === 0 ? (
              <div className="py-16 text-center text-gray-500 text-xs">
                No orders available for reconciliation.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#1c1c1c] text-gray-400 border-b border-[#252525]">
                      <th className="py-3 px-4">Order Number</th>
                      <th className="py-3 px-4">Base Price</th>
                      <th className="py-3 px-4">Commission</th>
                      <th className="py-3 px-4">Seller Net</th>
                      <th className="py-3 px-4">Payment</th>
                      <th className="py-3 px-4">Payout</th>
                      <th className="py-3 px-4 text-center">Recon Status</th>
                      <th className="py-3 px-4">Discrepancy Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222]">
                    {reconSummary.orders
                      .filter((o) => {
                        if (reconFilter === "all") return true;
                        if (reconFilter === "mismatch") return o.status === "mismatch";
                        if (reconFilter === "pending") return o.status === "pending";
                        if (reconFilter === "matched")
                          return o.status === "matched" || o.status === "internal_only";
                        return true;
                      })
                      .map((order) => (
                        <tr key={order.orderId} className="hover:bg-[#181818] transition-colors">
                          <td className="py-3 px-4 font-mono font-medium text-white">
                            {order.orderNumber}
                          </td>
                          <td className="py-3 px-4 font-mono text-gray-300">
                            {formatCurrencyINR(order.snapshot.sellerBasePrice)}
                          </td>
                          <td className="py-3 px-4 font-mono text-gray-300">
                            {formatCurrencyINR(order.snapshot.commissionAmount)} (
                            {order.snapshot.commissionRate}%)
                          </td>
                          <td className="py-3 px-4 font-mono text-[#c8a96e] font-semibold">
                            {formatCurrencyINR(order.snapshot.sellerNetPayable)}
                          </td>
                          <td className="py-3 px-4">
                            <span className="capitalize font-mono text-gray-300">
                              {order.payment.paymentStatus || "unpaid"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="capitalize font-mono text-gray-300">
                              {order.payout.payoutStatus || "none"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                order.status === "matched"
                                  ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
                                  : order.status === "internal_only"
                                  ? "bg-blue-950/60 text-blue-400 border border-blue-800/40"
                                  : order.status === "pending"
                                  ? "bg-amber-950/60 text-amber-400 border border-amber-800/40"
                                  : "bg-rose-950/60 text-rose-400 border border-rose-800/40"
                              }`}
                            >
                              {order.status === "internal_only" ? "INTERNAL OK" : order.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {order.discrepancies.length === 0 ? (
                              <span className="text-emerald-500 font-mono text-[11px]">
                                ✓ All checks consistent
                              </span>
                            ) : (
                              <div className="space-y-1">
                                {order.discrepancies.map((d, i) => (
                                  <div
                                    key={i}
                                    className="text-rose-400 text-[11px] font-mono bg-rose-950/20 px-2 py-1 rounded border border-rose-900/30"
                                  >
                                    ⚠ {d.message}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
