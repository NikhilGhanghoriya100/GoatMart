"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import axios from "axios";
import Modal from "@/components/ui/Modal";
import { fmt } from "@/lib/utils";
import type { Goat } from "@/types";
import {
  Lock,
  ShieldCheck,
  Edit3,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface DeliveryForm {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pin: string;
  note: string;
}

const EMPTY: DeliveryForm = {
  name: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  pin: "",
  note: "",
};

// Validates whether customer delivery details are complete & usable for Express Checkout
const isUsableSavedDelivery = (f: DeliveryForm): boolean => {
  return Boolean(
    f.name &&
      f.name.trim().length >= 2 &&
      f.phone &&
      /^\d{10}$/.test(f.phone.trim()) &&
      f.address &&
      f.address.trim().length >= 5 &&
      f.city &&
      f.city.trim().length >= 2 &&
      f.state &&
      f.state.trim().length >= 2 &&
      f.pin &&
      /^\d{6}$/.test(f.pin.trim())
  );
};

export default function CheckoutModal({ goat, onClose }: { goat: Goat; onClose: () => void }) {
  const { data: session } = useSession();
  const router = useRouter();
  const { t, translateBreed, isHindi } = useTranslation();
  const [step, setStep] = useState<1 | 3>(1);
  const [form, setForm] = useState<DeliveryForm>(EMPTY);
  const [savedProfile, setSavedProfile] = useState<DeliveryForm>(EMPTY);
  const [hasSavedDetails, setHasSavedDetails] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profileLoading, setProfileLoading] = useState(Boolean(session?.user));
  const [errors, setErrors] = useState<Partial<DeliveryForm>>({});
  const [loading, setLoading] = useState(false);

  const deliveryCharge =
    typeof (goat as any).deliveryCharge === "number" && (goat as any).deliveryCharge >= 0
      ? (goat as any).deliveryCharge
      : 0;
  const buyerPlatformFee = Math.round((goat.price || 0) * 0.02);
  const totalAmount = (goat.price || 0) + deliveryCharge + buyerPlatformFee;

  // Preload customer address if available
  useEffect(() => {
    if (session?.user) {
      setProfileLoading(true);
      axios
        .get("/api/user/profile")
        .then(({ data }) => {
          if (data.success && data.data) {
            const u = data.data;
            const loaded: DeliveryForm = {
              name: u.name || session.user.name || "",
              phone: u.phone || "",
              email: u.email || session.user.email || "",
              address: u.address?.street || "",
              city: u.address?.city || "",
              state: u.address?.state || "",
              pin: u.address?.pin || "",
              note: "",
            };
            setForm(loaded);
            if (isUsableSavedDelivery(loaded)) {
              setHasSavedDetails(true);
              setSavedProfile(loaded);
              setIsEditing(false);
            } else {
              setHasSavedDetails(false);
              setIsEditing(true);
            }
          } else {
            setHasSavedDetails(false);
            setIsEditing(true);
          }
        })
        .catch(() => {
          // Fail gracefully: do not break checkout
          if (session.user) {
            setForm((p) => ({
              ...p,
              name: session.user.name || p.name,
              email: session.user.email || p.email,
            }));
          }
          setHasSavedDetails(false);
          setIsEditing(true);
        })
        .finally(() => {
          setProfileLoading(false);
        });
    } else {
      setProfileLoading(false);
      setIsEditing(true);
    }
  }, [session]);

  const fv = (k: keyof DeliveryForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const validate = () => {
    const e: Partial<DeliveryForm> = {};
    if (!form.name.trim() || form.name.trim().length < 2)
      e.name = isHindi ? "कम से कम 2 अक्षरों का नाम दर्ज करें" : "Name must be at least 2 characters";
    if (!/^\d{10}$/.test(form.phone.trim()))
      e.phone = isHindi ? "मान्य 10-अंकीय मोबाइल नंबर दर्ज करें" : "Enter valid 10-digit mobile number";
    if (!form.address.trim() || form.address.trim().length < 5)
      e.address = isHindi ? "डिलीवरी के लिए पूरा पता दर्ज करें (कम से कम 5 अक्षर)" : "Street address is required (min 5 characters)";
    if (!form.city.trim() || form.city.trim().length < 2)
      e.city = isHindi ? "शहर आवश्यक है" : "City is required";
    if (!form.state.trim() || form.state.trim().length < 2)
      e.state = isHindi ? "राज्य आवश्यक है" : "State is required";
    if (!/^\d{6}$/.test(form.pin.trim()))
      e.pin = isHindi ? "मान्य 6-अंकीय पिन कोड दर्ज करें" : "Enter valid 6-digit PIN code";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleStartEdit = () => {
    setErrors({});
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    // Discard unsaved edits and restore original saved profile values
    setForm({ ...savedProfile, note: form.note });
    setErrors({});
    setIsEditing(false);
  };

  const loadRazorpay = () =>
    new Promise<boolean>((res) => {
      if (window.Razorpay) {
        res(true);
        return;
      }
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => res(true);
      s.onerror = () => res(false);
      document.body.appendChild(s);
    });

  const handlePay = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post("/api/orders", {
        goatId: goat._id,
        delivery: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          pin: form.pin.trim(),
          note: form.note.trim(),
        },
      });

      if (!data.success) {
        toast.error(data.error || (isHindi ? "ऑर्डर नहीं बनाया जा सका" : "Could not create order"));
        setLoading(false);
        return;
      }

      const { orderId, razorpayOrderId, amount, keyId } = data.data;

      const completeVerification = async (paymentId: string, rzpOrderId: string, signature: string) => {
        try {
          const verify = await axios.post("/api/payment/verify", {
            orderId,
            razorpayOrderId: rzpOrderId,
            razorpayPaymentId: paymentId,
            razorpaySignature: signature,
          });

          if (verify.data.success) {
            setStep(3);
            toast.success(
              isHindi
                ? "भुगतान सत्यापित! ऑर्डर सफलतापूर्वक दर्ज किया गया।"
                : "Payment verified! Order placed successfully."
            );
            setTimeout(() => {
              onClose();
              router.push("/orders");
            }, 2000);
          } else {
            toast.error(verify.data.error || (isHindi ? "सत्यापन विफल रहा" : "Verification failed"));
          }
        } catch (verErr: any) {
          toast.error(
            verErr?.response?.data?.error ||
              (isHindi
                ? "भुगतान सत्यापन विफल रहा। कृपया सहायता टीम से संपर्क करें।"
                : "Payment verification failed. Please reach out to support.")
          );
        } finally {
          setLoading(false);
        }
      };

      const loaded = await loadRazorpay();
      if (!loaded || !window.Razorpay) {
        toast.error(
          isHindi
            ? "Razorpay गेटवे लोड नहीं हो सका। कृपया अपना इंटरनेट कनेक्शन जांचें।"
            : "Could not load Razorpay SDK. Please check your internet connection."
        );
        setLoading(false);
        return;
      }

      const rzpOptions = {
        key: keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: amount * 100,
        currency: "INR",
        name: "GoatMart",
        description: `Purchasing: ${goat.name} (${goat.breed})`,
        order_id: razorpayOrderId,
        prefill: {
          name: form.name,
          contact: form.phone,
          email: form.email || session?.user?.email,
        },
        notes: {
          goatId: goat._id,
          goatName: goat.name,
        },
        theme: {
          color: "#8b5e2a",
        },
        handler: async (response: any) => {
          await completeVerification(
            response.razorpay_payment_id,
            response.razorpay_order_id,
            response.razorpay_signature
          );
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            toast(isHindi ? "भुगतान रद्द किया गया" : "Payment window closed", { icon: "ℹ️" });
          },
        },
      };

      const rzp = new window.Razorpay(rzpOptions);
      rzp.on("payment.failed", (resp: any) => {
        toast.error(
          isHindi
            ? `भुगतान विफल: ${resp?.error?.description || "त्रुटि"}`
            : `Payment failed: ${resp?.error?.description || "Transaction failed"}`
        );
        setLoading(false);
      });
      rzp.open();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
          err?.message ||
          (isHindi ? "चेकआउट के दौरान त्रुटि हुई" : "An error occurred during checkout")
      );
      setLoading(false);
    }
  };

  const handleProceed = async () => {
    if (!validate()) return;
    await handlePay();
  };

  const inp =
    "w-full px-3.5 py-2.5 sm:px-4 sm:py-3 border rounded-xl text-xs sm:text-sm font-sans outline-none transition-colors focus:border-[#8b5e2a] bg-[#faf8f4] dark:bg-zinc-800 dark:border-zinc-700 dark:text-white dark:placeholder-zinc-500";
  const err = (k: keyof DeliveryForm) =>
    errors[k] ? <p className="text-red-500 text-xs font-sans mt-1">{errors[k]}</p> : null;

  return (
    <Modal
      open
      title={
        step === 3
          ? isHindi
            ? "🎉 ऑर्डर पुष्ट हुआ!"
            : "🎉 Order Confirmed!"
          : hasSavedDetails && !isEditing
          ? isHindi
            ? "⚡ एक्सप्रेस चेकआउट"
            : "⚡ Express Checkout"
          : hasSavedDetails && isEditing
          ? isHindi
            ? "✏️ डिलीवरी विवरण बदलें"
            : "✏️ Edit Delivery Details"
          : isHindi
          ? "📦 डिलीवरी और परिवहन विवरण"
          : "📦 Delivery & Transport Details"
      }
      onClose={onClose}
      size="md"
    >
      {/* Goat Item Summary Card */}
      <div className="flex items-center gap-3.5 bg-[#faf6ee] dark:bg-zinc-900/80 rounded-2xl p-3 sm:p-3.5 mb-4 border border-[#ebdcb8] dark:border-zinc-800">
        {goat.images?.[0] ? (
          <img
            src={goat.images[0]}
            alt={goat.name}
            className="w-13 h-13 sm:w-14 sm:h-14 rounded-xl object-cover flex-shrink-0 shadow-2xs"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-2xl">🐐</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-gray-900 dark:text-white truncate font-serif">{goat.name}</div>
          <div className="text-xs text-gray-500 dark:text-zinc-400 font-sans truncate">
            {isHindi ? "विक्रेता" : "Seller"}: {goat.sellerName} • {translateBreed(goat.breed)} • {goat.weight}
            {t.kg}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-base sm:text-lg font-bold font-serif text-[#1c1917] dark:text-white">{fmt(goat.price)}</div>
          <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold font-sans">
            {isHindi ? "✓ सुरक्षित" : "✓ Protected"}
          </div>
        </div>
      </div>

      {step === 1 && (
        <>
          {profileLoading ? (
            /* Skeleton Loading State while profile request is in-flight */
            <div className="space-y-4 py-2 animate-pulse">
              <div className="bg-[#fbf8f2] dark:bg-zinc-900/60 rounded-2xl p-4 border border-[#ebdcb8]/60 dark:border-zinc-800 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-[#ebdcb8] dark:bg-zinc-700 rounded-md w-1/3" />
                  <div className="h-4 bg-[#ebdcb8] dark:bg-zinc-700 rounded-md w-16" />
                </div>
                <div className="h-3.5 bg-gray-200 dark:bg-zinc-800 rounded-md w-1/2" />
                <div className="h-3.5 bg-gray-200 dark:bg-zinc-800 rounded-md w-3/4" />
              </div>
              <div className="h-24 bg-gray-100 dark:bg-zinc-900/40 rounded-2xl border border-gray-100 dark:border-zinc-800" />
              <div className="h-12 bg-gray-200 dark:bg-zinc-700 rounded-full w-full" />
              <p className="text-center text-xs text-gray-400 dark:text-zinc-500 font-sans">
                {t.loadingProfile}
              </p>
            </div>
          ) : hasSavedDetails && !isEditing ? (
            /* RETURNING CUSTOMER: Saved Delivery Details Card */
            <div>
              <div className="bg-gradient-to-br from-[#fdfbf7] to-[#f7f2e7] dark:from-zinc-900 dark:to-zinc-950 rounded-2xl p-4 border border-[#ebdcb8] dark:border-zinc-800 shadow-2xs mb-4">
                {/* Card Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#ebdcb8]/50 dark:border-zinc-800">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <ShieldCheck size={14} />
                    </div>
                    <span className="text-xs font-bold font-sans uppercase tracking-wider text-gray-900 dark:text-white">
                      {t.savedDeliveryDetails}
                    </span>
                    <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold font-sans bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      {isHindi ? "सत्यापित" : "Verified"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleStartEdit}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold font-sans text-[#8b5e2a] dark:text-amber-400 bg-white dark:bg-zinc-800 border border-[#8b5e2a40] dark:border-amber-400/30 hover:border-[#8b5e2a] hover:bg-[#8b5e2a10] transition-all shadow-2xs active:scale-95"
                  >
                    <Edit3 size={12} />
                    <span>{t.editDetails}</span>
                  </button>
                </div>

                {/* Card Details */}
                <div className="pt-3 space-y-1.5 text-xs font-sans">
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                    <span>👤 {form.name}</span>
                    <span className="text-gray-300 dark:text-zinc-600">•</span>
                    <span className="text-gray-700 dark:text-zinc-300">📞 {form.phone}</span>
                  </div>

                  <div className="text-gray-600 dark:text-zinc-400 leading-relaxed pt-0.5">
                    <span className="font-semibold text-gray-800 dark:text-zinc-200">
                      📍 {t.deliveringTo}:
                    </span>{" "}
                    {form.address}, {form.city}, {form.state} -{" "}
                    <span className="font-bold text-gray-900 dark:text-white">{form.pin}</span>
                  </div>

                  {form.email && (
                    <div className="text-[11px] text-gray-400 dark:text-zinc-500 pt-0.5">
                      ✉️ {form.email}
                    </div>
                  )}
                </div>

                {/* Optional Note in Saved View */}
                <div className="mt-3 pt-3 border-t border-[#ebdcb8]/40 dark:border-zinc-800">
                  <input
                    type="text"
                    placeholder={
                      isHindi
                        ? "डिलीवरी निर्देश (वैकल्पिक, उदा. कॉल करें, लैंडमार्क)"
                        : "Delivery instructions (optional, e.g. Call before arrival)"
                    }
                    value={form.note}
                    onChange={fv("note")}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 outline-none focus:border-[#8b5e2a] placeholder-gray-400 dark:placeholder-zinc-500 font-sans"
                  />
                </div>
              </div>

              {/* Amount Box */}
              <div className="py-3 border-t border-gray-100 dark:border-zinc-800 mb-4 space-y-2">
                <div className="flex justify-between text-xs text-gray-500 dark:text-zinc-400 font-sans">
                  <span>{isHindi ? "बकरे की कीमत" : "Goat Price"}:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{fmt(goat.price)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-zinc-400 font-sans">
                  <span>{isHindi ? "डिलीवरी शुल्क" : "Delivery Fee"}:</span>
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">
                    {deliveryCharge > 0 ? fmt(deliveryCharge) : isHindi ? "मुफ़्त डिलीवरी" : "Free Delivery"}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-zinc-400 font-sans">
                  <span>{isHindi ? "प्लेटफ़ॉर्म शुल्क (2%)" : "Buyer Platform Fee (2%)"}:</span>
                  <span className="font-medium text-amber-800 dark:text-amber-400">{fmt(buyerPlatformFee)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-dashed border-gray-200 dark:border-zinc-800">
                  <div>
                    <span className="text-xs text-gray-900 dark:text-white font-sans font-bold block">
                      {t.totalAmount}
                    </span>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-sans font-bold">
                      {isHindi ? "100% सुरक्षित भुगतान" : "100% Buyer Protected"}
                    </span>
                  </div>
                  <span className="text-xl sm:text-2xl font-bold font-serif text-[#1c1917] dark:text-white">
                    {fmt(totalAmount)}
                  </span>
                </div>
              </div>

              {/* Primary CTA for Saved Mode */}
              <button
                type="button"
                disabled={loading}
                onClick={handleProceed}
                className="w-full py-3.5 rounded-full gold-gradient-btn text-xs sm:text-sm font-bold font-sans flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{isHindi ? "गेटवे से जुड़ रहे हैं..." : "Connecting Gateway..."}</span>
                  </>
                ) : (
                  <>
                    <span>⚡ {t.useSavedDetails} • {fmt(totalAmount)} 🔒</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400 dark:text-zinc-500 font-sans mt-3">
                <Lock size={12} className="text-emerald-600 dark:text-emerald-400" />
                <span>{isHindi ? "256-बिट सुरक्षित भुगतान • सीधे फार्म से सुरक्षित परिवहन" : "256-bit Encrypted • Direct Farm Safe Transport"}</span>
              </div>
            </div>
          ) : (
            /* EDITABLE DELIVERY FORM (First-time or Editing) */
            <div className="space-y-3 sm:space-y-3.5">
              {/* Context Banner */}
              {hasSavedDetails && isEditing ? (
                <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 rounded-xl px-3 py-2 text-xs font-sans text-amber-800 dark:text-amber-300">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Edit3 size={14} className="text-amber-600 dark:text-amber-400" />
                    <span>{t.editingDeliveryDetails}</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-[11px] underline font-bold hover:text-amber-900 dark:hover:text-white"
                  >
                    {t.keepSaved}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/30 rounded-xl p-2.5 text-xs font-sans text-amber-900 dark:text-amber-300 leading-snug">
                  <Sparkles size={15} className="text-amber-600 shrink-0" />
                  <span>{t.savingInfoBadge}</span>
                </div>
              )}

              {/* Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-zinc-400 font-sans mb-1 block">{t.fullName} *</label>
                  <input
                    placeholder={isHindi ? "प्राप्तकर्ता का नाम" : "Recipient name"}
                    value={form.name}
                    onChange={fv("name")}
                    className={`${inp} ${errors.name ? "border-red-400" : "border-gray-200"}`}
                  />
                  {err("name")}
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-zinc-400 font-sans mb-1 block">{t.phone} *</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder={isHindi ? "10-अंकीय मोबाइल" : "10-digit mobile"}
                    value={form.phone}
                    onChange={fv("phone")}
                    className={`${inp} ${errors.phone ? "border-red-400" : "border-gray-200"}`}
                  />
                  {err("phone")}
                </div>
              </div>

              {/* Street Address */}
              <div>
                <label className="text-xs text-gray-500 dark:text-zinc-400 font-sans mb-1 block">{t.streetAddress} *</label>
                <input
                  placeholder={isHindi ? "मकान नं, गली, लैंडमार्क (कम से कम 5 अक्षर)" : "House/Plot number, Street, Landmark"}
                  value={form.address}
                  onChange={fv("address")}
                  className={`${inp} ${errors.address ? "border-red-400" : "border-gray-200"}`}
                />
                {err("address")}
              </div>

              {/* City, State, PIN */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-zinc-400 font-sans mb-1 block">{t.city} *</label>
                  <input
                    placeholder={t.city}
                    value={form.city}
                    onChange={fv("city")}
                    className={`${inp} ${errors.city ? "border-red-400" : "border-gray-200"}`}
                  />
                  {err("city")}
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-zinc-400 font-sans mb-1 block">{t.state} *</label>
                  <input
                    placeholder={t.state}
                    value={form.state}
                    onChange={fv("state")}
                    className={`${inp} ${errors.state ? "border-red-400" : "border-gray-200"}`}
                  />
                  {err("state")}
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-zinc-400 font-sans mb-1 block">{t.pincode} *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder={t.pincode}
                    value={form.pin}
                    onChange={fv("pin")}
                    className={`${inp} ${errors.pin ? "border-red-400" : "border-gray-200"}`}
                  />
                  {err("pin")}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs text-gray-500 dark:text-zinc-400 font-sans mb-1 block">{t.deliveryNotes}</label>
                <textarea
                  placeholder={
                    isHindi
                      ? "उदा. आने से पहले कॉल करें, पसंदीदा समय..."
                      : "e.g. Call before arrival, preferred delivery time..."
                  }
                  value={form.note}
                  onChange={fv("note")}
                  rows={2}
                  className={`${inp} border-gray-200 resize-none`}
                />
              </div>

              {/* Amount Box */}
              <div className="py-3 border-t border-gray-100 dark:border-zinc-800 space-y-2">
                <div className="flex justify-between text-xs text-gray-500 dark:text-zinc-400 font-sans">
                  <span>{isHindi ? "बकरे की कीमत" : "Goat Price"}:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{fmt(goat.price)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-zinc-400 font-sans">
                  <span>{isHindi ? "डिलीवरी शुल्क" : "Delivery Fee"}:</span>
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">
                    {deliveryCharge > 0 ? fmt(deliveryCharge) : isHindi ? "मुफ़्त डिलीवरी" : "Free Delivery"}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-zinc-400 font-sans">
                  <span>{isHindi ? "प्लेटफ़ॉर्म शुल्क (2%)" : "Buyer Platform Fee (2%)"}:</span>
                  <span className="font-medium text-amber-800 dark:text-amber-400">{fmt(buyerPlatformFee)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-dashed border-gray-200 dark:border-zinc-800">
                  <div>
                    <span className="text-xs text-gray-900 dark:text-white font-sans font-bold block">
                      {t.totalAmount}
                    </span>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-sans font-bold">
                      {isHindi ? "100% सुरक्षित भुगतान" : "100% Buyer Protected"}
                    </span>
                  </div>
                  <span className="text-xl sm:text-2xl font-bold font-serif text-[#1c1917] dark:text-white">
                    {fmt(totalAmount)}
                  </span>
                </div>
              </div>

              {/* Actions for Form */}
              {hasSavedDetails && isEditing ? (
                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={loading}
                    className="flex-1 py-3.5 rounded-full border border-gray-300 dark:border-zinc-700 text-xs font-bold font-sans text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    {t.keepSaved}
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleProceed}
                    className="flex-[2] py-3.5 rounded-full gold-gradient-btn text-xs sm:text-sm font-bold font-sans flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{isHindi ? "गेटवे से जुड़ रहे हैं..." : "Connecting Gateway..."}</span>
                      </>
                    ) : (
                      <>
                        <span>⚡ {t.proceedToPay} • {fmt(totalAmount)} 🔒</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleProceed}
                  className="w-full py-3.5 rounded-full gold-gradient-btn text-xs sm:text-sm font-bold font-sans flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{isHindi ? "गेटवे से जुड़ रहे हैं..." : "Connecting Gateway..."}</span>
                    </>
                  ) : (
                    <>
                      <span>⚡ {t.proceedToPay} • {fmt(totalAmount)} 🔒</span>
                    </>
                  )}
                </button>
              )}

              <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400 dark:text-zinc-500 font-sans mt-3">
                <Lock size={12} className="text-emerald-600 dark:text-emerald-400" />
                <span>{isHindi ? "256-बिट सुरक्षित भुगतान • सीधे फार्म से सुरक्षित परिवहन" : "256-bit Encrypted • Direct Farm Safe Transport"}</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Step 3: Success Confirmation */}
      {step === 3 && (
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mx-auto mb-4 animate-bounce">
            ✓
          </div>
          <h3 className="text-2xl font-bold font-serif text-gray-900 dark:text-white mb-2">{t.paymentSuccess}</h3>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 font-sans mb-3">{t.paymentSuccessSub}</p>
          <p className="text-2xl font-bold font-serif text-[#8b5e2a] dark:text-amber-400 mb-5">{fmt(totalAmount)}</p>
          <div className="p-3 bg-[#faf6ee] dark:bg-zinc-800 rounded-2xl text-xs font-sans text-gray-600 dark:text-zinc-300 max-w-xs mx-auto">
            {isHindi ? "लाइव ऑर्डर ट्रैकिंग पर जा रहे हैं..." : "Redirecting to live order tracking..."}
          </div>
        </div>
      )}
    </Modal>
  );
}
