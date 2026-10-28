import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Platform,
  ImageBackground,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Dimensions,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router, useNavigation } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import PolicyHolderNavbar from "../Components/PolicyHolder/page";
import AIChatBot from "../Components/AIChatBot";
import { API_BASE_URL } from "../_config";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface Vehicle {
  numberPlate: string;
  vehicleType: string;
  year: string | number;
  company: string;
  model: string;
  engineNumber?: string;
  chassisNumber?: string;
  policyNumber?: string;
  policyExpiryDate?: string;
}

interface RenewalQuoteInfo {
  hasCalculatedQuote: boolean;
  isWithin30Days: boolean;
  daysRemaining: number | null;
  expiryDate: string | null;
  isRenewed?: boolean;
  renewalQuote: any | null;
}

interface ActiveInstallmentInfo {
  hasActivePlan: boolean;
  nextInstallment: any | null;
  isFullyPaid: boolean;
  paidCount?: number;
  totalCount?: number;
  renewal: any | null;
}

const vehicleTypes = ["Car", "SUV", "Cab / Double Cab", "Van", "Motorbike", "Three-Wheeler", "Lorry / Truck", "Bus", "Tractor"];

function formatPlate(plate: string) {
  if (!plate) return "";
  const cleaned = plate.trim();
  if (cleaned.includes("-")) return cleaned.toUpperCase();
  const m = cleaned.match(/^(.*[A-Za-z]+)(\d+)$/);
  if (m) return `${m[1].trim().toUpperCase()}-${m[2]}`;
  return cleaned.toUpperCase();
}

function getVehicleTheme(type: string) {
  const t = (type || "").toLowerCase().trim();
  if (t.includes("bike") || t.includes("motorcycle") || t.includes("scooter")) {
    return { icon: "motorbike", color: "#e11d48", bg: "#ffe4e6", border: "#fecdd3" };
  }
  if (t.includes("van") || t.includes("minibus")) {
    return { icon: "van-utility", color: "#d97706", bg: "#fef3c7", border: "#fde68a" };
  }
  if (t.includes("bus")) {
    return { icon: "bus", color: "#9333ea", bg: "#f3e8ff", border: "#e9d5ff" };
  }
  if (t.includes("truck") || t.includes("lorry")) {
    return { icon: "truck", color: "#475569", bg: "#f1f5f9", border: "#e2e8f0" };
  }
  if (t.includes("suv")) {
    return { icon: "car-estate", color: "#6366f1", bg: "#e0e7ff", border: "#c7d2fe" };
  }
  if (t.includes("tuk") || t.includes("three") || t.includes("rickshaw")) {
    return { icon: "rickshaw", color: "#059669", bg: "#d1fae5", border: "#a7f3d0" };
  }
  if (t.includes("tractor")) {
    return { icon: "tractor", color: "#65a30d", bg: "#ecfccb", border: "#d9f99d" };
  }
  if (t.includes("cab") || t.includes("pickup")) {
    return { icon: "truck-pickup", color: "#0d9488", bg: "#ccfbf1", border: "#99f6e4" };
  }
  return { icon: "car-side", color: "#0284c7", bg: "#e0f2fe", border: "#bae6fd" };
}

function vehicleIcon(type: string) {
  return getVehicleTheme(type).icon;
}

export default function MyVehicles() {
  const navigation = useNavigation();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userNic, setUserNic] = useState("");
  const [userInfo, setUserInfo] = useState<any>(null);

  // Search & Filter Category States
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  // Real-time Renewal Maps per vehicle plate
  const [renewalMap, setRenewalMap] = useState<Record<string, RenewalQuoteInfo>>({});
  const [installmentMap, setInstallmentMap] = useState<Record<string, ActiveInstallmentInfo>>({});

  // Detailed Vehicle Modal
  const [selectedVehicleForModal, setSelectedVehicleForModal] = useState<Vehicle | null>(null);
  const [modalRenewalInfo, setModalRenewalInfo] = useState<RenewalQuoteInfo | null>(null);
  const [modalInstallmentInfo, setModalInstallmentInfo] = useState<ActiveInstallmentInfo | null>(null);
  const [loadingModalRenewal, setLoadingModalRenewal] = useState(false);

  // 3-Step Renewal Wizard States
  const [renewalWizardOpen, setRenewalWizardOpen] = useState(false);
  const [renewalStep, setRenewalStep] = useState<1 | 2 | 3>(1);
  const [selectedPlanType, setSelectedPlanType] = useState<"One-Time" | "2-Installments" | "4-Installments">("One-Time");
  const [isRedirectingToStripe, setIsRedirectingToStripe] = useState(false);

  // Cover Note Certificate Modal
  const [coverNoteModalOpen, setCoverNoteModalOpen] = useState(false);
  const [coverNoteVehicle, setCoverNoteVehicle] = useState<Vehicle | null>(null);

  // Payment Success Modal
  const [paymentSuccessModal, setPaymentSuccessModal] = useState(false);
  const [paymentSuccessDetails, setPaymentSuccessDetails] = useState<{ plate: string; installment: string } | null>(null);

  // Add Vehicle Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCompany, setNewCompany] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newYear, setNewYear] = useState("");
  const [newNumberPlate, setNewNumberPlate] = useState("");
  const [newVehicleType, setNewVehicleType] = useState("Car");
  const [newPolicyNumber, setNewPolicyNumber] = useState("");
  const [newEngineNumber, setNewEngineNumber] = useState("");
  const [newChassisNumber, setNewChassisNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [activeVehicleTypePicker, setActiveVehicleTypePicker] = useState(false);

  // Alert State
  const [customAlert, setCustomAlert] = useState<{
    title: string;
    message: string;
    type?: "success" | "warning" | "info";
    onClose?: () => void;
  } | null>(null);

  const showCustomAlert = (title: string, message: string, type: "success" | "warning" | "info" = "info", onClose?: () => void) => {
    setCustomAlert({ title, message, type, onClose });
  };

  // Fetch renewal & installment data for a single vehicle in real time
  const fetchSingleVehicleRenewal = useCallback(async (plate: string) => {
    if (!plate) return;
    try {
      const cleanPlate = encodeURIComponent(plate.trim());
      const [quoteRes, instRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/renewals/vehicle-quote/${cleanPlate}`, { cache: "no-store" }),
        fetch(`${API_BASE_URL}/api/renewals/active-installment/${cleanPlate}`, { cache: "no-store" }),
      ]);

      if (quoteRes.ok) {
        const qData: RenewalQuoteInfo = await quoteRes.json();
        setRenewalMap((prev) => ({ ...prev, [plate]: qData }));
        if (selectedVehicleForModal?.numberPlate === plate) {
          setModalRenewalInfo(qData);
        }
      }

      if (instRes.ok) {
        const iData: ActiveInstallmentInfo = await instRes.json();
        setInstallmentMap((prev) => ({ ...prev, [plate]: iData }));
        if (selectedVehicleForModal?.numberPlate === plate) {
          setModalInstallmentInfo(iData);
        }
      }
    } catch (e) {
      // Quiet fail in background
    }
  }, [selectedVehicleForModal?.numberPlate]);

  // Fetch renewal status for all vehicles
  const fetchAllVehiclesRenewal = useCallback(async (vehList: Vehicle[]) => {
    if (!Array.isArray(vehList) || vehList.length === 0) return;
    await Promise.allSettled(vehList.map((v) => fetchSingleVehicleRenewal(v.numberPlate)));
  }, [fetchSingleVehicleRenewal]);

  // Fetch list of registered vehicles
  const fetchVehicles = useCallback(async (nic: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/policy-holder/vehicles?nic=${encodeURIComponent(nic)}&_=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.vehicles)) {
          setVehicles(data.vehicles);
          fetchAllVehiclesRenewal(data.vehicles);
          if (!silent) setLoading(false);
          return;
        }
      }
      // Fallback to locally stored user vehicles
      const userStr = await AsyncStorage.getItem("logged_in_user");
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.vehicles && Array.isArray(user.vehicles)) {
          setVehicles(user.vehicles);
          fetchAllVehiclesRenewal(user.vehicles);
        }
      }
    } catch (err) {
      console.error("Error fetching vehicles in app:", err);
      const userStr = await AsyncStorage.getItem("logged_in_user");
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.vehicles && Array.isArray(user.vehicles)) {
          setVehicles(user.vehicles);
          fetchAllVehiclesRenewal(user.vehicles);
        }
      }
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, [fetchAllVehiclesRenewal]);

  // Initial load
  useEffect(() => {
    (async () => {
      const userStr = await AsyncStorage.getItem("logged_in_user");
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          setUserInfo(user);
          if (user.nic) {
            setUserNic(user.nic);
            fetchVehicles(user.nic, false);
          }
        } catch (e) {
          console.error(e);
        }
      }
    })();
  }, [fetchVehicles]);

  // Real-time polling:
  // 1. Silent poll for vehicles list every 5 seconds when screen is focused
  // 2. Fast 4-second poll for selected vehicle renewal details when modal is open
  useEffect(() => {
    let intervalId: any;
    let modalIntervalId: any;

    const startPolling = (nic: string) => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        fetchVehicles(nic, true);
      }, 5000);
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const unsubscribeFocus = navigation.addListener("focus", async () => {
      const userStr = await AsyncStorage.getItem("logged_in_user");
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          const nic = user.nic || userNic;
          if (nic) {
            fetchVehicles(nic, true);
            startPolling(nic);
          }
        } catch {}
      }
    });

    const unsubscribeBlur = navigation.addListener("blur", () => {
      stopPolling();
    });

    if (userNic) {
      startPolling(userNic);
    }

    // Modal fast real-time synchronization
    if (selectedVehicleForModal?.numberPlate) {
      fetchSingleVehicleRenewal(selectedVehicleForModal.numberPlate);
      modalIntervalId = setInterval(() => {
        fetchSingleVehicleRenewal(selectedVehicleForModal.numberPlate);
      }, 4000);
    }

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
      stopPolling();
      if (modalIntervalId) clearInterval(modalIntervalId);
    };
  }, [navigation, userNic, fetchVehicles, selectedVehicleForModal?.numberPlate, fetchSingleVehicleRenewal]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (userNic) {
      fetchVehicles(userNic);
    }
  }, [userNic, fetchVehicles]);

  // Open Vehicle Details Modal
  const handleOpenVehicleModal = (vehicle: Vehicle) => {
    setSelectedVehicleForModal(vehicle);
    setLoadingModalRenewal(true);
    setModalRenewalInfo(renewalMap[vehicle.numberPlate] || null);
    setModalInstallmentInfo(installmentMap[vehicle.numberPlate] || null);
    fetchSingleVehicleRenewal(vehicle.numberPlate).finally(() => setLoadingModalRenewal(false));
  };

  // Open 3-Step Renewal Wizard
  const handleOpenRenewalWizard = (vehicle: Vehicle) => {
    setSelectedVehicleForModal(vehicle);
    const qInfo = renewalMap[vehicle.numberPlate];
    if (qInfo) setModalRenewalInfo(qInfo);
    setRenewalStep(1);
    setSelectedPlanType("One-Time");
    setRenewalWizardOpen(true);
  };

  // Initiate Stripe Payment (One-Time or Installment #X)
  const handleInitiateStripePayment = async (renewalId: string, installmentNumber: number = 1) => {
    if (!renewalId) {
      Alert.alert("Error", "Renewal ID not found. Please refresh.");
      return;
    }

    try {
      setIsRedirectingToStripe(true);

      // Save plan choice if using the wizard
      if (renewalWizardOpen && selectedPlanType) {
        await fetch(`${API_BASE_URL}/api/renewals/select-plan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ renewalId, planType: selectedPlanType }),
        });
      }

      const res = await fetch(`${API_BASE_URL}/api/renewals/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ renewalId, installmentNumber }),
      });

      const data = await res.json();

      if (!res.ok || !data.checkoutUrl) {
        Alert.alert("Payment Error", data.error || "Unable to initialize Stripe checkout gateway.");
        setIsRedirectingToStripe(false);
        return;
      }

      // Open in-app browser with Stripe checkout URL
      await WebBrowser.openBrowserAsync(data.checkoutUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        controlsColor: "#0284c7",
        toolbarColor: "#0f172a",
      });

      // User returned from browser - immediately verify session in real time
      if (data.sessionId) {
        try {
          const verifyRes = await fetch(`${API_BASE_URL}/api/renewals/verify-session`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: data.sessionId }),
          });
          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            setRenewalWizardOpen(false);
            setPaymentSuccessDetails({
              plate: selectedVehicleForModal?.numberPlate || "",
              installment: installmentNumber.toString(),
            });
            setPaymentSuccessModal(true);
          }
        } catch (e) {
          console.error("Error verifying payment session:", e);
        }
      }

      // Real-time refresh of renewal quote and vehicle records
      if (selectedVehicleForModal?.numberPlate) {
        fetchSingleVehicleRenewal(selectedVehicleForModal.numberPlate);
      }
      if (userNic) {
        fetchVehicles(userNic, true);
      }
    } catch (err: any) {
      console.error("Stripe payment error:", err);
      Alert.alert("Payment Error", err.message || "Failed to launch Stripe payment gateway.");
    } finally {
      setIsRedirectingToStripe(false);
    }
  };

  // Open Cover Note modal
  const handleOpenCoverNote = (vehicle: Vehicle) => {
    setCoverNoteVehicle(vehicle);
    setCoverNoteModalOpen(true);
  };

  const handleFileClaim = (vehicle: Vehicle) => {
    router.push({
      pathname: "/PolicyHolder/New_Claim" as any,
      params: { plate: vehicle.numberPlate },
    });
  };

  // Handle Add Vehicle Form Submission
  const handleAddVehicleSubmit = async () => {
    setValidationError(null);
    if (!userNic) {
      setValidationError("User session not found. Please log in again.");
      return;
    }

    if (
      !newCompany.trim() ||
      !newModel.trim() ||
      !newYear.trim() ||
      !newNumberPlate.trim() ||
      !newVehicleType.trim() ||
      !newPolicyNumber.trim() ||
      !newEngineNumber.trim() ||
      !newChassisNumber.trim()
    ) {
      setValidationError("All fields are required.");
      return;
    }

    const cleanPlate = newNumberPlate.replace(/[\s-]/g, "");
    if (cleanPlate.length < 5 || cleanPlate.length > 10 || !/^[A-Za-z0-9]+$/.test(cleanPlate)) {
      setValidationError("Number Plate must be between 5 and 10 alphanumeric characters.");
      return;
    }

    if (!/^\d{4}$/.test(newYear.trim())) {
      setValidationError("Year must be a 4-digit number.");
      return;
    }

    const cleanPolicy = newPolicyNumber.replace(/[\s-]/g, "");
    if (!/^SAN[A-Za-z0-9]{5,9}$/i.test(cleanPolicy)) {
      setValidationError("Policy Number must start with 'SAN' and be between 8 and 12 characters.");
      return;
    }

    setIsSubmitting(true);
    const payload = {
      nic: userNic,
      company: newCompany.trim(),
      model: newModel.trim(),
      year: newYear.trim(),
      numberPlate: newNumberPlate.trim(),
      vehicleType: newVehicleType.trim(),
      policyNumber: newPolicyNumber.trim(),
      engineNumber: newEngineNumber.trim(),
      chassisNumber: newChassisNumber.trim(),
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/policy-holder/add-vehicle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setValidationError(data.error || "Failed to add vehicle.");
        setIsSubmitting(false);
        return;
      }

      const userStr = await AsyncStorage.getItem("logged_in_user");
      if (userStr) {
        const user = JSON.parse(userStr);
        const updatedUser = { ...user, vehicles: data.vehicles || [...(user.vehicles || []), data.vehicle] };
        await AsyncStorage.setItem("logged_in_user", JSON.stringify(updatedUser));
      }

      setVehicles(data.vehicles || [...vehicles, data.vehicle]);
      setIsAddModalOpen(false);
      setNewCompany("");
      setNewModel("");
      setNewYear("");
      setNewNumberPlate("");
      setNewVehicleType("Car");
      setNewPolicyNumber("");
      setNewEngineNumber("");
      setNewChassisNumber("");
      showCustomAlert(
        "Registration Under Review",
        "Your vehicle details have been submitted successfully. Regional branch staff will review and verify your policy information.\n\nYou will be notified once approved.",
        "success"
      );
    } catch (err) {
      setValidationError("Unable to connect to the server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter Categories
  const filteredVehicles = vehicles.filter((v) => {
    const term = searchQuery.toLowerCase();
    const matchesSearch =
      v.numberPlate.toLowerCase().includes(term) ||
      (v.company || "").toLowerCase().includes(term) ||
      (v.model || "").toLowerCase().includes(term) ||
      (v.policyNumber || "").toLowerCase().includes(term);

    if (!matchesSearch) return false;

    if (activeCategory === "All") return true;
    const cat = activeCategory.toLowerCase();
    const vType = (v.vehicleType || "").toLowerCase();

    if (cat === "car") return vType.includes("car");
    if (cat === "suv") return vType.includes("suv");
    if (cat === "bike") return vType.includes("bike") || vType.includes("motorcycle") || vType.includes("scooter");
    if (cat === "truck") return vType.includes("truck") || vType.includes("lorry");
    if (cat === "other") {
      return (
        !vType.includes("car") &&
        !vType.includes("suv") &&
        !vType.includes("bike") &&
        !vType.includes("motorcycle") &&
        !vType.includes("scooter") &&
        !vType.includes("truck") &&
        !vType.includes("lorry")
      );
    }

    return true;
  });

  const categories = [
    { id: "All", label: "All" },
    { id: "Car", label: "Cars" },
    { id: "SUV", label: "SUVs" },
    { id: "Bike", label: "Motorbikes" },
    { id: "Truck", label: "Trucks" },
    { id: "Other", label: "Others" },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Header Background */}
      <ImageBackground
        source={require("../../assets/images/policy1.jpg")}
        style={styles.headerBackground}
        imageStyle={styles.headerImageStyle}
      >
        <LinearGradient
          colors={["rgba(15, 23, 42, 0.95)", "rgba(15, 23, 42, 0.82)", "rgba(15, 23, 42, 0.5)"]}
          style={styles.headerGradient}
        >
          <Text style={styles.headerTitle}>My Vehicles</Text>
          <Text style={styles.headerSubtitle}>Registered vehicles and active insurance policies</Text>
        </LinearGradient>
      </ImageBackground>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={styles.loaderText}>Loading vehicles registry...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0284c7" colors={["#0284c7"]} />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {/* Search bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={18} color="#64748b" style={styles.searchIcon} />
            <TextInput
              placeholder="Search make, plate, or policy..."
              placeholderTextColor="#94a3b8"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color="#64748b" />
              </TouchableOpacity>
            )}
          </View>

          {/* Categories select tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryContent}
          >
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setActiveCategory(cat.id)}
                  style={[styles.categoryPill, isActive && styles.categoryPillActive]}
                >
                  <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Stats Summaries */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={[styles.statIconBox, { backgroundColor: "#f0f9ff" }]}>
                <MaterialCommunityIcons name="car-multiple" size={22} color="#0284c7" />
              </View>
              <View>
                <Text style={styles.statNum}>{vehicles.length}</Text>
                <Text style={styles.statLabel}>Total Insured</Text>
              </View>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconBox, { backgroundColor: "#f0fdf4" }]}>
                <MaterialCommunityIcons name="shield-check" size={22} color="#16a34a" />
              </View>
              <View>
                <Text style={styles.statNum}>{vehicles.filter((v) => v.policyNumber).length}</Text>
                <Text style={styles.statLabel}>Active Policies</Text>
              </View>
            </View>
          </View>

          {/* Vehicles list */}
          {filteredVehicles.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="car-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>No matching vehicles found.</Text>
            </View>
          ) : (
            filteredVehicles.map((v, idx) => {
              const qInfo = renewalMap[v.numberPlate];
              const iInfo = installmentMap[v.numberPlate];
              const isQuoteReady = qInfo?.hasCalculatedQuote && qInfo?.renewalQuote?.status === "Calculated";
              const isInstallmentDue = iInfo?.hasActivePlan && iInfo?.nextInstallment;
              const isRenewed = qInfo?.isRenewed || iInfo?.isFullyPaid;

              return (
                <View key={idx} style={styles.vehicleCard}>
                  {/* Header Row */}
                  <View style={styles.cardHeader}>
                    <View
                      style={[
                        styles.iconBox,
                        {
                          backgroundColor: getVehicleTheme(v.vehicleType).bg,
                          borderColor: getVehicleTheme(v.vehicleType).border,
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={getVehicleTheme(v.vehicleType).icon as any}
                        size={28}
                        color={getVehicleTheme(v.vehicleType).color}
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.plateText}>{formatPlate(v.numberPlate)}</Text>
                      <Text style={styles.companyModelText}>
                        {[v.company, v.model].filter(Boolean).join(" ")} ({v.year})
                      </Text>
                    </View>

                    {/* Real-time Status Badge */}
                    {isQuoteReady ? (
                      <View style={[styles.statusBadge, { backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" }]}>
                        <View style={[styles.dot, { backgroundColor: "#10b981" }]} />
                        <Text style={[styles.badgeLabel, { color: "#047857" }]}>Quote Ready</Text>
                      </View>
                    ) : isInstallmentDue ? (
                      <View style={[styles.statusBadge, { backgroundColor: "#fffbeb", borderColor: "#fde68a" }]}>
                        <View style={[styles.dot, { backgroundColor: "#f59e0b" }]} />
                        <Text style={[styles.badgeLabel, { color: "#b45309" }]}>Due Installment</Text>
                      </View>
                    ) : isRenewed ? (
                      <View style={[styles.statusBadge, { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }]}>
                        <View style={[styles.dot, { backgroundColor: "#22c55e" }]} />
                        <Text style={[styles.badgeLabel, { color: "#16a34a" }]}>Renewed</Text>
                      </View>
                    ) : (
                      <View style={styles.statusBadge}>
                        <View style={styles.dot} />
                        <Text style={styles.badgeLabel}>Active</Text>
                      </View>
                    )}
                  </View>

                  {/* Real-time Renewal Alert Banner (If Quote Ready or Installment Due) */}
                  {isQuoteReady && qInfo.renewalQuote && (
                    <View style={styles.quoteReadyBanner}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.quoteReadyTitle}>License Renewal Quote Calculated</Text>
                        <Text style={styles.quoteReadyAmount}>
                          Total Fee: LKR {qInfo.renewalQuote.calculation?.totalRenewalAmount?.toLocaleString()}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.quoteReadyBtn}
                        onPress={() => handleOpenRenewalWizard(v)}
                        activeOpacity={0.8}
                      >
                        <MaterialCommunityIcons name="refresh" size={15} color="#ffffff" />
                        <Text style={styles.quoteReadyBtnText}>Renew Now</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {isInstallmentDue && iInfo.nextInstallment && (
                    <View style={styles.installmentDueBanner}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.installmentDueTitle}>
                          {iInfo.nextInstallment.label || `Installment #${iInfo.nextInstallment.installmentNumber}`} Due
                        </Text>
                        <Text style={styles.installmentDueAmount}>
                          Amount: LKR {iInfo.nextInstallment.amount?.toLocaleString()} (Due:{" "}
                          {new Date(iInfo.nextInstallment.dueDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                          )
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.installmentDueBtn}
                        onPress={() => handleInitiateStripePayment(iInfo.renewal._id, iInfo.nextInstallment.installmentNumber)}
                        activeOpacity={0.8}
                      >
                        <MaterialCommunityIcons name="credit-card-outline" size={14} color="#ffffff" />
                        <Text style={styles.installmentDueBtnText}>Pay Due</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={styles.cardDivider} />

                  {/* Technical specs list */}
                  <View style={styles.specsList}>
                    <View style={styles.specItem}>
                      <Text style={styles.specLabel}>Policy Number</Text>
                      <Text style={styles.specVal}>{v.policyNumber || "SGI-88942-019"}</Text>
                    </View>
                    <View style={styles.specItem}>
                      <Text style={styles.specLabel}>Vehicle Type</Text>
                      <Text style={styles.specVal}>{v.vehicleType || "Car"}</Text>
                    </View>
                    <View style={styles.specItem}>
                      <Text style={styles.specLabel}>Engine Number</Text>
                      <Text style={styles.specVal}>{v.engineNumber || "1NZ-FE-778122"}</Text>
                    </View>
                    <View style={styles.specItemNoBorder}>
                      <Text style={styles.specLabel}>Chassis Number</Text>
                      <Text style={styles.specVal}>{v.chassisNumber || "NZE141-8890204"}</Text>
                    </View>
                  </View>

                  {/* Quick actions row */}
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: "#e0f2fe" }]}
                      onPress={() => handleOpenVehicleModal(v)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="eye-outline" size={15} color="#0284c7" />
                      <Text style={[styles.actionBtnText, { color: "#0284c7" }]}>View & Renew</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: "#f0fdf4" }]}
                      onPress={() => handleOpenCoverNote(v)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="document-text-outline" size={15} color="#16a34a" />
                      <Text style={[styles.actionBtnText, { color: "#16a34a" }]}>Cover Note</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: "#fee2e2" }]}
                      onPress={() => handleFileClaim(v)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="alert-circle-outline" size={15} color="#dc2626" />
                      <Text style={[styles.actionBtnText, { color: "#dc2626" }]}>File Claim</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}

          {/* Dashed Add Vehicle Card */}
          <TouchableOpacity
            style={styles.dashedAddCard}
            onPress={() => setIsAddModalOpen(true)}
            activeOpacity={0.7}
          >
            <View style={styles.dashedAddIconBox}>
              <Ionicons name="add-outline" size={26} color="#0284c7" />
            </View>
            <Text style={styles.dashedAddTitle}>Add Another Vehicle</Text>
            <Text style={styles.dashedAddDesc}>Register another vehicle to your active policy coverage</Text>
          </TouchableOpacity>

          {/* Galle office Support banner */}
          <View style={styles.helpBanner}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.helpTitle}>Need to update registry?</Text>
              <Text style={styles.helpDesc}>
                If any vehicle is missing, reach out to Galle regional office or message your agent.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.helpBtn}
              onPress={() =>
                showCustomAlert("Support Contact", "Please call our Galle Regional office at: +94 91 224 8890", "info")
              }
            >
              <Text style={styles.helpBtnText}>Support</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ── 1. VEHICLE SPECIFICATIONS & RENEWAL MODAL ── */}
      {selectedVehicleForModal && (
        <Modal
          visible={!!selectedVehicleForModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSelectedVehicleForModal(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalOverlayLarge}>
              {/* Header */}
              <View style={styles.modalHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitleLarge}>Vehicle & Policy Details</Text>
                  <Text style={styles.modalSubPlate}>
                    {selectedVehicleForModal.company} {selectedVehicleForModal.model} ({formatPlate(selectedVehicleForModal.numberPlate)})
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedVehicleForModal(null)}
                  style={styles.modalCloseIconBtn}
                >
                  <Ionicons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.vehicleDetailsScroll}
              >
                {/* Vehicle Quick Profile Card */}
                <View style={styles.modalProfileCard}>
                  <View
                    style={[
                      styles.iconBoxLarge,
                      {
                        backgroundColor: getVehicleTheme(selectedVehicleForModal.vehicleType).bg,
                        borderColor: getVehicleTheme(selectedVehicleForModal.vehicleType).border,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={getVehicleTheme(selectedVehicleForModal.vehicleType).icon as any}
                      size={32}
                      color={getVehicleTheme(selectedVehicleForModal.vehicleType).color}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.modalVehicleName}>
                      {selectedVehicleForModal.company} {selectedVehicleForModal.model}
                    </Text>
                    <Text style={styles.modalVehicleMeta}>
                      Year: {selectedVehicleForModal.year} · Type: {selectedVehicleForModal.vehicleType}
                    </Text>
                  </View>
                </View>

                {/* Technical Specifications Grid */}
                <View style={styles.specsGridBox}>
                  <View style={styles.specGridRow}>
                    <View style={styles.specGridCol}>
                      <Text style={styles.specGridLabel}>NUMBER PLATE</Text>
                      <Text style={styles.specGridVal}>{formatPlate(selectedVehicleForModal.numberPlate)}</Text>
                    </View>
                    <View style={styles.specGridCol}>
                      <Text style={styles.specGridLabel}>POLICY NUMBER</Text>
                      <Text style={styles.specGridVal}>{selectedVehicleForModal.policyNumber || "SGI-88942-019"}</Text>
                    </View>
                  </View>

                  <View style={styles.specGridRow}>
                    <View style={styles.specGridCol}>
                      <Text style={styles.specGridLabel}>ENGINE NUMBER</Text>
                      <Text style={styles.specGridValMono}>{selectedVehicleForModal.engineNumber || "1NZ-FE-778122"}</Text>
                    </View>
                    <View style={styles.specGridCol}>
                      <Text style={styles.specGridLabel}>CHASSIS NUMBER</Text>
                      <Text style={styles.specGridValMono}>{selectedVehicleForModal.chassisNumber || "NZE141-8890204"}</Text>
                    </View>
                  </View>

                  <View style={styles.specGridRowNoBorder}>
                    <View style={styles.specGridCol}>
                      <Text style={styles.specGridLabel}>INSURANCE COVERAGE</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
                        <View style={[styles.dot, { backgroundColor: "#22c55e" }]} />
                        <Text style={[styles.specGridVal, { color: "#16a34a" }]}>Active Coverage</Text>
                      </View>
                    </View>
                    <View style={styles.specGridCol}>
                      <Text style={styles.specGridLabel}>POLICY EXPIRATION</Text>
                      <Text style={styles.specGridVal}>
                        {modalRenewalInfo?.expiryDate
                          ? new Date(modalRenewalInfo.expiryDate).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : selectedVehicleForModal.policyExpiryDate
                          ? new Date(selectedVehicleForModal.policyExpiryDate).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "Nov 21, 2027"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* ── REAL-TIME POLICY RENEWAL SECTION ── */}
                <View style={styles.renewalSectionWrapper}>
                  <View style={styles.sectionHeadingRow}>
                    <MaterialCommunityIcons name="shield-sync" size={20} color="#0284c7" />
                    <Text style={styles.sectionHeadingText}>Policy Renewal & Payment Status</Text>
                  </View>

                  {/* 1. When Quote is calculated and ready for renewal */}
                  {modalRenewalInfo?.hasCalculatedQuote && modalRenewalInfo?.renewalQuote?.status === "Calculated" && (
                    <View style={styles.calculatedQuoteCard}>
                      <View style={styles.quoteHeader}>
                        <View style={{ flex: 1 }}>
                          <View style={styles.quoteBadgeReady}>
                            <Text style={styles.quoteBadgeReadyText}>QUOTE READY FOR RENEWAL</Text>
                          </View>
                          <Text style={styles.quoteStaffInfo}>
                            Calculated by {modalRenewalInfo.renewalQuote.calculatedBy?.staffName || "Branch Staff"} (
                            {modalRenewalInfo.renewalQuote.branch} Branch)
                          </Text>
                        </View>
                      </View>

                      {/* Fee Breakdown Sheet */}
                      <View style={styles.feeBreakdownBox}>
                        <View style={styles.feeRow}>
                          <Text style={styles.feeLabel}>Vehicle Market Valuation</Text>
                          <Text style={styles.feeVal}>
                            LKR {modalRenewalInfo.renewalQuote.calculation?.marketValuation?.toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.feeRow}>
                          <Text style={styles.feeLabel}>
                            Basic Premium ({modalRenewalInfo.renewalQuote.calculation?.basicPremiumRate}%)
                          </Text>
                          <Text style={styles.feeVal}>
                            LKR {modalRenewalInfo.renewalQuote.calculation?.basicPremium?.toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.feeRow}>
                          <Text style={[styles.feeLabel, { color: "#16a34a" }]}>
                            No-Claim Bonus Discount ({modalRenewalInfo.renewalQuote.calculation?.noClaimBonusDiscount}%)
                          </Text>
                          <Text style={[styles.feeVal, { color: "#16a34a" }]}>
                            - LKR {modalRenewalInfo.renewalQuote.calculation?.discountAmount?.toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.feeRow}>
                          <Text style={styles.feeLabel}>Administrative Fee & Taxes</Text>
                          <Text style={styles.feeVal}>
                            + LKR{" "}
                            {(
                              modalRenewalInfo.renewalQuote.calculation?.adminFee +
                              (modalRenewalInfo.renewalQuote.calculation?.govtTaxes || 0)
                            )?.toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.feeTotalRow}>
                          <Text style={styles.feeTotalLabel}>Total Renewal License Fee</Text>
                          <Text style={styles.feeTotalVal}>
                            LKR {modalRenewalInfo.renewalQuote.calculation?.totalRenewalAmount?.toLocaleString()}
                          </Text>
                        </View>
                      </View>

                      {/* Action Button: Launch Renewal Wizard */}
                      <TouchableOpacity
                        style={styles.renewActionBtn}
                        onPress={() => handleOpenRenewalWizard(selectedVehicleForModal)}
                        activeOpacity={0.8}
                      >
                        <MaterialCommunityIcons name="refresh" size={18} color="#ffffff" />
                        <Text style={styles.renewActionBtnText}>Renew License Coverage</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* 2. When on Active Installment Plan */}
                  {modalInstallmentInfo?.hasActivePlan && modalInstallmentInfo?.nextInstallment && (
                    <View style={styles.activeInstallmentBox}>
                      <View style={styles.installmentHeaderRow}>
                        <View style={{ flex: 1 }}>
                          <View style={styles.installmentBadge}>
                            <Text style={styles.installmentBadgeText}>ACTIVE INSTALLMENT PLAN</Text>
                          </View>
                          <Text style={styles.installmentProgressText}>
                            {modalInstallmentInfo.paidCount || 1} of {modalInstallmentInfo.totalCount || 4} Installments Completed
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.payInstallmentBtn}
                          disabled={isRedirectingToStripe}
                          onPress={() =>
                            handleInitiateStripePayment(
                              modalInstallmentInfo.renewal._id,
                              modalInstallmentInfo.nextInstallment.installmentNumber
                            )
                          }
                          activeOpacity={0.8}
                        >
                          <MaterialCommunityIcons name="credit-card-outline" size={14} color="#ffffff" />
                          <Text style={styles.payInstallmentBtnText}>
                            {isRedirectingToStripe ? "Connecting..." : `Pay Installment #${modalInstallmentInfo.nextInstallment.installmentNumber}`}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Next due highlight card */}
                      <View style={styles.nextDueCard}>
                        <Text style={styles.nextDueLabel}>Next Due Payment:</Text>
                        <View style={styles.nextDueDetailsRow}>
                          <Text style={styles.nextDueAmount}>
                            LKR {modalInstallmentInfo.nextInstallment.amount?.toLocaleString()}
                          </Text>
                          <Text style={styles.nextDueDate}>
                            Due on{" "}
                            {new Date(modalInstallmentInfo.nextInstallment.dueDate).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </Text>
                        </View>
                      </View>

                      {/* Installment History Schedule Table */}
                      {modalInstallmentInfo.renewal?.installments && (
                        <View style={styles.installmentScheduleBox}>
                          <Text style={styles.scheduleTitle}>Payment Schedule & History</Text>
                          {modalInstallmentInfo.renewal.installments.map((inst: any, idx: number) => {
                            const isPaid = inst.status === "Paid";
                            const isNext =
                              !isPaid &&
                              modalInstallmentInfo.nextInstallment?.installmentNumber === inst.installmentNumber;

                            return (
                              <View
                                key={inst._id || idx}
                                style={[
                                  styles.scheduleItemRow,
                                  isPaid && styles.scheduleItemPaid,
                                  isNext && styles.scheduleItemNext,
                                ]}
                              >
                                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                                  <View
                                    style={[
                                      styles.scheduleNumBadge,
                                      isPaid && { backgroundColor: "#16a34a" },
                                      isNext && { backgroundColor: "#f59e0b" },
                                    ]}
                                  >
                                    <Text style={styles.scheduleNumBadgeText}>{isPaid ? "✓" : inst.installmentNumber}</Text>
                                  </View>
                                  <View style={{ marginLeft: 10 }}>
                                    <Text style={styles.scheduleItemName}>
                                      {inst.label || `Installment #${inst.installmentNumber}`}
                                    </Text>
                                    <Text style={styles.scheduleItemDate}>
                                      {isPaid
                                        ? `Paid on ${new Date(inst.paidAt || Date.now()).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                          })} · Verified`
                                        : `Due: ${new Date(inst.dueDate).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                          })}`}
                                    </Text>
                                  </View>
                                </View>
                                <View style={{ alignItems: "flex-end" }}>
                                  <Text style={styles.scheduleItemAmount}>LKR {inst.amount?.toLocaleString()}</Text>
                                  <Text
                                    style={[
                                      styles.scheduleStatusTag,
                                      isPaid
                                        ? { color: "#16a34a", backgroundColor: "#f0fdf4" }
                                        : isNext
                                        ? { color: "#b45309", backgroundColor: "#fffbeb" }
                                        : { color: "#64748b", backgroundColor: "#f1f5f9" },
                                    ]}
                                  >
                                    {isPaid ? "PAID" : isNext ? "DUE NOW" : "SCHEDULED"}
                                  </Text>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  )}

                  {/* 3. When Fully Paid / Renewed */}
                  {(modalRenewalInfo?.renewalQuote?.status === "Fully_Paid" || modalInstallmentInfo?.isFullyPaid) && (
                    <View style={styles.fullyPaidCard}>
                      <View style={styles.fullyPaidIconBox}>
                        <Ionicons name="checkmark-done-circle" size={32} color="#16a34a" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.fullyPaidTitle}>Policy Renewed & Confirmed</Text>
                        <Text style={styles.fullyPaidSubtitle}>
                          Full coverage is active. All installments are settled.
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* 4. When not yet calculated */}
                  {!modalRenewalInfo?.hasCalculatedQuote &&
                    !modalInstallmentInfo?.hasActivePlan &&
                    !modalRenewalInfo?.isRenewed && (
                      <View style={styles.notCalculatedNotice}>
                        <Ionicons name="information-circle-outline" size={20} color="#0284c7" />
                        <Text style={styles.notCalculatedText}>
                          Your annual policy expires on{" "}
                          <Text style={{ fontWeight: "700" }}>
                            {modalRenewalInfo?.expiryDate
                              ? new Date(modalRenewalInfo.expiryDate).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })
                              : "the end of cycle"}
                          </Text>
                          . Regional office staff will inspect and post your renewal valuation quote within 30-45 days before expiry.
                        </Text>
                      </View>
                    )}
                </View>

                {/* Modal Action Buttons: File Claim & Cover Note */}
                <View style={styles.modalActionsRow}>
                  <TouchableOpacity
                    style={[styles.modalActionPrimary, { backgroundColor: "#dc2626" }]}
                    onPress={() => {
                      setSelectedVehicleForModal(null);
                      handleFileClaim(selectedVehicleForModal);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="alert-circle-outline" size={18} color="#ffffff" />
                    <Text style={styles.modalActionPrimaryText}>File a Claim</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalActionPrimary, { backgroundColor: "#0284c7" }]}
                    onPress={() => {
                      handleOpenCoverNote(selectedVehicleForModal);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="document-text-outline" size={18} color="#ffffff" />
                    <Text style={styles.modalActionPrimaryText}>Cover Note</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              {/* Modal Footer */}
              <View style={styles.modalFooterRow}>
                <TouchableOpacity
                  style={styles.modalCloseFullBtn}
                  onPress={() => setSelectedVehicleForModal(null)}
                >
                  <Text style={styles.modalCloseFullBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ── 2. 3-STEP RENEWAL WIZARD MODAL ── */}
      {renewalWizardOpen && selectedVehicleForModal && modalRenewalInfo?.renewalQuote && (
        <Modal
          visible={renewalWizardOpen}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setRenewalWizardOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.wizardOverlay}>
              {/* Wizard Header */}
              <View style={styles.wizardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.wizardTitle}>Policy Renewal Wizard</Text>
                  <Text style={styles.wizardSubtitle}>
                    {selectedVehicleForModal.company} {selectedVehicleForModal.model} ({formatPlate(selectedVehicleForModal.numberPlate)})
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setRenewalWizardOpen(false)}>
                  <Ionicons name="close" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>

              {/* Steps Progress Indicator */}
              <View style={styles.stepsIndicatorRow}>
                <View style={styles.stepCol}>
                  <View style={[styles.stepCircle, renewalStep >= 1 && styles.stepCircleActive]}>
                    <Text style={[styles.stepCircleText, renewalStep >= 1 && styles.stepCircleTextActive]}>1</Text>
                  </View>
                  <Text style={[styles.stepLabel, renewalStep >= 1 && styles.stepLabelActive]}>Quote</Text>
                </View>
                <View style={[styles.stepLine, renewalStep >= 2 && styles.stepLineActive]} />
                <View style={styles.stepCol}>
                  <View style={[styles.stepCircle, renewalStep >= 2 && styles.stepCircleActive]}>
                    <Text style={[styles.stepCircleText, renewalStep >= 2 && styles.stepCircleTextActive]}>2</Text>
                  </View>
                  <Text style={[styles.stepLabel, renewalStep >= 2 && styles.stepLabelActive]}>Plan</Text>
                </View>
                <View style={[styles.stepLine, renewalStep >= 3 && styles.stepLineActive]} />
                <View style={styles.stepCol}>
                  <View style={[styles.stepCircle, renewalStep >= 3 && styles.stepCircleActive]}>
                    <Text style={[styles.stepCircleText, renewalStep >= 3 && styles.stepCircleTextActive]}>3</Text>
                  </View>
                  <Text style={[styles.stepLabel, renewalStep >= 3 && styles.stepLabelActive]}>Pay</Text>
                </View>
              </View>

              {/* Step Content */}
              <ScrollView contentContainerStyle={styles.wizardBodyScroll}>
                {/* STEP 1: Quote Calculation Breakdown */}
                {renewalStep === 1 && (
                  <View style={{ gap: 14 }}>
                    <View style={styles.wizardInfoAlert}>
                      <Ionicons name="shield-checkmark-outline" size={20} color="#0284c7" />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.wizardAlertTitle}>Office Staff Valuation Completed</Text>
                        <Text style={styles.wizardAlertDesc}>
                          Calculated for {modalRenewalInfo.renewalQuote.branch} Branch · Policy extension: 1 Full Year
                        </Text>
                      </View>
                    </View>

                    <View style={styles.calculationSheet}>
                      <View style={styles.calcRow}>
                        <Text style={styles.calcLabel}>Vehicle Valuation</Text>
                        <Text style={styles.calcVal}>
                          LKR {modalRenewalInfo.renewalQuote.calculation?.marketValuation?.toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.calcRow}>
                        <Text style={styles.calcLabel}>
                          Basic Premium ({modalRenewalInfo.renewalQuote.calculation?.basicPremiumRate}%)
                        </Text>
                        <Text style={styles.calcVal}>
                          LKR {modalRenewalInfo.renewalQuote.calculation?.basicPremium?.toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.calcRow}>
                        <Text style={[styles.calcLabel, { color: "#16a34a" }]}>
                          No-Claim Bonus ({modalRenewalInfo.renewalQuote.calculation?.noClaimBonusDiscount}%)
                        </Text>
                        <Text style={[styles.calcVal, { color: "#16a34a" }]}>
                          - LKR {modalRenewalInfo.renewalQuote.calculation?.discountAmount?.toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.calcRow}>
                        <Text style={styles.calcLabel}>Administrative Fee & Taxes</Text>
                        <Text style={styles.calcVal}>
                          + LKR{" "}
                          {(
                            modalRenewalInfo.renewalQuote.calculation?.adminFee +
                            (modalRenewalInfo.renewalQuote.calculation?.govtTaxes || 0)
                          )?.toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.calcTotalRow}>
                        <Text style={styles.calcTotalLabel}>Total Renewal Fee</Text>
                        <Text style={styles.calcTotalVal}>
                          LKR {modalRenewalInfo.renewalQuote.calculation?.totalRenewalAmount?.toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* STEP 2: Choose Payment Mode */}
                {renewalStep === 2 && (
                  <View style={{ gap: 14 }}>
                    <Text style={styles.planSectionTitle}>Choose Your Payment Preference:</Text>

                    {/* Option 1: One-Time Full Payment */}
                    <TouchableOpacity
                      style={[
                        styles.planRadioCard,
                        selectedPlanType === "One-Time" && styles.planRadioCardSelected,
                      ]}
                      onPress={() => setSelectedPlanType("One-Time")}
                      activeOpacity={0.8}
                    >
                      <View style={styles.planRadioCircle}>
                        {selectedPlanType === "One-Time" && <View style={styles.planRadioCircleInner} />}
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.planTitle}>One-Time Full Payment</Text>
                        <Text style={styles.planSubtitle}>Pay 100% annual premium upfront</Text>
                      </View>
                      <Text style={styles.planPrice}>
                        LKR {modalRenewalInfo.renewalQuote.calculation?.totalRenewalAmount?.toLocaleString()}
                      </Text>
                    </TouchableOpacity>

                    {/* Option 2: 2 Installments */}
                    <TouchableOpacity
                      style={[
                        styles.planRadioCard,
                        selectedPlanType === "2-Installments" && styles.planRadioCardSelected,
                      ]}
                      onPress={() => setSelectedPlanType("2-Installments")}
                      activeOpacity={0.8}
                    >
                      <View style={styles.planRadioCircle}>
                        {selectedPlanType === "2-Installments" && <View style={styles.planRadioCircleInner} />}
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.planTitle}>2 Semi-Annual Installments</Text>
                        <Text style={styles.planSubtitle}>50% today + 50% in 6 months</Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.planPrice}>
                          LKR{" "}
                          {Math.round(
                            modalRenewalInfo.renewalQuote.calculation?.totalRenewalAmount / 2
                          ).toLocaleString()}
                        </Text>
                        <Text style={styles.planSubPrice}>per 6 months (x2)</Text>
                      </View>
                    </TouchableOpacity>

                    {/* Option 3: 4 Quarterly Installments */}
                    <TouchableOpacity
                      style={[
                        styles.planRadioCard,
                        selectedPlanType === "4-Installments" && styles.planRadioCardSelected,
                      ]}
                      onPress={() => setSelectedPlanType("4-Installments")}
                      activeOpacity={0.8}
                    >
                      <View style={styles.planRadioCircle}>
                        {selectedPlanType === "4-Installments" && <View style={styles.planRadioCircleInner} />}
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.planTitle}>4 Quarterly Installments</Text>
                        <Text style={styles.planSubtitle}>25% today + 3 quarterly payments</Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.planPrice}>
                          LKR{" "}
                          {Math.round(
                            modalRenewalInfo.renewalQuote.calculation?.totalRenewalAmount / 4
                          ).toLocaleString()}
                        </Text>
                        <Text style={styles.planSubPrice}>per quarter (x4)</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                {/* STEP 3: Checkout Summary & Launch Stripe */}
                {renewalStep === 3 && (
                  <View style={{ gap: 14 }}>
                    <View style={styles.checkoutSummaryCard}>
                      <Text style={styles.checkoutSummaryHeader}>CHECKOUT SUMMARY</Text>
                      <View style={styles.checkoutRow}>
                        <Text style={styles.checkoutLabel}>Selected Plan</Text>
                        <Text style={styles.checkoutVal}>{selectedPlanType}</Text>
                      </View>
                      <View style={styles.checkoutRow}>
                        <Text style={styles.checkoutLabel}>Total Annual Fee</Text>
                        <Text style={styles.checkoutVal}>
                          LKR {modalRenewalInfo.renewalQuote.calculation?.totalRenewalAmount?.toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.checkoutTotalRow}>
                        <View>
                          <Text style={styles.dueTodayLabel}>Amount Due Today</Text>
                          <Text style={styles.dueTodaySub}>
                            {selectedPlanType === "One-Time" ? "Full payment" : "1st installment activation"}
                          </Text>
                        </View>
                        <Text style={styles.dueTodayAmount}>
                          LKR{" "}
                          {selectedPlanType === "One-Time"
                            ? modalRenewalInfo.renewalQuote.calculation?.totalRenewalAmount?.toLocaleString()
                            : selectedPlanType === "2-Installments"
                            ? Math.round(
                                modalRenewalInfo.renewalQuote.calculation?.totalRenewalAmount / 2
                              ).toLocaleString()
                            : Math.round(
                                modalRenewalInfo.renewalQuote.calculation?.totalRenewalAmount / 4
                              ).toLocaleString()}
                        </Text>
                      </View>
                    </View>

                    {/* Stripe 256-Bit SSL Gateway Badge */}
                    <View style={styles.stripeGateCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.stripeGateTitle}>Stripe 256-Bit SSL Encrypted</Text>
                        <Text style={styles.stripeGateSub}>Visa, MasterCard, Amex, Apple Pay, Google Pay</Text>
                      </View>
                      <MaterialCommunityIcons name="credit-card-lock" size={28} color="#ffffff" />
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Wizard Footer Navigation */}
              <View style={styles.wizardFooter}>
                {renewalStep > 1 ? (
                  <TouchableOpacity
                    style={styles.wizardBackBtn}
                    onPress={() => setRenewalStep((prev) => (prev - 1) as 1 | 2 | 3)}
                  >
                    <Text style={styles.wizardBackBtnText}>Back</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.wizardBackBtn}
                    onPress={() => setRenewalWizardOpen(false)}
                  >
                    <Text style={styles.wizardBackBtnText}>Cancel</Text>
                  </TouchableOpacity>
                )}

                {renewalStep < 3 ? (
                  <TouchableOpacity
                    style={styles.wizardNextBtn}
                    onPress={() => setRenewalStep((prev) => (prev + 1) as 1 | 2 | 3)}
                  >
                    <Text style={styles.wizardNextBtnText}>Next Step</Text>
                    <Ionicons name="arrow-forward" size={16} color="#ffffff" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.wizardPayBtn, isRedirectingToStripe && { opacity: 0.7 }]}
                    disabled={isRedirectingToStripe}
                    onPress={() => handleInitiateStripePayment(modalRenewalInfo.renewalQuote._id, 1)}
                  >
                    {isRedirectingToStripe ? (
                      <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
                    ) : (
                      <MaterialCommunityIcons name="lock" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                    )}
                    <Text style={styles.wizardPayBtnText}>
                      {isRedirectingToStripe ? "Opening Stripe..." : "Pay Securely with Stripe"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ── 3. OFFICIAL COVER NOTE CERTIFICATE MODAL ── */}
      {coverNoteModalOpen && coverNoteVehicle && (
        <Modal
          visible={coverNoteModalOpen}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setCoverNoteModalOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.coverNoteCard}>
              <View style={styles.coverNoteHeader}>
                <View>
                  <Text style={styles.coverNoteHeaderCompany}>SANASA GENERAL INSURANCE</Text>
                  <Text style={styles.coverNoteHeaderDoc}>MOTOR INSURANCE COVER NOTE</Text>
                </View>
                <TouchableOpacity onPress={() => setCoverNoteModalOpen(false)}>
                  <Ionicons name="close" size={24} color="#0f172a" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ padding: 16 }}>
                <View style={styles.certMetaRow}>
                  <Text style={styles.certMetaText}>Certificate: CN-{coverNoteVehicle.policyNumber || "SGI"}-{new Date().getFullYear()}</Text>
                  <Text style={styles.certMetaText}>Issue Date: {new Date().toLocaleDateString()}</Text>
                </View>

                <View style={styles.certSection}>
                  <Text style={styles.certSectionHeader}>INSURED DETAILS</Text>
                  <Text style={styles.certRowText}>Policyholder: {userInfo?.firstName ? `${userInfo.firstName} ${userInfo.lastName || ""}` : "Valued Customer"}</Text>
                  <Text style={styles.certRowText}>NIC Number: {userInfo?.nic || userNic}</Text>
                  <Text style={styles.certRowText}>Policy Number: {coverNoteVehicle.policyNumber || "SGI-88942-019"}</Text>
                  <Text style={styles.certRowText}>Coverage Status: ACTIVE COVERAGE</Text>
                </View>

                <View style={styles.certSection}>
                  <Text style={styles.certSectionHeader}>VEHICLE SPECIFICATIONS</Text>
                  <Text style={styles.certRowText}>Plate: {formatPlate(coverNoteVehicle.numberPlate)}</Text>
                  <Text style={styles.certRowText}>Type: {coverNoteVehicle.vehicleType}</Text>
                  <Text style={styles.certRowText}>Make & Model: {coverNoteVehicle.company} {coverNoteVehicle.model} ({coverNoteVehicle.year})</Text>
                  <Text style={styles.certRowText}>Engine No: {coverNoteVehicle.engineNumber || "N/A"}</Text>
                  <Text style={styles.certRowText}>Chassis No: {coverNoteVehicle.chassisNumber || "N/A"}</Text>
                </View>

                <View style={styles.certSection}>
                  <Text style={styles.certSectionHeader}>PAYMENT & VALIDITY</Text>
                  <Text style={styles.certRowText}>Branch: Galle Regional Branch</Text>
                  <Text style={styles.certRowText}>Coverage: Comprehensive Motor Policy</Text>
                  <Text style={styles.certRowText}>Status: Confirmed & Verified</Text>
                </View>

                <Text style={styles.certDisclaimer}>
                  This official document certifies that the vehicle described above is insured with Sanasa General Insurance Company Limited in compliance with Sri Lanka motor traffic laws.
                </Text>
              </ScrollView>

              <View style={styles.coverNoteFooter}>
                <TouchableOpacity
                  style={styles.coverNoteDownloadBtn}
                  onPress={() => {
                    setCoverNoteModalOpen(false);
                    showCustomAlert("Cover Note Downloaded", `Official certificate for ${formatPlate(coverNoteVehicle.numberPlate)} saved to device.`, "success");
                  }}
                >
                  <Ionicons name="download-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.coverNoteDownloadBtnText}>Download Official PDF</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ── 4. PAYMENT SUCCESS MODAL ── */}
      {paymentSuccessModal && (
        <Modal
          visible={paymentSuccessModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setPaymentSuccessModal(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.successModalCard}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark-done" size={42} color="#16a34a" />
              </View>
              <Text style={styles.successModalTitle}>Payment Confirmed!</Text>
              <Text style={styles.successModalMsg}>
                Your renewal installment payment for vehicle{" "}
                <Text style={{ fontWeight: "800", color: "#0f172a" }}>
                  {paymentSuccessDetails?.plate ? formatPlate(paymentSuccessDetails.plate) : "your vehicle"}
                </Text>{" "}
                has been successfully verified via Stripe.
                {"\n\n"}
                Your policy coverage has been extended and updated in real time.
              </Text>
              <TouchableOpacity
                style={styles.successModalBtn}
                onPress={() => setPaymentSuccessModal(false)}
              >
                <Text style={styles.successModalBtnText}>View Updated Policy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Add Vehicle Modal */}
      <Modal
        visible={isAddModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAddModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Vehicle</Text>
              </View>

              {validationError ? (
                <View style={styles.modalErrorBox}>
                  <Text style={styles.modalErrorText}>{validationError}</Text>
                </View>
              ) : null}

              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.modalFormScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.formItem}>
                  <Text style={styles.formLabel}>Number Plate *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. WP-CBH-3202"
                    placeholderTextColor="#94a3b8"
                    value={newNumberPlate}
                    onChangeText={setNewNumberPlate}
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.formItem}>
                  <Text style={styles.formLabel}>Vehicle Type *</Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[styles.modalInput, styles.pickerTrigger]}
                    onPress={() => setActiveVehicleTypePicker(!activeVehicleTypePicker)}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                      <MaterialCommunityIcons
                        name={vehicleIcon(newVehicleType) as any}
                        size={20}
                        color="#0284c7"
                        style={{ marginRight: 10 }}
                      />
                      <Text style={styles.pickerText}>{newVehicleType}</Text>
                    </View>
                    <Ionicons name="chevron-down-outline" size={18} color="#64748b" />
                  </TouchableOpacity>

                  {activeVehicleTypePicker && (
                    <ScrollView style={styles.modalPickerDropdown} nestedScrollEnabled={true}>
                      {vehicleTypes.map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setNewVehicleType(type);
                            setActiveVehicleTypePicker(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{type}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>

                <View style={styles.formItem}>
                  <Text style={styles.formLabel}>Company *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. Toyota"
                    placeholderTextColor="#94a3b8"
                    value={newCompany}
                    onChangeText={setNewCompany}
                  />
                </View>

                <View style={styles.formItem}>
                  <Text style={styles.formLabel}>Model *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. Corolla"
                    placeholderTextColor="#94a3b8"
                    value={newModel}
                    onChangeText={setNewModel}
                  />
                </View>

                <View style={styles.formItem}>
                  <Text style={styles.formLabel}>Year *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. 2020"
                    placeholderTextColor="#94a3b8"
                    value={newYear}
                    onChangeText={setNewYear}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formItem}>
                  <Text style={styles.formLabel}>Insurance Policy Number *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. SAN12345"
                    placeholderTextColor="#94a3b8"
                    value={newPolicyNumber}
                    onChangeText={setNewPolicyNumber}
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.formItem}>
                  <Text style={styles.formLabel}>Engine Number *</Text>
                  <TextInput
                    style={[styles.modalInput, { fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" }]}
                    placeholder="e.g. 1NZ-FE-xxxx"
                    placeholderTextColor="#94a3b8"
                    value={newEngineNumber}
                    onChangeText={setNewEngineNumber}
                  />
                </View>

                <View style={styles.formItem}>
                  <Text style={styles.formLabel}>Chassis Number *</Text>
                  <TextInput
                    style={[styles.modalInput, { fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" }]}
                    placeholder="e.g. NZE141-xxxx"
                    placeholderTextColor="#94a3b8"
                    value={newChassisNumber}
                    onChangeText={setNewChassisNumber}
                  />
                </View>

                <View style={styles.modalWarningBox}>
                  <Ionicons name="warning-outline" size={16} color="#d97706" style={{ marginTop: 2, marginRight: 6 }} />
                  <Text style={styles.modalWarningText}>
                    <Text style={{ fontWeight: "800" }}>Important: </Text>
                    Your vehicle will be reviewed by office staff before approval.
                  </Text>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setIsAddModalOpen(false)}
                >
                  <Text style={styles.modalCloseBtnText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSubmitBtn, isSubmitting && { opacity: 0.7 }]}
                  disabled={isSubmitting}
                  onPress={handleAddVehicleSubmit}
                >
                  <Text style={styles.modalSubmitBtnText}>
                    {isSubmitting ? "Submitting..." : "Submit"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <AIChatBot userRole="policy_holder" bottomOffset={96} />
      <PolicyHolderNavbar />

      {customAlert && (
        <View style={styles.alertOverlay}>
          <View style={styles.alertCard}>
            <View
              style={[
                styles.alertIconCircle,
                customAlert.type === "success" && {
                  backgroundColor: "rgba(74, 222, 128, 0.12)",
                  borderColor: "rgba(74, 222, 128, 0.3)",
                },
                customAlert.type === "warning" && {
                  backgroundColor: "rgba(239, 68, 68, 0.12)",
                  borderColor: "rgba(239, 68, 68, 0.3)",
                },
              ]}
            >
              <Ionicons
                name={
                  customAlert.type === "success"
                    ? "checkmark-circle-outline"
                    : customAlert.type === "warning"
                    ? "alert-circle-outline"
                    : "information-circle-outline"
                }
                size={38}
                color={
                  customAlert.type === "success"
                    ? "#4ade80"
                    : customAlert.type === "warning"
                    ? "#f87171"
                    : "#ff9800"
                }
              />
            </View>
            <Text style={styles.alertTitle}>{customAlert.title}</Text>
            <Text style={styles.alertMsg}>{customAlert.message}</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                const cb = customAlert.onClose;
                setCustomAlert(null);
                if (cb) cb();
              }}
              style={styles.alertButton}
            >
              <Text style={styles.alertButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles: any = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8fafc" },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 110 },
  loaderWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  loaderText: { fontSize: 13, color: "#64748b", fontWeight: "600", marginTop: 10 },

  /* Curved background header */
  headerBackground: { width: "100%", height: 190 },
  headerImageStyle: { borderBottomRightRadius: 50 },
  headerGradient: {
    flex: 1,
    borderBottomRightRadius: 50,
    paddingTop: Platform.OS === "ios" ? 54 : 42,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  headerTitle: { fontSize: 28, color: "#ffffff", fontWeight: "800", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 12, color: "#e2e8f0", fontWeight: "600", marginTop: 4 },

  /* Search Container */
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 99,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    marginBottom: 16,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: "#0f172a", fontWeight: "500" },

  /* Categories selection list */
  categoryScroll: { marginBottom: 16 },
  categoryContent: { gap: 8, paddingRight: 16 },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  categoryPillActive: {
    backgroundColor: "#0284c7",
    borderColor: "#025a87",
  },
  categoryText: { fontSize: 13, color: "#64748b", fontWeight: "700" },
  categoryTextActive: { color: "#ffffff" },

  /* Stats summary indicators */
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    gap: 12,
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statNum: { fontSize: 20, fontWeight: "900", color: "#0f172a", lineHeight: 22 },
  statLabel: { fontSize: 10, color: "#94a3b8", fontWeight: "700", textTransform: "uppercase" },

  /* Vehicle Cards */
  vehicleCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    marginBottom: 16,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#f0f9ff",
    alignItems: "center",
    justifyContent: "center",
  },
  plateText: { fontSize: 16, fontWeight: "800", color: "#0f172a", letterSpacing: 0.3 },
  companyModelText: { fontSize: 12, color: "#64748b", fontWeight: "600", marginTop: 2 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderWidth: 1.2,
    borderColor: "#bbf7d0",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 99,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#22c55e", marginRight: 6 },
  badgeLabel: { fontSize: 10, color: "#16a34a", fontWeight: "800" },

  /* Real-time Renewal Banners on Cards */
  quoteReadyBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
  },
  quoteReadyTitle: { fontSize: 12, fontWeight: "800", color: "#065f46" },
  quoteReadyAmount: { fontSize: 11, fontWeight: "600", color: "#047857", marginTop: 2 },
  quoteReadyBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#059669",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 99,
    gap: 4,
  },
  quoteReadyBtnText: { fontSize: 11.5, fontWeight: "800", color: "#ffffff" },

  installmentDueBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
  },
  installmentDueTitle: { fontSize: 12, fontWeight: "800", color: "#92400e" },
  installmentDueAmount: { fontSize: 11, fontWeight: "600", color: "#b45309", marginTop: 2 },
  installmentDueBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d97706",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 99,
    gap: 4,
  },
  installmentDueBtnText: { fontSize: 11.5, fontWeight: "800", color: "#ffffff" },

  cardDivider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 14 },

  /* Specs list */
  specsList: {
    backgroundColor: "#f8fafc",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  specItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
  },
  specItemNoBorder: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  specLabel: { fontSize: 12.5, color: "#64748b", fontWeight: "600" },
  specVal: { fontSize: 12.5, color: "#0f172a", fontWeight: "800" },

  /* Card Actions Row */
  cardActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 99,
    gap: 4,
  },
  actionBtnText: {
    fontSize: 11.5,
    fontWeight: "800",
  },

  /* Dashed Add Vehicle Card */
  dashedAddCard: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#cbd5e1",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    marginBottom: 16,
  },
  dashedAddIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f0f9ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  dashedAddTitle: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  dashedAddDesc: { fontSize: 11, color: "#64748b", fontWeight: "600", textAlign: "center", marginTop: 4, paddingHorizontal: 20 },

  /* Support Galle Office Banner */
  helpBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderRadius: 24,
    padding: 16,
    marginTop: 8,
  },
  helpTitle: { fontSize: 15, fontWeight: "900", color: "#ffffff", marginBottom: 2 },
  helpDesc: { fontSize: 11.5, color: "#cbd5e1", fontWeight: "600", lineHeight: 15 },
  helpBtn: {
    backgroundColor: "#f97316",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 99,
  },
  helpBtnText: { fontSize: 12.5, fontWeight: "800", color: "#ffffff" },

  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 40,
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  emptyText: { fontSize: 13, color: "#64748b", fontWeight: "700" },

  /* Modal Base Backdrop */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalOverlay: {
    width: "100%",
    maxWidth: 480,
    height: "85%",
    borderRadius: 28,
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  modalOverlayLarge: {
    width: "100%",
    maxWidth: 520,
    height: "90%",
    borderRadius: 28,
    backgroundColor: "#ffffff",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
  },
  modalTitleLarge: { fontSize: 18, fontWeight: "900", color: "#0f172a" },
  modalSubPlate: { fontSize: 12, fontWeight: "600", color: "#64748b", marginTop: 2 },
  modalCloseIconBtn: { padding: 4 },
  vehicleDetailsScroll: { padding: 20, paddingBottom: 30 },

  /* Profile Card in Modal */
  modalProfileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 20,
    padding: 14,
    marginBottom: 16,
  },
  iconBoxLarge: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalVehicleName: { fontSize: 17, fontWeight: "800", color: "#0f172a" },
  modalVehicleMeta: { fontSize: 12, color: "#64748b", fontWeight: "600", marginTop: 3 },

  /* Specs Grid Box */
  specsGridBox: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  specGridRow: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#f1f5f9",
  },
  specGridRowNoBorder: {
    flexDirection: "row",
    paddingVertical: 12,
  },
  specGridCol: { flex: 1 },
  specGridLabel: { fontSize: 10, fontWeight: "800", color: "#94a3b8", letterSpacing: 0.5 },
  specGridVal: { fontSize: 13, fontWeight: "800", color: "#0f172a", marginTop: 3 },
  specGridValMono: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 3,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },

  /* Renewal Section Wrapper */
  renewalSectionWrapper: {
    marginBottom: 18,
  },
  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionHeadingText: { fontSize: 15, fontWeight: "800", color: "#0f172a" },

  /* Calculated Quote Card */
  calculatedQuoteCard: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1.5,
    borderColor: "#86efac",
    borderRadius: 20,
    padding: 16,
  },
  quoteHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  quoteBadgeReady: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  quoteBadgeReadyText: { fontSize: 9.5, fontWeight: "900", color: "#15803d", letterSpacing: 0.5 },
  quoteStaffInfo: { fontSize: 11.5, color: "#166534", fontWeight: "600" },

  feeBreakdownBox: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    padding: 12,
    gap: 8,
  },
  feeRow: { flexDirection: "row", justifyContent: "space-between" },
  feeLabel: { fontSize: 11.5, color: "#64748b", fontWeight: "600" },
  feeVal: { fontSize: 11.5, color: "#0f172a", fontWeight: "800" },
  feeTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#e2e8f0",
    paddingTop: 10,
    marginTop: 4,
  },
  feeTotalLabel: { fontSize: 13, fontWeight: "900", color: "#0f172a" },
  feeTotalVal: { fontSize: 16, fontWeight: "900", color: "#059669" },

  renewActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#059669",
    paddingVertical: 13,
    borderRadius: 99,
    marginTop: 14,
    gap: 6,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  renewActionBtnText: { fontSize: 14, fontWeight: "800", color: "#ffffff" },

  /* Active Installment Box */
  activeInstallmentBox: {
    backgroundColor: "#fffbeb",
    borderWidth: 1.5,
    borderColor: "#fde68a",
    borderRadius: 20,
    padding: 16,
  },
  installmentHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  installmentBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  installmentBadgeText: { fontSize: 9.5, fontWeight: "900", color: "#b45309", letterSpacing: 0.5 },
  installmentProgressText: { fontSize: 11, color: "#92400e", fontWeight: "600" },
  payInstallmentBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d97706",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
    gap: 4,
  },
  payInstallmentBtnText: { fontSize: 11.5, fontWeight: "800", color: "#ffffff" },

  nextDueCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#fde68a",
    padding: 12,
    marginBottom: 12,
  },
  nextDueLabel: { fontSize: 11, color: "#64748b", fontWeight: "700", textTransform: "uppercase" },
  nextDueDetailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  nextDueAmount: { fontSize: 17, fontWeight: "900", color: "#b45309" },
  nextDueDate: { fontSize: 12, fontWeight: "700", color: "#0f172a" },

  installmentScheduleBox: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#fde68a",
    padding: 12,
  },
  scheduleTitle: { fontSize: 12, fontWeight: "800", color: "#0f172a", marginBottom: 8 },
  scheduleItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: "#f1f5f9",
  },
  scheduleItemPaid: { opacity: 0.85 },
  scheduleItemNext: { backgroundColor: "#fffbeb", borderRadius: 8, paddingHorizontal: 6 },
  scheduleNumBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  scheduleNumBadgeText: { fontSize: 10, fontWeight: "900", color: "#ffffff" },
  scheduleItemName: { fontSize: 12, fontWeight: "700", color: "#0f172a" },
  scheduleItemDate: { fontSize: 10.5, color: "#64748b", marginTop: 1 },
  scheduleItemAmount: { fontSize: 12, fontWeight: "800", color: "#0f172a" },
  scheduleStatusTag: {
    fontSize: 9,
    fontWeight: "900",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },

  /* Fully Paid Card */
  fullyPaidCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderWidth: 1.5,
    borderColor: "#86efac",
    borderRadius: 18,
    padding: 14,
  },
  fullyPaidIconBox: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  fullyPaidTitle: { fontSize: 14, fontWeight: "800", color: "#166534" },
  fullyPaidSubtitle: { fontSize: 11.5, color: "#15803d", marginTop: 2 },

  /* Not Calculated Notice */
  notCalculatedNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  notCalculatedText: { flex: 1, fontSize: 11.5, color: "#0369a1", lineHeight: 16 },

  /* Modal Action Buttons Row */
  modalActionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  modalActionPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 99,
    gap: 6,
  },
  modalActionPrimaryText: { fontSize: 13, fontWeight: "800", color: "#ffffff" },

  modalFooterRow: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  modalCloseFullBtn: {
    backgroundColor: "#000080",
    paddingVertical: 12,
    borderRadius: 99,
    alignItems: "center",
  },
  modalCloseFullBtnText: { fontSize: 13, fontWeight: "800", color: "#ffffff" },

  /* ── 3-STEP RENEWAL WIZARD STYLES ── */
  wizardOverlay: {
    width: "100%",
    maxWidth: 480,
    height: "82%",
    backgroundColor: "#ffffff",
    borderRadius: 28,
    overflow: "hidden",
  },
  wizardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#102A43",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  wizardTitle: { fontSize: 17, fontWeight: "900", color: "#ffffff" },
  wizardSubtitle: { fontSize: 11.5, color: "#93c5fd", marginTop: 2 },

  stepsIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
  },
  stepCol: { alignItems: "center", gap: 3 },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleActive: { backgroundColor: "#0284c7" },
  stepCircleText: { fontSize: 11, fontWeight: "800", color: "#ffffff" },
  stepCircleTextActive: { color: "#ffffff" },
  stepLabel: { fontSize: 10, fontWeight: "700", color: "#94a3b8" },
  stepLabelActive: { color: "#0284c7" },
  stepLine: { flex: 1, height: 2, backgroundColor: "#e2e8f0", marginHorizontal: 8, marginBottom: 14 },
  stepLineActive: { backgroundColor: "#0284c7" },

  wizardBodyScroll: { padding: 20, gap: 14 },
  wizardInfoAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    borderRadius: 14,
    padding: 12,
  },
  wizardAlertTitle: { fontSize: 12.5, fontWeight: "800", color: "#0369a1" },
  wizardAlertDesc: { fontSize: 11, color: "#0284c7", marginTop: 2 },

  calculationSheet: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  calcRow: { flexDirection: "row", justifyContent: "space-between" },
  calcLabel: { fontSize: 12, color: "#64748b", fontWeight: "600" },
  calcVal: { fontSize: 12, color: "#0f172a", fontWeight: "800" },
  calcTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#e2e8f0",
    paddingTop: 10,
    marginTop: 4,
  },
  calcTotalLabel: { fontSize: 13.5, fontWeight: "900", color: "#102A43" },
  calcTotalVal: { fontSize: 17, fontWeight: "900", color: "#059669" },

  planSectionTitle: { fontSize: 13, fontWeight: "800", color: "#0f172a" },
  planRadioCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    borderRadius: 16,
    padding: 14,
  },
  planRadioCardSelected: {
    borderColor: "#0284c7",
    backgroundColor: "#f0f9ff",
  },
  planRadioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#0284c7",
    alignItems: "center",
    justifyContent: "center",
  },
  planRadioCircleInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#0284c7" },
  planTitle: { fontSize: 13, fontWeight: "800", color: "#0f172a" },
  planSubtitle: { fontSize: 11, color: "#64748b", marginTop: 2 },
  planPrice: { fontSize: 13, fontWeight: "900", color: "#0284c7" },
  planSubPrice: { fontSize: 9.5, color: "#94a3b8" },

  checkoutSummaryCard: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  checkoutSummaryHeader: { fontSize: 10, fontWeight: "900", color: "#94a3b8", letterSpacing: 0.5 },
  checkoutRow: { flexDirection: "row", justifyContent: "space-between" },
  checkoutLabel: { fontSize: 12, color: "#64748b", fontWeight: "600" },
  checkoutVal: { fontSize: 12, color: "#0f172a", fontWeight: "800" },
  checkoutTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#e2e8f0",
    paddingTop: 10,
    marginTop: 4,
  },
  dueTodayLabel: { fontSize: 13, fontWeight: "900", color: "#0f172a" },
  dueTodaySub: { fontSize: 10.5, color: "#64748b" },
  dueTodayAmount: { fontSize: 18, fontWeight: "900", color: "#0284c7" },

  stripeGateCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1e1b4b",
    borderRadius: 16,
    padding: 14,
  },
  stripeGateTitle: { fontSize: 13, fontWeight: "800", color: "#ffffff" },
  stripeGateSub: { fontSize: 10.5, color: "#c7d2fe", marginTop: 2 },

  wizardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  wizardBackBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  wizardBackBtnText: { fontSize: 12, fontWeight: "700", color: "#475569" },
  wizardNextBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0284c7",
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 99,
    gap: 6,
  },
  wizardNextBtnText: { fontSize: 12.5, fontWeight: "800", color: "#ffffff" },
  wizardPayBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#059669",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 99,
  },
  wizardPayBtnText: { fontSize: 12.5, fontWeight: "800", color: "#ffffff" },

  /* ── COVER NOTE CERTIFICATE MODAL ── */
  coverNoteCard: {
    width: "100%",
    maxWidth: 480,
    height: "80%",
    backgroundColor: "#ffffff",
    borderRadius: 24,
    overflow: "hidden",
  },
  coverNoteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  coverNoteHeaderCompany: { fontSize: 12, fontWeight: "900", color: "#000080", letterSpacing: 0.5 },
  coverNoteHeaderDoc: { fontSize: 15, fontWeight: "800", color: "#0f172a", marginTop: 2 },
  certMetaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  certMetaText: { fontSize: 11, color: "#64748b", fontWeight: "600" },
  certSection: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    marginBottom: 10,
    gap: 4,
  },
  certSectionHeader: { fontSize: 10, fontWeight: "900", color: "#0284c7", letterSpacing: 0.5, marginBottom: 2 },
  certRowText: { fontSize: 11.5, color: "#0f172a", fontWeight: "600" },
  certDisclaimer: { fontSize: 10, color: "#94a3b8", lineHeight: 14, marginVertical: 8, fontStyle: "italic" },
  coverNoteFooter: {
    padding: 14,
    borderTopWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  coverNoteDownloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0284c7",
    paddingVertical: 12,
    borderRadius: 99,
  },
  coverNoteDownloadBtnText: { fontSize: 13, fontWeight: "800", color: "#ffffff" },

  /* ── PAYMENT SUCCESS CELEBRATION MODAL ── */
  successModalCard: {
    width: "85%",
    maxWidth: 360,
    backgroundColor: "#ffffff",
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#dcfce7",
    borderWidth: 2,
    borderColor: "#86efac",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  successModalTitle: { fontSize: 20, fontWeight: "900", color: "#166534", marginBottom: 8 },
  successModalMsg: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  successModalBtn: {
    backgroundColor: "#059669",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 99,
  },
  successModalBtnText: { fontSize: 13, fontWeight: "800", color: "#ffffff" },

  /* Form & Add Vehicle Modal Styles */
  modalContainer: { flex: 1 },
  modalHeader: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
  },
  modalTitle: { fontSize: 22, fontWeight: "900", color: "#0f172a" },
  modalFormScroll: { paddingHorizontal: 24, paddingVertical: 16, gap: 14 },
  formItem: { flexDirection: "column", gap: 6 },
  formLabel: { fontSize: 13, fontWeight: "800", color: "#0f172a" },
  modalInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    fontSize: 13.5,
    color: "#0f172a",
    fontWeight: "600",
  },
  pickerTrigger: { flexDirection: "row", alignItems: "center" },
  pickerText: { fontSize: 13.5, color: "#0f172a", fontWeight: "600" },
  modalPickerDropdown: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    backgroundColor: "#ffffff",
    padding: 6,
    maxHeight: 180,
  },
  dropdownItem: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  dropdownItemText: { fontSize: 13, fontWeight: "600", color: "#334155" },
  modalWarningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fef3c7",
    borderRadius: 14,
    padding: 10,
    marginTop: 6,
  },
  modalWarningText: { flex: 1, fontSize: 11, color: "#b45309", fontWeight: "600", lineHeight: 14 },
  modalFooter: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 24,
    paddingVertical: 16,
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
  },
  modalCloseBtn: { backgroundColor: "#1e3a8a", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 99 },
  modalCloseBtnText: { color: "#ffffff", fontWeight: "800", fontSize: 13 },
  modalSubmitBtn: { backgroundColor: "#1e3a8a", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 99 },
  modalSubmitBtnText: { color: "#ffffff", fontWeight: "800", fontSize: 13 },
  modalErrorBox: {
    marginHorizontal: 24,
    marginTop: 14,
    padding: 10,
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fee2e2",
  },
  modalErrorText: { color: "#b91c1c", fontSize: 12, fontWeight: "700" },

  alertOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(2, 11, 13, 0.95)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  alertCard: {
    width: "85%",
    maxWidth: 340,
    backgroundColor: "rgba(10, 34, 40, 0.95)",
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.15)",
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  alertIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(255, 152, 0, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 152, 0, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  alertTitle: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 8, textAlign: "center" },
  alertMsg: {
    fontSize: 13.5,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  alertButton: {
    backgroundColor: "#ff9800",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 32,
    shadowColor: "#ff9800",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  alertButtonText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
});
