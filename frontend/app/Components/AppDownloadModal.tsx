"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  Download01Icon,
  SmartPhone01Icon,
  SecurityCheckIcon,
  CheckmarkCircle02Icon
} from "@hugeicons/core-free-icons";

interface AppDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: "en" | "si" | "ta";
  portalType?: "all" | "policyholder" | "agent";
}

const modalTranslations = {
  en: {
    badge: "Official Mobile Application",
    title: "Download SANASA SClaim Go",
    subtitle: "All-in-one mobile insurance management for Policyholders and Agents.",
    scanTitle: "Scan QR with your Smartphone",
    scanHint: "Point your phone camera to download instantly on Android or iOS",
    getOnPlayStore: "Get it on",
    playStore: "Google Play",
    downloadOnAppStore: "Download on the",
    appStore: "App Store",
    directApk: "Direct APK Download",
    directApkDesc: "Android 8.0+ (Latest Release v1.0.0)",
    featuresTitle: "What you can do in the app:",
    feature1: "Submit vehicle accident claims in under 2 minutes",
    feature2: "Live claim assessment & real-time status notifications",
    feature3: "Digital insurance cards, policy details & instant renewal",
    downloadingToast: "Starting APK download for Sanasa SClaim Go v1.0.0...",
    close: "Close"
  },
  si: {
    badge: "නිල ජංගම යෙදුම",
    title: "සනස SClaim Go යෙදුම බාගත කරන්න",
    subtitle: "රක්ෂණ හිමියන් සහ නියෝජිතයන් සඳහා වන සම්පූර්ණ ජංගම රක්ෂණ වේදිකාව.",
    scanTitle: "ඔබගේ ස්මාර්ට් ජංගම දුරකථනයෙන් QR කේතය ස්කෑන් කරන්න",
    scanHint: "Android හෝ iOS මඟින් ක්ෂණිකව බාගත කිරීමට ඔබගේ දුරකථන කැමරාව යොමු කරන්න",
    getOnPlayStore: "ලබාගන්න",
    playStore: "Google Play",
    downloadOnAppStore: "බාගත කරන්න",
    appStore: "App Store",
    directApk: "සෘජු APK බාගත කිරීම",
    directApkDesc: "Android 8.0+ (නවතම සංස්කරණය v1.0.0)",
    featuresTitle: "යෙදුම මඟින් ඔබට කළ හැකි දේ:",
    feature1: "විනාඩි 2ක් ඇතුළත වාහන අනතුරු හිමිකම් ඉදිරිපත් කිරීම",
    feature2: "සජීවී හිමිකම් තක්සේරු කිරීම් සහ තත්ත්ව දැනුම්දීම්",
    feature3: "ඩිජිටල් රක්ෂණ කාඩ්පත් සහ ක්ෂණික අලුත් කිරීම්",
    downloadingToast: "Sanasa SClaim Go v1.0.0 APK බාගත වෙමින් පවතී...",
    close: "වසන්න"
  },
  ta: {
    badge: "அதிகாரப்பூர்வ மொபைல் செயலி",
    title: "சனச SClaim Go செயலியைப் பதிவிறக்குக",
    subtitle: "பாலிசிதாரர்கள் மற்றும் முகவர்களுக்கான முழுமையான மொபைல் காப்பீட்டு தளம்.",
    scanTitle: "உங்கள் ஸ்மார்ட்போனில் QR குறியீட்டை ஸ்கேன் செய்யுங்கள்",
    scanHint: "Android அல்லது iOS இல் உடனடியாக பதிவிறக்க உங்கள் கேமராவைக் காட்டவும்",
    getOnPlayStore: "பதிவிறக்குக",
    playStore: "Google Play",
    downloadOnAppStore: "பதிவிறக்குக",
    appStore: "App Store",
    directApk: "நேரடி APK பதிவிறக்கம்",
    directApkDesc: "Android 8.0+ (சமீபத்திய பதிப்பு v1.0.0)",
    featuresTitle: "செயலியில் நீங்கள் செய்யக்கூடியவை:",
    feature1: "2 நிமிடங்களுக்குள் விபத்து இழப்பீட்டுக் கோரிக்கைகளைச் சமர்ப்பிக்கலாம்",
    feature2: "நேரலை இழப்பீட்டு மதிப்பீடு மற்றும் நிலவர அறிவிப்புகள்",
    feature3: "டிஜிட்டல் காப்பீட்டு அட்டைகள் மற்றும் உடனடி புதுப்பித்தல்",
    downloadingToast: "Sanasa SClaim Go v1.0.0 APK பதிவிறக்கம் தொடங்குகிறது...",
    close: "மூடு"
  }
};

export default function AppDownloadModal({
  isOpen,
  onClose,
  lang = "en",
  portalType = "all"
}: AppDownloadModalProps) {
  const t = modalTranslations[lang] || modalTranslations.en;

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownloadApk = () => {
    // Generate simulated APK download file or direct download
    const blob = new Blob(
      [
        "SANASA SClaim Go - Official Mobile Application Package (Release v1.0.0)\n\nPackage: com.sanasainsurance.mobileapp\nTo install, open this file on your Android device and enable 'Install from unknown sources' if prompted."
      ],
      { type: "application/vnd.android.package-archive" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Sanasa_SClaim_Go_v1.0.0.apk";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.35)] border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Gradient Banner */}
        <div className="relative bg-gradient-to-r from-[#0a2738] via-[#0f3b54] to-[#0284c7] p-6 sm:p-8 text-white">
          {/* Subtle geometric circles */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-cyan-400/10 pointer-events-none blur-2xl" />
          <div className="absolute bottom-0 left-1/3 -mb-12 w-36 h-36 rounded-full bg-sky-400/10 pointer-events-none blur-xl" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all duration-200 cursor-pointer border-none"
            aria-label={t.close}
          >
            <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={2.2} />
          </button>

          <div className="flex items-start gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white p-2 shadow-lg flex items-center justify-center flex-shrink-0">
              <Image
                src="/logo.png"
                alt="Sanasa Logo"
                width={52}
                height={52}
                className="object-contain"
              />
            </div>

            <div className="flex-1 pr-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-cyan-200 text-xs font-semibold tracking-wider uppercase mb-2">
                <HugeiconsIcon icon={SmartPhone01Icon} className="w-3.5 h-3.5" strokeWidth={2.2} />
                <span>{t.badge}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1">
                {t.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-200 font-normal leading-relaxed">
                {t.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* QR Code & Direct Scan Section */}
          <div className="bg-gradient-to-br from-slate-50 to-sky-50/50 rounded-2xl p-5 border border-slate-200/80 flex flex-col sm:flex-row items-center gap-6">
            {/* Visual SVG QR Code */}
            <div className="relative w-36 h-36 bg-white p-3 rounded-2xl shadow-md border border-slate-200 flex-shrink-0 flex items-center justify-center group">
              <svg
                viewBox="0 0 140 140"
                className="w-full h-full text-slate-900"
                fill="currentColor"
              >
                {/* Outer corners */}
                <rect x="10" y="10" width="35" height="35" rx="6" fill="#0f3b54" />
                <rect x="16" y="16" width="23" height="23" rx="3" fill="#ffffff" />
                <rect x="22" y="22" width="11" height="11" rx="2" fill="#0284c7" />

                <rect x="95" y="10" width="35" height="35" rx="6" fill="#0f3b54" />
                <rect x="101" y="16" width="23" height="23" rx="3" fill="#ffffff" />
                <rect x="107" y="22" width="11" height="11" rx="2" fill="#0284c7" />

                <rect x="10" y="95" width="35" height="35" rx="6" fill="#0f3b54" />
                <rect x="16" y="101" width="23" height="23" rx="3" fill="#ffffff" />
                <rect x="22" y="107" width="11" height="11" rx="2" fill="#0284c7" />

                {/* QR Matrix Pattern Dots */}
                <rect x="52" y="14" width="7" height="7" rx="1.5" fill="#0f3b54" />
                <rect x="65" y="14" width="7" height="7" rx="1.5" fill="#0284c7" />
                <rect x="78" y="14" width="7" height="7" rx="1.5" fill="#0f3b54" />

                <rect x="52" y="27" width="7" height="7" rx="1.5" fill="#0284c7" />
                <rect x="65" y="27" width="7" height="7" rx="1.5" fill="#0f3b54" />
                <rect x="78" y="27" width="7" height="7" rx="1.5" fill="#0284c7" />

                <rect x="52" y="40" width="7" height="7" rx="1.5" fill="#0f3b54" />
                <rect x="65" y="40" width="7" height="7" rx="1.5" fill="#0284c7" />
                <rect x="78" y="40" width="7" height="7" rx="1.5" fill="#0f3b54" />

                <rect x="14" y="52" width="7" height="7" rx="1.5" fill="#0284c7" />
                <rect x="27" y="52" width="7" height="7" rx="1.5" fill="#0f3b54" />
                <rect x="40" y="52" width="7" height="7" rx="1.5" fill="#0284c7" />
                <rect x="52" y="52" width="7" height="7" rx="1.5" fill="#0f3b54" />
                <rect x="65" y="52" width="7" height="7" rx="1.5" fill="#0284c7" />
                <rect x="78" y="52" width="7" height="7" rx="1.5" fill="#0f3b54" />
                <rect x="91" y="52" width="7" height="7" rx="1.5" fill="#0284c7" />
                <rect x="104" y="52" width="7" height="7" rx="1.5" fill="#0f3b54" />
                <rect x="117" y="52" width="7" height="7" rx="1.5" fill="#0284c7" />

                <rect x="14" y="65" width="7" height="7" rx="1.5" fill="#0f3b54" />
                <rect x="27" y="65" width="7" height="7" rx="1.5" fill="#0284c7" />
                <rect x="40" y="65" width="7" height="7" rx="1.5" fill="#0f3b54" />
                <rect x="52" y="65" width="7" height="7" rx="1.5" fill="#0284c7" />
                <rect x="78" y="65" width="7" height="7" rx="1.5" fill="#0284c7" />
                <rect x="91" y="65" width="7" height="7" rx="1.5" fill="#0f3b54" />
                <rect x="117" y="65" width="7" height="7" rx="1.5" fill="#0284c7" />

                <rect x="14" y="78" width="7" height="7" rx="1.5" fill="#0284c7" />
                <rect x="27" y="78" width="7" height="7" rx="1.5" fill="#0f3b54" />
                <rect x="40" y="78" width="7" height="7" rx="1.5" fill="#0284c7" />
                <rect x="52" y="78" width="7" height="7" rx="1.5" fill="#0f3b54" />
                <rect x="65" y="78" width="7" height="7" rx="1.5" fill="#0284c7" />
                <rect x="78" y="78" width="7" height="7" rx="1.5" fill="#0f3b54" />
                <rect x="91" y="78" width="7" height="7" rx="1.5" fill="#0284c7" />
                <rect x="104" y="78" width="7" height="7" rx="1.5" fill="#0f3b54" />
                <rect x="117" y="78" width="7" height="7" rx="1.5" fill="#0284c7" />

                <rect x="52" y="95" width="7" height="7" rx="1.5" fill="#0f3b54" />
                <rect x="65" y="95" width="7" height="7" rx="1.5" fill="#0284c7" />
                <rect x="78" y="95" width="7" height="7" rx="1.5" fill="#0f3b54" />
                <rect x="95" y="95" width="7" height="7" rx="1.5" fill="#0284c7" />
                <rect x="108" y="95" width="7" height="7" rx="1.5" fill="#0f3b54" />
                <rect x="121" y="95" width="7" height="7" rx="1.5" fill="#0284c7" />

                <rect x="52" y="108" width="7" height="7" rx="1.5" fill="#0284c7" />
                <rect x="65" y="108" width="7" height="7" rx="1.5" fill="#0f3b54" />
                <rect x="95" y="108" width="7" height="7" rx="1.5" fill="#0f3b54" />
                <rect x="108" y="108" width="7" height="7" rx="1.5" fill="#0284c7" />
                <rect x="121" y="108" width="7" height="7" rx="1.5" fill="#0f3b54" />

                <rect x="52" y="121" width="7" height="7" rx="1.5" fill="#0f3b54" />
                <rect x="78" y="121" width="7" height="7" rx="1.5" fill="#0284c7" />
                <rect x="95" y="121" width="7" height="7" rx="1.5" fill="#0284c7" />
                <rect x="108" y="121" width="7" height="7" rx="1.5" fill="#0f3b54" />
                <rect x="121" y="121" width="7" height="7" rx="1.5" fill="#0284c7" />

                {/* Center shield badge */}
                <circle cx="70" cy="70" r="14" fill="#ffffff" />
                <circle cx="70" cy="70" r="11" fill="#0284c7" />
                <path
                  d="M66 70 L69 73 L75 67"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h4 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
                {t.scanTitle}
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 mb-3 leading-relaxed">
                {t.scanHint}
              </p>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                <HugeiconsIcon icon={SecurityCheckIcon} className="w-4 h-4 text-emerald-600" strokeWidth={2.2} />
                <span>Verified Official Build • SSL Encrypted</span>
              </div>
            </div>
          </div>

          {/* Download Buttons Section */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Google Play Button */}
              <a
                href="https://play.google.com/store/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3.5 px-5 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-95 no-underline group"
              >
                {/* Official Google Play Triangle Icon */}
                <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
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
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] tracking-wider uppercase text-slate-300 font-medium">
                    {t.getOnPlayStore}
                  </span>
                  <span className="text-base font-bold text-white tracking-tight leading-tight">
                    {t.playStore}
                  </span>
                </div>
              </a>

              {/* Apple App Store Button */}
              <a
                href="https://www.apple.com/app-store/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3.5 px-5 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-95 no-underline group"
              >
                {/* Official Apple Icon */}
                <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
                  <svg className="w-7 h-7 fill-white" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.63-.78 1.06-1.85.94-2.94-.93.04-2.02.63-2.67 1.4-.58.68-1.09 1.77-.96 2.83 1.04.08 2.06-.51 2.69-1.29" />
                  </svg>
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] tracking-wider uppercase text-slate-300 font-medium">
                    {t.downloadOnAppStore}
                  </span>
                  <span className="text-base font-bold text-white tracking-tight leading-tight">
                    {t.appStore}
                  </span>
                </div>
              </a>
            </div>

            {/* Direct APK Download Button */}
            <button
              onClick={handleDownloadApk}
              className="w-full flex items-center justify-between px-5 py-3 rounded-2xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-950 font-semibold transition-all duration-200 cursor-pointer shadow-xs hover:shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0284c7] text-white flex items-center justify-center shadow-xs">
                  <HugeiconsIcon icon={Download01Icon} className="w-5 h-5" strokeWidth={2.2} />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-bold text-slate-900">{t.directApk}</span>
                  <span className="text-xs text-slate-500 font-medium">{t.directApkDesc}</span>
                </div>
              </div>
              <span className="text-xs font-bold text-[#0284c7] bg-white px-3 py-1.5 rounded-full border border-sky-200">
                APK ~38MB
              </span>
            </button>
          </div>

          {/* Quick App Feature Highlights */}
          <div className="pt-2 border-t border-slate-100">
            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
              {t.featuresTitle}
            </h5>
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4 text-emerald-500 flex-shrink-0" strokeWidth={2.5} />
                <span>{t.feature1}</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4 text-emerald-500 flex-shrink-0" strokeWidth={2.5} />
                <span>{t.feature2}</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4 text-emerald-500 flex-shrink-0" strokeWidth={2.5} />
                <span>{t.feature3}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
