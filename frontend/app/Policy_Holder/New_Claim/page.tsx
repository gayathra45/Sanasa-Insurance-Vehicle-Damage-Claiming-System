"use client";

import React, { useState, useEffect, useRef } from "react";
import PolicyHolderNavbar from "@/app/Components/Policy_Holder/Navbar";
import PolicyHolderFooter from "@/app/Components/Policy_Holder/footer";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { compressImage } from "../../utils/imageCompressor";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Car01Icon,
  ArrowDown01Icon,
  Camera01Icon,
  Location01Icon,
  Cancel01Icon,
  MapIcon,
  Search01Icon,
  Gps01Icon,
  BubbleChatIcon,
} from "@hugeicons/core-free-icons";

function formatNumberPlate(plate: string): string {
  if (!plate) return "";
  const cleaned = plate.trim();
  if (cleaned.includes("-")) {
    return cleaned;
  }
  const lastNumbersMatch = cleaned.match(/^(.*[A-Za-z]+)(\d+)$/);
  if (lastNumbersMatch) {
    return `${lastNumbersMatch[1].trim().toUpperCase()}-${lastNumbersMatch[2]}`;
  }
  return cleaned;
}

function getVehicleEmoji(type: string): string {
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

interface Vehicle {
  numberPlate: string;
  vehicleType: string;
  year: string;
  company: string;
  model: string;
  engineNumber?: string;
  chassisNumber?: string;
  policyNumber?: string;
}

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
    const loc = props.locality.split(';')[0].trim();
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
  return Math.abs(parseFloat(lat1) - parseFloat(lat2)) < threshold &&
         Math.abs(parseFloat(lon1) - parseFloat(lon2)) < threshold;
}

function areNamesSimilar(n1: string, n2: string): boolean {
  const name1 = n1.split(',')[0].toLowerCase().trim();
  const name2 = n2.split(',')[0].toLowerCase().trim();
  if (name1 === name2) return true;
  if (name1.includes(name2) || name2.includes(name1)) {
    return true;
  }
  return false;
}

function getResultScore(item: any, queryWords: string[]): number {
  const name = item.display_name.toLowerCase();
  const key = (item.category_key || "").toLowerCase();
  const value = (item.category_value || "").toLowerCase();
  
  const firstPart = item.display_name.split(',')[0].toLowerCase();
  const restPart = item.display_name.split(',').slice(1).join(',').toLowerCase();

  let score = 0;

  for (const word of queryWords) {
    if (firstPart.includes(word)) {
      score += 25;
    } else if (restPart.includes(word)) {
      score += 5;
    }
  }

  if (queryWords.length > 0 && firstPart.includes(queryWords[0])) {
    score += 30;
  }

  const queryStr = queryWords.join(' ');
  if (firstPart === queryStr) {
    score += 40;
  }

  if (queryWords.includes("railway") || queryWords.includes("train")) {
    if (key === "railway") {
      score += 50;
    }
    if (value === "station") {
      score += 20;
    }
  }
  
  if (queryWords.includes("police")) {
    if (value === "police" || key === "police" || name.includes("police")) {
      score += 50;
    }
  }

  if (queryWords.includes("bus")) {
    if (value === "bus_station" || value === "bus_stop" || key === "bus") {
      score += 50;
    }
  }

  if (queryWords.includes("hospital") || queryWords.includes("clinic")) {
    if (value === "hospital" || value === "clinic" || (key === "amenity" && value === "hospital")) {
      score += 50;
    }
  }

  return score;
}

const translations = {
  en: {
    title: "File New Claim",
    subtitle: "Report an accident or damage incident",
    vehicleIncident: "Vehicle & Incident",
    selectVehicle: "Select Vehicle",
    selectVehiclePlaceholder: "Select Vehicle",
    incidentDate: "Incident Date",
    incidentTime: "Incident Time",
    incidentType: "Incident Type",
    selectTypePlaceholder: "Select incident type",
    typeAccident: "Accident with another vehicle",
    typeCollision: "Single vehicle collision (e.g. tree, post)",
    typeNatural: "Natural disaster (flood, tree fall)",
    typeTheft: "Vandalism or theft",
    typeOther: "Other damage",
    descriptionLabel: "Describe what happened (minimum 10 characters) *",
    descriptionPlaceholder: "Type incident description here...",
    locationSearchLabel: "Search accident location or use GPS *",
    locationPlaceholder: "Search address or location...",
    useGps: "Use GPS Location",
    orPin: "Or pin exact location on map",
    otherInvolved: "Were other vehicles involved? *",
    yes: "Yes",
    no: "No",
    otherCount: "Number of other vehicles involved",
    selectCountPlaceholder: "Select number of vehicles",
    otherVehicleHeader: "Other Vehicle",
    plateNum: "Vehicle Plate Number *",
    insuranceCompany: "Insurance Company *",
    policyNum: "Policy Number *",
    driverName: "Driver Full Name *",
    licensePhotos: "Upload Driver's License Photos (Optional)",
    scenePhotos: "Upload Other Vehicle/Scene Photos (Optional)",
    nextBtn: "Next: Upload Photos & Documents",
    fillAll: "Please fill in all required fields marked with *",
    dateAlert: "Please select an incident date within the last 7 days."
  },
  si: {
    title: "නව හිමිකම් පෑමක් ඇතුළත් කරන්න",
    subtitle: "අනතුරක් හෝ හානියක් සිදුවීමක් වාර්තා කරන්න",
    vehicleIncident: "වාහනය සහ අනතුර",
    selectVehicle: "වාහනය තෝරන්න",
    selectVehiclePlaceholder: "වාහනය තෝරන්න",
    incidentDate: "අනතුර සිදු වූ දිනය",
    incidentTime: "අනතුර සිදු වූ වේලාව",
    incidentType: "අනතුරු වර්ගය",
    selectTypePlaceholder: "අනතුරු වර්ගය තෝරන්න",
    typeAccident: "වෙනත් වාහනයක් සමඟ සිදු වූ අනතුරක්",
    typeCollision: "තනි වාහන ගැටීමක් (උදා: ගසක, කණුවක)",
    typeNatural: "ස්වාභාවික විපතක් (ගංවතුර, ගසක් කඩා වැටීම)",
    typeTheft: "මංකොල්ලකෑමක් හෝ සොරකමක්",
    typeOther: "වෙනත් හානියක්",
    descriptionLabel: "සිදු වූ දේ විස්තර කරන්න (අවම වශයෙන් අකුරු 10 ක්) *",
    descriptionPlaceholder: "සිදුවීම පිළිබඳ විස්තර මෙහි ටයිප් කරන්න...",
    locationSearchLabel: "අනතුර සිදු වූ ස්ථානය සොයන්න හෝ GPS භාවිතා කරන්න *",
    locationPlaceholder: "ලිපිනය හෝ ස්ථානය සොයන්න...",
    useGps: "GPS ස්ථානය භාවිතා කරන්න",
    orPin: "නැතහොත් සිතියම මත නිවැරදි ස්ථානය ලකුණු කරන්න",
    otherInvolved: "වෙනත් වාහන සම්බන්ධ වී තිබේද? *",
    yes: "ඔව්",
    no: "නැත",
    otherCount: "සම්බන්ධ වූ වෙනත් වාහන ගණන",
    selectCountPlaceholder: "වාහන ගණන තෝරන්න",
    otherVehicleHeader: "වෙනත් වාහනය",
    plateNum: "වාහන තහඩු අංකය *",
    insuranceCompany: "රක්‍ෂණ සමාගම *",
    policyNum: "ප්‍රතිපත්ති අංකය *",
    driverName: "රියදුරුගේ සම්පූර්ණ නම *",
    licensePhotos: "රියදුරු බලපත්‍රයේ ඡායාරූප උඩුගත කරන්න (අභිමත පරිදි)",
    scenePhotos: "අනෙක් වාහනයේ/සිද්ධියේ ඡායාරූප උඩුගත කරන්න (අභිමත පරිදි)",
    nextBtn: "ඊළඟ: ඡායාරූප සහ ලේඛන උඩුගත කරන්න",
    fillAll: "කරුණාකර * ලකුණු කර ඇති සියලුම අනිවාර්ය ක්ෂේත්‍ර පුරවන්න",
    dateAlert: "කරුණාකර පසුගිය දින 7 ඇතුළත සිදුවූ අනතුරු දිනයක් තෝරන්න."
  },
  ta: {
    title: "புதிய கோரிக்கையைத் தாக்கல் செய்",
    subtitle: "விபத்து அல்லது சேதச் சம்பவத்தை அறிக்கை செய்யவும்",
    vehicleIncident: "வாகனம் & சம்பவம்",
    selectVehicle: "வாகனத்தைத் தேர்ந்தெடுக்கவும்",
    selectVehiclePlaceholder: "வாகனத்தைத் தேர்ந்தெடுக்கவும்",
    incidentDate: "சம்பவத் தேதி",
    incidentTime: "சம்பவ நேரம்",
    incidentType: "சம்பவ வகை",
    selectTypePlaceholder: "சம்பவ வகையைத் தேர்ந்தெடுக்கவும்",
    typeAccident: "மற்றொரு வாகனத்துடனான விபத்து",
    typeCollision: "ஒற்றை வாகன மோதல் (உதா: மரம், கம்பம்)",
    typeNatural: "இயற்கை பேரழிவு (வெள்ளம், மரம் விழுதல்)",
    typeTheft: " vandalism அல்லது திருட்டு",
    typeOther: "இதர சேதங்கள்",
    descriptionLabel: "நடந்ததை விவரிக்கவும் (குறைந்தது 10 எழுத்துக்கள்) *",
    descriptionPlaceholder: "சம்பவ விவரங்களை இங்கே தட்டச்சு செய்யவும்...",
    locationSearchLabel: "சம்பவ இடத்தைத் தேடவும் அல்லது GPS ஐப் பயன்படுத்தவும் *",
    locationPlaceholder: "முகவரி அல்லது இடத்தைத் தேடுங்கள்...",
    useGps: "GPS இருப்பிடத்தைப் பயன்படுத்துக",
    orPin: "அல்லது வரைபடத்தில் சரியான இடத்தைக் குறிக்கவும்",
    otherInvolved: "மற்ற வாகனங்கள் இதில் ஈடுபட்டதா? *",
    yes: "ஆம்",
    no: "இல்லை",
    otherCount: "ஈடுபட்ட மற்ற வாகனங்களின் எண்ணிக்கை",
    selectCountPlaceholder: "வாகனங்களின் எண்ணிக்கையைத் தேர்ந்தெடுக்கவும்",
    otherVehicleHeader: "மற்ற வாகனம்",
    plateNum: "வாகன எண் தகடு *",
    insuranceCompany: "காப்பீட்டு நிறுவனம் *",
    policyNum: "பாலிசி எண் *",
    driverName: "ஓட்டுநரின் முழுப் பெயர் *",
    licensePhotos: "ஓட்டுநர் உரிம புகைப்படங்களைப் பதிவேற்றவும் (விருப்பத்திற்குரியது)",
    scenePhotos: "மற்ற வாகன/சம்பவ புகைப்படங்களைப் பதிவேற்றவும் (விருப்பத்திற்குரியது)",
    nextBtn: "அடுத்து: புகைப்படங்கள் & ஆவணங்களைப் பதிவேற்றவும்",
    fillAll: "தயவுசெய்து * குறியிடப்பட்ட அனைத்து கட்டாய புலங்களையும் நிரப்பவும்",
    dateAlert: "கடந்த 7 நாட்களுக்குள் நடந்த சம்பவத் தேதியைத் தேர்ந்தெடுக்கவும்."
  }
};

export default function FileNewClaim() {
  const [lang, setLang] = useState<"en" | "si" | "ta">("en");
  const router = useRouter();

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem("language") as "en" | "si" | "ta";
    if (savedLang && ["en", "si", "ta"].includes(savedLang)) {
      setLang(savedLang);
    }
  }, []);

  // Listen to language change events from navbar
  useEffect(() => {
    const handleLangChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setLang(customEvent.detail);
      }
    };
    window.addEventListener("language-changed", handleLangChange);
    return () => window.removeEventListener("language-changed", handleLangChange);
  }, []);

  const t = translations[lang];

  // State for form fields
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [incidentDate, setIncidentDate] = useState("");

  const getMinMaxDates = () => {
    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);

    const formatDateStr = (date: Date) => {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    return {
      max: formatDateStr(today),
      min: formatDateStr(lastWeek)
    };
  };

  const { min: minDate, max: maxDate } = getMinMaxDates();
  const [incidentTime, setIncidentTime] = useState("");
  const [damageType, setDamageType] = useState("");
  const [description, setDescription] = useState("");
  // States for other vehicles involved
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

  const handleCountChange = (count: number) => {
    setOtherVehiclesCount(count);
    setOtherVehicles((prev) => {
      const next = [...prev];
      if (next.length < count) {
        while (next.length < count) {
          next.push({
            vehiclePlate: "",
            insuranceCompany: "",
            policyNumber: "",
            driverName: "",
            licensePhotosPreviews: [],
            licensePhotosBase64: [],
            vehiclePhotosPreviews: [],
            vehiclePhotosBase64: []
          });
        }
      } else if (next.length > count) {
        next.splice(count);
      }
      return next;
    });
  };

  const updateOtherVehicleField = (index: number, field: string, value: any) => {
    setOtherVehicles((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleOtherLicenseUpload = async (index: number, filesList: FileList | null) => {
    if (!filesList) return;
    const selectedFiles = Array.from(filesList);
    const previews: string[] = [];
    const base64s: string[] = [];

    for (const file of selectedFiles) {
      if (file.size <= 5 * 1024 * 1024) {
        previews.push(URL.createObjectURL(file));
        try {
          const base64 = await compressImage(file);
          base64s.push(base64);
        } catch (err) {
          console.error("Compression error", err);
        }
      } else {
        alert(`File "${file.name}" exceeds 5MB size limit.`);
      }
    }

    setOtherVehicles((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        licensePhotosPreviews: [...next[index].licensePhotosPreviews, ...previews],
        licensePhotosBase64: [...next[index].licensePhotosBase64, ...base64s]
      };
      return next;
    });
  };

  const removeOtherLicensePhoto = (index: number, photoIdx: number) => {
    setOtherVehicles((prev) => {
      const next = [...prev];
      const previews = [...next[index].licensePhotosPreviews];
      URL.revokeObjectURL(previews[photoIdx]);
      previews.splice(photoIdx, 1);
      const base64s = [...next[index].licensePhotosBase64];
      base64s.splice(photoIdx, 1);
      next[index] = {
        ...next[index],
        licensePhotosPreviews: previews,
        licensePhotosBase64: base64s
      };
      return next;
    });
  };

  const handleOtherVehiclePhotoUpload = async (index: number, filesList: FileList | null) => {
    if (!filesList) return;
    const selectedFiles = Array.from(filesList);
    const previews: string[] = [];
    const base64s: string[] = [];

    for (const file of selectedFiles) {
      if (file.size <= 5 * 1024 * 1024) {
        previews.push(URL.createObjectURL(file));
        try {
          const base64 = await compressImage(file);
          base64s.push(base64);
        } catch (err) {
          console.error("Compression error", err);
        }
      } else {
        alert(`File "${file.name}" exceeds 5MB size limit.`);
      }
    }

    setOtherVehicles((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        vehiclePhotosPreviews: [...next[index].vehiclePhotosPreviews, ...previews],
        vehiclePhotosBase64: [...next[index].vehiclePhotosBase64, ...base64s]
      };
      return next;
    });
  };

  const removeOtherVehiclePhoto = (index: number, photoIdx: number) => {
    setOtherVehicles((prev) => {
      const next = [...prev];
      const previews = [...next[index].vehiclePhotosPreviews];
      URL.revokeObjectURL(previews[photoIdx]);
      previews.splice(photoIdx, 1);
      const base64s = [...next[index].vehiclePhotosBase64];
      base64s.splice(photoIdx, 1);
      next[index] = {
        ...next[index],
        vehiclePhotosPreviews: previews,
        vehiclePhotosBase64: base64s
      };
      return next;
    });
  };
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

  // Restore draft details from sessionStorage if it exists on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const draftStr = sessionStorage.getItem("current_claim_draft");
      if (draftStr) {
        try {
          const draft = JSON.parse(draftStr);
          if (draft.selectedVehicle) setSelectedVehicle(draft.selectedVehicle);
          if (draft.incidentDate) setIncidentDate(draft.incidentDate);
          if (draft.incidentTime) setIncidentTime(draft.incidentTime);
          if (draft.damageType) setDamageType(draft.damageType);
          if (draft.description) setDescription(draft.description);
          if (draft.otherVehiclesInvolved) {
            setOtherVehiclesInvolved(draft.otherVehiclesInvolved);
          }
          if (draft.otherVehiclesCount) {
            setOtherVehiclesCount(draft.otherVehiclesCount);
          }
          if (draft.otherVehicles && Array.isArray(draft.otherVehicles)) {
            setOtherVehicles(draft.otherVehicles);
          } else if (draft.otherVehicleDetails) {
            // Support recovery for single-object legacy drafts
            const v = draft.otherVehicleDetails;
            if (v.vehiclePlate || v.driverName || v.insuranceCompany) {
              setOtherVehiclesInvolved("yes");
              setOtherVehiclesCount(1);
              setOtherVehicles([{
                vehiclePlate: v.vehiclePlate || "",
                insuranceCompany: v.insuranceCompany || "",
                policyNumber: v.policyNumber || "",
                driverName: v.driverName || "",
                licensePhotosPreviews: v.licensePhotos || [],
                licensePhotosBase64: v.licensePhotos || [],
                vehiclePhotosPreviews: v.vehiclePhotos || [],
                vehiclePhotosBase64: v.vehiclePhotos || []
              }]);
            }
          }
          if (draft.address) setAddress(draft.address);
          if (draft.latitude && draft.longitude) {
            setLatitude(draft.latitude);
            setLongitude(draft.longitude);
            setInitialCoords({ latitude: draft.latitude, longitude: draft.longitude });
          }
        } catch (err) {
          console.error("Error restoring draft", err);
        }
      }
    }
  }, []);

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

  // Load vehicles from sessionStorage or fetch from backend on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const loadVehicles = async () => {
        // 1. Try to load from logged_in_user session and fetch from backend
        const userStr = sessionStorage.getItem("logged_in_user");
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            if (user.nic) {
              const res = await fetch(`http://localhost:5000/api/policy-holder/vehicles?nic=${user.nic}`);
              if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data.vehicles) && data.vehicles.length > 0) {
                  setVehicles(data.vehicles);
                  return;
                }
              }
              // Fallback to locally stored user vehicles if API fetch fails
              if (Array.isArray(user.vehicles) && user.vehicles.length > 0) {
                setVehicles(user.vehicles);
                return;
              }
            }
          } catch (err) {
            console.error("Error loading user vehicles from database", err);
          }
        }

        // 2. Try to load from signup details
        try {
          const savedVehiclesStr = sessionStorage.getItem("signup_vehicle_details");
          if (savedVehiclesStr) {
            const parsed = JSON.parse(savedVehiclesStr);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setVehicles(parsed);
              return;
            }
          }
        } catch (err) {
          console.error("Error loading vehicles from sessionStorage", err);
        }

        // 3. Final Fallback vehicles
        const fallbackVehicles: Vehicle[] = [
          { numberPlate: "CBH-3202", vehicleType: "Car", year: "2019", company: "Toyota", model: "Corolla" },
          { numberPlate: "NE-7856", vehicleType: "Lorry", year: "2016", company: "Ashok Leyland", model: "Lorry" }
        ];
        setVehicles(fallbackVehicles);
      };

      loadVehicles();
    }
  }, []);

  // Preset Damage Types
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
      console.error("Reverse geocoding failed, falling back to coordinates:", geocodeError);
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
    const queryWords = qLower.split(/\s+/).filter(w => w.length > 0);

    if ((qLower.includes("railway") || qLower.includes("train") || qLower.includes("police") || qLower.includes("bus")) && !qLower.includes("station") && !qLower.includes("stand")) {
      variations.push(addrStr + " station");
    }

    try {
      const fetchPromises = [];
      for (const qVar of variations) {
        const urlNominatim = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(qVar)}&limit=20&countrycodes=lk`;
        const urlPhoton = `https://photon.komoot.io/api/?q=${encodeURIComponent(qVar)}&limit=20&bbox=${bbox}&lang=en`;
        
        fetchPromises.push(
          fetch(urlNominatim, { headers }).then(r => r.json().catch(() => [])),
          fetch(urlPhoton).then(r => r.json().catch(() => ({ features: [] })))
        );
      }

      const fetchResults = await Promise.all(fetchPromises);
      let combined: any[] = [];

      for (let i = 0; i < fetchResults.length; i++) {
        const isPhotonResult = (i % 2 === 1);
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
        const exists = deduplicated.some(d => 
          (areCoordsClose(d.lat, d.lon, item.lat, item.lon) && areNamesSimilar(d.display_name, item.display_name)) ||
          d.display_name.toLowerCase() === item.display_name.toLowerCase()
        );
        if (!exists) {
          deduplicated.push(item);
        }
      }

      if (deduplicated.length > 0) {
        setSearchResults(deduplicated);
        setShowResultsDropdown(true);
      } else {
        setSearchResults([]);
        setShowResultsDropdown(false);
      }
    } catch (err) {
      console.error("Suggestions geocoding failed:", err);
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
    const queryWords = qLower.split(/\s+/).filter(w => w.length > 0);

    if ((qLower.includes("railway") || qLower.includes("train") || qLower.includes("police") || qLower.includes("bus")) && !qLower.includes("station") && !qLower.includes("stand")) {
      variations.push(addrStr + " station");
    }

    try {
      const fetchPromises = [];
      for (const qVar of variations) {
        const urlNominatim = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(qVar)}&limit=20&countrycodes=lk`;
        const urlPhoton = `https://photon.komoot.io/api/?q=${encodeURIComponent(qVar)}&limit=20&bbox=${bbox}&lang=en`;
        
        fetchPromises.push(
          fetch(urlNominatim, { headers }).then(r => r.json().catch(() => [])),
          fetch(urlPhoton).then(r => r.json().catch(() => ({ features: [] })))
        );
      }

      const fetchResults = await Promise.all(fetchPromises);
      let combined: any[] = [];

      for (let i = 0; i < fetchResults.length; i++) {
        const isPhotonResult = (i % 2 === 1);
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
        const exists = deduplicated.some(d => 
          (areCoordsClose(d.lat, d.lon, item.lat, item.lon) && areNamesSimilar(d.display_name, item.display_name)) ||
          d.display_name.toLowerCase() === item.display_name.toLowerCase()
        );
        if (!exists) {
          deduplicated.push(item);
        }
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

  // Autocomplete suggestions debouncer
  useEffect(() => {
    if (!isUserTyping || !address || address.trim() === "" || address === "Colombo, Sri Lanka") {
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      geocodeAddressForSuggestions(address);
    }, 250); // 250ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [address, isUserTyping]);

  // Geolocation Handler
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
          // Try high accuracy with a shorter 5s timeout
          position = await getPosition({ enableHighAccuracy: true, timeout: 5000 });
        } catch (highAccError: any) {
          console.warn("High accuracy geolocation failed or timed out, trying low accuracy...", highAccError.message);
          // Fall back to low accuracy with 10s timeout
          position = await getPosition({ enableHighAccuracy: false, timeout: 10000 });
        }

        const { latitude: lat, longitude: lon } = position.coords;
        setLatitude(lat);
        setLongitude(lon);
        setInitialCoords({ latitude: lat, longitude: lon });

        // Update map iframe marker location
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
        console.error("Geolocation failed:", err);
        let errorMsg = "Could not retrieve your location.";
        if (err.code === 1) { // PERMISSION_DENIED
          errorMsg = "Location access was denied. Please allow location permissions in your browser settings for this website.";
        } else if (err.code === 2) { // POSITION_UNAVAILABLE
          errorMsg = "Location information is unavailable on your device.";
        } else if (err.code === 3) { // TIMEOUT
          errorMsg = "Location request timed out. Please check your network or device GPS.";
        }
        alert(errorMsg);
        setAddress("123 Galle Road, Colombo, Sri Lanka");
      } finally {
        setIsLocating(false);
      }
    };

    tryGetLocation();
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle || !incidentDate || !incidentTime || !damageType || !description || !address) {
      alert(t.fillAll);
      return;
    }

    const todayDate = new Date();
    todayDate.setHours(23, 59, 59, 999);
    const lastWeekDate = new Date();
    lastWeekDate.setDate(todayDate.getDate() - 7);
    lastWeekDate.setHours(0, 0, 0, 0);

    const selectedDate = new Date(incidentDate);
    if (selectedDate > todayDate || selectedDate < lastWeekDate) {
      alert(t.dateAlert);
      return;
    }

    // Retrieve userNic from session storage
    let userNic = "123456789V";
    if (typeof window !== "undefined") {
      const userStr = sessionStorage.getItem("logged_in_user");
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.nic) userNic = user.nic;
        } catch (err) {
          console.error("Error parsing user context", err);
        }
      }
    }

    const claimPayload = {
      userNic,
      selectedVehicle,
      incidentDate,
      incidentTime,
      damageType,
      description,
      address,
      latitude,
      longitude,
      otherVehiclesInvolved,
      otherVehiclesCount,
      otherVehicles: otherVehiclesInvolved === "yes" ? otherVehicles : [],
      otherVehicleDetails: otherVehiclesInvolved === "yes" 
        ? otherVehicles.map(v => ({
            vehiclePlate: v.vehiclePlate.trim(),
            insuranceCompany: v.insuranceCompany.trim(),
            policyNumber: v.policyNumber.trim(),
            driverName: v.driverName.trim(),
            licensePhotos: v.licensePhotosBase64,
            vehiclePhotos: v.vehiclePhotosBase64
          }))
        : [],
      status: "In Progress",
      createdAt: new Date().toISOString()
    };
    sessionStorage.setItem("current_claim_draft", JSON.stringify(claimPayload));
    
    router.push("/Policy_Holder/New_Claim/page1");
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans relative">
      <PolicyHolderNavbar />

      {/* Styled curved header matching the mockup exactly */}
      <div className="max-w-4xl w-full mx-auto px-6 md:px-12 mt-8 relative">
        {/* Absolute positioned background banner spanning to left edge of screen */}
        <div className="absolute top-0 bottom-0 left-[calc(50%-50vw)] right-6 md:right-12 bg-[url('/newclaim1.webp')] bg-cover bg-center rounded-r-[75px] md:rounded-r-[95px] overflow-hidden shadow-md">
          {/* Mockup dark slate overlay */}
          <div className="absolute inset-0 bg-slate-900/35" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0d2a3a]/90 via-[#0d2a3a]/75 to-transparent" />
        </div>

        {/* Text content aligned automatically with the page container */}
        <header className="relative z-10 h-[210px] flex flex-col justify-center pl-4 md:pl-8 select-none">
          <h1 className="text-white text-3xl md:text-[40px] font-bold tracking-tight leading-none">
            File New Claim
          </h1>
          <p className="text-slate-200 text-xs md:text-sm font-normal mt-3.5 tracking-wide opacity-95">
            Report an accident or damage incident
          </p>
        </header>
      </div>

      {/* Main Content Form */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 md:px-12 py-10">
        <form onSubmit={handleNext} className="flex flex-col gap-10">
          
          {/* Section 1: Vehicle & Incident */}
          <section className="flex flex-col gap-6">
            <h2 className="text-2xl md:text-[28px] font-bold text-[#0d2a3a] tracking-tight flex items-center gap-2.5 mt-4 select-none">
              <HugeiconsIcon icon={Car01Icon} className="w-7 h-7 text-slate-700 flex-shrink-0" strokeWidth={2.5} />
              Vehicle & Incident
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Select Vehicle Dropdown */}
              <div className="flex flex-col gap-2">
                <label className="text-slate-800 text-sm font-medium mb-1">
                  Select Vehicle <span className="text-red-500 ml-0.5">*</span>
                </label>
                <div className="relative">
                  <select
                    required
                    value={selectedVehicle}
                    onChange={(e) => setSelectedVehicle(e.target.value)}
                    className="w-full bg-[#e2e8f0]/80 hover:bg-[#e2e8f0]/95 text-slate-800 rounded-2xl py-4 px-4 pr-10 appearance-none border border-transparent focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#00ddff] focus:border-transparent font-normal transition-all cursor-pointer"
                  >
                    <option value="" disabled>Select Vehicle</option>
                    {vehicles.map((v) => (
                      <option key={v.numberPlate} value={v.numberPlate}>
                        {formatNumberPlate(v.numberPlate)} - {v.company} {v.model} ({v.year})
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
                <label className="text-slate-800 text-sm font-medium mb-1">
                  Incident Date <span className="text-red-500 ml-0.5">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    min={minDate}
                    max={maxDate}
                    value={incidentDate}
                    onChange={(e) => setIncidentDate(e.target.value)}
                    className="w-full bg-[#e2e8f0]/80 text-slate-800 rounded-2xl py-4 px-4 pr-10 border border-transparent focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#00ddff] focus:border-transparent font-normal transition-all"
                  />
                </div>
              </div>

              {/* Incident Time */}
              <div className="flex flex-col gap-2">
                <label className="text-slate-800 text-sm font-medium mb-1">
                  Incident Time <span className="text-red-500 ml-0.5">*</span>
                </label>
                <div className="relative">
                  <input
                    type="time"
                    required
                    value={incidentTime}
                    onChange={(e) => setIncidentTime(e.target.value)}
                    className="w-full bg-[#e2e8f0]/80 text-slate-800 rounded-2xl py-4 px-4 pr-10 border border-transparent focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#00ddff] focus:border-transparent font-normal transition-all"
                  />
                </div>
              </div>

              {/* Damage Type Dropdown */}
              <div className="flex flex-col gap-2">
                <label className="text-slate-800 text-sm font-medium mb-1">
                  Damage Type <span className="text-red-500 ml-0.5">*</span>
                </label>
                <div className="relative">
                  <select
                    required
                    value={damageType}
                    onChange={(e) => setDamageType(e.target.value)}
                    className="w-full bg-[#e2e8f0]/80 hover:bg-[#e2e8f0]/95 text-slate-800 rounded-2xl py-4 px-4 pr-10 appearance-none border border-transparent focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#00ddff] focus:border-transparent font-normal transition-all cursor-pointer"
                  >
                    <option value="" disabled>Select Damage Type</option>
                    {damageTypes.map((type) => (
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
              <label className="text-slate-800 text-sm font-medium mb-1">
                Description <span className="text-red-500 ml-0.5">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#e2e8f0]/80 text-slate-800 rounded-2xl p-4 border border-transparent focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#00ddff] focus:border-transparent font-normal transition-all"
              />
            </div>
          </section>

          {/* Section 1B: Other Vehicles Involved (Optional) */}
          <section className="flex flex-col gap-6 mt-4">
            <h2 className="text-2xl md:text-[28px] font-bold text-[#0d2a3a] tracking-tight flex items-center gap-2.5 mt-4 select-none">
              <HugeiconsIcon icon={Car01Icon} className="w-7 h-7 text-slate-700 flex-shrink-0" strokeWidth={2.5} />
              Other Vehicles Involved (Optional)
            </h2>

            {/* Yes / No Selector Buttons */}
            <div className="flex flex-col gap-3">
              <label className="text-slate-800 text-sm font-medium">
                Were other vehicles involved in the accident? <span className="text-red-500 ml-0.5">*</span>
              </label>
              <div className="flex flex-row gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setOtherVehiclesInvolved("yes");
                    if (otherVehiclesCount === 0) handleCountChange(1);
                  }}
                  className={`flex-1 py-4 px-6 rounded-2xl font-medium transition-all border-2 text-center cursor-pointer ${
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
                  className={`flex-1 py-4 px-6 rounded-2xl font-medium transition-all border-2 text-center cursor-pointer ${
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
                <label className="text-slate-800 text-sm font-medium mb-1">
                  How many other vehicles were involved? <span className="text-red-500 ml-0.5">*</span>
                </label>
                <div className="relative">
                  <select
                    value={otherVehiclesCount}
                    onChange={(e) => handleCountChange(Number(e.target.value))}
                    className="w-full bg-[#e2e8f0]/80 hover:bg-[#e2e8f0]/95 text-slate-800 rounded-2xl py-4 px-4 pr-10 appearance-none border border-transparent focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#00ddff] focus:border-transparent font-normal transition-all cursor-pointer"
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
            {otherVehiclesInvolved === "yes" && otherVehicles.map((vehicle, index) => (
              <div key={index} className="bg-slate-50/50 border border-slate-200 rounded-3xl p-6 mt-2 shadow-sm flex flex-col gap-6 transition-all duration-300">
                <h3 className="font-semibold text-[#0d2a3a] text-lg select-none">Other Vehicle #{index + 1} Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Vehicle Plate */}
                  <div className="flex flex-col gap-2">
                    <label className="text-slate-800 text-sm font-medium mb-1">Vehicle Number <span className="text-red-500 ml-0.5">*</span></label>
                    <input
                      type="text"
                      required
                      value={vehicle.vehiclePlate}
                      onChange={(e) => updateOtherVehicleField(index, "vehiclePlate", e.target.value)}
                      placeholder="e.g. WP CAA-1234"
                      className="w-full bg-white text-slate-800 rounded-2xl py-4 px-4 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00ddff] focus:border-transparent font-normal transition-all"
                    />
                  </div>

                  {/* Driver Name */}
                  <div className="flex flex-col gap-2">
                    <label className="text-slate-800 text-sm font-medium mb-1">Driver Name <span className="text-red-500 ml-0.5">*</span></label>
                    <input
                      type="text"
                      required
                      value={vehicle.driverName}
                      onChange={(e) => updateOtherVehicleField(index, "driverName", e.target.value)}
                      placeholder="e.g. Sunil Perera"
                      className="w-full bg-white text-slate-800 rounded-2xl py-4 px-4 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00ddff] focus:border-transparent font-normal transition-all"
                    />
                  </div>

                  {/* Insurance Name */}
                  <div className="flex flex-col gap-2">
                    <label className="text-slate-800 text-sm font-medium mb-1">Insurance Name <span className="text-red-500 ml-0.5">*</span></label>
                    <input
                      type="text"
                      required
                      value={vehicle.insuranceCompany}
                      onChange={(e) => updateOtherVehicleField(index, "insuranceCompany", e.target.value)}
                      placeholder="e.g. Sri Lanka Insurance"
                      className="w-full bg-white text-slate-800 rounded-2xl py-4 px-4 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00ddff] focus:border-transparent font-normal transition-all"
                    />
                  </div>

                  {/* Insurance Number */}
                  <div className="flex flex-col gap-2">
                    <label className="text-slate-800 text-sm font-medium mb-1">Insurance Number <span className="text-red-500 ml-0.5">*</span></label>
                    <input
                      type="text"
                      required
                      value={vehicle.policyNumber}
                      onChange={(e) => updateOtherVehicleField(index, "policyNumber", e.target.value)}
                      placeholder="e.g. POL-98765432"
                      className="w-full bg-white text-slate-800 rounded-2xl py-4 px-4 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00ddff] focus:border-transparent font-normal transition-all"
                    />
                  </div>
                </div>

                {/* dynamic uploads */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Driving License Photos Upload */}
                  <div className="flex flex-col gap-2">
                    <label className="text-slate-800 text-sm font-medium mb-1">
                      Driver's License Photos
                    </label>
                    <input
                      type="file"
                      id={`license-upload-${index}`}
                      multiple
                      accept="image/*"
                      onChange={(e) => handleOtherLicenseUpload(index, e.target.files)}
                      className="hidden"
                    />
                    
                    {vehicle.licensePhotosPreviews.length === 0 ? (
                      <div
                        onClick={() => document.getElementById(`license-upload-${index}`)?.click()}
                        className="w-full h-[140px] bg-white hover:bg-slate-100 border border-slate-300 border-dashed rounded-3xl flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all active:scale-[0.98] select-none"
                      >
                        <HugeiconsIcon icon={Camera01Icon} className="w-8 h-8 text-slate-500 mb-2" strokeWidth={1.8} />
                        <span className="text-slate-800 text-xs font-medium block">
                          Upload Driver's License Photos
                        </span>
                        <span className="text-slate-400 text-[9px] mt-1">
                          JPG, PNG - max 5MB. Click to upload.
                        </span>
                      </div>
                    ) : (
                      <div className="w-full bg-white border border-slate-200 rounded-3xl p-3 flex flex-col gap-2 shadow-inner">
                        <div className="grid grid-cols-4 gap-2 max-h-[100px] overflow-y-auto pr-1">
                          {vehicle.licensePhotosPreviews.map((preview, photoIdx) => (
                            <div key={photoIdx} className="relative aspect-square rounded-xl overflow-hidden bg-slate-200 border border-slate-300 group">
                              <img src={preview} alt="license preview" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeOtherLicensePhoto(index, photoIdx);
                                }}
                                className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-semibold cursor-pointer border-none shadow"
                              >
                                &times;
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between items-center border-t border-slate-200 pt-2 text-[10px] font-medium text-slate-800 select-none">
                          <span>{vehicle.licensePhotosPreviews.length} photo(s) selected</span>
                          <button
                            type="button"
                            onClick={() => document.getElementById(`license-upload-${index}`)?.click()}
                            className="bg-[#00ddff] hover:bg-[#00c8e6] text-white text-[9px] font-medium py-1 px-3 rounded-full cursor-pointer border-none"
                          >
                            Add More
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Other Vehicle Damage Photos Upload */}
                  <div className="flex flex-col gap-2">
                    <label className="text-slate-800 text-sm font-medium mb-1">
                      Other Vehicle Damage Photos
                    </label>
                    <input
                      type="file"
                      id={`vehicle-upload-${index}`}
                      multiple
                      accept="image/*"
                      onChange={(e) => handleOtherVehiclePhotoUpload(index, e.target.files)}
                      className="hidden"
                    />
                    
                    {vehicle.vehiclePhotosPreviews.length === 0 ? (
                      <div
                        onClick={() => document.getElementById(`vehicle-upload-${index}`)?.click()}
                        className="w-full h-[140px] bg-white hover:bg-slate-100 border border-slate-300 border-dashed rounded-3xl flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all active:scale-[0.98] select-none"
                      >
                        <HugeiconsIcon icon={Camera01Icon} className="w-8 h-8 text-slate-500 mb-2" strokeWidth={1.8} />
                        <span className="text-slate-800 text-xs font-medium block">
                          Upload Damage / Accident Photos
                        </span>
                        <span className="text-slate-400 text-[9px] mt-1">
                          JPG, PNG - max 5MB. Click to upload.
                        </span>
                      </div>
                    ) : (
                      <div className="w-full bg-white border border-slate-200 rounded-3xl p-3 flex flex-col gap-2 shadow-inner">
                        <div className="grid grid-cols-4 gap-2 max-h-[100px] overflow-y-auto pr-1">
                          {vehicle.vehiclePhotosPreviews.map((preview, photoIdx) => (
                            <div key={photoIdx} className="relative aspect-square rounded-xl overflow-hidden bg-slate-200 border border-slate-300 group">
                              <img src={preview} alt="vehicle preview" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeOtherVehiclePhoto(index, photoIdx);
                                }}
                                className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-semibold cursor-pointer border-none shadow"
                              >
                                &times;
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between items-center border-t border-slate-200 pt-2 text-[10px] font-medium text-slate-800 select-none">
                          <span>{vehicle.vehiclePhotosPreviews.length} photo(s) selected</span>
                          <button
                            type="button"
                            onClick={() => document.getElementById(`vehicle-upload-${index}`)?.click()}
                            className="bg-[#00ddff] hover:bg-[#00c8e6] text-white text-[9px] font-medium py-1 px-3 rounded-full cursor-pointer border-none"
                          >
                            Add More
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* Section 2: Incident Location */}
          <section className="flex flex-col gap-6 mt-8">
            <h2 className="text-2xl md:text-[28px] font-bold text-[#0d2a3a] tracking-tight flex items-center gap-2.5 mt-4 select-none">
              <HugeiconsIcon icon={Location01Icon} className="w-7 h-7 text-slate-700 flex-shrink-0" strokeWidth={2.5} />
              Incident Location
            </h2>

            <div className="flex flex-col gap-2 relative">
              <label className="text-slate-800 text-sm font-medium mb-1">
                Enter Address or Land Mark <span className="text-red-500 ml-0.5">*</span>
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
                  placeholder="Enter address or landmark..."
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
                  className="bg-[#0284c7] hover:bg-[#0275a1] active:scale-95 text-white py-2 px-5 rounded-full text-xs font-medium transition-all duration-150 border-none cursor-pointer flex items-center justify-center shadow-md shadow-[#0284c7]/20 whitespace-nowrap"
                >
                  Search
                </button>
              </div>

              {showResultsDropdown && !showMapModal && searchResults.length > 0 && (
                <div className="absolute top-[80px] left-0 right-0 z-50 bg-white border border-slate-200/80 rounded-2xl shadow-xl max-h-[320px] overflow-y-auto mt-1.5 p-2 flex flex-col gap-1">
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
                          
                          // Update map iframe
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
                          <span className="font-medium text-slate-800 text-sm truncate">{mainTitle}</span>
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
              
              {/* Map Iframe */}
              <div className="flex-1 h-[280px] bg-slate-100 rounded-3xl overflow-hidden relative border border-slate-200/80 shadow-sm">
                <iframe
                  id="map-iframe"
                  width="100%"
                  height="100%"
                  className="border-none"
                  src={`/api/map?lat=${initialCoords.latitude}&lon=${initialCoords.longitude}`}
                  allowFullScreen
                ></iframe>
              </div>

              {/* Action Buttons on the right of the Map */}
              <div className="flex flex-row md:flex-col gap-4 justify-between items-stretch md:w-[200px]">
                {/* Use GPS Button */}
                <button
                  type="button"
                  onClick={handleGPSLocation}
                  disabled={isLocating}
                  className="flex-1 bg-[#0284c7] hover:bg-[#0275a1] disabled:bg-[#0284c7]/50 text-white font-medium text-[14px] leading-tight px-4 rounded-[24px] shadow-[0_4px_12px_rgba(2,132,199,0.25)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 flex flex-col items-center justify-center gap-3 border-none cursor-pointer text-center h-[130px]"
                >
                  <HugeiconsIcon icon={Location01Icon} className={`w-8 h-8 text-white ${isLocating ? "animate-pulse" : ""}`} strokeWidth={2} />
                  <span className="font-medium block">
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
                  className="flex-1 bg-[#0284c7] hover:bg-[#0275a1] text-white font-medium text-[14px] leading-tight px-4 rounded-[24px] shadow-[0_4px_12px_rgba(2,132,199,0.25)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 flex flex-col items-center justify-center gap-3 border-none cursor-pointer text-center h-[130px]"
                >
                  <HugeiconsIcon icon={MapIcon} className="w-8 h-8 text-white" strokeWidth={2} />
                  <span className="font-medium block">
                    Select on Map
                  </span>
                </button>
              </div>

            </div>

            {/* Full-screen web Map Modal */}
            {showMapModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 transition-all duration-300">
                <div className="bg-white rounded-[32px] w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col h-[85vh] border border-slate-100">
                  {/* Header */}
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
                    <h3 className="text-lg font-semibold text-[#0d2a3a]">Select Location on Map</h3>
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
                  
                  {/* Map Frame Container (with floating overlays) */}
                  <div className="flex-1 bg-slate-50 relative overflow-hidden">
                    <iframe
                      id="modal-map-iframe"
                      width="100%"
                      height="100%"
                      className="border-none"
                      src={`/api/map?lat=${modalInitialCoords?.latitude ?? latitude}&lon=${modalInitialCoords?.longitude ?? longitude}`}
                      allowFullScreen
                    ></iframe>

                    {/* Floating Geocoding Search Panel */}
                    <div className="absolute top-4 left-4 right-4 z-20 max-w-md bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-full pl-5 pr-1.5 py-2 shadow-[0_10px_25px_-5px_rgba(15,23,42,0.15)] flex items-center gap-2 transition-all">
                      <span className="text-slate-400 flex items-center justify-center pointer-events-none">
                        <HugeiconsIcon icon={Search01Icon} className="w-5 h-5" strokeWidth={2.5} />
                      </span>
                      <input
                        type="text"
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
                        placeholder="Search address or landmark..."
                        className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none font-normal"
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
                          className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer p-1"
                        >
                          ✕
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => geocodeAddress(address)}
                        className="bg-[#0284c7] hover:bg-[#0275a1] active:scale-95 text-white p-3 rounded-full transition-all duration-150 border-none cursor-pointer flex items-center justify-center shadow-md shadow-[#0284c7]/20"
                        title="Search"
                      >
                        <HugeiconsIcon icon={Search01Icon} className="w-4 h-4 text-white" strokeWidth={3} />
                      </button>
                    </div>

                    {/* Suggestions inside map modal */}
                    {showResultsDropdown && showMapModal && searchResults.length > 0 && (
                      <div className="absolute top-[64px] left-4 right-4 z-30 max-w-md bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-xl max-h-[300px] overflow-y-auto mt-1.5 p-2 flex flex-col gap-1">
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
                                setAddress(result.display_name);
                                setIsUserTyping(false);
                                setShowResultsDropdown(false);
                                
                                // Update modal map iframe
                                const modalIframe = document.getElementById("modal-map-iframe") as HTMLIFrameElement;
                                if (modalIframe && modalIframe.contentWindow) {
                                  modalIframe.contentWindow.postMessage(JSON.stringify({ latitude: lat, longitude: lon }), "*");
                                }
                              }}
                              className="text-left w-full hover:bg-slate-50 p-2 rounded-xl transition-all border-none bg-transparent cursor-pointer flex items-start gap-3"
                              title={result.display_name}
                            >
                              <div className="mt-0.5 bg-slate-100 text-slate-500 rounded-full p-2 flex items-center justify-center flex-shrink-0">
                                <HugeiconsIcon icon={Location01Icon} className="w-4 h-4 text-slate-500" strokeWidth={2.5} />
                              </div>
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="font-medium text-slate-800 text-xs truncate">{mainTitle}</span>
                                {subTitle && (
                                  <span className="text-[10px] text-slate-500 truncate mt-0.5">{subTitle}</span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Floating GPS Button */}
                    <button
                      type="button"
                      onClick={handleGPSLocation}
                      disabled={isLocating}
                      className="absolute top-4 right-4 z-10 w-12 h-12 bg-white/90 backdrop-blur-md hover:bg-white text-slate-700 hover:text-sky-600 rounded-2xl shadow-xl flex items-center justify-center border border-slate-200/60 cursor-pointer transition-all duration-150 active:scale-95 disabled:bg-slate-100"
                      title="Locate Me"
                    >
                      <HugeiconsIcon icon={Gps01Icon} className={`w-6 h-6 ${isLocating ? "animate-pulse text-sky-500" : "text-slate-600"}`} strokeWidth={2.5} />
                    </button>


                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 border-t border-slate-100 flex justify-end items-center bg-white">
                    <button
                      type="button"
                      onClick={() => {
                        setInitialCoords({ latitude, longitude });
                        setModalInitialCoords(null);
                        setShowMapModal(false);
                      }}
                      className="bg-[#0d2a3a] hover:bg-[#0284c7] text-white font-semibold text-sm px-8 py-4 rounded-full shadow-[0_4px_12px_rgba(13,42,58,0.25)] hover:shadow-[0_4px_16px_rgba(2,132,199,0.3)] transition-all duration-200 cursor-pointer border-none hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Confirm Location
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Action Button Row */}
          <div className="flex flex-row justify-between items-center mt-4 mb-10">
            <Link
              href="/Policy_Holder/Home"
              className="bg-[#0f2d3a] hover:bg-[#0b222c] text-white font-semibold text-base px-10 py-4 rounded-full transition-all duration-150 active:scale-[0.97] no-underline shadow-[0_4px_12px_rgba(15,45,58,0.25)] flex items-center justify-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="bg-[#0f2d3a] hover:bg-[#0b222c] text-white font-semibold text-base px-12 py-4 rounded-full transition-all duration-150 active:scale-[0.97] shadow-[0_4px_12px_rgba(15,45,58,0.25)] border-none cursor-pointer flex items-center justify-center"
            >
              Next
            </button>
          </div>

        </form>
      </main>

      {/* Floating Chat Support Bubble */}
      <button
        type="button"
        className="fixed bottom-8 right-8 z-40 bg-[#00ddff] hover:bg-[#00c8e6] text-white p-5 rounded-full shadow-2xl transition-all duration-150 hover:scale-110 active:scale-95 cursor-pointer focus:outline-none border-none flex items-center justify-center"
        aria-label="Chat support"
      >
        <HugeiconsIcon icon={BubbleChatIcon} className="w-7 h-7 text-white" strokeWidth={2} />
      </button>

      <PolicyHolderFooter />
    </div>
  );
}
