"use client";
import { useState } from "react";
import Link from "next/link";
import { Heart, Share2, CheckCircle2, MapPin } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import axios from "axios";
import ImageGallery from "@/components/ImageGallery";
import { useStore } from "@/store/useStore";
import { useTranslation } from "@/hooks/useTranslation";
import { fmt } from "@/lib/utils";
import type { Goat } from "@/types";

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
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/goat/${goat._id}`;
    const breedName = translateBreed(goat.breed);
    const priceText = fmt(goat.price);
    const locText = goat.sellerLoc ? `\n📍 स्थान: ${goat.sellerLoc}` : "";

    const shareTitle = `🐐 GoatMart पर ${goat.name} — ${breedName}`;
    const shareText =
`🐐✨ GoatMart पर शानदार बकरा उपलब्ध है! ✨🐐

🏆 ${goat.name} — शुद्ध ${breedName} नस्ल
💰 कीमत: ${priceText}
⚖️ वजन: ${goat.weight} किलोग्राम${locText}

━━━━━━━━━━━━━━━━━━
🌟 इस बकरे की खासियत
━━━━━━━━━━━━━━━━━━
✅ शुद्ध ${breedName} नस्ल
🩺 पशु चिकित्सक द्वारा प्रमाणित
📸 असली फोटो और वीडियो उपलब्ध
💯 सीधे फार्म से खरीदारी
🚚 पूरे भारत में सुरक्षित घर तक पहुँचाने की सुविधा
🔒 भरोसेमंद खरीदारी के लिए GoatMart का सहयोग

🔥 बेहतरीन नस्ल और शानदार वजन का यह बकरा आपके लिए उपलब्ध है!
अगर आप अच्छी नस्ल, सही वजन और उचित कीमत वाला बकरा खरीदना चाहते हैं, तो इसकी पूरी जानकारी अभी देखें।

👇 पूरी फोटो, वीडियो, नस्ल की जानकारी, कीमत और खरीदारी के लिए यहाँ क्लिक करें:
🔗 ${url}

🐐 GoatMart — आपकी पसंद का बकरा, अब आपके घर तक।`;

    try {
      if (navigator.share) {
        await navigator.share({ title: shareTitle, text: shareText, url });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast.success(isHindi ? "शेयर मैसेज कॉपी हो गया! अब कहीं भी भेजें 🐐" : t.shareCopied);
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
    <div className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl overflow-hidden border border-[#e8dfd0] dark:border-zinc-800 shadow-card dark:shadow-card-dark card-hover flex flex-col h-full group w-full min-w-0">
      {/* Top Media & Badges */}
      <div className="relative overflow-hidden bg-[#faf7f2] dark:bg-zinc-950 flex-shrink-0">
        <Link href={`/goat/${goat._id}`} className="block overflow-hidden">
          <div className="group-hover:scale-105 transition-transform duration-500 ease-out h-[155px] sm:h-[195px] relative">
            <ImageGallery images={goat.images.length ? goat.images : [""]} breed={goat.breed} height={195} rounded={false} />
          </div>
        </Link>

        {/* Top Status & Certification Badges */}
        <div className="absolute top-2 sm:top-3 left-2 sm:left-3 flex flex-col gap-1 z-10 max-w-[70%]">
          <span
            className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold font-sans tracking-wide uppercase shadow-md truncate ${
              sold
                ? "bg-zinc-900 text-zinc-300 border border-zinc-700"
                : reserved
                ? "bg-amber-600 text-white"
                : "bg-gradient-to-r from-[#d4b272] to-[#8b5e2a] text-white"
            }`}
          >
            {sold ? t.statusSold : reserved ? t.statusReserved : t.statusForSale}
          </span>
          {goat.videoUrl && (
            <span className="px-1.5 sm:px-2.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-bold font-sans tracking-wide uppercase shadow-sm bg-black/75 backdrop-blur-xs text-white border border-white/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {isHindi ? "🎬 वीडियो" : "🎬 Video"}
            </span>
          )}
        </div>

        {/* Quick Actions (Wishlist + Share) */}
        <div className="absolute top-2 sm:top-3 right-2 sm:right-3 flex flex-col gap-1 z-10">
          <button
            type="button"
            onClick={handleWishlist}
            disabled={wishLoading}
            className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-all text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800"
            title={inWish ? t.removedWishlist : t.addedWishlist}
          >
            <Heart size={14} className={inWish ? "fill-red-500 text-red-500" : "hover:text-red-500 transition-colors"} />
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-all text-zinc-600 dark:text-zinc-400 hover:text-[#8b5e2a] dark:hover:text-[#dfc18d] border border-zinc-200 dark:border-zinc-800"
            title={t.shareListing}
          >
            <Share2 size={12} />
          </button>
        </div>
      </div>

      {/* Card Information */}
      <div className="p-2.5 sm:p-4 flex flex-col flex-1 justify-between gap-2 sm:gap-3">
        <div>
          {/* Breed tag */}
          <div className="flex items-center justify-between gap-1 mb-1 sm:mb-2">
            <span className="text-[10px] sm:text-[11px] font-bold text-[#8b5e2a] dark:text-[#dfc18d] tracking-wider uppercase font-sans bg-[#faf4e8] dark:bg-zinc-800 px-2 py-0.5 rounded-full border border-[#eddcb8] dark:border-zinc-700 truncate">
              {translateBreed(goat.breed)}
            </span>
          </div>

          {/* Goat Title */}
          <Link href={`/goat/${goat._id}`} className="block mb-1.5 sm:mb-2">
            <h3 className="text-xs sm:text-base font-bold font-serif text-zinc-900 dark:text-zinc-100 leading-snug group-hover:text-[#8b5e2a] dark:group-hover:text-[#dfc18d] transition-colors truncate">
              {goat.name}
            </h3>
          </Link>

          {/* Specs Pills */}
          <div className="flex items-center gap-1 flex-wrap sm:flex-nowrap overflow-hidden mb-1.5 sm:mb-2.5">
            <span className="text-[10px] sm:text-xs text-zinc-700 dark:text-zinc-300 bg-[#f8f5ee] dark:bg-zinc-800/80 px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg font-sans font-medium border border-[#ede3cf] dark:border-zinc-700/60 whitespace-nowrap flex-shrink-0">
              ⚖️ {goat.weight} {t.kg}
            </span>
            <span className="text-[10px] sm:text-xs text-zinc-700 dark:text-zinc-300 bg-[#f8f5ee] dark:bg-zinc-800/80 px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg font-sans font-medium border border-[#ede3cf] dark:border-zinc-700/60 whitespace-nowrap flex-shrink-0">
              📅 {formatAge(goat.age)}
            </span>
            {goat.vaccinated && (
              <span className="hidden sm:inline-flex text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-lg font-sans font-semibold border border-emerald-200 dark:border-emerald-800 items-center gap-1 whitespace-nowrap flex-shrink-0">
                <CheckCircle2 size={11} /> {t.vaccinated}
              </span>
            )}
          </div>

          {/* Seller Info */}
          <div className="flex items-center gap-1 text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 font-sans truncate">
            <span className="truncate">👨‍🌾 {goat.sellerName || t.verifiedFarm}</span>
            {goat.sellerLoc && (
              <span className="text-zinc-400 dark:text-zinc-500 hidden sm:inline-flex items-center gap-0.5 truncate flex-shrink-0">
                • <MapPin size={10} /> {goat.sellerLoc}
              </span>
            )}
          </div>
        </div>

        {/* Price & Action Button */}
        <div className="mt-auto pt-2 sm:pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-1.5 sm:gap-2">
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider block font-sans truncate">
              {t.directPrice}
            </span>
            <div className="text-sm sm:text-lg md:text-xl font-bold font-serif text-zinc-900 dark:text-zinc-100 truncate">
              {fmt(goat.price)}
            </div>
          </div>
          <Link
            href={`/goat/${goat._id}`}
            className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-bold font-sans transition-all text-center flex-shrink-0 ${
              sold
                ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                : "gold-gradient-btn"
            }`}
          >
            {sold ? t.soldOut : t.inspect}
          </Link>
        </div>
      </div>
    </div>
  );
}
