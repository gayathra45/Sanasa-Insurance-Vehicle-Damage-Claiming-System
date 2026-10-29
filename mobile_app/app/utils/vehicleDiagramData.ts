/**
 * Scalable Interactive Vehicle Diagram Definitions
 * Normalized viewBox: 0 0 400 240
 * Supports 8 vehicle categories across 5 perspectives:
 * Front, Rear, Left, Right, Top
 */

export type VehicleViewType = "front" | "rear" | "left" | "right" | "top";

export interface VehiclePartHotspot {
  partName: string;
  defaultX: number; // 0 - 100 percentage
  defaultY: number; // 0 - 100 percentage
}

export interface ViewDiagramSpec {
  view: VehicleViewType;
  label: string;
  viewBox: string;
  paths: {
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
  }[];
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
export function findClosestPart(hotspots: VehiclePartHotspot[], x: number, y: number, fallback = "Body Panel"): string {
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

  // If tap is reasonably close (within ~25% radius), return the part name
  return closest ? closest.partName : fallback;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. CAR DIAGRAM SPECIFICATION
// ─────────────────────────────────────────────────────────────────────────────
const CAR_SPEC: CategoryDiagramSpec = {
  category: "Car",
  displayName: "Sedan / Passenger Car",
  icon: "car",
  views: {
    front: {
      view: "front",
      label: "Front View",
      viewBox: "0 0 400 240",
      paths: [
        // Roof & Windscreen
        { type: "path", d: "M 110,65 L 140,25 L 260,25 L 290,65 Z", fill: "#e2e8f0", stroke: "#1e293b", strokeWidth: 2.5, partName: "Windscreen" },
        // Bonnet / Hood
        { type: "path", d: "M 80,120 L 110,65 L 290,65 L 320,120 Z", fill: "#f1f5f9", stroke: "#1e293b", strokeWidth: 2.5, partName: "Bonnet / Hood" },
        // Front Grille & Radiator
        { type: "rect", x: 140, y: 130, width: 120, height: 35, fill: "#334155", stroke: "#0f172a", strokeWidth: 2, partName: "Front Grille" },
        // Left Headlight
        { type: "polygon", points: "90,115 130,118 125,138 85,130", fill: "#fef08a", stroke: "#ca8a04", strokeWidth: 2, partName: "Left Headlight" },
        // Right Headlight
        { type: "polygon", points: "310,115 270,118 275,138 315,130", fill: "#fef08a", stroke: "#ca8a04", strokeWidth: 2, partName: "Right Headlight" },
        // Front Bumper
        { type: "path", d: "M 65,145 Q 200,165 335,145 L 330,190 Q 200,205 70,190 Z", fill: "#cbd5e1", stroke: "#1e293b", strokeWidth: 2.5, partName: "Front Bumper" },
        // Left Side Mirror
        { type: "rect", x: 65, y: 55, width: 25, height: 18, fill: "#94a3b8", stroke: "#1e293b", strokeWidth: 2, partName: "Left Mirror" },
        // Right Side Mirror
        { type: "rect", x: 310, y: 55, width: 25, height: 18, fill: "#94a3b8", stroke: "#1e293b", strokeWidth: 2, partName: "Right Mirror" },
        // Left Front Tyre
        { type: "rect", x: 65, y: 180, width: 22, height: 45, fill: "#0f172a", stroke: "#000", strokeWidth: 2, partName: "Left Front Wheel" },
        // Right Front Tyre
        { type: "rect", x: 313, y: 180, width: 22, height: 45, fill: "#0f172a", stroke: "#000", strokeWidth: 2, partName: "Right Front Wheel" }
      ],
      hotspots: [
        { partName: "Front Bumper", defaultX: 50, defaultY: 75 },
        { partName: "Front Grille", defaultX: 50, defaultY: 60 },
        { partName: "Bonnet / Hood", defaultX: 50, defaultY: 40 },
        { partName: "Windscreen", defaultX: 50, defaultY: 20 },
        { partName: "Left Headlight", defaultX: 25, defaultY: 52 },
        { partName: "Right Headlight", defaultX: 75, defaultY: 52 },
        { partName: "Left Mirror", defaultX: 20, defaultY: 26 },
        { partName: "Right Mirror", defaultX: 80, defaultY: 26 }
      ]
    },
    rear: {
      view: "rear",
      label: "Rear View",
      viewBox: "0 0 400 240",
      paths: [
        // Roof & Rear Windscreen
        { type: "path", d: "M 110,65 L 140,25 L 260,25 L 290,65 Z", fill: "#e2e8f0", stroke: "#1e293b", strokeWidth: 2.5, partName: "Rear Windscreen" },
        // Boot / Trunk Lid
        { type: "path", d: "M 80,120 L 110,65 L 290,65 L 320,120 Z", fill: "#f1f5f9", stroke: "#1e293b", strokeWidth: 2.5, partName: "Boot / Trunk Lid" },
        // Left Tail Light
        { type: "polygon", points: "90,115 130,118 125,138 85,130", fill: "#f87171", stroke: "#b91c1c", strokeWidth: 2, partName: "Left Tail Light" },
        // Right Tail Light
        { type: "polygon", points: "310,115 270,118 275,138 315,130", fill: "#f87171", stroke: "#b91c1c", strokeWidth: 2, partName: "Right Tail Light" },
        // Number Plate Area
        { type: "rect", x: 155, y: 130, width: 90, height: 26, fill: "#ffffff", stroke: "#1e293b", strokeWidth: 1.5, partName: "Rear License Plate" },
        // Rear Bumper
        { type: "path", d: "M 65,145 Q 200,165 335,145 L 330,190 Q 200,205 70,190 Z", fill: "#cbd5e1", stroke: "#1e293b", strokeWidth: 2.5, partName: "Rear Bumper" },
        // Left Rear Tyre
        { type: "rect", x: 65, y: 180, width: 22, height: 45, fill: "#0f172a", stroke: "#000", strokeWidth: 2, partName: "Left Rear Wheel" },
        // Right Rear Tyre
        { type: "rect", x: 313, y: 180, width: 22, height: 45, fill: "#0f172a", stroke: "#000", strokeWidth: 2, partName: "Right Rear Wheel" }
      ],
      hotspots: [
        { partName: "Rear Bumper", defaultX: 50, defaultY: 75 },
        { partName: "Boot / Trunk Lid", defaultX: 50, defaultY: 42 },
        { partName: "Rear Windscreen", defaultX: 50, defaultY: 20 },
        { partName: "Left Tail Light", defaultX: 25, defaultY: 52 },
        { partName: "Right Tail Light", defaultX: 75, defaultY: 52 },
        { partName: "Rear License Plate", defaultX: 50, defaultY: 60 }
      ]
    },
    left: {
      view: "left",
      label: "Left Side View",
      viewBox: "0 0 400 240",
      paths: [
        // Main Body Profile
        { type: "path", d: "M 25,155 L 45,125 L 105,100 L 140,55 L 260,55 L 320,105 L 370,115 L 375,155 L 360,165 L 295,165 A 35,35 0 0 0 225,165 L 145,165 A 35,35 0 0 0 75,165 L 25,165 Z", fill: "#f1f5f9", stroke: "#1e293b", strokeWidth: 2.5, partName: "Left Body Panel" },
        // Windows (Front & Rear Door Glass)
        { type: "path", d: "M 145,62 L 205,62 L 205,100 L 115,100 Z", fill: "#e2e8f0", stroke: "#1e293b", strokeWidth: 2, partName: "Left Front Window" },
        { type: "path", d: "M 215,62 L 255,62 L 305,100 L 215,100 Z", fill: "#e2e8f0", stroke: "#1e293b", strokeWidth: 2, partName: "Left Rear Window" },
        // Door Lines
        { type: "path", d: "M 210,62 L 210,165", stroke: "#64748b", strokeWidth: 2 },
        { type: "path", d: "M 125,105 L 125,165", stroke: "#64748b", strokeWidth: 1.5 },
        // Front Wheel
        { type: "circle", cx: 110, cy: 165, r: 28, fill: "#0f172a", stroke: "#64748b", strokeWidth: 3, partName: "Left Front Wheel" },
        // Rear Wheel
        { type: "circle", cx: 260, cy: 165, r: 28, fill: "#0f172a", stroke: "#64748b", strokeWidth: 3, partName: "Left Rear Wheel" },
        // Side Mirror
        { type: "rect", x: 135, y: 88, width: 14, height: 12, fill: "#94a3b8", stroke: "#1e293b", strokeWidth: 1.5, partName: "Left Side Mirror" }
      ],
      hotspots: [
        { partName: "Front Bumper", defaultX: 10, defaultY: 65 },
        { partName: "Left Front Fender", defaultX: 22, defaultY: 52 },
        { partName: "Left Front Wheel", defaultX: 28, defaultY: 70 },
        { partName: "Left Front Door", defaultX: 42, defaultY: 55 },
        { partName: "Left Rear Door", defaultX: 62, defaultY: 55 },
        { partName: "Left Rear Wheel", defaultX: 65, defaultY: 70 },
        { partName: "Left Quarter Panel", defaultX: 80, defaultY: 50 },
        { partName: "Rear Bumper", defaultX: 92, defaultY: 65 },
        { partName: "Roof", defaultX: 50, defaultY: 25 }
      ]
    },
    right: {
      view: "right",
      label: "Right Side View",
      viewBox: "0 0 400 240",
      paths: [
        // Main Body Profile (Flipped)
        { type: "path", d: "M 375,155 L 355,125 L 295,100 L 260,55 L 140,55 L 80,105 L 30,115 L 25,155 L 40,165 L 105,165 A 35,35 0 0 1 175,165 L 255,165 A 35,35 0 0 1 325,165 L 375,165 Z", fill: "#f1f5f9", stroke: "#1e293b", strokeWidth: 2.5, partName: "Right Body Panel" },
        // Windows
        { type: "path", d: "M 255,62 L 195,62 L 195,100 L 285,100 Z", fill: "#e2e8f0", stroke: "#1e293b", strokeWidth: 2, partName: "Right Front Window" },
        { type: "path", d: "M 185,62 L 145,62 L 95,100 L 185,100 Z", fill: "#e2e8f0", stroke: "#1e293b", strokeWidth: 2, partName: "Right Rear Window" },
        // Wheels
        { type: "circle", cx: 290, cy: 165, r: 28, fill: "#0f172a", stroke: "#64748b", strokeWidth: 3, partName: "Right Front Wheel" },
        { type: "circle", cx: 140, cy: 165, r: 28, fill: "#0f172a", stroke: "#64748b", strokeWidth: 3, partName: "Right Rear Wheel" },
        // Side Mirror
        { type: "rect", x: 251, y: 88, width: 14, height: 12, fill: "#94a3b8", stroke: "#1e293b", strokeWidth: 1.5, partName: "Right Side Mirror" }
      ],
      hotspots: [
        { partName: "Front Bumper", defaultX: 90, defaultY: 65 },
        { partName: "Right Front Fender", defaultX: 78, defaultY: 52 },
        { partName: "Right Front Wheel", defaultX: 72, defaultY: 70 },
        { partName: "Right Front Door", defaultX: 58, defaultY: 55 },
        { partName: "Right Rear Door", defaultX: 38, defaultY: 55 },
        { partName: "Right Rear Wheel", defaultX: 35, defaultY: 70 },
        { partName: "Right Quarter Panel", defaultX: 20, defaultY: 50 },
        { partName: "Rear Bumper", defaultX: 8, defaultY: 65 },
        { partName: "Roof", defaultX: 50, defaultY: 25 }
      ]
    },
    top: {
      view: "top",
      label: "Top View",
      viewBox: "0 0 400 240",
      paths: [
        // Exterior Boundary
        { type: "path", d: "M 45,70 Q 20,120 45,170 L 105,185 L 145,188 L 275,188 L 325,185 L 365,165 Q 380,120 365,75 L 325,55 L 275,52 L 145,52 L 105,55 Z", fill: "#f1f5f9", stroke: "#1e293b", strokeWidth: 2.5, partName: "Car Body Outline" },
        // Bonnet
        { type: "path", d: "M 45,70 L 115,75 L 115,165 L 45,170 Z", fill: "#e2e8f0", stroke: "#1e293b", strokeWidth: 2, partName: "Bonnet / Hood" },
        // Front Windscreen
        { type: "polygon", points: "115,75 145,78 145,162 115,165", fill: "#cbd5e1", stroke: "#334155", strokeWidth: 1.5, partName: "Front Windshield" },
        // Roof
        { type: "rect", x: 145, y: 78, width: 110, height: 84, fill: "#f8fafc", stroke: "#1e293b", strokeWidth: 2, partName: "Roof Panel" },
        // Rear Windscreen
        { type: "polygon", points: "255,78 285,75 285,165 255,162", fill: "#cbd5e1", stroke: "#334155", strokeWidth: 1.5, partName: "Rear Windshield" },
        // Boot Lid
        { type: "path", d: "M 285,75 L 365,75 L 365,165 L 285,165 Z", fill: "#e2e8f0", stroke: "#1e293b", strokeWidth: 2, partName: "Boot / Trunk Lid" }
      ],
      hotspots: [
        { partName: "Front Bumper", defaultX: 10, defaultY: 50 },
        { partName: "Bonnet / Hood", defaultX: 20, defaultY: 50 },
        { partName: "Front Windshield", defaultX: 32, defaultY: 50 },
        { partName: "Roof Panel", defaultX: 50, defaultY: 50 },
        { partName: "Rear Windshield", defaultX: 68, defaultY: 50 },
        { partName: "Boot / Trunk Lid", defaultX: 82, defaultY: 50 },
        { partName: "Left Doors / Sill", defaultX: 50, defaultY: 25 },
        { partName: "Right Doors / Sill", defaultX: 50, defaultY: 75 }
      ]
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. BUS SPECIFICATION
// ─────────────────────────────────────────────────────────────────────────────
const BUS_SPEC: CategoryDiagramSpec = {
  category: "Bus",
  displayName: "Commercial Bus / Coach",
  icon: "bus",
  views: {
    front: {
      view: "front",
      label: "Front View",
      viewBox: "0 0 400 240",
      paths: [
        // Tall Boxy Front
        { type: "rect", x: 90, y: 20, width: 220, height: 175, rx: 12, fill: "#f1f5f9", stroke: "#1e293b", strokeWidth: 2.5 },
        // Destination Board
        { type: "rect", x: 125, y: 30, width: 150, height: 25, rx: 4, fill: "#0f172a", stroke: "#38bdf8", strokeWidth: 1.5, partName: "Destination Board" },
        // Wide Panoramic Windscreen
        { type: "rect", x: 105, y: 62, width: 190, height: 60, rx: 6, fill: "#bae6fd", stroke: "#0284c7", strokeWidth: 2, partName: "Windscreen" },
        // Grille & Badge
        { type: "rect", x: 145, y: 135, width: 110, height: 28, fill: "#334155", stroke: "#0f172a", strokeWidth: 2, partName: "Front Grille" },
        // Headlights (Stacked Bus Style)
        { type: "rect", x: 105, y: 132, width: 25, height: 32, fill: "#fef08a", stroke: "#ca8a04", strokeWidth: 1.5, partName: "Left Headlight Cluster" },
        { type: "rect", x: 270, y: 132, width: 25, height: 32, fill: "#fef08a", stroke: "#ca8a04", strokeWidth: 1.5, partName: "Right Headlight Cluster" },
        // Heavy Bumper
        { type: "rect", x: 80, y: 170, width: 240, height: 30, rx: 6, fill: "#94a3b8", stroke: "#1e293b", strokeWidth: 2.5, partName: "Front Bumper" },
        // Front Steer Tyres
        { type: "rect", x: 70, y: 185, width: 24, height: 42, fill: "#0f172a", stroke: "#000", strokeWidth: 2, partName: "Left Front Wheel" },
        { type: "rect", x: 306, y: 185, width: 24, height: 42, fill: "#0f172a", stroke: "#000", strokeWidth: 2, partName: "Right Front Wheel" }
      ],
      hotspots: [
        { partName: "Destination Board", defaultX: 50, defaultY: 18 },
        { partName: "Windscreen", defaultX: 50, defaultY: 40 },
        { partName: "Front Grille", defaultX: 50, defaultY: 62 },
        { partName: "Front Bumper", defaultX: 50, defaultY: 80 },
        { partName: "Left Headlight", defaultX: 28, defaultY: 62 },
        { partName: "Right Headlight", defaultX: 72, defaultY: 62 }
      ]
    },
    rear: {
      view: "rear",
      label: "Rear View",
      viewBox: "0 0 400 240",
      paths: [
        { type: "rect", x: 90, y: 20, width: 220, height: 175, rx: 12, fill: "#f1f5f9", stroke: "#1e293b", strokeWidth: 2.5 },
        // Rear Window
        { type: "rect", x: 110, y: 35, width: 180, height: 45, rx: 6, fill: "#e2e8f0", stroke: "#1e293b", strokeWidth: 2, partName: "Rear Window" },
        // Engine Hatch
        { type: "rect", x: 125, y: 95, width: 150, height: 70, rx: 4, fill: "#e2e8f0", stroke: "#64748b", strokeWidth: 2, partName: "Rear Engine Hatch" },
        // Rear Tail Light Stacks
        { type: "rect", x: 100, y: 95, width: 16, height: 55, fill: "#f87171", stroke: "#b91c1c", strokeWidth: 1.5, partName: "Left Tail Lights" },
        { type: "rect", x: 284, y: 95, width: 16, height: 55, fill: "#f87171", stroke: "#b91c1c", strokeWidth: 1.5, partName: "Right Tail Lights" },
        // Rear Bumper
        { type: "rect", x: 80, y: 170, width: 240, height: 30, rx: 6, fill: "#94a3b8", stroke: "#1e293b", strokeWidth: 2.5, partName: "Rear Bumper" },
        { type: "rect", x: 65, y: 185, width: 30, height: 42, fill: "#0f172a", stroke: "#000", strokeWidth: 2, partName: "Dual Left Wheels" },
        { type: "rect", x: 305, y: 185, width: 30, height: 42, fill: "#0f172a", stroke: "#000", strokeWidth: 2, partName: "Dual Right Wheels" }
      ],
      hotspots: [
        { partName: "Rear Window", defaultX: 50, defaultY: 25 },
        { partName: "Rear Engine Hatch", defaultX: 50, defaultY: 55 },
        { partName: "Rear Bumper", defaultX: 50, defaultY: 80 },
        { partName: "Left Tail Lights", defaultX: 27, defaultY: 50 },
        { partName: "Right Tail Lights", defaultX: 73, defaultY: 50 }
      ]
    },
    left: {
      view: "left",
      label: "Left Side View",
      viewBox: "0 0 400 240",
      paths: [
        // Long Bus Body
        { type: "rect", x: 25, y: 40, width: 350, height: 125, rx: 10, fill: "#f1f5f9", stroke: "#1e293b", strokeWidth: 2.5, partName: "Left Side Panels" },
        // Windows Strip
        { type: "rect", x: 35, y: 50, width: 45, height: 45, fill: "#bae6fd", stroke: "#0284c7", strokeWidth: 1.5 },
        { type: "rect", x: 88, y: 50, width: 45, height: 45, fill: "#e2e8f0", stroke: "#64748b", strokeWidth: 1.5 },
        { type: "rect", x: 141, y: 50, width: 45, height: 45, fill: "#e2e8f0", stroke: "#64748b", strokeWidth: 1.5 },
        { type: "rect", x: 194, y: 50, width: 45, height: 45, fill: "#e2e8f0", stroke: "#64748b", strokeWidth: 1.5 },
        { type: "rect", x: 247, y: 50, width: 45, height: 45, fill: "#e2e8f0", stroke: "#64748b", strokeWidth: 1.5 },
        { type: "rect", x: 300, y: 50, width: 65, height: 45, fill: "#e2e8f0", stroke: "#64748b", strokeWidth: 1.5 },
        // Front Steer Wheel
        { type: "circle", cx: 80, cy: 165, r: 28, fill: "#0f172a", stroke: "#64748b", strokeWidth: 3, partName: "Left Front Wheel" },
        // Dual Rear Wheels
        { type: "circle", cx: 295, cy: 165, r: 28, fill: "#0f172a", stroke: "#64748b", strokeWidth: 3, partName: "Left Rear Wheels" },
        { type: "circle", cx: 335, cy: 165, r: 28, fill: "#0f172a", stroke: "#64748b", strokeWidth: 3, partName: "Left Tag Axle" }
      ],
      hotspots: [
        { partName: "Front Bumper", defaultX: 8, defaultY: 65 },
        { partName: "Passenger Windscreen", defaultX: 12, defaultY: 30 },
        { partName: "Passenger Entry Door", defaultX: 25, defaultY: 55 },
        { partName: "Left Side Body Panels", defaultX: 50, defaultY: 55 },
        { partName: "Left Front Wheel", defaultX: 20, defaultY: 70 },
        { partName: "Dual Rear Wheels", defaultX: 75, defaultY: 70 },
        { partName: "Rear Bumper", defaultX: 95, defaultY: 65 }
      ]
    },
    right: {
      view: "right",
      label: "Right Side View",
      viewBox: "0 0 400 240",
      paths: [
        { type: "rect", x: 25, y: 40, width: 350, height: 125, rx: 10, fill: "#f1f5f9", stroke: "#1e293b", strokeWidth: 2.5, partName: "Right Side Panels" },
        // Windows Strip
        { type: "rect", x: 35, y: 50, width: 65, height: 45, fill: "#e2e8f0", stroke: "#64748b", strokeWidth: 1.5 },
        { type: "rect", x: 108, y: 50, width: 45, height: 45, fill: "#e2e8f0", stroke: "#64748b", strokeWidth: 1.5 },
        { type: "rect", x: 161, y: 50, width: 45, height: 45, fill: "#e2e8f0", stroke: "#64748b", strokeWidth: 1.5 },
        { type: "rect", x: 214, y: 50, width: 45, height: 45, fill: "#e2e8f0", stroke: "#64748b", strokeWidth: 1.5 },
        { type: "rect", x: 267, y: 50, width: 45, height: 45, fill: "#e2e8f0", stroke: "#64748b", strokeWidth: 1.5 },
        { type: "rect", x: 320, y: 50, width: 45, height: 45, fill: "#bae6fd", stroke: "#0284c7", strokeWidth: 1.5 },
        // Wheels
        { type: "circle", cx: 320, cy: 165, r: 28, fill: "#0f172a", stroke: "#64748b", strokeWidth: 3, partName: "Right Front Wheel" },
        { type: "circle", cx: 105, cy: 165, r: 28, fill: "#0f172a", stroke: "#64748b", strokeWidth: 3, partName: "Right Rear Wheels" }
      ],
      hotspots: [
        { partName: "Front Bumper", defaultX: 92, defaultY: 65 },
        { partName: "Driver Cabin Door", defaultX: 85, defaultY: 55 },
        { partName: "Right Side Body Panels", defaultX: 50, defaultY: 55 },
        { partName: "Right Front Wheel", defaultX: 80, defaultY: 70 },
        { partName: "Right Rear Wheels", defaultX: 25, defaultY: 70 },
        { partName: "Rear Bumper", defaultX: 5, defaultY: 65 }
      ]
    },
    top: {
      view: "top",
      label: "Top View",
      viewBox: "0 0 400 240",
      paths: [
        { type: "rect", x: 40, y: 50, width: 320, height: 140, rx: 12, fill: "#f1f5f9", stroke: "#1e293b", strokeWidth: 2.5, partName: "Roof Body" },
        // Front Glass
        { type: "rect", x: 45, y: 55, width: 25, height: 130, rx: 4, fill: "#bae6fd", stroke: "#0284c7", strokeWidth: 1.5, partName: "Windscreen" },
        // Roof Escape Hatches / A/C Pods
        { type: "rect", x: 120, y: 80, width: 60, height: 80, rx: 6, fill: "#e2e8f0", stroke: "#64748b", strokeWidth: 2, partName: "Front A/C Roof Unit" },
        { type: "rect", x: 230, y: 80, width: 60, height: 80, rx: 6, fill: "#e2e8f0", stroke: "#64748b", strokeWidth: 2, partName: "Rear Emergency Escape Hatch" }
      ],
      hotspots: [
        { partName: "Front Bumper", defaultX: 8, defaultY: 50 },
        { partName: "Windscreen", defaultX: 16, defaultY: 50 },
        { partName: "Front A/C Roof Unit", defaultX: 38, defaultY: 50 },
        { partName: "Rear Escape Hatch", defaultX: 68, defaultY: 50 },
        { partName: "Rear End", defaultX: 92, defaultY: 50 }
      ]
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. MOTORCYCLE / BIKE SPECIFICATION
// ─────────────────────────────────────────────────────────────────────────────
const MOTORCYCLE_SPEC: CategoryDiagramSpec = {
  category: "Motorcycle",
  displayName: "Motorcycle / Bike / Scooter",
  icon: "motorbike",
  views: {
    front: {
      view: "front",
      label: "Front View",
      viewBox: "0 0 400 240",
      paths: [
        // Handlebars
        { type: "path", d: "M 100,50 Q 200,65 300,50", stroke: "#0f172a", strokeWidth: 6, fill: "none", partName: "Handlebars" },
        // Mirrors
        { type: "circle", cx: 100, cy: 35, r: 12, fill: "#94a3b8", stroke: "#1e293b", strokeWidth: 2, partName: "Left Mirror" },
        { type: "circle", cx: 300, cy: 35, r: 12, fill: "#94a3b8", stroke: "#1e293b", strokeWidth: 2, partName: "Right Mirror" },
        // Headlight
        { type: "circle", cx: 200, cy: 80, r: 24, fill: "#fef08a", stroke: "#ca8a04", strokeWidth: 2.5, partName: "Headlight" },
        // Front Fork
        { type: "rect", x: 182, y: 105, width: 10, height: 80, fill: "#64748b", stroke: "#1e293b", strokeWidth: 1.5 },
        { type: "rect", x: 208, y: 105, width: 10, height: 80, fill: "#64748b", stroke: "#1e293b", strokeWidth: 1.5 },
        // Front Tyre
        { type: "rect", x: 188, y: 140, width: 24, height: 85, rx: 12, fill: "#0f172a", stroke: "#000", strokeWidth: 2, partName: "Front Wheel & Tyre" }
      ],
      hotspots: [
        { partName: "Headlight", defaultX: 50, defaultY: 35 },
        { partName: "Handlebars", defaultX: 50, defaultY: 22 },
        { partName: "Left Mirror", defaultX: 25, defaultY: 15 },
        { partName: "Right Mirror", defaultX: 75, defaultY: 15 },
        { partName: "Front Fork", defaultX: 50, defaultY: 55 },
        { partName: "Front Wheel", defaultX: 50, defaultY: 80 }
      ]
    },
    rear: {
      view: "rear",
      label: "Rear View",
      viewBox: "0 0 400 240",
      paths: [
        // Rear Seat Cowl
        { type: "path", d: "M 160,80 L 200,50 L 240,80 Z", fill: "#f1f5f9", stroke: "#1e293b", strokeWidth: 2, partName: "Tail Cowl" },
        // Tail Light
        { type: "polygon", points: "185,80 215,80 200,100", fill: "#f87171", stroke: "#b91c1c", strokeWidth: 2, partName: "Tail Light" },
        // Number Plate
        { type: "rect", x: 175, y: 105, width: 50, height: 25, fill: "#ffffff", stroke: "#1e293b", strokeWidth: 1.5, partName: "Number Plate" },
        // Exhaust Silencer (Right Side)
        { type: "rect", x: 235, y: 135, width: 18, height: 50, rx: 6, fill: "#94a3b8", stroke: "#334155", strokeWidth: 2, partName: "Exhaust Silencer" },
        // Wide Rear Tyre
        { type: "rect", x: 185, y: 130, width: 30, height: 95, rx: 14, fill: "#0f172a", stroke: "#000", strokeWidth: 2, partName: "Rear Wheel & Tyre" }
      ],
      hotspots: [
        { partName: "Tail Light", defaultX: 50, defaultY: 38 },
        { partName: "Rear Seat / Cowl", defaultX: 50, defaultY: 25 },
        { partName: "Number Plate", defaultX: 50, defaultY: 50 },
        { partName: "Exhaust Silencer", defaultX: 62, defaultY: 65 },
        { partName: "Rear Wheel", defaultX: 50, defaultY: 80 }
      ]
    },
    left: {
      view: "left",
      label: "Left Side View",
      viewBox: "0 0 400 240",
      paths: [
        // Front Wheel
        { type: "circle", cx: 90, cy: 155, r: 35, fill: "#0f172a", stroke: "#64748b", strokeWidth: 3, partName: "Front Wheel" },
        // Rear Wheel
        { type: "circle", cx: 310, cy: 155, r: 35, fill: "#0f172a", stroke: "#64748b", strokeWidth: 3, partName: "Rear Wheel" },
        // Front Fork
        { type: "line", stroke: "#64748b", strokeWidth: 6 },
        // Fuel Tank
        { type: "path", d: "M 160,110 C 140,80 180,60 215,75 C 225,90 220,115 160,110 Z", fill: "#38bdf8", stroke: "#0284c7", strokeWidth: 2.5, partName: "Fuel Tank" },
        // Seat
        { type: "path", d: "M 215,75 Q 260,85 285,100 L 260,115 L 215,95 Z", fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Rider & Pillion Seat" },
        // Engine Block
        { type: "rect", x: 175, y: 120, width: 50, height: 45, rx: 6, fill: "#64748b", stroke: "#334155", strokeWidth: 2, partName: "Engine Casing" }
      ],
      hotspots: [
        { partName: "Front Wheel", defaultX: 22, defaultY: 65 },
        { partName: "Front Mudguard", defaultX: 24, defaultY: 50 },
        { partName: "Handlebars & Headlight", defaultX: 35, defaultY: 35 },
        { partName: "Fuel Tank", defaultX: 48, defaultY: 35 },
        { partName: "Engine Casing", defaultX: 50, defaultY: 60 },
        { partName: "Seat", defaultX: 62, defaultY: 40 },
        { partName: "Rear Wheel & Sprocket", defaultX: 78, defaultY: 65 }
      ]
    },
    right: {
      view: "right",
      label: "Right Side View",
      viewBox: "0 0 400 240",
      paths: [
        // Flipped Profile with Exhaust Pipe
        { type: "circle", cx: 310, cy: 155, r: 35, fill: "#0f172a", stroke: "#64748b", strokeWidth: 3, partName: "Front Wheel" },
        { type: "circle", cx: 90, cy: 155, r: 35, fill: "#0f172a", stroke: "#64748b", strokeWidth: 3, partName: "Rear Wheel" },
        { type: "path", d: "M 240,110 C 260,80 220,60 185,75 C 175,90 180,115 240,110 Z", fill: "#38bdf8", stroke: "#0284c7", strokeWidth: 2.5, partName: "Fuel Tank" },
        { type: "path", d: "M 185,75 Q 140,85 115,100 L 140,115 L 185,95 Z", fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Rider Seat" },
        // Exhaust Silencer
        { type: "path", d: "M 195,145 L 140,155 L 75,145", stroke: "#94a3b8", strokeWidth: 8, fill: "none", partName: "Exhaust Silencer" }
      ],
      hotspots: [
        { partName: "Front Wheel", defaultX: 78, defaultY: 65 },
        { partName: "Fuel Tank", defaultX: 52, defaultY: 35 },
        { partName: "Exhaust Silencer", defaultX: 35, defaultY: 65 },
        { partName: "Rear Wheel", defaultX: 22, defaultY: 65 }
      ]
    },
    top: {
      view: "top",
      label: "Top View",
      viewBox: "0 0 400 240",
      paths: [
        // Handlebars Across
        { type: "rect", x: 110, y: 40, width: 180, height: 10, rx: 4, fill: "#0f172a", partName: "Handlebars" },
        // Fuel Tank Outline
        { type: "path", d: "M 175,60 Q 155,100 175,130 L 225,130 Q 245,100 225,60 Z", fill: "#38bdf8", stroke: "#0284c7", strokeWidth: 2, partName: "Fuel Tank" },
        // Seat
        { type: "path", d: "M 180,130 L 220,130 L 210,195 L 190,195 Z", fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Seat" }
      ],
      hotspots: [
        { partName: "Handlebars", defaultX: 50, defaultY: 18 },
        { partName: "Fuel Tank", defaultX: 50, defaultY: 42 },
        { partName: "Seat", defaultX: 50, defaultY: 70 }
      ]
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. LORRY / TRUCK SPECIFICATION
// ─────────────────────────────────────────────────────────────────────────────
const LORRY_SPEC: CategoryDiagramSpec = {
  category: "Lorry",
  displayName: "Commercial Lorry / Truck",
  icon: "truck",
  views: {
    front: {
      view: "front",
      label: "Front View",
      viewBox: "0 0 400 240",
      paths: [
        // Cabin
        { type: "rect", x: 80, y: 30, width: 240, height: 160, rx: 8, fill: "#f1f5f9", stroke: "#1e293b", strokeWidth: 2.5, partName: "Driver Cabin" },
        // Windshield
        { type: "rect", x: 95, y: 42, width: 210, height: 60, rx: 4, fill: "#bae6fd", stroke: "#0284c7", strokeWidth: 2, partName: "Cabin Windshield" },
        // Heavy Bumper
        { type: "rect", x: 65, y: 165, width: 270, height: 35, rx: 4, fill: "#475569", stroke: "#0f172a", strokeWidth: 2.5, partName: "Steel Front Bumper" },
        // Wheels
        { type: "rect", x: 55, y: 175, width: 24, height: 48, fill: "#0f172a", stroke: "#000", strokeWidth: 2, partName: "Left Front Wheel" },
        { type: "rect", x: 321, y: 175, width: 24, height: 48, fill: "#0f172a", stroke: "#000", strokeWidth: 2, partName: "Right Front Wheel" }
      ],
      hotspots: [
        { partName: "Cabin Windshield", defaultX: 50, defaultY: 30 },
        { partName: "Cabin Grille", defaultX: 50, defaultY: 55 },
        { partName: "Steel Front Bumper", defaultX: 50, defaultY: 78 },
        { partName: "Left Headlight", defaultX: 25, defaultY: 65 },
        { partName: "Right Headlight", defaultX: 75, defaultY: 65 }
      ]
    },
    rear: {
      view: "rear",
      label: "Rear View",
      viewBox: "0 0 400 240",
      paths: [
        // Cargo Body / Box Container
        { type: "rect", x: 70, y: 25, width: 260, height: 160, fill: "#e2e8f0", stroke: "#1e293b", strokeWidth: 2.5, partName: "Cargo Container" },
        // Tailgate
        { type: "rect", x: 70, y: 140, width: 260, height: 45, fill: "#cbd5e1", stroke: "#1e293b", strokeWidth: 2, partName: "Rear Tailgate" },
        // Underrun Bar
        { type: "rect", x: 60, y: 185, width: 280, height: 18, fill: "#f59e0b", stroke: "#b45309", strokeWidth: 2, partName: "Rear Underrun Bar" },
        // Dual Tyres
        { type: "rect", x: 50, y: 180, width: 32, height: 45, fill: "#0f172a", stroke: "#000", strokeWidth: 2, partName: "Dual Left Wheels" },
        { type: "rect", x: 318, y: 180, width: 32, height: 45, fill: "#0f172a", stroke: "#000", strokeWidth: 2, partName: "Dual Right Wheels" }
      ],
      hotspots: [
        { partName: "Cargo Body", defaultX: 50, defaultY: 35 },
        { partName: "Rear Tailgate", defaultX: 50, defaultY: 68 },
        { partName: "Rear Underrun Bar", defaultX: 50, defaultY: 82 }
      ]
    },
    left: {
      view: "left",
      label: "Left Side View",
      viewBox: "0 0 400 240",
      paths: [
        // Driver Cabin (Front Left)
        { type: "path", d: "M 25,165 L 25,95 L 45,55 L 115,55 L 115,165 Z", fill: "#f1f5f9", stroke: "#1e293b", strokeWidth: 2.5, partName: "Driver Cabin" },
        // Large Cargo Container
        { type: "rect", x: 125, y: 40, width: 250, height: 125, fill: "#e2e8f0", stroke: "#1e293b", strokeWidth: 2.5, partName: "Cargo Body" },
        // Fuel Tank
        { type: "rect", x: 145, y: 145, width: 65, height: 25, rx: 6, fill: "#94a3b8", stroke: "#475569", strokeWidth: 2, partName: "Fuel Tank" },
        // Front Wheel
        { type: "circle", cx: 70, cy: 165, r: 28, fill: "#0f172a", stroke: "#64748b", strokeWidth: 3, partName: "Left Front Wheel" },
        // Dual Rear Axles
        { type: "circle", cx: 280, cy: 165, r: 28, fill: "#0f172a", stroke: "#64748b", strokeWidth: 3, partName: "Drive Axle Wheel" },
        { type: "circle", cx: 335, cy: 165, r: 28, fill: "#0f172a", stroke: "#64748b", strokeWidth: 3, partName: "Tag Axle Wheel" }
      ],
      hotspots: [
        { partName: "Front Bumper", defaultX: 8, defaultY: 70 },
        { partName: "Driver Cabin", defaultX: 18, defaultY: 45 },
        { partName: "Fuel Tank", defaultX: 45, defaultY: 65 },
        { partName: "Cargo Body", defaultX: 65, defaultY: 45 },
        { partName: "Left Front Wheel", defaultX: 18, defaultY: 70 },
        { partName: "Dual Rear Wheels", defaultX: 75, defaultY: 70 }
      ]
    },
    right: {
      view: "right",
      label: "Right Side View",
      viewBox: "0 0 400 240",
      paths: [
        { type: "path", d: "M 375,165 L 375,95 L 355,55 L 285,55 L 285,165 Z", fill: "#f1f5f9", stroke: "#1e293b", strokeWidth: 2.5, partName: "Driver Cabin" },
        { type: "rect", x: 25, y: 40, width: 250, height: 125, fill: "#e2e8f0", stroke: "#1e293b", strokeWidth: 2.5, partName: "Cargo Body" },
        { type: "circle", cx: 330, cy: 165, r: 28, fill: "#0f172a", stroke: "#64748b", strokeWidth: 3, partName: "Right Front Wheel" },
        { type: "circle", cx: 120, cy: 165, r: 28, fill: "#0f172a", stroke: "#64748b", strokeWidth: 3, partName: "Drive Axle Wheel" }
      ],
      hotspots: [
        { partName: "Front Bumper", defaultX: 92, defaultY: 70 },
        { partName: "Driver Cabin", defaultX: 82, defaultY: 45 },
        { partName: "Cargo Body", defaultX: 35, defaultY: 45 },
        { partName: "Right Front Wheel", defaultX: 82, defaultY: 70 }
      ]
    },
    top: {
      view: "top",
      label: "Top View",
      viewBox: "0 0 400 240",
      paths: [
        { type: "rect", x: 40, y: 65, width: 75, height: 110, rx: 6, fill: "#f1f5f9", stroke: "#1e293b", strokeWidth: 2.5, partName: "Cabin Roof" },
        { type: "rect", x: 120, y: 55, width: 240, height: 130, fill: "#e2e8f0", stroke: "#1e293b", strokeWidth: 2.5, partName: "Cargo Bed Roof" }
      ],
      hotspots: [
        { partName: "Front Bumper", defaultX: 10, defaultY: 50 },
        { partName: "Cabin Roof", defaultX: 20, defaultY: 50 },
        { partName: "Cargo Bed", defaultX: 60, defaultY: 50 }
      ]
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. TRACTOR SPECIFICATION
// ─────────────────────────────────────────────────────────────────────────────
const TRACTOR_SPEC: CategoryDiagramSpec = {
  category: "Tractor",
  displayName: "Agricultural Tractor",
  icon: "tractor",
  views: {
    front: {
      view: "front",
      label: "Front View",
      viewBox: "0 0 400 240",
      paths: [
        // Tall Narrow Bonnet
        { type: "rect", x: 145, y: 45, width: 110, height: 110, rx: 8, fill: "#16a34a", stroke: "#14532d", strokeWidth: 2.5, partName: "Engine Bonnet" },
        // Grille & Headlights
        { type: "rect", x: 160, y: 60, width: 80, height: 60, fill: "#334155", stroke: "#0f172a", strokeWidth: 2, partName: "Radiator Grille" },
        { type: "circle", cx: 175, cy: 75, r: 10, fill: "#fef08a", stroke: "#ca8a04", strokeWidth: 1.5, partName: "Left Headlight" },
        { type: "circle", cx: 225, cy: 75, r: 10, fill: "#fef08a", stroke: "#ca8a04", strokeWidth: 1.5, partName: "Right Headlight" },
        // Exhaust Stack on Left
        { type: "rect", x: 135, y: 15, width: 8, height: 50, fill: "#0f172a", partName: "Exhaust Stack" },
        // Small Front Tyres
        { type: "rect", x: 95, y: 135, width: 28, height: 65, rx: 6, fill: "#0f172a", stroke: "#000", strokeWidth: 2, partName: "Left Front Tyre" },
        { type: "rect", x: 277, y: 135, width: 28, height: 65, rx: 6, fill: "#0f172a", stroke: "#000", strokeWidth: 2, partName: "Right Front Tyre" },
        // Large Rear Tyres Visible Behind
        { type: "rect", x: 60, y: 70, width: 35, height: 130, rx: 8, fill: "#1e293b", stroke: "#000", strokeWidth: 2, partName: "Left Rear Lug Tyre" },
        { type: "rect", x: 305, y: 70, width: 35, height: 130, rx: 8, fill: "#1e293b", stroke: "#000", strokeWidth: 2, partName: "Right Rear Lug Tyre" }
      ],
      hotspots: [
        { partName: "Exhaust Stack", defaultX: 35, defaultY: 15 },
        { partName: "Engine Bonnet", defaultX: 50, defaultY: 45 },
        { partName: "Radiator Grille", defaultX: 50, defaultY: 60 },
        { partName: "Front Axle Tyres", defaultX: 50, defaultY: 75 },
        { partName: "Large Rear Tyres", defaultX: 20, defaultY: 60 }
      ]
    },
    rear: {
      view: "rear",
      label: "Rear View",
      viewBox: "0 0 400 240",
      paths: [
        // Driver Seat & ROPS Frame
        { type: "rect", x: 130, y: 25, width: 140, height: 10, fill: "#0f172a", partName: "ROPS Safety Bar" },
        { type: "rect", x: 175, y: 75, width: 50, height: 45, rx: 6, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Driver Seat" },
        // Three Point Hitch / PTO
        { type: "rect", x: 165, y: 155, width: 70, height: 35, fill: "#475569", stroke: "#0f172a", strokeWidth: 2, partName: "PTO & 3-Point Hitch" },
        // Big Rear Wheels
        { type: "rect", x: 65, y: 65, width: 45, height: 135, rx: 10, fill: "#0f172a", stroke: "#000", strokeWidth: 3, partName: "Left Rear Lug Tyre" },
        { type: "rect", x: 290, y: 65, width: 45, height: 135, rx: 10, fill: "#0f172a", stroke: "#000", strokeWidth: 3, partName: "Right Rear Lug Tyre" }
      ],
      hotspots: [
        { partName: "ROPS Safety Frame", defaultX: 50, defaultY: 20 },
        { partName: "Driver Seat", defaultX: 50, defaultY: 40 },
        { partName: "3-Point Hitch & PTO", defaultX: 50, defaultY: 72 },
        { partName: "Left Rear Tyre", defaultX: 22, defaultY: 55 },
        { partName: "Right Rear Tyre", defaultX: 78, defaultY: 55 }
      ]
    },
    left: {
      view: "left",
      label: "Left Side View",
      viewBox: "0 0 400 240",
      paths: [
        // Engine Hood (Front)
        { type: "rect", x: 50, y: 95, width: 125, height: 60, rx: 6, fill: "#16a34a", stroke: "#14532d", strokeWidth: 2.5, partName: "Engine Hood" },
        // Exhaust Stack
        { type: "rect", x: 100, y: 40, width: 8, height: 55, fill: "#0f172a", partName: "Exhaust Stack" },
        // ROPS Bar
        { type: "path", d: "M 230,150 L 230,35 L 290,35 L 290,150", stroke: "#0f172a", strokeWidth: 6, fill: "none", partName: "ROPS Roll Bar" },
        // Small Front Wheel
        { type: "circle", cx: 105, cy: 165, r: 24, fill: "#0f172a", stroke: "#64748b", strokeWidth: 3, partName: "Front Steering Tyre" },
        // Massive Rear Tyre
        { type: "circle", cx: 285, cy: 145, r: 50, fill: "#0f172a", stroke: "#64748b", strokeWidth: 5, partName: "Rear Agricultural Lug Tyre" }
      ],
      hotspots: [
        { partName: "Front Grille / Counterweight", defaultX: 12, defaultY: 65 },
        { partName: "Engine Hood", defaultX: 28, defaultY: 50 },
        { partName: "Exhaust Stack", defaultX: 26, defaultY: 25 },
        { partName: "Front Wheel", defaultX: 26, defaultY: 70 },
        { partName: "Steering & Seat", defaultX: 52, defaultY: 45 },
        { partName: "Large Rear Lug Tyre", defaultX: 72, defaultY: 62 },
        { partName: "Rear 3-Point Hitch", defaultX: 90, defaultY: 65 }
      ]
    },
    right: {
      view: "right",
      label: "Right Side View",
      viewBox: "0 0 400 240",
      paths: [
        { type: "rect", x: 225, y: 95, width: 125, height: 60, rx: 6, fill: "#16a34a", stroke: "#14532d", strokeWidth: 2.5, partName: "Engine Hood" },
        { type: "circle", cx: 295, cy: 165, r: 24, fill: "#0f172a", stroke: "#64748b", strokeWidth: 3, partName: "Front Steering Tyre" },
        { type: "circle", cx: 115, cy: 145, r: 50, fill: "#0f172a", stroke: "#64748b", strokeWidth: 5, partName: "Rear Lug Tyre" }
      ],
      hotspots: [
        { partName: "Front Grille", defaultX: 88, defaultY: 65 },
        { partName: "Engine Hood", defaultX: 72, defaultY: 50 },
        { partName: "Front Wheel", defaultX: 74, defaultY: 70 },
        { partName: "Large Rear Lug Tyre", defaultX: 28, defaultY: 62 }
      ]
    },
    top: {
      view: "top",
      label: "Top View",
      viewBox: "0 0 400 240",
      paths: [
        { type: "rect", x: 60, y: 80, width: 140, height: 80, rx: 6, fill: "#16a34a", stroke: "#14532d", strokeWidth: 2.5, partName: "Hood" },
        { type: "rect", x: 220, y: 95, width: 60, height: 50, rx: 4, fill: "#1e293b", stroke: "#0f172a", strokeWidth: 2, partName: "Seat" }
      ],
      hotspots: [
        { partName: "Front Bumper", defaultX: 12, defaultY: 50 },
        { partName: "Engine Hood", defaultX: 35, defaultY: 50 },
        { partName: "Driver Seat", defaultX: 62, defaultY: 50 }
      ]
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. THREE-WHEELER (TUK-TUK) SPECIFICATION
// ─────────────────────────────────────────────────────────────────────────────
const THREE_WHEELER_SPEC: CategoryDiagramSpec = {
  category: "Three-Wheeler",
  displayName: "Three-Wheeler / Auto Rickshaw (Tuk-Tuk)",
  icon: "rickshaw",
  views: {
    front: {
      view: "front",
      label: "Front View",
      viewBox: "0 0 400 240",
      paths: [
        // Distinctive Tapered Tuk-Tuk Front Apron
        { type: "path", d: "M 130,45 L 200,25 L 270,45 L 285,150 L 200,165 L 115,150 Z", fill: "#f1f5f9", stroke: "#1e293b", strokeWidth: 2.5, partName: "Front Apron" },
        // Windshield (Flat Single Wiper)
        { type: "polygon", points: "140,48 200,32 260,48 265,95 135,95", fill: "#bae6fd", stroke: "#0284c7", strokeWidth: 2, partName: "Windshield" },
        // Center Headlight
        { type: "circle", cx: 200, cy: 125, r: 16, fill: "#fef08a", stroke: "#ca8a04", strokeWidth: 2, partName: "Center Headlight" },
        // Front Fender & Single Wheel
        { type: "rect", x: 185, y: 165, width: 30, height: 55, rx: 8, fill: "#0f172a", stroke: "#000", strokeWidth: 2, partName: "Single Front Wheel" }
      ],
      hotspots: [
        { partName: "Windshield", defaultX: 50, defaultY: 30 },
        { partName: "Center Headlight", defaultX: 50, defaultY: 55 },
        { partName: "Front Apron Cowl", defaultX: 50, defaultY: 65 },
        { partName: "Single Front Wheel", defaultX: 50, defaultY: 82 }
      ]
    },
    rear: {
      view: "rear",
      label: "Rear View",
      viewBox: "0 0 400 240",
      paths: [
        // Boxy Rear with Canvas Roof
        { type: "rect", x: 100, y: 35, width: 200, height: 145, rx: 8, fill: "#f1f5f9", stroke: "#1e293b", strokeWidth: 2.5 },
        // Canvas Soft Top
        { type: "rect", x: 95, y: 30, width: 210, height: 40, rx: 6, fill: "#334155", stroke: "#0f172a", strokeWidth: 2, partName: "Canvas Canopy" },
        // Rear Engine Cover / Hatch
        { type: "rect", x: 130, y: 110, width: 140, height: 55, rx: 4, fill: "#cbd5e1", stroke: "#64748b", strokeWidth: 1.5, partName: "Rear Engine Hatch" },
        // Tail Lights
        { type: "rect", x: 108, y: 115, width: 16, height: 35, fill: "#f87171", stroke: "#b91c1c", strokeWidth: 1.5, partName: "Left Tail Light" },
        { type: "rect", x: 276, y: 115, width: 16, height: 35, fill: "#f87171", stroke: "#b91c1c", strokeWidth: 1.5, partName: "Right Tail Light" },
        // Two Rear Wheels
        { type: "rect", x: 80, y: 165, width: 26, height: 50, fill: "#0f172a", stroke: "#000", strokeWidth: 2, partName: "Left Rear Wheel" },
        { type: "rect", x: 294, y: 165, width: 26, height: 50, fill: "#0f172a", stroke: "#000", strokeWidth: 2, partName: "Right Rear Wheel" }
      ],
      hotspots: [
        { partName: "Canvas Canopy", defaultX: 50, defaultY: 20 },
        { partName: "Rear Engine Hatch", defaultX: 50, defaultY: 58 },
        { partName: "Left Tail Light", defaultX: 28, defaultY: 55 },
        { partName: "Right Tail Light", defaultX: 72, defaultY: 55 },
        { partName: "Left Rear Wheel", defaultX: 22, defaultY: 80 },
        { partName: "Right Rear Wheel", defaultX: 78, defaultY: 80 }
      ]
    },
    left: {
      view: "left",
      label: "Left Side View",
      viewBox: "0 0 400 240",
      paths: [
        // Side Tuk-Tuk Profile (Tapered front, open passenger entry)
        { type: "path", d: "M 45,155 L 65,115 L 125,65 L 295,65 L 345,125 L 345,165 L 45,165 Z", fill: "#f1f5f9", stroke: "#1e293b", strokeWidth: 2.5, partName: "Body Silhouette" },
        // Canvas Soft Top
        { type: "path", d: "M 115,65 L 305,65 L 315,95 L 135,95 Z", fill: "#334155", stroke: "#0f172a", strokeWidth: 2, partName: "Canvas Canopy Roof" },
        // Passenger Entry Cutout
        { type: "rect", x: 175, y: 95, width: 85, height: 65, fill: "#e2e8f0", stroke: "#64748b", strokeWidth: 1.5, partName: "Passenger Entry" },
        // Single Front Wheel
        { type: "circle", cx: 90, cy: 165, r: 24, fill: "#0f172a", stroke: "#64748b", strokeWidth: 3, partName: "Front Wheel" },
        // Rear Wheel
        { type: "circle", cx: 285, cy: 165, r: 26, fill: "#0f172a", stroke: "#64748b", strokeWidth: 3, partName: "Left Rear Wheel" }
      ],
      hotspots: [
        { partName: "Front Apron", defaultX: 18, defaultY: 55 },
        { partName: "Front Wheel", defaultX: 22, defaultY: 72 },
        { partName: "Windshield", defaultX: 30, defaultY: 35 },
        { partName: "Canvas Canopy", defaultX: 52, defaultY: 28 },
        { partName: "Passenger Entry", defaultX: 55, defaultY: 55 },
        { partName: "Rear Wheel", defaultX: 72, defaultY: 72 },
        { partName: "Rear Engine Cover", defaultX: 85, defaultY: 60 }
      ]
    },
    right: {
      view: "right",
      label: "Right Side View",
      viewBox: "0 0 400 240",
      paths: [
        { type: "path", d: "M 355,155 L 335,115 L 275,65 L 105,65 L 55,125 L 55,165 L 355,165 Z", fill: "#f1f5f9", stroke: "#1e293b", strokeWidth: 2.5, partName: "Body Silhouette" },
        { type: "circle", cx: 310, cy: 165, r: 24, fill: "#0f172a", stroke: "#64748b", strokeWidth: 3, partName: "Front Wheel" },
        { type: "circle", cx: 115, cy: 165, r: 26, fill: "#0f172a", stroke: "#64748b", strokeWidth: 3, partName: "Right Rear Wheel" }
      ],
      hotspots: [
        { partName: "Front Apron", defaultX: 82, defaultY: 55 },
        { partName: "Front Wheel", defaultX: 78, defaultY: 72 },
        { partName: "Passenger Entry", defaultX: 45, defaultY: 55 },
        { partName: "Right Rear Wheel", defaultX: 28, defaultY: 72 }
      ]
    },
    top: {
      view: "top",
      label: "Top View",
      viewBox: "0 0 400 240",
      paths: [
        // Tapered Tuk-Tuk Roof
        { type: "path", d: "M 65,120 L 135,65 L 325,65 L 325,175 L 135,175 Z", fill: "#334155", stroke: "#0f172a", strokeWidth: 2.5, partName: "Canopy Roof" }
      ],
      hotspots: [
        { partName: "Front Wheel / Mudguard", defaultX: 18, defaultY: 50 },
        { partName: "Handlebars", defaultX: 35, defaultY: 50 },
        { partName: "Canopy Roof", defaultX: 60, defaultY: 50 },
        { partName: "Rear Bumper", defaultX: 85, defaultY: 50 }
      ]
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. FALLBACK / GENERIC SPECIFICATION
// ─────────────────────────────────────────────────────────────────────────────
const FALLBACK_SPEC: CategoryDiagramSpec = {
  ...CAR_SPEC,
  category: "Generic",
  displayName: "Standard Vehicle Diagram",
  isFallback: true
};

/**
 * Registry of all category diagram specifications
 */
export const VEHICLE_DIAGRAMS: Record<string, CategoryDiagramSpec> = {
  Car: CAR_SPEC,
  SUV: { ...CAR_SPEC, category: "SUV", displayName: "SUV / Cab / Double Cab" },
  Van: { ...CAR_SPEC, category: "Van", displayName: "Passenger / Panel Van" },
  Bus: BUS_SPEC,
  Motorcycle: MOTORCYCLE_SPEC,
  Lorry: LORRY_SPEC,
  Tractor: TRACTOR_SPEC,
  "Three-Wheeler": THREE_WHEELER_SPEC,
  Generic: FALLBACK_SPEC
};

/**
 * Normalizes any free-text vehicle category or model string into supported diagram categories
 */
export function normalizeVehicleCategory(rawCategory = ""): {
  category: string;
  isFallback: boolean;
  original: string;
} {
  const c = String(rawCategory || "").trim().toLowerCase();

  if (c.includes("lorry") || c.includes("truck") || c.includes("tipper") || c.includes("trailer") || c.includes("heavy vehicle")) {
    return { category: "Lorry", isFallback: false, original: rawCategory };
  }
  if (c.includes("bus") || c.includes("coach")) {
    return { category: "Bus", isFallback: false, original: rawCategory };
  }
  if (c.includes("motorcycle") || c.includes("motorbike") || c.includes("bike") || c.includes("scooter") || c.includes("moped")) {
    return { category: "Motorcycle", isFallback: false, original: rawCategory };
  }
  if (c.includes("three") || c.includes("tuk") || c.includes("auto") || c.includes("trishaw") || c.includes("3 wheel")) {
    return { category: "Three-Wheeler", isFallback: false, original: rawCategory };
  }
  if (c.includes("tractor") || c.includes("harvester") || c.includes("agri")) {
    return { category: "Tractor", isFallback: false, original: rawCategory };
  }
  if (c.includes("van") || c.includes("caravan")) {
    return { category: "Van", isFallback: false, original: rawCategory };
  }
  if (c.includes("suv") || c.includes("cab") || c.includes("double cab") || c.includes("jeep")) {
    return { category: "SUV", isFallback: false, original: rawCategory };
  }
  if (c.includes("car") || c.includes("sedan") || c.includes("hatchback") || c.includes("coupe") || c.includes("wagon")) {
    return { category: "Car", isFallback: false, original: rawCategory };
  }

  // Explicit fallback with notification flag
  return { category: "Generic", isFallback: true, original: rawCategory };
}

/**
 * Resolves the appropriate diagram spec given any raw or normalized category name
 */
export function getDiagramForCategory(categoryName = ""): CategoryDiagramSpec {
  const norm = normalizeVehicleCategory(categoryName);
  return VEHICLE_DIAGRAMS[norm.category] || FALLBACK_SPEC;
}
