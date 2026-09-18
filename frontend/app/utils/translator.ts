import { API_URL } from "@/app/config";

const clientTranslateCache: Record<string, string> = {};

export async function translateText(text: string, targetLang: "en" | "si" | "ta" = "si"): Promise<string> {
  if (!text || !text.trim()) return text;
  const clean = text.trim();
  const cacheKey = `${targetLang}:${clean}`;

  if (clientTranslateCache[cacheKey]) {
    return clientTranslateCache[cacheKey];
  }

  try {
    const res = await fetch(`${API_URL}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: clean, targetLang }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.translatedText) {
        clientTranslateCache[cacheKey] = data.translatedText;
        return data.translatedText;
      }
    }
  } catch (err) {
    console.warn("Client translation error:", err);
  }

  return clean;
}
