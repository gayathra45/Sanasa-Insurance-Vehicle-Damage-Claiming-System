"use client";

import React, { useState, useEffect } from "react";
import PolicyHolderNavbar from "@/app/Components/Policy_Holder/Navbar";
import PolicyHolderFooter from "@/app/Components/Policy_Holder/footer";
import Link from "next/link";
import { API_URL } from "@/app/config";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserIcon,
  Search01Icon,
  Cancel01Icon,
  BubbleChatIcon,
  Tick01Icon,
  CheckmarkCircle01Icon,
  ViewIcon,
  Delete02Icon,
  Analytics01Icon,
  File01Icon,
  Time02Icon,
} from "@hugeicons/core-free-icons";

interface AdditionalDoc {
  name: string;
  url: string;
  uploadedAt: string;
  uploadedBy?: string;
  _id?: string;
}

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
  createdAt?: string;
  officer?: string;
  branch?: string;
  paymentReceipt?: string;
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
  additionalDocuments?: AdditionalDoc[];
}

const translations = {
  en: {
    title: "My Claims",
    subtitle: "All your insurance claims",
    profileStatus: "Profile & Status",
    perfSummary: "Performance Summary",
    claims: "Claims",
    pending: "Pending",
    completed: "Completed",
    searchPlaceholder: "Search claims by number, plate, type, status...",
    all: "All",
    statusPending: "Pending",
    statusReview: "Review",
    statusApproved: "Approved",
    statusRejected: "Rejected",
    statusCompleted: "Completed",
    tableClaimNum: "Claim #",
    tablePlate: "Plate #",
    tableDate: "Date",
    tableType: "Damage Type",
    tableAmount: "Amount",
    tableStatus: "Status",
    tableAction: "Action",
    view: "View"
  },
  si: {
    title: "මගේ හිමිකම්",
    subtitle: "ඔබේ සියලුම රක්‍ෂණ හිමිකම්",
    profileStatus: "පැතිකඩ සහ තත්ත්වය",
    perfSummary: "ක්‍රියාකාරී සාරාංශය",
    claims: "හිමිකම්",
    pending: "ප්‍රතිචාර නොලැබුණු",
    completed: "නිම කළ",
    searchPlaceholder: "අංකය, තහඩුව, වර්ගය, තත්ත්වය අනුව හිමිකම් සොයන්න...",
    all: "සියල්ල",
    statusPending: "Pending",
    statusReview: "Review",
    statusApproved: "Approved",
    statusRejected: "Rejected",
    statusCompleted: "Completed",
    tableClaimNum: "හිමිකම් අංකය",
    tablePlate: "තහඩු අංකය",
    tableDate: "දිනය",
    tableType: "හානි වර්ගය",
    tableAmount: "මුදල",
    tableStatus: "තත්ත්වය",
    tableAction: "ක්‍රියාව",
    view: "බලන්න"
  },
  ta: {
    title: "என் கோரிக்கைகள்",
    subtitle: "உங்கள் காப்பீட்டு கோரிக்கைகள் அனைத்தும்",
    profileStatus: "சுயவிவரம் & நிலை",
    perfSummary: "செயல்திறன் சுருக்கம்",
    claims: "கோரிக்கைகள்",
    pending: "நிலுவையில் உள்ளவை",
    completed: "முடிந்தவை",
    searchPlaceholder: "எண், தட்டு, வகை, நிலை மூலம் கோரிக்கைகளைத் தேடுங்கள்...",
    all: "அனைத்தும்",
    statusPending: "Pending",
    statusReview: "Review",
    statusApproved: "Approved",
    statusRejected: "Rejected",
    statusCompleted: "Completed",
    tableClaimNum: "கோரிக்கை #",
    tablePlate: "தகடு #",
    tableDate: "தேதி",
    tableType: "சேத வகை",
    tableAmount: "தொகை",
    tableStatus: "நிலை",
    tableAction: "செயல்",
    view: "அழைக்க"
  }
};

export default function MyClaims() {
  const [lang, setLang] = useState<"en" | "si" | "ta" >("en");
  const [claims, setClaims] = useState<Claim[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<"All" | "Pending" | "Review" | "Approved" | "Rejected" | "Completed">("All");
  const [isCancellingClaim, setIsCancellingClaim] = useState(false);

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

  const handleCancelClaim = async (claimNumber: string) => {
    const confirmCancel = window.confirm("Are you sure you want to cancel and delete this claim? This action cannot be undone.");
    if (!confirmCancel) return;

    setIsCancellingClaim(true);
    try {
      const res = await fetch(`${API_URL}/policy-holder/delete-claim/${encodeURIComponent(claimNumber)}`, {
        method: "DELETE"
      });

      if (res.ok) {
        alert("Claim cancelled and deleted successfully!");
        setSelectedClaim(null);
        fetchClaims(true); // Refresh claims list
      } else {
        const data = await res.json();
        alert(data.error || "Failed to cancel claim.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while trying to cancel the claim.");
    } finally {
      setIsCancellingClaim(false);
    }
  };

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


  const fetchClaims = async (showLoading = true) => {
    if (typeof window === "undefined") return;
    if (showLoading) setIsLoading(true);
    let userNic = "";
    
    // 1. Get Logged In User
    const userStr = sessionStorage.getItem("logged_in_user");
    if (userStr) {
      try {
        const parsedUser = JSON.parse(userStr);
        setUser(parsedUser);
        if (parsedUser.nic) {
          userNic = parsedUser.nic;
        }
      } catch (err) {
        console.error("Error parsing logged_in_user session", err);
      }
    }

    let databaseClaims: Claim[] = [];

    // 2. Fetch Claims from MongoDB API (if NIC exists)
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
              documentsRequested: claim.documentsRequested || false,
              requestedDocuments: claim.requestedDocuments || [],
              currentStep: claim.currentStep || 1,
              messages: claim.messages || [],
              accidentPhotos: claim.accidentPhotos || {},
              drivingLicense: claim.drivingLicense || {},
              additionalDocuments: claim.additionalDocuments || [],
              createdAt: claim.createdAt || claim.incidentDate,
              branch: claim.branch
            }));
          }
        }
      } catch (err) {
        console.error("Error fetching claims from backend API", err);
      }
    }

    // 3. Fallback to check if a claim was recently submitted in current session
    let localClaims: Claim[] = [];
    try {
      const lastSubmitted = sessionStorage.getItem("last_submitted_claim");
      if (lastSubmitted) {
        const parsed = JSON.parse(lastSubmitted);
        // Verify if it is already in database claims to prevent duplication
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
            accidentPhotos: {},
            drivingLicense: {},
            additionalDocuments: [],
            createdAt: parsed.createdAt || parsed.incidentDate || new Date().toISOString()
          });
        }
      }
    } catch (err) {
      console.error("Error parsing local claim draft", err);
    }

    // 4. Combine recently submitted claims with database claims
    const updatedClaims = [...localClaims, ...databaseClaims];
    setClaims(updatedClaims);
    if (selectedClaim) {
      const updated = updatedClaims.find(c => c.claimNumber === selectedClaim.claimNumber);
      if (updated) {
        setSelectedClaim(updated);
      }
    }
    if (showLoading) setIsLoading(false);
  };

  useEffect(() => {
    fetchClaims(true);
  }, []);

  // Poll database claims periodically in the background
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchClaims(false);
    }, 7000);
    return () => clearInterval(pollInterval);
  }, [selectedClaim]);

  // Lock background scroll when modal is open
  useEffect(() => {
    if (selectedClaim) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedClaim]);

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("pending") || s.includes("progress")) {
      return (
        <span className="text-orange-500 bg-orange-50/45 border border-orange-300 rounded-full px-4 py-1 text-center font-bold text-[13px] inline-block min-w-[95px] select-none">
          Pending
        </span>
      );
    }
    if (s.includes("review") || s.includes("submit")) {
      return (
        <span className="text-blue-500 bg-blue-50/45 border border-blue-300 rounded-full px-4 py-1 text-center font-bold text-[13px] inline-block min-w-[95px] select-none">
          Review
        </span>
      );
    }
    if (s.includes("approved") || s.includes("active") || s.includes("done")) {
      return (
        <span className="text-green-500 bg-green-50/45 border border-green-300 rounded-full px-4 py-1 text-center font-bold text-[13px] inline-block min-w-[95px] select-none">
          Approved
        </span>
      );
    }
    // Fallback default badge
    return (
      <span className="text-slate-500 bg-slate-50/45 border border-slate-300 rounded-full px-4 py-1 text-center font-bold text-[13px] inline-block min-w-[95px] select-none">
        {status}
      </span>
    );
  };

  // Format license plates: e.g. CBH3202 -> CBH-3202
  const formatNumberPlate = (plate: string): string => {
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
  };

  // Calculate statistics for the Policy Holder
  const currentYear = new Date().getFullYear();
  const claimsThisYear = claims.filter(c => {
    const dateStr = c.createdAt || c.incidentDate;
    if (!dateStr) return false;
    try {
      const d = new Date(dateStr);
      return !isNaN(d.getTime()) && d.getFullYear() === currentYear;
    } catch {
      return false;
    }
  });

  const totalClaimsThisYear = claimsThisYear.length;
  const pendingClaimsThisYear = claimsThisYear.filter(c => {
    const s = c.status.toLowerCase();
    return s.includes("pending") || s.includes("progress");
  }).length;
  const completedClaimsThisYear = claimsThisYear.filter(c => {
    const s = c.status.toLowerCase();
    return s.includes("approved") || s.includes("active") || s.includes("done") || s.includes("rejected");
  }).length;

  const totalUploads = claims.reduce((acc, c) => {
    let count = 0;
    if (c.drivingLicense?.front && c.drivingLicense.front.length > 0) count++;
    if (c.drivingLicense?.rear && c.drivingLicense.rear.length > 0) count++;
    if (c.accidentPhotos?.front) count += c.accidentPhotos.front.length;
    if (c.accidentPhotos?.rear) count += c.accidentPhotos.rear.length;
    if (c.accidentPhotos?.side) count += c.accidentPhotos.side.length;
    if (c.additionalDocuments) {
      count += c.additionalDocuments.length;
    }
    return acc + count;
  }, 0);
  const totalChats = claims.reduce((acc, c) => acc + (c.messages?.length || 0), 0);

  // Filter claims based on status filter and search query
  const filteredClaims = claims.filter((claim) => {
    let matchesStatus = false;
    const s = claim.status.toLowerCase();
    if (statusFilter === "All") {
      matchesStatus = true;
    } else if (statusFilter === "Completed") {
      matchesStatus = s.includes("approved") || s.includes("active") || s.includes("done") || s.includes("rejected");
    } else if (statusFilter === "Pending") {
      matchesStatus = s.includes("pending") || s.includes("progress");
    } else if (statusFilter === "Review") {
      matchesStatus = s.includes("review") || s.includes("submit");
    } else if (statusFilter === "Approved") {
      matchesStatus = s.includes("approved") || s.includes("active") || s.includes("done");
    } else if (statusFilter === "Rejected") {
      matchesStatus = s.includes("rejected");
    }

    const matchesSearch =
      claim.claimNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.vehiclePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.damageType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (claim.location && claim.location.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative">
      <PolicyHolderNavbar />

      {/* Styled curved header matching the mockup exactly */}
      <div className="max-w-7xl w-full mx-auto px-6 md:px-16 mt-8 relative">
        {/* Absolute positioned background banner spanning to left edge of screen */}
        <div className="absolute top-0 bottom-0 left-[calc(50%-50vw)] right-6 md:right-12 bg-[url('/myclaim.png')] bg-cover bg-center rounded-r-[75px] md:rounded-r-[95px] overflow-hidden shadow-md">
          {/* Mockup dark slate overlay */}
          <div className="absolute inset-0 bg-slate-900/35" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0d2a3a]/90 via-[#0d2a3a]/75 to-transparent" />
        </div>

        {/* Text content aligned automatically with the page container */}
        <header className="relative z-10 h-[210px] flex flex-col justify-center pl-4 md:pl-8 select-none">
          <h1 className="text-white text-3xl md:text-[40px] font-bold tracking-tight leading-none">
            {t.title}
          </h1>
          <p className="text-slate-200 text-xs md:text-sm font-normal mt-3.5 tracking-wide opacity-95">
            {t.subtitle}
          </p>
        </header>
      </div>

      {/* Main Table Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 md:px-16 py-10 flex flex-col gap-8">
        
        {/* Top Overview Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 select-none">
          
          {/* Card 1: Profile & Status */}
          <div className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-sm flex flex-col justify-between min-h-[150px] hover:shadow-md hover:border-slate-300 transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">{t.profileStatus}</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active Account
              </span>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200/70 border border-slate-200 flex items-center justify-center text-slate-600 font-bold shrink-0 shadow-inner">
                <HugeiconsIcon icon={UserIcon} className="w-6 h-6 text-slate-600" strokeWidth={1.8} />
              </div>
              <div className="overflow-hidden">
                <span className="block font-extrabold text-slate-900 text-lg truncate">
                  {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : (user?.name || "Policy Holder")}
                </span>
                <span className="inline-block bg-slate-100 text-slate-600 text-[11px] font-bold px-2.5 py-0.5 rounded-md mt-1">
                  NIC: {user?.nic || "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Performance Summary (Clean Common White Design) */}
          <div className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-sm flex flex-col justify-between min-h-[150px] hover:shadow-md hover:border-slate-300 transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">{t.perfSummary}</span>
              <span className="text-[11px] font-semibold text-slate-400">
                This Year ({new Date().getFullYear()})
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center mt-2">
              {/* Total Claims */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex flex-col justify-center items-center">
                <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                  <HugeiconsIcon icon={File01Icon} className="w-4 h-4 text-slate-600" strokeWidth={2} />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t.claims}</span>
                </div>
                <span className="text-2xl font-extrabold text-slate-900">{totalClaimsThisYear}</span>
              </div>

              {/* Pending */}
              <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-3 flex flex-col justify-center items-center">
                <div className="flex items-center gap-1.5 text-amber-700 mb-1">
                  <HugeiconsIcon icon={Time02Icon} className="w-4 h-4 text-amber-600" strokeWidth={2} />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">{t.pending}</span>
                </div>
                <span className="text-2xl font-extrabold text-amber-600">{pendingClaimsThisYear}</span>
              </div>

              {/* Completed */}
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-3 flex flex-col justify-center items-center">
                <div className="flex items-center gap-1.5 text-emerald-700 mb-1">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4 text-emerald-600" strokeWidth={2} />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">{t.completed}</span>
                </div>
                <span className="text-2xl font-extrabold text-emerald-600">{completedClaimsThisYear}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Search & Filter row */}
        <div className="bg-white border border-slate-200 rounded-[24px] p-5 flex flex-col lg:flex-row gap-4 items-center justify-between shadow-sm select-none">
          
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-xl w-full lg:w-auto">
            {(["All", "Pending", "Review", "Approved", "Rejected", "Completed"] as const).map(tab => {
              const tabLabels = {
                All: t.all,
                Pending: t.statusPending,
                Review: t.statusReview,
                Approved: t.statusApproved,
                Rejected: t.statusRejected,
                Completed: t.statusCompleted
              };
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition-all border-none outline-none cursor-pointer ${
                    statusFilter === tab
                      ? "bg-[#0f2d4a] text-white shadow-sm font-semibold"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                  }`}
                >
                  {tabLabels[tab]} ({
                    tab === "All"
                      ? claims.length
                      : tab === "Completed"
                      ? claims.filter(c => {
                          const s = c.status.toLowerCase();
                          return s.includes("approved") || s.includes("active") || s.includes("done") || s.includes("rejected");
                        }).length
                      : tab === "Pending"
                      ? claims.filter(c => {
                          const s = c.status.toLowerCase();
                          return s.includes("pending") || s.includes("progress");
                        }).length
                      : tab === "Review"
                      ? claims.filter(c => {
                          const s = c.status.toLowerCase();
                          return s.includes("review") || s.includes("submit");
                        }).length
                      : tab === "Approved"
                      ? claims.filter(c => {
                          const s = c.status.toLowerCase();
                          return s.includes("approved") || s.includes("active") || s.includes("done");
                        }).length
                      : claims.filter(c => c.status.toLowerCase().includes(tab.toLowerCase())).length
                  })
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <div className="relative w-full lg:w-80">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <HugeiconsIcon icon={Search01Icon} className="w-4 h-4" strokeWidth={2.5} />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-slate-700 placeholder:text-slate-400 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-[#0f2d4a] focus:border-transparent transition-all bg-slate-50 focus:bg-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>

        {/* Modern Card Grid list */}
        <div className="flex flex-col gap-6">
          
          {/* Grid Table Header (Desktop Only) */}
          <div className="hidden md:grid md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,0.8fr)] items-center gap-4 px-5 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider select-none border border-transparent border-l-4 border-l-transparent">
            <div>{t.tableClaimNum}</div>
            <div>{t.tablePlate}</div>
            <div>{t.tableDate}</div>
            <div>{t.tableType}</div>
            <div className="text-center">{t.tableAmount}</div>
            <div className="text-center">{t.tableStatus}</div>
            <div className="text-right">{t.tableAction}</div>
          </div>

          {/* List Cards */}
          <div className="flex flex-col gap-3.5">
            {isLoading ? (
              <div className="bg-white border border-slate-200 rounded-[28px] p-16 flex flex-col items-center justify-center text-center shadow-sm min-h-[300px]">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0284c7]"></div>
                <span className="mt-3 text-slate-400 text-sm font-medium">Loading your claims dossier...</span>
              </div>
            ) : filteredClaims.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-[28px] p-16 flex flex-col items-center justify-center text-center shadow-sm min-h-[300px]">
                <h3 className="font-semibold text-slate-700 text-lg">No Claims Found</h3>
                <p className="text-slate-400 text-xs font-normal mt-1.5 max-w-sm leading-relaxed">
                  We couldn't find any claims matching the selected filters or search queries.
                </p>
              </div>
            ) : (
              filteredClaims.map((claim) => {
                const s = claim.status.toLowerCase();
                const isUrgent = s.includes("pending") || s.includes("progress") || s.includes("review") || s.includes("submit");
                return (
                  <div
                    key={claim.claimNumber}
                    onClick={() => setSelectedClaim(claim)}
                    className={`bg-white border border-slate-200 hover:border-[#0f2d4a] rounded-xl px-5 py-4 flex flex-col md:grid md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,0.8fr)] md:items-center gap-4 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md relative overflow-hidden ${
                      isUrgent ? "border-l-4 border-l-[#0f2d4a]" : "border-l-4 border-l-slate-300"
                    }`}
                  >
                    {/* Claim Info */}
                    <div className="flex flex-col min-w-0 select-none">
                      <span className="font-semibold text-slate-800 text-sm whitespace-nowrap">{claim.claimNumber}</span>
                      {claim.createdAt && (
                        <span className="text-[10px] text-slate-400 font-normal mt-1 block">Registered: {formatDateString(claim.createdAt)}</span>
                      )}
                    </div>

                    {/* Vehicle Plate */}
                    <div className="text-xs md:text-sm font-semibold text-slate-800">
                      {formatNumberPlate(claim.vehiclePlate)}
                    </div>

                    {/* Incident Date */}
                    <div className="text-xs md:text-sm font-normal text-slate-600">
                      {claim.incidentDate}
                    </div>

                    {/* Damage Type */}
                    <div className="text-xs md:text-sm font-normal text-slate-600 truncate" title={claim.damageType}>
                      {claim.damageType}
                    </div>

                    {/* Amount */}
                    <div className="text-xs md:text-sm font-semibold text-slate-700 text-center">
                      {claim.amount}
                    </div>

                    {/* Status Badge */}
                    <div className="flex flex-col items-center min-w-0">
                      {getStatusBadge(claim.status)}
                    </div>

                    {/* Action */}
                    <div className="text-left md:text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setSelectedClaim(claim)}
                        className="border border-slate-350 hover:bg-slate-50 text-slate-600 font-semibold text-[10px] px-4 py-2 rounded-lg transition-all cursor-pointer focus:outline-none shadow-sm bg-white whitespace-nowrap active:scale-95"
                      >
                        {t.view}
                      </button>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>

      </main>

      {/* Floating Chat Support Bubble matching the mockup */}
      <button
        type="button"
        className="fixed bottom-8 right-8 z-40 bg-[#00ddff] hover:bg-[#00c8e6] text-white p-5 rounded-full shadow-2xl transition-all duration-150 hover:scale-110 active:scale-95 cursor-pointer focus:outline-none border-none flex items-center justify-center"
        aria-label="Chat support"
      >
        <HugeiconsIcon icon={BubbleChatIcon} className="w-7 h-7 text-white" strokeWidth={2} />
      </button>

      {/* Claim Detail Modal Popup */}
      {selectedClaim && (() => {
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
                    <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-[14px] font-bold ${circleClass}`}>
                      {isCompleted ? (
                        <HugeiconsIcon icon={Tick01Icon} className="w-5 h-5 text-[#00b050]" strokeWidth={3} />
                      ) : (
                        step.num
                      )}
                    </div>
                    <span className={`text-[11px] font-medium mt-2 leading-none ${isActive ? "text-blue-600 font-semibold" : isCompleted ? "text-emerald-700 font-semibold" : "text-slate-400"}`}>
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
                <h2 className="text-[20px] font-bold text-[#0f2d3a] tracking-tight leading-none">
                  Claim Details – {selectedClaim.claimNumber}
                </h2>
                <button
                  onClick={() => setSelectedClaim(null)}
                  className="text-slate-400 hover:text-slate-600 text-2xl font-normal border-none bg-transparent cursor-pointer"
                >
                  &times;
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-8 flex-1 overflow-y-auto">
                
                {/* Dynamic Tracker Wizard */}
                {renderClaimProgress(selectedClaim.status, selectedClaim.currentStep, selectedClaim.paymentReceipt)}

                {/* Payment Receipt Notification Banner */}
                {selectedClaim.paymentReceipt && (
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
                      href={selectedClaim.paymentReceipt.startsWith("http") || selectedClaim.paymentReceipt.startsWith("data:") ? selectedClaim.paymentReceipt : `${API_URL.replace("/api", "")}/uploads/${selectedClaim.paymentReceipt}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all duration-200 no-underline whitespace-nowrap inline-flex items-center gap-1.5"
                    >
                      <HugeiconsIcon icon={ViewIcon} className="w-4 h-4" strokeWidth={2} />
                      View Receipt
                    </a>
                  </div>
                )}

                {/* 2-Column Grid matching mockup inline labels */}
                <div className="grid grid-cols-2 gap-x-12 gap-y-5 text-sm font-normal text-slate-700 mb-6 px-2">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-medium w-28 shrink-0">Vehicle:</span>
                    <span className="font-semibold text-slate-800">{formatNumberPlate(selectedClaim.vehiclePlate)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-medium w-28 shrink-0">Type:</span>
                    <span className="font-semibold text-slate-800">{selectedClaim.damageType}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-medium w-28 shrink-0">Est. Amount:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedClaim.amount.startsWith("Rs.") ? "LKR " + selectedClaim.amount.substring(4) : selectedClaim.amount}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-medium w-28 shrink-0">Date:</span>
                    <span className="font-semibold text-slate-800">{selectedClaim.incidentDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-medium w-28 shrink-0">Officer:</span>
                    <span className="font-semibold text-slate-800">{selectedClaim.officer || "Agent Saman"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-medium w-28 shrink-0">Branch:</span>
                    <span className="font-semibold text-slate-800">{selectedClaim.branch ? (selectedClaim.branch.toLowerCase().includes("branch") ? selectedClaim.branch : selectedClaim.branch + " Branch") : "Galle Branch"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-medium w-28 shrink-0">Location:</span>
                    <span className="font-semibold text-slate-800">{selectedClaim.location || "N/A"}</span>
                  </div>
                </div>

                {/* Description Text (If available) */}
                {selectedClaim.description && (
                  <div className="px-2 mb-6">
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Incident Description</p>
                    <p className="text-slate-600 text-sm font-normal leading-relaxed italic bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      "{selectedClaim.description}"
                    </p>
                  </div>
                )}

                {/* Other Vehicles Involved (If available) */}
                {selectedClaim.otherVehicleDetails && (
                  <div className="px-2 mb-6 text-left">
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 select-none">Other Vehicles Involved</p>
                    {Array.isArray(selectedClaim.otherVehicleDetails) ? (
                      selectedClaim.otherVehicleDetails.length === 0 ? (
                        <div className="text-xs text-slate-500 italic select-none font-normal">No other vehicles involved.</div>
                      ) : (
                        <div className="space-y-4">
                          {selectedClaim.otherVehicleDetails.map((vehicle: any, vIdx: number) => (
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
                                  <span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-2 select-none">Vehicle / Damage Photos</span>
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
                              <span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider select-none">Vehicle Number</span>
                              <span className="block text-slate-800 text-xs font-semibold mt-0.5">{selectedClaim.otherVehicleDetails.vehiclePlate || "—"}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider select-none">Driver Name</span>
                              <span className="block text-slate-800 text-xs font-semibold mt-0.5">{selectedClaim.otherVehicleDetails.driverName || "—"}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider select-none">Insurance Name</span>
                              <span className="block text-slate-800 text-xs font-semibold mt-0.5">{selectedClaim.otherVehicleDetails.insuranceCompany || "—"}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider select-none">Insurance Number</span>
                              <span className="block text-slate-800 text-xs font-semibold mt-0.5">{selectedClaim.otherVehicleDetails.policyNumber || "—"}</span>
                            </div>
                          </div>

                          {/* License Photos */}
                          {selectedClaim.otherVehicleDetails.licensePhotos && selectedClaim.otherVehicleDetails.licensePhotos.length > 0 && (
                            <div className="pt-2 border-t border-slate-200/60">
                              <span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-2 select-none">Other Driver's License Photos</span>
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
                              <span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-2 select-none">Other Vehicle / Scene Photos</span>
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
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 select-none">Messages & Notifications</p>
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
                                <span className="text-red-600 font-semibold">
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
              <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center flex-shrink-0">
                {selectedClaim.currentStep && selectedClaim.currentStep < 2 && (!selectedClaim.officer || selectedClaim.officer === "Not Assigned") && selectedClaim.status !== "Cancelled" ? (
                  <button
                    onClick={() => handleCancelClaim(selectedClaim.claimNumber)}
                    disabled={isCancellingClaim}
                    className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-xs px-5 py-3 rounded-full transition-all border-none cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <HugeiconsIcon icon={Delete02Icon} className="w-4 h-4" strokeWidth={2.5} />
                    {isCancellingClaim ? "Cancelling Claim..." : "Cancel Claim"}
                  </button>
                ) : (
                  <div /> // Spacer to align Close button to the right
                )}

                <button
                  onClick={() => setSelectedClaim(null)}
                  className="bg-[#0f2d3a] hover:bg-[#0b222c] text-white font-semibold text-[14px] px-8 py-3 rounded-full transition-all border-none cursor-pointer shadow-[0_4px_12px_rgba(15,45,58,0.25)] active:scale-95 flex items-center justify-center"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      <PolicyHolderFooter />
    </div>
  );
}
