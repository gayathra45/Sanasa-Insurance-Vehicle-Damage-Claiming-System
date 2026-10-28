"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import OfficeStaffNavbar from "@/app/Components/Office_Staff/Navbar";
import UserAvatarDropdown from "@/app/Components/UserAvatarDropdown";
import SimpleLoader from "@/app/Components/SimpleLoader";
import { API_URL } from "@/app/config";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Menu01Icon,
  Notification01Icon,
  Search01Icon,
  Clock01Icon,
  File01Icon,
  CheckmarkCircle01Icon,
  Alert02Icon,
  AlertCircleIcon,
  BubbleChatIcon,
  Shield01Icon,
  UserGroupIcon,
  Car01Icon,
  Location01Icon,
  Loading03Icon,
  ViewIcon,
  ArrowRight01Icon,
  Analytics01Icon,
  Cancel01Icon,
  Briefcase01Icon,
  Download01Icon,
  RefreshIcon,
  SecurityCheckIcon,
  Building01Icon,
  Folder01Icon
} from "@hugeicons/core-free-icons";
import { formatSriLankaDateTime } from "@/app/utils/dateFormatter";

interface ClaimRecord {
  _id?: string;
  claimNumber: string;
  userNic: string;
  policyHolderName?: string;
  policyHolderMobile?: string;
  policyHolderEmail?: string;
  vehicleNumber?: string;
  vehicleModel?: string;
  vehicleType?: string;
  damageType?: string;
  incidentLocation?: string;
  status: string;
  amount?: number;
  estimatedAmount?: number;
  assignedAgent?: string;
  createdAt: string;
  updatedAt?: string;
  description?: string;
  bankName?: string;
  bankBranch?: string;
  bankAccount?: string;
  accountHolderName?: string;
  policyHolderBankDetails?: {
    bankName?: string;
    branchName?: string;
    accountNumber?: string;
    accountHolderName?: string;
  };
}

interface PolicyHolderRecord {
  _id?: string;
  firstName: string;
  lastName: string;
  nic: string;
  mobile: string;
  email: string;
  city?: string;
  province?: string;
  address?: string;
  branch: string;
  status: string;
  vehicles?: any[];
  referenceNumber?: string;
  bankDetails?: {
    bankName?: string;
    branchName?: string;
    accountNumber?: string;
    accountHolderName?: string;
  };
  documents?: {
    nicFront?: string;
    nicBack?: string;
    vehicleReg?: string;
    revenueLicense?: string;
  };
  createdAt: string;
}

interface AgentRecord {
  _id?: string;
  name: string;
  email: string;
  phone: string;
  branch: string;
  status: string;
  agentId?: string;
  createdAt?: string;
  policiesReferred?: number;
  claimsReferred?: number;
  totalPremiumGenerated?: number;
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
    company?: string;
    model?: string;
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
    paymentPlanType?: string;
    calculation?: {
      basePremium?: number;
      ncDiscountAmount?: number;
      taxesAndLevies?: number;
      finalAnnualTotal?: number;
    };
    installments?: Array<{
      installmentIndex: number;
      amount: number;
      dueDate: string;
      status: "Pending" | "Paid" | "Overdue";
      paidAt?: string;
      paymentReference?: string;
    }>;
    paymentReference?: string;
    createdAt?: string;
    updatedAt?: string;
  } | null;
  isPaid: boolean;
  latestPaymentDate?: string | null;
}

// Time Range Matching Helper Function
const matchesDateRange = (
  dateStr?: string | null,
  range: "all" | "today" | "this_week" | "this_month" | "last_30" | "this_quarter" | "this_year" | "custom" = "all",
  customStart?: string,
  customEnd?: string
) => {
  if (!dateStr || range === "all") return true;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return true;
  const now = new Date();

  if (range === "today") {
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return date >= startOfDay;
  }
  if (range === "this_week") {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return date >= d;
  }
  if (range === "this_month") {
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }
  if (range === "last_30") {
    const diffDays = Math.abs((now.getTime() - date.getTime()) / (1000 * 3600 * 24));
    return diffDays <= 30;
  }
  if (range === "this_quarter") {
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const dateQuarter = Math.floor(date.getMonth() / 3);
    return currentQuarter === dateQuarter && date.getFullYear() === now.getFullYear();
  }
  if (range === "this_year") {
    return date.getFullYear() === now.getFullYear();
  }
  if (range === "custom" && customStart && customEnd) {
    const start = new Date(customStart);
    const end = new Date(customEnd);
    end.setHours(23, 59, 59, 999);
    return date >= start && date <= end;
  }
  return true;
};

export default function OfficeStaffReports() {
  const [branch, setBranch] = useState("Galle");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Raw data from backend
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [policyHolders, setPolicyHolders] = useState<PolicyHolderRecord[]>([]);
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [renewals, setRenewals] = useState<VehicleRenewalRecord[]>([]);
  const [summaryStats, setSummaryStats] = useState({
    totalClaims: 0,
    approvedClaims: 0,
    pendingClaims: 0,
    rejectedClaims: 0,
    totalPayoutAmount: 0,
    totalPolicyHolders: 0,
    activeAgents: 0
  });
  const [monthlyTrend, setMonthlyTrend] = useState<{ month: string; claims: number }[]>([]);

  // Filter States
  const [activeReportType, setActiveReportType] = useState<"overview" | "claims" | "policyholders" | "agents" | "renewals" | "financial" | "analytics">("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateRange, setDateRange] = useState<"all" | "today" | "this_week" | "this_month" | "last_30" | "this_quarter" | "this_year" | "custom">("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "amount_high" | "amount_low">("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Dedicated Filtered Detail Report Download Modal States
  const [showFilteredReportModal, setShowFilteredReportModal] = useState(false);
  const [exportDomain, setExportDomain] = useState<"claims" | "policyholders" | "renewals" | "agents" | "financial">("claims");
  const [exportTimeRange, setExportTimeRange] = useState<"all" | "today" | "this_week" | "this_month" | "last_30" | "this_quarter" | "this_year" | "custom">("all");
  const [exportCustomStart, setExportCustomStart] = useState("");
  const [exportCustomEnd, setExportCustomEnd] = useState("");
  const [exportStatus, setExportStatus] = useState("all");

  // Selected Detail Modal & Active Tab in Modal
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [modalTab, setModalTab] = useState<"details" | "vehicle" | "bank" | "timeline">("details");

  // Export Feedback Modal
  const [popup, setPopup] = useState<{ show: boolean; title: string; message: string; type: "success" | "alert" }>({
    show: false,
    title: "",
    message: "",
    type: "success"
  });

  // Fetch all branch data
  const loadBranchReportData = async (branchName: string, isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      const [statsRes, claimsRes, holdersRes, agentsRes, renewalsRes] = await Promise.all([
        fetch(`${API_URL}/office-staff/stats?branch=${encodeURIComponent(branchName)}`),
        fetch(`${API_URL}/office-staff/claims?branch=${encodeURIComponent(branchName)}`),
        fetch(`${API_URL}/office-staff/policy-holders?branch=${encodeURIComponent(branchName)}`),
        fetch(`${API_URL}/office-staff/agents?branch=${encodeURIComponent(branchName)}`),
        fetch(`${API_URL}/renewals/branch-expiring-vehicles?branch=${encodeURIComponent(branchName)}&all=true`)
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.summary) setSummaryStats(statsData.summary);
        if (statsData.monthlyTrend) setMonthlyTrend(statsData.monthlyTrend);
      }

      if (claimsRes.ok) {
        const claimsData = await claimsRes.json();
        setClaims(claimsData.claims || []);
      }

      if (holdersRes.ok) {
        const holdersData = await holdersRes.json();
        setPolicyHolders(holdersData.policyHolders || []);
      }

      if (agentsRes.ok) {
        const agentsData = await agentsRes.json();
        setAgents(agentsData.agents || []);
      }

      if (renewalsRes.ok) {
        const renewalsData = await renewalsRes.json();
        setRenewals(renewalsData.vehicles || []);
      }

      if (isRefresh) {
        showToast(`Refreshed ${branchName} operational reports successfully!`, "success");
      }
    } catch (err: any) {
      console.error("Error loading branch reports:", err);
      setError("Failed to load branch reports data. Please check your network connection.");
      showToast("Failed to refresh branch reports data.", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadBranchReportData(branch, true);
  };

  useEffect(() => {
    let currentBranch = "Galle";
    if (typeof window !== "undefined") {
      const savedStaff = sessionStorage.getItem("logged_in_staff");
      if (savedStaff) {
        try {
          const staffObj = JSON.parse(savedStaff);
          if (staffObj && staffObj.branch) {
            currentBranch = staffObj.branch;
            setBranch(currentBranch);
          }
        } catch (e) {
          console.error("Error parsing logged_in_staff", e);
        }
      }
    }
    loadBranchReportData(currentBranch);
  }, []);

  // Format currency LKR
  const formatLKR = (amount?: number | null) => {
    if (amount === undefined || amount === null) return "LKR 0";
    return `LKR ${Number(amount).toLocaleString("en-LK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  // Helper date formatter
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  // Calculate Turnaround Time (TAT) in days
  const calculateTAT = (createdStr?: string, updatedStr?: string) => {
    if (!createdStr) return "1.5 Days";
    const start = new Date(createdStr).getTime();
    const end = updatedStr ? new Date(updatedStr).getTime() : new Date().getTime();
    const diffDays = Math.max(Math.round((end - start) / (1000 * 3600 * 24)), 1);
    return `${diffDays} ${diffDays === 1 ? "Day" : "Days"}`;
  };

  // Comprehensive Monthly Metrics for All Claims, Approved, Completed, and Rejected
  const monthlyMetrics = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentYear = new Date().getFullYear();

    return months.map((monthName, index) => {
      const monthClaims = claims.filter((c) => {
        if (!c.createdAt) return false;
        const d = new Date(c.createdAt);
        return d.getMonth() === index && d.getFullYear() === currentYear;
      });

      const all = monthClaims.length;
      const approved = monthClaims.filter(c => c.status === "Approved").length;
      const completed = monthClaims.filter(c => c.status === "Approved" && (c.amount !== null && c.amount !== undefined && c.amount > 0)).length;
      const rejected = monthClaims.filter(c => c.status === "Rejected").length;
      const inProgress = monthClaims.filter(c => c.status === "In Progress" || c.status === "Pending").length;

      return {
        month: monthName,
        all,
        approved,
        completed,
        rejected,
        inProgress
      };
    });
  }, [claims]);

  const maxMonthVal = useMemo(() => {
    let max = 1;
    monthlyMetrics.forEach(m => {
      const high = Math.max(m.all, m.approved, m.completed, m.rejected);
      if (high > max) max = high;
    });
    return max;
  }, [monthlyMetrics]);

  // Filtered Claims
  const filteredClaims = useMemo(() => {
    return claims.filter((c) => {
      // Status Filter
      if (statusFilter !== "all" && c.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      // Category / Damage Type Filter
      if (categoryFilter !== "all") {
        if (categoryFilter === "Accident" && !c.damageType?.toLowerCase().includes("accident") && !c.damageType?.toLowerCase().includes("collision")) return false;
        if (categoryFilter === "Windscreen" && !c.damageType?.toLowerCase().includes("windscreen") && !c.damageType?.toLowerCase().includes("glass")) return false;
        if (categoryFilter === "Theft" && !c.damageType?.toLowerCase().includes("theft") && !c.damageType?.toLowerCase().includes("stolen")) return false;
        if (categoryFilter === "Flood" && !c.damageType?.toLowerCase().includes("flood") && !c.damageType?.toLowerCase().includes("water")) return false;
        if (categoryFilter === "ThirdParty" && !c.damageType?.toLowerCase().includes("third")) return false;
      }

      // Date Range Filter
      if (c.createdAt && !matchesDateRange(c.createdAt, dateRange, customStartDate, customEndDate)) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNo = c.claimNumber?.toLowerCase().includes(q);
        const matchesNic = c.userNic?.toLowerCase().includes(q);
        const matchesName = c.policyHolderName?.toLowerCase().includes(q);
        const matchesPlate = c.vehicleNumber?.toLowerCase().includes(q);
        const matchesAgent = c.assignedAgent?.toLowerCase().includes(q);
        const matchesDamage = c.damageType?.toLowerCase().includes(q);
        return matchesNo || matchesNic || matchesName || matchesPlate || matchesAgent || matchesDamage;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === "amount_high") return (b.amount || 0) - (a.amount || 0);
      if (sortBy === "amount_low") return (a.amount || 0) - (b.amount || 0);
      return 0;
    });
  }, [claims, statusFilter, categoryFilter, dateRange, customStartDate, customEndDate, searchQuery, sortBy]);

  // Filtered Policy Holders
  const filteredHolders = useMemo(() => {
    return policyHolders.filter((h) => {
      if (statusFilter !== "all" && h.status?.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      // Date Range Filter
      if (h.createdAt && !matchesDateRange(h.createdAt, dateRange, customStartDate, customEndDate)) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNic = h.nic?.toLowerCase().includes(q);
        const matchesName = `${h.firstName} ${h.lastName}`.toLowerCase().includes(q);
        const matchesRef = h.referenceNumber?.toLowerCase().includes(q);
        const matchesMobile = h.mobile?.includes(q);
        const matchesCity = h.city?.toLowerCase().includes(q);
        const matchesPlate = h.vehicles?.some((v: any) => v.numberPlate?.toLowerCase().includes(q) || v.policyNumber?.toLowerCase().includes(q));
        return matchesNic || matchesName || matchesRef || matchesMobile || matchesCity || matchesPlate;
      }

      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [policyHolders, statusFilter, dateRange, customStartDate, customEndDate, searchQuery]);

  // Filtered Agents
  const filteredAgents = useMemo(() => {
    return agents.filter((a) => {
      if (statusFilter !== "all" && a.status?.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      // Date Range Filter
      if (a.createdAt && !matchesDateRange(a.createdAt, dateRange, customStartDate, customEndDate)) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = a.name?.toLowerCase().includes(q);
        const matchesEmail = a.email?.toLowerCase().includes(q);
        const matchesPhone = a.phone?.includes(q);
        return matchesName || matchesEmail || matchesPhone;
      }

      return true;
    });
  }, [agents, statusFilter, dateRange, customStartDate, customEndDate, searchQuery]);

  // Filtered Vehicle Renewals
  const filteredRenewals = useMemo(() => {
    return renewals.filter((r) => {
      // Status Filter
      if (statusFilter !== "all") {
        if (statusFilter === "Paid" && !r.isPaid) return false;
        if (statusFilter === "Pending" && (r.isPaid || (r.renewalQuote && r.renewalQuote.status !== "Pending_Payment" && r.renewalQuote.status !== "Draft"))) return false;
        if (statusFilter === "Calculated" && (!r.renewalQuote || r.renewalQuote.status !== "Calculated")) return false;
        if (statusFilter === "Expiring Soon" && !(r.vehicle.daysRemaining >= 0 && r.vehicle.daysRemaining <= 45)) return false;
      }

      // Category / Vehicle Type Filter
      if (categoryFilter !== "all") {
        const vType = (r.vehicle.type || "").toLowerCase();
        if (categoryFilter === "Car" && !vType.includes("car") && !vType.includes("sedan")) return false;
        if (categoryFilter === "Van" && !vType.includes("van") && !vType.includes("suv")) return false;
        if (categoryFilter === "Bike" && !vType.includes("motorcycle") && !vType.includes("bike") && !vType.includes("scooter")) return false;
        if (categoryFilter === "ThreeWheeler" && !vType.includes("three") && !vType.includes("wheeler") && !vType.includes("tuk")) return false;
      }

      // Date Range Filter (based on latest payment date or policy expiry date)
      const targetDateStr = r.latestPaymentDate || r.vehicle.calculatedExpiryDate || r.vehicle.policyExpiryDate;
      if (targetDateStr && !matchesDateRange(targetDateStr, dateRange, customStartDate, customEndDate)) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesPlate = r.vehicle.numberPlate?.toLowerCase().includes(q);
        const matchesPolicy = r.vehicle.policyNumber?.toLowerCase().includes(q);
        const matchesModel = `${r.vehicle.company || ""} ${r.vehicle.model || ""}`.toLowerCase().includes(q);
        const matchesOwner = r.owner.name?.toLowerCase().includes(q);
        const matchesNic = r.owner.nic?.toLowerCase().includes(q);
        const matchesMobile = r.owner.mobile?.includes(q);
        const matchesQuoteNo = r.renewalQuote?.quoteNumber?.toLowerCase().includes(q);
        return matchesPlate || matchesPolicy || matchesModel || matchesOwner || matchesNic || matchesMobile || matchesQuoteNo;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "newest") {
        const timeA = a.latestPaymentDate ? new Date(a.latestPaymentDate).getTime() : new Date(a.vehicle.calculatedExpiryDate || 0).getTime();
        const timeB = b.latestPaymentDate ? new Date(b.latestPaymentDate).getTime() : new Date(b.vehicle.calculatedExpiryDate || 0).getTime();
        return timeB - timeA;
      }
      if (sortBy === "oldest") {
        const timeA = new Date(a.vehicle.calculatedExpiryDate || 0).getTime();
        const timeB = new Date(b.vehicle.calculatedExpiryDate || 0).getTime();
        return timeA - timeB;
      }
      if (sortBy === "amount_high") {
        const valA = a.renewalQuote?.calculation?.finalAnnualTotal || 0;
        const valB = b.renewalQuote?.calculation?.finalAnnualTotal || 0;
        return valB - valA;
      }
      if (sortBy === "amount_low") {
        const valA = a.renewalQuote?.calculation?.finalAnnualTotal || 0;
        const valB = b.renewalQuote?.calculation?.finalAnnualTotal || 0;
        return valA - valB;
      }
      return 0;
    });
  }, [renewals, statusFilter, categoryFilter, dateRange, customStartDate, customEndDate, searchQuery, sortBy]);

  // Dynamic Portfolio & Renewal Calculations
  const totalVehiclesCount = useMemo(() => {
    return policyHolders.reduce((acc, h) => acc + (h.vehicles?.length || 0), 0);
  }, [policyHolders]);

  const totalSettledPayouts = useMemo(() => {
    return filteredClaims.filter(c => c.status === "Approved").reduce((acc, c) => acc + (c.amount || 0), 0);
  }, [filteredClaims]);

  const averageClaimValue = useMemo(() => {
    const approved = filteredClaims.filter(c => c.status === "Approved" && c.amount);
    if (approved.length === 0) return 0;
    return Math.round(approved.reduce((acc, c) => acc + (c.amount || 0), 0) / approved.length);
  }, [filteredClaims]);

  const approvalRate = useMemo(() => {
    if (claims.length === 0) return "100%";
    const approved = claims.filter(c => c.status === "Approved").length;
    return `${Math.round((approved / claims.length) * 100)}%`;
  }, [claims]);

  const totalRenewalPremiumsCollected = useMemo(() => {
    return renewals.reduce((acc, r) => {
      if (r.isPaid && r.renewalQuote?.calculation?.finalAnnualTotal) {
        return acc + r.renewalQuote.calculation.finalAnnualTotal;
      }
      if (r.renewalQuote?.installments) {
        const paidSum = r.renewalQuote.installments
          .filter(i => i.status === "Paid")
          .reduce((sum, i) => sum + (i.amount || 0), 0);
        if (paidSum > 0) return acc + paidSum;
      }
      return acc;
    }, 0);
  }, [renewals]);

  const expiringPoliciesCount = useMemo(() => {
    return renewals.filter(r => r.vehicle.daysRemaining >= 0 && r.vehicle.daysRemaining <= 45).length;
  }, [renewals]);

  const renewedPoliciesCount = useMemo(() => {
    return renewals.filter(r => r.isPaid).length;
  }, [renewals]);

  // Dynamic Damage Classification Breakdown for Overview & Risk Analytics
  const damageCategories = useMemo(() => {
    const counts: Record<string, { count: number; amount: number }> = {};
    claims.forEach((c) => {
      const cat = c.damageType || "Accident Collision";
      if (!counts[cat]) counts[cat] = { count: 0, amount: 0 };
      counts[cat].count += 1;
      counts[cat].amount += Number(c.amount || c.estimatedAmount) || 0;
    });
    const total = claims.length || 1;
    return Object.entries(counts)
      .map(([category, data]) => ({
        category,
        count: data.count,
        amount: data.amount,
        percentage: Math.round((data.count / total) * 100)
      }))
      .sort((a, b) => b.count - a.count);
  }, [claims]);

  // Dynamic Insured Vehicle Composition for Overview
  const vehicleTypes = useMemo(() => {
    const counts: Record<string, number> = {};
    let total = 0;
    policyHolders.forEach((h) => {
      (h.vehicles || []).forEach((v: any) => {
        const vt = v.type || v.vehicleType || "Motor Car";
        counts[vt] = (counts[vt] || 0) + 1;
        total += 1;
      });
    });
    if (total === 0) {
      renewals.forEach((r) => {
        const vt = r.vehicle?.type || "Motor Car";
        counts[vt] = (counts[vt] || 0) + 1;
        total += 1;
      });
    }
    return Object.entries(counts)
      .map(([vehicleType, count]) => ({
        vehicleType,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);
  }, [policyHolders, renewals]);

  // Comprehensive CSV Export Handler
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    const branchName = branch || "Galle";

    if (activeReportType === "claims" || activeReportType === "financial") {
      csvContent += "Claim Number,Policy Holder,NIC,Vehicle Number,Damage Type,Claim Amount (LKR),Status,Assigned Agent,Bank Name,Bank Account,Turnaround (Days),Date Filed\n";
      filteredClaims.forEach((c) => {
        const bankInfo = c.policyHolderBankDetails || { bankName: c.bankName, accountNumber: c.bankAccount };
        const row = [
          `"${c.claimNumber}"`,
          `"${c.policyHolderName || "Client"}"`,
          `"${c.userNic || "-"}"`,
          `"${c.vehicleNumber || "-"}"`,
          `"${c.damageType || "Accident"}"`,
          `"${c.amount || 0}"`,
          `"${c.status || "Pending"}"`,
          `"${c.assignedAgent || "Unassigned"}"`,
          `"${bankInfo.bankName || "-"}"`,
          `"${bankInfo.accountNumber || "-"}"`,
          `"${calculateTAT(c.createdAt, c.updatedAt)}"`,
          `"${c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-GB") : "-"}"`
        ];
        csvContent += row.join(",") + "\n";
      });
    } else if (activeReportType === "policyholders") {
      csvContent += "Reference No,Full Name,NIC,Mobile,Email,City,Vehicles Count,Primary Vehicle Number,Primary Policy No,Status,Registered Date\n";
      filteredHolders.forEach((h) => {
        const primaryVeh = h.vehicles && h.vehicles.length > 0 ? h.vehicles[0] : null;
        const row = [
          `"${h.referenceNumber || "SAN-PH"}"`,
          `"${h.firstName} ${h.lastName}"`,
          `"${h.nic}"`,
          `"${h.mobile || "-"}"`,
          `"${h.email || "-"}"`,
          `"${h.city || "-"}"`,
          `"${h.vehicles?.length || 0}"`,
          `"${primaryVeh ? primaryVeh.numberPlate : "-"}"`,
          `"${primaryVeh ? primaryVeh.policyNumber : "-"}"`,
          `"${h.status || "Approved"}"`,
          `"${h.createdAt ? new Date(h.createdAt).toLocaleDateString("en-GB") : "-"}"`
        ];
        csvContent += row.join(",") + "\n";
      });
    } else if (activeReportType === "renewals") {
      csvContent += "Vehicle Number,Vehicle Model,Type,Policy Number,Policyholder Name,NIC,Mobile,Email,Policy Expiry Date,Days Remaining,Renewal Status,Quote Total (LKR),Payment Plan,Installments Paid,Latest Payment Date\n";
      filteredRenewals.forEach((r) => {
        const quote = r.renewalQuote;
        const paidInstCount = quote?.installments?.filter(i => i.status === "Paid").length || 0;
        const totalInstCount = quote?.installments?.length || 0;
        const row = [
          `"${r.vehicle.numberPlate}"`,
          `"${r.vehicle.company || ""} ${r.vehicle.model || ""}"`,
          `"${r.vehicle.type || "-"}"`,
          `"${r.vehicle.policyNumber || "-"}"`,
          `"${r.owner.name}"`,
          `"${r.owner.nic}"`,
          `"${r.owner.mobile || "-"}"`,
          `"${r.owner.email || "-"}"`,
          `"${formatDate(r.vehicle.calculatedExpiryDate || r.vehicle.policyExpiryDate)}"`,
          `"${r.vehicle.daysRemaining}"`,
          `"${r.isPaid ? "Paid" : quote ? quote.status : "Pending Quote"}"`,
          `"${quote?.calculation?.finalAnnualTotal || 0}"`,
          `"${quote?.paymentPlanType || (quote?.selectedPlan ? "Annual" : "-")}"`,
          `"${totalInstCount > 0 ? `${paidInstCount}/${totalInstCount}` : r.isPaid ? "Full" : "0"}"`,
          `"${r.latestPaymentDate ? new Date(r.latestPaymentDate).toLocaleDateString("en-GB") : "-"}"`
        ];
        csvContent += row.join(",") + "\n";
      });
    } else {
      csvContent += "Agent Code,Agent Name,Email,Phone,Assigned Branch,Status\n";
      filteredAgents.forEach((a, idx) => {
        const row = [
          `"SAN-AGT-${100 + idx}"`,
          `"${a.name}"`,
          `"${a.email}"`,
          `"${a.phone}"`,
          `"${a.branch} Branch"`,
          `"${a.status || "Active"}"`
        ];
        csvContent += row.join(",") + "\n";
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Sanasa_${branchName}_${activeReportType}_Detailed_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setPopup({
      show: true,
      title: "Detailed Report Exported",
      message: `The complete ${activeReportType} dataset for ${branchName} Branch has been downloaded as a structured CSV spreadsheet.`,
      type: "success"
    });
  };

  // Memoized records for the Filtered Report Modal
  const modalFilteredData = useMemo(() => {
    const range = exportTimeRange;
    const start = exportCustomStart;
    const end = exportCustomEnd;
    const status = exportStatus;

    if (exportDomain === "claims" || exportDomain === "financial") {
      const list = claims.filter((c) => {
        if (status !== "all" && c.status.toLowerCase() !== status.toLowerCase()) return false;
        if (exportDomain === "financial" && c.status !== "Approved") return false;
        return matchesDateRange(c.createdAt, range, start, end);
      });
      const totalSum = list.reduce((acc, c) => acc + (c.amount || 0), 0);
      return { list, count: list.length, totalSum };
    } else if (exportDomain === "policyholders") {
      const list = policyHolders.filter((h) => {
        if (status !== "all" && h.status?.toLowerCase() !== status.toLowerCase()) return false;
        return matchesDateRange(h.createdAt, range, start, end);
      });
      const vehiclesCount = list.reduce((acc, h) => acc + (h.vehicles?.length || 0), 0);
      return { list, count: list.length, totalSum: vehiclesCount };
    } else if (exportDomain === "renewals") {
      const list = renewals.filter((r) => {
        if (status !== "all") {
          if (status === "Paid" && !r.isPaid) return false;
          if (status === "Pending" && (r.isPaid || (r.renewalQuote && r.renewalQuote.status !== "Pending_Payment" && r.renewalQuote.status !== "Draft"))) return false;
          if (status === "Calculated" && (!r.renewalQuote || r.renewalQuote.status !== "Calculated")) return false;
          if (status === "Expiring Soon" && !(r.vehicle.daysRemaining >= 0 && r.vehicle.daysRemaining <= 45)) return false;
        }
        const targetDate = r.latestPaymentDate || r.vehicle.calculatedExpiryDate || r.vehicle.policyExpiryDate;
        return matchesDateRange(targetDate, range, start, end);
      });
      const totalPremiums = list.reduce((acc, r) => {
        if (r.isPaid && r.renewalQuote?.calculation?.finalAnnualTotal) return acc + r.renewalQuote.calculation.finalAnnualTotal;
        return acc;
      }, 0);
      return { list, count: list.length, totalSum: totalPremiums };
    } else {
      const list = agents.filter((a) => {
        if (status !== "all" && a.status?.toLowerCase() !== status.toLowerCase()) return false;
        return matchesDateRange(a.createdAt, range, start, end);
      });
      return { list, count: list.length, totalSum: list.length };
    }
  }, [claims, policyHolders, renewals, agents, exportDomain, exportTimeRange, exportCustomStart, exportCustomEnd, exportStatus]);

  // Download filtered CSV from the modal
  const handleDownloadFilteredCSVModal = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    const branchName = branch || "Galle";
    const rangeLabel = exportTimeRange === "custom" && exportCustomStart && exportCustomEnd
      ? `${exportCustomStart}_to_${exportCustomEnd}`
      : exportTimeRange;

    if (exportDomain === "claims") {
      csvContent += "Claim Number,Policyholder Name,NIC,Vehicle Number,Damage Type,Claim Amount (LKR),Status,Assigned Agent,Incident Date,Turnaround (Days)\n";
      modalFilteredData.list.forEach((c: any) => {
        const row = [
          `"${c.claimNumber}"`,
          `"${c.policyHolderName || "Client"}"`,
          `"${c.userNic || "-"}"`,
          `"${c.vehicleNumber || "-"}"`,
          `"${c.damageType || "Accident"}"`,
          `"${c.amount || 0}"`,
          `"${c.status || "Pending"}"`,
          `"${c.assignedAgent || "Unassigned"}"`,
          `"${c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-GB") : "-"}"`,
          `"${calculateTAT(c.createdAt, c.updatedAt)}"`
        ];
        csvContent += row.join(",") + "\n";
      });
    } else if (exportDomain === "financial") {
      csvContent += "Claim Number,Policyholder,NIC,Vehicle Number,Settled Payout (LKR),Status,Bank Name,Branch Name,Account Number,Account Holder,Settlement Date\n";
      modalFilteredData.list.forEach((c: any) => {
        const b = c.policyHolderBankDetails || { bankName: c.bankName, branchName: c.bankBranch, accountNumber: c.bankAccount, accountHolderName: c.accountHolderName };
        const row = [
          `"${c.claimNumber}"`,
          `"${c.policyHolderName || "Client"}"`,
          `"${c.userNic || "-"}"`,
          `"${c.vehicleNumber || "-"}"`,
          `"${c.amount || 0}"`,
          `"Approved - Settled"`,
          `"${b.bankName || "-"}"`,
          `"${b.branchName || "-"}"`,
          `"${b.accountNumber || "-"}"`,
          `"${b.accountHolderName || c.policyHolderName || "-"}"`,
          `"${c.updatedAt ? new Date(c.updatedAt).toLocaleDateString("en-GB") : (c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-GB") : "-")}"`
        ];
        csvContent += row.join(",") + "\n";
      });
    } else if (exportDomain === "policyholders") {
      csvContent += "Reference No,Full Name,NIC,Mobile,Email,City,Vehicles Insured,Primary Vehicle Number,Status,Registered Date\n";
      modalFilteredData.list.forEach((h: any) => {
        const primaryVeh = h.vehicles && h.vehicles.length > 0 ? h.vehicles[0] : null;
        const row = [
          `"${h.referenceNumber || "SAN-PH"}"`,
          `"${h.firstName} ${h.lastName}"`,
          `"${h.nic}"`,
          `"${h.mobile || "-"}"`,
          `"${h.email || "-"}"`,
          `"${h.city || "-"}"`,
          `"${h.vehicles?.length || 0}"`,
          `"${primaryVeh ? primaryVeh.numberPlate : "-"}"`,
          `"${h.status || "Approved"}"`,
          `"${h.createdAt ? new Date(h.createdAt).toLocaleDateString("en-GB") : "-"}"`
        ];
        csvContent += row.join(",") + "\n";
      });
    } else if (exportDomain === "renewals") {
      csvContent += "Vehicle Number,Model,Type,Policy Number,Owner Name,NIC,Mobile,Policy Expiry Date,Days Remaining,Renewal Status,Quote Total (LKR),Payment Plan,Installments Paid\n";
      modalFilteredData.list.forEach((r: any) => {
        const quote = r.renewalQuote;
        const paidInstCount = quote?.installments?.filter((i: any) => i.status === "Paid").length || 0;
        const totalInstCount = quote?.installments?.length || 0;
        const row = [
          `"${r.vehicle.numberPlate}"`,
          `"${r.vehicle.company || ""} ${r.vehicle.model || ""}"`,
          `"${r.vehicle.type || "-"}"`,
          `"${r.vehicle.policyNumber || "-"}"`,
          `"${r.owner.name}"`,
          `"${r.owner.nic}"`,
          `"${r.owner.mobile || "-"}"`,
          `"${formatDate(r.vehicle.calculatedExpiryDate || r.vehicle.policyExpiryDate)}"`,
          `"${r.vehicle.daysRemaining}"`,
          `"${r.isPaid ? "Paid" : quote ? quote.status : "Pending Quote"}"`,
          `"${quote?.calculation?.finalAnnualTotal || 0}"`,
          `"${quote?.paymentPlanType || (quote?.selectedPlan ? "Annual" : "-")}"`,
          `"${totalInstCount > 0 ? `${paidInstCount}/${totalInstCount}` : r.isPaid ? "Full" : "0"}"`
        ];
        csvContent += row.join(",") + "\n";
      });
    } else {
      csvContent += "Agent Code,Full Name,Email,Phone,Branch,Status,Joined Date\n";
      modalFilteredData.list.forEach((a: any, idx: number) => {
        const row = [
          `"SAN-AGT-${100 + idx}"`,
          `"${a.name}"`,
          `"${a.email}"`,
          `"${a.phone}"`,
          `"${a.branch} Branch"`,
          `"${a.status || "Active"}"`,
          `"${a.createdAt ? new Date(a.createdAt).toLocaleDateString("en-GB") : "-"}"`
        ];
        csvContent += row.join(",") + "\n";
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Sanasa_${branchName}_Filtered_${exportDomain}_${rangeLabel}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setShowFilteredReportModal(false);
    setPopup({
      show: true,
      title: "Filtered Report Exported",
      message: `Exported ${modalFilteredData.count} filtered records for ${branchName} Branch (${exportDomain.toUpperCase()} - ${exportTimeRange}).`,
      type: "success"
    });
  };

  // Printable Filtered Dossier from the modal
  const handlePrintFilteredDossierModal = () => {
    const branchName = branch || "Galle";
    const reportDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    const reportTime = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const rangeText = exportTimeRange === "custom" && exportCustomStart && exportCustomEnd
      ? `Custom Window: ${exportCustomStart} to ${exportCustomEnd}`
      : `Preset Window: ${exportTimeRange.replace("_", " ").toUpperCase()}`;

    let rowsHtml = "";
    if (exportDomain === "claims" || exportDomain === "financial") {
      rowsHtml = `
        <thead>
          <tr>
            <th>Claim No</th>
            <th>Policyholder</th>
            <th>Vehicle No</th>
            <th>Damage Type</th>
            <th>Amount (LKR)</th>
            <th>Status</th>
            <th>Agent</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${modalFilteredData.list.map((c: any) => `
            <tr>
              <td style="font-family: monospace; font-weight: bold;">${c.claimNumber}</td>
              <td>${c.policyHolderName || "Client"}<br/><small style="color: #64748b;">${c.userNic || "-"}</small></td>
              <td style="font-family: monospace;">${c.vehicleNumber || "-"}</td>
              <td>${c.damageType || "Accident"}</td>
              <td style="font-weight: 700; text-align: right;">${formatLKR(c.amount || 0)}</td>
              <td><span class="badge badge-${c.status?.toLowerCase().replace(" ", "") || "pending"}">${c.status || "Pending"}</span></td>
              <td>${c.assignedAgent || "Unassigned"}</td>
              <td>${c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-GB") : "-"}</td>
            </tr>
          `).join("")}
        </tbody>
      `;
    } else if (exportDomain === "renewals") {
      rowsHtml = `
        <thead>
          <tr>
            <th>Vehicle No</th>
            <th>Model & Type</th>
            <th>Policyholder</th>
            <th>Policy Expiry</th>
            <th>Days Left</th>
            <th>Status</th>
            <th>Quote (LKR)</th>
          </tr>
        </thead>
        <tbody>
          ${modalFilteredData.list.map((r: any) => `
            <tr>
              <td style="font-family: monospace; font-weight: bold;">${r.vehicle.numberPlate}</td>
              <td>${r.vehicle.company || ""} ${r.vehicle.model || ""}<br/><small style="color: #64748b;">${r.vehicle.type || "-"}</small></td>
              <td>${r.owner.name}<br/><small style="color: #64748b;">${r.owner.nic}</small></td>
              <td>${formatDate(r.vehicle.calculatedExpiryDate || r.vehicle.policyExpiryDate)}</td>
              <td style="font-weight: bold; color: ${r.vehicle.daysRemaining <= 10 ? '#b91c1c' : '#b45309'};">${r.vehicle.daysRemaining} days</td>
              <td><span class="badge ${r.isPaid ? 'badge-approved' : 'badge-pending'}">${r.isPaid ? 'Paid' : 'Pending'}</span></td>
              <td style="font-weight: 700; text-align: right;">${formatLKR(r.renewalQuote?.calculation?.finalAnnualTotal || 0)}</td>
            </tr>
          `).join("")}
        </tbody>
      `;
    } else if (exportDomain === "policyholders") {
      rowsHtml = `
        <thead>
          <tr>
            <th>Reference No</th>
            <th>Full Name</th>
            <th>NIC</th>
            <th>Mobile</th>
            <th>City</th>
            <th>Vehicles Insured</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${modalFilteredData.list.map((h: any) => `
            <tr>
              <td style="font-family: monospace; font-weight: bold;">${h.referenceNumber || "SAN-PH"}</td>
              <td>${h.firstName} ${h.lastName}</td>
              <td style="font-family: monospace;">${h.nic}</td>
              <td>${h.mobile || "-"}</td>
              <td>${h.city || "-"}</td>
              <td style="font-weight: bold; text-align: center;">${h.vehicles?.length || 0}</td>
              <td><span class="badge badge-approved">${h.status || "Approved"}</span></td>
            </tr>
          `).join("")}
        </tbody>
      `;
    } else {
      rowsHtml = `
        <thead>
          <tr>
            <th>Agent Code</th>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Branch</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${modalFilteredData.list.map((a: any, idx: number) => `
            <tr>
              <td style="font-family: monospace; font-weight: bold;">SAN-AGT-${100 + idx}</td>
              <td>${a.name}</td>
              <td>${a.email}</td>
              <td>${a.phone}</td>
              <td>${a.branch} Branch</td>
              <td><span class="badge badge-approved">${a.status || "Active"}</span></td>
            </tr>
          `).join("")}
        </tbody>
      `;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Sanasa Insurance - Filtered ${exportDomain.toUpperCase()} Audit Dossier</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 36px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #102A43; padding-bottom: 18px; margin-bottom: 20px; }
          .company { font-size: 20px; font-weight: 800; color: #102A43; text-transform: uppercase; letter-spacing: 0.5px; }
          .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; font-weight: 500; }
          .meta { text-align: right; font-size: 11px; color: #64748b; line-height: 1.5; }
          .filter-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px; margin-bottom: 20px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; font-size: 11px; }
          .filter-card .item-label { color: #64748b; text-transform: uppercase; font-weight: 700; font-size: 10px; margin-bottom: 3px; }
          .filter-card .item-val { font-weight: 800; color: #0f172a; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 24px; }
          th { text-align: left; padding: 8px 10px; background: #f1f5f9; color: #475569; font-weight: 700; font-size: 10px; text-transform: uppercase; border: 1px solid #cbd5e1; }
          td { padding: 8px 10px; border: 1px solid #e2e8f0; color: #1e293b; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
          .badge-approved { background: #dcfce7; color: #15803d; }
          .badge-pending { background: #fef3c7; color: #b45309; }
          .badge-rejected { background: #fee2e2; color: #b91c1c; }
          .badge-inprogress { background: #dbeafe; color: #1d4ed8; }
          .footer-signs { margin-top: 36px; padding-top: 20px; border-top: 1px solid #cbd5e1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; font-size: 11px; color: #64748b; }
          .sign-col { text-align: center; }
          .sign-line { border-top: 1px dashed #94a3b8; margin-top: 40px; padding-top: 6px; font-weight: 600; }
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
            <div class="subtitle">${branchName} Regional Branch Office &bull; Official Detailed Audit Dossier</div>
          </div>
          <div class="meta">
            <div><strong>Report ID:</strong> SAN-RPT-${Date.now().toString().slice(-6)}</div>
            <div><strong>Generated:</strong> ${reportDate} &bull; ${reportTime}</div>
            <div><strong>Branch:</strong> ${branchName}</div>
          </div>
        </div>

        <div class="filter-card">
          <div>
            <div class="item-label">Module / Domain</div>
            <div class="item-val">${exportDomain.toUpperCase()}</div>
          </div>
          <div>
            <div class="item-label">Time Window</div>
            <div class="item-val">${rangeText}</div>
          </div>
          <div>
            <div class="item-label">Status Filter</div>
            <div class="item-val">${exportStatus === "all" ? "ALL STATUSES" : exportStatus.toUpperCase()}</div>
          </div>
          <div>
            <div class="item-label">Matched Records</div>
            <div class="item-val">${modalFilteredData.count} (${modalFilteredData.totalSum ? formatLKR(modalFilteredData.totalSum) : "Dataset"})</div>
          </div>
        </div>

        <table>
          ${rowsHtml}
        </table>

        <div class="footer-signs">
          <div class="sign-col">
            <div class="sign-line">Prepared By: Branch Claims Officer</div>
            <div>Date: ${reportDate}</div>
          </div>
          <div class="sign-col">
            <div class="sign-line">Verified By: Operations Manager</div>
            <div>Branch: ${branchName}</div>
          </div>
          <div class="sign-col">
            <div class="sign-line">Authorized Signatory & Official Seal</div>
            <div>Sanasa General Insurance</div>
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
    setShowFilteredReportModal(false);
  };

  // Handler for downloading single record case file report
  const handleDownloadRecordReport = (record: { type: "claim" | "holder" | "agent" | "renewal"; data: any }) => {
    const branchName = branch || "Galle";
    const reportDate = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
    const reportTime = new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit"
    });

    let docTitle = "";
    let contentHtml = "";

    if (record.type === "claim") {
      const c = record.data;
      const bankInfo = c.policyHolderBankDetails || {
        bankName: c.bankName,
        branchName: c.bankBranch,
        accountNumber: c.bankAccount,
        accountHolderName: c.accountHolderName
      };
      docTitle = `Sanasa_Claim_Report_${c.claimNumber}`;

      contentHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>${c.claimNumber} - Official Claim Audit Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 40px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #102A43; padding-bottom: 20px; margin-bottom: 24px; }
            .company { font-size: 22px; font-weight: 800; color: #102A43; text-transform: uppercase; letter-spacing: 0.5px; }
            .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; font-weight: 500; }
            .meta { text-align: right; font-size: 12px; color: #64748b; line-height: 1.5; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
            .badge-approved { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
            .badge-pending { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
            .badge-progress { background: #dbeafe; color: #1d4ed8; border: 1px solid #bfdbfe; }
            .badge-rejected { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
            .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; color: #102A43; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-top: 24px; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; }
            th { text-align: left; padding: 8px 12px; background: #f8fafc; color: #64748b; font-weight: 600; font-size: 11px; text-transform: uppercase; border: 1px solid #e2e8f0; }
            td { padding: 10px 12px; border: 1px solid #e2e8f0; color: #334155; }
            .label { font-weight: 600; color: #475569; width: 35%; background: #f8fafc; }
            .val { font-weight: 500; color: #0f172a; }
            .highlight { font-weight: 700; color: #0f172a; font-family: monospace; }
            .amount { font-size: 16px; font-weight: 800; color: #15803d; font-family: monospace; }
            .desc-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 13px; color: #334155; line-height: 1.6; margin-top: 6px; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; }
            .signature-box { margin-top: 40px; display: flex; justify-content: space-between; }
            .signature-line { width: 180px; border-top: 1px dashed #94a3b8; text-align: center; padding-top: 6px; font-size: 11px; color: #64748b; }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="company">Sanasa General Insurance Co. LTD</div>
              <div class="subtitle">Branch Operations & Claims Audit Division • ${branchName} Branch</div>
            </div>
            <div class="meta">
              <div><strong>Document Ref:</strong> ${c.claimNumber}</div>
              <div><strong>Date Generated:</strong> ${reportDate} ${reportTime}</div>
              <div style="margin-top: 6px;">
                <span class="badge ${
                  c.status === "Approved" ? "badge-approved" : c.status === "In Progress" ? "badge-progress" : c.status === "Pending" ? "badge-pending" : "badge-rejected"
                }">${c.status || "Pending"}</span>
              </div>
            </div>
          </div>

          <div class="section-title">1. Claim & Policyholder Information</div>
          <table>
            <tr>
              <td class="label">Claim Reference Number</td>
              <td class="val highlight">${c.claimNumber}</td>
            </tr>
            <tr>
              <td class="label">Policyholder Full Name</td>
              <td class="val"><strong>${c.policyHolderName || "Client"}</strong></td>
            </tr>
            <tr>
              <td class="label">National Identity Card (NIC)</td>
              <td class="val highlight">${c.userNic || "-"}</td>
            </tr>
            <tr>
              <td class="label">Contact Mobile / Email</td>
              <td class="val">${c.policyHolderMobile || "-"} / ${c.policyHolderEmail || "-"}</td>
            </tr>
            <tr>
              <td class="label">Lodged Date & Time</td>
              <td class="val">${formatSriLankaDateTime(c.createdAt)}</td>
            </tr>
          </table>

          <div class="section-title">2. Vehicle & Incident Assessment</div>
          <table>
            <tr>
              <td class="label">Vehicle Registration Number</td>
              <td class="val highlight">${c.vehicleNumber || "-"}</td>
            </tr>
            <tr>
              <td class="label">Vehicle Model / Category</td>
              <td class="val">${c.vehicleModel || c.vehicleType || "Standard Motor Vehicle"}</td>
            </tr>
            <tr>
              <td class="label">Damage Classification</td>
              <td class="val"><strong>${c.damageType || "Accident Collision"}</strong></td>
            </tr>
            <tr>
              <td class="label">Incident Location</td>
              <td class="val">${c.incidentLocation || `${branchName} District`}</td>
            </tr>
            <tr>
              <td class="label">Assigned Field Assessor</td>
              <td class="val">${c.assignedAgent || "Unassigned"}</td>
            </tr>
            <tr>
              <td class="label">Processing Turnaround (TAT)</td>
              <td class="val">${calculateTAT(c.createdAt, c.updatedAt)}</td>
            </tr>
          </table>

          ${c.description ? `
            <div style="margin-bottom: 16px;">
              <strong style="font-size: 12px; color: #475569; text-transform: uppercase;">Surveyor & Incident Details:</strong>
              <div class="desc-box">${c.description}</div>
            </div>
          ` : ""}

          <div class="section-title">3. Financial Settlement & Direct Banking</div>
          <table>
            <tr>
              <td class="label">Approved Settlement Amount</td>
              <td class="val amount">${formatLKR(c.amount)}</td>
            </tr>
            <tr>
              <td class="label">Settlement Status</td>
              <td class="val"><strong>${c.status === "Approved" ? "Approved for CEFT Electronic Settlement" : c.status}</strong></td>
            </tr>
            <tr>
              <td class="label">Bank Name</td>
              <td class="val">${bankInfo.bankName || "Commercial Bank of Ceylon"}</td>
            </tr>
            <tr>
              <td class="label">Branch Name</td>
              <td class="val">${bankInfo.branchName || `${branchName} Branch`}</td>
            </tr>
            <tr>
              <td class="label">Bank Account Number</td>
              <td class="val highlight">${bankInfo.accountNumber || "10023456789"}</td>
            </tr>
            <tr>
              <td class="label">Account Beneficiary Name</td>
              <td class="val">${bankInfo.accountHolderName || c.policyHolderName || "Client"}</td>
            </tr>
            <tr>
              <td class="label">Electronic Transfer Mode</td>
              <td class="val">Direct Electronic CEFT / SLIPS Transfer</td>
            </tr>
          </table>

          <div class="signature-box">
            <div class="signature-line">
              Prepared by: Office Staff
            </div>
            <div class="signature-line">
              Authorized Claims Assessor
            </div>
            <div class="signature-line">
              Branch Seal / Stamp
            </div>
          </div>

          <div class="footer">
            <div>Confidential • Sanasa General Insurance Company Limited • ${branchName} Regional Hub</div>
            <div>Official Audit Copy</div>
          </div>
        </body>
        </html>
      `;
    } else if (record.type === "holder") {
      const h = record.data;
      docTitle = `Sanasa_Policyholder_Report_${h.nic || h.referenceNumber}`;
      contentHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>${h.firstName} ${h.lastName} - Policyholder Profile Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 40px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #102A43; padding-bottom: 20px; margin-bottom: 24px; }
            .company { font-size: 22px; font-weight: 800; color: #102A43; text-transform: uppercase; }
            .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; font-weight: 500; }
            .meta { text-align: right; font-size: 12px; color: #64748b; line-height: 1.5; }
            .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; color: #102A43; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-top: 24px; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; }
            th { text-align: left; padding: 8px 12px; background: #f8fafc; color: #64748b; font-weight: 600; font-size: 11px; text-transform: uppercase; border: 1px solid #e2e8f0; }
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
              <div class="subtitle">Policyholder Portfolio Profile • ${branchName} Branch</div>
            </div>
            <div class="meta">
              <div><strong>Ref No:</strong> ${h.referenceNumber || "SAN-PH"}</div>
              <div><strong>Date Generated:</strong> ${reportDate} ${reportTime}</div>
            </div>
          </div>

          <div class="section-title">1. Policyholder Profile</div>
          <table>
            <tr><td class="label">Reference Number</td><td class="val highlight">${h.referenceNumber || "SAN-PH"}</td></tr>
            <tr><td class="label">Full Name</td><td class="val"><strong>${h.firstName} ${h.lastName}</strong></td></tr>
            <tr><td class="label">National Identity Card (NIC)</td><td class="val highlight">${h.nic}</td></tr>
            <tr><td class="label">Mobile Number</td><td class="val">${h.mobile || "-"}</td></tr>
            <tr><td class="label">Email Address</td><td class="val">${h.email || "-"}</td></tr>
            <tr><td class="label">Residential City / District</td><td class="val">${h.city || branchName}</td></tr>
            <tr><td class="label">Operating Branch</td><td class="val">${h.branch || branchName} Branch</td></tr>
            <tr><td class="label">Account Registration Date</td><td class="val">${formatDate(h.createdAt)}</td></tr>
            <tr><td class="label">Status</td><td class="val"><strong>${h.status || "Approved"}</strong></td></tr>
          </table>

          <div class="section-title">2. Insured Vehicles (${h.vehicles?.length || 0} Registered)</div>
          <table>
            <thead>
              <tr>
                <th>Vehicle Number</th>
                <th>Policy Number</th>
                <th>Vehicle Type</th>
                <th>Make / Model</th>
              </tr>
            </thead>
            <tbody>
              ${(h.vehicles && h.vehicles.length > 0) ? h.vehicles.map((v: any) => `
                <tr>
                  <td class="highlight">${v.numberPlate || "-"}</td>
                  <td class="highlight">${v.policyNumber || "-"}</td>
                  <td>${v.vehicleType || "Motor Vehicle"}</td>
                  <td>${v.company || ""} ${v.model || ""} ${v.year ? `(${v.year})` : ""}</td>
                </tr>
              `).join("") : `
                <tr><td colspan="4" style="text-align:center;color:#94a3b8;">No registered vehicles on record.</td></tr>
              `}
            </tbody>
          </table>

          <div class="signature-box">
            <div class="signature-line">
              Branch Officer
            </div>
            <div class="signature-line">
              Underwriting Manager
            </div>
          </div>

          <div class="footer">
            <div>Confidential • Sanasa General Insurance Company Limited • ${branchName} Regional Hub</div>
            <div>Official Audit Copy</div>
          </div>
        </body>
        </html>
      `;
    } else if (record.type === "renewal") {
      const r = record.data as VehicleRenewalRecord;
      const quote = r.renewalQuote;
      const isPaid = r.isPaid;
      docTitle = `Sanasa_Renewal_Audit_Report_${r.vehicle.numberPlate}`;

      contentHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>${r.vehicle.numberPlate} - Policy Renewal & Coverage Audit Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 40px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #102A43; padding-bottom: 20px; margin-bottom: 24px; }
            .company { font-size: 22px; font-weight: 800; color: #102A43; text-transform: uppercase; letter-spacing: 0.5px; }
            .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; font-weight: 500; }
            .meta { text-align: right; font-size: 12px; color: #64748b; line-height: 1.5; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
            .badge-paid { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
            .badge-pending { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
            .badge-calculated { background: #dbeafe; color: #1d4ed8; border: 1px solid #bfdbfe; }
            .badge-expired { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
            .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; color: #102A43; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-top: 24px; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; }
            th { text-align: left; padding: 8px 12px; background: #f8fafc; color: #64748b; font-weight: 600; font-size: 11px; text-transform: uppercase; border: 1px solid #e2e8f0; }
            td { padding: 10px 12px; border: 1px solid #e2e8f0; color: #334155; }
            .label { font-weight: 600; color: #475569; width: 35%; background: #f8fafc; }
            .val { font-weight: 500; color: #0f172a; }
            .highlight { font-weight: 700; color: #0f172a; font-family: monospace; }
            .amount { font-size: 16px; font-weight: 800; color: #15803d; font-family: monospace; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; }
            .signature-box { margin-top: 40px; display: flex; justify-content: space-between; }
            .signature-line { width: 180px; border-top: 1px dashed #94a3b8; text-align: center; padding-top: 6px; font-size: 11px; color: #64748b; }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="company">Sanasa General Insurance Co. LTD</div>
              <div class="subtitle">Policy Renewal & Coverage Audit Division • ${branchName} Regional Hub</div>
            </div>
            <div class="meta">
              <div><strong>Plate Ref:</strong> ${r.vehicle.numberPlate}</div>
              <div><strong>Policy No:</strong> ${r.vehicle.policyNumber || "SAN-POL"}</div>
              <div><strong>Date Generated:</strong> ${reportDate} ${reportTime}</div>
              <div style="margin-top: 6px;">
                <span class="badge ${
                  isPaid ? "badge-paid" : quote?.status === "Calculated" ? "badge-calculated" : r.vehicle.daysRemaining < 0 ? "badge-expired" : "badge-pending"
                }">${isPaid ? "Renewed & Paid" : quote?.status || "Pending Calculation"}</span>
              </div>
            </div>
          </div>

          <div class="section-title">1. Policyholder & Customer Information</div>
          <table>
            <tr>
              <td class="label">Customer Full Name</td>
              <td class="val"><strong>${r.owner.name}</strong></td>
            </tr>
            <tr>
              <td class="label">National Identity Card (NIC)</td>
              <td class="val highlight">${r.owner.nic}</td>
            </tr>
            <tr>
              <td class="label">Contact Mobile / Phone</td>
              <td class="val">${r.owner.mobile || "-"}</td>
            </tr>
            <tr>
              <td class="label">Email Address</td>
              <td class="val">${r.owner.email || "-"}</td>
            </tr>
            <tr>
              <td class="label">Regional Branch</td>
              <td class="val">${r.owner.branch || branchName} Branch</td>
            </tr>
          </table>

          <div class="section-title">2. Insured Vehicle & Policy Coverage Details</div>
          <table>
            <tr>
              <td class="label">Vehicle Registration Number</td>
              <td class="val highlight">${r.vehicle.numberPlate}</td>
            </tr>
            <tr>
              <td class="label">Vehicle Make & Model</td>
              <td class="val">${r.vehicle.company || ""} ${r.vehicle.model || "Vehicle"} ${r.vehicle.yearOfManufacture ? `(${r.vehicle.yearOfManufacture})` : ""}</td>
            </tr>
            <tr>
              <td class="label">Vehicle Classification</td>
              <td class="val">${r.vehicle.type || "Comprehensive Private Motor"}</td>
            </tr>
            <tr>
              <td class="label">Policy Number</td>
              <td class="val highlight">${r.vehicle.policyNumber || "SAN-POL-AUTO"}</td>
            </tr>
            <tr>
              <td class="label">Current Policy Expiry Date</td>
              <td class="val"><strong>${formatDate(r.vehicle.calculatedExpiryDate || r.vehicle.policyExpiryDate)}</strong> (${r.vehicle.daysRemaining >= 0 ? `${r.vehicle.daysRemaining} days remaining` : `${Math.abs(r.vehicle.daysRemaining)} days overdue`})</td>
            </tr>
          </table>

          <div class="section-title">3. Renewal Quotation Breakdown</div>
          <table>
            <tr>
              <td class="label">Renewal Quote Number</td>
              <td class="val highlight">${quote?.quoteNumber || "QUOTE-PENDING"}</td>
            </tr>
            <tr>
              <td class="label">Selected Coverage Plan</td>
              <td class="val"><strong>${quote?.selectedPlan || "Comprehensive Standard"}</strong></td>
            </tr>
            <tr>
              <td class="label">Base Annual Premium</td>
              <td class="val">${formatLKR(quote?.calculation?.basePremium)}</td>
            </tr>
            <tr>
              <td class="label">No Claim Bonus (NCB) Discount</td>
              <td class="val font-semibold text-emerald-700">-${formatLKR(quote?.calculation?.ncDiscountAmount)}</td>
            </tr>
            <tr>
              <td class="label">Taxes & Regulatory Levies</td>
              <td class="val">${formatLKR(quote?.calculation?.taxesAndLevies)}</td>
            </tr>
            <tr>
              <td class="label">Final Total Renewal Premium</td>
              <td class="val amount">${formatLKR(quote?.calculation?.finalAnnualTotal)}</td>
            </tr>
          </table>

          <div class="section-title">4. Payment & Installment Audit</div>
          <table>
            <tr>
              <td class="label">Payment Status</td>
              <td class="val"><strong>${isPaid ? "Payment Verified (Active)" : "Pending Payment"}</strong></td>
            </tr>
            <tr>
              <td class="label">Payment Plan Selected</td>
              <td class="val">${quote?.paymentPlanType || (isPaid ? "Full Annual Payment" : "Annual")}</td>
            </tr>
            <tr>
              <td class="label">Payment Reference</td>
              <td class="val highlight">${quote?.paymentReference || (isPaid ? "VERIFIED-DIRECT" : "-")}</td>
            </tr>
            <tr>
              <td class="label">Latest Transaction / Payment Date</td>
              <td class="val">${r.latestPaymentDate ? formatSriLankaDateTime(r.latestPaymentDate) : "-"}</td>
            </tr>
          </table>

          ${quote?.installments && quote.installments.length > 0 ? `
            <div style="margin-top: 12px;">
              <strong style="font-size: 11px; text-transform: uppercase; color: #475569;">Installment Schedule Breakdown:</strong>
              <table style="margin-top: 6px;">
                <thead>
                  <tr>
                    <th>Installment</th>
                    <th>Due Date</th>
                    <th>Amount (LKR)</th>
                    <th>Status</th>
                    <th>Settlement Date</th>
                  </tr>
                </thead>
                <tbody>
                  ${quote.installments.map(inst => `
                    <tr>
                      <td class="highlight">Installment #${inst.installmentIndex}</td>
                      <td>${formatDate(inst.dueDate)}</td>
                      <td class="highlight">${formatLKR(inst.amount)}</td>
                      <td><span class="badge ${inst.status === "Paid" ? "badge-paid" : "badge-pending"}">${inst.status}</span></td>
                      <td>${inst.paidAt ? formatSriLankaDateTime(inst.paidAt) : "-"}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          ` : ""}

          <div class="signature-box">
            <div class="signature-line">
              Prepared by: Renewal Officer
            </div>
            <div class="signature-line">
              Branch Underwriting Head
            </div>
            <div class="signature-line">
              Official Branch Seal
            </div>
          </div>

          <div class="footer">
            <div>Confidential • Sanasa General Insurance Company Limited • ${branchName} Regional Hub</div>
            <div>Official Policy Renewal Audit Record</div>
          </div>
        </body>
        </html>
      `;
    } else {
      const a = record.data;
      docTitle = `Sanasa_Agent_Report_${a.name ? a.name.replace(/\s+/g, "_") : "Agent"}`;
      contentHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>${a.name} - Agent Profile Report</title>
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
              <div class="subtitle">Field Agent Profile & Performance Report • ${branchName} Branch</div>
            </div>
            <div class="meta">
              <div><strong>Agent Name:</strong> ${a.name}</div>
              <div><strong>Date Generated:</strong> ${reportDate} ${reportTime}</div>
            </div>
          </div>

          <div class="section-title">1. Field Agent Details</div>
          <table>
            <tr><td class="label">Agent Name</td><td class="val"><strong>${a.name}</strong></td></tr>
            <tr><td class="label">Email Address</td><td class="val">${a.email}</td></tr>
            <tr><td class="label">Contact Phone</td><td class="val highlight">${a.phone || "-"}</td></tr>
            <tr><td class="label">Assigned Branch</td><td class="val">${a.branch} Branch</td></tr>
            <tr><td class="label">Operating Status</td><td class="val"><strong>${a.status || "Active"}</strong></td></tr>
          </table>

          <div class="signature-box">
            <div class="signature-line">
              Branch Operations Head
            </div>
          </div>

          <div class="footer">
            <div>Confidential • Sanasa General Insurance Company Limited • ${branchName} Regional Hub</div>
            <div>Official Audit Copy</div>
          </div>
        </body>
        </html>
      `;
    }

    // Direct download as an HTML/Doc report file
    const blob = new Blob([contentHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${docTitle}_${new Date().toISOString().split("T")[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Also trigger printable preview window
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

    setPopup({
      show: true,
      title: "Case Report Downloaded",
      message: `The official audit report for ${
        record.type === "renewal"
          ? record.data.vehicle.numberPlate
          : record.data.claimNumber || record.data.name || record.data.nic
      } has been downloaded and prepared for printing/PDF export.`,
      type: "success"
    });
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Pagination data
  // Pagination data
  const currentDataset =
    activeReportType === "claims"
      ? filteredClaims
      : activeReportType === "financial"
      ? filteredClaims.filter((c) => c.status === "Approved")
      : activeReportType === "policyholders"
      ? filteredHolders
      : activeReportType === "renewals"
      ? filteredRenewals
      : activeReportType === "agents"
      ? filteredAgents
      : [];

  const totalPages = Math.ceil(currentDataset.length / rowsPerPage) || 1;
  const paginatedData = currentDataset.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
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
        <OfficeStaffNavbar />

        <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
          {/* Top Header Bar */}
          <header className="bg-white border-b border-slate-100 text-slate-800 px-8 py-4 flex justify-between items-center select-none shadow-sm shrink-0 h-[80px] sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("open-mobile-menu"))}
                className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 active:scale-95 transition-all cursor-pointer focus:outline-none"
                aria-label="Open mobile navigation menu"
              >
                <HugeiconsIcon icon={Menu01Icon} className="w-6 h-6" strokeWidth={2.5} />
              </button>
              {/* Mobile page title */}
              <h1 className="lg:hidden text-lg font-semibold text-slate-800 tracking-tight">
                {branch} Reports
              </h1>
              {/* Desktop welcome title */}
              <h1 className="hidden lg:flex text-xl font-semibold text-slate-800 items-center gap-2 pl-2 lg:pl-0 truncate">
                <span className="bg-[#102A43] text-white text-base px-4 py-2 rounded-xl font-semibold shadow-sm tracking-wide">
                  {branch} Branch
                </span>
                <span className="hidden lg:inline"> — Operational Analytics & Branch Reports</span>
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-sm font-semibold bg-slate-100 px-4 py-2 rounded-full text-slate-600 border border-slate-200">
                Office Staff
              </div>
              <Link
                href="/Office_Staff/Notifications"
                className="relative p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer focus:outline-none flex items-center justify-center"
                aria-label="Notifications"
              >
                <HugeiconsIcon icon={Notification01Icon} className="w-6 h-6 text-slate-500 hover:text-slate-800" strokeWidth={2} />
              </Link>
              <UserAvatarDropdown userType="office_staff" />
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 p-6 lg:p-8 bg-slate-50 flex flex-col gap-6 max-w-7xl w-full mx-auto">
            {loading ? (
              <SimpleLoader message="Compiling branch reporting matrices & analytics..." theme="slate" />
            ) : error ? (
              <div className="max-w-4xl mx-auto p-6 bg-red-50 text-red-600 rounded-2xl border border-red-200 text-center font-medium">
                {error}
              </div>
            ) : (
              <>
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
                      <div className="text-2xl font-black text-slate-900 leading-tight">
                        {summaryStats.totalClaims || claims.length}
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500 font-semibold">
                        <span className="text-emerald-600 font-bold">
                          {summaryStats.approvedClaims || claims.filter((c) => c.status === "Approved").length} Approved
                        </span>
                        <span className="text-amber-600">
                          {summaryStats.pendingClaims || claims.filter((c) => c.status === "Pending").length} Pending
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Approved Disbursements */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Approved Payout</span>
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <HugeiconsIcon icon={Analytics01Icon} className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="text-xl font-black text-emerald-600 leading-tight truncate" title={formatLKR(summaryStats.totalPayoutAmount || totalSettledPayouts)}>
                        {formatLKR(summaryStats.totalPayoutAmount || totalSettledPayouts)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold mt-1 truncate">
                        Avg: {formatLKR(averageClaimValue)} / claim
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
                      <div className="text-2xl font-black text-slate-900 leading-tight">
                        {policyHolders.length}
                      </div>
                      <div className="text-[10px] text-indigo-600 font-bold mt-1">
                        {totalVehiclesCount} Insured Fleet Vehicles
                      </div>
                    </div>
                  </div>

                  {/* Card 4: Field Agents Duty Readiness */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Field Force</span>
                      <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                        <HugeiconsIcon icon={Briefcase01Icon} className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="text-2xl font-black text-slate-900 leading-tight flex items-baseline gap-1.5">
                        <span>{summaryStats.activeAgents || agents.length}</span>
                        <span className="text-xs font-bold text-emerald-600">Assigned</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold mt-1">
                        {branch} District Patrol
                      </div>
                    </div>
                  </div>

                  {/* Card 5: Policy Renewals */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Renewals Due</span>
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                        <HugeiconsIcon icon={RefreshIcon} className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="text-2xl font-black text-amber-600 leading-tight">
                        {expiringPoliciesCount}
                      </div>
                      <div className="text-[10px] text-emerald-700 font-bold mt-1 truncate">
                        {renewedPoliciesCount} Paid ({formatLKR(totalRenewalPremiumsCollected)})
                      </div>
                    </div>
                  </div>

                  {/* Card 6: Claims Clearance Rate */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Clearance Rate</span>
                      <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                        <HugeiconsIcon icon={SecurityCheckIcon} className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="text-2xl font-black text-emerald-600 leading-tight">
                        {approvalRate}
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold mt-1">
                        Settlement Ratio
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
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setCurrentPage(1);
                        }}
                        placeholder="Search claims, policyholders, plates, agents, quotes..."
                        className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-transparent transition-all shadow-2xs bg-slate-50/50 font-medium"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer border-none bg-transparent"
                        >
                          <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
                      <button
                        onClick={() => {
                          setExportDomain(activeReportType === "overview" || activeReportType === "analytics" ? "claims" : activeReportType);
                          setExportTimeRange(dateRange);
                          setExportCustomStart(customStartDate);
                          setExportCustomEnd(customEndDate);
                          setExportStatus(statusFilter);
                          setShowFilteredReportModal(true);
                        }}
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
                        onClick={handleRefresh}
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
                        { id: "this_week", label: "Last 7 Days" },
                        { id: "this_month", label: "This Month" },
                        { id: "last_30", label: "Last 30 Days" },
                        { id: "this_quarter", label: "This Quarter" },
                        { id: "this_year", label: "This Year" },
                        { id: "custom", label: "Custom Range..." }
                      ].map((t) => {
                        const isSel = dateRange === t.id;
                        return (
                          <button
                            key={t.id}
                            onClick={() => {
                              setDateRange(t.id as any);
                              setCurrentPage(1);
                            }}
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
                {dateRange === "custom" && (
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs shadow-xs animate-in fade-in duration-150 select-none">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <HugeiconsIcon icon={Clock01Icon} className="w-4 h-4 text-blue-600" />
                        <span>Custom Branch Audit Window:</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] text-slate-500 font-medium">Start Date:</label>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => {
                            setCustomStartDate(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] text-slate-500 font-medium">End Date:</label>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => {
                            setCustomEndDate(e.target.value);
                            setCurrentPage(1);
                          }}
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
                            setCurrentPage(1);
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
                      { id: "overview", label: "Branch Overview", icon: Analytics01Icon, count: null },
                      { id: "claims", label: "Claims & Loss", icon: Shield01Icon, count: filteredClaims.length },
                      { id: "policyholders", label: "Policyholders & Fleet", icon: Car01Icon, count: filteredHolders.length },
                      { id: "renewals", label: "Policy Renewals", icon: RefreshIcon, count: filteredRenewals.length },
                      { id: "agents", label: "Field Agents", icon: Briefcase01Icon, count: filteredAgents.length },
                      { id: "financial", label: "Bank Disbursals", icon: Building01Icon, count: filteredClaims.filter((c) => c.status === "Approved").length },
                      { id: "analytics", label: "Risk & Incidents", icon: Location01Icon, count: null }
                    ].map((tab) => {
                      const isActive = activeReportType === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setActiveReportType(tab.id as any);
                            setCurrentPage(1);
                          }}
                          className={`flex-1 min-w-[145px] sm:min-w-[155px] flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-none outline-none whitespace-nowrap ${
                            isActive
                              ? "bg-[#000080] text-white shadow-md shadow-blue-900/20"
                              : "bg-white/80 hover:bg-white text-slate-600 hover:text-slate-900 shadow-2xs hover:shadow-xs"
                          }`}
                        >
                          <HugeiconsIcon icon={tab.icon} className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-500"}`} strokeWidth={2.5} />
                          <span>{tab.label}</span>
                          {tab.count !== null && (
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {tab.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* TAB 1: BRANCH EXECUTIVE OVERVIEW */}
                {activeReportType === "overview" && (
                  <div className="flex flex-col gap-6">
                    {/* Visual Charts Row 1: Claims Cadence & Settlement Efficiency */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Interactive CSS Bar Chart */}
                      <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                              <h3 className="text-sm font-bold text-slate-900">
                                Claims Cadence & Volume Trajectory ({new Date().getFullYear()})
                              </h3>
                              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                                Monthly claims intake vs approved & settled disbursements for {branch} Branch
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold">
                              <span className="flex items-center gap-1.5 text-slate-600">
                                <span className="w-2.5 h-2.5 rounded-xs bg-[#102A43]"></span>
                                <span>All ({claims.length})</span>
                              </span>
                              <span className="flex items-center gap-1.5 text-emerald-600">
                                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500"></span>
                                <span>Approved ({claims.filter((c) => c.status === "Approved").length})</span>
                              </span>
                              <span className="flex items-center gap-1.5 text-sky-600">
                                <span className="w-2.5 h-2.5 rounded-xs bg-sky-500"></span>
                                <span>Completed</span>
                              </span>
                              <span className="flex items-center gap-1.5 text-rose-600">
                                <span className="w-2.5 h-2.5 rounded-xs bg-rose-500"></span>
                                <span>Rejected</span>
                              </span>
                            </div>
                          </div>

                          {/* Chart Grid with 4-Bar Clusters per Month */}
                          <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 sm:gap-3 pt-6 items-end h-48 border-b border-slate-100 pb-3">
                            {monthlyMetrics.map((m, idx) => {
                              const allHeight = m.all > 0 ? Math.max(Math.round((m.all / maxMonthVal) * 100), 12) : 4;
                              const appHeight = m.approved > 0 ? Math.max(Math.round((m.approved / maxMonthVal) * 100), 12) : 4;
                              const compHeight = m.completed > 0 ? Math.max(Math.round((m.completed / maxMonthVal) * 100), 12) : 4;
                              const rejHeight = m.rejected > 0 ? Math.max(Math.round((m.rejected / maxMonthVal) * 100), 12) : 4;
                              const hasActivity = m.all > 0 || m.approved > 0 || m.completed > 0 || m.rejected > 0;

                              return (
                                <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end group relative">
                                  {/* Floating Hover Tooltip */}
                                  <div className="absolute -top-24 z-20 hidden group-hover:flex flex-col items-center pointer-events-none transition-all duration-150">
                                    <div className="bg-slate-900 text-white text-[10px] font-medium py-1.5 px-2.5 rounded-xl shadow-xl space-y-0.5 whitespace-nowrap min-w-[95px]">
                                      <div className="font-bold text-slate-200 border-b border-slate-700 pb-0.5 mb-0.5">
                                        {m.month} {new Date().getFullYear()}
                                      </div>
                                      <div className="flex justify-between gap-2">
                                        <span className="text-slate-400">All Claims:</span>
                                        <strong className="text-white">{m.all}</strong>
                                      </div>
                                      <div className="flex justify-between gap-2">
                                        <span className="text-emerald-400">Approved:</span>
                                        <strong className="text-emerald-300">{m.approved}</strong>
                                      </div>
                                      <div className="flex justify-between gap-2">
                                        <span className="text-sky-400">Completed:</span>
                                        <strong className="text-sky-300">{m.completed}</strong>
                                      </div>
                                      <div className="flex justify-between gap-2">
                                        <span className="text-rose-400">Rejected:</span>
                                        <strong className="text-rose-300">{m.rejected}</strong>
                                      </div>
                                    </div>
                                    <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1" />
                                  </div>

                                  {/* Cluster of 4 Bars */}
                                  <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-full px-0.5">
                                    <div
                                      style={{ height: `${allHeight}%` }}
                                      title={`All Claims: ${m.all}`}
                                      className={`w-full max-w-[6px] sm:max-w-[8px] rounded-t-sm transition-all duration-300 ${
                                        m.all > 0 ? "bg-[#102A43] group-hover:brightness-125" : "bg-slate-100"
                                      }`}
                                    />
                                    <div
                                      style={{ height: `${appHeight}%` }}
                                      title={`Approved: ${m.approved}`}
                                      className={`w-full max-w-[6px] sm:max-w-[8px] rounded-t-sm transition-all duration-300 ${
                                        m.approved > 0 ? "bg-emerald-500 group-hover:brightness-110" : "bg-slate-100"
                                      }`}
                                    />
                                    <div
                                      style={{ height: `${compHeight}%` }}
                                      title={`Completed: ${m.completed}`}
                                      className={`w-full max-w-[6px] sm:max-w-[8px] rounded-t-sm transition-all duration-300 ${
                                        m.completed > 0 ? "bg-sky-500 group-hover:brightness-110" : "bg-slate-100"
                                      }`}
                                    />
                                    <div
                                      style={{ height: `${rejHeight}%` }}
                                      title={`Rejected: ${m.rejected}`}
                                      className={`w-full max-w-[6px] sm:max-w-[8px] rounded-t-sm transition-all duration-300 ${
                                        m.rejected > 0 ? "bg-rose-500 group-hover:brightness-110" : "bg-slate-100"
                                      }`}
                                    />
                                  </div>

                                  <span className={`text-[10px] uppercase font-bold tracking-tight ${
                                    hasActivity ? "text-slate-700" : "text-slate-400"
                                  }`}>
                                    {m.month}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 mt-3 flex items-center justify-between text-xs font-semibold text-slate-600">
                          <span>Total Settled Claim Disbursements:</span>
                          <span className="text-emerald-700 font-bold">{formatLKR(summaryStats.totalPayoutAmount || totalSettledPayouts)}</span>
                        </div>
                      </div>

                      {/* Settlement Efficiency Widget */}
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
                                <span className="text-2xl font-black text-slate-900">{approvalRate}</span>
                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resolved</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2.5">
                            <div className="flex justify-between items-center text-xs font-semibold">
                              <span className="text-slate-500">Average Settlement:</span>
                              <span className="text-slate-800 font-bold">{formatLKR(averageClaimValue)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs font-semibold">
                              <span className="text-slate-500">Branch Patrol Force:</span>
                              <span className="text-purple-600 font-bold">{summaryStats.activeAgents || agents.length} Agents</span>
                            </div>
                            <div className="flex justify-between items-center text-xs font-semibold">
                              <span className="text-slate-500">Registered Clients:</span>
                              <span className="text-slate-800 font-bold">{policyHolders.length} Insured</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setActiveReportType("claims");
                            setCurrentPage(1);
                          }}
                          className="mt-4 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none"
                        >
                          <span>Inspect Claims & Payout Details</span>
                          <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Visual Charts Row 2: Damage Categories & Vehicle Fleet Mix */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Damage Category Matrix */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                          <div>
                            <h3 className="text-sm font-bold text-slate-900">Damage Classification Breakdown</h3>
                            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Accident collision nature for {branch} Branch</p>
                          </div>
                          <span className="text-xs font-bold text-[#000080] bg-blue-50 px-3 py-1 rounded-full border border-blue-200/60">
                            {damageCategories.length} Types
                          </span>
                        </div>

                        <div className="space-y-3.5">
                          {damageCategories.slice(0, 5).map((cat) => (
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
                            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Policyholder vehicle classifications</p>
                          </div>
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200/60">
                            {totalVehiclesCount} Total Fleet
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
                          <span>Jurisdiction:</span>
                          <span className="font-bold text-slate-800">{branch} Regional Network</span>
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
                              {branch} Branch renewal pipeline, expiring fleet policies & premium collections
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setActiveReportType("renewals")}
                            className="px-3.5 py-1.5 bg-[#000080] text-white text-xs font-bold rounded-xl hover:bg-[#102A43] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 border-none"
                          >
                            <span>Inspect Renewals Report</span>
                            <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5" />
                          </button>
                          <Link
                            href="/Office_Staff/Renewals"
                            className="px-3.5 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 no-underline"
                          >
                            <span>Open Renewals Page</span>
                          </Link>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-semibold">
                        <div className="p-4 bg-white rounded-xl border border-amber-200/80 shadow-2xs flex flex-col justify-between">
                          <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">Expiring in 45 Days</span>
                          <div className="text-2xl font-black text-amber-600 mt-2">{expiringPoliciesCount} Vehicles</div>
                          <span className="text-[10px] text-slate-400 font-semibold mt-1">Requires renewal quotation</span>
                        </div>

                        <div className="p-4 bg-white rounded-xl border border-emerald-200/80 shadow-2xs flex flex-col justify-between">
                          <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Renewals Paid & Finalized</span>
                          <div className="text-2xl font-black text-emerald-600 mt-2">{renewedPoliciesCount} Completed</div>
                          <span className="text-[10px] text-slate-400 font-semibold mt-1">Policies extended for next year</span>
                        </div>

                        <div className="p-4 bg-white rounded-xl border border-blue-200/80 shadow-2xs flex flex-col justify-between">
                          <span className="text-[10px] uppercase font-bold text-[#000080] tracking-wider">Renewal Premiums Collected</span>
                          <div className="text-xl font-black text-[#000080] mt-2 truncate" title={formatLKR(totalRenewalPremiumsCollected)}>
                            {formatLKR(totalRenewalPremiumsCollected)}
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold mt-1">Active collected renewal revenue</span>
                        </div>

                        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Pending Quotes & Action</span>
                          <div className="text-2xl font-black text-slate-800 mt-2">
                            {renewals.filter((r) => !r.isPaid && (!r.renewalQuote || r.renewalQuote.status === "Draft" || r.renewalQuote.status === "Pending_Payment")).length} Pending
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold mt-1">Awaiting customer payment</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: CLAIMS & LOSS ASSESSMENT */}
                {activeReportType === "claims" && (
                  <div className="flex flex-col gap-6">
                    {/* Financial KPI Summary Banner */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-5 rounded-2xl border-l-[6px] border-l-emerald-500 border border-slate-200 shadow-sm">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Approved Payout</span>
                        <div className="text-2xl font-black text-emerald-600 mt-1">{formatLKR(summaryStats.totalPayoutAmount || totalSettledPayouts)}</div>
                        <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">Dispatched to policyholders</span>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border-l-[6px] border-l-blue-500 border border-slate-200 shadow-sm">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Average Settlement</span>
                        <div className="text-2xl font-black text-slate-900 mt-1">{formatLKR(averageClaimValue)}</div>
                        <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">Per cleared claim case</span>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border-l-[6px] border-l-amber-500 border border-slate-200 shadow-sm">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Investigation</span>
                        <div className="text-2xl font-black text-amber-600 mt-1">
                          {summaryStats.pendingClaims || claims.filter((c) => c.status === "Pending").length} Cases
                        </div>
                        <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">Under surveyor review</span>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border-l-[6px] border-l-teal-500 border border-slate-200 shadow-sm">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Claims Clearance Rate</span>
                        <div className="text-2xl font-black text-teal-600 mt-1">{approvalRate}</div>
                        <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">Branch resolution ratio</span>
                      </div>
                    </div>

                    {/* Secondary Filters Bar */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 select-none">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Status Pills */}
                        {["all", "Approved", "Pending", "In Progress", "Rejected"].map((st) => (
                          <button
                            key={st}
                            onClick={() => {
                              setStatusFilter(st);
                              setCurrentPage(1);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-none ${
                              statusFilter.toLowerCase() === st.toLowerCase()
                                ? "bg-[#000080] text-white shadow-xs"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {st === "all" ? "All Claims" : st}
                          </button>
                        ))}

                        <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

                        {/* Damage Category Filter */}
                        <select
                          value={categoryFilter}
                          onChange={(e) => {
                            setCategoryFilter(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                        >
                          <option value="all">All Damage Types</option>
                          <option value="Accident">Accident / Collision</option>
                          <option value="Windscreen">Windscreen / Glass</option>
                          <option value="Theft">Theft / Partial Theft</option>
                          <option value="Flood">Flood / Water Damage</option>
                          <option value="ThirdParty">Third Party Claim</option>
                        </select>

                        {/* Sort Selector */}
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                        >
                          <option value="newest">Sort: Newest</option>
                          <option value="oldest">Sort: Oldest</option>
                          <option value="amount_high">Amount: High to Low</option>
                          <option value="amount_low">Amount: Low to High</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handlePrint}
                          className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <HugeiconsIcon icon={File01Icon} className="w-3.5 h-3.5 text-slate-600" />
                          <span>Print Summary</span>
                        </button>
                        <button
                          onClick={handleExportCSV}
                          className="px-3.5 py-1.5 bg-[#000080] hover:bg-[#102A43] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer border-none"
                        >
                          <HugeiconsIcon icon={Download01Icon} className="w-3.5 h-3.5 text-white" />
                          <span>Export CSV</span>
                        </button>
                      </div>
                    </div>

                    {/* Claims Table */}
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                      {paginatedData.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 font-medium select-none">
                          No claim records found matching your active filter criteria.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] select-none">
                                <th className="py-3 px-4 whitespace-nowrap">Claim ID</th>
                                <th className="py-3 px-4 whitespace-nowrap">Policyholder & NIC</th>
                                <th className="py-3 px-4 whitespace-nowrap">Vehicle Number</th>
                                <th className="py-3 px-4 whitespace-nowrap">Damage Classification</th>
                                <th className="py-3 px-4 whitespace-nowrap">Amount (LKR)</th>
                                <th className="py-3 px-4 text-center whitespace-nowrap">TAT</th>
                                <th className="py-3 px-4 text-center whitespace-nowrap">Status</th>
                                <th className="py-3 px-4 whitespace-nowrap">Assigned Assessor</th>
                                <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {(paginatedData as ClaimRecord[]).map((c) => (
                                <tr
                                  key={c._id || c.claimNumber}
                                  onClick={() => setSelectedRecord({ type: "claim", data: c })}
                                  className="hover:bg-slate-50/80 transition-colors cursor-pointer border-l-[6px] border-l-blue-500"
                                >
                                  <td className="py-3.5 px-4 font-mono font-bold text-[#102A43] whitespace-nowrap">
                                    {c.claimNumber}
                                  </td>
                                  <td className="py-3.5 px-4 whitespace-nowrap">
                                    <span className="font-bold text-slate-800 block">
                                      {c.policyHolderName || "Client"}
                                    </span>
                                    <span className="font-mono text-[10px] text-slate-400 block">{c.userNic || "-"}</span>
                                  </td>
                                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-700 whitespace-nowrap">
                                    {c.vehicleNumber || "-"}
                                  </td>
                                  <td className="py-3.5 px-4 font-medium text-slate-600 whitespace-nowrap">
                                    {c.damageType || "Accident Collision"}
                                  </td>
                                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                                    {formatLKR(c.amount)}
                                  </td>
                                  <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap text-center">
                                    {calculateTAT(c.createdAt, c.updatedAt)}
                                  </td>
                                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                    <span
                                      className={`inline-flex items-center justify-center text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border whitespace-nowrap min-w-[100px] text-center ${
                                        c.status === "Approved"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : c.status === "Pending"
                                          ? "bg-amber-50 text-amber-700 border-amber-200"
                                          : c.status === "In Progress"
                                          ? "bg-blue-50 text-blue-700 border-blue-200"
                                          : "bg-red-50 text-red-700 border-red-200"
                                      }`}
                                    >
                                      {c.status || "Pending"}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap font-medium">
                                    {c.assignedAgent || "Unassigned"}
                                  </td>
                                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDownloadRecordReport({ type: "claim", data: c });
                                        }}
                                        title="Print Audit Dossier"
                                        className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer border-none"
                                      >
                                        <HugeiconsIcon icon={File01Icon} className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedRecord({ type: "claim", data: c });
                                        }}
                                        className="px-3 py-1 text-xs font-bold text-white bg-[#000080] hover:bg-[#102A43] rounded-lg transition-colors cursor-pointer border-none shadow-2xs"
                                      >
                                        View
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Pagination Footer */}
                      {currentDataset.length > 0 && (
                        <div className="p-4 bg-slate-50/50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 select-none">
                          <span>
                            Showing <strong>{(currentPage - 1) * rowsPerPage + 1}</strong> to{" "}
                            <strong>{Math.min(currentPage * rowsPerPage, currentDataset.length)}</strong> of{" "}
                            <strong>{currentDataset.length}</strong> records
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              disabled={currentPage === 1}
                              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                              className="px-3 py-1.5 border border-slate-300 rounded-lg font-semibold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed bg-white"
                            >
                              Previous
                            </button>
                            <span className="font-semibold text-slate-800">
                              {currentPage} / {totalPages}
                            </span>
                            <button
                              disabled={currentPage === totalPages}
                              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                              className="px-3 py-1.5 border border-slate-300 rounded-lg font-semibold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed bg-white"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: POLICYHOLDERS & FLEET */}
                {activeReportType === "policyholders" && (
                  <div className="flex flex-col gap-6">
                    {/* Policyholders KPI Banner */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="bg-white p-5 rounded-2xl border-l-[6px] border-l-indigo-500 border border-slate-200 shadow-sm">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Policyholders</span>
                        <div className="text-2xl font-black text-slate-900 mt-1">{policyHolders.length} Registered</div>
                        <span className="text-[11px] text-indigo-600 font-semibold block mt-0.5">{branch} Regional Network</span>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border-l-[6px] border-l-blue-500 border border-slate-200 shadow-sm">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Insured Fleet</span>
                        <div className="text-2xl font-black text-blue-700 mt-1">{totalVehiclesCount} Vehicles</div>
                        <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">Active comprehensive policies</span>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border-l-[6px] border-l-emerald-500 border border-slate-200 shadow-sm">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Client Retention</span>
                        <div className="text-2xl font-black text-emerald-600 mt-1">98.4%</div>
                        <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">Annual policy renewal loyalty</span>
                      </div>
                    </div>

                    {/* Secondary Filters Bar */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 select-none">
                      <div className="flex items-center gap-2 flex-wrap">
                        {["all", "Approved", "Pending"].map((st) => (
                          <button
                            key={st}
                            onClick={() => {
                              setStatusFilter(st);
                              setCurrentPage(1);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-none ${
                              statusFilter.toLowerCase() === st.toLowerCase()
                                ? "bg-[#000080] text-white shadow-xs"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {st === "all" ? "All Policyholders" : st}
                          </button>
                        ))}

                        <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                        >
                          <option value="newest">Sort: Newest First</option>
                          <option value="oldest">Sort: Oldest First</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handlePrint}
                          className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <HugeiconsIcon icon={File01Icon} className="w-3.5 h-3.5 text-slate-600" />
                          <span>Print Summary</span>
                        </button>
                        <button
                          onClick={handleExportCSV}
                          className="px-3.5 py-1.5 bg-[#000080] hover:bg-[#102A43] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer border-none"
                        >
                          <HugeiconsIcon icon={Download01Icon} className="w-3.5 h-3.5 text-white" />
                          <span>Export CSV</span>
                        </button>
                      </div>
                    </div>

                    {/* Policyholders Table */}
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                      {paginatedData.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 font-medium select-none">
                          No policyholder records found matching your active filter criteria.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] select-none">
                                <th className="py-3 px-4 whitespace-nowrap">Ref Number</th>
                                <th className="py-3 px-4 whitespace-nowrap">Policyholder Name</th>
                                <th className="py-3 px-4 whitespace-nowrap">NIC Number</th>
                                <th className="py-3 px-4 whitespace-nowrap">Contact Phone</th>
                                <th className="py-3 px-4 text-center whitespace-nowrap">Vehicles Insured</th>
                                <th className="py-3 px-4 text-center whitespace-nowrap">Status</th>
                                <th className="py-3 px-4 whitespace-nowrap">Registered Date</th>
                                <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {(paginatedData as PolicyHolderRecord[]).map((h) => (
                                <tr
                                  key={h._id || h.nic}
                                  onClick={() => setSelectedRecord({ type: "holder", data: h })}
                                  className="hover:bg-slate-50/80 transition-colors cursor-pointer border-l-[6px] border-l-indigo-500"
                                >
                                  <td className="py-3.5 px-4 font-mono font-bold text-[#102A43] whitespace-nowrap">
                                    {h.referenceNumber || "SAN-PH"}
                                  </td>
                                  <td className="py-3.5 px-4 font-bold text-slate-800 whitespace-nowrap">
                                    {h.firstName} {h.lastName}
                                  </td>
                                  <td className="py-3.5 px-4 font-mono text-slate-700 whitespace-nowrap">{h.nic}</td>
                                  <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">{h.mobile || "-"}</td>
                                  <td className="py-3.5 px-4 text-slate-800 font-bold whitespace-nowrap text-center">
                                    {h.vehicles?.length || 0} Registered
                                  </td>
                                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                    <span
                                      className={`inline-flex items-center justify-center text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border whitespace-nowrap min-w-[95px] text-center ${
                                        h.status === "Approved"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : "bg-amber-50 text-amber-700 border-amber-200"
                                      }`}
                                    >
                                      {h.status || "Pending"}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">{formatDate(h.createdAt)}</td>
                                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDownloadRecordReport({ type: "holder", data: h });
                                        }}
                                        title="Print Audit Dossier"
                                        className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer border-none"
                                      >
                                        <HugeiconsIcon icon={File01Icon} className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedRecord({ type: "holder", data: h });
                                        }}
                                        className="px-3 py-1 text-xs font-bold text-white bg-[#000080] hover:bg-[#102A43] rounded-lg transition-colors cursor-pointer border-none shadow-2xs"
                                      >
                                        View
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Pagination Footer */}
                      {currentDataset.length > 0 && (
                        <div className="p-4 bg-slate-50/50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 select-none">
                          <span>
                            Showing <strong>{(currentPage - 1) * rowsPerPage + 1}</strong> to{" "}
                            <strong>{Math.min(currentPage * rowsPerPage, currentDataset.length)}</strong> of{" "}
                            <strong>{currentDataset.length}</strong> records
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              disabled={currentPage === 1}
                              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                              className="px-3 py-1.5 border border-slate-300 rounded-lg font-semibold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed bg-white"
                            >
                              Previous
                            </button>
                            <span className="font-semibold text-slate-800">
                              {currentPage} / {totalPages}
                            </span>
                            <button
                              disabled={currentPage === totalPages}
                              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                              className="px-3 py-1.5 border border-slate-300 rounded-lg font-semibold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed bg-white"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 4: POLICY RENEWALS */}
                {activeReportType === "renewals" && (
                  <div className="flex flex-col gap-6">
                    {/* Renewals KPI Summary Banner */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-5 rounded-2xl border-l-[6px] border-l-amber-500 border border-slate-200 shadow-sm">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expiring in 45 Days</span>
                        <div className="text-2xl font-black text-amber-600 mt-1">{expiringPoliciesCount} Vehicles</div>
                        <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">Requires renewal quotation</span>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border-l-[6px] border-l-emerald-500 border border-slate-200 shadow-sm">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Renewals Paid & Finalized</span>
                        <div className="text-2xl font-black text-emerald-600 mt-1">{renewedPoliciesCount} Completed</div>
                        <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">Extended for next year</span>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border-l-[6px] border-l-blue-500 border border-slate-200 shadow-sm">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Premiums Collected</span>
                        <div className="text-2xl font-black text-[#000080] mt-1">{formatLKR(totalRenewalPremiumsCollected)}</div>
                        <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">Active collected renewal revenue</span>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border-l-[6px] border-l-purple-500 border border-slate-200 shadow-sm">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Quotes & Action</span>
                        <div className="text-2xl font-black text-purple-600 mt-1">
                          {renewals.filter((r) => !r.isPaid && (!r.renewalQuote || r.renewalQuote.status === "Draft" || r.renewalQuote.status === "Pending_Payment")).length} Pending
                        </div>
                        <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">Awaiting customer payment</span>
                      </div>
                    </div>

                    {/* Secondary Filters Bar */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 select-none">
                      <div className="flex items-center gap-2 flex-wrap">
                        {[
                          { id: "all", label: "All Renewals" },
                          { id: "Paid", label: "Paid / Renewed" },
                          { id: "Expiring Soon", label: "Expiring Soon (45d)" },
                          { id: "Calculated", label: "Quote Calculated" },
                          { id: "Pending", label: "Pending Quote" }
                        ].map((st) => (
                          <button
                            key={st.id}
                            onClick={() => {
                              setStatusFilter(st.id);
                              setCurrentPage(1);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-none ${
                              statusFilter.toLowerCase() === st.id.toLowerCase()
                                ? "bg-[#000080] text-white shadow-xs"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}

                        <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

                        {/* Vehicle Type Filter */}
                        <select
                          value={categoryFilter}
                          onChange={(e) => {
                            setCategoryFilter(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                        >
                          <option value="all">All Vehicle Types</option>
                          <option value="Car">Motor Car / Sedan</option>
                          <option value="Van">Van / SUV</option>
                          <option value="Bike">Motorcycle / Scooter</option>
                          <option value="ThreeWheeler">Three Wheeler</option>
                        </select>

                        {/* Sort Selector */}
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                        >
                          <option value="newest">Sort: Newest</option>
                          <option value="oldest">Sort: Oldest</option>
                          <option value="amount_high">Amount: High to Low</option>
                          <option value="amount_low">Amount: Low to High</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href="/Office_Staff/Renewals"
                          className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer no-underline"
                        >
                          <span>Open Renewals Page</span>
                        </Link>
                        <button
                          onClick={handleExportCSV}
                          className="px-3.5 py-1.5 bg-[#000080] hover:bg-[#102A43] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer border-none"
                        >
                          <HugeiconsIcon icon={Download01Icon} className="w-3.5 h-3.5 text-white" />
                          <span>Export CSV</span>
                        </button>
                      </div>
                    </div>

                    {/* Renewals Table */}
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                      {paginatedData.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 font-medium select-none">
                          No vehicle renewal records found matching your active filter criteria.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] select-none">
                                <th className="py-3 px-4 whitespace-nowrap">Vehicle Number & Model</th>
                                <th className="py-3 px-4 whitespace-nowrap">Policy Number</th>
                                <th className="py-3 px-4 whitespace-nowrap">Policyholder & NIC</th>
                                <th className="py-3 px-4 text-center whitespace-nowrap">Expiry & Days Left</th>
                                <th className="py-3 px-4 whitespace-nowrap">Renewal Quote Total</th>
                                <th className="py-3 px-4 text-center whitespace-nowrap">Status & Plan</th>
                                <th className="py-3 px-4 whitespace-nowrap">Latest Action Date</th>
                                <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {(paginatedData as VehicleRenewalRecord[]).map((r, rIdx) => {
                                const isPaid = r.isPaid;
                                const quote = r.renewalQuote;
                                const days = r.vehicle.daysRemaining;
                                const isExpiringSoon = days >= 0 && days <= 45;
                                const isOverdue = days < 0;

                                return (
                                  <tr
                                    key={`${r.vehicle.numberPlate}-${rIdx}`}
                                    onClick={() => setSelectedRecord({ type: "renewal", data: r })}
                                    className={`hover:bg-slate-50/80 transition-colors cursor-pointer border-l-[6px] ${
                                      isPaid
                                        ? "border-l-emerald-500"
                                        : isOverdue
                                        ? "border-l-rose-500"
                                        : isExpiringSoon
                                        ? "border-l-amber-500"
                                        : "border-l-blue-500"
                                    }`}
                                  >
                                    <td className="py-3.5 px-4 whitespace-nowrap">
                                      <span className="font-mono font-bold text-[#102A43] block">
                                        {r.vehicle.numberPlate}
                                      </span>
                                      <span className="text-slate-500 text-[11px] block font-medium">
                                        {r.vehicle.company || ""} {r.vehicle.model || "Vehicle"}
                                      </span>
                                    </td>

                                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-700 whitespace-nowrap">
                                      {r.vehicle.policyNumber || "SAN-POL-AUTO"}
                                    </td>

                                    <td className="py-3.5 px-4 whitespace-nowrap">
                                      <span className="font-bold text-slate-800 block">
                                        {r.owner.name}
                                      </span>
                                      <span className="font-mono text-[10px] text-slate-400 block">
                                        {r.owner.nic}
                                      </span>
                                    </td>

                                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                      <div className="flex flex-col items-center">
                                        <span className="font-semibold text-slate-800">
                                          {formatDate(r.vehicle.calculatedExpiryDate || r.vehicle.policyExpiryDate)}
                                        </span>
                                        <span
                                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                                            isPaid
                                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                              : isOverdue
                                              ? "bg-rose-100 text-rose-700 font-bold"
                                              : isExpiringSoon
                                              ? "bg-amber-100 text-amber-800 font-bold"
                                              : "bg-slate-100 text-slate-600"
                                          }`}
                                        >
                                          {isPaid
                                            ? "Active / Renewed"
                                            : isOverdue
                                            ? `${Math.abs(days)}d Overdue`
                                            : `${days}d Remaining`}
                                        </span>
                                      </div>
                                    </td>

                                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                                      {quote?.calculation?.finalAnnualTotal ? (
                                        formatLKR(quote.calculation.finalAnnualTotal)
                                      ) : (
                                        <span className="text-slate-400 font-normal italic">Quote Pending</span>
                                      )}
                                    </td>

                                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                      <div className="flex flex-col items-center gap-1">
                                        <span
                                          className={`inline-flex items-center justify-center text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border whitespace-nowrap min-w-[95px] text-center ${
                                            isPaid
                                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                              : quote?.status === "Calculated"
                                              ? "bg-blue-50 text-blue-700 border-blue-200"
                                              : quote?.status === "Pending_Payment"
                                              ? "bg-purple-50 text-purple-700 border-purple-200"
                                              : "bg-amber-50 text-amber-700 border-amber-200"
                                          }`}
                                        >
                                          {isPaid ? "Paid / Renewed" : quote?.status ? quote.status.replace("_", " ") : "Pending Quote"}
                                        </span>
                                        {quote?.paymentPlanType && (
                                          <span className="text-[10px] text-slate-500 font-medium">
                                            Plan: {quote.paymentPlanType}
                                          </span>
                                        )}
                                      </div>
                                    </td>

                                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap font-medium">
                                      {r.latestPaymentDate
                                        ? formatDate(r.latestPaymentDate)
                                        : quote?.updatedAt
                                        ? formatDate(quote.updatedAt)
                                        : formatDate(r.vehicle.calculatedExpiryDate)}
                                    </td>

                                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownloadRecordReport({ type: "renewal", data: r });
                                          }}
                                          title="Print Audit Dossier"
                                          className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer border-none"
                                        >
                                          <HugeiconsIcon icon={File01Icon} className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedRecord({ type: "renewal", data: r });
                                          }}
                                          className="px-3 py-1 text-xs font-bold text-white bg-[#000080] hover:bg-[#102A43] rounded-lg transition-colors cursor-pointer border-none shadow-2xs"
                                        >
                                          View
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

                      {/* Pagination Footer */}
                      {currentDataset.length > 0 && (
                        <div className="p-4 bg-slate-50/50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 select-none">
                          <span>
                            Showing <strong>{(currentPage - 1) * rowsPerPage + 1}</strong> to{" "}
                            <strong>{Math.min(currentPage * rowsPerPage, currentDataset.length)}</strong> of{" "}
                            <strong>{currentDataset.length}</strong> records
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              disabled={currentPage === 1}
                              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                              className="px-3 py-1.5 border border-slate-300 rounded-lg font-semibold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed bg-white"
                            >
                              Previous
                            </button>
                            <span className="font-semibold text-slate-800">
                              {currentPage} / {totalPages}
                            </span>
                            <button
                              disabled={currentPage === totalPages}
                              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                              className="px-3 py-1.5 border border-slate-300 rounded-lg font-semibold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed bg-white"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 5: FIELD AGENTS FORCE */}
                {activeReportType === "agents" && (
                  <div className="flex flex-col gap-6">
                    {/* Agents KPI Banner */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="bg-white p-5 rounded-2xl border-l-[6px] border-l-purple-500 border border-slate-200 shadow-sm">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Field Agents</span>
                        <div className="text-2xl font-black text-purple-700 mt-1">{summaryStats.activeAgents || agents.length} Agents</div>
                        <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">{branch} Regional Network</span>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border-l-[6px] border-l-emerald-500 border border-slate-200 shadow-sm">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Patrol Readiness</span>
                        <div className="text-2xl font-black text-emerald-600 mt-1">{agents.filter((a) => a.status === "Active" || !a.status).length} On Duty</div>
                        <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">Real-time mobile deployment</span>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border-l-[6px] border-l-blue-500 border border-slate-200 shadow-sm">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Average Claims / Agent</span>
                        <div className="text-2xl font-black text-blue-700 mt-1">
                          {agents.length > 0 ? (claims.length / agents.length).toFixed(1) : 0} Cases
                        </div>
                        <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">Loss evaluation workload</span>
                      </div>
                    </div>

                    {/* Secondary Filters Bar */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 select-none">
                      <div className="flex items-center gap-2 flex-wrap">
                        {["all", "Active", "Pending"].map((st) => (
                          <button
                            key={st}
                            onClick={() => {
                              setStatusFilter(st);
                              setCurrentPage(1);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-none ${
                              statusFilter.toLowerCase() === st.toLowerCase()
                                ? "bg-[#000080] text-white shadow-xs"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {st === "all" ? "All Agents" : st}
                          </button>
                        ))}

                        <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                        >
                          <option value="newest">Sort: Name (A-Z)</option>
                          <option value="oldest">Sort: Name (Z-A)</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handlePrint}
                          className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <HugeiconsIcon icon={File01Icon} className="w-3.5 h-3.5 text-slate-600" />
                          <span>Print Summary</span>
                        </button>
                        <button
                          onClick={handleExportCSV}
                          className="px-3.5 py-1.5 bg-[#000080] hover:bg-[#102A43] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer border-none"
                        >
                          <HugeiconsIcon icon={Download01Icon} className="w-3.5 h-3.5 text-white" />
                          <span>Export CSV</span>
                        </button>
                      </div>
                    </div>

                    {/* Agents Table */}
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                      {paginatedData.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 font-medium select-none">
                          No agent records found matching your active filter criteria.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] select-none">
                                <th className="py-3 px-4 whitespace-nowrap">Agent Code</th>
                                <th className="py-3 px-4 whitespace-nowrap">Agent Name</th>
                                <th className="py-3 px-4 whitespace-nowrap">Email Address</th>
                                <th className="py-3 px-4 whitespace-nowrap">Phone</th>
                                <th className="py-3 px-4 whitespace-nowrap">Assigned Branch</th>
                                <th className="py-3 px-4 text-center whitespace-nowrap">Operating Status</th>
                                <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {(paginatedData as AgentRecord[]).map((a, aIdx) => (
                                <tr
                                  key={a._id || a.email}
                                  onClick={() => setSelectedRecord({ type: "agent", data: a })}
                                  className="hover:bg-slate-50/80 transition-colors cursor-pointer border-l-[6px] border-l-purple-500"
                                >
                                  <td className="py-3.5 px-4 font-mono font-bold text-[#102A43] whitespace-nowrap">
                                    SAN-AGT-{100 + aIdx}
                                  </td>
                                  <td className="py-3.5 px-4 font-bold text-slate-800 whitespace-nowrap">{a.name}</td>
                                  <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">{a.email}</td>
                                  <td className="py-3.5 px-4 font-mono text-slate-700 whitespace-nowrap">{a.phone}</td>
                                  <td className="py-3.5 px-4 text-slate-700 font-semibold whitespace-nowrap">{a.branch} Branch</td>
                                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                    <span
                                      className={`inline-flex items-center justify-center text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border whitespace-nowrap min-w-[95px] text-center ${
                                        a.status === "active" || a.status === "Active"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : "bg-slate-100 text-slate-600 border-slate-200"
                                      }`}
                                    >
                                      {a.status || "Active"}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDownloadRecordReport({ type: "agent", data: a });
                                        }}
                                        title="Print Audit Dossier"
                                        className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer border-none"
                                      >
                                        <HugeiconsIcon icon={File01Icon} className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedRecord({ type: "agent", data: a });
                                        }}
                                        className="px-3 py-1 text-xs font-bold text-white bg-[#000080] hover:bg-[#102A43] rounded-lg transition-colors cursor-pointer border-none shadow-2xs"
                                      >
                                        View
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Pagination Footer */}
                      {currentDataset.length > 0 && (
                        <div className="p-4 bg-slate-50/50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 select-none">
                          <span>
                            Showing <strong>{(currentPage - 1) * rowsPerPage + 1}</strong> to{" "}
                            <strong>{Math.min(currentPage * rowsPerPage, currentDataset.length)}</strong> of{" "}
                            <strong>{currentDataset.length}</strong> records
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              disabled={currentPage === 1}
                              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                              className="px-3 py-1.5 border border-slate-300 rounded-lg font-semibold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed bg-white"
                            >
                              Previous
                            </button>
                            <span className="font-semibold text-slate-800">
                              {currentPage} / {totalPages}
                            </span>
                            <button
                              disabled={currentPage === totalPages}
                              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                              className="px-3 py-1.5 border border-slate-300 rounded-lg font-semibold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed bg-white"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 6: DIRECT BANK SETTLEMENT AUDIT */}
                {activeReportType === "financial" && (
                  <div className="flex flex-col gap-6">
                    {/* Financial KPI Banner */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="bg-white p-5 rounded-2xl border-l-[6px] border-l-emerald-600 border border-slate-200 shadow-sm">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Disbursed Sum</span>
                        <div className="text-2xl font-black text-emerald-700 mt-1">{formatLKR(summaryStats.totalPayoutAmount || totalSettledPayouts)}</div>
                        <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">Verified CEFT electronic deposits</span>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border-l-[6px] border-l-blue-500 border border-slate-200 shadow-sm">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Approved Claim Files</span>
                        <div className="text-2xl font-black text-blue-700 mt-1">
                          {claims.filter((c) => c.status === "Approved").length} Disbursals
                        </div>
                        <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">Cleared with signed vouchers</span>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border-l-[6px] border-l-purple-500 border border-slate-200 shadow-sm">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Settlement Routing</span>
                        <div className="text-2xl font-black text-purple-700 mt-1">100% Direct CEFT</div>
                        <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">Electronic bank clearance</span>
                      </div>
                    </div>

                    {/* Secondary Filters Bar */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 select-none">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700">Bank Audit Scope: Cleared & Disbursed Claims</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handlePrint}
                          className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <HugeiconsIcon icon={File01Icon} className="w-3.5 h-3.5 text-slate-600" />
                          <span>Print Audit Voucher</span>
                        </button>
                        <button
                          onClick={handleExportCSV}
                          className="px-3.5 py-1.5 bg-[#000080] hover:bg-[#102A43] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer border-none"
                        >
                          <HugeiconsIcon icon={Download01Icon} className="w-3.5 h-3.5 text-white" />
                          <span>Export CSV</span>
                        </button>
                      </div>
                    </div>

                    {/* Financial Bank Table */}
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                      {paginatedData.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 font-medium select-none">
                          No direct bank disbursement records found matching your active filter criteria.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] select-none">
                                <th className="py-3 px-4 whitespace-nowrap">Claim Reference</th>
                                <th className="py-3 px-4 whitespace-nowrap">Beneficiary Name</th>
                                <th className="py-3 px-4 whitespace-nowrap">Bank Name</th>
                                <th className="py-3 px-4 whitespace-nowrap">Account Number</th>
                                <th className="py-3 px-4 whitespace-nowrap">Disbursed Amount</th>
                                <th className="py-3 px-4 whitespace-nowrap">Payment Method</th>
                                <th className="py-3 px-4 text-center whitespace-nowrap">Status</th>
                                <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {(paginatedData as ClaimRecord[]).map((c) => {
                                const bankInfo = c.policyHolderBankDetails || {
                                  bankName: c.bankName,
                                  branchName: c.bankBranch,
                                  accountNumber: c.bankAccount,
                                  accountHolderName: c.accountHolderName
                                };

                                return (
                                  <tr
                                    key={c._id || c.claimNumber}
                                    onClick={() => setSelectedRecord({ type: "claim", data: c })}
                                    className="hover:bg-slate-50/80 transition-colors cursor-pointer border-l-[6px] border-l-emerald-600"
                                  >
                                    <td className="py-3.5 px-4 font-mono font-bold text-[#102A43] whitespace-nowrap">
                                      {c.claimNumber}
                                    </td>
                                    <td className="py-3.5 px-4 font-bold text-slate-800 whitespace-nowrap">
                                      {c.policyHolderName || "Policyholder"}
                                    </td>
                                    <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap font-medium">
                                      {bankInfo.bankName || "Commercial Bank of Ceylon"}
                                    </td>
                                    <td className="py-3.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                                      {bankInfo.accountNumber || "10023456789"}
                                    </td>
                                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-700 whitespace-nowrap">
                                      {formatLKR(c.amount)}
                                    </td>
                                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap font-medium">
                                      Direct Electronic CEFT
                                    </td>
                                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                      <span
                                        className={`inline-flex items-center justify-center text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border whitespace-nowrap min-w-[95px] text-center ${
                                          c.status === "Approved"
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : "bg-amber-50 text-amber-700 border-amber-200"
                                        }`}
                                      >
                                        {c.status === "Approved" ? "Disbursed" : c.status}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownloadRecordReport({ type: "claim", data: c });
                                          }}
                                          title="Print Audit Dossier"
                                          className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer border-none"
                                        >
                                          <HugeiconsIcon icon={File01Icon} className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedRecord({ type: "claim", data: c });
                                          }}
                                          className="px-3 py-1 text-xs font-bold text-white bg-[#000080] hover:bg-[#102A43] rounded-lg transition-colors cursor-pointer border-none shadow-2xs"
                                        >
                                          View
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

                      {/* Pagination Footer */}
                      {currentDataset.length > 0 && (
                        <div className="p-4 bg-slate-50/50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 select-none">
                          <span>
                            Showing <strong>{(currentPage - 1) * rowsPerPage + 1}</strong> to{" "}
                            <strong>{Math.min(currentPage * rowsPerPage, currentDataset.length)}</strong> of{" "}
                            <strong>{currentDataset.length}</strong> records
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              disabled={currentPage === 1}
                              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                              className="px-3 py-1.5 border border-slate-300 rounded-lg font-semibold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed bg-white"
                            >
                              Previous
                            </button>
                            <span className="font-semibold text-slate-800">
                              {currentPage} / {totalPages}
                            </span>
                            <button
                              disabled={currentPage === totalPages}
                              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                              className="px-3 py-1.5 border border-slate-300 rounded-lg font-semibold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed bg-white"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 7: RISK & DAMAGE ANALYTICS (VISUAL BREAKDOWNS) */}
                {activeReportType === "analytics" && (
                  <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Damage Classification Breakdown */}
                      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                            Accident Damage Classification
                          </h4>
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                            {branch} Claims
                          </span>
                        </div>
                        <div className="space-y-3.5 text-xs">
                          {[
                            { label: "Front Collision Damage", pct: "45%", count: 12, color: "bg-blue-600" },
                            { label: "Rear Impact & Bumper", pct: "25%", count: 6, color: "bg-indigo-600" },
                            { label: "Side Body & Door Panels", pct: "18%", count: 4, color: "bg-cyan-600" },
                            { label: "Windscreen & Glass Cracks", pct: "12%", count: 3, color: "bg-emerald-600" }
                          ].map((item, idx) => (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between font-bold text-slate-700">
                                <span>{item.label}</span>
                                <span className="font-mono">{item.pct} ({item.count})</span>
                              </div>
                              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div style={{ width: item.pct }} className={`h-full ${item.color} rounded-full`} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Vehicle Category Risk Matrix */}
                      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                            Insured Vehicle Risk Types
                          </h4>
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                            Fleet Mix
                          </span>
                        </div>
                        <div className="space-y-3.5 text-xs">
                          {[
                            { label: "Private Motor Cars", pct: "52%", count: 24, color: "bg-[#102A43]" },
                            { label: "Dual-Purpose Vans & SUVs", pct: "22%", count: 10, color: "bg-blue-700" },
                            { label: "Motorcycles & Scooters", pct: "16%", count: 7, color: "bg-amber-600" },
                            { label: "Commercial / Three Wheelers", pct: "10%", count: 4, color: "bg-rose-600" }
                          ].map((item, idx) => (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between font-bold text-slate-700">
                                <span>{item.label}</span>
                                <span className="font-mono">{item.pct} ({item.count})</span>
                              </div>
                              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div style={{ width: item.pct }} className={`h-full ${item.color} rounded-full`} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* District Incident High-Risk Zones */}
                      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                            {branch} Regional Hotspots
                          </h4>
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                            Risk Zones
                          </span>
                        </div>
                        <div className="space-y-3 text-xs">
                          {[
                            { label: "Southern Expressway (E01) Corridor", risk: "High Speed Collision", count: 8 },
                            { label: "Coastal Highway Main Arterial", risk: "Heavy Commuter Traffic", count: 11 },
                            { label: "Central City Commercial Hub", risk: "Urban Congestion", count: 5 },
                            { label: "Baddegama & Inland Access Routes", risk: "Narrow Rural Curves", count: 3 }
                          ].map((item, idx) => (
                            <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                              <div>
                                <span className="font-bold text-slate-800 block">{item.label}</span>
                                <span className="text-[10px] text-slate-400 font-semibold">{item.risk}</span>
                              </div>
                              <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                                {item.count} Cases
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Comprehensive Case File Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-90 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col text-left max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white select-none">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#102A43] text-white flex items-center justify-center font-bold">
                  <HugeiconsIcon icon={File01Icon} className="w-5 h-5" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedRecord.type === "claim"
                      ? `Claim File: ${selectedRecord.data.claimNumber}`
                      : selectedRecord.type === "holder"
                      ? `Policyholder Profile: ${selectedRecord.data.firstName} ${selectedRecord.data.lastName}`
                      : selectedRecord.type === "renewal"
                      ? `Policy Renewal: ${selectedRecord.data.vehicle.numberPlate}`
                      : `Agent Profile: ${selectedRecord.data.name}`}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Branch Case Audit • Ref:{" "}
                    {selectedRecord.type === "renewal"
                      ? `${selectedRecord.data.vehicle.numberPlate} (${selectedRecord.data.vehicle.policyNumber || "SAN-POL"})`
                      : selectedRecord.data.claimNumber || selectedRecord.data.referenceNumber || selectedRecord.data.nic}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={2.5} />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            {selectedRecord.type === "claim" && (
              <div className="px-6 border-b border-slate-100 bg-slate-50 flex items-center gap-2 py-2 select-none">
                {[
                  { id: "details", label: "Claim & Damage" },
                  { id: "vehicle", label: "Insured Vehicle" },
                  { id: "bank", label: "Direct Settlement" },
                  { id: "timeline", label: "Audit Timeline" }
                ].map((mt) => (
                  <button
                    key={mt.id}
                    onClick={() => setModalTab(mt.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border-none ${
                      modalTab === mt.id
                        ? "bg-[#102A43] text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-200 bg-transparent"
                    }`}
                  >
                    {mt.label}
                  </button>
                ))}
              </div>
            )}

            <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              {selectedRecord.type === "claim" && (
                <>
                  {modalTab === "details" && (
                    <div className="space-y-3 divide-y divide-slate-100">
                      <div className="pt-1 flex justify-between">
                        <span className="text-slate-400">Claim Reference:</span>
                        <strong className="font-mono text-slate-900">{selectedRecord.data.claimNumber}</strong>
                      </div>
                      <div className="pt-2 flex justify-between">
                        <span className="text-slate-400">Policyholder Name:</span>
                        <strong className="text-slate-900">{selectedRecord.data.policyHolderName || "Client"}</strong>
                      </div>
                      <div className="pt-2 flex justify-between">
                        <span className="text-slate-400">National ID (NIC):</span>
                        <strong className="font-mono text-slate-900">{selectedRecord.data.userNic}</strong>
                      </div>
                      <div className="pt-2 flex justify-between">
                        <span className="text-slate-400">Damage Classification:</span>
                        <strong className="text-slate-800">{selectedRecord.data.damageType || "Accident Collision"}</strong>
                      </div>
                      <div className="pt-2 flex justify-between">
                        <span className="text-slate-400">Claim Settlement Amount:</span>
                        <strong className="font-mono text-emerald-700 text-sm font-bold">
                          {formatLKR(selectedRecord.data.amount)}
                        </strong>
                      </div>
                      <div className="pt-2 flex justify-between">
                        <span className="text-slate-400">Processing Status:</span>
                        <span className="font-bold text-slate-900">{selectedRecord.data.status}</span>
                      </div>
                      <div className="pt-2 flex justify-between">
                        <span className="text-slate-400">Assigned Assessor / Agent:</span>
                        <strong className="text-slate-800">{selectedRecord.data.assignedAgent || "Unassigned"}</strong>
                      </div>
                      {selectedRecord.data.description && (
                        <div className="pt-2">
                          <span className="text-slate-400 block mb-1">Accident & Surveyor Description:</span>
                          <p className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-700 leading-relaxed">
                            {selectedRecord.data.description}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {modalTab === "vehicle" && (
                    <div className="space-y-3 divide-y divide-slate-100">
                      <div className="pt-1 flex justify-between">
                        <span className="text-slate-400">Vehicle Number:</span>
                        <strong className="font-mono text-slate-900 font-bold">{selectedRecord.data.vehicleNumber || "-"}</strong>
                      </div>
                      <div className="pt-2 flex justify-between">
                        <span className="text-slate-400">Vehicle Make / Model:</span>
                        <strong className="text-slate-800">{selectedRecord.data.vehicleModel || "Standard Sedan"}</strong>
                      </div>
                      <div className="pt-2 flex justify-between">
                        <span className="text-slate-400">Registered Branch:</span>
                        <strong className="text-slate-800">{branch} Branch</strong>
                      </div>
                    </div>
                  )}

                  {modalTab === "bank" && (
                    <div className="space-y-3 divide-y divide-slate-100">
                      <div className="pt-1 flex justify-between">
                        <span className="text-slate-400">Bank Name:</span>
                        <strong className="text-slate-900">
                          {selectedRecord.data.policyHolderBankDetails?.bankName || selectedRecord.data.bankName || "Commercial Bank of Ceylon"}
                        </strong>
                      </div>
                      <div className="pt-2 flex justify-between">
                        <span className="text-slate-400">Bank Branch:</span>
                        <strong className="text-slate-900">
                          {selectedRecord.data.policyHolderBankDetails?.branchName || selectedRecord.data.bankBranch || `${branch} Branch`}
                        </strong>
                      </div>
                      <div className="pt-2 flex justify-between">
                        <span className="text-slate-400">Account Number:</span>
                        <strong className="font-mono text-slate-900 font-bold">
                          {selectedRecord.data.policyHolderBankDetails?.accountNumber || selectedRecord.data.bankAccount || "10023456789"}
                        </strong>
                      </div>
                      <div className="pt-2 flex justify-between">
                        <span className="text-slate-400">Account Holder Name:</span>
                        <strong className="text-slate-900">
                          {selectedRecord.data.policyHolderBankDetails?.accountHolderName || selectedRecord.data.accountHolderName || selectedRecord.data.policyHolderName || "Client"}
                        </strong>
                      </div>
                      <div className="pt-2 flex justify-between">
                        <span className="text-slate-400">Electronic Transfer Mode:</span>
                        <span className="font-semibold text-blue-700">Direct CEFT Electronic Settlement</span>
                      </div>
                    </div>
                  )}

                  {modalTab === "timeline" && (
                    <div className="space-y-3">
                      <div className="border-l-2 border-slate-200 pl-4 space-y-4 text-xs">
                        <div>
                          <span className="font-bold text-slate-900 block">Claim Registered & Lodged</span>
                          <span className="text-[11px] text-slate-400 font-mono">{formatSriLankaDateTime(selectedRecord.data.createdAt)}</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">Assessor Field Inspection Dispatched</span>
                          <span className="text-[11px] text-slate-400">Assigned to: {selectedRecord.data.assignedAgent || "Field Surveyor Unit"}</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">Current Status</span>
                          <span className="font-bold text-emerald-700">{selectedRecord.data.status}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {selectedRecord.type === "holder" && (
                <div className="divide-y divide-slate-100 space-y-2">
                  <div className="pt-1 flex justify-between">
                    <span className="text-slate-400">Full Name:</span>
                    <strong className="text-slate-900">{selectedRecord.data.firstName} {selectedRecord.data.lastName}</strong>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-slate-400">NIC Number:</span>
                    <strong className="font-mono text-slate-900">{selectedRecord.data.nic}</strong>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-slate-400">Mobile Phone:</span>
                    <strong className="text-slate-900">{selectedRecord.data.mobile || "-"}</strong>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-slate-400">Email Address:</span>
                    <strong className="text-slate-900">{selectedRecord.data.email || "-"}</strong>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-slate-400">City / District:</span>
                    <strong className="text-slate-900">{selectedRecord.data.city || branch}</strong>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-slate-400">Registered Branch:</span>
                    <strong className="text-slate-900">{selectedRecord.data.branch} Branch</strong>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-slate-400">Total Registered Vehicles:</span>
                    <strong className="text-slate-900">{selectedRecord.data.vehicles?.length || 0} Registered</strong>
                  </div>
                </div>
              )}

              {selectedRecord.type === "agent" && (
                <div className="divide-y divide-slate-100 space-y-2">
                  <div className="pt-1 flex justify-between">
                    <span className="text-slate-400">Agent Name:</span>
                    <strong className="text-slate-900">{selectedRecord.data.name}</strong>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-slate-400">Email Address:</span>
                    <strong className="text-slate-900">{selectedRecord.data.email}</strong>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-slate-400">Phone Number:</span>
                    <strong className="font-mono text-slate-900">{selectedRecord.data.phone}</strong>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-slate-400">Branch Office:</span>
                    <strong className="text-slate-900">{selectedRecord.data.branch} Branch</strong>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-slate-400">Operating Status:</span>
                    <strong className="text-emerald-700">{selectedRecord.data.status || "Active"}</strong>
                  </div>
                </div>
              )}

              {selectedRecord.type === "renewal" && (
                (() => {
                  const r = selectedRecord.data as VehicleRenewalRecord;
                  const quote = r.renewalQuote;
                  const isPaid = r.isPaid;
                  const days = r.vehicle.daysRemaining;

                  return (
                    <div className="space-y-4">
                      {/* Status Banner */}
                      <div
                        className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                          isPaid
                            ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                            : days < 0
                            ? "bg-rose-50 border-rose-200 text-rose-900"
                            : days <= 45
                            ? "bg-amber-50 border-amber-200 text-amber-900"
                            : "bg-slate-50 border-slate-200 text-slate-800"
                        }`}
                      >
                        <div>
                          <span className="font-bold text-xs uppercase tracking-wide block">
                            {isPaid ? "Policy Renewed & Verified" : days < 0 ? "Policy Expired" : "Renewal Due"}
                          </span>
                          <span className="text-[11px] opacity-80 block">
                            {isPaid
                              ? `Settled via ${quote?.paymentPlanType || "Direct Transfer"}`
                              : days < 0
                              ? `${Math.abs(days)} days overdue for renewal`
                              : `${days} days remaining until policy expiration`}
                          </span>
                        </div>
                        <span
                          className={`text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                            isPaid
                              ? "bg-emerald-600 text-white"
                              : days < 0
                              ? "bg-rose-600 text-white"
                              : "bg-amber-600 text-white"
                          }`}
                        >
                          {isPaid ? "Active" : days < 0 ? "Expired" : "Pending"}
                        </span>
                      </div>

                      {/* Section 1: Policyholder Details */}
                      <div>
                        <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-2 border-b border-slate-100 pb-1">
                          1. Policyholder & Customer Information
                        </h4>
                        <div className="space-y-2 divide-y divide-slate-100 text-xs">
                          <div className="flex justify-between pt-1">
                            <span className="text-slate-400">Policyholder Name:</span>
                            <strong className="text-slate-900">{r.owner.name}</strong>
                          </div>
                          <div className="flex justify-between pt-2">
                            <span className="text-slate-400">NIC Number:</span>
                            <strong className="font-mono text-slate-900">{r.owner.nic}</strong>
                          </div>
                          <div className="flex justify-between pt-2">
                            <span className="text-slate-400">Phone Number:</span>
                            <strong className="text-slate-800">{r.owner.mobile || "-"}</strong>
                          </div>
                          <div className="flex justify-between pt-2">
                            <span className="text-slate-400">Email Address:</span>
                            <strong className="text-slate-800">{r.owner.email || "-"}</strong>
                          </div>
                          <div className="flex justify-between pt-2">
                            <span className="text-slate-400">Branch Office:</span>
                            <strong className="text-slate-800">{r.owner.branch || branch} Branch</strong>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Vehicle & Policy Details */}
                      <div>
                        <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-2 border-b border-slate-100 pb-1">
                          2. Vehicle & Policy Details
                        </h4>
                        <div className="space-y-2 divide-y divide-slate-100 text-xs">
                          <div className="flex justify-between pt-1">
                            <span className="text-slate-400">Registration Number:</span>
                            <strong className="font-mono text-slate-900 font-bold">{r.vehicle.numberPlate}</strong>
                          </div>
                          <div className="flex justify-between pt-2">
                            <span className="text-slate-400">Vehicle Make / Model:</span>
                            <strong className="text-slate-800">
                              {r.vehicle.company || ""} {r.vehicle.model || "Vehicle"}{" "}
                              {r.vehicle.yearOfManufacture ? `(${r.vehicle.yearOfManufacture})` : ""}
                            </strong>
                          </div>
                          <div className="flex justify-between pt-2">
                            <span className="text-slate-400">Vehicle Classification:</span>
                            <strong className="text-slate-800">{r.vehicle.type || "Comprehensive Motor"}</strong>
                          </div>
                          <div className="flex justify-between pt-2">
                            <span className="text-slate-400">Policy Reference:</span>
                            <strong className="font-mono text-slate-900">{r.vehicle.policyNumber || "SAN-POL-AUTO"}</strong>
                          </div>
                          <div className="flex justify-between pt-2">
                            <span className="text-slate-400">Policy Expiration Date:</span>
                            <strong className="text-slate-900">
                              {formatDate(r.vehicle.calculatedExpiryDate || r.vehicle.policyExpiryDate)}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Renewal Quotation */}
                      <div>
                        <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-2 border-b border-slate-100 pb-1">
                          3. Renewal Quotation Breakdown
                        </h4>
                        <div className="space-y-2 divide-y divide-slate-100 text-xs">
                          <div className="flex justify-between pt-1">
                            <span className="text-slate-400">Quote Reference:</span>
                            <strong className="font-mono text-slate-900">{quote?.quoteNumber || "Quote Pending"}</strong>
                          </div>
                          <div className="flex justify-between pt-2">
                            <span className="text-slate-400">Selected Coverage:</span>
                            <strong className="text-slate-800">{quote?.selectedPlan || "Comprehensive"}</strong>
                          </div>
                          <div className="flex justify-between pt-2">
                            <span className="text-slate-400">Base Premium:</span>
                            <strong className="font-mono text-slate-800">{formatLKR(quote?.calculation?.basePremium)}</strong>
                          </div>
                          <div className="flex justify-between pt-2">
                            <span className="text-slate-400">NCB Discount:</span>
                            <strong className="font-mono text-emerald-700">
                              -{formatLKR(quote?.calculation?.ncDiscountAmount)}
                            </strong>
                          </div>
                          <div className="flex justify-between pt-2">
                            <span className="text-slate-400">Government Levies & Taxes:</span>
                            <strong className="font-mono text-slate-800">
                              {formatLKR(quote?.calculation?.taxesAndLevies)}
                            </strong>
                          </div>
                          <div className="flex justify-between pt-2">
                            <span className="text-slate-400">Final Annual Total:</span>
                            <strong className="font-mono text-emerald-700 font-bold text-sm">
                              {formatLKR(quote?.calculation?.finalAnnualTotal)}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Section 4: Installments & Payment */}
                      {quote?.installments && quote.installments.length > 0 && (
                        <div>
                          <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-2 border-b border-slate-100 pb-1">
                            4. Installment Payment Schedule
                          </h4>
                          <div className="space-y-1.5">
                            {quote.installments.map((inst) => (
                              <div
                                key={inst.installmentIndex}
                                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50 text-xs"
                              >
                                <div>
                                  <span className="font-bold text-slate-800 block">
                                    Installment #{inst.installmentIndex}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block">
                                    Due: {formatDate(inst.dueDate)}{" "}
                                    {inst.paidAt ? `• Paid ${formatDate(inst.paidAt)}` : ""}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="font-mono font-bold text-slate-900 block">
                                    {formatLKR(inst.amount)}
                                  </span>
                                  <span
                                    className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                                      inst.status === "Paid"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : "bg-amber-100 text-amber-800"
                                    }`}
                                  >
                                    {inst.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Sanasa General Insurance • {branch} District Hub
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadRecordReport(selectedRecord)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border-none shadow-xs active:scale-95"
                >
                  <HugeiconsIcon icon={Download01Icon} className="w-4 h-4 text-white" strokeWidth={2.5} />
                  <span>Download Report</span>
                </button>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="px-5 py-2 bg-[#102A43] hover:bg-[#000080] text-white font-semibold text-xs rounded-xl transition-all cursor-pointer border-none shadow-xs active:scale-95"
                >
                  Close File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtered Details Report Generator Modal */}
      {showFilteredReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-[#000080] flex items-center justify-center shadow-xs">
                  <HugeiconsIcon icon={Download01Icon} className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Filtered Detail Report Generator
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Filter by time range and category to export detailed datasets for {branch} Branch
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFilteredReportModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* Step 1: Module / Scope Selection */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-2">
                  1. Select Target Reporting Module
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: "claims", label: "Claims & Losses", desc: "Claims, damage & payouts" },
                    { id: "policyholders", label: "Policyholders", desc: "Active clients & vehicles" },
                    { id: "renewals", label: "Vehicle Renewals", desc: "Policy expiry & plans" },
                    { id: "agents", label: "Field Agents", desc: "Agent duty & performance" },
                    { id: "financial", label: "Disbursement Audit", desc: "Approved bank payouts" }
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setExportDomain(m.id as any)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        exportDomain === m.id
                          ? "border-[#000080] bg-blue-50/40 text-[#000080] shadow-xs"
                          : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
                      }`}
                    >
                      <span className="font-bold text-xs block">{m.label}</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Time Range Filter */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-2">
                  2. Choose Date / Time Range
                </label>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {[
                    { id: "all", label: "All Time" },
                    { id: "today", label: "Today" },
                    { id: "this_week", label: "This Week (7D)" },
                    { id: "this_month", label: "This Month" },
                    { id: "last_30", label: "Last 30 Days" },
                    { id: "this_quarter", label: "This Quarter" },
                    { id: "this_year", label: "This Year" },
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

                {/* Custom Date Inputs */}
                {exportTimeRange === "custom" && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-wrap items-center gap-4 animate-in fade-in duration-150">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-600 text-xs">Start Date:</span>
                      <input
                        type="date"
                        value={exportCustomStart}
                        onChange={(e) => setExportCustomStart(e.target.value)}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-600 text-xs">End Date:</span>
                      <input
                        type="date"
                        value={exportCustomEnd}
                        onChange={(e) => setExportCustomEnd(e.target.value)}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: Status Filter */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-2">
                  3. Filter by Status
                </label>
                {exportDomain === "renewals" ? (
                  <select
                    value={exportStatus}
                    onChange={(e) => setExportStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                  >
                    <option value="all">All Renewal Statuses</option>
                    <option value="Paid">Paid / Renewed</option>
                    <option value="Expiring Soon">Expiring Soon (45 Days Window)</option>
                    <option value="Calculated">Quote Calculated</option>
                    <option value="Pending">Pending Calculation</option>
                  </select>
                ) : exportDomain === "claims" || exportDomain === "financial" ? (
                  <select
                    value={exportStatus}
                    onChange={(e) => setExportStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                  >
                    <option value="all">All Claim Statuses</option>
                    <option value="Approved">Approved / Cleared</option>
                    <option value="Pending">Pending Investigation</option>
                    <option value="In Progress">In Progress (Agent Assigned)</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                ) : (
                  <select
                    value={exportStatus}
                    onChange={(e) => setExportStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                  >
                    <option value="all">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Approved">Approved</option>
                    <option value="Pending">Pending</option>
                  </select>
                )}
              </div>

              {/* Live Preview Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Filtered Preview Impact
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg font-black text-slate-900 font-mono">
                      {modalFilteredData.count} Records Found
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Matching Filter
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                    Scope: {exportDomain.toUpperCase()} &bull; Window: {exportTimeRange.replace("_", " ").toUpperCase()}
                  </span>
                </div>

                {modalFilteredData.totalSum !== undefined && modalFilteredData.totalSum > 0 && (
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Total Valuation / Volume
                    </span>
                    <span className="text-base font-black text-slate-900 font-mono block mt-1">
                      {formatLKR(modalFilteredData.totalSum)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => setShowFilteredReportModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintFilteredDossierModal}
                  disabled={modalFilteredData.count === 0}
                  className="px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <HugeiconsIcon icon={File01Icon} className="w-4 h-4 text-slate-600" strokeWidth={2} />
                  <span>Print Audit Dossier</span>
                </button>

                <button
                  onClick={handleDownloadFilteredCSVModal}
                  disabled={modalFilteredData.count === 0}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#000080] hover:bg-[#102A43] rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5 active:scale-95 border-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <HugeiconsIcon icon={Download01Icon} className="w-4 h-4 text-white" strokeWidth={2} />
                  <span>Download Filtered CSV</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alert / Feedback Modal */}
      {popup.show && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-xl border border-slate-100 p-6 flex flex-col gap-4 text-left">
            <div className="flex items-center gap-3">
              {popup.type === "success" ? (
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-5 h-5" strokeWidth={2.5} />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                  <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5" strokeWidth={2.5} />
                </div>
              )}
              <h3 className="font-bold text-base text-slate-800 tracking-tight leading-none">
                {popup.title}
              </h3>
            </div>
            <p className="text-slate-500 text-xs font-medium leading-relaxed">{popup.message}</p>
            <div className="flex justify-end mt-2 select-none">
              <button
                onClick={() => setPopup({ ...popup, show: false })}
                className="px-6 py-2 bg-[#102A43] hover:bg-[#000080] active:scale-95 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer border-none"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Chat Button */}
      <button
        className="fixed bottom-8 right-8 z-40 bg-[#00ddff] hover:bg-[#00c8e6] text-white p-5 rounded-full shadow-2xl transition-all duration-150 hover:scale-110 active:scale-95 cursor-pointer focus:outline-none border-none flex items-center justify-center"
        aria-label="Chat support"
      >
        <HugeiconsIcon icon={BubbleChatIcon} className="w-7 h-7 text-white" strokeWidth={2} />
      </button>
    </div>
  );
}
