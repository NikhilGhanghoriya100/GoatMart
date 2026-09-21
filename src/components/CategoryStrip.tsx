"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import { useTranslation } from "@/hooks/useTranslation";
import { BREEDS, BREED_META } from "@/lib/utils";

const IMGS: Record<string, string> = {
  Jamunapari: "/breeds/jamunapari.webp",
  Beetal: "/breeds/beetal.jpg",
  Sirohi: "/breeds/sirohi-female.jpg",
  Barbari: "/breeds/barbari.jpeg",
  "Black Bengal": "/breeds/black_bengal.jpeg",
  Osmanabadi: "/breeds/osmanabadi.webp",
  Totapari: "/breeds/totapari.webp",
  Sojat: "/breeds/sojat.jpeg",
  Kota: "/breeds/Kota_goat.jpeg",
  Malwa: "/breeds/malwa_goat.jpeg",
};

const EXTRA_BREEDS = [
  { name: "Kota", emoji: "🐐" },
  { name: "Malwa", emoji: "🐐" },
];

const ALL = [
  { name: "All", emoji: "🐐", origin: "All Breeds" },
  ...BREEDS.map((b) => ({ name: b, ...BREED_META[b] })),
  ...EXTRA_BREEDS,
];

export default function CategoryStrip() {
  const { selectedBreed, setSelectedBreed } = useStore();
  const { t, translateBreed } = useTranslation();
  const router = useRouter();

  const handleClick = (name: string) => {
    setSelectedBreed(name);
    router.push("/shop");
  };

  return (
    <div className="w-full max-w-full flex gap-3 sm:gap-6 overflow-x-auto pb-3 pt-1 px-1 scrollbar-none items-center">
      {ALL.map((c) => {
        const active = selectedBreed === c.name;
        const imgSrc = IMGS[c.name];

        return (
          <button
            key={c.name}
            onClick={() => handleClick(c.name)}
            className="flex flex-col items-center gap-2.5 flex-shrink-0 min-w-[76px] sm:min-w-[88px] group transition-transform hover:-translate-y-1 focus:outline-none"
          >
            <div
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden flex items-center justify-center p-0.5 transition-all duration-300 relative shadow-sm ${
                active
                  ? "ring-2 ring-zinc-950 dark:ring-white bg-zinc-950 dark:bg-white shadow-lg scale-105"
                  : "border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 group-hover:border-zinc-400 dark:group-hover:border-zinc-600 group-hover:shadow-md"
              }`}
            >
              {imgSrc ? (
                <Image
                  src={imgSrc}
                  alt={c.name}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover rounded-[14px] group-hover:scale-110 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <span className="text-3xl sm:text-4xl">{c.emoji}</span>
              )}
            </div>

            <div className="text-center pt-1">
              <span
                className={`text-xs font-sans block leading-normal ${
                  active
                    ? "text-zinc-950 dark:text-white font-bold"
                    : "text-zinc-700 dark:text-zinc-300 font-semibold group-hover:text-zinc-950 dark:group-hover:text-white"
                }`}
              >
                {c.name === "All" ? t.allBreeds : translateBreed(c.name)}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

