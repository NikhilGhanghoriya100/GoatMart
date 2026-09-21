import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Goat } from "@/types";

interface AppStore {
  wishlist: string[];
  toggleWishlist: (id: string) => void;
  setWishlist: (ids: string[]) => void;
  selectedBreed: string;
  setSelectedBreed: (b: string) => void;
  priceRange: { l: string; min: number; max: number } | null;
  setPriceRange: (r: { l: string; min: number; max: number } | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  lang: "en" | "hi";
  setLang: (l: "en" | "hi") => void;
  checkoutGoat: Goat | null;
  setCheckoutGoat: (g: Goat | null) => void;
  unreadNotifs: number;
  setUnreadNotifs: (n: number) => void;
  unreadChats: number;
  setUnreadChats: (n: number) => void;
}

export const useStore = create<AppStore>()(
  persist(
    (set) => ({
      wishlist: [],
      toggleWishlist: (id) =>
        set((s) => ({
          wishlist: s.wishlist.includes(id)
            ? s.wishlist.filter((x) => x !== id)
            : [...s.wishlist, id],
        })),
      setWishlist: (ids) => set({ wishlist: ids }),
      selectedBreed: "All",
      setSelectedBreed: (b) => set({ selectedBreed: b }),
      priceRange: null,
      setPriceRange: (r) => set({ priceRange: r }),
      searchQuery: "",
      setSearchQuery: (q) => set({ searchQuery: q }),
      lang: "hi", // Default website language: Hindi
      setLang: (l) => set({ lang: l }),
      checkoutGoat: null,
      setCheckoutGoat: (g) => set({ checkoutGoat: g }),
      unreadNotifs: 0,
      setUnreadNotifs: (n) => set({ unreadNotifs: n }),
      unreadChats: 0,
      setUnreadChats: (n) => set({ unreadChats: n }),
    }),
    {
      name: "goatmart-store",
      partialize: (s) => ({ wishlist: s.wishlist, lang: s.lang }),
    }
  )
);
