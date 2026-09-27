"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import OfficeStaffNavbar from "@/app/Components/Office_Staff/Navbar";
import { API_URL } from "@/app/config";
import UserAvatarDropdown from "@/app/Components/UserAvatarDropdown";
import SimpleLoader from "@/app/Components/SimpleLoader";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Menu01Icon,
  Notification01Icon,
  UserMultiple02Icon,
  Search01Icon,
  BubbleChatIcon,
  Cancel01Icon,
  Alert02Icon,
  CheckmarkCircle01Icon,
  Edit02Icon,
  File01Icon,
  ViewIcon,
  CheckmarkBadge01Icon
} from "@hugeicons/core-free-icons";

interface Vehicle {
  numberPlate: string;
  vehicleType: string;
  year: string;
  company: string;
  model: string;
  engineNumber: string;
  chassisNumber: string;
  policyNumber: string;
}

interface Registration {
  _id: string;
  firstName: string;
  lastName: string;
  nic: string;
  mobile: string;
  email: string;
  dob: string;
  address: string;
  province: string;
  city: string;
  branch: string;
  referenceNumber: string;
  vehicles?: Vehicle[];
  documents?: {
    nicFront?: string;
    nicBack?: string;
    vehicleReg?: string;
    revenueLicense?: string;
  };
  createdAt: string;
}

interface ProfileEditRequest {
  _id: string;
  userNic: string;
  userReferenceNumber: string;
  userName: string;
  userEmail: string;
  userMobile: string;
  branch: string;
  requestType: string;
  originalData: {
    firstName?: string;
    lastName?: string;
    mobile?: string;
    email?: string;
    dob?: string;
    address?: string;
    province?: string;
    city?: string;
    documents?: {
      nicFront?: string;
      nicBack?: string;
      vehicleReg?: string;
      revenueLicense?: string;
    };
  };
  requestedChanges: {
    firstName?: string;
    lastName?: string;
    mobile?: string;
    email?: string;
    dob?: string;
    address?: string;
    province?: string;
    city?: string;
    documents?: {
      nicFront?: string;
      nicBack?: string;
      vehicleReg?: string;
      revenueLicense?: string;
    };
  };
  status: "Pending" | "Approved" | "Rejected";
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export default function RegistrationsPage() {
  const router = useRouter();
  const [branch, setBranch] = useState("");
  const [staffInfo, setStaffInfo] = useState<any>(null);

  // Active Category: "registrations" (New Registrations) vs "edit_requests" (Profile Edit Requests)
  const [activeCategory, setActiveCategory] = useState<"registrations" | "edit_requests">("registrations");

  // New Registrations State
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);

  // Profile Edit Requests State
  const [editRequests, setEditRequests] = useState<ProfileEditRequest[]>([]);
  const [selectedEditRequest, setSelectedEditRequest] = useState<ProfileEditRequest | null>(null);
  const [editStatusFilter, setEditStatusFilter] = useState<"all" | "Pending" | "Approved" | "Rejected">("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Popups & Rejection Modals
  const [customPopup, setCustomPopup] = useState<{
    show: boolean;
    title: string;
    message: string;
    type?: "alert" | "confirm" | "success" | "error";
    onConfirm?: () => void;
  }>({ show: false, title: "", message: "", type: "alert" });

  const [regRejectModal, setRegRejectModal] = useState<{ show: boolean; reg: Registration | null; reason: string }>({
    show: false,
    reg: null,
    reason: ""
  });

  const [editRejectModal, setEditRejectModal] = useState<{ show: boolean; request: ProfileEditRequest | null; reason: string }>({
    show: false,
    request: null,
    reason: ""
  });

  // Load registrations
  const loadRegistrations = async (currentBranch: string, silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch(`${API_URL}/office-staff/registrations?branch=${currentBranch}`);
      if (!res.ok) throw new Error("Failed to fetch registrations.");
      const data = await res.json();
      const freshRegs = data.registrations || [];
      setRegistrations(freshRegs);

      if (selectedReg) {
        const updated = freshRegs.find((r: Registration) => r._id === selectedReg._id);
        if (updated) setSelectedReg(updated);
      }
    } catch (err: any) {
      console.error("Load registrations error:", err);
      if (!silent) setError(err.message || "Failed to load registrations.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Load profile edit requests
  const loadEditRequests = async (currentBranch: string, silent = false) => {
    try {
      const res = await fetch(`${API_URL}/office-staff/profile-update-requests?branch=${currentBranch}&status=all`);
      if (res.ok) {
        const data = await res.json();
        const freshRequests = data.requests || [];
        setEditRequests(freshRequests);

        if (selectedEditRequest) {
          const updated = freshRequests.find((r: ProfileEditRequest) => r._id === selectedEditRequest._id);
          if (updated) setSelectedEditRequest(updated);
        }
      }
    } catch (err: any) {
      console.error("Load edit requests error:", err);
    }
  };

  useEffect(() => {
    let currentBranch = "";
    if (typeof window !== "undefined") {
      const savedStaff = sessionStorage.getItem("logged_in_staff");
      if (!savedStaff) {
        router.push("/Login");
        return;
      }
      try {
        const staffObj = JSON.parse(savedStaff);
        if (staffObj && staffObj.branch) {
          currentBranch = staffObj.branch;
          setBranch(currentBranch);
          setStaffInfo(staffObj);
        } else {
          router.push("/Login");
          return;
        }
      } catch (e) {
        console.error("Error parsing logged_in_staff", e);
        router.push("/Login");
        return;
      }
    }

    if (currentBranch) {
      loadRegistrations(currentBranch);
      loadEditRequests(currentBranch, true);
    }
  }, [router]);

  // Real-time polling
  useEffect(() => {
    if (!branch) return;
    const pollInterval = setInterval(() => {
      loadRegistrations(branch, true);
      loadEditRequests(branch, true);
    }, 7000);
    return () => clearInterval(pollInterval);
  }, [branch, selectedReg, selectedEditRequest]);

  // Handle New Registration Status Update (Approve / Reject)
  const handleRegStatusUpdate = async (id: string, newStatus: string, reason?: string) => {
    try {
      const targetReg = registrations.find(r => r._id === id);
      const res = await fetch(`${API_URL}/office-staff/registrations/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to update status to ${newStatus}`);

      setRegistrations(prev => prev.filter(r => r._id !== id));
      if (selectedReg && selectedReg._id === id) setSelectedReg(null);

      setCustomPopup({
        show: true,
        title: newStatus === "Approved" ? "Registration Approved" : "Registration Rejected",
        message: `Policyholder registration has been ${newStatus.toLowerCase()}.${data.emailSent && targetReg ? ` Notification email sent to ${targetReg.email}.` : ""}`,
        type: "success"
      });
    } catch (err: any) {
      console.error(err);
      setCustomPopup({ show: true, title: "Error", message: err.message || "Failed to update status.", type: "error" });
    }
  };

  // Handle Profile Edit Request Review (Approve / Reject)
  const handleReviewEditRequest = async (id: string, action: "Approve" | "Reject", reviewNote?: string) => {
    try {
      const staffName = staffInfo ? `${staffInfo.firstName || ""} ${staffInfo.lastName || ""}`.trim() || staffInfo.name || "Branch Staff" : "Branch Staff";
      const res = await fetch(`${API_URL}/office-staff/profile-update-requests/${id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reviewNote: reviewNote || (action === "Approve" ? "Approved by Branch Office Staff" : "Rejected by Branch Office Staff"),
          reviewerName: staffName
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${action.toLowerCase()} edit request.`);

      await loadEditRequests(branch, true);
      if (selectedEditRequest && selectedEditRequest._id === id) {
        setSelectedEditRequest(data.request || null);
      }

      setCustomPopup({
        show: true,
        title: action === "Approve" ? "Profile Changes Approved" : "Profile Changes Rejected",
        message: action === "Approve"
          ? "The requested profile and document changes have been approved and updated in the database. A confirmation email has been dispatched to the policy holder."
          : "The profile update request has been rejected. A notification email with your reason has been sent to the policy holder.",
        type: "success"
      });
    } catch (err: any) {
      console.error("Review error:", err);
      setCustomPopup({ show: true, title: "Error", message: err.message || "Failed to process review.", type: "error" });
    }
  };

  const triggerApproveReg = (reg: Registration) => {
    setCustomPopup({
      show: true,
      title: "Approve Registration",
      message: `Are you sure you want to approve the registration for ${reg.firstName} ${reg.lastName}? An approval email will be sent to ${reg.email}.`,
      type: "confirm",
      onConfirm: () => handleRegStatusUpdate(reg._id, "Approved")
    });
  };

  const triggerApproveEdit = (req: ProfileEditRequest) => {
    setCustomPopup({
      show: true,
      title: "Approve Profile Update Request",
      message: `Are you sure you want to approve the requested changes for ${req.userName} (${req.userNic})? The user's account in the database will be updated automatically and a confirmation email will be sent to ${req.userEmail}.`,
      type: "confirm",
      onConfirm: () => handleReviewEditRequest(req._id, "Approve")
    });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${date.getDate().toString().padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`;
    } catch (e) {
      return dateStr;
    }
  };

  const formatPlate = (plate: string) => {
    if (!plate) return "-";
    const cleaned = plate.trim();
    if (cleaned.includes("-")) return cleaned.toUpperCase();
    const m = cleaned.match(/^(.*[A-Za-z]+)(\d+)$/);
    if (m) return `${m[1].trim().toUpperCase()} - ${m[2]}`;
    return cleaned.toUpperCase();
  };

  const getFullDocUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
    return `${API_URL.replace("/api", "")}/uploads/${url}`;
  };

  // Filter New Registrations
  const filteredRegs = registrations.filter(r => {
    const query = searchQuery.toLowerCase();
    const matchesVehicle = r.vehicles?.some(v =>
      v.numberPlate.toLowerCase().includes(query) ||
      v.policyNumber.toLowerCase().includes(query)
    );
    return (
      r.firstName.toLowerCase().includes(query) ||
      r.lastName.toLowerCase().includes(query) ||
      r.nic.toLowerCase().includes(query) ||
      r.referenceNumber.toLowerCase().includes(query) ||
      r.email.toLowerCase().includes(query) ||
      matchesVehicle
    );
  });

  // Filter Profile Edit Requests
  const filteredEditRequests = editRequests.filter(r => {
    const query = searchQuery.toLowerCase();
    const matchesStatus = editStatusFilter === "all" || r.status === editStatusFilter;
    const matchesQuery =
      r.userName.toLowerCase().includes(query) ||
      r.userNic.toLowerCase().includes(query) ||
      r.userReferenceNumber?.toLowerCase().includes(query) ||
      r.userEmail.toLowerCase().includes(query) ||
      r.userMobile.toLowerCase().includes(query) ||
      r.requestType.toLowerCase().includes(query);
    return matchesStatus && matchesQuery;
  });

  const pendingEditCount = editRequests.filter(r => r.status === "Pending").length;

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans">
      <div className="flex flex-1 flex-row min-h-0">
        <OfficeStaffNavbar />

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
                <span className="bg-[#102A43] text-white text-base px-4 py-2 rounded-xl font-semibold shadow-sm tracking-wide">
                  {branch || "Galle"} Branch
                </span>
                <span className="hidden md:inline text-slate-400 font-medium">— Registrations & Updates</span>
              </h1>
            </div>
            
            <div className="flex items-center gap-5">
              <Link href="/Office_Staff/Notifications" className="relative p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer focus:outline-none flex items-center justify-center">
                <HugeiconsIcon icon={Notification01Icon} className="w-6 h-6 text-slate-500 hover:text-slate-800" strokeWidth={2} />
              </Link>
              <UserAvatarDropdown userType="office_staff" />
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-8 bg-white overflow-y-scroll [scrollbar-gutter:stable]">
            {loading ? (
              <SimpleLoader message="Loading requests..." theme="slate" />
            ) : error ? (
              <div className="w-full h-full flex flex-col items-center justify-center min-h-[300px] text-red-500 font-semibold bg-red-50 rounded-2xl p-8 border border-red-200">
                <span>{error}</span>
              </div>
            ) : (
              <div className="max-w-6xl mx-auto flex flex-col gap-6">
                
                {/* Section Title */}
                <div className="flex items-center gap-2 select-none">
                  <HugeiconsIcon icon={UserMultiple02Icon} className="w-5 h-5 text-slate-700 flex-shrink-0" strokeWidth={2.5} />
                  <h2 className="text-lg font-semibold text-slate-800 tracking-wide">
                    Registrations & Edit Approvals
                  </h2>
                </div>

                {/* Primary Category Switcher Tabs */}
                <div className="flex items-center gap-3 border-b border-slate-200/80 pb-3 select-none">
                  <button
                    onClick={() => setActiveCategory("registrations")}
                    className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
                      activeCategory === "registrations"
                        ? "bg-[#102A43] text-white border-[#102A43] shadow-sm"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    <HugeiconsIcon icon={UserMultiple02Icon} className="w-4 h-4" strokeWidth={2} />
                    <span>New Registrations</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      activeCategory === "registrations" ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"
                    }`}>
                      {registrations.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveCategory("edit_requests")}
                    className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
                      activeCategory === "edit_requests"
                        ? "bg-[#102A43] text-white border-[#102A43] shadow-sm"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    <HugeiconsIcon icon={Edit02Icon} className="w-4 h-4" strokeWidth={2} />
                    <span>Profile Edit Requests</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      activeCategory === "edit_requests"
                        ? "bg-amber-400 text-slate-900"
                        : pendingEditCount > 0 ? "bg-amber-500 text-white animate-pulse" : "bg-slate-200 text-slate-600"
                    }`}>
                      {pendingEditCount} Pending
                    </span>
                  </button>
                </div>

                {/* Search & Sub-Filter Bar Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="relative w-full max-w-[340px]">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <HugeiconsIcon icon={Search01Icon} className="w-4 h-4 text-slate-400" strokeWidth={2.5} />
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={activeCategory === "registrations" ? "Search by name, NIC, plate, ref..." : "Search by applicant, NIC, category..."}
                      className="w-full pl-10 pr-4 py-2.5 rounded-full border border-slate-300 text-slate-700 placeholder:text-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-transparent transition-all shadow-sm"
                    />
                  </div>

                  {activeCategory === "edit_requests" && (
                    <div className="flex items-center gap-2 select-none">
                      {(["all", "Pending", "Approved", "Rejected"] as const).map((st) => (
                        <button
                          key={st}
                          onClick={() => setEditStatusFilter(st)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                            editStatusFilter === st
                              ? "bg-[#000080] text-white border-[#000080] shadow-2xs"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {st === "all" ? "All Requests" : st}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* ======================================================== */}
                {/* CATEGORY 1: New Registrations Table                      */}
                {/* ======================================================== */}
                {activeCategory === "registrations" && (
                  filteredRegs.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-[20px] p-12 text-center text-slate-400 font-medium select-none shadow-sm">
                      No new registrations found matching your query.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {/* Table Header Row */}
                      <div className="hidden md:grid md:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1.0fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,2.2fr)] gap-4 px-5 py-3 text-slate-400 font-medium text-[10px] uppercase tracking-wider select-none bg-slate-50 rounded-xl border border-slate-200/60 mb-1 items-center">
                        <div>Applicant Name</div>
                        <div>NIC Number</div>
                        <div>Vehicle Plate</div>
                        <div>Vehicle Type</div>
                        <div>Policy Number</div>
                        <div>Date</div>
                        <div className="text-right">Actions</div>
                      </div>

                      {filteredRegs.map((reg) => (
                        <div
                          key={reg._id}
                          onClick={() => setSelectedReg(reg)}
                          className="bg-white border-l-[6px] border-l-blue-500 bg-gradient-to-r from-blue-50/10 via-transparent to-transparent hover:border-blue-400 border border-slate-200 rounded-xl px-5 py-4 flex flex-col md:grid md:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1.0fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,2.2fr)] md:items-center gap-4 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md relative overflow-hidden group"
                        >
                          <div className="flex flex-col min-w-0 select-none">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="w-2 h-2 rounded-full shrink-0 bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.7)]" />
                              <h3 className="font-semibold text-sm text-slate-800 whitespace-nowrap truncate">
                                {reg.firstName} {reg.lastName}
                              </h3>
                            </div>
                            <span className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase bg-slate-100 px-2 py-0.5 rounded mt-1.5 w-fit">
                              Ref: {reg.referenceNumber}
                            </span>
                          </div>

                          <div className="flex flex-col min-w-0 select-none">
                            <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider block mb-1 md:hidden">NIC</span>
                            <span className="text-slate-700 font-semibold text-xs">{reg.nic}</span>
                          </div>

                          <div className="flex flex-col min-w-0 select-none">
                            <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider block mb-1 md:hidden">Vehicle Plate</span>
                            <span className="text-slate-800 font-semibold text-xs">
                              {reg.vehicles && reg.vehicles.length > 0 ? formatPlate(reg.vehicles[0].numberPlate) : "-"}
                            </span>
                          </div>

                          <div className="flex flex-col min-w-0 select-none">
                            <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider block mb-1 md:hidden">Vehicle Type</span>
                            <span className="text-slate-700 text-xs font-semibold">
                              {reg.vehicles && reg.vehicles.length > 0 ? reg.vehicles[0].vehicleType : "No Vehicle"}
                            </span>
                          </div>

                          <div className="flex flex-col min-w-0 select-none">
                            <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider block mb-1 md:hidden">Policy No.</span>
                            <span className="font-semibold text-[#0f2d4a] text-xs">
                              {reg.vehicles && reg.vehicles.length > 0 ? reg.vehicles[0].policyNumber : "-"}
                            </span>
                          </div>

                          <div className="flex flex-col min-w-0 select-none">
                            <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider block mb-1 md:hidden">Date</span>
                            <span className="text-slate-600 text-xs font-semibold">{formatDate(reg.createdAt)}</span>
                          </div>

                          <div className="flex items-center justify-between md:justify-end gap-2 mt-4 md:mt-0 pt-3 md:pt-0 border-t md:border-0 border-slate-100" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => triggerApproveReg(reg)}
                              className="bg-[#10b981] hover:bg-[#0ea5e9] text-white font-semibold text-[11px] px-3.5 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm border-none"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => setRegRejectModal({ show: true, reg, reason: "" })}
                              className="bg-[#ef4444] hover:bg-[#dc2626] text-white font-semibold text-[11px] px-3.5 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm border-none"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => setSelectedReg(reg)}
                              className="border border-slate-300 hover:bg-slate-50 text-slate-600 font-medium text-[11px] px-3.5 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm bg-white"
                            >
                              View
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* ======================================================== */}
                {/* CATEGORY 2: Profile Edit Requests Table                  */}
                {/* ======================================================== */}
                {activeCategory === "edit_requests" && (
                  filteredEditRequests.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-[20px] p-12 text-center text-slate-400 font-medium select-none shadow-sm">
                      No profile edit requests found matching your query.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {/* Table Header Row */}
                      <div className="hidden md:grid md:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)_minmax(0,1.3fr)_minmax(0,1.6fr)_minmax(0,1.1fr)_minmax(0,1.0fr)_minmax(0,2.0fr)] gap-4 px-5 py-3 text-slate-400 font-medium text-[10px] uppercase tracking-wider select-none bg-slate-50 rounded-xl border border-slate-200/60 mb-1 items-center">
                        <div>Policy Holder</div>
                        <div>NIC Number</div>
                        <div>Category</div>
                        <div>Requested Changes</div>
                        <div>Status</div>
                        <div>Date</div>
                        <div className="text-right">Actions</div>
                      </div>

                      {filteredEditRequests.map((req) => {
                        const isPending = req.status === "Pending";
                        const isApproved = req.status === "Approved";
                        const isRejected = req.status === "Rejected";

                        const changeKeys = Object.keys(req.requestedChanges || {});
                        const hasDocs = Boolean(req.requestedChanges?.documents);

                        return (
                          <div
                            key={req._id}
                            onClick={() => setSelectedEditRequest(req)}
                            className={`bg-white border-l-[6px] ${
                              isPending
                                ? "border-l-amber-500 bg-gradient-to-r from-amber-50/20 via-transparent to-transparent"
                                : isApproved
                                ? "border-l-emerald-500 bg-gradient-to-r from-emerald-50/15 via-transparent to-transparent"
                                : "border-l-red-500 bg-gradient-to-r from-red-50/15 via-transparent to-transparent"
                            } hover:border-slate-400 border border-slate-200 rounded-xl px-5 py-4 flex flex-col md:grid md:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)_minmax(0,1.3fr)_minmax(0,1.6fr)_minmax(0,1.1fr)_minmax(0,1.0fr)_minmax(0,2.0fr)] md:items-center gap-4 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md relative overflow-hidden group`}
                          >
                            {/* Col 1: Name & Ref */}
                            <div className="flex flex-col min-w-0 select-none">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${
                                  isPending ? "bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.7)]" : isApproved ? "bg-emerald-500" : "bg-red-500"
                                }`} />
                                <h3 className="font-semibold text-sm text-slate-800 whitespace-nowrap truncate">
                                  {req.userName}
                                </h3>
                              </div>
                              <span className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase bg-slate-100 px-2 py-0.5 rounded mt-1.5 w-fit">
                                Ref: {req.userReferenceNumber || "SAN-PH"}
                              </span>
                            </div>

                            {/* Col 2: NIC */}
                            <div className="flex flex-col min-w-0 select-none">
                              <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider block mb-1 md:hidden">NIC</span>
                              <span className="text-slate-700 font-semibold text-xs font-mono">{req.userNic}</span>
                            </div>

                            {/* Col 3: Category */}
                            <div className="flex flex-col min-w-0 select-none">
                              <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider block mb-1 md:hidden">Category</span>
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-[#102A43]/5 text-[#102A43] border border-[#102A43]/15 w-fit">
                                <HugeiconsIcon icon={File01Icon} className="w-3 h-3 text-sky-600" strokeWidth={2} />
                                <span>{req.requestType}</span>
                              </span>
                            </div>

                            {/* Col 4: Changes Summary */}
                            <div className="flex flex-col min-w-0 select-none">
                              <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider block mb-1 md:hidden">Changes</span>
                              <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-600">
                                {hasDocs && (
                                  <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200">
                                    KYC Docs ({Object.keys(req.requestedChanges?.documents || {}).length})
                                  </span>
                                )}
                                {changeKeys.filter(k => k !== "documents").slice(0, 2).map((k) => (
                                  <span key={k} className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded">
                                    {k}
                                  </span>
                                ))}
                                {changeKeys.filter(k => k !== "documents").length > 2 && (
                                  <span className="text-[10px] text-slate-400 font-semibold">
                                    +{changeKeys.filter(k => k !== "documents").length - 2} more
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Col 5: Status */}
                            <div className="flex flex-col min-w-0 select-none">
                              <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider block mb-1 md:hidden">Status</span>
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full w-fit ${
                                isPending
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : isApproved
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-red-50 text-red-700 border border-red-200"
                              }`}>
                                {req.status}
                              </span>
                            </div>

                            {/* Col 6: Date */}
                            <div className="flex flex-col min-w-0 select-none">
                              <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider block mb-1 md:hidden">Date</span>
                              <span className="text-slate-600 text-xs font-semibold">{formatDate(req.createdAt)}</span>
                            </div>

                            {/* Col 7: Actions */}
                            <div className="flex items-center justify-between md:justify-end gap-2 mt-4 md:mt-0 pt-3 md:pt-0 border-t md:border-0 border-slate-100" onClick={(e) => e.stopPropagation()}>
                              {isPending ? (
                                <>
                                  <button
                                    onClick={() => triggerApproveEdit(req)}
                                    className="bg-[#10b981] hover:bg-[#059669] text-white font-semibold text-[11px] px-3.5 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm border-none"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => setEditRejectModal({ show: true, request: req, reason: "" })}
                                    className="bg-[#ef4444] hover:bg-[#dc2626] text-white font-semibold text-[11px] px-3.5 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm border-none"
                                  >
                                    Reject
                                  </button>
                                </>
                              ) : (
                                <span className="text-[11px] font-semibold text-slate-400 italic mr-1">
                                  {isApproved ? "Approved" : "Rejected"}
                                </span>
                              )}
                              <button
                                onClick={() => setSelectedEditRequest(req)}
                                className="border border-slate-300 hover:bg-slate-50 text-slate-600 font-medium text-[11px] px-3.5 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm bg-white"
                              >
                                View Details
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}

              </div>
            )}
          </main>
        </div>
      </div>

      {/* Floating Action Chat Button */}
      <button className="fixed bottom-8 right-8 z-40 bg-[#00ddff] hover:bg-[#00c8e6] text-white p-5 rounded-full shadow-2xl transition-all duration-150 hover:scale-110 active:scale-95 cursor-pointer focus:outline-none border-none flex items-center justify-center" aria-label="Chat support">
        <HugeiconsIcon icon={BubbleChatIcon} className="w-7 h-7 text-white" strokeWidth={2} />
      </button>

      {/* ======================================================== */}
      {/* Centered Modal: New Registration Details                 */}
      {/* ======================================================== */}
      {selectedReg && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white border border-slate-200 rounded-[24px] w-full max-w-[720px] max-h-[90vh] shadow-2xl flex flex-col relative overflow-hidden">
            <div className="flex justify-between items-center px-8 pt-6 pb-4 border-b border-slate-200 flex-shrink-0 select-none">
              <div>
                <h2 className="text-[22px] font-semibold text-[#0f2d3a] tracking-tight leading-none">
                  {selectedReg.firstName} {selectedReg.lastName}
                </h2>
                <p className="text-xs text-slate-400 font-medium mt-1.5">Ref: {selectedReg.referenceNumber}</p>
              </div>
              <button
                onClick={() => setSelectedReg(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-semibold border-none bg-transparent cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-8 flex-1 overflow-y-auto space-y-6">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center justify-between select-none">
                <span className="text-sm font-semibold text-slate-700">Quick Actions for this registration:</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => triggerApproveReg(selectedReg)}
                    className="bg-[#10b981] hover:bg-[#0ea5e9] text-white font-semibold text-xs px-4 py-2.5 rounded-lg transition-all cursor-pointer shadow-sm border-none"
                  >
                    Approve Registration
                  </button>
                  <button
                    onClick={() => setRegRejectModal({ show: true, reg: selectedReg, reason: "" })}
                    className="bg-[#ef4444] hover:bg-[#dc2626] text-white font-semibold text-xs px-4 py-2.5 rounded-lg transition-all cursor-pointer shadow-sm border-none"
                  >
                    Reject Registration
                  </button>
                </div>
              </div>

              {/* Personal Details */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 grid grid-cols-2 gap-4 select-none">
                <h3 className="col-span-2 font-semibold text-slate-800 text-xs tracking-wide uppercase text-amber-500 mb-2">Personal Information</h3>
                <div>
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">NIC Number</span>
                  <span className="text-sm font-semibold text-slate-700">{selectedReg.nic}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Date of Birth</span>
                  <span className="text-sm font-semibold text-slate-700">{selectedReg.dob}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Mobile Number</span>
                  <span className="text-sm font-semibold text-slate-700">{selectedReg.mobile}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Email Address</span>
                  <span className="text-sm font-semibold text-slate-700 truncate block">{selectedReg.email}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Permanent Address</span>
                  <span className="text-sm font-semibold text-slate-700 leading-relaxed block">
                    {selectedReg.address}, {selectedReg.city}, {selectedReg.province}
                  </span>
                </div>
              </div>

              {/* Uploaded Documents */}
              <div className="space-y-4 pb-4 select-none mt-6">
                <h3 className="font-semibold text-slate-800 text-xs tracking-wide uppercase text-amber-500">Uploaded Documents</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: "nicFront", label: "NIC Front View" },
                    { key: "nicBack", label: "NIC Back View" },
                    { key: "vehicleReg", label: "Vehicle Reg Book" },
                    { key: "revenueLicense", label: "Revenue License" }
                  ].map((doc) => {
                    const docUrl = (selectedReg.documents as any)?.[doc.key];
                    const srcUrl = getFullDocUrl(docUrl);
                    return (
                      <div key={doc.key} className="border border-slate-200 rounded-xl p-4 flex flex-col items-center">
                        <span className="text-xs font-semibold text-slate-500 mb-2">{doc.label}</span>
                        <div className="w-full aspect-[4/3] bg-slate-50 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center relative">
                          {docUrl ? (
                            <img
                              src={srcUrl}
                              alt={doc.label}
                              onClick={() => setPreviewImage(srcUrl)}
                              className="object-cover w-full h-full hover:scale-105 transition-transform duration-300 cursor-zoom-in"
                            />
                          ) : (
                            <span className="text-xs text-slate-400 italic font-semibold">No Document Uploaded</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 flex justify-end flex-shrink-0">
              <button
                onClick={() => setSelectedReg(null)}
                className="bg-[#000080] hover:bg-[#000066] text-white font-semibold text-xs px-8 py-2.5 rounded-full transition-all border-none cursor-pointer shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Centered Modal: Profile Edit Request Review & Diff       */}
      {/* ======================================================== */}
      {selectedEditRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white border border-slate-200 rounded-[24px] w-full max-w-[780px] max-h-[90vh] shadow-2xl flex flex-col relative overflow-hidden">
            
            {/* Header */}
            <div className="flex justify-between items-center px-8 pt-6 pb-4 border-b border-slate-200 flex-shrink-0 select-none">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[20px] font-bold text-[#0f2d3a] tracking-tight">
                    {selectedEditRequest.userName}
                  </h2>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    selectedEditRequest.status === "Pending"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : selectedEditRequest.status === "Approved"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-red-50 text-red-700 border-red-200"
                  }`}>
                    {selectedEditRequest.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-1">
                  NIC: <span className="font-mono font-bold text-slate-600">{selectedEditRequest.userNic}</span> • Category: <span className="font-semibold text-slate-700">{selectedEditRequest.requestType}</span> • Submitted: {formatDate(selectedEditRequest.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setSelectedEditRequest(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-semibold border-none bg-transparent cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Body */}
            <div className="p-8 flex-1 overflow-y-auto space-y-6 select-none">
              
              {/* Quick Actions (if pending) */}
              {selectedEditRequest.status === "Pending" && (
                <div className="bg-amber-50/70 border border-amber-200/80 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-amber-900">Pending Review for {selectedEditRequest.branch} Branch</h4>
                    <p className="text-xs text-amber-700 mt-0.5">Approve to automatically apply changes in database, or reject with a feedback note.</p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <button
                      onClick={() => triggerApproveEdit(selectedEditRequest)}
                      className="bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm border-none"
                    >
                      Approve Request
                    </button>
                    <button
                      onClick={() => setEditRejectModal({ show: true, request: selectedEditRequest, reason: "" })}
                      className="bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm border-none"
                    >
                      Reject Request
                    </button>
                  </div>
                </div>
              )}

              {/* Already Reviewed Information Banner */}
              {selectedEditRequest.status !== "Pending" && (
                <div className={`p-4 rounded-2xl border ${
                  selectedEditRequest.status === "Approved" ? "bg-emerald-50/70 border-emerald-200 text-emerald-900" : "bg-red-50/70 border-red-200 text-red-900"
                }`}>
                  <span className="text-xs font-bold block">
                    {selectedEditRequest.status === "Approved" ? "✅ Changes Approved & Live in Database" : "❌ Request Rejected"}
                  </span>
                  <p className="text-xs mt-0.5 opacity-90">
                    Reviewed by <strong className="font-semibold">{selectedEditRequest.reviewedBy || "Staff"}</strong> on {formatDate(selectedEditRequest.reviewedAt || "")}.
                    {selectedEditRequest.reviewNote && ` Note: "${selectedEditRequest.reviewNote}"`}
                  </p>
                </div>
              )}

              {/* Personal & Contact Information Diff Table */}
              {(selectedEditRequest.requestType?.includes("Personal") || Object.keys(selectedEditRequest.requestedChanges || {}).some(k => k !== "documents")) && (
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-800 text-xs tracking-wide uppercase text-sky-700 flex items-center gap-1.5">
                    <HugeiconsIcon icon={Edit02Icon} className="w-4 h-4 text-sky-600" strokeWidth={2} />
                    <span>Personal Details Comparison (Current vs Requested)</span>
                  </h3>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                          <th className="p-3.5 w-1/4">Field</th>
                          <th className="p-3.5 w-3/8 text-slate-500">Current Value</th>
                          <th className="p-3.5 w-3/8 text-slate-800">Requested New Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {[
                          { field: "First Name", key: "firstName" },
                          { field: "Last Name", key: "lastName" },
                          { field: "Mobile Number", key: "mobile" },
                          { field: "Email Address", key: "email" },
                          { field: "Home Address", key: "address" },
                          { field: "Province", key: "province" },
                          { field: "City / District", key: "city" }
                        ].map((item) => {
                          const oldVal = (selectedEditRequest.originalData as any)?.[item.key] || "-";
                          const newVal = (selectedEditRequest.requestedChanges as any)?.[item.key];
                          const hasChanged = newVal !== undefined && newVal !== oldVal;

                          return (
                            <tr key={item.key} className={hasChanged ? "bg-amber-50/40" : ""}>
                              <td className="p-3.5 font-semibold text-slate-600">{item.field}</td>
                              <td className="p-3.5 text-slate-500 line-through decoration-slate-300">{oldVal}</td>
                              <td className="p-3.5">
                                {hasChanged ? (
                                  <span className="font-bold text-[#000080] bg-blue-100/60 px-2 py-1 rounded">
                                    {newVal || "-"}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">No change</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* KYC Documents Diff Section */}
              {(selectedEditRequest.requestType?.includes("KYC") || selectedEditRequest.requestedChanges?.documents) && (
                <div className="space-y-4 pt-2">
                  <h3 className="font-bold text-slate-800 text-xs tracking-wide uppercase text-sky-700 flex items-center gap-1.5">
                    <HugeiconsIcon icon={File01Icon} className="w-4 h-4 text-sky-600" strokeWidth={2} />
                    <span>KYC Verification Documents</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { key: "nicFront", label: "National ID (Front View)" },
                      { key: "nicBack", label: "National ID (Back View)" },
                      { key: "vehicleReg", label: "Vehicle Registration (CR Book)" },
                      { key: "revenueLicense", label: "Revenue License" }
                    ].map((doc) => {
                      const newDocUrl = (selectedEditRequest.requestedChanges?.documents as any)?.[doc.key];
                      const oldDocUrl = (selectedEditRequest.originalData?.documents as any)?.[doc.key];
                      const hasNewDoc = Boolean(newDocUrl);
                      const displayUrl = getFullDocUrl(newDocUrl || oldDocUrl);

                      return (
                        <div key={doc.key} className={`border rounded-2xl p-4 flex flex-col justify-between gap-3 ${
                          hasNewDoc ? "bg-blue-50/30 border-blue-300 ring-2 ring-blue-100" : "bg-slate-50/60 border-slate-200"
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800">{doc.label}</span>
                            {hasNewDoc ? (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-300">
                                Updated Document
                              </span>
                            ) : oldDocUrl ? (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                                Existing Document
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
                                Missing
                              </span>
                            )}
                          </div>

                          <div className="w-full aspect-[4/3] bg-white rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center relative">
                            {displayUrl ? (
                              <img
                                src={displayUrl}
                                alt={doc.label}
                                onClick={() => setPreviewImage(displayUrl)}
                                className="object-cover w-full h-full hover:scale-105 transition-transform duration-300 cursor-zoom-in"
                              />
                            ) : (
                              <span className="text-xs text-slate-400 italic">No Document</span>
                            )}
                          </div>

                          {displayUrl && (
                            <button
                              onClick={() => setPreviewImage(displayUrl)}
                              className="w-full py-2 bg-white hover:bg-slate-50 border border-slate-200 text-[#0f2d3a] font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                            >
                              <HugeiconsIcon icon={ViewIcon} className="w-3.5 h-3.5 text-sky-600" strokeWidth={2} />
                              <span>View Full Size</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 flex justify-end flex-shrink-0">
              <button
                onClick={() => setSelectedEditRequest(null)}
                className="bg-[#000080] hover:bg-[#000066] text-white font-semibold text-xs px-8 py-2.5 rounded-full transition-all border-none cursor-pointer shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Lightbox Modal: Full Document Preview                    */}
      {/* ======================================================== */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none cursor-zoom-out"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl border border-white/10 shadow-2xl flex items-center justify-center bg-[#0a0a0a]/30" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewImage}
              alt="Document Full View"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white p-3 rounded-full transition-colors cursor-pointer border border-white/20 select-none shadow-md"
              aria-label="Close preview"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5 text-white" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Registration Rejection Modal                             */}
      {/* ======================================================== */}
      {regRejectModal.show && regRejectModal.reg && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5 text-red-500" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="font-semibold text-base text-slate-800 tracking-tight leading-none">
                  Reject Registration
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-1">
                  {regRejectModal.reg.firstName} {regRejectModal.reg.lastName} ({regRejectModal.reg.nic})
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-700">
                Reason for Rejection (Sent via Email):
              </label>
              <textarea
                value={regRejectModal.reason}
                onChange={(e) => setRegRejectModal({ ...regRejectModal, reason: e.target.value })}
                placeholder="e.g. Incomplete NIC documentation provided or incorrect vehicle details."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none h-24 font-medium"
              />
            </div>

            <div className="flex justify-end gap-2.5 mt-2 select-none">
              <button
                onClick={() => setRegRejectModal({ show: false, reg: null, reason: "" })}
                className="px-5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-full text-xs font-semibold transition-all cursor-pointer bg-white active:scale-95 shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const regId = regRejectModal.reg!._id;
                  const reason = regRejectModal.reason;
                  setRegRejectModal({ show: false, reg: null, reason: "" });
                  handleRegStatusUpdate(regId, "Rejected", reason);
                }}
                className="px-6 py-2 bg-[#df3d3d] hover:bg-[#c53030] active:scale-95 text-white rounded-full text-xs font-semibold shadow-md transition-all cursor-pointer border-none"
              >
                Reject Registration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Profile Edit Request Rejection Modal                     */}
      {/* ======================================================== */}
      {editRejectModal.show && editRejectModal.request && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5 text-red-500" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="font-semibold text-base text-slate-800 tracking-tight leading-none">
                  Reject Profile Update Request
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-1">
                  {editRejectModal.request.userName} ({editRejectModal.request.userNic})
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-700">
                Reason for Rejection (Included in Notification Email):
              </label>
              <textarea
                value={editRejectModal.reason}
                onChange={(e) => setEditRejectModal({ ...editRejectModal, reason: e.target.value })}
                placeholder="e.g. Uploaded document is unclear / Name does not match national registry records."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none h-24 font-medium"
              />
            </div>

            <div className="flex justify-end gap-2.5 mt-2 select-none">
              <button
                onClick={() => setEditRejectModal({ show: false, request: null, reason: "" })}
                className="px-5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-full text-xs font-semibold transition-all cursor-pointer bg-white active:scale-95 shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const reqId = editRejectModal.request!._id;
                  const reason = editRejectModal.reason;
                  setEditRejectModal({ show: false, request: null, reason: "" });
                  handleReviewEditRequest(reqId, "Reject", reason);
                }}
                className="px-6 py-2 bg-[#df3d3d] hover:bg-[#c53030] active:scale-95 text-white rounded-full text-xs font-semibold shadow-md transition-all cursor-pointer border-none"
              >
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Custom Alert / Confirmation Popup Modal                  */}
      {/* ======================================================== */}
      {customPopup.show && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3.5">
              {customPopup.type === "success" ? (
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-5 h-5 text-emerald-600" strokeWidth={2.5} />
                </div>
              ) : customPopup.type === "confirm" ? (
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                  <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5 text-amber-500" strokeWidth={2.5} />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                  <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5 text-red-500" strokeWidth={2.5} />
                </div>
              )}
              <h3 className="font-semibold text-base text-slate-800 tracking-tight leading-none">
                {customPopup.title}
              </h3>
            </div>

            <div>
              <p className="text-slate-500 text-[13px] font-semibold leading-relaxed">
                {customPopup.message}
              </p>
            </div>

            <div className="flex justify-end gap-2.5 mt-2 select-none">
              {customPopup.type === "confirm" ? (
                <>
                  <button
                    onClick={() => setCustomPopup({ ...customPopup, show: false })}
                    className="px-5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-full text-xs font-semibold transition-all cursor-pointer bg-white active:scale-95 shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setCustomPopup({ ...customPopup, show: false });
                      if (customPopup.onConfirm) customPopup.onConfirm();
                    }}
                    className="px-6 py-2 bg-[#000080] hover:bg-[#000066] active:scale-95 text-white rounded-full text-xs font-semibold shadow-md transition-all cursor-pointer border-none"
                  >
                    Confirm
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setCustomPopup({ ...customPopup, show: false })}
                  className="px-6 py-2 bg-[#000080] hover:bg-[#000066] active:scale-95 text-white rounded-full text-xs font-semibold shadow-md transition-all cursor-pointer border-none"
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
