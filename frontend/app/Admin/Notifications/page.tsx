"use client";

import React, { useState, useEffect } from "react";
import { API_URL } from "@/app/config";
import AdminNavbar from "@/app/Components/Admin/Navbar";
import Link from "next/link";
import UserAvatarDropdown from "@/app/Components/UserAvatarDropdown";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Menu01Icon,
  Search01Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Loading03Icon,
  Alert02Icon,
  File01Icon,
  UserIcon,
  UserMultiple02Icon,
  BubbleChatIcon,
  Notification01Icon,
} from "@hugeicons/core-free-icons";

interface ClaimMessage {
  sender: string;
  message: string;
  sentAt: string;
}

interface AdditionalDoc {
  name: string;
  url: string;
  uploadedAt: string;
  uploadedBy?: string;
}

interface Claim {
  _id: string;
  claimNumber: string;
  userNic: string;
  vehiclePlate: string;
  incidentDate: string;
  incidentTime: string;
  damageType: string;
  description: string;
  location: string;
  status: "Pending" | "In Progress" | "Approved" | "Rejected";
  branch: string;
  assignedAgent: string;
  amount: number | null;
  currentStep: number;
  createdAt: string;
  messages?: ClaimMessage[];
  additionalDocuments?: AdditionalDoc[];
  inspectionSubmitted?: boolean;
}

interface Vehicle {
  numberPlate: string;
  vehicleType: string;
  year: string;
  company: string;
  model: string;
  policyNumber: string;
  engineNumber?: string;
  chassisNumber?: string;
  status?: string;
}

interface User {
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
  status: string;
  vehicles?: Vehicle[];
  documents?: {
    nicFront?: string;
    nicBack?: string;
    vehicleReg?: string;
    revenueLicense?: string;
  };
  createdAt: string;
}

interface Agent {
  _id: string;
  agentId: string;
  name: string;
  email: string;
  nic: string;
  address: string;
  dob: string;
  branch: string;
  phone?: string;
  city?: string;
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
  status: string;
  availability: string;
  createdAt: string;
}

interface NotificationItem {
  id: string;
  type: "urgent" | "action" | "decision" | "info" | "staff_message";
  category: "claims" | "policy_holders" | "agents" | "staff_messages";
  title: string;
  description: string;
  date: string;
  isUrgent: boolean;
  link: string;
  actionLabel: string;
  claim?: Claim;
  user?: User;
  vehicle?: Vehicle;
  agent?: Agent;
}

function formatDate(dateStr?: string | Date): string {
  if (!dateStr) return "Today";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return String(dateStr);
  }
}

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filteredNotifs, setFilteredNotifs] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "read" | "claims" | "policy_holders" | "agents" | "staff_messages">("all");
  const [readIds, setReadIds] = useState<string[]>([]);
  
  // Selected details modals state
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  // 1. Initial load & Background polling
  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/admin/notifications`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.notifications)) {
            setNotifications(data.notifications);
          }
        }
      } catch (err) {
        console.warn("Background admin notifications polling failed:", err);
      }
    }, 8000);

    if (typeof window !== "undefined") {
      const savedReadIds = localStorage.getItem("admin_read_notification_ids");
      if (savedReadIds) {
        try {
          setReadIds(JSON.parse(savedReadIds));
        } catch (e) {
          console.error("Failed to load read notification IDs", e);
        }
      }
    }

    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/admin/notifications`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
          setFilteredNotifs(data.notifications);
        }
      }
    } catch (err) {
      console.error("Error fetching admin notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  // Lock background scroll when modal is open
  useEffect(() => {
    if (selectedClaim || selectedUser || selectedAgent) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedClaim, selectedUser, selectedAgent]);

  // 2. Read/unread actions
  const toggleReadStatus = (id: string) => {
    let updatedReadIds = [...readIds];
    if (readIds.includes(id)) {
      updatedReadIds = updatedReadIds.filter((item) => item !== id);
    } else {
      updatedReadIds.push(id);
    }
    setReadIds(updatedReadIds);
    localStorage.setItem("admin_read_notification_ids", JSON.stringify(updatedReadIds));
  };

  const markAsRead = (id: string) => {
    if (!readIds.includes(id)) {
      const updated = [...readIds, id];
      setReadIds(updated);
      localStorage.setItem("admin_read_notification_ids", JSON.stringify(updated));
    }
  };

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadIds(allIds);
    localStorage.setItem("admin_read_notification_ids", JSON.stringify(allIds));
  };

  // 3. Filtering logic
  useEffect(() => {
    let result = notifications;

    // Filter by Tab
    if (activeTab === "unread") {
      result = notifications.filter((n) => !readIds.includes(n.id));
    } else if (activeTab === "read") {
      result = notifications.filter((n) => readIds.includes(n.id));
    } else if (activeTab === "claims") {
      result = notifications.filter((n) => n.category === "claims");
    } else if (activeTab === "policy_holders") {
      result = notifications.filter((n) => n.category === "policy_holders");
    } else if (activeTab === "agents") {
      result = notifications.filter((n) => n.category === "agents");
    } else if (activeTab === "staff_messages") {
      result = notifications.filter((n) => n.category === "staff_messages");
    }

    // Filter by Search Query
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.description.toLowerCase().includes(q)
      );
    }

    setFilteredNotifs(result);
  }, [activeTab, searchQuery, notifications, readIds]);

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans">
      <div className="flex flex-1 flex-row min-h-0">
        {/* Left Sidebar */}
        <AdminNavbar />

        {/* Right Main Container */}
        <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
          {/* Top Welcome Bar */}
          <header className="bg-white border-b border-slate-100 text-slate-800 px-8 py-4 flex justify-between items-center select-none shadow-sm flex-shrink-0 h-[80px] sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("open-admin-mobile-menu"))}
                className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 active:scale-95 transition-all cursor-pointer focus:outline-none"
              >
                <HugeiconsIcon icon={Menu01Icon} className="w-6 h-6" strokeWidth={2.5} />
              </button>
              {/* Mobile page title */}
              <h1 className="lg:hidden text-lg font-bold text-slate-800 tracking-tight">
                Notifications
              </h1>
              {/* Desktop welcome title */}
              <h1 className="hidden lg:flex text-xl font-semibold text-slate-800 items-center gap-2 pl-2 lg:pl-0 truncate">
                <span className="bg-[#102A43] text-white text-base px-4 py-2 rounded-xl font-semibold shadow-sm tracking-wide">Admin</span>
                <span> — Notifications Panel</span>
              </h1>
            </div>
            <div className="flex items-center gap-5">
              {/* User Avatar Icon */}
              <UserAvatarDropdown userType="admin" />
            </div>
          </header>

          {/* Page Content notifications */}
          <main className="flex-1 p-4 lg:p-8 bg-white overflow-y-auto">
            {/* Search and Action Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-6 mb-8 select-none">
              {/* Search Bar */}
              <div className="relative w-full max-w-[420px] bg-slate-50 hover:bg-white focus-within:bg-white border border-slate-200 rounded-full pl-5 pr-2.5 py-2 flex items-center gap-3 transition-all duration-200 shadow-sm focus-within:shadow-md focus-within:border-[#f59e0b] focus-within:ring-4 focus-within:ring-[#f59e0b]/10">
                <span className="text-slate-400 flex items-center justify-center">
                  <HugeiconsIcon icon={Search01Icon} className="w-5 h-5" strokeWidth={2.5} />
                </span>
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-slate-800 text-[15px] placeholder-slate-400 focus:outline-none font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer p-1"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                )}
                <button
                  type="button"
                  className="bg-[#f59e0b] hover:bg-[#d97706] active:scale-95 text-white py-2 px-5 rounded-full text-xs font-bold transition-all duration-150 border-none cursor-pointer flex items-center justify-center shadow-md shadow-[#f59e0b]/20"
                >
                  Search
                </button>
              </div>

              {/* Mark All As Read Button */}
              {notifications.some((n) => !readIds.includes(n.id)) && (
                <button
                  onClick={markAllAsRead}
                  className="bg-slate-100 hover:bg-slate-200 border-none text-slate-700 font-bold text-xs px-6 py-3 rounded-full transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-center"
                >
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-5 h-5 text-slate-600" strokeWidth={2.5} />
                  Mark All as Read
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2.5 mb-8 border-b border-slate-100 pb-5 select-none">
              <button
                onClick={() => setActiveTab("all")}
                className={`font-medium text-xs md:text-sm px-5 py-2.5 rounded-full border border-solid transition-all cursor-pointer ${
                  activeTab === "all"
                    ? "bg-[#000080] border-[#000080] text-white shadow-sm font-semibold"
                    : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                All Alerts ({notifications.length})
              </button>
              <button
                onClick={() => setActiveTab("unread")}
                className={`font-medium text-xs md:text-sm px-5 py-2.5 rounded-full border border-solid transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "unread"
                    ? "bg-amber-500 border-amber-500 text-white shadow-sm font-semibold"
                    : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                Unread
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  activeTab === "unread" ? "bg-white/20 text-white" : "bg-red-500 text-white"
                }`}>
                  {notifications.filter((n) => !readIds.includes(n.id)).length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("read")}
                className={`font-medium text-xs md:text-sm px-5 py-2.5 rounded-full border border-solid transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "read"
                    ? "bg-slate-600 border-slate-600 text-white shadow-sm font-semibold"
                    : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                Read
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  activeTab === "read" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}>
                  {notifications.filter((n) => readIds.includes(n.id)).length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("claims")}
                className={`font-medium text-xs md:text-sm px-5 py-2.5 rounded-full border border-solid transition-all cursor-pointer ${
                  activeTab === "claims"
                    ? "bg-sky-500 border-sky-500 text-white shadow-sm font-semibold"
                    : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                Claims ({notifications.filter((n) => n.category === "claims").length})
              </button>
              <button
                onClick={() => setActiveTab("policy_holders")}
                className={`font-medium text-xs md:text-sm px-5 py-2.5 rounded-full border border-solid transition-all cursor-pointer ${
                  activeTab === "policy_holders"
                    ? "bg-emerald-600 border-emerald-600 text-white shadow-sm font-semibold"
                    : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                Policy Holders ({notifications.filter((n) => n.category === "policy_holders").length})
              </button>
              <button
                onClick={() => setActiveTab("agents")}
                className={`font-medium text-xs md:text-sm px-5 py-2.5 rounded-full border border-solid transition-all cursor-pointer ${
                  activeTab === "agents"
                    ? "bg-purple-600 border-purple-600 text-white shadow-sm font-semibold"
                    : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                Agents ({notifications.filter((n) => n.category === "agents").length})
              </button>
              <button
                onClick={() => setActiveTab("staff_messages")}
                className={`font-medium text-xs md:text-sm px-5 py-2.5 rounded-full border border-solid transition-all cursor-pointer ${
                  activeTab === "staff_messages"
                    ? "bg-pink-600 border-pink-600 text-white shadow-sm font-semibold"
                    : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                Staff Messages ({notifications.filter((n) => n.category === "staff_messages").length})
              </button>
            </div>

            {/* List Content */}
            <div className="flex flex-col gap-3.5 mb-10">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-50 border border-slate-200 rounded-2xl gap-4">
                  <HugeiconsIcon icon={Loading03Icon} className="animate-spin h-8 w-8 text-[#f59e0b]" strokeWidth={2} />
                  <p className="text-slate-500 font-medium text-sm">Fetching notifications...</p>
                </div>
              ) : filteredNotifs.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {filteredNotifs.map((n) => {
                    const isRead = readIds.includes(n.id);
                    const isUrgent = n.type === "urgent";

                    let borderLeft = "border-l-4 border-l-slate-400";
                    let iconStyle = "bg-slate-50 text-slate-500";
                    let iconSvg = (
                      <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5" strokeWidth={2} />
                    );

                    if (n.category === "claims") {
                      if (isUrgent) {
                        borderLeft = "border-l-4 border-l-rose-500";
                        iconStyle = "bg-rose-50 text-rose-600";
                      } else {
                        borderLeft = "border-l-4 border-l-sky-400";
                        iconStyle = "bg-sky-50 text-sky-600";
                        iconSvg = (
                          <HugeiconsIcon icon={File01Icon} className="w-5 h-5" strokeWidth={2} />
                        );
                      }
                    } else if (n.category === "policy_holders") {
                      borderLeft = "border-l-4 border-l-emerald-500";
                      iconStyle = "bg-emerald-50 text-emerald-600";
                      iconSvg = (
                        <HugeiconsIcon icon={UserIcon} className="w-5 h-5" strokeWidth={2} />
                      );
                    } else if (n.category === "agents") {
                      borderLeft = "border-l-4 border-l-purple-500";
                      iconStyle = "bg-purple-50 text-purple-600";
                      iconSvg = (
                        <HugeiconsIcon icon={UserMultiple02Icon} className="w-5 h-5" strokeWidth={2} />
                      );
                    } else if (n.category === "staff_messages") {
                      borderLeft = "border-l-4 border-l-pink-500";
                      iconStyle = "bg-pink-50 text-pink-600";
                      iconSvg = (
                        <HugeiconsIcon icon={BubbleChatIcon} className="w-5 h-5" strokeWidth={2} />
                      );
                    }

                    if (isRead) {
                      borderLeft = "border-l-4 border-l-slate-200";
                    }

                    return (
                      <div
                        key={n.id}
                        onClick={() => {
                          markAsRead(n.id);
                          if (n.claim) {
                            setSelectedClaim(n.claim);
                          } else if (n.user) {
                            setSelectedUser(n.user);
                            setSelectedVehicle(n.vehicle || null);
                          } else if (n.agent) {
                            setSelectedAgent(n.agent);
                          }
                        }}
                        className={`rounded-2xl border border-slate-200/80 p-3.5 md:py-3.5 md:px-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer ${borderLeft} ${
                          isRead ? "bg-slate-50/50 hover:bg-slate-100/60" : "bg-white hover:bg-slate-50/50"
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 md:gap-4">
                          
                          {/* Left Info Area: Centered Icon + Title & Description */}
                          <div className="flex items-center gap-3.5 flex-1 min-w-0">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconStyle}`}>
                              {iconSvg}
                            </div>

                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className={`font-semibold text-sm md:text-[15px] leading-snug ${isRead ? "text-slate-600" : "text-slate-800"}`}>
                                  {n.title}
                                </h4>
                                {!isRead && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200/60">
                                    New
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-600 text-xs md:text-sm font-normal leading-relaxed mt-0.5">
                                {n.description}
                              </p>
                            </div>
                          </div>

                          {/* Right Action Area: Fixed-width Buttons + Aligned Date */}
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center justify-between md:justify-end gap-2.5 md:gap-3 shrink-0 pt-2.5 md:pt-0 border-t md:border-t-0 border-slate-100"
                          >
                            <div className="flex items-center gap-2 order-2 md:order-1">
                              <button
                                onClick={() => {
                                  markAsRead(n.id);
                                  if (n.claim) {
                                    setSelectedClaim(n.claim);
                                  } else if (n.user) {
                                    setSelectedUser(n.user);
                                    setSelectedVehicle(n.vehicle || null);
                                  } else if (n.agent) {
                                    setSelectedAgent(n.agent);
                                  }
                                }}
                                className={`w-[136px] md:w-[140px] h-[34px] flex items-center justify-center font-semibold text-xs rounded-full transition-all duration-150 active:scale-[0.98] cursor-pointer border-none shadow-xs text-white whitespace-nowrap shrink-0 ${
                                  n.category === "claims"
                                    ? (isUrgent ? "bg-red-500 hover:bg-red-600" : "bg-[#000080] hover:bg-[#000066]")
                                    : n.category === "policy_holders"
                                    ? "bg-emerald-600 hover:bg-emerald-700"
                                    : "bg-purple-600 hover:bg-purple-700"
                                }`}
                              >
                                {n.actionLabel}
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleReadStatus(n.id);
                                }}
                                className="w-[136px] md:w-[140px] h-[34px] flex items-center justify-center bg-slate-50 hover:bg-slate-100 border border-solid border-slate-200 hover:border-slate-300 text-slate-600 font-medium text-xs rounded-full cursor-pointer transition-all duration-150 active:scale-[0.98] text-center whitespace-nowrap shrink-0"
                              >
                                {isRead ? "Mark as Unread" : "Mark as Read"}
                              </button>
                            </div>

                            <span className="w-[84px] text-xs text-slate-400 font-normal whitespace-nowrap text-left md:text-right order-1 md:order-2">
                              {formatDate(n.date)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-[30px] gap-6 text-center px-8 shadow-sm">
                  <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                    <HugeiconsIcon icon={Notification01Icon} className="w-10 h-10" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg">No Notifications Found</h4>
                    <p className="text-slate-500 font-semibold text-sm max-w-sm mt-2 leading-relaxed">
                      We couldn't find any notifications matching the selected tab criteria or search keywords.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Floating Support Button */}
      <button className="fixed bottom-8 right-8 z-40 bg-[#00ddff] hover:bg-[#00c8e6] text-white p-5 rounded-full shadow-2xl transition-all duration-150 hover:scale-110 active:scale-95 cursor-pointer focus:outline-none border-none flex items-center justify-center" aria-label="Chat support">
        <HugeiconsIcon icon={BubbleChatIcon} className="w-7 h-7 text-white" strokeWidth={2} />
      </button>

      {/* 1. Claim Detail Modal Popup */}
      {selectedClaim && (() => {
        let currentStep = selectedClaim.currentStep || 1;
        if (!selectedClaim.currentStep) {
          const s = selectedClaim.status.toLowerCase();
          if (s.includes("pending") || s.includes("progress")) {
            currentStep = 3;
          } else if (s.includes("review")) {
            currentStep = 4;
          } else if (s.includes("approved") || s.includes("active") || s.includes("done")) {
            currentStep = 6;
          }
        }

        const steps = [
          { num: "01", label: "Submitted" },
          { num: "02", label: "Assigned" },
          { num: "03", label: "Inspection" },
          { num: "04", label: "Review" },
          { num: "05", label: "Decision" },
          { num: "06", label: "Payment" }
        ];

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-slate-200 rounded-[24px] w-full max-w-[720px] max-h-[90vh] shadow-2xl flex flex-col relative overflow-hidden transition-all duration-300">
              <div className="flex justify-between items-center px-8 pt-6 pb-4 border-b border-slate-200 flex-shrink-0">
                <h2 className="text-[22px] font-bold text-[#000080] tracking-tight">
                  Claim Details – {selectedClaim.claimNumber}
                </h2>
                <button
                  onClick={() => setSelectedClaim(null)}
                  className="text-slate-400 hover:text-slate-600 text-2xl font-bold border-none bg-transparent cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <div className="p-8 flex-1 overflow-y-auto">
                {/* Wizard Tracker */}
                <div className="bg-[#f8fafc] border border-slate-100 rounded-[24px] pt-6 pb-5 px-8 mb-8 flex justify-between items-center relative select-none w-full max-w-[540px] mx-auto shadow-sm">
                  <div className="absolute top-[40px] left-[52px] right-[52px] h-[3px] bg-slate-200 z-0" />
                  <div
                    className="absolute top-[40px] left-[52px] h-[3px] bg-[#00b050] z-0 transition-all duration-300"
                    style={{ width: `calc((100% - 104px) * ${currentStep - 1} / 5)` }}
                  />
                  {steps.map((step, idx) => {
                    const stepNum = idx + 1;
                    const isCompleted = stepNum < currentStep;
                    const isActive = stepNum === currentStep;

                    let circleClass = "border-slate-300 text-slate-400 bg-white";
                    if (isCompleted) {
                      circleClass = "border-[#00b050] text-[#00b050] bg-white";
                    } else if (isActive) {
                      circleClass = "border-blue-500 text-blue-500 bg-[#e8f0fe]";
                    }

                    return (
                      <div key={step.num} className="flex flex-col items-center z-10 flex-1">
                        <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-[14px] font-bold ${circleClass}`}>
                          {step.num}
                        </div>
                        <span className={`text-[11px] font-bold mt-2 leading-none ${isActive ? "text-blue-600 font-bold" : isCompleted ? "text-slate-800" : "text-slate-400"}`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-x-12 gap-y-5 text-[15px] font-semibold text-slate-700 mb-6 px-2">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold w-28 shrink-0">Vehicle Plate:</span>
                    <span className="font-bold text-slate-800">{selectedClaim.vehiclePlate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold w-28 shrink-0">Damage Type:</span>
                    <span className="font-bold text-slate-800">{selectedClaim.damageType}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold w-28 shrink-0">Est. Amount:</span>
                    <span className="font-bold text-slate-800">
                      {selectedClaim.amount ? `LKR ${selectedClaim.amount.toLocaleString()}` : "Pending"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold w-28 shrink-0">Incident Date:</span>
                    <span className="font-bold text-slate-800">{formatDate(selectedClaim.incidentDate)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold w-28 shrink-0">Branch:</span>
                    <span className="font-bold text-slate-800">{selectedClaim.branch}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold w-28 shrink-0">Assigned Agent:</span>
                    <span className="font-bold text-slate-800">{selectedClaim.assignedAgent || "Unassigned"}</span>
                  </div>
                  <div className="flex items-center gap-2 col-span-2">
                    <span className="text-slate-400 font-bold w-28 shrink-0">Location:</span>
                    <span className="font-bold text-slate-800">{selectedClaim.location}</span>
                  </div>
                </div>

                {/* Description */}
                {selectedClaim.description && (
                  <div className="px-2 mb-6">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Incident Description</p>
                    <p className="text-slate-600 text-sm font-medium leading-relaxed italic bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      "{selectedClaim.description}"
                    </p>
                  </div>
                )}

                {/* Messages */}
                <div className="px-2">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Claim Messages & Logs</p>
                  {selectedClaim.messages && selectedClaim.messages.length > 0 ? (
                    <div className="flex flex-col gap-2.5 max-h-[200px] overflow-y-auto pr-1">
                      {selectedClaim.messages.map((msg, index) => (
                        <div key={index} className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex flex-col gap-1">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="font-bold text-[#000080]">{msg.sender}</span>
                            <span className="text-slate-400 font-semibold">{formatDate(msg.sentAt)}</span>
                          </div>
                          <p className="text-slate-700 text-xs font-semibold leading-relaxed m-0">{msg.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-xs italic font-medium bg-slate-50 border border-slate-100 rounded-xl p-3 m-0">No messages logged for this claim.</p>
                  )}
                </div>
              </div>

              <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 flex justify-end flex-shrink-0 gap-3">
                <Link
                  href={`/Admin/Claims?claimId=${selectedClaim.claimNumber}`}
                  className="bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold text-[14px] px-6 py-3 rounded-full transition-all border-none cursor-pointer no-underline flex items-center justify-center"
                >
                  Manage Claim
                </Link>
                <button
                  onClick={() => setSelectedClaim(null)}
                  className="bg-[#000080] hover:bg-[#000066] text-white font-bold text-[14px] px-8 py-3 rounded-full transition-all border-none cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 2. Registration/Vehicle Detail Modal Popup */}
      {selectedUser && (() => {
        const isVehicleView = selectedVehicle !== null;
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-slate-200 rounded-[24px] w-full max-w-[720px] max-h-[90vh] shadow-2xl flex flex-col relative overflow-hidden transition-all duration-300">
              <div className="flex justify-between items-center px-8 pt-6 pb-4 border-b border-slate-200 flex-shrink-0">
                <h2 className="text-[22px] font-bold text-[#000080] tracking-tight">
                  {isVehicleView
                    ? `Vehicle Verification – ${selectedVehicle?.numberPlate}`
                    : `Portal Registration – ${selectedUser.firstName} ${selectedUser.lastName}`}
                </h2>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-slate-400 hover:text-slate-600 text-2xl font-bold border-none bg-transparent cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <div className="p-8 flex-1 overflow-y-auto">
                <div className="grid grid-cols-2 gap-x-12 gap-y-5 text-[15px] font-semibold text-slate-700 mb-8 px-2">
                  <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                    <span className="text-slate-400 font-bold w-28 shrink-0">Name:</span>
                    <span className="font-bold text-slate-800">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                    <span className="text-slate-400 font-bold w-28 shrink-0">NIC:</span>
                    <span className="font-bold text-slate-800">{selectedUser.nic}</span>
                  </div>
                  <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                    <span className="text-slate-400 font-bold w-28 shrink-0">Email:</span>
                    <span className="font-bold text-slate-800">{selectedUser.email}</span>
                  </div>
                  <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                    <span className="text-slate-400 font-bold w-28 shrink-0">Mobile:</span>
                    <span className="font-bold text-slate-800">{selectedUser.mobile}</span>
                  </div>
                  <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                    <span className="text-slate-400 font-bold w-28 shrink-0">Branch:</span>
                    <span className="font-bold text-slate-800">{selectedUser.branch}</span>
                  </div>
                  <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                    <span className="text-slate-400 font-bold w-28 shrink-0">Ref Number:</span>
                    <span className="font-bold text-slate-800">{selectedUser.referenceNumber}</span>
                  </div>
                </div>

                {isVehicleView && selectedVehicle && (
                  <div className="bg-slate-50 border border-slate-200 rounded-[20px] p-6 mb-8">
                    <h3 className="text-sm font-bold text-[#000080] uppercase tracking-wider mb-4">Vehicle Details</h3>
                    <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-sm font-semibold">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-bold w-24 shrink-0">Plate:</span>
                        <span className="font-bold text-slate-800">{selectedVehicle.numberPlate}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-bold w-24 shrink-0">Model:</span>
                        <span className="font-bold text-slate-800">{selectedVehicle.company} {selectedVehicle.model}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-bold w-24 shrink-0">Year:</span>
                        <span className="font-bold text-slate-800">{selectedVehicle.year}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-bold w-24 shrink-0">Policy:</span>
                        <span className="font-bold text-slate-800">{selectedVehicle.policyNumber}</span>
                      </div>
                      {selectedVehicle.engineNumber && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-bold w-24 shrink-0">Engine No:</span>
                          <span className="font-bold text-slate-800">{selectedVehicle.engineNumber}</span>
                        </div>
                      )}
                      {selectedVehicle.chassisNumber && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-bold w-24 shrink-0">Chassis No:</span>
                          <span className="font-bold text-slate-800">{selectedVehicle.chassisNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Documents Preview list */}
                {selectedUser.documents && (
                  <div className="px-2">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Verification Documents</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedUser.documents.nicFront && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-xs text-slate-500 font-bold">NIC Front:</span>
                          <a
                            href={selectedUser.documents.nicFront}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs p-4 rounded-xl hover:bg-slate-200 text-center transition-colors no-underline block"
                          >
                            View NIC Front
                          </a>
                        </div>
                      )}
                      {selectedUser.documents.nicBack && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-xs text-slate-500 font-bold">NIC Back:</span>
                          <a
                            href={selectedUser.documents.nicBack}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs p-4 rounded-xl hover:bg-slate-200 text-center transition-colors no-underline block"
                          >
                            View NIC Back
                          </a>
                        </div>
                      )}
                      {selectedUser.documents.vehicleReg && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-xs text-slate-500 font-bold">Vehicle Reg:</span>
                          <a
                            href={selectedUser.documents.vehicleReg}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs p-4 rounded-xl hover:bg-slate-200 text-center transition-colors no-underline block"
                          >
                            View Vehicle Reg Document
                          </a>
                        </div>
                      )}
                      {selectedUser.documents.revenueLicense && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-xs text-slate-500 font-bold">Revenue License:</span>
                          <a
                            href={selectedUser.documents.revenueLicense}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs p-4 rounded-xl hover:bg-slate-200 text-center transition-colors no-underline block"
                          >
                            View Revenue License
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 flex justify-end flex-shrink-0 gap-3">
                <Link
                  href={`/Admin/PolicyHolders?nic=${selectedUser.nic}`}
                  className="bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold text-[14px] px-6 py-3 rounded-full transition-all border-none cursor-pointer no-underline flex items-center justify-center"
                >
                  Manage Profile
                </Link>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="bg-[#000080] hover:bg-[#000066] text-white font-bold text-[14px] px-8 py-3 rounded-full transition-all border-none cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 3. Agent Detail Modal Popup */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-[24px] w-full max-w-[720px] max-h-[90vh] shadow-2xl flex flex-col relative overflow-hidden transition-all duration-300">
            <div className="flex justify-between items-center px-8 pt-6 pb-4 border-b border-slate-200 flex-shrink-0">
              <h2 className="text-[22px] font-bold text-[#000080] tracking-tight">
                Agent Details – {selectedAgent.name} ({selectedAgent.agentId})
              </h2>
              <button
                onClick={() => setSelectedAgent(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold border-none bg-transparent cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-8 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-x-12 gap-y-5 text-[15px] font-semibold text-slate-700 mb-8 px-2">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold w-24 shrink-0">Agent ID:</span>
                  <span className="font-bold text-slate-800">{selectedAgent.agentId}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold w-24 shrink-0">NIC:</span>
                  <span className="font-bold text-slate-800">{selectedAgent.nic}</span>
                </div>
                <div className="flex items-center gap-2 col-span-2">
                  <span className="text-slate-400 font-bold w-24 shrink-0">Email:</span>
                  <span className="font-bold text-slate-800">{selectedAgent.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold w-24 shrink-0">Phone:</span>
                  <span className="font-bold text-slate-800">{selectedAgent.phone || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold w-24 shrink-0">DOB:</span>
                  <span className="font-bold text-slate-800">{selectedAgent.dob}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold w-24 shrink-0">Branch:</span>
                  <span className="font-bold text-slate-800">{selectedAgent.branch}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold w-24 shrink-0">Status:</span>
                  <span className="font-bold text-red-500 uppercase">{selectedAgent.status}</span>
                </div>
                <div className="flex items-center gap-2 col-span-2">
                  <span className="text-slate-400 font-bold w-24 shrink-0">Address:</span>
                  <span className="font-bold text-slate-800">{selectedAgent.address}</span>
                </div>
              </div>

              {/* Bank accounts information */}
              {(selectedAgent.bankName || selectedAgent.accountNumber) && (
                <div className="bg-slate-50 border border-slate-200 rounded-[20px] p-6 mb-8">
                  <h3 className="text-sm font-bold text-[#000080] uppercase tracking-wider mb-4">Bank Details</h3>
                  <div className="grid grid-cols-2 gap-y-4 text-sm font-semibold">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-bold w-24 shrink-0">Bank:</span>
                      <span className="font-bold text-slate-800">{selectedAgent.bankName || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-bold w-24 shrink-0">Branch:</span>
                      <span className="font-bold text-slate-800">{selectedAgent.bankBranch || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-bold w-24 shrink-0">Acc No:</span>
                      <span className="font-bold text-slate-800">{selectedAgent.accountNumber || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-bold w-24 shrink-0">Holder:</span>
                      <span className="font-bold text-slate-800">{selectedAgent.accountHolderName || "N/A"}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Documents preview */}
              <div className="px-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Agent Verification Documents</h3>
                <div className="grid grid-cols-2 gap-4">
                  {selectedAgent.nicFront && (
                    <a
                      href={selectedAgent.nicFront}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs p-4 rounded-xl hover:bg-slate-200 text-center transition-colors no-underline block"
                    >
                      NIC Front
                    </a>
                  )}
                  {selectedAgent.nicBack && (
                    <a
                      href={selectedAgent.nicBack}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs p-4 rounded-xl hover:bg-slate-200 text-center transition-colors no-underline block"
                    >
                      NIC Back
                    </a>
                  )}
                  {selectedAgent.birthCertificate && (
                    <a
                      href={selectedAgent.birthCertificate}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs p-4 rounded-xl hover:bg-slate-200 text-center transition-colors no-underline block"
                    >
                      Birth Certificate
                    </a>
                  )}
                  {selectedAgent.policeReport && (
                    <a
                      href={selectedAgent.policeReport}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs p-4 rounded-xl hover:bg-slate-200 text-center transition-colors no-underline block"
                    >
                      Police Report
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 flex justify-end flex-shrink-0 gap-3">
              <Link
                href={`/Admin/Agents?email=${selectedAgent.email}`}
                className="bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold text-[14px] px-6 py-3 rounded-full transition-all border-none cursor-pointer no-underline flex items-center justify-center"
              >
                Manage Agent
              </Link>
              <button
                onClick={() => setSelectedAgent(null)}
                className="bg-[#000080] hover:bg-[#000066] text-white font-bold text-[14px] px-8 py-3 rounded-full transition-all border-none cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
