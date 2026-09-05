"use client";

import React, { useState, useEffect } from "react";
import { API_URL } from "@/app/config";
import AdminNavbar from "@/app/Components/Admin/Navbar";
import Link from "next/link";
import UserAvatarDropdown from "@/app/Components/UserAvatarDropdown";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Menu01Icon,
  Notification01Icon,
  Alert02Icon,
  UserMultiple02Icon,
  File01Icon,
  CheckmarkCircle01Icon,
  Time02Icon,
  SecurityCheckIcon,
  Building01Icon,
  SquareLock02Icon,
  Loading03Icon,
  BubbleChatIcon,
} from "@hugeicons/core-free-icons";

interface Branch {
  name: string;
  percentage: number;
  count: number;
  color?: string;
}

interface MonthlyClaim {
  month: string;
  submitted: number;
  approved: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    policyHolders: 0,
    totalClaims: 0,
    activeClaims: 0,
    pendingClaims: 0,
    totalAgents: 0,
    totalBranches: 0,
  });
  const [branches, setBranches] = useState<Branch[]>([]);
  const [monthlyClaims, setMonthlyClaims] = useState<MonthlyClaim[]>([]);
  const [pendingBranchResets, setPendingBranchResets] = useState<any[]>([]);
  const [pendingAdminResets, setPendingAdminResets] = useState<any[]>([]);
  const [loggedAdmin, setLoggedAdmin] = useState<any | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Forced password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const branchColorMap: Record<string, string> = {
    Galle: "bg-red-500",
    Matara: "bg-green-500",
    Anuradhapura: "bg-blue-500",
    Embilipitiya: "bg-orange-400",
  };

  useEffect(() => {
    const adminData = sessionStorage.getItem("logged_in_admin");
    if (!adminData) {
      window.location.href = "/Login";
      return;
    }
    try {
      const parsed = JSON.parse(adminData);
      setLoggedAdmin(parsed);
      if (parsed.email) {
        setAdminEmail(parsed.email);
      }
      if (parsed.mustChangePassword) {
        setShowPasswordModal(true);
      }
    } catch (e) {
      console.error(e);
      window.location.href = "/Login";
      return;
    }

    async function fetchStats() {
      try {
        const res = await fetch(`${API_URL}/admin/dashboard-stats`);
        if (!res.ok) {
          throw new Error("Failed to fetch dashboard statistics.");
        }
        const data = await res.json();
        
        setStats(data.stats);
        
        // Map color configuration to branches
        const mappedBranches = data.branches.map((b: any) => ({
          ...b,
          color: branchColorMap[b.name] || "bg-slate-400",
        }));
        setBranches(mappedBranches);
        setMonthlyClaims(data.monthlyClaims);
        setPendingBranchResets(data.pendingBranchResets || []);
        setPendingAdminResets(data.pendingAdminResets || []);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load dashboard metrics");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
    const intervalId = setInterval(fetchStats, 8000);
    return () => clearInterval(intervalId);
  }, [loggedAdmin?._id]);

  const handleBranchReset = async (staffId: string, action: "approve" | "reject") => {
    setActioningId(staffId);
    try {
      const res = await fetch(`${API_URL}/admin/staff/password-requests/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${action} request.`);
      
      setPendingBranchResets(prev => prev.filter(r => r._id !== staffId));
      alert(`Branch password request ${action}d successfully!`);
    } catch (err: any) {
      alert(err.message || `Failed to ${action} request.`);
    } finally {
      setActioningId(null);
    }
  };

  const handleAdminReset = async (adminId: string, action: "approve" | "reject") => {
    setActioningId(adminId);
    try {
      const res = await fetch(`${API_URL}/admin/admins/password-requests/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${action} request.`);
      
      setPendingAdminResets(prev => prev.filter(a => a._id !== adminId));
      alert(`Admin password reset ${action}d successfully!`);
    } catch (err: any) {
      alert(err.message || `Failed to ${action} request.`);
    } finally {
      setActioningId(null);
    }
  };

  // Calculate dynamic max height for bar chart to accommodate any data volume
  const maxVal = monthlyClaims.length > 0 
    ? Math.max(...monthlyClaims.map((d) => Math.max(d.submitted, d.approved))) 
    : 0;
  
  // Set chart upper limit (defaults to 30, scales dynamically in multiples of 30)
  const maxLimit = maxVal > 30 ? Math.ceil(maxVal / 30) * 30 : 30;
  const step = maxLimit / 3;

  const getStrength = () => {
    const newPassword = passwordForm.newPassword;
    if (!newPassword) return { label: "", color: "bg-transparent", width: "w-0" };
    let score = 0;
    if (newPassword.length >= 6 && newPassword.length <= 12) score++;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword) || /[^A-Za-z0-9]/.test(newPassword)) score++;
    switch (score) {
      case 1: return { label: "Weak", color: "bg-red-500", width: "w-1/4" };
      case 2: return { label: "Fair", color: "bg-orange-500", width: "w-2/4" };
      case 3: return { label: "Good", color: "bg-yellow-500", width: "w-3/4" };
      case 4: return { label: "Strong", color: "bg-green-500", width: "w-full" };
      default: return { label: "", color: "bg-transparent", width: "w-0" };
    }
  };
  const strength = getStrength();

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

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
      const res = await fetch("http://localhost:5000/api/admin/admins/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: adminEmail,
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
      const adminData = sessionStorage.getItem("logged_in_admin");
      if (adminData) {
        const parsed = JSON.parse(adminData);
        parsed.mustChangePassword = false;
        sessionStorage.setItem("logged_in_admin", JSON.stringify(parsed));
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

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans">
      {/* Sidebar + Main Content Row */}
      <div className="flex flex-1 flex-row min-h-0">
        {/* Left Sidebar */}
        <AdminNavbar />

        {/* Right Main Container */}
        <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
          {/* Top Welcome Bar */}
          <header className="bg-white border-b border-slate-100 text-slate-800 px-8 py-4 flex justify-between items-center select-none shadow-sm flex-shrink-0 h-[80px] sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("open-admin-mobile-menu"))}
                className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 active:scale-95 transition-all cursor-pointer focus:outline-none"
              >
                <HugeiconsIcon icon={Menu01Icon} className="w-6 h-6" strokeWidth={2.5} />
              </button>
              {/* Mobile page title */}
              <h1 className="lg:hidden text-lg font-bold text-slate-800 tracking-tight">
                Dashboard
              </h1>
              {/* Desktop welcome title */}
              <h1 className="hidden lg:flex text-xl font-semibold text-slate-800 items-center gap-2 pl-2 lg:pl-0 truncate">
                <span className="hidden lg:inline">Welcome back, </span>
                <span className="bg-[#102A43] text-white text-base px-4 py-2 rounded-xl font-black shadow-sm tracking-wide">Admin Panel</span>
              </h1>
            </div>
            <div className="flex items-center gap-5">
              {/* Notification Bell Icon */}
              <Link href="/Admin/Notifications" className="relative p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer focus:outline-none flex items-center justify-center">
                <HugeiconsIcon icon={Notification01Icon} className="w-6 h-6 text-slate-500 hover:text-slate-800" strokeWidth={2} />
              </Link>
              {/* User Avatar Icon */}
              <UserAvatarDropdown userType="admin" />
            </div>
          </header>

          {/* Page Content Dashboard */}
          <main className="flex-1 p-4 lg:p-8 bg-white overflow-y-auto">
            {loading ? (
              <div className="w-full h-full flex flex-col items-center justify-center min-h-[300px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#f59e0b]"></div>
                <span className="mt-4 text-slate-500 font-bold">Loading dashboard metrics...</span>
              </div>
            ) : error ? (
              <div className="w-full h-full flex flex-col items-center justify-center min-h-[300px] text-red-500 font-bold bg-red-50 rounded-2xl p-8 border border-red-200">
                <HugeiconsIcon icon={Alert02Icon} className="w-10 h-10 mb-2" strokeWidth={2} />
                <span>{error}</span>
              </div>
            ) : (
              <>
                {/* 6 Cards Grid - Fully Responsive */}
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-6 mb-12 select-none">
                  {/* Policy Holders Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between h-[125px] shadow-sm hover:shadow-md transition-all duration-200 group">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Policy Holders</span>
                      <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-110 transition-transform">
                        <HugeiconsIcon icon={UserMultiple02Icon} className="w-4 h-4" strokeWidth={2.5} />
                      </div>
                    </div>
                    <span className="text-3xl font-black text-slate-800 tracking-tight">{stats.policyHolders}</span>
                  </div>

                  {/* Total Claims Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between h-[125px] shadow-sm hover:shadow-md transition-all duration-200 group">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Total Claims</span>
                      <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg group-hover:scale-110 transition-transform">
                        <HugeiconsIcon icon={File01Icon} className="w-4 h-4" strokeWidth={2.5} />
                      </div>
                    </div>
                    <span className="text-3xl font-black text-slate-800 tracking-tight">{stats.totalClaims}</span>
                  </div>

                  {/* Active Claims Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between h-[125px] shadow-sm hover:shadow-md transition-all duration-200 group">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Active Claims</span>
                      <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:scale-110 transition-transform">
                        <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4" strokeWidth={2.5} />
                      </div>
                    </div>
                    <span className="text-3xl font-black text-emerald-800 tracking-tight">{stats.activeClaims}</span>
                  </div>

                  {/* Pending Claims Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between h-[125px] shadow-sm hover:shadow-md transition-all duration-200 group">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Pending Claims</span>
                      <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg group-hover:scale-110 transition-transform">
                        <HugeiconsIcon icon={Time02Icon} className="w-4 h-4" strokeWidth={2.5} />
                      </div>
                    </div>
                    <span className="text-3xl font-black text-amber-600 tracking-tight">{stats.pendingClaims}</span>
                  </div>

                  {/* Registered Agents Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between h-[125px] shadow-sm hover:shadow-md transition-all duration-200 group">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Total Agents</span>
                      <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg group-hover:scale-110 transition-transform">
                        <HugeiconsIcon icon={SecurityCheckIcon} className="w-4 h-4" strokeWidth={2.5} />
                      </div>
                    </div>
                    <span className="text-3xl font-black text-purple-800 tracking-tight">{stats.totalAgents}</span>
                  </div>

                  {/* Registered Branches Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between h-[125px] shadow-sm hover:shadow-md transition-all duration-200 group">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Branches</span>
                      <div className="p-1.5 bg-cyan-50 text-cyan-600 rounded-lg group-hover:scale-110 transition-transform">
                        <HugeiconsIcon icon={Building01Icon} className="w-4 h-4" strokeWidth={2.5} />
                      </div>
                    </div>
                    <span className="text-3xl font-black text-cyan-800 tracking-tight">{stats.totalBranches}</span>
                  </div>
                </div>

                {/* Branch Performance & Monthly Claims split section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                  
                  {/* Branch Performances List (Left: 5 cols) */}
                  <div className="lg:col-span-5 flex flex-col select-none">
                    <h2 className="text-lg font-black text-slate-800 mb-8 tracking-wide">
                      Branch Performances
                    </h2>
                    
                    <div className="flex flex-col gap-6">
                      {branches.map((branch) => (
                        <div key={branch.name} className="flex flex-col">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-slate-700 text-sm">
                              {branch.name}
                            </span>
                            <span className="text-xs text-slate-400 font-bold">
                              {branch.count} {branch.count === 1 ? "claim" : "claims"}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${branch.color} rounded-full transition-all duration-500`}
                              style={{ width: `${branch.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Monthly Claims Chart (Right: 7 cols) */}
                  <div className="lg:col-span-7 flex flex-col select-none bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                    <div className="flex justify-between items-center mb-8">
                      <div>
                        <h2 className="text-base font-extrabold text-slate-800">
                          Insurance Claims Overview
                        </h2>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                          Visualizing submissions & approvals
                        </p>
                      </div>
                      
                      {/* Metric info */}
                      <span className="text-[10px] bg-slate-50 border border-slate-200/60 text-slate-500 font-extrabold px-3 py-1 rounded-full">
                        Last 30 Days
                      </span>
                    </div>

                    <div className="h-64 flex flex-col justify-between relative mt-4">
                      {/* Grid Lines */}
                      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                        <div className="w-full border-t border-slate-100"></div>
                        <div className="w-full border-t border-slate-100"></div>
                        <div className="w-full border-t border-slate-100"></div>
                        <div className="w-full border-b border-slate-200"></div>
                      </div>

                      {/* Y-Axis Labels */}
                      <div className="absolute left-[-40px] inset-y-0 flex flex-col justify-between text-[10px] text-slate-400 font-bold pointer-events-none select-none text-right w-8">
                        <span>{maxLimit}</span>
                        <span>{Math.round(step * 2)}</span>
                        <span>{Math.round(step)}</span>
                        <span>0</span>
                      </div>

                      {/* Chart Bars */}
                      <div className="flex-1 flex justify-around items-end z-10 px-2">
                        {monthlyClaims.map((data) => {
                          const subHeight = maxLimit > 0 ? (data.submitted / maxLimit) * 100 : 0;
                          const appHeight = maxLimit > 0 ? (data.approved / maxLimit) * 100 : 0;
                          
                          return (
                            <div key={data.month} className="flex flex-col items-center h-full justify-end w-12 group">
                              <div className="flex items-end gap-1.5 h-full w-full justify-center">
                                {/* Submitted bar */}
                                <div
                                  className="w-4 bg-blue-500 rounded-t-[3px] transition-all duration-500 hover:opacity-85 cursor-pointer relative"
                                  style={{ height: `${subHeight}%` }}
                                  title={`Submitted: ${data.submitted}`}
                                ></div>
                                {/* Approved bar */}
                                <div
                                  className="w-4 bg-emerald-500 rounded-t-[3px] transition-all duration-500 hover:opacity-85 cursor-pointer"
                                  style={{ height: `${appHeight}%` }}
                                  title={`Approved: ${data.approved}`}
                                ></div>
                              </div>
                              <span className="text-[10px] font-extrabold text-slate-400 mt-2 select-none">
                                {data.month}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                </div>

                {/* System Request Center Section */}
                <div className="mt-12 flex flex-col select-none">
                  <div className="mb-6">
                    <h2 className="text-base font-extrabold text-slate-800">
                      System Administration Request Center
                    </h2>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                      Verify and authorize credentials and password resets
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Panel 1: Branch Password Resets */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col gap-4 shadow-sm min-h-[300px]">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Branch Password Resets</span>
                        <span className="text-[10px] bg-red-50 text-red-600 font-extrabold px-2 py-0.5 rounded-full border border-red-100/50">
                          {pendingBranchResets.length} Pending
                        </span>
                      </div>

                      <div className="flex-1 flex flex-col gap-3 overflow-y-auto max-h-[400px] pr-1">
                        {pendingBranchResets.length === 0 ? (
                          <div className="flex flex-col items-center justify-center flex-1 py-12 text-slate-400">
                            <span className="text-xs font-bold">All clear!</span>
                            <span className="text-[10px] mt-0.5">No pending branch resets</span>
                          </div>
                        ) : (
                          pendingBranchResets.map((staff) => (
                            <div key={staff._id} className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 flex flex-col gap-3">
                              <div className="flex flex-col">
                                <span className="text-xs font-extrabold text-slate-850">{staff.branch} Branch</span>
                                <span className="text-[10px] text-slate-500 font-semibold mt-0.5">{staff.email}</span>
                                <span className="text-[10px] text-slate-500 font-semibold">{staff.mobile}</span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleBranchReset(staff._id, "approve")}
                                  disabled={actioningId !== null}
                                  className="flex-1 py-1.5 bg-[#102A43] hover:bg-[#0c2033] active:scale-95 text-white text-[10px] font-black rounded-lg transition-all cursor-pointer border-none outline-none disabled:opacity-50"
                                >
                                  {actioningId === staff._id ? "Processing..." : "Approve"}
                                </button>
                                <button
                                  onClick={() => handleBranchReset(staff._id, "reject")}
                                  disabled={actioningId !== null}
                                  className="flex-1 py-1.5 bg-white hover:bg-slate-50 text-slate-550 border border-slate-200 text-[10px] font-bold rounded-lg transition-all cursor-pointer outline-none disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Panel 2: Admin Password Resets */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col gap-4 shadow-sm min-h-[300px]">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Admin Password Resets</span>
                        <span className="text-[10px] bg-purple-50 text-purple-600 font-extrabold px-2 py-0.5 rounded-full border border-purple-100/50">
                          {pendingAdminResets.length} Pending
                        </span>
                      </div>

                      <div className="flex-1 flex flex-col gap-3 overflow-y-auto max-h-[400px] pr-1">
                        {pendingAdminResets.length === 0 ? (
                          <div className="flex flex-col items-center justify-center flex-1 py-12 text-slate-400">
                            <span className="text-xs font-bold">All clear!</span>
                            <span className="text-[10px] mt-0.5">No pending admin resets</span>
                          </div>
                        ) : (
                          pendingAdminResets.map((admin) => (
                            <div key={admin._id} className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 flex flex-col gap-3">
                              <div className="flex flex-col">
                                <span className="text-xs font-extrabold text-slate-850">{admin.name}</span>
                                <span className="text-[10px] text-slate-500 font-semibold mt-0.5">Email: {admin.email}</span>
                                <span className="text-[10px] text-slate-500 font-semibold">NIC: {admin.nic}</span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleAdminReset(admin._id, "approve")}
                                  disabled={actioningId !== null}
                                  className="flex-1 py-1.5 bg-[#102A43] hover:bg-[#0c2033] active:scale-95 text-white text-[10px] font-black rounded-lg transition-all cursor-pointer border-none outline-none disabled:opacity-50"
                                >
                                  {actioningId === admin._id ? "Processing..." : "Approve"}
                                </button>
                                <button
                                  onClick={() => handleAdminReset(admin._id, "reject")}
                                  disabled={actioningId !== null}
                                  className="flex-1 py-1.5 bg-white hover:bg-slate-50 text-slate-550 border border-slate-200 text-[10px] font-bold rounded-lg transition-all cursor-pointer outline-none disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </div>

      {/* Forced Password Update Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white border border-slate-100 rounded-[32px] shadow-[0_20px_50px_rgba(15,23,42,0.08)] flex flex-col my-auto overflow-hidden max-h-[95vh] transition-all duration-300">
            <div className="overflow-y-auto flex-1 flex flex-col">
              {/* Header */}
              <div className="px-8 pt-8 pb-5 select-none relative flex-shrink-0 border-b border-slate-100/60 bg-slate-50/55">
                <h2 className="font-extrabold text-xl text-slate-800 tracking-tight flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                    <HugeiconsIcon icon={SquareLock02Icon} className="w-5 h-5" strokeWidth={2.5} />
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
                  className="w-full mt-2 bg-[#000080] hover:bg-[#000066] active:scale-[0.98] text-white font-extrabold text-sm py-4 rounded-2xl shadow-sm transition-all border-none cursor-pointer flex items-center justify-center gap-2 select-none"
                >
                  {isUpdatingPassword ? (
                    <span className="flex items-center gap-2">
                      <HugeiconsIcon icon={Loading03Icon} className="animate-spin h-5 w-5 text-white" strokeWidth={2.5} />
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

      {/* Floating Action Chat Button */}
      <button className="fixed bottom-24 right-8 w-14 h-14 bg-[#00ddff] hover:bg-[#00cceb] text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer z-50 group">
        <HugeiconsIcon icon={BubbleChatIcon} className="w-7 h-7" strokeWidth={2.2} />
      </button>

    </div>
  );
}
