"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import PolicyHolderNavbar from "@/app/Components/Policy_Holder/Navbar";
import PolicyHolderFooter from "@/app/Components/Policy_Holder/footer";
import Link from "next/link";
import { API_URL } from "@/app/config";
import SimpleLoader from "@/app/Components/SimpleLoader";

interface Vehicle {
  numberPlate: string;
  vehicleType: string;
  year: string;
  company: string;
  model: string;
  engineNumber: string;
  chassisNumber: string;
  policyNumber: string;
  policyExpiryDate?: string;
  renewalCycle?: string;
}

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

const normalizeSriLankanPhone = (input: string) => {
  const cleaned = (input || "").replace(/[\s-]/g, "");
  if (!cleaned) return { isValid: false, error: "Phone number is required." };
  let normalized = cleaned;
  if (normalized.startsWith("+94")) {
    normalized = "0" + normalized.slice(3);
  } else if (normalized.startsWith("94")) {
    normalized = "0" + normalized.slice(2);
  }
  if (!/^07\d{8}$/.test(normalized)) {
    return {
      isValid: false,
      error: "Please enter a valid 10-digit Sri Lankan mobile number (e.g., 0771234567 or +94771234567)."
    };
  }
  return { isValid: true, normalized };
};

import { getVehicleIconSvg, getVehicleIconContainer, getVehicleTheme } from "@/app/Components/VehicleIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Car01Icon,
  SecurityCheckIcon,
  Search01Icon,
  Alert02Icon,
  ViewIcon,
  Add01Icon,
  AlertCircleIcon,
  Download01Icon,
  BubbleChatIcon,
  Clock01Icon,
  Loading03Icon,
  RefreshIcon,
  CreditCardIcon,
  CheckmarkCircle01Icon,
  Tick01Icon,
  Money01Icon,
  UserAdd01Icon,
  UserCheck01Icon,
  File01Icon,
  Upload01Icon,
  Shield01Icon,
  Cancel01Icon,
  Building04Icon,
  InformationCircleIcon,
  ArrowRight01Icon
} from "@hugeicons/core-free-icons";

const translations = {
  en: {
    title: "My Vehicles",
    subtitle: "Manage your registered vehicles and view coverage policies",
    totalInsured: "Total Insured",
    activePolicies: "Active Policies",
    searchPlaceholder: "Search make, plate, or policy...",
    viewDetails: "View Details",
    addVehicle: "Add New Vehicle",
    registerDesc: "Register another vehicle to your active policy coverage",
    activeCoverage: "Active Coverage",
    makeModel: "Make & Model",
    policyNum: "Policy Number",
    vehicleType: "Vehicle Type",
    retrieving: "Retrieving your vehicles list...",
    allVehicles: "All Vehicles",
    cars: "Cars",
    suvs: "SUVs",
    bikes: "Motorbikes",
    trucks: "Trucks / Lorries",
    others: "Others",
    noVehiclesFound: "No Vehicles Found",
    noCategoryVehiclesFound: "No vehicles are currently registered under this category.",
    clearSearch: "Clear Search",
    searchNoMatch: "We couldn't find any vehicles matching"
  },
  si: {
    title: "මගේ වාහන",
    subtitle: "ඔබේ ලියාපදිංචි වාහන සහ රක්‍ෂණ ප්‍රතිපත්ති මෙතැනින් කළමනාකරණය කරන්න",
    totalInsured: "මුළු රක්‍ෂිත ගණන",
    activePolicies: "සක්‍රීය ප්‍රතිපත්ති",
    searchPlaceholder: "නිෂ්පාදනය, තහඩුව හෝ රක්‍ෂණය සොයන්න...",
    viewDetails: "විස්තර බලන්න",
    addVehicle: "නව වාහනයක් එක් කරන්න",
    registerDesc: "ඔබේ සක්‍රීය රක්‍ෂණ ආවරණයට වෙනත් වාහනයක් එක් කරන්න",
    activeCoverage: "සක්‍රීය ආවරණය",
    makeModel: "වර්ගය සහ මොඩලය",
    policyNum: "රක්‍ෂණ ප්‍රතිපත්ති අංකය",
    vehicleType: "වාහන වර්ගය",
    retrieving: "ඔබගේ වාහන ලැයිස්තුව ලබා ගනිමින්...",
    allVehicles: "සියලුම වාහන",
    cars: "කාර්",
    suvs: "SUVs",
    bikes: "යතුරුපැදි",
    trucks: "ලොරි / ට්‍රක්",
    others: "වෙනත්",
    noVehiclesFound: "වාහන කිසිවක් හමු නොවීය",
    noCategoryVehiclesFound: "මෙම කාණ්ඩය යටතේ දැනට වාහන කිසිවක් ලියාපදිංචි කර නොමැත.",
    clearSearch: "සෙවුම මකන්න",
    searchNoMatch: "ගැලපෙන වාහන කිසිවක් හමු නොවීය"
  },
  ta: {
    title: "எனது வாகனங்கள்",
    subtitle: "பதிவுசெய்யப்பட்ட வாகனங்களை நிர்வகிக்கவும், காப்பீட்டு பாலிசிகளைப் பார்க்கவும்",
    totalInsured: "மொத்த காப்பீடு",
    activePolicies: "செயலில் உள்ள பாலிசிகள்",
    searchPlaceholder: "தயாரிப்பு, தட்டு அல்லது பாலிசியைத் தேடுங்கள்...",
    viewDetails: "விவரங்களைப் பார்",
    addVehicle: "புதிய வாகனத்தைச் சேர்",
    registerDesc: "செயலில் உள்ள காப்பீட்டுப் பாலிசியில் மற்றொரு வாகனத்தைப் பதிவுசெய்யவும்",
    activeCoverage: "செயலில் உள்ள காப்பீடு",
    makeModel: "தயாரிப்பு & மாடல்",
    policyNum: "பாலிசி எண்",
    vehicleType: "வாகன வகை",
    retrieving: "உங்கள் வாகனங்களின் பட்டியலைப் பெறுகிறது...",
    allVehicles: "அனைத்து வாகனங்கள்",
    cars: "கார்கள்",
    suvs: "SUVs",
    bikes: "மோட்டார் சைக்கிள்கள்",
    trucks: "லாரிகள் / டிரக்குகள்",
    others: "மற்றவை",
    noVehiclesFound: "வாகனங்கள் எதுவும் இல்லை",
    noCategoryVehiclesFound: "இந்த வகையின் கீழ் தற்போது வாகனங்கள் எதுவும் பதிவு செய்யப்படவில்லை.",
    clearSearch: "தேடலை நீக்கு",
    searchNoMatch: "பொருந்தக்கூடிய வாகனங்கள் எதுவும் இல்லை"
  }
};

export default function MyVehicles() {
  const [lang, setLang] = useState<"en" | "si" | "ta">("en");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [isLoading, setIsLoading] = useState(true);

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
  const [selectedVehicleForModal, setSelectedVehicleForModal] = useState<Vehicle | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [newCompany, setNewCompany] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newYear, setNewYear] = useState("");
  const [newNumberPlate, setNewNumberPlate] = useState("");
  const [newVehicleType, setNewVehicleType] = useState("Car");
  const [newPolicyNumber, setNewPolicyNumber] = useState("");
  const [newEngineNumber, setNewEngineNumber] = useState("");
  const [newChassisNumber, setNewChassisNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Renewal & Stripe Payment States
  const [renewalInfo, setRenewalInfo] = useState<{
    hasCalculatedQuote: boolean;
    isWithin30Days: boolean;
    daysRemaining: number | null;
    expiryDate: string | null;
    isRenewed?: boolean;
    renewalQuote: any | null;
  } | null>(null);
  const [activeInstallmentInfo, setActiveInstallmentInfo] = useState<{
    hasActivePlan: boolean;
    nextInstallment: any | null;
    isFullyPaid: boolean;
    paidCount?: number;
    totalCount?: number;
    renewal: any | null;
  } | null>(null);
  const [renewalMap, setRenewalMap] = useState<Record<string, any>>({});
  const [installmentMap, setInstallmentMap] = useState<Record<string, any>>({});
  const [loadingRenewal, setLoadingRenewal] = useState(false);
  const [renewalWizardOpen, setRenewalWizardOpen] = useState(false);
  const [renewalStep, setRenewalStep] = useState<1 | 2 | 3>(1);
  const [selectedPlanType, setSelectedPlanType] = useState<"One-Time" | "2-Installments" | "4-Installments">("One-Time");
  const [isRedirectingToStripe, setIsRedirectingToStripe] = useState(false);
  const [paymentSuccessModal, setPaymentSuccessModal] = useState(false);
  const [paymentSuccessDetails, setPaymentSuccessDetails] = useState<{ plate: string; installment: string } | null>(null);
  const [coverNoteModalOpen, setCoverNoteModalOpen] = useState(false);
  const [coverNoteVehicle, setCoverNoteVehicle] = useState<Vehicle | null>(null);

  // Third-Party Drivers Integration
  const [activeMainTab, setActiveMainTab] = useState<"vehicles" | "third_party">("vehicles");
  const [vehicleViewMode, setVehicleViewMode] = useState<"grid" | "list">("grid");
  const [thirdPartyRequests, setThirdPartyRequests] = useState<any[]>([]);
  const [loadingThirdParty, setLoadingThirdParty] = useState(false);
  const [thirdPartyModalOpen, setThirdPartyModalOpen] = useState(false);
  const [submittingThirdParty, setSubmittingThirdParty] = useState(false);

  // Third-Party Driver Registration Form States
  const [tpSelectedPlates, setTpSelectedPlates] = useState<string[]>([]);
  const [tpDriverName, setTpDriverName] = useState("");
  const [tpDriverAddress, setTpDriverAddress] = useState("");
  const [tpDriverPhone, setTpDriverPhone] = useState("");
  const [tpDriverNic, setTpDriverNic] = useState("");
  const [tpNicFront, setTpNicFront] = useState("");
  const [tpNicBack, setTpNicBack] = useState("");
  const [tpDlFront, setTpDlFront] = useState("");
  const [tpDlBack, setTpDlBack] = useState("");
  const [tpErrorMessage, setTpErrorMessage] = useState("");
  const [tpReviewOpen, setTpReviewOpen] = useState(false);
  const [resumingPaymentId, setResumingPaymentId] = useState<string | null>(null);

  // Termination Request States
  const [terminateTargetReq, setTerminateTargetReq] = useState<any | null>(null);
  const [terminateReason, setTerminateReason] = useState("Driver resigned / employment ended");
  const [customTerminateReason, setCustomTerminateReason] = useState("");
  const [terminating, setTerminating] = useState(false);
  const [terminateSuccessMsg, setTerminateSuccessMsg] = useState("");
  const [terminateErrMsg, setTerminateErrMsg] = useState("");

  // Manage Assigned Driver State
  const [selectedDriverForManage, setSelectedDriverForManage] = useState<any | null>(null);
  const [copiedPassLink, setCopiedPassLink] = useState(false);

  const handleOpenTerminateModal = (req: any) => {
    setTerminateTargetReq(req);
    setTerminateReason("Driver resigned / employment ended");
    setCustomTerminateReason("");
    setTerminateErrMsg("");
    setTerminateSuccessMsg("");
  };

  const tpNicFrontRef = useRef<HTMLInputElement>(null);
  const tpNicBackRef = useRef<HTMLInputElement>(null);
  const tpDlFrontRef = useRef<HTMLInputElement>(null);
  const tpDlBackRef = useRef<HTMLInputElement>(null);

  // Map of vehicle plate -> list of assigned drivers (excluding terminated)
  const vehicleDriversMap = useMemo(() => {
    const map: Record<string, Array<{ driverName: string; status: string; ref: string; req: any }>> = {};
    thirdPartyRequests.forEach((req) => {
      if (req.status !== "Terminated") {
        req.selectedVehicles?.forEach((v: any) => {
          const plate = typeof v === "string" ? v : v?.numberPlate;
          if (!plate) return;
          if (!map[plate]) {
            map[plate] = [];
          }
          map[plate].push({
            driverName: req.driverDetails?.fullName || "Assigned Driver",
            status: req.status,
            ref: req.requestReference,
            req: req
          });
        });
      }
    });
    return map;
  }, [thirdPartyRequests]);

  // Backward compatibility alias (primary driver)
  const vehicleDriverMap = useMemo(() => {
    const map: Record<string, { driverName: string; status: string; ref: string; req: any }> = {};
    Object.entries(vehicleDriversMap).forEach(([plate, drivers]) => {
      if (drivers.length > 0) {
        const approved = drivers.find((d) => d.status === "Approved");
        map[plate] = approved || drivers[0];
      }
    });
    return map;
  }, [vehicleDriversMap]);

  const handleSubmitTermination = async () => {
    if (!terminateTargetReq) return;
    const finalReason =
      terminateReason === "Other reason"
        ? customTerminateReason.trim()
        : terminateReason.trim() || customTerminateReason.trim() || "Policyholder requested driver authorization termination";

    if (!finalReason) {
      setTerminateErrMsg("Please specify a reason for terminating this driver.");
      return;
    }

    setTerminating(true);
    setTerminateErrMsg("");
    try {
      const userStr = sessionStorage.getItem("logged_in_user");
      const nic = userStr ? JSON.parse(userStr)?.nic : null;
      const res = await fetch(`${API_URL}/third-party/request-termination/${terminateTargetReq._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyHolderNic: nic, reason: finalReason })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit termination request.");
      }
      setTerminateSuccessMsg("Termination request sent to branch office for review and approval.");
      if (nic) loadThirdPartyRequests(nic);
      setTimeout(() => {
        setTerminateTargetReq(null);
        setTerminateSuccessMsg("");
      }, 2000);
    } catch (err: any) {
      setTerminateErrMsg(err.message || "Failed to submit termination request.");
    } finally {
      setTerminating(false);
    }
  };

  const loadThirdPartyRequests = async (overrideNic?: string) => {
    if (typeof window === "undefined") return;
    const userStr = sessionStorage.getItem("logged_in_user");
    const nic = overrideNic || (userStr ? JSON.parse(userStr)?.nic : null);
    if (!nic) return;
    try {
      setLoadingThirdParty(true);
      const res = await fetch(`${API_URL}/third-party/my-requests?nic=${encodeURIComponent(nic)}`);
      if (res.ok) {
        const data = await res.json();
        setThirdPartyRequests(data.requests || []);
      }
    } catch (e) {
      console.error("Error loading third party requests:", e);
    } finally {
      setLoadingThirdParty(false);
    }
  };

  const handleOpenThirdPartyForVehicle = (plate: string) => {
    setTpSelectedPlates([plate]);
    setTpDriverName("");
    setTpDriverAddress("");
    setTpDriverPhone("");
    setTpDriverNic("");
    setTpNicFront("");
    setTpNicBack("");
    setTpDlFront("");
    setTpDlBack("");
    setTpErrorMessage("");
    setTpReviewOpen(false);
    setThirdPartyModalOpen(true);
  };

  const handleOpenThirdPartyNew = () => {
    setTpSelectedPlates([]);
    setTpDriverName("");
    setTpDriverAddress("");
    setTpDriverPhone("");
    setTpDriverNic("");
    setTpNicFront("");
    setTpNicBack("");
    setTpDlFront("");
    setTpDlBack("");
    setTpErrorMessage("");
    setTpReviewOpen(false);
    setThirdPartyModalOpen(true);
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setTpErrorMessage("File size exceeds 5MB limit. Please upload a smaller image.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setter(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitThirdParty = async () => {
    setTpErrorMessage("");
    if (tpSelectedPlates.length === 0) {
      setTpErrorMessage("Please select at least one vehicle.");
      return;
    }
    if (!tpDriverName.trim() || !tpDriverAddress.trim() || !tpDriverPhone.trim() || !tpDriverNic.trim()) {
      setTpErrorMessage("All driver details are required.");
      return;
    }
    const phoneCheck = normalizeSriLankanPhone(tpDriverPhone);
    if (!phoneCheck.isValid) {
      setTpErrorMessage(phoneCheck.error || "Invalid phone number.");
      return;
    }
    if (!tpNicFront || !tpNicBack || !tpDlFront || !tpDlBack) {
      setTpErrorMessage("All 4 KYC identity photographs (NIC Front, NIC Back, Licence Front, Licence Back) are mandatory.");
      return;
    }

    const userStr = typeof window !== "undefined" ? sessionStorage.getItem("logged_in_user") : null;
    const u = userStr ? JSON.parse(userStr) : null;
    if (!u?.nic) {
      setTpErrorMessage("User authentication missing. Please log in again.");
      return;
    }

    setSubmittingThirdParty(true);
    try {
      const regRes = await fetch(`${API_URL}/third-party/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policyHolderNic: u.nic,
          selectedVehiclePlates: tpSelectedPlates,
          driverDetails: {
            fullName: tpDriverName.trim(),
            residentialAddress: tpDriverAddress.trim(),
            phoneNumber: phoneCheck.normalized,
            nicNumber: tpDriverNic.trim().toUpperCase(),
            documents: {
              nicFront: tpNicFront,
              nicBack: tpNicBack,
              drivingLicenceFront: tpDlFront,
              drivingLicenceBack: tpDlBack
            }
          }
        })
      });

      const regData = await regRes.json();
      if (!regRes.ok) {
        throw new Error(regData.error || "Failed to create third-party driver request.");
      }

      const createdRequestId = regData.request?._id;

      const checkoutRes = await fetch(`${API_URL}/third-party/checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: createdRequestId,
          policyHolderNic: u.nic
        })
      });

      const checkoutData = await checkoutRes.json();
      if (!checkoutRes.ok) {
        throw new Error(checkoutData.error || "Failed to initiate Stripe checkout.");
      }

      if (checkoutData.checkoutUrl) {
        window.location.href = checkoutData.checkoutUrl;
      } else {
        throw new Error("No checkout URL returned from payment gateway.");
      }
    } catch (err: any) {
      setTpErrorMessage(err.message || "An unexpected error occurred.");
      setSubmittingThirdParty(false);
    }
  };

  const handleResumeThirdPartyPayment = async (requestId: string) => {
    const userStr = typeof window !== "undefined" ? sessionStorage.getItem("logged_in_user") : null;
    const u = userStr ? JSON.parse(userStr) : null;
    if (!u?.nic) return;

    setResumingPaymentId(requestId);
    try {
      const res = await fetch(`${API_URL}/third-party/checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          policyHolderNic: u.nic
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resume payment session.");
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err: any) {
      triggerToast(err.message || "Failed to redirect to payment.");
      setResumingPaymentId(null);
    }
  };

  const getAddCardTitle = () => {
    switch (activeCategory) {
      case "Car": return "Add a Car";
      case "SUV": return "Add an SUV";
      case "Bike": return "Add a Motorbike";
      case "Truck": return "Add a Lorry / Truck";
      default: return "Add Another Vehicle";
    }
  };

  const handleOpenAddVehicle = () => {
    if (activeCategory === "Car") setNewVehicleType("Car");
    else if (activeCategory === "SUV") setNewVehicleType("SUV");
    else if (activeCategory === "Bike") setNewVehicleType("Motorbike");
    else if (activeCategory === "Truck") setNewVehicleType("Lorry / Truck");
    else if (activeCategory === "Other") setNewVehicleType("Van");
    else setNewVehicleType("Car");
    setIsAddVehicleOpen(true);
  };

  const handleAddVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!newCompany.trim() || !newModel.trim() || !newYear.trim() || !newNumberPlate.trim() || !newVehicleType.trim() || !newPolicyNumber.trim() || !newEngineNumber.trim() || !newChassisNumber.trim()) {
      setValidationError("All fields are required.");
      return;
    }

    const cleanPlate = newNumberPlate.replace(/[\s-]/g, "");
    if (cleanPlate.length < 5 || cleanPlate.length > 10 || !/^[A-Za-z0-9]+$/.test(cleanPlate)) {
      setValidationError("Vehicle Number must be an alphanumeric mix between 5 and 10 characters.");
      return;
    }

    if (!/^\d{4}$/.test(newYear.trim())) {
      setValidationError("Year must be a 4-digit number.");
      return;
    }

    const cleanPolicy = newPolicyNumber.replace(/[\s-]/g, "");
    if (!/^SAN[A-Za-z0-9]{5,9}$/i.test(cleanPolicy)) {
      setValidationError("Policy Number must start with 'SAN' and be between 8 and 12 alphanumeric characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      const userStr = sessionStorage.getItem("logged_in_user");
      if (!userStr) {
        setValidationError("User session expired. Please log in again.");
        setIsSubmitting(false);
        return;
      }
      const user = JSON.parse(userStr);
      const nic = user.nic;

      const res = await fetch(`${API_URL}/policy-holder/add-vehicle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nic,
          company: newCompany.trim(),
          model: newModel.trim(),
          year: newYear.trim(),
          numberPlate: newNumberPlate.trim(),
          vehicleType: newVehicleType.trim(),
          policyNumber: newPolicyNumber.trim(),
          engineNumber: newEngineNumber.trim(),
          chassisNumber: newChassisNumber.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setValidationError(data.error || "Failed to add vehicle.");
        setIsSubmitting(false);
        return;
      }

      setVehicles(data.vehicles || [...vehicles, data.vehicle]);
      
      const updatedUser = { ...user, vehicles: data.vehicles || [...user.vehicles, data.vehicle] };
      sessionStorage.setItem("logged_in_user", JSON.stringify(updatedUser));

      setIsAddVehicleOpen(false);
      setNewCompany("");
      setNewModel("");
      setNewYear("");
      setNewNumberPlate("");
      setNewVehicleType("Car");
      setNewPolicyNumber("");
      setNewEngineNumber("");
      setNewChassisNumber("");

      setShowSuccessModal(true);
    } catch (err) {
      console.error("Add vehicle request failed", err);
      setValidationError("Unable to connect to the server.");
    } finally {
      setIsSubmitting(false);
    }
  };


  // 1. Fetch vehicles list from Database
  const fetchVehicles = async (showLoading = false) => {
    if (typeof window === "undefined") return;
    const userStr = sessionStorage.getItem("logged_in_user");
    if (!userStr) {
      if (showLoading) setIsLoading(false);
      return;
    }
    try {
      const user = JSON.parse(userStr);
      if (user.nic) {
        if (showLoading) setIsLoading(true);
        const res = await fetch(`${API_URL}/policy-holder/vehicles?nic=${encodeURIComponent(user.nic)}`, {
          cache: "no-store"
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.vehicles)) {
            setVehicles(data.vehicles);
            const updatedUser = { ...user, vehicles: data.vehicles };
            sessionStorage.setItem("logged_in_user", JSON.stringify(updatedUser));

            // Sync selected vehicle in open modal if present
            if (selectedVehicleForModal?.numberPlate) {
              const freshMatch = data.vehicles.find(
                (v: Vehicle) => v.numberPlate.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() === selectedVehicleForModal.numberPlate.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
              );
              if (freshMatch) {
                setSelectedVehicleForModal(freshMatch);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Error fetching vehicles:", err);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  // Reusable function to fetch renewal & active installment data
  const fetchRenewalData = async (plateToFetch?: string) => {
    const targetPlate = plateToFetch || selectedVehicleForModal?.numberPlate;
    if (!targetPlate) return;
    try {
      const plate = encodeURIComponent(targetPlate);
      const [quoteRes, instRes] = await Promise.all([
        fetch(`${API_URL}/renewals/vehicle-quote/${plate}`, { cache: "no-store" }),
        fetch(`${API_URL}/renewals/active-installment/${plate}`, { cache: "no-store" })
      ]);
      if (quoteRes.ok) {
        const qData = await quoteRes.json();
        setRenewalInfo(qData);
        setRenewalMap((prev) => ({ ...prev, [targetPlate]: qData }));
      }
      if (instRes.ok) {
        const iData = await instRes.json();
        setActiveInstallmentInfo(iData);
        setInstallmentMap((prev) => ({ ...prev, [targetPlate]: iData }));
      }
    } catch (e) {
      console.error("Error fetching renewal details:", e);
    }
  };

  // Reusable function to fetch renewal status for all vehicles
  const fetchSingleRenewal = async (plateToFetch: string) => {
    if (!plateToFetch) return;
    try {
      const plate = encodeURIComponent(plateToFetch);
      const [quoteRes, instRes] = await Promise.all([
        fetch(`${API_URL}/renewals/vehicle-quote/${plate}`, { cache: "no-store" }),
        fetch(`${API_URL}/renewals/active-installment/${plate}`, { cache: "no-store" })
      ]);
      if (quoteRes.ok) {
        const qData = await quoteRes.json();
        setRenewalMap((prev) => ({ ...prev, [plateToFetch]: qData }));
      }
      if (instRes.ok) {
        const iData = await instRes.json();
        setInstallmentMap((prev) => ({ ...prev, [plateToFetch]: iData }));
      }
    } catch (e) {
      // Quiet background fetch
    }
  };

  useEffect(() => {
    if (vehicles.length > 0) {
      vehicles.forEach((v) => {
        fetchSingleRenewal(v.numberPlate);
      });
    }
  }, [vehicles]);

  // Real-time polling for vehicles list & third-party requests
  useEffect(() => {
    fetchVehicles(true);
    loadThirdPartyRequests();
    const vehicleInterval = setInterval(() => {
      fetchVehicles(false);
      loadThirdPartyRequests();
    }, 6000);
    return () => clearInterval(vehicleInterval);
  }, []);

  // 2. Auto-open modal if plate query param is present in URL
  useEffect(() => {
    if (typeof window !== "undefined" && vehicles.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const plate = urlParams.get("plate");
      if (plate) {
        const matchingVehicle = vehicles.find(
          v => v.numberPlate.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() === plate.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
        );
        if (matchingVehicle) {
          setSelectedVehicleForModal(matchingVehicle);
        }
      }
    }
  }, [vehicles]);

  // 3. Disable body scroll when any modal is active
  useEffect(() => {
    if (selectedVehicleForModal || isAddVehicleOpen || showSuccessModal || coverNoteModalOpen || thirdPartyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedVehicleForModal, isAddVehicleOpen, showSuccessModal, renewalWizardOpen, paymentSuccessModal, coverNoteModalOpen, thirdPartyModalOpen]);

  // 4. Real-time background sync when modal is open for a vehicle (every 4s)
  useEffect(() => {
    if (selectedVehicleForModal?.numberPlate) {
      setLoadingRenewal(true);
      fetchRenewalData(selectedVehicleForModal.numberPlate).finally(() => setLoadingRenewal(false));
      const renewalInterval = setInterval(() => {
        fetchRenewalData(selectedVehicleForModal.numberPlate);
      }, 4000);
      return () => clearInterval(renewalInterval);
    } else {
      setRenewalInfo(null);
      setActiveInstallmentInfo(null);
    }
  }, [selectedVehicleForModal?.numberPlate]);

  // Window focus & tab visibility listener for immediate real-time sync without refresh
  useEffect(() => {
    const handleSyncOnActive = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchVehicles(false);
        loadThirdPartyRequests();
        if (selectedVehicleForModal?.numberPlate) {
          fetchRenewalData(selectedVehicleForModal.numberPlate);
        }
      }
    };
    window.addEventListener("focus", handleSyncOnActive);
    document.addEventListener("visibilitychange", handleSyncOnActive);
    return () => {
      window.removeEventListener("focus", handleSyncOnActive);
      document.removeEventListener("visibilitychange", handleSyncOnActive);
    };
  }, [selectedVehicleForModal?.numberPlate]);

  // 5. Verify Stripe session on return from Stripe Checkout (Automatic Real-time Update)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const isSuccess = urlParams.get("payment_success");
      const tpPaymentSuccess = urlParams.get("third_party_payment");
      const sessionId = urlParams.get("session_id");
      const plate = urlParams.get("plate");
      const inst = urlParams.get("inst");
      const tpRef = urlParams.get("ref");

      // Third-Party Registration Payment Return
      if (tpPaymentSuccess === "success" && sessionId) {
        fetch(`${API_URL}/third-party/verify-payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, requestReference: tpRef })
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              triggerToast(`Payment confirmed for Request ${tpRef || ""}! Application queued for branch approval.`);
              setActiveMainTab("third_party");
              loadThirdPartyRequests();
              window.history.replaceState({}, "", window.location.pathname);
            }
          })
          .catch((err) => console.error("Verify TP session error:", err));
      } else if (tpPaymentSuccess === "cancelled") {
        triggerToast("Third-party driver registration payment was cancelled.");
        setActiveMainTab("third_party");
        window.history.replaceState({}, "", window.location.pathname);
      }

      // Renewal Payment Return
      if (isSuccess === "true" && sessionId) {
        fetch(`${API_URL}/renewals/verify-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId })
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              setPaymentSuccessDetails({ plate: plate || "", installment: inst || "1" });
              setPaymentSuccessModal(true);
              window.history.replaceState({}, "", window.location.pathname);

              // Instantly refresh vehicles list & active renewal quote without reloading
              fetchVehicles(false);
              if (plate) {
                fetchRenewalData(plate);
              }
            }
          })
          .catch((err) => console.error("Verify session error:", err));
      }
    }
  }, []);

  // Handler to start Stripe Checkout
  const handleInitiateStripePayment = async (renewalId: string, installmentNumber: number = 1) => {
    try {
      setIsRedirectingToStripe(true);

      // Save plan choice if using the wizard
      if (renewalWizardOpen && selectedPlanType) {
        await fetch(`${API_URL}/renewals/select-plan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ renewalId, planType: selectedPlanType })
        });
      }

      const res = await fetch(`${API_URL}/renewals/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ renewalId, installmentNumber })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create Stripe payment session.");

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err: any) {
      console.error("Stripe Checkout Error:", err);
      alert(err.message || "Failed to connect to Stripe payment gateway.");
      setIsRedirectingToStripe(false);
    }
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Helper to extract comprehensive cover note details (including past payments and future schedules)
  const generateCoverNoteContent = (vehicle: Vehicle) => {
    const userStr = typeof window !== "undefined" ? sessionStorage.getItem("logged_in_user") : null;
    const user = userStr ? JSON.parse(userStr) : null;
    const renewal = activeInstallmentInfo?.renewal || renewalInfo?.renewalQuote;
    const ownerName = renewal?.ownerName || (user ? `${user.firstName} ${user.lastName}` : "Valued Customer");
    const nic = renewal?.nic || user?.nic || "N/A";
    const branch = renewal?.branch || user?.branch || "General";
    const installments: any[] = renewal?.installments || [];
    const selectedPlan = renewal?.selectedPlan || "Comprehensive Annual Policy";
    const totalAmount = renewal?.calculation?.totalRenewalAmount || 0;
    const valuation = renewal?.calculation?.marketValuation || 0;
    const paidInstallments = installments.filter((i) => i.status === "Paid");
    const pendingInstallments = installments.filter((i) => i.status === "Pending");
    const totalPaid = paidInstallments.reduce((sum, i) => sum + (i.amount || 0), 0);
    const balanceDue = pendingInstallments.reduce((sum, i) => sum + (i.amount || 0), 0);
    const expiry = renewalInfo?.expiryDate || vehicle.policyExpiryDate || "2027-11-20";
    const lastPaid = paidInstallments.length > 0 ? paidInstallments[paidInstallments.length - 1] : null;

    return {
      ownerName,
      nic,
      branch,
      renewal,
      installments,
      selectedPlan,
      totalAmount,
      valuation,
      paidInstallments,
      pendingInstallments,
      totalPaid,
      balanceDue,
      expiry,
      lastPaid
    };
  };

  // Open rich printable Cover Note Certificate modal
  const handleOpenCoverNote = (vehicle: Vehicle) => {
    setCoverNoteVehicle(vehicle);
    setCoverNoteModalOpen(true);
  };

  // Download official text Cover Note file with complete payment & schedule breakdown
  const handleDownloadCoverNote = (vehicle: Vehicle) => {
    triggerToast(`Generating official insurance certificate for ${formatNumberPlate(vehicle.numberPlate)}...`);
    const data = generateCoverNoteContent(vehicle);

    setTimeout(() => {
      const textLines = [
        `================================================================================`,
        `           SANASA GENERAL INSURANCE COMPANY LIMITED`,
        `           MOTOR INSURANCE POLICY CERTIFICATE / COVER NOTE`,
        `================================================================================`,
        `Certificate No : CN-${vehicle.policyNumber}-${new Date().getFullYear()}`,
        `Issue Date     : ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`,
        `Branch Office  : ${data.branch} Branch`,
        ``,
        `POLICY & INSURED DETAILS`,
        `--------------------------------------------------------------------------------`,
        `Policyholder   : ${data.ownerName}`,
        `NIC Number     : ${data.nic}`,
        `Policy Number  : ${vehicle.policyNumber}`,
        `Coverage Type  : Comprehensive Vehicle Insurance Plan`,
        `Coverage Status: ACTIVE COVERAGE`,
        `Valid Until    : ${new Date(data.expiry).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`,
        ``,
        `VEHICLE SPECIFICATIONS`,
        `--------------------------------------------------------------------------------`,
        `Vehicle Number : ${formatNumberPlate(vehicle.numberPlate)}`,
        `Vehicle Type   : ${vehicle.vehicleType}`,
        `Make & Model   : ${vehicle.company} ${vehicle.model} (${vehicle.year})`,
        `Engine Number  : ${vehicle.engineNumber}`,
        `Chassis Number : ${vehicle.chassisNumber}`,
        ``,
        `PREMIUM & PAYMENT STRUCTURE`,
        `--------------------------------------------------------------------------------`,
        `Selected Plan  : ${data.selectedPlan}`,
        data.valuation ? `Assessed Value : LKR ${data.valuation.toLocaleString()}` : ``,
        data.totalAmount ? `Total Premium  : LKR ${data.totalAmount.toLocaleString()}` : ``,
        `Amount Settled : LKR ${data.totalPaid.toLocaleString()}`,
        `Balance Due    : LKR ${data.balanceDue.toLocaleString()}`,
        ``,
        `LAST PAID PAYMENT RECORD`,
        `--------------------------------------------------------------------------------`,
        data.lastPaid ? [
          `Installment    : ${data.lastPaid.label || `Installment #${data.lastPaid.installmentNumber}`}`,
          `Amount Paid    : LKR ${data.lastPaid.amount.toLocaleString()}`,
          `Paid On        : ${new Date(data.lastPaid.paidAt || Date.now()).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`,
          `Payment Method : Stripe Payment Gateway (Session: ${data.lastPaid.stripeSessionId ? data.lastPaid.stripeSessionId.slice(0, 24) + "..." : "Confirmed"})`,
          `Status         : VERIFIED & CONFIRMED`
        ].join("\n") : `No prior online installments recorded.`,
        ``,
        `SCHEDULE OF FUTURE PAYMENTS`,
        `--------------------------------------------------------------------------------`,
        data.pendingInstallments.length > 0 ? data.pendingInstallments.map((inst: any, idx: number) => {
          return `[${idx === 0 ? "NEXT DUE" : "SCHEDULED"}] ${inst.label || `Installment #${inst.installmentNumber}`} | Amount: LKR ${inst.amount.toLocaleString()} | Due Date: ${new Date(inst.dueDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`;
        }).join("\n") : `All policy payments are fully settled. No outstanding balance.`,
        ``,
        `--------------------------------------------------------------------------------`,
        `This document certifies that the motor vehicle specified above is covered`,
        `under Sanasa General Insurance terms and conditions. The validity of coverage`,
        `is subject to the continuous settlement of installments on or before due dates.`,
        ``,
        `Authorized Officer: Sanasa General Insurance Co. LTD.`,
        `================================================================================`
      ].filter(Boolean).join("\n");

      const element = document.createElement("a");
      const file = new Blob([textLines], { type: "text/plain" });
      element.href = URL.createObjectURL(file);
      element.download = `Sanasa_Cover_Note_${vehicle.numberPlate}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      triggerToast(`Successfully downloaded Cover Note for ${formatNumberPlate(vehicle.numberPlate)}!`);
    }, 1000);
  };

  // Filter criteria: Search query & Category Tab
  const filteredVehicles = vehicles.filter((v) => {
    const term = searchQuery.toLowerCase();
    const matchesSearch =
      v.numberPlate.toLowerCase().includes(term) ||
      v.company.toLowerCase().includes(term) ||
      v.model.toLowerCase().includes(term) ||
      v.policyNumber.toLowerCase().includes(term);

    if (!matchesSearch) return false;

    if (activeCategory === "All") return true;
    const cat = activeCategory.toLowerCase();
    const vType = v.vehicleType.toLowerCase();

    if (cat === "car") return vType.includes("car");
    if (cat === "suv") return vType.includes("suv");
    if (cat === "bike") return vType.includes("bike") || vType.includes("motorcycle") || vType.includes("scooter");
    if (cat === "truck") return vType.includes("truck") || vType.includes("lorry");
    if (cat === "other") {
      return !vType.includes("car") && !vType.includes("suv") && !vType.includes("bike") && !vType.includes("motorcycle") && !vType.includes("scooter") && !vType.includes("truck") && !vType.includes("lorry");
    }

    return true;
  });

  const categories = [
    { id: "All", label: t.allVehicles },
    { id: "Car", label: t.cars },
    { id: "SUV", label: t.suvs },
    { id: "Bike", label: t.bikes },
    { id: "Truck", label: t.trucks },
    { id: "Other", label: t.others }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative">
      <PolicyHolderNavbar />

      {/* Styled curved header matching mockup exactly */}
      <div className="max-w-7xl w-full mx-auto px-6 md:px-16 mt-8 relative">
        {/* Absolute positioned background banner spanning to left edge of screen */}
        <div className="absolute top-0 bottom-0 left-[calc(50%-50vw)] right-6 md:right-12 bg-[url('/policy1.jpg')] bg-cover bg-center rounded-r-[75px] md:rounded-r-[95px] overflow-hidden shadow-md">
          {/* Mockup dark slate overlay matching other policy holder pages */}
          <div className="absolute inset-0 bg-slate-900/35" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0d2a3a]/90 via-[#0d2a3a]/75 to-transparent" />
        </div>

        {/* Text content aligned automatically with the page container */}
        <header className="relative z-10 h-[210px] flex flex-col justify-center pl-4 md:pl-8 select-none">
          <h1 className="text-white text-3xl md:text-[40px] font-bold tracking-tight leading-none">
            {t.title}
          </h1>
          <p className="text-slate-200 text-xs md:text-sm font-semibold mt-3.5 tracking-wide opacity-95">
            {t.subtitle}
          </p>
        </header>
      </div>

      {/* Main Grid Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 md:px-16 py-8 sm:py-10 relative z-20">
        
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-20 right-4 sm:right-8 z-50 bg-[#00ddff] text-black font-semibold px-4 sm:px-6 py-4 sm:py-5 rounded-2xl shadow-xl animate-bounce flex items-center gap-3 border-2 border-black max-w-[90vw]">
            <HugeiconsIcon icon={RefreshIcon} className="w-5 sm:w-6 h-5 sm:h-6 animate-spin flex-shrink-0" strokeWidth={2.5} />
            <span className="text-xs sm:text-sm">{toastMessage}</span>
          </div>
        )}

        {/* Dynamic Stat Summary Section - Matching My Claims & Home Overview */}
        <section className="-mt-10 sm:-mt-14 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-10 select-none">
          {/* Total Vehicles Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-[28px] p-4 sm:p-6 shadow-sm flex items-center justify-between min-h-[110px] sm:min-h-[120px] hover:shadow-md hover:border-slate-300 transition-all duration-200">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600 flex-shrink-0 shadow-inner">
                <HugeiconsIcon icon={Car01Icon} className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={1.8} />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-800 leading-none">{vehicles.length}</h3>
                <p className="text-slate-400 font-semibold text-xs uppercase tracking-wider mt-1.5">{t.totalInsured}</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200/60 whitespace-nowrap">
              Registered
            </span>
          </div>

          {/* Active Policies Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-[28px] p-4 sm:p-6 shadow-sm flex items-center justify-between min-h-[110px] sm:min-h-[120px] hover:shadow-md hover:border-slate-300 transition-all duration-200">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0 shadow-inner">
                <HugeiconsIcon icon={SecurityCheckIcon} className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={1.8} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-800 leading-none">
                  {vehicles.filter(v => v.policyNumber).length}
                </h3>
                <p className="text-slate-400 font-semibold text-xs uppercase tracking-wider mt-1.5">{t.activePolicies}</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active Coverage
            </span>
          </div>
        </section>

        {/* Main Tab Switcher: Insured Vehicles vs Third-Party Drivers */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-slate-200/80 pb-4 select-none">
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveMainTab("vehicles")}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm tracking-wide transition-all outline-none cursor-pointer border ${
                activeMainTab === "vehicles"
                  ? "bg-[#102A43] border-[#102A43] text-white shadow-md"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <HugeiconsIcon icon={Car01Icon} className="w-4 h-4" />
              <span>All Insured Vehicles</span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                  activeMainTab === "vehicles" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {vehicles.length}
              </span>
            </button>

            <button
              onClick={() => setActiveMainTab("third_party")}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm tracking-wide transition-all outline-none cursor-pointer border ${
                activeMainTab === "third_party"
                  ? "bg-[#102A43] border-[#102A43] text-white shadow-md"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <HugeiconsIcon icon={UserCheck01Icon} className="w-4 h-4" />
              <span>Third-Party Drivers</span>
              {thirdPartyRequests.length > 0 && (
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                    activeMainTab === "third_party" ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700"
                  }`}
                >
                  {thirdPartyRequests.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* TAB 1: ALL INSURED VEHICLES */}
        {activeMainTab === "vehicles" && (
          <>
            {/* Quick Driver Authorization Banner - Unified Design */}
            <div className="bg-gradient-to-br from-[#102A43] via-[#163e63] to-indigo-900 rounded-2xl sm:rounded-[30px] p-5 sm:p-8 text-white shadow-md relative overflow-hidden mb-6 sm:mb-8">
              <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
                <div className="space-y-2 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 text-cyan-300 text-xs font-bold rounded-full border border-white/15">
                    <HugeiconsIcon icon={Shield01Icon} className="w-3.5 h-3.5" />
                    <span>Fixed Fee: LKR 300 per Registration</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    Third-Party Driver Authorizations
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    Register authorized drivers who operate your insured vehicles. Covered under your existing policy with a single fixed fee of <strong>LKR 300</strong> covering all chosen vehicles, reviewed by your regional branch office.
                  </p>
                </div>

                <button
                  onClick={handleOpenThirdPartyNew}
                  className="px-5 sm:px-6 py-3 sm:py-3.5 bg-cyan-400 hover:bg-cyan-300 text-slate-900 font-bold text-xs sm:text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 w-full sm:w-auto self-stretch sm:self-auto cursor-pointer border-none flex-shrink-0"
                >
                  <HugeiconsIcon icon={UserAdd01Icon} className="w-5 h-5 text-slate-900" />
                  <span>+ Register New Driver</span>
                </button>
              </div>
            </div>

            {/* Filtering & Search Controls Panel */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-5 mb-6 sm:mb-8 bg-white border border-slate-200/80 p-4 sm:p-5 rounded-2xl sm:rounded-[26px] shadow-sm select-none">
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-semibold text-xs sm:text-[13px] md:text-sm tracking-wide transition-all outline-none border cursor-pointer select-none ${
                      activeCategory === cat.id
                        ? "bg-[#000080] border-[#000080] text-white shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full md:max-w-[300px]">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <HugeiconsIcon icon={Search01Icon} className="w-5 h-5" strokeWidth={2} />
                </span>
                <input
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-800 rounded-full py-2.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#000080] transition-all border border-slate-200 font-normal"
                />
                {searchQuery.length > 0 && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
                  >
                    &times;
                  </button>
                )}
              </div>
            </div>

            {/* Clean, Simple Best UI/UX Vehicles Directory */}
            {isLoading ? (
              <SimpleLoader message="Loading registered vehicles..." theme="blue" />
            ) : (
              <div className="space-y-5 select-none">
                {/* Sub-Header Toolbar with View Toggle & Add Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-bold text-slate-900 text-lg tracking-tight">Your Insured Vehicles</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                      {filteredVehicles.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* View Switcher: Grid vs List */}
                    <div className="bg-slate-100/90 p-1 rounded-xl flex items-center border border-slate-200/80">
                      <button
                        onClick={() => setVehicleViewMode("grid")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border-none cursor-pointer flex items-center gap-1.5 ${
                          vehicleViewMode === "grid"
                            ? "bg-white text-slate-900 shadow-2xs font-bold"
                            : "text-slate-500 hover:text-slate-800 bg-transparent"
                        }`}
                        title="Grid Card View"
                      >
                        <span>Grid</span>
                      </button>
                      <button
                        onClick={() => setVehicleViewMode("list")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border-none cursor-pointer flex items-center gap-1.5 ${
                          vehicleViewMode === "list"
                            ? "bg-white text-slate-900 shadow-2xs font-bold"
                            : "text-slate-500 hover:text-slate-800 bg-transparent"
                        }`}
                        title="Compact List View"
                      >
                        <span>List</span>
                      </button>
                    </div>

                    {/* Add Vehicle Button */}
                    <button
                      onClick={handleOpenAddVehicle}
                      className="bg-[#102A43] hover:bg-[#163e63] text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-2xs transition-all flex items-center gap-2 border-none cursor-pointer active:scale-[0.98]"
                    >
                      <HugeiconsIcon icon={Add01Icon} className="w-4 h-4 text-white" strokeWidth={2} />
                      <span>Add Vehicle</span>
                    </button>
                  </div>
                </div>

                {/* Empty State */}
                {filteredVehicles.length === 0 && (
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center shadow-xs">
                    <div className="w-12 h-12 bg-slate-50 border border-slate-200/60 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
                      <HugeiconsIcon icon={Alert02Icon} className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm mb-1">{t.noVehiclesFound}</h4>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto mb-4 leading-relaxed">
                      {searchQuery ? `${t.searchNoMatch} "${searchQuery}".` : t.noCategoryVehiclesFound}
                    </p>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="bg-[#102A43] hover:bg-[#163e63] text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer border-none"
                      >
                        {t.clearSearch}
                      </button>
                    )}
                  </div>
                )}

                {/* VIEW MODE 1: CLEAN MODERN GRID */}
                {vehicleViewMode === "grid" && filteredVehicles.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                    {filteredVehicles.map((vehicle) => {
                      const qInfo = renewalMap[vehicle.numberPlate];
                      const iInfo = installmentMap[vehicle.numberPlate];
                      const isQuoteReady = qInfo?.hasCalculatedQuote && qInfo?.renewalQuote?.status === "Calculated";
                      const isInstallmentDue = iInfo?.hasActivePlan && iInfo?.nextInstallment && !iInfo?.isFullyPaid;
                      const expDateStr = qInfo?.expiryDate || vehicle.policyExpiryDate;
                      const driverInfo = vehicleDriverMap[vehicle.numberPlate];

                      return (
                        <div
                          key={vehicle.numberPlate}
                          className="relative bg-white rounded-3xl border border-slate-200/80 hover:border-slate-300 p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(16,42,67,0.06)] hover:shadow-[0_14px_32px_-6px_rgba(16,42,67,0.12)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group overflow-hidden"
                        >
                          {/* Ambient Accent Line */}
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#102A43]/20 to-transparent group-hover:via-[#102A43]/60 transition-all duration-300" />

                          <div>
                            {/* Card Header: Plate & Status Badges */}
                            <div className="flex items-center justify-between gap-2 mb-3.5">
                              {/* Clean Authentic Sri Lankan Style Number Plate */}
                              <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-slate-50 hover:bg-slate-100/90 text-slate-800 rounded-lg border border-slate-200/90 font-mono font-bold text-xs tracking-wider shadow-2xs select-all transition-colors">
                                <span className="text-[10px] font-bold text-slate-400 font-sans tracking-tight">LK</span>
                                <span className="w-px h-3 bg-slate-300" />
                                <span>{formatNumberPlate(vehicle.numberPlate)}</span>
                              </div>

                              {/* Status Badges */}
                              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/70 rounded-full px-2.5 py-0.5 select-none">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span>Active</span>
                                </span>

                                {isInstallmentDue && (
                                  <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-amber-800 bg-amber-50 border border-amber-200/70 rounded-full px-2.5 py-0.5 select-none">
                                    <HugeiconsIcon icon={Clock01Icon} className="w-3 h-3 text-amber-600" strokeWidth={2.2} />
                                    <span>Due</span>
                                  </span>
                                )}

                                {isQuoteReady && (
                                  <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-sky-800 bg-sky-50 border border-sky-200/70 rounded-full px-2.5 py-0.5 select-none">
                                    <HugeiconsIcon icon={CreditCardIcon} className="w-3 h-3 text-sky-600" strokeWidth={2.2} />
                                    <span>Quote</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Vehicle Profile: Icon + Make/Model */}
                            <div className="flex items-center gap-3.5 mb-4 select-none">
                              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-[#102A43] group-hover:border-[#102A43]/30 group-hover:bg-[#102A43]/5 transition-all duration-300 flex-shrink-0 shadow-2xs">
                                {getVehicleIconSvg(vehicle.vehicleType, "w-6 h-6 text-[#102A43]")}
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="text-[10.5px] font-bold tracking-wider text-slate-400 uppercase block">
                                  {vehicle.vehicleType} • {vehicle.year}
                                </span>
                                <h3 className="text-base sm:text-[17px] font-bold text-slate-900 group-hover:text-[#102A43] transition-colors truncate leading-snug mt-0.5">
                                  {vehicle.company} {vehicle.model}
                                </h3>
                                <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">
                                  Policy: <span className="text-slate-600 font-medium">{vehicle.policyNumber || "N/A"}</span>
                                </p>
                              </div>
                            </div>

                            {/* Clean Micro Info Grid */}
                            <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100/90 grid grid-cols-2 gap-3 divide-x divide-slate-200/70 mb-4 select-none">
                              {/* Coverage Expiry */}
                              <div className="flex flex-col justify-between">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Coverage Expiry</span>
                                <span className="font-bold text-slate-800 text-xs sm:text-[13px] mt-1 block">
                                  {expDateStr ? new Date(expDateStr).toLocaleDateString() : "Active Coverage"}
                                </span>
                              </div>

                              {/* Assigned Driver(s) */}
                              <div className="flex flex-col justify-between pl-3 min-w-0">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                                  {(vehicleDriversMap[vehicle.numberPlate] || []).length > 1
                                    ? `Drivers (${(vehicleDriversMap[vehicle.numberPlate] || []).length})`
                                    : "Assigned Driver"}
                                </span>
                                <div className="mt-1">
                                  {(() => {
                                    const drivers = vehicleDriversMap[vehicle.numberPlate] || [];
                                    if (drivers.length === 0) {
                                      return <span className="text-slate-400 text-xs font-normal italic block">None Assigned</span>;
                                    }
                                    if (drivers.length === 1) {
                                      const d = drivers[0];
                                      const isApp = d.status === "Approved";
                                      return (
                                        <span
                                          onClick={() => setSelectedVehicleForModal(vehicle)}
                                          className={`font-semibold text-xs inline-flex items-center gap-1.5 truncate max-w-full cursor-pointer hover:underline ${
                                            isApp ? "text-emerald-700" : "text-amber-700"
                                          }`}
                                          title={d.driverName}
                                        >
                                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isApp ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                                          <span className="truncate">{d.driverName}</span>
                                        </span>
                                      );
                                    }
                                    return (
                                      <div
                                        onClick={() => setSelectedVehicleForModal(vehicle)}
                                        className="cursor-pointer group/drv"
                                        title={drivers.map((d) => d.driverName).join(", ")}
                                      >
                                        <span className="font-semibold text-indigo-700 text-xs inline-flex items-center gap-1.5 truncate max-w-full">
                                          <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                                          <span className="truncate font-bold">{drivers.length} Drivers Authorized</span>
                                        </span>
                                        <span className="text-[10px] text-slate-500 block truncate group-hover/drv:text-indigo-600 transition-colors">
                                          {drivers[0].driverName} +{drivers.length - 1} more
                                        </span>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons: Always allow Assign Driver */}
                          <div className="pt-3 border-t border-slate-100/90 flex items-center gap-2.5">
                            <button
                              onClick={() => setSelectedVehicleForModal(vehicle)}
                              className="flex-1 bg-[#102A43] hover:bg-[#163e63] active:scale-[0.98] text-white font-semibold text-xs sm:text-[13px] py-2.5 px-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 shadow-2xs hover:shadow cursor-pointer border-none"
                            >
                              <HugeiconsIcon icon={ViewIcon} className="w-3.5 h-3.5 text-white" strokeWidth={2.2} />
                              <span>{t.viewDetails}</span>
                            </button>

                            <button
                              onClick={() => handleOpenThirdPartyForVehicle(vehicle.numberPlate)}
                              className="font-semibold text-xs sm:text-[13px] py-2.5 px-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-[0.98] cursor-pointer bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/70 shadow-2xs"
                              title="Assign another authorized driver to this vehicle"
                            >
                              <HugeiconsIcon icon={UserAdd01Icon} className="w-3.5 h-3.5" />
                              <span>{(vehicleDriversMap[vehicle.numberPlate] || []).length > 0 ? "+ Assign Driver" : "Assign Driver"}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Add Vehicle Card */}
                    <button
                      onClick={handleOpenAddVehicle}
                      className="bg-gradient-to-b from-slate-50/70 via-white to-slate-50/50 hover:from-slate-100/70 hover:to-slate-50/80 border-2 border-dashed border-slate-200/90 hover:border-[#102A43]/40 rounded-3xl p-6 min-h-[220px] flex flex-col items-center justify-center gap-3.5 transition-all duration-300 group cursor-pointer w-full text-slate-800 shadow-[0_2px_10px_-2px_rgba(15,45,74,0.03)] hover:shadow-md hover:-translate-y-1"
                    >
                      <div className="w-13 h-13 rounded-2xl bg-white border border-slate-200 group-hover:border-[#102A43]/30 group-hover:bg-[#102A43]/5 flex items-center justify-center text-slate-400 group-hover:text-[#102A43] group-hover:scale-110 shadow-sm transition-all duration-300">
                        <HugeiconsIcon icon={Add01Icon} className="w-6 h-6" strokeWidth={2.2} />
                      </div>
                      <div className="text-center select-none">
                        <h4 className="text-slate-900 group-hover:text-[#102A43] font-bold text-sm mb-1 transition-colors">
                          {t.addVehicle}
                        </h4>
                        <p className="text-slate-400 font-normal text-xs max-w-[200px] leading-relaxed">{t.registerDesc}</p>
                      </div>
                    </button>
                  </div>
                )}

                {/* VIEW MODE 2: CLEAN MODERN COMPACT LIST WITH FIXED GRID ALIGNMENT */}
                {vehicleViewMode === "list" && filteredVehicles.length > 0 && (
                  <div className="bg-white border border-slate-200/90 rounded-2xl divide-y divide-slate-100 overflow-hidden shadow-xs">
                    {/* Structured Grid Table Header */}
                    <div className="hidden lg:grid lg:grid-cols-[130px_minmax(180px,1.4fr)_110px_160px_110px_230px] items-center gap-4 px-6 py-3 bg-slate-50/90 border-b border-slate-200/80 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                      <div>Plate Number</div>
                      <div>Vehicle Details</div>
                      <div>Policy Expiry</div>
                      <div>Authorized Driver</div>
                      <div>Coverage Status</div>
                      <div className="text-right">Actions</div>
                    </div>

                    {filteredVehicles.map((vehicle) => {
                      const qInfo = renewalMap[vehicle.numberPlate];
                      const iInfo = installmentMap[vehicle.numberPlate];
                      const isQuoteReady = qInfo?.hasCalculatedQuote && qInfo?.renewalQuote?.status === "Calculated";
                      const isInstallmentDue = iInfo?.hasActivePlan && iInfo?.nextInstallment && !iInfo?.isFullyPaid;
                      const expDateStr = qInfo?.expiryDate || vehicle.policyExpiryDate;
                      const driverInfo = vehicleDriverMap[vehicle.numberPlate];

                      return (
                        <div
                          key={vehicle.numberPlate}
                          className="p-4 sm:px-6 flex flex-col lg:grid lg:grid-cols-[130px_minmax(180px,1.4fr)_110px_160px_110px_230px] items-start lg:items-center gap-3 lg:gap-4 hover:bg-slate-50/70 transition-colors"
                        >
                          {/* Col 1: Plate */}
                          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-slate-50 hover:bg-slate-100/90 text-slate-800 rounded-lg border border-slate-200/90 font-mono font-bold text-xs tracking-wider shadow-2xs select-all flex-shrink-0 transition-colors">
                            <span className="text-[10px] font-bold text-slate-400 font-sans tracking-tight">LK</span>
                            <span className="w-px h-3 bg-slate-300" />
                            <span>{formatNumberPlate(vehicle.numberPlate)}</span>
                          </div>

                          {/* Col 2: Vehicle Info */}
                          <div className="min-w-0 pr-2 w-full lg:w-auto">
                            <h4 className="font-bold text-slate-900 text-sm truncate" title={`${vehicle.company} ${vehicle.model}`}>
                              {vehicle.company} {vehicle.model}
                            </h4>
                            <p className="text-xs text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5 truncate">
                              <span className="text-slate-600 font-medium">{vehicle.vehicleType}</span>
                              <span>•</span>
                              <span>{vehicle.year}</span>
                              <span>•</span>
                              <span className="font-mono text-slate-500 truncate">Policy: {vehicle.policyNumber || "N/A"}</span>
                            </p>
                          </div>

                          {/* Col 3: Expiry Date */}
                          <div className="min-w-0 w-full lg:w-auto flex items-center justify-between lg:block">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block lg:hidden">Expiry</span>
                            <span className="font-semibold text-slate-800 text-xs font-mono">
                              {expDateStr ? new Date(expDateStr).toLocaleDateString() : "Active"}
                            </span>
                          </div>

                          {/* Col 4: Authorized Driver */}
                          <div className="min-w-0 w-full lg:w-auto flex items-center justify-between lg:block">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block lg:hidden">
                              {(vehicleDriversMap[vehicle.numberPlate] || []).length > 1
                                ? `Drivers (${(vehicleDriversMap[vehicle.numberPlate] || []).length})`
                                : "Driver"}
                            </span>
                            {(() => {
                              const drivers = vehicleDriversMap[vehicle.numberPlate] || [];
                              if (drivers.length === 0) {
                                return <span className="text-slate-400 italic text-xs block truncate">None Assigned</span>;
                              }
                              if (drivers.length === 1) {
                                return (
                                  <span
                                    onClick={() => setSelectedVehicleForModal(vehicle)}
                                    className="font-semibold text-indigo-700 flex items-center gap-1.5 text-xs cursor-pointer hover:underline truncate"
                                    title={drivers[0].driverName}
                                  >
                                    <HugeiconsIcon icon={UserCheck01Icon} className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                                    <span className="truncate">{drivers[0].driverName}</span>
                                  </span>
                                );
                              }
                              return (
                                <span
                                  onClick={() => setSelectedVehicleForModal(vehicle)}
                                  className="font-bold text-indigo-700 flex items-center gap-1.5 text-xs cursor-pointer hover:underline truncate"
                                  title={drivers.map((d) => d.driverName).join(", ")}
                                >
                                  <HugeiconsIcon icon={UserCheck01Icon} className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                                  <span className="truncate">{drivers.length} Drivers</span>
                                </span>
                              );
                            })()}
                          </div>

                          {/* Col 5: Coverage Status */}
                          <div className="flex items-center justify-between lg:justify-start gap-1.5 w-full lg:w-auto">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block lg:hidden">Status</span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/70 rounded-full px-2.5 py-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>Active</span>
                              </span>

                              {isInstallmentDue && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5">
                                  <HugeiconsIcon icon={Clock01Icon} className="w-3 h-3 text-amber-700" />
                                  <span>Due</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Col 6: Actions */}
                          <div className="flex items-center justify-start lg:justify-end gap-2 w-full lg:w-auto pt-2 border-t border-slate-100 lg:border-t-0 lg:pt-0">
                            <button
                              onClick={() => setSelectedVehicleForModal(vehicle)}
                              className="flex-1 lg:flex-none justify-center bg-[#102A43] hover:bg-[#163e63] text-white font-semibold text-xs py-2 px-3.5 rounded-xl transition-all shadow-2xs border-none cursor-pointer flex items-center gap-1.5 whitespace-nowrap active:scale-[0.98]"
                            >
                              <HugeiconsIcon icon={ViewIcon} className="w-3.5 h-3.5 text-white" />
                              <span>View Details</span>
                            </button>

                            <button
                              onClick={() => handleOpenThirdPartyForVehicle(vehicle.numberPlate)}
                              className="flex-1 lg:flex-none justify-center font-semibold text-xs py-2 px-3 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 shadow-2xs whitespace-nowrap active:scale-[0.98]"
                              title="Assign or manage drivers"
                            >
                              <HugeiconsIcon icon={UserAdd01Icon} className="w-3.5 h-3.5" />
                              <span>{(vehicleDriversMap[vehicle.numberPlate] || []).length > 0 ? "Manage Driver" : "Assign Driver"}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
      </>
    )}

    {/* TAB 2: THIRD-PARTY DRIVERS MANAGEMENT */}
    {activeMainTab === "third_party" && (
      <div className="space-y-6">
        {/* Header / Intro Card */}
        <div className="bg-gradient-to-br from-[#102A43] via-[#163e63] to-indigo-900 rounded-[30px] p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 text-cyan-300 text-xs font-bold rounded-full border border-white/15">
                <HugeiconsIcon icon={Shield01Icon} className="w-3.5 h-3.5" />
                <span>Fixed Fee: LKR 300 per Registration</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Third-Party Driver Authorizations
              </h3>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                Register authorized drivers who operate your insured vehicles. Covered under your existing policy with a single fixed fee of <strong>LKR 300</strong> covering all chosen vehicles, reviewed by your regional branch office.
              </p>
            </div>

            <button
              onClick={handleOpenThirdPartyNew}
              className="px-6 py-3.5 bg-cyan-400 hover:bg-cyan-300 text-slate-900 font-bold text-xs sm:text-sm rounded-2xl shadow-lg transition-all flex items-center gap-2 self-start md:self-auto cursor-pointer border-none flex-shrink-0"
            >
              <HugeiconsIcon icon={UserAdd01Icon} className="w-5 h-5 text-slate-900" />
              <span>+ Register New Driver</span>
            </button>
          </div>
        </div>

        {/* Third-Party Drivers List */}
        {loadingThirdParty ? (
          <div className="py-16 bg-white rounded-3xl border border-slate-200 flex flex-col items-center justify-center">
            <SimpleLoader message="Loading third-party drivers..." theme="blue" />
          </div>
        ) : thirdPartyRequests.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-[30px] p-10 text-center shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
              <HugeiconsIcon icon={UserCheck01Icon} className="w-8 h-8" />
            </div>
            <h4 className="text-slate-800 font-bold text-base mb-1">No Third-Party Drivers Registered Yet</h4>
            <p className="text-slate-500 text-xs max-w-md mx-auto mb-6">
              You haven't authorized any third-party drivers yet. Authorize drivers to allow others to safely and officially drive your insured vehicles.
            </p>
            <button
              onClick={handleOpenThirdPartyNew}
              className="px-6 py-3 bg-[#102A43] hover:bg-[#1C3E63] text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer border-none inline-flex items-center gap-2"
            >
              <HugeiconsIcon icon={UserAdd01Icon} className="w-4 h-4" />
              <span>Register Your First Driver (LKR 300)</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {thirdPartyRequests.map((req) => (
              <div
                key={req._id}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Top Header Row */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[#102A43] bg-slate-100 px-2.5 py-1 rounded-lg">
                        {req.requestReference}
                      </span>
                    </div>

                    {/* Status Badge */}
                    {req.status === "Approved" ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-3.5 h-3.5" />
                        Approved
                      </span>
                    ) : req.status === "Pending Termination Approval" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        Termination Under Branch Review
                      </span>
                    ) : req.status === "Terminated" ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                        <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" />
                        Terminated / Revoked
                      </span>
                    ) : req.status === "Pending Branch Approval" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Pending Branch Review
                      </span>
                    ) : req.status === "Rejected" ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" />
                        Rejected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <HugeiconsIcon icon={CreditCardIcon} className="w-3.5 h-3.5" />
                        Pending Payment
                      </span>
                    )}
                  </div>

                  {/* Driver Details Card */}
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center flex-shrink-0">
                      <HugeiconsIcon icon={UserCheck01Icon} className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-slate-800 text-base">{req.driverDetails?.fullName}</h4>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        NIC: {req.driverDetails?.nicNumber || "—"} • Tel: {req.driverDetails?.phoneNumber}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {req.driverDetails?.residentialAddress}
                      </div>
                    </div>
                  </div>

                  {/* Covered Vehicles */}
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Authorized Vehicles ({req.selectedVehicles?.length || 0})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {req.selectedVehicles?.map((v: any) => (
                        <span
                          key={v.numberPlate}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono font-medium text-xs border border-slate-200"
                        >
                          <HugeiconsIcon icon={Car01Icon} className="w-3 3 text-slate-500" />
                          {v.numberPlate}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Third-Party Driver Scope & Limitations Card */}
                  <div className="pt-1">
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-[11px] space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                        <HugeiconsIcon icon={SecurityCheckIcon} className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Driver Scope & Limitations:</span>
                      </div>
                      <p className="text-slate-500 leading-tight">
                        • <strong className="text-emerald-700">Permitted:</strong> Drive authorized vehicle(s) & file accident claims.
                        <br />
                        • <strong className="text-slate-700">Restricted:</strong> No access to policy renewals, coverage changes, or policyholder account data.
                      </p>
                    </div>
                  </div>

                  {/* Rejection Notice if applicable */}
                  {req.status === "Rejected" && req.branchReview?.rejectionReason && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                      <p className="font-semibold">Reason for rejection:</p>
                      <p className="mt-0.5 text-rose-700">{req.branchReview.rejectionReason}</p>
                    </div>
                  )}

                  {/* Pending Termination Notice */}
                  {req.status === "Pending Termination Approval" && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                      <p className="font-semibold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        Termination request pending branch sign-off
                      </p>
                      <p className="text-rose-700 text-[11px]">
                        Reason: {req.terminationRequest?.reason || "Policyholder termination request"}
                      </p>
                    </div>
                  )}

                  {/* Terminated Notice */}
                  {req.status === "Terminated" && (
                    <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600">
                      <p className="font-semibold text-slate-700">Driver authorization terminated.</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Access to the vehicle portal, NFC pass, and driver app has been permanently blocked.
                      </p>
                    </div>
                  )}
                </div>

                {/* Bottom Status & Actions Bar */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3 text-xs flex-wrap">
                  <div>
                    {req.payment?.status === "Paid" ? (
                      <span className="font-semibold text-emerald-700 flex items-center gap-1">
                        <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-3.5 h-3.5" />
                        Fee Paid (LKR 300)
                      </span>
                    ) : (
                      <span className="font-semibold text-amber-700 flex items-center gap-1">
                        <HugeiconsIcon icon={CreditCardIcon} className="w-3.5 h-3.5" />
                        Fee: LKR 300 Unpaid
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {req.payment?.status !== "Paid" && req.status === "Pending Payment" && (
                      <button
                        onClick={() => handleResumeThirdPartyPayment(req._id)}
                        disabled={resumingPaymentId === req._id}
                        className="px-4 py-2 bg-[#ff9800] hover:bg-[#e68900] text-white font-bold rounded-xl transition-colors cursor-pointer border-none flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <HugeiconsIcon icon={CreditCardIcon} className="w-3.5 h-3.5" />
                        <span>{resumingPaymentId === req._id ? "Redirecting..." : "Pay LKR 300 Now"}</span>
                      </button>
                    )}

                    {req.status === "Approved" && (
                      <>
                        <span className="text-emerald-700 font-semibold text-[11px] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          Digital Pass Ready
                        </span>
                        <button
                          onClick={() => handleOpenTerminateModal(req)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Request driver authorization termination"
                        >
                          <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" />
                          <span>Terminate Driver</span>
                        </button>
                      </>
                    )}

                    {req.status === "Pending Termination Approval" && (
                      <span className="text-rose-700 font-semibold text-[11px] bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        Awaiting Branch Approval
                      </span>
                    )}

                    {req.status === "Terminated" && (
                      <span className="text-slate-500 font-semibold text-[11px] bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                        Access Revoked
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}

        {/* Supportive Help Banner */}
        <section className="bg-slate-800 border border-slate-900 rounded-[30px] p-7 mt-12 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_15px_30px_rgba(0,0,0,0.06)]">
          <div className="max-w-2xl text-center md:text-left select-none">
            <h4 className="text-lg font-bold tracking-tight mb-1 text-white">Need to update your vehicle registry?</h4>
            <p className="text-slate-300 text-xs md:text-sm font-normal leading-relaxed m-0">
              If any of your insured vehicles are missing, or if you recently upgraded your coverage plan, please reach out to our Galle regional office staff or message your assigned insurance agent.
            </p>
          </div>
          <Link
            href="/Policy_Holder/Contact"
            className="bg-[#ff9800] hover:bg-[#e68900] text-white font-semibold text-sm px-8 py-4 rounded-full transition-all no-underline shadow-md whitespace-nowrap"
          >
            Contact Support
          </Link>
        </section>

      </main>

      {/* Vehicle Detail Popup Modal - Enlarged & Redesigned */}
      {selectedVehicleForModal && (() => {
        const modalDriverInfo = vehicleDriverMap[selectedVehicleForModal.numberPlate];

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 transition-all duration-300">
            <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-[32px] w-full max-w-3xl max-h-[92vh] sm:max-h-[88vh] shadow-[0_24px_60px_rgba(15,42,67,0.18)] flex flex-col relative overflow-hidden">
              
              {/* Modal Header */}
              <div className="flex justify-between items-center px-4 sm:px-8 py-3.5 sm:py-5 border-b border-slate-100 bg-white flex-shrink-0">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 tracking-tight leading-none">
                    Vehicle Specifications
                  </h2>
                  <div className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 bg-slate-50 text-slate-800 rounded-lg border border-slate-200/90 font-mono font-bold text-xs tracking-wider shadow-2xs select-all">
                    <span className="text-[10px] font-bold text-slate-400 font-sans tracking-tight">LK</span>
                    <span className="w-px h-3 bg-slate-300" />
                    <span>{formatNumberPlate(selectedVehicleForModal.numberPlate)}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedVehicleForModal(null)}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors text-2xl font-normal border-none bg-transparent cursor-pointer outline-none flex-shrink-0"
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-4 sm:p-8 flex-1 overflow-y-auto space-y-4 sm:space-y-6">
                
                {/* Profile Hero Card inside modal */}
                <div className="bg-gradient-to-r from-slate-50 via-sky-50/30 to-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs select-none">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center flex-shrink-0 text-[#102A43]">
                      {getVehicleIconSvg(selectedVehicleForModal.vehicleType, "w-7 h-7 text-[#102A43]")}
                    </div>
                    <div>
                      <h3 className="text-slate-900 font-bold text-xl leading-tight">
                        {selectedVehicleForModal.company} {selectedVehicleForModal.model}
                      </h3>
                      <p className="text-slate-500 font-medium text-xs mt-1">
                        Model Year: <strong className="text-slate-700">{selectedVehicleForModal.year}</strong> • Category: <strong className="text-slate-700">{selectedVehicleForModal.vehicleType}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end gap-1.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-full px-3 py-1 select-none w-fit">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Active Coverage</span>
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Policy #{selectedVehicleForModal.policyNumber || "N/A"}
                    </span>
                  </div>
                </div>

                {/* Third-Party Driver Status / Multi-Driver Section Inside Modal */}
                {(() => {
                  const modalDrivers = vehicleDriversMap[selectedVehicleForModal.numberPlate] || [];
                  return (
                    <div className="space-y-3 bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/90">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80">
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <HugeiconsIcon icon={UserCheck01Icon} className="w-4 h-4 text-indigo-600" />
                            <span>Authorized Third-Party Drivers ({modalDrivers.length})</span>
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Multiple drivers can be authorized to operate this vehicle. Fixed fee LKR 300 per registration.
                          </p>
                        </div>

                        <button
                          onClick={() => {
                            const plate = selectedVehicleForModal.numberPlate;
                            setSelectedVehicleForModal(null);
                            handleOpenThirdPartyForVehicle(plate);
                          }}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-all cursor-pointer border-none shadow-2xs self-start sm:self-auto flex-shrink-0"
                        >
                          <HugeiconsIcon icon={UserAdd01Icon} className="w-3.5 h-3.5" />
                          <span>+ Assign Driver</span>
                        </button>
                      </div>

                      {modalDrivers.length === 0 ? (
                        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-4 text-center">
                          <p className="text-xs font-semibold text-slate-700">Self-Driven (No Authorized Drivers)</p>
                          <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                            Authorize external drivers (family, employees, chauffeurs) to legally operate this vehicle under your existing policy.
                          </p>
                          <button
                            onClick={() => {
                              const plate = selectedVehicleForModal.numberPlate;
                              setSelectedVehicleForModal(null);
                              handleOpenThirdPartyForVehicle(plate);
                            }}
                            className="mt-2.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 cursor-pointer"
                          >
                            <HugeiconsIcon icon={UserAdd01Icon} className="w-3.5 h-3.5" />
                            <span>Authorize a Driver (LKR 300)</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {modalDrivers.map((driver) => {
                            const req = driver.req;
                            const isApproved = driver.status === "Approved";
                            const isPendingTerm = driver.status === "Pending Termination Approval";
                            const isTerminated = driver.status === "Terminated";
                            const isPendingApp = driver.status === "Pending Branch Approval";

                            return (
                              <div
                                key={req?._id || driver.ref}
                                className="bg-white border border-slate-200/90 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                                    {(driver.driverName || "D").charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-bold text-slate-900 truncate">{driver.driverName || "Assigned Driver"}</span>
                                      <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                          isApproved
                                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                            : isPendingTerm
                                            ? "bg-rose-50 text-rose-800 border-rose-200"
                                            : isPendingApp
                                            ? "bg-amber-50 text-amber-800 border-amber-200"
                                            : "bg-slate-100 text-slate-700 border-slate-300"
                                        }`}
                                      >
                                        {isApproved ? "Active Driver" : driver.status}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5 font-mono truncate">
                                      Ref: {driver.ref}
                                      {req?.driverDetails?.phoneNumber ? ` • Tel: ${req.driverDetails.phoneNumber}` : ""}
                                      {req?.driverDetails?.nicNumber ? ` • NIC: ${req.driverDetails.nicNumber}` : ""}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
                                  {req && (
                                    <button
                                      onClick={() => {
                                        setSelectedVehicleForModal(null);
                                        setSelectedDriverForManage(req);
                                      }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer"
                                    >
                                      <HugeiconsIcon icon={UserCheck01Icon} className="w-3.5 h-3.5 text-slate-600" />
                                      <span>View Pass</span>
                                    </button>
                                  )}

                                  {isApproved && req && (
                                    <button
                                      onClick={() => {
                                        setSelectedVehicleForModal(null);
                                        handleOpenTerminateModal(req);
                                      }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer"
                                    >
                                      <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5 text-rose-600" />
                                      <span>Terminate</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Technical Specifications Grid */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Specifications & Policy Coverage
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs text-xs">
                    <div className="border-b border-slate-100 pb-2.5 sm:border-b-0 sm:pb-0 sm:border-r sm:pr-4">
                      <span className="text-slate-400 block text-[11px] font-medium">Vehicle Registration Plate</span>
                      <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">
                        {formatNumberPlate(selectedVehicleForModal.numberPlate)}
                      </span>
                    </div>

                    <div className="border-b border-slate-100 pb-2.5 sm:border-b-0 sm:pb-0">
                      <span className="text-slate-400 block text-[11px] font-medium">Policy Number</span>
                      <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">
                        {selectedVehicleForModal.policyNumber || "N/A"}
                      </span>
                    </div>

                    <div className="border-b border-slate-100 pb-2.5 sm:border-b-0 sm:pb-0 sm:border-r sm:pr-4 pt-2">
                      <span className="text-slate-400 block text-[11px] font-medium">Engine Number</span>
                      <span className="font-mono text-slate-700 text-xs mt-0.5 block">
                        {selectedVehicleForModal.engineNumber || "N/A"}
                      </span>
                    </div>

                    <div className="border-b border-slate-100 pb-2.5 sm:border-b-0 sm:pb-0 pt-2">
                      <span className="text-slate-400 block text-[11px] font-medium">Chassis Number</span>
                      <span className="font-mono text-slate-700 text-xs mt-0.5 block">
                        {selectedVehicleForModal.chassisNumber || "N/A"}
                      </span>
                    </div>

                    <div className="border-b border-slate-100 pb-2.5 sm:border-b-0 sm:pb-0 sm:border-r sm:pr-4 pt-2">
                      <span className="text-slate-400 block text-[11px] font-medium">Renewal Cycle / Expiry</span>
                      <span className="font-semibold text-slate-800 text-xs mt-0.5 block">
                        {renewalInfo?.expiryDate ? `Expires on ${new Date(renewalInfo.expiryDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}` : "Annual Policy"}
                      </span>
                    </div>

                    <div className="pt-2">
                      <span className="text-slate-400 block text-[11px] font-medium">Insurance Plan Type</span>
                      <span className="font-semibold text-slate-800 text-xs mt-0.5 block">
                        Comprehensive Vehicle Insurance Plan
                      </span>
                    </div>
                  </div>
                </div>

                {/* Primary Action Buttons in Modal */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <button
                    onClick={() => {
                      const plate = selectedVehicleForModal.numberPlate;
                      setSelectedVehicleForModal(null);
                      handleOpenThirdPartyForVehicle(plate);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm py-3.5 px-4 rounded-xl text-center cursor-pointer border-none shadow-sm hover:shadow transition-all flex items-center justify-center gap-2"
                  >
                    <HugeiconsIcon icon={UserAdd01Icon} className="w-4 h-4" />
                    <span>+ Add Driver</span>
                  </button>

                  <button
                    onClick={() => handleOpenCoverNote(selectedVehicleForModal)}
                    className="bg-[#1fcbf2] hover:bg-[#00b2d6] text-white font-semibold text-xs sm:text-sm py-3.5 px-4 rounded-xl text-center cursor-pointer border-none shadow-sm hover:shadow transition-all flex items-center justify-center gap-2"
                  >
                    <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" />
                    <span>Cover Note</span>
                  </button>

                  <Link
                    href={`/Policy_Holder/New_Claim?plate=${encodeURIComponent(selectedVehicleForModal.numberPlate)}`}
                    onClick={() => setSelectedVehicleForModal(null)}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs sm:text-sm py-3.5 px-4 rounded-xl text-center no-underline shadow-sm hover:shadow transition-all flex items-center justify-center gap-2"
                  >
                    <HugeiconsIcon icon={AlertCircleIcon} className="w-4 h-4" />
                    <span>File a Claim</span>
                  </Link>
                </div>

              {/* STEP 1: Unhidden Renew License Coverage Button - ONLY shows when quote is calculated and awaiting initial payment */}
              {renewalInfo?.hasCalculatedQuote &&
                renewalInfo?.renewalQuote?.status === "Calculated" &&
                (renewalInfo?.isWithin30Days || (renewalInfo?.daysRemaining !== null && renewalInfo?.daysRemaining <= 30)) && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setRenewalStep(1);
                      setRenewalWizardOpen(true);
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-4 rounded-full text-center cursor-pointer border-none shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <HugeiconsIcon icon={RefreshIcon} className="w-5 h-5 text-white" strokeWidth={2} />
                    Renew License Coverage
                  </button>
                </div>
              )}

              {/* Installment Reminder Card (if on active installment plan) */}
              {activeInstallmentInfo?.hasActivePlan && activeInstallmentInfo?.nextInstallment && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl p-4.5 shadow-xs select-none">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 flex-shrink-0 mt-0.5">
                          <HugeiconsIcon icon={Clock01Icon} className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full inline-block">
                              Active Installment Plan
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500">
                              ({activeInstallmentInfo.paidCount || 1} of {activeInstallmentInfo.totalCount || 4} Completed)
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm leading-tight">
                            {activeInstallmentInfo.nextInstallment.label || `Installment #${activeInstallmentInfo.nextInstallment.installmentNumber}`}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Due: <strong className="text-slate-800">{new Date(activeInstallmentInfo.nextInstallment.dueDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</strong> | Amount: <strong className="text-amber-700 font-extrabold">LKR {activeInstallmentInfo.nextInstallment.amount.toLocaleString()}</strong>
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleInitiateStripePayment(activeInstallmentInfo.renewal._id, activeInstallmentInfo.nextInstallment.installmentNumber)}
                        disabled={isRedirectingToStripe}
                        className="bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white font-bold text-xs px-5 py-3 rounded-full shadow-sm hover:shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap self-end sm:self-center"
                      >
                        <HugeiconsIcon icon={CreditCardIcon} className="w-4 h-4" />
                        {isRedirectingToStripe ? "Connecting..." : `Pay Installment #${activeInstallmentInfo.nextInstallment.installmentNumber}`}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Fully Paid Renewal Status Badge */}
              {(renewalInfo?.renewalQuote?.status === "Fully_Paid" || activeInstallmentInfo?.isFullyPaid) && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 flex-shrink-0">
                        <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full inline-block mb-0.5">
                          Policy Renewed
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm">Coverage Up to Date</h4>
                        <p className="text-xs text-slate-500">
                          Coverage active until {new Date(renewalInfo?.expiryDate || selectedVehicleForModal.policyExpiryDate || Date.now()).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 bg-white border border-emerald-200 px-3 py-1.5 rounded-full shadow-2xs">
                      Active
                    </span>
                  </div>
                </div>
              )}

              {/* PAYMENT SCHEDULE & TRANSACTION HISTORY */}
              {activeInstallmentInfo?.renewal?.installments && activeInstallmentInfo.renewal.installments.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4.5 select-none">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm tracking-tight flex items-center gap-1.5">
                          <HugeiconsIcon icon={Money01Icon} className="w-4 h-4 text-blue-600" />
                          Payment Schedule & History
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          Plan: {activeInstallmentInfo.renewal.selectedPlan || "Installment Plan"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Total Premium</span>
                        <strong className="text-xs font-bold text-slate-800">
                          LKR {activeInstallmentInfo.renewal.calculation?.totalRenewalAmount?.toLocaleString()}
                        </strong>
                      </div>
                    </div>

                    {/* Progress Summary Cards */}
                    <div className="grid grid-cols-3 gap-2 bg-white rounded-xl p-3 border border-slate-100 shadow-2xs mb-3 text-center">
                      <div className="border-r border-slate-100 pr-1">
                        <span className="text-slate-400 text-[10px] uppercase font-semibold block">Total Paid</span>
                        <strong className="font-bold text-emerald-600 text-xs">
                          LKR {activeInstallmentInfo.renewal.installments
                            .filter((i: any) => i.status === "Paid")
                            .reduce((sum: number, i: any) => sum + (i.amount || 0), 0)
                            .toLocaleString()}
                        </strong>
                      </div>
                      <div className="border-r border-slate-100 pr-1">
                        <span className="text-slate-400 text-[10px] uppercase font-semibold block">Remaining</span>
                        <strong className="font-bold text-slate-700 text-xs">
                          LKR {activeInstallmentInfo.renewal.installments
                            .filter((i: any) => i.status === "Pending")
                            .reduce((sum: number, i: any) => sum + (i.amount || 0), 0)
                            .toLocaleString()}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-semibold block">Progress</span>
                        <strong className="font-bold text-blue-600 text-xs">
                          {activeInstallmentInfo.paidCount || 1} of {activeInstallmentInfo.totalCount || activeInstallmentInfo.renewal.installments.length} Paid
                        </strong>
                      </div>
                    </div>

                    {/* List of installments */}
                    <div className="space-y-2">
                      {activeInstallmentInfo.renewal.installments.map((inst: any, idx: number) => {
                        const isPaid = inst.status === "Paid";
                        const isNext = !isPaid && activeInstallmentInfo.nextInstallment?.installmentNumber === inst.installmentNumber;

                        return (
                          <div
                            key={inst._id || idx}
                            className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all ${
                              isPaid
                                ? "bg-emerald-50/70 border-emerald-200/80"
                                : isNext
                                ? "bg-amber-50/70 border-amber-200/90 shadow-2xs"
                                : "bg-white border-slate-100 opacity-80"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                  isPaid
                                    ? "bg-emerald-600 text-white"
                                    : isNext
                                    ? "bg-amber-500 text-white"
                                    : "bg-slate-200 text-slate-600"
                                }`}
                              >
                                {isPaid ? "✓" : inst.installmentNumber}
                              </div>
                              <div>
                                <h5 className="font-semibold text-slate-800 text-[12.5px] leading-tight">
                                  {inst.label || `Installment #${inst.installmentNumber}`}
                                </h5>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {isPaid ? (
                                    <span className="text-emerald-700 font-medium">
                                      Paid on {new Date(inst.paidAt || Date.now()).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                                      {inst.stripeSessionId ? " • Stripe Verified" : ""}
                                    </span>
                                  ) : (
                                    <span>
                                      Due: <strong className="text-slate-700">{new Date(inst.dueDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</strong>
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className="text-right flex items-center gap-2.5">
                              <span className="font-bold text-slate-800 text-[12.5px]">
                                LKR {inst.amount.toLocaleString()}
                              </span>
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                  isPaid
                                    ? "bg-emerald-100 text-emerald-800"
                                    : isNext
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {isPaid ? "Paid" : isNext ? "Next Due" : "Scheduled"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 flex justify-end flex-shrink-0">
              <button
                onClick={() => setSelectedVehicleForModal(null)}
                className="bg-[#102A43] hover:bg-[#163e63] text-white font-semibold text-xs sm:text-sm px-6 py-2.5 rounded-xl transition-all border-none cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      );
    })()}

      {/* RENEWAL CHECKOUT WIZARD MODAL (Steps 1, 2, 3) */}
      {renewalWizardOpen && selectedVehicleForModal && renewalInfo?.renewalQuote && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-60 p-4 transition-all">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Wizard Header */}
            <div className="px-6 py-4.5 bg-gradient-to-r from-[#102A43] to-[#204060] text-white flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold">Policy Coverage Renewal</h3>
                <p className="text-xs text-blue-200">
                  {selectedVehicleForModal.company} {selectedVehicleForModal.model} ({formatNumberPlate(selectedVehicleForModal.numberPlate)})
                </p>
              </div>
              <button
                onClick={() => setRenewalWizardOpen(false)}
                className="text-white/70 hover:text-white text-2xl font-light w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
              >
                &times;
              </button>
            </div>

            {/* Wizard Steps Progress Bar */}
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200/80 flex items-center justify-between text-xs font-semibold">
              <div className={`flex items-center gap-1.5 ${renewalStep >= 1 ? "text-blue-600 font-bold" : "text-slate-400"}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${renewalStep >= 1 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}>1</span>
                <span>Quote Details</span>
              </div>
              <div className="h-0.5 flex-1 mx-3 bg-slate-200">
                <div className={`h-full bg-blue-600 transition-all ${renewalStep === 1 ? "w-0" : renewalStep === 2 ? "w-1/2" : "w-full"}`} />
              </div>
              <div className={`flex items-center gap-1.5 ${renewalStep >= 2 ? "text-blue-600 font-bold" : "text-slate-400"}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${renewalStep >= 2 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}>2</span>
                <span>Payment Mode</span>
              </div>
              <div className="h-0.5 flex-1 mx-3 bg-slate-200">
                <div className={`h-full bg-blue-600 transition-all ${renewalStep === 3 ? "w-full" : "w-0"}`} />
              </div>
              <div className={`flex items-center gap-1.5 ${renewalStep >= 3 ? "text-blue-600 font-bold" : "text-slate-400"}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${renewalStep === 3 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}>3</span>
                <span>Checkout</span>
              </div>
            </div>

            {/* Step Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">

              {/* STEP 1: Office Staff Calculated Renewal Breakdown */}
              {renewalStep === 1 && (
                <div className="space-y-4">
                  <div className="bg-blue-50/70 border border-blue-200/60 rounded-2xl p-4">
                    <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block mb-1">
                      Staff Assessment Completed
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">
                      Calculated by {renewalInfo.renewalQuote.calculatedBy?.staffName || "Branch Staff"} ({renewalInfo.renewalQuote.branch} Branch)
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      New Policy Period: <strong>1 Year Extension</strong>
                    </p>
                  </div>

                  {/* Itemized Calculation Sheet */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Vehicle Valuation:</span>
                      <span className="font-semibold text-slate-800">
                        LKR {renewalInfo.renewalQuote.calculation?.marketValuation?.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Basic Premium ({renewalInfo.renewalQuote.calculation?.basicPremiumRate}%):</span>
                      <span className="font-semibold text-slate-800">
                        LKR {renewalInfo.renewalQuote.calculation?.basicPremium?.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-emerald-600">
                      <span>No-Claim Bonus Discount ({renewalInfo.renewalQuote.calculation?.noClaimBonusDiscount}%):</span>
                      <span className="font-semibold">
                        - LKR {renewalInfo.renewalQuote.calculation?.discountAmount?.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Administrative Fee & Taxes:</span>
                      <span className="font-semibold text-slate-800">
                        + LKR {(renewalInfo.renewalQuote.calculation?.adminFee + (renewalInfo.renewalQuote.calculation?.govtTaxes || 0)).toLocaleString()}
                      </span>
                    </div>
                    <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-sm font-black text-[#102A43]">
                      <span>Total Renewal License Fee:</span>
                      <span className="text-lg text-emerald-600">
                        LKR {renewalInfo.renewalQuote.calculation?.totalRenewalAmount?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Select Payment Type (One-Time vs Installment) */}
              {renewalStep === 2 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-900">Choose Your Payment Preference:</h4>

                  {/* Option A: One-Time Full Payment */}
                  <label
                    onClick={() => setSelectedPlanType("One-Time")}
                    className={`block p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                      selectedPlanType === "One-Time"
                        ? "border-blue-600 bg-blue-50/50 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="planType"
                          checked={selectedPlanType === "One-Time"}
                          onChange={() => setSelectedPlanType("One-Time")}
                          className="w-4 h-4 text-blue-600"
                        />
                        <div>
                          <span className="font-bold text-sm text-slate-900 block">One-Time Full Payment</span>
                          <span className="text-xs text-slate-500">Pay the entire annual premium today</span>
                        </div>
                      </div>
                      <strong className="text-sm font-extrabold text-blue-700">
                        LKR {renewalInfo.renewalQuote.calculation?.totalRenewalAmount?.toLocaleString()}
                      </strong>
                    </div>
                  </label>

                  {/* Option B: 2-Part Installment */}
                  <label
                    onClick={() => setSelectedPlanType("2-Installments")}
                    className={`block p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                      selectedPlanType === "2-Installments"
                        ? "border-blue-600 bg-blue-50/50 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="planType"
                          checked={selectedPlanType === "2-Installments"}
                          onChange={() => setSelectedPlanType("2-Installments")}
                          className="w-4 h-4 text-blue-600"
                        />
                        <div>
                          <span className="font-bold text-sm text-slate-900 block">2 Semi-Annual Installments</span>
                          <span className="text-xs text-slate-500">50% upfront today + 50% in 6 months</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <strong className="text-sm font-extrabold text-blue-700 block">
                          LKR {Math.round(renewalInfo.renewalQuote.calculation?.totalRenewalAmount / 2).toLocaleString()}
                        </strong>
                        <span className="text-[10px] text-slate-400">per installment (x2)</span>
                      </div>
                    </div>
                  </label>

                  {/* Option C: 4-Part Quarterly Installment */}
                  <label
                    onClick={() => setSelectedPlanType("4-Installments")}
                    className={`block p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                      selectedPlanType === "4-Installments"
                        ? "border-blue-600 bg-blue-50/50 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="planType"
                          checked={selectedPlanType === "4-Installments"}
                          onChange={() => setSelectedPlanType("4-Installments")}
                          className="w-4 h-4 text-blue-600"
                        />
                        <div>
                          <span className="font-bold text-sm text-slate-900 block">4 Quarterly Installments</span>
                          <span className="text-xs text-slate-500">25% upfront today + 3 quarterly payments</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <strong className="text-sm font-extrabold text-blue-700 block">
                          LKR {Math.round(renewalInfo.renewalQuote.calculation?.totalRenewalAmount / 4).toLocaleString()}
                        </strong>
                        <span className="text-[10px] text-slate-400">per quarter (x4)</span>
                      </div>
                    </div>
                  </label>
                </div>
              )}

              {/* STEP 3: Checkout Page & Stripe Gateway Action */}
              {renewalStep === 3 && (
                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                      Checkout Summary
                    </span>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600">Selected Plan:</span>
                      <span className="font-bold text-slate-900">{selectedPlanType}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600">Total Renewal Fee:</span>
                      <span className="font-semibold text-slate-800">
                        LKR {renewalInfo.renewalQuote.calculation?.totalRenewalAmount?.toLocaleString()}
                      </span>
                    </div>

                    <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                      <div>
                        <span className="font-extrabold text-sm text-slate-900 block">Amount Due Today:</span>
                        <span className="text-[11px] text-slate-500">
                          {selectedPlanType === "One-Time" ? "Full annual premium" : "First installment (Initial activation)"}
                        </span>
                      </div>
                      <strong className="text-xl font-black text-blue-700">
                        LKR{" "}
                        {selectedPlanType === "One-Time"
                          ? renewalInfo.renewalQuote.calculation?.totalRenewalAmount?.toLocaleString()
                          : selectedPlanType === "2-Installments"
                          ? Math.round(renewalInfo.renewalQuote.calculation?.totalRenewalAmount / 2).toLocaleString()
                          : Math.round(renewalInfo.renewalQuote.calculation?.totalRenewalAmount / 4).toLocaleString()}
                      </strong>
                    </div>
                  </div>

                  {/* Payment Gateway Branding Card */}
                  <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-4 text-white flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-semibold text-blue-300 uppercase tracking-widest block">
                        Secure Payment Gateway
                      </span>
                      <h5 className="font-bold text-sm mt-0.5">Stripe 256-Bit SSL Encrypted</h5>
                      <span className="text-[11px] text-blue-200">Visa, Mastercard, Amex, Apple Pay</span>
                    </div>
                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-white">
                      <HugeiconsIcon icon={CreditCardIcon} className="w-6 h-6" />
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Wizard Navigation Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
              {renewalStep > 1 ? (
                <button
                  onClick={() => setRenewalStep((prev) => (prev - 1) as 1 | 2 | 3)}
                  className="px-5 py-2.5 rounded-full border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Back
                </button>
              ) : (
                <button
                  onClick={() => setRenewalWizardOpen(false)}
                  className="px-5 py-2.5 rounded-full border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
              )}

              {renewalStep < 3 ? (
                <button
                  onClick={() => setRenewalStep((prev) => (prev + 1) as 1 | 2 | 3)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-2.5 rounded-full shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  Next Step
                </button>
              ) : (
                <button
                  onClick={() => handleInitiateStripePayment(renewalInfo.renewalQuote._id, 1)}
                  disabled={isRedirectingToStripe}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold text-xs px-6 py-2.5 rounded-full shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
                >
                  {isRedirectingToStripe ? (
                    <>
                      <HugeiconsIcon icon={Loading03Icon} className="w-4 h-4 animate-spin" />
                      Redirecting to Stripe...
                    </>
                  ) : (
                    <>
                      <HugeiconsIcon icon={CreditCardIcon} className="w-4 h-4" />
                      Pay with Stripe Gateway
                    </>
                  )}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* PAYMENT SUCCESS CONFIRMATION MODAL (Step 4 update) */}
      {paymentSuccessModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-70 p-4 transition-all">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 text-center shadow-2xl border border-slate-200 space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-9 h-9" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Payment Successfully Completed!</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your Stripe transaction has been verified. The policy renewal for{" "}
              <strong>{paymentSuccessDetails?.plate}</strong> has been updated in branch records and your active coverage extended.
            </p>
            <button
              onClick={() => {
                setPaymentSuccessModal(false);
                if (paymentSuccessDetails?.plate) {
                  const matchingVehicle = vehicles.find(
                    (v) => v.numberPlate.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() === paymentSuccessDetails.plate.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
                  );
                  if (matchingVehicle) {
                    setSelectedVehicleForModal(matchingVehicle);
                  }
                  fetchRenewalData(paymentSuccessDetails.plate);
                }
              }}
              className="w-full bg-[#102A43] hover:bg-[#1C3E63] text-white font-bold text-xs py-3 rounded-full transition-all cursor-pointer"
            >
              View Updated Policy & Schedule
            </button>
          </div>
        </div>
      )}

      {/* OFFICIAL COVER NOTE / CERTIFICATE PREVIEW MODAL */}
      {coverNoteModalOpen && coverNoteVehicle && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-70 p-4 transition-all overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#102A43] to-[#1C3E63] text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[#1fcbf2]">
                  <HugeiconsIcon icon={SecurityCheckIcon} className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold leading-tight">Official Insurance Cover Note</h3>
                  <p className="text-[11px] text-blue-200">
                    Policy Certificate • {formatNumberPlate(coverNoteVehicle.numberPlate)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCoverNoteModalOpen(false)}
                className="text-white/70 hover:text-white text-2xl font-light w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Certificate Body (Printable container) */}
            <div id="sanasa-cover-note-printable" className="p-6 overflow-y-auto flex-1 space-y-5 bg-white select-none">
              
              {/* Certificate Letterhead Banner */}
              <div className="border-2 border-slate-900/10 rounded-2xl p-5 bg-gradient-to-b from-slate-50 to-white text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-700 via-[#1fcbf2] to-emerald-600" />
                <span className="text-[10px] tracking-widest font-black uppercase text-blue-900/70 block mb-1">
                  Democratic Socialist Republic of Sri Lanka
                </span>
                <h2 className="text-lg font-black text-[#102A43] tracking-tight uppercase">
                  SANASA GENERAL INSURANCE COMPANY LIMITED
                </h2>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Certificate of Motor Vehicle Insurance / Cover Note
                </p>
                <div className="flex items-center justify-center gap-4 mt-2 text-[11px] text-slate-500">
                  <span>Cert No: <strong className="text-slate-800">CN-{coverNoteVehicle.policyNumber}-{new Date().getFullYear()}</strong></span>
                  <span>•</span>
                  <span>Branch: <strong className="text-slate-800">{activeInstallmentInfo?.renewal?.branch || "Galle"} Branch</strong></span>
                </div>
              </div>

              {/* Vehicle & Policy Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold block">Policy Number</span>
                  <strong className="text-slate-800 font-bold">{coverNoteVehicle.policyNumber}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold block">Vehicle Number</span>
                  <strong className="text-slate-800 font-bold">{formatNumberPlate(coverNoteVehicle.numberPlate)}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold block">Make & Model</span>
                  <span className="text-slate-800 font-semibold">{coverNoteVehicle.company} {coverNoteVehicle.model} ({coverNoteVehicle.year})</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold block">Engine Number</span>
                  <span className="text-slate-700 font-mono text-[11px]">{coverNoteVehicle.engineNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold block">Chassis Number</span>
                  <span className="text-slate-700 font-mono text-[11px]">{coverNoteVehicle.chassisNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold block">Validity Period</span>
                  <strong className="text-emerald-700 font-semibold">
                    Until {new Date(renewalInfo?.expiryDate || coverNoteVehicle.policyExpiryDate || "2027-11-20").toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                  </strong>
                </div>
              </div>

              {/* Payment Summary */}
              {(() => {
                const noteData = generateCoverNoteContent(coverNoteVehicle);
                return (
                  <div className="space-y-4">
                    {/* Premium Breakdown Bar */}
                    <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase font-semibold block">Selected Payment Plan</span>
                        <strong className="text-slate-900 font-bold">{noteData.selectedPlan}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase font-semibold block">Total Policy Premium</span>
                        <strong className="text-slate-900 font-bold">LKR {noteData.totalAmount.toLocaleString()}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase font-semibold block">Amount Settled</span>
                        <strong className="text-emerald-700 font-extrabold">LKR {noteData.totalPaid.toLocaleString()}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase font-semibold block">Outstanding Balance</span>
                        <strong className="text-amber-700 font-extrabold">LKR {noteData.balanceDue.toLocaleString()}</strong>
                      </div>
                    </div>

                    {/* Last Paid Payment Record */}
                    {noteData.lastPaid && (
                      <div className="border border-emerald-200 bg-emerald-50/50 rounded-2xl p-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full inline-block mb-1.5">
                          Last Payment Received & Verified
                        </span>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div>
                            <h5 className="font-bold text-slate-900">
                              {noteData.lastPaid.label || `Installment #${noteData.lastPaid.installmentNumber}`}
                            </h5>
                            <p className="text-slate-500 text-[11px] mt-0.5">
                              Settled on: <strong className="text-slate-800">{new Date(noteData.lastPaid.paidAt || Date.now()).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</strong> • Stripe Ref: <code className="text-slate-600 font-mono text-[10px]">{noteData.lastPaid.stripeSessionId ? noteData.lastPaid.stripeSessionId.slice(0, 24) + "..." : "Confirmed"}</code>
                            </p>
                          </div>
                          <span className="text-emerald-700 font-black text-sm">
                            LKR {noteData.lastPaid.amount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Schedule of Future Payments */}
                    {noteData.pendingInstallments.length > 0 && (
                      <div className="border border-slate-200/80 rounded-2xl p-4 bg-slate-50/50">
                        <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2.5 flex items-center justify-between">
                          <span>Scheduled Future Payments</span>
                          <span className="text-slate-400 font-normal lowercase">({noteData.pendingInstallments.length} remaining)</span>
                        </h5>
                        <div className="space-y-1.5">
                          {noteData.pendingInstallments.map((inst: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-100 text-xs">
                              <div className="flex items-center gap-2">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${idx === 0 ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-600"}`}>
                                  {inst.installmentNumber}
                                </span>
                                <div>
                                  <span className="font-semibold text-slate-800 block leading-tight">{inst.label || `Installment #${inst.installmentNumber}`}</span>
                                  <span className="text-[10px] text-slate-500">
                                    Due Date: <strong>{new Date(inst.dueDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</strong>
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-slate-800 text-xs block">LKR {inst.amount.toLocaleString()}</span>
                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${idx === 0 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"}`}>
                                  {idx === 0 ? "Upcoming Due" : "Scheduled"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Authorized Sanasa Seal & Terms */}
              <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-[10px] text-slate-400">
                <p className="max-w-xs leading-relaxed">
                  This electronic Cover Note confirms active motor insurance coverage under Sanasa General Insurance Company Limited. Validity is contingent on prompt settlement of scheduled installments.
                </p>
                <div className="text-right sm:text-right flex flex-col items-end">
                  <div className="w-24 h-8 border-b border-slate-300 mb-1 flex items-center justify-center text-slate-400 font-serif italic text-xs">
                    Sanasa Auth
                  </div>
                  <strong className="text-slate-700 font-bold text-[11px]">Sanasa General Insurance Co. LTD</strong>
                  <span className="text-[10px] text-slate-400">Underwriting Department</span>
                </div>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
              <button
                onClick={() => setCoverNoteModalOpen(false)}
                className="px-5 py-2.5 rounded-full border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadCoverNote(coverNoteVehicle)}
                  className="px-4 py-2.5 rounded-full border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer flex items-center gap-1.5"
                >
                  <HugeiconsIcon icon={Download01Icon} className="w-4 h-4 text-slate-600" />
                  Download Note (.txt)
                </button>
                <button
                  onClick={() => {
                    const printableArea = document.getElementById("sanasa-cover-note-printable");
                    if (!printableArea) return;
                    const printWindow = window.open("", "_blank");
                    if (!printWindow) return;
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Sanasa_Cover_Note_${coverNoteVehicle.numberPlate}</title>
                          <style>
                            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; }
                            h2 { margin: 0; color: #102a43; }
                            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                            th, td { border: 1px solid #cbd5e1; padding: 8px 12px; font-size: 12px; text-align: left; }
                            th { background: #f1f5f9; font-weight: bold; }
                            .badge { font-weight: bold; color: #047857; }
                          </style>
                        </head>
                        <body>
                          ${printableArea.innerHTML}
                          <script>window.onload = function() { window.print(); }<\/script>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }}
                  className="bg-[#102A43] hover:bg-[#1C3E63] text-white font-bold text-xs px-5 py-2.5 rounded-full shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <HugeiconsIcon icon={SecurityCheckIcon} className="w-4 h-4 text-emerald-400" />
                  Print / Save PDF
                </button>
              </div>
            </div>

          </div>
        </div>
      )}


      {/* Add Vehicle Popup Modal */}
      {isAddVehicleOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white border border-slate-200 rounded-[32px] w-full max-w-[720px] max-h-[95vh] shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col relative overflow-hidden text-slate-800">
            
            {/* Modal Header */}
            <div className="px-10 pt-8 pb-4 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight leading-none">
                Add Vehicle
              </h2>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddVehicleSubmit} className="flex-1 flex flex-col overflow-hidden">
              
              {/* Form Content */}
              <div className="px-10 py-6 overflow-y-auto flex-1 flex flex-col gap-4">
                
                {validationError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 font-medium text-xs rounded-xl p-3 select-none">
                    {validationError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  {/* Vehicle Number */}
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-800 text-[13.5px] font-medium block mb-1">
                      Vehicle Number <span className="text-red-500 font-medium ml-0.5">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. WP-CBH-3202"
                      value={newNumberPlate}
                      onChange={(e) => setNewNumberPlate(e.target.value)}
                      className="w-full bg-slate-100/90 text-slate-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#00ddff] focus:bg-white transition-all border border-transparent font-normal"
                    />
                  </div>

                  {/* Vehicle Type select with dynamic preview */}
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-800 text-[13.5px] font-medium block mb-1">
                      Vehicle Type <span className="text-red-500 font-medium ml-0.5">*</span>
                    </label>
                    <div className="flex items-center gap-3">
                      {getVehicleIconContainer(newVehicleType, "w-12 h-12 rounded-xl")}
                      <select
                        value={newVehicleType}
                        onChange={(e) => setNewVehicleType(e.target.value)}
                        className="flex-1 bg-slate-100/90 text-slate-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#00ddff] focus:bg-white transition-all border border-transparent font-normal cursor-pointer"
                      >
                        <option value="Car">Car</option>
                        <option value="SUV">SUV</option>
                        <option value="Cab / Double Cab">Cab / Double Cab</option>
                        <option value="Van">Van</option>
                        <option value="Motorbike">Motorbike</option>
                        <option value="Three-Wheeler">Three-Wheeler</option>
                        <option value="Lorry / Truck">Lorry / Truck</option>
                        <option value="Bus">Bus</option>
                        <option value="Tractor">Tractor</option>
                      </select>
                    </div>
                  </div>

                  {/* Company input */}
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-800 text-[13.5px] font-medium block mb-1">
                      Company <span className="text-red-500 font-medium ml-0.5">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Toyota"
                      value={newCompany}
                      onChange={(e) => setNewCompany(e.target.value)}
                      className="w-full bg-slate-100/90 text-slate-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#00ddff] focus:bg-white transition-all border border-transparent font-normal"
                    />
                  </div>

                  {/* Model input */}
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-800 text-[13.5px] font-medium block mb-1">
                      Model <span className="text-red-500 font-medium ml-0.5">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Corolla"
                      value={newModel}
                      onChange={(e) => setNewModel(e.target.value)}
                      className="w-full bg-slate-100/90 text-slate-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#00ddff] focus:bg-white transition-all border border-transparent font-normal"
                    />
                  </div>

                  {/* Year input */}
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-800 text-[13.5px] font-medium block mb-1">
                      Year <span className="text-red-500 font-medium ml-0.5">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 2020"
                      value={newYear}
                      onChange={(e) => setNewYear(e.target.value)}
                      className="w-full bg-slate-100/90 text-slate-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#00ddff] focus:bg-white transition-all border border-transparent font-normal"
                    />
                  </div>

                  {/* Policy Number input */}
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-800 text-[13.5px] font-medium block mb-1">
                      Insurance Policy Number <span className="text-red-500 font-medium ml-0.5">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SAN12345"
                      value={newPolicyNumber}
                      onChange={(e) => setNewPolicyNumber(e.target.value)}
                      className="w-full bg-slate-100/90 text-slate-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#00ddff] focus:bg-white transition-all border border-transparent font-normal"
                    />
                  </div>

                  {/* Engine Number input */}
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-800 text-[13.5px] font-medium block mb-1">
                      Engine Number <span className="text-red-500 font-medium ml-0.5">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 1NZ-FE-xxxx"
                      value={newEngineNumber}
                      onChange={(e) => setNewEngineNumber(e.target.value)}
                      className="w-full bg-slate-100/90 text-slate-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#00ddff] focus:bg-white transition-all border border-transparent font-normal font-mono"
                    />
                  </div>

                  {/* Chassis Number input */}
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-800 text-[13.5px] font-medium block mb-1">
                      Chassis Number <span className="text-red-500 font-medium ml-0.5">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. NZE141-xxxx"
                      value={newChassisNumber}
                      onChange={(e) => setNewChassisNumber(e.target.value)}
                      className="w-full bg-slate-100/90 text-slate-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#00ddff] focus:bg-white transition-all border border-transparent font-normal font-mono"
                    />
                  </div>
                </div>

                {/* Important warning banner */}
                <div className="text-[11px] md:text-xs text-slate-600 font-normal flex items-start gap-1 mt-4 select-none">
                  <span className="text-yellow-500 mr-1 flex-shrink-0">⚠️</span>
                  <span>
                    <strong className="font-semibold text-slate-700">Important:</strong> Your vehicle will be reviewed by office staff before submit. This usually takes 1-2 business days. You&apos;ll receive an email once approved
                  </span>
                </div>

              </div>

              {/* Modal Footer actions */}
              <div className="px-10 pb-8 pt-4 bg-white flex justify-between gap-6 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddVehicleOpen(false)}
                  className="bg-[#19385a] hover:bg-[#11273f] text-white font-semibold text-sm py-4 px-10 rounded-full transition-all cursor-pointer border-none shadow-md flex items-center justify-center gap-1 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#19385a] hover:bg-[#11273f] disabled:bg-slate-300 text-white font-semibold text-sm py-4 px-12 rounded-full transition-all cursor-pointer border-none shadow-md flex items-center justify-center gap-1 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isSubmitting ? "Submitting..." : "Submit >"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Floating Chat Support Bubble */}
      <button
        className="fixed bottom-8 right-8 z-40 bg-[#00ddff] hover:bg-[#00c8e6] text-white p-5 rounded-full shadow-2xl transition-all duration-150 hover:scale-110 active:scale-95 cursor-pointer focus:outline-none border-none flex items-center justify-center"
        aria-label="Chat support"
      >
        <HugeiconsIcon icon={BubbleChatIcon} className="w-7 h-7 text-white" strokeWidth={2} />
      </button>

      {/* Registration Success Modal Popup */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white border border-slate-200 rounded-[28px] w-full max-w-[460px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col items-center text-center relative overflow-hidden">
            <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center text-[#f59e0b] mb-6 select-none">
              <HugeiconsIcon icon={Clock01Icon} className="w-8 h-8 text-[#f59e0b]" strokeWidth={2} />
            </div>
            
            <h3 className="font-bold text-slate-800 text-lg mb-3 tracking-tight select-none">
              Registration Under Review
            </h3>
            
            <p className="text-slate-500 text-sm font-normal leading-relaxed mb-6 px-2">
              Your vehicle details have been submitted successfully. The regional branch office staff will review and verify your policy information. 
              <br /><br />
              This process typically takes <strong className="text-slate-700 font-semibold">1-2 business days</strong>. You will be notified via email once approved.
            </p>
            
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full bg-[#19385a] hover:bg-[#11273f] text-white font-semibold text-sm py-4 rounded-full transition-all cursor-pointer border-none shadow-md flex items-center justify-center active:scale-[0.98] outline-none"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* Third-Party Driver Registration Modal Popup */}
      {thirdPartyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white border border-slate-200 rounded-[32px] w-full max-w-2xl max-h-[92vh] shadow-2xl flex flex-col relative overflow-hidden text-slate-800 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-8 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <HugeiconsIcon icon={UserAdd01Icon} className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#102A43]">Register Third-Party Driver</h3>
                  <p className="text-xs text-slate-500">
                    Authorize an external driver across your vehicles • Single fixed fee: <strong>LKR 300</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setThirdPartyModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors border-none bg-transparent cursor-pointer"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-8 overflow-y-auto flex-1 space-y-6">
              {/* Error Message */}
              {tpErrorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                  <HugeiconsIcon icon={AlertCircleIcon} className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{tpErrorMessage}</span>
                </div>
              )}

              {/* Step 1: Vehicle Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <HugeiconsIcon icon={Car01Icon} className="w-4 h-4 text-blue-600" />
                    <span>Select Covered Vehicles <span className="text-rose-500">*</span></span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (tpSelectedPlates.length === vehicles.length) {
                        setTpSelectedPlates([]);
                      } else {
                        setTpSelectedPlates(vehicles.map((v) => v.numberPlate));
                      }
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer border-none bg-transparent"
                  >
                    {tpSelectedPlates.length === vehicles.length ? "Deselect All" : "Select All"}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-40 overflow-y-auto p-1">
                  {vehicles.map((veh) => {
                    const isChecked = tpSelectedPlates.includes(veh.numberPlate);
                    return (
                      <div
                        key={veh.numberPlate}
                        onClick={() => {
                          if (isChecked) {
                            setTpSelectedPlates(tpSelectedPlates.filter((p) => p !== veh.numberPlate));
                          } else {
                            setTpSelectedPlates([...tpSelectedPlates, veh.numberPlate]);
                          }
                        }}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                          isChecked
                            ? "bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/10"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-mono font-bold text-xs text-slate-900">{formatNumberPlate(veh.numberPlate)}</div>
                          <div className="text-[11px] text-slate-500 truncate">{veh.company} {veh.model}</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer pointer-events-none"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Fixed Fee Banner */}
              <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                    LKR
                  </div>
                  <div>
                    <div className="text-xs font-bold text-indigo-950">Fixed Registration Fee</div>
                    <div className="text-[11px] text-indigo-700">Covers all {tpSelectedPlates.length} selected vehicle(s)</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-indigo-950 font-mono">LKR 300.00</div>
                  <div className="text-[10px] text-indigo-600">Single One-Time Fee</div>
                </div>
              </div>

              {/* Step 2: Driver Details */}
              <div className="space-y-3.5">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Driver Personal Details
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sunil Perera"
                      value={tpDriverName}
                      onChange={(e) => setTpDriverName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      NIC Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 199512345678 or 951234567V"
                      value={tpDriverNic}
                      onChange={(e) => setTpDriverNic(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-mono font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Contact Mobile <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 0771234567 or +94771234567"
                      value={tpDriverPhone}
                      onChange={(e) => setTpDriverPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-mono font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Residential Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. No. 45, Temple Road, Galle"
                      value={tpDriverAddress}
                      onChange={(e) => setTpDriverAddress(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: KYC Document Uploaders */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Driver Identity & Licence Documents (All 4 Required) <span className="text-rose-500">*</span>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "NIC Front", state: tpNicFront, setter: setTpNicFront, ref: tpNicFrontRef },
                    { label: "NIC Back", state: tpNicBack, setter: setTpNicBack, ref: tpNicBackRef },
                    { label: "Licence Front", state: tpDlFront, setter: setTpDlFront, ref: tpDlFrontRef },
                    { label: "Licence Back", state: tpDlBack, setter: setTpDlBack, ref: tpDlBackRef }
                  ].map((doc, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center flex flex-col justify-between"
                    >
                      <span className="text-xs font-semibold text-slate-700 mb-2 block">{doc.label}</span>

                      {doc.state ? (
                        <div className="relative h-24 rounded-xl overflow-hidden border border-slate-200 group">
                          <img src={doc.state} alt={doc.label} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => doc.setter("")}
                            className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-none"
                            title="Remove image"
                          >
                            <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => doc.ref.current?.click()}
                          className="h-24 rounded-xl border border-dashed border-slate-300 hover:border-indigo-400 bg-white flex flex-col items-center justify-center cursor-pointer transition-colors"
                        >
                          <HugeiconsIcon icon={Upload01Icon} className="w-5 h-5 text-slate-400 mb-1" />
                          <span className="text-[11px] text-slate-500 font-medium">Upload Photo</span>
                        </div>
                      )}

                      <input
                        type="file"
                        ref={doc.ref}
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, doc.setter)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4 flex-shrink-0">
              <button
                type="button"
                onClick={() => setThirdPartyModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer bg-white"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmitThirdParty}
                disabled={submittingThirdParty}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer border-none"
              >
                <HugeiconsIcon icon={CreditCardIcon} className="w-4 h-4" />
                <span>{submittingThirdParty ? "Connecting to Stripe..." : "Pay LKR 300 via Stripe"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terminate Driver Modal */}
      {terminateTargetReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[28px] shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 my-8">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-rose-600 to-rose-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <HugeiconsIcon icon={Cancel01Icon} className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Terminate Driver Authorization</h3>
                  <p className="text-xs text-rose-100">Send revocation request to your Sanasa Branch</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTerminateTargetReq(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors border-none bg-transparent cursor-pointer"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Driver Summary Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center flex-shrink-0">
                  <HugeiconsIcon icon={UserCheck01Icon} className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-800 text-sm">
                    {terminateTargetReq.driverDetails?.fullName}
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    NIC: {terminateTargetReq.driverDetails?.nicNumber || "—"} • Tel:{" "}
                    {terminateTargetReq.driverDetails?.phoneNumber}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-1 flex flex-wrap gap-1">
                    <span className="font-semibold text-slate-400">Covered:</span>
                    {terminateTargetReq.selectedVehicles?.map((v: any) => (
                      <span key={v.numberPlate} className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        {v.numberPlate}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Security Notice */}
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
                <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Official Branch Sign-Off Required:</span>
                  <p className="mt-0.5 text-amber-800 text-[11px] leading-relaxed">
                    Once submitted, your request is forwarded to your branch office. Upon branch officer approval, this driver’s NFC digital pass, vehicle portal, and mobile app access will be permanently revoked.
                  </p>
                </div>
              </div>

              {/* Termination Reason Options */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Select Reason for Termination
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    "Driver resigned / employment ended",
                    "Vehicle sold or transferred",
                    "Driver misconduct / policy breach",
                    "Owner revocation / no longer permitted",
                    "Temporary contract concluded",
                    "Other reason"
                  ].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setTerminateReason(r)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer ${
                        terminateReason === r
                          ? "bg-rose-50 border-rose-400 text-rose-900 font-bold shadow-xs"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom reason input */}
              {terminateReason === "Other reason" && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Please Specify Reason <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={customTerminateReason}
                    onChange={(e) => setCustomTerminateReason(e.target.value)}
                    placeholder="Provide details about why this authorization is being terminated..."
                    className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
              )}

              {/* Error / Success Feedback */}
              {terminateErrMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
                  <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4 flex-shrink-0" />
                  <span>{terminateErrMsg}</span>
                </div>
              )}
              {terminateSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4 flex-shrink-0" />
                  <span>{terminateSuccessMsg}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setTerminateTargetReq(null)}
                disabled={terminating}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer bg-white"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmitTermination}
                disabled={terminating || !!terminateSuccessMsg}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer border-none"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />
                <span>{terminating ? "Submitting Request..." : "Submit Termination Request"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MANAGE ASSIGNED DRIVER MODAL ── */}
      {selectedDriverForManage && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-[32px] w-full max-w-xl max-h-[92vh] shadow-[0_24px_60px_rgba(15,42,67,0.18)] flex flex-col relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center flex-shrink-0">
                  <HugeiconsIcon icon={UserCheck01Icon} className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight leading-snug">
                    Authorized Driver Details
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Reference: {selectedDriverForManage.requestReference}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDriverForManage(null)}
                className="w-9 h-9 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors text-2xl font-normal border-none bg-transparent cursor-pointer outline-none"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Status Banner */}
              {selectedDriverForManage.status === "Approved" ? (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-900 leading-tight">
                        Official Branch Authorization Active
                      </h4>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        This driver is authorized to operate the assigned vehicles under your active policy.
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300/80 px-2.5 py-1 rounded-full whitespace-nowrap">
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-3.5 h-3.5 text-emerald-700" />
                    Pass Active
                  </span>
                </div>
              ) : selectedDriverForManage.status === "Pending Termination Approval" ? (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-900">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span>Termination Request Pending Branch Approval</span>
                  </div>
                  <p className="text-[11px] text-rose-700 leading-relaxed">
                    Reason: {selectedDriverForManage.terminationRequest?.reason || "Policyholder termination request"}
                  </p>
                </div>
              ) : (
                <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-2xl">
                  <span className="text-xs font-bold text-slate-800">
                    Status: {selectedDriverForManage.status}
                  </span>
                </div>
              )}

              {/* Driver Profile Card */}
              <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4.5 space-y-3.5">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-200/70">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-bold text-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                    {selectedDriverForManage.driverDetails?.fullName?.charAt(0)?.toUpperCase() || "D"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-base font-bold text-slate-900 truncate">
                      {selectedDriverForManage.driverDetails?.fullName}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Approved: {selectedDriverForManage.branchReview?.approvalDate ? new Date(selectedDriverForManage.branchReview.approvalDate).toLocaleDateString() : new Date(selectedDriverForManage.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
                      National Identity Card (NIC)
                    </span>
                    <span className="font-mono font-bold text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200/80 inline-block">
                      {selectedDriverForManage.driverDetails?.nicNumber || "—"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
                      Mobile Phone Number
                    </span>
                    <span className="font-mono font-semibold text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200/80 inline-block">
                      {selectedDriverForManage.driverDetails?.phoneNumber || "—"}
                    </span>
                  </div>

                  <div className="sm:col-span-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
                      Residential Address
                    </span>
                    <p className="font-medium text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200/80 text-xs">
                      {selectedDriverForManage.driverDetails?.residentialAddress || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Permitted Vehicles */}
              <div>
                <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Authorized Covered Vehicles ({selectedDriverForManage.selectedVehicles?.length || 0})
                </span>
                <div className="flex flex-wrap gap-2">
                  {selectedDriverForManage.selectedVehicles?.map((v: any) => (
                    <div
                      key={v.numberPlate}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-xl border border-slate-200 font-mono font-bold text-xs shadow-2xs"
                    >
                      <span className="text-[9.5px] font-bold text-slate-400 font-sans tracking-tight">LK</span>
                      <span className="w-px h-3 bg-slate-300" />
                      <span>{v.numberPlate}</span>
                      {v.model && (
                        <span className="text-slate-500 font-sans font-normal text-[11px]">
                          ({v.company} {v.model})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Driver Access Link Box */}
              {selectedDriverForManage.secureAccess?.verificationToken && (
                <div className="p-3.5 bg-sky-50/70 border border-sky-200/80 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-sky-800">
                      Driver Digital Pass Link
                    </span>
                    <span className="text-[10px] font-semibold text-sky-600">Web & Mobile Pass</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${typeof window !== "undefined" ? window.location.origin : ""}/driver-access/${selectedDriverForManage.secureAccess.verificationToken}`}
                      className="flex-1 bg-white border border-sky-200 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-600 outline-none select-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${window.location.origin}/driver-access/${selectedDriverForManage.secureAccess.verificationToken}`;
                        navigator.clipboard.writeText(url);
                        setCopiedPassLink(true);
                        setTimeout(() => setCopiedPassLink(false), 2500);
                      }}
                      className="px-3 py-1.5 bg-[#102A43] hover:bg-[#163e63] text-white font-semibold text-xs rounded-xl transition-all cursor-pointer border-none shadow-2xs whitespace-nowrap"
                    >
                      {copiedPassLink ? "Copied!" : "Copy Link"}
                    </button>
                  </div>
                </div>
              )}

              {/* Termination Action Card */}
              {selectedDriverForManage.status === "Approved" && (
                <div className="p-4 bg-rose-50/70 border border-rose-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                  <div className="space-y-0.5">
                    <h5 className="font-bold text-rose-950 text-xs sm:text-sm">
                      Terminate Driver Authorization
                    </h5>
                    <p className="text-[11px] text-rose-700 leading-relaxed max-w-sm">
                      Request official removal of this driver. Branch approval is required before access is revoked.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const req = selectedDriverForManage;
                      setSelectedDriverForManage(null);
                      handleOpenTerminateModal(req);
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer border-none whitespace-nowrap self-start sm:self-auto"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" />
                    <span>Terminate Driver</span>
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => setSelectedDriverForManage(null)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300/80 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer border-none"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <PolicyHolderFooter />
    </div>
  );
}
