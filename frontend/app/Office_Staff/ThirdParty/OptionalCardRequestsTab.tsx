"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { API_URL } from "@/app/config";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CreditCardIcon,
  Search01Icon,
  RefreshIcon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
  Alert02Icon,
  Copy01Icon,
  Link01Icon,
  ViewIcon,
  Calendar01Icon,
  UserIcon,
  SmartPhone01Icon,
  Building01Icon,
  Clock01Icon,
  Shield01Icon,
  File01Icon
} from "@hugeicons/core-free-icons";

export interface NfcOrder {
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
    stripeSessionId?: string;
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
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface OptionalCardRequestsTabProps {
  branch: string;
  staffInfo: {
    _id: string;
    name?: string;
    email?: string;
    branch?: string;
  };
  showToast: (text: string, type?: "success" | "error") => void;
}

export default function OptionalCardRequestsTab({
  branch,
  staffInfo,
  showToast
}: OptionalCardRequestsTabProps) {
  const [orders, setOrders] = useState<NfcOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Selected Order for Details Modal
  const [selectedOrder, setSelectedOrder] = useState<NfcOrder | null>(null);

  // Action Modals State
  const [actionLoading, setActionLoading] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [collectorName, setCollectorName] = useState("");
  const [collectionNotes, setCollectionNotes] = useState("");
  const [showRevokeCardModal, setShowRevokeCardModal] = useState(false);
  const [cardToRevoke, setCardToRevoke] = useState<string>("");
  const [revokeReason, setRevokeReason] = useState("");
  const [copiedCardId, setCopiedCardId] = useState<string | null>(null);

  // Load orders for this branch
  const fetchOrders = useCallback(
    async (isSilent = false) => {
      if (!branch) return;
      try {
        if (!isSilent) setLoading(true);
        setRefreshing(true);
        const res = await fetch(
          `${API_URL}/nfc-card/branch/orders?branch=${encodeURIComponent(branch)}`,
          {
            headers: {
              "x-staff-id": staffInfo?._id || "",
              "x-staff-branch": branch
            }
          }
        );

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to load branch card requests");
        }

        const data = await res.json();
        const loaded: NfcOrder[] = data.orders || [];
        setOrders(loaded);

        if (selectedOrder) {
          const updated = loaded.find((o) => o._id === selectedOrder._id);
          if (updated) setSelectedOrder(updated);
        }
      } catch (err: any) {
        showToast(err.message || "Failed to fetch card requests", "error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [branch, staffInfo, selectedOrder, showToast]
  );

  useEffect(() => {
    fetchOrders();
  }, [branch]);

  // Periodic auto-refresh every 15s
  useEffect(() => {
    if (!branch) return;
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [branch, fetchOrders]);

  // Summary Metrics
  const stats = useMemo(() => {
    return {
      total: orders.length,
      submitted: orders.filter((o) => o.status === "Request Submitted").length,
      approved: orders.filter((o) => o.status === "Approved").length,
      processing: orders.filter((o) => o.status === "Processing").length,
      ready: orders.filter((o) => o.status === "Ready for Collection").length,
      collected: orders.filter((o) => o.status === "Collected").length,
      rejected: orders.filter((o) => o.status === "Rejected").length,
      paidCount: orders.filter((o) => o.payment?.status === "Paid").length
    };
  }, [orders]);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.policyHolderName.toLowerCase().includes(q) ||
        o.policyHolderNic.toLowerCase().includes(q) ||
        (o.policyHolderPhone && o.policyHolderPhone.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "all" ||
        o.status === statusFilter ||
        (statusFilter === "Pending Review" && o.status === "Request Submitted");

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  // 1. Approve Request Handler
  const handleApprove = async () => {
    if (!selectedOrder || !staffInfo?._id) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/nfc-card/branch/approve/${selectedOrder._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: staffInfo._id,
          staffName: staffInfo.name || "Branch Staff",
          branch,
          notes: approvalNotes.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Approval failed");
      }

      showToast(
        `Order ${selectedOrder.orderNumber} approved! ${data.issuedCards?.length || selectedOrder.quantity} card records generated.`,
        "success"
      );
      setShowApproveModal(false);
      setApprovalNotes("");
      if (data.order) setSelectedOrder(data.order);
      fetchOrders(true);
    } catch (err: any) {
      showToast(err.message || "Failed to approve request", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Reject Request Handler
  const handleReject = async () => {
    if (!selectedOrder || !staffInfo?._id) return;
    if (!rejectionReason.trim()) {
      showToast("Please provide a mandatory reason for rejection.", "error");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/nfc-card/branch/reject/${selectedOrder._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: staffInfo._id,
          staffName: staffInfo.name || "Branch Staff",
          branch,
          reason: rejectionReason.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Rejection failed");
      }

      showToast(`Order ${selectedOrder.orderNumber} was rejected.`, "success");
      setShowRejectModal(false);
      setRejectionReason("");
      if (data.order) setSelectedOrder(data.order);
      fetchOrders(true);
    } catch (err: any) {
      showToast(err.message || "Failed to reject request", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Move to Processing Handler
  const handleProcessing = async () => {
    if (!selectedOrder || !staffInfo?._id) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/nfc-card/branch/processing/${selectedOrder._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: staffInfo._id,
          staffName: staffInfo.name || "Branch Staff",
          branch,
          notes: "Staff started physical writing and card preparation"
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to move order to processing");
      }

      showToast(`Order ${selectedOrder.orderNumber} moved to Processing.`, "success");
      if (data.order) setSelectedOrder(data.order);
      fetchOrders(true);
    } catch (err: any) {
      showToast(err.message || "Failed to update order", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Mark Ready for Collection Handler
  const handleReadyForCollection = async () => {
    if (!selectedOrder || !staffInfo?._id) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/nfc-card/branch/ready/${selectedOrder._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: staffInfo._id,
          staffName: staffInfo.name || "Branch Staff",
          branch,
          notes: "Physical NFC cards verified and confirmed ready for collection"
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to mark order ready");
      }

      showToast(
        `Order ${selectedOrder.orderNumber} marked Ready for Collection! Cards are now Available.`,
        "success"
      );
      if (data.order) setSelectedOrder(data.order);
      fetchOrders(true);
    } catch (err: any) {
      showToast(err.message || "Failed to mark ready", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Record Collection Handler
  const handleRecordCollection = async () => {
    if (!selectedOrder || !staffInfo?._id) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/nfc-card/branch/collect/${selectedOrder._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: staffInfo._id,
          staffName: staffInfo.name || "Branch Staff",
          branch,
          collectedBy: collectorName.trim() || selectedOrder.policyHolderName,
          notes: collectionNotes.trim() || "Cards collected at branch"
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record collection");
      }

      showToast(`Collection recorded successfully for ${selectedOrder.orderNumber}!`, "success");
      setShowCollectModal(false);
      setCollectorName("");
      setCollectionNotes("");
      if (data.order) setSelectedOrder(data.order);
      fetchOrders(true);
    } catch (err: any) {
      showToast(err.message || "Failed to record collection", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Revoke Card Handler
  const handleRevokeCard = async () => {
    if (!cardToRevoke || !staffInfo?._id) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/nfc-card/branch/revoke-card/${cardToRevoke}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: staffInfo._id,
          staffName: staffInfo.name || "Branch Staff",
          branch,
          reason: revokeReason.trim() || "Card revoked by branch staff"
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to revoke card");
      }

      showToast(`Card ${cardToRevoke} revoked immediately server-side.`, "success");
      setShowRevokeCardModal(false);
      setCardToRevoke("");
      setRevokeReason("");
      fetchOrders(true);
    } catch (err: any) {
      showToast(err.message || "Failed to revoke card", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Copy URL Helper
  const handleCopyCardUrl = (cardId: string, url: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedCardId(cardId);
    showToast(`URL copied for card ${cardId}`, "success");
    setTimeout(() => setCopiedCardId(null), 3000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Request Submitted":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Request Submitted
          </span>
        );
      case "Approved":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-3.5 h-3.5" />
            Approved
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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
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

  const getPaymentBadge = (status: string, amount: number) => {
    if (status === "Paid") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Paid (LKR {amount.toLocaleString()})
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Quick Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs hover:shadow-xs ${
            statusFilter === "all"
              ? "bg-white border-[#102A43] ring-2 ring-[#102A43]/20 shadow-sm"
              : "bg-white border-slate-200"
          }`}
        >
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            All Requests
          </span>
          <div className="text-xl font-bold text-[#102A43] mt-1">{stats.total}</div>
          <span className="text-[10px] text-slate-400">Total placed</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("Request Submitted")}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs hover:shadow-xs ${
            statusFilter === "Request Submitted"
              ? "bg-amber-50/70 border-amber-500 ring-2 ring-amber-400/30 shadow-sm"
              : "bg-white border-amber-200"
          }`}
        >
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
            New Requests
          </span>
          <div className="text-xl font-bold text-amber-800 mt-1">{stats.submitted}</div>
          <span className="text-[10px] text-amber-600">Awaiting approval</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("Approved")}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs hover:shadow-xs ${
            statusFilter === "Approved"
              ? "bg-blue-50/70 border-blue-500 ring-2 ring-blue-400/30 shadow-sm"
              : "bg-white border-blue-200"
          }`}
        >
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
            Approved
          </span>
          <div className="text-xl font-bold text-blue-800 mt-1">{stats.approved}</div>
          <span className="text-[10px] text-blue-600">Ready to prepare</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("Processing")}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs hover:shadow-xs ${
            statusFilter === "Processing"
              ? "bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-400/30 shadow-sm"
              : "bg-white border-indigo-200"
          }`}
        >
          <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
            Processing
          </span>
          <div className="text-xl font-bold text-indigo-800 mt-1">{stats.processing}</div>
          <span className="text-[10px] text-indigo-600">Writing NFC tags</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("Ready for Collection")}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs hover:shadow-xs ${
            statusFilter === "Ready for Collection"
              ? "bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-400/30 shadow-sm"
              : "bg-white border-emerald-200"
          }`}
        >
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
            Ready
          </span>
          <div className="text-xl font-bold text-emerald-800 mt-1">{stats.ready}</div>
          <span className="text-[10px] text-emerald-600">Available to collect</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("Collected")}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs hover:shadow-xs ${
            statusFilter === "Collected"
              ? "bg-slate-100 border-slate-700 ring-2 ring-slate-400/30 shadow-sm"
              : "bg-white border-slate-200"
          }`}
        >
          <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
            Collected
          </span>
          <div className="text-xl font-bold text-slate-800 mt-1">{stats.collected}</div>
          <span className="text-[10px] text-slate-500">Handed over</span>
        </button>
      </div>

      {/* Search and Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <HugeiconsIcon
            icon={Search01Icon}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order ID, policyholder, NIC, phone..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#102A43] focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#102A43]"
          >
            <option value="all">All Statuses</option>
            <option value="Request Submitted">Request Submitted (Pending Approval)</option>
            <option value="Approved">Approved</option>
            <option value="Processing">Processing (NFC Writing)</option>
            <option value="Ready for Collection">Ready for Collection</option>
            <option value="Collected">Collected</option>
            <option value="Rejected">Rejected</option>
          </select>

          <button
            onClick={() => fetchOrders()}
            disabled={refreshing}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Refresh order list"
          >
            <HugeiconsIcon
              icon={RefreshIcon}
              className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-600" : ""}`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <HugeiconsIcon
              icon={RefreshIcon}
              className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3"
            />
            <p className="text-sm font-semibold text-slate-700">Loading branch card orders...</p>
            <p className="text-xs text-slate-400 mt-1">Retrieving requests for {branch} Branch</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
              <HugeiconsIcon icon={CreditCardIcon} className="w-7 h-7" />
            </div>
            <h4 className="text-base font-semibold text-slate-700">No Optional Card Requests Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              {searchQuery
                ? `No requests match "${searchQuery}". Try clearing filters.`
                : `There are currently no Optional NFC Card purchase requests for ${branch} Branch.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Request ID</th>
                  <th className="py-3.5 px-4">Policy Holder</th>
                  <th className="py-3.5 px-4 text-center">Cards</th>
                  <th className="py-3.5 px-4">Payment</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Submission Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredOrders.map((order) => (
                  <tr
                    key={order._id}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-[#102A43]">
                      <div className="flex items-center gap-1.5">
                        <HugeiconsIcon icon={CreditCardIcon} className="w-4 h-4 text-slate-400" />
                        <span>{order.orderNumber}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{order.policyHolderName}</div>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                        <span>NIC: {order.policyHolderNic}</span>
                        {order.policyHolderPhone && <span>• {order.policyHolderPhone}</span>}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold bg-[#102A43]/5 text-[#102A43]">
                        {order.quantity} {order.quantity === 1 ? "Card" : "Cards"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {getPaymentBadge(order.payment?.status, order.totalAmount)}
                    </td>

                    <td className="py-3.5 px-4">{getStatusBadge(order.status)}</td>

                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {new Date(order.createdAt).toLocaleDateString("en-LK", {
                        timeZone: "Asia/Colombo",
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                      })}
                      <div className="text-[10px] text-slate-400">
                        {new Date(order.createdAt).toLocaleTimeString("en-LK", {
                          timeZone: "Asia/Colombo",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </div>
                    </td>

                    <td
                      className="py-3.5 px-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <HugeiconsIcon icon={ViewIcon} className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>

                        {order.status === "Request Submitted" && order.payment?.status === "Paid" && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowApproveModal(true);
                              }}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                            >
                              <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowRejectModal(true);
                              }}
                              className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {order.status === "Approved" && (
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              handleProcessing();
                            }}
                            className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                          >
                            <span>Start Processing</span>
                          </button>
                        )}

                        {order.status === "Processing" && (
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              handleReadyForCollection();
                            }}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                          >
                            <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-3.5 h-3.5" />
                            <span>Mark Ready</span>
                          </button>
                        )}

                        {order.status === "Ready for Collection" && (
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setCollectorName(order.policyHolderName);
                              setShowCollectModal(true);
                            }}
                            className="px-2.5 py-1.5 bg-[#102A43] hover:bg-[#1E3A8A] text-white font-semibold rounded-lg text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                          >
                            <span>Record Collection</span>
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

      {/* ============================================================== */}
      {/* ORDER DETAILS MODAL */}
      {/* ============================================================== */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-[#102A43] text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                  <HugeiconsIcon icon={CreditCardIcon} className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <span>Order {selectedOrder.orderNumber}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/20 text-white font-medium">
                      {selectedOrder.quantity} Cards
                    </span>
                  </h3>
                  <p className="text-xs text-white/70">
                    Requested for {selectedOrder.branch} Branch • Placed on{" "}
                    {new Date(selectedOrder.createdAt).toLocaleDateString("en-LK", {
                      timeZone: "Asia/Colombo",
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    })}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-white/80 hover:text-white"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 text-xs">
              {/* Status Workflow Progression */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-3">
                  Request Issuance Lifecycle
                </span>
                <div className="flex items-center justify-between relative">
                  {/* Stepper items */}
                  {[
                    "Request Submitted",
                    "Approved",
                    "Processing",
                    "Ready for Collection",
                    "Collected"
                  ].map((step, idx, arr) => {
                    const stepOrder = [
                      "Request Submitted",
                      "Approved",
                      "Processing",
                      "Ready for Collection",
                      "Collected"
                    ];
                    const currentIdx = stepOrder.indexOf(selectedOrder.status);
                    const isCompleted = currentIdx >= idx;
                    const isCurrent = selectedOrder.status === step;
                    const isRejected = selectedOrder.status === "Rejected";

                    return (
                      <div
                        key={step}
                        className="flex flex-col items-center text-center relative z-10 flex-1"
                      >
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            isRejected
                              ? "bg-rose-100 text-rose-700 border border-rose-300"
                              : isCompleted
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-slate-200 text-slate-500"
                          }`}
                        >
                          {isCompleted ? "✓" : idx + 1}
                        </div>
                        <span
                          className={`text-[10px] mt-1.5 font-medium leading-tight max-w-[70px] ${
                            isCurrent
                              ? "text-blue-700 font-bold"
                              : isCompleted
                              ? "text-slate-800"
                              : "text-slate-400"
                          }`}
                        >
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rejection Alert if rejected */}
              {selectedOrder.status === "Rejected" && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <HugeiconsIcon icon={Alert02Icon} className="w-4 h-4 text-rose-600" />
                    <span>Request Rejected by Branch</span>
                  </div>
                  <p className="mt-1 text-xs text-rose-700">
                    Reason: {selectedOrder.rejectionReason || "No details provided."}
                  </p>
                </div>
              )}

              {/* Policyholder & Payment Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Policy Holder Information
                  </span>
                  <div className="text-sm font-bold text-slate-800">
                    {selectedOrder.policyHolderName}
                  </div>
                  <div className="space-y-1 text-slate-600">
                    <div>NIC: <span className="font-mono font-medium">{selectedOrder.policyHolderNic}</span></div>
                    {selectedOrder.policyHolderPhone && (
                      <div>Phone: <span className="font-medium">{selectedOrder.policyHolderPhone}</span></div>
                    )}
                    {selectedOrder.policyHolderEmail && (
                      <div>Email: <span className="font-medium">{selectedOrder.policyHolderEmail}</span></div>
                    )}
                    <div>Branch: <span className="font-semibold text-slate-800">{selectedOrder.branch}</span></div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Payment Verification
                  </span>
                  <div className="text-sm font-bold text-slate-800">
                    LKR {selectedOrder.totalAmount?.toLocaleString()}
                    <span className="text-xs text-slate-400 font-normal ml-1">
                      ({selectedOrder.quantity} cards @ LKR {selectedOrder.unitPrice || 500})
                    </span>
                  </div>
                  <div className="space-y-1 text-slate-600">
                    <div>
                      Payment Status:{" "}
                      {getPaymentBadge(selectedOrder.payment?.status, selectedOrder.totalAmount)}
                    </div>
                    {selectedOrder.payment?.paidAt && (
                      <div>
                        Paid On:{" "}
                        <span className="font-medium">
                          {new Date(selectedOrder.payment.paidAt).toLocaleString("en-LK", {
                            timeZone: "Asia/Colombo"
                          })}
                        </span>
                      </div>
                    )}
                    {selectedOrder.payment?.stripePaymentIntentId && (
                      <div className="font-mono text-[10px] text-slate-400 truncate">
                        Ref: {selectedOrder.payment.stripePaymentIntentId}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Physical NFC Cards Preparation & URLs Section */}
              {selectedOrder.issuedCards && selectedOrder.issuedCards.length > 0 && (
                <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-[#102A43] flex items-center gap-1.5">
                        <HugeiconsIcon icon={CreditCardIcon} className="w-4 h-4 text-blue-600" />
                        <span>Generated NFC Card Records ({selectedOrder.issuedCards.length})</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Copy these secure digital URLs to encode/write onto the physical NFC cards.
                      </p>
                    </div>
                  </div>

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
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                card.status === "Available" || card.isPrepared
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                            >
                              {card.status || (card.isPrepared ? "Verified" : "Pending Preparation")}
                            </span>
                          </div>
                          {card.cardUrl && (
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5 truncate max-w-md">
                              {card.cardUrl}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {card.cardUrl && (
                            <button
                              onClick={() => handleCopyCardUrl(card.cardId, card.cardUrl || "")}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                                copiedCardId === card.cardId
                                  ? "bg-emerald-600 text-white"
                                  : "bg-white border border-slate-200 hover:bg-slate-100 text-slate-700"
                              }`}
                            >
                              <HugeiconsIcon icon={Copy01Icon} className="w-3.5 h-3.5" />
                              <span>{copiedCardId === card.cardId ? "Copied!" : "Copy URL"}</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setCardToRevoke(card.cardId);
                              setShowRevokeCardModal(true);
                            }}
                            className="px-2 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                            title="Revoke this card"
                          >
                            Revoke
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status History Timeline */}
              {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 && (
                <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                  <h4 className="font-bold text-sm text-[#102A43] flex items-center gap-1.5">
                    <HugeiconsIcon icon={Clock01Icon} className="w-4 h-4 text-slate-500" />
                    <span>Audit & Status Progression History</span>
                  </h4>
                  <div className="space-y-2.5 relative pl-4 border-l-2 border-slate-200 ml-1">
                    {selectedOrder.statusHistory.map((h, i) => (
                      <div key={i} className="relative">
                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-white" />
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-800">{h.status}</span>
                          <span className="text-slate-400">
                            {new Date(h.timestamp).toLocaleString("en-LK", {
                              timeZone: "Asia/Colombo"
                            })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          {h.note || "Status updated"} •{" "}
                          <span className="font-medium text-slate-500">By: {h.updatedBy}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Handover / Collection Details if collected */}
              {selectedOrder.collectionInfo?.collectedAt && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Collection & Handover Record
                  </span>
                  <div className="mt-1 text-xs text-slate-700 space-y-0.5">
                    <div>
                      Collected by:{" "}
                      <span className="font-semibold text-slate-900">
                        {selectedOrder.collectionInfo.collectedBy}
                      </span>
                    </div>
                    <div>
                      Collected on:{" "}
                      <span className="font-medium">
                        {new Date(selectedOrder.collectionInfo.collectedAt).toLocaleString("en-LK", {
                          timeZone: "Asia/Colombo"
                        })}
                      </span>
                    </div>
                    {selectedOrder.collectionInfo.notes && (
                      <div className="text-slate-500">Notes: {selectedOrder.collectionInfo.notes}</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl font-semibold text-xs text-slate-700 transition-colors cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {selectedOrder.status === "Request Submitted" && selectedOrder.payment?.status === "Paid" && (
                  <>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Reject Request
                    </button>
                    <button
                      onClick={() => setShowApproveModal(true)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4" />
                      <span>Approve & Generate Cards</span>
                    </button>
                  </>
                )}

                {selectedOrder.status === "Approved" && (
                  <button
                    onClick={handleProcessing}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Start Physical NFC Preparation</span>
                  </button>
                )}

                {selectedOrder.status === "Processing" && (
                  <button
                    onClick={handleReadyForCollection}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4" />
                    <span>Confirm Preparation & Mark Ready</span>
                  </button>
                )}

                {selectedOrder.status === "Ready for Collection" && (
                  <button
                    onClick={() => {
                      setCollectorName(selectedOrder.policyHolderName);
                      setShowCollectModal(true);
                    }}
                    className="px-4 py-2 bg-[#102A43] hover:bg-[#1E3A8A] text-white rounded-xl font-semibold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Record Physical Handover</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* APPROVE CONFIRMATION MODAL */}
      {/* ============================================================== */}
      {showApproveModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-slate-800 text-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">Approve Card Request</h4>
                <p className="text-slate-500">Order {selectedOrder.orderNumber}</p>
              </div>
            </div>

            <p className="text-slate-600 leading-relaxed">
              You are approving the request for <strong>{selectedOrder.quantity} Optional NFC Cards</strong> for{" "}
              <strong>{selectedOrder.policyHolderName}</strong>. This will generate {selectedOrder.quantity} unique card
              records and secure tokens ready for physical NFC writing.
            </p>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Approval Notes (Optional):
              </label>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="e.g. Cards prepared for Galle branch pickup"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#102A43] resize-none"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowApproveModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {actionLoading ? "Generating Cards..." : "Confirm Approval"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* REJECT CONFIRMATION MODAL */}
      {/* ============================================================== */}
      {showRejectModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-slate-800 text-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">Reject Card Request</h4>
                <p className="text-slate-500">Order {selectedOrder.orderNumber}</p>
              </div>
            </div>

            <p className="text-slate-600 leading-relaxed">
              Please enter the mandatory reason for rejecting this card request. The Policyholder will be notified.
            </p>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Rejection Reason <span className="text-rose-500">*</span>:
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Ineligible policy status or branch quota reached"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                rows={3}
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectionReason.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {actionLoading ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* RECORD COLLECTION MODAL */}
      {/* ============================================================== */}
      {showCollectModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-slate-800 text-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-[#102A43] flex items-center justify-center">
                <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">Record Physical Handover</h4>
                <p className="text-slate-500">Order {selectedOrder.orderNumber}</p>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Collected By:</label>
              <input
                type="text"
                value={collectorName}
                onChange={(e) => setCollectorName(e.target.value)}
                placeholder="Full name of person collecting"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#102A43]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Handover Notes:</label>
              <textarea
                value={collectionNotes}
                onChange={(e) => setCollectionNotes(e.target.value)}
                placeholder="e.g. Identity verified via NIC card and signature obtained"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#102A43] resize-none"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCollectModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordCollection}
                disabled={actionLoading}
                className="px-4 py-2 bg-[#102A43] hover:bg-[#1E3A8A] text-white rounded-xl font-semibold cursor-pointer shadow-xs disabled:opacity-50"
              >
                {actionLoading ? "Recording..." : "Confirm Handover"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* REVOKE CARD MODAL */}
      {/* ============================================================== */}
      {showRevokeCardModal && cardToRevoke && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-slate-800 text-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">Revoke Individual NFC Card</h4>
                <p className="text-slate-500 font-mono">{cardToRevoke}</p>
              </div>
            </div>

            <p className="text-slate-600 leading-relaxed">
              Revoking this card will immediately invalidate its access URL and disable any active driver assignment
              associated with it.
            </p>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reason for Revocation:</label>
              <input
                type="text"
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="e.g. Card damaged or lost"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRevokeCardModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRevokeCard}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold cursor-pointer shadow-xs disabled:opacity-50"
              >
                {actionLoading ? "Revoking..." : "Revoke Card"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
