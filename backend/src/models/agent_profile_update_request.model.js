import mongoose from "mongoose";

const agentProfileUpdateRequestSchema = new mongoose.Schema({
  agentId: { type: String, required: true, index: true },
  agentNic: { type: String, required: true, index: true },
  agentName: { type: String, required: true },
  agentEmail: { type: String, required: true, index: true },
  agentPhone: { type: String, default: "" },
  branch: { type: String, required: true, index: true },
  requestType: {
    type: String,
    enum: [
      "Personal & Contact",
      "Bank Details",
      "Personal & Bank Details",
      "KYC Documents",
      "General Profile Update"
    ],
    default: "Personal & Contact"
  },
  originalData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  requestedChanges: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
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

const AgentProfileUpdateRequest = mongoose.model(
  "AgentProfileUpdateRequest",
  agentProfileUpdateRequestSchema
);

export default AgentProfileUpdateRequest;
