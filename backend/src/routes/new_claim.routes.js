/**
 * New Claim Router
 * Handles policy holder vehicle profile lookups and accident claim submissions,
 * including automated nearest branch assignment, sequential ID generation,
 * and base64 image parsing + Cloudinary storage uploads.
 */
import express from "express";
import User from "../models/user.model.js";
import Claim from "../models/claim.model.js";
import { uploadToCloudinary } from "../utils/upload.js";
import { getNearestBranch } from "../utils/branch.js";
import { sendEmail, getBaseTemplate } from "../utils/email.js";

const router = express.Router();

// ==========================================
// --- API: Vehicle Lookup ---
// ==========================================

// 1. Fetch user's registered vehicles list
router.get("/vehicles", async (req, res) => {
  try {
    const { nic } = req.query;
    if (!nic) {
      return res.status(400).json({ error: "NIC query parameter is required." });
    }

    const cleanNic = nic.trim();
    const user = await User.findOne({ nic: cleanNic }, { vehicles: 1 });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    res.json({ vehicles: user.vehicles || [] });
  } catch (err) {
    console.error("Fetch vehicles API error:", err);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// 2. Submit a new accident claim (auto-generates sequential ID)
router.post("/new-claim", async (req, res) => {
  try {
    const {
      userNic,
      vehiclePlate,
      incidentDate,
      incidentTime,
      damageType,
      description,
      location,
      accidentPhotos,
      drivingLicense
    } = req.body;

    if (!userNic || !vehiclePlate || !incidentDate || !incidentTime || !damageType || !description || !location) {
      return res.status(400).json({ error: "All required claim details must be provided." });
    }

    const cleanNic = userNic.trim();
    const user = await User.findOne({ nic: cleanNic });
    if (!user) {
      return res.status(404).json({ error: "Policy holder with this NIC not found." });
    }

    // Check for duplicate claims first to prevent double-submissions
    const existingClaim = await Claim.findOne({
      userNic: cleanNic,
      vehiclePlate,
      incidentDate,
      incidentTime
    });

    if (existingClaim) {
      return res.status(400).json({ error: "A claim for this vehicle and incident time has already been submitted." });
    }

    // Generate next sequential claim ID (CLM-0000-0001)
    const lastClaim = await Claim.findOne({}, { claimNumber: 1 }).sort({ createdAt: -1 });
    let nextClaimNum = "CLM-0000-0001";
    
    if (lastClaim && lastClaim.claimNumber) {
      const match = lastClaim.claimNumber.match(/CLM-0000-(\d+)/i);
      if (match) {
        const currentNum = parseInt(match[1], 10);
        const nextNum = currentNum + 1;
        nextClaimNum = `CLM-0000-${String(nextNum).padStart(4, '0')}`;
      }
    }

    // Upload photos and license images to Cloudinary in parallel
    const uploadArray = async (arr, folder) => {
      if (!arr || !Array.isArray(arr)) return [];
      return Promise.all(arr.map(item => uploadToCloudinary(item, folder)));
    };

    const [accidentFront, accidentRear, accidentSide, licenseFront, licenseRear] = await Promise.all([
      uploadArray(accidentPhotos?.front, "claims/accident_photos"),
      uploadArray(accidentPhotos?.rear, "claims/accident_photos"),
      uploadArray(accidentPhotos?.side, "claims/accident_photos"),
      uploadArray(drivingLicense?.front, "claims/driving_license"),
      uploadArray(drivingLicense?.rear, "claims/driving_license")
    ]);

    // Save claim payload to MongoDB
    const newClaim = new Claim({
      claimNumber: nextClaimNum,
      userNic: userNic.trim(),
      vehiclePlate,
      incidentDate,
      incidentTime,
      damageType,
      description,
      location,
      branch: await getNearestBranch(location, user.branch),
      accidentPhotos: {
        front: accidentFront,
        rear: accidentRear,
        side: accidentSide
      },
      drivingLicense: {
        front: licenseFront,
        rear: licenseRear
      }
    });

    await newClaim.save();

    // Send confirmation emails
    const branchName = await getNearestBranch(location, user.branch);
    const policyHolderEmail = user.email;
    const branchEmail = `${branchName.toLowerCase().trim()}@gmail.com`;

    const policyHolderHtml = getBaseTemplate(
      `Claim Submitted Successfully — ${nextClaimNum}`,
      `
      <h2>Accident Claim Received</h2>
      <p>Dear <strong>${user.firstName} ${user.lastName}</strong>,</p>
      <p>Your accident claim has been successfully received and is currently under review by our office staff. Below are the details of your claim:</p>
      <table class="data-table">
        <tr>
          <td class="label">Claim Number:</td>
          <td class="value highlight-value">${nextClaimNum}</td>
        </tr>
        <tr>
          <td class="label">Vehicle Plate:</td>
          <td class="value">${vehiclePlate}</td>
        </tr>
        <tr>
          <td class="label">Incident Date:</td>
          <td class="value">${incidentDate}</td>
        </tr>
        <tr>
          <td class="label">Incident Time:</td>
          <td class="value">${incidentTime}</td>
        </tr>
        <tr>
          <td class="label">Damage Type:</td>
          <td class="value">${damageType}</td>
        </tr>
        <tr>
          <td class="label">Location:</td>
          <td class="value">${location}</td>
        </tr>
        <tr>
          <td class="label">Assigned Branch:</td>
          <td class="value">${branchName}</td>
        </tr>
      </table>
      <p>An insurance agent will be assigned to inspect your vehicle shortly. You will receive real-time status updates directly via your Sanasa Insurance mobile app.</p>
      `
    );

    const branchHtml = getBaseTemplate(
      `[New Claim Alert] ${nextClaimNum}`,
      `
      <h2>New Claim Submitted Alert</h2>
      <p>Dear Office Staff,</p>
      <p>A new accident claim has been submitted that falls under your branch (<strong>${branchName}</strong>). Please review the claim details below and assign an inspection agent:</p>
      <table class="data-table">
        <tr>
          <td class="label">Claim Number:</td>
          <td class="value highlight-value">${nextClaimNum}</td>
        </tr>
        <tr>
          <td class="label">Policy Holder:</td>
          <td class="value">${user.firstName} ${user.lastName} (NIC: ${cleanNic})</td>
        </tr>
        <tr>
          <td class="label">Vehicle Plate:</td>
          <td class="value">${vehiclePlate}</td>
        </tr>
        <tr>
          <td class="label">Incident Date/Time:</td>
          <td class="value">${incidentDate} at ${incidentTime}</td>
        </tr>
        <tr>
          <td class="label">Location:</td>
          <td class="value">${location}</td>
        </tr>
      </table>
      <p>Please log in to the Sanasa Insurance Staff Portal to process this claim and schedule an inspection.</p>
      `
    );

    try {
      await Promise.all([
        sendEmail(
          policyHolderEmail,
          `Claim Submitted Successfully — ${nextClaimNum}`,
          policyHolderHtml,
          `Dear ${user.firstName}, your claim ${nextClaimNum} has been successfully submitted.`
        ),
        sendEmail(
          branchEmail,
          `[New Claim Alert] ${nextClaimNum} - ${branchName} Branch`,
          branchHtml,
          `A new claim ${nextClaimNum} has been submitted for your branch.`
        )
      ]);
    } catch (emailErr) {
      console.error("⚠️ Failed to send claim submission emails:", emailErr.message);
    }

    res.status(201).json({
      message: "Claim submitted successfully",
      claimNumber: nextClaimNum
    });
  } catch (err) {
    console.error("Submit claim API error:", err);
    res.status(500).json({ error: "An internal server error occurred saving the claim." });
  }
});

export default router;
