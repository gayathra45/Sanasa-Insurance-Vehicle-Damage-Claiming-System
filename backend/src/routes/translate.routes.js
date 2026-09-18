import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// High-speed in-memory translation cache (Key: `${targetLang}:${text.trim()}`, Value: translatedText)
const translationCache = new Map();

// Language Names mapping
const LANG_MAP = {
  si: "Sinhala (සිංහල)",
  ta: "Tamil (தமிழ்)",
  en: "English"
};

/**
 * Fallback free translator using Google Translate free endpoint
 */
async function fallbackGoogleTranslate(text, targetLang) {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!response.ok) throw new Error(`Google Translate response status: ${response.status}`);
    const data = await response.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const translated = data[0].map(item => item[0]).filter(Boolean).join("");
      if (translated && translated.trim()) return translated.trim();
    }
  } catch (err) {
    console.warn("Fallback Google Translate error:", err.message);
  }

  // Second Fallback: MyMemory API
  try {
    const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect|${encodeURIComponent(targetLang)}`;
    const res = await fetch(myMemoryUrl);
    if (res.ok) {
      const json = await res.json();
      if (json?.responseData?.translatedText) {
        return json.responseData.translatedText;
      }
    }
  } catch (err) {
    console.warn("Fallback MyMemory error:", err.message);
  }

  return text;
}

/**
 * Translate using Gemini AI with rich insurance and Sri Lankan context
 */
async function translateWithGemini(text, targetLang) {
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const targetLanguageName = LANG_MAP[targetLang] || targetLang;

  const modelNames = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-pro"];
  let lastError = null;

  for (const modelName of modelNames) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const prompt = `You are a professional multilingual translator for Sanasa General Insurance Sri Lanka.
Translate the following text accurately and naturally into ${targetLanguageName}.
Preserve numbers, vehicle license plates (e.g., CAB-1234, WP GA-5678), currency amounts (e.g., LKR / Rs.), and proper names.
Return ONLY the direct translated text with no explanations, no quotes, and no markdown formatting.

Text to translate:
${text}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const translatedText = response.text()?.trim();
      if (translatedText) {
        return translatedText;
      }
    } catch (err) {
      lastError = err;
      console.warn(`Gemini model ${modelName} failed, trying next...:`, err.message);
    }
  }

  throw lastError || new Error("Gemini translation failed");
}

/**
 * POST /api/translate
 * Body: { text: string, targetLang: "si" | "ta" | "en", sourceLang?: string }
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

    let translatedText = "";

    // 1. Try Gemini AI Translation first
    try {
      translatedText = await translateWithGemini(cleanText, targetLang);
    } catch (aiErr) {
      console.warn("Gemini translation error, falling back to public engine:", aiErr.message);
      // 2. Fallback to public translation engine
      translatedText = await fallbackGoogleTranslate(cleanText, targetLang);
    }

    if (!translatedText || !translatedText.trim()) {
      translatedText = cleanText;
    }

    // Cache the result
    if (translationCache.size > 2000) {
      // Evict older entries if cache grows large
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
    console.error("Translation API error:", error);
    return res.status(500).json({
      success: false,
      error: "Translation failed",
      message: error.message
    });
  }
});

export default router;
