"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import OfficeStaffNavbar from "@/app/Components/Office_Staff/Navbar";
import { API_URL } from "@/app/config";
import UserAvatarDropdown from "@/app/Components/UserAvatarDropdown";
import SimpleLoader from "@/app/Components/SimpleLoader";
import { sriLankaBanks } from "../../utils/banks";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  BubbleChatIcon,
  Menu01Icon,
  Notification01Icon,
  UserMultiple02Icon,
  Search01Icon,
  Add01Icon,
  UserIcon,
  Cancel01Icon,
  Alert02Icon,
  CheckmarkCircle01Icon,
  Upload01Icon,
  Location01Icon,
  Loading03Icon,
  Delete02Icon,
  Edit02Icon,
  ViewIcon,
  CheckmarkBadge01Icon
} from "@hugeicons/core-free-icons";

interface AgentProfileEditRequest {
  _id: string;
  agentId: string;
  agentNic: string;
  agentName: string;
  agentEmail: string;
  agentPhone: string;
  branch: string;
  requestType: string;
  originalData: {
    name?: string;
    phone?: string;
    dob?: string;
    address?: string;
    province?: string;
    district?: string;
    city?: string;
    area?: string;
    bankName?: string;
    bankBranch?: string;
    accountNumber?: string;
    accountType?: string;
    accountHolderName?: string;
  };
  requestedChanges: {
    name?: string;
    phone?: string;
    dob?: string;
    address?: string;
    province?: string;
    district?: string;
    city?: string;
    area?: string;
    bankName?: string;
    bankBranch?: string;
    accountNumber?: string;
    accountType?: string;
    accountHolderName?: string;
  };
  status: "Pending" | "Approved" | "Rejected";
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

const formatDate = (dateStr?: string) => {
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

/**
 * AgentsPage Component
 * Provides a management workbench to search, register, view, review profile edit requests, and delete Insurance Agents assigned to the office branch.
 */
export default function AgentsPage() {
  const router = useRouter();

  // --- Category Switcher State ---
  const [activeCategory, setActiveCategory] = useState<"agents" | "edit_requests">("agents");
  const [staffInfo, setStaffInfo] = useState<any>(null);

  // --- UI Display & Search States ---
  const [branch, setBranch] = useState("");
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "Active" | "Offline">("all");

  // --- Agent Profile Edit Requests States ---
  const [agentEditRequests, setAgentEditRequests] = useState<AgentProfileEditRequest[]>([]);
  const [selectedAgentEditRequest, setSelectedAgentEditRequest] = useState<AgentProfileEditRequest | null>(null);
  const [editStatusFilter, setEditStatusFilter] = useState<"all" | "Pending" | "Approved" | "Rejected">("all");
  const [reviewNoteInput, setReviewNoteInput] = useState("");
  const [reviewingEditRequest, setReviewingEditRequest] = useState(false);
  const [agentEditRejectModal, setAgentEditRejectModal] = useState<{
    show: boolean;
    request: AgentProfileEditRequest | null;
    reason: string;
  }>({
    show: false,
    request: null,
    reason: ""
  });

  // --- Modal / Form Registration States ---
  const [showModal, setShowModal] = useState(false);
  const [customPopup, setCustomPopup] = useState<{
    show: boolean;
    title: string;
    message: string;
    type?: "alert" | "confirm" | "success" | "error";
    onConfirm?: () => void;
  }>({ show: false, title: "", message: "", type: "alert" });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    nic: "",
    dob: "",
    address: "",
    phone: "",
    bankName: "",
    bankBranch: "",
    accountNumber: "",
    accountHolderName: ""
  });
  const [nicFront, setNicFront] = useState<File | null>(null);
  const [nicBack, setNicBack] = useState<File | null>(null);
  const [birthCertificate, setBirthCertificate] = useState<File | null>(null);
  const [policeReport, setPoliceReport] = useState<File | null>(null);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [submittingAgent, setSubmittingAgent] = useState(false);
  const [selectedAgentDetails, setSelectedAgentDetails] = useState<any | null>(null);
  
  // Edit Agent Modal states
  const [showEditAgentModal, setShowEditAgentModal] = useState(false);
  const [savingAgent, setSavingAgent] = useState(false);
  const [editAgentError, setEditAgentError] = useState("");
  const [editAgentForm, setEditAgentForm] = useState({
    _id: "",
    agentId: "",
    name: "",
    email: "",
    phone: "",
    nic: "",
    dob: "",
    address: "",
    province: "",
    district: "",
    area: "",
    branch: "",
    status: "active",
    availability: "Active",
    bankName: "",
    bankBranch: "",
    accountNumber: "",
    accountType: "",
    accountHolderName: ""
  });
  
  // Deletion Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAgentId, setDeletingAgentId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState("Resigned");
  const [deleteNote, setDeleteNote] = useState("");
  const [deleteDoc, setDeleteDoc] = useState<File | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  // --- Lifecycle Effects ---
  // Restores session details and triggers data load on mounting.
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedStaff = sessionStorage.getItem("logged_in_staff");
      if (!savedStaff) {
        router.push("/Login");
        return;
      }
      try {
        const staffObj = JSON.parse(savedStaff);
        if (staffObj && staffObj.branch) {
          setBranch(staffObj.branch);
          setStaffInfo(staffObj);
          loadAgents(staffObj.branch);
          loadAgentEditRequests(staffObj.branch);
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
  }, [router]);

  // Poll agents and edit requests in background for real-time status/availability updates
  useEffect(() => {
    if (!branch) return;
    const pollInterval = setInterval(() => {
      loadAgents(branch, true);
      loadAgentEditRequests(branch, true);
    }, 7000);
    return () => clearInterval(pollInterval);
  }, [branch, selectedAgentEditRequest]);

  // --- Data Loading Operations ---
  // Loads all registered Insurance Agents belonging to the specific branch.
  const loadAgents = async (branchName: string, silent = false) => {
    try {
      if (!silent) setLoading(true);
      const baseUrl = API_URL;
      const res = await fetch(`${baseUrl}/office-staff/agents?branch=${encodeURIComponent(branchName)}`);
      if (!res.ok) {
        throw new Error("Failed to fetch agents.");
      }
      const data = await res.json();
      setAgents(data.agents || []);
    } catch (err: any) {
      console.error("Error loading agents:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Loads agent profile edit requests for the branch
  const loadAgentEditRequests = async (branchName: string, silent = false) => {
    try {
      const res = await fetch(`${API_URL}/office-staff/agent-profile-update-requests?branch=${encodeURIComponent(branchName)}&status=all`);
      if (res.ok) {
        const data = await res.json();
        const freshRequests = data.requests || [];
        setAgentEditRequests(freshRequests);
        if (selectedAgentEditRequest) {
          const updated = freshRequests.find((r: AgentProfileEditRequest) => r._id === selectedAgentEditRequest._id);
          if (updated) setSelectedAgentEditRequest(updated);
        }
      }
    } catch (err: any) {
      console.error("Error loading agent edit requests:", err);
    }
  };

  // Process Approval or Rejection of Agent Edit Request
  const handleReviewAgentEditRequest = async (id: string, status: "Approved" | "Rejected", reviewNote?: string) => {
    try {
      setReviewingEditRequest(true);
      const staffName = staffInfo ? `${staffInfo.firstName || ""} ${staffInfo.lastName || ""}`.trim() || staffInfo.name || "Branch Staff" : "Branch Staff";
      const res = await fetch(`${API_URL}/office-staff/agent-profile-update-requests/${id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          reviewNote: reviewNote || (status === "Approved" ? "Approved by Branch Office Staff" : "Rejected by Branch Office Staff"),
          reviewedBy: staffName,
          staffBranch: branch
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${status.toLowerCase()} edit request.`);

      await loadAgentEditRequests(branch, true);
      await loadAgents(branch, true);

      if (selectedAgentEditRequest && selectedAgentEditRequest._id === id) {
        setSelectedAgentEditRequest(data.request || null);
      }

      setCustomPopup({
        show: true,
        title: status === "Approved" ? "Agent Edit Request Approved" : "Agent Edit Request Rejected",
        message: status === "Approved"
          ? "The requested agent profile and banking changes have been approved and updated in the database. A confirmation email has been sent to the agent."
          : "The agent profile update request has been rejected. A notification email has been dispatched to the agent.",
        type: "success"
      });
    } catch (err: any) {
      console.error("Agent review error:", err);
      setCustomPopup({ show: true, title: "Error", message: err.message || "Failed to process review.", type: "error" });
    } finally {
      setReviewingEditRequest(false);
    }
  };

  const triggerApproveAgentEdit = (req: AgentProfileEditRequest) => {
    setCustomPopup({
      show: true,
      title: "Approve Agent Profile Edit Request",
      message: `Are you sure you want to approve the requested changes for Agent ${req.agentName} (${req.agentId})? The agent's profile in the database will be updated automatically and an approval email will be sent to ${req.agentEmail}.`,
      type: "confirm",
      onConfirm: () => handleReviewAgentEditRequest(req._id, "Approved", reviewNoteInput)
    });
  };

  // --- Event Handlers & Submissions ---

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!formData.name.trim()) return setFormError("Full Name is required.");
    if (!formData.email.trim()) return setFormError("Email Address is required.");
    if (!formData.nic.trim()) return setFormError("NIC Number is required.");
    if (!formData.dob.trim()) return setFormError("Date of Birth is required.");
    if (!formData.address.trim()) return setFormError("Home Address is required.");
    if (!formData.phone.trim()) return setFormError("Phone Number is required.");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      return setFormError("Please enter a valid email address.");
    }

    const nicRegex = /^[0-9vVxX]{10,12}$/;
    if (!nicRegex.test(formData.nic.trim())) {
      return setFormError("Invalid NIC format. Must be between 10 and 12 characters.");
    }

    const cleanPhone = formData.phone.replace(/[-+()\s]/g, "");
    if (!/^\d{10}$/.test(cleanPhone)) {
      return setFormError("Phone number must be exactly 10 digits.");
    }

    setSubmittingAgent(true);
    try {
      const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
      });

      let nicFrontBase64 = "";
      let nicBackBase64 = "";
      let birthCertificateBase64 = "";
      let policeReportBase64 = "";

      if (nicFront) nicFrontBase64 = await toBase64(nicFront);
      if (nicBack) nicBackBase64 = await toBase64(nicBack);
      if (birthCertificate) birthCertificateBase64 = await toBase64(birthCertificate);
      if (policeReport) policeReportBase64 = await toBase64(policeReport);

      const baseUrl = API_URL;
      const res = await fetch(`${baseUrl}/office-staff/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          branch,
          nicFront: nicFrontBase64,
          nicBack: nicBackBase64,
          birthCertificate: birthCertificateBase64,
          policeReport: policeReportBase64
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to register agent.");
      }

      setFormSuccess("Agent registered successfully!");
      setFormData({
        name: "",
        email: "",
        nic: "",
        dob: "",
        address: "",
        phone: "",
        bankName: "",
        bankBranch: "",
        accountNumber: "",
        accountHolderName: ""
      });
      setNicFront(null);
      setNicBack(null);
      setBirthCertificate(null);
      setPoliceReport(null);
      
      // Reload agents list
      loadAgents(branch);

      setTimeout(() => {
        setShowModal(false);
        setFormSuccess("");
      }, 1500);

    } catch (err: any) {
      console.error("Register agent error:", err);
      setFormError(err.message || "Something went wrong.");
    } finally {
      setSubmittingAgent(false);
    }
  };

  const handleOpenEditAgent = (agent: any) => {
    setEditAgentError("");
    setEditAgentForm({
      _id: agent._id || "",
      agentId: agent.agentId || "",
      name: agent.name || "",
      email: agent.email || "",
      phone: agent.phone || "",
      nic: agent.nic || "",
      dob: agent.dob || "",
      address: agent.address || "",
      province: agent.province || "",
      district: agent.district || agent.city || "",
      area: agent.area || "",
      branch: agent.branch || branch,
      status: agent.status || "active",
      availability: agent.availability || "Active",
      bankName: agent.bankName || "",
      bankBranch: agent.bankBranch || "",
      accountNumber: agent.accountNumber || "",
      accountType: agent.accountType || "Savings",
      accountHolderName: agent.accountHolderName || agent.name || ""
    });
    setShowEditAgentModal(true);
  };

  const handleSaveEditAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditAgentError("");

    if (!editAgentForm._id) return;

    if (!editAgentForm.name.trim()) {
      setEditAgentError("Full Name is required.");
      return;
    }

    if (!editAgentForm.phone.trim()) {
      setEditAgentError("Phone Number is required.");
      return;
    }

    const cleanPhone = editAgentForm.phone.replace(/[-+()\s]/g, "");
    if (!/^\d{10}$/.test(cleanPhone)) {
      setEditAgentError("Phone number must be exactly 10 digits.");
      return;
    }

    setSavingAgent(true);
    try {
      const baseUrl = API_URL;
      const res = await fetch(`${baseUrl}/office-staff/agents/${editAgentForm._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editAgentForm.name.trim(),
          phone: editAgentForm.phone.trim(),
          dob: editAgentForm.dob.trim(),
          address: editAgentForm.address.trim(),
          province: editAgentForm.province.trim(),
          district: editAgentForm.district.trim(),
          city: editAgentForm.district.trim(),
          area: editAgentForm.area.trim(),
          bankName: editAgentForm.bankName.trim(),
          bankBranch: editAgentForm.bankBranch.trim(),
          accountNumber: editAgentForm.accountNumber.trim(),
          accountType: editAgentForm.accountType.trim(),
          accountHolderName: editAgentForm.accountHolderName.trim(),
          status: editAgentForm.status,
          availability: editAgentForm.availability
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update agent details.");
      }

      const updatedAgent = data.agent || { ...selectedAgentDetails, ...editAgentForm };

      setAgents(prev => prev.map(a => (a._id === editAgentForm._id ? { ...a, ...updatedAgent } : a)));

      if (selectedAgentDetails && selectedAgentDetails._id === editAgentForm._id) {
        setSelectedAgentDetails((prev: any) => ({ ...prev, ...updatedAgent }));
      }

      setShowEditAgentModal(false);
      setCustomPopup({
        show: true,
        title: "Agent Profile Updated",
        message: `Successfully updated personal and banking details for Agent ${editAgentForm.name} (${editAgentForm.agentId || "ID"}).`,
        type: "success"
      });
    } catch (err: any) {
      console.error("Save agent error:", err);
      setEditAgentError(err.message || "An error occurred while updating the agent.");
    } finally {
      setSavingAgent(false);
    }
  };

  const handleDeleteAgent = (agentId: string) => {
    setDeletingAgentId(agentId);
    setDeleteReason("Resigned");
    setDeleteNote("");
    setDeleteDoc(null);
    setShowDeleteModal(true);
  };

  const confirmDeleteAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletingAgentId) return;

    setSubmittingDelete(true);
    try {
      let documentBase64 = "";
      if (deleteDoc) {
        const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });
        documentBase64 = await toBase64(deleteDoc);
      }

      const baseUrl = API_URL;
      const res = await fetch(`${baseUrl}/office-staff/agents/${deletingAgentId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: deleteReason,
          note: deleteNote,
          document: documentBase64
        })
      });

      if (!res.ok) {
        throw new Error("Failed to delete agent.");
      }

      setCustomPopup({
        show: true,
        title: "Success",
        message: "Agent deleted successfully!",
        type: "alert"
      });

      setShowDeleteModal(false);
      setDeletingAgentId(null);
      loadAgents(branch);
    } catch (err: any) {
      console.error(err);
      setCustomPopup({
        show: true,
        title: "Error",
        message: err.message || "Failed to delete agent.",
        type: "alert"
      });
    } finally {
      setSubmittingDelete(false);
    }
  };

  // Filtered agents based on search query and status filter
  const filteredAgents = agents.filter(agent => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      agent.name?.toLowerCase().includes(q) ||
      agent.email?.toLowerCase().includes(q) ||
      agent.nic?.toLowerCase().includes(q) ||
      agent.phone?.toLowerCase().includes(q) ||
      agent.agentId?.toLowerCase().includes(q) ||
      agent.address?.toLowerCase().includes(q) ||
      agent.branch?.toLowerCase().includes(q) ||
      agent.district?.toLowerCase().includes(q) ||
      agent.city?.toLowerCase().includes(q) ||
      agent.area?.toLowerCase().includes(q)
    );

    const isOnline = (agent.availability || agent.status || "Active").toLowerCase() === "active";
    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "Active" && isOnline) ||
      (statusFilter === "Offline" && !isOnline);

    return matchesSearch && matchesStatus;
  });

  // Filtered agent edit requests based on search query and edit status filter
  const filteredAgentEditRequests = agentEditRequests.filter(req => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      req.agentName?.toLowerCase().includes(q) ||
      req.agentNic?.toLowerCase().includes(q) ||
      req.agentId?.toLowerCase().includes(q) ||
      req.agentEmail?.toLowerCase().includes(q) ||
      req.agentPhone?.toLowerCase().includes(q) ||
      req.requestType?.toLowerCase().includes(q) ||
      req.branch?.toLowerCase().includes(q)
    );

    const matchesStatus = editStatusFilter === "all" || req.status === editStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingEditCount = agentEditRequests.filter(r => r.status === "Pending").length;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
      <div className="flex flex-1 flex-row min-h-0">
        <OfficeStaffNavbar />

        <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
          {/* Top Header Bar */}
          <header className="bg-white border-b border-slate-100 text-slate-800 px-8 py-4 flex justify-between items-center select-none shadow-sm shrink-0 h-[80px] sticky top-0 z-30">
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
                <span className="hidden md:inline text-slate-400 font-medium">— Insurance Agents Management</span>
              </h1>
            </div>
            
            <div className="flex items-center gap-5">
              {/* Notification Bell Icon */}
              <Link href="/Office_Staff/Notifications" className="relative p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer focus:outline-none flex items-center justify-center">
                <HugeiconsIcon icon={Notification01Icon} className="w-6 h-6 text-slate-500 hover:text-slate-800" strokeWidth={2} />
              </Link>
              {/* User Avatar Icon */}
              <UserAvatarDropdown userType="office_staff" />
            </div>
          </header>

          <main className="flex-1 p-6 lg:p-8 bg-slate-50 flex flex-col gap-6 transition-all duration-300">
            {/* Content Container */}
            <div className="max-w-7xl mx-auto w-full flex flex-col gap-6">
              
              {/* Category Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2 select-none flex-wrap">
                <button
                  onClick={() => {
                    setActiveCategory("agents");
                    setSearchQuery("");
                  }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-none ${
                    activeCategory === "agents"
                      ? "bg-[#102A43] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-transparent"
                  }`}
                >
                  <HugeiconsIcon icon={UserMultiple02Icon} className="w-4 h-4" strokeWidth={2.5} />
                  <span>Branch Agents Directory</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    activeCategory === "agents" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}>
                    {agents.length}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveCategory("edit_requests");
                    setSearchQuery("");
                  }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-none relative ${
                    activeCategory === "edit_requests"
                      ? "bg-[#102A43] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-transparent"
                  }`}
                >
                  <HugeiconsIcon icon={Edit02Icon} className="w-4 h-4" strokeWidth={2.5} />
                  <span>Agent Edit Requests</span>
                  {pendingEditCount > 0 ? (
                    <span className="bg-amber-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse shadow-xs">
                      {pendingEditCount} Pending
                    </span>
                  ) : (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      activeCategory === "edit_requests" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                    }`}>
                      {agentEditRequests.length}
                    </span>
                  )}
                </button>
              </div>

              {/* ======================================================== */}
              {/* CATEGORY 1: Branch Agents Directory                      */}
              {/* ======================================================== */}
              {activeCategory === "agents" && (
                <div className="flex flex-col gap-6">
                  {/* Search & Filter Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 select-none mb-2">
                    {/* Search Bar Input */}
                    <div className="relative w-full sm:w-[360px]">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <HugeiconsIcon icon={Search01Icon} className="w-4 h-4 text-slate-400" strokeWidth={2.5} />
                      </span>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name, NIC, email, or agent ID..."
                        className="w-full pl-10 pr-4 py-3 rounded-full border border-slate-300 text-slate-700 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-transparent transition-all shadow-sm"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
                        >
                          <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={2} />
                        </button>
                      )}
                    </div>

                    {/* Scope Switcher / Status Filter / Register Button */}
                    <div className="flex items-center gap-3 flex-wrap justify-between sm:justify-end">
                      {/* Branch Pill */}
                      <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
                        <div className="px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-[#102A43] text-white shadow-xs select-none">
                          <HugeiconsIcon icon={Location01Icon} className="w-3.5 h-3.5" strokeWidth={2} />
                          <span>{branch || "Galle"} Branch ({agents.length})</span>
                        </div>
                      </div>

                      {/* Status Filter Tabs */}
                      <div className="flex items-center gap-1.5">
                        {(["all", "Active", "Offline"] as const).map((st) => (
                          <button
                            key={st}
                            onClick={() => setStatusFilter(st)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                              statusFilter === st
                                ? "bg-[#102A43] text-white border-[#102A43] shadow-xs"
                                : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            {st === "all" ? "All" : st}
                          </button>
                        ))}
                      </div>

                      {/* Register Agent Button */}
                      <button
                        onClick={() => {
                          setFormData({
                            name: "",
                            email: "",
                            nic: "",
                            dob: "",
                            address: "",
                            phone: "",
                            bankName: "",
                            bankBranch: "",
                            accountNumber: "",
                            accountHolderName: ""
                          });
                          setNicFront(null);
                          setNicBack(null);
                          setBirthCertificate(null);
                          setPoliceReport(null);
                          setFormError("");
                          setFormSuccess("");
                          setShowModal(true);
                        }}
                        className="bg-[#000080] hover:bg-[#000066] active:scale-95 text-white font-semibold text-xs px-5 py-2.5 rounded-full transition-all cursor-pointer border-none shadow-sm flex items-center gap-2 shrink-0 select-none"
                      >
                        <HugeiconsIcon icon={Add01Icon} className="w-4 h-4 text-white" strokeWidth={2.5} />
                        <span>Register Agent</span>
                      </button>
                    </div>
                  </div>

                  {/* Table Layout */}
                  {loading ? (
                    <SimpleLoader message="Loading agent directory..." theme="slate" />
                  ) : filteredAgents.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-[20px] p-12 text-center text-slate-400 font-medium select-none shadow-sm">
                      No insurance agents found matching your query.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {/* Table Header Row */}
                      <div className="hidden md:grid md:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)_minmax(0,1.4fr)_minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1.2fr)] gap-4 px-5 py-3 text-slate-400 font-medium text-[10px] uppercase tracking-wider select-none bg-slate-50 rounded-xl border border-slate-200/60 mb-1 items-center">
                        <div className="flex flex-col select-none min-w-0">Agent Name</div>
                        <div className="flex flex-col select-none min-w-0">NIC Number</div>
                        <div className="flex flex-col select-none min-w-0">Contact Details</div>
                        <div className="flex flex-col select-none min-w-0">Location / Area</div>
                        <div className="flex flex-col select-none min-w-0">Onboarded Date</div>
                        <div className="flex flex-col select-none min-w-0">Status</div>
                        <div className="flex flex-col select-none min-w-0 text-right">Actions</div>
                      </div>

                      {/* Table Row Items */}
                      {filteredAgents.map((agent) => {
                        const isOnline = (agent.availability || agent.status || "Active").toLowerCase() === "active";

                        return (
                          <div
                            key={agent._id}
                            onClick={() => setSelectedAgentDetails(agent)}
                            className="bg-white border-l-[6px] border-l-blue-500 bg-gradient-to-r from-blue-50/10 via-transparent to-transparent hover:border-blue-400 border border-slate-200 rounded-xl px-5 py-4 flex flex-col md:grid md:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)_minmax(0,1.4fr)_minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1.2fr)] md:items-center gap-4 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md relative overflow-hidden group"
                          >
                            {/* Col 1: Agent Name & ID */}
                            <div className="flex flex-col min-w-0 select-none">
                              <h3 className="font-semibold text-sm text-slate-800 whitespace-nowrap truncate" title={agent.name}>
                                {agent.name}
                              </h3>
                              <span className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase bg-slate-100 px-2 py-0.5 rounded mt-1.5 w-fit">
                                ID: {agent.agentId || "AGT-0001"}
                              </span>
                            </div>

                            {/* Col 2: NIC */}
                            <div className="flex flex-col min-w-0 select-none">
                              <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider block md:hidden">NIC</span>
                              <span className="text-slate-700 font-semibold text-xs font-mono">{agent.nic}</span>
                            </div>

                            {/* Col 3: Email & Phone */}
                            <div className="flex flex-col min-w-0 select-none">
                              <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider block md:hidden">Contact</span>
                              <span className="text-slate-800 font-semibold text-xs truncate block" title={agent.email}>
                                {agent.email}
                              </span>
                              {agent.phone && (
                                <span className="text-[10px] text-slate-400 font-medium truncate block font-mono">
                                  {agent.phone}
                                </span>
                              )}
                            </div>

                            {/* Col 4: Location / Area */}
                            <div className="flex flex-col min-w-0 select-none">
                              <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider block md:hidden">Location</span>
                              <span className="text-slate-700 text-xs font-semibold truncate block">
                                {agent.district || agent.city || agent.area || "Galle"}
                              </span>
                              {agent.province && (
                                <span className="text-[10px] text-slate-400 font-medium truncate block">
                                  {agent.province}
                                </span>
                              )}
                            </div>

                            {/* Col 5: Onboarded Date & Branch */}
                            <div className="flex flex-col min-w-0 select-none">
                              <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider block md:hidden">Date</span>
                              <span className="text-slate-600 text-xs font-semibold">{formatDate(agent.createdAt)}</span>
                              <span className="text-[10px] text-slate-400 font-medium">{agent.branch || branch} Branch</span>
                            </div>

                            {/* Col 6: Status */}
                            <div className="flex flex-col min-w-0 select-none">
                              <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider block md:hidden">Status</span>
                              <span className={`text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full border tracking-wide w-fit ${
                                isOnline
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-slate-100 text-slate-500 border-slate-200"
                              }`}>
                                {isOnline ? "Active" : "Offline"}
                              </span>
                            </div>

                            {/* Col 7: Actions */}
                            <div
                              className="flex items-center justify-between md:justify-end gap-2 mt-4 md:mt-0 pt-3 md:pt-0 border-t md:border-0 border-slate-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="text-blue-500 font-semibold text-[11px] group-hover:underline md:hidden select-none">
                                View Details
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setSelectedAgentDetails(agent)}
                                  className="border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-[11px] px-3.5 py-1.5 rounded-lg transition-all cursor-pointer focus:outline-none shadow-xs bg-white active:scale-95 flex items-center gap-1.5"
                                >
                                  <HugeiconsIcon icon={ViewIcon} className="w-3.5 h-3.5 text-slate-600" strokeWidth={2.5} />
                                  <span>View</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditAgent(agent);
                                  }}
                                  className="border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-[11px] px-3.5 py-1.5 rounded-lg transition-all cursor-pointer focus:outline-none shadow-xs bg-white active:scale-95 flex items-center gap-1.5"
                                >
                                  <HugeiconsIcon icon={Edit02Icon} className="w-3.5 h-3.5 text-slate-600" strokeWidth={2.5} />
                                  <span>Edit</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ======================================================== */}
              {/* CATEGORY 2: Agent Profile Edit Requests                  */}
              {/* ======================================================== */}
              {activeCategory === "edit_requests" && (
                <div className="flex flex-col gap-6">
                  {/* Search & Status Filter Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 select-none mb-2">
                    {/* Search Bar Input */}
                    <div className="relative w-full sm:w-[360px]">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <HugeiconsIcon icon={Search01Icon} className="w-4 h-4 text-slate-400" strokeWidth={2.5} />
                      </span>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search edit requests by agent name, NIC, ID..."
                        className="w-full pl-10 pr-4 py-3 rounded-full border border-slate-300 text-slate-700 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-transparent transition-all shadow-sm"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
                        >
                          <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={2} />
                        </button>
                      )}
                    </div>

                    {/* Status Filter Tabs */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(["all", "Pending", "Approved", "Rejected"] as const).map((st) => (
                        <button
                          key={st}
                          onClick={() => setEditStatusFilter(st)}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                            editStatusFilter === st
                              ? "bg-[#102A43] text-white border-[#102A43] shadow-xs"
                              : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          {st === "all" ? "All Requests" : st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Requests Table */}
                  {filteredAgentEditRequests.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-[20px] p-12 text-center text-slate-400 font-medium select-none shadow-sm flex flex-col items-center gap-2">
                      <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-8 h-8 text-slate-300" strokeWidth={1.5} />
                      <p>No agent profile edit requests found matching your query.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {/* Table Header Row */}
                      <div className="hidden md:grid md:grid-cols-[minmax(0,1.8fr)_minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,1.4fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,1.2fr)] gap-4 px-5 py-3 text-slate-400 font-medium text-[10px] uppercase tracking-wider select-none bg-slate-50 rounded-xl border border-slate-200/60 mb-1 items-center">
                        <div className="min-w-0">Agent Name & ID</div>
                        <div className="min-w-0">NIC Number</div>
                        <div className="min-w-0">Contact Phone</div>
                        <div className="min-w-0">Request Category</div>
                        <div className="min-w-0">Submitted Date</div>
                        <div className="min-w-0">Status</div>
                        <div className="min-w-0 text-right">Actions</div>
                      </div>

                      {/* Request Items */}
                      {filteredAgentEditRequests.map((req) => (
                        <div
                          key={req._id}
                          onClick={() => {
                            setSelectedAgentEditRequest(req);
                            setReviewNoteInput(req.reviewNote || "");
                          }}
                          className={`bg-white border border-slate-200 rounded-xl px-5 py-4 flex flex-col md:grid md:grid-cols-[minmax(0,1.8fr)_minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,1.4fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,1.2fr)] md:items-center gap-4 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md border-l-[6px] ${
                            req.status === "Pending"
                              ? "border-l-amber-500 bg-gradient-to-r from-amber-50/20 via-transparent to-transparent"
                              : req.status === "Approved"
                              ? "border-l-emerald-500 bg-gradient-to-r from-emerald-50/10 via-transparent to-transparent"
                              : "border-l-red-500 bg-gradient-to-r from-red-50/10 via-transparent to-transparent"
                          }`}
                        >
                          {/* Col 1: Name & ID */}
                          <div className="flex flex-col min-w-0 select-none">
                            <h3 className="font-semibold text-sm text-slate-800 whitespace-nowrap truncate" title={req.agentName}>
                              {req.agentName}
                            </h3>
                            <span className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase bg-slate-100 px-2 py-0.5 rounded mt-1.5 w-fit">
                              ID: {req.agentId || "AGT-0001"}
                            </span>
                          </div>

                          {/* Col 2: NIC */}
                          <div className="flex flex-col min-w-0 select-none">
                            <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider block md:hidden">NIC</span>
                            <span className="text-slate-700 font-semibold text-xs font-mono">{req.agentNic}</span>
                          </div>

                          {/* Col 3: Contact */}
                          <div className="flex flex-col min-w-0 select-none">
                            <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider block md:hidden">Contact</span>
                            <span className="text-slate-800 font-semibold text-xs truncate font-mono">{req.agentPhone || "-"}</span>
                            <span className="text-[10px] text-slate-400 truncate">{req.agentEmail}</span>
                          </div>

                          {/* Col 4: Request Category */}
                          <div className="flex flex-col min-w-0 select-none">
                            <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider block md:hidden">Category</span>
                            <span className="bg-sky-50 text-sky-800 border border-sky-200/80 px-2.5 py-1 rounded-lg text-xs font-semibold w-fit">
                              {req.requestType}
                            </span>
                          </div>

                          {/* Col 5: Submitted Date */}
                          <div className="flex flex-col min-w-0 select-none">
                            <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider block md:hidden">Date</span>
                            <span className="text-slate-600 text-xs font-semibold">{formatDate(req.createdAt)}</span>
                            <span className="text-[10px] text-slate-400">{req.branch || branch} Branch</span>
                          </div>

                          {/* Col 6: Status */}
                          <div className="flex flex-col min-w-0 select-none">
                            <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider block md:hidden">Status</span>
                            <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border tracking-wide w-fit ${
                              req.status === "Pending"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : req.status === "Approved"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-red-50 text-red-700 border-red-200"
                            }`}>
                              {req.status}
                            </span>
                          </div>

                          {/* Col 7: Actions */}
                          <div
                            className="flex items-center justify-between md:justify-end gap-2 mt-4 md:mt-0 pt-3 md:pt-0 border-t md:border-0 border-slate-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => {
                                setSelectedAgentEditRequest(req);
                                setReviewNoteInput(req.reviewNote || "");
                              }}
                              className="border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-[11px] px-3.5 py-1.5 rounded-lg transition-all cursor-pointer shadow-xs bg-white active:scale-95 flex items-center gap-1.5"
                            >
                              <HugeiconsIcon icon={ViewIcon} className="w-3.5 h-3.5 text-slate-600" strokeWidth={2.5} />
                              <span>{req.status === "Pending" ? "Review & Diff" : "View Record"}</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </main>
        </div>
      </div>

      {/* Modal Dialog */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white border border-slate-200 rounded-[32px] w-full max-w-2xl shadow-2xl flex flex-col relative transition-all duration-300 overflow-hidden max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-8 pt-7 pb-2 select-none bg-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-[24px] font-semibold text-slate-900 tracking-tight leading-none">
                  Register New Insurance Agent
                </h2>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-1.5">
                  Define agent profile and bank credentials
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-650 bg-transparent border-none outline-none cursor-pointer transition-colors p-1"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-6 h-6 text-slate-400 hover:text-slate-600" strokeWidth={2.5} />
              </button>
            </div>
            
            {/* Horizontal Divider Line */}
            <div className="border-b border-black mx-8 mb-4 shrink-0" />

            {/* Modal Content / Form */}
            <form onSubmit={handleFormSubmit} className="px-8 pb-8 flex-1 overflow-y-auto flex flex-col gap-6 text-left">
              {formError && (
                <div className="bg-red-50 text-red-600 text-xs font-semibold px-4 py-3 rounded-2xl border border-red-100 flex items-center gap-2 shrink-0">
                  <HugeiconsIcon icon={Alert02Icon} className="w-4 h-4 shrink-0" strokeWidth={2.5} />
                  <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="bg-emerald-50 text-emerald-600 text-xs font-semibold px-4 py-3 rounded-2xl border border-emerald-100 flex items-center gap-2 shrink-0">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4 shrink-0" strokeWidth={2.5} />
                  <span>{formSuccess}</span>
                </div>
              )}

                {/* --- Section 1: General Details --- */}
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1 select-none">General Details</h3>
                  <div className="flex flex-col gap-4">
                    {/* Name */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-semibold text-slate-500 ml-1 uppercase tracking-wider">Full Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="E.g., Gayathra Samuditha"
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[#0f2d3a]/10 focus:border-[#0f2d3a] transition-all duration-200 font-semibold"
                      />
                    </div>

                    {/* Email & Phone */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 ml-1 uppercase tracking-wider">Email Address <span className="text-red-500">*</span></label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="agent@sanasainsurance.lk"
                          className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[#0f2d3a]/10 focus:border-[#0f2d3a] transition-all duration-200 font-semibold"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 ml-1 uppercase tracking-wider">Phone Number <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="E.g., 0712345678"
                          className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[#0f2d3a]/10 focus:border-[#0f2d3a] transition-all duration-200 font-semibold"
                        />
                      </div>
                    </div>

                    {/* NIC & DOB */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 ml-1 uppercase tracking-wider">NIC Number <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          required
                          value={formData.nic}
                          onChange={(e) => setFormData({ ...formData, nic: e.target.value })}
                          placeholder="E.g., 199912345678 or 991234567V"
                          className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[#0f2d3a]/10 focus:border-[#0f2d3a] transition-all duration-200 font-semibold"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 ml-1 uppercase tracking-wider">Date of Birth <span className="text-red-500">*</span></label>
                        <input
                          type="date"
                          required
                          value={formData.dob}
                          onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                          className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-4 focus:ring-[#0f2d3a]/10 focus:border-[#0f2d3a] transition-all duration-200 font-semibold"
                        />
                      </div>
                    </div>

                    {/* Address */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-semibold text-slate-500 ml-1 uppercase tracking-wider">Home Address <span className="text-red-500">*</span></label>
                      <textarea
                        required
                        rows={2}
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Enter home address here..."
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[#0f2d3a]/10 focus:border-[#0f2d3a] transition-all duration-200 font-semibold resize-none"
                      />
                    </div>



                  </div>
                </div>

                {/* --- Section 2: Bank Account Details --- */}
                <div className="mt-2">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1 select-none">Bank Account Details</h3>
                  <div className="flex flex-col gap-4">
                    {/* Bank Name & Branch Dropdowns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Bank Name Dropdown */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 ml-1 uppercase tracking-wider">Bank Name <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <select
                            required
                            value={formData.bankName}
                            onChange={(e) => setFormData({ ...formData, bankName: e.target.value, bankBranch: "" })}
                            className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-4 focus:ring-[#0f2d3a]/10 focus:border-[#0f2d3a] transition-all duration-200 font-semibold bg-white"
                          >
                            <option value="">Select Bank</option>
                            {Object.keys(sriLankaBanks).map((b) => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Bank Branch Dropdown */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 ml-1 uppercase tracking-wider">Bank Branch <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <select
                            required
                            disabled={!formData.bankName}
                            value={formData.bankBranch}
                            onChange={(e) => setFormData({ ...formData, bankBranch: e.target.value })}
                            className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-4 focus:ring-[#0f2d3a]/10 focus:border-[#0f2d3a] transition-all duration-200 font-semibold bg-white disabled:bg-slate-50 disabled:text-slate-400"
                          >
                            <option value="">Select Branch</option>
                            {formData.bankName && sriLankaBanks[formData.bankName].map((br) => (
                              <option key={br} value={br}>{br}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Account Number & Account Holder Name */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 ml-1 uppercase tracking-wider">Account Number <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          required
                          value={formData.accountNumber}
                          onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                          placeholder="E.g., 8123456789"
                          className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[#0f2d3a]/10 focus:border-[#0f2d3a] transition-all duration-200 font-semibold"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 ml-1 uppercase tracking-wider">Account Holder Name <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          required
                          value={formData.accountHolderName}
                          onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                          placeholder="E.g., G Samuditha"
                          className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[#0f2d3a]/10 focus:border-[#0f2d3a] transition-all duration-200 font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* --- Section 3: Required Documents --- */}
                <div className="mt-2 mb-2">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1 select-none">Required Documents</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* NIC Front */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-semibold text-slate-500 ml-1 uppercase tracking-wider">NIC Front Photo</label>
                      <div className="relative flex items-center justify-between px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/40 text-sm font-semibold cursor-pointer hover:bg-slate-50 transition-colors">
                        <span className="text-slate-600 truncate max-w-[80%] select-none">
                          {nicFront ? nicFront.name : "Select file..."}
                        </span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => setNicFront(e.target.files?.[0] || null)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <HugeiconsIcon icon={Upload01Icon} className="w-4 h-4 text-slate-400" strokeWidth={2.5} />
                      </div>
                    </div>

                    {/* NIC Back */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-semibold text-slate-500 ml-1 uppercase tracking-wider">NIC Back Photo</label>
                      <div className="relative flex items-center justify-between px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/40 text-sm font-semibold cursor-pointer hover:bg-slate-50 transition-colors">
                        <span className="text-slate-600 truncate max-w-[80%] select-none">
                          {nicBack ? nicBack.name : "Select file..."}
                        </span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => setNicBack(e.target.files?.[0] || null)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <HugeiconsIcon icon={Upload01Icon} className="w-4 h-4 text-slate-400" strokeWidth={2.5} />
                      </div>
                    </div>

                    {/* Birth Certificate */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-semibold text-slate-500 ml-1 uppercase tracking-wider">Birth Certificate</label>
                      <div className="relative flex items-center justify-between px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/40 text-sm font-semibold cursor-pointer hover:bg-slate-50 transition-colors">
                        <span className="text-slate-600 truncate max-w-[80%] select-none">
                          {birthCertificate ? birthCertificate.name : "Select file..."}
                        </span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => setBirthCertificate(e.target.files?.[0] || null)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <HugeiconsIcon icon={Upload01Icon} className="w-4 h-4 text-slate-400" strokeWidth={2.5} />
                      </div>
                    </div>

                    {/* Police Report */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-semibold text-slate-500 ml-1 uppercase tracking-wider">Police Report</label>
                      <div className="relative flex items-center justify-between px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/40 text-sm font-semibold cursor-pointer hover:bg-slate-50 transition-colors">
                        <span className="text-slate-600 truncate max-w-[80%] select-none">
                          {policeReport ? policeReport.name : "Select file..."}
                        </span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => setPoliceReport(e.target.files?.[0] || null)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <HugeiconsIcon icon={Upload01Icon} className="w-4 h-4 text-slate-400" strokeWidth={2.5} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Read-only Branch Info Accent Card */}
                <div className="flex items-center gap-3.5 bg-slate-50 border border-slate-200/60 p-4 rounded-2xl select-none shrink-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-200/60 text-slate-600 flex items-center justify-center shrink-0">
                    <HugeiconsIcon icon={Location01Icon} className="w-5 h-5 text-slate-600" strokeWidth={2} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Assigned Branch</span>
                    <span className="text-sm font-semibold text-[#0f2d3a]">{branch} Branch</span>
                  </div>
                </div>
              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-4 select-none shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-full text-xs font-semibold transition-all cursor-pointer bg-white active:scale-95 shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAgent}
                  className="px-6 py-2 bg-[#000080] hover:bg-[#000066] active:scale-95 text-white rounded-full text-xs font-semibold shadow-[0_4px_12px_rgba(0,0,128,0.25)] transition-all cursor-pointer border-none outline-none disabled:opacity-60 flex items-center gap-2"
                >
                  {submittingAgent ? (
                    <>
                      <HugeiconsIcon icon={Loading03Icon} className="animate-spin h-4 w-4 text-white" strokeWidth={2} />
                      <span>Registering...</span>
                    </>
                  ) : (
                    <span>Register Agent</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>      )}                          {/* Agent Details View Modal */}
      {selectedAgentDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl border border-slate-200 overflow-hidden transform scale-100 transition-all animate-scale-up max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-8 pt-6 pb-4 border-b border-slate-200 shrink-0 bg-white select-none">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-[22px] font-semibold text-[#0f2d3a] tracking-tight leading-none">
                    {selectedAgentDetails.name}
                  </h2>
                  <span className={`text-[10px] font-semibold uppercase px-3 py-1 rounded-full border tracking-wide ${
                    (selectedAgentDetails.availability || selectedAgentDetails.status || "Active").toLowerCase() === "active"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-500 border-slate-200"
                  }`}>
                    {selectedAgentDetails.availability || selectedAgentDetails.status || "Active"}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-2">
                  ID: <span className="font-semibold text-slate-700">{selectedAgentDetails.agentId}</span> • <span className="font-semibold text-[#102A43]">{selectedAgentDetails.branch} Branch</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleOpenEditAgent(selectedAgentDetails)}
                  className="bg-[#102A43] hover:bg-[#000080] active:scale-95 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer border-none shadow-xs flex items-center gap-1.5"
                >
                  <HugeiconsIcon icon={Edit02Icon} className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                  <span>Edit Details</span>
                </button>
                <button
                  onClick={() => setSelectedAgentDetails(null)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer border-none"
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-8 overflow-y-auto bg-white flex-1 flex flex-col gap-8">
              
              {/* Agent Profile Details & Bank Account Details side-by-side or stacked as a clean list table */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Profile Details List */}
                <div className="flex flex-col gap-3">
                  <h3 className="text-[11px] font-semibold text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2.5 mb-1 select-none">
                    Agent Profile Info
                  </h3>
                  <div className="flex flex-col text-xs">
                    {[
                      { label: "Email Address", value: selectedAgentDetails.email },
                      { label: "Phone Number", value: selectedAgentDetails.phone || "-" },
                      { label: "NIC Number", value: selectedAgentDetails.nic },
                      { label: "Date of Birth", value: formatDate(selectedAgentDetails.dob) },
                      { label: "Province", value: selectedAgentDetails.province || "-" },
                      { label: "District / City", value: selectedAgentDetails.district || selectedAgentDetails.city || "-" },
                      { label: "Area", value: selectedAgentDetails.area || "-" },
                      { label: "Onboarded Date", value: formatDate(selectedAgentDetails.createdAt) },
                      { label: "Home Address", value: selectedAgentDetails.address }
                    ].map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center py-3 border-b border-slate-100/60 last:border-none gap-4">
                        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider select-none min-w-[120px] text-left">{item.label}</span>
                        <span className="text-slate-900 font-semibold text-right truncate max-w-xs">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bank Account Details List */}
                <div className="flex flex-col gap-3">
                  <h3 className="text-[11px] font-semibold text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2.5 mb-1 select-none">
                    Bank Account Details
                  </h3>
                  <div className="flex flex-col text-xs">
                    {[
                      { label: "Bank Name", value: selectedAgentDetails.bankName || "-" },
                      { label: "Branch Name", value: selectedAgentDetails.bankBranch || "-" },
                      { label: "Account Number", value: selectedAgentDetails.accountNumber || "-", isMono: true },
                      { label: "Account Type", value: selectedAgentDetails.accountType || "-" },
                      { label: "Account Holder", value: selectedAgentDetails.accountHolderName || "-" }
                    ].map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center py-3 border-b border-slate-100/60 last:border-none gap-4">
                        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider select-none min-w-[120px] text-left">{item.label}</span>
                        <span className={`text-slate-900 font-semibold text-right truncate max-w-xs ${item.isMono ? 'font-mono' : ''}`}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Registered Documents Section: Row layout */}
              <div className="mt-2 flex flex-col gap-3">
                <h3 className="text-[11px] font-semibold text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2.5 mb-1 select-none">
                  Uploaded Verification Documents
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "NIC Front Image", url: selectedAgentDetails.nicFront },
                    { label: "NIC Back Image", url: selectedAgentDetails.nicBack },
                    { label: "Birth Certificate", url: selectedAgentDetails.birthCertificate },
                    { label: "Police Report Document", url: selectedAgentDetails.policeReport }
                  ].map((doc, idx) => (
                    <div key={idx} className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between gap-3 text-xs">
                      <div>
                        <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider block mb-1 select-none">{doc.label}</span>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${doc.url ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                          <span className="text-[11px] text-slate-800 font-semibold">
                            {doc.url ? 'Uploaded' : 'Not Uploaded'}
                          </span>
                        </div>
                      </div>
                      {doc.url && (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 bg-[#000080]/10 hover:bg-[#000080] hover:text-white text-[#0f2d3a] font-semibold text-[10px] rounded-lg transition-all text-center no-underline cursor-pointer active:scale-95 shadow-sm"
                        >
                          View Document
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center px-8 py-4 border-t border-slate-200 bg-slate-50 shrink-0 select-none">
              <button
                onClick={() => {
                  setSelectedAgentDetails(null);
                  handleDeleteAgent(selectedAgentDetails._id);
                }}
                className="px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs rounded-full border border-red-200 cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
              >
                <HugeiconsIcon icon={Delete02Icon} className="w-3.5 h-3.5 text-red-500" strokeWidth={2.5} />
                <span>Delete Agent</span>
              </button>
              <button
                onClick={() => setSelectedAgentDetails(null)}
                className="px-8 py-2.5 bg-[#000080] hover:bg-[#000066] active:scale-95 text-white rounded-full text-xs font-semibold shadow-md cursor-pointer border-none outline-none transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Agent Modal */}
      {showEditAgentModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden transform scale-100 transition-all animate-scale-up max-h-[90vh] flex flex-col text-left">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-8 pt-6 pb-4 border-b border-slate-100 shrink-0 bg-white select-none">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight leading-none flex items-center gap-2">
                  <HugeiconsIcon icon={Edit02Icon} className="w-5 h-5 text-blue-600" strokeWidth={2.5} />
                  Edit Agent Details
                </h2>
                <p className="text-xs text-slate-400 font-medium mt-1">
                  Update personal profile & banking information for {editAgentForm.agentId || "Agent"} ({editAgentForm.branch} Branch)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditAgentModal(false)}
                className="text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer transition-colors p-1"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={2.5} />
              </button>
            </div>

            {/* Edit Form */}
            <form onSubmit={handleSaveEditAgent} className="p-8 overflow-y-auto flex-1 flex flex-col gap-6">
              {editAgentError && (
                <div className="bg-red-50 text-red-600 text-xs font-semibold px-4 py-3 rounded-2xl border border-red-100 flex items-center gap-2 shrink-0">
                  <HugeiconsIcon icon={Alert02Icon} className="w-4 h-4 shrink-0" strokeWidth={2.5} />
                  <span>{editAgentError}</span>
                </div>
              )}

              {/* Section 1: Personal Details */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">
                  Personal & Contact Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editAgentForm.name}
                      onChange={(e) => setEditAgentForm({ ...editAgentForm, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editAgentForm.phone}
                      onChange={(e) => setEditAgentForm({ ...editAgentForm, phone: e.target.value })}
                      placeholder="0712345678"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Email Address (Read-Only)
                    </label>
                    <input
                      type="email"
                      disabled
                      value={editAgentForm.email}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      National ID (NIC - Read-Only)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={editAgentForm.nic}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={editAgentForm.dob ? editAgentForm.dob.split("T")[0] : ""}
                      onChange={(e) => setEditAgentForm({ ...editAgentForm, dob: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Operating Status
                    </label>
                    <select
                      value={editAgentForm.availability || editAgentForm.status || "Active"}
                      onChange={(e) => setEditAgentForm({
                        ...editAgentForm,
                        availability: e.target.value,
                        status: e.target.value.toLowerCase()
                      })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Home Address
                  </label>
                  <textarea
                    rows={2}
                    value={editAgentForm.address}
                    onChange={(e) => setEditAgentForm({ ...editAgentForm, address: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Province
                    </label>
                    <input
                      type="text"
                      value={editAgentForm.province}
                      onChange={(e) => setEditAgentForm({ ...editAgentForm, province: e.target.value })}
                      placeholder="E.g., Southern Province"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      District / City
                    </label>
                    <input
                      type="text"
                      value={editAgentForm.district}
                      onChange={(e) => setEditAgentForm({ ...editAgentForm, district: e.target.value })}
                      placeholder="E.g., Galle"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Area / Town
                    </label>
                    <input
                      type="text"
                      value={editAgentForm.area}
                      onChange={(e) => setEditAgentForm({ ...editAgentForm, area: e.target.value })}
                      placeholder="E.g., Karapitiya"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Bank Account Details */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">
                  Direct Bank Account Credentials
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Bank Name
                    </label>
                    <select
                      value={editAgentForm.bankName}
                      onChange={(e) => setEditAgentForm({
                        ...editAgentForm,
                        bankName: e.target.value,
                        bankBranch: ""
                      })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Bank</option>
                      {Object.keys(sriLankaBanks).map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Bank Branch
                    </label>
                    <select
                      disabled={!editAgentForm.bankName}
                      value={editAgentForm.bankBranch}
                      onChange={(e) => setEditAgentForm({ ...editAgentForm, bankBranch: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <option value="">Select Branch</option>
                      {editAgentForm.bankName && sriLankaBanks[editAgentForm.bankName]?.map((br) => (
                        <option key={br} value={br}>{br}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={editAgentForm.accountNumber}
                      onChange={(e) => setEditAgentForm({ ...editAgentForm, accountNumber: e.target.value })}
                      placeholder="8123456789"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Account Type
                    </label>
                    <select
                      value={editAgentForm.accountType || "Savings Account"}
                      onChange={(e) => setEditAgentForm({ ...editAgentForm, accountType: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Savings Account">Savings Account</option>
                      <option value="Current Account">Current Account</option>
                      <option value="Salary Account">Salary Account</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      value={editAgentForm.accountHolderName}
                      onChange={(e) => setEditAgentForm({ ...editAgentForm, accountHolderName: e.target.value })}
                      placeholder="Account Holder"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 select-none">
                <button
                  type="button"
                  onClick={() => setShowEditAgentModal(false)}
                  className="px-6 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-full text-xs font-semibold transition-all cursor-pointer bg-white active:scale-95 shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAgent}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full text-xs font-semibold shadow-md transition-all cursor-pointer border-none flex items-center gap-1.5 disabled:opacity-60"
                >
                  {savingAgent ? (
                    <>
                      <HugeiconsIcon icon={Loading03Icon} className="animate-spin h-4 w-4 text-white" strokeWidth={2} />
                      <span>Saving Changes...</span>
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

      {/* Custom Popup Modal */}
      {customPopup.show && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-[0_20px_50px_rgba(15,45,58,0.15)] border border-slate-100 overflow-hidden transform scale-100 transition-all animate-scale-up text-left p-6 flex flex-col gap-4">
            
            {/* Header/Title with clean inline icon */}
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

            {/* Message Body */}
            <div>
              <p className="text-slate-500 text-[13px] font-semibold leading-relaxed">
                {customPopup.message}
              </p>
            </div>

            {/* Footer Buttons */}
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
                    className="px-6 py-2 bg-[#df3d3d] hover:bg-[#c53030] active:scale-95 text-white rounded-full text-xs font-semibold shadow-md transition-all cursor-pointer border-none"
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
      {/* Delete Agent Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden transform scale-100 transition-all animate-scale-up text-left p-8 flex flex-col gap-5">
            <div>
              <h3 className="font-semibold text-lg text-slate-900 tracking-tight select-none">
                Delete Agent Account
              </h3>
              <p className="text-xs font-semibold text-slate-400 mt-1 select-none">
                Please specify the reason and details for removing this agent.
              </p>
            </div>

            <form onSubmit={confirmDeleteAgent} className="flex flex-col gap-4">
              
              {/* Deletion Reason Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wider select-none">
                  Reason for Deletion <span className="text-red-500">*</span>
                </label>
                <select
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-slate-350 focus:bg-white transition-all select-none"
                  required
                >
                  <option value="Resigned">Resigned</option>
                  <option value="Suspended/Terminated">Suspended/Terminated</option>
                  <option value="Contract Ended">Contract Ended</option>
                  <option value="Incorrect Entry / Duplication">Incorrect Entry / Duplication</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Add Note textarea */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wider select-none">
                  Additional Notes / Remarks <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={deleteNote}
                  onChange={(e) => setDeleteNote(e.target.value)}
                  placeholder="Enter remarks about this deletion..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-slate-350 focus:bg-white transition-all resize-none"
                  required
                />
              </div>

              {/* Document Attach (Optional) file input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wider select-none">
                  Attach Proof Document (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <label className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-350 transition-all rounded-xl text-xs font-semibold text-slate-700 cursor-pointer select-none">
                    Choose File
                    <input
                      type="file"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setDeleteDoc(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                      accept=".pdf,image/*"
                    />
                  </label>
                  <span className="text-xs text-slate-500 font-medium truncate max-w-[200px]">
                    {deleteDoc ? deleteDoc.name : "No file attached"}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3.5 mt-2 border-t border-slate-100 pt-4 select-none">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletingAgentId(null);
                  }}
                  className="px-6 py-3 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-full text-xs font-semibold transition-all cursor-pointer bg-white active:scale-95 shadow-sm"
                  disabled={submittingDelete}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-red-650 hover:bg-red-700 active:scale-95 text-white rounded-full text-xs font-semibold shadow-md transition-all cursor-pointer border-none flex items-center justify-center gap-1.5"
                  disabled={submittingDelete}
                >
                  {submittingDelete ? (
                    <>
                      <HugeiconsIcon icon={Loading03Icon} className="animate-spin h-4 w-4 text-white" strokeWidth={2} />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Delete Agent</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Agent Edit Request Diff & Review Modal                   */}
      {/* ======================================================== */}
      {selectedAgentEditRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-100 overflow-hidden transform scale-100 transition-all animate-scale-up text-left p-6 sm:p-8 flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm ${
                  selectedAgentEditRequest.status === "Pending"
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : selectedAgentEditRequest.status === "Approved"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                  <HugeiconsIcon icon={Edit02Icon} className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900">
                      Agent Profile Edit Request: {selectedAgentEditRequest.agentName}
                    </h3>
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                      selectedAgentEditRequest.status === "Pending"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : selectedAgentEditRequest.status === "Approved"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}>
                      {selectedAgentEditRequest.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Agent ID: <span className="font-mono text-slate-700 font-bold">{selectedAgentEditRequest.agentId}</span> • NIC: <span className="font-mono text-slate-700 font-bold">{selectedAgentEditRequest.agentNic}</span> • Branch: {selectedAgentEditRequest.branch} • Submitted {formatDate(selectedAgentEditRequest.createdAt)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedAgentEditRequest(null)}
                className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer p-1 rounded-lg hover:bg-slate-100"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>

            {/* Diff Comparison Table */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Changes Requested for Verification ({selectedAgentEditRequest.requestType})
              </h4>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-4 w-1/3">Field Name</th>
                      <th className="py-3 px-4 w-1/3">Original Record</th>
                      <th className="py-3 px-4 w-1/3 bg-blue-50/50 text-blue-900">Requested Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.keys(selectedAgentEditRequest.requestedChanges || {}).map((key) => {
                      const origVal = (selectedAgentEditRequest.originalData as any)?.[key];
                      const newVal = (selectedAgentEditRequest.requestedChanges as any)?.[key];
                      const isChanged = origVal !== newVal;

                      const formatFieldName = (fieldName: string) => {
                        return fieldName
                          .replace(/([A-Z])/g, ' $1')
                          .replace(/^./, str => str.toUpperCase());
                      };

                      return (
                        <tr key={key} className={isChanged ? "bg-amber-50/20" : ""}>
                          <td className="py-3 px-4 font-semibold text-slate-700">
                            {formatFieldName(key)}
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-medium">
                            {origVal || <span className="text-slate-300 italic">None</span>}
                          </td>
                          <td className="py-3 px-4 font-bold text-sky-900 bg-sky-50/40">
                            {newVal || <span className="text-slate-300 italic">None</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Review Note & Status Information */}
            {selectedAgentEditRequest.status === "Pending" ? (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Review Notes / Approval Remarks
                </label>
                <input
                  type="text"
                  value={reviewNoteInput}
                  onChange={(e) => setReviewNoteInput(e.target.value)}
                  placeholder="e.g. Verified residential address and direct deposit settlement bank account."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span>Reviewed by: <strong className="text-slate-800">{selectedAgentEditRequest.reviewedBy || "Branch Staff"}</strong></span>
                  <span>Reviewed on: <strong className="text-slate-800">{formatDate(selectedAgentEditRequest.reviewedAt)}</strong></span>
                </div>
                <div className="text-slate-600 mt-1">
                  <strong>Notes:</strong> {selectedAgentEditRequest.reviewNote || "No notes recorded"}
                </div>
              </div>
            )}

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedAgentEditRequest(null)}
                className="px-6 py-2.5 rounded-full border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>

              {selectedAgentEditRequest.status === "Pending" && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setAgentEditRejectModal({
                        show: true,
                        request: selectedAgentEditRequest,
                        reason: ""
                      });
                    }}
                    disabled={reviewingEditRequest}
                    className="px-6 py-2.5 rounded-full bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold border border-red-200 cursor-pointer"
                  >
                    Reject Request
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerApproveAgentEdit(selectedAgentEditRequest)}
                    disabled={reviewingEditRequest}
                    className="px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md cursor-pointer border-none flex items-center gap-2"
                  >
                    {reviewingEditRequest && <HugeiconsIcon icon={Loading03Icon} className="w-4 h-4 animate-spin" />}
                    <span>Approve & Update Agent</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {agentEditRejectModal.show && agentEditRejectModal.request && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 p-6 flex flex-col gap-4">
            <h3 className="text-base font-bold text-slate-900">
              Reject Agent Edit Request
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Please enter the reason for rejecting Agent {agentEditRejectModal.request.agentName}'s profile changes. This reason will be emailed to {agentEditRejectModal.request.agentEmail}.
            </p>
            <textarea
              rows={3}
              required
              placeholder="e.g. Bank account holder name does not match official agent identity."
              value={agentEditRejectModal.reason}
              onChange={(e) => setAgentEditRejectModal({ ...agentEditRejectModal, reason: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAgentEditRejectModal({ show: false, request: null, reason: "" })}
                className="px-5 py-2.5 rounded-full border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!agentEditRejectModal.reason.trim() || reviewingEditRequest}
                onClick={() => {
                  const reqId = agentEditRejectModal.request?._id;
                  const reason = agentEditRejectModal.reason;
                  setAgentEditRejectModal({ show: false, request: null, reason: "" });
                  if (reqId) {
                    handleReviewAgentEditRequest(reqId, "Rejected", reason);
                  }
                }}
                className="px-6 py-2.5 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold shadow-md cursor-pointer border-none flex items-center gap-2"
              >
                {reviewingEditRequest && <HugeiconsIcon icon={Loading03Icon} className="w-4 h-4 animate-spin" />}
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Chat Bubble Button */}
      <button
        className="fixed bottom-8 right-8 z-40 bg-[#00ddff] hover:bg-[#00c8e6] text-white p-5 rounded-full shadow-2xl transition-all duration-150 hover:scale-110 active:scale-95 cursor-pointer focus:outline-none border-none flex items-center justify-center"
        aria-label="Chat support"
      >
        <HugeiconsIcon icon={BubbleChatIcon} className="w-7 h-7 text-white" strokeWidth={2} />
      </button>

    </div>
  );
}
