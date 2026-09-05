"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/app/Components/Homepage/Navbar";
import Footer from "@/app/Components/Login/Footer";
import { API_URL } from "@/app/config";
import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon, Alert02Icon, ViewIcon, ViewOffSlashIcon, Tick01Icon, Loading03Icon } from "@hugeicons/core-free-icons";

type Stage = "loading" | "invalid" | "form" | "success";

export default function ActivateAgent() {
  const router = useRouter();

  const [token, setToken] = useState("");
  const [stage, setStage] = useState<Stage>("loading");
  const [agentName, setAgentName] = useState("");
  const [agentEmail, setAgentEmail] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [validationError, setValidationError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(3);

  // 1. Verify token on page load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    if (!urlToken) {
      setStage("invalid");
      return;
    }
    setToken(urlToken);

    // Call backend endpoint to verify token validity
    fetch(`${API_URL}/agent/verify-activation?token=${urlToken}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setAgentName(data.name || "");
          setAgentEmail(data.email || "");
          setStage("form");
        } else {
          setStage("invalid");
        }
      })
      .catch((err) => {
        console.error("Token verification error:", err);
        setStage("invalid");
      });
  }, []);

  // 2. Redirect back to login on successful activation
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (stage === "success" && redirectCountdown > 0) {
      timer = setTimeout(() => setRedirectCountdown((prev) => prev - 1), 1000);
    } else if (stage === "success" && redirectCountdown === 0) {
      router.push("/Login");
    }
    return () => clearTimeout(timer);
  }, [stage, redirectCountdown, router]);

  // Password strength checker helper
  const getStrength = () => {
    if (!newPassword) return { label: "", color: "bg-transparent", width: "w-0" };
    let score = 0;
    if (newPassword.length >= 6 && newPassword.length <= 12) score++;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword) || /[^A-Za-z0-9]/.test(newPassword)) score++;
    switch (score) {
      case 1: return { label: "Weak", color: "bg-red-500", width: "w-1/4" };
      case 2: return { label: "Fair", color: "bg-orange-500", width: "w-2/4" };
      case 3: return { label: "Good", color: "bg-yellow-500", width: "w-3/4" };
      case 4: return { label: "Strong", color: "bg-green-500", width: "w-full" };
      default: return { label: "", color: "bg-transparent", width: "w-0" };
    }
  };
  const strength = getStrength();

  // Handle Account Activation form submit
  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    if (newPassword.length < 6 || newPassword.length > 12) {
      setValidationError("Password must be between 6 and 12 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setValidationError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/agent/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to activate account.");
      }
      setStage("success");
    } catch (err: any) {
      setValidationError(err.message || "An activation error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* Eye Icons */
  const EyeOff = () => <HugeiconsIcon icon={ViewOffSlashIcon} className="w-5 h-5" strokeWidth={2} />;
  const EyeOn = () => <HugeiconsIcon icon={ViewIcon} className="w-5 h-5" strokeWidth={2} />;

  const Spinner = () => (
    <HugeiconsIcon icon={Loading03Icon} className="animate-spin h-5 w-5" strokeWidth={2.5} />
  );

  return (
    <div className="min-h-screen w-full flex flex-col relative font-sans">
      {/* Background with blend settings */}
      <div className="fixed inset-0 z-[-10] bg-cover bg-center bg-no-repeat bg-fixed pointer-events-none" style={{ backgroundImage: "url('/login_bg.jpg')" }} />
      <div className="fixed inset-0 z-[-9] bg-[#0e3b44]/75 mix-blend-multiply pointer-events-none" />
      <div className="fixed inset-0 z-[-8] bg-gradient-to-br from-[#0c3945]/90 via-[#125867]/75 to-[#0b333b]/90 pointer-events-none" />
      <div className="fixed inset-0 z-[-7] overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-400/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-300/15 blur-[120px]" />
      </div>

      <Navbar />

      <div className="relative z-10 flex-1 w-full flex items-center justify-center py-12">
        <div className="w-full max-w-6xl mx-auto px-6 py-12 flex flex-col lg:flex-row items-center justify-around gap-12 lg:gap-6 min-h-[550px]">
          
          {/* Left Column: Heading */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left text-white max-w-md select-none">
            <h1 className="text-6xl md:text-8xl font-bold tracking-tight drop-shadow-[0_4px_10px_rgba(0,0,0,0.3)] leading-[0.9]">
              Activate<br />Account
            </h1>
            <p className="mt-4 text-white/55 text-sm max-w-xs leading-relaxed">
              {stage === "loading" && "Validating your verification credentials..."}
              {stage === "invalid" && "This link is no longer valid or has expired. Please contact your administrator."}
              {stage === "form" && `Hello ${agentName || "Agent"}, set your account password below to activate agent dashboard access.`}
              {stage === "success" && "Account activated successfully! Redirecting you to login portal..."}
            </p>
          </div>

          {/* Right Column: Card form */}
          <div className="relative w-full max-w-[500px] bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 sm:p-8 md:p-12 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] flex flex-col gap-6 transition-all duration-500 hover:border-white/30 overflow-hidden">
            
            {/* Error alerts */}
            {validationError && (
              <div className="bg-red-500/20 border-l-4 border-red-500 p-4 rounded-xl text-white text-sm flex items-start gap-3">
                <HugeiconsIcon icon={AlertCircleIcon} className="w-5 h-5 flex-shrink-0 text-red-400 mt-0.5" strokeWidth={2} />
                <span>{validationError}</span>
              </div>
            )}

            {/* STAGE: Loading */}
            {stage === "loading" && (
              <div className="flex flex-col items-center justify-center py-16 gap-4 text-white select-none">
                <Spinner />
                <span className="text-sm font-semibold tracking-wider text-white/70">Validating activation token...</span>
              </div>
            )}

            {/* STAGE: Invalid Link */}
            {stage === "invalid" && (
              <div className="flex flex-col items-center text-center gap-6 py-6 select-none">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30">
                  <HugeiconsIcon icon={Alert02Icon} className="w-8 h-8 text-red-400" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-white text-xl font-bold">Invalid or Expired Link</h3>
                  <p className="text-white/60 text-sm mt-2 leading-relaxed">
                    This token is invalid, expired, or has already been used to set password.
                  </p>
                </div>
                <button
                  onClick={() => router.push("/Login")}
                  className="w-full bg-white hover:bg-slate-50 text-[#0f2d4a] font-bold py-4 rounded-full transition-all text-sm outline-none border-none cursor-pointer"
                >
                  Back to Login
                </button>
              </div>
            )}

            {/* STAGE: Activation Form */}
            {stage === "form" && (
              <form onSubmit={handleActivate} className="flex flex-col gap-6">
                <div className="flex flex-col gap-1.5 border-b border-white/10 pb-4 select-none">
                  <h2 className="text-white text-2xl font-bold">Create Password</h2>
                  <p className="text-white/60 text-xs mt-1">
                    Setting password for: <strong className="text-white font-bold">{agentEmail}</strong>
                  </p>
                </div>

                {/* Password field */}
                <div className="flex flex-col gap-2">
                  <label className="text-white text-sm font-semibold tracking-wide ml-1 select-none">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-white text-slate-800 rounded-2xl py-4 pl-6 pr-12 text-base focus:outline-none focus:ring-2 focus:ring-[#0f2d4a] transition-all placeholder:text-gray-400 font-medium"
                      placeholder="Enter activation password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      {showPassword ? <EyeOff /> : <EyeOn />}
                    </button>
                  </div>

                  {newPassword && (
                    <div className="flex flex-col gap-2 px-1 bg-black/15 p-3 rounded-2xl border border-white/5">
                      <div className="flex justify-between items-center text-xs text-white/90">
                        <span className="font-semibold">Password Strength:</span>
                        <span className="font-bold uppercase tracking-wider">{strength.label}</span>
                      </div>
                      <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                        <div className={`h-full ${strength.color} ${strength.width} transition-all duration-300 rounded-full`} />
                      </div>
                      <div className="flex flex-col gap-1 text-[11px]">
                        <span className={newPassword.length >= 6 && newPassword.length <= 12 ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                          {newPassword.length >= 6 && newPassword.length <= 12 ? "✔" : "✖"} 6 to 12 characters
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password field */}
                <div className="flex flex-col gap-2">
                  <label className="text-white text-sm font-semibold tracking-wide ml-1 select-none">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-white text-slate-800 rounded-2xl py-4 pl-6 pr-12 text-base focus:outline-none focus:ring-2 focus:ring-[#0f2d4a] transition-all placeholder:text-gray-400 font-medium"
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff /> : <EyeOn />}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && <p className="text-red-400 text-xs ml-1 font-semibold">Passwords do not match</p>}
                  {confirmPassword && newPassword === confirmPassword && <p className="text-green-400 text-xs ml-1 font-semibold">✔ Passwords match</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || newPassword !== confirmPassword}
                  className="w-full bg-[#ff9800] hover:bg-[#ff8f00] active:bg-[#f57c00] text-white font-bold py-4 px-8 rounded-full transition-all duration-300 transform hover:scale-[1.04] active:scale-95 shadow-lg shadow-orange-500/35 text-lg cursor-pointer select-none outline-none border-none disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <><Spinner /> Activating...</> : "Activate Account"}
                </button>
              </form>
            )}

            {/* STAGE: Success */}
            {stage === "success" && (
              <div className="absolute inset-0 bg-[#0e3b44]/95 backdrop-blur-xl rounded-3xl flex flex-col items-center justify-center p-8 text-center z-20 transition-all duration-300">
                <div className="flex flex-col items-center max-w-sm">
                  
                  <div className="relative mb-6">
                    <div className="absolute inset-0 rounded-full bg-orange-500/30 blur-md scale-110 animate-pulse" />
                    <div className="w-20 h-20 bg-linear-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center border-2 border-white/20 shadow-[0_0_30px_rgba(249,115,22,0.4)] relative z-10">
                      <HugeiconsIcon icon={Tick01Icon} className="w-10 h-10 text-white" strokeWidth={3} />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-white text-3xl font-bold tracking-tight">Activated!</h3>
                    <p className="text-white/80 text-sm mt-3 leading-relaxed">
                      Your agent account has been activated successfully. You can now login.
                    </p>
                  </div>

                  <div className="mt-8 flex flex-col items-center w-full px-4">
                    <div className="w-48 bg-white/10 h-2 rounded-full overflow-hidden relative shadow-inner">
                      <div
                        className="bg-gradient-to-r from-orange-500 to-amber-400 h-full rounded-full transition-all duration-1000 ease-linear"
                        style={{ width: `${(redirectCountdown / 3) * 100}%` }}
                      />
                    </div>
                    <p className="text-white/60 text-xs mt-3.5 font-medium tracking-wide flex items-center gap-1.5">
                      <Spinner />
                      <span>Redirecting to login in <strong className="text-orange-400 font-bold">{redirectCountdown}s</strong>...</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
