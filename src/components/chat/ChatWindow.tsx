"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Paperclip } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { useSocket } from "@/hooks/useSocket";
import { timeAgo, fmt } from "@/lib/utils";
import type { Chat, ChatMessage } from "@/types";

export default function ChatWindow({ chatId }: { chatId: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const { joinChat, leaveChat, sendMessage, onMessage, onTyping, sendTyping } = useSocket();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();

  // Load chat
  useEffect(() => {
    axios.get(`/api/chat/${chatId}`)
      .then(({ data }) => {
        if (data.success) {
          setChat(data.data);
          setMessages(data.data.messages || []);
        }
      })
      .catch(() => toast.error("Could not load chat"))
      .finally(() => setLoading(false));
  }, [chatId]);

  // Socket
  useEffect(() => {
    joinChat(chatId);
    const unsubMsg = onMessage((data: any) => {
      if (data.chatId === chatId) {
        setMessages(prev => {
          const exists = prev.some((m: any) => m._id === data.message._id);
          return exists ? prev : [...prev, data.message];
        });
      }
    });
    const unsubTyping = onTyping((data: any) => {
      if (data.chatId === chatId && data.userId !== session?.user?.id) {
        setIsTyping(data.isTyping);
        if (data.isTyping) setTimeout(() => setIsTyping(false), 3000);
      }
    });
    return () => { leaveChat(chatId); unsubMsg(); unsubTyping(); };
  }, [chatId, session?.user?.id]);

  // Scroll to bottom
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

  const handleTyping = () => {
    sendTyping(chatId, session?.user?.name || "", true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => sendTyping(chatId, session?.user?.name || "", false), 1500);
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    try {
      const { data } = await axios.post(`/api/chat/${chatId}`, { text });
      if (data.success) {
        sendMessage(chatId, data.data);
        setMessages(prev => {
          const exists = prev.some((m: any) => m._id === data.data._id);
          return exists ? prev : [...prev, data.data];
        });
      }
    } catch { toast.error("Failed to send message"); setInput(text); }
    finally { setSending(false); }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-[#faf8f4]">
        <div className="h-14 bg-gradient-to-br from-[#8b5e2a] to-[#1a0a00] animate-pulse" />
        <div className="flex-1 p-4 space-y-3">
          {[1,2,3].map(i => <div key={i} className={`h-10 rounded-xl skeleton ${i % 2 ? "w-2/3" : "w-2/3 ml-auto"}`} />)}
        </div>
      </div>
    );
  }

  const goat = typeof chat?.goat === "object" ? chat?.goat : null;
  const isCustomer = session?.user?.role === "customer";

  return (
    <div className="flex flex-col h-screen bg-[#faf8f4]">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 flex-shrink-0" style={{ background: "linear-gradient(135deg,#8b5e2a,#1a0a00)" }}>
        <button onClick={() => router.back()} className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white hover:bg-white/25 transition-colors flex-shrink-0">
          <ArrowLeft size={16} />
        </button>
        {chat?.goatImage ? (
          <img src={chat.goatImage} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-xl flex-shrink-0">🐐</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white truncate">
            {isCustomer ? chat?.sellerName : chat?.customerName}
          </div>
          {chat?.goatName && (
            <div className="text-xs text-white/60 font-sans truncate">
              Re: {chat.goatName}
            </div>
          )}
          <div className="text-xs text-green-400 font-sans">● Online</div>
        </div>
      </div>

      {/* Goat context chip */}
      {chat && (
        <div className="px-4 py-2 bg-white border-b border-gray-100 flex items-center gap-3 flex-shrink-0">
          {chat.goatImage && <img src={chat.goatImage} alt="" className="w-8 h-8 rounded-lg object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold truncate">{chat.goatName}</div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-sm font-sans">Start the conversation!</p>
          </div>
        )}
        {messages.map((m, i) => {
          const mine = m.from === session?.user?.id || m.fromRole === session?.user?.role;
          return (
            <div key={m._id || i} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              {!mine && <div className="text-xs text-gray-400 font-sans mb-1 ml-1">{m.fromName}</div>}
              <div className={`max-w-[72%] px-3.5 py-2.5 rounded-2xl text-sm font-sans leading-relaxed shadow-sm ${mine ? "rounded-br-md bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] text-white" : "rounded-bl-md bg-white text-gray-800 border border-gray-100"}`}>
                {m.text}
                <div className={`text-[10px] mt-1 text-right ${mine ? "text-white/60" : "text-gray-400"}`}>
                  {m.createdAt ? new Date(m.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}
                  {mine && m.read && " ✓✓"}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-start gap-2">
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-2.5 shadow-sm">
              <div className="flex gap-1 items-center h-4">
                {[0,1,2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-white border-t border-gray-100 flex items-center gap-2 flex-shrink-0">
        <button className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:border-[#c8a96e] transition-colors flex-shrink-0">
          <Paperclip size={15} />
        </button>
        <input
          className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 text-sm font-sans outline-none focus:border-[#c8a96e] transition-colors bg-[#faf8f4] min-w-0"
          placeholder="Type a message…"
          value={input}
          onChange={e => { setInput(e.target.value); handleTyping(); }}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
        />
        <button onClick={handleSend} disabled={!input.trim() || sending}
          className="w-9 h-9 rounded-full bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] flex items-center justify-center text-white hover:opacity-90 disabled:opacity-50 transition-opacity flex-shrink-0">
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
