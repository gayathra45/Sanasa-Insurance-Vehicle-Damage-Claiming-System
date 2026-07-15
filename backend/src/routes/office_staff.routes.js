import express from "express";
import crypto from "crypto";
import OfficeStaff from "../models/office_staff.model.js";
import User from "../models/user.model.js";
import Claim from "../models/claim.model.js";
import Agent from "../models/agent.model.js";
import Admin from "../models/admin.model.js";
import DeletedAgent from "../models/deleted_agent.model.js";
import { hashPassword } from "../utils/crypto.js";
import { uploadToCloudinary } from "../utils/upload.js";
import { sendEmail, getBaseTemplate, sendAgentActivityEmail } from "../utils/email.js";

const router = express.Router();

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

    // Return staff object without password
    const staffObj = staff.toObject();
    delete staffObj.password;

    res.json({ message: "Office staff login successful", staff: staffObj });
  } catch (err) {
    console.error("Office staff login API error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// POST change password on first login: /api/office-staff/change-password
router.post("/change-password", async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const staff = await OfficeStaff.findOne({ email: cleanEmail });
    if (!staff) {
      return res.status(404).json({ error: "Branch staff account not found." });
    }

    const hashedCurrent = hashPassword(currentPassword);
    if (staff.password !== hashedCurrent) {
      return res.status(400).json({ error: "Incorrect current temporary password." });
    }

    if (newPassword.length < 6 || newPassword.length > 12) {
      return res.status(400).json({ error: "Password must be between 6 and 12 characters." });
    }
    if (!/[0-9]/.test(newPassword) && !/[^A-Za-z0-9]/.test(newPassword)) {
      return res.status(400).json({ error: "Password must contain at least one number or special character." });
    }

    staff.password = hashPassword(newPassword);
    staff.mustChangePassword = false;
    await staff.save();

    res.json({ message: "Password updated successfully." });
  } catch (err) {
    console.error("Change branch password error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// GET dashboard stats: /api/office-staff/dashboard-stats
router.get("/dashboard-stats", async (req, res) => {
  try {
    const { branch } = req.query;
    if (!branch) {
      return res.status(400).json({ error: "Branch query parameter is required." });
    }

    // Filter by the last 30 days (one month data)
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
    const dateFilter = { createdAt: { $gte: oneMonthAgo } };

    // Common query filter by branch
    const branchFilter = { branch: branch.trim() };

    // 1. KPI Counts & lists (Fetched in parallel to minimize network latency)
    const [
      unassignedClaimsCount,
      newRegistrationsCount,
      activeClaimsCount,
      pendingClaimsCount,
      newClaimsList,
      newRegistrationsList
    ] = await Promise.all([
      Claim.countDocuments({
        ...branchFilter,
        ...dateFilter,
        assignedAgent: ""
      }),
      User.countDocuments({
        ...branchFilter,
        ...dateFilter,
        status: { $nin: ["Approved", "Rejected"] }
      }),
      Claim.countDocuments({
        ...branchFilter,
        ...dateFilter,
        status: "In Progress"
      }),
      Claim.countDocuments({
        ...branchFilter,
        ...dateFilter,
        status: "Pending"
      }),
      Claim.find(
        {
          ...branchFilter,
          ...dateFilter
        },
        { accidentPhotos: 0, drivingLicense: 0 }
      ).sort({ createdAt: -1 }),
      User.find(
        {
          ...branchFilter,
          ...dateFilter,
          status: { $nin: ["Approved", "Rejected"] }
        },
        { documents: 0 }
      ).sort({ createdAt: -1 })
    ]);

    res.json({
      stats: {
        unassignedClaims: unassignedClaimsCount,
        newRegistrations: newRegistrationsCount,
        activeClaims: activeClaimsCount,
        pendingClaims: pendingClaimsCount
      },
      newClaims: newClaimsList,
      newRegistrations: newRegistrationsList
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
    const claims = await Claim.find({ branch: branch.trim() }).sort({ createdAt: -1 });

    const nics = claims.map(c => c.userNic);
    const users = await User.find({ nic: { $in: nics } }, { nic: 1, bankDetails: 1 });
    const bankDetailsMap = {};
    users.forEach(u => {
      bankDetailsMap[u.nic] = u.bankDetails;
    });

    const claimsWithBankDetails = claims.map(c => {
      const plainObj = c.toObject();
      plainObj.policyHolderBankDetails = bankDetailsMap[c.userNic] || {
        bankName: "",
        branchName: "",
        accountNumber: "",
        accountHolderName: ""
      };
      return plainObj;
    });

    res.json({ claims: claimsWithBankDetails });
  } catch (err) {
    console.error("Fetch office staff claims error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// GET all policy holders for a specific branch: /api/office-staff/policy-holders
router.get("/policy-holders", async (req, res) => {
  try {
    const { branch } = req.query;
    if (!branch) {
      return res.status(400).json({ error: "Branch query parameter is required." });
    }
    const policyHolders = await User.find({ branch: branch.trim(), status: "Approved" }, { password: 0 }).sort({ createdAt: -1 });
    res.json({ policyHolders });
  } catch (err) {
    console.error("Fetch office staff policy holders error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// GET all agents for a specific branch: /api/office-staff/agents
router.get("/agents", async (req, res) => {
  try {
    const { branch } = req.query;
    if (!branch) {
      return res.status(400).json({ error: "Branch query parameter is required." });
    }
    const agents = await Agent.find({ branch: branch.trim() }, { password: 0 }).sort({ createdAt: -1 });
    res.json({ agents });
  } catch (err) {
    console.error("Fetch office staff agents error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// GET all deleted agents for a specific branch: /api/office-staff/deleted-agents
router.get("/deleted-agents", async (req, res) => {
  try {
    const { branch } = req.query;
    if (!branch) {
      return res.status(400).json({ error: "Branch query parameter is required." });
    }
    const deletedAgents = await DeletedAgent.find({ branch: branch.trim() }).sort({ deletedAt: -1 });
    res.json({ deletedAgents });
  } catch (err) {
    console.error("Fetch office staff deleted agents error:", err);
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
    const registrations = await User.find({ branch: branch.trim(), status: { $ne: "Approved" } }, { password: 0 }).sort({ createdAt: -1 });
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
    
    // Automatically approve initial vehicles if registration is approved
    if (status === "Approved" && user.vehicles && Array.isArray(user.vehicles)) {
      user.vehicles.forEach(v => {
        v.status = "Approved";
      });
    }

    await user.save();

    res.json({ message: `Registration status updated to ${status}`, user });
  } catch (err) {
    console.error("Update registration status error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
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
      messageTexts,
      messageSender,
      messageRecipient,
      priority,
      requestedDocuments,
      documentsRequested,
      documentRequestTo,
      inspectionReport,
      inspectionSubmitted,
      paymentReceipt,
      noteText,
      bankName,
      bankBranch,
      bankAccount,
      rejectionReason,
      isManuallyUpdated,
      manualUpdateReason,
      manualUpdateBy
    } = req.body;

    const claim = await Claim.findOne({ claimNumber: claimNumber.trim().toUpperCase() });
    if (!claim) {
      return res.status(404).json({ error: "Claim not found." });
    }

    const previousAgent = claim.assignedAgent;
    const previousStatus = claim.status;
    const previousStep = claim.currentStep;

    if (status !== undefined) {
      claim.status = status;
    }
    
    if (amount !== undefined) {
      claim.amount = amount === "" ? null : Number(amount);
    }

    if (currentStep !== undefined) {
      claim.currentStep = Number(currentStep);
    }

    if (assignedAgent !== undefined) {
      claim.assignedAgent = assignedAgent;
      // Auto-advance to Step 2 (Assigned) if agent assigned and step is 1
      if (assignedAgent && claim.currentStep < 2) {
        claim.currentStep = 2;
      }
    }

    if (priority !== undefined) claim.priority = priority;
    if (requestedDocuments !== undefined) claim.requestedDocuments = requestedDocuments;
    if (documentsRequested !== undefined) claim.documentsRequested = documentsRequested;
    if (documentRequestTo !== undefined) claim.documentRequestTo = documentRequestTo;
    if (inspectionReport !== undefined) claim.inspectionReport = inspectionReport;
    
    if (inspectionSubmitted !== undefined) {
      claim.inspectionSubmitted = inspectionSubmitted;
      if (inspectionSubmitted && claim.currentStep < 4) {
        claim.currentStep = 4;
      }
    }

    if (paymentReceipt !== undefined) {
      let receiptUrl = paymentReceipt;
      if (paymentReceipt && paymentReceipt.startsWith("data:")) {
        receiptUrl = await uploadToCloudinary(paymentReceipt, "claims/payment_receipts");
      }
      claim.paymentReceipt = receiptUrl;
      if (receiptUrl && claim.currentStep < 6) {
        claim.currentStep = 6;
      }
    }

    if (bankName !== undefined) claim.bankName = bankName;
    if (bankBranch !== undefined) claim.bankBranch = bankBranch;
    if (bankAccount !== undefined) claim.bankAccount = bankAccount;
    if (rejectionReason !== undefined) claim.rejectionReason = rejectionReason;

    if (isManuallyUpdated !== undefined) {
      claim.isManuallyUpdated = isManuallyUpdated;
      if (isManuallyUpdated) {
        claim.manualUpdateAt = new Date();
      }
    }
    if (manualUpdateReason !== undefined) {
      claim.manualUpdateReason = manualUpdateReason;
    }
    if (manualUpdateBy !== undefined) {
      claim.manualUpdateBy = manualUpdateBy;
    }

    if (messageText) {
      claim.messages.push({
        sender: messageSender || "Office Staff",
        message: messageText,
        sentAt: new Date(),
        recipient: messageRecipient || "Policy Holder"
      });
    }

    if (Array.isArray(messageTexts)) {
      messageTexts.forEach((msg) => {
        claim.messages.push({
          sender: messageSender || "Office Staff",
          message: msg.message || msg,
          sentAt: new Date(),
          recipient: msg.recipient || messageRecipient || "Policy Holder"
        });
      });
    }

    if (noteText) {
      claim.notes.push({
        text: noteText,
        addedBy: messageSender || "Office Staff",
        addedAt: new Date()
      });
    }

    await claim.save();

    // Trigger notification email to assigned agent
    if (claim.assignedAgent) {
      const isNewAssignment = assignedAgent !== undefined && assignedAgent.trim() !== "" && assignedAgent.trim().toLowerCase() !== (previousAgent || "").trim().toLowerCase();
      const isStatusChanged = status !== undefined && status !== previousStatus;
      const isStepChanged = currentStep !== undefined && Number(currentStep) !== previousStep;
      const isReceiptUploaded = paymentReceipt !== undefined && !!claim.paymentReceipt;

      if (isNewAssignment) {
        await sendAgentActivityEmail(
          claim.assignedAgent,
          "New Claim Assigned",
          claim,
          `You have been assigned to handle this claim. Please log in to accept the claim and initiate the inspection.`
        );
      } else if (isStatusChanged || isStepChanged || isReceiptUploaded) {
        let activityText = "Claim Details Updated";
        let customMsg = "The office staff has updated the claim details.";
        
        if (status === "Approved") {
          activityText = "Claim Approved";
          customMsg = `The claim has been officially APPROVED. Approved Amount: LKR ${claim.amount || 0.00}`;
        } else if (status === "Rejected") {
          activityText = "Claim Rejected";
          customMsg = `The claim has been REJECTED. Reason: ${claim.rejectionReason || "No reason specified."}`;
        } else if (isReceiptUploaded) {
          activityText = "Payment Receipt Submitted";
          customMsg = "The transaction bank receipt has been submitted and payment processing is completed.";
        } else if (isStepChanged) {
          activityText = `Progress Updated to Step ${claim.currentStep}`;
          customMsg = `The claim tracking step has been updated to: Step ${claim.currentStep}`;
        }

        await sendAgentActivityEmail(claim.assignedAgent, activityText, claim, customMsg);
      }
    }

    const user = await User.findOne({ nic: claim.userNic }, { bankDetails: 1 });
    const claimWithBankDetails = claim.toObject();
    claimWithBankDetails.policyHolderBankDetails = user ? user.bankDetails : {
      bankName: "",
      branchName: "",
      accountNumber: "",
      accountHolderName: ""
    };

    res.json({ message: "Claim updated successfully", claim: claimWithBankDetails });
  } catch (err) {
    console.error("Update claim error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
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
      province,
      bankName,
      bankBranch,
      accountNumber,
      accountType,
      accountHolderName,
      nicFront,
      nicBack,
      birthCertificate,
      policeReport,
      password
    } = req.body;

    console.log("POST /agents fields received:", { name, email, nic, address, dob, branch });
    if (!name || !email || !nic || !address || !dob || !branch) {
      return res.status(400).json({ error: "All standard fields are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanNic = nic.trim().toUpperCase();

    // Check if email or nic already exists in Agent collection
    const existingAgent = await Agent.findOne({ $or: [{ email: cleanEmail }, { nic: cleanNic }] });
    if (existingAgent) {
      return res.status(400).json({ error: "An agent with this Email or NIC is already registered." });
    }

    // Check if email or nic already exists in User collection
    const existingUser = await User.findOne({ $or: [{ email: cleanEmail }, { nic: cleanNic }] });
    if (existingUser) {
      return res.status(400).json({ error: "A user with this Email or NIC is already registered." });
    }

    // Check if email or nic already exists in Admin collection
    const existingAdmin = await Admin.findOne({ $or: [{ email: cleanEmail }, { nic: cleanNic }] });
    if (existingAdmin) {
      return res.status(400).json({ error: "An admin with this Email or NIC is already registered." });
    }

    // Check if email already exists in OfficeStaff collection
    const existingOfficeStaff = await OfficeStaff.findOne({ email: cleanEmail });
    if (existingOfficeStaff) {
      return res.status(400).json({ error: "An office staff account with this Email is already registered." });
    }

    // Auto-generate agentId (e.g. AGT-0001)
    const lastAgent = await Agent.findOne({}, { agentId: 1 }).sort({ createdAt: -1 });
    let nextAgentId = "AGT-0001";
    if (lastAgent && lastAgent.agentId) {
      const match = lastAgent.agentId.match(/AGT-(\d+)/i);
      if (match) {
        const currentNum = parseInt(match[1], 10);
        nextAgentId = `AGT-${String(currentNum + 1).padStart(4, "0")}`;
      }
    }

    // Generate a secure activation token and hash a placeholder password
    const token = crypto.randomBytes(32).toString("hex");
    const placeholderPassword = crypto.randomBytes(16).toString("hex");
    const hashedPassword = hashPassword(placeholderPassword);

    // Upload documents to Cloudinary if they exist
    let nicFrontUrl = "";
    let nicBackUrl = "";
    let birthCertificateUrl = "";
    let policeReportUrl = "";

    if (nicFront) {
      nicFrontUrl = await uploadToCloudinary(nicFront, "agents/documents");
    }
    if (nicBack) {
      nicBackUrl = await uploadToCloudinary(nicBack, "agents/documents");
    }
    if (birthCertificate) {
      birthCertificateUrl = await uploadToCloudinary(birthCertificate, "agents/documents");
    }
    if (policeReport) {
      policeReportUrl = await uploadToCloudinary(policeReport, "agents/documents");
    }

    // Automatically find province based on the branch
    const staff = await OfficeStaff.findOne({ branch: branch.trim() });
    let resolvedProvince = staff ? staff.province : "";
    if (!resolvedProvince && province) {
      resolvedProvince = province.trim();
    }

    const newAgent = new Agent({
      agentId: nextAgentId,
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      mustChangePassword: true,
      resetSessionToken: token,
      resetSessionExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      nic: cleanNic,
      address: address.trim(),
      dob: dob.trim(),
      branch: branch.trim(),
      phone: phone ? phone.trim() : "",
      city: city ? city.trim() : "",
      province: resolvedProvince,
      bankName: bankName ? bankName.trim() : "",
      bankBranch: bankBranch ? bankBranch.trim() : "",
      accountNumber: accountNumber ? accountNumber.trim() : "",
      accountType: accountType ? accountType.trim() : "",
      accountHolderName: accountHolderName ? accountHolderName.trim() : "",
      nicFront: nicFrontUrl,
      nicBack: nicBackUrl,
      birthCertificate: birthCertificateUrl,
      policeReport: policeReportUrl,
      status: "active"
    });

    await newAgent.save();

    // Send welcome email with activation details
    const activationUrl = `http://localhost:3000/Reset_password?token=${encodeURIComponent(token)}`;
    const subject = `Welcome to Sanasa Insurance — Activate Your Agent Account`;
    const htmlBody = getBaseTemplate(
      subject,
      `
      <h2>Agent Account Created Successfully</h2>
      <p>Dear <strong>${name.trim()}</strong>,</p>
      <p>Your agent account has been registered by the branch staff at the <strong>${branch.trim()}</strong> branch. Below are your account details:</p>
      <table class="data-table">
        <tr>
          <td class="label">Agent ID:</td>
          <td class="value highlight-value">${nextAgentId}</td>
        </tr>
        <tr>
          <td class="label">Email / Login Username:</td>
          <td class="value">${cleanEmail}</td>
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
      <p>To finalize setting up your account, please click the button below to set your secure password:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${activationUrl}" style="background-color: #0f2d3a; color: #ffffff; padding: 12px 28px; border-radius: 25px; text-decoration: none; font-weight: bold; display: inline-block;">Activate & Set Password</a>
      </p>
      <p style="font-size: 13px; color: #718096; line-height: 1.5; text-align: center;">
        This activation link is valid for <strong>24 hours</strong>. If you did not request this, you can ignore this email.
      </p>
      `
    );
    const textBody = `Welcome to Sanasa Insurance. Your Agent ID is ${nextAgentId}. Use email ${cleanEmail} and the activation link ${activationUrl} to activate your account and set your password.`;

    try {
      await sendEmail(cleanEmail, subject, htmlBody, textBody);
    } catch (emailErr) {
      console.error("⚠️ Failed to send agent welcome email:", emailErr.message);
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
    
    let documentUrl = "";
    if (document) {
      console.log(`- Attached proof document length: ${document.length} characters (Base64)`);
      documentUrl = await uploadToCloudinary(document, "agents/deletion_proof");
    }

    // Save to DeletedAgent archive
    await DeletedAgent.create({
      agentId: agent.agentId,
      name: agent.name,
      email: agent.email,
      nic: agent.nic,
      address: agent.address,
      dob: agent.dob,
      branch: agent.branch,
      phone: agent.phone || "",
      city: agent.city || "",
      province: agent.province || "",
      bankName: agent.bankName || "",
      bankBranch: agent.bankBranch || "",
      accountNumber: agent.accountNumber || "",
      accountType: agent.accountType || "",
      accountHolderName: agent.accountHolderName || "",
      nicFront: agent.nicFront || "",
      nicBack: agent.nicBack || "",
      birthCertificate: agent.birthCertificate || "",
      policeReport: agent.policeReport || "",
      reason: reason || "Other",
      note: note || "",
      document: documentUrl,
      deletedAt: new Date()
    });

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
    if (city !== undefined) agent.city = city.trim();
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
    }, { password: 0 });

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

// POST change office staff password: /api/office-staff/change-password
router.post("/change-password", async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ error: "Email, Current Password, and New Password are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const staff = await OfficeStaff.findOne({ email: cleanEmail });
    if (!staff) {
      return res.status(404).json({ error: "Office staff member not found." });
    }

    const hashedInput = hashPassword(currentPassword);
    if (staff.password !== hashedInput) {
      return res.status(400).json({ error: "Incorrect current password." });
    }

    if (newPassword.length < 6 || newPassword.length > 12) {
      return res.status(400).json({ error: "Password must be between 6 and 12 characters." });
    }
    if (!/[0-9]/.test(newPassword) && !/[^A-Za-z0-9]/.test(newPassword)) {
      return res.status(400).json({ error: "Password must contain at least one number or special character." });
    }

    staff.password = hashPassword(newPassword);
    staff.mustChangePassword = false;
    await staff.save();

    res.json({ message: "Password updated successfully." });
  } catch (err) {
    console.error("Change staff password error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

export default router;
