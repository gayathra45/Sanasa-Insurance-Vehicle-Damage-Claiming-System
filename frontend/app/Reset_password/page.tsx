"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/app/Components/Homepage/Navbar";
import Footer from "@/app/Components/Login/Footer";

type Stage = "request" | "otp" | "set-password" | "success";
type Role = "policy_holder" | "insurance_agent" | "office_staff" | "admin";

const API = `${process.env.NEXT_PUBLIC_API_URL}/signup`;

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
  const EyeOff = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
  const EyeOn = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
    </svg>
  );

  const Spinner = () => (
    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );

  const submitBtnClass = "w-full max-w-[240px] mx-auto bg-[#ff9800] hover:bg-[#ff8f00] active:bg-[#f57c00] text-white font-bold py-4 px-8 rounded-full transition-all duration-300 transform hover:scale-[1.04] active:scale-95 shadow-lg shadow-orange-500/35 text-lg cursor-pointer select-none outline-none border-none disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2";

  return (
    <div className="min-h-screen w-full flex flex-col relative">
      {/* ── Background ── */}
      <div className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat bg-fixed pointer-events-none" style={{ backgroundImage: "url('/login_bg.jpg')" }} />
      <div className="fixed inset-0 z-[-9] bg-[#0e3b44]/75 mix-blend-multiply pointer-events-none" />
      <div className="fixed inset-0 z-[-8] bg-linear-to-br from-[#0c3945]/90 via-[#125867]/75 to-[#0b333b]/90 pointer-events-none" />
      <div className="fixed inset-0 z-[-7] overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-400/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-300/15 blur-[120px]" />
      </div>

      <Navbar />

      <div className="relative z-10 flex-1 w-full flex items-center justify-center py-12">
        <div className="w-full max-w-6xl mx-auto px-6 py-12 flex flex-col lg:flex-row items-center justify-around gap-12 lg:gap-6 min-h-[550px]">

          {/* Left: Title */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left text-white max-w-md">
            <h1 className="text-6xl md:text-8xl font-bold tracking-tight select-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.3)] leading-[0.9] transition-all duration-300">
              Reset<br />Password
            </h1>
            <p className="mt-4 text-white/55 text-sm max-w-xs leading-relaxed">
              {stage === "request" && "Enter your details and we'll send a verification code to your email."}
              {stage === "otp" && <>Check your email for the code sent to <span className="text-orange-400 font-semibold">{sentEmail}</span></>}
              {stage === "set-password" && "Identity verified. Set your new password below."}
              {stage === "success" && "Password updated! Redirecting you to login..."}
            </p>
          </div>

          {/* Right: Card */}
          <div className="relative w-full max-w-[500px] bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-8 md:p-12 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] flex flex-col gap-6 transition-all duration-500 hover:border-white/30 overflow-hidden">

            {/* Error Banner */}
            {validationError && (
              <div className="bg-red-500/20 border-l-4 border-red-500 p-4 rounded-xl text-white text-sm flex items-start gap-3">
                <svg className="w-5 h-5 shrink-0 text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{validationError}</span>
              </div>
            )}

            {/* ── STAGE: Request ── */}
            {stage === "request" && (
              <form onSubmit={handleSendOtp} className="flex flex-col gap-5">
                {/* NIC or Mobile */}
                <div className="flex flex-col gap-2">
                  <label className="text-white text-base font-semibold tracking-wide ml-1 select-none">
                    NIC or Mobile Number
                  </label>

                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                      </svg>
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
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                      </svg>
                    </span>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white text-slate-800 rounded-2xl py-4 pl-12 pr-4 text-base focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all placeholder:text-gray-400 font-medium border border-transparent"
                      placeholder="Enter your registered email" />
                  </div>
                </div>

                <button type="submit" disabled={isSubmitting} className={submitBtnClass}>
                  {isSubmitting ? <><Spinner /> Sending...</> : "Send OTP Code"}
                </button>

                <div className="flex justify-between items-center w-full border-t border-white/10 pt-4 text-sm text-white/70 font-medium select-none">
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
                    <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                    </svg>
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
                  <p className="text-white/60 text-sm">Choose a strong new password for your account.</p>
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
                        <span className={(/[0-9]/.test(newPassword) || /[^A-Za-z0-9]/.test(newPassword)) ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                          {(/[0-9]/.test(newPassword) || /[^A-Za-z0-9]/.test(newPassword)) ? "✔" : "✖"} Min. 1 number or special character
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
                    <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>

                  <div className="flex flex-col gap-3">
                    <h3 className="text-white text-3xl font-extrabold tracking-tight drop-shadow-md">Password Updated!</h3>
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
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
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
