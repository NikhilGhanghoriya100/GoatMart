"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";
import { Eye, EyeOff, ArrowRight, Lock, Mail, Sun, Moon } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useTheme } from "@/context/ThemeContext";
import Logo from "@/components/ui/Logo";

export default function LoginPage() {
  const router = useRouter();
  const { t, lang, setLang, isHindi } = useTranslation();
  const { toggleTheme, isDark } = useTheme();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const inp =
    "w-full pl-10 pr-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-sm font-sans outline-none focus:border-zinc-950 dark:focus:border-white focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 transition-all";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error(isHindi ? "कृपया ईमेल और पासवर्ड दोनों दर्ज करें" : "Please enter both email and password");
      return;
    }
    setLoading(true);
    const res = await signIn("credentials", {
      email: form.email.trim(),
      password: form.password,
      redirect: false,
    });
    setLoading(false);

    if (res?.error) {
      toast.error(
        res.error || (isHindi ? "अमान्य विवरण। कृपया ईमेल और पासवर्ड की पुष्टि करें।" : "Invalid credentials. Please verify your email and password.")
      );
      return;
    }

    toast.success(isHindi ? "स्वागत है!" : "Welcome back!");
    router.push("/");
    // router.refresh(); // removed to avoid duplicate request
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center px-4 py-12 relative">
      {/* Top Floating Controls */}
      <div className="absolute top-6 right-6 flex items-center gap-2">
        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="w-9 h-9 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 shadow-xs"
        >
          {isDark ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
        </button>

        {/* Language Switcher */}
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-full p-0.5 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <button
            type="button"
            onClick={() => setLang("en")}
            className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all font-sans ${
              lang === "en" ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs" : "text-zinc-500"
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLang("hi")}
            className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all font-sans ${
              lang === "hi" ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs" : "text-zinc-500"
            }`}
          >
            हिन्दी
          </button>
        </div>
      </div>

      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8 flex justify-center">
          <Logo size="lg" showTagline={true} />
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-8 sm:p-10">
          <h1 className="text-2xl font-black font-serif text-zinc-950 dark:text-white mb-1.5 text-center">
            {isHindi ? "पुनः स्वागत है" : "Welcome Back"}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-sans mb-7 text-center">
            {isHindi
              ? "अपने ऑर्डर, पूछताछ और सहेजी गई बकरियों तक पहुंचने के लिए साइन इन करें।"
              : "Sign in to access your orders, inquiries, and saved goats."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 font-sans mb-1.5 block">
                {t.emailAddress}
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={f("email")}
                  className={inp}
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 font-sans mb-1.5 block">
                {isHindi ? "पासवर्ड" : "Password"}
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type={showPass ? "text" : "password"}
                  placeholder={isHindi ? "पासवर्ड दर्ज करें" : "Enter password"}
                  value={form.password}
                  onChange={f("password")}
                  className={`${inp} pr-11`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 text-sm font-bold font-sans flex items-center justify-center gap-2 mt-4 shadow-lg transition-colors"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  {isHindi ? "साइन इन हो रहा है..." : "Signing In..."}
                </>
              ) : (
                <>
                  <span>{t.login}</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <div className="text-center mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800 text-xs sm:text-sm font-sans text-zinc-600 dark:text-zinc-400">
            {isHindi ? "खाता नहीं है?" : "Don't have an account yet?"}{" "}
            <Link href="/register" className="text-zinc-950 dark:text-white font-bold hover:underline">
              {t.register}
            </Link>
          </div>
        </div>

        <p className="text-center mt-6 text-xs text-zinc-500 font-sans">
          <Link href="/" className="hover:text-zinc-950 dark:hover:text-white transition-colors">
            {isHindi ? "← वापस मुख्य पृष्ठ पर जाएं" : "← Return to Marketplace"}
          </Link>
        </p>
      </div>
    </div>
  );
}
