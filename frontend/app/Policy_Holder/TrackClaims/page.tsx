"use client";

import React, { useState, useEffect, Suspense } from "react";
import PolicyHolderNavbar from "@/app/Components/Policy_Holder/Navbar";
import PolicyHolderFooter from "@/app/Components/Policy_Holder/footer";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { API_URL } from "@/app/config";

interface Claim {
  claimNumber: string;
  vehiclePlate: string;
  incidentDate: string;
  incidentTime?: string;
  damageType: string;
  amount: string;
  status: string;
  description?: string;
  otherVehicleDetails?: {
    vehiclePlate?: string;
    insuranceCompany?: string;
    policyNumber?: string;
    driverName?: string;
    licensePhotos?: string[];
    vehiclePhotos?: string[];
  };
  location?: string;
  officer?: string;
  branch?: string;
  paymentReceipt?: string;
  documentsRequested?: boolean;
  requestedDocuments?: string[];
  documentRequestTo?: string;
  currentStep?: number;
  messages?: { sender: string; message: string; sentAt: string; recipient?: string }[];
}

const translations = {
  en: {
    title: "Track Claims",
    subtitle: "Monitor your claim's progress in real-time",
    idPlaceholder: "Enter Claim ID (e.g. CLM-2074-1487)",
    trackBtn: "Track Claim",
    searching: "Searching details...",
    detailsTitle: "Tracking Details",
    vehicle: "Vehicle:",
    damageType: "Type:",
    estAmount: "Est. Amount:",
    date: "Date:",
    officer: "Officer:",
    branch: "Branch:",
    location: "Location:",
    description: "Description",
    noClaimFound: "No claims found matching",
    enterPrompt: "Please enter a valid Claim ID to retrieve coverage progress records."
  },
  si: {
    title: "හිමිකම් ලුහුබැඳීම",
    subtitle: "ඔබේ හිමිකම්වල ප්‍රගතිය සජීවීව නිරීක්ෂණය කරන්න",
    idPlaceholder: "හිමිකම් අංකය ඇතුළත් කරන්න (උදා: CLM-2074-1487)",
    trackBtn: "ලුහුබඳින්න",
    searching: "තොරතුරු සොයමින්...",
    detailsTitle: "ලුහුබැඳීමේ විස්තර",
    vehicle: "වාහනය:",
    damageType: "වර්ගය:",
    estAmount: "ඇස්තමේන්තු මුදල:",
    date: "දිනය:",
    officer: "නිලධාරියා:",
    branch: "ශාඛාව:",
    location: "පිහිටීම:",
    description: "විස්තරය",
    noClaimFound: "ගැලපෙන හිමිකම් කිසිවක් හමු නොවීය",
    enterPrompt: "ප්‍රගති වාර්තා ලබා ගැනීමට කරුණාකර වලංගු හිමිකම් අංකයක් ඇතුළත් කරන්න."
  },
  ta: {
    title: "கோரிக்கை கண்காணிப்பு",
    subtitle: "உரிமைக்கோரலின் முன்னேற்றத்தை நிகழ்நேரத்தில் கண்காணிக்கவும்",
    idPlaceholder: "கோரிக்கை எண்ணை உள்ளிடவும் (உதா: CLM-2074-1487)",
    trackBtn: "கண்காணி",
    searching: "தகவல்களைத் தேடுகிறது...",
    detailsTitle: "கண்காணிப்பு விவரங்கள்",
    vehicle: "வாகனம்:",
    damageType: "வகை:",
    estAmount: "மதிப்பீட்டுத் தொகை:",
    date: "தேதி:",
    officer: "அதிகாரி:",
    branch: "கிளை:",
    location: "இருப்பிடம்:",
    description: "விவரம்",
    noClaimFound: "பொருந்தக்கூடிய கோரிக்கைகள் எதுவும் இல்லை",
    enterPrompt: "முன்னேற்றப் பதிவுகளைப் பெற செல்லுபடியாகும் கோரிக்கை எண்ணை உள்ளிடவும்."
  }
};

function TrackClaimsContent() {
  const [lang, setLang] = useState<"en" | "si" | "ta">("en");
  const searchParams = useSearchParams();
  const [claimId, setClaimId] = useState("");
  const [trackedClaim, setTrackedClaim] = useState<Claim | null>(null);

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

  const getUserRequestedDocs = (claim: Claim): string[] => {
    const getRecipientForDoc = (name: string) => {
      const msg = [...(claim.messages || [])]
        .reverse()
        .find(m => m.message.includes(`Requested: ${name}`));
      if (msg) {
        if (msg.message.includes("[Document Request to Agent]")) return "Agent";
        if (msg.message.includes("[Document Request to User]")) return "User";
      }
      return claim.documentRequestTo || "User";
    };
    return (claim.requestedDocuments || []).filter(name => getRecipientForDoc(name) === "User");
  };

  const getDocRequestNote = (claim: Claim, docName: string): string => {
    if (!claim.messages) return "";
    const msg = [...claim.messages]
      .reverse()
      .find(m => m.message && m.message.includes(`Requested: ${docName}`));
    if (msg && msg.message) {
      const idx = msg.message.indexOf("Message:");
      if (idx !== -1) {
        return msg.message.substring(idx + 8).trim();
      }
    }
    return "";
  };

  // Format YYYY-MM-DD to "DD MMM YYYY" (e.g. "12 Jan 2026")
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

  const getDocRequestTime = (claim: Claim, docName: string): string => {
    if (!claim.messages) return "";
    const msg = [...claim.messages]
      .reverse()
      .find(m => m.message && m.message.includes(`Requested: ${docName}`));
    if (msg && msg.sentAt) {
      return formatDateTimeString(msg.sentAt);
    }
    return "";
  };

  const getDocRequestSender = (claim: Claim, docName: string): string => {
    if (!claim.messages) return "Office Staff";
    const msg = [...claim.messages]
      .reverse()
      .find(m => m.message && m.message.includes(`Requested: ${docName}`));
    return msg ? (msg.sender || "Office Staff") : "Office Staff";
  };
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [claimsList, setClaimsList] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(false);



  useEffect(() => {
    if (typeof window !== "undefined") {
      const loadClaims = async () => {
        setIsLoading(true);
        let userNic = "";
        
        const userStr = sessionStorage.getItem("logged_in_user");
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            if (user.nic) userNic = user.nic;
          } catch (err) {
            console.error("Error parsing logged_in_user session", err);
          }
        }

        let databaseClaims: Claim[] = [];
        if (userNic) {
          try {
            const res = await fetch(`${API_URL}/policy-holder/user-claims?nic=${encodeURIComponent(userNic)}`, {
              cache: "no-store"
            });
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data.claims)) {
                databaseClaims = data.claims.map((claim: any) => ({
                  claimNumber: claim.claimNumber,
                  vehiclePlate: claim.vehiclePlate,
                  incidentDate: formatDateString(claim.incidentDate),
                  incidentTime: claim.incidentTime,
                  damageType: claim.damageType,
                  amount: claim.amount ? `Rs. ${Number(claim.amount).toLocaleString()}` : "Pending",
                  status: claim.status || "Pending",
                  description: claim.description,
                  otherVehicleDetails: claim.otherVehicleDetails,
                  location: claim.location,
                  officer: claim.assignedAgentName || claim.assignedAgent || "Not Assigned",
                  paymentReceipt: claim.paymentReceipt || "",
                  documentsRequested: claim.documentsRequested || false,
                  requestedDocuments: claim.requestedDocuments || [],
                  currentStep: claim.currentStep || 1,
                  messages: claim.messages || [],
                  branch: claim.branch
                }));
              }
            }
          } catch (err) {
            console.error("Error fetching database claims", err);
          }
        }

        let localClaims: Claim[] = [];
        try {
          const lastSubmitted = sessionStorage.getItem("last_submitted_claim");
          if (lastSubmitted) {
            const parsed = JSON.parse(lastSubmitted);
            const exists = databaseClaims.some(c => c.claimNumber === parsed.claimNumber);
            if (!exists) {
              localClaims.push({
                claimNumber: parsed.claimNumber,
                vehiclePlate: parsed.vehiclePlate,
                incidentDate: formatDateString(parsed.incidentDate),
                incidentTime: parsed.incidentTime,
                damageType: parsed.damageType,
                amount: "Pending",
                status: "Pending",
                description: parsed.description,
                otherVehicleDetails: parsed.otherVehicleDetails,
                location: parsed.location,
                officer: "Not Assigned",
                documentsRequested: false,
                requestedDocuments: [],
                currentStep: 1,
                messages: []
              });
            }
          }
        } catch (err) {
          console.error("Error parsing local claim draft", err);
        }

        const combined = [...localClaims, ...databaseClaims];
        setClaimsList(combined);

        // Check if query parameter 'id' exists
        const idParam = searchParams.get("id");
        if (idParam) {
          setClaimId(idParam);
          const found = combined.find(c => c.claimNumber.toLowerCase() === idParam.toLowerCase());
          if (found) {
            setTrackedClaim(found);
          }
          setSearchAttempted(true);
        }
        setIsLoading(false);
      };

      loadClaims();
    }
  }, [searchParams]);

  // Poll currently tracked claim in background for automatic real-time updates
  useEffect(() => {
    if (!trackedClaim || !trackedClaim.claimNumber) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/policy-holder/track-claim?claimNumber=${encodeURIComponent(trackedClaim.claimNumber.trim().toUpperCase())}`, {
          cache: "no-store"
        });
        if (res.ok) {
          const data = await res.json();
          if (data.claim) {
            setTrackedClaim({
              claimNumber: data.claim.claimNumber,
              vehiclePlate: data.claim.vehiclePlate,
              incidentDate: formatDateString(data.claim.incidentDate),
              incidentTime: data.claim.incidentTime,
              damageType: data.claim.damageType,
              amount: data.claim.amount ? `Rs. ${Number(data.claim.amount).toLocaleString()}` : "Pending",
              status: data.claim.status || "Pending",
              description: data.claim.description,
              otherVehicleDetails: data.claim.otherVehicleDetails,
              location: data.claim.location,
              officer: data.claim.assignedAgentName || data.claim.assignedAgent || "Not Assigned",
              paymentReceipt: data.claim.paymentReceipt || "",
              documentsRequested: data.claim.documentsRequested || false,
              requestedDocuments: data.claim.requestedDocuments || [],
              currentStep: data.claim.currentStep || 1,
              messages: data.claim.messages || []
            });
          }
        }
      } catch (err) {
        console.warn("Background track claim polling failed:", err);
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [trackedClaim?.claimNumber]);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = claimId.trim().toUpperCase();
    if (!cleanId) return;

    setIsLoading(true);
    setSearchAttempted(true);

    try {
      // 1. Try fetching from Backend API first
      const res = await fetch(`${API_URL}/policy-holder/track-claim?claimNumber=${encodeURIComponent(cleanId)}`, {
        cache: "no-store"
      });
      if (res.ok) {
        const data = await res.json();
        if (data.claim) {
          setTrackedClaim({
            claimNumber: data.claim.claimNumber,
            vehiclePlate: data.claim.vehiclePlate,
            incidentDate: formatDateString(data.claim.incidentDate),
            incidentTime: data.claim.incidentTime,
            damageType: data.claim.damageType,
            amount: data.claim.amount ? `Rs. ${Number(data.claim.amount).toLocaleString()}` : "Pending",
            status: data.claim.status || "Pending",
            description: data.claim.description,
            otherVehicleDetails: data.claim.otherVehicleDetails,
            location: data.claim.location,
            officer: data.claim.assignedAgentName || data.claim.assignedAgent || "Not Assigned",
            paymentReceipt: data.claim.paymentReceipt || "",
            documentsRequested: data.claim.documentsRequested || false,
            requestedDocuments: data.claim.requestedDocuments || [],
            currentStep: data.claim.currentStep || 1,
            messages: data.claim.messages || []
          });
          setIsLoading(false);
          return;
        }
      }
    } catch (err) {
      console.error("API tracking failed, falling back to local list", err);
    }

    // 2. Fallback to current claimsList (mock claims + session drafts)
    const found = claimsList.find(
      c => c.claimNumber.toUpperCase() === cleanId
    );
    setTrackedClaim(found || null);
    setIsLoading(false);
  };
  const formatNumberPlate = (plate: string): string => {
    if (!plate) return "";
    const cleaned = plate.trim();
    if (cleaned.includes("-")) return cleaned;
    const lastNumbersMatch = cleaned.match(/^(.*[A-Za-z]+)(\d+)$/);
    if (lastNumbersMatch) {
      return `${lastNumbersMatch[1].trim().toUpperCase()}-${lastNumbersMatch[2]}`;
    }
    return cleaned;
  };

  const renderClaimProgress = (status: string, dbStep?: number, paymentReceipt?: string) => {
    let currentStep = dbStep || 1;
    if (paymentReceipt) {
      currentStep = 6;
    } else if (!dbStep) {
      const s = status.toLowerCase();
      if (s.includes("pending") || s.includes("progress")) {
        currentStep = 3;
      } else if (s.includes("review")) {
        currentStep = 4;
      } else if (s.includes("approved") || s.includes("active") || s.includes("done")) {
        currentStep = 5;
      }
    }

    const isFullyPaid = (status.toLowerCase() === "approved" || currentStep >= 6) && !!paymentReceipt;

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
          style={{ width: isFullyPaid ? "calc(100% - 104px)" : `calc((100% - 104px) * ${currentStep - 1} / 5)` }}
        />

        {steps.map((step, idx) => {
          const stepNum = idx + 1;
          const isCompleted = isFullyPaid || stepNum < currentStep;
          const isActive = !isFullyPaid && stepNum === currentStep;

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
              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-[14px] font-semibold ${circleClass}`}>
                {isCompleted ? (
                  <svg className="w-5 h-5 text-[#00b050]" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  step.num
                )}
              </div>
              <span className={`text-[11px] mt-2 leading-none ${isActive ? "text-blue-600 font-semibold" : isCompleted ? "text-emerald-700 font-semibold" : "text-slate-400 font-normal"}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans relative">
      <PolicyHolderNavbar />

      {/* Curved Header */}
      <div className="max-w-7xl w-full mx-auto px-6 md:px-16 mt-8 relative">
        <div className="absolute top-0 bottom-0 left-[calc(50%-50vw)] right-6 md:right-12 bg-[url('/myclaim.png')] bg-cover bg-center rounded-r-[75px] md:rounded-r-[95px] overflow-hidden shadow-md">
          <div className="absolute inset-0 bg-slate-900/35" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0d2a3a]/90 via-[#0d2a3a]/75 to-transparent" />
        </div>

        <header className="relative z-10 h-[210px] flex flex-col justify-center pl-4 md:pl-8 select-none">
          <h1 className="text-white text-3xl md:text-[40px] font-bold tracking-tight leading-none">
            {t.title}
          </h1>
          <p className="text-slate-200 text-xs md:text-sm font-normal mt-3.5 tracking-wide opacity-95">
            {t.subtitle}
          </p>
        </header>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 md:px-16 py-10">
        
        {/* Track search form */}
        <form onSubmit={handleTrack} className="flex flex-col md:flex-row gap-4 justify-center items-center mb-10 w-full max-w-xl mx-auto">
          <div className="relative w-full">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              required
              placeholder={t.idPlaceholder}
              value={claimId}
              onChange={(e) => setClaimId(e.target.value)}
              className="w-full bg-[#f1f5f9] text-slate-800 rounded-full py-4 pl-12 pr-4 text-base focus:outline-none focus:ring-2 focus:ring-[#00ddff] transition-all border border-slate-300 font-semibold placeholder:text-slate-400 placeholder:font-normal shadow-inner"
            />
          </div>
          <button
            type="submit"
            className="w-full md:w-auto bg-[#0f2d3a] hover:bg-[#0b222c] text-white font-semibold text-base py-4 px-8 rounded-full shadow-md cursor-pointer border-none transition-all duration-150 active:scale-95 whitespace-nowrap"
          >
            {t.trackBtn}
          </button>
        </form>

        {/* Tracking Output Block */}
        {isLoading ? (
          <div className="text-center py-12 text-slate-500 font-medium text-lg">
            {t.searching}
          </div>
        ) : trackedClaim ? (
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-[24px] shadow-lg overflow-hidden transition-all duration-300">
            {/* Header */}
            <div className="px-8 py-5 bg-slate-50 border-b border-slate-200">
              <h3 className="text-[20px] font-bold text-[#0f2d3a] tracking-tight leading-none">
                {t.detailsTitle} – {trackedClaim.claimNumber}
              </h3>
            </div>

            {/* Tracker Panel */}
            <div className="p-8 flex flex-col">
              
              {/* Progress wizard */}
              {renderClaimProgress(trackedClaim.status, trackedClaim.currentStep, trackedClaim.paymentReceipt)}

              {/* Payment Receipt Notification Banner */}
              {trackedClaim.paymentReceipt && (
                <div className="mb-6 p-5 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-[15px] font-semibold text-emerald-950 leading-tight">Payment Transfer Successful</h4>
                      <p className="text-emerald-700 text-xs font-normal mt-0.5">The branch office has submitted the transaction bank receipt.</p>
                    </div>
                  </div>
                  <a
                    href={trackedClaim.paymentReceipt.startsWith("http") || trackedClaim.paymentReceipt.startsWith("data:") ? trackedClaim.paymentReceipt : `${API_URL.replace("/api", "")}/uploads/${trackedClaim.paymentReceipt}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all duration-200 no-underline whitespace-nowrap inline-flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    View Receipt
                  </a>
                </div>
              )}

              {/* 2-Column Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-5 text-sm font-normal text-slate-700 mb-8 px-2 border-b border-slate-100 pb-8">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium">{t.vehicle}</span>
                  <span className="font-semibold text-slate-800">{formatNumberPlate(trackedClaim.vehiclePlate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium">{t.damageType}</span>
                  <span className="font-semibold text-slate-800">{trackedClaim.damageType}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium">{t.estAmount}</span>
                  <span className="font-semibold text-slate-800">
                    {trackedClaim.amount.startsWith("Rs.") ? "LKR " + trackedClaim.amount.substring(4) : trackedClaim.amount}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium">{t.date}</span>
                  <span className="font-semibold text-slate-800">{trackedClaim.incidentDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium">{t.officer}</span>
                  <span className="font-semibold text-slate-800">{trackedClaim.officer || "Agent Saman"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium">{t.branch}</span>
                  <span className="font-semibold text-slate-800">{trackedClaim.branch ? (trackedClaim.branch.toLowerCase().includes("branch") ? trackedClaim.branch : trackedClaim.branch + " Branch") : "Galle Branch"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium">{t.location}</span>
                  <span className="font-semibold text-slate-800">{trackedClaim.location || "N/A"}</span>
                </div>
              </div>

              {/* Incident description */}
              {trackedClaim.description && (
                <div className="px-2 mb-6">
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">{t.description}</p>
                  <p className="text-slate-600 text-sm font-normal leading-relaxed italic bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    "{trackedClaim.description}"
                  </p>
                </div>
              )}

              {/* Other Vehicles Involved */}
              {trackedClaim.otherVehicleDetails && (
                <div className="px-2 mb-6 text-left">
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 select-none">Other Vehicles Involved</p>
                  {Array.isArray(trackedClaim.otherVehicleDetails) ? (
                    trackedClaim.otherVehicleDetails.length === 0 ? (
                      <div className="text-xs text-slate-500 italic select-none font-normal">No other vehicles involved.</div>
                    ) : (
                      <div className="space-y-4">
                        {trackedClaim.otherVehicleDetails.map((vehicle: any, vIdx: number) => (
                          <div key={vIdx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider select-none">Vehicle #{vIdx + 1}</h4>
                            <div className="grid grid-cols-2 gap-4 text-left">
                              <div>
                                <span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider select-none">Vehicle Number</span>
                                <span className="block text-slate-800 text-xs font-semibold mt-0.5">{vehicle.vehiclePlate || "—"}</span>
                              </div>
                              <div>
                                <span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider select-none">Driver Name</span>
                                <span className="block text-slate-800 text-xs font-semibold mt-0.5">{vehicle.driverName || "—"}</span>
                              </div>
                              <div>
                                <span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider select-none">Insurance Name</span>
                                <span className="block text-slate-800 text-xs font-semibold mt-0.5">{vehicle.insuranceCompany || "—"}</span>
                              </div>
                              <div>
                                <span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider select-none">Insurance Number</span>
                                <span className="block text-slate-800 text-xs font-semibold mt-0.5">{vehicle.policyNumber || "—"}</span>
                              </div>
                            </div>

                            {/* License Photos */}
                            {vehicle.licensePhotos && vehicle.licensePhotos.length > 0 && (
                              <div className="pt-2 border-t border-slate-200/60">
                                <span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-2 select-none">Driver's License Photos</span>
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
                                        <img src={docUrl} alt="Driver License" className="w-full h-full object-cover" />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Vehicle Photos */}
                            {vehicle.vehiclePhotos && vehicle.vehiclePhotos.length > 0 && (
                              <div className="pt-2 border-t border-slate-200/60">
                                <span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-2 select-none">Vehicle Photos</span>
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
                                        <img src={docUrl} alt="Vehicle" className="w-full h-full object-cover" />
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
                    trackedClaim.otherVehicleDetails && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-left">
                          <div>
                            <span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider select-none">Vehicle Number</span>
                            <span className="block text-slate-800 text-xs font-semibold mt-0.5">{trackedClaim.otherVehicleDetails.vehiclePlate || "—"}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider select-none">Driver Name</span>
                            <span className="block text-slate-800 text-xs font-semibold mt-0.5">{trackedClaim.otherVehicleDetails.driverName || "—"}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider select-none">Insurance Name</span>
                            <span className="block text-slate-800 text-xs font-semibold mt-0.5">{trackedClaim.otherVehicleDetails.insuranceCompany || "—"}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider select-none">Insurance Number</span>
                            <span className="block text-slate-800 text-xs font-semibold mt-0.5">{trackedClaim.otherVehicleDetails.policyNumber || "—"}</span>
                          </div>
                        </div>

                        {/* License Photos */}
                        {trackedClaim.otherVehicleDetails.licensePhotos && trackedClaim.otherVehicleDetails.licensePhotos.length > 0 && (
                          <div className="pt-2 border-t border-slate-200/60">
                            <span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-2 select-none">Other Driver's License Photos</span>
                            <div className="flex flex-wrap gap-2.5">
                              {trackedClaim.otherVehicleDetails.licensePhotos.map((url: string, idx: number) => {
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
                        {trackedClaim.otherVehicleDetails.vehiclePhotos && trackedClaim.otherVehicleDetails.vehiclePhotos.length > 0 && (
                          <div className="pt-2 border-t border-slate-200/60">
                            <span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-2 select-none">Other Vehicle / Scene Photos</span>
                            <div className="flex flex-wrap gap-2.5">
                              {trackedClaim.otherVehicleDetails.vehiclePhotos.map((url: string, idx: number) => {
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
              <div className="px-2 mt-6">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 select-none">Messages & Notifications</p>
                {trackedClaim.messages && trackedClaim.messages.length > 0 ? (
                  <div className="flex flex-col gap-2.5 max-h-[160px] overflow-y-auto pr-1">
                    {trackedClaim.messages.map((msg: any, index: number) => (
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
                ) : (
                  <p className="text-slate-500 text-xs italic font-normal bg-slate-50 border border-slate-100 rounded-xl p-3 m-0 select-none">
                    No notifications or messages have been sent for this claim.
                  </p>
                )}
              </div>

              {/* Warning Alert Box */}
              {trackedClaim.documentsRequested && getUserRequestedDocs(trackedClaim).length > 0 && (
                <div className="bg-[#ffeaea]/80 border border-[#ffd1d1] rounded-[20px] p-6 mt-6">
                  <h4 className="text-[#9c3535] font-semibold text-sm mb-1.5">Documents Requested</h4>
                  <p className="text-[#aa4f4f] text-[13px] font-normal leading-relaxed mb-3">
                    The following documents have been requested by staff to process your claim. Please upload them via the Documents section:
                  </p>
                  <ul className="list-none flex flex-col gap-4.5 mb-4 pl-1">
                    {getUserRequestedDocs(trackedClaim).map((doc) => {
                      const note = getDocRequestNote(trackedClaim, doc);
                      const reqTime = getDocRequestTime(trackedClaim, doc);
                      return (
                        <li key={doc} className="flex items-start gap-2 text-[#aa4f4f] font-normal text-xs w-full">
                          <span className="w-2 h-2 rounded-full bg-red-650 shrink-0 mt-1.5" />
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-x-2 gap-y-0.5 items-baseline">
                            <span className="font-semibold">{doc}</span>
                            {reqTime && (
                              <span className="text-red-600 font-semibold">
                                (Requested: {reqTime} by {getDocRequestSender(trackedClaim, doc)})
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
                    href={`/Policy_Holder/Documents?uploadClaim=${trackedClaim.claimNumber}`}
                    className="inline-block bg-red-650 hover:bg-red-750 text-white font-semibold text-xs px-6 py-3 rounded-full transition-all duration-150 no-underline shadow-sm cursor-pointer border-none text-center"
                  >
                    Go to Documents
                  </Link>
                </div>
              )}
            </div>
          </div>
        ) : searchAttempted ? (
          <div className="text-center py-12 text-red-500 font-medium bg-red-50/20 border border-red-100 rounded-3xl max-w-md mx-auto animate-pulse">
            {t.noClaimFound} "{claimId}". Please verify your reference number.
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400 font-normal max-w-md mx-auto select-none">
            <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
            </svg>
            {t.enterPrompt}
          </div>
        )}

      </main>

      <PolicyHolderFooter />
    </div>
  );
}

export default function TrackClaims() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex flex-col font-sans relative">
        <PolicyHolderNavbar />
        <main className="flex-1 flex items-center justify-center font-bold text-slate-500 text-lg">
          Loading tracking...
        </main>
        <PolicyHolderFooter />
      </div>
    }>
      <TrackClaimsContent />
    </Suspense>
  );
}
