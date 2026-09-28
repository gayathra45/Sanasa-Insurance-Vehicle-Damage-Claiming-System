/**
 * Office Staff Router
 * Handles endpoints for Office Staff login, dashboard statistics calculation,
 * registration verification, and agent management operations.
 */
import express from "express";
import OfficeStaff from "../models/office_staff.model.js";
import User from "../models/user.model.js";
import Claim from "../models/claim.model.js";
import Agent from "../models/agent.model.js";
import Admin from "../models/admin.model.js";
import ProfileUpdateRequest from "../models/profile_update_request.model.js";
import AgentProfileUpdateRequest from "../models/agent_profile_update_request.model.js";
import BranchProfileUpdateRequest from "../models/branch_profile_update_request.model.js";
import { hashPassword } from "../utils/crypto.js";
import { sendEmail, getBaseTemplate, sendProfileUpdateStatusEmail, sendAgentProfileUpdateStatusEmail } from "../utils/email.js";
import { uploadToCloudinary } from "../utils/upload.js";
import { logLoginActivity } from "../utils/activity.js";
import { 
  analyzeAccidentDamage, 
  analyzeAccidentDamageWithCostSheet, 
  compareGarageEstimateWithPhotosAndAI 
} from "../utils/aiAnalyzer.js";

const router = express.Router();

// ==========================================
// --- API: Authentication ---
// ==========================================

// POST login: /api/office-staff/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and Password are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const staff = await OfficeStaff.findOne({ email: cleanEmail });
    if (!staff) {
      return res.status(400).json({ error: "Invalid Email or Password." });
    }

    const hashedInput = hashPassword(password);
    if (staff.password !== hashedInput) {
      return res.status(400).json({ error: "Invalid Email or Password." });
    }

    // Record login activity
    await logLoginActivity({
      req,
      userType: "OfficeStaff",
      userId: staff._id,
      userName: staff.name,
      userEmail: staff.email,
      userNic: staff.mobile,
      branch: staff.branch || "Galle",
      action: "Login",
      status: "Success",
      details: `Branch staff (${staff.branch}) login successful.`
    });

    // Return staff details without password
    const staffObj = staff.toObject();
    delete staffObj.password;

    res.json({ message: "Login successful", staff: staffObj });
  } catch (err) {
    console.error("Office staff login API error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// POST change office staff password: /api/office-staff/change-password
router.post("/change-password", async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ error: "Email, current password, and new password are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const staff = await OfficeStaff.findOne({ email: cleanEmail });
    if (!staff) {
      return res.status(404).json({ error: "Office staff member not found." });
    }

    // Verify current temporary/existing password
    const hashedCurrent = hashPassword(currentPassword);
    if (staff.password !== hashedCurrent) {
      return res.status(400).json({ error: "Incorrect current password." });
    }

    // Update password and clear temporary password flag
    staff.password = hashPassword(newPassword);
    staff.mustChangePassword = false;
    await staff.save();

    res.json({ message: "Password updated successfully." });
  } catch (err) {
    console.error("Change office staff password error:", err);
    res.status(500).json({ error: "An internal server error occurred while updating password." });
  }
});

// GET dashboard statistics: /api/office-staff/dashboard-stats
router.get("/dashboard-stats", async (req, res) => {
  try {
    const branch = req.query.branch ? req.query.branch.trim() : "Galle";

    // 1. Calculate stats counts for the branch
    const unassignedClaims = await Claim.countDocuments({
      branch,
      $or: [
        { assignedAgent: { $exists: false } },
        { assignedAgent: null },
        { assignedAgent: "" }
      ]
    });

    const newRegistrationsCount = await User.countDocuments({
      branch,
      status: { $ne: "Approved" }
    });

    const activeClaims = await Claim.countDocuments({
      branch,
      status: { $in: ["In Progress", "Approved", "Investigating"] }
    });

    const pendingClaims = await Claim.countDocuments({
      branch,
      status: "Pending"
    });

    // 2. Fetch recent new claims for the branch
    const newClaims = await Claim.find({ branch })
      .sort({ createdAt: -1 })
      .limit(20);

    // 3. Fetch recent new registrations for the branch
    const newRegistrations = await User.find({
      branch,
      status: { $ne: "Approved" }
    })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      stats: {
        unassignedClaims,
        newRegistrations: newRegistrationsCount,
        activeClaims,
        pendingClaims
      },
      newClaims,
      newRegistrations
    });
  } catch (err) {
    console.error("Office staff dashboard stats API error:", err);
    res.status(500).json({ error: "Failed to load dashboard metrics." });
  }
});

// GET dashboard statistics (legacy/alternative): /api/office-staff/stats
router.get("/stats", async (req, res) => {
  try {
    const { branch } = req.query;
    if (!branch) {
      return res.status(400).json({ error: "Branch query parameter is required." });
    }

    const cleanBranch = branch.trim();

    // 1. Fetch claims statistics for the branch
    const totalClaims = await Claim.countDocuments({ branch: cleanBranch });
    const pendingClaims = await Claim.countDocuments({ branch: cleanBranch, status: "Pending" });
    const approvedClaims = await Claim.countDocuments({ branch: cleanBranch, status: "Approved" });
    const rejectedClaims = await Claim.countDocuments({ branch: cleanBranch, status: "Rejected" });

    // 2. Fetch policyholders statistics for the branch
    const totalPolicyHolders = await User.countDocuments({ branch: cleanBranch, status: "Approved" });

    // 3. Fetch active agents statistics for the branch
    const activeAgents = await Agent.countDocuments({ branch: cleanBranch, status: "active" });

    // 4. Pending user registrations for the branch
    const pendingRegistrations = await User.countDocuments({ branch: cleanBranch, status: { $ne: "Approved" } });

    // 5. Calculate total approved settlement payout
    const approvedClaimsList = await Claim.find(
      { branch: cleanBranch, status: "Approved", amount: { $ne: null } },
      { amount: 1 }
    );
    const totalPayoutAmount = approvedClaimsList.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    // 6. Monthly trend of claims for the current year
    const currentYear = new Date().getFullYear();
    const monthlyClaimsRaw = await Claim.aggregate([
      {
        $match: {
          branch: cleanBranch,
          createdAt: {
            $gte: new Date(`${currentYear}-01-01`),
            $lte: new Date(`${currentYear}-12-31T23:59:59.999Z`)
          }
        }
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyData = months.map((monthName, index) => {
      const found = monthlyClaimsRaw.find(m => m._id === index + 1);
      return {
        month: monthName,
        claims: found ? found.count : 0
      };
    });

    // 7. Recent 5 claims for the dashboard table
    const recentClaims = await Claim.find({ branch: cleanBranch })
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      summary: {
        totalClaims,
        pendingClaims,
        approvedClaims,
        rejectedClaims,
        totalPolicyHolders,
        activeAgents,
        pendingRegistrations,
        totalPayoutAmount
      },
      monthlyTrend: monthlyData,
      recentClaims
    });
  } catch (err) {
    console.error("Office staff dashboard stats API error:", err);
    res.status(500).json({ error: "An internal server error occurred fetching dashboard statistics." });
  }
});

// GET all claims for a specific branch: /api/office-staff/claims
router.get("/claims", async (req, res) => {
  try {
    const { branch } = req.query;
    if (!branch) {
      return res.status(400).json({ error: "Branch query parameter is required." });
    }
    const claims = await Claim.find({ branch: branch.trim() }).sort({ createdAt: -1 }).lean();

    // Attach policy holder user profile info & bank details
    const nics = claims.map(c => c.userNic).filter(Boolean);
    const users = await User.find(
      { nic: { $in: nics } },
      { nic: 1, email: 1, mobile: 1, firstName: 1, lastName: 1, bankDetails: 1 }
    ).lean();
    const userMap = new Map(users.map(u => [u.nic, u]));

    const enrichedClaims = claims.map(c => {
      const u = userMap.get(c.userNic);
      const b = u?.bankDetails || {};
      const fullName = u ? `${u.firstName || ""} ${u.lastName || ""}`.trim() : "";
      return {
        ...c,
        policyHolderName: fullName,
        policyHolderEmail: u?.email || "",
        policyHolderMobile: u?.mobile || "",
        policyHolderBankDetails: {
          bankName: b.bankName || c.bankName || "",
          branchName: b.branchName || c.bankBranch || "",
          accountNumber: b.accountNumber || c.bankAccount || "",
          accountHolderName: b.accountHolderName || c.accountHolderName || fullName
        }
      };
    });

    res.json({ claims: enrichedClaims });
  } catch (err) {
    console.error("Fetch office staff claims error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// GET all policy holders for a specific branch or search across Sri Lanka: /api/office-staff/policy-holders
router.get("/policy-holders", async (req, res) => {
  try {
    const { branch, search, nic, allSriLanka, status } = req.query;
    
    const query = {};

    // Filter by branch if not searching all Sri Lanka
    const isAllSriLanka = allSriLanka === "true" || allSriLanka === "1";
    if (!isAllSriLanka && branch) {
      query.branch = branch.trim();
    }

    // Filter by status if specified (default to Approved if none specified and no search)
    if (status && status !== "all") {
      query.status = status;
    } else if (!status && !nic && !search) {
      query.status = "Approved";
    }

    // Filter by specific NIC if provided
    if (nic && nic.trim()) {
      const cleanNic = nic.trim();
      query.nic = { $regex: cleanNic, $options: "i" };
    }

    // Filter by search term across multiple fields
    if (search && search.trim()) {
      const cleanSearch = search.trim();
      const searchRegex = { $regex: cleanSearch, $options: "i" };
      query.$or = [
        { nic: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { mobile: searchRegex },
        { referenceNumber: searchRegex },
        { "vehicles.numberPlate": searchRegex },
        { "vehicles.policyNumber": searchRegex }
      ];
    }

    const policyHolders = await User.find(query, { password: 0 }).sort({ createdAt: -1 });
    res.json({ policyHolders });
  } catch (err) {
    console.error("Fetch office staff policy holders error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// GET single policy holder full details + claims by NIC: /api/office-staff/policy-holders/by-nic/:nic
router.get("/policy-holders/by-nic/:nic", async (req, res) => {
  try {
    const { nic } = req.params;
    if (!nic) {
      return res.status(400).json({ error: "NIC is required." });
    }
    const cleanNic = nic.trim();
    const user = await User.findOne({ nic: { $regex: new RegExp(`^${cleanNic}$`, "i") } }, { password: 0 });
    if (!user) {
      return res.status(404).json({ error: "Policy holder not found." });
    }
    const claims = await Claim.find({ userNic: { $regex: new RegExp(`^${cleanNic}$`, "i") } }).sort({ createdAt: -1 });
    res.json({ policyHolder: user, claims });
  } catch (err) {
    console.error("Fetch policy holder by NIC error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// POST add a new vehicle for a policy holder by branch staff: /api/office-staff/policy-holders/:nic/vehicles
router.post("/policy-holders/:nic/vehicles", async (req, res) => {
  try {
    const { nic } = req.params;
    const {
      numberPlate,
      vehicleType,
      year,
      company,
      model,
      engineNumber,
      chassisNumber,
      policyNumber,
      status
    } = req.body;

    if (!nic || !nic.trim()) {
      return res.status(400).json({ error: "Policy holder NIC is required." });
    }

    if (!numberPlate || !vehicleType || !company || !model) {
      return res.status(400).json({ error: "Vehicle plate number, type, make (company), and model are required." });
    }

    const cleanNic = nic.trim();
    const user = await User.findOne({ nic: { $regex: new RegExp(`^${cleanNic}$`, "i") } });
    if (!user) {
      return res.status(404).json({ error: "Policy holder not found with the provided NIC." });
    }

    const staffBranch = req.headers["x-staff-branch"] || req.body.staffBranch;
    if (staffBranch && user.branch && user.branch.toLowerCase() !== staffBranch.toLowerCase()) {
      return res.status(403).json({
        error: `Unauthorized: You can only add vehicles for policyholders registered under your branch (${staffBranch} Branch).`
      });
    }

    // Check if plate already registered under this user
    const normalizedPlate = numberPlate.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    const plateExists = user.vehicles && user.vehicles.some(
      v => v.numberPlate && v.numberPlate.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() === normalizedPlate
    );

    if (plateExists) {
      return res.status(400).json({ error: `Vehicle plate ${numberPlate} is already registered under this policy holder.` });
    }

    // Generate policy number if not provided
    let finalPolicyNumber = (policyNumber && policyNumber.trim()) ? policyNumber.trim().toUpperCase() : "";
    if (!finalPolicyNumber) {
      finalPolicyNumber = `SAN-${Math.floor(100000 + Math.random() * 900000)}`;
    } else if (!finalPolicyNumber.startsWith("SAN-") && !finalPolicyNumber.startsWith("SAN")) {
      finalPolicyNumber = `SAN-${finalPolicyNumber}`;
    }

    const newVehicle = {
      numberPlate: numberPlate.trim().toUpperCase(),
      vehicleType: vehicleType.trim(),
      year: (year && year.toString().trim()) || new Date().getFullYear().toString(),
      company: company.trim(),
      model: model.trim(),
      engineNumber: (engineNumber && engineNumber.trim()) || `ENG-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      chassisNumber: (chassisNumber && chassisNumber.trim()) || `CHS-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      policyNumber: finalPolicyNumber,
      status: status || "Approved"
    };

    if (!user.vehicles) {
      user.vehicles = [];
    }

    user.vehicles.push(newVehicle);
    await user.save();

    res.status(201).json({
      message: "New vehicle added successfully to policy holder.",
      vehicle: newVehicle,
      vehicles: user.vehicles,
      policyHolder: user
    });
  } catch (err) {
    console.error("Add vehicle to policy holder error:", err);
    res.status(500).json({ error: err.message || "An internal server error occurred." });
  }
});

// PUT update policy holder details by Branch Staff: /api/office-staff/policy-holders/:nic
router.put("/policy-holders/:nic", async (req, res) => {
  try {
    const { nic } = req.params;
    const {
      newNic,
      referenceNumber,
      firstName,
      lastName,
      mobile,
      email,
      dob,
      address,
      city,
      province,
      branch,
      status,
      bankDetails,
      staffBranch
    } = req.body;

    if (!nic || !nic.trim()) {
      return res.status(400).json({ error: "Policy holder NIC is required." });
    }

    const cleanNic = nic.trim();
    const user = await User.findOne({ nic: { $regex: new RegExp(`^${cleanNic}$`, "i") } });
    if (!user) {
      return res.status(404).json({ error: "Policy holder not found." });
    }

    const effectiveStaffBranch = req.headers["x-staff-branch"] || staffBranch;
    if (effectiveStaffBranch && user.branch && user.branch.toLowerCase() !== effectiveStaffBranch.toLowerCase()) {
      return res.status(403).json({
        error: `Unauthorized: You can only edit policyholders registered under your branch (${effectiveStaffBranch} Branch). This policyholder is registered under ${user.branch} Branch.`
      });
    }

    // 1. Handle NIC change by Branch Staff (with cascading updates to claims & update requests)
    const targetNic = (newNic || req.body.nic || "").trim().toUpperCase();
    if (targetNic && targetNic !== user.nic.toUpperCase()) {
      const existingUserWithNic = await User.findOne({
        nic: targetNic,
        _id: { $ne: user._id }
      });
      if (existingUserWithNic) {
        return res.status(400).json({ error: `Another policy holder is already registered with NIC ${targetNic}.` });
      }
      const oldNic = user.nic;
      user.nic = targetNic;

      // Cascade update to claims & profile update requests
      await Claim.updateMany({ userNic: { $regex: new RegExp(`^${cleanNic}$`, "i") } }, { userNic: targetNic });
      await ProfileUpdateRequest.updateMany({ userNic: { $regex: new RegExp(`^${cleanNic}$`, "i") } }, { userNic: targetNic });
    }

    // 2. Handle Policy Holder Reference Number change by Branch Staff
    if (referenceNumber && referenceNumber.trim() && referenceNumber.trim() !== user.referenceNumber) {
      const cleanRef = referenceNumber.trim().toUpperCase();
      const existingUserWithRef = await User.findOne({
        referenceNumber: cleanRef,
        _id: { $ne: user._id }
      });
      if (existingUserWithRef) {
        return res.status(400).json({ error: `Another policy holder is already registered with Reference No. ${cleanRef}.` });
      }
      user.referenceNumber = cleanRef;
      await ProfileUpdateRequest.updateMany({ userNic: user.nic }, { userReferenceNumber: cleanRef });
    }

    // 3. Handle Assigned Branch change by Branch Staff
    if (branch && branch.trim()) {
      user.branch = branch.trim();
    }

    if (firstName) user.firstName = firstName.trim();
    if (lastName) user.lastName = lastName.trim();
    if (mobile) user.mobile = mobile.trim();
    if (email) user.email = email.trim();
    if (dob) user.dob = dob.trim();
    if (address) user.address = address.trim();
    if (city) user.city = city.trim();
    if (province) user.province = province.trim();
    if (status) user.status = status.trim();

    if (bankDetails) {
      user.bankDetails = {
        bankName: (bankDetails.bankName || user.bankDetails?.bankName || "").trim(),
        branchName: (bankDetails.branchName || user.bankDetails?.branchName || "").trim(),
        accountNumber: (bankDetails.accountNumber || user.bankDetails?.accountNumber || "").trim(),
        accountHolderName: (bankDetails.accountHolderName || user.bankDetails?.accountHolderName || "").trim()
      };
    }

    await user.save();

    res.json({
      message: "Policy holder details updated successfully by Branch.",
      policyHolder: user
    });
  } catch (err) {
    console.error("Update policy holder error:", err);
    res.status(500).json({ error: err.message || "An internal server error occurred." });
  }
});

// PUT update a specific vehicle of a policy holder: /api/office-staff/policy-holders/:nic/vehicles/:plate
router.put("/policy-holders/:nic/vehicles/:plate", async (req, res) => {
  try {
    const { nic, plate } = req.params;
    const {
      numberPlate,
      vehicleType,
      year,
      company,
      model,
      engineNumber,
      chassisNumber,
      policyNumber,
      status,
      staffBranch
    } = req.body;

    if (!nic || !plate) {
      return res.status(400).json({ error: "NIC and vehicle plate are required." });
    }

    const cleanNic = nic.trim();
    const user = await User.findOne({ nic: { $regex: new RegExp(`^${cleanNic}$`, "i") } });
    if (!user) {
      return res.status(404).json({ error: "Policy holder not found." });
    }

    const effectiveStaffBranch = req.headers["x-staff-branch"] || staffBranch;
    if (effectiveStaffBranch && user.branch && user.branch.toLowerCase() !== effectiveStaffBranch.toLowerCase()) {
      return res.status(403).json({
        error: `Unauthorized: You can only edit vehicles for policyholders registered under your branch (${effectiveStaffBranch} Branch).`
      });
    }

    const normTargetPlate = plate.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    const vehicleIndex = (user.vehicles || []).findIndex(
      v => v.numberPlate && v.numberPlate.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() === normTargetPlate
    );

    if (vehicleIndex === -1) {
      return res.status(404).json({ error: "Vehicle not found for this policy holder." });
    }

    if (numberPlate) user.vehicles[vehicleIndex].numberPlate = numberPlate.trim().toUpperCase();
    if (vehicleType) user.vehicles[vehicleIndex].vehicleType = vehicleType.trim();
    if (year) user.vehicles[vehicleIndex].year = year.toString().trim();
    if (company) user.vehicles[vehicleIndex].company = company.trim();
    if (model) user.vehicles[vehicleIndex].model = model.trim();
    if (engineNumber) user.vehicles[vehicleIndex].engineNumber = engineNumber.trim();
    if (chassisNumber) user.vehicles[vehicleIndex].chassisNumber = chassisNumber.trim();
    if (policyNumber) user.vehicles[vehicleIndex].policyNumber = policyNumber.trim();
    if (status) user.vehicles[vehicleIndex].status = status.trim();

    await user.save();

    res.json({
      message: "Vehicle updated successfully.",
      vehicle: user.vehicles[vehicleIndex],
      vehicles: user.vehicles,
      policyHolder: user
    });
  } catch (err) {
    console.error("Update vehicle error:", err);
    res.status(500).json({ error: err.message || "An internal server error occurred." });
  }
});

// DELETE a specific vehicle of a policy holder: /api/office-staff/policy-holders/:nic/vehicles/:plate
router.delete("/policy-holders/:nic/vehicles/:plate", async (req, res) => {
  try {
    const { nic, plate } = req.params;
    if (!nic || !plate) {
      return res.status(400).json({ error: "NIC and vehicle plate are required." });
    }

    const cleanNic = nic.trim();
    const user = await User.findOne({ nic: { $regex: new RegExp(`^${cleanNic}$`, "i") } });
    if (!user) {
      return res.status(404).json({ error: "Policy holder not found." });
    }

    const staffBranch = req.headers["x-staff-branch"] || req.query.staffBranch;
    if (staffBranch && user.branch && user.branch.toLowerCase() !== staffBranch.toLowerCase()) {
      return res.status(403).json({
        error: `Unauthorized: You can only remove vehicles for policyholders registered under your branch (${staffBranch} Branch).`
      });
    }

    const normTargetPlate = plate.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    user.vehicles = (user.vehicles || []).filter(
      v => v.numberPlate && v.numberPlate.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() !== normTargetPlate
    );

    await user.save();

    res.json({
      message: "Vehicle removed successfully.",
      vehicles: user.vehicles,
      policyHolder: user
    });
  } catch (err) {
    console.error("Delete vehicle error:", err);
    res.status(500).json({ error: err.message || "An internal server error occurred." });
  }
});

// GET all agents for a specific branch: /api/office-staff/agents
router.get("/agents", async (req, res) => {
  try {
    const { branch } = req.query;
    if (!branch) {
      return res.status(400).json({ error: "Branch query parameter is required." });
    }

    // Automatically sync stale active agents to Offline (> 3 mins inactivity)
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
    await Agent.updateMany(
      {
        availability: "Active",
        $or: [
          { lastSeenAt: { $lt: threeMinutesAgo } },
          { lastSeenAt: { $exists: false } }
        ]
      },
      { $set: { availability: "Offline" } }
    );

    const agents = await Agent.find({ branch: branch.trim() }, { password: 0 }).sort({ createdAt: -1 });
    res.json({ agents });
  } catch (err) {
    console.error("Fetch office staff agents error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// GET all registrations for a specific branch: /api/office-staff/registrations
router.get("/registrations", async (req, res) => {
  try {
    const { branch } = req.query;
    if (!branch) {
      return res.status(400).json({ error: "Branch query parameter is required." });
    }
    const registrations = await User.find(
      { branch: branch.trim(), status: { $ne: "Approved" } },
      { password: 0 }
    ).sort({ createdAt: -1 });
    res.json({ registrations });
  } catch (err) {
    console.error("Fetch office staff registrations error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// PATCH update user registration status: /api/office-staff/registrations/:id/status
router.patch("/registrations/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["Pending", "Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value. Must be Pending, Approved, or Rejected." });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    user.status = status;
    await user.save();

    res.json({ message: `Registration status updated to ${status}`, user });
  } catch (err) {
    console.error("Update registration status error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// GET all profile update requests for a specific branch: /api/office-staff/profile-update-requests
router.get("/profile-update-requests", async (req, res) => {
  try {
    const { branch, status } = req.query;
    if (!branch) {
      return res.status(400).json({ error: "Branch query parameter is required." });
    }

    const query = { branch: branch.trim() };
    if (status && status !== "all") {
      query.status = status;
    }

    const requests = await ProfileUpdateRequest.find(query).sort({ createdAt: -1 });
    res.json({ requests });
  } catch (err) {
    console.error("Fetch profile update requests error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// PATCH approve or reject a profile update request: /api/office-staff/profile-update-requests/:id/review
router.patch("/profile-update-requests/:id/review", async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reviewNote, reviewerName } = req.body;

    if (!["Approve", "Reject"].includes(action)) {
      return res.status(400).json({ error: "Action must be either 'Approve' or 'Reject'." });
    }

    const request = await ProfileUpdateRequest.findById(id);
    if (!request) {
      return res.status(404).json({ error: "Profile update request not found." });
    }

    if (request.status !== "Pending") {
      return res.status(400).json({ error: `This request has already been ${request.status.toLowerCase()}.` });
    }

    const user = await User.findOne({ nic: request.userNic });
    if (!user) {
      return res.status(404).json({ error: "Associated policy holder not found in database." });
    }

    if (action === "Approve") {
      const changes = request.requestedChanges || {};

      // Apply changes to the user record in database
      if (changes.firstName) user.firstName = changes.firstName.trim();
      if (changes.lastName) user.lastName = changes.lastName.trim();
      if (changes.mobile) user.mobile = changes.mobile.trim();
      if (changes.email) user.email = changes.email.trim().toLowerCase();
      if (changes.dob) user.dob = changes.dob.trim();
      if (changes.address) user.address = changes.address.trim();
      if (changes.province) user.province = changes.province.trim();
      if (changes.city) user.city = changes.city.trim();

      if (changes.documents && typeof changes.documents === "object") {
        if (!user.documents) user.documents = {};
        if (changes.documents.nicFront) user.documents.nicFront = changes.documents.nicFront;
        if (changes.documents.nicBack) user.documents.nicBack = changes.documents.nicBack;
        if (changes.documents.vehicleReg) user.documents.vehicleReg = changes.documents.vehicleReg;
        if (changes.documents.revenueLicense) user.documents.revenueLicense = changes.documents.revenueLicense;
      }

      await user.save();

      // Update request status
      request.status = "Approved";
      request.reviewedBy = reviewerName || "Branch Staff";
      request.reviewedAt = new Date();
      request.reviewNote = reviewNote || "Approved by Branch Office Staff";
      request.updatedAt = new Date();
      await request.save();

      // Send status email to policy holder's personal email
      await sendProfileUpdateStatusEmail(
        user.email || request.userEmail,
        `${user.firstName || ""} ${user.lastName || ""}`.trim() || request.userName,
        "Approved",
        request.requestType,
        reviewNote || "Your changes have been verified and applied to your account.",
        user.branch || request.branch || "Galle"
      );

      res.json({
        message: "Profile update request approved successfully. User data has been updated in database.",
        request,
        user
      });
    } else {
      // Reject action
      request.status = "Rejected";
      request.reviewedBy = reviewerName || "Branch Staff";
      request.reviewedAt = new Date();
      request.reviewNote = reviewNote || "Request rejected by branch staff.";
      request.updatedAt = new Date();
      await request.save();

      // Send status email to policy holder's personal email
      await sendProfileUpdateStatusEmail(
        user.email || request.userEmail,
        `${user.firstName || ""} ${user.lastName || ""}`.trim() || request.userName,
        "Rejected",
        request.requestType,
        reviewNote || "Your profile update request could not be approved.",
        user.branch || request.branch || "Galle"
      );

      res.json({
        message: "Profile update request rejected.",
        request
      });
    }
  } catch (err) {
    console.error("Review profile update request error:", err);
    res.status(500).json({ error: err.message || "An internal server error occurred." });
  }
});

// PATCH update claim details: /api/office-staff/claims/:claimNumber
router.patch("/claims/:claimNumber", async (req, res) => {
  try {
    const { claimNumber } = req.params;
    const { 
      status, 
      amount, 
      currentStep, 
      assignedAgent, 
      messageText, 
      messageSender,
      paymentReceipt,
      bankName,
      bankBranch,
      bankAccount,
      documentsRequested,
      requestedDocuments,
      documentRequestTo,
      rejectionReason
    } = req.body;

    const claim = await Claim.findOne({ claimNumber: claimNumber.trim().toUpperCase() });
    if (!claim) {
      return res.status(404).json({ error: "Claim not found." });
    }

    if (status !== undefined) claim.status = status;
    if (amount !== undefined) claim.amount = amount === "" ? null : Number(amount);
    if (currentStep !== undefined) {
      claim.currentStep = Number(currentStep);
    } else if (assignedAgent !== undefined) {
      if (assignedAgent && assignedAgent.trim() !== "" && assignedAgent.toLowerCase() !== "unassigned") {
        claim.currentStep = 2;
        if (!status) claim.status = "In Progress";
      } else {
        claim.currentStep = 1;
        if (!status) claim.status = "Pending";
      }
    }
    if (assignedAgent !== undefined) {
      claim.assignedAgent = (assignedAgent && assignedAgent.toLowerCase() !== "unassigned") ? assignedAgent.trim() : "";
    }
    if (documentsRequested !== undefined) claim.documentsRequested = documentsRequested;
    if (requestedDocuments !== undefined) claim.requestedDocuments = requestedDocuments;
    if (documentRequestTo !== undefined) claim.documentRequestTo = documentRequestTo;
    if (rejectionReason !== undefined) claim.rejectionReason = rejectionReason;
    if (paymentReceipt !== undefined) {
      claim.paymentReceipt = paymentReceipt;
      if (paymentReceipt && (!currentStep || Number(currentStep) < 6)) {
        claim.currentStep = 6;
      }
    }
    if (bankName !== undefined) claim.bankName = bankName;
    if (bankBranch !== undefined) claim.bankBranch = bankBranch;
    if (bankAccount !== undefined) claim.bankAccount = bankAccount;

    if (messageText) {
      claim.messages.push({
        sender: messageSender || "Office Staff",
        message: messageText,
        sentAt: new Date()
      });
    }

    await claim.save();
    res.json({ message: "Claim updated successfully", claim });
  } catch (err) {
    console.error("Update claim error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// POST analyze claim photos with AI: /api/office-staff/claims/:claimNumber/analyze-ai
router.post("/claims/:claimNumber/analyze-ai", async (req, res) => {
  try {
    const { claimNumber } = req.params;
    const claim = await Claim.findOne({ claimNumber: claimNumber.trim().toUpperCase() });
    if (!claim) {
      return res.status(404).json({ error: "Claim not found." });
    }

    const allUrls = [
      ...(claim.accidentPhotos?.front || []),
      ...(claim.accidentPhotos?.rear || []),
      ...(claim.accidentPhotos?.side || [])
    ];

    // Convert Cloudinary URLs to Base64 format for Gemini (if any exist)
    let base64Photos = [];
    if (allUrls.length > 0) {
      try {
        base64Photos = await Promise.all(
          allUrls.map(async (url) => {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer).toString("base64");
          })
        );
      } catch (fetchErr) {
        console.warn("Failed to fetch some photos from Cloudinary, continuing with available images:", fetchErr.message);
      }
    }

    const vehicleInfo = {
      vehiclePlate: claim.vehiclePlate,
      damageType: claim.damageType
    };

    const aiResult = await analyzeAccidentDamageWithCostSheet(
      base64Photos,
      vehicleInfo,
      claim.inspectionReport || ""
    );

    if (!aiResult) {
      return res.status(500).json({ error: "AI Damage Assessment failed." });
    }

    claim.aiAnalysis = {
      isAnalyzed: true,
      damagedItems: aiResult.damagedItems || [],
      overallDamagePercentage: aiResult.overallDamagePercentage || 0,
      totalEstimatedPartsCost: aiResult.totalEstimatedPartsCost || 0,
      totalEstimatedLaborCost: aiResult.totalEstimatedLaborCost || 0,
      totalEstimatedCost: aiResult.totalEstimatedCost || 0,
      currency: aiResult.currency || "LKR",
      summary: aiResult.summary || "",
      analyzedAt: new Date()
    };

    // Auto-request Garage Estimate Report from Policy Holder for review and comparison
    claim.documentsRequested = true;
    const requested = new Set(claim.requestedDocuments || []);
    requested.add("Garage Estimate Report");
    claim.requestedDocuments = Array.from(requested);
    claim.documentRequestTo = "Policy Holder";
    claim.status = "Review";
    claim.currentStep = 4;

    claim.messages.push({
      sender: "Sanasa AI",
      message: `AI Damage Assessment completed. Total estimated repair cost: LKR ${(aiResult.totalEstimatedCost || 0).toLocaleString()}. Garage Estimate Report has been automatically requested from Policy Holder for photo cross-check and cost comparison.`,
      sentAt: new Date(),
      recipient: "All"
    });

    await claim.save();

    res.json({
      message: "AI Damage Assessment completed and Garage Estimate Report automatically requested from Policy Holder.",
      claim,
      aiAnalysis: claim.aiAnalysis
    });
  } catch (err) {
    console.error("AI manual analysis error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// POST compare garage estimate with accident photos & AI: /api/office-staff/claims/:claimNumber/compare-garage-estimate
router.post("/claims/:claimNumber/compare-garage-estimate", async (req, res) => {
  try {
    const { claimNumber } = req.params;
    const claim = await Claim.findOne({ claimNumber: claimNumber.trim().toUpperCase() });
    if (!claim) {
      return res.status(404).json({ error: "Claim not found." });
    }

    // Find the uploaded garage estimate document
    const garageDoc = (claim.additionalDocuments || []).find(
      (doc) => doc.name && doc.name.toLowerCase().includes("garage")
    ) || (claim.additionalDocuments && claim.additionalDocuments[claim.additionalDocuments.length - 1]);

    if (!garageDoc || !garageDoc.url) {
      return res.status(400).json({ error: "No uploaded Garage Estimate document found on this claim." });
    }

    let garageBase64 = "";
    try {
      const response = await fetch(garageDoc.url);
      const arrayBuffer = await response.arrayBuffer();
      garageBase64 = Buffer.from(arrayBuffer).toString("base64");
    } catch (e) {
      console.warn("Could not download garage doc from URL, using fallback comparison:", e.message);
    }

    // Fetch accident photos
    const allUrls = [
      ...(claim.accidentPhotos?.front || []),
      ...(claim.accidentPhotos?.rear || []),
      ...(claim.accidentPhotos?.side || [])
    ];

    let base64Photos = [];
    if (allUrls.length > 0) {
      try {
        base64Photos = await Promise.all(
          allUrls.map(async (url) => {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer).toString("base64");
          })
        );
      } catch (err) {
        console.warn("Failed to fetch accident photos:", err.message);
      }
    }

    const comparisonResult = await compareGarageEstimateWithPhotosAndAI(
      garageBase64,
      base64Photos,
      claim.aiAnalysis,
      claim.inspectionReport || ""
    );

    comparisonResult.garageDocumentUrl = garageDoc.url;
    claim.garageEstimateComparison = comparisonResult;

    claim.messages.push({
      sender: "Sanasa AI",
      message: `AI Forensic Comparison completed for Garage Estimate. Match Confidence: ${comparisonResult.matchConfidenceScore}%. Verdict: ${comparisonResult.verdict}. Cost Variance: ${comparisonResult.costDifferencePercentage}%.`,
      sentAt: new Date(),
      recipient: "All"
    });

    await claim.save();

    res.json({
      message: "Garage estimate comparison and photo cross-check completed successfully.",
      claim,
      garageEstimateComparison: claim.garageEstimateComparison
    });
  } catch (err) {
    console.error("Compare garage estimate error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// POST approve or reject claim: /api/office-staff/claims/:claimNumber/decision
router.post("/claims/:claimNumber/decision", async (req, res) => {
  try {
    const { claimNumber } = req.params;
    const { action, amount, rejectionReason, note } = req.body;

    if (!["Approve", "Reject"].includes(action)) {
      return res.status(400).json({ error: "Action must be either Approve or Reject." });
    }

    const claim = await Claim.findOne({ claimNumber: claimNumber.trim().toUpperCase() });
    if (!claim) {
      return res.status(404).json({ error: "Claim not found." });
    }

    if (action === "Approve") {
      claim.status = "Approved";
      claim.currentStep = 5;
      const approvedAmount = Number(amount) || claim.garageEstimateComparison?.garageEstimatedTotal || claim.aiAnalysis?.totalEstimatedCost || claim.amount || 0;
      claim.amount = approvedAmount;
      claim.rejectionReason = "";

      claim.messages.push({
        sender: "Office Staff",
        message: `Claim approved for final settlement amount LKR ${approvedAmount.toLocaleString()}.${note ? ` Note: ${note}` : ""}`,
        sentAt: new Date(),
        recipient: "Policy Holder"
      });
    } else {
      claim.status = "Rejected";
      claim.currentStep = 4;
      claim.rejectionReason = rejectionReason || "Claim rejected following damage assessment and garage estimate review.";

      claim.messages.push({
        sender: "Office Staff",
        message: `Claim has been rejected. Reason: ${claim.rejectionReason}`,
        sentAt: new Date(),
        recipient: "Policy Holder"
      });
    }

    await claim.save();

    // Send email notification to user
    const user = await User.findOne({ nic: claim.userNic });
    if (user && user.email) {
      const isApproved = action === "Approve";
      const subject = isApproved ? `Claim ${claim.claimNumber} Approved - Sanasa Insurance` : `Claim ${claim.claimNumber} Update - Sanasa Insurance`;
      const htmlBody = getBaseTemplate(
        isApproved ? "Claim Approved" : "Claim Status Update",
        `Dear ${user.firstName || "Policy Holder"},<br><br>Your insurance claim <strong>${claim.claimNumber}</strong> has been <strong>${action === "Approve" ? "APPROVED" : "REJECTED"}</strong> by the branch office.<br><br>` +
        (isApproved 
          ? `<strong>Approved Settlement Amount:</strong> LKR ${Number(claim.amount).toLocaleString()}<br>Payment is currently being queued for disbursement to your registered bank account.` 
          : `<strong>Reason:</strong> ${claim.rejectionReason}<br>Please contact your branch office if you have any questions.`)
      );
      const textBody = `Claim ${claim.claimNumber} has been ${action.toLowerCase()}d.`;
      try {
        await sendEmail(user.email, subject, htmlBody, textBody);
      } catch (mailErr) {
        console.warn("Could not send decision email:", mailErr.message);
      }
    }

    res.json({ message: `Claim successfully ${action.toLowerCase()}d.`, claim });
  } catch (err) {
    console.error("Claim decision error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// POST settle payment with uploaded payment receipt: /api/office-staff/claims/:claimNumber/settle-payment
router.post("/claims/:claimNumber/settle-payment", async (req, res) => {
  try {
    const { claimNumber } = req.params;
    const { receiptFile, receiptFileName, paymentNote, amountPaid } = req.body;

    if (!receiptFile) {
      return res.status(400).json({ error: "Payment receipt file is required." });
    }

    const claim = await Claim.findOne({ claimNumber: claimNumber.trim().toUpperCase() });
    if (!claim) {
      return res.status(404).json({ error: "Claim not found." });
    }

    // Upload receipt to Cloudinary
    const uploadedUrl = await uploadToCloudinary(receiptFile, "claims/payment_receipts");

    const finalAmount = Number(amountPaid) || claim.amount || claim.garageEstimateComparison?.garageEstimatedTotal || claim.aiAnalysis?.totalEstimatedCost || 0;
    claim.paymentReceipt = uploadedUrl;
    claim.paymentReceiptFileName = receiptFileName || "Payment_Receipt.pdf";
    claim.paymentSettledAt = new Date();
    claim.paymentSettledBy = "Office Staff";
    claim.paymentNote = paymentNote || "";
    claim.amount = finalAmount;
    claim.status = "Settled";
    claim.currentStep = 5;

    // Add receipt to additional documents
    claim.additionalDocuments.push({
      name: `Payment Receipt - LKR ${finalAmount.toLocaleString()}`,
      url: uploadedUrl,
      uploadedAt: new Date(),
      uploadedBy: "Office Staff"
    });

    claim.messages.push({
      sender: "Office Staff",
      message: `Payment of LKR ${finalAmount.toLocaleString()} settled successfully. Official payment receipt uploaded.${paymentNote ? ` Note: ${paymentNote}` : ""}`,
      sentAt: new Date(),
      recipient: "Policy Holder"
    });

    await claim.save();

    // Send email with payment receipt confirmation to policyholder
    const user = await User.findOne({ nic: claim.userNic });
    if (user && user.email) {
      const subject = `Payment Settled: Claim ${claim.claimNumber} - Sanasa Insurance`;
      const bankInfo = user.bankDetails || {};
      const htmlBody = getBaseTemplate(
        "Payment Settlement Completed",
        `Dear ${user.firstName || "Policy Holder"},<br><br>` +
        `We are pleased to inform you that the final settlement payment for your claim <strong>${claim.claimNumber}</strong> has been processed successfully.<br><br>` +
        `<table style="width: 100%; border-collapse: collapse; margin: 16px 0; background: #f8fafc; border-radius: 8px; padding: 12px;">` +
        `<tr><td style="padding: 6px 10px; color: #64748b; font-size: 13px;">Claim Number:</td><td style="padding: 6px 10px; font-weight: bold; color: #0f172a; font-size: 13px;">${claim.claimNumber}</td></tr>` +
        `<tr><td style="padding: 6px 10px; color: #64748b; font-size: 13px;">Vehicle Plate:</td><td style="padding: 6px 10px; font-weight: bold; color: #0f172a; font-size: 13px;">${claim.vehiclePlate}</td></tr>` +
        `<tr><td style="padding: 6px 10px; color: #64748b; font-size: 13px;">Settlement Amount:</td><td style="padding: 6px 10px; font-weight: bold; color: #16a34a; font-size: 15px;">LKR ${finalAmount.toLocaleString()}</td></tr>` +
        `<tr><td style="padding: 6px 10px; color: #64748b; font-size: 13px;">Bank Name:</td><td style="padding: 6px 10px; font-weight: bold; color: #0f172a; font-size: 13px;">${bankInfo.bankName || claim.bankName || "Registered Account"}</td></tr>` +
        `<tr><td style="padding: 6px 10px; color: #64748b; font-size: 13px;">Account Number:</td><td style="padding: 6px 10px; font-weight: bold; color: #0f172a; font-size: 13px;">${bankInfo.accountNumber || claim.bankAccount || "�"}</td></tr>` +
        `<tr><td style="padding: 6px 10px; color: #64748b; font-size: 13px;">Settlement Date:</td><td style="padding: 6px 10px; font-weight: bold; color: #0f172a; font-size: 13px;">${new Date().toLocaleDateString("en-GB")}</td></tr>` +
        `</table>` +
        `${paymentNote ? `<p style="font-size: 13px; color: #334155;"><strong>Branch Note:</strong> ${paymentNote}</p>` : ""}` +
        `<div style="margin-top: 20px; text-align: center;">` +
        `<a href="${uploadedUrl}" target="_blank" style="background: #16a34a; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">View / Download Payment Slip</a>` +
        `</div><br>Thank you for choosing Sanasa General Insurance.`
      );
      const textBody = `Payment of LKR ${finalAmount.toLocaleString()} for claim ${claim.claimNumber} has been processed. View receipt: ${uploadedUrl}`;
      try {
        await sendEmail(user.email, subject, htmlBody, textBody);
      } catch (e) {
        console.warn("Could not dispatch payment email:", e.message);
      }
    }

    res.json({
      message: "Payment settled and official receipt uploaded successfully.",
      claim
    });
  } catch (err) {
    console.error("Settle payment error:", err);
    res.status(500).json({ error: "An internal server error occurred while processing payment." });
  }
});

// POST create a new agent: /api/office-staff/agents
router.post("/agents", async (req, res) => {
  try {
    const {
      name,
      email,
      nic,
      address,
      dob,
      branch,
      phone,
      city,
      district,
      area,
      province,
      bankName,
      bankBranch,
      accountNumber,
      accountType,
      accountHolderName,
      nicFront,
      nicBack,
      birthCertificate,
      policeReport
    } = req.body;

    if (!name || !email || !nic || !branch || !phone || !dob || !address) {
      return res.status(400).json({ error: "Name, Email, NIC, Branch, Phone, DOB, and Address are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanNic = nic.trim().toUpperCase();

    // Check if agent already exists in Agent or Admin or Staff or User
    const existingAgent = await Agent.findOne({
      $or: [{ email: cleanEmail }, { nic: cleanNic }]
    });
    if (existingAgent) {
      return res.status(400).json({ error: "An agent with this Email or NIC already exists." });
    }

    // Auto-generate next unique Agent ID (e.g. AGT-0001)
    const totalAgents = await Agent.countDocuments();
    const nextAgentId = `AGT-${String(totalAgents + 1).padStart(4, "0")}`;

    // Upload identity proof documents to Cloudinary if provided
    let nicFrontUrl = "";
    let nicBackUrl = "";
    let birthCertUrl = "";
    let policeReportUrl = "";

    if (nicFront) nicFrontUrl = await uploadToCloudinary(nicFront, "agents/documents");
    if (nicBack) nicBackUrl = await uploadToCloudinary(nicBack, "agents/documents");
    if (birthCertificate) birthCertUrl = await uploadToCloudinary(birthCertificate, "agents/documents");
    if (policeReport) policeReportUrl = await uploadToCloudinary(policeReport, "agents/documents");

    // Generate random 8-character temporary password
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let tempPassword = "";
    for (let i = 0; i < 8; i++) {
      tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const hashedPassword = hashPassword(tempPassword);

    const newAgent = new Agent({
      agentId: nextAgentId,
      name: name.trim(),
      email: cleanEmail,
      nic: cleanNic,
      dob: dob.trim(),
      address: address.trim(),
      phone: phone.trim(),
      city: district ? district.trim() : (city ? city.trim() : ""),
      district: district ? district.trim() : "",
      area: area ? area.trim() : "",
      province: province ? province.trim() : "",
      branch: branch.trim(),
      bankName: bankName ? bankName.trim() : "",
      bankBranch: bankBranch ? bankBranch.trim() : "",
      accountNumber: accountNumber ? accountNumber.trim() : "",
      accountType: accountType ? accountType.trim() : "",
      accountHolderName: accountHolderName ? accountHolderName.trim() : "",
      nicFront: nicFrontUrl,
      nicBack: nicBackUrl,
      birthCertificate: birthCertUrl,
      policeReport: policeReportUrl,
      status: "active",
      mustChangePassword: true,
      password: hashedPassword
    });

    await newAgent.save();

    // Send Welcome Email with credentials and temporary password
    const subject = "Welcome to Sanasa Insurance - Your Agent Account Details";
    const htmlBody = getBaseTemplate(
      "Agent Account Activation",
      `
      <p>Dear <strong>${name.trim()}</strong>,</p>
      <p>Congratulations! Your official Agent account with Sanasa Insurance has been successfully created. You have been assigned to the <strong>${branch.trim()}</strong> branch.</p>
      <div class="highlight-box">
        <p style="margin: 0; font-size: 14px; color: #1e3a8a;"><strong>Your Credentials:</strong></p>
        <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Agent ID:</strong> ${nextAgentId}</p>
        <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Email:</strong> ${cleanEmail}</p>
        <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #0f172a;">${tempPassword}</code></p>
      </div>
      <table class="info-table">
        <tr>
          <td class="label">Contact Phone:</td>
          <td class="value">${phone.trim()}</td>
        </tr>
        <tr>
          <td class="label">NIC Number:</td>
          <td class="value">${cleanNic}</td>
        </tr>
        <tr>
          <td class="label">Assigned Branch:</td>
          <td class="value">${branch.trim()}</td>
        </tr>
      </table>
      <p>Please log in using your temporary password. Upon your first login to either the Agent Web Dashboard or Mobile App, you will be prompted to set a new password of your choice for subsequent logins.</p>
      `
    );
    const textBody = `Welcome to Sanasa Insurance. Your Agent ID is ${nextAgentId}. Use email ${cleanEmail} and temporary password ${tempPassword} to log in.`;

    try {
      await sendEmail(cleanEmail, subject, htmlBody, textBody);
    } catch (emailErr) {
      console.error("Failed to send agent welcome email:", emailErr.message);
    }

    // Return agent details without password
    const agentObj = newAgent.toObject();
    delete agentObj.password;

    res.status(201).json({ message: "Agent registered successfully", agent: agentObj });
  } catch (err) {
    console.error("Create agent API error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// DELETE agent: /api/office-staff/agents/:id
router.delete("/agents/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, note, document } = req.body || {};
    
    // Find the agent to get details before deletion
    const agent = await Agent.findById(id);
    if (!agent) {
      return res.status(404).json({ error: "Agent not found." });
    }
    
    console.log(`[Termination Log] Agent ${agent.name} (${agent.agentId}) deleted.`);
    console.log(`- Reason: ${reason || "Not provided"}`);
    console.log(`- Note: ${note || "None"}`);
    if (document) {
      console.log(`- Attached proof document length: ${document.length} characters (Base64)`);
    }

    await Agent.findByIdAndDelete(id);
    res.json({ message: "Agent removed successfully." });
  } catch (err) {
    console.error("Delete agent error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// PATCH update agent: /api/office-staff/agents/:id
router.patch("/agents/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      nic,
      dob,
      address,
      password,
      phone,
      city,
      district,
      area,
      province,
      bankName,
      bankBranch,
      accountNumber,
      accountType,
      accountHolderName,
      nicFront,
      nicBack,
      birthCertificate,
      policeReport
    } = req.body;

    const agent = await Agent.findById(id);
    if (!agent) {
      return res.status(404).json({ error: "Agent not found." });
    }

    if (name !== undefined) agent.name = name.trim();
    if (email !== undefined) agent.email = email.trim().toLowerCase();
    if (nic !== undefined) agent.nic = nic.trim().toUpperCase();
    if (dob !== undefined) agent.dob = dob.trim();
    if (address !== undefined) agent.address = address.trim();
    if (phone !== undefined) agent.phone = phone.trim();
    if (district !== undefined) {
      agent.district = district.trim();
      agent.city = district.trim();
    } else if (city !== undefined) {
      agent.city = city.trim();
    }
    if (area !== undefined) agent.area = area.trim();
    if (province !== undefined) agent.province = province.trim();
    if (bankName !== undefined) agent.bankName = bankName.trim();
    if (bankBranch !== undefined) agent.bankBranch = bankBranch.trim();
    if (accountNumber !== undefined) agent.accountNumber = accountNumber.trim();
    if (accountType !== undefined) agent.accountType = accountType.trim();
    if (accountHolderName !== undefined) agent.accountHolderName = accountHolderName.trim();
    
    if (nicFront !== undefined) {
      agent.nicFront = nicFront ? await uploadToCloudinary(nicFront, "agents/documents") : "";
    }
    if (nicBack !== undefined) {
      agent.nicBack = nicBack ? await uploadToCloudinary(nicBack, "agents/documents") : "";
    }
    if (birthCertificate !== undefined) {
      agent.birthCertificate = birthCertificate ? await uploadToCloudinary(birthCertificate, "agents/documents") : "";
    }
    if (policeReport !== undefined) {
      agent.policeReport = policeReport ? await uploadToCloudinary(policeReport, "agents/documents") : "";
    }

    if (password) {
      agent.password = hashPassword(password);
      agent.mustChangePassword = true;
    }

    await agent.save();

    const agentObj = agent.toObject();
    delete agentObj.password;

    res.json({ message: "Agent updated successfully", agent: agentObj });
  } catch (err) {
    console.error("Update agent error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// GET pending vehicles for office staff: /api/office-staff/pending-vehicles
router.get("/pending-vehicles", async (req, res) => {
  try {
    const { branch } = req.query;
    if (!branch) {
      return res.status(400).json({ error: "Branch query parameter is required." });
    }

    const users = await User.find({
      branch: branch.trim(),
      $or: [
        { "vehicles.status": "Pending" },
        { "vehicles.status": null },
        { "vehicles.status": { $exists: false } },
        { "vehicles": { $elemMatch: { status: { $exists: false } } } }
      ]
    }, { password: 0, documents: 0, bankDetails: 0 });

    const pendingVehiclesList = [];
    users.forEach(user => {
      user.vehicles.forEach(vehicle => {
        if (!vehicle.status || vehicle.status === "Pending") {
          pendingVehiclesList.push({
            user: {
              _id: user._id,
              firstName: user.firstName,
              lastName: user.lastName,
              nic: user.nic,
              email: user.email,
              mobile: user.mobile,
              dob: user.dob,
              address: user.address,
              province: user.province,
              city: user.city,
              branch: user.branch,
              status: user.status,
              createdAt: user.createdAt,
              referenceNumber: user.referenceNumber,
              vehicles: user.vehicles
            },
            vehicle
          });
        }
      });
    });

    res.json({ pendingVehicles: pendingVehiclesList });
  } catch (err) {
    console.error("Fetch pending vehicles error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// PATCH verify vehicle: /api/office-staff/vehicles/verify
router.patch("/vehicles/verify", async (req, res) => {
  try {
    const { nic, numberPlate, action } = req.body; // action: "Approve" or "Reject"
    if (!nic || !numberPlate || !action) {
      return res.status(400).json({ error: "NIC, numberPlate, and action are required." });
    }

    if (!["Approve", "Reject"].includes(action)) {
      return res.status(400).json({ error: "Invalid action. Must be Approve or Reject." });
    }

    const user = await User.findOne({ nic: nic.trim() });
    if (!user) {
      return res.status(404).json({ error: "Policy holder not found." });
    }

    const vehicle = user.vehicles.find(
      v => v.numberPlate.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() === numberPlate.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
    );

    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found." });
    }

    if (action === "Approve") {
      vehicle.status = "Approved";
    } else {
      vehicle.status = "Rejected";
    }

    await user.save();

    res.json({
      message: `Vehicle successfully ${action === "Approve" ? "approved" : "rejected"}.`,
      vehicle
    });
  } catch (err) {
    console.error("Verify vehicle error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// GET all agent profile update requests for a branch: /api/office-staff/agent-profile-update-requests
router.get("/agent-profile-update-requests", async (req, res) => {
  try {
    const { branch, status, search, allSriLanka } = req.query;
    const query = {};

    const isAllSriLanka = allSriLanka === "true" || allSriLanka === "1";
    if (!isAllSriLanka && branch) {
      query.branch = { $regex: new RegExp(`^${branch.trim()}$`, "i") };
    }

    if (status && status !== "all") {
      query.status = status;
    }

    if (search && search.trim()) {
      const cleanSearch = search.trim();
      const sRegex = { $regex: cleanSearch, $options: "i" };
      query.$or = [
        { agentId: sRegex },
        { agentName: sRegex },
        { agentEmail: sRegex },
        { agentNic: sRegex },
        { agentPhone: sRegex }
      ];
    }

    const requests = await AgentProfileUpdateRequest.find(query).sort({ createdAt: -1 });
    res.json({ requests });
  } catch (err) {
    console.error("Fetch agent profile update requests error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// PATCH review agent profile update request: /api/office-staff/agent-profile-update-requests/:id/review
router.patch("/agent-profile-update-requests/:id/review", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewNote, reviewedBy, staffBranch } = req.body;

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Must be Approved or Rejected." });
    }

    const updateRequest = await AgentProfileUpdateRequest.findById(id);
    if (!updateRequest) {
      return res.status(404).json({ error: "Agent profile update request not found." });
    }

    const effectiveStaffBranch = req.headers["x-staff-branch"] || staffBranch;
    if (effectiveStaffBranch && updateRequest.branch && updateRequest.branch.toLowerCase() !== effectiveStaffBranch.toLowerCase()) {
      return res.status(403).json({
        error: `Unauthorized: You can only review requests for your assigned branch (${effectiveStaffBranch} Branch).`
      });
    }

    updateRequest.status = status;
    updateRequest.reviewNote = reviewNote || "";
    updateRequest.reviewedBy = reviewedBy || "Office Staff";
    updateRequest.reviewedAt = new Date();
    updateRequest.updatedAt = new Date();

    // If Approved, automatically apply the requested changes to the Agent in database
    if (status === "Approved") {
      const agent = await Agent.findOne({
        $or: [
          { email: updateRequest.agentEmail.toLowerCase() },
          { agentId: updateRequest.agentId }
        ]
      });

      if (agent) {
        const changes = updateRequest.requestedChanges || {};

        if (changes.phone !== undefined) agent.phone = changes.phone;
        if (changes.address !== undefined) agent.address = changes.address;
        if (changes.city !== undefined) agent.city = changes.city;
        if (changes.district !== undefined) agent.district = changes.district;
        if (changes.area !== undefined) agent.area = changes.area;
        if (changes.province !== undefined) agent.province = changes.province;

        if (changes.bankName !== undefined) agent.bankName = changes.bankName;
        if (changes.bankBranch !== undefined) agent.bankBranch = changes.bankBranch;
        if (changes.accountNumber !== undefined) agent.accountNumber = changes.accountNumber;
        if (changes.accountType !== undefined) agent.accountType = changes.accountType;
        if (changes.accountHolderName !== undefined) agent.accountHolderName = changes.accountHolderName;

        if (changes.profilePhoto !== undefined) agent.profilePhoto = changes.profilePhoto;

        await agent.save();
      }
    }

    await updateRequest.save();

    // Send email notification to agent
    await sendAgentProfileUpdateStatusEmail(
      updateRequest.agentEmail,
      updateRequest.agentName,
      updateRequest.agentId,
      status,
      updateRequest.requestType,
      updateRequest.reviewNote,
      updateRequest.branch
    );

    res.json({
      message: `Agent profile update request has been ${status.toLowerCase()} successfully.`,
      request: updateRequest
    });
  } catch (err) {
    console.error("Review agent profile update request error:", err);
    res.status(500).json({ error: err.message || "An internal server error occurred." });
  }
});

// ==========================================
// --- API: Branch Profile Management & Requests ---
// ==========================================

// GET branch profile details & live branch stats: /api/office-staff/profile
router.get("/profile", async (req, res) => {
  try {
    const { email, branch } = req.query;
    if (!email && !branch) {
      return res.status(400).json({ error: "Branch email or branch name is required." });
    }

    const query = {};
    if (email) query.email = email.trim().toLowerCase();
    else if (branch) query.branch = branch.trim();

    const staff = await OfficeStaff.findOne(query, { password: 0 });
    if (!staff) {
      return res.status(404).json({ error: "Branch office profile not found." });
    }

    const branchName = staff.branch;

    // Fetch live branch statistics
    const [policyHoldersCount, agentsCount, totalClaimsCount, activeClaimsCount, pendingClaimsCount] = await Promise.all([
      User.countDocuments({ branch: branchName }),
      Agent.countDocuments({ branch: branchName }),
      Claim.countDocuments({ branch: branchName }),
      Claim.countDocuments({ branch: branchName, status: "In Progress" }),
      Claim.countDocuments({ branch: branchName, status: "Pending" })
    ]);

    res.json({
      branch: staff,
      stats: {
        totalPolicyHolders: policyHoldersCount,
        totalAgents: agentsCount,
        totalClaims: totalClaimsCount,
        activeClaims: activeClaimsCount,
        pendingClaims: pendingClaimsCount
      }
    });
  } catch (err) {
    console.error("Fetch branch profile error:", err);
    res.status(500).json({ error: "An internal server error occurred while retrieving branch profile." });
  }
});

// POST submit a branch profile update request to Admin: /api/office-staff/profile-update-request
router.post("/profile-update-request", async (req, res) => {
  try {
    const { email, requestType, requestedChanges, reason } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Branch email is required." });
    }

    if (!requestedChanges || Object.keys(requestedChanges).length === 0) {
      return res.status(400).json({ error: "No changes specified in request." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const staff = await OfficeStaff.findOne({ email: cleanEmail });
    if (!staff) {
      return res.status(404).json({ error: "Branch office not found." });
    }

    // Check if there is already an active Pending request from this branch
    const existingPending = await BranchProfileUpdateRequest.findOne({
      branchId: staff._id,
      status: "Pending"
    });

    const originalData = {
      name: staff.name || "",
      email: staff.email || "",
      mobile: staff.mobile || "",
      branch: staff.branch || "",
      province: staff.province || "",
      district: staff.district || "",
      area: staff.area || "",
      location: staff.location || "",
      staffCount: staff.staffCount || 1,
      hotline: staff.hotline || "",
      managerName: staff.managerName || "",
      managerEmail: staff.managerEmail || "",
      managerMobile: staff.managerMobile || "",
      operatingHours: staff.operatingHours || "",
      notes: staff.notes || ""
    };

    // Sanitize requested changes
    const allowedFields = [
      "name", "mobile", "branch", "province", "district", "area", "location",
      "staffCount", "hotline", "managerName", "managerEmail", "managerMobile",
      "operatingHours", "notes", "profilePhoto"
    ];

    const sanitizedChanges = {};
    for (const field of allowedFields) {
      if (requestedChanges[field] !== undefined) {
        sanitizedChanges[field] = typeof requestedChanges[field] === "string" 
          ? requestedChanges[field].trim() 
          : requestedChanges[field];
      }
    }

    let savedRequest;
    if (existingPending) {
      // Update existing pending request
      existingPending.requestType = requestType || existingPending.requestType || "Branch Details";
      existingPending.requestedChanges = { ...existingPending.requestedChanges, ...sanitizedChanges };
      existingPending.reason = reason !== undefined ? reason.trim() : existingPending.reason;
      existingPending.updatedAt = new Date();
      savedRequest = await existingPending.save();
    } else {
      // Create new pending request
      savedRequest = new BranchProfileUpdateRequest({
        branchId: staff._id,
        branchName: staff.branch,
        staffName: staff.name,
        email: staff.email,
        mobile: staff.mobile,
        requestType: requestType || "Branch Details",
        originalData,
        requestedChanges: sanitizedChanges,
        reason: reason ? reason.trim() : "",
        status: "Pending"
      });
      await savedRequest.save();
    }

    res.status(201).json({
      message: "Branch profile update request submitted successfully. It has been routed to the Head Office Admin for verification.",
      request: savedRequest
    });
  } catch (err) {
    console.error("Submit branch profile update request error:", err);
    res.status(500).json({ error: err.message || "An internal server error occurred." });
  }
});

// POST request branch password change (requires Admin approval): /api/office-staff/request-password-change
router.post("/request-password-change", async (req, res) => {
  try {
    const { email, currentPassword, newPassword, reason } = req.body;
    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ error: "Email, current password, and new password are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters long." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const staff = await OfficeStaff.findOne({ email: cleanEmail });
    if (!staff) {
      return res.status(404).json({ error: "Office staff member not found." });
    }

    // Verify current existing password
    const hashedCurrent = hashPassword(currentPassword);
    if (staff.password !== hashedCurrent) {
      return res.status(400).json({ error: "Incorrect current password. Please enter your active password to authenticate this request." });
    }

    const hashedNew = hashPassword(newPassword);
    if (hashedNew === staff.password) {
      return res.status(400).json({ error: "New password cannot be the same as your current password." });
    }

    // Check if there is already an active Pending request of type Password & Security
    const existingPending = await BranchProfileUpdateRequest.findOne({
      branchId: staff._id,
      requestType: "Password & Security",
      status: "Pending"
    });

    const originalData = {
      "Account Security": "Current Branch Password (Active)"
    };

    const requestedChanges = {
      "Account Security": "New Password (Awaiting Admin Approval)",
      pendingPasswordHash: hashedNew
    };

    let savedRequest;
    if (existingPending) {
      existingPending.requestedChanges = requestedChanges;
      existingPending.reason = reason ? reason.trim() : existingPending.reason;
      existingPending.updatedAt = new Date();
      savedRequest = await existingPending.save();
    } else {
      savedRequest = new BranchProfileUpdateRequest({
        branchId: staff._id,
        branchName: staff.branch,
        staffName: staff.name,
        email: staff.email,
        mobile: staff.mobile,
        requestType: "Password & Security",
        originalData,
        requestedChanges,
        reason: reason ? reason.trim() : "Branch requested password change via Security settings.",
        status: "Pending"
      });
      await savedRequest.save();
    }

    res.status(201).json({
      message: "Password change request submitted successfully. It has been routed to Head Office Administration for review and approval.",
      request: savedRequest
    });
  } catch (err) {
    console.error("Request branch password change error:", err);
    res.status(500).json({ error: err.message || "An internal server error occurred while submitting password change request." });
  }
});

// GET branch's own profile update requests: /api/office-staff/profile-update-requests
router.get("/profile-update-requests", async (req, res) => {
  try {
    const { email, branch } = req.query;
    if (!email && !branch) {
      return res.status(400).json({ error: "Branch email or branch name is required." });
    }

    const query = {};
    if (email) query.email = email.trim().toLowerCase();
    else if (branch) query.branchName = branch.trim();

    const requests = await BranchProfileUpdateRequest.find(query).sort({ createdAt: -1 }).lean();
    
    // Sanitize pending password hash from output
    const sanitizedRequests = requests.map((r) => {
      if (r.requestedChanges && r.requestedChanges.pendingPasswordHash) {
        const { pendingPasswordHash, ...restChanges } = r.requestedChanges;
        return { ...r, requestedChanges: restChanges };
      }
      return r;
    });

    res.json({ requests: sanitizedRequests });
  } catch (err) {
    console.error("Fetch branch profile update requests error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// PUT update branch profile photo: /api/office-staff/profile-photo
router.put("/profile-photo", async (req, res) => {
  try {
    const { email, photo } = req.body;
    if (!email || !photo) {
      return res.status(400).json({ error: "Branch email and photo are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const staff = await OfficeStaff.findOne({ email: cleanEmail });
    if (!staff) {
      return res.status(404).json({ error: "Branch office not found." });
    }

    let photoUrl = photo;
    if (photo.startsWith("data:image")) {
      const uploadRes = await uploadToCloudinary(photo, `branch_photos/${staff.branch}`);
      if (uploadRes && uploadRes.url) {
        photoUrl = uploadRes.url;
      }
    }

    staff.profilePhoto = photoUrl;
    await staff.save();

    res.json({
      message: "Branch profile photo updated successfully.",
      profilePhoto: photoUrl
    });
  } catch (err) {
    console.error("Update branch profile photo error:", err);
    res.status(500).json({ error: err.message || "An internal server error occurred." });
  }
});

export default router;
