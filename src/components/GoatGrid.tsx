"use client";
import GoatCard from "@/components/GoatCard";
import { GoatCardSkeleton } from "@/components/ui/Skeleton";
import { useTranslation } from "@/hooks/useTranslation";
import type { Goat } from "@/types";

interface Props {
  goats: Goat[];
  loading?: boolean;
  skeletonCount?: number;
}

export default function GoatGrid({ goats, loading = false, skeletonCount = 8 }: Props) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <GoatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!loading && goats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40">
        <span className="text-5xl mb-4">🐐</span>
        <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 font-sans mb-1">
          {t.noGoatsFound}
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans max-w-sm">
          {t.noGoatsSub}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 items-stretch">
      {goats.map((g) => (
        <GoatCard key={g._id} goat={g} />
      ))}
    </div>
  );
}
