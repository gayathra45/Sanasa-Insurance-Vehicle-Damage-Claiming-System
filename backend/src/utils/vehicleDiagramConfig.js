/**
 * Vehicle Category to Diagram Mapping & Configurable Checklist Specs
 * Supports: Car, Bus, Motorcycle / Bike, Lorry / Truck, Tractor, Van, Three-Wheeler, and Fallback.
 */

export const VEHICLE_CATEGORIES = {
  CAR: "Car",
  SUV: "SUV",
  VAN: "Van",
  BUS: "Bus",
  MOTORCYCLE: "Motorcycle",
  LORRY: "Lorry",
  TRACTOR: "Tractor",
  THREE_WHEELER: "Three-Wheeler",
  FALLBACK: "Generic"
};

/**
 * Normalizes any freeform vehicleType string from registration/claim into a standardized diagram category
 */
export function normalizeVehicleCategory(rawType = "") {
  if (!rawType || typeof rawType !== "string") {
    return { category: VEHICLE_CATEGORIES.CAR, isSupported: false, rawType: "Unknown" };
  }

  const s = rawType.trim().toLowerCase();

  if (s.includes("three") || s.includes("tuk") || s.includes("rickshaw") || s.includes("trishaw") || s.includes("3 wheeler") || s.includes("3-wheeler")) {
    return { category: VEHICLE_CATEGORIES.THREE_WHEELER, isSupported: true, rawType };
  }
  if (s.includes("motor") || s.includes("bike") || s.includes("scooter")) {
    return { category: VEHICLE_CATEGORIES.MOTORCYCLE, isSupported: true, rawType };
  }
  if (s.includes("bus") || s.includes("coach")) {
    return { category: VEHICLE_CATEGORIES.BUS, isSupported: true, rawType };
  }
  if (s.includes("lorry") || s.includes("truck") || s.includes("tipper") || s.includes("commercial")) {
    return { category: VEHICLE_CATEGORIES.LORRY, isSupported: true, rawType };
  }
  if (s.includes("tractor") || s.includes("farm") || s.includes("agri")) {
    return { category: VEHICLE_CATEGORIES.TRACTOR, isSupported: true, rawType };
  }
  if (s.includes("van") || s.includes("caravan")) {
    return { category: VEHICLE_CATEGORIES.VAN, isSupported: true, rawType };
  }
  if (s.includes("suv") || s.includes("cab") || s.includes("double cab") || s.includes("jeep") || s.includes("pickup") || s.includes("4x4")) {
    return { category: VEHICLE_CATEGORIES.SUV, isSupported: true, rawType };
  }
  if (s.includes("car") || s.includes("sedan") || s.includes("hatchback") || s.includes("saloon")) {
    return { category: VEHICLE_CATEGORIES.CAR, isSupported: true, rawType };
  }

  // Fallback for custom or unknown categories
  return { category: VEHICLE_CATEGORIES.FALLBACK, isSupported: false, rawType };
}

/**
 * Category-specific inspection checklists
 */
export const CATEGORY_CHECKLISTS = {
  [VEHICLE_CATEGORIES.CAR]: [
    "Front Bumper",
    "Rear Bumper",
    "Bonnet / Hood",
    "Roof Panel",
    "Front Windscreen",
    "Rear Windscreen",
    "Left Front Door & Glass",
    "Left Rear Door & Glass",
    "Right Front Door & Glass",
    "Right Rear Door & Glass",
    "Headlights & Indicators",
    "Tail Lights & Reverse Lights",
    "Side Mirrors",
    "Wheels & Tyres (Left Side)",
    "Wheels & Tyres (Right Side)",
    "Engine Bay Components",
    "Suspension & Underbody Frame"
  ],
  [VEHICLE_CATEGORIES.SUV]: [
    "Front Bumper & Bullbar",
    "Rear Bumper & Tow Hitch",
    "Bonnet / Hood",
    "Roof Rack & Roof Rails",
    "Front Windscreen",
    "Rear Windscreen & Spare Mount",
    "Left Side Doors & Steps",
    "Right Side Doors & Steps",
    "Headlights & Fog Lamps",
    "Tail Lights & High Brake Lamp",
    "Power Mirrors",
    "Off-Road Wheels & Tyres",
    "Engine & 4WD Transmission Guard",
    "Chassis & Underbody Suspension"
  ],
  [VEHICLE_CATEGORIES.VAN]: [
    "Front Bumper & Grille",
    "Rear Bumper & Step",
    "Front Windscreen",
    "Sliding Passenger Door & Rail",
    "Driver & Front Passenger Doors",
    "Rear Tailgate / Barn Doors",
    "Side Windows & Tinting",
    "Roof Panel & Headliner",
    "Headlights & Side Markers",
    "Tail Lights",
    "Side Mirrors",
    "Commercial Tyres & Rims",
    "Cargo Bay Interior / Seats"
  ],
  [VEHICLE_CATEGORIES.BUS]: [
    "Front Bumper & Tow Hook",
    "Destination Board & Upper Header",
    "Large Panoramic Windshield",
    "Pneumatic Passenger Entry Door",
    "Emergency Exit Door (Rear/Side)",
    "Left Side Body Panels & Windows",
    "Right Side Body Panels & Windows",
    "Rear Engine Access Cover",
    "High-Mount Signal Lights",
    "Headlamp Cluster",
    "Dual Rear Wheels & Heavy Tyres",
    "Front Steer Axle & Tyres",
    "Air Suspension & Chassis Frame"
  ],
  [VEHICLE_CATEGORIES.LORRY]: [
    "Heavy Steel Front Bumper",
    "Cabin Front Grille & Panel",
    "Cabin Windshield & Wipers",
    "Driver Cabin (Left & Right Doors)",
    "Cargo Bed / Box / Container Body",
    "Rear Loading Tailgate / Underrun Bar",
    "Side Protection Underrun Guards",
    "Fuel Tank & Mounting Brackets",
    "Cabin Mirrors & Blind-Spot Mirrors",
    "Headlights & Cab Clearance Lights",
    "Rear Brake & Reversing Lights",
    "Dual Rear Drive Axle Tyres",
    "Heavy Chassis Rails & Leaf Springs"
  ],
  [VEHICLE_CATEGORIES.TRACTOR]: [
    "Front Counterweight / Bumper",
    "Engine Bonnet / Cowling",
    "Radiator Grille & Screen",
    "Exhaust Stack & Air Cleaner",
    "Steering Wheel & Controls",
    "Driver Seat & ROPS Safety Bar",
    "Rear Three-Point Hitch / PTO",
    "Small Front Steering Tyres",
    "Large Rear Agricultural Lug Tyres",
    "Rear Mudguards & Work Lights",
    "Front Headlights",
    "Hydraulic Lift Rams & Couplers"
  ],
  [VEHICLE_CATEGORIES.THREE_WHEELER]: [
    "Front Cowl & Headlight",
    "Front Windshield & Single Wiper",
    "Front Wheel, Fork & Mudguard",
    "Steering Handlebar & Controls",
    "Canvas Canopy / Soft Top Roof",
    "Left Passenger Entry & Apron",
    "Right Passenger Entry & Apron",
    "Rear Engine Cover & Latch",
    "Rear Tail Lights & Plate Mount",
    "Left & Right Rear Wheels / Tyres",
    "Driver Seat & Passenger Bench"
  ],
  [VEHICLE_CATEGORIES.MOTORCYCLE]: [
    "Front Wheel & Rim",
    "Front Mudguard & Telescopic Fork",
    "Headlight & Front Fairing / Visor",
    "Handlebars, Grips & Mirrors",
    "Front Brake Master Cylinder & Lever",
    "Fuel Tank & Tank Shrouds",
    "Engine Casing & Crash Guards",
    "Rider & Pillion Seat",
    "Exhaust Silencer & Heat Shield",
    "Rear Wheel & Drive Chain / Sprocket",
    "Rear Mudguard & Tail Light Assembly",
    "Rear Suspension Monoshock / Twin Shocks"
  ],
  [VEHICLE_CATEGORIES.FALLBACK]: [
    "Front End Assembly",
    "Rear End Assembly",
    "Left Side Bodywork",
    "Right Side Bodywork",
    "Roof / Upper Structure",
    "Windscreen & Glass",
    "Wheels & Tyres",
    "Lighting & Electrical",
    "Chassis & Structural Frame"
  ]
};

/**
 * Standard damage types and severity definitions
 */
export const DAMAGE_TYPES = [
  { id: "Scratch", label: "Scratch", icon: "pencil-outline" },
  { id: "Dent", label: "Dent", icon: "car-door" },
  { id: "Paint damage", label: "Paint Damage", icon: "spray" },
  { id: "Cracked component", label: "Cracked Component", icon: "hammer" },
  { id: "Broken component", label: "Broken Component", icon: "alert-octagon" },
  { id: "Missing component", label: "Missing Component", icon: "close-circle" },
  { id: "Glass damage", label: "Glass Damage", icon: "window-close" },
  { id: "Rust or corrosion", label: "Rust / Corrosion", icon: "texture-box" },
  { id: "Previous damage", label: "Previous Damage", icon: "history" },
  { id: "No visible damage", label: "No Visible Damage", icon: "check-circle" },
  { id: "Other", label: "Other", icon: "dots-horizontal-circle" }
];

export const DAMAGE_SEVERITIES = [
  { id: "Minor", label: "Minor", color: "#f59e0b", bg: "#fef3c7", border: "#fcd34d" },
  { id: "Moderate", label: "Moderate", color: "#ea580c", bg: "#ffedd5", border: "#fdba74" },
  { id: "Severe", label: "Severe", color: "#ef4444", bg: "#fee2e2", border: "#fca5a5" },
  { id: "Critical", label: "Critical", color: "#991b1b", bg: "#fef2f2", border: "#f87171" }
];

/**
 * Returns formatted default checklist items for a given category
 */
export function getInspectionChecklistForCategory(category = "") {
  const norm = normalizeVehicleCategory(category);
  const items = CATEGORY_CHECKLISTS[norm.category] || CATEGORY_CHECKLISTS[VEHICLE_CATEGORIES.FALLBACK];
  return items.map((item) => ({
    item,
    status: "Not inspected",
    notes: ""
  }));
}
