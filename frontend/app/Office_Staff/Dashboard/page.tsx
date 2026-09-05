"use client";

import React, { useState, useEffect } from "react";
import OfficeStaffNavbar from "@/app/Components/Office Staff/Navbar";
import UserAvatarDropdown from "@/app/Components/UserAvatarDropdown";
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
  Loading03Icon
} from "@hugeicons/core-free-icons";

interface RegistrationItem {
  name: string;
  vehiclesCount: number;
  date: string;
}

// Returns true if the claim has attributes indicating urgent attention is required.
const checkUrgent = (claim: any) => {
  return (
    claim.damageType?.toLowerCase().includes("severe") ||
    claim.description?.toLowerCase().includes("urgent") ||
    claim.priority?.toLowerCase() === "high" ||
    claim.priority?.toLowerCase() === "urgent"
  );
};

export default function OfficeStaffDashboard() {
  const [branch, setBranch] = useState("Galle");
  const [stats, setStats] = useState({
    unassignedClaims: 0,
    newRegistrations: 0,
    activeClaims: 0,
    pendingClaims: 0,
  });
  const [newClaims, setNewClaims] = useState<any[]>([]);
  const [newRegistrations, setNewRegistrations] = useState<RegistrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedClaim, setSelectedClaim] = useState<any | null>(null);
  const [detailedClaim, setDetailedClaim] = useState<any | null>(null);

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
      const res = await fetch("http://localhost:5000/api/office-staff/change-password", {
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
      
      // Update sessionStorage
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

  useEffect(() => {
    if (selectedClaim) {
      const fetchFullClaim = async () => {
        try {
          const res = await fetch(`http://localhost:5000/api/policy-holder/track-claim?claimNumber=${encodeURIComponent(selectedClaim.claimNumber)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.claim) {
              setDetailedClaim(data.claim);
            }
          }
        } catch (err) {
          console.error("Error fetching full claim details for office staff", err);
        }
      };
      fetchFullClaim();
    } else {
      setDetailedClaim(null);
    }
  }, [selectedClaim]);

  // Lock background scroll when password modal is open
  useEffect(() => {
    if (showPasswordModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showPasswordModal]);

  // --- Side Effects & API Calls ---
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
            if (staffObj.mustChangePassword) {
              setShowPasswordModal(true);
            }
          }
          if (staffObj && staffObj.email) {
            setStaffEmail(staffObj.email);
          }
          if (staffObj && staffObj.mustChangePassword) {
            setShowPasswordModal(true);
          }
        } catch (e) {
          console.error("Error parsing logged_in_staff", e);
        }
      }
    }
    setBranch(currentBranch);
    setStaffEmail(email);

    async function fetchStats() {
      try {
        const res = await fetch(`http://localhost:5000/api/office-staff/dashboard-stats?branch=${currentBranch}`);
        if (!res.ok) {
          throw new Error("Failed to load dashboard metrics.");
        }
        const data = await res.json();
        setStats(data.stats);

        // Filter: Hide claims that already have an assigned agent
        const unassignedClaims = (data.newClaims || []).filter(
          (c: any) => !c.assignedAgent || c.assignedAgent.trim() === ""
        );

        // Sort: Urgent claims first, then latest first
        const sortedClaims = [...unassignedClaims].sort((a: any, b: any) => {
          const aUrgent = checkUrgent(a);
          const bUrgent = checkUrgent(b);
          if (aUrgent && !bUrgent) return -1;
          if (!aUrgent && bUrgent) return 1;
          return 0;
        });

        // Limit to latest 5 claims
        const latest5Claims = sortedClaims.slice(0, 5);

        const formattedClaims = latest5Claims.map((claim: any) => {
          const isUrgent = checkUrgent(claim);
          return {
            id: claim.claimNumber,
            urgency: isUrgent ? "Urgent" : "Normal",
            vehicleNo: claim.vehiclePlate,
            vehicleModel: claim.vehiclePlate?.substring(0, 3),
            type: claim.damageType,
            location: claim.location,
            time: new Date(claim.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            rawClaim: claim,
          };
        });
        setNewClaims(formattedClaims);

        // Format registrations list from DB
        const formattedRegs = data.newRegistrations.map((user: any) => ({
          name: `${user.firstName} ${user.lastName}`,
          vehiclesCount: user.vehicles ? user.vehicles.length : 0,
          date: new Date(user.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
        }));
        setNewRegistrations(formattedRegs);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load branch statistics");
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
    const interval = setInterval(fetchStats, 7000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans">
      {/* Sidebar + Main Content Row */}
      <div className="flex flex-1 flex-row min-h-0">
        {/* Left Sidebar */}
        <OfficeStaffNavbar />

        {/* Right Main Container */}
        <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
          {/* Top Header Bar */}
          <header className="bg-white border-b border-slate-100 text-slate-800 px-8 py-4 flex justify-between items-center select-none shadow-sm flex-shrink-0 h-[80px] sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("open-mobile-menu"))}
                className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 active:scale-95 transition-all cursor-pointer focus:outline-none"
              >
                <HugeiconsIcon icon={Menu01Icon} className="w-6 h-6" strokeWidth={2.5} />
              </button>
              <h1 className="text-xl font-semibold text-slate-800 flex items-center gap-2 pl-2 lg:pl-0">
                <span className="hidden lg:inline">Welcome back, </span>
                <span className="bg-[#102A43] text-white text-base px-4 py-2 rounded-xl font-black shadow-sm tracking-wide">
                  {branch} Branch
                </span>
              </h1>
            </div>
            
            <div className="flex items-center gap-5">
              {/* Notification Bell Icon */}
              <button className="relative p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer focus:outline-none">
                <HugeiconsIcon icon={Notification01Icon} className="w-6 h-6 text-slate-500 hover:text-slate-800" strokeWidth={2} />
              </button>
              {/* User Avatar Icon */}
              <UserAvatarDropdown userType="office_staff" />
            </div>
          </header>

          {/* Page Content Dashboard */}
          <main className="flex-1 p-4 lg:p-8 bg-white overflow-y-auto">
            {loading ? (
              <div className="w-full h-full flex flex-col items-center justify-center min-h-[300px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#f59e0b]"></div>
                <span className="mt-4 text-slate-500 font-bold">Loading branch metrics...</span>
              </div>
            ) : error ? (
              <div className="w-full h-full flex flex-col items-center justify-center min-h-[300px] text-red-500 font-bold bg-red-50 rounded-2xl p-8 border border-red-200">
                <HugeiconsIcon icon={AlertCircleIcon} className="w-10 h-10 mb-2 text-red-500" strokeWidth={2} />
                <span>{error}</span>
              </div>
            ) : (
              <>
                {/* 4 Cards Grid - Desktop view */}
                <div className="hidden lg:grid grid-cols-4 gap-6 mb-12">
                  {/* Unassigned Claims Card (Red themed) */}
                  <div className="bg-white rounded-[20px] border border-red-500 p-6 flex flex-col items-center justify-center text-center h-[120px] shadow-sm select-none">
                    <span className="text-3xl font-black text-red-500 tracking-tight">
                      {stats.unassignedClaims}
                    </span>
                    <span className="text-red-500 font-bold text-sm mt-1">Unassigned Claims</span>
                  </div>

                  {/* New Registrations Card */}
                  <div className="bg-white rounded-[20px] border border-slate-700/80 p-6 flex flex-col items-center justify-center text-center h-[120px] shadow-sm select-none">
                    <span className="text-3xl font-black text-slate-800 tracking-tight">
                      {stats.newRegistrations}
                    </span>
                    <span className="text-slate-500 font-bold text-sm mt-1">New Registrations</span>
                  </div>

                  {/* Active Claims Card */}
                  <div className="bg-white rounded-[20px] border border-slate-700/80 p-6 flex flex-col items-center justify-center text-center h-[120px] shadow-sm select-none">
                    <span className="text-3xl font-black text-slate-800 tracking-tight">
                      {stats.activeClaims}
                    </span>
                    <span className="text-slate-500 font-bold text-sm mt-1">Active Claims</span>
                  </div>

                  {/* Pending Claims Card */}
                  <div className="bg-white rounded-[20px] border border-slate-700/80 p-6 flex flex-col items-center justify-center text-center h-[120px] shadow-sm select-none">
                    <span className="text-3xl font-black text-slate-800 tracking-tight">
                      {stats.pendingClaims}
                    </span>
                    <span className="text-slate-500 font-bold text-sm mt-1">Pending Claims</span>
                  </div>
                </div>

                {/* 4 Cards Grid - Mobile view */}
                <div className="grid lg:hidden grid-cols-1 gap-4 mb-8">
                  {/* Unassigned Claims Card */}
                  <div className="bg-gradient-to-br from-red-50/50 to-white rounded-[20px] border border-red-100/70 p-4 flex items-center justify-between shadow-xs select-none hover:scale-[1.01] transition-all h-[80px]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100/60 rounded-xl text-red-600 flex-shrink-0">
                        <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5 text-red-600" strokeWidth={2.5} />
                      </div>
                      <span className="text-slate-600 font-bold text-xs">Unassigned Claims</span>
                    </div>
                    <span className="text-xl font-black text-red-600 tracking-tight pr-1 flex-shrink-0">
                      {stats.unassignedClaims}
                    </span>
                  </div>

                  {/* New Registrations Card */}
                  <div className="bg-gradient-to-br from-blue-50/50 to-white rounded-[20px] border border-blue-100/70 p-4 flex items-center justify-between shadow-xs select-none hover:scale-[1.01] transition-all h-[80px]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100/60 rounded-xl text-blue-900 flex-shrink-0">
                        <HugeiconsIcon icon={UserAdd01Icon} className="w-5 h-5 text-blue-900" strokeWidth={2.5} />
                      </div>
                      <span className="text-slate-600 font-bold text-xs">New Registrations</span>
                    </div>
                    <span className="text-xl font-black text-blue-900 tracking-tight pr-1 flex-shrink-0">
                      {stats.newRegistrations}
                    </span>
                  </div>

                  {/* Active Claims Card */}
                  <div className="bg-gradient-to-br from-emerald-50/50 to-white rounded-[20px] border border-emerald-100/70 p-4 flex items-center justify-between shadow-xs select-none hover:scale-[1.01] transition-all h-[80px]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100/60 rounded-xl text-emerald-800 flex-shrink-0">
                        <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-5 h-5 text-emerald-800" strokeWidth={2.5} />
                      </div>
                      <span className="text-slate-600 font-bold text-xs">Active Claims</span>
                    </div>
                    <span className="text-xl font-black text-emerald-800 tracking-tight pr-1 flex-shrink-0">
                      {stats.activeClaims}
                    </span>
                  </div>

                  {/* Pending Claims Card */}
                  <div className="bg-gradient-to-br from-amber-50/50 to-white rounded-[20px] border border-amber-100/70 p-4 flex items-center justify-between shadow-xs select-none hover:scale-[1.01] transition-all h-[80px]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100/60 rounded-xl text-amber-800 flex-shrink-0">
                        <HugeiconsIcon icon={Clock01Icon} className="w-5 h-5 text-amber-800" strokeWidth={2.5} />
                      </div>
                      <span className="text-slate-600 font-bold text-xs">Pending Claims</span>
                    </div>
                    <span className="text-xl font-black text-amber-800 tracking-tight pr-1 flex-shrink-0">
                      {stats.pendingClaims}
                    </span>
                  </div>
                </div>

                {/* Columns split: New Claims & New Registration */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                  
                  {/* Left Column: New Claims (8 cols) */}
                  <div className="lg:col-span-8 flex flex-col select-none">
                    <div className="flex items-center gap-2 mb-6">
                      <HugeiconsIcon icon={File01Icon} className="w-5 h-5 text-slate-700 flex-shrink-0" strokeWidth={2.5} />
                      <h2 className="text-lg font-black text-slate-800 tracking-wide">
                        New Claims
                      </h2>
                    </div>

                    {newClaims.length === 0 ? (
                      <div className="border border-slate-200 rounded-[24px] p-8 text-center text-slate-400 font-bold">
                        No new claims for this branch
                      </div>
                    ) : (
                      <div className="flex flex-col gap-6">
                        {newClaims.map((claim, index) => {
                          const isUrgent = claim.urgency === "Urgent";
                          const cardBorderClass = isUrgent ? "border-red-500" : "border-blue-500";
                          const headerTextClass = isUrgent ? "text-red-500" : "text-blue-500";

                          return (
                            <div
                              key={index}
                              className={`bg-white border-2 ${cardBorderClass} rounded-[20px] px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-6 w-full max-w-full`}
                            >
                              {/* Left / Info Group */}
                              <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8 flex-1 min-w-0">
                                {/* Title / Urgency */}
                                <div className="flex-shrink-0">
                                  <span className={`font-black text-base ${headerTextClass} block`}>
                                    {claim.urgency}
                                  </span>
                                  <span className="text-[11px] font-extrabold text-slate-400 block tracking-wider uppercase">
                                    {claim.id}
                                  </span>
                                </div>

                                {/* Specifications Row */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-slate-600 text-xs font-bold flex-1">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-[9px] text-slate-400 uppercase tracking-wider font-extrabold select-none">Vehicle No</span>
                                    <span className="text-slate-800">{claim.vehicleNo}</span>
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-[9px] text-slate-400 uppercase tracking-wider font-extrabold select-none">Type</span>
                                    <span className="text-slate-800">{claim.type}</span>
                                  </div>
                                  <div className="flex flex-col gap-0.5 col-span-2 sm:col-span-1">
                                    <span className="text-[9px] text-slate-400 uppercase tracking-wider font-extrabold select-none">Location</span>
                                    <span className="text-slate-800 truncate" title={claim.location}>{claim.location}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Right / Buttons & Time */}
                              <div className="flex items-center gap-5 flex-shrink-0">
                                <span className="text-[11px] text-slate-400 font-bold select-none">
                                  {claim.time}
                                </span>
                                <button
                                  onClick={() => setSelectedClaim(claim.rawClaim)}
                                  className="bg-slate-700 hover:bg-slate-800 active:scale-95 text-white font-extrabold text-[13px] px-6 py-3 rounded-full transition-all tracking-wide cursor-pointer focus:outline-none shadow-sm shadow-slate-500/20 whitespace-nowrap text-center border-none"
                                >
                                  Details
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Right Column: New Registration (4 cols) */}
                  <div className="lg:col-span-4 flex flex-col select-none">
                    <div className="flex items-center gap-2 mb-6">
                      <HugeiconsIcon icon={UserMultiple02Icon} className="w-5 h-5 text-slate-700 flex-shrink-0" strokeWidth={2.5} />
                      <h2 className="text-lg font-black text-slate-800 tracking-wide">
                        New Registration
                      </h2>
                    </div>

                    {newRegistrations.length === 0 ? (
                      <div className="border border-slate-200 rounded-[24px] p-8 text-center text-slate-400 font-bold">
                        No new registrations for this branch
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {newRegistrations.map((reg, index) => (
                          <div
                            key={index}
                            className="bg-slate-50 rounded-2xl p-5 flex flex-col shadow-sm"
                          >
                            <span className="font-black text-slate-800 text-[15px] mb-1">
                              {reg.name}
                            </span>
                            <span className="text-[12px] text-slate-400 font-bold">
                              {reg.vehiclesCount} {reg.vehiclesCount === 1 ? "Vehicle" : "Vehicles"} · {reg.date}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </>
            )}
          </main>
        </div>
      </div>

      {/* Floating Action Chat Button */}
      <button className="fixed bottom-24 right-8 w-14 h-14 bg-[#00ddff] hover:bg-[#00cceb] text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer z-50 group">
        <HugeiconsIcon icon={BubbleChatIcon} className="w-7 h-7 text-white" strokeWidth={2} />
      </button>

      {selectedClaim && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[24px] border border-slate-150 w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-800 text-left">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 flex justify-between items-center border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">
                Claim Details: {selectedClaim.claimNumber}
              </h3>
              <button
                onClick={() => setSelectedClaim(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 hover:bg-slate-50 rounded-full transition-all"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={2.5} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-sm font-semibold text-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold select-none">Status</span>
                  <span className="text-slate-800">{selectedClaim.status}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold select-none">Urgency</span>
                  <span className={checkUrgent(selectedClaim) ? "text-red-600 font-extrabold" : "text-slate-800"}>
                    {checkUrgent(selectedClaim) ? "Urgent" : "Normal"}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 my-3" />

              <div className="space-y-3">
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-400 font-medium">Vehicle Plate</span>
                  <span className="text-slate-800 font-bold">{selectedClaim.vehiclePlate}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-400 font-medium">Damage Type</span>
                  <span className="text-slate-800 font-bold">{selectedClaim.damageType}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-400 font-medium">Location</span>
                  <span className="text-slate-800 font-bold">{selectedClaim.location}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-400 font-medium">Incident Date</span>
                  <span className="text-slate-800 font-bold">{new Date(selectedClaim.incidentDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-400 font-medium">Incident Time</span>
                  <span className="text-slate-800 font-bold">{selectedClaim.incidentTime}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-400 font-medium">Assigned Agent</span>
                  <span className="text-slate-800 font-bold">{selectedClaim.assignedAgent || "None assigned"}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-400 font-medium">Claim Amount</span>
                  <span className="text-slate-800 font-bold">{selectedClaim.amount ? `Rs. ${selectedClaim.amount}` : "Pending Evaluation"}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1 mt-2">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold select-none">Description</span>
                <p className="text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs leading-relaxed whitespace-pre-wrap">
                  {selectedClaim.description || "No description provided."}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedClaim(null)}
                className="bg-slate-700 hover:bg-slate-800 active:scale-95 text-white font-extrabold text-xs px-6 py-3 rounded-full transition-all cursor-pointer shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white border border-slate-100 rounded-[32px] shadow-[0_20px_50px_rgba(15,23,42,0.08)] flex flex-col my-auto overflow-hidden max-h-[95vh] transition-all duration-300">
            <div className="overflow-y-auto flex-1 flex flex-col">
              {/* Header */}
              <div className="px-8 pt-8 pb-5 select-none relative flex-shrink-0 border-b border-slate-100/60 bg-slate-50/55">
                <h2 className="font-extrabold text-xl text-slate-800 tracking-tight flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                    <HugeiconsIcon icon={LockIcon} className="w-5 h-5 text-slate-600" strokeWidth={2.5} />
                  </div>
                  Update Password
                </h2>
                <p className="text-slate-600 text-xs font-semibold mt-2 leading-relaxed">
                  You are logged in with a temporary password. Please set a new secure password.
                </p>
              </div>

              {/* Form Content */}
              <form onSubmit={handlePasswordChange} className="p-8 flex flex-col gap-5">
                {passwordError && (
                  <div className="bg-red-50 text-red-600 text-xs font-bold p-4 rounded-2xl border border-red-100 flex items-center gap-3">
                    <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5 text-red-500 flex-shrink-0" strokeWidth={2.5} />
                    <span>{passwordError}</span>
                  </div>
                )}
                {passwordSuccess && (
                  <div className="bg-emerald-50 text-emerald-600 text-xs font-bold p-4 rounded-2xl border border-emerald-100 flex items-center gap-3">
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-5 h-5 text-emerald-500 flex-shrink-0" strokeWidth={2.5} />
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                {/* Current Password Field */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-700 ml-1 uppercase tracking-wider">
                    Current Temporary Password <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    placeholder="Enter current temp password"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-400 transition-all duration-200 font-semibold bg-slate-50/30 hover:bg-slate-50 focus:bg-white"
                  />
                </div>

                {/* New Password Field */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-700 ml-1 uppercase tracking-wider">
                    New Password <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="Create your new password"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-400 transition-all duration-200 font-semibold bg-slate-50/30 hover:bg-slate-50 focus:bg-white"
                  />

                  {/* Password Strength Section */}
                  {passwordForm.newPassword && (
                    <div className="mt-1.5 flex flex-col gap-2.5 p-4 rounded-2xl bg-slate-50/90 border border-slate-200 select-none">
                      <div className="flex justify-between items-center text-xs text-slate-800">
                        <span className="font-extrabold">Password Strength:</span>
                        <span className="font-extrabold uppercase tracking-wider text-slate-900">{strength.label}</span>
                      </div>
                      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full ${strength.color} ${strength.width} transition-all duration-350 rounded-full`} />
                      </div>
                      <div className="flex flex-col gap-1.5 text-[11px] font-bold mt-1.5">
                        <div className="flex items-center gap-1.5">
                          {passwordForm.newPassword.length >= 6 && passwordForm.newPassword.length <= 12 ? (
                            <span className="text-emerald-600 flex items-center gap-1.5">✓ 6 to 12 characters</span>
                          ) : (
                            <span className="text-red-600 flex items-center gap-1.5">✗ 6 to 12 characters</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {/[0-9]/.test(passwordForm.newPassword) || /[^A-Za-z0-9]/.test(passwordForm.newPassword) ? (
                            <span className="text-emerald-600 flex items-center gap-1.5">✓ Min. 1 number or special character</span>
                          ) : (
                            <span className="text-red-600 flex items-center gap-1.5">✗ Min. 1 number or special character</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {passwordForm.confirmPassword && passwordForm.newPassword === passwordForm.confirmPassword ? (
                            <span className="text-emerald-600 flex items-center gap-1.5">✓ Passwords match</span>
                          ) : (
                            <span className="text-red-600 flex items-center gap-1.5">✗ Passwords match</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-700 ml-1 uppercase tracking-wider">
                    Confirm New Password <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Verify your new password"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-400 transition-all duration-200 font-semibold bg-slate-50/30 hover:bg-slate-50 focus:bg-white"
                  />
                </div>

                {/* Action Button */}
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="w-full mt-2 bg-[#0f2d3a] hover:bg-[#0c242e] active:scale-[0.98] text-white font-extrabold text-sm py-4 rounded-2xl shadow-sm transition-all border-none cursor-pointer flex items-center justify-center gap-2 select-none"
                >
                  {isUpdatingPassword ? (
                    <span className="flex items-center gap-2">
                      <HugeiconsIcon icon={Loading03Icon} className="animate-spin h-5 w-5 text-white" strokeWidth={2} />
                      Updating...
                    </span>
                  ) : (
                    "Set New Password"
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
