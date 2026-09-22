"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Direct banner images from public folder
const BANNERS = [
  {
    id: 1,
    src: "/banner/banner1.png",
    alt: "GoatMart Special Banner 1",
  },
  {
    id: 2,
    src: "/banner/banner2.png",
    alt: "GoatMart Special Banner 2",
  },
  {
    id: 3,
    src: "/banner/banner3.png",
    alt: "GoatMart Special Banner 3",
  },
];

const AUTO_SCROLL_INTERVAL = 4000; // 4 seconds auto scroll

export default function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const nextSlide = useCallback(() => {
    setCurrent((prev) => (prev + 1) % BANNERS.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrent((prev) => (prev === 0 ? BANNERS.length - 1 : prev - 1));
  }, []);

  // Auto-scroll effect (pauses on hover)
  useEffect(() => {
    if (isHovered) return;

    const timer = setInterval(() => {
      nextSlide();
    }, AUTO_SCROLL_INTERVAL);

    return () => clearInterval(timer);
  }, [isHovered, nextSlide]);

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      nextSlide(); // Swiped left -> next
    } else if (distance < -minSwipeDistance) {
      prevSlide(); // Swiped right -> prev
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <section
      className="relative w-full overflow-hidden bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 select-none group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Banner Carousel Container */}
      <div className="relative w-full aspect-[21/9] sm:aspect-[16/7] md:aspect-[16/6] max-h-[520px] min-h-[190px]">
        {BANNERS.map((banner, index) => {
          const isActive = index === current;

          return (
            <div
              key={banner.id}
              className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out ${
                isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
              }`}
            >
              <img
                src={banner.src}
                alt={banner.alt}
                className="w-full h-full object-cover object-center"
                loading={index === 0 ? "eager" : "lazy"}
                onError={(e) => {
                  // Fallback to /banners/ if /banner/ path differs
                  const img = e.currentTarget;
                  if (img.src.includes("/banner/")) {
                    img.src = banner.src.replace("/banner/", "/banners/");
                  }
                }}
              />
            </div>
          );
        })}

        {/* Previous Navigation Button */}
        <button
          type="button"
          onClick={prevSlide}
          className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-md border border-white/20 shadow-lg transition-all opacity-80 group-hover:opacity-100 hover:scale-105"
          aria-label="Previous banner"
        >
          <ChevronLeft size={22} />
        </button>

        {/* Next Navigation Button */}
        <button
          type="button"
          onClick={nextSlide}
          className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-md border border-white/20 shadow-lg transition-all opacity-80 group-hover:opacity-100 hover:scale-105"
          aria-label="Next banner"
        >
          <ChevronRight size={22} />
        </button>

        {/* Indicator Dots */}
        <div className="absolute bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
          {BANNERS.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setCurrent(index)}
              aria-label={`Go to slide ${index + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === current
                  ? "w-6 sm:w-7 bg-amber-400"
                  : "w-2 bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}