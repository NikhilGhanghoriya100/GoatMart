"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, Share2, MapPin } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import axios from "axios";
import ImageGallery from "@/components/ImageGallery";
import { useStore } from "@/store/useStore";
import { useTranslation } from "@/hooks/useTranslation";
import { fmt } from "@/lib/utils";
import type { Goat } from "@/types";
import { shareGoat } from "@/lib/shareGoat";

export default function GoatCard({ goat }: { goat: Goat }) {
  const { data: session } = useSession();
  const router = useRouter();
  const { wishlist, toggleWishlist } = useStore();
  const { t, translateBreed, isHindi } = useTranslation();
  const [wishLoading, setWishLoading] = useState(false);

  const sold = goat.status === "sold";
  const reserved = goat.status === "reserved";
  const inWish = wishlist.includes(goat._id);

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!session) {
      router.push("/login");
      return;
    }
    setWishLoading(true);
    try {
      await axios.post("/api/user/wishlist", { goatId: goat._id });
      toggleWishlist(goat._id);
      toast.success(inWish ? t.removedWishlist : t.addedWishlist);
    } catch {
      toast.error("Failed to update wishlist");
    } finally {
      setWishLoading(false);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const result = await shareGoat(goat);
      if (result === "copied") {
        toast.success(isHindi ? "शेयर लिंक कॉपी हो गया! अब कहीं भी भेजें 🐐" : t.shareCopied);
      }
    } catch {}
  };

  const formatAge = (ageStr: string) => {
    if (!ageStr) return "";
    if (isHindi) {
      return ageStr
        .replace(/months?/gi, "महीने")
        .replace(/years?/gi, "साल")
        .replace(/teeth/gi, "दांत")
        .replace(/tooth/gi, "दांत");
    }
    return ageStr;
  };

  return (
    <div className="group relative bg-white dark:bg-[#0d0d0d] rounded-2xl sm:rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-zinc-600 transition-all duration-300 shadow-sm hover:shadow-xl flex flex-col h-full w-full min-w-0">
      {/* Media & Badges */}
      <div className="relative overflow-hidden bg-zinc-100 dark:bg-zinc-950 flex-shrink-0">
        <Link href={`/goat/${goat._id}`} className="block overflow-hidden">
          <div className="group-hover:scale-105 transition-transform duration-500 ease-out h-[160px] sm:h-[210px] relative">
            <ImageGallery
              images={goat.images && goat.images.length ? goat.images : [""]}
              breed={goat.breed}
              height={210}
              rounded={false}
            />
          </div>
        </Link>

        {/* Top Status Badge with Fresh Light Green Background & White Text */}
        <div className="absolute top-2.5 left-2.5 z-10 max-w-[70%] pointer-events-none">
          <span
            className={`px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-extrabold font-sans tracking-wide uppercase shadow-md flex items-center gap-1.5 truncate ${
              sold
                ? "bg-zinc-800 text-zinc-300 border border-zinc-700"
                : "bg-emerald-500 text-white shadow-emerald-500/30"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                sold ? "bg-zinc-400" : "bg-white animate-pulse"
              }`}
            />
            {sold ? t.statusSold : isHindi ? "बिक्री के लिए उपलब्ध" : "FOR SALE"}
          </span>
        </div>

        {/* Quick Actions (Wishlist & Share) */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-10">
          <button
            type="button"
            onClick={handleWishlist}
            disabled={wishLoading}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/90 hover:bg-white dark:bg-black/75 dark:hover:bg-black/95 backdrop-blur-md flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-all text-zinc-700 hover:text-zinc-950 dark:text-zinc-200 dark:hover:text-white border border-zinc-200 dark:border-white/15"
            title={inWish ? t.removedWishlist : t.addedWishlist}
            aria-label="Wishlist"
          >
            <Heart
              size={15}
              className={inWish ? "fill-red-500 text-red-500" : "hover:text-red-500 transition-colors"}
            />
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/90 hover:bg-white dark:bg-black/75 dark:hover:bg-black/95 backdrop-blur-md flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-all text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white border border-zinc-200 dark:border-white/15"
            title={t.shareListing}
            aria-label="Share"
          >
            <Share2 size={13} />
          </button>
        </div>
      </div>

      {/* Card Information */}
      <div className="p-3 sm:p-4 flex flex-col flex-1 justify-between gap-3 text-zinc-900 dark:text-white">
        <div className="space-y-2">
          {/* Breed Pill */}
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[10px] sm:text-[11px] font-bold text-amber-800 dark:text-amber-400 tracking-wider uppercase font-sans bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/40 truncate">
              {translateBreed(goat.breed)}
            </span>
          </div>

          {/* Goat Title */}
          <Link href={`/goat/${goat._id}`} className="block">
            <h3 className="text-sm sm:text-base font-bold font-serif text-zinc-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate leading-snug">
              {goat.name}
            </h3>
          </Link>

          {/* Specifications Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] sm:text-xs text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-900/90 px-2 py-1 rounded-md font-sans font-medium border border-zinc-200 dark:border-zinc-800 whitespace-nowrap">
              ⚖️ {goat.weight} {t.kg}
            </span>
            {goat.age && (
              <span className="text-[10px] sm:text-xs text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-900/90 px-2 py-1 rounded-md font-sans font-medium border border-zinc-200 dark:border-zinc-800 whitespace-nowrap">
                📅 {formatAge(goat.age)}
              </span>
            )}
          </div>

          {/* Seller / Farm Info */}
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 font-sans pt-0.5 truncate">
            <span className="truncate text-zinc-700 dark:text-zinc-300">👨‍🌾 {goat.sellerName || t.verifiedFarm}</span>
            {goat.sellerLoc && (
              <span className="text-zinc-400 dark:text-zinc-500 inline-flex items-center gap-0.5 truncate flex-shrink-0">
                • <MapPin size={10} className="text-amber-600 dark:text-amber-500/80" /> {goat.sellerLoc}
              </span>
            )}
          </div>
        </div>

        {/* Pricing & Click Here Button */}
        <div className="mt-auto pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider block font-sans truncate">
              {t.directPrice}
            </span>
            <div className="text-sm sm:text-base md:text-lg font-bold font-serif text-zinc-950 dark:text-white truncate">
              {fmt(goat.price)}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans font-medium truncate">
              {goat.deliveryCharge && goat.deliveryCharge > 0
                ? `+ ${fmt(goat.deliveryCharge)} ${isHindi ? "डिलीवरी" : "Delivery"}`
                : isHindi
                ? "मुफ़्त डिलीवरी"
                : "Free Delivery"}
            </div>
          </div>

          {/* Click Here Button */}
          <Link
            href={`/goat/${goat._id}`}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-bold font-sans transition-all duration-200 flex items-center justify-center gap-1 flex-shrink-0 shadow-sm ${
              sold
                ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                : "bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 active:scale-95 shadow-md"
            }`}
          >
            <span>{sold ? t.soldOut : t.inspect}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
