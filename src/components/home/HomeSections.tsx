"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

export function BreedExplorerHeader() {
  const { isHindi } = useTranslation();

  return (
    <div className="flex items-end justify-between gap-3 mb-4 sm:mb-6 pb-2 border-b border-zinc-200 dark:border-zinc-800">
      <div className="min-w-0">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-zinc-900 dark:text-zinc-50 leading-tight">
          {isHindi ? "लोकप्रिय नस्लें" : "Popular Breeds"}
        </h2>
      </div>

      <Link
        href="/shop"
        className="shrink-0 text-[11px] sm:text-xs md:text-sm font-bold font-sans text-amber-600 dark:text-amber-400 hover:text-amber-500 flex items-center gap-1 transition-colors group"
      >
        <span>{isHindi ? "सभी नस्लें देखें" : "View All Breeds"}</span>
        <ArrowRight
          size={13}
          className="group-hover:translate-x-1 transition-transform"
        />
      </Link>
    </div>
  );
}

export function FeaturedGoatsHeader({ count = 0 }: { count?: number }) {
  const { isHindi } = useTranslation();

  return (
    <div className="flex items-center justify-between gap-3 mb-5 sm:mb-8 pb-3 sm:pb-4 border-b border-zinc-200 dark:border-zinc-800">
      <div className="min-w-0">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-zinc-900 dark:text-zinc-50 leading-tight">
          {isHindi ? "चुनिंदा बकरे" : "Featured Goats"}
        </h2>
      </div>

      <Link
        href="/shop"
        className="shrink-0 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500 hover:text-zinc-950 text-amber-500 dark:text-amber-400 font-bold font-sans text-[11px] sm:text-xs md:text-sm transition-all shadow-xs flex items-center gap-1.5 sm:gap-2 group"
      >
        <span>{isHindi ? "सभी देखें" : "View All"}</span>
        <ArrowRight
          size={13}
          className="group-hover:translate-x-1 transition-transform"
        />
      </Link>
    </div>
  );
}

export function ViewAllGoatsCTA() {
  const { isHindi } = useTranslation();

  return (
    <div className="mt-8 sm:mt-12 flex flex-col items-center justify-center text-center gap-2 sm:gap-3">
      <Link
        href="/shop"
        className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 sm:px-10 sm:py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-zinc-950 font-extrabold text-xs sm:text-sm md:text-base font-sans shadow-lg hover:shadow-amber-500/25 hover:scale-[1.02] active:scale-95 transition-all group"
      >
        <span>
          {isHindi
            ? "सभी बकरियां देखें (शॉप पर जाएं)"
            : "View All Goats (Visit Shop)"}
        </span>
        <ArrowRight
          size={18}
          className="group-hover:translate-x-1.5 transition-transform"
        />
      </Link>
      <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 font-sans">
        {isHindi
          ? "प्रीमियम नस्लें, 100% सत्यापित स्वास्थ्य और सुरक्षित अखिल भारतीय डिलीवरी"
          : "Explore all verified breeds, certified health, & pan-India delivery"}
      </p>
    </div>
  );
}