"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/app/Components/Homepage/Navbar";
import Footer from "@/app/Components/Login/Footer";
import { API_URL } from "@/app/config";

export default function Login() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState("");

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
        setError(data.error || "Login failed.");
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
        setError("Unknown user role returned from server.");
      }
    } catch (err) {
      console.error("Login request failed", err);
      setError("Unable to connect to the server. Please verify the backend is running.");
    }
  };


  return (
    <div className="min-h-screen w-full flex flex-col">
      <Navbar />
      <div
        className="relative flex-1 w-full flex items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/login_bg.jpg')",
        }}
      >
      {/* Visual Teal/Blue Overlay Layers for Modern Depth */}
      <div className="absolute inset-0 bg-[#0e3b44]/75 mix-blend-multiply pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#0c3945]/90 via-[#125867]/75 to-[#0b333b]/90 pointer-events-none" />

      {/* Floating ambient light effects to wow the user */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-400/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-300/15 blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 pt-12 pb-32 md:pb-40 flex flex-col lg:flex-row items-center justify-around gap-12 lg:gap-6">
        
        {/* Left Side: Large Title */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left text-white max-w-md">
          <h1 className="text-6xl md:text-8xl font-bold tracking-tight select-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.3)] animate-fade-in">
            Login
          </h1>
        </div>

        {/* Right Side: Glass effect Login Card */}
        <div className="w-full max-w-[500px] bg-white/10 backdrop-blur-md border border-white/20 rounded-[2.5rem] p-8 md:p-12 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] flex flex-col gap-8 transition-all duration-500 hover:border-white/30">
          
          {error && (
            <div className="flex items-start gap-3 bg-red-500/15 backdrop-blur-md border border-red-500/30 text-red-100 p-4 rounded-2xl animate-fade-in shadow-[0_4px_20px_rgba(239,68,68,0.2)] relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-l-2xl" />
              <span className="text-red-400 mt-0.5 shrink-0 pl-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
              </span>
              <div className="flex-1 text-sm font-semibold pr-6 leading-relaxed">
                {error}
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="absolute right-3 top-3 text-red-400/80 hover:text-red-100 transition-colors focus:outline-none cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {infoMessage && (
            <div className="bg-blue-500/20 border-l-4 border-blue-400 p-4 rounded-xl text-white text-sm flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0 text-blue-300 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.085 1.085l-.04.02m-.086-1.085a.75.75 0 00-1.085-.022m0 0l-.017-.016a.75.75 0 00-1.078 1.025l.016.018a.75.75 0 001.078-1.027zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{infoMessage}</span>
            </div>
          )}

          <form onSubmit={handleConfirm} className="flex flex-col gap-6">
            
            {/* Unified NIC / Email Input Field */}
            <div className="flex flex-col gap-2">
              <label className="text-white text-base font-semibold tracking-wide ml-1 select-none">
                NIC or Email Address
              </label>
              <span className="text-[11px] text-white/60 block select-none ml-1 -mt-1.5 leading-normal">
                Policy Holders: Use NIC or Email · Agents/Staff/Admins: Use Email
              </span>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-700">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                    />
                  </svg>
                </span>
                <input
                  type="text"
                  required
                  value={loginId}
                  onChange={(e) => {
                    setLoginId(e.target.value);
                    if (error) setError(null);
                  }}
                  className="w-full bg-white text-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-base focus:outline-none focus:ring-2 focus:ring-orange-400 focus:shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all placeholder:text-gray-400 font-medium border border-transparent"
                  placeholder="Enter your NIC or Email address"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-2">
              <label className="text-white text-base font-semibold tracking-wide ml-1 select-none">
                Password
              </label>

              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-700">
                  {/* Custom Lock SVG Icon */}
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    viewBox="0 0 24 24"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  className="w-full bg-white text-slate-800 rounded-2xl py-3.5 pl-12 pr-12 text-base focus:outline-none focus:ring-2 focus:ring-orange-400 focus:shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all placeholder:text-gray-400 font-medium border border-transparent"
                  placeholder="Enter your password"
                />
                {password.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-700 focus:outline-none cursor-pointer"
                  >
                    {showPassword ? (
                      /* Eye Slash Icon (Hide) */
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                        />
                      </svg>
                    ) : (
                      /* Eye Icon (Show) */
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"
                        />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Confirm Button */}
            <button
              type="submit"
              className="mt-4 w-full max-w-[220px] mx-auto bg-[#ff9800] hover:bg-[#ff8f00] active:bg-[#f57c00] text-white font-bold py-3.5 px-8 rounded-full transition-all duration-300 transform hover:scale-[1.04] active:scale-95 shadow-lg shadow-orange-500/35 text-center text-lg cursor-pointer select-none outline-none border-none"
            >
              Confirm
            </button>
          </form>

          {/* Footer Links */}
          <div className="flex justify-between items-center w-full border-t border-white/10 pt-6 text-sm text-white/85 font-medium select-none">
            <Link
              href="/SignUp"
              className="hover:text-white hover:underline transition-all cursor-pointer"
            >
              Create an Account
            </Link>
            <Link
              href="/Reset_password"
              className="hover:text-white hover:underline transition-all cursor-pointer"
            >
              Reset Password
            </Link>
          </div>

        </div>

      </div>
      </div>
      <Footer />
    </div>
  );
}