"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import OfficeStaffNavbar from "@/app/Components/Office_Staff/Navbar";
import { API_URL } from "@/app/config";
import UserAvatarDropdown from "@/app/Components/UserAvatarDropdown";
import SimpleLoader from "@/app/Components/SimpleLoader";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Menu01Icon,
  Notification01Icon,
  UserMultiple02Icon,
  Search01Icon,
  BubbleChatIcon,
  Cancel01Icon,
  Alert02Icon,
  CheckmarkCircle01Icon,
  Location01Icon,
  Globe02Icon,
  Shield01Icon,
  Car01Icon,
  File01Icon,
  ViewIcon,
  Loading03Icon
} from "@hugeicons/core-free-icons";

interface Vehicle {
  numberPlate: string;
  vehicleType: string;
  year: string;
  company: string;
  model: string;
  engineNumber: string;
  chassisNumber: string;
  policyNumber: string;
  status?: string;
}

interface BankDetails {
  bankName?: string;
  branchName?: string;
  accountNumber?: string;
  accountHolderName?: string;
}

interface Documents {
  nicFront?: string;
  nicBack?: string;
  vehicleReg?: string;
  revenueLicense?: string;
}

interface PolicyHolder {
  _id: string;
  firstName: string;
  lastName: string;
  nic: string;
  mobile: string;
  email: string;
  dob: string;
  address: string;
  province: string;
  city: string;
  branch: string;
  referenceNumber: string;
  vehicles?: Vehicle[];
  documents?: Documents;
  bankDetails?: BankDetails;
  status: string;
  createdAt: string;
}

interface ClaimRecord {
  _id: string;
  claimNumber: string;
  userNic?: string;
  vehiclePlate: string;
  incidentDate: string;
  incidentTime?: string;
  damageType: string;
  description?: string;
  location?: string;
  status: string;
  branch: string;
  assignedAgent?: string;
  priority?: string;
  amount?: number | null;
  currentStep?: number;
  documentsRequested?: boolean;
  requestedDocuments?: string[];
  inspectionReport?: string;
  inspectionSubmitted?: boolean;
  paymentReceipt?: string;
  bankName?: string;
  bankBranch?: string;
  bankAccount?: string;
  accountHolderName?: string;
  accidentPhotos?: {
    front?: string[];
    rear?: string[];
    side?: string[];
  };
  drivingLicense?: {
    front?: string[];
    rear?: string[];
  };
  otherVehicleDetails?: Array<{
    vehiclePlate?: string;
    insuranceCompany?: string;
    policyNumber?: string;
    driverName?: string;
    licensePhotos?: string[];
    vehiclePhotos?: string[];
  }>;
  additionalDocuments?: Array<{
    name: string;
    url: string;
    uploadedAt?: string;
    uploadedBy?: string;
  }>;
  createdAt?: string;
}

export default function OfficeStaffPolicyHolders() {
  const router = useRouter();

  // Branch & session state
  const [branch, setBranch] = useState("Galle");
  const [policyHolders, setPolicyHolders] = useState<PolicyHolder[]>([]);
  const [islandResults, setIslandResults] = useState<PolicyHolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [islandLoading, setIslandLoading] = useState(false);
  const [error, setError] = useState("");

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchScope, setSearchScope] = useState<"branch" | "islandwide">("branch");
  const [statusFilter, setStatusFilter] = useState<"all" | "Approved" | "Pending">("all");

  // View Details Modal state
  const [selectedHolder, setSelectedHolder] = useState<PolicyHolder | null>(null);
  const [holderClaims, setHolderClaims] = useState<ClaimRecord[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "vehicles" | "bank" | "documents" | "claims">("overview");

  // Single Claim Full Details Modal state
  const [selectedClaimModal, setSelectedClaimModal] = useState<ClaimRecord | null>(null);

  // Document Lightbox Preview state (string URL or title + url object)
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Custom notification popup state
  const [customPopup, setCustomPopup] = useState<{
    show: boolean;
    title: string;
    message: string;
    type?: "alert" | "confirm" | "success" | "error";
  }>({ show: false, title: "", message: "", type: "alert" });

  // Format date helper
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${d.getDate().toString().padStart(2, "0")} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  // Format vehicle number plate (e.g. WP CAC-8921)
  const formatPlate = (plate: string) => {
    if (!plate) return "-";
    const cleaned = plate.trim();
    if (cleaned.includes("-")) return cleaned.toUpperCase();
    const m = cleaned.match(/^(.*[A-Za-z]+)(\d+)$/);
    if (m) return `${m[1].trim().toUpperCase()} - ${m[2]}`;
    return cleaned.toUpperCase();
  };

  // Calculate age from DOB
  const calculateAge = (dobStr: string) => {
    if (!dobStr) return "-";
    try {
      const birth = new Date(dobStr);
      const diff = Date.now() - birth.getTime();
      const ageDate = new Date(diff);
      const age = Math.abs(ageDate.getUTCFullYear() - 1970);
      return isNaN(age) ? "-" : `${age} yrs`;
    } catch {
      return "-";
    }
  };

  // Helper to normalize document URLs for image display
  const getFullImageUrl = (rawUrl?: string) => {
    if (!rawUrl) return "";
    if (rawUrl.startsWith("http") || rawUrl.startsWith("data:")) {
      return rawUrl;
    }
    return `${API_URL.replace("/api", "")}/uploads/${rawUrl}`;
  };

  // Fetch branch policy holders
  const loadBranchPolicyHolders = useCallback(async (branchName: string, silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch(`${API_URL}/office-staff/policy-holders?branch=${encodeURIComponent(branchName)}&status=all`);
      if (!res.ok) {
        throw new Error("Failed to load branch policy holders.");
      }
      const data = await res.json();
      setPolicyHolders(data.policyHolders || []);
    } catch (err: any) {
      console.error("Error loading branch policy holders:", err);
      if (!silent) setError(err.message || "Failed to load policy holders.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Search across all Sri Lanka registered policy holders by NIC or keyword
  const searchSriLankaIslandwide = useCallback(async (queryStr: string) => {
    if (!queryStr.trim()) {
      setIslandResults([]);
      return;
    }
    try {
      setIslandLoading(true);
      const res = await fetch(
        `${API_URL}/office-staff/policy-holders?allSriLanka=true&search=${encodeURIComponent(queryStr.trim())}`
      );
      if (!res.ok) {
        throw new Error("Failed to search Sri Lanka registry.");
      }
      const data = await res.json();
      setIslandResults(data.policyHolders || []);
    } catch (err: any) {
      console.error("Error searching island-wide:", err);
      setCustomPopup({
        show: true,
        title: "Search Error",
        message: err.message || "Failed to search Sri Lanka policy holders database.",
        type: "error"
      });
    } finally {
      setIslandLoading(false);
    }
  }, []);

  // Load claims for selected policyholder
  const loadHolderClaims = async (nic: string) => {
    if (!nic) return;
    try {
      setLoadingClaims(true);
      const res = await fetch(`${API_URL}/office-staff/policy-holders/by-nic/${encodeURIComponent(nic)}`);
      if (res.ok) {
        const data = await res.json();
        setHolderClaims(data.claims || []);
      }
    } catch (err) {
      console.error("Error loading claims for policy holder:", err);
    } finally {
      setLoadingClaims(false);
    }
  };

  // Open details popup
  const handleOpenDetails = (holder: PolicyHolder) => {
    setSelectedHolder(holder);
    setActiveTab("overview");
    setHolderClaims([]);
    loadHolderClaims(holder.nic);
  };

  // Lifecycle initialization
  useEffect(() => {
    let currentBranch = "Galle";
    if (typeof window !== "undefined") {
      const savedStaff = sessionStorage.getItem("logged_in_staff");
      if (!savedStaff) {
        router.push("/Login");
        return;
      }
      try {
        const staffObj = JSON.parse(savedStaff);
        if (staffObj && staffObj.branch) {
          currentBranch = staffObj.branch;
          setBranch(currentBranch);
        } else {
          router.push("/Login");
          return;
        }
      } catch (e) {
        console.error("Error parsing logged_in_staff", e);
        router.push("/Login");
        return;
      }
    }

    loadBranchPolicyHolders(currentBranch);
  }, [router, loadBranchPolicyHolders]);

  // Periodic refresh for branch policyholders (every 10s)
  useEffect(() => {
    if (!branch || searchScope === "islandwide") return;
    const interval = setInterval(() => {
      loadBranchPolicyHolders(branch, true);
    }, 10000);
    return () => clearInterval(interval);
  }, [branch, searchScope, loadBranchPolicyHolders]);

  // Trigger search when searchScope is islandwide and searchQuery changes
  useEffect(() => {
    if (searchScope === "islandwide" && searchQuery.trim()) {
      const delayDebounce = setTimeout(() => {
        searchSriLankaIslandwide(searchQuery);
      }, 350);
      return () => clearTimeout(delayDebounce);
    }
  }, [searchScope, searchQuery, searchSriLankaIslandwide]);

  // Determine active dataset to display
  const activeList = searchScope === "islandwide" ? islandResults : policyHolders;

  // Filtered dataset based on local search & status
  const displayedPolicyHolders = activeList.filter((holder) => {
    // Status filter
    if (statusFilter !== "all" && holder.status !== statusFilter) {
      return false;
    }

    // In branch scope, apply local query filter if search query is typed
    if (searchScope === "branch" && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchesVehicles = holder.vehicles?.some(
        (v) =>
          v.numberPlate?.toLowerCase().includes(q) ||
          v.policyNumber?.toLowerCase().includes(q) ||
          v.company?.toLowerCase().includes(q) ||
          v.model?.toLowerCase().includes(q)
      );
      const matchesHolder =
        holder.firstName?.toLowerCase().includes(q) ||
        holder.lastName?.toLowerCase().includes(q) ||
        holder.nic?.toLowerCase().includes(q) ||
        holder.mobile?.toLowerCase().includes(q) ||
        holder.email?.toLowerCase().includes(q) ||
        holder.referenceNumber?.toLowerCase().includes(q) ||
        holder.city?.toLowerCase().includes(q);

      return matchesHolder || matchesVehicles;
    }

    return true;
  });

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans">
      <div className="flex flex-1 flex-row min-h-0">
        <OfficeStaffNavbar />

        <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
          {/* Top Header Bar */}
          <header className="bg-white border-b border-slate-100 text-slate-800 px-8 py-4 flex justify-between items-center select-none shadow-sm flex-shrink-0 h-[80px] sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("open-mobile-menu"))}
                className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 active:scale-95 transition-all cursor-pointer focus:outline-none"
                aria-label="Open mobile navigation menu"
              >
                <HugeiconsIcon icon={Menu01Icon} className="w-6 h-6" strokeWidth={2.5} />
              </button>
              <h1 className="text-xl font-semibold text-slate-800 flex items-center gap-2 pl-2 lg:pl-0">
                <span className="bg-[#102A43] text-white text-base px-4 py-2 rounded-xl font-semibold shadow-sm tracking-wide">
                  {branch || "Galle"} Branch
                </span>
                <span className="hidden md:inline text-slate-400 font-medium">— Policy Holders</span>
              </h1>
            </div>

            <div className="flex items-center gap-5">
              {/* Notification Bell Icon */}
              <Link
                href="/Office_Staff/Notifications"
                className="relative p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer focus:outline-none flex items-center justify-center"
                aria-label="Notifications"
              >
                <HugeiconsIcon icon={Notification01Icon} className="w-6 h-6 text-slate-500 hover:text-slate-800" strokeWidth={2} />
              </Link>
              {/* User Avatar Icon */}
              <UserAvatarDropdown userType="office_staff" />
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-8 bg-white overflow-y-scroll [scrollbar-gutter:stable]">
            {loading || (searchScope === "islandwide" && islandLoading) ? (
              <SimpleLoader
                message={
                  searchScope === "islandwide"
                    ? "Searching Sri Lanka policy holders database..."
                    : "Loading policy holders..."
                }
                theme="slate"
              />
            ) : error ? (
              <div className="w-full h-full flex flex-col items-center justify-center min-h-[300px] text-red-500 font-semibold bg-red-50 rounded-2xl p-8 border border-red-200">
                <span>{error}</span>
              </div>
            ) : (
              <div className="max-w-6xl mx-auto flex flex-col gap-6">
                {/* Title */}
                <div className="flex items-center gap-2 mb-2 select-none">
                  <HugeiconsIcon icon={UserMultiple02Icon} className="w-5 h-5 text-slate-700 flex-shrink-0" strokeWidth={2.5} />
                  <h2 className="text-lg font-semibold text-slate-800 tracking-wide">
                    Policy Holders Directory
                  </h2>
                </div>

                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 select-none mb-2">
                  {/* Search Bar Input */}
                  <div className="relative w-full sm:w-[360px]">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <HugeiconsIcon icon={Search01Icon} className="w-4 h-4 text-slate-400" strokeWidth={2.5} />
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && searchScope === "islandwide") {
                          searchSriLankaIslandwide(searchQuery);
                        }
                      }}
                      placeholder={
                        searchScope === "islandwide"
                          ? "Search Sri Lanka by NIC number..."
                          : "Search by name, NIC, plate, or ref..."
                      }
                      className="w-full pl-10 pr-4 py-3 rounded-full border border-slate-300 text-slate-700 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-transparent transition-all shadow-sm"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          if (searchScope === "islandwide") {
                            setIslandResults([]);
                          }
                        }}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
                      >
                        <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={2} />
                      </button>
                    )}
                  </div>

                  {/* Scope Switcher & Status Filter */}
                  <div className="flex items-center gap-3 flex-wrap justify-between sm:justify-end">
                    {/* Scope Switcher */}
                    <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
                      <button
                        onClick={() => {
                          setSearchScope("branch");
                          setSearchQuery("");
                        }}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border-none flex items-center gap-1.5 ${
                          searchScope === "branch"
                            ? "bg-[#102A43] text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-200/70 bg-transparent"
                        }`}
                      >
                        <HugeiconsIcon icon={Location01Icon} className="w-3.5 h-3.5" strokeWidth={2} />
                        <span>{branch} Branch ({policyHolders.length})</span>
                      </button>

                      <button
                        onClick={() => {
                          setSearchScope("islandwide");
                          if (searchQuery.trim()) {
                            searchSriLankaIslandwide(searchQuery);
                          }
                        }}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border-none flex items-center gap-1.5 ${
                          searchScope === "islandwide"
                            ? "bg-[#000080] text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-200/70 bg-transparent"
                        }`}
                      >
                        <HugeiconsIcon icon={Globe02Icon} className="w-3.5 h-3.5" strokeWidth={2} />
                        <span>Island-wide NIC Search</span>
                      </button>
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-1.5">
                      {(["all", "Approved", "Pending"] as const).map((st) => (
                        <button
                          key={st}
                          onClick={() => setStatusFilter(st)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                            statusFilter === st
                              ? "bg-[#102A43] text-white border-[#102A43] shadow-xs"
                              : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          {st === "all" ? "All" : st}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Smart Islandwide Search Prompt Banner */}
                {searchScope === "branch" && searchQuery.trim() && displayedPolicyHolders.length === 0 && !loading && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <HugeiconsIcon icon={Globe02Icon} className="w-5 h-5 text-white" strokeWidth={2} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">
                          No policyholder found in {branch} Branch matching "{searchQuery}"
                        </h4>
                        <p className="text-xs text-slate-500 font-medium">
                          Would you like to search across all registered policy holders in Sri Lanka with this NIC?
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSearchScope("islandwide");
                        searchSriLankaIslandwide(searchQuery);
                      }}
                      className="bg-[#000080] hover:bg-[#000066] active:scale-95 text-white font-semibold text-xs px-5 py-2.5 rounded-full transition-all cursor-pointer border-none shadow-sm flex items-center gap-2 shrink-0"
                    >
                      <HugeiconsIcon icon={Globe02Icon} className="w-4 h-4 text-white" strokeWidth={2} />
                      <span>Search All Sri Lanka Registry</span>
                    </button>
                  </div>
                )}

                {/* Table Layout matching Registrations */}
                {displayedPolicyHolders.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-[20px] p-12 text-center text-slate-400 font-medium select-none shadow-sm">
                    {searchScope === "islandwide"
                      ? "No policy holders found in Sri Lanka database matching your search."
                      : "No policy holders found matching your query."}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {/* Table Header Row */}
                    <div className="hidden md:grid md:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1.0fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,1.2fr)] gap-4 px-5 py-3 text-slate-400 font-medium text-[10px] uppercase tracking-wider select-none bg-slate-50 rounded-xl border border-slate-200/60 mb-1 items-center">
                      <div className="flex flex-col select-none min-w-0">Applicant Name</div>
                      <div className="flex flex-col select-none min-w-0">NIC Number</div>
                      <div className="flex flex-col select-none min-w-0">Vehicle Plate</div>
                      <div className="flex flex-col select-none min-w-0">Vehicle Type</div>
                      <div className="flex flex-col select-none min-w-0">Policy Number</div>
                      <div className="flex flex-col select-none min-w-0">Date</div>
                      <div className="flex flex-col select-none min-w-0 text-right">Actions</div>
                    </div>

                    {/* Table Row Items */}
                    {displayedPolicyHolders.map((holder) => {
                      const primaryVehicle = holder.vehicles && holder.vehicles.length > 0 ? holder.vehicles[0] : null;

                      return (
                        <div
                          key={holder._id || holder.nic}
                          onClick={() => handleOpenDetails(holder)}
                          className="bg-white border-l-[6px] border-l-blue-500 bg-gradient-to-r from-blue-50/10 via-transparent to-transparent hover:border-blue-400 border border-slate-200 rounded-xl px-5 py-4 flex flex-col md:grid md:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1.0fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,1.2fr)] md:items-center gap-4 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md relative overflow-hidden group"
                        >
                          {/* Col 1: Applicant Name & Ref */}
                          <div className="flex flex-col min-w-0 select-none">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="w-2 h-2 rounded-full shrink-0 bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.7)]" />
                              <h3 className="font-semibold text-sm text-slate-800 whitespace-nowrap truncate">
                                {holder.firstName} {holder.lastName}
                              </h3>
                            </div>
                            <span className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase bg-slate-100 px-2 py-0.5 rounded mt-1.5 w-fit">
                              Ref: {holder.referenceNumber || "SAN-PH"}
                            </span>
                          </div>

                          {/* Col 2: NIC */}
                          <div className="flex flex-col min-w-0 select-none">
                            <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider block md:hidden">NIC</span>
                            <span className="text-slate-700 font-semibold text-xs font-mono">{holder.nic}</span>
                          </div>

                          {/* Col 3: Vehicle Plate */}
                          <div className="flex flex-col min-w-0 select-none">
                            <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider block md:hidden">Vehicle Plate</span>
                            <span className="text-slate-800 font-semibold text-xs font-mono">
                              {primaryVehicle ? formatPlate(primaryVehicle.numberPlate) : "-"}
                            </span>
                            {primaryVehicle?.model && (
                              <span className="text-[10px] text-slate-400 font-medium truncate block">
                                {primaryVehicle.company} {primaryVehicle.model}
                              </span>
                            )}
                          </div>

                          {/* Col 4: Vehicle Type */}
                          <div className="flex flex-col min-w-0 select-none">
                            <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider block md:hidden">Vehicle Type</span>
                            <span className="text-slate-700 text-xs font-semibold">
                              {primaryVehicle ? primaryVehicle.vehicleType : "No Vehicle"}
                            </span>
                          </div>

                          {/* Col 5: Policy Number */}
                          <div className="flex flex-col min-w-0 select-none">
                            <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider block mb-1 md:hidden">Policy No.</span>
                            <span className="font-semibold text-[#0f2d4a] text-xs font-mono">
                              {primaryVehicle ? primaryVehicle.policyNumber : "-"}
                            </span>
                          </div>

                          {/* Col 6: Date / Branch */}
                          <div className="flex flex-col min-w-0 select-none">
                            <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider block md:hidden">Date</span>
                            <span className="text-slate-600 text-xs font-semibold">{formatDate(holder.createdAt)}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{holder.branch} Branch</span>
                          </div>

                          {/* Col 7: Actions */}
                          <div
                            className="flex items-center justify-between md:justify-end gap-2.5 mt-4 md:mt-0 pt-3 md:pt-0 border-t md:border-0 border-slate-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-blue-500 font-semibold text-[11px] group-hover:underline md:hidden select-none">
                              View Profile
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenDetails(holder)}
                                className="border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-[11px] px-3.5 py-1.5 rounded-lg transition-all cursor-pointer focus:outline-none shadow-xs bg-white active:scale-95 flex items-center gap-1.5"
                              >
                                <HugeiconsIcon icon={ViewIcon} className="w-3.5 h-3.5 text-slate-600" strokeWidth={2.5} />
                                <span>View</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Pagination Controls */}
                <div className="flex items-center justify-end gap-3 mt-4 text-slate-400 font-medium select-none text-sm">
                  <button className="hover:text-slate-600 font-medium cursor-pointer">Prev</button>
                  <span className="text-slate-800 font-semibold">1</span>
                  <button className="hover:text-slate-600 font-medium cursor-pointer">Next</button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ======================================================== */}
      {/* Policy Holder Full Details Popup Modal (Fixed 640px)     */}
      {/* ======================================================== */}
      {selectedHolder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white border border-slate-200 rounded-[24px] w-full max-w-4xl h-[640px] max-h-[90vh] shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col relative transition-all duration-300 overflow-hidden text-left">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-8 pt-6 pb-4 border-b border-slate-200 flex-shrink-0 select-none bg-white">
              <div className="flex items-center gap-3.5 min-w-0 pr-4">
                <div className="w-12 h-12 rounded-2xl bg-[#102A43] text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                  {(selectedHolder.firstName || "P").substring(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-[22px] font-semibold text-[#0f2d3a] tracking-tight leading-none truncate">
                      {selectedHolder.firstName} {selectedHolder.lastName}
                    </h2>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        selectedHolder.status === "Approved"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {selectedHolder.status || "Pending"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium mt-1.5 truncate">
                    NIC: <span className="font-semibold text-slate-700 font-mono">{selectedHolder.nic}</span> •{" "}
                    <span className="font-semibold text-[#102A43]">{selectedHolder.branch} Branch</span> • Ref:{" "}
                    <span className="font-semibold text-slate-600">{selectedHolder.referenceNumber || "SAN-PH"}</span> • Reg:{" "}
                    {formatDate(selectedHolder.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200/80 px-3 py-1.5 rounded-xl shadow-2xs">
                    Age: {calculateAge(selectedHolder.dob)}
                  </span>
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200/80 px-3 py-1.5 rounded-xl shadow-2xs">
                    {selectedHolder.vehicles?.length || 0} Vehicles Insured
                  </span>
                </div>

                <button
                  onClick={() => setSelectedHolder(null)}
                  className="text-slate-400 hover:text-slate-600 text-2xl font-semibold border-none bg-transparent cursor-pointer p-1"
                  aria-label="Close modal"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Navigation Tabs Bar */}
            <div className="px-8 border-b border-slate-200 bg-slate-50/70 select-none flex items-center gap-2 overflow-x-auto shrink-0 py-2.5">
              {[
                { id: "overview", label: "Personal Info", count: null },
                { id: "vehicles", label: "Insured Vehicles", count: selectedHolder.vehicles?.length || 0 },
                { id: "bank", label: "Bank Details", count: null },
                {
                  id: "documents",
                  label: "Documents",
                  count: selectedHolder.documents
                    ? Object.values(selectedHolder.documents).filter(Boolean).length
                    : 0
                },
                { id: "claims", label: "Claims History", count: holderClaims.length }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border-none flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-[#102A43] text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-200/70 bg-transparent"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== null && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Scrollable Body Content */}
            <div className="p-8 flex-1 overflow-y-auto space-y-6">
              {/* TAB 1: Personal Info (Maximum Information Display) */}
              {activeTab === "overview" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Identity & Contact Details Card */}
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col gap-4 select-none">
                    <h3 className="font-semibold text-slate-800 text-xs tracking-wide uppercase text-amber-500 pb-2 border-b border-slate-200/60 flex items-center gap-1.5">
                      <span>Identity & Contact Information</span>
                    </h3>
                    <div className="flex flex-col divide-y divide-slate-200/60 text-xs">
                      {[
                        { label: "Full Name", value: `${selectedHolder.firstName} ${selectedHolder.lastName}` },
                        { label: "National ID (NIC)", value: selectedHolder.nic, isMono: true },
                        { label: "Date of Birth", value: formatDate(selectedHolder.dob) },
                        { label: "Age", value: calculateAge(selectedHolder.dob) },
                        { label: "Mobile Phone", value: selectedHolder.mobile || "-" },
                        { label: "Email Address", value: selectedHolder.email || "-" }
                      ].map((item, idx) => (
                        <div key={idx} className="py-2.5 flex items-center justify-between gap-4">
                          <span className="text-slate-400 font-medium uppercase text-[10px] tracking-wider min-w-[110px]">
                            {item.label}
                          </span>
                          <span className={`font-semibold text-slate-800 text-right truncate ${item.isMono ? "font-mono" : ""}`}>
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Address & Registration Info Card */}
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col gap-4 select-none">
                    <h3 className="font-semibold text-slate-800 text-xs tracking-wide uppercase text-amber-500 pb-2 border-b border-slate-200/60 flex items-center gap-1.5">
                      <span>Address & Registration Metadata</span>
                    </h3>
                    <div className="flex flex-col divide-y divide-slate-200/60 text-xs">
                      {[
                        { label: "Registered Branch", value: `${selectedHolder.branch} Branch` },
                        { label: "Reference Number", value: selectedHolder.referenceNumber || "-", isMono: true },
                        { label: "City", value: selectedHolder.city || "-" },
                        { label: "Province", value: selectedHolder.province || "-" },
                        { label: "Permanent Address", value: selectedHolder.address || "-" },
                        { label: "Member Since", value: formatDate(selectedHolder.createdAt) },
                        { label: "Account Status", value: selectedHolder.status || "Pending" }
                      ].map((item, idx) => (
                        <div key={idx} className="py-2.5 flex items-center justify-between gap-4">
                          <span className="text-slate-400 font-medium uppercase text-[10px] tracking-wider min-w-[110px]">
                            {item.label}
                          </span>
                          <span className={`font-semibold text-slate-800 text-right truncate ${item.isMono ? "font-mono" : ""}`}>
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Insured Vehicles (Full Details Cards) */}
              {activeTab === "vehicles" && (
                <div className="space-y-4 select-none">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800 text-xs tracking-wide uppercase text-amber-500">
                      Registered Vehicles Under Policy ({selectedHolder.vehicles?.length || 0})
                    </h3>
                    <span className="text-xs text-slate-400 font-medium">Active Motor Insurance Policies</span>
                  </div>

                  {!selectedHolder.vehicles || selectedHolder.vehicles.length === 0 ? (
                    <div className="border border-slate-200 border-dashed rounded-2xl p-10 text-center text-slate-400 italic text-sm">
                      <HugeiconsIcon icon={Car01Icon} className="w-10 h-10 mx-auto text-slate-300 mb-2" strokeWidth={1.5} />
                      <p className="font-semibold">No vehicles registered for this policy holder.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedHolder.vehicles.map((veh, idx) => (
                        <div key={idx} className="border border-slate-200 rounded-2xl p-5 bg-white shadow-xs flex flex-col gap-3.5 hover:border-slate-300 transition-all">
                          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
                                <HugeiconsIcon icon={Car01Icon} className="w-5 h-5" strokeWidth={2} />
                              </div>
                              <div>
                                <span className="font-mono font-bold text-sm text-slate-900 block">
                                  {formatPlate(veh.numberPlate)}
                                </span>
                                <span className="bg-slate-100 text-slate-500 text-[9px] font-semibold px-2 py-0.5 rounded uppercase">
                                  {veh.vehicleType}
                                </span>
                              </div>
                            </div>

                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                                veh.status === "Approved"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {veh.status || "Approved"}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Make / Model</span>
                              <span className="font-semibold text-slate-800 truncate block">
                                {veh.company} {veh.model}
                              </span>
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Year of Make</span>
                              <span className="font-semibold text-slate-800 block">{veh.year || "-"}</span>
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Policy Number</span>
                              <span className="font-mono font-bold text-blue-700 block truncate">
                                {veh.policyNumber || "-"}
                              </span>
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Engine Number</span>
                              <span className="font-mono text-slate-700 font-semibold block truncate">
                                {veh.engineNumber || "-"}
                              </span>
                            </div>

                            <div className="col-span-2">
                              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Chassis Number</span>
                              <span className="font-mono text-slate-700 font-semibold block truncate">
                                {veh.chassisNumber || "-"}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Direct Settlement Bank Account */}
              {activeTab === "bank" && (
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col gap-5 select-none">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-200/70">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                      <HugeiconsIcon icon={Shield01Icon} className="w-5 h-5" strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 text-xs tracking-wide uppercase text-amber-500">
                        Direct Settlement Bank Account
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Used for direct electronic insurance claim reimbursements and settlement deposits.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {[
                      { label: "Bank Name", value: selectedHolder.bankDetails?.bankName || "Not Provided" },
                      { label: "Bank Branch", value: selectedHolder.bankDetails?.branchName || "Not Provided" },
                      {
                        label: "Account Number",
                        value: selectedHolder.bankDetails?.accountNumber || "Not Provided",
                        isMono: true
                      },
                      {
                        label: "Account Holder Name",
                        value: selectedHolder.bankDetails?.accountHolderName || `${selectedHolder.firstName} ${selectedHolder.lastName}`
                      }
                    ].map((item, idx) => (
                      <div key={idx} className="bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col gap-1 shadow-2xs">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                          {item.label}
                        </span>
                        <span className={`text-sm font-bold text-slate-900 ${item.isMono ? "font-mono" : ""}`}>
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: Uploaded Verification Documents (Rich cards with preview + status + view) */}
              {activeTab === "documents" && (
                <div className="space-y-4 select-none">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800 text-xs tracking-wide uppercase text-amber-500">
                      Uploaded Verification & KYC Documents
                    </h3>
                    <span className="text-xs text-slate-400 font-medium">Official verified registration files</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { key: "nicFront", label: "National ID (NIC) Front View", url: selectedHolder.documents?.nicFront },
                      { key: "nicBack", label: "National ID (NIC) Back View", url: selectedHolder.documents?.nicBack },
                      {
                        key: "vehicleReg",
                        label: "Vehicle Registration Book (CR)",
                        url: selectedHolder.documents?.vehicleReg
                      },
                      {
                        key: "revenueLicense",
                        label: "Revenue License Document",
                        url: selectedHolder.documents?.revenueLicense
                      }
                    ].map((doc, idx) => {
                      const isUploaded = Boolean(doc.url);
                      const fullUrl = getFullImageUrl(doc.url);
                      return (
                        <div
                          key={idx}
                          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col justify-between gap-4"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                                <HugeiconsIcon icon={File01Icon} className="w-5 h-5" strokeWidth={2} />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-slate-900">{doc.label}</h4>
                                <span className="text-[10px] text-slate-400 block font-medium">
                                  {isUploaded ? "Uploaded on file" : "Pending document"}
                                </span>
                              </div>
                            </div>

                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                                isUploaded
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-slate-100 text-slate-500 border-slate-200"
                              }`}
                            >
                              {isUploaded ? "Available" : "Not Provided"}
                            </span>
                          </div>

                          {/* Image Preview Thumbnail */}
                          <div className="w-full aspect-[4/3] bg-slate-50 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center relative">
                            {isUploaded && fullUrl ? (
                              <img
                                src={fullUrl}
                                alt={doc.label}
                                onClick={() => setPreviewImage({ url: fullUrl, title: doc.label })}
                                className="object-cover w-full h-full hover:scale-105 transition-transform duration-300 cursor-zoom-in"
                              />
                            ) : (
                              <span className="text-xs text-slate-400 italic font-semibold">No Document Uploaded</span>
                            )}
                          </div>

                          {isUploaded && fullUrl ? (
                            <button
                              onClick={() => setPreviewImage({ url: fullUrl, title: doc.label })}
                              className="w-full py-2.5 bg-[#000080]/10 hover:bg-[#000080] hover:text-white text-[#000080] font-semibold text-xs rounded-xl transition-all cursor-pointer border-none flex items-center justify-center gap-2 select-none active:scale-95 shadow-2xs"
                            >
                              <HugeiconsIcon icon={ViewIcon} className="w-4 h-4" strokeWidth={2} />
                              <span>View Full Document</span>
                            </button>
                          ) : (
                            <div className="py-2.5 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs font-medium">
                              No file attached
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 5: Claims History & Claim View Trigger */}
              {activeTab === "claims" && (
                <div className="space-y-4 select-none">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800 text-xs tracking-wide uppercase text-amber-500">
                      Claims History ({holderClaims.length})
                    </h3>
                    <span className="text-xs text-slate-400 font-medium">Recorded incident claims</span>
                  </div>

                  {loadingClaims ? (
                    <div className="py-10 text-center">
                      <HugeiconsIcon icon={Loading03Icon} className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" strokeWidth={2} />
                      <p className="text-xs text-slate-500 font-semibold">Loading claims history...</p>
                    </div>
                  ) : holderClaims.length === 0 ? (
                    <div className="border border-slate-200 border-dashed rounded-2xl p-10 text-center text-slate-400 italic text-sm">
                      <HugeiconsIcon icon={Shield01Icon} className="w-10 h-10 mx-auto text-slate-300 mb-2" strokeWidth={1.5} />
                      <p className="font-semibold">No insurance claims filed by this policy holder.</p>
                      <p className="text-xs text-slate-400 mt-1">Clean claim record with zero reported incidents.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {holderClaims.map((claim) => (
                        <div
                          key={claim._id}
                          className="border border-slate-200 rounded-2xl p-4 bg-white shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                              <HugeiconsIcon icon={Shield01Icon} className="w-5 h-5" strokeWidth={2} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs text-slate-900">
                                  {claim.claimNumber}
                                </span>
                                <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-semibold">
                                  {formatPlate(claim.vehiclePlate)}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 font-medium mt-0.5">
                                {claim.damageType} • {formatDate(claim.incidentDate)} • {claim.branch} Branch
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-auto">
                            {claim.amount ? (
                              <span className="text-xs font-bold text-slate-900 font-mono">
                                LKR {claim.amount.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-semibold italic">
                                Pending Amount
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                                claim.status === "Approved"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : claim.status === "Rejected"
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {claim.status}
                            </span>
                            <button
                              onClick={() => setSelectedClaimModal(claim)}
                              className="border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-[11px] px-3.5 py-1.5 rounded-lg transition-all cursor-pointer focus:outline-none shadow-xs bg-white active:scale-95 flex items-center gap-1.5"
                            >
                              <HugeiconsIcon icon={ViewIcon} className="w-3.5 h-3.5 text-slate-600" strokeWidth={2.5} />
                              <span>View Details</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 flex justify-end flex-shrink-0 select-none">
              <button
                onClick={() => setSelectedHolder(null)}
                className="bg-[#000080] hover:bg-[#000066] text-white font-semibold text-[14px] px-8 py-2.5 rounded-full transition-all border-none cursor-pointer shadow-[0_4px_12px_rgba(0,0,128,0.25)] active:scale-95 flex items-center justify-center"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Full Claim Details Modal (Opened from Claims History)    */}
      {/* ======================================================== */}
      {selectedClaimModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-md transition-all duration-300">
          <div className="bg-white border border-slate-200 rounded-[24px] w-full max-w-3xl shadow-2xl overflow-hidden transform scale-100 transition-all h-[680px] max-h-[92vh] flex flex-col text-left">
            {/* Modal Header */}
            <div className="px-8 pt-6 pb-4 border-b border-slate-200 shrink-0 bg-white select-none flex justify-between items-center gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-lg shadow-xs shrink-0">
                  <HugeiconsIcon icon={Shield01Icon} className="w-6 h-6" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-[20px] font-semibold font-mono text-[#0f2d3a] tracking-tight leading-none truncate">
                      {selectedClaimModal.claimNumber}
                    </h2>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        selectedClaimModal.status === "Approved"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : selectedClaimModal.status === "Rejected"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {selectedClaimModal.status}
                    </span>
                    {selectedClaimModal.priority && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                        {selectedClaimModal.priority} Priority
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1 truncate">
                    Vehicle: <span className="font-mono font-bold text-slate-800">{formatPlate(selectedClaimModal.vehiclePlate)}</span> •{" "}
                    <span className="font-semibold text-[#102A43]">{selectedClaimModal.branch} Branch</span> • Incident on{" "}
                    {formatDate(selectedClaimModal.incidentDate)} {selectedClaimModal.incidentTime ? `at ${selectedClaimModal.incidentTime}` : ""}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedClaimModal(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-semibold border-none bg-transparent cursor-pointer p-1"
                aria-label="Close claim details modal"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto flex-1 bg-white space-y-6">
              {/* Section 1: Incident & Workflow Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider select-none">Damage Type</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedClaimModal.damageType || "Accident Damage"}</span>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider select-none">Claim Amount</span>
                  <span className="font-bold text-blue-700 text-sm font-mono">
                    {selectedClaimModal.amount ? `LKR ${selectedClaimModal.amount.toLocaleString()}` : "Pending Assessment"}
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider select-none">Assigned Field Agent</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedClaimModal.assignedAgent || "None (Branch Direct)"}</span>
                </div>
              </div>

              {/* Section 2: Location & Description */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 flex flex-col gap-3 select-none">
                <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wide text-amber-500 pb-1">
                  Incident Location & Statement
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Location</span>
                    <span className="font-semibold text-slate-800">{selectedClaimModal.location || "Not Specified"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Date & Time</span>
                    <span className="font-semibold text-slate-800">
                      {formatDate(selectedClaimModal.incidentDate)} {selectedClaimModal.incidentTime ? `• ${selectedClaimModal.incidentTime}` : ""}
                    </span>
                  </div>
                </div>

                <div className="mt-2">
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block mb-1">Driver Statement</span>
                  <p className="text-xs font-medium text-slate-700 bg-white p-3.5 rounded-xl border border-slate-200 leading-relaxed whitespace-pre-wrap">
                    {selectedClaimModal.description || "No description provided."}
                  </p>
                </div>
              </div>

              {/* Section 3: Accident Damage Photos */}
              <div className="space-y-3 select-none">
                <h4 className="font-semibold text-slate-800 text-xs tracking-wide uppercase text-amber-500">
                  Accident Damage Photos
                </h4>

                {(() => {
                  const frontPhotos = selectedClaimModal.accidentPhotos?.front || [];
                  const rearPhotos = selectedClaimModal.accidentPhotos?.rear || [];
                  const sidePhotos = selectedClaimModal.accidentPhotos?.side || [];
                  const allAccidentPhotos = [
                    ...frontPhotos.map((url, i) => ({ url: getFullImageUrl(url), label: `Front View #${i + 1}` })),
                    ...rearPhotos.map((url, i) => ({ url: getFullImageUrl(url), label: `Rear View #${i + 1}` })),
                    ...sidePhotos.map((url, i) => ({ url: getFullImageUrl(url), label: `Side View #${i + 1}` }))
                  ];

                  if (allAccidentPhotos.length === 0) {
                    return (
                      <div className="border border-slate-200 border-dashed rounded-xl p-6 text-center text-slate-400 text-xs italic">
                        No accident damage photos uploaded with this claim.
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {allAccidentPhotos.map((photo, pIdx) => (
                        <div
                          key={pIdx}
                          onClick={() => setPreviewImage({ url: photo.url, title: `${selectedClaimModal.claimNumber} - ${photo.label}` })}
                          className="border border-slate-200 rounded-xl p-2 bg-white shadow-2xs cursor-zoom-in group"
                        >
                          <div className="aspect-[4/3] bg-slate-50 rounded-lg overflow-hidden relative">
                            <img
                              src={photo.url}
                              alt={photo.label}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          <span className="text-[10px] font-semibold text-slate-600 block mt-1.5 text-center truncate">
                            {photo.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Section 4: Driving License & Inspection Documents */}
              <div className="space-y-3 select-none">
                <h4 className="font-semibold text-slate-800 text-xs tracking-wide uppercase text-amber-500">
                  License & Supplementary Documents
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {/* Driving License Front */}
                  {(selectedClaimModal.drivingLicense?.front || []).map((url, i) => {
                    const fullUrl = getFullImageUrl(url);
                    return (
                      <div
                        key={`dl-front-${i}`}
                        onClick={() => setPreviewImage({ url: fullUrl, title: `Driving License Front - ${selectedClaimModal.claimNumber}` })}
                        className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 transition-all select-none shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <HugeiconsIcon icon={File01Icon} className="w-4 h-4 text-slate-500 shrink-0" strokeWidth={2} />
                          <span className="text-xs font-semibold text-slate-800 truncate">License Front #{i + 1}</span>
                        </div>
                        <span className="text-[10px] font-bold text-blue-600 shrink-0">View</span>
                      </div>
                    );
                  })}

                  {/* Driving License Rear */}
                  {(selectedClaimModal.drivingLicense?.rear || []).map((url, i) => {
                    const fullUrl = getFullImageUrl(url);
                    return (
                      <div
                        key={`dl-rear-${i}`}
                        onClick={() => setPreviewImage({ url: fullUrl, title: `Driving License Rear - ${selectedClaimModal.claimNumber}` })}
                        className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 transition-all select-none shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <HugeiconsIcon icon={File01Icon} className="w-4 h-4 text-slate-500 shrink-0" strokeWidth={2} />
                          <span className="text-xs font-semibold text-slate-800 truncate">License Rear #{i + 1}</span>
                        </div>
                        <span className="text-[10px] font-bold text-blue-600 shrink-0">View</span>
                      </div>
                    );
                  })}

                  {/* Inspection Report */}
                  {selectedClaimModal.inspectionReport && (
                    <div
                      onClick={() => setPreviewImage({ url: getFullImageUrl(selectedClaimModal.inspectionReport), title: `Inspection Report - ${selectedClaimModal.claimNumber}` })}
                      className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-center justify-between gap-3 cursor-pointer hover:bg-blue-100/70 transition-all select-none shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <HugeiconsIcon icon={File01Icon} className="w-4 h-4 text-blue-600 shrink-0" strokeWidth={2} />
                        <span className="text-xs font-semibold text-blue-900 truncate">Inspection Report</span>
                      </div>
                      <span className="text-[10px] font-bold text-blue-700 shrink-0">View Report</span>
                    </div>
                  )}

                  {/* Payment Receipt */}
                  {selectedClaimModal.paymentReceipt && (
                    <div
                      onClick={() => setPreviewImage({ url: getFullImageUrl(selectedClaimModal.paymentReceipt), title: `Payment Receipt - ${selectedClaimModal.claimNumber}` })}
                      className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center justify-between gap-3 cursor-pointer hover:bg-emerald-100/70 transition-all select-none shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <HugeiconsIcon icon={File01Icon} className="w-4 h-4 text-emerald-600 shrink-0" strokeWidth={2} />
                        <span className="text-xs font-semibold text-emerald-900 truncate">Payment Receipt</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 shrink-0">View Receipt</span>
                    </div>
                  )}

                  {/* Additional Documents */}
                  {(selectedClaimModal.additionalDocuments || []).map((doc, docIdx) => {
                    const fullUrl = getFullImageUrl(doc.url);
                    return (
                      <div
                        key={`add-doc-${docIdx}`}
                        onClick={() => setPreviewImage({ url: fullUrl, title: `${doc.name} - ${selectedClaimModal.claimNumber}` })}
                        className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 transition-all select-none shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <HugeiconsIcon icon={File01Icon} className="w-4 h-4 text-slate-500 shrink-0" strokeWidth={2} />
                          <span className="text-xs font-semibold text-slate-800 truncate">{doc.name}</span>
                        </div>
                        <span className="text-[10px] font-bold text-blue-600 shrink-0">View</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 5: Third Party Vehicles */}
              {selectedClaimModal.otherVehicleDetails && selectedClaimModal.otherVehicleDetails.length > 0 && selectedClaimModal.otherVehicleDetails.some(ov => ov.vehiclePlate) && (
                <div className="space-y-3 select-none">
                  <h4 className="font-semibold text-slate-800 text-xs tracking-wide uppercase text-amber-500">
                    Third-Party Vehicle Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {selectedClaimModal.otherVehicleDetails.filter(ov => ov.vehiclePlate).map((ov, ovIdx) => (
                      <div key={ovIdx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-1.5">
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-bold text-slate-900">{formatPlate(ov.vehiclePlate || "")}</span>
                          <span className="text-[10px] font-semibold text-slate-500">{ov.insuranceCompany || "Third Party"}</span>
                        </div>
                        <span className="text-slate-600 font-medium">Driver: {ov.driverName || "-"}</span>
                        <span className="text-slate-600 font-medium">Policy No: {ov.policyNumber || "-"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center select-none shrink-0">
              <Link
                href={`/Office_Staff/Claims?claimId=${encodeURIComponent(selectedClaimModal.claimNumber)}`}
                className="text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1.5 no-underline"
              >
                <span>Open in Claims Management Workbench ↗</span>
              </Link>

              <button
                onClick={() => setSelectedClaimModal(null)}
                className="px-6 py-2.5 bg-[#000080] hover:bg-[#000066] active:scale-95 text-white rounded-full text-xs font-semibold shadow-md cursor-pointer border-none transition-all"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Document Image Fullscreen Lightbox Modal                 */}
      {/* ======================================================== */}
      {previewImage && (
        <div className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md transition-all duration-300">
          <div className="bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center select-none bg-white">
              <h3 className="text-sm font-bold text-slate-900">{previewImage.title}</h3>
              <button
                onClick={() => setPreviewImage(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={2.5} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex items-center justify-center bg-slate-900/10 min-h-[300px]">
              {previewImage.url.endsWith(".pdf") ? (
                <iframe src={previewImage.url} className="w-full h-[500px] rounded-xl border border-slate-200" title="PDF Document Preview" />
              ) : (
                <img
                  src={previewImage.url}
                  alt={previewImage.title}
                  className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-md"
                />
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-between items-center select-none">
              <a
                href={previewImage.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-blue-600 hover:underline no-underline"
              >
                Open Original in New Tab ↗
              </a>
              <button
                onClick={() => setPreviewImage(null)}
                className="px-5 py-2 bg-[#102A43] text-white rounded-full text-xs font-semibold hover:bg-[#09111b] transition-all cursor-pointer border-none"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Alert / Notification Popup                               */}
      {/* ======================================================== */}
      {customPopup.show && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 p-6 flex flex-col gap-4 text-left">
            <div className="flex items-center gap-3">
              {customPopup.type === "success" ? (
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-5 h-5" strokeWidth={2.5} />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                  <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5" strokeWidth={2.5} />
                </div>
              )}
              <h3 className="font-semibold text-base text-slate-800 tracking-tight leading-none">
                {customPopup.title}
              </h3>
            </div>
            <p className="text-slate-500 text-xs font-semibold leading-relaxed">{customPopup.message}</p>
            <div className="flex justify-end mt-2 select-none">
              <button
                onClick={() => setCustomPopup({ ...customPopup, show: false })}
                className="px-6 py-2 bg-[#000080] hover:bg-[#000066] active:scale-95 text-white rounded-full text-xs font-semibold shadow-md transition-all cursor-pointer border-none"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Chat Button */}
      <button
        className="fixed bottom-8 right-8 z-40 bg-[#00ddff] hover:bg-[#00c8e6] text-white p-5 rounded-full shadow-2xl transition-all duration-150 hover:scale-110 active:scale-95 cursor-pointer focus:outline-none border-none flex items-center justify-center"
        aria-label="Chat support"
      >
        <HugeiconsIcon icon={BubbleChatIcon} className="w-7 h-7 text-white" strokeWidth={2} />
      </button>
    </div>
  );
}
