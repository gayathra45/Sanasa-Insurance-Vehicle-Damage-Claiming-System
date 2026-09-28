"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AgentNavbar from "@/app/Components/Agent/Navbar";
import AgentFooter from "@/app/Components/Agent/Footer";
import { API_URL } from "@/app/config";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserCircleIcon,
  UserIcon,
  Mail01Icon,
  Call02Icon,
  Location01Icon,
  Shield01Icon,
  CreditCardIcon,
  File01Icon,
  LockPasswordIcon,
  CheckmarkCircle01Icon,
  AlertCircleIcon,
  ViewIcon,
  Loading03Icon,
  Cancel01Icon,
  CheckmarkBadge01Icon,
  Building04Icon,
  Calendar03Icon,
  InformationCircleIcon
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

export default function AgentProfilePage() {
  const router = useRouter();

  const [agent, setAgent] = useState<AgentProfileData | null>(null);
  const [stats, setStats] = useState({ totalClaims: 0, activeClaims: 0, completedInspections: 0 });
  const [assignedClaims, setAssignedClaims] = useState<AssignedClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"personal" | "credentials" | "bank" | "security">("personal");

  // Document zoom preview modal
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

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
    } catch (err: any) {
      console.error("Error fetching agent profile:", err);
    } finally {
      setLoading(false);
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

  if (loading && !agent) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
        <AgentNavbar />
        <div className="flex-1 flex flex-col items-center justify-center py-24">
          <HugeiconsIcon icon={Loading03Icon} className="w-10 h-10 text-sky-600 animate-spin mb-4" strokeWidth={2} />
          <p className="text-slate-600 font-semibold text-sm">Loading your agent profile details...</p>
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
  const avatarUrl = agent?.profilePhoto ? getFullImageUrl(agent.profilePhoto) : null;

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

        {/* Read-Only Notice Banner */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50/80 border border-blue-200/80 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <HugeiconsIcon icon={Shield01Icon} className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-blue-950">Official Verified Agent Record</h4>
              <p className="text-xs text-blue-800/90 mt-0.5">
                All profile credentials, KYC documents, and bank details are read-only and centrally managed by Head Office Administration.
              </p>
            </div>
          </div>
          <span className="hidden md:inline-flex items-center gap-1 bg-white/90 text-blue-900 border border-blue-200 text-[11px] font-bold px-3 py-1 rounded-full shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Database Verified
          </span>
        </div>

        {/* ======================================================== */}
        {/* Hero Profile Overview Card (Read-Only)                    */}
        {/* ======================================================== */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
          {/* Subtle top gradient accent bar */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#102A43] via-blue-600 to-sky-500" />

          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
            
            {/* Left: Avatar & Identity */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
              {/* Avatar Container */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-4 border-white shadow-md bg-gradient-to-br from-[#102A43] to-blue-900 flex items-center justify-center text-white font-bold text-3xl select-none shrink-0 relative">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Agent Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{initials}</span>
                )}
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
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    agent?.status === "active" || !agent?.status
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span className="capitalize">{agent?.status || "Active"}</span>
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

            {/* Right: Quick Metrics */}
            <div className="flex items-center gap-2.5 w-full md:w-auto justify-center sm:justify-end">
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-2.5 text-center select-none shadow-2xs">
                <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Assigned</span>
                <span className="block text-base font-bold text-slate-900 font-mono">{stats.totalClaims}</span>
              </div>
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl px-4 py-2.5 text-center select-none shadow-2xs">
                <span className="block text-amber-600 text-[10px] font-bold uppercase tracking-wider">In Progress</span>
                <span className="block text-base font-bold text-amber-800 font-mono">{stats.activeClaims}</span>
              </div>
              <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl px-4 py-2.5 text-center select-none shadow-2xs">
                <span className="block text-blue-600 text-[10px] font-bold uppercase tracking-wider">Inspected</span>
                <span className="block text-base font-bold text-blue-800 font-mono">{stats.completedInspections}</span>
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
            { id: "credentials", label: "Credentials & KYC Documents", icon: Shield01Icon },
            { id: "bank", label: "Direct Settlement Bank", icon: CreditCardIcon },
            { id: "security", label: "Account Security & Credentials", icon: LockPasswordIcon }
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
        {/* TAB 1: Personal & Contact Details (Read-Only)            */}
        {/* ======================================================== */}
        {activeTab === "personal" && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Personal & Field Contact Information</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Verified agent personal details, residential location, and regional assignment
                </p>
              </div>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200/60">
                Read-Only Record
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { label: "Full Agent Name", value: agent?.name || "-", verified: true },
                { label: "National ID (NIC)", value: agent?.nic || "-", isMono: true },
                { label: "Assigned Branch", value: `${agent?.branch || "Galle"} Branch` },
                { label: "Official Agent ID", value: agent?.agentId || "AGT-0001", isMono: true },
                { label: "Date of Birth", value: formatDate(agent?.dob) },
                { label: "Age", value: calculateAge(agent?.dob) },
                { label: "Contact Phone Number", value: agent?.phone || "-", isMono: true },
                { label: "Official Email Address", value: agent?.email || "-", isMono: true },
                { label: "Field Coverage Area", value: agent?.area || "-" },
                { label: "District", value: agent?.district || "-" },
                { label: "City / Town", value: agent?.city || "-" },
                { label: "Province", value: agent?.province || "-" }
              ].map((item, idx) => (
                <div key={idx} className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-1">
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

              <div className="sm:col-span-2 lg:col-span-3 bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Permanent Residential Address</span>
                <span className="text-xs font-bold text-slate-800 leading-relaxed">{agent?.address || "No address on file"}</span>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: Agent Credentials & KYC Documents (Read-Only)     */}
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
                <span>Accredited Files</span>
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
        {/* TAB 3: Direct Settlement Bank Details (Read-Only)        */}
        {/* ======================================================== */}
        {activeTab === "bank" && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Direct Deposit Settlement Bank Details</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Electronic deposit account for claim inspection allowances, disbursements, and field settlements
                </p>
              </div>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200/60">
                Read-Only Record
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { label: "Bank Name", value: agent?.bankName || "Not Configured" },
                { label: "Bank Branch Location", value: agent?.bankBranch || "Not Configured" },
                { label: "Account Number", value: agent?.accountNumber || "Not Configured", isMono: true },
                { label: "Account Type", value: agent?.accountType || "Savings Account" },
                { label: "Account Holder Name", value: agent?.accountHolderName || agent?.name || "-" }
              ].map((item, idx) => (
                <div key={idx} className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{item.label}</span>
                  <span className={`text-xs font-bold text-slate-800 truncate ${item.isMono ? 'font-mono' : ''}`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: Account Security & Credentials Overview (Read-Only)*/}
        {/* ======================================================== */}
        {activeTab === "security" && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col gap-6 max-w-3xl">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Account Security & Credentials Status</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Overview of authentication, security status, and administrative management
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Account Active & Secured</h4>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    Your agent credentials are authenticated and encrypted in the Sanasa Insurance enterprise database.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Registered Login Email</span>
                  <span className="text-xs font-bold text-slate-800 font-mono truncate">{agent?.email}</span>
                </div>
                <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Registration Date</span>
                  <span className="text-xs font-bold text-slate-800">{formatDate(agent?.createdAt)}</span>
                </div>
                <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Assigned Operational Branch</span>
                  <span className="text-xs font-bold text-slate-800">{agent?.branch || "Galle"} Branch</span>
                </div>
                <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Access Tier</span>
                  <span className="text-xs font-bold text-emerald-700">Accredited Field Agent</span>
                </div>
              </div>

              <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl text-xs text-blue-900 flex items-start gap-3">
                <HugeiconsIcon icon={InformationCircleIcon} className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" strokeWidth={2} />
                <div className="leading-relaxed">
                  <strong className="font-bold text-blue-950">Administrative Notice: </strong>
                  Agent security credentials and profile records are managed directly by Head Office Administration. If you require password resets, credential updates, or operational changes, please contact your branch manager or system administrator.
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ======================================================== */}
      {/* Document Zoom Preview Modal                              */}
      {/* ======================================================== */}
      {previewImage && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150">
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

      <AgentFooter />
    </div>
  );
}
