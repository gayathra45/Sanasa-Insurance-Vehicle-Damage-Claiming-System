import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// In-memory translation cache (Key: `${targetLang}:${text.trim()}`, Value: translatedText)
const translationCache = new Map();

// Target Language mapping for Gemini prompt
const LANG_MAP = {
  si: "Sinhala (සිංහල)",
  ta: "Tamil (தமிழ்)",
  en: "English"
};

/**
 * Clean model output to get purely the translated string
 */
function cleanAiOutput(raw) {
  if (!raw) return "";
  let text = raw.trim();

  // Strip leading introduction phrases like "Translation:" or "Here is the translation:"
  text = text.replace(/^(Here is the translation[^:]*:|මෙන්න පරිවර්තනය[^:]*:|පරිවර්තනය:|Translation:)/i, "").trim();

  // Remove surrounding quotes or markdown ticks if wrapped
  text = text.replace(/^[`"']+|[`"']+$/g, "").trim();

  return text;
}

/**
 * Translate using Google AI Studio Gemini API
 */
async function translateWithGemini(text, targetLang) {
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in backend environment.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const targetLanguageName = LANG_MAP[targetLang] || targetLang;

  // Active models supported in Google AI Studio
  const modelNames = [
    "gemini-3.5-flash",
    "gemini-flash-lite-latest",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-flash-latest",
    "gemini-3.6-flash",
    "gemini-3.7-flash"
  ];

  let lastError = null;

  for (const modelName of modelNames) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024
        }
      });

      const prompt = `You are a translation tool for an insurance system. Translate the given text into ${targetLanguageName}.
Rules:
- Provide ONLY the direct translated text.
- Do NOT include pronunciations, notes, alternative options, explanations, or quotes.
- Preserve vehicle numbers (e.g. WP CAA-1234), monetary figures, and names.

Text to translate:
${text}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const rawText = response.text();
      const cleaned = cleanAiOutput(rawText);

      if (cleaned) {
        return cleaned;
      }
    } catch (err) {
      lastError = err;
      // Continue to next available model if one encounters a spike
    }
  }

  throw lastError || new Error("Gemini translation failed across models");
}

/**
 * POST /api/translate
 * Body: { text: string, targetLang: "si" | "ta" | "en" }
 */
router.post("/", async (req, res) => {
  try {
    const { text, targetLang = "si" } = req.body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ success: false, error: "Text to translate is required" });
    }

    const cleanText = text.trim();
    const cacheKey = `${targetLang}:${cleanText}`;

    // Return from fast memory cache if available
    if (translationCache.has(cacheKey)) {
      return res.json({
        success: true,
        originalText: cleanText,
        translatedText: translationCache.get(cacheKey),
        targetLang,
        cached: true
      });
    }

    // Direct Google AI Studio Gemini API translation
    const translatedText = await translateWithGemini(cleanText, targetLang);

    // Cache the result
    if (translationCache.size > 2000) {
      const firstKey = translationCache.keys().next().value;
      if (firstKey) translationCache.delete(firstKey);
    }
    translationCache.set(cacheKey, translatedText);

    return res.json({
      success: true,
      originalText: cleanText,
      translatedText,
      targetLang,
      cached: false
    });
  } catch (error) {
    console.error("Gemini AI Translation Error:", error.message || error);
    return res.status(500).json({
      success: false,
      error: "Translation failed",
      message: error.message
    });
  }
});

export default router;
