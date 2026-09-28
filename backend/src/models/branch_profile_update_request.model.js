import mongoose from "mongoose";

const branchProfileUpdateRequestSchema = new mongoose.Schema({
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: "OfficeStaff", required: true, index: true },
  branchName: { type: String, required: true, index: true }, // e.g. "Galle"
  staffName: { type: String, required: true }, // Name of branch / staff member e.g. "Galle Branch"
  email: { type: String, required: true, index: true },
  mobile: { type: String, default: "" },
  requestType: {
    type: String,
    enum: [
      "Branch Details",
      "Contact & Location",
      "Staff & Operations",
      "Full Profile Update",
      "Password & Security"
    ],
    default: "Branch Details"
  },
  originalData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  requestedChanges: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  reason: { type: String, default: "" }, // Reason or explanation from branch staff
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
    index: true
  },
  reviewNote: { type: String, default: "" },
  reviewedBy: { type: String, default: "" },
  reviewedAt: { type: Date },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
});

const BranchProfileUpdateRequest = mongoose.model(
  "BranchProfileUpdateRequest",
  branchProfileUpdateRequestSchema
);

export default BranchProfileUpdateRequest;
