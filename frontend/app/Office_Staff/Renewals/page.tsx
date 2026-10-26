"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import OfficeStaffNavbar from "@/app/Components/Office_Staff/Navbar";
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
  Money01Icon
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
  };
  selectedPlan?: string;
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
}

interface VehicleRenewalItem {
  owner: VehicleOwner;
  vehicle: ExpiringVehicle;
  renewalQuote: RenewalQuote | null;
}

export default function OfficeStaffRenewalsPage() {
  const router = useRouter();
  const [branch, setBranch] = useState("Galle");
  const [staffInfo, setStaffInfo] = useState<{ id?: string; name?: string; email?: string } | null>(null);
  const [vehicles, setVehicles] = useState<VehicleRenewalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"expiring_soon" | "all">("expiring_soon");

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

  // Computed live calculation values
  const computedBasic = Math.round((Number(marketValuation) * Number(premiumRate)) / 100);
  const computedDiscount = Math.round((computedBasic * Number(ncbDiscount)) / 100);
  const computedNet = Math.max(0, computedBasic - computedDiscount);
  const computedTotal = Math.round(computedNet + Number(govtTaxes) + Number(adminFee));

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
  const loadVehicles = useCallback(async (currentBranch: string, mode: "expiring_soon" | "all") => {
    try {
      setLoading(true);
      setError("");
      const isAll = mode === "all";
      const res = await fetch(
        `${API_URL}/renewals/branch-expiring-vehicles?branch=${encodeURIComponent(currentBranch)}&all=${isAll}`
      );
      if (!res.ok) throw new Error("Failed to load branch expiring vehicles.");
      const data = await res.json();
      setVehicles(data.vehicles || []);
    } catch (err: any) {
      console.error("Error loading vehicles:", err);
      setError(err.message || "Failed to load branch vehicles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (branch) {
      loadVehicles(branch, filterMode);
    }
  }, [branch, filterMode, loadVehicles]);

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
          staffId: staffInfo?.id || "",
          staffName: staffInfo?.name || "Staff Member"
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save calculation.");

      setCalcSuccessMsg("Renewal cost & installment options calculated and saved successfully!");

      // Update in-memory item
      const updatedQuote = data.renewal;
      setSelectedItem((prev) => (prev ? { ...prev, renewalQuote: updatedQuote } : null));

      // Update in vehicle list
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

  // Filtered List
  const filteredVehicles = vehicles.filter((v) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      v.vehicle.numberPlate?.toLowerCase().includes(q) ||
      v.vehicle.model?.toLowerCase().includes(q) ||
      v.vehicle.company?.toLowerCase().includes(q) ||
      v.vehicle.policyNumber?.toLowerCase().includes(q) ||
      v.owner.name?.toLowerCase().includes(q) ||
      v.owner.nic?.toLowerCase().includes(q)
    );
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  return (
    <div className="flex h-screen bg-[#F0F4F8] font-sans antialiased text-slate-800 overflow-hidden">
      {/* Office Staff Navbar */}
      <OfficeStaffNavbar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Navbar */}
        <header className="h-18 bg-white border-b border-slate-200/80 px-6 sm:px-8 flex items-center justify-between z-10 flex-shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("open-mobile-menu"))}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 focus:outline-none"
            >
              <HugeiconsIcon icon={Menu01Icon} className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
              <h1 className="text-xl font-bold text-[#102A43] tracking-tight">Policy Renewals Management</h1>
              <span className="hidden md:inline-block text-xs bg-blue-50 text-blue-700 font-semibold px-2.5 py-1 rounded-full border border-blue-200">
                {branch} Branch
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <UserAvatarDropdown userType="office_staff" />
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Page Header Card */}
            <div className="bg-gradient-to-r from-[#102A43] to-[#204060] rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight">Vehicle Policy Coverage Renewals</h2>
                <p className="text-blue-100 text-sm mt-1">
                  Inspect upcoming policy expirations (next 1.5 months), calculate renewal licenses, and setup installment options for policyholders.
                </p>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10">
                <HugeiconsIcon icon={Calendar01Icon} className="w-5 h-5 text-blue-300" />
                <span className="text-xs font-medium text-blue-100">
                  Target Range: <strong className="text-white">Next 45 Days (1.5 Months)</strong>
                </span>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-96">
                <HugeiconsIcon icon={Search01Icon} className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by plate, owner, NIC, or policy..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800"
                />
              </div>

              {/* Mode Toggle Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setFilterMode("expiring_soon")}
                  className={`flex-1 sm:flex-initial text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer ${
                    filterMode === "expiring_soon"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Expiring in 1.5 Months ({vehicles.filter((v) => v.vehicle.isExpiringWithin1AndHalfMonths).length})
                </button>
                <button
                  onClick={() => setFilterMode("all")}
                  className={`flex-1 sm:flex-initial text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer ${
                    filterMode === "all"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All Branch Vehicles
                </button>
              </div>
            </div>

            {/* Content List / Cards */}
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <SimpleLoader />
                <p className="text-slate-500 text-sm mt-3">Loading branch vehicle renewal records...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-600">
                <HugeiconsIcon icon={Alert02Icon} className="w-8 h-8 mx-auto mb-2 text-red-500" />
                <p className="font-semibold">{error}</p>
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-xs">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">No Expiring Vehicles Found</h3>
                <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
                  {filterMode === "expiring_soon"
                    ? "There are currently no registered vehicles under this branch scheduled to expire in the next 1.5 months. Switch to 'All Branch Vehicles' to view all registered vehicles."
                    : "No vehicles found matching your search filter."}
                </p>
                {filterMode === "expiring_soon" && (
                  <button
                    onClick={() => setFilterMode("all")}
                    className="mt-4 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-4 py-2 rounded-lg"
                  >
                    View All Branch Vehicles
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-[24px] shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 select-none text-left">
                    <thead className="bg-slate-50/80">
                      <tr>
                        <th className="px-5 py-3.5 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                          Vehicle & Model
                        </th>
                        <th className="px-5 py-3.5 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                          Number Plate
                        </th>
                        <th className="px-5 py-3.5 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                          Policy Number
                        </th>
                        <th className="px-5 py-3.5 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                          Policy Holder (Owner)
                        </th>
                        <th className="px-5 py-3.5 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                          Expiration Date
                        </th>
                        <th className="px-5 py-3.5 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                          Renewal Fee
                        </th>
                        <th className="px-5 py-3.5 text-slate-400 font-semibold text-[11px] uppercase tracking-wider text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredVehicles.map((item, idx) => {
                        const hasQuote = !!item.renewalQuote;
                        const isPaid = item.renewalQuote?.status === "Fully_Paid";
                        const isPartial = item.renewalQuote?.status === "Partially_Paid";

                        return (
                          <tr
                            key={`${item.vehicle.numberPlate}-${idx}`}
                            onClick={() => handleOpenDetails(item)}
                            className="hover:bg-slate-50/60 transition-colors cursor-pointer group"
                          >
                            {/* Col 1: Vehicle & Model */}
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100/80 flex items-center justify-center text-blue-600 shrink-0">
                                  {getVehicleIconSvg(item.vehicle.vehicleType, "w-4 h-4 text-blue-600")}
                                </div>
                                <div>
                                  <h4 className="font-bold text-slate-800 text-sm leading-tight">
                                    {item.vehicle.company} {item.vehicle.model}
                                  </h4>
                                  <span className="text-[11px] text-slate-400">
                                    Year: {item.vehicle.year} | {item.vehicle.vehicleType}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Col 2: Number Plate */}
                            <td className="px-5 py-4 font-bold text-slate-800 tracking-wide text-xs">
                              {item.vehicle.numberPlate}
                            </td>

                            {/* Col 3: Policy Number */}
                            <td className="px-5 py-4 font-semibold text-slate-700 text-xs">
                              {item.vehicle.policyNumber || "N/A"}
                            </td>

                            {/* Col 4: Owner & NIC */}
                            <td className="px-5 py-4">
                              <div className="font-semibold text-slate-800">{item.owner.name}</div>
                              <div className="text-[10px] text-slate-400">
                                NIC: {item.owner.nic} | {item.owner.mobile}
                              </div>
                            </td>

                            {/* Col 5: Expiration Date */}
                            <td className="px-5 py-4">
                              <div className="font-bold text-slate-800">
                                {formatDate(item.vehicle.calculatedExpiryDate)}
                              </div>
                              <span
                                className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                                  isPaid
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : isPartial
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : hasQuote
                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                    : item.vehicle.daysRemaining <= 45
                                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {isPaid
                                  ? "Renewed"
                                  : isPartial
                                  ? "Partially Paid"
                                  : hasQuote
                                  ? "Quote Ready"
                                  : `Expiring in ${item.vehicle.daysRemaining}d`}
                              </span>
                            </td>

                            {/* Col 6: Renewal Fee */}
                            <td className="px-5 py-4">
                              {hasQuote ? (
                                <div>
                                  <span className="font-black text-xs text-emerald-600 block">
                                    LKR {item.renewalQuote?.calculation?.totalRenewalAmount?.toLocaleString()}
                                  </span>
                                  <span className="text-[10px] text-slate-400">Calculated</span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">Not Calculated</span>
                              )}
                            </td>

                            {/* Col 7: Actions */}
                            <td className="px-5 py-4 text-right">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDetails(item);
                                }}
                                className="bg-[#102A43] hover:bg-[#1C3E63] text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5 active:scale-95"
                              >
                                <HugeiconsIcon icon={File01Icon} className="w-3.5 h-3.5" />
                                <span>View & Calculate</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* POPUP MODAL: Vehicle & Owner Full Details with Calculation Dropdown */}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] shadow-2xl flex flex-col border border-slate-200 my-auto overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  {getVehicleIconSvg(selectedItem.vehicle.vehicleType, "w-5 h-5 text-blue-600")}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#102A43]">
                    {selectedItem.vehicle.company} {selectedItem.vehicle.model}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Plate: <strong className="text-slate-800">{selectedItem.vehicle.numberPlate}</strong> | Policy:{" "}
                    {selectedItem.vehicle.policyNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-normal w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200/60 transition-all cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Owner Information Section */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/70">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Owner Details</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Full Name</span>
                    <span className="font-semibold text-slate-800">{selectedItem.owner.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">NIC Number</span>
                    <span className="font-semibold text-slate-800">{selectedItem.owner.nic}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Contact Mobile</span>
                    <span className="font-semibold text-slate-800">{selectedItem.owner.mobile || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Email</span>
                    <span className="font-semibold text-slate-800">{selectedItem.owner.email || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Address</span>
                    <span className="font-semibold text-slate-800">{selectedItem.owner.address || "N/A"}, {selectedItem.owner.city || ""}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Branch</span>
                    <span className="font-semibold text-slate-800">{selectedItem.owner.branch}</span>
                  </div>
                </div>
              </div>

              {/* Vehicle Specifications Section */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/70">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Vehicle Specifications</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Make & Model</span>
                    <span className="font-semibold text-slate-800">{selectedItem.vehicle.company} {selectedItem.vehicle.model}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Registration Year</span>
                    <span className="font-semibold text-slate-800">{selectedItem.vehicle.year}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Vehicle Type</span>
                    <span className="font-semibold text-slate-800">{selectedItem.vehicle.vehicleType}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Engine Number</span>
                    <span className="font-mono text-slate-800">{selectedItem.vehicle.engineNumber || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Chassis Number</span>
                    <span className="font-mono text-slate-800">{selectedItem.vehicle.chassisNumber || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Policy Expiration</span>
                    <span className="font-bold text-rose-600">
                      {formatDate(selectedItem.vehicle.calculatedExpiryDate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Calculation Toggle Button */}
              <button
                onClick={() => setShowCalculationDropdown(!showCalculationDropdown)}
                className="w-full bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 rounded-2xl p-4 flex items-center justify-between transition-all cursor-pointer font-bold text-sm"
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
                        onChange={(e) => setMarketValuation(Number(e.target.value))}
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
                        onChange={(e) => setPremiumRate(Number(e.target.value))}
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
                        onChange={(e) => setNcbDiscount(Number(e.target.value))}
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
                        onChange={(e) => setAdminFee(Number(e.target.value))}
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
                      <span className="font-semibold">LKR {computedBasic.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600">
                      <span>NCB Discount ({ncbDiscount}%):</span>
                      <span className="font-semibold">- LKR {computedDiscount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Admin & Processing Fee:</span>
                      <span className="font-semibold">+ LKR {adminFee.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-black text-[#102A43]">
                      <span>Total Renewal License Cost:</span>
                      <span className="text-base text-blue-700">LKR {computedTotal.toLocaleString()}</span>
                    </div>
                    {allowInstallments && (
                      <div className="text-[11px] text-slate-500 pt-1">
                        Optional 2 installments: <strong>LKR {Math.round(computedTotal / 2).toLocaleString()} x 2</strong>
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
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold text-xs py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                  >
                    {isSubmittingQuote ? (
                      <>
                        <HugeiconsIcon icon={Loading03Icon} className="w-4 h-4 animate-spin" />
                        Saving Calculation...
                      </>
                    ) : (
                      <>
                        <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4" />
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
                className="bg-[#102A43] hover:bg-[#1C3E63] text-white text-xs font-semibold px-6 py-2.5 rounded-full transition-all cursor-pointer"
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
