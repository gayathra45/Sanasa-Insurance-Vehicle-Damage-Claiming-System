"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import AdminNavbar from "@/app/Components/Admin/Navbar";
import UserAvatarDropdown from "@/app/Components/UserAvatarDropdown";
import SimpleLoader from "@/app/Components/SimpleLoader";
import { API_URL } from "@/app/config";
import { formatSriLankaDateTime, formatSriLankaDate } from "@/app/utils/dateFormatter";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Menu01Icon,
  Search01Icon,
  RefreshIcon,
  Loading03Icon,
  Cancel01Icon,
  AlertCircleIcon,
  CheckmarkCircle01Icon,
  Alert02Icon,
  Building01Icon,
  UserIcon,
  Download01Icon,
  Edit02Icon,
  Delete02Icon,
  ViewIcon,
  Analytics01Icon,
  Clock01Icon,
  Add01Icon,
  Mail01Icon,
  Call02Icon,
  Location01Icon,
  Logout01Icon,
  Briefcase01Icon,
  Key01Icon,
  Shield01Icon,
  Car01Icon
} from "@hugeicons/core-free-icons";

// ==========================================
// --- Type Definitions ---
// ==========================================

interface AgentRecord {
  _id: string;
  agentId: string;
  name: string;
  email: string;
  nic: string;
  phone: string;
  address: string;
  dob: string;
  branch: string;
  district?: string;
  province?: string;
  area?: string;
  city?: string;
  bankName?: string;
  bankBranch?: string;
  accountNumber?: string;
  accountType?: string;
  accountHolderName?: string;
  status: string;
  availability: "Active" | "Offline";
  lastLoginAt?: string;
  lastLoginIp?: string;
  lastLoginDevice?: string;
  loginCount?: number;
  createdAt: string;
}

interface AssignedClaim {
  _id: string;
  claimNumber: string;
  policyHolderName?: string;
  vehiclePlate: string;
  damageType: string;
  status: string;
  incidentDate: string;
  branch: string;
  amount?: number;
}

interface LoginActivityLog {
  _id: string;
  action: string;
  status: string;
  ipAddress?: string;
  device?: string;
  browser?: string;
  os?: string;
  details?: string;
  createdAt: string;
}

const SRI_LANKA_BRANCHES = [
  "All",
  "Colombo",
  "Kandy",
  "Galle",
  "Gampaha",
  "Kurunegala",
  "Matara",
  "Jaffna",
  "Anuradhapura",
  "Negombo",
  "Ratnapura",
  "Badulla",
  "Kalutara",
  "Batticaloa",
  "Trincomalee"
];

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

export default function AdminAgentsPage() {
  // State
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Summary Metrics
  const [summary, setSummary] = useState({
    totalAgents: 0,
    activeAgents: 0,
    offlineAgents: 0,
    totalBranches: 0
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"All" | "Active" | "Offline">("All");
  const [selectedBranch, setSelectedBranch] = useState("All");
  const [selectedProvince, setSelectedProvince] = useState("All");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name-asc" | "name-desc">("newest");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingAgent, setViewingAgent] = useState<AgentRecord | null>(null);
  const [editingAgent, setEditingAgent] = useState<AgentRecord | null>(null);
  const [deletingAgent, setDeletingAgent] = useState<AgentRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // View modal tabs & data
  const [activeViewTab, setActiveViewTab] = useState<"overview" | "claims" | "activity" | "banking">("overview");
  const [agentClaims, setAgentClaims] = useState<AssignedClaim[]>([]);
  const [agentActivities, setAgentActivities] = useState<LoginActivityLog[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Add / Edit Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    nic: "",
    phone: "",
    dob: "",
    address: "",
    branch: "Colombo",
    province: "Western Province",
    district: "Colombo",
    area: "",
    city: "",
    bankName: "",
    bankBranch: "",
    accountNumber: "",
    accountType: "Savings",
    accountHolderName: "",
    availability: "Active" as "Active" | "Offline"
  });

  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Terminate session state
  const [terminatingSession, setTerminatingSession] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Fetch Agents from API
  const fetchAgents = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams();
      if (selectedBranch !== "All") params.append("branch", selectedBranch);
      if (selectedProvince !== "All") params.append("province", selectedProvince);
      if (activeTab !== "All") params.append("availability", activeTab);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      if (sortBy) params.append("sortBy", sortBy);

      const res = await fetch(`${API_URL}/admin/agents?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load agents");

      setAgents(data.agents || []);
      if (data.summary) {
        setSummary(data.summary);
      }
      if (isRefresh) showToast("Agents directory updated.", "success");
    } catch (err: any) {
      console.error("Fetch agents error:", err);
      showToast(err.message || "Failed to load agents", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedBranch, selectedProvince, activeTab, searchQuery, sortBy]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // Load single agent details for View Modal
  const loadAgentDetails = async (id: string) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`${API_URL}/admin/agents/${id}`);
      const data = await res.json();
      if (res.ok) {
        if (data.agent) setViewingAgent(data.agent);
        setAgentClaims(data.claims || []);
        setAgentActivities(data.loginActivities || []);
      }
    } catch (err) {
      console.error("Load agent details error:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const triggerView = (agent: AgentRecord) => {
    setViewingAgent(agent);
    setActiveViewTab("overview");
    setShowViewModal(true);
    loadAgentDetails(agent._id);
  };

  const triggerEdit = (agent: AgentRecord) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name || "",
      email: agent.email || "",
      nic: agent.nic || "",
      phone: agent.phone || "",
      dob: agent.dob || "",
      address: agent.address || "",
      branch: agent.branch || "Colombo",
      province: agent.province || "Western Province",
      district: agent.district || "Colombo",
      area: agent.area || "",
      city: agent.city || "",
      bankName: agent.bankName || "",
      bankBranch: agent.bankBranch || "",
      accountNumber: agent.accountNumber || "",
      accountType: agent.accountType || "Savings",
      accountHolderName: agent.accountHolderName || "",
      availability: agent.availability || "Active"
    });
    setFormError("");
    setFormSuccess("");
    setShowEditModal(true);
  };

  // Submit Add Agent
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!formData.name.trim()) return setFormError("Full Name is required.");
    if (!formData.email.trim()) return setFormError("Email Address is required.");
    if (!formData.nic.trim()) return setFormError("NIC Number is required.");
    if (!formData.phone.trim()) return setFormError("Phone Number is required.");
    if (!formData.dob.trim()) return setFormError("Date of Birth is required.");
    if (!formData.address.trim()) return setFormError("Residential Address is required.");

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/admin/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create agent");

      showToast(`Agent ${data.agent.name} (${data.agent.agentId}) created successfully.`, "success");
      setFormData({
        name: "",
        email: "",
        nic: "",
        phone: "",
        dob: "",
        address: "",
        branch: "Colombo",
        province: "Western Province",
        district: "Colombo",
        area: "",
        city: "",
        bankName: "",
        bankBranch: "",
        accountNumber: "",
        accountType: "Savings",
        accountHolderName: "",
        availability: "Active"
      });
      setShowAddModal(false);
      fetchAgents(true);
    } catch (err: any) {
      setFormError(err.message || "Failed to create agent.");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Edit Agent
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent) return;
    setFormError("");
    setFormSuccess("");

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/admin/agents/${editingAgent._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update agent");

      showToast(`Agent ${data.agent.name} updated successfully.`, "success");
      setShowEditModal(false);
      setEditingAgent(null);
      fetchAgents(true);
      if (viewingAgent && viewingAgent._id === editingAgent._id) {
        setViewingAgent(data.agent);
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to update agent.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Agent
  const handleDeleteAgent = async () => {
    if (!deletingAgent) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_URL}/admin/agents/${deletingAgent._id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete agent");

      showToast(`Agent ${deletingAgent.name} deleted.`, "info");
      setDeletingAgent(null);
      if (viewingAgent && viewingAgent._id === deletingAgent._id) {
        setShowViewModal(false);
        setViewingAgent(null);
      }
      fetchAgents(true);
    } catch (err: any) {
      showToast(err.message || "Failed to delete agent.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Reset Agent Password
  const handleResetPassword = async (agent: AgentRecord) => {
    if (!confirm(`Are you sure you want to reset the password for ${agent.name}? A new temporary password will be dispatched to ${agent.email}.`)) return;

    setResettingPassword(true);
    try {
      const res = await fetch(`${API_URL}/admin/agents/${agent._id}/reset-password`, {
        method: "POST"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");

      showToast(`Temporary password dispatched to ${agent.email}.`, "success");
    } catch (err: any) {
      showToast(err.message || "Failed to reset password.", "error");
    } finally {
      setResettingPassword(false);
    }
  };

  // Terminate Agent Session
  const handleTerminateSession = async (agent: AgentRecord) => {
    if (!confirm(`Force terminate active login session for agent ${agent.name}? The agent will be immediately logged out of the mobile app.`)) return;

    setTerminatingSession(true);
    try {
      const res = await fetch(`${API_URL}/admin/sessions/terminate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userType: "Agent",
          targetId: agent._id,
          reason: "Administrative security governance force session logout.",
          adminName: "System Admin"
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to terminate agent session");

      showToast(`Session terminated for ${agent.name}.`, "success");
      fetchAgents(true);
      if (viewingAgent && viewingAgent._id === agent._id) {
        loadAgentDetails(agent._id);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to terminate session.", "error");
    } finally {
      setTerminatingSession(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (agents.length === 0) {
      showToast("No agent records to export.", "info");
      return;
    }

    const headers = [
      "Agent ID",
      "Full Name",
      "Email Address",
      "NIC",
      "Phone",
      "Branch",
      "District",
      "Province",
      "Availability",
      "Joined Date"
    ];

    const rows = agents.map((a) => [
      `"${a.agentId}"`,
      `"${a.name}"`,
      `"${a.email}"`,
      `"${a.nic}"`,
      `"${a.phone}"`,
      `"${a.branch}"`,
      `"${a.district || ""}"`,
      `"${a.province || ""}"`,
      `"${a.availability}"`,
      `"${a.createdAt ? new Date(a.createdAt).toISOString().slice(0, 10) : ""}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Insurance_Agents_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Agents directory CSV downloaded.", "success");
  };

  // Reset Filters
  const handleResetFilters = () => {
    setActiveTab("All");
    setSelectedBranch("All");
    setSelectedProvince("All");
    setSearchQuery("");
    setSortBy("newest");
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
                Agents
              </h1>
              {/* Desktop welcome title */}
              <h1 className="hidden lg:flex text-xl font-semibold text-slate-800 items-center gap-2 pl-2 lg:pl-0 truncate">
                <span className="bg-[#102A43] text-white text-base px-4 py-2 rounded-xl font-semibold shadow-sm tracking-wide">
                  Admin Portal
                </span>
                <span className="hidden lg:inline"> — Field Insurance Agents Management</span>
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
            {/* Top Summaries (Clean 4 Cards matching Staff & Policyholder pages) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 select-none">
              {/* Total Agents */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-500">Total Insurance Agents</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {summary.totalAgents}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Across all regional branches</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                  <HugeiconsIcon icon={Briefcase01Icon} className="w-5 h-5" />
                </div>
              </div>

              {/* Active / Field Ready */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-emerald-700">Active & Field Ready</div>
                  <div className="text-2xl font-bold text-emerald-600 mt-1">
                    {summary.activeAgents}
                  </div>
                  <div className="text-[11px] text-emerald-600/80 mt-0.5">Online & taking claims</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-5 h-5" />
                </div>
              </div>

              {/* Offline Agents */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-amber-700">Offline Agents</div>
                  <div className="text-2xl font-bold text-amber-600 mt-1">
                    {summary.offlineAgents}
                  </div>
                  <div className="text-[11px] text-amber-600/80 mt-0.5">Currently inactive/away</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <HugeiconsIcon icon={Clock01Icon} className="w-5 h-5" />
                </div>
              </div>

              {/* Covered Branches */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-blue-700">Covered Branches</div>
                  <div className="text-2xl font-bold text-blue-600 mt-1">
                    {summary.totalBranches || 15}
                  </div>
                  <div className="text-[11px] text-blue-500 mt-0.5">Island-wide operational hubs</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <HugeiconsIcon icon={Building01Icon} className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Top Toolbar Action Area */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm select-none">
              {/* Search Bar */}
              <div className="relative w-full md:w-[350px]">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <HugeiconsIcon icon={Search01Icon} className="w-4 h-4 text-slate-400" strokeWidth={2.5} />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search agent by ID, name, email, NIC, phone..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-transparent transition-all shadow-sm bg-slate-50/50 font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
                <button
                  onClick={() => {
                    setFormData({
                      name: "",
                      email: "",
                      nic: "",
                      phone: "",
                      dob: "",
                      address: "",
                      branch: "Colombo",
                      province: "Western Province",
                      district: "Colombo",
                      area: "",
                      city: "",
                      bankName: "",
                      bankBranch: "",
                      accountNumber: "",
                      accountType: "Savings",
                      accountHolderName: "",
                      availability: "Active"
                    });
                    setFormError("");
                    setFormSuccess("");
                    setShowAddModal(true);
                  }}
                  className="flex-1 md:flex-none py-2.5 px-5 bg-[#000080] hover:bg-[#000066] hover:scale-105 active:scale-95 text-white rounded-xl text-xs font-bold shadow-sm transition-all border-none outline-none cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <HugeiconsIcon icon={Add01Icon} className="w-4 h-4" strokeWidth={2.5} />
                  <span>Add New Agent</span>
                </button>

                <button
                  onClick={handleExportCSV}
                  className="flex-1 md:flex-none py-2.5 px-5 bg-white hover:bg-slate-50 border border-slate-200 hover:scale-105 active:scale-95 text-slate-700 rounded-xl text-xs font-bold shadow-sm transition-all outline-none cursor-pointer flex items-center justify-center gap-1.5 relative"
                >
                  <HugeiconsIcon icon={Download01Icon} className="w-4 h-4 text-slate-600" strokeWidth={2.5} />
                  <span>Export CSV</span>
                </button>

                <button
                  onClick={() => fetchAgents(true)}
                  disabled={refreshing || loading}
                  title="Refresh Agents"
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <HugeiconsIcon icon={RefreshIcon} className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Filter Tabs & Secondary Dropdowns */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col gap-4 select-none">
              {/* Top Row: Status Filter Segmented Navigation Tabs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/60 w-full">
                {[
                  { id: "All", label: "All Agents", count: summary.totalAgents },
                  { id: "Active", label: "Active & Field Ready", count: summary.activeAgents },
                  { id: "Offline", label: "Offline Agents", count: summary.offlineAgents }
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-none outline-none ${
                        isActive
                          ? "bg-[#000080] text-white shadow-md shadow-blue-900/20"
                          : "bg-white/70 hover:bg-white text-slate-600 hover:text-slate-900 shadow-2xs hover:shadow-xs"
                      }`}
                    >
                      <span className="truncate">{tab.label}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-slate-100 text-slate-700 border border-slate-200/60"
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Bottom Row: 3 Dedicated Filter Selectors in a Structured 3-Column Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
                {/* Branch Location */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 pl-0.5">
                    <HugeiconsIcon icon={Building01Icon} className="w-3.5 h-3.5 text-slate-400" />
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Branch Location
                    </label>
                  </div>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-[#000080]/15 focus:border-[#000080] transition-all cursor-pointer shadow-2xs"
                  >
                    <option value="All">All Branches</option>
                    {SRI_LANKA_BRANCHES.filter((b) => b !== "All").map((br) => (
                      <option key={br} value={br}>
                        {br} Branch
                      </option>
                    ))}
                  </select>
                </div>

                {/* Province Location */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 pl-0.5">
                    <HugeiconsIcon icon={Location01Icon} className="w-3.5 h-3.5 text-slate-400" />
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Province Location
                    </label>
                  </div>
                  <select
                    value={selectedProvince}
                    onChange={(e) => setSelectedProvince(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-[#000080]/15 focus:border-[#000080] transition-all cursor-pointer shadow-2xs"
                  >
                    <option value="All">All Provinces</option>
                    {SRI_LANKA_PROVINCES.filter((p) => p !== "All").map((prov) => (
                      <option key={prov} value={prov}>
                        {prov}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sorting Order */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 pl-0.5">
                    <HugeiconsIcon icon={Analytics01Icon} className="w-3.5 h-3.5 text-slate-400" />
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Sort Agents By
                    </label>
                  </div>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-[#000080]/15 focus:border-[#000080] transition-all cursor-pointer shadow-2xs"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="name-asc">Name: A to Z</option>
                    <option value="name-desc">Name: Z to A</option>
                  </select>
                </div>
              </div>

              {/* Active Filter Tags & Reset Bar */}
              {(selectedBranch !== "All" || selectedProvince !== "All" || searchQuery || activeTab !== "All" || sortBy !== "newest") && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs pt-3 border-t border-slate-100 text-slate-500">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-slate-400 text-[11px] uppercase tracking-wider">Active Filters:</span>
                    {activeTab !== "All" && (
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-[#000080] border border-blue-200 px-2.5 py-1 rounded-lg font-bold text-[11px]">
                        Status: {activeTab}
                        <button
                          onClick={() => setActiveTab("All")}
                          className="hover:text-rose-600 cursor-pointer ml-0.5"
                          title="Clear status filter"
                        >
                          <HugeiconsIcon icon={Cancel01Icon} className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {selectedBranch !== "All" && (
                      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg font-bold text-[11px]">
                        Branch: {selectedBranch}
                        <button
                          onClick={() => setSelectedBranch("All")}
                          className="hover:text-rose-600 cursor-pointer ml-0.5"
                          title="Clear branch filter"
                        >
                          <HugeiconsIcon icon={Cancel01Icon} className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {selectedProvince !== "All" && (
                      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg font-bold text-[11px]">
                        Province: {selectedProvince}
                        <button
                          onClick={() => setSelectedProvince("All")}
                          className="hover:text-rose-600 cursor-pointer ml-0.5"
                          title="Clear province filter"
                        >
                          <HugeiconsIcon icon={Cancel01Icon} className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {searchQuery && (
                      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg font-bold text-[11px]">
                        Search: &quot;{searchQuery}&quot;
                        <button
                          onClick={() => setSearchQuery("")}
                          className="hover:text-rose-600 cursor-pointer ml-0.5"
                          title="Clear search query"
                        >
                          <HugeiconsIcon icon={Cancel01Icon} className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {sortBy !== "newest" && (
                      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg font-bold text-[11px]">
                        Sorted
                        <button
                          onClick={() => setSortBy("newest")}
                          className="hover:text-rose-600 cursor-pointer ml-0.5"
                          title="Reset sort"
                        >
                          <HugeiconsIcon icon={Cancel01Icon} className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <span className="text-[11px] text-slate-400 font-semibold">
                      Showing <strong className="text-slate-700">{agents.length}</strong> of {summary.totalAgents}
                    </span>
                    <button
                      onClick={handleResetFilters}
                      className="text-rose-600 hover:text-rose-700 font-bold cursor-pointer transition-colors bg-rose-50 hover:bg-rose-100 px-3 py-1 rounded-lg border border-rose-200/80 text-xs flex items-center gap-1"
                    >
                      <HugeiconsIcon icon={RefreshIcon} className="w-3 h-3" />
                      <span>Reset Filters</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Agents Table Card Grid Section */}
            {loading ? (
              <SimpleLoader message="Loading insurance agents directory..." theme="slate" />
            ) : agents.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-[20px] p-16 text-center text-slate-400 font-bold select-none shadow-sm">
                No field insurance agents found matching your query.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {/* Table Header (Desktop) */}
                <div className="hidden md:grid md:grid-cols-[minmax(0,1.8fr)_minmax(0,1.6fr)_minmax(0,1.8fr)_minmax(0,1.4fr)_minmax(0,1.0fr)_minmax(0,2.1fr)] gap-4 px-5 py-3 text-slate-500 font-medium text-[10px] uppercase tracking-wider select-none bg-slate-50 rounded-xl border border-slate-200/60 mb-1 items-center">
                  <div>Agent & Profile</div>
                  <div>Branch & Location</div>
                  <div>Contact Info</div>
                  <div>NIC & DOB</div>
                  <div>Availability</div>
                  <div className="text-right">Actions</div>
                </div>

                {/* Table Rows */}
                {agents.map((agent) => (
                  <div
                    key={agent._id}
                    className="bg-white border-l-[6px] border-l-blue-500 bg-gradient-to-r from-blue-50/10 via-transparent to-transparent border border-slate-200 rounded-xl px-5 py-4 flex flex-col md:grid md:grid-cols-[minmax(0,1.8fr)_minmax(0,1.6fr)_minmax(0,1.8fr)_minmax(0,1.4fr)_minmax(0,1.0fr)_minmax(0,2.1fr)] md:items-center gap-4 transition-all duration-200 shadow-sm hover:shadow-md relative overflow-hidden group"
                  >
                    {/* Col 1: Agent & Profile */}
                    <div className="flex items-center gap-3 min-w-0 select-none">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-[#102A43] flex items-center justify-center font-bold text-sm shrink-0 shadow-inner">
                        {agent.name?.charAt(0) || "A"}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <h3 className="font-semibold text-sm text-slate-800 whitespace-nowrap truncate">
                          {agent.name}
                        </h3>
                        <span className="text-[10px] text-slate-600 font-bold font-mono block mt-0.5">
                          {agent.agentId}
                        </span>
                      </div>
                    </div>

                    {/* Col 2: Branch & Location */}
                    <div className="flex flex-col min-w-0 select-none">
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1 md:hidden">Branch & Location</span>
                      <span className="text-slate-700 font-semibold text-xs truncate">{agent.branch} Branch</span>
                      <span className="text-[10px] text-slate-500 font-semibold truncate">{agent.district || agent.province || "Sri Lanka"}</span>
                    </div>

                    {/* Col 3: Contact Info */}
                    <div className="flex flex-col min-w-0 select-none">
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1 md:hidden">Contact Info</span>
                      <span className="text-slate-700 font-semibold text-xs truncate select-all">{agent.email}</span>
                      <span className="text-[10px] text-slate-500 font-mono mt-0.5">{agent.phone || "—"}</span>
                    </div>

                    {/* Col 4: NIC & DOB */}
                    <div className="flex flex-col min-w-0 select-none">
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1 md:hidden">NIC & DOB</span>
                      <span className="text-slate-700 font-semibold text-xs font-mono">{agent.nic}</span>
                      <span className="text-[10px] text-slate-500 font-semibold truncate">{agent.dob || "—"}</span>
                    </div>

                    {/* Col 5: Availability */}
                    <div className="flex flex-col min-w-0 select-none">
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1 md:hidden">Availability</span>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-md w-fit text-center ${
                        agent.availability === "Active"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-700"
                      }`}>
                        {agent.availability || "Active"}
                      </span>
                    </div>

                    {/* Col 6: Actions */}
                    <div className="flex items-center justify-between md:justify-end gap-2 pt-3 md:pt-0 border-t md:border-0 border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => triggerView(agent)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1 border border-slate-200/80 shadow-2xs"
                          title="View Full Profile"
                        >
                          <HugeiconsIcon icon={ViewIcon} className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>

                        <button
                          onClick={() => triggerEdit(agent)}
                          className="bg-[#000080] hover:bg-[#000066] text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1 shadow-2xs"
                          title="Edit Agent Profile"
                        >
                          <HugeiconsIcon icon={Edit02Icon} className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => setDeletingAgent(agent)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg border border-red-200 transition-all active:scale-95 cursor-pointer flex items-center gap-1 shadow-2xs"
                          title="Delete Agent"
                        >
                          <HugeiconsIcon icon={Delete02Icon} className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* MODAL 1: Add New Agent */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white border border-slate-200 rounded-[32px] w-full max-w-2xl shadow-2xl flex flex-col relative transition-all duration-300 overflow-hidden max-h-[90vh]">
            <div className="px-8 pt-7 pb-2 select-none bg-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-[24px] font-semibold text-slate-900 tracking-tight leading-none">Register New Insurance Agent</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">Issue agent ID & field mobile app credentials</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 bg-transparent border-none outline-none cursor-pointer transition-colors p-1"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-6 h-6" strokeWidth={2.5} />
              </button>
            </div>

            <div className="border-b border-black mx-8 mb-4 shrink-0" />

            <form onSubmit={handleAddSubmit} className="px-8 pb-8 flex-1 overflow-y-auto flex flex-col gap-5 text-left">
              {formError && (
                <div className="bg-red-50 text-red-600 text-xs font-bold px-4 py-3 rounded-xl border border-red-100 flex items-center gap-2">
                  <HugeiconsIcon icon={AlertCircleIcon} className="w-5 h-5 text-red-500 shrink-0" strokeWidth={2} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Personal Information */}
              <div className="flex flex-col gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest border-b pb-2 mb-1 select-none block">Personal & Identity Details</span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Kasun Jayawardena"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#000080]/15 focus:border-[#000080] transition-all font-semibold bg-white"
                    />
                  </div>

                  {/* Email */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="agent@sanasainsurance.lk"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#000080]/15 focus:border-[#000080] transition-all font-semibold bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* NIC */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">NIC Number</label>
                    <input
                      type="text"
                      required
                      value={formData.nic}
                      onChange={(e) => setFormData({ ...formData, nic: e.target.value })}
                      placeholder="199512345678"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#000080]/15 focus:border-[#000080] transition-all font-semibold bg-white"
                    />
                  </div>

                  {/* Phone */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Phone Number</label>
                    <input
                      type="text"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="0771234567"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#000080]/15 focus:border-[#000080] transition-all font-semibold bg-white"
                    />
                  </div>

                  {/* DOB */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Date of Birth</label>
                    <input
                      type="date"
                      required
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#000080]/15 focus:border-[#000080] transition-all font-semibold bg-white cursor-pointer"
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Residential Address</label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="No. 45, Main Street, Colombo"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#000080]/15 focus:border-[#000080] transition-all font-semibold bg-white"
                  />
                </div>
              </div>

              {/* Branch Assignment */}
              <div className="flex flex-col gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest border-b pb-2 mb-1 select-none block">Branch & Regional Assignment</span>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Branch */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Assigned Branch</label>
                    <select
                      value={formData.branch}
                      onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#000080]/15 focus:border-[#000080] font-semibold bg-white cursor-pointer"
                    >
                      {SRI_LANKA_BRANCHES.filter((b) => b !== "All").map((b) => (
                        <option key={b} value={b}>{b} Branch</option>
                      ))}
                    </select>
                  </div>

                  {/* Province */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Province</label>
                    <select
                      value={formData.province}
                      onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#000080]/15 focus:border-[#000080] font-semibold bg-white cursor-pointer"
                    >
                      {SRI_LANKA_PROVINCES.filter((p) => p !== "All").map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  {/* District */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">District</label>
                    <input
                      type="text"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      placeholder="e.g. Galle"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#000080]/15 focus:border-[#000080] transition-all font-semibold bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Bank Details */}
              <div className="flex flex-col gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest border-b pb-2 mb-1 select-none block">Payout Banking Details</span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Bank Name</label>
                    <input
                      type="text"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      placeholder="Bank of Ceylon / Commercial Bank"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#000080]/15 focus:border-[#000080] transition-all font-semibold bg-white"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Account Number</label>
                    <input
                      type="text"
                      value={formData.accountNumber}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                      placeholder="e.g. 8001234567"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#000080]/15 focus:border-[#000080] transition-all font-semibold bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4 select-none shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-full text-xs font-bold transition-all cursor-pointer bg-white active:scale-95 shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-[#000080] hover:bg-[#000066] active:scale-95 text-white rounded-full text-xs font-bold shadow-[0_4px_12px_rgba(0,0,128,0.25)] transition-all cursor-pointer border-none outline-none disabled:opacity-60 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <HugeiconsIcon icon={Loading03Icon} className="animate-spin h-4 w-4 text-white" strokeWidth={2.5} />
                      <span>Creating Agent...</span>
                    </>
                  ) : (
                    <span>Register Agent</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Agent */}
      {showEditModal && editingAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white border border-slate-200 rounded-[32px] w-full max-w-2xl shadow-2xl flex flex-col relative transition-all duration-300 overflow-hidden max-h-[90vh]">
            <div className="px-8 pt-7 pb-2 select-none bg-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-[24px] font-semibold text-slate-900 tracking-tight leading-none">Edit Agent Profile</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">Update field agent credentials & assignment</p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 bg-transparent border-none outline-none cursor-pointer transition-colors p-1"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-6 h-6" strokeWidth={2.5} />
              </button>
            </div>

            <div className="border-b border-black mx-8 mb-4 shrink-0" />

            <form onSubmit={handleEditSubmit} className="px-8 pb-8 flex-1 overflow-y-auto flex flex-col gap-5 text-left">
              {formError && (
                <div className="bg-red-50 text-red-600 text-xs font-bold px-4 py-3 rounded-xl border border-red-100 flex items-center gap-2">
                  <HugeiconsIcon icon={AlertCircleIcon} className="w-5 h-5 text-red-500 shrink-0" strokeWidth={2} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Personal Information */}
              <div className="flex flex-col gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest border-b pb-2 mb-1 select-none block">Personal Details</span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#000080]/15 focus:border-[#000080] font-semibold bg-white"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#000080]/15 focus:border-[#000080] font-semibold bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Phone Number</label>
                    <input
                      type="text"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#000080]/15 focus:border-[#000080] font-semibold bg-white"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Branch</label>
                    <select
                      value={formData.branch}
                      onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#000080]/15 focus:border-[#000080] font-semibold bg-white cursor-pointer"
                    >
                      {SRI_LANKA_BRANCHES.filter((b) => b !== "All").map((b) => (
                        <option key={b} value={b}>{b} Branch</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Availability</label>
                    <select
                      value={formData.availability}
                      onChange={(e) => setFormData({ ...formData, availability: e.target.value as any })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#000080]/15 focus:border-[#000080] font-semibold bg-white cursor-pointer"
                    >
                      <option value="Active">Active & Field Ready</option>
                      <option value="Offline">Offline</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Residential Address</label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#000080]/15 focus:border-[#000080] font-semibold bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4 select-none shrink-0">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-full text-xs font-bold transition-all cursor-pointer bg-white active:scale-95 shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-[#000080] hover:bg-[#000066] active:scale-95 text-white rounded-full text-xs font-bold shadow-[0_4px_12px_rgba(0,0,128,0.25)] transition-all cursor-pointer border-none outline-none disabled:opacity-60 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <HugeiconsIcon icon={Loading03Icon} className="animate-spin h-4 w-4 text-white" strokeWidth={2.5} />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: View Agent Details */}
      {showViewModal && viewingAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white border border-slate-200 rounded-[32px] w-full max-w-3xl shadow-2xl flex flex-col relative transition-all duration-300 overflow-hidden max-h-[90vh]">
            <div className="px-8 pt-7 pb-3 select-none bg-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#000080] text-white flex items-center justify-center font-bold text-lg shadow-md">
                  {viewingAgent.name?.charAt(0) || "A"}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">{viewingAgent.name}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-[#000080] font-mono font-bold">{viewingAgent.agentId}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs text-slate-500 font-semibold">{viewingAgent.branch} Branch</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      viewingAgent.availability === "Active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                    }`}>
                      {viewingAgent.availability || "Active"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowViewModal(false)}
                className="text-slate-400 hover:text-slate-600 bg-transparent border-none outline-none cursor-pointer transition-colors p-1"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-6 h-6" strokeWidth={2.5} />
              </button>
            </div>

            {/* Segmented View Tabs */}
            <div className="px-8 pt-2 pb-3 bg-white border-b border-slate-100 flex items-center gap-2 select-none shrink-0">
              {[
                { id: "overview", label: "Overview & Info" },
                { id: "claims", label: `Assigned Claims (${agentClaims.length})` },
                { id: "activity", label: `Login Audits (${agentActivities.length})` },
                { id: "banking", label: "Payout Banking" }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveViewTab(t.id as any)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-none outline-none ${
                    activeViewTab === t.id
                      ? "bg-[#000080] text-white shadow-sm"
                      : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/80"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="px-8 py-6 flex-1 overflow-y-auto flex flex-col gap-6 text-left">
              {loadingDetails ? (
                <SimpleLoader message="Loading agent records..." theme="slate" />
              ) : activeViewTab === "overview" ? (
                <div className="flex flex-col gap-5">
                  {/* Quick stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 select-none">
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Branch</span>
                      <span className="font-bold text-slate-800 text-sm mt-1 block">{viewingAgent.branch} Branch</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Claims Handled</span>
                      <span className="font-bold text-[#000080] text-sm mt-1 block">{agentClaims.length} Claims</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Login Count</span>
                      <span className="font-bold text-slate-800 text-sm mt-1 block">{viewingAgent.loginCount || agentActivities.length} Logins</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Last Login</span>
                      <span className="font-bold text-slate-800 text-xs mt-1 block">
                        {viewingAgent.lastLoginAt ? formatSriLankaDate(viewingAgent.lastLoginAt) : "Not logged in"}
                      </span>
                    </div>
                  </div>

                  {/* Profile Details Grid */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col gap-3 text-xs">
                    <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-200/60 pb-2 mb-1">
                      Identity & Contact Details
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6">
                      <div className="flex justify-between py-1 border-b border-slate-200/50">
                        <span className="text-slate-400 font-semibold">Email:</span>
                        <span className="text-slate-800 font-semibold select-all">{viewingAgent.email}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/50">
                        <span className="text-slate-400 font-semibold">Phone:</span>
                        <span className="text-slate-800 font-mono font-semibold">{viewingAgent.phone || "—"}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/50">
                        <span className="text-slate-400 font-semibold">NIC:</span>
                        <span className="text-slate-800 font-mono font-semibold uppercase">{viewingAgent.nic}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/50">
                        <span className="text-slate-400 font-semibold">DOB:</span>
                        <span className="text-slate-800 font-semibold">{viewingAgent.dob || "—"}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/50 col-span-2">
                        <span className="text-slate-400 font-semibold">Residential Address:</span>
                        <span className="text-slate-800 font-semibold">{viewingAgent.address}</span>
                      </div>
                    </div>
                  </div>

                  {/* Administrative Actions */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col gap-3">
                    <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-200/60 pb-2">
                      Admin Security Controls
                    </span>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => handleResetPassword(viewingAgent)}
                        disabled={resettingPassword}
                        className="py-2 px-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      >
                        <HugeiconsIcon icon={Key01Icon} className="w-3.5 h-3.5 text-slate-600" />
                        <span>{resettingPassword ? "Resetting..." : "Reset Password & Send OTP"}</span>
                      </button>

                      <button
                        onClick={() => handleTerminateSession(viewingAgent)}
                        disabled={terminatingSession}
                        className="py-2 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      >
                        <HugeiconsIcon icon={Logout01Icon} className="w-3.5 h-3.5 text-rose-600" />
                        <span>{terminatingSession ? "Terminating..." : "Force Terminate Active Session"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : activeViewTab === "claims" ? (
                <div className="flex flex-col gap-3">
                  {agentClaims.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 select-none bg-slate-50 border border-slate-100 rounded-2xl">
                      No claims currently assigned to this agent.
                    </div>
                  ) : (
                    agentClaims.map((claim) => (
                      <div key={claim._id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-xs font-mono">#{claim.claimNumber}</span>
                          <span className="text-[11px] text-slate-600 font-semibold">{claim.policyHolderName || "Policyholder"} • {claim.vehiclePlate}</span>
                          <span className="text-[10px] text-slate-400 mt-0.5">{claim.damageType}</span>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            claim.status === "Approved" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          }`}>
                            {claim.status}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-1">{formatSriLankaDate(claim.incidentDate)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : activeViewTab === "activity" ? (
                <div className="flex flex-col gap-2.5">
                  {agentActivities.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 select-none bg-slate-50 border border-slate-100 rounded-2xl">
                      No recent login activity recorded for this agent.
                    </div>
                  ) : (
                    agentActivities.map((act) => (
                      <div key={act._id} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex justify-between items-center text-xs">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{act.action}</span>
                          <span className="text-[10px] text-slate-500">{act.device || "Mobile App"} • IP: {act.ipAddress || "—"}</span>
                          {act.details && <span className="text-[10px] text-slate-400 mt-0.5">{act.details}</span>}
                        </div>
                        <span className="text-[10px] text-slate-500 font-semibold">{formatSriLankaDateTime(act.createdAt)}</span>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col gap-3 text-xs">
                  <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-200/60 pb-2 mb-1">
                    Agent Commission Payout Bank Account
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6">
                    <div className="flex justify-between py-1 border-b border-slate-200/50">
                      <span className="text-slate-400 font-semibold">Bank Name:</span>
                      <span className="text-slate-800 font-semibold">{viewingAgent.bankName || "Not configured"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/50">
                      <span className="text-slate-400 font-semibold">Bank Branch:</span>
                      <span className="text-slate-800 font-semibold">{viewingAgent.bankBranch || "—"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/50">
                      <span className="text-slate-400 font-semibold">Account Number:</span>
                      <span className="text-slate-800 font-mono font-semibold">{viewingAgent.accountNumber || "—"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/50">
                      <span className="text-slate-400 font-semibold">Account Type:</span>
                      <span className="text-slate-800 font-semibold">{viewingAgent.accountType || "Savings"}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-8 py-5 bg-white border-t border-slate-100 flex justify-end shrink-0 select-none">
              <button
                onClick={() => setShowViewModal(false)}
                className="bg-[#000080] hover:bg-[#000066] text-white font-bold text-xs px-6 py-2 rounded-full transition-all border-none cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Delete Confirmation */}
      {deletingAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white border border-slate-200 rounded-[32px] w-full max-w-md shadow-2xl p-7 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <HugeiconsIcon icon={Delete02Icon} className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Delete Insurance Agent</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to permanently delete agent <strong>{deletingAgent.name}</strong> ({deletingAgent.agentId})? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 w-full justify-center mt-2">
              <button
                onClick={() => setDeletingAgent(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer border-none"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAgent}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border-none shadow-sm"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
