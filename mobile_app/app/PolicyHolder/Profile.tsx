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
import PolicyHolderNavbar from "../Components/PolicyHolder/page";
import { API_BASE_URL } from "../_config";
import { compressImageMobile } from "../../utils/imageCompressor";

const { width: SCREEN_W } = Dimensions.get("window");

interface Vehicle {
  vehicleType: string;
  numberPlate: string;
  company: string;
  model: string;
  year: string | number;
  engineNumber?: string;
  chassisNumber?: string;
  policyNumber?: string;
}

interface PolicyHolderData {
  _id: string;
  firstName: string;
  lastName: string;
  nic: string;
  mobile: string;
  email: string;
  dob: string;
  address: string;
  province?: string;
  city?: string;
  branch: string;
  referenceNumber: string;
  profilePhoto?: string;
  vehicles?: Vehicle[];
  documents?: {
    nicFront?: string;
    nicBack?: string;
    vehicleReg?: string;
    revenueLicense?: string;
  };
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

function formatPlate(plate: string) {
  if (!plate) return "";
  const cleaned = plate.trim();
  if (cleaned.includes("-")) return cleaned.toUpperCase();
  const m = cleaned.match(/^(.*[A-Za-z]+)(\d+)$/);
  if (m) return `${m[1].trim().toUpperCase()}-${m[2]}`;
  return cleaned.toUpperCase();
}

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

function getVehicleIcon(type: string) {
  const t = (type || "").toLowerCase().trim();
  if (t.includes("bike") || t.includes("motorcycle") || t.includes("scooter")) return "motorbike";
  if (t.includes("van") || t.includes("minibus")) return "van-utility";
  if (t.includes("bus")) return "bus";
  if (t.includes("truck") || t.includes("lorry")) return "truck";
  if (t.includes("suv")) return "car-estate";
  if (t.includes("tuk") || t.includes("three") || t.includes("rickshaw")) return "rickshaw";
  if (t.includes("tractor")) return "tractor";
  if (t.includes("cab") || t.includes("pickup")) return "truck-pickup";
  return "car-side";
}

export default function PolicyHolderProfilePage() {
  const navigation = useNavigation();

  const [user, setUser] = useState<PolicyHolderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userNic, setUserNic] = useState("");

  // Category Tab: "personal" | "documents" | "vehicles" | "security"
  const [activeTab, setActiveTab] = useState<"personal" | "documents" | "vehicles" | "security">("personal");

  // Edit states
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [personalForm, setPersonalForm] = useState({
    mobile: "",
    email: "",
    address: "",
    city: "",
    province: ""
  });

  // Password Change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Update Requests state
  const [updateRequests, setUpdateRequests] = useState<any[]>([]);

  // Photo upload & preview modal
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Add Vehicle Modal state
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({
    numberPlate: "",
    vehicleType: "Car",
    company: "",
    model: "",
    year: "",
    engineNumber: "",
    chassisNumber: "",
    policyNumber: ""
  });

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

  // Fetch policyholder profile
  const fetchProfile = async (nicToFetch: string, silent = false) => {
    if (!nicToFetch) return;
    try {
      if (!silent) setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/policy-holder/profile?nic=${encodeURIComponent(nicToFetch)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load profile.");

      if (data.user) {
        setUser(data.user);
        setPersonalForm({
          mobile: data.user.mobile || "",
          email: data.user.email || "",
          address: data.user.address || "",
          city: data.user.city || "",
          province: data.user.province || ""
        });
        // Update local session
        await AsyncStorage.setItem("logged_in_user", JSON.stringify(data.user));
      }

      await fetchUpdateRequests(nicToFetch);
    } catch (err: any) {
      console.error("Profile fetch error:", err);
      if (!silent) {
        setCustomPopup({
          show: true,
          title: "Profile Error",
          message: err.message || "Failed to load policyholder details.",
          type: "error"
        });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Fetch update requests
  const fetchUpdateRequests = async (nicToFetch: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/policy-holder/profile-update-requests?nic=${encodeURIComponent(nicToFetch)}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.requests)) {
        setUpdateRequests(data.requests);
      }
    } catch (e) {
      console.error("Fetch update requests error:", e);
    }
  };

  useEffect(() => {
    (async () => {
      const userStr = await AsyncStorage.getItem("logged_in_user");
      if (!userStr) {
        router.replace("/login/page");
        return;
      }
      try {
        const parsed = JSON.parse(userStr);
        if (parsed.nic) {
          setUserNic(parsed.nic);
          fetchProfile(parsed.nic);
        } else {
          router.replace("/login/page");
        }
      } catch {
        router.replace("/login/page");
      }
    })();
  }, []);

  // Real-time polling
  useEffect(() => {
    if (!userNic) return;
    const interval = setInterval(() => {
      fetchProfile(userNic, true);
    }, 6000);
    return () => clearInterval(interval);
  }, [userNic]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (userNic) {
      fetchProfile(userNic, true).finally(() => setRefreshing(false));
    } else {
      setRefreshing(false);
    }
  }, [userNic]);

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

        const res = await fetch(`${API_BASE_URL}/api/policy-holder/profile`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nic: userNic,
            profilePhoto: compressedBase64
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update profile photo.");

        if (data.user) {
          setUser(data.user);
          await AsyncStorage.setItem("logged_in_user", JSON.stringify(data.user));
        }

        setCustomPopup({
          show: true,
          title: "Photo Updated",
          message: "Your profile photo has been updated successfully.",
          type: "success"
        });
      }
    } catch (err: any) {
      console.error("Photo upload error:", err);
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
      const res = await fetch(`${API_BASE_URL}/api/policy-holder/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nic: userNic,
          profilePhoto: ""
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove photo.");

      if (data.user) {
        setUser(data.user);
        await AsyncStorage.setItem("logged_in_user", JSON.stringify(data.user));
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
    if (!personalForm.mobile.trim()) {
      setCustomPopup({
        show: true,
        title: "Validation Error",
        message: "Mobile phone number is required.",
        type: "error"
      });
      return;
    }

    setSavingPersonal(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/policy-holder/profile-update-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nic: userNic,
          requestType: "Personal & Contact",
          requestedChanges: {
            mobile: personalForm.mobile.trim(),
            address: personalForm.address.trim(),
            city: personalForm.city.trim(),
            province: personalForm.province.trim()
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit contact edit request.");

      setIsEditingPersonal(false);
      await fetchUpdateRequests(userNic);

      setCustomPopup({
        show: true,
        title: "Edit Request Submitted",
        message: `Your contact details edit request has been sent to ${user?.branch || "Galle"} Branch for verification. Once approved by branch staff, your records will be updated automatically.`,
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

  // Upload/Replace Document File and Submit Request to Branch
  const handleUploadDocument = async (docType: "nicFront" | "nicBack" | "vehicleReg" | "revenueLicense", docName: string) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setLoading(true);
        const compressed = await compressImageMobile(result.assets[0].uri, 1200, 0.7);

        const requestedChanges: any = { documents: {} };
        requestedChanges.documents[docType] = compressed;

        const res = await fetch(`${API_BASE_URL}/api/policy-holder/profile-update-request`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nic: userNic,
            requestType: "KYC Documents",
            requestedChanges
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to upload document update request.");

        await fetchUpdateRequests(userNic);

        setCustomPopup({
          show: true,
          title: "Document Submitted",
          message: `Your new ${docName} has been uploaded and sent to ${user?.branch || "Galle"} Branch for KYC verification and approval.`,
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

  // Add New Vehicle
  const handleAddVehicle = async () => {
    if (!vehicleForm.numberPlate.trim() || !vehicleForm.model.trim()) {
      setCustomPopup({
        show: true,
        title: "Validation Error",
        message: "Vehicle number plate and model are required.",
        type: "error"
      });
      return;
    }

    setAddingVehicle(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/policy-holder/vehicles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nic: userNic,
          ...vehicleForm,
          numberPlate: formatPlate(vehicleForm.numberPlate)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add vehicle.");

      if (data.policyHolder) {
        setUser(data.policyHolder);
        await AsyncStorage.setItem("logged_in_user", JSON.stringify(data.policyHolder));
      }

      setShowAddVehicleModal(false);
      setVehicleForm({
        numberPlate: "",
        vehicleType: "Car",
        company: "",
        model: "",
        year: "",
        engineNumber: "",
        chassisNumber: "",
        policyNumber: ""
      });

      setCustomPopup({
        show: true,
        title: "Vehicle Added",
        message: "Your new insured vehicle has been registered successfully.",
        type: "success"
      });
    } catch (err: any) {
      setCustomPopup({
        show: true,
        title: "Failed to Add Vehicle",
        message: err.message || "Could not save vehicle.",
        type: "error"
      });
    } finally {
      setAddingVehicle(false);
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
      const res = await fetch(`${API_BASE_URL}/api/policy-holder/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nic: userNic,
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change password.");

      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });

      setCustomPopup({
        show: true,
        title: "Password Updated",
        message: "Your policyholder login credentials have been updated successfully.",
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
      message: "Are you sure you want to log out of your policyholder account?",
      type: "confirm",
      onConfirm: async () => {
        await AsyncStorage.removeItem("logged_in_user");
        router.replace("/login/page");
      }
    });
  };

  const initials = `${user?.firstName?.charAt(0) || "U"}${user?.lastName?.charAt(0) || ""}`.toUpperCase();

  const pendingPersonalReq = updateRequests.find(r => r.status === "Pending" && (r.requestType?.includes("Personal") || r.requestType?.includes("Contact")));
  const recentRejectedPersonal = updateRequests.find(r => r.status === "Rejected" && (r.requestType?.includes("Personal") || r.requestType?.includes("Contact")));

  const pendingKycReq = updateRequests.find(r => r.status === "Pending" && (r.requestType?.includes("KYC") || r.requestType?.includes("Document")));
  const recentRejectedKyc = updateRequests.find(r => r.status === "Rejected" && (r.requestType?.includes("KYC") || r.requestType?.includes("Document")));

  if (loading && !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000080" />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* ── HEADER BAR ── */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#ffffff" />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>My Profile</Text>
          <Text style={styles.headerSubtitle}>{user?.branch || "Galle"} Branch Policyholder</Text>
        </View>

        <TouchableOpacity
          style={styles.headerActionBtn}
          onPress={onRefresh}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#000080"]} />}
      >
        {/* ── HERO PROFILE CARD ── */}
        <View style={styles.heroCard}>
          <LinearGradient
            colors={["#0f172a", "#1e293b"]}
            style={styles.heroGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.heroRow}>
              {/* Avatar with Camera Overlay */}
              <View style={styles.avatarWrapper}>
                <View style={styles.avatarBox}>
                  {user?.profilePhoto ? (
                    <Image
                      source={{ uri: getFullImageUrl(user.profilePhoto) }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <Text style={styles.avatarInitials}>{initials}</Text>
                  )}
                  {uploadingPhoto && (
                    <View style={styles.avatarUploadingOverlay}>
                      <ActivityIndicator size="small" color="#ffffff" />
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.cameraBtn}
                  onPress={handlePickPhoto}
                  activeOpacity={0.85}
                >
                  <Ionicons name="camera" size={14} color="#ffffff" />
                </TouchableOpacity>
              </View>

              {/* Name & Badges */}
              <View style={styles.identityCol}>
                <View style={styles.nameRow}>
                  <Text style={styles.heroName} numberOfLines={1}>
                    {user?.firstName} {user?.lastName}
                  </Text>
                </View>

                <View style={styles.badgeRow}>
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={13} color="#10b981" />
                    <Text style={styles.verifiedText}>Verified Policyholder</Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaPill}>REF: {user?.referenceNumber || "POL-1001"}</Text>
                  <Text style={styles.metaDot}>•</Text>
                  <Text style={styles.metaPill}>{user?.branch || "Galle"} Branch</Text>
                </View>
              </View>
            </View>

            {/* Quick Contact Line */}
            <View style={styles.heroContactRow}>
              <View style={styles.contactItem}>
                <Ionicons name="call-outline" size={13} color="#94a3b8" />
                <Text style={styles.contactText}>{user?.mobile || "No mobile"}</Text>
              </View>
              <View style={styles.contactItem}>
                <Ionicons name="card-outline" size={13} color="#94a3b8" />
                <Text style={styles.contactText}>{user?.nic || "-"}</Text>
              </View>
            </View>

            {user?.profilePhoto && (
              <TouchableOpacity
                style={styles.removePhotoBtn}
                onPress={handleRemovePhoto}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={12} color="#f87171" />
                <Text style={styles.removePhotoText}>Remove Photo</Text>
              </TouchableOpacity>
            )}
          </LinearGradient>
        </View>

        {/* ── CATEGORY TABS ── */}
        <View style={styles.tabBar}>
          {[
            { id: "personal", label: "Personal", icon: "person-outline" },
            { id: "documents", label: "Documents", icon: "document-text-outline" },
            { id: "vehicles", label: `Vehicles (${user?.vehicles?.length || 0})`, icon: "car-outline" },
            { id: "security", label: "Security", icon: "lock-closed-outline" }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab.id as any)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={15}
                  color={isActive ? "#ffffff" : "#64748b"}
                />
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── TAB 1: PERSONAL & CONTACT ── */}
        {activeTab === "personal" && (
          <View style={styles.card}>
            {/* Pending Request Banner */}
            {pendingPersonalReq && (
              <View style={styles.alertBannerWarning}>
                <Ionicons name="alert-circle" size={18} color="#d97706" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertBannerTitleWarning}>Contact Edit Request Under Branch Review</Text>
                  <Text style={styles.alertBannerDescWarning}>
                    You submitted an update request on {formatDate(pendingPersonalReq.createdAt)} to {user?.branch || "Galle"} Branch. Records will update automatically upon approval.
                  </Text>
                </View>
              </View>
            )}

            {/* Rejected Banner */}
            {!pendingPersonalReq && recentRejectedPersonal && (
              <View style={styles.alertBannerDanger}>
                <Ionicons name="close-circle" size={18} color="#dc2626" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertBannerTitleDanger}>Previous Request Rejected by Branch</Text>
                  <Text style={styles.alertBannerDescDanger}>
                    Reason: {recentRejectedPersonal.reviewNote || "Information mismatch"}. You may correct and resubmit.
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>Personal & Contact Details</Text>
                <Text style={styles.cardSubtitle}>Your verified policyholder contact information</Text>
              </View>
              <TouchableOpacity
                style={[styles.editBtn, isEditingPersonal && styles.editBtnCancel]}
                onPress={() => setIsEditingPersonal(!isEditingPersonal)}
                activeOpacity={0.8}
              >
                <Ionicons name={isEditingPersonal ? "close" : "create-outline"} size={14} color={isEditingPersonal ? "#475569" : "#ffffff"} />
                <Text style={[styles.editBtnText, isEditingPersonal && styles.editBtnTextCancel]}>
                  {isEditingPersonal ? "Cancel" : "Edit Info"}
                </Text>
              </TouchableOpacity>
            </View>

            {isEditingPersonal ? (
              <View style={styles.formWrap}>
                <View style={styles.formGroup}>
                  <View style={styles.lockedHeader}>
                    <Text style={styles.inputLabel}>Full Name</Text>
                    <Text style={styles.lockedBadge}>Branch Only</Text>
                  </View>
                  <TextInput
                    editable={false}
                    value={`${user?.firstName || ""} ${user?.lastName || ""}`.trim()}
                    style={[styles.input, styles.inputDisabled]}
                  />
                </View>

                <View style={styles.formGroup}>
                  <View style={styles.lockedHeader}>
                    <Text style={styles.inputLabel}>National ID (NIC)</Text>
                    <Text style={styles.lockedBadge}>Branch Only</Text>
                  </View>
                  <TextInput
                    editable={false}
                    value={user?.nic || ""}
                    style={[styles.input, styles.inputDisabled, styles.fontMono]}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Mobile Phone Number *</Text>
                  <TextInput
                    keyboardType="phone-pad"
                    value={personalForm.mobile}
                    onChangeText={(val) => setPersonalForm({ ...personalForm, mobile: val })}
                    placeholder="0771234567"
                    style={styles.input}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>City / Town</Text>
                  <TextInput
                    value={personalForm.city}
                    onChangeText={(val) => setPersonalForm({ ...personalForm, city: val })}
                    placeholder="e.g. Galle"
                    style={styles.input}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Province</Text>
                  <TextInput
                    value={personalForm.province}
                    onChangeText={(val) => setPersonalForm({ ...personalForm, province: val })}
                    placeholder="e.g. Southern Province"
                    style={styles.input}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Residential Home Address</Text>
                  <TextInput
                    multiline
                    numberOfLines={2}
                    value={personalForm.address}
                    onChangeText={(val) => setPersonalForm({ ...personalForm, address: val })}
                    placeholder="Enter street address"
                    style={[styles.input, styles.inputMulti]}
                  />
                </View>

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
                      <Ionicons name="checkmark" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                      <Text style={styles.saveBtnText}>Submit Changes for Verification</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.infoGrid}>
                {[
                  { label: "First Name", val: user?.firstName || "-" },
                  { label: "Last Name", val: user?.lastName || "-" },
                  { label: "National ID (NIC)", val: user?.nic || "-", locked: true, isMono: true },
                  { label: "Policy Ref. Number", val: user?.referenceNumber || "POL-1001", locked: true, isMono: true },
                  { label: "Assigned Branch", val: `${user?.branch || "Galle"} Branch`, locked: true },
                  { label: "Date of Birth", val: formatDate(user?.dob) },
                  { label: "Mobile Phone", val: user?.mobile || "-", isMono: true },
                  { label: "Email Address", val: user?.email || "-", isMono: true },
                  { label: "City", val: user?.city || "-" },
                  { label: "Province", val: user?.province || "-" }
                ].map((item, idx) => (
                  <View key={idx} style={styles.infoBox}>
                    <View style={styles.infoBoxTop}>
                      <Text style={styles.infoLabel}>{item.label}</Text>
                      {item.locked && <Text style={styles.miniLockBadge}>Locked</Text>}
                    </View>
                    <Text style={[styles.infoVal, item.isMono && styles.fontMono]}>{item.val}</Text>
                  </View>
                ))}

                <View style={[styles.infoBox, { width: "100%" }]}>
                  <Text style={styles.infoLabel}>Residential Address</Text>
                  <Text style={styles.infoVal}>{user?.address || "-"}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── TAB 2: KYC & DOCUMENTS ── */}
        {activeTab === "documents" && (
          <View style={styles.card}>
            {/* Pending Banner */}
            {pendingKycReq && (
              <View style={styles.alertBannerWarning}>
                <Ionicons name="alert-circle" size={18} color="#d97706" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertBannerTitleWarning}>Document Verification In Progress</Text>
                  <Text style={styles.alertBannerDescWarning}>
                    Your submitted KYC documents are being verified by {user?.branch || "Galle"} Branch staff.
                  </Text>
                </View>
              </View>
            )}

            {!pendingKycReq && recentRejectedKyc && (
              <View style={styles.alertBannerDanger}>
                <Ionicons name="close-circle" size={18} color="#dc2626" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertBannerTitleDanger}>Document Rejected by Branch</Text>
                  <Text style={styles.alertBannerDescDanger}>
                    Reason: {recentRejectedKyc.reviewNote || "Unclear image"}. Please upload a clear photo.
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>Registered KYC & Policy Documents</Text>
                <Text style={styles.cardSubtitle}>Identity and vehicle ownership documents</Text>
              </View>
            </View>

            <View style={styles.docsGrid}>
              {[
                { label: "National ID (Front)", key: "nicFront" as const, url: user?.documents?.nicFront },
                { label: "National ID (Back)", key: "nicBack" as const, url: user?.documents?.nicBack },
                { label: "Vehicle Registration", key: "vehicleReg" as const, url: user?.documents?.vehicleReg },
                { label: "Revenue License", key: "revenueLicense" as const, url: user?.documents?.revenueLicense }
              ].map((doc, idx) => {
                const isAvailable = Boolean(doc.url);
                const fullUrl = getFullImageUrl(doc.url);

                return (
                  <View key={idx} style={styles.docCard}>
                    <View style={styles.docCardHeader}>
                      <Text style={styles.docTitle} numberOfLines={1}>{doc.label}</Text>
                      <View style={[styles.docStatusBadge, isAvailable ? styles.docStatusVerified : styles.docStatusMissing]}>
                        <Text style={[styles.docStatusText, isAvailable ? styles.docStatusTextVerified : styles.docStatusTextMissing]}>
                          {isAvailable ? "Verified" : "Missing"}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.docImageBox}
                      onPress={() => isAvailable && fullUrl && setPreviewImage({ url: fullUrl, title: doc.label })}
                      activeOpacity={isAvailable ? 0.85 : 1}
                    >
                      {isAvailable && fullUrl ? (
                        <Image source={{ uri: fullUrl }} style={styles.docImage} resizeMode="cover" />
                      ) : (
                        <View style={styles.docPlaceholder}>
                          <Ionicons name="document-attach-outline" size={28} color="#cbd5e1" />
                          <Text style={styles.docPlaceholderText}>No file attached</Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    <View style={styles.docActionsRow}>
                      {isAvailable && (
                        <TouchableOpacity
                          style={styles.docViewBtn}
                          onPress={() => setPreviewImage({ url: fullUrl, title: doc.label })}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="eye-outline" size={13} color="#0284c7" />
                          <Text style={styles.docViewText}>View</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={styles.docUploadBtn}
                        onPress={() => handleUploadDocument(doc.key, doc.label)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="cloud-upload-outline" size={13} color="#ffffff" />
                        <Text style={styles.docUploadText}>{isAvailable ? "Replace" : "Upload"}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── TAB 3: REGISTERED VEHICLES ── */}
        {activeTab === "vehicles" && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>Registered Insured Vehicles</Text>
                <Text style={styles.cardSubtitle}>Active motor insurance policies registered on your account</Text>
              </View>
              <TouchableOpacity
                style={styles.addVehicleBtn}
                onPress={() => setShowAddVehicleModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={15} color="#ffffff" />
                <Text style={styles.addVehicleBtnText}>Add Vehicle</Text>
              </TouchableOpacity>
            </View>

            {(user?.vehicles || []).length === 0 ? (
              <View style={styles.emptyVehicles}>
                <Ionicons name="car-outline" size={36} color="#cbd5e1" />
                <Text style={styles.emptyVehiclesTitle}>No vehicles registered yet.</Text>
                <Text style={styles.emptyVehiclesSub}>Add your motor vehicle details to enable fast claim reporting.</Text>
              </View>
            ) : (
              <View style={styles.vehiclesList}>
                {(user?.vehicles || []).map((veh, idx) => (
                  <View key={idx} style={styles.vehicleCard}>
                    <View style={styles.vehCardTop}>
                      <View style={styles.vehIconBox}>
                        <MaterialCommunityIcons name={getVehicleIcon(veh.vehicleType) as any} size={22} color="#000080" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.vehPlate}>{formatPlate(veh.numberPlate)}</Text>
                        <Text style={styles.vehModel}>{veh.company} {veh.model} ({veh.year || "N/A"})</Text>
                      </View>
                      <View style={styles.vehTypePill}>
                        <Text style={styles.vehTypePillText}>{veh.vehicleType}</Text>
                      </View>
                    </View>

                    <View style={styles.vehDetailsRow}>
                      <View style={styles.vehDetailCol}>
                        <Text style={styles.vehDetailLabel}>Engine No.</Text>
                        <Text style={styles.vehDetailVal}>{veh.engineNumber || "-"}</Text>
                      </View>
                      <View style={styles.vehDetailCol}>
                        <Text style={styles.vehDetailLabel}>Chassis No.</Text>
                        <Text style={styles.vehDetailVal}>{veh.chassisNumber || "-"}</Text>
                      </View>
                      <View style={styles.vehDetailCol}>
                        <Text style={styles.vehDetailLabel}>Policy No.</Text>
                        <Text style={styles.vehDetailVal}>{veh.policyNumber || "Standard Active"}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── TAB 4: ACCOUNT SECURITY ── */}
        {activeTab === "security" && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>Account Login Security</Text>
                <Text style={styles.cardSubtitle}>Update your password to keep your policies secure</Text>
              </View>
            </View>

            <View style={styles.formWrap}>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Current Password *</Text>
                <View style={styles.pwWrap}>
                  <TextInput
                    secureTextEntry={!showCurrentPw}
                    value={passwordForm.currentPassword}
                    onChangeText={(val) => setPasswordForm({ ...passwordForm, currentPassword: val })}
                    placeholder="Enter current password"
                    style={[styles.input, styles.pwInput]}
                  />
                  <TouchableOpacity
                    style={styles.pwEye}
                    onPress={() => setShowCurrentPw(!showCurrentPw)}
                  >
                    <Ionicons name={showCurrentPw ? "eye-off-outline" : "eye-outline"} size={18} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>New Password * (Min 6 chars)</Text>
                <View style={styles.pwWrap}>
                  <TextInput
                    secureTextEntry={!showNewPw}
                    value={passwordForm.newPassword}
                    onChangeText={(val) => setPasswordForm({ ...passwordForm, newPassword: val })}
                    placeholder="Enter at least 6 characters"
                    style={[styles.input, styles.pwInput]}
                  />
                  <TouchableOpacity
                    style={styles.pwEye}
                    onPress={() => setShowNewPw(!showNewPw)}
                  >
                    <Ionicons name={showNewPw ? "eye-off-outline" : "eye-outline"} size={18} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Confirm New Password *</Text>
                <View style={styles.pwWrap}>
                  <TextInput
                    secureTextEntry={!showConfirmPw}
                    value={passwordForm.confirmPassword}
                    onChangeText={(val) => setPasswordForm({ ...passwordForm, confirmPassword: val })}
                    placeholder="Re-enter new password"
                    style={[styles.input, styles.pwInput]}
                  />
                  <TouchableOpacity
                    style={styles.pwEye}
                    onPress={() => setShowConfirmPw(!showConfirmPw)}
                  >
                    <Ionicons name={showConfirmPw ? "eye-off-outline" : "eye-outline"} size={18} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleChangePassword}
                disabled={changingPassword}
                activeOpacity={0.85}
              >
                {changingPassword ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="lock-closed" size={15} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.saveBtnText}>Update Password</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.logoutSectionBtn}
                onPress={handleLogout}
                activeOpacity={0.8}
              >
                <Ionicons name="log-out-outline" size={16} color="#ef4444" style={{ marginRight: 6 }} />
                <Text style={styles.logoutSectionText}>Log Out of Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </ScrollView>

      {/* ── ADD VEHICLE MODAL ── */}
      <Modal
        visible={showAddVehicleModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddVehicleModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register New Vehicle</Text>
              <TouchableOpacity onPress={() => setShowAddVehicleModal(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Number Plate *</Text>
                <TextInput
                  value={vehicleForm.numberPlate}
                  onChangeText={(val) => setVehicleForm({ ...vehicleForm, numberPlate: val })}
                  placeholder="WP CAR-1234"
                  style={styles.input}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Vehicle Type</Text>
                <TextInput
                  value={vehicleForm.vehicleType}
                  onChangeText={(val) => setVehicleForm({ ...vehicleForm, vehicleType: val })}
                  placeholder="Car, SUV, Van, etc."
                  style={styles.input}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Make / Manufacturer</Text>
                <TextInput
                  value={vehicleForm.company}
                  onChangeText={(val) => setVehicleForm({ ...vehicleForm, company: val })}
                  placeholder="Toyota, Honda, Nissan"
                  style={styles.input}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Model *</Text>
                <TextInput
                  value={vehicleForm.model}
                  onChangeText={(val) => setVehicleForm({ ...vehicleForm, model: val })}
                  placeholder="Corolla, Civic, etc."
                  style={styles.input}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Year</Text>
                <TextInput
                  keyboardType="numeric"
                  value={vehicleForm.year}
                  onChangeText={(val) => setVehicleForm({ ...vehicleForm, year: val })}
                  placeholder="2022"
                  style={styles.input}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Engine Number</Text>
                <TextInput
                  value={vehicleForm.engineNumber}
                  onChangeText={(val) => setVehicleForm({ ...vehicleForm, engineNumber: val })}
                  placeholder="Optional"
                  style={styles.input}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Chassis Number</Text>
                <TextInput
                  value={vehicleForm.chassisNumber}
                  onChangeText={(val) => setVehicleForm({ ...vehicleForm, chassisNumber: val })}
                  placeholder="Optional"
                  style={styles.input}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowAddVehicleModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleAddVehicle}
                disabled={addingVehicle}
              >
                {addingVehicle ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitText}>Save Vehicle</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── IMAGE ZOOM PREVIEW MODAL ── */}
      {previewImage && (
        <Modal
          visible={Boolean(previewImage)}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewImage(null)}
        >
          <View style={styles.previewOverlay}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>{previewImage.title}</Text>
              <TouchableOpacity onPress={() => setPreviewImage(null)} style={styles.previewCloseBtn}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <View style={styles.previewImageBox}>
              <Image source={{ uri: previewImage.url }} style={styles.previewFullImage} resizeMode="contain" />
            </View>
          </View>
        </Modal>
      )}

      {/* ── CUSTOM ALERT POPUP ── */}
      {customPopup.show && (
        <Modal visible={customPopup.show} transparent animationType="fade">
          <View style={styles.popupOverlay}>
            <View style={styles.popupCard}>
              <View style={[
                styles.popupIconCircle,
                customPopup.type === "success" ? styles.popupSuccess : customPopup.type === "error" ? styles.popupDanger : styles.popupInfo
              ]}>
                <Ionicons
                  name={customPopup.type === "success" ? "checkmark" : customPopup.type === "error" ? "alert" : "information"}
                  size={24}
                  color={customPopup.type === "success" ? "#10b981" : customPopup.type === "error" ? "#ef4444" : "#0284c7"}
                />
              </View>
              <Text style={styles.popupTitle}>{customPopup.title}</Text>
              <Text style={styles.popupMessage}>{customPopup.message}</Text>

              {customPopup.type === "confirm" ? (
                <View style={styles.popupConfirmRow}>
                  <TouchableOpacity
                    style={styles.popupCancelBtn}
                    onPress={() => setCustomPopup({ ...customPopup, show: false })}
                  >
                    <Text style={styles.popupCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.popupConfirmBtn}
                    onPress={() => {
                      setCustomPopup({ ...customPopup, show: false });
                      if (customPopup.onConfirm) customPopup.onConfirm();
                    }}
                  >
                    <Text style={styles.popupConfirmText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.popupOkBtn}
                  onPress={() => setCustomPopup({ ...customPopup, show: false })}
                >
                  <Text style={styles.popupOkText}>OK</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
      )}

      {/* Bottom Navbar */}
      <PolicyHolderNavbar activeRoute="/PolicyHolder/Profile" />
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
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    gap: 12
  },
  loadingText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b"
  },
  headerBar: {
    backgroundColor: "#0f172a",
    paddingTop: Platform.OS === "ios" ? 50 : 38,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)"
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center"
  },
  headerTitleWrap: {
    flex: 1,
    marginHorizontal: 12
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff"
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: "500",
    color: "#94a3b8",
    marginTop: 1
  },
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center"
  },
  scroll: {
    flex: 1
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
    gap: 14
  },
  heroCard: {
    borderRadius: 24,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12
  },
  heroGradient: {
    padding: 18,
    gap: 12
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  avatarWrapper: {
    position: "relative"
  },
  avatarBox: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "#334155",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center"
  },
  avatarImage: {
    width: "100%",
    height: "100%"
  },
  avatarInitials: {
    fontSize: 24,
    fontWeight: "800",
    color: "#ffffff"
  },
  avatarUploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.7)",
    alignItems: "center",
    justifyContent: "center"
  },
  cameraBtn: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: "#0284c7",
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#0f172a"
  },
  identityCol: {
    flex: 1,
    gap: 4
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  heroName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#ffffff"
  },
  badgeRow: {
    flexDirection: "row"
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(16,185,129,0.15)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.3)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#34d399"
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  metaPill: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#94a3b8"
  },
  metaDot: {
    fontSize: 10,
    color: "#64748b"
  },
  heroContactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    paddingTop: 10
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  contactText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#cbd5e1"
  },
  removePhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-end",
    paddingVertical: 2
  },
  removePhotoText: {
    fontSize: 11,
    color: "#f87171",
    fontWeight: "600"
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 4
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    borderRadius: 14
  },
  tabButtonActive: {
    backgroundColor: "#0f172a"
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b"
  },
  tabLabelActive: {
    color: "#ffffff",
    fontWeight: "700"
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    gap: 14,
    elevation: 1,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 10
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a"
  },
  cardSubtitle: {
    fontSize: 10.5,
    fontWeight: "500",
    color: "#94a3b8",
    marginTop: 1
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#000080",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12
  },
  editBtnCancel: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1"
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff"
  },
  editBtnTextCancel: {
    color: "#475569"
  },
  alertBannerWarning: {
    flexDirection: "row",
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: 14,
    padding: 12,
    gap: 10
  },
  alertBannerTitleWarning: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400e"
  },
  alertBannerDescWarning: {
    fontSize: 11,
    fontWeight: "500",
    color: "#b45309",
    marginTop: 2,
    lineHeight: 15
  },
  alertBannerDanger: {
    flexDirection: "row",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 14,
    padding: 12,
    gap: 10
  },
  alertBannerTitleDanger: {
    fontSize: 12,
    fontWeight: "700",
    color: "#991b1b"
  },
  alertBannerDescDanger: {
    fontSize: 11,
    fontWeight: "500",
    color: "#b91c1c",
    marginTop: 2,
    lineHeight: 15
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  infoBox: {
    width: "48%",
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    padding: 10,
    gap: 3
  },
  infoBoxTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  infoLabel: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase"
  },
  miniLockBadge: {
    fontSize: 8.5,
    fontWeight: "700",
    color: "#d97706",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4
  },
  infoVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1e293b"
  },
  fontMono: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace"
  },
  formWrap: {
    gap: 12
  },
  formGroup: {
    gap: 5
  },
  lockedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  lockedBadge: {
    fontSize: 9,
    fontWeight: "700",
    color: "#d97706",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569"
  },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12.5,
    fontWeight: "600",
    color: "#0f172a"
  },
  inputDisabled: {
    backgroundColor: "#f1f5f9",
    color: "#64748b"
  },
  inputMulti: {
    minHeight: 56,
    textAlignVertical: "top"
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000080",
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 6
  },
  saveBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#ffffff"
  },
  docsGrid: {
    gap: 12
  },
  docCard: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    padding: 12,
    gap: 8,
    backgroundColor: "#ffffff"
  },
  docCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  docTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1e293b",
    flex: 1
  },
  docStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8
  },
  docStatusVerified: {
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0"
  },
  docStatusMissing: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  docStatusText: {
    fontSize: 9.5,
    fontWeight: "700"
  },
  docStatusTextVerified: {
    color: "#059669"
  },
  docStatusTextMissing: {
    color: "#64748b"
  },
  docImageBox: {
    width: "100%",
    height: 120,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f1f5f9"
  },
  docImage: {
    width: "100%",
    height: "100%"
  },
  docPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4
  },
  docPlaceholderText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#94a3b8"
  },
  docActionsRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end"
  },
  docViewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10
  },
  docViewText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0284c7"
  },
  docUploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0f172a",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10
  },
  docUploadText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff"
  },
  addVehicleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#000080",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12
  },
  addVehicleBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff"
  },
  emptyVehicles: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 6
  },
  emptyVehiclesTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569"
  },
  emptyVehiclesSub: {
    fontSize: 11,
    color: "#94a3b8",
    textAlign: "center"
  },
  vehiclesList: {
    gap: 10
  },
  vehicleCard: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    padding: 12,
    gap: 10,
    backgroundColor: "#ffffff"
  },
  vehCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  vehIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#e0e7ff",
    alignItems: "center",
    justifyContent: "center"
  },
  vehPlate: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace"
  },
  vehModel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 1
  },
  vehTypePill: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  vehTypePillText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#475569"
  },
  vehDetailsRow: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 8,
    justifyContent: "space-between"
  },
  vehDetailCol: {
    gap: 2
  },
  vehDetailLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase"
  },
  vehDetailVal: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#334155"
  },
  pwWrap: {
    position: "relative",
    justifyContent: "center"
  },
  pwInput: {
    paddingRight: 38
  },
  pwEye: {
    position: "absolute",
    right: 10,
    padding: 4
  },
  logoutSectionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 14,
    paddingVertical: 11,
    marginTop: 10
  },
  logoutSectionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ef4444"
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.6)",
    justifyContent: "flex-end"
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    gap: 14
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 10
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a"
  },
  modalFooter: {
    flexDirection: "row",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 10
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center"
  },
  modalCancelText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569"
  },
  modalSubmitBtn: {
    flex: 1,
    backgroundColor: "#000080",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center"
  },
  modalSubmitText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff"
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: "#020617",
    justifyContent: "space-between"
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    paddingHorizontal: 16,
    paddingBottom: 12
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff"
  },
  previewCloseBtn: {
    padding: 4
  },
  previewImageBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 10
  },
  previewFullImage: {
    width: "100%",
    height: "100%"
  },
  popupOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  popupCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    gap: 8
  },
  popupIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4
  },
  popupSuccess: {
    backgroundColor: "#ecfdf5"
  },
  popupDanger: {
    backgroundColor: "#fef2f2"
  },
  popupInfo: {
    backgroundColor: "#f0f9ff"
  },
  popupTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a"
  },
  popupMessage: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748b",
    textAlign: "center",
    lineHeight: 17
  },
  popupOkBtn: {
    width: "100%",
    backgroundColor: "#0f172a",
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: "center",
    marginTop: 8
  },
  popupOkText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#ffffff"
  },
  popupConfirmRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginTop: 8
  },
  popupCancelBtn: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center"
  },
  popupCancelText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569"
  },
  popupConfirmBtn: {
    flex: 1,
    backgroundColor: "#ef4444",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center"
  },
  popupConfirmText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff"
  }
});
