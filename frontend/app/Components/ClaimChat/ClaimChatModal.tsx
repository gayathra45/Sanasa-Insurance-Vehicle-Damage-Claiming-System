"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  Search01Icon,
  Car01Icon,
  Building01Icon,
  UserGroupIcon,
  ShieldUserIcon,
  Tick02Icon,
  TickDouble02Icon,
  BubbleChatIcon,
  Time02Icon,
  Loading03Icon,
  ArrowLeft01Icon,
  ArrowUp01Icon,
  Attachment01Icon,
  File01Icon,
  Image01Icon,
  Download01Icon
} from "@hugeicons/core-free-icons";
import { useChatNotification } from "../../context/ChatNotificationContext";
import { getSocket, getActiveUserSession } from "../../utils/socket";

interface MessageAttachment {
  name: string;
  url: string;
  fileType: string;
  size?: number;
}

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
  profilePhoto?: string;
  badgeColor?: string;
}

interface BranchItem {
  id: string;
  name: string;
  branch: string;
  email: string;
  profilePhoto?: string;
  role: string;
}

interface AgentItem {
  id: string;
  name: string;
  email: string;
  branch: string;
  agentId?: string;
  profilePhoto?: string;
  role: string;
}

interface RecentAgentChat {
  conversationId: string;
  claimNumber: string;
  vehiclePlate?: string;
  agent: {
    userId: string;
    userType: "Agent";
    name: string;
    email: string;
    role: string;
    branch?: string;
    profilePhoto?: string;
  };
  lastMessage?: {
    text: string;
    senderName?: string;
    sentAt?: string;
  };
  unreadCount: number;
  updatedAt: string;
}

interface MessageItem {
  _id: string;
  conversationId: string;
  claimNumber: string;
  senderId: string;
  senderType: string;
  senderName: string;
  senderRole?: string;
  senderPhoto?: string;
  text: string;
  attachments?: MessageAttachment[];
  readBy?: { userId: string; readAt: string }[];
  createdAt: string;
}

interface RecentConversationItem {
  _id: string;
  claimNumber: string;
  vehiclePlate?: string;
  type?: string;
  participants?: any[];
  otherParticipant: {
    userId: string;
    userType: "PolicyHolder" | "Agent" | "OfficeStaff" | "Admin";
    name: string;
    email: string;
    role?: string;
    branch?: string;
    profilePhoto?: string;
  };
  lastMessage?: {
    text: string;
    senderId?: string;
    senderType?: string;
    senderName?: string;
    sentAt?: string;
  };
  unreadCount: number;
  updatedAt: string;
}

interface AdminItem {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  status: string;
  branch: string;
  profilePhoto?: string;
  role: string;
}

interface PendingAttachment {
  name: string;
  fileType: string;
  size: number;
  data: string;
  previewUrl?: string;
}

type MainCategory = "recent" | "claims" | "branches" | "agents" | "admin";

const CHAT_WALLPAPER_SVG = `data:image/svg+xml,%3Csvg width='220' height='220' viewBox='0 0 220 220' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cg opacity='0.25' stroke='%23475569' stroke-width='1.3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M22 26c0-5 4-9 9-9h20c5 0 9 4 9 9v10c0 5-4 9-9 9H29l-7 6V26z'/%3E%3Ccircle cx='32' cy='31' r='1' fill='%23475569'/%3E%3Ccircle cx='41' cy='31' r='1' fill='%23475569'/%3E%3Ccircle cx='50' cy='31' r='1' fill='%23475569'/%3E%3Cpath d='M145 18l15 5v12c0 10-8 18-15 21-7-3-15-11-15-21V23l15-5z'/%3E%3Cpath d='M141 36l3 3 6-7'/%3E%3Cpath d='M74 98l4-10c1-3 4-5 7-5h18c3 0 6 2 7 5l4 10H74zm-3 0h44c2 0 3 2 3 4v5c0 1-1 2-2 2h-2m-40 0h-2c-1 0-2-1-2-2v-5c0-2 1-4 3-4z'/%3E%3Ccircle cx='80' cy='109' r='3'/%3E%3Ccircle cx='112' cy='109' r='3'/%3E%3Cpath d='M168 112c0-10 8-18 18-18s18 8 18 18h-36zm18-18v-4m0 22v11c0 3-3 5-6 5'/%3E%3Cpath d='M28 140h16l8 8v24c0 2-2 4-4 4H28c-2 0-4-2-4-4v-28c0-2 2-4 4-4z'/%3E%3Cpath d='M44 140v8h8m-22 6h12m-12 6h12m-12 6h8'/%3E%3Crect x='120' y='164' width='18' height='14' rx='3'/%3E%3Cpath d='M124 164v-5c0-3 2-5 5-5s5 2 5 5v5'/%3E%3Ccircle cx='129' cy='171' r='1.5' fill='%23475569'/%3E%3Ccircle cx='80' cy='192' r='8'/%3E%3Cpath d='M77 192l2 2 5-5'/%3E%3Cpath d='M192 188c-3-4-9-3-11 1-3 5 1 11 11 16 10-5 14-11 11-16-2-4-8-5-11-1z'/%3E%3Ccircle cx='105' cy='40' r='1.5' fill='%23475569'/%3E%3Ccircle cx='155' cy='140' r='1.5' fill='%23475569'/%3E%3Ccircle cx='200' cy='55' r='1.5' fill='%23475569'/%3E%3Ccircle cx='40' cy='105' r='1.5' fill='%23475569'/%3E%3Cpath d='M135 95h4m-2-2v4'/%3E%3Cpath d='M20 70h4m-2-2v4'/%3E%3C/g%3E%3C/svg%3E`;

export const getAvatarUrl = (rawUrl?: string | null) => {
  if (!rawUrl) return "";
  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://") || rawUrl.startsWith("data:")) return rawUrl;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, "") || "http://localhost:5000";
  return `${baseUrl}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
};

export const getInitials = (name?: string) => {
  if (!name) return "S";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

function UserAvatar({
  photo,
  name,
  className = "w-10 h-10 rounded-2xl text-xs",
  fallbackBg = "bg-slate-100 text-slate-700",
  alt = "User Avatar"
}: {
  photo?: string | null;
  name?: string;
  className?: string;
  fallbackBg?: string;
  alt?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const url = getAvatarUrl(photo);

  useEffect(() => {
    setImgError(false);
  }, [photo]);

  if (url && !imgError) {
    return (
      <img
        src={url}
        alt={alt || name || "Avatar"}
        onError={() => setImgError(true)}
        className={`${className} object-cover shrink-0 select-none`}
      />
    );
  }

  return (
    <div className={`${className} ${fallbackBg} flex items-center justify-center font-bold shrink-0 select-none`}>
      {getInitials(name)}
    </div>
  );
}

export default function ClaimChatModal() {
  const {
    isChatOpen,
    closeChat,
    selectedClaimNumber,
    userSession,
    refreshCounts
  } = useChatNotification();

  const currentSession = userSession || getActiveUserSession();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  const isPolicyHolder = currentSession?.userType === "PolicyHolder";
  const isBranchOrAdmin =
    currentSession?.userType === "OfficeStaff" ||
    currentSession?.userType === "Admin" ||
    currentSession?.userType === "Agent";

  // Left sidebar category: "recent" | "claims" | "branches" | "agents" | "admin"
  const [activeCategory, setActiveCategory] = useState<MainCategory>("recent");

  const [recentConversations, setRecentConversations] = useState<RecentConversationItem[]>([]);
  const [loadingRecentConversations, setLoadingRecentConversations] = useState(false);

  const [claims, setClaims] = useState<ClaimItem[]>([]);
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [admins, setAdmins] = useState<AdminItem[]>([]);
  const [recentAgentChats, setRecentAgentChats] = useState<RecentAgentChat[]>([]);

  const [activeClaim, setActiveClaim] = useState<ClaimItem | null>(null);
  const [recipients, setRecipients] = useState<RecipientItem[]>([]);
  const [activeRecipient, setActiveRecipient] = useState<RecipientItem | null>(null);

  const [conversation, setConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [loadingAgentChats, setLoadingAgentChats] = useState(false);
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

  // 1. Fetch claims
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
              if (matched) {
                setActiveClaim(matched);
                setActiveCategory("claims");
              }
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

  // 2. Fetch Directory (Branches & All Agents)
  useEffect(() => {
    if (!isChatOpen) return;

    const fetchDirectory = async () => {
      setLoadingDirectory(true);
      try {
        const res = await fetch(`${API_URL}/claim-chat/directory`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.branches)) setBranches(data.branches);
          if (Array.isArray(data.agents)) setAgents(data.agents);
          if (Array.isArray(data.admins)) setAdmins(data.admins);
        }
      } catch (err) {
        console.error("Error loading directory:", err);
      } finally {
        setLoadingDirectory(false);
      }
    };

    fetchDirectory();
  }, [isChatOpen, API_URL]);

  // 3. Fetch All Recent Conversations (Applies to all users, all categories)
  const fetchRecentConversations = useCallback(async () => {
    if (!currentSession?.userId) return;
    setLoadingRecentConversations(true);
    setLoadingAgentChats(true);
    try {
      const res = await fetch(
        `${API_URL}/claim-chat/conversations?userId=${encodeURIComponent(currentSession.userId)}&userType=${encodeURIComponent(currentSession.userType)}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.conversations)) {
          // Sort strictly by latest message / update time in descending order (most recent first)
          const sorted = [...data.conversations].sort((a: any, b: any) => {
            const timeA = new Date(a.lastMessage?.sentAt || a.updatedAt || 0).getTime();
            const timeB = new Date(b.lastMessage?.sentAt || b.updatedAt || 0).getTime();
            return timeB - timeA;
          });

          setRecentConversations(sorted);

          // Also populate recentAgentChats for the Agents tab
          const agentList: RecentAgentChat[] = sorted
            .filter((c: any) => {
              const other = c.otherParticipant;
              return (
                other &&
                (other.userType === "Agent" ||
                  other.role?.toLowerCase().includes("agent"))
              );
            })
            .map((c: any) => ({
              conversationId: c._id,
              claimNumber: c.claimNumber,
              vehiclePlate: c.vehiclePlate,
              agent: {
                userId: c.otherParticipant.userId,
                userType: "Agent" as const,
                name: c.otherParticipant.name,
                email: c.otherParticipant.email,
                role: c.otherParticipant.role || "Field Agent",
                branch: c.otherParticipant.branch || ""
              },
              lastMessage: c.lastMessage,
              unreadCount: c.unreadCount || 0,
              updatedAt: c.updatedAt || c.lastMessage?.sentAt || new Date().toISOString()
            }));

          setRecentAgentChats(agentList);
        }
      }
    } catch (err) {
      console.error("Error loading recent conversations:", err);
    } finally {
      setLoadingRecentConversations(false);
      setLoadingAgentChats(false);
    }
  }, [currentSession, API_URL]);

  // Whenever chat modal is opened or closed, reset stale chat state and default to Recent
  useEffect(() => {
    if (isChatOpen) {
      if (selectedClaimNumber) {
        setActiveCategory("claims");
        setMobileView("chat");
      } else {
        setActiveCategory("recent");
        setActiveClaim(null);
        setActiveRecipient(null);
        setConversation(null);
        setMessages([]);
        setMobileView("list");
      }
      setSearchQuery("");
      fetchRecentConversations();
    } else {
      setActiveClaim(null);
      setActiveRecipient(null);
      setConversation(null);
      setMessages([]);
      setSearchQuery("");
      setActiveCategory("recent");
    }
  }, [isChatOpen, selectedClaimNumber, fetchRecentConversations]);

  // 4. Fetch recipients ONLY when in claims category and activeClaim is a real claim
  useEffect(() => {
    if (activeCategory !== "claims" || !activeClaim || !activeClaim.claimNumber?.startsWith("CLM") || !currentSession?.userId) {
      setRecipients([]);
      return;
    }

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
            if (data.recipients.length > 0 && !activeRecipient && (activeCategory === "claims" || selectedClaimNumber)) {
              setActiveRecipient(data.recipients[0]);
            }
          }
        }
      } catch (err) {
        console.error("Error loading recipients:", err);
      }
    };

    fetchRecipients();
  }, [activeCategory, activeClaim, currentSession, API_URL, selectedClaimNumber]);

  // 5. Load or create conversation when activeClaim + activeRecipient are selected
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

            // Fetch message history
            const resMsgs = await fetch(
              `${API_URL}/claim-chat/conversations/${data.conversation._id}/messages`,
              { cache: "no-store" }
            );
            if (resMsgs.ok && isMounted) {
              const msgsData = await resMsgs.json();
              setMessages(msgsData.messages || []);
            }

            // Mark conversation as read
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

  // 6. Global Socket.IO Listener for real-time conversation updates & unread counts
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !currentSession?.userId) return;

    const handleConvUpdated = (data: {
      conversationId: string;
      claimNumber: string;
      vehiclePlate?: string;
      lastMessage: any;
      updatedAt: string;
    }) => {
      setRecentConversations((prev) => {
        const idx = prev.findIndex((c) => c._id === data.conversationId);
        const isOpen = conversation?._id === data.conversationId;

        if (idx >= 0) {
          const item = prev[idx];
          const updated: RecentConversationItem = {
            ...item,
            lastMessage: data.lastMessage,
            unreadCount: isOpen ? 0 : (item.unreadCount || 0) + 1,
            updatedAt: data.updatedAt || data.lastMessage?.sentAt || new Date().toISOString()
          };
          const rest = prev.filter((_, i) => i !== idx);
          // Newest message moves directly to the very top of the list!
          return [updated, ...rest];
        } else {
          // If conversation isn't loaded yet, re-fetch all
          fetchRecentConversations();
          return prev;
        }
      });
      refreshCounts();
    };

    socket.on("conversation:updated", handleConvUpdated);

    return () => {
      socket.off("conversation:updated", handleConvUpdated);
    };
  }, [conversation, currentSession, fetchRecentConversations, refreshCounts]);

  // 7. Active Conversation Room Socket Listener
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

        // Move to the top of recent conversations
        setRecentConversations((prev) => {
          const idx = prev.findIndex((c) => c._id === convId);
          if (idx >= 0) {
            const item = prev[idx];
            const updated: RecentConversationItem = {
              ...item,
              lastMessage: {
                text: payload.message.text,
                senderId: payload.message.senderId,
                senderName: payload.message.senderName,
                sentAt: payload.message.createdAt
              },
              unreadCount: 0,
              updatedAt: payload.message.createdAt || new Date().toISOString()
            };
            const rest = prev.filter((_, i) => i !== idx);
            return [updated, ...rest];
          }
          return prev;
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
  }, [conversation, currentSession, API_URL, refreshCounts, fetchRecentConversations]);

  // File selection handler for attachments (Images + Documents)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      // 10MB limit per file
      if (file.size > 10 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds the 10MB upload limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;
        setPendingAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            fileType: file.type || "application/octet-stream",
            size: file.size,
            data: base64Data,
            previewUrl: file.type.startsWith("image/") ? base64Data : undefined
          }
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePendingAttachment = (index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Send message with optional text and attachments
  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (customText || inputText).trim();
    if ((!textToSend && pendingAttachments.length === 0) || !conversation?._id || !currentSession?.userId || sending) return;

    const attachmentsToSend = [...pendingAttachments];
    setInputText("");
    setPendingAttachments([]);
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
          senderPhoto: currentSession.profilePhoto || "",
          text: textToSend,
          attachments: attachmentsToSend.map((att) => ({
            name: att.name,
            url: att.data,
            fileType: att.fileType,
            size: att.size
          })),
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
          fetchRecentConversations();
        }
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSending(false);
    }
  };

  // Total unread count across all recent conversations
  const totalRecentUnread = useMemo(() => {
    return recentConversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  }, [recentConversations]);

  // Context-aware quick reply options based on active category / recipient
  const currentQuickReplies = useMemo(() => {
    if (activeCategory === "claims") {
      return [
        "Please review my claim documents",
        "When will the damage inspection start?",
        "All repair estimates have been submitted",
        "Thank you for the quick update!"
      ];
    }
    if (activeCategory === "branches" || activeRecipient?.userType === "OfficeStaff") {
      return [
        "Hello, checking in on branch coordination",
        "Please verify regional branch documents",
        "Urgent operational request from our desk",
        "Thank you for the update!"
      ];
    }
    if (activeCategory === "admin" || activeRecipient?.userType === "Admin") {
      return [
        "Requesting administrative guidance",
        "Document approval status update",
        "Urgent escalation to Head Office",
        "Thank you for the assistance!"
      ];
    }
    if (activeCategory === "agents" || activeRecipient?.userType === "Agent") {
      return [
        "Please confirm inspection schedule",
        "Awaiting on-site damage assessment",
        "Photos and estimates received",
        "Thank you for the update!"
      ];
    }
    return [
      "Hello, following up on our discussion",
      "Please let me know when you are available",
      "Documents have been sent for your review",
      "Thank you!"
    ];
  }, [activeCategory, activeRecipient]);

  // Format date/time for recent messages
  const formatRecentTime = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // All Recent Conversations (sorted by latest date/time, unfiltered by category)
  const filteredRecentConversations = useMemo(() => {
    const sorted = [...recentConversations].sort((a, b) => {
      const timeA = new Date(a.lastMessage?.sentAt || a.updatedAt || 0).getTime();
      const timeB = new Date(b.lastMessage?.sentAt || b.updatedAt || 0).getTime();
      return timeB - timeA;
    });

    if (!searchQuery.trim()) return sorted;
    const q = searchQuery.toLowerCase();
    return sorted.filter((c) => {
      const name = c.otherParticipant?.name?.toLowerCase() || "";
      const branch = c.otherParticipant?.branch?.toLowerCase() || "";
      const role = c.otherParticipant?.role?.toLowerCase() || "";
      const claim = c.claimNumber?.toLowerCase() || "";
      const plate = c.vehiclePlate?.toLowerCase() || "";
      const text = c.lastMessage?.text?.toLowerCase() || "";
      return (
        name.includes(q) ||
        branch.includes(q) ||
        role.includes(q) ||
        claim.includes(q) ||
        plate.includes(q) ||
        text.includes(q)
      );
    });
  }, [recentConversations, searchQuery]);

  // Handler for selecting any recent conversation
  const handleSelectRecentConversation = async (conv: RecentConversationItem) => {
    // Recent chats must never show claim stakeholder tabs
    setRecipients([]);

    const isRealClaim = conv.claimNumber && conv.claimNumber.startsWith("CLM");
    const matchedClaim = claims.find((c) => c.claimNumber === conv.claimNumber);

    if (isRealClaim && matchedClaim) {
      setActiveClaim(matchedClaim);
    } else {
      setActiveClaim({
        claimNumber: conv.claimNumber || "DIRECT",
        vehiclePlate: conv.vehiclePlate || "",
        status: "",
        branch: conv.otherParticipant?.branch || ""
      });
    }

    if (conv.otherParticipant) {
      setActiveRecipient({
        userId: conv.otherParticipant.userId,
        userType: conv.otherParticipant.userType,
        name: conv.otherParticipant.name,
        email: conv.otherParticipant.email,
        role: conv.otherParticipant.role || conv.otherParticipant.userType,
        branch: conv.otherParticipant.branch || "",
        profilePhoto: conv.otherParticipant.profilePhoto || ""
      });
    }

    // Set conversation locally and clear unread count for this conversation
    setConversation(conv);
    setRecentConversations((prev) =>
      prev.map((c) => (c._id === conv._id ? { ...c, unreadCount: 0 } : c))
    );

    // Fetch messages
    setLoadingMessages(true);
    try {
      const res = await fetch(`${API_URL}/claim-chat/conversations/${conv._id}/messages`, {
        cache: "no-store"
      });
      if (res.ok) {
        const d = await res.json();
        setMessages(d.messages || []);
      }

      // Mark conversation as read on server
      await fetch(`${API_URL}/claim-chat/conversations/${conv._id}/read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentSession?.userId,
          userType: currentSession?.userType
        })
      });
      refreshCounts();
    } catch (err) {
      console.error("Error loading conversation messages:", err);
    } finally {
      setLoadingMessages(false);
    }

    setMobileView("chat");
  };

  // Filter Claims
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

  // Filter Branches
  const filteredBranches = useMemo(() => {
    if (!searchQuery.trim()) return branches;
    const q = searchQuery.toLowerCase();
    return branches.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.branch.toLowerCase().includes(q) ||
        (b.email && b.email.toLowerCase().includes(q))
    );
  }, [branches, searchQuery]);

  // Policyholder-Specific: Recent Agent Chats + Assigned Claim Agents ONLY
  const filteredRecentAgents = useMemo(() => {
    const chats = [...recentAgentChats];

    // Ensure any assigned agent for the policyholder's claims is present so they can chat with their agent
    claims.forEach((c) => {
      if (c.assignedAgent) {
        const alreadyPresent = chats.some(
          (item) =>
            item.agent.name.toLowerCase() === c.assignedAgent?.toLowerCase() ||
            item.agent.email.toLowerCase() === c.assignedAgent?.toLowerCase() ||
            item.agent.userId === c.assignedAgent
        );

        if (!alreadyPresent) {
          const matchedDoc = agents.find(
            (a) =>
              a.name.toLowerCase() === c.assignedAgent?.toLowerCase() ||
              a.email.toLowerCase() === c.assignedAgent?.toLowerCase() ||
              a.id === c.assignedAgent ||
              a.agentId === c.assignedAgent
          );

          chats.push({
            conversationId: "",
            claimNumber: c.claimNumber,
            vehiclePlate: c.vehiclePlate,
            agent: {
              userId: matchedDoc?.id || c.assignedAgent,
              userType: "Agent",
              name: matchedDoc?.name || c.assignedAgent,
              email: matchedDoc?.email || "",
              role: "Assigned Agent",
              branch: matchedDoc?.branch || c.branch || ""
            },
            lastMessage: {
              text: "Assigned inspection agent • Tap to chat",
              senderName: matchedDoc?.name || c.assignedAgent,
              sentAt: c.incidentDate || new Date().toISOString()
            },
            unreadCount: 0,
            updatedAt: c.incidentDate || new Date().toISOString()
          });
        }
      }
    });

    if (!searchQuery.trim()) return chats;
    const q = searchQuery.toLowerCase();
    return chats.filter(
      (item) =>
        item.agent.name.toLowerCase().includes(q) ||
        item.claimNumber.toLowerCase().includes(q) ||
        (item.vehiclePlate && item.vehiclePlate.toLowerCase().includes(q)) ||
        (item.agent.branch && item.agent.branch.toLowerCase().includes(q)) ||
        (item.lastMessage?.text && item.lastMessage.text.toLowerCase().includes(q))
    );
  }, [recentAgentChats, claims, agents, searchQuery]);

  // For Office Staff / Admin / Agent: Directory of Agents
  const filteredDirectoryAgents = useMemo(() => {
    if (!searchQuery.trim()) return agents;
    const q = searchQuery.toLowerCase();
    return agents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.branch && a.branch.toLowerCase().includes(q)) ||
        (a.agentId && a.agentId.toLowerCase().includes(q)) ||
        (a.email && a.email.toLowerCase().includes(q))
    );
  }, [agents, searchQuery]);

  // Handler for selecting a branch (Direct branch-to-branch or user-to-branch communication)
  const handleSelectBranch = (branch: BranchItem) => {
    setActiveCategory("branches");
    setRecipients([]);
    setActiveClaim({
      claimNumber: `BRANCH-${branch.branch.replace(/\s+/g, "-").toUpperCase()}`,
      vehiclePlate: "",
      status: "",
      branch: branch.branch
    });

    setActiveRecipient({
      userId: branch.branch,
      userType: "OfficeStaff",
      name: branch.name,
      email: branch.email,
      role: "Branch Officer",
      branch: branch.branch,
      profilePhoto: branch.profilePhoto || ""
    });
    setMobileView("chat");
  };

  // Handler for selecting a recent agent chat (Policyholder)
  const handleSelectRecentAgent = (item: RecentAgentChat) => {
    setActiveCategory("agents");
    setRecipients([]);
    setActiveClaim({
      claimNumber: item.claimNumber || `AGENT-${item.agent.userId}`,
      vehiclePlate: item.vehiclePlate || "",
      status: "Active",
      branch: item.agent.branch || ""
    });

    setActiveRecipient({
      userId: item.agent.userId,
      userType: "Agent",
      name: item.agent.name,
      email: item.agent.email,
      role: item.agent.role || "Field Agent",
      branch: item.agent.branch || "",
      profilePhoto: item.agent.profilePhoto || ""
    });

    setMobileView("chat");
  };

  // Handler for selecting an agent from directory (Staff / Admin)
  const handleSelectAgent = (agent: AgentItem) => {
    setActiveCategory("agents");
    setRecipients([]);
    setActiveClaim({
      claimNumber: `AGENT-${agent.agentId || agent.id || agent.name.replace(/\s+/g, "-").toUpperCase()}`,
      vehiclePlate: "",
      status: "",
      branch: agent.branch || ""
    });

    setActiveRecipient({
      userId: agent.id,
      userType: "Agent",
      name: agent.name,
      email: agent.email,
      role: "Field Agent",
      branch: agent.branch,
      profilePhoto: agent.profilePhoto || ""
    });
    setMobileView("chat");
  };

  // Filter Admins
  const filteredAdmins = useMemo(() => {
    if (!searchQuery.trim()) return admins;
    const q = searchQuery.toLowerCase();
    return admins.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        (a.role && a.role.toLowerCase().includes(q)) ||
        (a.mobile && a.mobile.includes(q))
    );
  }, [admins, searchQuery]);

  // Handler for selecting an Admin (Branch <-> Admin direct communication)
  const handleSelectAdmin = (admin: AdminItem) => {
    setActiveCategory("admin");
    setRecipients([]);
    setActiveClaim({
      claimNumber: `ADMIN-${admin.id || admin.name.replace(/\s+/g, "-").toUpperCase()}`,
      vehiclePlate: "",
      status: "",
      branch: "Head Office"
    });

    setActiveRecipient({
      userId: admin.id,
      userType: "Admin",
      name: admin.name,
      email: admin.email,
      role: admin.role || "Claims Administrator",
      branch: admin.branch || "Head Office",
      profilePhoto: admin.profilePhoto || ""
    });

    setMobileView("chat");
  };

  if (!isChatOpen) return null;

  // Login Required Screen
  if (!currentSession) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-7 text-center border border-slate-100">
          <div className="w-16 h-16 bg-slate-100 text-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-200/60">
            <HugeiconsIcon icon={BubbleChatIcon} className="w-8 h-8" strokeWidth={2} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Claim Messenger</h3>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Please log in with your SANASA account to start chatting with your branch staff, field agents, or policyholders.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={closeChat}
              className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Close
            </button>
            <a
              href="/Login"
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold shadow-md transition-all cursor-pointer no-underline inline-block"
            >
              Sign In
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 md:p-8 bg-slate-950/45 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[88vh] max-h-[780px] bg-white rounded-3xl shadow-2xl flex overflow-hidden border border-slate-200/90">
        
        {/* ══════════════════════════════════════════════════════════════
            1. FAR LEFT: CATEGORY ICON RAIL (Recent, Claims, Branches, Agents)
            ══════════════════════════════════════════════════════════════ */}
        <div className="w-16 bg-[#0f172a] border-r border-slate-800/90 py-4 flex flex-col items-center justify-between shrink-0 select-none">
          {/* Category Rail Buttons: Recent, Claims, Branches, Agents */}
          <div className="flex flex-col items-center gap-3 w-full px-2">
            
            {/* 1. RECENT MESSAGES BUTTON (Replaces previous static top chat icon) */}
            <button
              type="button"
              onClick={() => {
                setActiveCategory("recent");
                setRecipients([]);
                setSearchQuery("");
                fetchRecentConversations();
              }}
              title="Recent Messages (All Categories)"
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer relative ${
                activeCategory === "recent"
                  ? "bg-white/15 text-white ring-1 ring-white/20 shadow-xs backdrop-blur-xs"
                  : "text-slate-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <HugeiconsIcon icon={Time02Icon} className="w-5 h-5" strokeWidth={2.2} />

              {/* Red dot highlight for new/unread messages */}
              {totalRecentUnread > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-[#0f172a] animate-pulse" />
              )}
              {activeCategory === "recent" && (
                <span className="absolute -right-2 w-1.5 h-4 bg-white rounded-l-full" />
              )}
            </button>

            {/* Subtle Divider */}
            <div className="w-6 h-[1px] bg-white/10 my-0.5" />

            {/* 2. CLAIMS */}
            <button
              type="button"
              onClick={() => {
                setActiveCategory("claims");
                setRecipients([]);
                setSearchQuery("");
              }}
              title="Claims"
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer relative ${
                activeCategory === "claims"
                  ? "bg-white/15 text-white ring-1 ring-white/20 shadow-xs backdrop-blur-xs"
                  : "text-slate-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <HugeiconsIcon icon={Car01Icon} className="w-5 h-5" strokeWidth={2.2} />
              {activeCategory === "claims" && (
                <span className="absolute -right-2 w-1.5 h-4 bg-white rounded-l-full" />
              )}
            </button>

            {/* 3. BRANCHES */}
            <button
              type="button"
              onClick={() => {
                setActiveCategory("branches");
                setRecipients([]);
                setSearchQuery("");
              }}
              title="Branches"
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer relative ${
                activeCategory === "branches"
                  ? "bg-white/15 text-white ring-1 ring-white/20 shadow-xs backdrop-blur-xs"
                  : "text-slate-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <HugeiconsIcon icon={Building01Icon} className="w-5 h-5" strokeWidth={2.2} />
              {activeCategory === "branches" && (
                <span className="absolute -right-2 w-1.5 h-4 bg-white rounded-l-full" />
              )}
            </button>

            {/* 4. AGENTS */}
            <button
              type="button"
              onClick={() => {
                setActiveCategory("agents");
                setRecipients([]);
                setSearchQuery("");
                if (isPolicyHolder) fetchRecentConversations();
              }}
              title={isPolicyHolder ? "Recent Agent Chats" : "Field Agents"}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer relative ${
                activeCategory === "agents"
                  ? "bg-white/15 text-white ring-1 ring-white/20 shadow-xs backdrop-blur-xs"
                  : "text-slate-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <HugeiconsIcon icon={UserGroupIcon} className="w-5 h-5" strokeWidth={2.2} />
              {activeCategory === "agents" && (
                <span className="absolute -right-2 w-1.5 h-4 bg-white rounded-l-full" />
              )}
            </button>

            {/* 5. ADMIN (For Branch Staff and Admins to chat with all Admins) */}
            {isBranchOrAdmin && (
              <button
                type="button"
                onClick={() => {
                  setActiveCategory("admin");
                  setRecipients([]);
                  setSearchQuery("");
                }}
                title="Head Office Admins"
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer relative ${
                  activeCategory === "admin"
                    ? "bg-white/15 text-white ring-1 ring-white/20 shadow-xs backdrop-blur-xs"
                    : "text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                <HugeiconsIcon icon={ShieldUserIcon} className="w-5 h-5" strokeWidth={2.2} />
                {activeCategory === "admin" && (
                  <span className="absolute -right-2 w-1.5 h-4 bg-white rounded-l-full" />
                )}
              </button>
            )}

          </div>

          {/* Bottom User Avatar Indicator */}
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-10 h-10 rounded-2xl border border-slate-700/80 shadow-xs overflow-hidden"
              title={`${currentSession.name} (${currentSession.userType})`}
            >
              <UserAvatar
                photo={currentSession.profilePhoto}
                name={currentSession.name}
                className="w-full h-full"
                fallbackBg="bg-slate-800 text-slate-200 text-xs font-bold"
              />
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            2. MIDDLE COLUMN: CARDS LIST (Filtered by Category)
            ══════════════════════════════════════════════════════════════ */}
        <div
          className={`w-full sm:w-76 md:w-80 bg-[#f8fafc] border-r border-slate-200/80 flex flex-col shrink-0 ${
            mobileView === "chat" ? "hidden sm:flex" : "flex"
          }`}
        >
          {/* Top Search Bar */}
          <div className="p-3.5 border-b border-slate-200/70 bg-white/90">
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
                placeholder={
                  activeCategory === "recent"
                    ? "Search all recent messages..."
                    : activeCategory === "claims"
                    ? "Search claims by plate or ID..."
                    : activeCategory === "branches"
                    ? "Search branch offices..."
                    : activeCategory === "admin"
                    ? "Search administrators..."
                    : isPolicyHolder
                    ? "Search recent agents..."
                    : "Search field agents..."
                }
                className="w-full bg-slate-100/90 border border-slate-200/60 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-slate-300 focus:ring-2 focus:ring-slate-400/20 outline-none transition-all"
              />
            </div>
          </div>

          {/* Category Header Label */}
          <div className="px-4 py-2 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span>
              {activeCategory === "recent"
                ? "Recent Messages"
                : activeCategory === "claims"
                ? "Claims"
                : activeCategory === "branches"
                ? "Regional Branches"
                : activeCategory === "admin"
                ? "Head Office Admins"
                : isPolicyHolder
                ? "Recent & Assigned Agents"
                : "Field Agents"}
            </span>
            <span className="bg-slate-200/70 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">
              {activeCategory === "recent"
                ? filteredRecentConversations.length
                : activeCategory === "claims"
                ? filteredClaims.length
                : activeCategory === "branches"
                ? filteredBranches.length
                : activeCategory === "admin"
                ? filteredAdmins.length
                : isPolicyHolder
                ? filteredRecentAgents.length
                : filteredDirectoryAgents.length}
            </span>
          </div>

          {/* Cards List with no-scrollbar */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2">

            {/* 0. ALL RECENT MESSAGES LIST (All Categories, All Users, Time/Date Order) */}
            {activeCategory === "recent" && (
              loadingRecentConversations ? (
                <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <HugeiconsIcon icon={Loading03Icon} className="w-6 h-6 animate-spin text-slate-700" />
                  <span className="text-xs">Loading recent messages...</span>
                </div>
              ) : filteredRecentConversations.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-2 border border-slate-200/70">
                    <HugeiconsIcon icon={Time02Icon} className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700">No Recent Messages</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
                    {searchQuery
                      ? "No recent messages matching your search"
                      : "Conversations you start or receive across claims, branches, and agents will appear here in chronological order."}
                  </p>
                </div>
              ) : (
                filteredRecentConversations.map((conv) => {
                  const isSelected = conversation?._id === conv._id;
                  const hasUnread = (conv.unreadCount || 0) > 0;
                  const otherName = conv.otherParticipant?.name || "Participant";
                  const otherRole = conv.otherParticipant?.role || conv.otherParticipant?.userType || "";
                  const timeFormatted = formatRecentTime(conv.lastMessage?.sentAt || conv.updatedAt);

                  return (
                    <button
                      key={conv._id}
                      onClick={() => handleSelectRecentConversation(conv)}
                      className={`w-full text-left p-3.5 rounded-2xl transition-all cursor-pointer flex items-center gap-3 border relative ${
                        isSelected
                          ? "bg-[#1e293b] text-white border-transparent shadow-md shadow-slate-900/10"
                          : hasUnread
                          ? "bg-white text-slate-900 border-slate-300 hover:bg-slate-50/80 shadow-2xs ring-1 ring-slate-200/70"
                          : "bg-white text-slate-800 border-slate-200/70 hover:bg-slate-100/60 shadow-2xs"
                      }`}
                    >
                      {/* Avatar with Photo or Fallback Initials */}
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-2xl overflow-hidden flex items-center justify-center">
                          <UserAvatar
                            photo={conv.otherParticipant?.profilePhoto}
                            name={otherName}
                            className="w-full h-full"
                            fallbackBg={
                              isSelected
                                ? "bg-white/15 text-white text-xs font-bold"
                                : hasUnread
                                ? "bg-[#0f172a] text-white text-xs font-bold shadow-xs"
                                : "bg-slate-100 text-slate-700 text-xs font-bold"
                            }
                          />
                        </div>
                        {/* Red Dot Highlight on avatar if unread */}
                        {hasUnread && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4
                            className={`text-xs font-bold truncate ${
                              isSelected ? "text-white" : "text-slate-800"
                            }`}
                          >
                            {otherName}
                          </h4>
                          {/* Time / Date */}
                          <span
                            className={`text-[10px] shrink-0 font-medium ${
                              isSelected ? "text-slate-300" : hasUnread ? "text-slate-900 font-bold" : "text-slate-400"
                            }`}
                          >
                            {timeFormatted}
                          </span>
                        </div>

                        {/* Badges: Vehicle Plate / Claim Number & Role */}
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {conv.vehiclePlate && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                                isSelected
                                  ? "bg-white/20 text-white"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {conv.vehiclePlate}
                            </span>
                          )}
                          <span
                            className={`text-[9px] truncate font-medium ${
                              isSelected ? "text-slate-300" : "text-slate-400"
                            }`}
                          >
                            {conv.claimNumber} {otherRole ? `• ${otherRole}` : ""}
                          </span>
                        </div>

                        {/* Last Message Preview & Unread Badge */}
                        <div className="flex items-center justify-between gap-1 mt-1">
                          <p
                            className={`text-[11px] truncate flex-1 ${
                              isSelected
                                ? "text-slate-200"
                                : hasUnread
                                ? "text-slate-900 font-semibold"
                                : "text-slate-500"
                            }`}
                          >
                            {conv.lastMessage?.text || "Started conversation"}
                          </p>

                          {/* Red Unread Count Pill */}
                          {hasUnread && (
                            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center shrink-0 shadow-xs">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )
            )}
            
            {/* 1. CLAIMS LIST */}
            {activeCategory === "claims" && (
              loadingClaims ? (
                <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <HugeiconsIcon icon={Loading03Icon} className="w-6 h-6 animate-spin text-slate-700" />
                  <span className="text-xs">Loading claims...</span>
                </div>
              ) : filteredClaims.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <p className="text-xs font-semibold text-slate-600">No claims found</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {searchQuery ? "Try another keyword" : "No active claims"}
                  </p>
                </div>
              ) : (
                filteredClaims.map((c) => {
                  const isSelected = activeClaim?.claimNumber === c.claimNumber;
                  return (
                    <button
                      key={c.claimNumber}
                      onClick={() => {
                        setActiveCategory("claims");
                        setActiveClaim(c);
                        setActiveRecipient(null);
                        setMobileView("chat");
                      }}
                      className={`w-full text-left p-3.5 rounded-2xl transition-all cursor-pointer flex items-center gap-3 border ${
                        isSelected
                          ? "bg-[#1e293b] text-white border-transparent shadow-md shadow-slate-900/10"
                          : "bg-white text-slate-800 border-slate-200/70 hover:bg-slate-100/60 shadow-2xs"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-white/15 text-white" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        <HugeiconsIcon icon={Car01Icon} className="w-5 h-5" strokeWidth={2} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4
                            className={`text-xs font-bold truncate ${
                              isSelected ? "text-white" : "text-slate-800"
                            }`}
                          >
                            {c.vehiclePlate || "Claim"}
                          </h4>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              isSelected
                                ? "bg-white/20 text-white"
                                : c.status === "Approved"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {c.status}
                          </span>
                        </div>
                        <p
                          className={`text-[11px] font-mono truncate mt-0.5 ${
                            isSelected ? "text-slate-300" : "text-slate-400"
                          }`}
                        >
                          {c.claimNumber}
                        </p>
                        <p
                          className={`text-[10px] truncate ${
                            isSelected ? "text-slate-400" : "text-slate-400"
                          }`}
                        >
                          {c.branch || "Head Office"}
                        </p>
                      </div>
                    </button>
                  );
                })
              )
            )}

            {/* 2. BRANCHES LIST */}
            {activeCategory === "branches" && (
              loadingDirectory ? (
                <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <HugeiconsIcon icon={Loading03Icon} className="w-6 h-6 animate-spin text-slate-700" />
                  <span className="text-xs">Loading branches...</span>
                </div>
              ) : filteredBranches.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <p className="text-xs font-semibold text-slate-600">No branches found</p>
                </div>
              ) : (
                filteredBranches.map((b) => {
                  const isSelected = activeRecipient?.userId === b.branch;
                  return (
                    <button
                      key={b.id}
                      onClick={() => handleSelectBranch(b)}
                      className={`w-full text-left p-3.5 rounded-2xl transition-all cursor-pointer flex items-center gap-3 border ${
                        isSelected
                          ? "bg-[#1e293b] text-white border-transparent shadow-md shadow-slate-900/10"
                          : "bg-white text-slate-800 border-slate-200/70 hover:bg-slate-100/60 shadow-2xs"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden ${
                          isSelected ? "bg-white/15 text-white" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {b.profilePhoto ? (
                          <UserAvatar
                            photo={b.profilePhoto}
                            name={b.name}
                            className="w-full h-full"
                            fallbackBg={isSelected ? "bg-white/15 text-white" : "bg-slate-100 text-slate-700"}
                          />
                        ) : (
                          <HugeiconsIcon icon={Building01Icon} className="w-5 h-5" strokeWidth={2} />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4
                            className={`text-xs font-bold truncate ${
                              isSelected ? "text-white" : "text-slate-800"
                            }`}
                          >
                            {b.name}
                          </h4>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700 border border-slate-200/80"
                            }`}
                          >
                            Branch
                          </span>
                        </div>
                        <p
                          className={`text-[11px] truncate mt-0.5 ${
                            isSelected ? "text-slate-300" : "text-slate-400"
                          }`}
                        >
                          {b.email}
                        </p>
                      </div>
                    </button>
                  );
                })
              )
            )}

            {/* 3. AGENTS LIST (Role-Specific) */}
            {activeCategory === "agents" && (
              isPolicyHolder ? (
                // POLICYHOLDER: Recent Agent Chats & Assigned Claim Agents ONLY
                loadingAgentChats ? (
                  <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                    <HugeiconsIcon icon={Loading03Icon} className="w-6 h-6 animate-spin text-slate-700" />
                    <span className="text-xs">Loading recent agent chats...</span>
                  </div>
                ) : filteredRecentAgents.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2 border border-slate-200/70">
                      <HugeiconsIcon icon={UserGroupIcon} className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-semibold text-slate-700">No Recent Agent Chats</p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
                      {searchQuery
                        ? "No matching agent chats found"
                        : "You haven't chatted with any field inspection agents yet. Conversations will appear here once started."}
                    </p>
                  </div>
                ) : (
                  filteredRecentAgents.map((item) => {
                    const isSelected =
                      activeRecipient?.userId === item.agent.userId &&
                      activeClaim?.claimNumber === item.claimNumber;

                    return (
                      <button
                        key={`${item.conversationId || item.agent.userId}-${item.claimNumber}`}
                        onClick={() => handleSelectRecentAgent(item)}
                        className={`w-full text-left p-3.5 rounded-2xl transition-all cursor-pointer flex items-center gap-3 border ${
                          isSelected
                            ? "bg-[#1e293b] text-white border-transparent shadow-md shadow-slate-900/10"
                            : "bg-white text-slate-800 border-slate-200/70 hover:bg-slate-100/60 shadow-2xs"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-2xl shrink-0 overflow-hidden flex items-center justify-center">
                          <UserAvatar
                            photo={item.agent.profilePhoto}
                            name={item.agent.name}
                            className="w-full h-full"
                            fallbackBg={isSelected ? "bg-white/15 text-white text-xs font-bold" : "bg-slate-100 text-slate-700 text-xs font-bold"}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h4
                              className={`text-xs font-bold truncate ${
                                isSelected ? "text-white" : "text-slate-800"
                              }`}
                            >
                              {item.agent.name}
                            </h4>
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                isSelected ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              {item.vehiclePlate || item.claimNumber}
                            </span>
                          </div>
                          <p
                            className={`text-[11px] truncate mt-0.5 font-medium ${
                              isSelected ? "text-slate-300" : "text-slate-500"
                            }`}
                          >
                            {item.lastMessage?.text || "Conversation started"}
                          </p>
                          <div className="flex items-center justify-between mt-1 text-[10px]">
                            <span className={isSelected ? "text-slate-400" : "text-slate-400"}>
                              {item.agent.branch ? `${item.agent.branch} • ` : ""}
                              {new Date(item.lastMessage?.sentAt || item.updatedAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>
                            {item.unreadCount > 0 && (
                              <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center">
                                {item.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )
              ) : (
                // OFFICE STAFF / ADMIN / AGENT: Full Directory of Agents
                loadingDirectory ? (
                  <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                    <HugeiconsIcon icon={Loading03Icon} className="w-6 h-6 animate-spin text-slate-700" />
                    <span className="text-xs">Loading field agents...</span>
                  </div>
                ) : filteredDirectoryAgents.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <p className="text-xs font-semibold text-slate-600">No agents found</p>
                  </div>
                ) : (
                  filteredDirectoryAgents.map((a) => {
                    const isSelected = activeRecipient?.userId === a.id;
                    return (
                      <button
                        key={a.id}
                        onClick={() => handleSelectAgent(a)}
                        className={`w-full text-left p-3.5 rounded-2xl transition-all cursor-pointer flex items-center gap-3 border ${
                          isSelected
                            ? "bg-[#1e293b] text-white border-transparent shadow-md shadow-slate-900/10"
                            : "bg-white text-slate-800 border-slate-200/70 hover:bg-slate-100/60 shadow-2xs"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-2xl shrink-0 overflow-hidden flex items-center justify-center">
                          <UserAvatar
                            photo={a.profilePhoto}
                            name={a.name}
                            className="w-full h-full"
                            fallbackBg={isSelected ? "bg-white/15 text-white text-xs font-bold" : "bg-slate-100 text-slate-700 text-xs font-bold"}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h4
                              className={`text-xs font-bold truncate ${
                                isSelected ? "text-white" : "text-slate-800"
                              }`}
                            >
                              {a.name}
                            </h4>
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                isSelected ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              Agent
                            </span>
                          </div>
                          <p
                            className={`text-[11px] truncate mt-0.5 ${
                              isSelected ? "text-slate-300" : "text-slate-400"
                            }`}
                          >
                            {a.agentId ? `${a.agentId} • ` : ""}{a.branch || "General"}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )
              )
            )}

            {/* 4. ADMINS LIST (For Branch Staff and Admins) */}
            {activeCategory === "admin" && (
              loadingDirectory ? (
                <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <HugeiconsIcon icon={Loading03Icon} className="w-6 h-6 animate-spin text-slate-700" />
                  <span className="text-xs">Loading administrators...</span>
                </div>
              ) : filteredAdmins.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <p className="text-xs font-semibold text-slate-600">No administrators found</p>
                </div>
              ) : (
                filteredAdmins.map((adm) => {
                  const isSelected = activeRecipient?.userId === adm.id;
                  return (
                    <button
                      key={adm.id}
                      onClick={() => handleSelectAdmin(adm)}
                      className={`w-full text-left p-3.5 rounded-2xl transition-all cursor-pointer flex items-center gap-3 border ${
                        isSelected
                          ? "bg-[#1e293b] text-white border-transparent shadow-md shadow-slate-900/10"
                          : "bg-white text-slate-800 border-slate-200/70 hover:bg-slate-100/60 shadow-2xs"
                      }`}
                    >
                        <div className="w-10 h-10 rounded-2xl shrink-0 overflow-hidden flex items-center justify-center">
                          <UserAvatar
                            photo={adm.profilePhoto}
                            name={adm.name}
                            className="w-full h-full"
                            fallbackBg={isSelected ? "bg-white/15 text-white text-xs font-bold" : "bg-purple-50 text-purple-700 text-xs font-bold"}
                          />
                        </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4
                            className={`text-xs font-bold truncate ${
                              isSelected ? "text-white" : "text-slate-800"
                            }`}
                          >
                            {adm.name}
                          </h4>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              isSelected ? "bg-white/20 text-white" : "bg-purple-100 text-purple-800"
                            }`}
                          >
                            Admin
                          </span>
                        </div>
                        <p
                          className={`text-[11px] truncate mt-0.5 ${
                            isSelected ? "text-slate-300" : "text-slate-400"
                          }`}
                        >
                          {adm.email}
                        </p>
                        <p
                          className={`text-[10px] truncate mt-0.5 ${
                            isSelected ? "text-slate-400" : "text-slate-400"
                          }`}
                        >
                          Head Office • {adm.role || "Claims Administrator"}
                        </p>
                      </div>
                    </button>
                  );
                })
              )
            )}

          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            3. RIGHT PANEL: CHAT CANVAS & STAKEHOLDER SWITCHER
            ══════════════════════════════════════════════════════════════ */}
        <div
          className={`flex-1 flex flex-col bg-[#f8fafc] min-w-0 ${
            mobileView === "list" ? "hidden sm:flex" : "flex"
          }`}
        >
          {!conversation && !activeRecipient ? (
            <div className="flex-1 flex flex-col h-full bg-[#f8fafc]">
              {/* Header with Close Button */}
              <div className="bg-white border-b border-slate-200/80 px-5 py-3.5 flex items-center justify-end shadow-2xs shrink-0">
                <button
                  onClick={closeChat}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                  aria-label="Close Chat"
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={2} />
                </button>
              </div>

              {/* Placeholder Body */}
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
                <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-700 flex items-center justify-center mb-4 shadow-sm border border-slate-200/80">
                  <HugeiconsIcon icon={BubbleChatIcon} className="w-8 h-8" strokeWidth={2} />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1.5">Sanasa Claim Communication Desk</h3>
                <p className="text-xs text-slate-500 max-w-sm leading-relaxed mb-6">
                  Select a recent conversation from the left to view messages, or select any Claim, Regional Branch, or Field Agent to start chatting.
                </p>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Real-Time Messaging Ready
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="bg-white border-b border-slate-200/80 px-5 py-3.5 flex items-center justify-between shadow-2xs shrink-0 backdrop-blur-xs">
            <div className="flex items-center gap-3 min-w-0">
              {/* Mobile Back Button */}
              <button
                onClick={() => setMobileView("list")}
                className="sm:hidden p-1.5 -ml-1 text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
                aria-label="Back"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} className="w-5 h-5" />
              </button>

              {/* Recipient Avatar */}
              <div className="w-10 h-10 rounded-2xl shrink-0 shadow-xs overflow-hidden flex items-center justify-center">
                <UserAvatar
                  photo={activeRecipient?.profilePhoto}
                  name={activeRecipient?.name}
                  className="w-full h-full"
                  fallbackBg="bg-[#0f172a] text-white text-xs font-bold"
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    {activeRecipient?.name || "Select Participant"}
                  </h3>
                  {activeRecipient?.role && (
                    <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200/90 shrink-0">
                      {activeRecipient.role}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  {activeRecipient?.email ? `${activeRecipient.email} • ` : ""}
                  {activeCategory === "claims" && activeClaim?.claimNumber?.startsWith("CLM") ? (
                    <>Claim: <strong className="text-slate-600">{activeClaim.claimNumber}</strong></>
                  ) : activeCategory === "branches" || activeRecipient?.userType === "OfficeStaff" ? (
                    <span className="text-slate-700 font-semibold">Branch Office Communication</span>
                  ) : activeCategory === "admin" || activeRecipient?.userType === "Admin" ? (
                    <span className="text-purple-700 font-semibold">Head Office Administration</span>
                  ) : activeCategory === "agents" || activeRecipient?.userType === "Agent" ? (
                    <span className="text-emerald-700 font-semibold">Field Agent Inspection</span>
                  ) : activeClaim?.claimNumber && activeClaim.claimNumber.startsWith("CLM") ? (
                    <>Claim: <strong className="text-slate-600">{activeClaim.claimNumber}</strong></>
                  ) : (
                    <span className="text-slate-500 font-medium">Direct Message</span>
                  )}
                </p>
              </div>
            </div>

            {/* Header Right: Vehicle Chip (Strictly for Claim Messages) & Close Button */}
            <div className="flex items-center gap-3">
              {activeCategory === "claims" && activeClaim?.claimNumber?.startsWith("CLM") && activeClaim?.vehiclePlate && (
                <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-full px-3 py-1">
                  <span className="text-xs font-bold text-slate-700">{activeClaim.vehiclePlate}</span>
                  {activeClaim.status && (
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        activeClaim.status === "Approved"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {activeClaim.status}
                    </span>
                  )}
                </div>
              )}

              <button
                onClick={closeChat}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                aria-label="Close Chat"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Stakeholder Switcher (Pill Tabs - ONLY shown for Claim Messages in Claims category) */}
          {activeCategory === "claims" && activeClaim?.claimNumber?.startsWith("CLM") && recipients.length > 0 && (
            <div className="bg-slate-100/70 border-b border-slate-200/80 px-5 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
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
                      className={`text-xs px-3.5 py-1 rounded-full font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-[#0f172a] text-white shadow-xs"
                          : "bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>{r.name}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded-full ${
                          isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
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

          {/* Message Stream Canvas with Simple Clean Wallpaper */}
          <div className="flex-1 relative flex flex-col overflow-hidden bg-gradient-to-b from-[#f8fafc] via-[#f1f5f9] to-[#edf2f7]">
            {/* Simple Low-Light Chat Wallpaper Pattern Layer */}
            <div
              className="absolute inset-0 pointer-events-none opacity-40 select-none"
              style={{
                backgroundImage: `url("${CHAT_WALLPAPER_SVG}")`,
                backgroundSize: "220px 220px",
                backgroundRepeat: "repeat"
              }}
            />

            {/* Scrollable Message Stream */}
            <div className="relative flex-1 overflow-y-auto no-scrollbar p-5 sm:p-6 space-y-3.5">
              <div className="flex items-center justify-center my-1">
                <span className="bg-white/95 backdrop-blur-xs border border-slate-200/90 text-slate-600 text-[10px] font-semibold px-3.5 py-1 rounded-full shadow-2xs">
                {activeCategory === "claims"
                  ? "Official Claim Communication"
                  : activeCategory === "branches"
                  ? "Official Branch Communication"
                  : activeCategory === "admin"
                  ? "Executive Administration Desk"
                  : activeCategory === "agents"
                  ? "Field Agent Inspection Communication"
                  : "Secure Direct Communication"}
              </span>
            </div>

            {loadingMessages ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400">
                <HugeiconsIcon icon={Loading03Icon} className="w-7 h-7 animate-spin text-slate-700" />
                <p className="text-xs">Loading secure message history...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200/90 text-slate-700 flex items-center justify-center mb-3 shadow-xs">
                  <HugeiconsIcon icon={BubbleChatIcon} className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-slate-800 text-sm">No messages yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                  {activeCategory === "claims" && activeClaim?.claimNumber?.startsWith("CLM") ? (
                    <>
                      Start direct official communication with{" "}
                      <strong>{activeRecipient?.name || "the participant"}</strong> regarding claim{" "}
                      <strong>{activeClaim?.claimNumber}</strong>.
                    </>
                  ) : activeCategory === "branches" || activeRecipient?.userType === "OfficeStaff" ? (
                    <>
                      Start direct official communication with{" "}
                      <strong>{activeRecipient?.name || "the branch office"}</strong>.
                    </>
                  ) : activeCategory === "admin" || activeRecipient?.userType === "Admin" ? (
                    <>
                      Start direct official communication with{" "}
                      <strong>{activeRecipient?.name || "Head Office Admin"}</strong>.
                    </>
                  ) : (
                    <>
                      Start direct official communication with{" "}
                      <strong>{activeRecipient?.name || "this user"}</strong>.
                    </>
                  )}
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
                    className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    {!isMe && (
                      <div className="w-7 h-7 rounded-full shrink-0 mb-1 border border-slate-300/60 overflow-hidden flex items-center justify-center">
                        <UserAvatar
                          photo={msg.senderPhoto}
                          name={msg.senderName}
                          className="w-full h-full"
                          fallbackBg="bg-slate-200 text-slate-700 text-[10px] font-bold"
                        />
                      </div>
                    )}

                    <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[80%] sm:max-w-[70%]`}>
                      {!isMe && (
                        <span className="text-[10px] font-semibold text-slate-600 ml-1 mb-0.5">
                          {msg.senderName}
                        </span>
                      )}

                      <div
                        className={`rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                          isMe
                            ? "bg-[#1e293b] text-slate-50 rounded-tr-xs shadow-xs"
                            : "bg-white border border-slate-200/90 text-slate-800 rounded-tl-xs shadow-2xs"
                        }`}
                      >
                        {/* Attachments (Photos & Documents) */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="space-y-2 mb-2">
                            {msg.attachments.map((att, attIdx) => {
                              const isImg =
                                att.fileType?.startsWith("image/") ||
                                /\.(jpg|jpeg|png|webp|gif)$/i.test(att.name || att.url);

                              if (isImg) {
                                return (
                                  <div
                                    key={attIdx}
                                    className="overflow-hidden rounded-xl border border-black/10 group relative max-w-xs"
                                  >
                                    <img
                                      src={att.url}
                                      alt={att.name || "Photo attachment"}
                                      className="max-h-64 w-full rounded-xl object-cover cursor-pointer hover:opacity-95 transition-all"
                                      onClick={() => setPreviewImageModal(att.url)}
                                    />
                                    <div
                                      onClick={() => setPreviewImageModal(att.url)}
                                      className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                    >
                                      <HugeiconsIcon icon={Image01Icon} className="w-3 h-3" />
                                      <span>View Full Photo</span>
                                    </div>
                                  </div>
                                );
                              }

                              // Document Attachment Card
                              return (
                                <a
                                  key={attIdx}
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={att.name}
                                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all no-underline ${
                                    isMe
                                      ? "bg-white/10 border-white/15 text-white hover:bg-white/20"
                                      : "bg-slate-50 border-slate-200/80 text-slate-800 hover:bg-slate-100 shadow-2xs"
                                  }`}
                                >
                                  <div
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                      isMe ? "bg-white/15 text-white" : "bg-slate-100 text-slate-700"
                                    }`}
                                  >
                                    <HugeiconsIcon icon={File01Icon} className="w-4.5 h-4.5" strokeWidth={2} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold truncate leading-tight">
                                      {att.name || "Attached Document"}
                                    </p>
                                    <p
                                      className={`text-[10px] mt-0.5 ${
                                        isMe ? "text-slate-300" : "text-slate-400"
                                      }`}
                                    >
                                      {formatFileSize(att.size)} • Document
                                    </p>
                                  </div>
                                  <div
                                    className={`p-1.5 rounded-lg shrink-0 ${
                                      isMe ? "bg-white/15 text-white" : "bg-slate-200/80 text-slate-700"
                                    }`}
                                    title="Download Document"
                                  >
                                    <HugeiconsIcon icon={Download01Icon} className="w-3.5 h-3.5" strokeWidth={2.2} />
                                  </div>
                                </a>
                              );
                            })}
                          </div>
                        )}

                        {msg.text && <p className="whitespace-pre-wrap break-words">{msg.text}</p>}
                        
                        <div
                          className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${
                            isMe ? "text-slate-400" : "text-slate-400"
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
                                  className="w-3.5 h-3.5 text-emerald-400 inline"
                                  strokeWidth={2.5}
                                />
                              ) : (
                                <HugeiconsIcon
                                  icon={Tick02Icon}
                                  className="w-3.5 h-3.5 text-slate-400 inline"
                                  strokeWidth={2}
                                />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Quick Replies */}
          {(!inputText || inputText.trim().length === 0) && pendingAttachments.length === 0 && (
            <div className="px-5 py-2 bg-white border-t border-slate-200/70 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                Quick:
              </span>
              {currentQuickReplies.map((text, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(undefined, text)}
                  className="text-[11px] bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 px-3 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer shadow-2xs"
                >
                  {text}
                </button>
              ))}
            </div>
          )}

          {/* Pending Attachments Preview Tray */}
          {pendingAttachments.length > 0 && (
            <div className="px-4 py-2.5 bg-slate-100/90 border-t border-slate-200/90 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                Attachments ({pendingAttachments.length}):
              </span>
              {pendingAttachments.map((att, idx) => {
                const isImg = att.fileType.startsWith("image/");
                return (
                  <div
                    key={idx}
                    className="relative group shrink-0 flex items-center gap-2 bg-white border border-slate-200/90 rounded-xl p-1.5 pr-2 shadow-2xs animate-in fade-in"
                  >
                    {isImg && att.previewUrl ? (
                      <img
                        src={att.previewUrl}
                        alt={att.name}
                        className="w-8 h-8 rounded-lg object-cover border border-slate-100 shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                        <HugeiconsIcon icon={File01Icon} className="w-4 h-4" />
                      </div>
                    )}
                    <div className="max-w-[130px]">
                      <p className="text-[11px] font-semibold text-slate-700 truncate leading-tight">
                        {att.name}
                      </p>
                      <p className="text-[9px] text-slate-400 mt-0.5">{formatFileSize(att.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePendingAttachment(idx)}
                      className="w-5 h-5 rounded-full bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer ml-1"
                      title="Remove attachment"
                    >
                      <HugeiconsIcon icon={Cancel01Icon} className="w-3 h-3" strokeWidth={2.5} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Input Bar */}
          <div className="p-3 sm:p-4 bg-white border-t border-slate-200/80 shrink-0">
            <form
              onSubmit={(e) => handleSendMessage(e)}
              className="bg-slate-50 border border-slate-200 rounded-full p-1.5 pl-3 flex items-center gap-2 focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-400/20 focus-within:border-slate-400 transition-all shadow-inner"
            >
              {/* Hidden File Input for photos and documents */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                className="hidden"
              />

              {/* Attachment Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!activeRecipient || sending}
                className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer disabled:opacity-30 shrink-0"
                title="Attach photos or documents (PDF, DOC, Images)"
              >
                <HugeiconsIcon icon={Attachment01Icon} className="w-4.5 h-4.5" strokeWidth={2} />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  activeRecipient
                    ? pendingAttachments.length > 0
                      ? "Add a caption..."
                      : `Message ${activeRecipient.name}...`
                    : "Message..."
                }
                disabled={!activeRecipient || sending}
                className="flex-1 bg-transparent border-none text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none min-w-0"
              />

              <button
                type="submit"
                disabled={(!inputText.trim() && pendingAttachments.length === 0) || !activeRecipient || sending}
                className="w-9 h-9 rounded-full bg-[#0f172a] hover:bg-[#1e293b] disabled:opacity-30 disabled:hover:bg-[#0f172a] text-white flex items-center justify-center shadow-xs active:scale-95 transition-all cursor-pointer border-none shrink-0"
                title="Send message"
              >
                {sending ? (
                  <HugeiconsIcon icon={Loading03Icon} className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <HugeiconsIcon icon={ArrowUp01Icon} className="w-4 h-4 text-white" strokeWidth={2.5} />
                )}
              </button>
            </form>
          </div>
          </>
          )}

        </div>

        {/* Image Lightbox Modal */}
        {previewImageModal && (
          <div
            className="fixed inset-0 z-100 bg-black/85 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in"
            onClick={() => setPreviewImageModal(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              <img
                src={previewImageModal}
                alt="Photo preview"
                className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
              />
              <button
                onClick={() => setPreviewImageModal(null)}
                className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-slate-700 shadow-lg flex items-center justify-center hover:bg-slate-100 cursor-pointer"
                aria-label="Close"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={2} />
              </button>
              <a
                href={previewImageModal}
                target="_blank"
                rel="noopener noreferrer"
                download="sanasa-chat-photo.jpg"
                className="absolute bottom-3 right-3 bg-white/90 hover:bg-white text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 transition-all no-underline"
              >
                <HugeiconsIcon icon={Download01Icon} className="w-3.5 h-3.5" />
                <span>Download Photo</span>
              </a>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
