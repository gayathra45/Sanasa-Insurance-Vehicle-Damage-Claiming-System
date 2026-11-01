"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "./Components/Homepage/Navbar";
import Footer from "./Components/Homepage/Footer";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  SecurityCheckIcon,
  FlashIcon,
  CustomerService01Icon,
  FileCheckIcon,
  SmartPhone01Icon,
  Download01Icon,
  UserIcon,
  Shield01Icon,
  CheckmarkCircle02Icon
} from "@hugeicons/core-free-icons";
import AppDownloadModal from "./Components/AppDownloadModal";

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
    appDesc: "SANASA Vehicle Insurance App makes managing your insurance simple and convenient. Policyholders can view their policies, track claims, pay premiums, upload documents, and get 24/7 support all from a secure, user-friendly mobile platform.",
    getAppBtn: "Get SClaim Go App",
    scanQrBtn: "Scan QR / APK",
    policyHolderWebBtn: "Policyholder Web Portal",
    agentWebBtn: "Agent Web Portal",
    webPortalHeader: "Prefer using browser? Open Web Portals",
    featFastClaims: "Instant e-Claim Submission",
    featLiveTracking: "Live Real-time Claim Status",
    featDigitalHelp: "24/7 Dedicated Support"
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
    appDesc: "සනස වාහන රක්‍ෂණ යෙදුම ඔබේ රක්‍ෂණය කළමනාකරණය කිරීම සරල සහ පහසු කරයි. රක්‍ෂණ හිමියන්ට ඔවුන්ගේ රක්‍ෂණ ප්‍රතිපත්ති බැලීමට, හිමිකම් ලුහුබැඳීමට, වාරික ගෙවීමට, ලේඛන උඩුගත කිරීමට සහ 24/7 සහාය ලබා ගැනීමට ආරක්ෂිත, පරිශීලක-හිතකාමී ජංගම වේදිකාවකින් හැකියාව ඇත.",
    getAppBtn: "SClaim Go යෙදුම බාගත කරන්න",
    scanQrBtn: "QR / APK බාගත කිරීම",
    policyHolderWebBtn: "රක්ෂණ හිමි වෙබ් ද්වාරය",
    agentWebBtn: "නියෝජිත වෙබ් ද්වාරය",
    webPortalHeader: "බ්‍රවුසරය භාවිත කිරීමට කැමතිද? වෙබ් ද්වාර:",
    featFastClaims: "ක්ෂණික ඊ-හිමිකම් ගොනු කිරීම",
    featLiveTracking: "සජීවී හිමිකම් තත්ත්ව පරීක්ෂාව",
    featDigitalHelp: "24/7 පාරිභෝගික ඩිජිටල් සහාය"
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
    appDesc: "சனச வாகன காப்பீட்டு செயலி உங்கள் காப்பீட்டை நிர்வகிப்பதை எளிமையாகவும் வசதியாகவும் ஆக்குகிறது. பாலிசிதாரர்கள் தங்கள் பாலிசிகளைக் காணலாம், கோரிக்கைகளைக் கண்காணிக்கலாம், பிரீமியங்களைச் செலுத்தலாம், ஆவணங்களை பதிவேற்றலாம் மற்றும் 24/7 ஆதரவைப் பெறலாம், அனைத்தும் பாதுகாப்பான, பயனர் நட்பு மொபைல் தளத்திலிருந்து.",
    getAppBtn: "SClaim Go செயலியைப் பெறுக",
    scanQrBtn: "QR / APK பதிவிறக்கம்",
    policyHolderWebBtn: "பாலிசிதாரர் வலைத்தளம்",
    agentWebBtn: "முகவர் வலைத்தளம்",
    webPortalHeader: "உலாவி மூலம் இணைய விரும்புகிறீர்களா? வலைத்தளங்கள்:",
    featFastClaims: "உடனடி கோரிக்கை சமர்ப்பித்தல்",
    featLiveTracking: "நேரலை இழப்பீட்டு நிலை",
    featDigitalHelp: "24/7 டிஜிட்டல் உதவி"
  }
};

export default function Home() {
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
                <HugeiconsIcon icon={SecurityCheckIcon} className={serviceSvg} strokeWidth={1.5} />
              </div>
              <div className={serviceCardTitle}>{t.trustedService}</div>
            </div>

            {/* Card 2: Fast Claim Processing */}
            <div className={serviceCard}>
              <div className={serviceIcon}>
                <HugeiconsIcon icon={FlashIcon} className={serviceSvg} strokeWidth={1.5} />
              </div>
              <div className={serviceCardTitle}>
                {t.fastClaim}
              </div>
            </div>

            {/* Card 3: 24/7 Customer Support */}
            <div className={serviceCard}>
              <div className={serviceIcon}>
                <HugeiconsIcon icon={CustomerService01Icon} className={serviceSvg} strokeWidth={1.5} />
              </div>
              <div className={serviceCardTitle}>
                {t.customerSupport}
              </div>
            </div>

            {/* Card 4: Transparent Policies */}
            <div className={serviceCard}>
              <div className={serviceIcon}>
                <HugeiconsIcon icon={FileCheckIcon} className={serviceSvg} strokeWidth={1.5} />
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
                src="/f1.png"
                alt="Vehicles Covered"
                width={1000}
                height={400}
                style={{ objectFit: 'contain' }}
                className="w-full max-w-[800px] h-auto object-contain"
              />
            </div>
          </div>
        </section>

        {/* --- Redesigned Insurance App Section --- */}
        <section className="relative w-full min-h-[640px] flex items-center justify-center mt-14 overflow-hidden bg-slate-950">
          {/* Background Image with Dark Vignette & Mesh Overlay */}
          <div className="absolute inset-0 w-full h-full z-[1]">
            <Image
              src="/Home_3.jpg"
              alt="Insurance App background"
              fill
              sizes="100vw"
              className="object-cover opacity-35 scale-105"
            />
            {/* Cinematic Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/80 to-[#072436]/90" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/70" />
          </div>

          {/* Ambient Glowing Blobs */}
          <div className="absolute top-1/4 left-10 w-96 h-96 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none z-[1]" />
          <div className="absolute bottom-10 right-20 w-80 h-80 rounded-full bg-sky-500/10 blur-3xl pointer-events-none z-[1]" />

          {/* Main Container */}
          <div className="relative z-[2] w-full max-w-[1240px] px-6 sm:px-10 lg:px-16 py-16 sm:py-20 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-14">
            {/* Left Side: Floating Phone Showcase with Interactive Badges */}
            <div className="flex-none lg:flex-1 w-full max-w-[460px] flex flex-col items-center justify-center relative group">
              <div className="relative w-full flex items-center justify-center">
                {/* Ambient glow behind phone */}
                <div className="absolute w-72 h-72 sm:w-80 sm:h-80 rounded-full bg-cyan-400/20 blur-2xl group-hover:bg-cyan-400/30 transition-all duration-700 pointer-events-none" />

                {/* The Phone + Car Image */}
                <Image
                  src="/Home_3.1.png"
                  alt="Sanasa Insurance Mobile App"
                  width={460}
                  height={540}
                  priority
                  className="object-contain relative z-10 drop-shadow-[0_25px_50px_rgba(0,0,0,0.7)] group-hover:scale-105 transition-transform duration-500 ease-out"
                />

                {/* Floating Micro-Badge Top: Fast Claim */}
                <div className="absolute -top-3 right-0 sm:right-4 z-20 bg-slate-900/90 backdrop-blur-md border border-white/20 text-white rounded-2xl px-4 py-2.5 shadow-2xl flex items-center gap-2.5 animate-in fade-in duration-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <div className="text-left">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Status</p>
                    <p className="text-xs font-bold text-white">Instant Claim Filing</p>
                  </div>
                </div>

                {/* Floating Micro-Badge Bottom: 24/7 Support */}
                <div className="absolute -bottom-4 left-0 sm:left-4 z-20 bg-white/95 backdrop-blur-md border border-slate-200 text-slate-900 rounded-2xl px-4 py-2.5 shadow-2xl flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <HugeiconsIcon icon={SecurityCheckIcon} className="w-4 h-4" strokeWidth={2.5} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Sanasa Verified</p>
                    <p className="text-xs font-bold text-slate-800">24/7 Digital Support</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side: Redesigned Content Card */}
            <div className="flex-1 w-full bg-white/95 backdrop-blur-2xl p-7 sm:p-10 lg:p-12 rounded-[2.5rem] shadow-[0_25px_70px_rgba(0,0,0,0.45)] border border-white/80 text-slate-900 text-left relative overflow-hidden">
              {/* Top Accent Gradient Bar */}
              <div className="h-1.5 w-28 bg-gradient-to-r from-[#0284c7] via-cyan-400 to-emerald-400 rounded-full mb-6" />

              {/* Subtitle Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50 border border-sky-200/80 text-[#0284c7] text-xs font-bold tracking-wider uppercase mb-3">
                <HugeiconsIcon icon={SmartPhone01Icon} className="w-3.5 h-3.5" strokeWidth={2.4} />
                <span>{t.appSubtitle}</span>
              </div>

              {/* Card Title */}
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight tracking-tight mb-4">
                {t.appTitle}
              </h2>

              {/* Card Description */}
              <p className="text-[0.98rem] sm:text-base leading-[1.75] text-slate-600 font-normal mb-6">
                {t.appDesc}
              </p>

              {/* Micro Benefits Pills */}
              <div className="flex flex-wrap gap-2.5 mb-8">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200/80 text-slate-700 text-xs font-semibold">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2.5} />
                  {t.featFastClaims}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200/80 text-slate-700 text-xs font-semibold">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2.5} />
                  {t.featLiveTracking}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200/80 text-slate-700 text-xs font-semibold">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2.5} />
                  {t.featDigitalHelp}
                </span>
              </div>

              {/* SECTION 1: Mobile App Download Buttons */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* Google Play Button */}
                  <a
                    href="https://play.google.com/store/apps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-3 px-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-95 no-underline group"
                  >
                    <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M3.6 1.4C3.3 1.7 3.1 2.2 3.1 2.8V21.2C3.1 21.8 3.3 22.3 3.6 22.6L3.7 22.7L14.7 11.7V11.3L3.7 0.3L3.6 1.4Z"
                        fill="#00E5FF"
                      />
                      <path
                        d="M18.4 15.4L14.7 11.7V11.3L18.4 7.6L18.5 7.7L22.9 10.2C24.1 10.9 24.1 12.1 22.9 12.8L18.5 15.3L18.4 15.4Z"
                        fill="#FFD600"
                      />
                      <path
                        d="M18.5 15.3L14.7 11.5L3.6 22.6C4.1 23.1 4.9 23.2 5.8 22.7L18.5 15.3Z"
                        fill="#FF3D00"
                      />
                      <path
                        d="M18.5 7.7L5.8 0.3C4.9 -0.2 4.1 -0.1 3.6 0.4L14.7 11.5L18.5 7.7Z"
                        fill="#00E676"
                      />
                    </svg>
                    <div className="flex flex-col text-left">
                      <span className="text-[9px] uppercase tracking-wider text-slate-300 font-medium">GET IT ON</span>
                      <span className="text-sm font-bold text-white leading-tight">Google Play</span>
                    </div>
                  </a>

                  {/* App Store Button */}
                  <a
                    href="https://www.apple.com/app-store/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-3 px-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-95 no-underline group"
                  >
                    <svg className="w-6 h-6 flex-shrink-0 fill-white" viewBox="0 0 24 24">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.63-.78 1.06-1.85.94-2.94-.93.04-2.02.63-2.67 1.4-.58.68-1.09 1.77-.96 2.83 1.04.08 2.06-.51 2.69-1.29" />
                    </svg>
                    <div className="flex flex-col text-left">
                      <span className="text-[9px] uppercase tracking-wider text-slate-300 font-medium">Download on</span>
                      <span className="text-sm font-bold text-white leading-tight">App Store</span>
                    </div>
                  </a>

                  {/* Scan QR / Direct APK Button */}
                  <button
                    onClick={() => setDownloadModalOpen(true)}
                    className="flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#0284c7] to-[#00a8cc] hover:from-[#0369a1] hover:to-[#0284c7] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer border-none hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                    title="Scan QR Code or Download APK directly"
                  >
                    <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" strokeWidth={2.5} />
                    <span>{t.scanQrBtn}</span>
                  </button>
                </div>

                {/* SECTION 2: Policyholder & Agent Web Portals */}
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 mb-2.5">
                    {t.webPortalHeader}
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {/* Policyholder Web Portal */}
                    <Link
                      href="/Policy_Holder/Home"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/90 text-[#0d2a3a] hover:text-[#0284c7] font-semibold text-xs sm:text-sm transition-all duration-150 no-underline shadow-2xs hover:shadow-xs hover:-translate-y-0.5"
                    >
                      <HugeiconsIcon icon={UserIcon} className="w-4 h-4 text-[#0284c7]" strokeWidth={2.2} />
                      <span>{t.policyHolderWebBtn}</span>
                      <span className="text-slate-400 font-bold ml-0.5">→</span>
                    </Link>

                    {/* Agent Web Portal */}
                    <Link
                      href="/Agent/Dashboard"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/90 text-[#0d2a3a] hover:text-[#0284c7] font-semibold text-xs sm:text-sm transition-all duration-150 no-underline shadow-2xs hover:shadow-xs hover:-translate-y-0.5"
                    >
                      <HugeiconsIcon icon={Shield01Icon} className="w-4 h-4 text-emerald-600" strokeWidth={2.2} />
                      <span>{t.agentWebBtn}</span>
                      <span className="text-slate-400 font-bold ml-0.5">→</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Reusable Mobile App Download Modal */}
      <AppDownloadModal
        isOpen={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        lang={lang}
        portalType="all"
      />

      <Footer className="mt-0" />
    </div>
  );
}

