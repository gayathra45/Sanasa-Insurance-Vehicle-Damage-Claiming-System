"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserCircleIcon, Logout01Icon } from "@hugeicons/core-free-icons";

interface UserAvatarDropdownProps {
  userType: "admin" | "office_staff";
}

export default function UserAvatarDropdown({ userType }: UserAvatarDropdownProps) {
  const router = useRouter();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<{ name?: string; email?: string; branch?: string } | null>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sessionKey = userType === "admin" ? "logged_in_admin" : "logged_in_staff";
    const data = sessionStorage.getItem(sessionKey);
    if (data) {
      try {
        setUserInfo(JSON.parse(data));
      } catch (e) {
        console.error("Error parsing user info from session", e);
      }
    }
  }, [userType]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    sessionStorage.clear();
    router.push("/Login");
  };

  return (
    <div className="relative" ref={profileMenuRef}>
      <button
        onClick={() => setProfileMenuOpen((prev) => !prev)}
        className="relative p-1 hover:bg-slate-100 rounded-full transition-colors cursor-pointer focus:outline-none flex items-center justify-center text-slate-500 hover:text-slate-800"
        aria-label="User Profile"
        aria-expanded={profileMenuOpen}
      >
        <HugeiconsIcon icon={UserCircleIcon} className="w-8 h-8" strokeWidth={1.8} />
      </button>

      {/* Dropdown Menu */}
      {profileMenuOpen && (
        <div
          className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-100 py-3 z-50 select-none"
          style={{ top: "100%" }}
        >
          {/* Arrow */}
          <div className="absolute -top-2 right-4 w-4 h-4 bg-white border-l border-t border-slate-100 rotate-45" />

          {/* User info header */}
          <div className="px-5 py-2.5 flex flex-col gap-0.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Logged in as
            </span>
            <span className="text-sm font-black text-slate-800 truncate">
              {userInfo?.name || (userType === "admin" ? "Admin User" : "Staff User")}
            </span>
            <span className="text-xs font-semibold text-slate-500 truncate">
              {userInfo?.email || ""}
            </span>
            {userInfo?.branch && (
              <span className="text-[10px] mt-1 bg-slate-100 text-slate-700 font-extrabold px-2 py-0.5 rounded-md w-fit">
                {userInfo.branch} Branch
              </span>
            )}
          </div>

          <div className="mx-4 my-2 border-t border-slate-100" />

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-5 py-3 text-red-500 hover:bg-red-50 font-semibold text-sm transition-colors text-left bg-transparent border-none cursor-pointer"
          >
            <HugeiconsIcon icon={Logout01Icon} className="w-5 h-5 text-red-500" strokeWidth={2} />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
