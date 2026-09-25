"use client";

import React, { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/Components/Homepage/Navbar";
import LoginFooter from "@/app/Components/Login/Footer";
import { API_URL } from "@/app/config";

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
import { AlertCircleIcon, FileCheckIcon, CheckmarkCircle01Icon, Tick01Icon, Loading03Icon } from "@hugeicons/core-free-icons";

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

const translations = {
  en: {
    createAccount: "Create an Account",
    descHint: "Follow the steps to register your account with Sanasa General Insurance.",
    stepIndicator: "STEP 04 OF 04",
    reviewTitle: "Review & Confirm",
    reviewDesc: "Please review all information before submitting your insurance policy account registration.",
    personalDetails: "Personal details",
    fullName: "Full Name",
    nicNumber: "NIC Number",
    mobileNumber: "Mobile Number",
    emailAddress: "Email Address",
    dob: "Date of Birth",
    location: "Location",
    resAddress: "Residential Address",
    vehicleDetails: "Vehicle details",
    numberPlate: "Number Plate",
    brandCompany: "Brand / Company",
    modelYear: "Model & Year",
    engineNumber: "Engine Number",
    chassisNumber: "Chassis Number",
    policyNo: "Insurance Vehicle Policy No.",
    verifiedDocs: "Verification Documents",
    kycFront: "KYC Document (Front)",
    kycBack: "KYC Document (Back)",
    vehicleReg: "Vehicle Registration",
    revenueLicense: "Revenue License",
    verified: "Verified:",
    agreeTerms: "I agree to the Terms of Service and Privacy Policy of Sanasa General Insurance.",
    agreeConsent: "I consent to the collection and processing of my identity verification details and vehicle details for policy processing.",
    backBtn: "Back",
    confirmBtn: "Confirm & Submit",
    submitting: "Creating Account...",
    successDone: "Done!",
    successMsg: "Your insurance application has been received. Our office staff will review your documents and activate your account within 1–2 business days.",
    redirecting: "Redirecting to Login...",
    consentAlert: "You must agree to the Terms of Service and Privacy Policy to register.",
    signUpFail: "Something went wrong during sign up.",
    connError: "An error occurred while connecting to the server."
  },
  si: {
    createAccount: "ගිණුමක් සාදන්න",
    descHint: "සනස සාමාන්‍ය රක්ෂණය සමඟ ඔබේ ගිණුම ලියාපදිංචි කිරීමට පියවර අනුගමනය කරන්න.",
    stepIndicator: "පියවර 04 න් 04 වන පියවර",
    reviewTitle: "සමාලෝචනය කර තහවුරු කරන්න",
    reviewDesc: "ඔබගේ රක්ෂණ ඔප්පු ගිණුම් ලියාපදිංචිය ඉදිරිපත් කිරීමට පෙර කරුණාකර සියලු තොරතුරු සමාලෝචනය කරන්න.",
    personalDetails: "පුද්ගලික විස්තර",
    fullName: "සම්පූර්ණ නම",
    nicNumber: "ජාතික හැඳුනුම්පත් අංකය",
    mobileNumber: "ජංගම දුරකථන අංකය",
    emailAddress: "විද්‍යුත් තැපැල් ලිපිනය",
    dob: "උපන් දිනය",
    location: "පළාත සහ නගරය",
    resAddress: "පදිංචි ලිපිනය",
    vehicleDetails: "වාහන විස්තර",
    numberPlate: "ලියාපදිංචි අංකය",
    brandCompany: "නිෂ්පාදිත සමාගම",
    modelYear: "මාදිලිය සහ වර්ෂය",
    engineNumber: "එන්ජින් අංකය",
    chassisNumber: "චැසි අංකය",
    policyNo: "රක්ෂණ ඔප්පු අංකය",
    verifiedDocs: "සත්‍යාපන ලියකියවිලි",
    kycFront: "හැඳුනුම්පත (ඉදිරිපස)",
    kycBack: "හැඳුනුම්පත (පසුපස)",
    vehicleReg: "වාහන ලියාපදිංචි සහතිකය",
    revenueLicense: "ආදායම් බලපත්‍රය",
    verified: "සත්‍යාපනය කර ඇත:",
    agreeTerms: "මම සනස සාමාන්‍ය රක්ෂණයේ සේවා නියමයන් සහ රහස්‍යතා ප්‍රතිපත්තියට එකඟ වෙමි.",
    agreeConsent: "ප්‍රතිපත්ති සැකසීම සඳහා මගේ අනන්‍යතාවය සත්‍යාපනය කිරීමේ විස්තර සහ වාහන විස්තර එකතු කිරීමට සහ සැකසීමට මම එකඟ වෙමි.",
    backBtn: "ආපසු",
    confirmBtn: "තහවුරු කර ඉදිරිපත් කරන්න",
    submitting: "ගිණුම නිර්මාණය වෙමින් පවතී...",
    successDone: "සාර්ථකයි!",
    successMsg: "ඔබගේ රක්ෂණ අයදුම්පත ලැබී ඇත. අපගේ කාර්ය මණ්ඩලය ඔබගේ ලේඛන සමාලෝචනය කර වැඩ කරන දින 1-2ක් ඇතුළත ඔබගේ ගිණුම සක්‍රිය කරනු ඇත.",
    redirecting: "ලොගින් පිටුවට යොමු කෙරේ...",
    consentAlert: "ලියාපදිංචි වීමට ඔබ සේවා කොන්දේසි සහ රහස්‍යතා ප්‍රතිපත්තියට එකඟ විය යුතුය.",
    signUpFail: "ලියාපදිංචි වීමේදී යම් දෝෂයක් සිදු විය.",
    connError: "සේවාදායකයට සම්බන්ධ වීමේදී දෝෂයක් ඇතිවිය."
  },
  ta: {
    createAccount: "கணக்கை உருவாக்கு",
    descHint: "சனச பொதுக் காப்பீட்டில் உங்கள் கணக்கைப் பதிவு செய்ய படிகளைப் பின்பற்றவும்.",
    stepIndicator: "படி 04 இல் 04",
    reviewTitle: "மதிப்பாய்வு மற்றும் உறுதிப்படுத்தல்",
    reviewDesc: "உங்கள் காப்பீட்டுக் கொள்கைக் கணக்குப் பதிவைச் சமர்ப்பிக்கும் முன் அனைத்து தகவல்களையும் மதிப்பாய்வு செய்யவும்.",
    personalDetails: "தனிப்பட்ட விவரங்கள்",
    fullName: "முழு பெயர்",
    nicNumber: "அடையாள அட்டை எண்",
    mobileNumber: "கைபேசி எண்",
    emailAddress: "மின்னஞ்சல் முகவரி",
    dob: "பிறந்த தேதி",
    location: "இடம் (மாகாணம்/நகரம்)",
    resAddress: "வீட்டு முகவரி",
    vehicleDetails: "வாகன விவரங்கள்",
    numberPlate: "வாகன எண்",
    brandCompany: "தயாரிப்பு நிறுவனம்",
    modelYear: "மாதிரி & ஆண்டு",
    engineNumber: "அச்சு எண்",
    chassisNumber: "சட்டக எண்",
    policyNo: "காப்பீட்டு பாலிசி எண்",
    verifiedDocs: "சரிபார்ப்பு ஆவணங்கள்",
    kycFront: "அடையாள அட்டை (முன்பக்கம்)",
    kycBack: "அடையாள அட்டை (பின்பக்கம்)",
    vehicleReg: "வாகன பதிவு சான்றிதழ்",
    revenueLicense: "வருமான வரி உரிமம்",
    verified: "சரிபார்க்கப்பட்டது:",
    agreeTerms: "ஏற்றுக்கொள்கிறேன் - சேவை விதிமுறைகள் தனியுரிமைக் கொள்கை.",
    agreeConsent: "தனியுரிமை கொள்கை - அடையாள சரிபார்ப்பு விவரங்கள் மற்றும் வாகன விவரங்கள்.",
    backBtn: "முன்னால்",
    confirmBtn: "உறுதிப்படுத்தி சமர்ப்பிக்கவும்",
    submitting: "கணக்கு உருவாக்கப்படுகிறது...",
    successDone: "முடிந்தது!",
    successMsg: "உங்கள் காப்பீட்டு விண்ணப்பம் பெறப்பட்டது. எங்கள் ஊழியர்கள் உங்கள் ஆவணங்களை மதிப்பாய்வு செய்து 1-2 வணிக நாட்களுக்குள் உங்கள் கணக்கைச் செயல்படுத்துவார்கள்.",
    redirecting: "உள்நுழைவுக்குத் திருப்பிவிடப்படுகிறது...",
    consentAlert: "பதிவு செய்ய நீங்கள் சேவை விதிமுறைகள் மற்றும் தனியுரிமைக் கொள்கையை ஒப்புக்கொள்ள வேண்டும்.",
    signUpFail: "பதிவு செய்யும் போது ஏதோ தவறு நடந்தது.",
    connError: "சேவையகத்துடன் இணைக்கும்போது பிழை ஏற்பட்டது."
  }
};

export default function SignUpPage3() {
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
  
  // Data retrieved from session cache
  const [personal, setPersonal] = useState<any>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  
  // Base64 document contents
  const [nicFrontData, setNicFrontData] = useState("");
  const [nicBackData, setNicBackData] = useState("");
  const [vehicleRegData, setVehicleRegData] = useState("");
  const [revenueLicenseData, setRevenueLicenseData] = useState("");

  // Filenames for display
  const [nicFrontName, setNicFrontName] = useState("");
  const [nicBackName, setNicBackName] = useState("");
  const [vehicleRegName, setVehicleRegName] = useState("");
  const [revenueLicenseName, setRevenueLicenseName] = useState("");

  const [validationError, setValidationError] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [consentData, setConsentData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [refNumber, setRefNumber] = useState("");

  // Load cache on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedPersonal = sessionStorage.getItem("signup_personal_details");
      const savedVehicles = sessionStorage.getItem("signup_vehicle_details");
      
      const savedFront = sessionStorage.getItem("signup_nic_front_uploaded");
      const savedBack = sessionStorage.getItem("signup_nic_back_uploaded");
      const savedVehicleReg = sessionStorage.getItem("signup_vehicle_reg_uploaded");
      const savedRevenueLicense = sessionStorage.getItem("signup_revenue_license_uploaded");

      const savedFrontName = sessionStorage.getItem("signup_nic_front_name");
      const savedBackName = sessionStorage.getItem("signup_nic_back_name");
      const savedVehicleRegName = sessionStorage.getItem("signup_vehicle_reg_name");
      const savedRevenueLicenseName = sessionStorage.getItem("signup_revenue_license_name");

      if (savedPersonal) {
        try {
          setPersonal(JSON.parse(savedPersonal));
        } catch (e) {
          console.error(e);
        }
      }
      if (savedVehicles) {
        try {
          setVehicles(JSON.parse(savedVehicles));
        } catch (e) {
          console.error(e);
        }
      }
      if (savedFront) setNicFrontData(savedFront);
      if (savedBack) setNicBackData(savedBack);
      if (savedVehicleReg) setVehicleRegData(savedVehicleReg);
      if (savedRevenueLicense) setRevenueLicenseData(savedRevenueLicense);

      if (savedFrontName) setNicFrontName(savedFrontName);
      if (savedBackName) setNicBackName(savedBackName);
      if (savedVehicleRegName) setVehicleRegName(savedVehicleRegName);
      if (savedRevenueLicenseName) setRevenueLicenseName(savedRevenueLicenseName);
    }
  }, []);

  const handleBackStep = () => {
    router.push("/SignUp/page2");
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    setValidationError("");

    if (!agreedToTerms || !consentData) {
      setValidationError(t.consentAlert);
      return;
    }

    setIsSubmitting(true);

    try {
      const requestBody = {
        personal,
        vehicles,
        documents: {
          nicFront: nicFrontData,
          nicBack: nicBackData,
          vehicleReg: vehicleRegData,
          revenueLicense: revenueLicenseData
        }
      };

      const res = await fetch(`${API_URL}/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t.signUpFail);
      }

      setRefNumber(data.referenceNumber);

      // Clear session cache
      sessionStorage.removeItem("signup_personal_details");
      sessionStorage.removeItem("signup_vehicle_details");
      sessionStorage.removeItem("signup_nic_front_uploaded");
      sessionStorage.removeItem("signup_nic_back_uploaded");
      sessionStorage.removeItem("signup_vehicle_reg_uploaded");
      sessionStorage.removeItem("signup_revenue_license_uploaded");
      sessionStorage.removeItem("signup_nic_front_name");
      sessionStorage.removeItem("signup_nic_back_name");
      sessionStorage.removeItem("signup_vehicle_reg_name");
      sessionStorage.removeItem("signup_revenue_license_name");

      setShowSuccessModal(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/Login");
      }, 3000);

    } catch (err: any) {
      setValidationError(err.message || t.connError);
    } finally {
      setIsSubmitting(false);
    }
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
                const isActive = num === 4;
                const isCompleted = num < 4;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      if (num === 1) {
                        router.push("/SignUp");
                      } else if (num === 2) {
                        router.push("/SignUp/page1");
                      } else if (num === 3) {
                        router.push("/SignUp/page2");
                      }
                    }}
                    disabled={num >= 4}
                    className={`flex-1 h-full rounded-full transition-all duration-500 outline-none border-none ${
                      isCompleted
                        ? "bg-[#00cc66] cursor-pointer hover:opacity-90"
                        : isActive
                        ? "bg-[#ff9800] shadow-[0_0_15px_rgba(255,152,0,0.6)] scale-[1.02]"
                        : "bg-white/15 cursor-default"
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
                {t.reviewTitle}
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

            {/* Form Title & Icon */}
            <div className="flex items-center gap-3 border-b border-white/15 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/20 flex items-center justify-center border border-orange-400/40 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.25)]">
                <HugeiconsIcon icon={FileCheckIcon} className="w-6 h-6" strokeWidth={2} />
              </div>
              <h2 className="text-white text-2xl font-bold tracking-wide select-none">
                {t.reviewTitle}
              </h2>
            </div>

            <p className="text-white/85 text-sm md:text-base">
              {t.reviewDesc}
            </p>

            {/* Summary Grid wrapper */}
            <div className="flex flex-col gap-6">
              
              {/* Personal details review block */}
              {personal && (
                <div className="flex flex-col gap-3">
                  <span className="text-white font-bold text-base select-none">{t.personalDetails}</span>
                  <div className="bg-black/20 rounded-3xl p-6 border border-white/10 text-white grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm md:text-base">
                    <div>
                      <span className="text-white/50 font-medium text-xs uppercase block">{t.fullName}</span>
                      <span className="font-bold">{personal.firstName} {personal.lastName}</span>
                    </div>
                    <div>
                      <span className="text-white/50 font-medium text-xs uppercase block">{t.nicNumber}</span>
                      <span className="font-bold">{personal.nic}</span>
                    </div>
                    <div>
                      <span className="text-white/50 font-medium text-xs uppercase block">{t.mobileNumber}</span>
                      <span className="font-bold">{personal.mobile}</span>
                    </div>
                    <div>
                      <span className="text-white/50 font-medium text-xs uppercase block">{t.emailAddress}</span>
                      <span className="font-bold">{personal.email}</span>
                    </div>
                    <div>
                      <span className="text-white/50 font-medium text-xs uppercase block">{t.dob}</span>
                      <span className="font-bold">{personal.dob}</span>
                    </div>
                    <div>
                      <span className="text-white/50 font-medium text-xs uppercase block">{t.location}</span>
                      <span className="font-bold">{personal.city}, {personal.province}</span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-white/50 font-medium text-xs uppercase block">{t.resAddress}</span>
                      <span className="font-bold">{personal.address}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Vehicles details review block */}
              {vehicles.length > 0 && (
                <div className="flex flex-col gap-3">
                  <span className="text-white font-bold text-base select-none">{t.vehicleDetails} ({vehicles.length})</span>
                  <div className="flex flex-col gap-4">
                    {vehicles.map((v, index) => (
                      <div key={index} className="bg-black/20 rounded-3xl p-6 border border-white/10 text-white grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm md:text-base">
                        <div className="md:col-span-2 border-b border-white/10 pb-2 flex justify-between select-none items-center">
                          <span className="font-bold text-orange-400 flex items-center gap-2">
                            <span>{getVehicleIconSvg(v.vehicleType)}</span>
                            <span>{lang === "si" ? `වාහනය #${index + 1}` : lang === "ta" ? `வாகனம் #${index + 1}` : `Vehicle #${index + 1}`}</span>
                          </span>
                          <span className="text-xs uppercase bg-white/10 px-3 py-1 rounded-full">{v.vehicleType}</span>
                        </div>
                        <div>
                          <span className="text-white/50 font-medium text-xs uppercase block">{t.numberPlate}</span>
                          <span className="font-bold">{formatNumberPlate(v.numberPlate)}</span>
                        </div>
                        <div>
                          <span className="text-white/50 font-medium text-xs uppercase block">{t.brandCompany}</span>
                          <span className="font-bold">{v.company}</span>
                        </div>
                        <div>
                          <span className="text-white/50 font-medium text-xs uppercase block">{t.modelYear}</span>
                          <span className="font-bold">{v.model} ({v.year})</span>
                        </div>
                        <div>
                          <span className="text-white/50 font-medium text-xs uppercase block">{t.engineNumber}</span>
                          <span className="font-bold">{v.engineNumber}</span>
                        </div>
                        <div>
                          <span className="text-white/50 font-medium text-xs uppercase block">{t.chassisNumber}</span>
                          <span className="font-bold">{v.chassisNumber}</span>
                        </div>
                        <div>
                          <span className="text-white/50 font-medium text-xs uppercase block">{t.policyNo}</span>
                          <span className="font-bold">{v.policyNumber}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents check block */}
              <div className="flex flex-col gap-3">
                <span className="text-white font-bold text-base select-none">{t.verifiedDocs}</span>
                <div className="bg-black/20 rounded-3xl p-6 border border-white/10 text-white grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm md:text-base">
                  <div className="min-w-0">
                    <span className="text-white/50 font-medium text-xs uppercase block select-none">{t.kycFront}</span>
                    <span className="text-green-400 font-bold flex items-center gap-1.5 w-full min-w-0">
                      <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4 text-green-400 shrink-0" strokeWidth={2.5} />
                      <span className="shrink-0">{t.verified}</span>
                      <span className="truncate min-w-0 block" title={nicFrontName || "nic_front.png"}>
                        {nicFrontName || "nic_front.png"}
                      </span>
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-white/50 font-medium text-xs uppercase block select-none">{t.kycBack}</span>
                    <span className="text-green-400 font-bold flex items-center gap-1.5 w-full min-w-0">
                      <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4 text-green-400 shrink-0" strokeWidth={2.5} />
                      <span className="shrink-0">{t.verified}</span>
                      <span className="truncate min-w-0 block" title={nicBackName || "nic_back.png"}>
                        {nicBackName || "nic_back.png"}
                      </span>
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-white/50 font-medium text-xs uppercase block select-none">{t.vehicleReg}</span>
                    <span className="text-green-400 font-bold flex items-center gap-1.5 w-full min-w-0">
                      <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4 text-green-400 shrink-0" strokeWidth={2.5} />
                      <span className="shrink-0">{t.verified}</span>
                      <span className="truncate min-w-0 block" title={vehicleRegName || "vehicle_registration.png"}>
                        {vehicleRegName || "vehicle_registration.png"}
                      </span>
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-white/50 font-medium text-xs uppercase block select-none">{t.revenueLicense}</span>
                    <span className="text-green-400 font-bold flex items-center gap-1.5 w-full min-w-0">
                      <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4 text-green-400 shrink-0" strokeWidth={2.5} />
                      <span className="shrink-0">{t.verified}</span>
                      <span className="truncate min-w-0 block" title={revenueLicenseName || "revenue_license.png"}>
                        {revenueLicenseName || "revenue_license.png"}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Consent Form checkboxes */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
              <label className="flex items-start gap-3 text-white text-sm select-none cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded text-orange-500 focus:ring-orange-400 cursor-pointer transition-all duration-300"
                />
                <span>
                  {t.agreeTerms}
                </span>
              </label>

              <label className="flex items-start gap-3 text-white text-sm select-none cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={consentData}
                  onChange={(e) => setConsentData(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded text-orange-500 focus:ring-orange-400 cursor-pointer transition-all duration-300"
                />
                <span>
                  {t.agreeConsent}
                </span>
              </label>
            </form>

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

              {/* Confirm & Submit button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-[#ff9800] hover:bg-[#ff8f00] active:bg-[#f57c00] text-white font-bold py-3 px-8 rounded-full transition-all duration-300 transform hover:scale-[1.04] active:scale-95 shadow-lg shadow-orange-500/35 text-center text-base cursor-pointer select-none outline-none border-none disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <HugeiconsIcon icon={Loading03Icon} className="animate-spin h-5 w-5 text-white" strokeWidth={2} />
                    <span>{t.submitting}</span>
                  </>
                ) : (
                  t.confirmBtn
                )}
              </button>

            </div>

            {/* DONE MODAL ON SUBMIT SUCCESS */}
            {showSuccessModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0e3b44]/70 backdrop-blur-md transition-all duration-300">
                <div className="bg-[#0e3b44] border border-white/20 rounded-[2.5rem] w-full max-w-md p-8 md:p-10 shadow-2xl flex flex-col items-center justify-center text-center animate-scale-up">
                  
                  {/* Big Glowing Success Checkmark */}
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center border border-green-400/40 shadow-[0_0_20px_rgba(74,222,128,0.4)] animate-[pulse_1.5s_infinite] shrink-0">
                    <HugeiconsIcon icon={Tick01Icon} className="w-8 h-8 text-green-400" strokeWidth={3} />
                  </div>
                  
                  {/* Done Title */}
                  <h3 className="text-white text-2xl font-bold tracking-wide mt-5 select-none">{t.successDone}</h3>
                  
                  {/* Reference Number Pill */}
                  <div className="bg-[#d9d9d9] text-[#0e3b44] font-bold px-8 py-3 rounded-full text-lg tracking-wider shadow-inner select-all mt-4">
                    {refNumber}
                  </div>
                  
                  {/* Detail message */}
                  <p className="text-white/90 text-sm font-medium leading-relaxed max-w-sm mt-4">
                    {t.successMsg}
                  </p>

                  {/* Redirection indicator */}
                  <div className="flex items-center gap-2 mt-6 text-xs text-orange-400 font-bold uppercase tracking-widest select-none">
                    <HugeiconsIcon icon={Loading03Icon} className="animate-spin h-4 w-4 text-orange-400" strokeWidth={2} />
                    {t.redirecting}
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      </div>

      <LoginFooter />
    </div>
  );
}
