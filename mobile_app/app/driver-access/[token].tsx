import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image,
  ImageBackground,
  Alert,
  SafeAreaView,
  Platform,
  StatusBar,
  Dimensions
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { API_BASE_URL } from "../_config";

const { width: SCREEN_W } = Dimensions.get("window");

interface AuthorizedVehicle {
  numberPlate: string;
  vehicleType?: string;
  model?: string;
  company?: string;
  year?: string;
  policyNumber?: string;
  policyExpiryDate?: string;
}

interface DriverProfile {
  driverName: string;
  driverNicMasked: string;
  driverNicRaw?: string;
  driverPhone: string;
  driverAddress: string;
  policyHolderName: string;
  policyHolderNicMasked?: string;
  policyHolderNicRaw?: string;
  policyHolderEmail?: string;
  policyHolderPhone?: string;
  branch: string;
  reference: string;
  verificationToken: string;
}

interface ClaimItem {
  claimNumber: string;
  vehiclePlate: string;
  incidentDate: string;
  damageType: string;
  location: string;
  status: string;
  currentStep: number;
}

type TabType = "dashboard" | "vehicles" | "submit" | "claims" | "chat" | "pass";

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
  return { icon: "car-side", color: "#0284c7", bg: "#e0f2fe", border: "#bae6fd" };
}

export default function MobileDriverPortalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token: string }>();
  const token = params?.token;

  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [vehicles, setVehicles] = useState<AuthorizedVehicle[]>([]);
  const [claims, setClaims] = useState<ClaimItem[]>([]);

  // Claim Form States
  const [claimPlate, setClaimPlate] = useState("");
  const [claimDate, setClaimDate] = useState(new Date().toISOString().split("T")[0]);
  const [claimTime, setClaimTime] = useState("10:00");
  const [claimLocation, setClaimLocation] = useState("");
  const [claimDamageType, setClaimDamageType] = useState("Front Collision");
  const [claimDesc, setClaimDesc] = useState("");
  const [accidentPhotoBase64, setAccidentPhotoBase64] = useState("");
  const [submittingClaim, setSubmittingClaim] = useState(false);

  // Chat States & Logic
  const [chatRecipients, setChatRecipients] = useState<any[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<any | null>(null);
  const [selectedChatRef, setSelectedChatRef] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInputText, setChatInputText] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);

  const driverId = profile?.driverNicRaw || profile?.driverNicMasked || profile?.reference || "driver";

  const fetchChatRecipients = async (ref: string) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/claim-chat/claims/${encodeURIComponent(ref)}/recipients?userId=${encodeURIComponent(driverId)}&userType=ThirdParty`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.recipients && data.recipients.length > 0) {
          setChatRecipients(data.recipients);
          setSelectedRecipient(data.recipients[0]);
          return data.recipients;
        }
      }
    } catch (e) {
      console.warn("fetchChatRecipients error:", e);
    }

    const fallbacks = [
      {
        userId: profile?.policyHolderNicRaw || "owner",
        userType: "PolicyHolder",
        name: profile?.policyHolderName || "Vehicle Owner",
        role: "Vehicle Owner (Policyholder)",
        branch: profile?.branch
      },
      {
        userId: profile?.branch || "Galle",
        userType: "OfficeStaff",
        name: `${profile?.branch || "Galle"} Branch`,
        role: "Branch Officer",
        branch: profile?.branch
      }
    ];
    setChatRecipients(fallbacks);
    setSelectedRecipient(fallbacks[0]);
    return fallbacks;
  };

  const loadConversation = async (ref: string, recipient: any) => {
    if (!ref || !recipient) return;
    setChatLoading(true);
    try {
      const convRes = await fetch(`${API_BASE_URL}/api/claim-chat/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimNumber: ref,
          type: "direct",
          sender: {
            userId: driverId,
            userType: "ThirdParty",
            name: profile?.driverName || "Authorized Driver",
            role: "Authorized Driver",
            branch: profile?.branch || "Galle"
          },
          recipient: {
            userId: recipient.userId,
            userType: recipient.userType,
            name: recipient.name,
            email: recipient.email || "",
            role: recipient.role,
            branch: recipient.branch || profile?.branch || "Galle"
          }
        })
      });

      if (convRes.ok) {
        const convData = await convRes.json();
        const convId = convData.conversation?._id;
        setActiveConversationId(convId);

        const msgRes = await fetch(
          `${API_BASE_URL}/api/claim-chat/conversations/${convId}/messages?userId=${encodeURIComponent(driverId)}`
        );
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          setChatMessages(msgData.messages || []);
        }
      }
    } catch (e) {
      console.warn("loadConversation error:", e);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "chat") {
      const targetRef = selectedChatRef || claims[0]?.claimNumber || profile?.reference || "";
      if (targetRef && (!selectedChatRef || !selectedRecipient)) {
        setSelectedChatRef(targetRef);
        fetchChatRecipients(targetRef).then((recs) => {
          if (recs && recs[0]) {
            loadConversation(targetRef, recs[0]);
          }
        });
      }
    }
  }, [activeTab, profile, claims]);

  useEffect(() => {
    if (activeTab !== "chat" || !activeConversationId) return;

    const interval = setInterval(async () => {
      try {
        const msgRes = await fetch(
          `${API_BASE_URL}/api/claim-chat/conversations/${activeConversationId}/messages?userId=${encodeURIComponent(driverId)}`
        );
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          if (Array.isArray(msgData.messages)) {
            setChatMessages(msgData.messages);
          }
        }
      } catch (e) {}
    }, 3500);

    return () => clearInterval(interval);
  }, [activeTab, activeConversationId, driverId]);

  const handleSendChatMessage = async (textToSend?: string) => {
    const text = (textToSend || chatInputText).trim();
    if (!text || !activeConversationId || !selectedRecipient) return;

    setChatSending(true);
    setChatInputText("");

    const optimistic = {
      _id: `temp-${Date.now()}`,
      senderId: driverId,
      senderType: "ThirdParty",
      senderName: profile?.driverName || "Authorized Driver",
      text,
      createdAt: new Date().toISOString()
    };
    setChatMessages((prev) => [...prev, optimistic]);

    try {
      const res = await fetch(`${API_BASE_URL}/api/claim-chat/conversations/${activeConversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: driverId,
          senderType: "ThirdParty",
          senderName: profile?.driverName || "Authorized Driver",
          senderRole: "Authorized Driver",
          recipientId: selectedRecipient.userId,
          recipientType: selectedRecipient.userType,
          recipientName: selectedRecipient.name,
          text
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setChatMessages((prev) => prev.map((m) => (m._id === optimistic._id ? data.message : m)));
        }
      }
    } catch (e) {
      console.warn("handleSendChatMessage error:", e);
    } finally {
      setChatSending(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setError("No authorization token supplied.");
      setLoading(false);
      return;
    }

    const initDriverSession = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/api/third-party/driver-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: String(token).trim() })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Driver access link is invalid or revoked.");
        }

        const sToken = data.sessionToken;
        setSessionToken(sToken);
        await AsyncStorage.setItem("@tp_driver_restricted_session", sToken);

        await loadData(sToken);
      } catch (err: any) {
        setError(err.message || "Failed to initialize driver portal.");
      } finally {
        setLoading(false);
      }
    };

    initDriverSession();
  }, [token]);

  const loadData = async (sToken: string) => {
    try {
      const [meRes, vehRes, claimsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/third-party/portal/me`, {
          headers: { Authorization: `Bearer ${sToken}` }
        }),
        fetch(`${API_BASE_URL}/api/third-party/portal/vehicles`, {
          headers: { Authorization: `Bearer ${sToken}` }
        }),
        fetch(`${API_BASE_URL}/api/third-party/portal/claims`, {
          headers: { Authorization: `Bearer ${sToken}` }
        })
      ]);

      if (meRes.ok) {
        const m = await meRes.json();
        setProfile(m.profile);
      }
      if (vehRes.ok) {
        const v = await vehRes.json();
        setVehicles(v.vehicles || []);
        if (v.vehicles?.length > 0) {
          setClaimPlate(v.vehicles[0].numberPlate);
        }
      }
      if (claimsRes.ok) {
        const c = await claimsRes.json();
        setClaims(c.claims || []);
      }
    } catch (e) {
      console.warn("Load data error:", e);
    }
  };

  const handlePickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission Required", "Camera roll permission is needed to attach damage photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.6,
      base64: true
    });

    if (!result.canceled && result.assets && result.assets[0].base64) {
      setAccidentPhotoBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleSubmitClaim = async () => {
    if (!claimPlate || !claimDate || !claimLocation.trim() || !claimDesc.trim()) {
      Alert.alert("Missing Details", "Please provide incident date, location, and description.");
      return;
    }

    setSubmittingClaim(true);
    try {
      const payload = {
        vehiclePlate: claimPlate,
        incidentDate: claimDate,
        incidentTime: claimTime,
        damageType: claimDamageType,
        description: claimDesc.trim(),
        location: claimLocation.trim(),
        accidentPhotos: {
          front: accidentPhotoBase64 ? [accidentPhotoBase64] : []
        }
      };

      const res = await fetch(`${API_BASE_URL}/api/third-party/portal/submit-claim`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit claim.");
      }

      Alert.alert("Claim Lodged", `Claim Reference: ${data.claimNumber}\nAssigned to ${profile?.branch || "regional"} branch queue.`);
      setClaimDesc("");
      setClaimLocation("");
      setAccidentPhotoBase64("");
      if (sessionToken) loadData(sessionToken);
      setActiveTab("claims");
    } catch (err: any) {
      Alert.alert("Submission Error", err.message || "Failed to submit claim.");
    } finally {
      setSubmittingClaim(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to exit the driver portal?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          if (sessionToken) {
            try {
              await fetch(`${API_BASE_URL}/api/third-party/portal/logout`, {
                method: "POST",
                headers: { Authorization: `Bearer ${sessionToken}` }
              });
            } catch {}
          }
          await AsyncStorage.removeItem("@tp_driver_restricted_session");
          router.replace("/");
        }
      }
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.loadingText}>Verifying Authorized Driver Pass...</Text>
      </View>
    );
  }

  if (error || !sessionToken) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.errorIconCircle}>
          <Ionicons name="alert-circle-outline" size={42} color="#dc2626" />
        </View>
        <Text style={styles.errorTitle}>Access Link Inactive</Text>
        <Text style={styles.errorDesc}>{error || "This driver link has been revoked or expired."}</Text>
        <TouchableOpacity style={styles.btnPrimary} onPress={() => router.replace("/")}>
          <Text style={styles.btnPrimaryText}>Return to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pendingCount = claims.filter(c => c.status !== "Approved" && c.status !== "Settled" && c.status !== "Rejected").length;
  const approvedCount = claims.filter(c => c.status === "Approved" || c.status === "Settled").length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* ========================================================================= */}
      {/* EXACT POLICYHOLDER MOBILE HEADER (Gradient, Welcome, User Avatar) */}
      {/* ========================================================================= */}
      {/* TAB-SPECIFIC HEADERS (Matching Policyholder Mobile Screens) */}
      {/* ========================================================================= */}
      
      {/* DASHBOARD TAB: Greeting & Stat Summary Cards */}
      {activeTab === "dashboard" && (
        <LinearGradient colors={["#0f172a", "#1e293b"]} style={styles.headerGradient}>
          <View style={styles.topBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.welcomeLabel}>Welcome back,</Text>
              <Text style={styles.welcomeName}>{profile?.driverName} 👋</Text>
            </View>

            <View style={styles.headerRightActions}>
              <View style={styles.badgeBranch}>
                <Ionicons name="business-outline" size={12} color="#38bdf8" />
                <Text style={styles.badgeBranchText}>{profile?.branch || "Galle"}</Text>
              </View>

              <TouchableOpacity style={styles.avatarButton} onPress={handleLogout} activeOpacity={0.85}>
                <Text style={styles.avatarText}>{profile?.driverName?.charAt(0).toUpperCase() || "D"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.subtitleBanner}>
            <View style={styles.dotIndicator} />
            <Text style={styles.subtitleText} numberOfLines={2}>
              Authorized by {profile?.policyHolderName} • All vehicles active
            </Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{claims.length}</Text>
              <Text style={styles.statLabel}>Total Claims</Text>
            </View>
            <View style={[styles.statCard, styles.statCardMiddle]}>
              <Text style={[styles.statNumber, { color: "#38bdf8" }]}>{pendingCount}</Text>
              <Text style={styles.statLabel}>In Progress</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: "#4ade80" }]}>{approvedCount}</Text>
              <Text style={styles.statLabel}>Approved</Text>
            </View>
          </View>
        </LinearGradient>
      )}

      {/* VEHICLES TAB: Policyholder MyVehicles Signature Header */}
      {activeTab === "vehicles" && (
        <ImageBackground
          source={require("../../assets/images/policy1.jpg")}
          style={styles.headerBackground}
          imageStyle={styles.headerImageStyle}
        >
          <LinearGradient
            colors={["rgba(15, 23, 42, 0.95)", "rgba(15, 23, 42, 0.82)", "rgba(15, 23, 42, 0.5)"]}
            style={styles.headerGradientInner}
          >
            <View style={styles.mobileTabHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.mobileTabHeaderTitle}>My Vehicles</Text>
                <Text style={styles.mobileTabHeaderSubtitle}>
                  Authorized vehicles under policyholder {profile?.policyHolderName || "Policy Holder"}
                </Text>
              </View>
              <TouchableOpacity style={styles.avatarButtonSmall} onPress={handleLogout} activeOpacity={0.85}>
                <Text style={styles.avatarTextSmall}>{profile?.driverName?.charAt(0).toUpperCase() || "D"}</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </ImageBackground>
      )}

      {/* CLAIMS TAB: Policyholder My_claims Signature Header */}
      {activeTab === "claims" && (
        <ImageBackground
          source={require("../../assets/images/myclaim.png")}
          style={styles.headerBackground}
          imageStyle={styles.headerImageStyle}
        >
          <LinearGradient
            colors={["rgba(13, 42, 58, 0.95)", "rgba(13, 42, 58, 0.82)", "rgba(15, 23, 42, 0.5)"]}
            style={styles.headerGradientInner}
          >
            <View style={styles.mobileTabHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.mobileTabHeaderTitle}>My Claims</Text>
                <Text style={styles.mobileTabHeaderSubtitle}>
                  All authorized driver insurance claims in one place
                </Text>
              </View>
              <TouchableOpacity style={styles.avatarButtonSmall} onPress={handleLogout} activeOpacity={0.85}>
                <Text style={styles.avatarTextSmall}>{profile?.driverName?.charAt(0).toUpperCase() || "D"}</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </ImageBackground>
      )}

      {/* NEW CLAIM TAB: Policyholder New_Claim Signature Header */}
      {activeTab === "submit" && (
        <LinearGradient
          colors={["#0f172a", "#1e293b"]}
          style={styles.headerGradientInner}
        >
          <View style={styles.mobileTabHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.mobileTabHeaderTitle}>File New Claim</Text>
              <Text style={styles.mobileTabHeaderSubtitle}>
                Report an accident or damage incident for authorized vehicles
              </Text>
            </View>
            <TouchableOpacity style={styles.avatarButtonSmall} onPress={handleLogout} activeOpacity={0.85}>
              <Text style={styles.avatarTextSmall}>{profile?.driverName?.charAt(0).toUpperCase() || "D"}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      )}

      {/* LIVE CHAT TAB: Communication Header */}
      {activeTab === "chat" && (
        <LinearGradient
          colors={["#0f172a", "#1e293b"]}
          style={styles.headerGradientInner}
        >
          <View style={styles.mobileTabHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.mobileTabHeaderTitle}>Claim Support Chat</Text>
              <Text style={styles.mobileTabHeaderSubtitle}>
                Direct live chat with assigned adjuster & branch staff
              </Text>
            </View>
            <TouchableOpacity style={styles.avatarButtonSmall} onPress={handleLogout} activeOpacity={0.85}>
              <Text style={styles.avatarTextSmall}>{profile?.driverName?.charAt(0).toUpperCase() || "D"}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      )}

      {/* DIGITAL PASS TAB: Digital Pass Signature Header */}
      {activeTab === "pass" && (
        <LinearGradient
          colors={["#0c4a6e", "#075985", "#0369a1"]}
          style={styles.headerGradientInner}
        >
          <View style={styles.mobileTabHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.mobileTabHeaderTitle}>Digital Driver Pass</Text>
              <Text style={styles.mobileTabHeaderSubtitle}>
                Official credentials verified by Sanasa General Insurance
              </Text>
            </View>
            <TouchableOpacity style={styles.avatarButtonSmall} onPress={handleLogout} activeOpacity={0.85}>
              <Text style={styles.avatarTextSmall}>{profile?.driverName?.charAt(0).toUpperCase() || "D"}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      )}

      {/* Clean Quick Action / Tab Selector */}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {[
            { id: "dashboard", label: "Dashboard", icon: "grid-outline" },
            { id: "vehicles", label: `Vehicles (${vehicles.length})`, icon: "car-outline" },
            { id: "submit", label: "New Claim", icon: "add-circle-outline" },
            { id: "claims", label: `Claims (${claims.length})`, icon: "document-text-outline" },
            { id: "chat", label: "Live Chat", icon: "chatbubbles-outline" },
            { id: "pass", label: "Digital Pass", icon: "shield-checkmark-outline" }
          ].map((t) => {
            const isActive = activeTab === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => setActiveTab(t.id as TabType)}
                style={[styles.tabItem, isActive && styles.tabItemActive]}
              >
                <Ionicons
                  name={t.icon as any}
                  size={15}
                  color={isActive ? "#ffffff" : "#64748B"}
                />
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Scroll Content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* ========================================================================= */}
        {/* TAB 1: DASHBOARD */}
        {/* ========================================================================= */}
        {activeTab === "dashboard" && (
          <View style={styles.section}>
            
            {/* Quick Actions Grid (Exact Policyholder Mobile Quick Action Style) */}
            <View style={styles.quickGrid}>
              <TouchableOpacity style={styles.quickActionBox} onPress={() => setActiveTab("submit")}>
                <View style={[styles.quickActionIconCircle, { backgroundColor: "#ff9800" }]}>
                  <Ionicons name="add" size={24} color="#ffffff" />
                </View>
                <Text style={styles.quickActionText}>New Claim</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickActionBox} onPress={() => setActiveTab("vehicles")}>
                <View style={[styles.quickActionIconCircle, { backgroundColor: "#0284c7" }]}>
                  <Ionicons name="car" size={22} color="#ffffff" />
                </View>
                <Text style={styles.quickActionText}>My Vehicles</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickActionBox} onPress={() => setActiveTab("claims")}>
                <View style={[styles.quickActionIconCircle, { backgroundColor: "#10b981" }]}>
                  <Ionicons name="document-text" size={22} color="#ffffff" />
                </View>
                <Text style={styles.quickActionText}>My Claims</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickActionBox} onPress={() => setActiveTab("pass")}>
                <View style={[styles.quickActionIconCircle, { backgroundColor: "#6366f1" }]}>
                  <Ionicons name="shield-checkmark" size={22} color="#ffffff" />
                </View>
                <Text style={styles.quickActionText}>Digital Pass</Text>
              </TouchableOpacity>
            </View>

            {/* Recent Notifications Card */}
            <View style={styles.contentCard}>
              <View style={styles.contentCardHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="notifications-outline" size={18} color="#0f172a" />
                  <Text style={styles.contentCardTitle}>Recent Updates</Text>
                </View>
                <TouchableOpacity onPress={() => setActiveTab("claims")}>
                  <Text style={styles.linkText}>View All</Text>
                </TouchableOpacity>
              </View>

              {claims.length === 0 ? (
                <Text style={styles.emptyNotice}>No pending claims or requests for your vehicles.</Text>
              ) : (
                claims.slice(0, 3).map((c) => (
                  <View key={c.claimNumber} style={styles.claimListItem}>
                    <View style={styles.plateBadgeSmall}>
                      <Text style={styles.plateBadgeSmallText}>{formatPlate(c.vehiclePlate)}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.claimListNum}>{c.claimNumber}</Text>
                      <Text style={styles.claimListSub}>{c.damageType} • {c.incidentDate}</Text>
                    </View>
                    <View style={styles.statusBadgeSoft}>
                      <Text style={styles.statusBadgeSoftText}>{c.status}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Live Chat with Policyholder & Agent Card */}
            <TouchableOpacity
              style={[styles.contentCard, { backgroundColor: "#0B1E32", borderColor: "#0B1E32" }]}
              onPress={() => {
                const initialRef = claims[0]?.claimNumber || profile?.reference || "";
                setSelectedChatRef(initialRef);
                fetchChatRecipients(initialRef).then((recs) => {
                  if (recs && recs[0]) loadConversation(initialRef, recs[0]);
                });
                setActiveTab("chat");
              }}
              activeOpacity={0.9}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#0284c7", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="chatbubbles" size={22} color="#ffffff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "bold" }}>Live Claims & Operations Chat</Text>
                    <Text style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>
                      Chat directly with {profile?.policyHolderName || "Vehicle Owner"}, Claims Agent & Branch
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#38bdf8" />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MY VEHICLES (Exact PolicyHolder Mobile Vehicle Cards) */}
        {/* ========================================================================= */}
        {activeTab === "vehicles" && (
          <View style={styles.section}>
            <Text style={styles.sectionHeaderTitle}>Registered Vehicles</Text>
            <Text style={styles.sectionHeaderSubtitle}>Authorized under policyholder {profile?.policyHolderName}</Text>

            {vehicles.map((v) => {
              const theme = getVehicleTheme(v.vehicleType || "Car");
              return (
                <View key={v.numberPlate} style={styles.contentCard}>
                  <View style={styles.cardTopRow}>
                    <View style={styles.plateBadge}>
                      <View style={styles.goldDot} />
                      <Text style={styles.plateText}>{formatPlate(v.numberPlate)}</Text>
                    </View>
                    <View style={styles.activeTag}>
                      <Text style={styles.activeTagText}>Active</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 8 }}>
                    <View style={[styles.vehicleIconCircle, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                      <MaterialCommunityIcons name={theme.icon as any} size={24} color={theme.color} />
                    </View>
                    <View>
                      <Text style={styles.vehicleName}>{v.company} {v.model}</Text>
                      <Text style={styles.vehicleMeta}>{v.vehicleType} • {v.year}</Text>
                    </View>
                  </View>

                  <View style={styles.specBox}>
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>Policy Reference:</Text>
                      <Text style={styles.specVal}>{v.policyNumber || "SANASA-COMPREHENSIVE"}</Text>
                    </View>
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>Coverage Expiry:</Text>
                      <Text style={styles.specVal}>{v.policyExpiryDate || "2027-11-20"}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.cardBtn}
                    onPress={() => {
                      setClaimPlate(v.numberPlate);
                      setActiveTab("submit");
                    }}
                  >
                    <Ionicons name="camera-outline" size={16} color="#ffffff" />
                    <Text style={styles.cardBtnText}>Lodge Claim for This Vehicle</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: SUBMIT CLAIM */}
        {/* ========================================================================= */}
        {activeTab === "submit" && (
          <View style={styles.section}>
            <View style={styles.contentCard}>
              <Text style={styles.contentCardTitle}>Lodge Accident Claim</Text>
              <Text style={styles.sectionHeaderSubtitle}>Incident information for branch review</Text>

              <View style={styles.formItem}>
                <Text style={styles.inputLabel}>Select Operating Vehicle</Text>
                <View style={styles.plateRowWrap}>
                  {vehicles.map((v) => (
                    <TouchableOpacity
                      key={v.numberPlate}
                      style={[
                        styles.plateSelectBtn,
                        claimPlate === v.numberPlate && styles.plateSelectBtnActive
                      ]}
                      onPress={() => setClaimPlate(v.numberPlate)}
                    >
                      <Text style={claimPlate === v.numberPlate ? styles.plateSelectTextActive : styles.plateSelectText}>
                        {formatPlate(v.numberPlate)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formItem}>
                <Text style={styles.inputLabel}>Incident Date</Text>
                <TextInput
                  style={styles.textInput}
                  value={claimDate}
                  onChangeText={setClaimDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.formItem}>
                <Text style={styles.inputLabel}>Incident Location (City/Road)</Text>
                <TextInput
                  style={styles.textInput}
                  value={claimLocation}
                  onChangeText={setClaimLocation}
                  placeholder="e.g. Galle Road, Kalutara"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.formItem}>
                <Text style={styles.inputLabel}>Incident Description</Text>
                <TextInput
                  style={[styles.textInput, { height: 75, textAlignVertical: "top" }]}
                  multiline
                  value={claimDesc}
                  onChangeText={setClaimDesc}
                  placeholder="Describe how the accident occurred..."
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.formItem}>
                <Text style={styles.inputLabel}>Damage Photograph</Text>
                <TouchableOpacity style={styles.uploadBox} onPress={handlePickPhoto}>
                  <Ionicons name="camera-outline" size={22} color="#0284c7" />
                  <Text style={styles.uploadBoxText}>
                    {accidentPhotoBase64 ? "Photo Attached (Tap to change)" : "Attach Photo from Gallery"}
                  </Text>
                </TouchableOpacity>
                {accidentPhotoBase64 ? (
                  <Image source={{ uri: accidentPhotoBase64 }} style={styles.photoPreview} />
                ) : null}
              </View>

              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={handleSubmitClaim}
                disabled={submittingClaim}
              >
                {submittingClaim ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Submit Claim to Branch</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: CLAIMS HISTORY */}
        {/* ========================================================================= */}
        {activeTab === "claims" && (
          <View style={styles.section}>
            <Text style={styles.sectionHeaderTitle}>Lodged Claims</Text>
            <Text style={styles.sectionHeaderSubtitle}>All claims filed for authorized vehicles</Text>

            {claims.length === 0 ? (
              <View style={styles.contentCard}>
                <Text style={styles.emptyNotice}>No claims found for this driver.</Text>
              </View>
            ) : (
              claims.map((c) => (
                <View key={c.claimNumber} style={styles.contentCard}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.claimNumberText}>{c.claimNumber}</Text>
                    <View style={styles.statusBadgeSoft}>
                      <Text style={styles.statusBadgeSoftText}>{c.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.claimSubText}>Vehicle: {formatPlate(c.vehiclePlate)} • {c.damageType}</Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#F1F5F9" }}>
                    <Text style={styles.claimDateText}>Date: {c.incidentDate} • {c.location}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedChatRef(c.claimNumber);
                        fetchChatRecipients(c.claimNumber).then((recs) => {
                          if (recs && recs[0]) loadConversation(c.claimNumber, recs[0]);
                        });
                        setActiveTab("chat");
                      }}
                      style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#e0f2fe", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}
                    >
                      <Ionicons name="chatbubbles" size={12} color="#0284c7" />
                      <Text style={{ fontSize: 11, fontWeight: "bold", color: "#0284c7" }}>Chat</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ========================================================================= */}
        {/* TAB 4.5: LIVE CHAT (Policyholder, Agent, Branch) */}
        {/* ========================================================================= */}
        {activeTab === "chat" && (
          <View style={styles.section}>
            {/* Header Card */}
            <View style={[styles.contentCard, { backgroundColor: "#0B1E32", borderColor: "#0B1E32" }]}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View>
                  <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "bold" }}>Driver Live Chat Desk</Text>
                  <Text style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>
                    Direct communication with Owner, Assigned Agent & Branch
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(34,197,94,0.15)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#22c55e" }} />
                  <Text style={{ color: "#4ade80", fontSize: 10, fontWeight: "bold" }}>ONLINE</Text>
                </View>
              </View>

              {/* Context Selector: Claim or Authorization Reference */}
              <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)" }}>
                <Text style={{ color: "#94a3b8", fontSize: 10, fontWeight: "bold", textTransform: "uppercase", marginBottom: 6 }}>
                  Select Claim / Reference Context:
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => {
                      const ref = profile?.reference || "";
                      setSelectedChatRef(ref);
                      fetchChatRecipients(ref).then((recs) => {
                        if (recs && recs[0]) loadConversation(ref, recs[0]);
                      });
                    }}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 12,
                      backgroundColor: selectedChatRef === profile?.reference ? "#0284c7" : "rgba(255,255,255,0.08)",
                      borderWidth: 1,
                      borderColor: selectedChatRef === profile?.reference ? "#38bdf8" : "rgba(255,255,255,0.15)"
                    }}
                  >
                    <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "bold" }}>
                      Pass: {profile?.reference}
                    </Text>
                  </TouchableOpacity>

                  {claims.map((c) => (
                    <TouchableOpacity
                      key={c.claimNumber}
                      onPress={() => {
                        setSelectedChatRef(c.claimNumber);
                        fetchChatRecipients(c.claimNumber).then((recs) => {
                          if (recs && recs[0]) loadConversation(c.claimNumber, recs[0]);
                        });
                      }}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 12,
                        backgroundColor: selectedChatRef === c.claimNumber ? "#0284c7" : "rgba(255,255,255,0.08)",
                        borderWidth: 1,
                        borderColor: selectedChatRef === c.claimNumber ? "#38bdf8" : "rgba(255,255,255,0.15)"
                      }}
                    >
                      <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "bold" }}>
                        Claim: {c.claimNumber}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Recipient Channel Selector */}
              <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)" }}>
                <Text style={{ color: "#94a3b8", fontSize: 10, fontWeight: "bold", textTransform: "uppercase", marginBottom: 6 }}>
                  Select Recipient:
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {chatRecipients.map((rec) => {
                    const isSelected = selectedRecipient?.userId === rec.userId;
                    return (
                      <TouchableOpacity
                        key={rec.userId}
                        onPress={() => {
                          setSelectedRecipient(rec);
                          loadConversation(selectedChatRef || profile?.reference || "", rec);
                        }}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 14,
                          backgroundColor: isSelected ? "#38bdf8" : "#ffffff"
                        }}
                      >
                        <Ionicons
                          name={
                            rec.userType === "PolicyHolder"
                              ? "person-circle-outline"
                              : rec.userType === "Agent"
                              ? "shield-checkmark-outline"
                              : "business-outline"
                          }
                          size={16}
                          color={isSelected ? "#0F172A" : "#334155"}
                        />
                        <View>
                          <Text style={{ fontSize: 11, fontWeight: "bold", color: isSelected ? "#0F172A" : "#1E293B" }}>
                            {rec.name}
                          </Text>
                          <Text style={{ fontSize: 9, color: isSelected ? "#1E293B" : "#64748B" }}>
                            {rec.role || rec.userType}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            {/* Conversation Window */}
            <View style={[styles.contentCard, { minHeight: 380, padding: 12 }]}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "#e0f2fe", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: "#0284c7", fontWeight: "bold", fontSize: 13 }}>
                      {selectedRecipient?.name?.charAt(0) || "U"}
                    </Text>
                  </View>
                  <View>
                    <Text style={{ color: "#0f172a", fontSize: 13, fontWeight: "bold" }}>
                      {selectedRecipient?.name || "Select Recipient"}
                    </Text>
                    <Text style={{ color: "#64748b", fontSize: 10 }}>
                      {selectedRecipient?.role} • {selectedRecipient?.branch || profile?.branch}
                    </Text>
                  </View>
                </View>
                <View style={{ backgroundColor: "#F1F5F9", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                  <Text style={{ color: "#475569", fontSize: 10, fontWeight: "bold" }}>
                    {selectedChatRef}
                  </Text>
                </View>
              </View>

              {/* Messages Container */}
              <View style={{ minHeight: 220, paddingVertical: 10 }}>
                {chatLoading ? (
                  <ActivityIndicator size="small" color="#0284c7" style={{ marginTop: 40 }} />
                ) : chatMessages.length === 0 ? (
                  <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
                    <Ionicons name="chatbubbles-outline" size={36} color="#cbd5e1" />
                    <Text style={{ color: "#64748b", fontSize: 12, fontWeight: "600", marginTop: 8 }}>
                      No messages yet
                    </Text>
                    <Text style={{ color: "#94a3b8", fontSize: 10, textAlign: "center", marginTop: 4, paddingHorizontal: 20 }}>
                      Send a message to {selectedRecipient?.name} regarding vehicle operation or claim status.
                    </Text>
                  </View>
                ) : (
                  chatMessages.map((msg, i) => {
                    const isMe = String(msg.senderId) === String(driverId) || msg.senderType === "ThirdParty";
                    return (
                      <View
                        key={msg._id || i}
                        style={{
                          alignSelf: isMe ? "flex-end" : "flex-start",
                          maxWidth: "85%",
                          marginBottom: 8
                        }}
                      >
                        <Text style={{ fontSize: 9, color: "#94a3b8", marginBottom: 2, textAlign: isMe ? "right" : "left" }}>
                          {isMe ? "You" : msg.senderName || selectedRecipient?.name}
                        </Text>
                        <View
                          style={{
                            backgroundColor: isMe ? "#0284c7" : "#F8FAFC",
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 14,
                            borderTopRightRadius: isMe ? 2 : 14,
                            borderTopLeftRadius: !isMe ? 2 : 14,
                            borderWidth: !isMe ? 1 : 0,
                            borderColor: "#E2E8F0"
                          }}
                        >
                          <Text style={{ color: isMe ? "#ffffff" : "#1E293B", fontSize: 12 }}>
                            {msg.text}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>

              {/* Quick Template Chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 6 }}>
                {[
                  "Photos uploaded for review",
                  "Front bumper minor damage",
                  "Repair completed",
                  "Awaiting inspection"
                ].map((txt, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleSendChatMessage(txt)}
                    style={{ backgroundColor: "#F1F5F9", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }}
                  >
                    <Text style={{ color: "#475569", fontSize: 10, fontWeight: "600" }}>{txt}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Chat Input Bar */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#F1F5F9" }}>
                <TextInput
                  value={chatInputText}
                  onChangeText={setChatInputText}
                  placeholder={`Message ${selectedRecipient?.name || "recipient"}...`}
                  placeholderTextColor="#94a3b8"
                  style={{
                    flex: 1,
                    backgroundColor: "#F8FAFC",
                    borderWidth: 1,
                    borderColor: "#E2E8F0",
                    borderRadius: 16,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    fontSize: 12,
                    color: "#0F172A"
                  }}
                />
                <TouchableOpacity
                  onPress={() => handleSendChatMessage()}
                  disabled={!chatInputText.trim() || chatSending}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: chatInputText.trim() ? "#0284c7" : "#cbd5e1",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  {chatSending ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Ionicons name="send" size={16} color="#ffffff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: DIGITAL PASS */}
        {/* ========================================================================= */}
        {activeTab === "pass" && (
          <View style={styles.section}>
            <View style={styles.contentCard}>
              <View style={styles.passTopBar}>
                <View>
                  <Text style={styles.passHeaderTitle}>SANASA GENERAL INSURANCE</Text>
                  <Text style={styles.passHeaderSub}>Official Digital Driver Pass</Text>
                </View>
                <View style={styles.activeTag}>
                  <Text style={styles.activeTagText}>VERIFIED</Text>
                </View>
              </View>

              <View style={{ marginTop: 14 }}>
                <Text style={styles.passFieldLabel}>Authorized Driver</Text>
                <Text style={styles.passDriverName}>{profile?.driverName}</Text>

                <View style={styles.passRow}>
                  <View>
                    <Text style={styles.passFieldLabel}>Masked NIC</Text>
                    <Text style={styles.passFieldVal}>{profile?.driverNicMasked}</Text>
                  </View>
                  <View>
                    <Text style={styles.passFieldLabel}>Branch</Text>
                    <Text style={styles.passFieldVal}>{profile?.branch}</Text>
                  </View>
                </View>

                <Text style={styles.passFieldLabel}>Pass Reference</Text>
                <Text style={styles.passRef}>{profile?.reference}</Text>

                <Text style={[styles.passFieldLabel, { marginTop: 12 }]}>Permitted Operating Vehicles</Text>
                <View style={styles.passPillsWrap}>
                  {vehicles.map((v) => (
                    <View key={v.numberPlate} style={styles.passPlatePill}>
                      <Text style={styles.passPlatePillText}>{formatPlate(v.numberPlate)}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.passFooter}>
                <Text style={styles.passFooterText}>Valid under Sanasa Central Insurance Registry</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC"
  },
  centerContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  loadingText: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 12,
    fontWeight: "500"
  },
  errorIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12
  },
  errorTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "bold"
  },
  errorDesc: {
    color: "#64748B",
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 20
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 20 : 10,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12
  },
  welcomeLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "500"
  },
  welcomeName: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  badgeBranch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  badgeBranchText: {
    color: "#38bdf8",
    fontSize: 11,
    fontWeight: "bold"
  },
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0284c7",
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800"
  },
  subtitleBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginBottom: 16
  },
  dotIndicator: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#4ade80",
    marginRight: 8
  },
  subtitleText: {
    color: "#E2E8F0",
    fontSize: 11,
    fontWeight: "500"
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8
  },
  statCard: {
    flex: 1,
    alignItems: "center"
  },
  statCardMiddle: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)"
  },
  statNumber: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800"
  },
  statLabel: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2
  },
  tabBar: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0"
  },
  tabScroll: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8
  },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    gap: 6
  },
  tabItemActive: {
    backgroundColor: "#0d2a3a"
  },
  tabLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600"
  },
  tabLabelActive: {
    color: "#ffffff"
  },
  scrollContent: {
    padding: 16
  },
  section: {
    marginBottom: 20
  },
  quickGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16
  },
  quickActionBox: {
    alignItems: "center",
    width: (SCREEN_W - 56) / 4
  },
  quickActionIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 6
  },
  quickActionText: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center"
  },
  contentCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1
  },
  contentCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  },
  contentCardTitle: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "bold"
  },
  linkText: {
    color: "#0284c7",
    fontSize: 12,
    fontWeight: "bold"
  },
  emptyNotice: {
    color: "#94A3B8",
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 14
  },
  claimListItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9"
  },
  plateBadgeSmall: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  plateBadgeSmallText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "bold",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace"
  },
  claimListNum: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace"
  },
  claimListSub: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 1
  },
  statusBadgeSoft: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12
  },
  statusBadgeSoftText: {
    color: "#1D4ED8",
    fontSize: 10,
    fontWeight: "bold"
  },
  sectionHeaderTitle: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "bold"
  },
  sectionHeaderSubtitle: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 2,
    marginBottom: 14
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6
  },
  plateBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  goldDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FBBF24",
    marginRight: 6
  },
  plateText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace"
  },
  activeTag: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12
  },
  activeTagText: {
    color: "#059669",
    fontSize: 10,
    fontWeight: "bold"
  },
  vehicleIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  vehicleName: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "bold"
  },
  vehicleMeta: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 2
  },
  specBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    gap: 4,
    marginBottom: 12
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  specLabel: {
    color: "#64748B",
    fontSize: 11
  },
  specVal: {
    color: "#0F172A",
    fontSize: 11,
    fontWeight: "600"
  },
  cardBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ff9800",
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6
  },
  cardBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold"
  },
  formItem: {
    marginBottom: 14
  },
  inputLabel: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 6
  },
  plateRowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  plateSelectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  plateSelectBtnActive: {
    backgroundColor: "#0d2a3a",
    borderColor: "#0d2a3a"
  },
  plateSelectText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "bold"
  },
  plateSelectTextActive: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold"
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#0F172A",
    fontSize: 13
  },
  uploadBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
    borderRadius: 10,
    gap: 8
  },
  uploadBoxText: {
    color: "#0284c7",
    fontSize: 12,
    fontWeight: "600"
  },
  photoPreview: {
    width: "100%",
    height: 150,
    borderRadius: 10,
    marginTop: 8
  },
  btnPrimary: {
    backgroundColor: "#0d2a3a",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8
  },
  btnPrimaryText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "bold"
  },
  claimNumberText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace"
  },
  claimSubText: {
    color: "#475569",
    fontSize: 12,
    marginTop: 4
  },
  claimDateText: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 2
  },
  passTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 10
  },
  passHeaderTitle: {
    color: "#0d2a3a",
    fontSize: 13,
    fontWeight: "900"
  },
  passHeaderSub: {
    color: "#64748B",
    fontSize: 11
  },
  passFieldLabel: {
    color: "#94A3B8",
    fontSize: 10,
    textTransform: "uppercase",
    fontWeight: "bold"
  },
  passDriverName: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "bold",
    marginTop: 2,
    marginBottom: 10
  },
  passRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10
  },
  passFieldVal: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 2
  },
  passRef: {
    color: "#0d2a3a",
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace"
  },
  passPillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6
  },
  passPlatePill: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  passPlatePillText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "bold",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace"
  },
  passFooter: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 8
  },
  passFooterText: {
    color: "#94A3B8",
    fontSize: 10,
    textAlign: "center"
  }
  headerBackground: {
    width: "100%",
    minHeight: 125,
    backgroundColor: "#0F172A",
    overflow: "hidden"
  },
  headerImageStyle: {
    resizeMode: "cover",
    opacity: 0.35
  },
  headerGradientInner: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
    minHeight: 110,
    justifyContent: "center"
  },
  mobileTabHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  mobileTabHeaderTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "bold",
    letterSpacing: -0.5
  },
  mobileTabHeaderSubtitle: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 3
  },
  avatarButtonSmall: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#0284c7",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#38bdf8"
  },
  avatarTextSmall: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "bold"
  }
};
);
