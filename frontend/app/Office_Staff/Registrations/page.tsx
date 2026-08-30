"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import OfficeStaffNavbar from "@/app/Components/Office Staff/Navbar";
import { API_URL } from "@/app/config";
import UserAvatarDropdown from "@/app/Components/UserAvatarDropdown";

interface Vehicle {
  numberPlate: string;
  vehicleType: string;
  year: string;
  company: string;
  model: string;
  engineNumber: string;
  chassisNumber: string;
  policyNumber: string;
}

interface Registration {
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
  documents?: {
    nicFront?: string;
    nicBack?: string;
    vehicleReg?: string;
    revenueLicense?: string;
  };
  createdAt: string;
}

export default function RegistrationsPage() {
  const router = useRouter();
  const [branch, setBranch] = useState("");
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [customPopup, setCustomPopup] = useState<{
    show: boolean;
    title: string;
    message: string;
    type?: "alert" | "confirm" | "success" | "error";
    onConfirm?: () => void;
  }>({ show: false, title: "", message: "", type: "alert" });

  // Load registrations function
  const loadRegistrations = async (currentBranch: string, silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch(`${API_URL}/office-staff/registrations?branch=${currentBranch}`);
      if (!res.ok) {
        throw new Error("Failed to fetch registrations.");
      }
      const data = await res.json();
      const freshRegs = data.registrations || [];
      setRegistrations(freshRegs);

      // Keep open selected registration updated
      if (selectedReg) {
        const updated = freshRegs.find((r: Registration) => r._id === selectedReg._id);
        if (updated) {
          setSelectedReg(updated);
        }
      }
    } catch (err: any) {
      console.error("Load registrations error:", err);
      if (!silent) setError(err.message || "Failed to load registrations.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    let currentBranch = "";
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

    if (currentBranch) {
      loadRegistrations(currentBranch);
    }
  }, [router]);

  // Poll registrations in background for real-time updates
  useEffect(() => {
    if (!branch) return;
    const pollInterval = setInterval(() => {
      loadRegistrations(branch, true);
    }, 7000);
    return () => clearInterval(pollInterval);
  }, [branch, selectedReg]);

  const [rejectModal, setRejectModal] = useState<{ show: boolean; reg: Registration | null; reason: string }>({ show: false, reg: null, reason: "" });

  const handleStatusUpdate = async (id: string, newStatus: string, reason?: string) => {
    try {
      const targetReg = registrations.find(r => r._id === id);
      const baseUrl = API_URL;
      const res = await fetch(`${baseUrl}/office-staff/registrations/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to update status to ${newStatus}`);
      }
      
      // Remove approved or rejected item from the view
      setRegistrations(prev => prev.filter(r => r._id !== id));
      if (selectedReg && selectedReg._id === id) {
        setSelectedReg(null);
      }

      setCustomPopup({
        show: true,
        title: newStatus === "Approved" ? "Registration Approved" : "Registration Rejected",
        message: `Policyholder registration has been ${newStatus.toLowerCase()}.${data.emailSent && targetReg ? ` Notification email sent to ${targetReg.email}.` : ""}`,
        type: "success"
      });
    } catch (err: any) {
      console.error(err);
      setCustomPopup({ show: true, title: "Error", message: err.message || "Failed to update status.", type: "error" });
    }
  };

  const triggerApprove = (reg: Registration) => {
    setCustomPopup({
      show: true,
      title: "Approve Registration",
      message: `Are you sure you want to approve the registration for ${reg.firstName} ${reg.lastName}? An approval email will be sent to ${reg.email}.`,
      type: "confirm",
      onConfirm: () => handleStatusUpdate(reg._id, "Approved")
    });
  };

  const triggerReject = (reg: Registration) => {
    setRejectModal({ show: true, reg, reason: "" });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${date.getDate().toString().padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`;
    } catch (e) {
      return dateStr;
    }
  };

  const formatPlate = (plate: string) => {
    if (!plate) return "-";
    const cleaned = plate.trim();
    if (cleaned.includes("-")) return cleaned.toUpperCase();
    const m = cleaned.match(/^(.*[A-Za-z]+)(\d+)$/);
    if (m) return `${m[1].trim().toUpperCase()} - ${m[2]}`;
    return cleaned.toUpperCase();
  };

  // Search filtering
  const filteredRegs = registrations.filter(r => {
    const query = searchQuery.toLowerCase();
    const matchesVehicle = r.vehicles?.some(v => 
      v.numberPlate.toLowerCase().includes(query) ||
      v.policyNumber.toLowerCase().includes(query)
    );
    return (
      r.firstName.toLowerCase().includes(query) ||
      r.lastName.toLowerCase().includes(query) ||
      r.nic.toLowerCase().includes(query) ||
      r.referenceNumber.toLowerCase().includes(query) ||
      r.email.toLowerCase().includes(query) ||
      matchesVehicle
    );
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
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-xl font-semibold text-slate-800 flex items-center gap-2 pl-2 lg:pl-0">
                <span className="bg-[#102A43] text-white text-base px-4 py-2 rounded-xl font-black shadow-sm tracking-wide">
                  {branch || "Galle"} Branch
                </span>
                <span className="hidden md:inline text-slate-400 font-medium">— Registrations</span>
              </h1>
            </div>
            
            <div className="flex items-center gap-5">
              {/* Notification Bell Icon */}
              <button className="relative p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer focus:outline-none">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-slate-500 hover:text-slate-800">
                  <path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0 1 13.5 0v.75c0 1.65.342 3.228.96 4.658A1.875 1.875 0 0 1 18 17.25H6a1.875 1.875 0 0 1-1.71-2.842 9.06 9.06 0 0 0 .96-4.658V9ZM12 18.75a2.25 2.25 0 0 1-2.247-2.118.75.75 0 0 1 .746-.757h3a.75.75 0 0 1 .746.757A2.25 2.25 0 0 1 12 18.75Z" clipRule="evenodd" />
                </svg>
              </button>
              {/* User Avatar Icon */}
              <UserAvatarDropdown userType="office_staff" />
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-8 bg-white overflow-y-auto">
            {loading ? (
              <div className="w-full h-full flex flex-col items-center justify-center min-h-[300px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#f59e0b]"></div>
                <span className="mt-4 text-slate-500 font-bold">Loading registrations...</span>
              </div>
            ) : error ? (
              <div className="w-full h-full flex flex-col items-center justify-center min-h-[300px] text-red-500 font-bold bg-red-50 rounded-2xl p-8 border border-red-200">
                <span>{error}</span>
              </div>
            ) : (
              <div className="max-w-6xl mx-auto flex flex-col gap-6">
                
                {/* Title */}
                <div className="flex items-center gap-2 mb-2 select-none">
                  <svg className="w-5 h-5 text-slate-700 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                  <h2 className="text-lg font-black text-slate-800 tracking-wide">
                    Registrations
                  </h2>
                </div>

                {/* Search Bar Row */}
                <div className="mb-2">
                  <div className="relative w-[320px]">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4 text-slate-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name, NIC, plate or ref..."
                      className="w-full pl-10 pr-4 py-3 rounded-full border border-slate-300 text-slate-700 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-transparent transition-all shadow-sm"
                    />
                  </div>
                </div>

                {/* Grid Card Layout */}
                {filteredRegs.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-[20px] p-12 text-center text-slate-400 font-bold select-none shadow-sm">
                    No registrations found matching your query.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {/* Table Header Row */}
                    <div className="hidden md:grid md:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1.0fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,2.2fr)] gap-4 px-5 py-3 text-slate-400 font-extrabold text-[10px] uppercase tracking-wider select-none bg-slate-50 rounded-xl border border-slate-200/60 mb-1 items-center">
                      <div className="flex flex-col select-none min-w-0">Applicant Name</div>
                      <div className="flex flex-col select-none min-w-0">NIC Number</div>
                      <div className="flex flex-col select-none min-w-0">Vehicle Plate</div>
                      <div className="flex flex-col select-none min-w-0">Vehicle Type</div>
                      <div className="flex flex-col select-none min-w-0">Policy Number</div>
                      <div className="flex flex-col select-none min-w-0">Date</div>
                      <div className="flex flex-col select-none min-w-0 text-right">Actions</div>
                    </div>

                    {filteredRegs.map((reg) => (
                      <div
                        key={reg._id}
                        onClick={() => setSelectedReg(reg)}
                        className="bg-white border-l-[6px] border-l-blue-500 bg-gradient-to-r from-blue-50/10 via-transparent to-transparent hover:border-blue-400 border border-slate-200 rounded-xl px-5 py-4 flex flex-col md:grid md:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1.0fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,2.2fr)] md:items-center gap-4 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md relative overflow-hidden group"
                      >
                        {/* Col 1: Applicant Name & Ref */}
                        <div className="flex flex-col min-w-0 select-none">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="w-2 h-2 rounded-full shrink-0 bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.7)]" />
                            <h3 className="font-black text-sm text-slate-800 whitespace-nowrap truncate">
                              {reg.firstName} {reg.lastName}
                            </h3>
                          </div>
                          <span className="text-[9px] text-slate-400 font-black tracking-wider uppercase bg-slate-100 px-2 py-0.5 rounded mt-1.5 w-fit">
                            Ref: {reg.referenceNumber}
                          </span>
                        </div>

                        {/* Col 2: NIC */}
                        <div className="flex flex-col min-w-0 select-none">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1 md:hidden">NIC</span>
                          <span className="text-slate-700 font-semibold text-xs">{reg.nic}</span>
                        </div>

                        {/* Col 3: Vehicle Plate */}
                        <div className="flex flex-col min-w-0 select-none">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1 md:hidden">Vehicle Plate</span>
                          <span className="text-slate-800 font-bold text-xs">
                            {reg.vehicles && reg.vehicles.length > 0 ? formatPlate(reg.vehicles[0].numberPlate) : "-"}
                          </span>
                        </div>

                        {/* Col 4: Vehicle Type */}
                        <div className="flex flex-col min-w-0 select-none">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1 md:hidden">Vehicle Type</span>
                          <span className="text-slate-700 text-xs font-semibold">
                            {reg.vehicles && reg.vehicles.length > 0 ? reg.vehicles[0].vehicleType : "No Vehicle"}
                          </span>
                        </div>

                        {/* Col 5: Policy Number */}
                        <div className="flex flex-col min-w-0 select-none">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1 md:hidden">Policy No.</span>
                          <span className="font-bold text-[#0f2d4a] text-xs">
                            {reg.vehicles && reg.vehicles.length > 0 ? reg.vehicles[0].policyNumber : "-"}
                          </span>
                        </div>

                        {/* Col 6: Date */}
                        <div className="flex flex-col min-w-0 select-none">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1 md:hidden">Date</span>
                          <span className="text-slate-600 text-xs font-semibold">{formatDate(reg.createdAt)}</span>
                        </div>

                        {/* Col 7: Actions */}
                        <div className="flex items-center justify-between md:justify-end gap-2.5 mt-4 md:mt-0 pt-3 md:pt-0 border-t md:border-0 border-slate-100" onClick={(e) => e.stopPropagation()}>
                          <span className="text-blue-500 font-extrabold text-[11px] group-hover:underline md:hidden select-none">
                            View Profile
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => triggerApprove(reg)}
                              className="bg-[#10b981] hover:bg-[#0ea5e9] text-white font-extrabold text-[11px] px-3.5 py-1.5 rounded-lg transition-all cursor-pointer focus:outline-none shadow-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => triggerReject(reg)}
                              className="bg-[#ef4444] hover:bg-[#dc2626] text-white font-extrabold text-[11px] px-3.5 py-1.5 rounded-lg transition-all cursor-pointer focus:outline-none shadow-sm"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => setSelectedReg(reg)}
                              className="border border-slate-300 hover:bg-slate-50 text-slate-600 font-extrabold text-[11px] px-3.5 py-1.5 rounded-lg transition-all cursor-pointer focus:outline-none shadow-sm bg-white"
                            >
                              View
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination (decorative style from image) */}
                <div className="flex items-center justify-end gap-3 mt-4 text-slate-400 font-bold select-none text-sm">
                  <button className="hover:text-slate-600 font-extrabold cursor-pointer">Prev</button>
                  <span className="text-slate-800 font-black">1</span>
                  <button className="hover:text-slate-600 font-extrabold cursor-pointer">Next</button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Floating Action Chat Button */}
      <button className="fixed bottom-24 right-8 w-14 h-14 bg-[#00ddff] hover:bg-[#00cceb] text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer z-50 group">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
          <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75 0 1.776.476 3.44 1.307 4.887L2.14 21.64a.75.75 0 0 0 .935.935l4.753-1.428A9.702 9.702 0 0 0 12 21.75c5.385 0 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-3 9.75a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Zm3.75 0a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Zm3.75 0a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Centered Profile Details Modal */}
      {selectedReg && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white border border-slate-200 rounded-[24px] w-full max-w-[720px] max-h-[90vh] shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col relative transition-all duration-300 overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center px-8 pt-6 pb-4 border-b border-slate-200 flex-shrink-0 select-none">
              <div>
                <h2 className="text-[22px] font-black text-[#0f2d3a] tracking-tight leading-none">
                  {selectedReg.firstName} {selectedReg.lastName}
                </h2>
                <p className="text-xs text-slate-400 font-bold mt-1.5">Ref: {selectedReg.referenceNumber}</p>
              </div>
              <button
                onClick={() => setSelectedReg(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold border-none bg-transparent cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-8 flex-1 overflow-y-auto space-y-6">
              
              {/* Quick Actions banner inside profile view */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center justify-between select-none">
                <span className="text-sm font-extrabold text-slate-700">Quick Actions for this registration:</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => triggerApprove(selectedReg)}
                    className="bg-[#10b981] hover:bg-[#0ea5e9] text-white font-extrabold text-xs px-4 py-3 rounded-lg transition-all cursor-pointer shadow-sm"
                  >
                    Approve Registration
                  </button>
                  <button
                    onClick={() => triggerReject(selectedReg)}
                    className="bg-[#ef4444] hover:bg-[#dc2626] text-white font-extrabold text-xs px-4 py-3 rounded-lg transition-all cursor-pointer shadow-sm"
                  >
                    Reject Registration
                  </button>
                </div>
              </div>

              {/* Personal Details */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 grid grid-cols-2 gap-4 select-none">
                <h3 className="col-span-2 font-black text-slate-800 text-xs tracking-wide uppercase text-amber-500 mb-2">Personal Information</h3>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">NIC Number</span>
                  <span className="text-sm font-extrabold text-slate-700">{selectedReg.nic}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Date of Birth</span>
                  <span className="text-sm font-extrabold text-slate-700">{selectedReg.dob}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Mobile Number</span>
                  <span className="text-sm font-extrabold text-slate-700">{selectedReg.mobile}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Email Address</span>
                  <span className="text-sm font-extrabold text-slate-700 truncate block">{selectedReg.email}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Permanent Address</span>
                  <span className="text-sm font-extrabold text-slate-700 leading-relaxed block">
                    {selectedReg.address}, {selectedReg.city}, {selectedReg.province}
                  </span>
                </div>
              </div>

              {/* Registered Vehicles */}
              <div className="space-y-4 select-none">
                <h3 className="font-black text-slate-800 text-xs tracking-wide uppercase text-amber-500">Registered Vehicles ({selectedReg.vehicles?.length || 0})</h3>
                {selectedReg.vehicles && selectedReg.vehicles.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {selectedReg.vehicles.map((v, idx) => (
                      <div key={idx} className="border border-slate-150 rounded-xl p-5 bg-white shadow-sm flex flex-col gap-3">
                        <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                          <span className="text-sm font-black text-slate-800">{formatPlate(v.numberPlate)}</span>
                          <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-1 rounded uppercase">
                            {v.vehicleType}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-slate-500">
                          <div>
                            <span className="text-slate-400">Make/Model:</span> {v.company} {v.model} ({v.year})
                          </div>
                          <div>
                            <span className="text-slate-400">Policy No:</span> <strong className="text-slate-700">{v.policyNumber}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400">Engine No:</span> {v.engineNumber}
                          </div>
                          <div>
                            <span className="text-slate-400">Chassis No:</span> {v.chassisNumber}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border border-slate-200 border-dashed rounded-xl p-6 text-center text-slate-400 italic text-sm">
                    No registered vehicles found for this profile.
                  </div>
                )}
              </div>

              {/* Uploaded Documents */}
              <div className="space-y-4 pb-4 select-none mt-6">
                <h3 className="font-black text-slate-800 text-xs tracking-wide uppercase text-amber-500">Uploaded Documents</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: "nicFront", label: "NIC Front View" },
                    { key: "nicBack", label: "NIC Back View" },
                    { key: "vehicleReg", label: "Vehicle Reg Book" },
                    { key: "revenueLicense", label: "Revenue License" }
                  ].map((doc) => {
                    const docUrl = (selectedReg.documents as any)?.[doc.key];
                    let srcUrl = docUrl || "";
                    if (srcUrl && !srcUrl.startsWith("http") && !srcUrl.startsWith("data:")) {
                      srcUrl = `${API_URL.replace("/api", "")}/uploads/${srcUrl}`;
                    }
                    return (
                      <div key={doc.key} className="border border-slate-200 rounded-xl p-4 flex flex-col items-center">
                        <span className="text-xs font-bold text-slate-500 mb-2">{doc.label}</span>
                        <div className="w-full aspect-[4/3] bg-slate-50 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center relative">
                          {docUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={srcUrl}
                              alt={doc.label}
                              onClick={() => setPreviewImage(srcUrl)}
                              className="object-cover w-full h-full hover:scale-105 transition-transform duration-300 cursor-zoom-in"
                            />
                          ) : (
                            <span className="text-xs text-slate-400 italic font-semibold">No Document Uploaded</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 flex justify-end flex-shrink-0">
              <button
                onClick={() => setSelectedReg(null)}
                className="bg-[#0f2d3a] hover:bg-[#0b222c] text-white font-extrabold text-[14px] px-8 py-3 rounded-full transition-all border-none cursor-pointer shadow-[0_4px_12px_rgba(15,45,58,0.25)] active:scale-95 flex items-center justify-center"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Lightbox Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300 select-none cursor-zoom-out transition-all duration-300"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl border border-white/10 shadow-2xl flex items-center justify-center bg-[#0a0a0a]/30" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage}
              alt="Document Full View"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white p-3 rounded-full transition-colors cursor-pointer border border-white/20 select-none shadow-md"
              aria-label="Close preview"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

                  {/* Rejection Reason Modal */}
      {rejectModal.show && rejectModal.reg && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-[0_20px_50px_rgba(15,45,58,0.15)] border border-slate-100 overflow-hidden transform scale-100 transition-all p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-black text-base text-slate-800 tracking-tight leading-none">
                  Reject Registration
                </h3>
                <p className="text-xs text-slate-400 font-bold mt-1">
                  {rejectModal.reg.firstName} {rejectModal.reg.lastName} ({rejectModal.reg.nic})
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700">
                Reason for Rejection (Included in Email Notification):
              </label>
              <textarea
                value={rejectModal.reason}
                onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                placeholder="e.g. Incomplete NIC documentation provided or incorrect vehicle details."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none h-24 font-medium"
              />
            </div>

            <div className="flex justify-end gap-2.5 mt-2 select-none">
              <button
                onClick={() => setRejectModal({ show: false, reg: null, reason: "" })}
                className="px-5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-full text-xs font-bold transition-all cursor-pointer bg-white active:scale-95 shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const regId = rejectModal.reg!._id;
                  const reason = rejectModal.reason;
                  setRejectModal({ show: false, reg: null, reason: "" });
                  handleStatusUpdate(regId, "Rejected", reason);
                }}
                className="px-6 py-2 bg-[#df3d3d] hover:bg-[#c53030] active:scale-95 text-white rounded-full text-xs font-bold shadow-md transition-all cursor-pointer border-none"
              >
                Reject Registration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Popup Modal */}
      {customPopup.show && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-[0_20px_50px_rgba(15,45,58,0.15)] border border-slate-100 overflow-hidden transform scale-100 transition-all animate-scale-up text-left p-6 flex flex-col gap-4">
            
            {/* Header/Title with clean inline icon */}
            <div className="flex items-center gap-3.5">
              {customPopup.type === "success" ? (
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              ) : customPopup.type === "confirm" ? (
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              )}
              <h3 className="font-black text-base text-slate-800 tracking-tight leading-none">
                {customPopup.title}
              </h3>
            </div>

            {/* Message Body */}
            <div>
              <p className="text-slate-500 text-[13px] font-semibold leading-relaxed">
                {customPopup.message}
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-2.5 mt-2 select-none">
              {customPopup.type === "confirm" ? (
                <>
                  <button
                    onClick={() => setCustomPopup({ ...customPopup, show: false })}
                    className="px-5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-full text-xs font-bold transition-all cursor-pointer bg-white active:scale-95 shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setCustomPopup({ ...customPopup, show: false });
                      if (customPopup.onConfirm) customPopup.onConfirm();
                    }}
                    className="px-6 py-2 bg-[#df3d3d] hover:bg-[#c53030] active:scale-95 text-white rounded-full text-xs font-bold shadow-md transition-all cursor-pointer border-none"
                  >
                    Confirm
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setCustomPopup({ ...customPopup, show: false })}
                  className="px-6 py-2 bg-[#0f2d3a] hover:bg-[#0b222c] active:scale-95 text-white rounded-full text-xs font-bold shadow-md transition-all cursor-pointer border-none"
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
