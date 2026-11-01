"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import AdminNavbar from "@/app/Components/Admin/Navbar";
import UserAvatarDropdown from "@/app/Components/UserAvatarDropdown";
import SimpleLoader from "@/app/Components/SimpleLoader";
import { API_URL } from "@/app/config";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Menu01Icon,
  Search01Icon,
  RefreshIcon,
  Cancel01Icon,
  Alert02Icon,
  CheckmarkCircle01Icon,
  Building01Icon,
  UserIcon,
  File01Icon,
  Car01Icon,
  ViewIcon,
  Clock01Icon,
  CreditCardIcon,
  UserCheck01Icon,
  Copy01Icon,
  Link01Icon,
  Shield01Icon
} from "@hugeicons/core-free-icons";

interface NfcOrder {
  _id: string;
  orderNumber: string;
  policyHolderNic: string;
  policyHolderName: string;
  policyHolderEmail?: string;
  policyHolderPhone?: string;
  branch: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  currency: string;
  reason: string;
  status:
    | "Request Submitted"
    | "Approved"
    | "Processing"
    | "Ready for Collection"
    | "Collected"
    | "Rejected"
    | "Pending Payment"
    | "Paid"
    | "Fulfilled"
    | "Cancelled";
  rejectionReason?: string;
  statusHistory?: Array<{
    status: string;
    timestamp: string;
    updatedBy: string;
    note?: string;
  }>;
  branchReview?: {
    reviewedByStaffId?: string;
    reviewedByStaffName?: string;
    reviewedAt?: string;
    notes?: string;
  };
  collectionInfo?: {
    collectedAt?: string;
    collectedBy?: string;
    notes?: string;
  };
  payment: {
    status: "Pending Payment" | "Paid" | "Failed" | "Cancelled";
    amountPaid?: number;
    currency?: string;
    paidAt?: string;
    stripePaymentIntentId?: string;
  };
  issuedCards?: Array<{
    cardId: string;
    cardUrl?: string;
    rawToken?: string;
    tokenHash?: string;
    isPrepared?: boolean;
    preparedAt?: string;
    status?: string;
    issuedAt?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface PermanentDriverRequest {
  _id: string;
  requestReference: string;
  policyHolderNic: string;
  policyHolderName?: string;
  policyHolderEmail?: string;
  policyHolderPhone?: string;
  branch: string;
  driverDetails: {
    fullName: string;
    residentialAddress: string;
    phoneNumber: string;
    nicNumber?: string;
    documents?: {
      nicFront?: string;
      nicBack?: string;
      drivingLicenceFront?: string;
      drivingLicenceBack?: string;
    };
  };
  selectedVehicles: {
    numberPlate: string;
    vehicleType?: string;
    model?: string;
    policyNumber?: string;
  }[];
  fee: number;
  currency: string;
  status:
    | "Pending Payment"
    | "Pending Branch Approval"
    | "Approved"
    | "Rejected"
    | "Pending Termination Approval"
    | "Terminated"
    | "Temporarily Blocked"
    | "Expired"
    | "Scheduled";
  payment: {
    status: "Pending Payment" | "Paid" | "Failed";
    amountPaid?: number;
    paidAt?: string;
  };
  secureAccess?: {
    rawToken?: string;
    accessUrl?: string;
    isRevoked?: boolean;
    revokedAt?: string;
  };
  accessDuration?: {
    startDate?: string;
    endDate?: string;
    isExpired?: boolean;
  };
  accessLogs?: Array<{
    accessedAt: string;
    ipAddress?: string;
    userAgent?: string;
  }>;
  branchReview?: {
    reviewedByStaffId?: string;
    reviewedByStaffName?: string;
    reviewedAt?: string;
    notes?: string;
  };
  rejectionReason?: string;
  terminationDetails?: {
    reason?: string;
    requestedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function AdminThirdPartyPage() {
  const [activeTab, setActiveTab] = useState<"optional-cards" | "permanent">("optional-cards");

  // Orders State (Optional NFC Cards)
  const [orders, setOrders] = useState<NfcOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Permanent Driver Requests State
  const [permanentRequests, setPermanentRequests] = useState<PermanentDriverRequest[]>([]);
  const [loadingPermanent, setLoadingPermanent] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");

  // Selected for detail modal
  const [selectedOrder, setSelectedOrder] = useState<NfcOrder | null>(null);
  const [selectedDriverReq, setSelectedDriverReq] = useState<PermanentDriverRequest | null>(null);
  const [copiedCardId, setCopiedCardId] = useState<string | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch all NFC card orders across branches
  const fetchOrders = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoadingOrders(true);
      setRefreshing(true);

      const params = new URLSearchParams();
      if (branchFilter !== "all") params.append("branch", branchFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (paymentFilter !== "all") params.append("paymentStatus", paymentFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await fetch(`${API_URL}/nfc-card/admin/orders?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load admin card orders");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err: any) {
      showToast(err.message || "Failed to fetch orders", "error");
    } finally {
      setLoadingOrders(false);
      setRefreshing(false);
    }
  }, [branchFilter, statusFilter, paymentFilter, searchQuery]);

  // Fetch all permanent driver registrations across branches
  const fetchPermanentRequests = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoadingPermanent(true);
      setRefreshing(true);

      const params = new URLSearchParams();
      if (branchFilter !== "all") params.append("branch", branchFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      params.append("limit", "100");

      const res = await fetch(`${API_URL}/third-party/admin/all-requests?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load permanent driver registrations");
      const data = await res.json();
      setPermanentRequests(data.requests || []);
    } catch (err: any) {
      showToast(err.message || "Failed to fetch permanent driver records", "error");
    } finally {
      setLoadingPermanent(false);
      setRefreshing(false);
    }
  }, [branchFilter, statusFilter, searchQuery]);

  useEffect(() => {
    if (activeTab === "optional-cards") {
      fetchOrders();
    } else {
      fetchPermanentRequests();
    }
  }, [activeTab, fetchOrders, fetchPermanentRequests]);

  const handleRefresh = () => {
    if (activeTab === "optional-cards") {
      fetchOrders(true);
    } else {
      fetchPermanentRequests(true);
    }
  };

  // Unique branches extracted from orders and permanent requests
  const branchesList = useMemo(() => {
    const defaultBranches = ["Galle", "Colombo", "Kandy", "Matara", "Kurunegala", "Gampaha", "Kalutara", "Jaffna"];
    const foundOrders = orders.map((o) => o.branch).filter(Boolean);
    const foundPerm = permanentRequests.map((r) => r.branch).filter(Boolean);
    return Array.from(new Set([...defaultBranches, ...foundOrders, ...foundPerm])).sort();
  }, [orders, permanentRequests]);

  // Orders Stats
  const orderStats = useMemo(() => {
    return {
      total: orders.length,
      cardsRequested: orders.reduce((sum, o) => sum + (o.quantity || 1), 0),
      submitted: orders.filter((o) => o.status === "Request Submitted").length,
      approved: orders.filter((o) => o.status === "Approved").length,
      processing: orders.filter((o) => o.status === "Processing").length,
      ready: orders.filter((o) => o.status === "Ready for Collection").length,
      collected: orders.filter((o) => o.status === "Collected").length,
      rejected: orders.filter((o) => o.status === "Rejected").length,
      paidRevenue: orders
        .filter((o) => o.payment?.status === "Paid")
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0)
    };
  }, [orders]);

  // Permanent Driver Stats
  const permanentStats = useMemo(() => {
    return {
      total: permanentRequests.length,
      approved: permanentRequests.filter((r) => r.status === "Approved").length,
      pendingApproval: permanentRequests.filter((r) => r.status === "Pending Branch Approval").length,
      pendingTermination: permanentRequests.filter((r) => r.status === "Pending Termination Approval").length,
      terminated: permanentRequests.filter((r) => r.status === "Terminated").length,
      blocked: permanentRequests.filter((r) => r.status === "Temporarily Blocked").length,
      expired: permanentRequests.filter((r) => r.status === "Expired").length
    };
  }, [permanentRequests]);

  const handleCopyCardUrl = (cardId: string, url: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedCardId(cardId);
    showToast(`URL copied for ${cardId}`, "success");
    setTimeout(() => setCopiedCardId(null), 3000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Request Submitted":
      case "Pending Branch Approval":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            {status}
          </span>
        );
      case "Approved":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-3.5 h-3.5" />
            Approved & Active
          </span>
        );
      case "Processing":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <HugeiconsIcon icon={RefreshIcon} className="w-3.5 h-3.5 animate-spin" />
            Processing
          </span>
        );
      case "Ready for Collection":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-3.5 h-3.5" />
            Ready for Collection
          </span>
        );
      case "Collected":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300">
            <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-3.5 h-3.5" />
            Collected
          </span>
        );
      case "Pending Termination Approval":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
            <HugeiconsIcon icon={Alert02Icon} className="w-3.5 h-3.5" />
            Termination Pending
          </span>
        );
      case "Terminated":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" />
            Terminated
          </span>
        );
      case "Temporarily Blocked":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <HugeiconsIcon icon={Alert02Icon} className="w-3.5 h-3.5" />
            Temporarily Blocked
          </span>
        );
      case "Expired":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300">
            <HugeiconsIcon icon={Clock01Icon} className="w-3.5 h-3.5" />
            Expired
          </span>
        );
      case "Rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <AdminNavbar />

      <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-xs h-[72px]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("open-admin-mobile-menu"));
                }
              }}
              className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-lg"
            >
              <HugeiconsIcon icon={Menu01Icon} className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <span className="bg-[#102A43] text-white text-xs px-3 py-1.5 rounded-lg font-bold">
                Admin Center
              </span>
              <h1 className="text-lg font-bold text-slate-800">Third-Party & NFC Enterprise Oversight</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-800 disabled:opacity-50 cursor-pointer"
              title="Refresh"
            >
              <HugeiconsIcon
                icon={RefreshIcon}
                className={`w-5 h-5 ${refreshing ? "animate-spin text-blue-600" : ""}`}
              />
            </button>
            <UserAvatarDropdown userType="admin" />
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

        {/* Body */}
        <main className="flex-1 p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Top Category Tabs */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("optional-cards");
                  setStatusFilter("all");
                }}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "optional-cards"
                    ? "bg-[#102A43] text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <HugeiconsIcon icon={CreditCardIcon} className="w-4 h-4" />
                <span>Optional NFC Card Requests ({orderStats.total})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("permanent");
                  setStatusFilter("all");
                }}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "permanent"
                    ? "bg-[#102A43] text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <HugeiconsIcon icon={UserCheck01Icon} className="w-4 h-4" />
                <span>Permanent KYC Drivers ({permanentStats.total})</span>
              </button>
            </div>

            <a
              href="/Office_Staff/ThirdParty"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100 border border-slate-200 flex items-center gap-2 transition-colors"
            >
              <HugeiconsIcon icon={Link01Icon} className="w-3.5 h-3.5 text-slate-400" />
              <span>Open Branch Staff Workspace ↗</span>
            </a>
          </div>

          {/* Quick Metrics */}
          {activeTab === "optional-cards" ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3.5">
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Total Orders
                </span>
                <div className="text-2xl font-bold text-[#102A43] mt-1">{orderStats.total}</div>
                <span className="text-[11px] text-slate-400">{orderStats.cardsRequested} physical cards</span>
              </div>

              <div className="p-4 bg-white rounded-xl border border-amber-200 shadow-2xs">
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                  Pending Approval
                </span>
                <div className="text-2xl font-bold text-amber-800 mt-1">{orderStats.submitted}</div>
                <span className="text-[11px] text-amber-600">Awaiting branch review</span>
              </div>

              <div className="p-4 bg-white rounded-xl border border-indigo-200 shadow-2xs">
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                  Processing
                </span>
                <div className="text-2xl font-bold text-indigo-800 mt-1">{orderStats.processing}</div>
                <span className="text-[11px] text-indigo-600">Encoding & prep</span>
              </div>

              <div className="p-4 bg-white rounded-xl border border-blue-200 shadow-2xs">
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                  Ready at Branch
                </span>
                <div className="text-2xl font-bold text-blue-800 mt-1">{orderStats.ready}</div>
                <span className="text-[11px] text-blue-600">Awaiting collection</span>
              </div>

              <div className="p-4 bg-white rounded-xl border border-emerald-200 shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                  Collected
                </span>
                <div className="text-2xl font-bold text-emerald-800 mt-1">{orderStats.collected}</div>
                <span className="text-[11px] text-emerald-600">In circulation</span>
              </div>

              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Paid Revenue
                </span>
                <div className="text-xl font-bold text-[#102A43] mt-1">
                  LKR {orderStats.paidRevenue.toLocaleString()}
                </div>
                <span className="text-[11px] text-slate-400">Total card fees</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3.5">
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Total Registrations
                </span>
                <div className="text-2xl font-bold text-[#102A43] mt-1">{permanentStats.total}</div>
                <span className="text-[11px] text-slate-400">All regional branches</span>
              </div>

              <div className="p-4 bg-white rounded-xl border border-emerald-200 shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                  Approved & Active
                </span>
                <div className="text-2xl font-bold text-emerald-800 mt-1">{permanentStats.approved}</div>
                <span className="text-[11px] text-emerald-600">Verified driver passes</span>
              </div>

              <div className="p-4 bg-white rounded-xl border border-amber-200 shadow-2xs">
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                  Pending Review
                </span>
                <div className="text-2xl font-bold text-amber-800 mt-1">{permanentStats.pendingApproval}</div>
                <span className="text-[11px] text-amber-600">Requires branch verification</span>
              </div>

              <div className="p-4 bg-white rounded-xl border border-orange-200 shadow-2xs">
                <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider block">
                  Termination Pending
                </span>
                <div className="text-2xl font-bold text-orange-800 mt-1">{permanentStats.pendingTermination}</div>
                <span className="text-[11px] text-orange-600">Owner requested release</span>
              </div>

              <div className="p-4 bg-white rounded-xl border border-rose-200 shadow-2xs">
                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
                  Terminated
                </span>
                <div className="text-2xl font-bold text-rose-800 mt-1">{permanentStats.terminated}</div>
                <span className="text-[11px] text-rose-600">Access revoked</span>
              </div>

              <div className="p-4 bg-white rounded-xl border border-red-200 shadow-2xs">
                <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider block">
                  Temporarily Blocked
                </span>
                <div className="text-2xl font-bold text-red-800 mt-1">{permanentStats.blocked}</div>
                <span className="text-[11px] text-red-600">Paused by policyholder</span>
              </div>
            </div>
          )}

          {/* Filters Bar */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-[260px] max-w-md">
              <div className="relative w-full">
                <HugeiconsIcon
                  icon={Search01Icon}
                  className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    activeTab === "optional-cards"
                      ? "Search Order #, Policyholder NIC, name..."
                      : "Search Reference, Driver Name, NIC, Vehicle Plate..."
                  }
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Branch Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 font-medium">Branch:</span>
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="all">All Branches</option>
                  {branchesList.map((b) => (
                    <option key={b} value={b}>
                      {b} Branch
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 font-medium">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  {activeTab === "optional-cards" ? (
                    <>
                      <option value="Request Submitted">Request Submitted</option>
                      <option value="Approved">Approved</option>
                      <option value="Processing">Processing</option>
                      <option value="Ready for Collection">Ready for Collection</option>
                      <option value="Collected">Collected</option>
                      <option value="Rejected">Rejected</option>
                    </>
                  ) : (
                    <>
                      <option value="Approved">Approved & Active</option>
                      <option value="Pending Branch Approval">Pending Branch Approval</option>
                      <option value="Pending Termination Approval">Pending Termination Approval</option>
                      <option value="Temporarily Blocked">Temporarily Blocked</option>
                      <option value="Terminated">Terminated</option>
                      <option value="Expired">Expired</option>
                      <option value="Rejected">Rejected</option>
                    </>
                  )}
                </select>
              </div>

              {/* Payment Filter for Orders */}
              {activeTab === "optional-cards" && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 font-medium">Payment:</span>
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
                  >
                    <option value="all">All Payments</option>
                    <option value="Paid">Paid</option>
                    <option value="Pending Payment">Pending Payment</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* List Content */}
          {activeTab === "optional-cards" ? (
            loadingOrders ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs py-16">
                <SimpleLoader message="Loading card orders..." />
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs py-16 text-center text-slate-400">
                <HugeiconsIcon icon={CreditCardIcon} className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold text-slate-600">No NFC Card Orders Found</p>
                <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search keywords.</p>
              </div>
            ) : (
              <div className="overflow-x-auto pb-3 -mx-2 px-2">
                <div className="min-w-[1080px] flex flex-col gap-3">
                  {/* Proportional Grid Header */}
                  <div className="hidden md:grid md:grid-cols-[minmax(150px,1.4fr)_minmax(160px,1.5fr)_minmax(110px,1fr)_minmax(70px,0.6fr)_minmax(140px,1.2fr)_minmax(150px,1.3fr)_minmax(100px,0.9fr)_minmax(100px,0.9fr)] gap-4 px-5 py-3 text-slate-500 font-medium text-[10px] uppercase tracking-wider select-none bg-slate-50 rounded-xl border border-slate-200/60 border-l-[6px] border-l-transparent mb-1 items-center">
                    <div>Order #</div>
                    <div>Policyholder</div>
                    <div>Branch</div>
                    <div className="text-center">Cards</div>
                    <div>Payment</div>
                    <div>Fulfillment Status</div>
                    <div>Date</div>
                    <div className="text-right">Action</div>
                  </div>

                  {/* Card Rows with Colored Left Accent */}
                  {orders.map((o) => {
                    let borderAccentClass = "border-l-slate-300";
                    let gradientBgClass = "from-slate-50/20 via-transparent to-transparent";

                    if (o.status === "Collected") {
                      borderAccentClass = "border-l-slate-400";
                      gradientBgClass = "from-slate-50/30 via-transparent to-transparent";
                    } else if (o.status === "Ready for Collection") {
                      borderAccentClass = "border-l-blue-500";
                      gradientBgClass = "from-blue-50/30 via-transparent to-transparent";
                    } else if (o.status === "Approved") {
                      borderAccentClass = "border-l-emerald-500";
                      gradientBgClass = "from-emerald-50/30 via-transparent to-transparent";
                    } else if (o.status === "Processing") {
                      borderAccentClass = "border-l-indigo-500";
                      gradientBgClass = "from-indigo-50/30 via-transparent to-transparent";
                    } else if (o.status === "Request Submitted" || o.status === "Pending Payment") {
                      borderAccentClass = "border-l-amber-500";
                      gradientBgClass = "from-amber-50/30 via-transparent to-transparent";
                    } else if (o.status === "Rejected" || o.status === "Cancelled") {
                      borderAccentClass = "border-l-rose-500";
                      gradientBgClass = "from-rose-50/30 via-transparent to-transparent";
                    }

                    return (
                      <div
                        key={o._id}
                        onClick={() => setSelectedOrder(o)}
                        className={`bg-white border-l-[6px] ${borderAccentClass} bg-gradient-to-r ${gradientBgClass} border border-slate-200 rounded-xl px-5 py-3.5 flex flex-col md:grid md:grid-cols-[minmax(150px,1.4fr)_minmax(160px,1.5fr)_minmax(110px,1fr)_minmax(70px,0.6fr)_minmax(140px,1.2fr)_minmax(150px,1.3fr)_minmax(100px,0.9fr)_minmax(100px,0.9fr)] md:items-center gap-4 transition-all duration-200 shadow-2xs hover:shadow-md relative overflow-hidden group cursor-pointer`}
                      >
                        {/* Col 1: Order # */}
                        <div>
                          <span className="font-mono font-bold text-[#102A43] text-xs">{o.orderNumber}</span>
                        </div>

                        {/* Col 2: Policyholder */}
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-xs truncate">{o.policyHolderName}</div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">{o.policyHolderNic}</div>
                        </div>

                        {/* Col 3: Branch */}
                        <div className="min-w-0">
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-800 text-xs truncate">
                            <HugeiconsIcon icon={Building01Icon} className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {o.branch}
                          </span>
                        </div>

                        {/* Col 4: Cards */}
                        <div className="text-center md:text-center">
                          <span className="font-bold text-[#102A43] bg-slate-100 px-2 py-0.5 rounded text-xs">
                            {o.quantity}
                          </span>
                        </div>

                        {/* Col 5: Payment */}
                        <div>
                          {o.payment?.status === "Paid" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Paid (LKR {o.totalAmount.toLocaleString()})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              {o.payment?.status || "Pending Payment"}
                            </span>
                          )}
                        </div>

                        {/* Col 6: Fulfillment Status */}
                        <div>{getStatusBadge(o.status)}</div>

                        {/* Col 7: Date */}
                        <div>
                          <span className="text-slate-500 text-[11px]">
                            {new Date(o.createdAt).toLocaleDateString("en-LK", {
                              month: "short",
                              day: "numeric",
                              year: "numeric"
                            })}
                          </span>
                        </div>

                        {/* Col 8: Action */}
                        <div className="text-right flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedOrder(o)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <HugeiconsIcon icon={ViewIcon} className="w-3.5 h-3.5" />
                            <span>Inspect</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Bottom Summary Bar */}
                  <div className="px-5 py-3.5 bg-slate-50/90 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs text-slate-500 mt-1">
                    <span className="font-semibold text-slate-700">
                      Showing {orders.length} card purchase orders across all branches
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Click any order card or Inspect to review and manage fulfillment
                    </span>
                  </div>
                </div>
              </div>
            )
          ) : (
            loadingPermanent ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs py-16">
                <SimpleLoader message="Loading permanent driver registrations..." />
              </div>
            ) : permanentRequests.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs py-16 text-center text-slate-400">
                <HugeiconsIcon icon={UserCheck01Icon} className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold text-slate-600">No Permanent Driver Records Found</p>
                <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search keywords.</p>
              </div>
            ) : (
              <div className="overflow-x-auto pb-3 -mx-2 px-2">
                <div className="min-w-[1080px] flex flex-col gap-3">
                  {/* Proportional Grid Header */}
                  <div className="hidden md:grid md:grid-cols-[minmax(140px,1.3fr)_minmax(180px,1.6fr)_minmax(150px,1.3fr)_minmax(100px,0.9fr)_minmax(150px,1.3fr)_minmax(150px,1.3fr)_minmax(100px,0.9fr)_minmax(100px,0.9fr)] gap-4 px-5 py-3 text-slate-500 font-medium text-[10px] uppercase tracking-wider select-none bg-slate-50 rounded-xl border border-slate-200/60 border-l-[6px] border-l-transparent mb-1 items-center">
                    <div>Pass Ref</div>
                    <div>Authorized Driver</div>
                    <div>Policyholder</div>
                    <div>Branch</div>
                    <div>Permitted Vehicles</div>
                    <div>Authorization Status</div>
                    <div>Registered</div>
                    <div className="text-right">Action</div>
                  </div>

                  {/* Card Rows with Colored Left Accent */}
                  {permanentRequests.map((req) => {
                    let borderAccentClass = "border-l-slate-300";
                    let gradientBgClass = "from-slate-50/20 via-transparent to-transparent";

                    if (req.status === "Approved") {
                      borderAccentClass = "border-l-emerald-500";
                      gradientBgClass = "from-emerald-50/30 via-transparent to-transparent";
                    } else if (req.status === "Pending Branch Approval" || req.status === "Pending Payment") {
                      borderAccentClass = "border-l-amber-500";
                      gradientBgClass = "from-amber-50/30 via-transparent to-transparent";
                    } else if (req.status === "Pending Termination Approval") {
                      borderAccentClass = "border-l-orange-500";
                      gradientBgClass = "from-orange-50/30 via-transparent to-transparent";
                    } else if (req.status === "Terminated" || req.status === "Rejected" || req.status === "Temporarily Blocked") {
                      borderAccentClass = "border-l-rose-500";
                      gradientBgClass = "from-rose-50/30 via-transparent to-transparent";
                    }

                    return (
                      <div
                        key={req._id}
                        onClick={() => setSelectedDriverReq(req)}
                        className={`bg-white border-l-[6px] ${borderAccentClass} bg-gradient-to-r ${gradientBgClass} border border-slate-200 rounded-xl px-5 py-3.5 flex flex-col md:grid md:grid-cols-[minmax(140px,1.3fr)_minmax(180px,1.6fr)_minmax(150px,1.3fr)_minmax(100px,0.9fr)_minmax(150px,1.3fr)_minmax(150px,1.3fr)_minmax(100px,0.9fr)_minmax(100px,0.9fr)] md:items-center gap-4 transition-all duration-200 shadow-2xs hover:shadow-md relative overflow-hidden group cursor-pointer`}
                      >
                        {/* Col 1: Pass Ref */}
                        <div>
                          <span className="font-mono font-bold text-[#102A43] text-xs">
                            {req.requestReference || req._id.substring(0, 8)}
                          </span>
                        </div>

                        {/* Col 2: Authorized Driver */}
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-xs truncate">{req.driverDetails.fullName}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                            NIC: {req.driverDetails.nicNumber || "N/A"} • {req.driverDetails.phoneNumber}
                          </div>
                        </div>

                        {/* Col 3: Policyholder */}
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800 text-xs truncate">{req.policyHolderName || "Owner"}</div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">{req.policyHolderNic}</div>
                        </div>

                        {/* Col 4: Branch */}
                        <div className="min-w-0">
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-800 text-xs truncate">
                            <HugeiconsIcon icon={Building01Icon} className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {req.branch}
                          </span>
                        </div>

                        {/* Col 5: Permitted Vehicles */}
                        <div>
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {(req.selectedVehicles || []).map((v, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-mono font-bold text-slate-700"
                              >
                                {v.numberPlate}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Col 6: Authorization Status */}
                        <div>{getStatusBadge(req.status)}</div>

                        {/* Col 7: Registered */}
                        <div>
                          <span className="text-slate-500 text-[11px]">
                            {new Date(req.createdAt).toLocaleDateString("en-LK", {
                              month: "short",
                              day: "numeric",
                              year: "numeric"
                            })}
                          </span>
                        </div>

                        {/* Col 8: Action */}
                        <div className="text-right flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedDriverReq(req)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <HugeiconsIcon icon={ViewIcon} className="w-3.5 h-3.5" />
                            <span>Dossier</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Bottom Summary Bar */}
                  <div className="px-5 py-3.5 bg-slate-50/90 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs text-slate-500 mt-1">
                    <span className="font-semibold text-slate-700">
                      Showing {permanentRequests.length} driver registrations across all branches
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Click any driver card or Dossier to view full verification details & documents
                    </span>
                  </div>
                </div>
              </div>
            )
          )}

          {/* Order Inspection Modal */}
          {selectedOrder && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col text-xs text-slate-800 animate-in fade-in zoom-in-95 duration-150">
                {/* Modal Header matching Branch UI */}
                <div className="p-6 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#102A43] to-[#1B365D] text-white flex items-center justify-center shadow-xs">
                      <HugeiconsIcon icon={CreditCardIcon} className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-[#102A43]">
                          Order #{selectedOrder.orderNumber}
                        </h2>
                        {getStatusBadge(selectedOrder.status)}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Branch: <span className="font-semibold text-slate-700">{selectedOrder.branch}</span> • Placed on{" "}
                        {new Date(selectedOrder.createdAt).toLocaleString("en-LK")}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                  {/* Order Overview */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#102A43] uppercase tracking-wider border-b border-slate-200 pb-2">
                        <HugeiconsIcon icon={UserIcon} className="w-4 h-4 text-blue-600" />
                        <span>Policyholder Details</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Full Name</span>
                          <span className="font-semibold text-slate-800">{selectedOrder.policyHolderName}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">NIC Number</span>
                          <span className="font-mono font-semibold text-slate-800">{selectedOrder.policyHolderNic}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Contact Mobile</span>
                          <span className="font-medium text-slate-800">{selectedOrder.policyHolderPhone || "—"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Branch Office</span>
                          <span className="font-semibold text-slate-800">{selectedOrder.branch}</span>
                        </div>
                      </div>
                      {selectedOrder.policyHolderEmail && (
                        <div className="text-xs pt-1 border-t border-slate-200/60 text-slate-500">
                          Email: <span className="font-medium text-slate-700">{selectedOrder.policyHolderEmail}</span>
                        </div>
                      )}
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#102A43] uppercase tracking-wider border-b border-slate-200 pb-2">
                        <HugeiconsIcon icon={CreditCardIcon} className="w-4 h-4 text-blue-600" />
                        <span>Payment & Order Fee</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Total Fee</span>
                          <span className="font-bold text-slate-900 text-sm">
                            LKR {selectedOrder.totalAmount?.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Quantity</span>
                          <span className="font-semibold text-blue-700">
                            {selectedOrder.quantity} Card(s) @ LKR 500
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Payment Status</span>
                          <span
                            className={`font-semibold ${
                              selectedOrder.payment?.status === "Paid" ? "text-emerald-700" : "text-amber-700"
                            }`}
                          >
                            {selectedOrder.payment?.status || "Pending Payment"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Payment Date</span>
                          <span className="text-slate-700 font-medium">
                            {selectedOrder.payment?.paidAt
                              ? new Date(selectedOrder.payment.paidAt).toLocaleDateString("en-LK")
                              : "—"}
                          </span>
                        </div>
                      </div>
                      {selectedOrder.payment?.paidAt && (
                        <div className="text-xs pt-1 border-t border-slate-200/60 text-slate-500">
                          Settled on {new Date(selectedOrder.payment.paidAt).toLocaleTimeString("en-LK")}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Generated Cards */}
                  {selectedOrder.issuedCards && selectedOrder.issuedCards.length > 0 && (
                    <div className="space-y-2.5">
                      <h4 className="text-xs font-bold text-[#102A43] uppercase tracking-wider flex items-center gap-1.5">
                        <HugeiconsIcon icon={CreditCardIcon} className="w-4 h-4 text-blue-600" />
                        <span>Generated NFC Card Records ({selectedOrder.issuedCards.length})</span>
                      </h4>
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                        {selectedOrder.issuedCards.map((card, idx) => (
                          <div
                            key={card.cardId || idx}
                            className="p-3 bg-slate-50/50 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-800 text-xs">
                                  {card.cardId}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                  {card.status || "Pending Preparation"}
                                </span>
                              </div>
                              {card.cardUrl && (
                                <div className="text-[11px] text-slate-500 font-mono mt-0.5 truncate max-w-md">
                                  {card.cardUrl}
                                </div>
                              )}
                            </div>

                            {card.cardUrl && (
                              <button
                                onClick={() => handleCopyCardUrl(card.cardId, card.cardUrl || "")}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer bg-white border border-slate-200 hover:bg-slate-100 text-slate-700"
                              >
                                <HugeiconsIcon icon={Copy01Icon} className="w-3.5 h-3.5" />
                                <span>{copiedCardId === card.cardId ? "Copied!" : "Copy URL"}</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Audit History */}
                  {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 && (
                    <div className="space-y-2.5">
                      <h4 className="text-xs font-bold text-[#102A43] uppercase tracking-wider flex items-center gap-1.5">
                        <HugeiconsIcon icon={Clock01Icon} className="w-4 h-4 text-blue-600" />
                        <span>Audit & Progression Timeline</span>
                      </h4>
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="space-y-3 relative pl-4 border-l-2 border-slate-300 ml-1">
                          {selectedOrder.statusHistory.map((h, i) => (
                            <div key={i} className="relative">
                              <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#102A43] ring-2 ring-white" />
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-slate-800">{h.status}</span>
                                <span className="text-slate-400">
                                  {new Date(h.timestamp).toLocaleString("en-LK")}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 mt-0.5">
                                {h.note || "Status updated"} • By: <span className="font-semibold text-slate-700">{h.updatedBy}</span>
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="px-5 py-2.5 bg-[#102A43] hover:bg-[#1B365D] text-white rounded-xl font-bold text-xs transition-colors cursor-pointer shadow-xs active:scale-95"
                  >
                    Close Order
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Permanent Driver Dossier Modal */}
          {selectedDriverReq && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col text-xs text-slate-800 animate-in fade-in zoom-in-95 duration-150">
                {/* Modal Header matching Branch UI */}
                <div className="p-6 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#102A43] to-[#1B365D] text-white flex items-center justify-center shadow-xs">
                      <HugeiconsIcon icon={UserCheck01Icon} className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-[#102A43]">
                          Pass Ref: {selectedDriverReq.requestReference || selectedDriverReq._id.substring(0, 8)}
                        </h2>
                        {getStatusBadge(selectedDriverReq.status)}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Driver: <span className="font-semibold text-slate-700">{selectedDriverReq.driverDetails.fullName}</span> • Branch:{" "}
                        <span className="font-semibold text-slate-700">{selectedDriverReq.branch}</span> • Registered on{" "}
                        {new Date(selectedDriverReq.createdAt).toLocaleDateString("en-LK", {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedDriverReq(null)}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                  {/* Driver & Policyholder Overview Cards */}
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
                            {selectedDriverReq.driverDetails.fullName}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">NIC Number</span>
                          <span className="font-mono font-semibold text-slate-800">
                            {selectedDriverReq.driverDetails.nicNumber || "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Contact Mobile</span>
                          <span className="font-medium text-slate-800">
                            {selectedDriverReq.driverDetails.phoneNumber}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Branch Office</span>
                          <span className="font-semibold text-slate-800">{selectedDriverReq.branch}</span>
                        </div>
                      </div>
                      <div className="text-xs pt-1 border-t border-slate-200/60">
                        <span className="text-slate-400 block text-[11px]">Residential Address</span>
                        <span className="text-slate-700">{selectedDriverReq.driverDetails.residentialAddress}</span>
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
                            {selectedDriverReq.policyHolderName || "Vehicle Owner"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Policyholder NIC</span>
                          <span className="font-mono font-semibold text-slate-800">
                            {selectedDriverReq.policyHolderNic}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Contact Mobile</span>
                          <span className="font-medium text-slate-800">
                            {selectedDriverReq.policyHolderPhone || "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Payment Status</span>
                          <span
                            className={`font-semibold ${
                              selectedDriverReq.payment?.status === "Paid"
                                ? "text-emerald-700"
                                : "text-amber-700"
                            }`}
                          >
                            {selectedDriverReq.payment?.status || "Pending"}
                          </span>
                        </div>
                      </div>
                      {selectedDriverReq.policyHolderEmail && (
                        <div className="text-xs pt-1 border-t border-slate-200/60 text-slate-500">
                          Email: <span className="font-medium text-slate-700">{selectedDriverReq.policyHolderEmail}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Permitted Vehicles */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold text-[#102A43] uppercase tracking-wider flex items-center gap-1.5">
                      <HugeiconsIcon icon={Car01Icon} className="w-4 h-4 text-blue-600" />
                      <span>Authorized Insured Vehicles ({(selectedDriverReq.selectedVehicles || []).length})</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {(selectedDriverReq.selectedVehicles || []).map((v, i) => (
                        <div
                          key={i}
                          className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center gap-3"
                        >
                          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0">
                            <HugeiconsIcon icon={Car01Icon} className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="font-mono font-bold text-slate-900 text-xs block">{v.numberPlate}</span>
                            <span className="text-[11px] text-slate-500 truncate block">
                              {v.vehicleType || "Vehicle"} {v.model ? `• ${v.model}` : ""}
                            </span>
                            {v.policyNumber && (
                              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                                Pol: {v.policyNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {(!selectedDriverReq.selectedVehicles || selectedDriverReq.selectedVehicles.length === 0) && (
                        <span className="text-xs text-slate-400 italic">No assigned vehicles</span>
                      )}
                    </div>
                  </div>

                  {/* KYC Documents */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold text-[#102A43] uppercase tracking-wider flex items-center gap-1.5">
                      <HugeiconsIcon icon={File01Icon} className="w-4 h-4 text-blue-600" />
                      <span>Driver KYC & Verification Documents</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { key: "nicFront", label: "Driver NIC Front", url: selectedDriverReq.driverDetails?.documents?.nicFront },
                        { key: "nicBack", label: "Driver NIC Back", url: selectedDriverReq.driverDetails?.documents?.nicBack },
                        { key: "drivingLicenceFront", label: "Licence Front", url: selectedDriverReq.driverDetails?.documents?.drivingLicenceFront },
                        { key: "drivingLicenceBack", label: "Licence Back", url: selectedDriverReq.driverDetails?.documents?.drivingLicenceBack }
                      ].map((doc) => (
                        <div
                          key={doc.key}
                          className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center flex flex-col justify-between hover:border-slate-300 transition-colors"
                        >
                          <div>
                            <div className="text-[11px] font-semibold text-slate-700 mb-2">{doc.label}</div>
                            {doc.url ? (
                              <div className="h-28 bg-slate-200 rounded-lg overflow-hidden relative group border border-slate-300 flex items-center justify-center">
                                <img
                                  src={doc.url}
                                  alt={doc.label}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = "none";
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <a
                                    href={doc.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 bg-white text-slate-800 rounded-lg hover:bg-slate-100 text-xs shadow-md"
                                    title="Open document"
                                  >
                                    <HugeiconsIcon icon={ViewIcon} className="w-4 h-4" />
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <div className="h-28 bg-slate-100 rounded-lg border border-dashed border-slate-300 flex flex-col items-center justify-center p-2 text-slate-400">
                                <HugeiconsIcon icon={File01Icon} className="w-6 h-6 mb-1 text-slate-300" />
                                <span className="text-[10px]">Not uploaded</span>
                              </div>
                            )}
                          </div>
                          {doc.url && (
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 text-[11px] text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center justify-center gap-1"
                            >
                              <span>View Document</span>
                              <span>↗</span>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Secure Access Token (If Approved) */}
                  {selectedDriverReq.status === "Approved" && selectedDriverReq.secureAccess?.accessUrl && (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <HugeiconsIcon icon={Shield01Icon} className="w-5 h-5 text-emerald-700" />
                          <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                            Driver Digital NFC & Access Pass
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-800">
                          ACTIVE
                        </span>
                      </div>
                      <p className="text-xs text-emerald-800">
                        Cryptographically generated secure token link prepared for the authorized third-party driver:
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={selectedDriverReq.secureAccess.accessUrl}
                          className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-emerald-300 rounded-lg text-slate-800 select-all focus:outline-none"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(selectedDriverReq.secureAccess!.accessUrl!);
                            showToast("Pass link copied!", "success");
                          }}
                          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <HugeiconsIcon icon={Copy01Icon} className="w-3.5 h-3.5" />
                          <span>Copy URL</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Branch Review Information */}
                  {selectedDriverReq.branchReview && selectedDriverReq.branchReview.reviewedByStaffName && (
                    <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs">
                      <span className="font-bold text-blue-900 block">Branch Review Log</span>
                      <p className="text-blue-800 mt-0.5">
                        Reviewed by <span className="font-semibold">{selectedDriverReq.branchReview.reviewedByStaffName}</span> on{" "}
                        {selectedDriverReq.branchReview.reviewedAt
                          ? new Date(selectedDriverReq.branchReview.reviewedAt).toLocaleString("en-LK")
                          : "N/A"}
                        {selectedDriverReq.branchReview.notes ? ` • Note: ${selectedDriverReq.branchReview.notes}` : ""}
                      </p>
                    </div>
                  )}
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                  <button
                    onClick={() => setSelectedDriverReq(null)}
                    className="px-5 py-2.5 bg-[#102A43] hover:bg-[#1B365D] text-white rounded-xl font-bold text-xs transition-colors cursor-pointer shadow-xs active:scale-95"
                  >
                    Close Dossier
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
