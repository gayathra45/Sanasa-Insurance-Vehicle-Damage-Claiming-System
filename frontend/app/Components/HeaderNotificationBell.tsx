"use client";

import React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Notification01Icon } from "@hugeicons/core-free-icons";
import { useChatNotification } from "@/app/context/ChatNotificationContext";

interface HeaderNotificationBellProps {
  href: string;
}

export default function HeaderNotificationBell({ href }: HeaderNotificationBellProps) {
  const { notificationUnreadCount } = useChatNotification();

  return (
    <Link
      href={href}
      className="relative p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer focus:outline-none flex items-center justify-center"
      aria-label={notificationUnreadCount > 0 ? `Notifications (${notificationUnreadCount})` : "Notifications"}
      title="In-App Notifications"
    >
      <HugeiconsIcon icon={Notification01Icon} className="w-6 h-6 text-slate-500 hover:text-slate-800" strokeWidth={2} />
      {notificationUnreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-in zoom-in-75">
          {notificationUnreadCount > 9 ? "9+" : notificationUnreadCount}
        </span>
      )}
    </Link>
  );
}
