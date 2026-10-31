"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PolicyHolderNavbar from "@/app/Components/Policy_Holder/Navbar";
import PolicyHolderFooter from "@/app/Components/Policy_Holder/footer";
import SimpleLoader from "@/app/Components/SimpleLoader";
import { API_URL } from "@/app/config";
import { getSocket } from "@/app/utils/socket";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserAdd01Icon,
  Clock01Icon,
  Car01Icon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
  Alert02Icon,
  CreditCardIcon,
  ArrowRight01Icon,
  File01Icon,
  Upload01Icon,
  Building04Icon,
  InformationCircleIcon,
  Shield01Icon,
  UserCheck01Icon,
  Download01Icon
} from "@hugeicons/core-free-icons";

interface Vehicle {
  _id: string;
  numberPlate: string;
  vehicleType: string;
  model: string;
  company: string;
  year: string;
  policyNumber: string;
  status: string;
}

interface RegistrationRequest {
  _id: string;
  requestReference: string;
  policyHolderNic: string;
  policyHolderName: string;
  branch: string;
  driverDetails: {
    fullName: string;
    residentialAddress: string;
    phoneNumber: string;
    nicNumber: string;
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
    company?: string;
    year?: string;
    policyNumber?: string;
  }[];
  accessDuration?: {
    durationType: string;
    startDate: string;
    endDate: string;
    isExpired?: boolean;
    expiredAt?: string;
  };
  accessControl?: {
    isBlocked?: boolean;
    blockedAt?: string;
    blockedReason?: string;
    unblockedAt?: string;
    terminatedAt?: string;
  };
  renewalHistory?: {
    renewedAt: string;
    renewedBy?: string;
    previousStartDate?: string;
    previousEndDate?: string;
    newStartDate: string;
    newEndDate: string;
    durationType: string;
    note?: string;
  }[];
  fee: number;
  currency: string;
  status:
    | "Pending Payment"
    | "Payment Failed"
    | "Pending Branch Approval"
    | "Approved"
    | "Scheduled"
    | "Temporarily Blocked"
    | "Expired"
    | "Rejected"
    | "Cancelled"
    | "Pending Termination Approval"
    | "Terminated"
    | "Revoked";
  payment: {
    status: "Pending Payment" | "Paid" | "Failed" | "Cancelled";
    paidAt?: string;
    amountPaid?: number;
    stripeSessionId?: string;
  };
  branchReview?: {
    reviewedBy?: string;
    reviewedAt?: string;
    rejectionReason?: string;
  };
  terminationRequest?: {
    reason?: string;
    requestedAt?: string;
    status?: string;
  };
  createdAt: string;
}

interface NfcCard {
  _id: string;
  cardId: string;
  status: "Available" | "Scheduled" | "Active" | "Temporarily Blocked" | "Expired" | "Revoked" | "Disabled";
  currentAssignment?: {
    assignmentId: string;
    driverDetails: {
      fullName: string;
      phoneNumber: string;
      residentialAddress?: string;
      nicNumber?: string;
    };
    vehicleDetails: {
      numberPlate: string;
      model?: string;
      company?: string;
    };
    duration: {
      durationType: string;
      startDate: string;
      endDate: string;
    };
    assignedAt: string;
    isActive: boolean;
    isBlocked: boolean;
    blockedAt?: string;
    blockedReason?: string;
  };
  assignmentHistory?: {
    assignmentId: string;
    driverDetails: {
      fullName: string;
      phoneNumber: string;
      residentialAddress?: string;
    };
    vehiclePlate: string;
    durationType: string;
    startDate: string;
    endDate: string;
    completedAt: string;
    completionReason: string;
  }[];
  accessLogs?: {
    timestamp: string;
    action: string;
    driverName?: string;
    vehiclePlate?: string;
    reason?: string;
  }[];
}

interface NfcOrder {
  _id: string;
  orderNumber: string;
  quantity: number;
  totalAmount: number;
  currency: string;
  branch?: string;
  status: string;
  rejectionReason?: string;
  statusHistory?: Array<{
    status: string;
    timestamp: string;
    updatedBy: string;
    note?: string;
  }>;
  collectionInfo?: {
    collectedAt?: string;
    collectedBy?: string;
    notes?: string;
  };
  payment?: {
    status: string;
    amountPaid?: number;
    paidAt?: string;
  };
  issuedCards?: Array<{
    cardId: string;
    status?: string;
    isPrepared?: boolean;
  }>;
  createdAt: string;
}

export default function ThirdPartyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  type TabType = "permanent" | "nfc-cards" | "orders" | "history";
  const [activeTab, setActiveTab] = useState<TabType>("permanent");
  const [showPermanentForm, setShowPermanentForm] = useState(false);
  const [registerChoiceModalOpen, setRegisterChoiceModalOpen] = useState(false);
  const [noCardsAlertModalOpen, setNoCardsAlertModalOpen] = useState(false);
  const [orderNfcModalOpen, setOrderNfcModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [eligibleVehicles, setEligibleVehicles] = useState<Vehicle[]>([]);
  const [userBranch, setUserBranch] = useState("Galle");
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);

  // Permanent Drivers View & Table Redesign
  const [selectedDriverDetail, setSelectedDriverDetail] = useState<RegistrationRequest | null>(null);
  const [driverTableSearch, setDriverTableSearch] = useState("");
  const [driverStatusFilter, setDriverStatusFilter] = useState("ALL");
  const [previewDocModal, setPreviewDocModal] = useState<{ url: string; title: string } | null>(null);

  // Termination modal states
  const [terminateReq, setTerminateReq] = useState<RegistrationRequest | null>(null);
  const [terminateReason, setTerminateReason] = useState("Driver resigned / employment ended");
  const [customReason, setCustomReason] = useState("");
  const [terminating, setTerminating] = useState(false);
  const [termMsg, setTermMsg] = useState("");
  const [termErr, setTermErr] = useState("");

  // Permanent Driver Duration State
  const [permDurationType, setPermDurationType] = useState<string>("12 Months");
  const [permStartDate, setPermStartDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [permEndDate, setPermEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 365);
    return d.toISOString().split("T")[0];
  });

  // Permanent Driver Renew Modal
  const [renewReq, setRenewReq] = useState<RegistrationRequest | null>(null);
  const [renewDurationType, setRenewDurationType] = useState("12 Months");
  const [renewStartDate, setRenewStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [renewEndDate, setRenewEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 365);
    return d.toISOString().split("T")[0];
  });
  const [renewNote, setRenewNote] = useState("");
  const [renewing, setRenewing] = useState(false);
  const [renewErr, setRenewErr] = useState("");

  // Form states
  const [selectedPlates, setSelectedPlates] = useState<string[]>([]);
  const [driverName, setDriverName] = useState("");
  const [driverAddress, setDriverAddress] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [driverNic, setDriverNic] = useState("");

  // Document base64 states
  const [nicFront, setNicFront] = useState<string>("");
  const [nicBack, setNicBack] = useState<string>("");
  const [dlFront, setDlFront] = useState<string>("");
  const [dlBack, setDlBack] = useState<string>("");

  // Review & Submit modal
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [bannerAlert, setBannerAlert] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // File input refs
  const nicFrontRef = useRef<HTMLInputElement>(null);
  const nicBackRef = useRef<HTMLInputElement>(null);
  const dlFrontRef = useRef<HTMLInputElement>(null);
  const dlBackRef = useRef<HTMLInputElement>(null);

  // Optional NFC Cards states
  const [nfcCards, setNfcCards] = useState<NfcCard[]>([]);
  const [nfcOrders, setNfcOrders] = useState<NfcOrder[]>([]);
  const [loadingNfc, setLoadingNfc] = useState(false);
  const [nfcQuantity, setNfcQuantity] = useState<number>(1);
  const [orderingNfc, setOrderingNfc] = useState(false);

  // NFC Card Assign Driver Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedCardForAssign, setSelectedCardForAssign] = useState<NfcCard | null>(null);
  const [assignDriverName, setAssignDriverName] = useState("");
  const [assignDriverPhone, setAssignDriverPhone] = useState("");
  const [assignDriverAddress, setAssignDriverAddress] = useState("");
  const [assignDriverNic, setAssignDriverNic] = useState("");
  const [assignPlate, setAssignPlate] = useState("");
  const [assignDurationPreset, setAssignDurationPreset] = useState("7 Days");
  const [assignStartDate, setAssignStartDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [assignEndDate, setAssignEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 16);
  });

  // Policyholder OTP State
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [assignSuccess, setAssignSuccess] = useState("");

  // NFC History / Logs Modal
  const [historyCard, setHistoryCard] = useState<NfcCard | null>(null);

  // 1. Initialize user & load vehicles / requests / nfc
  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedUser = sessionStorage.getItem("logged_in_user");
    if (!savedUser) {
      router.push("/Login");
      return;
    }

    try {
      const parsed = JSON.parse(savedUser);
      setCurrentUser(parsed);
      loadEligibleVehicles(parsed.nic);
      loadMyRequests(parsed.nic);
      loadNfcCards(parsed.nic);
      loadNfcOrders(parsed.nic);
    } catch {
      router.push("/Login");
    }
  }, [router]);

  // Real-time synchronization for Card Orders, Cards Inventory & Permanent Driver Requests
  useEffect(() => {
    if (!currentUser?.nic) return;

    // 1. Socket.IO Real-Time Listener
    const socket = getSocket();

    const handleOrderUpdated = (updatedOrder: any) => {
      if (!updatedOrder) return;
      setNfcOrders((prevOrders) => {
        const idx = prevOrders.findIndex(
          (o) => o._id === updatedOrder._id || o.orderNumber === updatedOrder.orderNumber
        );
        if (idx !== -1) {
          const updated = [...prevOrders];
          updated[idx] = { ...updated[idx], ...updatedOrder };
          return updated;
        } else if (updatedOrder.policyHolderNic === currentUser.nic) {
          return [updatedOrder, ...prevOrders];
        }
        return prevOrders;
      });

      // Show real-time alert banner
      setBannerAlert({
        type: updatedOrder.status === "Rejected" ? "error" : "success",
        message: `Order ${updatedOrder.orderNumber} status updated to "${updatedOrder.status}"`
      });

      // If status changed to Ready for Collection, Approved, or Collected, refresh cards inventory
      if (
        updatedOrder.status === "Ready for Collection" ||
        updatedOrder.status === "Approved" ||
        updatedOrder.status === "Collected"
      ) {
        fetch(`${API_URL}/nfc-card/inventory?nic=${encodeURIComponent(currentUser.nic)}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.cards) setNfcCards(data.cards);
          })
          .catch(() => {});
      }
    };

    const handleRequestUpdated = (updatedReq: any) => {
      if (!updatedReq) return;
      setRequests((prev) => {
        const idx = prev.findIndex(
          (r) => r._id === updatedReq._id || r.requestReference === updatedReq.requestReference
        );
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...updatedReq };
          return updated;
        } else if (updatedReq.policyHolderNic === currentUser.nic) {
          return [updatedReq, ...prev];
        }
        return prev;
      });

      setSelectedDriverDetail((prev) => {
        if (prev && (prev._id === updatedReq._id || prev.requestReference === updatedReq.requestReference)) {
          return { ...prev, ...updatedReq };
        }
        return prev;
      });

      setBannerAlert({
        type: updatedReq.status === "Rejected" ? "error" : "success",
        message: `Driver authorization ${updatedReq.requestReference} updated to "${updatedReq.status}"`
      });
    };

    const handleCardUpdated = (updatedCard: any) => {
      if (!updatedCard) return;
      setNfcCards((prev) => {
        const idx = prev.findIndex(
          (c) => c._id === updatedCard._id || c.cardId === updatedCard.cardId
        );
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...updatedCard };
          return updated;
        } else if (updatedCard.policyHolderNic === currentUser.nic) {
          return [updatedCard, ...prev];
        }
        return prev;
      });
    };

    if (socket) {
      socket.on("nfc:order-updated", handleOrderUpdated);
      socket.on("third-party:request-updated", handleRequestUpdated);
      socket.on("nfc:card-updated", handleCardUpdated);
    }

    // 2. Continuous Background Heartbeat (polling every 3.5 seconds)
    // Silently refreshes active tracking without unmounting or full-page spinner
    const heartbeatId = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetch(`${API_URL}/nfc-card/orders?nic=${encodeURIComponent(currentUser.nic)}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.orders) setNfcOrders(data.orders);
          })
          .catch(() => {});

        fetch(`${API_URL}/third-party/my-requests?nic=${encodeURIComponent(currentUser.nic)}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.requests) {
              setRequests(data.requests);
              setSelectedDriverDetail((prev) => {
                if (!prev) return null;
                const fresh = data.requests.find((r: any) => r._id === prev._id || r.requestReference === prev.requestReference);
                return fresh ? { ...prev, ...fresh } : prev;
              });
            }
          })
          .catch(() => {});

        fetch(`${API_URL}/nfc-card/inventory?nic=${encodeURIComponent(currentUser.nic)}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.cards) setNfcCards(data.cards);
          })
          .catch(() => {});
      }
    }, 3500);

    return () => {
      if (socket) {
        socket.off("nfc:order-updated", handleOrderUpdated);
        socket.off("third-party:request-updated", handleRequestUpdated);
        socket.off("nfc:card-updated", handleCardUpdated);
      }
      clearInterval(heartbeatId);
    };
  }, [currentUser?.nic]);

  // Handle Permanent Duration calculation
  const handlePermDurationTypeChange = (type: string) => {
    setPermDurationType(type);
    const start = new Date();
    setPermStartDate(start.toISOString().split("T")[0]);
    let days = 365;
    if (type === "1 Month") days = 30;
    else if (type === "3 Months") days = 90;
    else if (type === "6 Months") days = 180;
    else if (type === "12 Months") days = 365;
    if (type !== "Custom") {
      const end = new Date();
      end.setDate(end.getDate() + days);
      setPermEndDate(end.toISOString().split("T")[0]);
    }
  };

  // Handle NFC Duration calculation
  const handleNfcDurationPresetChange = (type: string) => {
    setAssignDurationPreset(type);
    const start = new Date();
    setAssignStartDate(start.toISOString().slice(0, 16));
    let days = 7;
    if (type === "1 Day") days = 1;
    else if (type === "2 Days") days = 2;
    else if (type === "7 Days") days = 7;
    else if (type === "10 Days") days = 10;
    if (type !== "Custom") {
      const end = new Date();
      end.setDate(end.getDate() + days);
      setAssignEndDate(end.toISOString().slice(0, 16));
    }
  };

  // Handle Renew Duration calculation
  const handleRenewDurationTypeChange = (type: string) => {
    setRenewDurationType(type);
    const start = new Date();
    setRenewStartDate(start.toISOString().split("T")[0]);
    let days = 365;
    if (type === "1 Month") days = 30;
    else if (type === "3 Months") days = 90;
    else if (type === "6 Months") days = 180;
    else if (type === "12 Months") days = 365;
    if (type !== "Custom") {
      const end = new Date();
      end.setDate(end.getDate() + days);
      setRenewEndDate(end.toISOString().split("T")[0]);
    }
  };

  // 2. Handle Stripe redirect callbacks (Permanent + NFC Cards)
  useEffect(() => {
    const paymentSuccess = searchParams.get("payment_success");
    const sessionId = searchParams.get("session_id");
    const ref = searchParams.get("ref");
    const paymentCancelled = searchParams.get("payment_cancelled");

    // NFC Card params
    const nfcSuccess = searchParams.get("nfc_payment_success");
    const nfcOrderId = searchParams.get("order_id");

    const tabParam = searchParams.get("tab");
    if (tabParam === "nfc-cards") setActiveTab("nfc-cards");
    else if (tabParam === "orders") setActiveTab("orders");
    else if (tabParam === "history") setActiveTab("history");
    else if (tabParam === "register") {
      setActiveTab("permanent");
      setShowPermanentForm(true);
    } else if (tabParam === "permanent") {
      setActiveTab("permanent");
    }

    if (paymentSuccess === "true" && sessionId) {
      setActiveTab("permanent");
      setShowPermanentForm(false);
      setBannerAlert({
        type: "success",
        message: "Verifying your Stripe payment confirmation..."
      });
      verifyStripeSession(sessionId, ref || "");
    } else if (nfcSuccess === "true" && sessionId) {
      setActiveTab("orders");
      setBannerAlert({
        type: "success",
        message: "Verifying your NFC Card purchase payment..."
      });
      verifyNfcStripeSession(sessionId, nfcOrderId || "");
    } else if (paymentCancelled === "true") {
      setBannerAlert({
        type: "info",
        message: "Payment checkout was cancelled. You can complete payment at any time from your portal."
      });
    }
  }, [searchParams]);

  const verifyStripeSession = async (sessionId: string, ref: string) => {
    try {
      const res = await fetch(`${API_URL}/third-party/verify-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, requestReference: ref })
      });
      const data = await res.json();
      if (res.ok) {
        setBannerAlert({
          type: "success",
          message: `Payment successful for Request ${ref || ""}! Your request has been queued for branch review and approval.`
        });
        if (currentUser?.nic) loadMyRequests(currentUser.nic);
      } else {
        setBannerAlert({
          type: "error",
          message: data.error || "Payment verification could not be confirmed."
        });
      }
    } catch {
      setBannerAlert({
        type: "error",
        message: "Error connecting to server for payment verification."
      });
    }
  };

  const verifyNfcStripeSession = async (sessionId: string, orderId: string) => {
    try {
      const res = await fetch(`${API_URL}/nfc-card/verify-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, orderId })
      });
      const data = await res.json();
      if (res.ok) {
        setBannerAlert({
          type: "success",
          message: `NFC Card Order confirmed! ${data.cardsIssued?.length || 0} reusable physical card(s) have been generated and added to your inventory.`
        });
        if (currentUser?.nic) {
          loadNfcCards(currentUser.nic);
          loadNfcOrders(currentUser.nic);
        }
      } else {
        setBannerAlert({
          type: "error",
          message: data.error || "NFC card payment verification failed."
        });
      }
    } catch {
      setBannerAlert({
        type: "error",
        message: "Network error verifying NFC card payment."
      });
    }
  };

  const loadEligibleVehicles = async (nic: string) => {
    try {
      const res = await fetch(`${API_URL}/third-party/eligible-vehicles?nic=${encodeURIComponent(nic)}`);
      const data = await res.json();
      if (res.ok) {
        setEligibleVehicles(data.vehicles || []);
        if (data.userBranch) setUserBranch(data.userBranch);
        if (data.vehicles?.length > 0 && !assignPlate) {
          setAssignPlate(data.vehicles[0].numberPlate);
        }
      }
    } catch (err) {
      console.error("Failed to load eligible vehicles:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMyRequests = async (nic: string) => {
    try {
      const res = await fetch(`${API_URL}/third-party/my-requests?nic=${encodeURIComponent(nic)}`);
      const data = await res.json();
      if (res.ok) {
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error("Failed to load requests:", err);
    }
  };

  const loadNfcCards = async (nic: string) => {
    try {
      setLoadingNfc(true);
      const res = await fetch(`${API_URL}/nfc-card/inventory?nic=${encodeURIComponent(nic)}`);
      const data = await res.json();
      if (res.ok) {
        setNfcCards(data.cards || []);
      }
    } catch (err) {
      console.error("Failed to load NFC cards:", err);
    } finally {
      setLoadingNfc(false);
    }
  };

  const loadNfcOrders = async (nic: string) => {
    try {
      const res = await fetch(`${API_URL}/nfc-card/orders?nic=${encodeURIComponent(nic)}`);
      const data = await res.json();
      if (res.ok) {
        setNfcOrders(data.orders || []);
      }
    } catch (err) {
      console.error("Failed to load NFC orders:", err);
    }
  };

  // Permanent Driver Actions
  const handleBlockPermanent = async (req: RegistrationRequest) => {
    const reason = prompt(`Enter reason for temporarily blocking ${req.driverDetails.fullName}:`) || "Temporarily blocked by policyholder";
    try {
      const res = await fetch(`${API_URL}/third-party/permanent/block/${req._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyHolderNic: currentUser.nic, reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to block driver.");
      setBannerAlert({ type: "success", message: data.message });
      loadMyRequests(currentUser.nic);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUnblockPermanent = async (req: RegistrationRequest) => {
    try {
      const res = await fetch(`${API_URL}/third-party/permanent/unblock/${req._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyHolderNic: currentUser.nic })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to unblock driver.");
      setBannerAlert({ type: "success", message: data.message });
      loadMyRequests(currentUser.nic);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenRenewPermanent = (req: RegistrationRequest) => {
    setRenewReq(req);
    handleRenewDurationTypeChange("12 Months");
    setRenewNote("");
    setRenewErr("");
  };

  const handleSubmitRenewPermanent = async () => {
    if (!renewReq) return;
    setRenewing(true);
    setRenewErr("");
    try {
      const res = await fetch(`${API_URL}/third-party/permanent/renew/${renewReq._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policyHolderNic: currentUser.nic,
          durationType: renewDurationType,
          startDate: renewStartDate,
          endDate: renewEndDate,
          note: renewNote
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to renew authorization duration.");
      setBannerAlert({ type: "success", message: data.message });
      setRenewReq(null);
      loadMyRequests(currentUser.nic);
    } catch (err: any) {
      setRenewErr(err.message || "Failed to renew authorization.");
    } finally {
      setRenewing(false);
    }
  };

  const handleSubmitTermination = async () => {
    if (!terminateReq) return;
    const finalReason =
      terminateReason === "Other reason"
        ? customReason.trim()
        : terminateReason.trim() || customReason.trim() || "Policyholder requested driver authorization termination";

    if (!finalReason) {
      setTermErr("Please provide a reason for termination.");
      return;
    }

    setTerminating(true);
    setTermErr("");
    try {
      const res = await fetch(`${API_URL}/third-party/permanent/terminate/${terminateReq._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policyHolderNic: currentUser.nic,
          reason: finalReason
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit termination request.");
      }

      setTermMsg("Driver authorization terminated and digital access revoked immediately.");
      setTimeout(() => {
        setTerminateReq(null);
        setTermMsg("");
        if (currentUser?.nic) loadMyRequests(currentUser.nic);
      }, 1500);
    } catch (err: any) {
      setTermErr(err.message || "Failed to submit termination request.");
    } finally {
      setTerminating(false);
    }
  };

  // NFC Card Ordering
  const handleOrderNfcCards = async () => {
    if (!currentUser?.nic) return;
    setOrderingNfc(true);
    try {
      const res = await fetch(`${API_URL}/nfc-card/checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policyHolderNic: currentUser.nic,
          quantity: nfcQuantity
        })
      });
      const data = await res.json();
      if (!res.ok || !data.checkoutUrl) {
        throw new Error(data.error || "Failed to start card order payment.");
      }
      window.location.href = data.checkoutUrl;
    } catch (err: any) {
      alert(err.message || "Failed to initiate payment session.");
      setOrderingNfc(false);
    }
  };

  // NFC Card Assignment + Policyholder OTP
  const handleOpenAssignModal = (card: NfcCard) => {
    setSelectedCardForAssign(card);
    setAssignDriverName("");
    setAssignDriverPhone("");
    setAssignDriverAddress("");
    setAssignDriverNic("");
    if (eligibleVehicles.length > 0) {
      setAssignPlate(eligibleVehicles[0].numberPlate);
    }
    handleNfcDurationPresetChange("7 Days");
    setOtpSent(false);
    setOtpCode("");
    setAssignError("");
    setAssignSuccess("");
    setAssignModalOpen(true);
  };

  const handleSendAssignmentOtp = async () => {
    if (!assignDriverName || !assignDriverPhone || !assignPlate) {
      setAssignError("Please provide driver name, phone number, and select a covered vehicle first.");
      return;
    }
    setOtpSending(true);
    setAssignError("");
    try {
      const res = await fetch(`${API_URL}/nfc-card/request-assignment-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyHolderNic: currentUser.nic })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP.");
      setOtpSent(true);
      setBannerAlert({
        type: "success",
        message: `OTP sent to your verified phone number (${data.maskedPhone || currentUser.mobile}).`
      });
    } catch (err: any) {
      setAssignError(err.message || "Failed to dispatch verification OTP.");
    } finally {
      setOtpSending(false);
    }
  };

  const handleConfirmAssignDriver = async () => {
    if (!selectedCardForAssign) return;
    if (!otpCode || otpCode.trim().length !== 6) {
      setAssignError("Please enter the 6-digit verification OTP received on your phone.");
      return;
    }
    setAssignSubmitting(true);
    setAssignError("");
    try {
      const res = await fetch(`${API_URL}/nfc-card/assign-driver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policyHolderNic: currentUser.nic,
          cardId: selectedCardForAssign.cardId,
          otp: otpCode.trim(),
          driverDetails: {
            fullName: assignDriverName.trim(),
            phoneNumber: assignDriverPhone.trim(),
            residentialAddress: assignDriverAddress.trim(),
            nicNumber: assignDriverNic.trim()
          },
          vehiclePlate: assignPlate,
          duration: {
            durationType: assignDurationPreset,
            startDate: assignStartDate,
            endDate: assignEndDate
          }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Assignment verification failed.");

      setAssignSuccess("Temporary driver assigned and activated immediately! No branch approval required.");
      setTimeout(() => {
        setAssignModalOpen(false);
        setSelectedCardForAssign(null);
        setOtpSent(false);
        setOtpCode("");
        setAssignSuccess("");
        loadNfcCards(currentUser.nic);
      }, 1500);
    } catch (err: any) {
      setAssignError(err.message || "Failed to complete driver assignment.");
    } finally {
      setAssignSubmitting(false);
    }
  };

  const handleBlockNfcCard = async (cardId: string) => {
    const reason = prompt("Enter reason for temporarily blocking this card driver:") || "Temporarily blocked by policyholder";
    try {
      const res = await fetch(`${API_URL}/nfc-card/block-assignment/${cardId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyHolderNic: currentUser.nic, reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to block card.");
      setBannerAlert({ type: "success", message: data.message });
      loadNfcCards(currentUser.nic);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUnblockNfcCard = async (cardId: string) => {
    try {
      const res = await fetch(`${API_URL}/nfc-card/unblock-assignment/${cardId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyHolderNic: currentUser.nic })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to unblock card.");
      setBannerAlert({ type: "success", message: data.message });
      loadNfcCards(currentUser.nic);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleTerminateNfcCard = async (cardId: string) => {
    if (!confirm("Terminate this driver's assignment? This will immediately revoke their access and make this physical card AVAILABLE for a new driver.")) return;
    try {
      const res = await fetch(`${API_URL}/nfc-card/terminate-assignment/${cardId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyHolderNic: currentUser.nic, reason: "Terminated early by policyholder" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to terminate assignment.");
      setBannerAlert({ type: "success", message: data.message });
      loadNfcCards(currentUser.nic);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Helper file upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("File size exceeds 10MB limit. Please upload a smaller image.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setter(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const togglePlate = (plate: string) => {
    setSelectedPlates((prev) =>
      prev.includes(plate) ? prev.filter((p) => p !== plate) : [...prev, plate]
    );
  };

  const handleOpenReview = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (selectedPlates.length === 0) {
      setErrorMessage("Please select at least one vehicle this driver is permitted to operate.");
      return;
    }
    if (!driverName.trim()) {
      setErrorMessage("Please enter the driver's full legal name.");
      return;
    }
    if (!driverPhone.trim()) {
      setErrorMessage("Please enter the driver's phone number.");
      return;
    }
    if (!driverAddress.trim()) {
      setErrorMessage("Please enter the driver's residential address.");
      return;
    }
    if (!nicFront || !nicBack || !dlFront || !dlBack) {
      setErrorMessage("All 4 identity document photographs (NIC Front & Back, Driving Licence Front & Back) are strictly required.");
      return;
    }

    setReviewModalOpen(true);
  };

  const handleProceedToPayment = async () => {
    setSubmitting(true);
    setErrorMessage("");

    try {
      // 1. Submit Registration Request
      const payload = {
        policyHolderNic: currentUser.nic,
        driverDetails: {
          fullName: driverName.trim(),
          phoneNumber: driverPhone.trim(),
          residentialAddress: driverAddress.trim(),
          nicNumber: driverNic.trim(),
          documents: {
            nicFront,
            nicBack,
            drivingLicenceFront: dlFront,
            drivingLicenceBack: dlBack
          }
        },
        selectedVehiclePlates: selectedPlates,
        accessDuration: {
          durationType: permDurationType,
          startDate: permStartDate,
          endDate: permEndDate
        },
        idempotencyKey: `tpr_${currentUser.nic}_${driverName.replace(/\s+/g, "")}_${Date.now()}`
      };

      const res = await fetch(`${API_URL}/third-party/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create registration request.");
      }

      const createdRequest = data.request;

      // 2. Create Stripe Checkout Session
      const checkoutRes = await fetch(`${API_URL}/third-party/checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: createdRequest._id,
          policyHolderNic: currentUser.nic
        })
      });

      const checkoutData = await checkoutRes.json();
      if (!checkoutRes.ok || !checkoutData.checkoutUrl) {
        throw new Error(checkoutData.error || "Failed to generate payment session.");
      }

      // 3. Redirect to Stripe Checkout
      window.location.href = checkoutData.checkoutUrl;
    } catch (err: any) {
      console.error("Submission error:", err);
      setErrorMessage(err.message || "An unexpected error occurred during submission.");
      setSubmitting(false);
    }
  };

  const handleResumePayment = async (request: RegistrationRequest) => {
    try {
      setSubmitting(true);
      const checkoutRes = await fetch(`${API_URL}/third-party/checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: request._id,
          policyHolderNic: currentUser.nic
        })
      });

      const checkoutData = await checkoutRes.json();
      if (!checkoutRes.ok || !checkoutData.checkoutUrl) {
        alert(checkoutData.error || "Failed to resume payment session.");
        setSubmitting(false);
        return;
      }

      window.location.href = checkoutData.checkoutUrl;
    } catch (err: any) {
      alert(err.message || "Could not connect to payment gateway.");
      setSubmitting(false);
    }
  };

  const renderPermanentTrackingStepper = (req: RegistrationRequest) => {
    const isPaid = req.payment?.status === "Paid" || req.status === "Approved" || req.status === "Scheduled" || req.status === "Pending Branch Approval";
    const isBranchReview = req.status === "Pending Branch Approval";
    const isApprovedOrActive = req.status === "Approved" || req.status === "Scheduled" || req.status === "Temporarily Blocked" || req.status === "Pending Termination Approval";
    const isRejected = req.status === "Rejected";

    const steps = [
      { name: "Request Submitted", detail: "KYC Documents Uploaded" },
      { name: "Fee Paid", detail: isPaid ? "LKR 300 via Stripe" : "LKR 300 Pending" },
      { name: "Branch Review", detail: isApprovedOrActive ? `Approved by ${req.branch}` : isBranchReview ? `Reviewing by ${req.branch}` : "Pending Review" },
      { name: "Approved & Active", detail: isApprovedOrActive ? "Digital Pass Issued" : "Pass Activation" }
    ];

    let currentIdx = 0;
    if (isApprovedOrActive) {
      currentIdx = 3;
    } else if (isBranchReview) {
      currentIdx = 2;
    } else if (isPaid) {
      currentIdx = 2;
    } else if (req.status === "Pending Payment") {
      currentIdx = 1;
    } else {
      currentIdx = 0;
    }

    if (isRejected) {
      return (
        <div className="my-3 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-3">
          <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" strokeWidth={2} />
          <div>
            <strong className="block font-bold text-rose-900 text-sm">Application Rejected by Branch</strong>
            <p className="text-rose-700 mt-0.5 leading-relaxed">
              <strong>Reason:</strong> {req.branchReview?.rejectionReason || "Identity or driving licence verification requirements were not met."}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="my-4 p-3.5 sm:p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <HugeiconsIcon icon={Clock01Icon} className="w-3.5 h-3.5 text-indigo-600" strokeWidth={2} />
            <span>Authorization Progress Tracker</span>
          </span>
          <span className="text-[11px] font-semibold text-slate-500">
            Current Stage: <span className="font-bold text-slate-800">{steps[currentIdx]?.name}</span>
          </span>
        </div>

        <div className="pt-2 pb-1 relative">
          <div className="flex items-center justify-between relative">
            {/* Background connecting bar */}
            <div className="absolute top-3.5 left-8 right-8 h-0.5 bg-slate-200 z-0" />
            <div
              className="absolute top-3.5 left-8 h-0.5 bg-emerald-500 z-0 transition-all duration-300"
              style={{
                width: `${(Math.min(currentIdx, 3) / 3) * 85}%`
              }}
            />

            {steps.map((st, i) => {
              const passed = currentIdx >= i;
              const isCurrent = currentIdx === i;

              return (
                <div key={st.name} className="flex flex-col items-center flex-1 text-center relative z-10 px-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      passed
                        ? "bg-emerald-600 text-white shadow-xs"
                        : isCurrent
                        ? "bg-indigo-600 text-white ring-4 ring-indigo-100 shadow-xs"
                        : "bg-white border border-slate-300 text-slate-400"
                    }`}
                  >
                    {passed ? "✓" : i + 1}
                  </div>
                  <span
                    className={`text-[11px] mt-1.5 font-bold leading-tight ${
                      isCurrent
                        ? "text-indigo-700 font-extrabold"
                        : passed
                        ? "text-slate-800"
                        : "text-slate-400"
                    }`}
                  >
                    {st.name}
                  </span>
                  <span className="text-[10px] text-slate-400 hidden sm:block mt-0.5 max-w-[100px] leading-tight">
                    {st.detail}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Helpful alert if pending payment or branch review */}
        {req.status === "Pending Payment" && (
          <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={Alert02Icon} className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Payment of LKR 300 is required before your branch can verify this driver.</span>
            </div>
            <button
              onClick={() => handleResumePayment(req)}
              disabled={submitting}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs whitespace-nowrap cursor-pointer border-none"
            >
              Pay LKR 300
            </button>
          </div>
        )}

        {isBranchReview && (
          <div className="mt-3 p-2.5 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900 flex items-center gap-2">
            <HugeiconsIcon icon={InformationCircleIcon} className="w-4 h-4 text-sky-600 shrink-0" />
            <span>Payment received! {req.branch} Branch staff are currently verifying the uploaded NIC and Licence KYC documents.</span>
          </div>
        )}
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative">
      <PolicyHolderNavbar />

      {/* Styled curved header matching other policy holder pages */}
      <div className="max-w-7xl w-full mx-auto px-6 md:px-16 mt-8 relative">
        <div className="absolute top-0 bottom-0 left-[calc(50%-50vw)] right-6 md:right-12 bg-[url('/policy1.jpg')] bg-cover bg-center rounded-r-[75px] md:rounded-r-[95px] overflow-hidden shadow-md">
          {/* Mockup dark slate overlay */}
          <div className="absolute inset-0 bg-slate-900/35" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0d2a3a]/90 via-[#0d2a3a]/75 to-transparent" />
        </div>

        {/* Text content aligned automatically with the page container */}
        <header className="relative z-10 h-[210px] flex flex-col justify-center pl-4 md:pl-8 select-none">
          <h1 className="text-white text-3xl md:text-[40px] font-bold tracking-tight leading-none">
            Third-Party Drivers & NFC
          </h1>
          <p className="text-slate-200 text-xs md:text-sm font-semibold mt-3.5 tracking-wide opacity-95">
            Manage permanent authorizations, temporary drivers & physical NFC cards
          </p>
        </header>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 md:px-16 py-8 sm:py-10 relative z-20">
        {/* Banner Alert */}
        {bannerAlert && (
          <div
            className={`mb-6 p-4 rounded-2xl border flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 duration-200 ${
              bannerAlert.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : bannerAlert.type === "error"
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-sky-50 border-sky-200 text-sky-800"
            }`}
          >
            <div className="flex items-center gap-3">
              <HugeiconsIcon
                icon={bannerAlert.type === "success" ? CheckmarkCircle01Icon : Alert02Icon}
                className="w-5 h-5 shrink-0"
                strokeWidth={2}
              />
              <span className="text-sm font-medium">{bannerAlert.message}</span>
            </div>
            <button
              onClick={() => setBannerAlert(null)}
              className="p-1 hover:bg-black/5 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Page Header with Action Button */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-50 text-sky-700 text-xs font-bold rounded-full mb-3 border border-sky-100">
              <HugeiconsIcon icon={Shield01Icon} className="w-3.5 h-3.5" strokeWidth={2.2} />
              <span>Sanasa General Insurance Coverage</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Third-Party Driver & NFC Management
            </h1>
            <p className="text-slate-500 text-sm sm:text-base mt-1 max-w-2xl leading-relaxed">
              Manage permanent authorized drivers and physical reusable NFC cards. Permanent drivers receive branch sign-off with configurable duration, while NFC cards allow instant temporary assignment with policyholder OTP.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start lg:self-center">
            {/* Prominent + Register New Driver 3-Choice Button */}
            <button
              type="button"
              onClick={() => setRegisterChoiceModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-sky-600 via-indigo-600 to-indigo-700 hover:from-sky-700 hover:to-indigo-800 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md hover:shadow-lg transition-all cursor-pointer border-none"
            >
              <HugeiconsIcon icon={UserAdd01Icon} className="w-5 h-5 text-white" strokeWidth={2.5} />
              <span>+ Register New Driver</span>
            </button>
          </div>
        </div>

        {/* 4 Navigation Sub-Tabs */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-200/80 p-1.5 rounded-2xl mb-8 border border-slate-300/60 shadow-xs">
          <button
            type="button"
            onClick={() => { setActiveTab("permanent"); setShowPermanentForm(false); setSelectedDriverDetail(null); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer border-none ${
              activeTab === "permanent"
                ? "bg-white text-indigo-700 shadow-xs"
                : "bg-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <HugeiconsIcon icon={UserCheck01Icon} className="w-4 h-4" strokeWidth={2} />
            <span>Permanent Drivers</span>
            {requests.filter((r) => r.status !== "Terminated" && r.status !== "Rejected").length > 0 && (
              <span className="ml-1 px-2 py-0.5 text-[11px] bg-indigo-100 text-indigo-800 font-bold rounded-full">
                {requests.filter((r) => r.status !== "Terminated" && r.status !== "Rejected").length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("nfc-cards")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer border-none ${
              activeTab === "nfc-cards"
                ? "bg-white text-emerald-700 shadow-xs"
                : "bg-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <HugeiconsIcon icon={CreditCardIcon} className="w-4 h-4" strokeWidth={2} />
            <span>Optional NFC Cards</span>
            {nfcCards.length > 0 && (
              <span className="ml-1 px-2 py-0.5 text-[11px] bg-emerald-100 text-emerald-800 font-bold rounded-full">
                {nfcCards.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer border-none ${
              activeTab === "orders"
                ? "bg-white text-amber-700 shadow-xs"
                : "bg-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <HugeiconsIcon icon={Clock01Icon} className="w-4 h-4" strokeWidth={2} />
            <span>Card Orders & Tracking</span>
            {nfcOrders.length > 0 && (
              <span className="ml-1 px-2 py-0.5 text-[11px] bg-amber-100 text-amber-800 font-bold rounded-full">
                {nfcOrders.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer border-none ${
              activeTab === "history"
                ? "bg-white text-slate-800 shadow-xs"
                : "bg-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <HugeiconsIcon icon={File01Icon} className="w-4 h-4" strokeWidth={2} />
            <span>Driver History & Logs</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: PERMANENT DRIVER REGISTRATION FORM */}
        {/* ========================================================================= */}
        {activeTab === "permanent" && showPermanentForm && (
          <form onSubmit={handleOpenReview} className="space-y-8 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <button
                type="button"
                onClick={() => setShowPermanentForm(false)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                ← Back to Permanent Drivers List
              </button>
              <span className="text-xs text-slate-500 font-semibold">Step-by-Step Permanent Driver Onboarding</span>
            </div>

            {errorMessage && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm font-medium flex items-center gap-2">
                <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Step 1: Vehicle Selection */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center text-xs font-bold">1</span>
                    Select Covered Vehicles
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Choose which of your registered vehicles this permanent driver is permitted to operate.
                  </p>
                </div>
                <span className="text-xs font-bold px-3 py-1 bg-amber-50 text-amber-800 rounded-full border border-amber-200">
                  Fixed Fee: LKR 300 per request
                </span>
              </div>

              {eligibleVehicles.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <HugeiconsIcon icon={Car01Icon} className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No eligible approved vehicles found.</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Only vehicles with an approved active insurance policy can have third-party drivers assigned.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {eligibleVehicles.map((vehicle) => {
                    const isSelected = selectedPlates.includes(vehicle.numberPlate);
                    return (
                      <div
                        key={vehicle._id}
                        onClick={() => togglePlate(vehicle.numberPlate)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 select-none relative ${
                          isSelected
                            ? "border-sky-600 bg-sky-50/60 shadow-xs"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 bg-slate-900 text-white font-mono text-xs font-bold rounded-lg tracking-wider">
                              {vehicle.numberPlate}
                            </span>
                            <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold border border-emerald-100">
                              Active Policy
                            </span>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                              isSelected
                                ? "bg-sky-600 border-sky-600 text-white"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {isSelected && <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-3.5 h-3.5" />}
                          </div>
                        </div>

                        <div className="text-xs text-slate-600 mt-2 space-y-1">
                          <p className="font-semibold text-slate-800">
                            {vehicle.company} {vehicle.model} ({vehicle.year})
                          </p>
                          <p className="text-slate-500">Policy: {vehicle.policyNumber}</p>
                          <p className="text-slate-500">Type: {vehicle.vehicleType}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 2: Driver Details */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
              <div className="pb-4 border-b border-slate-100 mb-6">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center text-xs font-bold">2</span>
                  Driver Personal Details
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Enter the permanent driver's personal details as shown on official identity records.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sunil Shantha Perera"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Phone Number (Sri Lanka) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 0771234567 or +94771234567"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    National Identity Card (NIC) / ID Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 198512345678 or 851234567V"
                    value={driverNic}
                    onChange={(e) => setDriverNic(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Residential Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. No. 45, Temple Road, Galle"
                    value={driverAddress}
                    onChange={(e) => setDriverAddress(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Authorization Duration */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
              <div className="pb-4 border-b border-slate-100 mb-6">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center text-xs font-bold">3</span>
                  Authorization Duration
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Specify how long this driver is authorized to operate your vehicles. Automatic expiry is enforced on the backend.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Preset Durations
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {["1 Month", "3 Months", "6 Months", "12 Months", "Custom"].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handlePermDurationTypeChange(type)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          permDurationType === type
                            ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={permStartDate}
                      onChange={(e) => setPermStartDate(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      End Date (Expiry)
                    </label>
                    <input
                      type="date"
                      value={permEndDate}
                      onChange={(e) => setPermEndDate(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-800 flex items-center justify-between">
                  <span className="font-semibold">
                    Valid Window: {permStartDate} to {permEndDate} ({permDurationType})
                  </span>
                  <span className="text-[11px] text-sky-600 font-bold">Auto-expires upon end date</span>
                </div>
              </div>
            </div>

            {/* Step 4: Document Uploads */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
              <div className="pb-4 border-b border-slate-100 mb-6">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center text-xs font-bold">4</span>
                  Required Document Photographs
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Upload clear photos of the driver's National Identity Card (NIC) and valid Driving Licence (Front & Back).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* NIC Front */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 flex flex-col items-center justify-center text-center relative group">
                  <input
                    type="file"
                    ref={nicFrontRef}
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, setNicFront)}
                    className="hidden"
                  />
                  {nicFront ? (
                    <div className="relative w-full h-36 rounded-xl overflow-hidden border border-slate-300">
                      <img src={nicFront} alt="NIC Front" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setNicFront("")}
                        className="absolute top-2 right-2 bg-rose-600 text-white p-1 rounded-full text-xs hover:bg-rose-700 cursor-pointer border-none"
                      >
                        <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => nicFrontRef.current?.click()}
                      className="w-full h-36 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center hover:border-sky-500 hover:bg-sky-50/50 transition-colors cursor-pointer bg-white"
                    >
                      <HugeiconsIcon icon={Upload01Icon} className="w-6 h-6 text-slate-400 mb-1" />
                      <span className="text-xs font-bold text-slate-700">Upload NIC Front</span>
                      <span className="text-[10px] text-slate-400">PNG, JPG up to 10MB</span>
                    </button>
                  )}
                  <span className="text-xs font-semibold text-slate-700 mt-2">NIC Front <span className="text-rose-500">*</span></span>
                </div>

                {/* NIC Back */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 flex flex-col items-center justify-center text-center relative group">
                  <input
                    type="file"
                    ref={nicBackRef}
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, setNicBack)}
                    className="hidden"
                  />
                  {nicBack ? (
                    <div className="relative w-full h-36 rounded-xl overflow-hidden border border-slate-300">
                      <img src={nicBack} alt="NIC Back" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setNicBack("")}
                        className="absolute top-2 right-2 bg-rose-600 text-white p-1 rounded-full text-xs hover:bg-rose-700 cursor-pointer border-none"
                      >
                        <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => nicBackRef.current?.click()}
                      className="w-full h-36 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center hover:border-sky-500 hover:bg-sky-50/50 transition-colors cursor-pointer bg-white"
                    >
                      <HugeiconsIcon icon={Upload01Icon} className="w-6 h-6 text-slate-400 mb-1" />
                      <span className="text-xs font-bold text-slate-700">Upload NIC Back</span>
                      <span className="text-[10px] text-slate-400">PNG, JPG up to 10MB</span>
                    </button>
                  )}
                  <span className="text-xs font-semibold text-slate-700 mt-2">NIC Back <span className="text-rose-500">*</span></span>
                </div>

                {/* Licence Front */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 flex flex-col items-center justify-center text-center relative group">
                  <input
                    type="file"
                    ref={dlFrontRef}
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, setDlFront)}
                    className="hidden"
                  />
                  {dlFront ? (
                    <div className="relative w-full h-36 rounded-xl overflow-hidden border border-slate-300">
                      <img src={dlFront} alt="Licence Front" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setDlFront("")}
                        className="absolute top-2 right-2 bg-rose-600 text-white p-1 rounded-full text-xs hover:bg-rose-700 cursor-pointer border-none"
                      >
                        <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => dlFrontRef.current?.click()}
                      className="w-full h-36 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center hover:border-sky-500 hover:bg-sky-50/50 transition-colors cursor-pointer bg-white"
                    >
                      <HugeiconsIcon icon={Upload01Icon} className="w-6 h-6 text-slate-400 mb-1" />
                      <span className="text-xs font-bold text-slate-700">Upload Licence Front</span>
                      <span className="text-[10px] text-slate-400">PNG, JPG up to 10MB</span>
                    </button>
                  )}
                  <span className="text-xs font-semibold text-slate-700 mt-2">Licence Front <span className="text-rose-500">*</span></span>
                </div>

                {/* Licence Back */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 flex flex-col items-center justify-center text-center relative group">
                  <input
                    type="file"
                    ref={dlBackRef}
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, setDlBack)}
                    className="hidden"
                  />
                  {dlBack ? (
                    <div className="relative w-full h-36 rounded-xl overflow-hidden border border-slate-300">
                      <img src={dlBack} alt="Licence Back" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setDlBack("")}
                        className="absolute top-2 right-2 bg-rose-600 text-white p-1 rounded-full text-xs hover:bg-rose-700 cursor-pointer border-none"
                      >
                        <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => dlBackRef.current?.click()}
                      className="w-full h-36 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center hover:border-sky-500 hover:bg-sky-50/50 transition-colors cursor-pointer bg-white"
                    >
                      <HugeiconsIcon icon={Upload01Icon} className="w-6 h-6 text-slate-400 mb-1" />
                      <span className="text-xs font-bold text-slate-700">Upload Licence Back</span>
                      <span className="text-[10px] text-slate-400">PNG, JPG up to 10MB</span>
                    </button>
                  )}
                  <span className="text-xs font-semibold text-slate-700 mt-2">Licence Back <span className="text-rose-500">*</span></span>
                </div>
              </div>
            </div>

            {/* Fee & Submit Bar */}
            <div className="bg-gradient-to-r from-slate-900 to-sky-950 rounded-3xl p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
              <div>
                <span className="text-sky-300 text-xs font-bold uppercase tracking-wider">Registration Checkout</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold tracking-tight">LKR 300.00</span>
                  <span className="text-xs text-slate-300">one-time request processing fee</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Covers all {selectedPlates.length} selected vehicle(s) • Handled by {userBranch} Branch
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-2xl shadow-lg transition-all duration-200 cursor-pointer disabled:opacity-50 text-sm border-none"
              >
                <span>Review & Pay LKR 300</span>
                <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: ACTIVE PERMANENT DRIVERS LIST */}
        {/* ========================================================================= */}
        {/* ========================================================================= */}
        {/* TAB 1: PERMANENT DRIVERS (TABLE DIRECTORY OR DEDICATED DETAIL VIEW) */}
        {/* ========================================================================= */}
        {activeTab === "permanent" && !showPermanentForm && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {selectedDriverDetail ? (
              /* ======================================================================= */
              /* DEDICATED DRIVER DOSSIER & FULL DETAILS SUBPAGE VIEW */
              /* ======================================================================= */
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-150">
                {/* Header Card & Navigation Bar */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedDriverDetail(null)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer border-none shadow-xs"
                      >
                        ← Back to Permanent Drivers List
                      </button>
                      <span className="font-mono text-xs font-extrabold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                        {selectedDriverDetail.requestReference}
                      </span>
                      {(() => {
                        const isBlocked = selectedDriverDetail.status === "Temporarily Blocked" || selectedDriverDetail.accessControl?.isBlocked;
                        const isExpired = selectedDriverDetail.status === "Expired" || selectedDriverDetail.accessDuration?.isExpired;
                        const isScheduled = selectedDriverDetail.status === "Scheduled";
                        const isApproved = selectedDriverDetail.status === "Approved";

                        if (isBlocked) {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Temporarily Blocked
                            </span>
                          );
                        }
                        if (isExpired) {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              Expired
                            </span>
                          );
                        }
                        if (isApproved) {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Approved & Active
                            </span>
                          );
                        }
                        if (isScheduled) {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                              Scheduled
                            </span>
                          );
                        }
                        if (selectedDriverDetail.status === "Pending Termination Approval") {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              Termination Under Review
                            </span>
                          );
                        }
                        if (selectedDriverDetail.status === "Pending Branch Approval") {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                              Under Branch Review
                            </span>
                          );
                        }
                        return (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            {selectedDriverDetail.status}
                          </span>
                        );
                      })()}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedDriverDetail.payment.status === "Paid" ? (
                        <>
                          {selectedDriverDetail.status === "Approved" && (
                            <a
                              href={`${API_URL}/third-party/authorization-certificate/${selectedDriverDetail.requestReference}?print=true`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-xs"
                              title="Download or Print Official Certificate"
                            >
                              <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" />
                              <span>Official Certificate</span>
                            </a>
                          )}

                          {(selectedDriverDetail.status === "Approved" || selectedDriverDetail.status === "Expired" || selectedDriverDetail.status === "Temporarily Blocked" || selectedDriverDetail.status === "Scheduled") && (
                            <button
                              type="button"
                              onClick={() => handleOpenRenewPermanent(selectedDriverDetail)}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-xs"
                              title="Renew authorization duration"
                            >
                              <HugeiconsIcon icon={Clock01Icon} className="w-4 h-4" />
                              <span>Renew Duration</span>
                            </button>
                          )}

                          {selectedDriverDetail.status === "Temporarily Blocked" ? (
                            <button
                              type="button"
                              onClick={() => handleUnblockPermanent(selectedDriverDetail)}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-xs"
                              title="Restore driver access"
                            >
                              <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4" />
                              <span>Unblock Access</span>
                            </button>
                          ) : (selectedDriverDetail.status === "Approved" || selectedDriverDetail.status === "Scheduled") ? (
                            <button
                              type="button"
                              onClick={() => handleBlockPermanent(selectedDriverDetail)}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-xs"
                              title="Temporarily suspend access"
                            >
                              <HugeiconsIcon icon={Alert02Icon} className="w-4 h-4" />
                              <span>Temporary Block</span>
                            </button>
                          ) : null}

                          {(selectedDriverDetail.status === "Approved" || selectedDriverDetail.status === "Scheduled" || selectedDriverDetail.status === "Temporarily Blocked") && (
                            <button
                              type="button"
                              onClick={() => {
                                setTerminateReq(selectedDriverDetail);
                                setTerminateReason("Driver resigned / employment ended");
                                setCustomReason("");
                                setTermErr("");
                                setTermMsg("");
                              }}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-xs"
                              title="Permanently terminate driver access"
                            >
                              <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />
                              <span>Terminate</span>
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleResumePayment(selectedDriverDetail)}
                          disabled={submitting}
                          className="inline-flex items-center gap-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 px-5 py-2 rounded-xl transition-all shadow-xs cursor-pointer border-none"
                        >
                          <HugeiconsIcon icon={CreditCardIcon} className="w-4 h-4" />
                          <span>Pay LKR 300 Now</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Driver Dossier Overview */}
                  <div className="pt-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xl shrink-0 shadow-xs">
                        {selectedDriverDetail.driverDetails.fullName
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((n) => n[0].toUpperCase())
                          .join("") || "DR"}
                      </div>
                      <div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                          {selectedDriverDetail.driverDetails.fullName}
                        </h1>
                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 mt-1.5">
                          <span>Phone: <strong className="text-slate-800 font-mono">{selectedDriverDetail.driverDetails.phoneNumber}</strong></span>
                          <span>NIC: <strong className="text-slate-800 font-mono">{selectedDriverDetail.driverDetails.nicNumber || "—"}</strong></span>
                          <span>Branch: <strong className="text-slate-800">{selectedDriverDetail.branch}</strong></span>
                        </div>
                        {selectedDriverDetail.driverDetails.residentialAddress && (
                          <p className="text-xs text-slate-500 mt-1">
                            Address: <span className="text-slate-700">{selectedDriverDetail.driverDetails.residentialAddress}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs space-y-1.5 sm:min-w-[260px]">
                      <div className="flex justify-between text-slate-500">
                        <span>Submitted Date:</span>
                        <span className="font-mono font-semibold text-slate-700">
                          {new Date(selectedDriverDetail.createdAt).toLocaleDateString("en-GB")} at {new Date(selectedDriverDetail.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Registration Fee:</span>
                        <span className="font-bold text-emerald-700 font-mono">
                          {selectedDriverDetail.payment.status === "Paid" ? "LKR 300.00 (Paid)" : "LKR 300.00 (Unpaid)"}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Verification Branch:</span>
                        <span className="font-semibold text-slate-800">{selectedDriverDetail.branch} Branch Office</span>
                      </div>
                    </div>
                  </div>

                  {/* 4-Stage Stepper */}
                  <div className="mt-8 pt-6 border-t border-slate-100">
                    {renderPermanentTrackingStepper(selectedDriverDetail)}
                  </div>
                </div>

                {/* Dossier Detail Grids */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* 1. Covered Vehicles */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                      <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
                        <HugeiconsIcon icon={Car01Icon} className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">Covered Insured Vehicles</h3>
                        <span className="text-[11px] text-slate-400">Permitted vehicle registrations</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {selectedDriverDetail.selectedVehicles.map((v, i) => (
                        <div key={i} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
                          <div>
                            <span className="px-2.5 py-1 bg-slate-900 text-white font-mono font-bold text-xs rounded-lg tracking-wider">
                              {v.numberPlate}
                            </span>
                            <p className="text-xs text-slate-700 mt-1.5 font-medium">
                              {v.company || "Sanasa Insured"} {v.model || ""}
                            </p>
                            {v.policyNumber && (
                              <p className="text-[11px] text-slate-400 font-mono">Policy: {v.policyNumber}</p>
                            )}
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active Cover
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 2. Validity Window & Duration */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                        <HugeiconsIcon icon={Clock01Icon} className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">Authorization Duration</h3>
                        <span className="text-[11px] text-slate-400">Valid operation window</span>
                      </div>
                    </div>

                    {selectedDriverDetail.accessDuration ? (
                      <div className="space-y-3 text-xs">
                        <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-2xl flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-indigo-800 tracking-wider">Configured Duration</span>
                            <span className="text-sm font-black text-indigo-950 block mt-0.5">
                              {selectedDriverDetail.accessDuration.durationType || "12 Months"}
                            </span>
                          </div>
                          <span className="px-2.5 py-1 bg-white text-indigo-700 font-bold text-xs rounded-lg border border-indigo-200 shadow-2xs">
                            Active Pass
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-slate-600">
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Valid From</span>
                            <span className="font-mono font-bold text-slate-800 text-xs block mt-0.5">
                              {new Date(selectedDriverDetail.accessDuration.startDate).toLocaleDateString("en-GB")}
                            </span>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Valid Until</span>
                            <span className="font-mono font-bold text-slate-800 text-xs block mt-0.5">
                              {new Date(selectedDriverDetail.accessDuration.endDate).toLocaleDateString("en-GB")}
                            </span>
                          </div>
                        </div>

                        {selectedDriverDetail.renewalHistory && selectedDriverDetail.renewalHistory.length > 0 && (
                          <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-100 flex items-center gap-1.5">
                            <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Renewed {selectedDriverDetail.renewalHistory.length} time(s).</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600">
                        <span className="font-bold block text-slate-800">Standard Policy Duration</span>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Duration defaults to active vehicle insurance policy coverage lifetime.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 3. Branch Verification & Review */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <HugeiconsIcon icon={Building04Icon} className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">Branch Office Review</h3>
                        <span className="text-[11px] text-slate-400">Compliance & sign-off</span>
                      </div>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Branch:</span>
                          <span className="font-bold text-slate-900">{selectedDriverDetail.branch} Office</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Review Status:</span>
                          <span className="font-semibold text-slate-800">{selectedDriverDetail.status}</span>
                        </div>
                        {selectedDriverDetail.branchReview?.reviewedBy && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Reviewed By:</span>
                            <span className="font-bold text-emerald-800">{selectedDriverDetail.branchReview.reviewedBy}</span>
                          </div>
                        )}
                        {selectedDriverDetail.branchReview?.reviewedAt && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Review Date:</span>
                            <span className="font-mono text-slate-700">
                              {new Date(selectedDriverDetail.branchReview.reviewedAt).toLocaleDateString("en-GB")}
                            </span>
                          </div>
                        )}
                      </div>

                      {selectedDriverDetail.branchReview?.rejectionReason && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                          <span className="font-bold block">Rejection Feedback:</span>
                          <p className="mt-0.5">{selectedDriverDetail.branchReview.rejectionReason}</p>
                        </div>
                      )}

                      {selectedDriverDetail.terminationRequest?.reason && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
                          <span className="font-bold block">Termination Request:</span>
                          <p className="mt-0.5">{selectedDriverDetail.terminationRequest.reason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. KYC Identity & Licence Documents */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <HugeiconsIcon icon={File01Icon} className="w-5 h-5 text-indigo-600" />
                        Uploaded KYC Identity & Licence Documents
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Driver verification files submitted for branch staff verification. Click any document to view in high resolution.
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                      NIC: {selectedDriverDetail.driverDetails.nicNumber || "—"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: "NIC Front", doc: selectedDriverDetail.driverDetails.documents?.nicFront },
                      { label: "NIC Back", doc: selectedDriverDetail.driverDetails.documents?.nicBack },
                      { label: "Driving Licence Front", doc: selectedDriverDetail.driverDetails.documents?.drivingLicenceFront },
                      { label: "Driving Licence Back", doc: selectedDriverDetail.driverDetails.documents?.drivingLicenceBack }
                    ].map((item, idx) => (
                      <div key={idx} className="border border-slate-200 rounded-2xl p-3 bg-slate-50 text-center">
                        <span className="text-xs font-bold text-slate-700 block mb-2">{item.label}</span>
                        {item.doc ? (
                          <div
                            onClick={() => setPreviewDocModal({ url: item.doc!, title: `${selectedDriverDetail.driverDetails.fullName} — ${item.label}` })}
                            className="relative h-44 rounded-xl overflow-hidden border border-slate-300 bg-white group cursor-pointer shadow-2xs"
                          >
                            <img src={item.doc} alt={item.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                            <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                              <span>Click to Enlarge</span>
                            </div>
                          </div>
                        ) : (
                          <div className="h-44 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 text-xs">
                            <HugeiconsIcon icon={File01Icon} className="w-8 h-8 mb-1 text-slate-300" />
                            <span>Not Uploaded</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* ======================================================================= */
              /* LIST TYPE TABLE VIEW (DIRECTORY) */
              /* ======================================================================= */
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Header / Intro Banner */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-6 border border-slate-800">
                  <div className="space-y-1.5 max-w-xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-bold rounded-full border border-indigo-400/30">
                      <HugeiconsIcon icon={UserCheck01Icon} className="w-3.5 h-3.5" />
                      <span>Authorized Permanent Drivers</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                      Permanent Third-Party Drivers
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      Approved long-term drivers authorized across your insured vehicles. Click <strong>View Details</strong> on any driver to inspect full authorization timeline, KYC documents, and policy permissions.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowPermanentForm(true)}
                    className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg transition-all flex items-center gap-2 self-start sm:self-auto cursor-pointer border-none flex-shrink-0"
                  >
                    <HugeiconsIcon icon={UserAdd01Icon} className="w-4 h-4 text-white" />
                    <span>+ Add Permanent Driver</span>
                  </button>
                </div>

                {/* Table Directory Card */}
                {requests.filter((r) => r.status !== "Terminated" && r.status !== "Rejected").length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
                    <HugeiconsIcon icon={UserCheck01Icon} className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-slate-800">No Permanent Drivers Registered Yet</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      You haven't authorized any long-term third-party drivers. Register a driver to grant official driving and claim filing authorization.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowPermanentForm(true)}
                      className="mt-5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer border-none inline-flex items-center gap-2"
                    >
                      <HugeiconsIcon icon={UserAdd01Icon} className="w-4 h-4" />
                      <span>Register First Permanent Driver (LKR 300)</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Search & Filter Bar */}
                    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Search Box */}
                      <div className="relative flex-1 max-w-md">
                        <input
                          type="text"
                          value={driverTableSearch}
                          onChange={(e) => setDriverTableSearch(e.target.value)}
                          placeholder="Search by name, NIC, phone, plate..."
                          className="w-full pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-indigo-500 shadow-xs"
                        />
                        {driverTableSearch && (
                          <button
                            type="button"
                            onClick={() => setDriverTableSearch("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer text-xs"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Status Filter Buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        {["ALL", "Approved", "Pending Review", "Pending Payment", "Blocked"].map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => setDriverStatusFilter(status)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                              driverStatusFilter === status
                                ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Table View */}
                    {(() => {
                      const allPermanent = requests.filter((r) => r.status !== "Terminated" && r.status !== "Rejected");
                      const filtered = allPermanent.filter((req) => {
                        const q = driverTableSearch.trim().toLowerCase();
                        const matchSearch =
                          !q ||
                          req.driverDetails.fullName.toLowerCase().includes(q) ||
                          (req.driverDetails.nicNumber && req.driverDetails.nicNumber.toLowerCase().includes(q)) ||
                          req.driverDetails.phoneNumber.toLowerCase().includes(q) ||
                          req.requestReference.toLowerCase().includes(q) ||
                          req.selectedVehicles.some((v) => v.numberPlate.toLowerCase().includes(q));

                        if (!matchSearch) return false;
                        if (driverStatusFilter === "ALL") return true;
                        if (driverStatusFilter === "Approved") return req.status === "Approved";
                        if (driverStatusFilter === "Pending Review") return req.status === "Pending Branch Approval";
                        if (driverStatusFilter === "Pending Payment") return req.status === "Pending Payment";
                        if (driverStatusFilter === "Blocked") return req.status === "Temporarily Blocked" || req.accessControl?.isBlocked;
                        return true;
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
                            <HugeiconsIcon icon={UserCheck01Icon} className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <h3 className="text-base font-bold text-slate-800">No Matching Drivers</h3>
                            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                              No permanent drivers matched your search criteria or filter.
                            </p>
                            <button
                              type="button"
                              onClick={() => { setDriverTableSearch(""); setDriverStatusFilter("ALL"); }}
                              className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border-none"
                            >
                              Reset Filters
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                                  <th className="py-4 px-5">Driver Details</th>
                                  <th className="py-4 px-4">NIC / ID</th>
                                  <th className="py-4 px-4">Covered Vehicles</th>
                                  <th className="py-4 px-4">Validity</th>
                                  <th className="py-4 px-4">Branch</th>
                                  <th className="py-4 px-4">Status</th>
                                  <th className="py-4 px-5 text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-xs">
                                {filtered.map((req) => {
                                  const isBlocked = req.status === "Temporarily Blocked" || req.accessControl?.isBlocked;
                                  const isExpired = req.status === "Expired" || req.accessDuration?.isExpired;
                                  const isScheduled = req.status === "Scheduled";
                                  const isApproved = req.status === "Approved";

                                  return (
                                    <tr
                                      key={req._id}
                                      onClick={() => setSelectedDriverDetail(req)}
                                      className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                                    >
                                      {/* Driver info */}
                                      <td className="py-4 px-5">
                                        <div className="flex items-center gap-3">
                                          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center text-xs shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                            {req.driverDetails.fullName
                                              .split(" ")
                                              .filter(Boolean)
                                              .slice(0, 2)
                                              .map((n) => n[0].toUpperCase())
                                              .join("") || "DR"}
                                          </div>
                                          <div>
                                            <span className="font-bold text-slate-900 block text-sm group-hover:text-indigo-700 transition-colors">
                                              {req.driverDetails.fullName}
                                            </span>
                                            <span className="text-slate-500 text-[11px] font-mono mt-0.5 block">
                                              {req.driverDetails.phoneNumber}
                                            </span>
                                          </div>
                                        </div>
                                      </td>

                                      {/* NIC */}
                                      <td className="py-4 px-4 font-mono font-semibold text-slate-700">
                                        {req.driverDetails.nicNumber ? (
                                          <span className="bg-slate-50 px-2 py-1 rounded-md border border-slate-200/60">
                                            {req.driverDetails.nicNumber}
                                          </span>
                                        ) : (
                                          <span className="text-slate-400">—</span>
                                        )}
                                      </td>

                                      {/* Covered Vehicles */}
                                      <td className="py-4 px-4">
                                        <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                                          {req.selectedVehicles.slice(0, 2).map((v, i) => (
                                            <span
                                              key={i}
                                              className="px-2 py-0.5 bg-slate-900 text-white font-mono font-bold rounded-md text-[11px] tracking-wider"
                                            >
                                              {v.numberPlate}
                                            </span>
                                          ))}
                                          {req.selectedVehicles.length > 2 && (
                                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 font-bold rounded-md text-[10px]">
                                              +{req.selectedVehicles.length - 2}
                                            </span>
                                          )}
                                        </div>
                                      </td>

                                      {/* Validity */}
                                      <td className="py-4 px-4 text-slate-600">
                                        {req.accessDuration ? (
                                          <div>
                                            <span className="font-bold text-slate-900 block text-xs">
                                              {req.accessDuration.durationType || "Configured"}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-mono block">
                                              Until {new Date(req.accessDuration.endDate).toLocaleDateString("en-GB")}
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-slate-500">Standard Policy</span>
                                        )}
                                      </td>

                                      {/* Branch */}
                                      <td className="py-4 px-4 text-slate-700 font-medium">
                                        {req.branch}
                                      </td>

                                      {/* Status Badge */}
                                      <td className="py-4 px-4">
                                        {isBlocked ? (
                                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                            Blocked
                                          </span>
                                        ) : isExpired ? (
                                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300">
                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                            Expired
                                          </span>
                                        ) : isApproved ? (
                                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            Approved
                                          </span>
                                        ) : isScheduled ? (
                                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                            Scheduled
                                          </span>
                                        ) : req.status === "Pending Termination Approval" ? (
                                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                            Termination
                                          </span>
                                        ) : req.status === "Pending Branch Approval" ? (
                                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200">
                                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                                            Under Review
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                            {req.status}
                                          </span>
                                        )}
                                      </td>

                                      {/* View Button */}
                                      <td className="py-4 px-5 text-right">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedDriverDetail(req);
                                          }}
                                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white transition-all cursor-pointer border border-indigo-200 shadow-2xs group-hover:border-indigo-600"
                                        >
                                          <span>View</span>
                                          <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5" />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: REQUEST & DRIVER HISTORY & AUDIT LOGS */}
        {/* ========================================================================= */}
        {activeTab === "history" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {requests.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
                <HugeiconsIcon icon={Clock01Icon} className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">No Third-Party Requests Found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  You haven't submitted any third-party driver registration requests yet.
                </p>
                <button
                  type="button"
                  onClick={() => { setActiveTab("permanent"); setShowPermanentForm(true); }}
                  className="mt-4 px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer border-none"
                >
                  Create Your First Request
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((req) => {
                  const isBlocked = req.status === "Temporarily Blocked" || req.accessControl?.isBlocked;
                  const isExpired = req.status === "Expired" || req.accessDuration?.isExpired;
                  const isTerminated = req.status === "Terminated";
                  const isScheduled = req.status === "Scheduled";
                  const isApproved = req.status === "Approved";

                  return (
                    <div
                      key={req._id}
                      className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs hover:border-slate-300 transition-colors"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="font-mono text-sm font-extrabold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">
                              {req.requestReference}
                            </span>

                            {/* Status Badge */}
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                isBlocked
                                  ? "bg-amber-50 text-amber-900 border-amber-300"
                                  : isExpired
                                  ? "bg-rose-50 text-rose-800 border-rose-300"
                                  : isTerminated
                                  ? "bg-slate-100 text-slate-700 border-slate-300"
                                  : isScheduled
                                  ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                                  : isApproved
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : req.status === "Pending Termination Approval"
                                  ? "bg-rose-50 text-rose-800 border-rose-200"
                                  : req.status === "Rejected"
                                  ? "bg-rose-50 text-rose-800 border-rose-200"
                                  : req.status === "Pending Branch Approval"
                                  ? "bg-sky-50 text-sky-800 border-sky-200"
                                  : "bg-amber-50 text-amber-800 border-amber-200"
                              }`}
                            >
                              {isBlocked
                                ? "Temporarily Blocked"
                                : isExpired
                                ? "Expired"
                                : req.status === "Pending Termination Approval"
                                ? "Termination Under Review"
                                : req.status}
                            </span>

                            {/* Duration Badge */}
                            {req.accessDuration && (
                              <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200 flex items-center gap-1">
                                <HugeiconsIcon icon={Clock01Icon} className="w-3.5 h-3.5" />
                                <span>{req.accessDuration.durationType || "Duration Configured"}</span>
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-400 mt-1.5">
                            Submitted on {new Date(req.createdAt).toLocaleDateString("en-GB")} at{" "}
                            {new Date(req.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • Branch: {req.branch}
                          </p>
                        </div>

                        {/* Top Right Actions */}
                        <div className="flex flex-wrap items-center gap-2">
                          {req.payment.status === "Paid" ? (
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Official Certificate PDF Button */}
                              {isApproved && (
                                <a
                                  href={`${API_URL}/third-party/authorization-certificate/${req.requestReference}?print=true`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                                  title="Download / Print Official Police & Garage Certificate"
                                >
                                  <HugeiconsIcon icon={Download01Icon} className="w-3.5 h-3.5" />
                                  <span>Official Certificate</span>
                                </a>
                              )}

                              {/* Renew Button */}
                              {(isApproved || isExpired || isBlocked || isScheduled) && (
                                <button
                                  onClick={() => handleOpenRenewPermanent(req)}
                                  className="flex items-center gap-1 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                                  title="Renew driver authorized duration"
                                >
                                  <HugeiconsIcon icon={Clock01Icon} className="w-3.5 h-3.5" />
                                  <span>Renew Duration</span>
                                </button>
                              )}

                              {/* Temporary Block / Unblock */}
                              {isBlocked ? (
                                <button
                                  onClick={() => handleUnblockPermanent(req)}
                                  className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                                  title="Restore driver access"
                                >
                                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-3.5 h-3.5" />
                                  <span>Unblock Access</span>
                                </button>
                              ) : (isApproved || isScheduled) ? (
                                <button
                                  onClick={() => handleBlockPermanent(req)}
                                  className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                                  title="Temporarily suspend access"
                                >
                                  <HugeiconsIcon icon={Alert02Icon} className="w-3.5 h-3.5" />
                                  <span>Temporary Block</span>
                                </button>
                              ) : null}

                              {/* Terminate Driver */}
                              {(!isTerminated && (isApproved || isScheduled || isBlocked)) && (
                                <button
                                  onClick={() => {
                                    setTerminateReq(req);
                                    setTerminateReason("Driver resigned / employment ended");
                                    setCustomReason("");
                                    setTermErr("");
                                    setTermMsg("");
                                  }}
                                  className="flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                                  title="Permanently terminate driver access"
                                >
                                  <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" />
                                  <span>Terminate</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleResumePayment(req)}
                              disabled={submitting}
                              className="flex items-center gap-1.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer border-none"
                            >
                              <HugeiconsIcon icon={CreditCardIcon} className="w-4 h-4" />
                              <span>Pay LKR 300 Now</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Permanent Driver Authorization Progress Stepper */}
                      {renderPermanentTrackingStepper(req)}

                      {/* Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-xs">
                        <div>
                          <span className="text-slate-400 font-semibold block uppercase">Driver Details</span>
                          <span className="text-slate-800 font-bold mt-0.5 block">{req.driverDetails.fullName}</span>
                          <span className="text-slate-500 block">{req.driverDetails.phoneNumber}</span>
                          <span className="text-slate-500 block font-mono">NIC: {req.driverDetails.nicNumber || "—"}</span>
                        </div>

                        <div>
                          <span className="text-slate-400 font-semibold block uppercase">Covered Vehicles</span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {req.selectedVehicles.map((v, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono font-bold rounded-md text-[11px]"
                              >
                                {v.numberPlate}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-400 font-semibold block uppercase">Validity Window</span>
                          {req.accessDuration ? (
                            <div className="mt-1 space-y-0.5">
                              <span className="font-mono text-slate-800 font-semibold block">
                                {new Date(req.accessDuration.startDate).toLocaleDateString("en-GB")} →{" "}
                                {new Date(req.accessDuration.endDate).toLocaleDateString("en-GB")}
                              </span>
                              <span className="text-[11px] text-slate-500 block">
                                {req.accessDuration.durationType} duration
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500 block mt-1">Standard Policy Duration</span>
                          )}
                        </div>

                        <div>
                          <span className="text-slate-400 font-semibold block uppercase">Branch Sign-Off</span>
                          {req.status === "Approved" ? (
                            <span className="text-emerald-700 font-bold block mt-0.5">
                              Approved by {req.branchReview?.reviewedBy || "Branch Staff"}
                            </span>
                          ) : req.status === "Pending Termination Approval" ? (
                            <div className="mt-1 p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-800">
                              <span className="font-bold block">Termination Pending:</span>
                              <span className="text-[11px]">{req.terminationRequest?.reason || "Policyholder termination request"}</span>
                            </div>
                          ) : req.status === "Terminated" ? (
                            <span className="text-slate-600 font-bold block mt-0.5">
                              Terminated & Access Revoked
                            </span>
                          ) : req.status === "Rejected" ? (
                            <div className="mt-1 p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-800">
                              <span className="font-bold block">Rejection Reason:</span>
                              <span>{req.branchReview?.rejectionReason || "Requirements not met."}</span>
                            </div>
                          ) : (
                            <span className="text-sky-700 font-semibold block mt-0.5">
                              Under review by {req.branch} branch
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Renewal Timeline Notice if exists */}
                      {req.renewalHistory && req.renewalHistory.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
                          <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            Renewed {req.renewalHistory.length} time(s). Last renewed on{" "}
                            {new Date(req.renewalHistory[req.renewalHistory.length - 1].renewedAt).toLocaleDateString("en-GB")}.
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: OPTIONAL NFC CARDS INVENTORY & ASSIGNMENTS */}
        {/* ========================================================================= */}
        {activeTab === "nfc-cards" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Hero / Order Section */}
            <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 border border-slate-800">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-500/20 text-sky-300 text-xs font-bold rounded-full border border-sky-400/30">
                  <HugeiconsIcon icon={CreditCardIcon} className="w-3.5 h-3.5" />
                  <span>Physical Reusable NFC Tags</span>
                </div>
                <h2 className="text-2xl font-black tracking-tight">
                  Instant Temporary Driver NFC Cards
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Purchase reusable physical NFC cards to authorize temporary drivers on demand (1 Day to 10 Days). Assignment is verified via an OTP sent directly to YOUR registered phone number. <span className="text-amber-300 font-bold">No branch approval is required!</span>
                </p>
                <div className="flex items-center gap-4 pt-2 text-xs text-slate-300">
                  <span>• Price: <strong className="text-white">LKR 500</strong> / card</span>
                  <span>• Reusable unlimited times</span>
                  <span>• Per-assignment privacy</span>
                </div>
              </div>

              {/* Order Widget */}
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 w-full lg:w-80 shrink-0">
                <span className="text-xs uppercase tracking-wider text-sky-200 font-bold block mb-1">
                  Order Physical Cards
                </span>
                <div className="flex items-center justify-between my-3">
                  <span className="text-xs text-slate-200">Quantity:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setNfcQuantity((prev) => Math.max(1, prev - 1))}
                      className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold flex items-center justify-center cursor-pointer border-none"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-bold text-lg">{nfcQuantity}</span>
                    <button
                      type="button"
                      onClick={() => setNfcQuantity((prev) => Math.min(10, prev + 1))}
                      className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold flex items-center justify-center cursor-pointer border-none"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex items-baseline justify-between border-t border-white/15 pt-3 mb-4">
                  <span className="text-xs text-slate-300">Total Price:</span>
                  <span className="text-xl font-extrabold text-amber-300">
                    LKR {(nfcQuantity * 500).toLocaleString()}.00
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleOrderNfcCards}
                  disabled={orderingNfc}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer border-none flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <HugeiconsIcon icon={CreditCardIcon} className="w-4 h-4" />
                  <span>{orderingNfc ? "Connecting to Stripe..." : "Order Cards via Stripe"}</span>
                </button>
              </div>
            </div>

            {/* Quick Link to Orders Tab if orders exist */}
            {nfcOrders.length > 0 && (
              <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold">
                    <HugeiconsIcon icon={Clock01Icon} className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-slate-900 block">NFC Card Orders & Branch Tracking</span>
                    <span className="text-[11px] text-slate-500">
                      You have {nfcOrders.length} order(s) under review, encoding, or ready for pickup.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("orders")}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer border-none shrink-0"
                >
                  View Order Tracking →
                </button>
              </div>
            )}

            {/* Inventory List */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <HugeiconsIcon icon={CreditCardIcon} className="w-5 h-5 text-emerald-600" />
                    <span>Your NFC Card Inventory ({nfcCards.length})</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Reusable physical tags linked to your policyholder account.
                  </p>
                </div>

                <button
                  onClick={() => currentUser?.nic && loadNfcCards(currentUser.nic)}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer border-none self-start sm:self-auto"
                >
                  Refresh Inventory
                </button>
              </div>

              {loadingNfc ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  Loading NFC cards inventory...
                </div>
              ) : nfcCards.length === 0 ? (
                <div className="py-12 text-center">
                  <HugeiconsIcon icon={CreditCardIcon} className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-slate-800">No NFC Cards in Inventory</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    You have not ordered any physical NFC cards yet. Order your cards using the panel above to instantly assign temporary drivers.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
                  {nfcCards.map((card) => {
                    const isAvailable = card.status === "Available";
                    const isBlocked = card.status === "Temporarily Blocked";
                    const isExpired = card.status === "Expired";
                    const isActive = card.status === "Active";

                    return (
                      <div
                        key={card._id}
                        className="p-5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white shadow-xs flex flex-col justify-between transition-all"
                      >
                        <div>
                          {/* Card Top */}
                          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                                NFC
                              </span>
                              <div>
                                <span className="font-mono text-xs font-extrabold text-slate-900 block">
                                  {card.cardId}
                                </span>
                                <span className="text-[10px] text-slate-400">Physical Tag</span>
                              </div>
                            </div>

                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                isAvailable
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : isActive
                                  ? "bg-sky-50 text-sky-800 border-sky-200"
                                  : isBlocked
                                  ? "bg-amber-50 text-amber-900 border-amber-300"
                                  : isExpired
                                  ? "bg-rose-50 text-rose-800 border-rose-200"
                                  : "bg-slate-100 text-slate-700 border-slate-200"
                              }`}
                            >
                              {card.status}
                            </span>
                          </div>

                          {/* Assignment Info */}
                          <div className="py-4 text-xs space-y-2">
                            {card.currentAssignment && !isAvailable ? (
                              <>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                    Assigned Temporary Driver
                                  </span>
                                  <span className="text-slate-900 font-bold block text-sm">
                                    {card.currentAssignment.driverDetails.fullName}
                                  </span>
                                  <span className="text-slate-500 block">
                                    Tel: {card.currentAssignment.driverDetails.phoneNumber}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-slate-600">
                                  <span>Covered Vehicle:</span>
                                  <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                                    {card.currentAssignment.vehicleDetails.numberPlate}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-slate-600">
                                  <span>Duration:</span>
                                  <span className="font-bold text-sky-700">
                                    {card.currentAssignment.duration.durationType}
                                  </span>
                                </div>

                                <div className="text-[11px] text-slate-400 pt-1">
                                  Valid: {new Date(card.currentAssignment.duration.startDate).toLocaleDateString("en-GB")}{" "}
                                  to {new Date(card.currentAssignment.duration.endDate).toLocaleDateString("en-GB")}
                                </div>
                              </>
                            ) : (
                              <div className="py-6 text-center text-slate-400">
                                <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-8 h-8 mx-auto mb-1 text-emerald-500 opacity-80" />
                                <span className="font-semibold text-slate-600 block">Ready for Assignment</span>
                                <span className="text-[11px] text-slate-400">Card is vacant and unassigned</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Bottom Actions */}
                        <div className="pt-3 border-t border-slate-100 space-y-2">
                          {isAvailable ? (
                            <button
                              type="button"
                              onClick={() => handleOpenAssignModal(card)}
                              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer border-none flex items-center justify-center gap-1.5"
                            >
                              <HugeiconsIcon icon={UserAdd01Icon} className="w-4 h-4" />
                              <span>Assign Driver (+ OTP)</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              {isBlocked ? (
                                <button
                                  type="button"
                                  onClick={() => handleUnblockNfcCard(card.cardId)}
                                  className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs rounded-xl cursor-pointer"
                                >
                                  Unblock
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleBlockNfcCard(card.cardId)}
                                  className="flex-1 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs rounded-xl cursor-pointer"
                                >
                                  Block
                                </button>
                              )}

                              <a
                                href={`${API_URL}/third-party/authorization-certificate/${card.cardId}?print=true`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer text-center"
                                title="Download / Print Official Police & Garage Certificate"
                              >
                                <HugeiconsIcon icon={Download01Icon} className="w-3.5 h-3.5" />
                                <span>Certificate</span>
                              </a>

                              <button
                                type="button"
                                onClick={() => handleTerminateNfcCard(card.cardId)}
                                className="flex-1 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs rounded-xl cursor-pointer"
                              >
                                Terminate
                              </button>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => setHistoryCard(card)}
                            className="w-full py-1 text-[11px] text-slate-500 hover:text-slate-800 font-semibold cursor-pointer border-none bg-transparent"
                          >
                            View Card History & Logs ({card.assignmentHistory?.length || 0})
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: CARD ORDERS & BRANCH ISSUANCE TRACKING */}
        {/* ========================================================================= */}
        {activeTab === "orders" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-6 border border-slate-800">
              <div className="space-y-1.5 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-bold rounded-full border border-amber-400/30">
                  <HugeiconsIcon icon={Clock01Icon} className="w-3.5 h-3.5" />
                  <span>Physical NFC Card Issuance Tracking</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Card Orders & Collection Status
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Track your card requests across all stages: initial payment, branch review, NFC tag encoding, and pickup readiness at {userBranch} Branch.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setOrderNfcModalOpen(true)}
                  className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm rounded-2xl shadow-lg transition-all flex items-center gap-2 cursor-pointer border-none"
                >
                  <HugeiconsIcon icon={CreditCardIcon} className="w-4 h-4 text-slate-950" />
                  <span>+ Order NFC Cards</span>
                </button>
              </div>
            </div>

            {/* Orders List */}
            {nfcOrders.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs">
                <HugeiconsIcon icon={CreditCardIcon} className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">No NFC Card Orders Found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  You haven't ordered any physical NFC cards yet. Place an order to receive reusable cards for temporary drivers.
                </p>
                <button
                  type="button"
                  onClick={() => setOrderNfcModalOpen(true)}
                  className="mt-5 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition-colors cursor-pointer border-none inline-flex items-center gap-2"
                >
                  <HugeiconsIcon icon={CreditCardIcon} className="w-4 h-4" />
                  <span>Order Physical Cards (LKR 500 each)</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {nfcOrders.map((order) => {
                  const isRejected = order.status === "Rejected";
                  const isReady = order.status === "Ready for Collection";
                  const isCollected = order.status === "Collected";
                  const isPaid = order.payment?.status === "Paid";
                  const steps = ["Request Submitted", "Approved", "Processing", "Ready for Collection", "Collected"];
                  const currentIdx = steps.indexOf(order.status);

                  return (
                    <div
                      key={order._id}
                      className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-sm font-black text-[#102A43]">
                            {order.orderNumber}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#102A43]/10 text-[#102A43]">
                            {order.quantity} {order.quantity === 1 ? "Card" : "Cards"} (LKR {order.totalAmount?.toLocaleString()})
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isPaid ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}>
                            {isPaid ? "Paid" : "Pending Payment"}
                          </span>
                        </div>

                        <span className="text-xs text-slate-400">
                          Submitted on {new Date(order.createdAt).toLocaleDateString("en-LK", { timeZone: "Asia/Colombo", month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>

                      {/* Status Stepper */}
                      {!isRejected ? (
                        <div className="pt-2 pb-1">
                          <div className="flex items-center justify-between relative">
                            {steps.map((st, i) => {
                              const passed = currentIdx >= i;
                              const isCurrent = order.status === st;

                              return (
                                <div key={st} className="flex flex-col items-center flex-1 text-center relative z-10">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                                    passed ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"
                                  }`}>
                                    {passed ? "✓" : i + 1}
                                  </div>
                                  <span className={`text-[10px] mt-1 font-medium ${
                                    isCurrent ? "text-blue-700 font-bold" : passed ? "text-slate-800" : "text-slate-400"
                                  }`}>
                                    {st}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                          <strong>Request Rejected by Branch:</strong> {order.rejectionReason || "Requirements not met."}
                        </div>
                      )}

                      {/* Collection Alert if Ready */}
                      {isReady && (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center gap-3">
                          <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-5 h-5 text-emerald-600 shrink-0" />
                          <div>
                            <strong className="block text-sm">Ready for Collection!</strong>
                            <span className="text-emerald-800 text-[11px]">
                              Your {order.quantity} card(s) have been verified and encoded. You can collect them at the <strong>{order.branch || "Galle"} Branch</strong>.
                            </span>
                          </div>
                        </div>
                      )}

                      {isCollected && order.collectionInfo?.collectedAt && (
                        <div className="text-[11px] text-slate-500">
                          Collected on {new Date(order.collectionInfo.collectedAt).toLocaleDateString("en-LK", { timeZone: "Asia/Colombo" })} by {order.collectionInfo.collectedBy || "Policyholder"}.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* REVIEW REGISTRATION MODAL */}
      {/* ========================================================================= */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={Shield01Icon} className="w-5 h-5 text-sky-600" />
                <h3 className="text-lg font-bold text-slate-900">Review Registration Details</h3>
              </div>
              <button
                onClick={() => setReviewModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer border-none bg-transparent"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Driver Name:</span>
                  <span className="font-bold text-slate-800">{driverName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone Number:</span>
                  <span className="font-bold text-slate-800">{driverPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">NIC Number:</span>
                  <span className="font-bold text-slate-800">{driverNic || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Duration:</span>
                  <span className="font-bold text-sky-700">{permDurationType} ({permStartDate} → {permEndDate})</span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-semibold block mb-1.5">Selected Vehicles ({selectedPlates.length}):</span>
                <div className="flex flex-wrap gap-2">
                  {selectedPlates.map((plate) => (
                    <span key={plate} className="px-2.5 py-1 bg-slate-900 text-white font-mono font-bold rounded-lg text-xs">
                      {plate}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-sky-900 block">Registration Processing Fee</span>
                  <span className="text-[11px] text-sky-700">Charged once per request for all vehicles</span>
                </div>
                <span className="text-lg font-extrabold text-sky-900">LKR 300.00</span>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer text-xs"
              >
                Edit Information
              </button>
              <button
                type="button"
                onClick={handleProceedToPayment}
                disabled={submitting}
                className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50 text-xs flex items-center justify-center gap-1.5 border-none"
              >
                {submitting ? (
                  <span>Connecting to Stripe...</span>
                ) : (
                  <>
                    <HugeiconsIcon icon={CreditCardIcon} className="w-4 h-4" />
                    <span>Pay LKR 300 Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RENEW PERMANENT DRIVER MODAL */}
      {/* ========================================================================= */}
      {renewReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={Clock01Icon} className="w-5 h-5 text-sky-600" />
                <h3 className="text-base font-bold text-slate-900">Renew Driver Authorization</h3>
              </div>
              <button
                onClick={() => setRenewReq(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer border-none bg-transparent"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block">Driver:</span>
                <span className="font-bold text-slate-900 text-sm">{renewReq.driverDetails.fullName}</span>
                <span className="text-slate-500 block">NIC: {renewReq.driverDetails.nicNumber || "—"}</span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Select New Duration
                </label>
                <div className="flex flex-wrap gap-2">
                  {["1 Month", "3 Months", "6 Months", "12 Months", "Custom"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleRenewDurationTypeChange(type)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        renewDurationType === type
                          ? "bg-sky-600 text-white border-sky-600"
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={renewStartDate}
                    onChange={(e) => setRenewStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">End Date</label>
                  <input
                    type="date"
                    value={renewEndDate}
                    onChange={(e) => setRenewEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Renewal Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Contract extension"
                  value={renewNote}
                  onChange={(e) => setRenewNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              {renewErr && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                  {renewErr}
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setRenewReq(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitRenewPermanent}
                disabled={renewing}
                className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs cursor-pointer border-none disabled:opacity-50"
              >
                {renewing ? "Renewing..." : "Confirm Renewal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* NFC ASSIGN DRIVER MODAL (+ POLICYHOLDER OTP) */}
      {/* ========================================================================= */}
      {assignModalOpen && selectedCardForAssign && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  NFC
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Assign Driver to Card {selectedCardForAssign.cardId}
                  </h3>
                  <span className="text-[11px] text-slate-400">Instant Temporary Activation via OTP</span>
                </div>
              </div>
              <button
                onClick={() => setAssignModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer border-none bg-transparent"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
              </button>
            </div>

            {/* OTP Security Notice */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-start gap-2.5 mb-4">
              <HugeiconsIcon icon={Shield01Icon} className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Policyholder Verified Authorization:</span>
                <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                  To authorize this temporary driver, an OTP is sent to <strong>YOUR verified policyholder phone</strong> ({currentUser?.mobile}). Once verified, the driver pass is active immediately without branch review.
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* Select Physical NFC Card */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-800 mb-1">
                  Select NFC Card <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedCardForAssign.cardId}
                    onChange={(e) => {
                      const found = nfcCards.find((c) => c.cardId === e.target.value);
                      if (found) setSelectedCardForAssign(found);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 shadow-xs cursor-pointer appearance-none"
                  >
                    {nfcCards
                      .filter((c) => c.status === "Available" || c.cardId === selectedCardForAssign.cardId)
                      .map((c) => (
                        <option key={c._id} value={c.cardId} className="text-slate-900 bg-white font-mono font-bold">
                          {c.cardId} {c.status === "Available" ? "• Available" : `• (${c.status})`}
                        </option>
                      ))}
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-xs">
                    ▼
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Choose which physical NFC card from your inventory to encode for this temporary driver.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-800 mb-1">
                    Driver Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ruwan Jayawardena"
                    value={assignDriverName}
                    onChange={(e) => setAssignDriverName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-emerald-500 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-800 mb-1">
                    Driver Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 0712345678"
                    value={assignDriverPhone}
                    onChange={(e) => setAssignDriverPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-emerald-500 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-800 mb-1">
                    NIC / ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 911234567V"
                    value={assignDriverNic}
                    onChange={(e) => setAssignDriverNic(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-emerald-500 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-800 mb-1">
                    Residential Address
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Matara, Sri Lanka"
                    value={assignDriverAddress}
                    onChange={(e) => setAssignDriverAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-emerald-500 shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-800 mb-1">
                  Covered Vehicle <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={assignPlate}
                    onChange={(e) => setAssignPlate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 shadow-xs cursor-pointer appearance-none"
                  >
                    {eligibleVehicles.map((v) => (
                      <option key={v._id} value={v.numberPlate} className="text-slate-900 bg-white font-medium">
                        {v.numberPlate} — {v.company} {v.model} ({v.policyNumber})
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-xs">
                    ▼
                  </div>
                </div>
              </div>

              {/* Assignment Duration */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                  Temporary Duration
                </label>
                <div className="flex flex-wrap gap-2">
                  {["1 Day", "2 Days", "7 Days", "10 Days", "Custom"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleNfcDurationPresetChange(type)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        assignDurationPreset === type
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                {assignDurationPreset === "Custom" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-800 mb-1">
                        Start Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        value={assignStartDate}
                        onChange={(e) => setAssignStartDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 shadow-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-800 mb-1">
                        End Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        value={assignEndDate}
                        onChange={(e) => setAssignEndDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 shadow-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Policyholder OTP Section */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 block">Policyholder Authorization OTP</span>
                    <span className="text-[11px] text-slate-500">Sent to {currentUser?.mobile || "your phone"}</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendAssignmentOtp}
                    disabled={otpSending}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer border-none disabled:opacity-50"
                  >
                    {otpSending ? "Sending OTP..." : otpSent ? "Resend OTP" : "Send OTP"}
                  </button>
                </div>

                {otpSent && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Enter 6-Digit OTP Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="e.g. 123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-center font-mono text-lg tracking-widest font-extrabold bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 shadow-xs"
                    />
                  </div>
                )}
              </div>

              {assignError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
                  {assignError}
                </div>
              )}
              {assignSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold">
                  {assignSuccess}
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAssignDriver}
                disabled={assignSubmitting || !otpSent || otpCode.length !== 6}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer border-none disabled:opacity-50 shadow-xs"
              >
                {assignSubmitting ? "Activating..." : "Verify & Activate Driver"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* NFC CARD HISTORY & ACCESS LOGS MODAL */}
      {/* ========================================================================= */}
      {historyCard && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={CreditCardIcon} className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Card History — {historyCard.cardId}
                </h3>
              </div>
              <button
                onClick={() => setHistoryCard(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer border-none bg-transparent"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 text-xs">
              <div>
                <span className="font-bold text-slate-700 block mb-2 uppercase text-[11px] tracking-wider">
                  Past Driver Assignments (Isolated Claims History)
                </span>
                {(!historyCard.assignmentHistory || historyCard.assignmentHistory.length === 0) ? (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-400">
                    No past assignments recorded for this physical card yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {historyCard.assignmentHistory.map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-800">{item.driverDetails.fullName}</span>
                          <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded-full font-semibold">
                            {item.durationType}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Plate: <strong className="font-mono">{item.vehiclePlate}</strong> • Tel: {item.driverDetails.phoneNumber}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(item.startDate).toLocaleDateString("en-GB")} to {new Date(item.endDate).toLocaleDateString("en-GB")} • {item.completionReason}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-2 uppercase text-[11px] tracking-wider">
                  Access & Audit Logs
                </span>
                {(!historyCard.accessLogs || historyCard.accessLogs.length === 0) ? (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-400 text-center text-[11px]">
                    No security access logs found.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {historyCard.accessLogs.slice(-6).map((log, i) => (
                      <div key={i} className="text-[11px] p-2 bg-slate-50 rounded-lg border border-slate-100 flex justify-between">
                        <span className="font-medium text-slate-700">{log.action}: {log.driverName || log.reason || "System"}</span>
                        <span className="text-slate-400 font-mono text-[10px]">{new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={() => setHistoryCard(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer border-none"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TERMINATE DRIVER MODAL */}
      {/* ========================================================================= */}
      {terminateReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[28px] shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 my-8">
            <div className="p-6 bg-gradient-to-r from-rose-600 to-rose-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <HugeiconsIcon icon={Cancel01Icon} className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Terminate Driver Authorization</h3>
                  <p className="text-xs text-rose-100">Permanent Revocation of Digital Pass & App Access</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTerminateReq(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors border-none bg-transparent cursor-pointer"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                  <HugeiconsIcon icon={UserCheck01Icon} className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-800 text-sm">{terminateReq.driverDetails?.fullName}</div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    NIC: {terminateReq.driverDetails?.nicNumber || "—"} • Tel: {terminateReq.driverDetails?.phoneNumber}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-1 flex flex-wrap gap-1">
                    <span className="font-semibold text-slate-400">Covered:</span>
                    {terminateReq.selectedVehicles?.map((v, i) => (
                      <span key={i} className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        {v.numberPlate}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
                <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Immediate Access Revocation:</span>
                  <p className="mt-0.5 text-amber-800 text-[11px] leading-relaxed">
                    Terminating this driver will immediately revoke their digital driver pass, mobile app session, and coverage rights for your vehicle(s).
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Select Reason for Termination
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    "Driver resigned / employment ended",
                    "Vehicle sold or transferred",
                    "Driver misconduct / policy breach",
                    "Owner revocation / no longer permitted",
                    "Temporary contract concluded",
                    "Other reason"
                  ].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setTerminateReason(r)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer ${
                        terminateReason === r
                          ? "bg-rose-50 border-rose-400 text-rose-900 font-bold shadow-xs"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {terminateReason === "Other reason" && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Please Specify Reason <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Provide details about why this authorization is being terminated..."
                    className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              )}

              {termErr && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
                  <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4 shrink-0" />
                  <span>{termErr}</span>
                </div>
              )}
              {termMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4 shrink-0" />
                  <span>{termMsg}</span>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setTerminateReq(null)}
                disabled={terminating}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer bg-white"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmitTermination}
                disabled={terminating || !!termMsg}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer border-none"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />
                <span>{terminating ? "Revoking..." : "Confirm Termination"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. REGISTER THIRD-PARTY DRIVER: 3-CHOICE MODAL */}
      {/* ========================================================================= */}
      {registerChoiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 relative">
            <button
              onClick={() => setRegisterChoiceModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-3">
                <HugeiconsIcon icon={UserAdd01Icon} className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Register Third-Party Driver
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Select the driver authorization type to proceed with your registration
              </p>
            </div>

            <div className="space-y-3.5">
              {/* Option A: Permanent Driver */}
              <div
                onClick={() => {
                  setRegisterChoiceModalOpen(false);
                  setActiveTab("permanent");
                  setShowPermanentForm(true);
                }}
                className="p-4 sm:p-5 rounded-2xl border-2 border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/30 transition-all cursor-pointer group flex items-start gap-4"
              >
                <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <HugeiconsIcon icon={UserCheck01Icon} className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-slate-900 text-sm group-hover:text-indigo-700 transition-colors">
                      Permanent Third-Party Driver
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      LKR 300 Fee
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Long-term authorization across your vehicles (1M to 12M). Upload KYC identity documents for branch review and digital pass issuance.
                  </p>
                </div>
              </div>

              {/* Option B: Optional Driver (Reusable NFC Tag) */}
              <div
                onClick={() => {
                  setRegisterChoiceModalOpen(false);
                  const availableCards = nfcCards.filter((c) => c.status === "Available");
                  if (availableCards.length === 0) {
                    setNoCardsAlertModalOpen(true);
                  } else {
                    handleOpenAssignModal(availableCards[0]);
                  }
                }}
                className="p-4 sm:p-5 rounded-2xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all cursor-pointer group flex items-start gap-4"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <HugeiconsIcon icon={CreditCardIcon} className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                      Optional Driver (NFC Card)
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Instant • No Review
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Assign a temporary driver (1 to 10 days) to an available physical NFC card. Verified via Policyholder SMS OTP for instant activation.
                  </p>
                </div>
              </div>

              {/* Option C: Order NFC Cards */}
              <div
                onClick={() => {
                  setRegisterChoiceModalOpen(false);
                  setOrderNfcModalOpen(true);
                }}
                className="p-4 sm:p-5 rounded-2xl border-2 border-slate-200 hover:border-amber-500 hover:bg-amber-50/30 transition-all cursor-pointer group flex items-start gap-4"
              >
                <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <HugeiconsIcon icon={CreditCardIcon} className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-slate-900 text-sm group-hover:text-amber-700 transition-colors">
                      Order Physical NFC Cards
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      LKR 500 / Card
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Purchase reusable physical NFC cards encoded by branch staff. Reusable unlimited times for on-demand driver assignment.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. NO AVAILABLE CARDS ALERT MODAL */}
      {/* ========================================================================= */}
      {noCardsAlertModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <HugeiconsIcon icon={Alert02Icon} className="w-8 h-8" strokeWidth={2} />
            </div>

            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              No Available NFC Cards
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              You must have at least one physical NFC card in <strong>"Available"</strong> status to assign an optional temporary driver. Your inventory currently has <strong>0 available cards</strong>.
            </p>

            <div className="mt-6 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setNoCardsAlertModalOpen(false);
                  setOrderNfcModalOpen(true);
                }}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer border-none flex items-center justify-center gap-2"
              >
                <HugeiconsIcon icon={CreditCardIcon} className="w-4 h-4" />
                <span>Order Physical NFC Cards (LKR 500)</span>
              </button>

              <button
                type="button"
                onClick={() => setNoCardsAlertModalOpen(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer border-none"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ORDER PHYSICAL NFC CARDS POPUP MODAL */}
      {/* ========================================================================= */}
      {orderNfcModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  <HugeiconsIcon icon={CreditCardIcon} className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Order Physical NFC Cards</h3>
                  <p className="text-[11px] text-slate-500">Fixed Price: LKR 500 per card</p>
                </div>
              </div>
              <button
                onClick={() => setOrderNfcModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Select Quantity:</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setNfcQuantity((prev) => Math.max(1, prev - 1))}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-6 text-center font-black text-base text-slate-900">{nfcQuantity}</span>
                  <button
                    type="button"
                    onClick={() => setNfcQuantity((prev) => Math.min(10, prev + 1))}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="flex justify-between font-bold">
                  <span>Total Payment:</span>
                  <span className="text-base font-black text-amber-950 font-mono">
                    LKR {(nfcQuantity * 500).toLocaleString()}.00
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 leading-tight">
                  Cards will be prepared and encoded by <strong>{userBranch} Branch</strong> staff and made ready for collection.
                </p>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setOrderNfcModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer bg-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleOrderNfcCards}
                  disabled={orderingNfc}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none"
                >
                  <HugeiconsIcon icon={CreditCardIcon} className="w-4 h-4" />
                  <span>{orderingNfc ? "Connecting..." : "Pay via Stripe"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Document Preview Modal */}
      {previewDocModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-sm">{previewDocModal.title}</h3>
              <button
                type="button"
                onClick={() => setPreviewDocModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer border-none bg-transparent"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto flex items-center justify-center bg-slate-100 rounded-2xl p-2">
              <img src={previewDocModal.url} alt={previewDocModal.title} className="max-w-full max-h-[70vh] object-contain rounded-xl" />
            </div>
          </div>
        </div>
      )}

      <PolicyHolderFooter />
    </div>
  );
}
