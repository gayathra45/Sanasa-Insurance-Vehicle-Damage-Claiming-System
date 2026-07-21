import express from "express";
import User from "../models/user.model.js";
import Agent from "../models/agent.model.js";
import OfficeStaff from "../models/office_staff.model.js";
import Admin from "../models/admin.model.js";
import { hashPassword } from "../utils/crypto.js";
import { logAgentActivity } from "../utils/activity.js";

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

      const userObj = user.toObject();
      delete userObj.password;

      if (userObj.vehicles && Array.isArray(userObj.vehicles)) {
        userObj.vehicles = userObj.vehicles.filter(v => !v.status || v.status === "Approved");
      }

      return res.json({ role: "policy_holder", user: userObj });
    }

    if (agent && agent.password === hashedInput) {
      if (agent.status === "inactive") {
        return res.status(400).json({ error: "Your account is not activated. Please check your email to set a password and activate your account." });
      }

      const agentObj = agent.toObject();
      delete agentObj.password;

      const userAgent = req.headers["user-agent"] || "";
      const isMobile = userAgent.includes("okhttp") || userAgent.includes("Expo") || userAgent.includes("Mobile") || req.body.device === "Mobile App";
      const deviceType = isMobile ? "Mobile App" : "Web";
      await logAgentActivity(agent.email, "Login", deviceType, `Logged in successfully via ${deviceType}`);

      return res.json({ role: "insurance_agent", agent: agentObj });
    }

    if (staff && staff.password === hashedInput) {
      const staffObj = staff.toObject();
      delete staffObj.password;
      return res.json({ role: "office_staff", staff: staffObj });
    }

    if (admin && admin.password === hashedInput) {
      if (admin.status === "Pending") {
        return res.status(400).json({ error: "Your administrator registration is pending approval from another admin." });
      } else if (admin.status === "Rejected") {
        return res.status(400).json({ error: "Your administrator registration request has been rejected." });
      }

      const adminObj = admin.toObject();
      delete adminObj.password;
      return res.json({ role: "admin", admin: adminObj });
    }

    // If we reach here, either the username/nic doesn't exist, or the password was incorrect.
    return res.status(400).json({ error: "Invalid NIC/Email or Password." });

  } catch (err) {
    console.error("Unified login API error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

export default router;
