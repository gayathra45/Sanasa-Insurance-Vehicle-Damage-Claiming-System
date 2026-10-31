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
      enum: ["Pending Payment", "Paid", "Approved", "Fulfilled", "Cancelled"],
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
    issuedCards: [
      {
        cardId: { type: String, required: true },
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
