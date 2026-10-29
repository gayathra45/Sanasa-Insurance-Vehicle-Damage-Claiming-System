"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PolicyHolderNavbar from "@/app/Components/Policy_Holder/Navbar";
import PolicyHolderFooter from "@/app/Components/Policy_Holder/footer";
import SimpleLoader from "@/app/Components/SimpleLoader";
import { API_URL } from "@/app/config";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserAdd01Icon,
  Clock01Icon,
  Car01Icon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
  Alert02Icon,
  CreditCardIcon,
  ArrowRight01Icon,
  File01Icon,
  Upload01Icon,
  Building04Icon,
  InformationCircleIcon,
  Shield01Icon,
  UserCheck01Icon
} from "@hugeicons/core-free-icons";

interface Vehicle {
  _id: string;
  numberPlate: string;
  vehicleType: string;
  model: string;
  company: string;
  year: string;
  policyNumber: string;
  status: string;
}

interface RegistrationRequest {
  _id: string;
  requestReference: string;
  policyHolderNic: string;
  policyHolderName: string;
  branch: string;
  driverDetails: {
    fullName: string;
    residentialAddress: string;
    phoneNumber: string;
    nicNumber: string;
    documents?: {
      nicFront?: string;
      nicBack?: string;
      drivingLicenceFront?: string;
      drivingLicenceBack?: string;
    };
  };
  selectedVehicles: {
    numberPlate: string;
    vehicleType?: string;
    model?: string;
    company?: string;
  }[];
  fee: number;
  currency: string;
  status:
    | "Pending Payment"
    | "Payment Failed"
    | "Pending Branch Approval"
    | "Approved"
    | "Rejected"
    | "Cancelled"
    | "Pending Termination Approval"
    | "Terminated";
  payment: {
    status: "Pending Payment" | "Paid" | "Failed" | "Cancelled";
    paidAt?: string;
    amountPaid?: number;
    stripeSessionId?: string;
  };
  branchReview?: {
    reviewedBy?: string;
    reviewedAt?: string;
    rejectionReason?: string;
  };
  terminationRequest?: {
    reason?: string;
    requestedAt?: string;
    status?: string;
  };
  createdAt: string;
}

export default function ThirdPartyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<"register" | "history">("register");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [eligibleVehicles, setEligibleVehicles] = useState<Vehicle[]>([]);
  const [userBranch, setUserBranch] = useState("Galle");
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);

  // Termination modal states
  const [terminateReq, setTerminateReq] = useState<RegistrationRequest | null>(null);
  const [terminateReason, setTerminateReason] = useState("Driver resigned / employment ended");
  const [customReason, setCustomReason] = useState("");
  const [terminating, setTerminating] = useState(false);
  const [termMsg, setTermMsg] = useState("");
  const [termErr, setTermErr] = useState("");

  // Form states
  const [selectedPlates, setSelectedPlates] = useState<string[]>([]);
  const [driverName, setDriverName] = useState("");
  const [driverAddress, setDriverAddress] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [driverNic, setDriverNic] = useState("");

  // Document base64 states
  const [nicFront, setNicFront] = useState<string>("");
  const [nicBack, setNicBack] = useState<string>("");
  const [dlFront, setDlFront] = useState<string>("");
  const [dlBack, setDlBack] = useState<string>("");

  // Review & Submit modal
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [bannerAlert, setBannerAlert] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // File input refs
  const nicFrontRef = useRef<HTMLInputElement>(null);
  const nicBackRef = useRef<HTMLInputElement>(null);
  const dlFrontRef = useRef<HTMLInputElement>(null);
  const dlBackRef = useRef<HTMLInputElement>(null);

  // 1. Initialize user & load vehicles / requests
  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedUser = sessionStorage.getItem("logged_in_user");
    if (!savedUser) {
      router.push("/Login");
      return;
    }

    try {
      const parsed = JSON.parse(savedUser);
      setCurrentUser(parsed);
      loadEligibleVehicles(parsed.nic);
      loadMyRequests(parsed.nic);
    } catch {
      router.push("/Login");
    }
  }, [router]);

  // 2. Handle Stripe redirect callbacks
  useEffect(() => {
    const paymentSuccess = searchParams.get("payment_success");
    const sessionId = searchParams.get("session_id");
    const ref = searchParams.get("ref");
    const paymentCancelled = searchParams.get("payment_cancelled");

    if (paymentSuccess === "true" && sessionId) {
      setActiveTab("history");
      setBannerAlert({
        type: "success",
        message: "Verifying your Stripe payment confirmation..."
      });
      verifyStripeSession(sessionId, ref || "");
    } else if (paymentCancelled === "true") {
      setActiveTab("history");
      setBannerAlert({
        type: "info",
        message: "Payment checkout was cancelled. You can complete payment at any time from your request history."
      });
    }
  }, [searchParams]);

  const verifyStripeSession = async (sessionId: string, ref: string) => {
    try {
      const res = await fetch(`${API_URL}/third-party/verify-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, requestReference: ref })
      });
      const data = await res.json();
      if (res.ok) {
        setBannerAlert({
          type: "success",
          message: `Payment successful for Request ${ref || ""}! Your request has been queued for branch review and approval.`
        });
        if (currentUser?.nic) loadMyRequests(currentUser.nic);
      } else {
        setBannerAlert({
          type: "error",
          message: data.error || "Payment verification could not be confirmed."
        });
      }
    } catch (err: any) {
      setBannerAlert({
        type: "error",
        message: "Error connecting to server for payment verification."
      });
    }
  };

  const loadEligibleVehicles = async (nic: string) => {
    try {
      const res = await fetch(`${API_URL}/third-party/eligible-vehicles?nic=${encodeURIComponent(nic)}`);
      const data = await res.json();
      if (res.ok) {
        setEligibleVehicles(data.vehicles || []);
        if (data.userBranch) setUserBranch(data.userBranch);
      }
    } catch (err) {
      console.error("Failed to load eligible vehicles:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMyRequests = async (nic: string) => {
    try {
      const res = await fetch(`${API_URL}/third-party/my-requests?nic=${encodeURIComponent(nic)}`);
      const data = await res.json();
      if (res.ok) {
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error("Failed to load requests:", err);
    }
  };

  const handleSubmitTermination = async () => {
    if (!terminateReq) return;
    const finalReason =
      terminateReason === "Other reason"
        ? customReason.trim()
        : terminateReason.trim() || customReason.trim() || "Policyholder requested driver authorization termination";

    if (!finalReason) {
      setTermErr("Please provide a reason for termination.");
      return;
    }

    setTerminating(true);
    setTermErr("");
    try {
      const userStr = sessionStorage.getItem("logged_in_user");
      const nic = userStr ? JSON.parse(userStr)?.nic : currentUser?.nic;
      const res = await fetch(`${API_URL}/third-party/request-termination/${terminateReq._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyHolderNic: nic, reason: finalReason })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit termination request.");
      }
      setTermMsg("Driver termination request sent to branch for approval.");
      if (nic) loadMyRequests(nic);
      setTimeout(() => {
        setTerminateReq(null);
        setTermMsg("");
      }, 2000);
    } catch (err: any) {
      setTermErr(err.message || "Failed to submit termination request.");
    } finally {
      setTerminating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (b64: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (PNG, JPG, JPEG, WEBP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("Image file size must be less than 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setter(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const togglePlate = (plate: string) => {
    setSelectedPlates((prev) =>
      prev.includes(plate) ? prev.filter((p) => p !== plate) : [...prev, plate]
    );
  };

  const handleOpenReview = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (selectedPlates.length === 0) {
      setErrorMessage("Please select at least one covered vehicle.");
      return;
    }
    if (!driverName.trim()) {
      setErrorMessage("Please enter the driver's full name.");
      return;
    }
    if (!driverAddress.trim()) {
      setErrorMessage("Please enter the driver's residential address.");
      return;
    }
    if (!driverPhone.trim()) {
      setErrorMessage("Please enter the driver's phone number.");
      return;
    }
    if (!nicFront || !nicBack || !dlFront || !dlBack) {
      setErrorMessage("Please upload all four required identity & driving licence photographs.");
      return;
    }

    setReviewModalOpen(true);
  };

  const handleProceedToPayment = async () => {
    if (!currentUser?.nic) return;
    setSubmitting(true);
    setErrorMessage("");

    try {
      // 1. Submit Registration Request
      const payload = {
        policyHolderNic: currentUser.nic,
        driverDetails: {
          fullName: driverName.trim(),
          residentialAddress: driverAddress.trim(),
          phoneNumber: driverPhone.trim(),
          nicNumber: driverNic.trim(),
          documents: {
            nicFront,
            nicBack,
            drivingLicenceFront: dlFront,
            drivingLicenceBack: dlBack
          }
        },
        selectedVehiclePlates: selectedPlates,
        idempotencyKey: `tpr_${currentUser.nic}_${driverName.replace(/\s+/g, "")}_${Date.now()}`
      };

      const res = await fetch(`${API_URL}/third-party/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create registration request.");
      }

      const createdRequest = data.request;

      // 2. Create Stripe Checkout Session
      const checkoutRes = await fetch(`${API_URL}/third-party/checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: createdRequest._id,
          policyHolderNic: currentUser.nic
        })
      });

      const checkoutData = await checkoutRes.json();
      if (!checkoutRes.ok || !checkoutData.checkoutUrl) {
        throw new Error(checkoutData.error || "Failed to generate payment session.");
      }

      // 3. Redirect to Stripe Checkout
      window.location.href = checkoutData.checkoutUrl;
    } catch (err: any) {
      console.error("Submission error:", err);
      setErrorMessage(err.message || "An unexpected error occurred during submission.");
      setSubmitting(false);
    }
  };

  const handleResumePayment = async (request: RegistrationRequest) => {
    try {
      setSubmitting(true);
      const checkoutRes = await fetch(`${API_URL}/third-party/checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: request._id,
          policyHolderNic: currentUser.nic
        })
      });

      const checkoutData = await checkoutRes.json();
      if (!checkoutRes.ok || !checkoutData.checkoutUrl) {
        alert(checkoutData.error || "Failed to resume payment session.");
        setSubmitting(false);
        return;
      }

      window.location.href = checkoutData.checkoutUrl;
    } catch (err: any) {
      alert(err.message || "Could not connect to payment gateway.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6">
        <SimpleLoader
          message="Loading Third-Party Management Portal..."
          subMessage="Fetching your insured vehicles and policy records"
          theme="slate"
          size="lg"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <PolicyHolderNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Banner Alert */}
        {bannerAlert && (
          <div
            className={`mb-6 p-4 rounded-2xl border flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 duration-200 ${
              bannerAlert.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : bannerAlert.type === "error"
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-sky-50 border-sky-200 text-sky-800"
            }`}
          >
            <div className="flex items-center gap-3">
              <HugeiconsIcon
                icon={bannerAlert.type === "success" ? CheckmarkCircle01Icon : Alert02Icon}
                className="w-5 h-5 shrink-0"
                strokeWidth={2}
              />
              <span className="text-sm font-medium">{bannerAlert.message}</span>
            </div>
            <button
              onClick={() => setBannerAlert(null)}
              className="p-1 hover:bg-black/5 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-50 text-sky-700 text-xs font-bold rounded-full mb-3 border border-sky-100">
              <HugeiconsIcon icon={Shield01Icon} className="w-3.5 h-3.5" strokeWidth={2.2} />
              <span>Sanasa General Insurance Coverage</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Third-Party Driver Management
            </h1>
            <p className="text-slate-500 text-sm sm:text-base mt-1 max-w-2xl leading-relaxed">
              Register third-party drivers authorized to operate your insured vehicles. Registered drivers
              receive verified coverage status under your policy following branch review.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl shrink-0 self-start md:self-center">
            <button
              onClick={() => setActiveTab("register")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 cursor-pointer border-none ${
                activeTab === "register"
                  ? "bg-white text-sky-600 shadow-xs"
                  : "bg-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <HugeiconsIcon icon={UserAdd01Icon} className="w-4 h-4" strokeWidth={2} />
              <span>Add Third-Party</span>
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 cursor-pointer border-none ${
                activeTab === "history"
                  ? "bg-white text-sky-600 shadow-xs"
                  : "bg-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <HugeiconsIcon icon={Clock01Icon} className="w-4 h-4" strokeWidth={2} />
              <span>Request History</span>
              {requests.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[11px] bg-slate-200 text-slate-700 font-bold rounded-full">
                  {requests.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* TAB 1: REGISTRATION FORM */}
        {activeTab === "register" && (
          <form onSubmit={handleOpenReview} className="space-y-8 animate-in fade-in duration-200">
            {errorMessage && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm font-medium flex items-center gap-2">
                <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Step 1: Vehicle Selection */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center text-xs font-bold">1</span>
                    Select Covered Vehicles
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Choose which of your registered vehicles this third-party driver is permitted to operate.
                  </p>
                </div>
                <span className="text-xs font-bold px-3 py-1 bg-amber-50 text-amber-800 rounded-full border border-amber-200">
                  Fixed Fee: LKR 300 per request
                </span>
              </div>

              {eligibleVehicles.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <HugeiconsIcon icon={Car01Icon} className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No eligible approved vehicles found.</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Only vehicles with an approved active insurance policy can have third-party drivers assigned.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {eligibleVehicles.map((vehicle) => {
                    const isSelected = selectedPlates.includes(vehicle.numberPlate);
                    return (
                      <div
                        key={vehicle._id}
                        onClick={() => togglePlate(vehicle.numberPlate)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 select-none relative ${
                          isSelected
                            ? "border-sky-600 bg-sky-50/60 shadow-xs"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 bg-slate-900 text-white font-mono text-xs font-bold rounded-lg tracking-wider">
                              {vehicle.numberPlate}
                            </span>
                            <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold border border-emerald-100">
                              Active Policy
                            </span>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                              isSelected
                                ? "bg-sky-600 border-sky-600 text-white"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {isSelected && <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-3.5 h-3.5" />}
                          </div>
                        </div>

                        <div className="text-xs text-slate-600 mt-2 space-y-1">
                          <p className="font-semibold text-slate-800">
                            {vehicle.company} {vehicle.model} ({vehicle.year})
                          </p>
                          <p className="text-slate-500">Policy: {vehicle.policyNumber}</p>
                          <p className="text-slate-500">Type: {vehicle.vehicleType}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 2: Driver Details */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
              <div className="pb-4 border-b border-slate-100 mb-6">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center text-xs font-bold">2</span>
                  Driver Information
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Enter the personal details of the third-party driver as shown on official identity records.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sunil Shantha Perera"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Phone Number (Sri Lanka) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 0771234567 or +94771234567"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    National Identity Card (NIC) / ID Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 198512345678 or 851234567V"
                    value={driverNic}
                    onChange={(e) => setDriverNic(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Residential Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. No. 45, Temple Road, Galle"
                    value={driverAddress}
                    onChange={(e) => setDriverAddress(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Document Uploads */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
              <div className="pb-4 border-b border-slate-100 mb-6">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center text-xs font-bold">3</span>
                  Required Document Photographs
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Upload clear photos of the driver's National Identity Card (NIC) and valid Driving Licence (Front & Back).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* NIC Front */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 flex flex-col items-center justify-center text-center relative group">
                  <input
                    type="file"
                    ref={nicFrontRef}
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, setNicFront)}
                    className="hidden"
                  />
                  {nicFront ? (
                    <div className="relative w-full h-36 rounded-xl overflow-hidden border border-slate-300">
                      <img src={nicFront} alt="NIC Front" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setNicFront("")}
                        className="absolute top-2 right-2 bg-rose-600 text-white p-1 rounded-full text-xs hover:bg-rose-700"
                      >
                        <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => nicFrontRef.current?.click()}
                      className="w-full h-36 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center hover:border-sky-500 hover:bg-sky-50/50 transition-colors cursor-pointer bg-white"
                    >
                      <HugeiconsIcon icon={Upload01Icon} className="w-6 h-6 text-slate-400 mb-1" />
                      <span className="text-xs font-bold text-slate-700">Upload NIC Front</span>
                      <span className="text-[10px] text-slate-400">PNG, JPG up to 10MB</span>
                    </button>
                  )}
                  <span className="text-xs font-semibold text-slate-700 mt-2">NIC Front <span className="text-rose-500">*</span></span>
                </div>

                {/* NIC Back */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 flex flex-col items-center justify-center text-center relative group">
                  <input
                    type="file"
                    ref={nicBackRef}
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, setNicBack)}
                    className="hidden"
                  />
                  {nicBack ? (
                    <div className="relative w-full h-36 rounded-xl overflow-hidden border border-slate-300">
                      <img src={nicBack} alt="NIC Back" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setNicBack("")}
                        className="absolute top-2 right-2 bg-rose-600 text-white p-1 rounded-full text-xs hover:bg-rose-700"
                      >
                        <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => nicBackRef.current?.click()}
                      className="w-full h-36 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center hover:border-sky-500 hover:bg-sky-50/50 transition-colors cursor-pointer bg-white"
                    >
                      <HugeiconsIcon icon={Upload01Icon} className="w-6 h-6 text-slate-400 mb-1" />
                      <span className="text-xs font-bold text-slate-700">Upload NIC Back</span>
                      <span className="text-[10px] text-slate-400">PNG, JPG up to 10MB</span>
                    </button>
                  )}
                  <span className="text-xs font-semibold text-slate-700 mt-2">NIC Back <span className="text-rose-500">*</span></span>
                </div>

                {/* Licence Front */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 flex flex-col items-center justify-center text-center relative group">
                  <input
                    type="file"
                    ref={dlFrontRef}
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, setDlFront)}
                    className="hidden"
                  />
                  {dlFront ? (
                    <div className="relative w-full h-36 rounded-xl overflow-hidden border border-slate-300">
                      <img src={dlFront} alt="Licence Front" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setDlFront("")}
                        className="absolute top-2 right-2 bg-rose-600 text-white p-1 rounded-full text-xs hover:bg-rose-700"
                      >
                        <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => dlFrontRef.current?.click()}
                      className="w-full h-36 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center hover:border-sky-500 hover:bg-sky-50/50 transition-colors cursor-pointer bg-white"
                    >
                      <HugeiconsIcon icon={Upload01Icon} className="w-6 h-6 text-slate-400 mb-1" />
                      <span className="text-xs font-bold text-slate-700">Upload Licence Front</span>
                      <span className="text-[10px] text-slate-400">PNG, JPG up to 10MB</span>
                    </button>
                  )}
                  <span className="text-xs font-semibold text-slate-700 mt-2">Licence Front <span className="text-rose-500">*</span></span>
                </div>

                {/* Licence Back */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 flex flex-col items-center justify-center text-center relative group">
                  <input
                    type="file"
                    ref={dlBackRef}
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, setDlBack)}
                    className="hidden"
                  />
                  {dlBack ? (
                    <div className="relative w-full h-36 rounded-xl overflow-hidden border border-slate-300">
                      <img src={dlBack} alt="Licence Back" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setDlBack("")}
                        className="absolute top-2 right-2 bg-rose-600 text-white p-1 rounded-full text-xs hover:bg-rose-700"
                      >
                        <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => dlBackRef.current?.click()}
                      className="w-full h-36 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center hover:border-sky-500 hover:bg-sky-50/50 transition-colors cursor-pointer bg-white"
                    >
                      <HugeiconsIcon icon={Upload01Icon} className="w-6 h-6 text-slate-400 mb-1" />
                      <span className="text-xs font-bold text-slate-700">Upload Licence Back</span>
                      <span className="text-[10px] text-slate-400">PNG, JPG up to 10MB</span>
                    </button>
                  )}
                  <span className="text-xs font-semibold text-slate-700 mt-2">Licence Back <span className="text-rose-500">*</span></span>
                </div>
              </div>
            </div>

            {/* Fee & Submit Bar */}
            <div className="bg-gradient-to-r from-slate-900 to-sky-950 rounded-3xl p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
              <div>
                <span className="text-sky-300 text-xs font-bold uppercase tracking-wider">Registration Checkout</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold tracking-tight">LKR 300.00</span>
                  <span className="text-xs text-slate-300">one-time request processing fee</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Covers all {selectedPlates.length} selected vehicle(s) • Handled by {userBranch} Branch
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-2xl shadow-lg transition-all duration-200 cursor-pointer disabled:opacity-50 text-sm"
              >
                <span>Review & Pay LKR 300</span>
                <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: REQUEST HISTORY */}
        {activeTab === "history" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {requests.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
                <HugeiconsIcon icon={Clock01Icon} className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">No Third-Party Requests Found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  You haven't submitted any third-party driver registration requests yet.
                </p>
                <button
                  onClick={() => setActiveTab("register")}
                  className="mt-4 px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer border-none"
                >
                  Create Your First Request
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((req) => (
                  <div
                    key={req._id}
                    className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs hover:border-slate-300 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-extrabold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">
                            {req.requestReference}
                          </span>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold border ${
                              req.status === "Approved"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : req.status === "Pending Termination Approval"
                                ? "bg-rose-50 text-rose-800 border-rose-200"
                                : req.status === "Terminated"
                                ? "bg-slate-100 text-slate-700 border-slate-300"
                                : req.status === "Rejected"
                                ? "bg-rose-50 text-rose-800 border-rose-200"
                                : req.status === "Pending Branch Approval"
                                ? "bg-sky-50 text-sky-800 border-sky-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}
                          >
                            {req.status === "Pending Termination Approval"
                              ? "Termination Under Review"
                              : req.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5">
                          Submitted on {new Date(req.createdAt).toLocaleDateString("en-GB")} at{" "}
                          {new Date(req.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • Branch: {req.branch}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {req.payment.status === "Paid" ? (
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                              <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4 text-emerald-600" />
                              <span>Paid LKR 300</span>
                            </span>
                            {req.status === "Approved" && (
                              <button
                                onClick={() => {
                                  setTerminateReq(req);
                                  setTerminateReason("Driver resigned / employment ended");
                                  setCustomReason("");
                                  setTermErr("");
                                  setTermMsg("");
                                }}
                                className="flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                                title="Request driver authorization termination"
                              >
                                <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" />
                                <span>Terminate Driver</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleResumePayment(req)}
                            disabled={submitting}
                            className="flex items-center gap-1.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer border-none"
                          >
                            <HugeiconsIcon icon={CreditCardIcon} className="w-4 h-4" />
                            <span>Pay LKR 300 Now</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4 text-xs">
                      <div>
                        <span className="text-slate-400 font-semibold block uppercase">Driver Name</span>
                        <span className="text-slate-800 font-bold mt-0.5 block">{req.driverDetails.fullName}</span>
                        <span className="text-slate-500 block">{req.driverDetails.phoneNumber}</span>
                      </div>

                      <div>
                        <span className="text-slate-400 font-semibold block uppercase">Assigned Vehicles</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {req.selectedVehicles.map((v, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono font-bold rounded-md text-[11px]"
                            >
                              {v.numberPlate}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 font-semibold block uppercase">Branch Review Status</span>
                        {req.status === "Approved" ? (
                          <span className="text-emerald-700 font-bold block mt-0.5">
                            Approved by {req.branchReview?.reviewedBy || "Branch Staff"}
                          </span>
                        ) : req.status === "Pending Termination Approval" ? (
                          <div className="mt-1 p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-800">
                            <span className="font-bold block">Termination Pending Branch Review:</span>
                            <span className="text-[11px]">{req.terminationRequest?.reason || "Policyholder termination request"}</span>
                          </div>
                        ) : req.status === "Terminated" ? (
                          <span className="text-slate-600 font-bold block mt-0.5">
                            Terminated & Access Revoked
                          </span>
                        ) : req.status === "Rejected" ? (
                          <div className="mt-1 p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-800">
                            <span className="font-bold block">Rejection Reason:</span>
                            <span>{req.branchReview?.rejectionReason || "Requirements not met."}</span>
                          </div>
                        ) : (
                          <span className="text-sky-700 font-semibold block mt-0.5">
                            Under review by {req.branch} branch officers
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Review Modal */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={Shield01Icon} className="w-5 h-5 text-sky-600" />
                <h3 className="text-lg font-bold text-slate-900">Review Registration Details</h3>
              </div>
              <button
                onClick={() => setReviewModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer border-none bg-transparent"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Driver Name:</span>
                  <span className="font-bold text-slate-800">{driverName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone Number:</span>
                  <span className="font-bold text-slate-800">{driverPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">NIC Number:</span>
                  <span className="font-bold text-slate-800">{driverNic || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Residential Address:</span>
                  <span className="font-bold text-slate-800 text-right max-w-xs truncate">{driverAddress}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-semibold block mb-1.5">Selected Vehicles ({selectedPlates.length}):</span>
                <div className="flex flex-wrap gap-2">
                  {selectedPlates.map((plate) => (
                    <span key={plate} className="px-2.5 py-1 bg-slate-900 text-white font-mono font-bold rounded-lg text-xs">
                      {plate}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-sky-900 block">Registration Processing Fee</span>
                  <span className="text-[11px] text-sky-700">Charged once per request for all vehicles</span>
                </div>
                <span className="text-lg font-extrabold text-sky-900">LKR 300.00</span>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer text-xs"
              >
                Edit Information
              </button>
              <button
                type="button"
                onClick={handleProceedToPayment}
                disabled={submitting}
                className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50 text-xs flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <span>Connecting to Stripe...</span>
                ) : (
                  <>
                    <HugeiconsIcon icon={CreditCardIcon} className="w-4 h-4" />
                    <span>Pay LKR 300 Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terminate Driver Modal */}
      {terminateReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[28px] shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 my-8">
            <div className="p-6 bg-gradient-to-r from-rose-600 to-rose-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <HugeiconsIcon icon={Cancel01Icon} className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Terminate Driver Authorization</h3>
                  <p className="text-xs text-rose-100">Send revocation request to your Sanasa Branch</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTerminateReq(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors border-none bg-transparent cursor-pointer"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center flex-shrink-0">
                  <HugeiconsIcon icon={UserCheck01Icon} className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-800 text-sm">{terminateReq.driverDetails?.fullName}</div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    NIC: {terminateReq.driverDetails?.nicNumber || "—"} • Tel:{" "}
                    {terminateReq.driverDetails?.phoneNumber}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-1 flex flex-wrap gap-1">
                    <span className="font-semibold text-slate-400">Covered:</span>
                    {terminateReq.selectedVehicles?.map((v, i) => (
                      <span key={i} className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        {v.numberPlate}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
                <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Official Branch Sign-Off Required:</span>
                  <p className="mt-0.5 text-amber-800 text-[11px] leading-relaxed">
                    Once submitted, your revocation request is routed to {terminateReq.branch} branch. Upon branch approval, the driver's portal, NFC pass, and app access will be permanently revoked.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Select Reason for Termination
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    "Driver resigned / employment ended",
                    "Vehicle sold or transferred",
                    "Driver misconduct / policy breach",
                    "Owner revocation / no longer permitted",
                    "Temporary contract concluded",
                    "Other reason"
                  ].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setTerminateReason(r)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer ${
                        terminateReason === r
                          ? "bg-rose-50 border-rose-400 text-rose-900 font-bold shadow-xs"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {terminateReason === "Other reason" && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Please Specify Reason <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Provide details about why this authorization is being terminated..."
                    className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
              )}

              {termErr && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
                  <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4 flex-shrink-0" />
                  <span>{termErr}</span>
                </div>
              )}
              {termMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4 flex-shrink-0" />
                  <span>{termMsg}</span>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setTerminateReq(null)}
                disabled={terminating}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer bg-white"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmitTermination}
                disabled={terminating || !!termMsg}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer border-none"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />
                <span>{terminating ? "Submitting Request..." : "Submit Termination Request"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <PolicyHolderFooter />
    </div>
  );
}
