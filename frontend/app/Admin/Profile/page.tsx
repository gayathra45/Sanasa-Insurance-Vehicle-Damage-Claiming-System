"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminNavbar from "@/app/Components/Admin/Navbar";
import { API_URL } from "@/app/config";
import UserAvatarDropdown from "@/app/Components/UserAvatarDropdown";
import SimpleLoader from "@/app/Components/SimpleLoader";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  BubbleChatIcon,
  Menu01Icon,
  Shield01Icon,
  UserIcon,
  Mail01Icon,
  Call02Icon,
  UserGroupIcon,
  Folder01Icon,
  Briefcase01Icon,
  SecurityCheckIcon,
  Building04Icon,
  CheckmarkBadge01Icon,
  Calendar03Icon,
  InformationCircleIcon,
  ArrowRight01Icon,
  LockPasswordIcon,
  Activity01Icon
} from "@hugeicons/core-free-icons";

interface AdminProfileData {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  nic: string;
  status: string;
  registeredBy?: { name: string; email: string };
  approvedBy?: { name: string; email: string };
  createdAt: string;
}

interface SystemStats {
  totalStaff: number;
  totalAgents: number;
  totalPolicyHolders: number;
  totalClaims: number;
  pendingClaims: number;
  pendingBranchRequests: number;
  totalAdmins: number;
}

export default function AdminProfilePage() {
  const router = useRouter();

  const [admin, setAdmin] = useState<AdminProfileData | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

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

  const fetchProfile = async (email: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/admin/profile?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (res.ok && data.admin) {
        setAdmin(data.admin);
        if (data.systemStats) {
          setStats(data.systemStats);
        }
      }
    } catch (err) {
      console.error("Error fetching admin profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const sessionData = sessionStorage.getItem("logged_in_admin");
    if (!sessionData) {
      router.push("/Login");
      return;
    }

    try {
      const parsed = JSON.parse(sessionData);
      if (parsed?.email) {
        fetchProfile(parsed.email);
      } else {
        router.push("/Login");
      }
    } catch {
      router.push("/Login");
    }
  }, [router]);

  const initials = (admin?.name || "AD")
    .split(" ")
    .map(n => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "AD";

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
                Admin Profile
              </h1>
              <h1 className="hidden lg:flex text-xl font-semibold text-slate-800 items-center gap-2 pl-2 lg:pl-0 truncate">
                <span className="bg-[#102A43] text-white text-base px-4 py-2 rounded-xl font-semibold shadow-sm tracking-wide">Admin Portal</span>
                <span className="hidden lg:inline"> — Executive Administrator Profile</span>
              </h1>
            </div>
            <div className="flex items-center gap-5">
              <div className="text-sm font-semibold bg-slate-100 px-4 py-2 rounded-full text-slate-600 border border-slate-200">
                System Admin
              </div>
              <UserAvatarDropdown userType="admin" />
            </div>
          </header>

          <main className="flex-1 max-w-6xl w-full mx-auto p-6 lg:p-8 flex flex-col gap-6">
            
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 select-none">
              <Link href="/Admin/Dashboard" className="hover:text-[#102A43] transition-colors no-underline">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-slate-800 font-bold">My Admin Profile</span>
            </div>

            {loading ? (
              <SimpleLoader message="Loading administrator profile..." theme="slate" />
            ) : !admin ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center text-slate-400 font-semibold shadow-xs">
                Administrator profile record could not be loaded.
              </div>
            ) : (
              <>
                {/* Notice Banner */}
                <div className="bg-gradient-to-r from-[#102A43] via-[#163859] to-[#1e4870] rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
                  {/* Background decoration */}
                  <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />

                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left z-10">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-white/20 to-white/5 border-2 border-white/20 flex items-center justify-center text-white font-black text-3xl shadow-inner shrink-0">
                      {initials}
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                        <h2 className="text-2xl font-bold tracking-tight text-white">
                          {admin.name}
                        </h2>
                        <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
                          <HugeiconsIcon icon={CheckmarkBadge01Icon} className="w-4 h-4" strokeWidth={2.5} />
                          <span>System Administrator</span>
                        </span>
                      </div>

                      <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-slate-300 font-medium flex-wrap">
                        <span className="font-mono bg-white/10 px-2.5 py-1 rounded-lg">NIC: {admin.nic}</span>
                        <span>•</span>
                        <span>Sanasa General Insurance PLC • Head Office</span>
                        <span>•</span>
                        <span>Joined {formatDate(admin.createdAt)}</span>
                      </div>

                      <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-slate-200 flex-wrap pt-1 font-mono">
                        <span className="flex items-center gap-1.5">
                          <HugeiconsIcon icon={Mail01Icon} className="w-4 h-4 text-sky-400" />
                          <span>{admin.email}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <HugeiconsIcon icon={Call02Icon} className="w-4 h-4 text-sky-400" />
                          <span>{admin.mobile}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center sm:items-end gap-2 z-10 shrink-0">
                    <span className="text-[10px] uppercase tracking-wider text-slate-300 font-bold">Access Status</span>
                    <span className="px-4 py-1.5 bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      <span>{admin.status || "Approved"}</span>
                    </span>
                  </div>
                </div>

                {/* System-wide Governance Metrics */}
                {stats && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col gap-1">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Branch Staff</span>
                        <HugeiconsIcon icon={Building04Icon} className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="text-xl font-bold text-slate-900 font-mono">{stats.totalStaff}</span>
                      <span className="text-[10px] text-slate-500 font-medium">Active branch offices</span>
                    </div>

                    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col gap-1">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Policy Holders</span>
                        <HugeiconsIcon icon={Folder01Icon} className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span className="text-xl font-bold text-slate-900 font-mono">{stats.totalPolicyHolders}</span>
                      <span className="text-[10px] text-slate-500 font-medium">Registered policy records</span>
                    </div>

                    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col gap-1">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Field Agents</span>
                        <HugeiconsIcon icon={Briefcase01Icon} className="w-4 h-4 text-indigo-600" />
                      </div>
                      <span className="text-xl font-bold text-slate-900 font-mono">{stats.totalAgents}</span>
                      <span className="text-[10px] text-slate-500 font-medium">Accredited claim agents</span>
                    </div>

                    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col gap-1">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Total Claims</span>
                        <HugeiconsIcon icon={Shield01Icon} className="w-4 h-4 text-purple-600" />
                      </div>
                      <span className="text-xl font-bold text-slate-900 font-mono">{stats.totalClaims}</span>
                      <span className="text-[10px] text-amber-600 font-semibold">{stats.pendingClaims} pending review</span>
                    </div>
                  </div>
                )}

                {/* Profile Details Grid (Read-Only) */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col gap-6">
                  <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Administrator Identity & Credentials</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Official system administrator profile registered in the centralized Sanasa Insurance database
                      </p>
                    </div>
                    <span className="bg-slate-100 text-slate-600 font-bold text-[11px] px-3 py-1 rounded-full border border-slate-200">
                      Read-Only Record
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Administrator Full Name</span>
                      <strong className="text-xs text-slate-800">{admin.name}</strong>
                    </div>

                    <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">National Identity Card (NIC)</span>
                      <strong className="text-xs text-slate-800 font-mono">{admin.nic}</strong>
                    </div>

                    <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Official Email Address</span>
                      <strong className="text-xs text-slate-800 truncate">{admin.email}</strong>
                    </div>

                    <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registered Mobile Number</span>
                      <strong className="text-xs text-slate-800 font-mono">{admin.mobile}</strong>
                    </div>

                    <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Administrative Access Tier</span>
                      <strong className="text-xs text-emerald-700">Tier-1 Executive System Admin</strong>
                    </div>

                    <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account Creation Date</span>
                      <strong className="text-xs text-slate-800">{formatDate(admin.createdAt)}</strong>
                    </div>
                  </div>

                  {/* Administrative Governance Notice */}
                  <div className="p-5 bg-blue-50/60 border border-blue-100 rounded-2xl text-xs text-blue-900 flex items-start gap-3.5">
                    <HugeiconsIcon icon={InformationCircleIcon} className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" strokeWidth={2} />
                    <div className="leading-relaxed">
                      <strong className="font-bold text-blue-950">Administrative Notice & Governance: </strong>
                      This administrator profile has global jurisdiction across all policy records, claims assessments, branch offices, and field agents. Administrator credentials and database configurations are managed and secured by Head Office Administration.
                    </div>
                  </div>
                </div>

                {/* Quick Management Shortcuts */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Quick Navigation to Management Consoles
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <Link
                      href="/Admin/Staff"
                      className="p-4 rounded-2xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200 text-slate-800 hover:text-blue-950 flex items-center justify-between no-underline transition-all group shadow-2xs"
                    >
                      <div className="flex items-center gap-3">
                        <HugeiconsIcon icon={Building04Icon} className="w-5 h-5 text-[#102A43]" />
                        <span className="text-xs font-bold">Staff Directory</span>
                      </div>
                      <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                    </Link>

                    <Link
                      href="/Admin/PolicyHolders"
                      className="p-4 rounded-2xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 text-slate-800 hover:text-emerald-950 flex items-center justify-between no-underline transition-all group shadow-2xs"
                    >
                      <div className="flex items-center gap-3">
                        <HugeiconsIcon icon={Folder01Icon} className="w-5 h-5 text-emerald-600" />
                        <span className="text-xs font-bold">Policy Holders</span>
                      </div>
                      <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                    </Link>

                    <Link
                      href="/Admin/Agents"
                      className="p-4 rounded-2xl bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 text-slate-800 hover:text-indigo-950 flex items-center justify-between no-underline transition-all group shadow-2xs"
                    >
                      <div className="flex items-center gap-3">
                        <HugeiconsIcon icon={Briefcase01Icon} className="w-5 h-5 text-indigo-600" />
                        <span className="text-xs font-bold">Agents Directory</span>
                      </div>
                      <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                    </Link>

                    <Link
                      href="/Admin/Claims"
                      className="p-4 rounded-2xl bg-slate-50 hover:bg-purple-50/60 border border-slate-200 text-slate-800 hover:text-purple-950 flex items-center justify-between no-underline transition-all group shadow-2xs"
                    >
                      <div className="flex items-center gap-3">
                        <HugeiconsIcon icon={Shield01Icon} className="w-5 h-5 text-purple-600" />
                        <span className="text-xs font-bold">Claims Console</span>
                      </div>
                      <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </>
            )}

          </main>
        </div>
      </div>

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
