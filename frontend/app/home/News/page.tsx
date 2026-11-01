"use client";

import React, { useState, useEffect } from "react";
import Footer from '@/app/Components/Homepage/Footer';
import Navbar from '@/app/Components/Homepage/Navbar';
import Image from "next/image";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Globe02Icon
} from "@hugeicons/core-free-icons";

const pageTranslations = {
  en: {
    news: "News",
    appSubtitle: "Introducing Insurance App",
    appTitle: "Specifically built for our policy holders",
    appDesc: "SANASA Vehicle Insurance App makes managing your insurance simple and convenient. Policyholders can view their policies, track claims, pay premiums, upload documents, and get 24/7 support all from a secure, user-friendly mobile platform.",
    webPortalBtn: "Web Portal"
  },
  si: {
    news: "පුවත්",
    appSubtitle: "රක්‍ෂණ යෙදුම හඳුන්වා දීම",
    appTitle: "අපගේ රක්‍ෂණ හිමියන් සඳහාම විශේෂයෙන් සකසා ඇත",
    appDesc: "සනස වාහන රක්‍ෂණ යෙදුම ඔබේ රක්‍ෂණය කළමනාකරණය කිරීම සරල සහ පහසු කරයි. රක්‍ෂණ හිමියන්ට ඔවුන්ගේ රක්‍ෂණ ප්‍රතිපත්ති බැලීමට, හිමිකම් ලුහුබැඳීමට, වාරික ගෙවීමට, ලේඛන උඩුගත කිරීමට සහ 24/7 සහාය ලබා ගැනීමට ආරක්ෂිත, පරිශීලක-හිතකාමී ජංගම වේදිකාවකින් හැකියාව ඇත.",
    webPortalBtn: "වෙබ් ද්වාරය"
  },
  ta: {
    news: "செய்திகள்",
    appSubtitle: "காப்பீட்டு செயலியை அறிமுகப்படுத்துகிறோம்",
    appTitle: "எங்கள் பாலிசிதாரர்களுக்காக பிரத்யேகமாக உருவாக்கப்பட்டது",
    appDesc: "சனச வாகன காப்பீட்டு செயலி உங்கள் காப்பீட்டை நிர்வகிப்பதை எளிமையாகவும் வசதியாகவும் ஆக்குகிறது. பாலிசிதாரர்கள் தங்கள் பாலிசிகளைக் காணலாம், கோரிக்கைகளைக் கண்காணிக்கலாம், பிரீமியங்களைச் செலுத்தலாம், ஆவணங்களை பதிவேற்றலாம் மற்றும் 24/7 ஆதரவைப் பெறலாம், அனைத்தும் பாதுகாப்பான, பயனர் நட்பு மொபைல் தளத்திலிருந்து.",
    webPortalBtn: "வலைத்தளம்"
  }
};

export default function News() {
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
            <p className="text-xs font-bold tracking-[0.16em] uppercase text-slate-500 mb-3">
              {t.appSubtitle}
            </p>

            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3 leading-tight">
              {t.appTitle}
            </h2>
            <p className="text-base text-slate-600 leading-relaxed mb-6 font-normal">
              {t.appDesc}
            </p>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center gap-3.5 pt-1">
              {/* Google Play Button */}
              <a
                href="https://expo.dev/accounts/gayathra45/projects/sclaim-go/builds/5fef7f9d-cecd-46d3-9191-3e6ccf35841d"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-slate-950 hover:bg-slate-800 text-white transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-95 no-underline group"
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                  <path d="M3.6 1.4C3.3 1.7 3.1 2.2 3.1 2.8V21.2C3.1 21.8 3.3 22.3 3.6 22.6L3.7 22.7L14.7 11.7V11.3L3.7 0.3L3.6 1.4Z" fill="#00E5FF" />
                  <path d="M18.4 15.4L14.7 11.7V11.3L18.4 7.6L18.5 7.7L22.9 10.2C24.1 10.9 24.1 12.1 22.9 12.8L18.5 15.3L18.4 15.4Z" fill="#FFD600" />
                  <path d="M18.5 15.3L14.7 11.5L3.6 22.6C4.1 23.1 4.9 23.2 5.8 22.7L18.5 15.3Z" fill="#FF3D00" />
                  <path d="M18.5 7.7L5.8 0.3C4.9 -0.2 4.1 -0.1 3.6 0.4L14.7 11.5L18.5 7.7Z" fill="#00E676" />
                </svg>
                <div className="flex flex-col text-left">
                  <span className="text-[9px] uppercase tracking-wider text-slate-300 font-medium leading-none">GET IT ON</span>
                  <span className="text-sm font-bold text-white leading-tight">Google Play</span>
                </div>
              </a>

              {/* Single Web Portal Button */}
              <Link
                href="/Login"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white hover:bg-slate-50 border-2 border-slate-300 hover:border-[#0284c7] text-slate-800 hover:text-[#0284c7] font-bold text-sm transition-all duration-200 no-underline shadow-sm hover:shadow hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
              >
                <HugeiconsIcon icon={Globe02Icon} className="w-4 h-4 text-[#0284c7]" strokeWidth={2.2} />
                <span>{t.webPortalBtn}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
