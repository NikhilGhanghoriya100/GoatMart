"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import type { Review } from "@/types";

function StarRating({ rating, size = 14, interactive = false, onSet }: { rating: number; size?: number; interactive?: boolean; onSet?: (r: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <span className="inline-flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={size}
          onClick={() => interactive && onSet?.(i)}
          onMouseEnter={() => interactive && setHover(i)}
          onMouseLeave={() => interactive && setHover(0)}
          className={`transition-colors ${i <= (interactive && hover ? hover : rating) ? "fill-amber-400 text-amber-400" : "text-gray-200"} ${interactive ? "cursor-pointer hover:scale-110" : ""}`} />
      ))}
    </span>
  );
}

interface Props { goatId: string; initialReviews: Review[] }

export default function ReviewSection({ goatId, initialReviews }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const avg = reviews.length ? Math.round(reviews.reduce((a, r) => a + r.rating, 0) / reviews.length * 10) / 10 : 0;

  const submit = async () => {
    if (!session) { router.push("/login"); return; }
    if (!rating || !text.trim()) { toast.error("Please add rating and review text"); return; }
    setSubmitting(true);
    try {
      await axios.post(`/api/goats/${goatId}/review`, { rating, text });
      const newReview: Review = {
        _id: Date.now().toString(),
        user: session.user.id,
        userName: session.user.name,
        userAvatar: session.user.avatar || "",
        rating, text,
        createdAt: new Date().toISOString(),
      };
      setReviews(r => [newReview, ...r]);
      setSubmitted(true);
      setShowForm(false);
      setRating(0);
      setText("");
      toast.success("Review submitted!");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to submit review");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="mt-10 pt-8 border-t border-gray-100">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-xl font-bold font-serif mb-1">Customer Reviews</h3>
          {reviews.length > 0 && (
            <div className="flex items-center gap-2">
              <StarRating rating={avg} size={14} />
              <span className="text-sm text-gray-500 font-sans">{avg} ({reviews.length} review{reviews.length !== 1 ? "s" : ""})</span>
            </div>
          )}
        </div>
        {session && !submitted && (
          <button onClick={() => setShowForm(f => !f)}
            className="px-4 py-2 rounded-full border-2 border-[#c8a96e] text-[#c8a96e] text-xs font-bold font-sans hover:bg-[#c8a96e10] transition-colors">
            {showForm ? "Cancel" : "Write a Review"}
          </button>
        )}
        {!session && (
          <button onClick={() => router.push("/login")}
            className="px-4 py-2 rounded-full border border-gray-200 text-xs text-gray-500 font-sans hover:border-[#c8a96e] transition-colors">
            Login to review
          </button>
        )}
      </div>

      {submitted && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 text-sm text-green-700 font-sans">
          ✓ Your review has been submitted successfully!
        </div>
      )}

      {showForm && (
        <div className="bg-[#faf6ee] rounded-2xl p-4 mb-5 border border-gray-100">
          <div className="mb-3">
            <div className="text-sm font-semibold font-sans mb-2">Your Rating</div>
            <StarRating rating={rating} size={28} interactive onSet={setRating} />
          </div>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Share your experience with this goat..."
            className="w-full p-3 rounded-xl border border-gray-200 text-sm font-sans outline-none focus:border-[#c8a96e] transition-colors resize-none bg-white" rows={4} />
          <div className="flex gap-2 mt-3">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-full border border-gray-200 text-sm text-gray-500 font-sans hover:border-gray-300 transition-colors">Cancel</button>
            <button onClick={submit} disabled={submitting || !rating || !text.trim()}
              className="flex-[2] py-2 rounded-full bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] text-white text-sm font-bold font-sans disabled:opacity-50 hover:opacity-90 transition-opacity">
              {submitting ? "Submitting…" : "Submit Review"}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {reviews.map((r, i) => (
          <div key={r._id || i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              {r.userAvatar ? (
                <img src={r.userAvatar} alt={r.userName} className="w-9 h-9 rounded-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] flex items-center justify-center text-white font-bold text-sm">
                  {r.userName?.[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <div className="font-bold text-sm">{r.userName}</div>
                <div className="text-xs text-gray-400 font-sans">{new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
              </div>
              <StarRating rating={r.rating} size={13} />
            </div>
            <p className="text-sm text-gray-600 font-sans leading-relaxed">{r.text}</p>
          </div>
        ))}
        {reviews.length === 0 && (
          <div className="text-center py-10 text-gray-400 font-sans text-sm">
            <div className="text-3xl mb-2">⭐</div>
            No reviews yet. Be the first to review!
          </div>
        )}
      </div>
    </div>
  );
}
