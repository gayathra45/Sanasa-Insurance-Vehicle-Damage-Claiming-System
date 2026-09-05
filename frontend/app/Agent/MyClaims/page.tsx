"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/Components/Agent/Navbar";
import Footer from "@/app/Components/Agent/Footer";
import { API_URL } from "@/app/config";
import { compressImage } from "../../utils/imageCompressor";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  BubbleChatIcon,
  File01Icon,
  Tick01Icon,
  Alert02Icon,
  CheckmarkCircle01Icon,
  Edit02Icon,
  Search01Icon,
  Cancel01Icon,
  UserIcon,
  Image01Icon,
  Upload01Icon,
  Delete02Icon,
  Car01Icon,
  SmartPhone01Icon,

} from "@hugeicons/core-free-icons";

interface ClaimMessage {
  sender: string;
  message: string;
  sentAt: string;
  recipient?: string;
}

interface AdditionalDoc {
  name: string;
  url: string;
  uploadedAt: string;
  uploadedBy?: string;
}

interface Claim {
  _id: string;
  claimNumber: string;
  userNic: string;
  vehiclePlate: string;
  vehicleModel?: string;
  incidentDate: string;
  incidentTime: string;
  damageType: string;
  description: string;
  location: string;
  status: "Pending" | "In Progress" | "Approved" | "Rejected";
  branch: string;
  assignedAgent: string;
  amount: number | null;
  currentStep: number;
  createdAt: string;
  severity: "Urgent" | "Medium" | "Low";
  messages: ClaimMessage[];
  otherVehicleDetails?: any;
  priority?: string;
  inspectionReport?: string;
  inspectionSubmitted?: boolean;
  paymentReceipt?: string;
  additionalDocuments?: AdditionalDoc[];
  documentsRequested?: boolean;
  requestedDocuments?: string[];
  documentRequestTo?: string;
  accidentPhotos?: {
    front: string[];
    rear: string[];
    side: string[];
  };
  drivingLicense?: {
    front: string[];
    rear: string[];
  };
  bankName?: string;
  bankBranch?: string;
  bankAccount?: string;
  rejectionReason?: string;
}

const parseInspectionReport = (reportText: string) => {
  if (!reportText) return null;
  if (!reportText.includes("[1. VEHICLE CONDITION DETAILS]")) {
    return { isRaw: true, rawText: reportText };
  }

  try {
    const lines = reportText.split("\n");
    let odometer = "";
    let fuelLevel = "";
    let recommendedAction = "";
    let estimatedCost = "";
    let preExistingDamage = "";
    let physicalInspectionNotes = "";
    const checklist: { [key: string]: string } = {};

    let currentSection = "";

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      if (trimmed.startsWith("• Odometer:")) {
        odometer = trimmed.replace("• Odometer:", "").trim();
      } else if (trimmed.startsWith("• Fuel Level:")) {
        fuelLevel = trimmed.replace("• Fuel Level:", "").trim();
      } else if (trimmed.startsWith("• Recommended Action:")) {
        recommendedAction = trimmed.replace("• Recommended Action:", "").trim();
      } else if (trimmed.startsWith("• Estimated Cost:")) {
        estimatedCost = trimmed.replace("• Estimated Cost:", "").trim();
      } else if (trimmed.includes("[3. PRE-EXISTING DAMAGE NOTES]")) {
        currentSection = "pre-existing";
      } else if (trimmed.includes("[4. PHYSICAL INSPECTION NOTES]")) {
        currentSection = "physical-notes";
      } else if (trimmed.includes("==================================") || trimmed.includes("VEHICLE CLAIM INSPECTION")) {
        // skip
      } else if (trimmed.includes("[2. COMPONENT DAMAGE CHECKLIST]")) {
        currentSection = "checklist";
      } else if (currentSection === "checklist" && trimmed.startsWith("• ")) {
        const parts = trimmed.substring(2).split(":");
        if (parts.length >= 2) {
          const compName = parts[0].trim();
          const compVal = parts[1].replace("[", "").replace("]", "").trim();
          checklist[compName] = compVal;
        }
      } else if (currentSection === "pre-existing") {
        if (!trimmed.startsWith("[")) {
          preExistingDamage += (preExistingDamage ? "\n" : "") + trimmed;
        }
      } else if (currentSection === "physical-notes") {
        if (!trimmed.startsWith("[")) {
          physicalInspectionNotes += (physicalInspectionNotes ? "\n" : "") + trimmed;
        }
      }
    });

    return {
      isRaw: false,
      odometer,
      fuelLevel,
      recommendedAction,
      estimatedCost,
      checklist,
      preExistingDamage: preExistingDamage || "None reported.",
      physicalInspectionNotes: physicalInspectionNotes || "None reported."
    };
  } catch (err) {
    console.error("Error parsing inspection report:", err);
    return { isRaw: true, rawText: reportText };
  }
};

const renderPremiumInspectionReport = (reportText: string) => {
  const parsed = parseInspectionReport(reportText);
  if (!parsed) return null;

  if (parsed.isRaw) {
    return (
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 shadow-inner select-text">
        <div className="flex items-center gap-2 mb-3 text-slate-400 select-none">
          <HugeiconsIcon icon={File01Icon} className="w-5 h-5 text-slate-400" strokeWidth={2.5} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Raw Inspection Report Text</span>
        </div>
        <p className="text-slate-700 text-xs font-semibold whitespace-pre-wrap leading-relaxed">
          {parsed.rawText}
        </p>
      </div>
    );
  }

  const renderBadge = (val: string) => {
    let color = "text-slate-500 bg-slate-50 border-slate-200";
    let icon = null;
    
    if (val === "None") {
      color = "text-emerald-600 bg-emerald-50/40 border-emerald-200/60";
      icon = (
        <HugeiconsIcon icon={Tick01Icon} className="w-4 h-4 text-emerald-500 flex-shrink-0" strokeWidth={3} />
      );
    } else if (val === "Minor") {
      color = "text-amber-600 bg-amber-50/40 border-amber-200/60";
      icon = (
        <HugeiconsIcon icon={Alert02Icon} className="w-4 h-4 text-amber-550 flex-shrink-0" strokeWidth={3} />
      );
    } else if (val === "Major") {
      color = "text-rose-600 bg-rose-50/40 border-rose-200/60";
      icon = (
        <HugeiconsIcon icon={Alert02Icon} className="w-4 h-4 text-rose-505 flex-shrink-0" strokeWidth={3} />
      );
    }

    return (
      <span className={`px-3 py-1 rounded-full text-[9px] font-semibold uppercase tracking-wider border flex items-center gap-1.5 select-none ${color}`}>
        {icon}
        {val}
      </span>
    );
  };

  return (
    <div className="border border-slate-200/80 rounded-[32px] overflow-hidden bg-slate-50/20 p-6 space-y-6 shadow-sm select-text text-left font-sans w-full">
      {/* Dashboard Title */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 select-none">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <div>
            <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wider leading-none">Vehicle Inspection Report</h4>
            <span className="text-[10px] font-bold text-slate-400 block mt-1 tracking-wider">OFFICIAL PHYSICAL ASSESSMENT SUMMARY</span>
          </div>
        </div>
        <span className="bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-[10px] font-bold tracking-wider uppercase px-4 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
          <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4" strokeWidth={2.5} />
          Verified By Agent
        </span>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Odometer */}
        <div className="bg-white border border-slate-150 rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden h-[95px] border-t-4 border-t-blue-500">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none select-none">Odometer</span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-[17px] font-semibold text-slate-800">{parsed.odometer || "N/A"}</span>
          </div>
          <span className="text-[9px] text-slate-400 font-semibold select-none">Total Distance Travelled</span>
        </div>

        {/* Card 2: Fuel Level */}
        <div className="bg-white border border-slate-150 rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden h-[95px] border-t-4 border-t-indigo-500">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none select-none">Fuel Level</span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-[17px] font-semibold text-slate-800">{parsed.fuelLevel || "N/A"}</span>
          </div>
          <span className="text-[9px] text-slate-400 font-semibold select-none">Current Tank Level</span>
        </div>

        {/* Card 3: Estimated Cost */}
        <div className="bg-white border border-slate-150 rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden h-[95px] border-t-4 border-t-emerald-500">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none select-none">Estimated Cost</span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-[17px] font-semibold text-emerald-600">{parsed.estimatedCost || "N/A"}</span>
          </div>
          <span className="text-[9px] text-slate-400 font-semibold select-none">Assessment Valuation</span>
        </div>

        {/* Card 4: Recommendation */}
        <div className="bg-white border border-slate-150 rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden h-[95px] border-t-4 border-t-violet-500">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none select-none">Recommendation</span>
          <div className="flex items-baseline gap-1 mt-2 overflow-hidden">
            <span className="text-[13px] font-semibold text-slate-800 truncate" title={parsed.recommendedAction}>{parsed.recommendedAction || "N/A"}</span>
          </div>
          <span className="text-[9px] text-slate-400 font-semibold select-none">Suggested Action Payout</span>
        </div>
      </div>

      {/* Checklist & Notes Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Component Damage Checklist */}
        <div className="bg-white border border-slate-150 rounded-2xl p-5 space-y-4 shadow-sm">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block border-b border-slate-100 pb-2.5 mb-3 select-none">Component Damage Checklist</span>
            <div className="space-y-2">
              {Object.entries(parsed.checklist || {}).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                  <span className="text-slate-700 font-bold text-xs">{key}</span>
                  {renderBadge(value)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Remarks Column */}
        <div className="flex flex-col gap-4">
          {parsed.preExistingDamage && parsed.preExistingDamage !== "None reported." && (
            <div className="bg-amber-50/20 border border-amber-200/50 rounded-2xl p-5 shadow-sm space-y-2.5 flex-1">
              <span className="text-[10px] text-amber-800 font-semibold uppercase tracking-wider flex items-center gap-1.5 select-none">
                <HugeiconsIcon icon={Alert02Icon} className="w-4 h-4 text-amber-600" strokeWidth={2.5} />
                Pre-Existing Damage Remarks
              </span>
              <p className="text-slate-700 text-xs font-semibold leading-relaxed whitespace-pre-wrap">{parsed.preExistingDamage}</p>
            </div>
          )}

          <div className="bg-slate-50/50 border border-slate-200/70 rounded-2xl p-5 shadow-sm space-y-2.5 flex-1">
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1.5 select-none">
              <HugeiconsIcon icon={Edit02Icon} className="w-4 h-4 text-slate-400" strokeWidth={2.5} />
              Physical Inspection Remarks
            </span>
            <p className="text-slate-700 text-xs font-semibold leading-relaxed whitespace-pre-wrap">{parsed.physicalInspectionNotes}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const translations = {
  en: {
    title: "My Assigned Claims",
    subtitle: "Real-time inspection directory and assessment generation center",
    all: "All",
    urgent: "Urgent",
    new: "New",
    pending: "Pending",
    searchPlaceholder: "Search claim plate or policyholder details...",
    noClaimsFound: "No Active Claims Found",
    noClaimsFoundDesc: "We couldn't find any claims assigned to you under active search queries or filters.",
    claimInfo: "Claim Info",
    vehicleNo: "Vehicle No",
    damageType: "Damage Type",
    location: "Location",
    policyHolder: "Policy Holder",
    assessment: "Assessment",
    status: "Status",
    actions: "Actions",
    viewDetails: "View Details",
    claimNumber: "Claim Number"
  },
  si: {
    title: "මට පවරා ඇති හිමිකම්",
    subtitle: "සැබෑ වේලාවේ පරීක්ෂණ නාමාවලිය සහ තක්සේරු උත්පාදන මධ්‍යස්ථානය",
    all: "සියල්ල",
    urgent: "හදිසි",
    new: "නව",
    pending: "ප්‍රතිචාර නොදැක්වූ",
    searchPlaceholder: "හිමිකම් තහඩුව හෝ රක්ෂණ හිමියාගේ විස්තර සොයන්න...",
    noClaimsFound: "ක්‍රියාකාරී හිමිකම් කිසිවක් හමු නොවීය",
    noClaimsFoundDesc: "සක්‍රීය සෙවුම් විමසුම් හෝ පෙරහන් යටතේ ඔබට පවරා ඇති හිමිකම් කිසිවක් අපට සොයාගත නොහැකි විය.",
    claimInfo: "හිමිකම් තොරතුරු",
    vehicleNo: "වාහන අංකය",
    damageType: "හානි වර්ගය",
    location: "ස්ථානය",
    policyHolder: "රක්ෂණ හිමියා",
    assessment: "තක්සේරුව",
    status: "තත්ත්වය",
    actions: "ක්‍රියාමාර්ග",
    viewDetails: "විස්තර බලන්න",
    claimNumber: "හිමිකම් අංකය"
  },
  ta: {
    title: "எனக்கு ஒதுக்கப்பட்ட கோரிக்கைகள்",
    subtitle: "நிகழ்நேர ஆய்வு அடைவு மற்றும் மதிப்பீட்டு உருவாக்க மையம்",
    all: "அனைத்தும்",
    urgent: "அவசரம்",
    new: "புதியது",
    pending: "நிலுவையில்",
    searchPlaceholder: "கோரிக்கை வாகன எண் அல்லது காப்பீட்டாளர் விவரங்களைத் தேடுக...",
    noClaimsFound: "செயலில் உள்ள கோரிக்கைகள் எதுவும் இல்லை",
    noClaimsFoundDesc: "செயலில் உள்ள தேடல் வினவல்கள் அல்லது வடிப்பான்களின் கீழ் உங்களுக்கு ஒதுக்கப்பட்ட எந்தவொரு கோரிக்கையையும் எங்களால் கண்டறிய முடியவில்லை.",
    claimInfo: "கோரிக்கை விவரம்",
    vehicleNo: "வாகன எண்",
    damageType: "சேத வகை",
    location: "இடம்",
    policyHolder: "காப்பீட்டாளர்",
    assessment: "மதிப்பீடு",
    status: "நிலை",
    actions: "நடவடிக்கைகள்",
    viewDetails: "விவரங்களைப் பார்க்க",
    claimNumber: "கோரிக்கை எண்"
  }
};

export default function AgentMyClaims() {
  const [lang, setLang] = useState<"en" | "si" | "ta">("en");
  const router = useRouter();
  const [agentName, setAgentName] = useState("");
  const [agentEmail, setAgentEmail] = useState("");
  const [claims, setClaims] = useState<Claim[]>([]);
  const [filteredClaims, setFilteredClaims] = useState<Claim[]>([]);

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
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "urgent" | "new" | "pending">("all");

  // Selected claim modal states
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [activeSubModal, setActiveSubModal] = useState<"documents" | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [policyHolders, setPolicyHolders] = useState<any[]>([]);
  const [assessmentAmount, setAssessmentAmount] = useState<string>("");
  const [inspectionReportText, setInspectionReportText] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isAcceptingClaim, setIsAcceptingClaim] = useState(false);
  const [showMobileRedirect, setShowMobileRedirect] = useState(false);

  // Document upload states
  const [agentUploadFile, setAgentUploadFile] = useState<File | null>(null);
  const [agentUploadPreview, setAgentUploadPreview] = useState<string | null>(null);
  const [agentUploadDocName, setAgentUploadDocName] = useState<string>("Repair Estimate");
  const [isAgentUploading, setIsAgentUploading] = useState(false);
  const agentFileInputRef = useRef<HTMLInputElement>(null);

  // Chat panel state (within modal)
  const [chatMessage, setChatMessage] = useState("");
  const [chatLogs, setChatLogs] = useState<{ sender: string; text: string }[]>([]);

  // Fetch claims from API
  const fetchClaims = async (email: string, showLoading: boolean = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch(`${API_URL}/agent/claims?email=${email}`);
      if (!res.ok) throw new Error("Failed to fetch claims");
      const data = await res.json();
      const active = (data || []).filter((c: Claim) => c.status !== "Approved" && c.status !== "Rejected" && !c.inspectionSubmitted);
      setClaims(active);
    } catch (e) {
      console.error("Fetch agent claims error:", e);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Poll claims status in background
  useEffect(() => {
    if (!agentEmail) return;
    const interval = setInterval(() => {
      fetchClaims(agentEmail, false);
    }, 5000);
    return () => clearInterval(interval);
  }, [agentEmail]);

  // Keep selectedClaim in sync with claims list updates
  useEffect(() => {
    if (selectedClaim) {
      const updated = claims.find(c => c._id === selectedClaim._id || c.claimNumber === selectedClaim.claimNumber);
      if (updated) {
        if (JSON.stringify(updated) !== JSON.stringify(selectedClaim)) {
          setSelectedClaim(updated);
        }
      }
    }
  }, [claims, selectedClaim]);

  const fetchPolicyHolders = async (branchName: string) => {
    try {
      const phRes = await fetch(`${API_URL}/office-staff/policy-holders?branch=${encodeURIComponent(branchName.trim())}`);
      const regsRes = await fetch(`${API_URL}/office-staff/registrations?branch=${encodeURIComponent(branchName.trim())}`);
      let allUsers: any[] = [];
      if (phRes.ok) {
        const phData = await phRes.json();
        allUsers = [...allUsers, ...(phData.policyHolders || [])];
      }
      if (regsRes.ok) {
        const regsData = await regsRes.json();
        allUsers = [...allUsers, ...(regsData.registrations || [])];
      }
      setPolicyHolders(allUsers);
    } catch (e) {
      console.error("Error fetching branch policy holders:", e);
    }
  };

  const getPolicyHolderName = (nic: string) => {
    if (!nic) return "-";
    const user = policyHolders.find(u => u.nic && typeof u.nic === "string" && u.nic.toLowerCase().trim() === nic.toLowerCase().trim());
    return user ? `${user.firstName} ${user.lastName}` : "Unknown Policy Holder";
  };

  const getPolicyHolderContact = (nic: string) => {
    if (!nic) return "-";
    const user = policyHolders.find(u => u.nic && typeof u.nic === "string" && u.nic.toLowerCase().trim() === nic.toLowerCase().trim());
    return user ? user.mobile : "No Contact Info";
  };

  const getPolicyHolderEmail = (nic: string) => {
    if (!nic) return "-";
    const user = policyHolders.find(u => u.nic && typeof u.nic === "string" && u.nic.toLowerCase().trim() === nic.toLowerCase().trim());
    return user ? user.email : "-";
  };

  const formatPlate = (plate: string) => {
    if (!plate) return "-";
    const cleaned = plate.trim();
    if (cleaned.includes("-")) return cleaned.toUpperCase();
    const m = cleaned.match(/^(.*[A-Za-z]+)(\d+)$/);
    if (m) return `${m[1].trim().toUpperCase()} - ${m[2]}`;
    return cleaned.toUpperCase();
  };

  // Initial load checks
  useEffect(() => {
    const agentData = sessionStorage.getItem("logged_in_agent");
    if (!agentData) {
      router.push("/Login");
      return;
    }
    try {
      const parsed = JSON.parse(agentData);
      if (parsed.name) setAgentName(parsed.name);
      if (parsed.email) {
        setAgentEmail(parsed.email);
        fetchClaims(parsed.email);
        if (parsed.branch) {
          fetchPolicyHolders(parsed.branch);
        }
      }
    } catch (e) {
      console.error("Error parsing logged_in_agent session", e);
      router.push("/Login");
    }
  }, []);

  // Update assessment text fields when selected claim changes
  useEffect(() => {
    if (selectedClaim) {
      setAssessmentAmount(selectedClaim.amount ? String(selectedClaim.amount) : "");
      setInspectionReportText(selectedClaim.inspectionReport || "");
    }
  }, [selectedClaim]);

  // Lock background scroll when selected claim modal or previewImage is open
  useEffect(() => {
    if (selectedClaim || previewImage) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedClaim, previewImage]);

  // Derived severity from damage type fallback
  const getSeverity = (claim: Claim): "Urgent" | "Medium" | "Low" => {
    if (claim.severity) return claim.severity;
    if (claim.priority === "Urgent") return "Urgent";
    const type = (claim.damageType || "").toLowerCase();
    if (type.includes("fire")) return "Urgent";
    if (type.includes("accident") || type.includes("crash")) return "Medium";
    return "Low";
  };

  // Determine claim weights for sorting: Urgent (1) > New (2) > Pending (3) > Finalized (4)
  const getSortWeight = (claim: Claim): number => {
    const severity = getSeverity(claim);
    if (severity === "Urgent") return 1;

    const isNew = claim.status === "Pending" && claim.currentStep === 2;
    if (isNew) return 2;

    const isPending = claim.status === "In Progress" || claim.currentStep === 3 || claim.status === "Pending";
    if (isPending) return 3;

    return 4;
  };

  // Sorting and filtering logic
  useEffect(() => {
    let result = [...claims];

    // 1. Sort claims based on priority weight, then by date descending
    result.sort((a, b) => {
      const weightA = getSortWeight(a);
      const weightB = getSortWeight(b);
      if (weightA !== weightB) {
        return weightA - weightB;
      }
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    // 2. Filter by Tab
    if (activeTab === "urgent") {
      result = result.filter(c => getSeverity(c) === "Urgent");
    } else if (activeTab === "new") {
      result = result.filter(c => c.status === "Pending" && c.currentStep === 2);
    } else if (activeTab === "pending") {
      result = result.filter(c => c.status === "In Progress" || c.currentStep === 3);
    }

    // 3. Filter by Search Query
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        c =>
          c.claimNumber.toLowerCase().includes(q) ||
          c.vehiclePlate.toLowerCase().includes(q) ||
          c.userNic.toLowerCase().includes(q) ||
          c.damageType.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q)
      );
    }

    setFilteredClaims(result);
  }, [claims, activeTab, searchQuery]);

  // File Upload Helper
  const handleFileChange = (file: File | null) => {
    if (agentUploadPreview) {
      URL.revokeObjectURL(agentUploadPreview);
    }
    setAgentUploadFile(file);
    if (file) {
      setAgentUploadPreview(URL.createObjectURL(file));
    } else {
      setAgentUploadPreview(null);
    }
  };

  // Handler functions duplicate from Dashboard
  const handleAcceptClaim = async (claimId: string) => {
    try {
      setIsAcceptingClaim(true);
      const res = await fetch(`${API_URL}/agent/claims/${claimId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acceptClaim: true })
      });
      if (!res.ok) {
        alert("Failed to accept claim.");
        return;
      }
      setShowMobileRedirect(true);
      // Refresh claims list
      await fetchClaims(agentEmail);
      // Refresh selectedClaim
      const updatedRes = await fetch(`${API_URL}/agent/claims?email=${agentEmail}`);
      if (updatedRes.ok) {
        const data = await updatedRes.json();
        const freshClaim = data.find((c: Claim) => c._id === claimId);
        if (freshClaim) setSelectedClaim(freshClaim);
      }
    } catch (e) {
      console.error("Accept claim error:", e);
      alert("Error accepting claim.");
    } finally {
      setIsAcceptingClaim(false);
    }
  };

  const handleDeclineClaim = async (claimId: string, claimNumber: string) => {
    try {
      setIsAcceptingClaim(true);
      const res = await fetch(`${API_URL}/office-staff/claims/${claimNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Rejected",
          currentStep: 5,
          rejectionReason: "Rejected by Agent",
          messageText: "Claim rejected by Agent.",
          messageRecipient: "Office Staff",
          messageSender: "Agent"
        })
      });
      if (!res.ok) {
        alert("Failed to decline claim.");
        return;
      }
      alert("Claim assignment declined.");
      await fetchClaims(agentEmail);
      setSelectedClaim(null);
    } catch (e) {
      console.error("Decline claim error:", e);
      alert("Error declining claim.");
    } finally {
      setIsAcceptingClaim(false);
    }
  };

  const handleSubmitInspectionReport = async (claimId: string) => {
    try {
      if (!inspectionReportText.trim()) {
        alert("Please enter inspection report details.");
        return;
      }
      setIsSubmittingReport(true);
      const res = await fetch(`${API_URL}/agent/claims/${claimId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inspectionReport: inspectionReportText.trim(),
          inspectionSubmitted: true,
          status: "In Progress"
        })
      });
      if (!res.ok) {
        alert("Failed to submit inspection report.");
        return;
      }
      alert("Inspection report submitted successfully!");
      setSelectedClaim(null);
      router.push("/Agent/MyActivity");
      setInspectionReportText("");
    } catch (e) {
      console.error("Submit inspection report error:", e);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleAgentUpload = async () => {
    if (!selectedClaim || !agentUploadFile) return;
    setIsAgentUploading(true);
    try {
      const convertToBase64 = (file: File): Promise<string> => {
        return compressImage(file);
      };
      const base64 = await convertToBase64(agentUploadFile);
      const res = await fetch(`${API_URL}/policy-holder/update-claim/${selectedClaim.claimNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadedDocuments: [
            {
              documentName: agentUploadDocName,
              fileData: base64,
              uploadedBy: "Agent"
            }
          ]
        })
      });
      if (res.ok) {
        alert("Document uploaded successfully!");
        handleFileChange(null);
        await fetchClaims(agentEmail);
        const updatedRes = await fetch(`${API_URL}/agent/claims?email=${agentEmail}`);
        if (updatedRes.ok) {
          const data = await updatedRes.json();
          const freshClaim = data.find((c: Claim) => c.claimNumber === selectedClaim.claimNumber);
          if (freshClaim) setSelectedClaim(freshClaim);
        }
      } else {
        const data = await res.json();
        alert(data.error || "Failed to upload document.");
      }
    } catch (e) {
      console.error("Agent document upload error:", e);
      alert("An error occurred during upload.");
    } finally {
      setIsAgentUploading(false);
    }
  };

  const handleApproveAssessment = async (claimId: string) => {
    try {
      const numAmount = parseFloat(assessmentAmount);
      if (isNaN(numAmount) || numAmount <= 0) {
        alert("Please enter a valid assessment amount.");
        return;
      }

      const res = await fetch(`${API_URL}/agent/claims/${claimId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Approved", amount: numAmount })
      });
      if (!res.ok) {
        alert("Failed to update claim assessment status.");
        return;
      }
      alert("Assessment approved and status updated to Approved!");
      setSelectedClaim(null);
      fetchClaims(agentEmail);
    } catch (e) {
      console.error("Approve assessment status error:", e);
      alert("Error sending update request.");
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const newLogs = [...chatLogs, { sender: "Agent (You)", text: chatMessage }];
    setChatLogs(newLogs);
    setChatMessage("");

    setTimeout(() => {
      setChatLogs(prev => [
        ...prev,
        { sender: "Support Staff", text: "We have received your message. An agent support officer will connect shortly." }
      ]);
    }, 1500);
  };

  const getRecipientForDoc = (claim: Claim, name: string) => {
    const msg = [...(claim.messages || [])]
      .reverse()
      .find(m => m.message.includes(`Requested: ${name}`));
    if (msg) {
      if (msg.message.includes("[Document Request to Agent]")) return "Agent";
      if (msg.message.includes("[Document Request to User]")) return "User";
    }
    return claim.documentRequestTo || "User";
  };

  const getDocDetails = (claim: Claim, name: string, status: "Pending" | "Submitted") => {
    let requestedAt = "";
    let submittedAt = "";
    let sender = "Office Staff";

    const msg = [...(claim.messages || [])]
      .reverse()
      .find(m => m.message.includes(`Requested: ${name}`));
    if (msg) {
      requestedAt = formatDate(msg.sentAt);
      sender = msg.sender || "Office Staff";
    } else {
      requestedAt = formatDate(claim.createdAt);
    }

    if (status === "Submitted") {
      const doc = (claim.additionalDocuments || []).find(
        d => d.name.trim().toLowerCase() === name.trim().toLowerCase()
      );
      if (doc && doc.uploadedAt) {
        submittedAt = formatDate(doc.uploadedAt);
      }
    }

    return { requestedAt, submittedAt, sender };
  };

  const formatDate = (dateStr?: string | Date): string => {
    if (!dateStr) return "Today";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
      return String(dateStr);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col font-sans antialiased relative">
      <Navbar />

      {/* Styled curved header matching mockup */}
      <div className="max-w-7xl w-full mx-auto px-6 md:px-16 mt-8 relative">
        <div className="absolute top-0 bottom-0 left-[calc(50%-50vw)] right-6 md:right-12 bg-[url('/newclaim1.webp')] bg-cover bg-center rounded-r-[75px] md:rounded-r-[95px] overflow-hidden shadow-md">
          {/* Mockup dark slate overlay */}
          <div className="absolute inset-0 bg-slate-900/35" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-transparent" />
        </div>

        {/* Text content */}
        <header className="relative z-10 h-[210px] flex flex-col justify-center pl-4 md:pl-8 select-none">
          <h1 className="text-white text-3xl md:text-[40px] font-bold tracking-tight leading-none">
            {t.title}
          </h1>
          <p className="text-slate-200 text-xs md:text-sm font-semibold mt-3.5 tracking-wide opacity-95">
            {t.subtitle}
          </p>
        </header>
      </div>

      {/* Search and Tab Filters Section */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 md:px-16 py-10 relative z-20 flex flex-col gap-8">
        
        {/* Horizontal Top Controls Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2 select-none">
          {/* Search Input */}
          <div className="relative w-full max-w-[420px] bg-slate-50 hover:bg-white focus-within:bg-white border border-slate-200 rounded-full pl-5 pr-2.5 py-2 flex items-center gap-3 transition-all duration-200 shadow-sm focus-within:shadow-md focus-within:border-cyan-500 focus-within:ring-4 focus-within:ring-cyan-500/10">
            <span className="text-slate-400 flex items-center justify-center">
              <HugeiconsIcon icon={Search01Icon} className="w-5 h-5" strokeWidth={2.5} />
            </span>
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-slate-800 text-[15px] placeholder-slate-400 focus:outline-none font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer p-1"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={2.5} />
              </button>
            )}
            <button
              type="button"
              className="bg-cyan-600 hover:bg-cyan-700 active:scale-95 text-white py-2 px-5 rounded-full text-xs font-bold transition-all duration-150 border-none cursor-pointer flex items-center justify-center shadow-md"
            >
              {lang === "en" ? "Search" : lang === "si" ? "සොයන්න" : "தேடுக"}
            </button>
          </div>
        </div>

        {/* Tab Filters row */}
        <div className="flex flex-wrap gap-2.5 mb-8 border-b border-slate-100 pb-5 select-none">
          <button
            onClick={() => setActiveTab("all")}
            className={`font-bold text-sm px-6 py-3 rounded-full border border-solid transition-all cursor-pointer ${
              activeTab === "all"
                ? "bg-[#000080] border-[#0f2d3a] text-white shadow-sm"
                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600"
            }`}
          >
            {t.all} ({claims.length})
          </button>
          <button
            onClick={() => setActiveTab("urgent")}
            className={`font-bold text-sm px-6 py-3 rounded-full border border-solid transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "urgent"
                ? "bg-red-500 border-red-500 text-white shadow-sm"
                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600"
            }`}
          >
            {t.urgent}
            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
              activeTab === "urgent" ? "bg-white/20 text-white" : "bg-red-550 text-white"
            }`}>
              {claims.filter(c => getSeverity(c) === "Urgent").length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("new")}
            className={`font-bold text-sm px-6 py-3 rounded-full border border-solid transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "new"
                ? "bg-amber-500 border-amber-500 text-white shadow-sm"
                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600"
            }`}
          >
            {t.new}
            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
              activeTab === "new" ? "bg-white/20 text-white" : "bg-amber-500 text-white"
            }`}>
              {claims.filter(c => c.status === "Pending" && c.currentStep === 2).length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={`font-bold text-sm px-6 py-3 rounded-full border border-solid transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "pending"
                ? "bg-cyan-600 border-cyan-600 text-white shadow-sm"
                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600"
            }`}
          >
            {t.pending}
            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
              activeTab === "pending" ? "bg-white/20 text-white" : "bg-cyan-600 text-white"
            }`}>
              {claims.filter(c => c.status === "In Progress" || c.currentStep === 3).length}
            </span>
          </button>
        </div>

        {/* Claims List container */}
        <div className="flex flex-col gap-5">
          {loading ? (
            <div className="bg-white border border-slate-200 rounded-[28px] p-16 flex flex-col items-center justify-center text-center shadow-sm min-h-[300px]">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
              <span className="mt-3 text-slate-400 text-sm font-bold">{lang === "en" ? "Syncing cases with Sanasa Database..." : lang === "si" ? "සනස දත්ත සමුදාය සමඟ සමමුහුර්ත වෙමින්..." : "சனச தரவுத்தளத்துடன் ஒத்திசைக்கிறது..."}</span>
            </div>
          ) : filteredClaims.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-[30px] p-16 text-center shadow-sm select-none">
              <HugeiconsIcon icon={File01Icon} className="w-12 h-12 text-slate-300 mx-auto mb-4" strokeWidth={1.8} />
              <p className="text-slate-500 font-bold text-sm uppercase tracking-wider">{t.noClaimsFound}</p>
              <p className="text-slate-400 text-xs mt-1.5 font-semibold">{t.noClaimsFoundDesc}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4.5">
              {filteredClaims.map((claim) => {
                const severity = getSeverity(claim);
                const isUrgent = severity === "Urgent";
                const isNew = claim.status === "Pending" && claim.currentStep === 2;
                const isFinalized = claim.status === "Approved" || claim.status === "Rejected";

                // Visual design borders & labels based on claim priority
                let borderLeft = "border-l-[6px] border-l-cyan-500";
                let badgeStyle = "bg-cyan-50 text-cyan-700 border-cyan-200";
                let badgeLabel = "Pending Case";

                if (isUrgent) {
                  borderLeft = "border-l-[6px] border-l-red-500";
                  badgeStyle = "bg-red-50 text-red-600 border-red-200";
                  badgeLabel = "Urgent Alert";
                } else if (isNew) {
                  borderLeft = "border-l-[6px] border-l-amber-500";
                  badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";
                  badgeLabel = "New Assignment";
                } else if (isFinalized) {
                  if (claim.status === "Approved") {
                    borderLeft = "border-l-[6px] border-l-emerald-500";
                    badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
                    badgeLabel = "Approved";
                  } else {
                    borderLeft = "border-l-[6px] border-l-slate-300";
                    badgeStyle = "bg-slate-50 text-slate-500 border-slate-200";
                    badgeLabel = "Rejected";
                  }
                }

                return (
                  <div
                    key={claim._id}
                    className={`relative overflow-hidden bg-white/70 backdrop-blur-sm border border-slate-100 rounded-3xl p-6 pl-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-md hover:border-slate-200 hover:bg-white hover:scale-[1.005] transition-all duration-200 group ${borderLeft}`}
                  >
                    {/* Main content grid */}
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 items-center">
                      
                      {/* Claim Reference & Badges */}
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{t.claimNumber}</span>
                        <div className="text-sm font-semibold text-slate-800 flex items-center gap-2 flex-wrap">
                          {claim.claimNumber}
                          <span className={`text-[9px] font-semibold uppercase px-3 py-1 rounded-full select-none tracking-wide border ${badgeStyle}`}>
                            {badgeLabel}
                          </span>
                        </div>
                      </div>

                      {/* Vehicle Details */}
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{t.vehicleNo}</span>
                        <span className="text-xs font-bold text-slate-700 truncate">
                          {claim.vehiclePlate} {claim.vehicleModel && <span className="font-semibold text-slate-500">({claim.vehicleModel})</span>}
                        </span>
                      </div>

                      {/* Damage Class */}
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{t.damageType}</span>
                        <span className="text-xs font-bold text-slate-700 truncate">{claim.damageType}</span>
                      </div>

                      {/* Incident Location */}
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{t.location}</span>
                        <span className="text-xs font-bold text-slate-700 truncate" title={claim.location}>{claim.location}</span>
                      </div>

                      {/* Date & Progress */}
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{lang === "en" ? "Progress State" : lang === "si" ? "ප්‍රගති තත්ත්වය" : "முன்னேற்ற நிலை"}</span>
                        <span className="text-xs font-bold text-slate-700 truncate">
                          {isFinalized ? (lang === "en" ? "Dossier Closed" : lang === "si" ? "හිමිකම් ලිපිගොනුව වසා ඇත" : "கோப்பு மூடப்பட்டது") : `Step ${claim.currentStep} of 4`} · <span className="text-slate-400 font-semibold">{formatDate(claim.createdAt)}</span>
                        </span>
                      </div>

                    </div>

                    {/* Action button */}
                    <button
                      onClick={() => setSelectedClaim(claim)}
                      className="bg-[#000080] hover:bg-[#00ddff] hover:text-black hover:shadow-md text-white text-xs font-semibold py-3 px-6 rounded-full transition-all cursor-pointer border-none flex-shrink-0 self-start lg:self-center"
                    >
                      {t.viewDetails}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>
      {/* Detailed Claim Modal & Sub-modals (Matching Branch Claims Portal layout) */}
      {selectedClaim && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
          
          {/* SUB-MODAL 1: DOCUMENTS */}
          {activeSubModal === "documents" && (
            <div className="bg-white border border-slate-200 rounded-[32px] w-full max-w-[800px] h-[650px] max-h-[90vh] shadow-2xl flex flex-col relative transition-all duration-300 overflow-hidden">
              {/* Header */}
              <div className="px-8 pt-6 pb-2 select-none bg-white">
                <h2 className="text-[24px] font-semibold text-slate-900 tracking-tight leading-none">
                  Documents - {selectedClaim.claimNumber}
                </h2>
              </div>
              <div className="border-b border-black mx-8 mb-6" />

              {/* Body */}
              <div className="px-8 pb-8 flex-1 overflow-y-auto space-y-6">
                <div className="text-left font-bold text-slate-800 space-y-1.5 text-[13px] select-none leading-relaxed">
                  <p>Vehicle No : <span className="font-medium text-slate-600">{formatPlate(selectedClaim.vehiclePlate)}</span></p>
                </div>

                {/* Categorized Document Lists */}
                <div className="space-y-6">
                  {/* Category 1: Policy Holder Documents */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-200 pb-2 uppercase tracking-wider flex items-center gap-2 select-none">
                      <HugeiconsIcon icon={UserIcon} className="w-4 h-4 text-[#0f2d4a]" strokeWidth={2} />
                      Policy Holder Documents
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(() => {
                        const phDocs: { name: string; url: string }[] = [];
                        
                        // License & Accident Photos
                        const dlFront = selectedClaim.drivingLicense?.front?.[0];
                        const dlRear = selectedClaim.drivingLicense?.rear?.[0];
                        if (dlFront) phDocs.push({ name: "Driving License (Front)", url: dlFront });
                        if (dlRear) phDocs.push({ name: "Driving License (Rear)", url: dlRear });
                        
                        let photoIndex = 1;
                        const fPhotos = selectedClaim.accidentPhotos?.front || [];
                        const rPhotos = selectedClaim.accidentPhotos?.rear || [];
                        const sPhotos = selectedClaim.accidentPhotos?.side || [];
                        
                        fPhotos.forEach((url: string) => {
                          phDocs.push({ name: `Accident Photo ${photoIndex++} (Front)`, url });
                        });
                        rPhotos.forEach((url: string) => {
                          phDocs.push({ name: `Accident Photo ${photoIndex++} (Rear)`, url });
                        });
                        sPhotos.forEach((url: string) => {
                          phDocs.push({ name: `Accident Photo ${photoIndex++} (Side)`, url });
                        });
                        
                        (selectedClaim.additionalDocuments || []).forEach((doc) => {
                          const uploadedBy = doc.uploadedBy || "Policy Holder";
                          if (uploadedBy === "Policy Holder") {
                            phDocs.push({ name: doc.name, url: doc.url });
                          }
                        });

                        if (phDocs.length === 0) {
                          return <p className="text-xs text-slate-400 font-bold italic select-none col-span-2 py-2">No policy holder documents.</p>;
                        }

                        return phDocs.map((doc, idx) => {
                          let docUrl = doc.url;
                          if (docUrl && !docUrl.startsWith("http") && !docUrl.startsWith("data:")) {
                            docUrl = `${API_URL.replace("/api", "")}/uploads/${docUrl}`;
                          }
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setPreviewImage(docUrl || null)}
                              className="bg-white border border-slate-200 hover:bg-slate-50 transition-all p-4 rounded-[15px] flex items-center justify-start gap-3 cursor-pointer outline-none shadow-sm active:scale-98 text-left"
                            >
                              <HugeiconsIcon icon={Image01Icon} className="w-5 h-5 text-slate-600 flex-shrink-0" strokeWidth={2.5} />
                              <span className="text-xs font-bold text-slate-700 truncate">{doc.name}</span>
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Category 2: Agent Documents & Upload Panel */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-200 pb-2 uppercase tracking-wider flex items-center gap-2 select-none">
                      <HugeiconsIcon icon={UserIcon} className="w-4 h-4 text-cyan-600" strokeWidth={2} />
                      Agent Documents
                    </h3>

                    {/* Uploaded Agent Docs List */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(() => {
                        const agentDocs: { name: string; url?: string; textContent?: string }[] = [];
                        
                        if (selectedClaim.inspectionSubmitted && selectedClaim.inspectionReport) {
                          agentDocs.push({
                            name: "Inspection Report (Text)",
                            textContent: selectedClaim.inspectionReport
                          });
                        }

                        (selectedClaim.additionalDocuments || []).forEach((doc) => {
                          const uploadedBy = doc.uploadedBy || "Policy Holder";
                          if (uploadedBy === "Agent") {
                            agentDocs.push({ name: doc.name, url: doc.url });
                          }
                        });

                        if (agentDocs.length === 0) {
                          return <p className="text-xs text-slate-400 font-bold italic select-none col-span-2 py-2">No agent documents uploaded.</p>;
                        }

                        return agentDocs.map((doc, idx) => {
                          if (doc.textContent) {
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  alert(`--- Inspection Report ---\n\n${doc.textContent}`);
                                }}
                                className="bg-white border border-slate-200 hover:bg-slate-50 transition-all p-4 rounded-[15px] flex items-center justify-start gap-3 cursor-pointer outline-none shadow-sm active:scale-98 text-left"
                              >
                                <HugeiconsIcon icon={File01Icon} className="w-5 h-5 text-cyan-600 flex-shrink-0" strokeWidth={2.5} />
                                <span className="text-xs font-bold text-slate-700 truncate">{doc.name}</span>
                              </button>
                            );
                          }
                          let docUrl = doc.url;
                          if (docUrl && !docUrl.startsWith("http") && !docUrl.startsWith("data:")) {
                            docUrl = `${API_URL.replace("/api", "")}/uploads/${docUrl}`;
                          }
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setPreviewImage(docUrl || null)}
                              className="bg-white border border-slate-200 hover:bg-slate-50 transition-all p-4 rounded-[15px] flex items-center justify-start gap-3 cursor-pointer outline-none shadow-sm active:scale-98 text-left"
                            >
                              <HugeiconsIcon icon={Image01Icon} className="w-5 h-5 text-cyan-600 flex-shrink-0" strokeWidth={2.5} />
                              <span className="text-xs font-bold text-slate-700 truncate">{doc.name}</span>
                            </button>
                          );
                        });
                      })()}
                    </div>

                    {/* Agent File Upload Panel */}
                    {selectedClaim.status !== "Approved" && selectedClaim.status !== "Rejected" && (
                      <div className="border-t border-slate-200/60 pt-4 flex flex-col gap-4">
                        <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider select-none">Upload Claim Document</span>
                        
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider select-none">Document Type</label>
                          <div className="flex flex-wrap gap-2">
                            {["Repair Estimate", "Inspection Photos", "Damage Assessment", "Other"].map((type) => {
                              const isSelected = agentUploadDocName === type;
                              return (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => setAgentUploadDocName(type)}
                                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all border cursor-pointer select-none ${
                                    isSelected
                                      ? "bg-red-650 border-red-650 text-white shadow-sm"
                                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                  }`}
                                >
                                  {type}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider select-none">File Attachment</label>
                          
                          <input
                            type="file"
                            ref={agentFileInputRef}
                            accept="image/*,application/pdf"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleFileChange(e.target.files[0]);
                              }
                            }}
                            className="hidden"
                          />

                          {!agentUploadFile ? (
                            <div
                              onClick={() => agentFileInputRef.current?.click()}
                              className="w-full border-2 border-dashed border-slate-300 hover:border-red-500 rounded-2xl py-6 px-4 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-red-50/5 cursor-pointer transition-all duration-150 group"
                            >
                              <HugeiconsIcon icon={Upload01Icon} className="w-8 h-8 text-slate-400 mb-2 group-hover:text-red-500 transition-colors" strokeWidth={1.8} />
                              <span className="text-slate-800 text-[13px] font-bold">Select document file</span>
                              <span className="text-slate-400 text-[10px] font-semibold mt-1">Image or PDF (Max 5MB)</span>
                            </div>
                          ) : (
                            <div className="w-full border-2 border-emerald-500 bg-emerald-50/5 rounded-2xl p-4 flex items-center justify-between relative shadow-sm">
                              <div className="flex items-center gap-3">
                                {agentUploadFile.type.startsWith("image/") && agentUploadPreview ? (
                                  <img
                                    src={agentUploadPreview}
                                    alt="preview"
                                    className="w-12 h-12 rounded-lg object-cover border border-slate-200 shadow-sm"
                                  />
                                ) : (
                                  <div className="w-11 h-11 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-600 flex items-center justify-center">
                                    <HugeiconsIcon icon={File01Icon} className="w-5 h-5" strokeWidth={2.5} />
                                  </div>
                                )}
                                <div className="flex flex-col min-w-0 max-w-[200px] md:max-w-[280px]">
                                  <span className="text-emerald-800 text-[13px] font-bold truncate">
                                    {agentUploadFile.name}
                                  </span>
                                  <span className="text-slate-400 text-[10px] font-semibold mt-0.5">
                                    {(agentUploadFile.size / 1024 / 1024).toFixed(2)} MB
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleFileChange(null)}
                                className="bg-red-550 hover:bg-red-100 text-red-500 border border-red-200 rounded-full p-2 transition-colors cursor-pointer border-none"
                                title="Remove file"
                              >
                                <HugeiconsIcon icon={Delete02Icon} className="w-5 h-5" strokeWidth={2.2} />
                              </button>
                            </div>
                          )}
                        </div>

                        {agentUploadFile && (
                          <button
                            onClick={handleAgentUpload}
                            disabled={isAgentUploading}
                            className="w-full bg-red-650 hover:bg-red-700 text-white font-bold text-xs py-3 px-4 rounded-xl border-none cursor-pointer active:scale-[0.98] transition-all disabled:opacity-50 mt-1 shadow-md flex items-center justify-center gap-2"
                          >
                            {isAgentUploading ? "Uploading..." : "Upload Document to Claim"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-8 py-4 bg-white border-t border-slate-200 flex justify-end flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveSubModal(null)}
                  className="bg-[#000080] hover:bg-[#000066] text-white font-bold text-sm px-6 py-2 rounded-full transition-all border-none cursor-pointer flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,128,0.25)] active:scale-95"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* MAIN DETAILS MODAL */}
          {activeSubModal === null && (
            <div className="bg-white border border-slate-200 rounded-[32px] w-full max-w-[780px] max-h-[90vh] p-8 shadow-2xl relative flex flex-col transition-all duration-300 select-none">
              
              {/* Close Button X */}
              <button
                type="button"
                onClick={() => setSelectedClaim(null)}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-all cursor-pointer border-none bg-transparent"
                title="Close"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={2.5} />
              </button>

              {/* Header: Title, Tags & Avatar */}
              <div className="flex items-start justify-between gap-4">
                <div className="overflow-hidden">
                  <h2 className="font-semibold text-slate-800 text-xl tracking-tight truncate">
                    {getPolicyHolderName(selectedClaim.userNic)}
                  </h2>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="border border-amber-300 text-amber-700 bg-amber-50/50 rounded-lg px-3 py-1 text-[10px] font-semibold uppercase tracking-wider">
                      ID: {selectedClaim.claimNumber}
                    </span>
                    <span className={`border rounded-lg px-3 py-1 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
                      selectedClaim.status.toLowerCase() === "pending"
                        ? "border-amber-300 text-amber-700 bg-amber-50/50"
                        : selectedClaim.status.toLowerCase() === "in progress"
                        ? "border-blue-300 text-blue-700 bg-blue-50/50"
                        : selectedClaim.status.toLowerCase() === "approved"
                        ? "border-emerald-300 text-emerald-700 bg-emerald-50/50"
                        : "border-red-300 text-red-700 bg-red-50/50"
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        selectedClaim.status.toLowerCase() === "pending"
                          ? "bg-amber-500 animate-pulse"
                          : selectedClaim.status.toLowerCase() === "in progress"
                          ? "bg-blue-500"
                          : selectedClaim.status.toLowerCase() === "approved"
                          ? "bg-emerald-500"
                          : "bg-red-500"
                      }`} />
                      {selectedClaim.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-100 my-5" />

              {/* Details Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs md:text-sm font-semibold select-none leading-relaxed flex-1 overflow-y-auto pr-1">
                {/* Column 1: Policy Holder Details */}
                <div className="space-y-3.5 bg-slate-50 border border-slate-200 p-5 rounded-2xl">
                  <h3 className="text-slate-800 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 pb-2 mb-3 flex items-center gap-2">
                    <HugeiconsIcon icon={UserIcon} className="w-4 h-4 text-[#0f2d4a]" strokeWidth={2.5} />
                    Policy Holder Details
                  </h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-[100px_1fr] gap-2">
                      <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Email</span>
                      <span className="text-slate-700 font-semibold truncate">: {getPolicyHolderEmail(selectedClaim.userNic)}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] gap-2">
                      <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">NIC</span>
                      <span className="text-slate-700 font-semibold truncate">: {selectedClaim.userNic}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] gap-2">
                      <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Contact</span>
                      <span className="text-slate-700 font-semibold truncate">: {getPolicyHolderContact(selectedClaim.userNic)}</span>
                    </div>
                  </div>
                </div>

                {/* Column 2: Vehicle Details */}
                <div className="space-y-3.5 bg-slate-50 border border-slate-200 p-5 rounded-2xl">
                  <h3 className="text-slate-800 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 pb-2 mb-3 flex items-center gap-2">
                    <HugeiconsIcon icon={Car01Icon} className="w-4 h-4 text-[#0f2d4a]" strokeWidth={2.5} />
                    Vehicle Details
                  </h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-[100px_1fr] gap-2">
                      <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Vehicle No</span>
                      <span className="text-slate-700 font-semibold truncate">: {formatPlate(selectedClaim.vehiclePlate)}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] gap-2">
                      <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Branch</span>
                      <span className="text-slate-700 font-semibold truncate">: {selectedClaim.branch || "-"}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] gap-2">
                      <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Assigned Agent</span>
                      <span className="text-slate-700 font-semibold truncate">: {agentName || selectedClaim.assignedAgent || "-"}</span>
                    </div>
                  </div>
                </div>

                {/* Large Dedicated Section: Incident Details */}
                <div className="col-span-1 md:col-span-2 space-y-4 bg-slate-50 border border-slate-200 p-6 rounded-2xl">
                  <h3 className="text-slate-800 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 pb-2 mb-3 flex items-center gap-2">
                    <HugeiconsIcon icon={Alert02Icon} className="w-4 h-4 text-red-500" strokeWidth={2.5} />
                    Incident Details & Assessment
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="grid grid-cols-[110px_1fr] gap-2">
                        <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Damage Type</span>
                        <span className="text-slate-700 font-semibold truncate">: {selectedClaim.damageType || "-"}</span>
                      </div>
                      <div className="grid grid-cols-[110px_1fr] gap-2">
                        <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Incident Date</span>
                        <span className="text-slate-700 font-semibold truncate">: {formatDate(selectedClaim.incidentDate)} @ {selectedClaim.incidentTime}</span>
                      </div>
                      <div className="grid grid-cols-[110px_1fr] gap-2">
                        <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Est. Amount</span>
                        <span className="text-slate-700 font-semibold truncate">: {selectedClaim.amount ? `LKR ${selectedClaim.amount.toLocaleString()}` : "Not Assessed"}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-[110px_1fr] gap-2 items-start">
                        <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Location</span>
                        <span className="text-slate-700 font-semibold whitespace-normal break-words leading-relaxed">: {selectedClaim.location || "-"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-3 flex flex-col gap-1">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Incident Description</span>
                    <span className="text-slate-900 font-semibold break-words leading-relaxed whitespace-pre-wrap mt-1">
                      {selectedClaim.description || "No description provided."}
                    </span>
                  </div>

                  {selectedClaim.rejectionReason && (
                    <div className="flex flex-col gap-1 border-t border-slate-200/60 pt-3 mt-3">
                      <span className="text-red-500 font-bold uppercase tracking-wider text-[10px]">Rejection Reason</span>
                      <span className="text-red-650 font-bold mt-1 text-sm">
                        {selectedClaim.rejectionReason}
                      </span>
                    </div>
                  )}

                  {/* Documents & Contact Info Actions Row */}
                  <div className="border-t border-slate-200 pt-4 flex items-center justify-start gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveSubModal("documents")}
                      className="bg-[#000080] hover:bg-[#000066] text-white font-bold text-xs py-3 px-5 rounded-xl cursor-pointer shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      <HugeiconsIcon icon={File01Icon} className="w-4 h-4" strokeWidth={2.5} />
                      Documents ({selectedClaim.additionalDocuments?.length || 0})
                    </button>
                  </div>
                </div>

                {/* Other Vehicles Involved Section */}
                {selectedClaim.otherVehicleDetails && (
                  <div className="col-span-1 md:col-span-2 space-y-4 bg-slate-50 border border-slate-200 p-6 rounded-2xl">
                    <h3 className="text-slate-800 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 pb-2 mb-3 flex items-center gap-2 select-none">
                      <HugeiconsIcon icon={Car01Icon} className="w-4 h-4 text-[#0f2d4a]" strokeWidth={2.5} />
                      Other Vehicles Involved
                    </h3>

                    {Array.isArray(selectedClaim.otherVehicleDetails) ? (
                      selectedClaim.otherVehicleDetails.length === 0 ? (
                        <p className="text-xs text-slate-500 font-bold italic py-2 select-none">
                          No other vehicles were involved in this accident.
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {selectedClaim.otherVehicleDetails.map((vehicle: any, idx: number) => (
                            <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider select-none">
                                Vehicle #{idx + 1} Details
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <div>
                                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] select-none">Vehicle No</span>
                                  <p className="text-slate-800 font-bold mt-0.5">{formatPlate(vehicle.vehiclePlate) || "-"}</p>
                                </div>
                                <div>
                                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] select-none">Driver Name</span>
                                  <p className="text-slate-800 font-bold mt-0.5">{vehicle.driverName || "-"}</p>
                                </div>
                                <div>
                                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] select-none">Insurance Company</span>
                                  <p className="text-slate-800 font-bold mt-0.5">{vehicle.insuranceCompany || "-"}</p>
                                </div>
                                <div>
                                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] select-none">Policy Number</span>
                                  <p className="text-slate-800 font-bold mt-0.5">{vehicle.policyNumber || "-"}</p>
                                </div>
                              </div>

                              {/* License & Vehicle Photos */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                                {vehicle.licensePhotos && vehicle.licensePhotos.length > 0 && (
                                  <div className="space-y-2">
                                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] select-none">License Photos</span>
                                    <div className="flex flex-wrap gap-2">
                                      {vehicle.licensePhotos.map((url: string, pIdx: number) => {
                                        let docUrl = url;
                                        if (docUrl && !docUrl.startsWith("http") && !docUrl.startsWith("data:")) {
                                          docUrl = `${API_URL.replace("/api", "")}/uploads/${docUrl}`;
                                        }
                                        return (
                                          <div
                                            key={pIdx}
                                            onClick={() => setPreviewImage(docUrl || null)}
                                            className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 cursor-pointer shadow-sm hover:shadow active:scale-95 transition-all"
                                          >
                                            <img src={docUrl} className="w-full h-full object-cover" alt="License" />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                                {vehicle.vehiclePhotos && vehicle.vehiclePhotos.length > 0 && (
                                  <div className="space-y-2">
                                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] select-none">Damage Photos</span>
                                    <div className="flex flex-wrap gap-2">
                                      {vehicle.vehiclePhotos.map((url: string, pIdx: number) => {
                                        let docUrl = url;
                                        if (docUrl && !docUrl.startsWith("http") && !docUrl.startsWith("data:")) {
                                          docUrl = `${API_URL.replace("/api", "")}/uploads/${docUrl}`;
                                        }
                                        return (
                                          <div
                                            key={pIdx}
                                            onClick={() => setPreviewImage(docUrl || null)}
                                            className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 cursor-pointer shadow-sm hover:shadow active:scale-95 transition-all"
                                          >
                                            <img src={docUrl} className="w-full h-full object-cover" alt="Damage" />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    ) : (
                      (selectedClaim.otherVehicleDetails.vehiclePlate || selectedClaim.otherVehicleDetails.driverName) && (
                        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] select-none">Vehicle No</span>
                              <p className="text-slate-800 font-bold mt-0.5">{formatPlate(selectedClaim.otherVehicleDetails.vehiclePlate) || "-"}</p>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] select-none">Driver Name</span>
                              <p className="text-slate-800 font-bold mt-0.5">{selectedClaim.otherVehicleDetails.driverName || "-"}</p>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] select-none">Insurance Company</span>
                              <p className="text-slate-800 font-bold mt-0.5">{selectedClaim.otherVehicleDetails.insuranceCompany || "-"}</p>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] select-none">Policy Number</span>
                              <p className="text-slate-800 font-bold mt-0.5">{selectedClaim.otherVehicleDetails.policyNumber || "-"}</p>
                            </div>
                          </div>

                          {/* Photos */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                            {selectedClaim.otherVehicleDetails.licensePhotos && selectedClaim.otherVehicleDetails.licensePhotos.length > 0 && (
                              <div className="space-y-2">
                                <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] select-none">License Photos</span>
                                <div className="flex flex-wrap gap-2">
                                  {selectedClaim.otherVehicleDetails.licensePhotos.map((url: string, pIdx: number) => {
                                    let docUrl = url;
                                    if (docUrl && !docUrl.startsWith("http") && !docUrl.startsWith("data:")) {
                                      docUrl = `${API_URL.replace("/api", "")}/uploads/${docUrl}`;
                                    }
                                    return (
                                      <div
                                        key={pIdx}
                                        onClick={() => setPreviewImage(docUrl || null)}
                                        className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 cursor-pointer shadow-sm hover:shadow active:scale-95 transition-all"
                                      >
                                        <img src={docUrl} className="w-full h-full object-cover" alt="License" />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            {selectedClaim.otherVehicleDetails.vehiclePhotos && selectedClaim.otherVehicleDetails.vehiclePhotos.length > 0 && (
                              <div className="space-y-2">
                                <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] select-none">Damage Photos</span>
                                <div className="flex flex-wrap gap-2">
                                  {selectedClaim.otherVehicleDetails.vehiclePhotos.map((url: string, pIdx: number) => {
                                    let docUrl = url;
                                    if (docUrl && !docUrl.startsWith("http") && !docUrl.startsWith("data:")) {
                                      docUrl = `${API_URL.replace("/api", "")}/uploads/${docUrl}`;
                                    }
                                    return (
                                      <div
                                        key={pIdx}
                                        onClick={() => setPreviewImage(docUrl || null)}
                                        className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 cursor-pointer shadow-sm hover:shadow active:scale-95 transition-all"
                                      >
                                        <img src={docUrl} className="w-full h-full object-cover" alt="Damage" />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* Policy Holder Attachments / Photos Section */}
                {(() => {
                  const attachments: { name: string; url: string }[] = [];
                  
                  const dlFront = selectedClaim.drivingLicense?.front?.[0];
                  const dlRear = selectedClaim.drivingLicense?.rear?.[0];
                  if (dlFront) attachments.push({ name: "License (Front)", url: dlFront });
                  if (dlRear) attachments.push({ name: "License (Rear)", url: dlRear });
                  
                  let photoIndex = 1;
                  const fPhotos = selectedClaim.accidentPhotos?.front || [];
                  const rPhotos = selectedClaim.accidentPhotos?.rear || [];
                  const sPhotos = selectedClaim.accidentPhotos?.side || [];
                  
                  fPhotos.forEach((url: string) => {
                    attachments.push({ name: `Accident Front #${photoIndex++}`, url });
                  });
                  rPhotos.forEach((url: string) => {
                    attachments.push({ name: `Accident Rear #${photoIndex++}`, url });
                  });
                  sPhotos.forEach((url: string) => {
                    attachments.push({ name: `Accident Side #${photoIndex++}`, url });
                  });

                  return (
                    <div className="col-span-1 md:col-span-2 space-y-4 bg-slate-50 border border-slate-200 p-6 rounded-2xl">
                      <h3 className="text-slate-800 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 pb-2 mb-3 flex items-center gap-2">
                        <HugeiconsIcon icon={Image01Icon} className="w-5 h-5 text-[#0f2d4a]" strokeWidth={2.5} />
                        Policy Holder Attachments & Photos
                      </h3>

                      {attachments.length === 0 ? (
                        <p className="text-xs text-slate-500 font-bold italic select-none py-2">
                          No driving license or accident photos attached to this claim dossier.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                          {attachments.map((doc, idx) => {
                            let docUrl = doc.url;
                            if (docUrl && !docUrl.startsWith("http") && !docUrl.startsWith("data:")) {
                              docUrl = `${API_URL.replace("/api", "")}/uploads/${docUrl}`;
                            }
                            return (
                              <div
                                key={idx}
                                onClick={() => setPreviewImage(docUrl || null)}
                                className="group cursor-pointer flex flex-col items-center"
                              >
                                <div className="w-full h-24 rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm group-hover:shadow transition-all relative">
                                  <img
                                    src={docUrl}
                                    alt={doc.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                                  />
                                </div>
                                <span className="text-[9px] text-slate-500 font-semibold text-center mt-2 uppercase tracking-wider truncate w-full px-1">
                                  {doc.name}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}


                {selectedClaim.inspectionSubmitted && selectedClaim.inspectionReport && (
                  <div className="col-span-1 md:col-span-2">
                    {renderPremiumInspectionReport(selectedClaim.inspectionReport)}
                  </div>
                )}

              </div>

              {/* Action Buttons: Accept / Decline */}
              {(selectedClaim.currentStep === 2 || selectedClaim.currentStep === 1) && selectedClaim.status !== "Approved" && selectedClaim.status !== "Rejected" && (
                <div className="flex items-center gap-4 mt-6 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleAcceptClaim(selectedClaim._id)}
                    disabled={isAcceptingClaim}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm py-4 rounded-full flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95 transition-all disabled:opacity-50 border-none"
                  >
                    <HugeiconsIcon icon={Tick01Icon} className="w-5 h-5" strokeWidth={2.5} />
                    Accept Assignment
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeclineClaim(selectedClaim._id, selectedClaim.claimNumber)}
                    disabled={isAcceptingClaim}
                    className="flex-1 bg-red-650 hover:bg-red-750 text-white font-semibold text-sm py-4 rounded-full flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95 transition-all disabled:opacity-50 border-none"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={2.5} />
                    Decline Assignment
                  </button>
                </div>
              )}

              {/* Status Banner for Accepted (In Progress / Approved) Claims */}
              {selectedClaim.currentStep >= 3 && !selectedClaim.inspectionSubmitted && selectedClaim.status !== "Approved" && selectedClaim.status !== "Rejected" && (
                <div className="w-full bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mt-6 text-center select-none transition-all duration-300 flex-shrink-0">
                  <p className="text-emerald-800 text-xs md:text-sm font-semibold flex items-center justify-center gap-2">
                    <HugeiconsIcon icon={SmartPhone01Icon} className="w-5 h-5 animate-pulse" strokeWidth={2.5} />
                    Claim Assignment Accepted
                  </p>
                  <p className="text-emerald-600 text-xs font-semibold mt-2 leading-relaxed">
                    Please open the <strong>Sanasa Agent Mobile App</strong> on your smartphone to complete the physical damage evaluation, snap accident scene/license photos, and submit inspection reports.
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* Preview Image Modal Overlay */}
      {previewImage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm transition-all duration-300">
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl p-2 overflow-hidden shadow-2xl flex flex-col items-center">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 text-white bg-slate-900/60 hover:bg-slate-900 p-2 rounded-full border border-slate-700/50 transition-all select-none cursor-pointer z-10"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={2.5} />
            </button>
            {previewImage.toLowerCase().endsWith(".pdf") ? (
              <iframe src={previewImage} className="w-[80vw] h-[80vh] border-none rounded-xl" title="PDF Document Preview" />
            ) : (
              <img src={previewImage} className="max-w-full max-h-[85vh] object-contain rounded-xl shadow" alt="Document Preview" />
            )}
          </div>
        </div>
      )}

      {/* Styled UI Redirect Modal Overlay */}
      {showMobileRedirect && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-all duration-300">
          <div className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl flex flex-col items-center text-center">
            <button
              onClick={() => setShowMobileRedirect(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-all border-none bg-transparent cursor-pointer"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={2.5} />
            </button>

            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-5 relative">
              <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-emerald-400 opacity-20"></span>
              <HugeiconsIcon icon={SmartPhone01Icon} className="w-8 h-8 relative z-10" strokeWidth={2.2} />
            </div>

            <h3 className="text-slate-900 font-semibold text-xl tracking-tight leading-none">
              Claim Accepted Successfully!
            </h3>
            <p className="text-slate-500 text-xs md:text-sm font-semibold mt-4 leading-relaxed">
              To proceed with the vehicle physical damage inspection, snap photos, and submit reports, please open the **Sanasa Agent Mobile App** on your smartphone.
            </p>

            <div className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl p-4 mt-5 text-left space-y-2.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block select-none">Next Steps:</span>
              <div className="flex gap-2.5 items-start text-xs font-semibold text-slate-700">
                <span className="w-5 h-5 rounded-full bg-[#0f2d4a] text-white flex items-center justify-center font-bold shrink-0 text-[10px] mt-0.5">1</span>
                <span className="leading-relaxed">Launch the Sanasa Agent app on your phone.</span>
              </div>
              <div className="flex gap-2.5 items-start text-xs font-semibold text-slate-700">
                <span className="w-5 h-5 rounded-full bg-[#0f2d4a] text-white flex items-center justify-center font-bold shrink-0 text-[10px] mt-0.5">2</span>
                <span className="leading-relaxed">Go to <strong>Active Claims</strong> tab or notifications.</span>
              </div>
              <div className="flex gap-2.5 items-start text-xs font-semibold text-slate-700">
                <span className="w-5 h-5 rounded-full bg-[#0f2d4a] text-white flex items-center justify-center font-bold shrink-0 text-[10px] mt-0.5">3</span>
                <span className="leading-relaxed">Tap on your newly accepted claim plate number.</span>
              </div>
              <div className="flex gap-2.5 items-start text-xs font-semibold text-slate-700">
                <span className="w-5 h-5 rounded-full bg-[#0f2d4a] text-white flex items-center justify-center font-bold shrink-0 text-[10px] mt-0.5">4</span>
                <span className="leading-relaxed">Submit the inspection details directly.</span>
              </div>
            </div>

            <button
              onClick={() => setShowMobileRedirect(false)}
              className="w-full mt-6 bg-[#0f2d4a] hover:bg-[#193d61] text-white font-bold text-xs py-4 rounded-xl border-none cursor-pointer shadow-md hover:shadow-slate-900/10 active:scale-95 transition-all select-none"
            >
              Okay, Got It
            </button>
          </div>
        </div>
      )}

      
      {/* Floating Chat Bubble Button */}
      <button
        className="fixed bottom-8 right-8 z-40 bg-[#00ddff] hover:bg-[#00c8e6] text-white p-5 rounded-full shadow-2xl transition-all duration-150 hover:scale-110 active:scale-95 cursor-pointer focus:outline-none border-none flex items-center justify-center"
        aria-label="Chat support"
      >
        <HugeiconsIcon icon={BubbleChatIcon} className="w-7 h-7 text-white" strokeWidth={2} />
      </button>

      <Footer />
    </div>
  );
};
