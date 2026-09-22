"use client";
import Link from "next/link";
import { ShieldCheck, ArrowUpRight } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import Logo from "@/components/ui/Logo";

export default function Footer() {
  const { t, translateBreed } = useTranslation();

  return (
    <footer className="w-full max-w-full overflow-hidden bg-[#120e09] text-zinc-400 border-t border-[#261c12]">
      {/* Top Banner */}
      <div className="border-b border-[#261c12] py-6 sm:py-8 px-4 sm:px-6 w-full">
        <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex items-center gap-3">
            <Logo size="sm" showTagline={false} inverted={true} />
            <div className="text-left border-l border-[#3a2c1d] pl-3">
              <div className="text-white font-serif font-bold text-base leading-tight">{t.footerAbout}</div>
              <div className="text-xs text-[#d4b272] font-sans mt-0.5">{t.footerAboutSub}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/contact"
              className="text-xs font-bold text-white bg-white/10 px-4 py-2 rounded-full border border-white/15 hover:bg-white/20 transition-colors flex items-center gap-1.5 font-sans"
            >
              ✉️ {t.footerContactSupport}
            </Link>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Col 1: About & Mission */}
          <div className="col-span-2 space-y-4">
            <Logo size="md" showTagline={true} inverted={true} />
            <p className="text-xs sm:text-sm text-zinc-400 font-sans leading-relaxed max-w-sm pt-2">
              {t.footerStory}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-sans font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-400" /> {t.footerEscrowBadge}
              </span>
            </div>
          </div>

          {/* Col 2: Top Breeds */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#d4b272] font-sans mb-4">
              {t.footerColBreeds}
            </h4>
            <ul className="space-y-2.5 text-xs font-sans">
              {["Jamunapari", "Beetal", "Sirohi", "Barbari", "Black Bengal", "Osmanabadi", "Sojat"].map((b) => (
                <li key={b}>
                  <Link href={`/shop?breed=${b}`} className="hover:text-white transition-colors flex items-center gap-1">
                    <span>{translateBreed(b)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Customer Care */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#d4b272] font-sans mb-4">
              {t.footerColCare}
            </h4>
            <ul className="space-y-2.5 text-xs font-sans">
              <li>
                <Link href="/orders" className="hover:text-white transition-colors">
                  {t.footerTrackOrder}
                </Link>
              </li>
              <li>
                <Link href="/seller-landing" className="hover:text-white transition-colors flex items-center gap-1">
                  {t.footerSellGoats} <ArrowUpRight size={11} />
                </Link>
              </li>
              <li>
                <Link href="/chat" className="hover:text-white transition-colors">
                  {t.footerLiveChat}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  {t.footerContactSupport}
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  {t.footerHowEscrowWorks}
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Trust & Policies */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#d4b272] font-sans mb-4">
              {t.footerColTrust}
            </h4>
            <ul className="space-y-2.5 text-xs font-sans">
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  {t.footerTerms}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  {t.footerPrivacy}
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  {t.footerVetStandards}
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  {t.footerTransportPolicy}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Payment Partners & Badges */}
        <div className="mt-12 pt-8 border-t border-[#261c12] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans">
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap text-zinc-400">
            <span>🔒 {t.footerSecurePayments}</span>
            <span className="px-2.5 py-1 rounded bg-[#1c160e] text-zinc-300 font-semibold border border-white/10">
              UPI (GPay / PhonePe / Paytm)
            </span>
            <span className="px-2.5 py-1 rounded bg-[#1c160e] text-zinc-300 font-semibold border border-white/10">
              Debit / Credit Cards
            </span>
            <span className="px-2.5 py-1 rounded bg-[#1c160e] text-zinc-300 font-semibold border border-white/10">
              Razorpay Secure Gateway
            </span>
          </div>

          <div className="text-zinc-500 text-center sm:text-right">
            © {new Date().getFullYear()} GoatMart Inc. {t.footerRights}
          </div>
        </div>
      </div>
    </footer>
  );
}

