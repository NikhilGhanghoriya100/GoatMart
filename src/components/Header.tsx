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
  Store,
  Sun,
  Moon,
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

  const userAvatar = session?.user?.avatar || (session?.user as any)?.image;

  const items = session
    ? [
        { icon: User, label: t.navProfile, href: "/profile" },
        { icon: Package, label: t.navOrders, href: "/orders" },
        {
          icon: Heart,
          label: `${t.navWishlist} ${
            wishlist.length > 0 ? `(${wishlist.length})` : ""
          }`,
          href: "/wishlist",
        },
        { icon: MessageSquare, label: t.navChats, href: "/chat" },
        ...(session.user.role === "seller"
          ? [
              {
                icon: Store,
                label: t.navSellerDash,
                href: "/seller",
                highlight: true,
              },
            ]
          : []),
        ...(session.user.role === "admin"
          ? [
              {
                icon: Shield,
                label: t.navAdminDash,
                href: "/admin",
                highlight: true,
              },
            ]
          : []),
        { icon: Settings, label: t.navSettings, href: "/settings" },
      ]
    : [];

  return (
    <div className="absolute right-0 top-[calc(100%+10px)] w-64 bg-[#1e2733] rounded-2xl border border-zinc-700 shadow-2xl z-50 overflow-hidden animate-scaleUp text-white">
      {session ? (
        <>
          <div className="px-5 py-4 bg-[#131921] border-b border-zinc-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#febd69] text-zinc-950 flex items-center justify-center text-sm font-black shadow-sm overflow-hidden flex-shrink-0">
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    alt={session.user.name || "User"}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  session.user.name?.[0]?.toUpperCase()
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate leading-tight">
                  {session.user.name}
                </p>

                <p className="text-xs text-zinc-300 font-sans truncate mt-0.5">
                  {session.user.email}
                </p>

                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-zinc-800 text-[#febd69] font-bold font-sans mt-1.5 inline-block uppercase tracking-wider border border-zinc-700">
                  {session.user.role === "admin"
                    ? isHindi
                      ? "🛡️ व्यवस्थापक"
                      : "🛡️ Administrator"
                    : session.user.role === "seller"
                    ? isHindi
                      ? "🏪 विक्रेता"
                      : "🏪 Seller"
                    : isHindi
                    ? "🛒 ग्राहक"
                    : "🛒 Customer"}
                </span>
              </div>
            </div>
          </div>

          <div className="py-1 bg-[#1e2733]">
            {items.map((item) => (
              <button
                key={item.href}
                onClick={() => {
                  router.push(item.href);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-sans text-left transition-colors border-b border-zinc-800/60 last:border-0 ${
                  (item as any).highlight
                    ? "bg-[#232f3e] text-[#febd69] font-bold"
                    : "text-zinc-200 hover:bg-[#2a3749] hover:text-white"
                }`}
              >
                <item.icon
                  size={15}
                  className={
                    (item as any).highlight
                      ? "text-[#febd69]"
                      : "text-zinc-400"
                  }
                />
                <span className="flex-1">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="p-2 border-t border-zinc-700 bg-[#131921]">
            <button
              onClick={() => {
                signOut({ callbackUrl: "/" });
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-sans text-red-400 hover:bg-red-950/40 transition-colors font-semibold"
            >
              <LogOut size={13} />
              {t.logout}
            </button>
          </div>
        </>
      ) : (
        <div className="p-3 space-y-2 bg-[#1e2733]">
          <button
            onClick={() => {
              router.push("/login");
              onClose();
            }}
            className="w-full py-2.5 rounded-xl bg-[#febd69] hover:bg-[#f3a847] text-zinc-950 text-xs font-bold font-sans text-center transition-colors shadow-sm"
          >
            {t.login}
          </button>

          <button
            onClick={() => {
              router.push("/register");
              onClose();
            }}
            className="w-full py-2.5 rounded-xl border border-zinc-600 text-xs font-bold font-sans text-white hover:border-[#febd69] hover:text-[#febd69] text-center transition-colors"
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
  const { toggleTheme, isDark } = useTheme();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const accountRef = useRef<HTMLDivElement>(null);
  const userAvatar = session?.user?.avatar || (session?.user as any)?.image;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        accountRef.current &&
        !accountRef.current.contains(e.target as Node)
      ) {
        setAccountOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const navLinks = [
    {
      href: "/",
      label: isHindi ? "होम" : "Home",
    },
    {
      href: "/shop",
      label: t.navShop,
    },
    {
      href: "/orders",
      label: t.navTrackOrders,
    },
    {
      href: "/seller-landing",
      label: t.navBecomeSeller,
    },
    {
      href: "/about",
      label: t.navAbout,
    },
  ];

  return (
    <>
      {/* =========================
          AMAZON THEMED FIXED HEADER WRAPPER
      ========================= */}
      <div className="fixed top-0 left-0 right-0 z-[200] w-full shadow-md">
        {/* =========================
            MAIN NAVBAR (#131921 Amazon Signature Dark)
        ========================= */}
        <header className="w-full bg-[#131921] text-white border-b border-[#232f3e]">
          <div className="max-w-[1280px] mx-auto px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4 w-full">
            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-lg border border-zinc-700 bg-[#232f3e] flex items-center justify-center text-white hover:border-[#febd69] transition-colors flex-shrink-0"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>

            {/* Logo */}
            <div className="flex-1 flex justify-center md:justify-start md:flex-initial">
              <Logo size="md" showTagline={true} inverted={true} />
            </div>

            {/* Desktop Search */}
            <div className="hidden md:flex flex-1 max-w-xl mx-4">
              <SearchBar />
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {/* Theme Toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                className="hidden md:flex w-9 h-9 sm:w-10 sm:h-10 rounded-lg border border-zinc-700 bg-[#232f3e] items-center justify-center text-zinc-200 hover:text-white hover:border-[#febd69] transition-all"
                title={
                  isDark
                    ? "Switch to Light Mode"
                    : "Switch to Dark Mode"
                }
                aria-label="Toggle Theme"
              >
                {isDark ? (
                  <Sun
                    size={16}
                    className="text-[#febd69] transition-transform rotate-0 hover:rotate-45"
                  />
                ) : (
                  <Moon
                    size={16}
                    className="text-zinc-300 transition-transform rotate-0 hover:-rotate-12"
                  />
                )}
              </button>

              {/* Language Switcher */}
              <div className="hidden md:flex items-center bg-[#232f3e] rounded-lg p-0.5 border border-zinc-700">
                <button
                  type="button"
                  onClick={() => setLang("en")}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all font-sans ${
                    lang === "en"
                      ? "bg-[#febd69] text-zinc-950 shadow-xs"
                      : "text-zinc-300 hover:text-white"
                  }`}
                  title="Switch to English"
                >
                  EN
                </button>

                <button
                  type="button"
                  onClick={() => setLang("hi")}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all font-sans ${
                    lang === "hi"
                      ? "bg-[#febd69] text-zinc-950 shadow-xs"
                      : "text-zinc-300 hover:text-white"
                  }`}
                  title="हिन्दी में बदलें"
                >
                  हिन्दी
                </button>
              </div>

              {/* Wishlist Link */}
              {session && (
                <Link
                  href="/wishlist"
                  className="hidden md:flex relative w-9 h-9 sm:w-10 sm:h-10 rounded-lg border border-zinc-700 bg-[#232f3e] items-center justify-center text-zinc-200 hover:text-white hover:border-[#febd69] transition-colors"
                  title={t.navWishlist}
                >
                  <Heart
                    size={17}
                    className={
                      wishlist.length > 0
                        ? "fill-[#febd69] text-[#febd69]"
                        : ""
                    }
                  />

                  {wishlist.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#febd69] text-zinc-950 text-[10px] font-black flex items-center justify-center shadow">
                      {wishlist.length}
                    </span>
                  )}
                </Link>
              )}

              {/* Account Dropdown */}
              <div
                ref={accountRef}
                className="relative"
              >
                <button
                  type="button"
                  onClick={() =>
                    setAccountOpen((o) => !o)
                  }
                  className={`w-9 h-9 sm:w-auto sm:h-10 flex items-center justify-center sm:px-3 gap-2 rounded-lg border transition-all ${
                    accountOpen
                      ? "border-[#febd69] bg-[#232f3e]"
                      : "border-zinc-700 bg-[#232f3e] hover:border-zinc-500"
                  }`}
                  aria-label="User Account"
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden flex-shrink-0 ${
                      session
                        ? "bg-[#febd69] text-zinc-950"
                        : "bg-zinc-700 text-zinc-200"
                    }`}
                  >
                    {userAvatar ? (
                      <img
                        src={userAvatar}
                        alt={session?.user?.name || "Profile"}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : session ? (
                      session.user.name?.[0]?.toUpperCase()
                    ) : (
                      <User size={14} />
                    )}
                  </div>

                  <div className="hidden sm:flex flex-col text-left leading-none">
                    <span className="text-[10px] text-zinc-400 font-sans">
                      {session ? "Hello," : "Hello, Sign In"}
                    </span>
                    <span className="text-xs font-bold font-sans text-white">
                      {session
                        ? session.user.name?.split(" ")[0]
                        : "Account"}
                    </span>
                  </div>

                  <ChevronDown
                    size={14}
                    className={`hidden sm:inline text-zinc-400 transition-transform ${
                      accountOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {accountOpen && (
                  <AccountDropdown
                    onClose={() =>
                      setAccountOpen(false)
                    }
                  />
                )}
              </div>
            </div>
          </div>

          {/* Mobile Search */}
          <div className="md:hidden px-3 pb-2.5">
            <SearchBar />
          </div>

          {/* Sub Navigation Bar (#232f3e Amazon Subnav) */}
          <nav className="hidden lg:block bg-[#232f3e] border-t border-zinc-800">
            <div className="max-w-[1280px] mx-auto px-6 flex items-center justify-center gap-6">
              {navLinks.map((link) => {
                const active = pathname === link.href;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`py-2 px-1 text-xs font-sans font-bold transition-all relative flex items-center gap-1 ${
                      active
                        ? "text-[#febd69]"
                        : "text-zinc-200 hover:text-[#febd69]"
                    }`}
                  >
                    {link.label}

                    {active && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#febd69]" />
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>
        </header>
      </div>

      {/* =========================
          HEADER SPACER
      ========================= */}
      <div className="h-[96px] md:h-[58px] lg:h-[94px]" />

      {/* =========================
          MOBILE DRAWER (Amazon Theme)
      ========================= */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/75 z-[300] backdrop-blur-xs lg:hidden animate-fadeIn"
            onClick={() => setDrawerOpen(false)}
          />

          <div className="fixed top-0 left-0 bottom-0 w-[85vw] max-w-xs bg-[#131921] text-white z-[301] flex flex-col shadow-2xl lg:hidden animate-slideRight border-r border-[#232f3e]">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 bg-[#232f3e] text-white border-b border-zinc-700">
              <Logo
                size="sm"
                showTagline={false}
                inverted={true}
              />

              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
              >
                <X size={18} />
              </button>
            </div>

            {/* Language & Theme */}
            <div className="p-3.5 bg-[#19222d] border-b border-zinc-800 flex items-center justify-between gap-2">
              <div className="flex items-center bg-[#232f3e] rounded-lg p-0.5 border border-zinc-700">
                <button
                  type="button"
                  onClick={() => setLang("en")}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all font-sans ${
                    lang === "en"
                      ? "bg-[#febd69] text-zinc-950"
                      : "text-zinc-300"
                  }`}
                >
                  EN
                </button>

                <button
                  type="button"
                  onClick={() => setLang("hi")}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all font-sans ${
                    lang === "hi"
                      ? "bg-[#febd69] text-zinc-950"
                      : "text-zinc-300"
                  }`}
                >
                  हिन्दी
                </button>
              </div>

              <button
                type="button"
                onClick={toggleTheme}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#232f3e] border border-zinc-700 text-xs font-bold text-white shadow-xs"
              >
                {isDark ? (
                  <Sun
                    size={14}
                    className="text-[#febd69]"
                  />
                ) : (
                  <Moon
                    size={14}
                    className="text-zinc-300"
                  />
                )}

                <span>
                  {isDark ? "Light" : "Dark"}
                </span>
              </button>
            </div>

            {/* Logged In User */}
            {session && (
              <div className="p-4 bg-[#19222d] border-b border-zinc-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#febd69] text-zinc-950 flex items-center justify-center font-bold text-base shadow-sm overflow-hidden flex-shrink-0">
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt={session.user.name || "User"}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    session.user.name?.[0]?.toUpperCase()
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-white truncate">
                    {session.user.name}
                  </div>

                  <div className="text-xs text-zinc-400 font-sans truncate">
                    {session.user.email}
                  </div>

                  <span className="text-[10px] text-[#febd69] font-bold font-sans uppercase">
                    {session.user.role}
                  </span>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Marketplace */}
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-3 py-1 font-sans">
                {isHindi ? "मार्केटप्लेस" : "Marketplace"}
              </div>

              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-sans transition-colors ${
                    pathname === link.href
                      ? "bg-[#232f3e] text-[#febd69] font-bold"
                      : "text-zinc-200 hover:bg-[#1f2a38]"
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              {/* Account */}
              <div className="pt-3 pb-1 border-t border-zinc-800 my-2">
                <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-3 py-1 font-sans">
                  {isHindi
                    ? "खाता और गतिविधियाँ"
                    : "Account & Activities"}
                </div>

                {session ? (
                  <>
                    <Link
                      href="/profile"
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-sans text-zinc-200 hover:bg-[#1f2a38]"
                    >
                      <User
                        size={16}
                        className="text-zinc-400"
                      />
                      {t.navProfile}
                    </Link>

                    <Link
                      href="/orders"
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-sans text-zinc-200 hover:bg-[#1f2a38]"
                    >
                      <Package
                        size={16}
                        className="text-zinc-400"
                      />
                      {t.navOrders}
                    </Link>

                    <Link
                      href="/wishlist"
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-sans text-zinc-200 hover:bg-[#1f2a38]"
                    >
                      <Heart
                        size={16}
                        className="text-zinc-400"
                      />
                      {t.navWishlist} ({wishlist.length})
                    </Link>

                    <Link
                      href="/chat"
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-sans text-zinc-200 hover:bg-[#1f2a38]"
                    >
                      <MessageSquare
                        size={16}
                        className="text-zinc-400"
                      />
                      {t.navChats}
                    </Link>

                    <Link
                      href="/settings"
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-sans text-zinc-200 hover:bg-[#1f2a38]"
                    >
                      <Settings
                        size={16}
                        className="text-zinc-400"
                      />
                      {t.navSettings}
                    </Link>

                    {session.user.role === "seller" && (
                      <Link
                        href="/seller"
                        onClick={() => setDrawerOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-sans bg-[#232f3e] text-[#febd69] font-bold"
                      >
                        <Store size={16} />
                        🏪 {t.navSellerDash}
                      </Link>
                    )}

                    {session.user.role === "admin" && (
                      <Link
                        href="/admin"
                        onClick={() => setDrawerOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-sans bg-[#232f3e] text-[#febd69] font-bold"
                      >
                        <Shield size={16} />
                        🛡️ {t.navAdminDash}
                      </Link>
                    )}

                    <button
                      onClick={() =>
                        signOut({
                          callbackUrl: "/",
                        })
                      }
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-sans text-red-400 hover:bg-red-950/30 w-full font-semibold mt-2"
                    >
                      <LogOut size={16} />
                      {t.logout}
                    </button>
                  </>
                ) : (
                  <div className="pt-2 space-y-2">
                    <Link
                      href="/wishlist"
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-sans text-zinc-200 hover:bg-[#1f2a38] border border-zinc-700 mb-2"
                    >
                      <div className="flex items-center gap-3">
                        <Heart
                          size={16}
                          className={
                            wishlist.length > 0
                              ? "fill-[#febd69] text-[#febd69]"
                              : "text-zinc-400"
                          }
                        />

                        <span>{t.navWishlist}</span>
                      </div>

                      {wishlist.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-[#febd69] text-zinc-950 text-xs font-bold font-sans">
                          {wishlist.length}
                        </span>
                      )}
                    </Link>

                    <Link
                      href="/login"
                      onClick={() => setDrawerOpen(false)}
                      className="block w-full py-3 rounded-xl bg-[#febd69] hover:bg-[#f3a847] text-zinc-950 text-center text-xs font-bold font-sans transition-colors shadow-sm"
                    >
                      {t.login}
                    </Link>

                    <Link
                      href="/register"
                      onClick={() => setDrawerOpen(false)}
                      className="block w-full py-3 rounded-xl border border-zinc-600 text-center text-xs font-bold font-sans text-white hover:border-[#febd69] hover:text-[#febd69] transition-colors"
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