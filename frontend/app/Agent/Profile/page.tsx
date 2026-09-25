"use client";

import React, { useState, useEffect } from "react";
import AgentNavbar from "@/app/Components/Agent/Navbar";
import AgentFooter from "@/app/Components/Agent/Footer";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  BubbleChatIcon, Alert02Icon 
} from "@hugeicons/core-free-icons";

const translations = {
  en: {
    myProfile: "My Profile",
    devStage: "This page is in the development stage."
  },
  si: {
    myProfile: "මගේ පැතිකඩ",
    devStage: "මෙම පිටුව සංවර්ධනය වෙමින් පවතී."
  },
  ta: {
    myProfile: "என் சுயவிவரம்",
    devStage: "இந்தப் பக்கம் இன்னும் உருவாக்கத்தில் உள்ளது."
  }
};

export default function AgentProfile() {
  const [lang, setLang] = useState<"en" | "si" | "ta">("en");

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem("language") as "en" | "si" | "ta";
    if (savedLang && ["en", "si", "ta"].includes(savedLang)) {
      setLang(savedLang);
    }
  }, []);

  // Listen to language change events from navbar
  useEffect(() => {
    const handleLangChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setLang(customEvent.detail);
      }
    };
    window.addEventListener("language-changed", handleLangChange);
    return () => window.removeEventListener("language-changed", handleLangChange);
  }, []);

  const t = translations[lang];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
      <AgentNavbar />

      <main className="grow flex items-center justify-center p-8 bg-slate-50 min-h-[500px]">
        <div className="bg-white rounded-3xl p-10 border border-slate-100 shadow-xl max-w-md w-full text-center flex flex-col items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-inner select-none">
            <HugeiconsIcon icon={Alert02Icon} className="w-10 h-10 animate-pulse text-blue-600" strokeWidth={1.8} />
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">{t.myProfile}</h2>
            <p className="text-slate-500 font-semibold text-sm mt-2 leading-relaxed">
              {t.devStage}
            </p>
          </div>
        </div>
      </main>

      
      {/* Floating Chat Bubble Button */}
      <button
        className="fixed bottom-8 right-8 z-40 bg-[#00ddff] hover:bg-[#00c8e6] text-white p-5 rounded-full shadow-2xl transition-all duration-150 hover:scale-110 active:scale-95 cursor-pointer focus:outline-none border-none flex items-center justify-center"
        aria-label="Chat support"
      >
        <HugeiconsIcon icon={BubbleChatIcon} className="w-7 h-7 text-white" strokeWidth={2} />
      </button>

      <AgentFooter />
    </div>
  );
}
