"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PolicyHolderNavbar from "@/app/Components/Policy_Holder/Navbar";
import PolicyHolderFooter from "@/app/Components/Policy_Holder/footer";
import { API_URL } from "@/app/config";
import { sriLankaBanks } from "@/app/utils/banks";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserCircleIcon,
  UserIcon,
  Camera01Icon,
  Mail01Icon,
  Call02Icon,
  Location01Icon,
  Shield01Icon,
  Car01Icon,
  CreditCardIcon,
  File01Icon,
  LockPasswordIcon,
  CheckmarkCircle01Icon,
  Alert02Icon,
  Edit02Icon,
  Download01Icon,
  ViewIcon,
  Loading03Icon,
  Cancel01Icon,
  ArrowRight01Icon,
  CheckmarkBadge01Icon
} from "@hugeicons/core-free-icons";

function formatNumberPlate(plate: string): string {
  if (!plate) return "-";
  const cleaned = plate.trim();
  if (cleaned.includes("-")) return cleaned;
  const lastNumbersMatch = cleaned.match(/^(.*[A-Za-z]+)(\d+)$/);
  if (lastNumbersMatch) {
    return `${lastNumbersMatch[1].trim().toUpperCase()}-${lastNumbersMatch[2]}`;
  }
  return cleaned;
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
};

const SRI_LANKA_PROVINCES = [
  "Western Province",
  "Central Province",
  "Southern Province",
  "Northern Province",
  "Eastern Province",
  "North Western Province",
  "North Central Province",
  "Uva Province",
  "Sabaragamuwa Province"
];

export default function PolicyHolderProfile() {
  const router = useRouter();

  // User session state
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"personal" | "vehicles" | "bank" | "documents" | "security">("personal");

  // Edit Mode state for Personal info
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [personalForm, setPersonalForm] = useState({
    firstName: "",
    lastName: "",
    mobile: "",
    email: "",
    address: "",
    province: "",
    city: ""
  });

  // Edit Mode state for Bank info
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [bankForm, setBankForm] = useState({
    bankName: "",
    branchName: "",
    accountNumber: "",
    accountHolderName: ""
  });

  // Photo upload states
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Security / Change Password states
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [changingPassword, setChangingPassword] = useState(false);

  // Document preview modal
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);

  // Saving states & popups
  const [saving, setSaving] = useState(false);
  const [popup, setPopup] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "alert";
  }>({ show: false, title: "", message: "", type: "success" });

  // Initial Load & Auth Check
  useEffect(() => {
    if (typeof window !== "undefined") {
      const userStr = sessionStorage.getItem("logged_in_user");
      if (!userStr) {
        router.push("/Login");
        return;
      }
      try {
        const parsed = JSON.parse(userStr);
        setUser(parsed);
        initForms(parsed);
        fetchFreshProfile(parsed.nic);
      } catch (e) {
        console.error("Error parsing logged_in_user session", e);
        router.push("/Login");
      }
    }
  }, [router]);

  const initForms = (u: any) => {
    setPersonalForm({
      firstName: u.firstName || "",
      lastName: u.lastName || "",
      mobile: u.mobile || "",
      email: u.email || "",
      address: u.address || "",
      province: u.province || "",
      city: u.city || ""
    });
    setBankForm({
      bankName: u.bankDetails?.bankName || "",
      branchName: u.bankDetails?.branchName || "",
      accountNumber: u.bankDetails?.accountNumber || "",
      accountHolderName: u.bankDetails?.accountHolderName || `${u.firstName || ""} ${u.lastName || ""}`.trim()
    });
    if (u.profilePhoto) {
      setPreviewPhoto(u.profilePhoto);
    }
  };

  const fetchFreshProfile = async (nic: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/policy-holder/profile?nic=${encodeURIComponent(nic)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          initForms(data.user);
          sessionStorage.setItem("logged_in_user", JSON.stringify(data.user));
          window.dispatchEvent(new Event("user-profile-updated"));
        }
      }
    } catch (e) {
      console.error("Failed to fetch fresh profile:", e);
    } finally {
      setLoading(false);
    }
  };

  // Profile Photo Upload Handlers
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPopup({
        show: true,
        title: "Invalid File Format",
        message: "Please select an image file (PNG, JPG, or WEBP).",
        type: "error"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPopup({
        show: true,
        title: "File Too Large",
        message: "Profile image size should be less than 5MB.",
        type: "error"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setPreviewPhoto(base64);
      await saveProfilePhoto(base64);
    };
    reader.readAsDataURL(file);
  };

  const saveProfilePhoto = async (base64Photo: string) => {
    if (!user?.nic) return;
    setUploadingPhoto(true);
    try {
      const res = await fetch(`${API_URL}/policy-holder/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nic: user.nic,
          profilePhoto: base64Photo
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile photo.");
      }

      const updatedUser = { ...user, ...data.user, profilePhoto: data.user.profilePhoto || base64Photo };
      setUser(updatedUser);
      sessionStorage.setItem("logged_in_user", JSON.stringify(updatedUser));
      window.dispatchEvent(new Event("user-profile-updated"));

      setPopup({
        show: true,
        title: "Photo Updated",
        message: "Your profile photo has been successfully updated.",
        type: "success"
      });
    } catch (err: any) {
      console.error("Error saving photo:", err);
      setPopup({
        show: true,
        title: "Upload Failed",
        message: err.message || "Failed to update photo. Please try again.",
        type: "error"
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!user?.nic) return;
    setUploadingPhoto(true);
    try {
      const res = await fetch(`${API_URL}/policy-holder/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nic: user.nic,
          profilePhoto: ""
        })
      });

      if (!res.ok) throw new Error("Failed to remove profile photo.");

      setPreviewPhoto(null);
      const updatedUser = { ...user, profilePhoto: "" };
      setUser(updatedUser);
      sessionStorage.setItem("logged_in_user", JSON.stringify(updatedUser));
      window.dispatchEvent(new Event("user-profile-updated"));

      setPopup({
        show: true,
        title: "Photo Removed",
        message: "Your profile photo has been removed.",
        type: "success"
      });
    } catch (err: any) {
      setPopup({
        show: true,
        title: "Error",
        message: err.message || "Failed to remove photo.",
        type: "error"
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Save Personal Details Handler
  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.nic) return;

    if (!personalForm.mobile.trim()) {
      setPopup({ show: true, title: "Validation Error", message: "Mobile number is required.", type: "error" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/policy-holder/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nic: user.nic,
          firstName: personalForm.firstName.trim(),
          lastName: personalForm.lastName.trim(),
          mobile: personalForm.mobile.trim(),
          email: personalForm.email.trim(),
          address: personalForm.address.trim(),
          province: personalForm.province.trim(),
          city: personalForm.city.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update personal details.");

      const updatedUser = { ...user, ...data.user };
      setUser(updatedUser);
      sessionStorage.setItem("logged_in_user", JSON.stringify(updatedUser));
      window.dispatchEvent(new Event("user-profile-updated"));
      setIsEditingPersonal(false);

      setPopup({
        show: true,
        title: "Profile Updated",
        message: "Your personal and contact information has been updated.",
        type: "success"
      });
    } catch (err: any) {
      setPopup({
        show: true,
        title: "Update Failed",
        message: err.message || "Could not update information.",
        type: "error"
      });
    } finally {
      setSaving(false);
    }
  };

  // Save Bank Details Handler
  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.nic) return;

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/policy-holder/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nic: user.nic,
          bankDetails: bankForm
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update bank details.");

      const updatedUser = { ...user, ...data.user };
      setUser(updatedUser);
      sessionStorage.setItem("logged_in_user", JSON.stringify(updatedUser));
      window.dispatchEvent(new Event("user-profile-updated"));
      setIsEditingBank(false);

      setPopup({
        show: true,
        title: "Bank Details Updated",
        message: "Your direct reimbursement bank account details have been saved.",
        type: "success"
      });
    } catch (err: any) {
      setPopup({
        show: true,
        title: "Update Failed",
        message: err.message || "Could not update bank details.",
        type: "error"
      });
    } finally {
      setSaving(false);
    }
  };

  // Change Password Handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.nic) return;

    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      setPopup({
        show: true,
        title: "Invalid Password",
        message: "New password must be at least 6 characters long.",
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

    setChangingPassword(true);
    try {
      const res = await fetch(`${API_URL}/policy-holder/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nic: user.nic,
          newPassword: passwordForm.newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password.");

      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPopup({
        show: true,
        title: "Password Changed",
        message: "Your login security credentials have been updated successfully.",
        type: "success"
      });
    } catch (err: any) {
      setPopup({
        show: true,
        title: "Password Change Failed",
        message: err.message || "Could not change password.",
        type: "error"
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const getFullImageUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
    return `http://localhost:5000${url.startsWith('/') ? '' : '/'}${url}`;
  };

  if (!user && loading) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
        <PolicyHolderNavbar />
        <div className="flex-1 flex flex-col items-center justify-center py-24">
          <HugeiconsIcon icon={Loading03Icon} className="w-10 h-10 text-sky-600 animate-spin mb-4" strokeWidth={2} />
          <p className="text-slate-600 font-semibold text-sm">Loading your profile...</p>
        </div>
        <PolicyHolderFooter />
      </div>
    );
  }

  const vehicles = user?.vehicles || [];
  const primaryVehicle = vehicles.length > 0 ? vehicles[0] : null;
  const initials = `${(user?.firstName || "P")[0] || ""}${(user?.lastName || "")[0] || ""}`.toUpperCase() || "PH";

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
      <PolicyHolderNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 select-none">
          <Link href="/Policy_Holder/Home" className="hover:text-sky-600 transition-colors no-underline">
            Home
          </Link>
          <span>/</span>
          <span className="text-slate-800">My Profile</span>
        </div>

        {/* ======================================================== */}
        {/* Hero Profile Overview Card                               */}
        {/* ======================================================== */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
          {/* Subtle top gradient accent bar */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600" />

          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
            
            {/* Left: Avatar & Identity */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
              {/* Avatar Container with Upload Trigger */}
              <div className="relative group shrink-0">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-4 border-white shadow-md bg-gradient-to-br from-sky-500 to-[#102A43] flex items-center justify-center text-white font-bold text-3xl select-none relative">
                  {previewPhoto ? (
                    <img
                      src={previewPhoto}
                      alt="Profile Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{initials}</span>
                  )}

                  {uploadingPhoto && (
                    <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                      <HugeiconsIcon icon={Loading03Icon} className="w-6 h-6 text-white animate-spin" strokeWidth={2.5} />
                    </div>
                  )}
                </div>

                {/* Upload Button Overlay */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="Change Profile Photo"
                  disabled={uploadingPhoto}
                  className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-[#000080] hover:bg-[#000066] text-white flex items-center justify-center shadow-md transition-transform active:scale-90 border-2 border-white cursor-pointer"
                >
                  <HugeiconsIcon icon={Camera01Icon} className="w-4 h-4 text-white" strokeWidth={2.5} />
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoSelect}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                />
              </div>

              {/* Name, Badges & Meta */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                    {user?.firstName} {user?.lastName}
                  </h1>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {user?.status === "Approved" ? "Active Policy Holder" : (user?.status || "Active")}
                  </span>
                </div>

                {/* Meta Sub-row */}
                <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap text-xs text-slate-500 font-medium mt-1">
                  <span className="font-semibold text-slate-700 font-mono bg-slate-100 px-2.5 py-0.5 rounded-md">
                    NIC: {user?.nic}
                  </span>
                  <span>•</span>
                  <span className="text-[#102A43] font-semibold flex items-center gap-1">
                    <HugeiconsIcon icon={Location01Icon} className="w-3.5 h-3.5 text-sky-600" strokeWidth={2} />
                    {user?.branch || "Galle"} Branch
                  </span>
                  <span>•</span>
                  <span className="text-slate-600 font-semibold">
                    Ref: {user?.referenceNumber || "SAN-PH-001"}
                  </span>
                </div>

                {/* Actions Sub-row */}
                {previewPhoto && (
                  <button
                    onClick={handleRemovePhoto}
                    disabled={uploadingPhoto}
                    className="text-[11px] text-red-500 hover:text-red-700 font-semibold cursor-pointer border-none bg-transparent underline w-fit mt-1 select-none"
                  >
                    Remove profile photo
                  </button>
                )}
              </div>
            </div>

            {/* Right: Quick Stats Summary Cards */}
            <div className="grid grid-cols-3 gap-3 w-full md:w-auto shrink-0 select-none">
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 text-center min-w-[95px]">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Vehicles</span>
                <span className="text-xl font-bold text-[#102A43] block mt-0.5">{vehicles.length}</span>
                <span className="text-[9px] text-slate-500 font-medium">Insured</span>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 text-center min-w-[95px]">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Coverage</span>
                <span className="text-xl font-bold text-emerald-600 block mt-0.5">Active</span>
                <span className="text-[9px] text-slate-500 font-medium">Full Comprehensive</span>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 text-center min-w-[95px]">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Member</span>
                <span className="text-xs font-bold text-slate-700 block mt-1.5">{formatDate(user?.createdAt)}</span>
                <span className="text-[9px] text-slate-400 font-medium">Registered</span>
              </div>
            </div>

          </div>
        </div>

        {/* ======================================================== */}
        {/* Navigation Category Tabs                                 */}
        {/* ======================================================== */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 select-none border-b border-slate-200 no-scrollbar">
          {[
            { id: "personal", label: "Personal Details", icon: UserIcon },
            { id: "vehicles", label: `Insured Vehicles (${vehicles.length})`, icon: Car01Icon },
            { id: "bank", label: "Bank & Payout Details", icon: CreditCardIcon },
            { id: "documents", label: "KYC Documents", icon: File01Icon },
            { id: "security", label: "Account Security", icon: LockPasswordIcon }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border-none ${
                  isActive
                    ? "bg-[#102A43] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-transparent"
                }`}
              >
                <HugeiconsIcon icon={Icon} className="w-4 h-4" strokeWidth={2} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ======================================================== */}
        {/* TAB 1: Personal Details                                  */}
        {/* ======================================================== */}
        {activeTab === "personal" && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Personal & Contact Information</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Manage your identity details, email, and registered residential address</p>
              </div>
              <button
                onClick={() => setIsEditingPersonal(!isEditingPersonal)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5 shadow-2xs ${
                  isEditingPersonal
                    ? "bg-slate-100 text-slate-700 border-slate-200"
                    : "bg-[#102A43] text-white border-[#102A43] hover:bg-[#000080]"
                }`}
              >
                <HugeiconsIcon icon={isEditingPersonal ? Cancel01Icon : Edit02Icon} className="w-3.5 h-3.5" strokeWidth={2.5} />
                <span>{isEditingPersonal ? "Cancel Editing" : "Edit Details"}</span>
              </button>
            </div>

            {isEditingPersonal ? (
              <form onSubmit={handleSavePersonal} className="flex flex-col gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">First Name</label>
                    <input
                      type="text"
                      required
                      value={personalForm.firstName}
                      onChange={(e) => setPersonalForm({ ...personalForm, firstName: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Last Name</label>
                    <input
                      type="text"
                      required
                      value={personalForm.lastName}
                      onChange={(e) => setPersonalForm({ ...personalForm, lastName: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">National ID (NIC - Read Only)</label>
                    <input
                      type="text"
                      disabled
                      value={user?.nic || ""}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 cursor-not-allowed font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Date of Birth (Read Only)</label>
                    <input
                      type="text"
                      disabled
                      value={formatDate(user?.dob)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Mobile Phone Number</label>
                    <input
                      type="text"
                      required
                      value={personalForm.mobile}
                      onChange={(e) => setPersonalForm({ ...personalForm, mobile: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Email Address</label>
                    <input
                      type="email"
                      required
                      value={personalForm.email}
                      onChange={(e) => setPersonalForm({ ...personalForm, email: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Residential Home Address</label>
                  <textarea
                    rows={2}
                    required
                    value={personalForm.address}
                    onChange={(e) => setPersonalForm({ ...personalForm, address: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Province</label>
                    <select
                      value={personalForm.province}
                      onChange={(e) => setPersonalForm({ ...personalForm, province: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="">Select Province</option>
                      {SRI_LANKA_PROVINCES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">City / District</label>
                    <input
                      type="text"
                      value={personalForm.city}
                      onChange={(e) => setPersonalForm({ ...personalForm, city: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditingPersonal(false)}
                    className="px-6 py-2.5 rounded-full border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 rounded-full bg-[#000080] hover:bg-[#000066] text-white text-xs font-semibold shadow-md cursor-pointer border-none flex items-center gap-2"
                  >
                    {saving && <HugeiconsIcon icon={Loading03Icon} className="w-4 h-4 animate-spin" />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { label: "Full Name", value: `${user?.firstName} ${user?.lastName}` },
                  { label: "National ID (NIC)", value: user?.nic, isMono: true, verified: true },
                  { label: "Date of Birth", value: formatDate(user?.dob) },
                  { label: "Email Address", value: user?.email, isMono: true },
                  { label: "Mobile Number", value: user?.mobile, isMono: true },
                  { label: "Assigned Branch", value: `${user?.branch || "Galle"} Branch` },
                  { label: "Province", value: user?.province || "-" },
                  { label: "City / District", value: user?.city || "-" },
                  { label: "Policy Reference", value: user?.referenceNumber || "SAN-PH-001", isMono: true }
                ].map((item, idx) => (
                  <div key={idx} className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold text-slate-800 truncate ${item.isMono ? 'font-mono' : ''}`}>
                        {item.value}
                      </span>
                      {item.verified && (
                        <HugeiconsIcon icon={CheckmarkBadge01Icon} className="w-4 h-4 text-emerald-600 shrink-0" strokeWidth={2.5} />
                      )}
                    </div>
                  </div>
                ))}

                <div className="sm:col-span-2 lg:col-span-3 bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Residential Home Address</span>
                  <span className="text-xs font-bold text-slate-800 leading-relaxed">{user?.address || "-"}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: Insured Vehicles                                  */}
        {/* ======================================================== */}
        {activeTab === "vehicles" && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Insured Vehicles Registry</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Vehicles currently covered and active under this insurance policy account</p>
              </div>
              <Link
                href="/Policy_Holder/MyVehicles"
                className="px-4 py-2 bg-[#102A43] hover:bg-[#000080] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all no-underline shadow-2xs cursor-pointer"
              >
                <span>Manage Vehicles</span>
                <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5" strokeWidth={2.5} />
              </Link>
            </div>

            {vehicles.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-12 text-center select-none">
                <HugeiconsIcon icon={Car01Icon} className="w-12 h-12 text-slate-300 mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-sm font-semibold text-slate-600">No Vehicles Registered</p>
                <p className="text-xs text-slate-400 mt-1">Contact your branch agent or visit the Vehicles section to register your vehicle.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {vehicles.map((v: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-white border-l-[6px] border-l-blue-500 border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4 hover:shadow-md transition-all relative"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-slate-900 font-mono">
                            {formatNumberPlate(v.numberPlate)}
                          </h4>
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {v.status || "Approved"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-semibold mt-1">
                          {v.company} {v.model} ({v.year}) • {v.vehicleType}
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                        <HugeiconsIcon icon={Car01Icon} className="w-5 h-5" strokeWidth={2} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-3 border-t border-slate-100 font-medium">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Policy Number</span>
                        <span className="text-slate-800 font-mono font-bold">{v.policyNumber || "SAN-POL-001"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Engine Number</span>
                        <span className="text-slate-700 font-mono font-semibold truncate block">{v.engineNumber || "-"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: Bank & Payout Details                             */}
        {/* ======================================================== */}
        {activeTab === "bank" && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Claim Reimbursement Bank Details</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Direct deposit account used by Sanasa Insurance to disburse approved claim payouts</p>
              </div>
              <button
                onClick={() => setIsEditingBank(!isEditingBank)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5 shadow-2xs ${
                  isEditingBank
                    ? "bg-slate-100 text-slate-700 border-slate-200"
                    : "bg-[#102A43] text-white border-[#102A43] hover:bg-[#000080]"
                }`}
              >
                <HugeiconsIcon icon={isEditingBank ? Cancel01Icon : Edit02Icon} className="w-3.5 h-3.5" strokeWidth={2.5} />
                <span>{isEditingBank ? "Cancel" : "Update Bank Info"}</span>
              </button>
            </div>

            {isEditingBank ? (
              <form onSubmit={handleSaveBank} className="flex flex-col gap-6 max-w-2xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Bank Name</label>
                    <select
                      required
                      value={bankForm.bankName}
                      onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value, branchName: "" })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="">Select Bank</option>
                      {Object.keys(sriLankaBanks).map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Branch Name</label>
                    <select
                      required
                      disabled={!bankForm.bankName}
                      value={bankForm.branchName}
                      onChange={(e) => setBankForm({ ...bankForm, branchName: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <option value="">Select Branch</option>
                      {bankForm.bankName && sriLankaBanks[bankForm.bankName]?.map((br) => (
                        <option key={br} value={br}>{br}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Account Number</label>
                    <input
                      type="text"
                      required
                      value={bankForm.accountNumber}
                      onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                      placeholder="E.g., 8123456789"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Account Holder Name</label>
                    <input
                      type="text"
                      required
                      value={bankForm.accountHolderName}
                      onChange={(e) => setBankForm({ ...bankForm, accountHolderName: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditingBank(false)}
                    className="px-6 py-2.5 rounded-full border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 rounded-full bg-[#000080] hover:bg-[#000066] text-white text-xs font-semibold shadow-md cursor-pointer border-none flex items-center gap-2"
                  >
                    {saving && <HugeiconsIcon icon={Loading03Icon} className="w-4 h-4 animate-spin" />}
                    <span>Save Bank Details</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  { label: "Bank Name", value: user?.bankDetails?.bankName || "Not Provided" },
                  { label: "Branch Name", value: user?.bankDetails?.branchName || "Not Provided" },
                  { label: "Account Number", value: user?.bankDetails?.accountNumber || "Not Provided", isMono: true },
                  { label: "Account Holder", value: user?.bankDetails?.accountHolderName || `${user?.firstName} ${user?.lastName}` }
                ].map((item, idx) => (
                  <div key={idx} className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{item.label}</span>
                    <span className={`text-xs font-bold text-slate-800 truncate ${item.isMono ? 'font-mono' : ''}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: KYC Documents                                     */}
        {/* ======================================================== */}
        {activeTab === "documents" && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col gap-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Registered KYC & Policy Documents</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Verification documents provided during account registration and vehicle onboarding</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { label: "National ID (Front)", url: user?.documents?.nicFront },
                { label: "National ID (Back)", url: user?.documents?.nicBack },
                { label: "Vehicle Registration (CR)", url: user?.documents?.vehicleReg },
                { label: "Revenue License", url: user?.documents?.revenueLicense }
              ].map((doc, idx) => {
                const isUploaded = Boolean(doc.url);
                const fullUrl = getFullImageUrl(doc.url);

                return (
                  <div key={idx} className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-bold text-slate-800">{doc.label}</span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          isUploaded ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}>
                          {isUploaded ? "Verified" : "Missing"}
                        </span>
                      </div>
                      <div className="w-full aspect-[4/3] bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center relative">
                        {isUploaded && fullUrl ? (
                          <img
                            src={fullUrl}
                            alt={doc.label}
                            onClick={() => setPreviewDoc({ url: fullUrl, title: doc.label })}
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                          />
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No Document</span>
                        )}
                      </div>
                    </div>

                    {isUploaded && fullUrl && (
                      <button
                        onClick={() => setPreviewDoc({ url: fullUrl, title: doc.label })}
                        className="w-full py-2 bg-[#000080]/10 hover:bg-[#000080] hover:text-white text-[#102A43] font-semibold text-xs rounded-xl transition-all cursor-pointer border-none flex items-center justify-center gap-1.5"
                      >
                        <HugeiconsIcon icon={ViewIcon} className="w-3.5 h-3.5" strokeWidth={2} />
                        <span>View Document</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: Account Security                                  */}
        {/* ======================================================== */}
        {activeTab === "security" && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col gap-6 max-w-2xl">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Account Security & Credentials</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Update your password and manage login protection</p>
            </div>

            <form onSubmit={handleChangePassword} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Confirm New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Re-type new password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="px-6 py-2.5 bg-[#000080] hover:bg-[#000066] text-white rounded-full text-xs font-semibold shadow-md cursor-pointer border-none flex items-center gap-2 active:scale-95 transition-all"
                >
                  {changingPassword && <HugeiconsIcon icon={Loading03Icon} className="w-4 h-4 animate-spin" />}
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>
        )}

      </main>

      {/* ======================================================== */}
      {/* Full Document View Modal                                 */}
      {/* ======================================================== */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white">
              <h3 className="text-sm font-bold text-slate-900">{previewDoc.title}</h3>
              <button
                onClick={() => setPreviewDoc(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center border-none cursor-pointer"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto bg-slate-100 flex items-center justify-center">
              <img src={previewDoc.url} alt={previewDoc.title} className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-sm" />
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Feedback & Notification Popup Modal                      */}
      {/* ======================================================== */}
      {popup.show && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 text-left">
            <div className="flex items-center gap-3">
              {popup.type === "success" ? (
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-5 h-5" strokeWidth={2.5} />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5" strokeWidth={2.5} />
                </div>
              )}
              <h3 className="text-base font-bold text-slate-900">{popup.title}</h3>
            </div>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">{popup.message}</p>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPopup({ ...popup, show: false })}
                className="px-6 py-2 bg-[#000080] hover:bg-[#000066] text-white rounded-full text-xs font-semibold border-none cursor-pointer active:scale-95 transition-all shadow-xs"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <PolicyHolderFooter />
    </div>
  );
}
