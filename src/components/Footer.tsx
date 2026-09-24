"use client";

import Link from "next/link";
import { ShieldCheck, ArrowUpRight, Headphones } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import Logo from "@/components/ui/Logo";

export default function Footer() {
  const { t, translateBreed, isHindi } = useTranslation();

  return (
    <footer className="w-full max-w-full overflow-hidden bg-[#232f3e] text-zinc-300 border-t border-[#37475a]">
      {/* Top Bar (#37475a Amazon Support Bar) */}
      <div className="bg-[#37475a] py-3.5 sm:py-4 px-3 sm:px-6 w-full border-b border-[#232f3e]">
        <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <Logo size="sm" showTagline={false} inverted={true} />
            <div className="text-left border-l border-zinc-500 pl-3">
              <div className="text-white font-serif font-bold text-sm leading-tight">
                {t.footerAbout}
              </div>
              <div className="text-[11px] text-[#febd69] font-sans">
                {t.footerAboutSub}
              </div>
            </div>
          </div>

          <Link
            href="/contact"
            className="text-xs font-bold text-zinc-950 bg-[#febd69] hover:bg-[#f3a847] px-4 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 font-sans shadow-xs"
          >
            <Headphones size={13} className="text-zinc-950" />
            <span>{t.footerContactSupport}</span>
          </Link>
        </div>
      </div>

      {/* Main Links Container (#232f3e) */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {/* Col 1: About & Trust */}
          <div className="col-span-2 sm:col-span-2 md:col-span-1 space-y-2.5">
            <Logo size="sm" showTagline={true} inverted={true} />
            <p className="text-xs text-zinc-300 font-sans leading-relaxed pt-1">
              {t.footerStory}
            </p>
            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-sans font-semibold bg-[#131921] text-[#febd69] border border-zinc-700">
                <ShieldCheck size={12} className="text-[#febd69]" />
                <span>{t.footerEscrowBadge}</span>
              </span>
            </div>
          </div>

          {/* Col 2: Top Breeds */}
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white font-sans mb-3 tracking-wide">
              {t.footerColBreeds}
            </h4>
            <ul className="space-y-2 text-xs font-sans">
              {["Jamunapari", "Beetal", "Sirohi", "Barbari", "Black Bengal", "Sojat"].map((b) => (
                <li key={b}>
                  <Link
                    href={`/shop?breed=${b}`}
                    className="text-zinc-300 hover:text-[#febd69] hover:underline transition-colors"
                  >
                    {translateBreed(b)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Quick Links */}
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white font-sans mb-3 tracking-wide">
              {t.footerColCare}
            </h4>
            <ul className="space-y-2 text-xs font-sans">
              <li>
                <Link href="/shop" className="text-zinc-300 hover:text-[#febd69] hover:underline transition-colors">
                  {t.navShop}
                </Link>
              </li>
              <li>
                <Link href="/orders" className="text-zinc-300 hover:text-[#febd69] hover:underline transition-colors">
                  {t.footerTrackOrder}
                </Link>
              </li>
              <li>
                <Link
                  href="/seller-landing"
                  className="text-zinc-300 hover:text-[#febd69] hover:underline transition-colors inline-flex items-center gap-1"
                >
                  <span>{t.footerSellGoats}</span>
                  <ArrowUpRight size={11} />
                </Link>
              </li>
              <li>
                <Link href="/chat" className="text-zinc-300 hover:text-[#febd69] hover:underline transition-colors">
                  {t.footerLiveChat}
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Trust & Policies */}
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white font-sans mb-3 tracking-wide">
              {t.footerColTrust}
            </h4>
            <ul className="space-y-2 text-xs font-sans">
              <li>
                <Link href="/terms" className="text-zinc-300 hover:text-[#febd69] hover:underline transition-colors">
                  {t.footerTerms}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-zinc-300 hover:text-[#febd69] hover:underline transition-colors">
                  {t.footerPrivacy}
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-zinc-300 hover:text-[#febd69] hover:underline transition-colors">
                  {t.footerVetStandards}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Copyright Bar (#131921 Amazon Dark Bottom Strip) */}
      <div className="bg-[#131921] py-4 px-4 border-t border-[#1a232f] flex items-center justify-center text-center text-xs font-sans text-zinc-400">
        © {new Date().getFullYear()} GoatMart Inc. {isHindi ? "सर्वाधिकार सुरक्षित।" : "All rights reserved."}
      </div>
    </footer>
  );
}
