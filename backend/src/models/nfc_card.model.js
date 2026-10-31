import mongoose from "mongoose";

const nfcCardSchema = new mongoose.Schema(
  {
    cardId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    cardUid: {
      type: String,
      default: "",
      trim: true
    },
    policyHolderNic: {
      type: String,
      required: true,
      index: true
    },
    policyHolderName: {
      type: String,
      required: true
    },
    policyHolderPhone: {
      type: String,
      default: ""
    },
    branch: {
      type: String,
      required: true,
      index: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NfcCardOrder",
      default: null,
      index: true
    },
    status: {
      type: String,
      enum: [
        "Available",
        "Scheduled",
        "Active",
        "Temporarily Blocked",
        "Expired",
        "Revoked",
        "Disabled"
      ],
      default: "Available",
      index: true
    },
    currentAssignment: {
      assignmentId: { type: String, default: "", index: true },
      driverName: { type: String, default: "" },
      driverPhone: { type: String, default: "" },
      driverNic: { type: String, default: "" },
      driverAddress: { type: String, default: "" },
      driverPhoto: { type: String, default: "" },
      vehiclePlate: { type: String, default: "" },
      vehicleType: { type: String, default: "" },
      vehicleModel: { type: String, default: "" },
      startDate: { type: Date, default: null },
      endDate: { type: Date, default: null },
      durationType: {
        type: String,
        enum: ["1 Day", "2 Days", "7 Days", "10 Days", "Custom", ""],
        default: ""
      },
      reason: { type: String, default: "" },
      status: {
        type: String,
        enum: ["None", "Scheduled", "Active", "Temporarily Blocked", "Expired", "Terminated"],
        default: "None"
      },
      isBlocked: { type: Boolean, default: false },
      blockedAt: { type: Date, default: null },
      blockedReason: { type: String, default: "" },
      tokenHash: { type: String, default: "", index: true },
      rawToken: { type: String, default: "" },
      accessUrl: { type: String, default: "" },
      assignedAt: { type: Date, default: null },
      assignedBy: { type: String, default: "" }
    },
    assignmentHistory: [
      {
        assignmentId: { type: String, required: true },
        driverName: { type: String, required: true },
        driverPhone: { type: String, default: "" },
        driverNic: { type: String, default: "" },
        driverAddress: { type: String, default: "" },
        driverPhoto: { type: String, default: "" },
        vehiclePlate: { type: String, required: true },
        vehicleType: { type: String, default: "" },
        vehicleModel: { type: String, default: "" },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        durationType: { type: String, default: "" },
        reason: { type: String, default: "" },
        status: { type: String, default: "Expired" },
        assignedAt: { type: Date, default: Date.now },
        endedAt: { type: Date, default: Date.now },
        endReason: { type: String, default: "Expired" },
        assignedBy: { type: String, default: "" },
        events: [
          {
            eventType: { type: String, required: true }, // "Assigned", "Blocked", "Unblocked", "Terminated", "Expired"
            timestamp: { type: Date, default: Date.now },
            performedBy: { type: String, default: "" },
            note: { type: String, default: "" }
          }
        ]
      }
    ],
    lastActivity: {
      type: Date,
      default: null
    },
    accessLogs: [
      {
        accessedAt: { type: Date, default: Date.now },
        ipAddress: { type: String, default: "" },
        userAgent: { type: String, default: "" },
        assignmentId: { type: String, default: "" }
      }
    ],
    notes: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

nfcCardSchema.index({ policyHolderNic: 1, status: 1 });
nfcCardSchema.index({ "currentAssignment.tokenHash": 1 });
nfcCardSchema.index({ "currentAssignment.assignmentId": 1 });

const NfcCard = mongoose.model("NfcCard", nfcCardSchema);

export default NfcCard;
