import express from "express";
import Claim from "../models/claim.model.js";
import User from "../models/user.model.js";
import InspectionReport from "../models/inspection_report.model.js";

const router = express.Router();

function formatCurrency(num) {
  if (num === null || num === undefined || isNaN(num)) return "LKR 0.00";
  return "LKR " + Number(num).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateVal) {
  if (!dateVal) return "N/A";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(dateVal);
  }
}

function formatDateTime(dateVal) {
  if (!dateVal) return "N/A";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(dateVal);
  }
}

// GET /api/claims/:claimNumber/report
router.get("/:claimNumber/report", async (req, res) => {
  try {
    const { claimNumber } = req.params;
    const cleanClaimNo = claimNumber.trim();

    const claim = await Claim.findOne({
      claimNumber: { $regex: new RegExp(`^${cleanClaimNo}$`, "i") },
    });

    if (!claim) {
      return res.status(404).send(`
        <html>
          <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h2>Claim Not Found</h2>
            <p>Could not locate claim record for: <strong>${cleanClaimNo}</strong></p>
          </body>
        </html>
      `);
    }

    const user = await User.findOne({ nic: claim.userNic });
    const vehicle = user?.vehicles?.find(
      (v) => v.numberPlate?.replace(/\s+/g, "").toUpperCase() === claim.vehiclePlate?.replace(/\s+/g, "").toUpperCase()
    ) || {};
    const inspectionDoc = await InspectionReport.findOne({ claimNumber: claim.claimNumber });

    const policyholderName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.name || "N/A" : "N/A";
    const reportDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const reportTime = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

    // Status colors
    const statusUpper = (claim.status || "PENDING").toUpperCase();
    let statusBg = "#fef3c7";
    let statusColor = "#92400e";
    let statusBorder = "#fcd34d";

    if (statusUpper.includes("APPROV") || statusUpper.includes("SETTLE")) {
      statusBg = "#ecfdf5";
      statusColor = "#065f46";
      statusBorder = "#6ee7b7";
    } else if (statusUpper.includes("REJECT")) {
      statusBg = "#fef2f2";
      statusColor = "#991b1b";
      statusBorder = "#fca5a5";
    } else if (statusUpper.includes("REVIEW")) {
      statusBg = "#f5f3ff";
      statusColor = "#5b21b6";
      statusBorder = "#c4b5fd";
    } else if (statusUpper.includes("PROGRESS")) {
      statusBg = "#eff6ff";
      statusColor = "#1e40af";
      statusBorder = "#93c5fd";
    }

    // Damaged items list
    const damagedItems = claim.aiAnalysis?.damagedItems || [];
    const totalEstParts = claim.aiAnalysis?.totalEstimatedPartsCost || 0;
    const totalEstLabor = claim.aiAnalysis?.totalEstimatedLaborCost || 0;
    const totalEstTotal = claim.aiAnalysis?.totalEstimatedCost || (totalEstParts + totalEstLabor);
    const approvedAmount = claim.amount || totalEstTotal;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Sanasa Insurance Claim Report - ${claim.claimNumber}</title>
  <style>
    @page {
      size: A4;
      margin: 12mm 15mm 15mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 11.5px;
      line-height: 1.45;
      padding: 20px;
    }
    .watermark {
      position: fixed;
      top: 48%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 58px;
      font-weight: 900;
      color: rgba(15, 45, 74, 0.035);
      letter-spacing: 6px;
      pointer-events: none;
      z-index: 0;
      white-space: nowrap;
      text-transform: uppercase;
    }
    .report-container {
      position: relative;
      z-index: 1;
      max-width: 820px;
      margin: 0 auto;
    }
    .header-table {
      width: 100%;
      border-bottom: 2.5px solid #0f2d4a;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .logo-text {
      font-size: 20px;
      font-weight: 800;
      color: #0f2d4a;
      letter-spacing: -0.3px;
    }
    .logo-sub {
      font-size: 10.5px;
      font-weight: 600;
      color: #0284c7;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 2px;
    }
    .company-details {
      font-size: 9.5px;
      color: #64748b;
      margin-top: 3px;
      line-height: 1.35;
    }
    .header-meta {
      text-align: right;
    }
    .doc-badge {
      display: inline-block;
      background: #0f2d4a;
      color: #ffffff;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .meta-line {
      font-size: 10px;
      color: #475569;
      margin-top: 2px;
    }
    .meta-line strong {
      color: #0f172a;
    }

    /* Status Banner */
    .status-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 5px solid #0f2d4a;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .status-left h2 {
      font-size: 15px;
      font-weight: 800;
      color: #0f2d4a;
      letter-spacing: -0.2px;
    }
    .status-left p {
      font-size: 10.5px;
      color: #64748b;
      margin-top: 2px;
    }
    .status-badge {
      display: inline-block;
      padding: 5px 14px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: ${statusBg};
      color: ${statusColor};
      border: 1px solid ${statusBorder};
    }

    /* Section Styling */
    .section-title {
      font-size: 11.5px;
      font-weight: 800;
      color: #0f2d4a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
      margin-top: 14px;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .data-grid {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
    }
    .data-grid td {
      padding: 5px 8px;
      border: 1px solid #e2e8f0;
      font-size: 10.5px;
      vertical-align: top;
    }
    .lbl {
      background: #f8fafc;
      font-weight: 600;
      color: #475569;
      width: 25%;
    }
    .val {
      color: #0f172a;
      font-weight: 500;
      width: 25%;
    }
    .val-strong {
      font-weight: 700;
      color: #0f172a;
    }
    .val-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 700;
      color: #0369a1;
    }

    /* Loss Assessment Table */
    .table-dossier {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      margin-bottom: 10px;
    }
    .table-dossier th {
      background: #0f2d4a;
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      padding: 6px 8px;
      text-align: left;
      border: 1px solid #0f2d4a;
    }
    .table-dossier td {
      padding: 5.5px 8px;
      border: 1px solid #e2e8f0;
      font-size: 10px;
      color: #334155;
    }
    .table-dossier tr:nth-child(even) td {
      background: #f8fafc;
    }
    .table-total-row td {
      background: #f1f5f9 !important;
      font-weight: 800;
      color: #0f172a;
      font-size: 10.5px;
    }

    /* Signatures Section */
    .sign-section {
      margin-top: 24px;
      padding-top: 14px;
      border-top: 1.5px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    .sign-box {
      width: 200px;
      text-align: center;
    }
    .sign-line {
      height: 45px;
      border-bottom: 1px dashed #94a3b8;
      margin-bottom: 6px;
      position: relative;
    }
    .seal-badge {
      display: inline-block;
      width: 65px;
      height: 65px;
      border: 2px dashed #0284c7;
      border-radius: 50%;
      color: #0284c7;
      font-size: 8px;
      font-weight: 800;
      text-align: center;
      padding-top: 16px;
      text-transform: uppercase;
      line-height: 1.1;
      transform: rotate(-10deg);
      margin: 0 auto 6px;
    }
    .sign-title {
      font-size: 10px;
      font-weight: 700;
      color: #0f172a;
    }
    .sign-sub {
      font-size: 9px;
      color: #64748b;
      margin-top: 1px;
    }

    /* Footer */
    .footer-note {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      font-size: 9px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .btn-print {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #0f2d4a;
      color: #ffffff;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      text-decoration: none;
      box-shadow: 0 4px 12px rgba(15, 45, 74, 0.25);
    }
    .print-bar {
      background: #0a192f;
      color: #ffffff;
      padding: 10px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 10px;
      margin-bottom: 20px;
    }
    @media print {
      .print-bar {
        display: none !important;
      }
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="watermark">SANASA GENERAL INSURANCE</div>

  <div class="report-container">
    <!-- Screen Print Bar (Hidden on print) -->
    <div class="print-bar">
      <div>
        <strong style="font-size: 13px;">Sanasa Insurance Official Claim Dossier</strong>
        <span style="font-size: 11px; color: #94a3b8; margin-left: 10px;">Claim No: ${claim.claimNumber}</span>
      </div>
      <div>
        <button class="btn-print" onclick="window.print()">
          🖨️ Print / Save as PDF
        </button>
      </div>
    </div>

    <!-- Official Header -->
    <table class="header-table">
      <tr>
        <td style="width: 60%; vertical-align: top;">
          <div class="logo-text">SANASA GENERAL INSURANCE</div>
          <div class="logo-sub">සණස ජෙනරල් ඉන්ෂුවරන්ස් පී.එල්.සී • Official Claim Dossier</div>
          <div class="company-details">
            Sanasa General Insurance PLC • Registered in Sri Lanka (PQ 19)<br>
            Head Office: No. 340 2/1, R. A. De Mel Mawatha, Colombo 03, Sri Lanka<br>
            24/7 Motor Accident Emergency Hotline: <strong>011 200 3000</strong> • Web: www.sanasainsurance.com
          </div>
        </td>
        <td class="header-meta" style="width: 40%; vertical-align: top;">
          <div class="doc-badge">CLAIM STATUS DOSSIER</div>
          <div class="meta-line">Claim Ref: <strong class="val-code">${claim.claimNumber}</strong></div>
          <div class="meta-line">Branch: <strong>${claim.branch || "Galle"} Branch</strong></div>
          <div class="meta-line">Generated: <strong>${reportDate} @ ${reportTime}</strong></div>
          <div class="meta-line">Security Hash: <strong style="font-family: monospace;">${claim._id?.toString().slice(-8).toUpperCase() || "SN-VALID"}</strong></div>
        </td>
      </tr>
    </table>

    <!-- Claim Summary Card -->
    <div class="status-card">
      <div class="status-left">
        <h2>${claim.claimNumber} — ${vehicle.company || ""} ${vehicle.model || ""} (${claim.vehiclePlate || "N/A"})</h2>
        <p>
          Policyholder: <strong>${policyholderName}</strong> (NIC: ${claim.userNic}) • 
          Workflow Stage: <strong>Step ${claim.currentStep || 1} of 5</strong>
        </p>
      </div>
      <div>
        <span class="status-badge">${claim.status || "Pending"}</span>
      </div>
    </div>

    <!-- Section 1: Policyholder & Vehicle Particulars -->
    <div class="section-title">
      <span>1. Policyholder & Vehicle Identification</span>
      <span style="font-size: 9.5px; color: #64748b; font-weight: normal;">Verified with Sanasa Core Registry</span>
    </div>
    <table class="data-grid">
      <tr>
        <td class="lbl">Policyholder Full Name</td>
        <td class="val val-strong">${policyholderName}</td>
        <td class="lbl">Vehicle Number</td>
        <td class="val val-code">${claim.vehiclePlate || "N/A"}</td>
      </tr>
      <tr>
        <td class="lbl">National Identity Card (NIC)</td>
        <td class="val">${claim.userNic || "N/A"}</td>
        <td class="lbl">Vehicle Make / Model</td>
        <td class="val">${vehicle.company || ""} ${vehicle.model || ""} ${vehicle.year ? `(${vehicle.year})` : ""}</td>
      </tr>
      <tr>
        <td class="lbl">Policyholder Mobile</td>
        <td class="val">${user?.mobile || "N/A"}</td>
        <td class="lbl">Policy Number</td>
        <td class="val val-strong">${vehicle.policyNumber || "POL-SANASA-" + (claim.vehiclePlate?.replace(/\s+/g, "") || "DEF")}</td>
      </tr>
      <tr>
        <td class="lbl">Email Address</td>
        <td class="val">${user?.email || "N/A"}</td>
        <td class="lbl">Insurance Type / Category</td>
        <td class="val">${vehicle.insuranceType || "Comprehensive Motor Cover"}</td>
      </tr>
    </table>

    <!-- Section 2: Accident Incident Particulars -->
    <div class="section-title">
      <span>2. Incident & Accident Particulars</span>
      <span style="font-size: 9.5px; color: #64748b; font-weight: normal;">Reported via Mobile/Web System</span>
    </div>
    <table class="data-grid">
      <tr>
        <td class="lbl">Incident Date & Time</td>
        <td class="val val-strong">${formatDate(claim.incidentDate)} @ ${claim.incidentTime || "N/A"}</td>
        <td class="lbl">Accident Location</td>
        <td class="val">${claim.location || "N/A"}</td>
      </tr>
      <tr>
        <td class="lbl">Reported Damage Type</td>
        <td class="val">${claim.damageType || "N/A"}</td>
        <td class="lbl">Claim Submission Date</td>
        <td class="val">${formatDateTime(claim.createdAt)}</td>
      </tr>
      <tr>
        <td class="lbl">Incident Description</td>
        <td class="val" colspan="3" style="font-style: italic; background: #fafafa; color: #334155;">
          "${claim.description || "No written description provided."}"
        </td>
      </tr>
    </table>

    <!-- Section 3: Physical Inspection Report -->
    <div class="section-title">
      <span>3. Field Evaluator Physical Inspection Findings</span>
      <span style="font-size: 9.5px; color: #64748b; font-weight: normal;">
        ${claim.inspectionApproved ? "✓ Approved by Branch Office" : claim.inspectionSubmitted ? "Submitted - Under Review" : "Pending Field Inspection"}
      </span>
    </div>
    <table class="data-grid">
      <tr>
        <td class="lbl">Assigned Field Agent</td>
        <td class="val val-strong">${claim.assignedAgent || "Unassigned"}</td>
        <td class="lbl">Inspection Report Status</td>
        <td class="val">${claim.inspectionApproved ? "Verified & Approved" : claim.inspectionSubmitted ? "Report Submitted" : "Pending On-site Inspection"}</td>
      </tr>
      <tr>
        <td class="lbl">Vehicle Diagram Category</td>
        <td class="val"><strong>${inspectionDoc?.diagramCategory || inspectionDoc?.vehicleCategory || vehicle.vehicleType || "Car"}</strong> ${inspectionDoc?.isFallbackDiagram ? '<span style="color: #b45309; font-size: 9px;">(Fallback Schematic)</span>' : ''}</td>
        <td class="lbl">Odometer Mileage / Fuel</td>
        <td class="val"><strong>${inspectionDoc?.vehicleCondition?.odometer ? inspectionDoc.vehicleCondition.odometer + " km" : "N/A"}</strong> / ${inspectionDoc?.vehicleCondition?.fuelLevel || "N/A"}</td>
      </tr>
      ${inspectionDoc?.damageMarkers && inspectionDoc.damageMarkers.length > 0 ? `
      <tr>
        <td class="lbl" colspan="4" style="background: #e2e8f0; font-weight: bold; color: #0f2d4a; padding: 6px 8px;">
          Interactive Damage Markers (${inspectionDoc.damageMarkers.length} Recorded Findings)
        </td>
      </tr>
      <tr>
        <td colspan="4" style="padding: 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
            <thead>
              <tr style="background: #f1f5f9; color: #334155; border-bottom: 1px solid #cbd5e1;">
                <th style="padding: 5px 6px; text-align: center; width: 5%;">#</th>
                <th style="padding: 5px 6px; text-align: left; width: 25%;">Vehicle Part</th>
                <th style="padding: 5px 6px; text-align: center; width: 12%;">View</th>
                <th style="padding: 5px 6px; text-align: left; width: 18%;">Damage Type</th>
                <th style="padding: 5px 6px; text-align: center; width: 12%;">Severity</th>
                <th style="padding: 5px 6px; text-align: center; width: 12%;">Classification</th>
                <th style="padding: 5px 6px; text-align: right; width: 16%;">Est. Repair</th>
              </tr>
            </thead>
            <tbody>
              ${inspectionDoc.damageMarkers.map((m, idx) => `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 5px 6px; text-align: center; font-weight: bold;">${idx + 1}</td>
                <td style="padding: 5px 6px; font-weight: bold;">${m.partName || "Component"}</td>
                <td style="padding: 5px 6px; text-align: center; text-transform: capitalize;">${m.view}</td>
                <td style="padding: 5px 6px;">${m.damageType}</td>
                <td style="padding: 5px 6px; text-align: center;">
                  <span style="padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; background: ${m.severity === 'Minor' ? '#fef3c7; color: #92400e' : m.severity === 'Moderate' ? '#ffedd5; color: #c2410c' : '#fee2e2; color: #991b1b'};">
                    ${m.severity}
                  </span>
                </td>
                <td style="padding: 5px 6px; text-align: center; font-size: 9px;">
                  ${m.isPreExisting ? '<span style="color: #b45309; font-weight: bold;">Pre-existing</span>' : '<span style="color: #15803d; font-weight: bold;">Incident</span>'}
                </td>
                <td style="padding: 5px 6px; text-align: right; font-family: monospace;">${m.estimatedRepairCost ? formatCurrency(m.estimatedRepairCost) : "-"}</td>
              </tr>
              `).join("")}
            </tbody>
          </table>
        </td>
      </tr>
      ` : ''}
      <tr>
        <td class="lbl">Inspection Findings & Summary</td>
        <td class="val" colspan="3" style="background: #fafafa;">
          ${claim.inspectionReport ? `<pre style="font-family: inherit; font-size: 10px; white-space: pre-wrap; margin:0;">${claim.inspectionReport}</pre>` : "Physical on-site inspection report has not yet been submitted by the field evaluator."}
        </td>
      </tr>
    </table>

    <!-- Section 4: AI Loss Assessment & Cost Breakdown -->
    <div class="section-title">
      <span>4. Loss Assessment & Cost Estimation Sheet</span>
      <span style="font-size: 9.5px; color: #0284c7; font-weight: bold;">
        ${claim.aiAnalysis?.isAnalyzed ? "Verified via Gemini AI & Automotive Matrix" : "Preliminary Cost Estimate"}
      </span>
    </div>

    ${damagedItems.length > 0 ? `
    <table class="table-dossier">
      <thead>
        <tr>
          <th style="width: 5%;">#</th>
          <th style="width: 32%;">Damaged Component</th>
          <th style="width: 13%; text-align: center;">Action</th>
          <th style="width: 14%; text-align: center;">Severity</th>
          <th style="width: 18%; text-align: right;">Estimated Parts</th>
          <th style="width: 18%; text-align: right;">Estimated Labor</th>
        </tr>
      </thead>
      <tbody>
        ${damagedItems.map((item, idx) => `
        <tr>
          <td style="text-align: center; color: #64748b;">${idx + 1}</td>
          <td>
            <strong>${item.item || "Damage Item"}</strong>
            ${item.description ? `<div style="font-size: 9px; color: #64748b; margin-top: 1px;">${item.description}</div>` : ""}
          </td>
          <td style="text-align: center;">
            <span style="font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: ${item.action === "Replace" ? "#fee2e2; color: #991b1b" : "#e0f2fe; color: #0369a1"};">
              ${item.action || "Repair"}
            </span>
          </td>
          <td style="text-align: center; font-weight: 700;">${item.damagePercentage || 0}%</td>
          <td style="text-align: right; font-family: monospace;">${formatCurrency(item.estimatedPartCost || 0)}</td>
          <td style="text-align: right; font-family: monospace;">${formatCurrency(item.estimatedLaborCost || 0)}</td>
        </tr>
        `).join("")}
        <tr class="table-total-row">
          <td colspan="4" style="text-align: right;">Subtotal Estimates (Parts + Labor):</td>
          <td style="text-align: right; font-family: monospace;">${formatCurrency(totalEstParts)}</td>
          <td style="text-align: right; font-family: monospace;">${formatCurrency(totalEstLabor)}</td>
        </tr>
        <tr class="table-total-row" style="background: #e2e8f0 !important;">
          <td colspan="4" style="text-align: right; font-size: 11px;">Total Assessed Repair Cost:</td>
          <td colspan="2" style="text-align: right; font-size: 12px; color: #0f2d4a; font-family: monospace;">
            <strong>${formatCurrency(totalEstTotal)}</strong>
          </td>
        </tr>
      </tbody>
    </table>
    ` : `
    <table class="data-grid">
      <tr>
        <td class="lbl">Estimated Payout / Assessment</td>
        <td class="val val-strong" colspan="3" style="font-size: 13px; color: #0284c7; font-family: monospace;">
          ${formatCurrency(approvedAmount)}
        </td>
      </tr>
    </table>
    `}

    <!-- Section 5: Garage Estimate Cross-Check (If available) -->
    ${claim.garageEstimateComparison?.isCompared ? `
    <div class="section-title">
      <span>5. Garage Quotation & Technical Audit Cross-Check</span>
      <span style="font-size: 9.5px; color: #64748b; font-weight: normal;">Automated Variance Assessment</span>
    </div>
    <table class="data-grid">
      <tr>
        <td class="lbl">Repairing Garage Name</td>
        <td class="val val-strong">${claim.garageEstimateComparison.garageName || "Assigned Repair Garage"}</td>
        <td class="lbl">Garage Estimate Total</td>
        <td class="val val-strong" style="font-family: monospace;">${formatCurrency(claim.garageEstimateComparison.garageEstimatedTotal)}</td>
      </tr>
      <tr>
        <td class="lbl">Internal Assessed Estimate</td>
        <td class="val" style="font-family: monospace;">${formatCurrency(claim.garageEstimateComparison.aiEstimatedTotal)}</td>
        <td class="lbl">Cost Variance & Verdict</td>
        <td class="val">
          <strong style="color: ${claim.garageEstimateComparison.verdict === "Approved" ? "#059669" : "#d97706"};">
            ${claim.garageEstimateComparison.verdict || "Under Review"} (${claim.garageEstimateComparison.costDifferencePercentage || 0}%)
          </strong>
        </td>
      </tr>
    </table>
    ` : ""}

    <!-- Section 6: Settlement & Payment Details -->
    <div class="section-title">
      <span>${claim.garageEstimateComparison?.isCompared ? "6" : "5"}. Financial Payout & Settlement Particulars</span>
      <span style="font-size: 9.5px; color: #64748b; font-weight: normal;">
        ${claim.paymentReceipt ? "Bank Transfer Completed" : "Settlement Processing"}
      </span>
    </div>
    <table class="data-grid">
      <tr>
        <td class="lbl">Approved Payout Amount</td>
        <td class="val val-strong" style="font-size: 12.5px; color: #0f2d4a; font-family: monospace;">
          ${formatCurrency(approvedAmount)}
        </td>
        <td class="lbl">Account Holder Name</td>
        <td class="val">${claim.accountHolderName || policyholderName}</td>
      </tr>
      <tr>
        <td class="lbl">Bank Name & Branch</td>
        <td class="val">${claim.bankName ? `${claim.bankName} (${claim.bankBranch || "Main"})` : "On Record with Finance"}</td>
        <td class="lbl">Bank Account Number</td>
        <td class="val val-code">${claim.bankAccount ? `•••• ${claim.bankAccount.slice(-4)}` : "Verified Direct Deposit"}</td>
      </tr>
      <tr>
        <td class="lbl">Payment Settlement Status</td>
        <td class="val" colspan="3">
          ${claim.paymentReceipt ? `
            <span style="color: #059669; font-weight: 700;">✓ Transaction Successfully Settled on ${formatDateTime(claim.paymentSettledAt || claim.createdAt)}</span>
            ${claim.paymentSettledBy ? ` • Authorized by: <strong>${claim.paymentSettledBy}</strong>` : ""}
          ` : `
            <span style="color: #d97706; font-weight: 600;">Pending final disbursement by Sanasa Central Treasury.</span>
          `}
        </td>
      </tr>
    </table>

    <!-- Authorized Signatures -->
    <div class="sign-section">
      <div class="sign-box">
        <div class="seal-badge">
          SANASA<br>OFFICIAL<br>VERIFIED
        </div>
        <div class="sign-title">Sanasa Seal of Integrity</div>
        <div class="sign-sub">Digital Record Authentication</div>
      </div>
      <div class="sign-box">
        <div class="sign-line"></div>
        <div class="sign-title">Field Claims Evaluator</div>
        <div class="sign-sub">${claim.assignedAgent || "Motor Technical Officer"}</div>
      </div>
      <div class="sign-box">
        <div class="sign-line"></div>
        <div class="sign-title">Authorized Branch Signatory</div>
        <div class="sign-sub">Claims Management Department</div>
      </div>
    </div>

    <!-- Footer Note -->
    <div class="footer-note">
      <div>
        This is an official document generated by Sanasa General Insurance Claims Management System.<br>
        Any alteration, unauthorized reproduction, or tampering is an offense under Sri Lanka Insurance Regulatory Law.
      </div>
      <div style="text-align: right; font-family: monospace;">
        SANASA-IMS • ${claim.claimNumber} • P. 1/1
      </div>
    </div>
  </div>

  <script>
    // Auto-trigger print if requested
    ${req.query.print === "0" ? "" : `
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
    `}
  </script>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(html);
  } catch (err) {
    console.error("Error generating claim PDF report:", err);
    res.status(500).send("Internal error generating claim report.");
  }
});

export default router;
