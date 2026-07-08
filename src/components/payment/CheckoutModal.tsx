"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import axios from "axios";
import Modal from "@/components/ui/Modal";
import { fmt } from "@/lib/utils";
import type { Goat } from "@/types";

declare global { interface Window { Razorpay: any } }

interface DeliveryForm {
  name: string; phone: string; email: string;
  address: string; city: string; state: string; pin: string; note: string;
}

const EMPTY: DeliveryForm = { name:"", phone:"", email:"", address:"", city:"", state:"", pin:"", note:"" };

export default function CheckoutModal({ goat, onClose }: { goat: Goat; onClose: () => void }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [step, setStep] = useState<1|2|3>(1);
  const [form, setForm] = useState<DeliveryForm>(EMPTY);
  const [payMethod, setPayMethod] = useState("upi");
  const [errors, setErrors] = useState<Partial<DeliveryForm>>({});
  const [loading, setLoading] = useState(false);

  const fv = (k: keyof DeliveryForm) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const validate = () => {
    const e: Partial<DeliveryForm> = {};
    if (!form.name.trim()) e.name = "Required";
    if (!/^\d{10}$/.test(form.phone)) e.phone = "Enter valid 10-digit number";
    if (!form.address.trim()) e.address = "Required";
    if (!form.city.trim()) e.city = "Required";
    if (!form.state.trim()) e.state = "Required";
    if (!/^\d{6}$/.test(form.pin)) e.pin = "Enter valid 6-digit PIN";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const loadRazorpay = () =>
    new Promise<boolean>(res => {
      if (window.Razorpay) { res(true); return; }
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => res(true);
      s.onerror = () => res(false);
      document.body.appendChild(s);
    });

  const handlePay = async () => {
    setLoading(true);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) { toast.error("Could not load payment gateway. Check your connection."); return; }

      // Create order on backend
      const { data } = await axios.post("/api/orders", {
        goatId: goat._id,
        delivery: { name: form.name, phone: form.phone, email: form.email, address: form.address, city: form.city, state: form.state, pin: form.pin, note: form.note },
      });

      if (!data.success) { toast.error(data.error || "Could not create order"); return; }

      const { orderId, razorpayOrderId, amount, keyId } = data.data;

      const rzpOptions = {
        key: keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: amount * 100,
        currency: "INR",
        name: "GoatMart",
        description: `Purchase: ${goat.name}`,
        order_id: razorpayOrderId,
        prefill: { name: form.name, contact: form.phone, email: form.email || session?.user?.email },
        notes: { goatId: goat._id, goatName: goat.name },
        theme: { color: "#c8a96e" },
        handler: async (response: any) => {
          try {
            const verify = await axios.post("/api/payment/verify", {
              orderId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            if (verify.data.success) {
              setStep(3);
              toast.success("Payment successful! Order confirmed.");
              setTimeout(() => { onClose(); router.push("/orders"); }, 2500);
            }
          } catch { toast.error("Payment verification failed. Contact support."); }
        },
        modal: { ondismiss: () => setLoading(false) },
      };

      const rzp = new window.Razorpay(rzpOptions);
      rzp.on("payment.failed", (resp: any) => {
        toast.error(`Payment failed: ${resp.error.description}`);
        setLoading(false);
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Something went wrong");
    } finally { setLoading(false); }
  };

  const inp = "w-full px-3 py-2.5 border rounded-xl text-sm font-sans outline-none transition-colors focus:border-[#c8a96e] bg-[#faf8f4]";
  const err = (k: keyof DeliveryForm) => errors[k] ? <p className="text-red-500 text-xs font-sans mt-1">{errors[k]}</p> : null;

  return (
    <Modal open title={step === 3 ? "🎉 Order Confirmed!" : step === 2 ? "🔒 Secure Payment" : "📦 Delivery Details"} onClose={onClose} size="md">
      {/* Progress */}
      {step < 3 && (
        <div className="flex items-center gap-0 mb-5">
          {["Delivery", "Payment", "Done"].map((s, i) => (
            <div key={s} className="flex-1 flex flex-col items-center gap-1 relative">
              {i < 2 && <div className={`absolute top-3 left-1/2 right-[-50%] h-0.5 ${step > i + 1 ? "bg-green-500" : "bg-gray-200"}`} />}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-sans z-10 transition-colors ${step > i ? "bg-green-500 text-white" : step === i + 1 ? "bg-[#c8a96e] text-white" : "bg-gray-100 text-gray-400"}`}>
                {step > i ? "✓" : i + 1}
              </div>
              <span className={`text-[10px] font-sans ${step === i + 1 ? "text-[#c8a96e] font-bold" : "text-gray-400"}`}>{s}</span>
            </div>
          ))}
        </div>
      )}

      {/* Goat summary */}
      <div className="flex items-center gap-3 bg-[#faf6ee] rounded-xl p-3 mb-4">
        {goat.images?.[0] && <img src={goat.images[0]} alt={goat.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold truncate">{goat.name}</div>
          <div className="text-xs text-gray-400 font-sans">by {goat.sellerName} • {goat.breed}</div>
        </div>
        <div className="text-lg font-bold text-[#c8a96e] flex-shrink-0">{fmt(goat.price)}</div>
      </div>

      {/* Step 1: Delivery */}
      {step === 1 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><input placeholder="Full Name *" value={form.name} onChange={fv("name")} className={`${inp} ${errors.name ? "border-red-300" : "border-gray-200"}`} />{err("name")}</div>
            <div><input placeholder="Phone *" value={form.phone} onChange={fv("phone")} className={`${inp} ${errors.phone ? "border-red-300" : "border-gray-200"}`} />{err("phone")}</div>
          </div>
          <input placeholder="Email" type="email" value={form.email} onChange={fv("email")} className={`${inp} border-gray-200`} />
          <input placeholder="Full Address *" value={form.address} onChange={fv("address")} className={`${inp} ${errors.address ? "border-red-300" : "border-gray-200"}`} />{err("address")}
          <div className="grid grid-cols-3 gap-3">
            <div><input placeholder="City *" value={form.city} onChange={fv("city")} className={`${inp} ${errors.city ? "border-red-300" : "border-gray-200"}`} />{err("city")}</div>
            <div><input placeholder="State *" value={form.state} onChange={fv("state")} className={`${inp} ${errors.state ? "border-red-300" : "border-gray-200"}`} />{err("state")}</div>
            <div><input placeholder="PIN *" value={form.pin} onChange={fv("pin")} className={`${inp} ${errors.pin ? "border-red-300" : "border-gray-200"}`} />{err("pin")}</div>
          </div>
          <textarea placeholder="Special instructions (optional)" value={form.note} onChange={fv("note")} rows={2} className={`${inp} border-gray-200 resize-none`} />
          <button onClick={() => validate() && setStep(2)} className="w-full py-3 rounded-full bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] text-white font-bold font-sans text-sm hover:opacity-90 transition-opacity mt-1">
            Continue to Payment →
          </button>
        </div>
      )}

      {/* Step 2: Payment */}
      {step === 2 && (
        <div>
          <div className="bg-gray-50 rounded-xl p-3 mb-4 text-xs font-sans text-gray-600 leading-relaxed">
            📍 {form.name} • {form.phone}<br />{form.address}, {form.city}, {form.state} - {form.pin}
          </div>
          <div className="space-y-2 mb-4">
            {[{ id:"upi", ic:"📱", l:"UPI (GPay, PhonePe, Paytm)" }, { id:"card", ic:"💳", l:"Debit / Credit Card" }, { id:"nb", ic:"🏦", l:"Net Banking" }, { id:"wallet", ic:"👛", l:"Wallets" }].map(p => (
              <div key={p.id} onClick={() => setPayMethod(p.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${payMethod === p.id ? "border-[#c8a96e] bg-[#c8a96e10]" : "border-gray-100 hover:border-gray-200"}`}>
                <span className="text-xl">{p.ic}</span>
                <span className="flex-1 text-sm font-sans">{p.l}</span>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${payMethod === p.id ? "border-[#c8a96e] bg-[#c8a96e]" : "border-gray-300"}`}>
                  {payMethod === p.id && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center py-3 border-t border-gray-100 mb-3">
            <span className="text-sm font-sans text-gray-500">Total Amount</span>
            <span className="text-xl font-bold text-[#c8a96e]">{fmt(goat.price)}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-full border border-gray-200 text-sm text-gray-500 font-sans hover:border-gray-300 transition-colors">← Back</button>
            <button onClick={handlePay} disabled={loading}
              className="flex-[2] py-3 rounded-full bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] text-white font-bold font-sans text-sm hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center gap-2">
              {loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing…</> : `Pay ${fmt(goat.price)} 🔒`}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Success */}
      {step === 3 && (
        <div className="text-center py-4">
          <div className="text-6xl mb-4 animate-bounce">✅</div>
          <h3 className="text-xl font-bold font-serif mb-2">Order Confirmed!</h3>
          <p className="text-sm text-gray-500 font-sans mb-2">Your order for <strong>{goat.name}</strong> has been placed.</p>
          <p className="text-2xl font-bold text-[#c8a96e] mb-4">{fmt(goat.price)}</p>
          <p className="text-xs text-gray-400 font-sans">Redirecting to your orders…</p>
        </div>
      )}
    </Modal>
  );
}
