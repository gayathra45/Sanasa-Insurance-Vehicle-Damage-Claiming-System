"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import PolicyHolderNavbar from "@/app/Components/Policy_Holder/Navbar";
import PolicyHolderFooter from "@/app/Components/Policy_Holder/footer";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Call02Icon,
  Mail01Icon,
  BubbleChatIcon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";

const translations = {
  en: {
    title: "Contact Us",
    subtitle: "Contact with Anytime with Us",
    hotline: "Hotline",
    hotlineVal: "+94 112 003 000 | +94 112 003 000",
    hotlineSub: "24 Hours Hotline",
    email: "Email",
    emailVal: "claims@sanasainsurance.lk",
    emailSub: "Response within 24 hours",
    liveChat: "Live Chat",
    liveChatVal: "Available Now",
    liveChatSub: "Mon-Sat 9am-6pm",
    location: "Location",
    headOffice: "Head Office",
    address: "No: 172, Elvitigala Mv, Colombo 8,\nSri Lanka",
    openHours: "Open Hours",
    hoursVal: "Monday - Friday\n8:30AM–5:15PM",
    modalTitle: "Send Email to Claims",
    modalSubtitle: "Our support team replies within 24 hours",
    senderName: "Sender Name",
    emailLabel: "Email Address",
    nicLabel: "NIC Number",
    recipient: "Recipient",
    subject: "Subject",
    subjectPlaceholder: "Enter inquiry subject...",
    messageBody: "Message Body",
    messagePlaceholder: "Type your message details here...",
    cancel: "Cancel",
    sendEmail: "Send Email",
    sending: "Sending...",
    subjectReq: "Subject and Message are required.",
    sendSuccess: "Email sent successfully! The claims team will respond within 24 hours.",
    sendFail: "Failed to send email.",
    connError: "Unable to connect to the server."
  },
  si: {
    title: "සම්බන්ධ වන්න",
    subtitle: "ඕනෑම වේලාවක අප හා සම්බන්ධ වන්න",
    hotline: "ක්ෂණික ඇමතුම්",
    hotlineVal: "+94 112 003 000 | +94 112 003 000",
    hotlineSub: "පැය 24 පුරා ක්‍රියාත්මකයි",
    email: "විද්‍යුත් තැපෑල",
    emailVal: "claims@sanasainsurance.lk",
    emailSub: "පැය 24ක් ඇතුළත ප්‍රතිචාර",
    liveChat: "සජීවී සංවාදය",
    liveChatVal: "දැන් සම්බන්ධ විය හැක",
    liveChatSub: "සඳුදා - සෙනසුරාදා පෙ.ව. 9 - ප.ව. 6",
    location: "පිහිටීම",
    headOffice: "ප්‍රධාන කාර්යාලය",
    address: "නො: 172, ඇල්විටිගල මාවත, කොළඹ 8,\nශ්‍රී ලංකාව",
    openHours: "වැඩ කරන වේලාවන්",
    hoursVal: "සඳුදා - සිකුරාදා\nපෙ.ව. 8:30 – ප.ව. 5:15",
    modalTitle: "හිමිකම් අංශයට විද්‍යුත් තැපෑලක් යවන්න",
    modalSubtitle: "අපගේ සහාය කණ්ඩායම පැය 24ක් ඇතුළත පිළිතුරු සපයනු ඇත",
    senderName: "යවන්නාගේ නම",
    emailLabel: "විද්‍යුත් තැපැල් ලිපිනය",
    nicLabel: "ජාතික හැඳුනුම්පත් අංකය",
    recipient: "ලබන්නා",
    subject: "මාතෘකාව",
    subjectPlaceholder: "විමසීම් මාතෘකාව ඇතුළත් කරන්න...",
    messageBody: "පණිවිඩය",
    messagePlaceholder: "ඔබගේ පණිවිඩයේ විස්තර මෙහි ටයිප් කරන්න...",
    cancel: "අවලංගු කරන්න",
    sendEmail: "විද්‍යුත් තැපෑල යවන්න",
    sending: "යවමින් පවතී...",
    subjectReq: "මාතෘකාව සහ පණිවිඩය ඇතුළත් කිරීම අනිවාර්ය වේ.",
    sendSuccess: "විද්‍යුත් තැපෑල සාර්ථකව යවන ලදී! හිමිකම් කණ්ඩායම පැය 24ක් ඇතුළත ප්‍රතිචාර දක්වනු ඇත.",
    sendFail: "විද්‍යුත් තැපෑල යැවීම අසාර්ථක විය.",
    connError: "සේවාදායකයට සම්බන්ධ විය නොහැක."
  },
  ta: {
    title: "தொடர்பு கொள்ள",
    subtitle: "எந்த நேரத்திலும் எங்களைத் தொடர்பு கொள்ளலாம்",
    hotline: "உதவி எண்",
    hotlineVal: "+94 112 003 000 | +94 112 003 000",
    hotlineSub: "24 மணி நேர உதவி எண்",
    email: "மின்னஞ்சல்",
    emailVal: "claims@sanasainsurance.lk",
    emailSub: "24 மணி நேரத்திற்குள் பதில் வழங்கப்படும்",
    liveChat: "நேரடி அரட்டை",
    liveChatVal: "இப்போது கிடைக்கிறது",
    liveChatSub: "திங்கள் - சனி மு.ப. 9 - பி.ப. 6",
    location: "இருப்பிடம்",
    headOffice: "தலைமை அலுவலகம்",
    address: "எண்: 172, எல்விட்டிஹல மாவத்தை, கொழும்பு 8,\nஇலங்கை",
    openHours: "திறந்திருக்கும் நேரம்",
    hoursVal: "திங்கள் - வெள்ளி\nமு.ப. 8:30 – பி.ப. 5:15",
    modalTitle: "கோரிக்கைகள் பிரிவுக்கு மின்னஞ்சல் அனுப்பவும்",
    modalSubtitle: "எங்கள் ஆதரவுக் குழு 24 மணி நேரத்திற்குள் பதிலளிக்கும்",
    senderName: "அனுப்புநர் பெயர்",
    emailLabel: "மின்னஞ்சல் முகவரி",
    nicLabel: "அடையாள அட்டை எண்",
    recipient: "பெறுநர்",
    subject: "பொருள்",
    subjectPlaceholder: "விசாரணைப் பொருளை உள்ளிடவும்...",
    messageBody: "செய்தி உள்ளடக்கம்",
    messagePlaceholder: "உங்கள் செய்தியின் விவரங்களை இங்கே தட்டச்சு செய்யவும்...",
    cancel: "ரத்து செய்",
    sendEmail: "மின்னஞ்சல் அனுப்பு",
    sending: "அனுப்பப்படுகிறது...",
    subjectReq: "பொருள் மற்றும் செய்தி தேவை.",
    sendSuccess: "மின்னஞ்சல் வெற்றிகரமாக அனுப்பப்பட்டது! கோரிக்கைகள் குழு 24 மணி நேரத்திற்குள் பதிலளிக்கும்.",
    sendFail: "மின்னஞ்சல் அனுப்ப முடியவில்லை.",
    connError: "சேவையகத்துடன் இணைக்க முடியவில்லை."
  }
};

export default function PolicyHolderContact() {
  const [lang, setLang] = useState<"en" | "si" | "ta">("en");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

  // User details state (loaded from sessionStorage)
  const [user, setUser] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    nic?: string;
    mobile?: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const userStr = sessionStorage.getItem("logged_in_user");
      if (userStr) {
        try {
          setUser(JSON.parse(userStr));
        } catch (e) {
          console.error("Failed to parse logged_in_user from sessionStorage", e);
        }
      }
    }
  }, []);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setModalFeedback({ type: "error", text: "Subject and Message are required." });
      return;
    }

    setIsSending(true);
    setModalFeedback(null);

    const payload = {
      name: user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "Web Portal Policy Holder",
      email: user?.email || "",
      nic: user?.nic || "",
      phone: user?.mobile || "",
      subject: subject.trim(),
      message: message.trim(),
    };

    try {
      const res = await fetch("http://localhost:5000/api/policy-holder/contact/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setModalFeedback({ type: "success", text: "Email sent successfully! The claims team will respond within 24 hours." });
        setSubject("");
        setMessage("");
        // Close modal after a short delay
        setTimeout(() => {
          setShowEmailModal(false);
          setModalFeedback(null);
        }, 2500);
      } else {
        setModalFeedback({ type: "error", text: data.error || "Failed to send email." });
      }
    } catch (err) {
      console.error("Send email error:", err);
      setModalFeedback({ type: "error", text: "Unable to connect to the server." });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative">
      <PolicyHolderNavbar />

      {/* Styled curved header matching mockup exactly */}
      <div className="max-w-7xl w-full mx-auto px-6 md:px-16 mt-8 relative">
        <div className="absolute top-0 bottom-0 left-[calc(50%-50vw)] right-6 md:right-12 bg-[url('/contact_border.jpeg')] bg-cover bg-center rounded-r-[75px] md:rounded-r-[95px] overflow-hidden shadow-md">
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-[#004f6e]/65 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0d2a3a]/90 via-[#0d2a3a]/75 to-transparent" />
        </div>

        {/* Text content aligned automatically with the page container */}
        <header className="relative z-10 h-[190px] flex flex-col justify-center pl-4 md:pl-8 select-none">
          <h1 className="text-white text-3xl md:text-[40px] font-bold tracking-tight leading-none">
            {t.title}
          </h1>
          <p className="text-slate-200 text-xs md:text-sm font-normal mt-3.5 tracking-wide opacity-95">
            {t.subtitle}
          </p>
        </header>
      </div>

      {/* Main Channels List Section */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 md:px-8 py-12 flex flex-col gap-6 relative z-20">
        
        {/* Card 1: Hotline */}
        <a 
          href="tel:+94112003000" 
          className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-md transition-all duration-200 cursor-pointer no-underline text-inherit hover:bg-slate-50/50 group"
        >
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-[#00ddff] group-hover:border-[#00ddff] transition-colors shrink-0">
              <HugeiconsIcon icon={Call02Icon} className="w-7 h-7" strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-lg md:text-xl group-hover:text-slate-900 transition-colors">{t.hotline}</h3>
              <p className="text-slate-600 text-sm md:text-base font-normal mt-1.5 tracking-wide">
                {t.hotlineVal}
              </p>
            </div>
          </div>
          <div className="text-red-500 hover:text-red-600 transition-colors font-medium text-xs md:text-sm self-start md:self-center md:pl-0 pl-20 select-none">
            {t.hotlineSub}
          </div>
        </a>

        {/* Card 2: Email */}
        <button 
          type="button"
          onClick={() => setShowEmailModal(true)} 
          className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-md transition-all duration-200 cursor-pointer no-underline text-inherit hover:bg-slate-50/50 group text-left w-full border-solid font-sans"
        >
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-[#00ddff] group-hover:border-[#00ddff] transition-colors shrink-0">
              <HugeiconsIcon icon={Mail01Icon} className="w-7 h-7" strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-lg md:text-xl group-hover:text-slate-900 transition-colors">{t.email}</h3>
              <p className="text-slate-600 text-sm md:text-base font-normal mt-1.5 tracking-wide">
                {t.emailVal}
              </p>
            </div>
          </div>
          <div className="text-red-500 hover:text-red-600 transition-colors font-medium text-xs md:text-sm self-start md:self-center md:pl-0 pl-20 select-none">
            {t.emailSub}
          </div>
        </button>

        {/* Card 3: Live Chat */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
              <HugeiconsIcon icon={BubbleChatIcon} className="w-7 h-7" strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-lg md:text-xl">{t.liveChat}</h3>
              <p className="text-slate-600 text-sm md:text-base font-normal mt-1.5 tracking-wide">
                {t.liveChatVal}
              </p>
            </div>
          </div>
          <div className="text-red-500 hover:text-red-600 transition-colors font-medium text-xs md:text-sm self-start md:self-center md:pl-0 pl-20 select-none">
            {t.liveChatSub}
          </div>
        </div>

      </main>

      {/* Location Section */}
      <section className="relative w-full mt-8 pt-12 md:pt-16">
        {/* Background image for the location section */}
        <div className="absolute inset-0 top-0 h-[430px] md:h-[490px] w-full overflow-hidden">
          <Image 
            src="/contact_location.png" 
            alt="Location Background" 
            fill 
            className="object-cover object-center" 
          />
          {/* Dark gradient overlay on the left to make "Location" text pop */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#1b3b55]/95 via-[#1b3b55]/40 to-transparent" />
          {/* Slate gradient overlay from bottom to fade out the background */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-50/50 to-transparent" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-6 md:px-16 z-10 flex flex-col">
          
          {/* Location Title */}
          <h2 className="text-3xl md:text-4xl font-bold text-white drop-shadow-md pl-4 md:pl-8 mb-8 select-none">
            {t.location}
          </h2>

          <div className="flex flex-col md:flex-row gap-8 lg:gap-16 items-start">
            
            {/* Map iframe overlapping bottom */}
            <div className="w-full md:w-[60%] lg:w-[55%] -mb-16 md:-mb-24 z-20 pl-4 md:pl-8">
              <div className="relative w-full h-[250px] md:h-[350px] rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden shadow-2xl border-[6px] border-white bg-white">
                <iframe 
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3961.2661808899647!2d79.87076!3d6.918!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae259ab28a0b0f1%3A0x5f5b0b0b0b0b0b0b!2sSanasa%20General%20Insurance!5e0!3m2!1sen!2slk!4v1234567890"
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  allowFullScreen={true} 
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade"
                  className="absolute inset-0 w-full h-full"
                ></iframe>
              </div>
            </div>

            {/* Head Office text next to map */}
            <div className="w-full md:w-[40%] lg:w-[45%] mt-4 md:mt-20 text-slate-800">
              <h3 className="font-semibold text-slate-900 text-lg md:text-xl mb-3 select-none">{t.headOffice}</h3>
              <p className="text-slate-600 text-sm md:text-base font-normal leading-relaxed whitespace-pre-line">
                {t.address}
              </p>
              
              <hr className="border-t border-slate-300 w-full max-w-[320px] my-6" />

              <h3 className="font-semibold text-slate-900 text-lg md:text-xl mb-3 select-none">{t.openHours}</h3>
              <p className="text-slate-600 text-sm md:text-base font-normal leading-relaxed whitespace-pre-line">
                {t.hoursVal}
              </p>
            </div>

          </div>
        </div>
        
        {/* Spacer to prevent overlapping with footer due to negative margin */}
        <div className="h-24 md:h-36"></div>
      </section>

      {/* Floating Chat Bubble Button */}
      <button
        className="fixed bottom-8 right-8 z-40 bg-[#00ddff] hover:bg-[#00c8e6] text-white p-5 rounded-full shadow-2xl transition-all duration-150 hover:scale-110 active:scale-95 cursor-pointer focus:outline-none border-none flex items-center justify-center"
        aria-label="Chat support"
      >
        <HugeiconsIcon icon={BubbleChatIcon} className="w-7 h-7 text-white" strokeWidth={2} />
      </button>

      <PolicyHolderFooter />

      {/* Email Composer Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 transition-all duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col border border-slate-100 relative">
            
            {/* Ambient background glow inside modal */}
            <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-[#00ddff]/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-[#004f6e]/10 blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="px-12 py-7 border-b border-slate-100 flex justify-between items-center relative z-10 bg-white/80 backdrop-blur-md">
              <div>
                <h3 className="text-2xl font-bold text-[#0d2a3a]">{t.modalTitle}</h3>
                <p className="text-xs text-slate-500 font-normal mt-1">{t.modalSubtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEmailModal(false);
                  setModalFeedback(null);
                }}
                className="text-slate-400 hover:text-slate-700 text-xl font-medium cursor-pointer border-none bg-transparent transition-colors p-2"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSendEmail} className="p-12 flex flex-col gap-6 relative z-10">
              
              {/* User info display block if logged in */}
              {user && (
                <div className="bg-[#f0f9ff]/80 border border-sky-100 rounded-[24px] p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-slate-700 font-normal">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{t.senderName}</span>
                    <span className="text-[#0d2a3a] text-base font-semibold">{user.firstName} {user.lastName}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{t.emailLabel}</span>
                    <span className="text-slate-800 text-sm truncate">{user.email}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{t.nicLabel}</span>
                    <span className="text-slate-800 text-sm">{user.nic}</span>
                  </div>
                </div>
              )}

              {/* Multi-column grid for Recipient and Subject */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* To (Read-only) */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-[#0d2a3a] uppercase tracking-wider pl-1">{t.recipient}</label>
                  <input
                    type="text"
                    value="claims@sanasainsurance.lk"
                    disabled
                    className="bg-slate-100/70 text-slate-500 text-sm font-normal px-5 py-4 rounded-2xl border border-slate-200 outline-none w-full cursor-not-allowed"
                  />
                </div>

                {/* Subject */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-[#0d2a3a] uppercase tracking-wider pl-1">{t.subject}</label>
                  <input
                    type="text"
                    placeholder={t.subjectPlaceholder}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    className="bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-slate-800 text-sm font-normal px-5 py-4 rounded-2xl border border-slate-200 focus:border-[#0284c7] outline-none w-full transition-all focus:ring-4 focus:ring-sky-100"
                  />
                </div>
              </div>

              {/* Message */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-[#0d2a3a] uppercase tracking-wider pl-1">{t.messageBody}</label>
                <textarea
                  placeholder={t.messagePlaceholder}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={6}
                  className="bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-slate-800 text-sm font-normal px-5 py-4 rounded-2xl border border-slate-200 focus:border-[#0284c7] outline-none w-full transition-all resize-none leading-relaxed focus:ring-4 focus:ring-sky-100"
                />
              </div>

              {/* Modal Feedback banner */}
              {modalFeedback && (
                <div
                  className={`rounded-2xl p-4 text-xs font-normal border ${
                    modalFeedback.type === "success"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : "bg-red-50 text-red-700 border-red-100"
                  }`}
                >
                  {modalFeedback.text}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEmailModal(false);
                    setModalFeedback(null);
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm px-7 py-4 rounded-full transition-all duration-150 active:scale-[0.98] cursor-pointer border-none"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="bg-[#0d2a3a] hover:bg-[#0284c7] disabled:bg-slate-400 text-white font-semibold text-sm px-9 py-4 rounded-full shadow-[0_4px_12px_rgba(13,42,58,0.25)] hover:shadow-[0_4px_16px_rgba(2,132,199,0.3)] transition-all duration-150 active:scale-[0.98] cursor-pointer border-none flex items-center justify-center gap-2 min-w-[130px]"
                >
                  {isSending ? (
                    <>
                      <HugeiconsIcon icon={Loading03Icon} className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" strokeWidth={2} />
                      {t.sending}
                    </>
                  ) : (
                    t.sendEmail
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      <PolicyHolderFooter />
    </div>
  );
}
