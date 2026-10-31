import mongoose from "mongoose";

const otpVerificationSchema = new mongoose.Schema(
  {
    policyHolderNic: {
      type: String,
      required: true,
      index: true
    },
    phoneNumber: {
      type: String,
      required: true
    },
    purpose: {
      type: String,
      required: true,
      default: "NFC_CARD_ASSIGNMENT"
    },
    cardId: {
      type: String,
      default: ""
    },
    otpHash: {
      type: String,
      required: true
    },
    attempts: {
      type: Number,
      default: 0
    },
    maxAttempts: {
      type: Number,
      default: 5
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedAt: {
      type: Date,
      default: null
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 600 // Auto-deletes from MongoDB after 10 minutes (600 seconds)
    }
  },
  { timestamps: true }
);

otpVerificationSchema.index({ policyHolderNic: 1, purpose: 1, cardId: 1 });

const OtpVerification = mongoose.model("OtpVerification", otpVerificationSchema);

export default OtpVerification;
