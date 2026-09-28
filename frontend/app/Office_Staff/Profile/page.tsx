"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import OfficeStaffNavbar from "@/app/Components/Office_Staff/Navbar";
import OfficeStaffFooter from "@/app/Components/Office_Staff/Footer";
import UserAvatarDropdown from "@/app/Components/UserAvatarDropdown";
import SimpleLoader from "@/app/Components/SimpleLoader";
import { API_URL } from "@/app/config";
import { sriLankaLocations } from "@/app/utils/locations";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Building01Icon,
  Building04Icon,
  UserCircleIcon,
  UserIcon,
  Mail01Icon,
  Call02Icon,
  Location01Icon,
  Shield01Icon,
  LockPasswordIcon,
  CheckmarkCircle01Icon,
  AlertCircleIcon,
  Edit02Icon,
  ViewIcon,
  ViewOffSlashIcon,
  Loading03Icon,
  Cancel01Icon,
  ArrowRight01Icon,
  UserGroupIcon,
  Camera01Icon,
  RefreshIcon,
  Menu01Icon
} from "@hugeicons/core-free-icons";

interface BranchData {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  branch: string;
  province: string;
  district: string;
  area: string;
  location: string;
  staffCount: number;
  hotline?: string;
  managerName?: string;
  managerEmail?: string;
  managerMobile?: string;
  operatingHours?: string;
  profilePhoto?: string;
  notes?: string;
  createdAt: string;
}

interface BranchStats {
  totalPolicyHolders: number;
  totalAgents: number;
  totalClaims: number;
  activeClaims: number;
  pendingClaims: number;
}

interface UpdateRequest {
  _id: string;
  branchId: string;
  branchName: string;
  staffName: string;
  email: string;
  mobile: string;
  requestType: string;
  originalData: Record<string, any>;
  requestedChanges: Record<string, any>;
  reason?: string;
  status: "Pending" | "Approved" | "Rejected";
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function BranchProfilePage() {
  const router = useRouter();

  const [branch, setBranch] = useState<BranchData | null>(null);
  const [stats, setStats] = useState<BranchStats>({
    totalPolicyHolders: 0,
    totalAgents: 0,
    totalClaims: 0,
    activeClaims: 0,
    pendingClaims: 0
  });
  const [updateRequests, setUpdateRequests] = useState<UpdateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "edit" | "requests" | "security">("overview");

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: "",
    mobile: "",
    hotline: "",
    branch: "",
    province: "",
    district: "",
    area: "",
    location: "",
    staffCount: 1,
    managerName: "",
    managerEmail: "",
    managerMobile: "",
    operatingHours: "Mon - Fri: 8:30 AM - 5:00 PM | Sat: 8:30 AM - 1:00 PM",
    notes: "",
    reason: ""
  });
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Photo upload modal state
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Custom alert popup state
  const [popup, setPopup] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "info";
  }>({ show: false, title: "", message: "", type: "info" });

  // Format date helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${d.getDate().toString().padStart(2, "0")} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const hours = d.getHours().toString().padStart(2, "0");
      const mins = d.getMinutes().toString().padStart(2, "0");
      return `${d.getDate().toString().padStart(2, "0")} ${months[d.getMonth()]} ${d.getFullYear()}, ${hours}:${mins}`;
    } catch {
      return dateStr;
    }
  };

  // Fetch branch profile and stats
  const fetchBranchProfile = async (email: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/office-staff/profile?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load branch profile.");

      if (data.branch) {
        setBranch(data.branch);
        setPreviewPhoto(data.branch.profilePhoto || null);
        setEditForm({
          name: data.branch.name || "",
          mobile: data.branch.mobile || "",
          hotline: data.branch.hotline || "",
          branch: data.branch.branch || "",
          province: data.branch.province || "",
          district: data.branch.district || "",
          area: data.branch.area || "",
          location: data.branch.location || "",
          staffCount: data.branch.staffCount || 1,
          managerName: data.branch.managerName || "",
          managerEmail: data.branch.managerEmail || "",
          managerMobile: data.branch.managerMobile || "",
          operatingHours: data.branch.operatingHours || "Mon - Fri: 8:30 AM - 5:00 PM | Sat: 8:30 AM - 1:00 PM",
          notes: data.branch.notes || "",
          reason: ""
        });
      }

      if (data.stats) {
        setStats(data.stats);
      }

      // Fetch edit requests
      await fetchRequests(email);
    } catch (err: any) {
      console.error("Error fetching branch profile:", err);
      setPopup({
        show: true,
        title: "Profile Load Error",
        message: err.message || "Failed to load branch profile details.",
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch branch update requests
  const fetchRequests = async (email: string) => {
    try {
      const res = await fetch(`${API_URL}/office-staff/profile-update-requests?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.requests)) {
        setUpdateRequests(data.requests);
      }
    } catch (err) {
      console.error("Error fetching branch update requests:", err);
    }
  };

  useEffect(() => {
    const sessionData = sessionStorage.getItem("logged_in_staff");
    if (!sessionData) {
      router.push("/Login");
      return;
    }

    try {
      const user = JSON.parse(sessionData);
      if (user?.email) {
        fetchBranchProfile(user.email);
      } else {
        router.push("/Login");
      }
    } catch {
      router.push("/Login");
    }
  }, []);

  // Handle Profile Photo Upload
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPopup({
        show: true,
        title: "Invalid File Format",
        message: "Please select a valid image file (JPG, PNG, WEBP).",
        type: "error"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPopup({
        show: true,
        title: "File Too Large",
        message: "Image size must be less than 5MB.",
        type: "error"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewPhoto(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSavePhoto = async () => {
    if (!previewPhoto || !branch?.email) return;

    setUploadingPhoto(true);
    try {
      const res = await fetch(`${API_URL}/office-staff/profile-photo`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: branch.email,
          photo: previewPhoto
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile photo.");

      setBranch((prev) => prev ? { ...prev, profilePhoto: data.profilePhoto } : null);
      setShowPhotoModal(false);
      setPopup({
        show: true,
        title: "Photo Updated",
        message: "Branch profile photo has been updated successfully.",
        type: "success"
      });
    } catch (err: any) {
      setPopup({
        show: true,
        title: "Upload Failed",
        message: err.message || "Failed to update branch photo.",
        type: "error"
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Handle Edit Request Submission
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branch?.email) return;

    if (!editForm.name.trim()) {
      setPopup({
        show: true,
        title: "Missing Information",
        message: "Branch display name is required.",
        type: "error"
      });
      return;
    }

    if (!editForm.mobile.trim()) {
      setPopup({
        show: true,
        title: "Missing Information",
        message: "Branch mobile contact is required.",
        type: "error"
      });
      return;
    }

    const cleanMobile = editForm.mobile.replace(/[-+()\s]/g, "");
    if (!/^\d{10}$/.test(cleanMobile)) {
      setPopup({
        show: true,
        title: "Invalid Mobile Number",
        message: "Mobile number must be exactly 10 digits.",
        type: "error"
      });
      return;
    }

    if (!editForm.province || !editForm.district || !editForm.area) {
      setPopup({
        show: true,
        title: "Location Incomplete",
        message: "Please select province, district, and area.",
        type: "error"
      });
      return;
    }

    if (!editForm.location.trim()) {
      setPopup({
        show: true,
        title: "Missing Address",
        message: "Physical office location address is required.",
        type: "error"
      });
      return;
    }

    // Determine what changed
    const requestedChanges: Record<string, any> = {};
    if (editForm.name.trim() !== (branch.name || "").trim()) requestedChanges.name = editForm.name.trim();
    if (editForm.mobile.trim() !== (branch.mobile || "").trim()) requestedChanges.mobile = editForm.mobile.trim();
    if (editForm.hotline.trim() !== (branch.hotline || "").trim()) requestedChanges.hotline = editForm.hotline.trim();
    if (editForm.branch.trim() !== (branch.branch || "").trim()) requestedChanges.branch = editForm.branch.trim();
    if (editForm.province.trim() !== (branch.province || "").trim()) requestedChanges.province = editForm.province.trim();
    if (editForm.district.trim() !== (branch.district || "").trim()) requestedChanges.district = editForm.district.trim();
    if (editForm.area.trim() !== (branch.area || "").trim()) requestedChanges.area = editForm.area.trim();
    if (editForm.location.trim() !== (branch.location || "").trim()) requestedChanges.location = editForm.location.trim();
    if (Number(editForm.staffCount) !== Number(branch.staffCount)) requestedChanges.staffCount = Number(editForm.staffCount);
    if (editForm.managerName.trim() !== (branch.managerName || "").trim()) requestedChanges.managerName = editForm.managerName.trim();
    if (editForm.managerEmail.trim() !== (branch.managerEmail || "").trim()) requestedChanges.managerEmail = editForm.managerEmail.trim();
    if (editForm.managerMobile.trim() !== (branch.managerMobile || "").trim()) requestedChanges.managerMobile = editForm.managerMobile.trim();
    if (editForm.operatingHours.trim() !== (branch.operatingHours || "").trim()) requestedChanges.operatingHours = editForm.operatingHours.trim();
    if (editForm.notes.trim() !== (branch.notes || "").trim()) requestedChanges.notes = editForm.notes.trim();

    if (Object.keys(requestedChanges).length === 0) {
      setPopup({
        show: true,
        title: "No Changes Detected",
        message: "You haven't made any modifications to the current branch profile.",
        type: "info"
      });
      return;
    }

    setSubmittingRequest(true);
    try {
      const res = await fetch(`${API_URL}/office-staff/profile-update-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: branch.email,
          requestType: "Branch Details",
          requestedChanges,
          reason: editForm.reason
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit request.");

      setPopup({
        show: true,
        title: "Request Submitted to Admin",
        message: "Your profile update request has been successfully submitted to Head Office Administration for review.",
        type: "success"
      });

      // Refresh requests list
      await fetchRequests(branch.email);
      setActiveTab("requests");
    } catch (err: any) {
      setPopup({
        show: true,
        title: "Submission Error",
        message: err.message || "Failed to submit update request.",
        type: "error"
      });
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Handle Password Change
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branch?.email) return;

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPopup({
        show: true,
        title: "Missing Fields",
        message: "Please fill in all password fields.",
        type: "error"
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPopup({
        show: true,
        title: "Password Mismatch",
        message: "New password and confirmation password do not match.",
        type: "error"
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPopup({
        show: true,
        title: "Weak Password",
        message: "New password must be at least 6 characters long.",
        type: "error"
      });
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch(`${API_URL}/office-staff/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: branch.email,
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change password.");

      setPopup({
        show: true,
        title: "Password Updated",
        message: "Your branch account password has been changed successfully.",
        type: "success"
      });

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    } catch (err: any) {
      setPopup({
        show: true,
        title: "Password Update Failed",
        message: err.message || "Failed to change password. Please check your current password.",
        type: "error"
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const pendingRequest = updateRequests.find((r) => r.status === "Pending");

  // Location helpers for dynamic dropdowns
  const availableDistricts = editForm.province && sriLankaLocations[editForm.province]
    ? Object.keys(sriLankaLocations[editForm.province])
    : [];

  const availableAreas = editForm.province && editForm.district && sriLankaLocations[editForm.province]?.[editForm.district]
    ? sriLankaLocations[editForm.province][editForm.district]
    : [];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
      <div className="flex flex-1 flex-row min-h-0">
        <OfficeStaffNavbar />

        <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
          {/* Header */}
          <header className="bg-white border-b border-slate-100 text-slate-800 px-8 py-4 flex justify-between items-center select-none shadow-sm shrink-0 h-[80px] sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("open-mobile-menu"))}
                className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 active:scale-95 transition-all cursor-pointer focus:outline-none"
                aria-label="Toggle menu"
              >
                <HugeiconsIcon icon={Menu01Icon} className="w-6 h-6" strokeWidth={2.5} />
              </button>
              <h1 className="lg:hidden text-lg font-semibold text-slate-800 tracking-tight">
                Branch Profile
              </h1>
              <h1 className="hidden lg:flex text-xl font-semibold text-slate-800 items-center gap-2 pl-2 lg:pl-0 truncate">
                <span className="bg-[#102A43] text-white text-base px-4 py-2 rounded-xl font-semibold shadow-sm tracking-wide">
                  Office Staff Portal
                </span>
                <span className="hidden lg:inline"> — Branch Profile & Operations</span>
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-800 text-xs font-semibold px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                <span>{branch?.branch ? `${branch.branch} Branch` : "Branch Staff"}</span>
              </div>
              <UserAvatarDropdown userType="office_staff" />
            </div>
          </header>

          <main className="flex-1 p-6 lg:p-8 bg-slate-50 flex flex-col gap-6">
            {loading ? (
              <SimpleLoader message="Loading branch profile..." theme="blue" />
            ) : !branch ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 font-semibold shadow-sm">
                Branch profile not found. Please log in again.
              </div>
            ) : (
              <>
                {/* Pending Request Alert Banner */}
                {pendingRequest && (
                  <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <HugeiconsIcon icon={AlertCircleIcon} className="w-5 h-5 animate-pulse" strokeWidth={2.5} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-amber-900">
                            Profile Edit Request Awaiting Head Office Approval
                          </h4>
                          <span className="bg-amber-200 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Pending Review
                          </span>
                        </div>
                        <p className="text-xs text-amber-700 mt-0.5">
                          Submitted on {formatDateTime(pendingRequest.createdAt)}. The requested updates will reflect on your profile once authorized by Admin.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab("requests")}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 flex items-center gap-1.5"
                    >
                      <span>View Request Details</span>
                      <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </button>
                  </div>
                )}

                {/* Hero / Profile Header Card */}
                <div className="bg-gradient-to-br from-[#102A43] via-[#163859] to-[#0b1e31] rounded-3xl p-6 lg:p-8 text-white shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
                  <div className="absolute bottom-0 left-1/3 -mb-12 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>

                  <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                      {/* Branch Photo */}
                      <div className="relative group">
                        <div className="w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-md border-2 border-white/20 p-1 shadow-inner flex items-center justify-center overflow-hidden">
                          {branch.profilePhoto ? (
                            <img
                              src={branch.profilePhoto}
                              alt={branch.name}
                              className="w-full h-full object-cover rounded-xl"
                            />
                          ) : (
                            <HugeiconsIcon icon={Building01Icon} className="w-12 h-12 text-cyan-400" strokeWidth={1.8} />
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setPreviewPhoto(branch.profilePhoto || null);
                            setShowPhotoModal(true);
                          }}
                          className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-cyan-500 hover:bg-cyan-400 text-[#102A43] flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95"
                          title="Change Branch Photo"
                        >
                          <HugeiconsIcon icon={Camera01Icon} className="w-4 h-4 font-bold" strokeWidth={2.5} />
                        </button>
                      </div>

                      {/* Branch Title & Tags */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">
                            {branch.name}
                          </h2>
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-semibold px-3 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            Active Branch
                          </span>
                        </div>

                        <p className="text-sm text-slate-300 flex flex-wrap items-center gap-4">
                          <span className="flex items-center gap-1.5">
                            <HugeiconsIcon icon={Building04Icon} className="w-4 h-4 text-cyan-400" strokeWidth={2} />
                            Branch Code: <strong className="text-white">SAN-BR-{branch.branch.toUpperCase()}</strong>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <HugeiconsIcon icon={Location01Icon} className="w-4 h-4 text-cyan-400" strokeWidth={2} />
                            {branch.district} District, {branch.province}
                          </span>
                        </p>

                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="bg-white/10 text-slate-200 text-xs px-3 py-1 rounded-lg border border-white/10 flex items-center gap-1.5">
                            <HugeiconsIcon icon={Mail01Icon} className="w-3.5 h-3.5 text-cyan-300" strokeWidth={2} />
                            {branch.email}
                          </span>
                          <span className="bg-white/10 text-slate-200 text-xs px-3 py-1 rounded-lg border border-white/10 flex items-center gap-1.5">
                            <HugeiconsIcon icon={Call02Icon} className="w-3.5 h-3.5 text-cyan-300" strokeWidth={2} />
                            {branch.mobile}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action button */}
                    <div className="flex items-center gap-3 self-stretch md:self-auto justify-end">
                      <button
                        onClick={() => setActiveTab("edit")}
                        className="flex-1 md:flex-none px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                      >
                        <HugeiconsIcon icon={Edit02Icon} className="w-4 h-4" strokeWidth={2.5} />
                        <span>Request Profile Edit</span>
                      </button>
                    </div>
                  </div>

                  {/* 4 KPIs Summary Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-white/10">
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10 flex flex-col">
                      <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                        Assigned Agents
                      </span>
                      <span className="text-xl font-bold text-white mt-1">
                        {stats.totalAgents}
                      </span>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10 flex flex-col">
                      <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                        Registered Policyholders
                      </span>
                      <span className="text-xl font-bold text-white mt-1">
                        {stats.totalPolicyHolders}
                      </span>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10 flex flex-col">
                      <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                        Branch Staff Count
                      </span>
                      <span className="text-xl font-bold text-cyan-300 mt-1">
                        {branch.staffCount}
                      </span>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10 flex flex-col">
                      <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                        Active Claims
                      </span>
                      <span className="text-xl font-bold text-amber-300 mt-1">
                        {stats.activeClaims} <span className="text-xs text-slate-400 font-normal">/ {stats.totalClaims} Total</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-slate-200 bg-white px-6 rounded-2xl shadow-sm overflow-x-auto select-none">
                  <button
                    onClick={() => setActiveTab("overview")}
                    className={`py-4 px-5 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                      activeTab === "overview"
                        ? "border-[#102A43] text-[#102A43]"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <HugeiconsIcon icon={Building01Icon} className="w-4 h-4" strokeWidth={2} />
                    <span>Branch Overview</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("edit")}
                    className={`py-4 px-5 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                      activeTab === "edit"
                        ? "border-[#102A43] text-[#102A43]"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <HugeiconsIcon icon={Edit02Icon} className="w-4 h-4" strokeWidth={2} />
                    <span>Edit Profile / Request Changes</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("requests")}
                    className={`py-4 px-5 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap relative ${
                      activeTab === "requests"
                        ? "border-[#102A43] text-[#102A43]"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <HugeiconsIcon icon={Shield01Icon} className="w-4 h-4" strokeWidth={2} />
                    <span>Request History</span>
                    {pendingRequest && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTab("security")}
                    className={`py-4 px-5 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                      activeTab === "security"
                        ? "border-[#102A43] text-[#102A43]"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <HugeiconsIcon icon={LockPasswordIcon} className="w-4 h-4" strokeWidth={2} />
                    <span>Security & Password</span>
                  </button>
                </div>

                {/* TAB 1: OVERVIEW */}
                {activeTab === "overview" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* General Branch Identity */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col gap-4">
                      <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                        <HugeiconsIcon icon={Building01Icon} className="w-5 h-5 text-[#102A43]" strokeWidth={2.2} />
                        <h3 className="text-base font-bold text-slate-800">Branch Details & Location</h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                            Branch Official Name
                          </span>
                          <span className="text-slate-800 font-bold text-sm mt-0.5 block">
                            {branch.name}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                            Branch ID Code
                          </span>
                          <span className="text-slate-800 font-bold text-sm mt-0.5 block">
                            {branch.branch}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                            Province
                          </span>
                          <span className="text-slate-800 font-bold text-sm mt-0.5 block">
                            {branch.province}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                            District
                          </span>
                          <span className="text-slate-800 font-bold text-sm mt-0.5 block">
                            {branch.district}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 sm:col-span-2">
                          <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                            Service Area / Town
                          </span>
                          <span className="text-slate-800 font-bold text-sm mt-0.5 block">
                            {branch.area}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 sm:col-span-2">
                          <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                            Physical Office Address
                          </span>
                          <span className="text-slate-800 font-bold text-sm mt-0.5 block">
                            {branch.location}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Operational Details & Management */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col gap-4">
                      <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                        <HugeiconsIcon icon={UserGroupIcon} className="w-5 h-5 text-[#102A43]" strokeWidth={2.2} />
                        <h3 className="text-base font-bold text-slate-800">Management & Operating Hours</h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                            Branch Staff Headcount
                          </span>
                          <span className="text-slate-800 font-bold text-sm mt-0.5 block">
                            {branch.staffCount} Dedicated Members
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                            Branch Hotline / Landline
                          </span>
                          <span className="text-slate-800 font-bold text-sm mt-0.5 block">
                            {branch.hotline || "Not specified"}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 sm:col-span-2">
                          <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                            Branch Manager
                          </span>
                          <span className="text-slate-800 font-bold text-sm mt-0.5 block">
                            {branch.managerName || "Designated Branch Officer"}
                          </span>
                          {branch.managerEmail && (
                            <span className="text-slate-500 text-xs block mt-0.5">
                              Email: {branch.managerEmail}
                            </span>
                          )}
                          {branch.managerMobile && (
                            <span className="text-slate-500 text-xs block mt-0.5">
                              Mobile: {branch.managerMobile}
                            </span>
                          )}
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 sm:col-span-2">
                          <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                            Operating Hours
                          </span>
                          <span className="text-slate-800 font-bold text-sm mt-0.5 block">
                            {branch.operatingHours || "Mon - Fri: 8:30 AM - 5:00 PM | Sat: 8:30 AM - 1:00 PM"}
                          </span>
                        </div>

                        {branch.notes && (
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 sm:col-span-2">
                            <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">
                              Branch Notes & Notices
                            </span>
                            <span className="text-slate-700 text-xs mt-0.5 block leading-relaxed">
                              {branch.notes}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: EDIT PROFILE / REQUEST CHANGES */}
                {activeTab === "edit" && (
                  <div className="bg-white rounded-2xl p-6 lg:p-8 border border-slate-200/80 shadow-sm flex flex-col gap-6">
                    {/* Notice */}
                    <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-3">
                      <HugeiconsIcon icon={AlertCircleIcon} className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" strokeWidth={2.2} />
                      <div className="text-xs text-blue-800 leading-relaxed">
                        <strong className="font-bold">Administrative Approval Process: </strong>
                        To maintain organizational integrity and statutory insurance compliance, modifications to branch profiles, official locations, and contact records are submitted to the Head Office Admin team for verification and authorization.
                      </div>
                    </div>

                    <form onSubmit={handleEditSubmit} className="flex flex-col gap-6">
                      {/* Section 1: Official Branch Information */}
                      <div className="flex flex-col gap-4">
                        <h4 className="text-sm font-bold text-slate-800 pb-2 border-b border-slate-100">
                          1. Branch Identity & Contact Numbers
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">
                              Branch Display Name *
                            </label>
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              placeholder="e.g. Galle Main Branch"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#102A43]/20 focus:border-[#102A43] transition-all bg-slate-50/50"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">
                              Branch Identifier (Branch Code) *
                            </label>
                            <input
                              type="text"
                              value={editForm.branch}
                              onChange={(e) => setEditForm({ ...editForm, branch: e.target.value })}
                              placeholder="e.g. Galle"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#102A43]/20 focus:border-[#102A43] transition-all bg-slate-50/50"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">
                              Primary Contact Mobile Number (10 Digits) *
                            </label>
                            <input
                              type="tel"
                              value={editForm.mobile}
                              onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                              placeholder="e.g. 0768088176"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#102A43]/20 focus:border-[#102A43] transition-all bg-slate-50/50"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">
                              Branch Hotline / Landline
                            </label>
                            <input
                              type="tel"
                              value={editForm.hotline}
                              onChange={(e) => setEditForm({ ...editForm, hotline: e.target.value })}
                              placeholder="e.g. 0912234567"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#102A43]/20 focus:border-[#102A43] transition-all bg-slate-50/50"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Regional & Physical Location */}
                      <div className="flex flex-col gap-4">
                        <h4 className="text-sm font-bold text-slate-800 pb-2 border-b border-slate-100">
                          2. Region, District & Physical Office Address
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">
                              Province *
                            </label>
                            <select
                              value={editForm.province}
                              onChange={(e) => {
                                const prov = e.target.value;
                                const defaultDist = sriLankaLocations[prov] ? Object.keys(sriLankaLocations[prov])[0] || "" : "";
                                const defaultArea = prov && defaultDist && sriLankaLocations[prov]?.[defaultDist] ? sriLankaLocations[prov][defaultDist][0] || "" : "";
                                setEditForm({
                                  ...editForm,
                                  province: prov,
                                  district: defaultDist,
                                  area: defaultArea
                                });
                              }}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#102A43]/20 focus:border-[#102A43] transition-all bg-slate-50/50"
                              required
                            >
                              <option value="">Select Province</option>
                              {Object.keys(sriLankaLocations).map((p) => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">
                              District *
                            </label>
                            <select
                              value={editForm.district}
                              onChange={(e) => {
                                const dist = e.target.value;
                                const defaultArea = editForm.province && dist && sriLankaLocations[editForm.province]?.[dist] ? sriLankaLocations[editForm.province][dist][0] || "" : "";
                                setEditForm({
                                  ...editForm,
                                  district: dist,
                                  area: defaultArea
                                });
                              }}
                              disabled={!editForm.province}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#102A43]/20 focus:border-[#102A43] transition-all bg-slate-50/50 disabled:bg-slate-100"
                              required
                            >
                              <option value="">Select District</option>
                              {availableDistricts.map((d) => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">
                              Area / Sub-Town *
                            </label>
                            <select
                              value={editForm.area}
                              onChange={(e) => setEditForm({ ...editForm, area: e.target.value })}
                              disabled={!editForm.district}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#102A43]/20 focus:border-[#102A43] transition-all bg-slate-50/50 disabled:bg-slate-100"
                              required
                            >
                              <option value="">Select Area</option>
                              {availableAreas.map((a) => (
                                <option key={a} value={a}>{a}</option>
                              ))}
                            </select>
                          </div>

                          <div className="sm:col-span-3">
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">
                              Full Physical Location / Street Address *
                            </label>
                            <input
                              type="text"
                              value={editForm.location}
                              onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                              placeholder="e.g. No. 45, Old Foods Market, Main Street, Galle"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#102A43]/20 focus:border-[#102A43] transition-all bg-slate-50/50"
                              required
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Staff & Operations Management */}
                      <div className="flex flex-col gap-4">
                        <h4 className="text-sm font-bold text-slate-800 pb-2 border-b border-slate-100">
                          3. Staff Headcount & Branch Manager Details
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">
                              Staff Headcount *
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={editForm.staffCount}
                              onChange={(e) => setEditForm({ ...editForm, staffCount: Number(e.target.value) })}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#102A43]/20 focus:border-[#102A43] transition-all bg-slate-50/50"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">
                              Branch Manager Name
                            </label>
                            <input
                              type="text"
                              value={editForm.managerName}
                              onChange={(e) => setEditForm({ ...editForm, managerName: e.target.value })}
                              placeholder="e.g. Kasun Perera"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#102A43]/20 focus:border-[#102A43] transition-all bg-slate-50/50"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">
                              Manager Mobile Contact
                            </label>
                            <input
                              type="tel"
                              value={editForm.managerMobile}
                              onChange={(e) => setEditForm({ ...editForm, managerMobile: e.target.value })}
                              placeholder="e.g. 0712345678"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#102A43]/20 focus:border-[#102A43] transition-all bg-slate-50/50"
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">
                              Operating Hours & Schedule
                            </label>
                            <input
                              type="text"
                              value={editForm.operatingHours}
                              onChange={(e) => setEditForm({ ...editForm, operatingHours: e.target.value })}
                              placeholder="e.g. Mon - Fri: 8:30 AM - 5:00 PM | Sat: 8:30 AM - 1:00 PM"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#102A43]/20 focus:border-[#102A43] transition-all bg-slate-50/50"
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">
                              Branch Description / Public Notice
                            </label>
                            <textarea
                              rows={2}
                              value={editForm.notes}
                              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                              placeholder="e.g. Full claim intake and vehicle physical inspection center with 24/7 hotline support."
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#102A43]/20 focus:border-[#102A43] transition-all bg-slate-50/50"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 4: Justification for Admin Review */}
                      <div className="flex flex-col gap-4">
                        <h4 className="text-sm font-bold text-slate-800 pb-2 border-b border-slate-100">
                          4. Reason for Modification Request
                        </h4>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">
                            Reason / Remarks for Head Office Administration
                          </label>
                          <textarea
                            rows={3}
                            value={editForm.reason}
                            onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                            placeholder="Briefly explain the reason for this edit (e.g. 'Branch office relocated to new commercial complex', 'Updated staff headcount following new recruitments', 'New branch manager appointed')."
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#102A43]/20 focus:border-[#102A43] transition-all bg-slate-50/50"
                          />
                        </div>
                      </div>

                      {/* Submit button bar */}
                      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            if (branch) {
                              setEditForm({
                                name: branch.name || "",
                                mobile: branch.mobile || "",
                                hotline: branch.hotline || "",
                                branch: branch.branch || "",
                                province: branch.province || "",
                                district: branch.district || "",
                                area: branch.area || "",
                                location: branch.location || "",
                                staffCount: branch.staffCount || 1,
                                managerName: branch.managerName || "",
                                managerEmail: branch.managerEmail || "",
                                managerMobile: branch.managerMobile || "",
                                operatingHours: branch.operatingHours || "Mon - Fri: 8:30 AM - 5:00 PM | Sat: 8:30 AM - 1:00 PM",
                                notes: branch.notes || "",
                                reason: ""
                              });
                            }
                          }}
                          className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                        >
                          Reset Form
                        </button>

                        <button
                          type="submit"
                          disabled={submittingRequest}
                          className="px-6 py-2.5 bg-[#102A43] hover:bg-[#163859] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                          {submittingRequest ? (
                            <>
                              <HugeiconsIcon icon={Loading03Icon} className="w-4 h-4 animate-spin" />
                              <span>Submitting to Admin...</span>
                            </>
                          ) : (
                            <>
                              <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4" strokeWidth={2.5} />
                              <span>Submit Request to Head Office</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* TAB 3: REQUEST HISTORY */}
                {activeTab === "requests" && (
                  <div className="bg-white rounded-2xl p-6 lg:p-8 border border-slate-200/80 shadow-sm flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-slate-800">
                          Profile Update Request History
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Track status and administrative review decisions for branch modifications.
                        </p>
                      </div>
                      <button
                        onClick={() => branch?.email && fetchRequests(branch.email)}
                        className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
                        title="Refresh"
                      >
                        <HugeiconsIcon icon={RefreshIcon} className="w-4 h-4" strokeWidth={2.5} />
                      </button>
                    </div>

                    {updateRequests.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 font-semibold border-2 border-dashed border-slate-200 rounded-2xl">
                        No update requests submitted yet. Any edit requests you submit will appear here.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {updateRequests.map((req) => (
                          <div
                            key={req._id}
                            className={`p-5 rounded-2xl border transition-all ${
                              req.status === "Pending"
                                ? "bg-amber-50/40 border-amber-200 shadow-sm"
                                : req.status === "Approved"
                                ? "bg-emerald-50/30 border-emerald-200"
                                : "bg-rose-50/30 border-rose-200"
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60">
                              <div className="flex items-center gap-3">
                                <span
                                  className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                                    req.status === "Pending"
                                      ? "bg-amber-100 text-amber-800 border border-amber-300 animate-pulse"
                                      : req.status === "Approved"
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                      : "bg-rose-100 text-rose-800 border border-rose-300"
                                  }`}
                                >
                                  {req.status}
                                </span>
                                <span className="text-xs font-bold text-slate-700">
                                  {req.requestType}
                                </span>
                              </div>
                              <span className="text-[11px] font-semibold text-slate-400">
                                Submitted on {formatDateTime(req.createdAt)}
                              </span>
                            </div>

                            {/* Changes diff */}
                            <div className="mt-4 flex flex-col gap-2">
                              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                Requested Modifications:
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                {Object.entries(req.requestedChanges || {}).map(([key, val]) => (
                                  <div key={key} className="p-2.5 bg-white rounded-xl border border-slate-200 flex flex-col">
                                    <span className="text-[10px] font-semibold text-slate-400 capitalize">
                                      {key.replace(/([A-Z])/g, " $1")}
                                    </span>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-slate-400 line-through text-[11px] truncate">
                                        {String(req.originalData?.[key] || "Empty")}
                                      </span>
                                      <span className="text-slate-400">→</span>
                                      <span className="text-emerald-700 font-bold truncate">
                                        {String(val || "Empty")}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Reason */}
                            {req.reason && (
                              <div className="mt-3 p-3 bg-white/80 rounded-xl border border-slate-200 text-xs text-slate-600">
                                <strong className="font-semibold text-slate-700">Branch Note: </strong>
                                {req.reason}
                              </div>
                            )}

                            {/* Review decision note */}
                            {req.status !== "Pending" && (
                              <div className="mt-3 pt-3 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                <span className="text-slate-600">
                                  <strong className="font-semibold">Admin Remarks: </strong>
                                  {req.reviewNote || "Reviewed by Head Office Admin."}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  Reviewed by {req.reviewedBy || "Admin"} on {formatDateTime(req.reviewedAt)}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: SECURITY & PASSWORD */}
                {activeTab === "security" && (
                  <div className="bg-white rounded-2xl p-6 lg:p-8 border border-slate-200/80 shadow-sm flex flex-col gap-6 max-w-2xl">
                    <div>
                      <h3 className="text-base font-bold text-slate-800">
                        Branch Account Password & Security
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Ensure branch staff credentials remain protected with a strong, secure password.
                      </p>
                    </div>

                    <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">
                          Current Password *
                        </label>
                        <div className="relative">
                          <input
                            type={showCurrentPw ? "text" : "password"}
                            value={passwordForm.currentPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                            placeholder="Enter current branch password"
                            className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#102A43]/20 focus:border-[#102A43] transition-all bg-slate-50/50"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPw(!showCurrentPw)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <HugeiconsIcon icon={showCurrentPw ? ViewOffSlashIcon : ViewIcon} className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">
                          New Password *
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPw ? "text" : "password"}
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                            placeholder="Enter new strong password"
                            className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#102A43]/20 focus:border-[#102A43] transition-all bg-slate-50/50"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPw(!showNewPw)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <HugeiconsIcon icon={showNewPw ? ViewOffSlashIcon : ViewIcon} className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">
                          Confirm New Password *
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPw ? "text" : "password"}
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                            placeholder="Re-enter new password"
                            className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#102A43]/20 focus:border-[#102A43] transition-all bg-slate-50/50"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPw(!showConfirmPw)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <HugeiconsIcon icon={showConfirmPw ? ViewOffSlashIcon : ViewIcon} className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={changingPassword}
                          className="px-6 py-2.5 bg-[#102A43] hover:bg-[#163859] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                          {changingPassword ? (
                            <>
                              <HugeiconsIcon icon={Loading03Icon} className="w-4 h-4 animate-spin" />
                              <span>Updating Password...</span>
                            </>
                          ) : (
                            <>
                              <HugeiconsIcon icon={LockPasswordIcon} className="w-4 h-4" strokeWidth={2.5} />
                              <span>Update Password</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </>
            )}
          </main>

          <OfficeStaffFooter />
        </div>
      </div>

      {/* Photo Upload Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">
                Update Branch Photo
              </h3>
              <button
                onClick={() => setShowPhotoModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="w-36 h-36 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
                {previewPhoto ? (
                  <img src={previewPhoto} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <HugeiconsIcon icon={Building01Icon} className="w-12 h-12 text-slate-400" />
                )}
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoSelect}
                accept="image/*"
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Choose Image File
              </button>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPhotoModal(false)}
                className="px-4 py-2 text-slate-600 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePhoto}
                disabled={uploadingPhoto || !previewPhoto}
                className="px-5 py-2 bg-[#102A43] hover:bg-[#163859] text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
              >
                {uploadingPhoto ? (
                  <>
                    <HugeiconsIcon icon={Loading03Icon} className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Photo</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert / Success / Error Popup */}
      {popup.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col items-center text-center gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                popup.type === "success"
                  ? "bg-emerald-100 text-emerald-600"
                  : popup.type === "error"
                  ? "bg-rose-100 text-rose-600"
                  : "bg-blue-100 text-blue-600"
              }`}
            >
              <HugeiconsIcon
                icon={
                  popup.type === "success"
                    ? CheckmarkCircle01Icon
                    : popup.type === "error"
                    ? AlertCircleIcon
                    : Shield01Icon
                }
                className="w-6 h-6"
                strokeWidth={2.5}
              />
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-slate-800">{popup.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{popup.message}</p>
            </div>

            <button
              onClick={() => setPopup({ ...popup, show: false })}
              className="w-full py-2.5 bg-[#102A43] hover:bg-[#163859] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
