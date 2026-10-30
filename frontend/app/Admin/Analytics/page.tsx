"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
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
  SquareLock02Icon,
  File01Icon,
  Calendar01Icon,
  Money01Icon,
  Copy01Icon,
  CreditCardIcon,
  UserCheck01Icon
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

interface VehicleRenewalRecord {
  owner: {
    id?: string;
    name: string;
    nic: string;
    mobile?: string;
    email?: string;
    address?: string;
    city?: string;
    branch?: string;
    referenceNumber?: string;
  };
  vehicle: {
    _id?: string;
    numberPlate: string;
    type?: string;
    vehicleType?: string;
    company?: string;
    model?: string;
    year?: string;
    yearOfManufacture?: string;
    policyNumber?: string;
    policyExpiryDate?: string;
    calculatedExpiryDate?: string;
    daysRemaining: number;
    isExpiringWithin1AndHalfMonths?: boolean;
    status?: string;
  };
  renewalQuote?: {
    _id?: string;
    quoteNumber?: string;
    status?: string;
    selectedPlan?: string;
    calculation?: {
      basicPremium?: number;
      netPremium?: number;
      totalRenewalAmount?: number;
      finalAnnualTotal?: number;
      basicPremiumRate?: number;
      marketValuation?: number;
    };
    installments?: Array<{
      installmentNumber?: number;
      amount: number;
      dueDate: string;
      status: string;
      paidAt?: string;
    }>;
    createdAt?: string;
    updatedAt?: string;
  } | null;
  isPaid: boolean;
  latestPaymentDate?: string | null;
}

interface ThirdPartyRecord {
  _id: string;
  requestReference: string;
  policyHolderNic: string;
  policyHolderName?: string;
  policyHolderEmail?: string;
  policyHolderPhone?: string;
  branch: string;
  driverDetails: {
    fullName: string;
    residentialAddress: string;
    phoneNumber: string;
    nicNumber?: string;
    documents?: {
      nicFront?: string;
      nicBack?: string;
      drivingLicenceFront?: string;
      drivingLicenceBack?: string;
    };
  };
  selectedVehicles: Array<{
    numberPlate: string;
    vehicleType?: string;
    model?: string;
    policyNumber?: string;
  }>;
  fee: number;
  currency: string;
  status:
    | "Pending Payment"
    | "Pending Branch Approval"
    | "Approved"
    | "Rejected"
    | "Pending Termination Approval"
    | "Terminated";
  payment: {
    status: "Pending Payment" | "Paid" | "Failed";
    amountPaid?: number;
    currency?: string;
    paidAt?: string;
    stripePaymentIntentId?: string;
  };
  secureAccess?: {
    rawToken?: string;
    accessUrl?: string;
    generatedAt?: string;
    isRevoked?: boolean;
    revokedAt?: string;
    revocationReason?: string;
  };
  branchReview?: {
    reviewedByStaffId?: string;
    reviewedByStaffName?: string;
    reviewedAt?: string;
    notes?: string;
    rejectionReason?: string;
  };
  createdAt: string;
  updatedAt: string;
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

// Time Range Matching Helper for Admin Reports
const matchesAdminDate = (
  dateStr?: string | null,
  range: "all" | "today" | "7days" | "30days" | "90days" | "thisyear" | "custom" = "all",
  start?: string,
  end?: string
) => {
  if (!dateStr || range === "all") return true;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return true;
  const now = new Date();

  if (range === "today") {
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return date >= startOfDay;
  }
  if (range === "7days") {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return date >= d;
  }
  if (range === "30days") {
    const diffDays = Math.abs((now.getTime() - date.getTime()) / (1000 * 3600 * 24));
    return diffDays <= 30;
  }
  if (range === "90days") {
    const diffDays = Math.abs((now.getTime() - date.getTime()) / (1000 * 3600 * 24));
    return diffDays <= 90;
  }
  if (range === "thisyear") {
    return date.getFullYear() === now.getFullYear();
  }
  if (range === "custom" && start && end) {
    const s = new Date(start);
    const e = new Date(end);
    e.setHours(23, 59, 59, 999);
    return date >= s && date <= e;
  }
  return true;
};

export default function AdminAnalyticsReportsPage() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<
    "overview" | "financial" | "branches" | "policyholders" | "renewals" | "thirdparty" | "agents" | "security"
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
  const [claimsList, setClaimsList] = useState<any[]>([]);
  const [renewals, setRenewals] = useState<VehicleRenewalRecord[]>([]);
  const [thirdPartyRequests, setThirdPartyRequests] = useState<ThirdPartyRecord[]>([]);

  // Loading & sync
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [timeRange, setTimeRange] = useState<"all" | "today" | "7days" | "30days" | "90days" | "thisyear" | "custom">("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("All");
  const [selectedProvince, setSelectedProvince] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [renewalStatusFilter, setRenewalStatusFilter] = useState("all");
  const [renewalCategoryFilter, setRenewalCategoryFilter] = useState("all");
  const [tpStatusFilter, setTpStatusFilter] = useState("all");

  // Modals
  const [viewingBranch, setViewingBranch] = useState<BranchMatrixItem | null>(null);
  const [inspectActivity, setInspectActivity] = useState<LoginActivityRecord | null>(null);
  const [selectedTpRecord, setSelectedTpRecord] = useState<ThirdPartyRecord | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);

  // Export Center Filter & Configuration States
  const [exportScope, setExportScope] = useState<"claims" | "branches" | "agents" | "renewals" | "thirdparty" | "summary">("claims");
  const [exportTimeRange, setExportTimeRange] = useState<"all" | "today" | "7days" | "30days" | "90days" | "thisyear" | "custom">("all");
  const [exportCustomStart, setExportCustomStart] = useState("");
  const [exportCustomEnd, setExportCustomEnd] = useState("");
  const [exportBranch, setExportBranch] = useState("All");
  const [exportStatus, setExportStatus] = useState("all");

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
      if (timeRange === "custom" && customStartDate && customEndDate) {
        params.append("startDate", customStartDate);
        params.append("endDate", customEndDate);
      } else if (timeRange && timeRange !== "all") {
        params.append("timeRange", timeRange);
      }
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
      if (Array.isArray(data.claims)) setClaimsList(data.claims);

      // Fetch Renewals Data for National / Branch Fleet Audit
      try {
        const renewalBranch = selectedBranch && selectedBranch !== "All" ? selectedBranch : "All";
        const renewalsRes = await fetch(`${API_URL}/renewals/branch-expiring-vehicles?branch=${encodeURIComponent(renewalBranch)}&all=true`);
        if (renewalsRes.ok) {
          const renewalsData = await renewalsRes.json();
          if (Array.isArray(renewalsData.vehicles)) {
            setRenewals(renewalsData.vehicles);
          }
        }
      } catch (renewalErr) {
        console.error("Error loading renewals data:", renewalErr);
      }

      // Fetch Third-Party Drivers Data for National / Branch Fleet Audit
      try {
        const tpBranch = selectedBranch && selectedBranch !== "All" ? selectedBranch : "All";
        const tpRes = await fetch(`${API_URL}/third-party/admin/all-requests?branch=${encodeURIComponent(tpBranch)}&all=true`);
        if (tpRes.ok) {
          const tpData = await tpRes.json();
          if (Array.isArray(tpData.requests)) {
            setThirdPartyRequests(tpData.requests);
          }
        }
      } catch (tpErr) {
        console.error("Error loading third-party requests:", tpErr);
      }

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
  }, [selectedBranch, selectedProvince, timeRange, customStartDate, customEndDate, searchQuery]);

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

  // Renewal Summary Statistics for Executive Dashboard
  const expiringRenewalsCount = useMemo(() => {
    return renewals.filter((r) => r.vehicle?.daysRemaining >= 0 && r.vehicle?.daysRemaining <= 45).length;
  }, [renewals]);

  const paidRenewalsCount = useMemo(() => {
    return renewals.filter((r) => r.isPaid).length;
  }, [renewals]);

  const pendingRenewalsCount = useMemo(() => {
    return renewals.filter(
      (r) => !r.isPaid && (!r.renewalQuote || r.renewalQuote.status === "Draft" || r.renewalQuote.status === "Pending_Payment")
    ).length;
  }, [renewals]);

  const totalRenewalPremiums = useMemo(() => {
    return renewals.reduce((acc, r) => {
      const quoteAmt = r.renewalQuote?.calculation?.totalRenewalAmount || r.renewalQuote?.calculation?.finalAnnualTotal;
      if (r.isPaid && quoteAmt) {
        return acc + quoteAmt;
      }
      if (r.renewalQuote?.installments) {
        const paidSum = r.renewalQuote.installments
          .filter((i: any) => i.status === "Paid")
          .reduce((sum: number, i: any) => sum + (i.amount || 0), 0);
        if (paidSum > 0) return acc + paidSum;
      }
      return acc;
    }, 0);
  }, [renewals]);

  // Filtered Renewals for Admin View
  const filteredRenewals = useMemo(() => {
    return renewals.filter((r) => {
      // Branch filter
      if (selectedBranch !== "All" && r.owner?.branch && r.owner.branch.toLowerCase().trim() !== selectedBranch.toLowerCase().trim()) {
        return false;
      }

      // Status filter
      if (renewalStatusFilter !== "all") {
        if (renewalStatusFilter === "paid" && !r.isPaid) return false;
        if (renewalStatusFilter === "pending" && (r.isPaid || (r.renewalQuote && r.renewalQuote.status !== "Pending_Payment" && r.renewalQuote.status !== "Draft"))) return false;
        if (renewalStatusFilter === "calculated" && (!r.renewalQuote || r.renewalQuote.status !== "Calculated")) return false;
        if (renewalStatusFilter === "expiring_soon" && !(r.vehicle?.daysRemaining >= 0 && r.vehicle?.daysRemaining <= 45)) return false;
      }

      // Category filter
      if (renewalCategoryFilter !== "all") {
        const vType = (r.vehicle?.type || r.vehicle?.vehicleType || "").toLowerCase();
        if (renewalCategoryFilter === "Car" && !vType.includes("car") && !vType.includes("sedan")) return false;
        if (renewalCategoryFilter === "Van" && !vType.includes("van") && !vType.includes("suv")) return false;
        if (renewalCategoryFilter === "Bike" && !vType.includes("motorcycle") && !vType.includes("bike") && !vType.includes("scooter")) return false;
        if (renewalCategoryFilter === "ThreeWheeler" && !vType.includes("three") && !vType.includes("wheeler") && !vType.includes("tuk")) return false;
      }

      // Time Range Filter
      const targetDate = r.latestPaymentDate || r.vehicle?.calculatedExpiryDate || r.vehicle?.policyExpiryDate;
      if (targetDate && !matchesAdminDate(targetDate, timeRange, customStartDate, customEndDate)) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesPlate = r.vehicle?.numberPlate?.toLowerCase().includes(q);
        const matchesPolicy = r.vehicle?.policyNumber?.toLowerCase().includes(q);
        const matchesModel = `${r.vehicle?.company || ""} ${r.vehicle?.model || ""}`.toLowerCase().includes(q);
        const matchesOwner = r.owner?.name?.toLowerCase().includes(q);
        const matchesNic = r.owner?.nic?.toLowerCase().includes(q);
        const matchesBranch = r.owner?.branch?.toLowerCase().includes(q);
        return matchesPlate || matchesPolicy || matchesModel || matchesOwner || matchesNic || matchesBranch;
      }

      return true;
    }).sort((a, b) => (a.vehicle?.daysRemaining ?? 999) - (b.vehicle?.daysRemaining ?? 999));
  }, [renewals, selectedBranch, renewalStatusFilter, renewalCategoryFilter, timeRange, customStartDate, customEndDate, searchQuery]);

  // Filtered Third-Party Drivers for Admin
  const filteredThirdParty = useMemo(() => {
    return thirdPartyRequests.filter((t) => {
      // Branch filter
      if (selectedBranch !== "All" && t.branch && !t.branch.toLowerCase().includes(selectedBranch.toLowerCase())) {
        return false;
      }

      // Status filter
      if (tpStatusFilter !== "all" && t.status.toLowerCase() !== tpStatusFilter.toLowerCase()) {
        return false;
      }

      // Time range filter
      if (t.createdAt && !matchesAdminDate(t.createdAt, timeRange, customStartDate, customEndDate)) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesRef = t.requestReference?.toLowerCase().includes(q);
        const matchesDriver = t.driverDetails?.fullName?.toLowerCase().includes(q);
        const matchesPhone = t.driverDetails?.phoneNumber?.includes(q);
        const matchesNic = t.driverDetails?.nicNumber?.toLowerCase().includes(q);
        const matchesHolder = t.policyHolderName?.toLowerCase().includes(q);
        const matchesHolderNic = t.policyHolderNic?.toLowerCase().includes(q);
        const matchesBranch = t.branch?.toLowerCase().includes(q);
        const matchesPlate = t.selectedVehicles?.some((v) => v.numberPlate?.toLowerCase().includes(q));
        return matchesRef || matchesDriver || matchesPhone || matchesNic || matchesHolder || matchesHolderNic || matchesBranch || matchesPlate;
      }

      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [thirdPartyRequests, selectedBranch, tpStatusFilter, timeRange, customStartDate, customEndDate, searchQuery]);

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
    csv += `Policies Expiring Within 45 Days,${expiringRenewalsCount}\r\n`;
    csv += `Renewals Paid & Finalized,${paidRenewalsCount}\r\n`;
    csv += `Total Renewal Premiums Collected (LKR),${totalRenewalPremiums}\r\n`;
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

  // Memoized Filtered Dataset for Executive Export Center
  const exportFilteredData = useMemo(() => {
    const range = exportTimeRange;
    const start = exportCustomStart;
    const end = exportCustomEnd;
    const br = exportBranch;
    const st = exportStatus;

    if (exportScope === "claims") {
      const list = claimsList.filter((c) => {
        if (br !== "All" && c.branch && c.branch.toLowerCase().trim() !== br.toLowerCase().trim()) return false;
        if (st !== "all" && c.status?.toLowerCase() !== st.toLowerCase()) return false;
        return matchesAdminDate(c.createdAt, range, start, end);
      });
      const totalAmount = list.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
      return { list, count: list.length, totalAmount };
    } else if (exportScope === "branches") {
      const list = branchMatrix.filter((b) => {
        if (br !== "All" && b.branch.toLowerCase().trim() !== br.toLowerCase().trim()) return false;
        return true;
      });
      const totalClaims = list.reduce((acc, b) => acc + (b.totalClaims || 0), 0);
      const totalPayout = list.reduce((acc, b) => acc + (b.totalPayoutLKR || 0), 0);
      return { list, count: list.length, totalClaims, totalAmount: totalPayout };
    } else if (exportScope === "agents") {
      const list = agentPerformance.filter((a) => {
        if (br !== "All" && a.branch && a.branch.toLowerCase().trim() !== br.toLowerCase().trim()) return false;
        if (st !== "all" && a.availability?.toLowerCase() !== st.toLowerCase()) return false;
        return true;
      });
      const totalLoss = list.reduce((acc, a) => acc + (a.evaluatedLossLKR || 0), 0);
      return { list, count: list.length, totalAmount: totalLoss };
    } else if (exportScope === "renewals") {
      const list = renewals.filter((r) => {
        if (br !== "All" && r.owner?.branch && r.owner.branch.toLowerCase().trim() !== br.toLowerCase().trim()) return false;
        if (st === "paid" && !r.isPaid) return false;
        if (st === "pending" && (r.isPaid || (r.renewalQuote && r.renewalQuote.status !== "Pending_Payment" && r.renewalQuote.status !== "Draft"))) return false;
        if (st === "calculated" && (!r.renewalQuote || r.renewalQuote.status !== "Calculated")) return false;
        if (st === "expiring_soon" && !(r.vehicle?.daysRemaining >= 0 && r.vehicle?.daysRemaining <= 45)) return false;

        const targetDate = r.latestPaymentDate || r.vehicle?.calculatedExpiryDate || r.vehicle?.policyExpiryDate;
        return matchesAdminDate(targetDate, range, start, end);
      });
      const totalAmount = list.reduce((acc, r) => {
        const amt = r.renewalQuote?.calculation?.totalRenewalAmount || r.renewalQuote?.calculation?.finalAnnualTotal || 0;
        return acc + amt;
      }, 0);
      return { list, count: list.length, totalAmount };
    } else if (exportScope === "thirdparty") {
      const list = thirdPartyRequests.filter((t) => {
        if (br !== "All" && t.branch && !t.branch.toLowerCase().includes(br.toLowerCase())) return false;
        if (st !== "all" && t.status.toLowerCase() !== st.toLowerCase()) return false;
        return matchesAdminDate(t.createdAt, range, start, end);
      });
      const totalFees = list.reduce((acc, t) => acc + (t.payment?.status === "Paid" ? (t.fee || 300) : 0), 0);
      return { list, count: list.length, totalAmount: totalFees };
    } else {
      // Summary
      return {
        list: [],
        count: summary.totalClaims,
        totalAmount: summary.totalApprovedPayout
      };
    }
  }, [claimsList, branchMatrix, agentPerformance, renewals, thirdPartyRequests, summary, exportScope, exportTimeRange, exportCustomStart, exportCustomEnd, exportBranch, exportStatus]);

  // Handler to download targeted filtered CSV for Admin
  const handleDownloadFilteredAdminCSV = () => {
    const rangeLabel = exportTimeRange === "custom" && exportCustomStart && exportCustomEnd
      ? `${exportCustomStart}_to_${exportCustomEnd}`
      : exportTimeRange;
    const branchLabel = exportBranch === "All" ? "National_Network" : `${exportBranch}_Branch`;

    if (exportScope === "claims") {
      let csv = "Claim Number,Policyholder Name,NIC,Vehicle Number,Damage Type,Claim Amount (LKR),Status,Branch,Assigned Agent,Bank Name,Date Filed\r\n";
      exportFilteredData.list.forEach((c: any) => {
        csv += `"${c.claimNumber}","${c.policyHolderName || 'Policyholder'}","${c.userNic || '-'}","${c.vehicleNumber || '-'}","${c.damageType || 'Accident'}",${c.amount || 0},"${c.status || 'Pending'}","${c.branch || 'Head Office'}","${c.assignedAgent || 'Unassigned'}","${c.bankName || '-'}","${c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-GB') : '-'}"\r\n`;
      });
      downloadCSV(csv, `Sanasa_Admin_Claims_Audit_${branchLabel}_${rangeLabel}_${Date.now()}.csv`);
    } else if (exportScope === "branches") {
      let csv = "Branch Name,District,Province,Staff Members,Assigned Agents,Active Duty,Policyholders,Claims Total,Approved,Pending,In Progress,Rejected,Payout Sum (LKR),Avg Payout (LKR),Resolution Rate\r\n";
      exportFilteredData.list.forEach((b: any) => {
        csv += `"${b.branch}","${b.district}","${b.province}",${b.staffCount},${b.agentCount},${b.activeAgentCount},${b.policyholdersCount},${b.totalClaims},${b.approvedClaims},${b.pendingClaims},${b.inProgressClaims},${b.rejectedClaims},${b.totalPayoutLKR},${b.avgPayoutLKR},${b.resolutionRate}%\r\n`;
      });
      downloadCSV(csv, `Sanasa_Admin_Branch_Matrix_${branchLabel}_${Date.now()}.csv`);
    } else if (exportScope === "agents") {
      let csv = "Agent ID,Full Name,Email,Phone,Branch,Duty Availability,Account Status,Assigned Cases,Completed Evaluations,Evaluated Loss (LKR)\r\n";
      exportFilteredData.list.forEach((a: any) => {
        csv += `"${a.agentId}","${a.name}","${a.email}","${a.phone}","${a.branch}","${a.availability}","${a.status}",${a.assignedClaimsCount},${a.completedClaimsCount},${a.evaluatedLossLKR}\r\n`;
      });
      downloadCSV(csv, `Sanasa_Admin_Agent_Roster_${branchLabel}_${Date.now()}.csv`);
    } else if (exportScope === "renewals") {
      let csv = "Vehicle Plate,Vehicle Type,Make & Model,Policyholder Name,NIC,Mobile,Branch,Policy Expiry,Days Remaining,Quote Status,Renewal Premium (LKR),Payment Status,Payment Date\r\n";
      exportFilteredData.list.forEach((r: any) => {
        const premium = r.renewalQuote?.calculation?.totalRenewalAmount || r.renewalQuote?.calculation?.finalAnnualTotal || 0;
        const expiry = r.vehicle?.calculatedExpiryDate || r.vehicle?.policyExpiryDate || '-';
        const pDate = r.latestPaymentDate ? new Date(r.latestPaymentDate).toLocaleDateString('en-GB') : '-';
        csv += `"${r.vehicle?.numberPlate || '-'}","${r.vehicle?.type || r.vehicle?.vehicleType || 'Motor'}","${r.vehicle?.company || ''} ${r.vehicle?.model || ''}","${r.owner?.name || '-'}","${r.owner?.nic || '-'}","${r.owner?.mobile || '-'}","${r.owner?.branch || 'Head Office'}","${expiry}",${r.vehicle?.daysRemaining ?? '-'},"${r.renewalQuote?.status || 'Pending'}","${premium}","${r.isPaid ? 'Paid' : 'Pending'}","${pDate}"\r\n`;
      });
      downloadCSV(csv, `Sanasa_Admin_Renewals_Audit_${branchLabel}_${rangeLabel}_${Date.now()}.csv`);
    } else if (exportScope === "thirdparty") {
      let csv = "Reference ID,Driver Name,Driver NIC,Driver Phone,Driver Address,Policyholder Name,Policyholder NIC,Branch,Authorized Plates,Pass Fee (LKR),Payment Status,Authorization Status,Pass URL,Created Date\r\n";
      exportFilteredData.list.forEach((t: any) => {
        const plates = (t.selectedVehicles || []).map((v: any) => v.numberPlate).join("; ");
        csv += `"${t.requestReference || "-"}","${t.driverDetails?.fullName || "-"}","${t.driverDetails?.nicNumber || "-"}","${t.driverDetails?.phoneNumber || "-"}","${t.driverDetails?.residentialAddress ? t.driverDetails.residentialAddress.replace(/"/g, '""') : "-"}","${t.policyHolderName || "-"}","${t.policyHolderNic || "-"}","${t.branch || "-"}","${plates || "-"}","${t.fee || 300}","${t.payment?.status || "Pending Payment"}","${t.status || "Pending Branch Approval"}","${t.secureAccess?.accessUrl || "-"}","${t.createdAt ? new Date(t.createdAt).toLocaleDateString("en-GB") : "-"}"\r\n`;
      });
      downloadCSV(csv, `Sanasa_Admin_ThirdParty_Audit_${branchLabel}_${rangeLabel}_${Date.now()}.csv`);
    } else {
      handleExportExecutiveSummary();
    }
  };

  const handleExportThirdPartyCSV = () => {
    let csv = "Reference ID,Driver Name,Driver NIC,Driver Phone,Driver Address,Policyholder Name,Policyholder NIC,Branch,Authorized Plates,Pass Fee (LKR),Payment Status,Authorization Status,Pass URL,Created Date\r\n";
    filteredThirdParty.forEach((t) => {
      const plates = (t.selectedVehicles || []).map((v) => v.numberPlate).join("; ");
      csv += `"${t.requestReference || "-"}","${t.driverDetails?.fullName || "-"}","${t.driverDetails?.nicNumber || "-"}","${t.driverDetails?.phoneNumber || "-"}","${t.driverDetails?.residentialAddress ? t.driverDetails.residentialAddress.replace(/"/g, '""') : "-"}","${t.policyHolderName || "-"}","${t.policyHolderNic || "-"}","${t.branch || "-"}","${plates || "-"}","${t.fee || 300}","${t.payment?.status || "Pending Payment"}","${t.status || "Pending Branch Approval"}","${t.secureAccess?.accessUrl || "-"}","${t.createdAt ? new Date(t.createdAt).toLocaleDateString("en-GB") : "-"}"\r\n`;
    });
    downloadCSV(csv, `Sanasa_Admin_ThirdParty_Drivers_${selectedBranch}_${new Date().toISOString().split("T")[0]}.csv`);
  };

  const handleDownloadSingleThirdPartyReport = (t: ThirdPartyRecord) => {
    const reportDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    const reportTime = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const docTitle = `Sanasa_Admin_ThirdParty_${t.requestReference || "TPR"}`;
    const contentHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${t.requestReference} - Executive Third-Party Driver Audit</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 40px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #102A43; padding-bottom: 20px; margin-bottom: 24px; }
          .company { font-size: 22px; font-weight: 800; color: #102A43; text-transform: uppercase; }
          .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; font-weight: 500; }
          .meta { text-align: right; font-size: 12px; color: #64748b; line-height: 1.5; }
          .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; color: #102A43; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-top: 24px; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; }
          td { padding: 10px 12px; border: 1px solid #e2e8f0; color: #334155; }
          .label { font-weight: 600; color: #475569; width: 35%; background: #f8fafc; }
          .val { font-weight: 500; color: #0f172a; }
          .highlight { font-weight: 700; color: #0f172a; font-family: monospace; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; }
          .signature-box { margin-top: 40px; display: flex; justify-content: space-between; }
          .signature-line { width: 180px; border-top: 1px dashed #94a3b8; text-align: center; padding-top: 6px; font-size: 11px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company">Sanasa General Insurance Co. LTD</div>
            <div class="subtitle">Executive Headquarters • Third-Party Driver Authorization Audit</div>
          </div>
          <div class="meta">
            <div><strong>Reference ID:</strong> ${t.requestReference}</div>
            <div><strong>Branch:</strong> ${t.branch || "Galle"} Branch</div>
            <div><strong>Status:</strong> ${t.status}</div>
            <div><strong>Date Generated:</strong> ${reportDate} ${reportTime}</div>
          </div>
        </div>

        <div class="section-title">1. Authorized Driver Identification</div>
        <table>
          <tr><td class="label">Full Name</td><td class="val"><strong>${t.driverDetails?.fullName || "-"}</strong></td></tr>
          <tr><td class="label">NIC Number</td><td class="val highlight">${t.driverDetails?.nicNumber || "Not Provided"}</td></tr>
          <tr><td class="label">Contact Phone</td><td class="val highlight">${t.driverDetails?.phoneNumber || "-"}</td></tr>
          <tr><td class="label">Residential Address</td><td class="val">${t.driverDetails?.residentialAddress || "-"}</td></tr>
          <tr><td class="label">Authorization Status</td><td class="val"><strong>${t.status}</strong></td></tr>
        </table>

        <div class="section-title">2. Policyholder Information (Vehicle Owner)</div>
        <table>
          <tr><td class="label">Owner Name</td><td class="val"><strong>${t.policyHolderName || "Policyholder"}</strong></td></tr>
          <tr><td class="label">Owner NIC</td><td class="val highlight">${t.policyHolderNic || "-"}</td></tr>
          <tr><td class="label">Jurisdiction Branch</td><td class="val">${t.branch || "Galle"} Branch</td></tr>
        </table>

        <div class="section-title">3. Authorized Vehicle Plates</div>
        <table>
          <thead>
            <tr style="background:#f8fafc;">
              <td style="font-weight:700;">Plate Number</td>
              <td style="font-weight:700;">Model / Classification</td>
              <td style="font-weight:700;">Policy Reference</td>
            </tr>
          </thead>
          <tbody>
            ${(t.selectedVehicles || []).map((v: any) => `
              <tr>
                <td class="highlight">${v.numberPlate}</td>
                <td>${v.model || v.vehicleType || "Authorized Vehicle"}</td>
                <td>${v.policyNumber || "SAN-POL"}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <div class="section-title">4. Fee & Digital NFC Pass Verification</div>
        <table>
          <tr><td class="label">Authorization Fee</td><td class="val highlight">LKR ${t.fee || 300}</td></tr>
          <tr><td class="label">Payment Status</td><td class="val"><strong>${t.payment?.status || "Pending Payment"}</strong></td></tr>
          <tr><td class="label">Digital NFC Pass URL</td><td class="val highlight">${t.secureAccess?.accessUrl || "Pending Approval"}</td></tr>
        </table>

        <div class="signature-box">
          <div class="signature-line">Head of Insurance Operations</div>
          <div class="signature-line">Executive Compliance Auditor</div>
          <div class="signature-line">Official Sanasa Executive Seal</div>
        </div>

        <div class="footer">
          <div>Confidential • Sanasa General Insurance Company Limited • Head Office Executive Copy</div>
          <div>Official Digital Audit Dossier</div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([contentHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${docTitle}_${new Date().toISOString().split("T")[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(contentHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  // Handler to print official executive dossier for Admin
  const handlePrintFilteredAdminDossier = () => {
    const reportDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    const reportTime = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const rangeText = exportTimeRange === "custom" && exportCustomStart && exportCustomEnd
      ? `Custom Window: ${exportCustomStart} to ${exportCustomEnd}`
      : `Preset Window: ${exportTimeRange.replace("_", " ").toUpperCase()}`;
    const branchText = exportBranch === "All" ? "All Regional Branches (National Network)" : `${exportBranch} Regional Branch`;

    let rowsHtml = "";
    if (exportScope === "claims") {
      rowsHtml = `
        <thead>
          <tr>
            <th>Claim No</th>
            <th>Policyholder</th>
            <th>Vehicle No</th>
            <th>Damage Type</th>
            <th>Amount (LKR)</th>
            <th>Status</th>
            <th>Branch</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${exportFilteredData.list.map((c: any) => `
            <tr>
              <td style="font-family: monospace; font-weight: bold;">${c.claimNumber}</td>
              <td>${c.policyHolderName || "Client"}<br/><small style="color: #64748b;">${c.userNic || "-"}</small></td>
              <td style="font-family: monospace;">${c.vehicleNumber || "-"}</td>
              <td>${c.damageType || "Accident"}</td>
              <td style="font-weight: 700; text-align: right;">${formatLKR(c.amount || 0)}</td>
              <td><span class="badge badge-${c.status?.toLowerCase().replace(" ", "") || "pending"}">${c.status || "Pending"}</span></td>
              <td>${c.branch || "Head Office"}</td>
              <td>${c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-GB") : "-"}</td>
            </tr>
          `).join("")}
        </tbody>
      `;
    } else if (exportScope === "branches") {
      rowsHtml = `
        <thead>
          <tr>
            <th>Branch Name</th>
            <th>Province & District</th>
            <th>Total Claims</th>
            <th>Approved</th>
            <th>Pending</th>
            <th>Total Payout (LKR)</th>
            <th>Resolution Rate</th>
          </tr>
        </thead>
        <tbody>
          ${exportFilteredData.list.map((b: any) => `
            <tr>
              <td style="font-weight: bold;">${b.branch} Branch</td>
              <td>${b.province}<br/><small style="color: #64748b;">${b.district} District</small></td>
              <td style="font-weight: bold; text-align: center;">${b.totalClaims}</td>
              <td style="color: #15803d; font-weight: bold; text-align: center;">${b.approvedClaims}</td>
              <td style="color: #b45309; text-align: center;">${b.pendingClaims}</td>
              <td style="font-weight: 700; text-align: right;">${formatLKR(b.totalPayoutLKR)}</td>
              <td style="font-weight: 800; text-align: center;">${b.resolutionRate}%</td>
            </tr>
          `).join("")}
        </tbody>
      `;
    } else if (exportScope === "agents") {
      rowsHtml = `
        <thead>
          <tr>
            <th>Agent ID</th>
            <th>Name</th>
            <th>Branch</th>
            <th>Duty Availability</th>
            <th>Assigned Claims</th>
            <th>Completed</th>
            <th>Evaluated Loss (LKR)</th>
          </tr>
        </thead>
        <tbody>
          ${exportFilteredData.list.map((a: any) => `
            <tr>
              <td style="font-family: monospace; font-weight: bold;">${a.agentId}</td>
              <td>${a.name}<br/><small style="color: #64748b;">${a.email}</small></td>
              <td>${a.branch} Branch</td>
              <td><span class="badge ${a.availability === 'Active' ? 'badge-approved' : 'badge-pending'}">${a.availability}</span></td>
              <td style="text-align: center; font-weight: bold;">${a.assignedClaimsCount}</td>
              <td style="text-align: center; color: #15803d; font-weight: bold;">${a.completedClaimsCount}</td>
              <td style="font-weight: 700; text-align: right;">${formatLKR(a.evaluatedLossLKR)}</td>
            </tr>
          `).join("")}
        </tbody>
      `;
    } else if (exportScope === "renewals") {
      rowsHtml = `
        <thead>
          <tr>
            <th>Vehicle No</th>
            <th>Type</th>
            <th>Policyholder</th>
            <th>Branch</th>
            <th>Expiry Date</th>
            <th>Days Left</th>
            <th>Quote Status</th>
            <th>Premium (LKR)</th>
            <th>Payment Status</th>
          </tr>
        </thead>
        <tbody>
          ${exportFilteredData.list.map((r: any) => {
            const premium = r.renewalQuote?.calculation?.totalRenewalAmount || r.renewalQuote?.calculation?.finalAnnualTotal || 0;
            const expiry = r.vehicle?.calculatedExpiryDate || r.vehicle?.policyExpiryDate ? new Date(r.vehicle?.calculatedExpiryDate || r.vehicle?.policyExpiryDate).toLocaleDateString('en-GB') : '-';
            return `
              <tr>
                <td style="font-family: monospace; font-weight: bold;">${r.vehicle?.numberPlate || '-'}</td>
                <td>${r.vehicle?.type || r.vehicle?.vehicleType || 'Motor'}<br/><small style="color: #64748b;">${r.vehicle?.company || ''} ${r.vehicle?.model || ''}</small></td>
                <td>${r.owner?.name || 'Policyholder'}<br/><small style="color: #64748b;">${r.owner?.nic || '-'}</small></td>
                <td>${r.owner?.branch || 'Head Office'}</td>
                <td>${expiry}</td>
                <td style="font-weight: bold; text-align: center;">${r.vehicle?.daysRemaining ?? '-'} d</td>
                <td>${r.renewalQuote?.status || 'Pending'}</td>
                <td style="font-weight: 700; text-align: right;">${formatLKR(premium)}</td>
                <td><span class="badge ${r.isPaid ? 'badge-approved' : 'badge-pending'}">${r.isPaid ? 'Paid' : 'Pending'}</span></td>
              </tr>
            `;
          }).join("")}
        </tbody>
      `;
    } else if (exportScope === "thirdparty") {
      rowsHtml = `
        <thead>
          <tr>
            <th>Reference ID</th>
            <th>Driver Name</th>
            <th>Driver NIC & Phone</th>
            <th>Policyholder</th>
            <th>Branch</th>
            <th>Fee & Payment</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${exportFilteredData.list.map((t: any) => `
            <tr>
              <td style="font-family: monospace; font-weight: bold;">${t.requestReference || "-"}</td>
              <td>${t.driverDetails?.fullName || "-"}<br/><small style="color: #64748b;">${t.driverDetails?.residentialAddress || "-"}</small></td>
              <td>${t.driverDetails?.nicNumber || "-"}<br/><small style="color: #64748b;">${t.driverDetails?.phoneNumber || "-"}</small></td>
              <td>${t.policyHolderName || "-"}<br/><small style="color: #64748b;">${t.policyHolderNic || "-"}</small></td>
              <td>${t.branch || "Galle"} Branch</td>
              <td style="font-weight: 700;">LKR ${t.fee || 300} (${t.payment?.status || "Pending"})</td>
              <td><span class="badge ${t.status === 'Approved' ? 'badge-approved' : 'badge-pending'}">${t.status}</span></td>
              <td>${t.createdAt ? new Date(t.createdAt).toLocaleDateString("en-GB") : "-"}</td>
            </tr>
          `).join("")}
        </tbody>
      `;
    } else {
      rowsHtml = `
        <thead>
          <tr>
            <th>Executive KPI Metric</th>
            <th>System Value / Metric Measurement</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Total Registered Claims</td><td style="font-weight: bold; font-family: monospace;">${summary.totalClaims}</td></tr>
          <tr><td>Approved & Cleared Claims</td><td style="font-weight: bold; color: #15803d; font-family: monospace;">${summary.approvedClaims}</td></tr>
          <tr><td>Pending Investigation</td><td style="font-weight: bold; color: #b45309; font-family: monospace;">${summary.pendingClaims}</td></tr>
          <tr><td>In Progress (Field Inspected)</td><td style="font-weight: bold; color: #1d4ed8; font-family: monospace;">${summary.inProgressClaims}</td></tr>
          <tr><td>Claims Resolution Rate</td><td style="font-weight: 800; color: #15803d; font-family: monospace;">${summary.approvalRate}%</td></tr>
          <tr><td>Total Approved Payouts (LKR)</td><td style="font-weight: 800; color: #15803d; font-family: monospace;">${formatLKR(summary.totalApprovedPayout)}</td></tr>
          <tr><td>Total Estimated Loss Exposure (LKR)</td><td style="font-weight: 800; font-family: monospace;">${formatLKR(summary.totalEstimatedLoss)}</td></tr>
          <tr><td>Total Insured Policyholders</td><td style="font-weight: bold; font-family: monospace;">${summary.totalPolicyholders}</td></tr>
          <tr><td>Total Registered Vehicles</td><td style="font-weight: bold; font-family: monospace;">${summary.totalVehicles}</td></tr>
          <tr><td>Field Inspection Force</td><td style="font-weight: bold; font-family: monospace;">${summary.totalAgents} Agents (${summary.activeAgents} Online)</td></tr>
          <tr><td>Regional Branch Network</td><td style="font-weight: bold; font-family: monospace;">${summary.totalBranches} Branches (${summary.totalStaffMembers} Staff)</td></tr>
        </tbody>
      `;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Sanasa General Insurance - Executive ${exportScope.toUpperCase()} Audit Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 36px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000080; padding-bottom: 18px; margin-bottom: 20px; }
          .company { font-size: 22px; font-weight: 900; color: #000080; text-transform: uppercase; letter-spacing: 0.5px; }
          .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; font-weight: 600; }
          .meta { text-align: right; font-size: 11px; color: #64748b; line-height: 1.5; }
          .filter-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; font-size: 11px; }
          .filter-card .item-label { color: #64748b; text-transform: uppercase; font-weight: 700; font-size: 10px; margin-bottom: 3px; }
          .filter-card .item-val { font-weight: 800; color: #0f172a; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 24px; }
          th { text-align: left; padding: 9px 12px; background: #f1f5f9; color: #334155; font-weight: 700; font-size: 10px; text-transform: uppercase; border: 1px solid #cbd5e1; }
          td { padding: 9px 12px; border: 1px solid #e2e8f0; color: #1e293b; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
          .badge-approved { background: #dcfce7; color: #15803d; }
          .badge-pending { background: #fef3c7; color: #b45309; }
          .badge-rejected { background: #fee2e2; color: #b91c1c; }
          .badge-inprogress { background: #dbeafe; color: #1d4ed8; }
          .footer-signs { margin-top: 44px; padding-top: 20px; border-top: 1px solid #cbd5e1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; font-size: 11px; color: #64748b; }
          .sign-col { text-align: center; }
          .sign-line { border-top: 1px dashed #94a3b8; margin-top: 48px; padding-top: 6px; font-weight: 600; }
          @media print {
            body { padding: 16px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company">Sanasa General Insurance Company PLC</div>
            <div class="subtitle">Head Office Executive Administration &bull; Official System Audit Dossier</div>
          </div>
          <div class="meta">
            <div><strong>Dossier ID:</strong> SAN-EXEC-${Date.now().toString().slice(-6)}</div>
            <div><strong>Generated:</strong> ${reportDate} &bull; ${reportTime}</div>
            <div><strong>Auditor:</strong> Head Office System Administrator</div>
          </div>
        </div>

        <div class="filter-card">
          <div>
            <div class="item-label">Executive Scope</div>
            <div class="item-val">${exportScope.toUpperCase()}</div>
          </div>
          <div>
            <div class="item-label">Branch Jurisdiction</div>
            <div class="item-val">${branchText}</div>
          </div>
          <div>
            <div class="item-label">Applied Date Range</div>
            <div class="item-val">${rangeText}</div>
          </div>
          <div>
            <div class="item-label">Target Dataset Volume</div>
            <div class="item-val">${exportFilteredData.count} (${exportFilteredData.totalAmount ? formatLKR(exportFilteredData.totalAmount) : "Audited Records"})</div>
          </div>
        </div>

        <table>
          ${rowsHtml}
        </table>

        <div class="footer-signs">
          <div class="sign-col">
            <div class="sign-line">Chief Actuary & Financial Controller</div>
            <div>Sanasa General Insurance</div>
          </div>
          <div class="sign-col">
            <div class="sign-line">Head of National Claims & Operations</div>
            <div>Sanasa General Insurance</div>
          </div>
          <div class="sign-col">
            <div class="sign-line">Managing Director / CEO Sign-off</div>
            <div>Corporate Seal Affixed</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    const printWin = window.open("", "_blank");
    if (printWin) {
      printWin.document.open();
      printWin.document.write(htmlContent);
      printWin.document.close();
    }
    setShowExportModal(false);
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
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col gap-4 select-none">
              {/* Upper Line: Search Bar on Left, Action Controls on Right */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Search Bar */}
                <div className="relative w-full sm:w-80 md:w-96">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <HugeiconsIcon icon={Search01Icon} className="w-4 h-4 text-slate-400" strokeWidth={2.5} />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search analytics by branch, agent, keyword..."
                    className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-transparent transition-all shadow-2xs bg-slate-50/50 font-medium"
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
                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="flex-1 sm:flex-none py-2 px-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 active:scale-95 text-slate-700 rounded-xl text-xs font-bold shadow-2xs transition-all outline-none cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <HugeiconsIcon icon={Download01Icon} className="w-4 h-4 text-slate-600" strokeWidth={2.5} />
                    <span>Export Center</span>
                  </button>

                  <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50/90 border border-emerald-200/80 rounded-xl text-[11px] font-bold text-emerald-700 select-none shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Live Sync</span>
                  </div>

                  <button
                    onClick={() => fetchAnalytics(true)}
                    disabled={refreshing || loading}
                    title="Manual Refresh"
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all active:scale-95 cursor-pointer disabled:opacity-50 border-none"
                  >
                    <HugeiconsIcon icon={RefreshIcon} className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              {/* Lower Line: Time Range Filter Pills (Zero Horizontal Scrollbar) */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <HugeiconsIcon icon={Clock01Icon} className="w-3.5 h-3.5 text-slate-400" />
                  <span>Time Scope:</span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/60">
                  {[
                    { id: "all", label: "All Time" },
                    { id: "today", label: "Today" },
                    { id: "7days", label: "Last 7 Days" },
                    { id: "30days", label: "Last 30 Days" },
                    { id: "90days", label: "Last Quarter" },
                    { id: "thisyear", label: "This Year" },
                    { id: "custom", label: "Custom Range..." }
                  ].map((t) => {
                    const isSel = timeRange === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTimeRange(t.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-none outline-none whitespace-nowrap ${
                          isSel ? "bg-[#000080] text-white shadow-xs" : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
                        }`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Custom Date Range Controls if active */}
            {timeRange === "custom" && (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs shadow-xs animate-in fade-in duration-150 select-none">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <HugeiconsIcon icon={Clock01Icon} className="w-4 h-4 text-blue-600" />
                    <span>Custom System Audit Window:</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-slate-500 font-medium">Start Date:</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-slate-500 font-medium">End Date:</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {(customStartDate || customEndDate) && (
                    <button
                      onClick={() => {
                        setCustomStartDate("");
                        setCustomEndDate("");
                      }}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all font-semibold cursor-pointer border-none"
                    >
                      Clear Range
                    </button>
                  )}
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
                    Active Custom Audit Scope
                  </span>
                </div>
              </div>
            )}

            {/* Segmented Reports Control Tabs Grid (Zero Truncation & Zero Overflow) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col gap-4 select-none">
              <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/60 w-full">
                {[
                  { id: "overview", label: "Executive Overview", icon: Analytics01Icon },
                  { id: "financial", label: "Claims & Payouts", icon: Shield01Icon },
                  { id: "branches", label: "Regional Branches", icon: Building01Icon },
                  { id: "policyholders", label: "Policyholders & Fleet", icon: Car01Icon },
                  { id: "renewals", label: "Policy Renewals", icon: RefreshIcon },
                  { id: "thirdparty", label: "Third-Party Drivers", icon: UserGroupIcon },
                  { id: "agents", label: "Field Agents", icon: Briefcase01Icon },
                  { id: "security", label: "Security & Audits", icon: SecurityCheckIcon }
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex-1 min-w-[145px] sm:min-w-[155px] flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-none outline-none whitespace-nowrap ${
                        isActive
                          ? "bg-[#000080] text-white shadow-md shadow-blue-900/20"
                          : "bg-white/80 hover:bg-white text-slate-600 hover:text-slate-900 shadow-2xs hover:shadow-xs"
                      }`}
                    >
                      <HugeiconsIcon icon={tab.icon} className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-500"}`} strokeWidth={2.5} />
                      <span>{tab.label}</span>
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

                    {/* Policy Renewals & Portfolio Conversion Matrix Banner */}
                    <div className="bg-gradient-to-br from-white to-blue-50/40 p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#000080] flex items-center justify-center">
                            <HugeiconsIcon icon={RefreshIcon} className="w-5 h-5" strokeWidth={2.5} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900">Policy Renewal & Portfolio Conversion Summary</h3>
                            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                              National renewal pipeline across all 26 branches, expiring fleet policies & premium collections
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setActiveTab("renewals")}
                            className="px-3.5 py-1.5 bg-[#000080] text-white text-xs font-bold rounded-xl hover:bg-[#102A43] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                          >
                            <span>Inspect Renewals Report</span>
                            <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5" />
                          </button>
                          <Link
                            href="/Admin/Renewals"
                            className="px-3.5 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 no-underline"
                          >
                            <span>Open Renewals Page</span>
                          </Link>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-semibold">
                        <div className="p-4 bg-white rounded-xl border border-amber-200/80 shadow-2xs flex flex-col justify-between">
                          <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">Expiring in 45 Days</span>
                          <div className="text-2xl font-black text-amber-600 mt-2">{expiringRenewalsCount} Vehicles</div>
                          <span className="text-[10px] text-slate-400 font-semibold mt-1">Requires renewal quotation</span>
                        </div>

                        <div className="p-4 bg-white rounded-xl border border-emerald-200/80 shadow-2xs flex flex-col justify-between">
                          <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Renewals Paid & Finalized</span>
                          <div className="text-2xl font-black text-emerald-600 mt-2">{paidRenewalsCount} Completed</div>
                          <span className="text-[10px] text-slate-400 font-semibold mt-1">Policies extended for next year</span>
                        </div>

                        <div className="p-4 bg-white rounded-xl border border-blue-200/80 shadow-2xs flex flex-col justify-between">
                          <span className="text-[10px] uppercase font-bold text-[#000080] tracking-wider">Renewal Premiums Collected</span>
                          <div className="text-xl font-black text-[#000080] mt-2 truncate" title={formatLKR(totalRenewalPremiums)}>
                            {formatLKR(totalRenewalPremiums)}
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold mt-1">Active collected renewal revenue</span>
                        </div>

                        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Pending Quotes & Action</span>
                          <div className="text-2xl font-black text-slate-800 mt-2">{pendingRenewalsCount} Pending</div>
                          <span className="text-[10px] text-slate-400 font-semibold mt-1">Awaiting staff quotation</span>
                        </div>
                      </div>
                    </div>

                    {/* Third-Party Drivers & NFC Access Passes Summary Banner */}
                    <div className="bg-gradient-to-br from-white to-indigo-50/40 p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                            <HugeiconsIcon icon={UserCheck01Icon} className="w-5 h-5" strokeWidth={2.5} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900">Third-Party Driver Access & NFC Authorizations (Nationwide)</h3>
                            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                              Authorized secondary drivers, digital pass issuance, and KYC document verifications across all regional branches
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setActiveTab("thirdparty")}
                            className="px-3.5 py-1.5 bg-[#000080] text-white text-xs font-bold rounded-xl hover:bg-[#102A43] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 border-none"
                          >
                            <span>Inspect Third-Party Report</span>
                            <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5" />
                          </button>
                          <Link
                            href="/Admin/PolicyHolders"
                            className="px-3.5 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 no-underline"
                          >
                            <span>Open Policyholders</span>
                          </Link>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-semibold">
                        <div className="p-4 bg-white rounded-xl border border-blue-200/80 shadow-2xs flex flex-col justify-between">
                          <span className="text-[10px] uppercase font-bold text-blue-700 tracking-wider">Total Registrations</span>
                          <div className="text-2xl font-black text-[#102A43] mt-2">{thirdPartyRequests.length} Drivers</div>
                          <span className="text-[10px] text-slate-400 font-semibold mt-1">Across all branches</span>
                        </div>

                        <div className="p-4 bg-white rounded-xl border border-emerald-200/80 shadow-2xs flex flex-col justify-between">
                          <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Active Digital Passes</span>
                          <div className="text-2xl font-black text-emerald-600 mt-2">
                            {thirdPartyRequests.filter((t) => t.status === "Approved").length} Active
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold mt-1">Approved & issued passes</span>
                        </div>

                        <div className="p-4 bg-white rounded-xl border border-amber-200/80 shadow-2xs flex flex-col justify-between">
                          <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">Pending Branch Review</span>
                          <div className="text-2xl font-black text-amber-600 mt-2">
                            {thirdPartyRequests.filter((t) => t.status === "Pending Branch Approval").length} Pending
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold mt-1">Awaiting staff confirmation</span>
                        </div>

                        <div className="p-4 bg-white rounded-xl border border-indigo-200/80 shadow-2xs flex flex-col justify-between">
                          <span className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider">Driver Fees Collected</span>
                          <div className="text-xl font-black text-indigo-700 mt-2 truncate">
                            {formatLKR(thirdPartyRequests.reduce((acc, t) => acc + (t.payment?.status === "Paid" ? (t.fee || 300) : 0), 0))}
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold mt-1">LKR 300 driver pass revenue</span>
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

                {/* TAB 5: POLICY RENEWALS & FLEET AUDIT */}
                {activeTab === "renewals" && (
                  <div className="flex flex-col gap-6">
                    {/* Header Banner */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-blue-100 text-[#000080] flex items-center justify-center shadow-xs">
                          <HugeiconsIcon icon={RefreshIcon} className="w-6 h-6" strokeWidth={2.5} />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900">Policy Renewals & Portfolio Audit</h3>
                          <p className="text-xs text-slate-500 font-medium">
                            National vehicle policy renewal pipeline across all 26 regional branches, quotation statuses & premium collections
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => {
                            setExportScope("renewals");
                            setShowExportModal(true);
                          }}
                          className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                        >
                          <HugeiconsIcon icon={Download01Icon} className="w-4 h-4 text-slate-600" />
                          <span>Export Renewal Report</span>
                        </button>
                        <Link
                          href="/Admin/Renewals"
                          className="px-4 py-2 bg-[#000080] hover:bg-[#102A43] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 no-underline"
                        >
                          <span>Go to Live Renewals Page</span>
                          <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4 text-white" />
                        </Link>
                      </div>
                    </div>

                    {/* 4 Summary KPI Tiles */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 select-none">
                      <div className="bg-white p-5 rounded-2xl border-l-[6px] border-l-amber-500 border border-slate-200 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expiring in 45 Days</span>
                          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                            <HugeiconsIcon icon={Alert02Icon} className="w-4 h-4" />
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="text-2xl font-black text-amber-600">{expiringRenewalsCount} Vehicles</div>
                          <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">Policies approaching maturity</span>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border-l-[6px] border-l-emerald-500 border border-slate-200 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Renewals Paid</span>
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4" />
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="text-2xl font-black text-emerald-600">{paidRenewalsCount} Finalized</div>
                          <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">Policy coverage successfully renewed</span>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border-l-[6px] border-l-blue-600 border border-slate-200 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Collected Revenue</span>
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#000080] flex items-center justify-center">
                            <HugeiconsIcon icon={Money01Icon} className="w-4 h-4" />
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="text-xl font-black text-[#000080] truncate" title={formatLKR(totalRenewalPremiums)}>
                            {formatLKR(totalRenewalPremiums)}
                          </div>
                          <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">Total collected renewal premiums</span>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border-l-[6px] border-l-slate-400 border border-slate-200 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Quotes</span>
                          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                            <HugeiconsIcon icon={Clock01Icon} className="w-4 h-4" />
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="text-2xl font-black text-slate-800">{pendingRenewalsCount} Cases</div>
                          <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">Awaiting calculation or payment</span>
                        </div>
                      </div>
                    </div>

                    {/* Sub-Filters: Status & Category */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs font-semibold select-none">
                      {/* Status Pills */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-slate-400 font-bold uppercase text-[10px] mr-1">Status:</span>
                        {[
                          { id: "all", label: "All Policies" },
                          { id: "expiring_soon", label: "Expiring Soon (<45d)" },
                          { id: "paid", label: "Paid & Renewed" },
                          { id: "pending", label: "Pending Payment" },
                          { id: "calculated", label: "Calculated Quotes" }
                        ].map((st) => (
                          <button
                            key={st.id}
                            onClick={() => setRenewalStatusFilter(st.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                              renewalStatusFilter === st.id
                                ? "bg-[#000080] text-white border-[#000080] shadow-xs"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>

                      {/* Vehicle Category Pills */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-slate-400 font-bold uppercase text-[10px] mr-1">Vehicle:</span>
                        {[
                          { id: "all", label: "All Fleet" },
                          { id: "Car", label: "Cars" },
                          { id: "Van", label: "Vans / SUVs" },
                          { id: "Bike", label: "Bikes" },
                          { id: "ThreeWheeler", label: "Three Wheelers" }
                        ].map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => setRenewalCategoryFilter(cat.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                              renewalCategoryFilter === cat.id
                                ? "bg-slate-800 text-white border-slate-800 shadow-xs"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>

                      <div className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                        {filteredRenewals.length} Matching Renewal Records
                      </div>
                    </div>

                    {/* Table View of Renewals */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                              <th className="py-3.5 px-4">Vehicle Details</th>
                              <th className="py-3.5 px-4">Policyholder</th>
                              <th className="py-3.5 px-4">Branch</th>
                              <th className="py-3.5 px-4">Expiry Date</th>
                              <th className="py-3.5 px-4 text-center">Maturity Window</th>
                              <th className="py-3.5 px-4 text-right">Renewal Quote</th>
                              <th className="py-3.5 px-4 text-center">Payment Status</th>
                              <th className="py-3.5 px-4 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                            {filteredRenewals.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="py-12 text-center text-slate-400">
                                  <HugeiconsIcon icon={RefreshIcon} className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                  <p className="font-bold text-slate-600">No renewal records match the selected filters</p>
                                  <p className="text-[11px] text-slate-400 mt-1">Try resetting the branch or status filters</p>
                                </td>
                              </tr>
                            ) : (
                              filteredRenewals.map((r, idx) => {
                                const days = r.vehicle?.daysRemaining ?? 0;
                                const isExpired = days < 0;
                                const isUrgent = days >= 0 && days <= 15;
                                const isApproaching = days > 15 && days <= 45;
                                const quoteAmount = r.renewalQuote?.calculation?.totalRenewalAmount || r.renewalQuote?.calculation?.finalAnnualTotal || 0;
                                const expiryDateStr = r.vehicle?.calculatedExpiryDate || r.vehicle?.policyExpiryDate;

                                return (
                                  <tr key={`${r.vehicle?.numberPlate}-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                                    {/* Vehicle Plate & Model */}
                                    <td className="py-3.5 px-4">
                                      <div className="font-mono font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                        <HugeiconsIcon icon={Car01Icon} className="w-3.5 h-3.5 text-slate-400" />
                                        <span>{r.vehicle?.numberPlate || "-"}</span>
                                      </div>
                                      <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                                        {r.vehicle?.company || ""} {r.vehicle?.model || ""} &bull; {r.vehicle?.type || r.vehicle?.vehicleType || "Motor"}
                                      </span>
                                    </td>

                                    {/* Policyholder */}
                                    <td className="py-3.5 px-4">
                                      <div className="font-bold text-slate-900">{r.owner?.name || "Client"}</div>
                                      <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                                        NIC: {r.owner?.nic || "-"} {r.owner?.mobile ? `• ${r.owner.mobile}` : ""}
                                      </span>
                                    </td>

                                    {/* Branch */}
                                    <td className="py-3.5 px-4">
                                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                        {r.owner?.branch || "Head Office"}
                                      </span>
                                    </td>

                                    {/* Expiry Date */}
                                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                                      {expiryDateStr ? formatSriLankaDate(expiryDateStr) : "-"}
                                    </td>

                                    {/* Maturity Window Badge */}
                                    <td className="py-3.5 px-4 text-center">
                                      <span
                                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1 border ${
                                          isExpired
                                            ? "bg-rose-50 text-rose-700 border-rose-200"
                                            : isUrgent
                                            ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse"
                                            : isApproaching
                                            ? "bg-amber-50 text-amber-700 border-amber-200"
                                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        }`}
                                      >
                                        <span>
                                          {isExpired
                                            ? `Expired (${Math.abs(days)}d ago)`
                                            : days === 0
                                            ? "Expires Today"
                                            : `${days} Days Left`}
                                        </span>
                                      </span>
                                    </td>

                                    {/* Renewal Quote */}
                                    <td className="py-3.5 px-4 text-right">
                                      <div className="font-bold text-slate-900 font-mono text-xs">
                                        {quoteAmount > 0 ? formatLKR(quoteAmount) : "Not Calculated"}
                                      </div>
                                      <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                                        {r.renewalQuote?.status ? r.renewalQuote.status.replace("_", " ") : "Draft"}
                                      </span>
                                    </td>

                                    {/* Payment Status */}
                                    <td className="py-3.5 px-4 text-center">
                                      <span
                                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                                          r.isPaid
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : "bg-amber-50 text-amber-700 border-amber-200"
                                        }`}
                                      >
                                        {r.isPaid ? "Paid & Active" : "Pending Payment"}
                                      </span>
                                    </td>

                                    {/* Action Link to Live Renewals */}
                                    <td className="py-3.5 px-4 text-right">
                                      <Link
                                        href={`/Admin/Renewals?search=${encodeURIComponent(r.vehicle?.numberPlate || "")}`}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-[#000080] hover:text-white text-slate-700 rounded-xl text-[11px] font-bold transition-all cursor-pointer no-underline active:scale-95 shadow-2xs"
                                        title="Inspect & Process in Renewals Portal"
                                      >
                                        <span>Manage</span>
                                        <HugeiconsIcon icon={ArrowRight01Icon} className="w-3 h-3" />
                                      </Link>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: THIRD-PARTY DRIVERS (NATIONWIDE) */}
                {activeTab === "thirdparty" && (
                  <div className="flex flex-col gap-6">
                    {/* Third-Party KPI Banner */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-5 rounded-2xl border-l-[6px] border-l-blue-600 border border-slate-200 shadow-sm">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Registrations</span>
                        <div className="text-2xl font-black text-[#102A43] mt-1">{thirdPartyRequests.length} Drivers</div>
                        <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">Nationwide policyholder delegates</span>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border-l-[6px] border-l-emerald-500 border border-slate-200 shadow-sm">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Approved & Active Passes</span>
                        <div className="text-2xl font-black text-emerald-600 mt-1">
                          {thirdPartyRequests.filter((t) => t.status === "Approved").length} Active
                        </div>
                        <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">Secure digital NFC passes</span>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border-l-[6px] border-l-amber-500 border border-slate-200 shadow-sm">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Branch Review</span>
                        <div className="text-2xl font-black text-amber-600 mt-1">
                          {thirdPartyRequests.filter((t) => t.status === "Pending Branch Approval").length} Pending
                        </div>
                        <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">Requires branch KYC audit</span>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border-l-[6px] border-l-indigo-600 border border-slate-200 shadow-sm">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pass Fees Collected</span>
                        <div className="text-xl font-black text-indigo-700 mt-1 truncate">
                          {formatLKR(thirdPartyRequests.reduce((acc, t) => acc + (t.payment?.status === "Paid" ? (t.fee || 300) : 0), 0))}
                        </div>
                        <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">LKR 300 driver pass revenue</span>
                      </div>
                    </div>

                    {/* Filter & Action Controls Bar */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs select-none">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                          <select
                            value={tpStatusFilter}
                            onChange={(e) => setTpStatusFilter(e.target.value)}
                            className="px-3.5 py-1.5 rounded-xl border border-slate-300 font-semibold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 shadow-2xs"
                          >
                            <option value="all">Status: All Statuses</option>
                            <option value="Approved">Status: Approved</option>
                            <option value="Pending Branch Approval">Status: Pending Branch Approval</option>
                            <option value="Pending Termination Approval">Status: Pending Termination</option>
                            <option value="Terminated">Status: Terminated</option>
                            <option value="Rejected">Status: Rejected</option>
                            <option value="Pending Payment">Status: Pending Payment</option>
                          </select>
                        </div>

                        <select
                          value={selectedBranch}
                          onChange={(e) => setSelectedBranch(e.target.value)}
                          className="px-3.5 py-1.5 rounded-xl border border-slate-300 font-semibold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 shadow-2xs"
                        >
                          <option value="All">Branch: All Branches</option>
                          {SRI_LANKA_BRANCHES.filter((b) => b !== "All").map((br) => (
                            <option key={br} value={br}>
                              {br} Branch
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href="/Admin/PolicyHolders"
                          className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer no-underline"
                        >
                          <span>Open Policyholders</span>
                        </Link>
                        <button
                          onClick={handleExportThirdPartyCSV}
                          className="px-3.5 py-1.5 bg-[#000080] hover:bg-[#102A43] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer border-none"
                        >
                          <HugeiconsIcon icon={Download01Icon} className="w-3.5 h-3.5 text-white" />
                          <span>Export CSV</span>
                        </button>
                      </div>
                    </div>

                    {/* Third-Party Drivers Table */}
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                      {filteredThirdParty.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 font-medium select-none">
                          No third-party driver records found matching your active filter criteria.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] select-none">
                                <th className="py-3 px-4 whitespace-nowrap">Reference ID</th>
                                <th className="py-3 px-4 whitespace-nowrap">Third-Party Driver</th>
                                <th className="py-3 px-4 whitespace-nowrap">Policyholder (Owner)</th>
                                <th className="py-3 px-4 whitespace-nowrap">Assigned Branch</th>
                                <th className="py-3 px-4 whitespace-nowrap">Authorized Vehicles</th>
                                <th className="py-3 px-4 text-center whitespace-nowrap">Fee & Payment</th>
                                <th className="py-3 px-4 text-center whitespace-nowrap">Authorization Status</th>
                                <th className="py-3 px-4 whitespace-nowrap">Registered Date</th>
                                <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filteredThirdParty.map((t, idx) => {
                                const isApproved = t.status === "Approved";
                                const isPending = t.status === "Pending Branch Approval";
                                const isTerminated = t.status === "Terminated";
                                const isRejected = t.status === "Rejected";
                                const isPaid = t.payment?.status === "Paid";

                                return (
                                  <tr
                                    key={t._id || idx}
                                    onClick={() => setSelectedTpRecord(t)}
                                    className={`hover:bg-slate-50/80 transition-colors cursor-pointer border-l-[6px] ${
                                      isApproved
                                        ? "border-l-emerald-500"
                                        : isPending
                                        ? "border-l-amber-500"
                                        : isTerminated || isRejected
                                        ? "border-l-rose-500"
                                        : "border-l-blue-500"
                                    }`}
                                  >
                                    <td className="py-3.5 px-4 font-mono font-bold text-[#102A43] whitespace-nowrap">
                                      {t.requestReference || `TPR-2026-${String(idx + 1).padStart(4, "0")}`}
                                    </td>

                                    <td className="py-3.5 px-4 whitespace-nowrap">
                                      <span className="font-bold text-slate-800 block">
                                        {t.driverDetails?.fullName || "Authorized Driver"}
                                      </span>
                                      <span className="font-mono text-[10px] text-slate-400 block">
                                        {t.driverDetails?.nicNumber ? `NIC: ${t.driverDetails.nicNumber}` : t.driverDetails?.phoneNumber || "-"}
                                      </span>
                                    </td>

                                    <td className="py-3.5 px-4 whitespace-nowrap">
                                      <span className="font-bold text-slate-800 block">
                                        {t.policyHolderName || "Policyholder"}
                                      </span>
                                      <span className="font-mono text-[10px] text-slate-400 block">
                                        {t.policyHolderNic}
                                      </span>
                                    </td>

                                    <td className="py-3.5 px-4 whitespace-nowrap">
                                      <span className="font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md text-[11px]">
                                        {t.branch || "Galle"} Branch
                                      </span>
                                    </td>

                                    <td className="py-3.5 px-4 whitespace-nowrap">
                                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                                        {(t.selectedVehicles || []).map((v, vIdx) => (
                                          <span
                                            key={vIdx}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[10px] font-semibold"
                                          >
                                            <HugeiconsIcon icon={Car01Icon} className="w-3 h-3 text-slate-500" />
                                            <span>{v.numberPlate}</span>
                                          </span>
                                        ))}
                                      </div>
                                    </td>

                                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                      <span
                                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                                          isPaid
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : "bg-amber-50 text-amber-700 border-amber-200"
                                        }`}
                                      >
                                        <HugeiconsIcon icon={CreditCardIcon} className="w-3 h-3" />
                                        <span>LKR {t.fee || 300} ({isPaid ? "Paid" : "Pending"})</span>
                                      </span>
                                    </td>

                                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                      <span
                                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                          isApproved
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : isPending
                                            ? "bg-amber-50 text-amber-700 border-amber-200"
                                            : isTerminated
                                            ? "bg-slate-100 text-slate-600 border-slate-200"
                                            : isRejected
                                            ? "bg-rose-50 text-rose-700 border-rose-200"
                                            : "bg-blue-50 text-blue-700 border-blue-200"
                                        }`}
                                      >
                                        {t.status}
                                      </span>
                                    </td>

                                    <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                                      {t.createdAt ? new Date(t.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                                    </td>

                                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                        <button
                                          onClick={() => setSelectedTpRecord(t)}
                                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 transition-colors cursor-pointer"
                                          title="View details"
                                        >
                                          <HugeiconsIcon icon={ViewIcon} className="w-3.5 h-3.5" />
                                        </button>
                                        {isApproved && t.secureAccess?.accessUrl && (
                                          <button
                                            onClick={() => {
                                              if (typeof navigator !== "undefined" && t.secureAccess?.accessUrl) {
                                                navigator.clipboard.writeText(t.secureAccess.accessUrl);
                                                setCopiedToken(t._id);
                                                showToast("Digital pass access link copied to clipboard!", "success");
                                                setTimeout(() => setCopiedToken(null), 3000);
                                              }
                                            }}
                                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 transition-colors cursor-pointer"
                                            title="Copy digital NFC pass link"
                                          >
                                            <HugeiconsIcon icon={copiedToken === t._id ? CheckmarkCircle01Icon : Copy01Icon} className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 select-none">
                        <span>Showing {filteredThirdParty.length} of {thirdPartyRequests.length} driver registrations</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 6: FIELD AGENTS & AVAILABILITY */}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-[#000080] flex items-center justify-center shadow-xs">
                  <HugeiconsIcon icon={Download01Icon} className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Executive Audit & Filtered Report Center</h3>
                  <p className="text-xs text-slate-500 font-medium">Generate custom datasets and printable dossiers with specific time ranges and filters</p>
                </div>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* Step 1: Reporting Domain */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-2">
                  1. Executive Reporting Scope
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {[
                    { id: "claims", label: "Claims & Loss Matrix", desc: "Granular claim files, damage types & disbursements" },
                    { id: "branches", label: "Regional Branch Matrix", desc: "26-branch performance, staff & loss resolution" },
                    { id: "renewals", label: "Policy Renewals & Fleet", desc: "Expiring vehicles, premium quotes & collections" },
                    { id: "thirdparty", label: "Third-Party Drivers", desc: "Authorized driver passes, KYC & fees" },
                    { id: "agents", label: "Field Agent Operations", desc: "Agent duty readiness, inspected claims & volume" },
                    { id: "summary", label: "Executive KPI Summary", desc: "Complete system financial, portfolio & security audit" }
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setExportScope(s.id as any)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        exportScope === s.id
                          ? "border-[#000080] bg-blue-50/40 text-[#000080] shadow-xs"
                          : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
                      }`}
                    >
                      <span className="font-bold text-xs block">{s.label}</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">{s.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Branch Jurisdiction */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-2">
                    2. Regional Branch Scope
                  </label>
                  <select
                    value={exportBranch}
                    onChange={(e) => setExportBranch(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                  >
                    <option value="All">All Branches (National Network)</option>
                    {SRI_LANKA_BRANCHES.filter(b => b !== "All").map((b) => (
                      <option key={b} value={b}>{b} Branch</option>
                    ))}
                  </select>
                </div>

                {/* Step 3: Status Filter */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-2">
                    3. Case / Duty Status Filter
                  </label>
                  {exportScope === "claims" ? (
                    <select
                      value={exportStatus}
                      onChange={(e) => setExportStatus(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                    >
                      <option value="all">All Claim Statuses</option>
                      <option value="Approved">Approved / Cleared Payout</option>
                      <option value="Pending">Pending Audit</option>
                      <option value="In Progress">In Progress (Field Inspected)</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  ) : exportScope === "thirdparty" ? (
                    <select
                      value={exportStatus}
                      onChange={(e) => setExportStatus(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                    >
                      <option value="all">All Authorization Statuses</option>
                      <option value="Approved">Approved</option>
                      <option value="Pending Branch Approval">Pending Branch Approval</option>
                      <option value="Pending Termination Approval">Pending Termination</option>
                      <option value="Terminated">Terminated</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Pending Payment">Pending Payment</option>
                    </select>
                  ) : exportScope === "agents" ? (
                    <select
                      value={exportStatus}
                      onChange={(e) => setExportStatus(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                    >
                      <option value="all">All Duty Statuses</option>
                      <option value="Active">Active Duty</option>
                      <option value="Offline">Offline / Off Duty</option>
                    </select>
                  ) : exportScope === "renewals" ? (
                    <select
                      value={exportStatus}
                      onChange={(e) => setExportStatus(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                    >
                      <option value="all">All Renewal Statuses</option>
                      <option value="expiring_soon">Expiring Soon (&lt;45 Days)</option>
                      <option value="paid">Paid &amp; Renewed</option>
                      <option value="pending">Pending Payment</option>
                      <option value="calculated">Calculated Quotes</option>
                    </select>
                  ) : (
                    <div className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 text-xs font-medium">
                      Applies to all entries in this matrix
                    </div>
                  )}
                </div>
              </div>

              {/* Step 4: Time Range Filter */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-2">
                  4. Time Range Window
                </label>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {[
                    { id: "all", label: "All Time" },
                    { id: "today", label: "Today" },
                    { id: "7days", label: "Last 7 Days" },
                    { id: "30days", label: "Last 30 Days" },
                    { id: "90days", label: "Last Quarter" },
                    { id: "thisyear", label: "This Year" },
                    { id: "custom", label: "Custom Range..." }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setExportTimeRange(t.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                        exportTimeRange === t.id
                          ? "bg-[#102A43] text-white border-[#102A43] shadow-xs"
                          : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Custom Date Pickers */}
                {exportTimeRange === "custom" && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-wrap items-center gap-4 animate-in fade-in duration-150">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-600 text-xs">Start Date:</span>
                      <input
                        type="date"
                        value={exportCustomStart}
                        onChange={(e) => setExportCustomStart(e.target.value)}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-600 text-xs">End Date:</span>
                      <input
                        type="date"
                        value={exportCustomEnd}
                        onChange={(e) => setExportCustomEnd(e.target.value)}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Live Preview Impact Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Filtered Preview Impact
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg font-black text-slate-900 font-mono">
                      {exportFilteredData.count} Records Match
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Scope: {exportScope.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                    Branch: {exportBranch === "All" ? "National Network" : `${exportBranch} Branch`} &bull; Window: {exportTimeRange.replace("_", " ").toUpperCase()}
                  </span>
                </div>

                {exportFilteredData.totalAmount !== undefined && exportFilteredData.totalAmount > 0 && (
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Valuation / Financial Sum
                    </span>
                    <span className="text-base font-black text-slate-900 font-mono block mt-1">
                      {formatLKR(exportFilteredData.totalAmount)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintFilteredAdminDossier}
                  className="px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5 active:scale-95"
                >
                  <HugeiconsIcon icon={File01Icon} className="w-4 h-4 text-slate-600" strokeWidth={2} />
                  <span>Print Audit Dossier</span>
                </button>

                <button
                  onClick={handleDownloadFilteredAdminCSV}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#000080] hover:bg-[#102A43] rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5 active:scale-95 border-none"
                >
                  <HugeiconsIcon icon={Download01Icon} className="w-4 h-4 text-white" strokeWidth={2} />
                  <span>Download Filtered CSV</span>
                </button>
              </div>
            </div>
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

      {/* MODAL 4: THIRD-PARTY DRIVER DOSSIER INSPECTOR */}
      {selectedTpRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs">
                  <HugeiconsIcon icon={UserCheck01Icon} className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Third-Party Driver File: {selectedTpRecord.requestReference || "TPR-2026"}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    National Branch Audit • {selectedTpRecord.branch || "Galle"} Branch
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTpRecord(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Status Banner */}
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                  selectedTpRecord.status === "Approved"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : selectedTpRecord.status === "Pending Branch Approval"
                    ? "bg-amber-50 border-amber-200 text-amber-900"
                    : selectedTpRecord.status === "Terminated" || selectedTpRecord.status === "Rejected"
                    ? "bg-rose-50 border-rose-200 text-rose-900"
                    : "bg-blue-50 border-blue-200 text-blue-900"
                }`}
              >
                <div>
                  <span className="font-bold text-xs uppercase tracking-wide block">
                    Authorization Status: {selectedTpRecord.status}
                  </span>
                  <span className="text-[11px] opacity-80 block">
                    {selectedTpRecord.status === "Approved"
                      ? "NFC Digital pass issued and authorized for vehicle operation"
                      : selectedTpRecord.status === "Pending Branch Approval"
                      ? "Awaiting branch staff document review & approval"
                      : selectedTpRecord.status === "Terminated"
                      ? "Driver authorization terminated"
                      : "Registration submitted"}
                  </span>
                </div>
                <span
                  className={`text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                    selectedTpRecord.status === "Approved"
                      ? "bg-emerald-600 text-white"
                      : selectedTpRecord.status === "Pending Branch Approval"
                      ? "bg-amber-500 text-white"
                      : selectedTpRecord.status === "Terminated" || selectedTpRecord.status === "Rejected"
                      ? "bg-rose-600 text-white"
                      : "bg-blue-600 text-white"
                  }`}
                >
                  {selectedTpRecord.status}
                </span>
              </div>

              {/* Driver & Policyholder Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Driver Profile */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    1. Authorized Secondary Driver
                  </span>
                  <div className="space-y-1.5 text-xs">
                    <div><span className="text-slate-400">Full Name:</span> <strong className="text-slate-900 ml-1">{selectedTpRecord.driverDetails?.fullName}</strong></div>
                    <div><span className="text-slate-400">NIC Number:</span> <strong className="font-mono text-slate-900 ml-1">{selectedTpRecord.driverDetails?.nicNumber || "Not Provided"}</strong></div>
                    <div><span className="text-slate-400">Phone:</span> <strong className="font-mono text-slate-900 ml-1">{selectedTpRecord.driverDetails?.phoneNumber}</strong></div>
                    <div><span className="text-slate-400">Address:</span> <span className="text-slate-800 ml-1 font-medium">{selectedTpRecord.driverDetails?.residentialAddress}</span></div>
                  </div>
                </div>

                {/* Policyholder Info */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    2. Authorizing Policyholder (Owner)
                  </span>
                  <div className="space-y-1.5 text-xs">
                    <div><span className="text-slate-400">Owner Name:</span> <strong className="text-slate-900 ml-1">{selectedTpRecord.policyHolderName || "Policyholder"}</strong></div>
                    <div><span className="text-slate-400">NIC:</span> <strong className="font-mono text-slate-900 ml-1">{selectedTpRecord.policyHolderNic}</strong></div>
                    <div><span className="text-slate-400">Registered Branch:</span> <strong className="text-slate-800 ml-1">{selectedTpRecord.branch || "Galle"} Branch</strong></div>
                    <div><span className="text-slate-400">Reference:</span> <span className="font-mono text-blue-700 font-semibold ml-1">{selectedTpRecord.requestReference}</span></div>
                  </div>
                </div>
              </div>

              {/* Authorized Vehicles */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  3. Authorized Vehicles ({(selectedTpRecord.selectedVehicles || []).length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(selectedTpRecord.selectedVehicles || []).map((v, vIdx) => (
                    <div key={vIdx} className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                          <HugeiconsIcon icon={Car01Icon} className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="font-mono font-bold text-slate-800 text-xs block">{v.numberPlate}</span>
                          <span className="text-[10px] text-slate-400 block">{v.model || v.vehicleType || "Authorized Vehicle"}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                        {v.policyNumber || "SAN-POL"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fee, Payment & Digital NFC Pass */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    4. Issuance Fee & Payment
                  </span>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-500">Authorized Pass Fee:</span>
                    <span className="font-black text-slate-900">LKR {selectedTpRecord.fee || 300}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Payment Status:</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded-full text-[10px] border ${
                        selectedTpRecord.payment?.status === "Paid"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {selectedTpRecord.payment?.status === "Paid" ? "Payment Settled" : "Payment Pending"}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    5. Digital NFC Pass Access
                  </span>
                  {selectedTpRecord.secureAccess?.accessUrl ? (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-mono text-blue-700 truncate bg-white p-2 rounded-xl border border-blue-100">
                        {selectedTpRecord.secureAccess.accessUrl}
                      </div>
                      <button
                        onClick={() => {
                          if (typeof navigator !== "undefined" && selectedTpRecord.secureAccess?.accessUrl) {
                            navigator.clipboard.writeText(selectedTpRecord.secureAccess.accessUrl);
                            setCopiedToken(selectedTpRecord._id);
                            showToast("Driver pass link copied to clipboard!", "success");
                            setTimeout(() => setCopiedToken(null), 3000);
                          }
                        }}
                        className="w-full py-1.5 bg-[#000080] hover:bg-[#102A43] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none shadow-2xs"
                      >
                        <HugeiconsIcon icon={copiedToken === selectedTpRecord._id ? CheckmarkCircle01Icon : Copy01Icon} className="w-3.5 h-3.5" />
                        <span>{copiedToken === selectedTpRecord._id ? "Copied Link!" : "Copy Digital NFC Pass Link"}</span>
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic pt-1">
                      Digital pass token generated upon branch approval.
                    </p>
                  )}
                </div>
              </div>

              {/* Branch Review Information */}
              {selectedTpRecord.branchReview && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    6. Branch Staff Audit Record
                  </span>
                  <div className="flex justify-between text-slate-600">
                    <span>Reviewed by: <strong className="text-slate-800">{selectedTpRecord.branchReview.reviewedByStaffName || "Branch Staff"}</strong></span>
                    <span>{selectedTpRecord.branchReview.reviewedAt ? new Date(selectedTpRecord.branchReview.reviewedAt).toLocaleDateString("en-GB") : "-"}</span>
                  </div>
                  {selectedTpRecord.branchReview.notes && (
                    <p className="text-slate-600 text-[11px] bg-white p-2 rounded-xl border border-slate-200 mt-1">
                      <strong>Notes:</strong> {selectedTpRecord.branchReview.notes}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Sanasa General Insurance • Executive Head Office Audit
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadSingleThirdPartyReport(selectedTpRecord)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border-none shadow-xs active:scale-95"
                >
                  <HugeiconsIcon icon={Download01Icon} className="w-4 h-4 text-white" strokeWidth={2.5} />
                  <span>Download Report</span>
                </button>
                <button
                  onClick={() => setSelectedTpRecord(null)}
                  className="px-5 py-2 bg-[#102A43] hover:bg-[#000080] text-white font-semibold text-xs rounded-xl transition-all cursor-pointer border-none shadow-xs active:scale-95"
                >
                  Close File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
