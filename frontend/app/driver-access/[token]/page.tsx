"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { API_URL } from "../../config";
import SimpleLoader from "@/app/Components/SimpleLoader";
import PolicyHolderFooter from "@/app/Components/Policy_Holder/footer";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Car01Icon,
  ShieldCheckIcon,
  File01Icon,
  Upload01Icon,
  UserCheck01Icon,
  Alert02Icon,
  ViewIcon,
  ArrowRight01Icon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
  Clock01Icon,
  CreditCardIcon,
  Logout01Icon,
  Camera01Icon,
  Call02Icon,
  Building04Icon,
  UserIcon,
  Analytics01Icon,
  AlertCircleIcon,
  Notification01Icon,
  Globe02Icon,
  ArrowDown01Icon,
  BubbleChatIcon,
  SecurityCheckIcon
} from "@hugeicons/core-free-icons";
import { getVehicleIconSvg, getVehicleIconContainer, getVehicleTheme } from "@/app/Components/VehicleIcon";

interface AuthorizedVehicle {
  numberPlate: string;
  vehicleType?: string;
  model?: string;
  company?: string;
  year?: string;
  policyNumber?: string;
  policyExpiryDate?: string;
  coverageStatus?: string;
  authorizedSince?: string;
}

interface DriverProfile {
  driverName: string;
  driverNicMasked: string;
  driverPhone: string;
  driverAddress: string;
  policyHolderName: string;
  policyHolderNicMasked?: string;
  branch: string;
  reference: string;
  approvalDate: string;
  status: string;
  authorizedVehicles: AuthorizedVehicle[];
  verificationToken: string;
}

interface ClaimRecord {
  claimNumber: string;
  vehiclePlate: string;
  incidentDate: string;
  incidentTime?: string;
  damageType: string;
  location: string;
  status: string;
  currentStep: number;
  createdAt: string;
  description?: string;
  documentsCount?: number;
  hasInspectionReport?: boolean;
}

interface ClaimDetail extends ClaimRecord {
  branch?: string;
  submittedByDriver?: {
    isThirdParty: boolean;
    driverName: string;
    driverNic: string;
    driverPhone: string;
  };
  accidentPhotos?: {
    front?: string[];
    rear?: string[];
    side?: string[];
  };
  drivingLicense?: {
    front?: string[];
    rear?: string[];
  };
  additionalDocuments?: {
    name: string;
    url: string;
    uploadedAt: string;
    uploadedBy?: string;
  }[];
  requestedDocuments?: string[];
  documentsRequested?: boolean;
  messages?: {
    sender: string;
    message: string;
    sentAt: string;
  }[];
}

type TabType = "home" | "vehicles" | "new_claim" | "my_claims" | "documents" | "digital_pass";

function formatPlate(plate: string): string {
  if (!plate) return "";
  const cleaned = plate.trim();
  if (cleaned.includes("-")) return cleaned.toUpperCase();
  const m = cleaned.match(/^(.*[A-Za-z]+)(\d+)$/);
  if (m) return `${m[1].trim().toUpperCase()}-${m[2]}`;
  return cleaned.toUpperCase();
}

export default function ThirdPartyDriverPortalPage() {
  const params = useParams();
  const token = params?.token as string;

  // Session & Auth
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedOut, setIsLoggedOut] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>("home");

  // Portal Data
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [vehicles, setVehicles] = useState<AuthorizedVehicle[]>([]);
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(false);

  // Claim Details Modal
  const [selectedClaim, setSelectedClaim] = useState<ClaimDetail | null>(null);
  const [loadingClaimModal, setLoadingClaimModal] = useState(false);

  // Claim Submission Form States
  const [claimPlate, setClaimPlate] = useState("");
  const [claimDate, setClaimDate] = useState("");
  const [claimTime, setClaimTime] = useState("");
  const [claimLocation, setClaimLocation] = useState("");
  const [claimDamageType, setClaimDamageType] = useState("Front Collision");
  const [claimDesc, setClaimDesc] = useState("");
  const [photoFront, setPhotoFront] = useState("");
  const [photoRear, setPhotoRear] = useState("");
  const [photoSide, setPhotoSide] = useState("");
  const [dlFront, setDlFront] = useState("");
  const [dlBack, setDlBack] = useState("");
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [claimFormError, setClaimFormError] = useState("");
  const [submittedClaimNumber, setSubmittedClaimNumber] = useState<string | null>(null);

  // Document Upload States
  const [uploadTargetClaim, setUploadTargetClaim] = useState("");
  const [docName, setDocName] = useState("");
  const [docFileBase64, setDocFileBase64] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docUploadSuccess, setDocUploadSuccess] = useState("");
  const [docUploadError, setDocUploadError] = useState("");

  // Toast
  const [toastMessage, setToastMessage] = useState("");

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  // 1. Establish Restricted Driver Session on Mount
  useEffect(() => {
    if (!token) return;

    const initSession = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/third-party/driver-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: token.trim() })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to establish secure driver session.");
        }

        setSessionToken(data.sessionToken);
        sessionStorage.setItem(`sanasa_tp_session_${token}`, data.sessionToken);

        await loadInitialData(data.sessionToken);
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred while connecting to the portal.");
      } finally {
        setLoading(false);
      }
    };

    initSession();
  }, [token]);

  // Load Driver Data
  const loadInitialData = async (sToken: string) => {
    try {
      const [meRes, vehRes, claimsRes] = await Promise.all([
        fetch(`${API_URL}/third-party/portal/me`, {
          headers: { Authorization: `Bearer ${sToken}` }
        }),
        fetch(`${API_URL}/third-party/portal/vehicles`, {
          headers: { Authorization: `Bearer ${sToken}` }
        }),
        fetch(`${API_URL}/third-party/portal/claims`, {
          headers: { Authorization: `Bearer ${sToken}` }
        })
      ]);

      if (meRes.ok) {
        const meData = await meRes.json();
        setProfile(meData.profile);
      }
      if (vehRes.ok) {
        const vehData = await vehRes.json();
        setVehicles(vehData.vehicles || []);
        if (vehData.vehicles?.length > 0 && !claimPlate) {
          setClaimPlate(vehData.vehicles[0].numberPlate);
        }
      }
      if (claimsRes.ok) {
        const claimsData = await claimsRes.json();
        setClaims(claimsData.claims || []);
      }
    } catch (e) {
      console.error("Failed to load initial driver data:", e);
    }
  };

  const refreshClaims = async () => {
    if (!sessionToken) return;
    setLoadingClaims(true);
    try {
      const res = await fetch(`${API_URL}/third-party/portal/claims`, {
        headers: { Authorization: `Bearer ${sessionToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setClaims(data.claims || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingClaims(false);
    }
  };

  const handleOpenClaimDetails = async (claimNum: string) => {
    if (!sessionToken) return;
    setLoadingClaimModal(true);
    try {
      const res = await fetch(`${API_URL}/third-party/portal/claims/${claimNum}`, {
        headers: { Authorization: `Bearer ${sessionToken}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load claim details.");
      setSelectedClaim(data.claim);
      setUploadTargetClaim(claimNum);
    } catch (err: any) {
      triggerToast(err.message || "Failed to open claim details.");
    } finally {
      setLoadingClaimModal(false);
    }
  };

  const handleImageFile = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      triggerToast("Photo size exceeds 5MB limit. Please upload a smaller image.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setter(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaimFormError("");
    if (!claimPlate) {
      setClaimFormError("Please select an authorized vehicle.");
      return;
    }
    if (!claimDate || !claimTime || !claimLocation.trim() || !claimDesc.trim()) {
      setClaimFormError("Please fill out all incident details (date, time, location, and description).");
      return;
    }

    setSubmittingClaim(true);
    try {
      const payload = {
        vehiclePlate: claimPlate,
        incidentDate: claimDate,
        incidentTime: claimTime,
        damageType: claimDamageType,
        description: claimDesc,
        location: claimLocation.trim(),
        accidentPhotos: {
          front: photoFront ? [photoFront] : [],
          rear: photoRear ? [photoRear] : [],
          side: photoSide ? [photoSide] : []
        },
        drivingLicense: {
          front: dlFront ? [dlFront] : [],
          rear: dlBack ? [dlBack] : []
        }
      };

      const res = await fetch(`${API_URL}/third-party/portal/submit-claim`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit claim.");
      }

      setSubmittedClaimNumber(data.claimNumber);
      triggerToast(`Claim ${data.claimNumber} successfully lodged!`);
      setClaimDesc("");
      setClaimLocation("");
      setPhotoFront("");
      setPhotoRear("");
      setPhotoSide("");
      setDlFront("");
      setDlBack("");
      refreshClaims();
    } catch (err: any) {
      setClaimFormError(err.message || "An unexpected error occurred while lodging claim.");
    } finally {
      setSubmittingClaim(false);
    }
  };

  const handleUploadDocument = async () => {
    setDocUploadError("");
    setDocUploadSuccess("");
    if (!uploadTargetClaim) {
      setDocUploadError("Please specify which claim to attach this document to.");
      return;
    }
    if (!docName.trim() || !docFileBase64) {
      setDocUploadError("Please provide a document title and select a file.");
      return;
    }

    setUploadingDoc(true);
    try {
      const res = await fetch(`${API_URL}/third-party/portal/claims/${uploadTargetClaim}/upload-doc`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          documentName: docName.trim(),
          fileBase64: docFileBase64
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload document.");

      setDocUploadSuccess(`Document "${docName}" attached to claim ${uploadTargetClaim}.`);
      setDocName("");
      setDocFileBase64("");

      if (selectedClaim && selectedClaim.claimNumber === uploadTargetClaim) {
        setSelectedClaim((prev) =>
          prev ? { ...prev, additionalDocuments: data.additionalDocuments } : null
        );
      }
      refreshClaims();
    } catch (err: any) {
      setDocUploadError(err.message || "Failed to upload document.");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleLogout = async () => {
    if (sessionToken) {
      try {
        await fetch(`${API_URL}/third-party/portal/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${sessionToken}` }
        });
      } catch (e) {
        console.warn("Logout notify error:", e);
      }
    }
    sessionStorage.removeItem(`sanasa_tp_session_${token}`);
    setSessionToken(null);
    setIsLoggedOut(true);
  };

  const pendingClaimsCount = useMemo(() => {
    return claims.filter((c) => c.status !== "Approved" && c.status !== "Settled" && c.status !== "Rejected").length;
  }, [claims]);

  const approvedClaimsCount = useMemo(() => {
    return claims.filter((c) => c.status === "Approved" || c.status === "Settled").length;
  }, [claims]);

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800 select-none">
        <SimpleLoader message="Verifying Authorized Driver Pass..." theme="blue" />
      </div>
    );
  }

  // Error / Revocation Screen
  if (error || !sessionToken) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans select-none">
        <div className="bg-[#0B1E32] text-white text-xs px-6 py-2.5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={Call02Icon} className="w-3.5 h-3.5 text-cyan-400" />
            <span>24H Customer Hotline: +94 112 003 000</span>
          </div>
          <span>Sanasa General Insurance</span>
        </div>

        <div className="max-w-md w-full mx-auto my-auto p-6">
          <div className="bg-white border border-rose-200 rounded-3xl p-8 text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <HugeiconsIcon icon={Alert02Icon} className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Access Link Inactive or Revoked</h2>
            <p className="text-slate-500 text-xs leading-relaxed mb-6">
              {error || "This driver authorization token is no longer active, has expired, or was revoked by the vehicle owner or regional branch."}
            </p>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-2 mb-6">
              <div className="flex justify-between text-slate-500">
                <span>Security Reference:</span>
                <span className="font-mono text-slate-800 font-semibold">{token ? token.substring(0, 12).toUpperCase() : "N/A"}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Hotline Support:</span>
                <span className="text-[#102A43] font-bold">1331 / +94 112 003 000</span>
              </div>
            </div>
          </div>
        </div>

        <PolicyHolderFooter />
      </div>
    );
  }

  // Safe Logout Screen
  if (isLoggedOut) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between select-none font-sans">
        <div className="bg-[#0B1E32] text-white text-xs px-6 py-2.5 flex justify-between items-center">
          <span>Sanasa General Insurance</span>
          <span>Session Closed</span>
        </div>

        <div className="max-w-md w-full mx-auto my-auto p-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Session Closed</h2>
            <p className="text-slate-500 text-xs mb-6">
              You have safely logged out of the Third-Party Driver Portal. To re-access, reopen your secure invitation link.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-[#102A43] hover:bg-[#163e63] text-white rounded-xl text-xs font-bold transition-all border-none cursor-pointer"
            >
              Re-open Portal
            </button>
          </div>
        </div>

        <PolicyHolderFooter />
      </div>
    );
  }

  const navLinks = [
    { id: "home", label: "Home" },
    { id: "my_claims", label: "My Claims" },
    { id: "vehicles", label: "My Vehicles" },
    { id: "documents", label: "Documents" },
    { id: "digital_pass", label: "Digital Pass" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative select-none">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-[#00ddff] text-black font-semibold px-6 py-4 rounded-2xl shadow-xl animate-bounce flex items-center gap-3 border-2 border-black">
          <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-6 h-6" strokeWidth={2.5} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. EXACT POLICYHOLDER NAVBAR (Matching PolicyHolderNavbar component 100%) */}
      {/* ========================================================================= */}
      <nav className="sticky top-0 z-50 w-full bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] border-b border-slate-100 transition-all duration-300">
        
        {/* Top Emergency / Branch Header Row */}
        <div className="bg-[#0B1E32] text-white text-xs py-2 px-6 md:px-16 flex justify-between items-center transition-all duration-300">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={Call02Icon} className="w-3.5 h-3.5 text-sky-200" strokeWidth={2} />
            <span className="font-medium tracking-wide">24H Customer Hotline: +94 112 003 000</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-sky-100 font-medium">
              <HugeiconsIcon icon={Building04Icon} className="w-3.5 h-3.5 text-sky-200" strokeWidth={2} />
              <span>Branch: <strong>{profile?.branch || "Galle"}</strong></span>
            </div>

            <span className="h-3 w-px bg-white/25" />

            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00ddff]/20 text-[#00ddff] border border-[#00ddff]/40">
              AUTHORIZED DRIVER
            </span>
          </div>
        </div>

        {/* Main Navbar Row (Logo, Navigation Links with Underline, Orange New Claim Button, Profile) */}
        <div className="py-2.5 px-6 md:px-16 flex items-center justify-between w-full">
          {/* Logo */}
          <div className="flex items-center">
            <button
              onClick={() => setActiveTab("home")}
              className="bg-transparent border-none p-0 cursor-pointer"
            >
              <Image
                src="/logo.png"
                alt="Sanasa General Insurance"
                width={100}
                height={40}
                className="object-contain h-auto"
                priority
              />
            </button>
          </div>

          {/* Desktop Navigation Links — Exact Homepage/PolicyHolder Style */}
          <div className="hidden md:flex items-center gap-4 lg:gap-7 text-sm lg:text-base">
            {navLinks.map((link) => {
              const active = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => setActiveTab(link.id as TabType)}
                  className={`relative py-2 font-semibold whitespace-nowrap transition-colors duration-200 border-none bg-transparent cursor-pointer ${
                    active ? "text-[#0d2a3a]" : "text-slate-600 hover:text-[#0284c7]"
                  }`}
                >
                  <span>{link.label}</span>
                  {active && (
                    <span className="absolute bottom-0 left-0 w-full h-[3px] rounded-full bg-[#0d2a3a] transition-all duration-200" />
                  )}
                </button>
              );
            })}

            {/* Orange New Claim Pill Button (Signature Policyholder Navbar Element) */}
            <button
              onClick={() => setActiveTab("new_claim")}
              className="inline-flex items-center justify-center font-semibold bg-[#ff9800] hover:bg-[#ff8f00] text-white shadow-sm hover:shadow transition-all duration-200 border-none cursor-pointer rounded-full hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ml-2 px-5 py-1.5 text-sm md:text-[15px]"
            >
              New Claim
            </button>
          </div>

          {/* Right Action Icons & Driver Profile */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-[#0d2a3a] flex items-center justify-center font-bold text-xs">
                {profile?.driverName ? profile.driverName.charAt(0).toUpperCase() : "D"}
              </div>
              <div className="hidden sm:block text-left">
                <span className="text-xs font-bold text-slate-800 block leading-tight">
                  {profile?.driverName}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold block leading-tight">
                  Authorized Driver
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              title="Logout"
            >
              <HugeiconsIcon icon={Logout01Icon} className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Mobile Tab Row */}
        <div className="md:hidden flex items-center gap-2 px-4 py-2 border-t border-slate-100 overflow-x-auto">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => setActiveTab(link.id as TabType)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border-none ${
                activeTab === link.id ? "bg-[#0d2a3a] text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {link.label}
            </button>
          ))}
          <button
            onClick={() => setActiveTab("new_claim")}
            className="px-3 py-1 rounded-full text-xs font-semibold bg-[#ff9800] text-white whitespace-nowrap border-none"
          >
            New Claim
          </button>
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* 2. SIGNATURE CURVED HEADER BANNER (Exact Policyholder Home Curved Banner) */}
      {/* ========================================================================= */}
      <header className="relative w-full h-[450px] md:h-[420px] rounded-b-[60px] md:rounded-b-[90px] overflow-hidden shadow-[0_15px_30px_rgba(0,0,0,0.08)] bg-[url('/policy1.jpg')] bg-cover bg-center">
        {/* Horizontal gradient overlay to darken left text area but keep the right image fold bright and clear */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-transparent" />

        {/* Content Container */}
        <div className="relative z-10 max-w-7xl mx-auto h-full px-6 md:px-16 pt-10 pb-12 flex flex-col justify-between">
          
          {/* Welcome Greeting Row */}
          <div>
            <div className="inline-block border-b-3 border-[#00ddff] pb-1.5 mb-2">
              <h2 className="text-white text-xl md:text-2xl font-bold tracking-tight">
                Welcome back, {profile?.driverName} !
              </h2>
            </div>
            <p className="text-slate-200 text-[13px] md:text-sm font-normal tracking-wide mt-1">
              Your driver authorization is active under policyholder{" "}
              <strong className="text-white">{profile?.policyHolderName}</strong> for Sanasa{" "}
              <strong className="text-white">{profile?.branch}</strong> Branch.
            </p>
          </div>

          {/* Central Statement */}
          <div className="my-auto max-w-4xl mx-auto text-center px-4">
            <h1 className="text-base md:text-xl font-medium text-slate-100/90 leading-relaxed tracking-normal">
              An authorized third-party driver claim with Sanasa General Insurance Company Limited enables fast-track vehicle inspection and settlement.
            </h1>
          </div>

          {/* Signature Action Buttons with Glowing Drop Shadows */}
          <div className="flex flex-row justify-center gap-6 mt-2">
            <button
              onClick={() => setActiveTab("new_claim")}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-base md:text-lg px-10 py-5 rounded-full transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] border-none cursor-pointer"
              style={{ boxShadow: "0 8px 25px rgba(220, 38, 38, 0.65)" }}
            >
              New Claim
            </button>
            <button
              onClick={() => setActiveTab("digital_pass")}
              className="bg-[#1fcbf2] hover:bg-[#00b2d6] text-white font-bold text-base md:text-lg px-10 py-5 rounded-full transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] border-none cursor-pointer"
              style={{ boxShadow: "0 8px 25px rgba(31, 203, 242, 0.65)" }}
            >
              Digital Pass
            </button>
          </div>

        </div>
      </header>

      {/* ========================================================================= */}
      {/* 3. THREE STAT CARDS OVERLAPPING HEADER (Exact Policyholder Home stat cards)*/}
      {/* ========================================================================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 md:px-16 py-10 relative z-20">
        <section className="-mt-[60px] md:-mt-[50px] grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          
          {/* Total Claims */}
          <button
            onClick={() => setActiveTab("my_claims")}
            className="bg-white px-5 py-6 rounded-[24px] border border-slate-100 shadow-[0_12px_32px_rgba(0,0,0,0.06)] flex items-center justify-start gap-4 hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-left border-none cursor-pointer"
          >
            <div className="text-slate-400 flex-shrink-0">
              <HugeiconsIcon icon={Analytics01Icon} className="w-11 h-11 text-orange-500" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-3xl font-bold text-slate-800 tracking-tight leading-none mb-1">{claims.length}</h3>
              <p className="text-slate-500 font-semibold text-[10px] md:text-xs uppercase tracking-wider leading-tight">Total Claims</p>
            </div>
          </button>

          {/* In Progress */}
          <button
            onClick={() => setActiveTab("my_claims")}
            className="bg-white px-5 py-6 rounded-[24px] border border-slate-100 shadow-[0_12px_32px_rgba(0,0,0,0.06)] flex items-center justify-start gap-4 hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-left border-none cursor-pointer"
          >
            <div className="text-slate-400 flex-shrink-0">
              <HugeiconsIcon icon={Clock01Icon} className="w-11 h-11 text-cyan-500" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-3xl font-bold text-slate-800 tracking-tight leading-none mb-1">{pendingClaimsCount}</h3>
              <p className="text-slate-500 font-semibold text-[10px] md:text-xs uppercase tracking-wider leading-tight">In Progress</p>
            </div>
          </button>

          {/* Approved */}
          <button
            onClick={() => setActiveTab("my_claims")}
            className="bg-white px-5 py-6 rounded-[24px] border border-slate-100 shadow-[0_12px_32px_rgba(0,0,0,0.06)] flex items-center justify-start gap-4 hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-left border-none cursor-pointer"
          >
            <div className="text-slate-400 flex-shrink-0">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-11 h-11 text-emerald-500" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-3xl font-bold text-slate-800 tracking-tight leading-none mb-1">{approvedClaimsCount}</h3>
              <p className="text-slate-500 font-semibold text-[10px] md:text-xs uppercase tracking-wider leading-tight">Approved Claims</p>
            </div>
          </button>

        </section>

        {/* ========================================================================= */}
        {/* TAB 1: HOME (Exact Policyholder Home Grid: Notifications + Registered Vehicles) */}
        {/* ========================================================================= */}
        {activeTab === "home" && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* Left Column (7 cols): Notifications & Claim Updates */}
            <div className="lg:col-span-7">
              <div className="flex items-center gap-2.5 mb-6 select-none">
                <HugeiconsIcon icon={Notification01Icon} className="w-6 h-6 text-slate-700 flex-shrink-0" strokeWidth={2.5} />
                <h2 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
                  Recent Notifications & Requests
                </h2>
              </div>

              <div className="flex flex-col gap-6">
                {claims.length > 0 ? (
                  claims.slice(0, 3).map((claim) => (
                    <div
                      key={claim.claimNumber}
                      className="bg-white border-2 border-slate-100 rounded-[24px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[140px]"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="p-2 bg-blue-100 rounded-xl text-blue-600 flex-shrink-0 mt-0.5">
                          <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-6 h-6" strokeWidth={2} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-slate-900 font-semibold text-base leading-none">
                              Claim {claim.claimNumber} Status: {claim.status}
                            </h4>
                            <span className="text-[11px] text-slate-400 font-medium">
                              {claim.incidentDate}
                            </span>
                          </div>
                          <p className="text-slate-600 text-xs md:text-sm mt-2 leading-relaxed">
                            Vehicle {claim.vehiclePlate} • {claim.damageType} lodged for {claim.location}. Branch reviewing inspection details.
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-slate-100">
                        <button
                          onClick={() => handleOpenClaimDetails(claim.claimNumber)}
                          className="px-4 py-1.5 bg-[#0d2a3a] text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-all cursor-pointer border-none"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white border border-slate-100 rounded-[24px] p-8 text-center text-slate-400 shadow-sm">
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                    <p className="text-sm font-semibold text-slate-700">No pending notifications</p>
                    <p className="text-xs text-slate-400 mt-1">All authorized vehicle claims are up to date.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column (5 cols): Permitted Registered Vehicles */}
            <div className="lg:col-span-5">
              <div className="flex items-center justify-between mb-6 select-none">
                <div className="flex items-center gap-2.5">
                  <HugeiconsIcon icon={Car01Icon} className="w-6 h-6 text-slate-700 flex-shrink-0" strokeWidth={2.5} />
                  <h2 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
                    Authorized Vehicles
                  </h2>
                </div>
                <button
                  onClick={() => setActiveTab("vehicles")}
                  className="text-xs font-semibold text-[#0284c7] hover:underline bg-transparent border-none cursor-pointer"
                >
                  View All ({vehicles.length})
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {vehicles.map((v) => {
                  const theme = getVehicleTheme(v.vehicleType || "Car");
                  return (
                    <div
                      key={v.numberPlate}
                      className="bg-white rounded-[24px] border border-slate-100 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex items-center justify-between gap-4 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${theme.bg} ${theme.border} border`}>
                          {getVehicleIconSvg(v.vehicleType || "Car", `w-6 h-6 ${theme.text}`)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2 py-0.5 rounded-md">
                              {formatPlate(v.numberPlate)}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              Active
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-800 text-sm mt-1">{v.company} {v.model}</h4>
                          <p className="text-[11px] text-slate-400">{v.vehicleType} • {v.year}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setClaimPlate(v.numberPlate);
                          setActiveTab("new_claim");
                        }}
                        className="px-3.5 py-2 bg-[#ff9800] hover:bg-[#ff8f00] text-white text-xs font-bold rounded-xl border-none cursor-pointer shadow-sm hover:scale-105 active:scale-95 transition-all"
                      >
                        Claim
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MY VEHICLES (Exact PolicyHolder MyVehicles cards and layout) */}
        {/* ========================================================================= */}
        {activeTab === "vehicles" && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Authorized Operating Vehicles</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Vehicles permitted for driver operation under Policyholder {profile?.policyHolderName}
                </p>
              </div>
              <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white text-slate-700 border border-slate-200 shadow-2xs self-start sm:self-auto">
                {vehicles.length} Vehicles Insured
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vehicles.map((v) => {
                const theme = getVehicleTheme(v.vehicleType || "Car");
                return (
                  <div
                    key={v.numberPlate}
                    className="bg-white border border-slate-200/90 rounded-[28px] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[220px]"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-white rounded-lg font-mono font-bold text-xs tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <span>{formatPlate(v.numberPlate)}</span>
                        </div>

                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active Coverage
                        </span>
                      </div>

                      <div className="flex items-center gap-3.5 my-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${theme.bg} ${theme.border} border`}>
                          {getVehicleIconSvg(v.vehicleType || "Car", `w-6 h-6 ${theme.text}`)}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 leading-tight">
                            {v.company} {v.model}
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5">{v.vehicleType} • {v.year}</p>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs">
                        <div className="flex justify-between text-slate-500">
                          <span>Policy Number:</span>
                          <span className="font-mono text-slate-800 font-semibold">{v.policyNumber || "SANASA-COMPREHENSIVE"}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Owner:</span>
                          <span className="text-slate-800 font-medium">{profile?.policyHolderName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setClaimPlate(v.numberPlate);
                          setActiveTab("new_claim");
                        }}
                        className="w-full py-2.5 bg-[#ff9800] hover:bg-[#ff8f00] text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 border-none cursor-pointer shadow-sm active:scale-95"
                      >
                        <HugeiconsIcon icon={Camera01Icon} className="w-4 h-4 text-white" />
                        <span>Lodge Claim for This Vehicle</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: NEW CLAIM (Exact PolicyHolder New_Claim Form) */}
        {/* ========================================================================= */}
        {activeTab === "new_claim" && (
          <section className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white border border-slate-200/90 rounded-[28px] p-6 sm:p-10 shadow-sm">
              <div className="pb-4 border-b border-slate-100 mb-6">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-600 border border-orange-200 uppercase tracking-wider">
                  Accident Claim Lodgment
                </span>
                <h2 className="text-2xl font-bold text-slate-900 mt-2">
                  Lodge Vehicle Accident Claim
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Fill in incident details for your authorized vehicle. Claims are routed directly to regional branch officers.
                </p>
              </div>

              {submittedClaimNumber && (
                <div className="mb-6 p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-emerald-900 text-sm">Claim Successfully Lodged</h4>
                  <p className="text-xs text-slate-700 mt-1 font-mono font-bold">
                    Claim Reference ID: {submittedClaimNumber}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Your claim has been assigned to {profile?.branch || "regional"} branch inspection queue.
                  </p>
                  <div className="mt-4 flex justify-center gap-3">
                    <button
                      onClick={() => setSubmittedClaimNumber(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer border-none"
                    >
                      Submit Another Claim
                    </button>
                    <button
                      onClick={() => setActiveTab("my_claims")}
                      className="px-4 py-2 bg-[#0d2a3a] text-white rounded-xl text-xs font-bold cursor-pointer border-none shadow-sm"
                    >
                      View in My Claims
                    </button>
                  </div>
                </div>
              )}

              {claimFormError && (
                <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center gap-2">
                  <HugeiconsIcon icon={Alert02Icon} className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{claimFormError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitClaim} className="space-y-5 text-xs">
                {/* 1. Vehicle Selection */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">
                    Authorized Operating Vehicle <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={claimPlate}
                    onChange={(e) => setClaimPlate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:border-[#0d2a3a]"
                    required
                  >
                    {vehicles.map((v) => (
                      <option key={v.numberPlate} value={v.numberPlate}>
                        {formatPlate(v.numberPlate)} — {v.company} {v.model} ({v.vehicleType})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Date & Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1.5">
                      Incident Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={claimDate}
                      onChange={(e) => setClaimDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:border-[#0d2a3a]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1.5">
                      Incident Time <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={claimTime}
                      onChange={(e) => setClaimTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:border-[#0d2a3a]"
                      required
                    />
                  </div>
                </div>

                {/* 3. Location & Damage Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1.5">
                      Incident Location <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Galle Road, Kalutara or Matara"
                      value={claimLocation}
                      onChange={(e) => setClaimLocation(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:border-[#0d2a3a]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1.5">
                      Damage Category <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={claimDamageType}
                      onChange={(e) => setClaimDamageType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:border-[#0d2a3a]"
                    >
                      <option value="Front Collision">Front Collision</option>
                      <option value="Rear-End Impact">Rear-End Impact</option>
                      <option value="Side Impact / T-Bone">Side Impact / T-Bone</option>
                      <option value="Scratch & Body Dent">Scratch & Body Dent</option>
                      <option value="Windshield / Glass Damage">Windshield / Glass Damage</option>
                      <option value="Multiple Area Collision">Multiple Area Collision</option>
                    </select>
                  </div>
                </div>

                {/* 4. Description */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">
                    Incident Description <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe how the accident occurred, road conditions, and any other parties involved..."
                    value={claimDesc}
                    onChange={(e) => setClaimDesc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:border-[#0d2a3a]"
                    required
                  />
                </div>

                {/* 5. Accident Damage Photos */}
                <div className="pt-2 border-t border-slate-100">
                  <h4 className="font-bold text-slate-800 text-xs mb-1">Damage Photographs</h4>
                  <p className="text-[11px] text-slate-400 mb-3">Upload clear photographs of damage.</p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { label: "Front Damage", state: photoFront, setter: setPhotoFront },
                      { label: "Rear Damage", state: photoRear, setter: setPhotoRear },
                      { label: "Side Damage", state: photoSide, setter: setPhotoSide }
                    ].map((slot, i) => (
                      <div key={i} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                        <span className="text-[11px] text-slate-700 font-medium block mb-2">{slot.label}</span>
                        {slot.state ? (
                          <div className="relative mb-2">
                            <img src={slot.state} alt={slot.label} className="w-full h-24 object-cover rounded-xl" />
                            <button
                              type="button"
                              onClick={() => slot.setter("")}
                              className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 text-[10px] cursor-pointer border-none"
                            >
                              &times;
                            </button>
                          </div>
                        ) : (
                          <label className="block border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-xl p-4 cursor-pointer bg-white">
                            <HugeiconsIcon icon={Upload01Icon} className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                            <span className="text-[10px] text-slate-500 font-semibold">Upload Photo</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageFile(e, slot.setter)}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="submit"
                    disabled={submittingClaim}
                    className="w-full sm:w-auto px-10 py-3 bg-[#0d2a3a] hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 border-none"
                  >
                    {submittingClaim ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Submitting Claim...</span>
                      </>
                    ) : (
                      <>
                        <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4 text-white" />
                        <span>Submit Claim to Branch</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: MY CLAIMS (Exact PolicyHolder My_claims list and details) */}
        {/* ========================================================================= */}
        {activeTab === "my_claims" && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Your Lodged Claims</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Track inspection stages and review documents submitted for authorized vehicles
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={refreshClaims}
                  disabled={loadingClaims}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border-none cursor-pointer flex items-center gap-1.5"
                >
                  <span>{loadingClaims ? "Refreshing..." : "Refresh"}</span>
                </button>
                <button
                  onClick={() => setActiveTab("new_claim")}
                  className="px-4 py-2 bg-[#ff9800] hover:bg-[#ff8f00] text-white text-xs font-bold rounded-xl cursor-pointer border-none shadow-sm"
                >
                  + Lodge Claim
                </button>
              </div>
            </div>

            {claims.length === 0 ? (
              <div className="bg-white border border-slate-200/90 rounded-[28px] p-12 text-center shadow-xs">
                <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <HugeiconsIcon icon={Clock01Icon} className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm mb-1">No Claims Lodged</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                  You haven't submitted any accident claims for your authorized vehicles yet.
                </p>
                <button
                  onClick={() => setActiveTab("new_claim")}
                  className="px-5 py-2.5 bg-[#0d2a3a] text-white text-xs font-semibold rounded-xl border-none cursor-pointer shadow-sm"
                >
                  Lodge First Claim
                </button>
              </div>
            ) : (
              <div className="bg-white border border-slate-200/90 rounded-[28px] overflow-hidden shadow-xs divide-y divide-slate-100">
                {claims.map((claim) => (
                  <div
                    key={claim.claimNumber}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div className="px-3 py-1.5 bg-slate-900 text-white rounded-xl font-mono font-bold text-xs tracking-wider flex-shrink-0">
                        {formatPlate(claim.vehiclePlate)}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 text-sm">{claim.claimNumber}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            claim.status === "Approved" || claim.status === "Settled"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : claim.status === "Review" || claim.status === "Inspection"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>
                            {claim.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {claim.damageType} • Incident: {claim.incidentDate} • {claim.location}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenClaimDetails(claim.claimNumber)}
                      className="px-4 py-2 bg-[#0d2a3a] hover:bg-slate-800 text-white font-semibold text-xs rounded-xl border-none transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs self-end md:self-auto"
                    >
                      <HugeiconsIcon icon={ViewIcon} className="w-3.5 h-3.5 text-white" />
                      <span>View Details</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: DOCUMENTS (Exact PolicyHolder Documents vault) */}
        {/* ========================================================================= */}
        {activeTab === "documents" && (
          <section className="max-w-4xl mx-auto space-y-6">
            <div className="pb-4 border-b border-slate-200/80">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Claim Documents & Evidence</h2>
              <p className="text-xs text-slate-500 mt-1">
                Attach repair estimates, police reports, or additional accident evidence
              </p>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-[28px] p-6 sm:p-8 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">Upload Supporting Document</h3>

              {docUploadSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs">
                  {docUploadSuccess}
                </div>
              )}
              {docUploadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                  {docUploadError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Select Claim</label>
                  <select
                    value={uploadTargetClaim}
                    onChange={(e) => setUploadTargetClaim(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-[#0d2a3a]"
                  >
                    <option value="">-- Choose Claim --</option>
                    {claims.map((c) => (
                      <option key={c.claimNumber} value={c.claimNumber}>
                        {c.claimNumber} ({c.vehiclePlate} - {c.damageType})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Document Title / Type</label>
                  <input
                    type="text"
                    placeholder="e.g. Police Report, Repair Estimate, Receipt"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-[#0d2a3a]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold text-xs mb-1">Select File</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleImageFile(e, setDocFileBase64)}
                    className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                  />
                  {docFileBase64 && (
                    <span className="text-xs text-emerald-600 font-semibold">File Attached</span>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleUploadDocument}
                  disabled={uploadingDoc || !uploadTargetClaim || !docName || !docFileBase64}
                  className="px-6 py-2.5 bg-[#0d2a3a] hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2 border-none"
                >
                  {uploadingDoc ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <HugeiconsIcon icon={Upload01Icon} className="w-3.5 h-3.5 text-white" />
                      <span>Attach to Claim</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: DIGITAL PASS (Official Sanasa Digital Pass) */}
        {/* ========================================================================= */}
        {activeTab === "digital_pass" && (
          <section className="max-w-xl mx-auto space-y-6">
            <div className="bg-white border border-slate-200/90 rounded-[28px] p-6 sm:p-8 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between pb-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <Image
                    src="/logo.png"
                    alt="Sanasa General Insurance"
                    width={110}
                    height={44}
                    className="h-9 w-auto object-contain"
                  />
                  <div className="border-l border-slate-200 pl-3">
                    <h3 className="font-bold text-slate-900 text-sm">Digital Driver Pass</h3>
                    <p className="text-[11px] text-slate-400">Official Authorization • Sri Lanka</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>VERIFIED PASS</span>
                </div>
              </div>

              <div className="py-6 space-y-4">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Authorized Driver</span>
                  <span className="text-xl font-bold text-slate-900 block mt-0.5">{profile?.driverName}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10.5px] uppercase font-bold block">Masked NIC</span>
                    <span className="font-mono text-slate-800 font-semibold">{profile?.driverNicMasked}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10.5px] uppercase font-bold block">Phone Number</span>
                    <span className="font-mono text-slate-800">{profile?.driverPhone}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-2">
                  <div className="flex justify-between text-slate-500">
                    <span>Vehicle Owner (Policyholder):</span>
                    <span className="font-semibold text-slate-900">{profile?.policyHolderName}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Regional Branch Office:</span>
                    <span className="font-semibold text-slate-900">{profile?.branch}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Pass Reference:</span>
                    <span className="font-mono text-[#0d2a3a] font-bold">{profile?.reference}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Verification Token:</span>
                    <span className="font-mono text-slate-900 font-bold">{profile?.verificationToken}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 text-[10.5px] uppercase font-bold tracking-wider block mb-2">
                    Authorized Operating Vehicles
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {vehicles.map((v) => (
                      <span
                        key={v.numberPlate}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-white rounded-lg font-mono font-bold text-xs"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <span>{formatPlate(v.numberPlate)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Sanasa Central Cryptographic Registry</span>
                <span>Valid Across Sri Lanka</span>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Claim Details Modal */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 shadow-xl relative max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 bg-slate-900 text-white rounded-xl font-mono font-bold text-xs">
                  {formatPlate(selectedClaim.vehiclePlate)}
                </span>
                <div>
                  <h3 className="font-mono font-bold text-slate-900 text-sm">{selectedClaim.claimNumber}</h3>
                  <p className="text-[11px] text-slate-400">
                    Lodged: {new Date(selectedClaim.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedClaim(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center border-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
                Claim Verification Pipeline
              </span>

              <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                {[
                  { step: 1, label: "Submitted" },
                  { step: 2, label: "Branch Review" },
                  { step: 3, label: "Inspection" },
                  { step: 4, label: "Settlement" },
                ].map((s) => {
                  const isDone = (selectedClaim.currentStep || 1) >= s.step;
                  return (
                    <div key={s.step} className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${
                        isDone ? "bg-[#0d2a3a] text-white" : "bg-slate-200 text-slate-500"
                      }`}>
                        {s.step}
                      </div>
                      <span className={isDone ? "text-slate-900 font-bold" : "text-slate-400"}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Damage Type:</span>
                <span className="text-slate-900 font-semibold">{selectedClaim.damageType}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Location:</span>
                <span className="text-slate-900">{selectedClaim.location}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Branch:</span>
                <span className="text-slate-900">{selectedClaim.branch || profile?.branch}</span>
              </div>
              {selectedClaim.description && (
                <div className="pt-2">
                  <span className="text-slate-500 block mb-1">Description:</span>
                  <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700">
                    {selectedClaim.description}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedClaim(null)}
                className="px-5 py-2 bg-[#0d2a3a] hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer border-none shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POLICYHOLDER FOOTER (Exact same footer used across the entire Policyholder website) */}
      <PolicyHolderFooter />
    </div>
  );
}
