import express from "express";
import crypto from "crypto";
import Agent from "../models/agent.model.js";
import AgentProfileUpdateRequest from "../models/agent_profile_update_request.model.js";
import Claim from "../models/claim.model.js";
import User from "../models/user.model.js";
import { logAgentActivity } from "../utils/activity.js";
import AgentActivity from "../models/agent_activity.model.js";
import { sendAgentActivityEmail } from "../utils/email.js";
import { uploadToCloudinary } from "../utils/upload.js";
import mongoose from "mongoose";

const router = express.Router();

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// POST agent login: /api/agent/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and Password are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const agent = await Agent.findOne({ email: cleanEmail });
    if (!agent) {
      return res.status(400).json({ error: "Invalid Email or Password." });
    }

    if (agent.status === "inactive") {
      return res.status(400).json({ error: "Your account is not activated. Please check your email to set a password and activate your account." });
    }

    const hashedInput = hashPassword(password);
    if (agent.password !== hashedInput) {
      return res.status(400).json({ error: "Invalid Email or Password." });
    }

    const agentObj = agent.toObject();
    delete agentObj.password;

    const userAgent = req.headers["user-agent"] || "";
    const isMobile = userAgent.includes("okhttp") || userAgent.includes("Expo") || userAgent.includes("Mobile") || req.body.device === "Mobile App";
    const deviceType = isMobile ? "Mobile App" : "Web";
    await logAgentActivity(cleanEmail, "Login", deviceType, `Logged in successfully via ${deviceType}`);

    res.json({ message: "Agent login successful", agent: agentObj });
  } catch (err) {
    console.error("Agent login API error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// GET agent's claims: /api/agent/claims?email=...
router.get("/claims", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: "Agent email is required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    // Fetch all claims assigned to this agent email from MongoDB (excluding heavy image/license fields)
    const claims = await Claim.find(
      { assignedAgent: cleanEmail }
    ).sort({ createdAt: -1 });
    res.json(claims);
  } catch (err) {
    console.error("Fetch agent claims error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// GET policyholder phone by NIC: /api/agent/policyholder/:nic
router.get("/policyholder/:nic", async (req, res) => {
  try {
    const { nic } = req.params;
    const user = await User.findOne({ nic: nic.trim().toUpperCase() });
    if (!user) {
      return res.status(404).json({ error: "Policy holder not found." });
    }
    res.json({ mobile: user.mobile });
  } catch (err) {
    console.error("Fetch policyholder error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// POST update claim status/assessment or accept/decline: /api/agent/claims/:id/status
router.post("/claims/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, amount, inspectionReport, inspectionSubmitted, acceptClaim, declineClaim, rejectClaim, reason } = req.body;

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { claimNumber: id.trim().toUpperCase() };

    const claim = await Claim.findOne(query);
    if (!claim) {
      return res.status(404).json({ error: "Claim not found." });
    }

    const previousAgent = claim.assignedAgent || "";

    if (acceptClaim) {
      claim.currentStep = 3;
      claim.status = "In Progress";
      claim.messages.push({
        sender: "Agent",
        message: "Agent accepted the claim assignment and is starting the inspection process.",
        sentAt: new Date(),
        recipient: "Office Staff"
      });
    } else if (declineClaim || rejectClaim) {
      // Agent rejected/declined the assignment: Unassign agent and reset to Step 1 Pending so branch can re-assign
      claim.assignedAgent = "";
      claim.currentStep = 1;
      claim.status = "Pending";
      claim.messages.push({
        sender: "Agent",
        message: `Agent ${previousAgent} declined the claim assignment.${reason ? ` Reason: ${reason}` : ""}`,
        sentAt: new Date(),
        recipient: "Office Staff"
      });
      claim.notes.push({
        text: `Claim assignment declined by agent (${previousAgent}). Claim reset to unassigned for branch staff re-assignment.`,
        addedBy: "System",
        addedAt: new Date()
      });
    }

    if (status !== undefined && !declineClaim && !rejectClaim) claim.status = status;
    if (amount !== undefined) claim.amount = amount === "" ? null : Number(amount);
    if (inspectionReport !== undefined) claim.inspectionReport = inspectionReport;
    if (inspectionSubmitted !== undefined) {
      claim.inspectionSubmitted = inspectionSubmitted;
      if (inspectionSubmitted) {
        claim.currentStep = 4;
      }
    }

    await claim.save();

    const userAgent = req.headers["user-agent"] || "";
    const isMobile = userAgent.includes("okhttp") || userAgent.includes("Expo") || userAgent.includes("Mobile") || req.body.device === "Mobile App";
    const deviceType = isMobile ? "Mobile App" : "Web";
    const agentToLog = previousAgent || claim.assignedAgent;

    if (acceptClaim) {
      await logAgentActivity(agentToLog, "Claim Accepted", deviceType, `Accepted claim case: ${claim.claimNumber}`);
    } else if (declineClaim || rejectClaim) {
      await logAgentActivity(agentToLog, "Claim Assignment Declined", deviceType, `Declined claim assignment for: ${claim.claimNumber}`);
    } else if (inspectionSubmitted) {
      await logAgentActivity(agentToLog, "Inspection Submitted", deviceType, `Submitted physical inspection report for claim: ${claim.claimNumber}`);
    } else if (status !== undefined) {
      await logAgentActivity(agentToLog, "Claim Updated", deviceType, `Updated status to ${status} for claim: ${claim.claimNumber}`);
    }

    // Send activity email to agent
    if (agentToLog) {
      let activityText = "Claim Updated";
      let customMsg = "You updated the claim details.";
      if (acceptClaim) {
        activityText = "Claim Accepted";
        customMsg = "You have successfully accepted this claim assignment. The physical inspection is now marked in progress.";
      } else if (declineClaim || rejectClaim) {
        activityText = "Claim Assignment Declined";
        customMsg = "You declined this claim assignment. The claim has been returned to the branch office for reassignment.";
      } else if (inspectionSubmitted) {
        activityText = "Inspection Report Submitted";
        customMsg = "You have successfully submitted the physical vehicle inspection report. The claim is now ready for office staff review.";
      } else if (status !== undefined) {
        activityText = `Status Updated: ${status}`;
        customMsg = `You updated the claim status to: ${status}.`;
      }
      await sendAgentActivityEmail(agentToLog, activityText, claim, customMsg);
    }

    res.json({ message: "Claim status updated successfully", claim });
  } catch (err) {
    console.error("Update claim status error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// GET verify activation token: /api/agent/verify-activation?token=...
router.get("/verify-activation", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ error: "Activation token is required." });
    }

    const agent = await Agent.findOne({
      activationToken: token,
      activationExpires: { $gt: new Date() },
      status: "inactive"
    });

    if (!agent) {
      return res.status(400).json({ error: "Invalid or expired activation link." });
    }

    res.json({ message: "Token verified successfully.", email: agent.email, name: agent.name });
  } catch (err) {
    console.error("Verify activation error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// POST activate account: /api/agent/activate
router.post("/activate", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: "Token and Password are required." });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const agent = await Agent.findOne({
      activationToken: token,
      activationExpires: { $gt: new Date() },
      status: "inactive"
    });

    if (!agent) {
      return res.status(400).json({ error: "Invalid or expired activation link." });
    }

    // Hash password and set to active
    agent.password = hashPassword(password);
    agent.status = "active";
    agent.mustChangePassword = false;
    agent.activationToken = undefined;
    agent.activationExpires = undefined;

    await agent.save();

    res.json({ message: "Your agent account has been activated successfully! You can now log in." });
  } catch (err) {
    console.error("Activate agent error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// GET agent availability: /api/agent/availability?email=...
router.get("/availability", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: "Agent email is required." });
    }
    const agent = await Agent.findOne({ email: email.trim().toLowerCase() });
    if (!agent) {
      return res.status(404).json({ error: "Agent not found." });
    }
    res.json({ availability: agent.availability || "Active" });
  } catch (err) {
    console.error("Get agent availability error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// POST update agent availability: /api/agent/availability
router.post("/availability", async (req, res) => {
  try {
    const { email, availability } = req.body;
    if (!email || !availability) {
      return res.status(400).json({ error: "Email and Availability are required." });
    }
    const cleanEmail = email.trim().toLowerCase();
    const cleanAvail = availability.trim() === "Offline" ? "Offline" : "Active";
    
    const agent = await Agent.findOneAndUpdate(
      { email: cleanEmail },
      { availability: cleanAvail },
      { new: true }
    );
    if (!agent) {
      return res.status(404).json({ error: "Agent not found." });
    }

    const userAgent = req.headers["user-agent"] || "";
    const isMobile = userAgent.includes("okhttp") || userAgent.includes("Expo") || userAgent.includes("Mobile") || req.body.device === "Mobile App";
    const deviceType = isMobile ? "Mobile App" : "Web";
    const actionLabel = cleanAvail === "Offline" ? "Go Offline" : "Go Active";
    const detailLabel = cleanAvail === "Offline" ? "Changed status to Offline." : "Changed status to Active.";
    await logAgentActivity(cleanEmail, actionLabel, deviceType, detailLabel);

    res.json({ message: "Availability updated successfully.", availability: agent.availability });
  } catch (err) {
    console.error("Update agent availability error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// GET agent activities list: /api/agent/activities?email=...
router.get("/activities", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: "Agent email is required." });
    }
    const cleanEmail = email.trim().toLowerCase();
    const activities = await AgentActivity.find({ agentEmail: cleanEmail })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(activities);
  } catch (err) {
    console.error("Fetch agent activities error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// POST change agent password: /api/agent/change-password
router.post("/change-password", async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ error: "Email, current password, and new password are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const agent = await Agent.findOne({ email: cleanEmail });
    if (!agent) {
      return res.status(404).json({ error: "Agent not found." });
    }

    // Verify current temporary/existing password
    const hashedCurrent = hashPassword(currentPassword);
    if (agent.password !== hashedCurrent) {
      return res.status(400).json({ error: "Incorrect current password." });
    }

    // Update password and clear mustChangePassword flag
    agent.password = hashPassword(newPassword);
    agent.mustChangePassword = false;
    await agent.save();

    // Log this activity
    const userAgent = req.headers["user-agent"] || "";
    const isMobile = userAgent.includes("okhttp") || userAgent.includes("Expo") || userAgent.includes("Mobile") || req.body.device === "Mobile App";
    const deviceType = isMobile ? "Mobile App" : "Web";
    await logAgentActivity(cleanEmail, "Password Change", deviceType, "Temporary password reset completed successfully.");

    res.json({ message: "Password updated successfully." });
  } catch (err) {
    console.error("Change password route error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// GET agent profile details: /api/agent/profile?email=...
router.get("/profile", async (req, res) => {
  try {
    const { email, agentId } = req.query;
    if (!email && !agentId) {
      return res.status(400).json({ error: "Agent email or agentId is required." });
    }

    const query = {};
    if (email) query.email = email.trim().toLowerCase();
    if (agentId) query.agentId = agentId.trim().toUpperCase();

    const agent = await Agent.findOne(query, { password: 0 });
    if (!agent) {
      return res.status(404).json({ error: "Agent not found." });
    }

    // Fetch claim stats for this agent
    const cleanEmail = agent.email.toLowerCase();
    const assignedClaims = await Claim.find({ assignedAgent: cleanEmail });
    const totalClaims = assignedClaims.length;
    const activeClaims = assignedClaims.filter(c => c.status === "In Progress" || c.currentStep === 3).length;
    const completedInspections = assignedClaims.filter(c => c.inspectionSubmitted || c.currentStep >= 4).length;

    res.json({
      agent,
      stats: {
        totalClaims,
        activeClaims,
        completedInspections
      }
    });
  } catch (err) {
    console.error("Fetch agent profile error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// PUT update agent profile: /api/agent/profile
router.put("/profile", async (req, res) => {
  try {
    const {
      email,
      agentId,
      profilePhoto,
      phone,
      address,
      city,
      district,
      area,
      province,
      bankName,
      bankBranch,
      accountNumber,
      accountType,
      accountHolderName
    } = req.body;

    if (!email && !agentId) {
      return res.status(400).json({ error: "Agent email or agentId is required." });
    }

    const query = {};
    if (email) query.email = email.trim().toLowerCase();
    if (agentId) query.agentId = agentId.trim().toUpperCase();

    const agent = await Agent.findOne(query);
    if (!agent) {
      return res.status(404).json({ error: "Agent not found." });
    }

    // Handle profile photo upload if provided as data URL
    if (profilePhoto !== undefined) {
      if (profilePhoto && typeof profilePhoto === "string" && profilePhoto.startsWith("data:image")) {
        try {
          const photoUrl = await uploadToCloudinary(profilePhoto, "agents/avatars");
          agent.profilePhoto = photoUrl;
        } catch (uploadErr) {
          console.warn("Cloudinary agent photo upload failed, storing fallback:", uploadErr.message);
          agent.profilePhoto = profilePhoto;
        }
      } else {
        agent.profilePhoto = profilePhoto || "";
      }
    }

    // Update editable contact and bank fields
    if (phone !== undefined) agent.phone = phone.trim();
    if (address !== undefined) agent.address = address.trim();
    if (city !== undefined) agent.city = city.trim();
    if (district !== undefined) agent.district = district.trim();
    if (area !== undefined) agent.area = area.trim();
    if (province !== undefined) agent.province = province.trim();
    if (bankName !== undefined) agent.bankName = bankName.trim();
    if (bankBranch !== undefined) agent.bankBranch = bankBranch.trim();
    if (accountNumber !== undefined) agent.accountNumber = accountNumber.trim();
    if (accountType !== undefined) agent.accountType = accountType.trim();
    if (accountHolderName !== undefined) agent.accountHolderName = accountHolderName.trim();

    await agent.save();

    const userAgent = req.headers["user-agent"] || "";
    const isMobile = userAgent.includes("okhttp") || userAgent.includes("Expo") || userAgent.includes("Mobile") || req.body.device === "Mobile App";
    const deviceType = isMobile ? "Mobile App" : "Web";
    await logAgentActivity(agent.email, "Profile Updated", deviceType, "Agent updated personal contact and profile details.");

    const agentObj = agent.toObject();
    delete agentObj.password;

    res.json({ message: "Agent profile updated successfully.", agent: agentObj });
  } catch (err) {
    console.error("Update agent profile error:", err);
    res.status(500).json({ error: err.message || "An internal server error occurred." });
  }
});

// POST submit agent profile update request for branch review: /api/agent/profile-update-request
router.post("/profile-update-request", async (req, res) => {
  try {
    const { email, agentId, requestType, requestedChanges } = req.body;

    if (!email && !agentId) {
      return res.status(400).json({ error: "Agent email or agentId is required." });
    }

    const query = {};
    if (email) query.email = email.trim().toLowerCase();
    if (agentId) query.agentId = agentId.trim().toUpperCase();

    const agent = await Agent.findOne(query);
    if (!agent) {
      return res.status(404).json({ error: "Agent not found." });
    }

    if (!requestedChanges || typeof requestedChanges !== "object" || Object.keys(requestedChanges).length === 0) {
      return res.status(400).json({ error: "No changes provided in the update request." });
    }

    // Security check: strictly disallow editing immutable credentials directly
    const sanitizedChanges = { ...requestedChanges };
    delete sanitizedChanges.nic;
    delete sanitizedChanges.branch;
    delete sanitizedChanges.agentId;
    delete sanitizedChanges._id;
    delete sanitizedChanges.password;
    delete sanitizedChanges.status;

    // Capture snapshot of original data
    const originalData = {
      name: agent.name,
      nic: agent.nic,
      phone: agent.phone || "",
      address: agent.address || "",
      city: agent.city || "",
      district: agent.district || "",
      area: agent.area || "",
      province: agent.province || "",
      bankName: agent.bankName || "",
      bankBranch: agent.bankBranch || "",
      accountNumber: agent.accountNumber || "",
      accountType: agent.accountType || "",
      accountHolderName: agent.accountHolderName || ""
    };

    const newRequest = new AgentProfileUpdateRequest({
      agentId: agent.agentId,
      agentNic: agent.nic,
      agentName: agent.name,
      agentEmail: agent.email,
      agentPhone: agent.phone || "",
      branch: agent.branch || "Galle",
      requestType: requestType || "Personal & Contact",
      originalData,
      requestedChanges: sanitizedChanges,
      status: "Pending"
    });

    await newRequest.save();

    const userAgent = req.headers["user-agent"] || "";
    const isMobile = userAgent.includes("okhttp") || userAgent.includes("Expo") || userAgent.includes("Mobile") || req.body.device === "Mobile App";
    const deviceType = isMobile ? "Mobile App" : "Web";
    await logAgentActivity(
      agent.email,
      "Profile Edit Request Submitted",
      deviceType,
      `Submitted profile edit request (${requestType || "Personal & Contact"}) to ${agent.branch} Branch.`
    );

    res.status(201).json({
      message: "Your profile update request has been submitted to your branch staff for review.",
      request: newRequest
    });
  } catch (err) {
    console.error("Submit agent profile update request error:", err);
    res.status(500).json({ error: err.message || "An internal server error occurred." });
  }
});

// GET agent's own profile update requests: /api/agent/profile-update-requests
router.get("/profile-update-requests", async (req, res) => {
  try {
    const { email, agentId } = req.query;
    if (!email && !agentId) {
      return res.status(400).json({ error: "Agent email or agentId is required." });
    }

    const query = {};
    if (email) query.agentEmail = email.trim().toLowerCase();
    if (agentId) query.agentId = agentId.trim().toUpperCase();

    const requests = await AgentProfileUpdateRequest.find(query).sort({ createdAt: -1 });
    res.json({ requests });
  } catch (err) {
    console.error("Fetch agent profile update requests error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

export default router;
