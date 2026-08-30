"use client";

import React from "react";
import AdminNavbar from "@/app/Components/Admin/Navbar";
import UserAvatarDropdown from "@/app/Components/UserAvatarDropdown";

export default function AdminAgentsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
      <div className="flex flex-1 flex-row min-h-0">
        <AdminNavbar />

        <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
          {/* Header */}
          <header className="bg-white border-b border-slate-100 text-slate-800 px-8 py-4 flex justify-between items-center select-none shadow-sm shrink-0 h-[80px] sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("open-admin-mobile-menu"))}
                className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 active:scale-95 transition-all cursor-pointer focus:outline-none"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              {/* Mobile page title */}
              <h1 className="lg:hidden text-lg font-bold text-slate-800 tracking-tight">
                Agents
              </h1>
              {/* Desktop welcome title */}
              <h1 className="hidden lg:flex text-xl font-semibold text-slate-800 items-center gap-2 pl-2 lg:pl-0 truncate">
                <span className="bg-[#102A43] text-white text-base px-4 py-2 rounded-xl font-black shadow-sm tracking-wide">Admin Portal</span>
                <span className="hidden lg:inline"> — Agents Management</span>
              </h1>
            </div>
            <div className="flex items-center gap-5">
              <div className="text-sm font-semibold bg-slate-100 px-4 py-2 rounded-full text-slate-600 border border-slate-200">
                System Admin
              </div>
              <UserAvatarDropdown userType="admin" />
            </div>
          </header>

          <main className="flex-1 p-6 lg:p-8 bg-slate-50 flex flex-col gap-6 items-center justify-center">
            <div className="bg-white border border-slate-200 rounded-[32px] p-10 max-w-lg w-full text-center shadow-md select-none">
              <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
                <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.03 0 1.9.693 2.166 1.638m-7.377 0A49.535 49.535 0 006 4.024m0 0c-1.13.094-1.976 1.057-1.976 2.192V16.5A2.25 2.25 0 006.25 18.75h.75m.75-12.75v12.75c0 .621.504 1.125 1.125 1.125H18" />
                </svg>
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">Agents Page</h2>
              <p className="text-slate-500 text-sm font-medium leading-relaxed mb-6">
                This section is currently under active development. Standard Admin controls for managing insurance agents will be integrated shortly.
              </p>
              <div className="inline-flex items-center gap-2 text-xs bg-blue-50 text-blue-700 px-4 py-2 rounded-full font-bold border border-blue-100">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                Feature Coming Soon
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
