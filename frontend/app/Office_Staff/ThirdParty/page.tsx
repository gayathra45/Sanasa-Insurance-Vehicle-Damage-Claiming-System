"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import OfficeStaffNavbar from "@/app/Components/Office_Staff/Navbar";
import { API_URL } from "@/app/config";
import UserAvatarDropdown from "@/app/Components/UserAvatarDropdown";
import HeaderNotificationBell from "@/app/Components/HeaderNotificationBell";
import SimpleLoader from "@/app/Components/SimpleLoader";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Menu01Icon,
  Search01Icon,
  Cancel01Icon,
  Alert02Icon,
  CheckmarkCircle01Icon,
  ViewIcon,
  Car01Icon,
  Shield01Icon,
  CreditCardIcon,
  Copy01Icon,
  RefreshIcon,
  File01Icon,
  UserCheck01Icon,
  Building01Icon,
  Link01Icon,
  AlertCircleIcon
} from "@hugeicons/core-free-icons";

interface Vehicle {
  numberPlate: string;
  vehicleType?: string;
  model?: string;
  policyNumber?: string;
}

interface DriverDocuments {
  nicFront?: string;
  nicBack?: string;
  drivingLicenceFront?: string;
  drivingLicenceBack?: string;
}

interface DriverDetails {
  fullName: string;
  residentialAddress: string;
  phoneNumber: string;
  nicNumber?: string;
  documents?: DriverDocuments;
}

interface PaymentInfo {
  status: "Pending Payment" | "Paid" | "Failed";
  amountPaid?: number;
  currency?: string;
  paidAt?: string;
  stripePaymentIntentId?: string;
}

interface SecureAccess {
  rawToken?: string;
  accessUrl?: string;
  generatedAt?: string;
  isRevoked?: boolean;
  revokedAt?: string;
  revocationReason?: string;
}

interface ThirdPartyRequest {
  _id: string;
  requestReference: string;
  policyHolderNic: string;
  policyHolderName?: string;
  policyHolderEmail?: string;
  policyHolderPhone?: string;
  branch: string;
  driverDetails: DriverDetails;
  selectedVehicles: Vehicle[];
  fee: number;
  currency: string;
  status:
    | "Pending Payment"
    | "Pending Branch Approval"
    | "Approved"
    | "Rejected"
    | "Pending Termination Approval"
    | "Terminated";
  payment: PaymentInfo;
  secureAccess?: SecureAccess;
  branchReview?: {
    reviewedByStaffId?: string;
    reviewedByStaffName?: string;
    reviewedAt?: string;
    notes?: string;
    rejectionReason?: string;
  };
  terminationRequest?: {
    requestedBy?: string;
    requestedAt?: string;
    reason?: string;
    status?: "None" | "Pending Branch Approval" | "Approved" | "Rejected";
    reviewedBy?: string;
    reviewedByStaffId?: string;
    reviewedAt?: string;
    branchNotes?: string;
    rejectionReason?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function OfficeStaffThirdPartyPage() {
  const router = useRouter();
  const [branch, setBranch] = useState("");
  const [staffInfo, setStaffInfo] = useState<any>(null);

  const [requests, setRequests] = useState<ThirdPartyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    | "all"
    | "Pending Branch Approval"
    | "Pending Termination Approval"
    | "Approved"
    | "Rejected"
    | "Terminated"
    | "Pending Payment"
  >("all");

  // Selected request for details modal
  const [selectedReq, setSelectedReq] = useState<ThirdPartyRequest | null>(null);

  // Modals
  const [actionLoading, setActionLoading] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revocationReason, setRevocationReason] = useState("");

  // Termination Modals
  const [showApproveTerminationModal, setShowApproveTerminationModal] = useState(false);
  const [terminationNotes, setTerminationNotes] = useState("");
  const [showRejectTerminationModal, setShowRejectTerminationModal] = useState(false);
  const [rejectTerminationReason, setRejectTerminationReason] = useState("");

  // Document preview enlarged
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string } | null>(null);

  // Feedback notifications
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Authenticate Staff Member
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedStaff = sessionStorage.getItem("logged_in_staff");
    if (!savedStaff) {
      router.push("/Login");
      return;
    }
    try {
      const staffObj = JSON.parse(savedStaff);
      if (staffObj && staffObj.branch && staffObj._id) {
        setBranch(staffObj.branch);
        setStaffInfo(staffObj);
        loadRequests(staffObj._id, staffObj.branch);
      } else {
        router.push("/Login");
      }
    } catch (e) {
      router.push("/Login");
    }
  }, [router]);

  // 2. Fetch Branch Requests
  const loadRequests = async (staffId: string, staffBranch: string, isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      setRefreshing(true);
      const res = await fetch(`${API_URL}/third-party/branch/requests?staffId=${staffId}&limit=100`, {
        headers: {
          "x-staff-id": staffId
        }
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load branch requests");
      }

      const data = await res.json();
      const loaded: ThirdPartyRequest[] = data.requests || [];
      setRequests(loaded);

      // Keep selected request in sync
      if (selectedReq) {
        const updated = loaded.find((r) => r._id === selectedReq._id);
        if (updated) setSelectedReq(updated);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to load requests", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Auto-refresh interval (every 12s)
  useEffect(() => {
    if (!staffInfo?._id || !branch) return;
    const interval = setInterval(() => {
      loadRequests(staffInfo._id, branch, true);
    }, 12000);
    return () => clearInterval(interval);
  }, [staffInfo, branch, selectedReq]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter((r) => r.status === "Pending Branch Approval").length,
      pendingTermination: requests.filter((r) => r.status === "Pending Termination Approval").length,
      approved: requests.filter((r) => r.status === "Approved").length,
      rejected: requests.filter((r) => r.status === "Rejected").length,
      terminated: requests.filter((r) => r.status === "Terminated").length,
      unpaid: requests.filter((r) => r.status === "Pending Payment").length
    };
  }, [requests]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        req.requestReference.toLowerCase().includes(q) ||
        (req.driverDetails?.fullName && req.driverDetails.fullName.toLowerCase().includes(q)) ||
        (req.driverDetails?.phoneNumber && req.driverDetails.phoneNumber.toLowerCase().includes(q)) ||
        (req.driverDetails?.nicNumber && req.driverDetails.nicNumber.toLowerCase().includes(q)) ||
        (req.policyHolderNic && req.policyHolderNic.toLowerCase().includes(q)) ||
        (req.policyHolderName && req.policyHolderName.toLowerCase().includes(q)) ||
        req.selectedVehicles?.some((v) => v.numberPlate.toLowerCase().includes(q));

      const matchesStatus = statusFilter === "all" || req.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [requests, searchQuery, statusFilter]);

  // Helper for Document Proxy URLs
  const getDocumentUrl = (requestId: string, docType: string) => {
    if (!staffInfo?._id) return "";
    return `${API_URL}/third-party/documents/${requestId}/${docType}?staffId=${staffInfo._id}`;
  };

  // Handle Approve
  const handleApprove = async () => {
    if (!selectedReq || !staffInfo?._id) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/third-party/branch/approve/${selectedReq._id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-staff-id": staffInfo._id
        },
        body: JSON.stringify({ notes: approvalNotes })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Approval failed");
      }

      showToast(`Registration ${selectedReq.requestReference} approved successfully!`);
      setShowApproveConfirm(false);
      setApprovalNotes("");
      if (data.request) {
        setSelectedReq(data.request);
      }
      loadRequests(staffInfo._id, branch, true);
    } catch (err: any) {
      showToast(err.message || "Failed to approve registration", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reject
  const handleReject = async () => {
    if (!selectedReq || !staffInfo?._id) return;
    if (!rejectionReason.trim()) {
      showToast("Please provide a mandatory reason for rejection.", "error");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/third-party/branch/reject/${selectedReq._id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-staff-id": staffInfo._id
        },
        body: JSON.stringify({ reason: rejectionReason.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Rejection failed");
      }

      showToast(`Registration ${selectedReq.requestReference} was rejected.`, "success");
      setShowRejectModal(false);
      setRejectionReason("");
      if (data.request) {
        setSelectedReq(data.request);
      }
      loadRequests(staffInfo._id, branch, true);
    } catch (err: any) {
      showToast(err.message || "Failed to reject registration", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Revoke
  const handleRevoke = async () => {
    if (!selectedReq || !staffInfo?._id) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/third-party/branch/revoke-token/${selectedReq._id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-staff-id": staffInfo._id
        },
        body: JSON.stringify({ reason: revocationReason.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Revocation failed");
      }

      showToast(`Access token revoked for ${selectedReq.requestReference}.`, "success");
      setShowRevokeModal(false);
      setRevocationReason("");
      if (data.request) {
        setSelectedReq(data.request);
      }
      loadRequests(staffInfo._id, branch, true);
    } catch (err: any) {
      showToast(err.message || "Failed to revoke token", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Approve Termination
  const handleApproveTermination = async () => {
    if (!selectedReq || !staffInfo?._id) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/third-party/branch/approve-termination/${selectedReq._id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-staff-id": staffInfo._id
        },
        body: JSON.stringify({ notes: terminationNotes.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to approve driver termination");
      }

      showToast(
        `Driver authorization for ${selectedReq.driverDetails?.fullName || "driver"} has been terminated and access permanently revoked.`
      );
      setShowApproveTerminationModal(false);
      setTerminationNotes("");
      if (data.request) {
        setSelectedReq(data.request);
      }
      loadRequests(staffInfo._id, branch, true);
    } catch (err: any) {
      showToast(err.message || "Failed to approve termination", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reject Termination
  const handleRejectTermination = async () => {
    if (!selectedReq || !staffInfo?._id) return;
    if (!rejectTerminationReason.trim()) {
      showToast("Please provide a reason for rejecting the termination request.", "error");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/third-party/branch/reject-termination/${selectedReq._id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-staff-id": staffInfo._id
        },
        body: JSON.stringify({ reason: rejectTerminationReason.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reject termination");
      }

      showToast("Termination request rejected. Driver remains active.");
      setShowRejectTerminationModal(false);
      setRejectTerminationReason("");
      if (data.request) {
        setSelectedReq(data.request);
      }
      loadRequests(staffInfo._id, branch, true);
    } catch (err: any) {
      showToast(err.message || "Failed to reject termination", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Copy Access URL to Clipboard
  const handleCopyUrl = (url: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedToken(true);
    showToast("Driver access URL copied to clipboard!");
    setTimeout(() => setCopiedToken(false), 3000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending Branch Approval":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Pending Approval
          </span>
        );
      case "Pending Termination Approval":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            Termination Requested
          </span>
        );
      case "Approved":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-3.5 h-3.5" />
            Approved
          </span>
        );
      case "Terminated":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" />
            Terminated / Revoked
          </span>
        );
      case "Rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" />
            Rejected
          </span>
        );
      case "Pending Payment":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            Pending Payment
          </span>
        );
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {/* Sidebar Navigation */}
      <OfficeStaffNavbar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-100 text-slate-800 px-8 py-4 flex justify-between items-center select-none shadow-sm flex-shrink-0 h-[80px] sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("open-mobile-menu"));
                }
              }}
              className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 active:scale-95 transition-all cursor-pointer focus:outline-none"
            >
              <HugeiconsIcon icon={Menu01Icon} className="w-6 h-6" strokeWidth={2.5} />
            </button>
            <h1 className="text-xl font-semibold text-slate-800 flex items-center gap-2 pl-2 lg:pl-0">
              <span className="bg-[#102A43] text-white text-base px-4 py-2 rounded-xl font-semibold shadow-sm tracking-wide">
                {branch || "Galle"} Branch
              </span>
              <span className="hidden md:inline text-slate-400 font-medium">— Third-Party Drivers</span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => staffInfo?._id && loadRequests(staffInfo._id, branch)}
              disabled={refreshing}
              className="hidden sm:inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh requests"
            >
              <HugeiconsIcon
                icon={RefreshIcon}
                className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-600" : ""}`}
              />
              <span>Refresh</span>
            </button>
            <HeaderNotificationBell href="/Office_Staff/Notifications" />
            <UserAvatarDropdown userType="office_staff" />
          </div>
        </header>

        {/* Feedback Toast */}
        {toastMessage && (
          <div
            className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-2 animate-bounce ${
              toastMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
          >
            <HugeiconsIcon
              icon={toastMessage.type === "success" ? CheckmarkCircle01Icon : Alert02Icon}
              className="w-5 h-5 flex-shrink-0"
            />
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Subtitle / Context Bar */}
          <div className="-mt-1 mb-1">
            <p className="text-xs text-slate-500 font-normal">
              Review driver registration requests, verify KYC documents, and issue secure digital NFC passes.
            </p>
          </div>
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <HugeiconsIcon icon={Car01Icon} className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-[#102A43] mt-2">{stats.total}</div>
              <p className="text-xs text-slate-400 mt-1">Branch registrations</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-amber-200/80 bg-gradient-to-br from-white to-amber-50/30 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Pending Review</span>
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                </div>
              </div>
              <div className="text-2xl font-bold text-amber-800 mt-2">{stats.pending}</div>
              <p className="text-xs text-amber-600 mt-1">Paid, awaiting approval</p>
            </div>

            <div
              onClick={() => setStatusFilter("Pending Termination Approval")}
              className={`bg-white p-5 rounded-xl border transition-all cursor-pointer shadow-sm ${
                stats.pendingTermination > 0
                  ? "border-rose-300 bg-gradient-to-br from-white to-rose-50/40 ring-2 ring-rose-400/20"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
                  Terminations
                </span>
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                  {stats.pendingTermination > 0 ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                  ) : (
                    <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />
                  )}
                </div>
              </div>
              <div className="text-2xl font-bold text-rose-800 mt-2">{stats.pendingTermination}</div>
              <p className="text-xs text-rose-600 mt-1">Policyholder termination requests</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/30 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Approved</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-emerald-800 mt-2">{stats.approved}</div>
              <p className="text-xs text-emerald-600 mt-1">Active driver authorizations</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Terminated</span>
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                  <HugeiconsIcon icon={Shield01Icon} className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-800 mt-2">{stats.terminated}</div>
              <p className="text-xs text-slate-500 mt-1">Revoked authorizations</p>
            </div>
          </div>

          {/* Filtering and Search Controls */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {[
                { key: "all", label: "All" },
                { key: "Pending Branch Approval", label: "Pending Approval", count: stats.pending },
                {
                  key: "Pending Termination Approval",
                  label: "Termination Requests",
                  count: stats.pendingTermination,
                  alert: true
                },
                { key: "Approved", label: "Approved", count: stats.approved },
                { key: "Terminated", label: "Terminated", count: stats.terminated },
                { key: "Rejected", label: "Rejected" },
                { key: "Pending Payment", label: "Unpaid" }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    statusFilter === tab.key
                      ? "bg-[#102A43] text-white shadow-sm"
                      : tab.alert && tab.count && tab.count > 0
                      ? "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        statusFilter === tab.key
                          ? "bg-white/20 text-white"
                          : tab.alert
                          ? "bg-rose-600 text-white"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <HugeiconsIcon
                icon={Search01Icon}
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              />
              <input
                type="text"
                placeholder="Search reference, driver, plate..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102A43]/20 focus:border-[#102A43]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Table / List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <SimpleLoader />
                <p className="text-xs text-slate-500 mt-4">Loading branch requests...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="py-20 text-center px-4">
                <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <HugeiconsIcon icon={Car01Icon} className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-semibold text-slate-700">No registration requests found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your search criteria or status filter."
                    : `No third-party driver registration requests have been submitted for ${branch} Branch yet.`}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Reference</th>
                      <th className="py-3.5 px-4">Third-Party Driver</th>
                      <th className="py-3.5 px-4">Policyholder</th>
                      <th className="py-3.5 px-4">Vehicles</th>
                      <th className="py-3.5 px-4">Payment</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {filteredRequests.map((req) => (
                      <tr
                        key={req._id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          req.status === "Pending Branch Approval" ? "bg-amber-50/20" : ""
                        }`}
                      >
                        {/* Reference */}
                        <td className="py-3.5 px-4 font-mono font-semibold text-[#102A43]">
                          <div className="flex items-center gap-1.5">
                            <span>{req.requestReference}</span>
                          </div>
                        </td>

                        {/* Driver */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{req.driverDetails?.fullName || "—"}</div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {req.driverDetails?.nicNumber ? `NIC: ${req.driverDetails.nicNumber}` : req.driverDetails?.phoneNumber}
                          </div>
                        </td>

                        {/* Policyholder */}
                        <td className="py-3.5 px-4">
                          <div className="text-slate-800 font-medium">{req.policyHolderName || "—"}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{req.policyHolderNic}</div>
                        </td>

                        {/* Vehicles */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {req.selectedVehicles?.map((v) => (
                              <span
                                key={v.numberPlate}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-mono font-medium border border-slate-200"
                              >
                                <HugeiconsIcon icon={Car01Icon} className="w-3 h-3 text-slate-500" />
                                {v.numberPlate}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Payment */}
                        <td className="py-3.5 px-4">
                          {req.payment?.status === "Paid" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-3 h-3" />
                              LKR 300 (Paid)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <HugeiconsIcon icon={CreditCardIcon} className="w-3 h-3" />
                              Pending Payment
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">{getStatusBadge(req.status)}</td>

                        {/* Date */}
                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          {new Date(req.createdAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          })}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedReq(req);
                                setApprovalNotes("");
                                setRejectionReason("");
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                                req.status === "Pending Branch Approval"
                                  ? "bg-[#102A43] text-white hover:bg-[#102A43]/90 shadow-sm"
                                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                              }`}
                            >
                              <HugeiconsIcon icon={ViewIcon} className="w-3.5 h-3.5" />
                              <span>{req.status === "Pending Branch Approval" ? "Review" : "View"}</span>
                            </button>

                            {req.status === "Approved" && req.secureAccess?.accessUrl && (
                              <button
                                onClick={() => handleCopyUrl(req.secureAccess!.accessUrl!)}
                                className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition-colors"
                                title="Copy driver access link"
                              >
                                <HugeiconsIcon icon={Copy01Icon} className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail / Review Modal */}
      {selectedReq && (
        <div className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#102A43] text-white flex items-center justify-center shadow-md">
                  <HugeiconsIcon icon={UserCheck01Icon} className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[#102A43]">
                      Registration: {selectedReq.requestReference}
                    </h2>
                    {getStatusBadge(selectedReq.status)}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Branch: <span className="font-semibold text-slate-700">{selectedReq.branch}</span> • Submitted:{" "}
                    {new Date(selectedReq.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedReq(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Payment Alert banner if unpaid */}
              {selectedReq.payment?.status !== "Paid" && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                  <HugeiconsIcon icon={AlertCircleIcon} className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-800">
                    <p className="font-semibold">Payment Pending (LKR 300)</p>
                    <p className="mt-0.5 text-amber-700">
                      This registration cannot be approved until the policyholder completes the Stripe fee payment.
                    </p>
                  </div>
                </div>
              )}

              {/* Policyholder Termination Request Review Box */}
              {selectedReq.status === "Pending Termination Approval" && (
                <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-950 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center">
                        <HugeiconsIcon icon={Alert02Icon} className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-rose-900">
                        Driver Termination Requested by Policyholder
                      </span>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-200 text-rose-800 animate-pulse">
                      Awaiting Action
                    </span>
                  </div>

                  <p className="text-xs text-rose-800">
                    The policyholder (<span className="font-semibold">{selectedReq.policyHolderName || selectedReq.policyHolderNic}</span>) has submitted a formal request to terminate and revoke this driver's authorization.
                  </p>

                  <div className="bg-white p-3 rounded-lg border border-rose-200 text-xs">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Policyholder Stated Reason:
                    </div>
                    <div className="text-slate-900 font-medium mt-1">
                      {selectedReq.terminationRequest?.reason || "Policyholder requested driver termination."}
                    </div>
                    {selectedReq.terminationRequest?.requestedAt && (
                      <div className="text-[10px] text-slate-400 mt-1.5">
                        Submitted: {new Date(selectedReq.terminationRequest.requestedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Terminated Audit Box */}
              {selectedReq.status === "Terminated" && (
                <div className="p-4 rounded-xl bg-slate-100 border border-slate-300 text-slate-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-700 text-white flex items-center justify-center">
                      <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Driver Authorization Officially Terminated
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    This authorization is terminated. The driver's web and mobile app access are permanently blocked.
                  </p>
                  {selectedReq.terminationRequest?.reviewedAt && (
                    <div className="text-[11px] text-slate-500">
                      Approved by: {selectedReq.terminationRequest.reviewedBy || "Branch Staff"} on{" "}
                      {new Date(selectedReq.terminationRequest.reviewedAt).toLocaleString()}
                    </div>
                  )}
                  {selectedReq.terminationRequest?.branchNotes && (
                    <div className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 mt-1">
                      <span className="font-semibold text-slate-600">Branch Notes:</span>{" "}
                      {selectedReq.terminationRequest.branchNotes}
                    </div>
                  )}
                </div>
              )}

              {/* Secure Driver Token Box (If Approved) */}
              {selectedReq.status === "Approved" && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon icon={Shield01Icon} className="w-5 h-5 text-emerald-700" />
                      <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                        Driver Digital NFC & Access Pass
                      </span>
                    </div>
                    {selectedReq.secureAccess?.isRevoked ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700">
                        REVOKED
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-800">
                        ACTIVE
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-emerald-800">
                    Cryptographically generated secure token link prepared for the authorized third-party driver:
                  </p>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={selectedReq.secureAccess?.accessUrl || "Token generated"}
                      className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-emerald-300 rounded-lg text-slate-800 select-all focus:outline-none"
                    />
                    <button
                      onClick={() => handleCopyUrl(selectedReq.secureAccess?.accessUrl || "")}
                      disabled={selectedReq.secureAccess?.isRevoked}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <HugeiconsIcon icon={Copy01Icon} className="w-3.5 h-3.5" />
                      <span>{copiedToken ? "Copied!" : "Copy URL"}</span>
                    </button>
                  </div>

                  {!selectedReq.secureAccess?.isRevoked && (
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => setShowRevokeModal(true)}
                        className="text-[11px] text-rose-600 hover:text-rose-800 font-medium underline"
                      >
                        Revoke this driver's access token
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Rejection notice if Rejected */}
              {selectedReq.status === "Rejected" && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
                  <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-rose-800">
                    <p className="font-semibold">Application Rejected</p>
                    <p className="mt-0.5 text-rose-700">
                      Reason:{" "}
                      <span className="font-medium text-slate-800">
                        {selectedReq.branchReview?.rejectionReason || "Requirements not met"}
                      </span>
                    </p>
                    {selectedReq.branchReview?.reviewedAt && (
                      <p className="text-[11px] text-rose-500 mt-1">
                        Reviewed on {new Date(selectedReq.branchReview.reviewedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* 2-Column Info: Driver Details & Policyholder Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Driver Profile */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#102A43] uppercase tracking-wider border-b border-slate-200 pb-2">
                    <HugeiconsIcon icon={UserCheck01Icon} className="w-4 h-4 text-blue-600" />
                    <span>Third-Party Driver Profile</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Full Name</span>
                      <span className="font-semibold text-slate-800">
                        {selectedReq.driverDetails?.fullName || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">NIC Number</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {selectedReq.driverDetails?.nicNumber || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Contact Mobile</span>
                      <span className="font-mono text-slate-800">
                        {selectedReq.driverDetails?.phoneNumber || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Authorized Vehicles</span>
                      <span className="font-semibold text-blue-700">
                        {selectedReq.selectedVehicles?.length || 0} Vehicle(s)
                      </span>
                    </div>
                  </div>
                  <div className="text-xs pt-1 border-t border-slate-200/60">
                    <span className="text-slate-400 block text-[11px]">Residential Address</span>
                    <span className="text-slate-700">{selectedReq.driverDetails?.residentialAddress || "—"}</span>
                  </div>
                </div>

                {/* Policyholder Profile */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#102A43] uppercase tracking-wider border-b border-slate-200 pb-2">
                    <HugeiconsIcon icon={Building01Icon} className="w-4 h-4 text-blue-600" />
                    <span>Policyholder & Billing</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Policyholder Name</span>
                      <span className="font-semibold text-slate-800">
                        {selectedReq.policyHolderName || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Policyholder NIC</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {selectedReq.policyHolderNic}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Registration Fee</span>
                      <span className="font-semibold text-slate-900">LKR 300.00 (Fixed)</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Payment Status</span>
                      <span
                        className={`font-semibold ${
                          selectedReq.payment?.status === "Paid" ? "text-emerald-700" : "text-amber-700"
                        }`}
                      >
                        {selectedReq.payment?.status || "Pending"}
                      </span>
                    </div>
                  </div>
                  {selectedReq.payment?.paidAt && (
                    <div className="text-xs pt-1 border-t border-slate-200/60 text-slate-500">
                      Payment Settled: {new Date(selectedReq.payment.paidAt).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Authorized Vehicles Cards */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[#102A43] uppercase tracking-wider flex items-center gap-1.5">
                  <HugeiconsIcon icon={Car01Icon} className="w-4 h-4 text-blue-600" />
                  <span>Insured Vehicles Assigned to This Driver</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {selectedReq.selectedVehicles?.map((v) => (
                    <div
                      key={v.numberPlate}
                      className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center gap-3"
                    >
                      <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0">
                        <HugeiconsIcon icon={Car01Icon} className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-mono font-bold text-slate-900 text-xs">{v.numberPlate}</div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {v.model || v.vehicleType || "Vehicle"}
                        </div>
                        {v.policyNumber && (
                          <div className="text-[10px] text-slate-400 font-mono">Pol: {v.policyNumber}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Driver KYC Documents */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#102A43] uppercase tracking-wider flex items-center gap-1.5">
                  <HugeiconsIcon icon={File01Icon} className="w-4 h-4 text-blue-600" />
                  <span>Driver KYC & Verification Documents</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { key: "nicFront", label: "Driver NIC Front" },
                    { key: "nicBack", label: "Driver NIC Back" },
                    { key: "drivingLicenceFront", label: "Driving Licence Front" },
                    { key: "drivingLicenceBack", label: "Driving Licence Back" }
                  ].map((doc) => {
                    const docExists = !!(selectedReq.driverDetails?.documents as any)?.[doc.key];
                    const docUrl = getDocumentUrl(selectedReq._id, doc.key);

                    return (
                      <div
                        key={doc.key}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center flex flex-col justify-between"
                      >
                        <div>
                          <div className="text-[11px] font-semibold text-slate-700 mb-2">{doc.label}</div>
                          {docExists ? (
                            <div className="h-28 bg-slate-200 rounded-lg overflow-hidden relative group border border-slate-300 flex items-center justify-center">
                              <img
                                src={docUrl}
                                alt={doc.label}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                onError={(e) => {
                                  // Fallback placeholder icon if image fails to load directly
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setPreviewDoc({ title: doc.label, url: docUrl })}
                                  className="p-1.5 bg-white text-slate-800 rounded-lg hover:bg-slate-100 text-xs shadow-md"
                                  title="Enlarge preview"
                                >
                                  <HugeiconsIcon icon={ViewIcon} className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="h-28 bg-slate-100 rounded-lg border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                              <HugeiconsIcon icon={File01Icon} className="w-6 h-6 mb-1" />
                              <span className="text-[10px]">Not Provided</span>
                            </div>
                          )}
                        </div>

                        {docExists && (
                          <button
                            type="button"
                            onClick={() => setPreviewDoc({ title: doc.label, url: docUrl })}
                            className="mt-2 text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center justify-center gap-1"
                          >
                            <HugeiconsIcon icon={ViewIcon} className="w-3 h-3" />
                            <span>View Full Doc</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer / Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedReq(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {selectedReq.status === "Pending Branch Approval" && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowRejectModal(true)}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowApproveConfirm(true)}
                      disabled={actionLoading || selectedReq.payment?.status !== "Paid"}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
                      title={
                        selectedReq.payment?.status !== "Paid"
                          ? "Cannot approve an unpaid request"
                          : "Approve registration"
                      }
                    >
                      <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-3.5 h-3.5" />
                      <span>Approve Registration</span>
                    </button>
                  </>
                )}

                {selectedReq.status === "Pending Termination Approval" && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowRejectTerminationModal(true)}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" />
                      <span>Reject Termination</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowApproveTerminationModal(true)}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <HugeiconsIcon icon={Alert02Icon} className="w-3.5 h-3.5" />
                      <span>Approve Termination & Revoke Access</span>
                    </button>
                  </>
                )}

                {selectedReq.status === "Approved" && selectedReq.secureAccess?.accessUrl && (
                  <button
                    type="button"
                    onClick={() => handleCopyUrl(selectedReq.secureAccess!.accessUrl!)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <HugeiconsIcon icon={Copy01Icon} className="w-3.5 h-3.5" />
                    <span>{copiedToken ? "Copied!" : "Copy Driver URL"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {showApproveConfirm && selectedReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Approve Third-Party Registration</h3>
              <p className="text-xs text-slate-500 mt-1">
                You are approving driver <span className="font-semibold text-slate-800">{selectedReq.driverDetails?.fullName}</span> for {selectedReq.selectedVehicles?.length} vehicle(s).
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
              <p className="font-semibold text-slate-800">Upon approval:</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px]">
                <li>A cryptographically secure NFC/Mobile access URL will be generated.</li>
                <li>The driver will be authorized to access digital credentials for the selected vehicles.</li>
              </ul>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Branch Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Verified driver NIC & licence authenticity"
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowApproveConfirm(false)}
                disabled={actionLoading}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex-1 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {actionLoading ? "Approving..." : "Confirm Approval"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <HugeiconsIcon icon={Cancel01Icon} className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Reject Registration Request</h3>
              <p className="text-xs text-slate-500 mt-1">
                Please specify why this driver registration is being declined.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Rejection Reason <span className="text-rose-500">* (Mandatory)</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Driving licence photo is unreadable, please re-upload clear copies."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason("");
                }}
                disabled={actionLoading}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={actionLoading || !rejectionReason.trim()}
                className="flex-1 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {actionLoading ? "Declining..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Termination Modal */}
      {showApproveTerminationModal && selectedReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <HugeiconsIcon icon={Alert02Icon} className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Approve Driver Termination</h3>
              <p className="text-xs text-slate-500 mt-1">
                You are approving the termination of driver{" "}
                <span className="font-semibold text-slate-800">{selectedReq.driverDetails?.fullName}</span>.
              </p>
            </div>

            <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 text-xs text-rose-900 space-y-1">
              <p className="font-semibold">Security Action:</p>
              <ul className="list-disc list-inside text-[11px] space-y-0.5 text-rose-800">
                <li>Digital driver pass will be permanently invalidated.</li>
                <li>Driver web portal & mobile app logins will be blocked.</li>
                <li>SMS notices will be dispatched to both policyholder & driver.</li>
              </ul>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Branch Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Confirmed with policyholder via phone"
                value={terminationNotes}
                onChange={(e) => setTerminationNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowApproveTerminationModal(false);
                  setTerminationNotes("");
                }}
                disabled={actionLoading}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveTermination}
                disabled={actionLoading}
                className="flex-1 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {actionLoading ? "Terminating..." : "Confirm Termination"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Termination Modal */}
      {showRejectTerminationModal && selectedReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto">
              <HugeiconsIcon icon={Cancel01Icon} className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Decline Termination Request</h3>
              <p className="text-xs text-slate-500 mt-1">
                The driver will remain active and authorized on the policyholder's vehicle(s).
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Reason for Declining <span className="text-rose-500">* (Mandatory)</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Policyholder verbal request to cancel termination, dispute resolution pending."
                value={rejectTerminationReason}
                onChange={(e) => setRejectTerminationReason(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowRejectTerminationModal(false);
                  setRejectTerminationReason("");
                }}
                disabled={actionLoading}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectTermination}
                disabled={actionLoading || !rejectTerminationReason.trim()}
                className="flex-1 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {actionLoading ? "Processing..." : "Decline Termination"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Token Modal */}
      {showRevokeModal && selectedReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <HugeiconsIcon icon={Alert02Icon} className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Revoke Driver Access Token</h3>
              <p className="text-xs text-slate-500 mt-1">
                This will immediately invalidate the active digital access link for this driver.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Reason for Revocation (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Policyholder reported driver contract terminated"
                value={revocationReason}
                onChange={(e) => setRevocationReason(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowRevokeModal(false);
                  setRevocationReason("");
                }}
                disabled={actionLoading}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevoke}
                disabled={actionLoading}
                className="flex-1 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {actionLoading ? "Revoking..." : "Revoke Token"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enlarged Document Viewer Modal */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={File01Icon} className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold">{previewDoc.title}</span>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-white"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-slate-100 flex items-center justify-center min-h-[300px] max-h-[75vh] overflow-auto">
              <img
                src={previewDoc.url}
                alt={previewDoc.title}
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm"
              />
            </div>
            <div className="p-3 bg-white border-t border-slate-200 text-right">
              <a
                href={previewDoc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                Open in new tab
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
