"use client";

import React, { useState, useEffect, Suspense } from "react";
import PolicyHolderNavbar from "@/app/Components/Policy_Holder/Navbar";
import PolicyHolderFooter from "@/app/Components/Policy_Holder/footer";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { API_URL } from "@/app/config";
import SimpleLoader from "@/app/Components/SimpleLoader";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  BubbleChatIcon,
  Tick01Icon,
  Search01Icon,
  CheckmarkCircle01Icon,
  ViewIcon,
  File01Icon,
} from "@hugeicons/core-free-icons";
import { formatSriLankaDateTime } from "@/app/utils/dateFormatter";

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
  additionalDocuments?: { name: string; url: string; uploadedAt: string; uploadedBy?: string }[];
  createdAt?: string;
  aiAnalysis?: {
    isAnalyzed: boolean;
    damagedItems?: {
      item: string;
      damagePercentage: number;
      description: string;
      action?: "Repair" | "Replace";
      estimatedPartCost?: number;
      estimatedLaborCost?: number;
      totalItemCost?: number;
    }[];
    overallDamagePercentage?: number;
    totalEstimatedPartsCost?: number;
    totalEstimatedLaborCost?: number;
    totalEstimatedCost?: number;
    currency?: string;
    summary?: string;
    analyzedAt?: string;
  };
  garageEstimateComparison?: {
    isCompared: boolean;
    garageDocumentUrl?: string;
    garageName?: string;
    garageEstimatedTotal?: number;
    aiEstimatedTotal?: number;
    costDifference?: number;
    costDifferencePercentage?: number;
    verdict?: string;
    matchConfidenceScore?: number;
    photoVerificationDetails?: {
      item: string;
      garageCost: number;
      aiCost: number;
      matchesAccidentPhotos: boolean;
      confidence: number;
      notes: string;
    }[];
    summary?: string;
    reviewedAt?: string;
    reviewedBy?: string;
  };
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
    date: "Incident Date:",
    submittedAt: "Submitted At:",
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
    date: "අනතුර සිදු වූ දිනය:",
    submittedAt: "ඉදිරිපත් කළ වේලාව:",
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
    date: "விபத்து தேதி:",
    submittedAt: "சமர்ப்பிக்கப்பட்ட நேரம்:",
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
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [garageFile, setGarageFile] = useState<File | null>(null);
  const [isUploadingGarage, setIsUploadingGarage] = useState(false);

  const handleUploadGarageEstimate = async () => {
    if (!garageFile || !trackedClaim) return;
    try {
      setIsUploadingGarage(true);
      const reader = new FileReader();
      const base64Data: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(garageFile);
      });

      const res = await fetch(`${API_URL}/my-claims/upload-garage-estimate/${encodeURIComponent(trackedClaim.claimNumber)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileData: base64Data,
          fileName: garageFile.name || "Garage Estimate Report"
        })
      });

      const data = await res.json();
      if (res.ok) {
        setTrackedClaim(data.claim);
        setGarageFile(null);
        alert("Garage Estimate Report uploaded and cross-checked against accident photos successfully!");
      } else {
        alert(data.error || "Failed to upload Garage Estimate Report.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while uploading the Garage Estimate Report.");
    } finally {
      setIsUploadingGarage(false);
    }
  };
  const [claimsList, setClaimsList] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
                  branch: claim.branch,
                  createdAt: claim.createdAt
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
                messages: [],
                createdAt: parsed.createdAt || new Date().toISOString()
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
              messages: data.claim.messages || [],
              branch: data.claim.branch,
              createdAt: data.claim.createdAt
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
            messages: data.claim.messages || [],
            branch: data.claim.branch,
            createdAt: data.claim.createdAt
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
        
        {/* Active Blue Progress Line */}
        <div
          className="absolute top-[40px] left-[52px] h-[3px] bg-gradient-to-r from-sky-400 to-[#0f2d4a] z-0 transition-all duration-300"
          style={{ width: isFullyPaid ? "calc(100% - 104px)" : `calc((100% - 104px) * ${currentStep - 1} / 5)` }}
        />

        {steps.map((step, idx) => {
          const stepNum = idx + 1;
          const isCompleted = isFullyPaid || stepNum < currentStep;
          const isActive = !isFullyPaid && stepNum === currentStep;

          let circleClass = "";
          if (isCompleted) {
            circleClass = "border-blue-600 text-blue-600 bg-blue-50/50";
          } else if (isActive) {
            circleClass = "border-sky-500 text-sky-600 bg-sky-50 ring-4 ring-sky-100";
          } else {
            circleClass = "border-slate-300 text-slate-400 bg-white";
          }

          return (
            <div key={step.num} className="flex flex-col items-center z-10 flex-1">
              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-[14px] font-semibold ${circleClass}`}>
                {isCompleted ? (
                  <HugeiconsIcon icon={Tick01Icon} className="w-5 h-5 text-blue-600" strokeWidth={3} />
                ) : (
                  step.num
                )}
              </div>
              <span className={`text-[11px] mt-2 leading-none ${isActive ? "text-sky-600 font-bold" : isCompleted ? "text-blue-900 font-semibold" : "text-slate-400 font-normal"}`}>
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
              <HugeiconsIcon icon={Search01Icon} className="w-5 h-5" strokeWidth={2.5} />
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
            className="w-full md:w-auto bg-[#000080] hover:bg-[#000066] text-white font-semibold text-base py-4 px-8 rounded-full shadow-md cursor-pointer border-none transition-all duration-150 active:scale-95 whitespace-nowrap"
          >
            {t.trackBtn}
          </button>
        </form>

        {/* Tracking Output Block */}
        {isLoading ? (
          <SimpleLoader message={t.searching} theme="blue" />
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

              {/* Garage Estimate Request Action Banner */}
              {trackedClaim.documentsRequested && trackedClaim.requestedDocuments?.some(d => d.toLowerCase().includes("garage")) && (
                <div className="mb-6 p-6 rounded-2xl bg-amber-50 border border-amber-300 shadow-sm flex flex-col gap-4 text-left transition-all duration-300">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl mt-0.5">⚠️</span>
                    <div>
                      <h4 className="text-base font-bold text-amber-950 leading-tight">
                        Action Required: Upload Garage Estimate Report
                      </h4>
                      <p className="text-amber-800 text-xs font-normal mt-1 leading-relaxed">
                        The branch office has generated the AI Damage Assessment and requires your official repair quotation from the garage to perform the forensic photo cross-check and approve your payout.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex-1 w-full">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                        Select Garage Quotation / Estimate Document (Image / PDF)
                      </label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setGarageFile(e.target.files[0]);
                          }
                        }}
                        className="text-xs font-semibold text-slate-700 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#000080] file:text-white file:cursor-pointer"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleUploadGarageEstimate}
                      disabled={isUploadingGarage || !garageFile}
                      className="w-full sm:w-auto px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-full shadow-sm transition-all border-none cursor-pointer disabled:opacity-50 active:scale-95 whitespace-nowrap"
                    >
                      {isUploadingGarage ? "Uploading & Cross-Checking..." : "Submit Garage Estimate"}
                    </button>
                  </div>
                </div>
              )}

              {/* AI Damage Assessment & Estimation Cost Sheet Card */}
              {trackedClaim.aiAnalysis?.isAnalyzed && (
                <div className="mb-6 p-6 rounded-2xl bg-slate-50 border border-slate-200 text-left shadow-xs flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📋</span>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                          AI Damage Assessment & Loss Estimation
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Evaluated by Sanasa AI Damage Assessment Engine
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full w-fit font-mono">
                      Total Loss: LKR {(trackedClaim.aiAnalysis.totalEstimatedCost || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white border border-slate-200/80 rounded-xl p-3">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">Damage Severity</span>
                      <span className="text-sm font-bold text-emerald-600 mt-1 block">{trackedClaim.aiAnalysis.overallDamagePercentage}%</span>
                    </div>
                    <div className="bg-white border border-slate-200/80 rounded-xl p-3">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">Parts Total</span>
                      <span className="text-xs font-bold text-slate-800 mt-1 block font-mono">LKR {(trackedClaim.aiAnalysis.totalEstimatedPartsCost || 0).toLocaleString()}</span>
                    </div>
                    <div className="bg-white border border-slate-200/80 rounded-xl p-3">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">Labor Total</span>
                      <span className="text-xs font-bold text-slate-800 mt-1 block font-mono">LKR {(trackedClaim.aiAnalysis.totalEstimatedLaborCost || 0).toLocaleString()}</span>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                      <span className="text-[10px] text-emerald-800 font-semibold uppercase block">Grand Total</span>
                      <span className="text-xs font-extrabold text-emerald-900 mt-1 block font-mono">LKR {(trackedClaim.aiAnalysis.totalEstimatedCost || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  {trackedClaim.aiAnalysis.damagedItems && trackedClaim.aiAnalysis.damagedItems.length > 0 && (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase">
                            <th className="py-2 px-3">Item</th>
                            <th className="py-2 px-3 text-center">Action</th>
                            <th className="py-2 px-3 text-right">Parts Cost</th>
                            <th className="py-2 px-3 text-right">Labor Cost</th>
                            <th className="py-2 px-3 text-right font-bold text-slate-900">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {trackedClaim.aiAnalysis.damagedItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 font-semibold text-slate-800">{item.item}</td>
                              <td className="py-2 px-3 text-center">
                                <span className="px-2 py-0.5 bg-slate-100 rounded-full text-[10px] font-bold text-slate-700">
                                  {item.action || "Repair"}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-600">LKR {(item.estimatedPartCost || 0).toLocaleString()}</td>
                              <td className="py-2 px-3 text-right font-mono text-slate-600">LKR {(item.estimatedLaborCost || 0).toLocaleString()}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">LKR {(item.totalItemCost || ((item.estimatedPartCost || 0) + (item.estimatedLaborCost || 0))).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {trackedClaim.garageEstimateComparison?.isCompared && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-900">
                          🔍 Garage Estimate Cross-Check ({trackedClaim.garageEstimateComparison.garageName || "Garage Quotation"})
                        </span>
                        <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                          {trackedClaim.garageEstimateComparison.matchConfidenceScore}% Photo Match Confidence
                        </span>
                      </div>
                      <p className="text-xs text-blue-800 m-0 leading-relaxed">
                        {trackedClaim.garageEstimateComparison.summary || "Garage quotation verified against accident photos. Branch review is underway."}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Payment Receipt Notification Banner */}
              {trackedClaim.paymentReceipt && (
                <div className="mb-6 p-5 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                      <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-5 h-5" strokeWidth={2.5} />
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
                    <HugeiconsIcon icon={ViewIcon} className="w-4 h-4" strokeWidth={2} />
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
                  <span className="font-semibold text-slate-800">{trackedClaim.incidentDate} {trackedClaim.incidentTime ? `@ ${trackedClaim.incidentTime}` : ""}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium">{t.submittedAt}</span>
                  <span className="font-semibold text-slate-800">{formatSriLankaDateTime(trackedClaim.createdAt)}</span>
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
                                <span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-2 select-none">Third-Party Vehicle Photos</span>
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
                                        <img src={docUrl} alt="Vehicle Photo" className="w-full h-full object-cover" />
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
                  ) : null}
                </div>
              )}

              {/* Messages from office staff */}
              {trackedClaim.messages && trackedClaim.messages.length > 0 && (
                <div className="px-2 mb-6">
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Staff Messages & Updates</p>
                  <div className="space-y-3">
                    {trackedClaim.messages.map((m, idx) => (
                      <div key={idx} className="bg-blue-50/60 border border-blue-100 p-4 rounded-2xl">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-[#000080]">{m.sender}</span>
                          <span className="text-[10px] text-slate-400">{m.sentAt ? new Date(m.sentAt).toLocaleDateString() : ""}</span>
                        </div>
                        <p className="text-slate-700 text-xs font-normal leading-relaxed">{m.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        ) : searchAttempted ? (
          <div className="max-w-xl mx-auto bg-slate-50 border border-slate-200 rounded-[24px] p-8 text-center text-slate-500 font-normal">
            <p className="text-base font-semibold text-slate-800 mb-1">{t.noClaimFound} &quot;{claimId}&quot;</p>
            <p className="text-xs">{t.enterPrompt}</p>
          </div>
        ) : null}

      </main>

      {/* Floating Chat Support Bubble */}
      <button
        type="button"
        className="fixed bottom-8 right-8 z-40 bg-[#00ddff] hover:bg-[#00c8e6] text-white p-5 rounded-full shadow-2xl transition-all duration-150 hover:scale-110 active:scale-95 cursor-pointer focus:outline-none border-none flex items-center justify-center"
        aria-label="Chat support"
      >
        <HugeiconsIcon icon={BubbleChatIcon} className="w-7 h-7 text-white" strokeWidth={2} />
      </button>

      <PolicyHolderFooter />
    </div>
  );
}

export default function TrackClaimsPage() {
  return (
    <Suspense fallback={<SimpleLoader message="Loading..." theme="blue" />}>
      <TrackClaimsContent />
    </Suspense>
  );
}
