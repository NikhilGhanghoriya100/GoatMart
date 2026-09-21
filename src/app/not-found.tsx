import Link from "next/link";
import { ArrowLeft, Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[75vh] w-full flex items-center justify-center px-4 py-12 overflow-hidden">
      <div className="w-full max-w-2xl text-center">

        {/* Goat Illustration */}
        <div className="relative mx-auto mb-7 w-28 h-28">
          <div className="absolute inset-0 rounded-full bg-[#c8a96e]/10 animate-pulse" />

          <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-[#fffaf0] to-[#f5ead4] border border-[#eadfc9] shadow-sm flex items-center justify-center">
            <span className="text-6xl">🐐</span>
          </div>
        </div>

        {/* 404 */}
        <div className="text-7xl sm:text-8xl font-bold font-serif text-[#c8a96e]/25 leading-none mb-2">
          404
        </div>

        {/* Hindi Heading */}
        <h1 className="text-2xl sm:text-3xl font-bold font-serif text-gray-900">
          अरे! यह पेज नहीं मिला
        </h1>

        {/* English Heading */}
        <h2 className="mt-2 text-lg sm:text-xl font-semibold text-[#8b5e2a]">
          Looks like this page wandered off!
        </h2>

        {/* Description */}
        <p className="mt-5 max-w-lg mx-auto text-sm sm:text-base text-gray-500 leading-7">
          आप जिस पेज को खोज रहे हैं वह उपलब्ध नहीं है, हटा दिया गया है,
          या URL गलत हो सकता है।
        </p>

        <p className="mt-1 text-sm text-gray-400">
          The page you're looking for doesn't exist or may have been moved.
        </p>

        {/* Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#c8a96e] text-white font-bold text-sm hover:bg-[#b69559] hover:shadow-lg transition-all"
          >
            <Home size={17} />
            होम पर जाएँ · Go Home
          </Link>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-gray-200 bg-white text-gray-700 font-semibold text-sm hover:border-[#c8a96e] hover:bg-[#fffaf0] transition-all"
          >
            <Search size={17} />
            Browse GoatMart
          </Link>

        </div>

        {/* Bottom Message */}
        <div className="mt-10 pt-6 border-t border-gray-100">
          <p className="text-xs sm:text-sm text-gray-400">
            🐐 चिंता मत कीजिए — आपका अगला पसंदीदा पशु यहीं मिल सकता है।
          </p>

          <p className="mt-1 text-xs text-gray-300">
            Don&apos;t worry — your next favourite goat might be just a click away.
          </p>
        </div>

      </div>
    </div>
  );
}
