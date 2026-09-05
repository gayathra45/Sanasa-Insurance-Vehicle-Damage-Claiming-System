"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/Components/Agent/Navbar";
import Footer from "@/app/Components/Agent/Footer";
import { API_URL } from "@/app/config";
import { compressImage } from "../../utils/imageCompressor";
import { HugeiconsIcon } from "@hugeicons/react";
import {
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
  Settings02Icon,
  Key01Icon,
  BubbleChatIcon,
  Time02Icon,
} from "@hugeicons/core-free-icons";

interface AdditionalDoc {
  name: string;
  url: string;
  uploadedAt: string;
  uploadedBy?: string;
}

interface ClaimMessage {
  sender: string;
  message: string;
  sentAt: string;
  recipient?: string;
  _id?: string;
}

interface ClaimNote {
  text: string;
  addedBy: string;
  addedAt: string;
  _id?: string;
}

interface Claim {
  _id: string;
  claimNumber: string;
  userNic: string;
  vehiclePlate: string;
  incidentDate: string;
  incidentTime: string;
  damageType: string;
  description: string;
  location: string;
  status: string;
  branch: string;
  assignedAgent: string;
  amount: number | null;
  currentStep: number;
  documentsRequested?: boolean;
  requestedDocuments?: string[];
  documentRequestTo?: string;
  messages: ClaimMessage[];
  additionalDocuments: AdditionalDoc[];
  createdAt: string;
  priority?: string;
  inspectionReport?: string;
  inspectionSubmitted?: boolean;
  paymentReceipt?: string;
  bankName?: string;
  bankBranch?: string;
  bankAccount?: string;
  rejectionReason?: string;
  notes?: ClaimNote[];
  accidentPhotos?: {
    front: string[];
    rear: string[];
    side: string[];
  };
  drivingLicense?: {
    front: string[];
    rear: string[];
  };
  severity?: string;
}

interface PolicyHolder {
  _id: string;
  firstName: string;
  lastName: string;
  nic: string;
  mobile: string;
  email: string;
}

interface Activity {
  id: string;
  type: "upload" | "message" | "claim";
  title: string;
  description: string;
  timestamp: string;
  claimNumber: string;
  vehiclePlate: string;
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
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Raw Inspection Report Text</span>
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
        <HugeiconsIcon icon={Alert02Icon} className="w-4 h-4 text-amber-500 flex-shrink-0" strokeWidth={3} />
      );
    } else if (val === "Major") {
      color = "text-rose-600 bg-rose-50/40 border-rose-200/60";
      icon = (
        <HugeiconsIcon icon={Alert02Icon} className="w-4 h-4 text-rose-500 flex-shrink-0" strokeWidth={3} />
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
            <span className="text-[10px] font-semibold text-slate-400 block mt-1 tracking-wider">OFFICIAL PHYSICAL ASSESSMENT SUMMARY</span>
          </div>
        </div>
        <span className="bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-[10px] font-semibold tracking-wider uppercase px-4 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
          <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4" strokeWidth={2.5} />
          Verified By Agent
        </span>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Odometer */}
        <div className="bg-white border border-slate-150 rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden h-[95px] border-t-4 border-t-blue-500">
          <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest leading-none select-none">Odometer</span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-[17px] font-semibold text-slate-800">{parsed.odometer || "N/A"}</span>
          </div>
          <span className="text-[9px] text-slate-400 font-semibold select-none">Total Distance Travelled</span>
        </div>

        {/* Card 2: Fuel Level */}
        <div className="bg-white border border-slate-150 rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden h-[95px] border-t-4 border-t-indigo-500">
          <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest leading-none select-none">Fuel Level</span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-[17px] font-semibold text-slate-800">{parsed.fuelLevel || "N/A"}</span>
          </div>
          <span className="text-[9px] text-slate-400 font-semibold select-none">Current Tank Level</span>
        </div>

        {/* Card 3: Estimated Cost */}
        <div className="bg-white border border-slate-150 rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden h-[95px] border-t-4 border-t-emerald-500">
          <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest leading-none select-none">Estimated Cost</span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-[17px] font-semibold text-emerald-600">{parsed.estimatedCost || "N/A"}</span>
          </div>
          <span className="text-[9px] text-slate-400 font-semibold select-none">Assessment Valuation</span>
        </div>

        {/* Card 4: Recommendation */}
        <div className="bg-white border border-slate-150 rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden h-[95px] border-t-4 border-t-violet-500">
          <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest leading-none select-none">Recommendation</span>
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
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest block border-b border-slate-100 pb-2.5 mb-3 select-none">Component Damage Checklist</span>
            <div className="space-y-2">
              {Object.entries(parsed.checklist || {}).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                  <span className="text-slate-600 font-semibold text-xs">{key}</span>
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
              <HugeiconsIcon icon={Edit02Icon} className="w-4 h-4 text-slate-500" strokeWidth={2.5} />
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
    headerTitle: "My Activity & Claims",
    headerDesc: "Manage your assigned claim files and review historical assessment timelines",
    profileStatus: "Profile & Status",
    performanceSummary: "Performance Summary",
    quickGuidelines: "Quick Guidelines",
    quickGuidelinesDesc: "Use the status tabs to view files, status, and download documents. Use the detail modal to update claim progress, upload estimates, and chat with office staff.",
    myLastActivity: "My Last Activity",
    claims: "Claims",
    uploads: "Uploads",
    chats: "Chats",
    searchPlaceholder: "Search Claim, Plate, Damage...",
    noClaimsFound: "No Claims Found",
    noClaimsFoundDesc: "We couldn't find any claims assigned to you under active search queries or filters.",
    claimPlate: "Claim / Plate",
    claimInfo: "Claim Info",
    vehicleNo: "Vehicle No",
    damageType: "Damage Type",
    location: "Location",
    policyHolder: "Policy Holder",
    assessment: "Assessment",
    status: "Status",
    actions: "Actions",
    viewDetails: "View Details",
    urgent: "Urgent",
    all: "All",
    pending: "Pending",
    inProgress: "In Progress",
    approved: "Approved",
    rejected: "Rejected",
    completed: "Completed"
  },
  si: {
    headerTitle: "මගේ ක්‍රියාකාරකම් සහ හිමිකම්",
    headerDesc: "ඔබට පවරා ඇති හිමිකම් ගොනු කළමනාකරණය කර පැරණි තක්සේරු කාලසටහන් සමාලෝචනය කරන්න",
    profileStatus: "පැතිකඩ සහ තත්ත්වය",
    performanceSummary: "කාර්ය සාධන සාරාංශය",
    quickGuidelines: "ඉක්මන් මාර්ගෝපදේශ",
    quickGuidelinesDesc: "ලේඛන බැලීමට සහ බාගත කිරීමට තත්ත්ව ටැබ් භාවිතා කරන්න. ප්‍රගතිය යාවත්කාලීන කිරීමට සහ කාර්ය මණ්ඩලය සමඟ කතාබස් කිරීමට විස්තර මොඩලය භාවිතා කරන්න.",
    myLastActivity: "මගේ අවසන් ක්‍රියාකාරකම",
    claims: "හිමිකම්",
    uploads: "උඩුගත කිරීම්",
    chats: "චැට්ස්",
    searchPlaceholder: "හිමිකම්, තහඩුව, හානිය සොයන්න...",
    noClaimsFound: "හිමිකම් හමු නොවීය",
    noClaimsFoundDesc: "සක්‍රීය සෙවුම් විමසුම් හෝ පෙරහන් යටතේ ඔබට පවරා ඇති හිමිකම් කිසිවක් අපට සොයාගත නොහැකි විය.",
    claimPlate: "හිමිකම් / අංක තහඩුව",
    claimInfo: "හිමිකම් තොරතුරු",
    vehicleNo: "වාහන අංකය",
    damageType: "හානි වර්ගය",
    location: "ස්ථානය",
    policyHolder: "රක්ෂණ හිමියා",
    assessment: "තක්සේරුව",
    status: "තත්ත්වය",
    actions: "ක්‍රියාමාර්ග",
    viewDetails: "විස්තර බලන්න",
    urgent: "හදිසි",
    all: "සියල්ල",
    pending: "ප්‍රතිචාර නොදැක්වූ",
    inProgress: "ක්‍රියාත්මක වෙමින්",
    approved: "අනුමතයි",
    rejected: "ප්‍රතික්ෂේපිතයි",
    completed: "නිමකළ"
  },
  ta: {
    headerTitle: "எனது செயல்பாடு & கோரிக்கைகள்",
    headerDesc: "உங்களுக்கு ஒதுக்கப்பட்ட கோப்புப் பதிவுகளை நிர்வகிக்கவும் மற்றும் பழைய மதிப்பீட்டு காலவரிசைகளை மதிப்பாய்வும் செய்ய",
    profileStatus: "சுயவிவரம் மற்றும் நிலை",
    performanceSummary: "செயல்திறன் சுருக்கம்",
    quickGuidelines: "விரைவான வழிகாட்டுதல்கள்",
    quickGuidelinesDesc: "கோப்புகளைப் பார்க்க, தரவிறக்க நிலைத் தாவல்களைப் பயன்படுத்தவும். முன்னேற்றத்தைப் புதுப்பிக்க, ஊழியர்களுடன் உரையாட விவரங்கள் மாதிரியைப் பயன்படுத்தவும்.",
    myLastActivity: "எனது கடைசி செயல்பாடு",
    claims: "கோரிக்கைகள்",
    uploads: "பதிவேற்றங்கள்",
    chats: "அரட்டைகள்",
    searchPlaceholder: "கோரிக்கை, வாகன எண், சேதம் தேடுக...",
    noClaimsFound: "கோரிக்கைகள் எதுவும் இல்லை",
    noClaimsFoundDesc: "செயலில் உள்ள தேடல் வினவல்கள் அல்லது வடிப்பான்களின் கீழ் உங்களுக்கு ஒதுக்கப்பட்ட எந்தவொரு கோரிக்கையையும் எங்களால் கண்டறிய முடியவில்லை.",
    claimPlate: "கோரிக்கை / வாகன எண்",
    claimInfo: "கோரிக்கை விவரம்",
    vehicleNo: "வாகன எண்",
    damageType: "சேத வகை",
    location: "இடம்",
    policyHolder: "காப்பீட்டாளர்",
    assessment: "மதிப்பீடு",
    status: "நிலை",
    actions: "நடவடிக்கைகள்",
    viewDetails: "விவரங்களைப் பார்க்க",
    urgent: "அவசரம்",
    all: "அனைத்தும்",
    pending: "நிலுவையில்",
    inProgress: "செயல்பாட்டில்",
    approved: "அங்கீகரிக்கப்பட்டது",
    rejected: "நிராகரிக்கப்பட்டது",
    completed: "முடிந்தது"
  }
};

export default function AgentActivityPage() {
  const [lang, setLang] = useState<"en" | "si" | "ta">("en");
  const router = useRouter();
  const [agent, setAgent] = useState<any>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [policyHolders, setPolicyHolders] = useState<PolicyHolder[]>([]);

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
  const [availability, setAvailability] = useState<string>("Active");



  // Claims filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Pending" | "In Progress" | "Approved" | "Rejected" | "Completed">("All");
  
  // Interactive detail modals
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [activeSubModal, setActiveSubModal] = useState<"documents" | "contact" | "request_docs" | "add_note" | "update_tracking" | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [updatingClaim, setUpdatingClaim] = useState(false);
  const [newMessageText, setNewMessageText] = useState("");
  const [assessmentAmount, setAssessmentAmount] = useState<string>("");
  const [inspectionReportText, setInspectionReportText] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isAcceptingClaim, setIsAcceptingClaim] = useState(false);
  const [showMobileRedirect, setShowMobileRedirect] = useState(false);
  const [contactRecipient, setContactRecipient] = useState<"Policy Holder" | "Office Staff">("Policy Holder");

  // Document Request states
  interface RequestDocItem {
    recipient: "User" | "Agent";
    docType: string;
    customName: string;
    note: string;
  }
  const [requestItems, setRequestItems] = useState<RequestDocItem[]>([
    { recipient: "User", docType: "NIC Front Page", customName: "", note: "" }
  ]);

  // Agent upload states
  const [agentUploadFile, setAgentUploadFile] = useState<File | null>(null);
  const [agentUploadPreview, setAgentUploadPreview] = useState<string | null>(null);
  const [agentUploadDocName, setAgentUploadDocName] = useState<string>("Repair Estimate");
  const [isAgentUploading, setIsAgentUploading] = useState(false);
  const agentFileInputRef = React.useRef<HTMLInputElement>(null);

  // Logged activities state
  const [loggedActivities, setLoggedActivities] = useState<any[]>([]);
  const [showActivitiesModal, setShowActivitiesModal] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);



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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const agentData = sessionStorage.getItem("logged_in_agent");
      if (!agentData) {
        router.push("/Login");
        return;
      }
      try {
        const parsed = JSON.parse(agentData);
        setAgent(parsed);
        if (parsed.email) {
          fetchClaimsAndStatus(parsed.email, parsed.branch);
        }
      } catch (e) {
        console.error(e);
        router.push("/Login");
      }
    }
  }, [router]);

  // Lock body scroll when selectedClaim modal or previewImage modal is open
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

  const fetchClaimsAndStatus = async (email: string, branchName?: string) => {
    try {
      setLoading(true);
      const claimsRes = await fetch(`${API_URL}/agent/claims?email=${email}`);
      if (claimsRes.ok) {
        const claimsData = await claimsRes.json();
        setClaims(claimsData || []);
      }

      const availabilityRes = await fetch(`${API_URL}/agent/availability?email=${encodeURIComponent(email)}`);
      if (availabilityRes.ok) {
        const availabilityData = await availabilityRes.json();
        if (availabilityData.availability) {
          setAvailability(availabilityData.availability);
        }
      }

      if (branchName) {
        const phRes = await fetch(`${API_URL}/office-staff/policy-holders?branch=${encodeURIComponent(branchName.trim())}`);
        const regsRes = await fetch(`${API_URL}/office-staff/registrations?branch=${encodeURIComponent(branchName.trim())}`);
        let allUsers: PolicyHolder[] = [];
        if (phRes.ok) {
          const phData = await phRes.json();
          allUsers = [...allUsers, ...(phData.policyHolders || [])];
        }
        if (regsRes.ok) {
          const regsData = await regsRes.json();
          allUsers = [...allUsers, ...(regsData.registrations || [])];
        }
        setPolicyHolders(allUsers);
      }
    } catch (err) {
      console.error("Error loading activity details:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailability = async (email: string) => {
    try {
      const res = await fetch(`${API_URL}/agent/availability?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.availability) {
          setAvailability(data.availability);
        }
      }
    } catch (e) {
      console.error("Error polling availability:", e);
    }
  };

  const fetchClaimsData = async (email: string) => {
    try {
      const claimsRes = await fetch(`${API_URL}/agent/claims?email=${email}`);
      if (claimsRes.ok) {
        const claimsData = await claimsRes.json();
        setClaims(claimsData || []);
      }
    } catch (err) {
      console.error("Error background syncing claims:", err);
    }
  };

  // Poll availability and claims status
  useEffect(() => {
    if (!agent || !agent.email) return;
    const interval = setInterval(() => {
      fetchAvailability(agent.email);
      fetchClaimsData(agent.email);
    }, 7000);
    return () => clearInterval(interval);
  }, [agent]);

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

  const getStatusStyle = (status: string, damageType: string = "", priority: string = "") => {
    switch (status.toLowerCase()) {
      case "pending":
        const dmgLower = damageType.toLowerCase();
        const isSevere = (priority && priority.toLowerCase() === "urgent") || dmgLower.includes("fully") || dmgLower.includes("severe") || dmgLower.includes("total") || dmgLower.includes("major") || dmgLower.includes("destruction") || dmgLower.includes("write-off");
        if (isSevere) {
          return "bg-orange-50 text-orange-600 border border-orange-200";
        }
        return "bg-purple-50 text-purple-600 border border-purple-200";
      case "in progress":
        return "bg-blue-50 text-blue-600 border border-blue-200";
      case "approved":
        return "bg-emerald-50 text-emerald-600 border border-emerald-200";
      case "rejected":
        return "bg-red-50 text-red-600 border border-red-200";
      default:
        return "bg-slate-50 text-slate-600 border border-slate-200";
    }
  };

  const getStepperSteps = (claim: Claim) => {
    const isAssigned = claim.currentStep >= 2;
    const isInspection = claim.currentStep >= 3;
    const isReview = claim.currentStep >= 4;
    const isDecision = claim.currentStep >= 5 || claim.status === "Approved" || claim.status === "Rejected";
    const isPayment = claim.currentStep >= 6 || (claim.status === "Approved" && claim.amount !== null);

    return [
      { num: "01", label: "Submitted", active: true },
      { num: "02", label: "Assigned", active: isAssigned },
      { num: "03", label: "Inspection", active: isInspection },
      { num: "04", label: "Review", active: isReview },
      { num: "05", label: "Decision", active: isDecision },
      { num: "06", label: "Payment", active: isPayment },
    ];
  };

  const getStepperPercent = (claim: Claim) => {
    const steps = getStepperSteps(claim);
    const activeCount = steps.filter(s => s.active).length;
    if (activeCount <= 1) return 0;
    return ((activeCount - 1) / 5) * 100;
  };


  const getSeverity = (damageType: string): "Urgent" | "Medium" | "Low" => {
    const type = (damageType || "").toLowerCase();
    if (type.includes("fire")) return "Urgent";
    if (type.includes("accident") || type.includes("crash")) return "Medium";
    return "Low";
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
      return String(dateStr);
    }
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const hours = d.getHours().toString().padStart(2, "0");
      const minutes = d.getMinutes().toString().padStart(2, "0");
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} ${hours}:${minutes}`;
    } catch {
      return String(dateStr);
    }
  };

  const formatMessageTime = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "";
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return "";
    }
  };

  const claimDateString = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${date.getDate().toString().padStart(2, "0")} ${months[date.getMonth()]} ${date.getFullYear()}`;
    } catch (e) {
      return dateStr;
    }
  };


  // Compile timeline activities from claims
  const getCompiledActivities = (): Activity[] => {
    const list: Activity[] = [];

    claims.forEach(claim => {
      // 1. Document Uploads by the agent
      if (claim.additionalDocuments) {
        claim.additionalDocuments.forEach((doc, idx) => {
          if (doc.uploadedBy === "Agent") {
            list.push({
              id: `upload-${claim.claimNumber}-${idx}-${doc.uploadedAt}`,
              type: "upload",
              title: "Document Uploaded",
              description: `Uploaded "${doc.name}" for Claim verification.`,
              timestamp: doc.uploadedAt || claim.createdAt,
              claimNumber: claim.claimNumber,
              vehiclePlate: claim.vehiclePlate
            });
          }
        });
      }

      // 2. Chat messages sent by the agent (excluding automated milestone messages to keep timeline clean)
      if (claim.messages) {
        claim.messages.forEach((msg, idx) => {
          if (msg.sender === "Agent" || msg.sender === "Agent (You)") {
            const msgVal = msg.message || "";
            const isMilestone = 
              typeof msgVal === "string" && (
                msgVal.toLowerCase().includes("accepted the claim") ||
                msgVal.toLowerCase().includes("rejected by agent") ||
                msgVal.toLowerCase().includes("inspection report submitted") ||
                msgVal.toLowerCase().includes("assessment approved for") ||
                msgVal.toLowerCase().includes("claim rejected by agent")
              );

            if (!isMilestone) {
              list.push({
                id: `msg-${claim.claimNumber}-${idx}-${msg.sentAt}`,
                type: "message",
                title: "Message Sent",
                description: `Sent message to Office Staff: "${msgVal}"`,
                timestamp: msg.sentAt,
                claimNumber: claim.claimNumber,
                vehiclePlate: claim.vehiclePlate
              });
            }
          }
        });
      }

      // 3. Initial claim assignment log
      list.push({
        id: `assign-${claim.claimNumber}-${claim.createdAt}`,
        type: "claim",
        title: "Claim Assigned",
        description: `New claim file assigned to you for verification.`,
        timestamp: claim.createdAt,
        claimNumber: claim.claimNumber,
        vehiclePlate: claim.vehiclePlate
      });

      // 4. Claim accepted log
      const acceptMsg = claim.messages?.find(m => {
        const msgVal = m.message || "";
        return typeof msgVal === "string" && (
          msgVal.toLowerCase().includes("accepted the claim") || 
          msgVal.toLowerCase().includes("accepted case")
        );
      });
      if (acceptMsg) {
        list.push({
          id: `accept-${claim.claimNumber}-${acceptMsg.sentAt}`,
          type: "claim",
          title: "Claim Accepted",
          description: `You accepted the claim assignment and started the verification process.`,
          timestamp: acceptMsg.sentAt,
          claimNumber: claim.claimNumber,
          vehiclePlate: claim.vehiclePlate
        });
      } else if (claim.status === "In Progress" || claim.status === "Approved") {
        list.push({
          id: `accept-${claim.claimNumber}-fallback`,
          type: "claim",
          title: "Claim Accepted",
          description: `You accepted the claim assignment and started the verification process.`,
          timestamp: claim.createdAt,
          claimNumber: claim.claimNumber,
          vehiclePlate: claim.vehiclePlate
        });
      }

      // 5. Inspection report submission log
      const inspectMsg = claim.messages?.find(m => {
        const msgVal = m.message || "";
        return typeof msgVal === "string" && msgVal.toLowerCase().includes("inspection report submitted");
      });
      if (inspectMsg) {
        list.push({
          id: `inspect-${claim.claimNumber}-${inspectMsg.sentAt}`,
          type: "claim",
          title: "Inspection Submitted",
          description: `Submitted the physical vehicle inspection report.`,
          timestamp: inspectMsg.sentAt,
          claimNumber: claim.claimNumber,
          vehiclePlate: claim.vehiclePlate
        });
      } else if (claim.inspectionSubmitted) {
        list.push({
          id: `inspect-${claim.claimNumber}-fallback`,
          type: "claim",
          title: "Inspection Submitted",
          description: `Submitted the physical vehicle inspection report.`,
          timestamp: claim.createdAt,
          claimNumber: claim.claimNumber,
          vehiclePlate: claim.vehiclePlate
        });
      }

      // 6. Claim approved log
      const approveMsg = claim.messages?.find(m => {
        const msgVal = m.message || "";
        return typeof msgVal === "string" && (
          msgVal.toLowerCase().includes("approved for lkr") || 
          msgVal.toLowerCase().includes("assessment approved")
        );
      });
      if (approveMsg) {
        list.push({
          id: `approve-${claim.claimNumber}-${approveMsg.sentAt}`,
          type: "claim",
          title: "Claim Approved",
          description: `Approved the claim assessment for LKR ${claim.amount?.toLocaleString() || "0"}.`,
          timestamp: approveMsg.sentAt,
          claimNumber: claim.claimNumber,
          vehiclePlate: claim.vehiclePlate
        });
      } else if (claim.status === "Approved") {
        list.push({
          id: `approve-${claim.claimNumber}-fallback`,
          type: "claim",
          title: "Claim Approved",
          description: `Approved the claim assessment for LKR ${claim.amount?.toLocaleString() || "0"}.`,
          timestamp: claim.createdAt,
          claimNumber: claim.claimNumber,
          vehiclePlate: claim.vehiclePlate
        });
      }

      // 7. Claim rejected log
      const rejectMsg = claim.messages?.find(m => {
        const msgVal = m.message || "";
        return typeof msgVal === "string" && (
          msgVal.toLowerCase().includes("claim rejected") || 
          msgVal.toLowerCase().includes("rejected by agent")
        );
      });
      if (rejectMsg) {
        list.push({
          id: `reject-${claim.claimNumber}-${rejectMsg.sentAt}`,
          type: "claim",
          title: "Claim Rejected",
          description: `Declined case assignment. Reason: ${claim.rejectionReason || "Rejected by agent"}.`,
          timestamp: rejectMsg.sentAt,
          claimNumber: claim.claimNumber,
          vehiclePlate: claim.vehiclePlate
        });
      } else if (claim.status === "Rejected") {
        list.push({
          id: `reject-${claim.claimNumber}-fallback`,
          type: "claim",
          title: "Claim Rejected",
          description: `Declined case assignment. Reason: ${claim.rejectionReason || "Rejected by agent"}.`,
          timestamp: claim.createdAt,
          claimNumber: claim.claimNumber,
          vehiclePlate: claim.vehiclePlate
        });
      }
    });

    // Sort by timestamp descending
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const allActivities = getCompiledActivities();

  // Filter claims based on status and search query
  const filteredClaims = claims.filter(c => {
    let matchesStatus = false;
    if (statusFilter === "All") {
      matchesStatus = true;
    } else if (statusFilter === "Completed") {
      matchesStatus = c.status === "Approved" || c.status === "Rejected";
    } else {
      matchesStatus = c.status === statusFilter;
    }
    const matchesSearch =
      (c.claimNumber || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.vehiclePlate || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.damageType || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleUpdateClaim = async (
    claimNumber: string,
    updates: Partial<Claim> & { 
      messageText?: string; 
      messageTexts?: { message: string; recipient: string }[];
      messageRecipient?: string; 
      noteText?: string; 
      documentRequestTo?: string; 
    }
  ) => {
    try {
      setUpdatingClaim(true);
      const res = await fetch(`${API_URL}/office-staff/claims/${claimNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...updates,
          messageSender: "Agent"
        })
      });
      if (!res.ok) throw new Error("Failed to update claim details.");
      const data = await res.json();

      setClaims(prev => prev.map(c => c.claimNumber === claimNumber ? data.claim : c));
      setSelectedClaim(data.claim);
      setNewMessageText("");
    } catch (err: any) {
      alert(err.message || "Failed to update claim details.");
    } finally {
      setUpdatingClaim(false);
    }
  };

  const handleAcceptClaim = async (claimNumber: string) => {
    try {
      setIsAcceptingClaim(true);
      await handleUpdateClaim(claimNumber, {
        status: "In Progress",
        currentStep: 3,
        messageText: "Agent accepted the claim assignment.",
        messageRecipient: "Office Staff"
      });
      setShowMobileRedirect(true);
    } catch (e) {
      console.error(e);
      alert("Error accepting claim.");
    } finally {
      setIsAcceptingClaim(false);
    }
  };

  const handleDeclineClaim = async (claimNumber: string) => {
    try {
      setIsAcceptingClaim(true);
      await handleUpdateClaim(claimNumber, {
        status: "Rejected",
        currentStep: 5,
        rejectionReason: "Rejected by Agent",
        messageText: "Claim rejected by Agent.",
        messageRecipient: "Office Staff"
      });
      alert("Claim rejected successfully!");
    } catch (e) {
      console.error(e);
      alert("Error rejecting claim.");
    } finally {
      setIsAcceptingClaim(false);
    }
  };

  const handleSubmitInspectionReport = async (claimNumber: string) => {
    try {
      if (!inspectionReportText.trim()) {
        alert("Please enter inspection report details.");
        return;
      }
      setIsSubmittingReport(true);
      await handleUpdateClaim(claimNumber, {
        inspectionReport: inspectionReportText.trim(),
        inspectionSubmitted: true,
        status: "In Progress",
        messageText: "Vehicle inspection report submitted by Agent.",
        messageRecipient: "Office Staff"
      });
      alert("Inspection report submitted successfully!");
      setInspectionReportText("");
    } catch (e) {
      console.error(e);
      alert("Error submitting inspection report.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleApproveAssessment = async (claimNumber: string) => {
    try {
      const numAmount = parseFloat(assessmentAmount);
      if (isNaN(numAmount) || numAmount <= 0) {
        alert("Please enter a valid assessment amount.");
        return;
      }
      await handleUpdateClaim(claimNumber, {
        status: "Approved",
        amount: numAmount,
        currentStep: 6,
        messageText: `Claim assessment approved for LKR ${numAmount.toLocaleString()} by Agent.`,
        messageRecipient: "Office Staff"
      });
      alert("Assessment approved and claim status updated to Approved!");
    } catch (e) {
      console.error(e);
      alert("Error approving assessment.");
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
        const data = await res.json();
        alert("Document uploaded successfully!");
        handleFileChange(null);
        
        // Refresh local state with updated claim
        setClaims(prev => prev.map(c => c.claimNumber === selectedClaim.claimNumber ? data.claim : c));
        setSelectedClaim(data.claim);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to upload document.");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred during upload.");
    } finally {
      setIsAgentUploading(false);
    }
  };

  const fetchAndShowLastActivities = async () => {
    if (!agent || !agent.email) return;
    try {
      setLoadingActivities(true);
      setShowActivitiesModal(true);
      const res = await fetch(`${API_URL}/agent/activities?email=${encodeURIComponent(agent.email)}`);
      if (res.ok) {
        const data = await res.json();
        setLoggedActivities(data);
      } else {
        console.error("Failed to fetch activities");
      }
    } catch (e) {
      console.error("Error fetching activities", e);
    } finally {
      setLoadingActivities(false);
    }
  };

  // Calculate statistics
  const totalUploads = allActivities.filter(a => a.type === "upload").length;
  const totalMessages = allActivities.filter(a => a.type === "message").length;
  const totalAssigned = claims.length;

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
          <h1 className="text-white text-3xl md:text-[40px] font-semibold tracking-tight leading-none">
            {t.headerTitle}
          </h1>
          <p className="text-slate-200 text-xs md:text-sm font-semibold mt-3.5 tracking-wide opacity-95">
            {t.headerDesc}
          </p>
        </header>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 md:px-16 py-10 relative z-20 flex flex-col gap-8">
        
        {/* Top Overview Cards Grid - 2 Columns (Matching Policy Holder Layout) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 select-none">
          
          {/* Card 1: Profile & Status */}
          <div className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-sm flex flex-col justify-between min-h-[150px] hover:shadow-md hover:border-slate-300 transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">{t.profileStatus}</span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold ${
                availability === "Offline"
                  ? "bg-rose-50 text-rose-700 border border-rose-200/60"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  availability === "Offline" ? "bg-rose-500" : "bg-emerald-500 animate-pulse"
                }`} />
                {availability === "Offline" ? "Offline Status" : "Active Evaluator"}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200/70 border border-slate-200 flex items-center justify-center text-slate-600 font-semibold shrink-0 shadow-inner">
                <HugeiconsIcon icon={UserIcon} className="w-6 h-6 text-slate-600" strokeWidth={1.8} />
              </div>
              <div className="overflow-hidden">
                <span className="block font-semibold text-slate-800 text-base truncate">
                  {agent?.name || "Insurance Agent"}
                </span>
                <span className="inline-block bg-slate-100 text-slate-600 text-[11px] font-semibold px-2.5 py-0.5 rounded-md mt-1">
                  ID: {agent?.agentId || "AGT-2026"}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Performance Summary (Clean Common White Design Matching Policy Holder) */}
          <div className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-sm flex flex-col justify-between min-h-[150px] hover:shadow-md hover:border-slate-300 transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">{t.performanceSummary}</span>
              <button
                type="button"
                onClick={fetchAndShowLastActivities}
                className="text-[11px] font-semibold text-[#000080] hover:text-[#000066] hover:underline bg-transparent border-none p-0 cursor-pointer flex items-center gap-1"
              >
                <HugeiconsIcon icon={Time02Icon} className="w-3.5 h-3.5 text-[#000080]" strokeWidth={2.2} />
                {t.myLastActivity || "Activity Timeline"}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center mt-2">
              {/* Total Claims */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex flex-col justify-center items-center">
                <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                  <HugeiconsIcon icon={File01Icon} className="w-4 h-4 text-slate-600" strokeWidth={2} />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t.claims}</span>
                </div>
                <span className="text-2xl font-bold text-slate-900">{claims.length}</span>
              </div>

              {/* In Progress */}
              <div className="bg-sky-50/70 border border-sky-100 rounded-2xl p-3 flex flex-col justify-center items-center">
                <div className="flex items-center gap-1.5 text-sky-700 mb-1">
                  <HugeiconsIcon icon={Time02Icon} className="w-4 h-4 text-sky-600" strokeWidth={2} />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-700">{t.inProgress}</span>
                </div>
                <span className="text-2xl font-bold text-sky-600">{claims.filter(c => c.status !== "Approved" && c.status !== "Rejected").length}</span>
              </div>

              {/* Completed */}
              <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3 flex flex-col justify-center items-center">
                <div className="flex items-center gap-1.5 text-blue-800 mb-1">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4 text-blue-600" strokeWidth={2} />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-800">{t.completed}</span>
                </div>
                <span className="text-2xl font-bold text-blue-900">{claims.filter(c => c.status === "Approved" || c.status === "Rejected").length}</span>
              </div>
            </div>
          </div>

        </div>

        {/* CLAIMS DIRECTORY VIEW */}
        <div className="flex flex-col gap-6">
              
              {/* Search & Filter row */}
              <div className="bg-white border border-slate-200 rounded-[24px] p-5 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm select-none">
                
                {/* Status Tabs */}
                <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-xl w-full md:w-auto">
                  {(["All", "Pending", "In Progress", "Approved", "Rejected", "Completed"] as const).map(tab => {
                    const tabLabel = tab === "All" ? t.all : tab === "Pending" ? t.pending : tab === "In Progress" ? t.inProgress : tab === "Approved" ? t.approved : tab === "Rejected" ? t.rejected : tab === "Completed" ? t.completed : tab;
                    return (
                      <button
                        key={tab}
                        onClick={() => setStatusFilter(tab)}
                        className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all border-none outline-none cursor-pointer ${
                          statusFilter === tab
                            ? "bg-[#000080] text-white shadow-sm"
                            : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                        }`}
                      >
                        {tabLabel} ({
                          tab === "All"
                            ? claims.length
                            : tab === "Completed"
                            ? claims.filter(c => c.status === "Approved" || c.status === "Rejected").length
                            : claims.filter(c => c.status === tab).length
                        })
                      </button>
                    );
                  })}
                </div>

                {/* Search Bar */}
                <div className="relative w-full md:w-72">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <HugeiconsIcon icon={Search01Icon} className="w-4 h-4" strokeWidth={2.5} />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-slate-700 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0f2d4a] focus:border-transparent transition-all bg-slate-50 focus:bg-white"
                  />
                </div>

              </div>


            {/* Claims Data grid list */}
            {loading ? (
              <div className="bg-white border border-slate-200 rounded-[28px] p-16 flex flex-col items-center justify-center text-center shadow-sm min-h-[300px]">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
                <span className="mt-3 text-slate-400 text-sm font-medium">Fetching claims dossier...</span>
              </div>
            ) : filteredClaims.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-[28px] p-16 flex flex-col items-center justify-center text-center shadow-sm min-h-[300px]">
                <h3 className="font-semibold text-slate-700 text-lg">{t.noClaimsFound}</h3>
                <p className="text-slate-400 text-xs font-normal mt-1.5 max-w-sm leading-relaxed">
                  {t.noClaimsFoundDesc}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {/* Grid Table Header (Desktop Only) */}
                <div className="hidden md:grid md:grid-cols-[minmax(140px,1.5fr)_minmax(100px,1fr)_minmax(140px,1.4fr)_minmax(150px,1.4fr)_minmax(150px,1.4fr)_minmax(100px,1fr)_minmax(110px,1fr)_minmax(100px,1fr)] items-center gap-4 px-6 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider select-none">
                  <div>{t.claimInfo}</div>
                  <div>{t.vehicleNo}</div>
                  <div>{t.damageType}</div>
                  <div>{t.location}</div>
                  <div>{t.policyHolder}</div>
                  <div className="text-center">{t.assessment}</div>
                  <div className="text-center">{t.status}</div>
                  <div className="text-right">{t.actions}</div>
                </div>

                {/* List Cards */}
                {filteredClaims.map((claim) => {
                  const isUrgent = getSeverity(claim.damageType) === "Urgent" || claim.priority === "Urgent";
                  return (
                    <div
                      key={claim._id}
                      onClick={() => {
                        setSelectedClaim(claim);
                        setAssessmentAmount(typeof claim.amount === "number" ? claim.amount.toString() : "");
                      }}
                      className={`bg-white border border-slate-200/90 hover:border-[#000080]/60 rounded-2xl px-6 py-4 flex flex-col md:grid md:grid-cols-[minmax(140px,1.5fr)_minmax(100px,1fr)_minmax(140px,1.4fr)_minmax(150px,1.4fr)_minmax(150px,1.4fr)_minmax(100px,1fr)_minmax(110px,1fr)_minmax(100px,1fr)] md:items-center gap-4 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md relative overflow-hidden ${
                        claim.inspectionSubmitted || claim.status === "Approved" || claim.status === "Rejected"
                          ? "border-l-[5px] border-l-emerald-500"
                          : isUrgent
                          ? "border-l-[5px] border-l-red-500"
                          : "border-l-[5px] border-l-[#000080]"
                      }`}
                    >
                      {/* 1. Claim Info */}
                      <div className="flex flex-col min-w-0 select-none">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-800 text-sm whitespace-nowrap">{claim.claimNumber}</span>
                          {isUrgent && (
                            <span className="bg-red-100 text-red-700 text-[8px] font-bold tracking-wider uppercase px-2 py-0.5 rounded whitespace-nowrap animate-pulse">Urgent</span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">Registered: {formatDate(claim.createdAt)}</span>
                      </div>

                      {/* 2. Vehicle Plate */}
                      <div className="text-xs md:text-sm font-semibold text-slate-800 truncate">
                        {formatPlate(claim.vehiclePlate)}
                      </div>

                      {/* 3. Damage Type */}
                      <div className="text-xs md:text-sm font-semibold text-slate-700 truncate" title={claim.damageType}>
                        {claim.damageType}
                      </div>

                      {/* 4. Location */}
                      <div className="text-xs md:text-sm font-semibold text-slate-700 truncate" title={claim.location}>
                        {claim.location || "-"}
                      </div>

                      {/* 5. Policy Holder */}
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-slate-800 truncate">{getPolicyHolderName(claim.userNic)}</span>
                        <span className="text-[10px] text-slate-400 font-medium mt-0.5">NIC: {claim.userNic}</span>
                      </div>

                      {/* 6. Assessment */}
                      <div className="text-xs font-semibold text-slate-700 text-center">
                        {typeof claim.amount === "number" ? (
                          `Rs. ${claim.amount.toLocaleString()}`
                        ) : (
                          <span className="text-slate-400 font-normal italic text-[11px]">{lang === "en" ? "Not Assessed" : lang === "si" ? "තක්සේරු කර නැත" : "மதிப்பிடப்படவில்லை"}</span>
                        )}
                      </div>

                      {/* 7. Status Badge */}
                      <div className="flex items-center justify-center min-w-0">
                        <span className={`text-[9px] font-semibold px-3 py-1 rounded-full uppercase tracking-wider block text-center whitespace-nowrap ${getStatusStyle(claim.status, claim.damageType, claim.priority)}`}>
                          {claim.status === "Pending" ? t.pending : claim.status === "In Progress" ? t.inProgress : claim.status === "Approved" ? t.approved : claim.status === "Rejected" ? t.rejected : claim.status}
                        </span>
                      </div>

                      {/* 8. Action */}
                      <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClaim(claim);
                            setAssessmentAmount(typeof claim.amount === "number" ? claim.amount.toString() : "");
                          }}
                          className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold text-xs px-3.5 py-1.5 rounded-xl transition-all cursor-pointer focus:outline-none shadow-xs whitespace-nowrap active:scale-95"
                        >
                          {t.viewDetails}
                        </button>
                      </div>

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
                          return <p className="text-xs text-slate-400 font-semibold italic select-none col-span-2 py-2">No policy holder documents.</p>;
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
                              <span className="text-xs font-semibold text-slate-700 truncate">{doc.name}</span>
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

                    {/* Uploded Agent Docs List */}
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
                          return <p className="text-xs text-slate-400 font-semibold italic select-none col-span-2 py-2">No agent documents uploaded.</p>;
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
                                <span className="text-xs font-semibold text-slate-700 truncate">{doc.name}</span>
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
                              <span className="text-xs font-semibold text-slate-700 truncate">{doc.name}</span>
                            </button>
                          );
                        });
                      })()}
                    </div>

                    {/* Agent File Upload Panel */}
                    {selectedClaim.status !== "Approved" && selectedClaim.status !== "Rejected" && (
                      <div className="border-t border-slate-200/60 pt-4 flex flex-col gap-4">
                        <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider select-none">Upload Claim Document</span>
                        
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider select-none">Document Type</label>
                          <div className="flex flex-wrap gap-2">
                            {["Repair Estimate", "Inspection Photos", "Damage Assessment", "Other"].map((type) => {
                              const isSelected = agentUploadDocName === type;
                              return (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => setAgentUploadDocName(type)}
                                  className={`px-4 py-2 rounded-full text-[11px] font-semibold transition-all border cursor-pointer select-none ${
                                    isSelected
                                      ? "bg-[#0f2d4a] border-[#0f2d4a] text-white shadow-sm"
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
                          <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider select-none">File Attachment</label>
                          
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
                              className="w-full border-2 border-dashed border-slate-350 hover:border-[#0f2d4a] rounded-2xl py-6 px-4 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-all duration-150 group select-none"
                            >
                              <HugeiconsIcon icon={Upload01Icon} className="w-8 h-8 text-slate-400 mb-2 group-hover:text-[#0f2d4a] transition-colors" strokeWidth={1.8} />
                              <span className="text-slate-800 text-[13px] font-semibold">Select document file</span>
                              <span className="text-slate-400 text-[10px] font-semibold mt-1">Image or PDF (Max 5MB)</span>
                            </div>
                          ) : (
                            <div className="w-full border border-emerald-500 bg-emerald-50/5 rounded-2xl p-4 flex items-center justify-between relative shadow-sm">
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
                                  <span className="text-emerald-800 text-[13px] font-semibold truncate">
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
                                className="bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 rounded-full p-2 transition-colors cursor-pointer"
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
                            className="w-full bg-[#000080] hover:bg-[#000066] text-white font-bold text-xs py-3 px-4 rounded-xl border-none cursor-pointer active:scale-[0.98] transition-all disabled:opacity-50 mt-1 shadow-md flex items-center justify-center gap-2"
                          >
                            {isAgentUploading ? "Uploading..." : "Upload Document"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-8 py-4 bg-white border-t border-slate-200 flex justify-between flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveSubModal(null)}
                  className="bg-[#000080] hover:bg-[#000066] text-white font-bold text-sm px-6 py-2 rounded-full transition-all border-none cursor-pointer flex items-center shadow-sm active:scale-95"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRequestItems([
                      { recipient: "User", docType: "NIC Front Page", customName: "", note: "" }
                    ]);
                    setActiveSubModal("request_docs");
                  }}
                  className="bg-[#f97316] hover:bg-orange-600 text-white font-bold text-sm px-6 py-2 rounded-full transition-all border-none cursor-pointer flex items-center shadow-sm active:scale-95"
                >
                  Request Document
                </button>
              </div>
            </div>
          )}

          {/* SUB-MODAL 2: REQUEST DOCUMENTS */}
          {activeSubModal === "request_docs" && (
            <div className="bg-white border border-slate-200 rounded-[32px] w-full max-w-[800px] h-[650px] max-h-[90vh] shadow-2xl flex flex-col relative transition-all duration-300 overflow-hidden">
              {/* Header */}
              <div className="px-8 pt-6 pb-2 select-none bg-white">
                <h2 className="text-[24px] font-semibold text-slate-900 tracking-tight leading-none">
                  Request Documents - {selectedClaim.claimNumber}
                </h2>
              </div>
              <div className="border-b border-black mx-8 mb-6" />

              {/* Body */}
              <div className="px-8 pb-4 flex-1 overflow-y-auto space-y-6">
                <div className="text-left font-bold text-slate-800 space-y-1.5 text-[13px] select-none leading-relaxed">
                  <p>Vehicle No : <span className="font-medium text-slate-600">{formatPlate(selectedClaim.vehiclePlate)}</span></p>
                </div>

                {/* Fields */}
                <div className="space-y-4 pr-1">
                  {requestItems.map((item, index) => (
                    <div key={index} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 relative space-y-4">
                      {requestItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setRequestItems(prev => prev.filter((_, idx) => idx !== index))}
                          className="absolute top-4 right-4 text-slate-400 hover:text-red-500 font-bold text-lg bg-transparent border-none cursor-pointer p-1 transition-colors"
                        >
                          <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={2.5} />
                        </button>
                      )}

                      <div className="flex items-center gap-2 select-none mb-1">
                        <span className="w-6 h-6 rounded-full bg-[#0f2d4a] text-white flex items-center justify-center text-xs font-semibold">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <h4 className="text-slate-800 font-semibold text-xs uppercase tracking-wider">Document #{index + 1}</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider ml-1 select-none">Request From :</label>
                          <div className="flex gap-4 p-3 bg-white border border-slate-200 rounded-xl">
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                              <input
                                type="radio"
                                checked={item.recipient === "User"}
                                onChange={() => {
                                  setRequestItems(prev => prev.map((it, idx) => idx === index ? { ...it, recipient: "User", docType: "NIC Front Page" } : it));
                                }}
                                className="w-4 h-4 accent-[#0f2d4a]"
                              />
                              <span className="text-xs font-semibold text-slate-700">Policy Holder</span>
                            </label>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider ml-1 select-none">Document Type :</label>
                          <select
                            value={item.docType}
                            onChange={(e) => {
                              setRequestItems(prev => prev.map((it, idx) => idx === index ? { ...it, docType: e.target.value } : it));
                            }}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2d4a]"
                          >
                            <option value="NIC Front Page">NIC Front Page</option>
                            <option value="NIC Back Page">NIC Back Page</option>
                            <option value="License Front">License Front</option>
                            <option value="License Rear">License Rear</option>
                            <option value="Vehicle Registration">Vehicle Registration</option>
                            <option value="Revenue License">Revenue License</option>
                            <option value="Accident Photos">Accident Photos</option>
                            <option value="Repair Estimate">Repair Estimate</option>
                            <option value="Custom / Other">Custom / Other</option>
                          </select>
                        </div>
                      </div>

                      {item.docType === "Custom / Other" && (
                        <div className="flex flex-col gap-1.5 transition-all duration-300">
                          <label className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider ml-1 select-none">Custom Document Name :</label>
                          <input
                            type="text"
                            required
                            value={item.customName}
                            onChange={(e) => {
                              setRequestItems(prev => prev.map((it, idx) => idx === index ? { ...it, customName: e.target.value } : it));
                            }}
                            placeholder="E.g. Bank Book PDF, Towing Receipt..."
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2d4a]"
                          />
                        </div>
                      )}

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider ml-1 select-none">Instructions / Note :</label>
                        <textarea
                          rows={2}
                          value={item.note}
                          onChange={(e) => {
                            setRequestItems(prev => prev.map((it, idx) => idx === index ? { ...it, note: e.target.value } : it));
                          }}
                          placeholder="E.g. Please upload a clear photo of the document..."
                          className="w-full p-4 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2d4a] resize-none"
                        />
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setRequestItems(prev => [...prev, { recipient: "User", docType: "NIC Front Page", customName: "", note: "" }]);
                    }}
                    className="w-full py-4 border-2 border-dashed border-slate-355 hover:border-[#0f2d4a] rounded-2xl flex items-center justify-center gap-2 bg-slate-50/50 hover:bg-slate-50 text-xs font-semibold text-slate-500 hover:text-[#0f2d4a] cursor-pointer transition-all duration-200 group"
                  >
                    Add Another Document Request
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="px-8 py-4 bg-white border-t border-slate-200 flex justify-between flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveSubModal(null)}
                  className="bg-[#000080] hover:bg-[#000066] text-white font-bold text-sm px-6 py-2 rounded-full transition-all border-none cursor-pointer flex items-center shadow-sm active:scale-95"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    for (let i = 0; i < requestItems.length; i++) {
                      const item = requestItems[i];
                      if (item.docType === "Custom / Other" && !item.customName.trim()) {
                        alert(`Please enter a custom document name for Document #${i + 1}.`);
                        return;
                      }
                    }

                    const currentDocs = selectedClaim.requestedDocuments || [];
                    const newDocs = requestItems.map(item => {
                      return item.docType === "Custom / Other" ? item.customName.trim() : item.docType;
                    });

                    const updatedDocs = [...currentDocs];
                    newDocs.forEach(docName => {
                      if (!updatedDocs.includes(docName)) {
                        updatedDocs.push(docName);
                      }
                    });

                    const messageTexts = requestItems.map(item => {
                      const docName = item.docType === "Custom / Other" ? item.customName.trim() : item.docType;
                      const customMsg = item.note.trim() || `Please upload the requested document.`;
                      return {
                        message: `[Document Request to ${item.recipient}] Requested: ${docName}. Message: ${customMsg}`,
                        recipient: "Policy Holder"
                      };
                    });

                    await handleUpdateClaim(selectedClaim.claimNumber, {
                      documentsRequested: true,
                      requestedDocuments: updatedDocs,
                      documentRequestTo: "User",
                      messageTexts: messageTexts
                    });

                    setActiveSubModal(null);
                    alert("Document requests sent successfully!");
                  }}
                  disabled={updatingClaim}
                  className="bg-[#000080] hover:bg-[#000066] text-white font-bold text-sm px-6 py-2 rounded-full transition-all border-none cursor-pointer flex items-center shadow-sm active:scale-95 disabled:opacity-50"
                >
                  Submit
                </button>
              </div>
            </div>
          )}

          {/* SUB-MODAL 3: ADD NOTE */}
          {activeSubModal === "add_note" && (
            <div className="bg-white border border-slate-200 rounded-[32px] w-full max-w-[800px] h-[650px] max-h-[90vh] shadow-2xl flex flex-col relative transition-all duration-300 overflow-hidden">
              {/* Header */}
              <div className="px-8 pt-6 pb-2 select-none bg-white">
                <h2 className="text-[24px] font-semibold text-slate-900 tracking-tight leading-none">
                  Add Note - {selectedClaim.claimNumber}
                </h2>
              </div>
              <div className="border-b border-black mx-8 mb-6" />

              {/* Body */}
              <div className="px-8 pb-8 flex-1 overflow-y-auto space-y-6">
                <div className="text-left font-bold text-slate-800 space-y-1.5 text-[13px] select-none leading-relaxed">
                  <p>Vehicle No : <span className="font-medium text-slate-600">{formatPlate(selectedClaim.vehiclePlate)}</span></p>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-slate-800 ml-1 select-none">Add Note :</label>
                    <textarea
                      rows={5}
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                      placeholder="Enter internal text note..."
                      className="w-full p-4 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0f2d4a] resize-none border border-slate-200/50"
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-8 py-4 bg-white border-t border-slate-200 flex justify-between flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveSubModal(null);
                    setNewMessageText("");
                  }}
                  className="bg-[#000080] hover:bg-[#000066] text-white font-bold text-sm px-6 py-2 rounded-full transition-all border-none cursor-pointer flex items-center shadow-sm active:scale-95"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!newMessageText.trim()) {
                      alert("Please enter a note.");
                      return;
                    }
                    await handleUpdateClaim(selectedClaim.claimNumber, {
                      noteText: newMessageText.trim()
                    });
                    setActiveSubModal(null);
                    setNewMessageText("");
                    alert("Internal note added successfully!");
                  }}
                  disabled={updatingClaim || !newMessageText.trim()}
                  className="bg-[#000080] hover:bg-[#000066] text-white font-bold text-sm px-6 py-2 rounded-full transition-all border-none cursor-pointer flex items-center shadow-sm active:scale-95 disabled:opacity-50"
                >
                  Submit
                </button>
              </div>
            </div>
          )}

          {/* SUB-MODAL 4: CONTACT */}
          {activeSubModal === "contact" && (
            <div className="bg-white border border-slate-200 rounded-[32px] w-full max-w-[800px] h-[650px] max-h-[90vh] shadow-2xl flex flex-col relative transition-all duration-300 overflow-hidden">
              {/* Header */}
              <div className="px-8 pt-6 pb-2 select-none bg-white">
                <h2 className="text-[24px] font-semibold text-slate-900 tracking-tight leading-none">
                  Contact - {selectedClaim.claimNumber}
                </h2>
              </div>
              <div className="border-b border-black mx-8 mb-6" />

              {/* Body */}
              <div className="px-8 pb-8 flex-1 overflow-y-auto space-y-4">
                <div className="text-left font-bold text-slate-800 space-y-1.5 text-[13px] select-none leading-relaxed">
                  <p>Vehicle No : <span className="font-medium text-slate-600">{formatPlate(selectedClaim.vehiclePlate)}</span></p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 select-none">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
                    <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider block">Policy Holder</span>
                    <h5 className="text-xs font-semibold text-slate-800">{getPolicyHolderName(selectedClaim.userNic)}</h5>
                    <div className="text-[11px] text-slate-600 font-semibold">
                      <p>NIC: {selectedClaim.userNic}</p>
                      <p>Phone: {getPolicyHolderContact(selectedClaim.userNic)}</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
                    <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider block">Office Staff</span>
                    <h5 className="text-xs font-semibold text-slate-800">Branch Operations</h5>
                    <div className="text-[11px] text-slate-600 font-semibold">
                      <p>Branch: {selectedClaim.branch || "Branch Office"}</p>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 select-none border-b border-slate-100 pb-2">
                  <button
                    type="button"
                    onClick={() => setContactRecipient("Policy Holder")}
                    className={`py-2 px-6 rounded-full text-xs font-semibold tracking-wide uppercase transition-all border cursor-pointer ${
                      contactRecipient === "Policy Holder"
                        ? "bg-[#0f2d4a] text-white border-transparent shadow-sm"
                        : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-105"
                    }`}
                  >
                    Policy Holder Chat
                  </button>
                  <button
                    type="button"
                    onClick={() => setContactRecipient("Office Staff")}
                    className={`py-2 px-6 rounded-full text-xs font-semibold tracking-wide uppercase transition-all border cursor-pointer ${
                      contactRecipient === "Office Staff"
                        ? "bg-[#0f2d4a] text-white border-transparent shadow-sm"
                        : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-105"
                    }`}
                  >
                    Office Staff Chat
                  </button>
                </div>

                {/* Chat Log */}
                <div className="bg-slate-100 rounded-2xl p-5 border border-slate-200 flex-1 overflow-y-auto space-y-3.5 max-h-[160px]">
                  {(() => {
                    const filteredMessages = selectedClaim.messages.filter((msg) => {
                      if (contactRecipient === "Policy Holder") {
                        // Exchanged with Policy Holder
                        return msg.recipient === "Policy Holder" || msg.recipient === "User" || msg.sender === "Policy Holder" || msg.sender === "User";
                      } else {
                        // Exchanged with Agent / Office Staff
                        return msg.recipient === "Agent" || msg.recipient === "Office Staff" || msg.sender === "Office Staff" || msg.sender.includes("Branch Staff");
                      }
                    });

                    if (filteredMessages.length === 0) {
                      return (
                        <div className="text-center text-xs text-slate-400 italic py-2 font-semibold select-none">
                          No messages history recorded with {contactRecipient === "Policy Holder" ? "Policy Holder" : "Office Staff"}.
                        </div>
                      );
                    }

                    return filteredMessages.map((msg, index) => {
                      const isSelf = msg.sender === "Agent" || msg.sender === "Agent (You)";
                      return (
                        <div key={index} className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}>
                          <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-xs shadow-sm ${
                            isSelf ? "bg-[#0f2d4a] text-white rounded-tr-none" : "bg-white border border-slate-200 text-slate-700 rounded-tl-none"
                          }`}>
                            <p className="font-semibold leading-relaxed break-words whitespace-pre-wrap">{msg.message}</p>
                          </div>
                          <span className="text-[9px] text-slate-400 font-semibold mt-1 select-none px-1">
                            {msg.sender} · {formatMessageTime(msg.sentAt)}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Message input */}
                <div className="select-none">
                  <div className="flex gap-3">
                    <textarea
                      rows={2}
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                      placeholder={`Type a message to ${contactRecipient === "Policy Holder" ? "Policy Holder" : "Office Staff"}...`}
                      className="flex-1 p-3 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none bg-slate-50 focus:ring-2 focus:ring-[#0f2d4a] resize-none"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (newMessageText.trim()) {
                          await handleUpdateClaim(selectedClaim.claimNumber, {
                            messageText: newMessageText.trim(),
                            messageRecipient: contactRecipient === "Policy Holder" ? "Policy Holder" : "Agent"
                          });
                          setNewMessageText("");
                          alert("Message sent!");
                        }
                      }}
                      disabled={updatingClaim || !newMessageText.trim()}
                      className="bg-[#000080] hover:bg-[#000066] text-white font-bold text-xs px-5 py-4 rounded-xl border-none cursor-pointer disabled:opacity-50"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-8 py-4 bg-white border-t border-slate-200 flex justify-between flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveSubModal(null);
                    setNewMessageText("");
                  }}
                  className="bg-[#000080] hover:bg-[#000066] text-white font-bold text-sm px-6 py-2 rounded-full transition-all border-none cursor-pointer flex items-center shadow-sm active:scale-95"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* SUB-MODAL 5: UPDATE TRACKING */}
          {activeSubModal === "update_tracking" && (
            <div className="bg-white border border-slate-200 rounded-[32px] w-full max-w-[800px] h-[650px] max-h-[90vh] shadow-2xl flex flex-col relative transition-all duration-300 overflow-hidden">
              {/* Header */}
              <div className="px-8 pt-6 pb-2 select-none bg-white">
                <h2 className="text-[24px] font-semibold text-slate-900 tracking-tight leading-none">
                  Update Tracking - {selectedClaim.claimNumber}
                </h2>
              </div>
              <div className="border-b border-black mx-8 mb-6" />

              {/* Body */}
              <div className="px-8 pb-8 flex-1 overflow-y-auto space-y-6">
                <div className="text-left font-bold text-slate-800 space-y-1.5 text-[13px] select-none leading-relaxed">
                  <p>Vehicle No : <span className="font-medium text-slate-600">{formatPlate(selectedClaim.vehiclePlate)}</span></p>
                </div>

                {selectedClaim.status === "Rejected" ? (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-2">
                    <p className="text-red-700 font-bold text-sm">
                      This claim has been Rejected.
                    </p>
                    {selectedClaim.rejectionReason && (
                      <p className="text-xs text-red-600 font-semibold leading-relaxed">
                        Reason: {selectedClaim.rejectionReason}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Stepper details */}
                    {selectedClaim.currentStep === 2 && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-3.5">
                        <p className="text-slate-650 font-bold text-xs select-none">
                          This claim dossier has been assigned to you. Please accept the case file to start damage inspections.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleAcceptClaim(selectedClaim.claimNumber)}
                          disabled={isAcceptingClaim}
                          className="bg-[#000080] hover:bg-[#000066] text-white font-bold text-xs py-3 px-6 rounded-xl cursor-pointer disabled:opacity-50 select-none shadow-sm active:scale-95 transition-all"
                        >
                          {isAcceptingClaim ? "Accepting..." : "Accept Claim Assignment"}
                        </button>
                      </div>
                    )}

                    {selectedClaim.currentStep === 3 && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block select-none">Submit Inspection Details</span>
                        {!selectedClaim.inspectionSubmitted ? (
                          <div className="flex flex-col gap-3">
                            <textarea
                              rows={4}
                              value={inspectionReportText}
                              onChange={(e) => setInspectionReportText(e.target.value)}
                              placeholder="Describe structural frame damage, mechanical engine issues, tire statuses, or repair estimations..."
                              className="w-full p-4 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2d4a] resize-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleSubmitInspectionReport(selectedClaim.claimNumber)}
                              disabled={isSubmittingReport || !inspectionReportText.trim()}
                              className="bg-[#000080] hover:bg-[#000066] text-white font-bold text-xs py-3 px-6 rounded-xl cursor-pointer self-end disabled:opacity-50 select-none shadow-sm active:scale-95 transition-all"
                            >
                              {isSubmittingReport ? "Submitting..." : "Submit Inspection Report"}
                            </button>
                          </div>
                        ) : (
                          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between shadow-inner">
                            <span className="text-emerald-700 text-xs font-bold select-none">Inspection report submitted successfully. Waiting for staff evaluation.</span>
                          </div>
                        )}
                      </div>
                    )}

                    {(selectedClaim.currentStep === 4 || selectedClaim.currentStep === 5) && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block select-none">Assessment & Approval</span>
                        <div className="flex flex-col gap-3.5">
                          <p className="text-slate-550 text-xs font-semibold leading-relaxed">
                            Input the evaluated damage assessment amount below and confirm approval to proceed to the payment step.
                          </p>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider select-none">Assessment Amount (LKR) :</label>
                            <input
                              type="number"
                              value={assessmentAmount}
                              onChange={(e) => setAssessmentAmount(e.target.value)}
                              placeholder="E.g. 75000"
                              className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-xs font-bold focus:outline-none max-w-[200px]"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleApproveAssessment(selectedClaim.claimNumber)}
                            disabled={updatingClaim || !assessmentAmount.trim()}
                            className="bg-[#000080] hover:bg-[#000066] text-white font-bold text-xs py-3 px-6 rounded-xl cursor-pointer self-start disabled:opacity-50 select-none shadow-sm active:scale-95 transition-all"
                          >
                            Confirm Assessment Approval
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedClaim.currentStep === 6 && (
                      <div className="space-y-4">
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2 select-none leading-relaxed">
                          <h3 className="text-xs font-semibold text-slate-800 border-b pb-1.5 uppercase tracking-wide">
                            Payment Details
                          </h3>
                          <div className="grid grid-cols-2 gap-y-2 text-xs font-semibold text-slate-700">
                            <div>
                              <span className="text-[9px] text-slate-400 uppercase font-semibold tracking-wide block">Bank Name</span>
                              <span className="text-slate-900 font-bold block mt-0.5">{selectedClaim.bankName || "-"}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 uppercase font-semibold tracking-wide block">Branch Name</span>
                              <span className="text-slate-900 font-bold block mt-0.5">{selectedClaim.bankBranch || "-"}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-[9px] text-slate-400 uppercase font-semibold tracking-wide block">Account Number</span>
                              <span className="text-slate-900 font-bold block mt-0.5">{selectedClaim.bankAccount || "-"}</span>
                            </div>
                          </div>
                        </div>

                        {selectedClaim.paymentReceipt && (
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center justify-between select-none">
                            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              Bank Transfer Completed
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                let docUrl = selectedClaim.paymentReceipt;
                                if (docUrl && !docUrl.startsWith("http") && !docUrl.startsWith("data:")) {
                                  docUrl = `${API_URL.replace("/api", "")}/uploads/${docUrl}`;
                                }
                                setPreviewImage(docUrl || null);
                              }}
                              className="text-xs font-bold text-cyan-600 hover:text-cyan-700 bg-transparent border-none cursor-pointer"
                            >
                              View Receipt File
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-8 py-4 bg-white border-t border-slate-200 flex justify-end flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveSubModal(null)}
                  className="bg-[#000080] hover:bg-[#000066] text-white font-bold text-sm px-6 py-2 rounded-full transition-all border-none cursor-pointer flex items-center shadow-sm active:scale-95"
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
                {/* Column 1: Agent Assignment & Info */}
                <div className="space-y-3.5 bg-slate-50 border border-slate-200 p-5 rounded-2xl">
                  <h3 className="text-slate-800 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200 pb-2 mb-3 flex items-center gap-2">
                    <HugeiconsIcon icon={UserIcon} className="w-4 h-4 text-cyan-600" strokeWidth={2.5} />
                    Agent Assignment Info
                  </h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-[125px_1fr] gap-2">
                      <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Assigned Agent</span>
                      <span className="text-slate-700 font-semibold truncate">: {selectedClaim.assignedAgent || "-"}</span>
                    </div>
                    <div className="grid grid-cols-[125px_1fr] gap-2">
                      <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Branch Office</span>
                      <span className="text-slate-700 font-semibold truncate">: {selectedClaim.branch || "-"}</span>
                    </div>
                    <div className="grid grid-cols-[125px_1fr] gap-2">
                      <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Assignment Date</span>
                      <span className="text-slate-700 font-semibold truncate">: {formatDate(selectedClaim.createdAt)}</span>
                    </div>
                    <div className="grid grid-cols-[125px_1fr] gap-2">
                      <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Policyholder NIC</span>
                      <span className="text-slate-700 font-semibold truncate">: {selectedClaim.userNic}</span>
                    </div>
                  </div>
                </div>

                {/* Column 2: Vehicle Details */}
                <div className="space-y-3.5 bg-slate-50 border border-slate-200 p-5 rounded-2xl">
                  <h3 className="text-slate-800 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200 pb-2 mb-3 flex items-center gap-2">
                    <HugeiconsIcon icon={Car01Icon} className="w-4 h-4 text-[#0f2d4a]" strokeWidth={2.5} />
                    Vehicle Details
                  </h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-[110px_1fr] gap-2">
                      <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Vehicle No</span>
                      <span className="text-slate-700 font-semibold truncate">: {formatPlate(selectedClaim.vehiclePlate)}</span>
                    </div>
                    <div className="grid grid-cols-[110px_1fr] gap-2">
                      <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Severity</span>
                      <span className="text-slate-700 font-semibold truncate">: {selectedClaim.severity || getSeverity(selectedClaim.damageType)}</span>
                    </div>
                    <div className="grid grid-cols-[110px_1fr] gap-2">
                      <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Priority</span>
                      <span className="text-slate-700 font-semibold truncate">: {selectedClaim.priority || "Medium"}</span>
                    </div>
                  </div>
                </div>

                {/* Large Dedicated Section: Incident Details */}
                <div className="col-span-1 md:col-span-2 space-y-4 bg-slate-50 border border-slate-200 p-6 rounded-2xl">
                  <h3 className="text-slate-800 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200 pb-2 mb-3 flex items-center gap-2">
                    <HugeiconsIcon icon={Alert02Icon} className="w-4 h-4 text-red-500" strokeWidth={2.5} />
                    Incident Details & Assessment
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="grid grid-cols-[110px_1fr] gap-2">
                        <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Damage Type</span>
                        <span className="text-slate-700 font-semibold truncate">: {selectedClaim.damageType || "-"}</span>
                      </div>
                      <div className="grid grid-cols-[110px_1fr] gap-2">
                        <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Incident Date</span>
                        <span className="text-slate-700 font-semibold truncate">: {claimDateString(selectedClaim.incidentDate)} @ {selectedClaim.incidentTime}</span>
                      </div>
                      <div className="grid grid-cols-[110px_1fr] gap-2">
                        <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Est. Amount</span>
                        <span className="text-slate-700 font-semibold truncate">: {selectedClaim.amount ? `LKR ${selectedClaim.amount.toLocaleString()}` : "Not Assessed"}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-[110px_1fr] gap-2 items-start">
                        <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Location</span>
                        <span className="text-slate-700 font-semibold whitespace-normal break-words leading-relaxed">: {selectedClaim.location || "-"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-3 flex flex-col gap-1">
                    <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Incident Description</span>
                    <span className="text-slate-900 font-semibold break-words leading-relaxed whitespace-pre-wrap mt-1">
                      {selectedClaim.description || "No description provided."}
                    </span>
                  </div>

                  {selectedClaim.rejectionReason && (
                    <div className="flex flex-col gap-1 border-t border-slate-200/60 pt-3 mt-3">
                      <span className="text-red-500 font-semibold uppercase tracking-wider text-[10px]">Rejection / Rejection reason</span>
                      <span className="text-red-650 font-bold mt-1 text-sm">
                        {selectedClaim.rejectionReason}
                      </span>
                    </div>
                  )}

                  {/* Submitted Agent Inspection Report Section */}
                  {selectedClaim.inspectionSubmitted && selectedClaim.inspectionReport && (
                    <div className="flex flex-col gap-2 border-t border-slate-200/60 pt-4 mt-4">
                      {renderPremiumInspectionReport(selectedClaim.inspectionReport)}
                    </div>
                  )}
                </div>

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
                      <h3 className="text-slate-800 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200 pb-2 mb-3 flex items-center gap-2">
                        <HugeiconsIcon icon={Image01Icon} className="w-5 h-5 text-[#0f2d4a]" strokeWidth={2.5} />
                        Policy Holder Attachments & Photos
                      </h3>

                      {attachments.length === 0 ? (
                        <p className="text-xs text-slate-500 font-semibold italic select-none py-2">
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

                {/* Agent Uploaded Documents Section */}
                {(() => {
                  const agentDocs = (selectedClaim.additionalDocuments || []).filter(doc => doc.uploadedBy === "Agent");
                  return (
                    <div className="col-span-1 md:col-span-2 space-y-4 bg-slate-50 border border-slate-200 p-6 rounded-2xl">
                      <h3 className="text-slate-800 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200 pb-2 mb-3 flex items-center gap-2">
                        <HugeiconsIcon icon={File01Icon} className="w-5 h-5 text-cyan-600" strokeWidth={2.5} />
                        Agent Uploaded Documents
                      </h3>

                      {agentDocs.length === 0 ? (
                        <p className="text-xs text-slate-500 font-semibold italic select-none py-2">
                          No repair estimates or assessment documents uploaded by the agent.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                          {agentDocs.map((doc, idx) => {
                            let docUrl = doc.url;
                            if (docUrl && !docUrl.startsWith("http") && !docUrl.startsWith("data:")) {
                              docUrl = `${API_URL.replace("/api", "")}/uploads/${docUrl}`;
                            }
                            const isPdf = docUrl.toLowerCase().endsWith(".pdf");
                            return (
                              <div
                                key={idx}
                                onClick={() => setPreviewImage(docUrl)}
                                className="group cursor-pointer flex flex-col items-center"
                              >
                                <div className="w-full h-24 rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm group-hover:shadow transition-all relative flex items-center justify-center">
                                  {isPdf ? (
                                    <div className="flex flex-col items-center gap-1 text-red-505">
                                      <HugeiconsIcon icon={File01Icon} className="w-8 h-8 text-red-500" strokeWidth={2.2} />
                                      <span className="text-[8px] font-semibold uppercase tracking-wider text-red-500">PDF Document</span>
                                    </div>
                                  ) : (
                                    <img
                                      src={docUrl}
                                      alt={doc.name}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                                    />
                                  )}
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

              </div>

              {/* Action Buttons Row */}
              <div className="border-t border-slate-200 pt-4 flex flex-wrap items-center justify-start gap-3 select-none mt-4">
                <button
                  type="button"
                  onClick={() => setActiveSubModal("documents")}
                  className="bg-[#000080] hover:bg-[#000066] text-white font-semibold text-xs py-3 px-6 rounded-full cursor-pointer shadow-sm active:scale-95 transition-all flex items-center gap-2 border-none"
                >
                  <HugeiconsIcon icon={File01Icon} className="w-4 h-4" strokeWidth={2.5} />
                  Upload Documents
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubModal("add_note")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-3 px-6 rounded-full cursor-pointer shadow-sm active:scale-95 transition-all flex items-center gap-2 border-none"
                >
                  <HugeiconsIcon icon={Edit02Icon} className="w-4 h-4" strokeWidth={2.5} />
                  Add Note
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubModal("contact")}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs py-3 px-6 rounded-full cursor-pointer shadow-sm active:scale-95 transition-all flex items-center gap-2 border-none"
                >
                  <HugeiconsIcon icon={BubbleChatIcon} className="w-5 h-5" strokeWidth={2.5} />
                  Chat / Contact
                </button>
              </div>

              {/* Action Buttons: Accept / Reject */}
              {(selectedClaim.currentStep === 2 || selectedClaim.currentStep === 1) && selectedClaim.status !== "Approved" && selectedClaim.status !== "Rejected" && (
                <div className="flex items-center gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => handleAcceptClaim(selectedClaim.claimNumber)}
                    disabled={isAcceptingClaim}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm py-4 rounded-full flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95 transition-all disabled:opacity-50 border-none"
                  >
                    <HugeiconsIcon icon={Tick01Icon} className="w-5 h-5" strokeWidth={2.5} />
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeclineClaim(selectedClaim.claimNumber)}
                    disabled={isAcceptingClaim}
                    className="flex-1 bg-red-650 hover:bg-red-750 text-white font-semibold text-sm py-4 rounded-full flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95 transition-all disabled:opacity-50 border-none"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={2.5} />
                    Reject
                  </button>
                </div>
              )}

              {/* Status Banner for Accepted (In Progress / Approved) Claims */}
              {selectedClaim.currentStep >= 3 && !selectedClaim.inspectionSubmitted && selectedClaim.status !== "Approved" && selectedClaim.status !== "Rejected" && (
                <div className="w-full bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mt-6 text-center select-none transition-all duration-300">
                  <p className="text-emerald-800 text-xs md:text-sm font-semibold flex items-center justify-center gap-2">
                    <HugeiconsIcon icon={SmartPhone01Icon} className="w-5 h-5 animate-pulse" strokeWidth={2.5} />
                    Claim Assignment Accepted
                  </p>
                  <p className="text-emerald-600 text-xs font-semibold mt-2 leading-relaxed">
                    Please open the <strong>Sanasa Agent Mobile App</strong> on your smartphone to complete the physical damage evaluation, snap accident scene/license photos, and submit inspection reports.
                  </p>
                </div>
              )}

              {/* Status Banner for Rejected Claims */}
              {selectedClaim.status.toLowerCase() === "rejected" && (
                <div className="w-full bg-red-50 border border-red-200 rounded-2xl p-4 mt-6 flex flex-col items-center text-center select-none gap-3 transition-all duration-300">
                  <p className="text-red-800 text-xs md:text-sm font-semibold flex items-center justify-center gap-2">
                    <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={2.5} />
                    Claim Assignment Declined
                  </p>
                  <p className="text-red-650 text-xs font-semibold leading-relaxed">
                    This claim dossier assignment has been rejected. If this was a mistake or you need to re-verify details, please contact branch support.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClaim(null);
                      router.push("/Agent/Contact");
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs py-3 px-6 rounded-xl cursor-pointer shadow-sm active:scale-95 transition-all text-center border-none"
                  >
                    Contact Branch Support
                  </button>
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
            {/* Close Button */}
            <button
              onClick={() => setShowMobileRedirect(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-all border-none bg-transparent cursor-pointer"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={2.5} />
            </button>

            {/* Glowing Mobile Icon */}
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-5 relative">
              <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-emerald-400 opacity-20"></span>
              <HugeiconsIcon icon={SmartPhone01Icon} className="w-8 h-8 relative z-10" strokeWidth={2.2} />
            </div>

            {/* Content */}
            <h3 className="text-slate-900 font-semibold text-xl tracking-tight leading-none">
              Claim Accepted Successfully!
            </h3>
            <p className="text-slate-500 text-xs md:text-sm font-semibold mt-4 leading-relaxed">
              To proceed with the vehicle physical damage inspection, snap photos, and submit reports, please open the **Sanasa Agent Mobile App** on your smartphone.
            </p>

            {/* Quick Steps */}
            <div className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl p-4 mt-5 text-left space-y-2.5">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block select-none">Next Steps:</span>
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

            {/* Close Button */}
            <button
              onClick={() => setShowMobileRedirect(false)}
              className="w-full mt-6 bg-[#0f2d4a] hover:bg-[#193d61] text-white font-bold text-xs py-4 rounded-xl border-none cursor-pointer shadow-md hover:shadow-slate-900/10 active:scale-95 transition-all select-none"
            >
              Okay, Got It
            </button>
          </div>
        </div>
      )}


      {/* Activities Logs Modal Overlay */}
      {showActivitiesModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white border border-slate-200 rounded-[32px] w-full max-w-[650px] h-[550px] max-h-[85vh] shadow-2xl flex flex-col relative transition-all duration-300 overflow-hidden">
            {/* Header */}
            <div className="px-8 pt-6 pb-2 select-none bg-white">
              <h2 className="text-[22px] font-semibold text-slate-900 tracking-tight leading-none flex items-center gap-2">
                <span>🕒 Last Activity Logs</span>
                <span className="text-xs text-slate-400 font-semibold tracking-normal">(App & Web)</span>
              </h2>
            </div>
            <div className="border-b border-black mx-8 mb-4" />

            {/* Body */}
            <div className="px-8 pb-6 flex-1 overflow-y-auto space-y-4">
              {loadingActivities ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400 font-semibold italic">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0f2d4a] mb-3"></div>
                  Loading last activities...
                </div>
              ) : loggedActivities.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400 font-semibold italic">
                  No activity logs found.
                </div>
              ) : (
                <div className="space-y-3">
                  {loggedActivities.map((act: any) => {
                    const isLogin = act.action === "Login";
                    const isUpload = act.action === "Document Uploaded";
                    const isAccept = act.action === "Claim Accepted";
                    const isInspect = act.action === "Inspection Submitted" || act.action === "Inspection report submitted";
                    const isOffline = act.action === "Go Offline" || act.action === "Offline";
                    const isActive = act.action === "Go Active" || act.action === "Active";

                    let iconColor = "bg-slate-100 text-slate-600";
                    let iconSvg = (
                      <HugeiconsIcon icon={Settings02Icon} className="w-4 h-4" strokeWidth={2.5} />
                    );

                    if (isLogin) {
                      iconColor = "bg-blue-100 text-blue-600";
                      iconSvg = (
                        <HugeiconsIcon icon={Key01Icon} className="w-4 h-4" strokeWidth={2.5} />
                      );
                    } else if (isUpload) {
                      iconColor = "bg-cyan-100 text-cyan-600";
                      iconSvg = (
                        <HugeiconsIcon icon={Upload01Icon} className="w-4 h-4" strokeWidth={2.5} />
                      );
                    } else if (isAccept) {
                      iconColor = "bg-emerald-100 text-emerald-600";
                      iconSvg = (
                        <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4" strokeWidth={2.5} />
                      );
                    } else if (isInspect) {
                      iconColor = "bg-purple-100 text-purple-600";
                      iconSvg = (
                        <HugeiconsIcon icon={File01Icon} className="w-4 h-4" strokeWidth={2.5} />
                      );
                    } else if (isOffline) {
                      iconColor = "bg-red-100 text-red-600";
                      iconSvg = (
                        <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={2.5} />
                      );
                    } else if (isActive) {
                      iconColor = "bg-teal-100 text-teal-600";
                      iconSvg = (
                        <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4" strokeWidth={2.5} />
                      );
                    }

                    const isMobileApp = act.device === "Mobile App";

                    return (
                      <div key={act._id} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex gap-3.5 hover:shadow-sm transition-all text-left">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${iconColor}`}>
                          {iconSvg}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-bold text-sm text-slate-800 leading-tight">
                              {act.action}
                            </span>
                            <span className={`text-[8px] font-semibold px-2 py-1 rounded-md uppercase tracking-wider ${
                              isMobileApp ? "bg-purple-100 text-purple-700 border border-purple-200" : "bg-cyan-100 text-cyan-700 border border-cyan-200"
                            }`}>
                              {act.device}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-semibold mt-1 leading-normal">
                            {act.details}
                          </p>
                          <span className="text-[9px] text-slate-400 font-semibold block mt-1">
                            {formatDateTime(act.createdAt)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-8 py-4 bg-white border-t border-slate-200 flex justify-end flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowActivitiesModal(false)}
                className="bg-[#000080] hover:bg-[#000066] text-white font-bold text-sm px-6 py-2 rounded-full transition-all border-none cursor-pointer flex items-center shadow-sm active:scale-95"
              >
                Close
              </button>
            </div>
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
}
