"use client";

import React, { useState, useEffect } from "react";
import AdminNavbar from "@/app/Components/Admin/Navbar";
import { API_URL } from "@/app/config";
import { sriLankaLocations } from "../../utils/locations";

export default function AdminStaffPage() {
  // Modal / Form states
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    branch: "",
    province: "",
    district: "",
    area: "",
    location: "",
    staffCount: 1
  });
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [submittingStaff, setSubmittingStaff] = useState(false);

  // Staff details list states
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Edit Staff states
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    branch: "",
    province: "",
    district: "",
    area: "",
    location: "",
    staffCount: 1
  });

  // View Staff states
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingStaff, setViewingStaff] = useState<any | null>(null);

  // Password reset request states
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [passwordRequests, setPasswordRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [actioningRequestId, setActioningRequestId] = useState<string | null>(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Fetch pending requests count on load
  const fetchCount = async () => {
    try {
      const baseUrl = API_URL;
      const res = await fetch(`${baseUrl}/admin/staff/password-requests`);
      const data = await res.json();
      if (res.ok && data.requests) {
        setPendingRequestsCount(data.requests.length);
      }
    } catch (err) {
      console.error("Error fetching password requests count:", err);
    }
  };

  const fetchStaff = async () => {
    setLoadingStaff(true);
    try {
      const baseUrl = API_URL;
      const res = await fetch(`${baseUrl}/admin/staff`);
      const data = await res.json();
      if (res.ok) {
        setStaffList(data.staff || []);
      }
    } catch (err) {
      console.error("Error fetching staff list:", err);
    } finally {
      setLoadingStaff(false);
    }
  };

  useEffect(() => {
    fetchCount();
    fetchPasswordRequests();
    fetchStaff();
  }, []);

  const fetchPasswordRequests = async () => {
    setLoadingRequests(true);
    try {
      const baseUrl = API_URL;
      const res = await fetch(`${baseUrl}/admin/staff/password-requests`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch password requests.");
      setPasswordRequests(data.requests || []);
      setPendingRequestsCount(data.requests ? data.requests.length : 0);
    } catch (err: any) {
      console.error("Error fetching password requests:", err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleApproveRequest = async (staffId: string) => {
    setActioningRequestId(staffId);
    try {
      const baseUrl = API_URL;
      const res = await fetch(`${baseUrl}/admin/staff/password-requests/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve request.");
      
      setPasswordRequests(prev => prev.filter(r => r._id !== staffId));
      setPendingRequestsCount(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      alert(err.message || "Failed to approve request.");
    } finally {
      setActioningRequestId(null);
    }
  };

  const handleRejectRequest = async (staffId: string) => {
    setActioningRequestId(staffId);
    try {
      const baseUrl = API_URL;
      const res = await fetch(`${baseUrl}/admin/staff/password-requests/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reject request.");
      
      setPasswordRequests(prev => prev.filter(r => r._id !== staffId));
      setPendingRequestsCount(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      alert(err.message || "Failed to reject request.");
    } finally {
      setActioningRequestId(null);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!formData.name.trim()) return setFormError("Full Name / Branch Name is required.");
    if (!formData.email.trim()) return setFormError("Email Address is required.");
    if (!formData.mobile.trim()) return setFormError("Mobile Number is required.");
    const cleanMobile = formData.mobile.replace(/[-+()\s]/g, "");
    if (!/^\d{10}$/.test(cleanMobile)) {
      return setFormError("Mobile number must be exactly 10 digits.");
    }
    if (!formData.province.trim()) return setFormError("Province selection is required.");
    if (!formData.district.trim()) return setFormError("District selection is required.");
    if (!formData.area.trim()) return setFormError("Area selection is required.");
    if (!formData.branch.trim()) return setFormError("Branch Name is required.");
    if (!formData.location.trim()) return setFormError("Office Location is required.");
    if (formData.staffCount === undefined || formData.staffCount < 1) return setFormError("Staff count must be at least 1.");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      return setFormError("Please enter a valid email address.");
    }

    setSubmittingStaff(true);
    try {
      const baseUrl = API_URL;
      const res = await fetch(`${baseUrl}/admin/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to register staff.");
      }

      setFormSuccess("Office staff registered successfully!");
      if (data.staff) {
        setStaffList(prev => [data.staff, ...prev]);
      }
      setFormData({
        name: "",
        email: "",
        mobile: "",
        branch: "",
        province: "",
        district: "",
        area: "",
        location: "",
        staffCount: 1
      });

      setTimeout(() => {
        setShowModal(false);
        setFormSuccess("");
      }, 1500);

    } catch (err: any) {
      console.error("Register staff error:", err);
      setFormError(err.message || "Something went wrong.");
    } finally {
      setSubmittingStaff(false);
    }
  };

  const triggerView = (staff: any) => {
    setViewingStaff(staff);
    setShowViewModal(true);
  };

  const triggerEdit = (staff: any) => {
    setEditingStaff(staff);
    setEditFormData({
      name: staff.name || "",
      email: staff.email || "",
      mobile: staff.mobile || "",
      branch: staff.branch || "",
      province: staff.province || "",
      district: staff.district || "",
      area: staff.area || "",
      location: staff.location || "",
      staffCount: staff.staffCount || 1
    });
    setFormError("");
    setFormSuccess("");
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!editFormData.name.trim()) return setFormError("Full Name / Branch Name is required.");
    if (!editFormData.email.trim()) return setFormError("Email Address is required.");
    if (!editFormData.mobile.trim()) return setFormError("Mobile Number is required.");
    const cleanMobile = editFormData.mobile.replace(/[-+()\s]/g, "");
    if (!/^\d{10}$/.test(cleanMobile)) {
      return setFormError("Mobile number must be exactly 10 digits.");
    }
    if (!editFormData.province.trim()) return setFormError("Province selection is required.");
    if (!editFormData.district.trim()) return setFormError("District selection is required.");
    if (!editFormData.area.trim()) return setFormError("Area selection is required.");
    if (!editFormData.branch.trim()) return setFormError("Branch Name is required.");
    if (!editFormData.location.trim()) return setFormError("Office Location is required.");
    if (editFormData.staffCount === undefined || editFormData.staffCount < 1) return setFormError("Staff count must be at least 1.");

    setSubmittingStaff(true);
    try {
      const baseUrl = API_URL;
      const res = await fetch(`${baseUrl}/admin/staff/${editingStaff._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update staff.");
      }

      setFormSuccess("Office staff details updated successfully!");
      setStaffList(prev => prev.map(s => s._id === editingStaff._id ? data.staff : s));
      setTimeout(() => {
        setShowEditModal(false);
        setEditingStaff(null);
        setFormSuccess("");
      }, 1500);
    } catch (err: any) {
      setFormError(err.message || "Failed to update staff.");
    } finally {
      setSubmittingStaff(false);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm("Are you sure you want to remove this office staff member?")) return;

    try {
      const baseUrl = API_URL;
      const res = await fetch(`${baseUrl}/admin/staff/${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete office staff.");
      }
      setStaffList(prev => prev.filter(s => s._id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to delete office staff.");
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
              {/* Mobile page title */}
              <h1 className="lg:hidden text-lg font-bold text-slate-800 tracking-tight">
                Staff
              </h1>
              {/* Desktop welcome title */}
              <h1 className="hidden lg:flex text-xl font-semibold text-slate-800 items-center gap-2 pl-2 lg:pl-0 truncate">
                <span className="bg-[#102A43] text-white text-base px-4 py-2 rounded-xl font-black shadow-sm tracking-wide">Admin Portal</span>
                <span className="hidden lg:inline"> — Office Staff Management</span>
              </h1>
            </div>
            <div className="text-sm font-semibold bg-slate-100 px-4 py-2 rounded-full text-slate-600 border border-slate-200">
              System Admin
            </div>
          </header>

          <main className="flex-1 p-6 lg:p-8 bg-slate-50 flex flex-col gap-6">
            
            {/* Top Toolbar Action Area */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm select-none">
              <div className="relative w-full md:w-[350px]">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4 text-slate-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search branch staff by name, email, district..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-transparent transition-all shadow-sm bg-slate-50/50"
                />
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  onClick={() => {
                    setFormData({
                      name: "",
                      email: "",
                      mobile: "",
                      branch: "",
                      province: "",
                      district: "",
                      area: "",
                      location: "",
                      staffCount: 1
                    });
                    setFormError("");
                    setFormSuccess("");
                    setShowModal(true);
                  }}
                  className="flex-1 md:flex-none py-2.5 px-5 bg-[#0f2d3a] hover:bg-[#0b222c] hover:scale-105 active:scale-95 text-white rounded-xl text-xs font-bold shadow-sm transition-all border-none outline-none cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  <span>Add New Staff</span>
                </button>

                <button
                  onClick={() => {
                    fetchPasswordRequests();
                    setShowRequestsModal(true);
                  }}
                  className="flex-1 md:flex-none py-2.5 px-5 bg-white hover:bg-slate-50 border border-slate-200 hover:scale-105 active:scale-95 text-slate-700 rounded-xl text-xs font-bold shadow-sm transition-all outline-none cursor-pointer flex items-center justify-center gap-1.5 relative"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                  <span>Reset Requests</span>
                  {pendingRequestsCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] w-5 h-5 rounded-full font-bold flex items-center justify-center shadow-md animate-bounce border-2 border-white">
                      {pendingRequestsCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Staff Table Grid Section */}
            {loadingStaff ? (
              <div className="bg-white border border-slate-200 rounded-[20px] p-24 text-center text-slate-400 font-extrabold text-sm uppercase tracking-wider select-none shadow-sm flex flex-col items-center justify-center gap-3">
                <svg className="animate-spin h-7 w-7 text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Loading Office Staff Directory...</span>
              </div>
            ) : (() => {
              const filtered = staffList.filter((s) => {
                const query = searchQuery.toLowerCase().trim();
                if (!query) return true;
                return (
                  s.name?.toLowerCase().includes(query) ||
                  s.email?.toLowerCase().includes(query) ||
                  s.branch?.toLowerCase().includes(query) ||
                  s.district?.toLowerCase().includes(query) ||
                  s.province?.toLowerCase().includes(query) ||
                  s.mobile?.includes(query)
                );
              });

              if (filtered.length === 0) {
                return (
                  <div className="bg-white border border-slate-200 rounded-[20px] p-16 text-center text-slate-400 font-bold select-none shadow-sm">
                    No office staff profiles found matching your query.
                  </div>
                );
              }

              return (
                <div className="flex flex-col gap-3">
                  {/* Table Header */}
                  <div className="hidden md:grid md:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)_minmax(0,1.8fr)_minmax(0,1.8fr)_minmax(0,1.0fr)_minmax(0,2.1fr)] gap-4 px-5 py-3 text-slate-500 font-extrabold text-[10px] uppercase tracking-wider select-none bg-slate-50 rounded-xl border border-slate-200/60 mb-1 items-center">
                    <div>Branch & Profile</div>
                    <div>District / Province</div>
                    <div>Office Location</div>
                    <div>Contact Info</div>
                    <div>Staff Count</div>
                    <div className="text-right">Actions</div>
                  </div>

                  {/* Table Rows */}
                  {filtered.map((staff) => (
                    <div
                      key={staff._id}
                      className="bg-white border-l-[6px] border-l-blue-500 bg-gradient-to-r from-blue-50/10 via-transparent to-transparent border border-slate-200 rounded-xl px-5 py-4 flex flex-col md:grid md:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)_minmax(0,1.8fr)_minmax(0,1.8fr)_minmax(0,1.0fr)_minmax(0,2.1fr)] md:items-center gap-4 transition-all duration-200 shadow-sm hover:shadow-md relative overflow-hidden group"
                    >
                      {/* Col 1: Branch & Name */}
                      <div className="flex flex-col min-w-0 select-none">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="w-2 h-2 rounded-full shrink-0 bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.7)]" />
                          <h3 className="font-black text-sm text-slate-800 whitespace-nowrap truncate">
                            {staff.branch} Branch
                          </h3>
                        </div>
                        <span className="text-[10px] text-slate-600 font-bold block mt-1">
                          {staff.name}
                        </span>
                      </div>

                      {/* Col 2: District / Province */}
                      <div className="flex flex-col min-w-0 select-none">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1 md:hidden">District / Province</span>
                        <span className="text-slate-700 font-bold text-xs">{staff.district}</span>
                        <span className="text-[10px] text-slate-500 font-semibold">{staff.province}</span>
                      </div>

                      {/* Col 3: Location */}
                      <div className="flex flex-col min-w-0 select-none">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1 md:hidden">Office Location</span>
                        <span className="text-slate-700 text-xs font-semibold truncate" title={staff.location}>
                          {staff.location}
                        </span>
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{staff.area}</span>
                      </div>

                      {/* Col 4: Contact Info */}
                      <div className="flex flex-col min-w-0 select-none">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1 md:hidden">Contact Info</span>
                        <span className="text-slate-700 font-semibold text-xs truncate" title={staff.email}>{staff.email}</span>
                        <span className="text-slate-600 font-medium text-xs mt-0.5">{staff.mobile}</span>
                      </div>

                      {/* Col 5: Staff Count */}
                      <div className="flex flex-col min-w-0 select-none">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1 md:hidden">Staff Count</span>
                        <span className="bg-slate-100 text-slate-800 font-black text-xs px-2.5 py-1 rounded-md w-fit text-center">
                          {staff.staffCount} members
                        </span>
                      </div>

                      {/* Col 6: Actions */}
                      <div className="flex items-center justify-between md:justify-end gap-2 pt-3 md:pt-0 border-t md:border-0 border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => triggerView(staff)}
                            className="bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-extrabold text-[11px] px-3.5 py-1.5 rounded-lg transition-all cursor-pointer focus:outline-none shadow-sm border border-slate-200"
                          >
                            View
                          </button>
                          <button
                            onClick={() => triggerEdit(staff)}
                            className="bg-[#0f2d3a] hover:bg-[#0b222c] active:scale-95 text-white font-extrabold text-[11px] px-3.5 py-1.5 rounded-lg transition-all cursor-pointer focus:outline-none shadow-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteStaff(staff._id)}
                            className="bg-[#ef4444] hover:bg-[#dc2626] text-white font-extrabold text-[11px] px-3.5 py-1.5 rounded-lg transition-all cursor-pointer focus:outline-none shadow-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </main>
        </div>
      </div>

      {/* Register New Branch Modal (Redesigned in Claim Style) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white border border-slate-200 rounded-[32px] w-full max-w-2xl shadow-2xl flex flex-col relative transition-all duration-300 overflow-hidden max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-8 pt-7 pb-2 select-none bg-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-[24px] font-black text-slate-900 tracking-tight leading-none">
                  Register New Branch
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                  Define operational profile and admin credentials
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 bg-transparent border-none outline-none cursor-pointer transition-colors p-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Horizontal Divider Line */}
            <div className="border-b border-black mx-8 mb-4 shrink-0" />

            {/* Modal Content / Form */}
            <form onSubmit={handleFormSubmit} className="px-8 pb-8 flex-1 overflow-y-auto flex flex-col gap-6 text-left">
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

              {/* Section 1: Branch Operational Profile */}
              <div className="flex flex-col gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest border-b pb-2 mb-1 select-none block">
                  1. Branch Profile Details
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Province Selection */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Province</label>
                    <div className="relative">
                      <select
                        required
                        value={formData.province}
                        onChange={(e) => {
                          const prov = e.target.value;
                          setFormData({ ...formData, province: prov, district: "", area: "", branch: "" });
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0f2d4a] transition-all font-semibold bg-white"
                      >
                        <option value="">Select Province</option>
                        {Object.keys(sriLankaLocations).map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* District Selection */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">District</label>
                    <div className="relative">
                      <select
                        required
                        disabled={!formData.province}
                        value={formData.district}
                        onChange={(e) => {
                          const dist = e.target.value;
                          setFormData({ ...formData, district: dist, area: "", branch: dist });
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0f2d4a] transition-all font-semibold bg-white disabled:bg-slate-100"
                      >
                        <option value="">Select District</option>
                        {formData.province && Object.keys(sriLankaLocations[formData.province]).map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Area Selection */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Area</label>
                    <div className="relative">
                      <select
                        required
                        disabled={!formData.district}
                        value={formData.area}
                        onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0f2d4a] transition-all font-semibold bg-white disabled:bg-slate-100"
                      >
                        <option value="">Select Area</option>
                        {formData.province && formData.district && sriLankaLocations[formData.province][formData.district].map((a) => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Branch Name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Branch Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M21 21h1.5m-18 0h-1.5m1.5 0h4.5m0 0V11.25c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125V21M3 3h1.5m1.5 0h13.5M3 3v18" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        required
                        value={formData.branch}
                        onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                        placeholder="E.g., Galle"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f2d4a] transition-all font-semibold bg-white"
                      />
                    </div>
                  </div>

                  {/* Staff Count */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Staff Count</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 014.5 0z" />
                        </svg>
                      </div>
                      <input
                        type="number"
                        required
                        min={1}
                        value={formData.staffCount}
                        onChange={(e) => setFormData({ ...formData, staffCount: Number(e.target.value) })}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0f2d4a] transition-all font-semibold bg-white"
                      />
                    </div>
                  </div>

                  {/* Office Location */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Office Location Address</label>
                    <div className="relative">
                      <div className="absolute top-3 left-3.5 pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25s-7.5-4.108-7.5-11.25a7.5 7.5 0 1 1 15 0Z" />
                        </svg>
                      </div>
                      <textarea
                        required
                        rows={1.5}
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="E.g., 12 Old Foods Road, Galle"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f2d4a] transition-all resize-none font-semibold bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Administrator Staff Credentials */}
              <div className="flex flex-col gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest border-b pb-2 mb-1 select-none block">
                  2. Administrator Profile & Credentials
                </span>

                {/* Staff Full Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Staff / Branch Profile Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="E.g., Galle Branch Office Staff"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f2d4a] transition-all font-semibold bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Email */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                        </svg>
                      </div>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="e.g. galle@sanasainsurance.lk"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f2d4a] transition-all font-semibold bg-white"
                      />
                    </div>
                  </div>

                  {/* Mobile */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Mobile Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.824-1.802-5.187-4.165-7-7l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        required
                        value={formData.mobile}
                        onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                        placeholder="e.g. 0768088176"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f2d4a] transition-all font-semibold bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-4 select-none shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-full text-xs font-bold transition-all cursor-pointer bg-white active:scale-95 shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingStaff}
                  className="px-6 py-2 bg-[#0f2d3a] hover:bg-[#0b222c] active:scale-95 text-white rounded-full text-xs font-bold shadow-[0_4px_12px_rgba(15,45,58,0.25)] transition-all cursor-pointer border-none outline-none disabled:opacity-60 flex items-center gap-2"
                >
                  {submittingStaff ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Registering...</span>
                    </>
                  ) : (
                    <span>Confirm Register</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Requests Modal (Redesigned in Claim Style) */}
      {showRequestsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white border border-slate-200 rounded-[32px] w-full max-w-4xl shadow-2xl flex flex-col relative transition-all duration-300 overflow-hidden max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-8 pt-7 pb-2 select-none bg-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-[24px] font-black text-slate-900 tracking-tight leading-none">
                  Branch Password Reset Requests
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                  Review, approve and dispatch reset codes to local offices
                </p>
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
            
            {/* Horizontal Divider Line */}
            <div className="border-b border-black mx-8 mb-4 shrink-0" />

            {/* Modal Content */}
            <div className="px-8 pb-4 flex-1 overflow-y-auto bg-white flex flex-col gap-4 text-left">
              {loadingRequests ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 select-none">
                  <svg className="animate-spin h-8 w-8 text-[#0f2d3a]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-xs text-slate-400 font-extrabold uppercase tracking-wider">Fetching password requests...</p>
                </div>
              ) : passwordRequests.length === 0 ? (
                <div className="text-center py-20 flex flex-col items-center justify-center text-slate-400 select-none bg-slate-50 border border-slate-100 rounded-3xl">
                  <div className="w-16 h-16 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-3 text-slate-300 shadow-inner">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043a3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043a3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
                    </svg>
                  </div>
                  <p className="font-bold text-sm text-slate-500">No Pending Requests</p>
                  <p className="text-xs text-slate-400 mt-1">All branch password credentials are verified and active.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {passwordRequests.map((request) => (
                    <div key={request._id} className="border border-slate-200 rounded-2xl p-6 bg-slate-50 hover:bg-slate-100/50 hover:shadow-sm transition-all flex flex-col gap-4 relative">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center shrink-0 shadow-inner">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-extrabold text-slate-800 text-sm leading-tight truncate max-w-[190px]">{request.name}</h3>
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mt-1">{request.branch} Branch Office</span>
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200 text-[9px] font-black tracking-wider uppercase select-none flex items-center gap-1 animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          Pending Reset
                        </span>
                      </div>

                      {/* Detail Grid */}
                      <div className="grid grid-cols-2 gap-y-3.5 gap-x-6 text-xs border-t border-b border-slate-200/60 py-4 font-semibold text-slate-700">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] select-none">Email Address</span>
                          <span className="text-slate-800 truncate" title={request.email}>{request.email}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] select-none">Mobile No</span>
                          <span className="text-slate-800">{request.mobile}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] select-none">Branch Province</span>
                          <span className="text-slate-800">{request.province}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] select-none">Staff Registry</span>
                          <span className="text-slate-800">{request.staffCount} active members</span>
                        </div>
                        <div className="flex flex-col gap-0.5 col-span-2">
                          <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] select-none">Location Details</span>
                          <span className="text-slate-600 leading-relaxed truncate" title={request.location}>{request.location}</span>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="flex justify-end gap-2.5 mt-1 select-none">
                        <button
                          onClick={() => handleRejectRequest(request._id)}
                          disabled={actioningRequestId !== null}
                          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 hover:text-red-600 active:scale-95 text-slate-500 text-xs font-bold rounded-full transition-all cursor-pointer outline-none disabled:opacity-60"
                        >
                          Reject Request
                        </button>
                        <button
                          onClick={() => handleApproveRequest(request._id)}
                          disabled={actioningRequestId !== null}
                          className="px-5 py-2 bg-[#0f2d3a] hover:bg-[#0b222c] active:scale-95 text-white text-xs font-extrabold rounded-full shadow-md shadow-slate-900/10 transition-all cursor-pointer border-none outline-none disabled:opacity-60 flex items-center gap-1.5"
                        >
                          {actioningRequestId === request._id ? (
                            <>
                              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              <span>Approving...</span>
                            </>
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                              </svg>
                              <span>Approve & Send OTP</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="px-8 py-5 bg-white border-t border-slate-100 flex justify-end shrink-0 select-none">
              <button
                onClick={() => setShowRequestsModal(false)}
                className="bg-[#0f2d3a] hover:bg-[#0b222c] text-white font-bold text-sm px-6 py-2 rounded-full transition-all border-none cursor-pointer flex items-center justify-center shadow-[0_4px_12px_rgba(15,45,58,0.25)] active:scale-95"
              >
                Close Requests
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Branch Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white border border-slate-200 rounded-[32px] w-full max-w-2xl shadow-2xl flex flex-col relative transition-all duration-300 overflow-hidden max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-8 pt-7 pb-2 select-none bg-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-[24px] font-black text-slate-900 tracking-tight leading-none">
                  Edit Office Staff Details
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                  Update operational profile and contact details
                </p>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingStaff(null);
                }}
                className="text-slate-400 hover:text-slate-600 bg-transparent border-none outline-none cursor-pointer transition-colors p-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Horizontal Divider Line */}
            <div className="border-b border-black mx-8 mb-4 shrink-0" />

            {/* Modal Content / Form */}
            <form onSubmit={handleEditSubmit} className="px-8 pb-8 flex-1 overflow-y-auto flex flex-col gap-6 text-left">
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

              {/* Section 1: Branch Operational Profile */}
              <div className="flex flex-col gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest border-b pb-2 mb-1 select-none block">
                  1. Branch Profile Details
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Province Selection */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Province</label>
                    <div className="relative">
                      <select
                        required
                        value={editFormData.province}
                        onChange={(e) => {
                          const prov = e.target.value;
                          setEditFormData({ ...editFormData, province: prov, district: "", area: "", branch: "" });
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0f2d4a] transition-all font-semibold bg-white"
                      >
                        <option value="">Select Province</option>
                        {Object.keys(sriLankaLocations).map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* District Selection */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">District</label>
                    <div className="relative">
                      <select
                        required
                        disabled={!editFormData.province}
                        value={editFormData.district}
                        onChange={(e) => {
                          const dist = e.target.value;
                          setEditFormData({ ...editFormData, district: dist, area: "", branch: dist });
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0f2d4a] transition-all font-semibold bg-white disabled:bg-slate-100"
                      >
                        <option value="">Select District</option>
                        {editFormData.province && Object.keys(sriLankaLocations[editFormData.province]).map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Area Selection */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Area</label>
                    <div className="relative">
                      <select
                        required
                        disabled={!editFormData.district}
                        value={editFormData.area}
                        onChange={(e) => setEditFormData({ ...editFormData, area: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0f2d4a] transition-all font-semibold bg-white disabled:bg-slate-100"
                      >
                        <option value="">Select Area</option>
                        {editFormData.province && editFormData.district && sriLankaLocations[editFormData.province][editFormData.district].map((a) => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Branch Name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Branch Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M21 21h1.5m-18 0h-1.5m1.5 0h4.5m0 0V11.25c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125V21M3 3h1.5m1.5 0h13.5M3 3v18" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        required
                        value={editFormData.branch}
                        onChange={(e) => setEditFormData({ ...editFormData, branch: e.target.value })}
                        placeholder="E.g., Galle"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f2d4a] transition-all font-semibold bg-white"
                      />
                    </div>
                  </div>

                  {/* Staff Count */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Staff Count</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 014.5 0z" />
                        </svg>
                      </div>
                      <input
                        type="number"
                        required
                        min={1}
                        value={editFormData.staffCount}
                        onChange={(e) => setEditFormData({ ...editFormData, staffCount: Number(e.target.value) })}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0f2d4a] transition-all font-semibold bg-white"
                      />
                    </div>
                  </div>

                  {/* Office Location */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Office Location Address</label>
                    <div className="relative">
                      <div className="absolute top-3 left-3.5 pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25s-7.5-4.108-7.5-11.25a7.5 7.5 0 1 1 15 0Z" />
                        </svg>
                      </div>
                      <textarea
                        required
                        rows={1.5}
                        value={editFormData.location}
                        onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                        placeholder="E.g., 12 Old Foods Road, Galle"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f2d4a] transition-all resize-none font-semibold bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Administrator Staff Credentials */}
              <div className="flex flex-col gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest border-b pb-2 mb-1 select-none block">
                  2. Administrator Profile & Credentials
                </span>

                {/* Staff Full Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Staff / Branch Profile Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      required
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      placeholder="E.g., Galle Branch Office Staff"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f2d4a] transition-all font-semibold bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Email */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                        </svg>
                      </div>
                      <input
                        type="email"
                        required
                        value={editFormData.email}
                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                        placeholder="e.g. galle@sanasainsurance.lk"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f2d4a] transition-all font-semibold bg-white"
                      />
                    </div>
                  </div>

                  {/* Mobile */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Mobile Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.824-1.802-5.187-4.165-7-7l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        required
                        value={editFormData.mobile}
                        onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value })}
                        placeholder="e.g. 0768088176"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f2d4a] transition-all font-semibold bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-4 select-none shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingStaff(null);
                  }}
                  className="px-6 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-full text-xs font-bold transition-all cursor-pointer bg-white active:scale-95 shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingStaff}
                  className="px-6 py-2 bg-[#0f2d3a] hover:bg-[#0b222c] active:scale-95 text-white rounded-full text-xs font-bold shadow-[0_4px_12px_rgba(15,45,58,0.25)] transition-all cursor-pointer border-none outline-none disabled:opacity-60 flex items-center gap-2"
                >
                  {submittingStaff ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Branch Staff details Modal */}
      {showViewModal && viewingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white border border-slate-200 rounded-[32px] w-full max-w-lg shadow-2xl flex flex-col relative transition-all duration-300 overflow-hidden max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-8 pt-7 pb-2 select-none bg-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-[24px] font-black text-slate-900 tracking-tight leading-none">
                  {viewingStaff.branch} Branch Profile
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                  Office Staff Registry Information
                </p>
              </div>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewingStaff(null);
                }}
                className="text-slate-400 hover:text-slate-600 bg-transparent border-none outline-none cursor-pointer transition-colors p-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Horizontal Divider Line */}
            <div className="border-b border-black mx-8 mb-4 shrink-0" />

            {/* Modal Content */}
            <div className="px-8 pb-8 flex-1 overflow-y-auto flex flex-col gap-5 text-left">
              {/* Branch Profile Name Card */}
              <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 flex flex-col gap-1">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Profile Name</span>
                <span className="text-base font-black text-slate-800">{viewingStaff.name}</span>
              </div>

              {/* Grid 1: Location details */}
              <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 flex flex-col gap-4">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider border-b pb-1 select-none">Location & Geography</span>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Province</span>
                    <span className="text-slate-850 text-xs font-bold">{viewingStaff.province}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">District</span>
                    <span className="text-slate-850 text-xs font-bold">{viewingStaff.district}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Area</span>
                    <span className="text-slate-850 text-xs font-bold">{viewingStaff.area}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Staff Count</span>
                    <span className="text-[#0f2d4a] text-xs font-extrabold">{viewingStaff.staffCount} members</span>
                  </div>
                </div>
                <div className="mt-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Office Location Address</span>
                  <p className="text-slate-750 text-xs font-semibold leading-relaxed bg-white border border-slate-200/60 rounded-xl p-3">
                    {viewingStaff.location}
                  </p>
                </div>
              </div>

              {/* Grid 2: Contact Info */}
              <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 flex flex-col gap-4">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider border-b pb-1 select-none">Contact Details</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Email Address</span>
                    <span className="text-slate-800 text-xs font-bold block break-all">{viewingStaff.email}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Mobile Number</span>
                    <span className="text-slate-800 text-xs font-bold block">{viewingStaff.mobile}</span>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end mt-4 select-none">
                <button
                  type="button"
                  onClick={() => {
                    setShowViewModal(false);
                    setViewingStaff(null);
                  }}
                  className="px-8 py-2.5 bg-[#0f2d3a] hover:bg-[#0b222c] active:scale-95 text-white rounded-full text-xs font-bold shadow-[0_4px_12px_rgba(15,45,58,0.25)] transition-all cursor-pointer border-none outline-none"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
