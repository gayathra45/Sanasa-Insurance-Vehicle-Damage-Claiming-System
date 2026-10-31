import mongoose from "mongoose";

const nfcCardOrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
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
      default: ""
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
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 50,
      default: 1
    },
    unitPrice: {
      type: Number,
      required: true,
      default: 500
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 500
    },
    currency: {
      type: String,
      required: true,
      default: "LKR"
    },
    reason: {
      type: String,
      default: "Temporary driver access"
    },
    status: {
      type: String,
      enum: [
        "Request Submitted",
        "Approved",
        "Processing",
        "Ready for Collection",
        "Collected",
        "Rejected",
        "Pending Payment",
        "Paid",
        "Fulfilled",
        "Cancelled"
      ],
      default: "Request Submitted",
      index: true
    },
    rejectionReason: {
      type: String,
      default: ""
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        updatedBy: { type: String, default: "System" },
        note: { type: String, default: "" }
      }
    ],
    branchReview: {
      reviewedByStaffId: { type: String, default: "" },
      reviewedByStaffName: { type: String, default: "" },
      reviewedAt: { type: Date, default: null },
      notes: { type: String, default: "" }
    },
    collectionInfo: {
      collectedAt: { type: Date, default: null },
      collectedBy: { type: String, default: "" },
      notes: { type: String, default: "" }
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
    issuedCards: [
      {
        cardId: { type: String, required: true },
        cardUrl: { type: String, default: "" },
        rawToken: { type: String, default: "" },
        tokenHash: { type: String, default: "" },
        isPrepared: { type: Boolean, default: false },
        preparedAt: { type: Date, default: null },
        status: { type: String, default: "Pending Preparation" },
        issuedAt: { type: Date, default: Date.now }
      }
    ],
    notes: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

nfcCardOrderSchema.index({ policyHolderNic: 1, createdAt: -1 });

const NfcCardOrder = mongoose.model("NfcCardOrder", nfcCardOrderSchema);

export default NfcCardOrder;
