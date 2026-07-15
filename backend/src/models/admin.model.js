import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobile: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  nic: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  status: { type: String, default: "Pending", enum: ["Pending", "Approved", "Rejected"] },
  mustChangePassword: { type: Boolean, default: false },
  registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  resetRequestStatus: { type: String, default: "None", enum: ["None", "Pending", "Approved"] },
  resetOtp: { type: String },
  resetOtpExpires: { type: Date },
  resetOtpRequestedAt: { type: Date },
  resetSessionToken: { type: String },
  resetSessionExpires: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

const Admin = mongoose.model("Admin", adminSchema);
export default Admin;
