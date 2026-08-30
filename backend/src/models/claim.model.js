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
        damagePercentage: { type: Number },
        description: { type: String }
      }
    ],
    overallDamagePercentage: { type: Number, default: 0 },
    summary: { type: String, default: "" }
  }
});

const Claim = mongoose.model("Claim", claimSchema);
export default Claim;
