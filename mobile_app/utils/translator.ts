import { API_BASE_URL } from "../app/_config";

const mobileTranslateCache: Record<string, string> = {};

export async function translateTextMobile(text: string, targetLang: "en" | "si" | "ta" = "si"): Promise<string> {
  if (!text || !text.trim()) return text;
  const clean = text.trim();
  const cacheKey = `${targetLang}:${clean}`;

  if (mobileTranslateCache[cacheKey]) {
    return mobileTranslateCache[cacheKey];
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: clean, targetLang }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.translatedText) {
        mobileTranslateCache[cacheKey] = data.translatedText;
        return data.translatedText;
      }
    }
  } catch (err) {
    console.warn("Mobile translation error:", err);
  }

  return clean;
}
