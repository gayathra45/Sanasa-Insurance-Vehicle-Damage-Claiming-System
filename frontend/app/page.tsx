"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "./Components/Homepage/Navbar";
import Footer from "./Components/Homepage/Footer";

const pageTranslations = {
  en: {
    heroTitlePrefix: "Protect Your Drive\nwith ",
    heroTitleHighlight: "Confidence.",
    heroTitleSuffix: "",
    heroDesc: "Fast Claims. Affordable Plans. Trusted Protection.\nGet the coverage you deserve with affordable insurance plans, quick and convenient claim processing, and dependable protection backed by a team you can trust.",
    login: "Login",
    signUp: "Sign up",
    ourServices: "Our Services",
    trustedService: "Trusted Service",
    fastClaim: "Fast Claim\nProcessing",
    customerSupport: "24/7\nCustomer Support",
    transparentPolicies: "Transparent Policies",
    servicesDesc: "Our vehicle insurance service is built on trust, reliability, and customer satisfaction, offering fast claim processing, secure transactions, and 24/7 support to ensure a smooth experience. With affordable plans, transparent policies, and islandwide coverage, we make it easy and convenient for policyholders to manage their insurance needs with confidence and peace of mind.",
    motorInsurance: "Our Motor Insurance",
    motorDesc: "SANASA Vehicle Insurance provides reliable and affordable protection for your vehicle, ensuring peace of mind with fast claim processing, secure services, and islandwide support. Designed to meet the needs of policyholders, it offers a convenient and trustworthy way to manage your insurance.",
    appSubtitle: "Introducing Insurance App",
    appTitle: "Specifically built for our policy holders",
    appDesc: "SANASA Vehicle Insurance App makes managing your insurance simple and convenient. Policyholders can view their policies, track claims, pay premiums, upload documents, and get 24/7 support all from a secure, user-friendly mobile platform."
  },
  si: {
    heroTitlePrefix: "",
    heroTitleHighlight: "විශ්වාසයෙන් යුතුව",
    heroTitleSuffix: "\nඔබේ ගමන සුරක්ෂිත කරන්න.",
    heroDesc: "ඉක්මන් හිමිකම්. දැරිය හැකි සැලසුම්. විශ්වාසදායී ආරක්ෂාව.\nදැරිය හැකි රක්ෂණ සැලසුම්, ඉක්මන් සහ පහසු හිමිකම් සැකසීම සහ ඔබ විශ්වාස කරන කණ්ඩායමක සුරක්ෂිතභාවය සමඟින් ඔබට ලැබිය යුතු ආවරණය ලබා ගන්න.",
    login: "පිවිසෙන්න",
    signUp: "ලියාපදිංචි වන්න",
    ourServices: "අපගේ සේවාවන්",
    trustedService: "විශ්වාසදායී සේවාව",
    fastClaim: "වේගවත් හිමිකම්\nසැකසීම",
    customerSupport: "24/7\nපාරිභෝගික සහාය",
    transparentPolicies: "විනිවිද පෙනෙන ප්‍රතිපත්ති",
    servicesDesc: "අපගේ වාහන රක්‍ෂණ සේවාව විශ්වාසය, විශ්වසනීයත්වය සහ පාරිභෝගික තෘප්තිය මත ගොඩනගා ඇති අතර, සුමට අත්දැකීමක් සහතික කිරීම සඳහා වේගවත් හිමිකම් සැකසීම, ආරක්ෂිත ගනුදෙනු සහ 24/7 සහාය ලබා දෙයි. දැරිය හැකි සැලසුම්, විනිවිද පෙනෙන ප්‍රතිපත්ති සහ මුළු දිවයිනම ආවරණය වන පරිදි, අපි රක්‍ෂණ හිමියන්ට තම රක්‍ෂණ අවශ්‍යතා විශ්වාසයෙන් සහ මනසේ සාමයෙන් යුතුව කළමනාකරණය කිරීම පහසු සහ පහසු කරවන්නෙමු.",
    motorInsurance: "අපගේ මෝටර් රථ රක්‍ෂණය",
    motorDesc: "සනස වාහන රක්‍ෂණය මඟින් ඔබේ වාහනය සඳහා විශ්වාසදායක සහ දැරිය හැකි ආරක්ෂාවක් සපයයි, වේගවත් හිමිකම් සැකසීම, ආරක්ෂිත සේවා සහ දිවයින පුරා සහාය ඇතිව මනසේ සාමය සහතික කරයි. රක්‍ෂණ හිමියන්ගේ අවශ්‍යතා සපුරාලීම සඳහා නිර්මාණය කර ඇති මෙය ඔබේ රක්‍ෂණය කළමනාකරණය කිරීම සඳහා පහසු සහ විශ්වාසදායක ක්‍රමයක් ඉදිරිපත් කරයි.",
    appSubtitle: "රක්‍ෂණ යෙදුම හඳුන්වා දීම",
    appTitle: "අපගේ රක්‍ෂණ හිමියන් සඳහාම විශේෂයෙන් සකසා ඇත",
    appDesc: "සනස වාහන රක්‍ෂණ යෙදුම ඔබේ රක්‍ෂණය කළමනාකරණය කිරීම සරල සහ පහසු කරයි. රක්‍ෂණ හිමියන්ට ඔවුන්ගේ රක්‍ෂණ ප්‍රතිපත්ති බැලීමට, හිමිකම් ලුහුබැඳීමට, වාරික ගෙවීමට, ලේඛන උඩුගත කිරීමට සහ 24/7 සහාය ලබා ගැනීමට ආරක්ෂිත, පරිශීලක-හිතකාමී ජංගම වේදිකාවකින් හැකියාව ඇත."
  },
  ta: {
    heroTitlePrefix: "",
    heroTitleHighlight: "நம்பிக்கையுடன்",
    heroTitleSuffix: " உங்கள்\nபயணத்தைப் பாதுகாத்திடுங்கள்.",
    heroDesc: "விரைவான கோரிக்கைகள். மலிவு திட்டங்கள். நம்பகமான பாதுகாப்பு.\nமலிவான காப்பீட்டுத் திட்டங்கள், விரைவான மற்றும் வசதியான கோரிக்கை செயலாக்கம் மற்றும் நீங்கள் நம்பக்கூடிய குழுவின் பாதுகாப்பைப் பெறுங்கள்.",
    login: "உள்நுழை",
    signUp: "பதிவு செய்க",
    ourServices: "எங்கள் சேவைகள்",
    trustedService: "நம்பகமான சேவை",
    fastClaim: "வேகமான கோரிக்கை\nசெயலாக்கம்",
    customerSupport: "24/7\nவாடிக்கையாளர் ஆதரவு",
    transparentPolicies: "வெளிப்படையான கொள்கைகள்",
    servicesDesc: "எங்கள் வாகன காப்பீட்டு சேவை நம்பிக்கை, நம்பகத்தன்மை மற்றும் வாடிக்கையாளர் திருப்தியின் அடிப்படையில் உருவாக்கப்பட்டுள்ளது, விரைவான கோரிக்கை செயலாக்கம், பாதுகாப்பான பரிவர்த்தனைகள் மற்றும் 24/7 ஆதரவை வழங்குகிறது. மலிவான திட்டங்கள், வெளிப்படையான கொள்கைகள் மற்றும் தீவு தழுவிய பாதுகாப்புடன், பாலிசிதாரர்கள் தங்கள் காப்பீட்டுத் தேவைகளை நம்பிக்கையுடனும் மன அமைதியுடனும் நிர்வகிப்பதை நாங்கள் எளிதாக்குகிறோம்.",
    motorInsurance: "எங்கள் மோட்டார் காப்பீடு",
    motorDesc: "சனச வாகன காப்பீடு உங்கள் வாகனத்திற்கு நம்பகமான மற்றும் மலிவான பாதுகாப்பை வழங்குகிறது, விரைவான கோரிக்கை செயலாக்கம், பாதுகாப்பான சேவைகள் மற்றும் தீவு தழுவிய ஆதரவுடன் மன அமைதியை உறுதி செய்கிறது. பாலிசிதாரர்களின் தேவைகளைப் பூர்த்தி செய்யும் வகையில் வடிவமைக்கப்பட்டுள்ள இது, உங்கள் காப்பீட்டை நிர்வகிக்க வசதியான மற்றும் நம்பகமான வழியை வழங்குகிறது.",
    appSubtitle: "காப்பீட்டு செயலியை அறிமுகப்படுத்துகிறோம்",
    appTitle: "எங்கள் பாலிசிதாரர்களுக்காக பிரத்யேகமாக உருவாக்கப்பட்டது",
    appDesc: "சனச வாகன காப்பீட்டு செயலி உங்கள் காப்பீட்டை நிர்வகிப்பதை எளிமையாகவும் வசதியாகவும் ஆக்குகிறது. பாலிசிதாரர்கள் தங்கள் பாலிசிகளைக் காணலாம், கோரிக்கைகளைக் கண்காணிக்கலாம், பிரீமியங்களைச் செலுத்தலாம், ஆவணங்களை பதிவேற்றலாம் மற்றும் 24/7 ஆதரவைப் பெறலாம், அனைத்தும் பாதுகாப்பான, பயனர் நட்பு மொபைல் தளத்திலிருந்து."
  }
};

export default function Home() {
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

  const pageContainer = "min-h-screen bg-white";
  const heroSection = "w-full flex flex-col md:flex-row items-center justify-between py-6 px-6 pb-16 md:pl-16 md:pr-0 xl:pl-24 gap-10";
  const heroTextContainer = "flex flex-col items-start pt-8 md:w-[45%] md:pr-8";
  const heroTitle = "text-5xl md:text-[4.5rem] leading-[1.2] font-bold text-black tracking-tight mb-6 whitespace-pre-line";
  const heroDesc = "text-base md:text-lg text-gray-700 mb-10 font-medium leading-relaxed whitespace-pre-line";
  const buttonGroup = "flex flex-wrap gap-5 md:gap-8";
  const heroLoginBtn = "border-2 border-slate-300 hover:border-[#0284c7] text-slate-800 hover:text-[#0284c7] hover:bg-slate-50 font-bold text-lg md:text-xl py-3 px-10 md:px-12 rounded-full transition-all duration-200 shadow-sm hover:shadow no-underline hover:-translate-y-0.5 active:translate-y-0 active:scale-95 text-center inline-flex items-center justify-center bg-white";
  const heroSignUpBtn = "bg-[#0f3448] hover:bg-[#17465f] text-white font-bold text-lg md:text-xl py-3 px-10 md:px-12 rounded-full transition-all duration-200 shadow-md hover:shadow-lg no-underline hover:-translate-y-0.5 active:translate-y-0 active:scale-95 text-center inline-flex items-center justify-center";
  const heroImage = "relative h-[400px] md:h-[550px] w-full md:w-[55%] rounded-[3rem] md:rounded-[4rem_0_0_4rem] overflow-hidden shadow-lg";
  
  const servicesSection = "py-16 px-6 md:py-24 md:px-16 bg-white flex flex-col items-center";
  const servicesTitle = "text-3xl font-bold text-black mb-12 text-center";
  const servicesGrid = "flex flex-col sm:flex-row sm:flex-wrap lg:flex-nowrap justify-center lg:justify-between gap-6 w-full max-w-[1200px] mb-12";
  const serviceCard = "flex-1 min-w-[calc(50%-1rem)] lg:min-w-0 bg-white border border-gray-200 rounded-[1.5rem] p-10 flex flex-col items-center text-center shadow-sm hover:-translate-y-1 hover:shadow-md hover:border-[#0284c7]/40 transition-all duration-200 group";
  const serviceIcon = "text-[#0284c7] mb-6 flex items-center justify-center transition-all duration-300 group-hover:scale-110";
  const serviceSvg = "w-[72px] h-[72px]";
  const serviceCardTitle = "text-lg font-bold text-gray-900 leading-snug whitespace-pre-line";
  const servicesDesc = "max-w-[900px] text-center text-base text-gray-700 leading-relaxed mx-auto";
  
  const motorSection = "w-full flex flex-col";
  const motorContent = "flex flex-col md:flex-row p-8 md:p-16 bg-white items-center gap-8 md:justify-between";
  const motorText = "flex-1 text-lg leading-relaxed text-gray-800 font-medium text-left";
  const motorImage = "flex-[1.5] flex justify-center items-center";
  
  const appSection = "relative w-full min-h-[500px] md:min-h-[550px] flex items-center justify-center mt-12 overflow-hidden";
  const appBg = "absolute inset-0 w-full h-full z-[1]";
  const appContent = "relative z-[2] flex flex-col md:flex-row items-center justify-center md:justify-between w-full max-w-[1200px] p-8 md:px-16 md:py-12 gap-8 md:gap-16";
  const appImageContainer = "flex-none md:flex-1 flex justify-center items-center";
  const appCard = "flex-1 bg-white/98 p-8 md:p-10 rounded-3xl text-slate-900 text-center md:text-left shadow-2xl";
  const appSubtitle = "text-xs font-bold tracking-[0.15em] uppercase text-slate-500 mb-3";
  const appCardTitle = "text-[1.75rem] md:text-4xl leading-[1.2] font-extrabold text-slate-900 mb-4";
  const appCardDesc = "text-[0.95rem] leading-[1.7] text-slate-600";

  return (
    <div className={pageContainer}>
      <Navbar />
      <main>
        {/* --- Hero Section --- */}
        <div className={heroSection}>
          <div className={heroTextContainer}>
            <h1 className={heroTitle}>
              {t.heroTitlePrefix}
              <span className="bg-gradient-to-r from-[#00bcd4] via-[#0284c7] to-[#0369a1] bg-clip-text text-transparent inline-block">
                {t.heroTitleHighlight}
              </span>
              {t.heroTitleSuffix}
            </h1>
            <p className={heroDesc}>
              {t.heroDesc}
            </p>

            <div className={buttonGroup}>
              <Link href="/Login" className={heroLoginBtn}>
                {t.login}
              </Link>
              <Link href="/SignUp" className={heroSignUpBtn}>
                {t.signUp}
              </Link>
            </div>
          </div>

          <div className={heroImage}>
            <Image
              src="/login_bg.jpg"
              alt="Woman sitting in the trunk of a car looking out at a landscape"
              fill
              style={{ objectFit: "cover" }}
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          </div>
        </div>

        {/* --- Services Section --- */}
        <section className={servicesSection}>
          <h2 className={servicesTitle}>{t.ourServices}</h2>
          <div className={servicesGrid}>
            {/* Card 1: Trusted Service */}
            <div className={serviceCard}>
              <div className={serviceIcon}>
                <svg
                  className={serviceSvg}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <div className={serviceCardTitle}>{t.trustedService}</div>
            </div>

            {/* Card 2: Fast Claim Processing */}
            <div className={serviceCard}>
              <div className={serviceIcon}>
                <svg
                  className={serviceSvg}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="8" />
                  <path d="M12 4V2" />
                  <path d="M12 12l2.5 2.5" />
                  <path d="M4 12H2" />
                  <path d="M6.34 6.34L4.93 4.93" />
                  <path d="M6.34 17.66l-1.41 1.41" />
                  <path d="M22 12h-2" />
                </svg>
              </div>
              <div className={serviceCardTitle}>
                {t.fastClaim}
              </div>
            </div>

            {/* Card 3: 24/7 Customer Support */}
            <div className={serviceCard}>
              <div className={serviceIcon}>
                <svg
                  className={serviceSvg}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className={serviceCardTitle}>
                {t.customerSupport}
              </div>
            </div>

            {/* Card 4: Transparent Policies */}
            <div className={serviceCard}>
              <div className={serviceIcon}>
                <svg
                  className={serviceSvg}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  <path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1Z" />
                  <path d="m9 14 2 2 4-4" />
                </svg>
              </div>
              <div className={serviceCardTitle}>
                {t.transparentPolicies}
              </div>
            </div>
          </div>

          <p className={servicesDesc}>
            {t.servicesDesc}
          </p>
        </section>

        {/* --- Motor Insurance Section --- */}
        <section className={motorSection}>
          <div className="relative w-full h-[280px] sm:h-[340px] md:h-[400px] overflow-hidden flex select-none">
            {/* 1. Crystal Clear HD Background Image (2000x550) */}
            <Image
              src="/home2.jpg"
              alt="Motor Insurance Features"
              fill
              priority
              sizes="100vw"
              className="z-[1] object-cover object-[center_35%]"
            />

            {/* 2. Vibrant Blue Color Filter Overlay */}
            <div className="absolute inset-0 z-[2] bg-gradient-to-r from-sky-600/50 via-[#0284c7]/40 to-blue-700/50 mix-blend-color pointer-events-none" />
            <div className="absolute inset-0 z-[2] bg-gradient-to-r from-[#0284c7]/20 via-transparent to-[#0369a1]/25 pointer-events-none" />

            {/* 3. Top White Blend (Smooth transition from white section above) */}
            <div className="absolute top-0 left-0 right-0 h-24 md:h-32 z-[3] bg-gradient-to-b from-white via-white/60 to-transparent pointer-events-none" />

            {/* 4. Bottom Contrast Shadow for Title */}
            <div className="absolute bottom-0 left-0 right-0 h-28 md:h-36 z-[3] bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />

            {/* 5. Chevron Accents on Right Side (Matching original design) */}
            <div className="absolute right-6 sm:right-10 md:right-16 lg:right-24 bottom-4 sm:bottom-6 md:bottom-8 z-[4] pointer-events-none select-none">
              <svg
                className="w-32 sm:w-44 md:w-56 lg:w-64 xl:w-72 h-auto drop-shadow-[0_4px_16px_rgba(0,0,0,0.45)]"
                viewBox="0 0 200 175"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Top Chevron (Brightest) */}
                <path
                  d="M 0 50 L 100 0 L 200 50 L 200 78 L 100 28 L 0 78 Z"
                  fill="white"
                  fillOpacity="0.95"
                />
                {/* Middle Chevron */}
                <path
                  d="M 0 98 L 100 48 L 200 98 L 200 126 L 100 76 L 0 126 Z"
                  fill="white"
                  fillOpacity="0.75"
                />
                {/* Bottom Chevron */}
                <path
                  d="M 0 146 L 100 96 L 200 146 L 200 174 L 100 124 L 0 174 Z"
                  fill="white"
                  fillOpacity="0.55"
                />
              </svg>
            </div>

            {/* 6. Title on Bottom Left */}
            <div className="absolute inset-0 z-[4] flex items-end p-6 sm:p-10 md:px-16 lg:px-24 md:pb-12 pointer-events-none">
              <h2 className="text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight drop-shadow-[0_3px_10px_rgba(0,0,0,0.7)] select-none">
                {t.motorInsurance}
              </h2>
            </div>
          </div>
          
          <div className={motorContent}>
            <div className={motorText}>
              <p>
                {t.motorDesc}
              </p>
            </div>
            <div className={motorImage}>
              <Image
                src="/Home_2.1.png"
                alt="Vehicles Covered"
                width={1000}
                height={400}
                style={{ objectFit: 'contain' }}
                className="w-full max-w-[800px] h-auto object-contain"
              />
            </div>
          </div>
        </section>

        {/* --- Insurance App Section --- */}
        <section className={appSection}>
          <div className={appBg}>
            <Image
              src="/Home_3.jpg"
              alt="Insurance App background"
              fill
              style={{ objectFit: "cover" }}
            />
          </div>

          <div className={appContent}>
            <div className={appImageContainer}>
              <Image
                src="/Home_3.1.png"
                alt="Insurance app with phone, car and shield"
                width={400}
                height={500}
                style={{ objectFit: "contain" }}
              />
            </div>

            <div className={appCard}>
              <p className={appSubtitle}>{t.appSubtitle}</p>
              <h2 className={appCardTitle}>
                {t.appTitle}
              </h2>
              <p className={appCardDesc}>
                {t.appDesc}
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer className="mt-0" />
    </div>
  );
}
