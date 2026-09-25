"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Clock,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  LogOut,
  Store,
  Mail,
  Phone,
  Calendar,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Sun,
  Moon,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useTheme } from "@/context/ThemeContext";
import Link from "next/link";

interface SellerPendingApprovalProps {
  user: {
    name: string;
    email: string;
    phone?: string;
    farmName?: string;
    status: "pending" | "suspended";
    joinedAt?: Date | string;
  };
}

export default function SellerPendingApproval({ user }: SellerPendingApprovalProps) {
  const router = useRouter();
  const { isHindi } = useTranslation();
  const { theme, toggleTheme, isDark } = useTheme();
  const [checking, setChecking] = useState(false);

  const checkApprovalStatus = async () => {
    setChecking(true);
    try {
      const { data } = await axios.get("/api/user/profile");
      if (data.success && data.data) {
        const status = data.data.sellerProfile?.status;
        if (status === "approved") {
          toast.success(
            isHindi
              ? "🎉 बधाई हो! आपका सेलर खाता एडमिन द्वारा स्वीकृत कर दिया गया है।"
              : "🎉 Congratulations! Your seller account has been approved by admin."
          );
          setTimeout(() => {
            window.location.reload();
          }, 1000);
          return;
        } else if (status === "suspended") {
          toast.error(
            isHindi
              ? "आपका खाता निलंबित (Suspended) है। कृपया सहायता से संपर्क करें।"
              : "Your account is currently suspended. Please contact support."
          );
        } else {
          toast(
            isHindi
              ? "⏳ आपकी प्रोफ़ाइल अभी भी एडमिन समीक्षा में है। कृपया प्रतीक्षा करें।"
              : "⏳ Your profile is still pending admin review. Please check back shortly.",
            { icon: "⏳" }
          );
        }
      }
    } catch {
      toast.error(isHindi ? "स्थिति जांचने में विफल" : "Failed to check status");
    } finally {
      setChecking(false);
    }
  };

  const isSuspended = user.status === "suspended";

  return (
    <div className="seller-dashboard min-h-screen bg-[#0d0d0d] text-zinc-100 flex flex-col justify-between p-4 sm:p-6 md:p-8 relative overflow-hidden font-sans">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#c8a96e]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-10 right-10 w-72 h-72 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Top Header */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between z-10 py-2">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="text-2xl">🐐</span>
          <span className="font-serif font-bold text-xl text-white tracking-wide">
            Goat<span className="text-[#c8a96e]">Mart</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-8 h-8 rounded-full border border-zinc-700 bg-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white transition-all shadow-xs"
            title={
              isDark
                ? isHindi
                  ? "लाइट मोड पर स्विच करें"
                  : "Switch to Light Mode"
                : isHindi
                ? "डार्क मोड पर स्विच करें"
                : "Switch to Dark Mode"
            }
            aria-label="Toggle Dark/Light Mode"
          >
            {isDark ? (
              <Sun size={14} className="text-amber-400" />
            ) : (
              <Moon size={14} className="text-zinc-400" />
            )}
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-semibold transition-colors"
          >
            <LogOut size={13} />
            <span>{isHindi ? "लॉगआउट" : "Sign Out"}</span>
          </button>
        </div>
      </header>

      {/* Main Content Card */}
      <main className="max-w-xl w-full mx-auto my-8 z-10">
        <div className="rounded-3xl border border-zinc-800 bg-[#161616]/95 backdrop-blur-xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Top Status Icon */}
          <div className="flex flex-col items-center text-center mb-6">
            <div
              className={`w-20 h-20 rounded-3xl flex items-center justify-center text-3xl mb-4 relative shadow-lg ${
                isSuspended
                  ? "bg-red-950/60 border border-red-800/60 text-red-400"
                  : "bg-amber-950/40 border border-amber-500/40 text-amber-400"
              }`}
            >
              {isSuspended ? (
                <ShieldAlert size={36} className="text-red-400" />
              ) : (
                <Clock size={36} className="text-amber-400 animate-pulse" />
              )}
            </div>

            <span
              className={`text-xs font-bold px-3.5 py-1 rounded-full uppercase tracking-wider mb-2.5 border ${
                isSuspended
                  ? "bg-red-950/80 text-red-400 border-red-800/80"
                  : "bg-amber-950/80 text-amber-300 border-amber-600/40"
              }`}
            >
              {isSuspended
                ? isHindi
                  ? "खाता निलंबित (Suspended)"
                  : "Account Suspended"
                : isHindi
                ? "⏳ एडमिन स्वीकृति लंबित (Pending for Admin Approval)"
                : "⏳ Pending for Admin Approval"}
            </span>

            <h1 className="text-2xl sm:text-3xl font-bold font-serif text-white tracking-tight mb-2">
              {isSuspended
                ? isHindi
                  ? "विक्रेता खाता निलंबित है"
                  : "Seller Account Suspended"
                : isHindi
                ? "एडमिन अनुमोदन प्रक्रिया जारी है"
                : "Application Under Review"}
            </h1>

            <p className="text-xs sm:text-sm text-zinc-400 max-w-md leading-relaxed">
              {isSuspended
                ? isHindi
                  ? "आपका विक्रेता खाता नीति उल्लंघन या सुरक्षा कारणों से निलंबित कर दिया गया है। अधिक जानकारी के लिए एडमिन टीम से संपर्क करें।"
                  : "Your seller access has been temporarily suspended. Please contact GoatMart support for assistance."
                : isHindi
                ? "आपका सेलर रजिस्ट्रेशन सफलतापूर्वक प्राप्त हो गया है। GoatMart एडमिन टीम द्वारा फार्म विवरण का सत्यापन होने तक सेलर डैशबोर्ड लॉक रहेगा।"
                : "Your seller application has been submitted and is waiting for GoatMart Admin approval. Once approved, your seller portal will unlock immediately."}
            </p>
          </div>

          {/* Verification Timeline Steps */}
          <div className="mb-6 p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 space-y-3.5">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold border border-emerald-500/40">
                ✓
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-zinc-200">
                  {isHindi ? "1. पंजीकरण फॉर्म सबमिट हुआ" : "1. Seller Registration Submitted"}
                </div>
                <div className="text-[11px] text-zinc-500">
                  {isHindi ? "खाता और फार्म विवरण सफलतापूर्वक दर्ज हुआ" : "Profile created successfully"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs font-bold border border-amber-500/40 animate-pulse">
                ⏳
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-amber-300">
                  {isHindi ? "2. एडमिन द्वारा सत्यापन (वर्तमान चरण)" : "2. Admin Document Verification (Current Step)"}
                </div>
                <div className="text-[11px] text-zinc-400">
                  {isHindi ? "सत्यापन आमतौर पर 2 से 24 घंटों में पूरा हो जाता है" : "Usually verified within 2 to 24 hours"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 opacity-60">
              <div className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-500 flex items-center justify-center text-xs font-bold border border-zinc-700">
                3
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-zinc-400">
                  {isHindi ? "3. सेलर डैशबोर्ड सक्रियण" : "3. Seller Dashboard Activation"}
                </div>
                <div className="text-[11px] text-zinc-500">
                  {isHindi ? "बकरियां लिस्ट करें, ऑर्डर्स प्रबंधित करें व चैट प्राप्त करें" : "List goats, manage sales & orders"}
                </div>
              </div>
            </div>
          </div>

          {/* Registered Details Summary */}
          <div className="mb-6 p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5 font-sans">
              <Store size={13} className="text-[#c8a96e]" />
              <span>{isHindi ? "पंजीकृत विवरण" : "Submitted Profile Summary"}</span>
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs font-sans">
              <div>
                <span className="text-zinc-500 block text-[11px]">{isHindi ? "फार्म का नाम" : "Farm Name"}</span>
                <span className="font-bold text-zinc-200 truncate block">
                  {user.farmName || `${user.name}'s Farm`}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[11px]">{isHindi ? "विक्रेता" : "Seller Name"}</span>
                <span className="font-bold text-zinc-200 truncate block">{user.name}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[11px]">{isHindi ? "ईमेल" : "Email"}</span>
                <span className="font-medium text-zinc-300 truncate block">{user.email}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[11px]">{isHindi ? "मोबाइल" : "Phone"}</span>
                <span className="font-medium text-zinc-300 truncate block">{user.phone || "—"}</span>
              </div>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="space-y-2.5">
            <button
              onClick={checkApprovalStatus}
              disabled={checking}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] hover:from-[#d4b57a] hover:to-[#966730] text-black font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#c8a96e]/20 transition-all hover:scale-[1.01]"
            >
              <RefreshCw size={16} className={checking ? "animate-spin" : ""} />
              <span>
                {checking
                  ? isHindi
                    ? "स्थिति जांची जा रही है..."
                    : "Checking Status..."
                  : isHindi
                  ? "स्वीकृति स्थिति जांचें / रीफ्रेश करें 🔄"
                  : "Check Approval Status 🔄"}
              </span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/shop"
                className="py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold text-center flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>{isHindi ? "मार्केटप्लेस देखें" : "Browse Market"}</span>
                <ArrowRight size={13} />
              </Link>
              <Link
                href="/contact"
                className="py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold text-center flex items-center justify-center gap-1.5 transition-colors"
              >
                <Mail size={13} />
                <span>{isHindi ? "एडमिन सहायता" : "Contact Admin"}</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl w-full mx-auto text-center z-10 text-xs text-zinc-600 font-sans py-2">
        © {new Date().getFullYear()} GoatMart Livestock Platform. All rights reserved.
      </footer>
    </div>
  );
}
