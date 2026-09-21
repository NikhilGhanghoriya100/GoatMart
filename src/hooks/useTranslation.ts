"use client";
import { useEffect, useState, useCallback } from "react";
import { useStore } from "@/store/useStore";
import { translations, breedTranslations, Language } from "@/lib/translations";

export function useTranslation() {
  const { lang, setLang } = useStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang || "hi";
    }
  }, [lang]);

  const changeLanguage = useCallback((newLang: Language) => {
    setLang(newLang);
    if (typeof document !== "undefined") {
      document.documentElement.lang = newLang;
    }
  }, [setLang]);

  // Default language is Hindi across the entire site
  const currentLang: Language = mounted ? (lang || "hi") : "hi";
  const t = translations[currentLang] || translations.hi;

  const translateBreed = useCallback((breed: string) => {
    if (currentLang === "hi" && breedTranslations[breed]) {
      return breedTranslations[breed];
    }
    return breed;
  }, [currentLang]);

  return {
    lang: currentLang,
    setLang: changeLanguage,
    t,
    translateBreed,
    isHindi: currentLang === "hi",
    mounted,
  };
}
