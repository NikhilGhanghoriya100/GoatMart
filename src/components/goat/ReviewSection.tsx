"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import type { Review } from "@/types";
import Modal from "@/components/ui/Modal";
import { useTranslation } from "@/hooks/useTranslation";

function StarRating({
  rating,
  size = 14,
  interactive = false,
  onSet,
}: {
  rating: number;
  size?: number;
  interactive?: boolean;
  onSet?: (r: number) => void;
}) {
  const [hover, setHover] = useState(0);

  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => {
        const active = i <= (interactive && hover ? hover : rating);
        return (
          <Star
            key={i}
            size={size}
            onClick={() => interactive && onSet?.(i)}
            onMouseEnter={() => interactive && setHover(i)}
            onMouseLeave={() => interactive && setHover(0)}
            className={`transition-colors ${
              active
                ? "fill-amber-400 text-amber-400"
                : "text-zinc-300 dark:text-zinc-700"
            } ${interactive ? "cursor-pointer hover:scale-110" : ""}`}
          />
        );
      })}
    </span>
  );
}

interface Props {
  goatId: string;
  initialReviews: Review[];
}

export default function ReviewSection({ goatId, initialReviews }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const { isHindi } = useTranslation();

  const [reviews, setReviews] = useState<Review[]>(initialReviews || []);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showAllModal, setShowAllModal] = useState(false);

  // Auto-scroll and expand review form if navigating from Track My Order with #reviews
  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleReviewAnchor = () => {
        const hash = window.location.hash;
        const search = window.location.search;
        if (
          hash === "#reviews" ||
          search.includes("writeReview=true") ||
          search.includes("review=true")
        ) {
          setShowForm(true);
          const el = document.getElementById("reviews");
          if (el) {
            setTimeout(() => {
              el.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 100);
          }
        }
      };

      handleReviewAnchor();
      window.addEventListener("hashchange", handleReviewAnchor);
      return () => window.removeEventListener("hashchange", handleReviewAnchor);
    }
  }, []);

  // Newest reviews first
  const sortedReviews = [...reviews].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const avg = sortedReviews.length
    ? Math.round(
        (sortedReviews.reduce((acc, r) => acc + (r.rating || 0), 0) /
          sortedReviews.length) *
          10
      ) / 10
    : 0;

  // Show up to 3 reviews initially
  const previewReviews = sortedReviews.slice(0, 3);

  const submit = async () => {
    if (!session) {
      router.push("/login");
      return;
    }
    if (!rating || !text.trim()) {
      toast.error(
        isHindi
          ? "कृपया रेटिंग चुनें और अपनी समीक्षा लिखें"
          : "Please add rating and review text"
      );
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`/api/goats/${goatId}/review`, {
        rating,
        text: text.trim(),
      });

      const newReview: Review = {
        _id: Date.now().toString(),
        user: session.user.id,
        userName: session.user.name || "Customer",
        userAvatar: session.user.avatar || "",
        rating,
        text: text.trim(),
        createdAt: new Date().toISOString(),
      };

      setReviews((prev) => [newReview, ...prev]);
      setSubmitted(true);
      setShowForm(false);
      setRating(0);
      setText("");
      toast.success(
        isHindi ? "समीक्षा सफलतापूर्वक सबमिट हो गई!" : "Review submitted successfully!"
      );
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        (isHindi ? "समीक्षा सबमिट करने में विफल" : "Failed to submit review");
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const renderReviewCard = (r: Review, key: string | number) => (
    <div
      key={key}
      className="bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-4 sm:p-5 border border-zinc-200 dark:border-zinc-800 transition-colors shadow-xs"
    >
      <div className="flex items-start sm:items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-3">
          {r.userAvatar ? (
            <img
              src={r.userAvatar}
              alt={r.userName}
              className="w-9 h-9 rounded-full object-cover ring-1 ring-zinc-200 dark:ring-zinc-800"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0">
              {r.userName?.[0]?.toUpperCase() || "U"}
            </div>
          )}
          <div>
            <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100 font-sans">
              {r.userName}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 font-sans">
              {new Date(r.createdAt).toLocaleDateString(
                isHindi ? "hi-IN" : "en-IN",
                { day: "numeric", month: "short", year: "numeric" }
              )}
            </div>
          </div>
        </div>

        <StarRating rating={r.rating} size={14} />
      </div>

      <p className="text-sm text-zinc-700 dark:text-zinc-300 font-sans leading-relaxed whitespace-pre-line break-words">
        {r.text}
      </p>
    </div>
  );

  return (
    <div
      id="reviews"
      className="mt-10 pt-8 border-t border-zinc-200 dark:border-zinc-800 scroll-mt-24"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h3 className="text-xl font-bold font-serif text-zinc-950 dark:text-white mb-1">
            {isHindi ? "ग्राहक समीक्षाएं" : "Customer Reviews"}
          </h3>
          {sortedReviews.length > 0 && (
            <div className="flex items-center gap-2">
              <StarRating rating={avg} size={14} />
              <span className="text-sm text-zinc-600 dark:text-zinc-400 font-sans">
                {avg.toFixed(1)} ({sortedReviews.length}{" "}
                {isHindi
                  ? "रिव्यू"
                  : sortedReviews.length === 1
                  ? "review"
                  : "reviews"}
                )
              </span>
            </div>
          )}
        </div>

        {session && !submitted && (
          <button
            type="button"
            onClick={() => setShowForm((f) => !f)}
            className="px-4 py-2 rounded-full border-2 border-amber-600 dark:border-amber-500 text-amber-700 dark:text-amber-400 text-xs font-bold font-sans hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer"
          >
            {showForm
              ? isHindi
                ? "रद्द करें"
                : "Cancel"
              : isHindi
              ? "रिव्यू लिखें"
              : "Write a Review"}
          </button>
        )}

        {!session && (
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="px-4 py-2 rounded-full border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-400 font-sans hover:border-amber-600 dark:hover:border-amber-500 hover:text-amber-700 dark:hover:text-amber-400 transition-colors cursor-pointer"
          >
            {isHindi ? "रिव्यू के लिए लॉगिन करें" : "Login to review"}
          </button>
        )}
      </div>

      {/* Submitted message */}
      {submitted && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl px-4 py-3 mb-4 text-sm text-emerald-800 dark:text-emerald-300 font-sans">
          ✓ {isHindi ? "आपकी समीक्षा सफलतापूर्वक सबमिट हो गई है!" : "Your review has been submitted successfully!"}
        </div>
      )}

      {/* Write a review form */}
      {showForm && (
        <div className="bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-4 sm:p-5 mb-5 border border-zinc-200 dark:border-zinc-800">
          <div className="mb-3">
            <div className="text-sm font-semibold font-sans mb-2 text-zinc-900 dark:text-zinc-100">
              {isHindi ? "आपकी रेटिंग" : "Your Rating"}
            </div>
            <StarRating
              rating={rating}
              size={28}
              interactive
              onSet={setRating}
            />
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              isHindi
                ? "इस बकरे और सेवा के साथ अपना अनुभव साझा करें..."
                : "Share your experience with this goat..."
            }
            className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-sans outline-none focus:border-amber-600 dark:focus:border-amber-500 transition-colors resize-none bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600"
            rows={4}
          />

          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 py-2.5 rounded-full border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-400 font-sans hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              {isHindi ? "रद्द करें" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={submitting || !rating || !text.trim()}
              className="flex-[2] py-2.5 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-white text-sm font-bold font-sans disabled:opacity-50 hover:opacity-95 transition-opacity cursor-pointer"
            >
              {submitting
                ? isHindi
                  ? "सबमिट हो रहा है…"
                  : "Submitting…"
                : isHindi
                ? "समीक्षा सबमिट करें"
                : "Submit Review"}
            </button>
          </div>
        </div>
      )}

      {/* Reviews list (Preview: up to 3) */}
      <div className="flex flex-col gap-3">
        {previewReviews.map((r, i) => renderReviewCard(r, r._id || i))}

        {sortedReviews.length === 0 && (
          <div className="text-center py-10 text-zinc-400 dark:text-zinc-500 font-sans text-sm">
            <div className="text-3xl mb-2">⭐</div>
            {isHindi
              ? "अभी तक कोई रिव्यू नहीं है। पहले समीक्षक बनें!"
              : "No reviews yet. Be the first to review!"}
          </div>
        )}
      </div>

      {/* "See All Reviews" Button (if more than 3 reviews) */}
      {sortedReviews.length > 3 && (
        <div className="pt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAllModal(true)}
            className="px-6 py-2.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm font-bold font-sans hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-amber-600 dark:hover:border-amber-500 transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <span>
              {isHindi
                ? `सभी ${sortedReviews.length} रिव्यू देखें`
                : `See All ${sortedReviews.length} Reviews`}
            </span>
            <span>→</span>
          </button>
        </div>
      )}

      {/* All Reviews Modal */}
      <Modal
        open={showAllModal}
        onClose={() => setShowAllModal(false)}
        title={isHindi ? "सभी ग्राहक समीक्षाएं" : "All Customer Reviews"}
        size="lg"
      >
        <div className="space-y-4">
          {/* Summary Header */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl font-black font-serif text-zinc-900 dark:text-zinc-100">
                  {avg.toFixed(1)}
                </span>
                <StarRating rating={avg} size={16} />
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 font-sans">
                {isHindi
                  ? `${sortedReviews.length} सत्यापित ग्राहक समीक्षाओं पर आधारित`
                  : `Based on ${sortedReviews.length} verified customer review${
                      sortedReviews.length !== 1 ? "s" : ""
                    }`}
              </div>
            </div>
          </div>

          {/* All Reviews list */}
          <div className="flex flex-col gap-3">
            {sortedReviews.map((r, i) => renderReviewCard(r, `modal-${r._id || i}`))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
