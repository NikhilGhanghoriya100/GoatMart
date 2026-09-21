"use client";
import { useState, useMemo, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  SlidersHorizontal,
  X,
  Check,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import CategoryStrip from "@/components/CategoryStrip";
import GoatGrid from "@/components/GoatGrid";
import { useGoats } from "@/hooks/useGoats";
import { useStore } from "@/store/useStore";
import { useTranslation } from "@/hooks/useTranslation";
import { BREEDS } from "@/lib/utils";

function ShopContent() {
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("search") || "";
  const urlBreed = searchParams.get("breed") || "";

  const { selectedBreed, setSelectedBreed, priceRange, setPriceRange, searchQuery, setSearchQuery } =
    useStore();
  const { t, translateBreed, isHindi } = useTranslation();
  const [sortOption, setSortOption] = useState("newest");
  const [statusFilter, setStatusFilter] = useState("all");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Sync URL search or breed if provided in URL
  useEffect(() => {
    if (urlSearch && urlSearch !== searchQuery) {
      setSearchQuery(urlSearch);
    }
    if (urlBreed && urlBreed !== selectedBreed) {
      setSelectedBreed(urlBreed);
    }
  }, [urlSearch, urlBreed]);

  const pricePresets = [
    { l: isHindi ? "सभी मूल्य" : "All Prices", min: 0, max: 1000000 },
    { l: isHindi ? "₹15,000 से कम" : "Under ₹15,000", min: 0, max: 15000 },
    { l: isHindi ? "₹15,000 – ₹25,000" : "₹15,000 – ₹25,000", min: 15000, max: 25000 },
    { l: isHindi ? "₹25,000 – ₹40,000" : "₹25,000 – ₹40,000", min: 25000, max: 40000 },
    { l: isHindi ? "₹40,000 से अधिक" : "Above ₹40,000", min: 40000, max: 1000000 },
  ];

  const queryParams = useMemo(() => {
    const params: Record<string, string> = {
      status: statusFilter,
      sort: sortOption,
    };
    if (selectedBreed && selectedBreed !== "All") params.breed = selectedBreed;
    if (searchQuery && searchQuery.trim()) params.search = searchQuery.trim();
    if (priceRange && (priceRange.min > 0 || priceRange.max < 1000000)) {
      params.minPrice = String(priceRange.min);
      params.maxPrice = String(priceRange.max);
    }
    return params;
  }, [selectedBreed, searchQuery, priceRange, statusFilter, sortOption]);

  const { goats, loading, page, setPage, totalPages } = useGoats(queryParams as any);

  const activeFilterCount =
    (selectedBreed !== "All" ? 1 : 0) +
    (priceRange && priceRange.min > 0 ? 1 : 0) +
    (searchQuery && searchQuery.trim() ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0);

  const resetFilters = () => {
    setSelectedBreed("All");
    setPriceRange(null);
    setSearchQuery("");
    setStatusFilter("all");
  };

  return (
    <div className="w-full max-w-[1280px] mx-auto px-3 sm:px-6 py-6 sm:py-8 overflow-x-hidden">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-sans text-zinc-500 dark:text-zinc-400 mb-1">
            <Link href="/" className="hover:text-zinc-950 dark:hover:text-white">
              {isHindi ? "होम" : "Home"}
            </Link>
            <span>/</span>
            <span className="text-zinc-950 dark:text-white font-bold">{t.navShop}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-serif text-zinc-950 dark:text-white">
            {t.shopTitle}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-sans mt-0.5">
            {t.shopSubtitle}
          </p>
        </div>

        {/* Sort & Filter Trigger */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* Mobile filter button */}
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="lg:hidden flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold font-sans text-zinc-800 dark:text-zinc-200 shadow-xs hover:border-zinc-900 dark:hover:border-zinc-100"
          >
            <SlidersHorizontal size={14} />
            <span>{t.filter}</span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 text-xs font-sans">
            <span className="text-zinc-500 dark:text-zinc-400 hidden sm:inline font-medium">{t.sortBy}:</span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold font-sans outline-none focus:border-zinc-900 dark:focus:border-zinc-100 text-zinc-800 dark:text-zinc-200 cursor-pointer shadow-xs"
            >
              <option value="newest">✨ {t.sortNewest}</option>
              <option value="price_asc">💰 {t.sortPriceAsc}</option>
              <option value="price_desc">💎 {t.sortPriceDesc}</option>
              <option value="weight_desc">⚖️ {t.sortWeightDesc}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Top Breed Selector Strip */}
      <div className="mb-8">
        <CategoryStrip />
      </div>

      {/* Active Filter Badges */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-6 p-3 bg-zinc-50 dark:bg-zinc-900/80 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 font-sans">
            {isHindi ? "सक्रिय फिल्टर:" : "Active Filters:"}
          </span>
          {selectedBreed !== "All" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 shadow-xs">
              {t.breed}: {translateBreed(selectedBreed)}
              <button type="button" onClick={() => setSelectedBreed("All")}>
                <X size={12} />
              </button>
            </span>
          )}
          {priceRange && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 shadow-xs">
              {t.price}: {priceRange.l}
              <button type="button" onClick={() => setPriceRange(null)}>
                <X size={12} />
              </button>
            </span>
          )}
          {searchQuery && searchQuery.trim() && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 shadow-xs">
              {t.searchBtn}: &quot;{searchQuery}&quot;
              <button type="button" onClick={() => setSearchQuery("")}>
                <X size={12} />
              </button>
            </span>
          )}
          {statusFilter !== "all" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 shadow-xs">
              {statusFilter === "sale" ? t.statusAvailable : t.statusSoldOnly}
              <button type="button" onClick={() => setStatusFilter("all")}>
                <X size={12} />
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs text-red-600 dark:text-red-400 hover:underline font-bold font-sans ml-auto flex items-center gap-1"
          >
            <RotateCcw size={12} /> {t.clearAll}
          </button>
        </div>
      )}

      {/* Main Catalog Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Desktop Sidebar Filters */}
        <div className="hidden lg:block space-y-6 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm sticky top-28">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="font-bold font-serif text-base text-zinc-950 dark:text-white flex items-center gap-2">
              <SlidersHorizontal size={16} /> {t.filter}
            </h3>
            {activeFilterCount > 0 && (
              <button type="button" onClick={resetFilters} className="text-xs text-zinc-500 hover:text-zinc-950 dark:hover:text-white font-sans font-bold">
                {isHindi ? "रीसेट" : "Reset"}
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-sans mb-2.5">
              {t.filterByStatus}
            </h4>
            <div className="space-y-1 text-xs font-sans">
              {[
                { id: "all", label: t.statusAll },
                { id: "sale", label: `🟢 ${t.statusAvailable}` },
                { id: "sold", label: `⚪ ${t.statusSoldOnly}` },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStatusFilter(s.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl transition-colors flex items-center justify-between ${
                    statusFilter === s.id
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-bold"
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span>{s.label}</span>
                  {statusFilter === s.id && <Check size={14} />}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range Filter */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-sans mb-2.5">
              {t.filterByPrice}
            </h4>
            <div className="space-y-1 text-xs font-sans">
              {pricePresets.map((p) => {
                const active = priceRange?.min === p.min && priceRange?.max === p.max;
                return (
                  <button
                    key={p.l}
                    type="button"
                    onClick={() => setPriceRange(active ? null : p)}
                    className={`w-full text-left px-3 py-2 rounded-xl transition-colors flex items-center justify-between ${
                      active
                        ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-bold"
                        : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <span>{p.l}</span>
                    {active && <Check size={14} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Breed Filter Checklist */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-sans mb-2.5">
              {t.filterByBreed}
            </h4>
            <div className="space-y-1 text-xs font-sans max-h-56 overflow-y-auto pr-1">
              {["All", ...BREEDS].map((b) => {
                const active = selectedBreed === b;
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setSelectedBreed(b)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors flex items-center justify-between ${
                      active
                        ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-bold"
                        : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <span>{b === "All" ? t.allBreeds : translateBreed(b)}</span>
                    {active && <Check size={14} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Product Grid Area */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-sans">
              {loading
                ? (isHindi ? "लाइवस्टॉक खोज रहे हैं..." : "Searching livestock...")
                : `${goats.length} ${t.resultsFound}`}
            </p>
          </div>

          {/* Goat Grid Component */}
          <GoatGrid goats={goats} loading={loading} />

          {/* Empty State */}
          {!loading && goats.length === 0 && (
            <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-8">
              <div className="text-5xl mb-3">🐐</div>
              <h3 className="text-lg font-bold font-serif text-zinc-950 dark:text-white mb-1">
                {t.noGoatsFound}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans mb-4 max-w-sm mx-auto">
                {t.noGoatsSub}
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="px-6 py-2.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-xs font-bold font-sans shadow-sm transition-colors"
              >
                {t.resetAllFilters}
              </button>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-6 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-5 py-2.5 rounded-full border border-zinc-200 dark:border-zinc-700 text-xs font-bold font-sans disabled:opacity-30 hover:border-zinc-900 dark:hover:border-zinc-100 text-zinc-700 dark:text-zinc-300 transition-colors"
              >
                ← {t.prevPage}
              </button>
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 font-sans">
                {t.showingPage} {page} {t.of} {totalPages}
              </span>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="px-5 py-2.5 rounded-full border border-zinc-200 dark:border-zinc-700 text-xs font-bold font-sans disabled:opacity-30 hover:border-zinc-900 dark:hover:border-zinc-100 text-zinc-700 dark:text-zinc-300 transition-colors"
              >
                {t.nextPage} →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs lg:hidden">
          <div className="w-[85vw] max-w-xs bg-white dark:bg-zinc-950 h-full p-5 sm:p-6 flex flex-col shadow-2xl overflow-y-auto border-l border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 mb-4">
              <h3 className="font-bold text-lg font-serif text-zinc-950 dark:text-white">
                {isHindi ? "लिस्टिंग फिल्टर करें" : "Filter Listings"}
              </h3>
              <button type="button" onClick={() => setMobileFiltersOpen(false)} className="text-zinc-400">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 flex-1">
              <div>
                <h4 className="text-xs font-bold uppercase text-zinc-400 dark:text-zinc-500 mb-2">
                  {t.filterByStatus}
                </h4>
                <div className="space-y-1 text-xs">
                  {[
                    { id: "all", label: t.statusAll },
                    { id: "sale", label: t.statusAvailable },
                    { id: "sold", label: t.statusSoldOnly },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStatusFilter(s.id)}
                      className={`block w-full text-left p-2.5 rounded-xl ${
                        statusFilter === s.id
                          ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-bold"
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase text-zinc-400 dark:text-zinc-500 mb-2">
                  {t.filterByPrice}
                </h4>
                <div className="space-y-1 text-xs">
                  {pricePresets.map((p) => (
                    <button
                      key={p.l}
                      type="button"
                      onClick={() => setPriceRange(p)}
                      className={`block w-full text-left p-2.5 rounded-xl ${
                        priceRange?.min === p.min && priceRange?.max === p.max
                          ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-bold"
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                      }`}
                    >
                      {p.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  resetFilters();
                  setMobileFiltersOpen(false);
                }}
                className="flex-1 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold font-sans text-zinc-700 dark:text-zinc-300"
              >
                {isHindi ? "रीसेट" : "Reset"}
              </button>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="flex-[2] py-3 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-bold font-sans shadow-sm"
              >
                {isHindi ? "परिणाम देखें" : "Show Results"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs text-zinc-400">Loading catalog...</div>}>
      <ShopContent />
    </Suspense>
  );
}
