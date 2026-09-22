"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";
import { Eye, EyeOff, User, Store, ArrowRight, Lock, Sparkles, Sun, Moon } from "lucide-react";
import axios from "axios";
import { useTranslation } from "@/hooks/useTranslation";
import { useTheme } from "@/context/ThemeContext";
import Logo from "@/components/ui/Logo";

export default function RegisterPage() {
  const router = useRouter();
  const { t, lang, setLang, isHindi } = useTranslation();
  const { toggleTheme, isDark } = useTheme();
  const [role, setRole] = useState<"customer" | "seller">("customer");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    farmName: "",
    farmLocation: "",
  });

  const handleGoogleSignUp = async () => {
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
        role,
        farmName: form.farmName.trim(),
        farmLocation: form.farmLocation.trim(),
        phone: form.phone.trim(),
        redirect: false,
      });

      if (res?.error) {
        toast.error(res.error || (isHindi ? "Google से साइन अप विफल रहा" : "Google Sign-Up failed"));
        return;
      }

      toast.success(
        role === "seller"
          ? (isHindi ? "विक्रेता आवेदन जमा हो गया!" : "Seller registration submitted!")
          : (isHindi ? "खाता बन गया!" : "Account created successfully!")
      );

      if (role === "seller") {
        router.push("/seller");
      } else {
        router.push("/");
      }
    } catch (error: any) {
      if (
        error?.code === "auth/popup-closed-by-user" ||
        error?.code === "auth/cancelled-popup-request"
      ) {
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
    "w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-sm font-sans outline-none focus:border-zinc-950 dark:focus:border-white focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 transition-all";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      toast.error(isHindi ? "कृपया सभी आवश्यक फ़ील्ड भरें" : "Please fill in all required fields");
      return;
    }
    if (form.password.length < 6) {
      toast.error(isHindi ? "पासवर्ड कम से कम 6 अक्षरों का होना चाहिए" : "Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post("/api/auth/register", {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        role,
        farmName: form.farmName.trim(),
        farmLocation: form.farmLocation.trim(),
      });

      if (!data.success) {
        toast.error(data.error || (isHindi ? "पंजीकरण विफल रहा" : "Registration failed"));
        return;
      }

      toast.success(data.message || (isHindi ? "खाता बन गया!" : "Account created!"));

      const res = await signIn("credentials", {
        email: form.email.trim(),
        password: form.password,
        redirect: false,
      });

      if (!res?.error) {
        if (role === "seller") {
          router.push("/seller");
        } else {
          router.push("/");
        }
      } else {
        router.push("/login");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || (isHindi ? "पंजीकरण विफल रहा" : "Registration failed"));
    } finally {
      setLoading(false);
    }
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
            {isHindi ? "नया खाता बनाएं" : "Create Your Account"}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans mb-6 text-center">
            {isHindi
              ? "भारत के सबसे भरोसेमंद सत्यापित लाइवस्टॉक प्लेटफॉर्म से जुड़ें।"
              : "Join India's most trusted verified livestock platform."}
          </p>

          {/* Role Selection Toggle */}
          <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-2xl p-1.5 mb-6 border border-zinc-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setRole("customer")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold font-sans transition-all ${
                role === "customer"
                  ? "bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white shadow-sm border border-zinc-200 dark:border-zinc-700"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
              }`}
            >
              <User size={14} />
              <span>{isHindi ? "खरीदार / ग्राहक" : "Buyer / Customer"}</span>
            </button>
            <button
              type="button"
              onClick={() => setRole("seller")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold font-sans transition-all ${
                role === "seller"
                  ? "bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white shadow-sm border border-zinc-200 dark:border-zinc-700"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
              }`}
            >
              <Store size={14} />
              <span>{isHindi ? "फार्म विक्रेता" : "Farm Seller"}</span>
            </button>
          </div>

          {role === "seller" && (
            <div className="mb-5 p-3.5 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-xs font-sans text-zinc-700 dark:text-zinc-300 leading-relaxed flex items-start gap-2.5">
              <Sparkles size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <span>
                {isHindi
                  ? "विक्रेता आवेदनों की 24-48 घंटों के भीतर समीक्षा की जाती है। स्वीकृत होने के बाद आप बकरियां सूचीबद्ध कर सकते हैं।"
                  : "Seller applications are reviewed within 24-48 hours. Once approved, you can publish listings and receive orders."}
              </span>
            </div>
          )}

          {role === "customer" && (
            <>
              {/* Google Sign-Up Button (Buyer/Customer only) */}
              <button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={loading || googleLoading}
                className="w-full py-3.5 px-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-100 font-bold font-sans text-sm flex items-center justify-center gap-3 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed mb-2"
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
                    <span>{isHindi ? "Google के साथ साइन अप करें" : "Sign up with Google"}</span>
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="relative my-5 flex items-center justify-center">
                <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
                <span className="absolute bg-white dark:bg-zinc-900 px-3 text-xs uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-sans font-semibold">
                  {isHindi ? "या विवरण भरें" : "or fill with email"}
                </span>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 font-sans mb-1 block">
                {t.fullName} *
              </label>
              <input
                placeholder={isHindi ? "उदा. राजेश शर्मा" : "e.g. Rajesh Sharma"}
                value={form.name}
                onChange={f("name")}
                className={inp}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 font-sans mb-1 block">
                {t.emailAddress} *
              </label>
              <input
                type="email"
                placeholder="rajesh@example.com"
                value={form.email}
                onChange={f("email")}
                className={inp}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 font-sans mb-1 block">
                {t.phone}
              </label>
              <input
                placeholder={isHindi ? "10-अंकीय मोबाइल नंबर" : "10-digit mobile number"}
                value={form.phone}
                onChange={f("phone")}
                className={inp}
              />
            </div>

            {role === "seller" && (
              <>
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 font-sans mb-1 block">
                    {isHindi ? "फार्म / व्यापार का नाम *" : "Farm / Business Name *"}
                  </label>
                  <input
                    placeholder={isHindi ? "उदा. रॉयल गोट फार्म्स" : "e.g. Royal Goat Farms"}
                    value={form.farmName}
                    onChange={f("farmName")}
                    className={inp}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 font-sans mb-1 block">
                    {t.farmLocation} *
                  </label>
                  <input
                    placeholder={isHindi ? "उदा. जयपुर, राजस्थान" : "e.g. Jaipur, Rajasthan"}
                    value={form.farmLocation}
                    onChange={f("farmLocation")}
                    className={inp}
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 font-sans mb-1 block">
                {isHindi ? "पासवर्ड *" : "Password *"}
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  placeholder={isHindi ? "न्यूनतम 6 अक्षर" : "Minimum 6 characters"}
                  value={form.password}
                  onChange={f("password")}
                  className={`${inp} pr-11`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
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
                  {isHindi ? "खाता बन रहा है..." : "Creating Account..."}
                </>
              ) : (
                <>
                  <span>
                    {role === "seller"
                      ? isHindi
                        ? "विक्रेता आवेदन जमा करें"
                        : "Submit Seller Application"
                      : isHindi
                      ? "खाता बनाएं"
                      : "Create Account"}
                  </span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <div className="text-center mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800 text-xs sm:text-sm font-sans text-zinc-600 dark:text-zinc-400">
            {isHindi ? "पहले से खाता है?" : "Already have an account?"}{" "}
            <Link href="/login" className="text-zinc-950 dark:text-white font-bold hover:underline">
              {t.login}
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
