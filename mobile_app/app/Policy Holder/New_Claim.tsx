import React, { useState, useEffect, useRef } from "react";
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
  Modal,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import PolicyHolderNavbar from "../Components/PolicyHolder/page";
import { API_BASE_URL } from "../config";
import { compressImageMobile } from "../../utils/imageCompressor";
import MapDisplay from "../Components/PolicyHolder/MapDisplay";
import MapSelectorModal from "../Components/PolicyHolder/MapSelectorModal";
import DateTimePicker from "@react-native-community/datetimepicker";

const { width: SCREEN_W } = Dimensions.get("window");

interface Vehicle {
  numberPlate: string;
  vehicleType: string;
  year: string | number;
  company: string;
  model: string;
}

interface PhotoState {
  uri: string;
  base64: string;
}

/**
 * FileNewClaim Screen (Policy Holder)
 * A multi-step form wizard layout that guides the policy holder to select a vehicle, input incident info,
 * pin coordinates location (with autocomplete address search & GPS capability), and upload compressed license / accident photographs.
 */
export default function FileNewClaim() {
  // --- Profile & Vehicle Context ---
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [userNic, setUserNic] = useState("");

  // --- Wizard Form Navigation ---
  const [currentStep, setCurrentStep] = useState(1);

  // --- Step 1: Incident Specifications & Coordinate Pin ---
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [incidentDate, setIncidentDate] = useState("");
  const [incidentTime, setIncidentTime] = useState("");
  const [damageType, setDamageType] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState(6.9271);
  const [longitude, setLongitude] = useState(79.8612);

  // --- Location Autocomplete Suggestion Controllers ---
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResultsDropdown, setShowResultsDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const isRestored = useRef(false);

  // --- Operations Loading States ---
  const [isVehiclesLoading, setIsVehiclesLoading] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Modals Display Flags ---
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [generatedClaimNumber, setGeneratedClaimNumber] = useState("");
  const [showMapModal, setShowMapModal] = useState(false);

  // Custom Selection Modals & DateTime Picker Flags
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [showDamageDropdown, setShowDamageDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date | null>(null);
  const [tempTime, setTempTime] = useState<Date | null>(null);

  // --- Step 2: Photo Attachment Storage ---
  const [accidentFront, setAccidentFront] = useState<PhotoState | null>(null);
  const [accidentRear, setAccidentRear] = useState<PhotoState | null>(null);
  const [accidentSide, setAccidentSide] = useState<PhotoState | null>(null);
  const [licenseFront, setLicenseFront] = useState<PhotoState | null>(null);
  const [licenseRear, setLicenseRear] = useState<PhotoState | null>(null);

  // --- Constant Data Configurations ---
  const damageTypes = [
    "Front Bumper / Grille Damage",
    "Rear Bumper Damage",
    "Side Scratch / Dent (Left/Right)",
    "Windshield / Glass Crack",
    "Engine / Mechanical Failure",
    "Suspension Damage",
    "Total Loss / Rollover",
    "Other Accident Damage"
  ];

  // --- Lifecycle Effects ---

  // Load user context and draft on mounting
  useEffect(() => {
    (async () => {
      // 1. Load user context
      const userStr = await AsyncStorage.getItem("logged_in_user");
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.nic) {
            setUserNic(user.nic);
            loadVehicles(user.nic, user.vehicles);
          }
        } catch (e) {
          console.error(e);
        }
      }

      // 2. Load draft details
      try {
        const draftStr = await AsyncStorage.getItem("current_claim_draft");
        if (draftStr) {
          const draft = JSON.parse(draftStr);
          if (draft.selectedVehicle) setSelectedVehicle(draft.selectedVehicle);
          if (draft.incidentDate) setIncidentDate(draft.incidentDate);
          if (draft.incidentTime) setIncidentTime(draft.incidentTime);
          if (draft.damageType) setDamageType(draft.damageType);
          if (draft.description) setDescription(draft.description);
          if (draft.address) setAddress(draft.address);
          if (draft.latitude) setLatitude(draft.latitude);
          if (draft.longitude) setLongitude(draft.longitude);
        }
      } catch (err) {
        console.error("Error restoring draft", err);
      } finally {
        isRestored.current = true;
      }
    })();
  }, []);

  // Save draft whenever form fields change
  useEffect(() => {
    if (!isRestored.current || !userNic) return;
    (async () => {
      const draft = {
        selectedVehicle,
        incidentDate,
        incidentTime,
        damageType,
        description,
        address,
        latitude,
        longitude
      };
      await AsyncStorage.setItem("current_claim_draft", JSON.stringify(draft));
    })();
  }, [selectedVehicle, incidentDate, incidentTime, damageType, description, address, latitude, longitude, userNic]);

  // Autocomplete suggestions debouncer for main page
  useEffect(() => {
    if (!isUserTyping || !address || address.trim() === "" || address === "Colombo, Sri Lanka" || address.startsWith("Loading")) {
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=15&countrycodes=lk&accept-language=en`, {
          headers: {
            "User-Agent": "SanasaInsuranceMobileApp/1.0 (contact: support@sanasainsurance.lk)"
          }
        });
        const data = await res.json();
        if (data && data.length > 0) {
          setSearchResults(data);
          setShowResultsDropdown(true);
        } else {
          setSearchResults([]);
          setShowResultsDropdown(false);
        }
      } catch (err) {
        console.warn("Autocomplete error:", err);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [address, isUserTyping]);

  // --- Data Loading & Geocoding Methods ---

  const loadVehicles = async (nic: string, fallbackVehicles: Vehicle[]) => {
    setIsVehiclesLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/policy-holder/vehicles?nic=${nic}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.vehicles) && data.vehicles.length > 0) {
          setVehicles(data.vehicles);
          setIsVehiclesLoading(false);
          return;
        }
      }
      if (Array.isArray(fallbackVehicles) && fallbackVehicles.length > 0) {
        setVehicles(fallbackVehicles);
      }
    } catch (e) {
      console.warn("API load vehicles failed, using fallback:", e);
      if (Array.isArray(fallbackVehicles) && fallbackVehicles.length > 0) {
        setVehicles(fallbackVehicles);
      }
    } finally {
      setIsVehiclesLoading(false);
    }
  };

  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      let fullAddress = "";
      
      try {
        const addressArray = await Location.reverseGeocodeAsync({
          latitude: lat,
          longitude: lon
        });

        if (addressArray && addressArray.length > 0) {
          const item = addressArray[0];
          const name = item.name || "";
          const street = item.street || "";
          const subregion = item.subregion || "";
          const city = item.city || "";
          const district = item.district || "";
          const region = item.region || "";
          const country = item.country || "";
          
          let parts = [];
          if (name && name !== street) parts.push(name);
          if (street) parts.push(street);
          if (subregion) parts.push(subregion);
          if (city) parts.push(city);
          if (district) parts.push(district);
          if (region) parts.push(region);
          if (country) parts.push(country);
          
          const uniqueParts = [...new Set(parts.map(p => p.trim()))].filter(p => p.length > 0);
          fullAddress = uniqueParts.join(", ");
        }
      } catch (locErr) {
        console.warn("Native reverse geocoding failed, trying Nominatim fallback...", locErr);
      }

      const isNumbersOnly = /^\d+[\s,.\d-]*$/.test(fullAddress.trim());
      if (!fullAddress || isNumbersOnly) {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=en`, {
          headers: {
            "User-Agent": "SanasaInsuranceMobileApp/1.0 (contact: support@sanasainsurance.lk)"
          }
        });
        const data = await res.json();
        if (data && data.display_name) {
          fullAddress = data.display_name;
        }
      }

      setAddress(fullAddress || `${lat.toFixed(6)}, ${lon.toFixed(6)}`);
    } catch (e) {
      console.warn("Reverse geocoding error:", e);
      setAddress(`${lat.toFixed(6)}, ${lon.toFixed(6)}`);
    }
  };

  const handleSelectSuggestion = (result: any) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    setIsUserTyping(false);
    setLatitude(lat);
    setLongitude(lon);
    setAddress(result.display_name);
    setShowResultsDropdown(false);
    setSearchResults([]);
  };

  const geocodeAddress = async (addrStr: string) => {
    if (!addrStr || addrStr.trim() === "") return;
    setIsUserTyping(false);
    setShowResultsDropdown(false);
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addrStr)}&limit=15&countrycodes=lk&accept-language=en`, {
        headers: {
          "User-Agent": "SanasaInsuranceMobileApp/1.0 (contact: support@sanasainsurance.lk)"
        }
      });
      const data = await res.json();
      if (data && data.length > 0) {
        setSearchResults(data);
        setShowResultsDropdown(true);
        
        // Auto-select the first result
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setLatitude(lat);
        setLongitude(lon);
        setAddress(data[0].display_name);
        setShowResultsDropdown(false);
      } else {
        setSearchResults([]);
        setShowResultsDropdown(false);
        Alert.alert("Location Not Found", "Could not find coordinates for this address.");
      }
    } catch (e) {
      console.warn("Geocoding error:", e);
      Alert.alert("Search Error", "An error occurred while searching for the location.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleLocationSelect = async (lat: number, lon: number) => {
    setLatitude(lat);
    setLongitude(lon);
    await reverseGeocode(lat, lon);
  };

  const handleGPSLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Please enable location permissions in your app settings to retrieve your coordinates.");
        setIsLocating(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude: lat, longitude: lon } = location.coords;
      setLatitude(lat);
      setLongitude(lon);
      
      await reverseGeocode(lat, lon);
    } catch (e) {
      console.error("GPS retrieval error:", e);
      Alert.alert("Error", "Could not retrieve your current location. Please verify that your device GPS is turned on and try again.");
    } finally {
      setIsLocating(false);
    }
  };

  const selectPhoto = async (stateSetter: React.Dispatch<React.SetStateAction<PhotoState | null>>) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow photo access to upload files.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      try {
        const asset = result.assets[0];
        const base64Data = await compressImageMobile(asset.uri);
        stateSetter({
          uri: asset.uri,
          base64: base64Data
        });
      } catch (err) {
        Alert.alert("Error", "Failed to compress selected image.");
      }
    }
  };

  const removePhoto = (stateSetter: React.Dispatch<React.SetStateAction<PhotoState | null>>) => {
    stateSetter(null);
  };

  const handleNextStep = () => {
    if (!selectedVehicle || !incidentDate || !incidentTime || !damageType || !description || !address) {
      Alert.alert("Required Fields", "Please fill in all incident details before proceeding.");
      return;
    }
    setCurrentStep(2);
  };

  const handleSubmit = async () => {
    if (!accidentFront && !accidentRear && !accidentSide) {
      Alert.alert("Accident Photos Required", "Please upload at least one accident photo (Front, Rear, or Side).");
      return;
    }
    if (!licenseFront && !licenseRear) {
      Alert.alert("Driving License Required", "Please upload at least one Driving License photo.");
      return;
    }

    setIsSubmitting(true);

    const claimData = {
      userNic,
      vehiclePlate: selectedVehicle,
      incidentDate,
      incidentTime,
      damageType,
      description,
      location: address,
      accidentPhotos: {
        front: accidentFront ? [accidentFront.base64] : [],
        rear: accidentRear ? [accidentRear.base64] : [],
        side: accidentSide ? [accidentSide.base64] : []
      },
      drivingLicense: {
        front: licenseFront ? [licenseFront.base64] : [],
        rear: licenseRear ? [licenseRear.base64] : []
      }
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/policy-holder/new-claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(claimData)
      });
      const data = await response.json();
      if (!response.ok) {
        Alert.alert("Submission Failed", data.error || "Failed to submit claim.");
        setIsSubmitting(false);
        return;
      }

      // Save local reference for dashboard
      await AsyncStorage.setItem("last_submitted_claim", JSON.stringify({
        ...claimData,
        claimNumber: data.claimNumber,
        status: "Submitted",
        createdAt: new Date().toISOString()
      }));

      // Clear the current claim draft
      await AsyncStorage.removeItem("current_claim_draft");

      setGeneratedClaimNumber(data.claimNumber);
      setShowSuccessModal(true);
    } catch (err) {
      console.error("Submit claim error:", err);
      Alert.alert("Network Error", "Unable to connect to the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
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

  const renderUploadBox = (label: string, photo: PhotoState | null, stateSetter: React.Dispatch<React.SetStateAction<PhotoState | null>>) => {
    return (
      <View style={styles.uploadBoxContainer}>
        <Text style={styles.uploadLabel}>{label}</Text>
        {photo ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: photo.uri }} style={styles.previewImage} />
            <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => removePhoto(stateSetter)}>
              <Ionicons name="trash" size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.placeholderBox} onPress={() => selectPhoto(stateSetter)}>
            <Ionicons name="camera" size={32} color="#94a3b8" />
            <Text style={styles.placeholderTitle}>Select Image</Text>
            <Text style={styles.placeholderDesc}>JPG, PNG up to 5MB</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const onChangeDate = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDate.getDate()).padStart(2, "0");
      setIncidentDate(`${year}-${month}-${day}`);
    }
  };

  const onChangeTime = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === "ios");
    if (selectedTime) {
      let hours = selectedTime.getHours();
      const minutes = String(selectedTime.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      setIncidentTime(`${hours}:${minutes} ${ampm}`);
    }
  };

  const getVehicleIcon = (type: string): any => {
    const t = (type || "").toLowerCase();
    if (t.includes("bike") || t.includes("motorcycle") || t.includes("scooter")) return "bicycle-outline";
    if (t.includes("van") || t.includes("minibus") || t.includes("bus")) return "bus-outline";
    return "car-outline";
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Styled curved header matching the dashboard */}
      <ImageBackground
        source={require("../../assets/images/newclaim1.webp")}
        style={styles.headerBackground}
        imageStyle={styles.headerImageStyle}
      >
        <LinearGradient
          colors={["rgba(13, 42, 58, 0.95)", "rgba(13, 42, 58, 0.82)", "rgba(15, 23, 42, 0.5)"]}
          style={styles.headerGradient}
        >
          <Text style={styles.headerTitle}>New Claim</Text>
          <Text style={styles.headerSubtitle}>
            {currentStep === 1 ? "Step 1 of 2: Incident Details" : "Step 2 of 2: Upload Files"}
          </Text>
        </LinearGradient>
      </ImageBackground>

      {/* Page Body Form */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {currentStep === 1 ? (
          /* STEP 1: Details form */
          <View style={styles.formContainer}>
            <Text style={styles.sectionHeader}>Incident & Vehicle Details</Text>

            {/* Select Vehicle */}
            <View style={[styles.inputGroup, { zIndex: showVehicleDropdown ? 100 : 5, elevation: showVehicleDropdown ? 100 : 5 }]}>
              <Text style={styles.fieldLabel}>Select Vehicle *</Text>
              {isVehiclesLoading ? (
                <ActivityIndicator size="small" color="#0284c7" />
              ) : (
                <View style={{ zIndex: showVehicleDropdown ? 100 : 5 }}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[styles.selectorField, showVehicleDropdown && styles.selectorFieldOpen]}
                    onPress={() => {
                      setShowVehicleDropdown(!showVehicleDropdown);
                      setShowDamageDropdown(false);
                    }}
                  >
                    <Text style={selectedVehicle ? styles.selectorFieldText : styles.selectorFieldPlaceholder}>
                      {selectedVehicle ? (
                        (() => {
                          const v = vehicles.find((item) => item.numberPlate === selectedVehicle);
                          return v 
                            ? `${formatNumberPlate(v.numberPlate)} - ${v.company} ${v.model}` 
                            : formatNumberPlate(selectedVehicle);
                        })()
                      ) : (
                        "Select Vehicle"
                      )}
                    </Text>
                    <Ionicons name={showVehicleDropdown ? "chevron-up" : "chevron-down"} size={18} color="#64748b" />
                  </TouchableOpacity>

                  {showVehicleDropdown && (
                    <View style={styles.dropdownCard}>
                      <ScrollView style={{ maxHeight: 220 }} keyboardShouldPersistTaps="handled">
                        {vehicles.map((v) => {
                          const isSelected = selectedVehicle === v.numberPlate;
                          return (
                            <TouchableOpacity
                              key={v.numberPlate}
                              style={[styles.dropdownOptionItem, isSelected && styles.dropdownOptionItemActive]}
                              onPress={() => {
                                setSelectedVehicle(v.numberPlate);
                                setShowVehicleDropdown(false);
                              }}
                            >
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                                <Ionicons name={getVehicleIcon(v.vehicleType)} size={18} color={isSelected ? "#0284c7" : "#64748b"} />
                                <View>
                                  <Text style={[styles.dropdownOptionText, isSelected && styles.dropdownOptionTextActive]}>
                                    {v.company} {v.model}
                                  </Text>
                                  <Text style={{ fontSize: 10, color: "#94a3b8", fontWeight: "600" }}>
                                    {formatNumberPlate(v.numberPlate)} · {v.year}
                                  </Text>
                                </View>
                              </View>
                              {isSelected && <Ionicons name="checkmark" size={16} color="#0284c7" />}
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Date and Time row */}
            <View style={[styles.rowInputs, { zIndex: 4, elevation: 4 }]}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Incident Date *</Text>
                {Platform.OS === "web" ? (
                  <input
                    type="date"
                    value={incidentDate}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setIncidentDate(e.target.value)}
                    style={{
                      height: 48,
                      backgroundColor: "#ffffff",
                      borderWidth: 1.5,
                      borderColor: "#e2e8f0",
                      borderRadius: 16,
                      paddingHorizontal: 16,
                      width: "100%",
                      boxSizing: "border-box",
                      fontSize: 14,
                      color: "#0f172a",
                      fontWeight: "600",
                    } as any}
                  />
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.selectorField}
                    onPress={() => {
                      setTempDate(incidentDate ? new Date(incidentDate) : new Date());
                      setShowDatePicker(true);
                    }}
                  >
                    <Text style={incidentDate ? styles.selectorFieldText : styles.selectorFieldPlaceholder}>
                      {incidentDate || "Select Date"}
                    </Text>
                    <Ionicons name="calendar-outline" size={18} color="#64748b" />
                  </TouchableOpacity>
                )}
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Incident Time *</Text>
                {Platform.OS === "web" ? (
                  <input
                    type="time"
                    value={incidentTime}
                    onChange={(e) => setIncidentTime(e.target.value)}
                    style={{
                      height: 48,
                      backgroundColor: "#ffffff",
                      borderWidth: 1.5,
                      borderColor: "#e2e8f0",
                      borderRadius: 16,
                      paddingHorizontal: 16,
                      width: "100%",
                      boxSizing: "border-box",
                      fontSize: 14,
                      color: "#0f172a",
                      fontWeight: "600",
                    } as any}
                  />
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.selectorField}
                    onPress={() => {
                      setTempTime(new Date());
                      setShowTimePicker(true);
                    }}
                  >
                    <Text style={incidentTime ? styles.selectorFieldText : styles.selectorFieldPlaceholder}>
                      {incidentTime || "Select Time"}
                    </Text>
                    <Ionicons name="time-outline" size={18} color="#64748b" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Damage Type */}
            <View style={[styles.inputGroup, { zIndex: showDamageDropdown ? 100 : 3, elevation: showDamageDropdown ? 100 : 3 }]}>
              <Text style={styles.fieldLabel}>Damage Type *</Text>
              <View style={{ zIndex: showDamageDropdown ? 100 : 3 }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.selectorField, showDamageDropdown && styles.selectorFieldOpen]}
                  onPress={() => {
                    setShowDamageDropdown(!showDamageDropdown);
                    setShowVehicleDropdown(false);
                  }}
                >
                  <Text style={damageType ? styles.selectorFieldText : styles.selectorFieldPlaceholder}>
                    {damageType || "Select Damage Type"}
                  </Text>
                  <Ionicons name={showDamageDropdown ? "chevron-up" : "chevron-down"} size={18} color="#64748b" />
                </TouchableOpacity>

                {showDamageDropdown && (
                  <View style={styles.dropdownCard}>
                    <ScrollView style={{ maxHeight: 220 }} keyboardShouldPersistTaps="handled">
                      {damageTypes.map((t) => {
                        const isSelected = damageType === t;
                        return (
                          <TouchableOpacity
                            key={t}
                            style={[styles.dropdownOptionItem, isSelected && styles.dropdownOptionItemActive]}
                            onPress={() => {
                              setDamageType(t);
                              setShowDamageDropdown(false);
                            }}
                          >
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                              <Ionicons name="build-outline" size={16} color={isSelected ? "#dc2626" : "#64748b"} />
                              <Text style={[styles.dropdownOptionText, isSelected && styles.dropdownOptionTextActive, { fontSize: 13, flex: 1 }]}>
                                {t}
                              </Text>
                            </View>
                            {isSelected && <Ionicons name="checkmark" size={16} color="#0284c7" />}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>

            {/* Description Textarea */}
            <View style={[styles.inputGroup, { zIndex: 2, elevation: 2 }]}>
              <Text style={styles.fieldLabel}>Incident Description *</Text>
              <TextInput
                placeholder="Briefly describe what happened..."
                placeholderTextColor="#94a3b8"
                multiline={true}
                numberOfLines={4}
                value={description}
                onChangeText={setDescription}
                style={[styles.textInput, styles.textareaInput]}
              />
            </View>

            {/* Address */}
            <View style={[styles.inputGroup, { zIndex: showResultsDropdown ? 100 : 1, elevation: showResultsDropdown ? 100 : 1 }]}>
              <Text style={styles.fieldLabel}>Enter Address or Land Mark *</Text>
              
              <View style={styles.searchBarContainer}>
                <View style={styles.searchInputWrapper}>
                  <Ionicons name="search" size={18} color="#94a3b8" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    value={address}
                    onChangeText={(text) => {
                      setAddress(text);
                      setIsUserTyping(true);
                      if (!text) {
                        setSearchResults([]);
                        setShowResultsDropdown(false);
                      }
                    }}
                    onSubmitEditing={() => geocodeAddress(address)}
                    placeholder="Where did the incident occur?"
                    placeholderTextColor="#94a3b8"
                    returnKeyType="search"
                  />
                  {address ? (
                    <TouchableOpacity onPress={() => {
                      setAddress("");
                      setSearchResults([]);
                      setShowResultsDropdown(false);
                      setIsUserTyping(false);
                    }} style={styles.clearSearchBtn}>
                      <Ionicons name="close-circle" size={18} color="#94a3b8" />
                    </TouchableOpacity>
                  ) : null}
                </View>
                <TouchableOpacity style={styles.searchBtn} onPress={() => geocodeAddress(address)} disabled={isSearching}>
                  {isSearching ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Ionicons name="search" size={18} color="#ffffff" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Suggestions Dropdown */}
              {showResultsDropdown && searchResults.length > 0 && (
                <View style={styles.suggestionsWrapper}>
                  <ScrollView style={styles.suggestionsContainer} keyboardShouldPersistTaps="handled">
                    {searchResults.map((result, idx) => {
                      const parts = result.display_name.split(",");
                      const mainTitle = parts[0]?.trim() || "";
                      const subTitle = parts.slice(1).join(",").trim() || "";
                      return (
                        <TouchableOpacity
                          key={idx}
                          style={styles.suggestionItem}
                          onPress={() => handleSelectSuggestion(result)}
                        >
                          <View style={styles.suggestionIconWrapper}>
                            <Ionicons name="location" size={16} color="#64748b" />
                          </View>
                          <View style={{ flex: 1, flexDirection: "column" }}>
                            <Text numberOfLines={1} style={styles.suggestionTitle}>
                              {mainTitle}
                            </Text>
                            {subTitle ? (
                              <Text numberOfLines={1} style={styles.suggestionSubtitle}>
                                {subTitle}
                              </Text>
                            ) : null}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              <MapDisplay
                latitude={latitude}
                longitude={longitude}
                onLocationSelect={handleLocationSelect}
              />
            </View>

            {/* GPS and Map select buttons */}
            <View style={styles.locationButtonsRow}>
              <TouchableOpacity
                style={[styles.locationBtnGps, { flex: 1 }]}
                onPress={handleGPSLocation}
                disabled={isLocating}
                activeOpacity={0.8}
              >
                {isLocating ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="location" size={16} color="#ffffff" />
                )}
                <Text style={styles.locationBtnTextGps}>
                  {isLocating ? "Locating..." : "Use GPS"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.locationBtnMap, { flex: 1 }]}
                onPress={() => setShowMapModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="map" size={16} color="#ffffff" />
                <Text style={styles.locationBtnTextMap}>Select on Map</Text>
              </TouchableOpacity>
            </View>

            <MapSelectorModal
              visible={showMapModal}
              onClose={() => setShowMapModal(false)}
              latitude={latitude}
              longitude={longitude}
              onLocationSelect={handleLocationSelect}
            />

            {/* Action Row */}
            <View style={styles.actionsRow}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={async () => {
                  await AsyncStorage.removeItem("current_claim_draft");
                  router.push("/Policy Holder/page");
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleNextStep}>
                <Text style={styles.primaryBtnText}>Next Step</Text>
                <Ionicons name="arrow-forward" size={16} color="#ffffff" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* STEP 2: Photo uploads */
          <View style={styles.formContainer}>
            <Text style={styles.sectionHeader}>Accident Photos *</Text>
            <View style={styles.photosGrid}>
              {renderUploadBox("Front Damage", accidentFront, setAccidentFront)}
              {renderUploadBox("Rear Damage", accidentRear, setAccidentRear)}
              {renderUploadBox("Side Damage", accidentSide, setAccidentSide)}
            </View>

            <Text style={[styles.sectionHeader, { marginTop: 14 }]}>Driving License *</Text>
            <View style={styles.photosGrid}>
              {renderUploadBox("License Front", licenseFront, setLicenseFront)}
              {renderUploadBox("License Rear", licenseRear, setLicenseRear)}
            </View>

            {/* Submit Action Row */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setCurrentStep(1)}
                disabled={isSubmitting}
              >
                <Ionicons name="arrow-back" size={16} color="#475569" style={{ marginRight: 6 }} />
                <Text style={styles.cancelBtnText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, isSubmitting && { backgroundColor: "#93c5fd" }]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Submit Claim</Text>
                    <Ionicons name="shield-checkmark" size={16} color="#ffffff" style={{ marginLeft: 6 }} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successCard}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={42} color="#ffffff" />
            </View>

            <Text style={styles.successTitle}>Thank You.</Text>
            <Text style={styles.successSubtitle}>Application Submitted!</Text>

            <View style={styles.refPill}>
              <Text style={styles.refText}>{generatedClaimNumber}</Text>
            </View>

            <Text style={styles.successDesc}>
              Your insurance application has been received. Our office staff will review your documents.
            </Text>

            <TouchableOpacity
              style={styles.returnBtn}
              onPress={() => {
                setShowSuccessModal(false);
                router.replace("/Policy Holder/page");
              }}
            >
              <Ionicons name="home" size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.returnBtnText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Date Picker Modal for iOS */}
      {Platform.OS === "ios" && (
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <TouchableOpacity 
            style={styles.pickerModalOverlay} 
            activeOpacity={1}
            onPress={() => setShowDatePicker(false)}
          >
            <View style={styles.pickerModalCard}>
              <Text style={styles.pickerModalTitle}>Select Incident Date</Text>
              
              <View style={styles.pickerWrapper}>
                <DateTimePicker
                  value={tempDate || new Date()}
                  mode="date"
                  display="inline"
                  onChange={(event, date) => {
                    if (date) setTempDate(date);
                  }}
                  maximumDate={new Date()}
                />
              </View>

              <View style={styles.pickerActions}>
                <TouchableOpacity 
                  style={styles.pickerCancelBtn} 
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.pickerCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.pickerConfirmBtn} 
                  onPress={() => {
                    const dateToUse = tempDate || new Date();
                    const year = dateToUse.getFullYear();
                    const month = String(dateToUse.getMonth() + 1).padStart(2, "0");
                    const day = String(dateToUse.getDate()).padStart(2, "0");
                    setIncidentDate(`${year}-${month}-${day}`);
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={styles.pickerConfirmText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Native Date Picker for Android */}
      {showDatePicker && Platform.OS === "android" && (
        <DateTimePicker
          value={tempDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (event.type === "set" && date) {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, "0");
              const day = String(date.getDate()).padStart(2, "0");
              setIncidentDate(`${year}-${month}-${day}`);
            }
          }}
          maximumDate={new Date()}
        />
      )}

      {/* Custom Time Picker Modal for iOS */}
      {Platform.OS === "ios" && (
        <Modal
          visible={showTimePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowTimePicker(false)}
        >
          <TouchableOpacity 
            style={styles.pickerModalOverlay} 
            activeOpacity={1}
            onPress={() => setShowTimePicker(false)}
          >
            <View style={styles.pickerModalCard}>
              <Text style={styles.pickerModalTitle}>Select Incident Time</Text>
              
              <View style={styles.pickerWrapper}>
                <DateTimePicker
                  value={tempTime || new Date()}
                  mode="time"
                  display="spinner"
                  onChange={(event, time) => {
                    if (time) setTempTime(time);
                  }}
                />
              </View>

              <View style={styles.pickerActions}>
                <TouchableOpacity 
                  style={styles.pickerCancelBtn} 
                  onPress={() => setShowTimePicker(false)}
                >
                  <Text style={styles.pickerCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.pickerConfirmBtn} 
                  onPress={() => {
                    const timeToUse = tempTime || new Date();
                    let hours = timeToUse.getHours();
                    const minutes = String(timeToUse.getMinutes()).padStart(2, "0");
                    const ampm = hours >= 12 ? "PM" : "AM";
                    hours = hours % 12;
                    hours = hours ? hours : 12;
                    setIncidentTime(`${hours}:${minutes} ${ampm}`);
                    setShowTimePicker(false);
                  }}
                >
                  <Text style={styles.pickerConfirmText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Native Time Picker for Android */}
      {showTimePicker && Platform.OS === "android" && (
        <DateTimePicker
          value={tempTime || new Date()}
          mode="time"
          display="default"
          onChange={(event, time) => {
            setShowTimePicker(false);
            if (event.type === "set" && time) {
              let hours = time.getHours();
              const minutes = String(time.getMinutes()).padStart(2, "0");
              const ampm = hours >= 12 ? "PM" : "AM";
              hours = hours % 12;
              hours = hours ? hours : 12;
              setIncidentTime(`${hours}:${minutes} ${ampm}`);
            }
          }}
        />
      )}

      <PolicyHolderNavbar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8fafc" },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 110 },

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

  /* Form details */
  formContainer: { marginTop: 10 },
  sectionHeader: { fontSize: 16, fontWeight: "800", color: "#0f172a", marginBottom: 12 },
  inputGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 12.5, color: "#475569", fontWeight: "700", marginBottom: 8 },
  rowInputs: { flexDirection: "row", gap: 12 },

  textInput: {
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
    color: "#0f172a",
    fontSize: 13.5,
    fontWeight: "600",
  },
  textareaInput: { minHeight: 90, textAlignVertical: "top" },

  pickerFakeBorder: { paddingVertical: 2 },
  vehiclePillRow: { flexDirection: "row", gap: 8, paddingBottom: 4 },
  vehiclePill: {
    backgroundColor: "#e2e8f0",
    borderRadius: 99,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  vehiclePillActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#3b82f6",
  },
  vehiclePillText: { fontSize: 12.5, color: "#475569", fontWeight: "700" },
  vehiclePillTextActive: { color: "#2563eb" },

  locationButtonsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
    marginBottom: 24,
  },
  locationBtnGps: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0284c7",
    borderWidth: 1.5,
    borderColor: "#0284c7",
    borderRadius: 99,
    paddingVertical: 12,
    gap: 8,
    shadowColor: "rgba(2, 132, 199, 0.2)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  locationBtnTextGps: {
    fontSize: 13,
    color: "#ffffff",
    fontWeight: "800",
  },
  locationBtnMap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0284c7",
    borderWidth: 1.5,
    borderColor: "#0284c7",
    borderRadius: 99,
    paddingVertical: 12,
    gap: 8,
    shadowColor: "rgba(2, 132, 199, 0.2)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  locationBtnTextMap: {
    fontSize: 13,
    color: "#ffffff",
    fontWeight: "800",
  },

  /* Photos layout */
  photosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  uploadBoxContainer: {
    width: (SCREEN_W - 44) / 2 - 4, // 2 column layout
  },
  uploadLabel: { fontSize: 11.5, color: "#475569", fontWeight: "700", marginBottom: 6 },
  placeholderBox: {
    height: 124,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#cbd5e1",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  placeholderTitle: { fontSize: 12, color: "#475569", fontWeight: "800", marginTop: 6 },
  placeholderDesc: { fontSize: 9, color: "#94a3b8", fontWeight: "600", marginTop: 2 },

  previewContainer: {
    height: 124,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
  },
  previewImage: { width: "100%", height: "100%" },
  deletePhotoBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(220, 38, 38, 0.9)",
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Action row styling */
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    borderRadius: 99,
    paddingVertical: 13,
    paddingHorizontal: 28,
  },
  cancelBtnText: { fontSize: 13.5, color: "#475569", fontWeight: "800" },

  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0d2a3a",
    borderRadius: 99,
    paddingVertical: 14,
    paddingHorizontal: 32,
    shadowColor: "rgba(13, 42, 58, 0.2)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnText: { fontSize: 13.5, color: "#ffffff", fontWeight: "800" },

  /* MODAL SUCCESS STYLE */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  successCard: {
    backgroundColor: "#e2e8f0",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 36,
    width: "100%",
    maxWidth: 420,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
  },
  checkCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#00b050",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "rgba(0, 176, 80, 0.4)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  successTitle: { fontSize: 22, fontWeight: "900", color: "#0d2a3a", marginTop: 18 },
  successSubtitle: { fontSize: 18, fontWeight: "800", color: "#0d2a3a", marginTop: 4 },
  refPill: {
    backgroundColor: "#000000",
    borderRadius: 99,
    paddingHorizontal: 22,
    paddingVertical: 10,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  refText: { color: "#ffffff", fontSize: 14, fontWeight: "800", letterSpacing: 0.5 },
  successDesc: {
    fontSize: 12.5,
    color: "#475569",
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 20,
    paddingHorizontal: 10,
  },
  returnBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0d2a3a",
    borderRadius: 99,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 24,
    width: "100%",
  },
  returnBtnText: { color: "#ffffff", fontSize: 13, fontWeight: "800" },

  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingHorizontal: 10,
    gap: 8,
    height: 48,
    marginBottom: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: "100%",
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: "#0f172a",
    fontWeight: "600",
    height: "100%",
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
  searchBtn: {
    backgroundColor: "#0284c7",
    borderRadius: 12,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "rgba(2, 132, 199, 0.3)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  suggestionsWrapper: {
    position: "absolute",
    top: 76,
    left: 0,
    right: 0,
    zIndex: 999,
    elevation: 10,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    maxHeight: 200,
    overflow: "hidden",
  },
  suggestionsContainer: {
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  suggestionIconWrapper: {
    backgroundColor: "#f1f5f9",
    borderRadius: 99,
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionTitle: {
    fontSize: 13,
    color: "#0f172a",
    fontWeight: "700",
  },
  suggestionSubtitle: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "400",
    marginTop: 2,
  },

  /* Added selector styles */
  selectorField: {
    height: 48,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectorFieldText: {
    fontSize: 13.5,
    color: "#0f172a",
    fontWeight: "600",
  },
  selectorFieldPlaceholder: {
    fontSize: 13.5,
    color: "#94a3b8",
    fontWeight: "600",
  },
  placeholderText: {
    color: "#94a3b8",
  },
  selectorFieldOpen: {
    borderColor: "#0284c7",
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  dropdownCard: {
    position: "absolute",
    top: 48,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#0284c7",
    borderTopWidth: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    zIndex: 99,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  dropdownOptionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  dropdownOptionItemActive: {
    backgroundColor: "#f0f9ff",
  },
  dropdownOptionText: {
    fontSize: 13.5,
    color: "#334155",
    fontWeight: "700",
  },
  dropdownOptionTextActive: {
    color: "#0284c7",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 16,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0d2a3a",
  },
  modalList: {
    paddingBottom: 10,
  },

  /* Added DateTimePicker modal styles */
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  pickerModalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    width: "100%",
    maxWidth: 340,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
  },
  pickerModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 16,
  },
  pickerWrapper: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  pickerActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  pickerCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  pickerCancelText: {
    fontSize: 13.5,
    color: "#475569",
    fontWeight: "700",
  },
  pickerConfirmBtn: {
    flex: 1,
    height: 44,
    borderRadius: 99,
    backgroundColor: "#0d2a3a",
    alignItems: "center",
    justifyContent: "center",
  },
  pickerConfirmText: {
    fontSize: 13.5,
    color: "#ffffff",
    fontWeight: "700",
  },
});
