"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Download01Icon,
  Shield01Icon,
  UserGroupIcon,
  Folder01Icon,
  Briefcase01Icon,
  SecurityCheckIcon,
  Building01Icon,
  Clock01Icon,
  Analytics01Icon,
  ViewIcon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  AlertCircleIcon,
  Alert02Icon,
  Location01Icon
} from "@hugeicons/core-free-icons";

interface LoginActivityRecord {
  _id: string;
  userType: "PolicyHolder" | "OfficeStaff" | "Agent" | "Admin" | string;
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
  status: "Success" | "Failed" | "Warning" | string;
  details?: string;
  createdAt: string;
}

interface ActivitySummary {
  totalLogins: number;
  policyHolderLogins: number;
  branchStaffLogins: number;
  agentLogins: number;
  adminLogins: number;
  todayLogins: number;
  deviceBreakdown: { device: string; count: number }[];
  branchBreakdown: { branch: string; count: number }[];
}

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
  "Ampara"
];

export default function AdminAnalyticsPage() {
  const [activities, setActivities] = useState<LoginActivityRecord[]>([]);
  const [summary, setSummary] = useState<ActivitySummary>({
    totalLogins: 0,
    policyHolderLogins: 0,
    branchStaffLogins: 0,
    agentLogins: 0,
    adminLogins: 0,
    todayLogins: 0,
    deviceBreakdown: [],
    branchBreakdown: []
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [activeUserType, setActiveUserType] = useState<"All" | "PolicyHolder" | "OfficeStaff" | "Agent" | "Admin">("All");
  const [selectedBranch, setSelectedBranch] = useState("All");
  const [timeRange, setTimeRange] = useState<"all" | "today" | "7days" | "30days">("all");
  const [selectedStatus, setSelectedStatus] = useState<"All" | "Success" | "Failed">("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Inspect Modal
  const [inspectActivity, setInspectActivity] = useState<LoginActivityRecord | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Fetch Login Activity
  const fetchLoginActivity = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams();
      if (activeUserType && activeUserType !== "All") params.append("userType", activeUserType);
      if (selectedBranch && selectedBranch !== "All") params.append("branch", selectedBranch);
      if (timeRange && timeRange !== "all") params.append("timeRange", timeRange);
      if (selectedStatus && selectedStatus !== "All") params.append("status", selectedStatus);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      params.append("limit", "100");

      const res = await fetch(`${API_URL}/admin/login-activity?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load activity logs");
      const data = await res.json();

      setActivities(data.activities || []);
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (err: any) {
      console.error("Error fetching login activity:", err);
      showToast(err.message || "Failed to load activity log", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeUserType, selectedBranch, timeRange, selectedStatus, searchQuery]);

  useEffect(() => {
    fetchLoginActivity();
  }, [fetchLoginActivity]);

  // Reset Filters
  const handleResetFilters = () => {
    setActiveUserType("All");
    setSelectedBranch("All");
    setTimeRange("all");
    setSelectedStatus("All");
    setSearchQuery("");
  };

  // Export CSV
  const handleExportCSV = () => {
    if (activities.length === 0) {
      showToast("No activity records available to export.", "info");
      return;
    }

    const headers = [
      "Event ID",
      "User Role",
      "User Name",
      "User Email",
      "NIC / Mobile",
      "Branch",
      "Action",
      "IP Address",
      "Device",
      "Browser",
      "Operating System",
      "Status",
      "Event Details",
      "Timestamp"
    ];

    const rows = activities.map((a) => [
      `"${a._id}"`,
      `"${a.userType}"`,
      `"${a.userName || ""}"`,
      `"${a.userEmail}"`,
      `"${a.userNic || ""}"`,
      `"${a.branch || "Head Office"}"`,
      `"${a.action}"`,
      `"${a.ipAddress}"`,
      `"${a.device}"`,
      `"${a.browser || ""}"`,
      `"${a.os || ""}"`,
      `"${a.status}"`,
      `"${(a.details || "").replace(/"/g, '""')}"`,
      `"${formatSriLankaDateTime(a.createdAt)}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Sanasa_Activity_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Audit activity log CSV downloaded.", "success");
  };

  // Role Badge Helper
  const renderRoleBadge = (role: string) => {
    switch (role) {
      case "PolicyHolder":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
            <HugeiconsIcon icon={Folder01Icon} className="w-3 h-3" />
            Policy Holder
          </span>
        );
      case "OfficeStaff":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
            <HugeiconsIcon icon={Building01Icon} className="w-3 h-3" />
            Branch Staff
          </span>
        );
      case "Agent":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
            <HugeiconsIcon icon={Briefcase01Icon} className="w-3 h-3" />
            Insurance Agent
          </span>
        );
      case "Admin":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
            <HugeiconsIcon icon={SecurityCheckIcon} className="w-3 h-3" />
            Administrator
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
            {role}
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Toast */}
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
          <header className="bg-white border-b border-slate-100 text-slate-800 px-6 lg:px-8 py-4 flex justify-between items-center select-none shadow-sm shrink-0 h-[80px] sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("open-admin-mobile-menu"))}
                className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 active:scale-95 transition-all cursor-pointer focus:outline-none"
              >
                <HugeiconsIcon icon={Menu01Icon} className="w-6 h-6" strokeWidth={2.5} />
              </button>
              <h1 className="text-lg lg:text-xl font-semibold text-slate-800 flex items-center gap-2 truncate">
                <span className="bg-[#102A43] text-white text-xs lg:text-sm px-3.5 py-1.5 rounded-xl font-semibold tracking-wide shadow-sm">
                  Executive Audit
                </span>
                <span className="hidden sm:inline text-slate-700 font-bold">— Activity & Login Governance</span>
              </h1>
            </div>

            <div className="flex items-center gap-3 lg:gap-4">
              <button
                onClick={handleExportCSV}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl border border-slate-200 text-xs shadow-sm transition-all cursor-pointer"
                title="Export audit log to CSV"
              >
                <HugeiconsIcon icon={Download01Icon} className="w-4 h-4 text-slate-500" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={() => fetchLoginActivity(true)}
                disabled={refreshing}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer border border-slate-200 bg-white"
                title="Refresh audit data"
              >
                <HugeiconsIcon
                  icon={RefreshIcon}
                  className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-600" : ""}`}
                  strokeWidth={2.5}
                />
              </button>

              <div className="hidden md:flex text-xs font-semibold bg-slate-100 px-3.5 py-1.5 rounded-full text-slate-600 border border-slate-200">
                System Admin
              </div>

              <UserAvatarDropdown userType="admin" />
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-5 lg:p-8 bg-slate-50 flex flex-col gap-6 max-w-7xl mx-auto w-full">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
              {/* Total Logins */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-xs flex flex-col">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Total Logins</span>
                  <HugeiconsIcon icon={Clock01Icon} className="w-4 h-4 text-slate-400" />
                </div>
                <span className="text-xl font-bold text-slate-900">{summary.totalLogins.toLocaleString()}</span>
                <span className="text-[10px] text-slate-400 font-medium mt-0.5">Platform wide sessions</span>
              </div>

              {/* Policy Holders */}
              <div
                onClick={() => setActiveUserType("PolicyHolder")}
                className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs flex flex-col ${
                  activeUserType === "PolicyHolder"
                    ? "bg-blue-50/70 border-blue-300 ring-2 ring-blue-100"
                    : "bg-white border-slate-200/70 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between text-blue-600 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Policyholders</span>
                  <HugeiconsIcon icon={Folder01Icon} className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-xl font-bold text-slate-900">{summary.policyHolderLogins.toLocaleString()}</span>
                <span className="text-[10px] text-blue-600 font-semibold mt-0.5">Client Portal Logins</span>
              </div>

              {/* Branch Staff */}
              <div
                onClick={() => setActiveUserType("OfficeStaff")}
                className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs flex flex-col ${
                  activeUserType === "OfficeStaff"
                    ? "bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-100"
                    : "bg-white border-slate-200/70 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between text-indigo-600 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Branch Staff</span>
                  <HugeiconsIcon icon={Building01Icon} className="w-4 h-4 text-indigo-600" />
                </div>
                <span className="text-xl font-bold text-slate-900">{summary.branchStaffLogins.toLocaleString()}</span>
                <span className="text-[10px] text-indigo-600 font-semibold mt-0.5">Branch Portal Logins</span>
              </div>

              {/* Agents */}
              <div
                onClick={() => setActiveUserType("Agent")}
                className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs flex flex-col ${
                  activeUserType === "Agent"
                    ? "bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-100"
                    : "bg-white border-slate-200/70 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between text-emerald-600 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Agents</span>
                  <HugeiconsIcon icon={Briefcase01Icon} className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-xl font-bold text-slate-900">{summary.agentLogins.toLocaleString()}</span>
                <span className="text-[10px] text-emerald-600 font-semibold mt-0.5">Field Agent Logins</span>
              </div>

              {/* Administrators */}
              <div
                onClick={() => setActiveUserType("Admin")}
                className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs flex flex-col ${
                  activeUserType === "Admin"
                    ? "bg-purple-50/70 border-purple-300 ring-2 ring-purple-100"
                    : "bg-white border-slate-200/70 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between text-purple-600 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Admins</span>
                  <HugeiconsIcon icon={SecurityCheckIcon} className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-xl font-bold text-slate-900">{summary.adminLogins.toLocaleString()}</span>
                <span className="text-[10px] text-purple-600 font-semibold mt-0.5">Admin Portal Logins</span>
              </div>

              {/* Today Active */}
              <div
                onClick={() => setTimeRange("today")}
                className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs flex flex-col ${
                  timeRange === "today"
                    ? "bg-amber-50/70 border-amber-300 ring-2 ring-amber-100"
                    : "bg-white border-slate-200/70 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between text-amber-600 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Today Active</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <span className="text-xl font-bold text-slate-900">{summary.todayLogins.toLocaleString()}</span>
                <span className="text-[10px] text-amber-700 font-semibold mt-0.5">Past 24 hours</span>
              </div>
            </div>

            {/* Visual Analytics / Breakdown Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Device Client Breakdown */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-xs">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Login Distribution by Client Device
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">Environment Breakdown</span>
                </div>
                <div className="space-y-2.5">
                  {summary.deviceBreakdown && summary.deviceBreakdown.length > 0 ? (
                    summary.deviceBreakdown.map((d, i) => {
                      const total = summary.totalLogins || 1;
                      const pct = Math.round((d.count / total) * 100);
                      return (
                        <div key={i} className="flex flex-col gap-1 text-xs">
                          <div className="flex justify-between font-medium">
                            <span className="text-slate-700">{d.device}</span>
                            <span className="text-slate-500 font-mono font-semibold">
                              {d.count} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                              style={{ width: `${Math.max(4, pct)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-400 py-3 text-center">No client device telemetry recorded yet.</p>
                  )}
                </div>
              </div>

              {/* Branch Activity Breakdown */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-xs">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Branch Portal Activity Volume
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">Regional Distribution</span>
                </div>
                <div className="space-y-2.5">
                  {summary.branchBreakdown && summary.branchBreakdown.length > 0 ? (
                    summary.branchBreakdown.map((b, i) => {
                      const total = summary.totalLogins || 1;
                      const pct = Math.round((b.count / total) * 100);
                      return (
                        <div key={i} className="flex flex-col gap-1 text-xs">
                          <div className="flex justify-between font-medium">
                            <span className="text-slate-700">{b.branch} Branch</span>
                            <span className="text-slate-500 font-mono font-semibold">
                              {b.count} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full"
                              style={{ width: `${Math.max(4, pct)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-400 py-3 text-center">No branch regional login volume recorded yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-xs flex flex-col gap-4">
              {/* Role Filter Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 overflow-x-auto no-scrollbar">
                {[
                  { id: "All", label: "All Users" },
                  { id: "PolicyHolder", label: `Policy Holders (${summary.policyHolderLogins})` },
                  { id: "OfficeStaff", label: `Branch Staff (${summary.branchStaffLogins})` },
                  { id: "Agent", label: `Agents (${summary.agentLogins})` },
                  { id: "Admin", label: `Admins (${summary.adminLogins})` }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveUserType(tab.id as any)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      activeUserType === tab.id
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Sub-Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {/* Search */}
                <div className="relative">
                  <HugeiconsIcon icon={Search01Icon} className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Name, Email, NIC, IP, Device..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>

                {/* Branch Dropdown */}
                <div>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    {SRI_LANKA_BRANCHES.map((b) => (
                      <option key={b} value={b}>
                        {b === "All" ? "All Branches" : `${b} Branch`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Time Range */}
                <div>
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    <option value="all">All Time History</option>
                    <option value="today">Today (Past 24 Hours)</option>
                    <option value="7days">Past 7 Days</option>
                    <option value="30days">Past 30 Days</option>
                  </select>
                </div>

                {/* Status & Reset */}
                <div className="flex items-center gap-2">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Success">Success Only</option>
                    <option value="Failed">Failed / Flagged</option>
                  </select>

                  <button
                    onClick={handleResetFilters}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-semibold text-xs whitespace-nowrap transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Audit Log Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-sm">
                    Authentication & Activity Governance Log
                  </span>
                  <span className="text-xs bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full font-bold">
                    {activities.length} entries
                  </span>
                </div>
              </div>

              {loading ? (
                <div className="py-20 flex justify-center">
                  <SimpleLoader message="Loading activity audit trail..." theme="slate" />
                </div>
              ) : activities.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4">User & Role</th>
                        <th className="py-3 px-4">Branch</th>
                        <th className="py-3 px-4">Action</th>
                        <th className="py-3 px-4">IP Address</th>
                        <th className="py-3 px-4">Device & OS</th>
                        <th className="py-3 px-4">Browser</th>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Inspect</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activities.map((act) => (
                        <tr
                          key={act._id}
                          className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                          onClick={() => setInspectActivity(act)}
                        >
                          {/* User & Role */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-slate-900">{act.userName || act.userEmail}</span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {renderRoleBadge(act.userType)}
                                <span className="text-[11px] text-slate-400 truncate max-w-[150px]">{act.userEmail}</span>
                              </div>
                            </div>
                          </td>

                          {/* Branch */}
                          <td className="py-3.5 px-4">
                            <span className="font-medium text-slate-800">{act.branch || "Head Office"}</span>
                          </td>

                          {/* Action */}
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-900">{act.action}</span>
                          </td>

                          {/* IP */}
                          <td className="py-3.5 px-4">
                            <span className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                              {act.ipAddress || "127.0.0.1"}
                            </span>
                          </td>

                          {/* Device & OS */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-800">{act.device || "Desktop"}</span>
                              {act.os && <span className="text-[10px] text-slate-400">{act.os}</span>}
                            </div>
                          </td>

                          {/* Browser */}
                          <td className="py-3.5 px-4">
                            <span className="text-slate-600 text-xs">{act.browser || "Web Browser"}</span>
                          </td>

                          {/* Timestamp */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="text-slate-700 font-medium">
                              {formatSriLankaDateTime(act.createdAt)}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                                act.status === "Success"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : act.status === "Failed"
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                            >
                              {act.status || "Success"}
                            </span>
                          </td>

                          {/* Action */}
                          <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setInspectActivity(act)}
                              title="Inspect Activity Event"
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                            >
                              <HugeiconsIcon icon={ViewIcon} className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-16 text-center text-slate-400 text-xs">
                  No login activities found matching the selected filters.
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Inspect Event Modal */}
      {inspectActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={Shield01Icon} className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Activity Event Audit Detail</h3>
              </div>
              <button
                onClick={() => setInspectActivity(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">User Identity</span>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">User Role:</span>
                  <div>{renderRoleBadge(inspectActivity.userType)}</div>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">Full Name:</span>
                  <span className="font-semibold text-slate-800">{inspectActivity.userName || "—"}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">Email Address:</span>
                  <span className="font-semibold text-slate-800">{inspectActivity.userEmail}</span>
                </div>
                {inspectActivity.userNic && (
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-400">NIC / Mobile:</span>
                    <span className="font-mono text-slate-800">{inspectActivity.userNic}</span>
                  </div>
                )}
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">Branch Office:</span>
                  <span className="font-semibold text-slate-800">{inspectActivity.branch || "Head Office"}</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Session & Environment</span>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">Action:</span>
                  <span className="font-semibold text-slate-800">{inspectActivity.action}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">Timestamp:</span>
                  <span className="font-medium text-slate-800">{formatSriLankaDateTime(inspectActivity.createdAt)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">IP Address:</span>
                  <span className="font-mono text-slate-800">{inspectActivity.ipAddress}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">Device Platform:</span>
                  <span className="font-semibold text-slate-800">{inspectActivity.device}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">Browser & OS:</span>
                  <span className="text-slate-800">{inspectActivity.browser || "Web Browser"} on {inspectActivity.os || "Unknown OS"}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">Status:</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    inspectActivity.status === "Success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                  }`}>
                    {inspectActivity.status}
                  </span>
                </div>
              </div>

              {inspectActivity.details && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Details & Message</span>
                  <p className="text-slate-700 text-xs leading-relaxed">{inspectActivity.details}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setInspectActivity(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl border border-slate-200 text-xs cursor-pointer"
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
    </div>
  );
}
