import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Dimensions
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import { API_BASE_URL } from "../_config";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export interface NfcCardItem {
  _id: string;
  cardId: string;
  policyHolderNic: string;
  branch: string;
  status: "Available" | "Scheduled" | "Active" | "Temporarily Blocked" | "Expired" | "Revoked" | "Disabled";
  currentAssignment?: {
    assignmentId?: string;
    driverName?: string;
    driverPhone?: string;
    driverNic?: string;
    driverAddress?: string;
    vehiclePlate?: string;
    vehicleType?: string;
    vehicleModel?: string;
    startDate?: string;
    endDate?: string;
    durationType?: string;
    status?: string;
    isBlocked?: boolean;
    accessUrl?: string;
    assignedAt?: string;
  };
  assignmentHistory?: Array<{
    assignmentId: string;
    driverName: string;
    driverPhone?: string;
    vehiclePlate: string;
    startDate: string;
    endDate: string;
    status: string;
    assignedAt: string;
    endedAt?: string;
    endReason?: string;
  }>;
}

export interface NfcOrderItem {
  _id: string;
  orderNumber: string;
  quantity: number;
  totalAmount: number;
  branch: string;
  status:
    | "Request Submitted"
    | "Approved"
    | "Processing"
    | "Ready for Collection"
    | "Collected"
    | "Rejected"
    | "Pending Payment";
  rejectionReason?: string;
  payment?: {
    status: string;
    amountPaid?: number;
    paidAt?: string;
  };
  collectionInfo?: {
    collectedAt?: string;
    collectedBy?: string;
  };
  createdAt: string;
}

interface ThirdPartyNfcSectionProps {
  userInfo: any;
  vehicles: any[];
  onOpenPermanentRegistration: (plate?: string) => void;
  showCustomAlert: (title: string, message: string, type?: "success" | "warning" | "info") => void;
  // Permanent requests & actions passed from parent
  permanentRequests: any[];
  loadingPermanent: boolean;
  onRefreshPermanent: () => void;
  onOpenTerminateModal: (req: any) => void;
  onResumePayment: (id: string, ref: string) => void;
  resumingPaymentId: string | null;
}

export default function ThirdPartyNfcSection({
  userInfo,
  vehicles,
  onOpenPermanentRegistration,
  showCustomAlert,
  permanentRequests,
  loadingPermanent,
  onRefreshPermanent,
  onOpenTerminateModal,
  onResumePayment,
  resumingPaymentId
}: ThirdPartyNfcSectionProps) {
  // Sub-tabs: "permanent" | "optional_cards" | "orders_tracking"
  const [subTab, setSubTab] = useState<"permanent" | "optional_cards" | "orders_tracking">("permanent");

  // Register New Driver Choice Modal
  const [showChoiceModal, setShowChoiceModal] = useState(false);

  // Cards State
  const [cards, setCards] = useState<NfcCardItem[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [cardFilter, setCardFilter] = useState<"all" | "Available" | "Active" | "Blocked" | "Expired">("all");

  // Orders State
  const [orders, setOrders] = useState<NfcOrderItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Order NFC Cards Modal
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [orderingLoading, setOrderingLoading] = useState(false);

  // Assign Driver Modal States
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedCardForAssign, setSelectedCardForAssign] = useState<NfcCardItem | null>(null);
  const [assignPlate, setAssignPlate] = useState(vehicles[0]?.numberPlate || "");
  const [assignDriverName, setAssignDriverName] = useState("");
  const [assignDriverPhone, setAssignDriverPhone] = useState("");
  const [assignDriverNic, setAssignDriverNic] = useState("");
  const [assignDriverAddress, setAssignDriverAddress] = useState("");
  const [assignDurationPreset, setAssignDurationPreset] = useState("7 Days");
  const [assignStartDate, setAssignStartDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [assignEndDate, setAssignEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 16);
  });
  const [customDays, setCustomDays] = useState("3");

  // Policyholder OTP Verification States
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [assigningLoading, setAssigningLoading] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Card History Modal
  const [selectedHistoryCard, setSelectedHistoryCard] = useState<NfcCardItem | null>(null);

  // Permanent Driver View More Modal & Edit States
  const [selectedDriverForViewMore, setSelectedDriverForViewMore] = useState<any | null>(null);
  const [isEditingPermanentDriver, setIsEditingPermanentDriver] = useState(false);
  const [editPermanentPhone, setEditPermanentPhone] = useState("");
  const [editPermanentAddress, setEditPermanentAddress] = useState("");
  const [savingPermanentEdit, setSavingPermanentEdit] = useState(false);
  const [blockingPermanentLoading, setBlockingPermanentLoading] = useState(false);

  // Optional NFC Card View More Modal
  const [selectedCardForViewMore, setSelectedCardForViewMore] = useState<NfcCardItem | null>(null);

  // Stable refs to prevent unnecessary re-fetches and re-renders
  const cardsRef = useRef(cards);
  cardsRef.current = cards;

  const ordersRef = useRef(orders);
  ordersRef.current = orders;

  // 1. Fetch Cards
  const fetchCards = useCallback(
    async (silent = false) => {
      if (!userInfo?.nic) return;
      // Only show full loader if there are no cards currently displayed
      if (!silent && cardsRef.current.length === 0) {
        setLoadingCards(true);
      }
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/nfc-card/inventory?nic=${encodeURIComponent(userInfo.nic)}&_=${Date.now()}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.cards) {
            setCards((prev) => {
              if (JSON.stringify(prev) === JSON.stringify(data.cards)) return prev;
              return data.cards;
            });
          }
        }
      } catch (e) {
        console.warn("fetchCards error:", e);
      } finally {
        setLoadingCards(false);
      }
    },
    [userInfo?.nic]
  );

  // 2. Fetch Orders
  const fetchOrders = useCallback(
    async (silent = false) => {
      if (!userInfo?.nic) return;
      if (!silent && ordersRef.current.length === 0) {
        setLoadingOrders(true);
      }
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/nfc-card/orders?nic=${encodeURIComponent(userInfo.nic)}&_=${Date.now()}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.orders) {
            setOrders((prev) => {
              if (JSON.stringify(prev) === JSON.stringify(data.orders)) return prev;
              return data.orders;
            });
          }
        }
      } catch (e) {
        console.warn("fetchOrders error:", e);
      } finally {
        setLoadingOrders(false);
      }
    },
    [userInfo?.nic]
  );

  // Initial load when user info is ready
  useEffect(() => {
    if (userInfo?.nic) {
      fetchCards(cardsRef.current.length > 0);
      fetchOrders(ordersRef.current.length > 0);
    }
  }, [userInfo?.nic, fetchCards, fetchOrders]);

  // Silently refresh when user explicitly switches to NFC Cards or Orders tab
  useEffect(() => {
    if (subTab === "optional_cards") {
      fetchCards(true);
    } else if (subTab === "orders_tracking") {
      fetchOrders(true);
    }
  }, [subTab, fetchCards, fetchOrders]);

  // Duration Preset Change Helper
  const handleDurationChange = (preset: string) => {
    setAssignDurationPreset(preset);
    const start = new Date();
    setAssignStartDate(start.toISOString().slice(0, 16));
    let days = 7;
    if (preset === "1 Day") days = 1;
    else if (preset === "2 Days") days = 2;
    else if (preset === "7 Days") days = 7;
    else if (preset === "10 Days") days = 10;
    else if (preset === "Custom") days = parseInt(customDays, 10) || 3;

    const end = new Date();
    end.setDate(end.getDate() + days);
    setAssignEndDate(end.toISOString().slice(0, 16));
  };

  // Open Assign Modal for a Card
  const handleOpenAssignModal = (card: NfcCardItem) => {
    setSelectedCardForAssign(card);
    setAssignDriverName("");
    setAssignDriverPhone("");
    setAssignDriverNic("");
    setAssignDriverAddress("");
    setAssignPlate(vehicles[0]?.numberPlate || "");
    setAssignDurationPreset("7 Days");
    handleDurationChange("7 Days");
    setOtpSent(false);
    setOtpCode("");
    setAssignError(null);
    setShowAssignModal(true);
  };

  // Send Policyholder Assignment OTP
  const handleSendAssignmentOtp = async () => {
    setAssignError(null);
    if (!selectedCardForAssign) return;
    if (!assignDriverName.trim() || !assignDriverPhone.trim()) {
      setAssignError("Driver full name and driver mobile number are required.");
      return;
    }
    if (!assignPlate) {
      setAssignError("Please select an authorized vehicle for this assignment.");
      return;
    }

    setSendingOtp(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/nfc-card/request-assignment-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: selectedCardForAssign.cardId,
          policyHolderNic: userInfo.nic
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to dispatch verification OTP.");
      }

      setOtpSent(true);
      showCustomAlert(
        "OTP Sent",
        `A 6-digit authorization code was sent to your registered mobile phone (${data.phoneMasked || "registered phone"}).`,
        "success"
      );
    } catch (err: any) {
      setAssignError(err.message || "Failed to send OTP.");
    } finally {
      setSendingOtp(false);
    }
  };

  // Confirm Assignment & Activate
  const handleConfirmAssignDriver = async () => {
    if (!selectedCardForAssign) return;
    if (!otpCode || otpCode.trim().length !== 6) {
      setAssignError("Please enter the 6-digit OTP code received on your phone.");
      return;
    }

    setAssigningLoading(true);
    setAssignError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/nfc-card/assign-driver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: selectedCardForAssign.cardId,
          policyHolderNic: userInfo.nic,
          otp: otpCode.trim(),
          driverName: assignDriverName.trim(),
          driverPhone: assignDriverPhone.trim(),
          driverNic: assignDriverNic.trim().toUpperCase(),
          driverAddress: assignDriverAddress.trim(),
          vehiclePlate: assignPlate,
          startDate: assignStartDate,
          endDate: assignEndDate,
          durationType: assignDurationPreset
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Driver assignment verification failed.");
      }

      showCustomAlert(
        "Driver Assigned Successfully!",
        `Temporary driver ${assignDriverName} is now authorized and activated on Card ${selectedCardForAssign.cardId}. No branch review required.`,
        "success"
      );
      setShowAssignModal(false);
      setSelectedCardForAssign(null);
      fetchCards(true);
    } catch (err: any) {
      setAssignError(err.message || "Failed to assign driver.");
    } finally {
      setAssigningLoading(false);
    }
  };

  // Block / Unblock / Terminate Card Assignment
  const handleBlockCard = async (cardId: string) => {
    Alert.alert(
      "Temporary Block",
      "Do you want to temporarily suspend driver access for this NFC card? Duration timer will continue to run.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block Access",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetch(`${API_BASE_URL}/api/nfc-card/block-assignment/${cardId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ policyHolderNic: userInfo.nic, reason: "Blocked via mobile app" })
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || "Failed to block card");
              showCustomAlert("Card Blocked", "Driver access has been temporarily suspended.", "warning");
              fetchCards(true);
            } catch (e: any) {
              Alert.alert("Error", e.message || "Failed to block card.");
            }
          }
        }
      ]
    );
  };

  const handleUnblockCard = async (cardId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/nfc-card/unblock-assignment/${cardId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyHolderNic: userInfo.nic })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to unblock card");
      showCustomAlert("Card Unblocked", "Driver access restored successfully.", "success");
      fetchCards(true);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to unblock card.");
    }
  };

  const handleTerminateCard = async (cardId: string) => {
    Alert.alert(
      "Terminate Assignment",
      "Are you sure you want to terminate this temporary driver assignment? The card will return to Available inventory for reassignment.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Terminate",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetch(`${API_BASE_URL}/api/nfc-card/terminate-assignment/${cardId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ policyHolderNic: userInfo.nic, reason: "Terminated via mobile app" })
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || "Failed to terminate assignment");
              showCustomAlert("Terminated", "Assignment ended. Physical card is now Available for reuse.", "success");
              fetchCards(true);
            } catch (e: any) {
              Alert.alert("Error", e.message || "Failed to terminate assignment.");
            }
          }
        }
      ]
    );
  };

  // Order NFC Cards via Stripe
  const handleOrderCardsStripe = async () => {
    setOrderingLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/nfc-card/checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policyHolderNic: userInfo.nic,
          quantity: orderQuantity,
          reason: "Temporary driver NFC authorization"
        })
      });

      const data = await res.json();
      if (!res.ok || !data.checkoutUrl) {
        throw new Error(data.error || "Failed to initiate card checkout session.");
      }

      setShowOrderModal(false);
      await WebBrowser.openBrowserAsync(data.checkoutUrl);
      fetchOrders(true);
    } catch (err: any) {
      Alert.alert("Order Error", err.message || "Failed to place card purchase order.");
    } finally {
      setOrderingLoading(false);
    }
  };

  // ── Permanent Driver View More & Management Handlers ──
  const handleOpenPermanentDriverViewMore = (req: any) => {
    setSelectedDriverForViewMore(req);
    setIsEditingPermanentDriver(false);
    setEditPermanentPhone(req.driverDetails?.phoneNumber || "");
    setEditPermanentAddress(req.driverDetails?.residentialAddress || "");
  };

  const handleBlockPermanentDriver = async (req: any) => {
    Alert.alert(
      "Temporarily Block Driver",
      `Are you sure you want to temporarily suspend driver access for ${req.driverDetails?.fullName || "this driver"}? Digital authorization will be paused.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block Access",
          style: "destructive",
          onPress: async () => {
            setBlockingPermanentLoading(true);
            try {
              const res = await fetch(`${API_BASE_URL}/api/third-party/permanent/block/${req._id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  policyHolderNic: userInfo.nic,
                  reason: "Temporarily blocked by policyholder via mobile app"
                })
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || "Failed to block driver.");
              showCustomAlert("Driver Blocked", data.message || "Driver access has been temporarily suspended.", "warning");
              setSelectedDriverForViewMore((prev: any) => (prev ? { ...prev, status: "Temporarily Blocked" } : null));
              if (onRefreshPermanent) onRefreshPermanent();
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to block driver.");
            } finally {
              setBlockingPermanentLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleUnblockPermanentDriver = async (req: any) => {
    setBlockingPermanentLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/third-party/permanent/unblock/${req._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyHolderNic: userInfo.nic })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to unblock driver.");
      showCustomAlert("Driver Restored", data.message || "Driver access restored to active status.", "success");
      setSelectedDriverForViewMore((prev: any) => (prev ? { ...prev, status: "Approved" } : null));
      if (onRefreshPermanent) onRefreshPermanent();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to unblock driver.");
    } finally {
      setBlockingPermanentLoading(false);
    }
  };

  const handleSavePermanentDriverEdit = async () => {
    if (!selectedDriverForViewMore) return;
    if (!editPermanentPhone.trim()) {
      Alert.alert("Validation Error", "Please provide a valid driver phone number.");
      return;
    }
    setSavingPermanentEdit(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/third-party/permanent/update-driver/${selectedDriverForViewMore._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policyHolderNic: userInfo.nic,
          phoneNumber: editPermanentPhone.trim(),
          residentialAddress: editPermanentAddress.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update driver details.");
      showCustomAlert("Details Updated", "Driver phone number and address saved successfully.", "success");
      setSelectedDriverForViewMore(data.request);
      setIsEditingPermanentDriver(false);
      if (onRefreshPermanent) onRefreshPermanent();
    } catch (err: any) {
      Alert.alert("Update Error", err.message || "Failed to update driver details.");
    } finally {
      setSavingPermanentEdit(false);
    }
  };

  // ── NFC Card View More Handler ──
  const handleOpenNfcCardViewMore = (card: NfcCardItem) => {
    setSelectedCardForViewMore(card);
  };

  // Filtered Cards
  const availableCards = cards.filter((c) => c.status === "Available");
  const filteredCards = cards.filter((c) => {
    if (cardFilter === "all") return true;
    if (cardFilter === "Available") return c.status === "Available";
    if (cardFilter === "Active") return c.status === "Active" || c.status === "Scheduled";
    if (cardFilter === "Blocked") return c.status === "Temporarily Blocked";
    if (cardFilter === "Expired") return c.status === "Expired" || c.status === "Revoked";
    return true;
  });

  return (
    <View style={styles.container}>
      {/* ── HEADER BANNER ── */}
      <LinearGradient
        colors={["#102A43", "#163e63", "#312e81"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroBanner}
      >
        <View style={styles.heroBadge}>
          <MaterialCommunityIcons name="shield-star" size={13} color="#38bdf8" />
          <Text style={styles.heroBadgeText}>Authorized Drivers Management</Text>
        </View>
        <Text style={styles.heroTitle}>Third-Party Driver Hub</Text>
        <Text style={styles.heroDesc}>
          Manage permanent authorized drivers with branch sign-off, or assign on-demand temporary drivers via reusable physical NFC cards.
        </Text>

        <TouchableOpacity
          style={styles.registerHeroBtn}
          onPress={() => setShowChoiceModal(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="person-add" size={15} color="#0f172a" />
          <Text style={styles.registerHeroBtnText}>+ Register New Driver</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* ── SUB-TABS SELECTOR (REDESIGNED SEGMENTED ROW) ── */}
      <View style={styles.modernSubTabRow}>
        <TouchableOpacity
          style={[styles.modernSubTabBtn, subTab === "permanent" && styles.modernSubTabBtnActive]}
          onPress={() => setSubTab("permanent")}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="badge-account-outline"
            size={15}
            color={subTab === "permanent" ? "#ffffff" : "#475569"}
          />
          <Text style={[styles.modernSubTabBtnText, subTab === "permanent" && styles.modernSubTabBtnTextActive]}>
            Permanent
          </Text>
          <View style={[styles.modernSubTabBadge, subTab === "permanent" && styles.modernSubTabBadgeActive]}>
            <Text style={[styles.modernSubTabBadgeText, subTab === "permanent" && styles.modernSubTabBadgeTextActive]}>
              {permanentRequests.length}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modernSubTabBtn, subTab === "optional_cards" && styles.modernSubTabBtnActive]}
          onPress={() => setSubTab("optional_cards")}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="credit-card-wireless-outline"
            size={15}
            color={subTab === "optional_cards" ? "#ffffff" : "#475569"}
          />
          <Text style={[styles.modernSubTabBtnText, subTab === "optional_cards" && styles.modernSubTabBtnTextActive]}>
            NFC Cards
          </Text>
          <View style={[styles.modernSubTabBadge, subTab === "optional_cards" && styles.modernSubTabBadgeActive]}>
            <Text style={[styles.modernSubTabBadgeText, subTab === "optional_cards" && styles.modernSubTabBadgeTextActive]}>
              {cards.length}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modernSubTabBtn, subTab === "orders_tracking" && styles.modernSubTabBtnActive]}
          onPress={() => setSubTab("orders_tracking")}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="clock-check-outline"
            size={15}
            color={subTab === "orders_tracking" ? "#ffffff" : "#475569"}
          />
          <Text style={[styles.modernSubTabBtnText, subTab === "orders_tracking" && styles.modernSubTabBtnTextActive]}>
            Orders
          </Text>
          <View style={[styles.modernSubTabBadge, subTab === "orders_tracking" && styles.modernSubTabBadgeActive]}>
            <Text style={[styles.modernSubTabBadgeText, subTab === "orders_tracking" && styles.modernSubTabBadgeTextActive]}>
              {orders.length}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* SUB-TAB 1: PERMANENT DRIVERS LIST */}
      {/* ═════════════════════════════════════════════════════════════ */}
      {subTab === "permanent" && (
        <View style={styles.tabContent}>
          {loadingPermanent && permanentRequests.length === 0 ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="large" color="#0284c7" />
              <Text style={styles.loaderText}>Loading permanent drivers...</Text>
            </View>
          ) : permanentRequests.length === 0 ? (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="account-clock-outline" size={38} color="#6366f1" />
              <Text style={styles.emptyTitle}>No Permanent Drivers Registered</Text>
              <Text style={styles.emptyDesc}>
                Register authorized drivers who regularly operate your insured vehicles. Covered under your policy with a single fixed fee of LKR 300.
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => onOpenPermanentRegistration()}
                activeOpacity={0.85}
              >
                <Ionicons name="person-add-outline" size={15} color="#ffffff" />
                <Text style={styles.emptyBtnText}>Register Permanent Driver (LKR 300)</Text>
              </TouchableOpacity>
            </View>
          ) : (
            permanentRequests.map((req: any) => {
              const isApproved = req.status === "Approved";
              const isBlocked = req.status === "Temporarily Blocked";
              const isRejected = req.status === "Rejected";
              const isPendingPayment = req.status === "Pending Payment";
              const isPendingApproval = req.status === "Pending Branch Approval";
              const isTerminated = req.status === "Terminated";
              const isActive = isApproved;

              return (
                <View key={req._id} style={styles.requestCard}>
                  {/* Header: Ref and Active / Inactive Status Pill */}
                  <View style={styles.cardHeader}>
                    <View style={styles.refBox}>
                      <Text style={styles.refText}>{req.requestReference || "REF"}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        isActive
                          ? { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }
                          : isBlocked
                          ? { backgroundColor: "#fffbeb", borderColor: "#fde68a" }
                          : isRejected
                          ? { backgroundColor: "#fef2f2", borderColor: "#fecaca" }
                          : isPendingPayment
                          ? { backgroundColor: "#fffbeb", borderColor: "#fde68a" }
                          : isTerminated
                          ? { backgroundColor: "#f1f5f9", borderColor: "#cbd5e1" }
                          : { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }
                      ]}
                    >
                      <View
                        style={[
                          styles.dotIndicator,
                          isActive
                            ? { backgroundColor: "#16a34a" }
                            : isBlocked
                            ? { backgroundColor: "#f59e0b" }
                            : isRejected
                            ? { backgroundColor: "#ef4444" }
                            : isPendingPayment
                            ? { backgroundColor: "#d97706" }
                            : isTerminated
                            ? { backgroundColor: "#64748b" }
                            : { backgroundColor: "#2563eb" }
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          isActive
                            ? { color: "#16a34a" }
                            : isBlocked
                            ? { color: "#b45309" }
                            : isRejected
                            ? { color: "#dc2626" }
                            : isPendingPayment
                            ? { color: "#d97706" }
                            : isTerminated
                            ? { color: "#475569" }
                            : { color: "#1d4ed8" }
                        ]}
                      >
                        {isActive
                          ? "Active"
                          : isBlocked
                          ? "Temporarily Blocked"
                          : isPendingApproval
                          ? "Pending Approval"
                          : req.status}
                      </Text>
                    </View>
                  </View>

                  {/* Driver Info Row */}
                  <View style={styles.driverRow}>
                    <View style={styles.driverAvatar}>
                      <MaterialCommunityIcons name="account" size={24} color="#4f46e5" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.driverName}>{req.driverDetails?.fullName || "Authorized Driver"}</Text>
                      <Text style={styles.driverSub}>NIC: {req.driverDetails?.nicNumber || "—"}</Text>
                      <Text style={styles.driverSub}>Tel: {req.driverDetails?.phoneNumber || "—"}</Text>
                    </View>
                  </View>

                  {/* Covered Vehicles */}
                  <View style={styles.vehiclesCoveredRow}>
                    <Text style={styles.secLabel}>Covered Vehicles:</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                      {(req.selectedVehicles || []).map((v: any) => (
                        <View key={v.numberPlate} style={styles.plateBadge}>
                          <Text style={styles.plateText}>{v.numberPlate}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Duration */}
                  {req.accessDuration && (
                    <View style={styles.durationRow}>
                      <Ionicons name="calendar-outline" size={13} color="#64748b" />
                      <Text style={styles.durationText}>
                        Duration: {req.accessDuration.durationType || "12 Months"} (Valid until{" "}
                        {new Date(req.accessDuration.endDate).toLocaleDateString("en-LK")})
                      </Text>
                    </View>
                  )}

                  {/* Card Actions: View More & Pay Now */}
                  <View style={styles.cardFooterRow}>
                    <TouchableOpacity
                      style={styles.viewMoreBtn}
                      onPress={() => handleOpenPermanentDriverViewMore(req)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="eye-outline" size={15} color="#0f172a" />
                      <Text style={styles.viewMoreBtnText}>View More</Text>
                    </TouchableOpacity>

                    {isPendingPayment && (
                      <TouchableOpacity
                        style={styles.payNowBtn}
                        onPress={() => onResumePayment(req._id, req.requestReference)}
                        activeOpacity={0.85}
                      >
                        <MaterialCommunityIcons name="credit-card-outline" size={14} color="#ffffff" />
                        <Text style={styles.payNowBtnText}>Pay LKR 300</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* SUB-TAB 2: OPTIONAL NFC CARDS */}
      {/* ═════════════════════════════════════════════════════════════ */}
      {subTab === "optional_cards" && (
        <View style={styles.tabContent}>
          {/* Card Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {(["all", "Available", "Active", "Blocked", "Expired"] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterPill, cardFilter === f && styles.filterPillActive]}
                onPress={() => setCardFilter(f)}
              >
                <Text style={[styles.filterPillText, cardFilter === f && styles.filterPillTextActive]}>
                  {f === "all" ? `All Cards (${cards.length})` : f}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loadingCards && cards.length === 0 ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="large" color="#0284c7" />
              <Text style={styles.loaderText}>Loading NFC cards inventory...</Text>
            </View>
          ) : filteredCards.length === 0 ? (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="credit-card-outline" size={38} color="#64748b" />
              <Text style={styles.emptyTitle}>No NFC Cards Matching Filter</Text>
              <Text style={styles.emptyDesc}>
                {cards.length === 0
                  ? "You have no physical NFC cards in your inventory yet. Order cards using the button below."
                  : "No cards match the selected filter."}
              </Text>
              {cards.length === 0 && (
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => setShowOrderModal(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="cart-outline" size={15} color="#ffffff" />
                  <Text style={styles.emptyBtnText}>Order NFC Cards (LKR 500 each)</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredCards.map((card) => {
              const isAvailable = card.status === "Available";
              const isBlocked = card.status === "Temporarily Blocked";
              const isActive = card.status === "Active" || card.status === "Scheduled";
              const asg = card.currentAssignment;

              return (
                <View key={card.cardId} style={styles.nfcCard}>
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={styles.nfcIconBadge}>
                        <MaterialCommunityIcons name="nfc" size={16} color="#059669" />
                      </View>
                      <Text style={styles.nfcCardIdText}>{card.cardId}</Text>
                    </View>

                    <View
                      style={[
                        styles.statusPill,
                        isAvailable
                          ? { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }
                          : isBlocked
                          ? { backgroundColor: "#fef3c7", borderColor: "#fde68a" }
                          : { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }
                      ]}
                    >
                      <View
                        style={[
                          styles.dotIndicator,
                          isAvailable
                            ? { backgroundColor: "#16a34a" }
                            : isBlocked
                            ? { backgroundColor: "#f59e0b" }
                            : { backgroundColor: "#2563eb" }
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          isAvailable
                            ? { color: "#16a34a" }
                            : isBlocked
                            ? { color: "#d97706" }
                            : { color: "#2563eb" }
                        ]}
                      >
                        {card.status}
                      </Text>
                    </View>
                  </View>

                  {/* Assignment details if not available */}
                  {!isAvailable && asg?.driverName ? (
                    <View style={styles.asgBox}>
                      <Text style={styles.secLabel}>Current Temporary Driver:</Text>
                      <Text style={styles.asgDriverName}>{asg.driverName}</Text>
                      <Text style={styles.asgDriverSub}>
                        Vehicle: <Text style={{ fontFamily: "monospace", fontWeight: "bold" }}>{asg.vehiclePlate}</Text>
                      </Text>
                      <Text style={styles.asgDriverSub}>
                        Duration: {asg.durationType || "Custom"} (Valid until{" "}
                        {asg.endDate ? new Date(asg.endDate).toLocaleDateString("en-LK") : "—"})
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.asgVacantBox}>
                      <MaterialCommunityIcons name="check-circle" size={16} color="#059669" />
                      <Text style={styles.asgVacantText}>Card Vacant & Ready for Driver Assignment</Text>
                    </View>
                  )}

                  {/* Actions: View More & Assign Driver */}
                  <View style={styles.cardFooterRow}>
                    <TouchableOpacity
                      style={styles.viewMoreBtn}
                      onPress={() => handleOpenNfcCardViewMore(card)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="eye-outline" size={15} color="#0f172a" />
                      <Text style={styles.viewMoreBtnText}>View More</Text>
                    </TouchableOpacity>

                    {isAvailable && (
                      <TouchableOpacity
                        style={styles.actionBtnPrimaryCompact}
                        onPress={() => handleOpenAssignModal(card)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="person-add" size={13} color="#ffffff" />
                        <Text style={styles.actionBtnPrimaryCompactText}>Assign Driver</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* SUB-TAB 3: CARD ORDERS & TRACKING */}
      {/* ═════════════════════════════════════════════════════════════ */}
      {subTab === "orders_tracking" && (
        <View style={styles.tabContent}>
          {loadingOrders && orders.length === 0 ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="large" color="#0284c7" />
              <Text style={styles.loaderText}>Loading card orders...</Text>
            </View>
          ) : orders.length === 0 ? (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="cart-outline" size={38} color="#64748b" />
              <Text style={styles.emptyTitle}>No NFC Card Orders Yet</Text>
              <Text style={styles.emptyDesc}>
                Order physical NFC cards to authorize temporary drivers on demand.
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => setShowOrderModal(true)}
              >
                <Text style={styles.emptyBtnText}>Order NFC Cards (LKR 500 each)</Text>
              </TouchableOpacity>
            </View>
          ) : (
            orders.map((o) => {
              const isReady = o.status === "Ready for Collection";
              const isRejected = o.status === "Rejected";
              const isPaid = o.payment?.status === "Paid";

              return (
                <View key={o._id} style={styles.orderCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.orderNum}>{o.orderNumber}</Text>
                    <View
                      style={[
                        styles.statusPill,
                        isReady
                          ? { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }
                          : isRejected
                          ? { backgroundColor: "#fef2f2", borderColor: "#fecaca" }
                          : { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }
                      ]}
                    >
                      <Text style={styles.statusText}>{o.status}</Text>
                    </View>
                  </View>

                  <Text style={styles.orderSub}>
                    Quantity: <Text style={{ fontWeight: "bold" }}>{o.quantity} Cards</Text> • Total:{" "}
                    <Text style={{ fontWeight: "bold" }}>LKR {o.totalAmount?.toLocaleString()}</Text> (
                    {isPaid ? "Paid" : "Pending Payment"})
                  </Text>
                  <Text style={styles.orderSub}>Assigned Branch: {o.branch}</Text>

                  {isReady && (
                    <View style={styles.readyAlert}>
                      <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                      <Text style={styles.readyAlertText}>
                        Your cards are prepared and ready for collection at the {o.branch} branch!
                      </Text>
                    </View>
                  )}

                  {isRejected && (
                    <View style={styles.rejectAlert}>
                      <Ionicons name="close-circle" size={16} color="#dc2626" />
                      <Text style={styles.rejectAlertText}>
                        Rejected: {o.rejectionReason || "Not approved by branch"}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      )}

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* 1. REGISTER NEW DRIVER: 3-OPTION CHOICE MODAL */}
      {/* ═════════════════════════════════════════════════════════════ */}
      <Modal visible={showChoiceModal} transparent animationType="fade" onRequestClose={() => setShowChoiceModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.choiceModalBox}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Register New Driver</Text>
              <TouchableOpacity onPress={() => setShowChoiceModal(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            <Text style={styles.choiceSubtitle}>Select the authorization workflow you need:</Text>

            {/* Option 1: Permanent Driver */}
            <TouchableOpacity
              style={styles.choiceCard}
              onPress={() => {
                setShowChoiceModal(false);
                onOpenPermanentRegistration();
              }}
            >
              <View style={[styles.choiceIconBadge, { backgroundColor: "#eff6ff" }]}>
                <MaterialCommunityIcons name="badge-account" size={24} color="#2563eb" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.choiceCardTitle}>Permanent Driver (KYC Review)</Text>
                <Text style={styles.choiceCardDesc}>
                  Long-term driver authorization with branch verification. Flat fee: LKR 300.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Option 2: Optional Driver (NFC) */}
            <TouchableOpacity
              style={styles.choiceCard}
              onPress={() => {
                setShowChoiceModal(false);
                if (availableCards.length === 0) {
                  Alert.alert(
                    "No Available Cards",
                    "You do not have any available physical NFC cards. You must order NFC cards first before assigning an optional driver.",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Order Cards", onPress: () => setShowOrderModal(true) }
                    ]
                  );
                } else {
                  handleOpenAssignModal(availableCards[0]);
                }
              }}
            >
              <View style={[styles.choiceIconBadge, { backgroundColor: "#f0fdf4" }]}>
                <MaterialCommunityIcons name="nfc" size={24} color="#059669" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.choiceCardTitle}>Optional Driver (Reusable NFC Tag)</Text>
                <Text style={styles.choiceCardDesc}>
                  Instant on-demand temporary authorization (1-10 days) verified with YOUR OTP. Available cards:{" "}
                  <Text style={{ fontWeight: "700" }}>{availableCards.length}</Text>.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Option 3: Order NFC Cards */}
            <TouchableOpacity
              style={styles.choiceCard}
              onPress={() => {
                setShowChoiceModal(false);
                setShowOrderModal(true);
              }}
            >
              <View style={[styles.choiceIconBadge, { backgroundColor: "#faf5ff" }]}>
                <MaterialCommunityIcons name="credit-card-plus" size={24} color="#9333ea" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.choiceCardTitle}>Order NFC Cards</Text>
                <Text style={styles.choiceCardDesc}>
                  Purchase physical reusable cards (LKR 500 each) via Stripe. Prepared & verified by your branch.
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* 2. ORDER NFC CARDS MODAL */}
      {/* ═════════════════════════════════════════════════════════════ */}
      <Modal visible={showOrderModal} transparent animationType="slide" onRequestClose={() => setShowOrderModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.orderModalBox}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Order Optional NFC Cards</Text>
              <TouchableOpacity onPress={() => setShowOrderModal(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.choiceSubtitle}>
              Physical NFC cards will be prepared, verified, and ready for pickup at your branch ({userInfo?.branch || "Galle"}).
            </Text>

            <View style={styles.qtyRow}>
              <Text style={styles.qtyLabel}>Quantity:</Text>
              <View style={styles.qtyControls}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => setOrderQuantity((q) => Math.max(1, q - 1))}
                >
                  <Text style={styles.qtyBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.qtyVal}>{orderQuantity}</Text>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => setOrderQuantity((q) => Math.min(10, q + 1))}
                >
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Total Price:</Text>
              <Text style={styles.priceVal}>LKR {(orderQuantity * 500).toLocaleString()}.00</Text>
            </View>

            <TouchableOpacity
              style={styles.payStripeBtn}
              onPress={handleOrderCardsStripe}
              disabled={orderingLoading}
            >
              {orderingLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="card" size={16} color="#ffffff" />
                  <Text style={styles.payStripeBtnText}>Checkout via Stripe</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* 3. ASSIGN TEMPORARY DRIVER + OTP MODAL */}
      {/* ═════════════════════════════════════════════════════════════ */}
      <Modal visible={showAssignModal} transparent animationType="slide" onRequestClose={() => setShowAssignModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.assignModalBox}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Assign Temporary Driver</Text>
              <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 450 }}>
              {assignError && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{assignError}</Text>
                </View>
              )}

              {/* Card ID */}
              <Text style={styles.fieldLabel}>Selected NFC Card:</Text>
              <View style={styles.staticField}>
                <Text style={styles.staticFieldText}>{selectedCardForAssign?.cardId}</Text>
              </View>

              {/* Covered Vehicle */}
              <Text style={styles.fieldLabel}>Covered Vehicle:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {vehicles.map((v) => (
                  <TouchableOpacity
                    key={v.numberPlate}
                    style={[styles.vehiclePickPill, assignPlate === v.numberPlate && styles.vehiclePickPillActive]}
                    onPress={() => setAssignPlate(v.numberPlate)}
                  >
                    <Text
                      style={[
                        styles.vehiclePickPillText,
                        assignPlate === v.numberPlate && styles.vehiclePickPillTextActive
                      ]}
                    >
                      {v.numberPlate} ({v.model || v.company})
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Driver Details */}
              <Text style={styles.fieldLabel}>Driver Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Ruwan Jayawardena"
                value={assignDriverName}
                onChangeText={setAssignDriverName}
              />

              <Text style={styles.fieldLabel}>Driver Phone Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 0771234567"
                keyboardType="phone-pad"
                value={assignDriverPhone}
                onChangeText={setAssignDriverPhone}
              />

              <Text style={styles.fieldLabel}>Driver NIC (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 911234567V"
                value={assignDriverNic}
                onChangeText={(t) => setAssignDriverNic(t.toUpperCase())}
              />

              {/* Duration Presets */}
              <Text style={styles.fieldLabel}>Assignment Duration:</Text>
              <View style={styles.durationPillRow}>
                {["1 Day", "2 Days", "7 Days", "10 Days", "Custom"].map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    style={[
                      styles.durationPresetPill,
                      assignDurationPreset === preset && styles.durationPresetPillActive
                    ]}
                    onPress={() => handleDurationChange(preset)}
                  >
                    <Text
                      style={[
                        styles.durationPresetPillText,
                        assignDurationPreset === preset && styles.durationPresetPillTextActive
                      ]}
                    >
                      {preset}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* OTP Verification Step */}
              <View style={styles.otpSection}>
                <Text style={styles.otpTitle}>Policyholder Authorization OTP</Text>
                <Text style={styles.otpDesc}>
                  Verification OTP is sent to YOUR phone ({userInfo?.phone || userInfo?.mobile || "verified phone"}).
                </Text>

                <TouchableOpacity
                  style={styles.sendOtpBtn}
                  onPress={handleSendAssignmentOtp}
                  disabled={sendingOtp}
                >
                  {sendingOtp ? (
                    <ActivityIndicator size="small" color="#0284c7" />
                  ) : (
                    <Text style={styles.sendOtpBtnText}>{otpSent ? "Resend OTP" : "Send Authorization OTP"}</Text>
                  )}
                </TouchableOpacity>

                {otpSent && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={styles.fieldLabel}>Enter 6-Digit OTP:</Text>
                    <TextInput
                      style={styles.otpInput}
                      placeholder="• • • • • •"
                      keyboardType="number-pad"
                      maxLength={6}
                      value={otpCode}
                      onChangeText={setOtpCode}
                    />
                  </View>
                )}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.assignSubmitBtn, (!otpSent || otpCode.length !== 6) && { opacity: 0.5 }]}
              onPress={handleConfirmAssignDriver}
              disabled={assigningLoading || !otpSent || otpCode.length !== 6}
            >
              {assigningLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.assignSubmitBtnText}>Verify OTP & Activate Driver</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* 4. CARD HISTORY MODAL */}
      {/* ═════════════════════════════════════════════════════════════ */}
      <Modal visible={!!selectedHistoryCard} transparent animationType="fade" onRequestClose={() => setSelectedHistoryCard(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.choiceModalBox}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Card History</Text>
              <TouchableOpacity onPress={() => setSelectedHistoryCard(null)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            <Text style={{ fontFamily: "monospace", fontSize: 13, color: "#102A43", fontWeight: "bold" }}>
              {selectedHistoryCard?.cardId}
            </Text>

            <ScrollView style={{ maxHeight: 300, marginTop: 10 }}>
              {(!selectedHistoryCard?.assignmentHistory || selectedHistoryCard.assignmentHistory.length === 0) ? (
                <Text style={{ color: "#64748b", fontStyle: "italic", textAlign: "center", padding: 20 }}>
                  No prior assignments for this card.
                </Text>
              ) : (
                selectedHistoryCard.assignmentHistory.map((h, i) => (
                  <View key={i} style={styles.historyItem}>
                    <Text style={{ fontWeight: "bold", color: "#0f172a" }}>{h.driverName}</Text>
                    <Text style={{ fontSize: 11, color: "#64748b" }}>Vehicle: {h.vehiclePlate}</Text>
                    <Text style={{ fontSize: 10, color: "#94a3b8" }}>
                      {new Date(h.startDate).toLocaleDateString("en-LK")} - {new Date(h.endDate).toLocaleDateString("en-LK")} ({h.status})
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* 5. PERMANENT DRIVER FULL DETAILS, TRACKING & MANAGEMENT MODAL */}
      {/* ═════════════════════════════════════════════════════════════ */}
      <Modal
        visible={!!selectedDriverForViewMore}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDriverForViewMore(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.fullDetailModalBox}>
            {/* Top Sheet Grab Handle */}
            <View style={styles.modalGrabHandle} />

            {/* Header Hero Profile Card */}
            <View style={styles.detailModalHeader}>
              <View style={styles.driverAvatarBadge}>
                <Text style={styles.driverAvatarText}>
                  {(selectedDriverForViewMore?.driverDetails?.fullName || "D")
                    .split(" ")
                    .filter(Boolean)
                    .map((n: string) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase() || "D"}
                </Text>
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 3 }}>
                  <View style={styles.detailRefBadge}>
                    <Ionicons name="pricetag-outline" size={10} color="#64748b" />
                    <Text style={styles.detailModalRef}>
                      {selectedDriverForViewMore?.requestReference || "REF"}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      selectedDriverForViewMore?.status === "Approved"
                        ? { backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" }
                        : selectedDriverForViewMore?.status === "Temporarily Blocked"
                        ? { backgroundColor: "#fffbeb", borderColor: "#fde68a" }
                        : selectedDriverForViewMore?.status === "Rejected"
                        ? { backgroundColor: "#fef2f2", borderColor: "#fecaca" }
                        : { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }
                    ]}
                  >
                    <View
                      style={[
                        styles.liveDot,
                        selectedDriverForViewMore?.status === "Approved"
                          ? { backgroundColor: "#10b981" }
                          : selectedDriverForViewMore?.status === "Temporarily Blocked"
                          ? { backgroundColor: "#f59e0b" }
                          : selectedDriverForViewMore?.status === "Rejected"
                          ? { backgroundColor: "#ef4444" }
                          : { backgroundColor: "#3b82f6" }
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        selectedDriverForViewMore?.status === "Approved"
                          ? { color: "#059669" }
                          : selectedDriverForViewMore?.status === "Temporarily Blocked"
                          ? { color: "#b45309" }
                          : selectedDriverForViewMore?.status === "Rejected"
                          ? { color: "#dc2626" }
                          : { color: "#2563eb" }
                      ]}
                    >
                      {selectedDriverForViewMore?.status === "Approved" ? "Active" : selectedDriverForViewMore?.status}
                    </Text>
                  </View>
                </View>

                <Text style={styles.detailModalTitle} numberOfLines={1}>
                  {selectedDriverForViewMore?.driverDetails?.fullName || "Driver Details"}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setSelectedDriverForViewMore(null)}
                style={styles.detailCloseBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailModalScroll}>
              {/* ── 4-STAGE TRACKING STEPPER ── */}
              {(() => {
                const req = selectedDriverForViewMore;
                if (!req) return null;
                const isPaid = req.payment?.status === "Paid" || req.status === "Approved" || req.status === "Scheduled" || req.status === "Pending Branch Approval";
                const isBranchReview = req.status === "Pending Branch Approval";
                const isApprovedOrActive = req.status === "Approved" || req.status === "Scheduled" || req.status === "Temporarily Blocked" || req.status === "Pending Termination Approval";
                const isRejected = req.status === "Rejected";

                const steps = [
                  { label: "Submitted", icon: "document-text-outline" },
                  { label: "Fee Paid", icon: "card-outline" },
                  { label: "Review", icon: "shield-checkmark-outline" },
                  { label: "Active", icon: "checkmark-circle-outline" }
                ];
                let curIdx = 0;
                if (isApprovedOrActive) curIdx = 3;
                else if (isBranchReview || isPaid) curIdx = 2;
                else if (req.status === "Pending Payment") curIdx = 1;

                return (
                  <View style={styles.detailStepperCard}>
                    <View style={styles.detailStepperHeaderRow}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Ionicons name="git-network-outline" size={15} color="#102A43" />
                        <Text style={styles.detailSectionTitle}>Application Progress & Verification</Text>
                      </View>
                      {!isRejected && (
                        <View style={styles.stepperStageBadge}>
                          <Text style={styles.stepperStageBadgeText}>
                            Stage {curIdx + 1} of 4
                          </Text>
                        </View>
                      )}
                    </View>

                    {isRejected ? (
                      <View style={styles.tpRejectBox}>
                        <Ionicons name="close-circle" size={18} color="#dc2626" />
                        <Text style={styles.tpRejectText}>
                          Verification Rejected: {req.branchReview?.rejectionReason || "Verification criteria not met"}
                        </Text>
                      </View>
                    ) : (
                      <>
                        <View style={styles.tpStepperContainerRedesigned}>
                          {/* Connecting track line */}
                          <View style={styles.tpStepperLineBgRedesigned} />
                          <View
                            style={[
                              styles.tpStepperLineProgressRedesigned,
                              { width: `${(Math.min(curIdx, 3) / 3) * 75}%` }
                            ]}
                          />

                          <View style={styles.tpStepperRow}>
                            {steps.map((st, i) => {
                              const passed = curIdx > i;
                              const isCurrent = curIdx === i;
                              const isDoneOrCurrent = curIdx >= i;

                              return (
                                <View key={st.label} style={styles.tpStepCol}>
                                  <View
                                    style={[
                                      styles.tpStepBox,
                                      passed
                                        ? styles.tpStepBoxPassed
                                        : isCurrent
                                        ? styles.tpStepBoxCurrent
                                        : styles.tpStepBoxPending
                                    ]}
                                  >
                                    <Ionicons
                                      name={passed ? "checkmark" : (st.icon as any)}
                                      size={14}
                                      color={isDoneOrCurrent ? "#ffffff" : "#94a3b8"}
                                    />
                                  </View>
                                  <Text
                                    style={[
                                      styles.tpStepLabelRedesigned,
                                      isCurrent && styles.tpStepLabelCurrentRedesigned,
                                      passed && styles.tpStepLabelPassedRedesigned
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {st.label}
                                  </Text>
                                </View>
                              );
                            })}
                          </View>
                        </View>

                        {/* Status Advice Banner */}
                        <View
                          style={[
                            styles.stepperGuidanceBanner,
                            curIdx === 3
                              ? styles.guidanceBannerSuccess
                              : curIdx === 2
                              ? styles.guidanceBannerInfo
                              : styles.guidanceBannerWarning
                          ]}
                        >
                          <Ionicons
                            name={
                              curIdx === 3
                                ? "shield-checkmark"
                                : curIdx === 2
                                ? "time-outline"
                                : "information-circle-outline"
                            }
                            size={14}
                            color={
                              curIdx === 3
                                ? "#059669"
                                : curIdx === 2
                                ? "#0284c7"
                                : "#d97706"
                            }
                          />
                          <Text
                            style={[
                              styles.stepperGuidanceText,
                              curIdx === 3
                                ? { color: "#065f46" }
                                : curIdx === 2
                                ? { color: "#075985" }
                                : { color: "#92400e" }
                            ]}
                          >
                            {curIdx === 3
                              ? "Driver is fully verified. Active authorization is enabled on your policy."
                              : curIdx === 2
                              ? `Submitted to ${req.branch || "Galle"} Branch. Officer verification in progress.`
                              : "Registration fee is pending. Complete payment to forward to branch."}
                          </Text>
                        </View>
                      </>
                    )}
                  </View>
                );
              })()}

              {/* ── DRIVER DETAILS & EDITABLE FIELDS ── */}
              <View style={styles.detailSectionCard}>
                <View style={styles.detailSectionHeaderRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="person-circle-outline" size={17} color="#102A43" />
                    <Text style={styles.detailSectionTitle}>Driver Identity & Contact</Text>
                  </View>

                  {!isEditingPermanentDriver ? (
                    <TouchableOpacity
                      style={styles.detailEditTriggerBtn}
                      onPress={() => setIsEditingPermanentDriver(true)}
                    >
                      <Ionicons name="pencil-outline" size={12} color="#0284c7" />
                      <Text style={styles.detailEditTriggerText}>Edit</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.detailEditCancelBtn}
                      onPress={() => setIsEditingPermanentDriver(false)}
                    >
                      <Text style={styles.detailEditCancelText}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Structured Key-Value Rows */}
                <View style={styles.detailCardBody}>
                  {/* Full Name */}
                  <View style={styles.detailFieldItem}>
                    <View style={styles.detailFieldIconBox}>
                      <Ionicons name="person-outline" size={14} color="#0284c7" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailFieldLabel}>Full Name</Text>
                      <Text style={styles.detailFieldValBold}>
                        {selectedDriverForViewMore?.driverDetails?.fullName || "—"}
                      </Text>
                    </View>
                  </View>

                  {/* NIC */}
                  <View style={styles.detailFieldItem}>
                    <View style={styles.detailFieldIconBox}>
                      <Ionicons name="card-outline" size={14} color="#0284c7" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailFieldLabel}>NIC Number</Text>
                      <View style={styles.detailNicChip}>
                        <Text style={styles.detailFieldValMono}>
                          {selectedDriverForViewMore?.driverDetails?.nicNumber || "—"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Phone */}
                  <View style={styles.detailFieldItem}>
                    <View style={styles.detailFieldIconBox}>
                      <Ionicons name="call-outline" size={14} color="#0284c7" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailFieldLabel}>Phone Number</Text>
                      {isEditingPermanentDriver ? (
                        <TextInput
                          style={styles.detailInput}
                          value={editPermanentPhone}
                          onChangeText={setEditPermanentPhone}
                          keyboardType="phone-pad"
                          placeholder="0771234567"
                        />
                      ) : (
                        <Text style={styles.detailFieldValBold}>
                          {selectedDriverForViewMore?.driverDetails?.phoneNumber || "—"}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Address */}
                  <View style={[styles.detailFieldItem, { borderBottomWidth: 0 }]}>
                    <View style={styles.detailFieldIconBox}>
                      <Ionicons name="location-outline" size={14} color="#0284c7" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailFieldLabel}>Residential Address</Text>
                      {isEditingPermanentDriver ? (
                        <TextInput
                          style={[styles.detailInput, { minHeight: 60 }]}
                          value={editPermanentAddress}
                          onChangeText={setEditPermanentAddress}
                          multiline
                          placeholder="Enter street address..."
                        />
                      ) : (
                        <Text style={styles.detailFieldVal}>
                          {selectedDriverForViewMore?.driverDetails?.residentialAddress || "—"}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>

                {isEditingPermanentDriver && (
                  <TouchableOpacity
                    style={styles.saveEditBtn}
                    onPress={handleSavePermanentDriverEdit}
                    disabled={savingPermanentEdit}
                  >
                    {savingPermanentEdit ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={16} color="#ffffff" />
                        <Text style={styles.saveEditBtnText}>Save Driver Details</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* ── COVERED VEHICLES ── */}
              <View style={styles.detailSectionCard}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <Ionicons name="car-sport-outline" size={17} color="#102A43" />
                  <Text style={styles.detailSectionTitle}>Covered Insured Vehicles</Text>
                </View>

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 }}>
                  {(selectedDriverForViewMore?.selectedVehicles || []).map((v: any) => (
                    <View key={v.numberPlate} style={styles.detailPlateCard}>
                      <View style={styles.detailPlateIconBox}>
                        <MaterialCommunityIcons name="car" size={16} color="#ffffff" />
                      </View>
                      <View>
                        <Text style={styles.detailPlateText}>{v.numberPlate}</Text>
                        <Text style={styles.detailPlateSubText}>
                          {v.model ? `${v.model} • ` : ""}Authorized
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* ── DURATION & BRANCH DETAILS ── */}
              <View style={styles.detailSectionCard}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <Ionicons name="shield-checkmark-outline" size={17} color="#102A43" />
                  <Text style={styles.detailSectionTitle}>Authorization Window & Branch</Text>
                </View>

                <View style={styles.detailCardBody}>
                  <View style={styles.detailFieldItem}>
                    <View style={styles.detailFieldIconBox}>
                      <Ionicons name="time-outline" size={14} color="#0284c7" />
                    </View>
                    <View style={{ flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={styles.detailFieldLabel}>Duration Type</Text>
                      <Text style={styles.detailFieldValBold}>
                        {selectedDriverForViewMore?.accessDuration?.durationType || "12 Months"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailFieldItem}>
                    <View style={styles.detailFieldIconBox}>
                      <Ionicons name="calendar-outline" size={14} color="#0284c7" />
                    </View>
                    <View style={{ flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={styles.detailFieldLabel}>Valid Until</Text>
                      <Text style={styles.detailFieldValBold}>
                        {selectedDriverForViewMore?.accessDuration?.endDate
                          ? new Date(selectedDriverForViewMore.accessDuration.endDate).toLocaleDateString("en-LK")
                          : "12 Months from Issue"}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.detailFieldItem, { borderBottomWidth: 0 }]}>
                    <View style={styles.detailFieldIconBox}>
                      <Ionicons name="business-outline" size={14} color="#0284c7" />
                    </View>
                    <View style={{ flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={styles.detailFieldLabel}>Reviewing Branch</Text>
                      <Text style={styles.detailFieldValBold}>
                        {selectedDriverForViewMore?.branch || "Galle"} Branch
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* ── MANAGEMENT FUNCTIONS ── */}
              <View style={styles.detailActionsCard}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <Ionicons name="settings-outline" size={16} color="#102A43" />
                  <Text style={styles.detailSectionTitle}>Driver Management Actions</Text>
                </View>

                {/* Temporary Block / Unblock Button */}
                {selectedDriverForViewMore?.status === "Approved" && (
                  <TouchableOpacity
                    style={styles.detailBlockBtn}
                    onPress={() => handleBlockPermanentDriver(selectedDriverForViewMore)}
                    disabled={blockingPermanentLoading}
                    activeOpacity={0.8}
                  >
                    <View style={styles.actionIconCircleAmber}>
                      <MaterialCommunityIcons name="pause-circle-outline" size={18} color="#b45309" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailBlockBtnTitle}>Temporarily Suspend Driver Access</Text>
                      <Text style={styles.detailBlockBtnSubtitle}>
                        Pauses coverage eligibility without deleting driver records
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                {selectedDriverForViewMore?.status === "Temporarily Blocked" && (
                  <TouchableOpacity
                    style={styles.detailUnblockBtn}
                    onPress={() => handleUnblockPermanentDriver(selectedDriverForViewMore)}
                    disabled={blockingPermanentLoading}
                    activeOpacity={0.8}
                  >
                    <View style={styles.actionIconCircleGreen}>
                      <MaterialCommunityIcons name="play-circle-outline" size={18} color="#16a34a" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailUnblockBtnTitle}>Restore & Unblock Driver Access</Text>
                      <Text style={styles.detailUnblockBtnSubtitle}>
                        Re-enables active third-party coverage for this driver
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Terminate Button */}
                {selectedDriverForViewMore?.status !== "Terminated" && (
                  <TouchableOpacity
                    style={styles.detailTerminateBtn}
                    onPress={() => {
                      setSelectedDriverForViewMore(null);
                      onOpenTerminateModal(selectedDriverForViewMore);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.actionIconCircleRed}>
                      <MaterialCommunityIcons name="account-remove-outline" size={18} color="#dc2626" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailTerminateBtnTitle}>Terminate Driver Authorization</Text>
                      <Text style={styles.detailTerminateBtnSubtitle}>
                        Permanently revokes third-party access under this policy
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Resume Payment if pending */}
                {selectedDriverForViewMore?.status === "Pending Payment" && (
                  <TouchableOpacity
                    style={styles.detailPayBtn}
                    onPress={() => {
                      const req = selectedDriverForViewMore;
                      setSelectedDriverForViewMore(null);
                      onResumePayment(req._id, req.requestReference);
                    }}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="credit-card-outline" size={18} color="#ffffff" />
                    <Text style={styles.detailPayBtnText}>Complete LKR 300 Registration Fee</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* 6. OPTIONAL NFC CARD FULL DETAILS, TRACKING & ACTIONS MODAL */}
      {/* ═════════════════════════════════════════════════════════════ */}
      <Modal
        visible={!!selectedCardForViewMore}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedCardForViewMore(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.fullDetailModalBox}>
            {/* Header */}
            <View style={styles.detailModalHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={styles.nfcIconBadge}>
                    <MaterialCommunityIcons name="nfc" size={16} color="#059669" />
                  </View>
                  <Text style={styles.detailModalRef}>{selectedCardForViewMore?.cardId}</Text>
                  <View
                    style={[
                      styles.statusPill,
                      selectedCardForViewMore?.status === "Available"
                        ? { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }
                        : selectedCardForViewMore?.status === "Temporarily Blocked"
                        ? { backgroundColor: "#fffbeb", borderColor: "#fde68a" }
                        : { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        selectedCardForViewMore?.status === "Available"
                          ? { color: "#16a34a" }
                          : selectedCardForViewMore?.status === "Temporarily Blocked"
                          ? { color: "#d97706" }
                          : { color: "#2563eb" }
                      ]}
                    >
                      {selectedCardForViewMore?.status}
                    </Text>
                  </View>
                </View>
                <Text style={styles.detailModalTitle}>Reusable NFC Card Details</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedCardForViewMore(null)}
                style={styles.detailCloseBtn}
              >
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailModalScroll}>
              {/* ── CARD METADATA & TRACKING ── */}
              <View style={styles.detailSectionCard}>
                <Text style={styles.detailSectionTitle}>Card Inventory & Branch Status</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Card UID:</Text>
                  <Text style={styles.detailValMono}>{selectedCardForViewMore?.cardId}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Issuing Branch:</Text>
                  <Text style={styles.detailVal}>{selectedCardForViewMore?.branch || "Galle"} Branch</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Status:</Text>
                  <Text style={styles.detailValBold}>{selectedCardForViewMore?.status}</Text>
                </View>
                {/* Associated Order Reference if available */}
                {(() => {
                  const matchingOrder = orders.find((o) => o.branch === selectedCardForViewMore?.branch);
                  if (!matchingOrder) return null;
                  return (
                    <View style={styles.cardOrderTrackingRow}>
                      <Ionicons name="cube-outline" size={15} color="#0284c7" />
                      <Text style={styles.cardOrderTrackingText}>
                        Order Ref: <Text style={{ fontWeight: "bold" }}>{matchingOrder.orderNumber}</Text> ({matchingOrder.status})
                      </Text>
                    </View>
                  );
                })()}
              </View>

              {/* ── CURRENT ASSIGNMENT DETAILS ── */}
              {selectedCardForViewMore?.status !== "Available" && selectedCardForViewMore?.currentAssignment ? (
                <View style={styles.detailSectionCard}>
                  <Text style={styles.detailSectionTitle}>Current Temporary Driver Assignment</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>Driver Name:</Text>
                    <Text style={styles.detailValBold}>
                      {selectedCardForViewMore.currentAssignment.driverName || "—"}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>NIC Number:</Text>
                    <Text style={styles.detailValMono}>
                      {selectedCardForViewMore.currentAssignment.driverNic || "—"}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>Phone Number:</Text>
                    <Text style={styles.detailVal}>
                      {selectedCardForViewMore.currentAssignment.driverPhone || "—"}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>Vehicle Plate:</Text>
                    <View style={styles.detailPlatePill}>
                      <Text style={styles.detailPlatePillText}>
                        {selectedCardForViewMore.currentAssignment.vehiclePlate || "—"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>Duration:</Text>
                    <Text style={styles.detailVal}>
                      {selectedCardForViewMore.currentAssignment.durationType || "Custom"} (Valid until{" "}
                      {selectedCardForViewMore.currentAssignment.endDate
                        ? new Date(selectedCardForViewMore.currentAssignment.endDate).toLocaleDateString("en-LK")
                        : "—"}
                      )
                    </Text>
                  </View>
                  <View style={styles.otpConfirmedBadge}>
                    <MaterialCommunityIcons name="shield-check" size={15} color="#16a34a" />
                    <Text style={styles.otpConfirmedText}>Authorized & verified with Policyholder OTP</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.vacantNoticeCard}>
                  <MaterialCommunityIcons name="check-decagram" size={24} color="#16a34a" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.vacantNoticeTitle}>Card is Available & Vacant</Text>
                    <Text style={styles.vacantNoticeDesc}>
                      You can instantly assign this physical reusable card to any driver with your OTP confirmation.
                    </Text>
                  </View>
                </View>
              )}

              {/* ── CARD MANAGEMENT ACTIONS ── */}
              <View style={styles.detailActionsCard}>
                <Text style={styles.detailSectionTitle}>Card Functions</Text>

                {selectedCardForViewMore?.status === "Available" ? (
                  <TouchableOpacity
                    style={styles.detailAssignBtn}
                    onPress={() => {
                      const card = selectedCardForViewMore;
                      setSelectedCardForViewMore(null);
                      handleOpenAssignModal(card);
                    }}
                  >
                    <Ionicons name="person-add" size={17} color="#ffffff" />
                    <Text style={styles.detailAssignBtnText}>Assign Driver via OTP</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    {selectedCardForViewMore?.status === "Temporarily Blocked" ? (
                      <TouchableOpacity
                        style={styles.detailUnblockBtn}
                        onPress={() => {
                          if (selectedCardForViewMore?.cardId) {
                            handleUnblockCard(selectedCardForViewMore.cardId);
                            setSelectedCardForViewMore((prev) => (prev ? { ...prev, status: "Active" } : null));
                          }
                        }}
                      >
                        <MaterialCommunityIcons name="play-circle-outline" size={18} color="#16a34a" />
                        <Text style={styles.detailUnblockBtnText}>Unblock Card Access</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.detailBlockBtn}
                        onPress={() => {
                          if (selectedCardForViewMore?.cardId) {
                            handleBlockCard(selectedCardForViewMore.cardId);
                            setSelectedCardForViewMore((prev) => (prev ? { ...prev, status: "Temporarily Blocked" } : null));
                          }
                        }}
                      >
                        <MaterialCommunityIcons name="pause-circle-outline" size={18} color="#b45309" />
                        <Text style={styles.detailBlockBtnText}>Temporarily Block Card</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.detailTerminateBtn}
                      onPress={() => {
                        if (selectedCardForViewMore?.cardId) {
                          handleTerminateCard(selectedCardForViewMore.cardId);
                          setSelectedCardForViewMore(null);
                        }
                      }}
                    >
                      <MaterialCommunityIcons name="close-circle-outline" size={18} color="#dc2626" />
                      <Text style={styles.detailTerminateBtnText}>Terminate & Return to Available</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              {/* ── ASSIGNMENT HISTORY LOG ── */}
              <View style={styles.detailSectionCard}>
                <Text style={styles.detailSectionTitle}>Assignment History Log</Text>
                {(!selectedCardForViewMore?.assignmentHistory || selectedCardForViewMore.assignmentHistory.length === 0) ? (
                  <Text style={styles.detailEmptyText}>No previous assignment history recorded for this card.</Text>
                ) : (
                  selectedCardForViewMore.assignmentHistory.map((h, idx) => (
                    <View key={idx} style={styles.historyLogItem}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={styles.historyLogDriver}>{h.driverName}</Text>
                        <View style={styles.historyLogStatusBadge}>
                          <Text style={styles.historyLogStatusText}>{h.status}</Text>
                        </View>
                      </View>
                      <Text style={styles.historyLogPlate}>Vehicle Plate: {h.vehiclePlate}</Text>
                      <Text style={styles.historyLogDates}>
                        {new Date(h.startDate).toLocaleDateString("en-LK")} - {new Date(h.endDate).toLocaleDateString("en-LK")}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 24
  },
  heroBanner: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 8,
    gap: 4
  },
  heroBadgeText: {
    color: "#38bdf8",
    fontSize: 11,
    fontWeight: "bold"
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 4
  },
  heroDesc: {
    color: "#cbd5e1",
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14
  },
  registerHeroBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#38bdf8",
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6
  },
  registerHeroBtnText: {
    color: "#0f172a",
    fontWeight: "bold",
    fontSize: 13
  },
  subTabRow: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    gap: 4
  },
  subTabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 9,
    gap: 4
  },
  subTabBtnActive: {
    backgroundColor: "#102A43"
  },
  subTabBtnText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748b"
  },
  subTabBtnTextActive: {
    color: "#ffffff",
    fontWeight: "bold"
  },
  tabContent: {
    minHeight: 180
  },
  loaderBox: {
    paddingVertical: 40,
    alignItems: "center"
  },
  loaderText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 8
  },
  emptyBox: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0f172a",
    marginTop: 10
  },
  emptyDesc: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 14,
    lineHeight: 17
  },
  emptyBtn: {
    backgroundColor: "#0284c7",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  emptyBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold"
  },
  requestCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
  },
  refBox: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  refText: {
    fontFamily: "monospace",
    fontSize: 11,
    fontWeight: "bold",
    color: "#1e293b"
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1
  },
  statusText: {
    fontSize: 11,
    fontWeight: "bold"
  },
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10
  },
  driverAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#e0e7ff",
    alignItems: "center",
    justifyContent: "center"
  },
  driverName: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#0f172a"
  },
  driverSub: {
    fontSize: 11,
    color: "#64748b"
  },
  vehiclesCoveredRow: {
    marginBottom: 8
  },
  secLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#64748b",
    textTransform: "uppercase"
  },
  plateBadge: {
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  plateText: {
    fontFamily: "monospace",
    fontSize: 11,
    fontWeight: "bold",
    color: "#78350f"
  },
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 10
  },
  durationText: {
    fontSize: 11,
    color: "#475569"
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 8
  },
  actionBtnPrimary: {
    backgroundColor: "#0284c7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  actionBtnPrimaryText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "bold"
  },
  actionBtnDanger: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  actionBtnDangerText: {
    color: "#dc2626",
    fontSize: 11,
    fontWeight: "bold"
  },
  actionBtnOutline: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  actionBtnOutlineText: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "bold"
  },
  historyBtn: {
    padding: 6,
    marginLeft: 6
  },
  filterScroll: {
    marginBottom: 12
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
    marginRight: 8
  },
  filterPillActive: {
    backgroundColor: "#0284c7"
  },
  filterPillText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600"
  },
  filterPillTextActive: {
    color: "#ffffff",
    fontWeight: "bold"
  },
  nfcCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  nfcIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: "#d1fae5",
    alignItems: "center",
    justifyContent: "center"
  },
  nfcCardIdText: {
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "bold",
    color: "#0f172a"
  },
  asgBox: {
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 10,
    marginVertical: 8
  },
  asgDriverName: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#0f172a",
    marginTop: 2
  },
  asgDriverSub: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2
  },
  asgVacantBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    padding: 10,
    borderRadius: 10,
    marginVertical: 8,
    gap: 6
  },
  asgVacantText: {
    fontSize: 11,
    color: "#16a34a",
    fontWeight: "600"
  },
  orderCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  orderNum: {
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "bold",
    color: "#102A43"
  },
  orderSub: {
    fontSize: 11,
    color: "#475569",
    marginTop: 2
  },
  readyAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    gap: 6
  },
  readyAlertText: {
    fontSize: 11,
    color: "#15803d",
    fontWeight: "600",
    flex: 1
  },
  rejectAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    gap: 6
  },
  rejectAlertText: {
    fontSize: 11,
    color: "#b91c1c",
    fontWeight: "600",
    flex: 1
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16
  },
  choiceModalBox: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    width: "100%",
    maxWidth: 420,
    padding: 18
  },
  orderModalBox: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    width: "100%",
    maxWidth: 380,
    padding: 18
  },
  assignModalBox: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    width: "100%",
    maxWidth: 420,
    padding: 18
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f172a"
  },
  choiceSubtitle: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 14
  },
  choiceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10
  },
  choiceIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  choiceCardTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#0f172a"
  },
  choiceCardDesc: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2
  },
  qtyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 14
  },
  qtyLabel: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#0f172a"
  },
  qtyControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center"
  },
  qtyBtnText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f172a"
  },
  qtyVal: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f172a",
    minWidth: 20,
    textAlign: "center"
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 12,
    marginBottom: 16
  },
  priceLabel: {
    fontSize: 13,
    color: "#64748b"
  },
  priceVal: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#059669"
  },
  payStripeBtn: {
    backgroundColor: "#059669",
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6
  },
  payStripeBtnText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 13
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#475569",
    marginTop: 8,
    marginBottom: 4
  },
  staticField: {
    backgroundColor: "#f1f5f9",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8
  },
  staticFieldText: {
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "bold",
    color: "#0f172a"
  },
  vehiclePickPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    marginRight: 6
  },
  vehiclePickPillActive: {
    backgroundColor: "#0284c7"
  },
  vehiclePickPillText: {
    fontSize: 11,
    color: "#475569"
  },
  vehiclePickPillTextActive: {
    color: "#ffffff",
    fontWeight: "bold"
  },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: "#0f172a",
    marginBottom: 6
  },
  durationPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10
  },
  durationPresetPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: "#f1f5f9"
  },
  durationPresetPillActive: {
    backgroundColor: "#0284c7"
  },
  durationPresetPillText: {
    fontSize: 11,
    color: "#475569"
  },
  durationPresetPillTextActive: {
    color: "#ffffff",
    fontWeight: "bold"
  },
  otpSection: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    marginVertical: 10
  },
  otpTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0f172a"
  },
  otpDesc: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 2,
    marginBottom: 8
  },
  sendOtpBtn: {
    borderWidth: 1,
    borderColor: "#0284c7",
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center"
  },
  sendOtpBtnText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0284c7"
  },
  otpInput: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#0284c7",
    borderRadius: 8,
    padding: 8,
    textAlign: "center",
    fontSize: 18,
    letterSpacing: 4,
    fontFamily: "monospace"
  },
  assignSubmitBtn: {
    backgroundColor: "#059669",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10
  },
  assignSubmitBtnText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 13
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    padding: 8,
    borderRadius: 8,
    marginBottom: 8
  },
  errorText: {
    color: "#dc2626",
    fontSize: 11
  },
  historyItem: {
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingVertical: 8
  },
  tpStepperContainer: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginVertical: 10,
    position: "relative"
  },
  tpStepperLineBg: {
    position: "absolute",
    top: 20,
    left: 28,
    right: 28,
    height: 2,
    backgroundColor: "#e2e8f0"
  },
  tpStepperLineProgress: {
    position: "absolute",
    top: 20,
    left: 28,
    height: 2,
    backgroundColor: "#16a34a"
  },
  tpStepperRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  tpStepCol: {
    flex: 1,
    alignItems: "center"
  },
  tpStepCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4
  },
  tpStepCirclePassed: {
    backgroundColor: "#16a34a"
  },
  tpStepCircleCurrent: {
    backgroundColor: "#4f46e5"
  },
  tpStepCirclePending: {
    backgroundColor: "#cbd5e1"
  },
  tpStepNumText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#64748b"
  },
  tpStepLabel: {
    fontSize: 9,
    color: "#94a3b8",
    textAlign: "center"
  },
  tpStepLabelCurrent: {
    color: "#4f46e5",
    fontWeight: "bold"
  },
  tpStepLabelPassed: {
    color: "#0f172a",
    fontWeight: "600"
  },
  tpRejectBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 10,
    padding: 8,
    marginVertical: 8
  },
  tpRejectText: {
    fontSize: 11,
    color: "#dc2626",
    flex: 1
  },

  // ── REDESIGNED MODERN SUB-TABS ROW ──
  modernSubTabRow: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    padding: 5,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 6
  },
  modernSubTabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    gap: 6
  },
  modernSubTabBtnActive: {
    backgroundColor: "#0284c7",
    shadowColor: "#0284c7",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3
  },
  modernSubTabBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b"
  },
  modernSubTabBtnTextActive: {
    color: "#ffffff"
  },
  modernSubTabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    backgroundColor: "#e2e8f0"
  },
  modernSubTabBadgeActive: {
    backgroundColor: "rgba(255, 255, 255, 0.25)"
  },
  modernSubTabBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#475569"
  },
  modernSubTabBadgeTextActive: {
    color: "#ffffff"
  },

  // ── COMPACT FIRST-VIEW CARD ELEMENTS ──
  dotIndicator: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6
  },
  viewMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#0284c7",
    backgroundColor: "#f0f9ff"
  },
  viewMoreBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0284c7"
  },
  payNowBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#2563eb"
  },
  payNowBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff"
  },
  cardFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9"
  },
  actionBtnPrimaryCompact: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#0284c7",
    paddingVertical: 9,
    borderRadius: 10
  },
  actionBtnPrimaryCompactText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "bold"
  },

  // ── FULL DETAIL & MANAGEMENT BOTTOM MODAL ──
  // ── FULL DETAIL & MANAGEMENT BOTTOM MODAL ──
  fullDetailModalBox: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "90%",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    width: "100%",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8
  },
  modalGrabHandle: {
    width: 44,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: "#cbd5e1",
    alignSelf: "center",
    marginBottom: 14
  },
  detailModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9"
  },
  driverAvatarBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#102A43",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#102A43",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  },
  driverAvatarText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5
  },
  detailRefBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6
  },
  detailModalRef: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    fontFamily: "monospace"
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4
  },
  detailModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#102A43",
    marginTop: 2
  },
  detailCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center"
  },
  detailModalScroll: {
    paddingTop: 16,
    paddingBottom: 28
  },

  // Stepper Redesign
  detailStepperCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  detailStepperHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  },
  stepperStageBadge: {
    backgroundColor: "#102A43",
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 12
  },
  stepperStageBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700"
  },
  tpStepperContainerRedesigned: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    position: "relative"
  },
  tpStepperLineBgRedesigned: {
    position: "absolute",
    top: 21,
    left: 28,
    right: 28,
    height: 3,
    backgroundColor: "#e2e8f0",
    borderRadius: 2
  },
  tpStepperLineProgressRedesigned: {
    position: "absolute",
    top: 21,
    left: 28,
    height: 3,
    backgroundColor: "#10b981",
    borderRadius: 2
  },
  tpStepBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
    borderWidth: 1.5
  },
  tpStepBoxPassed: {
    backgroundColor: "#10b981",
    borderColor: "#10b981"
  },
  tpStepBoxCurrent: {
    backgroundColor: "#102A43",
    borderColor: "#0284c7"
  },
  tpStepBoxPending: {
    backgroundColor: "#ffffff",
    borderColor: "#cbd5e1"
  },
  tpStepLabelRedesigned: {
    fontSize: 10,
    color: "#94a3b8",
    textAlign: "center",
    fontWeight: "500"
  },
  tpStepLabelCurrentRedesigned: {
    color: "#102A43",
    fontWeight: "800"
  },
  tpStepLabelPassedRedesigned: {
    color: "#059669",
    fontWeight: "700"
  },
  stepperGuidanceBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1
  },
  guidanceBannerSuccess: {
    backgroundColor: "#ecfdf5",
    borderColor: "#a7f3d0"
  },
  guidanceBannerInfo: {
    backgroundColor: "#f0f9ff",
    borderColor: "#bae6fd"
  },
  guidanceBannerWarning: {
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a"
  },
  stepperGuidanceText: {
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
    lineHeight: 15
  },

  // Cards
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#102A43"
  },
  detailSectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1
  },
  detailSectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  },
  detailEditTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 8,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd"
  },
  detailEditTriggerText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0284c7"
  },
  detailEditCancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 8,
    backgroundColor: "#f1f5f9"
  },
  detailEditCancelText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b"
  },
  detailCardBody: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    overflow: "hidden"
  },
  detailFieldItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9"
  },
  detailFieldIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#f0f9ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10
  },
  detailFieldLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600"
  },
  detailFieldVal: {
    fontSize: 13,
    color: "#1e293b",
    marginTop: 1
  },
  detailFieldValBold: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 1
  },
  detailNicChip: {
    backgroundColor: "#ffffff",
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 2
  },
  detailFieldValMono: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
    fontFamily: "monospace"
  },
  detailInput: {
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: "#0f172a",
    backgroundColor: "#ffffff",
    marginTop: 6
  },
  saveEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#0284c7",
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 12
  },
  saveEditBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "bold"
  },
  detailPlateCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#102A43",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: "#102A43",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2
  },
  detailPlateIconBox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center"
  },
  detailPlateText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff",
    fontFamily: "monospace",
    letterSpacing: 0.5
  },
  detailPlateSubText: {
    fontSize: 10,
    color: "#93c5fd",
    fontWeight: "600"
  },
  detailActionsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 10
  },
  detailBlockBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    padding: 12,
    borderRadius: 14
  },
  actionIconCircleAmber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fef3c7",
    alignItems: "center",
    justifyContent: "center"
  },
  detailBlockBtnTitle: {
    color: "#b45309",
    fontSize: 13,
    fontWeight: "700"
  },
  detailBlockBtnSubtitle: {
    color: "#d97706",
    fontSize: 10.5,
    marginTop: 1
  },
  detailUnblockBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    padding: 12,
    borderRadius: 14
  },
  actionIconCircleGreen: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#d1fae5",
    alignItems: "center",
    justifyContent: "center"
  },
  detailUnblockBtnTitle: {
    color: "#059669",
    fontSize: 13,
    fontWeight: "700"
  },
  detailUnblockBtnSubtitle: {
    color: "#047857",
    fontSize: 10.5,
    marginTop: 1
  },
  detailTerminateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    padding: 12,
    borderRadius: 14
  },
  actionIconCircleRed: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center"
  },
  detailTerminateBtnTitle: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "700"
  },
  detailTerminateBtnSubtitle: {
    color: "#ef4444",
    fontSize: 10.5,
    marginTop: 1
  },
  detailPayBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0284c7",
    paddingVertical: 13,
    borderRadius: 14,
    shadowColor: "#0284c7",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2
  },
  detailPayBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700"
  },
  // Compatibility styles for card modal
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f1f5f9"
  },
  detailRowVertical: {
    paddingVertical: 8
  },
  detailKey: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600"
  },
  detailVal: {
    fontSize: 13,
    color: "#1e293b"
  },
  detailValBold: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a"
  },
  detailValMono: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
    fontFamily: "monospace"
  },
  detailPlatePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bae6fd"
  },
  detailPlatePillText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0369a1",
    fontFamily: "monospace"
  },
  detailBlockBtnText: {
    color: "#b45309",
    fontSize: 13,
    fontWeight: "bold"
  },
  detailUnblockBtnText: {
    color: "#16a34a",
    fontSize: 13,
    fontWeight: "bold"
  },
  detailTerminateBtnText: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "bold"
  },
  cardOrderTrackingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f0f9ff",
    padding: 8,
    borderRadius: 8,
    marginTop: 8
  },
  cardOrderTrackingText: {
    fontSize: 12,
    color: "#0369a1"
  },
  otpConfirmedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    padding: 10,
    borderRadius: 10,
    marginTop: 10
  },
  otpConfirmedText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#15803d"
  },
  vacantNoticeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    padding: 14,
    borderRadius: 14,
    marginBottom: 14
  },
  vacantNoticeTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#166534"
  },
  vacantNoticeDesc: {
    fontSize: 12,
    color: "#15803d",
    marginTop: 2,
    lineHeight: 17
  },
  detailAssignBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0284c7",
    paddingVertical: 12,
    borderRadius: 12
  },
  detailAssignBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "bold"
  },
  detailEmptyText: {
    fontSize: 12,
    color: "#94a3b8",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 12
  },
  historyLogItem: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8
  },
  historyLogDriver: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a"
  },
  historyLogStatusBadge: {
    backgroundColor: "#e2e8f0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  historyLogStatusText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#475569"
  },
  historyLogPlate: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0369a1",
    marginTop: 4
  },
  historyLogDates: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2
  }
});
