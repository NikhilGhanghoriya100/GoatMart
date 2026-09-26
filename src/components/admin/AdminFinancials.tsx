"use client";

import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { formatCurrencyINR } from "@/lib/commission";

interface FinancialSummary {
  totalGMV: number;
  totalCommission: number;
  totalSellerNet: number;
  paidOrdersCount: number;
  currency: string;
  conservationVerified: boolean;
}

interface SellerFinancialRecord {
  sellerId: string;
  sellerName: string;
  farmName: string;
  email?: string;
  paidSalesCount: number;
  totalGrossSales: number;
  totalCommission: number;
  totalSellerNet: number;
}

interface FinancialOrder {
  orderId: string;
  goatId: string;
  goatName: string;
  goatBreed: string;
  goatImage: string;
  sellerId: string;
  sellerName: string;
  farmName: string;
  customerName: string;
  saleDate: string;
  sellerBasePrice: number;
  commissionRate: number;
  commissionAmount: number;
  sellerNetPayable: number;
  currency: string;
  paymentId: string;
  paymentStatus: string;
  orderStatus: string;
  financialCalculationVersion: string;
  financialCalculatedAt: string;
  isLegacy: boolean;
}

interface FinancialApiResponse {
  success: boolean;
  data: {
    summary: FinancialSummary;
    sellerBreakdown: SellerFinancialRecord[];
    orders: FinancialOrder[];
  };
}

export default function AdminFinancials() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [sellerBreakdown, setSellerBreakdown] = useState<SellerFinancialRecord[]>([]);
  const [orders, setOrders] = useState<FinancialOrder[]>([]);

  // Search filters
  const [sellerQuery, setSellerQuery] = useState("");
  const [orderQuery, setOrderQuery] = useState("");

  const fetchFinancials = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get<FinancialApiResponse>("/api/admin/financials");
      if (res.data.success && res.data.data) {
        setSummary(res.data.data.summary);
        setSellerBreakdown(res.data.data.sellerBreakdown || []);
        setOrders(res.data.data.orders || []);
      } else {
        setError("Failed to load financial records");
      }
    } catch (err: any) {
      console.error("Admin financials load error:", err);
      setError(
        err?.response?.data?.error ||
          "Unable to load financial data. Please check your admin privileges."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancials();
  }, []);

  // Filtered sellers
  const filteredSellers = useMemo(() => {
    if (!sellerQuery.trim()) return sellerBreakdown;
    const q = sellerQuery.toLowerCase();
    return sellerBreakdown.filter(
      (s) =>
        s.sellerName.toLowerCase().includes(q) ||
        s.farmName.toLowerCase().includes(q) ||
        (s.email && s.email.toLowerCase().includes(q))
    );
  }, [sellerBreakdown, sellerQuery]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    if (!orderQuery.trim()) return orders;
    const q = orderQuery.toLowerCase();
    return orders.filter(
      (o) =>
        o.orderId.toLowerCase().includes(q) ||
        o.goatName.toLowerCase().includes(q) ||
        o.goatBreed.toLowerCase().includes(q) ||
        o.sellerName.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        (o.paymentId && o.paymentId.toLowerCase().includes(q))
    );
  }, [orders, orderQuery]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#252525] bg-[#1a1a1a] p-8 text-center">
        <div className="inline-block w-8 h-8 border-4 border-[#c8a96e] border-t-transparent rounded-full animate-spin mb-4" />
        <h3 className="text-white font-semibold text-lg font-serif">
          Loading Financial Dashboard
        </h3>
        <p className="text-gray-400 text-xs mt-1">
          Aggregating platform commission snapshots and verified sales...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-6 text-center">
        <div className="text-3xl mb-2">⚠️</div>
        <h3 className="text-red-400 font-semibold text-base font-serif mb-1">
          Financial Data Error
        </h3>
        <p className="text-gray-400 text-xs mb-4 max-w-md mx-auto">{error}</p>
        <button
          onClick={fetchFinancials}
          className="px-4 py-2 bg-[#c8a96e] text-black font-semibold text-xs rounded-xl hover:bg-[#d8b97e] transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Refresh Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1a1a1a] border border-[#252525] p-5 rounded-2xl">
        <div>
          <h2 className="text-lg font-bold text-white font-serif flex items-center gap-2">
            <span>💰</span> Platform Financial Dashboard
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Deterministic platform commission engine • Immutable historical snapshots • Integer paise reconciliation
          </p>
        </div>
        <div className="flex items-center gap-3">
          {summary?.conservationVerified && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-xs rounded-full font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Reconciled: GMV = Commission + Seller Net
            </span>
          )}
          <button
            onClick={fetchFinancials}
            className="px-3.5 py-1.5 bg-[#252525] text-gray-300 hover:text-white hover:bg-[#303030] text-xs font-medium rounded-xl border border-[#333] transition-colors flex items-center gap-1.5"
            title="Refresh Financial Data"
          >
            <span>🔄</span> Refresh
          </button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total GMV / Gross Sales */}
        <div className="rounded-2xl p-4 border border-[#252525] bg-[#1a1a1a] relative overflow-hidden">
          <div className="text-2xl mb-1">📈</div>
          <div className="text-2xl font-bold text-white mb-0.5 font-mono">
            {formatCurrencyINR(summary?.totalGMV || 0)}
          </div>
          <div className="text-xs text-gray-400 uppercase tracking-wider font-sans font-medium">
            Total Gross Sales (GMV)
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            Total value of all paid goat transactions
          </div>
        </div>

        {/* GoatMart Commission */}
        <div className="rounded-2xl p-4 border border-[#c8a96e]/30 bg-[#1a1a1a] relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(circle at 85% 15%, rgba(200, 169, 110, 0.15), transparent 70%)",
            }}
          />
          <div className="text-2xl mb-1">💰</div>
          <div className="text-2xl font-bold text-[#c8a96e] mb-0.5 font-mono">
            {formatCurrencyINR(summary?.totalCommission || 0)}
          </div>
          <div className="text-xs text-[#c8a96e]/80 uppercase tracking-wider font-sans font-medium">
            GoatMart Platform Commission
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            Authoritative platform commission revenue
          </div>
        </div>

        {/* Seller Net Earnings */}
        <div className="rounded-2xl p-4 border border-[#252525] bg-[#1a1a1a] relative overflow-hidden">
          <div className="text-2xl mb-1">🏪</div>
          <div className="text-2xl font-bold text-emerald-400 mb-0.5 font-mono">
            {formatCurrencyINR(summary?.totalSellerNet || 0)}
          </div>
          <div className="text-xs text-gray-400 uppercase tracking-wider font-sans font-medium">
            Total Seller Net Payable
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            Net aggregate earnings payable to all sellers
          </div>
        </div>

        {/* Paid Orders Count */}
        <div className="rounded-2xl p-4 border border-[#252525] bg-[#1a1a1a] relative overflow-hidden">
          <div className="text-2xl mb-1">📦</div>
          <div className="text-2xl font-bold text-white mb-0.5 font-mono">
            {summary?.paidOrdersCount || 0}
          </div>
          <div className="text-xs text-gray-400 uppercase tracking-wider font-sans font-medium">
            Paid & Completed Sales
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            Verified orders with confirmed payment
          </div>
        </div>
      </div>

      {/* Seller-Wise Financial Breakdown */}
      <div className="rounded-2xl border border-[#252525] bg-[#1a1a1a] overflow-hidden">
        <div className="p-4 sm:px-6 border-b border-[#252525] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-white font-serif flex items-center gap-2">
              <span>🏪</span> Seller-Wise Financial Breakdown
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Aggregated sales volume, platform commission, and net earnings per seller
            </p>
          </div>
          <div className="relative">
            <input
              type="text"
              value={sellerQuery}
              onChange={(e) => setSellerQuery(e.target.value)}
              placeholder="Search seller or farm..."
              className="bg-[#111] border border-[#333] rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#c8a96e] w-full sm:w-56"
            />
            {sellerQuery && (
              <button
                onClick={() => setSellerQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {filteredSellers.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-xs">
            {sellerBreakdown.length === 0
              ? "No seller sales recorded yet."
              : "No sellers match the search query."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#141414] text-gray-400 border-b border-[#252525] uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 sm:px-6">Seller / Farm</th>
                  <th className="py-3 px-4 text-center">Paid Sales</th>
                  <th className="py-3 px-4 text-right">Gross Sales (GMV)</th>
                  <th className="py-3 px-4 text-right text-[#c8a96e]">GoatMart Commission</th>
                  <th className="py-3 px-4 sm:px-6 text-right text-emerald-400">Seller Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {filteredSellers.map((seller) => (
                  <tr key={seller.sellerId} className="hover:bg-[#202020]/50 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="font-semibold text-white">{seller.sellerName}</div>
                      {seller.farmName && (
                        <div className="text-[11px] text-gray-400 font-sans">{seller.farmName}</div>
                      )}
                      {seller.email && (
                        <div className="text-[10px] text-gray-600 font-mono">{seller.email}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-gray-200">
                      <span className="inline-block px-2.5 py-0.5 bg-[#252525] rounded-full text-xs font-semibold">
                        {seller.paidSalesCount}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-medium text-gray-200">
                      {formatCurrencyINR(seller.totalGrossSales)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-medium text-[#c8a96e]">
                      {formatCurrencyINR(seller.totalCommission)}
                    </td>
                    <td className="py-3.5 px-4 sm:px-6 text-right font-mono font-semibold text-emerald-400">
                      {formatCurrencyINR(seller.totalSellerNet)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Financial Order Table */}
      <div className="rounded-2xl border border-[#252525] bg-[#1a1a1a] overflow-hidden">
        <div className="p-4 sm:px-6 border-b border-[#252525] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-white font-serif flex items-center gap-2">
              <span>📋</span> Qualifying Financial Orders ({filteredOrders.length})
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Authoritative transaction records with permanent snapshot rates
            </p>
          </div>
          <div className="relative">
            <input
              type="text"
              value={orderQuery}
              onChange={(e) => setOrderQuery(e.target.value)}
              placeholder="Search Order ID, Goat, Seller..."
              className="bg-[#111] border border-[#333] rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#c8a96e] w-full sm:w-64"
            />
            {orderQuery && (
              <button
                onClick={() => setOrderQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-xs">
            {orders.length === 0
              ? "No qualifying paid orders found yet."
              : "No orders match the search query."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#141414] text-gray-400 border-b border-[#252525] uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 sm:px-6">Order</th>
                  <th className="py-3 px-4">Goat</th>
                  <th className="py-3 px-4">Seller</th>
                  <th className="py-3 px-4 text-right">Base Price</th>
                  <th className="py-3 px-4 text-right text-[#c8a96e]">Commission</th>
                  <th className="py-3 px-4 text-right text-emerald-400">Seller Net</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {filteredOrders.map((o) => (
                  <tr key={o.orderId} className="hover:bg-[#202020]/50 transition-colors">
                    <td className="py-3 px-4 sm:px-6">
                      <div className="font-bold text-[#c8a96e] font-mono">{o.orderId}</div>
                      {o.paymentId && (
                        <div className="text-[10px] text-gray-500 font-mono truncate max-w-[120px]">
                          {o.paymentId}
                        </div>
                      )}
                      <div className="mt-0.5">
                        <span className="inline-block text-[9px] uppercase px-1.5 py-0.2 rounded bg-[#252525] text-gray-400 font-mono">
                          v{o.financialCalculationVersion}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-200">{o.goatName}</div>
                      <div className="text-[11px] text-gray-500">{o.goatBreed}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-gray-200">{o.sellerName}</div>
                      {o.farmName && (
                        <div className="text-[10px] text-gray-500">{o.farmName}</div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-medium text-gray-200">
                      {formatCurrencyINR(o.sellerBasePrice)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-medium text-[#c8a96e]">
                      <div>{formatCurrencyINR(o.commissionAmount)}</div>
                      <div className="text-[10px] text-gray-500">
                        ({o.commissionRate}%)
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-400">
                      {formatCurrencyINR(o.sellerNetPayable)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 text-[10px] rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 uppercase font-bold">
                        {o.paymentStatus}
                      </span>
                    </td>

                    <td className="py-3 px-4 sm:px-6 text-right text-gray-400 font-mono text-[11px] whitespace-nowrap">
                      {o.saleDate ? new Date(o.saleDate).toLocaleDateString("en-IN") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
