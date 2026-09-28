"use client";

import React, { useState, useEffect } from "react";
import AdminNavbar from "@/app/Components/Admin/Navbar";
import { API_URL } from "@/app/config";
import UserAvatarDropdown from "@/app/Components/UserAvatarDropdown";
import SimpleLoader from "@/app/Components/SimpleLoader";
import { sriLankaLocations } from "../../utils/locations";
import { sriLankaBanks } from "../../utils/banks";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  BubbleChatIcon,
  Menu01Icon,
  Search01Icon,
  RefreshIcon,
  Loading03Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  AlertCircleIcon,
  UserGroupIcon,
  Location01Icon,
  UserIcon,
  Mail01Icon,
  Call02Icon,
  Building04Icon,
  Shield01Icon,
  CreditCardIcon,
  ViewIcon,
  Edit02Icon,
  Delete02Icon,
  CheckmarkBadge01Icon
} from "@hugeicons/core-free-icons";

interface AgentRecord {
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

export default function AdminAgentsPage() {
  const [agentsList, setAgentsList] = useState<AgentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // View modal state
  const [viewingAgent, setViewingAgent] = useState<AgentRecord | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Edit modal state
  const [editingAgent, setEditingAgent] = useState<AgentRecord | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    nic: "",
    phone: "",
    dob: "",
    branch: "",
    province: "",
    district: "",
    city: "",
    area: "",
    address: "",
    bankName: "",
    bankBranch: "",
    accountNumber: "",
    accountType: "Savings",
    accountHolderName: "",
    status: "active",
    availability: "Active"
  });

  // Delete modal state
  const [deletingAgentId, setDeletingAgentId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Alert popup
  const [popup, setPopup] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "info";
  }>({ show: false, title: "", message: "", type: "info" });

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/agents?branch=${encodeURIComponent(branchFilter)}&status=${encodeURIComponent(statusFilter)}&search=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (res.ok) {
        setAgentsList(data.agents || []);
      }
    } catch (err) {
      console.error("Error fetching agents list:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [branchFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAgents();
  };

  const openViewModal = (agent: AgentRecord) => {
    setViewingAgent(agent);
    setShowViewModal(true);
  };

  const openEditModal = (agent: AgentRecord) => {
    setEditingAgent(agent);
    setEditFormData({
      name: agent.name || "",
      email: agent.email || "",
      nic: agent.nic || "",
      phone: agent.phone || "",
      dob: agent.dob || "",
      branch: agent.branch || "",
      province: agent.province || "",
      district: agent.district || "",
      city: agent.city || "",
      area: agent.area || "",
      address: agent.address || "",
      bankName: agent.bankName || "",
      bankBranch: agent.bankBranch || "",
      accountNumber: agent.accountNumber || "",
      accountType: agent.accountType || "Savings",
      accountHolderName: agent.accountHolderName || agent.name || "",
      status: agent.status || "active",
      availability: agent.availability || "Active"
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent) return;

    setSavingEdit(true);
    try {
      const res = await fetch(`${API_URL}/admin/agents/${editingAgent._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update agent details.");

      setPopup({
        show: true,
        title: "Agent Profile Updated",
        message: `Agent ${editFormData.name} (${editingAgent.agentId}) details updated successfully in the database.`,
        type: "success"
      });

      setShowEditModal(false);
      fetchAgents();
    } catch (err: any) {
      setPopup({
        show: true,
        title: "Update Failed",
        message: err.message || "Failed to update agent.",
        type: "error"
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteAgent = async () => {
    if (!deletingAgentId) return;

    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/admin/agents/${deletingAgentId}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete agent.");

      setPopup({
        show: true,
        title: "Agent Removed",
        message: "Agent profile has been deleted from the database.",
        type: "success"
      });

      setDeletingAgentId(null);
      fetchAgents();
    } catch (err: any) {
      setPopup({
        show: true,
        title: "Deletion Failed",
        message: err.message || "Failed to delete agent.",
        type: "error"
      });
    } finally {
      setDeleting(false);
    }
  };

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

  const getFullImageUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
    return `http://localhost:5000${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const uniqueBranches = Array.from(new Set(agentsList.map(a => a.branch).filter(Boolean)));

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
                <HugeiconsIcon icon={Menu01Icon} className="w-6 h-6" strokeWidth={2.5} />
              </button>
              <h1 className="lg:hidden text-lg font-bold text-slate-800 tracking-tight">
                Agents
              </h1>
              <h1 className="hidden lg:flex text-xl font-semibold text-slate-800 items-center gap-2 pl-2 lg:pl-0 truncate">
                <span className="bg-[#102A43] text-white text-base px-4 py-2 rounded-xl font-semibold shadow-sm tracking-wide">Admin Portal</span>
                <span className="hidden lg:inline"> — Insurance Agents Directory</span>
              </h1>
            </div>
            <div className="flex items-center gap-5">
              <div className="text-sm font-semibold bg-slate-100 px-4 py-2 rounded-full text-slate-600 border border-slate-200">
                System Admin
              </div>
              <UserAvatarDropdown userType="admin" />
            </div>
          </header>

          <main className="flex-1 p-6 lg:p-8 bg-slate-50 flex flex-col gap-6">
            
            {/* Top Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Search Box */}
              <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search agent by name, ID, email, NIC, or phone..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#102A43]/20 focus:border-[#102A43] bg-white shadow-xs"
                />
                <HugeiconsIcon icon={Search01Icon} className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </form>

              {/* Filters & Refresh */}
              <div className="flex items-center gap-3 flex-wrap">
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white shadow-xs focus:outline-none"
                >
                  <option value="All">All Branches</option>
                  {uniqueBranches.map(b => (
                    <option key={b} value={b}>{b} Branch</option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white shadow-xs focus:outline-none"
                >
                  <option value="All">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>

                <button
                  onClick={fetchAgents}
                  className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer shadow-xs"
                  title="Refresh Directory"
                >
                  <HugeiconsIcon icon={RefreshIcon} className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* Agents Table List */}
            {loading ? (
              <SimpleLoader message="Loading insurance agents directory..." theme="slate" />
            ) : agentsList.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center text-slate-400 font-semibold shadow-xs">
                No insurance agents found matching the selected criteria.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {/* Table Header */}
                <div className="hidden md:grid md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1.4fr)_minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,1.8fr)] gap-4 px-5 py-3 text-slate-500 font-medium text-[10px] uppercase tracking-wider select-none bg-slate-50 rounded-xl border border-slate-200/60 items-center">
                  <div>Agent & Identification</div>
                  <div>Assigned Branch</div>
                  <div>District / Province</div>
                  <div>Contact Details</div>
                  <div>Account Status</div>
                  <div className="text-right">Actions</div>
                </div>

                {/* Table Rows */}
                {agentsList.map((agent) => (
                  <div
                    key={agent._id}
                    className="bg-white border-l-[6px] border-l-[#102A43] border border-slate-200 rounded-xl px-5 py-4 flex flex-col md:grid md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1.4fr)_minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,1.8fr)] md:items-center gap-4 transition-all duration-150 shadow-xs hover:shadow-md"
                  >
                    {/* Col 1: Agent & ID */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-[#102A43] to-blue-900 text-white font-bold text-sm flex items-center justify-center shrink-0">
                        {agent.profilePhoto ? (
                          <img src={getFullImageUrl(agent.profilePhoto)} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span>{(agent.name || "A").substring(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <h3 className="font-bold text-sm text-slate-900 truncate">
                          {agent.name}
                        </h3>
                        <span className="text-[11px] text-slate-500 font-mono font-medium">
                          {agent.agentId} • NIC: {agent.nic}
                        </span>
                      </div>
                    </div>

                    {/* Col 2: Branch */}
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider md:hidden">Branch</span>
                      <span className="text-slate-800 text-xs font-bold">
                        {agent.branch} Branch
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Joined {formatDate(agent.createdAt)}
                      </span>
                    </div>

                    {/* Col 3: District / Province */}
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider md:hidden">Location</span>
                      <span className="text-slate-700 text-xs font-semibold">{agent.district || agent.city || "-"}</span>
                      <span className="text-[10px] text-slate-400">{agent.province || "-"}</span>
                    </div>

                    {/* Col 4: Contact */}
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider md:hidden">Contact</span>
                      <span className="text-slate-700 text-xs font-semibold truncate" title={agent.email}>{agent.email}</span>
                      <span className="text-slate-500 text-xs font-mono">{agent.phone || "-"}</span>
                    </div>

                    {/* Col 5: Status */}
                    <div className="flex items-center">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                        agent.status === "active" || !agent.status
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}>
                        {agent.status || "active"}
                      </span>
                    </div>

                    {/* Col 6: Actions */}
                    <div className="flex items-center justify-between md:justify-end gap-2 pt-3 md:pt-0 border-t md:border-0 border-slate-100">
                      <button
                        onClick={() => openViewModal(agent)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        View
                      </button>
                      <button
                        onClick={() => openEditModal(agent)}
                        className="px-3 py-1.5 bg-[#102A43] hover:bg-[#163859] text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                      >
                        Edit in DB
                      </button>
                      <button
                        onClick={() => setDeletingAgentId(agent._id)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-all cursor-pointer border border-rose-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ======================================================== */}
      {/* View Agent Modal (Complete Details & KYC Viewer)         */}
      {/* ======================================================== */}
      {showViewModal && viewingAgent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#102A43] text-white font-bold flex items-center justify-center text-sm">
                  {(viewingAgent.name || "A").substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{viewingAgent.name}</h3>
                  <span className="text-xs text-slate-500 font-mono font-medium">
                    ID: {viewingAgent.agentId} • {viewingAgent.branch} Branch
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer p-1"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex flex-col gap-6">
              {/* Personal info grid */}
              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Personal & Contact Info</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 block font-semibold">NIC Number</span>
                    <strong className="text-slate-800 font-mono">{viewingAgent.nic}</strong>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 block font-semibold">Contact Phone</span>
                    <strong className="text-slate-800 font-mono">{viewingAgent.phone || "N/A"}</strong>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 block font-semibold">Official Email</span>
                    <strong className="text-slate-800 truncate block">{viewingAgent.email}</strong>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 block font-semibold">Date of Birth</span>
                    <strong className="text-slate-800">{formatDate(viewingAgent.dob)}</strong>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 block font-semibold">District / Province</span>
                    <strong className="text-slate-800">{viewingAgent.district || viewingAgent.city || "-"} ({viewingAgent.province || "-"})</strong>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 block font-semibold">Service Area</span>
                    <strong className="text-slate-800">{viewingAgent.area || "N/A"}</strong>
                  </div>
                  <div className="sm:col-span-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 block font-semibold">Residential Address</span>
                    <strong className="text-slate-800">{viewingAgent.address}</strong>
                  </div>
                </div>
              </div>

              {/* Bank Details */}
              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Settlement Bank Account</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 block font-semibold">Bank Name</span>
                    <strong className="text-slate-800">{viewingAgent.bankName || "Not Provided"}</strong>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 block font-semibold">Branch</span>
                    <strong className="text-slate-800">{viewingAgent.bankBranch || "Not Provided"}</strong>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 block font-semibold">Account Number</span>
                    <strong className="text-slate-800 font-mono">{viewingAgent.accountNumber || "Not Provided"}</strong>
                  </div>
                </div>
              </div>

              {/* KYC Documents */}
              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">KYC Verification Files</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "NIC Front", url: viewingAgent.nicFront },
                    { label: "NIC Back", url: viewingAgent.nicBack },
                    { label: "Birth Certificate", url: viewingAgent.birthCertificate },
                    { label: "Police Clearance", url: viewingAgent.policeReport }
                  ].map((doc, idx) => (
                    <div key={idx} className="border border-slate-200 rounded-xl p-3 bg-white flex flex-col gap-2 text-center">
                      <span className="text-[10px] font-bold text-slate-600 truncate">{doc.label}</span>
                      <div className="w-full aspect-[4/3] bg-slate-50 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center">
                        {doc.url ? (
                          <img
                            src={getFullImageUrl(doc.url)}
                            alt={doc.label}
                            onClick={() => setPreviewImage({ url: getFullImageUrl(doc.url), title: `${doc.label} - ${viewingAgent.name}` })}
                            className="w-full h-full object-cover cursor-zoom-in hover:scale-105 transition-transform"
                          />
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No File</span>
                        )}
                      </div>
                      {doc.url && (
                        <button
                          onClick={() => setPreviewImage({ url: getFullImageUrl(doc.url), title: `${doc.label} - ${viewingAgent.name}` })}
                          className="py-1 bg-sky-50 text-sky-700 text-[10px] font-semibold rounded cursor-pointer border-none"
                        >
                          View Zoom
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl cursor-pointer border-none"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Edit Agent in Database Modal                             */}
      {/* ======================================================== */}
      {showEditModal && editingAgent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Agent Record in Database</h3>
                <span className="text-xs text-slate-500 font-mono">
                  Agent ID: {editingAgent.agentId} • Database ObjectId: {editingAgent._id}
                </span>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer p-1"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEdit} className="p-6 overflow-y-auto flex flex-col gap-6">
              {/* Section 1: Core Details */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">1. Core Profile Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-[#102A43]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">National ID (NIC) *</label>
                    <input
                      type="text"
                      required
                      value={editFormData.nic}
                      onChange={(e) => setEditFormData({ ...editFormData, nic: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 font-mono bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-[#102A43]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Official Email Address *</label>
                    <input
                      type="email"
                      required
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-[#102A43]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Contact Phone</label>
                    <input
                      type="text"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 font-mono bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-[#102A43]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Assigned Branch *</label>
                    <input
                      type="text"
                      required
                      value={editFormData.branch}
                      onChange={(e) => setEditFormData({ ...editFormData, branch: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-[#102A43]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={editFormData.dob}
                      onChange={(e) => setEditFormData({ ...editFormData, dob: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-[#102A43]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Account Status</label>
                    <select
                      value={editFormData.status}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-[#102A43]"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Duty Availability</label>
                    <select
                      value={editFormData.availability}
                      onChange={(e) => setEditFormData({ ...editFormData, availability: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-[#102A43]"
                    >
                      <option value="Active">Active (On Duty)</option>
                      <option value="Offline">Offline (Off Duty)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Location */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">2. Location & Field Assignment</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">District</label>
                    <input
                      type="text"
                      value={editFormData.district}
                      onChange={(e) => setEditFormData({ ...editFormData, district: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">City / Town</label>
                    <input
                      type="text"
                      value={editFormData.city}
                      onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Coverage Area</label>
                    <input
                      type="text"
                      value={editFormData.area}
                      onChange={(e) => setEditFormData({ ...editFormData, area: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50/50"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-slate-600 mb-1">Permanent Residential Address</label>
                    <input
                      type="text"
                      value={editFormData.address}
                      onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50/50"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Bank Details */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">3. Settlement Bank Account Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={editFormData.bankName}
                      onChange={(e) => setEditFormData({ ...editFormData, bankName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Bank Branch</label>
                    <input
                      type="text"
                      value={editFormData.bankBranch}
                      onChange={(e) => setEditFormData({ ...editFormData, bankBranch: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={editFormData.accountNumber}
                      onChange={(e) => setEditFormData({ ...editFormData, accountNumber: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 font-mono bg-slate-50/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Account Holder Name</label>
                    <input
                      type="text"
                      value={editFormData.accountHolderName}
                      onChange={(e) => setEditFormData({ ...editFormData, accountHolderName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50/50"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-6 py-2.5 rounded-xl bg-[#102A43] hover:bg-[#163859] text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  {savingEdit ? (
                    <>
                      <HugeiconsIcon icon={Loading03Icon} className="w-4 h-4 animate-spin" />
                      <span>Saving to Database...</span>
                    </>
                  ) : (
                    <span>Save Agent Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Delete Confirmation Modal                                */}
      {/* ======================================================== */}
      {deletingAgentId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <HugeiconsIcon icon={Delete02Icon} className="w-6 h-6" strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Agent Profile?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to permanently delete this insurance agent from the database? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletingAgentId(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAgent}
                disabled={deleting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                {deleting && <HugeiconsIcon icon={Loading03Icon} className="w-4 h-4 animate-spin" />}
                <span>Delete Agent</span>
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
      {/* Alert Dialog Popup                                       */}
      {/* ======================================================== */}
      {popup.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-slate-100 flex flex-col items-center text-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
              popup.type === "success" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
            }`}>
              <HugeiconsIcon icon={popup.type === "success" ? CheckmarkCircle01Icon : AlertCircleIcon} className="w-7 h-7" strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{popup.title}</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{popup.message}</p>
            </div>
            <button
              onClick={() => setPopup({ ...popup, show: false })}
              className="w-full py-2.5 rounded-full bg-[#102A43] hover:bg-[#163859] text-white text-xs font-semibold shadow-sm border-none cursor-pointer mt-1"
            >
              OK
            </button>
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
