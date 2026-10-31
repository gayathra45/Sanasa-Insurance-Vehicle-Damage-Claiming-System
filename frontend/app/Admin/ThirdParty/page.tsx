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

          {/* Table Container */}
          {activeTab === "optional-cards" ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              {loadingOrders ? (
                <div className="py-16">
                  <SimpleLoader message="Loading card orders..." />
                </div>
              ) : orders.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <HugeiconsIcon icon={CreditCardIcon} className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-semibold text-slate-600">No NFC Card Orders Found</p>
                  <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search keywords.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4">Order #</th>
                        <th className="py-3 px-4">Policyholder</th>
                        <th className="py-3 px-4">Branch</th>
                        <th className="py-3 px-4 text-center">Cards</th>
                        <th className="py-3 px-4">Payment</th>
                        <th className="py-3 px-4">Fulfillment Status</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {orders.map((o) => (
                        <tr
                          key={o._id}
                          className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                          onClick={() => setSelectedOrder(o)}
                        >
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-[#102A43]">{o.orderNumber}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{o.policyHolderName}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{o.policyHolderNic}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                              <HugeiconsIcon icon={Building01Icon} className="w-3.5 h-3.5 text-slate-400" />
                              {o.branch}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-bold text-[#102A43] bg-slate-100 px-2 py-0.5 rounded">
                              {o.quantity}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {o.payment?.status === "Paid" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Paid (LKR {o.totalAmount.toLocaleString()})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                {o.payment?.status || "Pending Payment"}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">{getStatusBadge(o.status)}</td>
                          <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                            {new Date(o.createdAt).toLocaleDateString("en-LK", {
                              month: "short",
                              day: "numeric",
                              year: "numeric"
                            })}
                          </td>
                          <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setSelectedOrder(o)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <HugeiconsIcon icon={ViewIcon} className="w-3.5 h-3.5" />
                              <span>Inspect</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              {loadingPermanent ? (
                <div className="py-16">
                  <SimpleLoader message="Loading permanent driver registrations..." />
                </div>
              ) : permanentRequests.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <HugeiconsIcon icon={UserCheck01Icon} className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-semibold text-slate-600">No Permanent Driver Records Found</p>
                  <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search keywords.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4">Pass Ref</th>
                        <th className="py-3 px-4">Authorized Driver</th>
                        <th className="py-3 px-4">Policyholder</th>
                        <th className="py-3 px-4">Branch</th>
                        <th className="py-3 px-4">Permitted Vehicles</th>
                        <th className="py-3 px-4">Authorization Status</th>
                        <th className="py-3 px-4">Registered</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {permanentRequests.map((req) => (
                        <tr
                          key={req._id}
                          className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                          onClick={() => setSelectedDriverReq(req)}
                        >
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-[#102A43]">
                              {req.requestReference || req._id.substring(0, 8)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{req.driverDetails.fullName}</div>
                            <div className="text-[11px] text-slate-500">
                              NIC: {req.driverDetails.nicNumber || "N/A"} • {req.driverDetails.phoneNumber}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800">{req.policyHolderName || "Owner"}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{req.policyHolderNic}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                              <HugeiconsIcon icon={Building01Icon} className="w-3.5 h-3.5 text-slate-400" />
                              {req.branch}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
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
                          </td>
                          <td className="py-3.5 px-4">{getStatusBadge(req.status)}</td>
                          <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                            {new Date(req.createdAt).toLocaleDateString("en-LK", {
                              month: "short",
                              day: "numeric",
                              year: "numeric"
                            })}
                          </td>
                          <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setSelectedDriverReq(req)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <HugeiconsIcon icon={ViewIcon} className="w-3.5 h-3.5" />
                              <span>Dossier</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Order Inspection Modal */}
          {selectedOrder && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8 max-h-[90vh] flex flex-col text-xs text-slate-800">
                <div className="px-6 py-5 bg-[#102A43] text-white flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                      <HugeiconsIcon icon={CreditCardIcon} className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold flex items-center gap-2">
                        <span>Order {selectedOrder.orderNumber}</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/20 font-normal">
                          {selectedOrder.status}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Placed on {new Date(selectedOrder.createdAt).toLocaleString("en-LK")}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                  {/* Order Overview */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Policyholder Details
                      </span>
                      <div className="font-bold text-sm text-[#102A43]">{selectedOrder.policyHolderName}</div>
                      <div className="space-y-1 text-slate-600">
                        <div>NIC: <span className="font-mono">{selectedOrder.policyHolderNic}</span></div>
                        {selectedOrder.policyHolderEmail && <div>Email: {selectedOrder.policyHolderEmail}</div>}
                        {selectedOrder.policyHolderPhone && <div>Phone: {selectedOrder.policyHolderPhone}</div>}
                        <div>Branch: <span className="font-semibold text-slate-800">{selectedOrder.branch}</span></div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Payment & Order Fee
                      </span>
                      <div className="text-sm font-bold text-slate-800">
                        LKR {selectedOrder.totalAmount?.toLocaleString()}
                        <span className="text-xs text-slate-400 font-normal ml-1">
                          ({selectedOrder.quantity} cards @ LKR 500)
                        </span>
                      </div>
                      <div className="space-y-1 text-slate-600">
                        <div>Payment Status: {selectedOrder.payment?.status}</div>
                        {selectedOrder.payment?.paidAt && (
                          <div>
                            Paid: {new Date(selectedOrder.payment.paidAt).toLocaleString("en-LK")}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Generated Cards */}
                  {selectedOrder.issuedCards && selectedOrder.issuedCards.length > 0 && (
                    <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                      <h4 className="font-bold text-sm text-[#102A43] flex items-center gap-1.5">
                        <HugeiconsIcon icon={CreditCardIcon} className="w-4 h-4 text-blue-600" />
                        <span>Generated NFC Card Records ({selectedOrder.issuedCards.length})</span>
                      </h4>
                      <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
                        {selectedOrder.issuedCards.map((card, idx) => (
                          <div
                            key={card.cardId || idx}
                            className="p-3 bg-slate-50/50 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
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
                    <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                      <h4 className="font-bold text-sm text-[#102A43] flex items-center gap-1.5">
                        <HugeiconsIcon icon={Clock01Icon} className="w-4 h-4 text-slate-500" />
                        <span>Audit & Progression Timeline</span>
                      </h4>
                      <div className="space-y-2.5 relative pl-4 border-l-2 border-slate-200 ml-1">
                        {selectedOrder.statusHistory.map((h, i) => (
                          <div key={i} className="relative">
                            <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-white" />
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-slate-800">{h.status}</span>
                              <span className="text-slate-400">
                                {new Date(h.timestamp).toLocaleString("en-LK")}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5">
                              {h.note || "Status updated"} • By: {h.updatedBy}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl font-semibold text-xs text-slate-700 transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Permanent Driver Dossier Modal */}
          {selectedDriverReq && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8 max-h-[90vh] flex flex-col text-xs text-slate-800">
                <div className="px-6 py-5 bg-[#102A43] text-white flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                      <HugeiconsIcon icon={UserCheck01Icon} className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold flex items-center gap-2">
                        <span>Pass Ref: {selectedDriverReq.requestReference}</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/20 font-normal">
                          {selectedDriverReq.status}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Driver: {selectedDriverReq.driverDetails.fullName} • Registered on{" "}
                        {new Date(selectedDriverReq.createdAt).toLocaleDateString("en-LK")}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedDriverReq(null)}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                  {/* Driver & Policyholder Overview */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Driver Profile
                      </span>
                      <div className="font-bold text-sm text-[#102A43]">
                        {selectedDriverReq.driverDetails.fullName}
                      </div>
                      <div className="space-y-1 text-slate-600">
                        <div>NIC: <span className="font-mono font-semibold">{selectedDriverReq.driverDetails.nicNumber || "N/A"}</span></div>
                        <div>Phone: <span className="font-medium">{selectedDriverReq.driverDetails.phoneNumber}</span></div>
                        <div>Address: {selectedDriverReq.driverDetails.residentialAddress}</div>
                        <div>Branch: <span className="font-semibold text-slate-800">{selectedDriverReq.branch}</span></div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Policyholder Details
                      </span>
                      <div className="font-bold text-sm text-[#102A43]">
                        {selectedDriverReq.policyHolderName || "Vehicle Owner"}
                      </div>
                      <div className="space-y-1 text-slate-600">
                        <div>NIC: <span className="font-mono font-semibold">{selectedDriverReq.policyHolderNic}</span></div>
                        {selectedDriverReq.policyHolderPhone && (
                          <div>Phone: {selectedDriverReq.policyHolderPhone}</div>
                        )}
                        {selectedDriverReq.policyHolderEmail && (
                          <div>Email: {selectedDriverReq.policyHolderEmail}</div>
                        )}
                        <div>Payment: <span className="font-semibold text-emerald-700">{selectedDriverReq.payment?.status}</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Permitted Vehicles */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                    <h4 className="font-bold text-sm text-[#102A43] flex items-center gap-1.5">
                      <HugeiconsIcon icon={Car01Icon} className="w-4 h-4 text-emerald-600" />
                      <span>Authorized Insured Vehicles ({(selectedDriverReq.selectedVehicles || []).length})</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(selectedDriverReq.selectedVehicles || []).map((v, i) => (
                        <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                          <div>
                            <span className="font-mono font-bold text-slate-900 text-xs block">{v.numberPlate}</span>
                            <span className="text-[11px] text-slate-500">{v.vehicleType || "Vehicle"} {v.model ? `• ${v.model}` : ""}</span>
                          </div>
                          {v.policyNumber && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-mono">
                              {v.policyNumber}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* KYC Documents */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                    <h4 className="font-bold text-sm text-[#102A43] flex items-center gap-1.5">
                      <HugeiconsIcon icon={File01Icon} className="w-4 h-4 text-blue-600" />
                      <span>KYC Verification Documents</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {selectedDriverReq.driverDetails?.documents?.nicFront && (
                        <a
                          href={selectedDriverReq.driverDetails.documents.nicFront}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-center transition-colors block"
                        >
                          <HugeiconsIcon icon={File01Icon} className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                          <span className="font-bold text-[11px] text-slate-800 block">NIC Front</span>
                          <span className="text-[9px] text-blue-600">View Document ↗</span>
                        </a>
                      )}
                      {selectedDriverReq.driverDetails?.documents?.nicBack && (
                        <a
                          href={selectedDriverReq.driverDetails.documents.nicBack}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-center transition-colors block"
                        >
                          <HugeiconsIcon icon={File01Icon} className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                          <span className="font-bold text-[11px] text-slate-800 block">NIC Back</span>
                          <span className="text-[9px] text-blue-600">View Document ↗</span>
                        </a>
                      )}
                      {selectedDriverReq.driverDetails?.documents?.drivingLicenceFront && (
                        <a
                          href={selectedDriverReq.driverDetails.documents.drivingLicenceFront}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-center transition-colors block"
                        >
                          <HugeiconsIcon icon={File01Icon} className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                          <span className="font-bold text-[11px] text-slate-800 block">Licence Front</span>
                          <span className="text-[9px] text-blue-600">View Document ↗</span>
                        </a>
                      )}
                      {selectedDriverReq.driverDetails?.documents?.drivingLicenceBack && (
                        <a
                          href={selectedDriverReq.driverDetails.documents.drivingLicenceBack}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-center transition-colors block"
                        >
                          <HugeiconsIcon icon={File01Icon} className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                          <span className="font-bold text-[11px] text-slate-800 block">Licence Back</span>
                          <span className="text-[9px] text-blue-600">View Document ↗</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Branch Review Information */}
                  {selectedDriverReq.branchReview && selectedDriverReq.branchReview.reviewedByStaffName && (
                    <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl">
                      <span className="font-bold text-[11px] text-blue-900 block">Branch Review Log</span>
                      <p className="text-[11px] text-blue-800 mt-0.5">
                        Reviewed by {selectedDriverReq.branchReview.reviewedByStaffName} on{" "}
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
                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl font-semibold text-xs text-slate-700 transition-colors cursor-pointer"
                  >
                    Close
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
