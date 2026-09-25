"use client";

import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { formatCurrencyINR } from "@/lib/commission";

interface PayoutSeller {
  id: string;
  name: string;
  email: string;
  farmName: string;
  isApproved: boolean;
  onboardingStatus: string;
  razorpayAccountId: string | null;
}

interface PayoutItem {
  id: string;
  orderId: string;
  goatName: string;
  goatBreed: string;
  customerName: string;
  seller: PayoutSeller;
  sellerBasePrice: number;
  commissionRate: number;
  commissionAmount: number;
  sellerNetPayable: number;
  currency: string;
  paymentStatus: string;
  paymentId: string | null;
  orderStatus: string;
  refundStatus: string;
  payout: {
    status: "none" | "unpaid" | "processing" | "paid" | "failed" | "reversed";
    transferId: string | null;
    recipientAccountId: string | null;
    amount: number;
    currency: string;
    idempotencyKey: string | null;
    initiatedAt: string | null;
    processedAt: string | null;
    failedAt: string | null;
    failureReason: string | null;
    retryCount: number;
  };
  eligibility: {
    eligible: boolean;
    code?: string;
    reason?: string;
  };
  createdAt: string;
}

interface PayoutSummary {
  totalCandidateOrders: number;
  totalEligible: number;
  totalUnpaid: number;
  totalProcessing: number;
  totalPaid: number;
  totalFailed: number;
  totalPaidAmount: number;
  totalPendingAmount: number;
}

export default function AdminPayouts() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<PayoutItem[]>([]);
  const [summary, setSummary] = useState<PayoutSummary | null>(null);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [confirmModalOrder, setConfirmModalOrder] = useState<PayoutItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPayouts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get("/api/admin/payouts");
      if (res.data.success && res.data.data) {
        setQueue(res.data.data.queue || []);
        setSummary(res.data.data.summary || null);
      } else {
        setError("Failed to load payout queue records");
      }
    } catch (err: any) {
      console.error("Admin payouts fetch error:", err);
      setError(
        err?.response?.data?.error ||
          "Unable to load payout queue. Please verify your admin credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  const handleInitiatePayout = async () => {
    if (!confirmModalOrder) return;

    setActionLoading(true);
    try {
      const res = await axios.post("/api/admin/payouts", {
        orderId: confirmModalOrder.id,
      });

      if (res.data.success) {
        toast.success(
          `Payout of ${formatCurrencyINR(confirmModalOrder.sellerNetPayable)} successfully processed!`
        );
        setConfirmModalOrder(null);
        await fetchPayouts();
      } else {
        toast.error(res.data.error || "Payout initiation could not be completed");
      }
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Failed to initiate payout transfer";
      toast.error(errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered queue items
  const filteredQueue = useMemo(() => {
    return queue.filter((item) => {
      // Status filter
      if (statusFilter === "eligible") {
        if (!item.eligibility.eligible || item.payout.status === "paid" || item.payout.status === "processing") {
          return false;
        }
      } else if (statusFilter !== "all") {
        if (item.payout.status !== statusFilter) {
          return false;
        }
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchOrder = item.orderId.toLowerCase().includes(q);
        const matchSeller = item.seller.name.toLowerCase().includes(q) || item.seller.farmName.toLowerCase().includes(q);
        const matchGoat = item.goatName.toLowerCase().includes(q);
        const matchTransfer = item.payout.transferId?.toLowerCase().includes(q);
        if (!matchOrder && !matchSeller && !matchGoat && !matchTransfer) {
          return false;
        }
      }

      return true;
    });
  }, [queue, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white font-serif flex items-center gap-2">
            <span>💸</span> Seller Payout Management
          </h2>
          <p className="text-xs text-gray-400 font-sans mt-1">
            Review delivery status, verify Razorpay linked accounts, and authorize server-side transfers.
          </p>
        </div>

        <button
          onClick={fetchPayouts}
          disabled={loading}
          className="px-3.5 py-1.5 rounded-xl border border-[#333] hover:border-[#c8a96e] text-xs font-sans text-gray-300 hover:text-white transition-colors bg-[#1a1a1a] flex items-center gap-2 self-start sm:self-auto"
        >
          <span className={loading ? "animate-spin" : ""}>🔄</span> Refresh Queue
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#252525] bg-[#1a1a1a] p-4 relative overflow-hidden">
          <div className="text-xs text-emerald-400 font-sans uppercase tracking-wider font-semibold mb-1">
            Eligible to Pay
          </div>
          <div className="text-2xl font-bold text-white">
            {summary?.totalEligible ?? 0}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Pending transfers: {formatCurrencyINR(summary?.totalPendingAmount ?? 0)}
          </div>
        </div>

        <div className="rounded-2xl border border-[#252525] bg-[#1a1a1a] p-4 relative overflow-hidden">
          <div className="text-xs text-sky-400 font-sans uppercase tracking-wider font-semibold mb-1">
            Processing Transfers
          </div>
          <div className="text-2xl font-bold text-white">
            {summary?.totalProcessing ?? 0}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Provider transfer pending
          </div>
        </div>

        <div className="rounded-2xl border border-[#252525] bg-[#1a1a1a] p-4 relative overflow-hidden">
          <div className="text-xs text-[#c8a96e] font-sans uppercase tracking-wider font-semibold mb-1">
            Total Paid
          </div>
          <div className="text-2xl font-bold text-white">
            {formatCurrencyINR(summary?.totalPaidAmount ?? 0)}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Completed: {summary?.totalPaid ?? 0} orders
          </div>
        </div>

        <div className="rounded-2xl border border-[#252525] bg-[#1a1a1a] p-4 relative overflow-hidden">
          <div className="text-xs text-red-400 font-sans uppercase tracking-wider font-semibold mb-1">
            Failed Payouts
          </div>
          <div className="text-2xl font-bold text-white">
            {summary?.totalFailed ?? 0}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Requires admin retry
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-[#252525] bg-[#1a1a1a] p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 md:pb-0">
          {[
            { id: "all", label: "All Orders" },
            { id: "eligible", label: `Eligible (${summary?.totalEligible ?? 0})` },
            { id: "unpaid", label: "Unpaid" },
            { id: "processing", label: "Processing" },
            { id: "paid", label: "Paid" },
            { id: "failed", label: "Failed" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-sans whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? "bg-[#c8a96e] text-zinc-950 font-bold"
                  : "bg-[#222] text-gray-300 hover:text-white hover:bg-[#2a2a2a]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <input
            type="text"
            placeholder="Search Order ID, Seller, Goat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#121212] border border-[#2d2d2d] rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 font-sans focus:outline-none focus:border-[#c8a96e]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Payout Queue Table */}
      <div className="rounded-2xl border border-[#252525] bg-[#1a1a1a] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 font-sans text-sm flex flex-col items-center gap-2">
            <span className="animate-spin text-2xl">⏳</span>
            Loading seller payout queue...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-400 font-sans text-xs">
            {error}
          </div>
        ) : filteredQueue.length === 0 ? (
          <div className="p-12 text-center text-gray-500 font-sans text-sm">
            No payout records found matching the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#141414] border-b border-[#252525] text-gray-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Order & Goat</th>
                  <th className="py-3 px-4">Seller Details</th>
                  <th className="py-3 px-4">Financial Snapshot</th>
                  <th className="py-3 px-4">Net Payable</th>
                  <th className="py-3 px-4">Payout Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {filteredQueue.map((item) => {
                  const isPaid = item.payout.status === "paid";
                  const isProcessing = item.payout.status === "processing";
                  const isFailed = item.payout.status === "failed";
                  const canInitiate =
                    item.eligibility.eligible &&
                    !isPaid &&
                    !isProcessing;
                  const canRetry = isFailed && item.eligibility.eligible;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-[#1f1f1f]/60 transition-colors"
                    >
                      {/* Order & Goat */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-bold text-white font-mono text-xs">
                          {item.orderId}
                        </div>
                        <div className="text-gray-300 font-medium text-[11px] mt-0.5">
                          {item.goatName} ({item.goatBreed})
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1">
                          Delivery: <span className="capitalize">{item.orderStatus}</span>
                        </div>
                        {item.refundStatus !== "none" && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 text-[9px] rounded font-bold bg-amber-950/80 text-amber-400 border border-amber-800/40">
                            Refund: {item.refundStatus}
                          </span>
                        )}
                      </td>

                      {/* Seller Details */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-bold text-white">
                          {item.seller.name}
                        </div>
                        <div className="text-gray-400 text-[11px]">
                          {item.seller.farmName}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          {item.seller.email}
                        </div>
                        {item.seller.razorpayAccountId ? (
                          <div className="text-[10px] font-mono text-emerald-400 mt-1 flex items-center gap-1">
                            <span>💳</span> {item.seller.razorpayAccountId}
                          </div>
                        ) : (
                          <div className="text-[10px] text-red-400 mt-1">
                            ⚠️ No linked account
                          </div>
                        )}
                      </td>

                      {/* Financial Breakdown */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="text-gray-300">
                          Base: <span className="font-medium text-white">{formatCurrencyINR(item.sellerBasePrice)}</span>
                        </div>
                        <div className="text-gray-400 text-[10px] mt-0.5">
                          Fee ({item.commissionRate}%): -{formatCurrencyINR(item.commissionAmount)}
                        </div>
                        <div className="text-[9px] text-gray-500 mt-1">
                          Calculated: {new Date(item.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </td>

                      {/* Net Payable */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="text-sm font-bold text-[#c8a96e] font-mono">
                          {formatCurrencyINR(item.sellerNetPayable)}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          Payment: <span className={item.paymentStatus === "paid" ? "text-emerald-400 font-medium" : "text-amber-400"}>{item.paymentStatus}</span>
                        </div>
                      </td>

                      {/* Payout Status */}
                      <td className="py-3.5 px-4 align-top">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isPaid
                              ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
                              : isProcessing
                              ? "bg-sky-950/60 text-sky-400 border border-sky-800/40 animate-pulse"
                              : isFailed
                              ? "bg-red-950/60 text-red-400 border border-red-800/40"
                              : item.payout.status === "unpaid"
                              ? "bg-amber-950/60 text-amber-400 border border-amber-800/40"
                              : "bg-gray-800 text-gray-400 border border-gray-700"
                          }`}
                        >
                          {item.payout.status}
                        </span>

                        {item.payout.transferId && (
                          <div className="text-[10px] font-mono text-gray-400 mt-1 truncate max-w-[140px]" title={item.payout.transferId}>
                            ID: {item.payout.transferId}
                          </div>
                        )}

                        {item.payout.failureReason && (
                          <div className="text-[10px] text-red-400 mt-1 max-w-[150px] truncate" title={item.payout.failureReason}>
                            Reason: {item.payout.failureReason}
                          </div>
                        )}

                        {!item.eligibility.eligible && !isPaid && (
                          <div className="text-[9px] text-gray-500 mt-1 max-w-[140px] truncate" title={item.eligibility.reason}>
                            ⚠️ {item.eligibility.reason}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 align-top text-right">
                        {isPaid ? (
                          <div className="flex flex-col items-end gap-1.5">
                            <span className="text-xs font-semibold text-emerald-400 font-sans inline-flex items-center gap-1">
                              ✓ Paid
                            </span>
                            <a
                              href={`/api/documents/payout-receipt/${item.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-sans text-gray-300 hover:text-[#c8a96e] border border-[#333] hover:border-[#c8a96e] px-2 py-0.5 rounded-lg transition-colors flex items-center gap-1"
                              title="View Payout Disbursement Receipt / पेआउट रसीद"
                            >
                              <span>📄</span> Receipt
                            </a>
                          </div>
                        ) : isProcessing ? (
                          <span className="text-xs font-semibold text-sky-400 font-sans inline-flex items-center gap-1">
                            <span className="animate-spin text-[10px]">⏳</span> Processing
                          </span>
                        ) : canRetry ? (
                          <button
                            onClick={() => setConfirmModalOrder(item)}
                            className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs font-sans transition-colors shadow-xs"
                          >
                            Retry Payout
                          </button>
                        ) : canInitiate ? (
                          <button
                            onClick={() => setConfirmModalOrder(item)}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#c8a96e] to-[#b38f53] hover:brightness-110 text-zinc-950 font-bold text-xs font-sans transition-all shadow-xs"
                          >
                            Initiate Payout
                          </button>
                        ) : (
                          <button
                            disabled
                            title={item.eligibility.reason || "Payout requirements not met"}
                            className="px-2.5 py-1 rounded-xl bg-[#222] text-gray-500 text-xs font-sans cursor-not-allowed border border-[#333]"
                          >
                            Ineligible
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#141414] border border-[#2d2d2d] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#252525] pb-3">
              <h3 className="text-base font-bold text-white font-serif flex items-center gap-2">
                <span>⚠️</span> Confirm Seller Payout Transfer
              </h3>
              <button
                onClick={() => !actionLoading && setConfirmModalOrder(null)}
                disabled={actionLoading}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* Warning Callout */}
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/40 text-amber-300 text-xs font-sans leading-relaxed">
              <strong>Production Financial Transfer:</strong> Initiating this payout will call the server-side Razorpay Route transfer engine to transfer funds directly into the seller's linked account.
            </div>

            {/* Transfer Details Card */}
            <div className="rounded-xl bg-[#1c1c1c] border border-[#282828] p-4 space-y-2.5 text-xs font-sans">
              <div className="flex justify-between">
                <span className="text-gray-400">Order ID:</span>
                <span className="text-white font-mono font-bold">{confirmModalOrder.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Seller:</span>
                <span className="text-white font-medium">{confirmModalOrder.seller.name} ({confirmModalOrder.seller.farmName})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Linked Account ID:</span>
                <span className="text-emerald-400 font-mono">{confirmModalOrder.seller.razorpayAccountId || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Stored Commission (Snapshot):</span>
                <span className="text-gray-300">{confirmModalOrder.commissionRate}% (-{formatCurrencyINR(confirmModalOrder.commissionAmount)})</span>
              </div>
              <div className="border-t border-[#2d2d2d] pt-2 flex justify-between items-center">
                <span className="text-sm font-bold text-white">Authoritative Payout:</span>
                <span className="text-base font-bold text-[#c8a96e] font-mono">
                  {formatCurrencyINR(confirmModalOrder.sellerNetPayable)} {confirmModalOrder.currency}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmModalOrder(null)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl border border-[#333] text-gray-300 hover:text-white hover:bg-[#222] text-xs font-sans transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInitiatePayout}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:brightness-110 text-white font-bold text-xs font-sans transition-all flex items-center gap-2 shadow-md"
              >
                {actionLoading && <span className="animate-spin">⏳</span>}
                {actionLoading ? "Processing Transfer..." : "Confirm & Transfer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
