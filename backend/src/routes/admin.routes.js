import express from "express";
import crypto from "crypto";
import Admin from "../models/admin.model.js";
import User from "../models/user.model.js";
import Claim from "../models/claim.model.js";
import Agent from "../models/agent.model.js";
import OfficeStaff from "../models/office_staff.model.js";
import { sendEmail, getBaseTemplate } from "../utils/email.js";

const router = express.Router();

// Helper to hash password matching the project's standard hashing logic (SHA-256)
function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

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

    // 1. KPI Counts & Monthly aggregation (Fetched in parallel to minimize network latency)
    const [
      policyHoldersCount,
      totalClaimsCount,
      activeClaimsCount,
      pendingClaimsCount,
      claimsByMonth
    ] = await Promise.all([
      User.countDocuments(dateFilter),
      Claim.countDocuments(dateFilter),
      Claim.countDocuments({ status: "In Progress", ...dateFilter }),
      Claim.countDocuments({ status: "Pending", ...dateFilter }),
      Claim.aggregate([
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
      ])
    ]);

    // 2. Branch Performances (Temporarily set to 0, pending office staff assignment logic)
    const branches = [
      { name: "Galle", percentage: 0, count: 0 },
      { name: "Matara", percentage: 0, count: 0 },
      { name: "Anuradhapura", percentage: 0, count: 0 },
      { name: "Embilipitiya", percentage: 0, count: 0 }
    ];

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

    res.json({
      stats: {
        policyHolders: policyHoldersCount,
        totalClaims: totalClaimsCount,
        activeClaims: activeClaimsCount,
        pendingClaims: pendingClaimsCount
      },
      branches,
      monthlyClaims
    });
  } catch (err) {
    console.error("Admin dashboard stats API error:", err);
    res.status(500).json({ error: "An internal server error occurred fetching dashboard statistics." });
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
    const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 });
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
    const agents = await Agent.find({}, { password: 0 }).sort({ createdAt: -1 });
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
    const { name, email, mobile, branch, province, location, staffCount, password } = req.body;

    if (!name || !email || !mobile || !branch || !province || !location || staffCount === undefined) {
      return res.status(400).json({ error: "All fields are required." });
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

    // Generate a secure activation token and hash a placeholder password
    const token = crypto.randomBytes(32).toString("hex");
    const placeholderPassword = crypto.randomBytes(16).toString("hex");
    const hashedPassword = hashPassword(placeholderPassword);

    const newStaff = new OfficeStaff({
      name: name.trim(),
      email: cleanEmail,
      mobile: mobile.trim(),
      branch: branch.trim(),
      province: province.trim(),
      location: location.trim(),
      staffCount: Number(staffCount),
      password: hashedPassword,
      mustChangePassword: true,
      resetSessionToken: token,
      resetSessionExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });

    await newStaff.save();

    // Send welcome email with activation details
    const activationUrl = `http://localhost:3000/Reset_password?token=${encodeURIComponent(token)}`;
    const subject = `Welcome to Sanasa Insurance — Activate Your Branch Staff Account`;
    const htmlBody = getBaseTemplate(
      subject,
      `
      <h2>Branch Staff Account Created Successfully</h2>
      <p>Dear <strong>${name.trim()}</strong>,</p>
      <p>Your branch office staff account registration details for the <strong>${branch.trim()}</strong> branch have been created:</p>
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
          <td style="padding: 8px; font-weight: bold;">Province:</td>
          <td style="padding: 8px;">${province.trim()}</td>
        </tr>
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 8px; font-weight: bold;">Office Location:</td>
          <td style="padding: 8px;">${location.trim()}</td>
        </tr>
      </table>
      <p>To finalize setting up your account, please click the button below to set your secure password:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${activationUrl}" style="background-color: #0f2d3a; color: #ffffff; padding: 12px 28px; border-radius: 25px; text-decoration: none; font-weight: bold; display: inline-block;">Activate & Set Password</a>
      </p>
      <p style="font-size: 13px; color: #718096; line-height: 1.5; text-align: center;">
        This activation link is valid for <strong>24 hours</strong>. If you did not request this, you can ignore this email.
      </p>
      `
    );

    try {
      await sendEmail(cleanEmail, subject, htmlBody);
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

    // Generate secure temporary token
    const token = crypto.randomBytes(32).toString("hex");
    staff.resetSessionToken = token;
    staff.resetSessionExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    staff.resetRequestStatus = "Approved";
    await staff.save();

    // Prepare email HTML and Text
    const resetUrl = `http://localhost:3000/Reset_password?token=${encodeURIComponent(token)}`;
    const htmlBody = getBaseTemplate(
      "Password Reset Link",
      `
      <h2>Password Reset Request Approved</h2>
      <p>Hi <strong>${staff.name}</strong>,</p>
      <p>Your password reset request has been approved by the Admin. Please click the button below to set a new password:</p>
      <p style="text-align: center; margin: 35px 0;">
        <a href="${resetUrl}" style="background-color: #0f2d3a; color: #ffffff; padding: 14px 32px; border-radius: 25px; text-decoration: none; font-weight: bold; display: inline-block; font-size: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.15);">Reset Password</a>
      </p>
      <p style="font-size: 13px; color: #718096; line-height: 1.5; text-align: center;">
        This link is valid for <strong>1 hour</strong>. If you did not request this, you can ignore this email.
      </p>
      `
    );
    const textBody = `Your branch password reset link is: ${resetUrl}\n\nThis link expires in 1 hour.`;

    let emailSent = false;
    let emailError = null;
    try {
      const result = await sendEmail(staff.email, "Branch Password Reset Link", htmlBody, textBody);
      emailSent = result.sent;
      emailError = result.error || null;
    } catch (sendErr) {
      emailError = sendErr.message;
    }

    res.json({
      message: emailSent ? "Password request approved. Reset link sent to branch email." : "Dev Mode: Request approved, reset link generated (email not sent).",
      emailSent,
      emailError,
      devToken: emailSent ? undefined : token
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
    staff.resetSessionToken = undefined;
    staff.resetSessionExpires = undefined;
    await staff.save();

    // Send Rejection Email
    const subject = "Password Reset Request Rejected";
    const htmlBody = getBaseTemplate(
      subject,
      `
      <h2>Password Reset Request Rejected</h2>
      <p>Hi <strong>${staff.name}</strong>,</p>
      <p>Your password reset request has been reviewed and rejected by the Administrator.</p>
      <p>If you believe this was in error, please contact the System Administrator.</p>
      `
    );

    try {
      await sendEmail(staff.email, subject, htmlBody);
    } catch (emailErr) {
      console.error("Failed to send rejection email:", emailErr);
    }

    res.json({ message: "Password request rejected successfully." });
  } catch (err) {
    console.error("Reject staff password request error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

export default router;
