
"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  Paperclip,
  Mic,
  X,
  Loader2,
  StopCircle,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { useSocket } from "@/hooks/useSocket";
import type { Chat, ChatMessage } from "@/types";

export default function ChatWindow({ chatId }: { chatId: string }) {
  const { data: session } = useSession();
  const router = useRouter();

  const {
    joinChat,
    leaveChat,
    sendMessage,
    onMessage,
    onTyping,
    sendTyping,
  } = useSocket();

  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined
  );

  // Load chat
  useEffect(() => {
    axios
      .get(`/api/chat/${chatId}`)
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
        setMessages((prev) => {
          const exists = prev.some(
            (m: any) => m._id === data.message._id
          );

          return exists ? prev : [...prev, data.message];
        });
      }
    });

    const unsubTyping = onTyping((data: any) => {
      if (
        data.chatId === chatId &&
        data.userId !== session?.user?.id
      ) {
        setIsTyping(data.isTyping);

        if (data.isTyping) {
          setTimeout(() => setIsTyping(false), 3000);
        }
      }
    });

    return () => {
      leaveChat(chatId);
      unsubMsg();
      unsubTyping();
    };
  }, [chatId, session?.user?.id]);

  // Scroll only inside messages area
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [messages, isTyping, attachments, audioUrl]);

  // Cleanup recording
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }

      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const handleTyping = () => {
    sendTyping(chatId, session?.user?.name || "", true);

    clearTimeout(typingTimer.current);

    typingTimer.current = setTimeout(
      () =>
        sendTyping(
          chatId,
          session?.user?.name || "",
          false
        ),
      1500
    );
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setUploadingMedia(true);

    const fd = new FormData();
    fd.append("file", file);

    const isVideo = file.type.startsWith("video/");

    fd.append("type", isVideo ? "video" : "image");
    fd.append("purpose", "chat");

    try {
      const { data } = await axios.post("/api/upload", fd);

      if (data.success && data.data?.url) {
        setAttachments((prev) => [...prev, data.data.url]);

        toast.success(
          isVideo ? "Video attached!" : "Photo attached!"
        );
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
          "Failed to attach media"
      );
    } finally {
      setUploadingMedia(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        const url = URL.createObjectURL(blob);

        setAudioBlob(blob);
        setAudioUrl(url);

        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();

      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => {
          if (s >= 59) {
            stopRecording();
            return 60;
          }

          return s + 1;
        });
      }, 1000);
    } catch {
      toast.error(
        "Microphone access denied. Please allow microphone in browser settings."
      );
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }

    setIsRecording(false);
  };

  const cancelVoice = () => {
    stopRecording();

    setAudioBlob(null);

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setAudioUrl(null);
    setRecordingSeconds(0);
  };

  const sendVoiceMessage = async () => {
    if (!audioBlob) return;

    setUploadingAudio(true);

    try {
      const fd = new FormData();

      fd.append(
        "file",
        audioBlob,
        "voice-message.webm"
      );

      fd.append("type", "audio");
      fd.append("purpose", "chat");

      const { data } = await axios.post(
        "/api/upload",
        fd
      );

      if (data.success && data.data?.url) {
        const voiceUrl = data.data.url;

        setSending(true);

        const res = await axios.post(
          `/api/chat/${chatId}`,
          {
            text: "🎤 Voice message",
            attachments: [voiceUrl],
          }
        );

        if (res.data.success) {
          sendMessage(chatId, res.data.data);

          setMessages((prev) => {
            const exists = prev.some(
              (m: any) =>
                m._id === res.data.data._id
            );

            return exists
              ? prev
              : [...prev, res.data.data];
          });

          toast.success("Voice message sent!");
        }
      } else {
        toast.error(
          "Failed to upload voice message"
        );
      }
    } catch {
      toast.error("Failed to send voice message");
    } finally {
      setUploadingAudio(false);
      setSending(false);
      cancelVoice();
    }
  };

  const handleSend = async () => {
    if (
      (!input.trim() &&
        attachments.length === 0) ||
      sending
    ) {
      return;
    }

    const text = input.trim();
    const currentAttachments = [...attachments];

    setInput("");
    setAttachments([]);
    setSending(true);

    try {
      const { data } = await axios.post(
        `/api/chat/${chatId}`,
        {
          text,
          attachments: currentAttachments,
        }
      );

      if (data.success) {
        sendMessage(chatId, data.data);

        setMessages((prev) => {
          const exists = prev.some(
            (m: any) => m._id === data.data._id
          );

          return exists
            ? prev
            : [...prev, data.data];
        });
      }
    } catch {
      toast.error("Failed to send message");

      setInput(text);
      setAttachments(currentAttachments);
    } finally {
      setSending(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col h-[100dvh] min-h-0 overflow-hidden bg-[#faf8f4] dark:bg-zinc-950">
        <div className="h-14 flex-shrink-0 bg-gradient-to-br from-[#8b5e2a] to-[#1a0a00] animate-pulse" />

        <div className="flex-1 min-h-0 overflow-hidden p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-10 rounded-xl skeleton ${
                i % 2
                  ? "w-2/3"
                  : "w-2/3 ml-auto"
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  const isCustomer =
    session?.user?.role === "customer";

  const isAdmin =
    session?.user?.role === "admin";

  return (
    <div className="flex flex-col h-[100dvh] min-h-0 overflow-hidden bg-[#faf8f4] dark:bg-zinc-950">
      {/* HEADER — FIXED */}
      <div
        className="px-4 py-3 flex items-center gap-3 flex-shrink-0 shadow-md z-20"
        style={{
          background:
            "linear-gradient(135deg,#8b5e2a,#1a0a00)",
        }}
      >
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white hover:bg-white/25 transition-colors flex-shrink-0"
        >
          <ArrowLeft size={16} />
        </button>

        {chat?.goatImage ? (
          <img
            src={chat.goatImage}
            alt=""
            className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-amber-300/40"
            onError={(e) => {
              (
                e.target as HTMLImageElement
              ).style.display = "none";
            }}
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl flex-shrink-0">
            🐐
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white truncate flex items-center gap-2">
            <span>
              {isCustomer
                ? chat?.sellerName
                : chat?.customerName}
            </span>

            {isAdmin && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-zinc-950 font-bold">
                Admin Monitor
              </span>
            )}
          </div>

          {chat?.goatName && (
            <div className="text-xs text-white/70 font-sans truncate">
              Listing: {chat.goatName}
            </div>
          )}

          <div className="text-[11px] text-emerald-400 font-sans flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Direct Chat Active
          </div>
        </div>
      </div>

      {/* GOAT CONTEXT — FIXED */}
      {chat && (
        <div className="px-4 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3 flex-shrink-0 z-10">
          {chat.goatImage && (
            <img
              src={chat.goatImage}
              alt=""
              className="w-8 h-8 rounded-lg object-cover"
              onError={(e) => {
                (
                  e.target as HTMLImageElement
                ).style.display = "none";
              }}
            />
          )}

          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
              {chat.goatName}
            </div>
          </div>

          <span className="text-[11px] text-[#8b5e2a] dark:text-[#dfc18d] font-bold font-sans">
            Direct Verified Inquiry
          </span>
        </div>
      )}

      {/* MESSAGES — ONLY THIS AREA SCROLLS */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-16 text-zinc-400 dark:text-zinc-500">
            <div className="text-4xl mb-3">
              💬
            </div>

            <p className="text-sm font-sans">
              Start the conversation! You can send
              messages, photos, videos and voice notes.
            </p>
          </div>
        )}

        {messages.map((m, i) => {
          const mine =
            m.from === session?.user?.id ||
            m.fromRole === session?.user?.role;

          return (
            <div
              key={m._id || i}
              className={`flex flex-col ${
                mine
                  ? "items-end"
                  : "items-start"
              }`}
            >
              {!mine && (
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-sans mb-1 ml-1 flex items-center gap-1.5">
                  <span className="font-semibold">
                    {m.fromName}
                  </span>

                  {m.fromRole === "admin" && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-400 text-zinc-950 text-[9px] font-bold">
                      ADMIN
                    </span>
                  )}
                </div>
              )}

              <div
                className={`max-w-[78%] sm:max-w-[70%] px-4 py-3 rounded-2xl text-sm font-sans leading-relaxed shadow-sm ${
                  mine
                    ? "rounded-br-md bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] text-white"
                    : "rounded-bl-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800"
                }`}
              >
                {/* Text */}
                {m.text &&
                  m.text !==
                    "📎 Media attachment" &&
                  m.text !==
                    "🎤 Voice message" && (
                    <p className="whitespace-pre-wrap">
                      {m.text}
                    </p>
                  )}

                {/* Attachments */}
                {m.attachments &&
                  m.attachments.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {m.attachments.map(
                        (att, attIdx) => {
                          const isVid =
                            att.includes(".mp4") ||
                            att.includes(".webm") ||
                            att.includes(".mov") ||
                            att.startsWith(
                              "data:video"
                            );

                          const isAudio =
                            (att.includes(".webm") &&
                              m.text ===
                                "🎤 Voice message") ||
                            att.includes("audio") ||
                            att.includes(
                              "voice-message"
                            );

                          if (isAudio) {
                            return (
                              <div
                                key={attIdx}
                                className="flex items-center gap-2"
                              >
                                <span className="text-base">
                                  🎤
                                </span>

                                <audio
                                  src={att}
                                  controls
                                  className="max-w-[220px] h-9 rounded-full"
                                  style={{
                                    filter: mine
                                      ? "invert(1) brightness(2)"
                                      : "none",
                                  }}
                                />
                              </div>
                            );
                          }

                          if (isVid) {
                            return (
                              <div
                                key={attIdx}
                                className="rounded-xl overflow-hidden bg-black max-w-sm"
                              >
                                <video
                                  src={att}
                                  controls
                                  className="w-full max-h-56 object-cover"
                                />
                              </div>
                            );
                          }

                          return (
                            <div
                              key={attIdx}
                              className="rounded-xl overflow-hidden max-w-sm border border-black/10"
                            >
                              <img
                                src={att}
                                alt="Attachment"
                                className="w-full max-h-64 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                                onClick={() =>
                                  window.open(
                                    att,
                                    "_blank"
                                  )
                                }
                              />
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}

                {/* Time */}
                <div
                  className={`text-[10px] mt-1 text-right ${
                    mine
                      ? "text-white/75"
                      : "text-zinc-400 dark:text-zinc-500"
                  }`}
                >
                  {m.createdAt
                    ? new Date(
                        m.createdAt
                      ).toLocaleTimeString(
                        "en-IN",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )
                    : ""}

                  {mine && m.read && " ✓✓"}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-start gap-2">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl rounded-bl-md px-4 py-2.5 shadow-sm">
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce"
                    style={{
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ATTACHMENT PREVIEW — FIXED */}
      {attachments.length > 0 && (
        <div className="flex-shrink-0 px-4 py-2 bg-zinc-100 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-3 overflow-x-auto">
          {attachments.map((att, idx) => (
            <div
              key={idx}
              className="relative w-16 h-16 rounded-xl overflow-hidden border border-zinc-300 dark:border-zinc-700 flex-shrink-0 bg-black"
            >
              {att.includes(".mp4") ||
              att.startsWith("data:video") ? (
                <div className="w-full h-full flex items-center justify-center text-xs text-white">
                  🎬 Video
                </div>
              ) : (
                <img
                  src={att}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}

              <button
                type="button"
                onClick={() =>
                  setAttachments((p) =>
                    p.filter(
                      (_, i) => i !== idx
                    )
                  )
                }
                className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/80 text-white flex items-center justify-center text-[10px]"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* VOICE RECORDING — FIXED */}
      {(isRecording || audioUrl) && (
        <div className="flex-shrink-0 px-4 py-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
          {isRecording ? (
            <>
              <div className="flex items-center gap-2 flex-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />

                <span className="text-sm font-sans text-zinc-700 dark:text-zinc-300 font-medium whitespace-nowrap">
                  Recording… {recordingSeconds}s
                </span>

                <div className="flex-1 h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-400 to-red-600 transition-all duration-1000"
                    style={{
                      width: `${
                        (recordingSeconds / 60) * 100
                      }%`,
                    }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={cancelVoice}
                className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex-shrink-0"
                title="Cancel"
              >
                <X size={16} />
              </button>

              <button
                type="button"
                onClick={stopRecording}
                className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors shadow-md flex-shrink-0"
                title="Stop & Preview"
              >
                <StopCircle size={16} />
              </button>
            </>
          ) : audioUrl ? (
            <>
              <span className="text-lg">
                🎤
              </span>

              <audio
                src={audioUrl}
                controls
                className="flex-1 h-9 rounded-full min-w-0"
              />

              <button
                type="button"
                onClick={cancelVoice}
                className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex-shrink-0"
                title="Discard"
              >
                <X size={16} />
              </button>

              <button
                type="button"
                onClick={sendVoiceMessage}
                disabled={
                  uploadingAudio || sending
                }
                className="w-10 h-10 rounded-full bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] flex items-center justify-center text-white disabled:opacity-50 transition-opacity shadow-md flex-shrink-0"
                title="Send voice message"
              >
                {uploadingAudio || sending ? (
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />
                ) : (
                  <Send size={15} />
                )}
              </button>
            </>
          ) : null}
        </div>
      )}

      {/* INPUT BAR — FIXED */}
      {!isRecording && !audioUrl && (
        <div className="flex-shrink-0 px-4 py-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2 z-20">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*,video/*"
            onChange={handleFileUpload}
            disabled={uploadingMedia}
            className="hidden"
          />

          {/* Attach */}
          <button
            type="button"
            onClick={() =>
              fileInputRef.current?.click()
            }
            disabled={uploadingMedia}
            className="w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:border-[#c8a96e] hover:text-[#c8a96e] transition-colors flex-shrink-0"
            title="Attach Photo or Video"
          >
            {uploadingMedia ? (
              <Loader2
                size={16}
                className="animate-spin text-[#c8a96e]"
              />
            ) : (
              <Paperclip size={16} />
            )}
          </button>

          {/* Message input */}
          <input
            className="flex-1 px-4 py-2.5 rounded-full border border-zinc-200 dark:border-zinc-700 text-sm font-sans outline-none focus:border-[#c8a96e] transition-colors bg-[#faf8f4] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-w-0"
            placeholder="Type a message or record voice…"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              handleTyping();
            }}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey
              ) {
                e.preventDefault();
                handleSend();
              }
            }}
          />

          {/* Voice */}
          <button
            type="button"
            onClick={startRecording}
            disabled={
              uploadingMedia || sending
            }
            className="w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:border-red-400 hover:text-red-500 transition-colors flex-shrink-0"
            title="Record voice message"
          >
            <Mic size={16} />
          </button>

          {/* Send */}
          <button
            type="button"
            onClick={handleSend}
            disabled={
              (!input.trim() &&
                attachments.length === 0) ||
              sending
            }
            className="w-10 h-10 rounded-full bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] flex items-center justify-center text-white hover:opacity-90 disabled:opacity-50 transition-opacity flex-shrink-0 shadow-md"
            title="Send message"
          >
            <Send size={15} />
          </button>
        </div>
      )}
    </div>
  );
}


