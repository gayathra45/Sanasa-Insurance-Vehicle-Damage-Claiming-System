"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log unexpected runtime exception for diagnostics
    console.error("SANASA Platform Runtime Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100/60 to-slate-200/50 flex flex-col items-center justify-center p-6 text-slate-800 font-sans selection:bg-[#102A43] selection:text-white">
      <div className="w-full max-w-xl bg-white/95 backdrop-blur-md rounded-3xl p-8 sm:p-12 shadow-[0_20px_50px_rgba(16,42,67,0.08)] border border-slate-200/80 text-center relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-rose-100 to-amber-100 rounded-full blur-2xl opacity-60 pointer-events-none" />

        {/* Brand Logo */}
        <div className="relative mb-6 flex justify-center">
          <div className="relative w-20 h-20 rounded-2xl bg-slate-50 border border-slate-200/90 shadow-sm flex items-center justify-center p-2.5">
            <Image
              src="/logo.png"
              alt="SANASA General Insurance"
              width={70}
              height={70}
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Status Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 mb-4 tracking-wide uppercase">
          <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
          Technical Exception Encountered
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#102A43] tracking-tight mb-3">
          Something Went Wrong
        </h1>

        <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-md mx-auto mb-2">
          An unexpected error occurred while processing your request. Our engineering team has been notified.
        </p>

        {error?.digest && (
          <p className="text-xs font-mono text-slate-400 mb-6 bg-slate-50 py-1.5 px-3 rounded-lg border border-slate-200/60 inline-block">
            Reference ID: {error.digest}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md mx-auto mb-8 mt-2">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#102A43] hover:bg-[#0b1d30] text-white text-sm font-semibold transition-all shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Try Again
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-sm font-semibold transition-all border border-slate-200/90 active:scale-[0.98]"
          >
            <svg
              className="w-4 h-4 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Return to Home
          </Link>
        </div>

        {/* 24/7 Hotline Footer */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shrink-0">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">24/7 Island-Wide Assistance</p>
              <a
                href="tel:0725575575"
                className="text-sm font-bold text-[#102A43] hover:text-blue-600 transition-colors"
              >
                0725 575 575
              </a>
            </div>
          </div>

          <p className="text-xs text-slate-400 text-center sm:text-right">
            SANASA General Insurance PLC
          </p>
        </div>
      </div>
    </div>
  );
}
