import mongoose from "mongoose";

const claimSchema = new mongoose.Schema({
  claimNumber: { type: String, required: true, unique: true },
  userNic: { type: String, required: true, index: true },
  vehiclePlate: { type: String, required: true, index: true },
  incidentDate: { type: String, required: true },
  incidentTime: { type: String, required: true },
  damageType: { type: String, required: true },
  description: { type: String, required: true },
  otherVehicleDetails: {
    type: [
      {
        vehiclePlate: { type: String, default: "" },
        insuranceCompany: { type: String, default: "" },
        policyNumber: { type: String, default: "" },
        driverName: { type: String, default: "" },
        licensePhotos: { type: [String], default: [] },
        vehiclePhotos: { type: [String], default: [] }
      }
    ],
    default: []
  },
  location: { type: String, required: true },
  accidentPhotos: {
    front: { type: [String], default: [] },
    rear: { type: [String], default: [] },
    side: { type: [String], default: [] }
  },
  drivingLicense: {
    front: { type: [String], default: [] },
    rear: { type: [String], default: [] }
  },
  status: { type: String, default: "Pending" },
  branch: { type: String, default: "Galle", index: true },
  assignedAgent: { type: String, default: "", index: true },
  priority: { type: String, default: "Normal" },
  amount: { type: Number, default: null },
  currentStep: { type: Number, default: 1 },
  documentsRequested: { type: Boolean, default: false },
  requestedDocuments: { type: [String], default: [] },
  documentRequestTo: { type: String, default: "" },
  inspectionReport: { type: String, default: "" },
  inspectionSubmitted: { type: Boolean, default: false },
  paymentReceipt: { type: String, default: "" },
  paymentReceiptFileName: { type: String, default: "" },
  paymentSettledAt: { type: Date, default: null },
  paymentSettledBy: { type: String, default: "" },
  paymentNote: { type: String, default: "" },
  accountHolderName: { type: String, default: "" },
  bankName: { type: String, default: "" },
  bankBranch: { type: String, default: "" },
  bankAccount: { type: String, default: "" },
  rejectionReason: { type: String, default: "" },
  messages: [
    {
      sender: { type: String, default: "Office Staff" },
      message: { type: String, required: true },
      sentAt: { type: Date, default: Date.now },
      recipient: { type: String, default: "Policy Holder" }
    }
  ],
  notes: [
    {
      text: { type: String, required: true },
      addedBy: { type: String, default: "Office Staff" },
      addedAt: { type: Date, default: Date.now }
    }
  ],
  additionalDocuments: {
    type: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: { type: String, default: "Policy Holder" }
      }
    ],
    default: []
  },
  isManuallyUpdated: { type: Boolean, default: false },
  manualUpdateReason: { type: String, default: "" },
  manualUpdateAt: { type: Date, default: null },
  manualUpdateBy: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  aiAnalysis: {
    isAnalyzed: { type: Boolean, default: false },
    damagedItems: [
      {
        item: { type: String },
        damagePercentage: { type: Number, default: 0 },
        description: { type: String, default: "" },
        action: { type: String, default: "Repair" }, // "Repair" | "Replace"
        estimatedPartCost: { type: Number, default: 0 },
        estimatedLaborCost: { type: Number, default: 0 },
        totalItemCost: { type: Number, default: 0 }
      }
    ],
    overallDamagePercentage: { type: Number, default: 0 },
    totalEstimatedPartsCost: { type: Number, default: 0 },
    totalEstimatedLaborCost: { type: Number, default: 0 },
    totalEstimatedCost: { type: Number, default: 0 },
    currency: { type: String, default: "LKR" },
    summary: { type: String, default: "" },
    analyzedAt: { type: Date, default: null }
  },
  garageEstimateComparison: {
    isCompared: { type: Boolean, default: false },
    garageDocumentUrl: { type: String, default: "" },
    garageName: { type: String, default: "" },
    garageEstimatedTotal: { type: Number, default: 0 },
    aiEstimatedTotal: { type: Number, default: 0 },
    costDifference: { type: Number, default: 0 },
    costDifferencePercentage: { type: Number, default: 0 },
    verdict: { type: String, default: "Pending" }, // "Match" | "Discrepancy" | "High Variance" | "Approved" | "Rejected"
    matchConfidenceScore: { type: Number, default: 0 },
    photoVerificationDetails: [
      {
        item: { type: String },
        garageCost: { type: Number, default: 0 },
        aiCost: { type: Number, default: 0 },
        matchesAccidentPhotos: { type: Boolean, default: true },
        confidence: { type: Number, default: 0 },
        notes: { type: String, default: "" }
      }
    ],
    summary: { type: String, default: "" },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: String, default: "" }
  }
});

const Claim = mongoose.model("Claim", claimSchema);
export default Claim;
