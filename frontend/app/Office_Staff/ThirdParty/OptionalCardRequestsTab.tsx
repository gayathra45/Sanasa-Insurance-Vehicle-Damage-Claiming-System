"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { API_URL } from "@/app/config";
import { getSocket } from "@/app/utils/socket";
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

// Safe Date and Currency formatting helpers to prevent runtime RangeError crashes
const safeFormatDate = (val?: string | null, opts?: Intl.DateTimeFormatOptions) => {
  if (!val) return "—";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-LK", { timeZone: "Asia/Colombo", ...opts });
  } catch {
    return "—";
  }
};

const safeFormatTime = (val?: string | null) => {
  if (!val) return "—";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
};

const safeFormatDateTime = (val?: string | null) => {
  if (!val) return "—";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-LK", {
      timeZone: "Asia/Colombo",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "—";
  }
};

const safeCurrency = (val?: number | null) => {
  if (typeof val !== "number" || isNaN(val)) return "0";
  return val.toLocaleString("en-LK");
};

// Request Issuance Lifecycle Stages
const LIFECYCLE_STEPS = [
  {
    key: "Request Submitted",
    fullName: "Request Submitted",
    shortName: "Submitted",
    subLabel: "Order Placed",
    icon: File01Icon,
    stepNum: 1
  },
  {
    key: "Approved",
    fullName: "Branch Approved",
    shortName: "Approved",
    subLabel: "Cards Generated",
    icon: Shield01Icon,
    stepNum: 2
  },
  {
    key: "Processing",
    fullName: "NFC Encoding",
    shortName: "Processing",
    subLabel: "Writing Tag Data",
    icon: SmartPhone01Icon,
    stepNum: 3
  },
  {
    key: "Ready for Collection",
    fullName: "Ready for Pickup",
    shortName: "Ready",
    subLabel: "At Branch Counter",
    icon: Building01Icon,
    stepNum: 4
  },
  {
    key: "Collected",
    fullName: "Handed Over",
    shortName: "Collected",
    subLabel: "Cards Received",
    icon: CheckmarkCircle01Icon,
    stepNum: 5
  }
];

const getStageGuidance = (order: NfcOrder) => {
  switch (order.status) {
    case "Request Submitted":
      return {
        icon: Shield01Icon,
        badgeText: "Awaiting Staff Review",
        title: "Stage 1: Awaiting Branch Staff Verification",
        description: `Policyholder ${order.policyHolderName} placed an order for ${order.quantity} optional NFC card(s). Payment of LKR ${safeCurrency(order.totalAmount)} has been verified. Review policyholder details below and click 'Approve & Generate Cards' to produce cryptographic NFC credentials.`,
        actionHint: "Action: Approve Request",
        badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
        containerColor: "bg-amber-50/70 border-amber-200/80 text-amber-950",
        iconColor: "bg-amber-100 text-amber-700"
      };
    case "Approved":
      return {
        icon: SmartPhone01Icon,
        badgeText: "Credentials Ready",
        title: "Stage 2: Approved • Ready for NFC Tag Encoding",
        description: `Request approved and ${order.issuedCards?.length || order.quantity} secure card tokens are generated in the system. Connect your Android device running SANASA NFC Writer and click 'Start Physical NFC Preparation' to encode physical cards.`,
        actionHint: "Action: Start NFC Preparation",
        badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
        containerColor: "bg-blue-50/70 border-blue-200/80 text-blue-950",
        iconColor: "bg-blue-100 text-blue-700"
      };
    case "Processing":
      return {
        icon: RefreshIcon,
        badgeText: "Tag Encoding Active",
        title: "Stage 3: Physical NFC Tag Encoding In Progress",
        description: `Physical cards are currently being encoded and verified via the SANASA NFC Writer phone. Once all physical tags are successfully written and verified, click 'Confirm Preparation & Mark Ready'.`,
        actionHint: "Action: Mark Ready When Done",
        badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
        containerColor: "bg-indigo-50/70 border-indigo-200/80 text-indigo-950",
        iconColor: "bg-indigo-100 text-indigo-700"
      };
    case "Ready for Collection":
      return {
        icon: Building01Icon,
        badgeText: "Available at Counter",
        title: `Stage 4: Cards Ready for Collection at ${order.branch} Branch Desk`,
        description: `All ${order.quantity} physical NFC cards are encoded, verified, and placed safely at the branch counter. When the customer or authorized recipient visits, click 'Record Physical Handover' to finalize the issuance.`,
        actionHint: "Action: Record Handover",
        badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
        containerColor: "bg-teal-50/70 border-teal-200/80 text-teal-950",
        iconColor: "bg-teal-100 text-teal-700"
      };
    case "Collected":
      return {
        icon: CheckmarkCircle01Icon,
        badgeText: "Lifecycle Complete",
        title: "Stage 5: Cards Successfully Handed Over",
        description: `Order fully fulfilled. Cards collected by ${order.collectionInfo?.collectedBy || order.policyHolderName}${order.collectionInfo?.collectedAt ? ` on ${safeFormatDateTime(order.collectionInfo.collectedAt)}` : ""}. All NFC credentials are live and active for the policyholder.`,
        actionHint: "Fulfilled",
        badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
        containerColor: "bg-emerald-50/70 border-emerald-200/80 text-emerald-950",
        iconColor: "bg-emerald-100 text-emerald-700"
      };
    case "Rejected":
      return {
        icon: Cancel01Icon,
        badgeText: "Request Rejected",
        title: "Lifecycle Terminated: Request Rejected by Branch Staff",
        description: `This request was rejected. Reason: "${order.rejectionReason || "No details provided"}". Contact the policyholder if further assistance or re-submission is needed.`,
        actionHint: "Terminated",
        badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
        containerColor: "bg-rose-50/80 border-rose-200 text-rose-950",
        iconColor: "bg-rose-100 text-rose-700"
      };
    default:
      return {
        icon: Clock01Icon,
        badgeText: "Pending Action",
        title: `Status: ${order.status}`,
        description: `Request is currently in status "${order.status}". Follow standard branch procedures.`,
        actionHint: "Pending",
        badgeColor: "bg-slate-50 text-slate-700 border-slate-200",
        containerColor: "bg-slate-50 border-slate-200 text-slate-800",
        iconColor: "bg-slate-100 text-slate-600"
      };
  }
};

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

  // NFC Writer Device Pairing & Transfer States
  const [showPairModal, setShowPairModal] = useState(false);
  const [pairingCode, setPairingCode] = useState<string>("");
  const [pairingExpiry, setPairingExpiry] = useState<string>("");
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairedDevice, setPairedDevice] = useState<{
    deviceId: string;
    deviceName: string;
    pairedAt: string;
  } | null>(null);
  const [transferringCardId, setTransferringCardId] = useState<string | null>(null);
  const [transferStatuses, setTransferStatuses] = useState<
    Record<string, { status: string; jobId?: string; errorMessage?: string }>
  >({});

  // Check current paired device status for this branch
  const fetchPairingStatus = useCallback(async () => {
    if (!branch) return;
    try {
      const res = await fetch(`${API_URL}/nfc-card/writer/pairing/status?branch=${encodeURIComponent(branch)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.paired && data.pairing) {
          setPairedDevice({
            deviceId: data.pairing.deviceId,
            deviceName: data.pairing.deviceName,
            pairedAt: data.pairing.pairedAt
          });
        } else {
          setPairedDevice(null);
        }
      }
    } catch {
      // safe fallback
    }
  }, [branch]);

  // Generate a new 6-character single-use pairing code
  const handleGeneratePairingCode = async () => {
    if (!branch || !staffInfo?._id) return;
    setPairingLoading(true);
    try {
      const res = await fetch(`${API_URL}/nfc-card/writer/pairing/generate-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: staffInfo._id,
          staffName: staffInfo.name || "Branch Staff",
          staffEmail: staffInfo.email || "",
          branch
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate pairing code");
      setPairingCode(data.pairingCode);
      setPairingExpiry(data.expiresAt);
      setShowPairModal(true);
    } catch (err: any) {
      showToast(err.message || "Failed to generate pairing code", "error");
    } finally {
      setPairingLoading(false);
    }
  };

  // Safe Unpair action
  const handleUnpair = async () => {
    if (!branch) return;
    try {
      await fetch(`${API_URL}/nfc-card/writer/pairing/unpair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch, staffId: staffInfo?._id })
      });
      setPairedDevice(null);
      setPairingCode("");
      showToast("NFC Writer device disconnected", "success");
    } catch {
      showToast("Failed to unpair device", "error");
    }
  };

  // Transfer single card to paired NFC Writer phone
  const handleTransferToNfcWriter = async (cardId: string) => {
    if (!selectedOrder) return;
    setTransferringCardId(cardId);
    try {
      const res = await fetch(`${API_URL}/nfc-card/writer/transfer-job`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrder._id,
          cardId,
          staffId: staffInfo?._id,
          staffName: staffInfo?.name || "Branch Staff",
          branch
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to transfer card");

      setTransferStatuses((prev) => ({
        ...prev,
        [cardId]: { status: "Pending", jobId: data.job?.jobId }
      }));
      showToast(`Card ${cardId} sent to NFC Writer phone! Tap card on phone to write.`, "success");
    } catch (err: any) {
      showToast(err.message || "Transfer to NFC Writer failed", "error");
    } finally {
      setTransferringCardId(null);
    }
  };

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
    fetchPairingStatus();
  }, [branch, fetchPairingStatus]);

  // Socket.IO Real-Time listeners for Pairing, Transfers, and Live Card Updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onPairingUpdated = (data: any) => {
      if (data.status === "Paired") {
        setPairedDevice({
          deviceId: data.deviceId,
          deviceName: data.deviceName,
          pairedAt: data.pairedAt
        });
        showToast(`NFC Writer Connected: ${data.deviceName || "Android Device"}`, "success");
      } else if (data.status === "Revoked" || data.status === "Expired") {
        setPairedDevice(null);
      }
    };

    const onTransferStatus = (job: any) => {
      if (job && job.cardId) {
        setTransferStatuses((prev) => ({
          ...prev,
          [job.cardId]: { status: job.status, jobId: job.jobId, errorMessage: job.errorMessage }
        }));
        if (job.status === "Completed") {
          fetchOrders(true);
          showToast(`Card ${job.cardId} verified and written successfully!`, "success");
        }
      }
    };

    socket.on("nfc:pairing-updated", onPairingUpdated);
    socket.on("nfc:transfer-status", onTransferStatus);
    socket.on("nfc:order-updated", () => fetchOrders(true));
    socket.on("nfc:card-updated", () => fetchOrders(true));

    return () => {
      socket.off("nfc:pairing-updated", onPairingUpdated);
      socket.off("nfc:transfer-status", onTransferStatus);
      socket.off("nfc:order-updated");
      socket.off("nfc:card-updated");
    };
  }, [fetchOrders, showToast]);

  // Periodic auto-refresh every 15s
  useEffect(() => {
    if (!branch) return;
    const interval = setInterval(() => {
      fetchOrders(true);
      fetchPairingStatus();
    }, 15000);
    return () => clearInterval(interval);
  }, [branch, fetchOrders, fetchPairingStatus]);

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

  // 7. Reissue Replacement URL Handler
  const handleReissueCardUrl = async (cardId: string) => {
    if (!cardId || !staffInfo?._id) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/nfc-card/branch/reissue-card-url/${cardId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: staffInfo._id,
          staffName: staffInfo.name || "Branch Staff",
          branch,
          reason: "Replacement URL generated by branch staff"
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reissue replacement URL");
      }

      showToast(`New secure URL generated for card ${cardId}! Ready to transfer & write.`, "success");
      if (data.order) setSelectedOrder(data.order);
      fetchOrders(true);
    } catch (err: any) {
      showToast(err.message || "Failed to reissue replacement URL", "error");
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
          Paid (LKR {safeCurrency(amount)})
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

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          {/* NFC Writer Device Status / Action */}
          {pairedDevice ? (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <HugeiconsIcon icon={SmartPhone01Icon} className="w-3.5 h-3.5 text-emerald-600" />
              <span>NFC Writer: {pairedDevice.deviceName || "Paired"}</span>
              <button
                onClick={handleUnpair}
                className="text-[11px] text-emerald-700 hover:text-rose-600 underline ml-1 cursor-pointer font-normal"
                title="Disconnect paired phone"
              >
                Unpair
              </button>
            </div>
          ) : (
            <button
              onClick={handleGeneratePairingCode}
              disabled={pairingLoading}
              className="px-3 py-2 bg-gradient-to-r from-[#102A43] to-blue-700 hover:from-[#1E3A8A] hover:to-blue-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              title="Pair Android NFC Writer App"
            >
              <HugeiconsIcon icon={SmartPhone01Icon} className="w-3.5 h-3.5" />
              <span>{pairingLoading ? "Generating..." : "Pair NFC Writer"}</span>
            </button>
          )}

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

      {/* Orders List / Card Rows (Matching Permanent Drivers UI Design) */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs py-20 text-center">
          <HugeiconsIcon
            icon={RefreshIcon}
            className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3"
          />
          <p className="text-sm font-semibold text-slate-700">Loading branch card orders...</p>
          <p className="text-xs text-slate-400 mt-1">Retrieving requests for {branch} Branch</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs py-16 text-center px-4">
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
        <div className="overflow-x-auto pb-3 -mx-2 px-2">
          <div className="min-w-[1080px] flex flex-col gap-3">
            {/* Proportional Grid Header */}
            <div className="hidden md:grid md:grid-cols-[minmax(230px,2.1fr)_minmax(180px,1.6fr)_minmax(130px,1.1fr)_minmax(140px,1.2fr)_minmax(170px,1.5fr)_minmax(180px,1.5fr)] gap-4 px-5 py-3 text-slate-500 font-medium text-[10px] uppercase tracking-wider select-none bg-slate-50 rounded-xl border border-slate-200/60 border-l-[6px] border-l-transparent mb-1 items-center">
              <div>Request & Order ID</div>
              <div>Policyholder</div>
              <div>Cards & Quantity</div>
              <div>Fee & Payment</div>
              <div>Status & Timeline</div>
              <div className="text-right">Actions</div>
            </div>

            {/* Card Rows with Colored Left Accent */}
            {filteredOrders.map((order) => {
              const isSubmitted = order.status === "Request Submitted";
              const isApproved = order.status === "Approved";
              const isProcessing = order.status === "Processing";
              const isReady = order.status === "Ready for Collection";
              const isCollected = order.status === "Collected";
              const isRejected = order.status === "Rejected";
              const isPaid = order.payment?.status === "Paid";

              let borderAccentClass = "border-l-slate-300";
              let gradientBgClass = "from-slate-50/20 via-transparent to-transparent";

              if (isCollected) {
                borderAccentClass = "border-l-slate-400";
                gradientBgClass = "from-slate-50/30 via-transparent to-transparent";
              } else if (isReady) {
                borderAccentClass = "border-l-emerald-500";
                gradientBgClass = "from-emerald-50/30 via-transparent to-transparent";
              } else if (isProcessing) {
                borderAccentClass = "border-l-indigo-500";
                gradientBgClass = "from-indigo-50/30 via-transparent to-transparent";
              } else if (isApproved) {
                borderAccentClass = "border-l-blue-500";
                gradientBgClass = "from-blue-50/30 via-transparent to-transparent";
              } else if (isSubmitted) {
                borderAccentClass = "border-l-amber-500";
                gradientBgClass = "from-amber-50/30 via-transparent to-transparent";
              } else if (isRejected) {
                borderAccentClass = "border-l-rose-500";
                gradientBgClass = "from-rose-50/30 via-transparent to-transparent";
              }

              return (
                <div
                  key={order._id}
                  onClick={() => setSelectedOrder(order)}
                  className={`bg-white border-l-[6px] ${borderAccentClass} bg-gradient-to-r ${gradientBgClass} border border-slate-200 rounded-xl px-5 py-3.5 flex flex-col md:grid md:grid-cols-[minmax(230px,2.1fr)_minmax(180px,1.6fr)_minmax(130px,1.1fr)_minmax(140px,1.2fr)_minmax(170px,1.5fr)_minmax(180px,1.5fr)] md:items-center gap-4 transition-all duration-200 shadow-2xs hover:shadow-md relative overflow-hidden group cursor-pointer`}
                >
                  {/* Col 1: Request & Order ID */}
                  <div className="flex items-center gap-3 min-w-0 select-none">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#102A43] to-[#1B365D] text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0 group-hover:scale-105 transition-transform">
                      <HugeiconsIcon icon={CreditCardIcon} className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-mono text-[11px] font-bold text-[#102A43] bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80">
                        {order.orderNumber}
                      </span>
                      <div className="text-[11px] text-slate-500 font-medium mt-1">
                        {order.branch} Branch
                      </div>
                    </div>
                  </div>

                  {/* Col 2: Policyholder */}
                  <div className="flex flex-col min-w-0 select-none">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1 md:hidden">
                      Policyholder
                    </span>
                    <h4 className="font-semibold text-xs text-slate-800 truncate" title={order.policyHolderName}>
                      {order.policyHolderName || "—"}
                    </h4>
                    <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="font-mono text-slate-600">NIC: {order.policyHolderNic}</span>
                      {order.policyHolderPhone && (
                        <span className="font-mono text-slate-400">• {order.policyHolderPhone}</span>
                      )}
                    </div>
                  </div>

                  {/* Col 3: Cards & Quantity */}
                  <div className="flex flex-col min-w-0 select-none">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1 md:hidden">
                      Cards
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold bg-[#102A43]/10 text-[#102A43]">
                        {order.quantity} {order.quantity === 1 ? "Card" : "Cards"}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium mt-0.5">
                      @ LKR {order.unitPrice || 500} / card
                    </span>
                  </div>

                  {/* Col 4: Fee & Payment */}
                  <div className="flex flex-col min-w-0 select-none">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1 md:hidden">
                      Payment
                    </span>
                    <div className="w-fit">
                      {getPaymentBadge(order.payment?.status, order.totalAmount)}
                    </div>
                    {order.payment?.paidAt && (
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        Paid {safeFormatDate(order.payment.paidAt, { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>

                  {/* Col 5: Status & Timeline */}
                  <div className="flex flex-col min-w-0 select-none">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1 md:hidden">
                      Status & Timeline
                    </span>
                    <div className="w-fit">{getStatusBadge(order.status)}</div>
                    <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 mt-1 truncate">
                      <HugeiconsIcon icon={Clock01Icon} className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>
                        {safeFormatDate(order.createdAt, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric"
                        })}
                      </span>
                      <span className="text-slate-400 text-[10px]">
                        {safeFormatTime(order.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Col 6: Actions */}
                  <div
                    className="flex items-center md:justify-end gap-1.5 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95 flex-shrink-0"
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
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer flex-shrink-0"
                        >
                          <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowRejectModal(true);
                          }}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer flex-shrink-0"
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
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer flex-shrink-0"
                      >
                        <span>Start Prep</span>
                      </button>
                    )}

                    {order.status === "Processing" && (
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          handleReadyForCollection();
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer flex-shrink-0"
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
                        className="px-3 py-1.5 bg-[#102A43] hover:bg-[#1E3A8A] text-white font-semibold rounded-lg text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer flex-shrink-0"
                      >
                        <span>Record Handover</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Table Footer / Summary Bar */}
            <div className="px-5 py-3.5 bg-slate-50/90 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs text-slate-500 mt-1">
              <div>
                Showing <span className="font-bold text-slate-700">{filteredOrders.length}</span> of{" "}
                <span className="font-bold text-slate-700">{orders.length}</span> card orders
              </div>
              {(statusFilter !== "all" || searchQuery) && (
                <button
                  onClick={() => {
                    setStatusFilter("all");
                    setSearchQuery("");
                  }}
                  className="text-[#102A43] font-semibold hover:underline cursor-pointer"
                >
                  Reset filters
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ORDER DETAILS MODAL */}
      {/* ============================================================== */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#102A43] text-white flex items-center justify-center shadow-md">
                  <HugeiconsIcon icon={CreditCardIcon} className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[#102A43]">
                      Order: {selectedOrder.orderNumber}
                    </h2>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#102A43]/10 text-[#102A43] font-semibold">
                      {selectedOrder.quantity} {selectedOrder.quantity === 1 ? "Card" : "Cards"}
                    </span>
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Branch: <span className="font-semibold text-slate-700">{selectedOrder.branch}</span> • Placed:{" "}
                    {safeFormatDate(selectedOrder.createdAt, {
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    })}
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

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 text-xs">
              {/* Status Workflow Progression (Redesigned Enterprise Lifecycle Tracker) */}
              {(() => {
                const stepKeys = [
                  "Request Submitted",
                  "Approved",
                  "Processing",
                  "Ready for Collection",
                  "Collected"
                ];
                const currentIdx = stepKeys.indexOf(selectedOrder.status);
                const isRejected = selectedOrder.status === "Rejected";
                const stageGuidance = getStageGuidance(selectedOrder);

                const getStepTimestamp = (stepKey: string) => {
                  if (stepKey === "Request Submitted") {
                    return safeFormatDateTime(selectedOrder.createdAt);
                  }
                  if (stepKey === "Approved" && selectedOrder.branchReview?.reviewedAt) {
                    return safeFormatDateTime(selectedOrder.branchReview.reviewedAt);
                  }
                  if (stepKey === "Collected" && selectedOrder.collectionInfo?.collectedAt) {
                    return safeFormatDateTime(selectedOrder.collectionInfo.collectedAt);
                  }
                  const hist = selectedOrder.statusHistory?.find(
                    (h) => h.status.toLowerCase() === stepKey.toLowerCase()
                  );
                  if (hist?.timestamp) {
                    return safeFormatDateTime(hist.timestamp);
                  }
                  return null;
                };

                return (
                  <div className="bg-gradient-to-b from-slate-50 via-white to-slate-50/70 p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-5">
                    {/* Header bar with stage counter and live badge */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[11px] font-black text-[#102A43] uppercase tracking-wider">
                          Request Issuance Lifecycle
                        </span>
                        {!isRejected && currentIdx >= 0 && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#102A43]/10 text-[#102A43]">
                            Stage {currentIdx + 1} of 5
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isRejected ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" />
                            <span>Request Terminated: Rejected</span>
                          </span>
                        ) : selectedOrder.status === "Collected" ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-3.5 h-3.5 text-emerald-600" />
                            <span>All Cards Successfully Collected</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                            <span>Current Stage: {selectedOrder.status}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stepper Timeline & Track */}
                    <div className="relative pt-4 pb-2 overflow-x-auto">
                      <div className="min-w-[540px] relative">
                        {/* Base background track */}
                        <div className="absolute top-[26px] left-[10%] right-[10%] h-1.5 bg-slate-200/80 rounded-full z-0" />

                        {/* Dynamic active filled progress track */}
                        <div
                          className="absolute top-[26px] left-[10%] h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 rounded-full z-0 transition-all duration-700 ease-out shadow-xs"
                          style={{
                            width: isRejected
                              ? "0%"
                              : currentIdx < 0
                              ? "0%"
                              : `${Math.min(80, Math.max(0, (currentIdx / 4) * 80))}%`
                          }}
                        />

                        {/* 5 Stage Nodes */}
                        <div className="grid grid-cols-5 relative z-10 gap-2">
                          {LIFECYCLE_STEPS.map((step, idx) => {
                            const isCompleted = !isRejected && currentIdx > idx;
                            const isCurrent = !isRejected && (currentIdx === idx || (currentIdx === -1 && idx === 0));
                            const isTerminatedHere = isRejected && idx === 0;
                            const stepTimestamp = getStepTimestamp(step.key);

                            return (
                              <div
                                key={step.key}
                                className="flex flex-col items-center text-center relative px-1 group"
                              >
                                {/* Floating "Current" Badge */}
                                {isCurrent && (
                                  <span className="absolute -top-4.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-blue-600 text-[9px] font-black uppercase text-white shadow-xs tracking-wider whitespace-nowrap animate-bounce">
                                    Current
                                  </span>
                                )}

                                {/* Node Icon Button */}
                                <div
                                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                                    isTerminatedHere
                                      ? "bg-rose-500 text-white shadow-md shadow-rose-500/20 ring-4 ring-rose-100"
                                      : isCompleted
                                      ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25 ring-4 ring-emerald-50 scale-100"
                                      : isCurrent
                                      ? "bg-gradient-to-br from-[#102A43] via-blue-700 to-indigo-600 text-white shadow-xl shadow-blue-600/35 ring-4 ring-blue-100 ring-offset-2 scale-105"
                                      : "bg-white border-2 border-slate-200 text-slate-400 shadow-2xs hover:border-slate-300"
                                  }`}
                                >
                                  {isCompleted ? (
                                    <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-5 h-5 text-white" />
                                  ) : isTerminatedHere ? (
                                    <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5 text-white" />
                                  ) : (
                                    <HugeiconsIcon
                                      icon={step.icon}
                                      className={`w-5 h-5 ${isCurrent ? "text-white" : "text-slate-400"}`}
                                    />
                                  )}
                                </div>

                                {/* Step Label & Subtitle */}
                                <div className="mt-2.5 flex flex-col items-center">
                                  <span
                                    className={`text-xs font-bold leading-tight ${
                                      isCurrent
                                        ? "text-[#102A43]"
                                        : isCompleted
                                        ? "text-slate-800"
                                        : isTerminatedHere
                                        ? "text-rose-700"
                                        : "text-slate-400"
                                    }`}
                                  >
                                    {step.fullName}
                                  </span>
                                  <span
                                    className={`text-[10px] font-medium mt-0.5 ${
                                      isCurrent
                                        ? "text-blue-600 font-semibold"
                                        : isCompleted
                                        ? "text-emerald-700"
                                        : isTerminatedHere
                                        ? "text-rose-500"
                                        : "text-slate-400"
                                    }`}
                                  >
                                    {step.subLabel}
                                  </span>

                                  {/* Step Timestamp */}
                                  {stepTimestamp ? (
                                    <span className="text-[9px] text-slate-500 font-mono mt-1 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60 truncate max-w-[100px]">
                                      {stepTimestamp}
                                    </span>
                                  ) : isCurrent ? (
                                    <span className="text-[9px] text-blue-600 font-semibold mt-1 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                                      Active Now
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Active Stage Insights & Action Guidance Card */}
                    <div
                      className={`p-4 rounded-xl border flex items-start gap-3.5 transition-all shadow-2xs ${stageGuidance.containerColor}`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-2xs ${stageGuidance.iconColor}`}
                      >
                        <HugeiconsIcon icon={stageGuidance.icon} className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <h4 className="font-bold text-xs tracking-tight">
                            {stageGuidance.title}
                          </h4>
                          <span
                            className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border self-start sm:self-auto ${stageGuidance.badgeColor}`}
                          >
                            {stageGuidance.actionHint}
                          </span>
                        </div>
                        <p className="text-[11px] mt-1 opacity-90 leading-relaxed font-normal">
                          {stageGuidance.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Policyholder & Payment Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                      <HugeiconsIcon icon={UserIcon} className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Policy Holder Information
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {selectedOrder.policyHolderName}
                  </div>
                  <div className="space-y-1 text-slate-600 text-xs">
                    <div>NIC: <span className="font-mono font-medium text-slate-800">{selectedOrder.policyHolderNic}</span></div>
                    {selectedOrder.policyHolderPhone && (
                      <div>Phone: <span className="font-medium text-slate-800">{selectedOrder.policyHolderPhone}</span></div>
                    )}
                    {selectedOrder.policyHolderEmail && (
                      <div>Email: <span className="font-medium text-slate-800">{selectedOrder.policyHolderEmail}</span></div>
                    )}
                    <div>Branch: <span className="font-semibold text-slate-900">{selectedOrder.branch}</span></div>
                  </div>
                </div>

                <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <HugeiconsIcon icon={CreditCardIcon} className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Payment Verification
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    LKR {safeCurrency(selectedOrder.totalAmount)}
                    <span className="text-xs text-slate-400 font-normal ml-1">
                      ({selectedOrder.quantity} {selectedOrder.quantity === 1 ? "card" : "cards"} @ LKR {selectedOrder.unitPrice || 500})
                    </span>
                  </div>
                  <div className="space-y-1.5 text-slate-600 text-xs">
                    <div className="flex items-center gap-2">
                      <span>Payment Status:</span>
                      {getPaymentBadge(selectedOrder.payment?.status, selectedOrder.totalAmount)}
                    </div>
                    {selectedOrder.payment?.paidAt && (
                      <div>
                        Paid On:{" "}
                        <span className="font-medium text-slate-800">
                          {safeFormatDateTime(selectedOrder.payment.paidAt)}
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
                <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-[#102A43] flex items-center gap-1.5">
                        <HugeiconsIcon icon={CreditCardIcon} className="w-4 h-4 text-blue-600" />
                        <span>Generated NFC Card Records ({selectedOrder.issuedCards.length})</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Transfer individual cards wirelessly to the SANASA NFC Writer phone or copy secure URLs to encode onto physical tags.
                      </p>
                    </div>

                    {/* Quick Device Pairing Indicator */}
                    <div className="flex items-center gap-2">
                      {pairedDevice ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Connected: {pairedDevice.deviceName}</span>
                        </span>
                      ) : (
                        <button
                          onClick={handleGeneratePairingCode}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 underline flex items-center gap-1 cursor-pointer"
                        >
                          <HugeiconsIcon icon={SmartPhone01Icon} className="w-3.5 h-3.5" />
                          <span>Pair Phone to Transfer</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Card Preparation Progress Bar */}
                  {(() => {
                    const preparedCount = (selectedOrder.issuedCards || []).filter((c) => c.isPrepared).length;
                    const totalCount = selectedOrder.quantity || selectedOrder.issuedCards.length || 1;
                    const percent = Math.round((preparedCount / totalCount) * 100);

                    return (
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-700">
                            Physical Preparation Progress: {preparedCount} of {totalCount} Cards Verified
                          </span>
                          <span className="font-bold text-blue-700">{percent}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              percent === 100 ? "bg-emerald-500" : "bg-blue-600"
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
                    {selectedOrder.issuedCards.map((card, idx) => {
                      const transferState = transferStatuses[card.cardId];
                      const isWriting = transferState?.status === "Writing";
                      const isReceived = transferState?.status === "Received";
                      const isPendingTransfer = transferState?.status === "Pending";
                      const isTransferringNow = transferringCardId === card.cardId;

                      return (
                        <div
                          key={card.cardId || idx}
                          className="p-3 bg-slate-50/50 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-800 text-xs">
                                {card.cardId}
                              </span>

                              {/* Live Status Badge */}
                              {card.status === "Revoked" ? (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                  <span>Revoked</span>
                                </span>
                              ) : card.isPrepared || card.status === "Available" ? (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-3 h-3 text-emerald-600" />
                                  <span>Verified on Tag</span>
                                </span>
                              ) : isWriting ? (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse">
                                  <HugeiconsIcon icon={RefreshIcon} className="w-3 h-3 animate-spin" />
                                  <span>Writing Tag on Phone...</span>
                                </span>
                              ) : isReceived ? (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                  <HugeiconsIcon icon={SmartPhone01Icon} className="w-3 h-3 text-blue-600" />
                                  <span>Received by Phone</span>
                                </span>
                              ) : isPendingTransfer ? (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                                  <span>Waiting on Phone</span>
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                  Pending Preparation
                                </span>
                              )}
                            </div>

                            {card.cardUrl ? (
                              <div className="text-[11px] text-slate-500 font-mono mt-0.5 truncate max-w-md">
                                {card.cardUrl}
                              </div>
                            ) : card.status === "Revoked" ? (
                              <div className="text-[11px] text-rose-500 font-medium mt-0.5">
                                Access URL revoked and invalidated. Click Reissue below to generate a new replacement URL.
                              </div>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Reissue Replacement URL button if revoked */}
                            {card.status === "Revoked" ? (
                              <button
                                onClick={() => handleReissueCardUrl(card.cardId)}
                                disabled={actionLoading}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                                title="Generate a fresh secure replacement URL for this card"
                              >
                                <HugeiconsIcon icon={RefreshIcon} className="w-3.5 h-3.5" />
                                <span>Reissue Replacement URL</span>
                              </button>
                            ) : (
                              <>
                                {/* Transfer to NFC Writer Phone Button */}
                                {!card.isPrepared && (
                                  <button
                                    onClick={() => handleTransferToNfcWriter(card.cardId)}
                                    disabled={isTransferringNow || isWriting}
                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer ${
                                      isPendingTransfer || isReceived
                                        ? "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200"
                                        : "bg-blue-600 hover:bg-blue-700 text-white"
                                    } disabled:opacity-50`}
                                    title="Wirelessly transfer this card URL to paired Android NFC Writer"
                                  >
                                    <HugeiconsIcon
                                      icon={SmartPhone01Icon}
                                      className={`w-3.5 h-3.5 ${isTransferringNow ? "animate-bounce" : ""}`}
                                    />
                                    <span>
                                      {isTransferringNow
                                        ? "Sending..."
                                        : isPendingTransfer
                                        ? "Resend to Phone"
                                        : "Transfer to NFC Writer"}
                                    </span>
                                  </button>
                                )}

                                {card.cardUrl && (
                                  <button
                                    onClick={() => handleCopyCardUrl(card.cardId, card.cardUrl || "")}
                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                                      copiedCardId === card.cardId
                                        ? "bg-emerald-600 text-white"
                                        : "bg-white border border-slate-200 hover:bg-slate-100 text-slate-700"
                                    }`}
                                    title="Copy URL manually"
                                  >
                                    <HugeiconsIcon icon={Copy01Icon} className="w-3.5 h-3.5" />
                                    <span>{copiedCardId === card.cardId ? "Copied!" : "Copy"}</span>
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
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
                            {safeFormatDateTime(h.timestamp)}
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
                        {safeFormatDateTime(selectedOrder.collectionInfo.collectedAt)}
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
            <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl font-semibold text-xs text-slate-700 transition-colors cursor-pointer shadow-2xs"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {selectedOrder.status === "Request Submitted" && selectedOrder.payment?.status === "Paid" && (
                  <>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden text-slate-800 text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#102A43]">Approve Card Request</h4>
                  <p className="text-slate-500">Order {selectedOrder.orderNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setShowApproveModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-slate-600 leading-relaxed">
                You are approving the request for <strong>{selectedOrder.quantity} Optional NFC Cards</strong> for{" "}
                <strong>{selectedOrder.policyHolderName}</strong>. This will generate {selectedOrder.quantity} unique card
                records and secure tokens ready for physical NFC writing.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Approval Notes (Optional):
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="e.g. Cards prepared for Galle branch pickup"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#102A43] resize-none"
                  rows={2}
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowApproveModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden text-slate-800 text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-xs">
                  <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#102A43]">Reject Card Request</h4>
                  <p className="text-slate-500">Order {selectedOrder.orderNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setShowRejectModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-slate-600 leading-relaxed">
                Please enter the mandatory reason for rejecting this card request. The Policyholder will be notified.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Rejection Reason <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Ineligible policy status or branch quota reached"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                  rows={3}
                  required
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowRejectModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectionReason.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden text-slate-800 text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#102A43] flex items-center justify-center shadow-xs">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#102A43]">Record Physical Handover</h4>
                  <p className="text-slate-500">Order {selectedOrder.orderNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setShowCollectModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Collected By:</label>
                <input
                  type="text"
                  value={collectorName}
                  onChange={(e) => setCollectorName(e.target.value)}
                  placeholder="Full name of person collecting"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#102A43]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Handover Notes:</label>
                <textarea
                  value={collectionNotes}
                  onChange={(e) => setCollectionNotes(e.target.value)}
                  placeholder="e.g. Identity verified via NIC card and signature obtained"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#102A43] resize-none"
                  rows={2}
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowCollectModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordCollection}
                disabled={actionLoading}
                className="px-4 py-2 bg-[#102A43] hover:bg-[#1E3A8A] text-white rounded-lg font-semibold text-xs cursor-pointer shadow-xs disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden text-slate-800 text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-xs">
                  <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#102A43]">Revoke Individual NFC Card</h4>
                  <p className="text-slate-500 font-mono text-[11px]">{cardToRevoke}</p>
                </div>
              </div>
              <button
                onClick={() => setShowRevokeCardModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-slate-600 leading-relaxed">
                Revoking this card will immediately invalidate its access URL and disable any active driver assignment
                associated with it.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Reason for Revocation:</label>
                <input
                  type="text"
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder="e.g. Card damaged or lost"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowRevokeCardModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRevokeCard}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold text-xs cursor-pointer shadow-xs disabled:opacity-50"
              >
                {actionLoading ? "Revoking..." : "Revoke Card"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* NFC WRITER DEVICE PAIRING MODAL */}
      {/* ============================================================== */}
      {showPairModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden text-slate-800 text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shadow-xs">
                  <HugeiconsIcon icon={SmartPhone01Icon} className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#102A43]">SANASA NFC Writer Pairing</h4>
                  <p className="text-slate-500">{branch} Branch • Staff Session</p>
                </div>
              </div>

              <button
                onClick={() => setShowPairModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              {pairedDevice ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2.5 text-emerald-800 font-bold text-sm">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">
                      ✓
                    </div>
                    <span>Phone Connected & Paired!</span>
                  </div>
                  <div className="text-xs text-emerald-900 space-y-1">
                    <div>
                      Device: <span className="font-bold">{pairedDevice.deviceName}</span>
                    </div>
                    <div className="text-[11px] text-emerald-700 font-mono">
                      Device ID: {pairedDevice.deviceId}
                    </div>
                    <div className="text-[11px] text-emerald-700">
                      Paired on: {safeFormatTime(pairedDevice.pairedAt)}
                    </div>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    You can now click <strong>"Transfer to NFC Writer"</strong> on any card to send it directly to your phone.
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={handleUnpair}
                      className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Disconnect / Unpair Phone
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-slate-600 leading-relaxed text-xs">
                    Enter this single-use 6-character code into the <strong>SANASA NFC Writer</strong> Android application on your phone to pair it securely with this branch session:
                  </p>

                  {/* Big Pairing Code Card */}
                  <div className="bg-gradient-to-br from-slate-900 to-[#102A43] text-white p-5 rounded-2xl text-center shadow-md relative overflow-hidden">
                    <span className="text-[10px] font-bold tracking-widest uppercase text-blue-300 block mb-1">
                      Pairing Code
                    </span>
                    <div className="text-3xl font-mono font-extrabold tracking-widest text-emerald-400 select-all my-1">
                      {pairingCode || "------"}
                    </div>
                    <span className="text-[10px] text-slate-300">
                      Valid for 5 minutes • Single-use
                    </span>
                  </div>

                  {/* Instructions */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
                    <span className="font-bold text-slate-700 text-xs block">
                      How to pair your Android Phone:
                    </span>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 leading-normal">
                      <li>Open <strong>SANASA NFC Writer</strong> on your phone.</li>
                      <li>Go to the <strong>Device Pairing</strong> tab or prompt.</li>
                      <li>Type the code <strong className="font-mono text-slate-900">{pairingCode}</strong> and tap <strong>Connect</strong>.</li>
                    </ol>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                      onClick={handleGeneratePairingCode}
                      disabled={pairingLoading}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <HugeiconsIcon icon={RefreshIcon} className={`w-3.5 h-3.5 ${pairingLoading ? "animate-spin" : ""}`} />
                      <span>Generate New Code</span>
                    </button>

                    <button
                      onClick={() => setShowPairModal(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
