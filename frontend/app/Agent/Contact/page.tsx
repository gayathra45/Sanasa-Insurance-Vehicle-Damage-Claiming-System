"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/Components/Agent/Navbar";
import Footer from "@/app/Components/Agent/Footer";
import { API_URL } from "@/app/config";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Call02Icon,
  Mail01Icon,
  Cancel01Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";

interface AgentDetails {
  name?: string;
  email?: string;
  nic?: string;
  phone?: string;
  agentId?: string;
}

const translations = {
  en: {
    title: "Agent Help & Support",
    subtitle: "Access immediate support channels, FAQs, and local branch coordinators",
    commChannels: "Communication Channels",
    hotlineTitle: "Emergency Priority Hotline",
    hotlineBadge: "24/7 Priority Support",
    emailTitle: "Agent Support Portal Email",
    emailBadge: "Submit Inquiry Ticket",
    faqTitle: "Frequently Asked Questions",
    sendEmailInquiry: "Send Email Inquiry",
    sendSupportReq: "Send Support Request",
    explainIssue: "Explain your issue or question...",
    subject: "Subject",
    messageDetails: "Message Details",
    sendMessage: "Send Message",
    sending: "Sending...",
    cancel: "Cancel"
  },
  si: {
    title: "නියෝජිත සහාය සේවාව",
    subtitle: "ක්ෂණික සහාය නාලිකා, නිතර අසන ප්‍රශ්න සහ දේශීය සම්බන්ධීකාරකවරුන් වෙත ප්‍රවේශ වන්න",
    commChannels: "සන්නිවේදන මාර්ග",
    hotlineTitle: "හදිසි ප්‍රමුඛතා දුරකථන අංකය",
    hotlineBadge: "24/7 ප්‍රමුඛතා සහාය",
    emailTitle: "නියෝජිත සහාය විද්‍යුත් තැපෑල",
    emailBadge: "විමසීම් ප්‍රවේශ පත්‍රය ඉදිරිපත් කරන්න",
    faqTitle: "නිතර අසන ප්‍රශ්න",
    sendEmailInquiry: "විද්‍යුත් තැපෑලෙන් විමසන්න",
    sendSupportReq: "සහාය ඉල්ලීමක් යවන්න",
    explainIssue: "ඔබගේ ගැටලුව හෝ ප්‍රශ්නය විස්තර කරන්න...",
    subject: "මාතෘකාව",
    messageDetails: "පණිවිඩයේ විස්තර",
    sendMessage: "පණිවිඩය යවන්න",
    sending: "යවමින් පවතී...",
    cancel: "අවලංගු කරන්න"
  },
  ta: {
    title: "முகவர் உதவி & ஆதரவு",
    subtitle: "உடனடி ஆதரவு வழிகள், அடிக்கடி கேட்கப்படும் கேள்விகள் மற்றும் கிளை ஒருங்கிணைப்பாளர்களை அணுகவும்",
    commChannels: "தொடர்பு வழிமுறைகள்",
    hotlineTitle: "அவசர முன்னுரிமை உதவி எண்",
    hotlineBadge: "24/7 முன்னுரிமை ஆதரவு",
    emailTitle: "முகவர் ஆதரவு மின்னஞ்சல்",
    emailBadge: "விசாரணை சீட்டைச் சமர்ப்பிக்கவும்",
    faqTitle: "அடிக்கடி கேட்கப்படும் கேள்விகள்",
    sendEmailInquiry: "மின்னஞ்சல் விசாரணை அனுப்பவும்",
    sendSupportReq: "ஆதரவு கோரிக்கையை அனுப்பவும்",
    explainIssue: "உங்கள் பிரச்சினை அல்லது கேள்வி விளக்குங்கள்...",
    subject: "பொருள்",
    messageDetails: "செய்தி விவரங்கள்",
    sendMessage: "செய்தியை அனுப்பு",
    sending: "அனுப்பப்படுகிறது...",
    cancel: "ரத்து செய்"
  }
};

export default function AgentContactPage() {
  const [lang, setLang] = useState<"en" | "si" | "ta">("en");
  const router = useRouter();
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

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Agent details state (loaded from sessionStorage)
  const [agent, setAgent] = useState<AgentDetails | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const agentData = sessionStorage.getItem("logged_in_agent");
      if (!agentData) {
        router.push("/Login");
        return;
      }
      try {
        setAgent(JSON.parse(agentData));
      } catch (e) {
        console.error("Failed to parse logged_in_agent from sessionStorage", e);
        router.push("/Login");
      }
    }
  }, [router]);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setModalFeedback({ type: "error", text: "Subject and Message are required." });
      return;
    }

    setIsSending(true);
    setModalFeedback(null);

    const payload = {
      name: agent?.name || "Agent Support Inquiry",
      email: agent?.email || "",
      nic: agent?.nic || agent?.agentId || "",
      phone: agent?.phone || "",
      subject: `[Agent Support] ${subject.trim()}`,
      message: message.trim(),
    };

    try {
      const res = await fetch(`${API_URL}/policy-holder/contact/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setModalFeedback({
          type: "success",
          text: "Message sent successfully! Agent support office will respond within 12 hours.",
        });
        setSubject("");
        setMessage("");
        // Close modal after short delay
        setTimeout(() => {
          setShowEmailModal(false);
          setModalFeedback(null);
        }, 2500);
      } else {
        setModalFeedback({ type: "error", text: data.error || "Failed to send message." });
      }
    } catch (err) {
      console.error("Send email error:", err);
      setModalFeedback({ type: "error", text: "Unable to connect to support server." });
    } finally {
      setIsSending(false);
    }
  };

  const faqs = [
    {
      q: lang === "si" ? "ලේඛන සත්‍යාපනය සඳහා කොපමණ කාලයක් ගතවේද?" : lang === "ta" ? "ஆவண சரிபார்ப்புக்கு எவ்வளவு நேரம் ஆகும்?" : "How long does document verification take?",
      a: lang === "si" ? "ඔබ ඉල්ලා ඇති ලේඛනයක් උඩුගත කළ පසු, ශාඛා කාර්ය මණ්ඩලය සාමාන්‍යයෙන් පැය 2 ත් 4 ත් අතර කාලයකදී එය සත්‍යාපනය කරනු ඇත." : lang === "ta" ? "நீங்கள் ஒரு ஆவணத்தை பதிவேற்றியதும், கிளை ஊழியர்கள் பொதுவாக 2 முதல் 4 மணி நேரத்திற்குள் அதைச் சரிபார்ப்பார்கள்." : "Once you upload a requested document (e.g. damage assessment or inspection photos), the branch office staff will typically verify it within 2 to 4 hours. You will see status updates in real-time."
    },
    {
      q: lang === "si" ? "ලේඛන උඩුගත කිරීම අසාර්ථක වුවහොත් මා කුමක් කළ යුතුද?" : lang === "ta" ? "கோப்பு பதிவேற்றம் தோல்வியுற்றால் நான் என்ன செய்ய வேண்டும்?" : "What should I do if a file upload fails?",
      a: lang === "si" ? "ගොනුවේ ප්‍රමාණය 5MB ට අඩු බව සහ ආකෘතිය JPEG, PNG, හෝ PDF බව තහවුරු කරගන්න. ගැටලුව දිගටම පැවතුනහොත්, සහාය ඉල්ලීමක් යවන්න." : lang === "ta" ? "கோப்பு 5MBக்கு குறைவாகவும் JPEG, PNG அல்லது PDF வடிவத்திலும் இருப்பதை உறுதிசெய்யவும். சிக்கல் தொடர்ந்தால், ஆதரவு கோரிக்கையை அனுப்பவும்." : "Ensure the file format is JPEG, PNG, or PDF, and the size is strictly below 5MB. If you continue to experience upload failures, please submit a ticket using our support email form or call the emergency priority hotline."
    },
    {
      q: lang === "si" ? "මගේ පැතිකඩ හෝ බැංකු ගිණුම් විස්තර යාවත්කාලීන කරන්නේ කෙසේද?" : lang === "ta" ? "எனது சுயவிவரம் அல்லது வங்கி விவரங்களை எவ்வாறு புதுப்பிப்பது?" : "How do I update my profile or bank account details?",
      a: lang === "si" ? "ආරක්ෂක හේතූන් මත නියෝජිතයින්ට බැංකු තොරතුරු කෙලින්ම වෙනස් කළ නොහැක. කරුණාකර ඔබගේ ශාඛා පරිපාලක අමතන්න." : lang === "ta" ? "பாதுகாப்பு காரணங்களுக்காக முகவர்கள் வங்கி விவரங்களை நேரடியாக மாற்ற முடியாது. உங்கள் கிளை நிர்வாகியைத் தொடர்பு கொள்ளவும்." : "For security and auditing regulations, agents cannot edit core profile or bank routing information directly. Please contact your branch administrator or submit an email ticket detailing the required updates."
    },
    {
      q: lang === "si" ? "ඉදිරිපත් කළ පසු හිමිකම් පරීක්ෂණ වාර්තාවක් වෙනස් කළ හැකිද?" : lang === "ta" ? "ஆய்வு அறிக்கையை சமர்ப்பித்த பிறகு மாற்ற முடியுமா?" : "Can I modify a claim inspection report after submission?",
      a: lang === "si" ? "වාර්තාවක් ඉදිරිපත් කළ පසු එය අගුළු වැටේ. කිසියම් වෙනසක් කිරීමට අවශ්‍ය නම්, වහාම ශාඛා හිමිකම් අධීක්ෂකවරයා අමතන්න." : lang === "ta" ? "அறிக்கை சமர்ப்பிக்கப்பட்ட பிறகு அது பூட்டப்படும். ஏதேனும் மாற்றம் செய்ய வேண்டுமானால், உடனடியாக கிளை மேற்பார்வையாளரைத் தொடர்பு கொள்ளவும்." : "Once an inspection report or assessment has been submitted, it is locked in the claim history file. If you have discovered an error or need to append additional photos, contact the branch claims supervisor immediately."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative">
      <Navbar />

      {/* Curved Header matching Document repository layout exactly */}
      <div className="max-w-7xl w-full mx-auto px-6 md:px-16 mt-8 relative">
        <div className="absolute top-0 bottom-0 left-[calc(50%-50vw)] right-6 md:right-12 bg-[url('/newclaim1.webp')] bg-cover bg-center rounded-r-[75px] md:rounded-r-[95px] overflow-hidden shadow-md">
          {/* Dark slate overlay */}
          <div className="absolute inset-0 bg-slate-900/35" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-transparent" />
        </div>

        {/* Header Text Content */}
        <header className="relative z-10 h-[210px] flex flex-col justify-center pl-4 md:pl-8 select-none">
          <h1 className="text-white text-3xl md:text-[40px] font-bold tracking-tight leading-none">
            {t.title}
          </h1>
          <p className="text-slate-200 text-xs md:text-sm font-semibold mt-3.5 tracking-wide opacity-95">
            {t.subtitle}
          </p>
        </header>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 md:px-16 py-12 relative z-20 flex flex-col lg:flex-row gap-10">
        
        {/* Left Column: Contact Channels & FAQs */}
        <div className="flex-1 flex flex-col gap-8">
          
          {/* Contact Cards */}
          <div className="flex flex-col gap-5">
            <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight select-none">
              {t.commChannels}
            </h2>

            {/* Hotline support */}
            <a
              href="tel:+94112003000"
              className="bg-white border border-slate-200/80 rounded-[24px] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.015)] hover:shadow-md hover:border-emerald-200 hover:bg-emerald-50/5 transition-all duration-200 cursor-pointer no-underline text-inherit group"
            >
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-emerald-500 group-hover:border-emerald-300 transition-colors shrink-0 bg-slate-50">
                  <HugeiconsIcon icon={Call02Icon} className="w-5 h-5 text-slate-500 group-hover:text-emerald-500 transition-colors" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base md:text-lg group-hover:text-emerald-800 transition-colors">{t.hotlineTitle}</h3>
                  <p className="text-slate-500 text-xs md:text-sm font-semibold mt-1 tracking-wide">
                    +94 112 003 000 | +94 112 003 500
                  </p>
                </div>
              </div>
              <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-4 py-1 rounded-full font-black text-[10px] uppercase self-start md:self-center select-none">
                {t.hotlineBadge}
              </div>
            </a>

            {/* Email Inquiry trigger */}
            <button
              type="button"
              onClick={() => setShowEmailModal(true)}
              className="bg-white border border-slate-200/80 rounded-[24px] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.015)] hover:shadow-md hover:border-emerald-200 hover:bg-emerald-50/5 transition-all duration-200 cursor-pointer no-underline text-inherit group w-full text-left font-sans outline-none"
            >
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-emerald-500 group-hover:border-emerald-300 transition-colors shrink-0 bg-slate-50">
                  <HugeiconsIcon icon={Mail01Icon} className="w-5 h-5 text-slate-500 group-hover:text-emerald-500 transition-colors" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base md:text-lg group-hover:text-emerald-800 transition-colors">{t.emailTitle}</h3>
                  <p className="text-slate-500 text-xs md:text-sm font-semibold mt-1 tracking-wide">
                    agentsupport@sanasainsurance.lk
                  </p>
                </div>
              </div>
              <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-4 py-1 rounded-full font-black text-[10px] uppercase self-start md:self-center select-none">
                {t.emailBadge}
              </div>
            </button>
          </div>

          {/* FAQ Section */}
          <div className="flex flex-col gap-4">
            <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight select-none">
              {t.faqTitle}
            </h2>
            <div className="flex flex-col gap-3 select-none">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div
                    key={index}
                    className="bg-white border border-slate-200/80 rounded-[20px] overflow-hidden transition-all duration-200 shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      className="w-full px-6 py-5 flex justify-between items-center text-left bg-transparent border-none outline-none cursor-pointer group"
                    >
                      <span className="font-bold text-slate-700 text-sm md:text-base group-hover:text-emerald-600 transition-colors">
                        {faq.q}
                      </span>
                      <span className={`text-emerald-500 font-extrabold text-sm transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}>
                        &gt;
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-5 pt-1 text-slate-500 text-xs md:text-sm font-semibold leading-relaxed border-t border-slate-100">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column: Office Hours & Branch details */}
        <div className="w-full lg:w-[380px] shrink-0 flex flex-col gap-6 select-none">
          
          {/* Office hours card */}
          <div className="bg-white border border-slate-200 rounded-[28px] p-6 shadow-sm flex flex-col gap-4">
            <h3 className="font-black text-slate-800 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              {lang === "en" ? "Office Working Hours" : lang === "si" ? "කාර්යාලීය රාජකාරි වේලාවන්" : "அலுவலக வேலை நேரம்"}
            </h3>
            <div className="space-y-3.5 text-xs font-semibold text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">{lang === "en" ? "Monday - Friday" : lang === "si" ? "සඳුදා - සිකුරාදා" : "திங்கள் - வெள்ளி"}</span>
                <span>8:30 AM - 5:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{lang === "en" ? "Saturday" : lang === "si" ? "සෙනසුරාදා" : "சனிக்கிழமை"}</span>
                <span>8:30 AM - 1:30 PM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{lang === "en" ? "Sunday & Holidays" : lang === "si" ? "ඉරිදා සහ නිවාඩු දින" : "ஞாயிறு & விடுமுறை"}</span>
                <span className="text-red-500">{lang === "en" ? "Closed" : lang === "si" ? "වසා ඇත" : "விடுமுறை"}</span>
              </div>
              <hr className="border-t border-slate-100 my-2" />
              <div className="text-[11px] text-slate-400 leading-relaxed">
                <span className="font-extrabold text-slate-500">{lang === "en" ? "Notice:" : lang === "si" ? "දැනුම්දීම:" : "அறிவிப்பு:"}</span> {lang === "en" ? "General administrative queries will be reviewed during office hours. Urgent road accidents must be immediately reported to our priority hotline." : lang === "si" ? "පොදු පරිපාලන විමසීම් කාර්යාල වේලාවන් තුළ සමාලෝචනය කෙරේ. හදිසි මාර්ග අනතුරු වහාම අපගේ ප්‍රමුඛතා ඇමතුම් අංකයට වාර්තා කළ යුතුය." : "பொதுவான நிர்வாக வினவல்கள் அலுவலக நேரங்களில் பரிசீலிக்கப்படும். அவசர வீதி விபத்துக்கள் உடனடியாக எமது முன்னுரிமை உதவி எண்ணிற்கு அறிவிக்கப்பட வேண்டும்."}
              </div>
            </div>
          </div>

          {/* Regional Branches details */}
          <div className="bg-white border border-slate-200 rounded-[28px] p-6 shadow-sm flex flex-col gap-4">
            <h3 className="font-black text-slate-800 text-base border-b border-slate-100 pb-3">
              {lang === "en" ? "Regional Branch Offices" : lang === "si" ? "ප්‍රාදේශීය ශාඛා කාර්යාල" : "பிராந்திய கிளை அலுவலகங்கள்"}
            </h3>
            
            <div className="space-y-4">
              <div>
                <span className="block font-black text-slate-800 text-xs uppercase tracking-wide">{lang === "en" ? "Colombo Central Branch" : lang === "si" ? "කොළඹ ප්‍රධාන ශාඛාව" : "கொழும்பு மத்திய கிளை"}</span>
                <span className="block text-slate-500 text-xs font-semibold mt-1">Tel: +94 112 889 000</span>
                <span className="block text-slate-400 text-xs mt-0.5">Email: colombo@sanasainsurance.lk</span>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <span className="block font-black text-slate-800 text-xs uppercase tracking-wide">{lang === "en" ? "Galle District Branch" : lang === "si" ? "ගාල්ල දිස්ත්‍රික් ශාඛාව" : "காலி மாவட்ட கிளை"}</span>
                <span className="block text-slate-500 text-xs font-semibold mt-1">Tel: +94 912 244 500</span>
                <span className="block text-slate-400 text-xs mt-0.5">Email: galle@sanasainsurance.lk</span>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <span className="block font-black text-slate-800 text-xs uppercase tracking-wide">{lang === "en" ? "Matara City Branch" : lang === "si" ? "මාතර නගර ශාඛාව" : "மாத்தறை நகர கிளை"}</span>
                <span className="block text-slate-500 text-xs font-semibold mt-1">Tel: +94 412 233 400</span>
                <span className="block text-slate-400 text-xs mt-0.5">Email: matara@sanasainsurance.lk</span>
              </div>
            </div>
          </div>

          {/* Head office card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-[28px] p-6 shadow-md text-white">
            <h3 className="font-black text-white text-base border-b border-slate-800 pb-3">
              {lang === "en" ? "Headquarters Location" : lang === "si" ? "ප්‍රධාන කාර්යාලයීය පිහිටීම" : "தலைமையக இருப்பிடம்"}
            </h3>
            <p className="text-slate-300 text-xs font-semibold mt-3.5 leading-relaxed">
              Sanasa Insurance PLC, <br />
              No 12, Edmonton Road, <br />
              Colombo 06, <br />
              Sri Lanka.
            </p>
          </div>

        </div>

      </main>

      {/* Support Inquiry Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl border border-slate-300 overflow-hidden transform scale-100 transition-all select-none">
            {/* Header */}
            <div className="px-8 pt-6 pb-4 flex justify-between items-center bg-white border-b border-slate-100">
              <h2 className="font-extrabold text-xl text-slate-800">
                {t.sendSupportReq}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowEmailModal(false);
                  setModalFeedback(null);
                }}
                className="text-slate-400 hover:text-slate-600 bg-transparent border-none outline-none cursor-pointer"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-6 h-6" strokeWidth={2.5} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSendEmail} className="p-8 flex flex-col gap-5">
              {modalFeedback && (
                <div
                  className={`text-xs font-bold px-4 py-3 rounded-xl border ${
                    modalFeedback.type === "success"
                      ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                      : "bg-red-50 text-red-600 border-red-100"
                  }`}
                >
                  {modalFeedback.text}
                </div>
              )}

              {/* Agent metadata view fields (read-only) */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-200/60 p-4 rounded-2xl text-xs font-semibold text-slate-500">
                <div>
                  <span className="block text-slate-400 text-[10px] uppercase font-black tracking-wide">{lang === "en" ? "Agent Name" : lang === "si" ? "නියෝජිතයාගේ නම" : "முகவர் பெயர்"}</span>
                  <span className="text-slate-700 truncate block mt-0.5">{agent?.name || "N/A"}</span>
                </div>
                <div>
                  <span className="block text-slate-400 text-[10px] uppercase font-black tracking-wide">{lang === "en" ? "Agent ID" : lang === "si" ? "නියෝජිත හැඳුනුම්පත" : "முகவர் ஐடி"}</span>
                  <span className="text-slate-700 truncate block mt-0.5">{agent?.agentId || "N/A"}</span>
                </div>
              </div>

              {/* Subject */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wide">{t.subject}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Issue with Claims list loading"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white transition-all"
                />
              </div>

              {/* Message */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wide">{t.messageDetails}</label>
                <textarea
                  required
                  rows={4}
                  placeholder={t.explainIssue}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white transition-all resize-none"
                />
              </div>

              {/* Send Button */}
              <button
                type="submit"
                disabled={isSending}
                className="w-full py-3 bg-[#0f2d4a] hover:bg-[#1a3d5e] active:scale-[0.98] text-white font-extrabold text-sm rounded-xl transition-all cursor-pointer border-none outline-none flex items-center justify-center gap-2 shadow-lg shadow-[#0f2d4a]/20 disabled:opacity-60"
              >
                {isSending ? (
                  <>
                    <HugeiconsIcon icon={Loading03Icon} className="animate-spin h-4 w-4 text-white" strokeWidth={2.5} />
                    <span>{t.sending}</span>
                  </>
                ) : (
                  <span>{t.sendMessage}</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
