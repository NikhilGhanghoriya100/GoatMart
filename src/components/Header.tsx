"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Menu,
  X,
  Heart,
  ChevronDown,
  User,
  Package,
  MessageSquare,
  Settings,
  LogOut,
  Shield,
  ShieldCheck,
  Store,
  Sparkles,
  Sun,
  Moon,
  Languages,
} from "lucide-react";
import SearchBar from "@/components/SearchBar";
import Logo from "@/components/ui/Logo";
import { useStore } from "@/store/useStore";
import { useTranslation } from "@/hooks/useTranslation";
import { useTheme } from "@/context/ThemeContext";

function AccountDropdown({ onClose }: { onClose: () => void }) {
  const { data: session } = useSession();
  const router = useRouter();
  const { wishlist } = useStore();
  const { t, isHindi } = useTranslation();

  const items = session
    ? [
        { icon: User, label: t.navProfile, href: "/profile" },
        { icon: Package, label: t.navOrders, href: "/orders" },
        { icon: Heart, label: `${t.navWishlist} ${wishlist.length > 0 ? `(${wishlist.length})` : ""}`, href: "/wishlist" },
        { icon: MessageSquare, label: t.navChats, href: "/chat" },
        ...(session.user.role === "seller"
          ? [{ icon: Store, label: t.navSellerDash, href: "/seller", highlight: true }]
          : []),
        ...(session.user.role === "admin"
          ? [{ icon: Shield, label: t.navAdminDash, href: "/admin", highlight: true }]
          : []),
        { icon: Settings, label: t.navSettings, href: "/settings" },
      ]
    : [];

  return (
    <div className="absolute right-0 top-[calc(100%+10px)] w-64 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 overflow-hidden animate-scaleUp">
      {session ? (
        <>
          <div className="px-5 py-4 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center text-sm font-bold shadow-sm">
                {session.user.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate leading-tight">
                  {session.user.name}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans truncate mt-0.5">
                  {session.user.email}
                </p>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold font-sans mt-1.5 inline-block uppercase tracking-wider">
                  {session.user.role === "admin"
                    ? (isHindi ? "🛡️ व्यवस्थापक" : "🛡️ Administrator")
                    : session.user.role === "seller"
                    ? (isHindi ? "🏪 विक्रेता" : "🏪 Seller")
                    : (isHindi ? "🛒 ग्राहक" : "🛒 Customer")}
                </span>
              </div>
            </div>
          </div>

          <div className="py-1">
            {items.map((item) => (
              <button
                key={item.href}
                onClick={() => {
                  router.push(item.href);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-sans text-left transition-colors border-b border-zinc-100 dark:border-zinc-800/40 last:border-0 ${
                  (item as any).highlight
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold"
                    : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                }`}
              >
                <item.icon size={15} className={(item as any).highlight ? "text-zinc-900 dark:text-white" : "text-zinc-400"} />
                <span className="flex-1">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="p-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20">
            <button
              onClick={() => {
                signOut({ callbackUrl: "/" });
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-sans text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors font-semibold"
            >
              <LogOut size={13} /> {t.logout}
            </button>
          </div>
        </>
      ) : (
        <div className="p-3 space-y-2">
          <button
            onClick={() => {
              router.push("/login");
              onClose();
            }}
            className="w-full py-2.5 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 text-xs font-bold font-sans text-center transition-colors shadow-sm"
          >
            {t.login}
          </button>
          <button
            onClick={() => {
              router.push("/register");
              onClose();
            }}
            className="w-full py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold font-sans text-zinc-700 dark:text-zinc-300 hover:border-zinc-900 dark:hover:border-zinc-200 text-center transition-colors"
          >
            {t.register}
          </button>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { wishlist } = useStore();
  const { lang, setLang, t, isHindi } = useTranslation();
  const { theme, toggleTheme, isDark } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 15);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const navLinks = [
    { href: "/", label: isHindi ? "होम" : "Home" },
    { href: "/shop", label: t.navShop },
    { href: "/orders", label: t.navTrackOrders },
    { href: "/seller-landing", label: t.navBecomeSeller },
    { href: "/about", label: t.navAbout },
  ];

  return (
    <>
      {/* Top Notice Bar */}
      <div className="w-full bg-zinc-950 dark:bg-black text-zinc-300 dark:text-zinc-400 text-[10px] sm:text-[11px] font-sans py-1.5 sm:py-2 px-3 sm:px-4 text-center border-b border-zinc-800 dark:border-zinc-900 flex items-center justify-center gap-2 sm:gap-3 overflow-hidden">
        <span className="flex items-center gap-1 sm:gap-1.5 font-medium leading-relaxed truncate">
          <Sparkles size={12} className="text-amber-400 flex-shrink-0" /> {t.topNotice}
        </span>
        <span className="hidden md:inline text-zinc-600">•</span>
        <span className="hidden md:inline text-xs text-zinc-100 font-bold tracking-wide">
          {t.topNoticeEscrow}
        </span>
      </div>

      {/* Main Glass Header */}
      <header
        className={`sticky top-0 z-[200] w-full transition-all duration-300 ${
          scrolled
            ? "bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md shadow-md border-b border-zinc-200 dark:border-zinc-800"
            : "bg-white/90 dark:bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-100 dark:border-zinc-800/80"
        }`}
      >
        <div className="max-w-[1280px] mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4 w-full">
          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:border-zinc-900 dark:hover:border-zinc-100 transition-colors flex-shrink-0"
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>

          {/* Premium Vector Brand Logo (Centered on mobile, left on desktop) */}
          <div className="flex-1 flex justify-center md:justify-start md:flex-initial">
            <Logo size="md" showTagline={true} />
          </div>

          {/* Desktop Search Bar */}
          <div className="hidden md:flex flex-1 max-w-xl mx-4">
            <SearchBar />
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
            {/* Theme Switcher Toggle (Light / Dark Mode) - Hidden on mobile, available in mobile menu */}
            <button
              type="button"
              onClick={toggleTheme}
              className="hidden md:flex w-10 h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all shadow-xs"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle Theme"
            >
              {isDark ? (
                <Sun size={17} className="text-amber-400 transition-transform rotate-0 hover:rotate-45" />
              ) : (
                <Moon size={17} className="text-zinc-700 transition-transform rotate-0 hover:-rotate-12" />
              )}
            </button>

            {/* Language Switcher Badge - Hidden on mobile, available in mobile menu */}
            <div className="hidden md:flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-full p-0.5 border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all font-sans ${
                  lang === "en"
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                }`}
                title="Switch to English"
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang("hi")}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all font-sans ${
                  lang === "hi"
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                }`}
                title="हिन्दी में बदलें"
              >
                हिन्दी
              </button>
            </div>

            {/* Wishlist Link - Hidden on mobile, available in mobile menu */}
            {session && (
              <Link
                href="/wishlist"
                className="hidden md:flex relative w-10 h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 items-center justify-center text-zinc-700 dark:text-zinc-300 hover:border-zinc-900 dark:hover:border-zinc-200 transition-colors"
                title={t.navWishlist}
              >
                <Heart size={18} className={wishlist.length > 0 ? "fill-red-500 text-red-500" : ""} />
                {wishlist.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[10px] font-black flex items-center justify-center shadow">
                    {wishlist.length}
                  </span>
                )}
              </Link>
            )}

            {/* Account / User Button */}
            <div ref={accountRef} className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen((o) => !o)}
                className={`w-9 h-9 sm:w-auto sm:h-10 flex items-center justify-center sm:px-3 gap-2 rounded-xl border transition-all ${
                  accountOpen
                    ? "border-zinc-900 bg-zinc-100 dark:border-zinc-100 dark:bg-zinc-800 shadow-sm"
                    : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-700"
                }`}
                aria-label="User Account"
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    session
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                      : "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {session ? session.user.name?.[0]?.toUpperCase() : <User size={13} />}
                </div>
                <span className="hidden sm:inline text-xs font-bold font-sans text-zinc-800 dark:text-zinc-200">
                  {session ? session.user.name?.split(" ")[0] : t.login}
                </span>
                <ChevronDown
                  size={14}
                  className={`hidden sm:inline text-zinc-400 transition-transform ${accountOpen ? "rotate-180" : ""}`}
                />
              </button>
              {accountOpen && <AccountDropdown onClose={() => setAccountOpen(false)} />}
            </div>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden px-4 pb-3">
          <SearchBar />
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:block border-t border-zinc-100 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/95">
          <div className="max-w-[1280px] mx-auto px-6 flex items-center justify-center gap-8">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`py-3 text-xs uppercase tracking-wider font-sans font-bold transition-all relative ${
                    active
                      ? "text-zinc-950 dark:text-white"
                      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                  }`}
                >
                  {link.label}
                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-950 dark:bg-white" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/70 z-[300] backdrop-blur-xs lg:hidden animate-fadeIn"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="fixed top-0 left-0 bottom-0 w-[85vw] max-w-xs bg-white dark:bg-zinc-950 z-[301] flex flex-col shadow-2xl lg:hidden animate-slideRight border-r border-zinc-200 dark:border-zinc-800">
            {/* Drawer Header with Logo */}
            <div className="flex items-center justify-between p-4 sm:p-5 bg-zinc-950 text-white dark:bg-black border-b border-zinc-800">
              <Logo size="sm" showTagline={false} inverted={true} />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
              >
                <X size={18} />
              </button>
            </div>

            {/* Language & Theme Switcher in Mobile Drawer */}
            <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
              {/* Language toggle */}
              <div className="flex items-center bg-white dark:bg-zinc-800 rounded-full p-0.5 border border-zinc-200 dark:border-zinc-700">
                <button
                  type="button"
                  onClick={() => setLang("en")}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all font-sans ${
                    lang === "en" ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950" : "text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLang("hi")}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all font-sans ${
                    lang === "hi" ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950" : "text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  हिन्दी
                </button>
              </div>

              {/* Theme toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-200 shadow-xs"
              >
                {isDark ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-zinc-700" />}
                <span>{isDark ? "Light" : "Dark"}</span>
              </button>
            </div>

            {session && (
              <div className="p-4 bg-white dark:bg-zinc-900/60 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center font-bold text-base shadow-sm">
                  {session.user.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">{session.user.name}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 font-sans truncate">{session.user.email}</div>
                  <span className="text-[10px] text-zinc-600 dark:text-zinc-400 font-bold font-sans uppercase">
                    {session.user.role}
                  </span>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Highlight Seller Card in Drawer */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#2a1e12] to-[#140e08] border border-[#d4b272]/40 text-white shadow-md">
                <div className="flex items-center gap-2 mb-1 text-xs font-bold text-[#d4b272]">
                  <Store size={15} />
                  <span>{isHindi ? "फार्म विक्रेता बनें" : "Become a Farm Seller"}</span>
                </div>
                <p className="text-[11px] text-white/70 font-sans mb-2.5 leading-relaxed">
                  {isHindi
                    ? "सीधे पूरे भारत के 12,000+ खरीदारों को बकरियां बेचें।"
                    : "List and sell certified goats directly across India."}
                </p>
                <Link
                  href="/seller-landing"
                  onClick={() => setDrawerOpen(false)}
                  className="block w-full py-2 rounded-xl bg-gradient-to-r from-[#d4b272] via-[#e6cf9b] to-[#d4b272] text-zinc-950 font-bold font-sans text-xs text-center shadow"
                >
                  {isHindi ? "विक्रेता पंजीकरण करें →" : "Join as Seller →"}
                </Link>
              </div>

              {/* Trust Guarantees in Mobile Menu */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-[11px] font-sans space-y-2">
                <div className="font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider text-[10px] text-zinc-400">
                  {isHindi ? "GoatMart सुरक्षा गारंटी" : "GoatMart Guarantees"}
                </div>
                <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                  <ShieldCheck size={14} className="text-[#d4b272] flex-shrink-0" />
                  <span>{isHindi ? "100% डॉक्टर प्रमाणित वंशावली" : "100% Veterinary Certified Lineage"}</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                  <span className="text-sm">🚚</span>
                  <span>{isHindi ? "अखिल भारतीय सुरक्षित पशु परिवहन" : "Pan-India Climate-Safe Transport"}</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                  <span className="text-sm">🔒</span>
                  <span>{isHindi ? "100% सुरक्षित भुगतान सुरक्षा" : "Direct Buyer Protection & Escrow"}</span>
                </div>
              </div>

              <div className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-3 py-1 font-sans">
                {isHindi ? "मार्केटप्लेस" : "Marketplace"}
              </div>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-sans transition-colors ${
                    pathname === link.href
                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-white font-bold"
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              <div className="pt-3 pb-1 border-t border-zinc-100 dark:border-zinc-800 my-2">
                <div className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-3 py-1 font-sans">
                  {isHindi ? "खाता और गतिविधियाँ" : "Account & Activities"}
                </div>
                {session ? (
                  <>
                    <Link
                      href="/profile"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-sans text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                    >
                      <User size={16} className="text-zinc-400" /> {t.navProfile}
                    </Link>
                    <Link
                      href="/orders"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-sans text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                    >
                      <Package size={16} className="text-zinc-400" /> {t.navOrders}
                    </Link>
                    <Link
                      href="/wishlist"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-sans text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                    >
                      <Heart size={16} className="text-zinc-400" /> {t.navWishlist} ({wishlist.length})
                    </Link>
                    <Link
                      href="/chat"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-sans text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                    >
                      <MessageSquare size={16} className="text-zinc-400" /> {t.navChats}
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-sans text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                    >
                      <Settings size={16} className="text-zinc-400" /> {t.navSettings}
                    </Link>

                    {session.user.role === "seller" && (
                      <Link
                        href="/seller"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-sans bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-white font-bold"
                      >
                        <Store size={16} /> 🏪 {t.navSellerDash}
                      </Link>
                    )}

                    {session.user.role === "admin" && (
                      <Link
                        href="/admin"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-sans bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-white font-bold"
                      >
                        <Shield size={16} /> 🛡️ {t.navAdminDash}
                      </Link>
                    )}

                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-sans text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 w-full font-semibold mt-2"
                    >
                      <LogOut size={16} /> {t.logout}
                    </button>
                  </>
                ) : (
                  <div className="pt-2 space-y-2">
                    <Link
                      href="/wishlist"
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-sans text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 mb-2"
                    >
                      <div className="flex items-center gap-3">
                        <Heart size={16} className={wishlist.length > 0 ? "fill-red-500 text-red-500" : "text-zinc-400"} />
                        <span>{t.navWishlist}</span>
                      </div>
                      {wishlist.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-xs font-bold font-sans">
                          {wishlist.length}
                        </span>
                      )}
                    </Link>
                    <Link
                      href="/login"
                      className="block w-full py-3 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-center text-xs font-bold font-sans hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm"
                    >
                      {t.login}
                    </Link>
                    <Link
                      href="/register"
                      className="block w-full py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-center text-xs font-bold font-sans text-zinc-700 dark:text-zinc-300 hover:border-zinc-900 dark:hover:border-zinc-100 transition-colors"
                    >
                      {t.register}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
