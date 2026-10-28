import mongoose from "mongoose";

const smsLogSchema = new mongoose.Schema(
  {
    claimNumber: {
      type: String,
      default: "",
      index: true
    },
    recipientPhone: {
      type: String,
      required: true,
      index: true
    },
    recipientType: {
      type: String,
      enum: ["PolicyHolder", "Agent", "Staff", "Admin", "General"],
      default: "PolicyHolder"
    },
    recipientName: {
      type: String,
      default: ""
    },
    eventType: {
      type: String,
      required: true,
      index: true
    },
    message: {
      type: String,
      required: true
    },
    smsBatchId: {
      type: String,
      default: "",
      index: true
    },
    deviceId: {
      type: String,
      default: ""
    },
    status: {
      type: String,
      enum: ["pending", "sent", "delivered", "failed", "unknown"],
      default: "pending",
      index: true
    },
    attempts: {
      type: Number,
      default: 1
    },
    maxAttempts: {
      type: Number,
      default: 3
    },
    lastAttemptAt: {
      type: Date,
      default: Date.now
    },
    deliveredAt: {
      type: Date,
      default: null
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    providerResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    errorMessage: {
      type: String,
      default: ""
    },
    errorCode: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

smsLogSchema.index({ createdAt: -1 });

const SmsLog = mongoose.model("SmsLog", smsLogSchema);
export default SmsLog;
