"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";
import { Eye, EyeOff, User, Store } from "lucide-react";
import axios from "axios";

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<"customer" | "seller">("customer");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name:"", email:"", phone:"", password:"", farmName:"", farmLocation:"" });
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }));
  const inp = "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-sans outline-none focus:border-[#c8a96e] bg-[#faf8f4] transition-colors";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { toast.error("Please fill all required fields"); return; }
    if (form.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      const { data } = await axios.post("/api/auth/register", { ...form, role });
      if (!data.success) { toast.error(data.error || "Registration failed"); return; }
      toast.success(data.message || "Account created!");
      if (role === "customer") {
        const res = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
        if (!res?.error) { router.push("/"); router.refresh(); }
      } else {
        router.push("/login");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Something went wrong");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-7">

          <Link href="/" className="inline-flex items-center gap-3">
          {/* Logo Icon Box */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] flex items-center justify-center text-3xl shadow-lg">
          🐐
          </div>
  
          {/* Logo Text */}
         <span className="text-2xl font-bold font-serif text-[#2d2d2d]">
          GoatMart
        </span>
        </Link>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-7">
          <h1 className="text-xl font-bold font-serif mb-1 text-center">Register Now</h1>
     

          {/* Role toggle */}
          <div className="flex bg-gray-50 rounded-xl p-1 mb-5 border border-gray-100">
            {([["customer","Customer","👤"] as const, ["seller","Seller","🏪"] as const]).map(([v, l, ic]) => (
              <button key={v} type="button" onClick={() => setRole(v)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold font-sans transition-all ${role === v ? "bg-white shadow text-gray-800" : "text-gray-400"}`}>
                <span>{ic}</span> {l}
              </button>
            ))}
          </div>

          {role === "seller" && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-sans text-amber-700 leading-relaxed">
              🏪 Seller accounts require admin approval (24-48 hrs). You&apos;ll be notified once approved.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 font-sans mb-1.5 block">Full Name *</label>
              <input placeholder="Your full name" value={form.name} onChange={f("name")} className={inp} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 font-sans mb-1.5 block">Email Address *</label>
              <input type="email" placeholder="your@email.com" value={form.email} onChange={f("email")} className={inp} autoComplete="email" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 font-sans mb-1.5 block">Phone Number</label>
              <input placeholder="10-digit mobile number" value={form.phone} onChange={f("phone")} className={inp} />
            </div>

            {role === "seller" && (
              <>
                <div>
                  <label className="text-xs font-semibold text-gray-500 font-sans mb-1.5 block">Farm Name</label>
                  <input placeholder="e.g. Al-Noor Farms" value={form.farmName} onChange={f("farmName")} className={inp} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 font-sans mb-1.5 block">Farm Location</label>
                  <input placeholder="e.g. Lucknow, UP" value={form.farmLocation} onChange={f("farmLocation")} className={inp} />
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-semibold text-gray-500 font-sans mb-1.5 block">Password *</label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} placeholder="Minimum 6 characters" value={form.password} onChange={f("password")} className={`${inp} pr-11`} autoComplete="new-password" />
                <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* <p className="text-xs text-gray-400 font-sans">
              By signing up, you agree to our{" "}
              <Link href="/terms" className="text-[#c8a96e] hover:underline">Terms</Link>{" & "}
              <Link href="/privacy" className="text-[#c8a96e] hover:underline">Privacy Policy</Link>
            </p> */}

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-full bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] text-white font-bold font-sans text-sm hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center gap-2 shadow-lg mt-1">
              {loading
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating account…</>
                : role === "seller" ? "Submit Seller Application →" : "Create Account →"}
            </button>
          </form>

          <div className="text-center mt-4 text-sm font-sans text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="text-[#c8a96e] font-semibold hover:underline">Login</Link>
          </div>
        </div>

        <p className="text-center mt-4 text-xs text-gray-400 font-sans">
          <Link href="/" className="hover:text-[#c8a96e] transition-colors">← Back to Home</Link>
        </p>
      </div>
    </div>
  );
}
