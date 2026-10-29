"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { API_URL } from "../../config";
import SimpleLoader from "@/app/Components/SimpleLoader";
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
  Tick01Icon,
  BubbleChatIcon,
  Search01Icon
} from "@hugeicons/core-free-icons";

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

type TabType = "dashboard" | "vehicles" | "submit_claim" | "my_claims" | "documents" | "digital_pass" | "profile";

export default function ThirdPartyDriverPortalPage() {
  const params = useParams();
  const token = params?.token as string;

  // Session & Auth
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedOut, setIsLoggedOut] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");

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

  // Document Upload in Modal or Documents Tab
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

        // Fetch driver profile & vehicles in parallel
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

  // Refresh Claims
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

  // Open Claim Details Modal
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

  // Image Upload Helper
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

  // Submit Claim Handler
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
      // Reset form
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

  // Document Upload Handler
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

      // Update active modal if open
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

  // Logout Handler
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

  // Stats for Dashboard
  const openClaimsCount = useMemo(() => {
    return claims.filter((c) => c.status !== "Settled" && c.status !== "Rejected").length;
  }, [claims]);

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white select-none">
        <div className="w-14 h-14 border-4 border-[#00ddff] border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-bold">Authenticating Driver Access Portal...</h2>
        <p className="text-slate-400 text-xs mt-1">Verifying cryptographic digital token with Sanasa Insurance security server</p>
      </div>
    );
  }

  // Error / Revocation Screen
  if (error || !sessionToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-6 text-white font-sans select-none">
        <div className="max-w-md w-full bg-slate-900/90 border border-rose-500/30 rounded-3xl p-8 text-center shadow-2xl backdrop-blur-md">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-4">
            <HugeiconsIcon icon={Alert02Icon} className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Access Link Inactive or Revoked</h2>
          <p className="text-slate-400 text-xs leading-relaxed mb-6">
            {error || "This driver authorization token is no longer active, has expired, or was revoked by the vehicle owner or regional branch."}
          </p>
          <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 text-left text-xs space-y-2 mb-6">
            <div className="flex justify-between text-slate-400">
              <span>Security Reference:</span>
              <span className="font-mono text-slate-200">{token ? token.substring(0, 12).toUpperCase() : "N/A"}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Need Assistance:</span>
              <span className="text-cyan-400 font-semibold">1331 (Hotline)</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Sanasa General Insurance Lanka PLC • Automated Security Safeguard
          </p>
        </div>
      </div>
    );
  }

  // Safe Logout Screen
  if (isLoggedOut) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white select-none">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-white mb-1">Session Closed</h2>
          <p className="text-slate-400 text-xs mb-6">
            You have safely logged out of the Third-Party Driver Portal. To re-access, reopen your secure invitation URL.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-[#102A43] hover:bg-[#163e63] text-white rounded-xl text-xs font-bold transition-all border border-slate-700 cursor-pointer"
          >
            Re-open Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#102A43] border border-cyan-400/40 text-white text-xs px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP PORTAL NAVBAR */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-extrabold text-slate-950 shadow-md">
            S
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-extrabold text-white tracking-wide">SANASA INSURANCE</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                DRIVER PORTAL
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Authorized Driver: <span className="text-white font-semibold">{profile?.driverName}</span>
            </p>
          </div>
        </div>

        {/* Right Nav Action: Branch & Logout */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-300">
            <span className="text-slate-400">Branch:</span>
            <span className="font-semibold text-white">{profile?.branch || "Galle"}</span>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            title="Logout from driver session"
          >
            <HugeiconsIcon icon={Logout01Icon} className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* PORTAL NAVIGATION TABS BAR */}
      <nav className="bg-slate-900 border-b border-slate-800/80 px-4 sm:px-8 overflow-x-auto select-none">
        <div className="flex items-center gap-2 py-2 max-w-7xl mx-auto">
          {[
            { id: "dashboard", label: "Dashboard", icon: ShieldCheckIcon },
            { id: "vehicles", label: `My Vehicles (${vehicles.length})`, icon: Car01Icon },
            { id: "submit_claim", label: "Submit Claim", icon: Camera01Icon },
            { id: "my_claims", label: `My Claims (${claims.length})`, icon: Clock01Icon },
            { id: "documents", label: "Claim Documents", icon: File01Icon },
            { id: "digital_pass", label: "Digital Pass", icon: ShieldCheckIcon },
            { id: "profile", label: "Profile", icon: UserCheck01Icon },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                  isActive
                    ? "bg-[#102A43] text-white border-cyan-400/40 shadow-sm"
                    : "text-slate-400 hover:text-white bg-transparent border-transparent hover:bg-slate-800/60"
                }`}
              >
                <HugeiconsIcon icon={tab.icon} className={`w-3.5 h-3.5 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8">
        
        {/* ========================================================= */}
        {/* TAB 1: DASHBOARD */}
        {/* ========================================================= */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Hero Welcome Card */}
            <div className="bg-gradient-to-r from-[#102A43] via-[#163e63] to-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>ACTIVE AUTHORIZED DRIVER</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
                  Welcome, {profile?.driverName}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                  You are officially authorized to operate insured vehicles under policyholder{" "}
                  <span className="text-white font-semibold">{profile?.policyHolderName}</span>. 
                  Use this secure portal to manage authorized vehicles, lodge accident claims, and review claim statuses directly.
                </p>

                {/* Quick CTA buttons */}
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setActiveTab("submit_claim")}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    <HugeiconsIcon icon={Camera01Icon} className="w-4 h-4 text-slate-950" />
                    <span>Lodge New Claim</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("digital_pass")}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-all cursor-pointer"
                  >
                    <HugeiconsIcon icon={ShieldCheckIcon} className="w-4 h-4 text-cyan-400" />
                    <span>View Digital Pass</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xs">
                <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider block">Assigned Vehicles</span>
                <span className="text-2xl font-black text-white mt-1 block">{vehicles.length}</span>
                <span className="text-[11px] text-emerald-400 mt-1 block font-medium">All actively insured</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xs">
                <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider block">Open Claims</span>
                <span className="text-2xl font-black text-cyan-400 mt-1 block">{openClaimsCount}</span>
                <span className="text-[11px] text-slate-500 mt-1 block">In review or inspection</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xs">
                <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider block">Total Claims</span>
                <span className="text-2xl font-black text-white mt-1 block">{claims.length}</span>
                <span className="text-[11px] text-slate-500 mt-1 block">Lodged under this driver</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xs">
                <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider block">Branch</span>
                <span className="text-base font-bold text-white mt-2 block truncate">{profile?.branch || "Galle"}</span>
                <span className="text-[11px] text-slate-400 mt-1 block">Regional Sanasa Office</span>
              </div>
            </div>

            {/* Recent Claims Overview */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                <div>
                  <h3 className="font-bold text-white text-base">Recent Claim Activity</h3>
                  <p className="text-xs text-slate-400">Claims submitted for authorized vehicles</p>
                </div>
                <button
                  onClick={() => setActiveTab("my_claims")}
                  className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 bg-transparent border-none cursor-pointer"
                >
                  <span>View All</span>
                  <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5" />
                </button>
              </div>

              {claims.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
                    <HugeiconsIcon icon={ShieldCheckIcon} className="w-6 h-6 text-slate-400" />
                  </div>
                  <h4 className="font-bold text-slate-300 text-sm mb-1">No Claims Submitted Yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                    If an incident occurs with an authorized vehicle, you can lodge a claim here anytime.
                  </p>
                  <button
                    onClick={() => setActiveTab("submit_claim")}
                    className="px-4 py-2 bg-[#102A43] hover:bg-[#163e63] text-white text-xs font-semibold rounded-xl border border-slate-700 cursor-pointer"
                  >
                    Lodge First Claim
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {claims.slice(0, 3).map((c) => (
                    <div key={c.claimNumber} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="px-2.5 py-1 bg-slate-950 text-white rounded-lg font-mono font-bold text-xs border border-slate-800">
                          {c.vehiclePlate}
                        </div>
                        <div>
                          <span className="font-bold text-white text-xs block font-mono">{c.claimNumber}</span>
                          <span className="text-[11px] text-slate-400">
                            {c.damageType} • {c.incidentDate} • {c.location}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          c.status === "Approved" || c.status === "Settled"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : c.status === "Review" || c.status === "Inspection"
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        }`}>
                          {c.status}
                        </span>

                        <button
                          onClick={() => handleOpenClaimDetails(c.claimNumber)}
                          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold border border-slate-700 cursor-pointer"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: MY VEHICLES */}
        {/* ========================================================= */}
        {activeTab === "vehicles" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-extrabold text-white">Authorized Insured Vehicles</h2>
                <p className="text-xs text-slate-400">
                  Vehicles permitted for driver operation under Policyholder {profile?.policyHolderName}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 self-start sm:self-auto">
                {vehicles.length} Authorized Vehicles
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {vehicles.map((v) => (
                <div
                  key={v.numberPlate}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 shadow-sm transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Plate and Status */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-950 text-white rounded-lg font-mono font-bold text-xs tracking-wider border border-slate-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <span>{v.numberPlate}</span>
                      </div>

                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        Active Coverage
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white mb-1">
                      {v.company} {v.model}
                    </h3>
                    <p className="text-xs text-slate-400 mb-4">
                      {v.vehicleType} • {v.year}
                    </p>

                    <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Policy Ref:</span>
                        <span className="font-mono text-slate-200">{v.policyNumber || "SANASA-COMPREHENSIVE"}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Coverage Expiry:</span>
                        <span className="text-slate-200">{v.policyExpiryDate || "2027-11-20"}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Owner:</span>
                        <span className="text-slate-200">{profile?.policyHolderName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-800">
                    <button
                      onClick={() => {
                        setClaimPlate(v.numberPlate);
                        setActiveTab("submit_claim");
                      }}
                      className="w-full py-2.5 bg-[#102A43] hover:bg-[#163e63] text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-700 cursor-pointer active:scale-[0.98]"
                    >
                      <HugeiconsIcon icon={Camera01Icon} className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Lodge Claim for This Vehicle</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: SUBMIT CLAIM */}
        {/* ========================================================= */}
        {activeTab === "submit_claim" && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
              <div className="pb-4 border-b border-slate-800 mb-6">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider">
                  Accident Claim Lodgment
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-2">
                  Submit Third-Party Driver Claim
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Lodge an accident or damage claim for your assigned vehicle. Reuses Sanasa standard verification and inspection routing.
                </p>
              </div>

              {submittedClaimNumber && (
                <div className="mb-6 p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-emerald-300 text-sm">Claim Successfully Lodged</h4>
                  <p className="text-xs text-slate-300 mt-1 font-mono font-bold">
                    Claim Reference ID: {submittedClaimNumber}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Your claim has been assigned to {profile?.branch || "regional"} branch inspection queue.
                  </p>
                  <div className="mt-4 flex justify-center gap-3">
                    <button
                      onClick={() => setSubmittedClaimNumber(null)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer border border-slate-700"
                    >
                      Submit Another Claim
                    </button>
                    <button
                      onClick={() => setActiveTab("my_claims")}
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      View in My Claims
                    </button>
                  </div>
                </div>
              )}

              {claimFormError && (
                <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-center gap-2">
                  <HugeiconsIcon icon={Alert02Icon} className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{claimFormError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitClaim} className="space-y-5 text-xs">
                {/* 1. Vehicle Selection */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">
                    Authorized Vehicle <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={claimPlate}
                    onChange={(e) => setClaimPlate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-400"
                    required
                  >
                    {vehicles.map((v) => (
                      <option key={v.numberPlate} value={v.numberPlate}>
                        {v.numberPlate} — {v.company} {v.model} ({v.vehicleType})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Only vehicles assigned to you by the policyholder are selectable.
                  </p>
                </div>

                {/* 2. Date & Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1.5">
                      Incident Date <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={claimDate}
                      onChange={(e) => setClaimDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1.5">
                      Incident Time <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="time"
                      value={claimTime}
                      onChange={(e) => setClaimTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-400"
                      required
                    />
                  </div>
                </div>

                {/* 3. Location & Damage Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1.5">
                      Incident Location (City/Road) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Galle Road, Kalutara or Matara"
                      value={claimLocation}
                      onChange={(e) => setClaimLocation(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1.5">
                      Damage Category <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={claimDamageType}
                      onChange={(e) => setClaimDamageType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-400"
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
                  <label className="block text-slate-300 font-semibold mb-1.5">
                    Incident Description <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe how the accident occurred, road conditions, and any other parties involved..."
                    value={claimDesc}
                    onChange={(e) => setClaimDesc(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-400"
                    required
                  />
                </div>

                {/* 5. Accident Photos (Front, Rear, Side) */}
                <div className="pt-2 border-t border-slate-800">
                  <h4 className="font-bold text-white text-xs mb-1">Accident Damage Photographs</h4>
                  <p className="text-[11px] text-slate-400 mb-3">
                    Upload clear photographs of the damage from different angles.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { label: "Front Damage", state: photoFront, setter: setPhotoFront, id: "accFront" },
                      { label: "Rear Damage", state: photoRear, setter: setPhotoRear, id: "accRear" },
                      { label: "Side Damage", state: photoSide, setter: setPhotoSide, id: "accSide" }
                    ].map((slot) => (
                      <div key={slot.id} className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                        <span className="text-[11px] text-slate-300 font-medium block mb-2">{slot.label}</span>
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
                          <label className="block border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-4 cursor-pointer">
                            <HugeiconsIcon icon={Upload01Icon} className="w-5 h-5 text-slate-500 mx-auto mb-1" />
                            <span className="text-[10px] text-slate-400">Upload Photo</span>
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

                {/* 6. Driving License Photographs */}
                <div className="pt-2 border-t border-slate-800">
                  <h4 className="font-bold text-white text-xs mb-1">Driver's License Photographs</h4>
                  <p className="text-[11px] text-slate-400 mb-3">
                    Verification of the operating third-party driver license at time of incident.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { label: "License Front", state: dlFront, setter: setDlFront, id: "dlFront" },
                      { label: "License Back", state: dlBack, setter: setDlBack, id: "dlBack" }
                    ].map((slot) => (
                      <div key={slot.id} className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                        <span className="text-[11px] text-slate-300 font-medium block mb-2">{slot.label}</span>
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
                          <label className="block border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-4 cursor-pointer">
                            <HugeiconsIcon icon={Upload01Icon} className="w-5 h-5 text-slate-500 mx-auto mb-1" />
                            <span className="text-[10px] text-slate-400">Upload License</span>
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
                <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                  <button
                    type="submit"
                    disabled={submittingClaim}
                    className="w-full sm:w-auto px-8 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {submittingClaim ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        <span>Submitting to Sanasa Network...</span>
                      </>
                    ) : (
                      <>
                        <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4 text-slate-950" />
                        <span>Submit Claim to Branch</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: MY CLAIMS */}
        {/* ========================================================= */}
        {activeTab === "my_claims" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-extrabold text-white">My Authorized Claims</h2>
                <p className="text-xs text-slate-400">
                  Track status, inspection stages, and view authorized documents for your claims
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={refreshClaims}
                  disabled={loadingClaims}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 cursor-pointer flex items-center gap-1.5"
                >
                  <span>{loadingClaims ? "Refreshing..." : "Refresh"}</span>
                </button>
                <button
                  onClick={() => setActiveTab("submit_claim")}
                  className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-xl cursor-pointer"
                >
                  + Lodge Claim
                </button>
              </div>
            </div>

            {claims.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center shadow-xs">
                <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <HugeiconsIcon icon={Clock01Icon} className="w-6 h-6 text-slate-400" />
                </div>
                <h3 className="font-bold text-white text-sm mb-1">No Claims Lodged</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                  You haven't submitted any accident claims for your authorized vehicles yet.
                </p>
                <button
                  onClick={() => setActiveTab("submit_claim")}
                  className="px-4 py-2 bg-[#102A43] hover:bg-[#163e63] text-white text-xs font-semibold rounded-xl border border-slate-700 cursor-pointer"
                >
                  Lodge a Claim
                </button>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xs divide-y divide-slate-800">
                {claims.map((claim) => (
                  <div
                    key={claim.claimNumber}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div className="px-3 py-1.5 bg-slate-950 text-white rounded-xl font-mono font-bold text-xs tracking-wider border border-slate-800 flex-shrink-0">
                        {claim.vehiclePlate}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white text-sm">{claim.claimNumber}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            claim.status === "Approved" || claim.status === "Settled"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : claim.status === "Review" || claim.status === "Inspection"
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          }`}>
                            {claim.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {claim.damageType} • Incident Date: {claim.incidentDate} {claim.incidentTime || ""} • Location: {claim.location}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-auto">
                      <button
                        onClick={() => handleOpenClaimDetails(claim.claimNumber)}
                        className="px-4 py-2 bg-[#102A43] hover:bg-[#163e63] text-white font-semibold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
                      >
                        <HugeiconsIcon icon={ViewIcon} className="w-3.5 h-3.5 text-cyan-400" />
                        <span>View Details & Progress</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: CLAIM DOCUMENTS */}
        {/* ========================================================= */}
        {activeTab === "documents" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="pb-2 border-b border-slate-800">
              <h2 className="text-xl font-extrabold text-white">Claim Documents & Evidence</h2>
              <p className="text-xs text-slate-400">
                Upload requested repair estimates, police reports, or additional accident evidence
              </p>
            </div>

            {/* Document Upload Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-white text-sm">Upload Supporting Document</h3>

              {docUploadSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs">
                  {docUploadSuccess}
                </div>
              )}
              {docUploadError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
                  {docUploadError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Select Claim</label>
                  <select
                    value={uploadTargetClaim}
                    onChange={(e) => setUploadTargetClaim(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-400"
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
                  <label className="block text-slate-300 font-semibold mb-1">Document Title / Type</label>
                  <input
                    type="text"
                    placeholder="e.g. Police Report, Repair Estimate, Receipt"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold text-xs mb-1">Select File</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleImageFile(e, setDocFileBase64)}
                    className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-white hover:file:bg-slate-700 cursor-pointer"
                  />
                  {docFileBase64 && (
                    <span className="text-xs text-emerald-400 font-medium">File Attached</span>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleUploadDocument}
                  disabled={uploadingDoc || !uploadTargetClaim || !docName || !docFileBase64}
                  className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
                >
                  {uploadingDoc ? (
                    <>
                      <div className="w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <HugeiconsIcon icon={Upload01Icon} className="w-3.5 h-3.5 text-slate-950" />
                      <span>Attach to Claim</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: DIGITAL PASS (PRESERVED VERIFICATION CARD) */}
        {/* ========================================================= */}
        {activeTab === "digital_pass" && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Header */}
              <div className="flex items-center justify-between pb-5 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-black text-slate-950 shadow-md">
                    S
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-sm">SANASA GENERAL INSURANCE</h3>
                    <p className="text-[11px] text-cyan-300 font-medium">Official Digital Driver Pass • Sri Lanka</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>VERIFIED PASS</span>
                </div>
              </div>

              {/* Pass Content */}
              <div className="py-6 space-y-4">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Authorized Driver</span>
                  <span className="text-xl font-black text-white block mt-0.5">{profile?.driverName}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10.5px] uppercase font-bold block">Masked NIC</span>
                    <span className="font-mono text-slate-200 font-semibold">{profile?.driverNicMasked}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10.5px] uppercase font-bold block">Phone Number</span>
                    <span className="font-mono text-slate-200">{profile?.driverPhone}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs space-y-2">
                  <div className="flex justify-between text-slate-400">
                    <span>Vehicle Owner (Policyholder):</span>
                    <span className="font-semibold text-white">{profile?.policyHolderName}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Regional Branch Office:</span>
                    <span className="font-semibold text-white">{profile?.branch}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Pass Reference:</span>
                    <span className="font-mono text-cyan-400 font-bold">{profile?.reference}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Verification Token:</span>
                    <span className="font-mono text-white font-bold">{profile?.verificationToken}</span>
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
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-950 border border-slate-800 text-white rounded-lg font-mono font-bold text-xs"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <span>{v.numberPlate}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pass Footer */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                <span>Sanasa Central Cryptographic Ledger</span>
                <span>Valid Across Sri Lanka</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 7: PROFILE */}
        {/* ========================================================= */}
        {activeTab === "profile" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
              <h2 className="text-xl font-extrabold text-white mb-1">Driver Profile & Authorization</h2>
              <p className="text-xs text-slate-400 mb-6">
                Verified identification parameters under Sanasa Insurance regulation
              </p>

              <div className="space-y-4 text-xs divide-y divide-slate-800/80">
                <div className="pt-3 flex justify-between items-center">
                  <span className="text-slate-400">Authorized Full Name</span>
                  <span className="font-bold text-white text-sm">{profile?.driverName}</span>
                </div>
                <div className="pt-3 flex justify-between items-center">
                  <span className="text-slate-400">Identification (NIC)</span>
                  <span className="font-mono text-slate-200 font-semibold">{profile?.driverNicMasked}</span>
                </div>
                <div className="pt-3 flex justify-between items-center">
                  <span className="text-slate-400">Mobile Phone</span>
                  <span className="font-mono text-slate-200">{profile?.driverPhone}</span>
                </div>
                <div className="pt-3 flex justify-between items-center">
                  <span className="text-slate-400">Residential Address</span>
                  <span className="text-slate-200 max-w-xs text-right">{profile?.driverAddress}</span>
                </div>
                <div className="pt-3 flex justify-between items-center">
                  <span className="text-slate-400">Authorized Vehicles</span>
                  <span className="font-bold text-cyan-400">{vehicles.length} vehicle(s)</span>
                </div>
                <div className="pt-3 flex justify-between items-center">
                  <span className="text-slate-400">Policyholder (Owner)</span>
                  <span className="text-slate-200 font-semibold">{profile?.policyHolderName}</span>
                </div>
                <div className="pt-3 flex justify-between items-center">
                  <span className="text-slate-400">Branch Office</span>
                  <span className="text-slate-200 font-semibold">{profile?.branch}</span>
                </div>
                <div className="pt-3 flex justify-between items-center">
                  <span className="text-slate-400">Authorization Reference</span>
                  <span className="font-mono text-slate-200 font-bold">{profile?.reference}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* CLAIM DETAILS MODAL */}
      {/* ========================================================= */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 bg-slate-950 text-white rounded-xl font-mono font-bold text-xs border border-slate-800">
                  {selectedClaim.vehiclePlate}
                </span>
                <div>
                  <h3 className="font-mono font-bold text-white text-sm">{selectedClaim.claimNumber}</h3>
                  <p className="text-[11px] text-slate-400">
                    Lodged: {new Date(selectedClaim.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedClaim(null)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center border-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Claim Progress Stepper */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs">
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
                        isDone ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-500"
                      }`}>
                        {s.step}
                      </div>
                      <span className={isDone ? "text-white font-semibold" : "text-slate-500"}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Incident Summary */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Damage Type:</span>
                <span className="text-white font-semibold">{selectedClaim.damageType}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Location:</span>
                <span className="text-white">{selectedClaim.location}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Branch:</span>
                <span className="text-white">{selectedClaim.branch || profile?.branch}</span>
              </div>
              {selectedClaim.description && (
                <div className="pt-2">
                  <span className="text-slate-400 block mb-1">Description:</span>
                  <p className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-slate-300">
                    {selectedClaim.description}
                  </p>
                </div>
              )}
            </div>

            {/* Attached Documents List */}
            {selectedClaim.additionalDocuments && selectedClaim.additionalDocuments.length > 0 && (
              <div className="pt-2 border-t border-slate-800 text-xs">
                <span className="font-bold text-white block mb-2">Attached Documents</span>
                <div className="space-y-1.5">
                  {selectedClaim.additionalDocuments.map((doc, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{doc.name}</span>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 font-semibold"
                      >
                        View Document
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Close Modal */}
            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedClaim(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer border border-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PORTAL FOOTER */}
      <footer className="mt-auto bg-slate-950 border-t border-slate-800/80 py-4 px-4 sm:px-8 text-center text-xs text-slate-500">
        <p>SANASA General Insurance Lanka PLC • Authorized Third-Party Driver Portal</p>
        <p className="text-[11px] text-slate-600 mt-0.5">Automated Cryptographic Access • Confidential Insurance System</p>
      </footer>
    </div>
  );
}
