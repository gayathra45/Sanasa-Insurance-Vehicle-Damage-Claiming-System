"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import OfficeStaffNavbar from "@/app/Components/Office Staff/Navbar";

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
    password: ""
  });
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [submittingAgent, setSubmittingAgent] = useState(false);

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
      const res = await fetch(`http://localhost:5000/api/office-staff/agents?branch=${encodeURIComponent(branchName)}`);
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
    if (formData.password.length < 6) return setFormError("Password must be at least 6 characters.");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      return setFormError("Please enter a valid email address.");
    }

    const nicRegex = /^([0-9]{9}[vVxX]|[0-9]{12})$/;
    if (!nicRegex.test(formData.nic.trim())) {
      return setFormError("Invalid NIC format. Must be 9 digits followed by V/X, or exactly 12 digits.");
    }

    setSubmittingAgent(true);
    try {
      const res = await fetch("http://localhost:5000/api/office-staff/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, branch })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to register agent.");
      }

      setFormSuccess("Agent registered successfully!");
      setFormData({ name: "", email: "", nic: "", dob: "", address: "", password: "" });
      
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

  const handleDeleteAgent = async (agentId: string) => {
    setCustomPopup({
      show: true,
      title: "Confirm Deletion",
      message: "Are you sure you want to delete this agent? This action cannot be undone.",
      type: "confirm",
      onConfirm: async () => {
        try {
          const res = await fetch(`http://localhost:5000/api/office-staff/agents/${agentId}`, {
            method: "DELETE"
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
          loadAgents(branch);
        } catch (err: any) {
          console.error(err);
          setCustomPopup({
            show: true,
            title: "Error",
            message: err.message || "Failed to delete agent.",
            type: "alert"
          });
        }
      }
    });
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
          <header className="bg-white border-b border-slate-100 text-slate-800 px-8 py-4 flex justify-between items-center select-none shadow-sm flex-shrink-0 h-[80px] sticky top-0 z-30">
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
                <span className="bg-[#102A43] text-white text-base px-3.5 py-1.5 rounded-xl font-black shadow-sm tracking-wide">
                  {branch} Branch
                </span>
                <span className="hidden lg:inline"> — Insurance Agents</span>
              </h1>
            </div>
            
            <div className="text-sm font-semibold bg-slate-100 px-4 py-1.5 rounded-full text-slate-600 border border-slate-200">
              Staff Portal
            </div>
          </header>

          <main className="flex-1 p-6 lg:p-8 bg-slate-50 flex flex-col gap-6 animate-fade-in">
            
            {/* Page Header Title */}
            <div className="flex items-center gap-2.5 mb-2 select-none">
              <svg className="w-6 h-6 text-slate-700 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
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

              {/* Add New Agent Button */}
              <button
                onClick={() => {
                  setFormData({ name: "", email: "", nic: "", dob: "", address: "", password: "" });
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAgents.map((agent) => {
                    const initials = (agent.name || "A").substring(0, 1).toUpperCase();
                    const isActive = agent.status !== "inactive";

                    return (
                      <div
                        key={agent._id}
                        className="bg-white border border-slate-100 hover:border-slate-200/80 rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-md hover:scale-[1.01] transition-all duration-200 flex flex-col justify-between gap-5 relative group"
                      >
                        {/* Status Badge Top-Right */}
                        <div className="absolute top-6 right-6 select-none">
                          <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>
                            {isActive ? "Active" : "Pending Activation"}
                          </span>
                        </div>

                        {/* Top Block: Profile Initial & Name */}
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-black text-lg select-none shadow-sm">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-extrabold text-slate-800 text-base leading-tight truncate pr-16" title={agent.name}>
                              {agent.name}
                            </h3>
                            <span className="text-[10px] font-bold text-slate-400 block mt-1 uppercase tracking-wider">
                              Onboarded {formatDate(agent.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Info details block */}
                        <div className="border-t border-slate-100 pt-4 flex flex-col gap-2.5 text-xs font-semibold text-slate-600">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black select-none">Email Address</span>
                            <span className="text-slate-800 truncate" title={agent.email}>{agent.email}</span>
                          </div>
                          
                          <div className="flex justify-between gap-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black select-none">NIC Number</span>
                              <span className="text-slate-800">{agent.nic}</span>
                            </div>
                            <div className="flex flex-col gap-0.5 text-right">
                              <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black select-none">Date of Birth</span>
                              <span className="text-slate-800">{formatDate(agent.dob)}</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black select-none">Home Address</span>
                            <span className="text-slate-700 line-clamp-1" title={agent.address}>{agent.address}</span>
                          </div>
                        </div>

                        {/* Footer Action Bar */}
                        <div className="border-t border-slate-100 pt-3.5 flex justify-end items-center">
                          <button
                            onClick={() => handleDeleteAgent(agent._id)}
                            className="bg-transparent hover:bg-red-50 text-red-500 hover:text-red-700 p-2 rounded-xl border-none cursor-pointer flex items-center justify-center transition-all group/btn"
                            title="Delete Agent Account"
                          >
                            <svg className="w-5 h-5 text-red-500 hover:text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden transform scale-100 transition-all animate-scale-up">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#0f2d3a] to-[#1a4a60] px-8 py-5 flex justify-between items-center text-white select-none">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <h2 className="font-extrabold text-lg tracking-tight">Register New Insurance Agent</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-white/80 hover:text-white bg-transparent border-none outline-none cursor-pointer transition-colors p-1 rounded-lg hover:bg-white/10"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content / Form */}
            <form onSubmit={handleFormSubmit} className="p-8 flex flex-col gap-5">
              {formError && (
                <div className="bg-red-50 text-red-600 text-xs font-bold px-4 py-3 rounded-2xl border border-red-100 flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="bg-emerald-50 text-emerald-600 text-xs font-bold px-4 py-3 rounded-2xl border border-emerald-100 flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Form Group: Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-500 ml-1 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="E.g., John Doe"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[#0f2d3a]/10 focus:border-[#0f2d3a] transition-all duration-200 font-semibold"
                />
              </div>

              {/* Form Row: Email & NIC */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-500 ml-1 uppercase tracking-wider">Email Address</label>
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
                  <label className="text-[10px] font-black text-slate-500 ml-1 uppercase tracking-wider">NIC Number</label>
                  <input
                    type="text"
                    required
                    value={formData.nic}
                    onChange={(e) => setFormData({ ...formData, nic: e.target.value })}
                    placeholder="E.g., 199912345678 or 991234567V"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[#0f2d3a]/10 focus:border-[#0f2d3a] transition-all duration-200 font-semibold"
                  />
                </div>
              </div>

              {/* Form Row: DOB & Password */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-500 ml-1 uppercase tracking-wider">Date of Birth</label>
                  <input
                    type="date"
                    required
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-4 focus:ring-[#0f2d3a]/10 focus:border-[#0f2d3a] transition-all duration-200 font-semibold"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-500 ml-1 uppercase tracking-wider">Password</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min. 6 characters"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[#0f2d3a]/10 focus:border-[#0f2d3a] transition-all duration-200 font-semibold"
                  />
                </div>
              </div>

              {/* Form Group: Address */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-500 ml-1 uppercase tracking-wider">Home Address</label>
                <textarea
                  required
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter home address here..."
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[#0f2d3a]/10 focus:border-[#0f2d3a] transition-all duration-200 font-semibold resize-none"
                />
              </div>

              {/* Read-only Branch Info Accent Card */}
              <div className="flex items-center gap-3.5 bg-slate-50 border border-slate-200/60 p-4 rounded-2xl select-none">
                <div className="w-9 h-9 rounded-xl bg-slate-200/60 text-slate-600 flex items-center justify-center flex-shrink-0">
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
              <div className="flex justify-end gap-3.5 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-full text-sm font-bold transition-all cursor-pointer bg-white active:scale-95 shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAgent}
                  className="px-8 py-3 bg-[#0f2d3a] hover:bg-[#0b222c] active:scale-95 text-white rounded-full text-sm font-bold shadow-lg shadow-[#0f2d3a]/25 transition-all cursor-pointer border-none outline-none disabled:opacity-60 flex items-center gap-2"
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
        </div>
      )}

                  {/* Custom Popup Modal */}
      {customPopup.show && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-[0_20px_50px_rgba(15,45,58,0.15)] border border-slate-100 overflow-hidden transform scale-100 transition-all animate-scale-up text-left p-6 flex flex-col gap-4">
            
            {/* Header/Title with clean inline icon */}
            <div className="flex items-center gap-3.5">
              {customPopup.type === "success" ? (
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              ) : customPopup.type === "confirm" ? (
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center flex-shrink-0">
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

    </div>
  );
}
