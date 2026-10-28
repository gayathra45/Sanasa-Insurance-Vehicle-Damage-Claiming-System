"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminNavbar from "@/app/Components/Admin/Navbar";
import { API_URL } from "@/app/config";
import UserAvatarDropdown from "@/app/Components/UserAvatarDropdown";
import SimpleLoader from "@/app/Components/SimpleLoader";
import { getVehicleIconContainer, getVehicleIconSvg } from "@/app/Components/VehicleIcon";
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
  BubbleChatIcon,
  ViewIcon,
  Car01Icon,
  Clock01Icon,
  Mail01Icon,
  Download01Icon,
  Building01Icon,
  Cancel01Icon,
  RefreshIcon
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
  const router = useRouter();
  const [selectedBranch, setSelectedBranch] = useState("All");
  const [adminInfo, setAdminInfo] = useState<{ id?: string; name?: string; email?: string } | null>(null);
  const [vehicles, setVehicles] = useState<VehicleRenewalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"expiring_soon" | "paid" | "all">("expiring_soon");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState("all");

  // Detail & Calculation Modal State
  const [selectedItem, setSelectedItem] = useState<VehicleRenewalItem | null>(null);
  const [showCalculationDropdown, setShowCalculationDropdown] = useState(false);
  const [marketValuation, setMarketValuation] = useState<number>(4500000);
  const [premiumRate, setPremiumRate] = useState<number>(1.2);
  const [ncbDiscount, setNcbDiscount] = useState<number>(10);
  const [adminFee, setAdminFee] = useState<number>(1500);
  const [govtTaxes, setGovtTaxes] = useState<number>(0);
  const [allowInstallments, setAllowInstallments] = useState<boolean>(true);
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);
  const [calcSuccessMsg, setCalcSuccessMsg] = useState("");
  const [calcErrMsg, setCalcErrMsg] = useState("");
  const [customExpiryDate, setCustomExpiryDate] = useState<string>("");
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [reminderStatus, setReminderStatus] = useState("");

  // Check Admin session
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedAdmin = sessionStorage.getItem("logged_in_admin") || localStorage.getItem("admin_user");
      if (savedAdmin) {
        try {
          const parsed = JSON.parse(savedAdmin);
          setAdminInfo({
            id: parsed._id || parsed.id || "admin",
            name: `${parsed.firstName || ""} ${parsed.lastName || ""}`.trim() || parsed.name || "Head Office Admin",
            email: parsed.email
          });
        } catch (e) {
          // silent fallback
        }
      }
    }
  }, []);

  // Send Renewal Reminder Email
  const handleSendReminder = async (vehiclePlate: string) => {
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
      setReminderStatus("✅ Renewal reminder sent to policyholder & branch office!");
      setTimeout(() => setReminderStatus(""), 4500);
    } catch (e: any) {
      setReminderStatus(`❌ ${e.message || "Could not send email."}`);
      setTimeout(() => setReminderStatus(""), 4500);
    } finally {
      setIsSendingReminder(false);
    }
  };

  // Computed live calculation values
  const computedBasic = Math.round((Number(marketValuation) * Number(premiumRate)) / 100);
  const computedDiscount = Math.round((computedBasic * Number(ncbDiscount)) / 100);
  const computedNet = Math.max(0, computedBasic - computedDiscount);
  const computedTotal = Math.round(computedNet + Number(govtTaxes) + Number(adminFee));

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

  // Open modal and prefill defaults
  const handleOpenDetails = (item: VehicleRenewalItem) => {
    setSelectedItem(item);
    setShowCalculationDropdown(false);
    setCalcSuccessMsg("");
    setCalcErrMsg("");

    const initialExp = item.vehicle.calculatedExpiryDate
      ? new Date(item.vehicle.calculatedExpiryDate).toISOString().split("T")[0]
      : "";
    setCustomExpiryDate(initialExp);

    if (item.renewalQuote?.calculation) {
      const c = item.renewalQuote.calculation;
      setMarketValuation(c.marketValuation || 4500000);
      setPremiumRate(c.basicPremiumRate || 1.2);
      setNcbDiscount(c.noClaimBonusDiscount || 10);
      setAdminFee(c.adminFee || 1500);
      setGovtTaxes(c.govtTaxes || 0);
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
    if (!selectedItem) return;
    setIsSubmittingQuote(true);
    setCalcSuccessMsg("");
    setCalcErrMsg("");

    try {
      const res = await fetch(`${API_URL}/renewals/calculate-quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nic: selectedItem.owner.nic,
          vehiclePlate: selectedItem.vehicle.numberPlate,
          marketValuation,
          basicPremiumRate: premiumRate,
          basicPremium: computedBasic,
          noClaimBonusDiscount: ncbDiscount,
          adminFee,
          govtTaxes,
          allowInstallments,
          customExpiryDate: customExpiryDate || undefined,
          staffId: adminInfo?.id || "admin",
          staffName: adminInfo?.name || "System Admin"
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save calculation.");

      setCalcSuccessMsg("Renewal quote activated! Official notification emails dispatched.");

      const updatedQuote = data.renewal;
      setSelectedItem((prev) => (prev ? { ...prev, renewalQuote: updatedQuote } : null));

      setVehicles((prev) =>
        prev.map((v) =>
          v.vehicle.numberPlate === selectedItem.vehicle.numberPlate
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

  // Format currency
  const formatLKR = (amount?: number) => {
    if (amount === undefined || amount === null || isNaN(amount)) return "Rs. 0";
    return `Rs. ${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  // Filtered and Sorted List
  const filteredVehicles = vehicles
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

  // Computed summary statistics
  const expiringSoonCount = vehicles.filter((v) => v.vehicle.isExpiringWithin1AndHalfMonths && !v.isPaid).length;
  const paidCount = vehicles.filter((v) => v.isPaid || (v.renewalQuote && (v.renewalQuote.status === "Partially_Paid" || v.renewalQuote.status === "Fully_Paid"))).length;
  const pendingQuotesCount = vehicles.filter((v) => v.vehicle.isExpiringWithin1AndHalfMonths && !v.renewalQuote && !v.isPaid).length;
  const totalVehiclesCount = vehicles.length;
  const totalRevenueCollected = vehicles.reduce((sum, v) => {
    if (v.isPaid && v.renewalQuote?.calculation?.finalAnnualTotal) {
      return sum + v.renewalQuote.calculation.finalAnnualTotal;
    }
    if (v.renewalQuote?.installments) {
      const paidSum = v.renewalQuote.installments.filter(i => i.status === "Paid").reduce((acc, i) => acc + (i.amount || 0), 0);
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
                  {SRI_LANKA_BRANCHES.filter(b => b !== "All").map((b) => (
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
              {/* Card 1: Expiring in 1.5 Months */}
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
              <div
                className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Collected Revenue
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#000080] flex items-center justify-center border border-blue-200">
                    <HugeiconsIcon icon={Money01Icon} className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-2.5">
                  <span className="text-xl font-black text-slate-900 font-mono block truncate" title={formatLKR(totalRevenueCollected)}>
                    {formatLKR(totalRevenueCollected)}
                  </span>
                  <span className="text-[10px] text-blue-600 font-bold block mt-0.5">
                    Renewal Premiums
                  </span>
                </div>
              </div>

              {/* Card 4: Pending Quotes */}
              <div
                onClick={() => setFilterMode("expiring_soon")}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs cursor-pointer hover:border-blue-300"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Pending Quotes
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
                    <HugeiconsIcon icon={File01Icon} className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-2.5">
                  <span className="text-2xl font-black text-slate-900 font-mono block">
                    {loading ? "..." : pendingQuotesCount}
                  </span>
                  <span className="text-[10px] text-indigo-600 font-bold block mt-0.5">
                    Awaiting Calculation
                  </span>
                </div>
              </div>

              {/* Card 5: Total Insured Fleet */}
              <div
                onClick={() => setFilterMode("all")}
                className={`group bg-white rounded-2xl p-4 border transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md relative overflow-hidden ${
                  filterMode === "all"
                    ? "border-sky-500 ring-2 ring-sky-500/20 bg-sky-50/20"
                    : "border-slate-200/80 hover:border-sky-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Monitored Fleet
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
                    <HugeiconsIcon icon={Car01Icon} className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-2.5">
                  <span className="text-2xl font-black text-slate-900 font-mono block">
                    {loading ? "..." : totalVehiclesCount}
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold block mt-0.5">
                    Total Monitored
                  </span>
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <HugeiconsIcon icon={Search01Icon} className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by vehicle number, owner, NIC, model, branch..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800 font-medium"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Vehicle Type Filter */}
                <select
                  value={vehicleTypeFilter}
                  onChange={(e) => setVehicleTypeFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white focus:outline-none"
                >
                  <option value="all">All Vehicle Types</option>
                  <option value="Car">Motor Car / Sedan</option>
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

            {/* Content List / Vehicle Cards */}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredVehicles.map((item, idx) => {
                  const v = item.vehicle;
                  const o = item.owner;
                  const q = item.renewalQuote;
                  const isExpSoon = v.isExpiringWithin1AndHalfMonths && !item.isPaid;
                  const isPaid = item.isPaid || (q && (q.status === "Partially_Paid" || q.status === "Fully_Paid"));

                  const totalAnnual = q?.calculation?.finalAnnualTotal || q?.calculation?.totalRenewalAmount;
                  const paidInstCount = q?.installments?.filter((i) => i.status === "Paid").length || 0;
                  const totalInstCount = q?.installments?.length || 0;

                  return (
                    <div
                      key={idx}
                      className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group hover:border-slate-300"
                    >
                      <div>
                        {/* Card Header: Vehicle Icon + Plate + Days Badge */}
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 shadow-2xs group-hover:scale-105 transition-transform">
                              <span className="w-6 h-6 flex items-center justify-center">
                                {getVehicleIconSvg(v.vehicleType, "w-6 h-6 text-slate-700")}
                              </span>
                            </div>
                            <div>
                              <h3 className="text-base font-black text-slate-900 tracking-tight font-mono">
                                {v.numberPlate}
                              </h3>
                              <p className="text-xs text-slate-500 font-semibold truncate max-w-[170px]">
                                {v.company} {v.model} &bull; {v.year || "2024"}
                              </p>
                            </div>
                          </div>

                          {/* Expiry Badge */}
                          <div className="text-right">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Active
                              </span>
                            ) : isExpSoon ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                                {v.daysRemaining} Days
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                                {v.daysRemaining > 0 ? `${v.daysRemaining} Days` : "Expired"}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Owner & Policy Info */}
                        <div className="bg-slate-50 rounded-2xl p-3.5 space-y-2 mb-4 text-xs border border-slate-100">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Policyholder</span>
                            <span className="font-bold text-slate-800 truncate max-w-[160px]">{o.name}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">NIC / Mobile</span>
                            <span className="font-mono text-slate-600">{o.nic} &bull; {o.mobile}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Branch Office</span>
                            <span className="font-bold text-[#000080] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                              {o.branch} Branch
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Expiry Date</span>
                            <span className="font-semibold text-slate-700">{formatDate(v.calculatedExpiryDate)}</span>
                          </div>
                        </div>

                        {/* Quote Status & Calculated Price */}
                        <div className="mb-4">
                          {q && totalAnnual ? (
                            <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-3 flex items-center justify-between">
                              <div>
                                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                                  {isPaid ? "Renewed Coverage Total" : "Calculated Renewal Quote"}
                                </span>
                                <span className="text-base font-black text-emerald-900 font-mono block">
                                  {formatLKR(totalAnnual)}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-[11px] font-bold text-slate-600 block">
                                  {q.paymentPlanType || "Annual Plan"}
                                </span>
                                {totalInstCount > 0 && (
                                  <span className="text-[10px] text-slate-500 font-medium block">
                                    {paidInstCount}/{totalInstCount} Paid
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-3 flex items-center justify-between">
                              <div>
                                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                                  Valuation Needed
                                </span>
                                <span className="text-xs text-amber-700 font-semibold block mt-0.5">
                                  Pending quote setup
                                </span>
                              </div>
                              <span className="text-xs font-bold text-amber-600 bg-amber-100/70 px-2.5 py-1 rounded-full">
                                Pending
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenDetails(item)}
                            className="flex-1 py-2 px-3 bg-[#000080] hover:bg-[#102A43] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer border-none active:scale-95"
                          >
                            <HugeiconsIcon icon={Money01Icon} className="w-3.5 h-3.5" />
                            <span>{q ? "Review Quote & Plan" : "Calculate Quote"}</span>
                          </button>

                          <button
                            onClick={() => handleSendReminder(v.numberPlate)}
                            disabled={isSendingReminder}
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer border-none flex items-center justify-center"
                            title="Send Notification Email to Client & Branch"
                          >
                            <HugeiconsIcon icon={Mail01Icon} className="w-4 h-4" />
                          </button>
                        </div>

                        {reminderStatus && (
                          <div className="text-[11px] text-center font-bold text-blue-700 bg-blue-50 py-1 rounded-lg">
                            {reminderStatus}
                          </div>
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

      {/* Quote Calculation & Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-[#000080] flex items-center justify-center shadow-xs">
                  <HugeiconsIcon icon={Money01Icon} className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Policy Renewal Valuation & Quote Setup
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
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* Vehicle & Owner Header Card */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Owner</span>
                  <span className="font-bold text-slate-800 block text-xs mt-0.5">{selectedItem.owner.name}</span>
                  <span className="text-[11px] text-slate-500">{selectedItem.owner.nic}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Vehicle</span>
                  <span className="font-bold text-slate-800 block text-xs mt-0.5">{selectedItem.vehicle.company} {selectedItem.vehicle.model}</span>
                  <span className="font-mono text-[11px] text-slate-500">{selectedItem.vehicle.numberPlate}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Branch & Expiry</span>
                  <span className="font-bold text-[#000080] block text-xs mt-0.5">{selectedItem.owner.branch} Branch</span>
                  <span className="text-[11px] text-slate-500">{formatDate(selectedItem.vehicle.calculatedExpiryDate)}</span>
                </div>
              </div>

              {/* Status Alerts */}
              {calcSuccessMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl font-medium flex items-center gap-2">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4 text-emerald-600" />
                  <span>{calcSuccessMsg}</span>
                </div>
              )}
              {calcErrMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl font-medium flex items-center gap-2">
                  <HugeiconsIcon icon={Alert02Icon} className="w-4 h-4 text-red-600" />
                  <span>{calcErrMsg}</span>
                </div>
              )}

              {/* Calculation Form Fields */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Valuation & Premium Variables
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Current Market Valuation (LKR)
                    </label>
                    <input
                      type="number"
                      value={marketValuation}
                      onChange={(e) => setMarketValuation(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Basic Premium Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={premiumRate}
                      onChange={(e) => setPremiumRate(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      No-Claim Bonus (NCB) Discount (%)
                    </label>
                    <input
                      type="number"
                      value={ncbDiscount}
                      onChange={(e) => setNcbDiscount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Custom Extended Expiry Date
                    </label>
                    <input
                      type="date"
                      value={customExpiryDate}
                      onChange={(e) => setCustomExpiryDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                </div>

                {/* Live Computed Breakdown */}
                <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-2.5">
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Basic Premium:</span>
                    <span className="font-mono">{formatLKR(computedBasic)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span>NCB Discount ({ncbDiscount}%):</span>
                    <span className="font-mono text-emerald-400">- {formatLKR(computedDiscount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Net Basic Premium:</span>
                    <span className="font-mono">{formatLKR(computedNet)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Admin Fees & Taxes:</span>
                    <span className="font-mono">{formatLKR(adminFee + govtTaxes)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm font-black">
                    <span className="text-white">Final Annual Total:</span>
                    <span className="text-emerald-400 font-mono text-base">{formatLKR(computedTotal)}</span>
                  </div>
                </div>

                {/* Installments Options */}
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={allowInstallments}
                      onChange={(e) => setAllowInstallments(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span className="text-xs font-bold text-slate-800">
                      Offer Flexible Installment Plans (Quarterly, Half-Yearly, Monthly)
                    </span>
                  </label>
                </div>
              </div>

              {/* Installment Tracker if already exists */}
              {selectedItem.renewalQuote?.installments && selectedItem.renewalQuote.installments.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Active Payment Installments Audit
                  </h4>
                  <div className="space-y-2">
                    {selectedItem.renewalQuote.installments.map((inst, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                        <div>
                          <span className="font-bold text-slate-800 block">{inst.label}</span>
                          <span className="text-[11px] text-slate-400">Due: {formatDate(inst.dueDate)}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-black font-mono text-slate-900 block">{formatLKR(inst.amount)}</span>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            inst.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
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

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSendReminder(selectedItem.vehicle.numberPlate)}
                  disabled={isSendingReminder}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border-none"
                >
                  <HugeiconsIcon icon={Mail01Icon} className="w-4 h-4 text-slate-600" />
                  <span>Send Notification Email</span>
                </button>

                <button
                  onClick={handleConfirmCalculation}
                  disabled={isSubmittingQuote}
                  className="px-5 py-2 bg-[#000080] hover:bg-[#102A43] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border-none shadow-xs disabled:opacity-50"
                >
                  {isSubmittingQuote ? (
                    <>
                      <HugeiconsIcon icon={Loading03Icon} className="w-4 h-4 animate-spin text-white" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <HugeiconsIcon icon={Tick01Icon} className="w-4 h-4 text-white" />
                      <span>Save & Activate Quote</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
