"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/app/Components/Homepage/Navbar";
import Footer from "@/app/Components/Login/Footer";
import { API_URL } from "@/app/config";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserIcon,
  LockIcon,
  ViewIcon,
  ViewOffSlashIcon,
  AlertCircleIcon,
  InformationCircleIcon,
  Cancel01Icon
} from "@hugeicons/core-free-icons";

const translations = {
  en: {
    loginTitle: "Login",
    loginSubtitle: "Welcome back! Please enter your credentials to continue.",
    nicOrEmail: "NIC or Email Address",
    nicEmailHint: "Policy Holders: Use NIC or Email · Agents/Staff/Admins: Use Email",
    nicEmailPlaceholder: "Enter your NIC or Email address",
    password: "Password",
    passwordPlaceholder: "Enter your password",
    confirmBtn: "Confirm",
    createAccount: "Create an Account",
    resetPassword: "Reset Password",
    loginFailed: "Login failed.",
    connError: "Unable to connect to the server. Please verify the backend is running.",
    unknownRole: "Unknown user role returned from server."
  },
  si: {
    loginTitle: "ලොගින් වන්න",
    loginSubtitle: "නැවත සාදරයෙන් පිළිගනිමු! කරුණාකර ඔබගේ තොරතුරු ඇතුළත් කරන්න.",
    nicOrEmail: "ජාතික හැඳුනුම්පත් අංකය හෝ විද්‍යුත් තැපෑල",
    nicEmailHint: "ප්‍රතිපත්ති හිමියන්: හැඳුනුම්පත හෝ විද්‍යුත් තැපෑල · නියෝජිතයින්/කාර්ය මණ්ඩලය: විද්‍යුත් තැපෑල",
    nicEmailPlaceholder: "ජාතික හැඳුනුම්පත හෝ විද්‍යුත් තැපැල් ලිපිනය ඇතුළත් කරන්න",
    password: "මුරපදය",
    passwordPlaceholder: "ඔබගේ මුරපදය ඇතුළත් කරන්න",
    confirmBtn: "තහවුරු කරන්න",
    createAccount: "ගිණුමක් සාදන්න",
    resetPassword: "මුරපදය අලුත් කරන්න",
    loginFailed: "ඇතුල් වීම අසාර්ථක විය.",
    connError: "සේවාදායකයට සම්බන්ධ විය නොහැක. කරුණාකර පසුබිම් සේවාව ක්‍රියාත්මක දැයි පරීක්ෂා කරන්න.",
    unknownRole: "සේවාදායකයෙන් නොදන්නා පරිශීලක භූමිකාවක් ලැබුණි."
  },
  ta: {
    loginTitle: "உள்நுழைக",
    loginSubtitle: "மீண்டும் வருக! தொடர உங்கள் விவரங்களை உள்ளிடவும்.",
    nicOrEmail: "அடையாள அட்டை அல்லது மின்னஞ்சல் முகவரி",
    nicEmailHint: "பாலிசிதாரர்கள்: அட்டை எண் அல்லது மின்னஞ்சல் · முகவர்கள்/ஊழியர்கள்: மின்னஞ்சல்",
    nicEmailPlaceholder: "அடையாள அட்டை அல்லது மின்னஞ்சல் முகவரியை உள்ளிடவும்",
    password: "கடவுச்சொல்",
    passwordPlaceholder: "உங்கள் கடவுச்சொல்லை உள்ளிடவும்",
    confirmBtn: "உறுதிப்படுத்துக",
    createAccount: "கணக்கை உருவாக்கு",
    resetPassword: "கடவுச்சொல்லை மீட்டமை",
    loginFailed: "உள்நுழைவு தோல்வியடைந்தது.",
    connError: "சேவையகத்துடன் இணைக்க முடியவில்லை. பின்னணி சேவை இயங்குகிறதா என சரிபார்க்கவும்.",
    unknownRole: "சேவையகத்திலிருந்து அறியப்படாத பயனர் பங்கு பெறப்பட்டது."
  }
};

export default function Login() {
  const [lang, setLang] = useState<"en" | "si" | "ta">("en");
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState("");

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

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.clear();
      const params = new URLSearchParams(window.location.search);
      const msg = params.get("message");
      if (msg) {
        setInfoMessage(msg);
      }
    }
  }, []);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, password })
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || t.loginFailed);
        return;
      }

      if (data.role === "policy_holder") {
        sessionStorage.setItem("logged_in_user", JSON.stringify(data.user));
        router.push("/Policy_Holder/Home");
      } else if (data.role === "insurance_agent") {
        sessionStorage.setItem("logged_in_agent", JSON.stringify(data.agent));
        router.push("/Agent/Dashboard");
      } else if (data.role === "office_staff") {
        sessionStorage.setItem("logged_in_staff", JSON.stringify(data.staff));
        router.push("/Office_Staff/Dashboard");
      } else if (data.role === "admin") {
        sessionStorage.setItem("logged_in_admin", JSON.stringify(data.admin));
        router.push("/Admin/Dashboard");
      } else {
        setError(t.unknownRole);
      }
    } catch (err) {
      console.error("Login request failed", err);
      setError(t.connError);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between">
      <Navbar />
      <div
        className="relative flex-1 w-full flex items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat min-h-[calc(100vh-140px)] py-8 md:py-12"
        style={{
          backgroundImage: "url('/login_bg.jpg')",
        }}
      >
        {/* Visual Teal/Blue Overlay Layers for Modern Depth */}
        <div className="absolute inset-0 bg-[#0e3b44]/75 mix-blend-multiply pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0c3945]/90 via-[#125867]/75 to-[#0b333b]/90 pointer-events-none" />

        {/* Floating ambient light effects */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-400/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-300/15 blur-[120px] pointer-events-none" />

        {/* Main Centered Container */}
        <div className="relative z-10 w-full max-w-xl mx-auto px-4 sm:px-6 flex flex-col items-center justify-center my-auto">
          
          {/* Glass effect Login Card */}
          <div className="w-full max-w-[500px] bg-white/10 backdrop-blur-md border border-white/20 rounded-[2.5rem] p-8 sm:p-10 md:p-12 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] flex flex-col gap-6 transition-all duration-300 hover:border-white/30">
            
            {/* Top Center Title */}
            <div className="flex flex-col items-center text-center -mt-2 mb-1">
              <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight select-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.3)]">
                {t.loginTitle}
              </h1>
              <p className="text-white/70 text-sm mt-2 font-medium">
                {t.loginSubtitle}
              </p>
            </div>
            
            {error && (
              <div className="flex items-start gap-3 bg-red-500/15 backdrop-blur-md border border-red-500/30 text-red-100 p-4 rounded-2xl transition-all duration-300 shadow-[0_4px_20px_rgba(239,68,68,0.2)] relative overflow-hidden text-sm">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-l-2xl" />
                <span className="text-red-400 mt-0.5 shrink-0 pl-1">
                  <HugeiconsIcon icon={AlertCircleIcon} className="w-5 h-5" strokeWidth={2} />
                </span>
                <div className="flex-1 font-semibold pr-4 leading-relaxed">
                  {error}
                </div>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="absolute right-3 top-3 text-red-400/80 hover:text-red-100 transition-colors focus:outline-none cursor-pointer border-none bg-transparent"
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>
            )}

            {infoMessage && (
              <div className="bg-blue-500/20 border-l-4 border-blue-400 p-4 rounded-xl text-white text-sm flex items-start gap-3">
                <HugeiconsIcon icon={InformationCircleIcon} className="w-5 h-5 flex-shrink-0 text-blue-300 mt-0.5" strokeWidth={2} />
                <span>{infoMessage}</span>
              </div>
            )}

            <form onSubmit={handleConfirm} className="flex flex-col gap-6">
              
              {/* Unified NIC / Email Input Field */}
              <div className="flex flex-col gap-2">
                <label className="text-white text-base font-semibold tracking-wide ml-1 select-none">
                  {t.nicOrEmail}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-700">
                    <HugeiconsIcon icon={UserIcon} className="w-5 h-5 text-slate-400" strokeWidth={2} />
                  </span>
                  <input
                    type="text"
                    required
                    value={loginId}
                    onChange={(e) => {
                      setLoginId(e.target.value);
                      if (error) setError(null);
                    }}
                    className="w-full bg-white text-slate-800 rounded-2xl py-4 pl-12 pr-4 text-base focus:outline-none focus:ring-2 focus:ring-orange-400 focus:shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all placeholder:text-gray-400 font-medium border border-transparent"
                    placeholder={t.nicEmailPlaceholder}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="flex flex-col gap-2">
                <label className="text-white text-base font-semibold tracking-wide ml-1 select-none">
                  {t.password}
                </label>

                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-700">
                    <HugeiconsIcon icon={LockIcon} className="w-5 h-5 text-slate-400" strokeWidth={2} />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    className="w-full bg-white text-slate-800 rounded-2xl py-4 pl-12 pr-12 text-base focus:outline-none focus:ring-2 focus:ring-orange-400 focus:shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all placeholder:text-gray-400 font-medium border border-transparent"
                    placeholder={t.passwordPlaceholder}
                  />
                  {password.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-700 focus:outline-none cursor-pointer border-none bg-transparent"
                    >
                      {showPassword ? (
                        <HugeiconsIcon icon={ViewOffSlashIcon} className="w-5 h-5" strokeWidth={2} />
                      ) : (
                        <HugeiconsIcon icon={ViewIcon} className="w-5 h-5" strokeWidth={2} />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Confirm Button */}
              <button
                type="submit"
                className="mt-2 w-full max-w-[220px] mx-auto bg-[#ff9800] hover:bg-[#ff8f00] active:bg-[#f57c00] text-white font-bold py-4 px-8 rounded-full transition-all duration-300 transform hover:scale-[1.04] active:scale-95 shadow-lg shadow-orange-500/35 text-center text-lg cursor-pointer select-none outline-none border-none"
              >
                {t.confirmBtn}
              </button>
            </form>

            {/* Footer Links */}
            <div className="flex justify-between items-center w-full border-t border-white/10 pt-5 text-sm text-white/85 font-medium select-none">
              <Link
                href="/SignUp"
                className="hover:text-white hover:underline transition-all cursor-pointer"
              >
                {t.createAccount}
              </Link>
              <Link
                href="/Reset_password"
                className="hover:text-white hover:underline transition-all cursor-pointer"
              >
                {t.resetPassword}
              </Link>
            </div>

          </div>

        </div>
      </div>
      <Footer />
    </div>
  );
}