"use client";

import React, { useState, useEffect } from "react";
import Footer from '@/app/Components/Homepage/Footer';
import Navbar from '@/app/Components/Homepage/Navbar';
import Image from "next/image";

const pageTranslations = {
  en: {
    news: "News",
    appSubtitle: "Introducing Insurance App",
    appTitle: "Specifically built for our policy holders",
    appDesc: "SANASA Vehicle Insurance App makes managing your insurance simple and convenient. Policyholders can view their policies, track claims, pay premiums, upload documents, and get 24/7 support all from a secure, user-friendly mobile platform."
  },
  si: {
    news: "පුවත්",
    appSubtitle: "රක්‍ෂණ යෙදුම හඳුන්වා දීම",
    appTitle: "අපගේ රක්‍ෂණ හිමියන් සඳහාම විශේෂයෙන් සකසා ඇත",
    appDesc: "සනස වාහන රක්‍ෂණ යෙදුම ඔබේ රක්‍ෂණය කළමනාකරණය කිරීම සරල සහ පහසු කරයි. රක්‍ෂණ හිමියන්ට ඔවුන්ගේ රක්‍ෂණ ප්‍රතිපත්ති බැලීමට, හිමිකම් ලුහුබැඳීමට, වාරික ගෙවීමට, ලේඛන උඩුගත කිරීමට සහ 24/7 සහාය ලබා ගැනීමට ආරක්ෂිත, පරිශීලක-හිතකාමී ජංගම වේදිකාවකින් හැකියාව ඇත."
  },
  ta: {
    news: "செய்திகள்",
    appSubtitle: "காப்பீட்டு செயலியை அறிமுகப்படுத்துகிறோம்",
    appTitle: "எங்கள் பாலிசிதாரர்களுக்காக பிரத்யேகமாக உருவாக்கப்பட்டது",
    appDesc: "சனச வாகன காப்பீட்டு செயலி உங்கள் காப்பீட்டை நிர்வகிப்பதை எளிமையாகவும் வசதியாகவும் ஆக்குகிறது. பாலிசிதாரர்கள் தங்கள் பாலிசிகளைக் காணலாம், கோரிக்கைகளைக் கண்காணிக்கலாம், பிரீமியங்களைச் செலுத்தலாம், ஆவணங்களை பதிவேற்றலாம் மற்றும் 24/7 ஆதரவைப் பெறலாம், அனைத்தும் பாதுகாப்பான, பயனர் நட்பு மொபைல் தளத்திலிருந்து."
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
      <section className="w-full flex flex-col md:flex-row items-center justify-between py-12 md:py-20 px-6 md:px-16 gap-10 max-w-6xl mx-auto">
        {/* Left Side - Image */}
        <div className="flex-1 flex justify-center items-center">
          <Image
            src="/Home_3.1.png"
            alt="Insurance App Introduction"
            width={400}
            height={500}
            className="object-contain"
            priority
          />
        </div>

        {/* Right Side - Content */}
        <div className="flex-1 flex flex-col items-start">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-3 leading-tight">
            {t.appSubtitle}
          </h2>
          <p className="text-lg font-semibold text-gray-800 mb-6">
            {t.appTitle}
          </p>
          <p className="text-base text-gray-800 leading-relaxed">
            {t.appDesc}
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}