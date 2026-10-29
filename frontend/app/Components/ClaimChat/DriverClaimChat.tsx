"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  BubbleChatIcon,
  UserIcon,
  Building04Icon,
  ShieldCheckIcon,
  ArrowUp01Icon,
  Attachment01Icon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  TickDouble02Icon,
  Call02Icon,
  Car01Icon,
  File01Icon,
  Camera01Icon,
  Loading03Icon
} from "@hugeicons/core-free-icons";

interface Recipient {
  userId: string;
  userType: "PolicyHolder" | "Agent" | "OfficeStaff";
  name: string;
  email: string;
  role: string;
  branch?: string;
  profilePhoto?: string;
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
  attachments?: {
    name: string;
    url: string;
    fileType: string;
    size?: number;
  }[];
  createdAt: string;
}

interface DriverClaimChatProps {
  apiUrl: string;
  driverSessionToken: string;
  driverProfile: {
    driverName: string;
    driverNicRaw?: string;
    driverNicMasked: string;
    driverPhone: string;
    policyHolderName: string;
    policyHolderNicRaw?: string;
    policyHolderEmail?: string;
    policyHolderPhone?: string;
    branch: string;
    reference: string;
  };
  claims: {
    claimNumber: string;
    vehiclePlate: string;
    status: string;
    damageType?: string;
  }[];
  initialClaimNumber?: string;
}

export default function DriverClaimChat({
  apiUrl,
  driverSessionToken,
  driverProfile,
  claims,
  initialClaimNumber
}: DriverClaimChatProps) {
  // Available chat references (all claims + active driver authorization reference)
  const availableReferences = React.useMemo(() => {
    const list = claims.map((c) => ({
      id: c.claimNumber,
      label: `Claim: ${c.claimNumber} (${c.vehiclePlate})`,
      plate: c.vehiclePlate,
      status: c.status
    }));

    // Always ensure the authorized driver reference is available even if no claim filed
    list.unshift({
      id: driverProfile.reference,
      label: `Authorization: ${driverProfile.reference} (${driverProfile.branch} Branch)`,
      plate: "Authorized Vehicles",
      status: "Authorized Driver"
    });

    return list;
  }, [claims, driverProfile]);

  const [selectedClaimNumber, setSelectedClaimNumber] = useState<string>(
    initialClaimNumber || availableReferences[0]?.id || driverProfile.reference
  );

  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const driverId = driverProfile.driverNicRaw || driverProfile.driverNicMasked || driverProfile.reference;

  // 1. Fetch eligible recipients for the selected claim/reference
  const fetchRecipients = useCallback(async (claimNum: string) => {
    try {
      const res = await fetch(
        `${apiUrl}/claim-chat/claims/${encodeURIComponent(claimNum)}/recipients?userId=${encodeURIComponent(driverId)}&userType=ThirdParty`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.recipients && data.recipients.length > 0) {
          setRecipients(data.recipients);
          setSelectedRecipient(data.recipients[0]);
          return data.recipients;
        }
      }
    } catch (err) {
      console.warn("fetchRecipients error:", err);
    }

    // Fallback default recipients synthesized from driver profile
    const fallbacks: Recipient[] = [
      {
        userId: driverProfile.policyHolderNicRaw || "owner",
        userType: "PolicyHolder",
        name: driverProfile.policyHolderName,
        email: driverProfile.policyHolderEmail || "",
        role: "Vehicle Owner (Policyholder)",
        branch: driverProfile.branch,
        badgeColor: "bg-indigo-100 text-indigo-800"
      },
      {
        userId: driverProfile.branch || "Galle",
        userType: "OfficeStaff",
        name: `${driverProfile.branch || "Galle"} Branch Office`,
        email: "",
        role: "Branch Officer",
        branch: driverProfile.branch || "Galle",
        badgeColor: "bg-blue-100 text-blue-800"
      }
    ];

    setRecipients(fallbacks);
    setSelectedRecipient(fallbacks[0]);
    return fallbacks;
  }, [apiUrl, driverId, driverProfile]);

  // 2. Fetch or create direct conversation with the selected recipient
  const initConversation = useCallback(async (claimNum: string, targetRecipient: Recipient) => {
    setLoadingMessages(true);
    try {
      const convRes = await fetch(`${apiUrl}/claim-chat/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimNumber: claimNum,
          type: "direct",
          sender: {
            userId: driverId,
            userType: "ThirdParty",
            name: driverProfile.driverName,
            role: "Authorized Driver",
            branch: driverProfile.branch
          },
          recipient: {
            userId: targetRecipient.userId,
            userType: targetRecipient.userType,
            name: targetRecipient.name,
            email: targetRecipient.email,
            role: targetRecipient.role,
            branch: targetRecipient.branch || driverProfile.branch
          }
        })
      });

      if (convRes.ok) {
        const convData = await convRes.json();
        setConversation(convData.conversation);

        // Fetch messages for this conversation
        const msgRes = await fetch(
          `${apiUrl}/claim-chat/conversations/${convData.conversation._id}/messages?userId=${encodeURIComponent(driverId)}`
        );
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          setMessages(msgData.messages || []);
        }
      }
    } catch (err) {
      console.warn("initConversation error:", err);
    } finally {
      setLoadingMessages(false);
    }
  }, [apiUrl, driverId, driverProfile]);

  // On claim or recipient change, load conversation
  useEffect(() => {
    fetchRecipients(selectedClaimNumber).then((recs) => {
      const current = recs?.find((r: Recipient) => r.userId === selectedRecipient?.userId) || recs?.[0];
      if (current) {
        setSelectedRecipient(current);
        initConversation(selectedClaimNumber, current);
      }
    });
  }, [selectedClaimNumber, fetchRecipients]);

  useEffect(() => {
    if (selectedRecipient && selectedClaimNumber) {
      initConversation(selectedClaimNumber, selectedRecipient);
    }
  }, [selectedRecipient, selectedClaimNumber, initConversation]);

  // Polling for new incoming messages every 3.5 seconds
  useEffect(() => {
    if (!conversation?._id) return;

    const interval = setInterval(async () => {
      try {
        const msgRes = await fetch(
          `${apiUrl}/claim-chat/conversations/${conversation._id}/messages?userId=${encodeURIComponent(driverId)}`
        );
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          if (Array.isArray(msgData.messages)) {
            setMessages(msgData.messages);
          }
        }
      } catch (err) {
        // silent polling catch
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [conversation?._id, apiUrl, driverId]);

  // Send Message
  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend || !conversation?._id || !selectedRecipient) return;

    setSending(true);
    setInputText("");

    const optimisticMsg: MessageItem = {
      _id: `temp-${Date.now()}`,
      conversationId: conversation._id,
      claimNumber: selectedClaimNumber,
      senderId: driverId,
      senderType: "ThirdParty",
      senderName: driverProfile.driverName,
      senderRole: "Authorized Driver",
      text: textToSend,
      createdAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await fetch(`${apiUrl}/claim-chat/conversations/${conversation._id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: driverId,
          senderType: "ThirdParty",
          senderName: driverProfile.driverName,
          senderRole: "Authorized Driver",
          senderEmail: driverProfile.driverPhone,
          recipientId: selectedRecipient.userId,
          recipientType: selectedRecipient.userType,
          recipientName: selectedRecipient.name,
          recipientEmail: selectedRecipient.email,
          text: textToSend
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setMessages((prev) =>
            prev.map((m) => (m._id === optimisticMsg._id ? data.message : m))
          );
        }
      }
    } catch (err) {
      console.error("handleSendMessage error:", err);
    } finally {
      setSending(false);
    }
  };

  const getRecipientIcon = (type: string) => {
    if (type === "PolicyHolder") return UserIcon;
    if (type === "Agent") return ShieldCheckIcon;
    return Building04Icon;
  };

  return (
    <div className="bg-white rounded-[28px] border border-slate-200/90 shadow-sm overflow-hidden flex flex-col lg:flex-row h-[720px]">
      
      {/* ========================================================================= */}
      {/* LEFT SIDEBAR: Reference/Claim Selector & Recipient Channels */}
      {/* ========================================================================= */}
      <div className="w-full lg:w-80 bg-slate-50 border-r border-slate-200/80 flex flex-col shrink-0">
        
        {/* Desk Header */}
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Driver Live Support Desk</h3>
          </div>
          <p className="text-[11px] text-slate-500">
            Communicate directly with vehicle owner, assigned claims agent & branch.
          </p>
        </div>

        {/* Claim / Reference Selector */}
        <div className="p-3 border-b border-slate-200/80 bg-slate-100/60">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Active Insurance Context:
          </label>
          <select
            value={selectedClaimNumber}
            onChange={(e) => setSelectedClaimNumber(e.target.value)}
            className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
          >
            {availableReferences.map((ref) => (
              <option key={ref.id} value={ref.id}>
                {ref.label}
              </option>
            ))}
          </select>
        </div>

        {/* Recipients List */}
        <div className="p-3 flex-1 overflow-y-auto space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 block mb-1">
            Available Contacts:
          </span>

          {recipients.map((rec) => {
            const isSelected = selectedRecipient?.userId === rec.userId;
            const IconComponent = getRecipientIcon(rec.userType);

            return (
              <button
                key={rec.userId}
                onClick={() => setSelectedRecipient(rec)}
                className={`w-full p-3 rounded-2xl text-left border transition-all cursor-pointer flex items-center gap-3 ${
                  isSelected
                    ? "bg-[#0B1E32] text-white border-[#0B1E32] shadow-md"
                    : "bg-white text-slate-800 border-slate-200/70 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isSelected ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <HugeiconsIcon icon={IconComponent} className="w-5 h-5" strokeWidth={2} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="font-bold text-xs truncate">{rec.name}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : rec.userType === "PolicyHolder"
                          ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                          : rec.userType === "Agent"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-sky-50 text-sky-700 border border-sky-200"
                      }`}
                    >
                      {rec.userType === "PolicyHolder" ? "Owner" : rec.userType === "Agent" ? "Agent" : "Branch"}
                    </span>
                  </div>
                  <p className={`text-[11px] truncate ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                    {rec.role || rec.userType}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Driver Quick Badge */}
        <div className="p-3 border-t border-slate-200/80 bg-white text-xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
            {driverProfile.driverName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-bold text-slate-800 block text-xs truncate">{driverProfile.driverName}</span>
            <span className="text-[10px] text-amber-600 font-semibold block">Authorized Third-Party Driver</span>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* RIGHT MAIN CHAT AREA */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col bg-slate-50/50">
        
        {/* Chat Active Recipient Header */}
        <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-100 text-[#0284c7] flex items-center justify-center font-bold text-sm shrink-0">
              {selectedRecipient?.name.charAt(0).toUpperCase() || "C"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-900 text-sm">{selectedRecipient?.name}</h4>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-semibold text-emerald-600">Online Channel</span>
              </div>
              <p className="text-xs text-slate-500">
                {selectedRecipient?.role} • {selectedRecipient?.branch || driverProfile.branch} Branch
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
              Ref: {selectedClaimNumber}
            </span>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {loadingMessages ? (
            <div className="h-full flex items-center justify-center text-slate-400 gap-2">
              <HugeiconsIcon icon={Loading03Icon} className="w-5 h-5 animate-spin" />
              <span className="text-xs font-semibold">Connecting secure claim chat channel...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
              <div className="w-12 h-12 rounded-full bg-sky-50 text-[#0284c7] flex items-center justify-center mb-3">
                <HugeiconsIcon icon={BubbleChatIcon} className="w-6 h-6" strokeWidth={2} />
              </div>
              <h5 className="font-bold text-slate-700 text-sm mb-1">Direct Secure Communication Channel</h5>
              <p className="text-xs text-slate-500 max-w-sm text-center">
                Start a live conversation with {selectedRecipient?.name} regarding vehicle operation, accident updates, or inspection status.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = String(msg.senderId) === String(driverId) || msg.senderType === "ThirdParty";
              return (
                <div
                  key={msg._id}
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[85%] ${
                    isMe ? "ml-auto" : "mr-auto"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[10px] font-semibold text-slate-500">
                      {isMe ? "You (Authorized Driver)" : msg.senderName || selectedRecipient?.name}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <div
                    className={`px-4 py-2.5 rounded-2xl text-xs md:text-sm shadow-2xs leading-relaxed ${
                      isMe
                        ? "bg-[#0284c7] text-white rounded-tr-none font-medium"
                        : "bg-white text-slate-800 border border-slate-200/80 rounded-tl-none font-normal"
                    }`}
                  >
                    {msg.text}

                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/20 space-y-1">
                        {msg.attachments.map((att, i) => (
                          <a
                            key={i}
                            href={att.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-[11px] underline text-sky-100 hover:text-white"
                          >
                            <HugeiconsIcon icon={File01Icon} className="w-3.5 h-3.5" />
                            <span>{att.name || "Attachment"}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Pre-composed Questions */}
        <div className="px-4 py-2 bg-slate-100/70 border-t border-slate-200/80 flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Quick Message:</span>
          {[
            "Accident photos have been uploaded for review.",
            "Vehicle has minor front bumper damage.",
            "Please confirm repair approval date.",
            "Vehicle inspection successfully completed."
          ].map((quick, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(quick)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 shrink-0 cursor-pointer font-medium transition-all"
            >
              {quick}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={`Message ${selectedRecipient?.name || "recipient"}...`}
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs md:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || sending}
            className="w-11 h-11 rounded-2xl bg-[#0284c7] hover:bg-[#0369a1] disabled:opacity-50 text-white flex items-center justify-center shrink-0 border-none cursor-pointer shadow-md hover:scale-105 active:scale-95 transition-all"
          >
            {sending ? (
              <HugeiconsIcon icon={Loading03Icon} className="w-5 h-5 animate-spin" />
            ) : (
              <HugeiconsIcon icon={ArrowUp01Icon} className="w-5 h-5" strokeWidth={2.5} />
            )}
          </button>
        </div>

      </div>

    </div>
  );
}
