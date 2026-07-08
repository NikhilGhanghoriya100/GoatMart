"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Heart, Share2, MessageSquare, ShoppingCart, Star, CheckCircle, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import ImageGallery from "@/components/ImageGallery";
import CheckoutModal from "@/components/payment/CheckoutModal";
import ReviewSection from "@/components/goat/ReviewSection";
import GoatGrid from "@/components/GoatGrid";
import { useStore } from "@/store/useStore";
import { fmt } from "@/lib/utils";
import type { Goat } from "@/types";

export default function GoatDetailClient({ goat }: { goat: Goat }) {
  const { data: session } = useSession();
  const router = useRouter();
  const { wishlist, toggleWishlist } = useStore();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [wishLoading, setWishLoading] = useState(false);
  const sold = goat.status === "sold";
  const inWish = wishlist.includes(goat._id);

  const handleWishlist = async () => {
    if (!session) { router.push("/login"); return; }
    setWishLoading(true);
    try {
      await axios.post("/api/user/wishlist", { goatId: goat._id });
      toggleWishlist(goat._id);
      toast.success(inWish ? "Removed from wishlist" : "Saved to wishlist");
    } catch { toast.error("Failed"); }
    finally { setWishLoading(false); }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/goat/${goat._id}`;
    const text = `Check out ${goat.name} (${goat.breed}) – ${fmt(goat.price)} on Bakrawale!`;
    try {
      if (navigator.share) await navigator.share({ title: goat.name, text, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied!"); }
    } catch { /* cancelled */ }
  };

  const handleChat = async () => {
    if (!session) { router.push("/login"); return; }
    try {
      const { data } = await axios.post("/api/chat", { goatId: goat._id });
      if (data.success) router.push(`/chat/${data.data._id}`);
    } catch { toast.error("Could not open chat"); }
  };

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-5 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 font-sans mb-5">
        <Link href="/" className="hover:text-[#c8a96e] transition-colors">Home</Link>
        <ChevronRight size={12} />
        <Link href="/shop" className="hover:text-[#c8a96e] transition-colors">Shop</Link>
        <ChevronRight size={12} />
        <span className="text-gray-600">{goat.name}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* ── LEFT: Images ── */}
        <div>
          <div className="rounded-2xl overflow-hidden relative" style={{ height: 360 }}>
            <ImageGallery images={goat.images.length ? goat.images : [""]} breed={goat.breed} height={360} rounded={false} />
            {/* Status badge */}
            <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold text-white z-10 ${sold ? "bg-black/80" : "bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a]"}`}>
              {sold ? "SOLD OUT" : "FOR SALE"}
            </div>
            {/* Wishlist btn */}
            <button onClick={handleWishlist} disabled={wishLoading} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center z-10 hover:scale-110 transition-transform">
              <Heart size={16} className={inWish ? "fill-red-500 text-red-500" : "text-gray-500"} />
            </button>
          </div>

          {/* Thumbnail strip */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {goat.images.map((img, i) => (
              <div key={i} className="w-16 h-16 rounded-xl overflow-hidden border-2 border-gray-100 flex-shrink-0 cursor-pointer hover:border-[#c8a96e] transition-colors">
                <img src={img} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
            ))}
            {goat.videoUrl && (
              <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-gray-200 flex-shrink-0 cursor-pointer bg-black flex flex-col items-center justify-center gap-1">
                <span className="text-xl">🎬</span>
                <span className="text-[9px] text-gray-400 font-sans">Video</span>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Info ── */}
        <div>
          <div className="text-xs text-[#c8a96e] font-bold tracking-widest uppercase font-sans mb-1.5">{goat.breed}</div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif leading-tight mb-2">{goat.name}</h1>
          <div className="text-3xl font-bold text-[#c8a96e] font-serif mb-4">{fmt(goat.price)}</div>

          {/* Specs table */}
          <div className="bg-[#faf6ee] rounded-2xl overflow-hidden mb-4">
            {[
              ["Breed", goat.breed],
              ["Weight", `${goat.weight} kg`],
              ["Age", goat.age],
              ["Health", goat.health],
              ["Vaccination", goat.vaccinated ? "✓ Complete" : "Not Done"],
              ["Status", sold ? "Sold Out" : "Available"],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between px-4 py-2.5 border-b border-white/60 last:border-0 text-sm font-sans">
                <span className="text-gray-400">{l}</span>
                <span className={`font-semibold ${l === "Status" && sold ? "text-red-500" : l === "Status" ? "text-green-600" : "text-gray-800"}`}>{v as string}</span>
              </div>
            ))}
          </div>

          <p className="text-sm text-gray-500 leading-relaxed font-sans mb-4">{goat.desc}</p>

          {/* Seller card */}
          <div className="flex items-center gap-3 bg-[#faf6ee] rounded-2xl p-3.5 mb-5 border border-gray-100">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] flex items-center justify-center text-2xl flex-shrink-0">
              {goat.sellerImg ? <img src={goat.sellerImg} alt={goat.sellerName} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} /> : "👨‍🌾"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm">{goat.sellerName}</div>
              <div className="text-xs text-gray-400 font-sans">📍 {goat.sellerLoc}</div>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="flex">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} size={10} className={i <= Math.round(goat.sellerRating) ? "fill-amber-400 text-amber-400" : "text-gray-200"} />
                  ))}
                </div>
                <span className="text-xs text-gray-400 font-sans">{goat.sellerRating} ({goat.sellerReviews})</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full font-semibold font-sans flex-shrink-0">
              <CheckCircle size={11} /> Verified
            </div>
          </div>

          {/* Sticky action buttons */}
          <div className="sticky bottom-0 bg-white pt-3 pb-2 z-10">
            <div className="flex gap-3 mb-2">
              <button onClick={handleChat}
                className="flex-1 py-3.5 rounded-xl border-2 border-[#c8a96e] text-[#c8a96e] text-sm font-bold font-sans flex items-center justify-center gap-2 hover:bg-[#c8a96e10] transition-colors">
                <MessageSquare size={15} /> Chat with Seller
              </button>
              <button disabled={sold} onClick={() => !sold && (session ? setCheckoutOpen(true) : router.push("/login"))}
                className={`flex-1 py-3.5 rounded-xl text-sm font-bold font-sans flex items-center justify-center gap-2 transition-opacity ${sold ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] text-white hover:opacity-90 shadow-lg"}`}>
                <ShoppingCart size={15} /> {sold ? "Sold Out" : "Buy Now →"}
              </button>
            </div>
            <button onClick={handleShare}
              className="w-full py-2.5 rounded-xl border border-gray-200 text-xs text-gray-500 font-sans flex items-center justify-center gap-1.5 hover:border-[#c8a96e] transition-colors">
              <Share2 size={12} /> Share this goat
            </button>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <ReviewSection goatId={goat._id} initialReviews={goat.reviews ?? []} />

      {/* Related goats */}
      <div className="mt-12">
        <h2 className="text-xl font-bold font-serif text-center mb-2">You May Also Like</h2>
        <p className="text-sm text-gray-400 font-sans text-center mb-5">More premium goats from our collection</p>
      </div>

      {checkoutOpen && <CheckoutModal goat={goat} onClose={() => setCheckoutOpen(false)} />}
    </div>
  );
}
