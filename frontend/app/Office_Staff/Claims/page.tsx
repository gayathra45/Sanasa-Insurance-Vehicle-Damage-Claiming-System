"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import OfficeStaffNavbar from "@/app/Components/Office_Staff/Navbar";
import { API_URL } from "@/app/config";
import UserAvatarDropdown from "@/app/Components/UserAvatarDropdown";
import { compressImage } from "../../utils/imageCompressor";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Menu01Icon,
  Notification01Icon,
  Search01Icon,
  File01Icon,
  CheckmarkCircle01Icon,
  Alert02Icon,
  AlertCircleIcon,
  UserIcon,
  ArrowRight01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  Cancel01Icon,
  Add01Icon,
  Delete02Icon,
  Tick01Icon,
  BubbleChatIcon,
  Location01Icon
} from "@hugeicons/core-free-icons";

interface ClaimMessage {
  sender: string;
  message: string;
  sentAt: string;
  recipient?: string;
  _id?: string;
}

interface AdditionalDoc {
  name: string;
  url: string;
  uploadedAt: string;
  _id?: string;
  uploadedBy?: string;
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
  otherVehicleDetails?: {
    vehiclePlate?: string;
    insuranceCompany?: string;
    policyNumber?: string;
    driverName?: string;
    licensePhotos?: string[];
    vehiclePhotos?: string[];
  };
  location: string;
  status: string;
  branch: string;
  assignedAgent: string;
  amount: number | null;
  currentStep: number;
  documentsRequested: boolean;
  requestedDocuments: string[];
  documentRequestTo?: string;
  messages: ClaimMessage[];
  additionalDocuments: AdditionalDoc[];
  accidentPhotos?: {
    front: string[];
    rear: string[];
    side: string[];
  };
  drivingLicense?: {
    front: string[];
    rear: string[];
  };
  createdAt: string;
  priority?: string;
  inspectionReport?: string;
  inspectionSubmitted?: boolean;
  paymentReceipt?: string;
  bankName?: string;
  bankBranch?: string;
  bankAccount?: string;
  policyHolderBankDetails?: {
    bankName: string;
    branchName: string;
    accountNumber: string;
    accountHolderName: string;
  };
  rejectionReason?: string;
  notes?: ClaimNote[];
  isManuallyUpdated?: boolean;
  manualUpdateReason?: string;
  manualUpdateAt?: string;
  manualUpdateBy?: string;
  aiAnalysis?: {
    isAnalyzed: boolean;
    damagedItems?: {
      item: string;
      damagePercentage: number;
      description: string;
    }[];
    overallDamagePercentage?: number;
    summary?: string;
  };
}

interface ClaimNote {
  text: string;
  addedBy: string;
  addedAt: string;
  _id?: string;
}

interface PolicyHolder {
  _id: string;
  firstName: string;
  lastName: string;
  nic: string;
  mobile: string;
  email: string;
}

interface Agent {
  _id: string;
  agentId: string;
  name: string;
  email: string;
  branch: string;
  phone?: string;
  availability?: string;
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
      const rawTrimmed = line.trim();
      if (!rawTrimmed) return;

      // Clean leading bullet point and any space
      const trimmed = rawTrimmed.replace(/^([•\u2022]|ΓÇó)\s*/, "");

      if (trimmed.startsWith("Odometer:")) {
        odometer = trimmed.replace("Odometer:", "").trim();
      } else if (trimmed.startsWith("Fuel Level:")) {
        fuelLevel = trimmed.replace("Fuel Level:", "").trim();
      } else if (trimmed.startsWith("Recommended Action:")) {
        recommendedAction = trimmed.replace("Recommended Action:", "").trim();
      } else if (trimmed.startsWith("Estimated Cost:")) {
        estimatedCost = trimmed.replace("Estimated Cost:", "").trim();
      } else if (rawTrimmed.includes("[3. PRE-EXISTING DAMAGE NOTES]")) {
        currentSection = "pre-existing";
      } else if (rawTrimmed.includes("[4. PHYSICAL INSPECTION NOTES]")) {
        currentSection = "physical-notes";
      } else if (rawTrimmed.includes("==================================") || rawTrimmed.includes("VEHICLE CLAIM INSPECTION")) {
        // skip
      } else if (rawTrimmed.includes("[2. COMPONENT DAMAGE CHECKLIST]")) {
        currentSection = "checklist";
      } else if (currentSection === "checklist" && (rawTrimmed.startsWith("•") || rawTrimmed.startsWith("ΓÇó") || rawTrimmed.startsWith("\u2022"))) {
        const parts = trimmed.split(":");
        if (parts.length >= 2) {
          const compName = parts[0].trim();
          const compVal = parts[1].replace("[", "").replace("]", "").trim();
          checklist[compName] = compVal;
        }
      } else if (currentSection === "pre-existing") {
        if (!rawTrimmed.startsWith("[")) {
          preExistingDamage += (preExistingDamage ? "\n" : "") + rawTrimmed;
        }
      } else if (currentSection === "physical-notes") {
        if (!rawTrimmed.startsWith("[")) {
          physicalInspectionNotes += (physicalInspectionNotes ? "\n" : "") + rawTrimmed;
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

const renderParsedInspection = (
  reportText: string,
  additionalDocuments: AdditionalDoc[] = [],
  apiUrl: string = "",
  onPhotoClick?: (url: string) => void
) => {
  const parsed = parseInspectionReport(reportText);
  if (!parsed) return null;

  if (parsed.isRaw) {
    return (
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 shadow-inner select-text">
        <div className="flex items-center gap-2 mb-3 text-slate-405 select-none">
          <HugeiconsIcon icon={File01Icon} className="w-5 h-5 text-slate-400" strokeWidth={2.5} />
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Raw Inspection Report Text</span>
        </div>
        <p className="text-slate-705 text-xs font-semibold whitespace-pre-wrap leading-relaxed">
          {parsed.rawText}
        </p>
      </div>
    );
  }

  const renderChecklistBadge = (val: string) => {
    let color = "text-slate-500 bg-slate-50 border-slate-200";
    let icon = null;
    
    if (val === "None") {
      color = "text-emerald-600 bg-emerald-50/40 border-emerald-200/60";
      icon = (
        <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4 text-emerald-500 flex-shrink-0" strokeWidth={3} />
      );
    } else if (val === "Minor") {
      color = "text-amber-600 bg-amber-50/40 border-amber-200/60";
      icon = (
        <HugeiconsIcon icon={Alert02Icon} className="w-4 h-4 text-amber-500 flex-shrink-0" strokeWidth={3} />
      );
    } else if (val === "Major") {
      color = "text-rose-600 bg-rose-50/40 border-rose-200/60";
      icon = (
        <HugeiconsIcon icon={AlertCircleIcon} className="w-4 h-4 text-rose-500 flex-shrink-0" strokeWidth={3} />
      );
    }

    return (
      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border flex items-center gap-1.5 select-none ${color}`}>
        {icon}
        {val}
      </span>
    );
  };

  const agentPhotos = (additionalDocuments || [])
    .filter((doc) => doc.uploadedBy === "Agent" || doc.name.toLowerCase().includes("inspection photo"))
    .map((doc) => {
      let docUrl = doc.url;
      if (docUrl && !docUrl.startsWith("http") && !docUrl.startsWith("data:")) {
        docUrl = `${apiUrl.replace("/api", "")}/uploads/${docUrl}`;
      }
      return { name: doc.name, url: docUrl };
    });

  return (
    <div className="space-y-6 font-sans w-full text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 select-none">
        <div>
          <h4 className="text-base font-bold text-slate-800">Vehicle Physical Inspection Report</h4>
          <p className="text-xs text-slate-500 mt-0.5">Detailed assessment submitted by the assigned agent</p>
        </div>
        <span className="w-fit bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-3 py-1 rounded-md flex items-center gap-1.5 shadow-xs">
          Verified by Agent
        </span>
      </div>

      {/* Details List */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 border-b border-slate-100 pb-5">
        <div>
          <span className="text-xs text-slate-400 block font-semibold">Odometer</span>
          <span className="text-sm font-bold text-slate-800 mt-1 block">{parsed.odometer || "N/A"}</span>
        </div>
        <div>
          <span className="text-xs text-slate-400 block font-semibold">Fuel Level</span>
          <span className="text-sm font-bold text-slate-800 mt-1 block">{parsed.fuelLevel || "N/A"}</span>
        </div>
        <div>
          <span className="text-xs text-slate-400 block font-semibold">Estimated Cost</span>
          <span className="text-sm font-bold text-emerald-600 mt-1 block">{parsed.estimatedCost || "N/A"}</span>
        </div>
        <div>
          <span className="text-xs text-slate-400 block font-semibold">Recommendation</span>
          <span className="text-sm font-bold text-slate-800 mt-1 block">{parsed.recommendedAction || "N/A"}</span>
        </div>
      </div>

      {/* Damage Checklist & Remarks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Component Checklist */}
        <div className="space-y-3">
          <span className="text-xs text-slate-400 uppercase font-bold tracking-wider block">Component Damage Status</span>
          <div className="space-y-2">
            {Object.entries(parsed.checklist || {}).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0 text-sm">
                <span className="text-slate-600 font-medium">{key}</span>
                <span className={`font-bold ${
                  value === "None" ? "text-emerald-600" :
                  value === "Minor" ? "text-amber-600" :
                  "text-rose-600"
                }`}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Remarks Column */}
        <div className="space-y-5">
          {parsed.preExistingDamage && parsed.preExistingDamage !== "None reported." && (
            <div className="space-y-1.5">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Pre-Existing Damage Remarks</span>
              <p className="text-slate-600 text-xs font-semibold leading-relaxed whitespace-pre-wrap">{parsed.preExistingDamage}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Physical Inspection Remarks</span>
            <p className="text-slate-600 text-xs font-semibold leading-relaxed whitespace-pre-wrap">{parsed.physicalInspectionNotes}</p>
          </div>
        </div>
      </div>

      {/* Inspection Photos Grid */}
      {agentPhotos.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Inspection Photos ({agentPhotos.length})</span>
          <div className="flex flex-wrap gap-3">
            {agentPhotos.map((photo, index) => (
              <div
                key={index}
                onClick={() => onPhotoClick && onPhotoClick(photo.url)}
                className="w-20 h-20 rounded-lg border border-slate-200 overflow-hidden cursor-zoom-in hover:opacity-85 transition-opacity"
                title={photo.name}
              >
                <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function OfficeStaffClaimsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const claimId = searchParams.get("claimId");
  const [branch, setBranch] = useState("");
  const [claims, setClaims] = useState<Claim[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [policyHolders, setPolicyHolders] = useState<PolicyHolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"All" | "Pending" | "In Progress" | "Approved" | "Rejected">("All");

  // Modal / Detail / Action states
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [showAllDetails, setShowAllDetails] = useState(false);
  const prevClaimIdRef = useRef<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [showDocStatus, setShowDocStatus] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewReportText, setPreviewReportText] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState<Claim | null>(null);
  const [selectedAgentEmail, setSelectedAgentEmail] = useState("");
  const [selectedPriority, setSelectedPriority] = useState<"Normal" | "Urgent">("Normal");
  const [assignmentMessage, setAssignmentMessage] = useState("");

  // Edit / Input states inside Details Modal
  const [assessmentAmount, setAssessmentAmount] = useState<string>("");
  const [updatingClaim, setUpdatingClaim] = useState(false);
  const [newMessageText, setNewMessageText] = useState("");
  const [activeDetailsPanel, setActiveDetailsPanel] = useState<"tracking" | "request_docs" | null>(null);
  const [tempRequestedDocs, setTempRequestedDocs] = useState<string[]>([]);
  const [decisionAction, setDecisionAction] = useState<"Approve" | "Reject" | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [paymentReceiptFile, setPaymentReceiptFile] = useState<File | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [isCancellingClaim, setIsCancellingClaim] = useState(false);

  const [analyzingClaim, setAnalyzingClaim] = useState<string | null>(null);

  const handleRunAIAnalysis = async (claimNumber: string) => {
    try {
      setAnalyzingClaim(claimNumber);
      const res = await fetch(`${API_URL}/office-staff/claims/${encodeURIComponent(claimNumber)}/analyze-ai`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setClaims((prevClaims) =>
          prevClaims.map((c) =>
            c.claimNumber === claimNumber
              ? { ...c, aiAnalysis: data.aiAnalysis }
              : c
          )
        );
        setSelectedClaim((prev) =>
          prev && prev.claimNumber === claimNumber
            ? { ...prev, aiAnalysis: data.aiAnalysis }
            : prev
        );
        alert("AI analysis completed successfully!");
      } else {
        alert(data.error || "Failed to run AI analysis.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred during AI analysis.");
    } finally {
      setAnalyzingClaim(null);
    }
  };

  const handleCancelClaim = async (claimNumber: string) => {
    const confirmCancel = window.confirm("Are you sure you want to cancel this claim? This action cannot be undone.");
    if (!confirmCancel) return;

    setIsCancellingClaim(true);
    try {
      const res = await fetch(`${API_URL}/policy-holder/delete-claim/${encodeURIComponent(claimNumber)}`, {
        method: "DELETE"
      });

      if (res.ok) {
        alert("Claim cancelled successfully!");
        setSelectedClaim(null);
        setActiveDetailsPanel(null);
        if (branch) {
          loadClaimsAndAgents(branch);
        }
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

  const [staffName, setStaffName] = useState("");
  // Manual override states
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualStep, setManualStep] = useState<number | "">("");
  const [manualReason, setManualReason] = useState<string>("");
  const [manualUpdateByVal, setManualUpdateByVal] = useState("");

  // Sub-modal overlay states
  const [activeSubModal, setActiveSubModal] = useState<"documents" | "contact" | "request_docs" | "add_note" | "update_tracking" | null>(null);
  interface RequestDocItem {
    recipient: "User" | "Agent";
    docType: string;
    customName: string;
    note: string;
  }
  const [requestItems, setRequestItems] = useState<RequestDocItem[]>([
    { recipient: "User", docType: "NIC Front Page", customName: "", note: "" }
  ]);
  const [contactRecipient, setContactRecipient] = useState<"Policy Holder" | "Agent">("Policy Holder");

  const handleAddRequestItem = () => {
    setRequestItems(prev => [
      ...prev,
      { recipient: "User", docType: "NIC Front Page", customName: "", note: "" }
    ]);
  };

  const handleRemoveRequestItem = (index: number) => {
    setRequestItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleRequestItemChange = (index: number, fields: Partial<RequestDocItem>) => {
    setRequestItems(prev => prev.map((item, idx) => {
      if (idx === index) {
        const updated = { ...item, ...fields };
        if (fields.recipient) {
          if (fields.recipient === "Agent") {
            const agentOptions = ["Repair Estimate", "Inspection Photos", "Damage Assessment", "Underwriting Report", "Custom / Other"];
            if (!agentOptions.includes(updated.docType)) {
              updated.docType = "Repair Estimate";
            }
          } else {
            const userOptions = ["NIC Front Page", "NIC Back Page", "License Front", "License Rear", "Vehicle Registration", "Revenue License", "Accident Photos", "Repair Estimate", "Custom / Other"];
            if (!userOptions.includes(updated.docType)) {
              updated.docType = "NIC Front Page";
            }
          }
        }
        return updated;
      }
      return item;
    }));
  };

  // Load claims and agents
  const loadClaimsAndAgents = async (currentBranch: string) => {
    try {
      setLoading(true);
      setError("");

      // 1. Fetch claims for this branch
      const claimsRes = await fetch(`${API_URL}/office-staff/claims?branch=${currentBranch}`);
      if (!claimsRes.ok) throw new Error("Failed to fetch claims.");
      const claimsData = await claimsRes.json();
      setClaims(claimsData.claims || []);

      // 2. Fetch agents for this branch (for assignment dropdown)
      const agentsRes = await fetch(`${API_URL}/office-staff/agents?branch=${currentBranch}`);
      if (agentsRes.ok) {
        const agentsData = await agentsRes.json();
        setAgents(agentsData.agents || []);
      }

      // 3. Fetch policy holders and registrations for user details lookups
      const phRes = await fetch(`${API_URL}/office-staff/policy-holders?branch=${currentBranch}`);
      const regsRes = await fetch(`${API_URL}/office-staff/registrations?branch=${currentBranch}`);
      
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
    } catch (err: any) {
      console.error("Load claims error:", err);
      setError(err.message || "Something went wrong loading claims.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let currentBranch = "";
    if (typeof window !== "undefined") {
      const savedStaff = sessionStorage.getItem("logged_in_staff");
      if (!savedStaff) {
        router.push("/Login");
        return;
      }
      try {
        const staffObj = JSON.parse(savedStaff);
        if (staffObj && staffObj.branch) {
          currentBranch = staffObj.branch;
          setBranch(currentBranch);
          setStaffName(staffObj.name || "");
        } else {
          router.push("/Login");
          return;
        }
      } catch (e) {
        console.error("Error parsing logged_in_staff", e);
        router.push("/Login");
        return;
      }
    }

    if (currentBranch) {
      loadClaimsAndAgents(currentBranch);
    }
  }, [router]);

  // Poll claims in background for real-time updates
  useEffect(() => {
    if (!branch) return;
    const pollInterval = setInterval(async () => {
      try {
        const claimsRes = await fetch(`${API_URL}/office-staff/claims?branch=${branch}`);
        if (claimsRes.ok) {
          const claimsData = await claimsRes.json();
          const freshClaims = claimsData.claims || [];
          setClaims(freshClaims);

          // Update the open selected claim details in real-time
          if (selectedClaim) {
            const updated = freshClaims.find((c: Claim) => c._id === selectedClaim._id);
            if (updated) {
              setSelectedClaim(updated);
            }
          }
        }
      } catch (err) {
        console.warn("Background claims polling failed:", err);
      }
    }, 7000);
    return () => clearInterval(pollInterval);
  }, [branch, selectedClaim]);

  // Poll agents in background for real-time status updates
  useEffect(() => {
    if (!branch) return;
    const pollInterval = setInterval(async () => {
      try {
        const agentsRes = await fetch(`${API_URL}/office-staff/agents?branch=${branch}`);
        if (agentsRes.ok) {
          const agentsData = await agentsRes.json();
          setAgents(agentsData.agents || []);
        }
      } catch (err) {
        console.warn("Background agents polling failed:", err);
      }
    }, 7000);
    return () => clearInterval(pollInterval);
  }, [branch]);

  useEffect(() => {
    if (claimId && claims.length > 0) {
      const matched = claims.find(c => c._id === claimId || c.claimNumber === claimId);
      if (matched) {
        setSelectedClaim(matched);
      }
    }
  }, [claimId, claims]);

  // Lock background scroll when modals are open
  useEffect(() => {
    const isAnyModalOpen = !!selectedClaim || !!previewImage || !!showAssignModal;
    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedClaim, previewImage, showAssignModal]);

  useEffect(() => {
    if (selectedClaim) {
      if (prevClaimIdRef.current !== selectedClaim._id) {
        setShowAllDetails(false);
        setShowNotes(false);
        setShowDocStatus(false);
        prevClaimIdRef.current = selectedClaim._id;
      }
      setAssessmentAmount(selectedClaim.amount !== null ? selectedClaim.amount.toString() : "");
      setBankName(selectedClaim.bankName || selectedClaim.policyHolderBankDetails?.bankName || "");
      setBankBranch(selectedClaim.bankBranch || selectedClaim.policyHolderBankDetails?.branchName || "");
      setBankAccount(selectedClaim.bankAccount || selectedClaim.policyHolderBankDetails?.accountNumber || "");
      setRejectionReasonText(selectedClaim.rejectionReason || "");
      setDecisionAction(null);
      setPaymentReceiptFile(null);
      setIsManualMode(false);
      setManualStep("");
      setManualReason("");
      setManualUpdateByVal("");
    } else {
      prevClaimIdRef.current = null;
    }
  }, [selectedClaim]);

  // Open Assign Agent modal with real-time fresh agents list
  const openAssignAgentModal = (claim: Claim) => {
    setShowAssignModal(claim);
    setSelectedAgentEmail("");
    setSelectedPriority(claim.priority === "Urgent" ? "Urgent" : "Normal");
    setAssignmentMessage("");
    if (branch) {
      fetch(`${API_URL}/office-staff/agents?branch=${encodeURIComponent(branch)}`)
        .then(res => res.json())
        .then(data => {
          if (data.agents) setAgents(data.agents);
        })
        .catch(e => console.warn("Failed to refresh branch agents:", e));
    }
  };

  // Handle agent assignment
  const handleAssignAgent = async (
    claimNumber: string,
    agentEmail: string,
    priority: "Normal" | "Urgent" = "Normal",
    messageText: string = ""
  ) => {
    try {
      setUpdatingClaim(true);
      const res = await fetch(`${API_URL}/office-staff/claims/${claimNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedAgent: agentEmail,
          status: "In Progress", // Auto set status to In Progress on assignment
          priority,
          messageText: messageText.trim() || undefined,
          messageSender: "Office Staff"
        })
      });
      if (!res.ok) throw new Error("Failed to assign agent.");
      const data = await res.json();
      
      // Update local state
      setClaims(prev => prev.map(c => c.claimNumber === claimNumber ? data.claim : c));
      if (selectedClaim && selectedClaim.claimNumber === claimNumber) {
        setSelectedClaim(data.claim);
      }
      
      setShowAssignModal(null);
      setSelectedAgentEmail("");
      setSelectedPriority("Normal");
      setAssignmentMessage("");
      alert(`Agent assigned successfully!`);
    } catch (err: any) {
      alert(err.message || "Failed to assign agent.");
    } finally {
      setUpdatingClaim(false);
    }
  };

  // Handle general updates (status, amount, etc.)
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
          messageSender: branch ? `${branch} Branch Staff` : "Office Staff"
        })
      });
      if (!res.ok) throw new Error("Failed to update claim details.");
      const data = await res.json();

      setClaims(prev => prev.map(c => c.claimNumber === claimNumber ? data.claim : c));
      setSelectedClaim(data.claim);
      setAssessmentAmount(data.claim.amount !== null ? data.claim.amount.toString() : "");
      setNewMessageText("");
    } catch (err: any) {
      alert(err.message || "Failed to update claim details.");
    } finally {
      setUpdatingClaim(false);
    }
  };

  const formatDate = (dateStr: string) => {
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

  const formatPlate = (plate: string) => {
    if (!plate) return "-";
    const cleaned = plate.trim();
    if (cleaned.includes("-")) return cleaned.toUpperCase();
    const m = cleaned.match(/^(.*[A-Za-z]+)(\d+)$/);
    if (m) return `${m[1].trim().toUpperCase()} - ${m[2]}`;
    return cleaned.toUpperCase();
  };

  const getStatusStyle = (status: string, damageType: string = "", priority: string = "", paymentReceipt: string = "") => {
    const s = status.toLowerCase();
    if (s.includes("approved") || s.includes("active") || s.includes("done")) {
      if (paymentReceipt) {
        return "bg-emerald-50 text-emerald-700 border border-emerald-200";
      }
      return "bg-blue-50 text-blue-600 border border-blue-200";
    }
    if (s.includes("rejected") || s.includes("decline") || s.includes("cancel")) {
      return "bg-slate-50 text-slate-500 border border-slate-200";
    }
    // New, Pending, In Progress (not approved or rejected yet) -> Red theme
    return "bg-red-50 text-red-700 border border-red-200";
  };

  const getAgentName = (email: string) => {
    if (!email) return "";
    const agent = agents.find(a => a.email && typeof a.email === "string" && a.email.toLowerCase().trim() === email.toLowerCase().trim());
    return agent ? agent.name : email;
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

  // Filtering claims based on tabs and search query
  const filteredClaims = claims.filter(claim => {
    // 1. Filter by active tab
    if (activeTab === "Pending" && claim.status !== "Pending") return false;
    if (activeTab === "In Progress" && claim.status !== "In Progress") return false;
    if (activeTab === "Approved" && claim.status !== "Approved") return false;
    if (activeTab === "Rejected" && claim.status !== "Rejected") return false;

    // 2. Filter by search query (Claim Number, Plate, or NIC)
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    return (
      claim.claimNumber.toLowerCase().includes(query) ||
      claim.vehiclePlate.toLowerCase().includes(query) ||
      claim.userNic.toLowerCase().includes(query) ||
      claim.damageType.toLowerCase().includes(query)
    );
  });

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
      <div className="flex flex-1 flex-row min-h-0">
        <OfficeStaffNavbar />

        <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
          {/* Header */}
          <header className="bg-white border-b border-slate-200 text-slate-800 px-8 py-4 flex justify-between items-center select-none flex-shrink-0 h-[80px] sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("open-mobile-menu"))}
                className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 active:scale-95 transition-all cursor-pointer focus:outline-none"
              >
                <HugeiconsIcon icon={Menu01Icon} className="w-6 h-6" strokeWidth={2.5} />
              </button>
              <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2 pl-2 lg:pl-0">
                <span className="bg-slate-850 text-white text-xs px-3.5 py-1.5 rounded-lg font-extrabold tracking-wide">{branch} Branch</span>
                <span className="hidden lg:inline text-slate-400 font-medium">— Claims Portal</span>
              </h1>
            </div>
            <div className="flex items-center gap-5">
              {/* Notification Bell Icon */}
              <Link href="/Office_Staff/Notifications" className="relative p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer focus:outline-none flex items-center justify-center">
                <HugeiconsIcon icon={Notification01Icon} className="w-6 h-6 text-slate-500 hover:text-slate-800" strokeWidth={2} />
              </Link>
              {/* User Avatar Icon */}
              <UserAvatarDropdown userType="office_staff" />
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-8 bg-slate-50 overflow-y-auto">
            {loading ? (
              <div className="w-full h-full flex flex-col items-center justify-center min-h-[300px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-700"></div>
                <span className="mt-4 text-slate-500 font-bold">Loading branch claims...</span>
              </div>
            ) : error ? (
              <div className="w-full h-full flex flex-col items-center justify-center min-h-[300px] text-red-500 font-bold bg-red-50 rounded-2xl p-8 border border-red-200">
                <span>{error}</span>
              </div>
            ) : (
              <div className="max-w-6xl mx-auto flex flex-col gap-6">
                
                {/* Title */}
                <div className="flex items-center gap-2 select-none">
                  <h2 className="text-lg font-bold text-slate-800">
                    Claims Management
                  </h2>
                </div>

                {/* Filters and Search Bar Container */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                  {/* Tabs */}
                  <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg w-full md:w-auto select-none">
                    {(["All", "Pending", "In Progress", "Approved", "Rejected"] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all border-none outline-none cursor-pointer ${
                          activeTab === tab
                            ? "bg-slate-800 text-white shadow-xs"
                            : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                        }`}
                      >
                        {tab} ({tab === "All" ? claims.length : claims.filter(c => c.status === tab).length})
                      </button>
                    ))}
                  </div>

                  {/* Search input */}
                  <div className="relative w-full md:w-80">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <HugeiconsIcon icon={Search01Icon} className="w-4 h-4 text-slate-400" strokeWidth={2.5} />
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search Claim No, Plate or NIC..."
                      className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-slate-200 text-slate-700 placeholder:text-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Claims list */}
                {filteredClaims.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 font-bold select-none shadow-xs">
                    No claims found in {branch} Branch under active filters.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {/* Header Row for Desktop */}
                    <div className="hidden md:grid md:grid-cols-[minmax(0,1.5fr)_minmax(0,0.9fr)_minmax(0,1.3fr)_minmax(0,1.2fr)_minmax(0,1.8fr)_minmax(0,1.0fr)_minmax(0,1.2fr)_minmax(0,1.4fr)] items-center gap-4 px-5 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none border border-transparent border-l-4 border-l-transparent">
                      <div className="flex flex-col select-none min-w-0">Claim Info</div>
                      <div className="flex flex-col select-none min-w-0">Vehicle No</div>
                      <div className="flex flex-col select-none min-w-0">Damage Type</div>
                      <div className="flex flex-col select-none min-w-0">Location</div>
                      <div className="flex flex-col select-none min-w-0">Assigned Agent</div>
                      <div className="flex flex-col select-none min-w-0">Assessment</div>
                      <div className="flex flex-col select-none min-w-0 text-center">Status</div>
                      <div className="flex flex-col select-none min-w-0 text-right">Actions</div>
                    </div>

                    {filteredClaims.map((claim) => {
                      const s = claim.status.toLowerCase();
                      const isUrgent = claim.priority === "Urgent" || claim.damageType.toLowerCase().includes("severe") || claim.description.toLowerCase().includes("urgent");
                      const isApproved = s.includes("approved") || s.includes("active") || s.includes("done");
                      const isRejected = s.includes("rejected");
                      const isCompleted = isApproved && !!claim.paymentReceipt;

                      let cardThemeClass = "";
                      let indicatorDot = "";

                      if (isCompleted) {
                        cardThemeClass = "border-l-4 border-l-emerald-500 hover:bg-slate-50/40";
                        indicatorDot = "bg-emerald-500";
                      } else if (isApproved) {
                        cardThemeClass = "border-l-4 border-l-blue-500 hover:bg-slate-50/40";
                        indicatorDot = "bg-blue-500";
                      } else if (isRejected) {
                        cardThemeClass = "border-l-4 border-l-slate-400 hover:bg-slate-50/40";
                        indicatorDot = "bg-slate-400";
                      } else {
                        cardThemeClass = "border-l-4 border-l-red-500 hover:bg-slate-50/40";
                        indicatorDot = "bg-red-500";
                      }

                      return (
                        <div
                          key={claim._id}
                          onClick={() => {
                            setSelectedClaim(claim);
                            setAssessmentAmount(typeof claim.amount === "number" ? claim.amount.toString() : "");
                          }}
                          className={`bg-white border border-slate-200 rounded-xl px-5 py-3.5 flex flex-col md:grid md:grid-cols-[minmax(0,1.5fr)_minmax(0,0.9fr)_minmax(0,1.3fr)_minmax(0,1.2fr)_minmax(0,1.8fr)_minmax(0,1.0fr)_minmax(0,1.2fr)_minmax(0,1.4fr)] md:items-center gap-4 transition-all duration-200 cursor-pointer shadow-xs hover:border-slate-300 relative overflow-hidden ${cardThemeClass}`}
                        >
                          {/* Claim ID & Date */}
                          <div className="flex flex-col select-none min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${indicatorDot}`} />
                              <h3 className="font-bold text-sm text-slate-800 whitespace-nowrap">
                                {claim.claimNumber}
                              </h3>
                              {isUrgent && (
                                <span className="bg-red-100 text-red-700 text-[8px] font-black tracking-wider uppercase px-2 py-0.5 rounded whitespace-nowrap">Urgent</span>
                              )}
                              {claim.isManuallyUpdated && (
                                <span 
                                  title={`Reason: ${claim.manualUpdateReason}\nBy: ${claim.manualUpdateBy}\nOn: ${claim.manualUpdateAt ? formatDate(claim.manualUpdateAt) : ""}`} 
                                  className="bg-amber-100 text-amber-800 text-[8px] font-black tracking-wider uppercase px-2 py-0.5 rounded whitespace-nowrap cursor-help flex items-center gap-0.5"
                                >
                                  Manual Override
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                              {formatDate(claim.createdAt)}
                            </span>
                          </div>

                          {/* Vehicle Plate */}
                          <div className="flex flex-col select-none min-w-0">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1 md:hidden">Vehicle No</span>
                            <span className="text-slate-700 font-bold text-xs">{formatPlate(claim.vehiclePlate)}</span>
                          </div>

                          {/* Damage Type */}
                          <div className="flex flex-col select-none min-w-0">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1 md:hidden">Damage Type</span>
                            <span className="text-slate-600 text-xs font-semibold truncate block" title={claim.damageType}>{claim.damageType}</span>
                          </div>

                          {/* Location */}
                          <div className="flex flex-col select-none min-w-0">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1 md:hidden">Location</span>
                            <span className="text-slate-600 text-xs font-semibold truncate block" title={claim.location}>{claim.location}</span>
                          </div>

                          {/* Agent Assignment */}
                          <div className="flex flex-col select-none min-w-0">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1 md:hidden">Assigned Agent</span>
                            <span className="text-xs font-semibold truncate block">
                              {claim.assignedAgent ? (
                                <div className="flex flex-col">
                                  <span className="text-slate-600 font-bold" title={claim.assignedAgent}>{getAgentName(claim.assignedAgent)}</span>
                                  {claim.currentStep < 3 && claim.status !== "Rejected" && (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 mt-1 w-fit select-none uppercase tracking-wider">
                                      Acceptance Pending
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 font-bold bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-[10px] inline-block w-fit">Unassigned</span>
                              )}
                            </span>
                          </div>

                          {/* Assessment */}
                          <div className="flex flex-col select-none min-w-0">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1 md:hidden">Assessment</span>
                            <span className="text-xs font-bold text-slate-700">
                              {typeof claim.amount === "number" ? (
                                `Rs. ${claim.amount.toLocaleString()}`
                              ) : (
                                <span className="text-slate-400 font-normal italic text-[11px]">Not Assessed</span>
                              )}
                            </span>
                          </div>

                          {/* Status Badge */}
                          <div className="flex flex-col select-none items-center min-w-0">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1 md:hidden">Status</span>
                            <span className={`text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wide block text-center whitespace-nowrap ${getStatusStyle(claim.status, claim.damageType, claim.priority, claim.paymentReceipt)}`}>
                              {claim.status.toLowerCase() === "approved" && claim.paymentReceipt ? "Completed" : claim.status}
                            </span>
                          </div>

                          {/* Quick Actions */}
                          <div className="flex items-center justify-end gap-2 flex-shrink-0 md:pl-4 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 min-w-0" onClick={(e) => e.stopPropagation()}>
                            {!claim.assignedAgent && (
                              <button
                                onClick={() => openAssignAgentModal(claim)}
                                className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-[10px] px-3 py-2 rounded-lg transition-all cursor-pointer focus:outline-none shadow-xs border-none active:scale-95 whitespace-nowrap"
                              >
                                Assign Agent
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedClaim(claim);
                                setAssessmentAmount(typeof claim.amount === "number" ? claim.amount.toString() : "");
                                setActiveSubModal(null);
                                setRequestItems([
                                  { recipient: "User", docType: "NIC Front Page", customName: "", note: "" }
                                ]);
                                setContactRecipient("Policy Holder");
                              }}
                              className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-[10px] px-3 py-2 rounded-lg transition-all cursor-pointer focus:outline-none shadow-xs bg-white whitespace-nowrap"
                            >
                              Details
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
      {/* Detail Inspection Modal */}
      {selectedClaim && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
          
          {/* SUB-MODAL 1: DOCUMENTS */}
          {activeSubModal === "documents" && (
            <div className="bg-white border border-slate-200 rounded-[32px] w-full max-w-[800px] h-[650px] max-h-[90vh] shadow-2xl flex flex-col relative transition-all duration-300 overflow-hidden">
              {/* Header */}
              <div className="px-8 pt-6 pb-2 select-none bg-white">
                <h2 className="text-[24px] font-black text-slate-900 tracking-tight leading-none">
                  Documents - {selectedClaim.claimNumber}
                </h2>
              </div>
              <div className="border-b border-black mx-8 mb-6" />

              {/* Body */}
              <div className="px-8 pb-8 flex-1 overflow-y-auto space-y-6">
                {/* Claim Summary */}
                <div className="text-left font-bold text-slate-800 space-y-1.5 text-[13px] select-none leading-relaxed">
                  <p>Vehicle No : <span className="font-medium text-slate-600">{formatPlate(selectedClaim.vehiclePlate)}</span></p>
                </div>
                {/* Categorized Document Lists */}
                <div className="space-y-6">
                  {/* Category 1: Policy Holder Documents */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
                    <h3 className="text-sm font-black text-slate-800 border-b border-slate-200 pb-2 uppercase tracking-wider flex items-center gap-2 select-none">
                      <HugeiconsIcon icon={UserIcon} className="w-4 h-4 text-[#0f2d4a]" strokeWidth={2.5} />
                      Policy Holder Documents
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(() => {
                        const phDocs: { name: string; url: string }[] = [];
                        
                        // License
                        const dlFront = selectedClaim.drivingLicense?.front?.[0];
                        const dlRear = selectedClaim.drivingLicense?.rear?.[0];
                        if (dlFront) phDocs.push({ name: "Driving License (Front)", url: dlFront });
                        if (dlRear) phDocs.push({ name: "Driving License (Rear)", url: dlRear });
                        
                        // Accident Photos
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
                        
                        // Additional Docs
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
                              <HugeiconsIcon icon={File01Icon} className="w-5 h-5 text-slate-600 flex-shrink-0" strokeWidth={2.5} />
                              <span className="text-xs font-extrabold text-slate-700 truncate">{doc.name}</span>
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Category 2: Agent Documents */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
                    <h3 className="text-sm font-black text-slate-800 border-b border-slate-200 pb-2 uppercase tracking-wider flex items-center gap-2 select-none">
                      <HugeiconsIcon icon={UserIcon} className="w-4 h-4 text-cyan-600" strokeWidth={2.5} />
                      Agent Documents
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(() => {
                        const agentDocs: { name: string; url?: string; textContent?: string }[] = [];
                        
                        // Inspection Report
                        if (selectedClaim.inspectionSubmitted && selectedClaim.inspectionReport) {
                          agentDocs.push({
                            name: "Inspection Report (Text)",
                            textContent: selectedClaim.inspectionReport
                          });
                        }

                        // Additional Docs
                        (selectedClaim.additionalDocuments || []).forEach((doc) => {
                          const uploadedBy = doc.uploadedBy || "Policy Holder";
                          if (uploadedBy === "Agent") {
                            agentDocs.push({ name: doc.name, url: doc.url });
                          }
                        });

                        if (agentDocs.length === 0) {
                          return <p className="text-xs text-slate-400 font-bold italic select-none col-span-2 py-2">No agent documents.</p>;
                        }

                        return agentDocs.map((doc, idx) => {
                          if (doc.textContent) {
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setPreviewReportText(doc.textContent || null);
                                }}
                                className="bg-white border border-slate-200 hover:bg-slate-50 transition-all p-4 rounded-[15px] flex items-center justify-start gap-3 cursor-pointer outline-none shadow-sm active:scale-98 text-left"
                              >
                                <HugeiconsIcon icon={File01Icon} className="w-5 h-5 text-cyan-600 flex-shrink-0" strokeWidth={2.5} />
                                <span className="text-xs font-extrabold text-slate-700 truncate">{doc.name}</span>
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
                              <HugeiconsIcon icon={File01Icon} className="w-5 h-5 text-cyan-600 flex-shrink-0" strokeWidth={2.5} />
                              <span className="text-xs font-extrabold text-slate-700 truncate">{doc.name}</span>
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {(() => {
                    const getRecipientForDoc = (name: string) => {
                      const msg = [...(selectedClaim.messages || [])]
                        .reverse()
                        .find(m => m.message.includes(`Requested: ${name}`));
                      if (msg) {
                        if (msg.message.includes("[Document Request to Agent]")) return "Agent";
                        if (msg.message.includes("[Document Request to User]")) return "User";
                      }
                      return selectedClaim.documentRequestTo || "User";
                    };

                    const getDocDetails = (name: string, status: "Pending" | "Submitted") => {
                      let requestedAt = "";
                      let submittedAt = "";

                      const msg = [...(selectedClaim.messages || [])]
                        .reverse()
                        .find(m => m.message.includes(`Requested: ${name}`));
                      if (msg) {
                        requestedAt = formatDate(msg.sentAt);
                      } else {
                        requestedAt = formatDate(selectedClaim.createdAt);
                      }

                      if (status === "Submitted") {
                        const doc = (selectedClaim.additionalDocuments || []).find(
                          d => d.name.trim().toLowerCase() === name.trim().toLowerCase()
                        );
                        if (doc && doc.uploadedAt) {
                          submittedAt = formatDate(doc.uploadedAt);
                        }
                      }

                      return { requestedAt, submittedAt };
                    };

                    const requestedDocsList = [
                      ...(selectedClaim.requestedDocuments || []).map((name) => ({
                        name,
                        status: "Pending" as const,
                        url: null,
                        recipient: getRecipientForDoc(name),
                      })),
                      ...(selectedClaim.additionalDocuments || []).map((doc) => ({
                        name: doc.name,
                        status: "Submitted" as const,
                        url: doc.url,
                        recipient: doc.uploadedBy === "Agent" ? "Agent" : "User",
                      })),
                    ];

                    const policyHolderDocs = requestedDocsList.filter((d) => d.recipient === "User");
                    const agentDocs = requestedDocsList.filter((d) => d.recipient === "Agent");

                    if (requestedDocsList.length === 0) return null;

                    const hasPending = requestedDocsList.some((d) => d.status === "Pending");

                    return (
                      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
                        <h3 className="text-sm font-black text-slate-800 border-b border-slate-200 pb-2 uppercase tracking-wider flex items-center gap-2 select-none">
                          {hasPending ? (
                            <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5 text-amber-500 animate-pulse" strokeWidth={2.5} />
                          ) : (
                            <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-5 h-5 text-emerald-600" strokeWidth={2.5} />
                          )}
                          Requested Documents Status
                        </h3>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2 select-none">
                            <span className="text-[10px] bg-blue-100 text-blue-800 font-black tracking-wider uppercase px-2 py-1 rounded border border-blue-200">
                              Policy Holder Requests
                            </span>
                          </div>
                          {policyHolderDocs.length > 0 ? (
                            <div className="flex flex-col gap-2">
                              {policyHolderDocs.map((item, idx) => {
                                const { requestedAt, submittedAt } = getDocDetails(item.name, item.status);
                                return (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between py-3 px-4 bg-white border border-slate-200/70 rounded-xl hover:border-slate-300 transition-all shadow-sm"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                        item.status === "Pending" ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                                      }`} />
                                      <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-extrabold text-slate-800 truncate">{item.name}</span>
                                        <span className="text-[9px] text-slate-400 font-bold leading-none mt-0.5">
                                          {item.status === "Pending" ? (
                                            `Requested: ${requestedAt}`
                                          ) : (
                                            `Requested: ${requestedAt} ┬╖ Uploaded: ${submittedAt || "Recent"}`
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className={`text-[8px] font-black uppercase px-2 py-1 rounded select-none border ${
                                        item.status === "Pending"
                                          ? "bg-amber-100/80 text-amber-800 border-amber-200"
                                          : "bg-emerald-100/80 text-emerald-800 border-emerald-200"
                                      }`}>
                                        {item.status}
                                      </span>
                                      {item.status === "Submitted" && item.url && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            let docUrl = item.url;
                                            if (docUrl && !docUrl.startsWith("http") && !docUrl.startsWith("data:")) {
                                              docUrl = `${API_URL.replace("/api", "")}/uploads/${docUrl}`;
                                            }
                                            setPreviewImage(docUrl || null);
                                          }}
                                          className="text-[10px] font-black text-cyan-600 hover:text-cyan-700 bg-transparent border-none cursor-pointer hover:underline"
                                        >
                                          View
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 font-bold italic select-none py-1 pl-1">
                              No active requests or submissions.
                            </p>
                          )}
                        </div>

                        <div className="space-y-3 pt-4 border-t border-slate-200/60">
                          <div className="flex items-center gap-2 select-none">
                            <span className="text-[10px] bg-cyan-100 text-cyan-800 font-black tracking-wider uppercase px-2 py-1 rounded border border-cyan-200">
                              Agent Requests
                            </span>
                          </div>
                          {agentDocs.length > 0 ? (
                            <div className="flex flex-col gap-2">
                              {agentDocs.map((item, idx) => {
                                const { requestedAt, submittedAt } = getDocDetails(item.name, item.status);
                                return (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between py-3 px-4 bg-white border border-slate-200/70 rounded-xl hover:border-slate-300 transition-all shadow-sm"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                        item.status === "Pending" ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                                      }`} />
                                      <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-extrabold text-slate-800 truncate">{item.name}</span>
                                        <span className="text-[9px] text-slate-400 font-bold leading-none mt-0.5">
                                          {item.status === "Pending" ? (
                                            `Requested: ${requestedAt}`
                                          ) : (
                                            `Requested: ${requestedAt} ┬╖ Uploaded: ${submittedAt || "Recent"}`
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className={`text-[8px] font-black uppercase px-2 py-1 rounded select-none border ${
                                        item.status === "Pending"
                                          ? "bg-amber-100/80 text-amber-800 border-amber-200"
                                          : "bg-emerald-100/80 text-emerald-800 border-emerald-200"
                                      }`}>
                                        {item.status}
                                      </span>
                                      {item.status === "Submitted" && item.url && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            let docUrl = item.url;
                                            if (docUrl && !docUrl.startsWith("http") && !docUrl.startsWith("data:")) {
                                              docUrl = `${API_URL.replace("/api", "")}/uploads/${docUrl}`;
                                            }
                                            setPreviewImage(docUrl || null);
                                          }}
                                          className="text-[10px] font-black text-cyan-600 hover:text-cyan-700 bg-transparent border-none cursor-pointer hover:underline"
                                        >
                                          View
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 font-bold italic select-none py-1 pl-1">
                              No active requests or submissions.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Footer */}
              <div className="px-8 py-4 bg-white border-t border-slate-200 flex justify-between flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveSubModal(null)}
                  className="bg-[#0f2d4a] hover:bg-[#1a3d5e] text-white font-bold text-sm px-6 py-2 rounded-full transition-all border-none cursor-pointer flex items-center shadow-sm active:scale-95"
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
                <h2 className="text-[24px] font-black text-slate-900 tracking-tight leading-none">
                  Request Documents - {selectedClaim.claimNumber}
                </h2>
              </div>
              <div className="border-b border-black mx-8 mb-6" />

              {/* Body */}
              <div className="px-8 pb-4 flex-1 overflow-y-auto space-y-6">
                {/* Claim Summary */}
                <div className="text-left font-bold text-slate-800 space-y-1.5 text-[13px] select-none leading-relaxed">
                  <p>Vehicle No : <span className="font-medium text-slate-600">{formatPlate(selectedClaim.vehiclePlate)}</span></p>
                </div>

                {/* Fields */}
                <div className="space-y-4 pr-1">
                  {requestItems.map((item, index) => (
                    <div key={index} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 relative space-y-4">
                      {/* Remove Button on top right */}
                      {requestItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRequestItem(index)}
                          className="absolute top-4 right-4 text-slate-400 hover:text-red-500 font-extrabold text-lg bg-transparent border-none cursor-pointer p-1 transition-colors"
                          title="Remove this document request"
                        >
                          <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5 text-slate-400 hover:text-red-500" strokeWidth={2.5} />
                        </button>
                      )}

                      <div className="flex items-center gap-2 select-none mb-1">
                        <span className="w-6 h-6 rounded-full bg-[#0f2d4a] text-white flex items-center justify-center text-xs font-black">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <h4 className="text-slate-800 font-black text-xs uppercase tracking-wider">Document #{index + 1}</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Request From Selector */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider ml-1 select-none">Request From :</label>
                          <div className="flex gap-4 p-3 bg-white border border-slate-200 rounded-xl">
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                              <input
                                type="radio"
                                name={`reqRecipient-${index}`}
                                checked={item.recipient === "User"}
                                onChange={() => handleRequestItemChange(index, { recipient: "User" })}
                                className="w-4 h-4 accent-[#0f2d4a]"
                              />
                              <span className="text-xs font-bold text-slate-700">Policy Holder (User)</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                              <input
                                type="radio"
                                name={`reqRecipient-${index}`}
                                checked={item.recipient === "Agent"}
                                onChange={() => handleRequestItemChange(index, { recipient: "Agent" })}
                                className="w-4 h-4 accent-[#0f2d4a]"
                              />
                              <span className="text-xs font-bold text-slate-700">Assigned Agent</span>
                            </label>
                          </div>
                        </div>

                        {/* Document Type Dropdown */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider ml-1 select-none">Document Type :</label>
                          <select
                            value={item.docType}
                            onChange={(e) => handleRequestItemChange(index, { docType: e.target.value })}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2d4a]"
                          >
                            {item.recipient === "Agent" ? (
                              <>
                                <option value="Repair Estimate">Repair Estimate</option>
                                <option value="Inspection Photos">Inspection Photos</option>
                                <option value="Damage Assessment">Damage Assessment</option>
                                <option value="Underwriting Report">Underwriting Report</option>
                                <option value="Custom / Other">Custom / Other</option>
                              </>
                            ) : (
                              <>
                                <option value="NIC Front Page">NIC Front Page</option>
                                <option value="NIC Back Page">NIC Back Page</option>
                                <option value="License Front">License Front</option>
                                <option value="License Rear">License Rear</option>
                                <option value="Vehicle Registration">Vehicle Registration</option>
                                <option value="Revenue License">Revenue License</option>
                                <option value="Accident Photos">Accident Photos</option>
                                <option value="Repair Estimate">Repair Estimate</option>
                                <option value="Custom / Other">Custom / Other</option>
                              </>
                            )}
                          </select>
                        </div>
                      </div>

                      {/* Custom Document Name input field if Custom / Other is selected */}
                      {(item.docType === "Custom / Other" || item.docType === "Other") && (
                        <div className="flex flex-col gap-1.5 transition-all duration-300">
                          <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider ml-1 select-none">Custom Document Name :</label>
                          <input
                            type="text"
                            required
                            value={item.customName}
                            onChange={(e) => handleRequestItemChange(index, { customName: e.target.value })}
                            placeholder="E.g. Bank Book PDF, Towing Receipt..."
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2d4a]"
                          />
                        </div>
                      )}

                      {/* Add Note textarea */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider ml-1 select-none">Instructions / Note :</label>
                        <textarea
                          rows={2}
                          value={item.note}
                          onChange={(e) => handleRequestItemChange(index, { note: e.target.value })}
                          placeholder="E.g. Please upload a clear photo of the document..."
                          className="w-full p-4 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2d4a] resize-none"
                        />
                      </div>
                    </div>
                  ))}

                  {/* Add Another Document Button */}
                  <button
                    type="button"
                    onClick={handleAddRequestItem}
                    className="w-full py-4 border-2 border-dashed border-slate-300 hover:border-[#0f2d4a] rounded-2xl flex items-center justify-center gap-2 bg-slate-50/50 hover:bg-slate-50 text-xs font-bold text-slate-500 hover:text-[#0f2d4a] cursor-pointer transition-all duration-200 group"
                  >
                    <HugeiconsIcon icon={Add01Icon} className="w-4 h-4 text-slate-400 group-hover:text-[#0f2d4a] transition-colors" strokeWidth={2.5} />
                    Add Another Document Request
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="px-8 py-4 bg-white border-t border-slate-200 flex justify-between flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveSubModal(null);
                  }}
                  className="bg-[#0f2d4a] hover:bg-[#1a3d5e] text-white font-bold text-sm px-6 py-2 rounded-full transition-all border-none cursor-pointer flex items-center shadow-sm active:scale-95"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    // Validation
                    for (let i = 0; i < requestItems.length; i++) {
                      const item = requestItems[i];
                      const isCustom = item.docType === "Custom / Other" || item.docType === "Other";
                      if (isCustom && !item.customName.trim()) {
                        alert(`Please enter a custom document name for Document #${i + 1}.`);
                        return;
                      }
                    }

                    const currentDocs = selectedClaim.requestedDocuments || [];
                    const newDocs = requestItems.map(item => {
                      const isCustom = item.docType === "Custom / Other" || item.docType === "Other";
                      return isCustom ? item.customName.trim() : item.docType;
                    });

                    // Merge new docs into current requested docs
                    const updatedDocs = [...currentDocs];
                    newDocs.forEach(docName => {
                      if (!updatedDocs.includes(docName)) {
                        updatedDocs.push(docName);
                      }
                    });

                    // Prepare messages to append
                    const messageTexts = requestItems.map(item => {
                      const docName = item.docType === "Custom / Other" || item.docType === "Other" ? item.customName.trim() : item.docType;
                      const customMsg = item.note.trim() || `Please upload the requested document.`;
                      return {
                        message: `[Document Request to ${item.recipient}] Requested: ${docName}. Message: ${customMsg}`,
                        recipient: item.recipient === "Agent" ? "Agent" : "Policy Holder"
                      };
                    });

                    // Make the single API update request
                    const lastRecipient = requestItems[requestItems.length - 1].recipient;

                    await handleUpdateClaim(selectedClaim.claimNumber, {
                      documentsRequested: true,
                      requestedDocuments: updatedDocs,
                      documentRequestTo: lastRecipient,
                      messageTexts: messageTexts
                    });

                    setActiveSubModal(null);
                    alert("Document requests sent successfully!");
                  }}
                  disabled={updatingClaim}
                  className="bg-[#0f2d4a] hover:bg-[#1a3d5e] text-white font-bold text-sm px-6 py-2 rounded-full transition-all border-none cursor-pointer flex items-center shadow-sm active:scale-95 disabled:opacity-50"
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
                <h2 className="text-[24px] font-black text-slate-900 tracking-tight leading-none">
                  Add Note - {selectedClaim.claimNumber}
                </h2>
              </div>
              <div className="border-b border-black mx-8 mb-6" />

              {/* Body */}
              <div className="px-8 pb-8 flex-1 overflow-y-auto space-y-6">
                {/* Claim Summary */}
                <div className="text-left font-bold text-slate-800 space-y-1.5 text-[13px] select-none leading-relaxed">
                  <p>Vehicle No : <span className="font-medium text-slate-600">{formatPlate(selectedClaim.vehiclePlate)}</span></p>
                </div>

                {/* Fields */}
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-bold text-slate-800 ml-1 select-none">Add Note :</label>
                    <textarea
                      rows={5}
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                      placeholder="Enter internal text note..."
                      className="w-full p-4 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 bg-[#e2e8f0] focus:outline-none focus:ring-2 focus:ring-[#0f2d4a] resize-none"
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
                  className="bg-[#0f2d4a] hover:bg-[#1a3d5e] text-white font-bold text-sm px-6 py-2 rounded-full transition-all border-none cursor-pointer flex items-center shadow-sm active:scale-95"
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
                  className="bg-[#0f2d4a] hover:bg-[#1a3d5e] text-white font-bold text-sm px-6 py-2 rounded-full transition-all border-none cursor-pointer flex items-center shadow-sm active:scale-95 disabled:opacity-50"
                >
                  Submit
                </button>
              </div>
            </div>
          )}

          {/* SUB-MODAL 4: CONTACT & TIMELINE */}
          {activeSubModal === "contact" && (
            <div className="bg-white border border-slate-200 rounded-[32px] w-full max-w-[800px] h-[650px] max-h-[90vh] shadow-2xl flex flex-col relative transition-all duration-300 overflow-hidden">
              {/* Header */}
              <div className="px-8 pt-6 pb-2 select-none bg-white">
                <h2 className="text-[24px] font-black text-slate-900 tracking-tight leading-none">
                  Contact - {selectedClaim.claimNumber}
                </h2>
              </div>
              <div className="border-b border-black mx-8 mb-6" />

              {/* Body */}
              <div className="px-8 pb-8 flex-1 overflow-y-auto space-y-4">
                {/* Claim Summary */}
                <div className="text-left font-bold text-slate-800 space-y-1.5 text-[13px] select-none leading-relaxed">
                  <p>Vehicle No : <span className="font-medium text-slate-600">{formatPlate(selectedClaim.vehiclePlate)}</span></p>
                </div>

                {/* Stakeholders details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 select-none">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Policy Holder</span>
                    <h5 className="text-xs font-extrabold text-slate-800">{getPolicyHolderName(selectedClaim.userNic)}</h5>
                    <div className="text-[11px] text-slate-600 font-semibold">
                      <p>NIC: {selectedClaim.userNic}</p>
                      <p>Phone: {getPolicyHolderContact(selectedClaim.userNic)}</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Assigned Agent</span>
                    {selectedClaim.assignedAgent ? (
                      <>
                        <h5 className="text-xs font-extrabold text-slate-800">{getAgentName(selectedClaim.assignedAgent)}</h5>
                        <div className="text-[11px] text-slate-600 font-semibold">
                          <p>Email: {selectedClaim.assignedAgent}</p>
                          {(() => {
                            const agentObj = agents.find(a => a.email.toLowerCase().trim() === selectedClaim.assignedAgent.toLowerCase().trim());
                            return agentObj ? <p>Phone: {agentObj.phone || "—"}</p> : null;
                          })()}
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-amber-600 font-bold italic py-2">No agent assigned.</p>
                    )}
                  </div>
                </div>

                {/* Chat Partner Selector Tabs */}
                <div className="flex gap-2 select-none border-b border-slate-100 pb-2">
                  <button
                    type="button"
                    onClick={() => setContactRecipient("Policy Holder")}
                    className={`flex-1 md:flex-none py-2 px-6 rounded-full text-xs font-black tracking-wide uppercase transition-all border cursor-pointer ${
                      contactRecipient === "Policy Holder"
                        ? "bg-[#0f2d4a] text-white border-transparent shadow-sm"
                        : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Policy Holder Chat
                  </button>
                  <button
                    type="button"
                    onClick={() => setContactRecipient("Agent")}
                    className={`flex-1 md:flex-none py-2 px-6 rounded-full text-xs font-black tracking-wide uppercase transition-all border cursor-pointer ${
                      contactRecipient === "Agent"
                        ? "bg-[#0f2d4a] text-white border-transparent shadow-sm"
                        : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Agent Chat
                  </button>
                </div>

                {/* Chat timeline */}
                <div className="bg-slate-100 rounded-2xl p-5 border border-slate-200 flex-1 overflow-y-auto space-y-3.5 max-h-[160px]">
                  {(() => {
                    const filteredMessages = selectedClaim.messages.filter((msg) => {
                      if (contactRecipient === "Policy Holder") {
                        return msg.recipient === "Policy Holder" || !msg.recipient;
                      } else {
                        return msg.recipient === "Agent";
                      }
                    });

                    if (contactRecipient === "Agent" && !selectedClaim.assignedAgent) {
                      return (
                        <div className="text-center text-xs text-amber-600 italic py-6 font-bold select-none">
                          ΓÜá∩╕Å No agent has been assigned to this claim yet. Please assign an agent first.
                        </div>
                      );
                    }

                    if (filteredMessages.length === 0) {
                      return (
                        <div className="text-center text-xs text-slate-400 italic py-2 font-semibold select-none">
                          No message history recorded with {contactRecipient === "Policy Holder" ? "Policy Holder" : "Agent"}.
                        </div>
                      );
                    }

                    return filteredMessages.map((msg, index) => {
                      const isSelf = msg.sender === "Office Staff";
                      return (
                        <div key={index} className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}>
                          <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-xs shadow-sm ${
                            isSelf ? "bg-[#0f2d4a] text-white rounded-tr-none" : "bg-white border border-slate-200 text-slate-700 rounded-tl-none"
                          }`}>
                            <p className="font-semibold leading-relaxed break-words whitespace-pre-wrap">{msg.message}</p>
                          </div>
                          <span className="text-[9px] text-slate-400 font-bold mt-1 select-none px-1">
                            {msg.sender} ┬╖ {formatMessageTime(msg.sentAt)}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Send message text box */}
                <div className="select-none">
                  <div className="flex gap-3">
                    <textarea
                      id="message-input"
                      rows={2}
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                      placeholder={contactRecipient === "Agent" && !selectedClaim.assignedAgent ? "Cannot message (No agent assigned)" : `Type a message to ${contactRecipient === "Policy Holder" ? "Policy Holder" : "Agent"}...`}
                      disabled={contactRecipient === "Agent" && !selectedClaim.assignedAgent}
                      className="flex-1 p-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none bg-[#e2e8f0] focus:ring-2 focus:ring-[#0f2d4a] resize-none disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (newMessageText.trim()) {
                          await handleUpdateClaim(selectedClaim.claimNumber, {
                            messageText: newMessageText.trim(),
                            messageRecipient: contactRecipient
                          });
                          setNewMessageText("");
                        }
                      }}
                      disabled={updatingClaim || !newMessageText.trim() || (contactRecipient === "Agent" && !selectedClaim.assignedAgent)}
                      className="bg-[#0f2d4a] hover:bg-[#1a3d5e] text-white font-extrabold text-xs px-5 py-4 rounded-xl border-none cursor-pointer disabled:opacity-50"
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
                  className="bg-[#0f2d4a] hover:bg-[#1a3d5e] text-white font-bold text-sm px-6 py-2 rounded-full transition-all border-none cursor-pointer flex items-center shadow-sm active:scale-95"
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
                <h2 className="text-[24px] font-black text-slate-900 tracking-tight leading-none">
                  Update Tracking - {selectedClaim.claimNumber}
                </h2>
              </div>
              <div className="border-b border-black mx-8 mb-6" />

              {/* Body */}
              <div className="px-8 pb-8 flex-1 overflow-y-auto space-y-6">
                {/* Claim Summary */}
                <div className="text-left font-bold text-slate-800 space-y-1.5 text-[13px] select-none leading-relaxed flex items-center justify-between">
                  <p>Vehicle No : <span className="font-medium text-slate-600">{formatPlate(selectedClaim.vehiclePlate)}</span></p>
                  <button
                    type="button"
                    onClick={() => setIsManualMode(!isManualMode)}
                    className="bg-[#f97316] hover:bg-orange-600 text-white font-extrabold text-[11px] px-4 py-2 rounded-full transition-all border-none cursor-pointer shadow-sm active:scale-95 flex items-center gap-1.5"
                  >
                    {isManualMode ? "\u2699\uFE0F Standard Flow" : "\u270D\uFE0F Update Manually"}
                  </button>
                </div>

                {isManualMode ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-5 transition-all duration-300 text-left">
                    <div className="bg-slate-900 border border-slate-800 rounded-[24px] p-5 shadow-md text-white flex flex-col justify-between hover:border-slate-800 transition-all duration-200 select-none">
                      <span className="text-[10px] text-cyan-400 font-extrabold uppercase tracking-wider block flex items-center gap-1.5">
                        <HugeiconsIcon icon={Alert02Icon} className="w-4 h-4 text-cyan-400" strokeWidth={2.2} />
                        Manual Override Guidelines
                      </span>
                      <p className="text-slate-300 text-xs font-semibold leading-relaxed mt-3">
                        Manually updating the tracking step overrides standard background automated workflows (such as waiting for agent assignments, report submissions, or system document checks). Use this feature only when standard automated progression cannot continue, and document a valid justification below.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Select Step */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[13px] font-bold text-slate-800 ml-1">Target Tracking Step :</label>
                        <select
                          value={manualStep}
                          onChange={(e) => setManualStep(e.target.value ? Number(e.target.value) : "")}
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2d4a]"
                        >
                          <option value="">Select Target Step</option>
                          <option value={1}>Step 1: Assignment / Registration</option>
                          <option value={2}>Step 2: Agent Acceptance</option>
                          <option value={3}>Step 3: Inspection in Progress</option>
                          <option value={4}>Step 4: Review Inspection Report</option>
                          <option value={5}>Step 5: Underwriting / Decision</option>
                          <option value={6}>Step 6: Payment Processing</option>
                        </select>
                      </div>

                      {/* Updated Person Name */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[13px] font-bold text-slate-800 ml-1">Updated Person Name :</label>
                        <input
                          type="text"
                          value={manualUpdateByVal}
                          onChange={(e) => setManualUpdateByVal(e.target.value)}
                          placeholder="Enter your name"
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2d4a]"
                        />
                      </div>
                    </div>

                    {/* Reason Textbox */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-bold text-slate-800 ml-1">Reason for Manual Update :</label>
                      <textarea
                        rows={3}
                        value={manualReason}
                        onChange={(e) => setManualReason(e.target.value)}
                        placeholder="Explain why you are overriding tracking (e.g. holder provided documents offline, override agent inspection lock...)"
                        className="w-full p-4 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2d4a] resize-none"
                      />
                    </div>

                    {/* Actions */}
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={async () => {
                          if (manualStep === "") {
                            alert("Please select a target tracking step.");
                            return;
                          }
                          if (!manualUpdateByVal.trim()) {
                            alert("Please enter the name of the person performing this manual update.");
                            return;
                          }
                          if (!manualReason.trim()) {
                            alert("Please enter a reason for manually updating the tracking status.");
                            return;
                          }
                          let targetStatus = "In Progress";
                          if (manualStep === 1) targetStatus = "Pending";
                          else if (manualStep === 6) targetStatus = "Approved";

                          const confirmMsg = `Warning:\nYou are about to perform a manual override on the tracking step for claim ${selectedClaim.claimNumber}.\n\n` +
                            `New Step: ${manualStep}\n` +
                            `New Status: ${targetStatus}\n` +
                            `Updated By: ${manualUpdateByVal.trim()}\n` +
                            `Reason: ${manualReason.trim()}\n\n` +
                            `This bypasses normal workflow automation rules. Are you sure you want to proceed?`;
                          
                          if (window.confirm(confirmMsg)) {
                            await handleUpdateClaim(selectedClaim.claimNumber, {
                              currentStep: manualStep,
                              status: targetStatus,
                              isManuallyUpdated: true,
                              manualUpdateReason: manualReason.trim(),
                              manualUpdateBy: manualUpdateByVal.trim()
                            });
                            alert("Claim tracking step has been manually updated.");
                            setActiveSubModal(null);
                          }
                        }}
                        disabled={updatingClaim}
                        className="bg-[#0f2d4a] hover:bg-[#1a3d5e] text-white font-extrabold text-xs px-6 py-3 rounded-full transition-all border-none cursor-pointer disabled:opacity-50"
                      >
                        {updatingClaim ? "Processing..." : "Confirm Override"}
                      </button>
                    </div>
                  </div>
                ) : selectedClaim.status === "Rejected" ? (
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
                    {/* Render Step-Specific UI */}
                    {selectedClaim.currentStep === 1 && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center">
                        <p className="text-slate-600 font-bold text-sm">
                          Policy holder has applied for the claim. Waiting to assign an agent.
                        </p>
                      </div>
                    )}

                    {selectedClaim.currentStep === 2 && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center">
                        <p className="text-slate-600 font-bold text-sm">
                          Agent assigned. Waiting for the agent to accept the claim.
                        </p>
                      </div>
                    )}

                    {selectedClaim.currentStep === 3 && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center">
                        <p className="text-slate-600 font-bold text-sm">
                          Inspection in progress. Waiting for agent report.
                        </p>
                      </div>
                    )}

                    {selectedClaim.currentStep === 4 && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-4">
                        <p className="text-slate-600 font-bold text-sm">
                          Inspection report has been submitted by the agent. Please review the details.
                        </p>
                        <button
                          type="button"
                          onClick={async () => {
                            await handleUpdateClaim(selectedClaim.claimNumber, { currentStep: 5 });
                            alert("Advanced to Decision (Step 5) successfully!");
                          }}
                          disabled={updatingClaim}
                          className="bg-[#0f2d4a] hover:bg-[#1a3d5e] text-white font-extrabold text-xs px-6 py-3 rounded-full transition-all border-none cursor-pointer disabled:opacity-50"
                        >
                          {updatingClaim ? "Updating..." : "Proceed to Decision (Step 5)"}
                        </button>
                      </div>
                    )}

                    {selectedClaim.currentStep === 5 && (
                      <div className="space-y-4">
                        <div className="flex gap-4">
                          <button
                            type="button"
                            onClick={() => setDecisionAction("Approve")}
                            className={`flex-1 py-3 px-6 rounded-xl text-xs font-black tracking-wide uppercase transition-all border cursor-pointer ${
                              decisionAction === "Approve"
                                ? "bg-emerald-600 text-white border-transparent shadow-sm"
                                : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            Approve Claim
                          </button>
                          <button
                            type="button"
                            onClick={() => setDecisionAction("Reject")}
                            className={`flex-1 py-3 px-6 rounded-xl text-xs font-black tracking-wide uppercase transition-all border cursor-pointer ${
                              decisionAction === "Reject"
                                ? "bg-red-600 text-white border-transparent shadow-sm"
                                : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            Reject Claim
                          </button>
                        </div>

                        {decisionAction === "Approve" && (
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 transition-all duration-300">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[13px] font-bold text-slate-800 ml-1">Estimate Amount (LKR) :</label>
                              <input
                                type="number"
                                value={assessmentAmount}
                                onChange={(e) => setAssessmentAmount(e.target.value)}
                                placeholder="Enter estimate amount"
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2d4a]"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                const amountNum = parseFloat(assessmentAmount);
                                if (isNaN(amountNum) || amountNum <= 0) {
                                  alert("Please enter a valid estimate amount.");
                                  return;
                                }
                                await handleUpdateClaim(selectedClaim.claimNumber, {
                                  status: "Approved",
                                  amount: amountNum,
                                  currentStep: 6
                                });
                                alert("Claim approved and advanced to Payment step!");
                              }}
                              disabled={updatingClaim}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-6 py-3 rounded-full transition-all border-none cursor-pointer disabled:opacity-50"
                            >
                              {updatingClaim ? "Processing..." : "Confirm Approval"}
                            </button>
                          </div>
                        )}

                        {decisionAction === "Reject" && (
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 transition-all duration-300">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[13px] font-bold text-slate-800 ml-1">Rejection Reason :</label>
                              <textarea
                                rows={3}
                                value={rejectionReasonText}
                                onChange={(e) => setRejectionReasonText(e.target.value)}
                                placeholder="Enter reason for rejection"
                                className="w-full p-4 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2d4a] resize-none"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!rejectionReasonText.trim()) {
                                  alert("Please specify a rejection reason.");
                                  return;
                                }
                                await handleUpdateClaim(selectedClaim.claimNumber, {
                                  status: "Rejected",
                                  rejectionReason: rejectionReasonText.trim(),
                                  currentStep: 5
                                });
                                alert("Claim has been rejected.");
                              }}
                              disabled={updatingClaim}
                              className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs px-6 py-3 rounded-full transition-all border-none cursor-pointer disabled:opacity-50"
                            >
                              {updatingClaim ? "Processing..." : "Confirm Rejection"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {selectedClaim.currentStep === 6 && (
                      <div className="space-y-4">
                        {selectedClaim.policyHolderBankDetails && (
                          <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 space-y-3">
                            <div className="flex items-center gap-2 text-emerald-800">
                              <HugeiconsIcon icon={Location01Icon} className="w-5 h-5 text-emerald-600" strokeWidth={2.5} />
                              <span className="text-[10px] font-black uppercase tracking-wider select-none">Registered Bank Settlement Profile</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
                              <div>
                                <span className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-wider select-none">Account Holder Name</span>
                                <span className="block text-slate-800 text-xs font-bold mt-0.5">{selectedClaim.policyHolderBankDetails.accountHolderName || "N/A"}</span>
                              </div>
                              <div>
                                <span className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-wider select-none">Bank Name</span>
                                <span className="block text-slate-800 text-xs font-bold mt-0.5">{selectedClaim.policyHolderBankDetails.bankName || "N/A"}</span>
                              </div>
                              <div>
                                <span className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-wider select-none">Branch Name</span>
                                <span className="block text-slate-800 text-xs font-bold mt-0.5">{selectedClaim.policyHolderBankDetails.branchName || "N/A"}</span>
                              </div>
                              <div>
                                <span className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-wider select-none">Account Number</span>
                                <span className="block text-slate-800 text-xs font-bold mt-0.5">{selectedClaim.policyHolderBankDetails.accountNumber || "N/A"}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                          <h3 className="text-sm font-black text-slate-800 border-b pb-2 uppercase tracking-wide">
                            Confirm Payout Details
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[11px] font-bold text-slate-500 uppercase">Bank Name</label>
                              <input
                                type="text"
                                value={bankName}
                                onChange={(e) => setBankName(e.target.value)}
                                placeholder="e.g. Bank of Ceylon"
                                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2d4a]"
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[11px] font-bold text-slate-500 uppercase">Branch Name</label>
                              <input
                                type="text"
                                value={bankBranch}
                                onChange={(e) => setBankBranch(e.target.value)}
                                placeholder="e.g. Colombo Fort"
                                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2d4a]"
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[11px] font-bold text-slate-500 uppercase">Account Number</label>
                              <input
                                type="text"
                                value={bankAccount}
                                onChange={(e) => setBankAccount(e.target.value)}
                                placeholder="e.g. 12345678"
                                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2d4a]"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                          <h3 className="text-sm font-black text-slate-800 border-b pb-2 uppercase tracking-wide">
                            Payment Receipt
                          </h3>
                          
                          {selectedClaim.paymentReceipt ? (
                            <div className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-xl shadow-sm">
                              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 select-none">
                                <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
                                Receipt Uploaded
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
                                className="text-xs font-extrabold text-cyan-600 hover:text-cyan-700 bg-transparent border-none cursor-pointer"
                              >
                                View Receipt File
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <label className="text-xs font-bold text-slate-600 select-none">Upload Bank Transfer Receipt (Image/PDF) :</label>
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    setPaymentReceiptFile(e.target.files[0]);
                                  }
                                }}
                                className="text-xs font-semibold text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-extrabold file:bg-slate-200 file:text-slate-800 file:cursor-pointer"
                              />
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={async () => {
                            if (!bankName.trim() || !bankBranch.trim() || !bankAccount.trim()) {
                              alert("Please fill in all policy holder bank details first.");
                              return;
                            }

                            try {
                              setIsUploadingReceipt(true);
                              let receiptBase64 = undefined;
                              
                              if (paymentReceiptFile) {
                                const convertToBase64 = (file: File): Promise<string> => {
                                  return compressImage(file);
                                };
                                receiptBase64 = await convertToBase64(paymentReceiptFile);
                              }

                              await handleUpdateClaim(selectedClaim.claimNumber, {
                                bankName: bankName.trim(),
                                bankBranch: bankBranch.trim(),
                                bankAccount: bankAccount.trim(),
                                paymentReceipt: receiptBase64,
                                status: "Approved",
                                currentStep: 6
                              });

                              alert("Claim details and bank transfer receipt updated successfully! Claim process completed.");
                              setActiveSubModal(null);
                            } catch (uploadErr) {
                              console.error(uploadErr);
                              alert("An error occurred while uploading the receipt.");
                            } finally {
                              setIsUploadingReceipt(false);
                            }
                          }}
                          disabled={updatingClaim || isUploadingReceipt}
                          className="w-full bg-[#0f2d4a] hover:bg-[#1a3d5e] text-white font-extrabold text-xs py-4 rounded-xl border-none cursor-pointer text-center select-none shadow-sm active:scale-95 disabled:opacity-50"
                        >
                          {isUploadingReceipt ? "Uploading Receipt..." : updatingClaim ? "Completing claim..." : "Complete Claim Process"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-8 py-4 bg-white border-t border-slate-200 flex justify-end flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveSubModal(null);
                    setDecisionAction(null);
                  }}
                  className="bg-[#0f2d3a] hover:bg-[#0b222c] text-white font-bold text-sm px-6 py-2 rounded-full transition-all border-none cursor-pointer flex items-center justify-center shadow-[0_4px_12px_rgba(15,45,58,0.25)] active:scale-95"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* MAIN DETAILS MODAL */}
          {activeSubModal === null && (
            <div className="bg-white border border-slate-200 rounded-[32px] w-full max-w-[800px] h-[650px] max-h-[90vh] shadow-2xl flex flex-col relative transition-all duration-300 overflow-hidden">
              {/* Modal Header */}
              <div className="px-8 pt-6 pb-2 select-none bg-white">
                <h2 className="text-[24px] font-black text-slate-900 tracking-tight leading-none">
                  {selectedClaim.claimNumber}
                </h2>
              </div>
              <div className="border-b border-black mx-8 mb-6" />

              {/* Modal Body */}
              <div className="px-8 pb-8 flex-1 overflow-y-auto space-y-6">
                {selectedClaim.isManuallyUpdated && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-left transition-all duration-300 select-none">
                    <span className="text-xl">ΓÜá∩╕Å</span>
                    <div className="flex-1">
                      <h4 className="text-xs font-black text-amber-800 uppercase tracking-wide">Manual Override Active</h4>
                      <p className="text-xs text-amber-700 font-semibold mt-1">
                        Reason: <span className="font-bold text-slate-800">{selectedClaim.manualUpdateReason}</span>
                      </p>
                      <p className="text-[10px] text-amber-600 font-bold mt-0.5">
                        Updated by: {selectedClaim.manualUpdateBy} {selectedClaim.manualUpdateAt ? `on ${formatDate(selectedClaim.manualUpdateAt)}` : ""}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* 2-Column Details Block */}
                <div className="grid grid-cols-1 md:grid-cols-[1.8fr_1fr] gap-8 select-none">
                  {/* Left Side Details Grid */}
                  <div className="space-y-4 text-sm font-bold text-slate-800 leading-normal">
                    <div>
                      Vehicle No : <span className="font-medium text-slate-600">{formatPlate(selectedClaim.vehiclePlate)}</span>
                    </div>
                    <div>
                      Policy Holder Name - <span className="font-medium text-slate-600">{getPolicyHolderName(selectedClaim.userNic)}</span>
                    </div>
                    <div>
                      Contact - <span className="font-medium text-slate-600">{getPolicyHolderContact(selectedClaim.userNic)}</span>
                    </div>
                    <div className="pt-4 border-t border-slate-200 space-y-4 mt-2">
                      <p>
                        Location : <span className="font-medium text-slate-600">{selectedClaim.location}</span>
                      </p>
                      <p>
                        Time : <span className="font-medium text-slate-600">{claimDateString(selectedClaim.incidentDate)} @ {selectedClaim.incidentTime}</span>
                      </p>
                      <p>
                        Est. Amount : <span className="font-medium text-slate-600">{selectedClaim.amount ? `LKR ${selectedClaim.amount.toLocaleString()}` : "Not Assessed"}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right Side Column */}
                  <div className="flex flex-col space-y-4">
                    <div className="space-y-2 text-sm font-bold text-slate-800">
                      <div className="flex items-center gap-2 flex-wrap">
                        Agent : <span className="font-medium text-slate-600">{selectedClaim.assignedAgent ? getAgentName(selectedClaim.assignedAgent) : "Unassigned"}</span>
                        {(!selectedClaim.assignedAgent || selectedClaim.assignedAgent === "" || selectedClaim.assignedAgent.toLowerCase() === "unassigned") && selectedClaim.status !== "Cancelled" && (
                          <button
                            type="button"
                            onClick={() => setShowAssignModal(selectedClaim)}
                            className="bg-[#f97316] hover:bg-orange-600 active:scale-95 text-white py-1 px-3.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border-none cursor-pointer flex items-center justify-center shadow-xs"
                          >
                            Assign Agent
                          </button>
                        )}
                      </div>
                      <div>
                        Type : <span className="font-medium text-slate-600">{selectedClaim.damageType}</span>
                      </div>
                      <div>
                        Status : <span className={selectedClaim.priority === "Urgent" || selectedClaim.status === "Rejected" ? "text-red-500 font-extrabold" : "font-medium text-slate-600"}>{selectedClaim.status}</span>
                      </div>
                    </div>

                    {/* Cyan Buttons Stack */}
                    <div className="pt-2 flex flex-col gap-3">
                      {selectedClaim.inspectionSubmitted && selectedClaim.inspectionReport && (
                        <button
                          type="button"
                          onClick={() => setPreviewReportText(selectedClaim.inspectionReport || null)}
                          className="bg-[#10b981] hover:bg-[#059669] text-white font-extrabold text-xs py-3 rounded-full transition-all border-none cursor-pointer text-center select-none shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          <HugeiconsIcon icon={File01Icon} className="w-4 h-4 text-white" strokeWidth={2.5} />
                          Inspection Report
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveSubModal("documents")}
                        className="bg-[#00c5ff] hover:bg-[#00b0e6] text-white font-extrabold text-xs py-3 rounded-full transition-all border-none cursor-pointer text-center select-none shadow-sm active:scale-95"
                      >
                        Documents
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveSubModal("contact")}
                        className="bg-[#00c5ff] hover:bg-[#00b0e6] text-white font-extrabold text-xs py-3 rounded-full transition-all border-none cursor-pointer text-center select-none shadow-sm active:scale-95"
                      >
                        Contact
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAllDetails(!showAllDetails)}
                        className="bg-[#0f2d4a] hover:bg-[#1a3d5e] text-white font-extrabold text-xs py-3 rounded-full transition-all border-none cursor-pointer text-center select-none shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        {showAllDetails ? (
                          <>
                            <span>View Less Details</span>
                            <HugeiconsIcon icon={ArrowUp01Icon} className="w-4 h-4 text-white" strokeWidth={2.5} />
                          </>
                        ) : (
                          <>
                            <span>View More Details</span>
                            <HugeiconsIcon icon={ArrowDown01Icon} className="w-4 h-4 text-white" strokeWidth={2.5} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expandable Section: Description & Uploaded Photos */}
                {showAllDetails && (
                  <div className="border-t border-slate-200 pt-6 select-text flex flex-col gap-6 text-left transition-all duration-300">
                    
                    {/* Claim Description Section */}
                    <div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-3 select-none">Claim Description</h3>
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left">
                        <p className="text-xs font-semibold text-slate-600 leading-relaxed whitespace-pre-line text-left">
                          {selectedClaim.description || "No description provided."}
                        </p>
                      </div>
                    </div>

                    {/* Other Vehicles Involved Section */}
                    {selectedClaim.otherVehicleDetails && (
                      <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-3 select-none">Other Vehicles Involved</h3>
                        {Array.isArray(selectedClaim.otherVehicleDetails) ? (
                          selectedClaim.otherVehicleDetails.length === 0 ? (
                            <div className="text-xs text-slate-500 italic select-none">No other vehicles involved.</div>
                          ) : (
                            <div className="space-y-4">
                              {selectedClaim.otherVehicleDetails.map((vehicle: any, vIdx: number) => (
                                <div key={vIdx} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 text-left">
                                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider select-none">Vehicle #{vIdx + 1}</h4>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-left">
                                    <div>
                                      <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider select-none">Vehicle Number</span>
                                      <span className="block text-slate-800 text-xs font-bold mt-0.5">{vehicle.vehiclePlate || "—"}</span>
                                    </div>
                                    <div>
                                      <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider select-none">Driver Name</span>
                                      <span className="block text-slate-800 text-xs font-bold mt-0.5">{vehicle.driverName || "—"}</span>
                                    </div>
                                    <div>
                                      <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider select-none">Insurance Name</span>
                                      <span className="block text-slate-800 text-xs font-bold mt-0.5">{vehicle.insuranceCompany || "—"}</span>
                                    </div>
                                    <div>
                                      <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider select-none">Insurance Number</span>
                                      <span className="block text-slate-800 text-xs font-bold mt-0.5">{vehicle.policyNumber || "—"}</span>
                                    </div>
                                  </div>

                                  {/* License Photos */}
                                  {vehicle.licensePhotos && vehicle.licensePhotos.length > 0 && (
                                    <div className="pt-2.5 border-t border-slate-200">
                                      <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 select-none">Driver's License Photos</span>
                                      <div className="flex flex-wrap gap-2.5">
                                        {vehicle.licensePhotos.map((url: string, idx: number) => {
                                          let docUrl = url;
                                          if (docUrl && !docUrl.startsWith("http") && !docUrl.startsWith("data:")) {
                                            docUrl = `${API_URL.replace("/api", "")}/uploads/${docUrl}`;
                                          }
                                          return (
                                            <div 
                                              key={idx}
                                              onClick={() => setPreviewImage(docUrl || null)}
                                              className="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden cursor-pointer hover:opacity-90 active:scale-95 transition-all shadow-xs"
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
                                    <div className="pt-2.5 border-t border-slate-200">
                                      <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 select-none">Vehicle / Damage Photos</span>
                                      <div className="flex flex-wrap gap-2.5">
                                        {vehicle.vehiclePhotos.map((url: string, idx: number) => {
                                          let docUrl = url;
                                          if (docUrl && !docUrl.startsWith("http") && !docUrl.startsWith("data:")) {
                                            docUrl = `${API_URL.replace("/api", "")}/uploads/${docUrl}`;
                                          }
                                          return (
                                            <div 
                                              key={idx}
                                              onClick={() => setPreviewImage(docUrl || null)}
                                              className="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden cursor-pointer hover:opacity-90 active:scale-95 transition-all shadow-xs"
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
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 text-left">
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-left">
                                <div>
                                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider select-none">Vehicle Number</span>
                                  <span className="block text-slate-800 text-xs font-bold mt-0.5">{selectedClaim.otherVehicleDetails.vehiclePlate || "—"}</span>
                                </div>
                                <div>
                                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider select-none">Driver Name</span>
                                  <span className="block text-slate-800 text-xs font-bold mt-0.5">{selectedClaim.otherVehicleDetails.driverName || "—"}</span>
                                </div>
                                <div>
                                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider select-none">Insurance Name</span>
                                  <span className="block text-slate-800 text-xs font-bold mt-0.5">{selectedClaim.otherVehicleDetails.insuranceCompany || "—"}</span>
                                </div>
                                <div>
                                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider select-none">Insurance Number</span>
                                  <span className="block text-slate-800 text-xs font-bold mt-0.5">{selectedClaim.otherVehicleDetails.policyNumber || "—"}</span>
                                </div>
                              </div>

                              {/* License Photos */}
                              {selectedClaim.otherVehicleDetails.licensePhotos && selectedClaim.otherVehicleDetails.licensePhotos.length > 0 && (
                                <div className="pt-2.5 border-t border-slate-200">
                                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 select-none">Other Driver's License Photos</span>
                                  <div className="flex flex-wrap gap-2.5">
                                    {selectedClaim.otherVehicleDetails.licensePhotos.map((url: string, idx: number) => {
                                      let docUrl = url;
                                      if (docUrl && !docUrl.startsWith("http") && !docUrl.startsWith("data:")) {
                                        docUrl = `${API_URL.replace("/api", "")}/uploads/${docUrl}`;
                                      }
                                      return (
                                        <div 
                                          key={idx}
                                          onClick={() => setPreviewImage(docUrl || null)}
                                          className="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden cursor-pointer hover:opacity-90 active:scale-95 transition-all shadow-xs"
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
                                <div className="pt-2.5 border-t border-slate-200">
                                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 select-none">Other Vehicle / Scene Photos</span>
                                  <div className="flex flex-wrap gap-2.5">
                                    {selectedClaim.otherVehicleDetails.vehiclePhotos.map((url: string, idx: number) => {
                                      let docUrl = url;
                                      if (docUrl && !docUrl.startsWith("http") && !docUrl.startsWith("data:")) {
                                        docUrl = `${API_URL.replace("/api", "")}/uploads/${docUrl}`;
                                      }
                                      return (
                                        <div 
                                          key={idx}
                                          onClick={() => setPreviewImage(docUrl || null)}
                                          className="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden cursor-pointer hover:opacity-90 active:scale-95 transition-all shadow-xs"
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

                    {/* Uploaded Documents & Photos Section */}
                    <div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-3 select-none">Uploaded Documents & Photos</h3>
                      <div className="text-left">
                        {(() => {
                          const phDocs: { name: string; url: string }[] = [];
                          
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
                            return <p className="text-xs text-slate-400 font-bold italic select-none py-2 text-left">No documents or photos uploaded.</p>;
                          }

                          return (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
                              {phDocs.map((doc, idx) => {
                                let docUrl = doc.url;
                                if (docUrl && !docUrl.startsWith("http") && !docUrl.startsWith("data:")) {
                                  docUrl = `${API_URL.replace("/api", "")}/uploads/${docUrl}`;
                                }
                                return (
                                  <div key={idx} className="flex flex-col gap-1.5">
                                    <span className="text-[10px] font-extrabold text-slate-500 truncate select-none">{doc.name}</span>
                                    <div 
                                      onClick={() => setPreviewImage(docUrl || null)}
                                      className="aspect-[4/3] rounded-xl border border-slate-200 overflow-hidden bg-slate-100 cursor-pointer hover:opacity-90 active:scale-98 transition-all relative group shadow-sm flex items-center justify-center"
                                    >
                                      {docUrl ? (
                                        <img 
                                          src={docUrl} 
                                          alt={doc.name} 
                                          className="w-full h-full object-cover" 
                                          onError={(e) => {
                                            e.currentTarget.style.display = "none";
                                          }}
                                        />
                                      ) : (
                                        <span className="text-[10px] text-slate-400 font-bold">No Preview</span>
                                      )}
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                        <HugeiconsIcon icon={Search01Icon} className="w-5 h-5 text-white" strokeWidth={2.5} />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* AI Damage Analysis Section */}
                    {selectedClaim.aiAnalysis?.isAnalyzed ? (
                      <div className="mt-4">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-3 select-none">🤖 AI Damage Analysis</h3>
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left flex flex-col gap-4">
                          <p className="text-xs font-semibold text-slate-600 leading-relaxed italic">
                            "{selectedClaim.aiAnalysis.summary}"
                          </p>
                          <div className="text-xs font-bold text-slate-700">
                            Overall Estimated Damage: <span className="text-emerald-600 font-extrabold text-sm">{selectedClaim.aiAnalysis.overallDamagePercentage}%</span>
                          </div>
                          
                          <div className="border-t border-slate-200 pt-3">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Damaged Items Breakdown</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {selectedClaim.aiAnalysis.damagedItems?.map((part, index) => (
                                <div key={index} className="flex justify-between items-center border border-slate-200 bg-white p-3 rounded-xl shadow-sm">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-xs font-extrabold text-slate-800">{part.item}</span>
                                    <span className="text-[10px] text-slate-500 font-medium">{part.description}</span>
                                  </div>
                                  <span className="text-xs font-black px-2.5 py-1 bg-red-50 text-red-500 rounded-full">{part.damagePercentage}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-6 text-center">
                        <span className="text-2xl mb-2 block">🤖</span>
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-1">AI Damage Assessment Pending</h4>
                        <p className="text-[10px] text-slate-500 mb-4 max-w-[320px] mx-auto leading-relaxed">
                          This claim does not have AI analysis data yet. You can trigger it manually now.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleRunAIAnalysis(selectedClaim.claimNumber)}
                          disabled={analyzingClaim === selectedClaim.claimNumber}
                          className="bg-[#0f2d4a] hover:bg-[#1a446c] text-white text-[10px] font-extrabold px-6 py-2.5 rounded-full shadow transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                        >
                          {analyzingClaim === selectedClaim.claimNumber ? "Analyzing Damage..." : "Run AI Damage Assessment"}
                        </button>
                      </div>
                    )}

                  </div>
                )}

                {/* Progress Stepper Section */}
                <div className="pt-6 pb-2 px-2 select-none border-t border-slate-100">
                  <div className="flex items-center justify-between relative max-w-[650px] mx-auto">
                    {/* Connecting Line background (navy) */}
                    <div className="absolute top-[18px] left-[20px] right-[20px] h-1 bg-[#0f2d4a] -z-10 rounded-full" />
                    {/* Connecting Line active fill (green or red) */}
                    <div 
                      className={`absolute top-[18px] left-[20px] h-1 -z-10 rounded-full transition-all duration-500 ${
                        selectedClaim.status === "Rejected" ? "bg-red-500" : "bg-[#22c55e]"
                      }`} 
                      style={{ width: `${getStepperPercent(selectedClaim)}%` }} 
                    />

                    {getStepperSteps(selectedClaim).map((stepObj, idx) => {
                      const stepNum = idx + 1;
                      
                      // Calculate step status
                      let stepStatus: "completed" | "active" | "pending" = "pending";
                      if (selectedClaim.status === "Rejected") {
                        if (stepNum <= 5) {
                          stepStatus = "completed";
                        } else {
                          stepStatus = "pending";
                        }
                      } else {
                        const isPaid = (selectedClaim.status === "Approved" || selectedClaim.currentStep >= 6) && !!selectedClaim.paymentReceipt;
                        if (isPaid) {
                          stepStatus = "completed";
                        } else if (stepNum < selectedClaim.currentStep) {
                          stepStatus = "completed";
                        } else if (stepNum === selectedClaim.currentStep) {
                          stepStatus = "active";
                        } else {
                          stepStatus = "pending";
                        }
                      }

                      let circleStyle = "";
                      if (stepStatus === "completed") {
                        circleStyle = selectedClaim.status === "Rejected"
                          ? "text-red-500 border-red-500 shadow-sm shadow-red-500/10"
                          : "text-[#22c55e] border-[#22c55e] shadow-sm shadow-[#22c55e]/10";
                      } else if (stepStatus === "active") {
                        // Orange border/text and slightly highlighted bg for the active stage
                        circleStyle = "text-[#f97316] border-[#f97316] shadow-sm shadow-[#f97316]/20 bg-orange-50 font-black scale-105";
                      } else {
                        circleStyle = "text-[#0f2d4a]/40 border-[#0f2d4a]/20";
                      }

                      return (
                        <div key={idx} className="flex flex-col items-center flex-1 relative">
                          {/* Step Circle */}
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border-2 bg-white transition-all duration-300 ${circleStyle}`}>
                            {stepStatus === "completed" && selectedClaim.status !== "Rejected" ? (
                              <HugeiconsIcon icon={Tick01Icon} className="w-4 h-4 text-[#22c55e]" strokeWidth={3} />
                            ) : (
                              stepObj.num
                            )}
                          </div>
                          {/* Step Label */}
                          <span className={`text-[10px] font-semibold mt-2 tracking-wide select-none text-center ${
                            stepStatus === "active" 
                              ? "text-[#f97316] font-extrabold" 
                              : stepStatus === "completed"
                                ? "text-emerald-700 font-extrabold"
                                : "text-slate-400"
                          }`}>
                            {stepObj.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Action Section (Orange Buttons in Row) */}
                <div className="flex flex-wrap items-center justify-center gap-4 select-none pt-0.5 pb-4">
                  {(!selectedClaim.assignedAgent || selectedClaim.assignedAgent === "" || selectedClaim.assignedAgent.toLowerCase() === "unassigned") && selectedClaim.status !== "Cancelled" && (
                    <button
                      type="button"
                      onClick={() => openAssignAgentModal(selectedClaim)}
                      className="bg-[#f97316] hover:bg-orange-600 text-white font-extrabold text-xs px-6 py-3 rounded-full transition-all border-none cursor-pointer shadow-sm active:scale-95"
                    >
                      Assign Agent
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveSubModal("update_tracking")}
                    className="bg-[#f97316] hover:bg-orange-600 text-white font-extrabold text-xs px-6 py-3 rounded-full transition-all border-none cursor-pointer shadow-sm active:scale-95"
                  >
                    Update Tracking
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRequestItems([
                        { recipient: "User", docType: "NIC Front Page", customName: "", note: "" }
                      ]);
                      setActiveSubModal("request_docs");
                    }}
                    className="bg-[#f97316] hover:bg-orange-600 text-white font-extrabold text-xs px-6 py-3 rounded-full transition-all border-none cursor-pointer shadow-sm active:scale-95"
                  >
                    Request Documents
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSubModal("add_note")}
                    className="bg-[#f97316] hover:bg-orange-600 text-white font-extrabold text-xs px-6 py-3 rounded-full transition-all border-none cursor-pointer shadow-sm active:scale-95"
                  >
                    Add Note
                  </button>
                </div>

                {/* Internal Notes — Bottom Section */}
                <div className="border-t border-slate-100 pt-5">
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 text-left select-none transition-all duration-300">
                    <div className={`flex items-center justify-between ${showNotes ? "border-b border-slate-200 pb-3 mb-4" : ""}`}>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <HugeiconsIcon icon={File01Icon} className="w-5 h-5 text-amber-500" strokeWidth={2.5} />
                        Internal Notes
                      </h3>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setActiveSubModal("add_note")}
                          className="text-[#f97316] hover:text-orange-600 p-2 rounded-xl hover:bg-orange-50 transition-all border-none cursor-pointer flex items-center justify-center bg-transparent"
                          title="Add Note"
                        >
                          <HugeiconsIcon icon={Add01Icon} className="w-5 h-5" strokeWidth={2.5} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowNotes(!showNotes)}
                          className="text-cyan-600 hover:text-cyan-700 font-extrabold text-[11px] bg-transparent border-none cursor-pointer flex items-center gap-1 select-none"
                        >
                          {showNotes ? "See Less" : "See More"}
                        </button>
                      </div>
                    </div>

                    {showNotes && (
                      <div className="transition-all duration-300 text-left">
                        {selectedClaim.notes && selectedClaim.notes.length > 0 ? (
                          <div className="flex flex-col gap-2">
                            {selectedClaim.notes.map((note, idx) => (
                              <div key={idx} className="flex items-center justify-between py-3 px-4 bg-white border border-slate-200/70 rounded-xl hover:border-slate-300 transition-all shadow-sm">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                    <HugeiconsIcon icon={UserIcon} className="w-3 h-3 text-slate-500" strokeWidth={2.5} />
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-semibold text-slate-700">{note.text}</span>
                                    <span className="text-[9px] text-slate-400 font-bold leading-none mt-0.5">
                                      {note.addedBy} &middot; {formatMessageTime(note.addedAt)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-5 text-center">
                            <HugeiconsIcon icon={File01Icon} className="w-8 h-8 text-slate-300 mx-auto mb-2" strokeWidth={1.5} />
                            <span className="text-[12px] text-slate-400 font-semibold italic">No notes added yet. Click the icon above to add a note.</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Category 3: Requested Documents */}
                {(() => {
                  const getRecipientForDoc = (name: string) => {
                    const msg = [...(selectedClaim.messages || [])]
                      .reverse()
                      .find(m => m.message.includes(`Requested: ${name}`));
                    if (msg) {
                      if (msg.message.includes("[Document Request to Agent]")) return "Agent";
                      if (msg.message.includes("[Document Request to User]")) return "User";
                    }
                    return selectedClaim.documentRequestTo || "User";
                  };

                  const getDocDetails = (name: string, status: "Pending" | "Submitted") => {
                    let requestedAt = "";
                    let submittedAt = "";

                    const msg = [...(selectedClaim.messages || [])]
                      .reverse()
                      .find(m => m.message.includes(`Requested: ${name}`));
                    if (msg) {
                      requestedAt = formatDate(msg.sentAt);
                    } else {
                      requestedAt = formatDate(selectedClaim.createdAt);
                    }

                    if (status === "Submitted") {
                      const doc = (selectedClaim.additionalDocuments || []).find(
                        d => d.name.trim().toLowerCase() === name.trim().toLowerCase()
                      );
                      if (doc && doc.uploadedAt) {
                        submittedAt = formatDate(doc.uploadedAt);
                      }
                    }

                    return { requestedAt, submittedAt };
                  };

                  const requestedDocsList = [
                    ...(selectedClaim.requestedDocuments || []).map((name) => ({
                      name,
                      status: "Pending" as const,
                      url: null,
                      recipient: getRecipientForDoc(name),
                    })),
                    ...(selectedClaim.additionalDocuments || []).map((doc) => ({
                      name: doc.name,
                      status: "Submitted" as const,
                      url: doc.url,
                      recipient: doc.uploadedBy === "Agent" ? "Agent" : "User",
                    })),
                  ];

                  const policyHolderDocs = requestedDocsList.filter((d) => d.recipient === "User");
                  const agentDocs = requestedDocsList.filter((d) => d.recipient === "Agent");

                  if (requestedDocsList.length === 0) return null;

                  const hasPending = requestedDocsList.some((d) => d.status === "Pending");

                  return (
                    <div className="border-t border-slate-100 pt-5">
                      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 text-left select-none transition-all duration-300">
                        <div className={`flex items-center justify-between ${showDocStatus ? "border-b border-slate-200 pb-3 mb-4" : ""}`}>
                          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            {hasPending ? (
                              <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5 text-amber-500 animate-pulse" strokeWidth={2.5} />
                            ) : (
                              <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-5 h-5 text-emerald-600" strokeWidth={2.5} />
                            )}
                            Requested Documents Status
                          </h3>
                          <button
                            type="button"
                            onClick={() => setShowDocStatus(!showDocStatus)}
                            className="text-cyan-600 hover:text-cyan-700 font-extrabold text-[11px] bg-transparent border-none cursor-pointer flex items-center gap-1 select-none"
                          >
                            {showDocStatus ? "See Less" : "See More"}
                          </button>
                        </div>

                        {showDocStatus && (
                          <div className="space-y-4 pt-2 transition-all duration-300 text-left">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 select-none">
                                <span className="text-[10px] bg-blue-100 text-blue-800 font-black tracking-wider uppercase px-2 py-1 rounded border border-blue-200">
                                  Policy Holder Requests
                                </span>
                              </div>
                              {policyHolderDocs.length > 0 ? (
                                <div className="flex flex-col gap-2">
                                  {policyHolderDocs.map((item, idx) => {
                                    const { requestedAt, submittedAt } = getDocDetails(item.name, item.status);
                                    return (
                                      <div
                                        key={idx}
                                        className="flex items-center justify-between py-3 px-4 bg-white border border-slate-200/70 rounded-xl hover:border-slate-300 transition-all shadow-sm"
                                      >
                                        <div className="flex items-center gap-3 min-w-0">
                                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                            item.status === "Pending" ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                                          }`} />
                                          <div className="flex flex-col min-w-0">
                                            <span className="text-xs font-extrabold text-slate-800 truncate">{item.name}</span>
                                            <span className="text-[9px] text-slate-400 font-bold leading-none mt-0.5">
                                              {item.status === "Pending" ? (
                                                `Requested: ${requestedAt}`
                                              ) : (
                                                `Requested: ${requestedAt} · Uploaded: ${submittedAt || "Recent"}`
                                              )}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <span className={`text-[8px] font-black uppercase px-2 py-1 rounded select-none border ${
                                            item.status === "Pending"
                                              ? "bg-amber-100/80 text-amber-800 border-amber-200"
                                              : "bg-emerald-100/80 text-emerald-800 border-emerald-200"
                                          }`}>
                                            {item.status}
                                          </span>
                                          {item.status === "Submitted" && item.url && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                let docUrl = item.url;
                                                if (docUrl && !docUrl.startsWith("http") && !docUrl.startsWith("data:")) {
                                                  docUrl = `${API_URL.replace("/api", "")}/uploads/${docUrl}`;
                                                }
                                                setPreviewImage(docUrl || null);
                                              }}
                                              className="text-[10px] font-black text-cyan-600 hover:text-cyan-700 bg-transparent border-none cursor-pointer hover:underline"
                                            >
                                              View
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 font-bold italic select-none py-1 pl-1">
                                  No active requests or submissions.
                                </p>
                              )}
                            </div>

                            <div className="space-y-3 pt-4 border-t border-slate-200/60">
                              <div className="flex items-center gap-2 select-none">
                                <span className="text-[10px] bg-cyan-100 text-cyan-800 font-black tracking-wider uppercase px-2 py-1 rounded border border-cyan-200">
                                  Agent Requests
                                </span>
                              </div>
                              {agentDocs.length > 0 ? (
                                <div className="flex flex-col gap-2">
                                  {agentDocs.map((item, idx) => {
                                    const { requestedAt, submittedAt } = getDocDetails(item.name, item.status);
                                    return (
                                      <div
                                        key={idx}
                                        className="flex items-center justify-between py-3 px-4 bg-white border border-slate-200/70 rounded-xl hover:border-slate-300 transition-all shadow-sm"
                                      >
                                        <div className="flex items-center gap-3 min-w-0">
                                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                            item.status === "Pending" ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                                          }`} />
                                          <div className="flex flex-col min-w-0">
                                            <span className="text-xs font-extrabold text-slate-800 truncate">{item.name}</span>
                                            <span className="text-[9px] text-slate-400 font-bold leading-none mt-0.5">
                                              {item.status === "Pending" ? (
                                                `Requested: ${requestedAt}`
                                              ) : (
                                                `Requested: ${requestedAt} · Uploaded: ${submittedAt || "Recent"}`
                                              )}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <span className={`text-[8px] font-black uppercase px-2 py-1 rounded select-none border ${
                                            item.status === "Pending"
                                              ? "bg-amber-100/80 text-amber-800 border-amber-200"
                                              : "bg-emerald-100/80 text-emerald-800 border-emerald-200"
                                          }`}>
                                            {item.status}
                                          </span>
                                          {item.status === "Submitted" && item.url && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                let docUrl = item.url;
                                                if (docUrl && !docUrl.startsWith("http") && !docUrl.startsWith("data:")) {
                                                  docUrl = `${API_URL.replace("/api", "")}/uploads/${docUrl}`;
                                                }
                                                setPreviewImage(docUrl || null);
                                              }}
                                              className="text-[10px] font-black text-cyan-600 hover:text-cyan-700 bg-transparent border-none cursor-pointer hover:underline"
                                            >
                                              View
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 font-bold italic select-none py-1 pl-1">
                                  No active requests or submissions.
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

              </div>

              {/* Modal Footer */}
              <div className="px-8 py-4 bg-white border-t border-slate-200 flex justify-between flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClaim(null);
                    setActiveDetailsPanel(null);
                  }}
                  className="bg-[#0f2d4a] hover:bg-[#1a3d5e] text-white font-bold text-sm px-6 py-2 rounded-full transition-all border-none cursor-pointer flex items-center shadow-sm active:scale-95"
                >
                  Close
                </button>

                {selectedClaim.currentStep && selectedClaim.currentStep < 2 && (!selectedClaim.assignedAgent || selectedClaim.assignedAgent === "") && selectedClaim.status !== "Cancelled" && (
                  <button
                    type="button"
                    onClick={() => handleCancelClaim(selectedClaim.claimNumber)}
                    disabled={isCancellingClaim}
                    className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-extrabold text-xs px-5 py-3 rounded-full transition-all border-none cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <HugeiconsIcon icon={Delete02Icon} className="w-4 h-4" strokeWidth={2.5} />
                    {isCancellingClaim ? "Cancelling..." : "Cancel Claim"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSelectedClaim(null);
                    setActiveDetailsPanel(null);
                  }}
                  className="bg-[#0f2d4a] hover:bg-[#1a3d5e] text-white font-bold text-sm px-6 py-2 rounded-full transition-all border-none cursor-pointer flex items-center shadow-sm active:scale-95"
                >
                  Submit
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Simple Assign Agent Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white border border-slate-200 rounded-[20px] w-full max-w-[450px] shadow-2xl p-6 flex flex-col relative select-none transition-all duration-300">
            <h3 className="font-black text-[#0f2d4a] text-lg mb-1">Assign Agent</h3>
             <p className="text-xs text-slate-400 font-bold mb-5">Assign an active agent from {branch} Branch to claim {showAssignModal.claimNumber}.</p>
            
            {/* Claim Quick Details Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 mb-2 text-xs font-semibold text-slate-600 space-y-2 select-none">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Vehicle Plate</span>
                  <span className="text-slate-800 font-extrabold">{formatPlate(showAssignModal.vehiclePlate)}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Damage Type</span>
                  <span className="text-slate-800 font-extrabold">{showAssignModal.damageType}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Location</span>
                  <span className="text-slate-800 font-extrabold truncate block" title={showAssignModal.location}>{showAssignModal.location}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Incident Date / Time</span>
                  <span className="text-slate-800 font-extrabold">{claimDateString(showAssignModal.incidentDate)} @ {showAssignModal.incidentTime}</span>
                </div>
              </div>
              <div className="border-t border-slate-200 pt-2 mt-1">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Description</span>
                <p className="text-slate-700 font-medium leading-relaxed mt-0.5 line-clamp-2" title={showAssignModal.description}>{showAssignModal.description}</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Select Branch Agent</label>
                  <span className="text-[10px] text-emerald-600 font-extrabold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    Active / Online Only
                  </span>
                </div>
                <select
                  value={selectedAgentEmail}
                  onChange={(e) => setSelectedAgentEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2d4a]"
                >
                  <option value="" className="text-slate-800 bg-white">-- Choose Online Agent --</option>
                  {agents
                    .filter((agent) => (agent.availability || "Active") === "Active")
                    .map((agent) => (
                      <option key={agent._id} value={agent.email} className="text-slate-800 bg-white">
                        {agent.name} ({agent.phone || "No contact"})
                      </option>
                    ))}
                </select>
              </div>

              {agents.filter((agent) => (agent.availability || "Active") === "Active").length === 0 && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <HugeiconsIcon icon={Alert02Icon} className="w-4 h-4 text-amber-500 shrink-0" strokeWidth={2.5} />
                  <span>No active/online agents currently available in this branch. Agents must be logged in and set status to Active on the mobile app.</span>
                </div>
              )}

              {/* Priority Selection Section */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider ml-1">Priority Level</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPriority("Normal")}
                    className={`flex-1 py-2 px-4 rounded-xl text-xs font-black tracking-wide uppercase transition-all border cursor-pointer ${
                      selectedPriority === "Normal"
                        ? "bg-[#0f2d4a] text-white border-transparent shadow-sm"
                        : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPriority("Urgent")}
                    className={`flex-1 py-2 px-4 rounded-xl text-xs font-black tracking-wide uppercase transition-all border cursor-pointer ${
                      selectedPriority === "Urgent"
                        ? "bg-red-600 text-white border-transparent shadow-sm shadow-red-600/10"
                        : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Urgent
                  </button>
                </div>
              </div>

              {/* Assignment Instruction Message Box */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider ml-1">Assignment Message / Instructions</label>
                <textarea
                  rows={3}
                  value={assignmentMessage}
                  onChange={(e) => setAssignmentMessage(e.target.value)}
                  placeholder="Enter optional instructions or comments for the agent..."
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f2d4a] resize-none bg-white"
                />
              </div>

              {agents.length === 0 && (
                <span className="text-xs text-red-500 font-bold ml-1">ΓÜá∩╕Å No agents found in this branch! Add an agent first.</span>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3.5">
              <button
                onClick={() => {
                  setShowAssignModal(null);
                  setSelectedAgentEmail("");
                  setSelectedPriority("Normal");
                  setAssignmentMessage("");
                }}
                className="px-5 py-3 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold transition-all text-xs bg-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedAgentEmail) {
                    handleAssignAgent(showAssignModal.claimNumber, selectedAgentEmail, selectedPriority, assignmentMessage);
                  } else {
                    alert("Please select an agent.");
                  }
                }}
                disabled={updatingClaim || !selectedAgentEmail}
                className="px-6 py-3 rounded-full bg-[#0f2d4a] hover:bg-[#1a3d5e] text-white font-bold transition-all text-xs border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#0f2d4a]/10"
              >
                Confirm Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Lightbox Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300 select-none cursor-zoom-out transition-all duration-300"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl border border-white/10 shadow-2xl flex items-center justify-center bg-[#0a0a0a]/30" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage}
              alt="Damage Document Preview"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white p-3 rounded-full transition-colors cursor-pointer border border-white/20 select-none shadow-md"
              aria-label="Close preview"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5 text-white" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {/* Inspection Report Text Preview Modal */}
      {previewReportText && (
        <div 
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-300 select-none transition-all duration-300"
          onClick={() => setPreviewReportText(null)}
        >
          <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col p-6 max-h-[85vh] animate-scale-up select-text" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4 select-none">
              <div className="flex items-center gap-2.5">
                <HugeiconsIcon icon={File01Icon} className="w-5 h-5 text-cyan-600" strokeWidth={2.5} />
                <h3 className="font-extrabold text-slate-800 text-base">Vehicle Physical Inspection Report</h3>
              </div>
              <button
                onClick={() => setPreviewReportText(null)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-50 transition-colors cursor-pointer border-none outline-none"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5 text-slate-400 hover:text-slate-600" strokeWidth={2.5} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 pr-1 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
              {renderParsedInspection(
                previewReportText,
                selectedClaim ? selectedClaim.additionalDocuments : [],
                API_URL,
                setPreviewImage
              )}
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-between items-center select-none">
              {selectedClaim && selectedClaim.assignedAgent ? (
                <button
                  type="button"
                  onClick={() => {
                    setPreviewReportText(null);
                    setContactRecipient("Agent");
                    setActiveSubModal("contact");
                  }}
                  className="px-5 py-3 rounded-full border border-[#0f2d4a] hover:bg-[#0f2d4a]/5 text-[#0f2d4a] font-extrabold text-xs transition-all cursor-pointer bg-white flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  <HugeiconsIcon icon={BubbleChatIcon} className="w-4 h-4 text-[#0f2d4a]" strokeWidth={2.5} />
                  Chat with Agent
                </button>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={() => setPreviewReportText(null)}
                className="px-6 py-3 rounded-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors cursor-pointer border-none shadow-sm active:scale-95"
              >
                Dismiss Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Inline helper for formatting incident dates
function claimDateString(dateStr: string) {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${date.getDate().toString().padStart(2, "0")} ${months[date.getMonth()]} ${date.getFullYear()}`;
  } catch (e) {
    return dateStr;
  }
}

// Inline helper for messaging dates
function formatMessageTime(dateStr: string) {
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
}

export default function OfficeStaffClaimsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading claims...</div>}>
      <OfficeStaffClaimsPageContent />
    </Suspense>
  );
}


