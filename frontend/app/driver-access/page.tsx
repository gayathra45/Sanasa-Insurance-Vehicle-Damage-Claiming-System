"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { API_URL } from "../config";
import PolicyHolderFooter from "@/app/Components/Policy_Holder/footer";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ShieldCheckIcon,
  CreditCardIcon,
  Search01Icon,
  SmartPhone01Icon,
  Call02Icon,
  AlertCircleIcon,
  CheckmarkCircle01Icon,
  ArrowRight01Icon,
  File01Icon,
  Car01Icon,
  Loading03Icon
} from "@hugeicons/core-free-icons";

export default function DriverAccessLandingPage() {
  const router = useRouter();
  const [accessQuery, setAccessQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successInfo, setSuccessInfo] = useState<any>(null);
  const [nfcScanning, setNfcScanning] = useState(false);
  const [nfcStatusText, setNfcStatusText] = useState("");

  const handleResolvePass = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage("");
    setSuccessInfo(null);

    const q = accessQuery.trim();
    if (!q) {
      setErrorMessage("Please enter an Access Token, Pass Reference, or NFC Card ID.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/third-party/resolve-pass`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query: q })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No active driver access pass found matching this code.");
      }

      if (data.token) {
        setSuccessInfo(data);
        setTimeout(() => {
          router.push(`/driver-access/${data.token}`);
        }, 900);
      } else {
        throw new Error("Unable to obtain access credentials.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to verify digital driver access.");
    } finally {
      setLoading(false);
    }
  };

  // Hardware Web NFC scan (supported on Android Chrome with NFC hardware)
  const handleNfcScan = async () => {
    setErrorMessage("");
    if (typeof window === "undefined" || !("NDEFReader" in window)) {
      setErrorMessage(
        "Direct NFC hardware scanning is not supported by your current browser. Please manually type the NFC Card ID printed on the back of your card (e.g. SAN-NFC-XXXXX)."
      );
      return;
    }

    try {
      setNfcScanning(true);
      setNfcStatusText("Hold your physical Sanasa NFC Card close to the back of your phone...");
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();

      ndef.onreading = (event: any) => {
        const serialNumber = event.serialNumber;
        let cardUrl = "";

        if (event.message && event.message.records) {
          for (const record of event.message.records) {
            if (record.recordType === "url" || record.recordType === "text") {
              const textDecoder = new TextDecoder(record.encoding || "utf-8");
              cardUrl = textDecoder.decode(record.data);
              break;
            }
          }
        }

        setNfcStatusText("NFC Card detected! Verifying credentials...");
        setNfcScanning(false);

        // If card URL contains token, extract it
        if (cardUrl && cardUrl.includes("/driver-access/")) {
          const parts = cardUrl.split("/driver-access/");
          const token = parts[1]?.split("?")[0]?.trim();
          if (token) {
            router.push(`/driver-access/${token}`);
            return;
          }
        }

        // Otherwise resolve serial number or card text
        const queryToUse = cardUrl || serialNumber || "";
        if (queryToUse) {
          setAccessQuery(queryToUse);
          fetch(`${API_URL}/third-party/resolve-pass`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: queryToUse })
          })
            .then((r) => r.json())
            .then((d) => {
              if (d.token) {
                router.push(`/driver-access/${d.token}`);
              } else {
                setErrorMessage(d.error || "NFC card is not linked to an active driver assignment.");
              }
            })
            .catch(() => {
              setErrorMessage("Failed to process scanned NFC card.");
            });
        }
      };

      ndef.onreadingerror = () => {
        setNfcScanning(false);
        setErrorMessage("Could not read NFC card. Please try again or type the card ID manually.");
      };
    } catch (err: any) {
      setNfcScanning(false);
      setErrorMessage(
        err.message ||
          "NFC scan was cancelled or permission was denied. You can enter your Card ID or Pass Token manually below."
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col justify-between font-sans">
      {/* Top Banner / Hotline Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full bg-[#185a37]/10 flex items-center justify-center p-1">
              <Image
                src="/images/logo.png"
                alt="Sanasa Life Insurance"
                width={36}
                height={36}
                className="object-contain"
                priority
              />
            </div>
            <div>
              <span className="font-extrabold text-[#185a37] tracking-tight text-lg block leading-none">
                SANASA
              </span>
              <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider block">
                Digital Driver Gateway
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="tel:+94112003000"
              className="hidden sm:flex items-center gap-2 text-xs font-semibold text-[#185a37] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-1.5 rounded-full transition-colors"
            >
              <HugeiconsIcon icon={Call02Icon} size={14} className="text-[#185a37]" />
              <span>24/7 Emergency: +94 112 003 000</span>
            </a>
            <Link
              href="/Login"
              className="text-xs font-semibold text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              Staff / Policyholder Login
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-xl w-full space-y-6">
          {/* Header Card */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-[#185a37] text-xs font-bold tracking-wide uppercase">
              <HugeiconsIcon icon={ShieldCheckIcon} size={15} />
              Third-Party Driver Access
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Access Your Authorized Vehicles
            </h1>
            <p className="text-sm text-gray-600 max-w-md mx-auto">
              Review your official Sanasa digital authorization pass, inspect authorized vehicles, and file fast accident claims directly from the scene.
            </p>
          </div>

          {/* Input Form Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-100 space-y-6">
            <form onSubmit={handleResolvePass} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Access Code, Card ID, or Pass Token
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <HugeiconsIcon icon={Search01Icon} size={18} />
                  </div>
                  <input
                    type="text"
                    value={accessQuery}
                    onChange={(e) => setAccessQuery(e.target.value)}
                    placeholder="e.g. SAN-NFC-00012 or TPD-202610... or Token"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 hover:bg-gray-100/60 focus:bg-white border border-gray-200 focus:border-[#185a37] focus:ring-2 focus:ring-[#185a37]/20 rounded-2xl text-sm font-medium transition-all outline-none"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5 pl-1">
                  Enter the secure token received via SMS, your card serial number, or pass reference.
                </p>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700 animate-fadeIn">
                  <HugeiconsIcon icon={AlertCircleIcon} size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Access Verification Failed</span>
                    <span>{errorMessage}</span>
                  </div>
                </div>
              )}

              {/* Success Info */}
              {successInfo && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-800 animate-fadeIn">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">
                      Welcome, {successInfo.driverName || "Authorized Driver"}!
                    </span>
                    <span>Verified successfully. Launching your digital driver portal...</span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#185a37] hover:bg-[#13492c] active:bg-[#0f3b23] text-white text-sm font-bold shadow-lg shadow-emerald-900/15 hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <HugeiconsIcon icon={Loading03Icon} size={18} className="animate-spin text-white" />
                    <span>Verifying Access...</span>
                  </>
                ) : (
                  <>
                    <span>Open Driver Portal</span>
                    <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-gray-200 w-full" />
              <span className="bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-gray-400 shrink-0">
                Or Tap Physical Card
              </span>
              <div className="border-t border-gray-200 w-full" />
            </div>

            {/* Tap NFC Scan Option */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleNfcScan}
                disabled={nfcScanning}
                className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-emerald-300 hover:border-[#185a37] bg-emerald-50/50 hover:bg-emerald-50 text-emerald-900 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <HugeiconsIcon icon={CreditCardIcon} size={18} className="text-[#185a37]" />
                <span>{nfcScanning ? "Scanning Card..." : "Tap / Scan Physical NFC Card (Mobile)"}</span>
              </button>

              {nfcScanning && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs text-amber-800 animate-pulse">
                  {nfcStatusText}
                </div>
              )}
            </div>

            {/* Quick Feature Highlights */}
            <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-gray-100">
              <div className="p-2.5 rounded-xl bg-gray-50 text-center">
                <HugeiconsIcon icon={Car01Icon} size={18} className="text-[#185a37] mx-auto mb-1" />
                <span className="text-[10px] font-bold text-gray-800 block">Insured Vehicles</span>
                <span className="text-[9px] text-gray-500">Live Status</span>
              </div>
              <div className="p-2.5 rounded-xl bg-gray-50 text-center">
                <HugeiconsIcon icon={ShieldCheckIcon} size={18} className="text-[#185a37] mx-auto mb-1" />
                <span className="text-[10px] font-bold text-gray-800 block">Digital Pass</span>
                <span className="text-[9px] text-gray-500">Official QR</span>
              </div>
              <div className="p-2.5 rounded-xl bg-gray-50 text-center">
                <HugeiconsIcon icon={File01Icon} size={18} className="text-[#185a37] mx-auto mb-1" />
                <span className="text-[10px] font-bold text-gray-800 block">Instant Claims</span>
                <span className="text-[9px] text-gray-500">On-Site Lodging</span>
              </div>
            </div>
          </div>

          {/* Need Assistance Helper Box */}
          <div className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-[#185a37]">
                <HugeiconsIcon icon={SmartPhone01Icon} size={16} />
              </div>
              <div>
                <span className="font-bold text-gray-800 block">Have an SMS authorization link?</span>
                <span className="text-gray-500 text-[11px]">
                  Click the secure link in your SMS message to jump straight into your portal.
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <PolicyHolderFooter />
    </div>
  );
}
