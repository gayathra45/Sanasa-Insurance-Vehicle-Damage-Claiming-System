"use client";

import React, { useState, useEffect } from "react";
import Footer from '@/app/Components/Homepage/Footer';
import Navbar from '@/app/Components/Homepage/Navbar';
import Image from "next/image";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  SmartPhone01Icon,
  Download01Icon,
  UserIcon,
  Shield01Icon
} from "@hugeicons/core-free-icons";
import AppDownloadModal from "@/app/Components/AppDownloadModal";

const pageTranslations = {
  en: {
    news: "News",
    appSubtitle: "Introducing Insurance App",
    appTitle: "Specifically built for our policy holders",
    appDesc: "SANASA Vehicle Insurance App makes managing your insurance simple and convenient. Policyholders can view their policies, track claims, pay premiums, upload documents, and get 24/7 support all from a secure, user-friendly mobile platform.",
    scanQrBtn: "Scan QR / APK",
    policyHolderWebBtn: "Policyholder Portal",
    agentWebBtn: "Agent Portal"
  },
  si: {
    news: "පුවත්",
    appSubtitle: "රක්‍ෂණ යෙදුම හඳුන්වා දීම",
    appTitle: "අපගේ රක්‍ෂණ හිමියන් සඳහාම විශේෂයෙන් සකසා ඇත",
    appDesc: "සනස වාහන රක්‍ෂණ යෙදුම ඔබේ රක්‍ෂණය කළමනාකරණය කිරීම සරල සහ පහසු කරයි. රක්‍ෂණ හිමියන්ට ඔවුන්ගේ රක්‍ෂණ ප්‍රතිපත්ති බැලීමට, හිමිකම් ලුහුබැඳීමට, වාරික ගෙවීමට, ලේඛන උඩුගත කිරීමට සහ 24/7 සහාය ලබා ගැනීමට ආරක්ෂිත, පරිශීලක-හිතකාමී ජංගම වේදිකාවකින් හැකියාව ඇත.",
    scanQrBtn: "QR / APK බාගත කිරීම",
    policyHolderWebBtn: "ප්‍රතිපත්තිලාභී ද්වාරය",
    agentWebBtn: "නියෝජිත ද්වාරය"
  },
  ta: {
    news: "செய்திகள்",
    appSubtitle: "காப்பீட்டு செயலியை அறிமுகப்படுத்துகிறோம்",
    appTitle: "எங்கள் பாலிசிதாரர்களுக்காக பிரத்யேகமாக உருவாக்கப்பட்டது",
    appDesc: "சனச வாகன காப்பீட்டு செயலி உங்கள் காப்பீட்டை நிர்வகிப்பதை எளிமையாகவும் வசதியாகவும் ஆக்குகிறது. பாலிசிதாரர்கள் தங்கள் பாலிசிகளைக் காணலாம், கோரிக்கைகளைக் கண்காணிக்கலாம், பிரீமியங்களைச் செலுத்தலாம், ஆவணங்களை பதிவேற்றலாம் மற்றும் 24/7 ஆதரவைப் பெறலாம், அனைத்தும் பாதுகாப்பான, பயனர் நட்பு மொபைல் தளத்திலிருந்து.",
    scanQrBtn: "QR / APK பதிவிறக்கம்",
    policyHolderWebBtn: "பாலிசிதாரர் தளம்",
    agentWebBtn: "முகவர் தளம்"
  }
};

export default function News() {
  const [lang, setLang] = useState<"en" | "si" | "ta">("en");
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);

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

  const t = pageTranslations[lang];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <section className="relative w-full max-w-[1400px] h-32 md:h-40 lg:h-48 mb-12 mt-4">
         <div className="absolute top-0 left-0 w-[95%] md:w-[85%] h-full overflow-hidden rounded-r-[3rem] md:rounded-r-[5rem]">
            <Image 
               src="/news_header.jpg" 
               alt="News Banner" 
               fill 
               className="object-cover object-center" 
               priority
            />
            {/* Dark teal/blue overlay */}
            <div className="absolute inset-0 bg-[#004f6e]/70 mix-blend-multiply"></div>
            <div className="absolute inset-0 flex items-center px-10 md:px-20 lg:px-32">
               <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white tracking-wide">
                 {t.news}
               </h1>
            </div>
         </div>
      </section>

      {/* Introducing Insurance App Section */}
      <section className="w-full py-12 md:py-20 px-6 md:px-16 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12 bg-white p-8 md:p-12 rounded-[2.5rem] shadow-xl border border-slate-100">
          {/* Left Side - Image */}
          <div className="flex-1 flex justify-center items-center">
            <Image
              src="/Home_3.1.png"
              alt="Insurance App Introduction"
              width={420}
              height={520}
              className="object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.25)]"
              priority
            />
          </div>

          {/* Right Side - Content */}
          <div className="flex-1 flex flex-col items-start">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50 border border-sky-200/80 text-[#0284c7] text-xs font-bold tracking-wider uppercase mb-3">
              <HugeiconsIcon icon={SmartPhone01Icon} className="w-3.5 h-3.5" strokeWidth={2.4} />
              <span>{t.appSubtitle}</span>
            </div>

            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3 leading-tight">
              {t.appTitle}
            </h2>
            <p className="text-base text-slate-600 leading-relaxed mb-6 font-normal">
              {t.appDesc}
            </p>

            {/* Download Buttons Row */}
            <div className="w-full space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <a
                  href="https://play.google.com/store/apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-3 px-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white transition-all duration-200 shadow-md no-underline"
                >
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                    <path d="M3.6 1.4C3.3 1.7 3.1 2.2 3.1 2.8V21.2C3.1 21.8 3.3 22.3 3.6 22.6L3.7 22.7L14.7 11.7V11.3L3.7 0.3L3.6 1.4Z" fill="#00E5FF" />
                    <path d="M18.4 15.4L14.7 11.7V11.3L18.4 7.6L18.5 7.7L22.9 10.2C24.1 10.9 24.1 12.1 22.9 12.8L18.5 15.3L18.4 15.4Z" fill="#FFD600" />
                    <path d="M18.5 15.3L14.7 11.5L3.6 22.6C4.1 23.1 4.9 23.2 5.8 22.7L18.5 15.3Z" fill="#FF3D00" />
                    <path d="M18.5 7.7L5.8 0.3C4.9 -0.2 4.1 -0.1 3.6 0.4L14.7 11.5L18.5 7.7Z" fill="#00E676" />
                  </svg>
                  <span className="text-sm font-bold text-white">Google Play</span>
                </a>

                <a
                  href="https://www.apple.com/app-store/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-3 px-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white transition-all duration-200 shadow-md no-underline"
                >
                  <svg className="w-5 h-5 flex-shrink-0 fill-white" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.63-.78 1.06-1.85.94-2.94-.93.04-2.02.63-2.67 1.4-.58.68-1.09 1.77-.96 2.83 1.04.08 2.06-.51 2.69-1.29" />
                  </svg>
                  <span className="text-sm font-bold text-white">App Store</span>
                </a>

                <button
                  onClick={() => setDownloadModalOpen(true)}
                  className="flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold text-sm shadow-md transition-all duration-200 cursor-pointer border-none"
                >
                  <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" strokeWidth={2.5} />
                  <span>{t.scanQrBtn}</span>
                </button>
              </div>

              {/* Portal Links */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2.5">
                <Link
                  href="/Policy_Holder/Home"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#0d2a3a] hover:text-[#0284c7] font-semibold text-xs sm:text-sm no-underline"
                >
                  <HugeiconsIcon icon={UserIcon} className="w-4 h-4 text-[#0284c7]" strokeWidth={2.2} />
                  <span>{t.policyHolderWebBtn}</span>
                  <span className="text-slate-400 font-bold">→</span>
                </Link>

                <Link
                  href="/Agent/Dashboard"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#0d2a3a] hover:text-[#0284c7] font-semibold text-xs sm:text-sm no-underline"
                >
                  <HugeiconsIcon icon={Shield01Icon} className="w-4 h-4 text-emerald-600" strokeWidth={2.2} />
                  <span>{t.agentWebBtn}</span>
                  <span className="text-slate-400 font-bold">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* App Download Modal */}
      <AppDownloadModal
        isOpen={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        lang={lang}
        portalType="all"
      />

      <Footer />
    </div>
  );
}