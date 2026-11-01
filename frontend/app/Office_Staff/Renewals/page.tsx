"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import OfficeStaffNavbar from "@/app/Components/Office_Staff/Navbar";
import { API_URL } from "@/app/config";
import UserAvatarDropdown from "@/app/Components/UserAvatarDropdown";
import HeaderNotificationBell from "@/app/Components/HeaderNotificationBell";
import SimpleLoader from "@/app/Components/SimpleLoader";
import { getVehicleIconContainer, getVehicleTheme } from "@/app/Components/VehicleIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Menu01Icon,
  Search01Icon,
  Calendar01Icon,
  CheckmarkCircle01Icon,
  Alert02Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  File01Icon,
  Loading03Icon,
  Tick01Icon,
  Money01Icon,
  ViewIcon,
  Car01Icon,
  Clock01Icon,
  Mail01Icon,
  RefreshIcon,
  Copy01Icon,
  UserIcon,
  Shield01Icon
} from "@hugeicons/core-free-icons";

interface VehicleOwner {
  id?: string;
  name?: string;
  nic?: string;
  mobile?: string;
  email?: string;
  address?: string;
  city?: string;
  branch?: string;
  referenceNumber?: string;
}

interface ExpiringVehicle {
  numberPlate?: string;
  vehicleType?: string;
  year?: string;
  company?: string;
  model?: string;
  engineNumber?: string;
  chassisNumber?: string;
  policyNumber?: string;
  calculatedExpiryDate?: string;
  daysRemaining?: number;
  isExpiringWithin1AndHalfMonths?: boolean;
}

interface RenewalQuote {
  _id?: string;
  status?: string;
  calculation?: {
    marketValuation?: number;
    basicPremiumRate?: number;
    basicPremium?: number;
    noClaimBonusDiscount?: number;
    discountAmount?: number;
    netPremium?: number;
    govtTaxes?: number;
    adminFee?: number;
    totalRenewalAmount?: number;
  };
  selectedPlan?: string;
  allowedPaymentModes?: Array<{
    planType?: string;
    installmentsCount?: number;
    breakdown?: any;
    _id?: string;
  }>;
  installments?: Array<{
    _id?: string;
    installmentNumber?: number;
    label?: string;
    amount?: number;
    dueDate?: string;
    status?: string;
    paidAt?: string;
    stripeSessionId?: string;
    stripePaymentIntentId?: string;
  }>;
  calculatedBy?: {
    staffId?: string;
    staffName?: string;
    notes?: string;
  };
}

interface VehicleRenewalItem {
  owner?: VehicleOwner;
  vehicle?: ExpiringVehicle;
  renewalQuote?: RenewalQuote | null;
  isPaid?: boolean;
  latestPaymentDate?: string | null;
}

// ─── Safe Helpers ─────────────────────────────────────────────────────────────
const safeCurrency = (val: any): string => {
  if (val === null || val === undefined || val === "") return "0";
  const num = Number(val);
  return isNaN(num) ? "0" : num.toLocaleString();
};

const safeFormatDate = (
  dateVal: any,
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" }
): string => {
  if (!dateVal) return "N/A";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-US", options);
  } catch {
    return "N/A";
  }
};

const safeToIsoDate = (dateVal: any): string => {
  if (!dateVal) return "";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
};

export default function OfficeStaffRenewalsPage() {
  const router = useRouter();
  const [branch, setBranch] = useState("Galle");
  const [staffInfo, setStaffInfo] = useState<{ id?: string; name?: string; email?: string } | null>(null);
  const [vehicles, setVehicles] = useState<VehicleRenewalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"expiring_soon" | "paid" | "all">("expiring_soon");
  const [copiedPlate, setCopiedPlate] = useState<string | null>(null);

  // Detail Modal State
  const [selectedItem, setSelectedItem] = useState<VehicleRenewalItem | null>(null);
  const [showCalculationDropdown, setShowCalculationDropdown] = useState(false);

  // Cost Calculation Form State
  const [marketValuation, setMarketValuation] = useState<number>(4500000);
  const [premiumRate, setPremiumRate] = useState<number>(1.2);
  const [ncbDiscount, setNcbDiscount] = useState<number>(10);
  const [adminFee, setAdminFee] = useState<number>(1500);
  const [govtTaxes, setGovtTaxes] = useState<number>(0);
  const [allowInstallments, setAllowInstallments] = useState(true);
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);
  const [calcSuccessMsg, setCalcSuccessMsg] = useState("");
  const [calcErrMsg, setCalcErrMsg] = useState("");
  const [customExpiryDate, setCustomExpiryDate] = useState<string>("");
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [reminderStatus, setReminderStatus] = useState("");

  const handleCopyPlate = (plate: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!plate) return;
    try {
      navigator.clipboard.writeText(plate);
      setCopiedPlate(plate);
      setTimeout(() => setCopiedPlate(null), 2000);
    } catch {}
  };

  const handleSendReminder = async (vehiclePlate?: string) => {
    if (!vehiclePlate) return;
    setIsSendingReminder(true);
    setReminderStatus("");
    try {
      const res = await fetch(`${API_URL}/renewals/send-reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehiclePlate })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send reminder.");
      setReminderStatus("✅ Renewal reminder email dispatched to policyholder & branch!");
      setTimeout(() => setReminderStatus(""), 4500);
    } catch (e: any) {
      setReminderStatus(`❌ ${e.message || "Could not send email."}`);
      setTimeout(() => setReminderStatus(""), 4500);
    } finally {
      setIsSendingReminder(false);
    }
  };

  // Computed live calculation values
  const computedBasic = Math.round((Number(marketValuation || 0) * Number(premiumRate || 0)) / 100);
  const computedDiscount = Math.round((computedBasic * Number(ncbDiscount || 0)) / 100);
  const computedNet = Math.max(0, computedBasic - computedDiscount);
  const computedTotal = Math.round(computedNet + Number(govtTaxes || 0) + Number(adminFee || 0));

  // Check Staff session
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedStaff = sessionStorage.getItem("logged_in_staff");
      if (!savedStaff) {
        router.push("/Login");
        return;
      }
      try {
        const parsed = JSON.parse(savedStaff);
        setBranch(parsed.branch || "Galle");
        setStaffInfo({
          id: parsed._id || parsed.id,
          name: `${parsed.firstName || ""} ${parsed.lastName || ""}`.trim() || parsed.name || "Branch Staff",
          email: parsed.email
        });
      } catch (e) {
        console.error("Error parsing staff session:", e);
      }
    }
  }, [router]);

  // Load Vehicles for Branch
  const loadVehicles = useCallback(async (currentBranch: string) => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(
        `${API_URL}/renewals/branch-expiring-vehicles?branch=${encodeURIComponent(currentBranch)}&all=true`
      );
      if (!res.ok) throw new Error("Failed to load branch expiring vehicles.");
      const data = await res.json();
      setVehicles(Array.isArray(data.vehicles) ? data.vehicles : []);
    } catch (err: any) {
      console.error("Error loading vehicles:", err);
      setError(err.message || "Failed to load branch vehicles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (branch) {
      loadVehicles(branch);
    }
  }, [branch, loadVehicles]);

  // Open modal and prefill defaults safely
  const handleOpenDetails = (item: VehicleRenewalItem) => {
    if (!item) return;
    setSelectedItem(item);
    setShowCalculationDropdown(false);
    setCalcSuccessMsg("");
    setCalcErrMsg("");

    const initialExp = safeToIsoDate(item.vehicle?.calculatedExpiryDate);
    setCustomExpiryDate(initialExp);

    if (item.renewalQuote?.calculation) {
      const c = item.renewalQuote.calculation;
      setMarketValuation(Number(c.marketValuation) || 4500000);
      setPremiumRate(Number(c.basicPremiumRate) || 1.2);
      setNcbDiscount(Number(c.noClaimBonusDiscount) || 10);
      setAdminFee(Number(c.adminFee) || 1500);
      setGovtTaxes(Number(c.govtTaxes) || 0);
    } else {
      setMarketValuation(4500000);
      setPremiumRate(1.2);
      setNcbDiscount(10);
      setAdminFee(1500);
      setGovtTaxes(0);
    }
  };

  // Submit Renewal Calculation
  const handleConfirmCalculation = async () => {
    if (!selectedItem || !selectedItem.vehicle || !selectedItem.owner) return;
    setIsSubmittingQuote(true);
    setCalcSuccessMsg("");
    setCalcErrMsg("");

    try {
      const res = await fetch(`${API_URL}/renewals/calculate-quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nic: selectedItem.owner.nic || "",
          vehiclePlate: selectedItem.vehicle.numberPlate || "",
          marketValuation,
          basicPremiumRate: premiumRate,
          basicPremium: computedBasic,
          noClaimBonusDiscount: ncbDiscount,
          adminFee,
          govtTaxes,
          allowInstallments,
          customExpiryDate: customExpiryDate || undefined,
          staffId: staffInfo?.id || "",
          staffName: staffInfo?.name || "Staff Member"
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save calculation.");

      setCalcSuccessMsg("Renewal cost & installment options saved successfully! Official emails sent to policyholder and branch.");

      const updatedQuote = data.renewal;
      setSelectedItem((prev) => (prev ? { ...prev, renewalQuote: updatedQuote } : null));

      setVehicles((prev) =>
        prev.map((v) =>
          v.vehicle?.numberPlate === selectedItem.vehicle?.numberPlate
            ? { ...v, renewalQuote: updatedQuote }
            : v
        )
      );
    } catch (err: any) {
      setCalcErrMsg(err.message || "Failed to save calculation.");
    } finally {
      setIsSubmittingQuote(false);
    }
  };

  // Safe Filtered and Sorted List
  const filteredVehicles = useMemo(() => {
    return vehicles
      .filter((v) => {
        if (!v || !v.vehicle) return false;
        const q = searchQuery.toLowerCase().trim();
        if (q) {
          const plate = String(v.vehicle.numberPlate || "").toLowerCase();
          const model = String(v.vehicle.model || "").toLowerCase();
          const company = String(v.vehicle.company || "").toLowerCase();
          const policy = String(v.vehicle.policyNumber || "").toLowerCase();
          const ownerName = String(v.owner?.name || "").toLowerCase();
          const ownerNic = String(v.owner?.nic || "").toLowerCase();

          const matches =
            plate.includes(q) ||
            model.includes(q) ||
            company.includes(q) ||
            policy.includes(q) ||
            ownerName.includes(q) ||
            ownerNic.includes(q);

          if (!matches) return false;
        }

        if (filterMode === "expiring_soon") {
          return Boolean(v.vehicle.isExpiringWithin1AndHalfMonths) && !v.isPaid;
        }
        if (filterMode === "paid") {
          const qStatus = v.renewalQuote?.status;
          return v.isPaid || qStatus === "Partially_Paid" || qStatus === "Fully_Paid";
        }
        return true;
      })
      .sort((a, b) => {
        if (filterMode === "paid") {
          const timeA = a.latestPaymentDate ? new Date(a.latestPaymentDate).getTime() : 0;
          const timeB = b.latestPaymentDate ? new Date(b.latestPaymentDate).getTime() : 0;
          return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
        }
        const remA = Number(a.vehicle?.daysRemaining ?? 9999);
        const remB = Number(b.vehicle?.daysRemaining ?? 9999);
        return remA - remB;
      });
  }, [vehicles, searchQuery, filterMode]);

  // Computed summary statistics (defensively protected against undefined objects)
  const expiringSoonCount = useMemo(() => {
    return vehicles.filter((v) => v?.vehicle?.isExpiringWithin1AndHalfMonths && !v.isPaid).length;
  }, [vehicles]);

  const paidCount = useMemo(() => {
    return vehicles.filter(
      (v) =>
        v?.isPaid ||
        v?.renewalQuote?.status === "Partially_Paid" ||
        v?.renewalQuote?.status === "Fully_Paid"
    ).length;
  }, [vehicles]);

  const pendingQuotesCount = useMemo(() => {
    return vehicles.filter(
      (v) => v?.vehicle?.isExpiringWithin1AndHalfMonths && !v.renewalQuote && !v.isPaid
    ).length;
  }, [vehicles]);

  const totalVehiclesCount = vehicles.length;

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] font-sans antialiased text-slate-800">
      <div className="flex flex-1 flex-row min-h-0">
        {/* Office Staff Navbar */}
        <OfficeStaffNavbar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
          {/* Top Navbar */}
          <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 text-slate-800 px-6 sm:px-8 py-4 flex justify-between items-center select-none shadow-xs flex-shrink-0 h-[80px] sticky top-0 z-30">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("open-mobile-menu"))}
                className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 active:scale-95 transition-all cursor-pointer focus:outline-none"
              >
                <HugeiconsIcon icon={Menu01Icon} className="w-6 h-6" strokeWidth={2.5} />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Operations
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                    Live Portal
                  </span>
                </div>
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-0.5">
                  <span>Policy Renewals & Expirations</span>
                  <span className="hidden sm:inline-flex items-center gap-1.5 bg-[#041215] text-white text-xs px-3 py-1 rounded-full font-bold shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    {branch || "Galle"} Branch
                  </span>
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              <button
                onClick={() => loadVehicles(branch)}
                disabled={loading}
                title="Refresh Branch Fleet Data"
                className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <HugeiconsIcon
                  icon={RefreshIcon}
                  className={`w-4 h-4 ${loading ? "animate-spin text-emerald-600" : ""}`}
                />
              </button>
              <HeaderNotificationBell href="/Office_Staff/Notifications" />
              <UserAvatarDropdown userType="office_staff" />
            </div>
          </header>

          {/* Content Body */}
          <main className="flex-1 overflow-y-scroll [scrollbar-gutter:stable] p-4 sm:p-8 pb-32">
            <div className="max-w-7xl mx-auto space-y-6">
              
              {/* ── Summary Statistics KPI Cards (Sanasa Visual Redesign) ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 select-none">
                
                {/* KPI Card 1: Expiring in 1.5 Months */}
                <div
                  onClick={() => setFilterMode("expiring_soon")}
                  className={`group relative overflow-hidden bg-white rounded-3xl p-5 border transition-all duration-300 cursor-pointer shadow-xs hover:shadow-lg hover:-translate-y-1 ${
                    filterMode === "expiring_soon"
                      ? "border-amber-400 ring-2 ring-amber-400/30 bg-gradient-to-br from-amber-500/10 via-amber-50/40 to-white"
                      : "border-slate-200/80 hover:border-amber-300 bg-gradient-to-br from-amber-50/20 to-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                      Expiring Soon (45d)
                    </span>
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform shadow-xs">
                      <HugeiconsIcon icon={Clock01Icon} className="w-5 h-5" strokeWidth={2} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2.5">
                    <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                      {loading ? "..." : expiringSoonCount}
                    </span>
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-200">
                      Due Soon
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    {expiringSoonCount > 0 ? `${expiringSoonCount} vehicle policies need renewal` : "All fleet up to date"}
                  </p>
                </div>

                {/* KPI Card 2: Paid / Renewed */}
                <div
                  onClick={() => setFilterMode("paid")}
                  className={`group relative overflow-hidden bg-white rounded-3xl p-5 border transition-all duration-300 cursor-pointer shadow-xs hover:shadow-lg hover:-translate-y-1 ${
                    filterMode === "paid"
                      ? "border-emerald-500 ring-2 ring-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-50/40 to-white"
                      : "border-slate-200/80 hover:border-emerald-300 bg-gradient-to-br from-emerald-50/20 to-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                      Settled / Active
                    </span>
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform shadow-xs">
                      <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-5 h-5" strokeWidth={2} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2.5">
                    <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                      {loading ? "..." : paidCount}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Active Pass
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Policy coverage actively renewed
                  </p>
                </div>

                {/* KPI Card 3: Pending Calculations / Quotes */}
                <div
                  onClick={() => setFilterMode("expiring_soon")}
                  className={`group relative overflow-hidden bg-white rounded-3xl p-5 border transition-all duration-300 cursor-pointer shadow-xs hover:shadow-lg hover:-translate-y-1 ${
                    filterMode === "expiring_soon" && pendingQuotesCount > 0
                      ? "border-blue-500 ring-2 ring-blue-500/30 bg-gradient-to-br from-blue-500/10 via-blue-50/40 to-white"
                      : "border-slate-200/80 hover:border-blue-300 bg-gradient-to-br from-blue-50/20 to-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                      Quotes Pending
                    </span>
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform shadow-xs">
                      <HugeiconsIcon icon={File01Icon} className="w-5 h-5" strokeWidth={2} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2.5">
                    <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                      {loading ? "..." : pendingQuotesCount}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        pendingQuotesCount > 0
                          ? "text-blue-800 bg-blue-100/90 border-blue-200"
                          : "text-slate-600 bg-slate-100 border-slate-200"
                      }`}
                    >
                      {pendingQuotesCount > 0 ? "Needs Quote" : "Up to Date"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    Awaiting staff valuation calculation
                  </p>
                </div>

                {/* KPI Card 4: Total Branch Fleet */}
                <div
                  onClick={() => setFilterMode("all")}
                  className={`group relative overflow-hidden bg-white rounded-3xl p-5 border transition-all duration-300 cursor-pointer shadow-xs hover:shadow-lg hover:-translate-y-1 ${
                    filterMode === "all"
                      ? "border-[#041215] ring-2 ring-slate-900/20 bg-gradient-to-br from-slate-900/5 via-slate-50/60 to-white"
                      : "border-slate-200/80 hover:border-slate-400 bg-gradient-to-br from-slate-50/20 to-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                      Total Monitored Fleet
                    </span>
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center border border-slate-200 group-hover:scale-110 transition-transform shadow-xs">
                      <HugeiconsIcon icon={Car01Icon} className="w-5 h-5" strokeWidth={2} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2.5">
                    <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                      {loading ? "..." : totalVehiclesCount}
                    </span>
                    <span className="text-[11px] font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                      {branch} Fleet
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    All monitored registered vehicles
                  </p>
                </div>
              </div>

              {/* ── Search & Segmented Filter Bar ── */}
              <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative w-full md:w-96">
                  <HugeiconsIcon
                    icon={Search01Icon}
                    className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  />
                  <input
                    type="text"
                    placeholder="Search by plate, owner, NIC, or policy..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200/80 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400 font-medium"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs w-5 h-5 rounded-full bg-slate-200/60 flex items-center justify-center cursor-pointer"
                    >
                      &times;
                    </button>
                  )}
                </div>

                {/* Segment Filter Pills */}
                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                  <button
                    onClick={() => setFilterMode("expiring_soon")}
                    className={`flex-1 md:flex-initial text-xs font-bold px-4 py-2.5 rounded-2xl transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2 ${
                      filterMode === "expiring_soon"
                        ? "bg-[#041215] text-white shadow-sm ring-2 ring-slate-900/10"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                    }`}
                  >
                    <span>Expiring in 1.5 Months</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                        filterMode === "expiring_soon" ? "bg-amber-400 text-slate-900" : "bg-white text-slate-700"
                      }`}
                    >
                      {expiringSoonCount}
                    </span>
                  </button>

                  <button
                    onClick={() => setFilterMode("paid")}
                    className={`flex-1 md:flex-initial text-xs font-bold px-4 py-2.5 rounded-2xl transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2 ${
                      filterMode === "paid"
                        ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/20"
                        : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100/70 border border-emerald-200/60"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        filterMode === "paid" ? "bg-white" : "bg-emerald-500 animate-pulse"
                      }`}
                    />
                    <span>Already Paid / Renewed</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                        filterMode === "paid" ? "bg-white text-emerald-800" : "bg-emerald-100 text-emerald-900"
                      }`}
                    >
                      {paidCount}
                    </span>
                  </button>

                  <button
                    onClick={() => setFilterMode("all")}
                    className={`flex-1 md:flex-initial text-xs font-bold px-4 py-2.5 rounded-2xl transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2 ${
                      filterMode === "all"
                        ? "bg-[#0D2A3A] text-white shadow-sm ring-2 ring-slate-800/10"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                    }`}
                  >
                    <span>All Branch Vehicles</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                        filterMode === "all" ? "bg-white text-slate-900" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {totalVehiclesCount}
                    </span>
                  </button>
                </div>
              </div>

              {/* ── Content List & Table ── */}
              {loading ? (
                <div className="py-24 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200/80 shadow-xs">
                  <SimpleLoader />
                  <p className="text-slate-600 text-sm font-semibold mt-4">
                    Loading branch vehicle renewal records...
                  </p>
                  <span className="text-xs text-slate-400 mt-1">Connecting to SANASA fleet database</span>
                </div>
              ) : error ? (
                <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center text-rose-700 shadow-xs">
                  <HugeiconsIcon icon={Alert02Icon} className="w-10 h-10 mx-auto mb-3 text-rose-500" />
                  <h4 className="font-bold text-base text-rose-900">Failed to Retrieve Fleet Records</h4>
                  <p className="text-xs text-rose-600 mt-1 mb-4">{error}</p>
                  <button
                    onClick={() => loadVehicles(branch)}
                    className="px-5 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition-all cursor-pointer"
                  >
                    Try Again
                  </button>
                </div>
              ) : filteredVehicles.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100">
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900">No Vehicles Match Criteria</h3>
                  <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-md mx-auto leading-relaxed">
                    {filterMode === "expiring_soon"
                      ? "There are currently no registered vehicles under this branch scheduled to expire in the next 1.5 months. Switch to 'Already Paid / Renewed' or 'All Branch Vehicles' to review other policies."
                      : filterMode === "paid"
                      ? "No already paid or renewed vehicle policies recorded for this branch yet."
                      : "No vehicles found matching your search filter."}
                  </p>
                  {filterMode !== "all" && (
                    <button
                      onClick={() => setFilterMode("all")}
                      className="mt-5 text-xs font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-5 py-2.5 rounded-xl cursor-pointer transition-all border border-blue-200/80"
                    >
                      View All Branch Vehicles ({vehicles.length})
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3 pb-8">
                  {/* Table Header */}
                  <div className="hidden lg:grid lg:grid-cols-[minmax(220px,2.1fr)_minmax(130px,1.1fr)_minmax(130px,1.1fr)_minmax(190px,1.6fr)_minmax(150px,1.3fr)_minmax(130px,1.1fr)_minmax(160px,1.3fr)] gap-4 px-6 py-3.5 text-slate-400 font-bold text-[10px] uppercase tracking-wider select-none bg-slate-100/80 rounded-2xl border border-slate-200/80 items-center">
                    <div>Vehicle & Model</div>
                    <div>Plate Number</div>
                    <div>Policy Number</div>
                    <div>Policyholder (Owner)</div>
                    <div>Expiration Status</div>
                    <div>Renewal Fee</div>
                    <div className="text-right pr-2">Action & Assessment</div>
                  </div>

                  {/* List Rows */}
                  {filteredVehicles.map((item, idx) => {
                    const vehicle = item.vehicle || {};
                    const owner = item.owner || {};
                    const quote = item.renewalQuote;

                    const hasQuote = Boolean(quote && quote.calculation);
                    const isPaid = quote?.status === "Fully_Paid" || item.isPaid;
                    const isPartial = quote?.status === "Partially_Paid";
                    const daysRemaining = Number(vehicle.daysRemaining ?? 9999);
                    const isExpiringSoon = daysRemaining <= 45;

                    const vehicleTheme = getVehicleTheme(vehicle.vehicleType || "car");

                    let statusBadgeClass = "bg-slate-100 text-slate-700 border-slate-200";
                    let statusText = `Expiring in ${daysRemaining}d`;
                    let statusBorderAccent = "border-l-slate-300";

                    if (isPaid) {
                      statusBadgeClass = "bg-emerald-50 text-emerald-800 border-emerald-200";
                      statusText = "Fully Settled";
                      statusBorderAccent = "border-l-emerald-500";
                    } else if (isPartial) {
                      statusBadgeClass = "bg-amber-50 text-amber-800 border-amber-200";
                      statusText = "Partially Paid";
                      statusBorderAccent = "border-l-teal-500";
                    } else if (hasQuote) {
                      statusBadgeClass = "bg-blue-50 text-blue-800 border-blue-200";
                      statusText = `Quote Ready (${daysRemaining}d left)`;
                      statusBorderAccent = "border-l-blue-500";
                    } else if (isExpiringSoon) {
                      statusBadgeClass = "bg-rose-50 text-rose-800 border-rose-200 font-black";
                      statusText = daysRemaining <= 0 ? "Expired Policy" : `Expiring in ${daysRemaining}d`;
                      statusBorderAccent = "border-l-rose-500";
                    }

                    return (
                      <div
                        key={`${vehicle.numberPlate || "v"}-${idx}`}
                        onClick={() => handleOpenDetails(item)}
                        className={`bg-white border-l-4 ${statusBorderAccent} border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex flex-col lg:grid lg:grid-cols-[minmax(220px,2.1fr)_minmax(130px,1.1fr)_minmax(130px,1.1fr)_minmax(190px,1.6fr)_minmax(150px,1.3fr)_minmax(130px,1.1fr)_minmax(160px,1.3fr)] lg:items-center gap-4 transition-all duration-200 shadow-xs hover:shadow-md hover:border-slate-300 relative group cursor-pointer`}
                      >
                        {/* Col 1: Vehicle & Model */}
                        <div className="flex items-center gap-3.5 min-w-0">
                          {getVehicleIconContainer(vehicle.vehicleType || "car", "w-11 h-11 rounded-2xl")}
                          <div className="min-w-0 flex-1">
                            <h4 className="font-extrabold text-slate-900 text-sm leading-snug truncate group-hover:text-blue-700 transition-colors">
                              {vehicle.company || "Vehicle"} {vehicle.model || ""}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                {vehicle.year || "N/A"}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${vehicleTheme.badge}`}>
                                {vehicle.vehicleType || "Vehicle"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Col 2: Vehicle Number Plate */}
                        <div>
                          <div className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
                            <span className="font-mono font-black text-slate-900 text-xs tracking-wider">
                              {vehicle.numberPlate || "UNREGISTERED"}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleCopyPlate(vehicle.numberPlate || "", e)}
                              title="Copy Plate"
                              className="text-slate-400 hover:text-slate-700 transition-colors"
                            >
                              <HugeiconsIcon icon={Copy01Icon} className="w-3 h-3" />
                            </button>
                          </div>
                          {copiedPlate === vehicle.numberPlate && (
                            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">Copied!</span>
                          )}
                        </div>

                        {/* Col 3: Policy Number */}
                        <div className="min-w-0">
                          <span className="text-[11px] font-mono font-bold text-slate-700 block truncate">
                            {vehicle.policyNumber || "N/A"}
                          </span>
                        </div>

                        {/* Col 4: Policyholder (Owner) */}
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 text-xs truncate flex items-center gap-1.5">
                            <HugeiconsIcon icon={UserIcon} className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{owner.name || "Unknown Policyholder"}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 truncate">
                            NIC: {owner.nic || "N/A"} {owner.mobile ? `• ${owner.mobile}` : ""}
                          </div>
                        </div>

                        {/* Col 5: Expiration Status */}
                        <div>
                          <div className="font-bold text-slate-900 text-xs">
                            {safeFormatDate(vehicle.calculatedExpiryDate)}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${statusBadgeClass}`}>
                              {statusText}
                            </span>
                            {item.latestPaymentDate && (
                              <span className="text-[10px] text-emerald-600 font-semibold block">
                                Paid {safeFormatDate(item.latestPaymentDate, { month: "short", day: "numeric" })}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Col 6: Renewal Fee */}
                        <div>
                          {hasQuote ? (
                            <div>
                              <span className="font-black text-xs text-emerald-600 block">
                                LKR {safeCurrency(quote?.calculation?.totalRenewalAmount)}
                              </span>
                              <span className="text-[10px] text-slate-400 block font-medium">
                                {isPaid ? "Settled" : isPartial ? quote?.selectedPlan || "Installments" : "Calculated"}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              Needs Quote
                            </span>
                          )}
                        </div>

                        {/* Col 7: Actions */}
                        <div className="text-right flex items-center justify-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetails(item);
                            }}
                            className={`${
                              isPaid || isPartial
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : hasQuote
                                ? "bg-[#0D2A3A] hover:bg-[#1C4258] text-white"
                                : "bg-[#041215] hover:bg-[#0A242E] text-white"
                            } font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5 active:scale-95 whitespace-nowrap`}
                          >
                            <HugeiconsIcon icon={isPaid || isPartial ? ViewIcon : Money01Icon} className="w-3.5 h-3.5" />
                            <span>
                              {isPaid || isPartial
                                ? "View Plan"
                                : hasQuote
                                ? "Review Quote"
                                : "Calculate Quote"}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Summary Footer */}
                  <div className="px-6 py-4 bg-white border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 shadow-2xs">
                    <span className="font-semibold text-slate-700">
                      Showing {filteredVehicles.length} of {vehicles.length} branch vehicles
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Click any vehicle card to review policy specifications or calculate renewal quotes
                    </span>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* ── POPUP MODAL: Vehicle & Renewal Details with Safe Form ── */}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] shadow-2xl flex flex-col border border-slate-200 my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-slate-50/70">
              <div className="flex items-center gap-3.5">
                {getVehicleIconContainer(selectedItem.vehicle?.vehicleType || "car", "w-11 h-11 rounded-2xl")}
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    {selectedItem.vehicle?.company || "Vehicle"} {selectedItem.vehicle?.model || ""}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-medium">
                    <span>Plate: <strong className="text-slate-900">{selectedItem.vehicle?.numberPlate}</strong></span>
                    <span>•</span>
                    <span>Policy: <strong className="text-slate-900">{selectedItem.vehicle?.policyNumber || "N/A"}</strong></span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-light w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200/60 transition-all cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Owner Information Section */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/70">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <HugeiconsIcon icon={UserIcon} className="w-3.5 h-3.5 text-slate-400" />
                  Owner Information
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Full Name</span>
                    <span className="font-bold text-slate-900">{selectedItem.owner?.name || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">NIC Number</span>
                    <span className="font-bold text-slate-900">{selectedItem.owner?.nic || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Contact Mobile</span>
                    <span className="font-bold text-slate-900">{selectedItem.owner?.mobile || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Email Address</span>
                    <span className="font-bold text-slate-900 truncate block">{selectedItem.owner?.email || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">City & Address</span>
                    <span className="font-semibold text-slate-800 truncate block">
                      {selectedItem.owner?.city || selectedItem.owner?.address || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Branch Link</span>
                    <span className="font-bold text-slate-900">{selectedItem.owner?.branch || branch}</span>
                  </div>
                </div>
              </div>

              {/* Vehicle Specifications Section */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/70">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <HugeiconsIcon icon={Car01Icon} className="w-3.5 h-3.5 text-slate-400" />
                  Vehicle Specifications
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Make & Model</span>
                    <span className="font-bold text-slate-900">{selectedItem.vehicle?.company} {selectedItem.vehicle?.model}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Registration Year</span>
                    <span className="font-bold text-slate-900">{selectedItem.vehicle?.year || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Vehicle Category</span>
                    <span className="font-bold text-slate-900">{selectedItem.vehicle?.vehicleType || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Engine Number</span>
                    <span className="font-mono text-slate-800">{selectedItem.vehicle?.engineNumber || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Chassis Number</span>
                    <span className="font-mono text-slate-800">{selectedItem.vehicle?.chassisNumber || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Policy Expiration</span>
                    <span className="font-black text-emerald-700">
                      {safeFormatDate(selectedItem.vehicle?.calculatedExpiryDate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* RENEWAL PAYMENT & INSTALLMENT OVERVIEW CARD */}
              {selectedItem.renewalQuote && (
                <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4.5 select-none space-y-3.5">
                  {/* Plan Type & Status Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/90 px-2.5 py-0.5 rounded-full inline-block">
                          {selectedItem.renewalQuote.selectedPlan || "Renewal Assessment"}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-block ${
                            selectedItem.renewalQuote.status === "Fully_Paid"
                              ? "bg-emerald-100 text-emerald-800"
                              : selectedItem.renewalQuote.status === "Partially_Paid"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {selectedItem.renewalQuote.status === "Fully_Paid"
                            ? "Fully Paid"
                            : selectedItem.renewalQuote.status === "Partially_Paid"
                            ? "Partially Paid (Active Installments)"
                            : "Quote Calculated (Pending Payment)"}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm mt-1">
                        Policy Renewal Payment & Installment Details
                      </h4>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Total Policy Premium</span>
                      <strong className="text-base font-black text-slate-900">
                        LKR {safeCurrency(selectedItem.renewalQuote.calculation?.totalRenewalAmount)}
                      </strong>
                    </div>
                  </div>

                  {/* Financial Summary 3-Box Bar */}
                  <div className="grid grid-cols-3 gap-2 bg-white p-3 rounded-xl border border-slate-200/70 text-center">
                    <div className="border-r border-slate-100 pr-1">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Settled</span>
                      <strong className="font-black text-emerald-600 text-xs">
                        LKR {safeCurrency(
                          selectedItem.renewalQuote.installments
                            ?.filter((i) => i.status === "Paid")
                            .reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
                        )}
                      </strong>
                    </div>
                    <div className="border-r border-slate-100 pr-1">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Outstanding Balance</span>
                      <strong className="font-black text-amber-700 text-xs">
                        LKR {safeCurrency(
                          selectedItem.renewalQuote.installments
                            ?.filter((i) => i.status === "Pending")
                            .reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
                        )}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Installments Status</span>
                      <strong className="font-bold text-blue-700 text-xs">
                        {selectedItem.renewalQuote.installments?.filter((i) => i.status === "Paid").length || 0} of {selectedItem.renewalQuote.installments?.length || 0} Settled
                      </strong>
                    </div>
                  </div>

                  {/* Itemized Installment Table */}
                  {Array.isArray(selectedItem.renewalQuote.installments) && selectedItem.renewalQuote.installments.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                        <span>Installment Schedule & Transactions</span>
                        <span className="text-slate-400 font-normal lowercase">{selectedItem.renewalQuote.selectedPlan}</span>
                      </h5>

                      <div className="space-y-1.5">
                        {selectedItem.renewalQuote.installments.map((inst, idx) => {
                          const isInstPaid = inst.status === "Paid";
                          return (
                            <div
                              key={inst._id || idx}
                              className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                                isInstPaid ? "bg-emerald-50/70 border-emerald-200" : "bg-white border-slate-200/80"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                    isInstPaid ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                                  }`}
                                >
                                  {isInstPaid ? "✓" : inst.installmentNumber || idx + 1}
                                </span>
                                <div>
                                  <h6 className="font-bold text-slate-800 text-xs leading-tight">
                                    {inst.label || `Installment #${inst.installmentNumber || idx + 1}`}
                                  </h6>
                                  <p className="text-[10px] text-slate-500 mt-0.5">
                                    {isInstPaid ? (
                                      <span className="text-emerald-700 font-medium">
                                        Paid {safeFormatDate(inst.paidAt)}
                                        {inst.stripeSessionId ? ` • Stripe: ${inst.stripeSessionId.slice(0, 16)}...` : " • Verified"}
                                      </span>
                                    ) : (
                                      <span>Due: <strong className="text-slate-700">{safeFormatDate(inst.dueDate)}</strong></span>
                                    )}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right flex items-center gap-2">
                                <strong className="text-slate-800 text-xs">LKR {safeCurrency(inst.amount)}</strong>
                                <span
                                  className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                    isInstPaid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {isInstPaid ? "Paid" : "Pending"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Calculation Basis Breakdown */}
                  <div className="bg-white rounded-xl p-3 border border-slate-200/70 text-xs text-slate-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Assessed Vehicle Valuation:</span>
                      <span className="font-semibold text-slate-800">LKR {safeCurrency(selectedItem.renewalQuote.calculation?.marketValuation)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Basic Premium Rate:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedItem.renewalQuote.calculation?.basicPremiumRate || 1.2}% (LKR {safeCurrency(selectedItem.renewalQuote.calculation?.basicPremium)})
                      </span>
                    </div>
                    <div className="flex justify-between text-emerald-600">
                      <span>No-Claim Bonus Discount ({selectedItem.renewalQuote.calculation?.noClaimBonusDiscount || 0}%):</span>
                      <span className="font-semibold">- LKR {safeCurrency(selectedItem.renewalQuote.calculation?.discountAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Admin Fees & Road Levies:</span>
                      <span className="font-semibold text-slate-800">
                        + LKR {safeCurrency((selectedItem.renewalQuote.calculation?.adminFee || 0) + (selectedItem.renewalQuote.calculation?.govtTaxes || 0))}
                      </span>
                    </div>
                    <div className="border-t border-slate-100 pt-1.5 flex justify-between font-bold text-slate-800">
                      <span>Assessment Performed By:</span>
                      <span>{selectedItem.renewalQuote.calculatedBy?.staffName || "Branch Staff"}</span>
                    </div>
                  </div>

                  {/* Automated Email Dispatch Status & Resend Button */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-slate-100 select-none">
                    <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                      <HugeiconsIcon icon={Mail01Icon} className="w-4 h-4 text-slate-400" />
                      <span>Email linked to: <strong className="text-slate-700">{selectedItem.owner?.email || "Policyholder"}</strong> & <strong>{branch} Branch</strong></span>
                    </span>
                    <button
                      onClick={() => handleSendReminder(selectedItem.vehicle?.numberPlate)}
                      disabled={isSendingReminder}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer border border-slate-200 transition-all disabled:opacity-50"
                    >
                      <HugeiconsIcon icon={Mail01Icon} className="w-3.5 h-3.5 text-blue-600" />
                      <span>{isSendingReminder ? "Sending..." : "Resend Email Notice"}</span>
                    </button>
                  </div>
                  {reminderStatus && (
                    <div className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 animate-in fade-in">
                      {reminderStatus}
                    </div>
                  )}
                </div>
              )}

              {/* Calculation Toggle Button */}
              <button
                onClick={() => setShowCalculationDropdown(!showCalculationDropdown)}
                className="w-full bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 rounded-2xl p-4 flex items-center justify-between transition-all cursor-pointer font-bold text-sm shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <HugeiconsIcon icon={Money01Icon} className="w-5 h-5 text-blue-600" />
                  <span>
                    {selectedItem.renewalQuote
                      ? "Edit Vehicle Renewal License Cost Calculation"
                      : "Calculate Vehicle Renewal License Cost"}
                  </span>
                </div>
                <HugeiconsIcon
                  icon={showCalculationDropdown ? ArrowUp01Icon : ArrowDown01Icon}
                  className="w-5 h-5 text-blue-600"
                />
              </button>

              {/* DROPDOWN: Calculation Form */}
              {showCalculationDropdown && (
                <div className="bg-white rounded-2xl border border-blue-200 p-5 space-y-4 shadow-sm">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    License Renewal Premium & Installment Setup
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">
                        Current Policy Expiration Date
                      </label>
                      <input
                        type="date"
                        value={customExpiryDate}
                        onChange={(e) => setCustomExpiryDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 font-medium text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">
                        Vehicle Market Valuation (LKR)
                      </label>
                      <input
                        type="number"
                        value={marketValuation}
                        onChange={(e) => setMarketValuation(Number(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">
                        Basic Premium Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={premiumRate}
                        onChange={(e) => setPremiumRate(Number(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">
                        No-Claim Bonus (NCB) Discount (%)
                      </label>
                      <input
                        type="number"
                        value={ncbDiscount}
                        onChange={(e) => setNcbDiscount(Number(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">
                        Admin Fee + Road Levies (LKR)
                      </label>
                      <input
                        type="number"
                        value={adminFee}
                        onChange={(e) => setAdminFee(Number(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
                      />
                    </div>
                  </div>

                  {/* Allow Installment Checkbox */}
                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="allowInstallmentCheck"
                      checked={allowInstallments}
                      onChange={(e) => setAllowInstallments(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded-md cursor-pointer"
                    />
                    <label htmlFor="allowInstallmentCheck" className="text-xs font-semibold text-slate-700 cursor-pointer">
                      Allow Policy Holder to pay in Installments (2-Part or 4-Part Quarterly)
                    </label>
                  </div>

                  {/* Breakdown Summary Box */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Basic Calculated Premium:</span>
                      <span className="font-semibold">LKR {safeCurrency(computedBasic)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600">
                      <span>NCB Discount ({ncbDiscount}%):</span>
                      <span className="font-semibold">- LKR {safeCurrency(computedDiscount)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Admin & Processing Fee:</span>
                      <span className="font-semibold">+ LKR {safeCurrency(adminFee)}</span>
                    </div>
                    <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-black text-[#102A43]">
                      <span>Total Renewal License Cost:</span>
                      <span className="text-base text-blue-700">LKR {safeCurrency(computedTotal)}</span>
                    </div>
                    {allowInstallments && (
                      <div className="text-[11px] text-slate-500 pt-1">
                        Optional 2 installments: <strong>LKR {safeCurrency(Math.round(computedTotal / 2))} x 2</strong>
                      </div>
                    )}
                  </div>

                  {/* Messages */}
                  {calcSuccessMsg && (
                    <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs flex items-center gap-2">
                      <HugeiconsIcon icon={Tick01Icon} className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>{calcSuccessMsg}</span>
                    </div>
                  )}
                  {calcErrMsg && (
                    <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs flex items-center gap-2">
                      <HugeiconsIcon icon={Alert02Icon} className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      <span>{calcErrMsg}</span>
                    </div>
                  )}

                  {/* Submit Quote Button */}
                  <button
                    onClick={handleConfirmCalculation}
                    disabled={isSubmittingQuote}
                    className="w-full bg-[#041215] hover:bg-[#0A242E] disabled:bg-slate-400 text-white font-bold text-xs py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                  >
                    {isSubmittingQuote ? (
                      <>
                        <HugeiconsIcon icon={Loading03Icon} className="w-4 h-4 animate-spin" />
                        Saving Calculation...
                      </>
                    ) : (
                      <>
                        <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4 text-emerald-400" />
                        Confirm & Save Renewal Calculation
                      </>
                    )}
                  </button>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end flex-shrink-0">
              <button
                onClick={() => setSelectedItem(null)}
                className="bg-[#041215] hover:bg-[#0A242E] text-white text-xs font-semibold px-6 py-2.5 rounded-full transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
