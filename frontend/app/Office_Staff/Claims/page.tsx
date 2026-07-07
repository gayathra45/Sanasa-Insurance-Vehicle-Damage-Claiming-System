"use client";

import React from "react";
import OfficeStaffNavbar from "@/app/Components/Office Staff/Navbar";

export default function OfficeStaffClaims() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
      <div className="flex flex-1 flex-row min-h-0">
        <OfficeStaffNavbar />

        <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
          <header className="bg-white border-b border-slate-100 text-slate-800 px-8 py-4 flex justify-between items-center select-none shadow-sm flex-shrink-0 h-[80px] sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("open-mobile-menu"))}
                className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 active:scale-95 transition-all cursor-pointer focus:outline-none"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="lg:hidden text-lg font-bold text-slate-800 tracking-tight">
                Claims
              </h1>
              <h1 className="hidden lg:flex text-xl font-semibold text-slate-800 items-center gap-2 pl-2 lg:pl-0 truncate">
                <span className="bg-[#102A43] text-white text-base px-3.5 py-1.5 rounded-xl font-black shadow-sm tracking-wide">Galle Branch</span>
                <span> — Claims Portal</span>
              </h1>
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-8 bg-slate-50 flex items-center justify-center">
            <div className="bg-white rounded-3xl p-10 border border-slate-100 shadow-xl max-w-md w-full text-center flex flex-col items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-inner select-none">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-10 h-10 animate-pulse">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L3 20h18L12 2Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 14h10" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h6" />
                </svg>
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Claims</h2>
                <p className="text-slate-500 font-semibold text-sm mt-2 leading-relaxed">
                  This page is in the development stage.
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
