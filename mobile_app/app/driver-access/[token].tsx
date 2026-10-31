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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" {...({ translucent: true, backgroundColor: "#0f172a" } as any)} />

      {/* ========================================================================= */}
      {/* EXACT POLICYHOLDER MOBILE HERO HEADER */}
      {/* ========================================================================= */}
      {activeTab === "dashboard" && (
        <ImageBackground
          source={require("../../assets/images/policy1.jpg")}
          style={styles.heroBackground}
          imageStyle={styles.heroImageStyle}
        >
          <LinearGradient
            colors={["rgba(15,23,42,0.96)", "rgba(15,23,42,0.82)", "rgba(15,23,42,0.6)"]}
            style={styles.heroGradient}
          >
            {/* Top Bar */}
            <View style={styles.topBar}>
              <View style={{ flex: 1 }}>
                <Text style={styles.welcomeLabel}>Welcome back,</Text>
                <Text style={styles.welcomeName}>{profile?.driverName} 👋</Text>
              </View>

              <View style={styles.headerRightActions}>
                {/* Branch Badge */}
                <View style={styles.badgeBranch}>
                  <Ionicons name="business-outline" size={13} color="#38bdf8" />
                  <Text style={styles.badgeBranchText}>{profile?.branch || "Galle"}</Text>
                </View>

                {/* Notification Bell */}
                <TouchableOpacity
                  style={[styles.headerIconBtn, claims.length > 0 && styles.headerIconBtnAlert]}
                  onPress={() => setActiveTab("claims")}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={claims.length > 0 ? "notifications" : "notifications-outline"}
                    size={20}
                    color={claims.length > 0 ? "#fbbf24" : "#ffffff"}
                  />
                  {claims.length > 0 && (
                    <View style={styles.notifBadge}>
                      <Text style={styles.notifBadgeText}>{claims.length > 9 ? "9+" : claims.length}</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Avatar Button */}
                <TouchableOpacity style={styles.avatarButton} onPress={handleLogout} activeOpacity={0.85}>
                  <Text style={styles.avatarText}>{profile?.driverName?.charAt(0).toUpperCase() || "D"}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Subtitle Banner */}
            <View style={styles.subtitleBanner}>
              <View style={styles.dotIndicator} />
              <Text style={styles.subtitleText} numberOfLines={2}>
                Authorized by <Text style={{ color: "#ffffff", fontWeight: "700" }}>{profile?.policyHolderName}</Text> • All vehicles active
              </Text>
            </View>

            {/* Compensation / Notice Callout */}
            <View style={styles.compensationCallout}>
              <Text style={styles.calloutTitle}>
                In an event of accident: Claim up to 75,000 without police report
              </Text>
            </View>

            {/* Neon Action Buttons */}
            <View style={styles.neonButtonsContainer}>
              <TouchableOpacity
                style={[styles.neonButton, styles.neonButtonRed]}
                onPress={() => setActiveTab("submit")}
                activeOpacity={0.9}
              >
                <Ionicons name="add" size={20} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.neonButtonText}>New Claim</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.neonButton, styles.neonButtonCyan]}
                onPress={() => setActiveTab("claims")}
                activeOpacity={0.9}
              >
                <Ionicons name="search" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.neonButtonText}>Track Claim</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </ImageBackground>
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
        <ImageBackground
          source={require("../../assets/images/policy1.jpg")}
          style={styles.headerBackground}
          imageStyle={styles.headerImageStyle}
        >
          <LinearGradient
            colors={["rgba(12, 74, 110, 0.95)", "rgba(7, 89, 133, 0.82)", "rgba(3, 105, 161, 0.5)"]}
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
        </ImageBackground>
      )}

      {/* Main Scroll Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ========================================================================= */}
        {/* TAB 1: DASHBOARD (Exact Policyholder Home Layout) */}
        {/* ========================================================================= */}
        {activeTab === "dashboard" && (
          <View>
            {/* ── STAT CARDS ROW (Overlapping White Card) ── */}
            <View style={styles.statsCardRow}>
              <TouchableOpacity style={styles.statItem} activeOpacity={0.7} onPress={() => setActiveTab("claims")}>
                <View style={[styles.statIconWrap, { backgroundColor: "#fff7ed" }]}>
                  <Ionicons name="stats-chart" size={20} color="#f97316" />
                </View>
                <Text style={styles.statNumber}>{claims.length}</Text>
                <Text style={styles.statLabel}>Total Claims</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity style={styles.statItem} activeOpacity={0.7} onPress={() => setActiveTab("claims")}>
                <View style={[styles.statIconWrap, { backgroundColor: "#ecfeff" }]}>
                  <Ionicons name="time" size={20} color="#06b6d4" />
                </View>
                <Text style={styles.statNumber}>{pendingCount}</Text>
                <Text style={styles.statLabel}>In Progress</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity style={styles.statItem} activeOpacity={0.7} onPress={() => setActiveTab("claims")}>
                <View style={[styles.statIconWrap, { backgroundColor: "#f0fdf4" }]}>
                  <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                </View>
                <Text style={styles.statNumber}>{approvedCount}</Text>
                <Text style={styles.statLabel}>Approved</Text>
              </TouchableOpacity>
            </View>

            {/* ── DIGITAL DRIVER PASS CARD (Exact Policyholder MyDocs Gradient Card) ── */}
            <View style={{ paddingHorizontal: 16, marginTop: 22 }}>
              <TouchableOpacity
                style={styles.myDocsCard}
                onPress={() => setActiveTab("pass")}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={["#1e3a8a", "#2563eb"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.myDocsGradient}
                >
                  <View style={styles.myDocsLeft}>
                    <View style={styles.myDocsIconWrap}>
                      <Ionicons name="shield-checkmark" size={26} color="#ffffff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.myDocsLabel}>Official Digital Driver Pass</Text>
                      <Text style={styles.myDocsSub}>Verified credentials • Sanasa ({profile?.branch || "Galle"} Branch)</Text>
                    </View>
                  </View>
                  <View style={styles.myDocsArrow}>
                    <Ionicons name="arrow-forward" size={16} color="#ffffff" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* ── RECENT NOTIFICATIONS & REQUESTS ── */}
            <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => setActiveTab("claims")}
                activeOpacity={0.7}
              >
                <Text style={styles.sectionTitle}>Notifications & Reminders</Text>
                <Ionicons name="chevron-forward" size={18} color="#64748b" />
              </TouchableOpacity>

              {claims.length > 0 ? (
                <View style={styles.compactNotifCard}>
                  {claims.slice(0, 3).map((c, idx) => {
                    const isApproved = c.status === "Approved" || c.status === "Settled";
                    let iconBgColor = "#eff6ff";
                    let iconColor = "#2563eb";
                    let iconName: "time" | "alert-circle" | "checkmark-circle" = "time";

                    if (isApproved) {
                      iconBgColor = "#f0fdf4";
                      iconColor = "#16a34a";
                      iconName = "checkmark-circle";
                    } else if (c.status === "Rejected") {
                      iconBgColor = "#fef2f2";
                      iconColor = "#dc2626";
                      iconName = "alert-circle";
                    }

                    return (
                      <React.Fragment key={c.claimNumber}>
                        {idx > 0 && <View style={styles.compactSeparator} />}
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => setActiveTab("claims")}
                          style={styles.compactNotifItem}
                        >
                          <View style={[styles.compactIconCircle, { backgroundColor: iconBgColor }]}>
                            <Ionicons name={iconName} size={16} color={iconColor} />
                          </View>

                          <View style={styles.compactTextContainer}>
                            <View style={styles.compactRowHeader}>
                              <Text style={styles.compactTitle} numberOfLines={1}>
                                Claim {c.claimNumber} • {formatPlate(c.vehiclePlate)}
                              </Text>
                              <View style={styles.compactUnreadDot} />
                            </View>
                            <Text style={styles.compactDesc} numberOfLines={1}>
                              {c.damageType} at {c.location}
                            </Text>
                            <Text style={styles.compactDate}>Date: {c.incidentDate} • Status: {c.status}</Text>
                          </View>

                          <Ionicons name="chevron-forward" size={14} color="#94a3b8" style={{ marginLeft: 8 }} />
                        </TouchableOpacity>
                      </React.Fragment>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <Ionicons name="notifications-off-outline" size={32} color="#cbd5e1" />
                  <Text style={styles.emptyText}>No pending claims or requests for your vehicles.</Text>
                </View>
              )}
            </View>

            {/* ── MY VEHICLES ── */}
            <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => setActiveTab("vehicles")}
                activeOpacity={0.7}
              >
                <Text style={styles.sectionTitle}>Authorized Vehicles</Text>
                <Ionicons name="chevron-forward" size={18} color="#64748b" />
              </TouchableOpacity>

              {vehicles.length > 0 ? (
                <View style={styles.vehiclesList}>
                  {vehicles.map((v, idx) => {
                    const theme = getVehicleTheme(v.vehicleType || "Car");
                    return (
                      <View key={idx} style={styles.vehicleRow}>
                        <View style={[styles.vehicleIconContainer, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                          <MaterialCommunityIcons name={theme.icon as any} size={24} color={theme.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.vehiclePlate}>{formatPlate(v.numberPlate)}</Text>
                          <Text style={styles.vehicleDetails}>{[v.company, v.model, v.year].filter(Boolean).join(" · ")}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.vehicleViewBtn}
                          onPress={() => {
                            setClaimPlate(v.numberPlate);
                            setActiveTab("submit");
                          }}
                        >
                          <Text style={styles.vehicleViewBtnText}>Claim</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <Ionicons name="car-outline" size={32} color="#cbd5e1" />
                  <Text style={styles.emptyText}>No vehicles authorized under this pass.</Text>
                </View>
              )}
            </View>

            {/* ── LIVE CHAT HIGHLIGHT CARD ── */}
            <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
              <TouchableOpacity
                style={styles.chatHighlightCard}
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
                    <View style={styles.chatHighlightIconCircle}>
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

            {/* ── CONTACT SUPPORT ── */}
            <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Contact Support</Text>
              </View>
              <View style={styles.supportCard}>
                <View style={styles.supportContent}>
                  <Ionicons name="headset-outline" size={24} color="#0f172a" />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.supportLabel}>Sanasa 24/7 Hotline</Text>
                    <Text style={styles.supportSub}>Phone: +94 112 003 000{"\n"}Email: claims@sanasainsurance.lk</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* ── QUICK ACTIONS (Exact Policyholder 6-Grid) ── */}
            <View style={{ paddingHorizontal: 16, marginTop: 28 }}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
              </View>

              <View style={styles.quickGrid}>
                {[
                  { label: "New Claim", icon: "add-circle-outline", action: () => setActiveTab("submit") },
                  { label: "My Claims", icon: "document-text-outline", action: () => setActiveTab("claims") },
                  { label: "Track Claim", icon: "locate-outline", action: () => setActiveTab("claims") },
                  { label: "My Vehicles", icon: "car-outline", action: () => setActiveTab("vehicles") },
                  { label: "Digital Pass", icon: "shield-checkmark-outline", action: () => setActiveTab("pass") },
                  {
                    label: "Live Chat",
                    icon: "chatbubbles-outline",
                    action: () => {
                      const initialRef = claims[0]?.claimNumber || profile?.reference || "";
                      setSelectedChatRef(initialRef);
                      fetchChatRecipients(initialRef).then((recs) => {
                        if (recs && recs[0]) loadConversation(initialRef, recs[0]);
                      });
                      setActiveTab("chat");
                    }
                  },
                ].map((action, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.quickItem}
                    onPress={action.action}
                    activeOpacity={0.75}
                  >
                    <View style={styles.quickIconBox}>
                      <Ionicons name={action.icon as any} size={22} color="#0f172a" />
                    </View>
                    <Text style={styles.quickLabel}>{action.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
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

      {/* ── FLOATING BOTTOM NAVBAR (PolicyHolder Navbar Parity) ── */}
      <View style={styles.bottomNavContainer}>
        <View style={styles.bottomNavShell}>
          {/* Home */}
          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => setActiveTab("dashboard")}
          >
            <Ionicons
              name={activeTab === "dashboard" ? "home" : "home-outline"}
              size={22}
              color={activeTab === "dashboard" ? "#0f766e" : "#94a3b8"}
            />
            <Text style={[styles.navLabel, activeTab === "dashboard" && styles.navLabelActive]}>
              Home
            </Text>
          </TouchableOpacity>

          {/* Claims */}
          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => setActiveTab("claims")}
          >
            <Ionicons
              name={activeTab === "claims" ? "document-text" : "document-text-outline"}
              size={22}
              color={activeTab === "claims" ? "#0f766e" : "#94a3b8"}
            />
            <Text style={[styles.navLabel, activeTab === "claims" && styles.navLabelActive]}>
              Claims
            </Text>
          </TouchableOpacity>

          {/* Center + New Claim */}
          <TouchableOpacity
            style={styles.centerWrap}
            activeOpacity={0.85}
            onPress={() => setActiveTab("submit")}
          >
            <View style={styles.centerBtn}>
              <Ionicons name="add" size={28} color="#ffffff" />
            </View>
            <Text style={styles.centerLabel}>New</Text>
          </TouchableOpacity>

          {/* Vehicles */}
          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => setActiveTab("vehicles")}
          >
            <Ionicons
              name={activeTab === "vehicles" ? "car" : "car-outline"}
              size={22}
              color={activeTab === "vehicles" ? "#0f766e" : "#94a3b8"}
            />
            <Text style={[styles.navLabel, activeTab === "vehicles" && styles.navLabelActive]}>
              Vehicles
            </Text>
          </TouchableOpacity>

          {/* Digital Pass */}
          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => setActiveTab("pass")}
          >
            <Ionicons
              name={activeTab === "pass" ? "shield-checkmark" : "shield-checkmark-outline"}
              size={22}
              color={activeTab === "pass" ? "#0f766e" : "#94a3b8"}
            />
            <Text style={[styles.navLabel, activeTab === "pass" && styles.navLabelActive]}>
              Pass
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
  section: {
    marginBottom: 20
  },
  /* ── PolicyHolder Hero Design System ── */
  heroBackground: {
    width: "100%",
    minHeight: 390
  },
  heroImageStyle: {
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40
  },
  heroGradient: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 58 : (StatusBar.currentHeight ? StatusBar.currentHeight + 14 : 50),
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
  },
  welcomeLabel: {
    fontSize: 14,
    color: "#94a3b8",
    fontWeight: "600"
  },
  welcomeName: {
    fontSize: 24,
    color: "#ffffff",
    fontWeight: "800",
    marginTop: 2
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
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12
  },
  badgeBranchText: {
    color: "#38bdf8",
    fontSize: 11,
    fontWeight: "bold"
  },
  headerIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconBtnAlert: {
    borderColor: "rgba(251,191,36,0.5)",
    backgroundColor: "rgba(251,191,36,0.15)",
  },
  notifBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#dc2626",
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#0f172a",
  },
  notifBadgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "800"
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800"
  },
  subtitleBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginVertical: 10,
  },
  dotIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
    marginRight: 10
  },
  subtitleText: {
    flex: 1,
    fontSize: 12,
    color: "#e2e8f0",
    fontWeight: "400",
    lineHeight: 18
  },
  compensationCallout: {
    backgroundColor: "rgba(15,23,42,0.45)",
    borderLeftWidth: 3,
    borderLeftColor: "#38bdf8",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    marginVertical: 12,
  },
  calloutTitle: {
    fontSize: 12.5,
    color: "#cbd5e1",
    fontWeight: "500",
    lineHeight: 18
  },
  neonButtonsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 8
  },
  neonButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 99,
    minWidth: 140,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  neonButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800"
  },
  neonButtonRed: {
    backgroundColor: "#dc2626",
    shadowColor: "rgba(220,38,38,0.6)"
  },
  neonButtonCyan: {
    backgroundColor: "#0ea5e9",
    shadowColor: "rgba(14,165,233,0.6)"
  },

  /* ── Overlapping Stats Row ── */
  statsCardRow: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginTop: -26,
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 10,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    zIndex: 20,
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  statIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0f172a"
  },
  statLabel: {
    fontSize: 10.5,
    color: "#64748b",
    fontWeight: "700",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.3
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: "#f1f5f9"
  },

  /* ── Digital Driver Pass Card (PolicyHolder MyDocs Parity) ── */
  myDocsCard: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  myDocsGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  myDocsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1
  },
  myDocsIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  myDocsLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff"
  },
  myDocsSub: {
    fontSize: 11.5,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "600",
    marginTop: 2
  },
  myDocsArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* ── Section Titles ── */
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.2
  },

  /* ── Compact Notifications Card ── */
  compactNotifCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  compactNotifItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  compactSeparator: {
    height: 1,
    backgroundColor: "#f1f5f9",
  },
  compactIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  compactTextContainer: {
    flex: 1,
  },
  compactRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  compactTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
    flex: 1,
  },
  compactUnreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2563eb",
    marginLeft: 6,
  },
  compactDesc: {
    fontSize: 11.5,
    color: "#64748b",
  },
  compactDate: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 2,
  },

  /* ── Vehicles List ── */
  vehiclesList: {
    gap: 10
  },
  vehicleRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 18,
    padding: 14,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.01,
    shadowRadius: 4,
    elevation: 1,
  },
  vehicleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#f0f9ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  vehiclePlate: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: 0.3
  },
  vehicleDetails: {
    fontSize: 11.5,
    color: "#64748b",
    fontWeight: "600",
    marginTop: 2
  },
  vehicleViewBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: "#cbd5e1"
  },
  vehicleViewBtnText: {
    fontSize: 11.5,
    color: "#475569",
    fontWeight: "800"
  },

  /* ── Chat Highlight Card ── */
  chatHighlightCard: {
    backgroundColor: "#0d2a3a",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#0d2a3a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  chatHighlightIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* ── Support Card ── */
  supportCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  supportContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  supportLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },
  supportSub: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
    lineHeight: 16,
  },

  /* ── Quick Actions Grid ── */
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
  },
  quickItem: {
    width: (SCREEN_W - 32 - 24) / 3,
    alignItems: "center",
    paddingVertical: 16,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    gap: 8,
  },
  quickIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#334155",
    textAlign: "center"
  },

  /* ── Empty State ── */
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.01,
    shadowRadius: 6,
    elevation: 1,
  },
  emptyText: {
    fontSize: 12.5,
    color: "#64748b",
    fontWeight: "700"
  },

  /* ── Floating Bottom Navigation Bar ── */
  bottomNavContainer: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: Platform.OS === "ios" ? 20 : 10,
    zIndex: 999,
  },
  bottomNavShell: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#ffffff",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 18 : 10,
    paddingHorizontal: 8,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 2,
    position: "relative",
  },
  navLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#6b7280",
  },
  navLabelActive: {
    color: "#0f172a",
    fontWeight: "700",
  },
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: -18,
  },
  centerBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#0f766e",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0f766e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 3,
    borderColor: "#ffffff",
  },
  centerLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#0f766e",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
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
  },
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
});
