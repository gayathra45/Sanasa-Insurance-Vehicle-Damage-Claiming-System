import mongoose from "mongoose";

const photoHashSchema = new mongoose.Schema({
  claimNumber: { type: String, required: true, index: true },
  userNic: { type: String, required: true, index: true },
  vehiclePlate: { type: String, required: true, index: true },
  photoType: { type: String, required: true }, // e.g., "Front Damage", "Rear Damage", "Side Damage", "License Front", "Other Vehicle"
  sha256: { type: String, required: true, index: true },
  fingerprint: { type: String, default: "" },
  photoUrl: { type: String, default: "" },
  incidentDate: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});

const PhotoHash = mongoose.models.PhotoHash || mongoose.model("PhotoHash", photoHashSchema);

export default PhotoHash;
