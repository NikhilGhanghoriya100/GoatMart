"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, X, ArrowRight, Sparkles, MapPin } from "lucide-react";
import { useStore } from "@/store/useStore";
import { useTranslation } from "@/hooks/useTranslation";
import { BREEDS, BREED_META, fmt } from "@/lib/utils";
import axios from "axios";
import type { Goat } from "@/types";

export default function SearchBar() {
  const router = useRouter();
  const { selectedBreed, setSelectedBreed, priceRange, setPriceRange, searchQuery, setSearchQuery } = useStore();
  const { t, translateBreed, isHindi } = useTranslation();
  const [q, setQ] = useState(searchQuery || "");
  const [open, setOpen] = useState(false);
  const [fOpen, setFOpen] = useState(false);
  const [results, setResults] = useState<Goat[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const pricePresets = [
    { l: isHindi ? "कोई भी मूल्य" : "Any Price", min: 0, max: 1000000 },
    { l: isHindi ? "₹15,000 से कम" : "Under ₹15,000", min: 0, max: 15000 },
    { l: isHindi ? "₹15,000 – ₹25,000" : "₹15,000 – ₹25,000", min: 15000, max: 25000 },
    { l: isHindi ? "₹25,000 – ₹40,000" : "₹25,000 – ₹40,000", min: 25000, max: 40000 },
    { l: isHindi ? "₹40,000 से अधिक" : "Above ₹40,000", min: 40000, max: 1000000 },
  ];

  // Sync state if searchQuery in store changes
  useEffect(() => {
    if (searchQuery !== undefined) {
      setQ(searchQuery);
    }
  }, [searchQuery]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setFOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    clearTimeout(timer.current);
    if (!q || q.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const { data } = await axios.get(`/api/goats?search=${encodeURIComponent(q.trim())}&limit=6&status=all`);
        if (data.success) {
          setResults(data.data);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);
  }, [q]);

  const activeFilters = (selectedBreed !== "All" ? 1 : 0) + (priceRange && priceRange.min > 0 ? 1 : 0);

  const executeSearch = (overrideQuery?: string) => {
    const queryToUse = overrideQuery !== undefined ? overrideQuery : q;
    setSearchQuery(queryToUse);
    setOpen(false);
    setFOpen(false);
    router.push(`/shop?search=${encodeURIComponent(queryToUse.trim())}`);
  };

  return (
    <div ref={ref} className="relative w-full">
      {/* Search Input Container */}
      <div
        className={`flex items-center rounded-2xl border transition-all duration-200 overflow-hidden bg-zinc-50 dark:bg-zinc-900 ${
          open || fOpen
            ? "border-zinc-900 dark:border-zinc-100 shadow-lg ring-2 ring-zinc-900/10 dark:ring-white/15"
            : "border-zinc-300 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700"
        }`}
      >
        {/* Filter Toggle Button */}
        <button
          type="button"
          onClick={() => {
            setFOpen((f) => !f);
            setOpen(false);
          }}
          className="px-3.5 h-11 bg-transparent border-r border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5 flex-shrink-0 hover:text-zinc-950 dark:hover:text-white transition-colors"
          title={t.filter}
        >
          <SlidersHorizontal size={14} />
          <span className="hidden sm:inline">{t.filter}</span>
          {activeFilters > 0 && (
            <span className="w-4 h-4 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-[10px] font-black flex items-center justify-center">
              {activeFilters}
            </span>
          )}
        </button>

        {/* Search Icon */}
        <Search size={16} className="ml-3 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />

        {/* Text Input */}
        <input
          type="text"
          className="flex-1 px-2.5 py-2.5 text-sm bg-transparent outline-none font-sans text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 min-w-0"
          placeholder={t.searchPlaceholder}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (q.trim().length >= 2) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              executeSearch();
            } else if (e.key === "Escape") {
              setOpen(false);
              setFOpen(false);
            }
          }}
        />

        {/* Clear Search Button */}
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setSearchQuery("");
              setResults([]);
            }}
            className="p-1.5 mr-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
            title="Clear"
          >
            <X size={15} />
          </button>
        )}

        {/* Submit Search Button */}
        <button
          type="button"
          onClick={() => executeSearch()}
          className="px-4 sm:px-5 h-11 bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 text-xs font-bold font-sans flex-shrink-0 hover:bg-zinc-800 dark:hover:bg-white/90 transition-colors flex items-center gap-1.5"
        >
          <span>{t.searchBtn}</span>
        </button>
      </div>

      {/* Active Filter Chips */}
      {activeFilters > 0 && (
        <div className="flex gap-1.5 mt-2 flex-wrap items-center">
          {selectedBreed !== "All" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold font-sans">
              <span>{BREED_META[selectedBreed]?.emoji || "🐐"}</span>
              <span>{translateBreed(selectedBreed)}</span>
              <button
                type="button"
                onClick={() => setSelectedBreed("All")}
                className="hover:text-red-500 ml-0.5"
              >
                <X size={11} />
              </button>
            </span>
          )}
          {priceRange && priceRange.min > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold font-sans">
              <span>💰 {priceRange.l}</span>
              <button
                type="button"
                onClick={() => setPriceRange(null)}
                className="hover:text-red-500 ml-0.5"
              >
                <X size={11} />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Quick Filter Modal Dropdown */}
      {fOpen && (
        <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 p-5 animate-scaleUp">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-100 dark:border-zinc-800">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 font-sans">
              {t.filter}
            </h4>
            <button
              type="button"
              onClick={() => setFOpen(false)}
              className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-h-[340px] overflow-y-auto pr-1">
            {/* Breeds Selection */}
            <div>
              <div className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-sans mb-2">
                {t.breed}
              </div>
              <div className="space-y-1">
                {["All", ...BREEDS].map((b) => {
                  const active = selectedBreed === b;
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setSelectedBreed(b)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-sans transition-all flex items-center justify-between ${
                        active
                          ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-bold shadow-xs"
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <span>
                        {b === "All" ? `🐐 ${t.allBreeds}` : `${BREED_META[b]?.emoji || "🐐"} ${translateBreed(b)}`}
                      </span>
                      {active && <span className="text-[10px]">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price Presets */}
            <div>
              <div className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-sans mb-2">
                {t.price}
              </div>
              <div className="space-y-1">
                {pricePresets.map((r) => {
                  const active = priceRange?.min === r.min && priceRange?.max === r.max;
                  return (
                    <button
                      key={r.l}
                      type="button"
                      onClick={() => setPriceRange(r.min === 0 && r.max === 1000000 ? null : r)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-sans transition-all flex items-center justify-between ${
                        active
                          ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-bold shadow-xs"
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <span>💰 {r.l}</span>
                      {active && <span className="text-[10px]">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => {
                setSelectedBreed("All");
                setPriceRange(null);
              }}
              className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-sans transition-colors"
            >
              {t.clearAll}
            </button>
            <button
              type="button"
              onClick={() => {
                setFOpen(false);
                router.push("/shop");
              }}
              className="flex-[2] py-2.5 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-bold font-sans hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm"
            >
              {t.apply}
            </button>
          </div>
        </div>
      )}

      {/* Autocomplete Search Dropdown */}
      {open && q.trim().length >= 2 && (
        <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 overflow-hidden animate-scaleUp">
          <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 font-sans flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-500" />
              {isHindi ? `"${q}" के परिणाम` : `Live Results for "${q}"`}
            </span>
            {results.length > 0 && (
              <button
                type="button"
                onClick={() => executeSearch()}
                className="text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:underline flex items-center gap-1"
              >
                <span>{isHindi ? "सभी देखें" : "View all in Shop"}</span>
                <ArrowRight size={12} />
              </button>
            )}
          </div>

          {loading ? (
            <div className="p-6 text-center text-xs text-zinc-400 font-sans">
              <div className="inline-block w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin mb-2" />
              <p>{isHindi ? "खोज रहे हैं..." : "Searching goats..."}</p>
            </div>
          ) : results.length > 0 ? (
            <div className="max-h-[380px] overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {results.map((g) => (
                <button
                  key={g._id}
                  type="button"
                  onClick={() => {
                    router.push(`/goat/${g._id}`);
                    setOpen(false);
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/70 transition-colors text-left group"
                >
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex-shrink-0 relative">
                    {g.images?.[0] ? (
                      <img
                        src={g.images[0]}
                        alt={g.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl">🐐</div>
                    )}
                  </div>

                  {/* Title & Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:underline">
                        {g.name}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 flex-shrink-0">
                        {translateBreed(g.breed)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      <span className="font-bold text-zinc-900 dark:text-zinc-200 font-serif">
                        {fmt(g.price)}
                      </span>
                      <span>•</span>
                      <span>⚖️ {g.weight} kg</span>
                      {g.sellerLoc && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-0.5 truncate">
                            <MapPin size={10} /> {g.sellerLoc}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex-shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                        g.status === "sold"
                          ? "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400"
                          : "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                      }`}
                    >
                      {g.status === "sold" ? t.statusSold : t.statusForSale}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="text-3xl mb-2">🔍</div>
              <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 font-sans">
                {isHindi ? `"${q}" के लिए कोई बकरी नहीं मिली` : `No goats found matching "${q}"`}
              </p>
              <p className="text-[11px] text-zinc-400 font-sans mt-1">
                {isHindi
                  ? "कृपया वर्तनी जांचें या कोई अन्य नस्ल जैसे 'जमुनापारी', 'बीटल', 'सिरोही' खोजें"
                  : "Try searching for breeds like Jamunapari, Beetal, Sirohi, or Barbari"}
              </p>
              <button
                type="button"
                onClick={() => executeSearch()}
                className="mt-3 px-4 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                {isHindi ? "कैटलॉग में खोजें" : "Search in catalog"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
