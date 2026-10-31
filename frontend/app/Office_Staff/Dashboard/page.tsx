"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { API_URL } from "@/app/config";
import OfficeStaffNavbar from "@/app/Components/Office_Staff/Navbar";
import UserAvatarDropdown from "@/app/Components/UserAvatarDropdown";
import HeaderNotificationBell from "@/app/Components/HeaderNotificationBell";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Menu01Icon,
  Notification01Icon,
  AlertCircleIcon,
  Alert02Icon,
  UserAdd01Icon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  File01Icon,
  UserMultiple02Icon,
  BubbleChatIcon,
  Cancel01Icon,
  LockIcon,
  Loading03Icon,
  UserCheck01Icon,
  Car01Icon,
  Shield01Icon,
  RefreshIcon,
  Search01Icon,
  ViewIcon,
  UserGroupIcon,
  ArrowRight01Icon,
  Location01Icon,
  Call02Icon,
  Mail01Icon,
  CreditCardIcon,
  Copy01Icon
} from "@hugeicons/core-free-icons";
import { formatSriLankaDateTime } from "@/app/utils/dateFormatter";
import { getViewedClaims, markClaimAsRead, isClaimUnread, UnreadDot } from "@/app/utils/unreadClaims";

interface RegistrationItem {
  _id?: string;
  name: string;
  nic?: string;
  mobile?: string;
  vehiclesCount: number;
  date: string;
}

interface ThirdPartyItem {
  _id: string;
  requestReference: string;
  driverName: string;
  driverNic?: string;
  policyHolderName: string;
  plate: string;
  status: string;
  paymentStatus: string;
  fee: number;
  date: string;
}

interface AgentItem {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  agentId?: string;
  availability?: string;
  activeClaimsCount?: number;
}

// Returns true if the claim has attributes indicating urgent attention is required.
const checkUrgent = (claim: any) => {
  return (
    claim?.damageType?.toLowerCase().includes("severe") ||
    claim?.damageType?.toLowerCase().includes("major") ||
    claim?.description?.toLowerCase().includes("urgent") ||
    claim?.priority?.toLowerCase() === "high" ||
    claim?.priority?.toLowerCase() === "urgent"
  );
};

export default function OfficeStaffDashboard() {
  const [branch, setBranch] = useState("Galle");
  const [staffInfo, setStaffInfo] = useState<any>(null);
  const [stats, setStats] = useState({
    unassignedClaims: 0,
    newRegistrations: 0,
    activeClaims: 0,
    pendingClaims: 0,
    totalPolicyHolders: 0,
    totalAgents: 0,
    pendingVehicleVerifications: 0,
    thirdParty: {
      pendingApproval: 0,
      pendingTermination: 0,
      approved: 0,
      total: 0
    }
  });

  const [rawClaimsList, setRawClaimsList] = useState<any[]>([]);
  const [newRegistrations, setNewRegistrations] = useState<RegistrationItem[]>([]);
  const [recentThirdParty, setRecentThirdParty] = useState<ThirdPartyItem[]>([]);
  const [branchAgents, setBranchAgents] = useState<AgentItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedClaim, setSelectedClaim] = useState<any | null>(null);
  const [viewedClaims, setViewedClaims] = useState<Record<string, number>>({});

  // Filtering & Search
  const [claimsFilter, setClaimsFilter] = useState<"all" | "unassigned" | "urgent" | "active">("all");
  const [searchQuery, setSearchQuery] = useState("");

  

  // Quick Agent Assignment Modal
  const [claimToAssign, setClaimToAssign] = useState<any | null>(null);
  const [selectedAgentEmail, setSelectedAgentEmail] = useState("");
  const [assigningAgent, setAssigningAgent] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // --- Password Modal States ---
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [staffEmail, setStaffEmail] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

    // Clean greeting display name so branch name is not duplicated twice
  const staffDisplayName = useMemo(() => {
    const rawName = staffInfo?.name || staffInfo?.firstName || "Office Staff";
    if (!rawName) return "Office Staff";
    if (branch) {
      const branchPattern = new RegExp(`^${branch}\\s*Branch\\s*`, "i");
      if (branchPattern.test(rawName)) {
        const stripped = rawName.replace(branchPattern, "").trim();
        return stripped || "Office Staff";
      }
      const simpleBranchPattern = new RegExp(`^${branch}\\s*`, "i");
      if (simpleBranchPattern.test(rawName)) {
        const stripped = rawName.replace(simpleBranchPattern, "").trim();
        return stripped || "Office Staff";
      }
    }
    return rawName;
  }, [staffInfo, branch]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { label: "None", color: "bg-slate-200", width: "w-0" };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 10) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { label: "Weak", color: "bg-red-500", width: "w-1/4" };
    if (score === 2) return { label: "Medium", color: "bg-amber-500", width: "w-2/4" };
    if (score === 3) return { label: "Strong", color: "bg-emerald-500", width: "w-3/4" };
    return { label: "Very Strong", color: "bg-teal-500", width: "w-full" };
  };
  const strength = getPasswordStrength(passwordForm.newPassword);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!passwordForm.currentPassword) return setPasswordError("Current temporary password is required.");
    if (passwordForm.newPassword.length < 6 || passwordForm.newPassword.length > 12) {
      return setPasswordError("Password must be between 6 and 12 characters.");
    }
    if (!/[0-9]/.test(passwordForm.newPassword) && !/[^A-Za-z0-9]/.test(passwordForm.newPassword)) {
      return setPasswordError("Password must contain at least one number or special character.");
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return setPasswordError("Passwords do not match.");
    }

    setIsUpdatingPassword(true);
    try {
      const res = await fetch(`${API_URL}/office-staff/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: staffEmail,
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update password.");
      }

      setPasswordSuccess("Password updated successfully!");
      
      const staffData = sessionStorage.getItem("logged_in_staff");
      if (staffData) {
        const parsed = JSON.parse(staffData);
        parsed.mustChangePassword = false;
        sessionStorage.setItem("logged_in_staff", JSON.stringify(parsed));
      }

      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess("");
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setPasswordError(err.message || "Failed to update password.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Lock background scroll when modal is open
  useEffect(() => {
    if (showPasswordModal || claimToAssign || selectedClaim) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showPasswordModal, claimToAssign, selectedClaim]);

  // Main fetch function
  const fetchDashboardData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setRefreshing(true);

      const targetBranch = branch || "Galle";
      const res = await fetch(`${API_URL}/office-staff/dashboard-stats?branch=${encodeURIComponent(targetBranch)}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || errData?.message || `Failed to load dashboard metrics (Status: ${res.status})`);
      }
      const data = await res.json();
      if (data.stats) {
        setStats(data.stats);
      }

      // Format claims
      const claimsList = (data.newClaims || []).map((claim: any) => {
        const isUrgent = checkUrgent(claim);
        const isThirdParty = !!(claim.submittedByDriver?.isThirdParty && claim.submittedByDriver?.driverName);
        const applicantName = isThirdParty
          ? claim.submittedByDriver.driverName
          : (claim.policyHolderName || "Policyholder");
        return {
          id: claim.claimNumber,
          urgency: isUrgent ? "Urgent" : "Normal",
          vehicleNo: claim.vehiclePlate,
          type: claim.damageType,
          location: claim.location,
          time: formatSriLankaDateTime(claim.createdAt),
          isThirdParty,
          applicantName,
          status: claim.status,
          assignedAgent: claim.assignedAgent || "",
          amount: claim.amount,
          rawClaim: claim,
        };
      });
      setRawClaimsList(claimsList);

      // Format registrations
      const formattedRegs = (data.newRegistrations || []).map((user: any) => ({
        _id: user._id,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Applicant",
        nic: user.nic || "",
        mobile: user.mobile || "",
        vehiclesCount: Array.isArray(user.vehicles) ? user.vehicles.length : 0,
        date: user.createdAt
          ? new Date(user.createdAt).toLocaleDateString("en-GB", { month: "short", day: "numeric" })
          : "Recently",
      }));
      setNewRegistrations(formattedRegs);

      // Format third-party requests
      if (Array.isArray(data.recentThirdPartyRequests)) {
        const tpFormatted: ThirdPartyItem[] = data.recentThirdPartyRequests.map((r: any) => ({
          _id: r._id,
          requestReference: r.requestReference || `TPR-${r._id.slice(-4)}`,
          driverName: r.driverDetails?.fullName || "Driver",
          driverNic: r.driverDetails?.nicNumber || "",
          policyHolderName: r.policyHolderName || "Policyholder",
          plate: r.selectedVehicles?.[0]?.numberPlate || "Assigned Vehicle",
          status: r.status,
          paymentStatus: r.payment?.status || "Pending Payment",
          fee: r.fee || 300,
          date: r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-GB", { month: "short", day: "numeric" }) : ""
        }));
        setRecentThirdParty(tpFormatted);
      }

      // Branch agents
      if (Array.isArray(data.branchAgents)) {
        setBranchAgents(data.branchAgents);
      }

      setError("");
    } catch (err: any) {
      console.error("Dashboard stats error:", err);
      if (!silent) setError(err.message || "Failed to load branch statistics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Side Effects & Session
  useEffect(() => {
    let currentBranch = "Galle";
    let email = "";
    if (typeof window !== "undefined") {
      const savedStaff = sessionStorage.getItem("logged_in_staff");
      if (savedStaff) {
        try {
          const staffObj = JSON.parse(savedStaff);
          if (staffObj) {
            if (staffObj.branch) currentBranch = staffObj.branch;
            if (staffObj.email) email = staffObj.email;
            setStaffInfo(staffObj);
            if (staffObj.mustChangePassword) {
              setShowPasswordModal(true);
            }
          }
        } catch (e) {
          console.error("Error parsing logged_in_staff", e);
        }
      }
    }
    setBranch(currentBranch);
    setStaffEmail(email);
    setViewedClaims(getViewedClaims("office_staff"));

    fetchDashboardData();
    const interval = setInterval(() => fetchDashboardData(true), 8000);
    return () => clearInterval(interval);
  }, [branch]);

  // Handle Quick Agent Assignment
  const handleAssignAgentSubmit = async () => {
    if (!claimToAssign || !selectedAgentEmail) {
      showToast("Please choose an agent to assign.", "error");
      return;
    }
    try {
      setAssigningAgent(true);
      const res = await fetch(`${API_URL}/office-staff/claims/${encodeURIComponent(claimToAssign.id || claimToAssign.claimNumber)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedAgent: selectedAgentEmail,
          status: "In Progress"
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign agent");

      showToast(`Agent assigned successfully to claim #${claimToAssign.id || claimToAssign.claimNumber}!`, "success");
      setClaimToAssign(null);
      setSelectedAgentEmail("");
      fetchDashboardData(true);
    } catch (err: any) {
      showToast(err.message || "Failed to assign agent.", "error");
    } finally {
      setAssigningAgent(false);
    }
  };

  // Filtered Claims Queue
  const filteredClaims = useMemo(() => {
    return rawClaimsList.filter((claim) => {
      // Tab filter
      if (claimsFilter === "unassigned" && claim.assignedAgent && claim.assignedAgent.trim() !== "") {
        return false;
      }
      if (claimsFilter === "urgent" && claim.urgency !== "Urgent") {
        return false;
      }
      if (claimsFilter === "active" && (claim.status !== "In Progress" && claim.status !== "Investigating")) {
        return false;
      }

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        claim.id.toLowerCase().includes(q) ||
        claim.vehicleNo.toLowerCase().includes(q) ||
        claim.applicantName.toLowerCase().includes(q) ||
        claim.location.toLowerCase().includes(q) ||
        claim.type.toLowerCase().includes(q)
      );
    });
  }, [rawClaimsList, claimsFilter, searchQuery]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
      <div className="flex flex-1 flex-row min-h-0">
        {/* Sidebar */}
        <OfficeStaffNavbar />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
          {/* Top Header Bar */}
          <header className="bg-white border-b border-slate-200/80 px-6 lg:px-8 py-3.5 flex justify-between items-center select-none shadow-xs sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("open-mobile-menu"))}
                className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
              >
                <HugeiconsIcon icon={Menu01Icon} className="w-6 h-6" strokeWidth={2} />
              </button>
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="bg-[#0B192C] text-white text-xs px-3 py-1 rounded-xl font-bold tracking-wide shadow-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{branch} Branch</span>
                  </span>
                  <span className="text-xs text-slate-400 hidden sm:inline">•</span>
                  <span className="text-xs font-semibold text-slate-600 hidden sm:inline">
                    Operations Command Center
                  </span>
                </div>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mt-0.5">
                  {getGreeting()},{" "}
                  <span className="text-blue-700">
                    {staffDisplayName}
                  </span>
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              

              {/* Refresh Action */}
              <button
                onClick={() => fetchDashboardData()}
                disabled={refreshing}
                className="p-2 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl transition-all border border-slate-200 cursor-pointer disabled:opacity-50 shadow-2xs"
                title="Refresh Branch Data"
              >
                <HugeiconsIcon
                  icon={RefreshIcon}
                  className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-600" : ""}`}
                />
              </button>

              <HeaderNotificationBell href="/Office_Staff/Notifications" />
              <UserAvatarDropdown userType="office_staff" />
            </div>
          </header>

          {/* Toast Notification */}
          {toastMessage && (
            <div
              className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                toastMessage.type === "success"
                  ? "bg-emerald-600 text-white border-emerald-700"
                  : "bg-red-600 text-white border-red-700"
              }`}
            >
              <HugeiconsIcon
                icon={toastMessage.type === "success" ? CheckmarkCircle01Icon : Alert02Icon}
                className="w-4 h-4"
              />
              <span>{toastMessage.text}</span>
            </div>
          )}

          

          {/* Main Dashboard Body */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
            {/* HERO KPI CARDS GRID (Elevated Card Design) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
              {/* 1. Unassigned Claims */}
              <div
                onClick={() => setClaimsFilter("unassigned")}
                className={`bg-white border-l-[5px] border-l-rose-500 bg-gradient-to-r from-rose-50/30 via-white to-white p-4 rounded-2xl border border-slate-200/90 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md hover:-translate-y-0.5 select-none group`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Unassigned</span>
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                    {stats.unassignedClaims > 0 ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                    ) : (
                      <HugeiconsIcon icon={Alert02Icon} className="w-4 h-4" />
                    )}
                  </div>
                </div>
                <div className="text-2xl font-black text-rose-700 mt-2 group-hover:scale-105 transition-transform origin-left">{stats.unassignedClaims}</div>
                <p className="text-[10px] text-rose-600/90 font-semibold mt-0.5 truncate">Needs quick dispatch</p>
              </div>

              {/* 2. Active Claims */}
              <div
                onClick={() => setClaimsFilter("active")}
                className="bg-white border-l-[5px] border-l-emerald-500 bg-gradient-to-r from-emerald-50/20 via-white to-white p-4 rounded-2xl border border-slate-200/90 hover:border-slate-300 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md hover:-translate-y-0.5 select-none group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Active Claims</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 mt-2 group-hover:scale-105 transition-transform origin-left">{stats.activeClaims}</div>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">Under assessment</p>
              </div>

              {/* 3. New Registrations */}
              <Link
                href="/Office_Staff/Registrations"
                className="bg-white border-l-[5px] border-l-amber-500 bg-gradient-to-r from-amber-50/20 via-white to-white p-4 rounded-2xl border border-slate-200/90 hover:border-amber-300 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md hover:-translate-y-0.5 select-none block group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Signups</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                    <HugeiconsIcon icon={UserAdd01Icon} className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 mt-2 group-hover:scale-105 transition-transform origin-left">{stats.newRegistrations}</div>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">Pending approval</p>
              </Link>

              {/* 4. Third-Party Driver Requests */}
              <Link
                href="/Office_Staff/ThirdParty"
                className="bg-white border-l-[5px] border-l-purple-500 bg-gradient-to-r from-purple-50/20 via-white to-white p-4 rounded-2xl border border-slate-200/90 hover:border-purple-300 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md hover:-translate-y-0.5 select-none block group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Third-Party</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                    <HugeiconsIcon icon={Car01Icon} className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-purple-900 mt-2 group-hover:scale-105 transition-transform origin-left">
                  {stats.thirdParty.pendingApproval + stats.thirdParty.pendingTermination}
                </div>
                <p className="text-[10px] text-purple-600 font-medium mt-0.5 truncate">
                  {stats.thirdParty.approved} active passes
                </p>
              </Link>

              {/* 5. Branch Agents */}
              <Link
                href="/Office_Staff/Agents"
                className="bg-white border-l-[5px] border-l-blue-500 bg-gradient-to-r from-blue-50/20 via-white to-white p-4 rounded-2xl border border-slate-200/90 hover:border-blue-300 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md hover:-translate-y-0.5 select-none block group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Field Agents</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                    <HugeiconsIcon icon={UserCheck01Icon} className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 mt-2 group-hover:scale-105 transition-transform origin-left">{stats.totalAgents}</div>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">On-duty in branch</p>
              </Link>

              {/* 6. Total Policyholders */}
              <Link
                href="/Office_Staff/PolicyHolders"
                className="bg-white border-l-[5px] border-l-indigo-500 bg-gradient-to-r from-indigo-50/20 via-white to-white p-4 rounded-2xl border border-slate-200/90 hover:border-indigo-300 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md hover:-translate-y-0.5 select-none block group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Policyholders</span>
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                    <HugeiconsIcon icon={UserMultiple02Icon} className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 mt-2 group-hover:scale-105 transition-transform origin-left">{stats.totalPolicyHolders}</div>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">Active insured members</p>
              </Link>
            </div>

            {/* MAIN TWO-COLUMN DASHBOARD HUB (Redesigned with Accent Cards & Rich Tokens) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT 8-COLS: LIVE CLAIMS DISPATCH QUEUE */}
              <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col gap-5">
                {/* Header & Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#102A43] to-[#1B365D] text-white flex items-center justify-center font-bold shadow-2xs shrink-0">
                      <HugeiconsIcon icon={File01Icon} className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900 tracking-tight">
                        Live Claims Dispatch Hub
                      </h2>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Real-time incoming vehicle accident claims for {branch} Branch
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/Office_Staff/Claims"
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#102A43] font-bold text-xs flex items-center gap-1.5 self-start sm:self-auto transition-all shadow-2xs hover:shadow-xs active:scale-95 border border-slate-200/70"
                  >
                    <span>Full Claims Console</span>
                    <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Filter Tabs & Search */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    {[
                      { key: "all", label: "All Claims", count: rawClaimsList.length },
                      {
                        key: "unassigned",
                        label: "Unassigned",
                        count: stats.unassignedClaims,
                        alert: stats.unassignedClaims > 0
                      },
                      {
                        key: "urgent",
                        label: "Urgent",
                        count: rawClaimsList.filter((c) => c.urgency === "Urgent").length
                      },
                      {
                        key: "active",
                        label: "In Progress",
                        count: stats.activeClaims
                      }
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setClaimsFilter(tab.key as any)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border flex items-center gap-1.5 ${
                          claimsFilter === tab.key
                            ? "bg-[#102A43] text-white border-[#102A43] shadow-xs"
                            : tab.alert
                            ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <span>{tab.label}</span>
                        {tab.count !== undefined && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              claimsFilter === tab.key
                                ? "bg-white/20 text-white"
                                : tab.alert
                                ? "bg-rose-600 text-white"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {tab.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Search box */}
                  <div className="relative w-full sm:w-64 shrink-0">
                    <HugeiconsIcon
                      icon={Search01Icon}
                      className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search plate, claim, driver..."
                      className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#102A43]/20 focus:border-[#102A43] font-medium"
                    />
                  </div>
                </div>

                {/* Claims Cards Queue */}
                {loading ? (
                  <div className="py-16 flex flex-col items-center justify-center">
                    <HugeiconsIcon icon={Loading03Icon} className="w-6 h-6 animate-spin text-blue-600" />
                    <span className="text-xs font-semibold text-slate-400 mt-2">Loading live claims queue...</span>
                  </div>
                ) : filteredClaims.length === 0 ? (
                  <div className="py-14 px-4 rounded-2xl border border-dashed border-slate-200 text-center bg-slate-50/50">
                    <HugeiconsIcon icon={Shield01Icon} className="w-9 h-9 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">No Claims in this Queue View</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      All claims for this filter category have been attended to.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredClaims.slice(0, 7).map((claim) => {
                      const isUrgent = claim.urgency === "Urgent";
                      const isUnassigned = !claim.assignedAgent || claim.assignedAgent.trim() === "";

                      let borderAccentClass = "border-l-blue-500";
                      let gradientBgClass = "from-blue-50/15 via-transparent to-transparent";

                      if (isUrgent) {
                        borderAccentClass = "border-l-rose-500";
                        gradientBgClass = "from-rose-50/20 via-transparent to-transparent";
                      } else if (isUnassigned) {
                        borderAccentClass = "border-l-amber-500";
                        gradientBgClass = "from-amber-50/20 via-transparent to-transparent";
                      }

                      return (
                        <div
                          key={claim.id}
                          className={`bg-white border-l-[6px] ${borderAccentClass} bg-gradient-to-r ${gradientBgClass} border border-slate-200/90 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3.5 transition-all duration-200 shadow-2xs hover:shadow-md group relative overflow-hidden`}
                        >
                          {/* Left: Vehicle Icon & Claim Info */}
                          <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                            <div
                              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-bold transition-all shadow-2xs ${
                                isUrgent
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : isUnassigned
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-slate-100 text-[#102A43] border border-slate-200 group-hover:bg-[#102A43] group-hover:text-white"
                              }`}
                            >
                              <HugeiconsIcon icon={Car01Icon} className="w-5 h-5" />
                            </div>

                            <div className="min-w-0 flex-1 space-y-1">
                              {/* Top Tag Row: Claim Ref, Plate, Status */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-bold text-[#102A43] bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200/80">
                                  #{claim.id}
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#FFF9E6] text-[#2D2A26] border border-[#E5C77A] font-mono font-bold text-xs shadow-2xs">
                                  {claim.vehicleNo}
                                </span>
                                {isUrgent && (
                                  <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                                    <span>URGENT</span>
                                  </span>
                                )}
                                {isUnassigned ? (
                                  <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full">
                                    <HugeiconsIcon icon={Alert02Icon} className="w-3 h-3 text-amber-600" />
                                    <span>Awaiting Agent</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium bg-slate-50 px-2.5 py-0.5 rounded-md border border-slate-200/70">
                                    Agent: <strong className="text-slate-800 font-semibold">{claim.assignedAgent}</strong>
                                  </span>
                                )}
                              </div>

                              {/* Middle Line: Applicant & Details */}
                              <div className="flex items-center gap-2.5 text-xs text-slate-500 flex-wrap">
                                <span className="font-semibold text-slate-800">
                                  {claim.isThirdParty ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-bold text-xs">
                                      <HugeiconsIcon icon={UserCheck01Icon} className="w-3 h-3 text-purple-600" />
                                      <span>Driver: {claim.applicantName}</span>
                                    </span>
                                  ) : (
                                    <span>Owner: {claim.applicantName}</span>
                                  )}
                                </span>
                                <span>•</span>
                                <span className="text-slate-700 font-medium">{claim.type}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-slate-500 truncate max-w-[200px]" title={claim.location}>
                                  <HugeiconsIcon icon={Location01Icon} className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="truncate">{claim.location}</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Timestamp & Actions */}
                          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline mr-1">
                              {claim.time}
                            </span>

                            {/* Quick Agent Assign button */}
                            {isUnassigned && (
                              <button
                                type="button"
                                onClick={() => {
                                  setClaimToAssign(claim);
                                  setSelectedAgentEmail(branchAgents[0]?.email || "");
                                }}
                                className="px-3.5 py-1.5 bg-[#102A43] hover:bg-[#1B365D] text-white rounded-xl text-xs font-bold transition-all cursor-pointer border-none shadow-2xs hover:shadow-xs active:scale-95 flex items-center gap-1.5"
                              >
                                <span>Assign Agent</span>
                              </button>
                            )}

                            {/* Details modal trigger */}
                            <button
                              type="button"
                              onClick={() => {
                                markClaimAsRead(claim.rawClaim || claim.id, viewedClaims, setViewedClaims, "office_staff");
                                setSelectedClaim(claim.rawClaim || claim);
                              }}
                              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200 shadow-2xs hover:shadow-xs active:scale-95 flex items-center gap-1.5"
                            >
                              <HugeiconsIcon icon={ViewIcon} className="w-3.5 h-3.5 text-slate-600" />
                              <span>Details</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* RIGHT 4-COLS: OPERATIONAL MODULES (REGISTRATIONS, THIRD-PARTY, AGENTS) */}
              <div className="lg:col-span-4 space-y-6">
                {/* MODULE 1: NEW POLICYHOLDER REGISTRATIONS */}
                <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-bold shadow-2xs">
                        <HugeiconsIcon icon={UserAdd01Icon} className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-900">New Signups</h3>
                        <p className="text-[10px] text-slate-400">Policyholders pending review</p>
                      </div>
                    </div>
                    <Link
                      href="/Office_Staff/Registrations"
                      className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[11px] border border-amber-200/70 transition-all shadow-2xs"
                    >
                      View All ({newRegistrations.length})
                    </Link>
                  </div>

                  {newRegistrations.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">No new registrations pending.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {newRegistrations.slice(0, 4).map((reg, idx) => (
                        <div
                          key={reg._id || idx}
                          className="p-3 rounded-xl bg-white hover:bg-slate-50/80 transition-all border border-slate-200/80 border-l-[4px] border-l-amber-500 flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs group"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-slate-900 text-xs block truncate" title={reg.name}>
                              {reg.name}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                              {reg.nic || `${reg.vehiclesCount} vehicle(s)`} • {reg.date}
                            </span>
                          </div>
                          <Link
                            href="/Office_Staff/Registrations"
                            className="px-3 py-1 bg-[#102A43] hover:bg-[#1B365D] text-white font-bold rounded-lg text-xs shadow-2xs transition-all active:scale-95 shrink-0"
                          >
                            Verify
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* MODULE 2: THIRD-PARTY DRIVER REQUESTS & TERMINATIONS */}
                <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center font-bold shadow-2xs">
                        <HugeiconsIcon icon={Car01Icon} className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-900">Third-Party Drivers</h3>
                        <p className="text-[10px] text-slate-400">Permits & termination requests</p>
                      </div>
                    </div>
                    <Link
                      href="/Office_Staff/ThirdParty"
                      className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-[11px] border border-purple-200/70 transition-all shadow-2xs"
                    >
                      Manage ({recentThirdParty.length})
                    </Link>
                  </div>

                  {recentThirdParty.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">No third-party requests on file.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {recentThirdParty.slice(0, 4).map((tp) => {
                        const isApproved = tp.status === "Approved";
                        const isPending = tp.status === "Pending Branch Approval";
                        const isPendingTerm = tp.status === "Pending Termination Approval";

                        let borderClass = "border-l-purple-500";
                        if (isApproved) borderClass = "border-l-emerald-500";
                        else if (isPending) borderClass = "border-l-amber-500";
                        else if (isPendingTerm) borderClass = "border-l-rose-500";

                        return (
                          <div
                            key={tp._id}
                            className={`p-3 rounded-xl bg-white hover:bg-slate-50/80 transition-all border border-slate-200/80 border-l-[4px] ${borderClass} flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs group`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 text-xs truncate" title={tp.driverName}>
                                  {tp.driverName}
                                </span>
                                <span
                                  className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-full ${
                                    isApproved
                                      ? "bg-emerald-100 text-emerald-800"
                                      : isPending
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-purple-100 text-purple-800"
                                  }`}
                                >
                                  {isPending ? "Pending" : isPendingTerm ? "Termination" : tp.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-[#FFF9E6] text-[#2D2A26] border border-[#E5C77A] font-mono text-[10px] font-bold">
                                  {tp.plate}
                                </span>
                                <span className="text-[10px] text-slate-500 truncate" title={tp.policyHolderName}>
                                  Owner: {tp.policyHolderName}
                                </span>
                              </div>
                            </div>
                            <Link
                              href="/Office_Staff/ThirdParty"
                              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs border border-slate-200 shadow-2xs transition-all active:scale-95 shrink-0"
                            >
                              Review
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* MODULE 3: BRANCH FIELD AGENTS ROSTER */}
                <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold shadow-2xs">
                        <HugeiconsIcon icon={UserCheck01Icon} className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-900">Branch Field Surveyors</h3>
                        <p className="text-[10px] text-slate-400">On-duty agents roster</p>
                      </div>
                    </div>
                    <Link
                      href="/Office_Staff/Agents"
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-200/70 transition-all shadow-2xs"
                    >
                      Manage ({branchAgents.length})
                    </Link>
                  </div>

                  {branchAgents.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">No agents registered in this branch.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {branchAgents.slice(0, 4).map((agent) => (
                        <div
                          key={agent._id}
                          className="p-3 rounded-xl bg-white hover:bg-slate-50/80 transition-all border border-slate-200/80 border-l-[4px] border-l-emerald-500 flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs group"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                              <span className="font-bold text-slate-900 text-xs truncate" title={agent.name}>
                                {agent.name}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block font-mono mt-0.5 truncate">
                              {agent.phone || agent.email}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                            {agent.activeClaimsCount || 0} active
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

{/* QUICK AGENT ASSIGNMENT MODAL */}
      {claimToAssign && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-md shadow-2xl p-6 text-left space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                  <HugeiconsIcon icon={UserCheck01Icon} className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Assign Field Agent</h3>
                  <p className="text-[10px] text-slate-400">Claim #{claimToAssign.id || claimToAssign.claimNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setClaimToAssign(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Vehicle:</span>
                <strong className="font-mono text-slate-800">{claimToAssign.vehicleNo}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Applicant:</span>
                <strong className="text-slate-800">{claimToAssign.applicantName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Damage:</span>
                <span className="text-slate-700 font-semibold">{claimToAssign.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Location:</span>
                <span className="text-slate-700 truncate max-w-[200px]">{claimToAssign.location}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Select Branch Surveyor / Agent <span className="text-red-500">*</span>
              </label>
              {branchAgents.length === 0 ? (
                <p className="text-xs text-red-500 font-semibold">
                  No active agents found in {branch} Branch. Please add agents first.
                </p>
              ) : (
                <select
                  value={selectedAgentEmail}
                  onChange={(e) => setSelectedAgentEmail(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600 bg-white"
                >
                  {branchAgents.map((agent) => (
                    <option key={agent._id} value={agent.email}>
                      {agent.name} ({agent.activeClaimsCount || 0} active claims)
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setClaimToAssign(null)}
                disabled={assigningAgent}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignAgentSubmit}
                disabled={assigningAgent || branchAgents.length === 0}
                className="px-5 py-2 bg-[#0B192C] hover:bg-blue-900 text-white rounded-xl text-xs font-bold transition-all border-none cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                {assigningAgent && <HugeiconsIcon icon={Loading03Icon} className="w-4 h-4 animate-spin" />}
                <span>Assign & Dispatch</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLAIM DETAILS MODAL */}
      {selectedClaim && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-800 text-left">
            <div className="px-6 pt-5 pb-4 flex justify-between items-center border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Claim Overview: #{selectedClaim.claimNumber}
              </h3>
              <button
                onClick={() => setSelectedClaim(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Status</span>
                  <span className="font-bold text-slate-800">{selectedClaim.status}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Severity</span>
                  <span className={checkUrgent(selectedClaim) ? "text-red-600 font-bold" : "text-slate-800 font-bold"}>
                    {checkUrgent(selectedClaim) ? "URGENT ACCIDENT" : "Standard"}
                  </span>
                </div>
              </div>

              <div className="space-y-2 divide-y divide-slate-100">
                <div className="flex justify-between pt-2">
                  <span className="text-slate-400">Applicant:</span>
                  <strong className="text-slate-800">
                    {selectedClaim.submittedByDriver?.isThirdParty
                      ? `${selectedClaim.submittedByDriver.driverName} (Authorized Driver)`
                      : selectedClaim.policyHolderName || "Policyholder"}
                  </strong>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-slate-400">Vehicle Number:</span>
                  <strong className="font-mono text-slate-800">{selectedClaim.vehiclePlate}</strong>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-slate-400">Damage Classification:</span>
                  <span className="text-slate-700 font-bold">{selectedClaim.damageType}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-slate-400">Incident Location:</span>
                  <span className="text-slate-700 font-semibold">{selectedClaim.location}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-slate-400">Assigned Agent:</span>
                  <span className="text-blue-700 font-bold">{selectedClaim.assignedAgent || "Unassigned"}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-slate-400">Claim Amount:</span>
                  <strong className="text-slate-900">{selectedClaim.amount ? `Rs. ${selectedClaim.amount}` : "Pending Evaluation"}</strong>
                </div>
              </div>

              {selectedClaim.description && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Description</span>
                  <p className="text-slate-600 leading-relaxed">{selectedClaim.description}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedClaim(null)}
                className="px-5 py-2 bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer border-none"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASSWORD CHANGE MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 text-left space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <HugeiconsIcon icon={LockIcon} className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Update Password</h3>
                <p className="text-xs text-slate-500">Please change your temporary login credentials.</p>
              </div>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-3.5 text-xs">
              {passwordError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl border border-red-200 font-bold">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl border border-emerald-200 font-bold">
                  {passwordSuccess}
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                  Current Temporary Password
                </label>
                <input
                  type="password"
                  required
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  placeholder="Enter current password"
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-medium text-xs focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="6-12 characters with numbers"
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-medium text-xs focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="Re-enter new password"
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-medium text-xs focus:outline-none focus:border-blue-600"
                />
              </div>

              <button
                type="submit"
                disabled={isUpdatingPassword}
                className="w-full py-3 bg-[#0B192C] hover:bg-blue-900 text-white rounded-xl font-bold cursor-pointer transition-all border-none mt-2"
              >
                {isUpdatingPassword ? "Updating Password..." : "Save Password"}
              </button>
            </form>
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
