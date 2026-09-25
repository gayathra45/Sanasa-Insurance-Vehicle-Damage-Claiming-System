import crypto from "crypto";

/**
 * Clean and convert base64 image data to a Buffer
 */
export function extractBase64Buffer(base64OrUrl) {
  if (!base64OrUrl || typeof base64OrUrl !== "string") return null;

  // If it's a data URL like data:image/jpeg;base64,...
  const match = base64OrUrl.match(/^data:image\/[a-zA-Z+]+;base64,(.+)$/);
  const rawBase64 = match ? match[1] : base64OrUrl;

  try {
    return Buffer.from(rawBase64, "base64");
  } catch (err) {
    console.warn("Failed to parse base64 buffer:", err.message);
    return null;
  }
}

/**
 * Compute SHA-256 hash of an image buffer
 */
export function computeSha256(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) return null;
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Compute a 64-bit normalized perceptual fingerprint from image byte buffer.
 * Samples discrete byte sections across the buffer to produce a robust fingerprint.
 */
export function computePerceptualFingerprint(buffer) {
  if (!buffer || buffer.length < 64) return "";

  const sampleCount = 64;
  const step = Math.floor(buffer.length / sampleCount);
  let bits = "";
  let total = 0;

  const samples = [];
  for (let i = 0; i < sampleCount; i++) {
    const val = buffer[i * step] || 0;
    samples.push(val);
    total += val;
  }

  const avg = total / sampleCount;
  for (let i = 0; i < sampleCount; i++) {
    bits += samples[i] >= avg ? "1" : "0";
  }

  return bits;
}

/**
 * Calculate similarity between two 64-bit binary fingerprints (0% to 100%)
 */
export function calculateFingerprintSimilarity(fp1, fp2) {
  if (!fp1 || !fp2 || fp1.length !== fp2.length || fp1.length === 0) return 0;

  let matches = 0;
  for (let i = 0; i < fp1.length; i++) {
    if (fp1[i] === fp2[i]) matches++;
  }

  return (matches / fp1.length) * 100;
}
