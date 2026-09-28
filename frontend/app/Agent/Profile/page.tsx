"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AgentNavbar from "@/app/Components/Agent/Navbar";
import AgentFooter from "@/app/Components/Agent/Footer";
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
  ViewIcon,
  ViewOffSlashIcon,
  Loading03Icon,
  Cancel01Icon,
  ArrowRight01Icon,
  CheckmarkBadge01Icon,
  Building04Icon,
  Activity01Icon
} from "@hugeicons/core-free-icons";

interface AgentProfileData {
  _id: string;
  agentId: string;
  name: string;
  email: string;
  nic: string;
  dob: string;
  address: string;
  branch: string;
  phone?: string;
  city?: string;
  district?: string;
  area?: string;
  province?: string;
  bankName?: string;
  bankBranch?: string;
  accountNumber?: string;
  accountType?: string;
  accountHolderName?: string;
  nicFront?: string;
  nicBack?: string;
  birthCertificate?: string;
  policeReport?: string;
  profilePhoto?: string;
  status?: string;
  availability?: string;
  createdAt: string;
}

interface AssignedClaim {
  _id: string;
  claimNumber: string;
  vehiclePlate: string;
  damageType: string;
  incidentDate: string;
  status: string;
  currentStep: number;
  branch: string;
  amount?: number;
  inspectionSubmitted?: boolean;
}

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

const SRI_LANKA_DISTRICTS = [
  "Colombo", "Gampaha", "Kalutara",
  "Kandy", "Matale", "Nuwara Eliya",
  "Galle", "Matara", "Hambantota",
  "Jaffna", "Kilinochchi", "Mannar", "Vavuniya", "Mullaitivu",
  "Batticaloa", "Ampara", "Trincomalee",
  "Kurunegala", "Puttalam",
  "Anuradhapura", "Polonnaruwa",
  "Badulla", "Monaragala",
  "Ratnapura", "Kegalle"
];

export default function AgentProfilePage() {
  const router = useRouter();

  const [agent, setAgent] = useState<AgentProfileData | null>(null);
  const [stats, setStats] = useState({ totalClaims: 0, activeClaims: 0, completedInspections: 0 });
  const [assignedClaims, setAssignedClaims] = useState<AssignedClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"personal" | "credentials" | "bank" | "security">("personal");

  // Edit states
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [saving, setSaving] = useState(false);

  // Forms
  const [personalForm, setPersonalForm] = useState({
    phone: "",
    address: "",
    city: "",
    district: "",
    area: "",
    province: ""
  });

  const [bankForm, setBankForm] = useState({
    bankName: "",
    bankBranch: "",
    accountNumber: "",
    accountType: "Savings",
    accountHolderName: ""
  });

  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Profile Photo Upload modal
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Document zoom preview modal
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Custom alert popup
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

  const calculateAge = (dobStr?: string) => {
    if (!dobStr) return "-";
    try {
      const birth = new Date(dobStr);
      const diff = Date.now() - birth.getTime();
      const ageDate = new Date(diff);
      const age = Math.abs(ageDate.getUTCFullYear() - 1970);
      return isNaN(age) ? "-" : `${age} yrs`;
    } catch {
      return "-";
    }
  };

  const getFullImageUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
    return `http://localhost:5000${url.startsWith('/') ? '' : '/'}${url}`;
  };

  // Load Agent profile data from backend
  const fetchAgentProfile = async (email: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/agent/profile?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load agent profile.");

      if (data.agent) {
        setAgent(data.agent);
        setPreviewPhoto(data.agent.profilePhoto ? getFullImageUrl(data.agent.profilePhoto) : null);
        setPersonalForm({
          phone: data.agent.phone || "",
          address: data.agent.address || "",
          city: data.agent.city || "",
          district: data.agent.district || "",
          area: data.agent.area || "",
          province: data.agent.province || ""
        });
        setBankForm({
          bankName: data.agent.bankName || "",
          bankBranch: data.agent.bankBranch || "",
          accountNumber: data.agent.accountNumber || "",
          accountType: data.agent.accountType || "Savings",
          accountHolderName: data.agent.accountHolderName || data.agent.name || ""
        });
      }

      if (data.stats) {
        setStats(data.stats);
      }

      // Fetch active claims assigned to this agent
      const claimsRes = await fetch(`${API_URL}/agent/claims?email=${encodeURIComponent(email)}`);
      if (claimsRes.ok) {
        const claimsData = await claimsRes.json();
        if (Array.isArray(claimsData)) {
          setAssignedClaims(claimsData);
        }
      }

      // Fetch pending / past edit requests
      await fetchUpdateRequests(email);
    } catch (err: any) {
      console.error("Error fetching agent profile:", err);
      setPopup({
        show: true,
        title: "Profile Load Error",
        message: err.message || "Failed to load agent details.",
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const [updateRequests, setUpdateRequests] = useState<any[]>([]);

  const fetchUpdateRequests = async (email: string) => {
    try {
      const res = await fetch(`${API_URL}/agent/profile-update-requests?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.requests)) {
        setUpdateRequests(data.requests);
      }
    } catch (e) {
      console.error("Error fetching agent update requests:", e);
    }
  };

  useEffect(() => {
    const savedAgentStr = sessionStorage.getItem("logged_in_agent");
    if (!savedAgentStr) {
      router.push("/Login");
      return;
    }
    try {
      const parsedAgent = JSON.parse(savedAgentStr);
      if (parsedAgent?.email) {
        fetchAgentProfile(parsedAgent.email);
      } else {
        router.push("/Login");
      }
    } catch (e) {
      console.error("Failed to parse logged_in_agent:", e);
      router.push("/Login");
    }
  }, [router]);

  // Toggle Availability (Active / Offline)
  const handleToggleAvailability = async () => {
    if (!agent) return;
    const newStatus = agent.availability === "Active" ? "Offline" : "Active";
    try {
      const res = await fetch(`${API_URL}/agent/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: agent.email, availability: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update availability.");

      const updated = { ...agent, availability: newStatus };
      setAgent(updated);
      sessionStorage.setItem("logged_in_agent", JSON.stringify(updated));
      window.dispatchEvent(new Event("agent-profile-updated"));

      setPopup({
        show: true,
        title: "Availability Updated",
        message: `Your duty status is now set to ${newStatus}.`,
        type: "success"
      });
    } catch (err: any) {
      setPopup({
        show: true,
        title: "Error",
        message: err.message || "Failed to change duty availability.",
        type: "error"
      });
    }
  };

  // Submit Personal Details Edit Request to Branch
  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agent) return;

    if (!personalForm.phone.trim()) {
      setPopup({ show: true, title: "Validation Error", message: "Contact phone number is required.", type: "error" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/agent/profile-update-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: agent.email,
          agentId: agent.agentId,
          requestType: "Personal & Contact",
          requestedChanges: {
            phone: personalForm.phone.trim(),
            address: personalForm.address.trim(),
            city: personalForm.city.trim(),
            district: personalForm.district.trim(),
            area: personalForm.area.trim(),
            province: personalForm.province.trim()
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit personal details update request.");

      setIsEditingPersonal(false);
      await fetchUpdateRequests(agent.email);

      setPopup({
        show: true,
        title: "Edit Request Submitted",
        message: `Your personal contact and service area update request has been sent to ${agent?.branch || "Galle"} Branch for verification. Once approved by branch staff, your database records will be automatically updated and you will receive an email confirmation.`,
        type: "success"
      });
    } catch (err: any) {
      setPopup({
        show: true,
        title: "Submission Failed",
        message: err.message || "Could not submit update request.",
        type: "error"
      });
    } finally {
      setSaving(false);
    }
  };

  // Submit Bank Details Edit Request to Branch
  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agent) return;

    if (!bankForm.bankName.trim() || !bankForm.accountNumber.trim()) {
      setPopup({ show: true, title: "Validation Error", message: "Bank name and account number are required.", type: "error" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/agent/profile-update-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: agent.email,
          agentId: agent.agentId,
          requestType: "Bank Details",
          requestedChanges: {
            bankName: bankForm.bankName.trim(),
            bankBranch: bankForm.bankBranch.trim(),
            accountNumber: bankForm.accountNumber.trim(),
            accountType: bankForm.accountType.trim(),
            accountHolderName: bankForm.accountHolderName.trim()
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit bank details update request.");

      setIsEditingBank(false);
      await fetchUpdateRequests(agent.email);

      setPopup({
        show: true,
        title: "Edit Request Submitted",
        message: `Your direct settlement bank account update request has been sent to ${agent?.branch || "Galle"} Branch for verification. Once approved by branch staff, your settlement records will be updated.`,
        type: "success"
      });
    } catch (err: any) {
      setPopup({
        show: true,
        title: "Submission Failed",
        message: err.message || "Could not submit bank update request.",
        type: "error"
      });
    } finally {
      setSaving(false);
    }
  };

  // Photo Upload Handler
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setPopup({ show: true, title: "File Too Large", message: "Photo file size must be less than 5MB.", type: "error" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSavePhoto = async () => {
    if (!previewPhoto || !agent) return;
    setUploadingPhoto(true);
    try {
      const res = await fetch(`${API_URL}/agent/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: agent.email,
          profilePhoto: previewPhoto
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload photo.");

      setAgent(data.agent);
      sessionStorage.setItem("logged_in_agent", JSON.stringify(data.agent));
      window.dispatchEvent(new Event("agent-profile-updated"));
      setShowPhotoModal(false);

      setPopup({
        show: true,
        title: "Photo Updated",
        message: "Your agent profile photo has been updated successfully.",
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
    if (!agent) return;
    setUploadingPhoto(true);
    try {
      const res = await fetch(`${API_URL}/agent/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: agent.email,
          profilePhoto: ""
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove photo.");

      setPreviewPhoto(null);
      setAgent(data.agent);
      sessionStorage.setItem("logged_in_agent", JSON.stringify(data.agent));
      window.dispatchEvent(new Event("agent-profile-updated"));
      setShowPhotoModal(false);

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

  // Password Change Handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agent) return;

    if (passwordForm.newPassword.length < 6) {
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
      const res = await fetch(`${API_URL}/agent/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: agent.email,
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password.");

      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPopup({
        show: true,
        title: "Password Changed",
        message: "Your agent account login credentials have been updated securely.",
        type: "success"
      });
    } catch (err: any) {
      setPopup({
        show: true,
        title: "Password Change Failed",
        message: err.message || "Could not change password. Please check your current password.",
        type: "error"
      });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading && !agent) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
        <AgentNavbar />
        <div className="flex-1 flex flex-col items-center justify-center py-24">
          <HugeiconsIcon icon={Loading03Icon} className="w-10 h-10 text-sky-600 animate-spin mb-4" strokeWidth={2} />
          <p className="text-slate-600 font-semibold text-sm">Loading your agent profile...</p>
        </div>
        <AgentFooter />
      </div>
    );
  }

  const initials = (agent?.name || "A")
    .split(" ")
    .map(n => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "AG";

  const isAvailable = agent?.availability === "Active";

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
      <AgentNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 select-none">
          <Link href="/Agent/Dashboard" className="hover:text-sky-600 transition-colors no-underline">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-slate-800">My Agent Profile</span>
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
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-4 border-white shadow-md bg-gradient-to-br from-[#102A43] to-blue-900 flex items-center justify-center text-white font-bold text-3xl select-none relative">
                  {previewPhoto ? (
                    <img
                      src={previewPhoto}
                      alt="Agent Avatar"
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

                {/* Camera upload button badge */}
                <button
                  onClick={() => setShowPhotoModal(true)}
                  className="absolute -bottom-1 -right-1 bg-sky-600 hover:bg-sky-500 text-white p-2 rounded-2xl shadow-md border-2 border-white transition-all duration-150 cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95"
                  title="Upload / Change Photo"
                >
                  <HugeiconsIcon icon={Camera01Icon} className="w-4 h-4" strokeWidth={2} />
                </button>
              </div>

              {/* Identity & Badges */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    {agent?.name || "Sanasa Insurance Agent"}
                  </h1>
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                    <HugeiconsIcon icon={CheckmarkBadge01Icon} className="w-3.5 h-3.5" strokeWidth={2.5} />
                    <span>Verified Field Agent</span>
                  </span>
                </div>

                <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-semibold text-slate-500 flex-wrap">
                  <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-xl font-mono text-[11px]">
                    ID: {agent?.agentId || "AGT-0001"}
                  </span>
                  <span>•</span>
                  <span className="bg-sky-50 text-sky-800 px-2.5 py-1 rounded-xl font-semibold text-[11px] flex items-center gap-1">
                    <HugeiconsIcon icon={Building04Icon} className="w-3.5 h-3.5 text-sky-600" strokeWidth={2} />
                    <span>{agent?.branch || "Galle"} Branch</span>
                  </span>
                  <span>•</span>
                  <span className="text-slate-400">
                    Joined {formatDate(agent?.createdAt)}
                  </span>
                </div>

                {/* Service Region & Contact Line */}
                <div className="flex items-center justify-center sm:justify-start gap-4 text-xs font-medium text-slate-600 flex-wrap pt-1">
                  <span className="flex items-center gap-1.5">
                    <HugeiconsIcon icon={Call02Icon} className="w-3.5 h-3.5 text-slate-400" strokeWidth={2} />
                    <span className="font-mono">{agent?.phone || "No phone registered"}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <HugeiconsIcon icon={Mail01Icon} className="w-3.5 h-3.5 text-slate-400" strokeWidth={2} />
                    <span>{agent?.email}</span>
                  </span>
                  {agent?.area && (
                    <span className="flex items-center gap-1.5">
                      <HugeiconsIcon icon={Location01Icon} className="w-3.5 h-3.5 text-slate-400" strokeWidth={2} />
                      <span>{agent.area}, {agent.district || agent.city}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Availability Toggle & Metric Pills */}
            <div className="flex flex-col sm:flex-row md:flex-col items-center sm:items-end gap-3 w-full md:w-auto">
              
              {/* Live Duty Availability Button */}
              <button
                onClick={handleToggleAvailability}
                className={`w-full sm:w-auto px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs select-none active:scale-95 ${
                  isAvailable
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500"
                    : "bg-slate-200 hover:bg-slate-300 text-slate-700 border-slate-300"
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${isAvailable ? "bg-white animate-pulse" : "bg-slate-400"}`} />
                <span>Duty Status: {isAvailable ? "Active (On Duty)" : "Offline (Off Duty)"}</span>
              </button>

              {/* Quick Metrics */}
              <div className="flex items-center gap-2 w-full justify-center sm:justify-end">
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-2 text-center select-none shadow-2xs">
                  <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Assigned</span>
                  <span className="block text-sm font-bold text-slate-900 font-mono">{stats.totalClaims}</span>
                </div>
                <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl px-3.5 py-2 text-center select-none shadow-2xs">
                  <span className="block text-amber-600 text-[10px] font-bold uppercase tracking-wider">In Progress</span>
                  <span className="block text-sm font-bold text-amber-800 font-mono">{stats.activeClaims}</span>
                </div>
                <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl px-3.5 py-2 text-center select-none shadow-2xs">
                  <span className="block text-blue-600 text-[10px] font-bold uppercase tracking-wider">Inspected</span>
                  <span className="block text-sm font-bold text-blue-800 font-mono">{stats.completedInspections}</span>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* ======================================================== */}
        {/* Navigation Category Tabs                                 */}
        {/* ======================================================== */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 select-none border-b border-slate-200 no-scrollbar">
          {[
            { id: "personal", label: "Personal & Contact", icon: UserIcon },
            { id: "credentials", label: "Credentials & KYC", icon: Shield01Icon },
            { id: "bank", label: "Direct Settlement Bank", icon: CreditCardIcon },
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
        {/* TAB 1: Personal & Contact Details                        */}
        {/* ======================================================== */}
        {activeTab === "personal" && (() => {
          const pendingReq = updateRequests.find(r => r.status === "Pending" && (r.requestType?.includes("Personal") || r.requestType?.includes("Contact")));
          const recentRejected = updateRequests.find(r => r.status === "Rejected" && (r.requestType?.includes("Personal") || r.requestType?.includes("Contact")));

          return (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col gap-6">
              {/* Pending Request Alert Banner */}
              {pendingReq && (
                <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
                  <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" strokeWidth={2.5} />
                  <div>
                    <h4 className="text-xs font-bold text-amber-800">Contact Edit Request Under Branch Review</h4>
                    <p className="text-xs text-amber-700 font-medium mt-0.5">
                      You submitted a profile update request on {formatDate(pendingReq.createdAt)} to <strong className="font-semibold">{agent?.branch || "Galle"} Branch</strong>. It will be updated automatically in the system once verified and approved by branch staff.
                    </p>
                  </div>
                </div>
              )}

              {/* Recent Rejected Banner */}
              {!pendingReq && recentRejected && (
                <div className="bg-red-50/80 border border-red-200/80 rounded-2xl p-4 flex items-start gap-3">
                  <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5 text-red-600 shrink-0 mt-0.5" strokeWidth={2.5} />
                  <div>
                    <h4 className="text-xs font-bold text-red-800">Previous Contact Update Rejected by Branch</h4>
                    <p className="text-xs text-red-700 font-medium mt-0.5">
                      Reason: <strong className="font-semibold">{recentRejected.reviewNote || "Information mismatch"}</strong>. You may update your contact information and re-submit for branch verification.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">Personal & Field Contact Information</h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Update your contact phone, service location, and residential address details
                  </p>
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
                <span>{isEditingPersonal ? "Cancel Editing" : "Edit Contact Info"}</span>
              </button>
            </div>

            {isEditingPersonal ? (
              <form onSubmit={handleSavePersonal} className="flex flex-col gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  
                  {/* Read-Only Full Name */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Full Agent Name</label>
                      <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Branch Authority Only</span>
                    </div>
                    <input
                      type="text"
                      disabled
                      value={agent?.name || ""}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100/80 text-xs font-bold text-slate-500 cursor-not-allowed select-none"
                    />
                  </div>

                  {/* Read-Only NIC */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">National ID (NIC)</label>
                      <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Branch Authority Only</span>
                    </div>
                    <input
                      type="text"
                      disabled
                      value={agent?.nic || ""}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100/80 text-xs font-bold text-slate-500 cursor-not-allowed font-mono select-none"
                    />
                  </div>

                  {/* Read-Only Email */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Official Email Address</label>
                      <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Branch Authority Only</span>
                    </div>
                    <input
                      type="email"
                      disabled
                      value={agent?.email || ""}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100/80 text-xs font-bold text-slate-500 cursor-not-allowed select-none"
                    />
                  </div>

                  {/* Editable Phone */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Contact Phone Number <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 0771234567"
                      value={personalForm.phone}
                      onChange={(e) => setPersonalForm({ ...personalForm, phone: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                    />
                  </div>

                  {/* Editable Area / Region */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Field Coverage Area</label>
                    <input
                      type="text"
                      placeholder="e.g. Galle Fort, Unawatuna, Hikkaduwa"
                      value={personalForm.area}
                      onChange={(e) => setPersonalForm({ ...personalForm, area: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  {/* Editable District */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">District</label>
                    <select
                      value={personalForm.district}
                      onChange={(e) => setPersonalForm({ ...personalForm, district: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                    >
                      <option value="">Select District</option>
                      {SRI_LANKA_DISTRICTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  {/* Editable City */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">City / Town</label>
                    <input
                      type="text"
                      placeholder="e.g. Galle"
                      value={personalForm.city}
                      onChange={(e) => setPersonalForm({ ...personalForm, city: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  {/* Editable Province */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Province</label>
                    <select
                      value={personalForm.province}
                      onChange={(e) => setPersonalForm({ ...personalForm, province: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                    >
                      <option value="">Select Province</option>
                      {SRI_LANKA_PROVINCES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Editable Permanent Address */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Residential Home Address</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Enter full street address"
                    value={personalForm.address}
                    onChange={(e) => setPersonalForm({ ...personalForm, address: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
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
                    <span>Save Contact Changes</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { label: "Full Agent Name", value: agent?.name || "-", verified: true },
                  { label: "National ID (NIC)", value: agent?.nic || "-", isMono: true, locked: true },
                  { label: "Assigned Branch", value: `${agent?.branch || "Galle"} Branch`, locked: true },
                  { label: "Agent ID Code", value: agent?.agentId || "AGT-0001", isMono: true, locked: true },
                  { label: "Date of Birth", value: formatDate(agent?.dob) },
                  { label: "Age", value: calculateAge(agent?.dob) },
                  { label: "Contact Phone", value: agent?.phone || "-", isMono: true },
                  { label: "Official Email", value: agent?.email || "-", isMono: true },
                  { label: "Service Area", value: agent?.area || "-" },
                  { label: "District", value: agent?.district || "-" },
                  { label: "City", value: agent?.city || "-" },
                  { label: "Province", value: agent?.province || "-" }
                ].map((item, idx) => (
                  <div key={idx} className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{item.label}</span>
                      {item.locked && (
                        <span className="text-[9px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
                          Branch Only
                        </span>
                      )}
                    </div>
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
                  <span className="text-xs font-bold text-slate-800 leading-relaxed">{agent?.address || "-"}</span>
                </div>
              </div>
            )}
          </div>
        ); })()}

        {/* ======================================================== */}
        {/* TAB 2: Agent Credentials & KYC Documents                 */}
        {/* ======================================================== */}
        {activeTab === "credentials" && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Agent Credentials & Onboarding KYC Verification</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Official Sanasa Insurance agent accreditation documents & background verification
                </p>
              </div>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs px-3 py-1.5 rounded-xl shadow-2xs flex items-center gap-1.5">
                <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
                <span>Onboarding Accredited</span>
              </span>
            </div>

            {/* Document Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "National ID (Front)", key: "nicFront", url: agent?.nicFront },
                { label: "National ID (Back)", key: "nicBack", url: agent?.nicBack },
                { label: "Birth Certificate", key: "birthCertificate", url: agent?.birthCertificate },
                { label: "Police Clearance Report", key: "policeReport", url: agent?.policeReport }
              ].map((doc, idx) => {
                const isAvailable = Boolean(doc.url);
                const fullUrl = getFullImageUrl(doc.url);

                return (
                  <div key={idx} className="border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 bg-white shadow-2xs hover:border-slate-300 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 truncate">{doc.label}</span>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        isAvailable ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}>
                        {isAvailable ? "Verified" : "Not Provided"}
                      </span>
                    </div>

                    <div className="w-full aspect-[4/3] bg-slate-50 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center relative">
                      {isAvailable && fullUrl ? (
                        <img
                          src={fullUrl}
                          alt={doc.label}
                          onClick={() => setPreviewImage({ url: fullUrl, title: `${doc.label} - ${agent?.name}` })}
                          className="w-full h-full object-cover cursor-zoom-in hover:scale-105 transition-transform"
                        />
                      ) : (
                        <span className="text-xs text-slate-400 italic font-medium">No Document File</span>
                      )}
                    </div>

                    {isAvailable && fullUrl ? (
                      <button
                        onClick={() => setPreviewImage({ url: fullUrl, title: `${doc.label} - ${agent?.name}` })}
                        className="w-full py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold text-xs rounded-xl transition-all cursor-pointer border-none flex items-center justify-center gap-1.5"
                      >
                        <HugeiconsIcon icon={ViewIcon} className="w-3.5 h-3.5" strokeWidth={2} />
                        <span>View Document</span>
                      </button>
                    ) : (
                      <div className="py-2 bg-slate-50 rounded-xl text-center text-slate-400 text-xs font-medium border border-dashed border-slate-200">
                        File Not Attached
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: Direct Settlement Bank Details                    */}
        {/* ======================================================== */}
        {activeTab === "bank" && (() => {
          const pendingBankReq = updateRequests.find(r => r.status === "Pending" && (r.requestType?.includes("Bank") || r.requestType?.includes("Settlement")));
          const recentRejectedBank = updateRequests.find(r => r.status === "Rejected" && (r.requestType?.includes("Bank") || r.requestType?.includes("Settlement")));

          return (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col gap-6">
              {/* Pending Request Alert Banner */}
              {pendingBankReq && (
                <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
                  <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" strokeWidth={2.5} />
                  <div>
                    <h4 className="text-xs font-bold text-amber-800">Bank Details Edit Request Under Branch Review</h4>
                    <p className="text-xs text-amber-700 font-medium mt-0.5">
                      You submitted a direct settlement bank update request on {formatDate(pendingBankReq.createdAt)} to <strong className="font-semibold">{agent?.branch || "Galle"} Branch</strong>. It will be updated automatically in the system once verified and approved by branch staff.
                    </p>
                  </div>
                </div>
              )}

              {/* Recent Rejected Banner */}
              {!pendingBankReq && recentRejectedBank && (
                <div className="bg-red-50/80 border border-red-200/80 rounded-2xl p-4 flex items-start gap-3">
                  <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5 text-red-600 shrink-0 mt-0.5" strokeWidth={2.5} />
                  <div>
                    <h4 className="text-xs font-bold text-red-800">Previous Bank Details Update Rejected by Branch</h4>
                    <p className="text-xs text-red-700 font-medium mt-0.5">
                      Reason: <strong className="font-semibold">{recentRejectedBank.reviewNote || "Account details mismatch"}</strong>. You may correct your bank information and re-submit.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">Direct Deposit Settlement Bank Details</h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Used for electronic claim inspection allowances, commission settlements, and field reimbursements
                  </p>
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
                  <span>{isEditingBank ? "Cancel Editing" : "Edit Bank Account"}</span>
                </button>
              </div>

            {isEditingBank ? (
              <form onSubmit={handleSaveBank} className="flex flex-col gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Bank Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      list="agent-banks-list"
                      placeholder="e.g. Bank of Ceylon, Commercial Bank"
                      value={bankForm.bankName}
                      onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <datalist id="agent-banks-list">
                      {Object.keys(sriLankaBanks).map((b) => (
                        <option key={b} value={b} />
                      ))}
                    </datalist>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Bank Branch Location <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Galle Main Branch"
                      value={bankForm.bankBranch}
                      onChange={(e) => setBankForm({ ...bankForm, bankBranch: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Account Number <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 10023456789"
                      value={bankForm.accountNumber}
                      onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Account Type</label>
                    <select
                      value={bankForm.accountType}
                      onChange={(e) => setBankForm({ ...bankForm, accountType: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                    >
                      <option value="Savings">Savings Account</option>
                      <option value="Current">Current Account</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Account Holder Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. A. B. Perera"
                      value={bankForm.accountHolderName}
                      onChange={(e) => setBankForm({ ...bankForm, accountHolderName: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { label: "Bank Name", value: agent?.bankName || "-" },
                  { label: "Bank Branch Location", value: agent?.bankBranch || "-" },
                  { label: "Account Number", value: agent?.accountNumber || "-", isMono: true },
                  { label: "Account Type", value: agent?.accountType || "Savings" },
                  { label: "Account Holder Name", value: agent?.accountHolderName || agent?.name || "-" }
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
        ); })()}

        {/* ======================================================== */}
        {/* TAB 4: Account Security                                  */}
        {/* ======================================================== */}
        {activeTab === "security" && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col gap-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Account Login Security Credentials</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Update your agent portal password to keep your assigned inspection records secure
              </p>
            </div>

            <form onSubmit={handleChangePassword} className="max-w-xl flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? "text" : "password"}
                    required
                    placeholder="Enter your current password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer p-1"
                  >
                    <HugeiconsIcon icon={showCurrentPw ? ViewOffSlashIcon : ViewIcon} className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPw ? "text" : "password"}
                    required
                    placeholder="Enter at least 6 characters"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer p-1"
                  >
                    <HugeiconsIcon icon={showNewPw ? ViewOffSlashIcon : ViewIcon} className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPw ? "text" : "password"}
                    required
                    placeholder="Re-type your new password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer p-1"
                  >
                    <HugeiconsIcon icon={showConfirmPw ? ViewOffSlashIcon : ViewIcon} className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={changingPassword}
                className="w-fit px-8 py-3 rounded-full bg-[#000080] hover:bg-[#000066] text-white text-xs font-semibold shadow-md cursor-pointer border-none flex items-center gap-2 mt-2"
              >
                {changingPassword && <HugeiconsIcon icon={Loading03Icon} className="w-4 h-4 animate-spin" />}
                <span>Update Password</span>
              </button>
            </form>
          </div>
        )}

      </main>

      {/* ======================================================== */}
      {/* Profile Photo Upload Modal                               */}
      {/* ======================================================== */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl border border-slate-100 flex flex-col gap-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Upload Agent Profile Photo</h3>
              <button
                onClick={() => setShowPhotoModal(false)}
                className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer p-1"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>

            {/* Preview Box */}
            <div className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-sky-100 shadow-md bg-slate-100 flex items-center justify-center relative">
                {previewPhoto ? (
                  <img src={previewPhoto} alt="Photo Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-slate-400">{initials}</span>
                )}
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-semibold border-none cursor-pointer flex items-center gap-1.5"
                >
                  <HugeiconsIcon icon={Camera01Icon} className="w-4 h-4" strokeWidth={2} />
                  <span>Choose Image File</span>
                </button>

                {previewPhoto && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={uploadingPhoto}
                    className="px-4 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold border-none cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPhotoModal(false)}
                className="px-5 py-2.5 rounded-full border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePhoto}
                disabled={uploadingPhoto || !previewPhoto}
                className="px-6 py-2.5 rounded-full bg-[#000080] hover:bg-[#000066] disabled:opacity-50 text-white text-xs font-semibold shadow-md cursor-pointer border-none flex items-center gap-2"
              >
                {uploadingPhoto && <HugeiconsIcon icon={Loading03Icon} className="w-4 h-4 animate-spin" />}
                <span>Save Profile Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Document Zoom Preview Modal                              */}
      {/* ======================================================== */}
      {previewImage && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">{previewImage.title}</h3>
              <button
                onClick={() => setPreviewImage(null)}
                className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer p-1"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>
            <div className="p-4 bg-slate-950 flex items-center justify-center max-h-[75vh] overflow-hidden">
              <img src={previewImage.url} alt={previewImage.title} className="max-h-[70vh] w-auto object-contain rounded-xl" />
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Custom Popup Dialog                                      */}
      {/* ======================================================== */}
      {popup.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-slate-100 flex flex-col items-center text-center gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
              popup.type === "success" ? "bg-emerald-50 text-emerald-600" : popup.type === "error" ? "bg-red-50 text-red-600" : "bg-sky-50 text-sky-600"
            }`}>
              <HugeiconsIcon icon={popup.type === "success" ? CheckmarkCircle01Icon : Alert02Icon} className="w-7 h-7" strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{popup.title}</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{popup.message}</p>
            </div>
            <button
              onClick={() => setPopup({ ...popup, show: false })}
              className="w-full py-2.5 rounded-full bg-[#102A43] hover:bg-[#000080] text-white text-xs font-semibold shadow-sm border-none cursor-pointer mt-1"
            >
              OK
            </button>
          </div>
        </div>
      )}

      <AgentFooter />
    </div>
  );
}
