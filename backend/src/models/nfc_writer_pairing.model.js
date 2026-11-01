import mongoose from "mongoose";

const nfcWriterPairingSchema = new mongoose.Schema(
  {
    pairingCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    staffId: {
      type: String,
      required: true,
      index: true
    },
    staffName: {
      type: String,
      default: "Branch Staff"
    },
    staffEmail: {
      type: String,
      default: ""
    },
    branch: {
      type: String,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ["Pending", "Paired", "Expired", "Revoked"],
      default: "Pending",
      index: true
    },
    deviceId: {
      type: String,
      default: ""
    },
    deviceName: {
      type: String,
      default: ""
    },
    pairedAt: {
      type: Date,
      default: null
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // MongoDB TTL index to auto-remove expired pairing sessions
    },
    socketId: {
      type: String,
      default: ""
    },
    lastSeenAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

nfcWriterPairingSchema.index({ branch: 1, status: 1 });
nfcWriterPairingSchema.index({ staffId: 1, status: 1 });

const NfcWriterPairing = mongoose.model("NfcWriterPairing", nfcWriterPairingSchema);

export default NfcWriterPairing;
