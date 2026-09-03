"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const translations = {
  en: {
    home: "Home",
    contactUs: "Contact Us",
    news: "News",
    aboutUs: "About Us",
    hotline: "24H Customer Hotline: +94 112 003 000",
    branches: "Branches",
    branchTitle: "Sanasa Insurance Branches",
    searchPlaceholder: "Search branches by city, district or address...",
    close: "Close",
    callNow: "Call Branch",
    login: "Login",
    signUp: "Sign Up"
  },
  si: {
    home: "මුල් පිටුව",
    contactUs: "සම්බන්ධ වන්න",
    news: "පුවත්",
    aboutUs: "අප ගැන",
    hotline: "24 පැය පාරිභෝගික සේවය: +94 112 003 000",
    branches: "ශාඛා",
    branchTitle: "සනස රක්ෂණ ශාඛා ජාලය",
    searchPlaceholder: "නගරය, දිස්ත්‍රික්කය හෝ ලිපිනය අනුව සොයන්න...",
    close: "වසන්න",
    callNow: "ඇමතුමක් ගන්න",
    login: "පිවිසෙන්න",
    signUp: "ලියාපදිංචි වන්න"
  },
  ta: {
    home: "முகப்பு",
    contactUs: "தொடர்பு கொள்ள",
    news: "செய்திகள்",
    aboutUs: "எங்களைப் பற்றி",
    hotline: "24 மணி நேர வாடிக்கையாளர் சேவை: +94 112 003 000",
    branches: "கிளைகள்",
    branchTitle: "சனச காப்பீட்டுக் கிளைகள்",
    searchPlaceholder: "நகரம் அல்லது முகவரி மூலம் தேடுங்கள்...",
    close: "மூடு",
    callNow: "அழைக்க",
    login: "உள்நுழை",
    signUp: "பதிவு செய்க"
  }
};

const branches = [
  { name: { en: "Colombo Head Office", si: "කොළඹ ප්‍රධාන කාර්යාලය", ta: "கொழும்பு தலைமை அலுவலகம்" }, phone: "+94 112 003 000", address: "No: 172, Elvitigala Mv, Colombo 8" },
  { name: { en: "Galle Branch", si: "ගාල්ල ශාඛාව", ta: "காலி கிளை" }, phone: "+94 912 245 800", address: "Galle Road, Galle" },
  { name: { en: "Kandy Branch", si: "මහනුවර ශාඛාව", ta: "கண்டி கிளை" }, phone: "+94 812 223 456", address: "William Gopallawa Mawatha, Kandy" },
  { name: { en: "Jaffna Branch", si: "යාපනය ශාඛාව", ta: "யாழ்ப்பாணம் கிளை" }, phone: "+94 212 222 789", address: "Hospital Road, Jaffna" },
  { name: { en: "Matara Branch", si: "මාතර ශාඛාව", ta: "மாத்தறை கிளை" }, phone: "+94 412 222 333", address: "Anagarika Dharmapala Mawatha, Matara" },
  { name: { en: "Kurunegala Branch", si: "කුරුණෑගල ශාඛාව", ta: "குருணாகல் கிளை" }, phone: "+94 372 222 111", address: "Colombo Road, Kurunegala" },
  { name: { en: "Gampaha Branch", si: "ගම්පහ ශාඛාව", ta: "கம்பஹா கிளை" }, phone: "+94 332 222 000", address: "Ja-Ela Road, Gampaha" },
  { name: { en: "Anuradhapura Branch", si: "අනුරාධපුර ශාඛාව", ta: "அனுராதபுரம் கிளை" }, phone: "+94 252 222 555", address: "Maithripala Senanayake Mawatha, Anuradhapura" },
  { name: { en: "Badulla Branch", si: "බදුල්ල ශාඛාව", ta: "பதுளை கிளை" }, phone: "+94 552 222 999", address: "Bandarawela Road, Badulla" },
  { name: { en: "Kalutara Branch", si: "කළුතර ශාඛාව", ta: "களுத்துறை கிளை" }, phone: "+94 342 222 777", address: "Galle Road, Kalutara" }
];

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [branchesModalOpen, setBranchesModalOpen] = useState(false);
  const [lang, setLang] = useState<"en" | "si" | "ta">("en");
  const [searchQuery, setSearchQuery] = useState("");

  const lastScrollY = useRef(0);
  const langMenuRef = useRef<HTMLDivElement>(null);

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem("language") as "en" | "si" | "ta";
    if (savedLang && ["en", "si", "ta"].includes(savedLang)) {
      setLang(savedLang);
    }
  }, []);

  // Close language dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const changeLanguage = (newLang: "en" | "si" | "ta") => {
    setLang(newLang);
    localStorage.setItem("language", newLang);
    setLangMenuOpen(false);
    window.dispatchEvent(new CustomEvent("language-changed", { detail: newLang }));
  };

  useEffect(() => {
    const handleScroll = () => {
      if (isOpen) return; // Keep visible if mobile menu is open
      const currentScrollY = window.scrollY;
      
      if (currentScrollY <= 50) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY.current) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isOpen]);

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/" || pathname === "";
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  const t = translations[lang];

  const filteredBranches = branches.filter(b => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      b.name.en.toLowerCase().includes(query) ||
      b.name.si.toLowerCase().includes(query) ||
      b.name.ta.toLowerCase().includes(query) ||
      b.address.toLowerCase().includes(query) ||
      b.phone.includes(query)
    );
  });

  return (
    <div className="w-full h-[93px] md:h-[101px] select-none">
      <nav
        className={`fixed left-0 right-0 w-full bg-white border-b border-gray-200 z-50 transition-all duration-300 ease-in-out shadow-md ${
          isVisible ? "top-0" : "-top-32"
        }`}
      >
        {/* Top Utility Bar (Vibrant Sky Blue background) */}
        <div className="bg-[#0284c7] border-b border-sky-600/30 text-white py-1.5 px-6 md:px-16 flex items-center justify-between text-xs select-none w-full font-medium shadow-inner">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-sky-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span className="text-white">
              <span className="hidden sm:inline">{t.hotline}</span>
              <span className="inline sm:hidden">📞 +94 112 003 000</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Branch Button */}
            <button
              onClick={() => {
                setSearchQuery("");
                setBranchesModalOpen(true);
              }}
              className="flex items-center gap-1 text-white hover:text-sky-100 transition-colors border-none bg-transparent cursor-pointer focus:outline-none select-none text-xs font-semibold"
            >
              <svg className="w-3.5 h-3.5 text-sky-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span>{t.branches}</span>
            </button>

            {/* Divider */}
            <span className="h-3 w-px bg-white/25" />

            {/* Language Selector */}
            <div className="relative" ref={langMenuRef}>
              <button
                onClick={() => setLangMenuOpen((prev) => !prev)}
                className="flex items-center gap-1 text-white hover:text-sky-100 transition-colors border-none bg-transparent cursor-pointer focus:outline-none select-none text-xs font-semibold"
              >
                <svg className="w-3.5 h-3.5 text-sky-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                <span className="uppercase">{lang === "si" ? "සිං" : lang === "ta" ? "தமி" : "EN"}</span>
                <svg className={`w-2.5 h-2.5 text-sky-100 transition-transform duration-200 ${langMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {langMenuOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.15)] border border-slate-100 py-1.5 z-50 text-slate-800 animate-in fade-in slide-in-from-top-2 duration-150">
                  <button
                    onClick={() => changeLanguage("en")}
                    className={`flex items-center justify-between w-full px-4 py-2 hover:bg-slate-50 hover:text-cyan-600 font-extrabold text-xs transition-colors cursor-pointer border-none bg-transparent ${lang === "en" ? "text-cyan-600" : ""}`}
                  >
                    <span>English</span>
                    {lang === "en" && <span>✓</span>}
                  </button>
                  <button
                    onClick={() => changeLanguage("si")}
                    className={`flex items-center justify-between w-full px-4 py-2 hover:bg-slate-50 hover:text-cyan-600 font-extrabold text-xs transition-colors cursor-pointer border-none bg-transparent ${lang === "si" ? "text-cyan-600" : ""}`}
                  >
                    <span>සිංහල</span>
                    {lang === "si" && <span>✓</span>}
                  </button>
                  <button
                    onClick={() => changeLanguage("ta")}
                    className={`flex items-center justify-between w-full px-4 py-2 hover:bg-slate-50 hover:text-cyan-600 font-extrabold text-xs transition-colors cursor-pointer border-none bg-transparent ${lang === "ta" ? "text-cyan-600" : ""}`}
                  >
                    <span>தமிழ்</span>
                    {lang === "ta" && <span>✓</span>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Header Row */}
        <div className="py-2.5 px-6 md:px-16 flex items-center justify-between w-full">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/">
              <Image
                src="/logo.png"
                alt="Sanasa General Insurance"
                width={100}
                height={40}
                className="object-contain h-auto"
                priority
              />
            </Link>
          </div>

          {/* Desktop Links */}
          <div className={`hidden md:flex items-center ${lang === "en" ? "gap-8 text-base" : "gap-6 text-sm md:text-[15px]"}`}>
            {[
              { href: "/", label: t.home },
              { href: "/home/contactUs", label: t.contactUs },
              { href: "/home/News", label: t.news },
              { href: "/home/AboutUs", label: t.aboutUs }
            ].map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative py-2 font-bold whitespace-nowrap transition-colors duration-200 no-underline ${
                    active ? "text-[#0d2a3a]" : "text-slate-600 hover:text-[#0284c7]"
                  }`}
                >
                  <span>{link.label}</span>
                  {/* Underline for active selected page only */}
                  {active && (
                    <span className="absolute bottom-0 left-0 w-full h-[3px] rounded-full bg-[#0d2a3a] transition-all duration-200" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Action Buttons (Login, Sign Up & Mobile Hamburger) */}
          <div className="flex items-center gap-3">
            <Link
              href="/Login"
              className="hidden md:inline-flex items-center justify-center font-bold text-sm md:text-[15px] px-5 py-1.5 rounded-full border border-slate-300 text-slate-800 hover:border-[#0284c7] hover:text-[#0284c7] hover:bg-slate-50 transition-all duration-200 no-underline shadow-sm"
            >
              {t.login}
            </Link>
            <Link
              href="/SignUp"
              className="hidden md:inline-flex items-center justify-center font-bold text-sm md:text-[15px] px-5 py-1.5 rounded-full bg-[#0f3448] hover:bg-[#17465f] text-white shadow-sm hover:shadow transition-all duration-200 no-underline hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
            >
              {t.signUp}
            </Link>

            {/* Hamburger Menu Icon for Mobile View */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden flex items-center justify-center p-2 rounded-xl text-slate-700 hover:bg-slate-100 hover:text-black focus:outline-none transition-all duration-200 cursor-pointer"
              aria-label="Toggle Navigation Menu"
              aria-expanded={isOpen}
            >
              {isOpen ? (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation Menu */}
        {isOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-white/95 backdrop-blur-md border-b border-gray-200 py-4 px-6 flex flex-col gap-2.5 shadow-[0_10px_20px_rgba(0,0,0,0.08)] z-50 transition-all duration-300">
            {[
              { href: "/", label: t.home },
              { href: "/home/contactUs", label: t.contactUs },
              { href: "/home/News", label: t.news },
              { href: "/home/AboutUs", label: t.aboutUs }
            ].map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`font-bold text-base py-2.5 px-4 rounded-xl transition-all duration-200 ${
                    active
                      ? "bg-slate-100/90 text-[#0d2a3a] border-l-4 border-[#0d2a3a]"
                      : "text-slate-600 hover:text-[#0284c7] hover:bg-slate-50"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}

            {/* Mobile Auth Buttons */}
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2.5">
              <Link
                href="/Login"
                onClick={() => setIsOpen(false)}
                className="w-full text-center font-bold text-base py-2.5 px-4 rounded-2xl border border-slate-300 text-slate-800 hover:border-[#0284c7] hover:text-[#0284c7] hover:bg-slate-50 transition-all duration-200 no-underline"
              >
                {t.login}
              </Link>
              <Link
                href="/SignUp"
                onClick={() => setIsOpen(false)}
                className="w-full text-center font-bold text-base py-2.5 px-4 rounded-2xl bg-[#0d2a3a] hover:bg-[#133c52] text-white shadow-sm transition-all duration-200 no-underline"
              >
                {t.signUp}
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Redesigned Premium Glassmorphic Branches Modal Overlay matching other pages */}
      {branchesModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[82vh] overflow-hidden select-none animate-in fade-in zoom-in-95 duration-200 relative text-slate-800">
            {/* Ambient background glow inside modal */}
            <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-[#00ddff]/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-[#004f6e]/10 blur-3xl pointer-events-none" />

            {/* Modal Header */}
            <div className="px-6 md:px-10 py-5 md:py-6 border-b border-slate-100 flex justify-between items-center relative z-10 bg-white/80 backdrop-blur-md">
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-[#0d2a3a] flex items-center gap-2">
                  <span>🏢</span> {t.branchTitle}
                </h3>
                <p className="text-[10px] md:text-xs text-slate-500 font-semibold mt-1">Find your nearest branch and contact details</p>
              </div>
              <button
                type="button"
                onClick={() => setBranchesModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xl md:text-2xl font-bold cursor-pointer border-none bg-transparent transition-colors p-2"
              >
                &times;
              </button>
            </div>

            {/* Search Input Box */}
            <div className="px-6 md:px-10 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center relative z-10">
              <span className="absolute left-10 md:left-14 text-slate-400 flex items-center pointer-events-none">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full pl-10 md:pl-12 pr-4 py-2.5 md:py-3 rounded-2xl border border-slate-200 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#00ddff] focus:border-transparent transition-all shadow-inner bg-white text-slate-800 font-semibold placeholder:text-slate-400"
              />
            </div>

            {/* Modal Body (Scroll list) */}
            <div className="p-5 md:p-10 overflow-y-auto flex flex-col gap-4 bg-slate-50/40 flex-1 relative z-10">
              {filteredBranches.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {filteredBranches.map((b, idx) => (
                    <div key={idx} className="bg-white/90 backdrop-blur-sm border border-slate-200/80 rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-md hover:-translate-y-0.5 hover:border-[#00ddff]/60 transition-all duration-200 flex flex-col justify-between gap-4 group">
                      <div className="flex flex-col gap-2">
                        <h4 className="text-[#0d2a3a] font-extrabold text-base md:text-[17px] tracking-tight group-hover:text-cyan-600 transition-colors">
                          {b.name[lang]}
                        </h4>
                        <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                          📍 {b.address}
                        </p>
                      </div>
                      <a
                        href={`tel:${b.phone.replace(/\s+/g, "")}`}
                        className="inline-flex items-center justify-center gap-2 bg-[#e0f2fe] hover:bg-[#bae6fd] text-[#0369a1] font-black text-xs no-underline mt-2 px-4 py-2.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 shadow-sm"
                      >
                        <span>📞</span> {t.callNow}: {b.phone}
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-slate-400 font-bold select-none text-sm">
                  No branches found matching your search.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 md:px-10 py-4 md:py-5 border-t border-slate-100 flex justify-end bg-white relative z-10">
              <button
                onClick={() => setBranchesModalOpen(false)}
                className="bg-[#1a365d] hover:bg-[#0f223f] text-white font-extrabold text-xs md:text-sm px-6 md:px-8 py-2.5 md:py-3 rounded-full shadow-md hover:shadow-lg transition-all border-none cursor-pointer hover:-translate-y-0.5 active:translate-y-0 active:scale-95 duration-150 outline-none"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
