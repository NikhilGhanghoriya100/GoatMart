"use client";
import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, MessageSquare, Star } from "lucide-react";
import { useOrders } from "@/hooks/useOrders";
import { fmt } from "@/lib/utils";
import StatusBadge from "@/components/ui/StatusBadge";
import { GoatCardSkeleton } from "@/components/ui/Skeleton";

function Timeline({ timeline }: { timeline: any[] }) {
  return (
    <div className="flex overflow-x-auto py-2 gap-0">
      {timeline.map((t, i) => (
        <div key={t.s} className="flex-1 flex flex-col items-center relative min-w-[56px]">
          {i < timeline.length - 1 && (
            <div className={`absolute top-[9px] left-1/2 right-[-50%] h-0.5 ${timeline[i+1]?.done ? "bg-green-500" : "bg-gray-200"}`} />
          )}
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold z-10 transition-colors font-sans ${t.done ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400"}`}>
            {t.done ? "✓" : ""}
          </div>
          <div className={`text-[9px] text-center mt-1.5 leading-tight font-sans max-w-[52px] ${t.done ? "text-green-600 font-semibold" : "text-gray-400"}`}>
            {t.s}
          </div>
          {t.d && <div className="text-[9px] text-gray-400 font-sans mt-0.5">{t.d}</div>}
        </div>
      ))}
    </div>
  );
}

export default function OrdersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { orders, loading } = useOrders();
  const [trackId, setTrackId] = useState<string | null>(null);

  if (!session) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">📦</div>
        <h2 className="text-xl font-bold font-serif mb-2">Login to view orders</h2>
        <p className="text-sm text-gray-400 font-sans mb-6">Please login to see your order history.</p>
        <Link href="/login" className="inline-block px-6 py-3 rounded-full bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] text-white font-bold font-sans text-sm hover:opacity-90 transition-opacity">
          Login →
        </Link>
      </div>
    );
  }

  const trackedOrder = orders.find(o => o._id === trackId);

  if (trackId && trackedOrder) {
    return (
      <div className="max-w-lg mx-auto px-4 py-7">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setTrackId(null)} className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:border-[#c8a96e] transition-colors">
            <ArrowLeft size={16} />
          </button>
          <h1 className="flex-1 text-center text-xl font-bold font-serif">Track Order</h1>
          <div className="w-9" />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-100">
            {trackedOrder.goatImage && (
              <img src={trackedOrder.goatImage} alt="" className="w-12 h-12 rounded-xl object-cover" onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
            )}
            <div className="flex-1">
              <div className="font-bold text-base">{trackedOrder.goatName}</div>
              <div className="text-xs text-gray-400 font-sans">{trackedOrder.orderId} • {trackedOrder.sellerName}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-[#c8a96e]">{fmt(trackedOrder.amount)}</div>
              <StatusBadge status={trackedOrder.status} />
            </div>
          </div>
          <div className="space-y-4">
            {trackedOrder.timeline.map((t: any, i: number) => (
              <div key={t.s} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${t.done ? "bg-green-500 text-white" : "bg-gray-100 text-gray-300"}`}>
                    {t.done ? "✓" : i + 1}
                  </div>
                  {i < trackedOrder.timeline.length - 1 && <div className={`w-0.5 flex-1 mt-1 min-h-[16px] ${trackedOrder.timeline[i+1]?.done ? "bg-green-500" : "bg-gray-100"}`} />}
                </div>
                <div className="flex-1 pb-3">
                  <div className={`text-sm font-sans font-semibold ${t.done ? "text-gray-800" : "text-gray-300"}`}>{t.s}</div>
                  {t.d && <div className="text-xs text-gray-400 font-sans mt-0.5">{t.d}</div>}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-[#faf6ee] rounded-xl text-xs font-sans text-gray-600 leading-relaxed">
            <div>📍 {trackedOrder.delivery?.address}, {trackedOrder.delivery?.city}, {trackedOrder.delivery?.state} - {trackedOrder.delivery?.pin}</div>
            <div className="mt-1">📞 {trackedOrder.delivery?.phone}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-7">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:border-[#c8a96e] transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <h1 className="flex-1 text-center text-xl font-bold font-serif">My Orders</h1>
        <div className="w-9" />
      </div>

      {loading ? (
        <div className="space-y-4">{[1,2,3].map(i => <GoatCardSkeleton key={i} />)}</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">📦</div>
          <h2 className="text-xl font-bold font-serif mb-2">No orders yet</h2>
          <p className="text-sm text-gray-400 font-sans mb-6">Start browsing and place your first order!</p>
          <Link href="/shop" className="inline-block px-6 py-3 rounded-full bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] text-white font-bold font-sans text-sm hover:opacity-90">
            Browse Goats →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order._id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              {/* Order header */}
              <div className="p-4 flex items-center gap-3 flex-wrap">
                {order.goatImage && (
                  <img src={order.goatImage} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
                )}
                <div className="flex-1 min-w-[120px]">
                  <div className="font-bold text-base leading-tight">{order.goatName}</div>
                  <div className="text-xs text-gray-400 font-sans">{order.orderId} • {order.date || new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} • {order.sellerName}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-lg font-bold text-[#c8a96e]">{fmt(order.amount)}</div>
                  <StatusBadge status={order.status} />
                </div>
              </div>

              {/* Timeline strip */}
              <div className="px-4 pb-2 border-t border-gray-50">
                <Timeline timeline={order.timeline || []} />
              </div>

              {/* Action buttons */}
              <div className="px-4 pb-4 flex gap-2 flex-wrap">
                <button onClick={() => setTrackId(order._id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 border-[#c8a96e] text-[#c8a96e] text-xs font-bold font-sans hover:bg-[#c8a96e10] transition-colors min-w-[80px]">
                  <MapPin size={12} /> Track
                </button>
                <button onClick={() => router.push(`/chat?goat=${order.goat}`)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 text-gray-500 text-xs font-sans hover:border-[#c8a96e] transition-colors min-w-[80px]">
                  <MessageSquare size={12} /> Contact
                </button>
                {order.status === "delivered" && !order.reviewed && (
                  <button onClick={() => router.push(`/goat/${order.goat}`)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#c8a96e22] text-[#8b5e2a] text-xs font-bold font-sans hover:bg-[#c8a96e33] transition-colors min-w-[80px]">
                    <Star size={12} /> Review
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
