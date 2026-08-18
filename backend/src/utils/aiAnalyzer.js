import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Converts a base64 string or buffer into Gemini's expected image format
 */
function fileToGenerativePart(base64Str, mimeType) {
  // Strip metadata header if present (e.g. data:image/jpeg;base64,)
  const base64Data = base64Str.split(",")[1] || base64Str;
  return {
    inlineData: {
      data: base64Data,
      mimeType: mimeType || "image/jpeg"
    },
  };
}

/**
 * Analyzes vehicle accident photos and estimates damage percentage
 * @param {Array<string>} base64Images - Array of base64 encoded photo strings
 */
export async function analyzeAccidentDamage(base64Images) {
  if (!base64Images || base64Images.length === 0) {
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

    // Format all photos for Gemini
    const imageParts = base64Images.map(img => fileToGenerativePart(img, "image/jpeg"));

    const prompt = `
      You are an expert vehicle insurance damage inspector and assessor.
      Analyze these accident photos of the vehicle. Identify each damaged item/part (e.g., front bumper, headlight, hood, windshield, door, rear bumper) and estimate the damage percentage (from 0% to 100%) for each part.
      
      Respond strictly in JSON format matching the following structure:
      {
        "damagedItems": [
          {
            "item": "Front Bumper",
            "damagePercentage": 80,
            "description": "Severely dented and detached on the left side"
          }
        ],
        "overallDamagePercentage": 45,
        "summary": "Detailed summary of the overall damage observed in the photos."
      }
    `;

    // Request analysis (passing the prompt text and the image parts)
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const responseText = response.text();

    // Parse the JSON output from the model
    // Remove potential markdown code blocks (e.g., ```json ... ```)
    const jsonStr = responseText.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonStr);

  } catch (error) {
    console.error("AI Damage Analysis failed:", error);
    return null;
  }
}
