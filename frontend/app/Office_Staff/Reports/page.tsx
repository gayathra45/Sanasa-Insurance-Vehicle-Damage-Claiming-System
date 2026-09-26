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
  Download01Icon
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

export default function OfficeStaffReports() {
  const [branch, setBranch] = useState("Galle");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Raw data from backend
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [policyHolders, setPolicyHolders] = useState<PolicyHolderRecord[]>([]);
  const [agents, setAgents] = useState<AgentRecord[]>([]);
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
  const [activeReportType, setActiveReportType] = useState<"claims" | "policyholders" | "agents" | "financial" | "analytics">("claims");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateRange, setDateRange] = useState<"all" | "this_month" | "last_30" | "this_quarter" | "this_year" | "custom">("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "amount_high" | "amount_low">("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

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
  const loadBranchReportData = async (branchName: string) => {
    try {
      setLoading(true);
      setError("");

      const [statsRes, claimsRes, holdersRes, agentsRes] = await Promise.all([
        fetch(`${API_URL}/office-staff/stats?branch=${encodeURIComponent(branchName)}`),
        fetch(`${API_URL}/office-staff/claims?branch=${encodeURIComponent(branchName)}`),
        fetch(`${API_URL}/office-staff/policy-holders?branch=${encodeURIComponent(branchName)}`),
        fetch(`${API_URL}/office-staff/agents?branch=${encodeURIComponent(branchName)}`)
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
    } catch (err: any) {
      console.error("Error loading branch reports:", err);
      setError("Failed to load branch reports data. Please check your network connection.");
    } finally {
      setLoading(false);
    }
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
      if (c.createdAt) {
        const date = new Date(c.createdAt);
        const now = new Date();
        if (dateRange === "this_month") {
          if (date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) return false;
        } else if (dateRange === "last_30") {
          const diffDays = (now.getTime() - date.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 30) return false;
        } else if (dateRange === "this_quarter") {
          const currentQuarter = Math.floor(now.getMonth() / 3);
          const claimQuarter = Math.floor(date.getMonth() / 3);
          if (currentQuarter !== claimQuarter || date.getFullYear() !== now.getFullYear()) return false;
        } else if (dateRange === "this_year") {
          if (date.getFullYear() !== now.getFullYear()) return false;
        } else if (dateRange === "custom" && customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          if (date < start || date > end) return false;
        }
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
  }, [policyHolders, statusFilter, searchQuery]);

  // Filtered Agents
  const filteredAgents = useMemo(() => {
    return agents.filter((a) => {
      if (statusFilter !== "all" && a.status?.toLowerCase() !== statusFilter.toLowerCase()) {
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
  }, [agents, statusFilter, searchQuery]);

  // Dynamic Portfolio Calculations
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

  // Comprehensive CSV Export Handler
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    const branchName = branch || "Galle";

    if (activeReportType === "claims" || activeReportType === "financial") {
      csvContent += "Claim Number,Policy Holder,NIC,Vehicle Plate,Damage Type,Claim Amount (LKR),Status,Assigned Agent,Bank Name,Bank Account,Turnaround (Days),Date Filed\n";
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
      csvContent += "Reference No,Full Name,NIC,Mobile,Email,City,Vehicles Count,Primary Vehicle Plate,Primary Policy No,Status,Registered Date\n";
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

  // Handler for downloading single record case file report
  const handleDownloadRecordReport = (record: { type: "claim" | "holder" | "agent"; data: any }) => {
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
                <th>Plate Number</th>
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
      message: `The official audit report for ${record.data.claimNumber || record.data.name || record.data.nic} has been downloaded and prepared for printing/PDF export.`,
      type: "success"
    });
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Pagination data
  const currentDataset =
    activeReportType === "claims" || activeReportType === "financial"
      ? filteredClaims
      : activeReportType === "policyholders"
      ? filteredHolders
      : filteredAgents;

  const totalPages = Math.ceil(currentDataset.length / rowsPerPage) || 1;
  const paginatedData = currentDataset.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans text-slate-800">
      <div className="flex flex-1 flex-row min-h-0">
        <OfficeStaffNavbar />

        <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
          {/* Top Header Bar */}
          <header className="bg-white border-b border-slate-100 text-slate-800 px-8 py-4 flex justify-between items-center select-none shadow-xs flex-shrink-0 h-[80px] sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("open-mobile-menu"))}
                className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 active:scale-95 transition-all cursor-pointer focus:outline-none"
                aria-label="Open mobile navigation menu"
              >
                <HugeiconsIcon icon={Menu01Icon} className="w-6 h-6" strokeWidth={2.5} />
              </button>
              <h1 className="text-xl font-semibold text-slate-800 flex items-center gap-2 pl-2 lg:pl-0">
                <span className="bg-[#102A43] text-white text-base px-4 py-2 rounded-xl font-semibold shadow-xs tracking-wide">
                  {branch} Branch
                </span>
                <span className="hidden md:inline text-slate-400 font-medium">— Comprehensive Reports & Analytics</span>
              </h1>
            </div>

            <div className="flex items-center gap-5">
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
          <main className="flex-1 p-6 lg:p-10 bg-white overflow-y-auto">
            {loading ? (
              <SimpleLoader message="Compiling branch reporting matrices & analytics..." theme="slate" />
            ) : error ? (
              <div className="max-w-4xl mx-auto p-6 bg-red-50 text-red-600 rounded-2xl border border-red-200 text-center font-medium">
                {error}
              </div>
            ) : (
              <div className="max-w-6xl mx-auto space-y-8">

                {/* Title & Action Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                      Branch Operational & Financial Reports
                    </h2>
                    <p className="text-slate-500 text-sm font-medium">
                      Multi-dimensional performance data, claims settlement audits, loss ratios, and agent productivity for {branch} Branch.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 select-none">
                    <button
                      onClick={handlePrint}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5 active:scale-95"
                    >
                      <HugeiconsIcon icon={File01Icon} className="w-4 h-4 text-slate-600" strokeWidth={2} />
                      <span>Print Summary</span>
                    </button>

                    <button
                      onClick={handleExportCSV}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#102A43] hover:bg-[#000080] rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5 active:scale-95 border-none"
                    >
                      <span>Export CSV Dataset</span>
                    </button>
                  </div>
                </div>

                {/* 6 Rich KPI Summary Tiles */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 select-none">
                  {/* Total Claims Processed */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Claims</span>
                    <div className="mt-2">
                      <span className="text-xl font-black text-slate-900 font-mono block">
                        {summaryStats.totalClaims || claims.length}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
                        {summaryStats.approvedClaims} Approved
                      </span>
                    </div>
                  </div>

                  {/* Settled Disbursements */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Disbursed Payouts</span>
                    <div className="mt-2">
                      <span className="text-base font-black text-slate-900 font-mono truncate block">
                        {formatLKR(summaryStats.totalPayoutAmount || totalSettledPayouts)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                        Direct Bank Deposits
                      </span>
                    </div>
                  </div>

                  {/* Approval Rate */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Settlement Rate</span>
                    <div className="mt-2">
                      <span className="text-xl font-black text-emerald-700 font-mono block">
                        {approvalRate}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                        Claims Clearance
                      </span>
                    </div>
                  </div>

                  {/* Average Claim Value */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Avg Claim Payout</span>
                    <div className="mt-2">
                      <span className="text-base font-black text-slate-900 font-mono truncate block">
                        {formatLKR(averageClaimValue)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                        Per Settled Claim
                      </span>
                    </div>
                  </div>

                  {/* Insured Vehicles Portfolio */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Insured Vehicles</span>
                    <div className="mt-2">
                      <span className="text-xl font-black text-slate-900 font-mono block">
                        {totalVehiclesCount || policyHolders.length}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                        {policyHolders.length} Active Clients
                      </span>
                    </div>
                  </div>

                  {/* Active Field Force */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Field Force</span>
                    <div className="mt-2">
                      <span className="text-xl font-black text-slate-900 font-mono block">
                        {summaryStats.activeAgents || agents.length}
                      </span>
                      <span className="text-[10px] text-blue-600 font-bold block mt-0.5">
                        {branch} District
                      </span>
                    </div>
                  </div>
                </div>

                {/* Monthly Claims & Payout Volume Cadence Chart */}
                {monthlyTrend && monthlyTrend.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs select-none space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                          <HugeiconsIcon icon={Analytics01Icon} className="w-4 h-4 text-blue-600" strokeWidth={2} />
                          Annual Monthly Claims Incurred & Volume Trend ({new Date().getFullYear()})
                        </h3>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">
                          Monthly submission cadence and settlement progress for {branch} Branch
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl">
                        Total {claims.length} Claims Incurred
                      </span>
                    </div>

                    <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 pt-3 items-end h-32 border-b border-slate-100 pb-2">
                      {monthlyTrend.map((m, idx) => {
                        const maxClaims = Math.max(...monthlyTrend.map((t) => t.claims), 1);
                        const heightPct = Math.max(Math.round((m.claims / maxClaims) * 100), 8);

                        return (
                          <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                            <span className="text-[10px] font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                              {m.claims}
                            </span>
                            <div
                              style={{ height: `${heightPct}%` }}
                              className={`w-full max-w-[28px] rounded-lg transition-all ${
                                m.claims > 0 ? "bg-[#102A43] group-hover:bg-[#1b75e0]" : "bg-slate-100"
                              }`}
                            />
                            <span className="text-[10px] font-medium text-slate-400 uppercase">{m.month}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Report Section Tabs */}
                <div className="space-y-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-1.5 flex items-center gap-1.5 overflow-x-auto select-none shadow-2xs">
                    {[
                      { id: "claims", label: "Claims & Loss Assessment", count: filteredClaims.length },
                      { id: "policyholders", label: "Policyholders & Vehicle Portfolio", count: filteredHolders.length },
                      { id: "agents", label: "Agent Productivity & Commissions", count: filteredAgents.length },
                      { id: "financial", label: "Direct Bank Settlement Audit", count: filteredClaims.filter(c => c.status === "Approved").length },
                      { id: "analytics", label: "Risk & Damage Analytics", count: null }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveReportType(tab.id as any);
                          setCurrentPage(1);
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border-none flex items-center gap-2 whitespace-nowrap ${
                          activeReportType === tab.id
                            ? "bg-[#102A43] text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-100 bg-transparent"
                        }`}
                      >
                        <span>{tab.label}</span>
                        {tab.count !== null && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                              activeReportType === tab.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {tab.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Filter & Search Bar */}
                  {activeReportType !== "analytics" && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-2xs">
                      {/* Search Input */}
                      <div className="relative flex-1 max-w-sm">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <HugeiconsIcon icon={Search01Icon} className="w-4 h-4 text-slate-400" strokeWidth={2} />
                        </span>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                          }}
                          placeholder="Search claim no, name, NIC, plate, agent..."
                          className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-slate-700 placeholder:text-slate-400 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-400"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery("")}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
                          >
                            <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" strokeWidth={2} />
                          </button>
                        )}
                      </div>

                      {/* Multi-Filters */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Status Filter */}
                        <select
                          value={statusFilter}
                          onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                        >
                          <option value="all">All Statuses</option>
                          <option value="Approved">Approved</option>
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Rejected">Rejected</option>
                        </select>

                        {/* Damage Category Filter */}
                        {activeReportType === "claims" && (
                          <select
                            value={categoryFilter}
                            onChange={(e) => {
                              setCategoryFilter(e.target.value);
                              setCurrentPage(1);
                            }}
                            className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                          >
                            <option value="all">All Damage Types</option>
                            <option value="Accident">Accident / Collision</option>
                            <option value="Windscreen">Windscreen / Glass</option>
                            <option value="Theft">Theft / Partial Theft</option>
                            <option value="Flood">Flood / Water Damage</option>
                            <option value="ThirdParty">Third Party Claim</option>
                          </select>
                        )}

                        {/* Date Range Selector */}
                        <select
                          value={dateRange}
                          onChange={(e) => {
                            setDateRange(e.target.value as any);
                            setCurrentPage(1);
                          }}
                          className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                        >
                          <option value="all">All Time</option>
                          <option value="this_month">This Month</option>
                          <option value="last_30">Last 30 Days</option>
                          <option value="this_quarter">This Quarter</option>
                          <option value="this_year">This Year ({new Date().getFullYear()})</option>
                          <option value="custom">Custom Date Range</option>
                        </select>

                        {/* Sort Selector */}
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                        >
                          <option value="newest">Sort: Newest</option>
                          <option value="oldest">Sort: Oldest</option>
                          <option value="amount_high">Amount: High to Low</option>
                          <option value="amount_low">Amount: Low to High</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Custom Date Range Pickers if selected */}
                  {dateRange === "custom" && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-4 text-xs">
                      <span className="font-semibold text-slate-600">From Date:</span>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700"
                      />
                      <span className="font-semibold text-slate-600">To Date:</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700"
                      />
                    </div>
                  )}
                </div>

                {/* ======================================================== */}
                {/* TAB 5: RISK & DAMAGE ANALYTICS (VISUAL BREAKDOWNS)       */}
                {/* ======================================================== */}
                {activeReportType === "analytics" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Damage Classification Breakdown */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Accident Damage Classification
                        </h4>
                        <div className="space-y-3 text-xs">
                          {[
                            { label: "Front Collision Damage", pct: "45%", count: 12, color: "bg-blue-600" },
                            { label: "Rear Impact & Bumper", pct: "25%", count: 6, color: "bg-indigo-600" },
                            { label: "Side Body & Door Panels", pct: "18%", count: 4, color: "bg-cyan-600" },
                            { label: "Windscreen & Glass Cracks", pct: "12%", count: 3, color: "bg-emerald-600" }
                          ].map((item, idx) => (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between font-semibold text-slate-700">
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
                      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Insured Vehicle Risk Types
                        </h4>
                        <div className="space-y-3 text-xs">
                          {[
                            { label: "Private Motor Cars", pct: "52%", count: 24, color: "bg-[#102A43]" },
                            { label: "Dual-Purpose Vans & SUVs", pct: "22%", count: 10, color: "bg-blue-700" },
                            { label: "Motorcycles & Scooters", pct: "16%", count: 7, color: "bg-amber-600" },
                            { label: "Commercial Lorries / Three Wheelers", pct: "10%", count: 4, color: "bg-rose-600" }
                          ].map((item, idx) => (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between font-semibold text-slate-700">
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
                      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          {branch} Regional Hotspots
                        </h4>
                        <div className="space-y-3 text-xs">
                          {[
                            { label: "Southern Expressway (E01) Corridor", risk: "High Speed", count: 8 },
                            { label: "Colombo-Galle Main Coastal Road", risk: "Heavy Traffic", count: 11 },
                            { label: "Kaluwella / Galle Fort Junction", risk: "Urban Density", count: 5 },
                            { label: "Wakwella & Baddegama Access Routes", risk: "Rural Curves", count: 3 }
                          ].map((item, idx) => (
                            <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                              <div>
                                <span className="font-bold text-slate-800 block">{item.label}</span>
                                <span className="text-[10px] text-slate-400">{item.risk}</span>
                              </div>
                              <span className="font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                                {item.count} Claims
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Detailed Table Section */}
                {activeReportType !== "analytics" && (
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                    {paginatedData.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 font-medium select-none">
                        No report records found matching your active filter criteria.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px] select-none">
                              {activeReportType === "claims" ? (
                                <>
                                  <th className="py-3 px-4 whitespace-nowrap">Claim ID</th>
                                  <th className="py-3 px-4 whitespace-nowrap">Policyholder & NIC</th>
                                  <th className="py-3 px-4 whitespace-nowrap">Vehicle Plate</th>
                                  <th className="py-3 px-4 whitespace-nowrap">Damage Classification</th>
                                  <th className="py-3 px-4 whitespace-nowrap">Amount (LKR)</th>
                                  <th className="py-3 px-4 text-center whitespace-nowrap">TAT</th>
                                  <th className="py-3 px-4 text-center whitespace-nowrap">Status</th>
                                  <th className="py-3 px-4 whitespace-nowrap">Assigned Assessor</th>
                                  <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                                </>
                              ) : activeReportType === "policyholders" ? (
                                <>
                                  <th className="py-3 px-4 whitespace-nowrap">Ref Number</th>
                                  <th className="py-3 px-4 whitespace-nowrap">Applicant Name</th>
                                  <th className="py-3 px-4 whitespace-nowrap">NIC Number</th>
                                  <th className="py-3 px-4 whitespace-nowrap">Contact Phone</th>
                                  <th className="py-3 px-4 text-center whitespace-nowrap">Vehicles Insured</th>
                                  <th className="py-3 px-4 text-center whitespace-nowrap">Status</th>
                                  <th className="py-3 px-4 whitespace-nowrap">Registered Date</th>
                                  <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                                </>
                              ) : activeReportType === "agents" ? (
                                <>
                                  <th className="py-3 px-4 whitespace-nowrap">Agent Code</th>
                                  <th className="py-3 px-4 whitespace-nowrap">Agent Name</th>
                                  <th className="py-3 px-4 whitespace-nowrap">Email Address</th>
                                  <th className="py-3 px-4 whitespace-nowrap">Phone</th>
                                  <th className="py-3 px-4 whitespace-nowrap">Assigned Branch</th>
                                  <th className="py-3 px-4 text-center whitespace-nowrap">Status</th>
                                  <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                                </>
                              ) : (
                                <>
                                  <th className="py-3 px-4 whitespace-nowrap">Claim Reference</th>
                                  <th className="py-3 px-4 whitespace-nowrap">Beneficiary Name</th>
                                  <th className="py-3 px-4 whitespace-nowrap">Bank Name</th>
                                  <th className="py-3 px-4 whitespace-nowrap">Account Number</th>
                                  <th className="py-3 px-4 whitespace-nowrap">Disbursed Amount</th>
                                  <th className="py-3 px-4 whitespace-nowrap">Payment Method</th>
                                  <th className="py-3 px-4 text-center whitespace-nowrap">Status</th>
                                  <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                                </>
                              )}
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-100">
                            {activeReportType === "claims" &&
                              (paginatedData as ClaimRecord[]).map((c) => (
                                <tr
                                  key={c._id || c.claimNumber}
                                  onClick={() => setSelectedRecord({ type: "claim", data: c })}
                                  className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                                >
                                  <td className="py-3.5 px-4 font-mono font-bold text-[#102A43] whitespace-nowrap">
                                    {c.claimNumber}
                                  </td>
                                  <td className="py-3.5 px-4 whitespace-nowrap">
                                    <span className="font-semibold text-slate-800 block">
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
                                  <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                                    {c.assignedAgent || "Unassigned"}
                                  </td>
                                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedRecord({ type: "claim", data: c });
                                      }}
                                      className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer border-none"
                                    >
                                      View
                                    </button>
                                  </td>
                                </tr>
                              ))}

                            {activeReportType === "policyholders" &&
                              (paginatedData as PolicyHolderRecord[]).map((h) => (
                                <tr
                                  key={h._id || h.nic}
                                  onClick={() => setSelectedRecord({ type: "holder", data: h })}
                                  className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                                >
                                  <td className="py-3.5 px-4 font-mono font-bold text-[#102A43] whitespace-nowrap">
                                    {h.referenceNumber || "SAN-PH"}
                                  </td>
                                  <td className="py-3.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                                    {h.firstName} {h.lastName}
                                  </td>
                                  <td className="py-3.5 px-4 font-mono text-slate-700 whitespace-nowrap">{h.nic}</td>
                                  <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">{h.mobile || "-"}</td>
                                  <td className="py-3.5 px-4 text-slate-800 font-semibold whitespace-nowrap text-center">
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
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedRecord({ type: "holder", data: h });
                                      }}
                                      className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer border-none"
                                    >
                                      View
                                    </button>
                                  </td>
                                </tr>
                              ))}

                            {activeReportType === "agents" &&
                              (paginatedData as AgentRecord[]).map((a, aIdx) => (
                                <tr
                                  key={a._id || a.email}
                                  onClick={() => setSelectedRecord({ type: "agent", data: a })}
                                  className="hover:bg-slate-50/60 transition-colors cursor-pointer"
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
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedRecord({ type: "agent", data: a });
                                      }}
                                      className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer border-none"
                                    >
                                      View
                                    </button>
                                  </td>
                                </tr>
                              ))}

                            {activeReportType === "financial" &&
                              (paginatedData as ClaimRecord[]).map((c) => {
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
                                    className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                                  >
                                    <td className="py-3.5 px-4 font-mono font-bold text-[#102A43] whitespace-nowrap">
                                      {c.claimNumber}
                                    </td>
                                    <td className="py-3.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                                      {c.policyHolderName || "Policyholder"}
                                    </td>
                                    <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                                      {bankInfo.bankName || "Commercial Bank"}
                                    </td>
                                    <td className="py-3.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                                      {bankInfo.accountNumber || "10023456789"}
                                    </td>
                                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-700 whitespace-nowrap">
                                      {formatLKR(c.amount)}
                                    </td>
                                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
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
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedRecord({ type: "claim", data: c });
                                        }}
                                        className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer border-none"
                                      >
                                        View
                                      </button>
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
                )}

              </div>
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
                      : `Agent Profile: ${selectedRecord.data.name}`}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Branch Case Audit • Ref: {selectedRecord.data.claimNumber || selectedRecord.data.referenceNumber || selectedRecord.data.nic}
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
                        <span className="text-slate-400">Vehicle Number Plate:</span>
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
