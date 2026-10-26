import mongoose from "mongoose";

const installmentItemSchema = new mongoose.Schema({
  installmentNumber: { type: Number, required: true },
  label: { type: String, default: "" }, // e.g. "1st Installment (50%)"
  amount: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ["Pending", "Paid", "Overdue"], default: "Pending" },
  stripePaymentIntentId: { type: String, default: "" },
  stripeSessionId: { type: String, default: "" },
  paidAt: { type: Date },
  receiptUrl: { type: String, default: "" }
});

const policyRenewalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    nic: { type: String, required: true, index: true },
    ownerName: { type: String, required: true },
    contactNumber: { type: String, default: "" },
    branch: { type: String, required: true, index: true },
    vehiclePlate: { type: String, required: true, index: true },
    vehicleModel: { type: String, required: true },
    vehicleType: { type: String, required: true },
    policyNumber: { type: String, required: true },

    currentExpiryDate: { type: Date, required: true },
    newExpiryDate: { type: Date, required: true },

    // Staff cost calculation breakdown
    calculation: {
      marketValuation: { type: Number, default: 0 },
      basicPremiumRate: { type: Number, default: 1.5 }, // %
      basicPremium: { type: Number, required: true },
      noClaimBonusDiscount: { type: Number, default: 0 }, // e.g. 15% discount
      discountAmount: { type: Number, default: 0 },
      netPremium: { type: Number, required: true },
      govtTaxes: { type: Number, default: 0 }, // VAT / levies
      adminFee: { type: Number, default: 1500 },
      totalRenewalAmount: { type: Number, required: true }
    },

    // Allowed installment modes configured by staff
    allowedPaymentModes: [
      {
        planType: { type: String, enum: ["One-Time", "2-Installments", "4-Installments"], required: true },
        installmentsCount: { type: Number, required: true },
        breakdown: [
          {
            installmentNumber: Number,
            label: String,
            amount: Number,
            dueOffsetMonths: Number
          }
        ]
      }
    ],

    // Plan chosen by policy holder
    selectedPlan: {
      type: String,
      enum: ["Unselected", "One-Time", "2-Installments", "4-Installments"],
      default: "Unselected"
    },

    // Active installments scheduled for payment
    installments: [installmentItemSchema],

    status: {
      type: String,
      enum: ["Calculated", "Partially_Paid", "Fully_Paid", "Cancelled"],
      default: "Calculated",
      index: true
    },

    calculatedBy: {
      staffId: { type: String, default: "" },
      staffName: { type: String, default: "" },
      notes: { type: String, default: "" }
    }
  },
  { timestamps: true }
);

const PolicyRenewal = mongoose.model("PolicyRenewal", policyRenewalSchema);
export default PolicyRenewal;
