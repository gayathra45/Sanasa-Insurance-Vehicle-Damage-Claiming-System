import express from "express";
import User from "../models/user.model.js";
import Agent from "../models/agent.model.js";
import OfficeStaff from "../models/office_staff.model.js";
import Admin from "../models/admin.model.js";
import { hashPassword } from "../utils/crypto.js";
import { logAgentActivity, logLoginActivity } from "../utils/activity.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { loginId, password } = req.body;
    if (!loginId || !password) {
      return res.status(400).json({ error: "NIC/Email and Password are required." });
    }

    const cleanInput = loginId.trim();
    const cleanEmail = cleanInput.toLowerCase();
    const hashedInput = hashPassword(password);

    // 1. Search in all collections in parallel to minimize network latency
    const [user, agent, staff, admin] = await Promise.all([
      User.findOne({
        $or: [{ nic: cleanInput }, { email: cleanEmail }]
      }, { documents: 0 }),
      Agent.findOne({
        $or: [{ email: cleanEmail }, { nic: cleanInput }]
      }),
      OfficeStaff.findOne({ email: cleanEmail }),
      Admin.findOne({
        $or: [{ email: cleanEmail }, { nic: cleanInput }]
      })
    ]);

    // 2. Check matches sequentially
    if (user && user.password === hashedInput) {
      if (user.status === "Rejected") {
        return res.status(400).json({ error: "Your registration request has been rejected by the branch office staff. Please check your email for details or contact your local branch." });
      } else if (user.status !== "Approved") {
        return res.status(400).json({ error: "Your account is pending approval from the office staff of your nearest branch. You will receive an email notification once your registration is approved." });
      }

      user.lastLoginAt = new Date();
      user.forceLogoutAt = null;
      user.loginCount = (user.loginCount || 0) + 1;
      await user.save();

      await logLoginActivity({
        req,
        userType: "PolicyHolder",
        userId: user._id,
        userName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        userEmail: user.email,
        userNic: user.nic,
        branch: user.branch || "Galle",
        action: "Login",
        status: "Success",
        details: "Policyholder portal login successful."
      });

      const userObj = user.toObject();
      delete userObj.password;

      if (userObj.vehicles && Array.isArray(userObj.vehicles)) {
        userObj.vehicles = userObj.vehicles.filter(v => !v.status || v.status === "Approved");
      }

      return res.json({ role: "policy_holder", user: userObj, sessionStartedAt: user.lastLoginAt });
    }

    if (agent && agent.password === hashedInput) {
      if (agent.status === "inactive") {
        return res.status(400).json({ error: "Your account is not activated. Please check your email to set a password and activate your account." });
      }

      agent.availability = "Active";
      agent.lastLoginAt = new Date();
      agent.forceLogoutAt = null;
      agent.loginCount = (agent.loginCount || 0) + 1;
      await agent.save();

      const userAgent = req.headers["user-agent"] || "";
      const isMobile = userAgent.includes("okhttp") || userAgent.includes("Expo") || userAgent.includes("Mobile") || req.body.device === "Mobile App";
      const deviceType = isMobile ? "Mobile App" : "Web";
      await logAgentActivity(agent.email, "Login", deviceType, `Logged in successfully via ${deviceType}`);

      await logLoginActivity({
        req,
        userType: "Agent",
        userId: agent._id,
        userName: agent.name,
        userEmail: agent.email,
        userNic: agent.nic,
        branch: agent.branch || "Galle",
        action: "Login",
        status: "Success",
        details: `Insurance Agent logged in via ${deviceType}`
      });

      const agentObj = agent.toObject();
      delete agentObj.password;

      return res.json({ role: "insurance_agent", agent: agentObj, sessionStartedAt: agent.lastLoginAt });
    }

    if (staff && staff.password === hashedInput) {
      staff.lastLoginAt = new Date();
      staff.forceLogoutAt = null;
      staff.loginCount = (staff.loginCount || 0) + 1;
      await staff.save();

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

      const staffObj = staff.toObject();
      delete staffObj.password;
      return res.json({ role: "office_staff", staff: staffObj, sessionStartedAt: staff.lastLoginAt });
    }

    if (admin && admin.password === hashedInput) {
      if (admin.status === "Pending") {
        return res.status(400).json({ error: "Your administrator registration is pending approval from another admin." });
      } else if (admin.status === "Rejected") {
        return res.status(400).json({ error: "Your administrator registration request has been rejected." });
      }

      admin.lastLoginAt = new Date();
      admin.forceLogoutAt = null;
      admin.loginCount = (admin.loginCount || 0) + 1;
      await admin.save();

      await logLoginActivity({
        req,
        userType: "Admin",
        userId: admin._id,
        userName: admin.name,
        userEmail: admin.email,
        userNic: admin.nic,
        branch: "Head Office",
        action: "Login",
        status: "Success",
        details: "Administrator logged into Admin Console."
      });

      const adminObj = admin.toObject();
      delete adminObj.password;
      return res.json({ role: "admin", admin: adminObj, sessionStartedAt: admin.lastLoginAt });
    }

    // If we reach here, either the username/nic doesn't exist, or the password was incorrect.
    return res.status(400).json({ error: "Invalid NIC/Email or Password." });

  } catch (err) {
    console.error("Unified login API error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// POST /api/auth/session-status - Check if active session was revoked by Administrator
router.post("/session-status", async (req, res) => {
  try {
    const { userType, userId, loginTimestamp } = req.body;
    if (!userType || !userId) {
      return res.status(400).json({ error: "userType and userId are required." });
    }

    let doc = null;
    const cleanType = String(userType).toLowerCase();

    if (cleanType === "policyholder" || cleanType === "policy_holder" || cleanType === "user") {
      doc = await User.findById(userId);
    } else if (cleanType === "officestaff" || cleanType === "office_staff" || cleanType === "staff") {
      doc = await OfficeStaff.findById(userId);
    } else if (cleanType === "agent" || cleanType === "insurance_agent") {
      doc = await Agent.findById(userId);
    } else if (cleanType === "admin") {
      doc = await Admin.findById(userId);
    }

    if (!doc) {
      return res.json({ valid: false, reason: "Account not found or deleted." });
    }

    if (doc.forceLogoutAt) {
      const forceLogoutTime = new Date(doc.forceLogoutAt).getTime();
      const loginTime = loginTimestamp ? new Date(loginTimestamp).getTime() : 0;
      
      // If forceLogout occurred around or after user's login timestamp
      if (!loginTimestamp || forceLogoutTime >= loginTime - 2000) {
        return res.json({
          valid: false,
          reason: "Your active session has been forcefully terminated by the Administrator.",
          forceLogoutAt: doc.forceLogoutAt
        });
      }
    }

    return res.json({ valid: true });
  } catch (err) {
    console.error("Session status check error:", err);
    return res.status(500).json({ error: "Failed to verify session status." });
  }
});

export default router;
