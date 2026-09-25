"use client";

import React from "react";

interface SimpleLoaderProps {
  message?: string;
  subMessage?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  theme?: "slate" | "blue" | "amber" | "cyan" | "indigo";
}

export default function SimpleLoader({
  message = "Loading...",
  subMessage,
  className = "min-h-[260px] py-14",
  size = "md",
  theme = "slate",
}: SimpleLoaderProps) {
  const spinnerSize = size === "sm" ? "w-6 h-6 border-2" : size === "lg" ? "w-12 h-12 border-3" : "w-8 h-8 border-2";

  const colorStyles: Record<string, { ring: string; dot: string; text: string }> = {
    slate: {
      ring: "border-slate-200 border-t-[#0f2d3a]",
      dot: "bg-[#0f2d3a]",
      text: "text-slate-600",
    },
    blue: {
      ring: "border-blue-100 border-t-blue-600",
      dot: "bg-blue-600",
      text: "text-slate-600",
    },
    amber: {
      ring: "border-amber-100 border-t-amber-500",
      dot: "bg-amber-500",
      text: "text-slate-600",
    },
    cyan: {
      ring: "border-cyan-100 border-t-cyan-500",
      dot: "bg-cyan-500",
      text: "text-slate-600",
    },
    indigo: {
      ring: "border-indigo-100 border-t-indigo-600",
      dot: "bg-indigo-600",
      text: "text-slate-600",
    },
  };

  const selectedColor = colorStyles[theme] || colorStyles.slate;

  return (
    <div className={`w-full flex flex-col items-center justify-center select-none ${className}`}>
      <div className="relative flex items-center justify-center mb-3">
        {/* Subtle breathing glow */}
        <div className="absolute w-10 h-10 rounded-full bg-slate-100 animate-ping opacity-30" />
        
        {/* Modern smooth spinning ring */}
        <div
          className={`${spinnerSize} ${selectedColor.ring} rounded-full animate-spin`}
          style={{ animationDuration: "0.8s" }}
        />
        
        {/* Subtle pulse center indicator */}
        <div className={`absolute w-1.5 h-1.5 rounded-full ${selectedColor.dot} opacity-75 animate-pulse`} />
      </div>

      {message && (
        <span className={`text-xs font-semibold ${selectedColor.text} tracking-wide`}>
          {message}
        </span>
      )}

      {subMessage && (
        <span className="text-[11px] font-normal text-slate-400 mt-1">
          {subMessage}
        </span>
      )}
    </div>
  );
}
