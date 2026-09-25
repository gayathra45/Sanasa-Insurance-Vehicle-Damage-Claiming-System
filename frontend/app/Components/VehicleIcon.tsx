import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Car01Icon,
  Car02Icon,
  Car05Icon,
  Motorbike01Icon,
  DeliveryTruck01Icon,
  ContainerTruck01Icon,
  Bus01Icon,
  TractorIcon,
  VanIcon
} from "@hugeicons/core-free-icons";

export interface VehicleTheme {
  bg: string;
  border: string;
  text: string;
  glow: string;
  badge: string;
  accent: string;
  name: string;
}

export function getVehicleTheme(type: string): VehicleTheme {
  if (!type) type = "car";
  const t = type.toLowerCase().trim();

  if (t.includes("suv")) {
    return {
      name: "SUV",
      bg: "bg-gradient-to-br from-indigo-500/15 via-violet-500/10 to-indigo-50/80",
      border: "border-indigo-200/90 group-hover:border-indigo-500",
      text: "text-indigo-600",
      glow: "group-hover:shadow-[0_10px_25px_rgba(99,102,241,0.25)]",
      badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
      accent: "#6366f1"
    };
  }
  if (t.includes("cab") || t.includes("pickup") || t.includes("double")) {
    return {
      name: "Pickup",
      bg: "bg-gradient-to-br from-teal-500/15 via-emerald-500/10 to-teal-50/80",
      border: "border-teal-200/90 group-hover:border-teal-500",
      text: "text-teal-600",
      glow: "group-hover:shadow-[0_10px_25px_rgba(20,184,166,0.25)]",
      badge: "bg-teal-50 text-teal-700 border-teal-200",
      accent: "#0d9488"
    };
  }
  if (t.includes("van") || t.includes("minibus")) {
    return {
      name: "Van",
      bg: "bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-50/80",
      border: "border-amber-200/90 group-hover:border-amber-500",
      text: "text-amber-600",
      glow: "group-hover:shadow-[0_10px_25px_rgba(245,158,11,0.25)]",
      badge: "bg-amber-50 text-amber-700 border-amber-200",
      accent: "#d97706"
    };
  }
  if (t.includes("bike") || t.includes("motorcycle") || t.includes("scooter")) {
    return {
      name: "Motorbike",
      bg: "bg-gradient-to-br from-rose-500/15 via-pink-500/10 to-rose-50/80",
      border: "border-rose-200/90 group-hover:border-rose-500",
      text: "text-rose-600",
      glow: "group-hover:shadow-[0_10px_25px_rgba(244,63,94,0.25)]",
      badge: "bg-rose-50 text-rose-700 border-rose-200",
      accent: "#e11d48"
    };
  }
  if (t.includes("three") || t.includes("rickshaw") || t.includes("tuk")) {
    return {
      name: "Three-Wheeler",
      bg: "bg-gradient-to-br from-emerald-500/15 via-green-500/10 to-emerald-50/80",
      border: "border-emerald-200/90 group-hover:border-emerald-500",
      text: "text-emerald-600",
      glow: "group-hover:shadow-[0_10px_25px_rgba(16,185,129,0.25)]",
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
      accent: "#059669"
    };
  }
  if (t.includes("lorry") || t.includes("truck")) {
    return {
      name: "Truck",
      bg: "bg-gradient-to-br from-slate-600/15 via-zinc-600/10 to-slate-50/80",
      border: "border-slate-300/90 group-hover:border-slate-600",
      text: "text-slate-700",
      glow: "group-hover:shadow-[0_10px_25px_rgba(71,85,105,0.25)]",
      badge: "bg-slate-100 text-slate-800 border-slate-300",
      accent: "#475569"
    };
  }
  if (t.includes("bus")) {
    return {
      name: "Bus",
      bg: "bg-gradient-to-br from-purple-500/15 via-fuchsia-500/10 to-purple-50/80",
      border: "border-purple-200/90 group-hover:border-purple-500",
      text: "text-purple-600",
      glow: "group-hover:shadow-[0_10px_25px_rgba(168,85,247,0.25)]",
      badge: "bg-purple-50 text-purple-700 border-purple-200",
      accent: "#9333ea"
    };
  }
  if (t.includes("tractor")) {
    return {
      name: "Tractor",
      bg: "bg-gradient-to-br from-lime-500/15 via-yellow-500/10 to-lime-50/80",
      border: "border-lime-200/90 group-hover:border-lime-500",
      text: "text-lime-700",
      glow: "group-hover:shadow-[0_10px_25px_rgba(132,204,22,0.25)]",
      badge: "bg-lime-50 text-lime-800 border-lime-200",
      accent: "#65a30d"
    };
  }

  // Default: Car
  return {
    name: "Car",
    bg: "bg-gradient-to-br from-cyan-500/15 via-blue-500/10 to-sky-50/80",
    border: "border-cyan-200/90 group-hover:border-cyan-500",
    text: "text-cyan-600",
    glow: "group-hover:shadow-[0_10px_25px_rgba(6,182,212,0.25)]",
    badge: "bg-cyan-50 text-cyan-700 border-cyan-200",
    accent: "#0891b2"
  };
}

export function getVehicleIconSvg(type: string, className = "w-8 h-8 text-inherit") {
  if (!type) type = "car";
  const t = type.toLowerCase().trim();

  if (t.includes("suv")) {
    return <HugeiconsIcon icon={Car05Icon} className={className} strokeWidth={1.8} />;
  }
  if (t.includes("cab") || t.includes("pickup") || t.includes("double")) {
    return <HugeiconsIcon icon={DeliveryTruck01Icon} className={className} strokeWidth={1.8} />;
  }
  if (t.includes("van") || t.includes("minibus")) {
    return <HugeiconsIcon icon={VanIcon} className={className} strokeWidth={1.8} />;
  }
  if (t.includes("bike") || t.includes("motorcycle") || t.includes("scooter")) {
    return <HugeiconsIcon icon={Motorbike01Icon} className={className} strokeWidth={1.8} />;
  }
  if (t.includes("three") || t.includes("rickshaw") || t.includes("tuk")) {
    return <HugeiconsIcon icon={Car02Icon} className={className} strokeWidth={1.8} />;
  }
  if (t.includes("lorry") || t.includes("truck")) {
    return <HugeiconsIcon icon={ContainerTruck01Icon} className={className} strokeWidth={1.8} />;
  }
  if (t.includes("bus")) {
    return <HugeiconsIcon icon={Bus01Icon} className={className} strokeWidth={1.8} />;
  }
  if (t.includes("tractor")) {
    return <HugeiconsIcon icon={TractorIcon} className={className} strokeWidth={1.8} />;
  }

  // Default: Car
  return <HugeiconsIcon icon={Car01Icon} className={className} strokeWidth={1.8} />;
}

export function getVehicleIconContainer(type: string, customSize?: string) {
  const theme = getVehicleTheme(type);
  const sizeClass = customSize || "w-16 h-16 rounded-[22px]";
  const isSmall = customSize?.includes("w-12") || customSize?.includes("w-10");
  const isMedium = customSize?.includes("w-14");
  const iconSize = isSmall ? "w-6 h-6" : isMedium ? "w-7 h-7" : "w-9 h-9";

  return (
    <div
      className={`${sizeClass} flex items-center justify-center ${theme.bg} border ${theme.border} ${theme.text} ${theme.glow} shadow-sm transition-all duration-300 group-hover:scale-105 flex-shrink-0 select-none relative overflow-hidden backdrop-blur-md`}
    >
      {/* Soft glass highlight reflection */}
      <div className="absolute top-0 right-0 w-8 h-8 bg-white/40 rounded-full blur-[6px] pointer-events-none -mr-2 -mt-2" />
      {getVehicleIconSvg(type, `${iconSize} ${theme.text} transition-transform duration-300 group-hover:scale-110`)}
    </div>
  );
}
