"use client";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, Check, Languages, Bell, Shield, FileText, Lock, LogOut, Sun, Moon } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useTheme } from "@/context/ThemeContext";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { lang, setLang, t, isHindi } = useTranslation();
  const { theme, setTheme, isDark } = useTheme();

  const handleLangChange = (newLang: "en" | "hi") => {
    setLang(newLang);
    toast.success(newLang === "hi" ? "भाषा बदलकर हिन्दी कर दी गई है" : "Language changed to English");
  };

  const handleThemeChange = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    toast.success(newTheme === "dark" ? (isHindi ? "डार्क मोड चालू किया गया" : "Dark Mode Activated") : (isHindi ? "लाइट मोड चालू किया गया" : "Light Mode Activated"));
  };

  return (
    <div className="w-full max-w-[560px] mx-auto px-3 sm:px-4 py-6 sm:py-8 overflow-x-hidden">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/"
          className="w-10 h-10 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:border-zinc-950 dark:hover:border-zinc-100 transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <h1 className="flex-1 text-center text-xl font-bold font-serif text-zinc-950 dark:text-white">{t.settingsTitle}</h1>
        <div className="w-10" />
      </div>

      <div className="space-y-5">
        {/* Theme Preference Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
              {isDark ? <Moon size={20} /> : <Sun size={20} />}
            </div>
            <div>
              <h2 className="text-base font-bold font-serif text-zinc-950 dark:text-white">
                {isHindi ? "थीम प्राथमिकता (Theme)" : "Appearance Theme"}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans">
                {isHindi ? "लाइट या डार्क मोड चुनें" : "Select light or dark mode"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            {/* Light Mode Option */}
            <button
              type="button"
              onClick={() => handleThemeChange("light")}
              className={`p-4 rounded-2xl border-2 text-left transition-all relative ${
                theme === "light"
                  ? "border-zinc-950 bg-zinc-50 dark:border-white shadow-sm"
                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 bg-white dark:bg-zinc-900"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Sun size={20} className="text-amber-500" />
                {theme === "light" && (
                  <span className="w-5 h-5 rounded-full bg-zinc-950 text-white flex items-center justify-center text-xs">
                    <Check size={12} />
                  </span>
                )}
              </div>
              <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100 font-sans">
                {isHindi ? "लाइट मोड" : "Light Mode"}
              </div>
              <div className="text-[11px] text-zinc-500 font-sans mt-0.5">Classic crisp daylight</div>
            </button>

            {/* Dark Mode Option */}
            <button
              type="button"
              onClick={() => handleThemeChange("dark")}
              className={`p-4 rounded-2xl border-2 text-left transition-all relative ${
                theme === "dark"
                  ? "border-zinc-950 dark:border-white bg-zinc-50 dark:bg-zinc-800 shadow-sm"
                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 bg-white dark:bg-zinc-900"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Moon size={20} className="text-zinc-300" />
                {theme === "dark" && (
                  <span className="w-5 h-5 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center text-xs">
                    <Check size={12} />
                  </span>
                )}
              </div>
              <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100 font-sans">
                {isHindi ? "डार्क मोड" : "Dark Mode"}
              </div>
              <div className="text-[11px] text-zinc-500 font-sans mt-0.5">Luxury deep contrast</div>
            </button>
          </div>
        </div>

        {/* Language Selection Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
              <Languages size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold font-serif text-zinc-950 dark:text-white">{t.languagePreference}</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans">{t.chooseLanguage}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            {/* English Option */}
            <button
              type="button"
              onClick={() => handleLangChange("en")}
              className={`p-4 rounded-2xl border-2 text-left transition-all relative ${
                lang === "en"
                  ? "border-zinc-950 dark:border-white bg-zinc-50 dark:bg-zinc-800 shadow-sm"
                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 bg-white dark:bg-zinc-900"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-lg">🇬🇧</span>
                {lang === "en" && (
                  <span className="w-5 h-5 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center text-xs">
                    <Check size={12} />
                  </span>
                )}
              </div>
              <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100 font-sans">English</div>
              <div className="text-[11px] text-zinc-500 font-sans mt-0.5">Default interface</div>
              {lang === "en" && (
                <span className="mt-2 inline-block px-2 py-0.5 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-[10px] font-bold font-sans">
                  {t.activeLanguage}
                </span>
              )}
            </button>

            {/* Hindi Option */}
            <button
              type="button"
              onClick={() => handleLangChange("hi")}
              className={`p-4 rounded-2xl border-2 text-left transition-all relative ${
                lang === "hi"
                  ? "border-zinc-950 dark:border-white bg-zinc-50 dark:bg-zinc-800 shadow-sm"
                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 bg-white dark:bg-zinc-900"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-lg">🇮🇳</span>
                {lang === "hi" && (
                  <span className="w-5 h-5 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center text-xs">
                    <Check size={12} />
                  </span>
                )}
              </div>
              <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100 font-sans">हिन्दी</div>
              <div className="text-[11px] text-zinc-500 font-sans mt-0.5">पूर्ण भारतीय अनुवाद</div>
              {lang === "hi" && (
                <span className="mt-2 inline-block px-2 py-0.5 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-[10px] font-bold font-sans">
                  {t.activeLanguage}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Notifications & System Preferences */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <Bell size={18} className="text-zinc-400" />
              <div>
                <div className="text-sm font-bold text-zinc-800 dark:text-zinc-200 font-sans">{t.notifications}</div>
                <div className="text-xs text-zinc-400 font-sans">{t.notificationsStatus}</div>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-sans bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
              {isHindi ? "सक्रिय" : "Active"}
            </span>
          </div>

          <Link
            href="/profile"
            className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800 hover:text-zinc-950 dark:hover:text-white transition-colors"
          >
            <div className="flex items-center gap-3">
              <Lock size={18} className="text-zinc-400" />
              <div>
                <div className="text-sm font-bold text-zinc-800 dark:text-zinc-200 font-sans">{t.accountSecurity}</div>
                <div className="text-xs text-zinc-400 font-sans">{t.changePassword}</div>
              </div>
            </div>
            <span className="text-xs text-zinc-400 font-bold font-sans">→</span>
          </Link>

          <Link
            href="/terms"
            className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800 hover:text-zinc-950 dark:hover:text-white transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText size={18} className="text-zinc-400" />
              <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 font-sans">{t.termsOfService}</div>
            </div>
            <span className="text-xs text-zinc-400 font-sans">→</span>
          </Link>

          <Link
            href="/privacy"
            className="flex items-center justify-between py-2 hover:text-zinc-950 dark:hover:text-white transition-colors"
          >
            <div className="flex items-center gap-3">
              <Shield size={18} className="text-zinc-400" />
              <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 font-sans">{t.privacyPolicy}</div>
            </div>
            <span className="text-xs text-zinc-400 font-sans">→</span>
          </Link>
        </div>

        {/* Logout Button */}
        {session && (
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full py-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 font-bold font-sans text-sm flex items-center justify-center gap-2 hover:bg-red-100 dark:hover:bg-red-950/60 transition-colors shadow-xs"
          >
            <LogOut size={16} /> {t.logout}
          </button>
        )}
      </div>
    </div>
  );
}
