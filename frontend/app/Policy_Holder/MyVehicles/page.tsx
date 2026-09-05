"use client";

import React, { useState, useEffect } from "react";
import PolicyHolderNavbar from "@/app/Components/Policy_Holder/Navbar";
import PolicyHolderFooter from "@/app/Components/Policy_Holder/footer";
import Link from "next/link";
import { API_URL } from "@/app/config";

interface Vehicle {
  numberPlate: string;
  vehicleType: string;
  year: string;
  company: string;
  model: string;
  engineNumber: string;
  chassisNumber: string;
  policyNumber: string;
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

import { getVehicleIconSvg, getVehicleIconContainer, getVehicleTheme } from "@/app/Components/VehicleIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Car01Icon, SecurityCheckIcon, Search01Icon, Alert02Icon, ViewIcon, Add01Icon, AlertCircleIcon, Download01Icon, BubbleChatIcon, Clock01Icon, Loading03Icon, RefreshIcon } from "@hugeicons/core-free-icons";

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
      setValidationError("Number Plate must be an alphanumeric mix between 5 and 10 characters.");
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


  // 1. Fetch vehicles list from Database (with real-time polling for branch approvals)
  useEffect(() => {
    let intervalId: any;
    if (typeof window !== "undefined") {
      const userStr = sessionStorage.getItem("logged_in_user");
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.nic) {
            const fetchVehicles = async (showLoading = false) => {
              if (showLoading) setIsLoading(true);
              try {
                const res = await fetch(`${API_URL}/policy-holder/vehicles?nic=${encodeURIComponent(user.nic)}`, {
                  cache: "no-store"
                });
                if (res.ok) {
                  const data = await res.json();
                  if (Array.isArray(data.vehicles)) {
                    setVehicles(data.vehicles);
                    const updatedUser = { ...user, vehicles: data.vehicles };
                    sessionStorage.setItem("logged_in_user", JSON.stringify(updatedUser));
                  }
                }
              } catch (err) {
                console.error("Error fetching vehicles:", err);
              } finally {
                if (showLoading) setIsLoading(false);
              }
            };

            // Run immediately with loading indicator
            fetchVehicles(true);

            // Poll every 5 seconds silently
            intervalId = setInterval(() => fetchVehicles(false), 5000);
          }
        } catch (e) {
          console.error(e);
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
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

  // 3. Disable body scroll when modal is active
  useEffect(() => {
    if (selectedVehicleForModal || isAddVehicleOpen || showSuccessModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedVehicleForModal, isAddVehicleOpen, showSuccessModal]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleDownloadCoverNote = (vehicle: Vehicle) => {
    triggerToast(`Generating insurance certificate for ${formatNumberPlate(vehicle.numberPlate)}...`);
    setTimeout(() => {
      const element = document.createElement("a");
      const file = new Blob([
        `SANASA GENERAL INSURANCE COMPANY LIMITED\n`,
        `POLICY CERTIFICATE / COVER NOTE\n`,
        `========================================\n`,
        `Policy Number: ${vehicle.policyNumber}\n`,
        `Vehicle Number Plate: ${formatNumberPlate(vehicle.numberPlate)}\n`,
        `Vehicle Type: ${vehicle.vehicleType}\n`,
        `Make & Model: ${vehicle.company} ${vehicle.model} (${vehicle.year})\n`,
        `Engine Number: ${vehicle.engineNumber}\n`,
        `Chassis Number: ${vehicle.chassisNumber}\n`,
        `Coverage Status: ACTIVE\n`,
        `Validity Period: 2026-01-01 to 2026-12-31\n`,
        `Authorized Signature: Sanasa General Insurance Co. LTD.`
      ], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = `Sanasa_Policy_${vehicle.numberPlate}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      triggerToast(`Successfully downloaded Cover Note for ${formatNumberPlate(vehicle.numberPlate)}!`);
    }, 1200);
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

      {/* Styled curved header with premium background gradient */}
      <div className="max-w-7xl w-full mx-auto px-6 md:px-16 mt-8 relative">
        {/* Absolute positioned background banner spanning to left edge of screen */}
        <div className="absolute top-0 bottom-0 left-[calc(50%-50vw)] right-6 md:right-12 bg-[url('/policy1.jpg')] bg-cover bg-center rounded-r-[75px] md:rounded-r-[95px] overflow-hidden shadow-md">
          {/* Dark slate/teal gradient overlay */}
          <div className="absolute inset-0 bg-slate-950/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent" />
        </div>

        {/* Text content aligned automatically with the page container */}
        <header className="relative z-10 h-[210px] flex flex-col justify-center pl-4 md:pl-8 select-none">
          <h1 className="text-white text-3xl md:text-[40px] font-bold tracking-tight leading-none">
            {t.title}
          </h1>
          <p className="text-slate-200 text-xs md:text-sm font-normal mt-3.5 tracking-wide opacity-95">
            {t.subtitle}
          </p>
        </header>
      </div>

      {/* Main Grid Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 md:px-16 py-10 relative z-20">
        
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-20 right-8 z-50 bg-[#00ddff] text-black font-semibold px-6 py-5 rounded-2xl shadow-xl animate-bounce flex items-center gap-3 border-2 border-black">
            <HugeiconsIcon icon={RefreshIcon} className="w-6 h-6 animate-spin" strokeWidth={2.5} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Dynamic Stat Summary Section */}
        <section className="-mt-14 grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
          {/* Total Vehicles Card */}
          <div className="bg-white px-6 py-5 rounded-[22px] border border-slate-100 shadow-[0_12px_32px_rgba(0,0,0,0.04)] flex items-center gap-5">
            <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center text-cyan-600 flex-shrink-0">
              <HugeiconsIcon icon={Car01Icon} className="w-7 h-7" strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-800 leading-none">{vehicles.length}</h3>
              <p className="text-slate-400 font-medium text-xs uppercase tracking-wider mt-1">{t.totalInsured}</p>
            </div>
          </div>

          {/* Active Policies Card */}
          <div className="bg-white px-6 py-5 rounded-[22px] border border-slate-100 shadow-[0_12px_32px_rgba(0,0,0,0.04)] flex items-center gap-5">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 flex-shrink-0">
              <HugeiconsIcon icon={SecurityCheckIcon} className="w-7 h-7" strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-800 leading-none">
                {vehicles.filter(v => v.policyNumber).length}
              </h3>
              <p className="text-slate-400 font-medium text-xs uppercase tracking-wider mt-1">{t.activePolicies}</p>
            </div>
          </div>
        </section>

        {/* Filtering & Search Controls Panel */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8 bg-white border border-slate-200/80 p-5 rounded-[26px] shadow-sm select-none">
          {/* Real-time Category Selector tabs */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-5 py-3 rounded-full font-medium text-[13px] md:text-sm tracking-wide transition-all outline-none border cursor-pointer select-none ${
                  activeCategory === cat.id
                    ? "bg-[#00ddff] border-[#00c8e6] text-black shadow-sm font-semibold"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search bar matching design guidelines */}
          <div className="relative w-full md:max-w-[300px]">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <HugeiconsIcon icon={Search01Icon} className="w-5 h-5" strokeWidth={2} />
            </span>
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-800 rounded-full py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#00ddff] transition-all border border-slate-200 font-normal"
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

        {/* Vehicles Display Grid */}
        {isLoading ? (
          <div className="text-center py-20 bg-white border border-slate-200 rounded-[30px] p-8 shadow-sm flex flex-col items-center justify-center">
            <HugeiconsIcon icon={Loading03Icon} className="w-12 h-12 text-[#00ddff] animate-spin mb-4" strokeWidth={2} />
            <p className="text-slate-500 font-medium text-base">{t.retrieving}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* If no vehicles match the criteria, show a helpful inner-grid card */}
            {filteredVehicles.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-[30px] p-7 shadow-sm flex flex-col justify-center items-center text-center min-h-[280px]">
                <div className="w-16 h-16 bg-slate-50 border border-slate-200/50 rounded-2xl flex items-center justify-center text-slate-400 mb-4">
                  <HugeiconsIcon icon={Alert02Icon} className="w-8 h-8" strokeWidth={1.8} />
                </div>
                <h4 className="text-slate-800 font-semibold text-base mb-1">
                  {t.noVehiclesFound}
                </h4>
                <p className="text-slate-400 font-normal text-xs max-w-[240px] leading-relaxed mb-4">
                  {searchQuery ? `${t.searchNoMatch} "${searchQuery}".` : t.noCategoryVehiclesFound}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="bg-[#000080] hover:bg-[#000066] text-white font-medium text-xs px-4 py-2 rounded-full transition-all cursor-pointer border-none"
                  >
                    {t.clearSearch}
                  </button>
                )}
              </div>
            )}

            {filteredVehicles.map((vehicle) => {
              return (
                <div
                  key={vehicle.numberPlate}
                  className="bg-white border border-slate-200 rounded-[30px] p-7 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between relative overflow-hidden group hover:-translate-y-1"
                >
                  {/* Decorative faint background accent */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-[100px] pointer-events-none group-hover:bg-cyan-50/50 transition-colors" />

                  <div>
                    {/* Header Row: Icon + Plate Number & Status */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-4">
                        {getVehicleIconContainer(vehicle.vehicleType)}
                        <div>
                          <h3 className="text-slate-800 font-bold text-lg md:text-xl tracking-tight leading-none">
                            {formatNumberPlate(vehicle.numberPlate)}
                          </h3>
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-500 bg-emerald-50/70 border border-emerald-100 rounded-full px-3 py-1 mt-1.5 select-none">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>{t.activeCoverage}</span>
                          </span>
                        </div>
                      </div>

                      {/* Category & Year Pill */}
                      <div className="flex flex-col items-end gap-1.5 self-start">
                        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${getVehicleTheme(vehicle.vehicleType).badge} select-none`}>
                          {vehicle.vehicleType}
                        </span>
                        <span className="text-slate-400 font-medium text-[11px] bg-slate-100/80 border border-slate-200/60 rounded-full px-2.5 py-0.5 select-none">
                          {vehicle.year}
                        </span>
                      </div>
                    </div>

                    {/* Technical details rows */}
                    <div className="flex flex-col gap-3.5 border-t border-slate-100 pt-4.5">
                      <div className="flex justify-between items-center text-sm font-normal">
                        <span className="text-slate-400">{t.makeModel}</span>
                        <span className="text-slate-800 font-semibold">{vehicle.company} {vehicle.model}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-normal">
                        <span className="text-slate-400">{t.policyNum}</span>
                        <span className="text-slate-800 font-semibold tracking-wide">{vehicle.policyNumber || "N/A"}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-normal">
                        <span className="text-slate-400">{t.vehicleType}</span>
                        <span className="text-slate-800 font-semibold">{vehicle.vehicleType}</span>
                      </div>
                    </div>
                  </div>

                  {/* View Details CTA Button */}
                  <div className="mt-6 pt-4.5 border-t border-slate-100 flex-shrink-0">
                    <button
                      onClick={() => setSelectedVehicleForModal(vehicle)}
                      className="w-full bg-[#00ddff] hover:bg-[#00c8e6] text-black font-semibold text-xs md:text-sm py-3 rounded-full text-center transition-all flex items-center justify-center gap-2 cursor-pointer border-none shadow-sm hover:scale-[1.02] active:scale-[0.98] outline-none"
                    >
                      <HugeiconsIcon icon={ViewIcon} className="w-5 h-5 text-black" strokeWidth={2} />
                      {t.viewDetails}
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Dashed Add Vehicle Card in the Grid */}
            <button
              onClick={handleOpenAddVehicle}
              className="bg-transparent border-2 border-dashed border-slate-300 hover:border-[#00ddff] hover:bg-slate-50/50 rounded-[30px] p-7 min-h-[280px] flex flex-col items-center justify-center gap-4 transition-all duration-300 group cursor-pointer w-full text-slate-800"
            >
              <div className="w-16 h-16 rounded-full bg-slate-100 group-hover:bg-cyan-50 flex items-center justify-center text-slate-400 group-hover:text-[#00ddff] transition-all">
                <HugeiconsIcon icon={Add01Icon} className="w-8 h-8" strokeWidth={2} />
              </div>
              <div className="text-center select-none">
                <h4 className="text-slate-700 font-semibold text-base mb-1 group-hover:text-[#0f2d3a] transition-all">
                  {t.addVehicle}
                </h4>
                <p className="text-slate-400 font-normal text-xs max-w-[220px] leading-relaxed">{t.registerDesc}</p>
              </div>
            </button>
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

      {/* Vehicle Detail Popup Modal */}
      {selectedVehicleForModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white border border-slate-200 rounded-[28px] w-full max-w-[620px] max-h-[90vh] shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col relative overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-8 pt-6 pb-4 border-b border-slate-200 flex-shrink-0">
              <h2 className="text-[20px] md:text-[22px] font-bold text-[#0f2d3a] tracking-tight leading-none">
                Vehicle Specifications
              </h2>
              <button
                onClick={() => setSelectedVehicleForModal(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-normal border-none bg-transparent cursor-pointer outline-none"
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-8 flex-1 overflow-y-auto">
              
              {/* Profile Card Header inside modal */}
              <div className="bg-slate-50 border border-slate-200/60 rounded-[22px] p-5 mb-6 flex items-center gap-4.5 shadow-sm select-none">
                {getVehicleIconContainer(selectedVehicleForModal.vehicleType)}
                <div>
                  <h3 className="text-[#0f2d3a] font-bold text-xl leading-none tracking-tight">
                    {selectedVehicleForModal.company} {selectedVehicleForModal.model}
                  </h3>
                  <p className="text-slate-400 font-medium text-xs mt-1.5">
                    Year: {selectedVehicleForModal.year} | Type: {selectedVehicleForModal.vehicleType}
                  </p>
                </div>
              </div>

              {/* 2-Column Specs Layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4 text-sm font-normal text-slate-700 mb-8 px-2">
                <div className="flex flex-col gap-1 border-b border-slate-100 pb-2">
                  <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Number Plate</span>
                  <span className="font-semibold text-slate-800 text-base">{formatNumberPlate(selectedVehicleForModal.numberPlate)}</span>
                </div>
                <div className="flex flex-col gap-1 border-b border-slate-100 pb-2">
                  <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Policy Number</span>
                  <span className="font-semibold text-slate-800 text-base tracking-wide">{selectedVehicleForModal.policyNumber || "N/A"}</span>
                </div>
                <div className="flex flex-col gap-1 border-b border-slate-100 pb-2">
                  <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Engine Number</span>
                  <span className="font-normal text-slate-800 font-mono text-[13px]">{selectedVehicleForModal.engineNumber || "N/A"}</span>
                </div>
                <div className="flex flex-col gap-1 border-b border-slate-100 pb-2">
                  <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Chassis Number</span>
                  <span className="font-normal text-slate-800 font-mono text-[13px]">{selectedVehicleForModal.chassisNumber || "N/A"}</span>
                </div>
                <div className="flex flex-col gap-1 border-b border-slate-100 pb-2">
                  <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Insurance Coverage</span>
                  <span className="font-semibold text-emerald-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    Active Coverage
                  </span>
                </div>
                <div className="flex flex-col gap-1 border-b border-slate-100 pb-2">
                  <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Renewal Cycle</span>
                  <span className="font-semibold text-slate-800">Annual (Jan 01 - Dec 31)</span>
                </div>
                <div className="flex flex-col gap-1 border-b border-slate-100 pb-2 sm:col-span-2">
                  <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Insurance Plan Type</span>
                  <span className="font-semibold text-slate-800">Comprehensive Vehicle Insurance Plan</span>
                </div>
              </div>

              {/* Action Buttons in Modal */}
              <div className="flex gap-4 border-t border-slate-100 pt-6">
                <Link
                  href={`/Policy_Holder/New_Claim?plate=${encodeURIComponent(selectedVehicleForModal.numberPlate)}`}
                  onClick={() => setSelectedVehicleForModal(null)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm py-4 rounded-full text-center no-underline shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                >
                  <HugeiconsIcon icon={AlertCircleIcon} className="w-5 h-5" strokeWidth={2} />
                  File a Claim
                </Link>
                <button
                  onClick={() => handleDownloadCoverNote(selectedVehicleForModal)}
                  className="flex-1 bg-[#1fcbf2] hover:bg-[#00b2d6] text-white font-semibold text-sm py-4 rounded-full text-center cursor-pointer border-none shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                >
                  <HugeiconsIcon icon={Download01Icon} className="w-5 h-5" strokeWidth={2} />
                  Cover Note
                </button>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 flex justify-end flex-shrink-0">
              <button
                onClick={() => setSelectedVehicleForModal(null)}
                className="bg-[#000080] hover:bg-[#000066] text-white font-semibold text-[14px] px-8 py-3 rounded-full transition-all border-none cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
              >
                Close
              </button>
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
                  {/* Number Plate */}
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-800 text-[13.5px] font-medium block mb-1">
                      Number Plate <span className="text-red-500 font-medium ml-0.5">*</span>
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

      <PolicyHolderFooter />
    </div>
  );
}
