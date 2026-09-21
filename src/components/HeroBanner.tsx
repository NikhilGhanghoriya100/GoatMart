"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";

interface Banner {
  slideIndex: 0 | 1 | 2;
  imageUrl: string;
  isActive?: boolean;
}

const EMPTY_BANNERS: Banner[] = [
  { slideIndex: 0, imageUrl: "" },
  { slideIndex: 1, imageUrl: "" },
  { slideIndex: 2, imageUrl: "" },
];

export default function HeroBanner() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const [current, setCurrent] = useState(0);
  const [slides, setSlides] = useState<Banner[]>(EMPTY_BANNERS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadBanners = async () => {
      try {
        const response = await fetch("/api/banners", {
          cache: "no-store",
        });

        const result = await response.json();

        if (!mounted) return;

        if (result.success && Array.isArray(result.data)) {
          const fetchedBanners = result.data;

          const normalized: Banner[] = [0, 1, 2].map((index) => {
            const banner = fetchedBanners.find(
              (item: Banner) => Number(item.slideIndex) === index
            );

            return (
              banner || {
                slideIndex: index as 0 | 1 | 2,
                imageUrl: "",
              }
            );
          });

          setSlides(normalized);
        }
      } catch (error) {
        console.error("Failed to load banners:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadBanners();

    return () => {
      mounted = false;
    };
  }, []);

  const availableSlides = slides.filter((banner) => banner.imageUrl);

  useEffect(() => {
    if (availableSlides.length <= 1) return;

    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % availableSlides.length);
    }, 6500);

    return () => clearInterval(timer);
  }, [availableSlides.length]);

  useEffect(() => {
    if (current >= availableSlides.length && availableSlides.length > 0) {
      setCurrent(0);
    }
  }, [current, availableSlides.length]);

  if (loading) {
    return (
      <section className="w-full aspect-video bg-zinc-950 animate-pulse" />
    );
  }

  if (availableSlides.length === 0) {
    return (
      <section className="w-full aspect-video min-h-[260px] sm:min-h-[360px] lg:min-h-[480px] bg-zinc-950 flex items-center justify-center border-b border-zinc-200 dark:border-zinc-800">
        <div className="text-center text-zinc-500">
          <ImageIcon size={42} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No banners uploaded yet.</p>

          {isAdmin && (
            <Link
              href="/admin#banners"
              className="inline-flex mt-4 px-5 py-2.5 rounded-full bg-[#c8a96e] text-black text-sm font-bold hover:opacity-90 transition-opacity"
            >
              Upload Banners
            </Link>
          )}
        </div>
      </section>
    );
  }

  const activeBanner = availableSlides[current];

  const goPrevious = () => {
    setCurrent((prev) =>
      prev === 0 ? availableSlides.length - 1 : prev - 1
    );
  };

  const goNext = () => {
    setCurrent((prev) => (prev + 1) % availableSlides.length);
  };

  return (
    <section className="relative w-full overflow-hidden bg-black border-b border-zinc-200 dark:border-zinc-800">
      <div className="relative w-full aspect-video">
        <img
          key={activeBanner.imageUrl}
          src={activeBanner.imageUrl}
          alt={`Banner ${current + 1}`}
          className="absolute inset-0 w-full h-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />

        {isAdmin && (
          <Link
            href="/admin#banners"
            className="absolute top-4 right-4 z-20 px-4 py-2 rounded-full bg-black/65 text-white text-xs font-bold border border-white/20 backdrop-blur-md hover:bg-black/80 transition-colors"
          >
            Edit Banners
          </Link>
        )}

        {availableSlides.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrevious}
              className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/45 hover:bg-black/65 text-white flex items-center justify-center backdrop-blur-md border border-white/15 transition-all"
              aria-label="Previous banner"
            >
              <ChevronLeft size={20} />
            </button>

            <button
              type="button"
              onClick={goNext}
              className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/45 hover:bg-black/65 text-white flex items-center justify-center backdrop-blur-md border border-white/15 transition-all"
              aria-label="Next banner"
            >
              <ChevronRight size={20} />
            </button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
              {availableSlides.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setCurrent(index)}
                  aria-label={`Go to banner ${index + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === current
                      ? "w-7 bg-white"
                      : "w-2 bg-white/50 hover:bg-white/75"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}