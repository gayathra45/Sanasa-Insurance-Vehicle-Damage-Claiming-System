"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { API_URL } from "../../config";
import SimpleLoader from "@/app/Components/SimpleLoader";
import PolicyHolderFooter from "@/app/Components/Policy_Holder/footer";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Car01Icon,
  ShieldCheckIcon,
  File01Icon,
  Upload01Icon,
  UserCheck01Icon,
  Alert02Icon,
  ViewIcon,
  ArrowRight01Icon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
  Clock01Icon,
  CreditCardIcon,
  Logout01Icon,
  Camera01Icon,
  Call02Icon,
  Building04Icon,
  UserIcon,
  Analytics01Icon,
  AlertCircleIcon,
  Notification01Icon,
  Globe02Icon,
  ArrowDown01Icon,
  BubbleChatIcon,
  SecurityCheckIcon,
  Location01Icon,
  MapIcon,
  Search01Icon,
  Gps01Icon,
  Calendar03Icon,
  PlayIcon,
  Tick01Icon,
  Loading03Icon
} from "@hugeicons/core-free-icons";
import { getVehicleIconSvg, getVehicleIconContainer, getVehicleTheme } from "@/app/Components/VehicleIcon";
import DriverClaimChat from "@/app/Components/ClaimChat/DriverClaimChat";
import { compressImage } from "@/app/utils/imageCompressor";

function cleanCountry(country?: string): string {
  if (!country) return "Sri Lanka";
  const c = country.toLowerCase();
  if (c.includes("ශ්‍රී ලංකා") || c.includes("இலங்கை") || c.includes("lanka")) {
    return "Sri Lanka";
  }
  return country;
}

function formatPhotonResult(f: any): any {
  const props = f.properties || {};
  const coords = f.geometry?.coordinates || [0, 0];
  const parts = [];
  if (props.name) parts.push(props.name);
  if (props.housenumber && props.street) {
    parts.push(`${props.housenumber} ${props.street}`);
  } else if (props.street) {
    parts.push(props.street);
  } else if (props.housenumber) {
    parts.push(props.housenumber);
  }
  if (props.locality) {
    const loc = props.locality.split(";")[0].trim();
    if (loc) parts.push(loc);
  }
  if (props.district) parts.push(props.district);
  if (props.city) parts.push(props.city);
  if (props.county) parts.push(props.county);
  if (props.state) parts.push(props.state);
  if (props.postcode) parts.push(props.postcode);
  if (props.country) {
    parts.push(cleanCountry(props.country));
  } else {
    parts.push("Sri Lanka");
  }
  const displayName = parts.filter((v, i, self) => self.indexOf(v) === i).join(", ");
  return formatDisplayNameWithCategory({
    display_name: displayName,
    lat: coords[1].toString(),
    lon: coords[0].toString(),
    category_key: props.osm_key,
    category_value: props.osm_value
  });
}

function formatDisplayNameWithCategory(item: any): any {
  if (!item || !item.display_name) return item;
  const key = (item.category_key || "").toLowerCase();
  const value = (item.category_value || "").toLowerCase();
  const parts = item.display_name.split(",");
  let firstName = parts[0]?.trim() || "";
  const firstNameLower = firstName.toLowerCase();
  let modified = false;

  if (key === "railway" && value === "station") {
    if (!firstNameLower.includes("station") && !firstNameLower.includes("railway")) {
      firstName += " Railway Station";
      modified = true;
    }
  } else if (key === "amenity" && value === "police") {
    if (!firstNameLower.includes("police")) {
      firstName += " Police Station";
      modified = true;
    }
  } else if (key === "amenity" && (value === "bus_station" || value === "bus_stop")) {
    if (!firstNameLower.includes("bus")) {
      firstName += value === "bus_stop" ? " Bus Stop" : " Bus Station";
      modified = true;
    }
  } else if (key === "amenity" && value === "hospital") {
    if (!firstNameLower.includes("hospital")) {
      firstName += " Hospital";
      modified = true;
    }
  }
  if (modified) {
    parts[0] = firstName;
    item.display_name = parts.join(", ");
  }
  return item;
}

function areCoordsClose(lat1: string, lon1: string, lat2: string, lon2: string): boolean {
  const threshold = 0.0005; // approx 50m
  return (
    Math.abs(parseFloat(lat1) - parseFloat(lat2)) < threshold &&
    Math.abs(parseFloat(lon1) - parseFloat(lon2)) < threshold
  );
}

function areNamesSimilar(n1: string, n2: string): boolean {
  const name1 = n1.split(",")[0].toLowerCase().trim();
  const name2 = n2.split(",")[0].toLowerCase().trim();
  if (name1 === name2) return true;
  if (name1.includes(name2) || name2.includes(name1)) return true;
  return false;
}

function getResultScore(item: any, queryWords: string[]): number {
  const key = (item.category_key || "").toLowerCase();
  const value = (item.category_value || "").toLowerCase();
  const firstPart = item.display_name.split(",")[0].toLowerCase();
  const restPart = item.display_name.split(",").slice(1).join(",").toLowerCase();

  let score = 0;
  for (const word of queryWords) {
    if (firstPart.includes(word)) score += 25;
    else if (restPart.includes(word)) score += 5;
  }
  if (queryWords.length > 0 && firstPart.includes(queryWords[0])) score += 30;
  const queryStr = queryWords.join(" ");
  if (firstPart === queryStr) score += 40;
  if (queryWords.includes("railway") || queryWords.includes("train")) {
    if (key === "railway") score += 30;
  }
  return score;
}

function getMinMaxDates() {
  const today = new Date();
  const lastWeek = new Date();
  lastWeek.setDate(today.getDate() - 7);

  const formatDateStr = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  return {
    max: formatDateStr(today),
    min: formatDateStr(lastWeek)
  };
}

function getVehicleEmoji(type?: string): string {
  if (!type) return "🚗";
  const t = type.toLowerCase().trim();
  if (t.includes("suv")) return "🚙";
  if (t.includes("cab") || t.includes("pickup")) return "🛻";
  if (t.includes("van") || t.includes("minibus")) return "🚐";
  if (t.includes("bike") || t.includes("motorcycle") || t.includes("scooter")) return "🏍️";
  if (t.includes("three") || t.includes("rickshaw") || t.includes("tuk")) return "🛺";
  if (t.includes("lorry") || t.includes("truck")) return "🚛";
  if (t.includes("bus")) return "🚌";
  if (t.includes("tractor")) return "🚜";
  return "🚗";
}

const DAMAGE_TYPES = [
  "Front Bumper / Grille Damage",
  "Rear Bumper Damage",
  "Side Scratch / Dent (Left/Right)",
  "Windshield / Glass Crack",
  "Engine / Mechanical Failure",
  "Suspension Damage",
  "Total Loss / Rollover",
  "Other Accident Damage"
];

interface AuthorizedVehicle {
  numberPlate: string;
  vehicleType?: string;
  model?: string;
  company?: string;
  year?: string;
  policyNumber?: string;
  policyExpiryDate?: string;
  coverageStatus?: string;
  authorizedSince?: string;
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
  approvalDate: string;
  status: string;
  authorizedVehicles: AuthorizedVehicle[];
  verificationToken: string;
}

interface ClaimRecord {
  claimNumber: string;
  vehiclePlate: string;
  incidentDate: string;
  incidentTime?: string;
  damageType: string;
  location: string;
  status: string;
  currentStep: number;
  createdAt: string;
  description?: string;
  documentsCount?: number;
  hasInspectionReport?: boolean;
}

interface ClaimDetail extends ClaimRecord {
  branch?: string;
  submittedByDriver?: {
    isThirdParty: boolean;
    driverName: string;
    driverNic: string;
    driverPhone: string;
  };
  accidentPhotos?: {
    front?: string[];
    rear?: string[];
    side?: string[];
  };
  drivingLicense?: {
    front?: string[];
    rear?: string[];
  };
  additionalDocuments?: {
    name: string;
    url: string;
    uploadedAt: string;
    uploadedBy?: string;
  }[];
  requestedDocuments?: string[];
  documentsRequested?: boolean;
  messages?: {
    sender: string;
    message: string;
    sentAt: string;
  }[];
}

export interface DriverNotification {
  id: string;
  type: "authorization" | "claim_status" | "document_request" | "chat_message";
  category: "approved" | "urgent" | "status" | "message";
  title: string;
  message: string;
  subText?: string;
  createdAt: string;
  claimNumber?: string;
  actionType: "pass" | "view_claim" | "upload_doc" | "chat";
  actionLabel: string;
  isUrgent: boolean;
}

type TabType = "home" | "notifications" | "vehicles" | "new_claim" | "my_claims" | "chat" | "documents" | "digital_pass";

function formatPlate(plate: string): string {
  if (!plate) return "";
  const cleaned = plate.trim();
  if (cleaned.includes("-")) return cleaned.toUpperCase();
  const m = cleaned.match(/^(.*[A-Za-z]+)(\d+)$/);
  if (m) return `${m[1].trim().toUpperCase()}-${m[2]}`;
  return cleaned.toUpperCase();
}

const driverAccessTranslations = {
  en: {
    hotline: "24H Customer Hotline: +94 112 003 000",
    branch: "Branch",
    callBranch: "Call Branch",
    branches: "Branch Contacts",
    branchDirectoryTitle: "Sanasa Regional Branch Contacts & Hotlines",
    branchSearchPlaceholder: "Search city, branch name or district...",
    branchNumber: "Direct Line",
    accessibility: "Accessibility",
    authorizedDriver: "AUTHORIZED DRIVER",
    home: "Home",
    notifications: "Notifications",
    vehicles: "My Vehicles",
    newClaim: "Apply Claim",
    myClaims: "My Claims",
    liveChat: "Live Support",
    digitalPass: "Digital Pass",
    documents: "Documents",
    close: "Close",
    selectThisBranch: "Set as Active Branch",
    activeBranchBadge: "Designated Branch",
    directLines: "Direct Lines",
    address: "Address",
    hours: "Hours",
    quickCall: "Call Now",
    callHotline: "24/7 Hotline"
  },
  si: {
    hotline: "24 පැය පාරිභෝගික සේවය: +94 112 003 000",
    branch: "ශාඛාව",
    callBranch: "ශාඛාව අමතන්න",
    branches: "ශාඛා අංක",
    branchDirectoryTitle: "සනස රක්ෂණ ශාඛා දුරකථන නාමාවලිය",
    branchSearchPlaceholder: "නගරය හෝ ශාඛාවේ නම සොයන්න...",
    branchNumber: "සෘජු අංකය",
    accessibility: "ප්‍රවේශ්‍යතාව",
    authorizedDriver: "බලයලත් රියදුරු",
    home: "මුල් පිටුව",
    notifications: "දැනුම්දීම්",
    vehicles: "මගේ වාහන",
    newClaim: "අලුත් හිමිකම්",
    myClaims: "මගේ හිමිකම්",
    liveChat: "සජීවී සහාය",
    digitalPass: "ඩිජිටල් බලපත්‍රය",
    documents: "ලේඛන",
    close: "වසන්න",
    selectThisBranch: "ක්‍රියාකාරී ශාඛාව ලෙස තෝරන්න",
    activeBranchBadge: "නියමිත ශාඛාව",
    directLines: "සෘජු දුරකථන අංක",
    address: "ලිපිනය",
    hours: "වේලාවන්",
    quickCall: "දැන් අමතන්න",
    callHotline: "24/7 ක්ෂණික ඇමතුම්"
  },
  ta: {
    hotline: "24 மணி நேர வாடிக்கையாளர் சேவை: +94 112 003 000",
    branch: "கிளை",
    callBranch: "கிளையை அழைக்க",
    branches: "கிளை எண்கள்",
    branchDirectoryTitle: "சனச கிளை தொலைபேசி அடைவு மற்றும் எண்கள்",
    branchSearchPlaceholder: "நகரம் அல்லது கிளைப் பெயரைத் தேடுக...",
    branchNumber: "நேரடி எண்",
    accessibility: "அணுகல்தன்மை",
    authorizedDriver: "அங்கீகரிக்கப்பட்ட ஓட்டுநர்",
    home: "முகப்பு",
    notifications: "அறிவிப்புகள்",
    vehicles: "என் வாகனங்கள்",
    newClaim: "புதிய கோரிக்கை",
    myClaims: "என் கோரிக்கைகள்",
    liveChat: "நேரடி உதவி",
    digitalPass: "டிஜிட்டல் அனுமதி",
    documents: "ஆவணங்கள்",
    close: "மூடு",
    selectThisBranch: "செயலில் உள்ள கிளையாக அமைக்கவும்",
    activeBranchBadge: "நியமிக்கப்பட்ட கிளை",
    directLines: "நேரடி எண்கள்",
    address: "முகவரி",
    hours: "நேரம்",
    quickCall: "இப்போது அழைக்கவும்",
    callHotline: "24/7 அவசர உதவி"
  }
};

const SANASA_BRANCHES = [
  {
    id: "colombo",
    name: { en: "Colombo Head Office", si: "කොළඹ ප්‍රධාන කාර්යාලය", ta: "கொழும்பு தலைமை அலுவலகம்" },
    city: "Colombo",
    phone: "+94 112 003 000",
    directLines: ["+94 112 003 001", "+94 112 003 002"],
    address: "No: 172, Elvitigala Mawatha, Colombo 08",
    email: "colombo@sanasainsurance.lk",
    hours: "8:30 AM - 5:00 PM (Mon - Fri)"
  },
  {
    id: "galle",
    name: { en: "Galle Branch", si: "ගාල්ල ශාඛාව", ta: "காலி கிளை" },
    city: "Galle",
    phone: "+94 912 245 800",
    directLines: ["+94 912 245 801"],
    address: "No: 48, Galle Road, Galle",
    email: "galle@sanasainsurance.lk",
    hours: "8:30 AM - 5:00 PM (Mon - Fri)"
  },
  {
    id: "kandy",
    name: { en: "Kandy Branch", si: "මහනුවර ශාඛාව", ta: "கண்டி கிளை" },
    city: "Kandy",
    phone: "+94 812 223 456",
    directLines: ["+94 812 223 457"],
    address: "William Gopallawa Mawatha, Kandy",
    email: "kandy@sanasainsurance.lk",
    hours: "8:30 AM - 5:00 PM (Mon - Fri)"
  },
  {
    id: "matara",
    name: { en: "Matara Branch", si: "මාතර ශාඛාව", ta: "மாத்தறை கிளை" },
    city: "Matara",
    phone: "+94 412 222 333",
    directLines: ["+94 412 222 334"],
    address: "Anagarika Dharmapala Mawatha, Matara",
    email: "matara@sanasainsurance.lk",
    hours: "8:30 AM - 5:00 PM (Mon - Fri)"
  },
  {
    id: "kurunegala",
    name: { en: "Kurunegala Branch", si: "කුරුණෑගල ශාඛාව", ta: "குருணாகல் கிளை" },
    city: "Kurunegala",
    phone: "+94 372 222 111",
    directLines: ["+94 372 222 112"],
    address: "Colombo Road, Kurunegala",
    email: "kurunegala@sanasainsurance.lk",
    hours: "8:30 AM - 5:00 PM (Mon - Fri)"
  },
  {
    id: "jaffna",
    name: { en: "Jaffna Branch", si: "යාපනය ශාඛාව", ta: "யாழ்ப்பாணம் கிளை" },
    city: "Jaffna",
    phone: "+94 212 222 789",
    directLines: ["+94 212 222 790"],
    address: "Hospital Road, Jaffna",
    email: "jaffna@sanasainsurance.lk",
    hours: "8:30 AM - 5:00 PM (Mon - Fri)"
  },
  {
    id: "gampaha",
    name: { en: "Gampaha Branch", si: "ගම්පහ ශාඛාව", ta: "கம்பஹா கிளை" },
    city: "Gampaha",
    phone: "+94 332 222 000",
    directLines: ["+94 332 222 001"],
    address: "Ja-Ela Road, Gampaha",
    email: "gampaha@sanasainsurance.lk",
    hours: "8:30 AM - 5:00 PM (Mon - Fri)"
  },
  {
    id: "anuradhapura",
    name: { en: "Anuradhapura Branch", si: "අනුරාධපුර ශාඛාව", ta: "அனுராதபுரம் கிளை" },
    city: "Anuradhapura",
    phone: "+94 252 222 555",
    directLines: ["+94 252 222 556"],
    address: "Maithripala Senanayake Mawatha, Anuradhapura",
    email: "anuradhapura@sanasainsurance.lk",
    hours: "8:30 AM - 5:00 PM (Mon - Fri)"
  },
  {
    id: "kalutara",
    name: { en: "Kalutara Branch", si: "කළුතර ශාඛාව", ta: "களுத்துறை கிளை" },
    city: "Kalutara",
    phone: "+94 342 222 777",
    directLines: ["+94 342 222 778"],
    address: "Galle Road, Kalutara",
    email: "kalutara@sanasainsurance.lk",
    hours: "8:30 AM - 5:00 PM (Mon - Fri)"
  },
  {
    id: "badulla",
    name: { en: "Badulla Branch", si: "බදුල්ල ශාඛාව", ta: "பதுளை கிளை" },
    city: "Badulla",
    phone: "+94 552 222 999",
    directLines: ["+94 552 222 998"],
    address: "Bandarawela Road, Badulla",
    email: "badulla@sanasainsurance.lk",
    hours: "8:30 AM - 5:00 PM (Mon - Fri)"
  },
  {
    id: "ratnapura",
    name: { en: "Ratnapura Branch", si: "රත්නපුර ශාඛාව", ta: "இரத்தினபுரி கிளை" },
    city: "Ratnapura",
    phone: "+94 452 222 444",
    directLines: ["+94 452 222 445"],
    address: "Main Street, Ratnapura",
    email: "ratnapura@sanasainsurance.lk",
    hours: "8:30 AM - 5:00 PM (Mon - Fri)"
  },
  {
    id: "negombo",
    name: { en: "Negombo Branch", si: "මීගමුව ශාඛාව", ta: "நீர்கொழும்பு கிளை" },
    city: "Negombo",
    phone: "+94 312 222 888",
    directLines: ["+94 312 222 889"],
    address: "Greens Road, Negombo",
    email: "negombo@sanasainsurance.lk",
    hours: "8:30 AM - 5:00 PM (Mon - Fri)"
  }
];

export default function ThirdPartyDriverPortalPage() {
  const params = useParams();
  const token = params?.token as string;

  // Session & Auth
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedOut, setIsLoggedOut] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>("home");

  // Language, Accessibility & Branch Hotline options
  const [lang, setLang] = useState<"en" | "si" | "ta">("en");
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [branchSearchQuery, setBranchSearchQuery] = useState("");
  const [selectedBranchOverride, setSelectedBranchOverride] = useState<string>("");

  useEffect(() => {
    const savedLang = localStorage.getItem("language") as "en" | "si" | "ta";
    if (savedLang && (savedLang === "en" || savedLang === "si" || savedLang === "ta")) {
      setLang(savedLang);
    }
  }, []);

  const changeLanguage = (newLang: "en" | "si" | "ta") => {
    setLang(newLang);
    localStorage.setItem("language", newLang);
    window.dispatchEvent(new CustomEvent("language-changed", { detail: newLang }));
    window.dispatchEvent(new Event("languageChange"));
    setLangMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Portal Data
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [vehicles, setVehicles] = useState<AuthorizedVehicle[]>([]);
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(false);

  // Notifications State
  const [notifications, setNotifications] = useState<DriverNotification[]>([]);
  const [readNotifIds, setReadNotifIds] = useState<string[]>([]);
  const [notifFilter, setNotifFilter] = useState<"all" | "unread" | "urgent">("all");
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  // Claim Details Modal
  const [selectedClaim, setSelectedClaim] = useState<ClaimDetail | null>(null);
  const [loadingClaimModal, setLoadingClaimModal] = useState(false);

  // Claim Submission Form States (Full PolicyHolder New_Claim Parity)
  const [claimStep, setClaimStep] = useState<1 | 2>(1);
  const [claimPlate, setClaimPlate] = useState("");
  const [claimDate, setClaimDate] = useState("");
  const [claimTime, setClaimTime] = useState("");
  const [claimDamageType, setClaimDamageType] = useState("");
  const [claimDesc, setClaimDesc] = useState("");
  const [address, setAddress] = useState("Colombo, Sri Lanka");
  const [isLocating, setIsLocating] = useState(false);
  const [latitude, setLatitude] = useState(6.9271);
  const [longitude, setLongitude] = useState(79.8612);
  const [initialCoords, setInitialCoords] = useState({ latitude: 6.9271, longitude: 79.8612 });
  const [modalInitialCoords, setModalInitialCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResultsDropdown, setShowResultsDropdown] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);

  // Other Vehicles Involved State
  const [otherVehiclesInvolved, setOtherVehiclesInvolved] = useState<"yes" | "no" | "">("");
  const [otherVehiclesCount, setOtherVehiclesCount] = useState<number>(0);
  const [otherVehicles, setOtherVehicles] = useState<{
    vehiclePlate: string;
    insuranceCompany: string;
    policyNumber: string;
    driverName: string;
    licensePhotosPreviews: string[];
    licensePhotosBase64: string[];
    vehiclePhotosPreviews: string[];
    vehiclePhotosBase64: string[];
  }[]>([]);

  // Step 2 Document Upload States
  interface FileUploadState {
    files: File[];
    previews: string[];
  }
  const [accidentFront, setAccidentFront] = useState<FileUploadState>({ files: [], previews: [] });
  const [accidentRear, setAccidentRear] = useState<FileUploadState>({ files: [], previews: [] });
  const [accidentSide, setAccidentSide] = useState<FileUploadState>({ files: [], previews: [] });
  const [licenseFront, setLicenseFront] = useState<FileUploadState>({ files: [], previews: [] });
  const [licenseRear, setLicenseRear] = useState<FileUploadState>({ files: [], previews: [] });
  const [duplicatesMap, setDuplicatesMap] = useState<Record<string, any>>({});
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);

  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [claimFormError, setClaimFormError] = useState("");
  const [submittedClaimNumber, setSubmittedClaimNumber] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const { min: minDate, max: maxDate } = getMinMaxDates();

  const accidentFrontRef = React.useRef<HTMLInputElement>(null);
  const accidentRearRef = React.useRef<HTMLInputElement>(null);
  const accidentSideRef = React.useRef<HTMLInputElement>(null);
  const licenseFrontRef = React.useRef<HTMLInputElement>(null);
  const licenseRearRef = React.useRef<HTMLInputElement>(null);

  // Document Upload States
  const [uploadTargetClaim, setUploadTargetClaim] = useState("");
  const [docName, setDocName] = useState("");
  const [docFileBase64, setDocFileBase64] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docUploadSuccess, setDocUploadSuccess] = useState("");
  const [docUploadError, setDocUploadError] = useState("");

  // Toast
  const [toastMessage, setToastMessage] = useState("");

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  // 1. Establish Restricted Driver Session on Mount
  useEffect(() => {
    if (!token) return;

    const initSession = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/third-party/driver-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: token.trim() })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to establish secure driver session.");
        }

        setSessionToken(data.sessionToken);
        sessionStorage.setItem(`sanasa_tp_session_${token}`, data.sessionToken);

        await loadInitialData(data.sessionToken);
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred while connecting to the portal.");
      } finally {
        setLoading(false);
      }
    };

    initSession();
  }, [token]);

  // Load Driver Data
  const fetchDriverNotifications = async (sToken?: string) => {
    const activeToken = sToken || sessionToken;
    if (!activeToken) return;
    try {
      setLoadingNotifs(true);
      const res = await fetch(`${API_URL}/third-party/portal/notifications`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (res.ok) {
        const notifData = await res.json();
        if (Array.isArray(notifData.notifications)) {
          setNotifications(notifData.notifications);
        }
      }
    } catch (e) {
      console.warn("Failed to load driver notifications:", e);
    } finally {
      setLoadingNotifs(false);
    }
  };

  const loadInitialData = async (sToken: string) => {
    try {
      // Load saved read notification IDs
      if (typeof window !== "undefined" && token) {
        try {
          const savedRead = localStorage.getItem(`sanasa_tp_read_notifs_${token}`);
          if (savedRead) {
            setReadNotifIds(JSON.parse(savedRead));
          }
        } catch (_) {}
      }

      const [meRes, vehRes, claimsRes, notifRes] = await Promise.all([
        fetch(`${API_URL}/third-party/portal/me`, {
          headers: { Authorization: `Bearer ${sToken}` }
        }),
        fetch(`${API_URL}/third-party/portal/vehicles`, {
          headers: { Authorization: `Bearer ${sToken}` }
        }),
        fetch(`${API_URL}/third-party/portal/claims`, {
          headers: { Authorization: `Bearer ${sToken}` }
        }),
        fetch(`${API_URL}/third-party/portal/notifications`, {
          headers: { Authorization: `Bearer ${sToken}` }
        })
      ]);

      if (meRes.ok) {
        const meData = await meRes.json();
        setProfile(meData.profile);
      }
      if (vehRes.ok) {
        const vehData = await vehRes.json();
        setVehicles(vehData.vehicles || []);
        if (vehData.vehicles?.length > 0 && !claimPlate) {
          setClaimPlate(vehData.vehicles[0].numberPlate);
        }
      }
      if (claimsRes.ok) {
        const claimsData = await claimsRes.json();
        setClaims(claimsData.claims || []);
      }
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        if (Array.isArray(notifData.notifications)) {
          setNotifications(notifData.notifications);
        }
      }
    } catch (e) {
      console.error("Failed to load initial driver data:", e);
    }
  };

  // Periodic notifications & claims refresh
  useEffect(() => {
    if (!sessionToken) return;
    const interval = setInterval(() => {
      fetchDriverNotifications();
    }, 12000);
    return () => clearInterval(interval);
  }, [sessionToken]);

  const markAsRead = (id: string) => {
    if (readNotifIds.includes(id)) return;
    const updated = [...readNotifIds, id];
    setReadNotifIds(updated);
    if (typeof window !== "undefined" && token) {
      try {
        localStorage.setItem(`sanasa_tp_read_notifs_${token}`, JSON.stringify(updated));
      } catch (_) {}
    }
  };

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadNotifIds(allIds);
    if (typeof window !== "undefined" && token) {
      try {
        localStorage.setItem(`sanasa_tp_read_notifs_${token}`, JSON.stringify(allIds));
      } catch (_) {}
    }
    triggerToast("All notifications marked as read.");
  };

  const handleNotificationAction = (notif: DriverNotification) => {
    if (notif.actionType === "pass") {
      setActiveTab("digital_pass");
    } else if (notif.actionType === "view_claim") {
      if (notif.claimNumber) {
        handleOpenClaimDetails(notif.claimNumber);
      } else {
        setActiveTab("my_claims");
      }
    } else if (notif.actionType === "upload_doc") {
      if (notif.claimNumber) {
        setUploadTargetClaim(notif.claimNumber);
        setActiveTab("documents");
      } else {
        setActiveTab("documents");
      }
    } else if (notif.actionType === "chat") {
      if (notif.claimNumber) {
        handleOpenClaimDetails(notif.claimNumber);
      } else {
        setActiveTab("my_claims");
      }
    }
  };

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !readNotifIds.includes(n.id)).length;
  }, [notifications, readNotifIds]);

  const urgentCount = useMemo(() => {
    return notifications.filter((n) => n.isUrgent).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (notifFilter === "unread") {
      return notifications.filter((n) => !readNotifIds.includes(n.id));
    }
    if (notifFilter === "urgent") {
      return notifications.filter((n) => n.isUrgent);
    }
    return notifications;
  }, [notifications, readNotifIds, notifFilter]);


  const refreshClaims = async () => {
    if (!sessionToken) return;
    setLoadingClaims(true);
    try {
      const res = await fetch(`${API_URL}/third-party/portal/claims`, {
        headers: { Authorization: `Bearer ${sessionToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setClaims(data.claims || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingClaims(false);
    }
  };

  const handleOpenClaimDetails = async (claimNum: string) => {
    if (!sessionToken) return;
    setLoadingClaimModal(true);
    try {
      const res = await fetch(`${API_URL}/third-party/portal/claims/${claimNum}`, {
        headers: { Authorization: `Bearer ${sessionToken}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load claim details.");
      setSelectedClaim(data.claim);
      setUploadTargetClaim(claimNum);
    } catch (err: any) {
      triggerToast(err.message || "Failed to open claim details.");
    } finally {
      setLoadingClaimModal(false);
    }
  };

  const handleImageFile = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      triggerToast("Photo size exceeds 5MB limit. Please upload a smaller image.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setter(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Message listener for location select from map iframe
  useEffect(() => {
    const handleMapMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data.latitude && data.longitude) {
          setLatitude(data.latitude);
          setLongitude(data.longitude);
          reverseGeocode(data.latitude, data.longitude);
        }
      } catch (err) {}
    };

    window.addEventListener("message", handleMapMessage);
    return () => window.removeEventListener("message", handleMapMessage);
  }, []);

  // Autocomplete suggestions debouncer
  useEffect(() => {
    if (!isUserTyping || !address || address.trim() === "" || address === "Colombo, Sri Lanka") {
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      geocodeAddressForSuggestions(address);
    }, 250);
    return () => clearTimeout(delayDebounceFn);
  }, [address, isUserTyping]);

  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
        {
          headers: {
            "Accept-Language": "en",
            "User-Agent": "SanasaInsuranceWebApp/1.0 (contact: support@sanasainsurance.lk)"
          }
        }
      );
      const data = await res.json();
      if (data && data.display_name) {
        setAddress(data.display_name);
      } else {
        setAddress(`${lat.toFixed(6)}, ${lon.toFixed(6)}`);
      }
    } catch (geocodeError) {
      setAddress(`${lat.toFixed(6)}, ${lon.toFixed(6)}`);
    }
  };

  const geocodeAddressForSuggestions = async (addrStr: string) => {
    if (!addrStr || addrStr.trim() === "") return;
    const bbox = "78.5,5.5,82.5,10.5";
    const headers = {
      "User-Agent": "SanasaInsuranceWebApp/1.0 (contact: support@sanasainsurance.lk)"
    };
    const variations = [addrStr];
    const qLower = addrStr.toLowerCase();
    const queryWords = qLower.split(/\s+/).filter((w) => w.length > 0);
    if ((qLower.includes("railway") || qLower.includes("train") || qLower.includes("police") || qLower.includes("bus")) && !qLower.includes("station") && !qLower.includes("stand")) {
      variations.push(addrStr + " station");
    }

    try {
      const fetchPromises = [];
      for (const qVar of variations) {
        const urlNominatim = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(qVar)}&limit=20&countrycodes=lk`;
        const urlPhoton = `https://photon.komoot.io/api/?q=${encodeURIComponent(qVar)}&limit=20&bbox=${bbox}&lang=en`;
        fetchPromises.push(
          fetch(urlNominatim, { headers }).then((r) => r.json().catch(() => [])),
          fetch(urlPhoton).then((r) => r.json().catch(() => ({ features: [] })))
        );
      }
      const fetchResults = await Promise.all(fetchPromises);
      let combined: any[] = [];
      for (let i = 0; i < fetchResults.length; i++) {
        const isPhotonResult = i % 2 === 1;
        const data = fetchResults[i];
        if (isPhotonResult) {
          combined = [...combined, ...(data.features || []).map(formatPhotonResult)];
        } else {
          combined = [...combined, ...(data || []).map((r: any) => formatDisplayNameWithCategory({
            display_name: r.display_name,
            lat: r.lat,
            lon: r.lon,
            category_key: r.class,
            category_value: r.type
          }))];
        }
      }
      combined.sort((a, b) => getResultScore(b, queryWords) - getResultScore(a, queryWords));
      const deduplicated: any[] = [];
      for (const item of combined) {
        const exists = deduplicated.some((d) =>
          (areCoordsClose(d.lat, d.lon, item.lat, item.lon) && areNamesSimilar(d.display_name, item.display_name)) ||
          d.display_name.toLowerCase() === item.display_name.toLowerCase()
        );
        if (!exists) deduplicated.push(item);
      }
      if (deduplicated.length > 0) {
        setSearchResults(deduplicated);
        setShowResultsDropdown(true);
      } else {
        setSearchResults([]);
        setShowResultsDropdown(false);
      }
    } catch (err) {
      console.warn("Suggestions geocoding failed:", err);
    }
  };

  const geocodeAddress = async (addrStr: string) => {
    if (!addrStr || addrStr.trim() === "") return;
    setIsUserTyping(false);
    setShowResultsDropdown(false);
    const bbox = "78.5,5.5,82.5,10.5";
    const headers = {
      "User-Agent": "SanasaInsuranceWebApp/1.0 (contact: support@sanasainsurance.lk)"
    };
    const variations = [addrStr];
    const qLower = addrStr.toLowerCase();
    const queryWords = qLower.split(/\s+/).filter((w) => w.length > 0);
    if ((qLower.includes("railway") || qLower.includes("train") || qLower.includes("police") || qLower.includes("bus")) && !qLower.includes("station") && !qLower.includes("stand")) {
      variations.push(addrStr + " station");
    }

    try {
      const fetchPromises = [];
      for (const qVar of variations) {
        const urlNominatim = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(qVar)}&limit=20&countrycodes=lk`;
        const urlPhoton = `https://photon.komoot.io/api/?q=${encodeURIComponent(qVar)}&limit=20&bbox=${bbox}&lang=en`;
        fetchPromises.push(
          fetch(urlNominatim, { headers }).then((r) => r.json().catch(() => [])),
          fetch(urlPhoton).then((r) => r.json().catch(() => ({ features: [] })))
        );
      }
      const fetchResults = await Promise.all(fetchPromises);
      let combined: any[] = [];
      for (let i = 0; i < fetchResults.length; i++) {
        const isPhotonResult = i % 2 === 1;
        const data = fetchResults[i];
        if (isPhotonResult) {
          combined = [...combined, ...(data.features || []).map(formatPhotonResult)];
        } else {
          combined = [...combined, ...(data || []).map((r: any) => formatDisplayNameWithCategory({
            display_name: r.display_name,
            lat: r.lat,
            lon: r.lon,
            category_key: r.class,
            category_value: r.type
          }))];
        }
      }
      combined.sort((a, b) => getResultScore(b, queryWords) - getResultScore(a, queryWords));
      const deduplicated: any[] = [];
      for (const item of combined) {
        const exists = deduplicated.some((d) =>
          (areCoordsClose(d.lat, d.lon, item.lat, item.lon) && areNamesSimilar(d.display_name, item.display_name)) ||
          d.display_name.toLowerCase() === item.display_name.toLowerCase()
        );
        if (!exists) deduplicated.push(item);
      }

      if (deduplicated.length > 0) {
        setSearchResults(deduplicated);
        setShowResultsDropdown(true);
        const lat = parseFloat(deduplicated[0].lat);
        const lon = parseFloat(deduplicated[0].lon);
        setLatitude(lat);
        setLongitude(lon);
        setInitialCoords({ latitude: lat, longitude: lon });
        setAddress(deduplicated[0].display_name);

        const iframe = document.getElementById("map-iframe") as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(JSON.stringify({ latitude: lat, longitude: lon }), "*");
        }
        const modalIframe = document.getElementById("modal-map-iframe") as HTMLIFrameElement;
        if (modalIframe && modalIframe.contentWindow) {
          modalIframe.contentWindow.postMessage(JSON.stringify({ latitude: lat, longitude: lon }), "*");
        }
      }
    } catch (err) {
      console.error("Geocoding address failed:", err);
    }
  };

  const handleGPSLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      setAddress("123 Galle Road, Colombo, Sri Lanka");
      return;
    }
    setIsLocating(true);

    const getPosition = (options: PositionOptions): Promise<GeolocationPosition> => {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
      });
    };

    const tryGetLocation = async () => {
      try {
        let position;
        try {
          position = await getPosition({ enableHighAccuracy: true, timeout: 5000 });
        } catch (highAccError) {
          position = await getPosition({ enableHighAccuracy: false, timeout: 10000 });
        }
        const { latitude: lat, longitude: lon } = position.coords;
        setLatitude(lat);
        setLongitude(lon);
        setInitialCoords({ latitude: lat, longitude: lon });

        const iframe = document.getElementById("map-iframe") as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(JSON.stringify({ latitude: lat, longitude: lon }), "*");
        }
        const modalIframe = document.getElementById("modal-map-iframe") as HTMLIFrameElement;
        if (modalIframe && modalIframe.contentWindow) {
          modalIframe.contentWindow.postMessage(JSON.stringify({ latitude: lat, longitude: lon }), "*");
        }
        await reverseGeocode(lat, lon);
      } catch (err: any) {
        alert("Could not retrieve your location. Please check your browser permissions.");
      } finally {
        setIsLocating(false);
      }
    };

    tryGetLocation();
  };

  const checkDuplicateFiles = async (files: File[], previews: string[], typeLabel: string) => {
    if (files.length === 0) return;
    setIsCheckingDuplicates(true);
    try {
      const photosPayload = await Promise.all(
        files.map(async (file, i) => ({
          id: previews[i],
          type: typeLabel,
          base64: await compressImage(file)
        }))
      );
      const res = await fetch(`${API_URL}/policy-holder/check-duplicate-photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: photosPayload })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.hasDuplicate && Array.isArray(data.duplicates)) {
          const newDups: Record<string, any> = {};
          data.duplicates.forEach((d: any) => {
            if (d.id) newDups[d.id] = d;
          });
          setDuplicatesMap((prev) => ({ ...prev, ...newDups }));
        }
      }
    } catch (err) {
      console.warn("Duplicate check error:", err);
    } finally {
      setIsCheckingDuplicates(false);
    }
  };

  const handleStep2FileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<FileUploadState>>,
    typeLabel: string,
    isLicense: boolean = false
  ) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;
    const newPreviews = selectedFiles.map((file) => URL.createObjectURL(file));

    setter((prev) => ({
      files: [...prev.files, ...selectedFiles],
      previews: [...prev.previews, ...newPreviews]
    }));

    if (!isLicense) {
      await checkDuplicateFiles(selectedFiles, newPreviews, typeLabel);
    }
    e.target.value = "";
  };

  const handleStep2RemoveFile = (
    setter: React.Dispatch<React.SetStateAction<FileUploadState>>,
    index: number
  ) => {
    setter((prev) => {
      const previews = [...prev.previews];
      const removedPreview = previews[index];
      URL.revokeObjectURL(removedPreview);
      previews.splice(index, 1);
      const files = [...prev.files];
      files.splice(index, 1);

      setDuplicatesMap((dMap) => {
        const nextMap = { ...dMap };
        delete nextMap[removedPreview];
        return nextMap;
      });

      return { files, previews };
    });
  };

  const handleCountChange = (count: number) => {
    setOtherVehiclesCount(count);
    setOtherVehicles((prev) => {
      if (count > prev.length) {
        const toAdd = count - prev.length;
        const newItems = Array.from({ length: toAdd }, () => ({
          vehiclePlate: "",
          insuranceCompany: "",
          policyNumber: "",
          driverName: "",
          licensePhotosPreviews: [],
          licensePhotosBase64: [],
          vehiclePhotosPreviews: [],
          vehiclePhotosBase64: []
        }));
        return [...prev, ...newItems];
      } else {
        return prev.slice(0, count);
      }
    });
  };

  const updateOtherVehicleField = (index: number, field: string, val: string) => {
    setOtherVehicles((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const handleOtherVehiclePhotoUpload = async (
    index: number,
    fieldPrefix: "licensePhotos" | "vehiclePhotos",
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const base64s = await Promise.all(files.map((file) => compressImage(file)));
    const previews = files.map((file) => URL.createObjectURL(file));

    setOtherVehicles((prev) => {
      const next = [...prev];
      const prevPreviews = (next[index] as any)[`${fieldPrefix}Previews`] || [];
      const prevBase64s = (next[index] as any)[`${fieldPrefix}Base64`] || [];

      next[index] = {
        ...next[index],
        [`${fieldPrefix}Previews`]: [...prevPreviews, ...previews],
        [`${fieldPrefix}Base64`]: [...prevBase64s, ...base64s]
      };
      return next;
    });
  };

  const handleOtherVehiclePhotoRemove = (
    index: number,
    fieldPrefix: "licensePhotos" | "vehiclePhotos",
    photoIdx: number
  ) => {
    setOtherVehicles((prev) => {
      const next = [...prev];
      const previews = [...((next[index] as any)[`${fieldPrefix}Previews`] || [])];
      URL.revokeObjectURL(previews[photoIdx]);
      previews.splice(photoIdx, 1);
      const base64s = [...((next[index] as any)[`${fieldPrefix}Base64`] || [])];
      base64s.splice(photoIdx, 1);

      next[index] = {
        ...next[index],
        [`${fieldPrefix}Previews`]: previews,
        [`${fieldPrefix}Base64`]: base64s
      };
      return next;
    });
  };

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    setClaimFormError("");
    if (!claimPlate) {
      setClaimFormError("Please select an authorized operating vehicle.");
      return;
    }
    if (!claimDate) {
      setClaimFormError("Please select the incident date.");
      return;
    }
    if (!claimTime) {
      setClaimFormError("Please specify the incident time.");
      return;
    }
    if (!claimDamageType) {
      setClaimFormError("Please select the damage category.");
      return;
    }
    if (!claimDesc.trim()) {
      setClaimFormError("Please provide an incident description.");
      return;
    }
    if (!address.trim()) {
      setClaimFormError("Please specify or search the incident location.");
      return;
    }
    if (otherVehiclesInvolved === "yes") {
      for (let i = 0; i < otherVehicles.length; i++) {
        if (!otherVehicles[i].vehiclePlate.trim()) {
          setClaimFormError(`Please enter the vehicle number for Other Vehicle #${i + 1}.`);
          return;
        }
      }
    }
    setClaimStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingClaim) return;
    setClaimFormError("");

    const dupKeys = Object.keys(duplicatesMap);
    if (dupKeys.length > 0) {
      setClaimFormError("One or more photos were flagged as duplicate. Please remove or replace flagged photos before submitting.");
      return;
    }

    setSubmittingClaim(true);
    try {
      const convertFiles = (files: File[]) => Promise.all(files.map((f) => compressImage(f)));
      const [frontB64, rearB64, sideB64, licFrontB64, licRearB64] = await Promise.all([
        convertFiles(accidentFront.files),
        convertFiles(accidentRear.files),
        convertFiles(accidentSide.files),
        convertFiles(licenseFront.files),
        convertFiles(licenseRear.files)
      ]);

      const payload = {
        vehiclePlate: claimPlate,
        incidentDate: claimDate,
        incidentTime: claimTime,
        damageType: claimDamageType,
        description: claimDesc,
        location: address,
        otherVehicleDetails: otherVehiclesInvolved === "yes"
          ? otherVehicles.map((v) => ({
              vehiclePlate: v.vehiclePlate.trim(),
              insuranceCompany: v.insuranceCompany.trim(),
              policyNumber: v.policyNumber.trim(),
              driverName: v.driverName.trim(),
              licensePhotos: v.licensePhotosBase64,
              vehiclePhotos: v.vehiclePhotosBase64
            }))
          : [],
        accidentPhotos: {
          front: frontB64,
          rear: rearB64,
          side: sideB64
        },
        drivingLicense: {
          front: licFrontB64,
          rear: licRearB64
        }
      };

      const res = await fetch(`${API_URL}/third-party/portal/submit-claim`, {
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

      setSubmittedClaimNumber(data.claimNumber);
      setShowSuccessModal(true);
      triggerToast(`Claim ${data.claimNumber} successfully lodged!`);
      refreshClaims();
    } catch (err: any) {
      setClaimFormError(err.message || "An unexpected error occurred while submitting claim.");
    } finally {
      setSubmittingClaim(false);
    }
  };

  const handleUploadDocument = async () => {
    setDocUploadError("");
    setDocUploadSuccess("");
    if (!uploadTargetClaim) {
      setDocUploadError("Please specify which claim to attach this document to.");
      return;
    }
    if (!docName.trim() || !docFileBase64) {
      setDocUploadError("Please provide a document title and select a file.");
      return;
    }

    setUploadingDoc(true);
    try {
      const res = await fetch(`${API_URL}/third-party/portal/claims/${uploadTargetClaim}/upload-doc`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          documentName: docName.trim(),
          fileBase64: docFileBase64
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload document.");

      setDocUploadSuccess(`Document "${docName}" attached to claim ${uploadTargetClaim}.`);
      setDocName("");
      setDocFileBase64("");

      if (selectedClaim && selectedClaim.claimNumber === uploadTargetClaim) {
        setSelectedClaim((prev) =>
          prev ? { ...prev, additionalDocuments: data.additionalDocuments } : null
        );
      }
      refreshClaims();
    } catch (err: any) {
      setDocUploadError(err.message || "Failed to upload document.");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleLogout = async () => {
    if (sessionToken) {
      try {
        await fetch(`${API_URL}/third-party/portal/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${sessionToken}` }
        });
      } catch (e) {
        console.warn("Logout notify error:", e);
      }
    }
    sessionStorage.removeItem(`sanasa_tp_session_${token}`);
    setSessionToken(null);
    setIsLoggedOut(true);
  };

  const pendingClaimsCount = useMemo(() => {
    return claims.filter((c) => c.status !== "Approved" && c.status !== "Settled" && c.status !== "Rejected").length;
  }, [claims]);

  const approvedClaimsCount = useMemo(() => {
    return claims.filter((c) => c.status === "Approved" || c.status === "Settled").length;
  }, [claims]);

  const t = driverAccessTranslations[lang] || driverAccessTranslations.en;

  const currentBranchName = selectedBranchOverride || profile?.branch || "Galle";
  const matchedBranch = useMemo(() => {
    const cleanCurrent = currentBranchName.toLowerCase().replace(/\s+branch$/i, "").trim();
    return (
      SANASA_BRANCHES.find(
        (b) =>
          b.city.toLowerCase() === cleanCurrent ||
          b.name.en.toLowerCase().includes(cleanCurrent) ||
          cleanCurrent.includes(b.city.toLowerCase())
      ) || SANASA_BRANCHES[1]
    );
  }, [currentBranchName]);

  const filteredBranches = useMemo(() => {
    const q = branchSearchQuery.toLowerCase().trim();
    if (!q) return SANASA_BRANCHES;
    return SANASA_BRANCHES.filter(
      (b) =>
        b.city.toLowerCase().includes(q) ||
        b.name.en.toLowerCase().includes(q) ||
        b.name.si.toLowerCase().includes(q) ||
        b.name.ta.toLowerCase().includes(q) ||
        b.phone.includes(q) ||
        b.address.toLowerCase().includes(q)
    );
  }, [branchSearchQuery]);

  const navLinks = [
    { id: "home", label: "Overview" },
    { id: "digital_pass", label: "Digital Pass" },
    { id: "my_claims", label: "My Claims" },
    { id: "chat", label: "Live Support" },
  ];

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800 select-none">
        <SimpleLoader message="Verifying Authorized Driver Pass..." theme="blue" />
      </div>
    );
  }

  // Error / Revocation Screen
  if (error || !sessionToken) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans select-none">
        <div className="bg-[#0B1E32] text-white text-xs px-6 py-2.5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={Call02Icon} className="w-3.5 h-3.5 text-cyan-400" />
            <span>24H Customer Hotline: +94 112 003 000</span>
          </div>
          <span>Sanasa General Insurance</span>
        </div>

        <div className="max-w-md w-full mx-auto my-auto p-6">
          <div className="bg-white border border-rose-200 rounded-3xl p-8 text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <HugeiconsIcon icon={Alert02Icon} className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Access Link Inactive or Revoked</h2>
            <p className="text-slate-500 text-xs leading-relaxed mb-6">
              {error || "This driver authorization token is no longer active, has expired, or was revoked by the vehicle owner or regional branch."}
            </p>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-2 mb-6">
              <div className="flex justify-between text-slate-500">
                <span>Security Reference:</span>
                <span className="font-mono text-slate-800 font-semibold">{token ? token.substring(0, 12).toUpperCase() : "N/A"}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Hotline Support:</span>
                <span className="text-[#102A43] font-bold">1331 / +94 112 003 000</span>
              </div>
            </div>
          </div>
        </div>

        <PolicyHolderFooter />
      </div>
    );
  }

  // Safe Logout Screen
  if (isLoggedOut) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between select-none font-sans">
        <div className="bg-[#0B1E32] text-white text-xs px-6 py-2.5 flex justify-between items-center">
          <span>Sanasa General Insurance</span>
          <span>Session Closed</span>
        </div>

        <div className="max-w-md w-full mx-auto my-auto p-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Session Closed</h2>
            <p className="text-slate-500 text-xs mb-6">
              You have safely logged out of the Third-Party Driver Portal. To re-access, reopen your secure invitation link.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-[#102A43] hover:bg-[#163e63] text-white rounded-xl text-xs font-bold transition-all border-none cursor-pointer"
            >
              Re-open Portal
            </button>
          </div>
        </div>

        <PolicyHolderFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative select-none">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-[#00ddff] text-black font-semibold px-6 py-4 rounded-2xl shadow-xl animate-bounce flex items-center gap-3 border-2 border-black">
          <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-6 h-6" strokeWidth={2.5} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. EXACT POLICYHOLDER NAVBAR (Matching PolicyHolderNavbar component 100%) */}
      {/* ========================================================================= */}
      <nav className="sticky top-0 z-50 w-full bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] border-b border-slate-100 transition-all duration-300">
        
        {/* Top Emergency / Branch Header Row with Language, Branch Phone Selector & Accessibility */}
        <div className="bg-[#0B1E32] text-white text-xs py-2 px-4 md:px-12 flex justify-between items-center transition-all duration-300 gap-3 flex-wrap shadow-inner">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <HugeiconsIcon icon={Call02Icon} className="w-3.5 h-3.5 text-sky-200" strokeWidth={2} />
              <span className="font-medium tracking-wide hidden sm:inline">{t.hotline}</span>
              <a href="tel:+94112003000" className="font-semibold text-white sm:hidden hover:underline">+94 112 003 000</a>
            </div>

            {/* Current Designated Branch Direct Contact */}
            <div className="hidden lg:flex items-center gap-1.5 text-sky-200 font-medium pl-3 border-l border-white/20">
              <HugeiconsIcon icon={Building04Icon} className="w-3.5 h-3.5 text-sky-300" strokeWidth={2} />
              <span>{t.branch}: <strong className="text-white">{matchedBranch.name[lang] || matchedBranch.name.en}</strong></span>
              <a
                href={`tel:${matchedBranch.phone.replace(/\s+/g, "")}`}
                className="text-emerald-300 hover:text-emerald-200 font-mono font-bold flex items-center gap-1 ml-1 hover:underline"
                title={`Call ${matchedBranch.name.en} Direct Line`}
              >
                <span>({matchedBranch.phone})</span>
              </a>
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {/* Language Selector Dropdown */}
            <div className="relative" ref={langMenuRef}>
              <button
                type="button"
                onClick={() => setLangMenuOpen((prev) => !prev)}
                className="flex items-center gap-1.5 text-white hover:text-sky-100 transition-colors border border-white/25 bg-white/10 hover:bg-white/20 px-2.5 py-0.5 rounded-full cursor-pointer focus:outline-none text-[11px] font-semibold"
                title="Select Language"
              >
                <HugeiconsIcon icon={Globe02Icon} className="w-3 h-3 text-sky-200" strokeWidth={2} />
                <span className="uppercase font-bold">{lang === "si" ? "සිං" : lang === "ta" ? "தமி" : "EN"}</span>
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  className={`w-3 h-3 text-sky-200 transition-transform duration-200 ${langMenuOpen ? 'rotate-180' : ''}`}
                  strokeWidth={2.5}
                />
              </button>

              {langMenuOpen && (
                <div className="absolute right-0 mt-2 w-36 bg-white rounded-2xl shadow-[0_12px_35px_rgba(0,0,0,0.25)] border border-slate-100 py-1.5 z-50 text-slate-800 animate-in fade-in slide-in-from-top-2 duration-150">
                  <button
                    type="button"
                    onClick={() => changeLanguage("en")}
                    className={`flex items-center justify-between w-full px-4 py-2 hover:bg-slate-50 hover:text-cyan-600 font-bold text-xs transition-colors cursor-pointer border-none bg-transparent ${lang === "en" ? "text-cyan-600 bg-cyan-50/50" : ""}`}
                  >
                    <span>English</span>
                    {lang === "en" && <span className="text-cyan-600 font-bold">✓</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => changeLanguage("si")}
                    className={`flex items-center justify-between w-full px-4 py-2 hover:bg-slate-50 hover:text-cyan-600 font-bold text-xs transition-colors cursor-pointer border-none bg-transparent ${lang === "si" ? "text-cyan-600 bg-cyan-50/50" : ""}`}
                  >
                    <span>සිංහල</span>
                    {lang === "si" && <span className="text-cyan-600 font-bold">✓</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => changeLanguage("ta")}
                    className={`flex items-center justify-between w-full px-4 py-2 hover:bg-slate-50 hover:text-cyan-600 font-bold text-xs transition-colors cursor-pointer border-none bg-transparent ${lang === "ta" ? "text-cyan-600 bg-cyan-50/50" : ""}`}
                  >
                    <span>தமிழ்</span>
                    {lang === "ta" && <span className="text-cyan-600 font-bold">✓</span>}
                  </button>
                </div>
              )}
            </div>

            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00ddff]/20 text-[#00ddff] border border-[#00ddff]/40">
              AUTHORIZED DRIVER
            </span>
          </div>
        </div>

        {/* Main Navbar Row (Logo, Navigation Links with Underline, Orange New Claim Button, Profile) */}
        <div className="py-2.5 px-6 md:px-16 flex items-center justify-between w-full">
          {/* Logo */}
          <div className="flex items-center">
            <button
              onClick={() => setActiveTab("home")}
              className="bg-transparent border-none p-0 cursor-pointer"
            >
              <Image
                src="/logo.png"
                alt="Sanasa General Insurance"
                width={100}
                height={40}
                className="object-contain h-auto"
                priority
              />
            </button>
          </div>

          {/* Desktop Navigation Links — Exact Homepage/PolicyHolder Style */}
          <div className="hidden md:flex items-center gap-4 lg:gap-6 text-sm lg:text-base">
            {navLinks.map((link) => {
              const active = activeTab === link.id;
              const hasBadge = !!link.count && link.count > 0;
              return (
                <button
                  key={link.id}
                  onClick={() => setActiveTab(link.id as TabType)}
                  className={`relative py-2 font-semibold whitespace-nowrap transition-colors duration-200 border-none bg-transparent cursor-pointer flex items-center gap-1.5 ${
                    active ? "text-[#0d2a3a]" : "text-slate-600 hover:text-[#0284c7]"
                  }`}
                >
                  <span>{link.label}</span>
                  {hasBadge && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white leading-none flex items-center justify-center animate-pulse shadow-xs">
                      {link.count}
                    </span>
                  )}
                  {active && (
                    <span className="absolute bottom-0 left-0 w-full h-[3px] rounded-full bg-[#0d2a3a] transition-all duration-200" />
                  )}
                </button>
              );
            })}

            {/* Orange New Claim Pill Button (Signature Policyholder Navbar Element) */}
            <button
              onClick={() => setActiveTab("new_claim")}
              className="inline-flex items-center justify-center font-semibold bg-[#ff9800] hover:bg-[#ff8f00] text-white shadow-sm hover:shadow transition-all duration-200 border-none cursor-pointer rounded-full hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ml-2 px-5 py-1.5 text-sm md:text-[15px]"
            >
              New Claim
            </button>
          </div>

          {/* Right Action Icons & Driver Profile */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Direct Notification Bell Quick Access */}
            <button
              onClick={() => setActiveTab("notifications")}
              className={`relative p-2 rounded-xl transition-all border cursor-pointer ${
                activeTab === "notifications"
                  ? "bg-sky-50 border-sky-300 text-sky-700 shadow-xs"
                  : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900"
              }`}
              title="Driver Notifications"
            >
              <HugeiconsIcon icon={Notification01Icon} className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse shadow-sm">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-[#0d2a3a] flex items-center justify-center font-bold text-xs">
                {profile?.driverName ? profile.driverName.charAt(0).toUpperCase() : "D"}
              </div>
              <div className="hidden sm:block text-left">
                <span className="text-xs font-bold text-slate-800 block leading-tight">
                  {profile?.driverName}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold block leading-tight">
                  Authorized Driver
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              title="Logout"
            >
              <HugeiconsIcon icon={Logout01Icon} className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Mobile Tab Row */}
        <div className="md:hidden flex items-center gap-2 px-4 py-2 border-t border-slate-100 overflow-x-auto">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => setActiveTab(link.id as TabType)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border-none flex items-center gap-1.5 ${
                activeTab === link.id ? "bg-[#0d2a3a] text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              <span>{link.label}</span>
              {!!link.count && link.count > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500 text-white leading-none">
                  {link.count}
                </span>
              )}
            </button>
          ))}
          <button
            onClick={() => setActiveTab("new_claim")}
            className="px-3 py-1 rounded-full text-xs font-semibold bg-[#ff9800] text-white whitespace-nowrap border-none"
          >
            New Claim
          </button>
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* 2. COMPACT DEDICATED DRIVER AUTHORIZATION HEADER */}
      {/* ========================================================================= */}
      <div className="bg-[#0B1E32] text-white py-6 px-6 md:px-16 border-b border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#00ddff]/20 text-[#00ddff] border border-[#00ddff]/40">
                AUTHORIZED THIRD-PARTY DRIVER
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-400/30">
                SEALED & VERIFIED PASS
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
              {profile?.driverName}
            </h1>
            <p className="text-slate-300 text-xs md:text-sm mt-0.5">
              Authorized to drive for vehicle owner <strong className="text-white">{profile?.policyHolderName}</strong> • Sanasa <strong className="text-white">{profile?.branch}</strong> Branch
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setActiveTab("new_claim")}
              className="flex-1 md:flex-none px-6 py-2.5 bg-[#ff9800] hover:bg-[#ff8f00] text-white font-bold text-xs md:text-sm rounded-xl transition-all shadow-md hover:scale-105 active:scale-95 border-none cursor-pointer flex items-center justify-center gap-2"
            >
              <span>+ File Accident Claim</span>
            </button>
            <button
              onClick={() => setActiveTab("digital_pass")}
              className={`flex-1 md:flex-none px-5 py-2.5 font-semibold text-xs md:text-sm rounded-xl transition-all border cursor-pointer ${
                activeTab === "digital_pass"
                  ? "bg-white text-slate-900 border-white"
                  : "bg-white/10 hover:bg-white/20 text-white border-white/20"
              }`}
            >
              Digital Pass
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 md:px-16 py-8 relative z-20">

        {/* ========================================================================= */}
        {/* TAB 1: HOME (Exact Policyholder Home Grid: Notifications + Registered Vehicles) */}
        {/* ========================================================================= */}
        {activeTab === "home" && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* Left Column (7 cols): Notifications & Claim Updates */}
            <div className="lg:col-span-7">
              <div className="flex items-center gap-2.5 mb-6 select-none">
                <HugeiconsIcon icon={Notification01Icon} className="w-6 h-6 text-slate-700 flex-shrink-0" strokeWidth={2.5} />
                <h2 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
                  Recent Notifications & Requests
                </h2>
              </div>

              <div className="flex flex-col gap-6">
                {claims.length > 0 ? (
                  claims.slice(0, 3).map((claim) => (
                    <div
                      key={claim.claimNumber}
                      className="bg-white border-2 border-slate-100 rounded-[24px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[140px]"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="p-2 bg-blue-100 rounded-xl text-blue-600 flex-shrink-0 mt-0.5">
                          <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-6 h-6" strokeWidth={2} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-slate-900 font-semibold text-base leading-none">
                              Claim {claim.claimNumber} Status: {claim.status}
                            </h4>
                            <span className="text-[11px] text-slate-400 font-medium">
                              {claim.incidentDate}
                            </span>
                          </div>
                          <p className="text-slate-600 text-xs md:text-sm mt-2 leading-relaxed">
                            Vehicle {claim.vehiclePlate} • {claim.damageType} lodged for {claim.location}. Branch reviewing inspection details.
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-slate-100">
                        <button
                          onClick={() => handleOpenClaimDetails(claim.claimNumber)}
                          className="px-4 py-1.5 bg-[#0d2a3a] text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-all cursor-pointer border-none"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white border border-slate-100 rounded-[24px] p-8 text-center text-slate-400 shadow-sm">
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                    <p className="text-sm font-semibold text-slate-700">No pending notifications</p>
                    <p className="text-xs text-slate-400 mt-1">All authorized vehicle claims are up to date.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column (5 cols): Permitted Registered Vehicles */}
            <div className="lg:col-span-5">
              <div className="flex items-center justify-between mb-6 select-none">
                <div className="flex items-center gap-2.5">
                  <HugeiconsIcon icon={Car01Icon} className="w-6 h-6 text-slate-700 flex-shrink-0" strokeWidth={2.5} />
                  <h2 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
                    Authorized Vehicles
                  </h2>
                </div>
                <button
                  onClick={() => setActiveTab("vehicles")}
                  className="text-xs font-semibold text-[#0284c7] hover:underline bg-transparent border-none cursor-pointer"
                >
                  View All ({vehicles.length})
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {vehicles.map((v) => {
                  const theme = getVehicleTheme(v.vehicleType || "Car");
                  return (
                    <div
                      key={v.numberPlate}
                      className="bg-white rounded-[24px] border border-slate-100 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex items-center justify-between gap-4 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${theme.bg} ${theme.border} border`}>
                          {getVehicleIconSvg(v.vehicleType || "Car", `w-6 h-6 ${theme.text}`)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2 py-0.5 rounded-md">
                              {formatPlate(v.numberPlate)}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              Active
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-800 text-sm mt-1">{v.company} {v.model}</h4>
                          <p className="text-[11px] text-slate-400">{v.vehicleType} • {v.year}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setClaimPlate(v.numberPlate);
                          setActiveTab("new_claim");
                        }}
                        className="px-3.5 py-2 bg-[#ff9800] hover:bg-[#ff8f00] text-white text-xs font-bold rounded-xl border-none cursor-pointer shadow-sm hover:scale-105 active:scale-95 transition-all"
                      >
                        Claim
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MY VEHICLES (Exact PolicyHolder MyVehicles cards and layout) */}
        {/* ========================================================================= */}
        {activeTab === "vehicles" && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Authorized Operating Vehicles</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Vehicles permitted for driver operation under Policyholder {profile?.policyHolderName}
                </p>
              </div>
              <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white text-slate-700 border border-slate-200 shadow-2xs self-start sm:self-auto">
                {vehicles.length} Vehicles Insured
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vehicles.map((v) => {
                const theme = getVehicleTheme(v.vehicleType || "Car");
                return (
                  <div
                    key={v.numberPlate}
                    className="bg-white border border-slate-200/90 rounded-[28px] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[220px]"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-white rounded-lg font-mono font-bold text-xs tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <span>{formatPlate(v.numberPlate)}</span>
                        </div>

                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active Coverage
                        </span>
                      </div>

                      <div className="flex items-center gap-3.5 my-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${theme.bg} ${theme.border} border`}>
                          {getVehicleIconSvg(v.vehicleType || "Car", `w-6 h-6 ${theme.text}`)}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 leading-tight">
                            {v.company} {v.model}
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5">{v.vehicleType} • {v.year}</p>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs">
                        <div className="flex justify-between text-slate-500">
                          <span>Policy Number:</span>
                          <span className="font-mono text-slate-800 font-semibold">{v.policyNumber || "SANASA-COMPREHENSIVE"}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Owner:</span>
                          <span className="text-slate-800 font-medium">{profile?.policyHolderName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setClaimPlate(v.numberPlate);
                          setActiveTab("new_claim");
                        }}
                        className="w-full py-2.5 bg-[#ff9800] hover:bg-[#ff8f00] text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 border-none cursor-pointer shadow-sm active:scale-95"
                      >
                        <HugeiconsIcon icon={Camera01Icon} className="w-4 h-4 text-white" />
                        <span>Lodge Claim for This Vehicle</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: NEW CLAIM (Exact PolicyHolder New_Claim Form & Step Flow) */}
        {/* ========================================================================= */}
        {activeTab === "new_claim" && (
          <div className="w-full">
            {/* Styled curved header matching Policyholder exactly */}
            <div className="max-w-4xl w-full mx-auto px-4 sm:px-0 mb-8 relative">
              <div className="relative h-[200px] md:h-[220px] rounded-3xl md:rounded-[40px] overflow-hidden shadow-lg bg-[url('/newclaim1.webp')] bg-cover bg-center">
                <div className="absolute inset-0 bg-slate-900/35" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0d2a3a]/95 via-[#0d2a3a]/80 to-transparent" />
                <header className="relative z-10 h-full flex flex-col justify-center px-8 md:px-14 select-none">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-semibold uppercase tracking-wider w-fit mb-3 border border-cyan-400/30">
                    Third-Party Authorized Driver
                  </div>
                  <h1 className="text-white text-3xl md:text-[38px] font-bold tracking-tight leading-tight">
                    File New Claim
                  </h1>
                  <p className="text-slate-200 text-xs md:text-sm font-normal mt-2 tracking-wide opacity-95">
                    Report an accident or damage incident for your authorized vehicle
                  </p>
                </header>
              </div>
            </div>

            {/* Step Progress Pill Indicator */}
            <div className="max-w-4xl mx-auto mb-8 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setClaimStep(1)}
                className={`flex items-center gap-2.5 px-6 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer border-none ${
                  claimStep === 1
                    ? "bg-[#0d2a3a] text-white shadow-md shadow-slate-900/20"
                    : "bg-emerald-500 text-white"
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                  {claimStep === 2 ? "✓" : "1"}
                </span>
                <span>1. Incident Details</span>
              </button>

              <div className="w-8 h-0.5 bg-slate-300" />

              <button
                type="button"
                onClick={() => {
                  if (claimStep === 1) {
                    if (claimPlate && claimDate && claimTime && claimDamageType && claimDesc && address) {
                      setClaimStep(2);
                    } else {
                      setClaimFormError("Please complete Step 1 incident details before proceeding to document upload.");
                    }
                  }
                }}
                className={`flex items-center gap-2.5 px-6 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer border-none ${
                  claimStep === 2
                    ? "bg-[#0d2a3a] text-white shadow-md shadow-slate-900/20"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-slate-400/20 flex items-center justify-center text-[10px]">
                  2
                </span>
                <span>2. Upload Documents & Photos</span>
              </button>
            </div>

            {/* Error Banner */}
            {claimFormError && (
              <div className="max-w-4xl mx-auto mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center gap-2.5 shadow-sm">
                <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5 text-rose-600 flex-shrink-0" />
                <span className="font-medium">{claimFormError}</span>
              </div>
            )}

            {/* STEP 1: Incident & Vehicle Details Form */}
            {claimStep === 1 && (
              <form onSubmit={handleStep1Next} className="max-w-4xl mx-auto flex flex-col gap-10 bg-white border border-slate-200/90 rounded-[32px] p-6 sm:p-10 shadow-sm">
                
                {/* Section 1: Vehicle & Incident */}
                <section className="flex flex-col gap-6">
                  <h2 className="text-xl md:text-2xl font-semibold text-[#0d2a3a] tracking-tight flex items-center gap-2.5 select-none">
                    <HugeiconsIcon icon={Car01Icon} className="w-6 h-6 text-slate-700 flex-shrink-0" strokeWidth={2.2} />
                    Vehicle & Incident
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Select Vehicle Dropdown */}
                    <div className="flex flex-col gap-2">
                      <label className="text-slate-700 text-sm font-medium mb-1">
                        Select Vehicle <span className="text-red-500 ml-0.5">*</span>
                      </label>
                      <div className="relative">
                        <select
                          required
                          value={claimPlate}
                          onChange={(e) => setClaimPlate(e.target.value)}
                          className="w-full bg-[#e2e8f0]/80 hover:bg-[#e2e8f0]/95 text-slate-800 rounded-2xl py-4 px-4 pr-12 appearance-none border border-transparent focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#00ddff] focus:border-transparent font-normal transition-all cursor-pointer text-sm"
                        >
                          <option value="" disabled>Select Authorized Vehicle</option>
                          {vehicles.map((v) => (
                            <option key={v.numberPlate} value={v.numberPlate}>
                              {getVehicleEmoji(v.vehicleType)} {formatPlate(v.numberPlate)} - {v.company} {v.model} ({v.year || "Active"})
                            </option>
                          ))}
                        </select>
                        <span className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-500">
                          <HugeiconsIcon icon={ArrowDown01Icon} className="w-5 h-5" strokeWidth={2.5} />
                        </span>
                      </div>
                    </div>

                    {/* Incident Date */}
                    <div className="flex flex-col gap-2">
                      <label className="text-slate-700 text-sm font-medium mb-1">
                        Incident Date <span className="text-red-500 ml-0.5">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          required
                          min={minDate}
                          max={maxDate}
                          value={claimDate}
                          onChange={(e) => setClaimDate(e.target.value)}
                          onClick={(e) => {
                            try {
                              (e.currentTarget as any).showPicker?.();
                            } catch (_) {}
                          }}
                          className="w-full bg-[#e2e8f0]/80 hover:bg-[#e2e8f0]/95 text-slate-800 rounded-2xl py-4 px-4 pr-12 border border-transparent focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#00ddff] focus:border-transparent font-normal transition-all cursor-pointer text-sm"
                        />
                        <span className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-500">
                          <HugeiconsIcon icon={Calendar03Icon} className="w-5 h-5" strokeWidth={2.2} />
                        </span>
                      </div>
                    </div>

                    {/* Incident Time */}
                    <div className="flex flex-col gap-2">
                      <label className="text-slate-700 text-sm font-medium mb-1">
                        Incident Time <span className="text-red-500 ml-0.5">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="time"
                          required
                          value={claimTime}
                          onChange={(e) => setClaimTime(e.target.value)}
                          onClick={(e) => {
                            try {
                              (e.currentTarget as any).showPicker?.();
                            } catch (_) {}
                          }}
                          className="w-full bg-[#e2e8f0]/80 hover:bg-[#e2e8f0]/95 text-slate-800 rounded-2xl py-4 px-4 pr-12 border border-transparent focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#00ddff] focus:border-transparent font-normal transition-all cursor-pointer text-sm"
                        />
                        <span className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-500">
                          <HugeiconsIcon icon={Clock01Icon} className="w-5 h-5" strokeWidth={2.2} />
                        </span>
                      </div>
                    </div>

                    {/* Damage Type Dropdown */}
                    <div className="flex flex-col gap-2">
                      <label className="text-slate-700 text-sm font-medium mb-1">
                        Damage Category <span className="text-red-500 ml-0.5">*</span>
                      </label>
                      <div className="relative">
                        <select
                          required
                          value={claimDamageType}
                          onChange={(e) => setClaimDamageType(e.target.value)}
                          className="w-full bg-[#e2e8f0]/80 hover:bg-[#e2e8f0]/95 text-slate-800 rounded-2xl py-4 px-4 pr-12 appearance-none border border-transparent focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#00ddff] focus:border-transparent font-normal transition-all cursor-pointer text-sm"
                        >
                          <option value="" disabled>Select Damage Type</option>
                          {DAMAGE_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                        <span className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-500">
                          <HugeiconsIcon icon={ArrowDown01Icon} className="w-5 h-5" strokeWidth={2.5} />
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description Textarea */}
                  <div className="flex flex-col gap-2 mt-2">
                    <label className="text-slate-700 text-sm font-medium mb-1">
                      Description <span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={claimDesc}
                      onChange={(e) => setClaimDesc(e.target.value)}
                      placeholder="Describe what occurred, impact direction, damage extent, and road conditions..."
                      className="w-full bg-[#e2e8f0]/80 text-slate-800 rounded-2xl p-4 border border-transparent focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#00ddff] focus:border-transparent font-normal transition-all text-sm"
                    />
                  </div>
                </section>

                {/* Section 1B: Other Vehicles Involved (Optional) */}
                <section className="flex flex-col gap-6 pt-4 border-t border-slate-100">
                  <h2 className="text-xl md:text-2xl font-semibold text-[#0d2a3a] tracking-tight flex items-center gap-2.5 select-none">
                    <HugeiconsIcon icon={Car01Icon} className="w-6 h-6 text-slate-700 flex-shrink-0" strokeWidth={2.2} />
                    Other Vehicles Involved (Optional)
                  </h2>

                  <div className="flex flex-col gap-3">
                    <label className="text-slate-700 text-sm font-medium">
                      Were other vehicles involved in the accident? <span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <div className="flex flex-row gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setOtherVehiclesInvolved("yes");
                          if (otherVehiclesCount === 0) handleCountChange(1);
                        }}
                        className={`flex-1 py-3.5 px-6 rounded-2xl font-semibold transition-all border-2 text-center cursor-pointer text-sm ${
                          otherVehiclesInvolved === "yes"
                            ? "bg-[#0d2a3a] text-white border-[#0d2a3a] shadow-md"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOtherVehiclesInvolved("no");
                          setOtherVehiclesCount(0);
                          setOtherVehicles([]);
                        }}
                        className={`flex-1 py-3.5 px-6 rounded-2xl font-semibold transition-all border-2 text-center cursor-pointer text-sm ${
                          otherVehiclesInvolved === "no"
                            ? "bg-[#0d2a3a] text-white border-[#0d2a3a] shadow-md"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {/* If YES: Show Vehicle Count select dropdown */}
                  {otherVehiclesInvolved === "yes" && (
                    <div className="flex flex-col gap-2 mt-2 transition-all">
                      <label className="text-slate-700 text-sm font-medium mb-1">
                        How many other vehicles were involved? <span className="text-red-500 ml-0.5">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={otherVehiclesCount}
                          onChange={(e) => handleCountChange(Number(e.target.value))}
                          className="w-full bg-[#e2e8f0]/80 hover:bg-[#e2e8f0]/95 text-slate-800 rounded-2xl py-4 px-4 pr-12 appearance-none border border-transparent focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#00ddff] focus:border-transparent font-normal transition-all cursor-pointer text-sm"
                        >
                          <option value={1}>1 Vehicle</option>
                          <option value={2}>2 Vehicles</option>
                          <option value={3}>3 Vehicles</option>
                          <option value={4}>4 Vehicles</option>
                        </select>
                        <span className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-500">
                          <HugeiconsIcon icon={ArrowDown01Icon} className="w-5 h-5" strokeWidth={2.5} />
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Dynamic fields listing cards for each vehicle */}
                  {otherVehiclesInvolved === "yes" &&
                    otherVehicles.map((vehicle, index) => (
                      <div key={index} className="bg-slate-50 border border-slate-200/90 rounded-3xl p-6 shadow-sm flex flex-col gap-6">
                        <h3 className="font-bold text-[#0d2a3a] text-base select-none">
                          Other Vehicle #{index + 1} Details
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-slate-700 font-medium">
                              Vehicle Number <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={vehicle.vehiclePlate}
                              onChange={(e) => updateOtherVehicleField(index, "vehiclePlate", e.target.value)}
                              placeholder="e.g. WP CAA-1234"
                              className="w-full bg-white text-slate-800 rounded-2xl py-3.5 px-4 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00ddff]"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-slate-700 font-medium">Driver Name</label>
                            <input
                              type="text"
                              value={vehicle.driverName}
                              onChange={(e) => updateOtherVehicleField(index, "driverName", e.target.value)}
                              placeholder="e.g. Sunil Perera"
                              className="w-full bg-white text-slate-800 rounded-2xl py-3.5 px-4 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00ddff]"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-slate-700 font-medium">Insurance Company</label>
                            <input
                              type="text"
                              value={vehicle.insuranceCompany}
                              onChange={(e) => updateOtherVehicleField(index, "insuranceCompany", e.target.value)}
                              placeholder="e.g. Sri Lanka Insurance / Ceylinco"
                              className="w-full bg-white text-slate-800 rounded-2xl py-3.5 px-4 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00ddff]"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-slate-700 font-medium">Policy Number</label>
                            <input
                              type="text"
                              value={vehicle.policyNumber}
                              onChange={(e) => updateOtherVehicleField(index, "policyNumber", e.target.value)}
                              placeholder="e.g. POL-987654"
                              className="w-full bg-white text-slate-800 rounded-2xl py-3.5 px-4 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00ddff]"
                            />
                          </div>
                        </div>

                        {/* License Photos Upload for Other Vehicle */}
                        <div className="flex flex-col gap-2">
                          <label className="text-slate-700 text-xs font-semibold">Other Driver's License Photos</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="file"
                              id={`other-license-${index}`}
                              multiple
                              accept="image/*"
                              onChange={(e) => handleOtherVehiclePhotoUpload(index, "licensePhotos", e)}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => document.getElementById(`other-license-${index}`)?.click()}
                              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer border-none flex items-center gap-1.5"
                            >
                              <HugeiconsIcon icon={Upload01Icon} className="w-4 h-4" />
                              <span>Add License Photo</span>
                            </button>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {vehicle.licensePhotosPreviews.length} photo(s) selected
                            </span>
                          </div>

                          {vehicle.licensePhotosPreviews.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {vehicle.licensePhotosPreviews.map((pUrl, pIdx) => (
                                <div key={pIdx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200">
                                  <img src={pUrl} alt="license preview" className="w-full h-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => handleOtherVehiclePhotoRemove(index, "licensePhotos", pIdx)}
                                    className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-0.5 text-[9px] cursor-pointer border-none"
                                  >
                                    &times;
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Damage Photos Upload for Other Vehicle */}
                        <div className="flex flex-col gap-2">
                          <label className="text-slate-700 text-xs font-semibold">Other Vehicle Damage Photos</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="file"
                              id={`other-damage-${index}`}
                              multiple
                              accept="image/*"
                              onChange={(e) => handleOtherVehiclePhotoUpload(index, "vehiclePhotos", e)}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => document.getElementById(`other-damage-${index}`)?.click()}
                              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer border-none flex items-center gap-1.5"
                            >
                              <HugeiconsIcon icon={Camera01Icon} className="w-4 h-4" />
                              <span>Add Damage Photo</span>
                            </button>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {vehicle.vehiclePhotosPreviews.length} photo(s) selected
                            </span>
                          </div>

                          {vehicle.vehiclePhotosPreviews.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {vehicle.vehiclePhotosPreviews.map((pUrl, pIdx) => (
                                <div key={pIdx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200">
                                  <img src={pUrl} alt="damage preview" className="w-full h-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => handleOtherVehiclePhotoRemove(index, "vehiclePhotos", pIdx)}
                                    className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-0.5 text-[9px] cursor-pointer border-none"
                                  >
                                    &times;
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </section>

                {/* Section 2: Incident Location */}
                <section className="flex flex-col gap-6 pt-4 border-t border-slate-100">
                  <h2 className="text-xl md:text-2xl font-semibold text-[#0d2a3a] tracking-tight flex items-center gap-2.5 select-none">
                    <HugeiconsIcon icon={Location01Icon} className="w-6 h-6 text-slate-700 flex-shrink-0" strokeWidth={2.2} />
                    Incident Location
                  </h2>

                  <div className="flex flex-col gap-2 relative">
                    <label className="text-slate-700 text-sm font-medium mb-1">
                      Enter Address or Landmark <span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <div className="relative w-full bg-[#e2e8f0]/80 hover:bg-[#e2e8f0]/95 focus-within:bg-white border border-transparent focus-within:border-[#0284c7] focus-within:ring-4 focus-within:ring-[#0284c7]/10 rounded-2xl pl-5 pr-2.5 py-2 flex items-center gap-3 transition-all duration-200 shadow-sm focus-within:shadow-md">
                      <input
                        type="text"
                        required
                        value={address}
                        onChange={(e) => {
                          setAddress(e.target.value);
                          setIsUserTyping(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            geocodeAddress(address);
                          }
                        }}
                        onBlur={() => {
                          setTimeout(() => setShowResultsDropdown(false), 250);
                        }}
                        placeholder="Enter address or landmark in Sri Lanka..."
                        className="flex-1 bg-transparent text-slate-800 text-[15px] placeholder-slate-400 focus:outline-none font-normal border-none"
                      />
                      {address && (
                        <button
                          type="button"
                          onClick={() => {
                            setAddress("");
                            setSearchResults([]);
                            setShowResultsDropdown(false);
                            setIsUserTyping(false);
                          }}
                          className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer p-1 flex items-center justify-center"
                        >
                          <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={2.5} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => geocodeAddress(address)}
                        className="bg-[#0284c7] hover:bg-[#0275a1] active:scale-95 text-white py-2 px-5 rounded-full text-xs font-semibold transition-all duration-150 border-none cursor-pointer flex items-center justify-center shadow-md shadow-[#0284c7]/20 whitespace-nowrap"
                      >
                        Search
                      </button>
                    </div>

                    {showResultsDropdown && !showMapModal && searchResults.length > 0 && (
                      <div className="absolute top-[80px] left-0 right-0 z-50 bg-white border border-slate-200/80 rounded-2xl shadow-xl max-h-[300px] overflow-y-auto mt-1.5 p-2 flex flex-col gap-1">
                        {searchResults.map((result, idx) => {
                          const parts = result.display_name.split(",");
                          const mainTitle = parts[0]?.trim() || "";
                          const subTitle = parts.slice(1).join(",").trim() || "";
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                const lat = parseFloat(result.lat);
                                const lon = parseFloat(result.lon);
                                setLatitude(lat);
                                setLongitude(lon);
                                setInitialCoords({ latitude: lat, longitude: lon });
                                setAddress(result.display_name);
                                setIsUserTyping(false);
                                setShowResultsDropdown(false);

                                const iframe = document.getElementById("map-iframe") as HTMLIFrameElement;
                                if (iframe && iframe.contentWindow) {
                                  iframe.contentWindow.postMessage(JSON.stringify({ latitude: lat, longitude: lon }), "*");
                                }
                              }}
                              className="text-left w-full hover:bg-slate-50 p-3 rounded-xl transition-all border-none bg-transparent cursor-pointer flex items-start gap-3"
                              title={result.display_name}
                            >
                              <div className="mt-0.5 bg-slate-100 text-slate-500 rounded-full p-2 flex items-center justify-center flex-shrink-0">
                                <HugeiconsIcon icon={Location01Icon} className="w-4 h-4 text-slate-500" strokeWidth={2.5} />
                              </div>
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="font-semibold text-slate-800 text-sm truncate">{mainTitle}</span>
                                {subTitle && (
                                  <span className="text-[11px] text-slate-500 truncate mt-0.5">{subTitle}</span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Map and GPS Retrieval */}
                  <div className="flex flex-col md:flex-row gap-6 items-stretch">
                    <div className="flex-1 h-[280px] bg-slate-100 rounded-3xl overflow-hidden relative border border-slate-200/80 shadow-sm">
                      <iframe
                        id="map-iframe"
                        width="100%"
                        height="100%"
                        className="border-none"
                        src={`/api/map?lat=${initialCoords.latitude}&lon=${initialCoords.longitude}`}
                        allowFullScreen
                      />
                    </div>

                    <div className="flex flex-row md:flex-col gap-4 justify-between items-stretch md:w-[200px]">
                      {/* Use GPS Button */}
                      <button
                        type="button"
                        onClick={handleGPSLocation}
                        disabled={isLocating}
                        className="flex-1 bg-[#0284c7] hover:bg-[#0275a1] disabled:bg-[#0284c7]/50 text-white font-semibold text-[14px] leading-tight px-4 rounded-[24px] shadow-[0_4px_12px_rgba(2,132,199,0.25)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 flex flex-col items-center justify-center gap-3 border-none cursor-pointer text-center h-[130px]"
                      >
                        <HugeiconsIcon icon={Location01Icon} className={`w-8 h-8 text-white ${isLocating ? "animate-pulse" : ""}`} strokeWidth={2} />
                        <span className="font-semibold block">
                          {isLocating ? "Locating..." : "Use GPS"}
                        </span>
                      </button>

                      {/* Select on Map Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setModalInitialCoords({ latitude, longitude });
                          setShowMapModal(true);
                        }}
                        className="flex-1 bg-[#0284c7] hover:bg-[#0275a1] text-white font-semibold text-[14px] leading-tight px-4 rounded-[24px] shadow-[0_4px_12px_rgba(2,132,199,0.25)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 flex flex-col items-center justify-center gap-3 border-none cursor-pointer text-center h-[130px]"
                      >
                        <HugeiconsIcon icon={MapIcon} className="w-8 h-8 text-white" strokeWidth={2} />
                        <span className="font-semibold block">
                          Select on Map
                        </span>
                      </button>
                    </div>
                  </div>
                </section>

                {/* Step 1 Action Buttons */}
                <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab("home")}
                    className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-semibold cursor-pointer border-none transition-all"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="px-8 py-3.5 bg-[#00ddff] hover:bg-[#00c8e6] text-[#0d2a3a] font-bold text-sm rounded-2xl shadow-md transition-all cursor-pointer flex items-center gap-2 border-none"
                  >
                    <span>Next: Upload Photos</span>
                    <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Document & Photo Upload Form */}
            {claimStep === 2 && (
              <form onSubmit={handleStep2Submit} className="max-w-4xl mx-auto flex flex-col gap-8 bg-white border border-slate-200/90 rounded-[32px] p-6 sm:p-10 shadow-sm">
                
                {/* Incident Summary Card */}
                <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Selected Vehicle</span>
                    <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">{claimPlate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Date & Time</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">{claimDate} at {claimTime}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Damage Category</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">{claimDamageType}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setClaimStep(1)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-semibold cursor-pointer border-none text-xs"
                  >
                    Edit Details
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl md:text-2xl font-semibold text-[#0d2a3a] tracking-tight">
                        Upload Claim Documents & Photos
                      </h2>
                      <p className="text-slate-500 text-xs mt-1">
                        Please upload clear photographs of vehicle damage and driver's license. Multiple photos allowed per category.
                      </p>
                    </div>

                    {isCheckingDuplicates && (
                      <div className="flex items-center gap-2 text-xs font-semibold text-cyan-600 bg-cyan-50 px-3 py-1.5 rounded-full border border-cyan-200">
                        <div className="w-3.5 h-3.5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                        <span>Verifying photos...</span>
                      </div>
                    )}
                  </div>

                  {/* 5 Upload Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    
                    {/* 1. Accident Front */}
                    <div className="flex flex-col">
                      <input
                        type="file"
                        ref={accidentFrontRef}
                        multiple
                        accept="image/*"
                        onChange={(e) => handleStep2FileChange(e, setAccidentFront, "Accident Front Angle")}
                        className="hidden"
                      />
                      {accidentFront.files.length === 0 ? (
                        <div
                          onClick={() => accidentFrontRef.current?.click()}
                          className="w-full h-[180px] bg-[#e2e8f0]/60 hover:bg-slate-200/70 border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all duration-150 active:scale-[0.98] select-none"
                        >
                          <HugeiconsIcon icon={Camera01Icon} className="w-10 h-10 text-slate-500 mb-2" strokeWidth={1.8} />
                          <span className="text-slate-800 text-sm font-bold block leading-tight">Front Angle Photo</span>
                          <span className="text-slate-500 text-[11px] mt-1 font-medium">Click to upload photo</span>
                          <span className="text-slate-400 text-[9px] mt-1">JPG, PNG up to 10MB</span>
                        </div>
                      ) : (
                        <div className="w-full h-[180px] bg-slate-50 border border-slate-300 rounded-3xl p-3 flex flex-col justify-between">
                          <span className="text-xs font-bold text-slate-700">Front Angle ({accidentFront.files.length})</span>
                          <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-[105px]">
                            {accidentFront.previews.map((prev, idx) => {
                              const isDup = !!duplicatesMap[prev];
                              return (
                                <div key={idx} className={`relative aspect-square rounded-xl overflow-hidden bg-slate-200 border ${isDup ? 'border-2 border-rose-500 ring-2 ring-rose-400/40' : 'border-slate-200'}`}>
                                  <img src={prev} alt="preview" className="w-full h-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => handleStep2RemoveFile(setAccidentFront, idx)}
                                    className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 text-[9px] cursor-pointer border-none"
                                  >
                                    &times;
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                          <button
                            type="button"
                            onClick={() => accidentFrontRef.current?.click()}
                            className="text-[10px] text-cyan-600 font-semibold hover:underline self-end cursor-pointer bg-transparent border-none"
                          >
                            + Add more
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 2. Accident Rear */}
                    <div className="flex flex-col">
                      <input
                        type="file"
                        ref={accidentRearRef}
                        multiple
                        accept="image/*"
                        onChange={(e) => handleStep2FileChange(e, setAccidentRear, "Accident Rear Angle")}
                        className="hidden"
                      />
                      {accidentRear.files.length === 0 ? (
                        <div
                          onClick={() => accidentRearRef.current?.click()}
                          className="w-full h-[180px] bg-[#e2e8f0]/60 hover:bg-slate-200/70 border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all duration-150 active:scale-[0.98] select-none"
                        >
                          <HugeiconsIcon icon={Camera01Icon} className="w-10 h-10 text-slate-500 mb-2" strokeWidth={1.8} />
                          <span className="text-slate-800 text-sm font-bold block leading-tight">Rear Angle Photo</span>
                          <span className="text-slate-500 text-[11px] mt-1 font-medium">Click to upload photo</span>
                          <span className="text-slate-400 text-[9px] mt-1">JPG, PNG up to 10MB</span>
                        </div>
                      ) : (
                        <div className="w-full h-[180px] bg-slate-50 border border-slate-300 rounded-3xl p-3 flex flex-col justify-between">
                          <span className="text-xs font-bold text-slate-700">Rear Angle ({accidentRear.files.length})</span>
                          <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-[105px]">
                            {accidentRear.previews.map((prev, idx) => {
                              const isDup = !!duplicatesMap[prev];
                              return (
                                <div key={idx} className={`relative aspect-square rounded-xl overflow-hidden bg-slate-200 border ${isDup ? 'border-2 border-rose-500 ring-2 ring-rose-400/40' : 'border-slate-200'}`}>
                                  <img src={prev} alt="preview" className="w-full h-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => handleStep2RemoveFile(setAccidentRear, idx)}
                                    className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 text-[9px] cursor-pointer border-none"
                                  >
                                    &times;
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                          <button
                            type="button"
                            onClick={() => accidentRearRef.current?.click()}
                            className="text-[10px] text-cyan-600 font-semibold hover:underline self-end cursor-pointer bg-transparent border-none"
                          >
                            + Add more
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 3. Accident Side */}
                    <div className="flex flex-col">
                      <input
                        type="file"
                        ref={accidentSideRef}
                        multiple
                        accept="image/*"
                        onChange={(e) => handleStep2FileChange(e, setAccidentSide, "Accident Side Angle")}
                        className="hidden"
                      />
                      {accidentSide.files.length === 0 ? (
                        <div
                          onClick={() => accidentSideRef.current?.click()}
                          className="w-full h-[180px] bg-[#e2e8f0]/60 hover:bg-slate-200/70 border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all duration-150 active:scale-[0.98] select-none"
                        >
                          <HugeiconsIcon icon={Camera01Icon} className="w-10 h-10 text-slate-500 mb-2" strokeWidth={1.8} />
                          <span className="text-slate-800 text-sm font-bold block leading-tight">Side Angle Photo</span>
                          <span className="text-slate-500 text-[11px] mt-1 font-medium">Click to upload photo</span>
                          <span className="text-slate-400 text-[9px] mt-1">JPG, PNG up to 10MB</span>
                        </div>
                      ) : (
                        <div className="w-full h-[180px] bg-slate-50 border border-slate-300 rounded-3xl p-3 flex flex-col justify-between">
                          <span className="text-xs font-bold text-slate-700">Side Angle ({accidentSide.files.length})</span>
                          <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-[105px]">
                            {accidentSide.previews.map((prev, idx) => {
                              const isDup = !!duplicatesMap[prev];
                              return (
                                <div key={idx} className={`relative aspect-square rounded-xl overflow-hidden bg-slate-200 border ${isDup ? 'border-2 border-rose-500 ring-2 ring-rose-400/40' : 'border-slate-200'}`}>
                                  <img src={prev} alt="preview" className="w-full h-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => handleStep2RemoveFile(setAccidentSide, idx)}
                                    className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 text-[9px] cursor-pointer border-none"
                                  >
                                    &times;
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                          <button
                            type="button"
                            onClick={() => accidentSideRef.current?.click()}
                            className="text-[10px] text-cyan-600 font-semibold hover:underline self-end cursor-pointer bg-transparent border-none"
                          >
                            + Add more
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 4. Driver's License Front */}
                    <div className="flex flex-col">
                      <input
                        type="file"
                        ref={licenseFrontRef}
                        multiple
                        accept="image/*"
                        onChange={(e) => handleStep2FileChange(e, setLicenseFront, "Driver License Front", true)}
                        className="hidden"
                      />
                      {licenseFront.files.length === 0 ? (
                        <div
                          onClick={() => licenseFrontRef.current?.click()}
                          className="w-full h-[180px] bg-[#e2e8f0]/60 hover:bg-slate-200/70 border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all duration-150 active:scale-[0.98] select-none"
                        >
                          <HugeiconsIcon icon={File01Icon} className="w-10 h-10 text-slate-500 mb-2" strokeWidth={1.8} />
                          <span className="text-slate-800 text-sm font-bold block leading-tight">Driver's License - Front</span>
                          <span className="text-slate-500 text-[11px] mt-1 font-medium">Click to upload photo</span>
                          <span className="text-slate-400 text-[9px] mt-1">Clear document image</span>
                        </div>
                      ) : (
                        <div className="w-full h-[180px] bg-slate-50 border border-slate-300 rounded-3xl p-3 flex flex-col justify-between">
                          <span className="text-xs font-bold text-slate-700">License Front ({licenseFront.files.length})</span>
                          <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-[105px]">
                            {licenseFront.previews.map((prev, idx) => (
                              <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-slate-200 border border-slate-200">
                                <img src={prev} alt="license front preview" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => handleStep2RemoveFile(setLicenseFront, idx)}
                                  className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 text-[9px] cursor-pointer border-none"
                                >
                                  &times;
                                </button>
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => licenseFrontRef.current?.click()}
                            className="text-[10px] text-cyan-600 font-semibold hover:underline self-end cursor-pointer bg-transparent border-none"
                          >
                            + Add more
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 5. Driver's License Rear */}
                    <div className="flex flex-col">
                      <input
                        type="file"
                        ref={licenseRearRef}
                        multiple
                        accept="image/*"
                        onChange={(e) => handleStep2FileChange(e, setLicenseRear, "Driver License Rear", true)}
                        className="hidden"
                      />
                      {licenseRear.files.length === 0 ? (
                        <div
                          onClick={() => licenseRearRef.current?.click()}
                          className="w-full h-[180px] bg-[#e2e8f0]/60 hover:bg-slate-200/70 border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all duration-150 active:scale-[0.98] select-none"
                        >
                          <HugeiconsIcon icon={File01Icon} className="w-10 h-10 text-slate-500 mb-2" strokeWidth={1.8} />
                          <span className="text-slate-800 text-sm font-bold block leading-tight">Driver's License - Rear</span>
                          <span className="text-slate-500 text-[11px] mt-1 font-medium">Click to upload photo</span>
                          <span className="text-slate-400 text-[9px] mt-1">Clear document image</span>
                        </div>
                      ) : (
                        <div className="w-full h-[180px] bg-slate-50 border border-slate-300 rounded-3xl p-3 flex flex-col justify-between">
                          <span className="text-xs font-bold text-slate-700">License Rear ({licenseRear.files.length})</span>
                          <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-[105px]">
                            {licenseRear.previews.map((prev, idx) => (
                              <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-slate-200 border border-slate-200">
                                <img src={prev} alt="license rear preview" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => handleStep2RemoveFile(setLicenseRear, idx)}
                                  className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 text-[9px] cursor-pointer border-none"
                                >
                                  &times;
                                </button>
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => licenseRearRef.current?.click()}
                            className="text-[10px] text-cyan-600 font-semibold hover:underline self-end cursor-pointer bg-transparent border-none"
                          >
                            + Add more
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Step 2 Action Buttons */}
                <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setClaimStep(1)}
                    className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-semibold cursor-pointer border-none transition-all"
                  >
                    Back to Details
                  </button>

                  <button
                    type="submit"
                    disabled={submittingClaim}
                    className="px-10 py-3.5 bg-[#0d2a3a] hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-md transition-all cursor-pointer flex items-center gap-2 border-none"
                  >
                    {submittingClaim ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Submitting Claim...</span>
                      </>
                    ) : (
                      <>
                        <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-5 h-5 text-white" />
                        <span>Submit Claim to Branch</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Full-screen web Map Modal */}
            {showMapModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 transition-all duration-300">
                <div className="bg-white rounded-[32px] w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col h-[85vh] border border-slate-100">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
                    <h3 className="text-base font-bold text-[#0d2a3a]">Select Location on Map</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setModalInitialCoords(null);
                        setShowMapModal(false);
                      }}
                      className="text-slate-400 hover:text-slate-700 text-xl font-medium cursor-pointer border-none bg-transparent transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex-1 bg-slate-50 relative overflow-hidden">
                    <iframe
                      id="modal-map-iframe"
                      width="100%"
                      height="100%"
                      className="border-none"
                      src={`/api/map?lat=${modalInitialCoords?.latitude ?? latitude}&lon=${modalInitialCoords?.longitude ?? longitude}`}
                      allowFullScreen
                    />

                    <div className="absolute top-4 left-4 right-4 z-20 max-w-md bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-full pl-5 pr-1.5 py-2 shadow-lg flex items-center gap-2">
                      <HugeiconsIcon icon={Search01Icon} className="w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search landmark..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            geocodeAddress((e.target as HTMLInputElement).value);
                          }
                        }}
                        className="flex-1 bg-transparent border-none text-xs text-slate-800 focus:outline-none"
                      />
                    </div>

                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
                      <button
                        type="button"
                        onClick={() => setShowMapModal(false)}
                        className="bg-[#0d2a3a] hover:bg-slate-800 text-white font-bold text-xs px-6 py-3 rounded-full shadow-lg border-none cursor-pointer flex items-center gap-2"
                      >
                        <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4" />
                        <span>Confirm This Location</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Success Popup Modal */}
            {showSuccessModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-[32px] w-full max-w-md p-8 text-center shadow-2xl border border-slate-100 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-9 h-9" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Claim Successfully Lodged</h3>
                  <p className="text-xs text-slate-500 mt-2">
                    Your accident claim has been recorded and submitted to the regional branch inspection team.
                  </p>

                  <div className="mt-5 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl w-full">
                    <span className="text-[11px] text-slate-400 block font-medium">Claim Reference ID</span>
                    <span className="text-base font-mono font-bold text-slate-800 mt-0.5 block">{submittedClaimNumber}</span>
                  </div>

                  <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSuccessModal(false);
                        setClaimStep(1);
                        setClaimDesc("");
                        setAccidentFront({ files: [], previews: [] });
                        setAccidentRear({ files: [], previews: [] });
                        setAccidentSide({ files: [], previews: [] });
                        setLicenseFront({ files: [], previews: [] });
                        setLicenseRear({ files: [], previews: [] });
                        setDuplicatesMap({});
                      }}
                      className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-semibold cursor-pointer border-none transition-all"
                    >
                      Lodge Another Claim
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSuccessModal(false);
                        setActiveTab("my_claims");
                      }}
                      className="flex-1 py-3 bg-[#0d2a3a] hover:bg-slate-800 text-white rounded-2xl text-xs font-bold cursor-pointer border-none shadow-md transition-all"
                    >
                      View in My Claims
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: MY CLAIMS (Exact PolicyHolder My_claims list and details) */}
        {/* ========================================================================= */}
        {activeTab === "my_claims" && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Your Lodged Claims</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Track inspection stages and review documents submitted for authorized vehicles
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={refreshClaims}
                  disabled={loadingClaims}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border-none cursor-pointer flex items-center gap-1.5"
                >
                  <span>{loadingClaims ? "Refreshing..." : "Refresh"}</span>
                </button>
                <button
                  onClick={() => setActiveTab("new_claim")}
                  className="px-4 py-2 bg-[#ff9800] hover:bg-[#ff8f00] text-white text-xs font-bold rounded-xl cursor-pointer border-none shadow-sm"
                >
                  + Lodge Claim
                </button>
              </div>
            </div>

            {claims.length === 0 ? (
              <div className="bg-white border border-slate-200/90 rounded-[28px] p-12 text-center shadow-xs">
                <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <HugeiconsIcon icon={Clock01Icon} className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm mb-1">No Claims Lodged</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                  You haven't submitted any accident claims for your authorized vehicles yet.
                </p>
                <button
                  onClick={() => setActiveTab("new_claim")}
                  className="px-5 py-2.5 bg-[#0d2a3a] text-white text-xs font-semibold rounded-xl border-none cursor-pointer shadow-sm"
                >
                  Lodge First Claim
                </button>
              </div>
            ) : (
              <div className="bg-white border border-slate-200/90 rounded-[28px] overflow-hidden shadow-xs divide-y divide-slate-100">
                {claims.map((claim) => (
                  <div
                    key={claim.claimNumber}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div className="px-3 py-1.5 bg-slate-900 text-white rounded-xl font-mono font-bold text-xs tracking-wider flex-shrink-0">
                        {formatPlate(claim.vehiclePlate)}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 text-sm">{claim.claimNumber}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            claim.status === "Approved" || claim.status === "Settled"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : claim.status === "Review" || claim.status === "Inspection"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>
                            {claim.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {claim.damageType} • Incident: {claim.incidentDate} • {claim.location}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenClaimDetails(claim.claimNumber)}
                      className="px-4 py-2 bg-[#0d2a3a] hover:bg-slate-800 text-white font-semibold text-xs rounded-xl border-none transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs self-end md:self-auto"
                    >
                      <HugeiconsIcon icon={ViewIcon} className="w-3.5 h-3.5 text-white" />
                      <span>View Details</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: DOCUMENTS (Exact PolicyHolder Documents vault) */}
        {/* ========================================================================= */}
        {activeTab === "documents" && (
          <section className="max-w-4xl mx-auto space-y-6">
            <div className="pb-4 border-b border-slate-200/80">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Claim Documents & Evidence</h2>
              <p className="text-xs text-slate-500 mt-1">
                Attach repair estimates, police reports, or additional accident evidence
              </p>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-[28px] p-6 sm:p-8 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">Upload Supporting Document</h3>

              {docUploadSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs">
                  {docUploadSuccess}
                </div>
              )}
              {docUploadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                  {docUploadError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Select Claim</label>
                  <select
                    value={uploadTargetClaim}
                    onChange={(e) => setUploadTargetClaim(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-[#0d2a3a]"
                  >
                    <option value="">-- Choose Claim --</option>
                    {claims.map((c) => (
                      <option key={c.claimNumber} value={c.claimNumber}>
                        {c.claimNumber} ({c.vehiclePlate} - {c.damageType})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Document Title / Type</label>
                  <input
                    type="text"
                    placeholder="e.g. Police Report, Repair Estimate, Receipt"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-[#0d2a3a]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold text-xs mb-1">Select File</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleImageFile(e, setDocFileBase64)}
                    className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                  />
                  {docFileBase64 && (
                    <span className="text-xs text-emerald-600 font-semibold">File Attached</span>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleUploadDocument}
                  disabled={uploadingDoc || !uploadTargetClaim || !docName || !docFileBase64}
                  className="px-6 py-2.5 bg-[#0d2a3a] hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2 border-none"
                >
                  {uploadingDoc ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <HugeiconsIcon icon={Upload01Icon} className="w-3.5 h-3.5 text-white" />
                      <span>Attach to Claim</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: LIVE CHAT (Communicate with Policyholder, Agent, Branch) */}
        {/* ========================================================================= */}
        {activeTab === "chat" && profile && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Direct Claims & Operations Chat</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Real-time communication with Vehicle Owner ({profile.policyHolderName}), Claims Agents, and {profile.branch} Branch Office
                </p>
              </div>
              <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Active Channel</span>
              </span>
            </div>

            <DriverClaimChat
              apiUrl={API_URL}
              driverSessionToken={sessionToken || ""}
              driverProfile={{
                driverName: profile.driverName,
                driverNicRaw: profile.driverNicRaw,
                driverNicMasked: profile.driverNicMasked,
                driverPhone: profile.driverPhone,
                policyHolderName: profile.policyHolderName,
                policyHolderNicRaw: profile.policyHolderNicRaw,
                policyHolderEmail: profile.policyHolderEmail,
                policyHolderPhone: profile.policyHolderPhone,
                branch: profile.branch,
                reference: profile.reference
              }}
              claims={claims}
            />
          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: DIGITAL PASS (Official Sanasa Digital Pass) */}
        {/* ========================================================================= */}
        {activeTab === "digital_pass" && (
          <section className="max-w-xl mx-auto space-y-6">
            <div className="bg-white border border-slate-200/90 rounded-[28px] p-6 sm:p-8 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between pb-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <Image
                    src="/logo.png"
                    alt="Sanasa General Insurance"
                    width={110}
                    height={44}
                    className="h-9 w-auto object-contain"
                  />
                  <div className="border-l border-slate-200 pl-3">
                    <h3 className="font-bold text-slate-900 text-sm">Digital Driver Pass</h3>
                    <p className="text-[11px] text-slate-400">Official Authorization • Sri Lanka</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>VERIFIED PASS</span>
                </div>
              </div>

              <div className="py-6 space-y-4">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Authorized Driver</span>
                  <span className="text-xl font-bold text-slate-900 block mt-0.5">{profile?.driverName}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10.5px] uppercase font-bold block">Masked NIC</span>
                    <span className="font-mono text-slate-800 font-semibold">{profile?.driverNicMasked}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10.5px] uppercase font-bold block">Phone Number</span>
                    <span className="font-mono text-slate-800">{profile?.driverPhone}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-2">
                  <div className="flex justify-between text-slate-500">
                    <span>Vehicle Owner (Policyholder):</span>
                    <span className="font-semibold text-slate-900">{profile?.policyHolderName}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Regional Branch Office:</span>
                    <span className="font-semibold text-slate-900">{profile?.branch}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Pass Reference:</span>
                    <span className="font-mono text-[#0d2a3a] font-bold">{profile?.reference}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Verification Token:</span>
                    <span className="font-mono text-slate-900 font-bold">{profile?.verificationToken}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 text-[10.5px] uppercase font-bold tracking-wider block mb-2">
                    Authorized Operating Vehicles
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {vehicles.map((v) => (
                      <span
                        key={v.numberPlate}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-white rounded-lg font-mono font-bold text-xs"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <span>{formatPlate(v.numberPlate)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Sanasa Central Cryptographic Registry</span>
                <span>Valid Across Sri Lanka</span>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Claim Details Modal */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 shadow-xl relative max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 bg-slate-900 text-white rounded-xl font-mono font-bold text-xs">
                  {formatPlate(selectedClaim.vehiclePlate)}
                </span>
                <div>
                  <h3 className="font-mono font-bold text-slate-900 text-sm">{selectedClaim.claimNumber}</h3>
                  <p className="text-[11px] text-slate-400">
                    Lodged: {new Date(selectedClaim.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedClaim(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center border-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
                Claim Verification Pipeline
              </span>

              <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                {[
                  { step: 1, label: "Submitted" },
                  { step: 2, label: "Branch Review" },
                  { step: 3, label: "Inspection" },
                  { step: 4, label: "Settlement" },
                ].map((s) => {
                  const isDone = (selectedClaim.currentStep || 1) >= s.step;
                  return (
                    <div key={s.step} className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${
                        isDone ? "bg-[#0d2a3a] text-white" : "bg-slate-200 text-slate-500"
                      }`}>
                        {s.step}
                      </div>
                      <span className={isDone ? "text-slate-900 font-bold" : "text-slate-400"}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Damage Type:</span>
                <span className="text-slate-900 font-semibold">{selectedClaim.damageType}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Location:</span>
                <span className="text-slate-900">{selectedClaim.location}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Branch:</span>
                <span className="text-slate-900">{selectedClaim.branch || profile?.branch}</span>
              </div>
              {selectedClaim.description && (
                <div className="pt-2">
                  <span className="text-slate-500 block mb-1">Description:</span>
                  <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700">
                    {selectedClaim.description}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedClaim(null);
                  setActiveTab("chat");
                }}
                className="px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-xl text-xs font-semibold cursor-pointer border-none shadow-2xs flex items-center gap-1.5 transition-all"
              >
                <HugeiconsIcon icon={BubbleChatIcon} className="w-4 h-4" />
                <span>Chat on this Claim</span>
              </button>

              <button
                onClick={() => setSelectedClaim(null)}
                className="px-5 py-2 bg-[#0d2a3a] hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer border-none shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Live Chat Action Button */}
      <button
        onClick={() => setActiveTab("chat")}
        className="fixed bottom-6 right-6 z-40 bg-[#0284c7] hover:bg-[#0369a1] text-white p-4 rounded-full shadow-[0_10px_25px_rgba(2,132,199,0.5)] flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95 border-none cursor-pointer"
        title="Open Live Chat"
      >
        <HugeiconsIcon icon={BubbleChatIcon} className="w-6 h-6" strokeWidth={2} />
        <span className="font-bold text-xs pr-1 hidden sm:inline">Live Chat</span>
      </button>



      {/* POLICYHOLDER FOOTER (Exact same footer used across the entire Policyholder website) */}
      <PolicyHolderFooter />
    </div>
  );
}
