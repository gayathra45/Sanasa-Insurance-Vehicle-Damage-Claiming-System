"use client";

import React, { useState, useEffect } from "react";
import AdminNavbar from "@/app/Components/Admin/Navbar";
import { getApiUrl } from "@/app/config";

export default function AdminAdminsPage() {
  // Current logged in admin state
  const [currentAdmin, setCurrentAdmin] = useState<any>(null);

  // Active Admins list state
  const [activeAdmins, setActiveAdmins] = useState<any[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

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

  // Badge counts
  const [pendingCount, setPendingCount] = useState(0);
  const [requestsCount, setRequestsCount] = useState(0);

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

  const fetchActiveAdmins = async () => {
    setLoadingAdmins(true);
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}/admin/admins/all`);
      const data = await res.json();
      if (res.ok) {
        setActiveAdmins(data.admins || []);
      }
    } catch (err) {
      console.error("Error fetching active admins:", err);
    } finally {
      setLoadingAdmins(false);
    }
  };

  const fetchPendingCounts = async (admin: any) => {
    try {
      const baseUrl = getApiUrl();
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
      const baseUrl = getApiUrl();
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
      
      // Refresh count/list
      if (currentAdmin) fetchPendingCounts(currentAdmin);

      setTimeout(() => {
        setShowRegisterModal(false);
        setFormSuccess("");
      }, 2000);
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
      const baseUrl = getApiUrl();
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
      setPendingAdmins(prev => prev.filter(a => a._id !== targetAdminId));
      setPendingCount(prev => Math.max(0, prev - 1));
      fetchActiveAdmins();
    } catch (err: any) {
      alert(err.message || "An error occurred.");
    } finally {
      setActioningAdminId(null);
    }
  };

  const handleRejectRegistration = async (targetAdminId: string) => {
    if (!currentAdmin) return;
    setActioningAdminId(targetAdminId);
    try {
      const baseUrl = getApiUrl();
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
      setPendingAdmins(prev => prev.filter(a => a._id !== targetAdminId));
      setPendingCount(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      alert(err.message || "An error occurred.");
    } finally {
      setActioningAdminId(null);
    }
  };

  const handleApprovePasswordRequest = async (adminId: string) => {
    setActioningRequestId(adminId);
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}/admin/admins/password-requests/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve request.");

      setPasswordRequests(prev => prev.filter(r => r._id !== adminId));
      setRequestsCount(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      alert(err.message || "An error occurred.");
    } finally {
      setActioningRequestId(null);
    }
  };

  const handleRejectPasswordRequest = async (adminId: string) => {
    setActioningRequestId(adminId);
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}/admin/admins/password-requests/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reject request.");

      setPasswordRequests(prev => prev.filter(r => r._id !== adminId));
      setRequestsCount(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      alert(err.message || "An error occurred.");
    } finally {
      setActioningRequestId(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
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
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="hidden lg:flex text-xl font-semibold text-slate-800 items-center gap-2 pl-2 lg:pl-0 truncate">
                <span className="bg-[#102A43] text-white text-base px-4 py-2 rounded-xl font-black shadow-sm tracking-wide">Admin Portal</span>
                <span className="hidden lg:inline"> — Administrators Management</span>
              </h1>
            </div>
            <div className="text-sm font-semibold bg-slate-100 px-4 py-2 rounded-full text-slate-600 border border-slate-200">
              System Admin
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-8 bg-slate-50 flex flex-col items-center gap-8 overflow-y-auto">
            {/* Center Console Card */}
            <div className="bg-white rounded-3xl p-10 border border-slate-100 shadow-xl max-w-md w-full text-center flex flex-col items-center gap-6 relative overflow-hidden">
              <div className="absolute top-[-10%] right-[-10%] w-32 h-32 rounded-full bg-blue-500/5 blur-[50px] pointer-events-none" />
              <div className="absolute bottom-[-10%] left-[-10%] w-32 h-32 rounded-full bg-[#102A43]/5 blur-[50px] pointer-events-none" />

              <div className="w-20 h-20 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[#102A43] shadow-inner select-none animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-10 h-10">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">System Administrators</h2>
                <p className="text-slate-500 font-semibold text-sm mt-2 leading-relaxed">
                  Register new system administrators, approve registration requests, and dispatch secure password resets.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="w-full flex flex-col gap-3 select-none">
                <button
                  onClick={() => {
                    setFormData({ name: "", email: "", mobile: "", nic: "" });
                    setFormError("");
                    setFormSuccess("");
                    setShowRegisterModal(true);
                  }}
                  className="w-full py-4 bg-[#0f2d3a] hover:bg-[#0b222c] active:scale-95 text-white rounded-2xl text-base font-bold shadow-lg shadow-slate-900/20 transition-all border-none outline-none cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  <span>Add New Administrator</span>
                </button>

                <button
                  onClick={() => {
                    if (currentAdmin) fetchPendingCounts(currentAdmin);
                    setShowPendingModal(true);
                  }}
                  className="w-full py-4 bg-white hover:bg-slate-50 border border-slate-200 active:scale-95 text-slate-700 rounded-2xl text-base font-bold shadow-sm transition-all outline-none cursor-pointer flex items-center justify-center gap-2 relative"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                  <span>Pending Registrations</span>
                  {pendingCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] w-6 h-6 rounded-full font-bold flex items-center justify-center shadow-md animate-bounce border-2 border-white">
                      {pendingCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    if (currentAdmin) fetchPendingCounts(currentAdmin);
                    setShowRequestsModal(true);
                  }}
                  className="w-full py-4 bg-white hover:bg-slate-50 border border-slate-200 active:scale-95 text-slate-700 rounded-2xl text-base font-bold shadow-sm transition-all outline-none cursor-pointer flex items-center justify-center gap-2 relative"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                  <span>Password Reset Requests</span>
                  {requestsCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] w-6 h-6 rounded-full font-bold flex items-center justify-center shadow-md animate-bounce border-2 border-white">
                      {requestsCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Active Admins list */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-lg max-w-4xl w-full overflow-hidden">
              <div className="p-6 border-b border-slate-100 select-none bg-slate-50/75 flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">Active Administrators</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Authorized system admins directory</p>
                </div>
                <button
                  onClick={fetchActiveAdmins}
                  className="p-2 hover:bg-slate-200 rounded-full text-slate-500 hover:text-slate-700 transition-all cursor-pointer focus:outline-none"
                  title="Reload Active Admins"
                >
                  <svg className={`w-4 h-4 ${loadingAdmins ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </button>
              </div>

              {loadingAdmins ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <svg className="animate-spin h-6 w-6 text-[#0f2d3a]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Loading admins directory...</span>
                </div>
              ) : activeAdmins.length === 0 ? (
                <div className="text-center py-12 text-slate-400 select-none">
                  No active admins found in the system.
                </div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/50 text-slate-400 font-bold select-none border-b border-slate-100 uppercase tracking-wider text-[10px]">
                        <th className="py-4 px-6">Name</th>
                        <th className="py-4 px-6">Email Address</th>
                        <th className="py-4 px-6">Mobile</th>
                        <th className="py-4 px-6">NIC</th>
                        <th className="py-4 px-6">Joined Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {activeAdmins.map((admin) => (
                        <tr key={admin._id} className="hover:bg-slate-50/75 transition-colors">
                          <td className="py-4 px-6 font-extrabold text-slate-800">{admin.name}</td>
                          <td className="py-4 px-6 text-slate-600 select-all">{admin.email}</td>
                          <td className="py-4 px-6 text-slate-600">{admin.mobile}</td>
                          <td className="py-4 px-6 text-slate-600 uppercase">{admin.nic}</td>
                          <td className="py-4 px-6 text-slate-400 select-none">
                            {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* MODAL 1: Register New Admin */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white border border-slate-200 rounded-[32px] w-full max-w-lg shadow-2xl flex flex-col relative transition-all duration-300 overflow-hidden max-h-[90vh]">
            <div className="px-8 pt-7 pb-2 select-none bg-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-[24px] font-black text-slate-900 tracking-tight leading-none">Register Admin Request</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">Define new admin profile for approval</p>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-slate-400 hover:text-slate-600 bg-transparent border-none outline-none cursor-pointer transition-colors p-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="border-b border-black mx-8 mb-4 shrink-0" />

            <form onSubmit={handleRegisterSubmit} className="px-8 pb-8 flex-1 overflow-y-auto flex flex-col gap-5 text-left">
              {formError && (
                <div className="bg-red-50 text-red-600 text-xs font-bold px-4 py-3 rounded-xl border border-red-100 flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="bg-emerald-50 text-emerald-600 text-xs font-bold px-4 py-3 rounded-xl border border-emerald-100 flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{formSuccess}</span>
                </div>
              )}

              <div className="flex flex-col gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest border-b pb-2 mb-1 select-none block">Admin Profile Details</span>

                {/* Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter Full Name"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f2d4a] transition-all font-semibold bg-white"
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
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f2d4a] transition-all font-semibold bg-white"
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
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f2d4a] transition-all font-semibold bg-white"
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
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f2d4a] transition-all font-semibold bg-white"
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
                  className="px-6 py-2 bg-[#0f2d3a] hover:bg-[#0b222c] active:scale-95 text-white rounded-full text-xs font-bold shadow-[0_4px_12px_rgba(15,45,58,0.25)] transition-all cursor-pointer border-none outline-none disabled:opacity-60 flex items-center gap-2"
                >
                  {submittingAdmin ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
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
                <h2 className="text-[24px] font-black text-slate-900 tracking-tight leading-none">Pending Admin Requests</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">Approve new admins to join the system</p>
              </div>
              <button
                onClick={() => setShowPendingModal(false)}
                className="text-slate-400 hover:text-slate-600 bg-transparent border-none outline-none cursor-pointer transition-colors p-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="border-b border-black mx-8 mb-4 shrink-0" />

            <div className="px-8 pb-4 flex-1 overflow-y-auto bg-white flex flex-col gap-4 text-left">
              {loadingPending ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                  <svg className="animate-spin h-8 w-8 text-[#0f2d3a]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-xs text-slate-400 font-extrabold uppercase tracking-wider animate-pulse">Loading pending registrations...</p>
                </div>
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
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-extrabold text-slate-800 text-sm leading-tight truncate max-w-[195px]">{req.name}</h3>
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mt-1">Registered by another admin</span>
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200 text-[9px] font-black tracking-wider uppercase">Pending Approval</span>
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
                          className="px-5 py-2 bg-[#0f2d3a] hover:bg-[#0c242e] text-white text-xs font-extrabold rounded-full transition-all cursor-pointer border-none outline-none flex items-center gap-1.5"
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
                className="bg-[#0f2d3a] hover:bg-[#0c242e] text-white font-bold text-sm px-6 py-2 rounded-full transition-all border-none cursor-pointer"
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
                <h2 className="text-[24px] font-black text-slate-900 tracking-tight leading-none">Admin Password Requests</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">Review, approve and dispatch reset codes to admins</p>
              </div>
              <button
                onClick={() => setShowRequestsModal(false)}
                className="text-slate-400 hover:text-slate-600 bg-transparent border-none outline-none cursor-pointer transition-colors p-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="border-b border-black mx-8 mb-4 shrink-0" />

            <div className="px-8 pb-4 flex-1 overflow-y-auto bg-white flex flex-col gap-4 text-left">
              {loadingRequests ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                  <svg className="animate-spin h-8 w-8 text-[#0f2d3a]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-xs text-slate-400 font-extrabold uppercase tracking-wider animate-pulse">Loading password requests...</p>
                </div>
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
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-extrabold text-slate-800 text-sm leading-tight truncate max-w-[195px]">{req.name}</h3>
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mt-1">System Administrator</span>
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200 text-[9px] font-black tracking-wider uppercase select-none animate-pulse">Pending Reset</span>
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
                          className="px-5 py-2 bg-[#0f2d3a] hover:bg-[#0c242e] text-white text-xs font-extrabold rounded-full transition-all cursor-pointer border-none outline-none flex items-center gap-1.5"
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
                className="bg-[#0f2d3a] hover:bg-[#0c242e] text-white font-bold text-sm px-6 py-2 rounded-full transition-all border-none cursor-pointer"
              >
                Close Requests
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
