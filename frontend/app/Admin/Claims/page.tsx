"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import AdminNavbar from "@/app/Components/Admin/Navbar";
import UserAvatarDropdown from "@/app/Components/UserAvatarDropdown";
import SimpleLoader from "@/app/Components/SimpleLoader";
import { API_URL } from "@/app/config";
import { formatSriLankaDateTime, formatSriLankaDate } from "@/app/utils/dateFormatter";
import { sriLankaLocations } from "@/app/utils/locations";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  BubbleChatIcon,
  Menu01Icon,
  Search01Icon,
  RefreshIcon,
  Loading03Icon,
  Cancel01Icon,
  AlertCircleIcon,
  Alert02Icon,
  CheckmarkCircle01Icon,
  Building01Icon,
  UserMultiple02Icon,
  Location01Icon,
  UserIcon,
  Mail01Icon,
  Call02Icon,
  Tick01Icon,
  File01Icon,
  File02Icon,
  Download01Icon,
  Edit02Icon,
  Delete02Icon,
  ArrowRight01Icon,
  Car01Icon,
  SecurityCheckIcon,
  ViewIcon,
  Analytics01Icon,
  Clock01Icon,
  FilterIcon
} from "@hugeicons/core-free-icons";

// ==========================================
// --- Type Definitions ---
// ==========================================

interface ClaimNote {
  text: string;
  addedBy: string;
  addedAt: string;
  _id?: string;
}

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
  uploadedBy?: string;
  _id?: string;
}

interface DamagedItem {
  item: string;
  damagePercentage: number;
  description?: string;
  action?: "Repair" | "Replace";
  estimatedPartCost?: number;
  estimatedLaborCost?: number;
  totalItemCost?: number;
}

interface PhotoVerificationDetail {
  item: string;
  garageCost: number;
  aiCost: number;
  matchesAccidentPhotos: boolean;
  confidence?: number;
  notes?: string;
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
  status: "Pending" | "In Progress" | "Approved" | "Rejected" | string;
  branch: string;
  assignedAgent?: string;
  priority?: "Normal" | "Urgent" | "High" | "Low" | string;
  amount?: number | null;
  currentStep: number;
  documentsRequested?: boolean;
  requestedDocuments?: string[];
  documentRequestTo?: string;
  inspectionReport?: string;
  inspectionSubmitted?: boolean;
  paymentReceipt?: string;
  paymentReceiptFileName?: string;
  paymentSettledAt?: string;
  paymentSettledBy?: string;
  paymentNote?: string;
  accountHolderName?: string;
  bankName?: string;
  bankBranch?: string;
  bankAccount?: string;
  rejectionReason?: string;
  isManuallyUpdated?: boolean;
  manualUpdateReason?: string;
  manualUpdateAt?: string;
  manualUpdateBy?: string;
  createdAt: string;
  policyHolderName?: string;
  policyHolderEmail?: string;
  policyHolderMobile?: string;
  vehicleDetails?: string;
  notes?: ClaimNote[];
  messages?: ClaimMessage[];
  additionalDocuments?: AdditionalDoc[];
  accidentPhotos?: {
    front?: string[];
    rear?: string[];
    side?: string[];
  };
  drivingLicense?: {
    front?: string[];
    rear?: string[];
  };
  otherVehicleDetails?: Array<{
    vehiclePlate?: string;
    insuranceCompany?: string;
    policyNumber?: string;
    driverName?: string;
    licensePhotos?: string[];
    vehiclePhotos?: string[];
  }>;
  aiAnalysis?: {
    isAnalyzed?: boolean;
    damagedItems?: DamagedItem[];
    overallDamagePercentage?: number;
    totalEstimatedPartsCost?: number;
    totalEstimatedLaborCost?: number;
    totalEstimatedCost?: number;
    currency?: string;
    summary?: string;
    analyzedAt?: string;
  };
  garageEstimateComparison?: {
    isCompared?: boolean;
    garageDocumentUrl?: string;
    garageName?: string;
    garageEstimatedTotal?: number;
    aiEstimatedTotal?: number;
    costDifference?: number;
    costDifferencePercentage?: number;
    verdict?: "Match" | "Discrepancy" | "High Variance" | "Approved" | "Rejected" | string;
    matchConfidenceScore?: number;
    photoVerificationDetails?: PhotoVerificationDetail[];
    summary?: string;
    reviewedAt?: string;
    reviewedBy?: string;
  };
}

interface ClaimsSummary {
  totalClaims: number;
  pendingClaims: number;
  inProgressClaims: number;
  approvedClaims: number;
  rejectedClaims: number;
  totalApprovedPayout: number;
  totalEstimatedLoss: number;
  categoryDistribution: Record<string, number>;
  branchBreakdown: Record<string, { count: number; approvedPayout: number; pending: number }>;
}

const DAMAGE_CATEGORIES = [
  "All",
  "Front Collision",
  "Rear Impact",
  "Side Collision",
  "Windshield / Glass",
  "Engine / Mechanical",
  "Total Loss",
  "Minor Dent / Scratch",
  "Flood / Water Damage",
  "Theft / Third Party",
  "Fire / Natural Disaster",
  "Other"
];

// Flat list of Sri Lanka districts / main branches
const SRI_LANKA_BRANCHES = [
  "All",
  "Head Office",
  "Colombo",
  "Galle",
  "Kandy",
  "Matara",
  "Gampaha",
  "Kurunegala",
  "Negombo",
  "Jaffna",
  "Ratnapura",
  "Kalutara",
  "Anuradhapura",
  "Badulla",
  "Batticaloa",
  "Trincomalee",
  "Hambantota",
  "Kegalle",
  "Matale",
  "Nuwara Eliya",
  "Puttalam",
  "Polonnaruwa",
  "Monaragala",
  "Ampara",
  "Mannar",
  "Vavuniya"
];

export default function AdminClaimsPage() {
  // Data States
  const [claims, setClaims] = useState<Claim[]>([]);
  const [summary, setSummary] = useState<ClaimsSummary>({
    totalClaims: 0,
    pendingClaims: 0,
    inProgressClaims: 0,
    approvedClaims: 0,
    rejectedClaims: 0,
    totalApprovedPayout: 0,
    totalEstimatedLoss: 0,
    categoryDistribution: {},
    branchBreakdown: {}
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [availableAgents, setAvailableAgents] = useState<any[]>([]);

  // Filter & Search States
  const [activeTab, setActiveTab] = useState<"All" | "Pending" | "In Progress" | "Approved" | "Rejected">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDamageType, setSelectedDamageType] = useState("All");
  const [selectedBranch, setSelectedBranch] = useState("All");
  const [selectedPriority, setSelectedPriority] = useState("All");
  const [selectedVerdict, setSelectedVerdict] = useState("All");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "amount-desc" | "amount-asc">("newest");

  // Modals & Drawers
  const [viewingClaim, setViewingClaim] = useState<Claim | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<"overview" | "photos" | "ai" | "garage" | "agent">("overview");
  const [editingClaim, setEditingClaim] = useState<Claim | null>(null);
  const [editFormData, setEditFormData] = useState({
    status: "Pending",
    amount: "",
    priority: "Normal",
    branch: "Galle",
    assignedAgent: "",
    currentStep: 1,
    rejectionReason: "",
    adminNote: ""
  });
  const [savingDecision, setSavingDecision] = useState(false);

  const [showReportsModal, setShowReportsModal] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [deletingClaim, setDeletingClaim] = useState<Claim | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Fetch Claims from Backend
  const fetchClaims = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams();
      if (selectedBranch && selectedBranch !== "All") params.append("branch", selectedBranch);
      if (activeTab && activeTab !== "All") params.append("status", activeTab);
      if (selectedDamageType && selectedDamageType !== "All") params.append("damageType", selectedDamageType);
      if (selectedPriority && selectedPriority !== "All") params.append("priority", selectedPriority);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      if (sortBy) params.append("sortBy", sortBy);

      const res = await fetch(`${API_URL}/admin/claims?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load claims list");
      const data = await res.json();

      setClaims(data.claims || []);
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (err: any) {
      console.error("Error fetching claims:", err);
      showToast(err.message || "Failed to load claims data", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedBranch, activeTab, selectedDamageType, selectedPriority, searchQuery, sortBy]);

  // Fetch Available Agents
  const fetchAgents = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/agents`);
      if (res.ok) {
        const data = await res.json();
        setAvailableAgents(data.agents || []);
      }
    } catch (err) {
      console.error("Error loading agents:", err);
    }
  };

  useEffect(() => {
    fetchClaims();
    fetchAgents();
  }, [fetchClaims]);

  // Client-side Verdict Filter (AI Discrepancy)
  const filteredClaims = useMemo(() => {
    return claims.filter((c) => {
      if (selectedVerdict === "All") return true;
      const verdict = c.garageEstimateComparison?.verdict || "Pending";
      if (selectedVerdict === "Discrepancy") {
        return verdict === "Discrepancy" || verdict === "High Variance";
      }
      if (selectedVerdict === "Match") {
        return verdict === "Match" || verdict === "Approved";
      }
      return verdict === selectedVerdict;
    });
  }, [claims, selectedVerdict]);

  // Open Edit Decision Modal
  const openEditModal = (claim: Claim) => {
    setEditingClaim(claim);
    setEditFormData({
      status: claim.status || "Pending",
      amount: claim.amount !== null && claim.amount !== undefined ? String(claim.amount) : "",
      priority: claim.priority || "Normal",
      branch: claim.branch || "Galle",
      assignedAgent: claim.assignedAgent || "",
      currentStep: claim.currentStep || 1,
      rejectionReason: claim.rejectionReason || "",
      adminNote: ""
    });
  };

  // Submit Admin Decision / Override
  const handleSaveDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClaim) return;

    setSavingDecision(true);
    try {
      const res = await fetch(`${API_URL}/admin/claims/${editingClaim._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editFormData.status,
          amount: editFormData.amount ? Number(editFormData.amount) : null,
          priority: editFormData.priority,
          branch: editFormData.branch,
          assignedAgent: editFormData.assignedAgent,
          currentStep: editFormData.currentStep,
          rejectionReason: editFormData.status === "Rejected" ? editFormData.rejectionReason : "",
          adminNote: editFormData.adminNote
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update claim");

      showToast(`Claim ${editingClaim.claimNumber} successfully updated!`, "success");
      setEditingClaim(null);

      // Refresh list & summary
      fetchClaims(true);

      // Update viewing claim if currently open
      if (viewingClaim && viewingClaim._id === editingClaim._id) {
        setViewingClaim((prev) => (prev ? { ...prev, ...data.claim } : null));
      }
    } catch (err: any) {
      console.error("Save decision error:", err);
      showToast(err.message || "Failed to save decision", "error");
    } finally {
      setSavingDecision(false);
    }
  };

  // Delete Claim
  const handleDeleteClaim = async () => {
    if (!deletingClaim) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_URL}/admin/claims/${deletingClaim._id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete claim");

      showToast(`Claim ${deletingClaim.claimNumber} has been removed.`, "info");
      setDeletingClaim(null);
      if (viewingClaim && viewingClaim._id === deletingClaim._id) {
        setViewingClaim(null);
      }
      fetchClaims(true);
    } catch (err: any) {
      console.error("Delete claim error:", err);
      showToast(err.message || "Failed to delete claim", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setActiveTab("All");
    setSelectedBranch("All");
    setSelectedDamageType("All");
    setSelectedPriority("All");
    setSelectedVerdict("All");
    setSearchQuery("");
    setSortBy("newest");
  };

  // Export Claims as CSV
  const handleExportCSV = () => {
    if (filteredClaims.length === 0) {
      showToast("No claims available to export", "info");
      return;
    }

    const headers = [
      "Claim Number",
      "Policyholder Name",
      "NIC",
      "Vehicle Plate",
      "Damage Type",
      "Branch",
      "Assigned Agent",
      "Status",
      "Priority",
      "AI Estimated Total (LKR)",
      "Approved Payout (LKR)",
      "Incident Date",
      "Incident Location",
      "AI Verdict",
      "Submitted Date"
    ];

    const rows = filteredClaims.map((c) => [
      `"${c.claimNumber}"`,
      `"${c.policyHolderName || "N/A"}"`,
      `"${c.userNic}"`,
      `"${c.vehiclePlate}"`,
      `"${c.damageType}"`,
      `"${c.branch}"`,
      `"${c.assignedAgent || "Unassigned"}"`,
      `"${c.status}"`,
      `"${c.priority || "Normal"}"`,
      c.aiAnalysis?.totalEstimatedCost || 0,
      c.amount || 0,
      `"${c.incidentDate} ${c.incidentTime}"`,
      `"${c.location?.replace(/"/g, '""') || ""}"`,
      `"${c.garageEstimateComparison?.verdict || "N/A"}"`,
      `"${formatSriLankaDate(c.createdAt)}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Sanasa_Admin_Claims_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Claims export file generated and downloaded successfully!", "success");
  };

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Pending":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "In Progress":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Rejected":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  // Priority Badge Helper
  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case "Urgent":
        return "bg-rose-500 text-white shadow-sm shadow-rose-200 font-bold";
      case "High":
        return "bg-orange-500 text-white shadow-sm shadow-orange-200 font-bold";
      case "Low":
        return "bg-slate-100 text-slate-600 border border-slate-200";
      default:
        return "bg-blue-50 text-blue-700 border border-blue-100";
    }
  };

  // Verdict Badge Helper
  const getVerdictBadge = (verdict?: string) => {
    switch (verdict) {
      case "Match":
      case "Approved":
        return {
          label: "AI Verified Match",
          className: "bg-emerald-50 text-emerald-700 border border-emerald-200"
        };
      case "Discrepancy":
        return {
          label: "⚠️ Discrepancy Flagged",
          className: "bg-amber-50 text-amber-800 border border-amber-300 font-bold animate-pulse"
        };
      case "High Variance":
        return {
          label: "🚨 High Variance (>20%)",
          className: "bg-rose-50 text-rose-800 border border-rose-300 font-bold"
        };
      default:
        return {
          label: "Pending AI Comparison",
          className: "bg-slate-50 text-slate-600 border border-slate-200"
        };
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] font-sans text-slate-800">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce duration-300">
          <div
            className={`px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border text-sm font-semibold backdrop-blur-md ${
              toastMessage.type === "success"
                ? "bg-emerald-900/90 text-white border-emerald-500"
                : toastMessage.type === "error"
                ? "bg-rose-900/90 text-white border-rose-500"
                : "bg-slate-900/90 text-white border-slate-700"
            }`}
          >
            {toastMessage.type === "success" && <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-5 h-5 text-emerald-300" />}
            {toastMessage.type === "error" && <HugeiconsIcon icon={AlertCircleIcon} className="w-5 h-5 text-rose-300" />}
            {toastMessage.type === "info" && <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5 text-sky-300" />}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-row min-h-0">
        <AdminNavbar />

        <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
          {/* Top Header */}
          <header className="bg-white border-b border-slate-200/80 px-6 lg:px-8 py-4 flex justify-between items-center select-none shadow-sm shrink-0 h-[80px] sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("open-admin-mobile-menu"))}
                className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 active:scale-95 transition-all cursor-pointer focus:outline-none"
              >
                <HugeiconsIcon icon={Menu01Icon} className="w-6 h-6" strokeWidth={2.5} />
              </button>
              <div className="flex items-center gap-2.5">
                <span className="bg-[#102A43] text-white text-xs lg:text-sm px-3.5 py-1.5 rounded-xl font-bold tracking-wide shadow-sm flex items-center gap-1.5">
                  <HugeiconsIcon icon={SecurityCheckIcon} className="w-4 h-4 text-[#00ddff]" />
                  Admin Console
                </span>
                <span className="hidden sm:inline text-slate-300 text-lg">/</span>
                <h1 className="text-base lg:text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                  Claims & Settlement Governance
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3 lg:gap-4">
              <button
                onClick={() => fetchClaims(true)}
                disabled={refreshing}
                title="Refresh Claims Data"
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-xl transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center"
              >
                <HugeiconsIcon icon={RefreshIcon} className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-600" : ""}`} strokeWidth={2} />
              </button>

              <button
                onClick={() => setShowReportsModal(true)}
                className="hidden md:flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <HugeiconsIcon icon={Analytics01Icon} className="w-4 h-4" />
                <span>Executive Reports & Analytics</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="hidden lg:flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all border border-slate-200 active:scale-95 cursor-pointer"
              >
                <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" />
                <span>Export CSV</span>
              </button>

              <UserAvatarDropdown userType="admin" />
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 p-5 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
            {/* Top Page Subtitle & Mobile Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Claims Management Portal</h2>
                <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                  Real-time claims auditing, forensic AI damage assessments, branch allocations, and executive financial decision overrides.
                </p>
              </div>

              <div className="flex items-center gap-2 md:hidden">
                <button
                  onClick={() => setShowReportsModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white text-xs font-bold py-2.5 px-3 rounded-xl shadow-sm"
                >
                  <HugeiconsIcon icon={Analytics01Icon} className="w-4 h-4" />
                  <span>Reports</span>
                </button>
                <button
                  onClick={handleExportCSV}
                  className="flex items-center justify-center gap-1.5 bg-slate-100 text-slate-700 text-xs font-bold py-2.5 px-3 rounded-xl border border-slate-200"
                >
                  <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 select-none">
              {/* Card 1: Total Claims Volume */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Claims Volume</span>
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <HugeiconsIcon icon={File01Icon} className="w-5 h-5" strokeWidth={2} />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-black text-slate-900 tracking-tight">
                    {summary.totalClaims.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 font-medium">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Active portfolio across {Object.keys(summary.branchBreakdown || {}).length || 1} branches</span>
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
              </div>

              {/* Card 2: Pending Executive Review */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Pending Reviews</span>
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <HugeiconsIcon icon={Clock01Icon} className="w-5 h-5" strokeWidth={2} />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-black text-amber-600 tracking-tight">
                    {summary.pendingClaims.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-amber-800 font-medium">
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>Requires branch or admin authorization</span>
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
              </div>

              {/* Card 3: In Progress & Inspections */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">In-Field Assessment</span>
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <HugeiconsIcon icon={Car01Icon} className="w-5 h-5" strokeWidth={2} />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-black text-indigo-600 tracking-tight">
                    {summary.inProgressClaims.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-indigo-800 font-medium">
                    <span className="inline-block w-2 h-2 rounded-full bg-indigo-500" />
                    <span>Assigned to agents & garage estimates</span>
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
              </div>

              {/* Card 4: Total Approved Settlements */}
              <div className="bg-gradient-to-br from-[#102A43] to-[#1E3A8A] rounded-2xl p-5 text-white shadow-md relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Approved Settlements</span>
                  <div className="w-9 h-9 rounded-xl bg-white/10 text-cyan-300 flex items-center justify-center border border-white/10">
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-5 h-5" strokeWidth={2} />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-2xl lg:text-3xl font-black text-white tracking-tight truncate">
                    LKR {summary.totalApprovedPayout.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-cyan-200 font-medium">
                    <span className="inline-block w-2 h-2 rounded-full bg-cyan-400" />
                    <span>{summary.approvedClaims} Approved ({summary.rejectedClaims} Rejected)</span>
                  </div>
                </div>
                <div className="absolute -bottom-6 -right-6 w-28 h-28 bg-[#00ddff]/10 rounded-full blur-xl pointer-events-none" />
              </div>
            </div>

            {/* Categorization & Multi-Filter Control Center */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-4">
              {/* Status Tabs Bar */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-slate-100">
                {[
                  { id: "All", label: "All Claims", count: summary.totalClaims },
                  { id: "Pending", label: "Pending Reviews", count: summary.pendingClaims, color: "text-amber-600 bg-amber-50" },
                  { id: "In Progress", label: "In Progress", count: summary.inProgressClaims, color: "text-indigo-600 bg-indigo-50" },
                  { id: "Approved", label: "Approved Payouts", count: summary.approvedClaims, color: "text-emerald-600 bg-emerald-50" },
                  { id: "Rejected", label: "Rejected Claims", count: summary.rejectedClaims, color: "text-rose-600 bg-rose-50" }
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs tracking-tight transition-all cursor-pointer whitespace-nowrap ${
                        isActive
                          ? "bg-[#102A43] text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                          isActive ? "bg-white/20 text-white" : tab.color || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Filters & Search Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
                {/* Search Bar (2 cols on lg) */}
                <div className="lg:col-span-2 relative">
                  <HugeiconsIcon
                    icon={Search01Icon}
                    className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  />
                  <input
                    type="text"
                    placeholder="Search Claim #, Plate, NIC, Name, Agent..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Damage Category Filter */}
                <div>
                  <select
                    value={selectedDamageType}
                    onChange={(e) => setSelectedDamageType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    <option value="All">All Damage Types</option>
                    {DAMAGE_CATEGORIES.filter((c) => c !== "All").map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Branch Filter */}
                <div>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    <option value="All">All Branches</option>
                    {SRI_LANKA_BRANCHES.filter((b) => b !== "All").map((br) => (
                      <option key={br} value={br}>
                        {br} Branch
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority Filter */}
                <div>
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    <option value="All">All Priority</option>
                    <option value="Urgent">🔥 Urgent Only</option>
                    <option value="High">⚠️ High Priority</option>
                    <option value="Normal">Normal Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>

                {/* Sort Option */}
                <div>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="amount-desc">Payout: High to Low</option>
                    <option value="amount-asc">Payout: Low to High</option>
                  </select>
                </div>
              </div>

              {/* Active Filter Indicators & Reset */}
              {(selectedBranch !== "All" ||
                selectedDamageType !== "All" ||
                selectedPriority !== "All" ||
                selectedVerdict !== "All" ||
                searchQuery ||
                activeTab !== "All") && (
                <div className="flex items-center justify-between pt-2 text-xs border-t border-slate-100">
                  <div className="flex flex-wrap items-center gap-1.5 text-slate-500 font-medium">
                    <span>Filtering by:</span>
                    {activeTab !== "All" && (
                      <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-lg border border-blue-100">
                        Status: {activeTab}
                      </span>
                    )}
                    {selectedBranch !== "All" && (
                      <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-lg">
                        Branch: {selectedBranch}
                      </span>
                    )}
                    {selectedDamageType !== "All" && (
                      <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-lg">
                        Type: {selectedDamageType}
                      </span>
                    )}
                    {selectedPriority !== "All" && (
                      <span className="bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded-lg">
                        Priority: {selectedPriority}
                      </span>
                    )}
                    {searchQuery && (
                      <span className="bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded-lg">
                        Search: &quot;{searchQuery}&quot;
                      </span>
                    )}
                  </div>

                  <button
                    onClick={handleResetFilters}
                    className="text-blue-600 hover:text-blue-800 font-bold text-xs hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" />
                    <span>Clear All</span>
                  </button>
                </div>
              )}
            </div>

            {/* Claims Table Container */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
              {/* Table Top Bar */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-800 tracking-tight">Executive Claims Register</span>
                  <span className="bg-slate-100 text-slate-600 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {filteredClaims.length} records found
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Live Sync</span>
                </div>
              </div>

              {/* Table Content */}
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <SimpleLoader />
                  <p className="text-xs font-semibold text-slate-400">Loading claims ledger...</p>
                </div>
              ) : filteredClaims.length === 0 ? (
                <div className="py-16 px-6 text-center flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                    <HugeiconsIcon icon={File01Icon} className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">No Claims Match Your Criteria</h3>
                  <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                    Try clearing some of your search terms, status filters, or branch filters to view all claim records.
                  </p>
                  <button
                    onClick={handleResetFilters}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm"
                  >
                    Reset All Filters
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                        <th className="py-3.5 px-5">Claim ID & Priority</th>
                        <th className="py-3.5 px-4">Policyholder</th>
                        <th className="py-3.5 px-4">Vehicle & Incident</th>
                        <th className="py-3.5 px-4">Damage Category</th>
                        <th className="py-3.5 px-4">Branch & Agent</th>
                        <th className="py-3.5 px-4">Financials (LKR)</th>
                        <th className="py-3.5 px-4">Status & AI Audit</th>
                        <th className="py-3.5 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                      {filteredClaims.map((claim) => {
                        const verdictData = getVerdictBadge(claim.garageEstimateComparison?.verdict);
                        const hasAI = claim.aiAnalysis?.isAnalyzed;

                        return (
                          <tr
                            key={claim._id}
                            className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                            onClick={() => {
                              setViewingClaim(claim);
                              setActiveViewTab("overview");
                            }}
                          >
                            {/* Claim ID & Priority */}
                            <td className="py-4 px-5">
                              <div className="flex flex-col gap-1">
                                <span className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight text-xs">
                                  #{claim.claimNumber}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`text-[10px] px-2 py-0.5 rounded-md font-bold tracking-tight inline-block ${getPriorityBadge(
                                      claim.priority
                                    )}`}
                                  >
                                    {claim.priority || "Normal"}
                                  </span>
                                  {claim.isManuallyUpdated && (
                                    <span
                                      title="Manually updated by Administrator"
                                      className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-bold border border-purple-200"
                                    >
                                      Admin Override
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Policyholder */}
                            <td className="py-4 px-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900 truncate max-w-[140px]">
                                  {claim.policyHolderName || "Policy Holder"}
                                </span>
                                <span className="text-[11px] text-slate-500 font-mono">{claim.userNic}</span>
                                {claim.policyHolderMobile && (
                                  <span className="text-[11px] text-slate-400">{claim.policyHolderMobile}</span>
                                )}
                              </div>
                            </td>

                            {/* Vehicle & Incident */}
                            <td className="py-4 px-4">
                              <div className="flex flex-col gap-1">
                                <span className="inline-block bg-slate-900 text-yellow-400 font-mono text-[11px] font-black px-2 py-0.5 rounded-md tracking-wider border border-slate-700 w-fit">
                                  {claim.vehiclePlate}
                                </span>
                                <div className="text-[11px] text-slate-500 truncate max-w-[150px]">
                                  {claim.vehicleDetails || claim.location}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {claim.incidentDate} • {claim.incidentTime}
                                </div>
                              </div>
                            </td>

                            {/* Damage Category */}
                            <td className="py-4 px-4">
                              <span className="inline-block bg-slate-100 text-slate-800 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-slate-200 whitespace-nowrap">
                                {claim.damageType || "Accident"}
                              </span>
                            </td>

                            {/* Branch & Agent */}
                            <td className="py-4 px-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                                  <HugeiconsIcon icon={Building01Icon} className="w-3.5 h-3.5 text-slate-400" />
                                  {claim.branch || "Galle"}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  {claim.assignedAgent ? (
                                    <span className="text-blue-600 font-semibold">{claim.assignedAgent}</span>
                                  ) : (
                                    <span className="text-amber-600 italic">Unassigned Agent</span>
                                  )}
                                </span>
                              </div>
                            </td>

                            {/* Financials (LKR) */}
                            <td className="py-4 px-4">
                              <div className="flex flex-col">
                                {claim.amount !== null && claim.amount !== undefined ? (
                                  <span className="font-black text-emerald-700 text-xs">
                                    LKR {claim.amount.toLocaleString()}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">Pending Settlement</span>
                                )}
                                {hasAI && claim.aiAnalysis?.totalEstimatedCost ? (
                                  <span className="text-[10px] text-slate-500 font-medium">
                                    AI Est: LKR {claim.aiAnalysis.totalEstimatedCost.toLocaleString()}
                                  </span>
                                ) : null}
                              </div>
                            </td>

                            {/* Status & AI Audit */}
                            <td className="py-4 px-4">
                              <div className="flex flex-col gap-1.5 items-start">
                                <span
                                  className={`text-[11px] px-2.5 py-1 rounded-full font-bold border ${getStatusBadge(
                                    claim.status
                                  )}`}
                                >
                                  {claim.status}
                                </span>

                                {claim.garageEstimateComparison?.isCompared ? (
                                  <span
                                    className={`text-[10px] px-2 py-0.5 rounded-md ${verdictData.className}`}
                                  >
                                    {verdictData.label}
                                  </span>
                                ) : hasAI ? (
                                  <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold">
                                    AI Analyzed
                                  </span>
                                ) : null}
                              </div>
                            </td>

                            {/* Action Buttons */}
                            <td className="py-4 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                {/* View Details */}
                                <button
                                  onClick={() => {
                                    setViewingClaim(claim);
                                    setActiveViewTab("overview");
                                  }}
                                  title="Inspect Full Claim & Evidence"
                                  className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                                >
                                  <HugeiconsIcon icon={ViewIcon} className="w-4 h-4" />
                                </button>

                                {/* Edit Decision Override */}
                                <button
                                  onClick={() => openEditModal(claim)}
                                  title="Override Claim Decision / Adjust Payout"
                                  className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                                >
                                  <HugeiconsIcon icon={Edit02Icon} className="w-4 h-4" />
                                </button>

                                {/* Delete Record */}
                                <button
                                  onClick={() => setDeletingClaim(claim)}
                                  title="Delete Claim Record"
                                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                >
                                  <HugeiconsIcon icon={Delete02Icon} className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* ========================================== */}
      {/* --- MODAL 1: Claim Inspection & Audit --- */}
      {/* ========================================== */}
      {viewingClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 lg:px-8 py-5 bg-[#102A43] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-cyan-300 border border-white/10">
                  <HugeiconsIcon icon={File02Icon} className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black tracking-tight text-white">
                      Claim Audit #{viewingClaim.claimNumber}
                    </h3>
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${getPriorityBadge(
                        viewingClaim.priority
                      )}`}
                    >
                      {viewingClaim.priority || "Normal"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Policyholder: {viewingClaim.policyHolderName || "N/A"} • Plate: {viewingClaim.vehiclePlate} • Branch:{" "}
                    {viewingClaim.branch}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditModal(viewingClaim)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <HugeiconsIcon icon={Edit02Icon} className="w-4 h-4" />
                  <span>Admin Decision</span>
                </button>
                <button
                  onClick={() => setViewingClaim(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Tabs Navigation */}
            <div className="flex items-center gap-2 px-6 lg:px-8 bg-slate-100 border-b border-slate-200 overflow-x-auto no-scrollbar shrink-0">
              {[
                { id: "overview", label: "Overview & Incident", icon: File01Icon },
                { id: "photos", label: "Evidence & Photos", icon: Car01Icon },
                { id: "ai", label: "AI Forensic Assessment", icon: SecurityCheckIcon },
                { id: "garage", label: "Garage Cross-Check", icon: Analytics01Icon },
                { id: "agent", label: "Agent & Audit Logs", icon: UserIcon }
              ].map((tab) => {
                const isActive = activeViewTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveViewTab(tab.id as any)}
                    className={`flex items-center gap-2 py-3 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? "border-blue-600 text-blue-700 bg-white"
                        : "border-transparent text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <HugeiconsIcon icon={tab.icon} className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Modal Body Scrollable */}
            <div className="flex-1 p-6 lg:p-8 overflow-y-auto space-y-6">
              {/* TAB 1: OVERVIEW & INCIDENT */}
              {activeViewTab === "overview" && (
                <div className="space-y-6">
                  {/* Status & Quick Summary Banner */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Current Status</span>
                      <div className="mt-1">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-md font-bold border inline-block ${getStatusBadge(
                            viewingClaim.status
                          )}`}
                        >
                          {viewingClaim.status}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Approved Payout</span>
                      <div className="text-sm font-black text-emerald-700 mt-1">
                        {viewingClaim.amount !== null && viewingClaim.amount !== undefined
                          ? `LKR ${viewingClaim.amount.toLocaleString()}`
                          : "Not Yet Settled"}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Damage Category</span>
                      <div className="text-xs font-bold text-slate-800 mt-1">{viewingClaim.damageType}</div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Current Workflow</span>
                      <div className="text-xs font-bold text-blue-700 mt-1">
                        Step {viewingClaim.currentStep} of 4
                      </div>
                    </div>
                  </div>

                  {/* Incident Description */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200">
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                      Accident Description & Context
                    </h4>
                    <p className="text-sm text-slate-700 leading-relaxed font-normal bg-slate-50 p-4 rounded-xl border border-slate-100">
                      {viewingClaim.description || "No description provided."}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100 text-xs">
                      <div>
                        <span className="font-bold text-slate-400">Incident Date & Time:</span>
                        <div className="font-bold text-slate-800 mt-0.5">
                          {viewingClaim.incidentDate} at {viewingClaim.incidentTime}
                        </div>
                      </div>
                      <div>
                        <span className="font-bold text-slate-400">Location:</span>
                        <div className="font-bold text-slate-800 mt-0.5">{viewingClaim.location}</div>
                      </div>
                      <div>
                        <span className="font-bold text-slate-400">Claim Registered On:</span>
                        <div className="font-bold text-slate-800 mt-0.5">
                          {formatSriLankaDateTime(viewingClaim.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Policyholder & Vehicle Information */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Policyholder Card */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3">
                      <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <HugeiconsIcon icon={UserIcon} className="w-4 h-4 text-blue-600" />
                        Policyholder Profile
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Full Name:</span>
                          <span className="font-bold text-slate-800">{viewingClaim.policyHolderName || "N/A"}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">National ID (NIC):</span>
                          <span className="font-mono font-bold text-slate-800">{viewingClaim.userNic}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Contact Email:</span>
                          <span className="font-medium text-slate-700">{viewingClaim.policyHolderEmail || "N/A"}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-500">Mobile Number:</span>
                          <span className="font-bold text-slate-800">{viewingClaim.policyHolderMobile || "N/A"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Vehicle & Bank Settlement Card */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3">
                      <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <HugeiconsIcon icon={Car01Icon} className="w-4 h-4 text-indigo-600" />
                        Vehicle & Bank Settlement
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">License Plate:</span>
                          <span className="font-black bg-slate-900 text-yellow-400 px-2 py-0.5 rounded font-mono text-[11px]">
                            {viewingClaim.vehiclePlate}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Make & Model:</span>
                          <span className="font-bold text-slate-800">{viewingClaim.vehicleDetails || "Standard Insured"}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Bank Account:</span>
                          <span className="font-mono font-bold text-slate-800">
                            {viewingClaim.bankAccount || viewingClaim.bankName ? `${viewingClaim.bankName || ""} - ${viewingClaim.bankAccount || ""}` : "Not Provided"}
                          </span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-500">Branch & Holder:</span>
                          <span className="font-medium text-slate-700">
                            {viewingClaim.bankBranch ? `${viewingClaim.bankBranch} (${viewingClaim.accountHolderName || ""})` : "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Third-Party Vehicles Involved (if any) */}
                  {viewingClaim.otherVehicleDetails && viewingClaim.otherVehicleDetails.length > 0 && (
                    <div className="bg-white rounded-2xl p-5 border border-slate-200">
                      <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">
                        Third-Party Involved Vehicles ({viewingClaim.otherVehicleDetails.length})
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {viewingClaim.otherVehicleDetails.map((tp, idx) => (
                          <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                            <div className="font-bold text-slate-900 flex justify-between">
                              <span>Vehicle #{idx + 1}: {tp.vehiclePlate || "Unknown Plate"}</span>
                              <span className="text-slate-400">{tp.insuranceCompany || "Third Party"}</span>
                            </div>
                            <div className="text-slate-600">Driver: {tp.driverName || "N/A"}</div>
                            <div className="text-slate-500">Policy: {tp.policyNumber || "N/A"}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: EVIDENCE & PHOTOS */}
              {activeViewTab === "photos" && (
                <div className="space-y-6">
                  {/* Accident Photos */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200">
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-between">
                      <span>Accident Damage Photos</span>
                      <span className="text-blue-600 font-normal lowercase text-xs">Click photo to zoom</span>
                    </h4>

                    <div className="space-y-4">
                      {/* Front Photos */}
                      {viewingClaim.accidentPhotos?.front && viewingClaim.accidentPhotos.front.length > 0 && (
                        <div>
                          <span className="text-xs font-bold text-slate-600 mb-2 block">Front Angle Photos:</span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {viewingClaim.accidentPhotos.front.map((url, i) => (
                              <div
                                key={i}
                                onClick={() => setLightboxImage(url)}
                                className="aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative group cursor-pointer"
                              >
                                <img src={url} alt={`Front Damage ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                                  Zoom
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Rear Photos */}
                      {viewingClaim.accidentPhotos?.rear && viewingClaim.accidentPhotos.rear.length > 0 && (
                        <div>
                          <span className="text-xs font-bold text-slate-600 mb-2 block">Rear Angle Photos:</span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {viewingClaim.accidentPhotos.rear.map((url, i) => (
                              <div
                                key={i}
                                onClick={() => setLightboxImage(url)}
                                className="aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative group cursor-pointer"
                              >
                                <img src={url} alt={`Rear Damage ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                                  Zoom
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Side Photos */}
                      {viewingClaim.accidentPhotos?.side && viewingClaim.accidentPhotos.side.length > 0 && (
                        <div>
                          <span className="text-xs font-bold text-slate-600 mb-2 block">Side Angle Photos:</span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {viewingClaim.accidentPhotos.side.map((url, i) => (
                              <div
                                key={i}
                                onClick={() => setLightboxImage(url)}
                                className="aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative group cursor-pointer"
                              >
                                <img src={url} alt={`Side Damage ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                                  Zoom
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {(!viewingClaim.accidentPhotos ||
                        (!viewingClaim.accidentPhotos.front?.length &&
                          !viewingClaim.accidentPhotos.rear?.length &&
                          !viewingClaim.accidentPhotos.side?.length)) && (
                        <div className="py-8 text-center text-xs text-slate-400">
                          No accident photos attached to this claim record.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Driving License Photos */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200">
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-4">
                      Policyholder Driving License
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {viewingClaim.drivingLicense?.front && viewingClaim.drivingLicense.front[0] ? (
                        <div
                          onClick={() => setLightboxImage(viewingClaim.drivingLicense!.front![0])}
                          className="p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer group"
                        >
                          <span className="text-xs font-bold text-slate-600 block mb-2">License Front</span>
                          <img
                            src={viewingClaim.drivingLicense.front[0]}
                            alt="License Front"
                            className="w-full h-40 object-cover rounded-lg group-hover:opacity-90"
                          />
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-400 text-center">
                          License Front not available
                        </div>
                      )}

                      {viewingClaim.drivingLicense?.rear && viewingClaim.drivingLicense.rear[0] ? (
                        <div
                          onClick={() => setLightboxImage(viewingClaim.drivingLicense!.rear![0])}
                          className="p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer group"
                        >
                          <span className="text-xs font-bold text-slate-600 block mb-2">License Rear</span>
                          <img
                            src={viewingClaim.drivingLicense.rear[0]}
                            alt="License Rear"
                            className="w-full h-40 object-cover rounded-lg group-hover:opacity-90"
                          />
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-400 text-center">
                          License Rear not available
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: AI FORENSIC DAMAGE ASSESSMENT */}
              {activeViewTab === "ai" && (
                <div className="space-y-6">
                  {viewingClaim.aiAnalysis?.isAnalyzed ? (
                    <>
                      {/* AI Executive Summary Card */}
                      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-2xl shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="bg-cyan-400 text-slate-900 font-extrabold text-xs px-3 py-1 rounded-lg">
                              AI Forensic Audit
                            </span>
                            <span className="text-xs text-cyan-200">
                              Analyzed on {formatSriLankaDateTime(viewingClaim.aiAnalysis.analyzedAt)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-cyan-300 block">Overall Damage Severity</span>
                            <span className="text-xl font-black text-white">
                              {viewingClaim.aiAnalysis.overallDamagePercentage || 0}%
                            </span>
                          </div>
                        </div>

                        <p className="text-xs sm:text-sm text-cyan-50 leading-relaxed font-normal bg-white/10 p-4 rounded-xl border border-white/10">
                          {viewingClaim.aiAnalysis.summary || "Forensic analysis completed successfully."}
                        </p>

                        <div className="grid grid-cols-3 gap-4 pt-2 border-t border-white/10 text-xs text-cyan-100">
                          <div>
                            <span className="text-cyan-300">Estimated Parts Cost:</span>
                            <div className="font-bold text-sm text-white mt-0.5">
                              LKR {(viewingClaim.aiAnalysis.totalEstimatedPartsCost || 0).toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <span className="text-cyan-300">Estimated Labor Cost:</span>
                            <div className="font-bold text-sm text-white mt-0.5">
                              LKR {(viewingClaim.aiAnalysis.totalEstimatedLaborCost || 0).toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <span className="text-cyan-300">Total Forensic Valuation:</span>
                            <div className="font-black text-sm text-cyan-300 mt-0.5">
                              LKR {(viewingClaim.aiAnalysis.totalEstimatedCost || 0).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Damaged Parts Itemized Table */}
                      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700">
                          Itemized Damaged Components Breakdown
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-extrabold uppercase text-slate-400">
                              <tr>
                                <th className="py-2.5 px-4">Component</th>
                                <th className="py-2.5 px-3">Damage %</th>
                                <th className="py-2.5 px-3">Recommended Action</th>
                                <th className="py-2.5 px-3 text-right">Parts Cost</th>
                                <th className="py-2.5 px-3 text-right">Labor Cost</th>
                                <th className="py-2.5 px-4 text-right">Total (LKR)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {(viewingClaim.aiAnalysis.damagedItems || []).map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="py-3 px-4 font-bold text-slate-900">{item.item}</td>
                                  <td className="py-3 px-3 font-semibold text-slate-700">{item.damagePercentage}%</td>
                                  <td className="py-3 px-3">
                                    <span
                                      className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                        item.action === "Replace"
                                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                                          : "bg-blue-50 text-blue-700 border border-blue-200"
                                      }`}
                                    >
                                      {item.action || "Repair"}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-right font-mono text-slate-600">
                                    {(item.estimatedPartCost || 0).toLocaleString()}
                                  </td>
                                  <td className="py-3 px-3 text-right font-mono text-slate-600">
                                    {(item.estimatedLaborCost || 0).toLocaleString()}
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                                    {(item.totalItemCost || 0).toLocaleString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                      <HugeiconsIcon icon={SecurityCheckIcon} className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                      <h4 className="text-sm font-bold text-slate-700">AI Assessment Not Yet Generated</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                        Forensic computer vision analysis will run automatically once accident photos are validated.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: GARAGE ESTIMATE & DISCREPANCY CROSS-CHECK */}
              {activeViewTab === "garage" && (
                <div className="space-y-6">
                  {viewingClaim.garageEstimateComparison?.isCompared ? (
                    <>
                      {/* Garage Comparison Header */}
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Registered Garage</span>
                          <div className="text-sm font-bold text-slate-900 mt-0.5">
                            {viewingClaim.garageEstimateComparison.garageName || "Authorized Service Center"}
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Garage vs AI Valuation</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-bold text-xs text-slate-900">
                              LKR {(viewingClaim.garageEstimateComparison.garageEstimatedTotal || 0).toLocaleString()}
                            </span>
                            <span className="text-slate-400">vs</span>
                            <span className="font-bold text-xs text-blue-600">
                              LKR {(viewingClaim.garageEstimateComparison.aiEstimatedTotal || 0).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Discrepancy Verdict</span>
                          <div className="mt-1">
                            <span
                              className={`text-xs px-3 py-1 rounded-md font-bold inline-block ${
                                getVerdictBadge(viewingClaim.garageEstimateComparison.verdict).className
                              }`}
                            >
                              {getVerdictBadge(viewingClaim.garageEstimateComparison.verdict).label}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Photo Verification Itemized Cross-Check */}
                      {viewingClaim.garageEstimateComparison.photoVerificationDetails &&
                        viewingClaim.garageEstimateComparison.photoVerificationDetails.length > 0 && (
                          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700">
                              Forensic Item Verification: Garage Claim vs Accident Evidence
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-extrabold uppercase text-slate-400">
                                  <tr>
                                    <th className="py-2.5 px-4">Claimed Component</th>
                                    <th className="py-2.5 px-3 text-right">Garage Quote</th>
                                    <th className="py-2.5 px-3 text-right">AI Estimate</th>
                                    <th className="py-2.5 px-3 text-center">Photo Evidence Match</th>
                                    <th className="py-2.5 px-4">Auditor Notes</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {viewingClaim.garageEstimateComparison.photoVerificationDetails.map((detail, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                      <td className="py-3 px-4 font-bold text-slate-900">{detail.item}</td>
                                      <td className="py-3 px-3 text-right font-mono font-medium text-slate-800">
                                        {(detail.garageCost || 0).toLocaleString()}
                                      </td>
                                      <td className="py-3 px-3 text-right font-mono font-medium text-blue-600">
                                        {(detail.aiCost || 0).toLocaleString()}
                                      </td>
                                      <td className="py-3 px-3 text-center">
                                        {detail.matchesAccidentPhotos ? (
                                          <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold border border-emerald-200">
                                            ✓ Verified In Photos
                                          </span>
                                        ) : (
                                          <span className="text-[10px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded font-bold border border-rose-300">
                                            ⚠️ No Impact Evidence
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-3 px-4 text-slate-600 text-[11px]">{detail.notes || "—"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                    </>
                  ) : (
                    <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                      <HugeiconsIcon icon={Analytics01Icon} className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                      <h4 className="text-sm font-bold text-slate-700">No Garage Quotation Uploaded Yet</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                        Garage repair invoices will be cross-referenced with photo evidence when submitted.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: FIELD AGENT & AUDIT LOGS */}
              {activeViewTab === "agent" && (
                <div className="space-y-6">
                  {/* Field Agent Inspection Report */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3">
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Field Agent Inspection Report</span>
                      <span className="text-blue-600 font-bold text-xs">
                        Agent: {viewingClaim.assignedAgent || "Unassigned"}
                      </span>
                    </h4>
                    {viewingClaim.inspectionReport ? (
                      <p className="text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100 leading-relaxed font-normal">
                        {viewingClaim.inspectionReport}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl border border-slate-100">
                        No field inspection report has been recorded yet.
                      </p>
                    )}
                  </div>

                  {/* Historical Audit Trail / Notes */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3">
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                      Claim Audit Notes & History ({viewingClaim.notes?.length || 0})
                    </h4>
                    <div className="space-y-2.5">
                      {(viewingClaim.notes || []).map((note, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                          <div className="flex items-center justify-between font-bold text-slate-800 mb-1">
                            <span className="text-blue-600">{note.addedBy}</span>
                            <span className="text-slate-400 font-normal text-[10px]">
                              {formatSriLankaDateTime(note.addedAt)}
                            </span>
                          </div>
                          <p className="text-slate-700">{note.text}</p>
                        </div>
                      ))}
                      {(!viewingClaim.notes || viewingClaim.notes.length === 0) && (
                        <div className="text-xs text-slate-400 text-center py-4">No internal notes logged.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 lg:px-8 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-400 font-mono">ID: {viewingClaim._id}</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => openEditModal(viewingClaim)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <HugeiconsIcon icon={Edit02Icon} className="w-4 h-4" />
                  <span>Modify Decision / Override</span>
                </button>
                <button
                  onClick={() => setViewingClaim(null)}
                  className="bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-200 transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* --- MODAL 2: Admin Override & Decision --- */}
      {/* ========================================== */}
      {editingClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-5 bg-[#102A43] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/30">
                  <HugeiconsIcon icon={Edit02Icon} className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Admin Decision Override — #{editingClaim.claimNumber}
                  </h3>
                  <p className="text-xs text-slate-300">
                    Apply administrative decision, adjust settlement payouts, or reassign branch/agent.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingClaim(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-all"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveDecision} className="p-6 lg:p-8 space-y-5 overflow-y-auto flex-1 text-xs font-medium">
              {/* Status & Priority Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Claim Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="Pending">Pending (Under Review)</option>
                    <option value="In Progress">In Progress (Active Assessment)</option>
                    <option value="Approved">Approved (Settlement Authorized)</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Priority Level</label>
                  <select
                    value={editFormData.priority}
                    onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="Normal">Normal Priority</option>
                    <option value="High">High Priority</option>
                    <option value="Urgent">🔥 Urgent Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>
              </div>

              {/* Workflow Step & Approved Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Approved Payout Amount (LKR)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="e.g. 75000"
                    value={editFormData.amount}
                    onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-emerald-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  {editingClaim.aiAnalysis?.totalEstimatedCost ? (
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      AI Estimate: LKR {editingClaim.aiAnalysis.totalEstimatedCost.toLocaleString()}
                    </span>
                  ) : null}
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Workflow Step</label>
                  <select
                    value={editFormData.currentStep}
                    onChange={(e) => setEditFormData({ ...editFormData, currentStep: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value={1}>Step 1: Registered / Submitted</option>
                    <option value={2}>Step 2: Field Inspection & Documents</option>
                    <option value={3}>Step 3: Garage Estimate & Approval</option>
                    <option value={4}>Step 4: Payment Settled / Closed</option>
                  </select>
                </div>
              </div>

              {/* Branch & Assigned Agent */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Assign Branch</label>
                  <select
                    value={editFormData.branch}
                    onChange={(e) => setEditFormData({ ...editFormData, branch: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {SRI_LANKA_BRANCHES.filter((b) => b !== "All").map((br) => (
                      <option key={br} value={br}>
                        {br} Branch
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Assign Field Agent</label>
                  <input
                    type="text"
                    placeholder="Enter or select agent name"
                    value={editFormData.assignedAgent}
                    onChange={(e) => setEditFormData({ ...editFormData, assignedAgent: e.target.value })}
                    list="agents-list"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <datalist id="agents-list">
                    {availableAgents.map((a: any) => (
                      <option key={a._id || a.email} value={a.name}>
                        {a.branch ? `[${a.branch}] ` : ""}{a.name}
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Rejection Reason (Conditional) */}
              {editFormData.status === "Rejected" && (
                <div>
                  <label className="block text-rose-700 font-bold mb-1.5">Reason for Rejection *</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Provide official rationale for rejecting this insurance claim..."
                    value={editFormData.rejectionReason}
                    onChange={(e) => setEditFormData({ ...editFormData, rejectionReason: e.target.value })}
                    className="w-full p-3 bg-rose-50/50 border border-rose-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
              )}

              {/* Admin Audit Note */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  Executive Admin Note (Logged in database history)
                </label>
                <textarea
                  rows={3}
                  placeholder="Add administrative notes, override explanation, or settlement remarks..."
                  value={editFormData.adminNote}
                  onChange={(e) => setEditFormData({ ...editFormData, adminNote: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingClaim(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDecision}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingDecision && <HugeiconsIcon icon={Loading03Icon} className="w-4 h-4 animate-spin" />}
                  <span>Save Decision</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* --- MODAL 3: Executive Reports Drawer --- */}
      {/* ========================================== */}
      {showReportsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 lg:px-8 py-5 bg-[#102A43] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00ddff]/20 text-[#00ddff] flex items-center justify-center border border-[#00ddff]/30">
                  <HugeiconsIcon icon={Analytics01Icon} className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Executive Claims Analytics & Reports</h3>
                  <p className="text-xs text-slate-300">
                    High-level damage distributions, branch financial breakdowns, and loss recovery metrics.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReportsModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl transition-all"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 lg:p-8 space-y-6 overflow-y-auto flex-1">
              {/* Financial Snapshot */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
                  <span className="text-[10px] font-bold text-blue-700 uppercase">Total Estimated Loss</span>
                  <div className="text-xl font-black text-blue-900 mt-1">
                    LKR {summary.totalEstimatedLoss.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-blue-600 mt-0.5 block">Aggregated damage claims</span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase">Total Approved Payouts</span>
                  <div className="text-xl font-black text-emerald-900 mt-1">
                    LKR {summary.totalApprovedPayout.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-emerald-600 mt-0.5 block">Settled to policyholders</span>
                </div>

                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-100">
                  <span className="text-[10px] font-bold text-purple-700 uppercase">Settlement Rate</span>
                  <div className="text-xl font-black text-purple-900 mt-1">
                    {summary.totalClaims > 0
                      ? Math.round((summary.approvedClaims / summary.totalClaims) * 100)
                      : 0}
                    %
                  </div>
                  <span className="text-[11px] text-purple-600 mt-0.5 block">
                    {summary.approvedClaims} of {summary.totalClaims} claims approved
                  </span>
                </div>
              </div>

              {/* Damage Category Distribution */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3">
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                  Claims Distribution by Damage Category
                </h4>
                <div className="space-y-2.5">
                  {Object.entries(summary.categoryDistribution || {}).map(([cat, count]) => {
                    const pct = summary.totalClaims > 0 ? Math.round((count / summary.totalClaims) * 100) : 0;
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-slate-700">
                          <span>{cat}</span>
                          <span>
                            {count} claims ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(summary.categoryDistribution || {}).length === 0 && (
                    <div className="text-xs text-slate-400 py-2">No category data recorded yet.</div>
                  )}
                </div>
              </div>

              {/* Branch Performance Breakdown Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700">
                  Branch Performance & Payout Breakdown
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-extrabold uppercase text-slate-400">
                      <tr>
                        <th className="py-2.5 px-4">Branch</th>
                        <th className="py-2.5 px-3 text-center">Total Claims</th>
                        <th className="py-2.5 px-3 text-center">Pending</th>
                        <th className="py-2.5 px-4 text-right">Total Approved Payout</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Object.entries(summary.branchBreakdown || {}).map(([branchName, brData]) => (
                        <tr key={branchName} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold text-slate-900">{branchName}</td>
                          <td className="py-3 px-3 text-center font-semibold text-slate-700">{brData.count}</td>
                          <td className="py-3 px-3 text-center">
                            {brData.pending > 0 ? (
                              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-bold">
                                {brData.pending}
                              </span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                            LKR {(brData.approvedPayout || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 lg:px-8 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                onClick={handleExportCSV}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" />
                <span>Export Full Claims Ledger (CSV)</span>
              </button>
              <button
                onClick={() => setShowReportsModal(false)}
                className="bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-200 transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* --- MODAL 4: Fullscreen Image Lightbox --- */}
      {/* ========================================== */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-slate-300 p-2 text-xs font-bold flex items-center gap-1 bg-white/10 rounded-xl"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
              <span>Close</span>
            </button>
            <img
              src={lightboxImage}
              alt="Accident Evidence Fullscreen"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* --- MODAL 5: Delete Confirmation Modal --- */}
      {/* ========================================== */}
      {deletingClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <HugeiconsIcon icon={AlertCircleIcon} className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900 text-center">
              Delete Claim Record #{deletingClaim.claimNumber}?
            </h3>
            <p className="text-xs text-slate-500 text-center mt-2 leading-relaxed">
              This action is strictly administrative and will permanently delete the claim history, associated damage
              photos, and messages. This cannot be undone.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={() => setDeletingClaim(null)}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteClaim}
                disabled={isDeleting}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting && <HugeiconsIcon icon={Loading03Icon} className="w-4 h-4 animate-spin" />}
                <span>Delete Claim</span>
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
    </div>
  );
}
