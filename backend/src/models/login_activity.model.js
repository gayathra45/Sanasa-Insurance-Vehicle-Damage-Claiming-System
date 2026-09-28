import mongoose from "mongoose";

const loginActivitySchema = new mongoose.Schema({
  userType: {
    type: String,
    enum: ["PolicyHolder", "OfficeStaff", "Agent", "Admin"],
    required: true,
    index: true
  },
  userId: { type: mongoose.Schema.Types.ObjectId, index: true },
  userName: { type: String, default: "" },
  userEmail: { type: String, required: true, index: true },
  userNic: { type: String, default: "", index: true },
  branch: { type: String, default: "Head Office", index: true },
  action: { type: String, default: "Login" }, // "Login", "Logout", "Failed Login", "Password Changed", "Profile Updated"
  ipAddress: { type: String, default: "127.0.0.1" },
  device: { type: String, default: "Web Browser" },
  browser: { type: String, default: "" },
  os: { type: String, default: "" },
  status: { type: String, enum: ["Success", "Failed", "Warning"], default: "Success" },
  details: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now, index: true }
});

const LoginActivity = mongoose.model("LoginActivity", loginActivitySchema);
export default LoginActivity;
