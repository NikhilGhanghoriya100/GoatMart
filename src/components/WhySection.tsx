"use client";
import { ShieldCheck, Truck, Video, Lock, Award } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

export default function WhySection() {
  const { t } = useTranslation();

  const features = [
    {
      icon: ShieldCheck,
      title: t.why1Title,
      desc: t.why1Desc,
      color: "#d4b272",
    },
    {
      icon: Truck,
      title: t.why2Title,
      desc: t.why2Desc,
      color: "#5ec87e",
    },
    {
      icon: Video,
      title: t.why3Title,
      desc: t.why3Desc,
      color: "#60a5fa",
    },
    {
      icon: Lock,
      title: t.why4Title,
      desc: t.why4Desc,
      color: "#b388ff",
    },
  ];

  return (
    <section className="py-14 sm:py-20 px-4 sm:px-6 bg-[#16120c] text-white relative overflow-hidden border-y border-[#2d2215] w-full max-w-full">
      {/* Decorative Golden Glows */}
      <div className="absolute -top-20 -left-20 w-72 sm:w-96 h-72 sm:h-96 bg-[#c8a96e]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-72 sm:w-96 h-72 sm:h-96 bg-[#8b5e2a]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-[1280px] mx-auto relative z-10 w-full">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-[#d4b272] text-xs font-semibold uppercase tracking-wider font-sans mb-3">
            <Award size={14} /> {t.whyBadge}
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-serif mb-4 leading-tight">
            {t.whyTitle}
          </h2>
          <p className="text-white/60 text-sm sm:text-base font-sans leading-relaxed">
            {t.whySub}
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="rounded-3xl p-6 sm:p-7 border border-white/10 bg-white/[0.04] backdrop-blur-md hover:bg-white/[0.08] hover:border-[#c8a96e]/40 transition-all duration-300 group flex flex-col"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-white/10 group-hover:scale-110 transition-transform duration-300"
                  style={{ background: `radial-gradient(circle, ${item.color}25 0%, rgba(255,255,255,0.05) 100%)` }}
                >
                  <Icon size={26} style={{ color: item.color }} />
                </div>
                <h3 className="text-lg font-bold font-serif mb-2.5 text-white group-hover:text-[#d4b272] transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-white/50 leading-relaxed font-sans mt-auto">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}