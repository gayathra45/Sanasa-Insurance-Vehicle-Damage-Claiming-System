"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/app/Components/Homepage/Navbar";
import Footer from "@/app/Components/Login/Footer";
import { API_URL } from "@/app/config";
import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon, UserIcon, Mail01Icon, ViewIcon, ViewOffSlashIcon, Tick01Icon, ArrowRight01Icon, Loading03Icon } from "@hugeicons/core-free-icons";

type Stage = "request" | "otp" | "set-password" | "success";
type Role = "policy_holder" | "insurance_agent" | "office_staff" | "admin";

const API = `${API_URL}/signup`;

export default function ResetPassword() {
  const router = useRouter();

  const [stage, setStage] = useState<Stage>("request");
  const [loginId, setLoginId] = useState("");
  const [email, setEmail] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const [devOtp, setDevOtp] = useState("");

  // Stage: otp
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(""));
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [sessionToken, setSessionToken] = useState("");

  // Stage: set-password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI
  const [validationError, setValidationError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(3);

  // OTP countdown timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (stage === "otp" && timerSeconds > 0) {
      timer = setInterval(() => setTimerSeconds((p) => p - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [stage, timerSeconds]);

  // Auto-redirect after success with countdown
  useEffect(() => {
    if (stage === "success" && redirectCountdown > 0) {
      const t = setTimeout(() => setRedirectCountdown((p) => p - 1), 1000);
      return () => clearTimeout(t);
    } else if (stage === "success" && redirectCountdown === 0) {
      router.push("/Login");
    }
  }, [stage, redirectCountdown, router]);

  // Load email and stage from query parameters if provided (e.g. from email link)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get("email");
      const stageParam = params.get("stage") as Stage;
      if (emailParam) {
        setEmail(emailParam);
        setSentEmail(emailParam);
      }
      if (stageParam === "otp") {
        setStage("otp");
      }
    }
  }, []);

  // Password strength
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

  // OTP digit input
  const handleOtpChange = (idx: number, val: string) => {
    const digit = val.replace(/[^0-9]/g, "").slice(-1);
    const next = [...otpDigits];
    next[idx] = digit;
    setOtpDigits(next);
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      const next = [...otpDigits];
      if (next[idx]) {
        next[idx] = "";
        setOtpDigits(next);
      } else if (idx > 0) {
        next[idx - 1] = "";
        setOtpDigits(next);
        otpRefs.current[idx - 1]?.focus();
      }
    }
  };

  // HANDLER: Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");
    const cleanId = loginId.trim();
    if (!cleanId) {
      setValidationError("NIC or Mobile number is required.");
      return;
    }

    const isMobile = /^\d{10}$/.test(cleanId);
    const isNic = /^[0-9vVxX]{10,12}$/.test(cleanId);
    if (!isMobile && !isNic) {
      setValidationError("Please enter a valid Mobile number (exactly 10 digits) or NIC (10-12 characters).");
      return;
    }

    if (!email.trim()) {
      setValidationError("Email address is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API}/reset-password/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loginId: loginId.trim(),
          email: email.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP.");

      if (data.status === "pending_approval") {
        router.push(`/Login?message=${encodeURIComponent(data.message)}`);
        return;
      }

      setSentEmail(email.trim());
      if (data.devOtp) setDevOtp(data.devOtp);
      setOtpDigits(Array(6).fill(""));
      setTimerSeconds(60);
      setStage("otp");
    } catch (err: any) {
      setValidationError(err.message || "An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // HANDLER: Resend OTP
  const handleResendOtp = async () => {
    setValidationError("");
    setDevOtp("");
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API}/reset-password/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loginId: loginId.trim(),
          email: sentEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resend OTP.");
      if (data.devOtp) setDevOtp(data.devOtp);
      setOtpDigits(Array(6).fill(""));
      setTimerSeconds(60);
    } catch (err: any) {
      setValidationError(err.message || "Failed to resend code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // HANDLER: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");
    const otp = otpDigits.join("");
    if (otp.length < 6 || otpDigits.some((d) => d === "")) {
      setValidationError("Please enter the complete 6-digit code.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API}/reset-password/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: sentEmail, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed.");
      setSessionToken(data.sessionToken);
      setStage("set-password");
    } catch (err: any) {
      setValidationError(err.message || "Verification failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // HANDLER: Set new password
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");
    if (newPassword.length < 6 || newPassword.length > 12) {
      setValidationError("Password must be between 6 and 12 characters.");
      return;
    }
    if (!/[0-9]/.test(newPassword) && !/[^A-Za-z0-9]/.test(newPassword)) {
      setValidationError("Password must contain at least one number or special character.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setValidationError("Passwords do not match.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API}/reset-password/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password.");
      setStage("success");
    } catch (err: any) {
      setValidationError(err.message || "Failed to update password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── EYE ICON SVGS ───────────────────────────────────────────────────────── */
  const EyeOff = () => <HugeiconsIcon icon={ViewOffSlashIcon} className="w-5 h-5" strokeWidth={2} />;
  const EyeOn = () => <HugeiconsIcon icon={ViewIcon} className="w-5 h-5" strokeWidth={2} />;

  const Spinner = () => (
    <HugeiconsIcon icon={Loading03Icon} className="animate-spin h-5 w-5" strokeWidth={2} />
  );

  const submitBtnClass = "w-full max-w-[220px] mx-auto bg-[#ff9800] hover:bg-[#ff8f00] active:bg-[#f57c00] text-white font-bold py-4 px-8 rounded-full transition-all duration-300 transform hover:scale-[1.04] active:scale-95 shadow-lg shadow-orange-500/35 text-center text-lg cursor-pointer select-none outline-none border-none disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2";

  return (
    <div className="min-h-screen w-full flex flex-col justify-between relative">
      {/* ── Background ── */}
      <div className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat bg-fixed pointer-events-none" style={{ backgroundImage: "url('/login_bg.jpg')" }} />
      <div className="fixed inset-0 z-[-9] bg-[#0e3b44]/75 mix-blend-multiply pointer-events-none" />
      <div className="fixed inset-0 z-[-8] bg-linear-to-br from-[#0c3945]/90 via-[#125867]/75 to-[#0b333b]/90 pointer-events-none" />
      <div className="fixed inset-0 z-[-7] overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-400/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-300/15 blur-[120px]" />
      </div>

      <Navbar />

      <div className="relative z-10 flex-1 w-full flex items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat min-h-[calc(100vh-140px)] py-8 md:py-12">
        <div className="relative z-10 w-full max-w-xl mx-auto px-4 sm:px-6 flex flex-col items-center justify-center my-auto">

          {/* Card */}
          <div className="w-full max-w-[500px] bg-white/10 backdrop-blur-md border border-white/20 rounded-[2.5rem] p-8 sm:p-10 md:p-12 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] flex flex-col gap-6 transition-all duration-300 hover:border-white/30 overflow-hidden">

            {/* Top Center Title */}
            <div className="flex flex-col items-center text-center -mt-2 mb-1">
              <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight select-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.3)]">
                Reset Password
              </h1>
              <p className="mt-2 text-white/70 text-sm max-w-xs sm:max-w-sm leading-relaxed">
                {stage === "request" && "Enter your details and we'll send a verification code to your email."}
                {stage === "otp" && <>Check your email for the code sent to <span className="text-orange-400 font-semibold">{sentEmail}</span></>}
                {stage === "set-password" && "Identity verified. Set your new password below."}
                {stage === "success" && "Password updated! Redirecting you to login..."}
              </p>
            </div>

            {/* Error Banner */}
            {validationError && (
              <div className="bg-red-500/15 border-l-4 border-red-500 p-3.5 rounded-2xl text-white text-sm flex items-start gap-3">
                <HugeiconsIcon icon={AlertCircleIcon} className="w-5 h-5 shrink-0 text-red-400 mt-0.5" strokeWidth={2} />
                <span>{validationError}</span>
              </div>
            )}

            {/* ── STAGE: Request ── */}
            {stage === "request" && (
              <form onSubmit={handleSendOtp} className="flex flex-col gap-6">
                {/* NIC or Mobile */}
                <div className="flex flex-col gap-2">
                  <label className="text-white text-base font-semibold tracking-wide ml-1 select-none">
                    NIC or Mobile Number
                  </label>

                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-700">
                      <HugeiconsIcon icon={UserIcon} className="w-5 h-5" strokeWidth={2} />
                    </span>
                    <input type="text" required value={loginId} onChange={(e) => setLoginId(e.target.value)}
                      className="w-full bg-white text-slate-800 rounded-2xl py-4 pl-12 pr-4 text-base focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all placeholder:text-gray-400 font-medium border border-transparent"
                      placeholder="Enter your NIC or Mobile number" />
                  </div>
                </div>

                {/* Email */}
                <div className="flex flex-col gap-2">
                  <label className="text-white text-base font-semibold tracking-wide ml-1 select-none">
                    Registered Email Address
                  </label>

                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-700">
                      <HugeiconsIcon icon={Mail01Icon} className="w-5 h-5" strokeWidth={2} />
                    </span>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white text-slate-800 rounded-2xl py-4 pl-12 pr-4 text-base focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all placeholder:text-gray-400 font-medium border border-transparent"
                      placeholder="Enter your registered email" />
                  </div>
                </div>

                <button type="submit" disabled={isSubmitting} className={submitBtnClass}>
                  {isSubmitting ? <><Spinner /> Sending...</> : "Send OTP Code"}
                </button>

                <div className="flex justify-between items-center w-full border-t border-white/10 pt-5 text-sm text-white/85 font-medium select-none">
                  <Link href="/SignUp" className="hover:text-white hover:underline transition-all">Create an Account</Link>
                  <Link href="/Login" className="hover:text-white hover:underline transition-all">Back to Login</Link>
                </div>
              </form>
            )}

            {/* ── STAGE: OTP ── */}
            {stage === "otp" && (
              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-6">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center border border-orange-400/40 shadow-[0_0_25px_rgba(249,115,22,0.35)]">
                    <HugeiconsIcon icon={Mail01Icon} className="w-8 h-8 text-orange-400" strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-white text-xl font-bold">Verification Code</h3>
                    <p className="text-white/60 text-sm mt-1">Enter the 6-digit code sent to <span className="text-orange-400 font-semibold">{sentEmail}</span></p>
                  </div>
                </div>

                {/* 6 OTP digit boxes */}
                <div className="flex justify-center gap-2 sm:gap-3">
                  {otpDigits.map((digit, idx) => (
                    <input key={idx}
                      ref={(el) => { otpRefs.current[idx] = el; }}
                      type="text" inputMode="numeric" maxLength={1} value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-11 h-14 sm:w-12 sm:h-14 bg-white text-slate-800 rounded-xl text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all shadow-sm caret-transparent"
                    />
                  ))}
                </div>

                {/* Dev mode OTP display */}
                {devOtp && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-center">
                    <p className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">⚡ Dev Mode — Email Not Sent</p>
                    <p className="text-white text-3xl font-bold tracking-[0.5em] font-mono">{devOtp}</p>
                    <p className="text-white/40 text-xs mt-1">Add Gmail App Password in backend/.env to send real emails</p>
                  </div>
                )}

                {/* Timer / Resend */}
                <div className="text-center">
                  {timerSeconds > 0 ? (
                    <p className="text-white/60 text-sm">
                      Resend code in <span className="text-orange-400 font-bold">{timerSeconds}s</span>
                    </p>
                  ) : (
                    <button type="button" onClick={handleResendOtp} disabled={isSubmitting}
                      className="text-orange-400 hover:text-orange-300 text-sm font-bold underline transition-all cursor-pointer bg-transparent border-none outline-none disabled:opacity-60">
                      Resend Verification Code
                    </button>
                  )}
                </div>

                <button type="submit" disabled={isSubmitting} className={submitBtnClass}>
                  {isSubmitting ? <><Spinner /> Verifying...</> : "Verify Code"}
                </button>

                <button type="button" onClick={() => { setStage("request"); setValidationError(""); setDevOtp(""); }}
                  className="text-white/50 hover:text-white text-sm underline transition-all cursor-pointer bg-transparent border-none outline-none text-center">
                  ← Try a different email
                </button>
              </form>
            )}

            {/* ── STAGE: Set New Password ── */}
            {stage === "set-password" && (
              <form onSubmit={handleSetPassword} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1">
                  <h2 className="text-white text-2xl font-bold">Set New Password</h2>
                  <p className="text-white/70 text-sm">Choose a strong new password for your account.</p>
                </div>

                {/* New Password */}
                <div className="flex flex-col gap-2">
                  <label className="text-white text-sm font-semibold tracking-wide ml-1 select-none">New Password</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} required value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-white text-slate-800 rounded-2xl py-4 pl-6 pr-12 text-base focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all placeholder:text-gray-400 font-medium"
                      placeholder="Enter new password" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-700 cursor-pointer">
                      {showPassword ? <EyeOff /> : <EyeOn />}
                    </button>
                  </div>

                  {newPassword && (
                    <div className="flex flex-col gap-2 px-1 bg-black/15 p-3 rounded-2xl border border-white/5 mt-1">
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
                        <span className={( /[0-9]/.test(newPassword) || /[^A-Za-z0-9]/.test(newPassword) ) ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                          {( /[0-9]/.test(newPassword) || /[^A-Za-z0-9]/.test(newPassword) ) ? "✔" : "✖"} Min. 1 number or special character
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="flex flex-col gap-2">
                  <label className="text-white text-sm font-semibold tracking-wide ml-1 select-none">Confirm Password</label>
                  <div className="relative">
                    <input type={showConfirmPassword ? "text" : "password"} required value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-white text-slate-800 rounded-2xl py-4 pl-6 pr-12 text-base focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all placeholder:text-gray-400 font-medium"
                      placeholder="Confirm new password" />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-700 cursor-pointer">
                      {showConfirmPassword ? <EyeOff /> : <EyeOn />}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && <p className="text-red-400 text-xs ml-1 font-semibold">Passwords do not match</p>}
                  {confirmPassword && newPassword === confirmPassword && <p className="text-green-400 text-xs ml-1 font-semibold">✔ Passwords match</p>}
                </div>

                <button type="submit" disabled={isSubmitting} className={submitBtnClass}>
                  {isSubmitting ? <><Spinner /> Updating...</> : "Update Password"}
                </button>
              </form>
            )}

            {/* ── STAGE: Success ── */}
            {stage === "success" && (
              <div className="w-full flex flex-col items-center justify-center py-4 text-center z-20 transition-all duration-300">
                <div className="flex flex-col items-center max-w-sm w-full gap-6">
                  {/* Simple Success Checkmark (Green) */}
                  <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center border border-green-400/40 shadow-[0_0_30px_rgba(74,222,128,0.4)] animate-[pulse_1.5s_infinite]">
                    <HugeiconsIcon icon={Tick01Icon} className="w-10 h-10 text-green-400" strokeWidth={3} />
                  </div>

                  <div className="flex flex-col gap-3">
                    <h3 className="text-white text-3xl font-bold tracking-tight drop-shadow-md">Password Updated!</h3>
                    <p className="text-white/80 text-sm leading-relaxed">
                      Your password has been changed successfully. You can now access your account.
                    </p>
                  </div>

                  {/* Countdown Progress Bar */}
                  <div className="flex flex-col items-center w-full px-4 gap-3.5">
                    <div className="w-48 bg-white/10 h-2 rounded-full overflow-hidden relative shadow-inner">
                      <div
                        className="bg-green-500 h-full rounded-full transition-all duration-1000 ease-linear"
                        style={{ width: `${(redirectCountdown / 3) * 100}%` }}
                      />
                    </div>
                    <p className="text-white/60 text-xs font-medium tracking-wide flex items-center gap-1.5 justify-center">
                      <Spinner />
                      <span>Redirecting to login in <strong className="text-green-400 font-bold">{redirectCountdown}s</strong>...</span>
                    </p>
                  </div>

                  {/* Manual Navigation Button */}
                  <button
                    onClick={() => router.push("/Login")}
                    className="w-full max-w-[200px] py-3 bg-[#ff9800] hover:bg-[#ff8f00] active:bg-[#f57c00] text-white rounded-full font-bold shadow-lg shadow-orange-500/25 active:scale-95 hover:scale-[1.03] transition-all flex items-center justify-center gap-2 border-none outline-none cursor-pointer"
                  >
                    <span>Go to Login</span>
                    <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4 text-white" strokeWidth={2.5} />
                  </button>
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
