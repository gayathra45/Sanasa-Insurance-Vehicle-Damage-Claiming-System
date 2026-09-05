"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/Components/Homepage/Navbar";
import LoginFooter from "@/app/Components/Login/Footer";
import { API_URL } from "@/app/config";
import { sriLankaBanks } from "../utils/banks";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  UserIcon,
  Call02Icon,
  Calendar01Icon,
  ArrowDown01Icon,
  ViewIcon,
  ViewOffSlashIcon,
  BankIcon,
} from "@hugeicons/core-free-icons";

// Province and Cities Sri Lanka Data
const provincesData = [
  { id: "western", name: "Western Province", cities: ["Colombo", "Gampaha", "Kalutara", "Negombo", "Dehiwala-Mount Lavinia", "Kaduwela", "Moratuwa"] },
  { id: "central", name: "Central Province", cities: ["Kandy", "Matale", "Nuwara Eliya", "Gampola", "Nawalapitiya", "Dambulla"] },
  { id: "southern", name: "Southern Province", cities: ["Galle", "Matara", "Hambantota", "Hikkaduwa", "Ambalangoda", "Tangalle"] },
  { id: "northern", name: "Northern Province", cities: ["Jaffna", "Vavuniya", "Mannar", "Kilinochchi", "Mullaitivu", "Point Pedro"] },
  { id: "eastern", name: "Eastern Province", cities: ["Trincomalee", "Batticaloa", "Ampara", "Kalmunai", "Samanthurai"] },
  { id: "north-western", name: "North Western Province", cities: ["Kurunegala", "Chilaw", "Puttalam", "Kuliyapitiya", "Wariyapola"] },
  { id: "north-central", name: "North Central Province", cities: ["Anuradhapura", "Polonnaruwa", "Medawachchiya", "Kekirawa"] },
  { id: "uva", name: "Uva Province", cities: ["Badulla", "Bandarawela", "Monaragala", "Welimada", "Mahiyanganaya"] },
  { id: "sabaragamuwa", name: "Sabaragamuwa Province", cities: ["Ratnapura", "Kegalle", "Balangoda", "Mawanella", "Embilipitiya"] }
];

const translations = {
  en: {
    createAccount: "Create an Account",
    descHint: "Follow the steps to register your account with Sanasa General Insurance.",
    stepIndicator: "STEP 01 OF 04",
    personalDetails: "Personal Details",
    firstName: "First Name *",
    lastName: "Last Name *",
    nicNum: "NIC Number *",
    mobileNum: "Mobile Number *",
    emailAddr: "Email Address *",
    dob: "Date of Birth *",
    resAddress: "Residential Address *",
    province: "Province *",
    selectProvince: "Select Province",
    city: "City *",
    selectCity: "Select City",
    password: "Password *",
    confirmPassword: "Confirm Password *",
    bankTitle: "Bank Details (For Payouts)",
    bankName: "Bank Name *",
    selectBank: "Select Bank",
    branchName: "Branch Name *",
    selectBranch: "Select Branch",
    accountNum: "Account Number *",
    accountHolder: "Account Holder Name *",
    backBtn: "Back to Login",
    nextBtn: "Next",
    fillAll: "Please fill out all required fields marked with *",
    fillBank: "Please fill out all required bank details fields.",
    nicAlert: "Please enter a valid NIC (10-12 characters/digits).",
    mobileAlert: "Mobile number must be exactly 10 digits.",
    emailAlert: "Please enter a valid email address.",
    passLength: "Password must be between 6 and 12 characters.",
    passChar: "Password must contain at least one number or special character.",
    passMatch: "Passwords do not match!",
    verifyFail: "Failed to verify credentials with the database.",
    emailExist: "This email address is already registered.",
    nicExist: "This NIC number is already registered.",
    connError: "Could not connect to verification server. Please try again."
  },
  si: {
    createAccount: "ගිණුමක් සාදන්න",
    descHint: "සනස සාමාන්‍ය රක්ෂණය සමඟ ඔබේ ගිණුම ලියාපදිංචි කිරීමට පියවර අනුගමනය කරන්න.",
    stepIndicator: "පියවර 04 න් 01 වන පියවර",
    personalDetails: "පුද්ගලික විස්තර",
    firstName: "පළමු නම *",
    lastName: "වාසගම *",
    nicNum: "ජාතික හැඳුනුම්පත් අංකය *",
    mobileNum: "ජංගම දුරකථන අංකය *",
    emailAddr: "විද්‍යුත් තැපැල් ලිපිනය *",
    dob: "උපන් දිනය *",
    resAddress: "පදිංචි ලිපිනය *",
    province: "පළාත *",
    selectProvince: "පළාත තෝරන්න",
    city: "නගරය *",
    selectCity: "නගරය තෝරන්න",
    password: "මුරපදය *",
    confirmPassword: "මුරපදය තහවුරු කරන්න *",
    bankTitle: "බැංකු විස්තර (ගෙවීම් සඳහා)",
    bankName: "බැංකුවේ නම *",
    selectBank: "බැංකුව තෝරන්න",
    branchName: "ශාඛාවේ නම *",
    selectBranch: "ශාඛාව තෝරන්න",
    accountNum: "ගිණුම් අංකය *",
    accountHolder: "ගිණුම් හිමියාගේ නම *",
    backBtn: "ලොගින් පිටුවට",
    nextBtn: "ඊළඟ",
    fillAll: "කරුණාකර * ලකුණු කළ සියලුම ක්ෂේත්‍ර පුරවන්න",
    fillBank: "කරුණාකර සියලුම අනිවාර්ය බැංකු විස්තර පුරවන්න.",
    nicAlert: "කරුණාකර වලංගු ජාතික හැඳුනුම්පත් අංකයක් ඇතුළත් කරන්න (අක්ෂර/ඉලක්කම් 10-12).",
    mobileAlert: "ජංගම දුරකථන අංකය හරියටම ඉලක්කම් 10ක් විය යුතුය.",
    emailAlert: "කරුණාකර වලංගු විද්‍යුත් තැපැල් ලිපිනයක් ඇතුළත් කරන්න.",
    passLength: "මුරපදය අක්ෂර 6ත් 12ත් අතර විය යුතුය.",
    passChar: "මුරපදයේ අවම වශයෙන් එක් ඉලක්කමක් හෝ විශේෂ අක්ෂරයක් තිබිය යුතුය.",
    passMatch: "මුරපද එකිනෙකට නොගැලපේ!",
    verifyFail: "දත්ත ගබඩාව සමඟ අක්තපත්‍ර සත්‍යාපනය කිරීමට අපොහොසත් විය.",
    emailExist: "මෙම විද්‍යුත් තැපැල් ලිපිනය දැනටමත් ලියාපදිංචි කර ඇත.",
    nicExist: "මෙම හැඳුනුම්පත් අංකය දැනටමත් ලියාපදිංචි කර ඇත.",
    connError: "සත්‍යාපන සේවාදායකයට සම්බන්ධ විය නොහැක. කරුණාකර නැවත උත්සාහ කරන්න."
  },
  ta: {
    createAccount: "கணக்கை உருவாக்கு",
    descHint: "சனச பொதுக் காப்பீட்டில் உங்கள் கணக்கைப் பதிவு செய்ய படிகளைப் பின்பற்றவும்.",
    stepIndicator: "படி 01 இல் 04",
    personalDetails: "தனிப்பட்ட விவரங்கள்",
    firstName: "முதல் பெயர் *",
    lastName: "குடும்பப் பெயர் *",
    nicNum: "அடையாள அட்டை எண் *",
    mobileNum: "கைபேசி எண் *",
    emailAddr: "மின்னஞ்சல் முகவரி *",
    dob: "பிறந்த தேதி *",
    resAddress: "வீட்டு முகவரி *",
    province: "மாகாணம் *",
    selectProvince: "மாகாணத்தைத் தேர்ந்தெடு",
    city: "நகரம் *",
    selectCity: "நகரத்தைத் தேர்ந்தெடு",
    password: "கடவுச்சொல் *",
    confirmPassword: "கடவுச்சொல்லை உறுதிப்படுத்துக *",
    bankTitle: "வங்கி விவரங்கள் (பணப் பரிமாற்றத்திற்கு)",
    bankName: "வங்கி பெயர் *",
    selectBank: "வங்கியைத் தேர்ந்தெடு",
    branchName: "கிளை பெயர் *",
    selectBranch: "கிளையைத் தேர்ந்தெடு",
    accountNum: "கணக்கு எண் *",
    accountHolder: "கணக்கு வைத்திருப்பவர் பெயர் *",
    backBtn: "உள்நுழைவுக்குத் திரும்பு",
    nextBtn: "அடுத்து",
    fillAll: "தயவுசெய்து * குறியிடப்பட்ட அனைத்து புலங்களையும் நிரப்பவும்",
    fillBank: "தயவுசெய்து தேவையான அனைத்து வங்கி விவரங்களையும் நிரப்பவும்.",
    nicAlert: "செல்லுபடியாகும் அடையாள அட்டை எண்ணை உள்ளிடவும் (10-12 அட்சரங்கள்/இலக்கங்கள்).",
    mobileAlert: "கைபேசி எண் சரியாக 10 இலக்கங்களாக இருக்க வேண்டும்.",
    emailAlert: "செல்லுபடியாகும் மின்னஞ்சல் முகவரியை உள்ளிடவும்.",
    passLength: "கடவுச்சொல் 6 முதல் 12 எழுத்துகளுக்குள் இருக்க வேண்டும்.",
    passChar: "கடவுச்சொல்லில் குறைந்தபட்சம் ஒரு எண் அல்லது சிறப்பு எழுத்து இருக்க வேண்டும்.",
    passMatch: "கடவுச்சொற்கள் பொருந்தவில்லை!",
    verifyFail: "தரவுத்தளத்துடன் நற்சான்றிதழ்களைச் சரிபார்க்க முடியவில்லை.",
    emailExist: "இந்த மின்னஞ்சல் முகவரி ஏற்கனவே பதிவு செய்யப்பட்டுள்ளது.",
    nicExist: "இந்த அடையாள அட்டை எண் ஏற்கனவே பதிவு செய்யப்பட்டுள்ளது.",
    connError: "சரிபார்ப்பு சேவையகத்துடன் இணைக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."
  }
};

export default function SignUp() {
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

  // Form Fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nic, setNic] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Bank Account Fields
  const [bankName, setBankName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeCities, setActiveCities] = useState<string[]>([]);
  const [validationError, setValidationError] = useState("");

  // Auto update cities list when province selection changes
  useEffect(() => {
    const selected = provincesData.find((p) => p.name === province);
    if (selected) {
      setActiveCities(selected.cities);
      setCity(""); // Reset selected city
    } else {
      setActiveCities([]);
      setCity("");
    }
  }, [province]);

  // Password strength checker
  const getPasswordStrength = () => {
    if (!password) return { label: "", color: "bg-transparent", width: "w-0", strength: 0 };
    let score = 0;
    if (password.length >= 6 && password.length <= 12) score += 1;
    if (password.length >= 8 && password.length <= 12) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;

    switch (score) {
      case 1:
        return { label: "Weak", color: "bg-red-500", width: "w-1/4", strength: 1 };
      case 2:
        return { label: "Fair", color: "bg-orange-500", width: "w-2/4", strength: 2 };
      case 3:
        return { label: "Good", color: "bg-yellow-500", width: "w-3/4", strength: 3 };
      case 4:
        return { label: "Strong", color: "bg-green-500", width: "w-full", strength: 4 };
      default:
        return { label: "", color: "bg-transparent", width: "w-0", strength: 0 };
    }
  };

  const strength = getPasswordStrength();

  // Load state from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("signup_personal_details");
      if (saved) {
        try {
          const data = JSON.parse(saved);
          setFirstName(data.firstName || "");
          setLastName(data.lastName || "");
          setNic(data.nic || "");
          setMobile(data.mobile || "");
          setEmail(data.email || "");
          setDob(data.dob || "");
          setAddress(data.address || "");
          setProvince(data.province || "");
          setCity(data.city || "");
          setPassword(data.password || "");
          setConfirmPassword(data.password || "");
          
          if (data.bankDetails) {
            setBankName(data.bankDetails.bankName || "");
            setBranchName(data.bankDetails.branchName || "");
            setAccountNumber(data.bankDetails.accountNumber || "");
            setAccountHolderName(data.bankDetails.accountHolderName || "");
          }
        } catch (err) {
          console.error("Error loading personal details:", err);
        }
      }
    }
  }, []);

  // Validate step completion and go to next step
  const handleNextStep = async () => {
    setValidationError("");

    if (!firstName || !lastName || !nic || !mobile || !email || !dob || !address || !province || !city || !password || !confirmPassword) {
      setValidationError(t.fillAll);
      return;
    }

    if (!bankName || !branchName || !accountNumber || !accountHolderName) {
      setValidationError(t.fillBank);
      return;
    }

    // NIC format check: 10-12 characters/digits.
    const cleanNic = nic.trim();
    const nicRegex = /^[0-9vVxX]{10,12}$/;
    if (!nicRegex.test(cleanNic)) {
      setValidationError(t.nicAlert);
      return;
    }

    // Mobile number check: exactly 10 digits
    const cleanMobile = mobile.replace(/[-+()\s]/g, "");
    if (!/^\d{10}$/.test(cleanMobile)) {
      setValidationError(t.mobileAlert);
      return;
    }

    // Email check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setValidationError(t.emailAlert);
      return;
    }

    // Password check: 6-12 characters, with conditions (numbers or special chars)
    if (password.length < 6 || password.length > 12) {
      setValidationError(t.passLength);
      return;
    }
    if (!/[0-9]/.test(password) && !/[^A-Za-z0-9]/.test(password)) {
      setValidationError(t.passChar);
      return;
    }

    if (password !== confirmPassword) {
      setValidationError(t.passMatch);
      return;
    }

    // Check database if NIC or Email is already registered
    try {
      const res = await fetch(`${API_URL}/signup/check?email=${encodeURIComponent(email)}&nic=${encodeURIComponent(cleanNic)}`);
      if (!res.ok) {
        throw new Error(t.verifyFail);
      }
      const data = await res.json();
      if (data.emailExists) {
        setValidationError(t.emailExist);
        return;
      }
      if (data.nicExists) {
        setValidationError(t.nicExist);
        return;
      }
    } catch (err: any) {
      setValidationError(t.connError);
      return;
    }
    
    // Save state to sessionStorage
    if (typeof window !== "undefined") {
      const personalData = {
        firstName,
        lastName,
        nic: cleanNic,
        mobile: cleanMobile,
        email,
        dob,
        address,
        province,
        city,
        password,
        bankDetails: {
          bankName,
          branchName,
          accountNumber,
          accountHolderName
        }
      };
      sessionStorage.setItem("signup_personal_details", JSON.stringify(personalData));
    }
    
    router.push("/SignUp/page1");
  };

  const handleBackStep = () => {
    router.push("/Login");
  };

  return (
    <div className="min-h-screen w-full flex flex-col">
      <Navbar />

      {/* Main Container Layer matching Login design aesthetics */}
      <div
        className="relative flex-1 w-full flex items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat py-12 md:py-20"
        style={{
          backgroundImage: "url('/login_bg.jpg')",
        }}
      >
        {/* Background Visual teal/blue depth effects */}
        <div className="absolute inset-0 bg-[#0e3b44]/75 mix-blend-multiply pointer-events-none" />
        <div className="absolute inset-0 bg-linear-to-br from-[#0c3945]/90 via-[#125867]/75 to-[#0b333b]/90 pointer-events-none" />
        
        {/* Modern glowing ambient lights */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-400/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-300/15 blur-[120px] pointer-events-none" />

        {/* Content Wizard Box */}
        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 md:px-8 flex flex-col items-center gap-8">
          
          {/* Header Title */}
          <div className="text-center select-none flex flex-col gap-2">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight drop-shadow-[0_4px_10px_rgba(0,0,0,0.3)] leading-tight">
              {t.createAccount}
            </h1>
            <p className="text-white/75 text-sm sm:text-base font-medium max-w-md mx-auto">
              {t.descHint}
            </p>
          </div>

          {/* MODERN SEGMENTED PILL STEP TRACKER */}
          <div className="w-full max-w-xl mx-auto flex flex-col gap-4 select-none">
            {/* Pill Bar */}
            <div className="flex w-full gap-3 h-2">
              {[1, 2, 3, 4].map((num) => {
                const isActive = num === 1;
                return (
                  <div
                    key={num}
                    className={`flex-1 h-full rounded-full transition-all duration-500 ${
                      isActive
                        ? "bg-[#ff9800] shadow-[0_0_15px_rgba(255,152,0,0.6)] scale-[1.02]"
                        : "bg-white/15"
                    }`}
                  />
                );
              })}
            </div>
            {/* Step Label Container */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left gap-0.5 mt-1">
              <span className="text-xs md:text-sm font-bold text-[#ff9800] tracking-widest uppercase">
                {t.stepIndicator}
              </span>
              <h2 className="text-xl md:text-2xl font-bold text-white">
                {t.personalDetails}
              </h2>
            </div>
          </div>

          {/* MAIN GLASSMORPHIC CARD */}
          <div className="w-full max-w-4xl bg-[#0e3b44]/45 backdrop-blur-md border border-white/20 rounded-[2.5rem] p-6 md:p-12 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] flex flex-col gap-8 transition-all duration-500 hover:border-white/25">
            
            {/* Show Validation Error Banner if present */}
            {validationError && (
              <div className="bg-red-500/20 border-l-4 border-red-500 p-4 rounded-xl text-white text-sm flex items-center gap-3 animate-pulse">
                <HugeiconsIcon icon={AlertCircleIcon} className="w-5 h-5 shrink-0 text-red-400" strokeWidth={2} />
                <span>{validationError}</span>
              </div>
            )}

            {/* STEP 1: PERSONAL DETAILS */}
            <div className="flex flex-col gap-6">
              
              {/* Title & Icon */}
              <div className="flex items-center gap-3 border-b border-white/15 pb-4">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/20 flex items-center justify-center border border-orange-400/40 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.25)]">
                  <HugeiconsIcon icon={UserIcon} className="w-6 h-6" strokeWidth={2} />
                </div>
                <h2 className="text-white text-2xl font-bold tracking-wide select-none">
                  {t.personalDetails}
                </h2>
              </div>

              {/* Form fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* First Name */}
                <div className="flex flex-col gap-2">
                  <label className="text-white text-sm font-semibold tracking-wide ml-1 select-none flex gap-0.5">
                    {t.firstName}
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-white text-slate-800 rounded-full py-3 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all placeholder:text-gray-400 font-medium border border-transparent"
                    placeholder="Amal"
                  />
                </div>

                {/* Last Name */}
                <div className="flex flex-col gap-2">
                  <label className="text-white text-sm font-semibold tracking-wide ml-1 select-none flex gap-0.5">
                    {t.lastName}
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-white text-slate-800 rounded-full py-3 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all placeholder:text-gray-400 font-medium border border-transparent"
                    placeholder="Perera"
                  />
                </div>

                {/* NIC Number */}
                <div className="flex flex-col gap-2">
                  <label className="text-white text-sm font-semibold tracking-wide ml-1 select-none flex gap-0.5">
                    {t.nicNum}
                  </label>
                  <input
                    type="text"
                    required
                    value={nic}
                    onChange={(e) => setNic(e.target.value)}
                    className="w-full bg-white text-slate-800 rounded-full py-3 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all placeholder:text-gray-400 font-medium border border-transparent"
                    placeholder="200123500688"
                  />
                </div>

                {/* Mobile Number */}
                <div className="flex flex-col gap-2">
                  <label className="text-white text-sm font-semibold tracking-wide ml-1 select-none flex gap-0.5">
                    {t.mobileNum}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="w-full bg-white text-slate-800 rounded-full py-3 pl-6 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all placeholder:text-gray-400 font-medium border border-transparent"
                      placeholder="0771234567"
                    />
                    <span className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <HugeiconsIcon icon={Call02Icon} className="w-5 h-5 text-slate-700" strokeWidth={2} />
                    </span>
                  </div>
                </div>

                {/* Email Address */}
                <div className="flex flex-col gap-2">
                  <label className="text-white text-sm font-semibold tracking-wide ml-1 select-none flex gap-0.5">
                    {t.emailAddr}
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white text-slate-800 rounded-full py-3 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all placeholder:text-gray-400 font-medium border border-transparent"
                    placeholder="Amalperera@gmail.com"
                  />
                </div>

                {/* Date of Birth */}
                <div className="flex flex-col gap-2">
                  <label className="text-white text-sm font-semibold tracking-wide ml-1 select-none flex gap-0.5">
                    {t.dob}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="dd/mm/yyyy"
                      onFocus={(e) => { e.target.type = "date"; }}
                      onBlur={(e) => { if (!e.target.value) e.target.type = "text"; }}
                      required
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full bg-white text-slate-800 rounded-full py-3 pl-6 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all placeholder:text-gray-400 font-medium border border-transparent"
                    />
                    <span className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <HugeiconsIcon icon={Calendar01Icon} className="w-5 h-5 text-slate-700" strokeWidth={2} />
                    </span>
                  </div>
                </div>

                {/* Residential Address */}
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-white text-sm font-semibold tracking-wide ml-1 select-none flex gap-0.5">
                    {t.resAddress}
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-white text-slate-800 rounded-3xl py-4 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all placeholder:text-gray-400 font-medium border border-transparent"
                    placeholder="No 44 , Malagane Road ......"
                  />
                </div>

                {/* Province Selection */}
                <div className="flex flex-col gap-2">
                  <label className="text-white text-sm font-semibold tracking-wide ml-1 select-none flex gap-0.5">
                    {t.province}
                  </label>
                  <div className="relative">
                    <select
                      required
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      className="w-full bg-white text-slate-800 rounded-full py-3 px-6 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all font-medium border border-transparent appearance-none"
                    >
                      <option value="" disabled>{t.selectProvince}</option>
                      {provincesData.map((p) => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                    <span className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-700">
                      <HugeiconsIcon icon={ArrowDown01Icon} className="w-5 h-5" strokeWidth={2.5} />
                    </span>
                  </div>
                </div>

                {/* City Selection */}
                <div className="flex flex-col gap-2">
                  <label className="text-white text-sm font-semibold tracking-wide ml-1 select-none flex gap-0.5">
                    {t.city}
                  </label>
                  <div className="relative">
                    <select
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      disabled={!province}
                      className="w-full bg-white text-slate-800 rounded-full py-3 px-6 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all font-medium border border-transparent appearance-none disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="" disabled>{t.selectCity}</option>
                      {activeCities.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <span className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-700">
                      <HugeiconsIcon icon={ArrowDown01Icon} className="w-5 h-5" strokeWidth={2.5} />
                    </span>
                  </div>
                </div>

                {/* Password Field */}
                <div className="flex flex-col gap-2">
                  <label className="text-white text-sm font-semibold tracking-wide ml-1 select-none flex gap-0.5">
                    {t.password}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white text-slate-800 rounded-full py-3 pl-6 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all placeholder:text-gray-400 font-medium border border-transparent"
                      placeholder="Enter Password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-700 focus:outline-none cursor-pointer border-none bg-transparent"
                    >
                      {showPassword ? (
                        <HugeiconsIcon icon={ViewOffSlashIcon} className="w-5 h-5 text-slate-700" strokeWidth={2} />
                      ) : (
                        <HugeiconsIcon icon={ViewIcon} className="w-5 h-5 text-slate-700" strokeWidth={2} />
                      )}
                    </button>
                  </div>
                  {password && (
                    <div className="mt-2 flex flex-col gap-2.5 px-1 bg-black/15 p-3 rounded-2xl border border-white/5 transition-all duration-300">
                      <div className="flex justify-between items-center text-xs text-white/95">
                        <span className="font-semibold">Password Strength:</span>
                        <span className="font-bold uppercase tracking-wider">{strength.label}</span>
                      </div>
                      <div className="h-2 w-full bg-white rounded-full overflow-hidden">
                        <div className={`h-full ${strength.color} ${strength.width} transition-all duration-350 rounded-full`} />
                      </div>
                      <div className="flex flex-col gap-1 text-[11px] text-white/90">
                        <div className="flex items-center gap-1.5">
                          {password.length >= 6 && password.length <= 12 ? (
                            <span className="text-green-400 font-bold flex items-center gap-1">✔ 6 to 12 characters</span>
                          ) : (
                            <span className="text-red-400 font-bold flex items-center gap-1">❌ 6 to 12 characters</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password) ? (
                            <span className="text-green-400 font-bold flex items-center gap-1">✔ Min. 1 number or special character</span>
                          ) : (
                            <span className="text-red-400 font-bold flex items-center gap-1">❌ Min. 1 number or special character</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {confirmPassword && password === confirmPassword ? (
                            <span className="text-green-400 font-bold flex items-center gap-1">✔ Passwords match</span>
                          ) : (
                            <span className="text-red-400 font-bold flex items-center gap-1">❌ Passwords match</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="flex flex-col gap-2">
                  <label className="text-white text-sm font-semibold tracking-wide ml-1 select-none flex gap-0.5">
                    {t.confirmPassword}
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-white text-slate-800 rounded-full py-3 pl-6 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all placeholder:text-gray-400 font-medium border border-transparent"
                      placeholder="Confirm Password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-700 focus:outline-none cursor-pointer border-none bg-transparent"
                    >
                      {showConfirmPassword ? (
                        <HugeiconsIcon icon={ViewOffSlashIcon} className="w-5 h-5 text-slate-700" strokeWidth={2} />
                      ) : (
                        <HugeiconsIcon icon={ViewIcon} className="w-5 h-5 text-slate-700" strokeWidth={2} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Bank Account Details Section */}
                <div className="flex flex-col gap-6 md:col-span-2 border-t border-white/15 pt-6 mt-4">
                  <div className="flex items-center gap-3 pb-2">
                    <div className="w-10 h-10 rounded-2xl bg-orange-500/20 flex items-center justify-center border border-orange-400/40 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.25)]">
                      {/* Bank Card SVG Icon */}
                      <HugeiconsIcon icon={BankIcon} className="w-6 h-6" strokeWidth={2} />
                    </div>
                    <h2 className="text-white text-2xl font-bold tracking-wide select-none">
                      {t.bankTitle}
                    </h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Bank Name Dropdown */}
                    <div className="flex flex-col gap-2">
                      <label className="text-white text-sm font-semibold tracking-wide ml-1 select-none flex gap-0.5">
                        {t.bankName}
                      </label>
                      <div className="relative">
                        <select
                          required
                          value={bankName}
                          onChange={(e) => {
                            setBankName(e.target.value);
                            setBranchName(""); // reset branch selection when bank changes
                          }}
                          className="w-full bg-white text-slate-800 rounded-full py-3 px-6 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all font-medium border border-transparent appearance-none"
                        >
                          <option value="" disabled>{t.selectBank}</option>
                          {Object.keys(sriLankaBanks).map((b) => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                        <span className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-700">
                          <HugeiconsIcon icon={ArrowDown01Icon} className="w-5 h-5" strokeWidth={2.5} />
                        </span>
                      </div>
                    </div>

                    {/* Branch Name Dropdown */}
                    <div className="flex flex-col gap-2">
                      <label className="text-white text-sm font-semibold tracking-wide ml-1 select-none flex gap-0.5">
                        {t.branchName}
                      </label>
                      <div className="relative">
                        <select
                          required
                          disabled={!bankName}
                          value={branchName}
                          onChange={(e) => setBranchName(e.target.value)}
                          className="w-full bg-white text-slate-800 rounded-full py-3 px-6 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all font-medium border border-transparent appearance-none disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <option value="" disabled>{t.selectBranch}</option>
                          {bankName && sriLankaBanks[bankName].map((br) => (
                            <option key={br} value={br}>{br}</option>
                          ))}
                        </select>
                        <span className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-700">
                          <HugeiconsIcon icon={ArrowDown01Icon} className="w-5 h-5" strokeWidth={2.5} />
                        </span>
                      </div>
                    </div>

                    {/* Account Number */}
                    <div className="flex flex-col gap-2">
                      <label className="text-white text-sm font-semibold tracking-wide ml-1 select-none flex gap-0.5">
                        {t.accountNum}
                      </label>
                      <input
                        type="text"
                        required
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        className="w-full bg-white text-slate-800 rounded-full py-3 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all placeholder:text-gray-400 font-medium border border-transparent"
                        placeholder="e.g. 84110295"
                      />
                    </div>

                    {/* Account Holder Name */}
                    <div className="flex flex-col gap-2">
                      <label className="text-white text-sm font-semibold tracking-wide ml-1 select-none flex gap-0.5">
                        {t.accountHolder}
                      </label>
                      <input
                        type="text"
                        required
                        value={accountHolderName}
                        onChange={(e) => setAccountHolderName(e.target.value)}
                        className="w-full bg-white text-slate-800 rounded-full py-3 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all placeholder:text-gray-400 font-medium border border-transparent"
                        placeholder="e.g. A. H. Amal Perera"
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* ACTION NAVIGATION BUTTONS (BOTTOM) */}
            <div className="flex justify-between items-center w-full border-t border-white/10 pt-6 mt-2">
              
              {/* Back button */}
              <button
                type="button"
                onClick={handleBackStep}
                className="bg-[#ff9800] hover:bg-[#ff8f00] active:bg-[#f57c00] text-white font-bold py-3 px-8 rounded-full transition-all duration-300 transform hover:scale-[1.04] active:scale-95 shadow-lg shadow-orange-500/35 text-center text-base cursor-pointer select-none outline-none border-none"
              >
                {t.backBtn}
              </button>

              {/* Next button */}
              <button
                type="button"
                onClick={handleNextStep}
                className="bg-[#ff9800] hover:bg-[#ff8f00] active:bg-[#f57c00] text-white font-bold py-3 px-8 rounded-full transition-all duration-300 transform hover:scale-[1.04] active:scale-95 shadow-lg shadow-orange-500/35 text-center text-base cursor-pointer select-none outline-none border-none"
              >
                {t.nextBtn}
              </button>

            </div>

          </div>

        </div>
      </div>

      <LoginFooter />
    </div>
  );
}
