"use client";

import React, { useState, useEffect } from "react";
import OfficeStaffNavbar from "@/app/Components/Office_Staff/Navbar";
import Link from "next/link";
import UserAvatarDropdown from "@/app/Components/UserAvatarDropdown";
import { API_URL } from "@/app/config";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Menu01Icon,
  Search01Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Loading03Icon,
  Clock01Icon,
  Alert02Icon,
  UserMultiple02Icon,
  BubbleChatIcon,
  Notification01Icon
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
  messages: ClaimMessage[];
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
}

interface Registration {
  _id: string;
  firstName: string;
  lastName: string;
  nic: string;
  mobile: string;
  email: string;
  branch: string;
  referenceNumber: string;
  vehicles?: Vehicle[];
  createdAt: string;
}

interface NotificationItem {
  id: string;
  type: "action" | "decision" | "info" | "message" | "urgent";
  title: string;
  description: string;
  subText?: string;
  date: string;
  isUrgent: boolean;
  link: string;
  actionLabel: string;
  createdAtRaw?: string;
  claim?: Claim;
  registration?: Registration;
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

export default function OfficeStaffNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filteredNotifs, setFilteredNotifs] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "read" | "claims" | "registrations">("all");
  const [branch, setBranch] = useState("");
  const [readIds, setReadIds] = useState<string[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);

  // 1. Load Session & LocalStorage Read states
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedStaff = sessionStorage.getItem("logged_in_staff");
      if (savedStaff) {
        try {
          const parsed = JSON.parse(savedStaff);
          if (parsed.branch) {
            setBranch(parsed.branch);
            fetchNotificationsAndRegistrations(parsed.branch);
          } else {
            setLoading(false);
          }
        } catch (err) {
          console.error("Error parsing logged_in_staff", err);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }

      const savedReadIds = localStorage.getItem("office_staff_read_notification_ids");
      if (savedReadIds) {
        try {
          setReadIds(JSON.parse(savedReadIds));
        } catch (e) {
          console.error("Failed to load read notification IDs", e);
        }
      }
    }
  }, []);

  // 1b. Background polling for real-time notifications updates
  useEffect(() => {
    if (!branch) return;
    const interval = setInterval(() => {
      fetchNotificationsAndRegistrations(branch, true);
    }, 7000);
    return () => clearInterval(interval);
  }, [branch]);

  // 2. Fetch Claims & Registrations, compile notifications dynamically
  const fetchNotificationsAndRegistrations = async (branchName: string, silent = false) => {
    try {
      if (!silent) setLoading(true);
      const cleanBranch = branchName.trim();
      
      // Fetch Claims
      const claimsRes = await fetch(`${API_URL}/office-staff/claims?branch=${cleanBranch}`);
      const claimsData = claimsRes.ok ? await claimsRes.json() : { claims: [] };
      const claimsList: Claim[] = claimsData.claims || [];

      // Fetch Registrations
      const regsRes = await fetch(`${API_URL}/office-staff/registrations?branch=${cleanBranch}`);
      const regsData = regsRes.ok ? await regsRes.json() : { registrations: [] };
      const registrationsList: Registration[] = regsData.registrations || [];

      const compiled: NotificationItem[] = [];

      // A. Process Claims Notifications
      claimsList.forEach((claim) => {
        const dateFormatted = formatDate(claim.createdAt);

        // 1. Unassigned Claims (Step = 1, assignedAgent is empty, status is Pending)
        if (claim.status === "Pending" && (!claim.assignedAgent || claim.assignedAgent.trim() === "")) {
          compiled.push({
            id: `${claim._id}-unassigned`,
            type: "urgent",
            title: `New Claim Awaiting Agent Assignment`,
            description: `Claim ${claim.claimNumber} for vehicle ${claim.vehiclePlate} has been registered and is waiting for an agent assignment.`,
            date: dateFormatted,
            isUrgent: true,
            link: `/Office_Staff/Claims?claimId=${claim.claimNumber}`,
            actionLabel: "Assign Agent",
            createdAtRaw: claim.createdAt,
            claim
          });
        }

        // 2. Inspection report submitted (Step = 3, inspectionSubmitted = true)
        if (claim.inspectionSubmitted && claim.status !== "Approved" && claim.status !== "Rejected") {
          compiled.push({
            id: `${claim._id}-inspection-submitted`,
            type: "action",
            title: `Inspection Report Submitted`,
            description: `Agent ${claim.assignedAgent || "assigned"} has uploaded the inspection report for claim ${claim.claimNumber}. Ready for review.`,
            date: dateFormatted,
            isUrgent: true,
            link: `/Office_Staff/Claims?claimId=${claim.claimNumber}`,
            actionLabel: "Review Assessment",
            createdAtRaw: claim.createdAt,
            claim
          });
        }

        // 3. New Document uploaded
        if (claim.additionalDocuments && claim.additionalDocuments.length > 0) {
          // Sort to find latest
          const docs = [...claim.additionalDocuments].sort(
            (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
          );
          const latestDoc = docs[0];
          compiled.push({
            id: `${claim._id}-doc-${latestDoc.name}-${latestDoc.uploadedAt}`,
            type: "info",
            title: `New Document Uploaded`,
            description: `Document "${latestDoc.name}" has been uploaded by ${latestDoc.uploadedBy || "User"} for claim ${claim.claimNumber}.`,
            date: formatDate(latestDoc.uploadedAt),
            isUrgent: false,
            link: `/Office_Staff/Claims?claimId=${claim.claimNumber}`,
            actionLabel: "View Document",
            createdAtRaw: latestDoc.uploadedAt,
            claim
          });
        }

        // 4. Client / Agent messages (Latest message not from staff)
        if (claim.messages && claim.messages.length > 0) {
          const lastMsg = claim.messages[claim.messages.length - 1];
          const messageSender = lastMsg.sender || "";
          const isFromStaff = messageSender.toLowerCase().includes("staff") || messageSender.toLowerCase().includes("office");
          if (!isFromStaff) {
            compiled.push({
              id: `${claim._id}-msg-${lastMsg.sentAt}`,
              type: "message",
              title: `New Message on Claim ${claim.claimNumber}`,
              description: `Latest from ${lastMsg.sender}: "${lastMsg.message}"`,
              date: formatDate(lastMsg.sentAt),
              isUrgent: false,
              link: `/Office_Staff/Claims?claimId=${claim.claimNumber}`,
              actionLabel: "Reply",
              createdAtRaw: lastMsg.sentAt,
              claim
            });
          }
        }
      });

      // B. Process Registrations Notifications (all fetched registrations are pending)
      registrationsList.forEach((reg) => {
        compiled.push({
          id: `${reg._id}-pending-reg`,
          type: "decision",
          title: `Pending Portal Registration`,
          description: `Policy Holder registration request from ${reg.firstName} ${reg.lastName} (NIC: ${reg.nic}) is awaiting branch approval.`,
          date: formatDate(reg.createdAt),
          isUrgent: false,
          link: `/Office_Staff/Registrations?ref=${reg.referenceNumber}`,
          actionLabel: "Review Registration",
          createdAtRaw: reg.createdAt,
          registration: reg
        });
      });

      // Sort: Urgent first, then newest first
      compiled.sort((a, b) => {
        if (a.isUrgent && !b.isUrgent) return -1;
        if (!a.isUrgent && b.isUrgent) return 1;
        const timeA = a.createdAtRaw ? new Date(a.createdAtRaw).getTime() : 0;
        const timeB = b.createdAtRaw ? new Date(b.createdAtRaw).getTime() : 0;
        return timeB - timeA;
      });

      setNotifications(compiled);
      setFilteredNotifs(compiled);
    } catch (err) {
      console.error("Error compilation of notifications", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Lock background scroll when modal is open
  useEffect(() => {
    if (selectedClaim) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedClaim]);

  // Read/Unread Handler Actions
  const toggleReadStatus = (id: string) => {
    let updatedReadIds = [...readIds];
    if (readIds.includes(id)) {
      updatedReadIds = updatedReadIds.filter((item) => item !== id);
    } else {
      updatedReadIds.push(id);
    }
    setReadIds(updatedReadIds);
    localStorage.setItem("office_staff_read_notification_ids", JSON.stringify(updatedReadIds));
  };

  const markAsRead = (id: string) => {
    if (!readIds.includes(id)) {
      const updated = [...readIds, id];
      setReadIds(updated);
      localStorage.setItem("office_staff_read_notification_ids", JSON.stringify(updated));
    }
  };

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadIds(allIds);
    localStorage.setItem("office_staff_read_notification_ids", JSON.stringify(allIds));
  };

  const formatNumberPlate = (plate?: string): string => {
    if (!plate) return "";
    const cleaned = plate.trim();
    if (cleaned.includes("-")) return cleaned;
    const m = cleaned.match(/^(.*[A-Za-z]+)(\d+)$/);
    if (m) return `${m[1].trim().toUpperCase()}-${m[2]}`;
    return cleaned;
  };

  // Filtering Effect
  useEffect(() => {
    let result = notifications;

    if (activeTab === "unread") {
      result = notifications.filter((n) => !readIds.includes(n.id));
    } else if (activeTab === "read") {
      result = notifications.filter((n) => readIds.includes(n.id));
    } else if (activeTab === "claims") {
      result = notifications.filter((n) => !!n.claim);
    } else if (activeTab === "registrations") {
      result = notifications.filter((n) => !!n.registration);
    }

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.description.toLowerCase().includes(q) ||
          (n.subText && n.subText.toLowerCase().includes(q))
      );
    }

    setFilteredNotifs(result);
  }, [activeTab, searchQuery, notifications, readIds]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
      <div className="flex flex-1 flex-row min-h-0">
        <OfficeStaffNavbar />

        {/* Main Spacious Container */}
        <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
          
          {/* Header styled matching the Portal color themes */}
          <header className="bg-white border-b border-slate-100 text-slate-800 px-8 py-4 flex justify-between items-center select-none shadow-sm flex-shrink-0 h-[80px] sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("open-mobile-menu"))}
                className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 active:scale-95 transition-all cursor-pointer focus:outline-none"
              >
                <HugeiconsIcon icon={Menu01Icon} className="w-6 h-6" strokeWidth={2.5} />
              </button>
              <h1 className="text-xl font-semibold text-slate-800 flex items-center gap-2 pl-2 lg:pl-0">
                <span className="bg-[#102A43] text-white text-base px-4 py-2 rounded-xl font-black shadow-sm tracking-wide">{branch} Branch</span>
                <span className="hidden lg:inline"> — Notifications Center</span>
              </h1>
            </div>
            <div className="flex items-center gap-5">
              {/* Active notifications indicator count badge */}
              <div className="text-sm font-semibold bg-slate-100 px-4 py-2 rounded-full select-none text-slate-600 border border-slate-200">
                {notifications.filter(n => !readIds.includes(n.id)).length} unread alerts
              </div>
              <UserAvatarDropdown userType="office_staff" />
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 p-4 lg:p-8 bg-slate-50 overflow-y-auto max-w-6xl w-full mx-auto flex flex-col gap-6">
            
            {/* Top controls Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 select-none bg-white p-5 border border-slate-200 rounded-[24px] shadow-sm">
              {/* Search Bar */}
              <div className="relative w-full max-w-[420px] bg-slate-50 border border-slate-200 rounded-full pl-5 pr-2 py-2 flex items-center gap-3 transition-all duration-200 focus-within:bg-white focus-within:border-[#f59e0b] focus-within:ring-4 focus-within:ring-[#f59e0b]/10">
                <span className="text-slate-400 flex items-center justify-center shrink-0">
                  <HugeiconsIcon icon={Search01Icon} className="w-5 h-5 text-slate-400" strokeWidth={2.5} />
                </span>
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-slate-800 text-[14px] placeholder-slate-400 focus:outline-none font-semibold"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer p-1"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4 text-slate-400 hover:text-slate-600" strokeWidth={2.5} />
                  </button>
                )}
              </div>

              {/* Mark All As Read */}
              {notifications.some(n => !readIds.includes(n.id)) && (
                <button
                  onClick={markAllAsRead}
                  className="bg-slate-100 hover:bg-slate-200 border-none text-slate-700 font-extrabold text-xs px-6 py-3 rounded-full transition-all cursor-pointer flex items-center gap-1.5 self-start md:self-center"
                >
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-5 h-5 text-slate-600" strokeWidth={2.5} />
                  Mark All as Read
                </button>
              )}
            </div>

            {/* Tab Filters */}
            <div className="flex flex-wrap gap-2 mb-2 pb-1 select-none">
              <button
                onClick={() => setActiveTab("all")}
                className={`font-black text-xs px-5 py-3 rounded-full border border-solid transition-all cursor-pointer ${
                  activeTab === "all"
                    ? "bg-[#f59e0b] border-[#f59e0b] text-white shadow-sm"
                    : "bg-white hover:bg-slate-100 border-slate-200 text-slate-500"
                }`}
              >
                All Alerts ({notifications.length})
              </button>
              <button
                onClick={() => setActiveTab("unread")}
                className={`font-black text-xs px-5 py-3 rounded-full border border-solid transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "unread"
                    ? "bg-[#e08900] border-[#e08900] text-white shadow-sm"
                    : "bg-white hover:bg-slate-100 border-slate-200 text-slate-500"
                }`}
              >
                Unread
                <span className={`text-[10px] font-black px-2 py-1 rounded-full ${
                  activeTab === "unread" ? "bg-white/20 text-white" : "bg-red-500 text-white"
                }`}>
                  {notifications.filter((n) => !readIds.includes(n.id)).length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("read")}
                className={`font-black text-xs px-5 py-3 rounded-full border border-solid transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "read"
                    ? "bg-slate-700 border-slate-700 text-white shadow-sm"
                    : "bg-white hover:bg-slate-100 border-slate-200 text-slate-500"
                }`}
              >
                Read
                <span className={`text-[10px] font-black px-2 py-1 rounded-full ${
                  activeTab === "read" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  {notifications.filter((n) => readIds.includes(n.id)).length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("claims")}
                className={`font-black text-xs px-5 py-3 rounded-full border border-solid transition-all cursor-pointer ${
                  activeTab === "claims"
                    ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                    : "bg-white hover:bg-slate-100 border-slate-200 text-slate-500"
                }`}
              >
                Claims Updates ({notifications.filter((n) => !!n.claim).length})
              </button>
              <button
                onClick={() => setActiveTab("registrations")}
                className={`font-black text-xs px-5 py-3 rounded-full border border-solid transition-all cursor-pointer ${
                  activeTab === "registrations"
                    ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                    : "bg-white hover:bg-slate-100 border-slate-200 text-slate-500"
                }`}
              >
                Policy Registrations ({notifications.filter((n) => !!n.registration).length})
              </button>
            </div>

            {/* Notifications Alert List */}
            <div className="flex flex-col gap-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-[28px] gap-4 shadow-sm">
                  <HugeiconsIcon icon={Loading03Icon} className="animate-spin h-8 w-8 text-[#f59e0b]" strokeWidth={2} />
                  <p className="text-slate-400 font-black text-sm">Loading alerts...</p>
                </div>
              ) : filteredNotifs.length > 0 ? (
                filteredNotifs.map((n) => {
                  const isUrgent = n.isUrgent;
                  const isRead = readIds.includes(n.id);

                  let borderLeft = "border-l-[6px] border-l-amber-500";
                  let iconStyle = "bg-amber-50 text-amber-600";
                  let iconSvg = (
                    <HugeiconsIcon icon={Clock01Icon} className="w-5 h-5 text-amber-600" strokeWidth={2.5} />
                  );

                  if (isUrgent) {
                    borderLeft = "border-l-[6px] border-l-red-500";
                    iconStyle = "bg-red-50 text-red-600";
                    iconSvg = (
                      <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5 text-red-600" strokeWidth={2.5} />
                    );
                  } else if (n.type === "decision") {
                    borderLeft = "border-l-[6px] border-l-emerald-500";
                    iconStyle = "bg-emerald-50 text-emerald-600";
                    iconSvg = (
                      <HugeiconsIcon icon={UserMultiple02Icon} className="w-5 h-5 text-emerald-600" strokeWidth={2.5} />
                    );
                  } else if (n.type === "message") {
                    borderLeft = "border-l-[6px] border-l-blue-500";
                    iconStyle = "bg-blue-50 text-blue-600";
                    iconSvg = (
                      <HugeiconsIcon icon={BubbleChatIcon} className="w-5 h-5 text-blue-600" strokeWidth={2.5} />
                    );
                  }

                  if (isRead) {
                    borderLeft = "border-l-[6px] border-l-slate-300";
                  }

                  return (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (n.claim) {
                          setSelectedClaim(n.claim);
                        } else if (n.registration) {
                          window.location.href = n.link;
                        }
                        markAsRead(n.id);
                      }}
                      className={`bg-white rounded-[24px] border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${borderLeft}`}
                    >
                      <div className="p-6 md:p-7 flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconStyle}`}>
                          {iconSvg}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <h4 className={`font-black text-slate-800 text-base md:text-md leading-snug ${isRead ? "opacity-75" : ""}`}>
                              {n.title}
                            </h4>
                            {!isRead && (
                              <span className="w-2 h-2 bg-[#f59e0b] rounded-full border border-white" title="Unread Alert" />
                            )}
                          </div>

                          <p className="text-slate-500 text-sm font-semibold leading-relaxed mt-2">
                            {n.description}
                          </p>
                        </div>
                      </div>

                      {/* Footer Actions row */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-slate-50/50 px-6 py-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
                      >
                        <div className="flex flex-wrap items-center gap-3 pl-0 md:pl-14">
                          <Link
                            href={n.link}
                            onClick={() => markAsRead(n.id)}
                            className={`font-black text-xs px-5 py-2 rounded-full transition-all duration-150 active:scale-[0.98] text-center no-underline ${
                              isUrgent
                                ? "bg-red-500 hover:bg-red-600 text-white"
                                : n.type === "decision"
                                ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                                : "bg-slate-800 hover:bg-slate-900 text-white"
                            }`}
                          >
                            {n.actionLabel}
                          </Link>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleReadStatus(n.id);
                            }}
                            className="bg-transparent hover:bg-slate-200/50 border border-solid border-slate-300 hover:border-slate-400 text-slate-500 font-extrabold text-xs px-4 py-2 rounded-full cursor-pointer transition-all duration-150 active:scale-[0.98]"
                          >
                            {isRead ? "Mark as Unread" : "Mark as Read"}
                          </button>
                        </div>
                        <span className="text-[11px] text-slate-400 font-bold self-end sm:self-center pr-2">
                          {n.date}
                        </span>
                      </div>

                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-[28px] gap-6 text-center px-8 shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                    <HugeiconsIcon icon={Notification01Icon} className="w-8 h-8 text-slate-400" strokeWidth={1.8} />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-700 text-lg">No Notifications Found</h4>
                    <p className="text-slate-400 font-semibold text-sm max-w-sm mt-2 leading-relaxed">
                      We couldn't find any updates or requests matching the current filters or query.
                    </p>
                  </div>
                </div>
              )}
            </div>

          </main>
        </div>
      </div>

      {/* Claim Detail Modal Popup */}
      {selectedClaim && (() => {
        const renderClaimProgress = (status: string, dbStep?: number) => {
          let currentStep = dbStep || 1;
          if (!dbStep) {
            const s = status.toLowerCase();
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

                let circleClass = "";
                if (isCompleted) {
                  circleClass = "border-[#00b050] text-[#00b050] bg-white";
                } else if (isActive) {
                  circleClass = "border-blue-500 text-blue-500 bg-[#e8f0fe]";
                } else {
                  circleClass = "border-slate-300 text-slate-400 bg-white";
                }

                return (
                  <div key={step.num} className="flex flex-col items-center z-10 flex-1">
                    <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-[14px] font-extrabold ${circleClass}`}>
                      {step.num}
                    </div>
                    <span className={`text-[11px] font-bold mt-2 leading-none ${isActive ? "text-blue-600 font-extrabold" : isCompleted ? "text-slate-800" : "text-slate-400"}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        };

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
            <div className="bg-white border border-slate-200 rounded-[24px] w-full max-w-[720px] max-h-[90vh] shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col relative transition-all duration-300 overflow-hidden">
              
              <div className="flex justify-between items-center px-8 pt-6 pb-4 border-b border-slate-200 flex-shrink-0">
                <h2 className="text-[20px] font-black text-slate-800 tracking-tight leading-none">
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
                {renderClaimProgress(selectedClaim.status, selectedClaim.currentStep)}

                <div className="grid grid-cols-2 gap-x-12 gap-y-5 text-[14px] font-semibold text-slate-600 mb-6 px-2">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold w-28 shrink-0">Vehicle Plate:</span>
                    <span className="font-extrabold text-slate-800">{formatNumberPlate(selectedClaim.vehiclePlate)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold w-28 shrink-0">Damage Type:</span>
                    <span className="font-extrabold text-slate-800">{selectedClaim.damageType}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold w-28 shrink-0">Evaluated Amount:</span>
                    <span className="font-extrabold text-slate-800">
                      {selectedClaim.amount ? `LKR ${selectedClaim.amount.toLocaleString()}` : "Not Evaluated"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold w-28 shrink-0">Incident Date:</span>
                    <span className="font-extrabold text-slate-800">{formatDate(selectedClaim.incidentDate)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold w-28 shrink-0">Policy Holder NIC:</span>
                    <span className="font-extrabold text-slate-800">{selectedClaim.userNic}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold w-28 shrink-0">Location:</span>
                    <span className="font-extrabold text-slate-800">{selectedClaim.location || "N/A"}</span>
                  </div>
                </div>

                {selectedClaim.description && (
                  <div className="px-2 mb-6">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Incident Description</p>
                    <p className="text-slate-600 text-sm font-medium leading-relaxed italic bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      "{selectedClaim.description}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
