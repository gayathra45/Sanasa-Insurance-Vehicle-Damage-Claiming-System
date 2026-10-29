"use client";

import React, { useState } from "react";
import {
  getDiagramForCategory,
  VehicleViewType,
  CategoryDiagramSpec
} from "../utils/vehicleDiagramData";

export interface DamagePhoto {
  url: string;
  caption?: string;
  uploadedAt?: string;
}

export interface DamageMarker {
  id: string;
  view: VehicleViewType;
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  partName: string;
  damageType: string;
  severity: "Minor" | "Moderate" | "Severe" | "Critical";
  isPreExisting: boolean;
  description?: string;
  estimatedRepairCost?: number;
  photos?: DamagePhoto[];
  timestamp?: string;
}

export interface ChecklistItem {
  item: string;
  status: "Good condition" | "Damaged" | "Not inspected" | "Not applicable";
  notes?: string;
  markerId?: string;
}

export interface VehicleCondition {
  odometer?: string;
  fuelLevel?: string;
  recommendedAction?: string;
  preExistingDamage?: string;
}

export interface InspectionData {
  _id?: string;
  claimNumber: string;
  vehiclePlate: string;
  vehicleCategory?: string;
  diagramCategory?: string;
  isFallbackDiagram?: boolean;
  activeView?: VehicleViewType;
  damageMarkers: DamageMarker[];
  checklist: ChecklistItem[];
  vehicleCondition?: VehicleCondition;
  agentNotes?: string;
  totalEstimatedCost?: number;
  status: "Draft" | "Submitted" | "Amended";
  assignedAgent?: string;
  branch?: string;
  submittedAt?: string;
  createdAt?: string;
}

interface VehicleDamageViewerProps {
  inspectionData?: InspectionData | null;
  rawInspectionReport?: string | null;
  vehiclePlate?: string;
  vehicleCategory?: string;
  claimNumber?: string;
  onPhotoClick?: (photoUrl: string) => void;
}

const SEVERITY_COLORS: Record<string, { bg: string; text: string; pinBg: string; border: string }> = {
  Minor: { bg: "bg-amber-50", text: "text-amber-700", pinBg: "#f59e0b", border: "border-amber-200" },
  Moderate: { bg: "bg-orange-50", text: "text-orange-700", pinBg: "#f97316", border: "border-orange-200" },
  Severe: { bg: "bg-red-50", text: "text-red-700", pinBg: "#dc2626", border: "border-red-200" },
  Critical: { bg: "bg-rose-100", text: "text-rose-900", pinBg: "#991b1b", border: "border-rose-400" }
};

export default function VehicleDamageViewer({
  inspectionData,
  rawInspectionReport,
  vehiclePlate = "",
  vehicleCategory = "Car",
  claimNumber = "",
  onPhotoClick
}: VehicleDamageViewerProps) {
  const [activeView, setActiveView] = useState<VehicleViewType>("front");
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [photoPreviewModal, setPhotoPreviewModal] = useState<string | null>(null);

  // Category diagram resolution
  const resolvedCategory = inspectionData?.diagramCategory || vehicleCategory || "Car";
  const diagramSpec: CategoryDiagramSpec = getDiagramForCategory(resolvedCategory);

  const markers: DamageMarker[] = inspectionData?.damageMarkers || [];
  const checklist: ChecklistItem[] = inspectionData?.checklist || [];
  const vehicleCondition: VehicleCondition = inspectionData?.vehicleCondition || {};

  // View switch tabs with marker count
  const views: { id: VehicleViewType; label: string }[] = [
    { id: "front", label: "Front" },
    { id: "rear", label: "Rear" },
    { id: "left", label: "Left Side" },
    { id: "right", label: "Right Side" },
    { id: "top", label: "Top View" }
  ];

  const currentViewMarkers = markers.filter((m) => m.view === activeView);
  const selectedMarker = markers.find((m) => m.id === selectedMarkerId);

  const currentViewSpec = diagramSpec.views[activeView];

  return (
    <div className="space-y-6 text-left">
      {/* Category Notification Banner */}
      {diagramSpec.isFallback && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900 text-xs">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-bold">Standard Vehicle Diagram Fallback Active</p>
            <p className="text-amber-700 mt-0.5">
              Identified category: <strong>{vehicleCategory || diagramSpec.category}</strong>. A generic schematic is displayed for visual marker orientation.
            </p>
          </div>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-950 rounded-2xl p-5 text-white flex flex-wrap justify-between items-center gap-4 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🚗</span>
            <h3 className="text-base font-bold tracking-tight">
              {diagramSpec.displayName} Interactive Damage Inspection
            </h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
              inspectionData?.status === "Submitted"
                ? "bg-emerald-500 text-white"
                : "bg-amber-400 text-slate-900"
            }`}>
              {inspectionData?.status || "Draft"}
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Plate: <strong className="text-white font-mono">{vehiclePlate}</strong> | Category: <strong className="text-white">{diagramSpec.displayName}</strong> {claimNumber && `| Claim #${claimNumber}`}
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="text-right">
            <p className="text-slate-400 text-[10px] uppercase font-bold">Total Markers</p>
            <p className="text-lg font-black text-white">{markers.length}</p>
          </div>
          {inspectionData?.totalEstimatedCost ? (
            <div className="text-right border-l border-slate-700 pl-4">
              <p className="text-slate-400 text-[10px] uppercase font-bold">Est. Repair Loss</p>
              <p className="text-lg font-black text-emerald-400 font-mono">
                LKR {inspectionData.totalEstimatedCost.toLocaleString()}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* View Selector Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {views.map((v) => {
          const count = markers.filter((m) => m.view === v.id).length;
          const isActive = activeView === v.id;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                setActiveView(v.id);
                setSelectedMarkerId(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                isActive
                  ? "bg-blue-900 text-white border-blue-900 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>{v.label}</span>
              {count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    isActive ? "bg-amber-400 text-slate-900" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Diagram & Inspection Pane Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* SVG Interactive Canvas */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center">
          <div className="w-full flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {views.find((v) => v.id === activeView)?.label} Perspective
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              Click marker on diagram to inspect findings
            </span>
          </div>

          <div className="relative w-full aspect-[360/250] max-w-[540px] flex items-center justify-center bg-white rounded-2xl border border-slate-100 overflow-hidden">
            {/* SVG Illustration */}
            <svg
              viewBox={currentViewSpec.viewBox || "0 0 360 250"}
              className="w-full h-full object-contain pointer-events-none select-none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {currentViewSpec.paths.map((p, idx) => {
                if (p.type === "rect") {
                  return (
                    <rect
                      key={idx}
                      x={p.x}
                      y={p.y}
                      width={p.width}
                      height={p.height}
                      rx={p.rx !== undefined ? p.rx : (p.width && p.width > 100 ? 6 : 2)}
                      ry={p.ry}
                      fill={p.fill || "#f1f5f9"}
                      stroke={p.stroke || "#1e293b"}
                      strokeWidth={p.strokeWidth || 2}
                      strokeDasharray={p.strokeDasharray}
                    />
                  );
                }
                if (p.type === "circle") {
                  return (
                    <circle
                      key={idx}
                      cx={p.cx}
                      cy={p.cy}
                      r={p.r}
                      fill={p.fill || "#0f172a"}
                      stroke={p.stroke || "#64748b"}
                      strokeWidth={p.strokeWidth || 2}
                    />
                  );
                }
                if (p.type === "line") {
                  return (
                    <line
                      key={idx}
                      x1={p.x1}
                      y1={p.y1}
                      x2={p.x2}
                      y2={p.y2}
                      stroke={p.stroke || "#1e293b"}
                      strokeWidth={p.strokeWidth || 1.5}
                      strokeDasharray={p.strokeDasharray}
                    />
                  );
                }
                if (p.type === "polygon") {
                  return (
                    <polygon
                      key={idx}
                      points={p.points}
                      fill={p.fill || "#fef08a"}
                      stroke={p.stroke || "#ca8a04"}
                      strokeWidth={p.strokeWidth || 2}
                    />
                  );
                }
                return (
                  <path
                    key={idx}
                    d={p.d}
                    fill={p.fill || "none"}
                    stroke={p.stroke || "#334E68"}
                    strokeWidth={p.strokeWidth || 2}
                    strokeDasharray={p.strokeDasharray}
                  />
                );
              })}
            </svg>

            {/* Damage Markers Layer */}
            {currentViewMarkers.map((marker) => {
              const isSelected = selectedMarkerId === marker.id;
              const sev = SEVERITY_COLORS[marker.severity] || SEVERITY_COLORS.Minor;
              // Marker index within overall report
              const markerNum = markers.findIndex((m) => m.id === marker.id) + 1;

              return (
                <button
                  key={marker.id}
                  type="button"
                  onClick={() => setSelectedMarkerId(isSelected ? null : marker.id)}
                  style={{
                    position: "absolute",
                    left: `${marker.x}%`,
                    top: `${marker.y}%`,
                    transform: "translate(-50%, -50%)"
                  }}
                  className={`group z-20 flex items-center justify-center transition-transform hover:scale-125 focus:outline-none cursor-pointer ${
                    isSelected ? "scale-125 ring-4 ring-blue-500/30" : ""
                  }`}
                  title={`${marker.partName} - ${marker.damageType} (${marker.severity})`}
                >
                  <span
                    style={{ backgroundColor: sev.pinBg }}
                    className="w-7 h-7 rounded-full text-white text-xs font-black flex items-center justify-center shadow-lg border-2 border-white ring-1 ring-black/10"
                  >
                    {markerNum}
                  </span>
                  {marker.isPreExisting && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-white" title="Pre-existing damage" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Diagram Legend */}
          <div className="w-full flex flex-wrap items-center justify-center gap-4 mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Minor
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" /> Moderate
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" /> Severe
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-900 inline-block" /> Critical
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-slate-300 inline-block" /> Pre-existing
            </span>
          </div>
        </div>

        {/* Selected Marker Detail Card OR Marker List */}
        <div className="lg:col-span-5 space-y-4">
          {selectedMarker ? (
            <div className="bg-white rounded-3xl border-2 border-blue-600/30 p-5 shadow-lg space-y-4">
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span
                    style={{ backgroundColor: (SEVERITY_COLORS[selectedMarker.severity] || SEVERITY_COLORS.Minor).pinBg }}
                    className="w-6 h-6 rounded-full text-white text-xs font-black flex items-center justify-center"
                  >
                    {markers.findIndex((m) => m.id === selectedMarker.id) + 1}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 leading-tight">
                      {selectedMarker.partName}
                    </h4>
                    <span className="text-[11px] text-slate-500 capitalize">
                      {selectedMarker.view} perspective
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedMarkerId(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="bg-slate-100 text-slate-800 font-bold px-2.5 py-1 rounded-lg">
                  {selectedMarker.damageType}
                </span>
                <span
                  className={`font-bold px-2.5 py-1 rounded-lg border ${
                    (SEVERITY_COLORS[selectedMarker.severity] || SEVERITY_COLORS.Minor).bg
                  } ${(SEVERITY_COLORS[selectedMarker.severity] || SEVERITY_COLORS.Minor).text} ${
                    (SEVERITY_COLORS[selectedMarker.severity] || SEVERITY_COLORS.Minor).border
                  }`}
                >
                  {selectedMarker.severity} Severity
                </span>
                {selectedMarker.isPreExisting ? (
                  <span className="bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2.5 py-1 rounded-lg">
                    Pre-existing
                  </span>
                ) : (
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-2.5 py-1 rounded-lg">
                    Incident Related
                  </span>
                )}
              </div>

              {/* Description */}
              {selectedMarker.description ? (
                <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-700 leading-relaxed border border-slate-100">
                  <p className="font-bold text-slate-500 text-[10px] uppercase mb-1">Inspector Notes</p>
                  {selectedMarker.description}
                </div>
              ) : null}

              {/* Cost */}
              {selectedMarker.estimatedRepairCost ? (
                <div className="flex justify-between items-center text-xs bg-slate-50 p-3 rounded-xl border border-slate-100 font-medium">
                  <span className="text-slate-500">Estimated Part Repair:</span>
                  <span className="font-bold text-emerald-700 font-mono">
                    LKR {selectedMarker.estimatedRepairCost.toLocaleString()}
                  </span>
                </div>
              ) : null}

              {/* Evidence Photos */}
              {selectedMarker.photos && selectedMarker.photos.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-slate-600 uppercase mb-2">
                    Evidence Photos ({selectedMarker.photos.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedMarker.photos.map((p, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          if (onPhotoClick) onPhotoClick(p.url);
                          else setPhotoPreviewModal(p.url);
                        }}
                        className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 cursor-pointer hover:opacity-85 transition-opacity group"
                      >
                        <img src={p.url} alt={p.caption || "Damage photo"} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                          🔍
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Damage Items List */
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Damage Findings ({markers.length})
                </h4>
                <span className="text-[10px] text-slate-400">Click to view on diagram</span>
              </div>

              {markers.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">
                  No damage markers recorded for this vehicle.
                </p>
              ) : (
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {markers.map((m, idx) => {
                    const sev = SEVERITY_COLORS[m.severity] || SEVERITY_COLORS.Minor;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setActiveView(m.view);
                          setSelectedMarkerId(m.id);
                        }}
                        className="w-full text-left p-3 rounded-2xl bg-slate-50 hover:bg-blue-50/50 border border-slate-100 hover:border-blue-200 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            style={{ backgroundColor: sev.pinBg }}
                            className="w-5 h-5 rounded-full text-white text-[10px] font-black flex items-center justify-center flex-shrink-0"
                          >
                            {idx + 1}
                          </span>
                          <div>
                            <p className="text-xs font-bold text-slate-900 group-hover:text-blue-900 leading-tight">
                              {m.partName}
                            </p>
                            <p className="text-[10px] text-slate-500 capitalize">
                              {m.damageType} • {m.view}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${sev.bg} ${sev.text}`}>
                            {m.severity}
                          </span>
                          {m.photos && m.photos.length > 0 && (
                            <span className="text-[10px] text-slate-500">📷 {m.photos.length}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Component Checklist Table */}
      {checklist.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span>📋</span> Category Inspection Checklist ({diagramSpec.displayName})
            </h4>
            <span className="text-xs text-slate-500 font-medium">
              {checklist.filter((c) => c.status === "Good condition").length} Good • {checklist.filter((c) => c.status === "Damaged").length} Damaged
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {checklist.map((item, idx) => {
              let badgeBg = "bg-slate-100 text-slate-600";
              if (item.status === "Good condition") badgeBg = "bg-emerald-50 text-emerald-700 border-emerald-200 border";
              if (item.status === "Damaged") badgeBg = "bg-red-50 text-red-700 border-red-200 border";
              if (item.status === "Not inspected") badgeBg = "bg-amber-50 text-amber-700 border-amber-200 border";

              return (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                >
                  <span className="font-bold text-slate-700">{item.item}</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${badgeBg}`}>
                    {item.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* General Vehicle Condition Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Mileage (Odometer)</p>
          <p className="text-base font-black text-slate-900 mt-1">
            {vehicleCondition.odometer ? `${vehicleCondition.odometer} km` : "N/A"}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Fuel Level</p>
          <p className="text-base font-black text-blue-900 mt-1">
            {vehicleCondition.fuelLevel || "N/A"}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Recommendation</p>
          <p className="text-sm font-bold text-emerald-700 mt-1">
            {vehicleCondition.recommendedAction || "Repairable (Minor)"}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Report Status</p>
          <p className="text-sm font-bold text-slate-800 mt-1">
            {inspectionData?.status === "Submitted" ? "Finalized & Locked" : "Draft / In Progress"}
          </p>
        </div>
      </div>

      {/* Pre-Existing & Agent Notes */}
      {(vehicleCondition.preExistingDamage || inspectionData?.agentNotes || rawInspectionReport) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vehicleCondition.preExistingDamage && (
            <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 text-xs">
              <p className="font-bold text-amber-900 uppercase text-[10px] mb-1">Pre-Existing Damage Notes</p>
              <p className="text-amber-800 leading-relaxed">{vehicleCondition.preExistingDamage}</p>
            </div>
          )}

          {(inspectionData?.agentNotes || rawInspectionReport) && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs">
              <p className="font-bold text-slate-600 uppercase text-[10px] mb-1">Agent Physical Inspection Notes</p>
              <p className="text-slate-800 leading-relaxed font-mono whitespace-pre-wrap">
                {inspectionData?.agentNotes || rawInspectionReport}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Photo Preview Modal */}
      {photoPreviewModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPhotoPreviewModal(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-slate-900 rounded-3xl overflow-hidden p-2 shadow-2xl">
            <button
              onClick={() => setPhotoPreviewModal(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/50 text-white font-bold flex items-center justify-center hover:bg-black/80 cursor-pointer"
            >
              ✕
            </button>
            <img src={photoPreviewModal} alt="Damage evidence enlarged" className="max-w-full max-h-[85vh] object-contain rounded-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
