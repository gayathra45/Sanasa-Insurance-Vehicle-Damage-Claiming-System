"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminNavbar from "@/app/Components/Admin/Navbar";
import { getApiUrl } from "@/app/config";

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    policyHolders: 0,
    totalClaims: 0,
    activeClaims: 0,
    pendingClaims: 0,
  });
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

  useEffect(() => {
    const adminData = sessionStorage.getItem("logged_in_admin");
    if (!adminData) {
      router.replace("/Login");
      return;
    }
    try {
      const parsed = JSON.parse(adminData);
      setAdminEmail(parsed?.email || parsed?.emailAddress || "");
      fetchStats();

      if (parsed?.mustChangePassword) {
        setShowPasswordModal(true);
      }
    } catch (e) {
      console.error("Error loading admin session", e);
      router.replace("/Login");
    }
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}/admin/dashboard-stats`);
      if (!res.ok) throw new Error("Failed to fetch dashboard stats.");
      const data = await res.json();
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load dashboard metrics.");
    } finally {
      setLoading(false);
    }
  };

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
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}/admin/admins/change-password`, {
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
          <header className="bg-white border-b border-slate-100 text-slate-800 px-8 py-4 flex justify-between items-center select-none shadow-sm shrink-0 h-[80px] sticky top-0 z-30">
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
                <span className="bg-[#102A43] text-white text-base px-3.5 py-1.5 rounded-xl font-black shadow-sm tracking-wide">Admin Panel</span>
              </h1>
            </div>
            <div className="flex items-center gap-5">
              {/* Notification Bell Icon */}
              <button className="relative p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer focus:outline-none">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-slate-500 hover:text-slate-800">
                  <path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0 1 13.5 0v.75c0 1.65.342 3.228.96 4.658A1.875 1.875 0 0 1 18 17.25H6a1.875 1.875 0 0 1-1.71-2.842 9.06 9.06 0 0 0 .96-4.658V9ZM12 18.75a2.25 2.25 0 0 1-2.247-2.118.75.75 0 0 1 .746-.757h3a.75.75 0 0 1 .746.757A2.25 2.25 0 0 1 12 18.75Z" clipRule="evenodd" />
                </svg>
              </button>
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
                {/* 4 Cards Grid - Desktop view */}
                <div className="hidden lg:grid grid-cols-4 gap-6 mb-12">
                  {/* Policy Holders Card */}
                  <div className="bg-white rounded-[20px] border border-slate-700/80 p-6 flex flex-col items-center justify-center text-center h-[120px] shadow-sm select-none">
                    <span className="text-3xl font-black text-slate-800 tracking-tight">{stats?.policyHolders ?? 0}</span>
                    <span className="text-slate-500 font-bold text-sm mt-1">Policy Holders</span>
                  </div>

                  {/* Total Claims Card */}
                  <div className="bg-white rounded-[20px] border border-slate-700/80 p-6 flex flex-col items-center justify-center text-center h-[120px] shadow-sm select-none">
                    <span className="text-3xl font-black text-slate-800 tracking-tight">{stats?.totalClaims ?? 0}</span>
                    <span className="text-slate-500 font-bold text-sm mt-1">Total Claims</span>
                  </div>

                  {/* Active Claims Card */}
                  <div className="bg-white rounded-[20px] border border-slate-700/80 p-6 flex flex-col items-center justify-center text-center h-[120px] shadow-sm select-none">
                    <span className="text-3xl font-black text-slate-800 tracking-tight">{stats?.activeClaims ?? 0}</span>
                    <span className="text-slate-500 font-bold text-sm mt-1">Active Claims</span>
                  </div>

                  {/* Pending Claims Card */}
                  <div className="bg-white rounded-[20px] border border-slate-700/80 p-6 flex flex-col items-center justify-center text-center h-[120px] shadow-sm select-none">
                    <span className="text-3xl font-black text-slate-800 tracking-tight">{stats?.pendingClaims ?? 0}</span>
                    <span className="text-slate-500 font-bold text-sm mt-1">Pending Claims</span>
                  </div>
                </div>

                {/* 4 Cards Grid - Mobile view */}
                <div className="grid lg:hidden grid-cols-1 gap-4 mb-8">
                  {/* Policy Holders Card */}
                  <div className="bg-gradient-to-br from-blue-50/50 to-white rounded-[20px] border border-blue-100/70 p-4 flex items-center justify-between shadow-xs select-none hover:scale-[1.01] transition-all h-[80px]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100/60 rounded-xl text-blue-900 shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0zM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                        </svg>
                      </div>
                      <span className="text-slate-600 font-bold text-xs">Policy Holders</span>
                    </div>
                    <span className="text-xl font-black text-blue-900 tracking-tight pr-1 shrink-0">
                      {stats?.policyHolders ?? 0}
                    </span>
                  </div>

                  {/* Total Claims Card */}
                  <div className="bg-gradient-to-br from-slate-50/60 to-white rounded-[20px] border border-slate-200/80 p-4 flex items-center justify-between shadow-xs select-none hover:scale-[1.01] transition-all h-[80px]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded-xl text-slate-800 shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08" />
                        </svg>
                      </div>
                      <span className="text-slate-600 font-bold text-xs">Total Claims</span>
                    </div>
                    <span className="text-xl font-black text-slate-800 tracking-tight pr-1 shrink-0">
                      {stats?.totalClaims ?? 0}
                    </span>
                  </div>

                  {/* Active Claims Card */}
                  <div className="bg-gradient-to-br from-emerald-50/50 to-white rounded-[20px] border border-emerald-100/70 p-4 flex items-center justify-between shadow-xs select-none hover:scale-[1.01] transition-all h-[80px]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100/60 rounded-xl text-emerald-800 shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                      </div>
                      <span className="text-slate-600 font-bold text-xs">Active Claims</span>
                    </div>
                    <span className="text-xl font-black text-emerald-800 tracking-tight pr-1 shrink-0">
                      {stats?.activeClaims ?? 0}
                    </span>
                  </div>

                  {/* Pending Claims Card */}
                  <div className="bg-gradient-to-br from-amber-50/50 to-white rounded-[20px] border border-amber-100/70 p-4 flex items-center justify-between shadow-xs select-none hover:scale-[1.01] transition-all h-[80px]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100/60 rounded-xl text-amber-800 shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                      </div>
                      <span className="text-slate-600 font-bold text-xs">Pending Claims</span>
                    </div>
                    <span className="text-xl font-black text-amber-800 tracking-tight pr-1 shrink-0">
                      {stats?.pendingClaims ?? 0}
                    </span>
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
              <div className="px-8 pt-8 pb-5 select-none relative shrink-0 border-b border-slate-100/60 bg-slate-50/55">
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
                    <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>{passwordError}</span>
                  </div>
                )}
                {passwordSuccess && (
                  <div className="bg-emerald-50 text-emerald-600 text-xs font-bold p-4 rounded-2xl border border-emerald-100 flex items-center gap-3">
                    <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
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
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
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
                  className="w-full mt-2 bg-[#0f2d3a] hover:bg-[#0c242e] active:scale-[0.98] text-white font-extrabold text-sm py-3.5 rounded-2xl shadow-sm transition-all border-none cursor-pointer flex items-center justify-center gap-2 select-none"
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
