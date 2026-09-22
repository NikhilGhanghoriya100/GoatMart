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

  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      const { getFirebaseClient } = await import("@/lib/firebase");
      const { auth, googleProvider } = getFirebaseClient();
      const { signInWithPopup } = await import("firebase/auth");

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const idToken = await user.getIdToken();

      const res = await signIn("firebase-google", {
        idToken,
        redirect: false,
      });

      if (res?.error) {
        toast.error(res.error || (isHindi ? "Google से साइन इन विफल रहा" : "Google Sign-In failed"));
        return;
      }

      toast.success(isHindi ? "स्वागत है!" : "Welcome back!");
      router.push("/");
    } catch (error: any) {
      if (
        error?.code === "auth/popup-closed-by-user" ||
        error?.code === "auth/cancelled-popup-request"
      ) {
        // User closed popup without signing in
        return;
      }
      if (error?.code === "auth/popup-blocked") {
        toast.error(
          isHindi
            ? "पॉपअप अवरुद्ध हो गया। कृपया ब्राउज़र में पॉपअप की अनुमति दें।"
            : "Popup was blocked. Please allow popups for this site."
        );
        return;
      }
      if (error?.message?.includes("Firebase configuration is missing")) {
        toast.error(
          isHindi
            ? "Firebase कॉन्फ़िगरेशन गायब है। कृपया व्यवस्थापक से संपर्क करें।"
            : "Firebase configuration is missing. Please check your environment variables."
        );
        return;
      }
      toast.error(
        error?.message || (isHindi ? "Google प्रमाणीकरण विफल रहा" : "Google authentication failed")
      );
    } finally {
      setGoogleLoading(false);
    }
  };

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

          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading}
            className="w-full py-3.5 px-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-100 font-bold font-sans text-sm flex items-center justify-center gap-3 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-zinc-600 dark:border-zinc-300 border-t-transparent rounded-full animate-spin" />
                <span>{isHindi ? "Google से कनेक्ट हो रहा है..." : "Connecting with Google..."}</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isHindi ? "Google के साथ जारी रखें" : "Continue with Google"}</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
            <span className="absolute bg-white dark:bg-zinc-900 px-3 text-xs uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-sans font-semibold">
              {isHindi ? "या ईमेल से" : "or with email"}
            </span>
          </div>

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
              disabled={loading || googleLoading}
              className="w-full py-3.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 text-sm font-bold font-sans flex items-center justify-center gap-2 mt-4 shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
