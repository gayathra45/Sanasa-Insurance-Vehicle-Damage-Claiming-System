"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/Components/Homepage/Navbar";
import LoginFooter from "@/app/Components/Login/Footer";
import { compressImage } from "../../utils/imageCompressor";
import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon, Upload01Icon, IdCardIcon, File01Icon, LicenseIcon, Tick01Icon, Alert02Icon, Loading03Icon } from "@hugeicons/core-free-icons";

const translations = {
  en: {
    createAccount: "Create an Account",
    descHint: "Follow the steps to register your account with Sanasa General Insurance.",
    stepIndicator: "STEP 03 OF 04",
    identityTitle: "Identity Verification",
    uploadTitle: "Upload Required Documents",
    uploadDesc: "Upload clear scans or photos of required documents (JPG, PNG or PDF - Max 5MB each)",
    nicFront: "NIC Front",
    nicBack: "NIC Back",
    vehicleReg: "Vehicle Registration",
    revenueLicense: "Revenue License",
    required: "Required",
    uploadingFront: "Uploading Front Side...",
    uploadingBack: "Uploading Back Side...",
    uploadingReg: "Uploading Vehicle Registration...",
    uploadingRev: "Uploading Revenue License...",
    uploadCompleted: "Upload Completed",
    deleteFile: "Delete File",
    warningText: "All documents must be clear and legible. Incomplete submissions will delay account activation.",
    backBtn: "Back",
    nextBtn: "Next",
    validationMsg: "Please upload and complete verification for all required documents."
  },
  si: {
    createAccount: "ගිණුමක් සාදන්න",
    descHint: "සනස සාමාන්‍ය රක්ෂණය සමඟ ඔබේ ගිණුම ලියාපදිංචි කිරීමට පියවර අනුගමනය කරන්න.",
    stepIndicator: "පියවර 04 න් 03 වන පියවර",
    identityTitle: "අනන්‍යතාවය තහවුරු කිරීම",
    uploadTitle: "අවශ්‍ය ලියකියවිලි උඩුගත කරන්න",
    uploadDesc: "අවශ්‍ය ලේඛනවල පැහැදිලි ඡායාරූප හෝ ස්කෑන් පිටපත් උඩුගත කරන්න (JPG, PNG හෝ PDF - උපරිම 5MB)",
    nicFront: "හැඳුනුම්පතේ ඉදිරිපස",
    nicBack: "හැඳුනුම්පතේ පසුපස",
    vehicleReg: "වාහන ලියාපදිංචි සහතිකය",
    revenueLicense: "ආදායම් බලපත්‍රය",
    required: "අනිවාර්යයි",
    uploadingFront: "ඉදිරිපස උඩුගත වෙමින් පවතී...",
    uploadingBack: "පසුපස උඩුගත වෙමින් පවතී...",
    uploadingReg: "වාහන ලියාපදිංචි සහතිකය උඩුගත වෙමින් පවතී...",
    uploadingRev: "ආදායම් බලපත්‍රය උඩුගත වෙමින් පවතී...",
    uploadCompleted: "උඩුගත කිරීම අවසන්",
    deleteFile: "මකා දමන්න",
    warningText: "සියලුම ලියකියවිලි පැහැදිලි විය යුතුය. අසම්පූර්ණ ලියකියවිලි මගින් ගිණුම සක්‍රිය කිරීම ප්‍රමාද විය හැක.",
    backBtn: "ආපසු",
    nextBtn: "ඊළඟ",
    validationMsg: "කරුණාකර සියලුම අනිවාර්ය ලියකියවිලි උඩුගත කර තහවුරු කරන්න."
  },
  ta: {
    createAccount: "கணக்கை உருவாக்கு",
    descHint: "சனச பொதுக் காப்பீட்டில் உங்கள் கணக்கைப் பதிவு செய்ய படிகளைப் பின்பற்றவும்.",
    stepIndicator: "படி 03 இல் 04",
    identityTitle: "அடையாள சரிபார்ப்பு",
    uploadTitle: "தேவையான ஆவணங்களை பதிவேற்றவும்",
    uploadDesc: "தேவையான ஆவணங்களின் தெளிவான புகைப்படங்கள் அல்லது ஸ்கேன் பிரதிகளைப் பதிவேற்றவும் (JPG, PNG அல்லது PDF - அதிகபட்சம் 5MB)",
    nicFront: "அடையாள அட்டை முன் பக்கம்",
    nicBack: "அடையாள அட்டை பின் பக்கம்",
    vehicleReg: "வாகன பதிவு சான்றிதழ்",
    revenueLicense: "வருமான வரி உரிமம் (Revenue License)",
    required: "தேவையானது",
    uploadingFront: "முன் பக்கம் பதிவேற்றப்படுகிறது...",
    uploadingBack: "பின் பக்கம் பதிவேற்றப்படுகிறது...",
    uploadingReg: "வாகன பதிவு சான்றிதழ் பதிவேற்றப்படுகிறது...",
    uploadingRev: "வருமான வரி உரிமம் பதிவேற்றப்படுகிறது...",
    uploadCompleted: "பதிவேற்றம் முடிந்தது",
    deleteFile: "நீக்குக",
    warningText: "அனைத்து ஆவணங்களும் தெளிவாக இருக்க வேண்டும். முழுமையற்ற சமர்ப்பிப்புகள் கணக்குச் செயல்பாட்டைத் தாமதப்படுத்தும்.",
    backBtn: "முன்னால்",
    nextBtn: "அடுத்து",
    validationMsg: "தயவுசெய்து தேவையான அனைத்து ஆவணங்களையும் பதிவேற்றி சரிபார்ப்பை முடிக்கவும்."
  }
};

export default function SignUpPage2() {
  const [lang, setLang] = useState<"en" | "si" | "ta">("en");
  const router = useRouter();
  const [validationError, setValidationError] = useState("");

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

  // Upload slots state
  const [nicFront, setNicFront] = useState<File | null>(null);
  const [nicFrontProgress, setNicFrontProgress] = useState(0);
  const [nicFrontStatus, setNicFrontStatus] = useState<"idle" | "uploading" | "done">("idle");

  const [nicBack, setNicBack] = useState<File | null>(null);
  const [nicBackProgress, setNicBackProgress] = useState(0);
  const [nicBackStatus, setNicBackStatus] = useState<"idle" | "uploading" | "done">("idle");

  const [vehicleReg, setVehicleReg] = useState<File | null>(null);
  const [vehicleRegProgress, setVehicleRegProgress] = useState(0);
  const [vehicleRegStatus, setVehicleRegStatus] = useState<"idle" | "uploading" | "done">("idle");

  const [revenueLicense, setRevenueLicense] = useState<File | null>(null);
  const [revenueLicenseProgress, setRevenueLicenseProgress] = useState(0);
  const [revenueLicenseStatus, setRevenueLicenseStatus] = useState<"idle" | "uploading" | "done">("idle");

  // Load state from sessionStorage on mount (if files were already uploaded previously, we can simulate loading them)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedFront = sessionStorage.getItem("signup_nic_front_uploaded");
      const savedBack = sessionStorage.getItem("signup_nic_back_uploaded");
      const savedVehicleReg = sessionStorage.getItem("signup_vehicle_reg_uploaded");
      const savedRevenueLicense = sessionStorage.getItem("signup_revenue_license_uploaded");

      const savedFrontName = sessionStorage.getItem("signup_nic_front_name") || "nic_front.png";
      const savedBackName = sessionStorage.getItem("signup_nic_back_name") || "nic_back.png";
      const savedVehicleRegName = sessionStorage.getItem("signup_vehicle_reg_name") || "vehicle_reg.png";
      const savedRevenueLicenseName = sessionStorage.getItem("signup_revenue_license_name") || "revenue_license.png";

      if (savedFront) {
        setNicFront(new File([], savedFrontName));
        setNicFrontStatus("done");
        setNicFrontProgress(100);
      }
      if (savedBack) {
        setNicBack(new File([], savedBackName));
        setNicBackStatus("done");
        setNicBackProgress(100);
      }
      if (savedVehicleReg) {
        setVehicleReg(new File([], savedVehicleRegName));
        setVehicleRegStatus("done");
        setVehicleRegProgress(100);
      }
      if (savedRevenueLicense) {
        setRevenueLicense(new File([], savedRevenueLicenseName));
        setRevenueLicenseStatus("done");
        setRevenueLicenseProgress(100);
      }
    }
  }, []);

  // Simulating File Upload Progress & converting to base64
  const simulateUpload = async (type: "front" | "back" | "vehicleReg" | "revenueLicense", file: File) => {
    try {
      const base64String = await compressImage(file);
      if (type === "front") {
        setNicFront(file);
        setNicFrontStatus("uploading");
        setNicFrontProgress(0);
        let progress = 0;
        const interval = setInterval(() => {
          progress += 25;
          if (progress >= 100) {
            progress = 100;
            setNicFrontStatus("done");
            if (typeof window !== "undefined") {
              sessionStorage.setItem("signup_nic_front_uploaded", base64String);
              sessionStorage.setItem("signup_nic_front_name", file.name);
            }
            clearInterval(interval);
          }
          setNicFrontProgress(progress);
        }, 100);
      } else if (type === "back") {
        setNicBack(file);
        setNicBackStatus("uploading");
        setNicBackProgress(0);
        let progress = 0;
        const interval = setInterval(() => {
          progress += 25;
          if (progress >= 100) {
            progress = 100;
            setNicBackStatus("done");
            if (typeof window !== "undefined") {
              sessionStorage.setItem("signup_nic_back_uploaded", base64String);
              sessionStorage.setItem("signup_nic_back_name", file.name);
            }
            clearInterval(interval);
          }
          setNicBackProgress(progress);
        }, 100);
      } else if (type === "vehicleReg") {
        setVehicleReg(file);
        setVehicleRegStatus("uploading");
        setVehicleRegProgress(0);
        let progress = 0;
        const interval = setInterval(() => {
          progress += 25;
          if (progress >= 100) {
            progress = 100;
            setVehicleRegStatus("done");
            if (typeof window !== "undefined") {
              sessionStorage.setItem("signup_vehicle_reg_uploaded", base64String);
              sessionStorage.setItem("signup_vehicle_reg_name", file.name);
            }
            clearInterval(interval);
          }
          setVehicleRegProgress(progress);
        }, 100);
      } else if (type === "revenueLicense") {
        setRevenueLicense(file);
        setRevenueLicenseStatus("uploading");
        setRevenueLicenseProgress(0);
        let progress = 0;
        const interval = setInterval(() => {
          progress += 25;
          if (progress >= 100) {
            progress = 100;
            setRevenueLicenseStatus("done");
            if (typeof window !== "undefined") {
              sessionStorage.setItem("signup_revenue_license_uploaded", base64String);
              sessionStorage.setItem("signup_revenue_license_name", file.name);
            }
            clearInterval(interval);
          }
          setRevenueLicenseProgress(progress);
        }, 100);
      }
    } catch (err) {
      console.error("Image compression error:", err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (type: "front" | "back" | "vehicleReg" | "revenueLicense", e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      simulateUpload(type, files[0]);
    }
  };

  // Navigate to Step 4
  const handleNextStep = () => {
    setValidationError("");

    if (
      !nicFront || nicFrontStatus !== "done" ||
      !nicBack || nicBackStatus !== "done" ||
      !vehicleReg || vehicleRegStatus !== "done" ||
      !revenueLicense || revenueLicenseStatus !== "done"
    ) {
      setValidationError(t.validationMsg);
      return;
    }

    router.push("/SignUp/page3");
  };

  // Navigate back to Step 2
  const handleBackStep = () => {
    router.push("/SignUp/page1");
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
        <div className="absolute inset-0 bg-gradient-to-br from-[#0c3945]/90 via-[#125867]/75 to-[#0b333b]/90 pointer-events-none" />
        
        {/* Modern glowing ambient lights */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-400/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-300/15 blur-[120px] pointer-events-none" />

        {/* Content Wizard Box */}
        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 md:px-8 flex flex-col items-center gap-8">
          
          {/* Header Title */}
          <div className="text-center select-none flex flex-col gap-2">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight drop-shadow-[0_4px_10px_rgba(0,0,0,0.3)] leading-tight">
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
                const isActive = num === 3;
                const isCompleted = num < 3;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      if (num === 1) {
                        router.push("/SignUp");
                      } else if (num === 2) {
                        router.push("/SignUp/page1");
                      }
                    }}
                    disabled={num >= 3}
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
              <h2 className="text-xl md:text-2xl font-extrabold text-white">
                {t.identityTitle}
              </h2>
            </div>
          </div>

          {/* MAIN GLASSMORPHIC CARD */}
          <div className="w-full max-w-4xl bg-[#0e3b44]/45 backdrop-blur-md border border-white/20 rounded-[2.5rem] p-6 md:p-12 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] flex flex-col gap-8 transition-all duration-500 hover:border-white/25">
            
            {/* Show Validation Error Banner if present */}
            {validationError && (
              <div className="bg-red-500/20 border-l-4 border-red-500 p-4 rounded-xl text-white text-sm flex items-center gap-3 animate-pulse">
                <HugeiconsIcon icon={AlertCircleIcon} className="w-5 h-5 flex-shrink-0 text-red-400" strokeWidth={2} />
                <span>{validationError}</span>
              </div>
            )}

            {/* Form Title & Icon */}
            <div className="flex items-center gap-3 border-b border-white/15 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/20 flex items-center justify-center border border-orange-400/40 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.25)]">
                <HugeiconsIcon icon={Upload01Icon} className="w-6 h-6" strokeWidth={2} />
              </div>
              <h2 className="text-white text-2xl font-bold tracking-wide select-none">
                {t.uploadTitle}
              </h2>
            </div>

            <p className="text-white/85 text-sm md:text-base select-none">
              {t.uploadDesc}
            </p>

            {/* Upload drag & drop components - 2x2 Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-4">
              
              {/* NIC Front Side Card */}
              <div className="flex flex-col gap-3">
                <div
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop("front", e)}
                  className={`relative border-2 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[200px] bg-white/5 ${
                    nicFrontStatus === "done" 
                      ? "border-green-400 bg-green-500/5"
                      : "border-white/20 hover:border-white/40 hover:bg-white/10"
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        simulateUpload("front", e.target.files[0]);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />

                  {nicFrontStatus === "idle" && (
                    <div className="flex flex-col items-center gap-2 text-white/85">
                      <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center p-2 mb-2 text-orange-400">
                        <HugeiconsIcon icon={IdCardIcon} className="w-8 h-8" strokeWidth={1.8} />
                      </div>
                      <span className="font-bold text-sm">{t.nicFront}</span>
                      <span className="text-xs text-white/50">{t.required}</span>
                    </div>
                  )}

                  {nicFrontStatus === "uploading" && (
                    <div className="w-full flex flex-col items-center gap-4 px-4">
                      <HugeiconsIcon icon={Loading03Icon} className="animate-spin h-8 w-8 text-orange-400" strokeWidth={2} />
                      <div className="w-full">
                        <div className="flex justify-between text-xs text-white mb-1">
                          <span>{t.uploadingFront}</span>
                          <span>{nicFrontProgress}%</span>
                        </div>
                        <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-400 transition-all duration-150" style={{ width: `${nicFrontProgress}%` }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {nicFrontStatus === "done" && nicFront && (
                    <div className="flex flex-col items-center gap-3 w-full px-4">
                      <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center border border-green-400/40 text-green-400 shadow-[0_0_15px_rgba(74,222,128,0.25)]">
                        <HugeiconsIcon icon={Tick01Icon} className="w-6 h-6" strokeWidth={2.5} />
                      </div>
                      <span className="text-white text-sm font-bold truncate max-w-[200px]">{nicFront.name}</span>
                      <span className="text-xs text-green-400 font-semibold uppercase tracking-wider">{t.uploadCompleted}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setNicFront(null);
                          setNicFrontStatus("idle");
                          setNicFrontProgress(0);
                          if (typeof window !== "undefined") {
                            sessionStorage.removeItem("signup_nic_front_uploaded");
                          }
                        }}
                        className="mt-2 text-xs text-red-400 hover:text-red-300 font-semibold underline cursor-pointer"
                      >
                        {t.deleteFile}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* NIC Back Side Card */}
              <div className="flex flex-col gap-3">
                <div
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop("back", e)}
                  className={`relative border-2 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[200px] bg-white/5 ${
                    nicBackStatus === "done" 
                      ? "border-green-400 bg-green-500/5"
                      : "border-white/20 hover:border-white/40 hover:bg-white/10"
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        simulateUpload("back", e.target.files[0]);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />

                  {nicBackStatus === "idle" && (
                    <div className="flex flex-col items-center gap-2 text-white/85">
                      <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center p-2 mb-2 text-orange-400">
                        <HugeiconsIcon icon={IdCardIcon} className="w-8 h-8" strokeWidth={1.8} />
                      </div>
                      <span className="font-bold text-sm">{t.nicBack}</span>
                      <span className="text-xs text-white/50">{t.required}</span>
                    </div>
                  )}

                  {nicBackStatus === "uploading" && (
                    <div className="w-full flex flex-col items-center gap-4 px-4">
                      <HugeiconsIcon icon={Loading03Icon} className="animate-spin h-8 w-8 text-orange-400" strokeWidth={2} />
                      <div className="w-full">
                        <div className="flex justify-between text-xs text-white mb-1">
                          <span>{t.uploadingBack}</span>
                          <span>{nicBackProgress}%</span>
                        </div>
                        <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-400 transition-all duration-150" style={{ width: `${nicBackProgress}%` }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {nicBackStatus === "done" && nicBack && (
                    <div className="flex flex-col items-center gap-3 w-full px-4">
                      <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center border border-green-400/40 text-green-400 shadow-[0_0_15px_rgba(74,222,128,0.25)]">
                        <HugeiconsIcon icon={Tick01Icon} className="w-6 h-6" strokeWidth={2.5} />
                      </div>
                      <span className="text-white text-sm font-bold truncate max-w-[200px]">{nicBack.name}</span>
                      <span className="text-xs text-green-400 font-semibold uppercase tracking-wider">{t.uploadCompleted}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setNicBack(null);
                          setNicBackStatus("idle");
                          setNicBackProgress(0);
                          if (typeof window !== "undefined") {
                            sessionStorage.removeItem("signup_nic_back_uploaded");
                          }
                        }}
                        className="mt-2 text-xs text-red-400 hover:text-red-300 font-semibold underline cursor-pointer"
                      >
                        {t.deleteFile}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Vehicle Registration Card */}
              <div className="flex flex-col gap-3">
                <div
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop("vehicleReg", e)}
                  className={`relative border-2 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[200px] bg-white/5 ${
                    vehicleRegStatus === "done" 
                      ? "border-green-400 bg-green-500/5"
                      : "border-white/20 hover:border-white/40 hover:bg-white/10"
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        simulateUpload("vehicleReg", e.target.files[0]);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />

                  {vehicleRegStatus === "idle" && (
                    <div className="flex flex-col items-center gap-2 text-white/85">
                      <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center p-2 mb-2 text-orange-400">
                        <HugeiconsIcon icon={File01Icon} className="w-8 h-8" strokeWidth={1.8} />
                      </div>
                      <span className="font-bold text-sm">{t.vehicleReg}</span>
                      <span className="text-xs text-white/50">{t.required}</span>
                    </div>
                  )}

                  {vehicleRegStatus === "uploading" && (
                    <div className="w-full flex flex-col items-center gap-4 px-4">
                      <HugeiconsIcon icon={Loading03Icon} className="animate-spin h-8 w-8 text-orange-400" strokeWidth={2} />
                      <div className="w-full">
                        <div className="flex justify-between text-xs text-white mb-1">
                          <span>{t.uploadingReg}</span>
                          <span>{vehicleRegProgress}%</span>
                        </div>
                        <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-400 transition-all duration-150" style={{ width: `${vehicleRegProgress}%` }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {vehicleRegStatus === "done" && vehicleReg && (
                    <div className="flex flex-col items-center gap-3 w-full px-4">
                      <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center border border-green-400/40 text-green-400 shadow-[0_0_15px_rgba(74,222,128,0.25)]">
                        <HugeiconsIcon icon={Tick01Icon} className="w-6 h-6" strokeWidth={2.5} />
                      </div>
                      <span className="text-white text-sm font-bold truncate max-w-[200px]">{vehicleReg.name}</span>
                      <span className="text-xs text-green-400 font-semibold uppercase tracking-wider">{t.uploadCompleted}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setVehicleReg(null);
                          setVehicleRegStatus("idle");
                          setVehicleRegProgress(0);
                          if (typeof window !== "undefined") {
                            sessionStorage.removeItem("signup_vehicle_reg_uploaded");
                          }
                        }}
                        className="mt-2 text-xs text-red-400 hover:text-red-300 font-semibold underline cursor-pointer"
                      >
                        {t.deleteFile}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Revenue License Card */}
              <div className="flex flex-col gap-3">
                <div
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop("revenueLicense", e)}
                  className={`relative border-2 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[200px] bg-white/5 ${
                    revenueLicenseStatus === "done" 
                      ? "border-green-400 bg-green-500/5"
                      : "border-white/20 hover:border-white/40 hover:bg-white/10"
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        simulateUpload("revenueLicense", e.target.files[0]);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />

                  {revenueLicenseStatus === "idle" && (
                    <div className="flex flex-col items-center gap-2 text-white/85">
                      <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center p-2 mb-2 text-orange-400">
                        <HugeiconsIcon icon={LicenseIcon} className="w-8 h-8" strokeWidth={1.8} />
                      </div>
                      <span className="font-bold text-sm">{t.revenueLicense}</span>
                      <span className="text-xs text-white/50">{t.required}</span>
                    </div>
                  )}

                  {revenueLicenseStatus === "uploading" && (
                    <div className="w-full flex flex-col items-center gap-4 px-4">
                      <HugeiconsIcon icon={Loading03Icon} className="animate-spin h-8 w-8 text-orange-400" strokeWidth={2} />
                      <div className="w-full">
                        <div className="flex justify-between text-xs text-white mb-1">
                          <span>{t.uploadingRev}</span>
                          <span>{revenueLicenseProgress}%</span>
                        </div>
                        <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-400 transition-all duration-150" style={{ width: `${revenueLicenseProgress}%` }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {revenueLicenseStatus === "done" && revenueLicense && (
                    <div className="flex flex-col items-center gap-3 w-full px-4">
                      <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center border border-green-400/40 text-green-400 shadow-[0_0_15px_rgba(74,222,128,0.25)]">
                        <HugeiconsIcon icon={Tick01Icon} className="w-6 h-6" strokeWidth={2.5} />
                      </div>
                      <span className="text-white text-sm font-bold truncate max-w-[200px]">{revenueLicense.name}</span>
                      <span className="text-xs text-green-400 font-semibold uppercase tracking-wider">{t.uploadCompleted}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRevenueLicense(null);
                          setRevenueLicenseStatus("idle");
                          setRevenueLicenseProgress(0);
                          if (typeof window !== "undefined") {
                            sessionStorage.removeItem("signup_revenue_license_uploaded");
                          }
                        }}
                        className="mt-2 text-xs text-red-400 hover:text-red-300 font-semibold underline cursor-pointer"
                      >
                        {t.deleteFile}
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Warning Info Badge under upload zones */}
            <div className="flex items-center justify-center w-full mt-2">
              <div className="bg-white/10 border border-white/5 backdrop-blur-sm px-6 py-3 rounded-full flex items-center gap-2.5 text-white/95 text-xs sm:text-sm shadow-md max-w-2xl text-center select-none">
                <span className="text-yellow-400 text-lg flex items-center">⚠️</span>
                <span>{t.warningText}</span>
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

