"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  SentIcon,
  Search01Icon,
  Car01Icon,
  Tick02Icon,
  TickDouble02Icon,
  BubbleChatIcon,
  Loading03Icon,
  ArrowLeft01Icon,
  UserGroupIcon,
  SecurityCheckIcon
} from "@hugeicons/core-free-icons";
import { useChatNotification } from "../../context/ChatNotificationContext";
import { getSocket, getActiveUserSession } from "../../utils/socket";

interface ClaimItem {
  claimNumber: string;
  vehiclePlate: string;
  incidentDate?: string;
  status: string;
  branch?: string;
  assignedAgent?: string;
}

interface RecipientItem {
  userId: string;
  userType: "PolicyHolder" | "Agent" | "OfficeStaff" | "Admin";
  name: string;
  email: string;
  role: string;
  branch: string;
  badgeColor?: string;
}

interface MessageItem {
  _id: string;
  conversationId: string;
  claimNumber: string;
  senderId: string;
  senderType: string;
  senderName: string;
  senderRole?: string;
  text: string;
  readBy?: { userId: string; readAt: string }[];
  createdAt: string;
}

const QUICK_REPLIES = [
  "Please review my claim documents",
  "When will the damage inspection start?",
  "All repair estimates have been submitted",
  "Thank you for the quick update!"
];

export default function ClaimChatModal() {
  const {
    isChatOpen,
    closeChat,
    selectedClaimNumber,
    userSession,
    socketConnected,
    refreshCounts
  } = useChatNotification();

  const currentSession = userSession || getActiveUserSession();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  const [claims, setClaims] = useState<ClaimItem[]>([]);
  const [activeClaim, setActiveClaim] = useState<ClaimItem | null>(null);
  const [recipients, setRecipients] = useState<RecipientItem[]>([]);
  const [activeRecipient, setActiveRecipient] = useState<RecipientItem | null>(null);

  const [conversation, setConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  // Mobile layout switcher: "list" or "chat"
  const [mobileView, setMobileView] = useState<"list" | "chat">("chat");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeConversationIdRef = useRef<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    activeConversationIdRef.current = conversation?._id || null;
  }, [conversation]);

  // 1. Fetch accessible claims
  useEffect(() => {
    if (!isChatOpen || !currentSession?.userId) return;

    const fetchClaims = async () => {
      setLoadingClaims(true);
      try {
        const res = await fetch(
          `${API_URL}/claim-chat/claims?userId=${encodeURIComponent(currentSession.userId)}&userType=${encodeURIComponent(currentSession.userType)}&branch=${encodeURIComponent(currentSession.branch || "")}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.claims)) {
            setClaims(data.claims);

            if (selectedClaimNumber) {
              const matched = data.claims.find((c: ClaimItem) => c.claimNumber === selectedClaimNumber);
              if (matched) setActiveClaim(matched);
              else if (data.claims.length > 0) setActiveClaim(data.claims[0]);
            } else if (data.claims.length > 0 && !activeClaim) {
              setActiveClaim(data.claims[0]);
            }
          }
        }
      } catch (err) {
        console.error("Error loading claims for chat:", err);
      } finally {
        setLoadingClaims(false);
      }
    };

    fetchClaims();
  }, [isChatOpen, currentSession, selectedClaimNumber, API_URL]);

  // 2. Fetch recipients when activeClaim changes
  useEffect(() => {
    if (!activeClaim || !currentSession?.userId) return;

    const fetchRecipients = async () => {
      try {
        const res = await fetch(
          `${API_URL}/claim-chat/claims/${encodeURIComponent(activeClaim.claimNumber)}/recipients?userId=${encodeURIComponent(currentSession.userId)}&userType=${encodeURIComponent(currentSession.userType)}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.recipients)) {
            setRecipients(data.recipients);
            if (data.recipients.length > 0) {
              setActiveRecipient(data.recipients[0]);
            } else {
              setActiveRecipient(null);
            }
          }
        }
      } catch (err) {
        console.error("Error loading recipients:", err);
      }
    };

    fetchRecipients();
  }, [activeClaim, currentSession, API_URL]);

  // 3. Load or create conversation when activeClaim + activeRecipient are selected
  useEffect(() => {
    if (!activeClaim || !activeRecipient || !currentSession?.userId) return;

    let isMounted = true;
    setLoadingMessages(true);

    const initConversation = async () => {
      try {
        const res = await fetch(`${API_URL}/claim-chat/conversations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            claimNumber: activeClaim.claimNumber,
            sender: {
              userId: currentSession.userId,
              userType: currentSession.userType,
              name: currentSession.name,
              email: currentSession.email,
              branch: currentSession.branch
            },
            recipient: {
              userId: activeRecipient.userId,
              userType: activeRecipient.userType,
              name: activeRecipient.name,
              email: activeRecipient.email,
              role: activeRecipient.role,
              branch: activeRecipient.branch
            },
            type: "direct"
          })
        });

        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.conversation) {
            setConversation(data.conversation);

            // Fetch history
            const resMsgs = await fetch(
              `${API_URL}/claim-chat/conversations/${data.conversation._id}/messages`,
              { cache: "no-store" }
            );
            if (resMsgs.ok && isMounted) {
              const msgsData = await resMsgs.json();
              setMessages(msgsData.messages || []);
            }

            // Mark read
            await fetch(`${API_URL}/claim-chat/conversations/${data.conversation._id}/read`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: currentSession.userId,
                userType: currentSession.userType
              })
            });

            refreshCounts();
          }
        }
      } catch (err) {
        console.error("Error initializing conversation:", err);
      } finally {
        if (isMounted) setLoadingMessages(false);
      }
    };

    initConversation();

    return () => {
      isMounted = false;
    };
  }, [activeClaim, activeRecipient, currentSession, API_URL, refreshCounts]);

  // 4. Socket.IO Real-Time listeners
  useEffect(() => {
    if (!conversation?._id) return;

    const socket = getSocket();
    if (!socket) return;

    const convId = conversation._id;
    socket.emit("join:conversation", { conversationId: convId });

    const handleNewMessage = (payload: { message: MessageItem; conversationId: string }) => {
      if (payload.conversationId === convId) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === payload.message._id)) return prev;
          return [...prev, payload.message];
        });

        if (payload.message.senderId !== currentSession?.userId) {
          fetch(`${API_URL}/claim-chat/conversations/${convId}/read`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: currentSession?.userId,
              userType: currentSession?.userType
            })
          }).then(() => refreshCounts());
        }
      }
    };

    const handleMessageRead = (payload: { conversationId: string; readByUserId: string; readAt: string }) => {
      if (payload.conversationId === convId) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.senderId === currentSession?.userId) {
              const alreadyMarked = (m.readBy || []).some((r) => r.userId === payload.readByUserId);
              if (!alreadyMarked) {
                return {
                  ...m,
                  readBy: [...(m.readBy || []), { userId: payload.readByUserId, readAt: payload.readAt }]
                };
              }
            }
            return m;
          })
        );
      }
    };

    socket.on("message:new", handleNewMessage);
    socket.on("message:read", handleMessageRead);

    return () => {
      socket.emit("leave:conversation", { conversationId: convId });
      socket.off("message:new", handleNewMessage);
      socket.off("message:read", handleMessageRead);
    };
  }, [conversation, currentSession, API_URL, refreshCounts]);

  // Send message
  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (customText || inputText).trim();
    if (!textToSend || !conversation?._id || !currentSession?.userId || sending) return;

    setInputText("");
    setSending(true);

    try {
      const res = await fetch(`${API_URL}/claim-chat/conversations/${conversation._id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: currentSession.userId,
          senderType: currentSession.userType,
          senderName: currentSession.name,
          senderEmail: currentSession.email,
          senderRole: currentSession.userType,
          text: textToSend,
          idempotencyKey: `${conversation._id}-${Date.now()}`
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setMessages((prev) => {
            if (prev.some((m) => m._id === data.message._id)) return prev;
            return [...prev, data.message];
          });
        }
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSending(false);
    }
  };

  // Filtered claims for sidebar
  const filteredClaims = useMemo(() => {
    if (!searchQuery.trim()) return claims;
    const q = searchQuery.toLowerCase();
    return claims.filter(
      (c) =>
        c.claimNumber.toLowerCase().includes(q) ||
        c.vehiclePlate.toLowerCase().includes(q) ||
        (c.branch && c.branch.toLowerCase().includes(q)) ||
        (c.status && c.status.toLowerCase().includes(q))
    );
  }, [claims, searchQuery]);

  // Recipient initials for avatar
  const getInitials = (name?: string) => {
    if (!name) return "S";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  if (!isChatOpen) return null;

  // Login Required Screen
  if (!currentSession) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-7 text-center border border-slate-200">
          <div className="w-16 h-16 bg-gradient-to-tr from-[#0284c7] to-[#00ddff] text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-sky-500/20">
            <HugeiconsIcon icon={BubbleChatIcon} className="w-8 h-8" strokeWidth={2} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Claim Messenger</h3>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Please log in with your SANASA account to start chatting with your branch staff, field agents, or policyholders.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={closeChat}
              className="px-5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Close
            </button>
            <a
              href="/Login"
              className="px-6 py-2.5 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-xl text-sm font-semibold shadow-md transition-all cursor-pointer no-underline inline-block"
            >
              Sign In
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 md:p-8 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[92vh] max-h-[820px] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200/90">
        
        {/* ── TOP LUXURY NAVY HEADER ── */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-[#0a192f] via-[#102a43] to-[#0f2d4a] text-white flex items-center justify-between shadow-sm shrink-0 border-b border-sky-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0284c7] to-[#00ddff] flex items-center justify-center text-white shadow-md shadow-sky-500/30">
              <HugeiconsIcon icon={BubbleChatIcon} className="w-5 h-5" strokeWidth={2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white tracking-wide">
                  Claim Communication Desk
                </h3>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                    socketConnected
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      socketConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                    }`}
                  />
                  {socketConnected ? "Live Connected" : "Connecting..."}
                </span>
              </div>
              <p className="text-[11px] text-sky-200/80 flex items-center gap-1.5">
                <HugeiconsIcon icon={SecurityCheckIcon} className="w-3.5 h-3.5 text-sky-400" />
                Official Real-Time Channel • SANASA General Insurance PLC
              </p>
            </div>
          </div>

          <button
            onClick={closeChat}
            className="w-9 h-9 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
            aria-label="Close Chat"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        {/* ── 2-COLUMN MESSENGER BODY ── */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* ════ LEFT COLUMN: CLAIMS LIST (Sidebar) ════ */}
          <div
            className={`w-full sm:w-80 md:w-88 bg-slate-50/90 border-r border-slate-200/90 flex flex-col shrink-0 ${
              mobileView === "chat" ? "hidden sm:flex" : "flex"
            }`}
          >
            {/* Search Claims Input */}
            <div className="p-3.5 border-b border-slate-200/80 bg-white">
              <div className="relative">
                <HugeiconsIcon
                  icon={Search01Icon}
                  className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                  strokeWidth={2}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search claims by plate or ID..."
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                />
              </div>
            </div>

            {/* Claims Scroll List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
              {loadingClaims ? (
                <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <HugeiconsIcon icon={Loading03Icon} className="w-6 h-6 animate-spin text-sky-600" />
                  <span className="text-xs">Loading active claims...</span>
                </div>
              ) : filteredClaims.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <p className="text-xs font-semibold text-slate-600">No claims found</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {searchQuery ? "Try a different search keyword" : "No claims are currently assigned"}
                  </p>
                </div>
              ) : (
                filteredClaims.map((c) => {
                  const isSelected = activeClaim?.claimNumber === c.claimNumber;
                  const statusColor =
                    c.status === "Approved"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                      : c.status === "Pending"
                      ? "bg-amber-100 text-amber-800 border-amber-200"
                      : "bg-sky-100 text-sky-800 border-sky-200";

                  return (
                    <button
                      key={c.claimNumber}
                      onClick={() => {
                        setActiveClaim(c);
                        setMobileView("chat");
                      }}
                      className={`w-full text-left p-3 rounded-2xl transition-all cursor-pointer flex items-center justify-between gap-3 border ${
                        isSelected
                          ? "bg-white border-[#0284c7] shadow-sm shadow-sky-100 ring-1 ring-sky-400/40"
                          : "bg-transparent border-transparent hover:bg-white/80 hover:border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "bg-sky-500 text-white shadow-xs"
                              : "bg-slate-200/80 text-slate-600"
                          }`}
                        >
                          <HugeiconsIcon icon={Car01Icon} className="w-5 h-5" strokeWidth={2} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-800 truncate">
                            {c.vehiclePlate || "Vehicle Claim"}
                          </h4>
                          <p className="text-[11px] font-mono text-slate-500 truncate mt-0.5">
                            {c.claimNumber}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            Branch: {c.branch || "Head Office"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}
                        >
                          {c.status}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ════ RIGHT COLUMN: CONVERSATION STREAM ════ */}
          <div
            className={`flex-1 flex flex-col bg-[#f8fafc] min-w-0 ${
              mobileView === "list" ? "hidden sm:flex" : "flex"
            }`}
          >
            {/* Conversation Header */}
            <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 py-3 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                {/* Mobile Back Button */}
                <button
                  onClick={() => setMobileView("list")}
                  className="sm:hidden p-1.5 -ml-1 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  aria-label="Back to claims"
                >
                  <HugeiconsIcon icon={ArrowLeft01Icon} className="w-5 h-5" />
                </button>

                {/* Recipient Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-600 to-cyan-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs ring-2 ring-sky-100">
                  {getInitials(activeRecipient?.name)}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {activeRecipient?.name || "Select Participant"}
                    </h3>
                    {activeRecipient?.role && (
                      <span className="text-[10px] font-semibold bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full shrink-0">
                        {activeRecipient.role}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    {activeRecipient?.email ? `${activeRecipient.email} • ` : ""}
                    Claim: <strong className="text-slate-700">{activeClaim?.claimNumber}</strong>
                  </p>
                </div>
              </div>

              {/* Claim Badge */}
              {activeClaim && (
                <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                  <span className="text-xs font-bold text-slate-700">{activeClaim.vehiclePlate}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800">
                    {activeClaim.status}
                  </span>
                </div>
              )}
            </div>

            {/* Recipient Stakeholder Switcher (Pill Tabs) */}
            {recipients.length > 0 && (
              <div className="bg-white border-b border-slate-200/60 px-4 sm:px-6 py-2 flex items-center gap-2 overflow-x-auto">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <HugeiconsIcon icon={UserGroupIcon} className="w-3.5 h-3.5 text-slate-400" />
                  Stakeholders:
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {recipients.map((r) => {
                    const isSelected = activeRecipient?.userId === r.userId;
                    return (
                      <button
                        key={r.userId}
                        onClick={() => setActiveRecipient(r)}
                        className={`text-xs px-3 py-1 rounded-full font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-[#0284c7] text-white shadow-xs"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        <span>{r.name}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-full ${
                            isSelected ? "bg-white/20 text-white" : "bg-white text-slate-500"
                          }`}
                        >
                          {r.role}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Message Stream Canvas */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 bg-slate-50/60">
              {/* Date Separator Pill */}
              <div className="flex items-center justify-center my-2">
                <span className="bg-white border border-slate-200/80 text-slate-500 text-[10px] font-semibold px-3 py-1 rounded-full shadow-2xs">
                  Official Record • Real-Time Channel
                </span>
              </div>

              {loadingMessages ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400">
                  <HugeiconsIcon icon={Loading03Icon} className="w-7 h-7 animate-spin text-sky-600" />
                  <p className="text-xs">Loading secure message history...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-3 shadow-xs border border-sky-100">
                    <HugeiconsIcon icon={BubbleChatIcon} className="w-7 h-7" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">No messages yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                    Start direct official communication with{" "}
                    <strong>{activeRecipient?.name || "the branch"}</strong> regarding claim{" "}
                    <strong>{activeClaim?.claimNumber}</strong>. Messages are delivered instantly.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === currentSession?.userId;
                  const isReadByRecipient = (msg.readBy || []).some(
                    (r) => r.userId !== currentSession?.userId
                  );

                  return (
                    <div
                      key={msg._id}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[11px] font-semibold text-slate-600">
                          {isMe ? "You" : msg.senderName}
                        </span>
                        {msg.senderRole && (
                          <span className="text-[10px] text-slate-400">({msg.senderRole})</span>
                        )}
                      </div>

                      <div
                        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-xs ${
                          isMe
                            ? "bg-gradient-to-r from-[#0284c7] to-[#0369a1] text-white rounded-tr-xs"
                            : "bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                        <div
                          className={`flex items-center justify-end gap-1 text-[10px] mt-1.5 ${
                            isMe ? "text-sky-200" : "text-slate-400"
                          }`}
                        >
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                          {isMe && (
                            <span>
                              {isReadByRecipient ? (
                                <HugeiconsIcon
                                  icon={TickDouble02Icon}
                                  className="w-3.5 h-3.5 text-cyan-300 inline"
                                  strokeWidth={2.5}
                                />
                              ) : (
                                <HugeiconsIcon
                                  icon={Tick02Icon}
                                  className="w-3.5 h-3.5 text-sky-200 inline"
                                  strokeWidth={2}
                                />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Replies Chips */}
            {(!inputText || inputText.trim().length === 0) && (
              <div className="px-4 py-1.5 bg-slate-50 border-t border-slate-200/60 flex items-center gap-2 overflow-x-auto">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
                  Quick:
                </span>
                {QUICK_REPLIES.map((text, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(undefined, text)}
                    className="text-[11px] bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-200 hover:border-sky-300 px-3 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer shadow-2xs"
                  >
                    {text}
                  </button>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <form
              onSubmit={(e) => handleSendMessage(e)}
              className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center gap-3 shrink-0"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  activeRecipient
                    ? `Write message to ${activeRecipient.name} about ${activeClaim?.claimNumber}...`
                    : "Select a participant to start messaging..."
                }
                disabled={!activeRecipient || sending}
                className="flex-1 bg-slate-50 border border-slate-200 focus:bg-white rounded-2xl px-4 py-3 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50 transition-all shadow-inner"
              />

              <button
                type="submit"
                disabled={!inputText.trim() || !activeRecipient || sending}
                className="px-5 py-3 bg-gradient-to-r from-[#0284c7] to-[#00ddff] hover:from-[#0369a1] hover:to-[#00c4e2] text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-sky-500/25 transition-all duration-150 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
              >
                {sending ? (
                  <HugeiconsIcon icon={Loading03Icon} className="w-4 h-4 animate-spin" />
                ) : (
                  <HugeiconsIcon icon={SentIcon} className="w-4 h-4" />
                )}
                <span>Send</span>
              </button>
            </form>

          </div>
        </div>

      </div>
    </div>
  );
}
