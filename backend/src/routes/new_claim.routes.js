import express from "express";
import User from "../models/user.model.js";
import Claim from "../models/claim.model.js";
import { uploadToCloudinary } from "../utils/upload.js";
import { getNearestBranch } from "../utils/branch.js";
import { sendEmail } from "../utils/email.js";

const router = express.Router();

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
      branch: getNearestBranch(location),
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
    const branchName = getNearestBranch(location);
    const policyHolderEmail = user.email;
    const branchEmail = `${branchName.toLowerCase().trim()}@gmail.com`;

    const policyHolderHtml = `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #0f2d4a; border-bottom: 2px solid #0f2d4a; padding-bottom: 10px;">Claim Submitted Successfully</h2>
        <p>Dear ${user.firstName} ${user.lastName},</p>
        <p>Your accident claim has been received and is currently under review by our office staff. Below are your claim details:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee; width: 150px;">Claim Number:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; color: #0f2d4a; font-weight: bold;">${nextClaimNum}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Vehicle Plate:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${vehiclePlate}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Incident Date:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${incidentDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Incident Time:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${incidentTime}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Damage Type:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${damageType}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Location:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${location}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Assigned Branch:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${branchName}</td>
          </tr>
        </table>
        <p>We will assign an agent to inspect the vehicle soon. You will receive updates via the Sanasa Insurance app.</p>
        <p style="margin-top: 30px; font-size: 12px; color: #777; text-align: center; border-top: 1px solid #eee; padding-top: 10px;">
          This is an automated notification. Please do not reply directly to this email.
        </p>
      </div>
    `;

    const branchHtml = `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #2b6cb0; border-bottom: 2px solid #2b6cb0; padding-bottom: 10px;">New Claim Submitted Alert</h2>
        <p>Dear Office Staff,</p>
        <p>A new claim has been submitted that falls under your branch (<strong>${branchName}</strong>). Please review the details below and assign an agent:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee; width: 150px;">Claim Number:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; color: #2b6cb0; font-weight: bold;">${nextClaimNum}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Policy Holder:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${user.firstName} ${user.lastName} (NIC: ${cleanNic})</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Vehicle Plate:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${vehiclePlate}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Incident Date/Time:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${incidentDate} at ${incidentTime}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Location:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${location}</td>
          </tr>
        </table>
        <p>Please log in to the Sanasa Insurance Staff Portal to process this claim.</p>
      </div>
    `;

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
