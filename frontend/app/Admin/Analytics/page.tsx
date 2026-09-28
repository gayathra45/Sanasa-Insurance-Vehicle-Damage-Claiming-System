"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Location01Icon,
  Car01Icon,
  Call02Icon,
  Mail01Icon,
  ArrowRight01Icon,
  SquareLock02Icon
} from "@hugeicons/core-free-icons";

// ==========================================
// --- Type Definitions ---
// ==========================================

interface SystemSummary {
  totalClaims: number;
  approvedClaims: number;
  pendingClaims: number;
  inProgressClaims: number;
  rejectedClaims: number;
  approvalRate: number;
  totalApprovedPayout: number;
  totalEstimatedLoss: number;
  avgPayoutPerClaim: number;
  totalPolicyholders: number;
  approvedPolicyholders: number;
  pendingPolicyholders: number;
  totalVehicles: number;
  totalAgents: number;
  activeAgents: number;
  offlineAgents: number;
  agentDutyRate: number;
  totalBranches: number;
  totalStaffMembers: number;
  todayLogins: number;
  loginSuccessRate: number;
}

interface MonthlyTrend {
  key: string;
  label: string;
  submitted: number;
  approved: number;
  rejected: number;
  payout: number;
}

interface DamageCategory {
  category: string;
  count: number;
  amount: number;
  percentage: number;
}

interface BranchMatrixItem {
  branch: string;
  district: string;
  province: string;
  staffCount: number;
  agentCount: number;
  activeAgentCount: number;
  policyholdersCount: number;
  totalClaims: number;
  approvedClaims: number;
  pendingClaims: number;
  inProgressClaims: number;
  rejectedClaims: number;
  totalPayoutLKR: number;
  avgPayoutLKR: number;
  resolutionRate: number;
}

interface VehicleTypeStat {
  vehicleType: string;
  count: number;
  percentage: number;
}

interface ProvinceStat {
  province: string;
  count: number;
  percentage: number;
}

interface AgentStat {
  _id: string;
  agentId: string;
  name: string;
  email: string;
  phone: string;
  branch: string;
  availability: "Active" | "Offline";
  assignedClaimsCount: number;
  completedClaimsCount: number;
  evaluatedLossLKR: number;
  lastSeenAt?: string;
  status: string;
}

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

const SRI_LANKA_BRANCHES = [
  "All",
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
  "Sooriyawewa",
  "Head Office"
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

export default function AdminAnalyticsReportsPage() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<
    "overview" | "financial" | "branches" | "policyholders" | "agents" | "security"
  >("overview");

  // State data
  const [summary, setSummary] = useState<SystemSummary>({
    totalClaims: 0,
    approvedClaims: 0,
    pendingClaims: 0,
    inProgressClaims: 0,
    rejectedClaims: 0,
    approvalRate: 0,
    totalApprovedPayout: 0,
    totalEstimatedLoss: 0,
    avgPayoutPerClaim: 0,
    totalPolicyholders: 0,
    approvedPolicyholders: 0,
    pendingPolicyholders: 0,
    totalVehicles: 0,
    totalAgents: 0,
    activeAgents: 0,
    offlineAgents: 0,
    agentDutyRate: 0,
    totalBranches: 0,
    totalStaffMembers: 0,
    todayLogins: 0,
    loginSuccessRate: 100
  });

  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [damageCategories, setDamageCategories] = useState<DamageCategory[]>([]);
  const [priorityDistribution, setPriorityDistribution] = useState<Record<string, number>>({});
  const [branchMatrix, setBranchMatrix] = useState<BranchMatrixItem[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleTypeStat[]>([]);
  const [provinceDistribution, setProvinceDistribution] = useState<ProvinceStat[]>([]);
  const [agentPerformance, setAgentPerformance] = useState<AgentStat[]>([]);
  const [recentLogins, setRecentLogins] = useState<LoginActivityRecord[]>([]);

  // Loading & sync
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [timeRange, setTimeRange] = useState<"all" | "today" | "7days" | "30days" | "90days" | "thisyear">("all");
  const [selectedBranch, setSelectedBranch] = useState("All");
  const [selectedProvince, setSelectedProvince] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [viewingBranch, setViewingBranch] = useState<BranchMatrixItem | null>(null);
  const [inspectActivity, setInspectActivity] = useState<LoginActivityRecord | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Format currency
  const formatLKR = (amount?: number) => {
    if (amount === undefined || amount === null || isNaN(amount)) return "Rs. 0";
    return `Rs. ${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Fetch Comprehensive Analytics
  const fetchAnalytics = useCallback(async (isRefresh = false, isSilent = false) => {
    if (isRefresh) setRefreshing(true);
    else if (!isSilent) setLoading(true);

    try {
      const params = new URLSearchParams();
      if (selectedBranch && selectedBranch !== "All") params.append("branch", selectedBranch);
      if (selectedProvince && selectedProvince !== "All") params.append("province", selectedProvince);
      if (timeRange && timeRange !== "all") params.append("timeRange", timeRange);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await fetch(`${API_URL}/admin/comprehensive-analytics?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load comprehensive analytics data");
      const data = await res.json();

      if (data.summary) setSummary(data.summary);
      if (Array.isArray(data.monthlyTrends)) setMonthlyTrends(data.monthlyTrends);
      if (Array.isArray(data.damageCategories)) setDamageCategories(data.damageCategories);
      if (data.priorityDistribution) setPriorityDistribution(data.priorityDistribution);
      if (Array.isArray(data.branchMatrix)) setBranchMatrix(data.branchMatrix);
      if (Array.isArray(data.vehicleTypes)) setVehicleTypes(data.vehicleTypes);
      if (Array.isArray(data.provinceDistribution)) setProvinceDistribution(data.provinceDistribution);
      if (Array.isArray(data.agentPerformance)) setAgentPerformance(data.agentPerformance);
      if (Array.isArray(data.recentLogins)) setRecentLogins(data.recentLogins);

      if (isRefresh) showToast("Executive reports refreshed.", "success");
    } catch (err: any) {
      if (!isSilent) {
        console.error("Fetch analytics error:", err);
        showToast(err.message || "Failed to load executive reports", "error");
      }
    } finally {
      if (!isSilent) setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, [selectedBranch, selectedProvince, timeRange, searchQuery]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Real-time background sync (every 5s) & visibility listener
  useEffect(() => {
    const liveInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchAnalytics(false, true);
      }
    }, 5000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchAnalytics(false, true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(liveInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchAnalytics]);

  // Filtered Branch Matrix
  const filteredBranches = useMemo(() => {
    return branchMatrix.filter((b) => {
      const matchBranch = selectedBranch === "All" || b.branch.toLowerCase() === selectedBranch.toLowerCase();
      const matchProv = selectedProvince === "All" || (b.province && b.province.toLowerCase().includes(selectedProvince.toLowerCase()));
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        b.branch.toLowerCase().includes(query) ||
        b.district.toLowerCase().includes(query) ||
        b.province.toLowerCase().includes(query);
      return matchBranch && matchProv && matchSearch;
    });
  }, [branchMatrix, selectedBranch, selectedProvince, searchQuery]);

  // Filtered Agent Performance
  const filteredAgents = useMemo(() => {
    return agentPerformance.filter((a) => {
      const matchBranch = selectedBranch === "All" || (a.branch && a.branch.toLowerCase() === selectedBranch.toLowerCase());
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        a.name.toLowerCase().includes(query) ||
        a.agentId.toLowerCase().includes(query) ||
        a.email.toLowerCase().includes(query) ||
        a.branch.toLowerCase().includes(query);
      return matchBranch && matchSearch;
    });
  }, [agentPerformance, selectedBranch, searchQuery]);

  // Filtered Recent Logins
  const filteredLogins = useMemo(() => {
    return recentLogins.filter((l) => {
      const matchBranch = selectedBranch === "All" || (l.branch && l.branch.toLowerCase() === selectedBranch.toLowerCase());
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        (l.userName && l.userName.toLowerCase().includes(query)) ||
        (l.userEmail && l.userEmail.toLowerCase().includes(query)) ||
        (l.userNic && l.userNic.toLowerCase().includes(query)) ||
        (l.ipAddress && l.ipAddress.includes(query)) ||
        (l.device && l.device.toLowerCase().includes(query)) ||
        (l.action && l.action.toLowerCase().includes(query));
      return matchBranch && matchSearch;
    });
  }, [recentLogins, selectedBranch, searchQuery]);

  // CSV Exporters
  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${filename} successfully!`, "success");
    setShowExportModal(false);
  };

  const handleExportExecutiveSummary = () => {
    let csv = "Sanasa General Insurance - Executive System Summary Report\r\n";
    csv += `Generated On,${new Date().toLocaleString()}\r\n\r\n`;
    csv += "Metric,Value\r\n";
    csv += `Total Claims Registered,${summary.totalClaims}\r\n`;
    csv += `Approved Claims,${summary.approvedClaims}\r\n`;
    csv += `Pending Claims,${summary.pendingClaims}\r\n`;
    csv += `In Progress Claims,${summary.inProgressClaims}\r\n`;
    csv += `Rejected Claims,${summary.rejectedClaims}\r\n`;
    csv += `Claims Resolution Rate,${summary.approvalRate}%\r\n`;
    csv += `Total Approved Payout (LKR),${summary.totalApprovedPayout}\r\n`;
    csv += `Total Estimated Loss (LKR),${summary.totalEstimatedLoss}\r\n`;
    csv += `Average Payout Per Claim (LKR),${summary.avgPayoutPerClaim}\r\n`;
    csv += `Total Policyholders,${summary.totalPolicyholders}\r\n`;
    csv += `Approved Policyholders,${summary.approvedPolicyholders}\r\n`;
    csv += `Insured Vehicle Fleet,${summary.totalVehicles}\r\n`;
    csv += `Total Field Agents,${summary.totalAgents}\r\n`;
    csv += `Active Duty Agents,${summary.activeAgents}\r\n`;
    csv += `Regional Branches,${summary.totalBranches}\r\n`;
    csv += `Total Office Staff,${summary.totalStaffMembers}\r\n`;
    csv += `Today Logins,${summary.todayLogins}\r\n`;
    csv += `System Login Security Rate,${summary.loginSuccessRate}%\r\n`;
    downloadCSV(csv, `Sanasa_Executive_Summary_${Date.now()}.csv`);
  };

  const handleExportBranchMatrix = () => {
    let csv = "Branch Name,District,Province,Staff Count,Assigned Agents,Active Duty Agents,Policyholders,Total Claims,Approved,Pending,In Progress,Rejected,Total Payout (LKR),Average Payout (LKR),Resolution Rate\r\n";
    branchMatrix.forEach((b) => {
      csv += `"${b.branch}","${b.district}","${b.province}",${b.staffCount},${b.agentCount},${b.activeAgentCount},${b.policyholdersCount},${b.totalClaims},${b.approvedClaims},${b.pendingClaims},${b.inProgressClaims},${b.rejectedClaims},${b.totalPayoutLKR},${b.avgPayoutLKR},${b.resolutionRate}%\r\n`;
    });
    downloadCSV(csv, `Sanasa_Branch_Performance_Matrix_${Date.now()}.csv`);
  };

  const handleExportFinancialMatrix = () => {
    let csv = "Damage Category,Claims Count,Percentage,Total Loss Valuation (LKR),Average Loss Per Case (LKR)\r\n";
    damageCategories.forEach((c) => {
      const avg = c.count > 0 ? Math.round(c.amount / c.count) : 0;
      csv += `"${c.category}",${c.count},${c.percentage}%,${c.amount},${avg}\r\n`;
    });
    downloadCSV(csv, `Sanasa_Financial_Loss_Matrix_${Date.now()}.csv`);
  };

  const handleExportAgentRoster = () => {
    let csv = "Agent ID,Full Name,Email,Phone,Branch,Duty Status,Account Status,Assigned Claims,Completed Evaluations,Evaluated Loss (LKR),Last Seen\r\n";
    agentPerformance.forEach((a) => {
      csv += `"${a.agentId}","${a.name}","${a.email}","${a.phone}","${a.branch}","${a.availability}","${a.status}",${a.assignedClaimsCount},${a.completedClaimsCount},${a.evaluatedLossLKR},"${a.lastSeenAt ? formatSriLankaDateTime(a.lastSeenAt) : 'N/A'}"\r\n`;
    });
    downloadCSV(csv, `Sanasa_Agent_Performance_Roster_${Date.now()}.csv`);
  };

  // Find max monthly submitted count for bar normalization
  const maxMonthlyVal = useMemo(() => {
    let max = 1;
    monthlyTrends.forEach((m) => {
      if (m.submitted > max) max = m.submitted;
      if (m.approved > max) max = m.approved;
    });
    return max;
  }, [monthlyTrends]);

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
                Analytics
              </h1>
              {/* Desktop welcome title */}
              <h1 className="hidden lg:flex text-xl font-semibold text-slate-800 items-center gap-2 pl-2 lg:pl-0 truncate">
                <span className="bg-[#102A43] text-white text-base px-4 py-2 rounded-xl font-semibold shadow-sm tracking-wide">
                  Admin Portal
                </span>
                <span className="hidden lg:inline"> — Executive Analytics & System Reports</span>
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-sm font-semibold bg-slate-100 px-4 py-2 rounded-full text-slate-600 border border-slate-200">
                System Admin
              </div>
              <UserAvatarDropdown userType="admin" />
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 p-6 lg:p-8 bg-slate-50 flex flex-col gap-6 max-w-7xl w-full mx-auto">
            {/* Top 6 Executive KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 select-none">
              {/* Card 1: Total Claims */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Claims</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#000080] flex items-center justify-center">
                    <HugeiconsIcon icon={Shield01Icon} className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-black text-slate-900 leading-tight">{summary.totalClaims}</div>
                  <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500 font-semibold">
                    <span className="text-emerald-600 font-bold">{summary.approvedClaims} Approved</span>
                    <span className="text-amber-600">{summary.pendingClaims} Pending</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Financial Approved Payout */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Approved Payout</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <HugeiconsIcon icon={Analytics01Icon} className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-xl font-black text-emerald-600 leading-tight truncate" title={formatLKR(summary.totalApprovedPayout)}>
                    {formatLKR(summary.totalApprovedPayout)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold mt-1 truncate">
                    Loss: {formatLKR(summary.totalEstimatedLoss)}
                  </div>
                </div>
              </div>

              {/* Card 3: Policyholders & Fleet */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Policyholders</span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <HugeiconsIcon icon={Folder01Icon} className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-black text-slate-900 leading-tight">{summary.totalPolicyholders}</div>
                  <div className="text-[10px] text-indigo-600 font-bold mt-1">
                    {summary.totalVehicles} Insured Vehicles
                  </div>
                </div>
              </div>

              {/* Card 4: Field Agents Duty Readiness */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Field Agents</span>
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                    <HugeiconsIcon icon={Briefcase01Icon} className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-black text-slate-900 leading-tight flex items-baseline gap-1.5">
                    <span>{summary.totalAgents}</span>
                    <span className="text-xs font-bold text-emerald-600">({summary.activeAgents} Online)</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold mt-1">
                    {summary.offlineAgents} Off Duty
                  </div>
                </div>
              </div>

              {/* Card 5: Regional Branches */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Branch Network</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <HugeiconsIcon icon={Building01Icon} className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-black text-slate-900 leading-tight">{summary.totalBranches}</div>
                  <div className="text-[10px] text-amber-700 font-bold mt-1">
                    {summary.totalStaffMembers} Branch Officers
                  </div>
                </div>
              </div>

              {/* Card 6: System Security & Health */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Security Score</span>
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                    <HugeiconsIcon icon={SecurityCheckIcon} className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-black text-emerald-600 leading-tight">{summary.loginSuccessRate}%</div>
                  <div className="text-[10px] text-slate-500 font-semibold mt-1">
                    {summary.todayLogins} Logins Today
                  </div>
                </div>
              </div>
            </div>

            {/* Top Toolbar: Search, Filters & Export Center */}
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm select-none">
              {/* Search Bar */}
              <div className="relative w-full lg:w-[320px]">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <HugeiconsIcon icon={Search01Icon} className="w-4 h-4 text-slate-400" strokeWidth={2.5} />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search analytics by branch, agent, keyword..."
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

              {/* Time Range Filter Pills */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/60 overflow-x-auto max-w-full">
                {[
                  { id: "all", label: "All Time" },
                  { id: "today", label: "Today" },
                  { id: "7days", label: "Last 7 Days" },
                  { id: "30days", label: "Last 30 Days" },
                  { id: "90days", label: "Last Quarter" },
                  { id: "thisyear", label: "This Year" }
                ].map((t) => {
                  const isSel = timeRange === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTimeRange(t.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-none outline-none whitespace-nowrap ${
                        isSel ? "bg-[#000080] text-white shadow-xs" : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
                <button
                  onClick={() => setShowExportModal(true)}
                  className="flex-1 lg:flex-none py-2.5 px-5 bg-white hover:bg-slate-50 border border-slate-200 hover:scale-105 active:scale-95 text-slate-700 rounded-xl text-xs font-bold shadow-sm transition-all outline-none cursor-pointer flex items-center justify-center gap-1.5 relative"
                >
                  <HugeiconsIcon icon={Download01Icon} className="w-4 h-4 text-slate-600" strokeWidth={2.5} />
                  <span>Export Center</span>
                </button>

                <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50/80 border border-emerald-200/80 rounded-xl text-[11px] font-bold text-emerald-700 select-none shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Live Sync</span>
                </div>

                <button
                  onClick={() => fetchAnalytics(true)}
                  disabled={refreshing || loading}
                  title="Manual Refresh"
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <HugeiconsIcon icon={RefreshIcon} className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Segmented Reports Control Tabs Grid (Zero Scrollbar) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col gap-4 select-none">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/60 w-full">
                {[
                  { id: "overview", label: "Executive Overview", icon: Analytics01Icon },
                  { id: "financial", label: "Claims & Payouts", icon: Shield01Icon },
                  { id: "branches", label: "Regional Branches", icon: Building01Icon },
                  { id: "policyholders", label: "Policyholders & Fleet", icon: Car01Icon },
                  { id: "agents", label: "Field Agents", icon: Briefcase01Icon },
                  { id: "security", label: "Security & Audits", icon: SecurityCheckIcon }
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-none outline-none ${
                        isActive
                          ? "bg-[#000080] text-white shadow-md shadow-blue-900/20"
                          : "bg-white/70 hover:bg-white text-slate-600 hover:text-slate-900 shadow-2xs hover:shadow-xs"
                      }`}
                    >
                      <HugeiconsIcon icon={tab.icon} className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-500"}`} strokeWidth={2.5} />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Secondary Branch & Province Filters Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                {/* Branch Dropdown */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <HugeiconsIcon icon={Building01Icon} className="w-3.5 h-3.5 text-slate-400" />
                    <span>Regional Branch Filter</span>
                  </label>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 shadow-sm cursor-pointer"
                  >
                    {SRI_LANKA_BRANCHES.map((b) => (
                      <option key={b} value={b}>
                        {b === "All" ? "All Sri Lanka Branches" : `${b} Branch`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Province Dropdown */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <HugeiconsIcon icon={Location01Icon} className="w-3.5 h-3.5 text-slate-400" />
                    <span>Province Filter</span>
                  </label>
                  <select
                    value={selectedProvince}
                    onChange={(e) => setSelectedProvince(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 shadow-sm cursor-pointer"
                  >
                    {SRI_LANKA_PROVINCES.map((p) => (
                      <option key={p} value={p}>
                        {p === "All" ? "All Island Provinces" : p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* TAB CONTENT AREA */}
            {loading ? (
              <SimpleLoader message="Aggregating executive insurance system analytics..." theme="slate" />
            ) : (
              <>
                {/* TAB 1: EXECUTIVE OVERVIEW */}
                {activeTab === "overview" && (
                  <div className="flex flex-col gap-6">
                    {/* Visual Charts Row 1: Claims 6-Month Volume Trend & Loss Ratio Breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Chart: 6-Month Claims vs Approved Volume */}
                      <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                              <h3 className="text-sm font-bold text-slate-900">Claims Volume & Settlement Trajectory</h3>
                              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                                Monthly claims intake vs approved payouts
                              </p>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] font-bold">
                              <span className="flex items-center gap-1.5 text-slate-600">
                                <span className="w-3 h-3 rounded-md bg-[#000080]"></span>
                                <span>Submitted</span>
                              </span>
                              <span className="flex items-center gap-1.5 text-emerald-600">
                                <span className="w-3 h-3 rounded-md bg-emerald-500"></span>
                                <span>Approved</span>
                              </span>
                            </div>
                          </div>

                          {/* Interactive CSS Bar Chart */}
                          <div className="h-48 pt-6 pb-2 flex items-end justify-between gap-3">
                            {monthlyTrends.map((m) => {
                              const subHeight = Math.max(12, Math.round((m.submitted / maxMonthlyVal) * 140));
                              const appHeight = Math.max(8, Math.round((m.approved / maxMonthlyVal) * 140));
                              return (
                                <div key={m.key} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                                  <div className="w-full flex items-end justify-center gap-1.5">
                                    {/* Submitted Bar */}
                                    <div
                                      style={{ height: `${subHeight}px` }}
                                      className="w-full max-w-[20px] bg-[#000080] rounded-t-lg transition-all duration-300 group-hover:brightness-125 relative flex items-start justify-center pt-1"
                                      title={`Submitted: ${m.submitted}`}
                                    >
                                      {m.submitted > 0 && (
                                        <span className="text-[9px] font-black text-white">{m.submitted}</span>
                                      )}
                                    </div>
                                    {/* Approved Bar */}
                                    <div
                                      style={{ height: `${appHeight}px` }}
                                      className="w-full max-w-[20px] bg-emerald-500 rounded-t-lg transition-all duration-300 group-hover:brightness-125 relative flex items-start justify-center pt-1"
                                      title={`Approved: ${m.approved} (${formatLKR(m.payout)})`}
                                    >
                                      {m.approved > 0 && (
                                        <span className="text-[9px] font-black text-white">{m.approved}</span>
                                      )}
                                    </div>
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-500 uppercase">{m.label}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 mt-3 flex items-center justify-between text-xs font-semibold text-slate-600">
                          <span>Cumulative 6-Month Settlement:</span>
                          <span className="text-emerald-700 font-bold">{formatLKR(summary.totalApprovedPayout)}</span>
                        </div>
                      </div>

                      {/* Loss Ratio & Settlement Efficiency Widget */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="border-b border-slate-100 pb-3">
                            <h3 className="text-sm font-bold text-slate-900">Settlement Efficiency</h3>
                            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Claims resolution metrics</p>
                          </div>

                          {/* Radial Progress / Resolution Metric */}
                          <div className="py-6 flex flex-col items-center justify-center">
                            <div className="relative w-32 h-32 flex items-center justify-center rounded-full border-8 border-slate-100 bg-slate-50/50">
                              <div
                                className="absolute inset-0 rounded-full border-8 border-emerald-500 border-t-transparent border-l-transparent -rotate-45"
                              ></div>
                              <div className="text-center">
                                <span className="text-2xl font-black text-slate-900">{summary.approvalRate}%</span>
                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resolved</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2.5">
                            <div className="flex justify-between items-center text-xs font-semibold">
                              <span className="text-slate-500">Average Payout / Claim:</span>
                              <span className="text-slate-800 font-bold">{formatLKR(summary.avgPayoutPerClaim)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs font-semibold">
                              <span className="text-slate-500">Active Field Duty Readiness:</span>
                              <span className="text-purple-600 font-bold">{summary.agentDutyRate}% ({summary.activeAgents}/{summary.totalAgents})</span>
                            </div>
                            <div className="flex justify-between items-center text-xs font-semibold">
                              <span className="text-slate-500">Branch Network Footprint:</span>
                              <span className="text-slate-800 font-bold">{summary.totalBranches} Offices</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => setActiveTab("financial")}
                          className="mt-4 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>View Detailed Financial Report</span>
                          <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Visual Charts Row 2: Damage Categories & Vehicle Composition */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Damage Category Matrix */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                          <div>
                            <h3 className="text-sm font-bold text-slate-900">Damage Category Breakdown</h3>
                            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Distribution by incident nature</p>
                          </div>
                          <span className="text-xs font-bold text-[#000080] bg-blue-50 px-3 py-1 rounded-full border border-blue-200/60">
                            {damageCategories.length} Types
                          </span>
                        </div>

                        <div className="space-y-3.5">
                          {damageCategories.slice(0, 6).map((cat) => (
                            <div key={cat.category} className="space-y-1">
                              <div className="flex justify-between items-center text-xs font-bold">
                                <span className="text-slate-700">{cat.category}</span>
                                <span className="text-slate-500">{cat.count} cases ({cat.percentage}%) — {formatLKR(cat.amount)}</span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  style={{ width: `${Math.max(5, cat.percentage)}%` }}
                                  className="h-full bg-gradient-to-r from-[#000080] to-blue-500 rounded-full"
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Insured Vehicle Fleet Composition */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                          <div>
                            <h3 className="text-sm font-bold text-slate-900">Insured Vehicle Fleet Mix</h3>
                            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Policyholder vehicle classes</p>
                          </div>
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200/60">
                            {summary.totalVehicles} Total Fleet
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                          {vehicleTypes.slice(0, 4).map((v) => (
                            <div key={v.vehicleType} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                              <span className="text-xs font-bold text-slate-600 truncate">{v.vehicleType}</span>
                              <div className="flex items-baseline justify-between mt-2">
                                <span className="text-lg font-black text-slate-900">{v.count}</span>
                                <span className="text-xs font-bold text-indigo-600">{v.percentage}%</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 flex items-center justify-between text-xs font-semibold text-slate-600">
                          <span>Province Coverage:</span>
                          <span className="font-bold text-slate-800">{provinceDistribution.length} Active Provinces</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: FINANCIAL & CLAIMS SETTLEMENT */}
                {activeTab === "financial" && (
                  <div className="flex flex-col gap-6">
                    {/* Financial KPI Summary Banner */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-5 rounded-2xl border-l-[6px] border-l-emerald-500 border border-slate-200 shadow-sm">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Approved Payout</span>
                        <div className="text-2xl font-black text-emerald-600 mt-1">{formatLKR(summary.totalApprovedPayout)}</div>
                        <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">Dispatched to policyholders</span>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border-l-[6px] border-l-blue-500 border border-slate-200 shadow-sm">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Evaluated Loss</span>
                        <div className="text-2xl font-black text-slate-900 mt-1">{formatLKR(summary.totalEstimatedLoss)}</div>
                        <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">Reported physical assessments</span>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border-l-[6px] border-l-purple-500 border border-slate-200 shadow-sm">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Average Settlement</span>
                        <div className="text-2xl font-black text-purple-600 mt-1">{formatLKR(summary.avgPayoutPerClaim)}</div>
                        <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">Per approved claim case</span>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border-l-[6px] border-l-amber-500 border border-slate-200 shadow-sm">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Valuation</span>
                        <div className="text-2xl font-black text-amber-600 mt-1">{summary.pendingClaims + summary.inProgressClaims} Cases</div>
                        <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">Active in workflow pipeline</span>
                      </div>
                    </div>

                    {/* Damage Categories Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                        <div>
                          <h3 className="text-base font-bold text-slate-900">Incident Category Valuation Matrix</h3>
                          <p className="text-xs text-slate-400 font-semibold mt-0.5">Financial loss analysis by damage nature</p>
                        </div>
                        <button
                          onClick={handleExportFinancialMatrix}
                          className="py-2 px-4 bg-[#000080] text-white text-xs font-bold rounded-xl hover:bg-[#000066] transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" />
                          <span>Export Financial Matrix</span>
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                              <th className="py-3 px-4">Damage Nature</th>
                              <th className="py-3 px-4">Claims Count</th>
                              <th className="py-3 px-4">Percentage</th>
                              <th className="py-3 px-4">Total Loss Valuation</th>
                              <th className="py-3 px-4">Average Case Loss</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                            {damageCategories.map((c) => (
                              <tr key={c.category} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3.5 px-4 font-bold text-slate-900">{c.category}</td>
                                <td className="py-3.5 px-4">{c.count} claims</td>
                                <td className="py-3.5 px-4">
                                  <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#000080] font-bold text-[11px]">
                                    {c.percentage}%
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 font-bold text-emerald-600">{formatLKR(c.amount)}</td>
                                <td className="py-3.5 px-4">{formatLKR(c.count > 0 ? Math.round(c.amount / c.count) : 0)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: REGIONAL BRANCH NETWORK */}
                {activeTab === "branches" && (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Regional Branch Performance Matrix</h3>
                        <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                          Comprehensive island-wide metrics across {filteredBranches.length} branch offices
                        </p>
                      </div>
                      <button
                        onClick={handleExportBranchMatrix}
                        className="py-2 px-4 bg-[#000080] text-white text-xs font-bold rounded-xl hover:bg-[#000066] transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" />
                        <span>Export Branch Matrix</span>
                      </button>
                    </div>

                    {/* Branch Grid Rows */}
                    <div className="flex flex-col gap-3">
                      {/* Header */}
                      <div className="hidden lg:grid lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)_minmax(0,1.0fr)_minmax(0,1.0fr)_minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,1.2fr)] gap-4 px-5 py-3 text-slate-500 font-medium text-[10px] uppercase tracking-wider select-none bg-slate-100 rounded-xl border border-slate-200 mb-1 items-center">
                        <div>Branch & Province</div>
                        <div>Personnel & Agents</div>
                        <div>Policyholders</div>
                        <div>Total Claims</div>
                        <div>Approved Payout</div>
                        <div>Resolution Rate</div>
                        <div className="text-right">Actions</div>
                      </div>

                      {filteredBranches.map((b) => (
                        <div
                          key={b.branch}
                          className="bg-white border-l-[6px] border-l-blue-500 bg-gradient-to-r from-blue-50/10 via-transparent to-transparent border border-slate-200 rounded-xl px-5 py-4 flex flex-col lg:grid lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)_minmax(0,1.0fr)_minmax(0,1.0fr)_minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,1.2fr)] lg:items-center gap-4 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          {/* Branch & Province */}
                          <div className="flex flex-col min-w-0">
                            <h4 className="font-bold text-sm text-slate-900">{b.branch} Branch</h4>
                            <span className="text-[11px] text-slate-500 font-semibold mt-0.5">
                              {b.district} • {b.province}
                            </span>
                          </div>

                          {/* Staff & Agents */}
                          <div className="flex flex-col min-w-0 text-xs font-semibold">
                            <span className="text-slate-800 font-bold">{b.staffCount} Staff Officers</span>
                            <span className="text-[11px] text-purple-600 font-bold mt-0.5">
                              {b.agentCount} Agents ({b.activeAgentCount} On Duty)
                            </span>
                          </div>

                          {/* Policyholders */}
                          <div className="flex flex-col min-w-0 text-xs font-bold text-slate-800">
                            <span>{b.policyholdersCount} Policyholders</span>
                          </div>

                          {/* Claims */}
                          <div className="flex flex-col min-w-0 text-xs font-semibold">
                            <span className="text-slate-900 font-black">{b.totalClaims} Claims</span>
                            <span className="text-[10px] text-emerald-600 font-bold">{b.approvedClaims} Approved</span>
                          </div>

                          {/* Total Payout */}
                          <div className="flex flex-col min-w-0 text-xs font-bold text-emerald-600">
                            <span>{formatLKR(b.totalPayoutLKR)}</span>
                          </div>

                          {/* Resolution Rate */}
                          <div className="flex flex-col min-w-0">
                            <div className="flex justify-between items-center text-xs font-bold mb-1">
                              <span className="text-slate-700">{b.resolutionRate}%</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                style={{ width: `${Math.max(4, b.resolutionRate)}%` }}
                                className="h-full bg-emerald-500 rounded-full"
                              ></div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setViewingBranch(b)}
                              className="py-2 px-3.5 bg-slate-100 hover:bg-[#000080] hover:text-white text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <HugeiconsIcon icon={ViewIcon} className="w-3.5 h-3.5" />
                              <span>Inspect</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 4: POLICYHOLDERS & FLEET */}
                {activeTab === "policyholders" && (
                  <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white p-5 rounded-2xl border-l-[6px] border-l-blue-500 border border-slate-200 shadow-sm">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Registered</span>
                        <div className="text-2xl font-black text-slate-900 mt-1">{summary.totalPolicyholders}</div>
                        <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">Policyholder accounts</span>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border-l-[6px] border-l-emerald-500 border border-slate-200 shadow-sm">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Approved & Verified</span>
                        <div className="text-2xl font-black text-emerald-600 mt-1">{summary.approvedPolicyholders}</div>
                        <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">Active coverage verified</span>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border-l-[6px] border-l-indigo-500 border border-slate-200 shadow-sm">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Insured Vehicle Fleet</span>
                        <div className="text-2xl font-black text-indigo-600 mt-1">{summary.totalVehicles}</div>
                        <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">Total insured vehicles</span>
                      </div>
                    </div>

                    {/* Regional Province Distribution */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                      <div className="border-b border-slate-100 pb-3 mb-4">
                        <h3 className="text-sm font-bold text-slate-900">Province Density Distribution</h3>
                        <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Policyholder coverage across Sri Lanka</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {provinceDistribution.map((p) => (
                          <div key={p.province} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                            <span className="text-xs font-bold text-slate-700">{p.province}</span>
                            <div className="flex items-baseline justify-between mt-2">
                              <span className="text-lg font-black text-slate-900">{p.count} Holders</span>
                              <span className="text-xs font-bold text-[#000080] bg-blue-50 px-2 py-0.5 rounded-full">{p.percentage}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 5: FIELD AGENTS & AVAILABILITY */}
                {activeTab === "agents" && (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Field Insurance Agents Readiness & Performance</h3>
                        <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                          Live active duty availability and inspection performance
                        </p>
                      </div>
                      <button
                        onClick={handleExportAgentRoster}
                        className="py-2 px-4 bg-[#000080] text-white text-xs font-bold rounded-xl hover:bg-[#000066] transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" />
                        <span>Export Agent Roster</span>
                      </button>
                    </div>

                    {/* Agent Cards */}
                    <div className="flex flex-col gap-3">
                      {filteredAgents.map((a) => (
                        <div
                          key={a._id}
                          className="bg-white border-l-[6px] border-l-blue-500 bg-gradient-to-r from-blue-50/10 via-transparent to-transparent border border-slate-200 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          {/* Agent Info */}
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#000080] flex items-center justify-center font-bold text-xs flex-shrink-0">
                              {a.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-sm text-slate-900 truncate">{a.name}</h4>
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                  {a.agentId}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-500 font-semibold block mt-0.5">
                                {a.branch} Branch • {a.email} {a.phone ? `• ${a.phone}` : ""}
                              </span>
                            </div>
                          </div>

                          {/* Duty Status Badge & Stats */}
                          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                            <div className="text-right">
                              <span className="text-slate-900 font-bold block">{a.assignedClaimsCount} Assigned Cases</span>
                              <span className="text-[11px] text-emerald-600 font-bold">{a.completedClaimsCount} Completed</span>
                            </div>

                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-2xs ${
                                a.availability === "Active"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  a.availability === "Active" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                                }`}
                              ></span>
                              <span>{a.availability === "Active" ? "Active (On Duty)" : "Offline (Off Duty)"}</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 6: SECURITY & AUDIT LOGS */}
                {activeTab === "security" && (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">System Security & Access Governance Audit</h3>
                        <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                          Multi-role login events, IP footprints, and security access logs
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                          {summary.loginSuccessRate}% Success Rate
                        </span>
                      </div>
                    </div>

                    {/* Activity Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-4">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                              <th className="py-3 px-4">User & Role</th>
                              <th className="py-3 px-4">Branch</th>
                              <th className="py-3 px-4">Action</th>
                              <th className="py-3 px-4">Device & IP</th>
                              <th className="py-3 px-4">Status</th>
                              <th className="py-3 px-4">Timestamp</th>
                              <th className="py-3 px-4 text-right">Details</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                            {filteredLogins.map((log) => (
                              <tr key={log._id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3 px-4">
                                  <div className="font-bold text-slate-900">{log.userName || log.userEmail}</div>
                                  <span className="text-[10px] text-slate-400 font-bold uppercase">{log.userType}</span>
                                </td>
                                <td className="py-3 px-4 font-semibold text-slate-600">{log.branch || "Head Office"}</td>
                                <td className="py-3 px-4 font-bold text-slate-800">{log.action}</td>
                                <td className="py-3 px-4">
                                  <div>{log.device}</div>
                                  <span className="text-[10px] text-slate-400 font-mono">{log.ipAddress}</span>
                                </td>
                                <td className="py-3 px-4">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                      log.status === "Success"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : log.status === "Warning"
                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                        : "bg-rose-50 text-rose-700 border-rose-200"
                                    }`}
                                  >
                                    {log.status}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-[11px] text-slate-500 font-semibold">
                                  {formatSriLankaDateTime(log.createdAt)}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <button
                                    onClick={() => setInspectActivity(log)}
                                    className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer"
                                    title="Inspect Audit"
                                  >
                                    <HugeiconsIcon icon={ViewIcon} className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* MODAL 1: EXPORT REPORT CENTER */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 flex flex-col gap-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#000080] flex items-center justify-center">
                  <HugeiconsIcon icon={Download01Icon} className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Executive Report Export Center</h3>
                  <p className="text-xs text-slate-400 font-semibold">Download complete system reports in CSV format</p>
                </div>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {/* Option 1: Executive Summary */}
              <button
                onClick={handleExportExecutiveSummary}
                className="p-4 rounded-2xl border border-slate-200 hover:border-[#000080] bg-slate-50/50 hover:bg-blue-50/20 text-left transition-all flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#000080]">Executive KPI & Financial Summary</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Claims volume, payout sums, loss ratio, fleet & user totals</p>
                </div>
                <HugeiconsIcon icon={Download01Icon} className="w-4 h-4 text-slate-400 group-hover:text-[#000080]" />
              </button>

              {/* Option 2: Branch Performance Matrix */}
              <button
                onClick={handleExportBranchMatrix}
                className="p-4 rounded-2xl border border-slate-200 hover:border-[#000080] bg-slate-50/50 hover:bg-blue-50/20 text-left transition-all flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#000080]">Regional Branch Network Matrix</h4>
                  <p className="text-xs text-slate-500 mt-0.5">26-branch performance, staff density, claims & resolution rates</p>
                </div>
                <HugeiconsIcon icon={Download01Icon} className="w-4 h-4 text-slate-400 group-hover:text-[#000080]" />
              </button>

              {/* Option 3: Agent Performance Roster */}
              <button
                onClick={handleExportAgentRoster}
                className="p-4 rounded-2xl border border-slate-200 hover:border-[#000080] bg-slate-50/50 hover:bg-blue-50/20 text-left transition-all flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#000080]">Field Agent Roster & Inspection Log</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Agent availability, completed evaluations, and assigned case loads</p>
                </div>
                <HugeiconsIcon icon={Download01Icon} className="w-4 h-4 text-slate-400 group-hover:text-[#000080]" />
              </button>
            </div>

            <button
              onClick={() => setShowExportModal(false)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: BRANCH DEEP DIVE INSPECTOR */}
      {viewingBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 flex flex-col gap-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#000080] flex items-center justify-center font-bold text-sm">
                  {viewingBranch.branch.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{viewingBranch.branch} Branch Profile</h3>
                  <p className="text-xs text-slate-400 font-semibold">{viewingBranch.district} District • {viewingBranch.province}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingBranch(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3.5 text-xs font-semibold">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Staff Count</span>
                <span className="text-base font-black text-slate-900 mt-1 block">{viewingBranch.staffCount} Officers</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned Field Agents</span>
                <span className="text-base font-black text-purple-600 mt-1 block">
                  {viewingBranch.agentCount} ({viewingBranch.activeAgentCount} On Duty)
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Claims Volume</span>
                <span className="text-base font-black text-slate-900 mt-1 block">{viewingBranch.totalClaims} Cases</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Approved Payout</span>
                <span className="text-base font-black text-emerald-600 mt-1 block">{formatLKR(viewingBranch.totalPayoutLKR)}</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs font-bold">
              <span className="text-slate-600">Claims Clearance & Resolution Rate:</span>
              <span className="text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">{viewingBranch.resolutionRate}%</span>
            </div>

            <button
              onClick={() => setViewingBranch(null)}
              className="w-full py-2.5 bg-[#000080] hover:bg-[#000066] text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Close Profile
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: AUDIT LOG INSPECTOR */}
      {inspectActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 flex flex-col gap-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={SecurityCheckIcon} className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Security Audit Entry</h3>
              </div>
              <button onClick={() => setInspectActivity(null)} className="text-slate-400 hover:text-slate-600">
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs font-semibold text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">User Role:</span>
                <span className="font-bold">{inspectActivity.userType}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">User Name / Email:</span>
                <span className="font-bold truncate max-w-[200px]">{inspectActivity.userName || inspectActivity.userEmail}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Branch:</span>
                <span>{inspectActivity.branch || "Head Office"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Action:</span>
                <span className="font-bold text-slate-900">{inspectActivity.action}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Device & IP:</span>
                <span>{inspectActivity.device} ({inspectActivity.ipAddress})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Status:</span>
                <span className="text-emerald-600 font-bold">{inspectActivity.status}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Timestamp:</span>
                <span>{formatSriLankaDateTime(inspectActivity.createdAt)}</span>
              </div>
              {inspectActivity.details && (
                <div className="pt-2">
                  <span className="text-slate-400 block mb-1">Details:</span>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] font-mono leading-relaxed">
                    {inspectActivity.details}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setInspectActivity(null)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer mt-2"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
