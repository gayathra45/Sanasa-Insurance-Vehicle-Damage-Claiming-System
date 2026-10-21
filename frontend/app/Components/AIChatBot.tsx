"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ChatBotIcon,
  Cancel01Icon,
  SentIcon,
  Delete02Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { API_URL } from "../config";

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  { label: "🚗 File Accident Claim", text: "How do I file a vehicle accident claim step-by-step?" },
  { label: "🛡️ Comprehensive Cover", text: "What does Sanasa Comprehensive Motor Insurance cover?" },
  { label: "📋 Required Documents", text: "What documents do I need to submit for an accident claim?" },
  { label: "🚨 24/7 Hotline", text: "What is the 24/7 Sanasa emergency accident hotline?" },
];

export default function WebAIChatBot() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      sender: "ai",
      text: "Hello! I am **Sanasa AI**, your official vehicle insurance assistant.\n\nI can help you with accident claims, comprehensive motor coverage, required documents, and 24/7 roadside assistance across Sri Lanka.\n\nHow can I help you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Avoid clashing with existing bottom-8 right-8 support chat icon on portal pages
  const hasExistingBottomChat = Boolean(
    pathname?.includes("/Agent/") ||
    pathname?.includes("/Policy_Holder/") ||
    pathname?.includes("/Office_Staff/") ||
    pathname?.includes("/Admin/")
  );

  // Aligned perfectly with existing right-8 position; stacked above with clean 12px gap
  const bottomPositionClass = hasExistingBottomChat ? "bottom-[112px] right-8" : "bottom-8 right-8";

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 80);
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSend = async (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText("");
    setIsLoading(true);
    scrollToBottom();

    try {
      const history = newMessages.slice(-8).map((m) => ({
        role: m.sender === "user" ? "user" : "model",
        text: m.text,
      }));

      const baseApi = API_URL.replace(/\/$/, "");
      const res = await fetch(`${baseApi}/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history,
          userRole: pathname?.includes("/Agent/") ? "agent" : "policy_holder",
        }),
      });

      const data = await res.json();
      const replyText =
        data.reply ||
        "I am currently unable to fetch an answer. Please dial 011-2303300 for 24/7 Sanasa Vehicle Assistance.";

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.warn("AI Chat send error:", err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: "ai",
        text: "⚠️ Connection to Sanasa AI failed. Please check your network or call the Sanasa 24/7 Accident Hotline at **011-2303300**.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: "ai",
        text: "Conversation cleared. How can I assist you with your vehicle insurance or claim?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderFormattedText = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, lIdx) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const isBullet = line.trim().startsWith("•") || line.trim().startsWith("-");
      return (
        <div key={lIdx} className={`${isBullet ? "pl-2 my-0.5" : "my-0.5"}`}>
          {parts.map((part, pIdx) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return (
                <strong key={pIdx} className="font-bold">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return part;
          })}
        </div>
      );
    });
  };

  return (
    <>
      {/* ── MATCHING FLOATING AI CHAT BUTTON ── */}
      {!isOpen && (
        <div className={`fixed ${bottomPositionClass} z-40 transition-all duration-150`}>
          <div className="relative group flex items-center justify-center">
            {/* Tooltip on hover */}
            <div className="absolute right-full mr-3 px-3 py-1.5 rounded-xl bg-slate-900/90 text-white text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-md backdrop-blur-xs flex items-center gap-1.5 border border-white/10">
              <span>Sanasa AI Assistant</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            {/* Exactly matches existing circular button dimensions, padding, shadow, and icon style */}
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              aria-label="Open Sanasa AI Assistant"
              className="bg-[#0f2d4a] hover:bg-[#0a192f] text-white p-5 rounded-full shadow-2xl transition-all duration-150 hover:scale-110 active:scale-95 cursor-pointer focus:outline-none border-none flex items-center justify-center relative"
            >
              <HugeiconsIcon icon={ChatBotIcon} className="w-7 h-7 text-white" strokeWidth={2} />
              {/* Online Green Indicator Dot */}
              <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 ring-2 ring-white animate-pulse" />
            </button>
          </div>
        </div>
      )}

      {/* ── REDESIGNED CLEAN AI CHAT WINDOW ── */}
      {isOpen && (
        <div className={`fixed ${hasExistingBottomChat ? "bottom-24 right-8" : "bottom-8 right-8"} z-50 w-[360px] sm:w-[390px] max-w-[calc(100vw-1.5rem)] h-[560px] max-h-[82vh] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200`}>
          {/* Header */}
          <div className="bg-[#0f2d4a] text-white px-4.5 py-3.5 flex items-center justify-between border-b border-white/10 select-none">
            <div className="flex items-center gap-2.5">
              <div className="relative w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/15">
                <HugeiconsIcon icon={ChatBotIcon} className="w-5 h-5 text-sky-300" strokeWidth={2} />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0f2d4a]" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <h3 className="font-bold text-xs text-white">Sanasa AI Assistant</h3>
                  <span className="text-[10px] text-sky-400 font-bold">✓</span>
                </div>
                <p className="text-[10px] text-slate-300 font-normal">
                  Vehicle Insurance Specialist • Online
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={clearChat}
                title="Clear chat"
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer border-none"
              >
                <HugeiconsIcon icon={Delete02Icon} className="w-4 h-4 text-slate-300" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close chat"
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-rose-600/80 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer border-none"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4 text-white" strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Quick Prompts Bar */}
          <div className="bg-slate-50/80 border-b border-slate-100 px-3 py-2 overflow-x-auto flex gap-1.5 no-scrollbar">
            {QUICK_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(p.text)}
                disabled={isLoading}
                className="shrink-0 text-[10.5px] font-semibold bg-white border border-slate-200/90 hover:border-sky-400 hover:bg-sky-50 text-slate-700 hover:text-sky-900 px-2.5 py-1 rounded-full transition-all cursor-pointer shadow-2xs"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 bg-[#f8fafc]">
            {messages.map((m) => {
              const isUser = m.sender === "user";
              return (
                <div
                  key={m.id}
                  className={`flex items-end gap-1.5 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div className="w-6 h-6 rounded-full bg-sky-100 border border-sky-200 flex items-center justify-center text-[10px] shrink-0 mb-0.5">
                      <HugeiconsIcon icon={ChatBotIcon} className="w-3.5 h-3.5 text-sky-600" strokeWidth={2} />
                    </div>
                  )}
                  <div
                    className={`max-w-[84%] px-3.5 py-2.5 rounded-2xl text-[12px] leading-relaxed ${
                      isUser
                        ? "bg-[#0f2d4a] text-white rounded-br-xs shadow-xs"
                        : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs shadow-xs"
                    }`}
                  >
                    {renderFormattedText(m.text)}
                    <div
                      className={`text-[9px] mt-1 text-right ${
                        isUser ? "text-slate-400" : "text-slate-400"
                      }`}
                    >
                      {m.timestamp}
                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-sky-100 border border-sky-200 flex items-center justify-center text-[10px] shrink-0">
                  <HugeiconsIcon icon={ChatBotIcon} className="w-3.5 h-3.5 text-sky-600 animate-pulse" strokeWidth={2} />
                </div>
                <div className="bg-white border border-slate-200 text-slate-500 px-3.5 py-2 rounded-2xl text-xs rounded-bl-xs flex items-center gap-1.5 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-bounce [animation-delay:0.4s]" />
                  <span className="text-[11px] font-medium text-slate-400 ml-1">
                    Sanasa AI is thinking...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Clean Input Bar */}
          <div className="p-2.5 bg-white border-t border-slate-100">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-3.5 py-1.5 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100 transition-all">
              <textarea
                ref={inputRef}
                rows={1}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about vehicle insurance, claims..."
                className="flex-1 bg-transparent border-none outline-none text-xs text-slate-800 placeholder:text-slate-400 resize-none max-h-20 py-1"
              />
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!inputText.trim() || isLoading}
                aria-label="Send message"
                className="w-7 h-7 rounded-full bg-[#0f2d4a] hover:bg-sky-600 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer border-none shrink-0 shadow-xs"
              >
                <HugeiconsIcon icon={SentIcon} className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
              </button>
            </div>
            <p className="text-[9.5px] text-slate-400 text-center mt-1.5 font-medium select-none">
              Sanasa General Insurance PLC • Motor & Vehicle AI
            </p>
          </div>
        </div>
      )}
    </>
  );
}
