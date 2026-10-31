"use client";

import React, { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { BubbleChatIcon } from "@hugeicons/core-free-icons";
import { useChatNotification } from "../../context/ChatNotificationContext";
import { usePathname } from "next/navigation";

export default function FloatingClaimChatButton() {
  const { openChat, chatUnreadCount, isChatOpen } = useChatNotification();
  const [isDriverChatOpen, setIsDriverChatOpen] = useState(false);
  const pathname = usePathname();

  // Listen to driver portal modal state so button hides when modal is open
  useEffect(() => {
    const handleDriverChatModal = (e: any) => {
      setIsDriverChatOpen(Boolean(e?.detail?.isOpen));
    };
    window.addEventListener("driver-chat-modal-state", handleDriverChatModal);
    return () => window.removeEventListener("driver-chat-modal-state", handleDriverChatModal);
  }, []);

  // Exclude login and new claim creation steps
  if (
    pathname === "/Login" ||
    pathname?.toLowerCase().startsWith("/login") ||
    pathname?.includes("/Policy_Holder/New_Claim")
  ) {
    return null;
  }

  // Don't show button if modal is open
  if (isChatOpen || isDriverChatOpen) return null;

  const handleButtonClick = () => {
    if (pathname?.includes("/driver-access")) {
      window.dispatchEvent(new CustomEvent("open-driver-chat"));
    } else {
      openChat();
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-40">
      <div className="relative group flex items-center justify-center">
        {/* Tooltip on hover */}
        <div className="absolute right-full mr-3 px-3 py-1.5 rounded-xl bg-[#0a192f] text-white text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-xl border border-sky-400/20 flex items-center gap-2">
          <span className="text-[#00ddff] font-bold">Claim Chat</span>
          {chatUnreadCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}
        </div>

        {/* Floating circular chat button */}
        <button
          type="button"
          onClick={handleButtonClick}
          aria-label="Open Claim Real-Time Chat"
          title="Claim Communication Desk"
          className="bg-gradient-to-tr from-[#0284c7] to-[#00ddff] hover:from-[#0369a1] hover:to-[#00c4e2] text-white p-5 rounded-full shadow-[0_10px_25px_-5px_rgba(2,132,199,0.5)] transition-all duration-150 hover:scale-110 active:scale-95 cursor-pointer focus:outline-none border-2 border-white flex items-center justify-center relative"
        >
          <HugeiconsIcon icon={BubbleChatIcon} className="w-7 h-7 text-white" strokeWidth={2} />

          {/* Red unread dot / badge - ONLY displayed after receiving unread messages */}
          {chatUnreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white shadow-md animate-in zoom-in-75">
              {chatUnreadCount > 9 ? "9+" : chatUnreadCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
