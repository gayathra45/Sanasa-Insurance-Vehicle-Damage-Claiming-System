import mongoose from "mongoose";

const profileUpdateRequestSchema = new mongoose.Schema({
  userNic: { type: String, required: true, index: true },
  userReferenceNumber: { type: String, default: "" },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  userMobile: { type: String, default: "" },
  branch: { type: String, required: true, index: true },
  requestType: {
    type: String,
    enum: ["Personal & Contact", "KYC Documents", "Personal & Documents"],
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

const ProfileUpdateRequest = mongoose.model("ProfileUpdateRequest", profileUpdateRequestSchema);
export default ProfileUpdateRequest;
