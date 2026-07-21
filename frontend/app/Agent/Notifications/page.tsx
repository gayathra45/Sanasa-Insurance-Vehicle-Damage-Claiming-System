"use client";

import React from "react";
import AgentNavbar from "@/app/Components/Agent/Navbar";
import AgentFooter from "@/app/Components/Agent/Footer";

export default function AgentNotifications() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
      <AgentNavbar />

      <main className="grow flex items-center justify-center p-8 bg-slate-50 min-h-[500px]">
        <div className="bg-white rounded-3xl p-10 border border-slate-100 shadow-xl max-w-md w-full text-center flex flex-col items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-inner select-none">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-10 h-10 animate-pulse">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L3 20h18L12 2Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 14h10" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h6" />
                </svg>
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Notifications</h2>
            <p className="text-slate-500 font-semibold text-sm mt-2 leading-relaxed">
              This page is in the development stage.
            </p>
          </div>
        </div>
      </main>

      <AgentFooter />
    </div>
  );
}
