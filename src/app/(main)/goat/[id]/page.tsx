"use client";
import { useEffect, useState } from "react";
import { useParams, notFound } from "next/navigation";
import GoatDetailClient from "@/components/goat/GoatDetailClient";
import type { Goat } from "@/types";
import axios from "axios";

export default function GoatPage() {
  const params = useParams();
  const id = params?.id as string;
  const [goat, setGoat] = useState<Goat | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);

  useEffect(() => {
    if (!id) return;
    axios
      .get(`/api/goats/${id}`)
      .then(({ data }) => {
        if (data.success && data.data) {
          setGoat(data.data);
        } else {
          setNotFoundState(true);
        }
      })
      .catch(() => setNotFoundState(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-[#c8a96e] border-t-transparent animate-spin" />
          <p className="text-sm text-zinc-500 font-sans">Loading goat details…</p>
        </div>
      </div>
    );
  }

  if (notFoundState || !goat) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🐐</div>
          <h2 className="text-2xl font-bold font-serif mb-2">Goat Not Found</h2>
          <p className="text-zinc-500 font-sans mb-6">This listing may have been sold or removed.</p>
          <a href="/shop" className="px-6 py-3 rounded-full bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] text-white font-bold font-sans text-sm">
            Browse Shop →
          </a>
        </div>
      </div>
    );
  }

  return <GoatDetailClient goat={goat} />;
}
