import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Platform,
  Alert,
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useNavigation } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import AgentNavbar from "../../Components/Agent/page";
import { API_BASE_URL } from "../../_config";
import { compressImageMobile } from "../../../utils/imageCompressor";
import { sriLankaBanks } from "../../../utils/banks";

const { width: SCREEN_W } = Dimensions.get("window");

interface AgentProfileData {
  _id: string;
  agentId: string;
  name: string;
  email: string;
  nic: string;
  dob?: string;
  address?: string;
  branch: string;
  phone?: string;
  city?: string;
  district?: string;
  area?: string;
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
  profilePhoto?: string;
  status?: string;
  availability?: string;
  createdAt?: string;
}

const SRI_LANKA_PROVINCES = [
  "Western Province",
  "Central Province",
  "Southern Province",
  "Northern Province",
  "Eastern Province",
  "North Western Province",
  "North Central Province",
  "Uva Province",
  "Sabaragamuwa Province"
];

const SRI_LANKA_DISTRICTS = [
  "Colombo", "Gampaha", "Kalutara",
  "Kandy", "Matale", "Nuwara Eliya",
  "Galle", "Matara", "Hambantota",
  "Jaffna", "Kilinochchi", "Mannar", "Vavuniya", "Mullaitivu",
  "Batticaloa", "Ampara", "Trincomalee",
  "Kurunegala", "Puttalam",
  "Anuradhapura", "Polonnaruwa",
  "Badulla", "Monaragala",
  "Ratnapura", "Kegalle"
];

function formatDate(dateStr?: string) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${d.getDate().toString().padStart(2, "0")} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

function calculateAge(dobStr?: string) {
  if (!dobStr) return "-";
  try {
    const birth = new Date(dobStr);
    const diff = Date.now() - birth.getTime();
    const ageDate = new Date(diff);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);
    return isNaN(age) ? "-" : `${age} yrs`;
  } catch {
    return "-";
  }
}

export default function AgentProfilePage() {
  const [agent, setAgent] = useState<AgentProfileData | null>(null);
  const [stats, setStats] = useState({ totalClaims: 0, activeClaims: 0, completedInspections: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [agentEmail, setAgentEmail] = useState("");

  // Tab: "personal" | "credentials" | "bank" | "security"
  const [activeTab, setActiveTab] = useState<"personal" | "credentials" | "bank" | "security">("personal");

  // Edit states
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [personalForm, setPersonalForm] = useState({
    phone: "",
    address: "",
    city: "",
    district: "",
    area: "",
    province: ""
  });

  const [isEditingBank, setIsEditingBank] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [bankForm, setBankForm] = useState({
    bankName: "",
    bankBranch: "",
    accountNumber: "",
    accountType: "Savings",
    accountHolderName: ""
  });

  // Password Change
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Update requests
  const [updateRequests, setUpdateRequests] = useState<any[]>([]);

  // Photo upload & preview modal
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Picker Modals
  const [showProvincePicker, setShowProvincePicker] = useState(false);
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);
  const [showBankPicker, setShowBankPicker] = useState(false);

  // Custom Alert Popup
  const [customPopup, setCustomPopup] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "info" | "confirm";
    onConfirm?: () => void;
  }>({ show: false, title: "", message: "", type: "info" });

  const getFullImageUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
    return `${API_BASE_URL.replace("/api", "")}/${url.startsWith("/") ? url.slice(1) : url}`;
  };

  // Fetch Agent Profile from Backend
  const fetchAgentProfile = async (emailToFetch: string, silent = false) => {
    if (!emailToFetch) return;
    try {
      if (!silent) setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/agent/profile?email=${encodeURIComponent(emailToFetch)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load agent profile.");

      if (data.agent) {
        setAgent(data.agent);
        setPersonalForm({
          phone: data.agent.phone || "",
          address: data.agent.address || "",
          city: data.agent.city || "",
          district: data.agent.district || "",
          area: data.agent.area || "",
          province: data.agent.province || ""
        });
        setBankForm({
          bankName: data.agent.bankName || "",
          bankBranch: data.agent.bankBranch || "",
          accountNumber: data.agent.accountNumber || "",
          accountType: data.agent.accountType || "Savings",
          accountHolderName: data.agent.accountHolderName || data.agent.name || ""
        });
        await AsyncStorage.setItem("logged_in_agent", JSON.stringify(data.agent));
      }

      if (data.stats) {
        setStats(data.stats);
      }

      await fetchUpdateRequests(emailToFetch);
    } catch (err: any) {
      console.error("Agent profile fetch error:", err);
      if (!silent) {
        setCustomPopup({
          show: true,
          title: "Profile Error",
          message: err.message || "Failed to load agent profile details.",
          type: "error"
        });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Fetch edit requests from branch
  const fetchUpdateRequests = async (emailToFetch: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/agent/profile-update-requests?email=${encodeURIComponent(emailToFetch)}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.requests)) {
        setUpdateRequests(data.requests);
      }
    } catch (e) {
      console.error("Fetch agent update requests error:", e);
    }
  };

  useEffect(() => {
    (async () => {
      const agentStr = await AsyncStorage.getItem("logged_in_agent");
      if (!agentStr) {
        router.replace("/login/page");
        return;
      }
      try {
        const parsed = JSON.parse(agentStr);
        if (parsed.email) {
          setAgentEmail(parsed.email);
          fetchAgentProfile(parsed.email);
        } else {
          router.replace("/login/page");
        }
      } catch {
        router.replace("/login/page");
      }
    })();
  }, []);

  // Real-time background sync polling every 6 seconds
  useEffect(() => {
    if (!agentEmail) return;
    const interval = setInterval(() => {
      fetchAgentProfile(agentEmail, true);
    }, 6000);
    return () => clearInterval(interval);
  }, [agentEmail]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (agentEmail) {
      fetchAgentProfile(agentEmail, true).finally(() => setRefreshing(false));
    } else {
      setRefreshing(false);
    }
  }, [agentEmail]);

  // Toggle Live Availability Duty Status
  const handleToggleAvailability = async (newStatus: "Active" | "Offline") => {
    if (!agent || agent.availability === newStatus) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/agent/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: agent.email, availability: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update duty status.");

      const updated = { ...agent, availability: newStatus };
      setAgent(updated);
      await AsyncStorage.setItem("logged_in_agent", JSON.stringify(updated));

      setCustomPopup({
        show: true,
        title: "Duty Status Updated",
        message: `Your duty availability is now set to ${newStatus === "Active" ? "Active (On Duty)" : "Offline (Off Duty)"}.`,
        type: "success"
      });
    } catch (err: any) {
      setCustomPopup({
        show: true,
        title: "Update Failed",
        message: err.message || "Failed to update duty availability.",
        type: "error"
      });
    }
  };

  // Pick & Upload Profile Photo
  const handlePickPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Required", "Please allow gallery access to upload your profile photo.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setUploadingPhoto(true);
        const compressedBase64 = await compressImageMobile(result.assets[0].uri, 800, 0.75);

        const res = await fetch(`${API_BASE_URL}/api/agent/profile`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: agentEmail,
            profilePhoto: compressedBase64
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update profile photo.");

        if (data.agent) {
          setAgent(data.agent);
          await AsyncStorage.setItem("logged_in_agent", JSON.stringify(data.agent));
        }

        setCustomPopup({
          show: true,
          title: "Photo Updated",
          message: "Your profile photo has been updated successfully.",
          type: "success"
        });
      }
    } catch (err: any) {
      console.error("Agent photo upload error:", err);
      setCustomPopup({
        show: true,
        title: "Upload Failed",
        message: err.message || "Could not upload photo. Please try again.",
        type: "error"
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      setUploadingPhoto(true);
      const res = await fetch(`${API_BASE_URL}/api/agent/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: agentEmail,
          profilePhoto: ""
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove photo.");

      if (data.agent) {
        setAgent(data.agent);
        await AsyncStorage.setItem("logged_in_agent", JSON.stringify(data.agent));
      }

      setCustomPopup({
        show: true,
        title: "Photo Removed",
        message: "Your profile photo has been removed.",
        type: "success"
      });
    } catch (err: any) {
      setCustomPopup({
        show: true,
        title: "Error",
        message: err.message || "Failed to remove photo.",
        type: "error"
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Submit Personal Details Edit Request to Branch
  const handleSavePersonal = async () => {
    if (!personalForm.phone.trim()) {
      setCustomPopup({
        show: true,
        title: "Validation Error",
        message: "Contact phone number is required.",
        type: "error"
      });
      return;
    }

    setSavingPersonal(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/agent/profile-update-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: agentEmail,
          agentId: agent?.agentId,
          requestType: "Personal & Contact",
          requestedChanges: {
            phone: personalForm.phone.trim(),
            address: personalForm.address.trim(),
            city: personalForm.city.trim(),
            district: personalForm.district.trim(),
            area: personalForm.area.trim(),
            province: personalForm.province.trim()
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit personal contact update request.");

      setIsEditingPersonal(false);
      await fetchUpdateRequests(agentEmail);

      setCustomPopup({
        show: true,
        title: "Edit Request Submitted",
        message: `Your contact and area details edit request has been sent to ${agent?.branch || "Galle"} Branch for verification. Once approved by branch staff, your database records will update automatically.`,
        type: "success"
      });
    } catch (err: any) {
      setCustomPopup({
        show: true,
        title: "Submission Failed",
        message: err.message || "Could not submit update request.",
        type: "error"
      });
    } finally {
      setSavingPersonal(false);
    }
  };

  // Submit Bank Details Edit Request to Branch
  const handleSaveBank = async () => {
    if (!bankForm.bankName.trim() || !bankForm.accountNumber.trim()) {
      setCustomPopup({
        show: true,
        title: "Validation Error",
        message: "Bank Name and Account Number are required.",
        type: "error"
      });
      return;
    }

    setSavingBank(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/agent/profile-update-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: agentEmail,
          agentId: agent?.agentId,
          requestType: "Bank Details",
          requestedChanges: {
            bankName: bankForm.bankName.trim(),
            bankBranch: bankForm.bankBranch.trim(),
            accountNumber: bankForm.accountNumber.trim(),
            accountType: bankForm.accountType.trim(),
            accountHolderName: bankForm.accountHolderName.trim()
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit bank details update request.");

      setIsEditingBank(false);
      await fetchUpdateRequests(agentEmail);

      setCustomPopup({
        show: true,
        title: "Bank Edit Submitted",
        message: `Your direct settlement bank account update request has been sent to ${agent?.branch || "Galle"} Branch for verification. Once approved by branch staff, your settlement records will update.`,
        type: "success"
      });
    } catch (err: any) {
      setCustomPopup({
        show: true,
        title: "Submission Failed",
        message: err.message || "Could not submit bank update request.",
        type: "error"
      });
    } finally {
      setSavingBank(false);
    }
  };

  // Upload/Replace Document File and Submit Request to Branch
  const handleUploadDocument = async (docType: "nicFront" | "nicBack" | "birthCertificate" | "policeReport", docName: string) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setLoading(true);
        const compressed = await compressImageMobile(result.assets[0].uri, 1200, 0.7);

        const requestedChanges: any = {};
        requestedChanges[docType] = compressed;

        const res = await fetch(`${API_BASE_URL}/api/agent/profile-update-request`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: agentEmail,
            agentId: agent?.agentId,
            requestType: "KYC Documents",
            requestedChanges
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to upload KYC document update request.");

        await fetchUpdateRequests(agentEmail);

        setCustomPopup({
          show: true,
          title: "Document Submitted",
          message: `Your new ${docName} has been uploaded and sent to ${agent?.branch || "Galle"} Branch for KYC verification and approval.`,
          type: "success"
        });
      }
    } catch (err: any) {
      console.error("Document upload error:", err);
      setCustomPopup({
        show: true,
        title: "Upload Failed",
        message: err.message || "Failed to upload document.",
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  // Change Password
  const handleChangePassword = async () => {
    if (passwordForm.newPassword.length < 6) {
      setCustomPopup({
        show: true,
        title: "Invalid Password",
        message: "New password must be at least 6 characters long.",
        type: "error"
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setCustomPopup({
        show: true,
        title: "Password Mismatch",
        message: "New password and confirmation password do not match.",
        type: "error"
      });
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/agent/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: agentEmail,
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          device: "Mobile App"
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change password.");

      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });

      setCustomPopup({
        show: true,
        title: "Password Updated",
        message: "Your agent login credentials have been updated successfully.",
        type: "success"
      });
    } catch (err: any) {
      setCustomPopup({
        show: true,
        title: "Password Change Failed",
        message: err.message || "Please check your current password and try again.",
        type: "error"
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = () => {
    setCustomPopup({
      show: true,
      title: "Logout Account",
      message: "Are you sure you want to log out of your field agent account?",
      type: "confirm",
      onConfirm: async () => {
        try {
          await fetch(`${API_BASE_URL}/api/agent/availability`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: agentEmail, availability: "Offline" })
          });
        } catch (e) {}
        await AsyncStorage.removeItem("logged_in_agent");
        await AsyncStorage.removeItem("availability_prompted");
        router.replace("/login/page");
      }
    });
  };

  const initials = (agent?.name || "Agent")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const pendingPersonal = updateRequests.find((r) => r.requestType === "Personal & Contact" && r.status === "Pending");
  const pendingBank = updateRequests.find((r) => r.requestType === "Bank Details" && r.status === "Pending");
  const pendingKyc = updateRequests.find((r) => r.requestType === "KYC Documents" && r.status === "Pending");
  const lastRejected = updateRequests.find((r) => r.status === "Rejected");

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={styles.loadingText}>Loading agent profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" colors={["#f97316"]} />
        }
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* ── HERO PROFILE HEADER ── */}
        <LinearGradient
          colors={["#0f172a", "#1e293b", "#0f172a"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        >
          {/* Top Bar with Back Button and Refresh */}
          <View style={styles.topNavRow}>
            <TouchableOpacity
              style={styles.navBackBtn}
              onPress={() => router.push("/Agent/Dashboard/page")}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={20} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.navTitle}>Field Agent Profile</Text>
            <TouchableOpacity
              style={styles.navBackBtn}
              onPress={() => fetchAgentProfile(agentEmail)}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Hero Profile Info */}
          <View style={styles.heroProfileRow}>
            {/* Avatar with Camera Overlay */}
            <View style={styles.avatarWrapper}>
              {agent?.profilePhoto ? (
                <Image source={{ uri: getFullImageUrl(agent.profilePhoto) }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>{initials}</Text>
                </View>
              )}

              {/* Edit Camera Button */}
              <TouchableOpacity
                style={styles.cameraBadge}
                onPress={handlePickPhoto}
                disabled={uploadingPhoto}
                activeOpacity={0.85}
              >
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="camera" size={14} color="#ffffff" />
                )}
              </TouchableOpacity>

              {/* Remove Photo (if photo exists) */}
              {agent?.profilePhoto ? (
                <TouchableOpacity
                  style={styles.removePhotoBadge}
                  onPress={handleRemovePhoto}
                  disabled={uploadingPhoto}
                  activeOpacity={0.85}
                >
                  <Ionicons name="trash-outline" size={11} color="#ffffff" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Name, Ref ID, Branch */}
            <View style={styles.heroDetails}>
              <Text style={styles.heroName} numberOfLines={1}>
                {agent?.name || "Field Agent"}
              </Text>

              <View style={styles.heroPillRow}>
                <View style={styles.agentIdBadge}>
                  <Ionicons name="shield-checkmark" size={12} color="#f97316" />
                  <Text style={styles.agentIdText}>{agent?.agentId || "AGT-00000"}</Text>
                </View>
                <View style={styles.branchBadge}>
                  <Ionicons name="business" size={12} color="#94a3b8" />
                  <Text style={styles.branchText}>{agent?.branch || "Galle"} Branch</Text>
                </View>
              </View>

              <Text style={styles.heroEmail} numberOfLines={1}>
                {agent?.email}
              </Text>
            </View>
          </View>

          {/* Live Availability Duty Status Switcher */}
          <View style={styles.dutySwitcherCard}>
            <View style={styles.dutyLabelWrap}>
              <View
                style={[
                  styles.dutyLivePulse,
                  { backgroundColor: agent?.availability === "Active" ? "#22c55e" : "#94a3b8" }
                ]}
              />
              <Text style={styles.dutyTitle}>Duty Status</Text>
            </View>

            <View style={styles.dutyToggleGroup}>
              <TouchableOpacity
                style={[
                  styles.dutyToggleBtn,
                  agent?.availability === "Active" && styles.dutyToggleBtnActive
                ]}
                onPress={() => handleToggleAvailability("Active")}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="radio-button-on"
                  size={14}
                  color={agent?.availability === "Active" ? "#22c55e" : "#64748b"}
                />
                <Text
                  style={[
                    styles.dutyToggleText,
                    agent?.availability === "Active" && styles.dutyToggleTextActive
                  ]}
                >
                  Active
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.dutyToggleBtn,
                  agent?.availability === "Offline" && styles.dutyToggleBtnOffline
                ]}
                onPress={() => handleToggleAvailability("Offline")}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="radio-button-off"
                  size={14}
                  color={agent?.availability === "Offline" ? "#ef4444" : "#64748b"}
                />
                <Text
                  style={[
                    styles.dutyToggleText,
                    agent?.availability === "Offline" && styles.dutyToggleTextOffline
                  ]}
                >
                  Offline
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Key Metrics Row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{stats.totalClaims}</Text>
              <Text style={styles.statLabel}>Total Claims</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNum, { color: "#f97316" }]}>{stats.activeClaims}</Text>
              <Text style={styles.statLabel}>In Progress</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNum, { color: "#22c55e" }]}>{stats.completedInspections}</Text>
              <Text style={styles.statLabel}>Inspections</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── NOTIFICATION BANNERS FOR BRANCH VERIFICATION ── */}
        {pendingPersonal && (
          <View style={styles.bannerAlertAmber}>
            <Ionicons name="time" size={20} color="#b45309" />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerAmberTitle}>Personal Details Edit Pending Verification</Text>
              <Text style={styles.bannerAmberDesc}>
                Your contact and service area update request is currently under review by {agent?.branch || "Galle"} Branch staff.
              </Text>
            </View>
          </View>
        )}

        {pendingBank && (
          <View style={styles.bannerAlertAmber}>
            <Ionicons name="time" size={20} color="#b45309" />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerAmberTitle}>Direct Settlement Account Edit Pending</Text>
              <Text style={styles.bannerAmberDesc}>
                Your bank details update request has been submitted to {agent?.branch || "Galle"} Branch for verification.
              </Text>
            </View>
          </View>
        )}

        {pendingKyc && (
          <View style={styles.bannerAlertAmber}>
            <Ionicons name="document-text" size={20} color="#b45309" />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerAmberTitle}>KYC Document Replacement Pending</Text>
              <Text style={styles.bannerAmberDesc}>
                New KYC credentials have been uploaded and are awaiting branch officer verification.
              </Text>
            </View>
          </View>
        )}

        {lastRejected && (
          <View style={styles.bannerAlertRed}>
            <Ionicons name="alert-circle" size={20} color="#b91c1c" />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerRedTitle}>
                Recent {lastRejected.requestType} Edit Request Rejected
              </Text>
              <Text style={styles.bannerRedDesc}>
                Branch Note: {lastRejected.reviewNotes || "Request was declined by branch staff. Please review your details."}
              </Text>
            </View>
          </View>
        )}

        {/* ── CATEGORY TABS ── */}
        <View style={styles.tabsScrollContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === "personal" && styles.tabButtonActive]}
              onPress={() => setActiveTab("personal")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="person-outline"
                size={16}
                color={activeTab === "personal" ? "#f97316" : "#64748b"}
              />
              <Text style={[styles.tabText, activeTab === "personal" && styles.tabTextActive]}>
                Personal & Contact
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === "credentials" && styles.tabButtonActive]}
              onPress={() => setActiveTab("credentials")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color={activeTab === "credentials" ? "#f97316" : "#64748b"}
              />
              <Text style={[styles.tabText, activeTab === "credentials" && styles.tabTextActive]}>
                Credentials & KYC
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === "bank" && styles.tabButtonActive]}
              onPress={() => setActiveTab("bank")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="card-outline"
                size={16}
                color={activeTab === "bank" ? "#f97316" : "#64748b"}
              />
              <Text style={[styles.tabText, activeTab === "bank" && styles.tabTextActive]}>
                Bank Details
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === "security" && styles.tabButtonActive]}
              onPress={() => setActiveTab("security")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="lock-closed-outline"
                size={16}
                color={activeTab === "security" ? "#f97316" : "#64748b"}
              />
              <Text style={[styles.tabText, activeTab === "security" && styles.tabTextActive]}>
                Security & Password
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* ── TAB 1: PERSONAL & CONTACT DETAILS ── */}
        {activeTab === "personal" && (
          <View style={styles.tabContent}>
            {/* Locked Authority Details Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Ionicons name="lock-closed" size={18} color="#f97316" />
                  <Text style={styles.cardTitle}>Identity & Branch Record</Text>
                </View>
                <View style={styles.authorityPill}>
                  <Text style={styles.authorityPillText}>Locked / Branch Controlled</Text>
                </View>
              </View>

              <Text style={styles.cardDesc}>
                National ID, Agent ID, Assigned Branch, and Official Name can only be modified directly by branch administration.
              </Text>

              <View style={styles.grid2Col}>
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>FULL NAME</Text>
                  <View style={styles.lockedInput}>
                    <Ionicons name="person" size={15} color="#94a3b8" />
                    <Text style={styles.lockedValue}>{agent?.name || "-"}</Text>
                  </View>
                </View>

                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>NATIONAL ID (NIC)</Text>
                  <View style={styles.lockedInput}>
                    <Ionicons name="card" size={15} color="#94a3b8" />
                    <Text style={styles.lockedValue}>{agent?.nic || "-"}</Text>
                  </View>
                </View>

                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>AGENT REFERENCE ID</Text>
                  <View style={styles.lockedInput}>
                    <Ionicons name="shield-checkmark" size={15} color="#94a3b8" />
                    <Text style={styles.lockedValue}>{agent?.agentId || "-"}</Text>
                  </View>
                </View>

                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>ASSIGNED BRANCH</Text>
                  <View style={styles.lockedInput}>
                    <Ionicons name="business" size={15} color="#94a3b8" />
                    <Text style={styles.lockedValue}>{agent?.branch || "Galle"} Branch</Text>
                  </View>
                </View>

                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>OFFICIAL EMAIL</Text>
                  <View style={styles.lockedInput}>
                    <Ionicons name="mail" size={15} color="#94a3b8" />
                    <Text style={styles.lockedValue}>{agent?.email || "-"}</Text>
                  </View>
                </View>

                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>DATE OF BIRTH / AGE</Text>
                  <View style={styles.lockedInput}>
                    <Ionicons name="calendar" size={15} color="#94a3b8" />
                    <Text style={styles.lockedValue}>
                      {formatDate(agent?.dob)} ({calculateAge(agent?.dob)})
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Editable Contact & Service Area Details Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Ionicons name="call" size={18} color="#f97316" />
                  <Text style={styles.cardTitle}>Contact & Service Territory</Text>
                </View>
                {!isEditingPersonal && (
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => setIsEditingPersonal(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="create-outline" size={15} color="#f97316" />
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.cardDesc}>
                Changes to phone, residential address, or assigned service territory require branch verification before updating.
              </Text>

              {isEditingPersonal ? (
                <View style={styles.editFormWrap}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Contact Phone / Mobile *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={personalForm.phone}
                      onChangeText={(t) => setPersonalForm({ ...personalForm, phone: t })}
                      placeholder="e.g. +94 77 123 4567"
                      placeholderTextColor="#94a3b8"
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Residential Street Address</Text>
                    <TextInput
                      style={styles.textInput}
                      value={personalForm.address}
                      onChangeText={(t) => setPersonalForm({ ...personalForm, address: t })}
                      placeholder="e.g. No. 45, Galle Road"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>City / Town</Text>
                    <TextInput
                      style={styles.textInput}
                      value={personalForm.city}
                      onChangeText={(t) => setPersonalForm({ ...personalForm, city: t })}
                      placeholder="e.g. Galle"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Service Area / Zone</Text>
                    <TextInput
                      style={styles.textInput}
                      value={personalForm.area}
                      onChangeText={(t) => setPersonalForm({ ...personalForm, area: t })}
                      placeholder="e.g. Karapitiya, Galle Fort"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>

                  {/* District Picker */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>District</Text>
                    <TouchableOpacity
                      style={styles.dropdownBtn}
                      onPress={() => setShowDistrictPicker(true)}
                      activeOpacity={0.8}
                    >
                      <Text style={personalForm.district ? styles.dropdownSelected : styles.dropdownPlaceholder}>
                        {personalForm.district || "Select District"}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#64748b" />
                    </TouchableOpacity>
                  </View>

                  {/* Province Picker */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Province</Text>
                    <TouchableOpacity
                      style={styles.dropdownBtn}
                      onPress={() => setShowProvincePicker(true)}
                      activeOpacity={0.8}
                    >
                      <Text style={personalForm.province ? styles.dropdownSelected : styles.dropdownPlaceholder}>
                        {personalForm.province || "Select Province"}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#64748b" />
                    </TouchableOpacity>
                  </View>

                  {/* Form Actions */}
                  <View style={styles.formActionRow}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => {
                        setIsEditingPersonal(false);
                        setPersonalForm({
                          phone: agent?.phone || "",
                          address: agent?.address || "",
                          city: agent?.city || "",
                          district: agent?.district || "",
                          area: agent?.area || "",
                          province: agent?.province || ""
                        });
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.saveBtn}
                      onPress={handleSavePersonal}
                      disabled={savingPersonal}
                      activeOpacity={0.85}
                    >
                      {savingPersonal ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <Ionicons name="send" size={15} color="#ffffff" style={{ marginRight: 6 }} />
                          <Text style={styles.saveBtnText}>Submit to Branch</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.grid2Col}>
                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>CONTACT PHONE</Text>
                    <View style={styles.viewField}>
                      <Ionicons name="call" size={15} color="#f97316" />
                      <Text style={styles.viewFieldValue}>{agent?.phone || "Not provided"}</Text>
                    </View>
                  </View>

                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>RESIDENTIAL ADDRESS</Text>
                    <View style={styles.viewField}>
                      <Ionicons name="location" size={15} color="#f97316" />
                      <Text style={styles.viewFieldValue}>{agent?.address || "Not provided"}</Text>
                    </View>
                  </View>

                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>CITY / TOWN</Text>
                    <View style={styles.viewField}>
                      <Ionicons name="navigate" size={15} color="#f97316" />
                      <Text style={styles.viewFieldValue}>{agent?.city || "Not provided"}</Text>
                    </View>
                  </View>

                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>SERVICE AREA</Text>
                    <View style={styles.viewField}>
                      <Ionicons name="map" size={15} color="#f97316" />
                      <Text style={styles.viewFieldValue}>{agent?.area || "All designated areas"}</Text>
                    </View>
                  </View>

                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>DISTRICT</Text>
                    <View style={styles.viewField}>
                      <Ionicons name="compass" size={15} color="#f97316" />
                      <Text style={styles.viewFieldValue}>{agent?.district || "Not provided"}</Text>
                    </View>
                  </View>

                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>PROVINCE</Text>
                    <View style={styles.viewField}>
                      <Ionicons name="globe" size={15} color="#f97316" />
                      <Text style={styles.viewFieldValue}>{agent?.province || "Not provided"}</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── TAB 2: CREDENTIALS & KYC DOCUMENTS ── */}
        {activeTab === "credentials" && (
          <View style={styles.tabContent}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Ionicons name="shield-checkmark" size={18} color="#f97316" />
                  <Text style={styles.cardTitle}>Registered KYC & Clearance Docs</Text>
                </View>
                <View style={styles.verifiedPill}>
                  <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
                  <Text style={styles.verifiedPillText}>Branch Verified</Text>
                </View>
              </View>

              <Text style={styles.cardDesc}>
                Official identity verification documents, birth certificates, and police clearance records filed during agent appointment.
              </Text>

              {/* Document Cards Grid */}
              <View style={styles.docsList}>
                {/* NIC Front */}
                <View style={styles.docItemCard}>
                  <View style={styles.docIconBox}>
                    <Ionicons name="card" size={24} color="#f97316" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docTitle}>National ID (NIC) Front</Text>
                    <Text style={styles.docSubtitle}>Primary Government Identity Card</Text>
                    <View style={styles.docStatusRow}>
                      <View style={[styles.docDot, { backgroundColor: agent?.nicFront ? "#22c55e" : "#eab308" }]} />
                      <Text style={styles.docStatusText}>
                        {agent?.nicFront ? "Verified on File" : "Document Not Uploaded"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.docActionCol}>
                    {agent?.nicFront && (
                      <TouchableOpacity
                        style={styles.docPreviewBtn}
                        onPress={() => setPreviewImage({ url: getFullImageUrl(agent.nicFront), title: "NIC Front Card" })}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="eye" size={14} color="#0284c7" />
                        <Text style={styles.docPreviewBtnText}>View</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.docUploadBtn}
                      onPress={() => handleUploadDocument("nicFront", "NIC Front Card")}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="cloud-upload" size={14} color="#f97316" />
                      <Text style={styles.docUploadBtnText}>Replace</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* NIC Back */}
                <View style={styles.docItemCard}>
                  <View style={styles.docIconBox}>
                    <Ionicons name="card-outline" size={24} color="#f97316" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docTitle}>National ID (NIC) Back</Text>
                    <Text style={styles.docSubtitle}>Barcode & Address Verification</Text>
                    <View style={styles.docStatusRow}>
                      <View style={[styles.docDot, { backgroundColor: agent?.nicBack ? "#22c55e" : "#eab308" }]} />
                      <Text style={styles.docStatusText}>
                        {agent?.nicBack ? "Verified on File" : "Document Not Uploaded"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.docActionCol}>
                    {agent?.nicBack && (
                      <TouchableOpacity
                        style={styles.docPreviewBtn}
                        onPress={() => setPreviewImage({ url: getFullImageUrl(agent.nicBack), title: "NIC Back Card" })}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="eye" size={14} color="#0284c7" />
                        <Text style={styles.docPreviewBtnText}>View</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.docUploadBtn}
                      onPress={() => handleUploadDocument("nicBack", "NIC Back Card")}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="cloud-upload" size={14} color="#f97316" />
                      <Text style={styles.docUploadBtnText}>Replace</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Birth Certificate */}
                <View style={styles.docItemCard}>
                  <View style={styles.docIconBox}>
                    <Ionicons name="document-text" size={24} color="#f97316" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docTitle}>Birth Certificate</Text>
                    <Text style={styles.docSubtitle}>Civil Registry Certification</Text>
                    <View style={styles.docStatusRow}>
                      <View style={[styles.docDot, { backgroundColor: agent?.birthCertificate ? "#22c55e" : "#eab308" }]} />
                      <Text style={styles.docStatusText}>
                        {agent?.birthCertificate ? "Verified on File" : "Document Not Uploaded"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.docActionCol}>
                    {agent?.birthCertificate && (
                      <TouchableOpacity
                        style={styles.docPreviewBtn}
                        onPress={() => setPreviewImage({ url: getFullImageUrl(agent.birthCertificate), title: "Birth Certificate" })}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="eye" size={14} color="#0284c7" />
                        <Text style={styles.docPreviewBtnText}>View</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.docUploadBtn}
                      onPress={() => handleUploadDocument("birthCertificate", "Birth Certificate")}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="cloud-upload" size={14} color="#f97316" />
                      <Text style={styles.docUploadBtnText}>Replace</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Police Clearance Report */}
                <View style={styles.docItemCard}>
                  <View style={styles.docIconBox}>
                    <Ionicons name="shield" size={24} color="#f97316" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docTitle}>Police Clearance Report</Text>
                    <Text style={styles.docSubtitle}>Sri Lanka Police Background Clearance</Text>
                    <View style={styles.docStatusRow}>
                      <View style={[styles.docDot, { backgroundColor: agent?.policeReport ? "#22c55e" : "#eab308" }]} />
                      <Text style={styles.docStatusText}>
                        {agent?.policeReport ? "Verified on File" : "Document Not Uploaded"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.docActionCol}>
                    {agent?.policeReport && (
                      <TouchableOpacity
                        style={styles.docPreviewBtn}
                        onPress={() => setPreviewImage({ url: getFullImageUrl(agent.policeReport), title: "Police Clearance Report" })}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="eye" size={14} color="#0284c7" />
                        <Text style={styles.docPreviewBtnText}>View</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.docUploadBtn}
                      onPress={() => handleUploadDocument("policeReport", "Police Clearance Report")}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="cloud-upload" size={14} color="#f97316" />
                      <Text style={styles.docUploadBtnText}>Replace</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ── TAB 3: DIRECT SETTLEMENT BANK DETAILS ── */}
        {activeTab === "bank" && (
          <View style={styles.tabContent}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Ionicons name="card" size={18} color="#f97316" />
                  <Text style={styles.cardTitle}>Direct Settlement Bank Account</Text>
                </View>
                {!isEditingBank && (
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => setIsEditingBank(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="create-outline" size={15} color="#f97316" />
                    <Text style={styles.editBtnText}>Edit Account</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.cardDesc}>
                Direct credit account used for claim inspection fee disbursements, travel allowances, and monthly agent compensation.
              </Text>

              {isEditingBank ? (
                <View style={styles.editFormWrap}>
                  {/* Bank Name Picker */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Bank Name *</Text>
                    <TouchableOpacity
                      style={styles.dropdownBtn}
                      onPress={() => setShowBankPicker(true)}
                      activeOpacity={0.8}
                    >
                      <Text style={bankForm.bankName ? styles.dropdownSelected : styles.dropdownPlaceholder}>
                        {bankForm.bankName || "Select Licensed Bank"}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#64748b" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Bank Branch Name</Text>
                    <TextInput
                      style={styles.textInput}
                      value={bankForm.bankBranch}
                      onChangeText={(t) => setBankForm({ ...bankForm, bankBranch: t })}
                      placeholder="e.g. Galle Fort Branch"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Account Number *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={bankForm.accountNumber}
                      onChangeText={(t) => setBankForm({ ...bankForm, accountNumber: t })}
                      placeholder="e.g. 123456789012"
                      placeholderTextColor="#94a3b8"
                      keyboardType="number-pad"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Account Type</Text>
                    <View style={styles.accountTypeRow}>
                      {["Savings", "Current"].map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.accountTypeOption,
                            bankForm.accountType === type && styles.accountTypeOptionActive
                          ]}
                          onPress={() => setBankForm({ ...bankForm, accountType: type })}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name={bankForm.accountType === type ? "radio-button-on" : "radio-button-off"}
                            size={16}
                            color={bankForm.accountType === type ? "#f97316" : "#94a3b8"}
                          />
                          <Text
                            style={[
                              styles.accountTypeText,
                              bankForm.accountType === type && styles.accountTypeTextActive
                            ]}
                          >
                            {type} Account
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Account Holder Name</Text>
                    <TextInput
                      style={styles.textInput}
                      value={bankForm.accountHolderName}
                      onChangeText={(t) => setBankForm({ ...bankForm, accountHolderName: t })}
                      placeholder="e.g. A. B. C. Perera"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>

                  {/* Actions */}
                  <View style={styles.formActionRow}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => {
                        setIsEditingBank(false);
                        setBankForm({
                          bankName: agent?.bankName || "",
                          bankBranch: agent?.bankBranch || "",
                          accountNumber: agent?.accountNumber || "",
                          accountType: agent?.accountType || "Savings",
                          accountHolderName: agent?.accountHolderName || agent?.name || ""
                        });
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.saveBtn}
                      onPress={handleSaveBank}
                      disabled={savingBank}
                      activeOpacity={0.85}
                    >
                      {savingBank ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <Ionicons name="send" size={15} color="#ffffff" style={{ marginRight: 6 }} />
                          <Text style={styles.saveBtnText}>Submit to Branch</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.grid2Col}>
                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>BANK NAME</Text>
                    <View style={styles.viewField}>
                      <Ionicons name="business" size={15} color="#f97316" />
                      <Text style={styles.viewFieldValue}>{agent?.bankName || "Not configured"}</Text>
                    </View>
                  </View>

                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>BANK BRANCH</Text>
                    <View style={styles.viewField}>
                      <Ionicons name="location" size={15} color="#f97316" />
                      <Text style={styles.viewFieldValue}>{agent?.bankBranch || "Not configured"}</Text>
                    </View>
                  </View>

                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>ACCOUNT NUMBER</Text>
                    <View style={styles.viewField}>
                      <Ionicons name="card" size={15} color="#f97316" />
                      <Text style={[styles.viewFieldValue, { fontWeight: "800" }]}>
                        {agent?.accountNumber ? `•••• ${agent.accountNumber.slice(-4)}` : "Not configured"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>ACCOUNT TYPE</Text>
                    <View style={styles.viewField}>
                      <Ionicons name="wallet" size={15} color="#f97316" />
                      <Text style={styles.viewFieldValue}>{agent?.accountType || "Savings"}</Text>
                    </View>
                  </View>

                  <View style={[styles.fieldBlock, { width: "100%" }]}>
                    <Text style={styles.fieldLabel}>ACCOUNT HOLDER NAME</Text>
                    <View style={styles.viewField}>
                      <Ionicons name="person" size={15} color="#f97316" />
                      <Text style={styles.viewFieldValue}>
                        {agent?.accountHolderName || agent?.name || "Not configured"}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── TAB 4: ACCOUNT SECURITY & PASSWORD ── */}
        {activeTab === "security" && (
          <View style={styles.tabContent}>
            {/* Change Password Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Ionicons name="lock-closed" size={18} color="#f97316" />
                  <Text style={styles.cardTitle}>Change Agent Password</Text>
                </View>
              </View>

              <Text style={styles.cardDesc}>
                Update your field agent portal password. Password must be at least 6 characters with letters and numbers.
              </Text>

              <View style={styles.editFormWrap}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Current Password *</Text>
                  <View style={styles.passwordInputWrap}>
                    <TextInput
                      style={styles.passwordInput}
                      value={passwordForm.currentPassword}
                      onChangeText={(t) => setPasswordForm({ ...passwordForm, currentPassword: t })}
                      placeholder="Enter current password"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry={!showCurrentPw}
                    />
                    <TouchableOpacity
                      style={styles.eyeBtn}
                      onPress={() => setShowCurrentPw(!showCurrentPw)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={showCurrentPw ? "eye-off" : "eye"} size={18} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>New Password *</Text>
                  <View style={styles.passwordInputWrap}>
                    <TextInput
                      style={styles.passwordInput}
                      value={passwordForm.newPassword}
                      onChangeText={(t) => setPasswordForm({ ...passwordForm, newPassword: t })}
                      placeholder="Enter new secure password (min 6 chars)"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry={!showNewPw}
                    />
                    <TouchableOpacity
                      style={styles.eyeBtn}
                      onPress={() => setShowNewPw(!showNewPw)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={showNewPw ? "eye-off" : "eye"} size={18} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm New Password *</Text>
                  <View style={styles.passwordInputWrap}>
                    <TextInput
                      style={styles.passwordInput}
                      value={passwordForm.confirmPassword}
                      onChangeText={(t) => setPasswordForm({ ...passwordForm, confirmPassword: t })}
                      placeholder="Confirm new password"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry={!showConfirmPw}
                    />
                    <TouchableOpacity
                      style={styles.eyeBtn}
                      onPress={() => setShowConfirmPw(!showConfirmPw)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={showConfirmPw ? "eye-off" : "eye"} size={18} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.updatePasswordBtn}
                  onPress={handleChangePassword}
                  disabled={changingPassword}
                  activeOpacity={0.85}
                >
                  {changingPassword ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="shield-checkmark" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                      <Text style={styles.updatePasswordBtnText}>Update Credentials</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Logout Card */}
            <View style={[styles.card, { borderColor: "#fee2e2" }]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Ionicons name="log-out" size={18} color="#ef4444" />
                  <Text style={[styles.cardTitle, { color: "#ef4444" }]}>Session & Account</Text>
                </View>
              </View>

              <Text style={styles.cardDesc}>
                Log out of your field agent account on this mobile device. Your duty status will automatically be set to Offline.
              </Text>

              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
                <Ionicons name="log-out-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.logoutBtnText}>Log Out of Agent Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── MODALS ── */}

      {/* Full-Screen Document Zoom Modal */}
      {previewImage && (
        <Modal visible={true} transparent={true} animationType="fade" onRequestClose={() => setPreviewImage(null)}>
          <View style={styles.zoomModalBackdrop}>
            <View style={styles.zoomModalHeader}>
              <Text style={styles.zoomModalTitle}>{previewImage.title}</Text>
              <TouchableOpacity
                style={styles.zoomCloseBtn}
                onPress={() => setPreviewImage(null)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <View style={styles.zoomModalBody}>
              <Image source={{ uri: previewImage.url }} style={styles.zoomImage} resizeMode="contain" />
            </View>
          </View>
        </Modal>
      )}

      {/* Province Picker Modal */}
      <Modal visible={showProvincePicker} transparent={true} animationType="slide" onRequestClose={() => setShowProvincePicker(false)}>
        <View style={styles.pickerModalBackdrop}>
          <View style={styles.pickerModalSheet}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select Province</Text>
              <TouchableOpacity onPress={() => setShowProvincePicker(false)}>
                <Ionicons name="close" size={22} color="#0f172a" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 350 }}>
              {SRI_LANKA_PROVINCES.map((prov) => (
                <TouchableOpacity
                  key={prov}
                  style={[
                    styles.pickerOption,
                    personalForm.province === prov && styles.pickerOptionSelected
                  ]}
                  onPress={() => {
                    setPersonalForm({ ...personalForm, province: prov });
                    setShowProvincePicker(false);
                  }}
                >
                  <Text style={[styles.pickerOptionText, personalForm.province === prov && styles.pickerOptionTextSelected]}>
                    {prov}
                  </Text>
                  {personalForm.province === prov && <Ionicons name="checkmark" size={18} color="#f97316" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* District Picker Modal */}
      <Modal visible={showDistrictPicker} transparent={true} animationType="slide" onRequestClose={() => setShowDistrictPicker(false)}>
        <View style={styles.pickerModalBackdrop}>
          <View style={styles.pickerModalSheet}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select District</Text>
              <TouchableOpacity onPress={() => setShowDistrictPicker(false)}>
                <Ionicons name="close" size={22} color="#0f172a" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 350 }}>
              {SRI_LANKA_DISTRICTS.map((dist) => (
                <TouchableOpacity
                  key={dist}
                  style={[
                    styles.pickerOption,
                    personalForm.district === dist && styles.pickerOptionSelected
                  ]}
                  onPress={() => {
                    setPersonalForm({ ...personalForm, district: dist });
                    setShowDistrictPicker(false);
                  }}
                >
                  <Text style={[styles.pickerOptionText, personalForm.district === dist && styles.pickerOptionTextSelected]}>
                    {dist}
                  </Text>
                  {personalForm.district === dist && <Ionicons name="checkmark" size={18} color="#f97316" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Bank Picker Modal */}
      <Modal visible={showBankPicker} transparent={true} animationType="slide" onRequestClose={() => setShowBankPicker(false)}>
        <View style={styles.pickerModalBackdrop}>
          <View style={styles.pickerModalSheet}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select Licensed Bank</Text>
              <TouchableOpacity onPress={() => setShowBankPicker(false)}>
                <Ionicons name="close" size={22} color="#0f172a" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 350 }}>
              {Object.keys(sriLankaBanks).map((bank) => (
                <TouchableOpacity
                  key={bank}
                  style={[
                    styles.pickerOption,
                    bankForm.bankName === bank && styles.pickerOptionSelected
                  ]}
                  onPress={() => {
                    setBankForm({ ...bankForm, bankName: bank });
                    setShowBankPicker(false);
                  }}
                >
                  <Text style={[styles.pickerOptionText, bankForm.bankName === bank && styles.pickerOptionTextSelected]}>
                    {bank}
                  </Text>
                  {bankForm.bankName === bank && <Ionicons name="checkmark" size={18} color="#f97316" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Custom Popup Alert / Confirm Modal */}
      {customPopup.show && (
        <Modal visible={true} transparent={true} animationType="fade" onRequestClose={() => setCustomPopup({ ...customPopup, show: false })}>
          <View style={styles.popupBackdrop}>
            <View style={styles.popupCard}>
              <View
                style={[
                  styles.popupIconCircle,
                  customPopup.type === "success" && { backgroundColor: "#dcfce7" },
                  customPopup.type === "error" && { backgroundColor: "#fee2e2" },
                  customPopup.type === "confirm" && { backgroundColor: "#ffedd5" },
                  customPopup.type === "info" && { backgroundColor: "#e0f2fe" }
                ]}
              >
                <Ionicons
                  name={
                    customPopup.type === "success"
                      ? "checkmark-circle"
                      : customPopup.type === "error"
                      ? "alert-circle"
                      : customPopup.type === "confirm"
                      ? "help-circle"
                      : "information-circle"
                  }
                  size={32}
                  color={
                    customPopup.type === "success"
                      ? "#16a34a"
                      : customPopup.type === "error"
                      ? "#dc2626"
                      : customPopup.type === "confirm"
                      ? "#f97316"
                      : "#0284c7"
                  }
                />
              </View>

              <Text style={styles.popupTitle}>{customPopup.title}</Text>
              <Text style={styles.popupMessage}>{customPopup.message}</Text>

              {customPopup.type === "confirm" ? (
                <View style={styles.popupBtnRow}>
                  <TouchableOpacity
                    style={styles.popupCancelBtn}
                    onPress={() => setCustomPopup({ ...customPopup, show: false })}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.popupCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.popupConfirmBtn}
                    onPress={() => {
                      setCustomPopup({ ...customPopup, show: false });
                      if (customPopup.onConfirm) customPopup.onConfirm();
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.popupConfirmBtnText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.popupOkBtn,
                    customPopup.type === "success" && { backgroundColor: "#16a34a" },
                    customPopup.type === "error" && { backgroundColor: "#dc2626" },
                    customPopup.type === "info" && { backgroundColor: "#f97316" }
                  ]}
                  onPress={() => setCustomPopup({ ...customPopup, show: false })}
                  activeOpacity={0.85}
                >
                  <Text style={styles.popupOkBtnText}>OK</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
      )}

      {/* Bottom Navbar with Profile active */}
      <AgentNavbar activeTab="profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f8fafc"
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
    gap: 12
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#94a3b8"
  },

  /* Hero Gradient */
  heroGradient: {
    paddingTop: Platform.OS === "ios" ? 52 : (StatusBar.currentHeight || 30) + 12,
    paddingBottom: 22,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28
  },
  topNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16
  },
  navBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center"
  },
  navTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff"
  },

  /* Hero Profile Row */
  heroProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16
  },
  avatarWrapper: {
    position: "relative"
  },
  avatarImage: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 3,
    borderColor: "#f97316"
  },
  avatarFallback: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "#334155",
    borderWidth: 3,
    borderColor: "#f97316",
    justifyContent: "center",
    alignItems: "center"
  },
  avatarFallbackText: {
    fontSize: 26,
    fontWeight: "900",
    color: "#ffffff"
  },
  cameraBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#f97316",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#0f172a"
  },
  removePhotoBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#ef4444",
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#0f172a"
  },
  heroDetails: {
    flex: 1,
    gap: 4
  },
  heroName: {
    fontSize: 19,
    fontWeight: "900",
    color: "#ffffff"
  },
  heroPillRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6
  },
  agentIdBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(249,115,22,0.18)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  agentIdText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#f97316"
  },
  branchBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  branchText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#cbd5e1"
  },
  heroEmail: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2
  },

  /* Duty Switcher Card */
  dutySwitcherCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14
  },
  dutyLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  dutyLivePulse: {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  dutyTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff"
  },
  dutyToggleGroup: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 10,
    padding: 3,
    gap: 4
  },
  dutyToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8
  },
  dutyToggleBtnActive: {
    backgroundColor: "rgba(34,197,94,0.2)",
    borderWidth: 1,
    borderColor: "#22c55e"
  },
  dutyToggleBtnOffline: {
    backgroundColor: "rgba(239,68,68,0.2)",
    borderWidth: 1,
    borderColor: "#ef4444"
  },
  dutyToggleText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b"
  },
  dutyToggleTextActive: {
    color: "#22c55e",
    fontWeight: "800"
  },
  dutyToggleTextOffline: {
    color: "#ef4444",
    fontWeight: "800"
  },

  /* Stats Row */
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)"
  },
  statNum: {
    fontSize: 18,
    fontWeight: "900",
    color: "#ffffff"
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94a3b8",
    marginTop: 2
  },

  /* Notification Banners */
  bannerAlertAmber: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#fef3c7",
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b",
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 10
  },
  bannerAmberTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#92400e"
  },
  bannerAmberDesc: {
    fontSize: 11,
    color: "#b45309",
    marginTop: 2,
    lineHeight: 16
  },
  bannerAlertRed: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#fef2f2",
    borderLeftWidth: 4,
    borderLeftColor: "#ef4444",
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 10
  },
  bannerRedTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#991b1b"
  },
  bannerRedDesc: {
    fontSize: 11,
    color: "#b91c1c",
    marginTop: 2,
    lineHeight: 16
  },

  /* Category Tabs */
  tabsScrollContainer: {
    marginTop: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0"
  },
  tabsRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 8
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  tabButtonActive: {
    backgroundColor: "#fff7ed",
    borderColor: "#f97316"
  },
  tabText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#64748b"
  },
  tabTextActive: {
    color: "#f97316",
    fontWeight: "800"
  },

  /* Content Cards */
  tabContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 14
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a"
  },
  cardDesc: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 17,
    marginBottom: 14
  },
  authorityPill: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  authorityPillText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#64748b"
  },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  verifiedPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#16a34a"
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff7ed",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fed7aa"
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#f97316"
  },

  /* Grid Fields */
  grid2Col: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12
  },
  fieldBlock: {
    width: "48%"
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94a3b8",
    marginBottom: 4,
    letterSpacing: 0.4
  },
  lockedInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9
  },
  lockedValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    flex: 1
  },
  viewField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fbfcfd",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9
  },
  viewFieldValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1e293b",
    flex: 1
  },

  /* Forms */
  editFormWrap: {
    gap: 12
  },
  inputGroup: {
    gap: 5
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155"
  },
  textInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: "#0f172a"
  },
  dropdownBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  dropdownPlaceholder: {
    fontSize: 13,
    color: "#94a3b8"
  },
  dropdownSelected: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a"
  },
  formActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center"
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#64748b"
  },
  saveBtn: {
    flex: 2,
    backgroundColor: "#f97316",
    borderRadius: 10,
    paddingVertical: 11,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center"
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff"
  },

  /* Bank Account Types */
  accountTypeRow: {
    flexDirection: "row",
    gap: 10
  },
  accountTypeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  accountTypeOptionActive: {
    borderColor: "#f97316",
    backgroundColor: "#fff7ed"
  },
  accountTypeText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#64748b"
  },
  accountTypeTextActive: {
    color: "#f97316",
    fontWeight: "800"
  },

  /* Document Cards */
  docsList: {
    gap: 10
  },
  docItemCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 12
  },
  docIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#fff7ed",
    justifyContent: "center",
    alignItems: "center"
  },
  docTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a"
  },
  docSubtitle: {
    fontSize: 10.5,
    color: "#64748b",
    marginTop: 1
  },
  docStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 3
  },
  docDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  docStatusText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569"
  },
  docActionCol: {
    gap: 6
  },
  docPreviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6
  },
  docPreviewBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0284c7"
  },
  docUploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff7ed",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#fed7aa"
  },
  docUploadBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#f97316"
  },

  /* Password Section */
  passwordInputWrap: {
    position: "relative",
    justifyContent: "center"
  },
  passwordInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingLeft: 12,
    paddingRight: 42,
    paddingVertical: 9,
    fontSize: 13,
    color: "#0f172a"
  },
  eyeBtn: {
    position: "absolute",
    right: 12,
    height: "100%",
    justifyContent: "center"
  },
  updatePasswordBtn: {
    backgroundColor: "#0f172a",
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6
  },
  updatePasswordBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff"
  },
  logoutBtn: {
    backgroundColor: "#ef4444",
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center"
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff"
  },

  /* Full Screen Zoom Modal */
  zoomModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.95)",
    justifyContent: "space-between",
    paddingVertical: 40,
    paddingHorizontal: 16
  },
  zoomModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  zoomModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff"
  },
  zoomCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center"
  },
  zoomModalBody: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  zoomImage: {
    width: "100%",
    height: "80%"
  },

  /* Picker Modal */
  pickerModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end"
  },
  pickerModalSheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: 460
  },
  pickerModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9"
  },
  pickerModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a"
  },
  pickerOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc"
  },
  pickerOptionSelected: {
    backgroundColor: "#fff7ed",
    borderRadius: 8,
    paddingHorizontal: 8
  },
  pickerOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155"
  },
  pickerOptionTextSelected: {
    color: "#f97316",
    fontWeight: "800"
  },

  /* Custom Popup Alert / Confirm */
  popupBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24
  },
  popupCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 8
  },
  popupIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14
  },
  popupTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 8
  },
  popupMessage: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 18
  },
  popupOkBtn: {
    width: "100%",
    backgroundColor: "#f97316",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center"
  },
  popupOkBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff"
  },
  popupBtnRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%"
  },
  popupCancelBtn: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center"
  },
  popupCancelBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#64748b"
  },
  popupConfirmBtn: {
    flex: 1,
    backgroundColor: "#ef4444",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center"
  },
  popupConfirmBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff"
  }
});
