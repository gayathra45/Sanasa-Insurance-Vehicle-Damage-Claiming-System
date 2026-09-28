"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import AdminNavbar from "@/app/Components/Admin/Navbar";
import UserAvatarDropdown from "@/app/Components/UserAvatarDropdown";
import SimpleLoader from "@/app/Components/SimpleLoader";
import { API_URL } from "@/app/config";
import { formatSriLankaDateTime, formatSriLankaDate } from "@/app/utils/dateFormatter";
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
  UserIcon,
  File01Icon,
  Download01Icon,
  Edit02Icon,
  Delete02Icon,
  Car01Icon,
  SecurityCheckIcon,
  ViewIcon,
  Analytics01Icon,
  Clock01Icon
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
  "Vavuniya",
  "Sooriyawewa"
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

  // Filter States
  const [activeTab, setActiveTab] = useState<"All" | "Pending" | "In Progress" | "Approved" | "Rejected">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDamageType, setSelectedDamageType] = useState("All");
  const [selectedBranch, setSelectedBranch] = useState("All");
  const [selectedPriority, setSelectedPriority] = useState("All");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "amount-desc" | "amount-asc">("newest");

  // Modals
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

  // Toast message
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Fetch Claims
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
      showToast(err.message || "Failed to load claims", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedBranch, activeTab, selectedDamageType, selectedPriority, searchQuery, sortBy]);

  // Fetch Agents
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

  // Filtered Claims
  const filteredClaims = useMemo(() => {
    return claims;
  }, [claims]);

  // Open Edit Modal
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

  // Save Decision
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

      showToast(`Claim #${editingClaim.claimNumber} updated successfully.`, "success");
      setEditingClaim(null);
      fetchClaims(true);

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

      showToast(`Claim #${deletingClaim.claimNumber} deleted.`, "info");
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
    setSearchQuery("");
    setSortBy("newest");
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredClaims.length === 0) {
      showToast("No claims to export.", "info");
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
      "Approved Amount (LKR)",
      "Incident Date",
      "Location"
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
      c.amount || 0,
      `"${c.incidentDate}"`,
      `"${c.location?.replace(/"/g, '""') || ""}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Claims_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV report downloaded.", "success");
  };

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200";
      case "Pending":
        return "bg-amber-50 text-amber-700 border border-amber-200";
      case "In Progress":
        return "bg-blue-50 text-blue-700 border border-blue-200";
      case "Rejected":
        return "bg-rose-50 text-rose-700 border border-rose-200";
      default:
        return "bg-slate-50 text-slate-700 border border-slate-200";
    }
  };

  // Priority Badge Helper
  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case "Urgent":
        return "bg-rose-100 text-rose-800 font-semibold";
      case "High":
        return "bg-amber-100 text-amber-800 font-semibold";
      case "Low":
        return "bg-slate-100 text-slate-600 font-normal";
      default:
        return "bg-slate-100 text-slate-700 font-normal";
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50">
          <div
            className={`px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-xs font-semibold ${
              toastMessage.type === "success"
                ? "bg-slate-900 text-white"
                : toastMessage.type === "error"
                ? "bg-rose-600 text-white"
                : "bg-slate-800 text-white"
            }`}
          >
            {toastMessage.type === "success" && <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4 text-emerald-400" />}
            {toastMessage.type === "error" && <HugeiconsIcon icon={AlertCircleIcon} className="w-4 h-4 text-rose-300" />}
            {toastMessage.type === "info" && <HugeiconsIcon icon={Alert02Icon} className="w-4 h-4 text-sky-300" />}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-row min-h-0">
        <AdminNavbar />

        <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
          {/* Header */}
          <header className="bg-white border-b border-slate-100 text-slate-800 px-8 py-4 flex justify-between items-center select-none shadow-sm shrink-0 h-[80px] sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("open-admin-mobile-menu"))}
                className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 active:scale-95 transition-all cursor-pointer focus:outline-none"
              >
                <HugeiconsIcon icon={Menu01Icon} className="w-6 h-6" strokeWidth={2.5} />
              </button>
              {/* Mobile page title */}
              <h1 className="lg:hidden text-lg font-semibold text-slate-800 tracking-tight">
                Claims
              </h1>
              {/* Desktop welcome title */}
              <h1 className="hidden lg:flex text-xl font-semibold text-slate-800 items-center gap-2 pl-2 lg:pl-0 truncate">
                <span className="bg-[#102A43] text-white text-base px-4 py-2 rounded-xl font-semibold shadow-sm tracking-wide">
                  Admin Portal
                </span>
                <span className="hidden lg:inline"> — Claims Management</span>
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-sm font-semibold bg-slate-100 px-4 py-2 rounded-full text-slate-600 border border-slate-200">
                System Admin
              </div>
              <UserAvatarDropdown userType="admin" />
            </div>
          </header>

          {/* Main Container */}
          <main className="flex-1 p-6 lg:p-8 bg-slate-50 flex flex-col gap-6 max-w-7xl w-full mx-auto">
            {/* Top Summaries (Simple 4 Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 select-none">
              {/* Total Claims */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-500">Total Claims</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {summary.totalClaims}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Across all branches</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                  <HugeiconsIcon icon={File01Icon} className="w-5 h-5" />
                </div>
              </div>

              {/* Pending Reviews */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-amber-700">Pending Reviews</div>
                  <div className="text-2xl font-bold text-amber-600 mt-1">
                    {summary.pendingClaims}
                  </div>
                  <div className="text-[11px] text-amber-600/80 mt-0.5">Awaiting decision</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <HugeiconsIcon icon={Clock01Icon} className="w-5 h-5" />
                </div>
              </div>

              {/* In Progress */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-blue-700">In Progress</div>
                  <div className="text-2xl font-bold text-blue-600 mt-1">
                    {summary.inProgressClaims}
                  </div>
                  <div className="text-[11px] text-blue-500 mt-0.5">Field inspection & garage</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <HugeiconsIcon icon={Car01Icon} className="w-5 h-5" />
                </div>
              </div>

              {/* Approved Payouts */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-emerald-700">Approved Payouts</div>
                  <div className="text-xl font-bold text-emerald-600 mt-1">
                    LKR {summary.totalApprovedPayout.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-emerald-600/80 mt-0.5">
                    {summary.approvedClaims} approved claims
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Toolbar: Search, Filters & Actions */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm space-y-4 select-none">
              {/* Top Row: Search + Action Buttons */}
              <div className="flex flex-col md:flex-row justify-between items-center gap-3">
                {/* Search Bar */}
                <div className="relative w-full md:w-[360px]">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <HugeiconsIcon icon={Search01Icon} className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Claim #, Plate, NIC, Name, Agent..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-all bg-slate-50/50"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2.5 w-full md:w-auto">
                  <button
                    onClick={() => fetchClaims(true)}
                    disabled={refreshing}
                    title="Refresh"
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <HugeiconsIcon icon={RefreshIcon} className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                  </button>

                  <button
                    onClick={() => setShowReportsModal(true)}
                    className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all border border-slate-200 cursor-pointer flex items-center gap-1.5"
                  >
                    <HugeiconsIcon icon={Analytics01Icon} className="w-4 h-4" />
                    <span>Summaries & Reports</span>
                  </button>

                  <button
                    onClick={handleExportCSV}
                    className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all border border-slate-200 cursor-pointer flex items-center gap-1.5"
                  >
                    <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-t border-slate-100 pt-3">
                {[
                  { id: "All", label: "All Claims", count: summary.totalClaims },
                  { id: "Pending", label: "Pending", count: summary.pendingClaims },
                  { id: "In Progress", label: "In Progress", count: summary.inProgressClaims },
                  { id: "Approved", label: "Approved", count: summary.approvedClaims },
                  { id: "Rejected", label: "Rejected", count: summary.rejectedClaims }
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                        isActive
                          ? "bg-slate-900 text-white font-semibold"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                          isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Dropdown Filters Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
                {/* Damage Type */}
                <div>
                  <select
                    value={selectedDamageType}
                    onChange={(e) => setSelectedDamageType(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
                  >
                    <option value="All">All Damage Types</option>
                    {DAMAGE_CATEGORIES.filter((c) => c !== "All").map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Branch */}
                <div>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
                  >
                    <option value="All">All Branches</option>
                    {SRI_LANKA_BRANCHES.filter((b) => b !== "All").map((br) => (
                      <option key={br} value={br}>
                        {br} Branch
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
                  >
                    <option value="All">All Priorities</option>
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Normal">Normal</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                {/* Sort */}
                <div>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="amount-desc">Payout: High to Low</option>
                    <option value="amount-asc">Payout: Low to High</option>
                  </select>
                </div>
              </div>

              {/* Active Filter Tags */}
              {(selectedBranch !== "All" ||
                selectedDamageType !== "All" ||
                selectedPriority !== "All" ||
                searchQuery ||
                activeTab !== "All") && (
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-500">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span>Filters active:</span>
                    {activeTab !== "All" && (
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                        Status: {activeTab}
                      </span>
                    )}
                    {selectedBranch !== "All" && (
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                        Branch: {selectedBranch}
                      </span>
                    )}
                    {selectedDamageType !== "All" && (
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                        Type: {selectedDamageType}
                      </span>
                    )}
                    {selectedPriority !== "All" && (
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                        Priority: {selectedPriority}
                      </span>
                    )}
                    {searchQuery && (
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                        Search: &quot;{searchQuery}&quot;
                      </span>
                    )}
                  </div>

                  <button
                    onClick={handleResetFilters}
                    className="text-blue-600 hover:underline font-medium cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>

            {/* Claims Table Card */}
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden flex flex-col">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <SimpleLoader />
                  <p className="text-xs text-slate-400">Loading claims...</p>
                </div>
              ) : filteredClaims.length === 0 ? (
                <div className="py-16 px-6 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                    <HugeiconsIcon icon={File01Icon} className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800">No Claims Found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                    No insurance claims matched the selected filters or search terms.
                  </p>
                  <button
                    onClick={handleResetFilters}
                    className="bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-xl"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-5">Claim #</th>
                        <th className="py-3 px-4">Policyholder</th>
                        <th className="py-3 px-4">Vehicle</th>
                        <th className="py-3 px-4">Damage Type</th>
                        <th className="py-3 px-4">Branch & Agent</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {filteredClaims.map((claim) => (
                        <tr
                          key={claim._id}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                          onClick={() => {
                            setViewingClaim(claim);
                            setActiveViewTab("overview");
                          }}
                        >
                          {/* Claim # & Priority */}
                          <td className="py-3.5 px-5">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-slate-900">
                                #{claim.claimNumber}
                              </span>
                              <div className="flex items-center gap-1">
                                <span className={`text-[10px] px-1.5 py-0.2 rounded ${getPriorityBadge(claim.priority)}`}>
                                  {claim.priority || "Normal"}
                                </span>
                                {claim.isManuallyUpdated && (
                                  <span className="text-[10px] text-purple-700 font-medium">
                                    • Modified
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Policyholder */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-900">
                                {claim.policyHolderName || "Policyholder"}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">{claim.userNic}</span>
                            </div>
                          </td>

                          {/* Vehicle */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-800 font-mono">
                                {claim.vehiclePlate}
                              </span>
                              <span className="text-[11px] text-slate-400 truncate max-w-[130px]">
                                {claim.vehicleDetails || claim.incidentDate}
                              </span>
                            </div>
                          </td>

                          {/* Damage Type */}
                          <td className="py-3.5 px-4">
                            <span className="text-slate-700">
                              {claim.damageType}
                            </span>
                          </td>

                          {/* Branch & Agent */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="text-slate-800 font-medium">{claim.branch}</span>
                              <span className="text-[11px] text-slate-400">
                                {claim.assignedAgent || "Unassigned"}
                              </span>
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="py-3.5 px-4 font-medium">
                            {claim.amount !== null && claim.amount !== undefined ? (
                              <span className="text-emerald-700 font-semibold">
                                LKR {claim.amount.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Pending</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${getStatusBadge(claim.status)}`}>
                              {claim.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setViewingClaim(claim);
                                  setActiveViewTab("overview");
                                }}
                                title="View Details"
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                              >
                                <HugeiconsIcon icon={ViewIcon} className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => openEditModal(claim)}
                                title="Edit / Decision"
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-all"
                              >
                                <HugeiconsIcon icon={Edit02Icon} className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => setDeletingClaim(claim)}
                                title="Delete"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-all"
                              >
                                <HugeiconsIcon icon={Delete02Icon} className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* ========================================== */}
      {/* --- MODAL 1: Claim Inspection Details --- */}
      {/* ========================================== */}
      {viewingClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Claim #{viewingClaim.claimNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  {viewingClaim.policyHolderName || "Policyholder"} • {viewingClaim.vehiclePlate} • {viewingClaim.branch}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditModal(viewingClaim)}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                >
                  Edit Decision
                </button>
                <button
                  onClick={() => setViewingClaim(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-4 px-6 border-b border-slate-100 text-xs font-medium text-slate-600 overflow-x-auto no-scrollbar">
              {[
                { id: "overview", label: "Overview" },
                { id: "photos", label: "Damage Photos" },
                { id: "ai", label: "AI Valuation" },
                { id: "garage", label: "Garage Estimate" },
                { id: "agent", label: "Agent & Notes" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveViewTab(tab.id as any)}
                  className={`py-3 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeViewTab === tab.id
                      ? "border-slate-900 text-slate-900 font-semibold"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* TAB 1: OVERVIEW */}
              {activeViewTab === "overview" && (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Status</span>
                      <div className="mt-0.5">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${getStatusBadge(viewingClaim.status)}`}>
                          {viewingClaim.status}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Approved Amount</span>
                      <div className="text-xs font-semibold text-slate-800 mt-0.5">
                        {viewingClaim.amount !== null && viewingClaim.amount !== undefined
                          ? `LKR ${viewingClaim.amount.toLocaleString()}`
                          : "Not settled"}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Priority</span>
                      <div className="text-xs text-slate-800 mt-0.5">{viewingClaim.priority || "Normal"}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Workflow Step</span>
                      <div className="text-xs text-slate-800 mt-0.5">Step {viewingClaim.currentStep} of 4</div>
                    </div>
                  </div>

                  {/* Incident Info */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Incident Description</span>
                    <p className="text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-200/60">
                      {viewingClaim.description || "No description provided."}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-slate-600">
                      <div>
                        <span className="text-slate-400 block">Date & Time:</span>
                        <span className="font-medium text-slate-800">{viewingClaim.incidentDate} {viewingClaim.incidentTime}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Location:</span>
                        <span className="font-medium text-slate-800">{viewingClaim.location}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Damage Category:</span>
                        <span className="font-medium text-slate-800">{viewingClaim.damageType}</span>
                      </div>
                    </div>
                  </div>

                  {/* Policyholder & Vehicle */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1.5">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Policyholder Details</span>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Name:</span>
                        <span className="font-medium text-slate-800">{viewingClaim.policyHolderName || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">NIC:</span>
                        <span className="font-mono text-slate-800">{viewingClaim.userNic}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Email:</span>
                        <span className="text-slate-700">{viewingClaim.policyHolderEmail || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Mobile:</span>
                        <span className="text-slate-700">{viewingClaim.policyHolderMobile || "N/A"}</span>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1.5">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Vehicle & Bank</span>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Plate Number:</span>
                        <span className="font-mono font-bold text-slate-800">{viewingClaim.vehiclePlate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Make / Model:</span>
                        <span className="text-slate-800">{viewingClaim.vehicleDetails || "Insured Vehicle"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Bank Account:</span>
                        <span className="text-slate-800">{viewingClaim.bankAccount || viewingClaim.bankName ? `${viewingClaim.bankName || ""} ${viewingClaim.bankAccount || ""}` : "Not provided"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Bank Branch:</span>
                        <span className="text-slate-800">{viewingClaim.bankBranch || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PHOTOS */}
              {activeViewTab === "photos" && (
                <div className="space-y-4">
                  {/* Accident Photos */}
                  <div>
                    <span className="text-xs font-semibold text-slate-700 block mb-2">Accident Photos</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        ...(viewingClaim.accidentPhotos?.front || []),
                        ...(viewingClaim.accidentPhotos?.rear || []),
                        ...(viewingClaim.accidentPhotos?.side || [])
                      ].map((url, i) => (
                        <div
                          key={i}
                          onClick={() => setLightboxImage(url)}
                          className="aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-200 cursor-pointer group relative"
                        >
                          <img src={url} alt={`Accident ${i + 1}`} className="w-full h-full object-cover group-hover:opacity-90" />
                        </div>
                      ))}
                    </div>
                    {!viewingClaim.accidentPhotos?.front?.length &&
                      !viewingClaim.accidentPhotos?.rear?.length &&
                      !viewingClaim.accidentPhotos?.side?.length && (
                        <p className="text-slate-400 py-4 text-center">No accident photos submitted.</p>
                      )}
                  </div>

                  {/* Driving License */}
                  <div className="pt-2">
                    <span className="text-xs font-semibold text-slate-700 block mb-2">Driving License</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {viewingClaim.drivingLicense?.front && viewingClaim.drivingLicense.front[0] && (
                        <div onClick={() => setLightboxImage(viewingClaim.drivingLicense!.front![0])} className="cursor-pointer">
                          <span className="text-[11px] text-slate-400 block mb-1">License Front</span>
                          <img src={viewingClaim.drivingLicense.front[0]} alt="License Front" className="w-full h-36 object-cover rounded-lg border border-slate-200" />
                        </div>
                      )}
                      {viewingClaim.drivingLicense?.rear && viewingClaim.drivingLicense.rear[0] && (
                        <div onClick={() => setLightboxImage(viewingClaim.drivingLicense!.rear![0])} className="cursor-pointer">
                          <span className="text-[11px] text-slate-400 block mb-1">License Rear</span>
                          <img src={viewingClaim.drivingLicense.rear[0]} alt="License Rear" className="w-full h-36 object-cover rounded-lg border border-slate-200" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: AI VALUATION */}
              {activeViewTab === "ai" && (
                <div className="space-y-4">
                  {viewingClaim.aiAnalysis?.isAnalyzed ? (
                    <>
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-slate-800">AI Forensic Summary</span>
                          <span className="text-xs text-slate-500 font-medium">
                            Overall Severity: {viewingClaim.aiAnalysis.overallDamagePercentage || 0}%
                          </span>
                        </div>
                        <p className="text-slate-700 leading-relaxed">{viewingClaim.aiAnalysis.summary}</p>
                        <div className="grid grid-cols-3 gap-3 pt-2 text-slate-600 border-t border-slate-200">
                          <div>
                            <span className="text-slate-400 block">Parts Cost:</span>
                            <span className="font-semibold text-slate-800">
                              LKR {(viewingClaim.aiAnalysis.totalEstimatedPartsCost || 0).toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Labor Cost:</span>
                            <span className="font-semibold text-slate-800">
                              LKR {(viewingClaim.aiAnalysis.totalEstimatedLaborCost || 0).toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Total Estimate:</span>
                            <span className="font-semibold text-blue-700">
                              LKR {(viewingClaim.aiAnalysis.totalEstimatedCost || 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                            <tr>
                              <th className="py-2 px-3">Part</th>
                              <th className="py-2 px-2">Action</th>
                              <th className="py-2 px-2 text-right">Parts (LKR)</th>
                              <th className="py-2 px-2 text-right">Labor (LKR)</th>
                              <th className="py-2 px-3 text-right">Total (LKR)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(viewingClaim.aiAnalysis.damagedItems || []).map((item, idx) => (
                              <tr key={idx}>
                                <td className="py-2 px-3 font-medium text-slate-800">{item.item}</td>
                                <td className="py-2 px-2 text-slate-600">{item.action || "Repair"}</td>
                                <td className="py-2 px-2 text-right font-mono">{(item.estimatedPartCost || 0).toLocaleString()}</td>
                                <td className="py-2 px-2 text-right font-mono">{(item.estimatedLaborCost || 0).toLocaleString()}</td>
                                <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800">
                                  {(item.totalItemCost || 0).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <p className="text-slate-400 py-8 text-center">AI analysis not generated for this claim.</p>
                  )}
                </div>
              )}

              {/* TAB 4: GARAGE ESTIMATE */}
              {activeViewTab === "garage" && (
                <div className="space-y-4">
                  {viewingClaim.garageEstimateComparison?.isCompared ? (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-800">
                          {viewingClaim.garageEstimateComparison.garageName || "Garage Estimate"}
                        </span>
                        <span className="font-semibold text-xs px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                          Verdict: {viewingClaim.garageEstimateComparison.verdict || "Reviewed"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-slate-600">
                        <div>
                          <span className="text-slate-400 block">Garage Total:</span>
                          <span className="font-semibold text-slate-800">
                            LKR {(viewingClaim.garageEstimateComparison.garageEstimatedTotal || 0).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">AI Estimate Total:</span>
                          <span className="font-semibold text-slate-800">
                            LKR {(viewingClaim.garageEstimateComparison.aiEstimatedTotal || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      {viewingClaim.garageEstimateComparison.summary && (
                        <p className="text-slate-700 pt-2 border-t border-slate-200">
                          {viewingClaim.garageEstimateComparison.summary}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-400 py-8 text-center">No garage estimate comparison uploaded yet.</p>
                  )}
                </div>
              )}

              {/* TAB 5: AGENT & NOTES */}
              {activeViewTab === "agent" && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1.5">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Field Agent Report</span>
                    <p className="text-slate-700 leading-relaxed">
                      {viewingClaim.inspectionReport || "No field report submitted yet."}
                    </p>
                    <span className="text-slate-400 block text-[11px] pt-1">
                      Assigned Agent: {viewingClaim.assignedAgent || "Unassigned"}
                    </span>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Audit Log Notes</span>
                    <div className="space-y-2">
                      {(viewingClaim.notes || []).map((n, i) => (
                        <div key={i} className="p-2.5 bg-white rounded-lg border border-slate-200/60 text-xs">
                          <div className="flex justify-between text-slate-400 text-[10px] mb-0.5">
                            <span className="font-semibold text-slate-700">{n.addedBy}</span>
                            <span>{formatSriLankaDateTime(n.addedAt)}</span>
                          </div>
                          <p className="text-slate-700">{n.text}</p>
                        </div>
                      ))}
                      {(!viewingClaim.notes || viewingClaim.notes.length === 0) && (
                        <p className="text-slate-400">No notes recorded.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewingClaim(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl border border-slate-200 text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* --- MODAL 2: Admin Override / Decision --- */}
      {/* ========================================== */}
      {editingClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Decision Override — #{editingClaim.claimNumber}
              </h3>
              <button
                onClick={() => setEditingClaim(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDecision} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Priority</label>
                  <select
                    value={editFormData.priority}
                    onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Approved Payout (LKR)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 75000"
                    value={editFormData.amount}
                    onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Workflow Step</label>
                  <select
                    value={editFormData.currentStep}
                    onChange={(e) => setEditFormData({ ...editFormData, currentStep: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  >
                    <option value={1}>Step 1: Registered</option>
                    <option value={2}>Step 2: Field Inspection</option>
                    <option value={3}>Step 3: Approval / Settlement</option>
                    <option value={4}>Step 4: Closed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Branch</label>
                  <select
                    value={editFormData.branch}
                    onChange={(e) => setEditFormData({ ...editFormData, branch: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  >
                    {SRI_LANKA_BRANCHES.filter((b) => b !== "All").map((br) => (
                      <option key={br} value={br}>
                        {br}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Assigned Agent</label>
                  <input
                    type="text"
                    placeholder="Agent name"
                    value={editFormData.assignedAgent}
                    onChange={(e) => setEditFormData({ ...editFormData, assignedAgent: e.target.value })}
                    list="agents-list"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
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

              {editFormData.status === "Rejected" && (
                <div>
                  <label className="block text-rose-600 font-semibold mb-1">Reason for Rejection *</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Enter reason for rejection..."
                    value={editFormData.rejectionReason}
                    onChange={(e) => setEditFormData({ ...editFormData, rejectionReason: e.target.value })}
                    className="w-full p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-slate-800"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Admin Audit Note</label>
                <textarea
                  rows={2}
                  placeholder="Add administrative notes..."
                  value={editFormData.adminNote}
                  onChange={(e) => setEditFormData({ ...editFormData, adminNote: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingClaim(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDecision}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingDecision && <HugeiconsIcon icon={Loading03Icon} className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* --- MODAL 3: Summaries & Reports --- */}
      {/* ========================================== */}
      {showReportsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Executive Claims Summaries & Reports</h3>
              <button
                onClick={() => setShowReportsModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs overflow-y-auto max-h-[75vh]">
              {/* Category Distribution */}
              <div className="space-y-2.5">
                <span className="font-semibold text-slate-800 block">Claims by Damage Category</span>
                <div className="space-y-2">
                  {Object.entries(summary.categoryDistribution || {}).map(([cat, count]) => {
                    const pct = summary.totalClaims > 0 ? Math.round((count / summary.totalClaims) * 100) : 0;
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between text-slate-700">
                          <span>{cat}</span>
                          <span className="font-medium">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-slate-800 h-full rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(summary.categoryDistribution || {}).length === 0 && (
                    <p className="text-slate-400">No data available.</p>
                  )}
                </div>
              </div>

              {/* Branch Breakdown */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="font-semibold text-slate-800 block">Branch Breakdown</span>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                      <tr>
                        <th className="py-2 px-3">Branch</th>
                        <th className="py-2 px-3 text-center">Total</th>
                        <th className="py-2 px-3 text-center">Pending</th>
                        <th className="py-2 px-3 text-right">Approved Payout</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Object.entries(summary.branchBreakdown || {}).map(([br, d]) => (
                        <tr key={br}>
                          <td className="py-2 px-3 font-medium text-slate-800">{br}</td>
                          <td className="py-2 px-3 text-center">{d.count}</td>
                          <td className="py-2 px-3 text-center">{d.pending}</td>
                          <td className="py-2 px-3 text-right font-mono font-medium text-emerald-700">
                            LKR {(d.approvedPayout || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-between">
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5"
              >
                <HugeiconsIcon icon={Download01Icon} className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => setShowReportsModal(false)}
                className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl border border-slate-200 text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* --- MODAL 4: Fullscreen Photo Lightbox --- */}
      {/* ========================================== */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-pointer"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh]">
            <img src={lightboxImage} alt="Evidence" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* --- MODAL 5: Delete Confirmation --- */}
      {/* ========================================== */}
      {deletingClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-200 text-center">
            <h3 className="text-sm font-bold text-slate-900">
              Delete Claim #{deletingClaim.claimNumber}?
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Are you sure you want to permanently remove this claim record?
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setDeletingClaim(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteClaim}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Chat Support Button */}
      <button
        className="fixed bottom-8 right-8 z-40 bg-[#00ddff] hover:bg-[#00c8e6] text-white p-5 rounded-full shadow-2xl transition-all duration-150 hover:scale-110 active:scale-95 cursor-pointer focus:outline-none border-none flex items-center justify-center"
        aria-label="Chat support"
      >
        <HugeiconsIcon icon={BubbleChatIcon} className="w-7 h-7 text-white" strokeWidth={2} />
      </button>
    </div>
  );
}
