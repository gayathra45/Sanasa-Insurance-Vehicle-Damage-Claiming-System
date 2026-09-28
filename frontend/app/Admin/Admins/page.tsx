"use client";

import React, { useState, useEffect, useMemo } from "react";
import AdminNavbar from "@/app/Components/Admin/Navbar";
import { API_URL } from "@/app/config";
import UserAvatarDropdown from "@/app/Components/UserAvatarDropdown";
import SimpleLoader from "@/app/Components/SimpleLoader";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Menu01Icon,
  SecurityCheckIcon,
  Add01Icon,
  UserMultiple02Icon,
  SquareLock02Icon,
  RefreshIcon,
  Loading03Icon,
  Cancel01Icon,
  AlertCircleIcon,
  CheckmarkCircle01Icon,
  Alert02Icon,
  UserIcon,
  Key01Icon,
  Search01Icon,
  ViewIcon,
  Clock01Icon,
  Mail01Icon,
  Call02Icon
} from "@hugeicons/core-free-icons";

export default function AdminAdminsPage() {
  // Current logged in admin state
  const [currentAdmin, setCurrentAdmin] = useState<any>(null);

  // Active Admins list state
  const [activeAdmins, setActiveAdmins] = useState<any[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"All" | "Active" | "Self">("All");

  // Register Admin Form / Modal states
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    nic: ""
  });
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [submittingAdmin, setSubmittingAdmin] = useState(false);

  // Pending Admin registrations modal states
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingAdmins, setPendingAdmins] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [actioningAdminId, setActioningAdminId] = useState<string | null>(null);

  // Password reset requests modal states
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [passwordRequests, setPasswordRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [actioningRequestId, setActioningRequestId] = useState<string | null>(null);

  // View Admin Modal state
  const [viewingAdmin, setViewingAdmin] = useState<any | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // Badge counts
  const [pendingCount, setPendingCount] = useState(0);
  const [requestsCount, setRequestsCount] = useState(0);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Fetch logged in admin on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("logged_in_admin");
      if (saved) {
        try {
          const adminObj = JSON.parse(saved);
          setCurrentAdmin(adminObj);
          fetchActiveAdmins();
          fetchPendingCounts(adminObj);
        } catch (e) {
          console.error("Error parsing logged_in_admin", e);
        }
      }
    }
  }, []);

  const fetchActiveAdmins = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoadingAdmins(true);
    try {
      const baseUrl = API_URL;
      const res = await fetch(`${baseUrl}/admin/admins/all`);
      const data = await res.json();
      if (res.ok) {
        setActiveAdmins(data.admins || []);
        if (isRefresh) showToast("Administrators directory refreshed.", "success");
      } else {
        throw new Error(data.error || "Failed to load admins.");
      }
    } catch (err: any) {
      console.error("Error fetching active admins:", err);
      showToast(err.message || "Failed to fetch active admins", "error");
    } finally {
      setLoadingAdmins(false);
      setRefreshing(false);
    }
  };

  const fetchPendingCounts = async (admin: any) => {
    try {
      const baseUrl = API_URL;
      // 1. Fetch pending registrations (excluding self)
      const resPending = await fetch(`${baseUrl}/admin/admins/pending?adminId=${admin._id}`);
      const dataPending = await resPending.json();
      if (resPending.ok && dataPending.requests) {
        setPendingCount(dataPending.requests.length);
        setPendingAdmins(dataPending.requests);
      }

      // 2. Fetch pending password requests (excluding self)
      const resRequests = await fetch(`${baseUrl}/admin/admins/password-requests?email=${encodeURIComponent(admin.email)}`);
      const dataRequests = await resRequests.json();
      if (resRequests.ok && dataRequests.requests) {
        setRequestsCount(dataRequests.requests.length);
        setPasswordRequests(dataRequests.requests);
      }
    } catch (err) {
      console.error("Error fetching pending counts:", err);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!formData.name.trim()) return setFormError("Full Name is required.");
    if (!formData.email.trim()) return setFormError("Email Address is required.");
    if (!formData.mobile.trim()) return setFormError("Mobile Number is required.");
    if (!formData.nic.trim()) return setFormError("NIC Number is required.");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      return setFormError("Please enter a valid email address.");
    }

    const cleanMobile = formData.mobile.replace(/[-+()\s]/g, "");
    if (!/^\d{10}$/.test(cleanMobile)) {
      return setFormError("Mobile number must be exactly 10 digits.");
    }

    const cleanNic = formData.nic.trim();
    const nicRegex = /^[0-9vVxX]{10,12}$/;
    if (!nicRegex.test(cleanNic)) {
      return setFormError("Invalid NIC format. Must be 10-12 characters/digits.");
    }

    if (!currentAdmin) return setFormError("Current administrator session is not found.");

    setSubmittingAdmin(true);
    try {
      const baseUrl = API_URL;
      const res = await fetch(`${baseUrl}/admin/register-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          registeredBy: currentAdmin._id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit registration.");

      setFormSuccess(data.message || "Registration request submitted successfully!");
      setFormData({ name: "", email: "", mobile: "", nic: "" });
      showToast("Admin registration request created.", "success");
      
      // Refresh count/list
      if (currentAdmin) fetchPendingCounts(currentAdmin);

      setTimeout(() => {
        setShowRegisterModal(false);
        setFormSuccess("");
      }, 1500);
    } catch (err: any) {
      setFormError(err.message || "An error occurred.");
    } finally {
      setSubmittingAdmin(false);
    }
  };

  const handleApproveRegistration = async (targetAdminId: string) => {
    if (!currentAdmin) return;
    setActioningAdminId(targetAdminId);
    try {
      const baseUrl = API_URL;
      const res = await fetch(`${baseUrl}/admin/admins/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetAdminId,
          approvingAdminId: currentAdmin._id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve administrator.");

      // Refresh states
      setPendingAdmins((prev) => prev.filter((a) => a._id !== targetAdminId));
      setPendingCount((prev) => Math.max(0, prev - 1));
      fetchActiveAdmins();
      showToast("Administrator approved successfully.", "success");
    } catch (err: any) {
      showToast(err.message || "An error occurred.", "error");
    } finally {
      setActioningAdminId(null);
    }
  };

  const handleRejectRegistration = async (targetAdminId: string) => {
    if (!currentAdmin) return;
    setActioningAdminId(targetAdminId);
    try {
      const baseUrl = API_URL;
      const res = await fetch(`${baseUrl}/admin/admins/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetAdminId,
          approvingAdminId: currentAdmin._id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reject request.");

      // Refresh states
      setPendingAdmins((prev) => prev.filter((a) => a._id !== targetAdminId));
      setPendingCount((prev) => Math.max(0, prev - 1));
      showToast("Registration request rejected.", "info");
    } catch (err: any) {
      showToast(err.message || "An error occurred.", "error");
    } finally {
      setActioningAdminId(null);
    }
  };

  const handleApprovePasswordRequest = async (adminId: string) => {
    setActioningRequestId(adminId);
    try {
      const baseUrl = API_URL;
      const res = await fetch(`${baseUrl}/admin/admins/password-requests/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve request.");

      setPasswordRequests((prev) => prev.filter((r) => r._id !== adminId));
      setRequestsCount((prev) => Math.max(0, prev - 1));
      showToast("Password reset OTP approved and dispatched.", "success");
    } catch (err: any) {
      showToast(err.message || "An error occurred.", "error");
    } finally {
      setActioningRequestId(null);
    }
  };

  const handleRejectPasswordRequest = async (adminId: string) => {
    setActioningRequestId(adminId);
    try {
      const baseUrl = API_URL;
      const res = await fetch(`${baseUrl}/admin/admins/password-requests/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reject request.");

      setPasswordRequests((prev) => prev.filter((r) => r._id !== adminId));
      setRequestsCount((prev) => Math.max(0, prev - 1));
      showToast("Password reset request rejected.", "info");
    } catch (err: any) {
      showToast(err.message || "An error occurred.", "error");
    } finally {
      setActioningRequestId(null);
    }
  };

  // Filtered Admins computation
  const filteredAdmins = useMemo(() => {
    return activeAdmins.filter((admin) => {
      // Tab filter
      if (activeTab === "Self" && currentAdmin) {
        if (admin._id !== currentAdmin._id && admin.email !== currentAdmin.email) return false;
      }

      // Search query filter
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        admin.name?.toLowerCase().includes(q) ||
        admin.email?.toLowerCase().includes(q) ||
        admin.mobile?.includes(q) ||
        admin.nic?.toLowerCase().includes(q)
      );
    });
  }, [activeAdmins, activeTab, currentAdmin, searchQuery]);

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
                Admins
              </h1>
              {/* Desktop welcome title */}
              <h1 className="hidden lg:flex text-xl font-semibold text-slate-800 items-center gap-2 pl-2 lg:pl-0 truncate">
                <span className="bg-[#102A43] text-white text-base px-4 py-2 rounded-xl font-semibold shadow-sm tracking-wide">
                  Admin Portal
                </span>
                <span className="hidden lg:inline"> — System Administrators Management</span>
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
            {/* Top Summaries (Clean 4 Cards matching Staff and Policyholder pages) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 select-none">
              {/* Total Admins */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-500">Total Administrators</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {activeAdmins.length + pendingCount}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Head office system admins</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                  <HugeiconsIcon icon={SecurityCheckIcon} className="w-5 h-5" />
                </div>
              </div>

              {/* Active Admins */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-emerald-700">Active Admins</div>
                  <div className="text-2xl font-bold text-emerald-600 mt-1">
                    {activeAdmins.length}
                  </div>
                  <div className="text-[11px] text-emerald-600/80 mt-0.5">Verified & active logins</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-5 h-5" />
                </div>
              </div>

              {/* Pending Approvals */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-amber-700">Pending Approvals</div>
                  <div className="text-2xl font-bold text-amber-600 mt-1">
                    {pendingCount}
                  </div>
                  <div className="text-[11px] text-amber-600/80 mt-0.5">Awaiting dual verification</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <HugeiconsIcon icon={Clock01Icon} className="w-5 h-5" />
                </div>
              </div>

              {/* Password Reset Requests */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-blue-700">Password Requests</div>
                  <div className="text-2xl font-bold text-blue-600 mt-1">
                    {requestsCount}
                  </div>
                  <div className="text-[11px] text-blue-500 mt-0.5">Admin reset requests</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <HugeiconsIcon icon={SquareLock02Icon} className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Top Toolbar Action Area */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm select-none">
              {/* Search Bar */}
              <div className="relative w-full md:w-[350px]">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <HugeiconsIcon icon={Search01Icon} className="w-4 h-4 text-slate-400" strokeWidth={2.5} />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search admin by name, email, NIC, mobile..."
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

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
                <button
                  onClick={() => {
                    setFormData({ name: "", email: "", mobile: "", nic: "" });
                    setFormError("");
                    setFormSuccess("");
                    setShowRegisterModal(true);
                  }}
                  className="flex-1 md:flex-none py-2.5 px-5 bg-[#000080] hover:bg-[#000066] hover:scale-105 active:scale-95 text-white rounded-xl text-xs font-bold shadow-sm transition-all border-none outline-none cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <HugeiconsIcon icon={Add01Icon} className="w-4 h-4" strokeWidth={2.5} />
                  <span>Add New Administrator</span>
                </button>

                <button
                  onClick={() => {
                    if (currentAdmin) fetchPendingCounts(currentAdmin);
                    setShowPendingModal(true);
                  }}
                  className="flex-1 md:flex-none py-2.5 px-5 bg-white hover:bg-slate-50 border border-slate-200 hover:scale-105 active:scale-95 text-slate-700 rounded-xl text-xs font-bold shadow-sm transition-all outline-none cursor-pointer flex items-center justify-center gap-1.5 relative"
                >
                  <HugeiconsIcon icon={UserMultiple02Icon} className="w-4 h-4" strokeWidth={2} />
                  <span>Pending Registrations</span>
                  {pendingCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] w-5 h-5 rounded-full font-bold flex items-center justify-center shadow-md animate-bounce border-2 border-white">
                      {pendingCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    if (currentAdmin) fetchPendingCounts(currentAdmin);
                    setShowRequestsModal(true);
                  }}
                  className="flex-1 md:flex-none py-2.5 px-5 bg-white hover:bg-blue-50/50 border border-blue-200 hover:scale-105 active:scale-95 text-[#000080] rounded-xl text-xs font-bold shadow-sm transition-all outline-none cursor-pointer flex items-center justify-center gap-1.5 relative"
                >
                  <HugeiconsIcon icon={SquareLock02Icon} className="w-4 h-4 text-[#000080]" strokeWidth={2.5} />
                  <span>Password Reset Requests</span>
                  {requestsCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-[9px] w-5 h-5 rounded-full font-bold flex items-center justify-center shadow-md animate-bounce border-2 border-white">
                      {requestsCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    fetchActiveAdmins(true);
                    if (currentAdmin) fetchPendingCounts(currentAdmin);
                  }}
                  disabled={refreshing || loadingAdmins}
                  title="Refresh Administrators"
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <HugeiconsIcon icon={RefreshIcon} className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Filter Tabs & Quick Views */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col gap-4 select-none">
              {/* Segmented Control Tabs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/60 w-full">
                {[
                  { id: "All", label: "All Administrators", count: activeAdmins.length },
                  { id: "Active", label: "Active Accounts", count: activeAdmins.length },
                  { id: "Self", label: "My Profile", count: 1 }
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-none outline-none ${
                        isActive
                          ? "bg-[#000080] text-white shadow-md shadow-blue-900/20"
                          : "bg-white/70 hover:bg-white text-slate-600 hover:text-slate-900 shadow-2xs hover:shadow-xs"
                      }`}
                    >
                      <span className="truncate">{tab.label}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-slate-100 text-slate-700 border border-slate-200/60"
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active Filter Tags */}
              {(searchQuery || activeTab !== "All") && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs pt-3 border-t border-slate-100 text-slate-500">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-slate-400 text-[11px] uppercase tracking-wider">Active Filters:</span>
                    {activeTab !== "All" && (
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-[#000080] border border-blue-200 px-2.5 py-1 rounded-lg font-bold text-[11px]">
                        Filter: {activeTab === "Self" ? "My Profile" : activeTab}
                        <button
                          onClick={() => setActiveTab("All")}
                          className="hover:text-rose-600 cursor-pointer ml-0.5"
                          title="Clear filter"
                        >
                          <HugeiconsIcon icon={Cancel01Icon} className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {searchQuery && (
                      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg font-bold text-[11px]">
                        Search: &quot;{searchQuery}&quot;
                        <button
                          onClick={() => setSearchQuery("")}
                          className="hover:text-rose-600 cursor-pointer ml-0.5"
                          title="Clear search query"
                        >
                          <HugeiconsIcon icon={Cancel01Icon} className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <span className="text-[11px] text-slate-400 font-semibold">
                      Showing <strong className="text-slate-700">{filteredAdmins.length}</strong> of {activeAdmins.length}
                    </span>
                    <button
                      onClick={() => {
                        setActiveTab("All");
                        setSearchQuery("");
                      }}
                      className="text-rose-600 hover:text-rose-700 font-bold cursor-pointer transition-colors bg-rose-50 hover:bg-rose-100 px-3 py-1 rounded-lg border border-rose-200/80 text-xs flex items-center gap-1"
                    >
                      <HugeiconsIcon icon={RefreshIcon} className="w-3 h-3" />
                      <span>Reset Filters</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Administrators Table Card Grid Section */}
            {loadingAdmins ? (
              <SimpleLoader message="Loading administrators directory..." theme="slate" />
            ) : filteredAdmins.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-[20px] p-16 text-center text-slate-400 font-bold select-none shadow-sm">
                No system administrators found matching your query.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {/* Table Header (Desktop) */}
                <div className="hidden md:grid md:grid-cols-[minmax(0,1.8fr)_minmax(0,1.8fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,1.0fr)_minmax(0,1.2fr)] gap-4 px-5 py-3 text-slate-500 font-medium text-[10px] uppercase tracking-wider select-none bg-slate-50 rounded-xl border border-slate-200/60 mb-1 items-center">
                  <div>Administrator & Profile</div>
                  <div>Email Address</div>
                  <div>Mobile & NIC</div>
                  <div>Joined Date</div>
                  <div>Account Status</div>
                  <div className="text-right">Actions</div>
                </div>

                {/* Table Rows (Card rows with blue left accent border matching Staff & Policyholder pages) */}
                {filteredAdmins.map((admin) => {
                  const isCurrent = currentAdmin && (admin._id === currentAdmin._id || admin.email === currentAdmin.email);
                  return (
                    <div
                      key={admin._id}
                      className="bg-white border-l-[6px] border-l-blue-500 bg-gradient-to-r from-blue-50/10 via-transparent to-transparent border border-slate-200 rounded-xl px-5 py-4 flex flex-col md:grid md:grid-cols-[minmax(0,1.8fr)_minmax(0,1.8fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,1.0fr)_minmax(0,1.2fr)] md:items-center gap-4 transition-all duration-200 shadow-sm hover:shadow-md relative overflow-hidden group"
                    >
                      {/* Col 1: Administrator & Profile */}
                      <div className="flex items-center gap-3 min-w-0 select-none">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-[#102A43] flex items-center justify-center font-bold text-sm shrink-0 shadow-inner">
                          {admin.name?.charAt(0) || "A"}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-semibold text-sm text-slate-800 whitespace-nowrap truncate">
                              {admin.name}
                            </h3>
                            {isCurrent && (
                              <span className="bg-blue-100 text-[#000080] text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                            System Administrator
                          </span>
                        </div>
                      </div>

                      {/* Col 2: Email Address */}
                      <div className="flex flex-col min-w-0 select-none">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1 md:hidden">Email Address</span>
                        <span className="text-slate-700 font-semibold text-xs truncate select-all">{admin.email}</span>
                        <span className="text-[10px] text-slate-400 font-medium">Head Office</span>
                      </div>

                      {/* Col 3: Mobile & NIC */}
                      <div className="flex flex-col min-w-0 select-none">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1 md:hidden">Mobile & NIC</span>
                        <span className="text-slate-700 font-semibold text-xs font-mono">{admin.mobile || "—"}</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5 truncate font-mono">{admin.nic || "—"}</span>
                      </div>

                      {/* Col 4: Joined Date */}
                      <div className="flex flex-col min-w-0 select-none">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1 md:hidden">Joined Date</span>
                        <span className="text-slate-700 text-xs font-semibold truncate">
                          {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "N/A"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Authorized</span>
                      </div>

                      {/* Col 5: Account Status */}
                      <div className="flex flex-col min-w-0 select-none">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1 md:hidden">Status</span>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 w-fit text-center">
                          Active
                        </span>
                      </div>

                      {/* Col 6: Actions */}
                      <div className="flex items-center justify-between md:justify-end gap-2 pt-3 md:pt-0 border-t md:border-0 border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setViewingAdmin(admin);
                              setShowViewModal(true);
                            }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 border border-slate-200/80 shadow-2xs"
                            title="View Administrator Details"
                          >
                            <HugeiconsIcon icon={ViewIcon} className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* MODAL 1: Register New Admin */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white border border-slate-200 rounded-[32px] w-full max-w-lg shadow-2xl flex flex-col relative transition-all duration-300 overflow-hidden max-h-[90vh]">
            <div className="px-8 pt-7 pb-2 select-none bg-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-[24px] font-semibold text-slate-900 tracking-tight leading-none">Register Administrator Request</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">Define new admin profile for dual approval</p>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-slate-400 hover:text-slate-600 bg-transparent border-none outline-none cursor-pointer transition-colors p-1"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-6 h-6" strokeWidth={2.5} />
              </button>
            </div>

            <div className="border-b border-black mx-8 mb-4 shrink-0" />

            <form onSubmit={handleRegisterSubmit} className="px-8 pb-8 flex-1 overflow-y-auto flex flex-col gap-5 text-left">
              {formError && (
                <div className="bg-red-50 text-red-600 text-xs font-bold px-4 py-3 rounded-xl border border-red-100 flex items-center gap-2">
                  <HugeiconsIcon icon={AlertCircleIcon} className="w-5 h-5 text-red-500 shrink-0" strokeWidth={2} />
                  <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="bg-emerald-50 text-emerald-600 text-xs font-bold px-4 py-3 rounded-xl border border-emerald-100 flex items-center gap-2">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-5 h-5 text-emerald-500 shrink-0" strokeWidth={2} />
                  <span>{formSuccess}</span>
                </div>
              )}

              <div className="flex flex-col gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest border-b pb-2 mb-1 select-none block">Admin Profile Details</span>

                {/* Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter Full Name"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#000080]/15 focus:border-[#000080] transition-all font-semibold bg-white"
                  />
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="example@sanasainsurance.lk"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#000080]/15 focus:border-[#000080] transition-all font-semibold bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Mobile */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Mobile Number</label>
                    <input
                      type="text"
                      required
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      placeholder="e.g. 0771234567"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#000080]/15 focus:border-[#000080] transition-all font-semibold bg-white"
                    />
                  </div>

                  {/* NIC */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">NIC Number</label>
                    <input
                      type="text"
                      required
                      value={formData.nic}
                      onChange={(e) => setFormData({ ...formData, nic: e.target.value })}
                      placeholder="e.g. 199912345678"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#000080]/15 focus:border-[#000080] transition-all font-semibold bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4 select-none shrink-0">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-6 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-full text-xs font-bold transition-all cursor-pointer bg-white active:scale-95 shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdmin}
                  className="px-6 py-2 bg-[#000080] hover:bg-[#000066] active:scale-95 text-white rounded-full text-xs font-bold shadow-[0_4px_12px_rgba(0,0,128,0.25)] transition-all cursor-pointer border-none outline-none disabled:opacity-60 flex items-center gap-2"
                >
                  {submittingAdmin ? (
                    <>
                      <HugeiconsIcon icon={Loading03Icon} className="animate-spin h-4 w-4 text-white" strokeWidth={2.5} />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Request</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Pending Registrations Review */}
      {showPendingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white border border-slate-200 rounded-[32px] w-full max-w-4xl shadow-2xl flex flex-col relative transition-all duration-300 overflow-hidden max-h-[90vh]">
            <div className="px-8 pt-7 pb-2 select-none bg-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-[24px] font-semibold text-slate-900 tracking-tight leading-none">Pending Admin Requests</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">Approve new administrators to join the system</p>
              </div>
              <button
                onClick={() => setShowPendingModal(false)}
                className="text-slate-400 hover:text-slate-600 bg-transparent border-none outline-none cursor-pointer transition-colors p-1"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-6 h-6" strokeWidth={2.5} />
              </button>
            </div>

            <div className="border-b border-black mx-8 mb-4 shrink-0" />

            <div className="px-8 pb-4 flex-1 overflow-y-auto bg-white flex flex-col gap-4 text-left">
              {loadingPending ? (
                <SimpleLoader message="Loading pending registrations..." theme="slate" />
              ) : pendingAdmins.length === 0 ? (
                <div className="text-center py-20 flex flex-col items-center justify-center text-slate-400 select-none bg-slate-50 border border-slate-100 rounded-3xl">
                  <p className="font-bold text-sm text-slate-500">No Pending Admin Registrations</p>
                  <p className="text-xs text-slate-400 mt-1">There are no new administrator requests awaiting your review.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {pendingAdmins.map((req) => (
                    <div key={req._id} className="border border-slate-200 rounded-2xl p-5 bg-slate-50 flex flex-col gap-4 hover:shadow-sm transition-all">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-[#102A43] flex items-center justify-center shrink-0 shadow-inner">
                            <HugeiconsIcon icon={UserIcon} className="w-5 h-5" strokeWidth={2.5} />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800 text-sm leading-tight truncate max-w-[195px]">{req.name}</h3>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-1">Registered by another admin</span>
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200 text-[9px] font-semibold tracking-wider uppercase">Pending Approval</span>
                      </div>

                      <div className="grid grid-cols-2 gap-y-3.5 gap-x-6 text-xs border-t border-b border-slate-200/60 py-4 font-semibold text-slate-700">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Email Address</span>
                          <span className="text-slate-800 truncate" title={req.email}>{req.email}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Mobile No</span>
                          <span className="text-slate-800">{req.mobile}</span>
                        </div>
                        <div className="flex flex-col gap-0.5 col-span-2">
                          <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">NIC Number</span>
                          <span className="text-slate-800 uppercase">{req.nic}</span>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 mt-1 select-none">
                        <button
                          onClick={() => handleRejectRegistration(req._id)}
                          disabled={actioningAdminId !== null}
                          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 hover:text-red-600 text-slate-500 text-xs font-bold rounded-full transition-all cursor-pointer outline-none"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApproveRegistration(req._id)}
                          disabled={actioningAdminId !== null}
                          className="px-5 py-2 bg-[#000080] hover:bg-[#000066] text-white text-xs font-bold rounded-full transition-all cursor-pointer border-none outline-none flex items-center gap-1.5"
                        >
                          {actioningAdminId === req._id ? "Approving..." : "Approve & Send Credentials"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-8 py-5 bg-white border-t border-slate-100 flex justify-end shrink-0 select-none">
              <button
                onClick={() => setShowPendingModal(false)}
                className="bg-[#000080] hover:bg-[#000066] text-white font-bold text-sm px-6 py-2 rounded-full transition-all border-none cursor-pointer"
              >
                Close Requests
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Password Reset Requests */}
      {showRequestsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white border border-slate-200 rounded-[32px] w-full max-w-4xl shadow-2xl flex flex-col relative transition-all duration-300 overflow-hidden max-h-[90vh]">
            <div className="px-8 pt-7 pb-2 select-none bg-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-[24px] font-semibold text-slate-900 tracking-tight leading-none">Admin Password Requests</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">Review, approve and dispatch reset OTP to admins</p>
              </div>
              <button
                onClick={() => setShowRequestsModal(false)}
                className="text-slate-400 hover:text-slate-600 bg-transparent border-none outline-none cursor-pointer transition-colors p-1"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-6 h-6" strokeWidth={2.5} />
              </button>
            </div>

            <div className="border-b border-black mx-8 mb-4 shrink-0" />

            <div className="px-8 pb-4 flex-1 overflow-y-auto bg-white flex flex-col gap-4 text-left">
              {loadingRequests ? (
                <SimpleLoader message="Loading password requests..." theme="slate" />
              ) : passwordRequests.length === 0 ? (
                <div className="text-center py-20 flex flex-col items-center justify-center text-slate-400 select-none bg-slate-50 border border-slate-100 rounded-3xl">
                  <p className="font-bold text-sm text-slate-500">No Pending Reset Requests</p>
                  <p className="text-xs text-slate-400 mt-1">All administrator credentials are active and verified.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {passwordRequests.map((req) => (
                    <div key={req._id} className="border border-slate-200 rounded-2xl p-5 bg-slate-50 flex flex-col gap-4 hover:shadow-sm transition-all">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center shrink-0 shadow-inner">
                            <HugeiconsIcon icon={Key01Icon} className="w-5 h-5" strokeWidth={2.5} />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800 text-sm leading-tight truncate max-w-[195px]">{req.name}</h3>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-1">System Administrator</span>
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200 text-[9px] font-semibold tracking-wider uppercase select-none animate-pulse">Pending Reset</span>
                      </div>

                      <div className="grid grid-cols-2 gap-y-3.5 gap-x-6 text-xs border-t border-b border-slate-200/60 py-4 font-semibold text-slate-700">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Email Address</span>
                          <span className="text-slate-800 truncate" title={req.email}>{req.email}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Mobile No</span>
                          <span className="text-slate-800">{req.mobile}</span>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 mt-1 select-none">
                        <button
                          onClick={() => handleRejectPasswordRequest(req._id)}
                          disabled={actioningRequestId !== null}
                          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 hover:text-red-600 text-slate-500 text-xs font-bold rounded-full transition-all cursor-pointer outline-none"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApprovePasswordRequest(req._id)}
                          disabled={actioningRequestId !== null}
                          className="px-5 py-2 bg-[#000080] hover:bg-[#000066] text-white text-xs font-bold rounded-full transition-all cursor-pointer border-none outline-none flex items-center gap-1.5"
                        >
                          {actioningRequestId === req._id ? "Approving..." : "Approve & Send Reset OTP"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-8 py-5 bg-white border-t border-slate-100 flex justify-end shrink-0 select-none">
              <button
                onClick={() => setShowRequestsModal(false)}
                className="bg-[#000080] hover:bg-[#000066] text-white font-bold text-sm px-6 py-2 rounded-full transition-all border-none cursor-pointer"
              >
                Close Requests
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: View Admin Details */}
      {showViewModal && viewingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white border border-slate-200 rounded-[32px] w-full max-w-lg shadow-2xl flex flex-col relative transition-all duration-300 overflow-hidden max-h-[90vh]">
            <div className="px-8 pt-7 pb-2 select-none bg-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-[24px] font-semibold text-slate-900 tracking-tight leading-none">Admin Profile Details</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">Authorized system administrator credentials</p>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-slate-400 hover:text-slate-600 bg-transparent border-none outline-none cursor-pointer transition-colors p-1"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-6 h-6" strokeWidth={2.5} />
              </button>
            </div>

            <div className="border-b border-black mx-8 mb-4 shrink-0" />

            <div className="px-8 pb-6 flex-1 overflow-y-auto flex flex-col gap-5 text-left">
              <div className="flex items-center gap-4 bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                <div className="w-14 h-14 rounded-2xl bg-[#000080] text-white flex items-center justify-center font-bold text-xl shadow-md">
                  {viewingAdmin.name?.charAt(0) || "A"}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{viewingAdmin.name}</h3>
                  <span className="text-xs text-slate-500 font-semibold">System Administrator</span>
                  <span className="block text-[10px] text-emerald-600 font-bold uppercase tracking-wider mt-0.5">Authorized Status</span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-200/60">
                  <span className="font-bold text-slate-400 uppercase text-[10px] flex items-center gap-1.5">
                    <HugeiconsIcon icon={Mail01Icon} className="w-3.5 h-3.5" />
                    Email Address
                  </span>
                  <span className="font-semibold text-slate-800 select-all">{viewingAdmin.email}</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-200/60">
                  <span className="font-bold text-slate-400 uppercase text-[10px] flex items-center gap-1.5">
                    <HugeiconsIcon icon={Call02Icon} className="w-3.5 h-3.5" />
                    Mobile Number
                  </span>
                  <span className="font-semibold text-slate-800 font-mono">{viewingAdmin.mobile || "—"}</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-200/60">
                  <span className="font-bold text-slate-400 uppercase text-[10px]">NIC Number</span>
                  <span className="font-semibold text-slate-800 uppercase font-mono">{viewingAdmin.nic || "—"}</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-200/60">
                  <span className="font-bold text-slate-400 uppercase text-[10px] flex items-center gap-1.5">
                    <HugeiconsIcon icon={Clock01Icon} className="w-3.5 h-3.5" />
                    Joined Date
                  </span>
                  <span className="font-semibold text-slate-800">
                    {viewingAdmin.createdAt ? new Date(viewingAdmin.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "N/A"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5">
                  <span className="font-bold text-slate-400 uppercase text-[10px]">Access Level</span>
                  <span className="font-bold text-[#000080] bg-blue-100 px-2.5 py-0.5 rounded-md text-[11px]">
                    Super Administrator
                  </span>
                </div>
              </div>
            </div>

            <div className="px-8 py-5 bg-white border-t border-slate-100 flex justify-end shrink-0 select-none">
              <button
                onClick={() => setShowViewModal(false)}
                className="bg-[#000080] hover:bg-[#000066] text-white font-bold text-xs px-6 py-2 rounded-full transition-all border-none cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
