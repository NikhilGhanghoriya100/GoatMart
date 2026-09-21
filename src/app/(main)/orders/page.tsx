"use client";
import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, MessageSquare, Star, XCircle, AlertTriangle } from "lucide-react";
import { useOrders } from "@/hooks/useOrders";
import { useTranslation } from "@/hooks/useTranslation";
import { fmt } from "@/lib/utils";
import StatusBadge from "@/components/ui/StatusBadge";
import { GoatCardSkeleton } from "@/components/ui/Skeleton";
import Modal from "@/components/ui/Modal";
import axios from "axios";
import toast from "react-hot-toast";
import type { Order } from "@/types";

function translateStep(s: string, isHindi: boolean, t: any) {
  if (!s) return s;
  if (isHindi) {
    if (/placed/i.test(s)) return t.stepPlaced;
    if (/confirm/i.test(s)) return t.stepConfirmed;
    if (/dispatch/i.test(s)) return t.stepDispatched;
    if (/transit/i.test(s)) return t.stepInTransit;
    if (/deliver/i.test(s)) return t.stepDelivered;
  }
  return s;
}

function Timeline({ timeline, isHindi, t }: { timeline: any[]; isHindi: boolean; t: any }) {
  return (
    <div className="flex overflow-x-auto py-2 gap-0">
      {timeline.map((item, i) => (
        <div key={item.s} className="flex-1 flex flex-col items-center relative min-w-[56px]">
          {i < timeline.length - 1 && (
            <div
              className={`absolute top-[9px] left-1/2 right-[-50%] h-0.5 ${
                timeline[i + 1]?.done ? "bg-green-500" : "bg-gray-200 dark:bg-zinc-700"
              }`}
            />
          )}
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold z-10 transition-colors font-sans ${
              item.done
                ? "bg-green-500 text-white"
                : "bg-gray-100 text-gray-400 dark:bg-zinc-800 dark:text-zinc-500"
            }`}
          >
            {item.done ? "✓" : ""}
          </div>
          <div
            className={`text-[9px] text-center mt-1.5 leading-tight font-sans max-w-[52px] ${
              item.done ? "text-green-600 font-semibold" : "text-gray-400 dark:text-zinc-500"
            }`}
          >
            {translateStep(item.s, isHindi, t)}
          </div>
          {item.d && <div className="text-[9px] text-gray-400 dark:text-zinc-500 font-sans mt-0.5">{item.d}</div>}
        </div>
      ))}
    </div>
  );
}

export default function OrdersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { orders, loading, setOrders, refetch } = useOrders();
  const { t, isHindi } = useTranslation();
  const [trackId, setTrackId] = useState<string | null>(null);

  // Cancellation State
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState("mistake");
  const [cancelling, setCancelling] = useState(false);

  if (!session) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">📦</div>
        <h2 className="text-xl font-bold font-serif mb-2">{t.loginToViewOrders}</h2>
        <p className="text-sm text-gray-400 font-sans mb-6">{t.loginToViewOrdersSub}</p>
        <Link
          href="/login"
          className="inline-block px-6 py-3 rounded-full bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] text-white font-bold font-sans text-sm hover:opacity-90 transition-opacity"
        >
          {t.login} →
        </Link>
      </div>
    );
  }

  const isEligibleForCancel = (status: string) => {
    return status === "pending" || status === "payment_confirmed" || status === "processing";
  };

  const handleCancelOrder = async () => {
    if (!cancelModalOrder) return;
    setCancelling(true);
    try {
      const { data } = await axios.patch(`/api/orders/${cancelModalOrder._id}`, {
        status: "cancelled",
      });

      if (data.success) {
        toast.success(t.orderCancelledToast || (isHindi ? "ऑर्डर सफलतापूर्वक रद्द कर दिया गया।" : "Order cancelled successfully."));
        // Update state locally
        setOrders((prev) =>
          prev.map((o) => (o._id === cancelModalOrder._id ? { ...o, status: "cancelled" } : o))
        );
        setCancelModalOrder(null);
      } else {
        toast.error(data.error || (isHindi ? "ऑर्डर रद्द करने में विफल" : "Failed to cancel order"));
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
          (isHindi ? "ऑर्डर रद्द करते समय त्रुटि हुई" : "Error while cancelling order")
      );
    } finally {
      setCancelling(false);
    }
  };

  const trackedOrder = orders.find((o) => o._id === trackId);

  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-7 overflow-x-hidden">
      {/* Cancellation Confirmation Modal */}
      <Modal
        open={Boolean(cancelModalOrder)}
        onClose={() => !cancelling && setCancelModalOrder(null)}
        title={t.cancelOrderPrompt || (isHindi ? "क्या आप यह ऑर्डर रद्द करना चाहते हैं?" : "Cancel this Order?")}
        size="sm"
      >
        {cancelModalOrder && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
              <div className="text-xs font-sans text-red-800 dark:text-red-300 leading-relaxed">
                {t.cancelOrderSub ||
                  (isHindi
                    ? "रद्द करने के बाद यह बकरी अन्य खरीदारों के लिए फिर से उपलब्ध हो जाएगी।"
                    : "Are you sure you want to cancel this order? The goat listing will become available again for other buyers.")}
              </div>
            </div>

            {/* Order Mini Info */}
            <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700">
              {cancelModalOrder.goatImage && (
                <img
                  src={cancelModalOrder.goatImage}
                  alt=""
                  className="w-12 h-12 rounded-xl object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate font-serif">{cancelModalOrder.goatName}</div>
                <div className="text-xs text-zinc-500 font-sans">{cancelModalOrder.orderId}</div>
              </div>
              <div className="text-right font-bold text-sm font-serif text-[#8b5e2a] dark:text-[#c8a96e]">
                {fmt(cancelModalOrder.amount)}
              </div>
            </div>

            {/* Reason selector */}
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5 font-sans">
                {t.cancelReason || (isHindi ? "रद्द करने का कारण" : "Reason for cancellation")}
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs font-sans text-zinc-900 dark:text-zinc-100 outline-none focus:border-[#8b5e2a]"
              >
                <option value="mistake">
                  {t.reasonMistake || (isHindi ? "गलती से ऑर्डर हो गया" : "Ordered by mistake")}
                </option>
                <option value="found_other">
                  {t.reasonFoundOther || (isHindi ? "अन्य बकरी पसंद आ गई" : "Found another goat")}
                </option>
                <option value="delivery_time">
                  {t.reasonDeliveryTime || (isHindi ? "डिलीवरी समय समस्या" : "Delivery timeline issue")}
                </option>
                <option value="other">
                  {t.reasonOther || (isHindi ? "अन्य कारण" : "Other reason")}
                </option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={cancelling}
                onClick={() => setCancelModalOrder(null)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold font-sans text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                {t.keepOrder || (isHindi ? "नहीं, ऑर्डर रखें" : "No, Keep Order")}
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleCancelOrder}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold font-sans flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                {cancelling ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{isHindi ? "रद्द हो रहा है..." : "Cancelling..."}</span>
                  </>
                ) : (
                  <>
                    <XCircle size={14} />
                    <span>{t.confirmCancel || (isHindi ? "हाँ, ऑर्डर रद्द करें" : "Yes, Cancel Order")}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Track Order View */}
      {trackId && trackedOrder ? (
        <div className="max-w-lg mx-auto px-4 py-2">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setTrackId(null)}
              className="w-9 h-9 rounded-full border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-center hover:border-[#c8a96e] transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            <h1 className="flex-1 text-center text-xl font-bold font-serif">{t.trackOrder}</h1>
            <div className="w-9" />
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-5 shadow-sm">
            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-100 dark:border-zinc-800">
              {trackedOrder.goatImage && (
                <img
                  src={trackedOrder.goatImage}
                  alt=""
                  className="w-12 h-12 rounded-xl object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
              <div className="flex-1">
                <div className="font-bold text-base">{trackedOrder.goatName}</div>
                <div className="text-xs text-gray-400 dark:text-zinc-500 font-sans">
                  {trackedOrder.orderId} • {trackedOrder.sellerName}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-[#c8a96e]">{fmt(trackedOrder.amount)}</div>
                <StatusBadge status={trackedOrder.status} />
              </div>
            </div>

            {/* Cancelled Alert Banner */}
            {trackedOrder.status === "cancelled" ? (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-xs text-red-700 dark:text-red-300 font-sans flex items-center gap-2.5">
                <XCircle size={16} className="text-red-600 shrink-0" />
                <div>
                  <span className="font-bold block">
                    {isHindi ? "यह ऑर्डर रद्द कर दिया गया है" : "This order has been cancelled"}
                  </span>
                  <span className="text-[11px] text-red-600 dark:text-red-400">
                    {isHindi
                      ? "बकरी लिस्टिंग अन्य खरीदारों के लिए दोबारा उपलब्ध करा दी गई है।"
                      : "The livestock listing has been restored to the marketplace."}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {trackedOrder.timeline.map((item: any, i: number) => (
                  <div key={item.s} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          item.done ? "bg-green-500 text-white" : "bg-gray-100 text-gray-300 dark:bg-zinc-800 dark:text-zinc-600"
                        }`}
                      >
                        {item.done ? "✓" : i + 1}
                      </div>
                      {i < trackedOrder.timeline.length - 1 && (
                        <div
                          className={`w-0.5 flex-1 mt-1 min-h-[16px] ${
                            trackedOrder.timeline[i + 1]?.done ? "bg-green-500" : "bg-gray-100 dark:bg-zinc-800"
                          }`}
                        />
                      )}
                    </div>
                    <div className="flex-1 pb-3">
                      <div className={`text-sm font-sans font-semibold ${item.done ? "text-gray-800 dark:text-zinc-100" : "text-gray-300 dark:text-zinc-600"}`}>
                        {translateStep(item.s, isHindi, t)}
                      </div>
                      {item.d && <div className="text-xs text-gray-400 dark:text-zinc-500 font-sans mt-0.5">{item.d}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 p-3 bg-[#faf6ee] dark:bg-zinc-800/60 rounded-xl text-xs font-sans text-gray-600 dark:text-zinc-300 leading-relaxed border border-[#ebdcb8] dark:border-zinc-700">
              <div>
                📍 {t.deliveryAddress}: {trackedOrder.delivery?.address}, {trackedOrder.delivery?.city},{" "}
                {trackedOrder.delivery?.state} - {trackedOrder.delivery?.pin}
              </div>
              <div className="mt-1">
                📞 {t.phone}: {trackedOrder.delivery?.phone}
              </div>
            </div>

            {/* Tracking View Actions (Cancel & Chat) */}
            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-zinc-800 flex gap-2">
              <button
                onClick={() => router.push(`/chat?goat=${trackedOrder.goat}`)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-200 text-xs font-bold font-sans flex items-center justify-center gap-1.5 hover:border-[#c8a96e] transition-colors"
              >
                <MessageSquare size={14} />
                <span>{t.contactSeller}</span>
              </button>
              {isEligibleForCancel(trackedOrder.status) && (
                <button
                  onClick={() => setCancelModalOrder(trackedOrder)}
                  className="flex-1 py-2.5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs font-bold font-sans flex items-center justify-center gap-1.5 hover:bg-red-100/60 dark:hover:bg-red-900/40 transition-colors"
                >
                  <XCircle size={14} />
                  <span>{t.cancelOrder || (isHindi ? "ऑर्डर रद्द करें" : "Cancel Order")}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Orders List View */
        <>
          <div className="flex items-center gap-3 mb-6">
            <Link
              href="/"
              className="w-9 h-9 rounded-full border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-center hover:border-[#c8a96e] transition-colors"
            >
              <ArrowLeft size={16} />
            </Link>
            <h1 className="flex-1 text-center text-xl font-bold font-serif">{t.myOrdersTitle}</h1>
            <div className="w-9" />
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <GoatCardSkeleton key={i} />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">📦</div>
              <h2 className="text-xl font-bold font-serif mb-2">{t.noOrdersYet}</h2>
              <p className="text-sm text-gray-400 font-sans mb-6">{t.noOrdersSub}</p>
              <Link
                href="/shop"
                className="inline-block px-6 py-3 rounded-full bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] text-white font-bold font-sans text-sm hover:opacity-90"
              >
                {t.browseGoats}
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order._id}
                  className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Order header */}
                  <div className="p-4 flex items-center gap-3 flex-wrap">
                    {order.goatImage && (
                      <img
                        src={order.goatImage}
                        alt=""
                        className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )}
                    <div className="flex-1 min-w-[120px]">
                      <div className="font-bold text-base leading-tight">{order.goatName}</div>
                      <div className="text-xs text-gray-400 dark:text-zinc-500 font-sans">
                        {order.orderId} •{" "}
                        {new Date(order.createdAt).toLocaleDateString(isHindi ? "hi-IN" : "en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        • {order.sellerName}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-bold text-[#c8a96e]">{fmt(order.amount)}</div>
                      <StatusBadge status={order.status} />
                    </div>
                  </div>

                  {/* Timeline strip */}
                  {order.status !== "cancelled" && (
                    <div className="px-4 pb-2 border-t border-gray-50 dark:border-zinc-800/50">
                      <Timeline timeline={order.timeline || []} isHindi={isHindi} t={t} />
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="px-4 pb-4 flex gap-2 flex-wrap">
                    <button
                      onClick={() => setTrackId(order._id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 border-[#c8a96e] text-[#c8a96e] text-xs font-bold font-sans hover:bg-[#c8a96e10] transition-colors min-w-[80px]"
                    >
                      <MapPin size={12} /> {t.trackOrder}
                    </button>
                    <button
                      onClick={() => router.push(`/chat?goat=${order.goat}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 text-xs font-sans hover:border-[#c8a96e] transition-colors min-w-[80px]"
                    >
                      <MessageSquare size={12} /> {t.contactSeller}
                    </button>
                    {isEligibleForCancel(order.status) && (
                      <button
                        onClick={() => setCancelModalOrder(order)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 text-xs font-bold font-sans hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors min-w-[80px]"
                      >
                        <XCircle size={12} /> {t.cancelOrder || (isHindi ? "रद्द करें" : "Cancel")}
                      </button>
                    )}
                    {order.status === "delivered" && !order.reviewed && (
                      <button
                        onClick={() => router.push(`/goat/${order.goat}`)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#c8a96e22] text-[#8b5e2a] dark:text-[#c8a96e] text-xs font-bold font-sans hover:bg-[#c8a96e33] transition-colors min-w-[80px]"
                      >
                        <Star size={12} /> {t.writeReview}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
