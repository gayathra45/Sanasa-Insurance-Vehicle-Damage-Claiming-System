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
import { hashPassword } from "../utils/crypto.js";
import { sendEmail, getBaseTemplate } from "../utils/email.js";
import { uploadToCloudinary } from "../utils/upload.js";
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

    // Return staff details without password
    const staffObj = staff.toObject();
    delete staffObj.password;

    res.json({ message: "Login successful", staff: staffObj });
  } catch (err) {
    console.error("Office staff login API error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// GET dashboard statistics: /api/office-staff/stats
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

// GET all policy holders for a specific branch: /api/office-staff/policy-holders
router.get("/policy-holders", async (req, res) => {
  try {
    const { branch } = req.query;
    if (!branch) {
      return res.status(400).json({ error: "Branch query parameter is required." });
    }
    const policyHolders = await User.find(
      { branch: branch.trim(), status: "Approved" },
      { password: 0, documents: 0 }
    ).sort({ createdAt: -1 });
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
    if (currentStep !== undefined) claim.currentStep = Number(currentStep);
    if (assignedAgent !== undefined) claim.assignedAgent = assignedAgent;
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

export default router;
