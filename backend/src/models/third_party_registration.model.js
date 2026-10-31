import mongoose from "mongoose";

const thirdPartyRegistrationSchema = new mongoose.Schema(
  {
    requestReference: {
      type: String,
      required: true,
      unique: true,
      index: true
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
    policyHolderEmail: {
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
    driverDetails: {
      fullName: {
        type: String,
        required: true,
        trim: true
      },
      residentialAddress: {
        type: String,
        required: true,
        trim: true
      },
      phoneNumber: {
        type: String,
        required: true,
        trim: true
      },
      nicNumber: {
        type: String,
        default: "",
        trim: true
      },
      documents: {
        nicFront: { type: String, required: true },
        nicBack: { type: String, required: true },
        drivingLicenceFront: { type: String, required: true },
        drivingLicenceBack: { type: String, required: true }
      }
    },
    selectedVehicles: [
      {
        numberPlate: { type: String, required: true },
        vehicleType: { type: String, default: "" },
        model: { type: String, default: "" },
        company: { type: String, default: "" },
        year: { type: String, default: "" },
        policyNumber: { type: String, default: "" }
      }
    ],
    fee: {
      type: Number,
      required: true,
      default: 300
    },
    currency: {
      type: String,
      required: true,
      default: "LKR"
    },
    status: {
      type: String,
      enum: [
        "Pending Payment",
        "Payment Failed",
        "Pending Branch Approval",
        "Approved",
        "Rejected",
        "Cancelled",
        "Pending Termination Approval",
        "Terminated",
        "Scheduled",
        "Temporarily Blocked",
        "Expired",
        "Revoked"
      ],
      default: "Pending Payment",
      index: true
    },
    payment: {
      status: {
        type: String,
        enum: ["Pending Payment", "Paid", "Failed", "Cancelled"],
        default: "Pending Payment",
        index: true
      },
      stripeSessionId: {
        type: String,
        default: "",
        index: true
      },
      stripePaymentIntentId: {
        type: String,
        default: ""
      },
      paidAt: {
        type: Date,
        default: null
      },
      amountPaid: {
        type: Number,
        default: 0
      },
      currency: {
        type: String,
        default: "LKR"
      }
    },
    branchReview: {
      reviewedBy: { type: String, default: "" },
      reviewedByEmail: { type: String, default: "" },
      reviewedAt: { type: Date, default: null },
      rejectionReason: { type: String, default: "" },
      internalNotes: { type: String, default: "" }
    },
    terminationRequest: {
      requestedBy: { type: String, default: "" },
      requestedAt: { type: Date, default: null },
      reason: { type: String, default: "" },
      status: {
        type: String,
        enum: ["None", "Pending Branch Approval", "Approved", "Rejected"],
        default: "None"
      },
      reviewedBy: { type: String, default: "" },
      reviewedByStaffId: { type: String, default: "" },
      reviewedAt: { type: Date, default: null },
      branchNotes: { type: String, default: "" },
      rejectionReason: { type: String, default: "" }
    },
    secureAccess: {
      tokenHash: { type: String, default: "", index: true },
      rawToken: { type: String, default: "" },
      accessUrl: { type: String, default: "" },
      tokenCreatedAt: { type: Date, default: null },
      tokenExpiresAt: { type: Date, default: null },
      isRevoked: { type: Boolean, default: false },
      revokedAt: { type: Date, default: null },
      revokedBy: { type: String, default: "" }
    },
    accessLogs: [
      {
        accessedAt: { type: Date, default: Date.now },
        ipAddress: { type: String, default: "" },
        userAgent: { type: String, default: "" }
      }
    ],
    accessDuration: {
      durationType: {
        type: String,
        enum: ["1 Month", "3 Months", "6 Months", "12 Months", "Custom", ""],
        default: "12 Months"
      },
      startDate: { type: Date, default: null },
      endDate: { type: Date, default: null },
      isExpired: { type: Boolean, default: false },
      expiredAt: { type: Date, default: null }
    },
    accessControl: {
      isBlocked: { type: Boolean, default: false },
      blockedAt: { type: Date, default: null },
      blockedReason: { type: String, default: "" },
      unblockedAt: { type: Date, default: null },
      terminatedAt: { type: Date, default: null },
      terminatedReason: { type: String, default: "" }
    },
    renewalHistory: [
      {
        renewedAt: { type: Date, default: Date.now },
        renewedBy: { type: String, default: "" },
        previousStartDate: { type: Date, default: null },
        previousEndDate: { type: Date, default: null },
        newStartDate: { type: Date, default: null },
        newEndDate: { type: Date, default: null },
        durationType: { type: String, default: "" },
        note: { type: String, default: "" }
      }
    ],
    statusHistory: [
      {
        status: { type: String, required: true },
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: String, default: "" },
        reason: { type: String, default: "" }
      }
    ],
    idempotencyKey: {
      type: String,
      index: true,
      sparse: true
    }
  },
  { timestamps: true }
);

thirdPartyRegistrationSchema.index({ branch: 1, status: 1 });
thirdPartyRegistrationSchema.index({ policyHolderNic: 1, createdAt: -1 });

const ThirdPartyRegistration = mongoose.model(
  "ThirdPartyRegistration",
  thirdPartyRegistrationSchema
);

export default ThirdPartyRegistration;
