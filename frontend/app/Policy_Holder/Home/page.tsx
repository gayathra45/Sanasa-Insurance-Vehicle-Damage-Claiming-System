"use client";

import React, { useState, useEffect } from "react";
import PolicyHolderNavbar from "@/app/Components/Policy_Holder/Navbar";
import PolicyHolderFooter from "@/app/Components/Policy_Holder/footer";
import Link from "next/link";
import { API_URL } from "@/app/config";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Analytics01Icon,
  Clock01Icon,
  CheckmarkCircle01Icon,
  Notification01Icon,
  AlertCircleIcon,
  Alert02Icon,
  Car01Icon,
  CustomerService01Icon,
  Call02Icon,
  RefreshIcon,
  Download01Icon,
  BubbleChatIcon,
} from "@hugeicons/core-free-icons";

function formatNumberPlate(plate: string): string {
  if (!plate) return "";
  const cleaned = plate.trim();
  if (cleaned.includes("-")) {
    return cleaned;
  }
  const lastNumbersMatch = cleaned.match(/^(.*[A-Za-z]+)(\d+)$/);
  if (lastNumbersMatch) {
    return `${lastNumbersMatch[1].trim().toUpperCase()}-${lastNumbersMatch[2]}`;
  }
  return cleaned;
}

import { getVehicleIconSvg, getVehicleIconContainer, getVehicleTheme } from "@/app/Components/VehicleIcon";


const homeTranslations = {
  en: {
    welcome: "Welcome back,",
    totalClaims: "Total Claims",
    inProgress: "In Progress",
    approved: "Approved",
    myVehicles: "My Registered Vehicles",
    notifications: "Recent Notifications & Requests",
    activePolicy: "Active Policy",
    coverageStatus: "Coverage Status",
    action: "Action",
    view: "View",
    details: "Details",
    downloadCertificate: "Download Cover Note",
    noNotifications: "No notifications or reminders at this time.",
    noVehicles: "No vehicles registered under this policy.",
    policyActiveNote: "Your policy is active and up to date. You have",
    policyClaimSingular: "pending claim",
    policyClaimPlural: "pending claims",
    policyAnd: " and ",
    policyDocRequest: "a document request awaiting action",
    policyCleanNote: "Your policy is active and up to date. You have no pending claims.",
    newClaim: "New Claim",
    trackClaim: "Track Claim",
    accidentNote: "An accident claim with Sanasa General Insurance Company Limited is a request for compensation after an accident.",
    supportHelpdesk: "Support Helpdesk",
    liveSupport: "Live Support",
    supportNeed: "Need assistance with an active claim filing, towing service, or coverage terms? Call our staff directly.",
    line1: "Line 1",
    line2: "Line 2"
  },
  si: {
    welcome: "නැවත සාදරයෙන් පිළිගනිමු,",
    totalClaims: "මුළු හිමිකම් ගණන",
    inProgress: "ක්‍රියාත්මක වෙමින් පවතින",
    approved: "අනුමත කරන ලද",
    myVehicles: "මගේ ලියාපදිංචි වාහන",
    notifications: "මෑත කාලීන දැනුම්දීම් සහ ඉල්ලීම්",
    activePolicy: "සක්‍රීය රක්ෂණ ඔප්පුව",
    coverageStatus: "රක්ෂණ ආවරණ තත්ත්වය",
    action: "ක්‍රියාව",
    view: "බලන්න",
    details: "විස්තර",
    downloadCertificate: "ආවරණ සටහන බාගත කරන්න",
    noNotifications: "දැනට දැනුම්දීම් හෝ ඉල්ලීම් කිසිවක් නැත.",
    noVehicles: "මෙම රක්ෂණ ඔප්පු යටතේ කිසිදු වාහනයක් ලියාපදිංචි කර නොමැත.",
    policyActiveNote: "ඔබගේ රක්ෂණ ඔප්පුව සක්‍රීය වන අතර යාවත්කාලීන වේ. ඔබට",
    policyClaimSingular: "හිමිකම් පෑමක් බලාපොරොත්තුවෙන් පවතී",
    policyClaimPlural: "හිමිකම් පෑම් බලාපොරොත්තුවෙන් පවතී",
    policyAnd: " සහ ",
    policyDocRequest: "ක්‍රියාත්මක කිරීමට බලාපොරොත්තු වන ලේඛන ඉල්ලීමක් ඇත",
    policyCleanNote: "ඔබගේ රක්ෂණ ඔප්පුව සක්‍රීය වන අතර යාවත්කාලීන වේ. ඔබට බලාපොරොත්තු වන හිමිකම් පෑම් නොමැත.",
    newClaim: "නව හිමිකම්",
    trackClaim: "හිමිකම් ලුහුබැඳීම",
    accidentNote: "සනස සාමාන්‍ය රක්ෂණ සමාගම සමඟ අනතුරු හිමිකම් පෑමක් යනු අනතුරකින් පසු වන්දි ලබා ගැනීම සඳහා කරන ඉල්ලීමකි.",
    supportHelpdesk: "සහාය සේවා කවුළුව",
    liveSupport: "සජීවී සහාය",
    supportNeed: "හිමිකම් පෑමක්, ඇදගෙන යාමේ සේවාවක් හෝ රක්ෂණ කොන්දේසි පිළිබඳ සහාය අවශ්‍යද? අපගේ කාර්ය මණ්ඩලය අමතන්න.",
    line1: "මාර්ගය 1",
    line2: "මාර්ගය 2"
  },
  ta: {
    welcome: "மீண்டும் வருக,",
    totalClaims: "மொத்த கோரிக்கைகள்",
    inProgress: "செயல்முறையில்",
    approved: "அங்கீகரிக்கப்பட்ட",
    myVehicles: "என் பதிவு செய்யப்பட்ட வாகனங்கள்",
    notifications: "சமீபத்திய அறிவிப்புகள் & கோரிக்கைகள்",
    activePolicy: "செயலில் உள்ள காப்பீடு",
    coverageStatus: "காப்பீட்டு நிலை",
    action: "நடவடிக்கை",
    view: "பார்வை",
    details: "விவரங்கள்",
    downloadCertificate: "காப்பீட்டுச் சான்றிதழைப் பதிவிறக்குக",
    noNotifications: "நிலுவையில் உள்ள அறிவிப்புகள் எதுவும் இல்லை.",
    noVehicles: "இந்தக் காப்பீட்டின் கீழ் வாகனங்கள் எதுவும் பதிவு செய்யப்படவில்லை.",
    policyActiveNote: "உங்கள் காப்பீடு செயல்பாட்டில் உள்ளது. உங்களிடம்",
    policyClaimSingular: "விண்ணப்பம் பரிசீலனையில் உள்ளது",
    policyClaimPlural: "விண்ணப்பங்கள் பரிசீலனையில் உள்ளன",
    policyAnd: " மற்றும் ",
    policyDocRequest: "ஆவணங்கள் சமர்ப்பிக்க வேண்டியுள்ளது",
    policyCleanNote: "உங்கள் காப்பீடு செயல்பாட்டில் உள்ளது. நிலுவையில் விண்ணப்பங்கள் ஏதுமில்லை.",
    newClaim: "புதிய கோரிக்கை",
    trackClaim: "கோரிக்கையைத் தொடர்க",
    accidentNote: "சனச பொது காப்பீட்டு நிறுவனத்தில் விபத்துக் கோரிக்கை என்பது விபத்துக்குப் பின்னர் இழப்பீடு கோரும் ஒரு கோரிக்கையாகும்.",
    supportHelpdesk: "உதவி மையம்",
    liveSupport: "நேரடி உதவி",
    supportNeed: "உதவி தேவைப்படின் எங்களை நேரடியாகத் தொடர்பு கொள்ளவும்.",
    line1: "வரிசை 1",
    line2: "வரிசை 2"
  }
};

export default function PolicyHolderHome() {
  const [userName, setUserName] = useState("");
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [lang, setLang] = useState<"en" | "si" | "ta">("en");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLang = localStorage.getItem("language") as "en" | "si" | "ta";
      if (savedLang && ["en", "si", "ta"].includes(savedLang)) {
        setLang(savedLang);
      }
      const handleLangChange = (e: any) => {
        setLang(e.detail);
      };
      window.addEventListener("language-changed", handleLangChange);
      return () => window.removeEventListener("language-changed", handleLangChange);
    }
  }, []);

  const t = homeTranslations[lang];
  const [pendingClaimsCount, setPendingClaimsCount] = useState(0);
  const [hasDocumentRequest, setHasDocumentRequest] = useState(false);
  const [totalClaimsCount, setTotalClaimsCount] = useState(0);
  const [approvedClaimsCount, setApprovedClaimsCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedVehicleForModal, setSelectedVehicleForModal] = useState<any | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleDownloadCoverNote = (vehicle: any) => {
    triggerToast(`Generating insurance certificate for ${formatNumberPlate(vehicle.numberPlate)}...`);
    setTimeout(() => {
      const element = document.createElement("a");
      const file = new Blob([
        `SANASA GENERAL INSURANCE COMPANY LIMITED\n`,
        `POLICY CERTIFICATE / COVER NOTE\n`,
        `========================================\n`,
        `Policy Number: ${vehicle.policyNumber}\n`,
        `Vehicle Number Plate: ${formatNumberPlate(vehicle.numberPlate)}\n`,
        `Vehicle Type: ${vehicle.vehicleType}\n`,
        `Make & Model: ${vehicle.company} ${vehicle.model} (${vehicle.year})\n`,
        `Engine Number: ${vehicle.engineNumber}\n`,
        `Chassis Number: ${vehicle.chassisNumber}\n`,
        `Coverage Status: ACTIVE\n`,
        `Validity Period: 2026-01-01 to 2026-12-31\n`,
        `Authorized Signature: Sanasa General Insurance Co. LTD.`
      ], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = `Sanasa_Policy_${vehicle.numberPlate}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      triggerToast(`Successfully downloaded Cover Note for ${formatNumberPlate(vehicle.numberPlate)}!`);
    }, 1200);
  };

  useEffect(() => {
    if (selectedVehicleForModal || selectedClaim) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedVehicleForModal, selectedClaim]);

  const formatDateString = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${date.getDate().toString().padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`;
    } catch (e) {
      return dateStr;
    }
  };

  const getUserRequestedDocs = (claim: any): string[] => {
    const getRecipientForDoc = (name: string) => {
      const msg = [...(claim.messages || [])]
        .reverse()
        .find((m: any) => m.message.includes(`Requested: ${name}`));
      if (msg) {
        if (msg.message.includes("[Document Request to Agent]")) return "Agent";
        if (msg.message.includes("[Document Request to User]")) return "User";
      }
      return claim.documentRequestTo || "User";
    };
    return (claim.requestedDocuments || []).filter((name: string) => getRecipientForDoc(name) === "User");
  };

  const getDocRequestNote = (claim: any, docName: string): string => {
    if (!claim.messages) return "";
    const msg = [...claim.messages]
      .reverse()
      .find((m: any) => m.message && m.message.includes(`Requested: ${docName}`));
    if (msg && msg.message) {
      const idx = msg.message.indexOf("Message:");
      if (idx !== -1) {
        return msg.message.substring(idx + 8).trim();
      }
    }
    return "";
  };

  const formatDateTimeString = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${date.getDate().toString().padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()} ${hours}:${minutes}`;
    } catch (e) {
      return dateStr;
    }
  };

  const getDocRequestTime = (claim: any, docName: string): string => {
    if (!claim.messages) return "";
    const msg = [...claim.messages]
      .reverse()
      .find((m: any) => m.message && m.message.includes(`Requested: ${docName}`));
    if (msg && msg.sentAt) {
      return formatDateTimeString(msg.sentAt);
    }
    return "";
  };

  const getDocRequestSender = (claim: any, docName: string): string => {
    if (!claim.messages) return "Office Staff";
    const msg = [...claim.messages]
      .reverse()
      .find((m: any) => m.message && m.message.includes(`Requested: ${docName}`));
    return msg ? (msg.sender || "Office Staff") : "Office Staff";
  };

  useEffect(() => {
    let intervalId: any;
    if (typeof window !== "undefined") {
      const userStr = sessionStorage.getItem("logged_in_user");
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.firstName) {
            setUserName(user.firstName);
          }
          if (user.vehicles && Array.isArray(user.vehicles)) {
            setVehicles(user.vehicles);
          }

          const syncVehicles = async () => {
            if (!user.nic) return;
            try {
              const res = await fetch(`${API_URL}/policy-holder/vehicles?nic=${encodeURIComponent(user.nic)}`);
              if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data.vehicles)) {
                  setVehicles(data.vehicles);
                  const updatedUser = { ...user, vehicles: data.vehicles };
                  sessionStorage.setItem("logged_in_user", JSON.stringify(updatedUser));
                }
              }
            } catch (e) {
              console.error("Error syncing vehicles:", e);
            }
          };

          const fetchClaims = async () => {
            if (!user.nic) return;
            try {
              const res = await fetch(`${API_URL}/policy-holder/user-claims?nic=${encodeURIComponent(user.nic)}`, {
                cache: "no-store"
              });
              let dbClaims: any[] = [];
              if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data.claims)) {
                  dbClaims = data.claims;
                }
              }

              // Check for local session submitted claims
              let localClaims: any[] = [];
              const lastSubmitted = sessionStorage.getItem("last_submitted_claim");
              if (lastSubmitted) {
                const parsed = JSON.parse(lastSubmitted);
                const exists = dbClaims.some(c => c.claimNumber === parsed.claimNumber);
                if (!exists) {
                  localClaims.push(parsed);
                }
              }

              const allClaims = [...localClaims, ...dbClaims];

              // A claim is pending if status is not approved, done, or rejected
              const pendingClaims = allClaims.filter(c => {
                const s = (c.status || "Pending").toLowerCase();
                return !["approved", "done", "rejected"].some(val => s.includes(val));
              });

              const approvedClaims = allClaims.filter(c => {
                const s = (c.status || "").toLowerCase();
                return ["approved", "done", "active"].some(val => s.includes(val));
              });

              const docRequest = allClaims.some(c => c.documentsRequested === true);

              // Compile dynamic notifications list
              const compiledNotifications: any[] = [];
              allClaims.forEach((claim: any) => {
                if (claim.documentsRequested) {
                  compiledNotifications.push({
                    id: claim.claimNumber + "-doc",
                    type: "urgent",
                    title: "Documents Requested – Action Required",
                    description: `Staff has requested a ${claim.requestedDocuments && claim.requestedDocuments.length > 0 ? claim.requestedDocuments.join(' & ') : 'Police Report & Repair Estimate'} for ${claim.claimNumber}.`,
                    subText: "Please upload within 3 days...",
                    date: claim.createdAt ? formatDateString(claim.createdAt) : "Today",
                    actions: [
                      { label: "Upload", href: `/Policy_Holder/Documents?uploadClaim=${claim.claimNumber}`, primary: true },
                      { label: "View", href: `/Policy_Holder/TrackClaims?id=${claim.claimNumber}` }
                    ],
                    isUrgent: true,
                    claim: claim
                  });
                }

                const s = (claim.status || "").toLowerCase();
                if (["approved", "done", "active"].some(val => s.includes(val))) {
                  compiledNotifications.push({
                    id: claim.claimNumber + "-approved",
                    type: "approved",
                    title: `Claim ${claim.claimNumber} Approved!`,
                    description: `Your claim for LKR ${claim.amount ? Number(claim.amount).toLocaleString() : '85,000'} has been approved. Payment processed within 5 days.`,
                    date: claim.createdAt ? formatDateString(claim.createdAt) : "Today",
                    actions: [
                      { label: "View", href: `/Policy_Holder/TrackClaims?id=${claim.claimNumber}` }
                    ],
                    isUrgent: false,
                    claim: claim
                  });
                } else if (!claim.documentsRequested) {
                  compiledNotifications.push({
                    id: claim.claimNumber + "-status",
                    type: "status",
                    title: `Claim ${claim.claimNumber} Status: ${claim.status || "Pending"}`,
                    description: `Your claim is currently in ${claim.status || "Pending"} stage. Agent is reviewing details.`,
                    date: claim.createdAt ? formatDateString(claim.createdAt) : "Today",
                    actions: [
                      { label: "View", href: `/Policy_Holder/TrackClaims?id=${claim.claimNumber}` }
                    ],
                    isUrgent: false,
                    claim: claim
                  });
                }
              });

              // Sort: Urgent first
              compiledNotifications.sort((a, b) => (a.isUrgent === b.isUrgent ? 0 : a.isUrgent ? -1 : 1));

              setTotalClaimsCount(allClaims.length);
              setPendingClaimsCount(pendingClaims.length);
              setApprovedClaimsCount(approvedClaims.length);
              setHasDocumentRequest(docRequest);
              setNotifications(compiledNotifications);
            } catch (err) {
              console.error("Error fetching claims for home page banner:", err);
            }
          };

          if (user.nic) {
            syncVehicles();
            fetchClaims();
            intervalId = setInterval(() => {
              syncVehicles();
              fetchClaims();
            }, 5000);
          }
        } catch (err) {
          console.error("Error parsing user session", err);
          window.location.href = "/Login";
        }
      } else {
        window.location.href = "/Login";
      }
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative">
      <PolicyHolderNavbar />

      {/* Immersive curved header with background image and horizontal gradient overlay */}
      <header className="relative w-full h-[450px] md:h-[420px] rounded-b-[60px] md:rounded-b-[90px] overflow-hidden shadow-[0_15px_30px_rgba(0,0,0,0.08)] bg-[url('/policy1.jpg')] bg-cover bg-center">
        {/* Horizontal gradient overlay to darken left text area but keep the right image fold bright and clear */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-transparent" />

        {/* Content Container */}
        <div className="relative z-10 max-w-7xl mx-auto h-full px-6 md:px-16 pt-10 pb-12 flex flex-col justify-between">
          
          {/* Welcome Greeting Row */}
          <div>
            <div className="inline-block border-b-3 border-[#00ddff] pb-1.5 mb-2">
              <h2 className="text-white text-xl md:text-2xl font-bold tracking-tight">
                {t.welcome} {userName} !
              </h2>
            </div>
            <p className="text-slate-200 text-[13px] md:text-sm font-normal tracking-wide mt-1 transition-all duration-300">
              {pendingClaimsCount > 0 || hasDocumentRequest ? (
                <>
                  {t.policyActiveNote}{" "}
                  {pendingClaimsCount > 0 && (
                    <>
                      <span className="text-[#ff9800] font-semibold">
                        {pendingClaimsCount} {pendingClaimsCount > 1 ? t.policyClaimPlural : t.policyClaimSingular}
                      </span>
                    </>
                  )}
                  {pendingClaimsCount > 0 && hasDocumentRequest && t.policyAnd}
                  {hasDocumentRequest && (
                    <>
                      <span className="text-[#ff9800] font-semibold">
                        {t.policyDocRequest}
                      </span>
                    </>
                  )}
                  .
                </>
              ) : (
                t.policyCleanNote
              )}
            </p>
          </div>

          {/* Central Statement */}
          <div className="my-auto max-w-4xl mx-auto text-center px-4">
              <h1 className="text-base md:text-xl font-medium text-slate-100/90 leading-relaxed tracking-normal">
                {t.accidentNote}
              </h1>
          </div>

          {/* Action Buttons - Highly highlighted with glowing drop shadows */}
          <div className="flex flex-row justify-center gap-6 mt-2">
            <Link
              href="/Policy_Holder/New_Claim"
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-base md:text-lg px-10 py-5 rounded-full transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] no-underline"
              style={{ boxShadow: "0 8px 25px rgba(220, 38, 38, 0.65)" }}
            >
              {t.newClaim}
            </Link>
            <Link
              href="/Policy_Holder/TrackClaims"
              className="bg-[#1fcbf2] hover:bg-[#00b2d6] text-white font-bold text-base md:text-lg px-10 py-5 rounded-full transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] no-underline"
              style={{ boxShadow: "0 8px 25px rgba(31, 203, 242, 0.65)" }}
            >
              {t.trackClaim}
            </Link>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 md:px-16 py-10 relative z-20">
        
        {/* Three Stat Cards - Overlapping header area & clickable buttons */}
        <section className="-mt-[60px] md:-mt-[50px] grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          
          {/* Total Claims */}
          <Link
            href="/Policy_Holder/My_claims"
            className="bg-white px-5 py-6 rounded-[24px] border border-slate-100 shadow-[0_12px_32px_rgba(0,0,0,0.06)] flex items-center justify-start gap-4 hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 no-underline text-inherit cursor-pointer"
          >
            <div className="text-slate-400 flex-shrink-0">
              <HugeiconsIcon icon={Analytics01Icon} className="w-11 h-11 text-orange-500" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-3xl font-bold text-slate-800 tracking-tight leading-none mb-1">{totalClaimsCount}</h3>
              <p className="text-slate-500 font-semibold text-[10px] md:text-xs uppercase tracking-wider leading-tight">{t.totalClaims}</p>
            </div>
          </Link>

          {/* In Progress */}
          <Link
            href="/Policy_Holder/My_claims"
            className="bg-white px-5 py-6 rounded-[24px] border border-slate-100 shadow-[0_12px_32px_rgba(0,0,0,0.06)] flex items-center justify-start gap-4 hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 no-underline text-inherit cursor-pointer"
          >
            <div className="text-slate-400 flex-shrink-0">
              <HugeiconsIcon icon={Clock01Icon} className="w-11 h-11 text-cyan-500" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-3xl font-bold text-slate-800 tracking-tight leading-none mb-1">{pendingClaimsCount}</h3>
              <p className="text-slate-500 font-semibold text-[10px] md:text-xs uppercase tracking-wider leading-tight">{t.inProgress}</p>
            </div>
          </Link>

          {/* Approved */}
          <Link
            href="/Policy_Holder/My_claims"
            className="bg-white px-5 py-6 rounded-[24px] border border-slate-100 shadow-[0_12px_32px_rgba(0,0,0,0.06)] flex items-center justify-start gap-4 hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 no-underline text-inherit cursor-pointer"
          >
            <div className="text-slate-400 flex-shrink-0">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-11 h-11 text-emerald-500" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-3xl font-bold text-slate-800 tracking-tight leading-none mb-1">{approvedClaimsCount}</h3>
              <p className="text-slate-500 font-semibold text-[10px] md:text-xs uppercase tracking-wider leading-tight">{t.approved}</p>
            </div>
          </Link>

        </section>

        {/* Dashboard Grid - Notifications & Vehicles */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Notifications Column */}
          <div className="lg:col-span-7">
            <div className="flex items-center gap-2.5 mb-6 select-none">
              <HugeiconsIcon icon={Notification01Icon} className="w-6 h-6 text-slate-700 flex-shrink-0" strokeWidth={2.5} />
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
                {t.notifications}
              </h2>
            </div>

            {/* Alert List */}
            <div className="flex flex-col gap-6">
              {notifications.length > 0 ? (
                notifications.slice(0, 3).map((notif: any) => {
                  const isUrgent = notif.type === "urgent";
                  const isApproved = notif.type === "approved";
                  
                  let cardClass = "";
                  let iconClass = "";
                  let iconSvg = null;
                  let titleClass = "";
                  
                  if (isUrgent) {
                    cardClass = "bg-red-50/15 border-2 border-red-100 rounded-[24px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[160px]";
                    iconClass = "p-2 bg-red-100 rounded-xl text-red-500 flex-shrink-0 mt-0.5";
                    iconSvg = (
                      <HugeiconsIcon icon={AlertCircleIcon} className="w-6 h-6" strokeWidth={2} />
                    );
                    titleClass = "text-red-600 font-semibold text-base leading-none";
                  } else if (isApproved) {
                    cardClass = "bg-emerald-50/15 border-2 border-emerald-100 rounded-[24px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[140px]";
                    iconClass = "p-2 bg-emerald-100 rounded-xl text-emerald-500 flex-shrink-0 mt-0.5";
                    iconSvg = (
                      <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-6 h-6" strokeWidth={2} />
                    );
                    titleClass = "text-emerald-600 font-semibold text-base leading-none";
                  } else {
                    cardClass = "bg-blue-50/15 border-2 border-blue-100 rounded-[24px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[140px]";
                    iconClass = "p-2 bg-blue-100 rounded-xl text-blue-500 flex-shrink-0 mt-0.5";
                    iconSvg = (
                      <HugeiconsIcon icon={Clock01Icon} className="w-6 h-6" strokeWidth={2} />
                    );
                    titleClass = "text-blue-600 font-semibold text-base leading-none";
                  }

                  return (
                    <div
                      key={notif.id}
                      onClick={() => notif.claim && setSelectedClaim(notif.claim)}
                      className={`${cardClass} transition-all duration-300 cursor-pointer hover:shadow-md transition-shadow`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={iconClass}>
                          {iconSvg}
                        </div>
                        <div className="flex-1">
                          <h4 className={titleClass}>
                            {notif.title}
                          </h4>
                          <p className="text-slate-600 text-sm font-normal mt-2 leading-relaxed">
                            {notif.description}
                          </p>
                          {notif.subText && (
                            <p className="text-slate-500 text-xs font-normal mt-2">
                              {notif.subText}
                            </p>
                          )}
                        </div>
                      </div>

                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100/50"
                      >
                        <div className="flex gap-2">
                          {notif.actions.map((act: any, idx: number) => {
                            const isPrimary = act.primary;
                            return (
                              <Link
                                key={idx}
                                href={act.href}
                                className={`${
                                  isPrimary 
                                    ? "bg-red-600 hover:bg-red-700 text-white font-medium text-[13px] px-5 py-2 rounded-full transition-all duration-150 no-underline shadow-sm"
                                    : "bg-[#000080] hover:bg-[#000066] text-white font-medium text-[13px] px-5 py-2 rounded-full transition-all duration-150 no-underline shadow-sm"
                                }`}
                              >
                                {act.label}
                              </Link>
                            );
                          })}
                        </div>
                        <span className="text-slate-400 text-xs font-normal">{notif.date}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="bg-white border border-slate-200 rounded-[24px] p-8 text-center shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
                  <p className="text-slate-400 font-normal text-sm">{t.noNotifications}</p>
                </div>
              )}
            </div>
          </div>

          {/* Vehicles Column */}
          <div className="lg:col-span-5 flex flex-col gap-8">
            <div>
              <Link href="/Policy_Holder/MyVehicles" className="flex items-center gap-2.5 mb-6 cursor-pointer group no-underline text-inherit select-none">
                <HugeiconsIcon icon={Car01Icon} className="w-6 h-6 text-slate-700 flex-shrink-0" strokeWidth={2.5} />
                <h2 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
                  {t.myVehicles}
                </h2>
              </Link>

              {/* Vehicle List */}
              <div className="flex flex-col gap-5">
                {vehicles.length > 0 ? (
                  vehicles.map((vehicle, idx) => (
                    <div key={idx} className="bg-white border border-slate-200/80 rounded-[22px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-md transition-all duration-300 flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        {getVehicleIconContainer(vehicle.vehicleType, "w-14 h-14 rounded-2xl")}
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-slate-800 font-bold text-base leading-tight">{formatNumberPlate(vehicle.numberPlate)}</h4>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getVehicleTheme(vehicle.vehicleType).badge} select-none`}>
                              {vehicle.vehicleType}
                            </span>
                          </div>
                          <p className="text-slate-500 font-normal text-xs mt-1">{vehicle.company} {vehicle.model} ({vehicle.year})</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedVehicleForModal(vehicle)}
                        className="border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700 font-medium text-xs px-4 py-1.5 rounded-full transition-all bg-transparent cursor-pointer outline-none whitespace-nowrap"
                      >
                        {t.view}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="bg-white border border-slate-200 rounded-[22px] p-8 text-center shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                    <p className="text-slate-400 font-normal text-sm">{t.noVehicles}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Support Card Box */}
            <div className="bg-gradient-to-br from-cyan-50/90 via-sky-50/40 to-blue-50/20 border border-cyan-150/60 rounded-3xl p-6 shadow-md hover:shadow-lg hover:scale-[1.01] transition-all duration-300 relative overflow-hidden flex flex-col gap-4">
              
              {/* Pulsing online status indicator */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/50 rounded-full px-3 py-1 select-none">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[9px] font-medium text-emerald-700 tracking-wide uppercase">{t.liveSupport}</span>
              </div>

              <h3 className="text-cyan-800 font-bold text-lg tracking-tight flex items-center gap-2 select-none">
                <HugeiconsIcon icon={CustomerService01Icon} className="w-5 h-5 text-cyan-600" strokeWidth={2.5} />
                {t.supportHelpdesk}
              </h3>
              
              <p className="text-xs text-slate-500 font-normal text-left leading-relaxed -mt-1 select-none">
                {t.supportNeed}
              </p>

              <div className="flex flex-col gap-2.5 mt-1">
                <a href="tel:+94112003000" className="flex items-center justify-between bg-white border border-slate-100/60 p-3 rounded-2xl hover:border-cyan-200 hover:shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 font-medium text-sm text-slate-800 group no-underline">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="bg-cyan-50 p-2 rounded-xl text-cyan-600 transition-colors group-hover:bg-cyan-500 group-hover:text-white flex-shrink-0">
                      <HugeiconsIcon icon={Call02Icon} className="w-4 h-4" strokeWidth={2} />
                    </span>
                    <span className="text-slate-700 tracking-tight font-medium text-xs md:text-sm truncate">+94 112 003 000</span>
                  </div>
                  <span className="text-[10px] bg-slate-50 border border-slate-150 px-3 py-1 rounded-full text-slate-400 group-hover:bg-cyan-50 group-hover:text-cyan-600 group-hover:border-cyan-200 whitespace-nowrap flex-shrink-0">
                    {t.line1}
                  </span>
                </a>

                <a href="tel:+94112003001" className="flex items-center justify-between bg-white border border-slate-100/60 p-3 rounded-2xl hover:border-cyan-200 hover:shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 font-medium text-sm text-slate-800 group no-underline">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="bg-cyan-50 p-2 rounded-xl text-cyan-600 transition-colors group-hover:bg-cyan-500 group-hover:text-white flex-shrink-0">
                      <HugeiconsIcon icon={Call02Icon} className="w-4 h-4" strokeWidth={2} />
                    </span>
                    <span className="text-slate-700 tracking-tight font-medium text-xs md:text-sm truncate">+94 112 003 001</span>
                  </div>
                  <span className="text-[10px] bg-slate-50 border border-slate-150 px-3 py-1 rounded-full text-slate-400 group-hover:bg-cyan-50 group-hover:text-cyan-600 group-hover:border-cyan-200 whitespace-nowrap flex-shrink-0">
                    {t.line2}
                  </span>
                </a>
              </div>
            </div>
          </div>

        </section>

      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-[#00ddff] text-slate-900 font-semibold px-6 py-4 rounded-2xl shadow-xl animate-bounce flex items-center gap-3 border border-slate-900/20">
          <HugeiconsIcon icon={RefreshIcon} className="w-6 h-6 animate-spin" strokeWidth={2.5} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Vehicle Detail Popup Modal */}
      {selectedVehicleForModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300 transition-all duration-300">
          <div className="bg-white border border-slate-200 rounded-[28px] w-full max-w-[620px] max-h-[90vh] shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col relative overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-8 pt-6 pb-4 border-b border-slate-200 flex-shrink-0">
              <h2 className="text-[20px] md:text-[22px] font-bold text-[#0f2d3a] tracking-tight leading-none text-slate-800">
                Vehicle Specifications
              </h2>
              <button
                onClick={() => setSelectedVehicleForModal(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold border-none bg-transparent cursor-pointer outline-none"
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-8 flex-1 overflow-y-auto">
              
              {/* Profile Card Header inside modal */}
              <div className="bg-slate-50 border border-slate-200/60 rounded-[22px] p-5 mb-6 flex items-center gap-4.5 shadow-sm select-none text-slate-800">
                {getVehicleIconContainer(selectedVehicleForModal.vehicleType)}
                <div>
                  <h3 className="text-[#0f2d3a] font-bold text-xl leading-none tracking-tight">
                    {selectedVehicleForModal.company} {selectedVehicleForModal.model}
                  </h3>
                  <p className="text-slate-500 font-normal text-xs mt-1.5">
                    Year: {selectedVehicleForModal.year} | Type: {selectedVehicleForModal.vehicleType}
                  </p>
                </div>
              </div>

              {/* 2-Column Specs Layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4 text-sm font-normal text-slate-700 mb-8 px-2">
                <div className="flex flex-col gap-1 border-b border-slate-100 pb-2">
                  <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">Number Plate</span>
                  <span className="font-semibold text-slate-800 text-base">{formatNumberPlate(selectedVehicleForModal.numberPlate)}</span>
                </div>
                <div className="flex flex-col gap-1 border-b border-slate-100 pb-2">
                  <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">Policy Number</span>
                  <span className="font-semibold text-slate-800 text-base tracking-wide">{selectedVehicleForModal.policyNumber || "N/A"}</span>
                </div>
                <div className="flex flex-col gap-1 border-b border-slate-100 pb-2">
                  <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">Engine Number</span>
                  <span className="font-medium text-slate-800 font-mono text-[13px]">{selectedVehicleForModal.engineNumber || "N/A"}</span>
                </div>
                <div className="flex flex-col gap-1 border-b border-slate-100 pb-2">
                  <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">Chassis Number</span>
                  <span className="font-medium text-slate-800 font-mono text-[13px]">{selectedVehicleForModal.chassisNumber || "N/A"}</span>
                </div>
                <div className="flex flex-col gap-1 border-b border-slate-100 pb-2">
                  <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">Insurance Coverage</span>
                  <span className="font-semibold text-emerald-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    Active Coverage
                  </span>
                </div>
                <div className="flex flex-col gap-1 border-b border-slate-100 pb-2">
                  <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">Renewal Cycle</span>
                  <span className="font-semibold text-slate-800">Annual (Jan 01 - Dec 31)</span>
                </div>
                <div className="flex flex-col gap-1 border-b border-slate-100 pb-2 sm:col-span-2">
                  <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">Insurance Plan Type</span>
                  <span className="font-semibold text-slate-800">Comprehensive Vehicle Insurance Plan</span>
                </div>
              </div>

              {/* Action Buttons in Modal */}
              <div className="flex gap-4 border-t border-slate-100 pt-6">
                <Link
                  href={`/Policy_Holder/New_Claim?plate=${encodeURIComponent(selectedVehicleForModal.numberPlate)}`}
                  onClick={() => setSelectedVehicleForModal(null)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm py-4 rounded-full text-center no-underline shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                >
                  <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5" strokeWidth={2.5} />
                  File a Claim
                </Link>
                <button
                  onClick={() => handleDownloadCoverNote(selectedVehicleForModal)}
                  className="flex-1 bg-[#1fcbf2] hover:bg-[#00b2d6] text-white font-semibold text-sm py-4 rounded-full text-center cursor-pointer border-none shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                >
                  <HugeiconsIcon icon={Download01Icon} className="w-5 h-5" strokeWidth={2.5} />
                  Cover Note
                </button>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 flex justify-end flex-shrink-0">
              <button
                onClick={() => setSelectedVehicleForModal(null)}
                className="bg-[#000080] hover:bg-[#000066] text-white font-semibold text-[14px] px-8 py-3 rounded-full transition-all border-none cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Claim Detail Modal Popup */}
      {selectedClaim && (() => {
        const renderClaimProgress = (status: string, dbStep?: number) => {
          let currentStep = dbStep || 1;
          if (!dbStep) {
            const s = status.toLowerCase();
            if (s.includes("pending") || s.includes("progress")) {
              currentStep = 3;
            } else if (s.includes("review")) {
              currentStep = 4;
            } else if (s.includes("approved") || s.includes("active") || s.includes("done")) {
              currentStep = 6;
            }
          }

          const steps = [
            { num: "01", label: "Submitted" },
            { num: "02", label: "Assigned" },
            { num: "03", label: "Inspection" },
            { num: "04", label: "Review" },
            { num: "05", label: "Decision" },
            { num: "06", label: "Payment" }
          ];

          return (
            <div className="bg-[#f8fafc] border border-slate-100 rounded-[24px] pt-6 pb-5 px-8 mb-8 flex justify-between items-center relative select-none w-full max-w-[540px] mx-auto shadow-sm">
              {/* Background Grey Line */}
              <div className="absolute top-[40px] left-[52px] right-[52px] h-[3px] bg-slate-200 z-0" />
              
              {/* Active Green Line */}
              <div
                className="absolute top-[40px] left-[52px] h-[3px] bg-[#00b050] z-0 transition-all duration-300"
                style={{ width: `calc((100% - 104px) * ${currentStep - 1} / 5)` }}
              />

              {steps.map((step, idx) => {
                const stepNum = idx + 1;
                const isCompleted = stepNum < currentStep;
                const isActive = stepNum === currentStep;

                let circleClass = "";
                if (isCompleted) {
                  circleClass = "border-[#00b050] text-[#00b050] bg-white";
                } else if (isActive) {
                  circleClass = "border-blue-500 text-blue-500 bg-[#e8f0fe]";
                } else {
                  circleClass = "border-slate-300 text-slate-400 bg-white";
                }

                return (
                  <div key={step.num} className="flex flex-col items-center z-10 flex-1">
                    <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-[14px] font-bold ${circleClass}`}>
                      {step.num}
                    </div>
                    <span className={`text-[11px] font-medium mt-2 leading-none ${isActive ? "text-blue-600 font-semibold" : isCompleted ? "text-slate-800" : "text-slate-400"}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        };

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
            <div className="bg-white border border-slate-200 rounded-[24px] w-full max-w-[720px] max-h-[90vh] shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col relative transition-all duration-300 overflow-hidden">
              
              {/* Modal Header Title */}
              <div className="flex justify-between items-center px-8 pt-6 pb-4 border-b border-slate-200 flex-shrink-0">
                <h2 className="text-[22px] font-bold text-[#0f2d3a] tracking-tight leading-none text-slate-800">
                  Claim Details – {selectedClaim.claimNumber}
                </h2>
                <button
                  onClick={() => setSelectedClaim(null)}
                  className="text-slate-400 hover:text-slate-600 text-2xl font-bold border-none bg-transparent cursor-pointer"
                >
                  &times;
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-8 flex-1 overflow-y-auto">
                
                {/* Dynamic Tracker Wizard */}
                {renderClaimProgress(selectedClaim.status, selectedClaim.currentStep)}

                {/* 2-Column Grid matching mockup inline labels */}
                <div className="grid grid-cols-2 gap-x-12 gap-y-5 text-[14px] font-normal text-slate-700 mb-6 px-2">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium w-28 shrink-0">Vehicle:</span>
                    <span className="font-semibold text-slate-800">{formatNumberPlate(selectedClaim.vehiclePlate || "")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium w-28 shrink-0">Type:</span>
                    <span className="font-semibold text-slate-800">{selectedClaim.damageType}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium w-28 shrink-0">Est. Amount:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedClaim.amount
                        ? (typeof selectedClaim.amount === "string"
                          ? (selectedClaim.amount.startsWith("Rs.") ? "LKR " + selectedClaim.amount.substring(4) : selectedClaim.amount)
                          : "LKR " + Number(selectedClaim.amount).toLocaleString())
                        : "Pending"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium w-28 shrink-0">Date:</span>
                    <span className="font-semibold text-slate-800">{formatDateString(selectedClaim.incidentDate)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium w-28 shrink-0">Officer:</span>
                    <span className="font-semibold text-slate-800">{selectedClaim.officer || "Agent Saman"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium w-28 shrink-0">Branch:</span>
                    <span className="font-semibold text-slate-800">{selectedClaim.branch ? (selectedClaim.branch.toLowerCase().includes("branch") ? selectedClaim.branch : selectedClaim.branch + " Branch") : "Galle Branch"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium w-28 shrink-0">Location:</span>
                    <span className="font-semibold text-slate-800">{selectedClaim.location || "N/A"}</span>
                  </div>
                </div>

                {/* Description Text (If available) */}
                {selectedClaim.description && (
                  <div className="px-2 mb-6">
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Incident Description</p>
                    <p className="text-slate-600 text-sm font-normal leading-relaxed italic bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      "{selectedClaim.description}"
                    </p>
                  </div>
                )}

                {/* Other Vehicles Involved */}
                {selectedClaim.otherVehicleDetails && (
                  <div className="px-2 mb-6 text-left">
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2 select-none">Other Vehicles Involved</p>
                    {Array.isArray(selectedClaim.otherVehicleDetails) ? (
                      selectedClaim.otherVehicleDetails.length === 0 ? (
                        <div className="text-xs text-slate-500 italic select-none">No other vehicles involved.</div>
                      ) : (
                        <div className="space-y-4">
                          {selectedClaim.otherVehicleDetails.map((vehicle: any, vIdx: number) => (
                            <div key={vIdx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider select-none">Vehicle #{vIdx + 1}</h4>
                              <div className="grid grid-cols-2 gap-4 text-left">
                                <div>
                                  <span className="block text-[10px] text-slate-500 font-medium uppercase tracking-wider select-none">Vehicle Number</span>
                                  <span className="block text-slate-800 text-xs font-medium mt-0.5">{vehicle.vehiclePlate || "—"}</span>
                                </div>
                                <div>
                                  <span className="block text-[10px] text-slate-500 font-medium uppercase tracking-wider select-none">Driver Name</span>
                                  <span className="block text-slate-800 text-xs font-medium mt-0.5">{vehicle.driverName || "—"}</span>
                                </div>
                                <div>
                                  <span className="block text-[10px] text-slate-500 font-medium uppercase tracking-wider select-none">Insurance Name</span>
                                  <span className="block text-slate-800 text-xs font-medium mt-0.5">{vehicle.insuranceCompany || "—"}</span>
                                </div>
                                <div>
                                  <span className="block text-[10px] text-slate-500 font-medium uppercase tracking-wider select-none">Insurance Number</span>
                                  <span className="block text-slate-800 text-xs font-medium mt-0.5">{vehicle.policyNumber || "—"}</span>
                                </div>
                              </div>

                              {/* License Photos */}
                              {vehicle.licensePhotos && vehicle.licensePhotos.length > 0 && (
                                <div className="pt-2 border-t border-slate-200/60">
                                  <span className="block text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-2 select-none">Driver's License Photos</span>
                                  <div className="flex flex-wrap gap-2.5">
                                    {vehicle.licensePhotos.map((url: string, idx: number) => {
                                      let docUrl = url;
                                      if (docUrl && !docUrl.startsWith("http") && !docUrl.startsWith("data:")) {
                                        docUrl = `${API_URL.replace("/api", "")}/uploads/${docUrl}`;
                                      }
                                      return (
                                        <div 
                                          key={idx}
                                          onClick={() => window.open(docUrl, "_blank")}
                                          className="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden cursor-pointer hover:opacity-90 active:scale-95 transition-all shadow-sm"
                                        >
                                          <img src={docUrl} alt="Other Driver License" className="w-full h-full object-cover" />
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Vehicle Photos */}
                              {vehicle.vehiclePhotos && vehicle.vehiclePhotos.length > 0 && (
                                <div className="pt-2 border-t border-slate-200/60">
                                  <span className="block text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-2 select-none">Vehicle / Damage Photos</span>
                                  <div className="flex flex-wrap gap-2.5">
                                    {vehicle.vehiclePhotos.map((url: string, idx: number) => {
                                      let docUrl = url;
                                      if (docUrl && !docUrl.startsWith("http") && !docUrl.startsWith("data:")) {
                                        docUrl = `${API_URL.replace("/api", "")}/uploads/${docUrl}`;
                                      }
                                      return (
                                        <div 
                                          key={idx}
                                          onClick={() => window.open(docUrl, "_blank")}
                                          className="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden cursor-pointer hover:opacity-90 active:scale-95 transition-all shadow-sm"
                                        >
                                          <img src={docUrl} alt="Other Vehicle" className="w-full h-full object-cover" />
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )
                    ) : (
                      (selectedClaim.otherVehicleDetails.vehiclePlate || selectedClaim.otherVehicleDetails.driverName) && (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-left">
                            <div>
                              <span className="block text-[10px] text-slate-500 font-medium uppercase tracking-wider select-none">Vehicle Number</span>
                              <span className="block text-slate-800 text-xs font-medium mt-0.5">{selectedClaim.otherVehicleDetails.vehiclePlate || "—"}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] text-slate-500 font-medium uppercase tracking-wider select-none">Driver Name</span>
                              <span className="block text-slate-800 text-xs font-medium mt-0.5">{selectedClaim.otherVehicleDetails.driverName || "—"}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] text-slate-500 font-medium uppercase tracking-wider select-none">Insurance Name</span>
                              <span className="block text-slate-800 text-xs font-medium mt-0.5">{selectedClaim.otherVehicleDetails.insuranceCompany || "—"}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] text-slate-500 font-medium uppercase tracking-wider select-none">Insurance Number</span>
                              <span className="block text-slate-800 text-xs font-medium mt-0.5">{selectedClaim.otherVehicleDetails.policyNumber || "—"}</span>
                            </div>
                          </div>

                          {/* License Photos */}
                          {selectedClaim.otherVehicleDetails.licensePhotos && selectedClaim.otherVehicleDetails.licensePhotos.length > 0 && (
                            <div className="pt-2 border-t border-slate-200/60">
                              <span className="block text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-2 select-none">Other Driver's License Photos</span>
                              <div className="flex flex-wrap gap-2.5">
                                {selectedClaim.otherVehicleDetails.licensePhotos.map((url: string, idx: number) => {
                                  let docUrl = url;
                                  if (docUrl && !docUrl.startsWith("http") && !docUrl.startsWith("data:")) {
                                    docUrl = `${API_URL.replace("/api", "")}/uploads/${docUrl}`;
                                  }
                                  return (
                                    <div 
                                      key={idx}
                                      onClick={() => window.open(docUrl, "_blank")}
                                      className="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden cursor-pointer hover:opacity-90 active:scale-95 transition-all shadow-sm"
                                    >
                                      <img src={docUrl} alt="Other Driver License" className="w-full h-full object-cover" />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Vehicle Photos */}
                          {selectedClaim.otherVehicleDetails.vehiclePhotos && selectedClaim.otherVehicleDetails.vehiclePhotos.length > 0 && (
                            <div className="pt-2 border-t border-slate-200/60">
                              <span className="block text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-2 select-none">Other Vehicle / Scene Photos</span>
                              <div className="flex flex-wrap gap-2.5">
                                {selectedClaim.otherVehicleDetails.vehiclePhotos.map((url: string, idx: number) => {
                                  let docUrl = url;
                                  if (docUrl && !docUrl.startsWith("http") && !docUrl.startsWith("data:")) {
                                    docUrl = `${API_URL.replace("/api", "")}/uploads/${docUrl}`;
                                  }
                                  return (
                                    <div 
                                      key={idx}
                                      onClick={() => window.open(docUrl, "_blank")}
                                      className="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden cursor-pointer hover:opacity-90 active:scale-95 transition-all shadow-sm"
                                    >
                                      <img src={docUrl} alt="Other Vehicle" className="w-full h-full object-cover" />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* Messages & Notifications Section */}
                <div className="px-2 mt-4 mb-2">
                  <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2 select-none">Messages & Notifications</p>
                  {(() => {
                    const filteredMessages = (selectedClaim.messages || []).filter((msg: any) => msg.recipient !== "Agent");
                    if (filteredMessages.length > 0) {
                      return (
                        <div className="flex flex-col gap-2.5 max-h-[140px] overflow-y-auto pr-1">
                          {filteredMessages.map((msg: any, index: number) => (
                            <div key={index} className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex flex-col gap-1 shadow-sm">
                              <div className="flex justify-between items-center text-[11px] select-none">
                                <span className="font-semibold text-[#0f2d3a]">{msg.sender}</span>
                                <span className="text-slate-400 font-normal">{formatDateString(msg.sentAt)}</span>
                              </div>
                              <p className="text-slate-700 text-xs font-normal leading-relaxed m-0">
                                {msg.message}
                              </p>
                            </div>
                          ))}
                        </div>
                      );
                    } else {
                      return (
                        <p className="text-slate-500 text-xs italic font-normal bg-slate-50 border border-slate-100 rounded-xl p-3 m-0 select-none">
                          No notifications or messages have been sent for this claim.
                        </p>
                      );
                    }
                  })()}
                </div>

                {/* Warning Alert Box matching mockup */}
                {selectedClaim.documentsRequested && getUserRequestedDocs(selectedClaim).length > 0 && (
                  <div className="bg-[#ffeaea]/80 border border-[#ffd1d1] rounded-[20px] p-6 mb-2 mt-4">
                    <h4 className="text-[#9c3535] font-semibold text-sm mb-1.5">Documents Requested</h4>
                    <p className="text-[#aa4f4f] text-[13px] font-normal leading-relaxed mb-3">
                      The following documents have been requested by staff to process your claim. Please upload them via the Documents section:
                    </p>
                    <ul className="list-none flex flex-col gap-4.5 mb-4 pl-1">
                      {getUserRequestedDocs(selectedClaim).map((doc) => {
                        const note = getDocRequestNote(selectedClaim, doc);
                        const reqTime = getDocRequestTime(selectedClaim, doc);
                        return (
                          <li key={doc} className="flex items-start gap-2 text-[#aa4f4f] font-normal text-xs w-full">
                            <span className="w-2 h-2 rounded-full bg-[#df3d3d] flex-shrink-0 mt-1.5" />
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-x-2 gap-y-0.5 items-baseline">
                              <span className="font-semibold">{doc}</span>
                              {reqTime && (
                                <span className="text-red-600 font-medium">
                                  (Requested: {reqTime} by {getDocRequestSender(selectedClaim, doc)})
                                </span>
                              )}
                              {note && (
                                <span className="col-span-1 sm:col-span-2 text-[11px] font-normal text-slate-500 italic mt-0.5 pl-0.5">
                                  Note: "{note}"
                                </span>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    <Link
                      href={`/Policy_Holder/Documents?uploadClaim=${selectedClaim.claimNumber}`}
                      className="inline-block bg-[#df3d3d] hover:bg-[#c53030] text-white font-semibold text-xs px-6 py-3 rounded-full transition-all duration-150 no-underline shadow-sm cursor-pointer border-none text-center"
                    >
                      Go to Documents
                    </Link>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 flex justify-end flex-shrink-0">
                <button
                  onClick={() => setSelectedClaim(null)}
                  className="bg-[#000080] hover:bg-[#000066] text-white font-semibold text-[14px] px-8 py-3 rounded-full transition-all border-none cursor-pointer"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Floating Chat Bubble Button */}
      <button
        className="fixed bottom-8 right-8 z-40 bg-[#00ddff] hover:bg-[#00c8e6] text-white p-5 rounded-full shadow-2xl transition-all duration-150 hover:scale-110 active:scale-95 cursor-pointer focus:outline-none border-none flex items-center justify-center"
        aria-label="Chat support"
      >
        <HugeiconsIcon icon={BubbleChatIcon} className="w-7 h-7 text-white" strokeWidth={2} />
      </button>

      <PolicyHolderFooter />
    </div>
  );
}
