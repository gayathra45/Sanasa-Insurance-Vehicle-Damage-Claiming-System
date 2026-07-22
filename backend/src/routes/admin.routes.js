import express from "express";
import crypto from "crypto";
import Admin from "../models/admin.model.js";
import User from "../models/user.model.js";
import Claim from "../models/claim.model.js";
import OfficeStaff from "../models/office_staff.model.js";
import Agent from "../models/agent.model.js";
import { hashPassword } from "../utils/crypto.js";
import { sendEmail, getBaseTemplate } from "../utils/email.js";

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

    // 1. KPI Counts (last 30 days)
    const policyHoldersCount = await User.countDocuments(dateFilter);
    const totalClaimsCount = await Claim.countDocuments(dateFilter);
    const activeClaimsCount = await Claim.countDocuments({ status: "In Progress", ...dateFilter });
    const pendingClaimsCount = await Claim.countDocuments({ status: "Pending", ...dateFilter });

    // 2. Branch Performances (Temporarily set to 0, pending office staff assignment logic)
    const branches = [
      { name: "Galle", percentage: 0, count: 0 },
      { name: "Matara", percentage: 0, count: 0 },
      { name: "Anuradhapura", percentage: 0, count: 0 },
      { name: "Embilipitiya", percentage: 0, count: 0 }
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
    const cleanMobile = mobile.trim();

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

export default router;
