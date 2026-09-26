import type { Goat } from "@/types";
import { breedTranslations } from "@/lib/translations";

/**
 * Resolves the canonical base URL for GoatMart links.
 * Priority:
 * 1. Explicit origin passed from server request headers or caller
 * 2. If running in browser, window.location.origin (universal across all hosts)
 * 3. Configured environment variables (NEXT_PUBLIC_APP_URL, RENDER_EXTERNAL_URL, VERCEL_URL, etc.)
 * 4. Development fallback (http://localhost:3000)
 * 5. Production fallback (https://goatmart.com)
 */
export function getBaseUrl(explicitOrigin?: string): string {
  // 1. Explicit origin passed from caller / server request headers
  if (explicitOrigin && typeof explicitOrigin === "string") {
    const clean = explicitOrigin.trim().replace(/\/+$/, "");
    if (clean && clean !== "null") {
      return clean;
    }
  }

  // 2. Client-side browser execution (works universally on localhost, Render, Vercel, custom domain)
  if (typeof window !== "undefined" && window.location?.origin) {
    const origin = window.location.origin.trim().replace(/\/+$/, "");
    if (origin && origin !== "null") {
      return origin;
    }
  }

  // 3. Explicit application URL environment variables (Server / SSR / SSG)
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl && typeof envUrl === "string") {
    const clean = envUrl.trim().replace(/\/+$/, "");
    if (clean) {
      return clean;
    }
  }

  // 4. Render environment variable
  if (process.env.RENDER_EXTERNAL_URL) {
    const renderUrl = process.env.RENDER_EXTERNAL_URL.trim().replace(/\/+$/, "");
    if (renderUrl) {
      return renderUrl.startsWith("http") ? renderUrl : `https://${renderUrl}`;
    }
  }

  // 5. Vercel environment variables
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercelUrl && typeof vercelUrl === "string") {
    const cleanVercel = vercelUrl.trim().replace(/\/+$/, "");
    if (cleanVercel) {
      return cleanVercel.startsWith("http") ? cleanVercel : `https://${cleanVercel}`;
    }
  }

  // 6. Development fallback
  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

  // 7. Safe production fallback
  return "https://goatmart.com";
}

/**
 * Returns canonical product URL: {baseUrl}/goat/{goatId}
 */
export function getGoatProductUrl(goatId: string, origin?: string): string {
  const base = getBaseUrl(origin);
  return `${base}/goat/${goatId}`;
}

/**
 * Returns public goat image URL: {baseUrl}/api/goats/{goatId}/image
 */
export function getGoatImageUrl(goatId: string, origin?: string): string {
  const base = getBaseUrl(origin);
  return `${base}/api/goats/${goatId}/image`;
}

/**
 * Reuses existing project breed translations or preserves the original breed value.
 */
export function translateBreed(breed?: string): string {
  if (!breed || typeof breed !== "string" || !breed.trim()) {
    return "उपलब्ध नहीं";
  }
  const clean = breed.trim();
  return breedTranslations[clean] || clean;
}

/**
 * Formats goat status into standardized Hindi labels.
 * Preserves original value if not recognized.
 */
export function formatGoatStatus(status?: string): string {
  if (!status || typeof status !== "string" || !status.trim()) {
    return "उपलब्ध नहीं";
  }
  const s = status.toLowerCase().trim();
  if (s === "sale" || s === "for sale" || s === "available") {
    return "बिक्री के लिए उपलब्ध";
  }
  if (s === "sold" || s === "sold out") {
    return "बिक चुका है";
  }
  if (s === "reserved") {
    return "आरक्षित";
  }
  return status.trim();
}

/**
 * Formats health values into neutral Hindi labels without medical claims.
 */
export function formatGoatHealth(health?: string): string {
  if (!health || typeof health !== "string" || !health.trim()) {
    return "उपलब्ध नहीं";
  }
  const h = health.toLowerCase().trim();
  if (h === "excellent") return "उत्कृष्ट";
  if (h === "good") return "अच्छा";
  if (h === "fair") return "सामान्य";
  return health.trim();
}

/**
 * Formats vaccination status into clear Hindi labels without medical guarantees.
 */
export function formatGoatVaccination(vaccinated?: boolean | null): string {
  if (vaccinated === true) return "टीकाकरण किया गया है";
  if (vaccinated === false) return "टीकाकरण नहीं किया गया है";
  return "उपलब्ध नहीं";
}

/**
 * Formats age with Hindi units (months -> महीने, years -> साल, teeth -> दांत).
 */
export function formatGoatAge(age?: string): string {
  if (!age || typeof age !== "string" || !age.trim()) {
    return "उपलब्ध नहीं";
  }
  return age
    .replace(/months?/gi, "महीने")
    .replace(/years?/gi, "साल")
    .replace(/teeth/gi, "दांत")
    .replace(/tooth/gi, "दांत")
    .trim();
}

/**
 * Formats delivery charge (0 -> मुफ्त डिलीवरी, otherwise ₹amount).
 */
export function formatDeliveryCharge(charge?: number | null): string {
  if (charge === undefined || charge === null || typeof charge !== "number" || isNaN(charge)) {
    return "उपलब्ध नहीं";
  }
  if (charge === 0) {
    return "मुफ्त डिलीवरी";
  }
  return `₹${charge.toLocaleString("en-IN")}`;
}

/**
 * Formats price in Indian Rupee format.
 */
export function formatPrice(price?: number | null): string {
  if (typeof price !== "number" || isNaN(price)) {
    return "उपलब्ध नहीं";
  }
  return `₹${price.toLocaleString("en-IN")}`;
}

/**
 * Formats weight in kilograms.
 */
export function formatGoatWeight(weight?: number | null): string {
  if (typeof weight !== "number" || isNaN(weight) || weight <= 0) {
    return "उपलब्ध नहीं";
  }
  return `${weight} किलोग्राम`;
}

/**
 * Formats seller rating and order/review count.
 */
export function formatSellerRating(rating?: number | null, reviews?: number | null): string {
  const r = typeof rating === "number" && !isNaN(rating) ? `${rating} / 5` : "5 / 5";
  if (typeof reviews === "number" && !isNaN(reviews) && reviews > 0) {
    return `⭐ विक्रेता रेटिंग: ${r} (${reviews} ऑर्डर/रिव्यू)`;
  }
  return `⭐ विक्रेता रेटिंग: ${r}`;
}

/**
 * Builds the complete, polished Hindi share message using real database values.
 * All labels and headings are in Hindi.
 * Dynamic database values (name, breed, tag, seller name, seller description) are preserved as-is.
 */
export function buildGoatShareMessage(goat: Partial<Goat>, customUrl?: string): string {
  const goatId = goat._id ? String(goat._id) : "";
  const productUrl = customUrl || (goatId ? getGoatProductUrl(goatId) : getBaseUrl());

  const name = goat.name?.trim() || "बकरा";
  const breed = translateBreed(goat.breed);
  const price = formatPrice(goat.price);
  const delivery = formatDeliveryCharge(goat.deliveryCharge);
  const weight = formatGoatWeight(goat.weight);
  const age = formatGoatAge(goat.age);
  const health = formatGoatHealth(goat.health);
  const vaccination = formatGoatVaccination(goat.vaccinated);
  const tag = goat.tag && goat.tag.trim() ? goat.tag.trim() : "उपलब्ध नहीं";
  const status = formatGoatStatus(goat.status);

  const sellerName = goat.sellerName?.trim() || "उपलब्ध नहीं";
  const sellerLoc = goat.sellerLoc?.trim() || "उपलब्ध नहीं";
  const sellerRatingText = formatSellerRating(goat.sellerRating, goat.sellerReviews);

  // Exact seller description preserved without translation or rewrite
  const description =
    goat.desc && typeof goat.desc === "string" && goat.desc.trim()
      ? goat.desc.trim()
      : "उपलब्ध नहीं";

  return `🐐✨ GoatMart पर बकरा उपलब्ध है ✨🐐

🏆 नाम: ${name}
🏷️ नस्ल: ${breed}
💰 कीमत: ${price}
🚚 डिलीवरी शुल्क: ${delivery}
⚖️ वजन: ${weight}
📅 उम्र: ${age}
🩺 स्वास्थ्य: ${health}
💉 टीकाकरण: ${vaccination}
🔖 पहचान टैग: ${tag}
📊 स्थिति: ${status}

━━━━━━━━━━━━━━━━━━
👨‍🌾 विक्रेता और फार्म की जानकारी
━━━━━━━━━━━━━━━━━━
🏪 विक्रेता: ${sellerName}
📍 फार्म स्थान: ${sellerLoc}
${sellerRatingText}

━━━━━━━━━━━━━━━━━━
📝 विक्रेता का विवरण
━━━━━━━━━━━━━━━━━━
${description}

━━━━━━━━━━━━━━━━━━
🐐 असली फोटो और पूरी जानकारी देखें:
🔗 ${productUrl}

GoatMart`;
}

export interface GoatShareData {
  url: string;
  imageUrl: string;
  title: string;
  text: string;
}

/**
 * Returns structured sharing payload for a goat.
 */
export function getGoatShareData(goat: Partial<Goat>, origin?: string): GoatShareData {
  const goatId = goat._id ? String(goat._id) : "";
  const url = goatId ? getGoatProductUrl(goatId, origin) : getBaseUrl(origin);
  const imageUrl = goatId ? getGoatImageUrl(goatId, origin) : "";
  const breedName = translateBreed(goat.breed);
  const title = `🐐 GoatMart पर ${goat.name?.trim() || "बकरा"} — ${breedName}`;
  const text = buildGoatShareMessage(goat, url);

  return {
    url,
    imageUrl,
    title,
    text,
  };
}

/**
 * Helper to check if an error is a user cancellation / abort.
 */
function isAbortError(err: unknown): boolean {
  if (err instanceof Error) {
    return (
      err.name === "AbortError" ||
      err.message?.toLowerCase().includes("abort") ||
      err.message?.toLowerCase().includes("cancel")
    );
  }
  return false;
}

/**
 * Reusable browser Web Share / Clipboard helper.
 * - Standard ecommerce sharing: passes title, text (complete Hindi message), and product URL.
 * - Opens native share sheet; when WhatsApp is selected, the complete Hindi message is pre-filled.
 * - Social preview / Open Graph generates the goat photo preview card from the product URL.
 * - Falls back to clipboard if Web Share is unavailable.
 * - Safely catches user cancellation (AbortError) without throwing errors.
 */
export async function shareGoat(
  goat: Partial<Goat>,
  origin?: string
): Promise<"shared" | "copied" | "cancelled"> {
  const { title, text, url } = getGoatShareData(goat, origin);

  // 1. Web Share API
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({
        title,
        text,
        url,
      });
      return "shared";
    } catch (err: unknown) {
      if (isAbortError(err)) {
        return "cancelled";
      }
      // If Web Share throws non-abort error, fall through to clipboard
    }
  }

  // 2. Clipboard fallback (if Web Share is unsupported or throws non-abort error)
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    try {
      const clipboardPayload = text.includes(url) ? text : `${text}\n\n${url}`;
      await navigator.clipboard.writeText(clipboardPayload);
      return "copied";
    } catch {
      // Silently catch clipboard errors
    }
  }

  return "cancelled";
}
