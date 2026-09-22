// "use client";
// import Link from "next/link";
// import { ArrowRight, Sparkles } from "lucide-react";
// import { useTranslation } from "@/hooks/useTranslation";

// export function BreedExplorerHeader() {
//   const { t } = useTranslation();

//   return (
//     <div className="flex items-center justify-between mb-6 pb-2 border-b border-[#ebdcb8]/40 dark:border-zinc-800">
//       <div>
//         <div className="text-xs font-bold font-sans text-[#8b5e2a] dark:text-[#dfc18d] uppercase tracking-wider mb-1">
//           {t.topBloodlines}
//         </div>
//         <h2 className="text-2xl sm:text-3xl font-bold font-serif text-zinc-900 dark:text-zinc-50">
//           {t.exploreByBreed}
//         </h2>
//       </div>
//       <Link
//         href="/shop"
//         className="text-xs sm:text-sm font-bold font-sans text-[#8b5e2a] dark:text-[#dfc18d] hover:text-[#c8a96e] flex items-center gap-1.5 transition-colors group"
//       >
//         <span>{t.viewAllBreeds}</span>
//         <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
//       </Link>
//     </div>
//   );
// }

// export function FeaturedGoatsHeader({ count = 0 }: { count?: number }) {
//   const { t } = useTranslation();

//   return (
//     <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4 pb-4 border-b border-[#ebdcb8]/50 dark:border-zinc-800">
//       <div>
//         <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#faf4e8] dark:bg-zinc-800/80 text-[#8b5e2a] dark:text-[#dfc18d] text-xs font-bold font-sans mb-2 border border-[#eddcb8] dark:border-zinc-700">
//           <Sparkles size={13} className="text-[#c8a96e]" /> {t.handInspected}
//         </div>
//         <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-serif text-zinc-900 dark:text-zinc-50 leading-tight">
//           {t.featuredTitle}
//         </h2>
//         <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 font-sans mt-1">
//           {t.featuredSub}
//         </p>
//       </div>
//       <Link
//         href="/shop"
//         className="px-5 py-2.5 rounded-full border-2 border-[#8b5e2a] dark:border-[#c8a96e] text-[#8b5e2a] dark:text-[#dfc18d] hover:bg-[#8b5e2a] hover:text-white dark:hover:bg-[#c8a96e] dark:hover:text-zinc-950 font-bold font-sans text-xs sm:text-sm transition-all shadow-xs flex items-center gap-2 self-start sm:self-auto group"
//       >
//         <span>{t.browseFullCatalog} {count > 0 ? `(${count}+)` : ""}</span>
//         <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
//       </Link>
//     </div>
//   );
// }

// export function HowBuyingWorks() {
//   const { t, isHindi } = useTranslation();

//   const steps = [
//     {
//       step: "01",
//       icon: "🔍",
//       title: t.step1Title,
//       desc: t.step1Desc,
//     },
//     {
//       step: "02",
//       icon: "🔒",
//       title: t.step2Title,
//       desc: t.step2Desc,
//     },
//     {
//       step: "03",
//       icon: "🚚",
//       title: t.step3Title,
//       desc: t.step3Desc,
//     },
//   ];

//   return (
//     <section className="max-w-[1280px] mx-auto px-4 sm:px-6">
//       <div className="rounded-3xl bg-gradient-to-br from-[#faf6ee] to-[#f3ebd8] dark:from-zinc-900 dark:to-zinc-900/60 p-8 sm:p-12 border border-[#e8dfd0] dark:border-zinc-800 shadow-sm">
//         <div className="text-center max-w-xl mx-auto mb-10">
//           <span className="text-xs font-bold text-[#8b5e2a] dark:text-[#dfc18d] uppercase tracking-wider font-sans">
//             {t.howItWorksBadge}
//           </span>
//           <h2 className="text-2xl sm:text-3xl font-bold font-serif text-zinc-900 dark:text-zinc-50 mt-1">
//             {t.howItWorksTitle}
//           </h2>
//           <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 font-sans mt-2">
//             {t.howItWorksSub}
//           </p>
//         </div>

//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
//           {steps.map((item) => (
//             <div
//               key={item.step}
//               className="bg-white dark:bg-zinc-950 rounded-2xl p-6 border border-[#e2d6c2] dark:border-zinc-800 shadow-sm relative flex flex-col hover:border-[#c8a96e] dark:hover:border-zinc-700 transition-colors"
//             >
//               <div className="text-3xl mb-3">{item.icon}</div>
//               <span className="text-xs font-bold text-[#8b5e2a] dark:text-[#dfc18d] font-sans mb-1 uppercase tracking-wider">
//                 {isHindi ? `चरण ${item.step}` : `STEP ${item.step}`}
//               </span>
//               <h3 className="text-lg font-bold font-serif text-zinc-900 dark:text-zinc-100 mb-2">{item.title}</h3>
//               <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 font-sans leading-relaxed">{item.desc}</p>
//             </div>
//           ))}
//         </div>
//       </div>
//     </section>
//   );
// }

"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

export function BreedExplorerHeader() {
  const { isHindi } = useTranslation();

  return (
    <div className="flex items-end justify-between gap-3 mb-4 sm:mb-6 pb-2 border-b border-[#ebdcb8]/40 dark:border-zinc-800">
      <div className="min-w-0">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-zinc-900 dark:text-zinc-50 leading-tight">
          {isHindi ? "लोकप्रिय नस्लें" : "Popular Breeds"}
        </h2>
      </div>

      <Link
        href="/shop"
        className="shrink-0 text-[11px] sm:text-xs md:text-sm font-bold font-sans text-[#8b5e2a] dark:text-[#dfc18d] hover:text-[#c8a96e] flex items-center gap-1 transition-colors group"
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
    <div className="flex items-center justify-between gap-3 mb-5 sm:mb-8 pb-3 sm:pb-4 border-b border-[#ebdcb8]/50 dark:border-zinc-800">
      <div className="min-w-0">
        <h2 className="text-xl sm:text-2xl md:text-4xl font-bold font-serif text-zinc-900 dark:text-zinc-50 leading-tight">
          {isHindi ? "चुनिंदा बकरे" : "Featured Goats"}
        </h2>
      </div>

      <Link
        href="/shop"
        className="shrink-0 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full border-2 border-[#8b5e2a] dark:border-[#c8a96e] text-[#8b5e2a] dark:text-[#dfc18d] hover:bg-[#8b5e2a] hover:text-white dark:hover:bg-[#c8a96e] dark:hover:text-zinc-950 font-bold font-sans text-[11px] sm:text-xs md:text-sm transition-all shadow-xs flex items-center gap-1.5 sm:gap-2 group"
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

export function HowBuyingWorks() {
  const { t, isHindi } = useTranslation();

  const steps = [
    {
      step: "01",
      icon: "🔍",
      title: t.step1Title,
      desc: t.step1Desc,
    },
    {
      step: "02",
      icon: "🔒",
      title: t.step2Title,
      desc: t.step2Desc,
    },
    {
      step: "03",
      icon: "🚚",
      title: t.step3Title,
      desc: t.step3Desc,
    },
  ];

  return (
    <section className="w-full max-w-[1280px] mx-auto px-3 sm:px-6">
      <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#faf6ee] to-[#f3ebd8] dark:from-zinc-900 dark:to-zinc-900/60 p-4 sm:p-8 md:p-12 border border-[#e8dfd0] dark:border-zinc-800 shadow-sm">

        {/* Header */}
        <div className="text-center max-w-xl mx-auto mb-6 sm:mb-10">
          <span className="text-[10px] sm:text-xs font-bold text-[#8b5e2a] dark:text-[#dfc18d] uppercase tracking-wider font-sans">
            {t.howItWorksBadge}
          </span>

          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-zinc-900 dark:text-zinc-50 mt-1">
            {t.howItWorksTitle}
          </h2>

          <p className="text-[11px] sm:text-xs md:text-sm text-zinc-600 dark:text-zinc-400 font-sans mt-1.5 sm:mt-2 leading-relaxed">
            {t.howItWorksSub}
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 md:gap-6 relative">
          {steps.map((item) => (
            <div
              key={item.step}
              className="bg-white dark:bg-zinc-950 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 border border-[#e2d6c2] dark:border-zinc-800 shadow-sm relative flex flex-col hover:border-[#c8a96e] dark:hover:border-zinc-700 transition-colors"
            >
              <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">
                {item.icon}
              </div>

              <span className="text-[10px] sm:text-xs font-bold text-[#8b5e2a] dark:text-[#dfc18d] font-sans mb-1 uppercase tracking-wider">
                {isHindi ? `चरण ${item.step}` : `STEP ${item.step}`}
              </span>

              <h3 className="text-base sm:text-lg font-bold font-serif text-zinc-900 dark:text-zinc-100 mb-1.5 sm:mb-2">
                {item.title}
              </h3>

              <p className="text-[11px] sm:text-xs md:text-sm text-zinc-600 dark:text-zinc-400 font-sans leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}