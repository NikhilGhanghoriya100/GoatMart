"use client";

import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { formatCurrencyINR } from "@/lib/commission";

interface SellerPaymentDetails {
  paymentMethod?: "UPI" | "BANK" | "NONE";
  phone?: string;
  upiId?: string;
  accountHolderName?: string;
  bankName?: string;
  accountNumberMasked?: string;
  ifscCode?: string;
  paymentNote?: string;
  verificationStatus?: "pending" | "approved" | "rejected" | "none";
  rejectionReason?: string;
}

interface PayoutSeller {
  id: string;
  name: string;
  email: string;
  phone: string;
  farmName: string;
  isApproved: boolean;
  onboardingStatus: string;
  razorpayAccountId: string | null;
  paymentDetails?: SellerPaymentDetails;
}

interface PayoutItem {
  id: string;
  orderId: string;
  goatName: string;
  goatBreed: string;
  customerName: string;
  seller: PayoutSeller;
  sellerBasePrice: number;
  deliveryCharge?: number;
  sellerGoatNet?: number;
  sellerDeliveryAmount?: number;
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
    isManual?: boolean;
    payoutMethod?: string | null;
    referenceId?: string | null;
    utrNumber?: string | null;
    paidAt?: string | null;
    paidByName?: string | null;
    adminNote?: string | null;
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
  const [activeSubTab, setActiveSubTab] = useState<"queue" | "sellers">("queue");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<PayoutItem[]>([]);
  const [summary, setSummary] = useState<PayoutSummary | null>(null);

  // Sellers list for payment details verification
  const [allSellers, setAllSellers] = useState<any[]>([]);
  const [loadingSellers, setLoadingSellers] = useState(false);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State for Manual Payout
  const [confirmModalOrder, setConfirmModalOrder] = useState<PayoutItem | null>(null);
  const [payoutMethod, setPayoutMethod] = useState<"UPI" | "BANK">("UPI");
  const [utrNumber, setUtrNumber] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [adminNote, setAdminNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Modal State for Rejecting Seller Payment Details
  const [rejectingSeller, setRejectingSeller] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);

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

  const fetchSellers = async () => {
    setLoadingSellers(true);
    try {
      const res = await axios.get("/api/sellers");
      if (res.data.success) {
        setAllSellers(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch sellers:", err);
    } finally {
      setLoadingSellers(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
    fetchSellers();
  }, []);

  const openManualPayoutModal = (item: PayoutItem) => {
    setConfirmModalOrder(item);
    const prefMethod = item.seller.paymentDetails?.paymentMethod === "BANK" ? "BANK" : "UPI";
    setPayoutMethod(prefMethod);
    setUtrNumber("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setAdminNote("");
  };

  const handleRecordManualPayout = async () => {
    if (!confirmModalOrder) return;

    if (!utrNumber.trim()) {
      toast.error("Transaction Reference / UTR ID is required for manual payout verification.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await axios.post("/api/admin/payouts", {
        orderId: confirmModalOrder.id,
        amount: confirmModalOrder.sellerNetPayable,
        payoutMethod,
        referenceId: utrNumber.trim(),
        utrNumber: utrNumber.trim(),
        paymentDate,
        note: adminNote.trim() || undefined,
        isManual: true,
      });

      if (res.data.success) {
        toast.success(
          `Manual payout of ${formatCurrencyINR(confirmModalOrder.sellerNetPayable)} successfully recorded!`
        );
        setConfirmModalOrder(null);
        await fetchPayouts();
      } else {
        toast.error(res.data.error || "Manual payout recording failed");
      }
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Failed to record manual payout";
      toast.error(errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprovePaymentDetails = async (sellerId: string) => {
    try {
      const res = await axios.post(`/api/admin/sellers/${sellerId}/payment-details`, {
        action: "approve",
      });
      if (res.data.success) {
        toast.success("Seller payment details verified & approved!");
        await fetchSellers();
        await fetchPayouts();
      } else {
        toast.error(res.data.error || "Approval failed");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to approve payment details");
    }
  };

  const handleRejectPaymentDetails = async () => {
    if (!rejectingSeller) return;
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setRejectLoading(true);
    try {
      const res = await axios.post(`/api/admin/sellers/${rejectingSeller._id || rejectingSeller.id}/payment-details`, {
        action: "reject",
        reason: rejectReason.trim(),
      });
      if (res.data.success) {
        toast.success("Seller payment details rejected with note.");
        setRejectingSeller(null);
        setRejectReason("");
        await fetchSellers();
        await fetchPayouts();
      } else {
        toast.error(res.data.error || "Rejection failed");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to reject payment details");
    } finally {
      setRejectLoading(false);
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
      } else if (statusFilter === "paid_manual") {
        if (item.payout.status !== "paid" || !item.payout.isManual) {
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
        const matchSeller =
          item.seller.name.toLowerCase().includes(q) ||
          item.seller.farmName.toLowerCase().includes(q) ||
          item.seller.phone.toLowerCase().includes(q);
        const matchGoat = item.goatName.toLowerCase().includes(q);
        const matchUtr =
          item.payout.utrNumber?.toLowerCase().includes(q) ||
          item.payout.referenceId?.toLowerCase().includes(q);
        if (!matchOrder && !matchSeller && !matchGoat && !matchUtr) {
          return false;
        }
      }

      return true;
    });
  }, [queue, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header & Subtabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#252525]">
        <div>
          <h2 className="text-xl font-bold text-white font-serif flex items-center gap-2">
            <span>💸</span> Seller Payout & Bank Details Management
          </h2>
          <p className="text-xs text-gray-400 font-sans mt-1">
            Review delivery status, verify seller UPI/Bank details, and record manual external transfers.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Subtab Toggle Buttons */}
          <div className="flex items-center bg-[#1a1a1a] rounded-xl p-1 border border-[#333]">
            <button
              onClick={() => setActiveSubTab("queue")}
              className={`px-3 py-1.5 rounded-lg text-xs font-sans font-bold transition-all ${
                activeSubTab === "queue"
                  ? "bg-[#c8a96e] text-zinc-950 shadow-xs"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Payout Orders Queue ({queue.length})
            </button>
            <button
              onClick={() => setActiveSubTab("sellers")}
              className={`px-3 py-1.5 rounded-lg text-xs font-sans font-bold transition-all ${
                activeSubTab === "sellers"
                  ? "bg-[#c8a96e] text-zinc-950 shadow-xs"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Seller Payment Verification ({allSellers.length})
            </button>
          </div>

          <button
            onClick={() => {
              fetchPayouts();
              fetchSellers();
            }}
            disabled={loading || loadingSellers}
            className="px-3 py-1.5 rounded-xl border border-[#333] hover:border-[#c8a96e] text-xs font-sans text-gray-300 hover:text-white transition-colors bg-[#1a1a1a] flex items-center gap-1.5"
            title="Refresh Queue"
          >
            <span className={loading || loadingSellers ? "animate-spin" : ""}>🔄</span>
          </button>
        </div>
      </div>

      {/* ================= SUBTAB 1: PAYOUT ORDERS QUEUE ================= */}
      {activeSubTab === "queue" && (
        <div className="space-y-6">
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
                Pending amount: {formatCurrencyINR(summary?.totalPendingAmount ?? 0)}
              </div>
            </div>

            <div className="rounded-2xl border border-[#252525] bg-[#1a1a1a] p-4 relative overflow-hidden">
              <div className="text-xs text-[#c8a96e] font-sans uppercase tracking-wider font-semibold mb-1">
                Total Paid Manually
              </div>
              <div className="text-2xl font-bold text-white">
                {formatCurrencyINR(summary?.totalPaidAmount ?? 0)}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                Completed: {summary?.totalPaid ?? 0} orders
              </div>
            </div>

            <div className="rounded-2xl border border-[#252525] bg-[#1a1a1a] p-4 relative overflow-hidden">
              <div className="text-xs text-amber-400 font-sans uppercase tracking-wider font-semibold mb-1">
                Unpaid Candidates
              </div>
              <div className="text-2xl font-bold text-white">
                {summary?.totalUnpaid ?? 0}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                Awaiting delivery confirmation
              </div>
            </div>

            <div className="rounded-2xl border border-[#252525] bg-[#1a1a1a] p-4 relative overflow-hidden">
              <div className="text-xs text-sky-400 font-sans uppercase tracking-wider font-semibold mb-1">
                Total Orders in Queue
              </div>
              <div className="text-2xl font-bold text-white">
                {summary?.totalCandidateOrders ?? queue.length}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                Paid customer orders
              </div>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="rounded-2xl border border-[#252525] bg-[#1a1a1a] p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 md:pb-0">
              {[
                { id: "all", label: "All Orders" },
                { id: "eligible", label: `Eligible (${summary?.totalEligible ?? 0})` },
                { id: "paid_manual", label: `Paid Manually (${summary?.totalPaid ?? 0})` },
                { id: "unpaid", label: "Unpaid" },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setStatusFilter(pill.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-sans whitespace-nowrap transition-colors ${
                    statusFilter === pill.id
                      ? "bg-[#c8a96e] text-zinc-950 font-bold shadow-xs"
                      : "bg-[#252525] text-gray-300 hover:text-white hover:bg-[#333]"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            <div className="w-full md:w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search order ID, seller, phone, UTR..."
                className="w-full px-3.5 py-2 rounded-xl bg-[#111] border border-[#333] text-gray-200 text-xs font-sans placeholder-gray-500 focus:outline-none focus:border-[#c8a96e]"
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-2xl border border-[#252525] bg-[#1a1a1a] overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-400 font-sans text-xs">
                <span className="animate-spin text-lg inline-block mr-2">⏳</span> Loading payout queue records...
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-400 font-sans text-xs">
                ⚠️ {error}
              </div>
            ) : filteredQueue.length === 0 ? (
              <div className="p-12 text-center text-gray-500 font-sans text-xs">
                No payout candidate orders match the selected criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead>
                    <tr className="border-b border-[#252525] bg-[#141414] text-gray-400 uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Order / Goat</th>
                      <th className="py-3 px-4">Seller & Phone</th>
                      <th className="py-3 px-4">Payment Method & Details</th>
                      <th className="py-3 px-4">Authoritative Payout</th>
                      <th className="py-3 px-4">Payout Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#252525]">
                    {filteredQueue.map((item) => {
                      const isPaid = item.payout.status === "paid";
                      const isManual = item.payout.isManual ?? false;
                      const payDetails = item.seller.paymentDetails;
                      const hasPaymentDetails = payDetails && payDetails.paymentMethod && payDetails.paymentMethod !== "NONE";

                      return (
                        <tr key={item.id} className="hover:bg-[#202020]/50 transition-colors">
                          {/* Order / Goat */}
                          <td className="py-3.5 px-4 align-top">
                            <div className="font-mono font-bold text-[#c8a96e]">
                              {item.orderId}
                            </div>
                            <div className="font-serif font-bold text-white text-sm mt-0.5">
                              {item.goatName}
                            </div>
                            <div className="text-gray-400 text-[11px]">
                              {item.goatBreed}
                            </div>
                            <div className="text-[10px] text-gray-500 mt-1">
                              Status: <span className="text-gray-300 font-medium">{item.orderStatus}</span>
                            </div>
                          </td>

                          {/* Seller & Phone */}
                          <td className="py-3.5 px-4 align-top">
                            <div className="font-bold text-white">
                              {item.seller.name}
                            </div>
                            <div className="text-gray-400 text-[11px]">
                              {item.seller.farmName}
                            </div>
                            <div className="mt-1">
                              {item.seller.phone ? (
                                <a
                                  href={`tel:${item.seller.phone}`}
                                  className="text-emerald-400 hover:text-emerald-300 font-mono text-[11px] flex items-center gap-1 font-semibold hover:underline"
                                  title="Call Seller Directly"
                                >
                                  <span>📞</span> {item.seller.phone}
                                </a>
                              ) : (
                                <span className="text-gray-500 text-[10px]">No phone</span>
                              )}
                            </div>
                          </td>

                          {/* Payment Method & Details */}
                          <td className="py-3.5 px-4 align-top">
                            {hasPaymentDetails ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      payDetails.paymentMethod === "UPI"
                                        ? "bg-purple-950/60 text-purple-300 border border-purple-800/40"
                                        : "bg-blue-950/60 text-blue-300 border border-blue-800/40"
                                    }`}
                                  >
                                    {payDetails.paymentMethod}
                                  </span>

                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                                      payDetails.verificationStatus === "approved"
                                        ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
                                        : payDetails.verificationStatus === "pending"
                                        ? "bg-amber-950/60 text-amber-400 border border-amber-800/40"
                                        : "bg-red-950/60 text-red-400 border border-red-800/40"
                                    }`}
                                  >
                                    {payDetails.verificationStatus === "approved"
                                      ? "✓ Verified"
                                      : payDetails.verificationStatus === "pending"
                                      ? "⏳ Pending"
                                      : "⚠️ Rejected"}
                                  </span>
                                </div>

                                {payDetails.paymentMethod === "UPI" ? (
                                  <div className="font-mono text-gray-200 text-[11px]">
                                    {payDetails.upiId || "—"}
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-gray-300 space-y-0.5">
                                    <div>{payDetails.bankName || "Bank"}</div>
                                    <div className="font-mono text-gray-200">{payDetails.accountNumberMasked || "—"}</div>
                                    <div className="text-[10px] text-gray-400 font-mono">IFSC: {payDetails.ifscCode}</div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-amber-400/90 flex items-center gap-1">
                                <span>⚠️</span> Details Not Saved
                              </span>
                            )}
                          </td>

                          {/* Authoritative Payout */}
                          <td className="py-3.5 px-4 align-top">
                            <div className="text-sm font-bold text-[#c8a96e] font-mono">
                              {formatCurrencyINR(item.sellerNetPayable)}
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              Goat: {formatCurrencyINR(item.sellerGoatNet ?? (item.sellerBasePrice - item.commissionAmount))}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              Delivery: +{formatCurrencyINR(item.sellerDeliveryAmount ?? item.deliveryCharge ?? 0)}
                            </div>
                          </td>

                          {/* Payout Status */}
                          <td className="py-3.5 px-4 align-top">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isPaid
                                  ? isManual
                                    ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
                                    : "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
                                  : item.eligibility.eligible
                                  ? "bg-amber-950/60 text-amber-400 border border-amber-800/40"
                                  : "bg-gray-800 text-gray-400 border border-gray-700"
                              }`}
                            >
                              {isPaid ? (isManual ? "Paid Manually" : "Paid") : item.eligibility.eligible ? "Eligible" : "Pending"}
                            </span>

                            {isPaid && (item.payout.utrNumber || item.payout.referenceId) && (
                              <div className="text-[10px] font-mono text-gray-300 mt-1 truncate max-w-[140px]" title={item.payout.utrNumber || item.payout.referenceId || ""}>
                                UTR: {item.payout.utrNumber || item.payout.referenceId}
                              </div>
                            )}

                            {isPaid && item.payout.paidAt && (
                              <div className="text-[9px] text-gray-500 mt-0.5">
                                {new Date(item.payout.paidAt).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
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
                                  ✓ Completed
                                </span>
                                <a
                                  href={`/api/documents/payout-receipt/${item.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] font-sans text-gray-300 hover:text-[#c8a96e] border border-[#333] hover:border-[#c8a96e] px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                                  title="View Official Payout Receipt"
                                >
                                  <span>📄</span> Receipt
                                </a>
                              </div>
                            ) : (
                              <button
                                onClick={() => openManualPayoutModal(item)}
                                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#c8a96e] to-[#b38f53] hover:brightness-110 text-zinc-950 font-bold text-xs font-sans transition-all shadow-xs"
                              >
                                Mark Payout as Paid
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
        </div>
      )}

      {/* ================= SUBTAB 2: SELLER PAYMENT VERIFICATION ================= */}
      {activeSubTab === "sellers" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#252525] bg-[#1a1a1a] p-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white font-serif">
                Seller Payment & Bank Details Verification
              </h3>
              <p className="text-xs text-gray-400 font-sans mt-0.5">
                Review and approve seller-submitted UPI IDs and Bank Account details for manual payouts.
              </p>
            </div>
            <span className="text-xs font-sans text-gray-400 px-3 py-1 rounded-full bg-[#111] border border-[#333]">
              {allSellers.length} Registered Sellers
            </span>
          </div>

          <div className="rounded-2xl border border-[#252525] bg-[#1a1a1a] overflow-hidden">
            {loadingSellers ? (
              <div className="p-10 text-center text-gray-400 font-sans text-xs">
                <span className="animate-spin inline-block mr-2">⏳</span> Loading seller payment details...
              </div>
            ) : allSellers.length === 0 ? (
              <div className="p-10 text-center text-gray-500 font-sans text-xs">
                No registered sellers found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead>
                    <tr className="border-b border-[#252525] bg-[#141414] text-gray-400 uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Seller & Farm</th>
                      <th className="py-3 px-4">Phone (Direct)</th>
                      <th className="py-3 px-4">Payment Method</th>
                      <th className="py-3 px-4">Masked Destination Details</th>
                      <th className="py-3 px-4">Verification Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#252525]">
                    {allSellers.map((seller: any) => {
                      const sId = seller._id || seller.id;
                      const pd = seller.sellerProfile?.paymentDetails;
                      const phone = seller.phone || pd?.phone || "";
                      const status = pd?.verificationStatus || "none";

                      return (
                        <tr key={sId} className="hover:bg-[#202020]/50 transition-colors">
                          <td className="py-3.5 px-4 align-top">
                            <div className="font-bold text-white text-sm">
                              {seller.name}
                            </div>
                            <div className="text-gray-400 text-[11px]">
                              {seller.sellerProfile?.farmName || "N/A"}
                            </div>
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              {seller.email}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 align-top">
                            {phone ? (
                              <a
                                href={`tel:${phone}`}
                                className="text-emerald-400 hover:text-emerald-300 font-mono text-xs flex items-center gap-1 font-semibold hover:underline"
                                title="Click to call seller"
                              >
                                <span>📞</span> {phone}
                              </a>
                            ) : (
                              <span className="text-gray-500 text-[11px]">No phone</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 align-top">
                            {pd?.paymentMethod ? (
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  pd.paymentMethod === "UPI"
                                    ? "bg-purple-950/60 text-purple-300 border border-purple-800/40"
                                    : "bg-blue-950/60 text-blue-300 border border-blue-800/40"
                                }`}
                              >
                                {pd.paymentMethod}
                              </span>
                            ) : (
                              <span className="text-gray-500 text-[11px]">—</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 align-top">
                            {pd?.paymentMethod === "UPI" ? (
                              <div>
                                <div className="font-mono text-gray-200 text-xs font-semibold">
                                  {pd.upiId || "—"}
                                </div>
                                {pd.paymentNote && (
                                  <div className="text-[10px] text-gray-500 mt-0.5 italic">
                                    Note: {pd.paymentNote}
                                  </div>
                                )}
                              </div>
                            ) : pd?.paymentMethod === "BANK" ? (
                              <div className="space-y-0.5 text-[11px]">
                                <div className="text-white font-medium">{pd.bankName || "Bank"}</div>
                                <div className="font-mono text-[#c8a96e]">
                                  {pd.accountNumberMasked || (pd.accountNumber ? `••••${pd.accountNumber.slice(-4)}` : "—")}
                                </div>
                                <div className="text-gray-400 font-mono text-[10px]">
                                  IFSC: {pd.ifscCode} • Holder: {pd.accountHolderName}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-500 text-[11px]">Not submitted yet</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 align-top">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                status === "approved"
                                  ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
                                  : status === "pending"
                                  ? "bg-amber-950/60 text-amber-400 border border-amber-800/40"
                                  : status === "rejected"
                                  ? "bg-red-950/60 text-red-400 border border-red-800/40"
                                  : "bg-gray-800 text-gray-400 border border-gray-700"
                              }`}
                            >
                              {status === "approved"
                                ? "Approved"
                                : status === "pending"
                                ? "Pending"
                                : status === "rejected"
                                ? "Rejected"
                                : "None"}
                            </span>

                            {status === "rejected" && pd?.rejectionReason && (
                              <div className="text-[10px] text-red-400 mt-1 max-w-[150px] truncate" title={pd.rejectionReason}>
                                Reason: {pd.rejectionReason}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 align-top text-right">
                            {pd?.paymentMethod ? (
                              <div className="flex items-center justify-end gap-1.5">
                                {status !== "approved" && (
                                  <button
                                    onClick={() => handleApprovePaymentDetails(sId)}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] font-sans transition-colors"
                                  >
                                    Approve
                                  </button>
                                )}
                                {status !== "rejected" && (
                                  <button
                                    onClick={() => {
                                      setRejectingSeller(seller);
                                      setRejectReason("");
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-red-900/60 hover:bg-red-800 text-red-300 font-bold text-[11px] font-sans transition-colors border border-red-800/50"
                                  >
                                    Reject
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-500 font-sans">No action</span>
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
        </div>
      )}

      {/* ================= MODAL: MARK PAYOUT AS PAID ================= */}
      {confirmModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#141414] border border-[#2d2d2d] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#252525] pb-3">
              <h3 className="text-base font-bold text-white font-serif flex items-center gap-2">
                <span>💸</span> Mark Payout as Paid (Manual Transfer)
              </h3>
              <button
                onClick={() => !actionLoading && setConfirmModalOrder(null)}
                disabled={actionLoading}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* Seller & Destination Info Card */}
            <div className="rounded-xl bg-[#1c1c1c] border border-[#282828] p-4 space-y-2 text-xs font-sans">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Order ID:</span>
                <span className="text-[#c8a96e] font-mono font-bold">{confirmModalOrder.orderId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Seller:</span>
                <span className="text-white font-medium">
                  {confirmModalOrder.seller.name} ({confirmModalOrder.seller.farmName})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Seller Phone:</span>
                {confirmModalOrder.seller.phone ? (
                  <a
                    href={`tel:${confirmModalOrder.seller.phone}`}
                    className="text-emerald-400 hover:underline font-mono font-bold flex items-center gap-1"
                  >
                    <span>📞</span> {confirmModalOrder.seller.phone}
                  </a>
                ) : (
                  <span className="text-gray-500">Not provided</span>
                )}
              </div>

              {/* Destination Details */}
              <div className="border-t border-[#282828] pt-2 mt-2">
                <span className="text-gray-400 font-semibold block mb-1">Configured Payment Details:</span>
                {confirmModalOrder.seller.paymentDetails?.paymentMethod === "UPI" ? (
                  <div className="text-gray-200 font-mono">
                    UPI ID: <span className="text-purple-300 font-bold">{confirmModalOrder.seller.paymentDetails.upiId}</span>
                  </div>
                ) : confirmModalOrder.seller.paymentDetails?.paymentMethod === "BANK" ? (
                  <div className="text-gray-200 space-y-0.5">
                    <div>Bank: {confirmModalOrder.seller.paymentDetails.bankName}</div>
                    <div className="font-mono">
                      Account: {confirmModalOrder.seller.paymentDetails.accountNumberMasked}
                    </div>
                    <div className="font-mono text-gray-400">
                      IFSC: {confirmModalOrder.seller.paymentDetails.ifscCode} • Holder: {confirmModalOrder.seller.paymentDetails.accountHolderName}
                    </div>
                  </div>
                ) : (
                  <div className="text-amber-400 text-[11px]">
                    ⚠️ Seller has not configured payment details yet.
                  </div>
                )}
              </div>

              {/* Authoritative Net Payable */}
              <div className="border-t border-[#282828] pt-2 flex justify-between items-center">
                <span className="text-sm font-bold text-white">Authoritative Payout Amount:</span>
                <span className="text-base font-bold text-[#c8a96e] font-mono">
                  {formatCurrencyINR(confirmModalOrder.sellerNetPayable)}
                </span>
              </div>
            </div>

            {/* Form Inputs */}
            <div className="space-y-3 font-sans text-xs">
              <div>
                <label className="text-gray-300 font-bold block mb-1">
                  Payment Method *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayoutMethod("UPI")}
                    className={`py-2 px-3 rounded-xl border text-center font-bold transition-all ${
                      payoutMethod === "UPI"
                        ? "border-purple-500 bg-purple-950/40 text-purple-300"
                        : "border-[#333] bg-[#111] text-gray-400 hover:text-white"
                    }`}
                  >
                    UPI Transfer
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayoutMethod("BANK")}
                    className={`py-2 px-3 rounded-xl border text-center font-bold transition-all ${
                      payoutMethod === "BANK"
                        ? "border-blue-500 bg-blue-950/40 text-blue-300"
                        : "border-[#333] bg-[#111] text-gray-400 hover:text-white"
                    }`}
                  >
                    Bank / NEFT / IMPS
                  </button>
                </div>
              </div>

              <div>
                <label className="text-gray-300 font-bold block mb-1">
                  Transaction Reference / UTR ID *
                </label>
                <input
                  type="text"
                  required
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  placeholder="e.g. 408291049281 or UPI Ref ID"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#111] border border-[#333] text-gray-200 text-xs font-mono placeholder-gray-500 focus:outline-none focus:border-[#c8a96e]"
                />
                <span className="text-[10px] text-gray-500 mt-1 block">
                  Enter the unique reference generated by your bank / UPI application.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 font-bold block mb-1">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#111] border border-[#333] text-gray-200 text-xs font-sans focus:outline-none focus:border-[#c8a96e]"
                  />
                </div>

                <div>
                  <label className="text-gray-300 font-bold block mb-1">
                    Optional Admin Note
                  </label>
                  <input
                    type="text"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="e.g. Sent via ICICI Corporate"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#111] border border-[#333] text-gray-200 text-xs font-sans focus:outline-none focus:border-[#c8a96e]"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#252525]">
              <button
                type="button"
                onClick={() => setConfirmModalOrder(null)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl border border-[#333] text-gray-300 hover:text-white hover:bg-[#222] text-xs font-sans transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleRecordManualPayout}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:brightness-110 text-white font-bold text-xs font-sans transition-all flex items-center gap-2 shadow-md"
              >
                {actionLoading && <span className="animate-spin">⏳</span>}
                {actionLoading ? "Recording Payout..." : "Confirm & Record Payout"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: REJECT SELLER PAYMENT DETAILS ================= */}
      {rejectingSeller && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#141414] border border-[#2d2d2d] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#252525] pb-3">
              <h3 className="text-base font-bold text-white font-serif flex items-center gap-2">
                <span>⚠️</span> Reject Seller Payment Details
              </h3>
              <button
                onClick={() => !rejectLoading && setRejectingSeller(null)}
                disabled={rejectLoading}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-gray-300 font-sans">
              Rejecting payment details for{" "}
              <strong className="text-white">{rejectingSeller.name}</strong> ({rejectingSeller.sellerProfile?.farmName || "Farm"}).
              Please enter the reason so the seller can rectify their details.
            </div>

            <div>
              <label className="text-xs font-bold text-gray-300 font-sans block mb-1">
                Rejection Reason *
              </label>
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Invalid IFSC code, or Account holder name does not match farm registration."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111] border border-[#333] text-gray-200 text-xs font-sans focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectingSeller(null)}
                disabled={rejectLoading}
                className="px-4 py-2 rounded-xl border border-[#333] text-gray-300 hover:text-white hover:bg-[#222] text-xs font-sans transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectPaymentDetails}
                disabled={rejectLoading}
                className="px-4 py-2 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs font-sans transition-all flex items-center gap-2"
              >
                {rejectLoading && <span className="animate-spin">⏳</span>}
                {rejectLoading ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
