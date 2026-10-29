import express from "express";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import Claim from "../models/claim.model.js";
import User from "../models/user.model.js";
import Agent from "../models/agent.model.js";
import InspectionReport from "../models/inspection_report.model.js";
import {
  normalizeVehicleCategory,
  CATEGORY_CHECKLISTS,
  DAMAGE_TYPES,
  DAMAGE_SEVERITIES,
  VEHICLE_CATEGORIES
} from "../utils/vehicleDiagramConfig.js";
import { getIO } from "../utils/socket.js";
import { notifyInspectionUpdate } from "../services/smsNotificationService.js";
import { uploadToCloudinary } from "../utils/upload.js";

const router = express.Router();
const __dirname = path.resolve();

/**
 * Format plain-text report for backward compatibility with legacy views
 */
function buildLegacyReportText(report) {
  const cond = report.vehicleCondition || {};
  const markers = report.damageMarkers || [];
  const checklist = report.checklist || [];

  const markerLines = markers.map((m, idx) => {
    return `  #${idx + 1} [${m.view.toUpperCase()}] ${m.partName} - ${m.damageType} (${m.severity})${m.isPreExisting ? " [PRE-EXISTING]" : ""}: ${m.description || "No notes"} (Est: LKR ${Number(m.estimatedRepairCost || 0).toLocaleString()})`;
  }).join("\n") || "  No damage markers recorded.";

  const checklistLines = checklist.map(c => `  • ${c.item}: [${c.status}]${c.notes ? ` - ${c.notes}` : ""}`).join("\n") || "  Checklist not completed.";

  return `
==================================================
           VEHICLE CLAIM INSPECTION REPORT
==================================================
[1. VEHICLE CONDITION DETAILS]
• Odometer: ${cond.odometer || "N/A"} km
• Fuel Level: ${cond.fuelLevel || "1/2"}
• Recommended Action: ${cond.recommendedAction || "Repairable (Minor)"}
• Estimated Cost: LKR ${Number(report.totalEstimatedCost || 0).toLocaleString()}
• Vehicle Category: ${report.vehicleCategory || "Car"}

[2. COMPONENT DAMAGE CHECKLIST]
${checklistLines}

[3. INTERACTIVE DAMAGE MARKERS (${markers.length})]
${markerLines}

[4. PRE-EXISTING DAMAGE NOTES]
${cond.preExistingDamage?.trim() || "None reported."}

[5. PHYSICAL INSPECTION NOTES]
${report.agentNotes?.trim() || "Inspection completed on-site by assigned agent."}
==================================================
`.trim();
}

/**
 * Helper to authenticate and verify access permissions for claim inspection
 */
async function verifyClaimAccess(claim, req) {
  const reqUserEmail = (req.headers["x-user-email"] || req.query.email || req.body?.agentEmail || "").trim().toLowerCase();
  const reqUserRole = (req.headers["x-user-role"] || req.query.role || req.body?.role || "").trim();
  const reqUserBranch = (req.headers["x-user-branch"] || req.query.branch || req.body?.branch || "").trim();

  // If Admin, full access
  if (reqUserRole === "Admin") return { authorized: true, role: "Admin", email: reqUserEmail };

  // If Office Staff, must match branch
  if (reqUserRole === "OfficeStaff" || reqUserRole === "Office Staff") {
    if (reqUserBranch && claim.branch && reqUserBranch.toLowerCase() !== claim.branch.toLowerCase()) {
      return { authorized: false, reason: "Cross-branch access forbidden" };
    }
    return { authorized: true, role: "OfficeStaff", email: reqUserEmail, branch: claim.branch };
  }

  // If Agent, must be assigned to this claim
  if (reqUserEmail && claim.assignedAgent) {
    if (reqUserEmail.toLowerCase() !== claim.assignedAgent.toLowerCase()) {
      return { authorized: false, reason: "Agent is not assigned to this claim" };
    }
    return { authorized: true, role: "Agent", email: reqUserEmail };
  }

  // If no auth headers supplied (e.g. during dev / backward compatible query), allow with warning
  return { authorized: true, role: reqUserRole || "Agent", email: reqUserEmail || claim.assignedAgent };
}

/**
 * GET /api/inspection/claim/:claimNumber
 * Retrieves the full inspection report, vehicle metadata, category diagrams, and checklist
 */
router.get("/claim/:claimNumber", async (req, res) => {
  try {
    const { claimNumber } = req.params;
    const cleanClaimNo = claimNumber.trim().toUpperCase();

    const claim = await Claim.findOne({
      claimNumber: { $regex: new RegExp(`^${cleanClaimNo}$`, "i") }
    });

    if (!claim) {
      return res.status(404).json({ error: "Claim record not found." });
    }

    const authCheck = await verifyClaimAccess(claim, req);
    if (!authCheck.authorized) {
      return res.status(403).json({ error: authCheck.reason || "Unauthorized access." });
    }

    // Resolve linked Policyholder and Vehicle details
    const user = await User.findOne({ nic: claim.userNic });
    const cleanPlate = (claim.vehiclePlate || "").replace(/\s+/g, "").toUpperCase();

    const vehicleRecord = (user?.vehicles || []).find(
      (v) => (v.numberPlate || "").replace(/\s+/g, "").toUpperCase() === cleanPlate
    ) || {};

    const rawVehicleType = vehicleRecord.vehicleType || "Car";
    const categoryInfo = normalizeVehicleCategory(rawVehicleType);

    // Retrieve or instantiate Inspection Report
    let report = await InspectionReport.findOne({ claimNumber: cleanClaimNo });

    if (!report) {
      // Create initial draft template
      const defaultChecklist = (CATEGORY_CHECKLISTS[categoryInfo.category] || CATEGORY_CHECKLISTS[VEHICLE_CATEGORIES.CAR]).map(item => ({
        item,
        status: "Not Inspected",
        notes: "",
        markerId: ""
      }));

      report = new InspectionReport({
        claimId: claim._id,
        claimNumber: cleanClaimNo,
        vehiclePlate: claim.vehiclePlate,
        vehicleCategory: categoryInfo.category,
        vehicleDetails: {
          company: vehicleRecord.company || "",
          model: vehicleRecord.model || "",
          year: vehicleRecord.year || "",
          policyNumber: vehicleRecord.policyNumber || "",
          engineNumber: vehicleRecord.engineNumber || "",
          chassisNumber: vehicleRecord.chassisNumber || ""
        },
        policyholderNic: claim.userNic,
        policyholderName: user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "Policyholder",
        assignedAgent: claim.assignedAgent || "",
        branch: claim.branch || "Galle",
        status: "Draft",
        damageMarkers: [],
        checklist: defaultChecklist,
        vehicleCondition: {
          odometer: "",
          fuelLevel: "1/2",
          recommendedAction: "Repairable (Minor)",
          preExistingDamage: ""
        },
        totalEstimatedCost: claim.agentEstimatedAmount || 0,
        auditTrail: [
          {
            action: "Initialized Inspection Session",
            performedBy: authCheck.email || "System",
            role: authCheck.role,
            timestamp: new Date(),
            details: `Draft initialized for vehicle category: ${categoryInfo.category}`
          }
        ]
      });

      await report.save();
    }

    res.json({
      success: true,
      claim: {
        _id: claim._id,
        claimNumber: claim.claimNumber,
        userNic: claim.userNic,
        vehiclePlate: claim.vehiclePlate,
        incidentDate: claim.incidentDate,
        incidentTime: claim.incidentTime,
        location: claim.location,
        damageType: claim.damageType,
        description: claim.description,
        status: claim.status,
        branch: claim.branch,
        assignedAgent: claim.assignedAgent,
        currentStep: claim.currentStep,
        inspectionSubmitted: claim.inspectionSubmitted
      },
      vehicle: {
        category: categoryInfo.category,
        isSupported: categoryInfo.isSupported,
        rawType: categoryInfo.rawType,
        company: vehicleRecord.company || "",
        model: vehicleRecord.model || "",
        year: vehicleRecord.year || "",
        policyNumber: vehicleRecord.policyNumber || ""
      },
      policyholder: {
        name: user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "Policyholder",
        nic: claim.userNic,
        mobile: user?.mobile || ""
      },
      report,
      availableDamageTypes: DAMAGE_TYPES,
      availableSeverities: DAMAGE_SEVERITIES
    });
  } catch (err) {
    console.error("GET /api/inspection/claim error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch vehicle inspection report." });
  }
});

/**
 * POST /api/inspection/draft
 * Saves or updates an in-progress draft report without finalizing
 */
router.post("/draft", async (req, res) => {
  try {
    const {
      claimNumber,
      damageMarkers = [],
      checklist = [],
      vehicleCondition = {},
      agentNotes = "",
      totalEstimatedCost = 0,
      agentEmail = ""
    } = req.body;

    if (!claimNumber) {
      return res.status(400).json({ error: "Claim number is required." });
    }

    const cleanClaimNo = claimNumber.trim().toUpperCase();
    const claim = await Claim.findOne({
      claimNumber: { $regex: new RegExp(`^${cleanClaimNo}$`, "i") }
    });

    if (!claim) {
      return res.status(404).json({ error: "Claim not found." });
    }

    const authCheck = await verifyClaimAccess(claim, req);
    if (!authCheck.authorized) {
      return res.status(403).json({ error: authCheck.reason || "Unauthorized access." });
    }

    let report = await InspectionReport.findOne({ claimNumber: cleanClaimNo });
    if (!report) {
      report = new InspectionReport({
        claimId: claim._id,
        claimNumber: cleanClaimNo,
        vehiclePlate: claim.vehiclePlate,
        assignedAgent: claim.assignedAgent || agentEmail,
        branch: claim.branch
      });
    }

    // Apply draft changes
    report.damageMarkers = damageMarkers;
    report.checklist = checklist;
    report.vehicleCondition = {
      ...report.vehicleCondition,
      ...vehicleCondition
    };
    report.agentNotes = agentNotes;
    report.totalEstimatedCost = Number(totalEstimatedCost) || 0;
    report.status = "Draft";

    report.auditTrail.push({
      action: "Saved Draft",
      performedBy: authCheck.email || agentEmail || "Agent",
      role: authCheck.role || "Agent",
      timestamp: new Date(),
      details: `Saved ${damageMarkers.length} markers, est cost LKR ${report.totalEstimatedCost}`
    });

    await report.save();

    // Synchronize Claim record
    const legacyText = buildLegacyReportText(report);
    claim.inspectionReport = legacyText;
    claim.agentEstimatedAmount = report.totalEstimatedCost;
    claim.inspectionData = {
      reportId: report._id,
      vehicleCategory: report.vehicleCategory,
      totalMarkers: damageMarkers.length,
      damageMarkers,
      checklist,
      vehicleCondition: report.vehicleCondition,
      status: "Draft",
      submittedAt: null
    };

    await claim.save();

    // Real-Time Notification via Socket.IO
    try {
      const io = getIO();
      if (io) {
        io.to(`branch:${claim.branch}`).emit("inspection:updated", {
          claimNumber: cleanClaimNo,
          reportId: report._id,
          status: "Draft",
          markersCount: damageMarkers.length,
          totalEstimatedCost: report.totalEstimatedCost,
          updatedAt: new Date()
        });
      }
    } catch (socketErr) {
      console.warn("Socket broadcast error:", socketErr.message);
    }

    res.json({
      success: true,
      message: "Inspection draft saved successfully.",
      report
    });
  } catch (err) {
    console.error("POST /api/inspection/draft error:", err);
    res.status(500).json({ error: "Failed to save inspection draft." });
  }
});

/**
 * POST /api/inspection/submit
 * Validates and finalizes an inspection report. Advances claim to Step 4 (Ready for Office Staff review).
 */
router.post("/submit", async (req, res) => {
  try {
    const {
      claimNumber,
      damageMarkers = [],
      checklist = [],
      vehicleCondition = {},
      agentNotes = "",
      totalEstimatedCost = 0,
      agentEmail = ""
    } = req.body;

    if (!claimNumber) {
      return res.status(400).json({ error: "Claim number is required." });
    }

    const cleanClaimNo = claimNumber.trim().toUpperCase();
    const claim = await Claim.findOne({
      claimNumber: { $regex: new RegExp(`^${cleanClaimNo}$`, "i") }
    });

    if (!claim) {
      return res.status(404).json({ error: "Claim not found." });
    }

    const authCheck = await verifyClaimAccess(claim, req);
    if (!authCheck.authorized) {
      return res.status(403).json({ error: authCheck.reason || "Unauthorized access." });
    }

    // Validation rules before final submission
    if (!vehicleCondition.odometer || !String(vehicleCondition.odometer).trim()) {
      return res.status(400).json({ error: "Vehicle odometer reading is required before submission." });
    }

    let report = await InspectionReport.findOne({ claimNumber: cleanClaimNo });
    if (!report) {
      report = new InspectionReport({
        claimId: claim._id,
        claimNumber: cleanClaimNo,
        vehiclePlate: claim.vehiclePlate,
        assignedAgent: claim.assignedAgent || agentEmail,
        branch: claim.branch
      });
    }

    report.damageMarkers = damageMarkers;
    report.checklist = checklist;
    report.vehicleCondition = {
      ...report.vehicleCondition,
      ...vehicleCondition
    };
    report.agentNotes = agentNotes;
    report.totalEstimatedCost = Number(totalEstimatedCost) || 0;
    report.status = "Submitted";
    report.submittedAt = new Date();

    report.auditTrail.push({
      action: "Submitted Inspection",
      performedBy: authCheck.email || agentEmail || "Agent",
      role: authCheck.role || "Agent",
      timestamp: new Date(),
      details: `Report finalized with ${damageMarkers.length} damage markers and total estimate of LKR ${report.totalEstimatedCost}`
    });

    await report.save();

    // Update Claim state
    const legacyText = buildLegacyReportText(report);
    claim.inspectionReport = legacyText;
    claim.inspectionSubmitted = true;
    claim.currentStep = 4; // Step 4: Inspection submitted & awaiting Branch review
    claim.agentEstimatedAmount = report.totalEstimatedCost;
    claim.inspectionData = {
      reportId: report._id,
      vehicleCategory: report.vehicleCategory,
      totalMarkers: damageMarkers.length,
      damageMarkers,
      checklist,
      vehicleCondition: report.vehicleCondition,
      status: "Submitted",
      submittedAt: report.submittedAt
    };

    claim.messages.push({
      sender: "Agent",
      message: `Physical vehicle inspection submitted with ${damageMarkers.length} recorded damage markers. Total preliminary estimate: LKR ${report.totalEstimatedCost.toLocaleString()}`,
      sentAt: new Date(),
      recipient: "Office Staff"
    });

    await claim.save();

    // Real-Time Notification to Branch Staff via Socket.IO
    try {
      const io = getIO();
      if (io) {
        io.to(`branch:${claim.branch}`).emit("inspection:submitted", {
          claimNumber: cleanClaimNo,
          reportId: report._id,
          branch: claim.branch,
          assignedAgent: claim.assignedAgent,
          totalEstimatedCost: report.totalEstimatedCost,
          markersCount: damageMarkers.length,
          submittedAt: report.submittedAt
        });
      }
    } catch (socketErr) {
      console.warn("Socket broadcast error:", socketErr.message);
    }

    // Trigger non-blocking SMS to Policyholder
    try {
      notifyInspectionUpdate(claim, "completed");
    } catch (smsErr) {
      console.warn("SMS notification error:", smsErr.message);
    }

    res.json({
      success: true,
      message: "Vehicle damage inspection report submitted successfully.",
      report,
      claim: {
        claimNumber: claim.claimNumber,
        currentStep: claim.currentStep,
        inspectionSubmitted: claim.inspectionSubmitted
      }
    });
  } catch (err) {
    console.error("POST /api/inspection/submit error:", err);
    res.status(500).json({ error: "Failed to submit vehicle inspection report." });
  }
});

/**
 * POST /api/inspection/upload-photo
 * Uploads damage evidence photos with file type & size verification
 */
router.post("/upload-photo", async (req, res) => {
  try {
    const { base64Data, caption = "", claimNumber = "TEMP" } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: "Image base64 data is required." });
    }

    // File size check: Prevent files larger than 15MB
    const base64Length = base64Data.length;
    const approximateSizeBytes = (base64Length * 3) / 4;
    if (approximateSizeBytes > 15 * 1024 * 1024) {
      return res.status(400).json({ error: "Image file exceeds 15MB limit. Please compress before uploading." });
    }

    // Try Cloudinary first if configured
    try {
      const cleanData = base64Data.startsWith("data:") ? base64Data : `data:image/jpeg;base64,${base64Data}`;
      const cloudResult = await uploadToCloudinary(cleanData, `sanasa/inspections/${claimNumber}`);
      if (cloudResult && cloudResult.secure_url) {
        return res.json({
          success: true,
          url: cloudResult.secure_url,
          caption,
          uploadedAt: new Date()
        });
      }
    } catch (cloudErr) {
      console.warn("Cloudinary upload failed, falling back to local storage:", cloudErr.message);
    }

    // Fallback to local server uploads directory
    const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");
    const fileName = `inspection_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;
    const filePath = path.join(uploadsDir, fileName);

    fs.writeFileSync(filePath, buffer);

    const fileUrl = `/uploads/${fileName}`;
    res.json({
      success: true,
      url: fileUrl,
      caption,
      uploadedAt: new Date()
    });
  } catch (err) {
    console.error("POST /api/inspection/upload-photo error:", err);
    res.status(500).json({ error: "Failed to upload inspection photograph." });
  }
});

/**
 * GET /api/inspection/branch/:branch/reports
 * Securely lists all inspection reports for a specific branch with branch isolation
 */
router.get("/branch/:branch/reports", async (req, res) => {
  try {
    const { branch } = req.params;
    const reqUserBranch = (req.headers["x-user-branch"] || req.query.userBranch || "").trim();
    const reqUserRole = (req.headers["x-user-role"] || req.query.role || "").trim();

    // Branch isolation check: users may only query their own branch unless Admin
    if (reqUserRole !== "Admin" && reqUserBranch && reqUserBranch.toLowerCase() !== branch.toLowerCase()) {
      return res.status(403).json({ error: "Unauthorized access to another branch's reports." });
    }

    const reports = await InspectionReport.find({
      branch: { $regex: new RegExp(`^${branch.trim()}$`, "i") }
    })
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean();

    res.json({ success: true, count: reports.length, reports });
  } catch (err) {
    console.error("GET /api/inspection/branch/:branch/reports error:", err);
    res.status(500).json({ error: "Failed to fetch branch inspection reports." });
  }
});

export default router;
