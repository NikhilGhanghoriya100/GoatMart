"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowLeft, MessageSquare } from "lucide-react";
import axios from "axios";
import { timeAgo } from "@/lib/utils";
import type { Chat } from "@/types";

export default function ChatsPage() {
  const { data: session } = useSession();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) { setLoading(false); return; }
    axios.get("/api/chat")
      .then(({ data }) => { if (data.success) setChats(data.data); })
      .finally(() => setLoading(false));
  }, [session]);

  if (!session) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">💬</div>
        <h2 className="text-xl font-bold font-serif mb-2">Login to view chats</h2>
        <Link href="/login" className="inline-block px-6 py-3 rounded-full bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] text-white font-bold font-sans text-sm">Login →</Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-7">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:border-[#c8a96e] transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <h1 className="flex-1 text-center text-xl font-bold font-serif">My Chats</h1>
        <div className="w-9" />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-3 animate-pulse">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-100 rounded w-1/2" />
                <div className="h-3 bg-gray-100 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : chats.length === 0 ? (
        <div className="text-center py-20">
          <MessageSquare size={48} className="text-gray-200 mx-auto mb-4" />
          <h2 className="text-xl font-bold font-serif mb-2">No chats yet</h2>
          <p className="text-sm text-gray-400 font-sans mb-6">Browse goats and chat with sellers!</p>
          <Link href="/shop" className="inline-block px-6 py-3 rounded-full bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] text-white font-bold font-sans text-sm hover:opacity-90">
            Browse Goats →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {chats.map(chat => {
            const unread = session.user.role === "seller" ? chat.unreadCount?.seller : chat.unreadCount?.customer;
            return (
              <Link key={chat._id} href={`/chat/${chat._id}`}
                className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-4 hover:border-[#c8a96e] transition-colors shadow-sm group">
                {chat.goatImage ? (
                  <img src={chat.goatImage} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-[#faf6ee] flex items-center justify-center text-2xl flex-shrink-0">🐐</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="font-bold text-sm truncate">{chat.goatName}</div>
                    {chat.lastMessageAt && (
                      <div className="text-xs text-gray-400 font-sans flex-shrink-0 ml-2">{timeAgo(chat.lastMessageAt)}</div>
                    )}
                  </div>
                  <div className="text-xs text-[#c8a96e] font-sans mb-1">
                    {session.user.role === "seller" ? chat.customerName : chat.sellerName}
                  </div>
                  {chat.lastMessage && (
                    <div className="text-xs text-gray-400 font-sans truncate">{chat.lastMessage}</div>
                  )}
                </div>
                {unread && unread > 0 ? (
                  <div className="w-5 h-5 rounded-full bg-[#c8a96e] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{unread}</div>
                ) : null}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
