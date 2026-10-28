"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getSocket, getActiveUserSession, CurrentUserSession } from "../utils/socket";

interface ChatNotificationContextType {
  chatUnreadCount: number;
  notificationUnreadCount: number;
  isChatOpen: boolean;
  selectedClaimNumber: string | null;
  selectedRecipient: any | null;
  userSession: CurrentUserSession | null;
  socketConnected: boolean;
  openChat: (claimNumber?: string, recipient?: any) => void;
  closeChat: () => void;
  refreshCounts: () => Promise<void>;
  setChatUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  setNotificationUnreadCount: React.Dispatch<React.SetStateAction<number>>;
}

const ChatNotificationContext = createContext<ChatNotificationContextType | undefined>(undefined);

export const ChatNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [chatUnreadCount, setChatUnreadCount] = useState<number>(0);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState<number>(0);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [selectedClaimNumber, setSelectedClaimNumber] = useState<string | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<any | null>(null);
  const [userSession, setUserSession] = useState<CurrentUserSession | null>(null);
  const [socketConnected, setSocketConnected] = useState<boolean>(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  const refreshCounts = useCallback(async () => {
    const session = getActiveUserSession();
    if (!session?.userId || !session?.userType) return;

    try {
      const res = await fetch(
        `${API_URL}/claim-chat/unread-counts?userId=${encodeURIComponent(session.userId)}&userType=${encodeURIComponent(session.userType)}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        if (typeof data.chatUnreadCount === "number") {
          setChatUnreadCount(data.chatUnreadCount);
        }
        if (typeof data.notificationUnreadCount === "number") {
          setNotificationUnreadCount(data.notificationUnreadCount);
        }
      }
    } catch (err) {
      console.warn("[ChatNotificationContext] Error fetching unread counts:", err);
    }
  }, [API_URL]);

  // Check URL query parameters for deep linking (e.g., from email: ?claim=CLM-2026-00125&openChat=true)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const claimParam = params.get("claim");
    const openChatParam = params.get("openChat");

    if (claimParam && openChatParam === "true") {
      setSelectedClaimNumber(claimParam);
      setIsChatOpen(true);
    }
  }, []);

  // Initialize session and socket connection
  useEffect(() => {
    const session = getActiveUserSession();
    setUserSession(session);

    if (!session) return;

    // Fetch initial counts
    refreshCounts();

    // Connect socket
    const socket = getSocket();
    if (socket) {
      const handleConnect = () => {
        setSocketConnected(true);
        refreshCounts();
      };
      const handleDisconnect = () => setSocketConnected(false);

      const handleChatUnread = (data: { unreadCount: number }) => {
        if (typeof data?.unreadCount === "number") {
          setChatUnreadCount(data.unreadCount);
        }
      };

      const handleNotificationUnread = (data: { unreadCount: number }) => {
        if (typeof data?.unreadCount === "number") {
          setNotificationUnreadCount(data.unreadCount);
        }
      };

      const handleNewNotification = () => {
        setNotificationUnreadCount((prev) => prev + 1);
      };

      socket.on("connect", handleConnect);
      socket.on("disconnect", handleDisconnect);
      socket.on("chat:unread-count", handleChatUnread);
      socket.on("notification:unread-count", handleNotificationUnread);
      socket.on("notification:new", handleNewNotification);

      if (socket.connected) {
        setSocketConnected(true);
      }

      return () => {
        socket.off("connect", handleConnect);
        socket.off("disconnect", handleDisconnect);
        socket.off("chat:unread-count", handleChatUnread);
        socket.off("notification:unread-count", handleNotificationUnread);
        socket.off("notification:new", handleNewNotification);
      };
    }
  }, [refreshCounts]);

  const openChat = useCallback((claimNumber?: string, recipient?: any) => {
    const freshSession = getActiveUserSession();
    if (freshSession) {
      setUserSession(freshSession);
    }
    if (claimNumber) setSelectedClaimNumber(claimNumber);
    if (recipient) setSelectedRecipient(recipient);
    setIsChatOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsChatOpen(false);
  }, []);

  // Global listener for window.dispatchEvent(new CustomEvent("open-claim-chat"))
  useEffect(() => {
    const handleEvent = (e: any) => {
      openChat(e?.detail?.claimNumber, e?.detail?.recipient);
    };
    window.addEventListener("open-claim-chat", handleEvent);
    return () => window.removeEventListener("open-claim-chat", handleEvent);
  }, [openChat]);

  // Intercept any click on existing legacy floating chat buttons (e.g., aria-label="Chat support")
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('button[aria-label="Chat support"]');
      if (target) {
        e.preventDefault();
        e.stopPropagation();
        openChat();
      }
    };
    document.addEventListener("click", handleGlobalClick, true);
    return () => document.removeEventListener("click", handleGlobalClick, true);
  }, [openChat]);

  return (
    <ChatNotificationContext.Provider
      value={{
        chatUnreadCount,
        notificationUnreadCount,
        isChatOpen,
        selectedClaimNumber,
        selectedRecipient,
        userSession,
        socketConnected,
        openChat,
        closeChat,
        refreshCounts,
        setChatUnreadCount,
        setNotificationUnreadCount
      }}
    >
      {children}
    </ChatNotificationContext.Provider>
  );
};

export const useChatNotification = () => {
  const context = useContext(ChatNotificationContext);
  if (!context) {
    throw new Error("useChatNotification must be used within a ChatNotificationProvider");
  }
  return context;
};
