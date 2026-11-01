import mongoose from "mongoose";

const nfcTransferJobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NfcCardOrder",
      required: true,
      index: true
    },
    orderNumber: {
      type: String,
      required: true,
      index: true
    },
    cardId: {
      type: String,
      required: true,
      index: true
    },
    cardUrl: {
      type: String,
      required: true
    },
    policyHolderName: {
      type: String,
      default: ""
    },
    branch: {
      type: String,
      required: true,
      index: true
    },
    staffId: {
      type: String,
      required: true
    },
    staffName: {
      type: String,
      default: ""
    },
    deviceId: {
      type: String,
      default: ""
    },
    status: {
      type: String,
      enum: ["Pending", "Received", "Writing", "Verified", "Completed", "Failed", "Expired", "Cancelled"],
      default: "Pending",
      index: true
    },
    tagUid: {
      type: String,
      default: ""
    },
    tagTech: {
      type: String,
      default: ""
    },
    readBackVerified: {
      type: Boolean,
      default: false
    },
    readBackUrl: {
      type: String,
      default: ""
    },
    errorMessage: {
      type: String,
      default: ""
    },
    completedAt: {
      type: Date,
      default: null
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // Auto-expire unhandled jobs after TTL
    }
  },
  { timestamps: true }
);

nfcTransferJobSchema.index({ branch: 1, status: 1 });
nfcTransferJobSchema.index({ cardId: 1, orderId: 1 });

const NfcTransferJob = mongoose.model("NfcTransferJob", nfcTransferJobSchema);

export default NfcTransferJob;
