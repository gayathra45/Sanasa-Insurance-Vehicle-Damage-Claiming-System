import mongoose from "mongoose";

const damagePhotoSchema = new mongoose.Schema({
  url: { type: String, required: true },
  caption: { type: String, default: "" },
  uploadedAt: { type: Date, default: Date.now }
});

const damageMarkerSchema = new mongoose.Schema({
  id: { type: String, required: true },
  view: {
    type: String,
    enum: ["front", "rear", "left", "right", "top"],
    required: true,
    default: "front"
  },
  x: { type: Number, required: true, min: 0, max: 100 }, // Relative normalized percentage (0.0 - 100.0)
  y: { type: Number, required: true, min: 0, max: 100 }, // Relative normalized percentage (0.0 - 100.0)
  partName: { type: String, required: true, trim: true },
  damageType: {
    type: String,
    enum: [
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
    ],
    default: "Dent"
  },
  severity: {
    type: String,
    enum: ["Minor", "Moderate", "Severe", "Critical"],
    default: "Moderate"
  },
  isPreExisting: { type: Boolean, default: false },
  description: { type: String, default: "", trim: true },
  estimatedRepairCost: { type: Number, default: 0, min: 0 },
  photos: { type: [damagePhotoSchema], default: [] },
  timestamp: { type: Date, default: Date.now }
});

const checklistItemSchema = new mongoose.Schema({
  item: { type: String, required: true },
  status: {
    type: String,
    enum: ["Good", "Damaged", "Not Inspected", "Not Applicable"],
    default: "Not Inspected"
  },
  notes: { type: String, default: "" },
  markerId: { type: String, default: "" }
});

const auditEntrySchema = new mongoose.Schema({
  action: { type: String, required: true },
  performedBy: { type: String, required: true },
  role: { type: String, default: "Agent" },
  timestamp: { type: Date, default: Date.now },
  details: { type: String, default: "" }
});

const inspectionReportSchema = new mongoose.Schema(
  {
    claimId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Claim",
      required: true,
      index: true
    },
    claimNumber: {
      type: String,
      required: true,
      index: true,
      uppercase: true,
      trim: true
    },
    vehiclePlate: {
      type: String,
      required: true,
      index: true,
      uppercase: true,
      trim: true
    },
    vehicleCategory: {
      type: String,
      required: true,
      default: "Car"
    },
    vehicleDetails: {
      company: { type: String, default: "" },
      model: { type: String, default: "" },
      year: { type: String, default: "" },
      policyNumber: { type: String, default: "" },
      engineNumber: { type: String, default: "" },
      chassisNumber: { type: String, default: "" }
    },
    policyholderNic: {
      type: String,
      default: "",
      trim: true
    },
    policyholderName: {
      type: String,
      default: ""
    },
    assignedAgent: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
      trim: true
    },
    agentName: {
      type: String,
      default: ""
    },
    branch: {
      type: String,
      required: true,
      index: true,
      default: "Galle"
    },
    status: {
      type: String,
      enum: ["Draft", "Submitted", "Approved", "Amended"],
      default: "Draft",
      index: true
    },
    damageMarkers: {
      type: [damageMarkerSchema],
      default: []
    },
    checklist: {
      type: [checklistItemSchema],
      default: []
    },
    vehicleCondition: {
      odometer: { type: String, default: "" },
      fuelLevel: { type: String, default: "1/2" },
      recommendedAction: { type: String, default: "Repairable (Minor)" },
      preExistingDamage: { type: String, default: "" }
    },
    agentNotes: {
      type: String,
      default: ""
    },
    totalEstimatedCost: {
      type: Number,
      default: 0,
      min: 0
    },
    auditTrail: {
      type: [auditEntrySchema],
      default: []
    },
    submittedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// Compound index for fast lookup of a claim's inspection report
inspectionReportSchema.index({ claimNumber: 1, status: 1 });
inspectionReportSchema.index({ branch: 1, status: 1 });

const InspectionReport = mongoose.model("InspectionReport", inspectionReportSchema);
export default InspectionReport;
