"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import AdminNavbar from "@/app/Components/Admin/Navbar";
import { API_URL } from "@/app/config";
import UserAvatarDropdown from "@/app/Components/UserAvatarDropdown";
import SimpleLoader from "@/app/Components/SimpleLoader";
import { getVehicleIconSvg } from "@/app/Components/VehicleIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Menu01Icon,
  Search01Icon,
  CheckmarkCircle01Icon,
  Alert02Icon,
  Download01Icon,
  Building01Icon,
  Cancel01Icon,
  RefreshIcon,
  Car01Icon,
  Clock01Icon,
  Mail01Icon,
  ViewIcon,
  SquareLock02Icon
} from "@hugeicons/core-free-icons";

interface VehicleOwner {
  id: string;
  name: string;
  nic: string;
  mobile: string;
  email: string;
  address: string;
  city: string;
  branch: string;
  referenceNumber: string;
}

interface ExpiringVehicle {
  numberPlate: string;
  vehicleType: string;
  year: string;
  company: string;
  model: string;
  engineNumber: string;
  chassisNumber: string;
  policyNumber: string;
  calculatedExpiryDate: string;
  daysRemaining: number;
  isExpiringWithin1AndHalfMonths: boolean;
}

interface RenewalQuote {
  _id: string;
  quoteNumber?: string;
  status: string;
  calculation: {
    marketValuation: number;
    basicPremiumRate: number;
    basicPremium: number;
    noClaimBonusDiscount: number;
    discountAmount: number;
    netPremium: number;
    govtTaxes: number;
    adminFee: number;
    totalRenewalAmount: number;
    finalAnnualTotal?: number;
  };
  selectedPlan?: string;
  paymentPlanType?: string;
  allowedPaymentModes?: Array<{
    planType: string;
    installmentsCount: number;
    breakdown: Array<{
      installmentNumber: number;
      label: string;
      amount: number;
      dueOffsetMonths: number;
    }>;
  }>;
  installments?: Array<{
    _id?: string;
    installmentNumber: number;
    label: string;
    amount: number;
    dueDate: string;
    status: string;
    paidAt?: string;
  }>;
  calculatedBy?: {
    staffId?: string;
    staffName?: string;
    notes?: string;
  };
}

interface VehicleRenewalItem {
  owner: VehicleOwner;
  vehicle: ExpiringVehicle;
  renewalQuote: RenewalQuote | null;
  isPaid?: boolean;
  latestPaymentDate?: string;
}

const SRI_LANKA_BRANCHES = [
  "All",
  "Colombo",
  "Galle",
  "Kandy",
  "Matara",
  "Gampaha",
  "Kurunegala",
  "Negombo",
  "Jaffna",
  "Ratnapura",
  "Kalutara",
  "Anuradhapura",
  "Badulla",
  "Batticaloa",
  "Trincomalee",
  "Hambantota",
  "Kegalle",
  "Matale",
  "Nuwara Eliya",
  "Puttalam",
  "Polonnaruwa",
  "Monaragala",
  "Ampara",
  "Mannar",
  "Vavuniya",
  "Sooriyawewa",
  "Head Office"
];

export default function AdminRenewalsPage() {
  const [selectedBranch, setSelectedBranch] = useState("All");
  const [vehicles, setVehicles] = useState<VehicleRenewalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"expiring_soon" | "paid" | "all">("expiring_soon");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState("all");

  // Inspection Modal State (Read-Only for Admin)
  const [selectedItem, setSelectedItem] = useState<VehicleRenewalItem | null>(null);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [reminderStatus, setReminderStatus] = useState<{ [plate: string]: string }>({});

  // Format currency
  const formatLKR = (amount?: number) => {
    if (amount === undefined || amount === null || isNaN(amount)) return "Rs. 0";
    return `Rs. ${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  // Load Vehicles for Selected Branch (or all branches if "All")
  const loadVehicles = useCallback(async (branchName: string) => {
    try {
      setLoading(true);
      setError("");
      const branchParam = branchName && branchName !== "All" ? `branch=${encodeURIComponent(branchName)}&` : "branch=All&";
      const res = await fetch(`${API_URL}/renewals/branch-expiring-vehicles?${branchParam}all=true`);
      if (!res.ok) throw new Error("Failed to load vehicle renewal records.");
      const data = await res.json();
      setVehicles(data.vehicles || []);
    } catch (err: any) {
      console.error("Error loading vehicles:", err);
      setError(err.message || "Failed to load vehicle renewal data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVehicles(selectedBranch);
  }, [selectedBranch, loadVehicles]);

  // Send Renewal Reminder Email
  const handleSendReminder = async (vehiclePlate: string) => {
    setIsSendingReminder(true);
    setReminderStatus((prev) => ({ ...prev, [vehiclePlate]: "Sending..." }));
    try {
      const res = await fetch(`${API_URL}/renewals/send-reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehiclePlate })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send reminder.");
      setReminderStatus((prev) => ({ ...prev, [vehiclePlate]: "Reminder Sent!" }));
      setTimeout(() => {
        setReminderStatus((prev) => {
          const next = { ...prev };
          delete next[vehiclePlate];
          return next;
        });
      }, 3500);
    } catch (e: any) {
      setReminderStatus((prev) => ({ ...prev, [vehiclePlate]: e.message || "Failed" }));
      setTimeout(() => {
        setReminderStatus((prev) => {
          const next = { ...prev };
          delete next[vehiclePlate];
          return next;
        });
      }, 3500);
    } finally {
      setIsSendingReminder(false);
    }
  };

  // Filtered and Sorted List
  const filteredVehicles = useMemo(() => {
    return vehicles
      .filter((v) => {
        // Vehicle type filter
        if (vehicleTypeFilter !== "all") {
          const vType = (v.vehicle.vehicleType || "").toLowerCase();
          if (vehicleTypeFilter === "Car" && !vType.includes("car") && !vType.includes("sedan")) return false;
          if (vehicleTypeFilter === "Van" && !vType.includes("van") && !vType.includes("suv")) return false;
          if (vehicleTypeFilter === "Bike" && !vType.includes("motorcycle") && !vType.includes("bike") && !vType.includes("scooter")) return false;
          if (vehicleTypeFilter === "ThreeWheeler" && !vType.includes("three") && !vType.includes("wheeler") && !vType.includes("tuk")) return false;
        }

        // Search Query
        const q = searchQuery.toLowerCase().trim();
        if (q) {
          const matches =
            v.vehicle.numberPlate?.toLowerCase().includes(q) ||
            v.vehicle.model?.toLowerCase().includes(q) ||
            v.vehicle.company?.toLowerCase().includes(q) ||
            v.vehicle.policyNumber?.toLowerCase().includes(q) ||
            v.owner.name?.toLowerCase().includes(q) ||
            v.owner.nic?.toLowerCase().includes(q) ||
            v.owner.branch?.toLowerCase().includes(q);
          if (!matches) return false;
        }

        if (filterMode === "expiring_soon") {
          return v.vehicle.isExpiringWithin1AndHalfMonths && !v.isPaid;
        }
        if (filterMode === "paid") {
          return (
            v.isPaid ||
            (v.renewalQuote &&
              (v.renewalQuote.status === "Partially_Paid" || v.renewalQuote.status === "Fully_Paid"))
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (filterMode === "paid") {
          const timeA = a.latestPaymentDate ? new Date(a.latestPaymentDate).getTime() : 0;
          const timeB = b.latestPaymentDate ? new Date(b.latestPaymentDate).getTime() : 0;
          return timeB - timeA;
        }
        return a.vehicle.daysRemaining - b.vehicle.daysRemaining;
      });
  }, [vehicles, vehicleTypeFilter, searchQuery, filterMode]);

  // Computed summary statistics
  const expiringSoonCount = vehicles.filter((v) => v.vehicle.isExpiringWithin1AndHalfMonths && !v.isPaid).length;
  const paidCount = vehicles.filter((v) => v.isPaid || (v.renewalQuote && (v.renewalQuote.status === "Partially_Paid" || v.renewalQuote.status === "Fully_Paid"))).length;
  const pendingQuotesCount = vehicles.filter((v) => !v.isPaid && (!v.renewalQuote || v.renewalQuote.status === "Draft")).length;
  const totalVehiclesCount = vehicles.length;
  const totalRevenueCollected = vehicles.reduce((sum, v) => {
    const quoteVal = v.renewalQuote?.calculation?.finalAnnualTotal || v.renewalQuote?.calculation?.totalRenewalAmount;
    if (v.isPaid && quoteVal) {
      return sum + quoteVal;
    }
    if (v.renewalQuote?.installments) {
      const paidSum = v.renewalQuote.installments.filter((i) => i.status === "Paid").reduce((acc, i) => acc + (i.amount || 0), 0);
      if (paidSum > 0) return sum + paidSum;
    }
    return sum;
  }, 0);

  // Export CSV Handler
  const handleExportCSV = () => {
    let csv = "Vehicle Number,Model,Type,Policy Number,Owner Name,NIC,Mobile,Email,Branch,Policy Expiry Date,Days Remaining,Status,Annual Total (LKR),Payment Plan\r\n";
    filteredVehicles.forEach((item) => {
      const q = item.renewalQuote;
      const quoteVal = q?.calculation?.finalAnnualTotal || q?.calculation?.totalRenewalAmount || 0;
      csv += `"${item.vehicle.numberPlate}","${item.vehicle.company || ""} ${item.vehicle.model || ""}","${item.vehicle.vehicleType || "-"}","${item.vehicle.policyNumber || "-"}","${item.owner.name}","${item.owner.nic}","${item.owner.mobile || "-"}","${item.owner.email || "-"}","${item.owner.branch} Branch","${formatDate(item.vehicle.calculatedExpiryDate)}",${item.vehicle.daysRemaining},"${item.isPaid ? 'Paid' : q ? q.status : 'Pending'}",${quoteVal},"${q?.paymentPlanType || (q?.selectedPlan ? 'Annual' : '-')}"\r\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Sanasa_Admin_Renewals_${selectedBranch}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen bg-[#F0F4F8] font-sans antialiased text-slate-800 overflow-hidden">
      {/* Admin Navbar */}
      <AdminNavbar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-18 bg-white border-b border-slate-200/80 px-6 sm:px-8 flex items-center justify-between z-10 flex-shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("open-admin-mobile-menu"))}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 focus:outline-none"
            >
              <HugeiconsIcon icon={Menu01Icon} className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#000080] animate-pulse"></span>
              <h1 className="text-xl font-bold text-[#102A43] tracking-tight">National Policy Renewals Central</h1>
              <span className="hidden md:inline-block text-xs bg-blue-50 text-[#000080] font-bold px-2.5 py-1 rounded-full border border-blue-200">
                {selectedBranch === "All" ? "All Regional Branches" : `${selectedBranch} Branch`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-xs font-semibold bg-slate-100 px-3.5 py-1.5 rounded-full text-slate-600 border border-slate-200 hidden sm:block">
              Executive View
            </div>
            <UserAvatarDropdown userType="admin" />
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-8">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* Top Branch Jurisdiction Selector & Actions */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 select-none">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <HugeiconsIcon icon={Building01Icon} className="w-4 h-4 text-blue-700" strokeWidth={2} />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Branch Jurisdiction:</span>
                </div>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-[#102A43] bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
                >
                  <option value="All">All 26 Regional Branches (National Network)</option>
                  {SRI_LANKA_BRANCHES.filter((b) => b !== "All").map((b) => (
                    <option key={b} value={b}>{b} Branch</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
                <button
                  onClick={handleExportCSV}
                  disabled={filteredVehicles.length === 0}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <HugeiconsIcon icon={Download01Icon} className="w-4 h-4 text-slate-600" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => loadVehicles(selectedBranch)}
                  disabled={loading}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer border-none"
                  title="Reload Renewals"
                >
                  <HugeiconsIcon icon={RefreshIcon} className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Summary Statistics 5 Display Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 select-none">
              {/* Card 1: Expiring in 45 Days */}
              <div
                onClick={() => setFilterMode("expiring_soon")}
                className={`group bg-white rounded-2xl p-4 border transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md relative overflow-hidden ${
                  filterMode === "expiring_soon"
                    ? "border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/20"
                    : "border-slate-200/80 hover:border-amber-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Expiring in 45 Days
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                    <HugeiconsIcon icon={Clock01Icon} className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-2.5">
                  <span className="text-2xl font-black text-slate-900 font-mono block">
                    {loading ? "..." : expiringSoonCount}
                  </span>
                  <span className="text-[10px] text-amber-600 font-bold block mt-0.5">
                    Requires Renewal
                  </span>
                </div>
              </div>

              {/* Card 2: Already Paid / Renewed */}
              <div
                onClick={() => setFilterMode("paid")}
                className={`group bg-white rounded-2xl p-4 border transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md relative overflow-hidden ${
                  filterMode === "paid"
                    ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20"
                    : "border-slate-200/80 hover:border-emerald-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Paid / Renewed
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-2.5">
                  <span className="text-2xl font-black text-emerald-700 font-mono block">
                    {loading ? "..." : paidCount}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
                    Active Coverage
                  </span>
                </div>
              </div>

              {/* Card 3: Total Renewal Premiums Collected */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Collected Revenue
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                    <span className="text-xs font-black">Rs</span>
                  </div>
                </div>
                <div className="mt-2.5">
                  <span className="text-lg font-black text-[#000080] font-mono block truncate" title={formatLKR(totalRevenueCollected)}>
                    {loading ? "..." : formatLKR(totalRevenueCollected)}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                    Total Collected
                  </span>
                </div>
              </div>

              {/* Card 4: Pending Branch Setup */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Pending Quotes
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200">
                    <HugeiconsIcon icon={SquareLock02Icon} className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-2.5">
                  <span className="text-2xl font-black text-slate-700 font-mono block">
                    {loading ? "..." : pendingQuotesCount}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                    Branch Setup Needed
                  </span>
                </div>
              </div>

              {/* Card 5: Fleet Count */}
              <div
                onClick={() => setFilterMode("all")}
                className={`group bg-white rounded-2xl p-4 border transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md relative overflow-hidden ${
                  filterMode === "all"
                    ? "border-blue-600 ring-2 ring-blue-600/20 bg-blue-50/20"
                    : "border-slate-200/80 hover:border-blue-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Monitored Fleet
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#000080] flex items-center justify-center border border-blue-200">
                    <HugeiconsIcon icon={Car01Icon} className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-2.5">
                  <span className="text-2xl font-black text-[#102A43] font-mono block">
                    {loading ? "..." : totalVehiclesCount}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                    Active Portfolios
                  </span>
                </div>
              </div>
            </div>

            {/* Toolbar: Search & Filter Tabs */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 select-none">
              {/* Search input */}
              <div className="relative w-full md:w-96">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <HugeiconsIcon icon={Search01Icon} className="w-4 h-4 text-slate-400" />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by vehicle plate, owner, NIC, model, branch..."
                  className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-slate-50/50"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex items-center gap-3 w-full md:w-auto justify-end flex-wrap">
                {/* Vehicle Type Dropdown */}
                <select
                  value={vehicleTypeFilter}
                  onChange={(e) => setVehicleTypeFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
                >
                  <option value="all">All Vehicle Types</option>
                  <option value="Car">Car / Sedan</option>
                  <option value="Van">Van / SUV</option>
                  <option value="Bike">Motorcycle</option>
                  <option value="ThreeWheeler">Three Wheeler</option>
                </select>

                {/* Filter Mode Buttons */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 overflow-x-auto">
                  <button
                    onClick={() => setFilterMode("expiring_soon")}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap border-none ${
                      filterMode === "expiring_soon"
                        ? "bg-[#000080] text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900 bg-transparent"
                    }`}
                  >
                    Expiring in 45 Days ({expiringSoonCount})
                  </button>
                  <button
                    onClick={() => setFilterMode("paid")}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 border-none ${
                      filterMode === "paid"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-emerald-700 hover:bg-emerald-100/60 bg-transparent"
                    }`}
                  >
                    Paid / Renewed ({paidCount})
                  </button>
                  <button
                    onClick={() => setFilterMode("all")}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap border-none ${
                      filterMode === "all"
                        ? "bg-slate-800 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900 bg-transparent"
                    }`}
                  >
                    All Fleet ({vehicles.length})
                  </button>
                </div>
              </div>
            </div>

            {/* Policyholder-Style Grid / Table Section */}
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <SimpleLoader message="Compiling national renewal matrices..." theme="slate" />
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-600 font-medium">
                {error}
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs">
                <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-4">
                  <HugeiconsIcon icon={Car01Icon} className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-800">No Vehicle Renewals Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  No monitored vehicle records match the current criteria for {selectedBranch === "All" ? "all branches" : `${selectedBranch} Branch`}.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {/* Table Header (Matching Policyholders Page Grid Header) */}
                <div className="hidden md:grid md:grid-cols-[minmax(0,1.8fr)_minmax(0,1.8fr)_minmax(0,1.3fr)_minmax(0,1.4fr)_minmax(0,1.6fr)_minmax(0,1.3fr)_minmax(0,1.4fr)] gap-4 px-5 py-3 text-slate-500 font-medium text-[10px] uppercase tracking-wider select-none bg-slate-50 rounded-xl border border-slate-200/60 mb-1 items-center">
                  <div>Vehicle & Details</div>
                  <div>Policyholder & Contact</div>
                  <div>Branch Office</div>
                  <div>Expiry & Timeline</div>
                  <div>Branch Renewal Fee</div>
                  <div className="text-center">Payment Status</div>
                  <div className="text-right">Actions</div>
                </div>

                {/* Table Rows (Card rows with blue left accent border matching Policyholders / Staff pages) */}
                {filteredVehicles.map((item, idx) => {
                  const v = item.vehicle;
                  const o = item.owner;
                  const q = item.renewalQuote;
                  const isExpSoon = v.isExpiringWithin1AndHalfMonths && !item.isPaid;
                  const isPaid = item.isPaid || (q && (q.status === "Partially_Paid" || q.status === "Fully_Paid"));
                  const totalAnnual = q?.calculation?.finalAnnualTotal || q?.calculation?.totalRenewalAmount;
                  const reminderMsg = reminderStatus[v.numberPlate];

                  return (
                    <div
                      key={`${v.numberPlate}-${idx}`}
                      className="bg-white border-l-[6px] border-l-blue-500 bg-gradient-to-r from-blue-50/10 via-transparent to-transparent border border-slate-200 rounded-xl px-5 py-4 flex flex-col md:grid md:grid-cols-[minmax(0,1.8fr)_minmax(0,1.8fr)_minmax(0,1.3fr)_minmax(0,1.4fr)_minmax(0,1.6fr)_minmax(0,1.3fr)_minmax(0,1.4fr)] md:items-center gap-4 transition-all duration-200 shadow-sm hover:shadow-md relative overflow-hidden group"
                    >
                      {/* Col 1: Vehicle & Details */}
                      <div className="flex items-center gap-3 min-w-0 select-none">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shadow-2xs shrink-0 group-hover:scale-105 transition-transform">
                          <span className="w-5 h-5 flex items-center justify-center">
                            {getVehicleIconSvg(v.vehicleType, "w-5 h-5 text-slate-700")}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm text-slate-900 font-mono tracking-tight whitespace-nowrap truncate">
                            {v.numberPlate}
                          </h3>
                          <span className="text-[11px] text-slate-500 font-medium block truncate mt-0.5">
                            {v.company} {v.model} &bull; {v.year || "2024"}
                          </span>
                        </div>
                      </div>

                      {/* Col 2: Policyholder & Contact */}
                      <div className="flex flex-col min-w-0 select-none">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1 md:hidden">Policyholder</span>
                        <h4 className="font-semibold text-xs text-slate-800 truncate">{o.name || "Policyholder"}</h4>
                        <span className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                          NIC: {o.nic} {o.mobile ? `• ${o.mobile}` : ""}
                        </span>
                      </div>

                      {/* Col 3: Branch Office */}
                      <div className="flex flex-col min-w-0 select-none">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1 md:hidden">Branch Office</span>
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-[#000080] border border-slate-200 w-fit truncate">
                          {o.branch || "Galle"} Branch
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium mt-1 truncate">
                          {o.city || "Sri Lanka"}
                        </span>
                      </div>

                      {/* Col 4: Expiry & Timeline */}
                      <div className="flex flex-col min-w-0 select-none">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1 md:hidden">Expiry Timeline</span>
                        <span className="text-slate-700 font-semibold text-xs">{formatDate(v.calculatedExpiryDate)}</span>
                        <div className="mt-1">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Active Coverage
                            </span>
                          ) : isExpSoon ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                              {v.daysRemaining} Days Left
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                              {v.daysRemaining > 0 ? `${v.daysRemaining} Days Left` : `Expired (${Math.abs(v.daysRemaining)}d)`}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Col 5: Branch Renewal Fee */}
                      <div className="flex flex-col min-w-0 select-none">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1 md:hidden">Renewal Fee</span>
                        {totalAnnual ? (
                          <div>
                            <span className="text-sm font-black font-mono text-slate-900 block">
                              {formatLKR(totalAnnual)}
                            </span>
                            <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                              {q?.status ? q.status.replace("_", " ") : "Calculated Quote"}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                              <HugeiconsIcon icon={SquareLock02Icon} className="w-3.5 h-3.5" />
                              <span>Valuation Needed</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                              Branch access only
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Col 6: Payment Status */}
                      <div className="flex flex-col md:items-center min-w-0 select-none">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1 md:hidden">Payment</span>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border text-center ${
                            isPaid
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {isPaid ? "Paid & Active" : "Payment Pending"}
                        </span>
                      </div>

                      {/* Col 7: Actions */}
                      <div className="flex items-center justify-end gap-2 min-w-0">
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="py-1.5 px-3 bg-[#000080] hover:bg-[#102A43] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer border-none active:scale-95"
                          title="Inspect Vehicle & Quote Details"
                        >
                          <HugeiconsIcon icon={ViewIcon} className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>

                        <button
                          onClick={() => handleSendReminder(v.numberPlate)}
                          disabled={isSendingReminder}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer border-none flex items-center justify-center active:scale-95 disabled:opacity-50"
                          title="Send Renewal Notification Email"
                        >
                          <HugeiconsIcon icon={Mail01Icon} className="w-4 h-4 text-slate-600" />
                        </button>

                        {reminderMsg && (
                          <span className="absolute right-4 bottom-1 text-[10px] font-bold text-emerald-600 bg-white px-2 py-0.5 rounded shadow-xs border border-emerald-200">
                            {reminderMsg}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* READ-ONLY INSPECTION & AUDIT MODAL (ADMIN CANNOT CALCULATE RENEWAL FEES) */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-[#000080] flex items-center justify-center shadow-xs">
                  <HugeiconsIcon icon={ViewIcon} className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Policy Renewal & Vehicle Inspection Details
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Vehicle: {selectedItem.vehicle.numberPlate} &bull; {selectedItem.owner.branch} Branch
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Notice: Branch Only Calculation Access */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#000080] flex items-center justify-center shrink-0 mt-0.5">
                  <HugeiconsIcon icon={SquareLock02Icon} className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-blue-900">Branch Office Authority Notice</h4>
                  <p className="text-[11px] text-blue-800 leading-relaxed mt-0.5">
                    Policy renewal fee calculations, market valuations, and payment plans are calculated and configured exclusively by the regional branch office (<strong>{selectedItem.owner.branch} Branch</strong>). System administrators maintain comprehensive executive read-only audit access.
                  </p>
                </div>
              </div>

              {/* Vehicle & Owner Header Card */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Owner Name</span>
                  <span className="font-bold text-slate-800 block text-xs mt-0.5">{selectedItem.owner.name}</span>
                  <span className="text-[11px] text-slate-500">NIC: {selectedItem.owner.nic}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Vehicle Spec</span>
                  <span className="font-bold text-slate-800 block text-xs mt-0.5">{selectedItem.vehicle.company} {selectedItem.vehicle.model}</span>
                  <span className="font-mono text-[11px] text-slate-500">{selectedItem.vehicle.numberPlate} ({selectedItem.vehicle.year || "2024"})</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Branch & Expiry</span>
                  <span className="font-bold text-[#000080] block text-xs mt-0.5">{selectedItem.owner.branch} Branch</span>
                  <span className="text-[11px] text-slate-500">{formatDate(selectedItem.vehicle.calculatedExpiryDate)}</span>
                </div>
              </div>

              {/* Extended Vehicle Technical Specifications */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Vehicle Identification Data</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Policy Number</span>
                    <span className="font-mono font-bold text-slate-800">{selectedItem.vehicle.policyNumber || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Engine Number</span>
                    <span className="font-mono text-slate-700">{selectedItem.vehicle.engineNumber || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Chassis Number</span>
                    <span className="font-mono text-slate-700">{selectedItem.vehicle.chassisNumber || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Vehicle Class</span>
                    <span className="text-slate-800 font-semibold">{selectedItem.vehicle.vehicleType || "Motor Vehicle"}</span>
                  </div>
                </div>
              </div>

              {/* Branch Calculation & Valuation Breakdown */}
              {selectedItem.renewalQuote?.calculation ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Branch Valuation & Fee Breakdown
                    </h4>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Status: {selectedItem.renewalQuote.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-3">
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Market Valuation:</span>
                      <span className="font-mono font-bold text-white">
                        {formatLKR(selectedItem.renewalQuote.calculation.marketValuation)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Basic Premium ({selectedItem.renewalQuote.calculation.basicPremiumRate || 1.2}%):</span>
                      <span className="font-mono text-white">
                        {formatLKR(selectedItem.renewalQuote.calculation.basicPremium)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span>No-Claim Bonus (NCB) Discount ({selectedItem.renewalQuote.calculation.noClaimBonusDiscount || 10}%):</span>
                      <span className="font-mono text-emerald-400">
                        - {formatLKR(selectedItem.renewalQuote.calculation.discountAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Net Basic Premium:</span>
                      <span className="font-mono text-white">
                        {formatLKR(selectedItem.renewalQuote.calculation.netPremium)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Admin Fee & Government Taxes:</span>
                      <span className="font-mono text-white">
                        {formatLKR((selectedItem.renewalQuote.calculation.adminFee || 0) + (selectedItem.renewalQuote.calculation.govtTaxes || 0))}
                      </span>
                    </div>
                    <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-sm font-black">
                      <span className="text-white">Annual Renewal Total:</span>
                      <span className="text-emerald-400 font-mono text-lg">
                        {formatLKR(selectedItem.renewalQuote.calculation.finalAnnualTotal || selectedItem.renewalQuote.calculation.totalRenewalAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Calculated By Attribution */}
                  {selectedItem.renewalQuote.calculatedBy && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex justify-between items-center">
                      <span>Valuation Officer: <strong>{selectedItem.renewalQuote.calculatedBy.staffName || "Branch Officer"}</strong></span>
                      <span className="text-slate-400">Staff ID: {selectedItem.renewalQuote.calculatedBy.staffId || "Branch Staff"}</span>
                    </div>
                  )}

                  {/* Installments Table */}
                  {selectedItem.renewalQuote.installments && selectedItem.renewalQuote.installments.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Payment Schedule Installments</h4>
                      <div className="space-y-1.5">
                        {selectedItem.renewalQuote.installments.map((inst, i) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                            <div>
                              <span className="font-bold text-slate-800 block">{inst.label}</span>
                              <span className="text-[11px] text-slate-400">Due Date: {formatDate(inst.dueDate)}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-black font-mono text-slate-900 block">{formatLKR(inst.amount)}</span>
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                inst.status === "Paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                              }`}>
                                {inst.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
                    <HugeiconsIcon icon={SquareLock02Icon} className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">Branch Fee Valuation Not Yet Calculated</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    The regional branch office (<strong>{selectedItem.owner.branch} Branch</strong>) has not yet generated a renewal quote for this vehicle. Only branch officers have calculation permissions.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
              >
                Close Inspection
              </button>

              <button
                onClick={() => handleSendReminder(selectedItem.vehicle.numberPlate)}
                disabled={isSendingReminder}
                className="px-5 py-2 bg-[#000080] hover:bg-[#102A43] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border-none shadow-xs active:scale-95 disabled:opacity-50"
              >
                <HugeiconsIcon icon={Mail01Icon} className="w-4 h-4 text-white" />
                <span>Send Reminder Email</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
