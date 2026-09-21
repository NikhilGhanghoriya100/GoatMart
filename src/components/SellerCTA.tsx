"use client";
import Link from "next/link";
import { Store, TrendingUp, ShieldCheck, Truck, ArrowRight } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

export default function SellerCTA() {
  const { t } = useTranslation();

  const farmFeatures = [
    { t: t.sellerFeat1Title, d: t.sellerFeat1Desc, ic: "⚡" },
    { t: t.sellerFeat2Title, d: t.sellerFeat2Desc, ic: "🏦" },
    { t: t.sellerFeat3Title, d: t.sellerFeat3Desc, ic: "💬" },
    { t: t.sellerFeat4Title, d: t.sellerFeat4Desc, ic: "🇮🇳" },
  ];

  return (
    <section className="bg-transparent py-10 sm:py-16 px-4 sm:px-6 w-full max-w-full overflow-hidden">
      <div className="max-w-[1180px] mx-auto rounded-3xl bg-gradient-to-br from-[#1c160e] via-[#2a1e12] to-[#140e08] text-white p-6 sm:p-12 lg:p-16 relative overflow-hidden shadow-2xl border border-[#3d2c18] w-full">
        {/* Decorative Golden Orbs */}
        <div className="absolute top-0 right-0 w-60 sm:w-80 h-60 sm:h-80 rounded-full bg-[#c8a96e]/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 sm:w-80 h-60 sm:h-80 rounded-full bg-[#8b5e2a]/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-[#d4b272] text-xs font-semibold font-sans">
              <Store size={14} /> {t.sellerCtaBadge}
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-serif leading-tight">
              {t.sellerCtaTitle}
            </h2>
            <p className="text-white/70 text-sm sm:text-base font-sans leading-relaxed">
              {t.sellerCtaSub}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
              <div className="flex items-center gap-2 text-xs font-sans text-white/90">
                <TrendingUp size={16} className="text-[#d4b272]" /> {t.sellerMetric1}
              </div>
              <div className="flex items-center gap-2 text-xs font-sans text-white/90">
                <ShieldCheck size={16} className="text-[#5ec87e]" /> {t.sellerMetric2}
              </div>
              <div className="flex items-center gap-2 text-xs font-sans text-white/90">
                <Truck size={16} className="text-[#60a5fa]" /> {t.sellerMetric3}
              </div>
            </div>

            <div className="pt-4">
              <Link
                href="/seller-landing"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-bold font-sans text-black bg-gradient-to-r from-[#d4b272] via-[#e6cf9b] to-[#d4b272] hover:opacity-95 transition-all shadow-xl hover:scale-105"
              >
                <span>{t.sellerBtn}</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 grid grid-cols-2 gap-3">
            {farmFeatures.map((f) => (
              <div
                key={f.t}
                className="rounded-2xl p-4 bg-white/5 border border-white/10 backdrop-blur-md"
              >
                <div className="text-2xl mb-2">{f.ic}</div>
                <h4 className="text-sm font-bold font-serif text-white">{f.t}</h4>
                <p className="text-[11px] text-white/60 font-sans mt-0.5">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
