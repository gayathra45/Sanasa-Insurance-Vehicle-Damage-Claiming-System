"use client";

import React, { useState, useEffect } from "react";
import OfficeStaffNavbar from "@/app/Components/Office Staff/Navbar";
import UserAvatarDropdown from "@/app/Components/UserAvatarDropdown";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Menu01Icon,
  Notification01Icon,
  Alert02Icon,
} from "@hugeicons/core-free-icons";

export default function OfficeStaffPolicyHolders() {
  const [branch, setBranch] = useState("Galle");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedStaff = sessionStorage.getItem("logged_in_staff");
      if (savedStaff) {
        try {
          const staffObj = JSON.parse(savedStaff);
          if (staffObj && staffObj.branch) {
            setTimeout(() => {
              setBranch(staffObj.branch);
            }, 0);
          }
        } catch (e) {
          console.error("Error parsing logged_in_staff", e);
        }
      }
    }
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
      <div className="flex flex-1 flex-row min-h-0">
        <OfficeStaffNavbar />

        <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
          {/* Top Header Bar */}
          <header className="bg-white border-b border-slate-100 text-slate-800 px-8 py-4 flex justify-between items-center select-none shadow-sm flex-shrink-0 h-[80px] sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("open-mobile-menu"))}
                className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 active:scale-95 transition-all cursor-pointer focus:outline-none"
              >
                <HugeiconsIcon icon={Menu01Icon} className="w-6 h-6" strokeWidth={2.5} />
              </button>
              <h1 className="text-xl font-semibold text-slate-800 flex items-center gap-2 pl-2 lg:pl-0">
                <span className="bg-[#102A43] text-white text-base px-4 py-2 rounded-xl font-black shadow-sm tracking-wide">
                  {branch} Branch
                </span>
                <span className="hidden md:inline text-slate-400 font-medium">— Policy Holders Directory</span>
              </h1>
            </div>

            <div className="flex items-center gap-5">
              {/* Notification Bell Icon */}
              <button className="relative p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer focus:outline-none">
                <HugeiconsIcon icon={Notification01Icon} className="w-6 h-6 text-slate-500 hover:text-slate-800" strokeWidth={2} />
              </button>
              {/* User Avatar Icon */}
              <UserAvatarDropdown userType="office_staff" />
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-8 bg-slate-50 flex items-center justify-center">
            <div className="bg-white rounded-3xl p-10 border border-slate-100 shadow-xl max-w-md w-full text-center flex flex-col items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-inner select-none">
                <HugeiconsIcon icon={Alert02Icon} className="w-10 h-10 animate-pulse" strokeWidth={1.5} />
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Policy Holders</h2>
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
