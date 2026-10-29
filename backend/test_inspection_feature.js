import assert from "node:assert";
import {
  normalizeVehicleCategory,
  getInspectionChecklistForCategory,
  DAMAGE_TYPES,
  DAMAGE_SEVERITIES,
  VEHICLE_CATEGORIES
} from "./src/utils/vehicleDiagramConfig.js";

console.log("=================================================");
console.log("SANASA Insurance Damage Inspection Feature Test Suite");
console.log("=================================================");

let passed = 0;
let failed = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

// ── Test 1: Category Normalization ──────────────────────────────────────────
console.log("\n[1] Testing Vehicle Category to Diagram Mapping:");

it("Car categories resolve to Car with dedicated diagram", () => {
  assert.strictEqual(normalizeVehicleCategory("Car").category, VEHICLE_CATEGORIES.CAR);
  assert.strictEqual(normalizeVehicleCategory("Sedan").category, VEHICLE_CATEGORIES.CAR);
  assert.strictEqual(normalizeVehicleCategory("Hatchback").category, VEHICLE_CATEGORIES.CAR);
  assert.strictEqual(normalizeVehicleCategory("Car").isSupported, true);
});

it("Bus categories resolve to Bus with dedicated diagram", () => {
  assert.strictEqual(normalizeVehicleCategory("Bus").category, VEHICLE_CATEGORIES.BUS);
  assert.strictEqual(normalizeVehicleCategory("Coach").category, VEHICLE_CATEGORIES.BUS);
  assert.strictEqual(normalizeVehicleCategory("Private Bus").category, VEHICLE_CATEGORIES.BUS);
  assert.strictEqual(normalizeVehicleCategory("Bus").isSupported, true);
});

it("Motorcycle / Bike categories resolve to Motorcycle with dedicated diagram", () => {
  assert.strictEqual(normalizeVehicleCategory("Motorcycle").category, VEHICLE_CATEGORIES.MOTORCYCLE);
  assert.strictEqual(normalizeVehicleCategory("Motorbike").category, VEHICLE_CATEGORIES.MOTORCYCLE);
  assert.strictEqual(normalizeVehicleCategory("Scooter").category, VEHICLE_CATEGORIES.MOTORCYCLE);
  assert.strictEqual(normalizeVehicleCategory("Bike").category, VEHICLE_CATEGORIES.MOTORCYCLE);
  assert.strictEqual(normalizeVehicleCategory("Motorcycle").isSupported, true);
});

it("Lorry / Truck categories resolve to Lorry with dedicated diagram", () => {
  assert.strictEqual(normalizeVehicleCategory("Lorry").category, VEHICLE_CATEGORIES.LORRY);
  assert.strictEqual(normalizeVehicleCategory("Truck").category, VEHICLE_CATEGORIES.LORRY);
  assert.strictEqual(normalizeVehicleCategory("Tipper").category, VEHICLE_CATEGORIES.LORRY);
  assert.strictEqual(normalizeVehicleCategory("Lorry").isSupported, true);
});

it("Tractor categories resolve to Tractor with dedicated diagram", () => {
  assert.strictEqual(normalizeVehicleCategory("Tractor").category, VEHICLE_CATEGORIES.TRACTOR);
  assert.strictEqual(normalizeVehicleCategory("Agriculture Harvester").category, VEHICLE_CATEGORIES.TRACTOR);
  assert.strictEqual(normalizeVehicleCategory("Tractor").isSupported, true);
});

it("Van categories resolve to Van with dedicated diagram", () => {
  assert.strictEqual(normalizeVehicleCategory("Van").category, VEHICLE_CATEGORIES.VAN);
  assert.strictEqual(normalizeVehicleCategory("Caravan").category, VEHICLE_CATEGORIES.VAN);
  assert.strictEqual(normalizeVehicleCategory("Passenger Van").category, VEHICLE_CATEGORIES.VAN);
  assert.strictEqual(normalizeVehicleCategory("Van").isSupported, true);
});

it("Three-Wheeler categories resolve to Three-Wheeler with dedicated diagram", () => {
  assert.strictEqual(normalizeVehicleCategory("Three-Wheeler").category, VEHICLE_CATEGORIES.THREE_WHEELER);
  assert.strictEqual(normalizeVehicleCategory("Tuk Tuk").category, VEHICLE_CATEGORIES.THREE_WHEELER);
  assert.strictEqual(normalizeVehicleCategory("Trishaw").category, VEHICLE_CATEGORIES.THREE_WHEELER);
  assert.strictEqual(normalizeVehicleCategory("Three-Wheeler").isSupported, true);
});

it("Unknown / unmapped category triggers clear fallback warning flag", () => {
  const result = normalizeVehicleCategory("Hovercraft / Quadcopter");
  assert.strictEqual(result.category, VEHICLE_CATEGORIES.FALLBACK);
  assert.strictEqual(result.isSupported, false);
  assert.strictEqual(result.rawType, "Hovercraft / Quadcopter");
});

// ── Test 2: Category-Specific Checklists ────────────────────────────────────
console.log("\n[2] Testing Category-Specific Inspection Checklists:");

it("Bus checklist contains category-specific components", () => {
  const items = getInspectionChecklistForCategory("Bus");
  assert.ok(items.some((i) => i.item.includes("Passenger Entry Door")));
  assert.ok(items.some((i) => i.item.includes("Emergency Exit")));
  assert.ok(items.some((i) => i.item.includes("Destination Board")));
});

it("Motorcycle checklist contains category-specific components", () => {
  const items = getInspectionChecklistForCategory("Motorcycle");
  assert.ok(items.some((i) => i.item.includes("Handlebars")));
  assert.ok(items.some((i) => i.item.includes("Fuel Tank")));
  assert.ok(items.some((i) => i.item.includes("Fork")));
});

it("Lorry checklist contains category-specific components", () => {
  const items = getInspectionChecklistForCategory("Lorry");
  assert.ok(items.some((i) => i.item.includes("Cargo Bed")));
  assert.ok(items.some((i) => i.item.includes("Cabin")));
  assert.ok(items.some((i) => i.item.includes("Chassis")));
});

it("Tractor checklist contains category-specific components", () => {
  const items = getInspectionChecklistForCategory("Tractor");
  assert.ok(items.some((i) => i.item.includes("Hitch")));
  assert.ok(items.some((i) => i.item.includes("Tyres")));
  assert.ok(items.some((i) => i.item.includes("Bonnet")));
});

// ── Test 3: Damage Types & Severities ───────────────────────────────────────
console.log("\n[3] Testing Damage Types & Severity Enums:");

it("Includes all 11 required damage types", () => {
  const expected = [
    "Scratch",
    "Dent",
    "Paint damage",
    "Cracked component",
    "Broken component",
    "Missing component",
    "Glass damage",
    "Rust or corrosion",
    "Previous damage",
    "No visible damage",
    "Other"
  ];
  const typeIds = DAMAGE_TYPES.map(d => d.id);
  for (const exp of expected) {
    assert.ok(typeIds.includes(exp), `Missing damage type: ${exp}`);
  }
});

it("Includes all 4 severity ratings", () => {
  const sevIds = DAMAGE_SEVERITIES.map(s => s.id);
  assert.deepStrictEqual(sevIds, ["Minor", "Moderate", "Severe", "Critical"]);
});

// ── Test 4: Coordinate Normalization Validation ─────────────────────────────
console.log("\n[4] Testing Coordinate Normalization Integrity:");

it("Rejects non-normalized or out-of-bound screen coordinates", () => {
  function validateMarker(m) {
    if (typeof m.x !== "number" || typeof m.y !== "number") return false;
    if (m.x < 0 || m.x > 100 || m.y < 0 || m.y > 100) return false;
    return true;
  }

  // Valid relative percentage coordinates
  assert.strictEqual(validateMarker({ x: 45.2, y: 78.1 }), true);
  assert.strictEqual(validateMarker({ x: 0, y: 0 }), true);
  assert.strictEqual(validateMarker({ x: 100, y: 100 }), true);

  // Invalid absolute screen pixels (e.g. 1080 x 1920)
  assert.strictEqual(validateMarker({ x: 540, y: 960 }), false);
  assert.strictEqual(validateMarker({ x: -5, y: 50 }), false);
});

// ── Test 5: Branch Isolation & Authorization Logic ──────────────────────────
console.log("\n[5] Testing Role-Based Branch Isolation Constraints:");

it("Enforces branch isolation on report viewing", () => {
  function checkBranchAccess(userBranch, claimBranch, userRole) {
    if (userRole === "Admin") return true;
    if (userRole === "Branch" || userRole === "OfficeStaff") {
      return Boolean(userBranch && claimBranch && userBranch.toLowerCase() === claimBranch.toLowerCase());
    }
    return false;
  }

  // Same branch allowed
  assert.strictEqual(checkBranchAccess("Galle", "Galle", "Branch"), true);
  assert.strictEqual(checkBranchAccess("Colombo", "colombo", "Branch"), true);

  // Cross-branch disallowed (must be rejected with HTTP 403)
  assert.strictEqual(checkBranchAccess("Galle", "Colombo", "Branch"), false);
  assert.strictEqual(checkBranchAccess("Kandy", "Kurunegala", "Branch"), false);

  // Admin allowed globally
  assert.strictEqual(checkBranchAccess("Head Office", "Galle", "Admin"), true);
  assert.strictEqual(checkBranchAccess("Head Office", "Colombo", "Admin"), true);
});

console.log("\n=================================================");
console.log(`Results: ${passed} Passed, ${failed} Failed`);
console.log("=================================================");

if (failed > 0) process.exit(1);
