"use client";

import React, { useState, useEffect } from "react";
import OfficeStaffNavbar from "@/app/Components/Office Staff/Navbar";

interface RegistrationItem {
  name: string;
  vehiclesCount: number;
  date: string;
}

export default function OfficeStaffDashboard() {
  const [branch, setBranch] = useState("Galle");
  const [stats, setStats] = useState({
    unassignedClaims: 0,
    newRegistrations: 0,
    activeClaims: 0,
    pendingClaims: 0,
  });
  const [newClaims, setNewClaims] = useState<any[]>([]);
  const [newRegistrations, setNewRegistrations] = useState<RegistrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedClaim, setSelectedClaim] = useState<any | null>(null);

  const checkUrgent = (claim: any) => {
    return (
      claim.damageType?.toLowerCase().includes("severe") ||
      claim.description?.toLowerCase().includes("urgent") ||
      claim.priority?.toLowerCase() === "high" ||
      claim.priority?.toLowerCase() === "urgent"
    );
  };

  useEffect(() => {
    let currentBranch = "Galle";
    if (typeof window !== "undefined") {
      const savedStaff = sessionStorage.getItem("logged_in_staff");
      if (savedStaff) {
        try {
          const staffObj = JSON.parse(savedStaff);
          if (staffObj && staffObj.branch) {
            currentBranch = staffObj.branch;
          }
        } catch (e) {
          console.error("Error parsing logged_in_staff", e);
        }
      }
    }
    setBranch(currentBranch);

    async function fetchStats() {
      try {
        const res = await fetch(`http://localhost:5000/api/office-staff/dashboard-stats?branch=${currentBranch}`);
        if (!res.ok) {
          throw new Error("Failed to load dashboard metrics.");
        }
        const data = await res.json();
        setStats(data.stats);

        // Filter: Hide claims that already have an assigned agent
        const unassignedClaims = (data.newClaims || []).filter(
          (c: any) => !c.assignedAgent || c.assignedAgent.trim() === ""
        );

        // Sort: Urgent claims first, then latest first
        const sortedClaims = [...unassignedClaims].sort((a: any, b: any) => {
          const aUrgent = checkUrgent(a);
          const bUrgent = checkUrgent(b);
          if (aUrgent && !bUrgent) return -1;
          if (!aUrgent && bUrgent) return 1;
          return 0;
        });

        // Limit to latest 5 claims
        const latest5Claims = sortedClaims.slice(0, 5);

        const formattedClaims = latest5Claims.map((claim: any) => {
          const isUrgent = checkUrgent(claim);
          return {
            id: claim.claimNumber,
            urgency: isUrgent ? "Urgent" : "Normal",
            vehicleNo: claim.vehiclePlate,
            vehicleModel: claim.vehiclePlate?.substring(0, 3),
            type: claim.damageType,
            location: claim.location,
            time: new Date(claim.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            rawClaim: claim,
          };
        });
        setNewClaims(formattedClaims);

        // Format registrations list from DB
        const formattedRegs = data.newRegistrations.map((user: any) => ({
          name: `${user.firstName} ${user.lastName}`,
          vehiclesCount: user.vehicles ? user.vehicles.length : 0,
          date: new Date(user.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
        }));
        setNewRegistrations(formattedRegs);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load branch statistics");
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans">
      {/* Sidebar + Main Content Row */}
      <div className="flex flex-1 flex-row min-h-0">
        {/* Left Sidebar */}
        <OfficeStaffNavbar />

        {/* Right Main Container */}
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
                <span className="hidden lg:inline">Welcome back, </span>
                <span className="bg-[#102A43] text-white text-base px-3.5 py-1.5 rounded-xl font-black shadow-sm tracking-wide">
                  {branch} Branch
                </span>
              </h1>
            </div>
            
            <div className="flex items-center gap-5">
              {/* Notification Bell Icon */}
              <button className="relative p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer focus:outline-none">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-slate-500 hover:text-slate-800">
                  <path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0 1 13.5 0v.75c0 1.65.342 3.228.96 4.658A1.875 1.875 0 0 1 18 17.25H6a1.875 1.875 0 0 1-1.71-2.842 9.06 9.06 0 0 0 .96-4.658V9ZM12 18.75a2.25 2.25 0 0 1-2.247-2.118.75.75 0 0 1 .746-.757h3a.75.75 0 0 1 .746.757A2.25 2.25 0 0 1 12 18.75Z" clipRule="evenodd" />
                </svg>
              </button>
              {/* User Avatar Icon */}
              <button className="relative p-1 hover:bg-slate-100 rounded-full transition-colors cursor-pointer focus:outline-none">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-slate-500 hover:text-slate-800">
                  <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0 0 21.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12c0 2.754 1.14 5.244 2.98 7.03-.028-.01-.053-.024-.082-.031a.75.75 0 0 1-.502-.879C5.556 14.931 8.193 12 12 12s6.444 2.931 7.352 6.12a.75.75 0 0 1-.502.88c-.029.007-.054.02-.082.031ZM12 11.25a3.375 3.375 0 1 0 0-6.75 3.375 3.375 0 0 0 0 6.75Z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </header>

          {/* Page Content Dashboard */}
          <main className="flex-1 p-4 lg:p-8 bg-white overflow-y-auto">
            {loading ? (
              <div className="w-full h-full flex flex-col items-center justify-center min-h-[300px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#f59e0b]"></div>
                <span className="mt-4 text-slate-500 font-bold">Loading branch metrics...</span>
              </div>
            ) : error ? (
              <div className="w-full h-full flex flex-col items-center justify-center min-h-[300px] text-red-500 font-bold bg-red-50 rounded-2xl p-8 border border-red-200">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-10 h-10 mb-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                <span>{error}</span>
              </div>
            ) : (
              <>
                {/* 4 Cards Grid - Desktop view */}
                <div className="hidden lg:grid grid-cols-4 gap-6 mb-12">
                  {/* Unassigned Claims Card (Red themed) */}
                  <div className="bg-white rounded-[20px] border border-red-500 p-6 flex flex-col items-center justify-center text-center h-[120px] shadow-sm select-none">
                    <span className="text-3xl font-black text-red-500 tracking-tight">
                      {stats.unassignedClaims}
                    </span>
                    <span className="text-red-500 font-bold text-sm mt-1">Unassigned Claims</span>
                  </div>

                  {/* New Registrations Card */}
                  <div className="bg-white rounded-[20px] border border-slate-700/80 p-6 flex flex-col items-center justify-center text-center h-[120px] shadow-sm select-none">
                    <span className="text-3xl font-black text-slate-800 tracking-tight">
                      {stats.newRegistrations}
                    </span>
                    <span className="text-slate-500 font-bold text-sm mt-1">New Registrations</span>
                  </div>

                  {/* Active Claims Card */}
                  <div className="bg-white rounded-[20px] border border-slate-700/80 p-6 flex flex-col items-center justify-center text-center h-[120px] shadow-sm select-none">
                    <span className="text-3xl font-black text-slate-800 tracking-tight">
                      {stats.activeClaims}
                    </span>
                    <span className="text-slate-500 font-bold text-sm mt-1">Active Claims</span>
                  </div>

                  {/* Pending Claims Card */}
                  <div className="bg-white rounded-[20px] border border-slate-700/80 p-6 flex flex-col items-center justify-center text-center h-[120px] shadow-sm select-none">
                    <span className="text-3xl font-black text-slate-800 tracking-tight">
                      {stats.pendingClaims}
                    </span>
                    <span className="text-slate-500 font-bold text-sm mt-1">Pending Claims</span>
                  </div>
                </div>

                {/* 4 Cards Grid - Mobile view */}
                <div className="grid lg:hidden grid-cols-1 gap-4 mb-8">
                  {/* Unassigned Claims Card */}
                  <div className="bg-gradient-to-br from-red-50/50 to-white rounded-[20px] border border-red-100/70 p-4 flex items-center justify-between shadow-xs select-none hover:scale-[1.01] transition-all h-[80px]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100/60 rounded-xl text-red-600 flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                        </svg>
                      </div>
                      <span className="text-slate-600 font-bold text-xs">Unassigned Claims</span>
                    </div>
                    <span className="text-xl font-black text-red-600 tracking-tight pr-1 flex-shrink-0">
                      {stats.unassignedClaims}
                    </span>
                  </div>

                  {/* New Registrations Card */}
                  <div className="bg-gradient-to-br from-blue-50/50 to-white rounded-[20px] border border-blue-100/70 p-4 flex items-center justify-between shadow-xs select-none hover:scale-[1.01] transition-all h-[80px]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100/60 rounded-xl text-blue-900 flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0zM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                        </svg>
                      </div>
                      <span className="text-slate-600 font-bold text-xs">New Registrations</span>
                    </div>
                    <span className="text-xl font-black text-blue-900 tracking-tight pr-1 flex-shrink-0">
                      {stats.newRegistrations}
                    </span>
                  </div>

                  {/* Active Claims Card */}
                  <div className="bg-gradient-to-br from-emerald-50/50 to-white rounded-[20px] border border-emerald-100/70 p-4 flex items-center justify-between shadow-xs select-none hover:scale-[1.01] transition-all h-[80px]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100/60 rounded-xl text-emerald-800 flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                      </div>
                      <span className="text-slate-600 font-bold text-xs">Active Claims</span>
                    </div>
                    <span className="text-xl font-black text-emerald-800 tracking-tight pr-1 flex-shrink-0">
                      {stats.activeClaims}
                    </span>
                  </div>

                  {/* Pending Claims Card */}
                  <div className="bg-gradient-to-br from-amber-50/50 to-white rounded-[20px] border border-amber-100/70 p-4 flex items-center justify-between shadow-xs select-none hover:scale-[1.01] transition-all h-[80px]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100/60 rounded-xl text-amber-800 flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                      </div>
                      <span className="text-slate-600 font-bold text-xs">Pending Claims</span>
                    </div>
                    <span className="text-xl font-black text-amber-800 tracking-tight pr-1 flex-shrink-0">
                      {stats.pendingClaims}
                    </span>
                  </div>
                </div>

                {/* Columns split: New Claims & New Registration */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                  
                  {/* Left Column: New Claims (8 cols) */}
                  <div className="lg:col-span-8 flex flex-col select-none">
                    <div className="flex items-center gap-2 mb-6">
                      <h2 className="text-lg font-black text-slate-800 tracking-wide">
                        New Claims
                      </h2>
                      <span className="text-lg font-black text-slate-800">&gt;</span>
                    </div>

                    {newClaims.length === 0 ? (
                      <div className="border border-slate-200 rounded-[24px] p-8 text-center text-slate-400 font-bold">
                        No new claims for this branch
                      </div>
                    ) : (
                      <div className="flex flex-col gap-6">
                        {newClaims.map((claim, index) => {
                          const isUrgent = claim.urgency === "Urgent";
                          const cardBorderClass = isUrgent ? "border-red-500" : "border-blue-500";
                          const headerTextClass = isUrgent ? "text-red-500" : "text-blue-500";

                          return (
                            <div
                              key={index}
                              className={`bg-white border-2 ${cardBorderClass} rounded-[24px] p-6 flex flex-col relative max-w-[560px] w-full`}
                            >
                              {/* Title Header */}
                              <span className={`font-black text-base ${headerTextClass} mb-4`}>
                                {claim.urgency} - {claim.id}
                              </span>

                              {/* Flex Container for details and buttons */}
                              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                                
                                {/* Claim Specifications */}
                                <div className="flex flex-col text-slate-500 text-sm font-semibold gap-1 min-w-0 flex-1">
                                  <div className="flex">
                                    <span className="w-28 flex-shrink-0">Vehicle No</span>
                                    <span>- {claim.vehicleNo}</span>
                                  </div>
                                  <div className="flex">
                                    <span className="w-28 flex-shrink-0">Type</span>
                                    <span>- {claim.type}</span>
                                  </div>
                                  <div className="flex">
                                    <span className="w-28 flex-shrink-0">Location</span>
                                    <span>- {claim.location}</span>
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-row md:flex-col gap-3 self-end md:self-auto flex-shrink-0 w-28">
                                  <button
                                    onClick={() => setSelectedClaim(claim.rawClaim)}
                                    className="w-full bg-slate-700 hover:bg-slate-800 active:scale-95 text-white font-extrabold text-[13px] py-2.5 rounded-full transition-all tracking-wide cursor-pointer focus:outline-none shadow-sm shadow-slate-500/20 whitespace-nowrap text-center"
                                  >
                                    Details
                                  </button>
                                </div>

                              </div>

                              {/* Timestamp bottom-right */}
                              <span className="text-[11px] text-slate-400 font-bold self-end mt-4">
                                {claim.time}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Right Column: New Registration (4 cols) */}
                  <div className="lg:col-span-4 flex flex-col select-none">
                    <div className="flex items-center gap-2 mb-6">
                      <h2 className="text-lg font-black text-slate-800 tracking-wide">
                        New Registration
                      </h2>
                      <span className="text-lg font-black text-slate-800">&gt;</span>
                    </div>

                    {newRegistrations.length === 0 ? (
                      <div className="border border-slate-200 rounded-[24px] p-8 text-center text-slate-400 font-bold">
                        No new registrations for this branch
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {newRegistrations.map((reg, index) => (
                          <div
                            key={index}
                            className="bg-slate-50 rounded-2xl p-5 flex flex-col shadow-sm"
                          >
                            <span className="font-black text-slate-800 text-[15px] mb-1">
                              {reg.name}
                            </span>
                            <span className="text-[12px] text-slate-400 font-bold">
                              {reg.vehiclesCount} {reg.vehiclesCount === 1 ? "Vehicle" : "Vehicles"} · {reg.date}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </>
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

      {selectedClaim && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[24px] border border-slate-150 w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-800 text-left">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 flex justify-between items-center border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">
                Claim Details: {selectedClaim.claimNumber}
              </h3>
              <button
                onClick={() => setSelectedClaim(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 hover:bg-slate-50 rounded-full transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-sm font-semibold text-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold select-none">Status</span>
                  <span className="text-slate-800">{selectedClaim.status}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold select-none">Urgency</span>
                  <span className={checkUrgent(selectedClaim) ? "text-red-600 font-extrabold" : "text-slate-800"}>
                    {checkUrgent(selectedClaim) ? "Urgent" : "Normal"}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 my-3" />

              <div className="space-y-3">
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-400 font-medium">Vehicle Plate</span>
                  <span className="text-slate-800 font-bold">{selectedClaim.vehiclePlate}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-400 font-medium">Damage Type</span>
                  <span className="text-slate-800 font-bold">{selectedClaim.damageType}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-400 font-medium">Location</span>
                  <span className="text-slate-800 font-bold">{selectedClaim.location}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-400 font-medium">Incident Date</span>
                  <span className="text-slate-800 font-bold">{new Date(selectedClaim.incidentDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-400 font-medium">Incident Time</span>
                  <span className="text-slate-800 font-bold">{selectedClaim.incidentTime}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-400 font-medium">Assigned Agent</span>
                  <span className="text-slate-800 font-bold">{selectedClaim.assignedAgent || "None assigned"}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-400 font-medium">Claim Amount</span>
                  <span className="text-slate-800 font-bold">{selectedClaim.amount ? `Rs. ${selectedClaim.amount}` : "Pending Evaluation"}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1 mt-2">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold select-none">Description</span>
                <p className="text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs leading-relaxed whitespace-pre-wrap">
                  {selectedClaim.description || "No description provided."}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedClaim(null)}
                className="bg-slate-700 hover:bg-slate-800 active:scale-95 text-white font-extrabold text-xs px-6 py-2.5 rounded-full transition-all cursor-pointer shadow-sm"
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
