import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import Claim from "../models/claim.model.js";
import User from "../models/user.model.js";

dotenv.config();

const router = express.Router();
const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

const SYSTEM_INSTRUCTION = `
You are "Sanasa AI", the official intelligent virtual assistant for Sanasa General Insurance PLC in Sri Lanka, specializing exclusively in Vehicle & Motor Insurance.

KNOWLEDGE BASE & EXPERTISE:
1. Vehicle & Motor Insurance Policies:
   - Comprehensive Motor Insurance (covers own damage, collision, overturn, fire, theft, flood, natural disasters, third-party liability).
   - Third Party Only Cover (legally required minimum cover for injury/death and third-party property damage).
   - Third Party Fire & Theft Cover.
   - Supported vehicle types: Private cars, Dual-purpose vans, Motorcycles, Three-wheelers (tuk-tuks), Commercial lorries, Trucks, and Buses.

2. Additional Riders & Benefits:
   - Natural Disasters / Perils Cover (Floods, storms, tsunamis, earthquakes, cyclones).
   - Strike, Riot, Civil Commotion & Terrorism (TRCC / TC Cover).
   - Windscreen & Glass damage replacement with no excess/loss of No-Claim Bonus (NCB).
   - Airbag replacement cover.
   - Personal Accident Benefit for Driver and Passengers.
   - 24/7 Roadside Assistance & Emergency Towing across Sri Lanka.

3. Claim Process & Accident Reporting:
   - Step 1: Ensure passenger safety, turn on hazard lights, do not move the vehicle unless instructed or causing severe road hazard.
   - Step 2: Call the 24/7 Sanasa Accident Hotline immediately: 011-2303300 or 011-2303301.
   - Step 3: Take clear photos of all vehicles involved, accident damage (front, rear, side), surroundings, and license plates.
   - Step 4: Open the Sanasa Mobile App and submit an accident claim under "New Claim".
   - Step 5: A Sanasa on-site assessor / agent will be dispatched or inspect the vehicle physically.
   - Step 6: Upload the official repair garage estimate quotation document.
   - Step 7: Upon office staff approval, the settlement is paid directly into the registered policyholder bank account.

4. Required Documents for Claims:
   - Valid Driving License (Front & Back) of the driver at the time of accident.
   - Vehicle Registration Certificate (CR book / card).
   - Valid Sanasa Insurance Certificate / Policy.
   - Police Report / Entry copy (mandatory if third-party injury, death, hit-and-run, or major disputed collision).
   - Official Garage Repair Quotation / Estimate.

5. Agent Workflow Support:
   - Agents can perform on-site physical inspections using the Sanasa Agent Mobile App.
   - Checklist includes: Odometer reading, fuel level, component damage breakdown, photo uploads, and physical remarks.

CRITICAL BOUNDARY & GUARDRAILS (STRICTLY ENFORCED):
- You must ONLY answer questions directly related to Sanasa General Insurance, vehicle & motor insurance in Sri Lanka, motor policies, claims, coverage, premiums, renewals, accident reporting, and roadside assistance.
- If a user asks about ANYTHING ELSE (e.g. general knowledge, life insurance, medical/health advice, coding, math, recipes, cooking, weather, politics, jokes, non-vehicle topics, or competitor insurance companies):
  You must POLITELY AND STRICTLY DECLINE. Respond:
  "I am the Sanasa Vehicle Insurance AI Assistant. I can only assist you with Sanasa General Insurance motor and vehicle insurance policies, claims, coverages, accident procedures, and roadside assistance in Sri Lanka. How can I assist you with your vehicle insurance today?"
- When providing claim records or user details, use accurate verified data from the database.
- Understand and reply in the same language the user uses (English, Sinhala, or Tamil).
`;

function formatPlate(plate = "") {
  if (!plate) return "";
  const cleaned = plate.trim().toUpperCase();
  const m = cleaned.match(/^([A-Z]{2,3})(\d{4})$/);
  if (m) return `${m[1]}-${m[2]}`;
  return cleaned;
}

function formatCurrency(amt) {
  if (amt === null || amt === undefined || amt === "" || isNaN(Number(amt))) return "Under Assessment";
  return `Rs. ${Number(amt).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format user profile details
 */
function formatUserDetails(user, claimsCount = 0) {
  let response = `👤 **Policyholder Profile Details (NIC: ${user.nic}):**\n\n`;
  response += `• **Full Name**: **${user.firstName} ${user.lastName}**\n`;
  response += `• **NIC Number**: \`${user.nic}\`\n`;
  response += `• **Mobile Phone**: ${user.mobile || "N/A"}\n`;
  response += `• **Email Address**: ${user.email || "N/A"}\n`;
  response += `• **Registered Address**: ${user.address ? `${user.address}, ${user.city || ""}` : "On record"}\n`;
  response += `• **Registered Branch**: ${user.branch || "Galle"} Branch\n`;

  const vCount = Array.isArray(user.vehicles) ? user.vehicles.length : 0;
  response += `• **Insured Vehicles**: **${vCount}** vehicle(s) registered\n`;
  if (vCount > 0) {
    user.vehicles.forEach((v, i) => {
      response += `   ${i + 1}. **${formatPlate(v.numberPlate)}** (${v.company || ""} ${v.model || ""}, Policy: \`${v.policyNumber || "Active"}\`)\n`;
    });
  }

  response += `• **Claims Filed**: **${claimsCount}** claim(s) on file\n`;
  if (user.bankDetails && user.bankDetails.bankName) {
    const acc = user.bankDetails.accountNumber ? `••••${user.bankDetails.accountNumber.slice(-4)}` : "Registered";
    response += `• **Settlement Bank**: ${user.bankDetails.bankName} (${acc})\n`;
  }

  response += `\n💡 *Ask me "What are my claims?" to see full claim details, or type any Claim ID (e.g. \`CLM-0000-0014\`)!*`;
  return response;
}

/**
 * Format single claim details into clean Markdown report
 */
function formatClaimDetails(claim) {
  const statusEmoji = claim.status === "Approved" ? "🟢" : claim.status === "Rejected" ? "🔴" : "🔵";
  const stepLabels = {
    1: "Claim Submitted & Under Initial Review",
    2: "Assessor Assigned & Awaiting Field Visit",
    3: "Agent En-Route / Physical Inspection In-Progress",
    4: "Physical Inspection Completed & Quotation Assessed",
    5: "Settlement Finalized & Approved"
  };
  const stepText = stepLabels[claim.currentStep] || `Step ${claim.currentStep || 1} of 5`;

  let response = `📋 **Sanasa Claim Report: ${claim.claimNumber}**\n\n`;
  response += `• **Status**: ${statusEmoji} **${claim.status || "Pending"}** (${stepText})\n`;
  response += `• **Registered Vehicle**: **${formatPlate(claim.vehiclePlate)}**\n`;
  response += `• **Damage Category**: ${claim.damageType || "General Collision"}\n`;
  response += `• **Incident Date**: ${claim.incidentDate || "N/A"}${claim.incidentTime ? ` at ${claim.incidentTime}` : ""}\n`;
  response += `• **Incident Location**: ${claim.location || "Recorded on file"}\n`;
  response += `• **Assessment Amount**: **${formatCurrency(claim.amount)}**\n`;
  response += `• **Branch / Assigned Officer**: ${claim.assignedAgent ? claim.assignedAgent : "Branch Officer"} (${claim.branch || "Galle"} Branch)\n`;

  if (claim.description) {
    const desc = claim.description.length > 130 ? claim.description.substring(0, 130) + "..." : claim.description;
    response += `• **Accident Particulars**: ${desc}\n`;
  }

  if (claim.inspectionSubmitted) {
    response += `• **Inspection**: Physical assessment report filed by field officer.\n`;
  }

  if (claim.paymentReceipt) {
    response += `• **Payment Settlement**: 💳 Settlement voucher issued.\n`;
  } else if (claim.status === "Approved") {
    response += `• **Payment Settlement**: Pending direct bank transfer into policyholder account.\n`;
  }

  response += `\n📄 **Official PDF Dossier**: You can download or print the full official report with Sanasa seal at [Download Official PDF Dossier](/api/claims/${claim.claimNumber}/report).\n\n`;
  response += `💡 *Would you like more details on the inspection breakdown, garage estimate, or payment settlement?*`;

  return response;
}

/**
 * Format user claims list into clean Markdown
 */
function formatUserClaimsList(claims, nic) {
  let response = `📂 **Registered Claims on File (NIC: ${nic}):**\n\n`;
  response += `Found **${claims.length}** claim record(s) in the Sanasa registry:\n\n`;

  claims.forEach((c, idx) => {
    const statusEmoji = c.status === "Approved" ? "🟢" : c.status === "Rejected" ? "🔴" : "🔵";
    response += `${idx + 1}. **${c.claimNumber}** — Plate: **${formatPlate(c.vehiclePlate)}**\n`;
    response += `   • **Status**: ${statusEmoji} **${c.status}**\n`;
    response += `   • **Date**: ${c.incidentDate || "N/A"} • **Damage**: ${c.damageType || "General"}\n`;
    response += `   • **Assessment**: ${formatCurrency(c.amount)}\n`;
    response += `   • **Report**: [Download PDF Report](/api/claims/${c.claimNumber}/report)\n\n`;
  });

  response += `💡 *Type any Claim ID above (e.g. \`${claims[0].claimNumber}\`) to view its full breakdown or download the PDF.*`;
  return response;
}

/**
 * Format registered vehicles for a user
 */
function formatUserVehiclesList(vehicles, nic) {
  let response = `🚗 **Registered Vehicles on File (NIC: ${nic}):**\n\n`;
  response += `You have **${vehicles.length}** registered vehicle(s) under Sanasa General Insurance:\n\n`;

  vehicles.forEach((v, idx) => {
    const statusEmoji = v.status === "Approved" ? "🟢" : "🟡";
    response += `${idx + 1}. **${formatPlate(v.numberPlate)}** — ${v.company || ""} ${v.model || ""} (${v.vehicleType || "Vehicle"}${v.year ? `, ${v.year}` : ""})\n`;
    if (v.policyNumber) {
      response += `   • **Policy No**: ${v.policyNumber} • **Status**: ${statusEmoji} ${v.status || "Approved"}\n`;
    }
  });

  response += `\n💡 *Need to file a new accident claim or check claim status for one of these vehicles? Just let me know!*`;
  return response;
}

/**
 * Smart domain-specific fallback when Gemini API key is missing, rate-limited, or network fails
 */
function getSmartInsuranceFallback(message = "", userRole = "policy_holder") {
  const q = message.toLowerCase().trim();

  if (q.includes("claim") || q.includes("accident") || q.includes("crash") || q.includes("hit")) {
    return `🚗 **Sanasa Vehicle Accident Claim Steps:**\n\n1. **Ensure Safety**: Turn on hazard lights and ensure all passengers are safe.\n2. **Call 24/7 Hotline**: Immediately dial **011-2303300** or **011-2303301** to report the incident.\n3. **Take Photos**: Capture clear photos of vehicle damage, vehicle numbers, and the accident scene.\n4. **Submit Claim**: In this app, tap **"New Claim"** to lodge your report online.\n5. **Inspection & Estimate**: A Sanasa agent will inspect the vehicle, and you will upload the repair garage estimate.\n6. **Fast Settlement**: Once approved, funds are transferred directly to your bank account.`;
  }

  if (q.includes("document") || q.includes("doc") || q.includes("paper") || q.includes("need")) {
    return `📋 **Required Documents for Vehicle Claims:**\n\n- **Driving License** (both sides of the person driving during accident)\n- **Vehicle Registration Certificate (CR)**\n- **Sanasa Insurance Certificate / e-Policy**\n- **Police Report Copy** (if third-party damage, injury, or dispute occurred)\n- **Official Garage Repair Estimate / Quotation**\n\nYou can upload these anytime via the **Documents** section in the app.`;
  }

  if (q.includes("cover") || q.includes("policy") || q.includes("comprehensive") || q.includes("third party")) {
    return `🛡️ **Sanasa Vehicle Insurance Coverage Options:**\n\n• **Comprehensive Motor Insurance**: Full protection against collision, overturn, own vehicle damage, third-party liability, fire, theft, and natural disasters (flood, storm, cyclone).\n• **Third Party Only**: Mandatory legal cover protecting against liability for third-party injury, death, and property damage.\n• **Additional Benefits**: Airbag replacement, windscreen damage cover without NCB deduction, 24/7 towing, and passenger accident protection.`;
  }

  if (q.includes("hotline") || q.includes("contact") || q.includes("phone") || q.includes("emergency") || q.includes("call")) {
    return `🚨 **Sanasa 24/7 Emergency Contacts:**\n\n• **Accident Hotline**: 011-2303300 / 011-2303301\n• **Customer Support**: 011-2303300\n• **Head Office**: Sanasa Life & General Insurance, No. 340 2/1, R. A. De Mel Mawatha, Colombo 03, Sri Lanka.\n• **Website**: https://sanasainsurance.com`;
  }

  if (q.includes("agent") || q.includes("inspect")) {
    return `👷 **Vehicle Inspection & Agent Support:**\n\nAfter submitting a claim, a Sanasa mobile inspection agent is assigned to your location. The agent inspects component damage, logs odometer and fuel readings, takes official photos, and submits an on-site physical report directly to the branch for rapid review.`;
  }

  // Non-insurance query check
  const nonInsuranceKeywords = [
    "recipe", "cooking", "code", "python", "javascript", "react", "weather",
    "movie", "song", "president", "election", "football", "cricket", "who is",
    "math", "joke", "story", "write an essay"
  ];

  if (nonInsuranceKeywords.some(k => q.includes(k))) {
    return "I am the Sanasa Vehicle Insurance AI Assistant. I can only assist you with Sanasa General Insurance motor and vehicle insurance policies, claims, coverages, accident procedures, and roadside assistance in Sri Lanka. How can I assist you with your vehicle insurance today?";
  }

  return `Hello! I am your **Sanasa Vehicle Insurance AI Assistant**.\n\nI can help you with:\n• Giving claim details if you provide a Claim ID (e.g. \`CLM-0000-0014\`)\n• Checking your registered claims and vehicles\n• Filing vehicle accident claims step-by-step\n• Comprehensive & Third-Party policy details\n• 24/7 roadside emergency hotline (011-2303300)\n\nWhat would you like to know about your vehicle insurance?`;
}

/**
 * POST /api/chat/message
 * Payload: { message: string, history: Array<{ role: "user" | "model", text: string }>, userRole?: string, userNic?: string, userEmail?: string, userName?: string }
 */
router.post("/message", async (req, res) => {
  try {
    const {
      message,
      history = [],
      userRole = "policy_holder",
      userNic = "",
      userEmail = "",
      userName = ""
    } = req.body;

    if (!message || typeof message !== "string" || message.trim() === "") {
      return res.status(400).json({ error: "Message is required." });
    }

    const cleanMsg = message.trim();
    const lowerMsg = cleanMsg.toLowerCase();
    const isGuest = userRole === "guest" || userRole === "public" || !userRole;

    // ── PRIVACY GUARDRAILS FOR PUBLIC GUEST (HOMEPAGE) ───────────────────────
    if (isGuest) {
      const asksPersonal =
        lowerMsg.includes("my claim") ||
        lowerMsg.includes("my claims") ||
        lowerMsg.includes("what are my claim") ||
        lowerMsg.includes("show my claim") ||
        lowerMsg.includes("list my claim") ||
        lowerMsg.includes("my vehicle") ||
        lowerMsg.includes("my vehicles") ||
        lowerMsg.includes("what vehicles") ||
        lowerMsg.includes("my profile") ||
        lowerMsg.includes("my account") ||
        lowerMsg.includes("who am i") ||
        lowerMsg.includes("my info") ||
        lowerMsg.includes("about me") ||
        cleanMsg.match(/\b(\d{9}[vVxX]|\d{12})\b/) ||
        cleanMsg.match(/\b(CLM[-\s]?[0-9a-zA-Z]+(?:[-\s]?[0-9a-zA-Z]+)*)\b/i) ||
        cleanMsg.match(/\b([A-Z]{2,3}[-\s]?\d{4})\b/i);

      if (asksPersonal) {
        return res.json({
          reply: `🔒 **Account Privacy Notice**\n\nFor security and data privacy, personal insurance records (claims, registered vehicles, and personal profiles) are **not accessible on the public homepage**.\n\nPlease **[Log in to your Sanasa Portal](/Login)** to securely view and manage your personal claims, policies, and profile.\n\n*If you have general questions about Sanasa insurance plans, coverage options, required documents, or emergency hotlines, feel free to ask!*`,
          source: "guest_privacy_guardrail"
        });
      }
    }

    // ── 1. Check for Explicit Claim ID in Query ──────────────────────────────
    const claimMatch = cleanMsg.match(/\b(CLM[-\s]?[0-9a-zA-Z]+(?:[-\s]?[0-9a-zA-Z]+)*)\b/i);
    let matchedClaim = null;

    if (claimMatch && claimMatch[1] && !isGuest) {
      const rawClaimId = claimMatch[1].trim();
      // Normalize e.g. "CLM 0000 0014" -> "CLM-0000-0014"
      const normalizedRegex = new RegExp("^" + rawClaimId.replace(/[\s-]/g, "[- ]?"), "i");
      matchedClaim = await Claim.findOne({ claimNumber: normalizedRegex });

      // If user directly asked for this claim or just entered the Claim ID:
      const isSimpleClaimQuery =
        cleanMsg.length < 40 ||
        lowerMsg.includes("status") ||
        lowerMsg.includes("detail") ||
        lowerMsg.includes("claim") ||
        lowerMsg.includes("what is") ||
        lowerMsg.includes("show");

      if (matchedClaim) {
        const activeNic = (userNic || "").trim().toUpperCase();
        if (userRole === "policy_holder" && activeNic && matchedClaim.userNic && matchedClaim.userNic.toUpperCase() !== activeNic) {
          return res.json({
            reply: `🔒 For privacy and data security, you can only view claims registered under your own verified policyholder account.`,
            source: "policyholder_privacy_guardrail"
          });
        }

        if (isSimpleClaimQuery) {
          const reply = formatClaimDetails(matchedClaim);
          return res.json({ reply, source: "database_claim_lookup", claimNumber: matchedClaim.claimNumber });
        }
      } else if (!matchedClaim && (lowerMsg.startsWith("clm") || lowerMsg.includes("status of clm"))) {
        return res.json({
          reply: `🔍 I searched the Sanasa Claims Registry for **${rawClaimId.toUpperCase()}**, but could not find any active claim matching that ID.\n\nPlease double check the claim number (format: \`CLM-XXXX-XXXX\`) or provide your **NIC number** so I can find all claims registered to your account.`,
          source: "database_claim_not_found"
        });
      }
    }

    // ── 2. Check for User asking "What are my claims?" ────────────────────────
    const isAskingMyClaims =
      lowerMsg.includes("my claim") ||
      lowerMsg.includes("my claims") ||
      lowerMsg.includes("what are my claim") ||
      lowerMsg.includes("show my claim") ||
      lowerMsg.includes("list my claim") ||
      lowerMsg.includes("all my claim") ||
      lowerMsg.includes("check my claim") ||
      lowerMsg.includes("status of my claim") ||
      lowerMsg.includes("where is my claim") ||
      (lowerMsg.includes("claims") && (lowerMsg.includes("my") || lowerMsg.includes("i have") || lowerMsg.includes("for me")));

    // Extract potential NIC from text if not passed in session
    const nicMatch = cleanMsg.match(/\b(\d{9}[vVxX]|\d{12})\b/);
    const activeNic = (!isGuest && userRole === "policy_holder") ? (userNic || (nicMatch ? nicMatch[1] : "")).trim().toUpperCase() : "";

    if (isAskingMyClaims && !isGuest) {
      if (activeNic) {
        const userClaims = await Claim.find({ userNic: activeNic }).sort({ _id: -1 }).limit(10);
        if (userClaims && userClaims.length > 0) {
          const reply = formatUserClaimsList(userClaims, activeNic);
          return res.json({ reply, source: "database_user_claims", count: userClaims.length });
        } else {
          return res.json({
            reply: `📂 I checked our registry for NIC **${activeNic}**, but you currently have **0 active or past claims** on file.\n\nIf you were recently involved in an accident and need to report it, you can tap **"New Claim"** to lodge an official report, or call our 24/7 hotline at **011-2303300**.`,
            source: "database_user_no_claims"
          });
        }
      } else {
        return res.json({
          reply: `To view your registered claims and current claim status, please provide your **National Identity Card (NIC) number** (e.g. \`200012345678\` or \`951234567V\`) or type your **Claim Reference ID** (e.g. \`CLM-0000-0014\`).`,
          source: "nic_prompt"
        });
      }
    }

    // ── 3. Check for User asking "What are my vehicles?" / "My policies" ──────
    const isAskingVehicles =
      lowerMsg.includes("my vehicle") ||
      lowerMsg.includes("my vehicles") ||
      lowerMsg.includes("what vehicles") ||
      lowerMsg.includes("show my vehicle") ||
      lowerMsg.includes("registered vehicle") ||
      lowerMsg.includes("my polic");

    if (isAskingVehicles && !isGuest) {
      if (activeNic) {
        const userDoc = await User.findOne({ nic: activeNic });
        if (userDoc && Array.isArray(userDoc.vehicles) && userDoc.vehicles.length > 0) {
          const reply = formatUserVehiclesList(userDoc.vehicles, activeNic);
          return res.json({ reply, source: "database_user_vehicles", count: userDoc.vehicles.length });
        } else {
          return res.json({
            reply: `🚗 No registered insured vehicles were found under NIC **${activeNic}** in our active policyholder database. You can register your vehicles at your local Sanasa branch or contact customer care at 011-2303300.`,
            source: "database_user_no_vehicles"
          });
        }
      } else {
        return res.json({
          reply: `To look up your registered vehicle policies, please provide your **National Identity Card (NIC) number** (e.g. \`200012345678\`).`,
          source: "nic_prompt"
        });
      }
    }

    // ── 4. Check for User Profile & Account Details ("User Details", "My Profile")
    const isAskingUserDetails =
      lowerMsg.includes("my detail") ||
      lowerMsg.includes("user detail") ||
      lowerMsg.includes("my profile") ||
      lowerMsg.includes("my account") ||
      lowerMsg.includes("who am i") ||
      lowerMsg.includes("my info") ||
      lowerMsg.includes("about me");

    if (isAskingUserDetails && !isGuest) {
      if (activeNic) {
        const userDoc = await User.findOne({ nic: activeNic });
        if (userDoc) {
          const claimsCount = await Claim.countDocuments({ userNic: activeNic });
          const reply = formatUserDetails(userDoc, claimsCount);
          return res.json({ reply, source: "database_user_details" });
        }
      } else {
        return res.json({
          reply: `To view your registered policyholder profile details, please provide your **NIC number** (e.g. \`200012345678\`).`,
          source: "nic_prompt"
        });
      }
    }

    // ── 5. Check if user typed an NIC directly (e.g. in response to a prompt) ──
    const isDirectNic =
      nicMatch &&
      (cleanMsg.length < 25 || lowerMsg.startsWith("nic") || lowerMsg.includes("my nic"));

    if (isDirectNic && activeNic && !isGuest) {
      const userClaims = await Claim.find({ userNic: activeNic }).sort({ _id: -1 }).limit(5);
      const userDoc = await User.findOne({ nic: activeNic });

      if (userDoc || (userClaims && userClaims.length > 0)) {
        let reply = `👋 Verified Profile for NIC **${activeNic}**:\n\n`;
        if (userDoc) {
          reply += `• **Policyholder**: **${userDoc.firstName} ${userDoc.lastName}** (${userDoc.branch || "Galle"} Branch)\n`;
          if (userDoc.vehicles && userDoc.vehicles.length > 0) {
            reply += `• **Registered Vehicles**: ${userDoc.vehicles.map(v => `**${formatPlate(v.numberPlate)}** (${v.model || v.company})`).join(", ")}\n`;
          }
        }

        if (userClaims && userClaims.length > 0) {
          reply += `• **Registered Claims**: Found **${userClaims.length}** claim(s):\n`;
          userClaims.forEach(c => {
            const statusEmoji = c.status === "Approved" ? "🟢" : c.status === "Rejected" ? "🔴" : "🔵";
            reply += `   - **${c.claimNumber}** (${formatPlate(c.vehiclePlate)}): ${statusEmoji} **${c.status}** (${formatCurrency(c.amount)})\n`;
          });
          reply += `\n💡 *Type any Claim ID above to see full details or download the PDF report!*`;
        } else {
          reply += `• **Claims**: 0 active or historical claims on record.\n\n💡 *Need to submit an accident claim? Tap **"New Claim"** to lodge an official report.*`;
        }
        return res.json({ reply, source: "database_nic_lookup" });
      }
    }

    // ── 6. Check for Vehicle Plate Query (staff/agents only) ───────────────────
    const plateMatch = cleanMsg.match(/\b([A-Z]{2,3}[-\s]?\d{4})\b/i);
    if (plateMatch && !isGuest && (userRole === "agent" || userRole === "office_staff" || userRole === "admin")) {
      const rawPlate = plateMatch[1].replace(/[\s-]/g, "");
      const plateRegex = new RegExp(rawPlate.slice(0, -4) + "[- ]?" + rawPlate.slice(-4), "i");
      const plateClaim = await Claim.findOne({ vehiclePlate: plateRegex }).sort({ _id: -1 });
      if (plateClaim) {
        const reply = formatClaimDetails(plateClaim);
        return res.json({ reply, source: "database_plate_claim_lookup", claimNumber: plateClaim.claimNumber });
      }
    }

    // ── 4. Fallback Knowledge Engine (if Gemini is unavailable) ───────────────
    if (!genAI) {
      console.warn("Gemini API key not configured for chatbot, using built-in Sanasa knowledge engine.");
      const reply = getSmartInsuranceFallback(cleanMsg, userRole);
      return res.json({ reply, source: "knowledge_engine" });
    }

    // ── 5. Build Real-Time Context for Gemini Prompt ──────────────────────────
    let dynamicContext = "";
    if (isGuest) {
      dynamicContext += `\n[ROLE: PUBLIC HOMEPAGE GUEST ASSISTANT]:\n` +
        `You are assisting an anonymous public visitor on the Sanasa General Insurance public website.\n` +
        `- Answer general questions about vehicle insurance policies, comprehensive cover, third-party liability, claim procedures, required documents, and 24/7 accident hotline (011-2303300).\n` +
        `- STRICT PRIVACY RULE: Do NOT disclose or look up any personal customer data, claims, or vehicle records in this public chat. If the user asks for personal records or status, instruct them to log in to the Sanasa Portal.\n`;
    } else if (userRole === "agent") {
      dynamicContext += `\n[ROLE: FIELD AGENT ASSISTANT - ${userName || "Agent"}]:\n` +
        `You are assisting a Sanasa field insurance agent.\n` +
        `- Provide guidance on on-site vehicle inspections, mandatory photo angles, assessing damage severity, checking repair garage quotations, and submitting physical inspection reports.\n`;
    } else if (userRole === "office_staff") {
      dynamicContext += `\n[ROLE: OFFICE OPERATIONS ASSISTANT - ${userName || "Staff"}]:\n` +
        `You are assisting a Sanasa office staff claim officer.\n` +
        `- Provide guidance on claim evaluation, cross-checking garage estimates with AI damage analysis, fraud red flags, approving inspections, and issuing settlement payment vouchers.\n`;
    } else if (userRole === "policy_holder" && activeNic) {
      try {
        const userClaims = await Claim.find({ userNic: activeNic }).sort({ _id: -1 }).limit(5);
        const userDoc = await User.findOne({ nic: activeNic });
        dynamicContext += `\n[VERIFIED DATABASE CONTEXT FOR LOGGED-IN POLICYHOLDER]:\n`;
        dynamicContext += `User NIC: ${activeNic}\n`;
        if (userDoc) {
          dynamicContext += `Name: ${userDoc.firstName || ""} ${userDoc.lastName || ""}\n`;
          if (userDoc.vehicles && userDoc.vehicles.length > 0) {
            dynamicContext += `Insured Vehicles: ${userDoc.vehicles.map(v => `${v.numberPlate} (${v.company} ${v.model}, Policy: ${v.policyNumber})`).join(", ")}\n`;
          }
        }
        if (userClaims && userClaims.length > 0) {
          dynamicContext += `User Registered Claims (${userClaims.length}):\n`;
          userClaims.forEach(c => {
            dynamicContext += `- Claim ${c.claimNumber}: Plate ${c.vehiclePlate}, Status: ${c.status}, Step: ${c.currentStep}/5, Amount: ${c.amount ? `Rs. ${c.amount}` : "Under review"}, Date: ${c.incidentDate}\n`;
          });
        } else {
          dynamicContext += `User has 0 claims on file.\n`;
        }
      } catch (dbErr) {
        console.warn("Context fetch error:", dbErr.message);
      }
    }

    if (matchedClaim && !isGuest) {
      dynamicContext += `\n[SPECIFIC CLAIM LOOKUP RECORD FOR ${matchedClaim.claimNumber}]:\n`;
      dynamicContext += `Claim Number: ${matchedClaim.claimNumber}\n`;
      dynamicContext += `Status: ${matchedClaim.status} (Step ${matchedClaim.currentStep || 1} of 5)\n`;
      dynamicContext += `Plate: ${matchedClaim.vehiclePlate}\n`;
      dynamicContext += `Amount: ${matchedClaim.amount ? `Rs. ${matchedClaim.amount}` : "Under review"}\n`;
      dynamicContext += `Incident Date: ${matchedClaim.incidentDate} ${matchedClaim.incidentTime || ""}\n`;
      dynamicContext += `Location: ${matchedClaim.location || ""}\n`;
      dynamicContext += `Damage Type: ${matchedClaim.damageType || ""}\n`;
      dynamicContext += `Branch: ${matchedClaim.branch || "Galle"}\n`;
      dynamicContext += `Assigned Officer: ${matchedClaim.assignedAgent || "Branch Officer"}\n`;
    }

    const fullSystemInstruction = SYSTEM_INSTRUCTION + dynamicContext;

    // ── 6. Clean and Format History for Gemini Chat ──────────────────────────
    const formattedHistory = [];
    for (const item of (history || []).slice(-10)) {
      const text = item.text || (item.parts && item.parts[0]?.text) || "";
      if (text) {
        const role = item.role === "user" ? "user" : "model";
        if (formattedHistory.length === 0 && role === "model") continue;
        if (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === role) continue;
        formattedHistory.push({
          role,
          parts: [{ text: String(text) }]
        });
      }
    }
    if (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === "user") {
      formattedHistory.pop();
    }

    const modelCandidates = [
      "gemini-3.5-flash",
      "gemini-3.8-flash",
      "gemini-flash-latest",
      "gemini-3.1-flash-lite"
    ];

    for (const modelName of modelCandidates) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: fullSystemInstruction
        });

        const chat = model.startChat({
          history: formattedHistory,
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 700,
          }
        });

        const result = await chat.sendMessage(cleanMsg);
        const response = await result.response;
        const replyText = response.text();

        if (replyText && replyText.trim()) {
          return res.json({
            reply: replyText.trim(),
            source: "gemini",
            model: modelName
          });
        }
      } catch (err) {
        console.warn(`Gemini Chat model ${modelName} error:`, err.message);
      }
    }

    // Fallback if all models were rate-limited or failed
    const fallbackReply = getSmartInsuranceFallback(cleanMsg, userRole);
    return res.json({ reply: fallbackReply, source: "fallback_engine" });
  } catch (err) {
    console.error("AI Chat message error:", err);
    res.status(500).json({
      error: "Failed to process chat message.",
      reply: "We are currently experiencing a connection issue with Sanasa AI. Please dial 011-2303300 for 24/7 Sanasa Vehicle Insurance customer assistance."
    });
  }
});

export default router;
