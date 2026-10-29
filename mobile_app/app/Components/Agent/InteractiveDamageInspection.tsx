import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Dimensions,
  Alert,
  ActivityIndicator,
  Image,
  Switch,
  Platform
} from "react-native";
import Svg, { Path, Rect, Circle, Polygon, G, Text as SvgText } from "react-native-svg";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  getDiagramForCategory,
  findClosestPart,
  VehicleViewType,
  CategoryDiagramSpec,
  normalizeVehicleCategory
} from "../../utils/vehicleDiagramData";
import { compressImageMobile } from "../../../utils/imageCompressor";
import { API_BASE_URL } from "../../_config";

const { width: SCREEN_W } = Dimensions.get("window");

export interface DamagePhoto {
  url: string;
  caption?: string;
  uploadedAt?: string;
  base64?: string;
}

export interface DamageMarker {
  id: string;
  view: VehicleViewType;
  x: number; // 0 - 100%
  y: number; // 0 - 100%
  partName: string;
  damageType: string;
  severity: "Minor" | "Moderate" | "Severe" | "Critical";
  isPreExisting: boolean;
  description: string;
  estimatedRepairCost: number;
  photos: DamagePhoto[];
  timestamp?: string;
}

export interface ChecklistItem {
  item: string;
  status: "Good" | "Damaged" | "Not Inspected" | "Not Applicable";
  notes?: string;
  markerId?: string;
}

interface Props {
  claimNumber: string;
  vehiclePlate: string;
  vehicleCategory?: string;
  vehicleModel?: string;
  policyholderName?: string;
  policyholderNic?: string;
  assignedAgent: string;
  branch: string;
  initialReport?: any;
  onInspectionSubmitted?: (claim: any) => void;
  onCancel?: () => void;
}

const DAMAGE_TYPES = [
  "Dent",
  "Scratch",
  "Paint damage",
  "Cracked component",
  "Broken component",
  "Missing component",
  "Glass damage",
  "Rust or corrosion",
  "Previous damage",
  "No visible damage",
  "Other"
];

const SEVERITIES: ("Minor" | "Moderate" | "Severe" | "Critical")[] = [
  "Minor",
  "Moderate",
  "Severe",
  "Critical"
];

const SEVERITY_COLORS = {
  Minor: { bg: "#fef3c7", text: "#b45309", border: "#fcd34d", pin: "#f59e0b" },
  Moderate: { bg: "#ffedd5", text: "#c2410c", border: "#fdba74", pin: "#ea580c" },
  Severe: { bg: "#fee2e2", text: "#b91c1c", border: "#fca5a5", pin: "#ef4444" },
  Critical: { bg: "#fef2f2", text: "#7f1d1d", border: "#f87171", pin: "#991b1b" }
};

export default function InteractiveDamageInspection({
  claimNumber,
  vehiclePlate,
  vehicleCategory = "Car",
  vehicleModel = "",
  policyholderName = "",
  policyholderNic = "",
  assignedAgent,
  branch,
  initialReport,
  onInspectionSubmitted,
  onCancel
}: Props) {
  // Vehicle diagram spec based on category
  const [diagramSpec, setDiagramSpec] = useState<CategoryDiagramSpec>(() =>
    getDiagramForCategory(vehicleCategory)
  );

  // Active view tab (front, rear, left, right, top)
  const [activeView, setActiveView] = useState<VehicleViewType>("front");

  // Damage markers
  const [damageMarkers, setDamageMarkers] = useState<DamageMarker[]>([]);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  // Damage marker modal / bottom sheet editor
  const [showMarkerModal, setShowMarkerModal] = useState(false);
  const [editingMarker, setEditingMarker] = useState<DamageMarker | null>(null);
  const [isNewMarker, setIsNewMarker] = useState(false);

  // Category-specific checklist
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);

  // Vehicle condition
  const [odometer, setOdometer] = useState("");
  const [fuelLevel, setFuelLevel] = useState("1/2");
  const [recommendedAction, setRecommendedAction] = useState("Repairable (Minor)");
  const [preExistingNotes, setPreExistingNotes] = useState("");
  const [agentGeneralNotes, setAgentGeneralNotes] = useState("");

  // Saving / Submitting States
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showConfirmSubmitModal, setShowConfirmSubmitModal] = useState(false);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Canvas Layout Dimensions for normalized coordinates
  const [canvasLayout, setCanvasLayout] = useState<{ width: number; height: number }>({
    width: SCREEN_W - 32,
    height: 220
  });

  // Load existing report or initialize defaults
  useEffect(() => {
    const spec = getDiagramForCategory(vehicleCategory);
    setDiagramSpec(spec);

    if (initialReport) {
      if (initialReport.damageMarkers && Array.isArray(initialReport.damageMarkers)) {
        setDamageMarkers(initialReport.damageMarkers);
      }
      if (initialReport.checklist && Array.isArray(initialReport.checklist) && initialReport.checklist.length > 0) {
        setChecklist(initialReport.checklist);
      } else {
        initDefaultChecklist(spec.category);
      }
      if (initialReport.vehicleCondition) {
        setOdometer(initialReport.vehicleCondition.odometer || "");
        setFuelLevel(initialReport.vehicleCondition.fuelLevel || "1/2");
        setRecommendedAction(initialReport.vehicleCondition.recommendedAction || "Repairable (Minor)");
        setPreExistingNotes(initialReport.vehicleCondition.preExistingDamage || "");
      }
      if (initialReport.agentNotes) {
        setAgentGeneralNotes(initialReport.agentNotes);
      }
    } else {
      initDefaultChecklist(spec.category);
    }
  }, [vehicleCategory, initialReport]);

  const initDefaultChecklist = (cat: string) => {
    // Generate default checklist items for category
    const defaultItems = [
      "Front Bumper",
      "Rear Bumper",
      "Bonnet / Hood",
      "Roof Panel",
      "Front Windscreen",
      "Left Side Body Panels",
      "Right Side Body Panels",
      "Headlights & Indicators",
      "Tail Lights",
      "Side Mirrors",
      "Wheels & Tyres",
      "Engine & Radiator",
      "Chassis / Frame"
    ];
    setChecklist(
      defaultItems.map((item) => ({
        item,
        status: "Not Inspected",
        notes: ""
      }))
    );
  };

  // ── Calculate Total Estimated Cost ──────────────────────────────────────────
  const totalEstimatedCost = damageMarkers.reduce(
    (sum, m) => sum + (Number(m.estimatedRepairCost) || 0),
    0
  );

  // ── Handle Tap on Diagram to Add / Edit Marker ──────────────────────────────
  const handleDiagramTouch = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    const { width, height } = canvasLayout;

    if (!width || !height) return;

    // Calculate normalized relative percentage (0.0 to 100.0)
    const normalizedX = Math.round(Math.max(2, Math.min(98, (locationX / width) * 100)) * 10) / 10;
    const normalizedY = Math.round(Math.max(2, Math.min(98, (locationY / height) * 100)) * 10) / 10;

    // Determine nearest vehicle component name
    const currentViewSpec = diagramSpec.views[activeView];
    const suggestedPart = findClosestPart(currentViewSpec?.hotspots || [], normalizedX, normalizedY);

    const newMarker: DamageMarker = {
      id: `DM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      view: activeView,
      x: normalizedX,
      y: normalizedY,
      partName: suggestedPart,
      damageType: "Dent",
      severity: "Moderate",
      isPreExisting: false,
      description: "",
      estimatedRepairCost: 0,
      photos: []
    };

    setEditingMarker(newMarker);
    setIsNewMarker(true);
    setShowMarkerModal(true);
  };

  // ── Select an Existing Marker to Edit ───────────────────────────────────────
  const handleSelectMarker = (marker: DamageMarker) => {
    setSelectedMarkerId(marker.id);
    if (marker.view !== activeView) {
      setActiveView(marker.view);
    }
    setEditingMarker({ ...marker, photos: [...(marker.photos || [])] });
    setIsNewMarker(false);
    setShowMarkerModal(true);
  };

  // ── Save Marker from Modal ──────────────────────────────────────────────────
  const handleSaveMarker = () => {
    if (!editingMarker) return;
    if (!editingMarker.partName.trim()) {
      Alert.alert("Validation", "Please specify the damaged vehicle part name.");
      return;
    }

    if (isNewMarker) {
      setDamageMarkers((prev) => [...prev, editingMarker]);
      // Update checklist item to Damaged if it matches
      setChecklist((prev) =>
        prev.map((c) =>
          c.item.toLowerCase().includes(editingMarker.partName.toLowerCase()) ||
          editingMarker.partName.toLowerCase().includes(c.item.toLowerCase())
            ? { ...c, status: "Damaged", markerId: editingMarker.id }
            : c
        )
      );
    } else {
      setDamageMarkers((prev) =>
        prev.map((m) => (m.id === editingMarker.id ? editingMarker : m))
      );
    }

    setShowMarkerModal(false);
    setSelectedMarkerId(editingMarker.id);
    setEditingMarker(null);
  };

  // ── Delete Marker ───────────────────────────────────────────────────────────
  const handleDeleteMarker = (markerId: string) => {
    Alert.alert(
      "Confirm Removal",
      "Are you sure you want to remove this damage marker and its attached evidence?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setDamageMarkers((prev) => prev.filter((m) => m.id !== markerId));
            if (selectedMarkerId === markerId) setSelectedMarkerId(null);
            setShowMarkerModal(false);
            setEditingMarker(null);
          }
        }
      ]
    );
  };

  // ── Attach Damage Photo via Camera or Gallery ──────────────────────────────
  const handleAddPhoto = async (source: "camera" | "gallery") => {
    if (!editingMarker) return;

    try {
      let result;
      if (source === "camera") {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Denied", "Camera permission is required to capture inspection photos.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Denied", "Photo gallery permission is required to select photos.");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          quality: 0.8
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsUploadingPhoto(true);
        const asset = result.assets[0];
        const base64Data = await compressImageMobile(asset.uri);

        // Upload to backend API
        try {
          const res = await fetch(`${API_BASE_URL}/api/inspection/upload-photo`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              base64Data,
              claimNumber,
              caption: `${editingMarker.partName} - ${editingMarker.damageType}`
            })
          });

          if (res.ok) {
            const data = await res.json();
            const newPhoto: DamagePhoto = {
              url: data.url,
              caption: data.caption,
              uploadedAt: data.uploadedAt
            };
            setEditingMarker((prev) =>
              prev ? { ...prev, photos: [...(prev.photos || []), newPhoto] } : null
            );
          } else {
            // Local fallback uri if network upload times out
            const localPhoto: DamagePhoto = {
              url: asset.uri,
              base64: base64Data,
              caption: editingMarker.partName,
              uploadedAt: new Date().toISOString()
            };
            setEditingMarker((prev) =>
              prev ? { ...prev, photos: [...(prev.photos || []), localPhoto] } : null
            );
          }
        } catch (uploadErr) {
          // Local fallback
          const localPhoto: DamagePhoto = {
            url: asset.uri,
            base64: base64Data,
            caption: editingMarker.partName,
            uploadedAt: new Date().toISOString()
          };
          setEditingMarker((prev) =>
            prev ? { ...prev, photos: [...(prev.photos || []), localPhoto] } : null
          );
        } finally {
          setIsUploadingPhoto(false);
        }
      }
    } catch (e: any) {
      setIsUploadingPhoto(false);
      Alert.alert("Error", "Could not capture inspection photo. Please try again.");
    }
  };

  // ── Save Draft to Server ───────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      const payload = {
        claimNumber,
        damageMarkers,
        checklist,
        vehicleCondition: {
          odometer,
          fuelLevel,
          recommendedAction,
          preExistingDamage: preExistingNotes
        },
        agentNotes: agentGeneralNotes,
        totalEstimatedCost,
        agentEmail: assignedAgent,
        role: "Agent",
        branch
      };

      const res = await fetch(`${API_BASE_URL}/api/inspection/draft`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": assignedAgent,
          "x-user-role": "Agent",
          "x-user-branch": branch
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save draft.");

      Alert.alert(
        "Draft Saved",
        "Inspection draft saved successfully to the server. You can resume inspection anytime."
      );
    } catch (err: any) {
      Alert.alert("Draft Save Warning", err.message || "Failed to save draft.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  // ── Final Submit Inspection ────────────────────────────────────────────────
  const handleFinalSubmit = async () => {
    if (!odometer.trim()) {
      Alert.alert("Required Field", "Please enter the vehicle's odometer reading before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        claimNumber,
        damageMarkers,
        checklist,
        vehicleCondition: {
          odometer,
          fuelLevel,
          recommendedAction,
          preExistingDamage: preExistingNotes
        },
        agentNotes: agentGeneralNotes,
        totalEstimatedCost,
        agentEmail: assignedAgent,
        role: "Agent",
        branch
      };

      const res = await fetch(`${API_BASE_URL}/api/inspection/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": assignedAgent,
          "x-user-role": "Agent",
          "x-user-branch": branch
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit inspection report.");

      setShowConfirmSubmitModal(false);
      Alert.alert(
        "Inspection Submitted",
        `Physical inspection report for claim ${claimNumber} has been finalized and dispatched to the ${branch} Branch Office.`,
        [
          {
            text: "OK",
            onPress: () => {
              if (onInspectionSubmitted) {
                onInspectionSubmitted(data.claim);
              }
            }
          }
        ]
      );
    } catch (err: any) {
      Alert.alert("Submission Error", err.message || "Failed to submit report. Please retry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter markers for current view
  const currentViewMarkers = damageMarkers.filter((m) => m.view === activeView);
  const currentViewSpec = diagramSpec.views[activeView];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* ── Vehicle Category & Metadata Bar ──────────────────────────────── */}
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.vehIconContainer}>
            <MaterialCommunityIcons
              name={(diagramSpec.icon || "car") as any}
              size={28}
              color="#102A43"
            />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={styles.claimNumberText}>{claimNumber}</Text>
              <View style={styles.categoryPill}>
                <Text style={styles.categoryPillText}>{diagramSpec.displayName}</Text>
              </View>
            </View>
            <Text style={styles.plateNumberText}>{vehiclePlate} {vehicleModel ? `• ${vehicleModel}` : ""}</Text>
            <Text style={styles.policyholderText}>Owner: {policyholderName} ({policyholderNic})</Text>
          </View>
        </View>

        {diagramSpec.isFallback && (
          <View style={styles.fallbackAlert}>
            <Ionicons name="alert-circle" size={16} color="#b45309" />
            <Text style={styles.fallbackAlertText}>
              Category &quot;{vehicleCategory}&quot; uses standardized diagram mapping.
            </Text>
          </View>
        )}
      </View>

      {/* ── View Perspective Switcher Tabs ─────────────────────────────────── */}
      <View style={styles.viewTabsWrapper}>
        <Text style={styles.sectionTitle}>SELECT VEHICLE PERSPECTIVE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.viewTabsContainer}>
          {(["front", "rear", "left", "right", "top"] as VehicleViewType[]).map((v) => {
            const count = damageMarkers.filter((m) => m.view === v).length;
            const isActive = activeView === v;
            return (
              <TouchableOpacity
                key={v}
                style={[styles.viewTab, isActive && styles.viewTabActive]}
                onPress={() => setActiveView(v)}
                activeOpacity={0.8}
              >
                <Text style={[styles.viewTabText, isActive && styles.viewTabTextActive]}>
                  {v.toUpperCase()}
                </Text>
                {count > 0 && (
                  <View style={[styles.viewTabBadge, isActive && styles.viewTabBadgeActive]}>
                    <Text style={[styles.viewTabBadgeText, isActive && styles.viewTabBadgeTextActive]}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Interactive Vector Diagram Canvas ──────────────────────────────── */}
      <View style={styles.canvasContainer}>
        <View style={styles.canvasHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="locate-outline" size={16} color="#0284c7" />
            <Text style={styles.canvasHintText}>Tap diagram to place damage marker</Text>
          </View>
          <Text style={styles.canvasMarkerCountText}>{currentViewMarkers.length} marker(s) on this view</Text>
        </View>

        <TouchableOpacity
          activeOpacity={1}
          style={styles.svgTouchable}
          onPress={handleDiagramTouch}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            if (width > 0 && height > 0) {
              setCanvasLayout({ width, height });
            }
          }}
        >
          {/* Scalable Vector Illustration */}
          <Svg viewBox={currentViewSpec?.viewBox || "0 0 400 240"} style={styles.svgElement}>
            {currentViewSpec?.paths?.map((p, idx) => {
              if (p.type === "rect") {
                return (
                  <Rect
                    key={idx}
                    x={p.x}
                    y={p.y}
                    width={p.width}
                    height={p.height}
                    rx={p.width && p.width > 100 ? 6 : 2}
                    fill={p.fill || "#f1f5f9"}
                    stroke={p.stroke || "#1e293b"}
                    strokeWidth={p.strokeWidth || 2}
                  />
                );
              }
              if (p.type === "circle") {
                return (
                  <Circle
                    key={idx}
                    cx={p.cx}
                    cy={p.cy}
                    r={p.r}
                    fill={p.fill || "#0f172a"}
                    stroke={p.stroke || "#64748b"}
                    strokeWidth={p.strokeWidth || 2}
                  />
                );
              }
              if (p.type === "polygon") {
                return (
                  <Polygon
                    key={idx}
                    points={p.points}
                    fill={p.fill || "#fef08a"}
                    stroke={p.stroke || "#ca8a04"}
                    strokeWidth={p.strokeWidth || 2}
                  />
                );
              }
              return (
                <Path
                  key={idx}
                  d={p.d}
                  fill={p.fill || "#f1f5f9"}
                  stroke={p.stroke || "#1e293b"}
                  strokeWidth={p.strokeWidth || 2.5}
                />
              );
            })}
          </Svg>

          {/* Render Active Damage Marker Pins over Vector */}
          {currentViewMarkers.map((marker, idx) => {
            const globalIndex = damageMarkers.findIndex((m) => m.id === marker.id) + 1;
            const isSelected = selectedMarkerId === marker.id;
            const sevColor = SEVERITY_COLORS[marker.severity] || SEVERITY_COLORS.Moderate;
            const pinColor = marker.isPreExisting ? "#64748b" : sevColor.pin;

            return (
              <TouchableOpacity
                key={marker.id}
                style={[
                  styles.markerPin,
                  {
                    left: `${marker.x}%`,
                    top: `${marker.y}%`,
                    backgroundColor: pinColor,
                    borderColor: isSelected ? "#ffffff" : "#0f172a",
                    transform: [{ translateX: -14 }, { translateY: -14 }, { scale: isSelected ? 1.25 : 1 }]
                  }
                ]}
                onPress={() => handleSelectMarker(marker)}
                activeOpacity={0.8}
              >
                <Text style={styles.markerPinText}>{globalIndex}</Text>
              </TouchableOpacity>
            );
          })}
        </TouchableOpacity>
      </View>

      {/* ── Synchronized Damage Markers List ───────────────────────────────── */}
      <View style={styles.cardSection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            RECORDED DAMAGE ENTRIES ({damageMarkers.length})
          </Text>
          <Text style={styles.estTotalBadge}>
            Est: LKR {totalEstimatedCost.toLocaleString()}
          </Text>
        </View>

        {damageMarkers.length === 0 ? (
          <View style={styles.emptyMarkersBox}>
            <Ionicons name="checkmark-circle-outline" size={32} color="#10b981" />
            <Text style={styles.emptyMarkersTitle}>No Damage Markers Placed</Text>
            <Text style={styles.emptyMarkersSubtitle}>
              Tap anywhere on the vehicle diagram above to record a damaged part, dent, scratch, or crack.
            </Text>
          </View>
        ) : (
          <View style={styles.markersList}>
            {damageMarkers.map((marker, index) => {
              const sev = SEVERITY_COLORS[marker.severity] || SEVERITY_COLORS.Moderate;
              const isSelected = selectedMarkerId === marker.id;

              return (
                <TouchableOpacity
                  key={marker.id}
                  style={[styles.markerCard, isSelected && styles.markerCardSelected]}
                  onPress={() => handleSelectMarker(marker)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.markerNumberBox, { backgroundColor: marker.isPreExisting ? "#64748b" : sev.pin }]}>
                    <Text style={styles.markerNumberText}>{index + 1}</Text>
                  </View>

                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text style={styles.markerPartName}>{marker.partName}</Text>
                      <View style={[styles.sevBadge, { backgroundColor: sev.bg, borderColor: sev.border }]}>
                        <Text style={[styles.sevBadgeText, { color: sev.text }]}>{marker.severity}</Text>
                      </View>
                    </View>

                    <Text style={styles.markerSubDetail}>
                      {marker.view.toUpperCase()} VIEW • {marker.damageType}
                      {marker.isPreExisting ? " • PRE-EXISTING" : ""}
                    </Text>

                    {marker.description ? (
                      <Text style={styles.markerDescText} numberOfLines={1}>
                        {marker.description}
                      </Text>
                    ) : null}

                    <View style={styles.markerCardFooter}>
                      <Text style={styles.markerCostText}>
                        Est. Cost: LKR {Number(marker.estimatedRepairCost || 0).toLocaleString()}
                      </Text>
                      {marker.photos && marker.photos.length > 0 && (
                        <View style={styles.photoCountBadge}>
                          <Ionicons name="camera" size={12} color="#0284c7" />
                          <Text style={styles.photoCountText}>{marker.photos.length} photo(s)</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.deleteMarkerIconBtn}
                    onPress={() => handleDeleteMarker(marker.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* ── Category-Specific Inspection Checklist ─────────────────────────── */}
      <View style={styles.cardSection}>
        <Text style={styles.sectionTitle}>
          INSPECTION CHECKLIST ({checklist.length} ITEMS)
        </Text>
        <Text style={styles.checklistHint}>
          Mark each vehicle component condition. Damaged items can be cross-linked to diagram markers.
        </Text>

        <View style={styles.checklistWrapper}>
          {checklist.map((item, idx) => {
            return (
              <View key={idx} style={styles.checklistItemRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.checklistItemTitle}>{item.item}</Text>
                  {item.notes ? (
                    <Text style={styles.checklistItemNotes}>{item.notes}</Text>
                  ) : null}
                </View>

                {/* 4 Condition Buttons */}
                <View style={styles.checklistButtonsRow}>
                  <TouchableOpacity
                    style={[
                      styles.checkBtn,
                      item.status === "Good" && styles.checkBtnGood
                    ]}
                    onPress={() => {
                      setChecklist((prev) =>
                        prev.map((c, i) => (i === idx ? { ...c, status: "Good" } : c))
                      );
                    }}
                  >
                    <Text style={[styles.checkBtnText, item.status === "Good" && styles.checkBtnTextGood]}>
                      Good
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.checkBtn,
                      item.status === "Damaged" && styles.checkBtnDamaged
                    ]}
                    onPress={() => {
                      setChecklist((prev) =>
                        prev.map((c, i) => (i === idx ? { ...c, status: "Damaged" } : c))
                      );
                    }}
                  >
                    <Text style={[styles.checkBtnText, item.status === "Damaged" && styles.checkBtnTextDamaged]}>
                      Damaged
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.checkBtn,
                      item.status === "Not Applicable" && styles.checkBtnNA
                    ]}
                    onPress={() => {
                      setChecklist((prev) =>
                        prev.map((c, i) => (i === idx ? { ...c, status: "Not Applicable" } : c))
                      );
                    }}
                  >
                    <Text style={[styles.checkBtnText, item.status === "Not Applicable" && styles.checkBtnTextNA]}>
                      N/A
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* ── Vehicle Condition & Operational Details ────────────────────────── */}
      <View style={styles.cardSection}>
        <Text style={styles.sectionTitle}>VEHICLE OPERATIONAL CONDITION</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Odometer Reading (km) *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. 74500"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
            value={odometer}
            onChangeText={setOdometer}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Fuel Level</Text>
          <View style={styles.fuelSelectorRow}>
            {["E", "1/4", "1/2", "3/4", "F"].map((lvl) => (
              <TouchableOpacity
                key={lvl}
                style={[styles.fuelBtn, fuelLevel === lvl && styles.fuelBtnActive]}
                onPress={() => setFuelLevel(lvl)}
              >
                <Text style={[styles.fuelBtnText, fuelLevel === lvl && styles.fuelBtnTextActive]}>
                  {lvl}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Recommended Action</Text>
          <View style={styles.actionSelectorRow}>
            {[
              "Repairable (Minor)",
              "Repairable (Major)",
              "Total Loss",
              "Further Teardown"
            ].map((act) => (
              <TouchableOpacity
                key={act}
                style={[styles.actionBtn, recommendedAction === act && styles.actionBtnActive]}
                onPress={() => setRecommendedAction(act)}
              >
                <Text style={[styles.actionBtnText, recommendedAction === act && styles.actionBtnTextActive]}>
                  {act}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Pre-Existing Damage Notes (Prior to Incident)</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Note any pre-existing scratches, old rust, or non-incident dents..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
            value={preExistingNotes}
            onChangeText={setPreExistingNotes}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Agent On-Site General Remarks</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Add general physical inspection findings and garage recommendations..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={4}
            value={agentGeneralNotes}
            onChangeText={setAgentGeneralNotes}
          />
        </View>
      </View>

      {/* ── Bottom Action Toolbar ─────────────────────────────────────────── */}
      <View style={styles.actionToolbar}>
        <TouchableOpacity
          style={styles.saveDraftBtn}
          onPress={handleSaveDraft}
          disabled={isSavingDraft}
        >
          {isSavingDraft ? (
            <ActivityIndicator size="small" color="#102A43" />
          ) : (
            <>
              <Ionicons name="save-outline" size={18} color="#102A43" />
              <Text style={styles.saveDraftBtnText}>Save Draft</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.previewBtn}
          onPress={() => setShowPreviewModal(true)}
        >
          <Ionicons name="eye-outline" size={18} color="#0284c7" />
          <Text style={styles.previewBtnText}>Preview</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.submitBtn}
          onPress={() => setShowConfirmSubmitModal(true)}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="checkmark-done" size={18} color="#ffffff" />
              <Text style={styles.submitBtnText}>Submit Report</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 1: DAMAGE MARKER EDITOR (BOTTOM SHEET STYLE)                   */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <Modal visible={showMarkerModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheetContainer}>
            <View style={styles.bottomSheetHeader}>
              <View>
                <Text style={styles.bottomSheetTitle}>
                  {isNewMarker ? "Add Damage Marker" : "Edit Damage Marker"}
                </Text>
                <Text style={styles.bottomSheetSubtitle}>
                  View: {editingMarker?.view.toUpperCase()} • Position: ({editingMarker?.x}%, {editingMarker?.y}%)
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowMarkerModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.bottomSheetBody} showsVerticalScrollIndicator={false}>
              {/* Part Name */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Damaged Component / Part Name *</Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={editingMarker?.partName}
                  onChangeText={(val) =>
                    setEditingMarker((prev) => (prev ? { ...prev, partName: val } : null))
                  }
                  placeholder="e.g. Front Bumper, Left Headlight"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              {/* Damage Type Grid */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Damage Classification</Text>
                <View style={styles.damageTypeGrid}>
                  {DAMAGE_TYPES.map((type) => {
                    const isSelected = editingMarker?.damageType === type;
                    return (
                      <TouchableOpacity
                        key={type}
                        style={[styles.damageTypePill, isSelected && styles.damageTypePillActive]}
                        onPress={() =>
                          setEditingMarker((prev) => (prev ? { ...prev, damageType: type } : null))
                        }
                      >
                        <Text style={[styles.damageTypePillText, isSelected && styles.damageTypePillTextActive]}>
                          {type}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Severity Selector */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Severity Level</Text>
                <View style={styles.severityRow}>
                  {SEVERITIES.map((sev) => {
                    const isSelected = editingMarker?.severity === sev;
                    const sevStyle = SEVERITY_COLORS[sev];
                    return (
                      <TouchableOpacity
                        key={sev}
                        style={[
                          styles.severityBtn,
                          isSelected && { backgroundColor: sevStyle.bg, borderColor: sevStyle.pin, borderWidth: 2 }
                        ]}
                        onPress={() =>
                          setEditingMarker((prev) => (prev ? { ...prev, severity: sev } : null))
                        }
                      >
                        <View style={[styles.sevDot, { backgroundColor: sevStyle.pin }]} />
                        <Text style={[styles.severityBtnText, isSelected && { color: sevStyle.text, fontWeight: "800" }]}>
                          {sev}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Pre-Existing vs New Toggle */}
              <View style={styles.preExistingToggleCard}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.toggleTitle}>Pre-Existing Damage</Text>
                  <Text style={styles.toggleSubtitle}>
                    Turn on if this damage occurred prior to this incident and is not part of this claim.
                  </Text>
                </View>
                <Switch
                  value={editingMarker?.isPreExisting || false}
                  onValueChange={(val) =>
                    setEditingMarker((prev) => (prev ? { ...prev, isPreExisting: val } : null))
                  }
                  trackColor={{ false: "#cbd5e1", true: "#f59e0b" }}
                  thumbColor="#ffffff"
                />
              </View>

              {/* Estimated Cost */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Estimated Repair Cost (LKR)</Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={editingMarker?.estimatedRepairCost ? String(editingMarker.estimatedRepairCost) : ""}
                  onChangeText={(val) => {
                    const cleanNum = Number(val.replace(/[^0-9]/g, "")) || 0;
                    setEditingMarker((prev) => (prev ? { ...prev, estimatedRepairCost: cleanNum } : null));
                  }}
                  keyboardType="numeric"
                  placeholder="e.g. 35000"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              {/* Damage Notes */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Description & Forensic Notes</Text>
                <TextInput
                  style={[styles.modalTextInput, styles.textArea]}
                  value={editingMarker?.description}
                  onChangeText={(val) =>
                    setEditingMarker((prev) => (prev ? { ...prev, description: val } : null))
                  }
                  placeholder="Describe crack length, dent depth, paint tear..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Photos Gallery & Capture */}
              <View style={styles.modalInputGroup}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <Text style={styles.modalLabel}>Attached Evidence Photos ({editingMarker?.photos?.length || 0})</Text>
                  {isUploadingPhoto && <ActivityIndicator size="small" color="#0284c7" />}
                </View>

                {/* Photo thumbnails */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                  {editingMarker?.photos?.map((photo, pIdx) => (
                    <View key={pIdx} style={styles.photoThumbContainer}>
                      <TouchableOpacity onPress={() => setPhotoPreviewUrl(photo.url)}>
                        <Image source={{ uri: photo.url }} style={styles.photoThumbnail} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.removePhotoBtn}
                        onPress={() => {
                          setEditingMarker((prev) =>
                            prev ? { ...prev, photos: prev.photos.filter((_, i) => i !== pIdx) } : null
                          );
                        }}
                      >
                        <Ionicons name="close-circle" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>

                {/* Add Photo Buttons */}
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity
                    style={styles.addPhotoBtn}
                    onPress={() => handleAddPhoto("camera")}
                    disabled={isUploadingPhoto}
                  >
                    <Ionicons name="camera" size={18} color="#0284c7" />
                    <Text style={styles.addPhotoBtnText}>Camera</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.addPhotoBtn}
                    onPress={() => handleAddPhoto("gallery")}
                    disabled={isUploadingPhoto}
                  >
                    <Ionicons name="images" size={18} color="#0284c7" />
                    <Text style={styles.addPhotoBtnText}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Bottom Sheet Action Footer */}
            <View style={styles.bottomSheetFooter}>
              {!isNewMarker && editingMarker && (
                <TouchableOpacity
                  style={styles.modalDeleteBtn}
                  onPress={() => handleDeleteMarker(editingMarker.id)}
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  <Text style={styles.modalDeleteBtnText}>Remove</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveMarker}>
                <Text style={styles.modalSaveBtnText}>Save Marker</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 2: PREVIEW INSPECTION DOSSIER                                   */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <Modal visible={showPreviewModal} animationType="slide">
        <View style={styles.previewModalContainer}>
          <View style={styles.previewModalHeader}>
            <Text style={styles.previewModalTitle}>Inspection Report Preview</Text>
            <TouchableOpacity onPress={() => setShowPreviewModal(false)}>
              <Ionicons name="close" size={24} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator={false}>
            {/* Header Certificate */}
            <View style={styles.previewDossierCard}>
              <Text style={styles.dossierTitle}>SANASA GENERAL INSURANCE PLC</Text>
              <Text style={styles.dossierSubtitle}>MOTOR VEHICLE DAMAGE INSPECTION DOSSIER</Text>

              <View style={styles.dossierMetaGrid}>
                <View style={styles.dossierMetaItem}>
                  <Text style={styles.dossierMetaLabel}>CLAIM NO</Text>
                  <Text style={styles.dossierMetaVal}>{claimNumber}</Text>
                </View>
                <View style={styles.dossierMetaItem}>
                  <Text style={styles.dossierMetaLabel}>VEHICLE NO</Text>
                  <Text style={styles.dossierMetaVal}>{vehiclePlate}</Text>
                </View>
                <View style={styles.dossierMetaItem}>
                  <Text style={styles.dossierMetaLabel}>CATEGORY</Text>
                  <Text style={styles.dossierMetaVal}>{diagramSpec.displayName}</Text>
                </View>
                <View style={styles.dossierMetaItem}>
                  <Text style={styles.dossierMetaLabel}>AGENT</Text>
                  <Text style={styles.dossierMetaVal}>{assignedAgent}</Text>
                </View>
              </View>

              <View style={styles.dossierDivider} />

              <Text style={styles.dossierSectionHeader}>RECORDED DAMAGE MARKERS ({damageMarkers.length})</Text>
              {damageMarkers.map((m, i) => (
                <View key={i} style={styles.dossierMarkerRow}>
                  <Text style={styles.dossierMarkerNum}>#{i + 1}</Text>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.dossierMarkerPart}>
                      {m.partName} ({m.view.toUpperCase()}) - {m.damageType} [{m.severity}]
                    </Text>
                    <Text style={styles.dossierMarkerDesc}>{m.description || "No specific remarks"}</Text>
                  </View>
                  <Text style={styles.dossierMarkerCost}>
                    LKR {Number(m.estimatedRepairCost).toLocaleString()}
                  </Text>
                </View>
              ))}

              <View style={styles.dossierTotalRow}>
                <Text style={styles.dossierTotalLabel}>TOTAL ESTIMATED REPAIR COST:</Text>
                <Text style={styles.dossierTotalVal}>LKR {totalEstimatedCost.toLocaleString()}</Text>
              </View>

              <View style={styles.dossierDivider} />

              <Text style={styles.dossierSectionHeader}>OPERATIONAL SPECS</Text>
              <Text style={styles.dossierText}>• Odometer Reading: {odometer || "N/A"} km</Text>
              <Text style={styles.dossierText}>• Fuel Level: {fuelLevel}</Text>
              <Text style={styles.dossierText}>• Recommendation: {recommendedAction}</Text>
              <Text style={styles.dossierText}>• Pre-Existing Damage: {preExistingNotes || "None reported."}</Text>
              <Text style={styles.dossierText}>• Physical Notes: {agentGeneralNotes || "Completed on-site."}</Text>
            </View>
          </ScrollView>

          <View style={styles.previewFooter}>
            <TouchableOpacity
              style={styles.previewCloseBtn}
              onPress={() => setShowPreviewModal(false)}
            >
              <Text style={styles.previewCloseBtnText}>Close Preview</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 3: SUBMIT CONFIRMATION DIALOG                                   */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <Modal visible={showConfirmSubmitModal} transparent animationType="fade">
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalCard}>
            <View style={styles.confirmIconBox}>
              <Ionicons name="shield-checkmark" size={36} color="#0284c7" />
            </View>

            <Text style={styles.confirmTitle}>Submit Inspection Report?</Text>
            <Text style={styles.confirmMessage}>
              You are about to submit the finalized vehicle inspection report for claim{" "}
              <Text style={{ fontWeight: "700", color: "#102A43" }}>{claimNumber}</Text> with{" "}
              <Text style={{ fontWeight: "700" }}>{damageMarkers.length}</Text> recorded damage marker(s) and
              an estimated repair cost of{" "}
              <Text style={{ fontWeight: "700", color: "#10b981" }}>LKR {totalEstimatedCost.toLocaleString()}</Text>.
              {"\n\n"}
              This will update the {branch} Branch Office dashboard in real time.
            </Text>

            <View style={styles.confirmActionsRow}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setShowConfirmSubmitModal(false)}
                disabled={isSubmitting}
              >
                <Text style={styles.confirmCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmSubmitBtn}
                onPress={handleFinalSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.confirmSubmitBtnText}>Yes, Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 4: PHOTO LIGHTBOX ZOOM                                          */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <Modal visible={!!photoPreviewUrl} transparent animationType="fade">
        <View style={styles.lightboxOverlay}>
          <TouchableOpacity
            style={styles.lightboxCloseBtn}
            onPress={() => setPhotoPreviewUrl(null)}
          >
            <Ionicons name="close" size={30} color="#ffffff" />
          </TouchableOpacity>
          {photoPreviewUrl && (
            <Image
              source={{ uri: photoPreviewUrl }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc"
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40
  },
  headerCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  vehIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center"
  },
  claimNumberText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#102A43"
  },
  categoryPill: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0369a1"
  },
  plateNumberText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginTop: 2
  },
  policyholderText: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2
  },
  fallbackAlert: {
    marginTop: 10,
    padding: 8,
    backgroundColor: "#fef3c7",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  fallbackAlertText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#92400e",
    flex: 1
  },
  viewTabsWrapper: {
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.8,
    marginBottom: 8
  },
  viewTabsContainer: {
    flexDirection: "row",
    gap: 8
  },
  viewTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1"
  },
  viewTabActive: {
    backgroundColor: "#102A43",
    borderColor: "#102A43"
  },
  viewTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569"
  },
  viewTabTextActive: {
    color: "#ffffff"
  },
  viewTabBadge: {
    marginLeft: 6,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10
  },
  viewTabBadgeActive: {
    backgroundColor: "#38bdf8"
  },
  viewTabBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#475569"
  },
  viewTabBadgeTextActive: {
    color: "#0f172a"
  },
  canvasContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  canvasHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0"
  },
  canvasHintText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0284c7"
  },
  canvasMarkerCountText: {
    fontSize: 11,
    color: "#64748b"
  },
  svgTouchable: {
    width: "100%",
    height: 220,
    position: "relative",
    backgroundColor: "#ffffff"
  },
  svgElement: {
    width: "100%",
    height: "100%"
  },
  markerPin: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4
  },
  markerPinText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#ffffff"
  },
  cardSection: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
  },
  estTotalBadge: {
    fontSize: 12,
    fontWeight: "800",
    color: "#059669",
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  emptyMarkersBox: {
    alignItems: "center",
    paddingVertical: 20
  },
  emptyMarkersTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginTop: 6
  },
  emptyMarkersSubtitle: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 20
  },
  markersList: {
    gap: 8
  },
  markerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  markerCardSelected: {
    borderColor: "#0284c7",
    backgroundColor: "#f0f9ff"
  },
  markerNumberBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  markerNumberText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#ffffff"
  },
  markerPartName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e293b"
  },
  sevBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1
  },
  sevBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  markerSubDetail: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 1
  },
  markerDescText: {
    fontSize: 11,
    color: "#475569",
    marginTop: 2,
    fontStyle: "italic"
  },
  markerCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4
  },
  markerCostText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669"
  },
  photoCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3
  },
  photoCountText: {
    fontSize: 10,
    color: "#0284c7",
    fontWeight: "600"
  },
  deleteMarkerIconBtn: {
    padding: 6,
    marginLeft: 4
  },
  checklistHint: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 10
  },
  checklistWrapper: {
    gap: 8
  },
  checklistItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9"
  },
  checklistItemTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1e293b"
  },
  checklistItemNotes: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 2
  },
  checklistButtonsRow: {
    flexDirection: "row",
    gap: 4
  },
  checkBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  checkBtnGood: {
    backgroundColor: "#ecfdf5",
    borderColor: "#6ee7b7"
  },
  checkBtnDamaged: {
    backgroundColor: "#fee2e2",
    borderColor: "#fca5a5"
  },
  checkBtnNA: {
    backgroundColor: "#f1f5f9",
    borderColor: "#cbd5e1"
  },
  checkBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b"
  },
  checkBtnTextGood: {
    color: "#065f46"
  },
  checkBtnTextDamaged: {
    color: "#991b1b"
  },
  checkBtnTextNA: {
    color: "#475569"
  },
  inputGroup: {
    marginBottom: 12
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6
  },
  textInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#0f172a"
  },
  textArea: {
    minHeight: 65,
    textAlignVertical: "top"
  },
  fuelSelectorRow: {
    flexDirection: "row",
    gap: 6
  },
  fuelBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center"
  },
  fuelBtnActive: {
    backgroundColor: "#102A43",
    borderColor: "#102A43"
  },
  fuelBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569"
  },
  fuelBtnTextActive: {
    color: "#ffffff"
  },
  actionSelectorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1"
  },
  actionBtnActive: {
    backgroundColor: "#102A43",
    borderColor: "#102A43"
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569"
  },
  actionBtnTextActive: {
    color: "#ffffff"
  },
  actionToolbar: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8
  },
  saveDraftBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#102A43",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6
  },
  saveDraftBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#102A43"
  },
  previewBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f9ff",
    borderWidth: 1.5,
    borderColor: "#0284c7",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6
  },
  previewBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0284c7"
  },
  submitBtn: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#102A43",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
    shadowColor: "#102A43",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  },
  submitBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#ffffff"
  },

  // Modal / Bottom Sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end"
  },
  bottomSheetContainer: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingBottom: Platform.OS === "ios" ? 30 : 16
  },
  bottomSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0"
  },
  bottomSheetTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#102A43"
  },
  bottomSheetSubtitle: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2
  },
  modalCloseBtn: {
    padding: 4
  },
  bottomSheetBody: {
    padding: 16
  },
  modalInputGroup: {
    marginBottom: 14
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6
  },
  modalTextInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#0f172a"
  },
  damageTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  damageTypePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  damageTypePillActive: {
    backgroundColor: "#102A43",
    borderColor: "#102A43"
  },
  damageTypePillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569"
  },
  damageTypePillTextActive: {
    color: "#ffffff"
  },
  severityRow: {
    flexDirection: "row",
    gap: 8
  },
  severityBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1"
  },
  sevDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  severityBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569"
  },
  preExistingToggleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fefce8",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fef08a",
    marginBottom: 14
  },
  toggleTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#854d0e"
  },
  toggleSubtitle: {
    fontSize: 10,
    color: "#a16207",
    marginTop: 2
  },
  photoThumbContainer: {
    position: "relative",
    marginRight: 10
  },
  photoThumbnail: {
    width: 65,
    height: 65,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1"
  },
  removePhotoBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#ffffff",
    borderRadius: 10
  },
  addPhotoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd"
  },
  addPhotoBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0284c7"
  },
  bottomSheetFooter: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0"
  },
  modalDeleteBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#fee2e2"
  },
  modalDeleteBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ef4444"
  },
  modalSaveBtn: {
    flex: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#102A43"
  },
  modalSaveBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff"
  },

  // Preview Modal
  previewModalContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingTop: Platform.OS === "ios" ? 44 : 20
  },
  previewModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0"
  },
  previewModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#102A43"
  },
  previewDossierCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#cbd5e1"
  },
  dossierTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#102A43",
    textAlign: "center"
  },
  dossierSubtitle: {
    fontSize: 11,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 12
  },
  dossierMetaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  dossierMetaItem: {
    width: "48%"
  },
  dossierMetaLabel: {
    fontSize: 9,
    color: "#94a3b8",
    fontWeight: "700"
  },
  dossierMetaVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1e293b"
  },
  dossierDivider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 12
  },
  dossierSectionHeader: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 8
  },
  dossierMarkerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9"
  },
  dossierMarkerNum: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0284c7"
  },
  dossierMarkerPart: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1e293b"
  },
  dossierMarkerDesc: {
    fontSize: 10,
    color: "#64748b"
  },
  dossierMarkerCost: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669"
  },
  dossierTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1.5,
    borderTopColor: "#102A43"
  },
  dossierTotalLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#102A43"
  },
  dossierTotalVal: {
    fontSize: 13,
    fontWeight: "900",
    color: "#059669"
  },
  dossierText: {
    fontSize: 11,
    color: "#334155",
    marginBottom: 4
  },
  previewFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0"
  },
  previewCloseBtn: {
    backgroundColor: "#102A43",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center"
  },
  previewCloseBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13
  },

  // Confirm Modal
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20
  },
  confirmModalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 380,
    alignItems: "center"
  },
  confirmIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#102A43",
    textAlign: "center"
  },
  confirmMessage: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 19
  },
  confirmActionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    width: "100%"
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    alignItems: "center"
  },
  confirmCancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569"
  },
  confirmSubmitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#102A43",
    alignItems: "center"
  },
  confirmSubmitBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff"
  },

  // Lightbox
  lightboxOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center"
  },
  lightboxCloseBtn: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10
  },
  lightboxImage: {
    width: "90%",
    height: "80%"
  }
});
