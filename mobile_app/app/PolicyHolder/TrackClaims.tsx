import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Platform,
  Alert,
  ImageBackground,
  Keyboard,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import PolicyHolderNavbar from "../Components/PolicyHolder/page";
import { API_BASE_URL } from "../_config";

const { width: SCREEN_W } = Dimensions.get("window");

interface Claim {
  claimNumber: string;
  vehiclePlate: string;
  incidentDate: string;
  incidentTime?: string;
  damageType: string;
  amount: string;
  status: string;
  description?: string;
  location?: string;
  officer?: string;
  documentsRequested?: boolean;
  requestedDocuments?: string[];
  documentRequestTo?: string;
  branch?: string;
  currentStep?: number;
  otherVehicleDetails?: any;
  messages?: { sender: string; message: string; sentAt: string; recipient?: string }[];
  paymentReceipt?: string;
}

import { useLanguage } from "../../utils/translations";

export default function TrackClaims() {
  const { lang, t } = useLanguage();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [claimId, setClaimId] = useState("");
  const [trackedClaim, setTrackedClaim] = useState<Claim | null>(null);

  const getUserRequestedDocs = (claim: Claim): string[] => {
    const getRecipientForDoc = (name: string) => {
      const msg = [...(claim.messages || [])]
        .reverse()
        .find(m => m.message.includes(`Requested: ${name}`));
      if (msg) {
        if (msg.message.includes("[Document Request to Agent]")) return "Agent";
        if (msg.message.includes("[Document Request to User]")) return "User";
      }
      return claim.documentRequestTo || "User";
    };
    return (claim.requestedDocuments || []).filter(name => getRecipientForDoc(name) === "User");
  };
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [claimsList, setClaimsList] = useState<Claim[]>([]);

  useEffect(() => {
    if (id) {
      setClaimId(id);
      (async () => {
        setIsLoading(true);
        setSearchAttempted(true);
        try {
          const res = await fetch(`${API_BASE_URL}/api/policy-holder/track-claim?claimNumber=${encodeURIComponent(id.trim().toUpperCase())}`);
          if (res.ok) {
            const data = await res.json();
            if (data.claim) {
              setTrackedClaim({
                claimNumber: data.claim.claimNumber,
                vehiclePlate: data.claim.vehiclePlate,
                incidentDate: formatDateString(data.claim.incidentDate),
                incidentTime: data.claim.incidentTime,
                damageType: data.claim.damageType,
                amount: data.claim.amount ? `Rs. ${Number(data.claim.amount).toLocaleString()}` : "Pending",
                status: data.claim.status || "Pending",
                description: data.claim.description,
                otherVehicleDetails: data.claim.otherVehicleDetails,
                location: data.claim.location,
                officer: data.claim.officer || "Not Assigned",
                documentsRequested: data.claim.documentsRequested || false,
                requestedDocuments: data.claim.requestedDocuments || [],
                currentStep: data.claim.currentStep || 1,
                messages: data.claim.messages || []
              });
              setIsLoading(false);
              return;
            }
          }
        } catch (err) {}
        
        if (claimsList.length > 0) {
          const found = claimsList.find((c) => c.claimNumber.toUpperCase() === id.trim().toUpperCase());
          setTrackedClaim(found || null);
        }
        setIsLoading(false);
      })();
    }
  }, [id, claimsList.length]);

  // Poll currently tracked claim in background for automatic real-time updates
  useEffect(() => {
    if (!trackedClaim || !trackedClaim.claimNumber) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/policy-holder/track-claim?claimNumber=${encodeURIComponent(trackedClaim.claimNumber.trim().toUpperCase())}`);
        if (res.ok) {
          const data = await res.json();
          if (data.claim) {
            setTrackedClaim({
              claimNumber: data.claim.claimNumber,
              vehiclePlate: data.claim.vehiclePlate,
              incidentDate: formatDateString(data.claim.incidentDate),
              incidentTime: data.claim.incidentTime,
              damageType: data.claim.damageType,
              amount: data.claim.amount ? `Rs. ${Number(data.claim.amount).toLocaleString()}` : "Pending",
              status: data.claim.status || "Pending",
              description: data.claim.description,
              otherVehicleDetails: data.claim.otherVehicleDetails,
              location: data.claim.location,
              officer: data.claim.officer || "Not Assigned",
              documentsRequested: data.claim.documentsRequested || false,
              requestedDocuments: data.claim.requestedDocuments || [],
              currentStep: data.claim.currentStep || 1,
              messages: data.claim.messages || [],
              branch: data.claim.branch
            });
          }
        }
      } catch (err) {
        console.warn("Background track claim polling failed:", err);
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [trackedClaim?.claimNumber]);

  // Load user's claims to build a local tracking list for fallback
  useEffect(() => {
    (async () => {
      const userStr = await AsyncStorage.getItem("logged_in_user");
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.nic) {
            const res = await fetch(`${API_BASE_URL}/api/policy-holder/user-claims?nic=${encodeURIComponent(user.nic)}`);
            let databaseClaims: Claim[] = [];
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data.claims)) {
                databaseClaims = data.claims.map((claim: any) => ({
                  claimNumber: claim.claimNumber,
                  vehiclePlate: claim.vehiclePlate,
                  incidentDate: formatDateString(claim.incidentDate),
                  incidentTime: claim.incidentTime,
                  damageType: claim.damageType,
                  amount: claim.amount ? `Rs. ${Number(claim.amount).toLocaleString()}` : "Pending",
                  status: claim.status || "Pending",
                  description: claim.description,
                  otherVehicleDetails: claim.otherVehicleDetails,
                  location: claim.location,
                  officer: claim.officer || "Not Assigned",
                  documentsRequested: claim.documentsRequested || false,
                  requestedDocuments: claim.requestedDocuments || [],
                  currentStep: claim.currentStep || 1,
                  messages: claim.messages || [],
                  branch: claim.branch
                }));
              }
            }
            // Check local submitted
            const lastStr = await AsyncStorage.getItem("last_submitted_claim");
            let localClaims: Claim[] = [];
            if (lastStr) {
              const parsed = JSON.parse(lastStr);
              const exists = databaseClaims.some(c => c.claimNumber === parsed.claimNumber);
              if (!exists) {
                localClaims.push({
                  claimNumber: parsed.claimNumber,
                  vehiclePlate: parsed.vehiclePlate,
                  incidentDate: formatDateString(parsed.incidentDate),
                  incidentTime: parsed.incidentTime,
                  damageType: parsed.damageType,
                  amount: "Pending",
                  status: "Pending",
                  description: parsed.description,
                  otherVehicleDetails: parsed.otherVehicleDetails,
                  location: parsed.location,
                  officer: "Not Assigned",
                  documentsRequested: false,
                  requestedDocuments: [],
                  currentStep: 1,
                  messages: []
                });
              }
            }
            setClaimsList([...localClaims, ...databaseClaims]);
          }
        } catch (e) {
          console.error(e);
        }
      }
    })();
  }, []);

  const formatDateString = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${date.getDate().toString().padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`;
    } catch (e) {
      return dateStr;
    }
  };

  const handleTrack = async () => {
    const cleanId = claimId.trim().toUpperCase();
    if (!cleanId) {
      Alert.alert("Input Required", "Please enter a Claim Reference ID.");
      return;
    }

    Keyboard.dismiss();
    setIsLoading(true);
    setSearchAttempted(true);

    try {
      // 1. Fetch from Backend tracking API
      const res = await fetch(`${API_BASE_URL}/api/policy-holder/track-claim?claimNumber=${encodeURIComponent(cleanId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.claim) {
          setTrackedClaim({
            claimNumber: data.claim.claimNumber,
            vehiclePlate: data.claim.vehiclePlate,
            incidentDate: formatDateString(data.claim.incidentDate),
            incidentTime: data.claim.incidentTime,
            damageType: data.claim.damageType,
            amount: data.claim.amount ? `Rs. ${Number(data.claim.amount).toLocaleString()}` : "Pending",
            status: data.claim.status || "Pending",
            description: data.claim.description,
            otherVehicleDetails: data.claim.otherVehicleDetails,
            location: data.claim.location,
            officer: data.claim.officer || "Not Assigned",
            documentsRequested: data.claim.documentsRequested || false,
            requestedDocuments: data.claim.requestedDocuments || [],
            currentStep: data.claim.currentStep || 1,
            messages: data.claim.messages || []
          });
          setIsLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn("API tracking endpoint error, checking local list:", err);
    }

    // 2. Check local fallback list
    const found = claimsList.find((c) => c.claimNumber.toUpperCase() === cleanId);
    setTrackedClaim(found || null);
    setIsLoading(false);
  };

  const formatNumberPlate = (plate: string): string => {
    if (!plate) return "";
    const cleaned = plate.trim();
    if (cleaned.includes("-")) return cleaned.toUpperCase();
    const lastNumbersMatch = cleaned.match(/^(.*[A-Za-z]+)(\d+)$/);
    if (lastNumbersMatch) {
      return `${lastNumbersMatch[1].trim().toUpperCase()}-${lastNumbersMatch[2]}`;
    }
    return cleaned.toUpperCase();
  };

  const renderClaimProgress = (status: string, dbStep?: number, paymentReceipt?: string) => {
    let currentStep = dbStep || 1;
    if (paymentReceipt) {
      currentStep = 6;
    } else if (!dbStep) {
      const s = status.toLowerCase();
      if (s.includes("pending") || s.includes("progress")) currentStep = 3;
      else if (s.includes("review")) currentStep = 4;
      else if (s.includes("approved") || s.includes("done")) currentStep = 5;
    }

    const isRejected = status.toLowerCase() === "rejected";
    const isFullyPaid = (status.toLowerCase() === "approved" || currentStep >= 6) && !!paymentReceipt;

    const steps = [
      { num: "01", label: "Submitted" },
      { num: "02", label: "Assigned" },
      { num: "03", label: "Inspection" },
      { num: "04", label: "Review" },
      { num: "05", label: "Decision" },
      { num: "06", label: "Payment" }
    ];

    return (
      <View style={styles.wizardContainer}>
        {/* Grey background connection line */}
        <View style={styles.wizardBgLine} />
        {/* Green/Red progress connection line */}
        <View
          style={[
            styles.wizardProgressLine,
            isRejected && { backgroundColor: "#ef4444" },
            { width: isFullyPaid ? "100%" : `${((currentStep - 1) / 5) * 100}%` }
          ]}
        />

        <View style={styles.wizardStepsRow}>
          {steps.map((step, idx) => {
            const stepNum = idx + 1;
            const isCompleted = isFullyPaid || stepNum < currentStep;
            const isActive = !isFullyPaid && stepNum === currentStep;

            let circleStyle: any = styles.stepCircleInactive;
            let textStyle: any = styles.stepTextInactive;

            if (isCompleted) {
              circleStyle = isRejected ? { borderColor: "#ef4444" } : styles.stepCircleCompleted;
              textStyle = isRejected ? { color: "#ef4444" } : styles.stepTextCompleted;
            } else if (isActive) {
              circleStyle = isRejected ? { borderColor: "#ef4444", backgroundColor: "#fef2f2" } : styles.stepCircleActive;
              textStyle = isRejected ? { color: "#ef4444", fontWeight: "800" } : styles.stepTextActive;
            }

            return (
              <View key={step.num} style={styles.stepItem}>
                <View style={[styles.stepCircle, circleStyle]}>
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={14} color={isRejected ? "#ef4444" : "#00b050"} />
                  ) : (
                    <Text style={[styles.stepNumber, isActive && { color: isRejected ? "#ef4444" : "#2563eb" }]}>{step.num}</Text>
                  )}
                </View>
                <Text style={[styles.stepLabel, textStyle]}>{step.label}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Styled curved header matching the dashboard */}
      <ImageBackground
        source={require("../../assets/images/myclaim.png")}
        style={styles.headerBackground}
        imageStyle={styles.headerImageStyle}
      >
        <LinearGradient
          colors={["rgba(13, 42, 58, 0.95)", "rgba(13, 42, 58, 0.82)", "rgba(15, 23, 42, 0.5)"]}
          style={styles.headerGradient}
        >
          <Text style={styles.headerTitle}>{t.trackClaims.title}</Text>
          <Text style={styles.headerSubtitle}>{lang === "en" ? "Monitor your claim progress in real-time" : lang === "si" ? "ඔබගේ හිමිකම් ප්‍රගතිය සජීවීව නිරීක්ෂණය කරන්න" : "நிகழ்நேரத்தில் உங்கள் கோரிக்கை முன்னேற்றத்தைக் கண்காணிக்கவும்"}</Text>
        </LinearGradient>
      </ImageBackground>

      {/* Track Search Bar */}
      <View style={styles.trackBarContainer}>
        <TextInput
          placeholder={lang === "en" ? "Enter Claim ID (e.g. CLM-2074-1487)" : lang === "si" ? "හිමිකම් අංකය ඇතුළත් කරන්න" : "கோரிக்கை அடையாள எண்ணை உள்ளிடவும்"}
          placeholderTextColor="#94a3b8"
          autoCapitalize="characters"
          value={claimId}
          onChangeText={setClaimId}
          style={styles.trackInput}
        />
        <TouchableOpacity style={styles.trackBtn} onPress={handleTrack} activeOpacity={0.85}>
          <Text style={styles.trackBtnText}>{lang === "en" ? "Track" : lang === "si" ? "සොයන්න" : "தொடர்க"}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#0ea5e9" />
            <Text style={styles.loadingText}>{lang === "en" ? "Searching claims registry..." : lang === "si" ? "හිමිකම් ලේඛනාගාරය සොයමින්..." : "கோரிக்கைகள் பதிவேட்டில் தேடுகிறது..."}</Text>
          </View>
        ) : trackedClaim ? (
          <View style={styles.resultsContainer}>
            {/* Header info card */}
            <View style={styles.claimSummaryCard}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View>
                  <Text style={styles.cardHeaderTitle}>{trackedClaim.claimNumber}</Text>
                  <Text style={styles.cardHeaderSub}>{lang === "en" ? "Registered vehicle: " : lang === "si" ? "ලියාපදිංචි වාහනය: " : "பதிவுசெய்யப்பட்ட வாகனம்: "}{formatNumberPlate(trackedClaim.vehiclePlate)}</Text>
                </View>
                <View style={styles.badgeWrap}>
                  <Text style={styles.badgeLabel}>{trackedClaim.status === "Pending" ? t.trackClaims.notAssessed : trackedClaim.status === "In Progress" ? (lang === "en" ? "In Progress" : lang === "si" ? "ක්‍රියාත්මක වෙමින්" : "செயல்பாட்டில்") : trackedClaim.status}</Text>
                </View>
              </View>
            </View>

            {/* Visual Wizard Tracker */}
            {renderClaimProgress(trackedClaim.status, trackedClaim.currentStep, trackedClaim.paymentReceipt)}

            {/* Details Card */}
            <View style={styles.detailsCard}>
              <View style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>{t.myClaims.vehicleId}</Text>
                <Text style={styles.detailsVal}>{formatNumberPlate(trackedClaim.vehiclePlate)}</Text>
              </View>
              <View style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>{t.myClaims.damageType}</Text>
                <Text style={styles.detailsVal}>{trackedClaim.damageType}</Text>
              </View>
              <View style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>{t.myClaims.incidentDate}</Text>
                <Text style={styles.detailsVal}>{trackedClaim.incidentDate}</Text>
              </View>
              {trackedClaim.incidentTime && (
                <View style={styles.detailsRow}>
                  <Text style={styles.detailsLabel}>{t.myClaims.incidentTime}</Text>
                  <Text style={styles.detailsVal}>{trackedClaim.incidentTime}</Text>
                </View>
              )}
              <View style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>{t.myClaims.assessment}</Text>
                <Text style={[styles.detailsVal, { color: "#16a34a", fontWeight: "800" }]}>{trackedClaim.amount === "Pending" ? (lang === "en" ? "Pending" : lang === "si" ? "ප්‍රතිචාර නොදැක්වූ" : "நிலுவையில்") : trackedClaim.amount}</Text>
              </View>
              <View style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>{lang === "en" ? "Assigned Officer" : lang === "si" ? "පවරා ඇති නියෝජිතයා" : "ஒதுக்கப்பட்ட முகவர்"}</Text>
                <Text style={styles.detailsVal}>{trackedClaim.officer === "Not Assigned" ? (lang === "en" ? "Not Assigned" : lang === "si" ? "පත් කර නැත" : "நியமிக்கப்படவில்லை") : trackedClaim.officer}</Text>
              </View>
              <View style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>{t.myClaims.branch}</Text>
                <Text style={styles.detailsVal}>{trackedClaim.branch ? (trackedClaim.branch.toLowerCase().includes("branch") ? trackedClaim.branch : trackedClaim.branch + " Branch") : "Galle Branch"}</Text>
              </View>
              {trackedClaim.location && (
                <View style={styles.detailsRowNoBorder}>
                  <Text style={styles.detailsLabel}>{t.myClaims.location}</Text>
                  <Text style={styles.detailsVal} numberOfLines={2}>{trackedClaim.location}</Text>
                </View>
              )}
            </View>

            {/* Other Vehicle Details Section */}
            {trackedClaim.otherVehicleDetails && (
               <View style={{ marginTop: 16, gap: 12 }}>
                 <Text style={[styles.sectionSubHeader, { paddingHorizontal: 4 }]}>{lang === "en" ? "Other Vehicles Involved" : lang === "si" ? "සම්බන්ධ අනෙක් වාහන" : "சம்பந்தப்பட்ட பிற வாகனங்கள்"}</Text>
                 {Array.isArray(trackedClaim.otherVehicleDetails) ? (
                   trackedClaim.otherVehicleDetails.length === 0 ? (
                     <View style={styles.detailsCard}>
                       <Text style={[styles.detailsVal, { fontStyle: "italic", color: "#64748b" }]}>{lang === "en" ? "No other vehicles involved." : lang === "si" ? "වෙනත් වාහන සම්බන්ධ වී නැත." : "பிற வாகனங்கள் எதுவும் ஈடுபடவில்லை."}</Text>
                     </View>
                   ) : (
                     trackedClaim.otherVehicleDetails.map((vehicle: any, vIdx: number) => (
                       <View key={vIdx} style={styles.detailsCard}>
                         <Text style={[styles.sectionSubHeader, { fontSize: 13, marginBottom: 8 }]}>{lang === "en" ? "Vehicle" : lang === "si" ? "වාහනය" : "வாகனம்"} #{vIdx + 1}</Text>
                         {vehicle.vehiclePlate ? (
                           <View style={styles.detailsRow}>
                             <Text style={styles.detailsLabel}>{t.myClaims.vehicleId}</Text>
                             <Text style={styles.detailsVal}>{formatNumberPlate(vehicle.vehiclePlate)}</Text>
                           </View>
                         ) : null}
                         {vehicle.driverName ? (
                           <View style={styles.detailsRow}>
                             <Text style={styles.detailsLabel}>{lang === "en" ? "Driver Name" : lang === "si" ? "රියදුරුගේ නම" : "ஓட்டுநர் பெயர்"}</Text>
                             <Text style={styles.detailsVal}>{vehicle.driverName}</Text>
                           </View>
                         ) : null}
                         {vehicle.insuranceCompany ? (
                           <View style={styles.detailsRow}>
                             <Text style={styles.detailsLabel}>{lang === "en" ? "Insurance Name" : lang === "si" ? "රක්ෂණ සමාගම" : "காப்பீட்டு நிறுவனம்"}</Text>
                             <Text style={styles.detailsVal}>{vehicle.insuranceCompany}</Text>
                           </View>
                         ) : null}
                         {vehicle.policyNumber ? (
                           <View style={styles.detailsRowNoBorder}>
                             <Text style={styles.detailsLabel}>{lang === "en" ? "Insurance Number" : lang === "si" ? "රක්ෂණ අංකය" : "பாலிசி எண்"}</Text>
                             <Text style={styles.detailsVal}>{vehicle.policyNumber}</Text>
                           </View>
                         ) : null}

                         {/* License Photos Grid */}
                         {vehicle.licensePhotos && vehicle.licensePhotos.length > 0 && (
                           <View style={{ marginTop: 12, borderTopWidth: 1, borderColor: "#f1f5f9", paddingTop: 10 }}>
                             <Text style={styles.photoSectionLabel}>{lang === "en" ? "Driver's License Photos" : lang === "si" ? "රියදුරු බලපත්‍ර ඡායාරූප" : "ஓட்டுநர் உரிம புகைப்படங்கள்"}</Text>
                             <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 6 }}>
                               {vehicle.licensePhotos.map((url: string, idx: number) => {
                                 let docUrl = url;
                                 if (docUrl && !docUrl.startsWith("http") && !docUrl.startsWith("data:")) {
                                   docUrl = `${API_BASE_URL.replace("/api", "")}/uploads/${docUrl}`;
                                 }
                                 return (
                                   <View key={idx} style={styles.modalPhotoWrapper}>
                                     <Image source={{ uri: docUrl }} style={styles.modalPhotoThumb} />
                                   </View>
                                 );
                               })}
                             </ScrollView>
                           </View>
                         )}

                         {/* Vehicle Damage / Scene Photos Grid */}
                         {vehicle.vehiclePhotos && vehicle.vehiclePhotos.length > 0 && (
                           <View style={{ marginTop: 12, borderTopWidth: 1, borderColor: "#f1f5f9", paddingTop: 10 }}>
                             <Text style={styles.photoSectionLabel}>{lang === "en" ? "Vehicle / Damage Photos" : lang === "si" ? "වාහන / හානි ඡායාරූප" : "வாகனம் / சேத புகைப்படங்கள்"}</Text>
                             <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 6 }}>
                               {vehicle.vehiclePhotos.map((url: string, idx: number) => {
                                 let docUrl = url;
                                 if (docUrl && !docUrl.startsWith("http") && !docUrl.startsWith("data:")) {
                                   docUrl = `${API_BASE_URL.replace("/api", "")}/uploads/${docUrl}`;
                                 }
                                 return (
                                   <View key={idx} style={styles.modalPhotoWrapper}>
                                     <Image source={{ uri: docUrl }} style={styles.modalPhotoThumb} />
                                   </View>
                                 );
                               })}
                             </ScrollView>
                           </View>
                         )}
                       </View>
                     ))
                   )
                 ) : (
                   (trackedClaim.otherVehicleDetails.vehiclePlate || trackedClaim.otherVehicleDetails.driverName) && (
                     <View style={styles.detailsCard}>
                       {trackedClaim.otherVehicleDetails.vehiclePlate ? (
                         <View style={styles.detailsRow}>
                           <Text style={styles.detailsLabel}>{t.myClaims.vehicleId}</Text>
                           <Text style={styles.detailsVal}>{formatNumberPlate(trackedClaim.otherVehicleDetails.vehiclePlate)}</Text>
                         </View>
                       ) : null}
                       {trackedClaim.otherVehicleDetails.driverName ? (
                         <View style={styles.detailsRow}>
                           <Text style={styles.detailsLabel}>{lang === "en" ? "Driver Name" : lang === "si" ? "රියදුරුගේ නම" : "ஓட்டுநர் பெயர்"}</Text>
                           <Text style={styles.detailsVal}>{trackedClaim.otherVehicleDetails.driverName}</Text>
                         </View>
                       ) : null}
                       {trackedClaim.otherVehicleDetails.insuranceCompany ? (
                         <View style={styles.detailsRow}>
                           <Text style={styles.detailsLabel}>{lang === "en" ? "Insurance Name" : lang === "si" ? "රක්ෂණ සමාගම" : "காப்பீட்டு நிறுவனம்"}</Text>
                           <Text style={styles.detailsVal}>{trackedClaim.otherVehicleDetails.insuranceCompany}</Text>
                         </View>
                       ) : null}
                       {trackedClaim.otherVehicleDetails.policyNumber ? (
                         <View style={styles.detailsRowNoBorder}>
                           <Text style={styles.detailsLabel}>{lang === "en" ? "Insurance Number" : lang === "si" ? "රක්ෂණ අංකය" : "பாலிசி எண்"}</Text>
                           <Text style={styles.detailsVal}>{trackedClaim.otherVehicleDetails.policyNumber}</Text>
                         </View>
                       ) : null}

                       {/* License Photos Grid */}
                       {trackedClaim.otherVehicleDetails.licensePhotos && trackedClaim.otherVehicleDetails.licensePhotos.length > 0 && (
                         <View style={{ marginTop: 12, borderTopWidth: 1, borderColor: "#f1f5f9", paddingTop: 10 }}>
                           <Text style={styles.photoSectionLabel}>{lang === "en" ? "Driver's License Photos" : lang === "si" ? "රියදුරු බලපත්‍ර ඡායාරූප" : "ஓட்டுநர் உரிம புகைப்படங்கள்"}</Text>
                           <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 6 }}>
                             {trackedClaim.otherVehicleDetails.licensePhotos.map((url: string, idx: number) => {
                               let docUrl = url;
                               if (docUrl && !docUrl.startsWith("http") && !docUrl.startsWith("data:")) {
                                 docUrl = `${API_BASE_URL.replace("/api", "")}/uploads/${docUrl}`;
                               }
                               return (
                                 <View key={idx} style={styles.modalPhotoWrapper}>
                                   <Image source={{ uri: docUrl }} style={styles.modalPhotoThumb} />
                                 </View>
                               );
                             })}
                           </ScrollView>
                         </View>
                       )}

                       {/* Vehicle Damage / Scene Photos Grid */}
                       {trackedClaim.otherVehicleDetails.vehiclePhotos && trackedClaim.otherVehicleDetails.vehiclePhotos.length > 0 && (
                         <View style={{ marginTop: 12, borderTopWidth: 1, borderColor: "#f1f5f9", paddingTop: 10 }}>
                           <Text style={styles.photoSectionLabel}>{lang === "en" ? "Vehicle / Damage Photos" : lang === "si" ? "වාහන / හානි ඡායාරූප" : "வாகனம் / சேத புகைப்படங்கள்"}</Text>
                           <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 6 }}>
                             {trackedClaim.otherVehicleDetails.vehiclePhotos.map((url: string, idx: number) => {
                               let docUrl = url;
                               if (docUrl && !docUrl.startsWith("http") && !docUrl.startsWith("data:")) {
                                 docUrl = `${API_BASE_URL.replace("/api", "")}/uploads/${docUrl}`;
                               }
                               return (
                                 <View key={idx} style={styles.modalPhotoWrapper}>
                                   <Image source={{ uri: docUrl }} style={styles.modalPhotoThumb} />
                                 </View>
                               );
                             })}
                           </ScrollView>
                         </View>
                       )}
                     </View>
                   )
                 )}
               </View>
             )}

            {/* Incident Description */}
            {trackedClaim.description && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionHeader}>{lang === "en" ? "Claim Description" : lang === "si" ? "හිමිකම් විස්තරය" : "கோரிக்கை விவரம்"}</Text>
                <Text style={styles.descriptionText}>"{trackedClaim.description}"</Text>
              </View>
            )}

            {/* Messages updates list */}
            <View style={styles.messagesSection}>
              <Text style={styles.messagesHeader}>{lang === "en" ? "Messages & Updates" : lang === "si" ? "පණිවිඩ සහ යාවත්කාලීන කිරීම්" : "செய்திகள் & புதுப்பிப்புகள்"}</Text>
              {(() => {
                const filteredMessages = (trackedClaim.messages || []).filter(msg => msg.recipient !== "Agent");
                if (filteredMessages.length > 0) {
                  return (
                    <View style={styles.messagesList}>
                      {filteredMessages.map((msg, i) => (
                        <View key={i} style={styles.messageBox}>
                          <View style={styles.messageSubHeader}>
                            <Text style={styles.messageSender}>{msg.sender}</Text>
                            <Text style={styles.messageTime}>{formatDateString(msg.sentAt)}</Text>
                          </View>
                          <Text style={styles.messageBody}>{msg.message}</Text>
                        </View>
                      ))}
                    </View>
                  );
                } else {
                  return (
                    <Text style={styles.noMessagesText}>{lang === "en" ? "No notifications or messages have been sent for this claim." : lang === "si" ? "මෙම හිමිකම් පෑම සඳහා දැනුම්දීම් හෝ පණිවිඩ කිසිවක් යවා නොමැත." : "இந்த கோரிக்கைக்கு அறிவிப்புகள் அல்லது செய்திகள் எதுவும் அனுப்பப்படவில்லை."}</Text>
                  );
                }
              })()}
            </View>

            {/* Documents requested Warning alert */}
            {trackedClaim.documentsRequested && getUserRequestedDocs(trackedClaim).length > 0 && (
              <View style={[styles.docRequestAlert, { marginTop: 12 }]}>
                <View style={styles.docAlertTitleRow}>
                  <Ionicons name="alert-circle" size={18} color="#dc2626" />
                  <Text style={styles.docAlertTitle}>{t.myClaims.documentsNeeded}</Text>
                </View>
                <Text style={styles.docAlertDesc}>
                  {t.myClaims.documentsNeededDesc}
                </Text>
                <View style={styles.docItems}>
                  {getUserRequestedDocs(trackedClaim).map((doc, i) => (
                    <View key={i} style={styles.docDotItem}>
                      <View style={styles.bulletDot} />
                      <Text style={styles.docDotText}>{doc}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.uploadDocBtn}
                  onPress={() => {
                    Alert.alert(
                      lang === "en" ? "Submit Documents" : lang === "si" ? "ලේඛන ඉදිරිපත් කරන්න" : "ஆவணங்களை சமர்ப்பிக்கவும்",
                      lang === "en"
                        ? "Please contact your assigned agent Saman at +94 112 003 000 or email files to claims-support@sanasa.lk."
                        : lang === "si"
                          ? "කරුණාකර ඔබගේ නියෝජිත සමන් දුරකථන අංක +94 112 003 000 හරහා සම්බන්ධ කරගන්න හෝ claims-support@sanasa.lk වෙත විද්‍යුත් තැපෑලක් එවන්න."
                          : "உங்கள் நியமிக்கப்பட்ட முகவர் சமனை +94 112 003 000 இல் தொடர்பு கொள்ளவும் அல்லது claims-support@sanasa.lk க்கு மின்னஞ்சல் செய்யவும்."
                    );
                  }}
                >
                  <Text style={styles.uploadDocBtnText}>{lang === "en" ? "Contact Agent to Submit" : lang === "si" ? "ඉදිරිපත් කිරීමට නියෝජිතයා අමතන්න" : "சமர்ப்பிக்க முகவரைத் தொடர்பு கொள்ளவும்"}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : searchAttempted ? (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={40} color="#dc2626" />
            <Text style={styles.errorText}>{lang === "en" ? `No claim found with ID "${claimId.trim().toUpperCase()}"` : lang === "si" ? `"${claimId.trim().toUpperCase()}" අංකයෙන් හිමිකම් පෑමක් හමු නොවීය` : `அடையாள எண் "${claimId.trim().toUpperCase()}" இல் கோரிக்கை எதுவும் இல்லை`}</Text>
            <Text style={styles.errorDesc}>{lang === "en" ? "Please double check your reference number and try again." : lang === "si" ? "කරුණාකර ඔබගේ අංකය නැවත පරීක්ෂා කර බලන්න." : "உங்கள் குறிப்பு எண்ணை மீண்டும் சரிபார்த்து முயற்சிக்கவும்."}</Text>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={60} color="#cbd5e1" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyText}>{lang === "en" ? "Enter your Claim ID in the search bar above to track your claim's status." : lang === "si" ? "ඔබගේ හිමිකම් පෑමේ තත්ත්වය සොයා බැලීම සඳහා ඉහත සෙවුම් තීරුවේ හිමිකම් අංකය ඇතුළත් කරන්න." : "உங்கள் கோரிக்கையின் நிலையைக் கண்காணிக்க மேலே உள்ள தேடல் பட்டியில் கோரிக்கை அடையாள எண்ணை உள்ளிடவும்."}</Text>
          </View>
        )}
      </ScrollView>

      <PolicyHolderNavbar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8fafc" },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 110 },
  loadingWrap: { paddingVertical: 40, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 13, color: "#64748b", fontWeight: "600", marginTop: 10 },

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

  /* Search tracking bar */
  trackBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginTop: -22,
    marginBottom: 16,
    borderRadius: 99,
    paddingLeft: 20,
    paddingRight: 6,
    paddingVertical: 6,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    zIndex: 10,
  },
  trackInput: { flex: 1, color: "#0f172a", fontSize: 13.5, fontWeight: "800", textTransform: "uppercase" },
  trackBtn: {
    backgroundColor: "#0d2a3a",
    borderRadius: 99,
    paddingVertical: 10,
    paddingHorizontal: 22,
  },
  trackBtnText: { color: "#ffffff", fontSize: 12.5, fontWeight: "800" },

  /* Results styling */
  resultsContainer: { marginTop: 8 },
  claimSummaryCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.01,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeaderTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  cardHeaderSub: { fontSize: 11.5, color: "#64748b", fontWeight: "700", marginTop: 2 },
  badgeWrap: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeLabel: { fontSize: 10.5, color: "#2563eb", fontWeight: "800" },

  /* Wizard progress tracker inside Modal */
  wizardContainer: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 20,
    paddingTop: 18,
    paddingBottom: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    position: "relative",
    width: "100%",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.01,
    shadowRadius: 4,
    elevation: 1,
  },
  wizardBgLine: {
    position: "absolute",
    top: 32,
    left: 28,
    right: 28,
    height: 3,
    backgroundColor: "#e2e8f0",
  },
  wizardProgressLine: {
    position: "absolute",
    top: 32,
    left: 28,
    height: 3,
    backgroundColor: "#00b050",
  },
  wizardStepsRow: { flexDirection: "row", justifyContent: "space-between" },
  stepItem: { flex: 1, alignItems: "center" },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  stepCircleInactive: { borderColor: "#cbd5e1" },
  stepCircleCompleted: { borderColor: "#00b050" },
  stepCircleActive: { borderColor: "#2563eb", backgroundColor: "#eff6ff" },
  stepNumber: { fontSize: 10.5, fontWeight: "800", color: "#64748b" },
  stepLabel: { fontSize: 9.5, fontWeight: "700", marginTop: 6 },
  stepTextInactive: { color: "#94a3b8" },
  stepTextCompleted: { color: "#475569" },
  stepTextActive: { color: "#2563eb", fontWeight: "800" },

  /* Details Card */
  detailsCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 16,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.01,
    shadowRadius: 4,
    elevation: 1,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#f1f5f9",
  },
  detailsRowNoBorder: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  detailsLabel: { fontSize: 13, color: "#64748b", fontWeight: "600" },
  detailsVal: { fontSize: 13, color: "#0f172a", fontWeight: "800", maxWidth: SCREEN_W * 0.5, textAlign: "right" },

  /* Description Card */
  descriptionContainer: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.01,
    shadowRadius: 4,
    elevation: 1,
  },
  descriptionHeader: { fontSize: 11, color: "#64748b", fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 6 },
  descriptionText: { fontSize: 13, color: "#475569", fontWeight: "600", fontStyle: "italic", lineHeight: 18 },

  /* Doc request Alert Box */
  docRequestAlert: {
    backgroundColor: "rgba(254, 242, 242, 0.8)",
    borderWidth: 1.5,
    borderColor: "#fecaca",
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  docAlertTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  docAlertTitle: { fontSize: 13.5, fontWeight: "800", color: "#991b1b" },
  docAlertDesc: { fontSize: 12.5, color: "#b91c1c", fontWeight: "600", lineHeight: 17, marginBottom: 10 },
  docItems: { gap: 6, marginBottom: 12 },
  docDotItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  bulletDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#dc2626" },
  docDotText: { fontSize: 12, color: "#b91c1c", fontWeight: "800" },
  uploadDocBtn: {
    backgroundColor: "#dc2626",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadDocBtnText: { fontSize: 12, color: "#ffffff", fontWeight: "800" },

  /* Messages updates list */
  messagesSection: { marginBottom: 20 },
  messagesHeader: { fontSize: 11, color: "#64748b", fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 10 },
  messagesList: { gap: 8 },
  messageBox: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 12,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.01,
    shadowRadius: 4,
    elevation: 1,
  },
  messageSubHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  messageSender: { fontSize: 11.5, fontWeight: "800", color: "#0f172a" },
  messageTime: { fontSize: 10, color: "#94a3b8", fontWeight: "600" },
  messageBody: { fontSize: 12, color: "#475569", fontWeight: "600", lineHeight: 17 },
  noMessagesText: { fontSize: 12, color: "#94a3b8", fontWeight: "600", fontStyle: "italic" },

  /* Error state */
  errorContainer: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    marginTop: 20,
    gap: 8,
  },
  errorText: { fontSize: 15, fontWeight: "800", color: "#b91c1c", textAlign: "center" },
  errorDesc: { fontSize: 12.5, color: "#7f1d1d", fontWeight: "600", textAlign: "center" },

  /* Empty State placeholder */
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 56,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 19,
  },
  sectionSubHeader: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  photoSectionLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  modalPhotoWrapper: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  modalPhotoThumb: {
    width: "100%",
    height: "100%",
  },
});
