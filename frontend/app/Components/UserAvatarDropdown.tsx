"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

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
        className="relative p-1 hover:bg-slate-100 rounded-full transition-colors cursor-pointer focus:outline-none flex items-center justify-center"
        aria-label="User Profile"
        aria-expanded={profileMenuOpen}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-slate-500 hover:text-slate-800">
          <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0 0 21.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12c0 2.754 1.14 5.244 2.98 7.03-.028-.01-.053-.024-.082-.031a.75.75 0 0 1-.502-.879C5.556 14.931 8.193 12 12 12s6.444 2.931 7.352 6.12a.75.75 0 0 1-.502.88c-.029.007-.054.02-.082.031ZM12 11.25a3.375 3.375 0 1 0 0-6.75 3.375 3.375 0 0 0 0 6.75Z" clipRule="evenodd" />
        </svg>
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
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
            </svg>
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
