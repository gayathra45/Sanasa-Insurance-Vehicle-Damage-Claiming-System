"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import OfficeStaffNavbar from "@/app/Components/Office Staff/Navbar";
import { getApiUrl } from "@/app/config";
import { sriLankaBanks } from "../../utils/banks";

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

/**
 * AgentsPage Component
 * Provides a management workbench to search, register, view, and delete Insurance Agents assigned to the office branch.
 */
export default function AgentsPage() {
  const router = useRouter();

  // --- UI Display & Search States ---
  const [branch, setBranch] = useState("");
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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
          loadAgents(staffObj.branch);
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

  // --- Data Loading Operations ---
  // Loads all registered Insurance Agents belonging to the specific branch.
  const loadAgents = async (branchName: string) => {
    try {
      setLoading(true);
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}/office-staff/agents?branch=${encodeURIComponent(branchName)}`);
      if (!res.ok) {
        throw new Error("Failed to fetch agents.");
      }
      const data = await res.json();
      setAgents(data.agents || []);
    } catch (err: any) {
      console.error("Error loading agents:", err);
    } finally {
      setLoading(false);
    }
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

      const baseUrl = getApiUrl();
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

      const baseUrl = getApiUrl();
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

  // Filtered agents based on search query
  const filteredAgents = agents.filter(agent => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      agent.name?.toLowerCase().includes(q) ||
      agent.email?.toLowerCase().includes(q) ||
      agent.nic?.toLowerCase().includes(q) ||
      agent.address?.toLowerCase().includes(q)
    );
  });

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
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-xl font-semibold text-slate-800 flex items-center gap-2 pl-2 lg:pl-0">
                <span className="bg-[#102A43] text-white text-base px-4 py-2 rounded-xl font-black shadow-sm tracking-wide">
                  {branch || "Galle"} Branch
                </span>
                <span className="hidden md:inline text-slate-400 font-medium">— Insurance Agents</span>
              </h1>
            </div>
            
            <div className="flex items-center gap-5">
              {/* Notification Bell Icon */}
              <button className="relative p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer focus:outline-none">
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

          <main className="flex-1 p-6 lg:p-8 bg-slate-50 flex flex-col gap-6 transition-all duration-300">
            
            {/* Page Header Title */}
            <div className="flex items-center gap-2.5 mb-2 select-none">
              <svg className="w-6 h-6 text-slate-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.947 11.947 0 0112 21c-2.17 0-4.207-.576-5.963-1.584v-.109A6 6 0 0112 13.5c1.47 0 2.837.525 3.9 1.398M12 12a3 3 0 100-6 3 3 0 000 6zm6.5-3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zM5.058 15.05A6 6 0 001.5 19.5a9.379 9.379 0 002.625.372c.866 0 1.7-.117 2.492-.338A9.39 9.39 0 0012 18.75c-.328-.507-.566-1.077-.696-1.687A11.947 11.947 0 006 18c0-.623.095-1.223.27-1.786a4.126 4.126 0 00-6.19 2.535M7.5 9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
              <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
                Insurance Agents
              </h2>
            </div>

            {/* Actions Bar (Search + Register Button) */}
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between bg-white border border-slate-100 p-4 rounded-3xl shadow-sm select-none">
              
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md bg-slate-50 hover:bg-slate-100 focus-within:bg-white border border-slate-200 rounded-full pl-5 pr-2 py-2 flex items-center gap-3 transition-all duration-200 focus-within:shadow-md focus-within:border-amber-500 focus-within:ring-4 focus-within:ring-amber-500/10">
                <span className="text-slate-400 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search agent by name, email, NIC..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-slate-800 text-[14px] placeholder-slate-400 focus:outline-none font-semibold"
                />
              </div>

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
                className="bg-[#0f2d3a] hover:bg-[#0b222c] active:scale-95 text-white font-bold text-sm px-6 py-3 rounded-full transition-all duration-150 shadow-md cursor-pointer border-none flex items-center justify-center gap-2 select-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Register Agent
              </button>
            </div>

            {/* List / Loading Grid */}
            <div className="flex-1">
              {loading ? (
                <div className="bg-white border border-slate-100 rounded-[28px] p-16 flex flex-col items-center justify-center text-center shadow-sm min-h-[300px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
                  <span className="mt-3 text-slate-400 text-sm font-bold">Syncing Agent list...</span>
                </div>
              ) : filteredAgents.length === 0 ? (
                <div className="bg-white border border-slate-100 rounded-[30px] p-16 text-center shadow-sm select-none">
                  <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                  <p className="text-slate-500 font-extrabold text-sm uppercase tracking-wider">No Insurance Agents Registered.</p>
                  <p className="text-slate-400 text-xs mt-1.5 font-semibold">Click "Register Agent" to onboard your first field officer.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {filteredAgents.map((agent) => {
                    const initials = (agent.name || "A").substring(0, 1).toUpperCase();
                    const isOnline = (agent.availability || "Active") === "Active";

                    return (
                      <div
                        key={agent._id}
                        className="bg-white border-y border-r border-l-4 border-slate-200/80 border-l-[#0f2d3a]/70 hover:border-l-[#0f2d3a] hover:border-slate-300 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-md transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-5 relative group"
                      >
                        {/* Left Section: Profile Info */}
                        <div className="flex items-center gap-4.5 min-w-[240px]">
                          <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 text-[#0f2d3a] flex items-center justify-center font-black text-base select-none shadow-xs shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-extrabold text-slate-900 text-[15px] leading-tight truncate pr-4" title={agent.name}>
                              {agent.name}
                            </h3>
                            <span className="text-[10px] font-bold text-slate-400 block mt-1 uppercase tracking-wider">
                              ID: {agent.agentId}
                            </span>
                          </div>
                        </div>

                        {/* Middle Details Grid: Horizontal rows */}
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-y-3 gap-x-6 text-xs">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold select-none">Email Address</span>
                            <span className="text-slate-900 font-bold truncate" title={agent.email}>{agent.email}</span>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold select-none">NIC Number</span>
                            <span className="text-slate-900 font-bold">{agent.nic}</span>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold select-none">Onboarded Date</span>
                            <span className="text-slate-900 font-bold">{formatDate(agent.createdAt)}</span>
                          </div>
                        </div>

                        {/* Right Section: Status Badge & View Button */}
                        <div className="flex items-center justify-between md:justify-end gap-5 shrink-0 border-t border-slate-100 pt-3 md:pt-0 md:border-none">
                          <div className="select-none">
                            <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border tracking-wide ${
                              isOnline
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-500 border-slate-250"
                            }`}>
                              {isOnline ? "Active" : "Offline"}
                            </span>
                          </div>
                          <button
                            onClick={() => setSelectedAgentDetails(agent)}
                            className="px-5 py-2 bg-[#0f2d3a]/10 hover:bg-[#0f2d3a] hover:text-white text-[#0f2d3a] font-bold text-xs rounded-full transition-all cursor-pointer border-none active:scale-95 shadow-sm"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    );
                  })}
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
                <h2 className="text-[24px] font-black text-slate-900 tracking-tight leading-none">
                  Register New Insurance Agent
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                  Define agent profile and bank credentials
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-650 bg-transparent border-none outline-none cursor-pointer transition-colors p-1"
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
                <div className="bg-red-50 text-red-600 text-xs font-bold px-4 py-3 rounded-2xl border border-red-100 flex items-center gap-2 shrink-0">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="bg-emerald-50 text-emerald-600 text-xs font-bold px-4 py-3 rounded-2xl border border-emerald-100 flex items-center gap-2 shrink-0">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{formSuccess}</span>
                </div>
              )}

                {/* --- Section 1: General Details --- */}
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1 select-none">General Details</h3>
                  <div className="flex flex-col gap-4">
                    {/* Name */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-500 ml-1 uppercase tracking-wider">Full Name <span className="text-red-500">*</span></label>
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
                        <label className="text-[10px] font-black text-slate-500 ml-1 uppercase tracking-wider">Email Address <span className="text-red-500">*</span></label>
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
                        <label className="text-[10px] font-black text-slate-500 ml-1 uppercase tracking-wider">Phone Number <span className="text-red-500">*</span></label>
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
                        <label className="text-[10px] font-black text-slate-500 ml-1 uppercase tracking-wider">NIC Number <span className="text-red-500">*</span></label>
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
                        <label className="text-[10px] font-black text-slate-500 ml-1 uppercase tracking-wider">Date of Birth <span className="text-red-500">*</span></label>
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
                      <label className="text-[10px] font-black text-slate-500 ml-1 uppercase tracking-wider">Home Address <span className="text-red-500">*</span></label>
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
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1 select-none">Bank Account Details</h3>
                  <div className="flex flex-col gap-4">
                    {/* Bank Name & Branch Dropdowns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Bank Name Dropdown */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-500 ml-1 uppercase tracking-wider">Bank Name <span className="text-red-500">*</span></label>
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
                        <label className="text-[10px] font-black text-slate-500 ml-1 uppercase tracking-wider">Bank Branch <span className="text-red-500">*</span></label>
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
                        <label className="text-[10px] font-black text-slate-500 ml-1 uppercase tracking-wider">Account Number <span className="text-red-500">*</span></label>
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
                        <label className="text-[10px] font-black text-slate-500 ml-1 uppercase tracking-wider">Account Holder Name <span className="text-red-500">*</span></label>
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
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1 select-none">Required Documents</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* NIC Front */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-500 ml-1 uppercase tracking-wider">NIC Front Photo</label>
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
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                      </div>
                    </div>

                    {/* NIC Back */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-500 ml-1 uppercase tracking-wider">NIC Back Photo</label>
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
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                      </div>
                    </div>

                    {/* Birth Certificate */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-500 ml-1 uppercase tracking-wider">Birth Certificate</label>
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
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                      </div>
                    </div>

                    {/* Police Report */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-500 ml-1 uppercase tracking-wider">Police Report</label>
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
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Read-only Branch Info Accent Card */}
                <div className="flex items-center gap-3.5 bg-slate-50 border border-slate-200/60 p-4 rounded-2xl select-none shrink-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-200/60 text-slate-600 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Assigned Branch</span>
                    <span className="text-sm font-extrabold text-[#0f2d3a]">{branch} Branch</span>
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
                  disabled={submittingAgent}
                  className="px-6 py-2 bg-[#0f2d3a] hover:bg-[#0b222c] active:scale-95 text-white rounded-full text-xs font-bold shadow-[0_4px_12px_rgba(15,45,58,0.25)] transition-all cursor-pointer border-none outline-none disabled:opacity-60 flex items-center gap-2"
                >
                  {submittingAgent ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
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
                  <h2 className="text-[22px] font-black text-[#0f2d3a] tracking-tight leading-none">
                    {selectedAgentDetails.name}
                  </h2>
                  <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border tracking-wide ${
                    (selectedAgentDetails.availability || "Active") === "Active"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-500 border-slate-200"
                  }`}>
                    {selectedAgentDetails.availability || "Active"}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-bold mt-2">
                  ID: {selectedAgentDetails.agentId} • {selectedAgentDetails.branch} Branch
                </p>
              </div>
              <button
                onClick={() => setSelectedAgentDetails(null)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold border-none bg-transparent cursor-pointer transition-colors p-1"
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-8 overflow-y-auto bg-white flex-1 flex flex-col gap-8">
              
              {/* Agent Profile Details & Bank Account Details side-by-side or stacked as a clean list table */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Profile Details List */}
                <div className="flex flex-col gap-3">
                  <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2.5 mb-1 select-none">
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
                        <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider select-none min-w-[120px] text-left">{item.label}</span>
                        <span className="text-slate-900 font-bold text-right truncate max-w-xs">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bank Account Details List */}
                <div className="flex flex-col gap-3">
                  <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2.5 mb-1 select-none">
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
                        <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider select-none min-w-[120px] text-left">{item.label}</span>
                        <span className={`text-slate-900 font-bold text-right truncate max-w-xs ${item.isMono ? 'font-mono' : ''}`}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Registered Documents Section: Row layout */}
              <div className="mt-2 flex flex-col gap-3">
                <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2.5 mb-1 select-none">
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
                        <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1 select-none">{doc.label}</span>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${doc.url ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                          <span className="text-[11px] text-slate-800 font-bold">
                            {doc.url ? 'Uploaded' : 'Not Uploaded'}
                          </span>
                        </div>
                      </div>
                      {doc.url && (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 bg-[#0f2d3a]/10 hover:bg-[#0f2d3a] hover:text-white text-[#0f2d3a] font-bold text-[10px] rounded-lg transition-all text-center no-underline cursor-pointer active:scale-95 shadow-sm"
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
            <div className="flex justify-between items-center px-8 py-5 border-t border-slate-200 bg-slate-50 shrink-0">
              <button
                onClick={() => {
                  setSelectedAgentDetails(null);
                  handleDeleteAgent(selectedAgentDetails._id);
                }}
                className="px-6 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-full border border-red-200 cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
              >
                <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Agent
              </button>
              <button
                onClick={() => setSelectedAgentDetails(null)}
                className="px-8 py-3 bg-[#0f2d3a] hover:bg-[#0b222c] active:scale-95 text-white rounded-full text-sm font-bold shadow-md cursor-pointer border-none outline-none transition-all"
              >
                Close
              </button>
            </div>
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
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              ) : customPopup.type === "confirm" ? (
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              )}
              <h3 className="font-black text-base text-slate-800 tracking-tight leading-none">
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
                    className="px-5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-full text-xs font-bold transition-all cursor-pointer bg-white active:scale-95 shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setCustomPopup({ ...customPopup, show: false });
                      if (customPopup.onConfirm) customPopup.onConfirm();
                    }}
                    className="px-6 py-2 bg-[#df3d3d] hover:bg-[#c53030] active:scale-95 text-white rounded-full text-xs font-bold shadow-md transition-all cursor-pointer border-none"
                  >
                    Confirm
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setCustomPopup({ ...customPopup, show: false })}
                  className="px-6 py-2 bg-[#0f2d3a] hover:bg-[#0b222c] active:scale-95 text-white rounded-full text-xs font-bold shadow-md transition-all cursor-pointer border-none"
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
              <h3 className="font-black text-lg text-slate-900 tracking-tight select-none">
                Delete Agent Account
              </h3>
              <p className="text-xs font-semibold text-slate-400 mt-1 select-none">
                Please specify the reason and details for removing this agent.
              </p>
            </div>

            <form onSubmit={confirmDeleteAgent} className="flex flex-col gap-4">
              
              {/* Deletion Reason Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider select-none">
                  Reason for Deletion <span className="text-red-500">*</span>
                </label>
                <select
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-slate-350 focus:bg-white transition-all select-none"
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
                <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider select-none">
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
                <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider select-none">
                  Attach Proof Document (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <label className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-350 transition-all rounded-xl text-xs font-bold text-slate-700 cursor-pointer select-none">
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
                  <span className="text-xs text-slate-500 font-bold truncate max-w-[200px]">
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
                  className="px-6 py-3 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-full text-xs font-bold transition-all cursor-pointer bg-white active:scale-95 shadow-sm"
                  disabled={submittingDelete}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-red-650 hover:bg-red-700 active:scale-95 text-white rounded-full text-xs font-bold shadow-md transition-all cursor-pointer border-none flex items-center justify-center gap-1.5"
                  disabled={submittingDelete}
                >
                  {submittingDelete ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
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

    </div>
  );
}
