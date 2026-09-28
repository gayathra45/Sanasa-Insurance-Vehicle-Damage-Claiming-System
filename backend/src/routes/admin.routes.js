import express from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import Admin from "../models/admin.model.js";
import User from "../models/user.model.js";
import Claim from "../models/claim.model.js";
import OfficeStaff from "../models/office_staff.model.js";
import Agent from "../models/agent.model.js";
import AgentActivity from "../models/agent_activity.model.js";
import Inquiry from "../models/inquiry.model.js";
import BranchProfileUpdateRequest from "../models/branch_profile_update_request.model.js";
import { hashPassword } from "../utils/crypto.js";
import { sendEmail, getBaseTemplate, sendBranchProfileUpdateStatusEmail } from "../utils/email.js";

const router = express.Router();

// POST admin login: /api/admin/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and Password are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const admin = await Admin.findOne({ email: cleanEmail });
    if (!admin) {
      return res.status(400).json({ error: "Invalid Email or Password." });
    }

    const hashedInput = hashPassword(password);
    if (admin.password !== hashedInput) {
      return res.status(400).json({ error: "Invalid Email or Password." });
    }

    // Return admin object without password
    const adminObj = admin.toObject();
    delete adminObj.password;

    res.json({ message: "Admin login successful", admin: adminObj });
  } catch (err) {
    console.error("Admin login API error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// GET admin profile details & system metrics: /api/admin/profile
router.get("/profile", async (req, res) => {
  try {
    const { email, id } = req.query;
    if (!email && !id) {
      return res.status(400).json({ error: "Admin email or ID is required." });
    }

    const query = {};
    if (email) query.email = email.trim().toLowerCase();
    if (id) query._id = id;

    const admin = await Admin.findOne(query, { password: 0 })
      .populate("registeredBy", "name email")
      .populate("approvedBy", "name email");

    if (!admin) {
      return res.status(404).json({ error: "Administrator record not found." });
    }

    // System-wide statistics for the executive dashboard / profile view
    const totalStaff = await OfficeStaff.countDocuments();
    const totalAgents = await Agent.countDocuments();
    const totalPolicyHolders = await User.countDocuments({ status: "Approved" });
    const totalClaims = await Claim.countDocuments();
    const pendingClaims = await Claim.countDocuments({ status: "Pending" });
    const pendingBranchRequests = await BranchProfileUpdateRequest.countDocuments({ status: "Pending" });
    const totalAdmins = await Admin.countDocuments({ status: "Approved" });

    res.json({
      admin,
      systemStats: {
        totalStaff,
        totalAgents,
        totalPolicyHolders,
        totalClaims,
        pendingClaims,
        pendingBranchRequests,
        totalAdmins
      }
    });
  } catch (err) {
    console.error("Fetch admin profile error:", err);
    res.status(500).json({ error: "An internal server error occurred while retrieving admin profile." });
  }
});

// GET admin dashboard stats: /api/admin/dashboard-stats
router.post("/dashboard-stats", async (req, res) => {
  // Support POST request for stats
});

router.get("/dashboard-stats", async (req, res) => {
  try {
    // 30 days time window
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
    const dateFilter = { createdAt: { $gte: oneMonthAgo } };

    // 1. KPI Counts (last 30 days & overall)
    const policyHoldersCount = await User.countDocuments();
    const totalClaimsCount = await Claim.countDocuments();
    const activeClaimsCount = await Claim.countDocuments({ status: "In Progress" });
    const pendingClaimsCount = await Claim.countDocuments({ status: "Pending" });

    // Additional general stats
    const totalAgentsCount = await Agent.countDocuments();
    const totalBranchesCount = await OfficeStaff.countDocuments();

    // 2. Branch Performances (Calculated dynamically from claims data)
    const totalClaimsOverall = await Claim.countDocuments();
    const claimsByBranch = await Claim.aggregate([
      { $group: { _id: "$branch", count: { $sum: 1 } } }
    ]);
    const branchColorMap = {
      Galle: "bg-red-500",
      Matara: "bg-green-500",
      Anuradhapura: "bg-blue-500",
      Embilipitiya: "bg-orange-400",
    };
    const mappedBranches = claimsByBranch.map(cb => {
      const name = cb._id || "Unassigned";
      const count = cb.count;
      const percentage = totalClaimsOverall > 0 ? Math.round((count / totalClaimsOverall) * 100) : 0;
      return {
        name,
        percentage,
        count,
        color: branchColorMap[name] || "bg-slate-400"
      };
    }).sort((a, b) => b.count - a.count);

    // Fallback if no branches have claims yet
    const branches = mappedBranches.length > 0 ? mappedBranches : [
      { name: "Galle", percentage: 0, count: 0, color: "bg-red-500" },
      { name: "Matara", percentage: 0, count: 0, color: "bg-green-500" },
      { name: "Anuradhapura", percentage: 0, count: 0, color: "bg-blue-500" },
      { name: "Embilipitiya", percentage: 0, count: 0, color: "bg-orange-400" }
    ];

    // 3. Monthly Claims (Aggregated by month, filtered to last 30 days)
    const claimsByMonth = await Claim.aggregate([
      {
        $match: dateFilter
      },
      {
        $project: {
          month: { $month: "$createdAt" },
          status: "$status"
        }
      },
      {
        $group: {
          _id: { month: "$month" },
          submittedCount: { $sum: 1 },
          approvedCount: {
            $sum: { $cond: [{ $eq: ["$status", "Approved"] }, 1, 0] }
          }
        }
      }
    ]);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyClaims = monthNames.map((name, index) => {
      const monthNum = index + 1;
      const match = claimsByMonth.find(c => c._id.month === monthNum);
      return {
        month: name,
        submitted: match ? match.submittedCount : 0,
        approved: match ? match.approvedCount : 0
      };
    });

    // 4. Pending Branch Staff Password Resets
    const pendingBranchResets = await OfficeStaff.find({ resetRequestStatus: "Pending" }, { password: 0 })
      .sort({ createdAt: -1 });

    // 5. Pending Admin Password Resets
    const pendingAdminResets = await Admin.find({ resetRequestStatus: "Pending" }, { password: 0 })
      .sort({ createdAt: -1 });

    // 6. Pending Branch Profile Update Requests
    const pendingBranchProfileRequests = await BranchProfileUpdateRequest.find({ status: "Pending" })
      .sort({ createdAt: -1 });

    res.json({
      stats: {
        policyHolders: policyHoldersCount,
        totalClaims: totalClaimsCount,
        activeClaims: activeClaimsCount,
        pendingClaims: pendingClaimsCount,
        totalAgents: totalAgentsCount,
        totalBranches: totalBranchesCount,
        pendingBranchProfileRequestsCount: pendingBranchProfileRequests.length
      },
      branches,
      monthlyClaims,
      pendingBranchResets,
      pendingAdminResets,
      pendingBranchProfileRequests
    });
  } catch (err) {
    console.error("Admin dashboard stats API error:", err);
    res.status(500).json({ error: "An internal server error occurred fetching dashboard statistics." });
  }
});

// GET all office staff: /api/admin/staff
router.get("/staff", async (req, res) => {
  try {
    const staff = await OfficeStaff.find({}, { password: 0 }).sort({ createdAt: -1 });
    res.json({ staff });
  } catch (err) {
    console.error("Fetch admin staff error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// GET aggregated admin notifications: /api/admin/notifications
router.get("/notifications", async (req, res) => {
  try {
    const compiled = [];

    // 1. Claims notifications
    const claims = await Claim.find({}).sort({ createdAt: -1 });
    claims.forEach((claim) => {
      // A. Unassigned Claim
      if (claim.status === "Pending" && (!claim.assignedAgent || claim.assignedAgent.trim() === "")) {
        compiled.push({
          id: `${claim._id}-unassigned`,
          type: "urgent",
          category: "claims",
          title: "Claim Awaiting Agent Assignment",
          description: `Claim ${claim.claimNumber} for vehicle ${claim.vehiclePlate} has been registered and is waiting for an agent assignment.`,
          date: claim.createdAt,
          isUrgent: true,
          link: `/Admin/Claims?claimId=${claim.claimNumber}`,
          actionLabel: "View Claims",
          claim
        });
      }

      // B. Inspection Report Submitted (awaiting staff/admin decision)
      if (claim.inspectionSubmitted && claim.status !== "Approved" && claim.status !== "Rejected") {
        compiled.push({
          id: `${claim._id}-inspection-submitted`,
          type: "action",
          category: "claims",
          title: "Inspection Report Submitted",
          description: `Agent ${claim.assignedAgent || "assigned"} has uploaded the physical inspection report for claim ${claim.claimNumber}. Ready for review.`,
          date: claim.createdAt, // Or the date of the inspection report update if tracked separately
          isUrgent: false,
          link: `/Admin/Claims?claimId=${claim.claimNumber}`,
          actionLabel: "Review Assessment",
          claim
        });
      }

      // C. Claim Finalized (Approved/Rejected)
      if (claim.status === "Approved" || claim.status === "Rejected") {
        compiled.push({
          id: `${claim._id}-finalized`,
          type: "decision",
          category: "claims",
          title: `Claim ${claim.claimNumber} ${claim.status}`,
          description: `The insurance claim for vehicle ${claim.vehiclePlate} has been finalized. Final Status: ${claim.status}.`,
          date: claim.createdAt,
          isUrgent: false,
          link: `/Admin/Claims?claimId=${claim.claimNumber}`,
          actionLabel: "View Claim Details",
          claim
        });
      }

      // D. Office Staff message notification
      if (claim.messages && claim.messages.length > 0) {
        const staffMessages = claim.messages.filter((msg) => {
          const senderLower = (msg.sender || "").toLowerCase();
          return senderLower.includes("staff") || senderLower.includes("office") || senderLower.includes("admin");
        });
        if (staffMessages.length > 0) {
          const lastStaffMsg = staffMessages[staffMessages.length - 1];
          compiled.push({
            id: `${claim._id}-staff-msg-${lastStaffMsg.sentAt}`,
            type: "staff_message",
            category: "staff_messages",
            title: `Message from Office Staff on Claim ${claim.claimNumber}`,
            description: `From ${lastStaffMsg.sender}: "${lastStaffMsg.message}"`,
            date: lastStaffMsg.sentAt,
            isUrgent: false,
            link: `/Admin/Claims?claimId=${claim.claimNumber}`,
            actionLabel: "View Claim Details",
            claim
          });
        }
      }
    });

    // 2. Policy Holder notifications
    const users = await User.find({}, { password: 0, documents: 0, bankDetails: 0 }).sort({ createdAt: -1 });
    users.forEach((user) => {
      // A. Pending portal registration
      if (user.status === "Pending" || (user.status !== "Approved" && user.status !== "Rejected")) {
        compiled.push({
          id: `${user._id}-pending-reg`,
          type: "decision",
          category: "policy_holders",
          title: "Pending Portal Registration",
          description: `Policy Holder registration request from ${user.firstName} ${user.lastName} (NIC: ${user.nic}) is awaiting approval.`,
          date: user.createdAt,
          isUrgent: false,
          link: `/Admin/PolicyHolders?ref=${user.referenceNumber}`,
          actionLabel: "Review Registration",
          user
        });
      }

      // B. Pending vehicle approval
      if (user.vehicles && Array.isArray(user.vehicles)) {
        user.vehicles.forEach((vehicle) => {
          if (!vehicle.status || vehicle.status === "Pending") {
            compiled.push({
              id: `${user._id}-vehicle-${vehicle.numberPlate}`,
              type: "action",
              category: "policy_holders",
              title: "New Vehicle Verification Pending",
              description: `Vehicle ${vehicle.numberPlate} (${vehicle.company} ${vehicle.model}) added by Policy Holder (NIC: ${user.nic}) requires verification.`,
              date: user.createdAt,
              isUrgent: false,
              link: `/Admin/PolicyHolders?nic=${user.nic}`,
              actionLabel: "Verify Vehicle",
              user,
              vehicle
            });
          }
        });
      }
    });

    // 3. Agent notifications
    const agents = await Agent.find({}, { password: 0, nicFront: 0, nicBack: 0, birthCertificate: 0, policeReport: 0 }).sort({ createdAt: -1 });
    agents.forEach((agent) => {
      // A. Inactive agent
      if (agent.status === "inactive") {
        compiled.push({
          id: `${agent._id}-inactive-agent`,
          type: "info",
          category: "agents",
          title: "Agent Account Pending Activation",
          description: `Agent ${agent.name} (${agent.email}) has been registered but is currently inactive.`,
          date: agent.createdAt,
          isUrgent: false,
          link: `/Admin/Agents?email=${agent.email}`,
          actionLabel: "View Agent",
          agent
        });
      }
    });

    // 4. Branch Profile Update Request notifications
    const branchRequests = await BranchProfileUpdateRequest.find({ status: "Pending" }).sort({ createdAt: -1 });
    branchRequests.forEach((brReq) => {
      const isPasswordReq = brReq.requestType === "Password & Security";
      compiled.push({
        id: `${brReq._id}-branch-profile-req`,
        type: "action",
        category: "branches",
        title: isPasswordReq ? "Branch Password Change Request" : "Branch Profile Edit Request",
        description: isPasswordReq
          ? `The ${brReq.branchName} Branch submitted a new password change request awaiting Admin approval.`
          : `The ${brReq.branchName} Branch submitted a profile update request (${brReq.requestType}) awaiting Admin review.`,
        date: brReq.createdAt,
        isUrgent: true,
        link: `/Admin/Staff?tab=requests&requestId=${brReq._id}`,
        actionLabel: "Review Request",
        branchRequest: brReq
      });
    });

    // Sort: Urgent first, then newest first
    compiled.sort((a, b) => {
      if (a.isUrgent && !b.isUrgent) return -1;
      if (!a.isUrgent && b.isUrgent) return 1;
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });

    res.json({ notifications: compiled });
  } catch (err) {
    console.error("Fetch admin notifications error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// POST create a new office staff member: /api/admin/staff
router.post("/staff", async (req, res) => {
  try {
    const { name, email, mobile, branch, province, district, area, location, staffCount, password } = req.body;

    if (!name || !email || !mobile || !branch || !province || !district || !area || !location || staffCount === undefined) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const cleanMobile = mobile.replace(/[-+()\s]/g, "");
    if (!/^\d{10}$/.test(cleanMobile)) {
      return res.status(400).json({ error: "Mobile number must be exactly 10 digits." });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if email already exists in OfficeStaff, User, Agent, or Admin
    const existingOfficeStaff = await OfficeStaff.findOne({ email: cleanEmail });
    if (existingOfficeStaff) {
      return res.status(400).json({ error: "An office staff account with this Email is already registered." });
    }

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({ error: "A user with this Email is already registered." });
    }

    const existingAgent = await Agent.findOne({ email: cleanEmail });
    if (existingAgent) {
      return res.status(400).json({ error: "An agent with this Email is already registered." });
    }

    const existingAdmin = await Admin.findOne({ email: cleanEmail });
    if (existingAdmin) {
      return res.status(400).json({ error: "An admin account with this Email is already registered." });
    }

    const tempPassword = password || ("SAN" + Math.floor(100 + Math.random() * 900) + "@" + Math.floor(10 + Math.random() * 90));
    const hashedPassword = hashPassword(tempPassword);

    const newStaff = new OfficeStaff({
      name: name.trim(),
      email: cleanEmail,
      mobile: mobile.trim(),
      branch: branch.trim(),
      province: province.trim(),
      district: district.trim(),
      area: area.trim(),
      location: location.trim(),
      staffCount: Number(staffCount),
      password: hashedPassword,
      mustChangePassword: true
    });
    await newStaff.save();

    // Send welcome email with login details to the branch staff's email
    const subject = `Welcome to Sanasa Insurance — Your Branch Staff Credentials`;
    const htmlBody = getBaseTemplate(
      subject,
      `
      <h2>Branch Staff Account Created Successfully</h2>
      <p>Dear <strong>${name.trim()}</strong>,</p>
      <p>Your branch office staff login credentials and registration details for the <strong>${branch.trim()}</strong> branch have been created:</p>
      <table class="data-table" style="border-collapse: collapse; width: 100%; max-width: 500px; margin: 20px 0;">
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 8px; font-weight: bold; width: 150px;">Role:</td>
          <td style="padding: 8px;">Branch Office Staff</td>
        </tr>
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 8px; font-weight: bold;">Login Email:</td>
          <td style="padding: 8px;">${cleanEmail}</td>
        </tr>
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 8px; font-weight: bold;">Password:</td>
          <td style="padding: 8px; font-family: monospace; font-size: 16px; color: #1b75e0;">${tempPassword}</td>
        </tr>
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 8px; font-weight: bold;">Province:</td>
          <td style="padding: 8px;">${province.trim()}</td>
        </tr>
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 8px; font-weight: bold;">Office Location:</td>
          <td style="padding: 8px;">${location.trim()}</td>
        </tr>
      </table>
      <p>Please use these credentials to log in to the Sanasa Insurance staff portal.</p>
      `
    );

    try {
      await sendEmail({
        to: cleanEmail,
        subject,
        html: htmlBody
      });
    } catch (emailErr) {
      console.error("Failed to send welcome email to branch:", emailErr);
    }

    const staffObj = newStaff.toObject();
    delete staffObj.password;

    res.status(201).json({ message: "Office staff registered successfully", staff: staffObj });
  } catch (err) {
    console.error("Create staff API error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// PUT edit office staff member details: /api/admin/staff/:id
router.put("/staff/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, mobile, branch, province, district, area, location, staffCount } = req.body;

    const staff = await OfficeStaff.findById(id);
    if (!staff) {
      return res.status(404).json({ error: "Office staff member not found." });
    }

    if (email && email.trim().toLowerCase() !== staff.email) {
      const cleanEmail = email.trim().toLowerCase();
      // Check if email already exists
      const existingEmail = await OfficeStaff.findOne({ email: cleanEmail });
      if (existingEmail) {
        return res.status(400).json({ error: "An office staff account with this Email is already registered." });
      }
    }

    if (name) staff.name = name.trim();
    if (email) staff.email = email.trim().toLowerCase();
    if (mobile) staff.mobile = mobile.trim();
    if (branch) staff.branch = branch.trim();
    if (province) staff.province = province.trim();
    if (district) staff.district = district.trim();
    if (area) staff.area = area.trim();
    if (location) staff.location = location.trim();
    if (staffCount !== undefined) staff.staffCount = Number(staffCount);

    await staff.save();

    const staffObj = staff.toObject();
    delete staffObj.password;

    res.json({ message: "Office staff updated successfully", staff: staffObj });
  } catch (err) {
    console.error("Update staff error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// DELETE office staff member: /api/admin/staff/:id
router.delete("/staff/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await OfficeStaff.findByIdAndDelete(id);
    if (!staff) {
      return res.status(404).json({ error: "Office staff member not found." });
    }
    res.json({ message: "Office staff member deleted successfully." });
  } catch (err) {
    console.error("Delete staff error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// GET all pending branch password reset requests: /api/admin/staff/password-requests
router.get("/staff/password-requests", async (req, res) => {
  try {
    const requests = await OfficeStaff.find({ resetRequestStatus: "Pending" }, { password: 0 });
    res.json({ requests });
  } catch (err) {
    console.error("Fetch staff password requests error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// POST approve branch password reset request: /api/admin/staff/password-requests/approve
router.post("/staff/password-requests/approve", async (req, res) => {
  try {
    const { staffId } = req.body;
    if (!staffId) return res.status(400).json({ error: "Staff ID is required." });

    const staff = await OfficeStaff.findById(staffId);
    if (!staff) return res.status(404).json({ error: "Branch not found." });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    staff.resetOtp = crypto.createHash("sha256").update(otp).digest("hex");
    staff.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    staff.resetOtpRequestedAt = new Date();
    staff.resetRequestStatus = "Approved";
    await staff.save();

    // Prepare email HTML and Text
    const resetUrl = `http://localhost:3000/Reset_password?email=${encodeURIComponent(staff.email)}&stage=otp`;
    const htmlBody = getBaseTemplate(
      "Password Reset Verification Code",
      `
      <h2>Password Reset Request Approved</h2>
      <p>Hi <strong>${staff.name}</strong>,</p>
      <p>Your password reset request has been approved by the Admin. Use the verification code below to reset your password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <div class="otp-code">${otp}</div>
      </div>
      <p style="text-align: center; font-size: 14px; color: #4a5568;">
        This code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.
      </p>
      <p>Please click the link below to enter your verification code and set a new password:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #ff9800; color: #ffffff; padding: 12px 24px; border-radius: 25px; text-decoration: none; font-weight: bold; display: inline-block;">Reset Password</a>
      </p>
      `
    );
    const textBody = `Your branch password reset code is: ${otp}\n\nReset link: ${resetUrl}\n\nThis code expires in 10 minutes. Do not share it with anyone.`;

    let emailSent = false;
    let emailError = null;
    try {
      const result = await sendEmail(staff.email, `${otp} — Branch Password Reset Verification Code`, htmlBody, textBody);
      emailSent = result.sent;
      emailError = result.error || null;
    } catch (sendErr) {
      emailError = sendErr.message;
    }

    res.json({
      message: emailSent ? "Password request approved. OTP sent to branch email." : "Dev Mode: Request approved, OTP generated (email not sent).",
      emailSent,
      emailError,
      devOtp: emailSent ? undefined : otp
    });
  } catch (err) {
    console.error("Approve staff password request error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// POST reject branch password reset request: /api/admin/staff/password-requests/reject
router.post("/staff/password-requests/reject", async (req, res) => {
  try {
    const { staffId } = req.body;
    if (!staffId) return res.status(400).json({ error: "Staff ID is required." });

    const staff = await OfficeStaff.findById(staffId);
    if (!staff) return res.status(404).json({ error: "Branch not found." });

    staff.resetRequestStatus = "None";
    staff.resetOtp = undefined;
    staff.resetOtpExpires = undefined;
    staff.resetOtpRequestedAt = undefined;
    await staff.save();

    res.json({ message: "Password request rejected successfully." });
  } catch (err) {
    console.error("Reject staff password request error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// ==========================================
// --- API: Branch Profile Update Requests (Admin Review) ---
// ==========================================

// GET all branch profile update requests: /api/admin/branch-profile-requests
router.get("/branch-profile-requests", async (req, res) => {
  try {
    const { status, branch } = req.query;
    const query = {};
    if (status && status !== "All") {
      query.status = status;
    }
    if (branch) {
      query.branchName = branch.trim();
    }

    const requests = await BranchProfileUpdateRequest.find(query).sort({ createdAt: -1 }).lean();
    
    // Sanitize any sensitive password hash from output
    const sanitizedRequests = requests.map((r) => {
      if (r.requestedChanges && r.requestedChanges.pendingPasswordHash) {
        const { pendingPasswordHash, ...restChanges } = r.requestedChanges;
        return { ...r, requestedChanges: restChanges };
      }
      return r;
    });

    res.json({ requests: sanitizedRequests });
  } catch (err) {
    console.error("Fetch branch profile requests error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// POST approve branch profile update request: /api/admin/branch-profile-requests/approve
router.post("/branch-profile-requests/approve", async (req, res) => {
  try {
    const { requestId, adminName, reviewNote } = req.body;
    if (!requestId) {
      return res.status(400).json({ error: "Request ID is required." });
    }

    const updateRequest = await BranchProfileUpdateRequest.findById(requestId);
    if (!updateRequest) {
      return res.status(404).json({ error: "Branch profile update request not found." });
    }

    if (updateRequest.status === "Approved") {
      return res.status(400).json({ error: "This request has already been approved." });
    }

    const staff = await OfficeStaff.findById(updateRequest.branchId);
    if (!staff) {
      return res.status(404).json({ error: "Associated branch office staff record not found." });
    }

    const changes = updateRequest.requestedChanges || {};

    // Apply approved password change if present
    if (changes.pendingPasswordHash) {
      staff.password = changes.pendingPasswordHash;
      staff.mustChangePassword = false;
    }

    // Apply approved changes to OfficeStaff record
    if (changes.name !== undefined && changes.name.trim()) staff.name = changes.name.trim();
    if (changes.mobile !== undefined && changes.mobile.trim()) staff.mobile = changes.mobile.trim();
    if (changes.branch !== undefined && changes.branch.trim()) staff.branch = changes.branch.trim();
    if (changes.province !== undefined && changes.province.trim()) staff.province = changes.province.trim();
    if (changes.district !== undefined && changes.district.trim()) staff.district = changes.district.trim();
    if (changes.area !== undefined && changes.area.trim()) staff.area = changes.area.trim();
    if (changes.location !== undefined && changes.location.trim()) staff.location = changes.location.trim();
    if (changes.staffCount !== undefined && changes.staffCount !== null) staff.staffCount = Number(changes.staffCount);
    if (changes.hotline !== undefined) staff.hotline = changes.hotline.trim();
    if (changes.managerName !== undefined) staff.managerName = changes.managerName.trim();
    if (changes.managerEmail !== undefined) staff.managerEmail = changes.managerEmail.trim().toLowerCase();
    if (changes.managerMobile !== undefined) staff.managerMobile = changes.managerMobile.trim();
    if (changes.operatingHours !== undefined) staff.operatingHours = changes.operatingHours.trim();
    if (changes.notes !== undefined) staff.notes = changes.notes.trim();
    if (changes.profilePhoto !== undefined) staff.profilePhoto = changes.profilePhoto;

    await staff.save();

    // Mark update request as Approved
    updateRequest.status = "Approved";
    updateRequest.reviewedBy = adminName || "Admin";
    updateRequest.reviewedAt = new Date();
    updateRequest.reviewNote = reviewNote || (updateRequest.requestType === "Password & Security" 
      ? "Branch password change verified and approved by Head Office Admin." 
      : "Branch profile updates verified and approved.");
    updateRequest.updatedAt = new Date();
    await updateRequest.save();

    // Send email notification to branch
    await sendBranchProfileUpdateStatusEmail(
      updateRequest.email,
      updateRequest.branchName,
      updateRequest.staffName,
      "Approved",
      updateRequest.requestType,
      updateRequest.reviewNote
    );

    const staffObj = staff.toObject();
    delete staffObj.password;

    res.json({
      message: `Branch profile update request for ${updateRequest.branchName} Branch has been approved successfully.`,
      request: updateRequest,
      staff: staffObj
    });
  } catch (err) {
    console.error("Approve branch profile request error:", err);
    res.status(500).json({ error: err.message || "An internal server error occurred." });
  }
});

// POST reject branch profile update request: /api/admin/branch-profile-requests/reject
router.post("/branch-profile-requests/reject", async (req, res) => {
  try {
    const { requestId, adminName, reviewNote } = req.body;
    if (!requestId) {
      return res.status(400).json({ error: "Request ID is required." });
    }

    const updateRequest = await BranchProfileUpdateRequest.findById(requestId);
    if (!updateRequest) {
      return res.status(404).json({ error: "Branch profile update request not found." });
    }

    // Mark update request as Rejected
    updateRequest.status = "Rejected";
    updateRequest.reviewedBy = adminName || "Admin";
    updateRequest.reviewedAt = new Date();
    updateRequest.reviewNote = reviewNote || "Request was not approved. Please contact Head Office administration.";
    updateRequest.updatedAt = new Date();
    await updateRequest.save();

    // Send email notification to branch
    await sendBranchProfileUpdateStatusEmail(
      updateRequest.email,
      updateRequest.branchName,
      updateRequest.staffName,
      "Rejected",
      updateRequest.requestType,
      updateRequest.reviewNote
    );

    res.json({
      message: `Branch profile update request for ${updateRequest.branchName} Branch has been rejected.`,
      request: updateRequest
    });
  } catch (err) {
    console.error("Reject branch profile request error:", err);
    res.status(500).json({ error: err.message || "An internal server error occurred." });
  }
});

// GET all active admins: /api/admin/admins/all
router.get("/admins/all", async (req, res) => {
  try {
    const admins = await Admin.find({ status: "Approved" }, { password: 0 }).sort({ createdAt: -1 });
    res.json({ admins });
  } catch (err) {
    console.error("Fetch all admins error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// POST register new admin (pending approval): /api/admin/register-admin
router.post("/register-admin", async (req, res) => {
  try {
    const { name, email, mobile, nic, registeredBy } = req.body;
    if (!name || !email || !mobile || !nic || !registeredBy) {
      return res.status(400).json({ error: "All profile fields are required." });
    }
    const cleanEmail = email.trim().toLowerCase();
    const cleanNic = nic.trim();
    const cleanMobile = mobile.replace(/[-+()\s]/g, "");

    if (!/^\d{10}$/.test(cleanMobile)) {
      return res.status(400).json({ error: "Mobile number must be exactly 10 digits." });
    }

    const nicRegex = /^[0-9vVxX]{10,12}$/;
    if (!nicRegex.test(cleanNic)) {
      return res.status(400).json({ error: "Invalid NIC number. Must be between 10 and 12 characters/digits." });
    }

    // Check if already exists in Admin
    const existingAdmin = await Admin.findOne({
      $or: [{ email: cleanEmail }, { nic: cleanNic }, { mobile: cleanMobile }]
    });
    if (existingAdmin) {
      return res.status(400).json({ error: "An administrator with this email, NIC, or mobile number already exists." });
    }

    // Generate a temporary random placeholder password
    const tempPlaceholderPassword = hashPassword(crypto.randomBytes(16).toString("hex"));

    const newAdmin = new Admin({
      name: name.trim(),
      email: cleanEmail,
      mobile: cleanMobile,
      nic: cleanNic,
      password: tempPlaceholderPassword,
      status: "Pending",
      mustChangePassword: true,
      registeredBy
    });

    await newAdmin.save();
    res.status(201).json({ message: "Admin registration request submitted. Awaiting approval from another administrator." });
  } catch (err) {
    console.error("Register admin request error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// GET all pending admin registration requests: /api/admin/admins/pending
router.get("/admins/pending", async (req, res) => {
  try {
    const { adminId } = req.query;
    if (!adminId) return res.status(400).json({ error: "Admin ID is required." });

    const requests = await Admin.find({
      status: "Pending",
      registeredBy: { $ne: adminId }
    }, { password: 0 }).sort({ createdAt: -1 });

    res.json({ requests });
  } catch (err) {
    console.error("Fetch pending admins error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// POST approve admin registration request: /api/admin/admins/approve
router.post("/admins/approve", async (req, res) => {
  try {
    const { targetAdminId, approvingAdminId } = req.body;
    if (!targetAdminId || !approvingAdminId) {
      return res.status(400).json({ error: "Target Admin ID and Approving Admin ID are required." });
    }

    const targetAdmin = await Admin.findById(targetAdminId);
    if (!targetAdmin) return res.status(404).json({ error: "Administrator not found." });

    if (String(targetAdmin.registeredBy) === String(approvingAdminId)) {
      return res.status(400).json({ error: "You cannot approve an administrator registered by yourself. Another admin must approve this." });
    }

    // Generate a random 10-character temporary password
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
    let tempPassword = "";
    for (let i = 0; i < 10; i++) {
      tempPassword += chars.charAt(crypto.randomInt(0, chars.length));
    }

    targetAdmin.password = hashPassword(tempPassword);
    targetAdmin.status = "Approved";
    targetAdmin.approvedBy = approvingAdminId;
    targetAdmin.mustChangePassword = true;
    await targetAdmin.save();

    // Send email with credentials
    const loginUrl = "http://localhost:3000/Login";
    const htmlBody = getBaseTemplate(
      "Welcome to Sanasa Insurance — Admin Account Approved",
      `
      <h2>Administrator Account Activated</h2>
      <p>Dear <strong>${targetAdmin.name}</strong>,</p>
      <p>Your request to join Sanasa Insurance as a System Administrator has been approved. You can now log in using the temporary credentials below:</p>
      <table class="data-table">
        <tr>
          <td class="label">Login Email:</td>
          <td class="value">${targetAdmin.email}</td>
        </tr>
        <tr>
          <td class="label">Temporary Password:</td>
          <td class="value highlight-value">${tempPassword}</td>
        </tr>
      </table>
      <p>Upon your first login, you will be required to update this temporary password to a new secure password of your choice.</p>
      <br/>
      <div style="text-align: center;">
        <a href="${loginUrl}" style="background-color: #0f2d3a; color: #ffffff; padding: 12px 24px; border-radius: 25px; text-decoration: none; font-weight: bold; display: inline-block;">Log In to Portal</a>
      </div>
      `
    );

    const textBody = `Dear ${targetAdmin.name}, your Admin account has been approved.\nLogin email: ${targetAdmin.email}\nTemporary password: ${tempPassword}\nPlease login at ${loginUrl} to reset your password.`;

    let emailSent = false;
    let emailError = null;
    try {
      const result = await sendEmail(targetAdmin.email, "Welcome to Sanasa Insurance — Admin Account Approved", htmlBody, textBody);
      emailSent = result.sent;
      emailError = result.error || null;
    } catch (sendErr) {
      emailError = sendErr.message;
    }

    res.json({
      message: emailSent ? "Administrator approved successfully. Welcome email sent." : "Dev Mode: Approved successfully (email not sent).",
      emailSent,
      emailError,
      devPassword: emailSent ? undefined : tempPassword
    });
  } catch (err) {
    console.error("Approve admin error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// POST reject admin registration request: /api/admin/admins/reject
router.post("/admins/reject", async (req, res) => {
  try {
    const { targetAdminId, approvingAdminId } = req.body;
    if (!targetAdminId || !approvingAdminId) {
      return res.status(400).json({ error: "Target Admin ID and Approving Admin ID are required." });
    }

    const targetAdmin = await Admin.findById(targetAdminId);
    if (!targetAdmin) return res.status(404).json({ error: "Administrator not found." });

    if (String(targetAdmin.registeredBy) === String(approvingAdminId)) {
      return res.status(400).json({ error: "You cannot reject an administrator registration request created by yourself." });
    }

    targetAdmin.status = "Rejected";
    await targetAdmin.save();

    res.json({ message: "Admin registration request rejected successfully." });
  } catch (err) {
    console.error("Reject admin error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// GET all pending admin password reset requests: /api/admin/admins/password-requests
router.get("/admins/password-requests", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Email query parameter is required." });

    // Find other admins who have pending reset requests
    const requests = await Admin.find({
      resetRequestStatus: "Pending",
      email: { $ne: email.trim().toLowerCase() }
    }, { password: 0 }).sort({ createdAt: -1 });

    res.json({ requests });
  } catch (err) {
    console.error("Fetch admin password requests error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// POST approve admin password reset request: /api/admin/admins/password-requests/approve
router.post("/admins/password-requests/approve", async (req, res) => {
  try {
    const { adminId } = req.body;
    if (!adminId) return res.status(400).json({ error: "Admin ID is required." });

    const admin = await Admin.findById(adminId);
    if (!admin) return res.status(404).json({ error: "Administrator not found." });

    const otp = String(crypto.randomInt(100000, 999999));
    admin.resetOtp = crypto.createHash("sha256").update(otp).digest("hex");
    admin.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    admin.resetOtpRequestedAt = new Date();
    admin.resetRequestStatus = "Approved";
    await admin.save();

    const resetUrl = `http://localhost:3000/Reset_password?email=${encodeURIComponent(admin.email)}&stage=otp`;
    const htmlBody = getBaseTemplate(
      "Password Reset Request Approved — Sanasa Insurance",
      `
      <h2>Admin Password Reset Request Approved</h2>
      <p>Dear <strong>${admin.name}</strong>,</p>
      <p>Your password reset request has been approved by another administrator. Use the verification code below to reset your password:</p>
      <table class="data-table">
        <tr>
          <td class="label">Verification Code:</td>
          <td class="value highlight-value">${otp}</td>
        </tr>
      </table>
      <p>Please click the button below to proceed to the password reset screen:</p>
      <div style="text-align: center; margin-top: 25px;">
        <a href="${resetUrl}" style="background-color: #ff9800; color: #ffffff; padding: 12px 24px; border-radius: 25px; text-decoration: none; font-weight: bold; display: inline-block;">Reset Password</a>
      </div>
      <p>This verification code expires in 10 minutes. If you did not request this, please contact support immediately.</p>
      `
    );

    const textBody = `Your admin password reset code is: ${otp}\nReset link: ${resetUrl}\nThis code expires in 10 minutes. Do not share it with anyone.`;

    let emailSent = false;
    let emailError = null;
    try {
      const result = await sendEmail(admin.email, `${otp} — Admin Password Reset Verification Code`, htmlBody, textBody);
      emailSent = result.sent;
      emailError = result.error || null;
    } catch (sendErr) {
      emailError = sendErr.message;
    }

    res.json({
      message: emailSent ? "Password request approved. OTP sent to admin email." : "Dev Mode: Request approved, OTP generated (email not sent).",
      emailSent,
      emailError,
      devOtp: emailSent ? undefined : otp
    });
  } catch (err) {
    console.error("Approve admin password request error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// POST reject admin password reset request: /api/admin/admins/password-requests/reject
router.post("/admins/password-requests/reject", async (req, res) => {
  try {
    const { adminId } = req.body;
    if (!adminId) return res.status(400).json({ error: "Admin ID is required." });

    const admin = await Admin.findById(adminId);
    if (!admin) return res.status(404).json({ error: "Administrator not found." });

    admin.resetRequestStatus = "None";
    admin.resetOtp = undefined;
    admin.resetOtpExpires = undefined;
    admin.resetOtpRequestedAt = undefined;
    await admin.save();

    res.json({ message: "Password request rejected successfully." });
  } catch (err) {
    console.error("Reject admin password request error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// POST change password for admin: /api/admin/admins/change-password
router.post("/admins/change-password", async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const admin = await Admin.findOne({ email: email.trim().toLowerCase() });
    if (!admin) return res.status(404).json({ error: "Administrator not found." });

    const hashedInput = hashPassword(currentPassword);
    if (admin.password !== hashedInput) {
      return res.status(400).json({ error: "Incorrect current temporary password." });
    }

    admin.password = hashPassword(newPassword);
    admin.mustChangePassword = false;
    await admin.save();

    // Return updated admin object
    const adminObj = admin.toObject();
    delete adminObj.password;

    res.json({ message: "Password updated successfully.", admin: adminObj });
  } catch (err) {
    console.error("Change password admin route error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// ==========================================
// ADMIN CONTACT & INQUIRY MANAGEMENT ROUTES
// ==========================================

// Seed initial realistic inquiries if none exist
const seedInitialInquiries = async () => {
  const count = await Inquiry.countDocuments();
  if (count === 0) {
    const sampleInquiries = [
      {
        ticketId: "INQ-2026-1082",
        senderName: "Kamal Perera",
        senderEmail: "kamal.perera@gmail.com",
        senderPhone: "0771234567",
        senderRole: "Policy Holder",
        category: "Claims Escalation",
        priority: "Urgent",
        subject: "Claim CLM-2026-0042 delay inquiry",
        message: "My vehicle accident assessment was submitted last Monday at Galle branch, but the status is still pending approval. Could you please check the status with the branch assessor?",
        branch: "Galle",
        status: "Pending",
        adminNotes: ""
      },
      {
        ticketId: "INQ-2026-1045",
        senderName: "Nimali Rathnayake",
        senderEmail: "nimali.rath@yahoo.com",
        senderPhone: "0719876543",
        senderRole: "Policy Holder",
        category: "Policy Inquiry",
        priority: "Normal",
        subject: "Adding comprehensive motor rider for electric car",
        message: "I would like to inquire about the terms and premium calculation for EV battery replacement coverage under my existing policy POL-88219.",
        branch: "Colombo (Head Office)",
        status: "In Review",
        adminNotes: "Assigned to underwriting department for EV rate confirmation."
      },
      {
        ticketId: "INQ-2026-0988",
        senderName: "Sunil Shantha (Agent)",
        senderEmail: "sunil.agt04@sanasainsurance.lk",
        senderPhone: "0773344556",
        senderRole: "Agent",
        category: "Agent Support",
        priority: "Normal",
        subject: "Commission statement discrepancy for August 2026",
        message: "The commission payout statement for motor policy renewals registered in Matara branch area shows 3 missing policies. Attached are the registration slips.",
        branch: "Matara",
        status: "Resolved",
        adminNotes: "Finance reconciled missing 3 policies on 18 Sep 2026. Paid out in supplemental cycle.",
        resolvedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        resolvedBy: "System Admin"
      },
      {
        ticketId: "INQ-2026-0920",
        senderName: "Dilshan Fernando",
        senderEmail: "dilshan.f@hotmail.com",
        senderPhone: "0765544332",
        senderRole: "Public Visitor",
        category: "General Inquiry",
        priority: "Normal",
        subject: "Corporate Fleet Insurance quotation request",
        message: "Our logistics company in Kandy operates 15 commercial vans. We require a comprehensive group fleet insurance proposal with roadside assistance.",
        branch: "Kandy",
        status: "In Review",
        adminNotes: "Forwarded to Corporate Sales team & Kandy Branch Manager."
      },
      {
        ticketId: "INQ-2026-0870",
        senderName: "Kandy Branch Office",
        senderEmail: "kandy@sanasainsurance.lk",
        senderPhone: "0812234500",
        senderRole: "Office Staff",
        category: "Branch Operations",
        priority: "High",
        subject: "Assessment portal slow response during morning peak",
        message: "Branch claims assessors experienced latency when uploading high resolution photo evidence between 9:30 AM and 11:00 AM.",
        branch: "Kandy",
        status: "Resolved",
        adminNotes: "IT infrastructure team scaled image compression cache on server.",
        resolvedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        resolvedBy: "System Admin"
      }
    ];
    await Inquiry.insertMany(sampleInquiries);
    console.log("Seeded initial support inquiries.");
  }
};

// GET all inquiries: /api/admin/contact/inquiries
router.get("/contact/inquiries", async (req, res) => {
  try {
    await seedInitialInquiries();
    const { category, status, search } = req.query;
    const filter = {};

    if (category && category !== "All") {
      filter.category = category;
    }
    if (status && status !== "All") {
      filter.status = status;
    }
    if (search) {
      const q = search.trim();
      filter.$or = [
        { ticketId: { $regex: q, $options: "i" } },
        { senderName: { $regex: q, $options: "i" } },
        { senderEmail: { $regex: q, $options: "i" } },
        { subject: { $regex: q, $options: "i" } },
        { message: { $regex: q, $options: "i" } },
        { branch: { $regex: q, $options: "i" } }
      ];
    }

    const inquiries = await Inquiry.find(filter).sort({ createdAt: -1 });
    
    // Quick statistics
    const totalCount = await Inquiry.countDocuments();
    const pendingCount = await Inquiry.countDocuments({ status: "Pending" });
    const inReviewCount = await Inquiry.countDocuments({ status: "In Review" });
    const resolvedCount = await Inquiry.countDocuments({ status: "Resolved" });

    res.json({
      inquiries,
      stats: {
        total: totalCount,
        pending: pendingCount,
        inReview: inReviewCount,
        resolved: resolvedCount
      }
    });
  } catch (err) {
    console.error("Fetch inquiries error:", err);
    res.status(500).json({ error: "Failed to load support inquiries." });
  }
});

// POST create inquiry: /api/admin/contact/inquiries
router.post("/contact/inquiries", async (req, res) => {
  try {
    const { senderName, senderEmail, senderPhone, senderRole, category, priority, subject, message, branch } = req.body;
    if (!senderName || !senderEmail || !subject || !message) {
      return res.status(400).json({ error: "Name, email, subject, and message are required." });
    }

    const newInquiry = new Inquiry({
      senderName: senderName.trim(),
      senderEmail: senderEmail.trim().toLowerCase(),
      senderPhone: senderPhone ? senderPhone.trim() : "",
      senderRole: senderRole || "General",
      category: category || "General Inquiry",
      priority: priority || "Normal",
      subject: subject.trim(),
      message: message.trim(),
      branch: branch || "Head Office",
      status: "Pending"
    });

    await newInquiry.save();
    res.status(201).json({ message: "Inquiry registered successfully.", inquiry: newInquiry });
  } catch (err) {
    console.error("Create inquiry error:", err);
    res.status(500).json({ error: "Failed to submit inquiry." });
  }
});

// PATCH update inquiry: /api/admin/contact/inquiries/:id
router.patch("/contact/inquiries/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, adminNotes, resolvedBy } = req.body;

    const inquiry = await Inquiry.findById(id);
    if (!inquiry) {
      return res.status(404).json({ error: "Inquiry not found." });
    }

    if (status) inquiry.status = status;
    if (priority) inquiry.priority = priority;
    if (adminNotes !== undefined) inquiry.adminNotes = adminNotes;
    
    if (status === "Resolved" && !inquiry.resolvedAt) {
      inquiry.resolvedAt = new Date();
      inquiry.resolvedBy = resolvedBy || "Admin";
    }

    await inquiry.save();
    res.json({ message: "Inquiry updated successfully.", inquiry });
  } catch (err) {
    console.error("Update inquiry error:", err);
    res.status(500).json({ error: "Failed to update inquiry." });
  }
});

// POST reply to inquiry: /api/admin/contact/inquiries/:id/reply
router.post("/contact/inquiries/:id/reply", async (req, res) => {
  try {
    const { id } = req.params;
    const { replyMessage, adminName } = req.body;

    if (!replyMessage || !replyMessage.trim()) {
      return res.status(400).json({ error: "Reply message cannot be empty." });
    }

    const inquiry = await Inquiry.findById(id);
    if (!inquiry) {
      return res.status(404).json({ error: "Inquiry not found." });
    }

    const responder = adminName || "Sanasa Insurance Executive Support Team";

    // Compose official email
    const emailSubject = `Response to Inquiry [${inquiry.ticketId}]: ${inquiry.subject}`;
    const emailHtml = getBaseTemplate(
      `Support Response — ${inquiry.ticketId}`,
      `
      <h2>Official Inquiry Response</h2>
      <p>Dear <strong>${inquiry.senderName}</strong>,</p>
      <p>Thank you for contacting Sanasa General Insurance. Below is the official response regarding your inquiry:</p>
      
      <table class="data-table">
        <tr>
          <td class="label">Ticket Reference:</td>
          <td class="value highlight-value">${inquiry.ticketId}</td>
        </tr>
        <tr>
          <td class="label">Category / Subject:</td>
          <td class="value">${inquiry.category} — ${inquiry.subject}</td>
        </tr>
        <tr>
          <td class="label">Original Message:</td>
          <td class="value" style="font-style: italic; color: #666;">"${inquiry.message}"</td>
        </tr>
      </table>

      <div style="background-color: #f0f7fa; border-left: 4px solid #004f6e; padding: 16px; margin: 20px 0; border-radius: 4px;">
        <h4 style="margin: 0 0 8px 0; color: #004f6e; font-size: 14px; text-transform: uppercase;">Official Response:</h4>
        <p style="margin: 0; color: #1e293b; font-size: 14px; line-height: 1.6; white-space: pre-line;">${replyMessage.trim()}</p>
      </div>

      <p style="font-size: 12px; color: #64748b; margin-top: 24px;">
        If you have further questions, you can reply directly to this email or contact our 24/7 hotline at <strong>+94 112 003 000</strong>.
      </p>
      `
    );

    const emailText = `Dear ${inquiry.senderName},\n\nTicket Reference: ${inquiry.ticketId}\nSubject: ${inquiry.subject}\n\nOfficial Response:\n${replyMessage.trim()}\n\nBest Regards,\n${responder}\nSanasa General Insurance PLC`;

    let emailSent = false;
    let emailError = null;
    try {
      const result = await sendEmail(inquiry.senderEmail, emailSubject, emailHtml, emailText);
      emailSent = result.sent;
      emailError = result.error || null;
    } catch (e) {
      emailError = e.message;
    }

    inquiry.replyMessage = replyMessage.trim();
    inquiry.repliedAt = new Date();
    inquiry.repliedBy = responder;
    inquiry.status = "Resolved";
    inquiry.resolvedAt = new Date();
    inquiry.resolvedBy = responder;
    await inquiry.save();

    res.json({
      message: emailSent ? "Reply sent successfully to recipient!" : "Reply saved (Dev Mode: Email delivery simulated).",
      emailSent,
      emailError,
      inquiry
    });
  } catch (err) {
    console.error("Reply inquiry error:", err);
    res.status(500).json({ error: "Failed to send reply to inquiry." });
  }
});

// POST send official broadcast/direct email: /api/admin/contact/send-email
router.post("/contact/send-email", async (req, res) => {
  try {
    const { targetGroup, specificEmail, subject, message, priority, senderName } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: "Subject and message are required." });
    }

    let recipientEmails = [];

    if (targetGroup === "custom") {
      if (!specificEmail || !specificEmail.trim()) {
        return res.status(400).json({ error: "Recipient email address is required for custom dispatch." });
      }
      recipientEmails = [specificEmail.trim().toLowerCase()];
    } else if (targetGroup === "all_branches") {
      const branches = await OfficeStaff.find({}, "email");
      recipientEmails = branches.map(b => b.email).filter(Boolean);
      if (recipientEmails.length === 0) {
        recipientEmails = ["galle@sanasainsurance.lk", "colombo@sanasainsurance.lk", "kandy@sanasainsurance.lk"];
      }
    } else if (targetGroup === "all_agents") {
      const agents = await Agent.find({ status: "active" }, "email");
      recipientEmails = agents.map(a => a.email).filter(Boolean);
      if (recipientEmails.length === 0) {
        recipientEmails = ["agents@sanasainsurance.lk"];
      }
    } else if (targetGroup?.startsWith("branch_")) {
      const branchName = targetGroup.replace("branch_", "");
      const branchStaff = await OfficeStaff.findOne({ branch: branchName });
      if (branchStaff && branchStaff.email) {
        recipientEmails = [branchStaff.email];
      } else {
        recipientEmails = [`${branchName.toLowerCase().replace(/\s+/g, "")}@sanasainsurance.lk`];
      }
    } else {
      if (specificEmail) recipientEmails = [specificEmail.trim().toLowerCase()];
    }

    if (recipientEmails.length === 0) {
      return res.status(400).json({ error: "No valid recipient email addresses found for the selected target." });
    }

    const priorityBadgeColor = priority === "Urgent" ? "#ef4444" : priority === "High" ? "#f59e0b" : "#0284c7";
    const priorityLabel = priority || "Normal Priority";

    const emailHtml = getBaseTemplate(
      `Executive Communication — Sanasa Insurance`,
      `
      <div style="display: inline-block; background-color: ${priorityBadgeColor}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; margin-bottom: 12px;">
        ${priorityLabel}
      </div>
      <h2>${subject}</h2>
      <p>Official communication from Sanasa General Insurance Executive Administration.</p>
      
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0; color: #1e293b; font-size: 14px; line-height: 1.7; white-space: pre-line;">${message.trim()}</p>
      </div>

      <p style="font-size: 12px; color: #64748b; margin-top: 24px;">
        Sent by <strong>${senderName || "System Administrator"}</strong> — Executive Head Office, Sanasa General Insurance PLC.
      </p>
      `
    );

    const emailText = `${subject}\nPriority: ${priorityLabel}\n\n${message.trim()}\n\nSent by ${senderName || "System Administrator"} — Sanasa General Insurance PLC`;

    let successCount = 0;
    let failedCount = 0;

    for (const email of recipientEmails) {
      try {
        const result = await sendEmail(email, subject, emailHtml, emailText);
        if (result.sent) successCount++;
        else failedCount++;
      } catch (err) {
        console.error(`Failed to send email to ${email}:`, err);
        failedCount++;
      }
    }

    res.json({
      message: `Dispatched message to ${recipientEmails.length} recipient(s). (${successCount} delivered)`,
      recipients: recipientEmails,
      successCount,
      failedCount
    });
  } catch (err) {
    console.error("Admin send email error:", err);
    res.status(500).json({ error: "Failed to send email." });
  }
});
// ==========================================
// --- API: Claims Management (Admin Console) ---
// ==========================================

// GET all claims with executive analytics & filters: /api/admin/claims
router.get("/claims", async (req, res) => {
  try {
    const { branch, status, damageType, priority, search, sortBy } = req.query;
    const query = {};

    if (branch && branch !== "All") query.branch = branch.trim();
    if (status && status !== "All") query.status = status.trim();
    if (damageType && damageType !== "All") query.damageType = damageType.trim();
    if (priority && priority !== "All") query.priority = priority.trim();

    if (search) {
      const q = search.trim();
      query.$or = [
        { claimNumber: { $regex: q, $options: "i" } },
        { userNic: { $regex: q, $options: "i" } },
        { vehiclePlate: { $regex: q, $options: "i" } },
        { branch: { $regex: q, $options: "i" } },
        { assignedAgent: { $regex: q, $options: "i" } },
        { location: { $regex: q, $options: "i" } }
      ];
    }

    let sortOption = { createdAt: -1 };
    if (sortBy === "oldest") sortOption = { createdAt: 1 };
    else if (sortBy === "amount-desc") sortOption = { amount: -1 };
    else if (sortBy === "amount-asc") sortOption = { amount: 1 };

    const rawClaims = await Claim.find(query).sort(sortOption).lean();

    // Attach policy holder info
    const nics = Array.from(new Set(rawClaims.map(c => c.userNic).filter(Boolean)));
    const users = await User.find(
      { nic: { $in: nics } },
      { nic: 1, email: 1, mobile: 1, firstName: 1, lastName: 1, vehicles: 1, bankDetails: 1 }
    ).lean();
    const userMap = new Map(users.map(u => [u.nic, u]));

    const claims = rawClaims.map(c => {
      const u = userMap.get(c.userNic);
      const fullName = u ? `${u.firstName || ""} ${u.lastName || ""}`.trim() : "Policy Holder";
      const vehicle = u?.vehicles?.find((v) => (v.numberPlate || "").replace(/[\s-]/g, "").toUpperCase() === (c.vehiclePlate || "").replace(/[\s-]/g, "").toUpperCase());

      return {
        ...c,
        policyHolderName: fullName,
        policyHolderEmail: u?.email || "",
        policyHolderMobile: u?.mobile || "",
        vehicleDetails: vehicle ? `${vehicle.company || ""} ${vehicle.model || ""}`.trim() : ""
      };
    });

    // Executive Metrics & Summary Calculations across entire dataset
    const allClaims = await Claim.find({}, { status: 1, amount: 1, branch: 1, damageType: 1, createdAt: 1 }).lean();
    const totalClaimsCount = allClaims.length;
    const pendingClaimsCount = allClaims.filter(c => c.status === "Pending").length;
    const inProgressClaimsCount = allClaims.filter(c => c.status === "In Progress" || c.currentStep === 2 || c.currentStep === 3).length;
    const approvedClaimsCount = allClaims.filter(c => c.status === "Approved").length;
    const rejectedClaimsCount = allClaims.filter(c => c.status === "Rejected").length;

    const totalApprovedPayout = allClaims
      .filter(c => c.status === "Approved" && c.amount)
      .reduce((sum, c) => sum + (c.amount || 0), 0);

    const totalEstimatedLoss = allClaims
      .filter(c => c.amount)
      .reduce((sum, c) => sum + (c.amount || 0), 0);

    // Damage Type Category Distribution
    const damageTypeMap = {};
    allClaims.forEach(c => {
      const cat = c.damageType || "Other";
      damageTypeMap[cat] = (damageTypeMap[cat] || 0) + 1;
    });

    // Branch Breakdown
    const branchMap = {};
    allClaims.forEach(c => {
      const br = c.branch || "General";
      if (!branchMap[br]) branchMap[br] = { count: 0, approvedPayout: 0, pending: 0 };
      branchMap[br].count += 1;
      if (c.status === "Approved" && c.amount) branchMap[br].approvedPayout += c.amount;
      if (c.status === "Pending") branchMap[br].pending += 1;
    });

    res.json({
      claims,
      summary: {
        totalClaims: totalClaimsCount,
        pendingClaims: pendingClaimsCount,
        inProgressClaims: inProgressClaimsCount,
        approvedClaims: approvedClaimsCount,
        rejectedClaims: rejectedClaimsCount,
        totalApprovedPayout,
        totalEstimatedLoss,
        categoryDistribution: damageTypeMap,
        branchBreakdown: branchMap
      }
    });
  } catch (err) {
    console.error("Admin fetch claims error:", err);
    res.status(500).json({ error: "Failed to fetch claims report." });
  }
});

// GET single claim by ID or Claim Number: /api/admin/claims/:id
router.get("/claims/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { claimNumber: id.trim().toUpperCase() };
    const claim = await Claim.findOne(query).lean();
    if (!claim) {
      return res.status(404).json({ error: "Claim record not found." });
    }

    // Attach user profile
    const user = await User.findOne({ nic: claim.userNic }, { password: 0 }).lean();
    res.json({ claim, user });
  } catch (err) {
    console.error("Admin fetch single claim error:", err);
    res.status(500).json({ error: "Failed to fetch claim details." });
  }
});

// PUT update / override claim decision (Admin Authority): /api/admin/claims/:id
router.put("/claims/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, amount, priority, branch, assignedAgent, rejectionReason, adminNote, currentStep } = req.body;

    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { claimNumber: id.trim().toUpperCase() };
    const claim = await Claim.findOne(query);
    if (!claim) {
      return res.status(404).json({ error: "Claim record not found." });
    }

    if (status !== undefined) claim.status = status.trim();
    if (amount !== undefined) claim.amount = amount === "" ? null : Number(amount);
    if (priority !== undefined) claim.priority = priority.trim();
    if (branch !== undefined) claim.branch = branch.trim();
    if (assignedAgent !== undefined) claim.assignedAgent = assignedAgent.trim();
    if (rejectionReason !== undefined) claim.rejectionReason = rejectionReason.trim();
    if (currentStep !== undefined) claim.currentStep = Number(currentStep);

    if (adminNote && adminNote.trim()) {
      claim.notes.push({
        text: `[Admin Override] ${adminNote.trim()}`,
        addedBy: "System Admin",
        addedAt: new Date()
      });
      claim.messages.push({
        sender: "System Admin",
        message: adminNote.trim(),
        sentAt: new Date(),
        recipient: "Policy Holder"
      });
    }

    claim.isManuallyUpdated = true;
    claim.manualUpdateAt = new Date();
    claim.manualUpdateBy = "System Admin";

    await claim.save();
    res.json({ message: "Claim record updated successfully.", claim });
  } catch (err) {
    console.error("Admin update claim error:", err);
    res.status(500).json({ error: err.message || "Failed to update claim record." });
  }
});

// DELETE single claim by ID (Admin Authority): /api/admin/claims/:id
router.delete("/claims/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { claimNumber: id.trim().toUpperCase() };
    const deleted = await Claim.findOneAndDelete(query);
    if (!deleted) {
      return res.status(404).json({ error: "Claim record not found." });
    }
    res.json({ message: `Claim ${deleted.claimNumber} removed successfully.` });
  } catch (err) {
    console.error("Admin delete claim error:", err);
    res.status(500).json({ error: "Failed to delete claim." });
  }
});

// ===============================================
// --- API: Policyholders Management (Admin) ---
// ===============================================

// GET all policyholders with executive metrics & search: /api/admin/policyholders
router.get("/policyholders", async (req, res) => {
  try {
    const { branch, status, search, province, sortBy } = req.query;
    const query = {};

    if (branch && branch !== "All") {
      query.branch = { $regex: new RegExp(`^${branch.trim()}$`, "i") };
    }
    if (status && status !== "All") {
      query.status = status.trim();
    }
    if (province && province !== "All") {
      query.province = { $regex: new RegExp(`^${province.trim()}$`, "i") };
    }

    if (search && search.trim()) {
      const q = search.trim();
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const cleanPlate = q.replace(/[\s-]/g, "");
      query.$or = [
        { nic: { $regex: escaped, $options: "i" } },
        { firstName: { $regex: escaped, $options: "i" } },
        { lastName: { $regex: escaped, $options: "i" } },
        { email: { $regex: escaped, $options: "i" } },
        { mobile: { $regex: escaped, $options: "i" } },
        { referenceNumber: { $regex: escaped, $options: "i" } },
        { city: { $regex: escaped, $options: "i" } },
        { branch: { $regex: escaped, $options: "i" } },
        { "vehicles.numberPlate": { $regex: cleanPlate || escaped, $options: "i" } },
        { "vehicles.policyNumber": { $regex: escaped, $options: "i" } }
      ];
    }

    let sortOption = { createdAt: -1 };
    if (sortBy === "oldest") sortOption = { createdAt: 1 };
    else if (sortBy === "name-asc") sortOption = { firstName: 1, lastName: 1 };
    else if (sortBy === "name-desc") sortOption = { firstName: -1, lastName: -1 };

    const rawUsers = await User.find(query, { password: 0 }).sort(sortOption).lean();

    // Attach claims counts per policyholder
    const nics = rawUsers.map((u) => u.nic).filter(Boolean);
    const claims = await Claim.find({ userNic: { $in: nics } }, { userNic: 1, status: 1, amount: 1 }).lean();
    
    const claimsMap = {};
    claims.forEach((c) => {
      if (!claimsMap[c.userNic]) {
        claimsMap[c.userNic] = { total: 0, active: 0, approvedPayout: 0 };
      }
      claimsMap[c.userNic].total += 1;
      if (c.status === "In Progress" || c.status === "Pending") {
        claimsMap[c.userNic].active += 1;
      }
      if (c.status === "Approved" && c.amount) {
        claimsMap[c.userNic].approvedPayout += c.amount;
      }
    });

    const policyholders = rawUsers.map((u) => {
      const cData = claimsMap[u.nic] || { total: 0, active: 0, approvedPayout: 0 };
      return {
        ...u,
        totalClaimsCount: cData.total,
        activeClaimsCount: cData.active,
        totalApprovedPayout: cData.approvedPayout
      };
    });

    // Compute Overall Summary Metrics across all users
    const allUsers = await User.find({}, { status: 1, branch: 1, province: 1, vehicles: 1, createdAt: 1 }).lean();
    const totalPolicyholders = allUsers.length;
    const approvedPolicyholders = allUsers.filter((u) => u.status === "Approved").length;
    const pendingPolicyholders = allUsers.filter((u) => u.status === "Pending" || !u.status).length;
    
    let totalVehicles = 0;
    const branchMap = {};
    const provinceMap = {};

    allUsers.forEach((u) => {
      const vCount = u.vehicles ? u.vehicles.length : 0;
      totalVehicles += vCount;

      const br = u.branch || "General";
      if (!branchMap[br]) branchMap[br] = { count: 0, vehicles: 0, pending: 0 };
      branchMap[br].count += 1;
      branchMap[br].vehicles += vCount;
      if (u.status === "Pending" || !u.status) branchMap[br].pending += 1;

      const prov = u.province || "Other";
      provinceMap[prov] = (provinceMap[prov] || 0) + 1;
    });

    res.json({
      policyholders,
      summary: {
        totalPolicyholders,
        approvedPolicyholders,
        pendingPolicyholders,
        totalVehicles,
        branchBreakdown: branchMap,
        provinceDistribution: provinceMap
      }
    });
  } catch (err) {
    console.error("Admin fetch policyholders error:", err);
    res.status(500).json({ error: "Failed to fetch policyholders." });
  }
});

// GET single policyholder by ID or NIC with full details & claims: /api/admin/policyholders/:id
router.get("/policyholders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { nic: id.trim() };
    const user = await User.findOne(query, { password: 0 }).lean();
    if (!user) {
      return res.status(404).json({ error: "Policyholder not found." });
    }

    const claims = await Claim.find({ userNic: user.nic }).sort({ createdAt: -1 }).lean();
    res.json({ policyholder: user, claims });
  } catch (err) {
    console.error("Admin fetch single policyholder error:", err);
    res.status(500).json({ error: "Failed to fetch policyholder details." });
  }
});

// PUT update policyholder profile / status (Admin Authority): /api/admin/policyholders/:id
router.put("/policyholders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
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
      bankName,
      branchName,
      accountNumber,
      accountHolderName
    } = req.body;

    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { nic: id.trim() };
    const user = await User.findOne(query);
    if (!user) {
      return res.status(404).json({ error: "Policyholder not found." });
    }

    if (firstName !== undefined) user.firstName = firstName.trim();
    if (lastName !== undefined) user.lastName = lastName.trim();
    if (mobile !== undefined) user.mobile = mobile.trim();
    if (email !== undefined) user.email = email.trim().toLowerCase();
    if (dob !== undefined) user.dob = dob.trim();
    if (address !== undefined) user.address = address.trim();
    if (city !== undefined) user.city = city.trim();
    if (province !== undefined) user.province = province.trim();
    if (branch !== undefined) user.branch = branch.trim();
    if (status !== undefined) user.status = status.trim();

    if (!user.bankDetails) user.bankDetails = {};
    if (bankName !== undefined) user.bankDetails.bankName = bankName.trim();
    if (branchName !== undefined) user.bankDetails.branchName = branchName.trim();
    if (accountNumber !== undefined) user.bankDetails.accountNumber = accountNumber.trim();
    if (accountHolderName !== undefined) user.bankDetails.accountHolderName = accountHolderName.trim();

    await user.save();

    const userObj = user.toObject();
    delete userObj.password;
    res.json({ message: "Policyholder updated successfully.", policyholder: userObj });
  } catch (err) {
    console.error("Admin update policyholder error:", err);
    res.status(500).json({ error: err.message || "Failed to update policyholder." });
  }
});

// DELETE policyholder record (Admin Authority): /api/admin/policyholders/:id
router.delete("/policyholders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { nic: id.trim() };
    const deleted = await User.findOneAndDelete(query);
    if (!deleted) {
      return res.status(404).json({ error: "Policyholder not found." });
    }
    res.json({ message: `Policyholder ${deleted.firstName} ${deleted.lastName} removed successfully.` });
  } catch (err) {
    console.error("Admin delete policyholder error:", err);
    res.status(500).json({ error: "Failed to delete policyholder." });
  }
});

// POST add vehicle to policyholder (Admin): /api/admin/policyholders/:id/vehicles
router.post("/policyholders/:id/vehicles", async (req, res) => {
  try {
    const { id } = req.params;
    const { numberPlate, vehicleType, company, model, year, engineNumber, chassisNumber, policyNumber, status } = req.body;

    if (!numberPlate || !company || !model || !year) {
      return res.status(400).json({ error: "Number plate, company, model, and year are required." });
    }

    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { nic: id.trim() };
    const user = await User.findOne(query);
    if (!user) {
      return res.status(404).json({ error: "Policyholder not found." });
    }

    const cleanPlate = numberPlate.replace(/[\s-]/g, "").toUpperCase();
    const existing = user.vehicles.find((v) => v.numberPlate.replace(/[\s-]/g, "").toUpperCase() === cleanPlate);
    if (existing) {
      return res.status(400).json({ error: `Vehicle ${numberPlate} is already registered under this policyholder.` });
    }

    const newVehicle = {
      numberPlate: numberPlate.trim().toUpperCase(),
      vehicleType: (vehicleType || "Car").trim(),
      company: company.trim(),
      model: model.trim(),
      year: String(year).trim(),
      engineNumber: (engineNumber || "ENG-" + Math.floor(100000 + Math.random() * 900000)).trim(),
      chassisNumber: (chassisNumber || "CHS-" + Math.floor(100000 + Math.random() * 900000)).trim(),
      policyNumber: (policyNumber || "POL-" + Math.floor(100000 + Math.random() * 900000)).trim(),
      status: (status || "Approved").trim()
    };

    user.vehicles.push(newVehicle);
    await user.save();

    const userObj = user.toObject();
    delete userObj.password;
    res.json({ message: "Vehicle added successfully.", policyholder: userObj });
  } catch (err) {
    console.error("Admin add vehicle error:", err);
    res.status(500).json({ error: err.message || "Failed to add vehicle." });
  }
});

// PUT update vehicle of policyholder (Admin): /api/admin/policyholders/:id/vehicles/:plate
router.put("/policyholders/:id/vehicles/:plate", async (req, res) => {
  try {
    const { id, plate } = req.params;
    const { vehicleType, company, model, year, engineNumber, chassisNumber, policyNumber, status } = req.body;

    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { nic: id.trim() };
    const user = await User.findOne(query);
    if (!user) {
      return res.status(404).json({ error: "Policyholder not found." });
    }

    const cleanPlate = plate.replace(/[\s-]/g, "").toUpperCase();
    const vehicle = user.vehicles.find((v) => v.numberPlate.replace(/[\s-]/g, "").toUpperCase() === cleanPlate);
    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found under this policyholder." });
    }

    if (vehicleType !== undefined) vehicle.vehicleType = vehicleType.trim();
    if (company !== undefined) vehicle.company = company.trim();
    if (model !== undefined) vehicle.model = model.trim();
    if (year !== undefined) vehicle.year = String(year).trim();
    if (engineNumber !== undefined) vehicle.engineNumber = engineNumber.trim();
    if (chassisNumber !== undefined) vehicle.chassisNumber = chassisNumber.trim();
    if (policyNumber !== undefined) vehicle.policyNumber = policyNumber.trim();
    if (status !== undefined) vehicle.status = status.trim();

    await user.save();

    const userObj = user.toObject();
    delete userObj.password;
    res.json({ message: "Vehicle updated successfully.", policyholder: userObj });
  } catch (err) {
    console.error("Admin update vehicle error:", err);
    res.status(500).json({ error: err.message || "Failed to update vehicle." });
  }
});

// DELETE vehicle from policyholder (Admin): /api/admin/policyholders/:id/vehicles/:plate
router.delete("/policyholders/:id/vehicles/:plate", async (req, res) => {
  try {
    const { id, plate } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { nic: id.trim() };
    const user = await User.findOne(query);
    if (!user) {
      return res.status(404).json({ error: "Policyholder not found." });
    }

    const cleanPlate = plate.replace(/[\s-]/g, "").toUpperCase();
    user.vehicles = user.vehicles.filter((v) => v.numberPlate.replace(/[\s-]/g, "").toUpperCase() !== cleanPlate);
    await user.save();

    const userObj = user.toObject();
    delete userObj.password;
    res.json({ message: "Vehicle removed successfully.", policyholder: userObj });
  } catch (err) {
    console.error("Admin delete vehicle error:", err);
    res.status(500).json({ error: err.message || "Failed to delete vehicle." });
  }
});

export default router;

