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
  rejectionReason?: string;
  inspectionReport?: string;
  inspectionSubmitted?: boolean;
  documentsRequested?: boolean;
  requestedDocuments?: string[];
  documentRequestTo?: string;
  currentStep?: number;
  messages?: { sender: string; message: string; sentAt: string; recipient?: string }[];
  accidentPhotos?: {
    front?: string[];
    rear?: string[];
    side?: string[];
  };
  drivingLicense?: {
    front?: string[];
    rear?: string[];
  };
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
    enterPrompt: "Please enter a valid Claim ID to retrieve coverage progress records.",
    accidentPhotos: "Attached Accident & Damage Photos",
    drivingLicense: "Driver's License Photos",
    attachedDocs: "Attached Documents & Reports",
    frontView: "Front View",
    rearView: "Rear View",
    sideView: "Side View",
    licenseFront: "License (Front)",
    licenseRear: "License (Rear)",
    view: "View",
    noPhotos: "No accident photos attached."
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
    enterPrompt: "ප්‍රගති වාර්තා ලබා ගැනීමට කරුණාකර වලංගු හිමිකම් අංකයක් ඇතුළත් කරන්න.",
    accidentPhotos: "අමුණා ඇති අනතුරු හා හානි ඡායාරූප",
    drivingLicense: "රියදුරු බලපත්‍ර ඡායාරූප",
    attachedDocs: "අමුණා ඇති ලේඛන සහ වාර්තා",
    frontView: "ඉදිරිපස පෙනුම",
    rearView: "පසුපස පෙනුම",
    sideView: "පැති පෙනුම",
    licenseFront: "බලපත්‍රය (ඉදිරිපස)",
    licenseRear: "බලපත්‍රය (පසුපස)",
    view: "බලන්න",
    noPhotos: "අනතුරු ඡායාරූප අමුණා නොමැත."
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
    enterPrompt: "முன்னேற்றப் பதிவுகளைப் பெற செல்லுபடியாகும் கோரிக்கை எண்ணை உள்ளிடவும்.",
    accidentPhotos: "இணைக்கப்பட்ட விபத்து மற்றும் சேத புகைப்படங்கள்",
    drivingLicense: "ஓட்டுநர் உரிம புகைப்படங்கள்",
    attachedDocs: "இணைக்கப்பட்ட ஆவணங்கள் மற்றும் அறிக்கைகள்",
    frontView: "முன் பார்வை",
    rearView: "பின் பார்வை",
    sideView: "பக்க பார்வை",
    licenseFront: "உரிமம் (முன்)",
    licenseRear: "உரிமம் (பின்)",
    view: "அழைக்க",
    noPhotos: "விபத்து புகைப்படங்கள் எதுவும் இணைக்கப்படவில்லை."
  }
};

function TrackClaimsContent() {
  const [lang, setLang] = useState<"en" | "si" | "ta">("en");
  const searchParams = useSearchParams();
  const [claimId, setClaimId] = useState("");
  const [trackedClaim, setTrackedClaim] = useState<Claim | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [garageFile, setGarageFile] = useState<File | null>(null);
  const [isUploadingGarage, setIsUploadingGarage] = useState(false);

  const getDocUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
      return url;
    }
    return `${API_URL.replace("/api", "")}/uploads/${url}`;
  };

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

  const getUserRequestedDocs = (claim: Claim): string[] => {
    const getRecipientForDoc = (name: string) => {
      const msg = [...(claim.messages || [])]
        .reverse()
        .find(m => m.message && m.message.includes(`Requested: ${name}`));
      if (msg) {
        if (msg.message.includes("[Document Request to Agent]")) return "Agent";
        if (msg.message.includes("[Document Request to User]")) return "User";
      }
      return claim.documentRequestTo || "User";
    };

    const uploadedNames = (claim.additionalDocuments || [])
      .filter(d => d.uploadedBy !== "Agent")
      .map(d => (d.name || "").trim().toLowerCase());

    if (claim.garageEstimateComparison?.garageDocumentUrl) {
      uploadedNames.push("garage estimate report", "garage estimate", "repair estimate");
    }

    return (claim.requestedDocuments || []).filter(name => {
      if (getRecipientForDoc(name) !== "User") return false;
      const normName = name.trim().toLowerCase();
      const alreadyUploaded = uploadedNames.some(u => 
        u === normName ||
        (normName.includes("garage") && u.includes("garage")) ||
        (normName.includes("police") && u.includes("police")) ||
        (normName.includes("estimate") && u.includes("estimate")) ||
        (normName.includes("license") && u.includes("license"))
      );
      return !alreadyUploaded;
    });
  };

  const getSubmittedUserDocs = (claim: Claim): { name: string; url: string; uploadedAt?: string }[] => {
    const submitted: { name: string; url: string; uploadedAt?: string }[] = [];
    const additional = (claim.additionalDocuments || []).filter(d => d.uploadedBy !== "Agent");
    
    additional.forEach(doc => {
      if (doc.url) {
        submitted.push({
          name: doc.name,
          url: doc.url,
          uploadedAt: doc.uploadedAt || claim.createdAt
        });
      }
    });

    if (claim.garageEstimateComparison?.garageDocumentUrl) {
      const exists = submitted.some(s => s.url === claim.garageEstimateComparison?.garageDocumentUrl);
      if (!exists) {
        submitted.push({
          name: "Garage Estimate Report",
          url: claim.garageEstimateComparison.garageDocumentUrl,
          uploadedAt: claim.createdAt
        });
      }
    }

    return submitted;
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

  const getDocRequestSender = (claim: Claim, docName: string): string => {
    if (!claim.messages) return "Office Staff";
    const msg = [...claim.messages]
      .reverse()
      .find(m => m.message && m.message.includes(`Requested: ${docName}`));
    return msg ? (msg.sender || "Office Staff") : "Office Staff";
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
            const res = await fetch(`${API_URL}/policy-holder/user-claims?nic=${encodeURIComponent(userNic)}&includeDocs=true`, {
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
                  rejectionReason: claim.rejectionReason || "",
                  inspectionReport: claim.inspectionReport || "",
                  inspectionSubmitted: claim.inspectionSubmitted || false,
                  documentsRequested: claim.documentsRequested || false,
                  requestedDocuments: claim.requestedDocuments || [],
                  currentStep: claim.currentStep || 1,
                  messages: claim.messages || [],
                  accidentPhotos: claim.accidentPhotos || {},
                  drivingLicense: claim.drivingLicense || {},
                  additionalDocuments: claim.additionalDocuments || [],
                  branch: claim.branch,
                  createdAt: claim.createdAt,
                  aiAnalysis: claim.aiAnalysis,
                  garageEstimateComparison: claim.garageEstimateComparison
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
                accidentPhotos: parsed.accidentPhotos || {},
                drivingLicense: parsed.drivingLicense || {},
                additionalDocuments: parsed.additionalDocuments || [],
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
              rejectionReason: data.claim.rejectionReason || "",
              inspectionReport: data.claim.inspectionReport || "",
              inspectionSubmitted: data.claim.inspectionSubmitted || false,
              documentsRequested: data.claim.documentsRequested || false,
              requestedDocuments: data.claim.requestedDocuments || [],
              currentStep: data.claim.currentStep || 1,
              messages: data.claim.messages || [],
              accidentPhotos: data.claim.accidentPhotos || {},
              drivingLicense: data.claim.drivingLicense || {},
              additionalDocuments: data.claim.additionalDocuments || [],
              branch: data.claim.branch,
              createdAt: data.claim.createdAt,
              aiAnalysis: data.claim.aiAnalysis,
              garageEstimateComparison: data.claim.garageEstimateComparison
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
            rejectionReason: data.claim.rejectionReason || "",
            inspectionReport: data.claim.inspectionReport || "",
            inspectionSubmitted: data.claim.inspectionSubmitted || false,
            documentsRequested: data.claim.documentsRequested || false,
            requestedDocuments: data.claim.requestedDocuments || [],
            currentStep: data.claim.currentStep || 1,
            messages: data.claim.messages || [],
            accidentPhotos: data.claim.accidentPhotos || {},
            drivingLicense: data.claim.drivingLicense || {},
            additionalDocuments: data.claim.additionalDocuments || [],
            branch: data.claim.branch,
            createdAt: data.claim.createdAt,
            aiAnalysis: data.claim.aiAnalysis,
            garageEstimateComparison: data.claim.garageEstimateComparison
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
        <div className="absolute top-[44px] -translate-y-1/2 left-[52px] right-[52px] h-[3px] bg-slate-200 z-0 pointer-events-none" />
        
        {/* Active Blue Progress Line */}
        <div
          className="absolute top-[44px] -translate-y-1/2 left-[52px] h-[3px] bg-gradient-to-r from-sky-400 to-[#0f2d4a] z-0 pointer-events-none transition-all duration-300"
          style={{ width: isFullyPaid ? "calc(100% - 104px)" : `calc((100% - 104px) * ${currentStep - 1} / 5)` }}
        />

        {steps.map((step, idx) => {
          const stepNum = idx + 1;
          const isCompleted = isFullyPaid || stepNum < currentStep;
          const isActive = !isFullyPaid && stepNum === currentStep;

          let circleClass = "";
          if (isCompleted) {
            circleClass = "border-blue-600 text-blue-600 bg-blue-50";
          } else if (isActive) {
            circleClass = "border-sky-500 text-sky-600 bg-white ring-4 ring-sky-100";
          } else {
            circleClass = "border-slate-300 text-slate-400 bg-white";
          }

          return (
            <div key={step.num} className="relative z-10 flex flex-col items-center flex-1">
              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-[14px] font-bold relative z-10 ${circleClass}`}>
                {isCompleted ? (
                  <HugeiconsIcon icon={Tick01Icon} className="w-5 h-5 text-blue-600" strokeWidth={3} />
                ) : (
                  step.num
                )}
              </div>
              <span className={`text-[11px] mt-2 leading-none relative z-10 ${isActive ? "text-sky-600 font-bold" : isCompleted ? "text-blue-900 font-semibold" : "text-slate-400 font-normal"}`}>
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

              {/* Claim Rejection Banner with Reason */}
              {(trackedClaim.status.toLowerCase() === "rejected" || trackedClaim.rejectionReason) && (
                <div className="mb-6 p-5 rounded-2xl bg-red-50 border border-red-200 flex flex-col gap-2 transition-all duration-300">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">?</span>
                    <h4 className="text-[15px] font-bold text-red-950 leading-tight">Claim Rejected by Branch Office</h4>
                  </div>
                  <p className="text-red-800 text-xs font-medium leading-relaxed m-0">
                    <strong>Formal Rejection Reason:</strong> {trackedClaim.rejectionReason || "Claim has been rejected following damage assessment and garage quote review. Please contact your branch for further details."}
                  </p>
                </div>
              )}

              {/* Claim Approved Banner */}
              {trackedClaim.status.toLowerCase() === "approved" && !trackedClaim.paymentReceipt && (
                <div className="mb-6 p-5 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col gap-2 transition-all duration-300">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">?</span>
                    <h4 className="text-[15px] font-bold text-emerald-950 leading-tight">Claim Approved for Payout</h4>
                  </div>
                  <p className="text-emerald-800 text-xs font-medium leading-relaxed m-0">
                    Your claim has been formally approved for a settlement payout of <strong>{trackedClaim.amount.startsWith("Rs.") ? "LKR " + trackedClaim.amount.substring(4) : trackedClaim.amount}</strong>. Payment disbursement to your registered bank account is currently in progress.
                  </p>
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

              {/* Documents Requested Banner (Action Required) */}
              {trackedClaim.documentsRequested && getUserRequestedDocs(trackedClaim).length > 0 && (
                <div className="mb-6 p-6 rounded-[24px] bg-[#ffeaea]/80 border border-[#ffd1d1] flex flex-col gap-3 transition-all duration-300">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#df3d3d] animate-pulse" />
                    <h4 className="text-[15px] font-bold text-[#9c3535] leading-tight m-0">Documents Requested – Action Required</h4>
                  </div>
                  <p className="text-[#aa4f4f] text-xs font-normal leading-relaxed m-0">
                    The following documents have been requested by staff to process your claim. Please upload them via the Documents section:
                  </p>
                  <ul className="list-none flex flex-col gap-2.5 my-1 pl-1">
                    {getUserRequestedDocs(trackedClaim).map((doc) => {
                      const note = getDocRequestNote(trackedClaim, doc);
                      const reqTime = getDocRequestTime(trackedClaim, doc);
                      return (
                        <li key={doc} className="flex items-start gap-2 text-[#aa4f4f] font-normal text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#df3d3d] flex-shrink-0 mt-1.5" />
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-x-2 gap-y-0.5 items-baseline">
                            <span className="font-semibold text-slate-900">{doc}</span>
                            {reqTime && (
                              <span className="text-red-600 font-semibold">
                                (Requested: {reqTime} by {getDocRequestSender(trackedClaim, doc)})
                              </span>
                            )}
                            {note && (
                              <span className="col-span-1 sm:col-span-2 text-[11px] font-normal text-slate-500 italic mt-0.5">
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
                    className="self-start inline-block bg-[#df3d3d] hover:bg-[#c53030] text-white font-semibold text-xs px-6 py-2.5 rounded-full transition-all duration-150 no-underline shadow-sm cursor-pointer border-none text-center"
                  >
                    Go to Documents
                  </Link>
                </div>
              )}

              {/* Documents Submitted Banner (Under Review) */}
              {getUserRequestedDocs(trackedClaim).length === 0 && getSubmittedUserDocs(trackedClaim).length > 0 && (
                <div className="mb-6 p-6 rounded-[24px] bg-emerald-50/90 border border-emerald-200 flex flex-col gap-3 transition-all duration-300">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <HugeiconsIcon icon={Tick01Icon} className="w-3.5 h-3.5" strokeWidth={3} />
                    </div>
                    <h4 className="text-[15px] font-bold text-emerald-950 leading-tight m-0">Documents Submitted – Under Review</h4>
                  </div>
                  <p className="text-emerald-800 text-xs font-normal leading-relaxed m-0">
                    The requested document(s) have been successfully submitted and are currently being reviewed by our insurance team:
                  </p>
                  <ul className="list-none flex flex-col gap-2 my-1 pl-0">
                    {getSubmittedUserDocs(trackedClaim).map((doc, idx) => (
                      <li key={idx} className="flex items-center justify-between gap-2 text-emerald-900 font-medium text-xs bg-white/80 border border-emerald-100 rounded-xl px-3.5 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="font-semibold truncate text-slate-800">{doc.name}</span>
                          {doc.uploadedAt && (
                            <span className="text-[11px] text-emerald-700/80 font-normal">
                              (Submitted: {formatDateString(doc.uploadedAt)})
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/60 px-2.5 py-0.5 rounded-md shrink-0">
                          Submitted
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/Policy_Holder/Documents`}
                    className="self-start inline-block bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs px-6 py-2.5 rounded-full transition-all duration-150 no-underline shadow-sm cursor-pointer border-none text-center"
                  >
                    View in Documents
                  </Link>
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

                {/* Attached Accident & Damage Photos Section */}
                {(() => {
                  const frontPhotos = trackedClaim.accidentPhotos?.front || [];
                  const rearPhotos = trackedClaim.accidentPhotos?.rear || [];
                  const sidePhotos = trackedClaim.accidentPhotos?.side || [];
                  const allAccidentPhotos: { url: string; label: string; viewType: string }[] = [];

                  frontPhotos.forEach((url, idx) => {
                    allAccidentPhotos.push({ url, label: `${t.frontView} ${frontPhotos.length > 1 ? `#${idx + 1}` : ""}`, viewType: "Front" });
                  });
                  rearPhotos.forEach((url, idx) => {
                    allAccidentPhotos.push({ url, label: `${t.rearView} ${rearPhotos.length > 1 ? `#${idx + 1}` : ""}`, viewType: "Rear" });
                  });
                  sidePhotos.forEach((url, idx) => {
                    allAccidentPhotos.push({ url, label: `${t.sideView} ${sidePhotos.length > 1 ? `#${idx + 1}` : ""}`, viewType: "Side" });
                  });

                  return (
                    <div className="px-2 mb-6 text-left">
                      <div className="flex items-center justify-between mb-2 select-none">
                        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider m-0">
                          {t.accidentPhotos}
                        </p>
                        {allAccidentPhotos.length > 0 && (
                          <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-full">
                            {allAccidentPhotos.length} {allAccidentPhotos.length === 1 ? "Photo" : "Photos"}
                          </span>
                        )}
                      </div>

                      {allAccidentPhotos.length === 0 ? (
                        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs text-slate-400 italic select-none font-normal">
                          {t.noPhotos}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {allAccidentPhotos.map((photo, pIdx) => {
                            const docUrl = getDocUrl(photo.url);
                            return (
                              <div
                                key={pIdx}
                                onClick={() => setPreviewImage({ url: docUrl, title: `${trackedClaim.claimNumber} - ${photo.label}` })}
                                className="group relative bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all duration-200 hover:border-sky-400"
                              >
                                <div className="aspect-[4/3] w-full overflow-hidden bg-slate-900/5">
                                  <img
                                    src={docUrl}
                                    alt={photo.label}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                </div>
                                <div className="p-2.5 bg-white border-t border-slate-100 flex items-center justify-between">
                                  <span className="text-xs font-semibold text-slate-800 truncate">
                                    {photo.label}
                                  </span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 group-hover:bg-sky-100 group-hover:text-sky-800 transition-colors">
                                    {photo.viewType}
                                  </span>
                                </div>
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                  <span className="bg-white/90 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
                                    <HugeiconsIcon icon={ViewIcon} className="w-3.5 h-3.5" strokeWidth={2.5} />
                                    {t.view}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Driver's License Photos Section */}
                {(() => {
                  const licFront = trackedClaim.drivingLicense?.front || [];
                  const licRear = trackedClaim.drivingLicense?.rear || [];
                  const allLicPhotos: { url: string; label: string; side: string }[] = [];

                  licFront.forEach((url, idx) => {
                    allLicPhotos.push({ url, label: `${t.licenseFront} ${licFront.length > 1 ? `#${idx + 1}` : ""}`, side: "Front" });
                  });
                  licRear.forEach((url, idx) => {
                    allLicPhotos.push({ url, label: `${t.licenseRear} ${licRear.length > 1 ? `#${idx + 1}` : ""}`, side: "Rear" });
                  });

                  if (allLicPhotos.length === 0) return null;

                  return (
                    <div className="px-2 mb-6 text-left">
                      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 select-none">
                        {t.drivingLicense}
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {allLicPhotos.map((lic, lIdx) => {
                          const docUrl = getDocUrl(lic.url);
                          return (
                            <div
                              key={lIdx}
                              onClick={() => setPreviewImage({ url: docUrl, title: `${trackedClaim.claimNumber} - ${lic.label}` })}
                              className="group relative bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-400"
                            >
                              <div className="aspect-[16/10] w-full overflow-hidden bg-slate-900/5">
                                <img
                                  src={docUrl}
                                  alt={lic.label}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              </div>
                              <div className="p-2.5 bg-white border-t border-slate-100 flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-800 truncate">
                                  {lic.label}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                                  {lic.side}
                                </span>
                              </div>
                              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                <span className="bg-white/90 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
                                  <HugeiconsIcon icon={ViewIcon} className="w-3.5 h-3.5" strokeWidth={2.5} />
                                  {t.view}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Additional Attached Documents & Files Section */}
                {(() => {
                  const docs: { name: string; url: string; uploadedAt?: string; uploadedBy?: string }[] = [];
                  (trackedClaim.additionalDocuments || []).forEach((d) => {
                    docs.push({
                      name: d.name,
                      url: d.url,
                      uploadedAt: d.uploadedAt,
                      uploadedBy: d.uploadedBy || "Policy Holder"
                    });
                  });

                  if (docs.length === 0) return null;

                  return (
                    <div className="px-2 mb-6 text-left">
                      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 select-none">
                        {t.attachedDocs}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {docs.map((doc, dIdx) => {
                          const docUrl = getDocUrl(doc.url);
                          return (
                            <div
                              key={dIdx}
                              onClick={() => {
                                if (docUrl.endsWith(".pdf") || docUrl.includes(".pdf")) {
                                  window.open(docUrl, "_blank");
                                } else {
                                  setPreviewImage({ url: docUrl, title: doc.name });
                                }
                              }}
                              className="bg-slate-50 border border-slate-200 hover:bg-slate-100/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all shadow-xs group"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center shrink-0">
                                  <HugeiconsIcon icon={File01Icon} className="w-4 h-4" strokeWidth={2.5} />
                                </div>
                                <div className="min-w-0">
                                  <h5 className="text-xs font-semibold text-slate-800 truncate m-0 group-hover:text-blue-950">
                                    {doc.name}
                                  </h5>
                                  <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                                    {doc.uploadedBy} {doc.uploadedAt ? `• ${formatDateString(doc.uploadedAt)}` : ""}
                                  </span>
                                </div>
                              </div>
                              <span className="text-xs text-blue-600 font-semibold px-2.5 py-1 bg-white rounded-lg border border-slate-200 shrink-0 group-hover:border-blue-300">
                                {t.view}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

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

      {/* Full-Screen Image Lightbox Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-[60] p-4 transition-all duration-300"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700/70 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 text-white">
              <span className="font-semibold text-sm tracking-wide text-slate-200 truncate">
                {previewImage.title}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-sky-400 hover:text-sky-300 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-all no-underline font-medium"
                >
                  Open Original ↗
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors border-none bg-transparent cursor-pointer text-lg leading-none"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Image Preview Container */}
            <div className="p-4 flex items-center justify-center bg-slate-950/60 overflow-auto max-h-[calc(92vh-70px)]">
              {previewImage.url.endsWith(".pdf") || previewImage.url.includes(".pdf") ? (
                <iframe
                  src={previewImage.url}
                  title="Document Preview"
                  className="w-full h-[65vh] rounded-xl border border-slate-800"
                />
              ) : (
                <img
                  src={previewImage.url}
                  alt={previewImage.title}
                  className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}

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
