"use client";

import React, { useState, useEffect } from "react";
import { API_URL } from "@/app/config";
import AdminNavbar from "@/app/Components/Admin/Navbar";
import Link from "next/link";

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
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
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
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-slate-500 hover:text-slate-800">
                  <path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0 1 13.5 0v.75c0 1.65.342 3.228.96 4.658A1.875 1.875 0 0 1 18 17.25H6a1.875 1.875 0 0 1-1.71-2.842 9.06 9.06 0 0 0 .96-4.658V9ZM12 18.75a2.25 2.25 0 0 1-2.247-2.118.75.75 0 0 1 .746-.757h3a.75.75 0 0 1 .746.757A2.25 2.25 0 0 1 12 18.75Z" clipRule="evenodd" />
                </svg>
              </Link>
              {/* User Avatar Icon */}
              <button className="relative p-1 hover:bg-slate-100 rounded-full transition-colors cursor-pointer focus:outline-none">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-slate-500 hover:text-slate-800">
                  <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0 0 21.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12c0 2.754 1.14 5.244 2.98 7.03-.028-.01-.053-.024-.082-.031a.75.75 0 0 1-.502-.879C5.556 14.931 8.193 12 12 12s6.444 2.931 7.352 6.12a.75.75 0 0 1-.502.88c-.029.007-.054.02-.082.031ZM12 11.25a3.375 3.375 0 1 0 0-6.75 3.375 3.375 0 0 0 0 6.75Z" clipRule="evenodd" />
                </svg>
              </button>
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
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-10 h-10 mb-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
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
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                    </div>
                    <span className="text-3xl font-black text-slate-800 tracking-tight">{stats.policyHolders}</span>
                  </div>

                  {/* Total Claims Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between h-[125px] shadow-sm hover:shadow-md transition-all duration-200 group">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Total Claims</span>
                      <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg group-hover:scale-110 transition-transform">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>
                    <span className="text-3xl font-black text-slate-800 tracking-tight">{stats.totalClaims}</span>
                  </div>

                  {/* Active Claims Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between h-[125px] shadow-sm hover:shadow-md transition-all duration-200 group">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Active Claims</span>
                      <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:scale-110 transition-transform">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <span className="text-3xl font-black text-emerald-800 tracking-tight">{stats.activeClaims}</span>
                  </div>

                  {/* Pending Claims Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between h-[125px] shadow-sm hover:shadow-md transition-all duration-200 group">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Pending Claims</span>
                      <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg group-hover:scale-110 transition-transform">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <span className="text-3xl font-black text-amber-600 tracking-tight">{stats.pendingClaims}</span>
                  </div>

                  {/* Registered Agents Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between h-[125px] shadow-sm hover:shadow-md transition-all duration-200 group">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Total Agents</span>
                      <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg group-hover:scale-110 transition-transform">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                    </div>
                    <span className="text-3xl font-black text-purple-800 tracking-tight">{stats.totalAgents}</span>
                  </div>

                  {/* Registered Branches Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between h-[125px] shadow-sm hover:shadow-md transition-all duration-200 group">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Branches</span>
                      <div className="p-1.5 bg-cyan-50 text-cyan-600 rounded-lg group-hover:scale-110 transition-transform">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
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
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
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
                    <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>{passwordError}</span>
                  </div>
                )}
                {passwordSuccess && (
                  <div className="bg-emerald-50 text-emerald-600 text-xs font-bold p-4 rounded-2xl border border-emerald-100 flex items-center gap-3">
                    <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
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
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
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
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
          <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75 0 1.776.476 3.44 1.307 4.887L2.14 21.64a.75.75 0 0 0 .935.935l4.753-1.428A9.702 9.702 0 0 0 12 21.75c5.385 0 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-3 9.75a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Zm3.75 0a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Zm3.75 0a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Z" clipRule="evenodd" />
        </svg>
      </button>

    </div>
  );
}
