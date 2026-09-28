import mongoose from "mongoose";

const officeStaffSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., "Galle Branch"
  email: { type: String, required: true, unique: true }, // e.g., "galle@gmail.com"
  mobile: { type: String, required: true }, // Phone number, e.g., "0768088176"
  branch: { type: String, required: true }, // Branch Name, e.g., "Galle"
  province: { type: String, required: true }, // Province, e.g., "Southern"
  district: { type: String, required: true }, // District, e.g., "Galle"
  area: { type: String, required: true }, // Area, e.g., "Kaluwella"
  location: { type: String, required: true }, // Location, e.g., "Old Foods Market , Galle"
  staffCount: { type: Number, required: true }, // Staff Count, e.g., 10
  password: { type: String, required: true },
  mustChangePassword: { type: Boolean, default: false },
  resetOtp: { type: String },
  resetOtpExpires: { type: Date },
  resetOtpRequestedAt: { type: Date },
  resetSessionToken: { type: String },
  resetSessionExpires: { type: Date },
  hotline: { type: String, default: "" }, // Branch Hotline / Landline
  managerName: { type: String, default: "" }, // Branch Manager Name
  managerEmail: { type: String, default: "" }, // Branch Manager Email
  managerMobile: { type: String, default: "" }, // Branch Manager Mobile
  operatingHours: { type: String, default: "Mon - Fri: 8:30 AM - 5:00 PM | Sat: 8:30 AM - 1:00 PM" }, // Operating Hours
  profilePhoto: { type: String, default: "" }, // Branch Image / Photo
  notes: { type: String, default: "" }, // Branch description or notes
  resetRequestStatus: { type: String, default: "None" }, // "None", "Pending", "Approved"
  lastLoginAt: { type: Date, default: null },
  lastLoginIp: { type: String, default: "" },
  lastLoginDevice: { type: String, default: "" },
  loginCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const OfficeStaff = mongoose.model("OfficeStaff", officeStaffSchema);
export default OfficeStaff;
