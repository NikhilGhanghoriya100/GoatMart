"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }));
  const inp = "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-sans outline-none focus:border-[#c8a96e] bg-[#faf8f4] transition-colors";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) { toast.error("Please fill all fields"); return; }
    setLoading(true);
    const res = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
    setLoading(false);
    if (res?.error) { toast.error("Invalid email or password"); return; }
    toast.success("Welcome back!");
    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
      
          <Link href="/" className="inline-flex items-center gap-3">
  {/* Logo Icon Box */}
  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] flex items-center justify-center text-3xl shadow-lg">
    🐐
  </div>
  
  {/* Logo Text */}
  <div className="text-2xl font-bold font-serif text-[#2d2d2d]">
    GoatMart
  </div>
</Link>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-7">
          <h1 className="text-xl font-bold font-serif mb-1 text-center">Welcome back! 👋</h1>
          <p className="text-sm text-gray-400 font-sans mb-6 text-center">Login to your GoatMart account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 font-sans mb-1.5 block">Email Address</label>
              <input type="email" placeholder="your@email.com" value={form.email} onChange={f("email")} className={inp} autoComplete="email" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 font-sans mb-1.5 block">Password</label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} placeholder="Enter your password" value={form.password} onChange={f("password")} className={`${inp} pr-11`} autoComplete="current-password" />
                <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="text-right mt-1">
                <span className="text-xs text-[#c8a96e] cursor-pointer font-sans hover:underline">Forgot password?</span>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full py-3.5 rounded-full bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] text-white font-bold font-sans text-sm hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center gap-2 shadow-lg mt-2">
              {loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Logging in…</> : "Login →"}
            </button>
          </form>

          <div className="text-center mt-5 text-sm font-sans text-gray-500">
            New to GoatMart?{" "}
            <Link href="/register" className="text-[#c8a96e] font-semibold hover:underline">Register Now</Link>
          </div>

          
        </div>

        <p className="text-center mt-5 text-xs text-gray-400 font-sans">
          <Link href="/" className="hover:text-[#c8a96e] transition-colors">← Back to Home</Link>
        </p>
      </div>
    </div>
  );
}
