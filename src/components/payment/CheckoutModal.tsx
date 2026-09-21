"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import axios from "axios";
import Modal from "@/components/ui/Modal";
import { fmt } from "@/lib/utils";
import type { Goat } from "@/types";
import { Smartphone, CreditCard, Lock } from "lucide-react";
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

export default function CheckoutModal({ goat, onClose }: { goat: Goat; onClose: () => void }) {
  const { data: session } = useSession();
  const router = useRouter();
  const { t, translateBreed, isHindi } = useTranslation();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<DeliveryForm>(EMPTY);
  const [payMethod, setPayMethod] = useState("upi");
  const [errors, setErrors] = useState<Partial<DeliveryForm>>({});
  const [loading, setLoading] = useState(false);

  // Preload customer address if available
  useEffect(() => {
    if (session?.user) {
      axios
        .get("/api/user/profile")
        .then(({ data }) => {
          if (data.success && data.data) {
            const u = data.data;
            setForm((p) => ({
              ...p,
              name: u.name || session.user.name || "",
              phone: u.phone || "",
              email: u.email || session.user.email || "",
              address: u.address?.street || "",
              city: u.address?.city || "",
              state: u.address?.state || "",
              pin: u.address?.pin || "",
            }));
          }
        })
        .catch(() => {});
    }
  }, [session]);

  const fv = (k: keyof DeliveryForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const validate = () => {
    const e: Partial<DeliveryForm> = {};
    if (!form.name.trim()) e.name = isHindi ? "पूरा नाम आवश्यक है" : "Full name is required";
    if (!/^\d{10}$/.test(form.phone.trim()))
      e.phone = isHindi ? "मान्य 10-अंकीय मोबाइल नंबर दर्ज करें" : "Enter valid 10-digit mobile number";
    if (!form.address.trim())
      e.address = isHindi ? "डिलीवरी के लिए मकान / पता आवश्यक है" : "Street address is required for transport";
    if (!form.city.trim()) e.city = isHindi ? "शहर आवश्यक है" : "City is required";
    if (!form.state.trim()) e.state = isHindi ? "राज्य आवश्यक है" : "State is required";
    if (!/^\d{6}$/.test(form.pin.trim()))
      e.pin = isHindi ? "मान्य 6-अंकीय पिन कोड दर्ज करें" : "Enter valid 6-digit PIN code";
    setErrors(e);
    return Object.keys(e).length === 0;
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

      const { orderId, razorpayOrderId, amount, keyId, isMock } = data.data;

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

  const inp =
    "w-full px-4 py-3 border rounded-xl text-sm font-sans outline-none transition-colors focus:border-[#8b5e2a] bg-[#faf8f4]";
  const err = (k: keyof DeliveryForm) =>
    errors[k] ? <p className="text-red-500 text-xs font-sans mt-1">{errors[k]}</p> : null;

  const stepLabels = isHindi
    ? ["1. डिलीवरी पता", "2. सुरक्षित भुगतान", "3. पुष्टि"]
    : ["1. Delivery Address", "2. Payment", "3. Confirmed"];

  return (
    <Modal
      open
      title={
        step === 3
          ? isHindi
            ? "🎉 ऑर्डर पुष्ट हुआ!"
            : "🎉 Order Confirmed!"
          : step === 2
          ? isHindi
            ? "🔒 सुरक्षित भुगतान"
            : "🔒 Secure Payment"
          : isHindi
          ? "📦 डिलीवरी और परिवहन विवरण"
          : "📦 Delivery & Transport Details"
      }
      onClose={onClose}
      size="md"
    >
      {/* Step Indicators */}
      {step < 3 && (
        <div className="flex items-center gap-0 mb-6">
          {stepLabels.map((s, i) => (
            <div key={s} className="flex-1 flex flex-col items-center gap-1.5 relative">
              {i < 2 && (
                <div
                  className={`absolute top-3.5 left-1/2 right-[-50%] h-0.5 ${
                    step > i + 1 ? "bg-emerald-600" : "bg-gray-200"
                  }`}
                />
              )}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-sans z-10 transition-colors ${
                  step > i + 1
                    ? "bg-emerald-600 text-white"
                    : step === i + 1
                    ? "bg-[#8b5e2a] text-white shadow-md"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {step > i + 1 ? "✓" : i + 1}
              </div>
              <span
                className={`text-[11px] font-sans ${
                  step === i + 1 ? "text-[#8b5e2a] font-bold" : "text-gray-400"
                }`}
              >
                {s}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Goat Item Summary Card */}
      <div className="flex items-center gap-3.5 bg-[#faf6ee] rounded-2xl p-3.5 mb-5 border border-[#ebdcb8]">
        {goat.images?.[0] ? (
          <img
            src={goat.images[0]}
            alt={goat.name}
            className="w-14 h-14 rounded-xl object-cover flex-shrink-0 shadow-xs"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center text-2xl">🐐</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-gray-900 truncate font-serif">{goat.name}</div>
          <div className="text-xs text-gray-500 font-sans">
            {isHindi ? "विक्रेता" : "Seller"}: {goat.sellerName} • {translateBreed(goat.breed)} • {goat.weight}
            {t.kg}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-lg font-bold font-serif text-[#1c1917]">{fmt(goat.price)}</div>
          <div className="text-[10px] text-emerald-700 font-bold font-sans">
            {isHindi ? "✓ 100% सुरक्षित" : "✓ Buyer Protected"}
          </div>
        </div>
      </div>

      {/* Step 1: Delivery Form */}
      {step === 1 && (
        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-sans mb-1 block">{t.fullName} *</label>
              <input
                placeholder={isHindi ? "प्राप्तकर्ता का नाम" : "Recipient name"}
                value={form.name}
                onChange={fv("name")}
                className={`${inp} ${errors.name ? "border-red-400" : "border-gray-200"}`}
              />
              {err("name")}
            </div>
            <div>
              <label className="text-xs text-gray-500 font-sans mb-1 block">{t.phone} *</label>
              <input
                placeholder={isHindi ? "10-अंकीय मोबाइल" : "10-digit mobile"}
                value={form.phone}
                onChange={fv("phone")}
                className={`${inp} ${errors.phone ? "border-red-400" : "border-gray-200"}`}
              />
              {err("phone")}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 font-sans mb-1 block">{t.streetAddress} *</label>
            <input
              placeholder={isHindi ? "मकान नं, गली, लैंडमार्क" : "House/Plot number, Street, Landmark"}
              value={form.address}
              onChange={fv("address")}
              className={`${inp} ${errors.address ? "border-red-400" : "border-gray-200"}`}
            />
            {err("address")}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-sans mb-1 block">{t.city} *</label>
              <input
                placeholder={t.city}
                value={form.city}
                onChange={fv("city")}
                className={`${inp} ${errors.city ? "border-red-400" : "border-gray-200"}`}
              />
              {err("city")}
            </div>
            <div>
              <label className="text-xs text-gray-500 font-sans mb-1 block">{t.state} *</label>
              <input
                placeholder={t.state}
                value={form.state}
                onChange={fv("state")}
                className={`${inp} ${errors.state ? "border-red-400" : "border-gray-200"}`}
              />
              {err("state")}
            </div>
            <div>
              <label className="text-xs text-gray-500 font-sans mb-1 block">{t.pincode} *</label>
              <input
                placeholder={t.pincode}
                value={form.pin}
                onChange={fv("pin")}
                className={`${inp} ${errors.pin ? "border-red-400" : "border-gray-200"}`}
              />
              {err("pin")}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 font-sans mb-1 block">{t.deliveryNotes}</label>
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

          <button
            onClick={() => validate() && setStep(2)}
            className="w-full py-3.5 rounded-full gold-gradient-btn text-sm font-bold font-sans mt-2"
          >
            {isHindi ? "सुरक्षित भुगतान के लिए आगे बढ़ें →" : "Continue to Payment →"}
          </button>
        </div>
      )}

      {/* Step 2: Payment Selection */}
      {step === 2 && (
        <div>
          <div className="bg-[#faf8f4] rounded-2xl p-4 mb-5 border border-gray-100 text-xs font-sans text-gray-600 leading-relaxed">
            <div className="font-bold text-gray-900 mb-1">
              {isHindi ? "📍 डिलीवरी गंतव्य:" : "📍 Destination:"}
            </div>
            <div>
              {form.name} • 📞 {form.phone}
            </div>
            <div className="text-gray-500 mt-0.5">
              {form.address}, {form.city}, {form.state} - {form.pin}
            </div>
          </div>

          <div className="space-y-2.5 mb-5">
            {[
              {
                id: "upi",
                label: isHindi
                  ? "UPI तत्काल भुगतान (GPay, PhonePe, Paytm, BHIM)"
                  : "UPI Instant Payment (GPay, PhonePe, Paytm, BHIM)",
                icon: Smartphone,
              },
              {
                id: "card",
                label: isHindi
                  ? "क्रेडिट / डेबिट कार्ड (Visa, Mastercard, RuPay)"
                  : "Credit / Debit Card (Visa, Mastercard, RuPay)",
                icon: CreditCard,
              },
              {
                id: "nb",
                label: isHindi
                  ? "नेट बैंकिंग (SBI, HDFC, ICICI, Axis व अन्य)"
                  : "Net Banking (SBI, HDFC, ICICI, Axis & more)",
                icon: Lock,
              },
            ].map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.id}
                  onClick={() => setPayMethod(p.id)}
                  className={`flex items-center gap-3.5 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                    payMethod === p.id
                      ? "border-[#8b5e2a] bg-[#faf4e8]"
                      : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <Icon size={18} className={payMethod === p.id ? "text-[#8b5e2a]" : "text-gray-400"} />
                  <span className="flex-1 text-xs sm:text-sm font-semibold font-sans text-gray-800">
                    {p.label}
                  </span>
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      payMethod === p.id ? "border-[#8b5e2a] bg-[#8b5e2a]" : "border-gray-300"
                    }`}
                  >
                    {payMethod === p.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Amount Box */}
          <div className="flex justify-between items-center py-3.5 border-t border-gray-100 mb-4">
            <div>
              <span className="text-xs text-gray-500 font-sans block">{t.totalAmount}</span>
              <span className="text-[10px] text-emerald-700 font-sans font-bold">
                {isHindi ? "100% सुरक्षित भुगतान" : "100% Buyer Protected"}
              </span>
            </div>
            <span className="text-2xl font-bold font-serif text-[#1c1917]">{fmt(goat.price)}</span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3.5 rounded-full border border-gray-200 text-xs font-bold font-sans text-gray-600 hover:border-gray-300"
            >
              {isHindi ? "← वापस" : "← Back"}
            </button>
            <button
              onClick={handlePay}
              disabled={loading}
              className="flex-[2] py-3.5 rounded-full gold-gradient-btn text-sm font-bold font-sans flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {isHindi ? "गेटवे से जुड़ रहे हैं..." : "Connecting Gateway..."}
                </>
              ) : isHindi ? (
                `सुरक्षित ${fmt(goat.price)} भुगतान करें 🔒`
              ) : (
                `Pay ${fmt(goat.price)} Securely 🔒`
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Success Confirmation */}
      {step === 3 && (
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mx-auto mb-4 animate-bounce">
            ✓
          </div>
          <h3 className="text-2xl font-bold font-serif text-gray-900 mb-2">{t.paymentSuccess}</h3>
          <p className="text-xs sm:text-sm text-gray-500 font-sans mb-3">{t.paymentSuccessSub}</p>
          <p className="text-2xl font-bold font-serif text-[#8b5e2a] mb-5">{fmt(goat.price)}</p>
          <div className="p-3 bg-[#faf6ee] rounded-2xl text-xs font-sans text-gray-600 max-w-xs mx-auto">
            {isHindi ? "लाइव ऑर्डर ट्रैकिंग पर जा रहे हैं..." : "Redirecting to live order tracking..."}
          </div>
        </div>
      )}
    </Modal>
  );
}
