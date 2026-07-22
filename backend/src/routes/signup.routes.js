import express from "express";
import crypto from "crypto";
import User from "../models/user.model.js";
import Agent from "../models/agent.model.js";
import OfficeStaff from "../models/office_staff.model.js";
import Admin from "../models/admin.model.js";
import nodemailer from "nodemailer";
import { Resend } from "resend";
import dotenv from "dotenv";
import { uploadToCloudinary } from "../utils/upload.js";
import { hashPassword } from "../utils/crypto.js";
import { getNearestBranch } from "../utils/branch.js";
import { sendEmail, getBaseTemplate } from "../utils/email.js";
dotenv.config({ override: true });

const router = express.Router();




// ─── CHECK: Email / NIC availability ─────────────────────────────────────────
router.get("/check", async (req, res) => {
  try {
    const { email, nic } = req.query;
    let emailExists = false;
    let nicExists = false;
    if (email) {
      const matchEmail = await User.findOne({ email: email.trim() });
      if (matchEmail) emailExists = true;
    }
    if (nic) {
      const matchNic = await User.findOne({ nic: nic.trim() });
      if (matchNic) nicExists = true;
    }
    res.json({ emailExists, nicExists });
  } catch (err) {
    console.error("Check endpoint error:", err);
    res.status(500).json({ error: "Server error checking details." });
  }
});

// ─── SIGNUP ───────────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { personal, vehicles, documents } = req.body;

    if (!personal || !vehicles || !documents) {
      return res.status(400).json({ error: "Missing required signup sections." });
    }

    const { firstName, lastName, nic, mobile, email, dob, address, province, city, password, bankDetails } = personal;

    if (!firstName || !lastName || !nic || !mobile || !email || !dob || !address || !province || !city || !password) {
      return res.status(400).json({ error: "All personal detail fields are required." });
    }

    if (!bankDetails || !bankDetails.bankName || !bankDetails.branchName || !bankDetails.accountNumber || !bankDetails.accountHolderName) {
      return res.status(400).json({ error: "All bank account detail fields are required." });
    }

    const cleanNic = nic.trim();
    const nicRegex = /^[0-9vVxX]{10,12}$/;
    if (!nicRegex.test(cleanNic)) {
      return res.status(400).json({ error: "Invalid NIC number. Must be between 10 and 12 characters/digits." });
    }

    const cleanMobile = mobile.replace(/[-+()\s]/g, "");
    if (!/^\d{10}$/.test(cleanMobile)) {
      return res.status(400).json({ error: "Mobile number must be exactly 10 digits." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    if (password.length < 6 || password.length > 12) {
      return res.status(400).json({ error: "Password must be between 6 and 12 characters." });
    }
    if (!/[0-9]/.test(password) && !/[^A-Za-z0-9]/.test(password)) {
      return res.status(400).json({ error: "Password must contain at least one number or special character." });
    }

    if (!Array.isArray(vehicles) || vehicles.length === 0) {
      return res.status(400).json({ error: "At least one vehicle registration detail is required." });
    }
    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      if (!v.numberPlate || !v.vehicleType || !v.year || !v.company || !v.model || !v.engineNumber || !v.chassisNumber || !v.policyNumber) {
        return res.status(400).json({ error: `All required fields for Vehicle #${i + 1} must be filled.` });
      }
      const cleanPlate = v.numberPlate.replace(/[\s-]/g, "");
      if (cleanPlate.length < 5 || cleanPlate.length > 10 || !/^[A-Za-z0-9]+$/.test(cleanPlate)) {
        return res.status(400).json({ error: `Vehicle #${i + 1} Number Plate must be an alphanumeric mix between 5 and 10 characters.` });
      }
      if (!/^\d{4}$/.test(v.year)) {
        return res.status(400).json({ error: `Invalid year for Vehicle #${i + 1}. Must be a 4-digit number.` });
      }
      const cleanPolicy = v.policyNumber.replace(/[\s-]/g, "").toUpperCase();
      if (!/^SAN\d{7}$/.test(cleanPolicy)) {
        return res.status(400).json({ error: `Vehicle #${i + 1} Insurance Policy Number must start with 'SAN' followed by exactly 7 digits (e.g., SAN9876543).` });
      }
      v.policyNumber = cleanPolicy;
    }

    const { nicFront, nicBack, vehicleReg, revenueLicense } = documents;
    if (!nicFront || !nicBack || !vehicleReg || !revenueLicense) {
      return res.status(400).json({ error: "All four required verification documents must be uploaded." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanNicCheck = cleanNic.trim().toUpperCase();

    // Check if email or nic already exists in User collection
    const existingUser = await User.findOne({ $or: [{ email: cleanEmail }, { nic: cleanNicCheck }] });
    if (existingUser) {
      return res.status(400).json({ error: "A user with this Email or NIC is already registered." });
    }

    // Check if email or nic already exists in Agent collection
    const existingAgent = await Agent.findOne({ $or: [{ email: cleanEmail }, { nic: cleanNicCheck }] });
    if (existingAgent) {
      return res.status(400).json({ error: "An agent with this Email or NIC is already registered." });
    }

    // Check if email or nic already exists in Admin collection
    const existingAdmin = await Admin.findOne({ $or: [{ email: cleanEmail }, { nic: cleanNicCheck }] });
    if (existingAdmin) {
      return res.status(400).json({ error: "An admin with this Email or NIC is already registered." });
    }

    // Check if email already exists in OfficeStaff collection
    const existingOfficeStaff = await OfficeStaff.findOne({ email: cleanEmail });
    if (existingOfficeStaff) {
      return res.status(400).json({ error: "An office staff account with this Email is already registered." });
    }

    const hashedPassword = hashPassword(password);

    const lastUser = await User.findOne({}, { referenceNumber: 1 }).sort({ createdAt: -1 });
    let nextRefNum = "REF-0001";
    if (lastUser && lastUser.referenceNumber) {
      const match = lastUser.referenceNumber.match(/REF-(\d+)/i);
      if (match) {
        const currentNum = parseInt(match[1], 10);
        nextRefNum = `REF-${String(currentNum + 1).padStart(4, "0")}`;
      }
    }

    // Upload documents to Cloudinary in parallel
    const [uploadedNicFront, uploadedNicBack, uploadedVehicleReg, uploadedRevenueLicense] = await Promise.all([
      uploadToCloudinary(nicFront, "users/documents"),
      uploadToCloudinary(nicBack, "users/documents"),
      uploadToCloudinary(vehicleReg, "users/documents"),
      uploadToCloudinary(revenueLicense, "users/documents")
    ]);

    const newUser = new User({
      firstName,
      lastName,
      nic: cleanNic,
      mobile: cleanMobile,
      email,
      dob,
      address,
      province,
      city,
      password: hashedPassword,
      vehicles,
      documents: {
        nicFront: uploadedNicFront,
        nicBack: uploadedNicBack,
        vehicleReg: uploadedVehicleReg,
        revenueLicense: uploadedRevenueLicense
      },
      bankDetails: {
        bankName: bankDetails.bankName,
        branchName: bankDetails.branchName,
        accountNumber: bankDetails.accountNumber,
        accountHolderName: bankDetails.accountHolderName
      },
      branch: await getNearestBranch(city),
      referenceNumber: nextRefNum,
    });

    await newUser.save();
    res.status(201).json({ message: "Registration successful", referenceNumber: nextRefNum });
  } catch (err) {
    console.error("Signup backend error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// ─── Helper: find user in correct collection ──────────────────────────────────
async function findUserByRole(role, cleanNic, cleanMobile, cleanEmail) {
  if (role === "policy_holder") {
    if (!cleanNic) return { user: null, error: "NIC is required for Policy Holder." };
    const user = await User.findOne({
      nic: { $regex: new RegExp(`^${cleanNic}$`, "i") },
      email: { $regex: new RegExp(`^${cleanEmail}$`, "i") },
    });
    return { user, userName: user?.firstName, error: user ? null : "No registered Policy Holder found with that NIC and Email." };
  }
  if (role === "insurance_agent") {
    if (!cleanNic) return { user: null, error: "NIC is required for Insurance Agent." };
    const user = await Agent.findOne({
      nic: { $regex: new RegExp(`^${cleanNic}$`, "i") },
      email: { $regex: new RegExp(`^${cleanEmail}$`, "i") },
    });
    return { user, userName: user?.name, error: user ? null : "No registered Insurance Agent found with that NIC and Email." };
  }
  if (role === "office_staff") {
    if (!cleanMobile) return { user: null, error: "Mobile number is required for Office Staff." };
    const user = await OfficeStaff.findOne({
      mobile: cleanMobile,
      email: { $regex: new RegExp(`^${cleanEmail}$`, "i") },
    });
    return { user, userName: user?.name, error: user ? null : "No registered Office Staff found with that Mobile and Email." };
  }
  if (role === "admin") {
    if (!cleanMobile) return { user: null, error: "Mobile number is required for Admin." };
    const user = await Admin.findOne({
      mobile: cleanMobile,
      email: { $regex: new RegExp(`^${cleanEmail}$`, "i") },
    });
    return { user, userName: user?.name, error: user ? null : "No registered Admin found with that Mobile and Email." };
  }
  return { user: null, error: "Invalid role specified." };
}

// ─── ROUTE 1: Send 6-digit OTP to user's email ───────────────────────────────
router.post("/reset-password/send-otp", async (req, res) => {
  try {
    const { email, nic, mobile, loginId } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required." });

    const cleanEmail = email.trim().toLowerCase();
    const cleanInput = (loginId || nic || mobile || "").trim();

    if (!cleanInput) {
      return res.status(400).json({ error: "NIC or Mobile number is required." });
    }

    // Look up in parallel across all collections
    const [dbUser, dbAgent, dbStaff, dbAdmin] = await Promise.all([
      User.findOne({ email: { $regex: new RegExp(`^${cleanEmail}$`, "i") } }),
      Agent.findOne({ email: { $regex: new RegExp(`^${cleanEmail}$`, "i") } }),
      OfficeStaff.findOne({ email: { $regex: new RegExp(`^${cleanEmail}$`, "i") } }),
      Admin.findOne({ email: { $regex: new RegExp(`^${cleanEmail}$`, "i") } }),
    ]);

    let user = null;
    let userName = "";

    if (dbUser) {
      if (dbUser.nic === cleanInput) {
        user = dbUser;
        userName = dbUser.firstName;
      } else {
        return res.status(400).json({ error: "Invalid NIC number for this email." });
      }
    } else if (dbAgent) {
      if (dbAgent.nic === cleanInput) {
        user = dbAgent;
        userName = dbAgent.name;
      } else {
        return res.status(400).json({ error: "Invalid NIC number for this email." });
      }
    } else if (dbStaff) {
      const cleanMobile = cleanInput.replace(/[-+()\s]/g, "");
      if (dbStaff.mobile === cleanMobile) {
        const status = dbStaff.resetRequestStatus || "None";
        if (status === "Pending" || status === "None") {
          if (status === "None") {
            dbStaff.resetRequestStatus = "Pending";
            await dbStaff.save();
          }
          return res.json({
            status: "pending_approval",
            message: "Your password reset request has been submitted to the Admin. Please wait for approval."
          });
        } else if (status === "Approved") {
          user = dbStaff;
          userName = dbStaff.name;
        }
      } else {
        return res.status(400).json({ error: "Invalid Mobile number for this email." });
      }
    } else if (dbAdmin) {
      const cleanMobile = cleanInput.replace(/[-+()\s]/g, "");
      if (dbAdmin.mobile === cleanMobile) {
        const status = dbAdmin.resetRequestStatus || "None";
        if (status === "Pending" || status === "None") {
          if (status === "None") {
            dbAdmin.resetRequestStatus = "Pending";
            await dbAdmin.save();
          }
          return res.json({
            status: "pending_approval",
            message: "Your password reset request has been submitted to other Admins. Please wait for approval."
          });
        } else if (status === "Approved") {
          user = dbAdmin;
          userName = dbAdmin.name;
        }
      } else {
        return res.status(400).json({ error: "Invalid Mobile number for this email." });
      }
    }

    if (!user) {
      return res.status(400).json({ error: "No registered account found with that email address." });
    }

    // Rate limiting: 1 OTP per 60 seconds
    if (user.resetOtpRequestedAt) {
      const secs = (Date.now() - new Date(user.resetOtpRequestedAt).getTime()) / 1000;
      if (secs < 60) {
        return res.status(429).json({ error: `Please wait ${Math.ceil(60 - secs)} seconds before requesting another code.` });
      }
    }

    // Generate & store hashed OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetOtp = crypto.createHash("sha256").update(otp).digest("hex");
    user.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    user.resetOtpRequestedAt = new Date();
    user.resetSessionToken = undefined;
    user.resetSessionExpires = undefined;
    await user.save();

    const displayName = userName || "User";
    const htmlBody = getBaseTemplate(
      "Password Reset Verification Code",
      `
      <h2>Password Reset Request</h2>
      <p>Hi <strong>${displayName}</strong>,</p>
      <p>We received a request to reset your password. Use the verification code below to proceed with resetting your password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <div class="otp-code">${otp}</div>
      </div>
      <p style="text-align: center; font-size: 14px; color: #4a5568;">
        This code is valid for <strong>10 minutes</strong>. For security reasons, do not share this code with anyone.
      </p>
      <p style="font-size: 13px; color: #718096; margin-top: 30px; border-top: 1px solid #edf2f7; padding-top: 20px;">
        If you did not request a password reset, you can safely ignore this email.
      </p>
      `
    );
    const textBody = `Your Sanasa Insurance password reset code is: ${otp}\n\nThis code expires in 10 minutes. Do not share it with anyone.`;

    let emailSent = false;
    let emailError = null;
    try {
      const result = await sendEmail(user.email, `${otp} — Your Sanasa Insurance Verification Code`, htmlBody, textBody);
      emailSent = result.sent;
      emailError = result.error || null;
    } catch (sendErr) {
      emailError = sendErr.message;
    }

    res.json({
      message: emailSent ? `Verification code sent to ${user.email}.` : "Dev Mode: OTP generated (email not sent).",
      emailSent,
      emailError,
      devOtp: emailSent ? undefined : otp,
    });
  } catch (err) {
    console.error("Send OTP error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// ─── ROUTE 2: Verify OTP → issue session token ────────────────────────────────
router.post("/reset-password/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and OTP code are required." });

    const cleanEmail = email.trim().toLowerCase();
    const otpHash = crypto.createHash("sha256").update(otp.trim()).digest("hex");

    let user;
    const emailQuery = { email: { $regex: new RegExp(`^${cleanEmail}$`, "i") } };
    user = await User.findOne(emailQuery);
    if (!user) user = await Agent.findOne(emailQuery);
    if (!user) user = await OfficeStaff.findOne(emailQuery);
    if (!user) user = await Admin.findOne(emailQuery);

    if (!user || !user.resetOtp) {
      return res.status(400).json({ error: "No OTP request found. Please request a new code." });
    }
    if (new Date() > user.resetOtpExpires) {
      return res.status(400).json({ error: "This code has expired. Please request a new one." });
    }
    if (user.resetOtp !== otpHash) {
      return res.status(400).json({ error: "Incorrect code. Please check your email and try again." });
    }

    // Issue short-lived session token
    const sessionToken = crypto.randomBytes(32).toString("hex");
    user.resetOtp = undefined;
    user.resetOtpExpires = undefined;
    user.resetOtpRequestedAt = undefined;
    user.resetSessionToken = sessionToken;
    user.resetSessionExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    await user.save();

    res.json({ message: "OTP verified successfully.", sessionToken });
  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// ─── ROUTE 3: Update password using verified session token ────────────────────
router.post("/reset-password/update", async (req, res) => {
  try {
    const { sessionToken, newPassword } = req.body;
    if (!sessionToken || !newPassword) {
      return res.status(400).json({ error: "Session token and new password are required." });
    }

    const tokenQuery = { resetSessionToken: sessionToken, resetSessionExpires: { $gt: new Date() } };
    let user = await User.findOne(tokenQuery);
    if (!user) user = await Agent.findOne(tokenQuery);
    if (!user) user = await OfficeStaff.findOne(tokenQuery);
    if (!user) user = await Admin.findOne(tokenQuery);

    if (!user) {
      return res.status(400).json({ error: "Session expired or invalid. Please start the reset process again." });
    }

    if (newPassword.length < 6 || newPassword.length > 12) {
      return res.status(400).json({ error: "Password must be between 6 and 12 characters." });
    }
    if (!/[0-9]/.test(newPassword) && !/[^A-Za-z0-9]/.test(newPassword)) {
      return res.status(400).json({ error: "Password must contain at least one number or special character." });
    }

    user.password = hashPassword(newPassword);
    if (user.mustChangePassword !== undefined) {
      user.mustChangePassword = false;
    }
    if (user.resetRequestStatus !== undefined) {
      user.resetRequestStatus = "None";
    }
    user.resetSessionToken = undefined;
    user.resetSessionExpires = undefined;
    await user.save();

    res.json({ message: "Password updated successfully. You can now log in." });
  } catch (err) {
    console.error("Update password error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

export default router;
