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
  UserMultiple02Icon,
  File01Icon,
  Download01Icon,
  Edit02Icon,
  Delete02Icon,
  Car01Icon,
  SecurityCheckIcon,
  ViewIcon,
  Analytics01Icon,
  Clock01Icon,
  Add01Icon,
  Mail01Icon,
  Call02Icon,
  Location01Icon,
  Logout01Icon
} from "@hugeicons/core-free-icons";

// ==========================================
// --- Type Definitions ---
// ==========================================

interface Vehicle {
  _id?: string;
  numberPlate: string;
  vehicleType: string;
  year: string;
  company: string;
  model: string;
  engineNumber: string;
  chassisNumber: string;
  policyNumber: string;
  status?: string;
}

interface BankDetails {
  bankName?: string;
  branchName?: string;
  accountNumber?: string;
  accountHolderName?: string;
}

interface Documents {
  nicFront?: string;
  nicBack?: string;
  vehicleReg?: string;
  revenueLicense?: string;
}

interface LoginActivityRecord {
  _id: string;
  userType: string;
  userId?: string;
  userName?: string;
  userEmail: string;
  userNic?: string;
  branch: string;
  action: string;
  ipAddress: string;
  device: string;
  browser?: string;
  os?: string;
  status: string;
  details?: string;
  createdAt: string;
}

interface PolicyHolder {
  _id: string;
  firstName: string;
  lastName: string;
  nic: string;
  mobile: string;
  email: string;
  dob: string;
  address: string;
  province: string;
  city: string;
  branch: string;
  referenceNumber: string;
  profilePhoto?: string;
  vehicles?: Vehicle[];
  documents?: Documents;
  bankDetails?: BankDetails;
  status: "Approved" | "Pending" | "Rejected" | string;
  totalClaimsCount?: number;
  activeClaimsCount?: number;
  totalApprovedPayout?: number;
  lastLoginAt?: string | null;
  lastLoginIp?: string;
  lastLoginDevice?: string;
  loginCount?: number;
  createdAt: string;
}

interface ClaimRecord {
  _id: string;
  claimNumber: string;
  vehiclePlate: string;
  incidentDate: string;
  damageType: string;
  status: string;
  amount?: number | null;
  priority?: string;
  location?: string;
  createdAt: string;
}

interface PolicyholdersSummary {
  totalPolicyholders: number;
  approvedPolicyholders: number;
  pendingPolicyholders: number;
  totalVehicles: number;
  branchBreakdown: Record<string, { count: number; vehicles: number; pending: number }>;
  provinceDistribution: Record<string, number>;
}

const SRI_LANKA_PROVINCES = [
  "All",
  "Western Province",
  "Central Province",
  "Southern Province",
  "Northern Province",
  "Eastern Province",
  "North Western Province",
  "North Central Province",
  "Uva Province",
  "Sabaragamuwa Province"
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

export default function AdminPolicyHoldersPage() {
  // Data States
  const [policyholders, setPolicyholders] = useState<PolicyHolder[]>([]);
  const [summary, setSummary] = useState<PolicyholdersSummary>({
    totalPolicyholders: 0,
    approvedPolicyholders: 0,
    pendingPolicyholders: 0,
    totalVehicles: 0,
    branchBreakdown: {},
    provinceDistribution: {}
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter States
  const [activeTab, setActiveTab] = useState<"All" | "Approved" | "Pending">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("All");
  const [selectedProvince, setSelectedProvince] = useState("All");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name-asc" | "name-desc">("newest");

  // Modals
  const [viewingHolder, setViewingHolder] = useState<PolicyHolder | null>(null);
  const [holderClaims, setHolderClaims] = useState<ClaimRecord[]>([]);
  const [holderLoginActivities, setHolderLoginActivities] = useState<LoginActivityRecord[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [loadingLoginActivities, setLoadingLoginActivities] = useState(false);
  const [activeViewTab, setActiveViewTab] = useState<"overview" | "vehicles" | "documents" | "claims" | "activity">("overview");

  const [editingHolder, setEditingHolder] = useState<PolicyHolder | null>(null);
  const [editFormData, setEditFormData] = useState({
    firstName: "",
    lastName: "",
    mobile: "",
    email: "",
    dob: "",
    address: "",
    city: "",
    province: "",
    branch: "",
    status: "Approved",
    bankName: "",
    branchName: "",
    accountNumber: "",
    accountHolderName: ""
  });
  const [savingHolder, setSavingHolder] = useState(false);

  const [showReportsModal, setShowReportsModal] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [deletingHolder, setDeletingHolder] = useState<PolicyHolder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Session termination states
  const [terminatingSession, setTerminatingSession] = useState(false);
  const [showTerminateConfirm, setShowTerminateConfirm] = useState(false);
  const [terminateReason, setTerminateReason] = useState("");

  // Toast message
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Helper for image URLs
  const getFullImageUrl = (rawUrl?: string) => {
    if (!rawUrl) return "";
    if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://") || rawUrl.startsWith("data:")) {
      return rawUrl;
    }
    return `${API_URL.replace("/api", "")}/uploads/${rawUrl}`;
  };

  // Fetch Policyholders
  const fetchPolicyholders = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams();
      if (selectedBranch && selectedBranch !== "All") params.append("branch", selectedBranch);
      if (activeTab && activeTab !== "All") params.append("status", activeTab);
      if (selectedProvince && selectedProvince !== "All") params.append("province", selectedProvince);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      if (sortBy) params.append("sortBy", sortBy);

      const res = await fetch(`${API_URL}/admin/policyholders?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load policyholders");
      const data = await res.json();

      setPolicyholders(data.policyholders || []);
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (err: any) {
      console.error("Error fetching policyholders:", err);
      showToast(err.message || "Failed to load policyholders", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedBranch, activeTab, selectedProvince, searchQuery, sortBy]);

  useEffect(() => {
    fetchPolicyholders();
  }, [fetchPolicyholders]);

  // Load Single Holder Claims & Login Activity
  const loadHolderDetails = async (nic: string) => {
    if (!nic) return;
    setLoadingClaims(true);
    setLoadingLoginActivities(true);
    try {
      const res = await fetch(`${API_URL}/admin/policyholders/${encodeURIComponent(nic)}`);
      if (res.ok) {
        const data = await res.json();
        setHolderClaims(data.claims || []);
        setHolderLoginActivities(data.loginActivities || []);
        if (data.policyholder) {
          setViewingHolder(data.policyholder);
        }
      }
    } catch (err) {
      console.error("Error loading details for policyholder:", err);
    } finally {
      setLoadingClaims(false);
      setLoadingLoginActivities(false);
    }
  };

  // Open Details Modal
  const openDetailsModal = (holder: PolicyHolder) => {
    setViewingHolder(holder);
    setActiveViewTab("overview");
    setHolderClaims([]);
    setHolderLoginActivities([]);
    loadHolderDetails(holder.nic);
  };

  // Open Edit Modal
  const openEditModal = (holder: PolicyHolder) => {
    setEditingHolder(holder);
    setEditFormData({
      firstName: holder.firstName || "",
      lastName: holder.lastName || "",
      mobile: holder.mobile || "",
      email: holder.email || "",
      dob: holder.dob || "",
      address: holder.address || "",
      city: holder.city || "",
      province: holder.province || "Western Province",
      branch: holder.branch || "Galle",
      status: holder.status || "Approved",
      bankName: holder.bankDetails?.bankName || "",
      branchName: holder.bankDetails?.branchName || "",
      accountNumber: holder.bankDetails?.accountNumber || "",
      accountHolderName: holder.bankDetails?.accountHolderName || ""
    });
  };

  // Save Policyholder Profile
  const handleSaveHolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHolder) return;

    setSavingHolder(true);
    try {
      const res = await fetch(`${API_URL}/admin/policyholders/${editingHolder._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update policyholder");

      showToast(`Policyholder ${data.policyholder.firstName} updated successfully.`, "success");
      setEditingHolder(null);
      fetchPolicyholders(true);

      if (viewingHolder && viewingHolder._id === editingHolder._id) {
        setViewingHolder(data.policyholder);
      }
    } catch (err: any) {
      console.error("Save policyholder error:", err);
      showToast(err.message || "Failed to update policyholder", "error");
    } finally {
      setSavingHolder(false);
    }
  };

  // Delete Policyholder
  const handleDeleteHolder = async () => {
    if (!deletingHolder) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_URL}/admin/policyholders/${deletingHolder._id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete policyholder");

      showToast(`Policyholder ${deletingHolder.firstName} ${deletingHolder.lastName} removed.`, "info");
      setDeletingHolder(null);
      if (viewingHolder && viewingHolder._id === deletingHolder._id) {
        setViewingHolder(null);
      }
      fetchPolicyholders(true);
    } catch (err: any) {
      console.error("Delete policyholder error:", err);
      showToast(err.message || "Failed to delete policyholder", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Terminate Policyholder Active Session (Force Logout)
  const handleTerminateHolderSession = async () => {
    if (!viewingHolder) return;
    setTerminatingSession(true);
    try {
      const res = await fetch(`${API_URL}/admin/sessions/terminate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userType: "PolicyHolder",
          targetId: viewingHolder._id,
          reason: terminateReason || "Administrator Security Action",
          adminName: "System Admin"
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to terminate login session.");

      showToast(`Active login session for ${viewingHolder.firstName} ${viewingHolder.lastName} terminated successfully.`, "success");
      setShowTerminateConfirm(false);
      setTerminateReason("");

      // Reload activity audit logs
      loadHolderDetails(viewingHolder.nic);
    } catch (err: any) {
      console.error("Terminate session error:", err);
      showToast(err.message || "Failed to terminate session", "error");
    } finally {
      setTerminatingSession(false);
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setActiveTab("All");
    setSelectedBranch("All");
    setSelectedProvince("All");
    setSearchQuery("");
    setSortBy("newest");
  };

  // Export CSV
  const handleExportCSV = () => {
    if (policyholders.length === 0) {
      showToast("No records to export.", "info");
      return;
    }

    const headers = [
      "Reference Number",
      "Full Name",
      "NIC",
      "Mobile",
      "Email",
      "Date of Birth",
      "Branch",
      "Province",
      "City",
      "Address",
      "Registered Vehicles Count",
      "Total Claims Filed",
      "Account Status",
      "Joined Date"
    ];

    const rows = policyholders.map((u) => [
      `"${u.referenceNumber}"`,
      `"${u.firstName} ${u.lastName}"`,
      `"${u.nic}"`,
      `"${u.mobile}"`,
      `"${u.email}"`,
      `"${u.dob}"`,
      `"${u.branch}"`,
      `"${u.province}"`,
      `"${u.city}"`,
      `"${u.address?.replace(/"/g, '""') || ""}"`,
      u.vehicles?.length || 0,
      u.totalClaimsCount || 0,
      `"${u.status}"`,
      `"${formatSriLankaDate(u.createdAt)}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Sanasa_Policyholders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Policyholders export file downloaded.", "success");
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
                Policy Holders
              </h1>
              {/* Desktop welcome title */}
              <h1 className="hidden lg:flex text-xl font-semibold text-slate-800 items-center gap-2 pl-2 lg:pl-0 truncate">
                <span className="bg-[#102A43] text-white text-base px-4 py-2 rounded-xl font-semibold shadow-sm tracking-wide">
                  Admin Portal
                </span>
                <span className="hidden lg:inline"> — Policy Holders Management</span>
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
            {/* Top Summaries (Clean 4 Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 select-none">
              {/* Total Policyholders */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-500">Total Policyholders</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {summary.totalPolicyholders}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Across all branches</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                  <HugeiconsIcon icon={UserMultiple02Icon} className="w-5 h-5" />
                </div>
              </div>

              {/* Verified / Approved */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-emerald-700">Verified Accounts</div>
                  <div className="text-2xl font-bold text-emerald-600 mt-1">
                    {summary.approvedPolicyholders}
                  </div>
                  <div className="text-[11px] text-emerald-600/80 mt-0.5">Approved & active</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-5 h-5" />
                </div>
              </div>

              {/* Pending Approvals */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-amber-700">Pending Verification</div>
                  <div className="text-2xl font-bold text-amber-600 mt-1">
                    {summary.pendingPolicyholders}
                  </div>
                  <div className="text-[11px] text-amber-600/80 mt-0.5">Awaiting verification</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <HugeiconsIcon icon={Clock01Icon} className="w-5 h-5" />
                </div>
              </div>

              {/* Insured Vehicles */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-blue-700">Insured Vehicles</div>
                  <div className="text-2xl font-bold text-blue-600 mt-1">
                    {summary.totalVehicles}
                  </div>
                  <div className="text-[11px] text-blue-500 mt-0.5">Active vehicle policies</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <HugeiconsIcon icon={Car01Icon} className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Toolbar: Search, Filters & Actions */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm space-y-4 select-none">
              {/* Top Row */}
              <div className="flex flex-col md:flex-row justify-between items-center gap-3">
                {/* Search */}
                <div className="relative w-full md:w-[380px]">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <HugeiconsIcon icon={Search01Icon} className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Name, NIC, Mobile, Ref #, Plate..."
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
                    onClick={() => fetchPolicyholders(true)}
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
                    <span>Distribution & Reports</span>
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
                  { id: "All", label: "All Policyholders", count: summary.totalPolicyholders },
                  { id: "Approved", label: "Approved Accounts", count: summary.approvedPolicyholders },
                  { id: "Pending", label: "Pending Verification", count: summary.pendingPolicyholders }
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
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

                {/* Province */}
                <div>
                  <select
                    value={selectedProvince}
                    onChange={(e) => setSelectedProvince(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
                  >
                    <option value="All">All Provinces</option>
                    {SRI_LANKA_PROVINCES.filter((p) => p !== "All").map((prov) => (
                      <option key={prov} value={prov}>
                        {prov}
                      </option>
                    ))}
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
                    <option value="name-asc">Name: A to Z</option>
                    <option value="name-desc">Name: Z to A</option>
                  </select>
                </div>
              </div>

              {/* Active Filter Tags */}
              {(selectedBranch !== "All" ||
                selectedProvince !== "All" ||
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
                    {selectedProvince !== "All" && (
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                        Province: {selectedProvince}
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

            {/* Policyholders Table Card */}
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden flex flex-col">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <SimpleLoader />
                  <p className="text-xs text-slate-400">Loading policyholders...</p>
                </div>
              ) : policyholders.length === 0 ? (
                <div className="py-16 px-6 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                    <HugeiconsIcon icon={UserMultiple02Icon} className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800">No Policyholders Found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                    No policyholder records matched the active search query or selected branch/status filters.
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
                        <th className="py-3 px-5">Policyholder</th>
                        <th className="py-3 px-4">NIC & DOB</th>
                        <th className="py-3 px-4">Contact</th>
                        <th className="py-3 px-4">Branch & Location</th>
                        <th className="py-3 px-4">Vehicles</th>
                        <th className="py-3 px-4">Claims</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {policyholders.map((holder) => (
                        <tr
                          key={holder._id}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                          onClick={() => openDetailsModal(holder)}
                        >
                          {/* Policyholder Name & Ref */}
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 shrink-0 text-xs uppercase overflow-hidden">
                                {holder.profilePhoto ? (
                                  <img
                                    src={getFullImageUrl(holder.profilePhoto)}
                                    alt={holder.firstName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span>{holder.firstName?.charAt(0) || "U"}</span>
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-900">
                                  {holder.firstName} {holder.lastName}
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  {holder.referenceNumber || `#${holder._id.slice(-6)}`}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* NIC & DOB */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="font-mono font-medium text-slate-800">{holder.nic}</span>
                              <span className="text-[11px] text-slate-400">{holder.dob || "—"}</span>
                            </div>
                          </td>

                          {/* Contact & Last Active */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="text-slate-800 font-medium">{holder.mobile}</span>
                              <span className="text-[11px] text-slate-400 truncate max-w-[140px]">{holder.email}</span>
                              {holder.lastLoginAt ? (
                                <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5" title={`IP: ${holder.lastLoginIp || "—"} | ${holder.lastLoginDevice || "Web"}`}>
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                                  Active {formatSriLankaDate(holder.lastLoginAt)}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-normal mt-0.5">
                                  Never logged in
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Branch & Location */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-800">{holder.branch || "Galle"}</span>
                              <span className="text-[11px] text-slate-400">{holder.city || holder.province}</span>
                            </div>
                          </td>

                          {/* Vehicles */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-1">
                              <span className="font-semibold text-slate-800">
                                {holder.vehicles?.length || 0} vehicle(s)
                              </span>
                              {holder.vehicles && holder.vehicles.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {holder.vehicles.slice(0, 2).map((v, i) => (
                                    <span
                                      key={i}
                                      className="text-[10px] font-mono font-medium bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded"
                                    >
                                      {v.numberPlate}
                                    </span>
                                  ))}
                                  {holder.vehicles.length > 2 && (
                                    <span className="text-[10px] text-slate-400">+{holder.vehicles.length - 2}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Claims */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-800">
                                {holder.totalClaimsCount || 0} claim(s)
                              </span>
                              {holder.activeClaimsCount ? (
                                <span className="text-[10px] text-amber-700 font-medium">
                                  {holder.activeClaimsCount} active
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400">0 active</span>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${
                                holder.status === "Approved"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                            >
                              {holder.status || "Pending"}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openDetailsModal(holder)}
                                title="View Profile & Documents"
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                              >
                                <HugeiconsIcon icon={ViewIcon} className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => openEditModal(holder)}
                                title="Edit Policyholder Profile"
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-all"
                              >
                                <HugeiconsIcon icon={Edit02Icon} className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => setDeletingHolder(holder)}
                                title="Delete Policyholder"
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
      {/* --- MODAL 1: Policyholder Details --- */}
      {/* ========================================== */}
      {viewingHolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm overflow-hidden">
                  {viewingHolder.profilePhoto ? (
                    <img
                      src={getFullImageUrl(viewingHolder.profilePhoto)}
                      alt={viewingHolder.firstName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{viewingHolder.firstName?.charAt(0)}</span>
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {viewingHolder.firstName} {viewingHolder.lastName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    NIC: {viewingHolder.nic} • Ref: {viewingHolder.referenceNumber} • Branch: {viewingHolder.branch}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditModal(viewingHolder)}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                >
                  Edit Profile
                </button>
                <button
                  onClick={() => setViewingHolder(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-4 px-6 border-b border-slate-100 text-xs font-medium text-slate-600 overflow-x-auto no-scrollbar">
              {[
                { id: "overview", label: "Overview & Bank" },
                { id: "vehicles", label: `Vehicles (${viewingHolder.vehicles?.length || 0})` },
                { id: "documents", label: "KYC Documents" },
                { id: "claims", label: `Claims History (${holderClaims.length})` },
                { id: "activity", label: `Activity & Login Details (${holderLoginActivities.length})` }
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

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* TAB 1: OVERVIEW */}
              {activeViewTab === "overview" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Personal info */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Personal Profile</span>
                      <div className="flex justify-between py-0.5">
                        <span className="text-slate-400">Full Name:</span>
                        <span className="font-semibold text-slate-800">{viewingHolder.firstName} {viewingHolder.lastName}</span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-slate-400">NIC Number:</span>
                        <span className="font-mono font-medium text-slate-800">{viewingHolder.nic}</span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-slate-400">Date of Birth:</span>
                        <span className="text-slate-800">{viewingHolder.dob || "—"}</span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-slate-400">Mobile Phone:</span>
                        <span className="text-slate-800">{viewingHolder.mobile}</span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-slate-400">Email Address:</span>
                        <span className="text-slate-800">{viewingHolder.email}</span>
                      </div>
                    </div>

                    {/* Address & Branch */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Branch & Address</span>
                      <div className="flex justify-between py-0.5">
                        <span className="text-slate-400">Assigned Branch:</span>
                        <span className="font-semibold text-slate-800">{viewingHolder.branch}</span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-slate-400">Province:</span>
                        <span className="text-slate-800">{viewingHolder.province}</span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-slate-400">City:</span>
                        <span className="text-slate-800">{viewingHolder.city}</span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-slate-400">Residential Address:</span>
                        <span className="text-slate-800 text-right truncate max-w-[170px]">{viewingHolder.address}</span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-slate-400">Account Status:</span>
                        <span className={`text-[10px] px-2 py-0.2 rounded font-medium ${viewingHolder.status === "Approved" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                          {viewingHolder.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bank details */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Bank Settlement Information</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-700">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Bank Name</span>
                        <span className="font-semibold text-slate-800">{viewingHolder.bankDetails?.bankName || "Not provided"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Branch Name</span>
                        <span className="font-semibold text-slate-800">{viewingHolder.bankDetails?.branchName || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Account Number</span>
                        <span className="font-mono font-semibold text-slate-800">{viewingHolder.bankDetails?.accountNumber || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Account Holder</span>
                        <span className="font-semibold text-slate-800">{viewingHolder.bankDetails?.accountHolderName || "—"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: VEHICLES */}
              {activeViewTab === "vehicles" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-700">
                      Registered Vehicle Policies ({viewingHolder.vehicles?.length || 0})
                    </span>
                  </div>

                  {viewingHolder.vehicles && viewingHolder.vehicles.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {viewingHolder.vehicles.map((v, idx) => (
                        <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2 relative">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-mono font-bold text-sm text-slate-900 block">
                                {v.numberPlate}
                              </span>
                              <span className="text-slate-500 text-xs">
                                {v.company} {v.model} ({v.year})
                              </span>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-slate-200 text-slate-700">
                              {v.vehicleType || "Car"}
                            </span>
                          </div>

                          <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600 space-y-1">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Policy Number:</span>
                              <span className="font-mono text-slate-800">{v.policyNumber}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Engine #:</span>
                              <span className="font-mono text-slate-800">{v.engineNumber}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Chassis #:</span>
                              <span className="font-mono text-slate-800">{v.chassisNumber}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 py-8 text-center">No registered vehicles found for this policyholder.</p>
                  )}
                </div>
              )}

              {/* TAB 3: DOCUMENTS */}
              {activeViewTab === "documents" && (
                <div className="space-y-4">
                  <span className="text-xs font-semibold text-slate-700 block mb-2">Uploaded KYC Verification Documents</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {viewingHolder.documents?.nicFront && (
                      <div
                        onClick={() => setLightboxImage(getFullImageUrl(viewingHolder.documents!.nicFront))}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 cursor-pointer group"
                      >
                        <span className="text-[11px] font-semibold text-slate-600 block mb-2">National ID Front</span>
                        <img
                          src={getFullImageUrl(viewingHolder.documents.nicFront)}
                          alt="NIC Front"
                          className="w-full h-36 object-cover rounded-lg border border-slate-200 group-hover:opacity-90"
                        />
                      </div>
                    )}

                    {viewingHolder.documents?.nicBack && (
                      <div
                        onClick={() => setLightboxImage(getFullImageUrl(viewingHolder.documents!.nicBack))}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 cursor-pointer group"
                      >
                        <span className="text-[11px] font-semibold text-slate-600 block mb-2">National ID Back</span>
                        <img
                          src={getFullImageUrl(viewingHolder.documents.nicBack)}
                          alt="NIC Back"
                          className="w-full h-36 object-cover rounded-lg border border-slate-200 group-hover:opacity-90"
                        />
                      </div>
                    )}

                    {viewingHolder.documents?.vehicleReg && (
                      <div
                        onClick={() => setLightboxImage(getFullImageUrl(viewingHolder.documents!.vehicleReg))}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 cursor-pointer group"
                      >
                        <span className="text-[11px] font-semibold text-slate-600 block mb-2">Vehicle Registration</span>
                        <img
                          src={getFullImageUrl(viewingHolder.documents.vehicleReg)}
                          alt="Vehicle Registration"
                          className="w-full h-36 object-cover rounded-lg border border-slate-200 group-hover:opacity-90"
                        />
                      </div>
                    )}

                    {viewingHolder.documents?.revenueLicense && (
                      <div
                        onClick={() => setLightboxImage(getFullImageUrl(viewingHolder.documents!.revenueLicense))}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 cursor-pointer group"
                      >
                        <span className="text-[11px] font-semibold text-slate-600 block mb-2">Revenue License</span>
                        <img
                          src={getFullImageUrl(viewingHolder.documents.revenueLicense)}
                          alt="Revenue License"
                          className="w-full h-36 object-cover rounded-lg border border-slate-200 group-hover:opacity-90"
                        />
                      </div>
                    )}
                  </div>

                  {!viewingHolder.documents?.nicFront &&
                    !viewingHolder.documents?.nicBack &&
                    !viewingHolder.documents?.vehicleReg &&
                    !viewingHolder.documents?.revenueLicense && (
                      <p className="text-slate-400 py-8 text-center">No verification documents uploaded yet.</p>
                    )}
                </div>
              )}

              {/* TAB 4: CLAIMS */}
              {activeViewTab === "claims" && (
                <div className="space-y-4">
                  <span className="text-xs font-semibold text-slate-700 block">Claims Submitted by Policyholder</span>
                  {loadingClaims ? (
                    <div className="py-8 flex justify-center"><SimpleLoader /></div>
                  ) : holderClaims.length > 0 ? (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                          <tr>
                            <th className="py-2.5 px-3">Claim #</th>
                            <th className="py-2.5 px-3">Plate</th>
                            <th className="py-2.5 px-3">Damage Type</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3 text-right">Amount (LKR)</th>
                            <th className="py-2.5 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {holderClaims.map((c) => (
                            <tr key={c._id}>
                              <td className="py-2.5 px-3 font-semibold text-slate-900">#{c.claimNumber}</td>
                              <td className="py-2.5 px-3 font-mono">{c.vehiclePlate}</td>
                              <td className="py-2.5 px-3">{c.damageType}</td>
                              <td className="py-2.5 px-3 text-slate-500">{c.incidentDate}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-700">
                                {c.amount ? `LKR ${c.amount.toLocaleString()}` : "—"}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`text-[10px] px-2 py-0.2 rounded font-medium ${c.status === "Approved" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
                                  {c.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-slate-400 py-8 text-center">No insurance claims filed under this policyholder.</p>
                  )}
                </div>
              )}

              {/* TAB 5: ACTIVITY & LOGIN DETAILS */}
              {activeViewTab === "activity" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-xs font-semibold text-slate-800 block">
                        Policyholder Authentication & Activity Audit Log
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Detailed record of portal logins, IP addresses, and device environments used by this account.
                      </span>
                    </div>

                    <button
                      onClick={() => setShowTerminateConfirm(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                      title="Force logout active session for this policyholder"
                    >
                      <HugeiconsIcon icon={Logout01Icon} className="w-3.5 h-3.5 text-rose-600" />
                      <span>Terminate Active Session</span>
                    </button>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block mb-0.5">Last Active</span>
                      <span className="font-semibold text-slate-800 text-xs block truncate">
                        {viewingHolder.lastLoginAt ? formatSriLankaDateTime(viewingHolder.lastLoginAt) : "Never logged in"}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block mb-0.5">Total Login Sessions</span>
                      <span className="font-bold text-slate-800 text-xs block">
                        {viewingHolder.loginCount || holderLoginActivities.length || 0} session(s)
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block mb-0.5">Last Known IP</span>
                      <span className="font-mono font-semibold text-slate-800 text-xs block truncate">
                        {viewingHolder.lastLoginIp || (holderLoginActivities[0]?.ipAddress) || "—"}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block mb-0.5">Primary Device</span>
                      <span className="font-semibold text-slate-800 text-xs block truncate" title={viewingHolder.lastLoginDevice || holderLoginActivities[0]?.device || "Web Browser"}>
                        {viewingHolder.lastLoginDevice || holderLoginActivities[0]?.device || "Web Browser"}
                      </span>
                    </div>
                  </div>

                  {/* Activity History Table */}
                  {loadingLoginActivities ? (
                    <div className="py-8 flex justify-center"><SimpleLoader /></div>
                  ) : holderLoginActivities.length > 0 ? (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                          <tr>
                            <th className="py-2.5 px-3">Date & Time</th>
                            <th className="py-2.5 px-3">Action</th>
                            <th className="py-2.5 px-3">IP Address</th>
                            <th className="py-2.5 px-3">Device / OS</th>
                            <th className="py-2.5 px-3">Browser</th>
                            <th className="py-2.5 px-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {holderLoginActivities.map((act) => (
                            <tr key={act._id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-2.5 px-3 font-medium text-slate-800 whitespace-nowrap">
                                {formatSriLankaDateTime(act.createdAt)}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-slate-900">
                                {act.action || "Login"}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-600">
                                {act.ipAddress || "127.0.0.1"}
                              </td>
                              <td className="py-2.5 px-3 text-slate-700">
                                <span>{act.device || "Web"}</span>
                                {act.os && <span className="text-slate-400 text-[10px] ml-1">({act.os})</span>}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">
                                {act.browser || "Chrome"}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                                  act.status === "Success"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : act.status === "Failed"
                                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}>
                                  {act.status || "Success"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-400">
                      No past login activity recorded for this policyholder yet. Logins are captured automatically upon user sign-in.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewingHolder(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl border border-slate-200 text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* --- MODAL 2: Edit Policyholder Profile --- */}
      {/* ========================================== */}
      {editingHolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Edit Policyholder — {editingHolder.firstName} {editingHolder.lastName}
              </h3>
              <button
                onClick={() => setEditingHolder(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHolder} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={editFormData.firstName}
                    onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={editFormData.lastName}
                    onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Mobile</label>
                  <input
                    type="text"
                    required
                    value={editFormData.mobile}
                    onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Branch</label>
                  <select
                    value={editFormData.branch}
                    onChange={(e) => setEditFormData({ ...editFormData, branch: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  >
                    {SRI_LANKA_BRANCHES.filter((b) => b !== "All").map((br) => (
                      <option key={br} value={br}>{br}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  >
                    <option value="Approved">Approved</option>
                    <option value="Pending">Pending</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Province</label>
                  <select
                    value={editFormData.province}
                    onChange={(e) => setEditFormData({ ...editFormData, province: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  >
                    {SRI_LANKA_PROVINCES.filter((p) => p !== "All").map((prov) => (
                      <option key={prov} value={prov}>{prov}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">City</label>
                  <input
                    type="text"
                    value={editFormData.city}
                    onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Residential Address</label>
                <input
                  type="text"
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="font-semibold text-slate-700 block mb-2">Bank Settlement Details</span>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Bank Name"
                    value={editFormData.bankName}
                    onChange={(e) => setEditFormData({ ...editFormData, bankName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                  <input
                    type="text"
                    placeholder="Account Number"
                    value={editFormData.accountNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, accountNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingHolder(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingHolder}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingHolder && <HugeiconsIcon icon={Loading03Icon} className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
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
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Policyholders Registry Distribution</h3>
              <button
                onClick={() => setShowReportsModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
              {/* Province Distribution */}
              <div className="space-y-2">
                <span className="font-semibold text-slate-800 block">Distribution by Province</span>
                <div className="space-y-1.5">
                  {Object.entries(summary.provinceDistribution || {}).map(([prov, count]) => {
                    const pct = summary.totalPolicyholders > 0 ? Math.round((count / summary.totalPolicyholders) * 100) : 0;
                    return (
                      <div key={prov} className="space-y-1">
                        <div className="flex justify-between text-slate-700">
                          <span>{prov}</span>
                          <span className="font-medium">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-slate-800 h-full rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Branch Breakdown */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="font-semibold text-slate-800 block">Branch Summary</span>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                      <tr>
                        <th className="py-2 px-3">Branch</th>
                        <th className="py-2 px-3 text-center">Policyholders</th>
                        <th className="py-2 px-3 text-center">Vehicles</th>
                        <th className="py-2 px-3 text-center">Pending</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Object.entries(summary.branchBreakdown || {}).map(([br, d]) => (
                        <tr key={br}>
                          <td className="py-2 px-3 font-medium text-slate-800">{br}</td>
                          <td className="py-2 px-3 text-center">{d.count}</td>
                          <td className="py-2 px-3 text-center">{d.vehicles}</td>
                          <td className="py-2 px-3 text-center">{d.pending}</td>
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
      {/* --- MODAL 4: Fullscreen Lightbox --- */}
      {/* ========================================== */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-pointer"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh]">
            <img src={lightboxImage} alt="Document" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* --- MODAL 5: Delete Confirmation --- */}
      {/* ========================================== */}
      {deletingHolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-200 text-center">
            <h3 className="text-sm font-bold text-slate-900">
              Delete Policyholder?
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Are you sure you want to delete {deletingHolder.firstName} {deletingHolder.lastName} ({deletingHolder.nic})?
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setDeletingHolder(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteHolder}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* --- MODAL 6: Force Logout Confirmation --- */}
      {/* ========================================== */}
      {showTerminateConfirm && viewingHolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 text-left">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
              <HugeiconsIcon icon={Logout01Icon} className="w-5 h-5" />
            </div>

            <h3 className="text-sm font-bold text-slate-900">
              Terminate Active Portal Session?
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-3 leading-relaxed">
              This will forcefully log out <strong>{viewingHolder.firstName} {viewingHolder.lastName}</strong> ({viewingHolder.nic}) from all devices and invalidate active sessions.
            </p>

            <div className="mb-4">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Reason / Note (Optional)</label>
              <input
                type="text"
                value={terminateReason}
                onChange={(e) => setTerminateReason(e.target.value)}
                placeholder="e.g. Security check, unauthorized access flag"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowTerminateConfirm(false);
                  setTerminateReason("");
                }}
                disabled={terminatingSession}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs cursor-pointer hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleTerminateHolderSession}
                disabled={terminatingSession}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {terminatingSession ? "Terminating..." : "Force Logout"}
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
