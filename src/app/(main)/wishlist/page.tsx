"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowLeft } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import GoatGrid from "@/components/GoatGrid";
import { GoatCardSkeleton } from "@/components/ui/Skeleton";
import { useStore } from "@/store/useStore";
import type { Goat } from "@/types";

export default function WishlistPage() {
  const { data: session } = useSession();
  const { wishlist } = useStore();
  const [goats, setGoats] = useState<Goat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) { setLoading(false); return; }
    axios.get("/api/user/wishlist")
      .then(({ data }) => { if (data.success) setGoats(data.data); })
      .catch(() => toast.error("Failed to load wishlist"))
      .finally(() => setLoading(false));
  }, [session]);

  if (!session) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🤍</div>
        <h2 className="text-xl font-bold font-serif mb-2">Login to view wishlist</h2>
        <p className="text-sm text-gray-400 font-sans mb-6">Save your favourite goats to wishlist.</p>
        <Link href="/login" className="inline-block px-6 py-3 rounded-full bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] text-white font-bold font-sans text-sm">Login →</Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-5 py-7">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:border-[#c8a96e] transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <h1 className="flex-1 text-center text-xl font-bold font-serif">
          My Wishlist {!loading && `(${goats.length})`}
        </h1>
        <div className="w-9" />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1,2,3,4].map(i => <GoatCardSkeleton key={i} />)}
        </div>
      ) : goats.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🤍</div>
          <h2 className="text-xl font-bold font-serif mb-2">Your wishlist is empty</h2>
          <p className="text-sm text-gray-400 font-sans mb-6">Browse goats and save your favourites!</p>
          <Link href="/shop" className="inline-block px-6 py-3 rounded-full bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] text-white font-bold font-sans text-sm hover:opacity-90">
            Browse Goats →
          </Link>
        </div>
      ) : (
        <GoatGrid goats={goats} />
      )}
    </div>
  );
}
