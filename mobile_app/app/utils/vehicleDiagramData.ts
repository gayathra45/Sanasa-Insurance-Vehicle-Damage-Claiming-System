/**
 * Clean, Simple, Realistic Automotive Blueprint Vector Schematics
 * SANASA Insurance Claim Inspection System
 *
 * ViewBox:
 * - Front & Rear: "0 0 360 250"
 * - Left & Right Side: "0 0 360 240"
 * - Top: "0 0 360 250"
 *
 * Modeled directly on standard automotive appraisal line art (Reference Image 3)
 * with generous vertical height (~85-90% vertical space fill), realistic smooth curves,
 * and large touch areas for effortless part identification and damage pin placement:
 * 1. Car (Modern 4-Door Sedan)
 * 2. Motorcycle (Realistic Street Commuter / Discover / Pulsar / Scooter)
 * 3. Three-Wheeler (Authentic Sri Lankan Bajaj RE Tuk-Tuk)
 * 4. SUV (Modern Elevated Crossover / 4x4 / Double Cab)
 * 5. Van (Passenger Van / Microbus)
 * 6. Lorry (Commercial Lorry / Truck)
 * 7. Bus (Commercial Coach / Bus)
 * 8. Tractor (Agricultural Utility Tractor)
 */

export type VehicleViewType = "front" | "rear" | "left" | "right" | "top";

export interface VehiclePartHotspot {
  partName: string;
  defaultX: number; // 0 - 100 percentage
  defaultY: number; // 0 - 100 percentage
}

export interface DiagramPathItem {
  d?: string;
  type?: "rect" | "circle" | "path" | "polygon" | "line";
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  cx?: number;
  cy?: number;
  r?: number;
  rx?: number;
  ry?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  points?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  fill?: string;
  partName?: string;
}

export interface ViewDiagramSpec {
  view: VehicleViewType;
  label: string;
  viewBox: string;
  paths: DiagramPathItem[];
  hotspots: VehiclePartHotspot[];
}

export interface CategoryDiagramSpec {
  category: string;
  displayName: string;
  icon: string;
  isFallback?: boolean;
  views: Record<VehicleViewType, ViewDiagramSpec>;
}

// Helper to calculate nearest part name given tap coordinates (x%, y%)
export function findClosestPart(
  hotspots: VehiclePartHotspot[],
  x: number,
  y: number,
  fallback = "Body Panel"
): string {
  if (!hotspots || hotspots.length === 0) return fallback;
  let closest = hotspots[0];
  let minDistance = Number.MAX_VALUE;

  for (const h of hotspots) {
    const dx = h.defaultX - x;
    const dy = h.defaultY - y;
    const dist = dx * dx + dy * dy;
    if (dist < minDistance) {
      minDistance = dist;
      closest = h;
    }
  }

  return closest ? closest.partName : fallback;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. CAR SPECIFICATION (Clean, Proportional Sedan Blueprint - Image 3 Reference)
// ─────────────────────────────────────────────────────────────────────────────
export const CAR_SPEC: CategoryDiagramSpec = {
  category: "Car",
  displayName: "Sedan / Passenger Car",
  icon: "car",
  views: {
    front: {
      view: "front",
      label: "Front View",
      viewBox: "0 0 360 250",
      paths: [
        // Ground line
        { type: "line", x1: 20, y1: 236, x2: 340, y2: 236, stroke: "#cbd5e1", strokeWidth: 1.5 },
        // Front Tires (Firmly touching ground y=236)
        { type: "rect", x: 48, y: 184, width: 26, height: 52, rx: 4, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.6, partName: "Left Front Wheel" },
        { type: "rect", x: 286, y: 184, width: 26, height: 52, rx: 4, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.6, partName: "Right Front Wheel" },

        // Roof Crown (Smooth curved automotive roofline)
        {
          type: "path",
          d: "M 116,52 C 140,24 220,24 244,52 L 274,120 L 86,120 Z",
          fill: "#ffffff",
          stroke: "#0f172a",
          strokeWidth: 2,
          partName: "Roof Panel"
        },
        // Arched Windscreen Glass (crystal blue tint, tall clear tap target)
        {
          type: "path",
          d: "M 120,54 C 142,28 218,28 240,54 L 268,118 L 92,118 Z",
          fill: "#e0f2fe",
          stroke: "#0284c7",
          strokeWidth: 1.5,
          partName: "Windscreen"
        },
        // Rearview Mirror inside
        { type: "rect", x: 173, y: 42, width: 14, height: 8, rx: 2, fill: "#1e293b" },
        // Windshield Wipers
        { type: "line", x1: 110, y1: 116, x2: 168, y2: 105, stroke: "#0f172a", strokeWidth: 2 },
        { type: "line", x1: 184, y1: 116, x2: 242, y2: 105, stroke: "#0f172a", strokeWidth: 2 },

        // Side Mirrors
        {
          type: "path",
          d: "M 64,104 C 54,104 54,122 66,122 L 86,120 L 84,106 Z",
          fill: "#ffffff",
          stroke: "#0f172a",
          strokeWidth: 1.6,
          partName: "Left Mirror"
        },
        {
          type: "path",
          d: "M 296,104 C 306,104 306,122 294,122 L 274,120 L 276,106 Z",
          fill: "#ffffff",
          stroke: "#0f172a",
          strokeWidth: 1.6,
          partName: "Right Mirror"
        },

        // Bonnet / Hood & Fenders
        { type: "polygon", points: "86,120 274,120 312,164 48,164", fill: "#ffffff", stroke: "#0f172a", strokeWidth: 2, partName: "Bonnet / Hood" },
        // Hood Creases
        { type: "line", x1: 126, y1: 120, x2: 108, y2: 164, stroke: "#64748b", strokeWidth: 1.4 },
        { type: "line", x1: 234, y1: 120, x2: 252, y2: 164, stroke: "#64748b", strokeWidth: 1.4 },

        // Almond Headlights (matching Image 3)
        {
          type: "path",
          d: "M 50,164 C 50,150 108,148 114,164 C 108,178 54,178 50,164 Z",
          fill: "#fef9c3",
          stroke: "#ca8a04",
          strokeWidth: 1.6,
          partName: "Left Headlight"
        },
        { type: "circle", cx: 82, cy: 164, r: 5.5, fill: "#ffffff", stroke: "#ca8a04", strokeWidth: 1.2 },
        {
          type: "path",
          d: "M 310,164 C 310,150 252,148 246,164 C 252,178 306,178 310,164 Z",
          fill: "#fef9c3",
          stroke: "#ca8a04",
          strokeWidth: 1.6,
          partName: "Right Headlight"
        },
        { type: "circle", cx: 278, cy: 164, r: 5.5, fill: "#ffffff", stroke: "#ca8a04", strokeWidth: 1.2 },

        // Front Grille & Center Emblem
        {
          type: "path",
          d: "M 122,162 C 140,160 220,160 238,162 L 232,186 C 216,188 144,188 128,186 Z",
          fill: "#0f172a",
          stroke: "#0f172a",
          strokeWidth: 1.4,
          partName: "Radiator Grille"
        },
        { type: "line", x1: 130, y1: 172, x2: 230, y2: 172, stroke: "#64748b", strokeWidth: 1.2 },
        { type: "circle", cx: 180, cy: 173, r: 5, fill: "#ffffff", stroke: "#2563eb", strokeWidth: 1.2 },

        // Front Bumper (Broad, contoured, large tap area)
        {
          type: "path",
          d: "M 44,166 L 316,166 C 318,196 312,224 306,232 L 54,232 C 48,224 42,196 44,166 Z",
          fill: "#f8fafc",
          stroke: "#0f172a",
          strokeWidth: 2,
          partName: "Front Bumper"
        },
        // Fog Lamps
        { type: "rect", x: 62, y: 196, width: 22, height: 12, rx: 3, fill: "#fef08a", stroke: "#ca8a04", strokeWidth: 1.2, partName: "Left Fog Lamp" },
        { type: "rect", x: 276, y: 196, width: 22, height: 12, rx: 3, fill: "#fef08a", stroke: "#ca8a04", strokeWidth: 1.2, partName: "Right Fog Lamp" },
        // Front License Plate
        { type: "rect", x: 135, y: 196, width: 90, height: 22, rx: 2, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 1.4, partName: "Front License Plate" },
        // Lower Air Intake
        { type: "rect", x: 110, y: 224, width: 140, height: 6, rx: 2, fill: "#334155" }
      ],
      hotspots: [
        { partName: "Roof Panel", defaultX: 50, defaultY: 16 },
        { partName: "Windscreen", defaultX: 50, defaultY: 34 },
        { partName: "Left Mirror", defaultX: 20, defaultY: 45 },
        { partName: "Right Mirror", defaultX: 80, defaultY: 45 },
        { partName: "Bonnet / Hood", defaultX: 50, defaultY: 57 },
        { partName: "Left Headlight", defaultX: 23, defaultY: 66 },
        { partName: "Right Headlight", defaultX: 77, defaultY: 66 },
        { partName: "Radiator Grille", defaultX: 50, defaultY: 70 },
        { partName: "Front Bumper", defaultX: 50, defaultY: 82 },
        { partName: "Front License Plate", defaultX: 50, defaultY: 82 },
        { partName: "Left Front Wheel", defaultX: 17, defaultY: 84 },
        { partName: "Right Front Wheel", defaultX: 83, defaultY: 84 }
      ]
    },
    rear: {
      view: "rear",
      label: "Rear View",
      viewBox: "0 0 360 250",
      paths: [
        // Ground line
        { type: "line", x1: 20, y1: 236, x2: 340, y2: 236, stroke: "#cbd5e1", strokeWidth: 1.5 },
        // Rear Tires
        { type: "rect", x: 48, y: 184, width: 26, height: 52, rx: 4, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.6, partName: "Left Rear Wheel" },
        { type: "rect", x: 286, y: 184, width: 26, height: 52, rx: 4, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.6, partName: "Right Rear Wheel" },

        // Roof Crown & High-Mount 3rd Brake Light
        {
          type: "path",
          d: "M 116,52 C 140,24 220,24 244,52 L 274,120 L 86,120 Z",
          fill: "#ffffff",
          stroke: "#0f172a",
          strokeWidth: 2,
          partName: "Roof Panel"
        },
        { type: "rect", x: 165, y: 36, width: 30, height: 6, rx: 2, fill: "#ef4444", stroke: "#b91c1c", strokeWidth: 1, partName: "3rd Brake Light" },

        // Rear Windscreen with Defroster Lines
        {
          type: "path",
          d: "M 120,54 C 142,28 218,28 240,54 L 268,118 L 92,118 Z",
          fill: "#e0f2fe",
          stroke: "#0284c7",
          strokeWidth: 1.5,
          partName: "Rear Windscreen"
        },
        { type: "line", x1: 120, y1: 74, x2: 240, y2: 74, stroke: "#94a3b8", strokeWidth: 1, strokeDasharray: "6,3" },
        { type: "line", x1: 110, y1: 90, x2: 250, y2: 90, stroke: "#94a3b8", strokeWidth: 1, strokeDasharray: "6,3" },
        { type: "line", x1: 100, y1: 104, x2: 260, y2: 104, stroke: "#94a3b8", strokeWidth: 1, strokeDasharray: "6,3" },

        // Boot / Trunk Lid Body
        { type: "polygon", points: "86,120 274,120 312,164 48,164", fill: "#ffffff", stroke: "#0f172a", strokeWidth: 2, partName: "Boot / Trunk Lid" },
        { type: "line", x1: 114, y1: 120, x2: 104, y2: 164, stroke: "#64748b", strokeWidth: 1.4 },
        { type: "line", x1: 246, y1: 120, x2: 256, y2: 164, stroke: "#64748b", strokeWidth: 1.4 },
        { type: "circle", cx: 180, cy: 128, r: 4, fill: "#ffffff", stroke: "#2563eb", strokeWidth: 1.2 },
        // Rear License Plate
        { type: "rect", x: 135, y: 136, width: 90, height: 22, rx: 2, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 1.4, partName: "Rear License Plate" },

        // Wraparound Taillights (matching Image 3)
        {
          type: "path",
          d: "M 50,164 C 50,150 108,148 114,164 C 108,178 54,178 50,164 Z",
          fill: "#ef4444",
          stroke: "#b91c1c",
          strokeWidth: 1.6,
          partName: "Left Tail Light"
        },
        { type: "rect", x: 84, y: 158, width: 22, height: 10, rx: 2, fill: "#f59e0b" },
        {
          type: "path",
          d: "M 310,164 C 310,150 252,148 246,164 C 252,178 306,178 310,164 Z",
          fill: "#ef4444",
          stroke: "#b91c1c",
          strokeWidth: 1.6,
          partName: "Right Tail Light"
        },
        { type: "rect", x: 254, y: 158, width: 22, height: 10, rx: 2, fill: "#f59e0b" },

        // Rear Bumper Body
        {
          type: "path",
          d: "M 44,166 L 316,166 C 318,196 312,224 306,232 L 54,232 C 48,224 42,196 44,166 Z",
          fill: "#f8fafc",
          stroke: "#0f172a",
          strokeWidth: 2,
          partName: "Rear Bumper"
        },
        // Reflectors
        { type: "rect", x: 66, y: 198, width: 28, height: 7, rx: 2, fill: "#ef4444" },
        { type: "rect", x: 266, y: 198, width: 28, height: 7, rx: 2, fill: "#ef4444" },
        // Dual Exhaust Tips
        { type: "rect", x: 74, y: 228, width: 16, height: 8, rx: 2, fill: "#94a3b8", stroke: "#475569", strokeWidth: 1.2, partName: "Exhaust System" },
        { type: "rect", x: 270, y: 228, width: 16, height: 8, rx: 2, fill: "#94a3b8", stroke: "#475569", strokeWidth: 1.2, partName: "Exhaust System" }
      ],
      hotspots: [
        { partName: "Roof Panel", defaultX: 50, defaultY: 16 },
        { partName: "Rear Windscreen", defaultX: 50, defaultY: 34 },
        { partName: "Boot / Trunk Lid", defaultX: 50, defaultY: 55 },
        { partName: "Rear License Plate", defaultX: 50, defaultY: 58 },
        { partName: "Left Tail Light", defaultX: 23, defaultY: 66 },
        { partName: "Right Tail Light", defaultX: 77, defaultY: 66 },
        { partName: "Rear Bumper", defaultX: 50, defaultY: 82 },
        { partName: "Left Rear Wheel", defaultX: 17, defaultY: 84 },
        { partName: "Right Rear Wheel", defaultX: 83, defaultY: 84 },
        { partName: "Exhaust System", defaultX: 77, defaultY: 92 }
      ]
    },
    left: {
      view: "left",
      label: "Left Side View",
      viewBox: "0 0 360 240",
      paths: [
        // Ground line
        { type: "line", x1: 10, y1: 206, x2: 350, y2: 206, stroke: "#cbd5e1", strokeWidth: 1.5 },

        // Alloy Wheels (Front cx=76, Rear cx=284, cy=176, r=30, touches ground y=206)
        { type: "circle", cx: 76, cy: 176, r: 30, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Left Front Wheel" },
        { type: "circle", cx: 76, cy: 176, r: 21, fill: "#94a3b8", stroke: "#cbd5e1", strokeWidth: 1.2 },
        { type: "circle", cx: 76, cy: 176, r: 8, fill: "#f8fafc", stroke: "#475569", strokeWidth: 1.2 },
        // 5 Spokes
        { type: "line", x1: 76, y1: 157, x2: 76, y2: 169, stroke: "#f8fafc", strokeWidth: 2.5 },
        { type: "line", x1: 93, y1: 170, x2: 83, y2: 173, stroke: "#f8fafc", strokeWidth: 2.5 },
        { type: "line", x1: 87, y1: 191, x2: 79, y2: 181, stroke: "#f8fafc", strokeWidth: 2.5 },
        { type: "line", x1: 65, y1: 191, x2: 73, y2: 181, stroke: "#f8fafc", strokeWidth: 2.5 },
        { type: "line", x1: 59, y1: 170, x2: 69, y2: 173, stroke: "#f8fafc", strokeWidth: 2.5 },

        { type: "circle", cx: 284, cy: 176, r: 30, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Left Rear Wheel" },
        { type: "circle", cx: 284, cy: 176, r: 21, fill: "#94a3b8", stroke: "#cbd5e1", strokeWidth: 1.2 },
        { type: "circle", cx: 284, cy: 176, r: 8, fill: "#f8fafc", stroke: "#475569", strokeWidth: 1.2 },
        { type: "line", x1: 284, y1: 157, x2: 284, y2: 169, stroke: "#f8fafc", strokeWidth: 2.5 },
        { type: "line", x1: 301, y1: 170, x2: 291, y2: 173, stroke: "#f8fafc", strokeWidth: 2.5 },
        { type: "line", x1: 295, y1: 191, x2: 287, y2: 181, stroke: "#f8fafc", strokeWidth: 2.5 },
        { type: "line", x1: 273, y1: 191, x2: 281, y2: 181, stroke: "#f8fafc", strokeWidth: 2.5 },
        { type: "line", x1: 267, y1: 170, x2: 277, y2: 173, stroke: "#f8fafc", strokeWidth: 2.5 },

        // Swept Aerodynamic Sedan Body Silhouette (Directly matching Image 3)
        {
          type: "path",
          d: "M 18,154 C 18,140 32,126 62,118 L 115,104 C 132,68 156,42 196,40 C 226,40 252,48 280,102 L 334,106 C 344,110 344,136 338,160 L 326,180 L 314,180 A 35,35 0 0 0 254,180 L 106,180 A 35,35 0 0 0 46,180 L 22,180 Z",
          fill: "#ffffff",
          stroke: "#0f172a",
          strokeWidth: 2,
          partName: "Left Body Panels"
        },
        // Rocker Panel Sill
        { type: "line", x1: 106, y1: 180, x2: 254, y2: 180, stroke: "#334155", strokeWidth: 3.5, partName: "Rocker Panel" },

        // Side Windows (Generous height & tap targets)
        {
          type: "polygon",
          points: "124,102 160,54 188,54 188,102",
          fill: "#e0f2fe",
          stroke: "#0284c7",
          strokeWidth: 1.4,
          partName: "Left Front Window"
        },
        { type: "rect", x: 188, y: 50, width: 7, height: 56, fill: "#1e293b" },
        {
          type: "path",
          d: "M 195,54 L 222,54 C 242,58 260,78 272,102 L 195,102 Z",
          fill: "#e0f2fe",
          stroke: "#0284c7",
          strokeWidth: 1.4,
          partName: "Left Rear Window"
        },
        { type: "line", x1: 252, y1: 76, x2: 252, y2: 102, stroke: "#1e293b", strokeWidth: 1.2 },

        // Protective Door Rub Strips (matching Image 3)
        { type: "rect", x: 112, y: 138, width: 76, height: 4, rx: 2, fill: "#475569" },
        { type: "rect", x: 194, y: 138, width: 66, height: 4, rx: 2, fill: "#475569" },

        // Panel Shut Lines
        { type: "line", x1: 40, y1: 124, x2: 46, y2: 160, stroke: "#475569", strokeWidth: 1.4, partName: "Front Bumper" },
        { type: "line", x1: 114, y1: 104, x2: 108, y2: 180, stroke: "#475569", strokeWidth: 1.4, partName: "Left Front Fender" },
        { type: "line", x1: 191, y1: 102, x2: 191, y2: 180, stroke: "#475569", strokeWidth: 1.4, partName: "Left Front Door" },
        { type: "path", d: "M 274,102 C 268,124 262,152 254,180", stroke: "#475569", strokeWidth: 1.4, fill: "none", partName: "Left Rear Door" },
        { type: "line", x1: 326, y1: 110, x2: 312, y2: 166, stroke: "#475569", strokeWidth: 1.4, partName: "Left Quarter Panel" },

        // Door Handles
        { type: "rect", x: 156, y: 114, width: 18, height: 5, rx: 2, fill: "#cbd5e1", stroke: "#64748b", strokeWidth: 1 },
        { type: "rect", x: 228, y: 114, width: 18, height: 5, rx: 2, fill: "#cbd5e1", stroke: "#64748b", strokeWidth: 1 },

        // Side Mirror
        {
          type: "path",
          d: "M 114,94 C 104,94 104,108 116,108 L 128,106 L 128,96 Z",
          fill: "#ffffff",
          stroke: "#0f172a",
          strokeWidth: 1.5,
          partName: "Left Mirror"
        },

        // Wraparound Lights
        { type: "polygon", points: "18,154 36,134 50,130 42,154", fill: "#fef9c3", stroke: "#ca8a04", strokeWidth: 1.2 },
        { type: "polygon", points: "334,106 342,136 328,138 326,112", fill: "#ef4444", stroke: "#b91c1c", strokeWidth: 1.2 }
      ],
      hotspots: [
        { partName: "Front Bumper", defaultX: 8, defaultY: 65 },
        { partName: "Left Front Fender", defaultX: 22, defaultY: 54 },
        { partName: "Left Front Wheel", defaultX: 21, defaultY: 73 },
        { partName: "Left Front Door", defaultX: 42, defaultY: 54 },
        { partName: "Left Front Window", defaultX: 42, defaultY: 31 },
        { partName: "Roof Panel", defaultX: 52, defaultY: 18 },
        { partName: "Left Rear Window", defaultX: 63, defaultY: 31 },
        { partName: "Left Rear Door", defaultX: 62, defaultY: 54 },
        { partName: "Left Rear Wheel", defaultX: 79, defaultY: 73 },
        { partName: "Left Quarter Panel", defaultX: 80, defaultY: 54 },
        { partName: "Rear Bumper", defaultX: 92, defaultY: 69 },
        { partName: "Rocker Panel", defaultX: 52, defaultY: 75 }
      ]
    },
    right: {
      view: "right",
      label: "Right Side View",
      viewBox: "0 0 360 240",
      paths: [
        // Ground line
        { type: "line", x1: 10, y1: 206, x2: 350, y2: 206, stroke: "#cbd5e1", strokeWidth: 1.5 },

        // Alloy Wheels (Front cx=284, Rear cx=76, cy=176, r=30)
        { type: "circle", cx: 284, cy: 176, r: 30, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Right Front Wheel" },
        { type: "circle", cx: 284, cy: 176, r: 21, fill: "#94a3b8", stroke: "#cbd5e1", strokeWidth: 1.2 },
        { type: "circle", cx: 284, cy: 176, r: 8, fill: "#f8fafc", stroke: "#475569", strokeWidth: 1.2 },
        { type: "line", x1: 284, y1: 157, x2: 284, y2: 169, stroke: "#f8fafc", strokeWidth: 2.5 },
        { type: "line", x1: 301, y1: 170, x2: 291, y2: 173, stroke: "#f8fafc", strokeWidth: 2.5 },
        { type: "line", x1: 295, y1: 191, x2: 287, y2: 181, stroke: "#f8fafc", strokeWidth: 2.5 },
        { type: "line", x1: 273, y1: 191, x2: 281, y2: 181, stroke: "#f8fafc", strokeWidth: 2.5 },
        { type: "line", x1: 267, y1: 170, x2: 277, y2: 173, stroke: "#f8fafc", strokeWidth: 2.5 },

        { type: "circle", cx: 76, cy: 176, r: 30, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Right Rear Wheel" },
        { type: "circle", cx: 76, cy: 176, r: 21, fill: "#94a3b8", stroke: "#cbd5e1", strokeWidth: 1.2 },
        { type: "circle", cx: 76, cy: 176, r: 8, fill: "#f8fafc", stroke: "#475569", strokeWidth: 1.2 },
        { type: "line", x1: 76, y1: 157, x2: 76, y2: 169, stroke: "#f8fafc", strokeWidth: 2.5 },
        { type: "line", x1: 93, y1: 170, x2: 83, y2: 173, stroke: "#f8fafc", strokeWidth: 2.5 },
        { type: "line", x1: 87, y1: 191, x2: 79, y2: 181, stroke: "#f8fafc", strokeWidth: 2.5 },
        { type: "line", x1: 65, y1: 191, x2: 73, y2: 181, stroke: "#f8fafc", strokeWidth: 2.5 },
        { type: "line", x1: 59, y1: 170, x2: 69, y2: 173, stroke: "#f8fafc", strokeWidth: 2.5 },

        // Mirrored Body Silhouette
        {
          type: "path",
          d: "M 342,154 C 342,140 328,126 298,118 L 245,104 C 228,68 204,42 164,40 C 134,40 108,48 80,102 L 26,106 C 16,110 16,136 22,160 L 34,180 L 46,180 A 35,35 0 0 1 106,180 L 254,180 A 35,35 0 0 1 314,180 L 338,180 Z",
          fill: "#ffffff",
          stroke: "#0f172a",
          strokeWidth: 2,
          partName: "Right Body Panels"
        },
        // Rocker Panel Sill
        { type: "line", x1: 106, y1: 180, x2: 254, y2: 180, stroke: "#334155", strokeWidth: 3.5, partName: "Rocker Panel" },

        // Windows
        {
          type: "polygon",
          points: "236,102 200,54 172,54 172,102",
          fill: "#e0f2fe",
          stroke: "#0284c7",
          strokeWidth: 1.4,
          partName: "Right Front Window"
        },
        { type: "rect", x: 165, y: 50, width: 7, height: 56, fill: "#1e293b" },
        {
          type: "path",
          d: "M 165,54 L 138,54 C 118,58 100,78 88,102 L 165,102 Z",
          fill: "#e0f2fe",
          stroke: "#0284c7",
          strokeWidth: 1.4,
          partName: "Right Rear Window"
        },
        { type: "line", x1: 108, y1: 76, x2: 108, y2: 102, stroke: "#1e293b", strokeWidth: 1.2 },

        // Rub Strips
        { type: "rect", x: 172, y: 138, width: 76, height: 4, rx: 2, fill: "#475569" },
        { type: "rect", x: 100, y: 138, width: 66, height: 4, rx: 2, fill: "#475569" },

        // Panel Shut Lines
        { type: "line", x1: 320, y1: 124, x2: 314, y2: 160, stroke: "#475569", strokeWidth: 1.4, partName: "Front Bumper" },
        { type: "line", x1: 246, y1: 104, x2: 252, y2: 180, stroke: "#475569", strokeWidth: 1.4, partName: "Right Front Fender" },
        { type: "line", x1: 169, y1: 102, x2: 169, y2: 180, stroke: "#475569", strokeWidth: 1.4, partName: "Right Front Door" },
        { type: "path", d: "M 86,102 C 92,124 98,152 106,180", stroke: "#475569", strokeWidth: 1.4, fill: "none", partName: "Right Rear Door" },
        { type: "line", x1: 34, y1: 110, x2: 48, y2: 166, stroke: "#475569", strokeWidth: 1.4, partName: "Right Quarter Panel" },

        // Fuel Filler Cap
        { type: "circle", cx: 84, cy: 104, r: 6.5, fill: "#ffffff", stroke: "#94a3b8", strokeWidth: 1.4, partName: "Fuel Filler Cap" },

        // Door Handles
        { type: "rect", x: 186, y: 114, width: 18, height: 5, rx: 2, fill: "#cbd5e1", stroke: "#64748b", strokeWidth: 1 },
        { type: "rect", x: 114, y: 114, width: 18, height: 5, rx: 2, fill: "#cbd5e1", stroke: "#64748b", strokeWidth: 1 },

        // Side Mirror
        {
          type: "path",
          d: "M 246,94 C 256,94 256,108 244,108 L 232,106 L 232,96 Z",
          fill: "#ffffff",
          stroke: "#0f172a",
          strokeWidth: 1.5,
          partName: "Right Mirror"
        },

        // Lights
        { type: "polygon", points: "342,154 324,134 310,130 318,154", fill: "#fef9c3", stroke: "#ca8a04", strokeWidth: 1.2 },
        { type: "polygon", points: "26,106 18,136 32,138 34,112", fill: "#ef4444", stroke: "#b91c1c", strokeWidth: 1.2 }
      ],
      hotspots: [
        { partName: "Front Bumper", defaultX: 92, defaultY: 65 },
        { partName: "Right Front Fender", defaultX: 78, defaultY: 54 },
        { partName: "Right Front Wheel", defaultX: 79, defaultY: 73 },
        { partName: "Right Front Door", defaultX: 58, defaultY: 54 },
        { partName: "Right Front Window", defaultX: 58, defaultY: 31 },
        { partName: "Roof Panel", defaultX: 48, defaultY: 18 },
        { partName: "Right Rear Window", defaultX: 37, defaultY: 31 },
        { partName: "Right Rear Door", defaultX: 38, defaultY: 54 },
        { partName: "Right Rear Wheel", defaultX: 21, defaultY: 73 },
        { partName: "Right Quarter Panel", defaultX: 20, defaultY: 54 },
        { partName: "Rear Bumper", defaultX: 8, defaultY: 69 },
        { partName: "Rocker Panel", defaultX: 48, defaultY: 75 }
      ]
    },
    top: {
      view: "top",
      label: "Top View",
      viewBox: "0 0 360 250",
      paths: [
        // Realistic Contoured Automotive Body (Matching Image 3 center, 158px wide!)
        {
          type: "path",
          d: "M 26,125 C 26,76 48,46 82,46 L 278,46 C 312,46 334,76 334,125 C 334,174 312,204 278,204 L 82,204 C 48,204 26,174 26,125 Z",
          fill: "#ffffff",
          stroke: "#0f172a",
          strokeWidth: 2,
          partName: "Car Body Outline"
        },

        // Front Bumper Zone
        {
          type: "path",
          d: "M 26,125 C 26,76 48,46 64,46 L 64,204 C 48,204 26,174 26,125 Z",
          fill: "#f8fafc",
          stroke: "#0f172a",
          strokeWidth: 1.6,
          partName: "Front Bumper"
        },

        // Corner Headlights
        { type: "polygon", points: "44,52 68,52 68,74 40,68", fill: "#fef9c3", stroke: "#ca8a04", strokeWidth: 1.4, partName: "Left Headlight" },
        { type: "polygon", points: "44,198 68,198 68,176 40,182", fill: "#fef9c3", stroke: "#ca8a04", strokeWidth: 1.4, partName: "Right Headlight" },

        // Bonnet / Hood with Longitudinal Shut Lines
        { type: "polygon", points: "64,46 132,46 132,204 64,204", fill: "#ffffff", stroke: "#0f172a", strokeWidth: 1.6, partName: "Bonnet / Hood" },
        { type: "line", x1: 64, y1: 68, x2: 132, y2: 68, stroke: "#64748b", strokeWidth: 1.4, partName: "Left Front Fender" },
        { type: "line", x1: 64, y1: 182, x2: 132, y2: 182, stroke: "#64748b", strokeWidth: 1.4, partName: "Right Front Fender" },

        // Front Windscreen (curved glass rake)
        { type: "polygon", points: "132,46 178,54 178,196 132,204", fill: "#e0f2fe", stroke: "#0284c7", strokeWidth: 1.4, partName: "Windscreen" },
        // Wipers
        { type: "line", x1: 140, y1: 86, x2: 168, y2: 98, stroke: "#0f172a", strokeWidth: 2 },
        { type: "line", x1: 140, y1: 154, x2: 168, y2: 142, stroke: "#0f172a", strokeWidth: 2 },

        // Side Mirrors (extending laterally)
        { type: "rect", x: 142, y: 22, width: 16, height: 24, rx: 4, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 1.6, partName: "Left Mirror" },
        { type: "rect", x: 142, y: 204, width: 16, height: 24, rx: 4, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 1.6, partName: "Right Mirror" },

        // Roof Panel
        { type: "rect", x: 178, y: 54, width: 84, height: 142, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 1.6, partName: "Roof Panel" },
        // Sunroof Inset
        { type: "rect", x: 196, y: 76, width: 48, height: 98, rx: 6, fill: "#1e293b", stroke: "#475569", strokeWidth: 1.4, partName: "Sunroof" },

        // Side Doors / Sill Margins
        { type: "line", x1: 132, y1: 46, x2: 262, y2: 46, stroke: "#0f172a", strokeWidth: 2, partName: "Left Doors / Sill" },
        { type: "line", x1: 132, y1: 204, x2: 262, y2: 204, stroke: "#0f172a", strokeWidth: 2, partName: "Right Doors / Sill" },

        // Rear Windscreen Glass
        { type: "polygon", points: "262,54 298,46 298,204 262,196", fill: "#e0f2fe", stroke: "#0284c7", strokeWidth: 1.4, partName: "Rear Windscreen" },

        // Boot / Trunk Lid
        { type: "polygon", points: "298,46 324,46 324,204 298,204", fill: "#ffffff", stroke: "#0f172a", strokeWidth: 1.6, partName: "Boot / Trunk Lid" },
        { type: "line", x1: 298, y1: 68, x2: 324, y2: 68, stroke: "#64748b", strokeWidth: 1.4, partName: "Left Quarter Panel" },
        { type: "line", x1: 298, y1: 182, x2: 324, y2: 182, stroke: "#64748b", strokeWidth: 1.4, partName: "Right Quarter Panel" },

        // Corner Taillights
        { type: "polygon", points: "314,50 332,56 328,76 312,74", fill: "#ef4444", stroke: "#b91c1c", strokeWidth: 1.4, partName: "Left Tail Light" },
        { type: "polygon", points: "314,200 332,194 328,174 312,176", fill: "#ef4444", stroke: "#b91c1c", strokeWidth: 1.4, partName: "Right Tail Light" },

        // Rear Bumper Section
        {
          type: "path",
          d: "M 324,46 C 330,46 334,74 334,125 C 334,176 330,204 324,204 Z",
          fill: "#f8fafc",
          stroke: "#0f172a",
          strokeWidth: 1.6,
          partName: "Rear Bumper"
        }
      ],
      hotspots: [
        { partName: "Front Bumper", defaultX: 12, defaultY: 50 },
        { partName: "Left Headlight", defaultX: 17, defaultY: 22 },
        { partName: "Right Headlight", defaultX: 17, defaultY: 78 },
        { partName: "Bonnet / Hood", defaultX: 28, defaultY: 50 },
        { partName: "Left Front Fender", defaultX: 27, defaultY: 22 },
        { partName: "Right Front Fender", defaultX: 27, defaultY: 78 },
        { partName: "Windscreen", defaultX: 43, defaultY: 50 },
        { partName: "Left Mirror", defaultX: 42, defaultY: 11 },
        { partName: "Right Mirror", defaultX: 42, defaultY: 89 },
        { partName: "Roof Panel", defaultX: 60, defaultY: 50 },
        { partName: "Sunroof", defaultX: 60, defaultY: 50 },
        { partName: "Rear Windscreen", defaultX: 77, defaultY: 50 },
        { partName: "Boot / Trunk Lid", defaultX: 86, defaultY: 50 },
        { partName: "Left Tail Light", defaultX: 91, defaultY: 24 },
        { partName: "Right Tail Light", defaultX: 91, defaultY: 76 },
        { partName: "Rear Bumper", defaultX: 94, defaultY: 50 }
      ]
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. SUV / CROSSOVER SPECIFICATION (Elevated Stance, Roof Rails, Skid Plate)
// ─────────────────────────────────────────────────────────────────────────────
export const SUV_SPEC: CategoryDiagramSpec = {
  category: "SUV",
  displayName: "SUV / Crossover / 4x4 / Double Cab",
  icon: "car-estate",
  views: {
    front: {
      view: "front",
      label: "Front View",
      viewBox: "0 0 360 250",
      paths: [
        // Roof Rails
        { type: "rect", x: 105, y: 20, width: 150, height: 7, rx: 3, fill: "#334155", stroke: "#0f172a", strokeWidth: 1.2, partName: "Roof Rails" },
        ...CAR_SPEC.views.front.paths,
        // Heavy-duty Skid Plate
        { type: "rect", x: 125, y: 212, width: 110, height: 16, rx: 3, fill: "#cbd5e1", stroke: "#64748b", strokeWidth: 1.4, partName: "Front Skid Plate" }
      ],
      hotspots: [
        { partName: "Roof Rails", defaultX: 50, defaultY: 9 },
        { partName: "Front Skid Plate", defaultX: 50, defaultY: 88 },
        ...CAR_SPEC.views.front.hotspots
      ]
    },
    rear: {
      view: "rear",
      label: "Rear View",
      viewBox: "0 0 360 250",
      paths: [
        { type: "rect", x: 105, y: 20, width: 150, height: 7, rx: 3, fill: "#334155", stroke: "#0f172a", strokeWidth: 1.2, partName: "Roof Rails" },
        ...CAR_SPEC.views.rear.paths,
        // Rear Skid Plate
        { type: "rect", x: 125, y: 212, width: 110, height: 16, rx: 3, fill: "#cbd5e1", stroke: "#64748b", strokeWidth: 1.4, partName: "Rear Skid Plate" }
      ],
      hotspots: [
        { partName: "Roof Rails", defaultX: 50, defaultY: 9 },
        { partName: "Rear Skid Plate", defaultX: 50, defaultY: 88 },
        ...CAR_SPEC.views.rear.hotspots
      ]
    },
    left: {
      view: "left",
      label: "Left Side View",
      viewBox: "0 0 360 240",
      paths: [
        { type: "rect", x: 130, y: 28, width: 120, height: 6, rx: 2, fill: "#334155", stroke: "#0f172a", strokeWidth: 1.2, partName: "Roof Rails" },
        // Roof Spoiler
        { type: "polygon", points: "265,36 295,36 288,44 265,42", fill: "#0f172a", stroke: "#0f172a", strokeWidth: 1.2, partName: "Roof Spoiler" },
        ...CAR_SPEC.views.left.paths
      ],
      hotspots: [
        { partName: "Roof Rails", defaultX: 52, defaultY: 13 },
        ...CAR_SPEC.views.left.hotspots
      ]
    },
    right: {
      view: "right",
      label: "Right Side View",
      viewBox: "0 0 360 240",
      paths: [
        { type: "rect", x: 110, y: 28, width: 120, height: 6, rx: 2, fill: "#334155", stroke: "#0f172a", strokeWidth: 1.2, partName: "Roof Rails" },
        { type: "polygon", points: "95,36 65,36 72,44 95,42", fill: "#0f172a", stroke: "#0f172a", strokeWidth: 1.2, partName: "Roof Spoiler" },
        ...CAR_SPEC.views.right.paths
      ],
      hotspots: [
        { partName: "Roof Rails", defaultX: 48, defaultY: 13 },
        ...CAR_SPEC.views.right.hotspots
      ]
    },
    top: {
      view: "top",
      label: "Top View",
      viewBox: "0 0 360 250",
      paths: [
        ...CAR_SPEC.views.top.paths,
        { type: "rect", x: 160, y: 46, width: 110, height: 4, rx: 2, fill: "#334155", stroke: "#0f172a", strokeWidth: 1, partName: "Roof Rails" },
        { type: "rect", x: 160, y: 200, width: 110, height: 4, rx: 2, fill: "#334155", stroke: "#0f172a", strokeWidth: 1, partName: "Roof Rails" }
      ],
      hotspots: [
        { partName: "Roof Rails", defaultX: 60, defaultY: 20 },
        ...CAR_SPEC.views.top.hotspots
      ]
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. VAN SPECIFICATION (Passenger Van / Microbus - Tall Greenhouse, Sliding Door)
// ─────────────────────────────────────────────────────────────────────────────
export const VAN_SPEC: CategoryDiagramSpec = {
  category: "Van",
  displayName: "Passenger / Panel Van",
  icon: "van-passenger",
  views: {
    front: {
      view: "front",
      label: "Front View",
      viewBox: "0 0 360 250",
      paths: [
        // Ground line
        { type: "line", x1: 20, y1: 236, x2: 340, y2: 236, stroke: "#cbd5e1", strokeWidth: 1.5 },
        // Wheels
        { type: "rect", x: 44, y: 184, width: 28, height: 52, rx: 4, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.6, partName: "Left Front Wheel" },
        { type: "rect", x: 288, y: 184, width: 28, height: 52, rx: 4, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.6, partName: "Right Front Wheel" },

        // Upright Van Body & Roof
        {
          type: "path",
          d: "M 82,42 C 120,24 240,24 278,42 L 298,150 L 62,150 Z",
          fill: "#ffffff",
          stroke: "#0f172a",
          strokeWidth: 2,
          partName: "Roof Panel"
        },
        // Tall Van Windshield Glass
        {
          type: "path",
          d: "M 88,46 C 122,28 238,28 272,46 L 288,124 L 72,124 Z",
          fill: "#e0f2fe",
          stroke: "#0284c7",
          strokeWidth: 1.5,
          partName: "Windscreen"
        },
        { type: "line", x1: 96, y1: 120, x2: 168, y2: 104, stroke: "#0f172a", strokeWidth: 2.2 },
        { type: "line", x1: 192, y1: 120, x2: 264, y2: 104, stroke: "#0f172a", strokeWidth: 2.2 },

        // Mirrors
        { type: "rect", x: 40, y: 100, width: 22, height: 32, rx: 4, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 1.6, partName: "Left Mirror" },
        { type: "rect", x: 298, y: 100, width: 22, height: 32, rx: 4, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 1.6, partName: "Right Mirror" },

        // Front Cowl & Broad Grille
        { type: "rect", x: 62, y: 124, width: 236, height: 42, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 1.6, partName: "Front Grille / Cowl" },
        { type: "rect", x: 108, y: 132, width: 144, height: 26, rx: 3, fill: "#0f172a", stroke: "#334155", strokeWidth: 1.2 },
        { type: "line", x1: 114, y1: 145, x2: 246, y2: 145, stroke: "#64748b", strokeWidth: 1.4 },

        // Headlights
        { type: "rect", x: 64, y: 130, width: 38, height: 28, rx: 4, fill: "#fef9c3", stroke: "#ca8a04", strokeWidth: 1.4, partName: "Left Headlight" },
        { type: "rect", x: 258, y: 130, width: 38, height: 28, rx: 4, fill: "#fef9c3", stroke: "#ca8a04", strokeWidth: 1.4, partName: "Right Headlight" },

        // Front Bumper
        {
          type: "path",
          d: "M 42,166 L 318,166 C 320,196 314,224 308,232 L 52,232 C 46,224 40,196 42,166 Z",
          fill: "#f8fafc",
          stroke: "#0f172a",
          strokeWidth: 2,
          partName: "Front Bumper"
        },
        { type: "rect", x: 135, y: 196, width: 90, height: 22, rx: 2, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 1.4, partName: "Front License Plate" }
      ],
      hotspots: [
        { partName: "Roof Panel", defaultX: 50, defaultY: 14 },
        { partName: "Windscreen", defaultX: 50, defaultY: 34 },
        { partName: "Left Mirror", defaultX: 14, defaultY: 46 },
        { partName: "Right Mirror", defaultX: 86, defaultY: 46 },
        { partName: "Left Headlight", defaultX: 23, defaultY: 58 },
        { partName: "Right Headlight", defaultX: 77, defaultY: 58 },
        { partName: "Front Bumper", defaultX: 50, defaultY: 80 },
        { partName: "Front License Plate", defaultX: 50, defaultY: 80 }
      ]
    },
    rear: {
      view: "rear",
      label: "Rear View",
      viewBox: "0 0 360 250",
      paths: [
        // Ground line
        { type: "line", x1: 20, y1: 236, x2: 340, y2: 236, stroke: "#cbd5e1", strokeWidth: 1.5 },
        // Wheels
        { type: "rect", x: 44, y: 184, width: 28, height: 52, rx: 4, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.6, partName: "Left Rear Wheel" },
        { type: "rect", x: 288, y: 184, width: 28, height: 52, rx: 4, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.6, partName: "Right Rear Wheel" },

        // Upright Van Rear Silhouette
        {
          type: "path",
          d: "M 76,42 C 114,24 246,24 284,42 L 302,170 L 58,170 Z",
          fill: "#ffffff",
          stroke: "#0f172a",
          strokeWidth: 2,
          partName: "Rear Tailgate"
        },
        // Rear Window
        {
          type: "rect",
          x: 76,
          y: 48,
          width: 208,
          height: 68,
          rx: 6,
          fill: "#e0f2fe",
          stroke: "#0284c7",
          strokeWidth: 1.5,
          partName: "Rear Windscreen"
        },
        // High-mount Brake Light
        { type: "rect", x: 160, y: 34, width: 40, height: 6, rx: 2, fill: "#ef4444" },

        // Vertical Pillar Taillights
        { type: "rect", x: 54, y: 92, width: 18, height: 74, rx: 3, fill: "#ef4444", stroke: "#b91c1c", strokeWidth: 1.4, partName: "Left Tail Light" },
        { type: "rect", x: 288, y: 92, width: 18, height: 74, rx: 3, fill: "#ef4444", stroke: "#b91c1c", strokeWidth: 1.4, partName: "Right Tail Light" },

        // Tailgate Handle & License Plate
        { type: "rect", x: 135, y: 134, width: 90, height: 22, rx: 2, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 1.4, partName: "Rear License Plate" },

        // Rear Bumper
        {
          type: "path",
          d: "M 42,170 L 318,170 C 320,196 314,224 308,232 L 52,232 C 46,224 40,196 42,170 Z",
          fill: "#f8fafc",
          stroke: "#0f172a",
          strokeWidth: 2,
          partName: "Rear Bumper"
        }
      ],
      hotspots: [
        { partName: "Rear Windscreen", defaultX: 50, defaultY: 34 },
        { partName: "Left Tail Light", defaultX: 17, defaultY: 52 },
        { partName: "Right Tail Light", defaultX: 83, defaultY: 52 },
        { partName: "Rear Tailgate", defaultX: 50, defaultY: 58 },
        { partName: "Rear Bumper", defaultX: 50, defaultY: 80 }
      ]
    },
    left: {
      view: "left",
      label: "Left Side View",
      viewBox: "0 0 360 240",
      paths: [
        // Ground line
        { type: "line", x1: 10, y1: 206, x2: 350, y2: 206, stroke: "#cbd5e1", strokeWidth: 1.5 },
        // Wheels
        { type: "circle", cx: 72, cy: 176, r: 30, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Left Front Wheel" },
        { type: "circle", cx: 284, cy: 176, r: 30, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Left Rear Wheel" },

        // Upright Van Silhouette (Spanning y=30 to y=206, 176px tall!)
        {
          type: "path",
          d: "M 20,154 C 20,138 34,124 52,112 L 96,82 C 112,46 134,32 174,30 L 322,30 C 336,30 342,38 342,54 L 340,178 L 320,178 A 36,36 0 0 0 248,178 L 108,178 A 36,36 0 0 0 36,178 L 20,178 Z",
          fill: "#ffffff",
          stroke: "#0f172a",
          strokeWidth: 2,
          partName: "Van Body Panels"
        },

        // Panoramic Van Side Windows
        { type: "polygon", points: "98,82 134,42 168,42 168,88 98,88", fill: "#e0f2fe", stroke: "#0284c7", strokeWidth: 1.4, partName: "Driver Window" },
        { type: "rect", x: 174, y: 42, width: 74, height: 46, rx: 3, fill: "#e0f2fe", stroke: "#0284c7", strokeWidth: 1.4, partName: "Sliding Door Window" },
        { type: "rect", x: 254, y: 42, width: 76, height: 46, rx: 3, fill: "#e0f2fe", stroke: "#0284c7", strokeWidth: 1.4, partName: "Rear Window" },

        // Sliding Door Track
        { type: "line", x1: 172, y1: 126, x2: 326, y2: 126, stroke: "#334155", strokeWidth: 2, strokeDasharray: "4,2", partName: "Sliding Door Track" },
        // Door Shut Lines
        { type: "line", x1: 170, y1: 42, x2: 170, y2: 178, stroke: "#475569", strokeWidth: 1.5, partName: "Front Door" },
        { type: "line", x1: 250, y1: 42, x2: 250, y2: 178, stroke: "#475569", strokeWidth: 1.5, partName: "Sliding Door" }
      ],
      hotspots: [
        { partName: "Front Bumper", defaultX: 8, defaultY: 65 },
        { partName: "Left Front Wheel", defaultX: 20, defaultY: 73 },
        { partName: "Driver Window", defaultX: 38, defaultY: 28 },
        { partName: "Sliding Door Window", defaultX: 58, defaultY: 28 },
        { partName: "Sliding Door", defaultX: 58, defaultY: 58 },
        { partName: "Left Rear Wheel", defaultX: 79, defaultY: 73 },
        { partName: "Rear Bumper", defaultX: 92, defaultY: 69 }
      ]
    },
    right: {
      view: "right",
      label: "Right Side View",
      viewBox: "0 0 360 240",
      paths: [
        { type: "line", x1: 10, y1: 206, x2: 350, y2: 206, stroke: "#cbd5e1", strokeWidth: 1.5 },
        { type: "circle", cx: 288, cy: 176, r: 30, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Right Front Wheel" },
        { type: "circle", cx: 76, cy: 176, r: 30, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Right Rear Wheel" },

        // Mirrored Van Silhouette
        {
          type: "path",
          d: "M 340,154 C 340,138 326,124 308,112 L 264,82 C 248,46 226,32 186,30 L 38,30 C 24,30 18,38 18,54 L 20,178 L 40,178 A 36,36 0 0 1 112,178 L 252,178 A 36,36 0 0 1 324,178 L 340,178 Z",
          fill: "#ffffff",
          stroke: "#0f172a",
          strokeWidth: 2,
          partName: "Van Body Panels"
        },
        { type: "polygon", points: "262,82 226,42 192,42 192,88 262,88", fill: "#e0f2fe", stroke: "#0284c7", strokeWidth: 1.4, partName: "Driver Window" },
        { type: "rect", x: 112, y: 42, width: 74, height: 46, rx: 3, fill: "#e0f2fe", stroke: "#0284c7", strokeWidth: 1.4, partName: "Side Window" },
        { type: "rect", x: 30, y: 42, width: 76, height: 46, rx: 3, fill: "#e0f2fe", stroke: "#0284c7", strokeWidth: 1.4, partName: "Rear Window" }
      ],
      hotspots: [
        { partName: "Front Bumper", defaultX: 92, defaultY: 65 },
        { partName: "Right Front Wheel", defaultX: 80, defaultY: 73 },
        { partName: "Driver Window", defaultX: 62, defaultY: 28 },
        { partName: "Right Rear Wheel", defaultX: 21, defaultY: 73 },
        { partName: "Rear Bumper", defaultX: 8, defaultY: 69 }
      ]
    },
    top: {
      view: "top",
      label: "Top View",
      viewBox: "0 0 360 250",
      paths: [
        {
          type: "path",
          d: "M 28,125 C 28,76 46,46 76,46 L 318,46 C 330,46 336,54 336,125 C 336,196 330,204 318,204 L 76,204 C 46,204 28,174 28,125 Z",
          fill: "#ffffff",
          stroke: "#0f172a",
          strokeWidth: 2,
          partName: "Van Roof"
        },
        { type: "line", x1: 96, y1: 54, x2: 308, y2: 54, stroke: "#cbd5e1", strokeWidth: 2 },
        { type: "line", x1: 96, y1: 196, x2: 308, y2: 196, stroke: "#cbd5e1", strokeWidth: 2 },
        { type: "polygon", points: "44,52 86,54 86,196 44,198", fill: "#e0f2fe", stroke: "#0284c7", strokeWidth: 1.4, partName: "Windscreen" }
      ],
      hotspots: [
        { partName: "Front Bumper", defaultX: 12, defaultY: 50 },
        { partName: "Windscreen", defaultX: 18, defaultY: 50 },
        { partName: "Roof Panel", defaultX: 55, defaultY: 50 },
        { partName: "Rear Bumper", defaultX: 92, defaultY: 50 }
      ]
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. THREE-WHEELER (Authentic Sri Lankan Bajaj RE Tuk-Tuk)
// ─────────────────────────────────────────────────────────────────────────────
export const THREE_WHEELER_SPEC: CategoryDiagramSpec = {
  category: "Three-Wheeler",
  displayName: "Three-Wheeler / Tuk-Tuk",
  icon: "rickshaw",
  views: {
    front: {
      view: "front",
      label: "Front View",
      viewBox: "0 0 360 250",
      paths: [
        // Ground line
        { type: "line", x1: 30, y1: 236, x2: 330, y2: 236, stroke: "#cbd5e1", strokeWidth: 1.5 },

        // Single Front Wheel in Center (Firmly grounded)
        { type: "rect", x: 166, y: 184, width: 28, height: 52, rx: 6, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Front Wheel" },
        // Front Suspension Trailing Link Fork
        { type: "line", x1: 162, y1: 184, x2: 162, y2: 216, stroke: "#64748b", strokeWidth: 4, partName: "Front Fork" },
        // Front Mudguard
        {
          type: "path",
          d: "M 152,184 C 152,168 208,168 208,184 Z",
          fill: "#0284c7",
          stroke: "#0369a1",
          strokeWidth: 1.6,
          partName: "Front Mudguard"
        },

        // Front Sheet Metal Apron / Cowl
        {
          type: "polygon",
          points: "116,118 244,118 256,188 104,188",
          fill: "#0284c7",
          stroke: "#0369a1",
          strokeWidth: 2,
          partName: "Front Cowl / Apron"
        },
        // Iconic Round Center Headlight
        { type: "circle", cx: 180, cy: 148, r: 15, fill: "#fef08a", stroke: "#ca8a04", strokeWidth: 2, partName: "Headlight" },
        { type: "circle", cx: 180, cy: 148, r: 6, fill: "#ffffff" },
        // Corner Turn Indicators
        { type: "rect", x: 110, y: 142, width: 14, height: 14, rx: 3, fill: "#f59e0b", stroke: "#b45309", strokeWidth: 1.2, partName: "Left Turn Indicator" },
        { type: "rect", x: 236, y: 142, width: 14, height: 14, rx: 3, fill: "#f59e0b", stroke: "#b45309", strokeWidth: 1.2, partName: "Right Turn Indicator" },

        // Flat Glass Windshield with Rubber Gasket
        { type: "rect", x: 102, y: 52, width: 156, height: 66, rx: 4, fill: "#e0f2fe", stroke: "#0284c7", strokeWidth: 1.5, partName: "Windscreen" },
        // Top-mounted Electric Single Wiper
        { type: "line", x1: 180, y1: 54, x2: 158, y2: 94, stroke: "#0f172a", strokeWidth: 2.5 },

        // Curved Fabric Canopy Crown (Black canopy roof)
        {
          type: "path",
          d: "M 92,54 C 120,24 240,24 268,54 Z",
          fill: "#1e293b",
          stroke: "#0f172a",
          strokeWidth: 2,
          partName: "Canopy Roof"
        },

        // Handlebar-mounted Mirrors
        { type: "line", x1: 96, y1: 108, x2: 74, y2: 88, stroke: "#0f172a", strokeWidth: 2 },
        { type: "circle", cx: 70, cy: 84, r: 9, fill: "#334155", stroke: "#0f172a", strokeWidth: 1.4, partName: "Left Mirror" },
        { type: "line", x1: 264, y1: 108, x2: 286, y2: 88, stroke: "#0f172a", strokeWidth: 2 },
        { type: "circle", cx: 290, cy: 84, r: 9, fill: "#334155", stroke: "#0f172a", strokeWidth: 1.4, partName: "Right Mirror" },

        // Front Bumper Bar
        { type: "rect", x: 94, y: 188, width: 172, height: 10, rx: 3, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.5, partName: "Front Bumper Bar" }
      ],
      hotspots: [
        { partName: "Canopy Roof", defaultX: 50, defaultY: 16 },
        { partName: "Windscreen", defaultX: 50, defaultY: 34 },
        { partName: "Left Mirror", defaultX: 19, defaultY: 34 },
        { partName: "Right Mirror", defaultX: 81, defaultY: 34 },
        { partName: "Headlight", defaultX: 50, defaultY: 59 },
        { partName: "Front Cowl / Apron", defaultX: 50, defaultY: 65 },
        { partName: "Front Mudguard", defaultX: 50, defaultY: 72 },
        { partName: "Front Wheel", defaultX: 50, defaultY: 84 }
      ]
    },
    rear: {
      view: "rear",
      label: "Rear View",
      viewBox: "0 0 360 250",
      paths: [
        // Ground line
        { type: "line", x1: 20, y1: 236, x2: 340, y2: 236, stroke: "#cbd5e1", strokeWidth: 1.5 },
        // Twin Rear Wheels
        { type: "rect", x: 62, y: 184, width: 28, height: 52, rx: 5, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.6, partName: "Left Rear Wheel" },
        { type: "rect", x: 270, y: 184, width: 28, height: 52, rx: 5, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.6, partName: "Right Rear Wheel" },
        // Rubber Mudflaps
        { type: "rect", x: 60, y: 224, width: 32, height: 12, rx: 2, fill: "#0f172a" },
        { type: "rect", x: 268, y: 224, width: 32, height: 12, rx: 2, fill: "#0f172a" },

        // Fabric Canopy Body
        {
          type: "path",
          d: "M 74,68 C 110,26 250,26 286,68 L 298,162 L 62,162 Z",
          fill: "#1e293b",
          stroke: "#0f172a",
          strokeWidth: 2,
          partName: "Canopy Roof"
        },
        // Rectangular Rear Window
        { type: "rect", x: 114, y: 56, width: 132, height: 44, rx: 3, fill: "#e0f2fe", stroke: "#0284c7", strokeWidth: 1.4, partName: "Rear Window" },

        // Rear Engine Bonnet Hatch Door
        { type: "rect", x: 94, y: 140, width: 172, height: 68, rx: 4, fill: "#0284c7", stroke: "#0369a1", strokeWidth: 2, partName: "Engine Cover" },
        // Cooling Louvers
        { type: "line", x1: 134, y1: 154, x2: 226, y2: 154, stroke: "#0f172a", strokeWidth: 2 },
        { type: "line", x1: 134, y1: 164, x2: 226, y2: 164, stroke: "#0f172a", strokeWidth: 2 },
        { type: "line", x1: 134, y1: 174, x2: 226, y2: 174, stroke: "#0f172a", strokeWidth: 2 },

        // Square Taillight Clusters
        { type: "rect", x: 70, y: 150, width: 22, height: 26, rx: 3, fill: "#ef4444", stroke: "#b91c1c", strokeWidth: 1.4, partName: "Left Tail Light" },
        { type: "rect", x: 268, y: 150, width: 22, height: 26, rx: 3, fill: "#ef4444", stroke: "#b91c1c", strokeWidth: 1.4, partName: "Right Tail Light" },

        // License Plate
        { type: "rect", x: 135, y: 184, width: 90, height: 20, rx: 2, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 1.4, partName: "Rear License Plate" },
        // Rear Bumper Tube
        { type: "line", x1: 54, y1: 210, x2: 306, y2: 210, stroke: "#334155", strokeWidth: 5, partName: "Rear Bumper Bar" }
      ],
      hotspots: [
        { partName: "Canopy Roof", defaultX: 50, defaultY: 16 },
        { partName: "Rear Window", defaultX: 50, defaultY: 31 },
        { partName: "Engine Cover", defaultX: 50, defaultY: 68 },
        { partName: "Left Tail Light", defaultX: 23, defaultY: 65 },
        { partName: "Right Tail Light", defaultX: 77, defaultY: 65 },
        { partName: "Rear License Plate", defaultX: 50, defaultY: 78 },
        { partName: "Left Rear Wheel", defaultX: 21, defaultY: 84 },
        { partName: "Right Rear Wheel", defaultX: 79, defaultY: 84 }
      ]
    },
    left: {
      view: "left",
      label: "Left Side View",
      viewBox: "0 0 360 240",
      paths: [
        // Ground line
        { type: "line", x1: 10, y1: 208, x2: 350, y2: 208, stroke: "#cbd5e1", strokeWidth: 1.5 },
        // Front Single Wheel
        { type: "circle", cx: 72, cy: 178, r: 30, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Front Wheel" },
        // Rear Wheel
        { type: "circle", cx: 280, cy: 178, r: 30, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Left Rear Wheel" },

        // Tuk-Tuk Silhouette (Tall, open passenger entry)
        {
          type: "path",
          d: "M 34,166 C 34,142 46,128 66,114 L 102,74 C 114,40 134,32 174,32 L 296,32 C 314,32 324,44 324,68 L 324,180 L 310,180 A 35,35 0 0 0 250,180 L 126,180 L 106,144 L 80,144 L 46,180 Z",
          fill: "#ffffff",
          stroke: "#0f172a",
          strokeWidth: 2,
          partName: "Tuk-Tuk Body"
        },
        // Canopy Cover (Top section)
        {
          type: "path",
          d: "M 102,74 C 114,40 134,32 174,32 L 296,32 C 314,32 324,44 324,68 L 324,96 L 102,96 Z",
          fill: "#1e293b",
          stroke: "#0f172a",
          strokeWidth: 1.5,
          partName: "Canopy Roof"
        },

        // Open Passenger Entry Cutout (Distinctive Tuk-Tuk feature)
        {
          type: "path",
          d: "M 136,96 L 136,168 L 232,168 L 232,96 Z",
          fill: "#f8fafc",
          stroke: "#0284c7",
          strokeWidth: 1.8,
          partName: "Passenger Cabin Entry"
        },
        // Driver Seat Profile
        { type: "rect", x: 142, y: 138, width: 22, height: 26, rx: 3, fill: "#334155", partName: "Driver Seat" },
        // Passenger Bench Seat
        { type: "rect", x: 236, y: 136, width: 44, height: 28, rx: 4, fill: "#334155", partName: "Passenger Seat" }
      ],
      hotspots: [
        { partName: "Front Wheel", defaultX: 20, defaultY: 74 },
        { partName: "Front Cowl / Apron", defaultX: 22, defaultY: 55 },
        { partName: "Canopy Roof", defaultX: 55, defaultY: 20 },
        { partName: "Driver Seat", defaultX: 43, defaultY: 62 },
        { partName: "Passenger Seat", defaultX: 72, defaultY: 62 },
        { partName: "Left Rear Wheel", defaultX: 78, defaultY: 74 }
      ]
    },
    right: {
      view: "right",
      label: "Right Side View",
      viewBox: "0 0 360 240",
      paths: [
        { type: "line", x1: 10, y1: 208, x2: 350, y2: 208, stroke: "#cbd5e1", strokeWidth: 1.5 },
        { type: "circle", cx: 288, cy: 178, r: 30, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Front Wheel" },
        { type: "circle", cx: 80, cy: 178, r: 30, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Right Rear Wheel" },

        // Mirrored Tuk-Tuk Silhouette
        {
          type: "path",
          d: "M 326,166 C 326,142 314,128 294,114 L 258,74 C 246,40 226,32 186,32 L 64,32 C 46,32 36,44 36,68 L 36,180 L 50,180 A 35,35 0 0 1 110,180 L 234,180 L 254,144 L 280,144 L 314,180 Z",
          fill: "#ffffff",
          stroke: "#0f172a",
          strokeWidth: 2,
          partName: "Tuk-Tuk Body"
        },
        {
          type: "path",
          d: "M 258,74 C 246,40 226,32 186,32 L 64,32 C 46,32 36,44 36,68 L 36,96 L 258,96 Z",
          fill: "#1e293b",
          stroke: "#0f172a",
          strokeWidth: 1.5,
          partName: "Canopy Roof"
        },
        {
          type: "path",
          d: "M 224,96 L 224,168 L 128,168 L 128,96 Z",
          fill: "#f8fafc",
          stroke: "#0284c7",
          strokeWidth: 1.8,
          partName: "Passenger Cabin Entry"
        }
      ],
      hotspots: [
        { partName: "Front Wheel", defaultX: 80, defaultY: 74 },
        { partName: "Front Cowl / Apron", defaultX: 78, defaultY: 55 },
        { partName: "Canopy Roof", defaultX: 45, defaultY: 20 },
        { partName: "Passenger Seat", defaultX: 28, defaultY: 62 },
        { partName: "Right Rear Wheel", defaultX: 22, defaultY: 74 }
      ]
    },
    top: {
      view: "top",
      label: "Top View",
      viewBox: "0 0 360 250",
      paths: [
        // Teardrop shape: narrow front expanding to wide rear cabin
        {
          type: "path",
          d: "M 32,125 C 32,108 52,94 82,78 L 140,54 L 314,54 C 326,54 332,68 332,125 C 332,182 326,196 314,196 L 140,196 L 82,172 C 52,156 32,142 32,125 Z",
          fill: "#1e293b",
          stroke: "#0f172a",
          strokeWidth: 2,
          partName: "Canopy Roof"
        },
        { type: "polygon", points: "56,98 94,84 94,166 56,152", fill: "#e0f2fe", stroke: "#0284c7", strokeWidth: 1.4, partName: "Windscreen" }
      ],
      hotspots: [
        { partName: "Front Wheel / Mudguard", defaultX: 12, defaultY: 50 },
        { partName: "Windscreen", defaultX: 21, defaultY: 50 },
        { partName: "Canopy Roof", defaultX: 60, defaultY: 50 },
        { partName: "Rear Bumper Bar", defaultX: 92, defaultY: 50 }
      ]
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. MOTORCYCLE SPECIFICATION (Clean, Proportional Commuter / Pulsar / Discover)
// ─────────────────────────────────────────────────────────────────────────────
export const MOTORCYCLE_SPEC: CategoryDiagramSpec = {
  category: "Motorcycle",
  displayName: "Motorcycle / Scooter / Two-Wheeler",
  icon: "motorbike",
  views: {
    front: {
      view: "front",
      label: "Front View",
      viewBox: "0 0 360 250",
      paths: [
        // Ground line
        { type: "line", x1: 40, y1: 236, x2: 320, y2: 236, stroke: "#cbd5e1", strokeWidth: 1.5 },

        // Front Tyre & Wheel (Tall vertical presence, grounded)
        { type: "rect", x: 166, y: 154, width: 28, height: 82, rx: 8, fill: "#0f172a", stroke: "#000", strokeWidth: 2, partName: "Front Wheel & Tyre" },
        { type: "rect", x: 160, y: 176, width: 6, height: 34, fill: "#cbd5e1", stroke: "#64748b", strokeWidth: 1, partName: "Front Disc Brake" },

        // Front Suspension Telescopic Forks
        { type: "rect", x: 156, y: 114, width: 10, height: 68, rx: 2, fill: "#94a3b8", stroke: "#475569", strokeWidth: 1.5, partName: "Front Suspension Forks" },
        { type: "rect", x: 194, y: 114, width: 10, height: 68, rx: 2, fill: "#94a3b8", stroke: "#475569", strokeWidth: 1.5, partName: "Front Suspension Forks" },
        // Front Mudguard
        { type: "polygon", points: "150,132 210,132 204,150 156,150", fill: "#0284c7", stroke: "#0369a1", strokeWidth: 1.5, partName: "Front Mudguard" },

        // Headlight Cowl & Visor
        { type: "polygon", points: "150,50 210,50 202,114 158,114", fill: "#0284c7", stroke: "#0369a1", strokeWidth: 2, partName: "Headlamp Cowl" },
        // Bright Headlight Lens
        { type: "polygon", points: "160,64 200,64 194,106 166,106", fill: "#fef08a", stroke: "#ca8a04", strokeWidth: 1.5, partName: "Front Headlight" },
        { type: "circle", cx: 180, cy: 84, r: 6, fill: "#ffffff", stroke: "#ca8a04", strokeWidth: 1 },

        // Turn Indicators
        { type: "rect", x: 120, y: 80, width: 18, height: 11, rx: 2, fill: "#f59e0b", stroke: "#b45309", strokeWidth: 1.2, partName: "Left Turn Indicator" },
        { type: "rect", x: 222, y: 80, width: 18, height: 11, rx: 2, fill: "#f59e0b", stroke: "#b45309", strokeWidth: 1.2, partName: "Right Turn Indicator" },

        // Handlebars with Grips
        { type: "line", x1: 90, y1: 56, x2: 270, y2: 56, stroke: "#1e293b", strokeWidth: 4, partName: "Handlebars" },
        { type: "rect", x: 86, y: 51, width: 20, height: 10, rx: 2, fill: "#0f172a" },
        { type: "rect", x: 254, y: 51, width: 20, height: 10, rx: 2, fill: "#0f172a" },

        // Rearview Mirrors
        { type: "line", x1: 126, y1: 56, x2: 106, y2: 28, stroke: "#1e293b", strokeWidth: 2.5 },
        { type: "circle", cx: 102, cy: 26, r: 11, fill: "#334155", stroke: "#0f172a", strokeWidth: 1.5, partName: "Left Mirror" },
        { type: "line", x1: 234, y1: 56, x2: 254, y2: 28, stroke: "#1e293b", strokeWidth: 2.5 },
        { type: "circle", cx: 258, cy: 26, r: 11, fill: "#334155", stroke: "#0f172a", strokeWidth: 1.5, partName: "Right Mirror" }
      ],
      hotspots: [
        { partName: "Left Mirror", defaultX: 28, defaultY: 10 },
        { partName: "Right Mirror", defaultX: 72, defaultY: 10 },
        { partName: "Handlebars", defaultX: 50, defaultY: 22 },
        { partName: "Front Headlight", defaultX: 50, defaultY: 34 },
        { partName: "Headlamp Cowl", defaultX: 50, defaultY: 34 },
        { partName: "Front Mudguard", defaultX: 50, defaultY: 56 },
        { partName: "Front Suspension Forks", defaultX: 44, defaultY: 62 },
        { partName: "Front Wheel & Tyre", defaultX: 50, defaultY: 80 }
      ]
    },
    rear: {
      view: "rear",
      label: "Rear View",
      viewBox: "0 0 360 250",
      paths: [
        // Ground line
        { type: "line", x1: 40, y1: 236, x2: 320, y2: 236, stroke: "#cbd5e1", strokeWidth: 1.5 },

        // Wide Rear Tyre (Grounded)
        { type: "rect", x: 162, y: 146, width: 36, height: 90, rx: 10, fill: "#0f172a", stroke: "#000", strokeWidth: 2, partName: "Rear Wheel & Tyre" },

        // Upswept Exhaust Muffler
        { type: "rect", x: 210, y: 162, width: 22, height: 48, rx: 4, fill: "#64748b", stroke: "#334155", strokeWidth: 1.5, partName: "Exhaust Muffler" },

        // Rear Seat & Pillion Grab Rail
        { type: "rect", x: 146, y: 66, width: 68, height: 22, rx: 6, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Seat" },
        { type: "line", x1: 138, y1: 68, x2: 222, y2: 68, stroke: "#94a3b8", strokeWidth: 3 },

        // Sharp LED Tail Light
        { type: "polygon", points: "164,88 196,88 190,108 170,108", fill: "#ef4444", stroke: "#b91c1c", strokeWidth: 1.5, partName: "Tail Light" },

        // Turn Indicators
        { type: "rect", x: 124, y: 94, width: 18, height: 11, rx: 2, fill: "#f59e0b", stroke: "#b45309", strokeWidth: 1.2, partName: "Left Turn Indicator" },
        { type: "rect", x: 218, y: 94, width: 18, height: 11, rx: 2, fill: "#f59e0b", stroke: "#b45309", strokeWidth: 1.2, partName: "Right Turn Indicator" },

        // License Plate
        { type: "rect", x: 148, y: 116, width: 64, height: 26, rx: 3, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 1.4, partName: "Rear License Plate" }
      ],
      hotspots: [
        { partName: "Seat", defaultX: 50, defaultY: 30 },
        { partName: "Tail Light", defaultX: 50, defaultY: 39 },
        { partName: "Rear License Plate", defaultX: 50, defaultY: 52 },
        { partName: "Exhaust Muffler", defaultX: 62, defaultY: 74 },
        { partName: "Rear Wheel & Tyre", defaultX: 50, defaultY: 78 }
      ]
    },
    left: {
      view: "left",
      label: "Left Side View",
      viewBox: "0 0 360 240",
      paths: [
        // Ground line
        { type: "line", x1: 10, y1: 208, x2: 350, y2: 208, stroke: "#cbd5e1", strokeWidth: 1.5 },

        // Front 17-inch Alloy Wheel
        { type: "circle", cx: 68, cy: 168, r: 38, fill: "#0f172a", stroke: "#000", strokeWidth: 2, partName: "Front Wheel & Tyre" },
        { type: "circle", cx: 68, cy: 168, r: 24, fill: "#94a3b8", stroke: "#cbd5e1", strokeWidth: 1.2 },
        { type: "circle", cx: 68, cy: 168, r: 8, fill: "#f8fafc" },
        // Rear Wheel
        { type: "circle", cx: 284, cy: 168, r: 38, fill: "#0f172a", stroke: "#000", strokeWidth: 2, partName: "Rear Wheel & Tyre" },
        { type: "circle", cx: 284, cy: 168, r: 24, fill: "#94a3b8", stroke: "#cbd5e1", strokeWidth: 1.2 },
        { type: "circle", cx: 284, cy: 168, r: 8, fill: "#f8fafc" },

        // Front Telescopic Suspension Forks
        { type: "line", x1: 68, y1: 168, x2: 114, y2: 68, stroke: "#64748b", strokeWidth: 6, partName: "Front Forks" },
        // Front Fender
        {
          type: "path",
          d: "M 48,144 C 48,118 88,118 100,144 Z",
          fill: "#0284c7",
          stroke: "#0369a1",
          strokeWidth: 1.5,
          partName: "Front Mudguard"
        },

        // Headlight Cowl
        { type: "polygon", points: "108,60 132,60 126,92 102,92", fill: "#0284c7", stroke: "#0369a1", strokeWidth: 1.5, partName: "Headlamp Fairing" },
        // Handlebars & Mirror
        { type: "line", x1: 120, y1: 66, x2: 128, y2: 46, stroke: "#0f172a", strokeWidth: 3 },
        { type: "circle", cx: 130, cy: 38, r: 8, fill: "#334155", stroke: "#0f172a", strokeWidth: 1.2, partName: "Left Mirror" },

        // Sculpted Fuel Tank (Bajaj Discover / Pulsar styling)
        {
          type: "path",
          d: "M 124,80 C 142,54 188,54 198,90 L 148,106 Z",
          fill: "#0284c7",
          stroke: "#0369a1",
          strokeWidth: 2,
          partName: "Fuel Tank"
        },

        // Stepped Dual Seat
        {
          type: "path",
          d: "M 194,84 C 218,84 250,78 274,96 L 202,106 Z",
          fill: "#1e293b",
          stroke: "#0f172a",
          strokeWidth: 2,
          partName: "Seat"
        },

        // Engine Block & Crankcase
        { type: "rect", x: 144, y: 112, width: 56, height: 48, rx: 6, fill: "#334155", stroke: "#0f172a", strokeWidth: 1.5, partName: "Engine Block" },
        { type: "line", x1: 148, y1: 122, x2: 196, y2: 122, stroke: "#64748b", strokeWidth: 1.5 },
        { type: "line", x1: 148, y1: 132, x2: 196, y2: 132, stroke: "#64748b", strokeWidth: 1.5 },

        // Upswept Chrome Exhaust
        {
          type: "path",
          d: "M 164,144 C 178,180 218,180 234,172 L 298,140",
          fill: "none",
          stroke: "#64748b",
          strokeWidth: 7,
          partName: "Exhaust System"
        },

        // Rear Swingarm
        { type: "line", x1: 200, y1: 148, x2: 284, y2: 168, stroke: "#475569", strokeWidth: 4, partName: "Swingarm" },

        // Tail Cowl
        { type: "polygon", points: "268,96 308,98 292,116 264,106", fill: "#0284c7", stroke: "#0369a1", strokeWidth: 1.5, partName: "Tail Cowl" }
      ],
      hotspots: [
        { partName: "Front Wheel & Tyre", defaultX: 19, defaultY: 70 },
        { partName: "Front Mudguard", defaultX: 21, defaultY: 55 },
        { partName: "Left Mirror", defaultX: 36, defaultY: 16 },
        { partName: "Fuel Tank", defaultX: 45, defaultY: 34 },
        { partName: "Seat", defaultX: 65, defaultY: 38 },
        { partName: "Engine Block", defaultX: 48, defaultY: 57 },
        { partName: "Exhaust System", defaultX: 68, defaultY: 70 },
        { partName: "Rear Wheel & Tyre", defaultX: 79, defaultY: 70 }
      ]
    },
    right: {
      view: "right",
      label: "Right Side View",
      viewBox: "0 0 360 240",
      paths: [
        { type: "line", x1: 10, y1: 208, x2: 350, y2: 208, stroke: "#cbd5e1", strokeWidth: 1.5 },
        { type: "circle", cx: 292, cy: 168, r: 38, fill: "#0f172a", stroke: "#000", strokeWidth: 2, partName: "Front Wheel & Tyre" },
        { type: "circle", cx: 292, cy: 168, r: 24, fill: "#94a3b8", stroke: "#cbd5e1", strokeWidth: 1.2 },
        { type: "circle", cx: 76, cy: 168, r: 38, fill: "#0f172a", stroke: "#000", strokeWidth: 2, partName: "Rear Wheel & Tyre" },
        { type: "circle", cx: 76, cy: 168, r: 24, fill: "#94a3b8", stroke: "#cbd5e1", strokeWidth: 1.2 },

        { type: "line", x1: 292, y1: 168, x2: 246, y2: 68, stroke: "#64748b", strokeWidth: 6, partName: "Front Forks" },
        { type: "path", d: "M 312,144 C 312,118 272,118 260,144 Z", fill: "#0284c7", stroke: "#0369a1", strokeWidth: 1.5, partName: "Front Mudguard" },

        { type: "polygon", points: "252,60 228,60 234,92 258,92", fill: "#0284c7", stroke: "#0369a1", strokeWidth: 1.5, partName: "Headlamp Fairing" },
        { type: "line", x1: 240, y1: 66, x2: 232, y2: 46, stroke: "#0f172a", strokeWidth: 3 },
        { type: "circle", cx: 230, cy: 38, r: 8, fill: "#334155", stroke: "#0f172a", strokeWidth: 1.2, partName: "Right Mirror" },

        // Fuel Tank
        { type: "path", d: "M 236,80 C 218,54 172,54 162,90 L 212,106 Z", fill: "#0284c7", stroke: "#0369a1", strokeWidth: 2, partName: "Fuel Tank" },
        // Seat
        { type: "path", d: "M 166,84 C 142,84 110,78 86,96 L 158,106 Z", fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Seat" },
        // Engine Block
        { type: "rect", x: 160, y: 112, width: 56, height: 48, rx: 6, fill: "#334155", stroke: "#0f172a", strokeWidth: 1.5, partName: "Engine Block" },
        // Exhaust
        { type: "path", d: "M 196,144 C 182,180 142,180 126,172 L 62,140", fill: "none", stroke: "#64748b", strokeWidth: 7, partName: "Exhaust System" }
      ],
      hotspots: [
        { partName: "Front Wheel & Tyre", defaultX: 81, defaultY: 70 },
        { partName: "Front Mudguard", defaultX: 79, defaultY: 55 },
        { partName: "Right Mirror", defaultX: 64, defaultY: 16 },
        { partName: "Fuel Tank", defaultX: 55, defaultY: 34 },
        { partName: "Seat", defaultX: 35, defaultY: 38 },
        { partName: "Engine Block", defaultX: 52, defaultY: 57 },
        { partName: "Exhaust System", defaultX: 32, defaultY: 70 },
        { partName: "Rear Wheel & Tyre", defaultX: 21, defaultY: 70 }
      ]
    },
    top: {
      view: "top",
      label: "Top View",
      viewBox: "0 0 360 250",
      paths: [
        // Front Tyre
        { type: "rect", x: 30, y: 115, width: 56, height: 20, rx: 6, fill: "#0f172a", stroke: "#000", strokeWidth: 1.5, partName: "Front Wheel" },
        // Handlebars
        { type: "line", x1: 90, y1: 56, x2: 90, y2: 194, stroke: "#1e293b", strokeWidth: 4, partName: "Handlebars" },
        // Fuel Tank
        { type: "path", d: "M 94,125 C 102,82 170,82 184,125 C 170,168 102,168 94,125 Z", fill: "#0284c7", stroke: "#0369a1", strokeWidth: 2, partName: "Fuel Tank" },
        // Seat
        { type: "rect", x: 184, y: 104, width: 88, height: 42, rx: 6, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.5, partName: "Seat" },
        // Rear Tyre
        { type: "rect", x: 274, y: 112, width: 58, height: 26, rx: 6, fill: "#0f172a", stroke: "#000", strokeWidth: 1.5, partName: "Rear Wheel" }
      ],
      hotspots: [
        { partName: "Front Wheel", defaultX: 16, defaultY: 50 },
        { partName: "Handlebars", defaultX: 25, defaultY: 50 },
        { partName: "Fuel Tank", defaultX: 39, defaultY: 50 },
        { partName: "Seat", defaultX: 63, defaultY: 50 },
        { partName: "Rear Wheel", defaultX: 84, defaultY: 50 }
      ]
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. LORRY / COMMERCIAL TRUCK SPECIFICATION
// ─────────────────────────────────────────────────────────────────────────────
export const LORRY_SPEC: CategoryDiagramSpec = {
  category: "Lorry",
  displayName: "Commercial Lorry / Truck",
  icon: "truck",
  views: {
    front: {
      view: "front",
      label: "Front View",
      viewBox: "0 0 360 250",
      paths: [
        // Ground line
        { type: "line", x1: 15, y1: 236, x2: 345, y2: 236, stroke: "#cbd5e1", strokeWidth: 1.5 },
        // Heavy Steer Wheels
        { type: "rect", x: 38, y: 178, width: 30, height: 58, rx: 4, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.8, partName: "Left Front Wheel" },
        { type: "rect", x: 292, y: 178, width: 30, height: 58, rx: 4, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.8, partName: "Right Front Wheel" },

        // Heavy Commercial Cab
        { type: "rect", x: 56, y: 28, width: 248, height: 158, rx: 8, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 2, partName: "Truck Cabin" },
        // Cab Roof Marker Lights (3 amber marker lamps)
        { type: "circle", cx: 160, cy: 36, r: 3, fill: "#f59e0b" },
        { type: "circle", cx: 180, cy: 36, r: 3, fill: "#f59e0b" },
        { type: "circle", cx: 200, cy: 36, r: 3, fill: "#f59e0b" },

        // Huge Rectangular Windshield
        { type: "rect", x: 70, y: 44, width: 220, height: 68, rx: 4, fill: "#e0f2fe", stroke: "#0284c7", strokeWidth: 1.8, partName: "Cabin Windscreen" },
        { type: "line", x1: 88, y1: 104, x2: 156, y2: 86, stroke: "#0f172a", strokeWidth: 2.4 },
        { type: "line", x1: 184, y1: 104, x2: 252, y2: 86, stroke: "#0f172a", strokeWidth: 2.4 },

        // Large Dual-Bracket Cab Mirrors
        { type: "rect", x: 30, y: 64, width: 22, height: 42, rx: 3, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 1.6, partName: "Left Mirror" },
        { type: "rect", x: 308, y: 64, width: 22, height: 42, rx: 3, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 1.6, partName: "Right Mirror" },

        // Heavy Grille
        { type: "rect", x: 98, y: 120, width: 164, height: 44, rx: 3, fill: "#0f172a", stroke: "#334155", strokeWidth: 1.5, partName: "Cabin Grille" },
        { type: "line", x1: 106, y1: 134, x2: 254, y2: 134, stroke: "#64748b", strokeWidth: 1.5 },
        { type: "line", x1: 106, y1: 148, x2: 254, y2: 148, stroke: "#64748b", strokeWidth: 1.5 },

        // Headlights
        { type: "rect", x: 62, y: 126, width: 30, height: 32, rx: 3, fill: "#fef08a", stroke: "#ca8a04", strokeWidth: 1.4, partName: "Left Headlight" },
        { type: "rect", x: 268, y: 126, width: 30, height: 32, rx: 3, fill: "#fef08a", stroke: "#ca8a04", strokeWidth: 1.4, partName: "Right Headlight" },

        // Heavy-duty Channel Steel Bumper
        { type: "rect", x: 42, y: 174, width: 276, height: 36, rx: 4, fill: "#334155", stroke: "#0f172a", strokeWidth: 2, partName: "Front Steel Bumper" },
        { type: "rect", x: 135, y: 182, width: 90, height: 20, rx: 2, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 1.4, partName: "Front License Plate" }
      ],
      hotspots: [
        { partName: "Truck Cabin", defaultX: 50, defaultY: 15 },
        { partName: "Cabin Windscreen", defaultX: 50, defaultY: 31 },
        { partName: "Left Mirror", defaultX: 10, defaultY: 34 },
        { partName: "Right Mirror", defaultX: 90, defaultY: 34 },
        { partName: "Left Headlight", defaultX: 21, defaultY: 57 },
        { partName: "Right Headlight", defaultX: 79, defaultY: 57 },
        { partName: "Cabin Grille", defaultX: 50, defaultY: 57 },
        { partName: "Front Steel Bumper", defaultX: 50, defaultY: 77 }
      ]
    },
    rear: {
      view: "rear",
      label: "Rear View",
      viewBox: "0 0 360 250",
      paths: [
        { type: "line", x1: 15, y1: 236, x2: 345, y2: 236, stroke: "#cbd5e1", strokeWidth: 1.5 },
        // Dual Rear Wheels
        { type: "rect", x: 38, y: 178, width: 32, height: 58, rx: 4, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.8, partName: "Left Rear Wheels" },
        { type: "rect", x: 290, y: 178, width: 32, height: 58, rx: 4, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.8, partName: "Right Rear Wheels" },

        // Cargo Bed Drop-sides
        { type: "rect", x: 50, y: 64, width: 260, height: 114, rx: 4, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 2, partName: "Cargo Bed Tailgate" },
        { type: "line", x1: 50, y1: 102, x2: 310, y2: 102, stroke: "#64748b", strokeWidth: 1.5 },
        { type: "line", x1: 50, y1: 140, x2: 310, y2: 140, stroke: "#64748b", strokeWidth: 1.5 },

        // Heavy-duty Under-run Protection Bar
        { type: "rect", x: 42, y: 184, width: 276, height: 18, rx: 3, fill: "#334155", stroke: "#0f172a", strokeWidth: 1.8, partName: "Rear Bumper Bar" },
        // Tail Lamps
        { type: "rect", x: 52, y: 186, width: 36, height: 14, rx: 2, fill: "#ef4444", stroke: "#b91c1c", strokeWidth: 1, partName: "Left Tail Light" },
        { type: "rect", x: 272, y: 186, width: 36, height: 14, rx: 2, fill: "#ef4444", stroke: "#b91c1c", strokeWidth: 1, partName: "Right Tail Light" },
        // Plate
        { type: "rect", x: 135, y: 184, width: 90, height: 18, rx: 2, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 1.2, partName: "Rear License Plate" }
      ],
      hotspots: [
        { partName: "Cargo Bed Tailgate", defaultX: 50, defaultY: 48 },
        { partName: "Left Tail Light", defaultX: 19, defaultY: 76 },
        { partName: "Right Tail Light", defaultX: 81, defaultY: 76 },
        { partName: "Rear Bumper Bar", defaultX: 50, defaultY: 76 }
      ]
    },
    left: {
      view: "left",
      label: "Left Side View",
      viewBox: "0 0 360 240",
      paths: [
        { type: "line", x1: 10, y1: 206, x2: 350, y2: 206, stroke: "#cbd5e1", strokeWidth: 1.5 },
        // Steer Wheel
        { type: "circle", cx: 68, cy: 174, r: 32, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Left Front Wheel" },
        // Dual Rear Wheels
        { type: "circle", cx: 284, cy: 174, r: 32, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Left Rear Wheels" },

        // Forward-control Cab
        { type: "polygon", points: "20,154 20,68 84,40 108,40 108,174 54,174", fill: "#ffffff", stroke: "#0f172a", strokeWidth: 2, partName: "Truck Cabin" },
        { type: "polygon", points: "26,68 82,46 102,46 102,96 26,96", fill: "#e0f2fe", stroke: "#0284c7", strokeWidth: 1.4, partName: "Cabin Window" },

        // Cargo Flatbed / Drop-side Body
        { type: "rect", x: 114, y: 64, width: 232, height: 86, rx: 2, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 2, partName: "Cargo Bed Body" },
        { type: "line", x1: 114, y1: 106, x2: 346, y2: 106, stroke: "#64748b", strokeWidth: 1.5 },

        // Diesel Fuel Tank
        { type: "rect", x: 136, y: 158, width: 62, height: 26, rx: 6, fill: "#475569", stroke: "#0f172a", strokeWidth: 1.5, partName: "Diesel Fuel Tank" }
      ],
      hotspots: [
        { partName: "Truck Cabin", defaultX: 18, defaultY: 34 },
        { partName: "Cabin Window", defaultX: 18, defaultY: 28 },
        { partName: "Left Front Wheel", defaultX: 19, defaultY: 72 },
        { partName: "Cargo Bed Body", defaultX: 64, defaultY: 44 },
        { partName: "Diesel Fuel Tank", defaultX: 46, defaultY: 71 },
        { partName: "Left Rear Wheels", defaultX: 79, defaultY: 72 }
      ]
    },
    right: {
      view: "right",
      label: "Right Side View",
      viewBox: "0 0 360 240",
      paths: [
        { type: "line", x1: 10, y1: 206, x2: 350, y2: 206, stroke: "#cbd5e1", strokeWidth: 1.5 },
        { type: "circle", cx: 292, cy: 174, r: 32, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Right Front Wheel" },
        { type: "circle", cx: 76, cy: 174, r: 32, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Right Rear Wheels" },

        // Mirrored Cab
        { type: "polygon", points: "340,154 340,68 276,40 252,40 252,174 306,174", fill: "#ffffff", stroke: "#0f172a", strokeWidth: 2, partName: "Truck Cabin" },
        { type: "polygon", points: "334,68 278,46 258,46 258,96 334,96", fill: "#e0f2fe", stroke: "#0284c7", strokeWidth: 1.4, partName: "Cabin Window" },

        // Cargo Body
        { type: "rect", x: 14, y: 64, width: 232, height: 86, rx: 2, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 2, partName: "Cargo Bed Body" },
        { type: "line", x1: 14, y1: 106, x2: 246, y2: 106, stroke: "#64748b", strokeWidth: 1.5 }
      ],
      hotspots: [
        { partName: "Truck Cabin", defaultX: 82, defaultY: 34 },
        { partName: "Right Front Wheel", defaultX: 81, defaultY: 72 },
        { partName: "Cargo Bed Body", defaultX: 36, defaultY: 44 },
        { partName: "Right Rear Wheels", defaultX: 21, defaultY: 72 }
      ]
    },
    top: {
      view: "top",
      label: "Top View",
      viewBox: "0 0 360 250",
      paths: [
        { type: "rect", x: 30, y: 50, width: 84, height: 150, rx: 6, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 2, partName: "Cabin Roof" },
        { type: "rect", x: 118, y: 46, width: 214, height: 158, rx: 3, fill: "#f8fafc", stroke: "#0f172a", strokeWidth: 2, partName: "Cargo Bed" },
        { type: "polygon", points: "40,56 70,56 70,194 40,194", fill: "#e0f2fe", stroke: "#0284c7", strokeWidth: 1.4, partName: "Cabin Windscreen" }
      ],
      hotspots: [
        { partName: "Cabin Roof", defaultX: 20, defaultY: 50 },
        { partName: "Cargo Bed", defaultX: 62, defaultY: 50 }
      ]
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. BUS / COACH SPECIFICATION
// ─────────────────────────────────────────────────────────────────────────────
export const BUS_SPEC: CategoryDiagramSpec = {
  category: "Bus",
  displayName: "Commercial Bus / Coach",
  icon: "bus",
  views: {
    front: {
      view: "front",
      label: "Front View",
      viewBox: "0 0 360 250",
      paths: [
        { type: "line", x1: 15, y1: 236, x2: 345, y2: 236, stroke: "#cbd5e1", strokeWidth: 1.5 },
        { type: "rect", x: 38, y: 178, width: 30, height: 58, rx: 4, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.8, partName: "Left Front Wheel" },
        { type: "rect", x: 292, y: 178, width: 30, height: 58, rx: 4, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.8, partName: "Right Front Wheel" },

        // Tall Coach Body
        { type: "rect", x: 50, y: 22, width: 260, height: 184, rx: 10, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 2, partName: "Bus Front Body" },
        // Destination Display
        { type: "rect", x: 100, y: 30, width: 160, height: 20, rx: 3, fill: "#0f172a", stroke: "#334155", strokeWidth: 1.2, partName: "Destination Display" },

        // Giant Panoramic Windshield
        { type: "rect", x: 62, y: 56, width: 236, height: 86, rx: 6, fill: "#e0f2fe", stroke: "#0284c7", strokeWidth: 1.8, partName: "Panoramic Windscreen" },
        { type: "line", x1: 90, y1: 136, x2: 168, y2: 116, stroke: "#0f172a", strokeWidth: 2.5 },
        { type: "line", x1: 192, y1: 136, x2: 270, y2: 116, stroke: "#0f172a", strokeWidth: 2.5 },

        // Mirrors
        { type: "rect", x: 26, y: 64, width: 22, height: 46, rx: 3, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 1.6, partName: "Left Mirror" },
        { type: "rect", x: 312, y: 64, width: 22, height: 46, rx: 3, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 1.6, partName: "Right Mirror" },

        // Headlights & Bumper
        { type: "rect", x: 64, y: 154, width: 34, height: 22, rx: 3, fill: "#fef08a", stroke: "#ca8a04", strokeWidth: 1.4, partName: "Left Headlight" },
        { type: "rect", x: 262, y: 154, width: 34, height: 22, rx: 3, fill: "#fef08a", stroke: "#ca8a04", strokeWidth: 1.4, partName: "Right Headlight" },
        { type: "rect", x: 42, y: 180, width: 276, height: 32, rx: 4, fill: "#334155", stroke: "#0f172a", strokeWidth: 2, partName: "Front Bumper" }
      ],
      hotspots: [
        { partName: "Destination Display", defaultX: 50, defaultY: 16 },
        { partName: "Panoramic Windscreen", defaultX: 50, defaultY: 39 },
        { partName: "Left Headlight", defaultX: 22, defaultY: 66 },
        { partName: "Right Headlight", defaultX: 78, defaultY: 66 },
        { partName: "Front Bumper", defaultX: 50, defaultY: 78 }
      ]
    },
    rear: {
      view: "rear",
      label: "Rear View",
      viewBox: "0 0 360 250",
      paths: [
        { type: "line", x1: 15, y1: 236, x2: 345, y2: 236, stroke: "#cbd5e1", strokeWidth: 1.5 },
        { type: "rect", x: 38, y: 178, width: 32, height: 58, rx: 4, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.8, partName: "Left Rear Wheels" },
        { type: "rect", x: 290, y: 178, width: 32, height: 58, rx: 4, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.8, partName: "Right Rear Wheels" },

        { type: "rect", x: 50, y: 22, width: 260, height: 184, rx: 10, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 2, partName: "Bus Rear Body" },
        { type: "rect", x: 74, y: 38, width: 212, height: 60, rx: 4, fill: "#e0f2fe", stroke: "#0284c7", strokeWidth: 1.5, partName: "Rear Window" },

        // Vertical Taillights
        { type: "rect", x: 58, y: 114, width: 18, height: 62, rx: 3, fill: "#ef4444", stroke: "#b91c1c", strokeWidth: 1.4, partName: "Left Tail Light" },
        { type: "rect", x: 284, y: 114, width: 18, height: 62, rx: 3, fill: "#ef4444", stroke: "#b91c1c", strokeWidth: 1.4, partName: "Right Tail Light" },
        { type: "rect", x: 42, y: 180, width: 276, height: 32, rx: 4, fill: "#334155", stroke: "#0f172a", strokeWidth: 2, partName: "Rear Bumper" }
      ],
      hotspots: [
        { partName: "Rear Window", defaultX: 50, defaultY: 27 },
        { partName: "Left Tail Light", defaultX: 18, defaultY: 58 },
        { partName: "Right Tail Light", defaultX: 82, defaultY: 58 },
        { partName: "Rear Bumper", defaultX: 50, defaultY: 78 }
      ]
    },
    left: {
      view: "left",
      label: "Left Side View",
      viewBox: "0 0 360 240",
      paths: [
        { type: "line", x1: 10, y1: 206, x2: 350, y2: 206, stroke: "#cbd5e1", strokeWidth: 1.5 },
        { type: "circle", cx: 68, cy: 174, r: 32, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Front Wheel" },
        { type: "circle", cx: 290, cy: 174, r: 32, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Rear Wheels" },

        // Coach Profile
        { type: "rect", x: 18, y: 32, width: 326, height: 142, rx: 8, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 2, partName: "Bus Side Body" },
        // Passenger Entry Door
        { type: "rect", x: 38, y: 46, width: 36, height: 128, rx: 3, fill: "#e0f2fe", stroke: "#0284c7", strokeWidth: 1.4, partName: "Passenger Door" },
        // Row of 4 large panoramic windows
        { type: "rect", x: 80, y: 46, width: 56, height: 54, rx: 3, fill: "#e0f2fe", stroke: "#0284c7", strokeWidth: 1.4, partName: "Side Window 1" },
        { type: "rect", x: 142, y: 46, width: 56, height: 54, rx: 3, fill: "#e0f2fe", stroke: "#0284c7", strokeWidth: 1.4, partName: "Side Window 2" },
        { type: "rect", x: 204, y: 46, width: 56, height: 54, rx: 3, fill: "#e0f2fe", stroke: "#0284c7", strokeWidth: 1.4, partName: "Side Window 3" },
        { type: "rect", x: 266, y: 46, width: 68, height: 54, rx: 3, fill: "#e0f2fe", stroke: "#0284c7", strokeWidth: 1.4, partName: "Side Window 4" },

        // Luggage Locker Doors along lower body
        { type: "rect", x: 114, y: 122, width: 76, height: 42, rx: 2, fill: "#f1f5f9", stroke: "#64748b", strokeWidth: 1.2, partName: "Luggage Compartment" },
        { type: "rect", x: 196, y: 122, width: 76, height: 42, rx: 2, fill: "#f1f5f9", stroke: "#64748b", strokeWidth: 1.2, partName: "Luggage Compartment" }
      ],
      hotspots: [
        { partName: "Passenger Door", defaultX: 16, defaultY: 46 },
        { partName: "Front Wheel", defaultX: 19, defaultY: 72 },
        { partName: "Luggage Compartment", defaultX: 52, defaultY: 60 },
        { partName: "Rear Wheels", defaultX: 80, defaultY: 72 }
      ]
    },
    right: {
      view: "right",
      label: "Right Side View",
      viewBox: "0 0 360 240",
      paths: [
        { type: "line", x1: 10, y1: 206, x2: 350, y2: 206, stroke: "#cbd5e1", strokeWidth: 1.5 },
        { type: "circle", cx: 292, cy: 174, r: 32, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Front Wheel" },
        { type: "circle", cx: 70, cy: 174, r: 32, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Rear Wheels" },

        { type: "rect", x: 16, y: 32, width: 326, height: 142, rx: 8, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 2, partName: "Bus Side Body" },
        { type: "rect", x: 26, y: 46, width: 68, height: 54, rx: 3, fill: "#e0f2fe", stroke: "#0284c7", strokeWidth: 1.4, partName: "Side Window 4" },
        { type: "rect", x: 100, y: 46, width: 56, height: 54, rx: 3, fill: "#e0f2fe", stroke: "#0284c7", strokeWidth: 1.4, partName: "Side Window 3" },
        { type: "rect", x: 162, y: 46, width: 56, height: 54, rx: 3, fill: "#e0f2fe", stroke: "#0284c7", strokeWidth: 1.4, partName: "Side Window 2" },
        { type: "rect", x: 224, y: 46, width: 56, height: 54, rx: 3, fill: "#e0f2fe", stroke: "#0284c7", strokeWidth: 1.4, partName: "Side Window 1" }
      ],
      hotspots: [
        { partName: "Front Wheel", defaultX: 81, defaultY: 72 },
        { partName: "Rear Wheels", defaultX: 20, defaultY: 72 }
      ]
    },
    top: {
      view: "top",
      label: "Top View",
      viewBox: "0 0 360 250",
      paths: [
        { type: "rect", x: 24, y: 46, width: 312, height: 158, rx: 8, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 2, partName: "Bus Roof" },
        // Roof AC Unit Pod
        { type: "rect", x: 140, y: 84, width: 80, height: 82, rx: 6, fill: "#334155", stroke: "#0f172a", strokeWidth: 1.5, partName: "Rooftop AC Unit" }
      ],
      hotspots: [
        { partName: "Bus Roof", defaultX: 50, defaultY: 50 },
        { partName: "Rooftop AC Unit", defaultX: 50, defaultY: 50 }
      ]
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 8. TRACTOR SPECIFICATION (Agricultural 4-Wheel Tractor)
// ─────────────────────────────────────────────────────────────────────────────
export const TRACTOR_SPEC: CategoryDiagramSpec = {
  category: "Tractor",
  displayName: "Agricultural Utility Tractor",
  icon: "tractor",
  views: {
    front: {
      view: "front",
      label: "Front View",
      viewBox: "0 0 360 250",
      paths: [
        { type: "line", x1: 20, y1: 236, x2: 340, y2: 236, stroke: "#cbd5e1", strokeWidth: 1.5 },
        // Front Steer Wheels
        { type: "rect", x: 58, y: 172, width: 24, height: 64, rx: 4, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.6, partName: "Left Front Wheel" },
        { type: "rect", x: 278, y: 172, width: 24, height: 64, rx: 4, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.6, partName: "Right Front Wheel" },

        // Front Tractor Cowl / Hood (Massey Red)
        { type: "rect", x: 125, y: 80, width: 110, height: 96, rx: 6, fill: "#dc2626", stroke: "#991b1b", strokeWidth: 2, partName: "Tractor Hood" },
        // Grille & Headlamps
        { type: "rect", x: 136, y: 92, width: 88, height: 50, rx: 3, fill: "#0f172a", stroke: "#334155", strokeWidth: 1.2, partName: "Front Grille" },
        { type: "circle", cx: 154, cy: 112, r: 8, fill: "#fef08a", stroke: "#ca8a04", strokeWidth: 1.2, partName: "Left Headlight" },
        { type: "circle", cx: 206, cy: 112, r: 8, fill: "#fef08a", stroke: "#ca8a04", strokeWidth: 1.2, partName: "Right Headlight" },

        // Tall Vertical Exhaust Smoke Stack
        { type: "rect", x: 112, y: 24, width: 9, height: 74, rx: 2, fill: "#0f172a", stroke: "#000", strokeWidth: 1.2, partName: "Exhaust Smoke Stack" },

        // Front Counterweights
        { type: "rect", x: 118, y: 180, width: 124, height: 26, rx: 3, fill: "#334155", stroke: "#0f172a", strokeWidth: 1.5, partName: "Front Counterweights" },

        // Safety ROPS Roll Bar above
        {
          type: "path",
          d: "M 86,160 L 86,34 L 274,34 L 274,160",
          fill: "none",
          stroke: "#dc2626",
          strokeWidth: 5,
          partName: "ROPS Safety Roll Bar"
        }
      ],
      hotspots: [
        { partName: "ROPS Safety Roll Bar", defaultX: 50, defaultY: 15 },
        { partName: "Exhaust Smoke Stack", defaultX: 32, defaultY: 20 },
        { partName: "Tractor Hood", defaultX: 50, defaultY: 52 },
        { partName: "Front Grille", defaultX: 50, defaultY: 47 },
        { partName: "Front Counterweights", defaultX: 50, defaultY: 77 },
        { partName: "Left Front Wheel", defaultX: 19, defaultY: 82 },
        { partName: "Right Front Wheel", defaultX: 81, defaultY: 82 }
      ]
    },
    rear: {
      view: "rear",
      label: "Rear View",
      viewBox: "0 0 360 250",
      paths: [
        { type: "line", x1: 20, y1: 236, x2: 340, y2: 236, stroke: "#cbd5e1", strokeWidth: 1.5 },
        // Giant Oversized Rear Ag-Tires
        { type: "rect", x: 44, y: 130, width: 44, height: 106, rx: 8, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Left Rear Wheel" },
        { type: "rect", x: 272, y: 130, width: 44, height: 106, rx: 8, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Right Rear Wheel" },

        // Curved Fenders
        { type: "path", d: "M 40,130 C 40,110 92,110 92,130", fill: "#dc2626", stroke: "#991b1b", strokeWidth: 2, partName: "Left Fender" },
        { type: "path", d: "M 268,130 C 268,110 320,110 320,130", fill: "#dc2626", stroke: "#991b1b", strokeWidth: 2, partName: "Right Fender" },

        // Operator Seat
        { type: "rect", x: 155, y: 110, width: 50, height: 42, rx: 6, fill: "#0f172a", partName: "Driver Seat" },

        // ROPS Bar
        { type: "path", d: "M 86,160 L 86,34 L 274,34 L 274,160", fill: "none", stroke: "#dc2626", strokeWidth: 5, partName: "ROPS Safety Roll Bar" },

        // 3-Point Hitch & PTO Shaft
        { type: "circle", cx: 180, cy: 198, r: 8, fill: "#f59e0b", stroke: "#b45309", strokeWidth: 1.5, partName: "PTO Shaft" },
        { type: "line", x1: 140, y1: 194, x2: 180, y2: 218, stroke: "#334155", strokeWidth: 4, partName: "3-Point Hitch" },
        { type: "line", x1: 220, y1: 194, x2: 180, y2: 218, stroke: "#334155", strokeWidth: 4, partName: "3-Point Hitch" }
      ],
      hotspots: [
        { partName: "ROPS Safety Roll Bar", defaultX: 50, defaultY: 15 },
        { partName: "Driver Seat", defaultX: 50, defaultY: 52 },
        { partName: "Left Rear Wheel", defaultX: 18, defaultY: 72 },
        { partName: "Right Rear Wheel", defaultX: 82, defaultY: 72 },
        { partName: "3-Point Hitch", defaultX: 50, defaultY: 82 }
      ]
    },
    left: {
      view: "left",
      label: "Left Side View",
      viewBox: "0 0 360 240",
      paths: [
        { type: "line", x1: 10, y1: 210, x2: 350, y2: 210, stroke: "#cbd5e1", strokeWidth: 1.5 },

        // Small Front Wheel
        { type: "circle", cx: 76, cy: 176, r: 32, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Front Wheel" },
        // Giant Rear Wheel (r=56, height 112px!)
        { type: "circle", cx: 268, cy: 154, r: 56, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2.5, partName: "Rear Ag-Tire" },
        { type: "circle", cx: 268, cy: 154, r: 34, fill: "#dc2626", stroke: "#991b1b", strokeWidth: 1.5 },
        { type: "circle", cx: 268, cy: 154, r: 12, fill: "#f8fafc" },

        // Tractor Engine Hood
        { type: "polygon", points: "96,102 186,102 186,176 96,176", fill: "#dc2626", stroke: "#991b1b", strokeWidth: 2, partName: "Tractor Hood" },
        { type: "rect", x: 74, y: 104, width: 24, height: 68, rx: 4, fill: "#0f172a", stroke: "#334155", strokeWidth: 1.5, partName: "Front Grille" },

        // Tall Vertical Exhaust Stack with Rain Flapper
        { type: "rect", x: 136, y: 32, width: 8, height: 74, fill: "#0f172a", stroke: "#000", strokeWidth: 1.2, partName: "Exhaust Pipe" },
        { type: "rect", x: 132, y: 28, width: 16, height: 4, fill: "#334155" },

        // Driver Platform & Steering Wheel
        { type: "line", x1: 178, y1: 112, x2: 194, y2: 82, stroke: "#0f172a", strokeWidth: 3 },
        { type: "circle", cx: 196, cy: 80, r: 8, fill: "#0f172a", partName: "Steering Wheel" },
        { type: "rect", x: 214, y: 98, width: 28, height: 26, rx: 3, fill: "#0f172a", partName: "Driver Seat" },

        // ROPS Safety Bar
        {
          type: "path",
          d: "M 238,154 L 238,36 L 292,36 L 292,154",
          fill: "none",
          stroke: "#dc2626",
          strokeWidth: 6,
          partName: "ROPS Safety Roll Bar"
        },

        // 3-Point Hitch Linkage
        { type: "line", x1: 298, y1: 168, x2: 334, y2: 184, stroke: "#334155", strokeWidth: 4, partName: "3-Point Hitch" }
      ],
      hotspots: [
        { partName: "Front Wheel", defaultX: 21, defaultY: 73 },
        { partName: "Tractor Hood", defaultX: 38, defaultY: 58 },
        { partName: "Exhaust Pipe", defaultX: 39, defaultY: 28 },
        { partName: "ROPS Safety Roll Bar", defaultX: 74, defaultY: 18 },
        { partName: "Rear Ag-Tire", defaultX: 74, defaultY: 64 },
        { partName: "3-Point Hitch", defaultX: 88, defaultY: 74 }
      ]
    },
    right: {
      view: "right",
      label: "Right Side View",
      viewBox: "0 0 360 240",
      paths: [
        { type: "line", x1: 10, y1: 210, x2: 350, y2: 210, stroke: "#cbd5e1", strokeWidth: 1.5 },
        { type: "circle", cx: 284, cy: 176, r: 32, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Front Wheel" },
        { type: "circle", cx: 92, cy: 154, r: 56, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2.5, partName: "Rear Ag-Tire" },
        { type: "circle", cx: 92, cy: 154, r: 34, fill: "#dc2626", stroke: "#991b1b", strokeWidth: 1.5 },

        { type: "polygon", points: "264,102 174,102 174,176 264,176", fill: "#dc2626", stroke: "#991b1b", strokeWidth: 2, partName: "Tractor Hood" },
        { type: "rect", x: 262, y: 104, width: 24, height: 68, rx: 4, fill: "#0f172a", stroke: "#334155", strokeWidth: 1.5, partName: "Front Grille" },

        { type: "rect", x: 216, y: 32, width: 8, height: 74, fill: "#0f172a", stroke: "#000", strokeWidth: 1.2, partName: "Exhaust Pipe" },

        { type: "path", d: "M 122,154 L 122,36 L 68,36 L 68,154", fill: "none", stroke: "#dc2626", strokeWidth: 6, partName: "ROPS Safety Roll Bar" }
      ],
      hotspots: [
        { partName: "Front Wheel", defaultX: 79, defaultY: 73 },
        { partName: "Tractor Hood", defaultX: 62, defaultY: 58 },
        { partName: "Rear Ag-Tire", defaultX: 26, defaultY: 64 }
      ]
    },
    top: {
      view: "top",
      label: "Top View",
      viewBox: "0 0 360 250",
      paths: [
        { type: "rect", x: 44, y: 92, width: 110, height: 66, rx: 6, fill: "#dc2626", stroke: "#991b1b", strokeWidth: 2, partName: "Tractor Hood" },
        { type: "rect", x: 34, y: 52, width: 44, height: 18, rx: 4, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.5, partName: "Left Front Wheel" },
        { type: "rect", x: 34, y: 180, width: 44, height: 18, rx: 4, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.5, partName: "Right Front Wheel" },
        { type: "rect", x: 204, y: 36, width: 84, height: 38, rx: 6, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Left Rear Ag-Tire" },
        { type: "rect", x: 204, y: 176, width: 84, height: 38, rx: 6, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Right Rear Ag-Tire" },
        { type: "rect", x: 196, y: 104, width: 34, height: 42, rx: 4, fill: "#0f172a", partName: "Driver Seat" }
      ],
      hotspots: [
        { partName: "Tractor Hood", defaultX: 28, defaultY: 50 },
        { partName: "Driver Seat", defaultX: 58, defaultY: 50 },
        { partName: "Left Rear Ag-Tire", defaultX: 68, defaultY: 22 },
        { partName: "Right Rear Ag-Tire", defaultX: 68, defaultY: 78 }
      ]
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 9. FALLBACK SPECIFICATION
// ─────────────────────────────────────────────────────────────────────────────
export const FALLBACK_SPEC: CategoryDiagramSpec = {
  ...CAR_SPEC,
  category: "Generic",
  displayName: "Standard Vehicle Diagram",
  isFallback: true
};

/**
 * Complete Category Diagram Registry
 */
export const VEHICLE_DIAGRAMS: Record<string, CategoryDiagramSpec> = {
  Car: CAR_SPEC,
  SUV: SUV_SPEC,
  Van: VAN_SPEC,
  Bus: BUS_SPEC,
  Motorcycle: MOTORCYCLE_SPEC,
  Lorry: LORRY_SPEC,
  Tractor: TRACTOR_SPEC,
  "Three-Wheeler": THREE_WHEELER_SPEC,
  Generic: FALLBACK_SPEC
};

/**
 * Normalizes any free-text vehicle category, make, or model string into supported diagram categories.
 */
export function normalizeVehicleCategory(rawCategory = ""): {
  category: string;
  isFallback: boolean;
  original: string;
} {
  const c = String(rawCategory || "").trim().toLowerCase();

  // 1. Two-Wheelers / Motorcycles / Scooters
  if (
    c.includes("motorcycle") ||
    c.includes("motorbike") ||
    c.includes("motor cycle") ||
    c.includes("bike") ||
    c.includes("scooter") ||
    c.includes("moped") ||
    c.includes("discover") ||
    c.includes("pulsar") ||
    (c.includes("bajaj") && !c.includes("re") && !c.includes("three") && !c.includes("auto")) ||
    c.includes("dio") ||
    c.includes("activa") ||
    c.includes("tvs") ||
    c.includes("hero") ||
    c.includes("splendor") ||
    c.includes("yamaha") ||
    c.includes("fz") ||
    c.includes("platina") ||
    c.includes("ct100") ||
    c.includes("gn125") ||
    c.includes("gixxer")
  ) {
    return { category: "Motorcycle", isFallback: false, original: rawCategory };
  }

  // 2. Three-Wheelers / Tuk-Tuks / Auto Rickshaws
  if (
    c.includes("three") ||
    c.includes("tuk") ||
    c.includes("auto") ||
    c.includes("trishaw") ||
    c.includes("3 wheel") ||
    c.includes("3-wheel") ||
    c.includes("bajaj re") ||
    c.includes("piaggio")
  ) {
    return { category: "Three-Wheeler", isFallback: false, original: rawCategory };
  }

  // 3. Commercial Lorries / Trucks
  if (
    c.includes("lorry") ||
    c.includes("truck") ||
    c.includes("tipper") ||
    c.includes("trailer") ||
    c.includes("dimo batta") ||
    c.includes("heavy vehicle") ||
    c.includes("isuzu") ||
    c.includes("fuso") ||
    c.includes("canter") ||
    c.includes("eicher")
  ) {
    return { category: "Lorry", isFallback: false, original: rawCategory };
  }

  // 4. Commercial Buses / Coaches
  if (
    c.includes("bus") ||
    c.includes("coach") ||
    c.includes("rosa") ||
    c.includes("coaster") ||
    c.includes("leyland")
  ) {
    return { category: "Bus", isFallback: false, original: rawCategory };
  }

  // 5. Agricultural Tractors
  if (
    c.includes("tractor") ||
    c.includes("harvester") ||
    c.includes("agri") ||
    c.includes("massey") ||
    c.includes("tafe") ||
    c.includes("kubota") ||
    c.includes("deere")
  ) {
    return { category: "Tractor", isFallback: false, original: rawCategory };
  }

  // 6. Passenger & Panel Vans
  if (
    c.includes("van") ||
    c.includes("caravan") ||
    c.includes("hiace") ||
    c.includes("urvan") ||
    c.includes("every") ||
    c.includes("microbus")
  ) {
    return { category: "Van", isFallback: false, original: rawCategory };
  }

  // 7. SUVs / Crossovers / Pickups / Double Cabs
  if (
    c.includes("suv") ||
    c.includes("cab") ||
    c.includes("double cab") ||
    c.includes("jeep") ||
    c.includes("hilux") ||
    c.includes("prado") ||
    c.includes("montero") ||
    c.includes("vezel") ||
    c.includes("rav4") ||
    c.includes("cr-v") ||
    c.includes("sportage")
  ) {
    return { category: "SUV", isFallback: false, original: rawCategory };
  }

  // 8. Passenger Cars / Sedans / Hatchbacks
  if (
    c.includes("car") ||
    c.includes("sedan") ||
    c.includes("hatchback") ||
    c.includes("coupe") ||
    c.includes("wagon") ||
    c.includes("corolla") ||
    c.includes("prius") ||
    c.includes("civic") ||
    c.includes("vitz") ||
    c.includes("alto") ||
    c.includes("wagon r") ||
    c.includes("axio") ||
    c.includes("allion") ||
    c.includes("premio") ||
    c.includes("grace")
  ) {
    return { category: "Car", isFallback: false, original: rawCategory };
  }

  return { category: "Generic", isFallback: true, original: rawCategory };
}

/**
 * Resolves the appropriate diagram spec given any raw or normalized category name
 */
export function getDiagramForCategory(categoryName = ""): CategoryDiagramSpec {
  const norm = normalizeVehicleCategory(categoryName);
  return VEHICLE_DIAGRAMS[norm.category] || FALLBACK_SPEC;
}
