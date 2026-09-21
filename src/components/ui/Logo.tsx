"use client";
import React from "react";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showTagline?: boolean;
  clickable?: boolean;
  className?: string;
  inverted?: boolean;
}

export default function Logo({
  size = "md",
  showTagline = true,
  clickable = true,
  className = "",
  inverted = false,
}: LogoProps) {
  const { isHindi } = useTranslation();

  const sizeMap = {
    sm: {
      icon: "w-9 h-9",
      text: "text-lg",
      tagline: "text-[8px] tracking-[0.18em]",
      gap: "gap-2.5",
    },
    md: {
      icon: "w-11 h-11",
      text: "text-xl",
      tagline: "text-[9px] tracking-[0.2em]",
      gap: "gap-2.5",
    },
    lg: {
      icon: "w-14 h-14",
      text: "text-2xl",
      tagline: "text-[10px] tracking-[0.22em]",
      gap: "gap-3",
    },
    xl: {
      icon: "w-18 h-18",
      text: "text-3xl",
      tagline: "text-xs tracking-[0.25em]",
      gap: "gap-3.5",
    },
  };

  const { icon, text, tagline, gap } = sizeMap[size];

  const content = (
    <div className={`inline-flex items-center ${gap} group select-none ${className}`}>
      {/* ── Majestic Luxury Goat Crest Emblem (SVG) ── */}
      <div
        className={`relative ${icon} rounded-2xl bg-gradient-to-br from-[#1a150e] via-[#2d2215] to-[#120d07] shadow-lg flex items-center justify-center p-1.5 flex-shrink-0 group-hover:scale-105 transition-all duration-300 ease-out border border-[#c8a96e]/50 ring-1 ring-black/40 overflow-hidden`}
      >
        {/* Ambient Gold Radial Glow */}
        <div className="absolute inset-0 bg-radial-gradient from-[#c8a96e]/30 via-transparent to-transparent opacity-70 pointer-events-none" />

        {/* Vector Artwork: Royal Champion Goat with Golden Horns */}
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full relative z-10 drop-shadow-md"
        >
          <defs>
            <linearGradient id="goldHornLeft" x1="10" y1="10" x2="50" y2="50" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffd700" />
              <stop offset="50%" stopColor="#d4af37" />
              <stop offset="100%" stopColor="#8b5e2a" />
            </linearGradient>
            <linearGradient id="goldHornRight" x1="90" y1="10" x2="50" y2="50" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffd700" />
              <stop offset="50%" stopColor="#d4af37" />
              <stop offset="100%" stopColor="#8b5e2a" />
            </linearGradient>
            <linearGradient id="crownGrad" x1="40" y1="15" x2="60" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fff2a8" />
              <stop offset="100%" stopColor="#d4af37" />
            </linearGradient>
            <linearGradient id="faceGrad" x1="50" y1="35" x2="50" y2="85" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e5e5e5" />
            </linearGradient>
          </defs>

          {/* Left Majestic Horn */}
          <path
            d="M 50 38 C 36 16 16 14 12 28 C 8 40 18 46 28 44 C 36 42 44 40 50 38 Z"
            fill="url(#goldHornLeft)"
          />
          {/* Right Majestic Horn */}
          <path
            d="M 50 38 C 64 16 84 14 88 28 C 92 40 82 46 72 44 C 64 42 56 40 50 38 Z"
            fill="url(#goldHornRight)"
          />

          {/* Royal Crown Star on Top */}
          <polygon
            points="50,14 53,22 61,22 55,27 57,35 50,30 43,35 45,27 39,22 47,22"
            fill="url(#crownGrad)"
          />

          {/* Goat Ears */}
          <path d="M 34 44 C 20 46 16 54 20 60 C 24 62 32 54 36 48 Z" fill="#d4d4d8" />
          <path d="M 66 44 C 80 46 84 54 80 60 C 76 62 68 54 64 48 Z" fill="#d4d4d8" />

          {/* Goat Head Geometry */}
          <path
            d="M 36 42 L 64 42 L 60 68 L 50 84 L 40 68 Z"
            fill="url(#faceGrad)"
          />

          {/* Muzzle Contours & Beard */}
          <path
            d="M 46 72 L 54 72 L 50 82 Z"
            fill="#d4af37"
          />
          <path
            d="M 50 82 L 48 90 L 52 90 Z"
            fill="#d4af37"
          />

          {/* Nose line & Bridge */}
          <path
            d="M 50 42 L 50 70 M 45 72 L 55 72"
            stroke="#1c1917"
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* Noble Eyes */}
          <ellipse cx="43" cy="52" rx="3.5" ry="2" fill="#1c1917" />
          <ellipse cx="57" cy="52" rx="3.5" ry="2" fill="#1c1917" />
          <circle cx="44" cy="51" r="1" fill="#ffffff" />
          <circle cx="58" cy="51" r="1" fill="#ffffff" />
        </svg>
      </div>

      {/* ── Brand Wordmark & Tagline ── */}
      <div className="flex flex-col justify-center">
        <div className={`font-serif font-bold tracking-tight leading-none ${text}`}>
          <span className={inverted ? "text-white" : "text-zinc-950 dark:text-white"}>
            Goat
          </span>
          <span className={inverted ? "text-[#d4b272]" : "text-[#8b5e2a] dark:text-[#dfc18d]"}>
            Mart
          </span>
        </div>
        {showTagline && (
          <span
            className={`hidden sm:block uppercase font-sans font-bold mt-1 ${
              inverted ? "text-[#d4b272]" : "text-[#8b5e2a] dark:text-[#dfc18d]"
            } ${tagline}`}
          >
            {isHindi ? "प्रीमियम लाइवस्टॉक" : "PREMIUM LIVESTOCK"}
          </span>
        )}
      </div>
    </div>
  );

  if (clickable) {
    return (
      <Link href="/" className="inline-block focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}
