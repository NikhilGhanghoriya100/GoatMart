"use client";
import { useTranslation } from "@/hooks/useTranslation";

export default function StatsStrip() {
  const { t } = useTranslation();

  const stats = [
    { num: "3,500+", label: t.statLivestock, icon: "🐐" },
    { num: "12,000+", label: t.statBuyers, icon: "👥" },
    { num: "150+", label: t.statFarms, icon: "🏪" },
    { num: "100%", label: t.statEscrow, icon: "🔒" },
  ];

  return (
    <section className="w-full max-w-full overflow-hidden bg-zinc-50 dark:bg-zinc-900/60 border-y border-zinc-200 dark:border-zinc-800 py-8 sm:py-12 px-4 sm:px-6">
      <div className="max-w-[1280px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 w-full">
        {stats.map((s, i) => (
          <div
            key={i}
            className={`text-center py-3 px-2 flex flex-col items-center ${
              i < 3 ? "md:border-r border-zinc-200 dark:border-zinc-800" : ""
            }`}
          >
            <span className="text-2xl mb-1">{s.icon}</span>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black font-serif text-zinc-950 dark:text-white mb-1 tracking-tight">
              {s.num}
            </div>
            <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 font-sans font-bold uppercase tracking-wider">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
