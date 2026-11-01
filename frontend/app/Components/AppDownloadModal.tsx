"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
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

const EXPO_BUILD_URL =
  "https://expo.dev/accounts/gayathra45/projects/sclaim-go/builds/5fef7f9d-cecd-46d3-9191-3e6ccf35841d";

const modalTranslations = {
  en: {
    badge: "Official Mobile App",
    title: "Download SANASA SClaim Go",
    subtitle: "All-in-one mobile insurance management for Policyholders and Agents.",
    scanTitle: "Scan with your Phone",
    scanHint: "Point your camera to download & install instantly",
    getItOn: "GET IT ON",
    googlePlay: "Google Play",
    verified: "Official Verified Build",
    feat1: "Submit vehicle claims in under 2 minutes",
    feat2: "Live real-time claim status tracking",
    feat3: "Instant policy cards and 24/7 digital support",
    versionNote: "Compatible with Android 8.0+",
    close: "Close"
  },
  si: {
    badge: "නිල ජංගම යෙදුම",
    title: "සනස SClaim Go යෙදුම බාගත කරන්න",
    subtitle: "රක්ෂණ හිමියන් සහ නියෝජිතයන් සඳහා වන සම්පූර්ණ ජංගම රක්ෂණ වේදිකාව.",
    scanTitle: "දුරකථනයෙන් ස්කෑන් කරන්න",
    scanHint: "ක්ෂණිකව බාගත කර ගැනීමට කැමරාව යොමු කරන්න",
    getItOn: "ලබාගන්න",
    googlePlay: "Google Play",
    verified: "තහවුරු කළ නිල නිකුතුව",
    feat1: "විනාඩි 2ක් ඇතුළත වාහන හිමිකම් ඉදිරිපත් කිරීම",
    feat2: "සජීවී හිමිකම් තත්ත්ව පරීක්ෂාව",
    feat3: "ඩිජිටල් රක්ෂණ කාඩ්පත් සහ 24/7 සහාය",
    versionNote: "Android 8.0+ සඳහා සහය දක්වයි",
    close: "වසන්න"
  },
  ta: {
    badge: "அதிகாரப்பூர்வ மொபைல் செயலி",
    title: "சனச SClaim Go செயலியைப் பதிவிறக்குக",
    subtitle: "பாலிசிதாரர்கள் மற்றும் முகவர்களுக்கான முழுமையான மொபைல் காப்பீட்டு தளம்.",
    scanTitle: "தொலைபேசியில் ஸ்கேன் செய்க",
    scanHint: "உடனடியாகப் பதிவிறக்க கேமராவைக் காட்டவும்",
    getItOn: "பதிவிறக்குக",
    googlePlay: "Google Play",
    verified: "அதிகாரப்பூர்வ பதிப்பு",
    feat1: "2 நிமிடங்களில் விபத்து இழப்பீட்டு கோரிக்கை சமர்ப்பித்தல்",
    feat2: "நேரலை இழப்பீட்டு நிலை கண்காணிப்பு",
    feat3: "டிஜிட்டல் காப்பீட்டு அட்டைகள் மற்றும் 24/7 உதவி",
    versionNote: "Android 8.0+ உடன் இணக்கமானது",
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

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-[0_25px_70px_rgba(0,0,0,0.4)] border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Banner */}
        <div className="relative bg-gradient-to-br from-[#0a2738] via-[#0f3448] to-[#0284c7] p-6 text-white overflow-hidden">
          {/* Subtle decorative glows */}
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-44 h-44 rounded-full bg-cyan-400/15 pointer-events-none blur-2xl" />
          <div className="absolute bottom-0 left-1/3 -mb-10 w-32 h-32 rounded-full bg-sky-400/15 pointer-events-none blur-xl" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all duration-200 cursor-pointer border-none shadow-xs"
            aria-label={t.close}
          >
            <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={2.2} />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white p-2 shadow-lg flex items-center justify-center flex-shrink-0">
              <Image
                src="/logo.png"
                alt="Sanasa Logo"
                width={50}
                height={50}
                className="object-contain"
              />
            </div>

            <div className="flex-1 pr-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 border border-white/20 text-cyan-200 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
                <HugeiconsIcon icon={SmartPhone01Icon} className="w-3 h-3" strokeWidth={2.2} />
                <span>{t.badge}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight">
                {t.title}
              </h3>
              <p className="text-xs text-slate-200/90 font-normal mt-1 leading-snug">
                {t.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7 space-y-5">
          {/* Main Action Card: QR + Download */}
          <div className="bg-slate-50/90 rounded-2xl p-5 border border-slate-200/80 flex flex-col sm:flex-row items-center gap-5">
            {/* Real Scannable QR Code */}
            <div className="relative w-32 h-32 bg-white p-2.5 rounded-2xl shadow-sm border border-slate-200 flex-shrink-0 flex items-center justify-center">
              <Image
                src="/qr-app-download.png"
                alt="Scan to download SClaim Go"
                width={112}
                height={112}
                className="object-contain"
                priority
              />
            </div>

            {/* Content & Direct Download */}
            <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left w-full">
              <h4 className="text-base font-bold text-slate-900 mb-0.5">
                {t.scanTitle}
              </h4>
              <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                {t.scanHint}
              </p>

              {/* Single Official Google Play Button */}
              <a
                href={EXPO_BUILD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center sm:justify-start gap-3.5 px-5 py-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-white transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-95 no-underline group"
              >
                <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
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
                  <span className="text-[9px] uppercase tracking-wider text-slate-300 font-medium leading-none">
                    {t.getItOn}
                  </span>
                  <span className="text-sm font-bold text-white leading-tight">
                    {t.googlePlay}
                  </span>
                </div>
              </a>

              <div className="flex items-center gap-1.5 mt-2.5 text-[11px] font-semibold text-emerald-700">
                <HugeiconsIcon icon={SecurityCheckIcon} className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2.4} />
                <span>{t.verified}</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500 font-normal">{t.versionNote}</span>
              </div>
            </div>
          </div>

          {/* App Highlights */}
          <div className="pt-1">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 text-xs text-slate-700 font-medium">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4 text-emerald-500 flex-shrink-0" strokeWidth={2.5} />
                <span>{t.feat1}</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-700 font-medium">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4 text-emerald-500 flex-shrink-0" strokeWidth={2.5} />
                <span>{t.feat2}</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-700 font-medium">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4 text-emerald-500 flex-shrink-0" strokeWidth={2.5} />
                <span>{t.feat3}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
