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
  Alert,
  SafeAreaView,
  Platform,
  StatusBar
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { API_BASE_URL } from "../_config";

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
  driverPhone: string;
  driverAddress: string;
  policyHolderName: string;
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

type TabType = "dashboard" | "vehicles" | "submit" | "claims" | "pass";

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
        // Save isolated from normal policyholder session
        await AsyncStorage.setItem("@tp_driver_restricted_session", sToken);

        // Load profile, vehicles, and claims
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

      Alert.alert("Claim Lodged", `Claim Reference: ${data.claimNumber}\nRouted to ${profile?.branch || "regional"} branch.`);
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
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00ddff" />
        <Text style={styles.loadingText}>Verifying Digital Pass & Session...</Text>
      </View>
    );
  }

  if (error || !sessionToken) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={54} color="#f43f5e" />
        <Text style={styles.errorTitle}>Access Link Inactive</Text>
        <Text style={styles.errorDesc}>{error || "This driver link has been revoked or expired."}</Text>
        <TouchableOpacity style={styles.btnSecondary} onPress={() => router.replace("/")}>
          <Text style={styles.btnSecondaryText}>Return to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>S</Text>
          </View>
          <View>
            <Text style={styles.brandTitle}>SANASA INSURANCE</Text>
            <Text style={styles.driverSubTitle}>Authorized: {profile?.driverName}</Text>
          </View>
        </View>

        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={18} color="#f43f5e" />
        </TouchableOpacity>
      </View>

      {/* Navigation Tabs */}
      <View style={styles.tabBar}>
        {[
          { id: "dashboard", label: "Dashboard", icon: "shield-checkmark-outline" },
          { id: "vehicles", label: `Vehicles (${vehicles.length})`, icon: "car-outline" },
          { id: "submit", label: "Lodge Claim", icon: "camera-outline" },
          { id: "claims", label: `Claims (${claims.length})`, icon: "time-outline" },
          { id: "pass", label: "Pass", icon: "card-outline" }
        ].map((t) => (
          <TouchableOpacity
            key={t.id}
            onPress={() => setActiveTab(t.id as TabType)}
            style={[styles.tabItem, activeTab === t.id && styles.tabItemActive]}
          >
            <Ionicons
              name={t.icon as any}
              size={16}
              color={activeTab === t.id ? "#00ddff" : "#94a3b8"}
            />
            <Text style={[styles.tabLabel, activeTab === t.id && styles.tabLabelActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Main Body */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* TAB 1: DASHBOARD */}
        {activeTab === "dashboard" && (
          <View style={styles.section}>
            <View style={styles.welcomeCard}>
              <View style={styles.verifiedPill}>
                <View style={styles.greenDot} />
                <Text style={styles.verifiedPillText}>AUTHORIZED DRIVER</Text>
              </View>
              <Text style={styles.welcomeName}>Hello, {profile?.driverName}</Text>
              <Text style={styles.welcomeSub}>
                Authorized by vehicle owner {profile?.policyHolderName} under Sanasa {profile?.branch} Branch.
              </Text>

              <TouchableOpacity
                style={styles.primaryCtaBtn}
                onPress={() => setActiveTab("submit")}
              >
                <Ionicons name="camera" size={16} color="#0f172a" />
                <Text style={styles.primaryCtaText}>Lodge Accident Claim</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Metrics */}
            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricVal}>{vehicles.length}</Text>
                <Text style={styles.metricLbl}>Assigned Vehicles</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={[styles.metricVal, { color: "#00ddff" }]}>{claims.length}</Text>
                <Text style={styles.metricLbl}>Lodged Claims</Text>
              </View>
            </View>
          </View>
        )}

        {/* TAB 2: ASSIGNED VEHICLES */}
        {activeTab === "vehicles" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Assigned Insured Vehicles</Text>
            {vehicles.map((v) => (
              <View key={v.numberPlate} style={styles.vehicleCard}>
                <View style={styles.plateBadge}>
                  <View style={styles.goldDot} />
                  <Text style={styles.plateText}>{v.numberPlate}</Text>
                </View>
                <Text style={styles.vehicleModel}>{v.company} {v.model}</Text>
                <Text style={styles.vehicleSub}>{v.vehicleType} • {v.year} • Comprehensive Policy</Text>

                <TouchableOpacity
                  style={styles.btnSecondary}
                  onPress={() => {
                    setClaimPlate(v.numberPlate);
                    setActiveTab("submit");
                  }}
                >
                  <Text style={styles.btnSecondaryText}>Lodge Claim for this Vehicle</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* TAB 3: SUBMIT CLAIM */}
        {activeTab === "submit" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lodge Accident Claim</Text>
            <Text style={styles.sectionSubtitle}>Select vehicle and provide incident details</Text>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Selected Vehicle Plate</Text>
              <View style={styles.platePickerRow}>
                {vehicles.map((v) => (
                  <TouchableOpacity
                    key={v.numberPlate}
                    style={[
                      styles.plateOption,
                      claimPlate === v.numberPlate && styles.plateOptionSelected
                    ]}
                    onPress={() => setClaimPlate(v.numberPlate)}
                  >
                    <Text style={claimPlate === v.numberPlate ? styles.plateOptTextActive : styles.plateOptText}>
                      {v.numberPlate}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Incident Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={claimDate}
                onChangeText={setClaimDate}
                placeholder="2026-10-29"
                placeholderTextColor="#64748b"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Incident Location (City/Road)</Text>
              <TextInput
                style={styles.input}
                value={claimLocation}
                onChangeText={setClaimLocation}
                placeholder="e.g. Galle Road, Kalutara"
                placeholderTextColor="#64748b"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description of Incident</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                multiline
                value={claimDesc}
                onChangeText={setClaimDesc}
                placeholder="Describe how the incident occurred..."
                placeholderTextColor="#64748b"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Damage Photograph</Text>
              <TouchableOpacity style={styles.photoUploadBtn} onPress={handlePickPhoto}>
                <Ionicons name="camera-outline" size={20} color="#00ddff" />
                <Text style={styles.photoUploadText}>
                  {accidentPhotoBase64 ? "Photo Attached (Tap to change)" : "Take / Attach Photo"}
                </Text>
              </TouchableOpacity>
              {accidentPhotoBase64 ? (
                <Image source={{ uri: accidentPhotoBase64 }} style={styles.previewImage} />
              ) : null}
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmitClaim}
              disabled={submittingClaim}
            >
              {submittingClaim ? (
                <ActivityIndicator color="#0f172a" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Claim to Branch</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* TAB 4: CLAIMS HISTORY */}
        {activeTab === "claims" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Lodged Claims</Text>
            {claims.length === 0 ? (
              <Text style={styles.emptyText}>No claims lodged under this driver yet.</Text>
            ) : (
              claims.map((c) => (
                <View key={c.claimNumber} style={styles.claimCard}>
                  <View style={styles.claimCardHeader}>
                    <Text style={styles.claimNumber}>{c.claimNumber}</Text>
                    <View style={styles.statusPill}>
                      <Text style={styles.statusPillText}>{c.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.claimSub}>
                    Vehicle: {c.vehiclePlate} • {c.damageType}
                  </Text>
                  <Text style={styles.claimDate}>Incident: {c.incidentDate} • {c.location}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 5: DIGITAL PASS */}
        {activeTab === "pass" && (
          <View style={styles.section}>
            <View style={styles.passCard}>
              <View style={styles.passHeader}>
                <Text style={styles.passBrand}>SANASA GENERAL INSURANCE</Text>
                <Text style={styles.passTitle}>Official Digital Driver Pass</Text>
              </View>

              <View style={styles.passBody}>
                <Text style={styles.passLabel}>Authorized Driver</Text>
                <Text style={styles.passDriverName}>{profile?.driverName}</Text>

                <View style={styles.passMetaRow}>
                  <View>
                    <Text style={styles.passLabel}>Masked NIC</Text>
                    <Text style={styles.passVal}>{profile?.driverNicMasked}</Text>
                  </View>
                  <View>
                    <Text style={styles.passLabel}>Branch</Text>
                    <Text style={styles.passVal}>{profile?.branch}</Text>
                  </View>
                </View>

                <Text style={styles.passLabel}>Pass Reference</Text>
                <Text style={styles.passRefText}>{profile?.reference}</Text>

                <Text style={[styles.passLabel, { marginTop: 12 }]}>Authorized Vehicles</Text>
                <View style={styles.passPlatesRow}>
                  {vehicles.map((v) => (
                    <View key={v.numberPlate} style={styles.passPlatePill}>
                      <Text style={styles.passPlatePillText}>{v.numberPlate}</Text>
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
    backgroundColor: "#020617"
  },
  centerContainer: {
    flex: 1,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  loadingText: {
    color: "#94a3b8",
    fontSize: 13,
    marginTop: 12
  },
  errorTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 12
  },
  errorDesc: {
    color: "#94a3b8",
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 20
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#0f172a",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b"
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#00ddff",
    alignItems: "center",
    justifyContent: "center"
  },
  logoBadgeText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0f172a"
  },
  brandTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  driverSubTitle: {
    color: "#94a3b8",
    fontSize: 11
  },
  logoutBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(244, 63, 94, 0.1)"
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    paddingHorizontal: 8,
    paddingVertical: 6,
    justifyContent: "space-around"
  },
  tabItem: {
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8
  },
  tabItemActive: {
    backgroundColor: "#1e293b"
  },
  tabLabel: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2
  },
  tabLabelActive: {
    color: "#00ddff"
  },
  scrollContent: {
    padding: 16
  },
  section: {
    marginBottom: 20
  },
  welcomeCard: {
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1e293b"
  },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    marginBottom: 8
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10b981",
    marginRight: 6
  },
  verifiedPillText: {
    color: "#10b981",
    fontSize: 10,
    fontWeight: "bold"
  },
  welcomeName: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold"
  },
  welcomeSub: {
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6
  },
  primaryCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00ddff",
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
    marginTop: 16
  },
  primaryCtaText: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "bold"
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#0f172a",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e293b"
  },
  metricVal: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold"
  },
  metricLbl: {
    color: "#94a3b8",
    fontSize: 11,
    marginTop: 4
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4
  },
  sectionSubtitle: {
    color: "#94a3b8",
    fontSize: 12,
    marginBottom: 16
  },
  vehicleCard: {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 12
  },
  plateBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#020617",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 8
  },
  goldDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fbbf24",
    marginRight: 6
  },
  plateText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace"
  },
  vehicleModel: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold"
  },
  vehicleSub: {
    color: "#94a3b8",
    fontSize: 11,
    marginTop: 2,
    marginBottom: 12
  },
  btnSecondary: {
    backgroundColor: "#1e293b",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center"
  },
  btnSecondaryText: {
    color: "#00ddff",
    fontSize: 12,
    fontWeight: "600"
  },
  formGroup: {
    marginBottom: 14
  },
  formLabel: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6
  },
  input: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
    fontSize: 13
  },
  platePickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  plateOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 8
  },
  plateOptionSelected: {
    borderColor: "#00ddff",
    backgroundColor: "rgba(0, 221, 255, 0.1)"
  },
  plateOptText: {
    color: "#94a3b8",
    fontSize: 12
  },
  plateOptTextActive: {
    color: "#00ddff",
    fontSize: 12,
    fontWeight: "bold"
  },
  photoUploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#1e293b",
    borderStyle: "dashed",
    borderRadius: 10,
    paddingVertical: 16,
    backgroundColor: "#0f172a"
  },
  photoUploadText: {
    color: "#94a3b8",
    fontSize: 12
  },
  previewImage: {
    width: "100%",
    height: 160,
    borderRadius: 10,
    marginTop: 10
  },
  submitBtn: {
    backgroundColor: "#00ddff",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10
  },
  submitBtnText: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "bold"
  },
  emptyText: {
    color: "#64748b",
    fontSize: 13,
    textAlign: "center",
    marginTop: 30
  },
  claimCard: {
    backgroundColor: "#0f172a",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 10
  },
  claimCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  claimNumber: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace"
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: "rgba(0, 221, 255, 0.1)"
  },
  statusPillText: {
    color: "#00ddff",
    fontSize: 10,
    fontWeight: "bold"
  },
  claimSub: {
    color: "#cbd5e1",
    fontSize: 12,
    marginTop: 4
  },
  claimDate: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 2
  },
  passCard: {
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1e293b"
  },
  passHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    paddingBottom: 12,
    marginBottom: 14
  },
  passBrand: {
    color: "#00ddff",
    fontSize: 13,
    fontWeight: "bold"
  },
  passTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 2
  },
  passBody: {
    marginBottom: 14
  },
  passLabel: {
    color: "#64748b",
    fontSize: 10,
    textTransform: "uppercase",
    fontWeight: "bold"
  },
  passDriverName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 2,
    marginBottom: 10
  },
  passMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10
  },
  passVal: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2
  },
  passRefText: {
    color: "#00ddff",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 2
  },
  passPlatesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6
  },
  passPlatePill: {
    backgroundColor: "#020617",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#1e293b"
  },
  passPlatePillText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace"
  },
  passFooter: {
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    paddingTop: 10
  },
  passFooterText: {
    color: "#64748b",
    fontSize: 10,
    textAlign: "center"
  }
});
