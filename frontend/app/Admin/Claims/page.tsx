"use client";

import React from "react";
import AdminNavbar from "@/app/Components/Admin/Navbar";
import UserAvatarDropdown from "@/app/Components/UserAvatarDropdown";
import { HugeiconsIcon } from "@hugeicons/react";
import { Menu01Icon, SecurityCheckIcon } from "@hugeicons/core-free-icons";

export default function AdminClaimsPage() {
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
                <HugeiconsIcon icon={Menu01Icon} className="w-6 h-6" strokeWidth={2.5} />
              </button>
              {/* Mobile page title */}
              <h1 className="lg:hidden text-lg font-bold text-slate-800 tracking-tight">
                Claims
              </h1>
              {/* Desktop welcome title */}
              <h1 className="hidden lg:flex text-xl font-semibold text-slate-800 items-center gap-2 pl-2 lg:pl-0 truncate">
                <span className="bg-[#102A43] text-white text-base px-4 py-2 rounded-xl font-semibold shadow-sm tracking-wide">Admin Portal</span>
                <span className="hidden lg:inline"> — Claims Management</span>
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
                <HugeiconsIcon icon={SecurityCheckIcon} className="w-10 h-10 text-slate-400" strokeWidth={2} />
              </div>
              <h2 className="text-2xl font-semibold text-slate-800 mb-3 tracking-tight">Claims Page</h2>
              <p className="text-slate-500 text-sm font-medium leading-relaxed mb-6">
                This section is currently under active development. Standard Admin controls for managing claim reports will be integrated shortly.
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
