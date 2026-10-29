"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { API_URL } from "../../config";

interface AuthorizedVehicle {
  numberPlate: string;
  vehicleType?: string;
  model?: string;
  company?: string;
  year?: string;
  policyNumber?: string;
}

interface DriverPassData {
  reference: string;
  policyHolderName: string;
  policyHolderNic: string;
  branch: string;
  driverName: string;
  driverNic: string;
  driverPhone: string;
  driverAddress: string;
  authorizedVehicles: AuthorizedVehicle[];
  approvalDate: string;
  status: string;
  verificationToken: string;
  totalAccessCount: number;
}

export default function DriverPassPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passData, setPassData] = useState<DriverPassData | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchPass = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/third-party/driver-pass/${token}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to load driver pass.");
        }
        setPassData(data.pass);
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred while verifying pass.");
      } finally {
        setLoading(false);
      }
    };

    fetchPass();
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-8 font-sans">
      
      {/* Top Brand Bar */}
      <header className="max-w-xl mx-auto w-full flex items-center justify-between pb-6 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00ddff] to-blue-600 flex items-center justify-center font-bold text-slate-900 shadow-lg">
            S
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-wide">
              SANASA GENERAL INSURANCE
            </h1>
            <p className="text-[11px] text-cyan-300 font-medium">
              Official Digital Driver Pass • Sri Lanka
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>LIVE PASS</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-xl mx-auto w-full my-6 flex-1 flex flex-col justify-center">
        {loading && (
          <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-10 text-center shadow-2xl backdrop-blur-md">
            <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-bold text-white mb-1">Verifying Digital Pass...</h2>
            <p className="text-slate-400 text-xs">Authenticating cryptographic security token with Sanasa network</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-slate-800/90 border border-rose-500/40 rounded-3xl p-8 text-center shadow-2xl backdrop-blur-md">
            <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center text-rose-400 mx-auto mb-4 text-2xl font-bold">
              !
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Access Denied or Pass Expired</h2>
            <p className="text-slate-300 text-sm max-w-sm mx-auto mb-6 leading-relaxed">
              {error}
            </p>
            <p className="text-xs text-slate-500">
              If you believe this is an error, please contact your policyholder or the Sanasa Branch Office.
            </p>
          </div>
        )}

        {passData && !loading && (
          <div className="bg-white text-slate-800 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] border border-slate-100 overflow-hidden flex flex-col">
            
            {/* Pass Header Banner */}
            <div className="bg-gradient-to-r from-[#102A43] via-[#1a4066] to-[#102A43] text-white p-6 relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-6 -translate-y-6 w-32 h-32 bg-cyan-400/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-1 rounded-full inline-block mb-1.5">
                    Authorized Third-Party Driver
                  </span>
                  <h2 className="text-2xl font-black tracking-tight text-white leading-tight">
                    {passData.driverName}
                  </h2>
                  <p className="text-xs text-slate-300 font-mono mt-0.5">
                    NIC: <strong className="text-white">{passData.driverNic || "Verified By Branch"}</strong>
                  </p>
                </div>

                <div className="text-right flex flex-col items-end">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center font-bold text-lg mb-1 shadow-inner">
                    ✓
                  </div>
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                    VERIFIED
                  </span>
                </div>
              </div>
            </div>

            {/* Pass Body Content */}
            <div className="p-6 space-y-6">
              
              {/* Authorized Vehicles List */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                  <span>Authorized Vehicles</span>
                  <span className="text-[11px] font-normal text-slate-500">{passData.authorizedVehicles.length} Registered</span>
                </h3>

                <div className="space-y-2">
                  {passData.authorizedVehicles.map((veh, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 flex items-center justify-between hover:bg-slate-100/70 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-mono font-bold text-sm tracking-wider shadow-2xs">
                          {veh.numberPlate}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs">
                            {veh.company} {veh.model}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-mono">
                            Policy: {veh.policyNumber || "N/A"}
                          </p>
                        </div>
                      </div>

                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        Covered
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Policyholder & Authority Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                <div>
                  <span className="text-slate-400 block text-[11px]">Vehicle Owner (Policyholder)</span>
                  <span className="font-bold text-slate-800 block mt-0.5">{passData.policyHolderName}</span>
                  <span className="font-mono text-slate-500 text-[10.5px]">NIC: {passData.policyHolderNic}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Sanasa Branch Office</span>
                  <span className="font-bold text-slate-800 block mt-0.5">{passData.branch} Branch</span>
                  <span className="text-emerald-700 font-medium text-[10.5px]">Seal Verified</span>
                </div>

                <div className="border-t border-slate-200/60 pt-2.5">
                  <span className="text-slate-400 block text-[11px]">Driver Mobile</span>
                  <span className="font-mono font-bold text-slate-800 block mt-0.5">{passData.driverPhone}</span>
                </div>

                <div className="border-t border-slate-200/60 pt-2.5">
                  <span className="text-slate-400 block text-[11px]">Pass Reference</span>
                  <span className="font-mono font-bold text-slate-800 block mt-0.5">{passData.reference}</span>
                </div>
              </div>

              {/* Security Verification QR / Barcode Card */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-center justify-between shadow-md">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-300 block mb-0.5">
                    Traffic Police Inspection Token
                  </span>
                  <span className="text-sm font-mono font-bold tracking-widest text-white block">
                    {passData.verificationToken}-VERIFIED
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Activity logged in Sanasa central audit system.
                  </span>
                </div>

                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-1">
                  <div className="grid grid-cols-3 gap-0.5 w-full h-full p-1 bg-slate-900 rounded-lg">
                    <div className="bg-white rounded-2xs" />
                    <div className="bg-slate-900" />
                    <div className="bg-white rounded-2xs" />
                    <div className="bg-slate-900" />
                    <div className="bg-white rounded-2xs" />
                    <div className="bg-slate-900" />
                    <div className="bg-white rounded-2xs" />
                    <div className="bg-slate-900" />
                    <div className="bg-white rounded-2xs" />
                  </div>
                </div>
              </div>

              {/* Legal Notice */}
              <p className="text-[10.5px] text-slate-400 text-center leading-relaxed">
                This digital authorization pass certifies that the named driver has been legally registered and insured under Sanasa General Insurance PLC policies for the listed vehicles. Valid across Sri Lanka under Motor Traffic Act provisions.
              </p>

            </div>

          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-xl mx-auto w-full text-center text-xs text-slate-500 pt-4 border-t border-slate-800">
        <p>© {new Date().getFullYear()} Sanasa General Insurance PLC. All Rights Reserved.</p>
        <p className="text-[11px] text-slate-600 mt-1">Emergency 24H Hotline: +94 112 003 000</p>
      </footer>

    </div>
  );
}
