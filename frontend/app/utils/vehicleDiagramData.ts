/**
 * Clean, Simple, Realistic Automotive Blueprint Vector Schematics
 * SANASA Insurance Claim Inspection System
 *
 * ViewBox: 0 0 400 240
 * Clean, proportional engineering blueprints designed for easy part identification:
 * - Car (Clean Modern 4-Door Sedan)
 * - Motorcycle (Realistic Street Commuter / Discover / Pulsar / Scooter)
 * - Three-Wheeler (Authentic Sri Lankan Bajaj RE Tuk-Tuk)
 * - SUV (Modern Crossover / 4x4 / Double Cab)
 * - Van (Passenger Van / Microbus)
 * - Lorry (Commercial Truck / Lorry)
 * - Bus (Commercial Coach / Bus)
 * - Tractor (Agricultural Utility Tractor)
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
// ─────────────────────────────────────────────────────────────────────────────
// 1. CAR SPECIFICATION (Clean, Simple, Real-Looking Modern Sedan Blueprint)
// ─────────────────────────────────────────────────────────────────────────────
export const CAR_SPEC: CategoryDiagramSpec = {
  category: "Car",
  displayName: "Sedan / Passenger Car",
  icon: "car",
  views: {
    front: {
      view: "front",
      label: "Front View",
      viewBox: "0 0 400 240",
      paths: [
        // Tires standing firmly on ground level (y=180)
        { type: "rect", x: 80, y: 154, width: 24, height: 26, rx: 4, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.5, partName: "Left Front Wheel" },
        { type: "rect", x: 296, y: 154, width: 24, height: 26, rx: 4, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.5, partName: "Right Front Wheel" },
        // Lower chassis guard
        { type: "line", x1: 104, y1: 174, x2: 296, y2: 174, stroke: "#334155", strokeWidth: 2 },

        // Roof & Greenhouse Structure
        { type: "polygon", points: "148,74 252,74 278,114 122,114", fill: "#ffffff", stroke: "#0f172a", strokeWidth: 1.8, partName: "Roof Panel" },
        // Windshield Glass (crystal blue tint)
        { type: "polygon", points: "152,76 248,76 272,112 128,112", fill: "#e0f2fe", stroke: "#0284c7", strokeWidth: 1.2, partName: "Windscreen" },
        // Inside Rear-view Mirror
        { type: "rect", x: 194, y: 78, width: 12, height: 6, rx: 1, fill: "#1e293b" },
        // Dual Windshield Wipers
        { type: "line", x1: 138, y1: 112, x2: 184, y2: 106, stroke: "#0f172a", strokeWidth: 1.5 },
        { type: "line", x1: 202, y1: 112, x2: 248, y2: 106, stroke: "#0f172a", strokeWidth: 1.5 },

        // Aerodynamic Side Mirrors
        { type: "polygon", points: "102,106 122,108 122,117 102,114", fill: "#ffffff", stroke: "#0f172a", strokeWidth: 1.5, partName: "Left Mirror" },
        { type: "polygon", points: "298,106 278,108 278,117 298,114", fill: "#ffffff", stroke: "#0f172a", strokeWidth: 1.5, partName: "Right Mirror" },

        // Bonnet / Hood & Front Fenders
        { type: "polygon", points: "122,114 278,114 312,140 88,140", fill: "#ffffff", stroke: "#0f172a", strokeWidth: 1.8, partName: "Bonnet / Hood" },
        // Hood Character Lines (Shut lines)
        { type: "line", x1: 148, y1: 114, x2: 136, y2: 140, stroke: "#64748b", strokeWidth: 1.2 },
        { type: "line", x1: 252, y1: 114, x2: 264, y2: 140, stroke: "#64748b", strokeWidth: 1.2 },

        // Sleek Modern LED Projector Headlights
        { type: "polygon", points: "88,140 142,140 138,152 84,146", fill: "#fef9c3", stroke: "#ca8a04", strokeWidth: 1.4, partName: "Left Headlight" },
        { type: "circle", cx: 114, cy: 146, r: 4, fill: "#ffffff", stroke: "#ca8a04", strokeWidth: 1 },
        { type: "polygon", points: "312,140 258,140 262,152 316,146", fill: "#fef9c3", stroke: "#ca8a04", strokeWidth: 1.4, partName: "Right Headlight" },
        { type: "circle", cx: 286, cy: 146, r: 4, fill: "#ffffff", stroke: "#ca8a04", strokeWidth: 1 },

        // Front Grille
        { type: "polygon", points: "146,140 254,140 248,158 152,158", fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.5, partName: "Front Grille" },
        { type: "line", x1: 150, y1: 146, x2: 250, y2: 146, stroke: "#94a3b8", strokeWidth: 1 },
        { type: "line", x1: 153, y1: 152, x2: 247, y2: 152, stroke: "#94a3b8", strokeWidth: 1 },
        { type: "circle", cx: 200, cy: 149, r: 5, fill: "#ffffff", stroke: "#2563eb", strokeWidth: 1.2 },

        // Front Bumper (Crisp lower fascia)
        { type: "polygon", points: "82,146 318,146 312,174 88,174", fill: "#f8fafc", stroke: "#0f172a", strokeWidth: 1.8, partName: "Front Bumper" },
        // Lower Air Dam & Fog Lamps
        { type: "rect", x: 154, y: 161, width: 92, height: 10, rx: 2, fill: "#0f172a", stroke: "#334155", strokeWidth: 1 },
        { type: "rect", x: 98, y: 158, width: 18, height: 8, rx: 2, fill: "#fef9c3", stroke: "#ca8a04", strokeWidth: 1, partName: "Left Fog Lamp" },
        { type: "rect", x: 284, y: 158, width: 18, height: 8, rx: 2, fill: "#fef9c3", stroke: "#ca8a04", strokeWidth: 1, partName: "Right Fog Lamp" },
        // Front License Plate
        { type: "rect", x: 168, y: 160, width: 64, height: 12, rx: 2, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 1.2, partName: "Front License Plate" }
      ],
      hotspots: [
        { partName: "Front Bumper", defaultX: 50, defaultY: 70 },
        { partName: "Front Grille", defaultX: 50, defaultY: 62 },
        { partName: "Bonnet / Hood", defaultX: 50, defaultY: 53 },
        { partName: "Windscreen", defaultX: 50, defaultY: 39 },
        { partName: "Roof Panel", defaultX: 50, defaultY: 29 },
        { partName: "Left Headlight", defaultX: 28, defaultY: 61 },
        { partName: "Right Headlight", defaultX: 72, defaultY: 61 },
        { partName: "Left Fog Lamp", defaultX: 27, defaultY: 69 },
        { partName: "Right Fog Lamp", defaultX: 73, defaultY: 69 },
        { partName: "Left Mirror", defaultX: 27, defaultY: 46 },
        { partName: "Right Mirror", defaultX: 73, defaultY: 46 },
        { partName: "Left Front Wheel", defaultX: 23, defaultY: 70 },
        { partName: "Right Front Wheel", defaultX: 77, defaultY: 70 }
      ]
    },
    rear: {
      view: "rear",
      label: "Rear View",
      viewBox: "0 0 400 240",
      paths: [
        // Tires standing firmly on ground level (y=180)
        { type: "rect", x: 80, y: 154, width: 24, height: 26, rx: 4, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.5, partName: "Left Rear Wheel" },
        { type: "rect", x: 296, y: 154, width: 24, height: 26, rx: 4, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.5, partName: "Right Rear Wheel" },
        // Lower chassis & dual exhaust tips
        { type: "line", x1: 104, y1: 174, x2: 296, y2: 174, stroke: "#334155", strokeWidth: 2 },
        { type: "rect", x: 102, y: 172, width: 14, height: 6, rx: 2, fill: "#94a3b8", stroke: "#475569", strokeWidth: 1, partName: "Exhaust System" },
        { type: "rect", x: 284, y: 172, width: 14, height: 6, rx: 2, fill: "#94a3b8", stroke: "#475569", strokeWidth: 1, partName: "Exhaust System" },

        // Roof & Greenhouse Structure
        { type: "polygon", points: "148,74 252,74 278,114 122,114", fill: "#ffffff", stroke: "#0f172a", strokeWidth: 1.8, partName: "Roof Panel" },
        // Shark-fin Antenna
        { type: "polygon", points: "197,68 203,68 202,74 198,74", fill: "#1e293b" },
        // High-mounted 3rd stop light
        { type: "rect", x: 186, y: 75, width: 28, height: 4, rx: 1, fill: "#ef4444", stroke: "#b91c1c", strokeWidth: 0.8 },
        // Rear Windscreen Glass
        { type: "polygon", points: "152,76 248,76 272,112 128,112", fill: "#e0f2fe", stroke: "#0284c7", strokeWidth: 1.2, partName: "Rear Windscreen" },
        // Defroster Lines
        { type: "line", x1: 142, y1: 88, x2: 258, y2: 88, stroke: "#94a3b8", strokeWidth: 0.8, strokeDasharray: "6,2" },
        { type: "line", x1: 136, y1: 98, x2: 264, y2: 98, stroke: "#94a3b8", strokeWidth: 0.8, strokeDasharray: "6,2" },
        { type: "line", x1: 130, y1: 108, x2: 270, y2: 108, stroke: "#94a3b8", strokeWidth: 0.8, strokeDasharray: "6,2" },

        // Boot / Trunk Lid & Rear Quarters
        { type: "polygon", points: "122,114 278,114 312,140 88,140", fill: "#ffffff", stroke: "#0f172a", strokeWidth: 1.8, partName: "Boot / Trunk Lid" },
        // Trunk Shut Lines
        { type: "line", x1: 142, y1: 114, x2: 136, y2: 140, stroke: "#64748b", strokeWidth: 1.2 },
        { type: "line", x1: 258, y1: 114, x2: 264, y2: 140, stroke: "#64748b", strokeWidth: 1.2 },

        // Sleek LED Taillights (Wraparound horizontal styling)
        { type: "polygon", points: "88,140 144,140 140,152 84,146", fill: "#ef4444", stroke: "#b91c1c", strokeWidth: 1.4, partName: "Left Tail Light" },
        { type: "rect", x: 118, y: 143, width: 16, height: 7, rx: 1, fill: "#f59e0b" },
        { type: "polygon", points: "312,140 256,140 260,152 316,146", fill: "#ef4444", stroke: "#b91c1c", strokeWidth: 1.4, partName: "Right Tail Light" },
        { type: "rect", x: 266, y: 143, width: 16, height: 7, rx: 1, fill: "#f59e0b" },

        // Rear License Plate Recess & Plate
        { type: "rect", x: 166, y: 140, width: 68, height: 16, rx: 2, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 1.2, partName: "Rear License Plate" },

        // Rear Bumper
        { type: "polygon", points: "82,146 318,146 312,174 88,174", fill: "#f8fafc", stroke: "#0f172a", strokeWidth: 1.8, partName: "Rear Bumper" },
        // Safety Reflectors
        { type: "rect", x: 96, y: 160, width: 22, height: 5, rx: 2, fill: "#ef4444" },
        { type: "rect", x: 282, y: 160, width: 22, height: 5, rx: 2, fill: "#ef4444" },
        // Lower Diffuser Trim
        { type: "rect", x: 146, y: 166, width: 108, height: 7, rx: 2, fill: "#1e293b" }
      ],
      hotspots: [
        { partName: "Rear Bumper", defaultX: 50, defaultY: 70 },
        { partName: "Boot / Trunk Lid", defaultX: 50, defaultY: 53 },
        { partName: "Rear Windscreen", defaultX: 50, defaultY: 39 },
        { partName: "Roof Panel", defaultX: 50, defaultY: 29 },
        { partName: "Left Tail Light", defaultX: 28, defaultY: 61 },
        { partName: "Right Tail Light", defaultX: 72, defaultY: 61 },
        { partName: "Rear License Plate", defaultX: 50, defaultY: 62 },
        { partName: "Exhaust System", defaultX: 72, defaultY: 75 },
        { partName: "Left Rear Wheel", defaultX: 23, defaultY: 70 },
        { partName: "Right Rear Wheel", defaultX: 77, defaultY: 70 }
      ]
    },
    left: {
      view: "left",
      label: "Left Side View",
      viewBox: "0 0 400 240",
      paths: [
        // Wheels (Front cx=100, Rear cx=300, cy=155, Ground y=175)
        { type: "circle", cx: 100, cy: 155, r: 20, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.5, partName: "Left Front Wheel" },
        { type: "circle", cx: 100, cy: 155, r: 14, fill: "#94a3b8", stroke: "#cbd5e1", strokeWidth: 1 },
        { type: "circle", cx: 100, cy: 155, r: 5, fill: "#f8fafc", stroke: "#475569", strokeWidth: 1 },
        // Front Wheel Spokes
        { type: "line", x1: 100, y1: 142, x2: 100, y2: 150, stroke: "#f8fafc", strokeWidth: 2 },
        { type: "line", x1: 111, y1: 151, x2: 104, y2: 153, stroke: "#f8fafc", strokeWidth: 2 },
        { type: "line", x1: 107, y1: 166, x2: 102, y2: 158, stroke: "#f8fafc", strokeWidth: 2 },
        { type: "line", x1: 93, y1: 166, x2: 98, y2: 158, stroke: "#f8fafc", strokeWidth: 2 },
        { type: "line", x1: 89, y1: 151, x2: 96, y2: 153, stroke: "#f8fafc", strokeWidth: 2 },

        { type: "circle", cx: 300, cy: 155, r: 20, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.5, partName: "Left Rear Wheel" },
        { type: "circle", cx: 300, cy: 155, r: 14, fill: "#94a3b8", stroke: "#cbd5e1", strokeWidth: 1 },
        { type: "circle", cx: 300, cy: 155, r: 5, fill: "#f8fafc", stroke: "#475569", strokeWidth: 1 },
        // Rear Wheel Spokes
        { type: "line", x1: 300, y1: 142, x2: 300, y2: 150, stroke: "#f8fafc", strokeWidth: 2 },
        { type: "line", x1: 311, y1: 151, x2: 304, y2: 153, stroke: "#f8fafc", strokeWidth: 2 },
        { type: "line", x1: 307, y1: 166, x2: 302, y2: 158, stroke: "#f8fafc", strokeWidth: 2 },
        { type: "line", x1: 293, y1: 166, x2: 298, y2: 158, stroke: "#f8fafc", strokeWidth: 2 },
        { type: "line", x1: 289, y1: 151, x2: 296, y2: 153, stroke: "#f8fafc", strokeWidth: 2 },

        // Sleek, Proportional Modern Sedan Body Silhouette
        {
          type: "path",
          d: "M 42,142 L 52,134 L 126,116 L 172,80 L 252,80 L 306,116 L 356,118 L 362,138 L 350,158 L 323,158 A 23,23 0 0 0 277,158 L 123,158 A 23,23 0 0 0 77,158 L 45,158 Z",
          fill: "#ffffff",
          stroke: "#0f172a",
          strokeWidth: 2,
          partName: "Left Body Panels"
        },
        // Rocker Panel Sill Trim
        { type: "line", x1: 123, y1: 158, x2: 277, y2: 158, stroke: "#334155", strokeWidth: 3, partName: "Rocker Panel" },

        // Side Windows (A-Pillar to B-Pillar, B-Pillar to C-Pillar)
        { type: "polygon", points: "132,114 170,83 203,83 203,114", fill: "#e0f2fe", stroke: "#0284c7", strokeWidth: 1.2, partName: "Left Front Window" },
        { type: "rect", x: 203, y: 81, width: 6, height: 33, fill: "#1e293b" },
        { type: "polygon", points: "209,83 248,83 298,114 209,114", fill: "#e0f2fe", stroke: "#0284c7", strokeWidth: 1.2, partName: "Left Rear Window" },
        { type: "line", x1: 280, y1: 100, x2: 280, y2: 114, stroke: "#1e293b", strokeWidth: 1.2 },

        // Clear Panel Shut Lines (Inspection Parts Separation)
        { type: "line", x1: 58, y1: 133, x2: 68, y2: 155, stroke: "#475569", strokeWidth: 1.2, partName: "Front Bumper" },
        { type: "line", x1: 126, y1: 116, x2: 126, y2: 158, stroke: "#475569", strokeWidth: 1.2, partName: "Left Front Fender" },
        { type: "line", x1: 206, y1: 114, x2: 206, y2: 158, stroke: "#475569", strokeWidth: 1.2, partName: "Left Front Door" },
        { type: "line", x1: 298, y1: 114, x2: 280, y2: 158, stroke: "#475569", strokeWidth: 1.2, partName: "Left Rear Door" },
        { type: "line", x1: 348, y1: 120, x2: 330, y2: 155, stroke: "#475569", strokeWidth: 1.2, partName: "Left Quarter Panel" },

        // Waistline Character Crease
        { type: "line", x1: 56, y1: 126, x2: 354, y2: 126, stroke: "#e2e8f0", strokeWidth: 1.5 },

        // Flush Minimalist Door Handles
        { type: "rect", x: 170, y: 120, width: 16, height: 4, rx: 2, fill: "#cbd5e1", stroke: "#64748b", strokeWidth: 0.8 },
        { type: "rect", x: 238, y: 120, width: 16, height: 4, rx: 2, fill: "#cbd5e1", stroke: "#64748b", strokeWidth: 0.8 },

        // Aerodynamic Side Mirror
        { type: "polygon", points: "128,104 142,107 142,116 128,113", fill: "#ffffff", stroke: "#0f172a", strokeWidth: 1.4, partName: "Left Mirror" },

        // Headlight & Taillight Wraparound Tips
        { type: "polygon", points: "42,142 52,134 64,130 58,144", fill: "#fef9c3", stroke: "#ca8a04", strokeWidth: 1 },
        { type: "polygon", points: "356,118 362,138 348,136 346,120", fill: "#ef4444", stroke: "#b91c1c", strokeWidth: 1 }
      ],
      hotspots: [
        { partName: "Front Bumper", defaultX: 12, defaultY: 62 },
        { partName: "Left Front Fender", defaultX: 24, defaultY: 57 },
        { partName: "Left Front Wheel", defaultX: 25, defaultY: 68 },
        { partName: "Left Front Door", defaultX: 43, defaultY: 57 },
        { partName: "Left Rear Door", defaultX: 62, defaultY: 57 },
        { partName: "Left Rear Wheel", defaultX: 75, defaultY: 68 },
        { partName: "Left Quarter Panel", defaultX: 84, defaultY: 57 },
        { partName: "Rear Bumper", defaultX: 90, defaultY: 62 },
        { partName: "Roof Panel", defaultX: 53, defaultY: 34 },
        { partName: "Rocker Panel", defaultX: 50, defaultY: 67 }
      ]
    },
    right: {
      view: "right",
      label: "Right Side View",
      viewBox: "0 0 400 240",
      paths: [
        // Wheels (Front cx=300, Rear cx=100, cy=155, Ground y=175)
        { type: "circle", cx: 300, cy: 155, r: 20, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.5, partName: "Right Front Wheel" },
        { type: "circle", cx: 300, cy: 155, r: 14, fill: "#94a3b8", stroke: "#cbd5e1", strokeWidth: 1 },
        { type: "circle", cx: 300, cy: 155, r: 5, fill: "#f8fafc", stroke: "#475569", strokeWidth: 1 },
        // Front Wheel Spokes
        { type: "line", x1: 300, y1: 142, x2: 300, y2: 150, stroke: "#f8fafc", strokeWidth: 2 },
        { type: "line", x1: 311, y1: 151, x2: 304, y2: 153, stroke: "#f8fafc", strokeWidth: 2 },
        { type: "line", x1: 307, y1: 166, x2: 302, y2: 158, stroke: "#f8fafc", strokeWidth: 2 },
        { type: "line", x1: 293, y1: 166, x2: 298, y2: 158, stroke: "#f8fafc", strokeWidth: 2 },
        { type: "line", x1: 289, y1: 151, x2: 296, y2: 153, stroke: "#f8fafc", strokeWidth: 2 },

        { type: "circle", cx: 100, cy: 155, r: 20, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.5, partName: "Right Rear Wheel" },
        { type: "circle", cx: 100, cy: 155, r: 14, fill: "#94a3b8", stroke: "#cbd5e1", strokeWidth: 1 },
        { type: "circle", cx: 100, cy: 155, r: 5, fill: "#f8fafc", stroke: "#475569", strokeWidth: 1 },
        // Rear Wheel Spokes
        { type: "line", x1: 100, y1: 142, x2: 100, y2: 150, stroke: "#f8fafc", strokeWidth: 2 },
        { type: "line", x1: 111, y1: 151, x2: 104, y2: 153, stroke: "#f8fafc", strokeWidth: 2 },
        { type: "line", x1: 107, y1: 166, x2: 102, y2: 158, stroke: "#f8fafc", strokeWidth: 2 },
        { type: "line", x1: 93, y1: 166, x2: 98, y2: 158, stroke: "#f8fafc", strokeWidth: 2 },
        { type: "line", x1: 89, y1: 151, x2: 96, y2: 153, stroke: "#f8fafc", strokeWidth: 2 },

        // Mirrored Sedan Body Silhouette (x' = 400 - x)
        {
          type: "path",
          d: "M 358,142 L 348,134 L 274,116 L 228,80 L 148,80 L 94,116 L 44,118 L 38,138 L 50,158 L 77,158 A 23,23 0 0 1 123,158 L 277,158 A 23,23 0 0 1 323,158 L 355,158 Z",
          fill: "#ffffff",
          stroke: "#0f172a",
          strokeWidth: 2,
          partName: "Right Body Panels"
        },
        // Rocker Panel Sill Trim
        { type: "line", x1: 123, y1: 158, x2: 277, y2: 158, stroke: "#334155", strokeWidth: 3, partName: "Rocker Panel" },

        // Windows
        { type: "polygon", points: "268,114 230,83 197,83 197,114", fill: "#e0f2fe", stroke: "#0284c7", strokeWidth: 1.2, partName: "Right Front Window" },
        { type: "rect", x: 191, y: 81, width: 6, height: 33, fill: "#1e293b" },
        { type: "polygon", points: "191,83 152,83 102,114 191,114", fill: "#e0f2fe", stroke: "#0284c7", strokeWidth: 1.2, partName: "Right Rear Window" },
        { type: "line", x1: 120, y1: 100, x2: 120, y2: 114, stroke: "#1e293b", strokeWidth: 1.2 },

        // Shut Lines
        { type: "line", x1: 342, y1: 133, x2: 332, y2: 155, stroke: "#475569", strokeWidth: 1.2, partName: "Front Bumper" },
        { type: "line", x1: 274, y1: 116, x2: 274, y2: 158, stroke: "#475569", strokeWidth: 1.2, partName: "Right Front Fender" },
        { type: "line", x1: 194, y1: 114, x2: 194, y2: 158, stroke: "#475569", strokeWidth: 1.2, partName: "Right Front Door" },
        { type: "line", x1: 102, y1: 114, x2: 120, y2: 158, stroke: "#475569", strokeWidth: 1.2, partName: "Right Rear Door" },
        { type: "line", x1: 52, y1: 120, x2: 70, y2: 155, stroke: "#475569", strokeWidth: 1.2, partName: "Right Quarter Panel" },

        // Fuel Filler Cap
        { type: "circle", cx: 100, cy: 106, r: 6, fill: "#ffffff", stroke: "#94a3b8", strokeWidth: 1.2, partName: "Fuel Filler Cap" },

        // Character Line
        { type: "line", x1: 344, y1: 126, x2: 46, y2: 126, stroke: "#e2e8f0", strokeWidth: 1.5 },

        // Door Handles
        { type: "rect", x: 214, y: 120, width: 16, height: 4, rx: 2, fill: "#cbd5e1", stroke: "#64748b", strokeWidth: 0.8 },
        { type: "rect", x: 146, y: 120, width: 16, height: 4, rx: 2, fill: "#cbd5e1", stroke: "#64748b", strokeWidth: 0.8 },

        // Side Mirror
        { type: "polygon", points: "272,104 258,107 258,116 272,113", fill: "#ffffff", stroke: "#0f172a", strokeWidth: 1.4, partName: "Right Mirror" },

        // Lights
        { type: "polygon", points: "358,142 348,134 336,130 342,144", fill: "#fef9c3", stroke: "#ca8a04", strokeWidth: 1 },
        { type: "polygon", points: "44,118 38,138 52,136 54,120", fill: "#ef4444", stroke: "#b91c1c", strokeWidth: 1 }
      ],
      hotspots: [
        { partName: "Front Bumper", defaultX: 88, defaultY: 62 },
        { partName: "Right Front Fender", defaultX: 76, defaultY: 57 },
        { partName: "Right Front Wheel", defaultX: 75, defaultY: 68 },
        { partName: "Right Front Door", defaultX: 57, defaultY: 57 },
        { partName: "Right Rear Door", defaultX: 38, defaultY: 57 },
        { partName: "Right Rear Wheel", defaultX: 25, defaultY: 68 },
        { partName: "Right Quarter Panel", defaultX: 16, defaultY: 57 },
        { partName: "Rear Bumper", defaultX: 10, defaultY: 62 },
        { partName: "Roof Panel", defaultX: 47, defaultY: 34 },
        { partName: "Rocker Panel", defaultX: 50, defaultY: 67 }
      ]
    },
    top: {
      view: "top",
      label: "Top View",
      viewBox: "0 0 400 240",
      paths: [
        // Realistic Top-Down Automotive Blueprint Perimeter (Contoured body, NOT a pill capsule)
        {
          type: "path",
          d: "M 42,120 C 42,94 56,76 80,76 L 310,76 C 342,76 358,94 358,120 C 358,146 342,164 310,164 L 80,164 C 56,164 42,146 42,120 Z",
          fill: "#ffffff",
          stroke: "#0f172a",
          strokeWidth: 2,
          partName: "Car Body Outline"
        },

        // Front Bumper Nose Section
        {
          type: "path",
          d: "M 42,120 C 42,94 56,76 72,76 L 72,164 C 56,164 42,146 42,120 Z",
          fill: "#f8fafc",
          stroke: "#0f172a",
          strokeWidth: 1.5,
          partName: "Front Bumper"
        },

        // Angular Corner Headlights
        { type: "polygon", points: "54,78 74,78 74,94 50,90", fill: "#fef9c3", stroke: "#ca8a04", strokeWidth: 1.2, partName: "Left Headlight" },
        { type: "polygon", points: "54,162 74,162 74,146 50,150", fill: "#fef9c3", stroke: "#ca8a04", strokeWidth: 1.2, partName: "Right Headlight" },

        // Bonnet / Hood with Longitudinal Shut Lines
        { type: "polygon", points: "72,76 128,76 128,164 72,164", fill: "#ffffff", stroke: "#0f172a", strokeWidth: 1.5, partName: "Bonnet / Hood" },
        { type: "line", x1: 72, y1: 90, x2: 128, y2: 90, stroke: "#64748b", strokeWidth: 1.2, partName: "Left Front Fender" },
        { type: "line", x1: 72, y1: 150, x2: 128, y2: 150, stroke: "#64748b", strokeWidth: 1.2, partName: "Right Front Fender" },

        // Front Windscreen (curved automotive rake)
        { type: "polygon", points: "128,76 166,80 166,160 128,164", fill: "#e0f2fe", stroke: "#0284c7", strokeWidth: 1.2, partName: "Front Windshield" },
        // Wipers
        { type: "line", x1: 134, y1: 102, x2: 156, y2: 110, stroke: "#0f172a", strokeWidth: 1.8 },
        { type: "line", x1: 134, y1: 138, x2: 156, y2: 130, stroke: "#0f172a", strokeWidth: 1.8 },

        // Side Mirrors (extending laterally at A-Pillars)
        { type: "rect", x: 136, y: 56, width: 14, height: 18, rx: 3, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 1.4, partName: "Left Mirror" },
        { type: "rect", x: 136, y: 166, width: 14, height: 18, rx: 3, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 1.4, partName: "Right Mirror" },

        // Roof Panel
        { type: "rect", x: 166, y: 80, width: 84, height: 80, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 1.5, partName: "Roof Panel" },
        // Sunroof Glass Inset
        { type: "rect", x: 180, y: 92, width: 44, height: 56, rx: 4, fill: "#1e293b", stroke: "#475569", strokeWidth: 1.2, partName: "Sunroof" },

        // Left / Right Door Margins
        { type: "line", x1: 128, y1: 76, x2: 286, y2: 76, stroke: "#0f172a", strokeWidth: 1.5, partName: "Left Doors / Sill" },
        { type: "line", x1: 128, y1: 164, x2: 286, y2: 164, stroke: "#0f172a", strokeWidth: 1.5, partName: "Right Doors / Sill" },

        // Rear Windscreen Glass
        { type: "polygon", points: "250,80 286,76 286,164 250,160", fill: "#e0f2fe", stroke: "#0284c7", strokeWidth: 1.2, partName: "Rear Windshield" },

        // Boot / Trunk Lid
        { type: "polygon", points: "286,76 336,76 336,164 286,164", fill: "#ffffff", stroke: "#0f172a", strokeWidth: 1.5, partName: "Boot / Trunk Lid" },
        { type: "line", x1: 286, y1: 90, x2: 336, y2: 90, stroke: "#64748b", strokeWidth: 1.2, partName: "Left Quarter Panel" },
        { type: "line", x1: 286, y1: 150, x2: 336, y2: 150, stroke: "#64748b", strokeWidth: 1.2, partName: "Right Quarter Panel" },

        // Angular Corner Taillights
        { type: "polygon", points: "326,78 348,82 344,98 326,96", fill: "#ef4444", stroke: "#b91c1c", strokeWidth: 1.2, partName: "Left Tail Light" },
        { type: "polygon", points: "326,162 348,158 344,142 326,144", fill: "#ef4444", stroke: "#b91c1c", strokeWidth: 1.2, partName: "Right Tail Light" },

        // Rear Bumper Section
        {
          type: "path",
          d: "M 336,76 C 348,76 358,94 358,120 C 358,146 348,164 336,164 Z",
          fill: "#f8fafc",
          stroke: "#0f172a",
          strokeWidth: 1.5,
          partName: "Rear Bumper"
        }
      ],
      hotspots: [
        { partName: "Front Bumper", defaultX: 14, defaultY: 50 },
        { partName: "Bonnet / Hood", defaultX: 27, defaultY: 50 },
        { partName: "Front Windshield", defaultX: 38, defaultY: 50 },
        { partName: "Roof Panel", defaultX: 53, defaultY: 50 },
        { partName: "Rear Windshield", defaultX: 68, defaultY: 50 },
        { partName: "Boot / Trunk Lid", defaultX: 79, defaultY: 50 },
        { partName: "Rear Bumper", defaultX: 90, defaultY: 50 },
        { partName: "Left Doors / Sill", defaultX: 52, defaultY: 26 },
        { partName: "Right Doors / Sill", defaultX: 52, defaultY: 74 }
      ]
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. MOTORCYCLE SPECIFICATION (Clean, Simple, Real-Looking Street Bike)
// ─────────────────────────────────────────────────────────────────────────────
export const MOTORCYCLE_SPEC: CategoryDiagramSpec = {
  category: "Motorcycle",
  displayName: "Motorcycle / Scooter / Two-Wheeler",
  icon: "motorbike",
  views: {
    front: {
      view: "front",
      label: "Front View",
      viewBox: "0 0 400 240",
      paths: [
        // Symmetrical Rearview Mirrors
        { type: "line", x1: 145, y1: 55, x2: 125, y2: 26, stroke: "#1e293b", strokeWidth: 2.5 },
        { type: "circle", cx: 122, cy: 24, r: 12, fill: "#334155", stroke: "#0f172a", strokeWidth: 1.5, partName: "Left Mirror" },
        { type: "line", x1: 255, y1: 55, x2: 275, y2: 26, stroke: "#1e293b", strokeWidth: 2.5 },
        { type: "circle", cx: 278, cy: 24, r: 12, fill: "#334155", stroke: "#0f172a", strokeWidth: 1.5, partName: "Right Mirror" },
        // Handlebars Crossbar with Grips
        { type: "line", x1: 110, y1: 55, x2: 290, y2: 55, stroke: "#1e293b", strokeWidth: 4, partName: "Handlebars" },
        { type: "rect", x: 105, y: 50, width: 20, height: 10, rx: 2, fill: "#0f172a" },
        { type: "rect", x: 275, y: 50, width: 20, height: 10, rx: 2, fill: "#0f172a" },
        // Headlight Cowl / Fairing
        { type: "polygon", points: "172,50 228,50 220,110 180,110", fill: "#0284c7", stroke: "#0369a1", strokeWidth: 2, partName: "Headlamp Cowl" },
        // Central Bright Headlight
        { type: "polygon", points: "180,62 220,62 214,102 186,102", fill: "#fef9c3", stroke: "#ca8a04", strokeWidth: 1.5, partName: "Front Headlight" },
        { type: "circle", cx: 200, cy: 82, r: 6, fill: "#ffffff", stroke: "#ca8a04", strokeWidth: 1 },
        // Turn Indicators
        { type: "rect", x: 140, y: 78, width: 18, height: 10, rx: 2, fill: "#f59e0b", stroke: "#b45309", strokeWidth: 1.2, partName: "Left Turn Indicator" },
        { type: "rect", x: 242, y: 78, width: 18, height: 10, rx: 2, fill: "#f59e0b", stroke: "#b45309", strokeWidth: 1.2, partName: "Right Turn Indicator" },
        // Front Suspension Forks
        { type: "rect", x: 175, y: 112, width: 10, height: 60, rx: 2, fill: "#94a3b8", stroke: "#475569", strokeWidth: 1.5, partName: "Front Suspension Forks" },
        { type: "rect", x: 215, y: 112, width: 10, height: 60, rx: 2, fill: "#94a3b8", stroke: "#475569", strokeWidth: 1.5, partName: "Front Suspension Forks" },
        // Front Mudguard
        { type: "polygon", points: "168,128 232,128 226,146 174,146", fill: "#0284c7", stroke: "#0369a1", strokeWidth: 1.5, partName: "Front Mudguard" },
        // Front Tyre
        { type: "rect", x: 186, y: 146, width: 28, height: 68, rx: 8, fill: "#0f172a", stroke: "#000", strokeWidth: 2, partName: "Front Wheel & Tyre" },
        { type: "line", x1: 200, y1: 150, x2: 200, y2: 210, stroke: "#334155", strokeWidth: 2 },
        // Disc Brake
        { type: "rect", x: 180, y: 165, width: 5, height: 30, fill: "#cbd5e1", stroke: "#64748b", strokeWidth: 1, partName: "Front Disc Brake" }
      ],
      hotspots: [
        { partName: "Handlebars", defaultX: 50, defaultY: 24 },
        { partName: "Left Mirror", defaultX: 30, defaultY: 10 },
        { partName: "Right Mirror", defaultX: 70, defaultY: 10 },
        { partName: "Front Headlight", defaultX: 50, defaultY: 36 },
        { partName: "Turn Indicators", defaultX: 35, defaultY: 36 },
        { partName: "Front Mudguard", defaultX: 50, defaultY: 57 },
        { partName: "Front Suspension Forks", defaultX: 44, defaultY: 62 },
        { partName: "Front Wheel & Tyre", defaultX: 50, defaultY: 78 }
      ]
    },
    rear: {
      view: "rear",
      label: "Rear View",
      viewBox: "0 0 400 240",
      paths: [
        // Mirrors above
        { type: "circle", cx: 122, cy: 24, r: 12, fill: "#334155", stroke: "#0f172a", strokeWidth: 1.5, partName: "Left Mirror" },
        { type: "circle", cx: 278, cy: 24, r: 12, fill: "#334155", stroke: "#0f172a", strokeWidth: 1.5, partName: "Right Mirror" },
        // Seat Profile
        { type: "polygon", points: "175,70 225,70 220,88 180,88", fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Seat" },
        // Tail Light
        { type: "polygon", points: "184,88 216,88 210,104 190,104", fill: "#ef4444", stroke: "#b91c1c", strokeWidth: 1.5, partName: "Tail Light" },
        // Turn Indicators
        { type: "rect", x: 148, y: 92, width: 18, height: 10, rx: 2, fill: "#f59e0b", stroke: "#b45309", strokeWidth: 1.2, partName: "Left Turn Indicator" },
        { type: "rect", x: 234, y: 92, width: 18, height: 10, rx: 2, fill: "#f59e0b", stroke: "#b45309", strokeWidth: 1.2, partName: "Right Turn Indicator" },
        // Rear Mudguard
        { type: "polygon", points: "176,104 224,104 218,152 182,152", fill: "#0f172a", stroke: "#1e293b", strokeWidth: 1.5, partName: "Rear Mudguard" },
        // License Plate
        { type: "rect", x: 178, y: 120, width: 44, height: 22, rx: 2, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 1.2, partName: "Rear License Plate" },
        // Rear Tyre
        { type: "rect", x: 184, y: 146, width: 32, height: 72, rx: 8, fill: "#0f172a", stroke: "#000", strokeWidth: 2, partName: "Rear Wheel & Tyre" },
        // Exhaust Silencer visible on right
        { type: "rect", x: 236, y: 136, width: 20, height: 38, rx: 6, fill: "#1e293b", stroke: "#475569", strokeWidth: 1.5, partName: "Exhaust Silencer" }
      ],
      hotspots: [
        { partName: "Tail Light", defaultX: 50, defaultY: 40 },
        { partName: "Turn Indicators", defaultX: 38, defaultY: 40 },
        { partName: "Rear License Plate", defaultX: 50, defaultY: 55 },
        { partName: "Rear Mudguard", defaultX: 50, defaultY: 50 },
        { partName: "Exhaust Silencer", defaultX: 62, defaultY: 65 },
        { partName: "Rear Wheel & Tyre", defaultX: 50, defaultY: 78 },
        { partName: "Seat", defaultX: 50, defaultY: 32 }
      ]
    },
    left: {
      view: "left",
      label: "Left Side View",
      viewBox: "0 0 400 240",
      paths: [
        // Front Wheel
        { type: "circle", cx: 85, cy: 165, r: 26, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Front Wheel & Tyre" },
        { type: "circle", cx: 85, cy: 165, r: 18, fill: "#475569", stroke: "#94a3b8", strokeWidth: 1.5 },
        { type: "circle", cx: 85, cy: 165, r: 12, fill: "none", stroke: "#cbd5e1", strokeWidth: 2, strokeDasharray: "3,2", partName: "Front Disc Brake" },
        { type: "circle", cx: 85, cy: 165, r: 4, fill: "#ffffff" },
        // Telescopic Fork
        { type: "line", x1: 85, y1: 165, x2: 135, y2: 75, stroke: "#94a3b8", strokeWidth: 6, partName: "Front Suspension Forks" },
        // Front Mudguard
        { type: "path", d: "M 62,154 C 68,136 94,134 110,146", stroke: "#0284c7", strokeWidth: 3.5, fill: "none", partName: "Front Mudguard" },
        // Handlebars & Mirror
        { type: "line", x1: 135, y1: 75, x2: 142, y2: 55, stroke: "#1e293b", strokeWidth: 4, partName: "Handlebars" },
        { type: "line", x1: 142, y1: 55, x2: 138, y2: 32, stroke: "#1e293b", strokeWidth: 2 },
        { type: "circle", cx: 138, cy: 30, r: 9, fill: "#334155", stroke: "#0f172a", strokeWidth: 1.5, partName: "Left Mirror" },
        // Headlight Cowl
        { type: "polygon", points: "122,82 138,62 136,88", fill: "#0284c7", stroke: "#0369a1", strokeWidth: 1.5, partName: "Headlamp Cowl" },
        { type: "polygon", points: "118,80 126,70 124,84", fill: "#fef9c3", stroke: "#ca8a04", strokeWidth: 1, partName: "Front Headlight" },
        // Sculpted Fuel Tank
        {
          type: "polygon",
          points: "138,65 195,55 210,75 205,105 155,105",
          fill: "#0284c7",
          stroke: "#0369a1",
          strokeWidth: 2,
          partName: "Fuel Tank"
        },
        // Seat
        { type: "polygon", points: "205,75 285,70 280,88 200,90", fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.8, partName: "Seat" },
        // Rear Cowl & Tail Light
        { type: "polygon", points: "280,72 322,70 315,85 275,88", fill: "#0284c7", stroke: "#0369a1", strokeWidth: 1.5, partName: "Rear Cowl" },
        { type: "polygon", points: "320,70 326,72 322,78", fill: "#ef4444", partName: "Tail Light" },
        // Rear Mudguard
        { type: "line", x1: 310, y1: 85, x2: 322, y2: 115, stroke: "#0f172a", strokeWidth: 3, partName: "Rear Mudguard" },
        // Engine Block & Crankcase
        { type: "rect", x: 160, y: 110, width: 38, height: 38, rx: 3, fill: "#475569", stroke: "#1e293b", strokeWidth: 1.5, partName: "Engine Block" },
        { type: "circle", cx: 180, cy: 152, r: 12, fill: "#334155", stroke: "#1e293b", strokeWidth: 1.5, partName: "Crankcase / Engine" },
        // Exhaust Pipe & Silencer
        { type: "path", d: "M 168,125 C 160,145 160,165 180,165 L 235,165", stroke: "#94a3b8", strokeWidth: 4, fill: "none", partName: "Exhaust Header Pipe" },
        { type: "polygon", points: "235,165 325,135 320,145 235,172", fill: "#1e293b", stroke: "#475569", strokeWidth: 1.5, partName: "Exhaust Silencer" },
        { type: "polygon", points: "250,158 305,140 302,145 248,162", fill: "#cbd5e1" },
        // Swingarm & Shock
        { type: "line", x1: 210, y1: 150, x2: 305, y2: 165, stroke: "#475569", strokeWidth: 5, partName: "Rear Swingarm" },
        { type: "line", x1: 280, y1: 95, x2: 298, y2: 155, stroke: "#ef4444", strokeWidth: 4, partName: "Rear Shock Absorber" },
        // Rear Wheel
        { type: "circle", cx: 305, cy: 165, r: 26, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Rear Wheel & Tyre" },
        { type: "circle", cx: 305, cy: 165, r: 18, fill: "#475569", stroke: "#94a3b8", strokeWidth: 1.5 },
        { type: "circle", cx: 305, cy: 165, r: 4, fill: "#ffffff" }
      ],
      hotspots: [
        { partName: "Front Wheel & Tyre", defaultX: 21, defaultY: 70 },
        { partName: "Front Disc Brake", defaultX: 21, defaultY: 65 },
        { partName: "Front Mudguard", defaultX: 23, defaultY: 57 },
        { partName: "Front Suspension Forks", defaultX: 27, defaultY: 50 },
        { partName: "Handlebars", defaultX: 35, defaultY: 22 },
        { partName: "Fuel Tank", defaultX: 45, defaultY: 34 },
        { partName: "Seat", defaultX: 62, defaultY: 33 },
        { partName: "Engine Block", defaultX: 45, defaultY: 53 },
        { partName: "Crankcase / Engine", defaultX: 45, defaultY: 64 },
        { partName: "Exhaust Silencer", defaultX: 70, defaultY: 65 },
        { partName: "Rear Swingarm", defaultX: 65, defaultY: 65 },
        { partName: "Rear Shock Absorber", defaultX: 72, defaultY: 52 },
        { partName: "Rear Wheel & Tyre", defaultX: 76, defaultY: 70 }
      ]
    },
    right: {
      view: "right",
      label: "Right Side View",
      viewBox: "0 0 400 240",
      paths: [
        // Front Wheel (Mirrored)
        { type: "circle", cx: 315, cy: 165, r: 26, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Front Wheel & Tyre" },
        { type: "circle", cx: 315, cy: 165, r: 18, fill: "#475569", stroke: "#94a3b8", strokeWidth: 1.5 },
        { type: "circle", cx: 315, cy: 165, r: 4, fill: "#ffffff" },
        // Fork
        { type: "line", x1: 315, y1: 165, x2: 265, y2: 75, stroke: "#94a3b8", strokeWidth: 6, partName: "Front Suspension Forks" },
        // Mudguard
        { type: "path", d: "M 338,154 C 332,136 306,134 290,146", stroke: "#0284c7", strokeWidth: 3.5, fill: "none", partName: "Front Mudguard" },
        // Handlebars
        { type: "line", x1: 265, y1: 75, x2: 258, y2: 55, stroke: "#1e293b", strokeWidth: 4, partName: "Handlebars" },
        { type: "circle", cx: 262, cy: 30, r: 9, fill: "#334155", stroke: "#0f172a", strokeWidth: 1.5, partName: "Right Mirror" },
        // Fuel Tank
        { type: "polygon", points: "262,65 205,55 190,75 195,105 245,105", fill: "#0284c7", stroke: "#0369a1", strokeWidth: 2, partName: "Fuel Tank" },
        // Seat
        { type: "polygon", points: "195,75 115,70 120,88 200,90", fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.8, partName: "Seat" },
        // Engine Block
        { type: "rect", x: 202, y: 110, width: 38, height: 38, rx: 3, fill: "#475569", stroke: "#1e293b", strokeWidth: 1.5, partName: "Engine Block" },
        // Prominent Exhaust Silencer on Right
        { type: "polygon", points: "165,165 75,135 80,145 165,172", fill: "#1e293b", stroke: "#475569", strokeWidth: 1.5, partName: "Exhaust Silencer" },
        { type: "polygon", points: "150,158 95,140 98,145 152,162", fill: "#cbd5e1" },
        // Rear Wheel
        { type: "circle", cx: 95, cy: 165, r: 26, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Rear Wheel & Tyre" },
        { type: "circle", cx: 95, cy: 165, r: 18, fill: "#475569", stroke: "#94a3b8", strokeWidth: 1.5 },
        { type: "circle", cx: 95, cy: 165, r: 4, fill: "#ffffff" }
      ],
      hotspots: [
        { partName: "Front Wheel & Tyre", defaultX: 79, defaultY: 70 },
        { partName: "Front Mudguard", defaultX: 77, defaultY: 57 },
        { partName: "Front Suspension Forks", defaultX: 73, defaultY: 50 },
        { partName: "Fuel Tank", defaultX: 55, defaultY: 34 },
        { partName: "Seat", defaultX: 38, defaultY: 33 },
        { partName: "Engine Block", defaultX: 55, defaultY: 53 },
        { partName: "Exhaust Silencer", defaultX: 30, defaultY: 65 },
        { partName: "Rear Wheel & Tyre", defaultX: 24, defaultY: 70 }
      ]
    },
    top: {
      view: "top",
      label: "Top View",
      viewBox: "0 0 400 240",
      paths: [
        // Front Tyre
        { type: "rect", x: 192, y: 22, width: 16, height: 46, rx: 4, fill: "#0f172a", stroke: "#000", strokeWidth: 1.5, partName: "Front Wheel & Tyre" },
        // Mudguard
        { type: "rect", x: 188, y: 40, width: 24, height: 32, rx: 3, fill: "#0284c7", stroke: "#0369a1", strokeWidth: 1.5, partName: "Front Mudguard" },
        // Handlebars
        { type: "line", x1: 110, y1: 72, x2: 290, y2: 72, stroke: "#1e293b", strokeWidth: 4, partName: "Handlebars" },
        { type: "circle", cx: 110, cy: 72, r: 5, fill: "#0f172a" },
        { type: "circle", cx: 290, cy: 72, r: 5, fill: "#0f172a" },
        // Fuel Tank with Cap
        { type: "polygon", points: "174,80 226,80 220,145 180,145", fill: "#0284c7", stroke: "#0369a1", strokeWidth: 1.8, partName: "Fuel Tank" },
        { type: "circle", cx: 200, cy: 105, r: 5, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 1 },
        // Seat
        { type: "polygon", points: "180,145 220,145 212,215 188,215", fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.8, partName: "Seat" },
        // Tail Cowl
        { type: "polygon", points: "188,215 212,215 204,228 196,228", fill: "#ef4444", stroke: "#b91c1c", strokeWidth: 1.2, partName: "Tail Light" },
        // Exhaust Silencer on Right
        { type: "rect", x: 232, y: 142, width: 14, height: 68, rx: 4, fill: "#334155", stroke: "#0f172a", strokeWidth: 1.2, partName: "Exhaust Silencer" }
      ],
      hotspots: [
        { partName: "Front Wheel & Tyre", defaultX: 50, defaultY: 15 },
        { partName: "Handlebars", defaultX: 50, defaultY: 30 },
        { partName: "Fuel Tank", defaultX: 50, defaultY: 46 },
        { partName: "Seat", defaultX: 50, defaultY: 72 },
        { partName: "Tail Light", defaultX: 50, defaultY: 94 },
        { partName: "Exhaust Silencer", defaultX: 62, defaultY: 74 }
      ]
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. THREE-WHEELER SPECIFICATION (Sri Lankan Bajaj RE Tuk-Tuk)
// ─────────────────────────────────────────────────────────────────────────────
export const THREE_WHEELER_SPEC: CategoryDiagramSpec = {
  category: "Three-Wheeler",
  displayName: "Three-Wheeler / Tuk-Tuk / Auto Rickshaw",
  icon: "rickshaw",
  views: {
    front: {
      view: "front",
      label: "Front View",
      viewBox: "0 0 400 240",
      paths: [
        // Front Center Tyre
        { type: "rect", x: 188, y: 168, width: 24, height: 42, rx: 4, fill: "#0f172a", stroke: "#000", strokeWidth: 1.5, partName: "Front Wheel & Tyre" },
        // Rear Tyres Visible on Sides
        { type: "rect", x: 78, y: 168, width: 22, height: 42, rx: 4, fill: "#0f172a", stroke: "#000", strokeWidth: 1.5, partName: "Left Rear Wheel" },
        { type: "rect", x: 300, y: 168, width: 22, height: 42, rx: 4, fill: "#0f172a", stroke: "#000", strokeWidth: 1.5, partName: "Right Rear Wheel" },
        // Canopy Roof
        { type: "polygon", points: "125,50 275,50 282,90 118,90", fill: "#0f172a", stroke: "#1e293b", strokeWidth: 2, partName: "Canopy Roof" },
        // Windshield Glass
        { type: "rect", x: 125, y: 55, width: 150, height: 45, rx: 3, fill: "#e0f2fe", stroke: "#0284c7", strokeWidth: 1.5, partName: "Cabin Windshield" },
        { type: "line", x1: 200, y1: 98, x2: 225, y2: 68, stroke: "#0f172a", strokeWidth: 2 },
        // Front Apron Cowl (Classic Tuk-Tuk Green)
        { type: "polygon", points: "120,95 280,95 284,178 116,178", fill: "#15803d", stroke: "#14532d", strokeWidth: 2, partName: "Front Apron / Cowl" },
        // Headlight
        { type: "circle", cx: 200, cy: 135, r: 14, fill: "#fef08a", stroke: "#ca8a04", strokeWidth: 1.8, partName: "Front Headlight" },
        { type: "circle", cx: 200, cy: 135, r: 5, fill: "#ffffff" },
        // Indicators
        { type: "rect", x: 138, y: 130, width: 16, height: 10, rx: 2, fill: "#f59e0b", stroke: "#b45309", strokeWidth: 1, partName: "Left Turn Indicator" },
        { type: "rect", x: 246, y: 130, width: 16, height: 10, rx: 2, fill: "#f59e0b", stroke: "#b45309", strokeWidth: 1, partName: "Right Turn Indicator" },
        // Heavy Front Bumper Bar
        { type: "line", x1: 110, y1: 180, x2: 290, y2: 180, stroke: "#0f172a", strokeWidth: 4.5, partName: "Front Bumper Bar" }
      ],
      hotspots: [
        { partName: "Front Bumper Bar", defaultX: 50, defaultY: 78 },
        { partName: "Front Headlight", defaultX: 50, defaultY: 57 },
        { partName: "Front Apron / Cowl", defaultX: 50, defaultY: 65 },
        { partName: "Cabin Windshield", defaultX: 50, defaultY: 34 },
        { partName: "Canopy Roof", defaultX: 50, defaultY: 20 },
        { partName: "Front Wheel & Tyre", defaultX: 50, defaultY: 80 }
      ]
    },
    rear: {
      view: "rear",
      label: "Rear View",
      viewBox: "0 0 400 240",
      paths: [
        { type: "rect", x: 78, y: 168, width: 22, height: 42, rx: 4, fill: "#0f172a", stroke: "#000", strokeWidth: 1.5, partName: "Left Rear Wheel" },
        { type: "rect", x: 300, y: 168, width: 22, height: 42, rx: 4, fill: "#0f172a", stroke: "#000", strokeWidth: 1.5, partName: "Right Rear Wheel" },
        { type: "polygon", points: "120,48 280,48 285,92 115,92", fill: "#0f172a", stroke: "#1e293b", strokeWidth: 2, partName: "Canopy Roof" },
        { type: "rect", x: 140, y: 55, width: 120, height: 35, rx: 3, fill: "#cbd5e1", stroke: "#475569", strokeWidth: 1.2, partName: "Rear Window" },
        { type: "polygon", points: "115,92 285,92 288,178 112,178", fill: "#15803d", stroke: "#14532d", strokeWidth: 2, partName: "Rear Body Tub" },
        // Engine Hatch
        { type: "rect", x: 140, y: 110, width: 120, height: 55, rx: 3, fill: "#166534", stroke: "#14532d", strokeWidth: 1.5, partName: "Engine Hatch" },
        { type: "rect", x: 165, y: 138, width: 70, height: 20, rx: 2, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 1.2, partName: "Rear License Plate" },
        { type: "rect", x: 118, y: 116, width: 16, height: 14, rx: 2, fill: "#ef4444", stroke: "#b91c1c", strokeWidth: 1, partName: "Left Tail Light" },
        { type: "rect", x: 266, y: 116, width: 16, height: 14, rx: 2, fill: "#ef4444", stroke: "#b91c1c", strokeWidth: 1, partName: "Right Tail Light" },
        { type: "line", x1: 98, y1: 180, x2: 302, y2: 180, stroke: "#0f172a", strokeWidth: 4.5, partName: "Rear Bumper Bar" }
      ],
      hotspots: [
        { partName: "Rear Bumper Bar", defaultX: 50, defaultY: 78 },
        { partName: "Rear License Plate", defaultX: 50, defaultY: 62 },
        { partName: "Engine Hatch", defaultX: 50, defaultY: 55 },
        { partName: "Rear Window", defaultX: 50, defaultY: 30 },
        { partName: "Left Tail Light", defaultX: 30, defaultY: 52 },
        { partName: "Right Tail Light", defaultX: 70, defaultY: 52 }
      ]
    },
    left: {
      view: "left",
      label: "Left Side View",
      viewBox: "0 0 400 240",
      paths: [
        { type: "circle", cx: 85, cy: 175, r: 24, fill: "#0f172a", stroke: "#334155", strokeWidth: 2, partName: "Front Wheel & Tyre" },
        { type: "circle", cx: 85, cy: 175, r: 15, fill: "#475569" },
        { type: "circle", cx: 275, cy: 175, r: 24, fill: "#0f172a", stroke: "#334155", strokeWidth: 2, partName: "Left Rear Wheel" },
        { type: "circle", cx: 275, cy: 175, r: 15, fill: "#475569" },
        // Front Nose
        { type: "polygon", points: "65,165 72,130 115,92 135,92 125,175 92,175", fill: "#15803d", stroke: "#14532d", strokeWidth: 2, partName: "Front Apron / Cowl" },
        // Canopy
        { type: "polygon", points: "115,92 125,50 280,50 320,70 320,135 295,175 225,175 225,92", fill: "#0f172a", stroke: "#334155", strokeWidth: 2, partName: "Canopy Roof" },
        // Open Doorway
        { type: "polygon", points: "135,92 135,172 225,172 225,92", fill: "#f8fafc", stroke: "#1e293b", strokeWidth: 1.8, partName: "Passenger Door Opening" },
        // Engine Side Panel
        { type: "rect", x: 235, y: 135, width: 65, height: 38, fill: "#15803d", stroke: "#14532d", strokeWidth: 1.8, partName: "Engine Side Panel" }
      ],
      hotspots: [
        { partName: "Front Wheel & Tyre", defaultX: 22, defaultY: 74 },
        { partName: "Front Apron / Cowl", defaultX: 25, defaultY: 58 },
        { partName: "Passenger Door Opening", defaultX: 45, defaultY: 56 },
        { partName: "Canopy Roof", defaultX: 52, defaultY: 26 },
        { partName: "Left Rear Wheel", defaultX: 72, defaultY: 74 }
      ]
    },
    right: {
      view: "right",
      label: "Right Side View",
      viewBox: "0 0 400 240",
      paths: [
        { type: "circle", cx: 315, cy: 175, r: 24, fill: "#0f172a", stroke: "#334155", strokeWidth: 2, partName: "Front Wheel & Tyre" },
        { type: "circle", cx: 315, cy: 175, r: 15, fill: "#475569" },
        { type: "circle", cx: 125, cy: 175, r: 24, fill: "#0f172a", stroke: "#334155", strokeWidth: 2, partName: "Right Rear Wheel" },
        { type: "circle", cx: 125, cy: 175, r: 15, fill: "#475569" },
        { type: "polygon", points: "335,165 328,130 285,92 265,92 275,175 308,175", fill: "#15803d", stroke: "#14532d", strokeWidth: 2, partName: "Front Apron / Cowl" },
        { type: "polygon", points: "285,92 275,50 120,50 80,70 80,135 105,175 175,175 175,92", fill: "#0f172a", stroke: "#334155", strokeWidth: 2, partName: "Canopy Roof" },
        { type: "polygon", points: "265,92 265,172 175,172 175,92", fill: "#f8fafc", stroke: "#1e293b", strokeWidth: 1.8, partName: "Passenger Door Opening" },
        { type: "rect", x: 100, y: 135, width: 65, height: 38, fill: "#15803d", stroke: "#14532d", strokeWidth: 1.8, partName: "Engine Side Panel" }
      ],
      hotspots: [
        { partName: "Front Wheel & Tyre", defaultX: 78, defaultY: 74 },
        { partName: "Front Apron / Cowl", defaultX: 75, defaultY: 58 },
        { partName: "Passenger Door Opening", defaultX: 55, defaultY: 56 },
        { partName: "Right Rear Wheel", defaultX: 28, defaultY: 74 }
      ]
    },
    top: {
      view: "top",
      label: "Top View",
      viewBox: "0 0 400 240",
      paths: [
        { type: "rect", x: 190, y: 22, width: 20, height: 42, rx: 4, fill: "#0f172a", stroke: "#000", strokeWidth: 1.5, partName: "Front Wheel & Tyre" },
        { type: "polygon", points: "168,55 232,55 265,92 135,92", fill: "#15803d", stroke: "#14532d", strokeWidth: 1.8, partName: "Front Apron / Cowl" },
        { type: "polygon", points: "135,92 265,92 285,220 115,220", fill: "#0f172a", stroke: "#1e293b", strokeWidth: 2, partName: "Canopy Roof" },
        { type: "rect", x: 88, y: 172, width: 22, height: 44, rx: 4, fill: "#0f172a", stroke: "#000", strokeWidth: 1.5, partName: "Left Rear Wheel" },
        { type: "rect", x: 290, y: 172, width: 22, height: 44, rx: 4, fill: "#0f172a", stroke: "#000", strokeWidth: 1.5, partName: "Right Rear Wheel" },
        { type: "line", x1: 96, y1: 224, x2: 304, y2: 224, stroke: "#0f172a", strokeWidth: 4.5, partName: "Rear Bumper Bar" }
      ],
      hotspots: [
        { partName: "Front Wheel & Tyre", defaultX: 50, defaultY: 15 },
        { partName: "Front Apron / Cowl", defaultX: 50, defaultY: 30 },
        { partName: "Canopy Roof", defaultX: 50, defaultY: 62 },
        { partName: "Rear Bumper Bar", defaultX: 50, defaultY: 94 }
      ]
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. SUV / CROSSOVER SPECIFICATION (Clean, Elevated, Roof Rails)
// ─────────────────────────────────────────────────────────────────────────────
export const SUV_SPEC: CategoryDiagramSpec = {
  category: "SUV",
  displayName: "SUV / Crossover / 4x4 / Double Cab",
  icon: "car-estate",
  views: {
    ...CAR_SPEC.views,
    front: {
      ...CAR_SPEC.views.front,
      paths: [
        // Roof Rails
        { type: "rect", x: 140, y: 55, width: 120, height: 5, rx: 2, fill: "#334155", stroke: "#0f172a", strokeWidth: 1.2, partName: "Roof Rails" },
        ...CAR_SPEC.views.front.paths,
        // Skid Plate
        { type: "rect", x: 155, y: 178, width: 90, height: 10, rx: 2, fill: "#cbd5e1", stroke: "#64748b", strokeWidth: 1.2, partName: "Front Skid Plate" }
      ]
    },
    left: {
      ...CAR_SPEC.views.left,
      paths: [
        { type: "rect", x: 165, y: 68, width: 110, height: 5, rx: 2, fill: "#334155", stroke: "#0f172a", strokeWidth: 1.2, partName: "Roof Rails" },
        ...CAR_SPEC.views.left.paths
      ]
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. VAN SPECIFICATION (Passenger Van / Microbus)
// ─────────────────────────────────────────────────────────────────────────────
export const VAN_SPEC: CategoryDiagramSpec = {
  category: "Van",
  displayName: "Passenger / Panel Van",
  icon: "van-passenger",
  views: {
    ...CAR_SPEC.views,
    left: {
      ...CAR_SPEC.views.left,
      paths: [
        ...CAR_SPEC.views.left.paths,
        { type: "line", x1: 205, y1: 114, x2: 325, y2: 114, stroke: "#334155", strokeWidth: 1.5, strokeDasharray: "4,2", partName: "Sliding Door Track" }
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
      viewBox: "0 0 400 240",
      paths: [
        { type: "rect", x: 74, y: 35, width: 252, height: 155, rx: 8, fill: "#ffffff", stroke: "#1e293b", strokeWidth: 2, partName: "Driver Cabin" },
        { type: "rect", x: 88, y: 45, width: 224, height: 60, rx: 4, fill: "#bae6fd", stroke: "#0284c7", strokeWidth: 1.8, partName: "Cabin Windshield" },
        { type: "rect", x: 120, y: 115, width: 160, height: 42, rx: 3, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.5, partName: "Cabin Grille" },
        { type: "line", x1: 128, y1: 128, x2: 272, y2: 128, stroke: "#64748b", strokeWidth: 1.5 },
        { type: "line", x1: 128, y1: 142, x2: 272, y2: 142, stroke: "#64748b", strokeWidth: 1.5 },
        { type: "rect", x: 88, y: 126, width: 24, height: 26, rx: 3, fill: "#fef08a", stroke: "#ca8a04", strokeWidth: 1.2, partName: "Left Headlight" },
        { type: "rect", x: 288, y: 126, width: 24, height: 26, rx: 3, fill: "#fef08a", stroke: "#ca8a04", strokeWidth: 1.2, partName: "Right Headlight" },
        { type: "rect", x: 58, y: 168, width: 284, height: 30, rx: 4, fill: "#475569", stroke: "#0f172a", strokeWidth: 2, partName: "Steel Front Bumper" },
        { type: "rect", x: 50, y: 174, width: 26, height: 46, rx: 4, fill: "#0f172a", stroke: "#000", strokeWidth: 1.5, partName: "Left Front Wheel" },
        { type: "rect", x: 324, y: 174, width: 26, height: 46, rx: 4, fill: "#0f172a", stroke: "#000", strokeWidth: 1.5, partName: "Right Front Wheel" }
      ],
      hotspots: [
        { partName: "Cabin Windshield", defaultX: 50, defaultY: 30 },
        { partName: "Cabin Grille", defaultX: 50, defaultY: 58 },
        { partName: "Steel Front Bumper", defaultX: 50, defaultY: 78 },
        { partName: "Left Headlight", defaultX: 25, defaultY: 58 },
        { partName: "Right Headlight", defaultX: 75, defaultY: 58 }
      ]
    },
    rear: {
      view: "rear",
      label: "Rear View",
      viewBox: "0 0 400 240",
      paths: [
        { type: "rect", x: 68, y: 30, width: 264, height: 155, rx: 4, fill: "#ffffff", stroke: "#1e293b", strokeWidth: 2, partName: "Cargo Container" },
        { type: "rect", x: 68, y: 142, width: 264, height: 42, fill: "#cbd5e1", stroke: "#1e293b", strokeWidth: 1.5, partName: "Rear Tailgate" },
        { type: "rect", x: 58, y: 184, width: 284, height: 16, rx: 3, fill: "#f59e0b", stroke: "#b45309", strokeWidth: 1.5, partName: "Rear Underrun Bar" },
        { type: "rect", x: 48, y: 178, width: 34, height: 44, rx: 4, fill: "#0f172a", stroke: "#000", strokeWidth: 1.5, partName: "Dual Left Wheels" },
        { type: "rect", x: 318, y: 178, width: 34, height: 44, rx: 4, fill: "#0f172a", stroke: "#000", strokeWidth: 1.5, partName: "Dual Right Wheels" }
      ],
      hotspots: [
        { partName: "Cargo Container", defaultX: 50, defaultY: 36 },
        { partName: "Rear Tailgate", defaultX: 50, defaultY: 68 },
        { partName: "Rear Underrun Bar", defaultX: 50, defaultY: 82 }
      ]
    },
    left: {
      view: "left",
      label: "Left Side View",
      viewBox: "0 0 400 240",
      paths: [
        { type: "polygon", points: "25,165 25,95 45,55 115,55 115,165", fill: "#ffffff", stroke: "#1e293b", strokeWidth: 2, partName: "Driver Cabin" },
        { type: "rect", x: 125, y: 40, width: 250, height: 125, rx: 4, fill: "#f8fafc", stroke: "#1e293b", strokeWidth: 2, partName: "Cargo Container" },
        { type: "circle", cx: 70, cy: 165, r: 26, fill: "#0f172a", stroke: "#64748b", strokeWidth: 2.5, partName: "Left Front Wheel" },
        { type: "circle", cx: 280, cy: 165, r: 26, fill: "#0f172a", stroke: "#64748b", strokeWidth: 2.5, partName: "Drive Axle Wheel" },
        { type: "circle", cx: 338, cy: 165, r: 26, fill: "#0f172a", stroke: "#64748b", strokeWidth: 2.5, partName: "Tag Axle Wheel" }
      ],
      hotspots: [
        { partName: "Driver Cabin", defaultX: 18, defaultY: 45 },
        { partName: "Cargo Container", defaultX: 65, defaultY: 45 },
        { partName: "Left Front Wheel", defaultX: 18, defaultY: 70 },
        { partName: "Drive Axle Wheel", defaultX: 75, defaultY: 70 }
      ]
    },
    right: {
      view: "right",
      label: "Right Side View",
      viewBox: "0 0 400 240",
      paths: [
        { type: "polygon", points: "375,165 375,95 355,55 285,55 285,165", fill: "#ffffff", stroke: "#1e293b", strokeWidth: 2, partName: "Driver Cabin" },
        { type: "rect", x: 25, y: 40, width: 250, height: 125, rx: 4, fill: "#f8fafc", stroke: "#1e293b", strokeWidth: 2, partName: "Cargo Container" },
        { type: "circle", cx: 330, cy: 165, r: 26, fill: "#0f172a", stroke: "#64748b", strokeWidth: 2.5, partName: "Right Front Wheel" },
        { type: "circle", cx: 120, cy: 165, r: 26, fill: "#0f172a", stroke: "#64748b", strokeWidth: 2.5, partName: "Drive Axle Wheel" }
      ],
      hotspots: [
        { partName: "Driver Cabin", defaultX: 82, defaultY: 45 },
        { partName: "Cargo Container", defaultX: 35, defaultY: 45 },
        { partName: "Right Front Wheel", defaultX: 82, defaultY: 70 }
      ]
    },
    top: {
      view: "top",
      label: "Top View",
      viewBox: "0 0 400 240",
      paths: [
        { type: "rect", x: 40, y: 64, width: 76, height: 112, rx: 4, fill: "#ffffff", stroke: "#1e293b", strokeWidth: 2, partName: "Driver Cabin Roof" },
        { type: "rect", x: 120, y: 54, width: 242, height: 132, rx: 4, fill: "#f8fafc", stroke: "#1e293b", strokeWidth: 2, partName: "Cargo Bed Roof" }
      ],
      hotspots: [
        { partName: "Driver Cabin Roof", defaultX: 20, defaultY: 50 },
        { partName: "Cargo Bed Roof", defaultX: 60, defaultY: 50 }
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
      viewBox: "0 0 400 240",
      paths: [
        { type: "rect", x: 70, y: 25, width: 260, height: 165, rx: 8, fill: "#ffffff", stroke: "#1e293b", strokeWidth: 2, partName: "Bus Body" },
        { type: "rect", x: 82, y: 35, width: 236, height: 68, rx: 4, fill: "#bae6fd", stroke: "#0284c7", strokeWidth: 1.8, partName: "Front Windscreen" },
        { type: "rect", x: 84, y: 134, width: 34, height: 22, rx: 2, fill: "#fef08a", stroke: "#ca8a04", strokeWidth: 1.2, partName: "Left Headlight" },
        { type: "rect", x: 282, y: 134, width: 34, height: 22, rx: 2, fill: "#fef08a", stroke: "#ca8a04", strokeWidth: 1.2, partName: "Right Headlight" },
        { type: "rect", x: 62, y: 168, width: 276, height: 26, rx: 4, fill: "#cbd5e1", stroke: "#1e293b", strokeWidth: 2, partName: "Front Bumper" }
      ],
      hotspots: [
        { partName: "Front Windscreen", defaultX: 50, defaultY: 28 },
        { partName: "Front Bumper", defaultX: 50, defaultY: 78 }
      ]
    },
    rear: {
      view: "rear",
      label: "Rear View",
      viewBox: "0 0 400 240",
      paths: [
        { type: "rect", x: 70, y: 25, width: 260, height: 165, rx: 8, fill: "#ffffff", stroke: "#1e293b", strokeWidth: 2, partName: "Bus Body" },
        { type: "rect", x: 92, y: 35, width: 216, height: 44, rx: 3, fill: "#94a3b8", stroke: "#475569", strokeWidth: 1.2, partName: "Rear Window" },
        { type: "rect", x: 62, y: 168, width: 276, height: 26, rx: 4, fill: "#cbd5e1", stroke: "#1e293b", strokeWidth: 2, partName: "Rear Bumper" }
      ],
      hotspots: [
        { partName: "Rear Window", defaultX: 50, defaultY: 25 },
        { partName: "Rear Bumper", defaultX: 50, defaultY: 78 }
      ]
    },
    left: {
      view: "left",
      label: "Left Side View",
      viewBox: "0 0 400 240",
      paths: [
        { type: "rect", x: 25, y: 45, width: 350, height: 120, rx: 6, fill: "#ffffff", stroke: "#1e293b", strokeWidth: 2, partName: "Bus Body" },
        { type: "circle", cx: 80, cy: 165, r: 26, fill: "#0f172a", stroke: "#64748b", strokeWidth: 2.5, partName: "Front Wheel" },
        { type: "circle", cx: 295, cy: 165, r: 26, fill: "#0f172a", stroke: "#64748b", strokeWidth: 2.5, partName: "Rear Axle Wheel" }
      ],
      hotspots: [
        { partName: "Bus Body", defaultX: 50, defaultY: 50 },
        { partName: "Front Wheel", defaultX: 20, defaultY: 70 },
        { partName: "Rear Axle Wheel", defaultX: 78, defaultY: 70 }
      ]
    },
    right: {
      view: "right",
      label: "Right Side View",
      viewBox: "0 0 400 240",
      paths: [
        { type: "rect", x: 25, y: 45, width: 350, height: 120, rx: 6, fill: "#ffffff", stroke: "#1e293b", strokeWidth: 2, partName: "Bus Body" },
        { type: "circle", cx: 320, cy: 165, r: 26, fill: "#0f172a", stroke: "#64748b", strokeWidth: 2.5, partName: "Front Wheel" },
        { type: "circle", cx: 105, cy: 165, r: 26, fill: "#0f172a", stroke: "#64748b", strokeWidth: 2.5, partName: "Rear Axle Wheel" }
      ],
      hotspots: [
        { partName: "Bus Body", defaultX: 50, defaultY: 50 }
      ]
    },
    top: {
      view: "top",
      label: "Top View",
      viewBox: "0 0 400 240",
      paths: [
        { type: "rect", x: 30, y: 56, width: 340, height: 128, rx: 6, fill: "#ffffff", stroke: "#1e293b", strokeWidth: 2, partName: "Roof Panel" }
      ],
      hotspots: [
        { partName: "Roof Panel", defaultX: 50, defaultY: 50 }
      ]
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 8. TRACTOR SPECIFICATION (Agricultural Utility Tractor)
// ─────────────────────────────────────────────────────────────────────────────
export const TRACTOR_SPEC: CategoryDiagramSpec = {
  category: "Tractor",
  displayName: "Agricultural Tractor",
  icon: "tractor",
  views: {
    front: {
      view: "front",
      label: "Front View",
      viewBox: "0 0 400 240",
      paths: [
        { type: "rect", x: 142, y: 45, width: 116, height: 110, rx: 6, fill: "#16a34a", stroke: "#14532d", strokeWidth: 2, partName: "Engine Bonnet" },
        { type: "rect", x: 158, y: 62, width: 84, height: 60, rx: 3, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.5, partName: "Radiator Grille" },
        { type: "circle", cx: 174, cy: 78, r: 8, fill: "#fef08a", stroke: "#ca8a04", strokeWidth: 1, partName: "Left Headlight" },
        { type: "circle", cx: 226, cy: 78, r: 8, fill: "#fef08a", stroke: "#ca8a04", strokeWidth: 1, partName: "Right Headlight" },
        { type: "rect", x: 132, y: 15, width: 8, height: 50, rx: 2, fill: "#0f172a", partName: "Exhaust Chimney" },
        { type: "rect", x: 92, y: 136, width: 30, height: 65, rx: 5, fill: "#0f172a", stroke: "#000", strokeWidth: 1.8, partName: "Left Front Tyre" },
        { type: "rect", x: 278, y: 136, width: 30, height: 65, rx: 5, fill: "#0f172a", stroke: "#000", strokeWidth: 1.8, partName: "Right Front Tyre" },
        { type: "rect", x: 52, y: 84, width: 38, height: 118, rx: 6, fill: "#0f172a", stroke: "#000", strokeWidth: 2, partName: "Rear Drive Tyres" },
        { type: "rect", x: 310, y: 84, width: 38, height: 118, rx: 6, fill: "#0f172a", stroke: "#000", strokeWidth: 2, partName: "Rear Drive Tyres" }
      ],
      hotspots: [
        { partName: "Engine Bonnet", defaultX: 50, defaultY: 45 },
        { partName: "Radiator Grille", defaultX: 50, defaultY: 40 },
        { partName: "Left Front Tyre", defaultX: 26, defaultY: 72 },
        { partName: "Right Front Tyre", defaultX: 74, defaultY: 72 }
      ]
    },
    rear: {
      view: "rear",
      label: "Rear View",
      viewBox: "0 0 400 240",
      paths: [
        { type: "rect", x: 50, y: 72, width: 44, height: 135, rx: 6, fill: "#0f172a", stroke: "#000", strokeWidth: 2, partName: "Rear Drive Tyres" },
        { type: "rect", x: 306, y: 72, width: 44, height: 135, rx: 6, fill: "#0f172a", stroke: "#000", strokeWidth: 2, partName: "Rear Drive Tyres" },
        { type: "line", x1: 130, y1: 130, x2: 130, y2: 35, stroke: "#1e293b", strokeWidth: 4, partName: "ROPS Roll Cage" },
        { type: "line", x1: 270, y1: 130, x2: 270, y2: 35, stroke: "#1e293b", strokeWidth: 4, partName: "ROPS Roll Cage" },
        { type: "rect", x: 115, y: 25, width: 170, height: 15, rx: 3, fill: "#16a34a", stroke: "#14532d", strokeWidth: 1.5, partName: "Canopy Roof" },
        { type: "rect", x: 175, y: 88, width: 50, height: 42, rx: 3, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 1.5, partName: "Operator Seat" }
      ],
      hotspots: [
        { partName: "Canopy Roof", defaultX: 50, defaultY: 15 },
        { partName: "Operator Seat", defaultX: 50, defaultY: 46 }
      ]
    },
    left: {
      view: "left",
      label: "Left Side View",
      viewBox: "0 0 400 240",
      paths: [
        { type: "circle", cx: 270, cy: 155, r: 48, fill: "#0f172a", stroke: "#000", strokeWidth: 2.5, partName: "Rear Drive Wheel" },
        { type: "circle", cx: 270, cy: 155, r: 32, fill: "#eab308", stroke: "#ca8a04", strokeWidth: 2 },
        { type: "circle", cx: 85, cy: 175, r: 24, fill: "#0f172a", stroke: "#000", strokeWidth: 2, partName: "Front Wheel" },
        { type: "circle", cx: 85, cy: 175, r: 15, fill: "#eab308", stroke: "#ca8a04", strokeWidth: 1.5 },
        { type: "polygon", points: "75,150 75,108 195,108 195,150", fill: "#16a34a", stroke: "#14532d", strokeWidth: 2, partName: "Engine Bonnet" },
        { type: "rect", x: 125, y: 55, width: 8, height: 55, rx: 2, fill: "#0f172a", partName: "Exhaust Chimney" },
        { type: "line", x1: 215, y1: 150, x2: 225, y2: 45, stroke: "#1e293b", strokeWidth: 4, partName: "ROPS Roll Cage" },
        { type: "line", x1: 295, y1: 140, x2: 285, y2: 45, stroke: "#1e293b", strokeWidth: 4, partName: "ROPS Roll Cage" },
        { type: "rect", x: 210, y: 38, width: 90, height: 12, rx: 2, fill: "#16a34a", stroke: "#14532d", strokeWidth: 1.5, partName: "Canopy Roof" }
      ],
      hotspots: [
        { partName: "Engine Bonnet", defaultX: 35, defaultY: 55 },
        { partName: "Front Wheel", defaultX: 22, defaultY: 75 },
        { partName: "Rear Drive Wheel", defaultX: 68, defaultY: 65 }
      ]
    },
    right: {
      view: "right",
      label: "Right Side View",
      viewBox: "0 0 400 240",
      paths: [
        { type: "circle", cx: 130, cy: 155, r: 48, fill: "#0f172a", stroke: "#000", strokeWidth: 2.5, partName: "Rear Drive Wheel" },
        { type: "circle", cx: 130, cy: 155, r: 32, fill: "#eab308", stroke: "#ca8a04", strokeWidth: 2 },
        { type: "circle", cx: 315, cy: 175, r: 24, fill: "#0f172a", stroke: "#000", strokeWidth: 2, partName: "Front Wheel" },
        { type: "circle", cx: 315, cy: 175, r: 15, fill: "#eab308", stroke: "#ca8a04", strokeWidth: 1.5 },
        { type: "polygon", points: "325,150 325,108 205,108 205,150", fill: "#16a34a", stroke: "#14532d", strokeWidth: 2, partName: "Engine Bonnet" }
      ],
      hotspots: [
        { partName: "Engine Bonnet", defaultX: 65, defaultY: 55 },
        { partName: "Front Wheel", defaultX: 78, defaultY: 75 }
      ]
    },
    top: {
      view: "top",
      label: "Top View",
      viewBox: "0 0 400 240",
      paths: [
        { type: "rect", x: 60, y: 76, width: 140, height: 88, rx: 4, fill: "#16a34a", stroke: "#14532d", strokeWidth: 2, partName: "Engine Bonnet" },
        { type: "rect", x: 200, y: 64, width: 120, height: 112, rx: 4, fill: "#16a34a", stroke: "#14532d", strokeWidth: 2, partName: "Canopy Roof" }
      ],
      hotspots: [
        { partName: "Engine Bonnet", defaultX: 35, defaultY: 50 },
        { partName: "Canopy Roof", defaultX: 65, defaultY: 50 }
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
