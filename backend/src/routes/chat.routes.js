import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

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
- Provide clear, concise, courteous, and accurate answers with bullet points when explaining procedures.
- Understand and reply in the same language the user uses (English, Sinhala, or Tamil).
`;

/**
 * Smart domain-specific fallback when Gemini API key is missing, rate-limited, or network fails
 */
function getSmartInsuranceFallback(message = "", userRole = "policy_holder") {
  const q = message.toLowerCase().trim();

  if (q.includes("claim") || q.includes("accident") || q.includes("crash") || q.includes("hit")) {
    return `🚗 **Sanasa Vehicle Accident Claim Steps:**\n\n1. **Ensure Safety**: Turn on hazard lights and ensure all passengers are safe.\n2. **Call 24/7 Hotline**: Immediately dial **011-2303300** or **011-2303301** to report the incident.\n3. **Take Photos**: Capture clear photos of vehicle damage, number plates, and the accident scene.\n4. **Submit Claim**: In this app, tap **"New Claim"** to lodge your report online.\n5. **Inspection & Estimate**: A Sanasa agent will inspect the vehicle, and you will upload the repair garage estimate.\n6. **Fast Settlement**: Once approved, funds are transferred directly to your bank account.`;
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

  return `Hello! I am your **Sanasa Vehicle Insurance AI Assistant**.\n\nI can help you with:\n• Filing vehicle accident claims\n• Comprehensive & Third-Party policy details\n• Required claim documents & garage estimates\n• 24/7 roadside emergency hotline (011-2303300)\n• Checking claim status & inspection progress\n\nWhat would you like to know about your vehicle insurance?`;
}

/**
 * POST /api/chat/message
 * Payload: { message: string, history: Array<{ role: "user" | "model", text: string }>, userRole: "policy_holder" | "agent" }
 */
router.post("/message", async (req, res) => {
  try {
    const { message, history = [], userRole = "policy_holder" } = req.body;

    if (!message || typeof message !== "string" || message.trim() === "") {
      return res.status(400).json({ error: "Message is required." });
    }

    const cleanMsg = message.trim();

    // If Gemini is not initialized or key is missing, use intelligent fallback
    if (!genAI) {
      console.warn("Gemini API key not configured for chatbot, using built-in Sanasa knowledge engine.");
      const reply = getSmartInsuranceFallback(cleanMsg, userRole);
      return res.json({ reply, source: "knowledge_engine" });
    }

    const modelCandidates = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"];

    for (const modelName of modelCandidates) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: SYSTEM_INSTRUCTION
        });

        // Convert incoming history to Gemini Chat format
        const formattedHistory = [];
        for (const item of (history || []).slice(-10)) {
          if (item && item.role && item.text) {
            formattedHistory.push({
              role: item.role === "user" ? "user" : "model",
              parts: [{ text: String(item.text) }]
            });
          }
        }

        const chat = model.startChat({
          history: formattedHistory,
          generationConfig: {
            temperature: 0.2, // Low temperature for high precision and strict adherence to facts
            maxOutputTokens: 600,
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
