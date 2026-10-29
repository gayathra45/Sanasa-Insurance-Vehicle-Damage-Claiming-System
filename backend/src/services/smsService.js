import dotenv from "dotenv";
dotenv.config({ override: true });

import SmsLog from "../models/sms_log.model.js";
import SmsSetting from "../models/sms_setting.model.js";

const TEXTBEE_API_BASE = "https://api.textbee.dev/api/v1";
const DEFAULT_TIMEOUT_MS = 12000;
const MAX_RETRIES = 3;

/**
 * Normalizes and validates Sri Lankan phone numbers.
 * Supported inputs:
 *  - 0771234567 -> +94771234567
 *  - 771234567  -> +94771234567
 *  - 94771234567 -> +94771234567
 *  - +94771234567 -> +94771234567
 *  - formatted strings with spaces/dashes: "077 123-4567"
 *
 * @param {string} rawPhone
 * @returns {{ isValid: boolean, normalized?: string, error?: string }}
 */
export function normalizeSriLankanPhone(rawPhone) {
  if (!rawPhone || typeof rawPhone !== "string") {
    return { isValid: false, error: "Phone number is missing or not a string." };
  }

  // Strip spaces, dashes, parentheses, dots
  let cleaned = rawPhone.replace(/[\s\-\(\)\.]/g, "").trim();

  // If starts with +0, fix to +
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }

  // Handle various prefixes
  if (cleaned.startsWith("0094")) {
    cleaned = cleaned.substring(4);
  } else if (cleaned.startsWith("94")) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }

  // Now the number should be 9 digits starting with 7 (e.g. 771234567)
  const sriLankanMobileRegex = /^7[0-9]{8}$/;
  if (!sriLankanMobileRegex.test(cleaned)) {
    return {
      isValid: false,
      error: `Invalid Sri Lankan mobile number format: "${rawPhone}". Expected format like +947XXXXXXXX or 07XXXXXXXX.`
    };
  }

  return {
    isValid: true,
    normalized: `+94${cleaned}`
  };
}

/**
 * Checks if SMS category is enabled in system settings.
 * @param {string} categoryKey
 * @returns {Promise<boolean>}
 */
export async function isCategoryEnabled(categoryKey) {
  try {
    const setting = await SmsSetting.findOne().lean();
    if (!setting) return true; // Enabled by default if no setting saved yet
    if (setting.masterSwitch === false) return false;
    if (categoryKey && setting.categories && setting.categories[categoryKey] === false) {
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Could not check SMS category setting, defaulting to true:", err.message);
    return true;
  }
}

/**
 * Core TextBee send request with timeout and error classification.
 */
async function callTextBeeApi({ deviceId, apiKey, recipients, message }) {
  const url = `${TEXTBEE_API_BASE}/gateway/send-sms`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        deviceId,
        recipients,
        message
      }),
      signal: controller.signal
    });

    clearTimeout(timer);

    const status = response.status;
    let data = null;
    const rawText = await response.text();
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { raw: rawText };
    }

    return { ok: response.ok, status, data };
  } catch (err) {
    clearTimeout(timer);
    const isTimeout = err.name === "AbortError";
    return {
      ok: false,
      status: isTimeout ? 408 : 503,
      data: { error: isTimeout ? "TextBee request timed out after 12s" : err.message },
      networkError: true
    };
  }
}

/**
 * Sends a single SMS notification through the TextBee Android Gateway with:
 * - Duplicate prevention (Idempotency Key)
 * - Rate limit & transient error retries (Bounded up to MAX_RETRIES)
 * - Safe audit logging into SmsLog
 * - Non-marking as delivered upon HTTP success (starts as 'sent', delivered later via webhook or poller)
 *
 * @param {Object} options
 * @param {string} options.phone - Raw or normalized phone number
 * @param {string} options.message - SMS text content
 * @param {string} [options.claimNumber] - Associated claim reference
 * @param {string} [options.eventType] - Event tag e.g. 'claim_submitted'
 * @param {string} [options.categoryKey] - Category tag e.g. 'claimSubmission'
 * @param {string} [options.recipientType] - 'PolicyHolder' | 'Agent' | 'Staff'
 * @param {string} [options.recipientName] - Human-readable recipient name
 * @param {string} [options.idempotencyKey] - Unique deduplication key
 */
export async function sendSms({
  phone,
  message,
  claimNumber = "",
  eventType = "general",
  categoryKey = "statusUpdates",
  recipientType = "PolicyHolder",
  recipientName = "",
  idempotencyKey = null
}) {
  const apiKey = process.env.TEXTBEE_API_KEY;
  const deviceId = process.env.TEXTBEE_DEVICE_ID;

  // 1. Check category toggle
  const enabled = await isCategoryEnabled(categoryKey);
  if (!enabled) {
    console.log(`ℹ️ SMS Category "${categoryKey}" is currently disabled by administrator. Skipping SMS.`);
    return { success: false, skipped: true, reason: "Category disabled" };
  }

  // 2. Validate Sri Lankan phone number
  const phoneValidation = normalizeSriLankanPhone(phone);
  if (!phoneValidation.isValid) {
    console.warn(`⚠️ SMS validation error for claim ${claimNumber || "N/A"}: ${phoneValidation.error}`);
    // Log invalid recipient attempt
    try {
      await SmsLog.create({
        claimNumber,
        recipientPhone: phone || "UNKNOWN",
        recipientType,
        recipientName,
        eventType,
        message,
        deviceId: deviceId || "",
        status: "failed",
        errorMessage: phoneValidation.error,
        errorCode: "INVALID_PHONE"
      });
    } catch (dbErr) {
      console.warn("Failed to create failed SMS log:", dbErr.message);
    }
    return { success: false, error: phoneValidation.error, code: "INVALID_PHONE" };
  }

  const normalizedPhone = phoneValidation.normalized;

  // 3. Deduplication Check (Idempotency)
  const resolvedIdempotencyKey = idempotencyKey || `${claimNumber}_${eventType}_${normalizedPhone}`;
  try {
    const existingLog = await SmsLog.findOne({ idempotencyKey: resolvedIdempotencyKey });
    if (existingLog) {
      if (existingLog.status === "sent" || existingLog.status === "delivered") {
        console.log(`ℹ️ SMS already sent for key "${resolvedIdempotencyKey}". Suppressing duplicate SMS.`);
        return { success: true, duplicate: true, log: existingLog };
      }
      // If previous attempt failed, we may proceed with a retry
    }
  } catch (dupErr) {
    console.warn("Idempotency lookup warning:", dupErr.message);
  }

  // 4. Validate configuration presence
  if (!apiKey || !deviceId) {
    const errText = "TEXTBEE_API_KEY or TEXTBEE_DEVICE_ID is not configured in backend/.env.";
    console.error("❌ TextBee Config Error:", errText);
    try {
      await SmsLog.create({
        claimNumber,
        recipientPhone: normalizedPhone,
        recipientType,
        recipientName,
        eventType,
        message,
        deviceId: deviceId || "",
        status: "failed",
        errorMessage: errText,
        errorCode: "CONFIG_MISSING",
        idempotencyKey: resolvedIdempotencyKey
      });
    } catch {}
    return { success: false, error: errText, code: "CONFIG_MISSING" };
  }

  // 5. Create or retrieve pending SmsLog entry
  let smsLogEntry = null;
  try {
    smsLogEntry = await SmsLog.findOneAndUpdate(
      { idempotencyKey: resolvedIdempotencyKey },
      {
        $setOnInsert: {
          claimNumber,
          recipientPhone: normalizedPhone,
          recipientType,
          recipientName,
          eventType,
          message,
          deviceId,
          status: "pending",
          attempts: 0,
          idempotencyKey: resolvedIdempotencyKey
        }
      },
      { upsert: true, new: true }
    );
  } catch (initErr) {
    console.warn("Could not upsert SmsLog initial entry:", initErr.message);
  }

  // 6. Execute bounded retry loop for transient network/rate-limit errors
  let attempt = 0;
  let lastError = null;
  let lastStatus = 500;
  let batchId = "";
  let success = false;

  while (attempt < MAX_RETRIES && !success) {
    attempt++;
    console.log(`📲 Sending SMS (Attempt ${attempt}/${MAX_RETRIES}) to ${normalizedPhone} [Claim: ${claimNumber || "N/A"}, Event: ${eventType}]...`);

    const result = await callTextBeeApi({
      deviceId,
      apiKey,
      recipients: [normalizedPhone],
      message
    });

    lastStatus = result.status;

    if (result.ok) {
      // API accepted the SMS
      success = true;
      batchId = result.data?.data?.smsBatchId || result.data?.smsBatchId || result.data?.data?.id || "";

      console.log(`✅ TextBee accepted SMS batch: ${batchId || "N/A"} to ${normalizedPhone}`);

      if (smsLogEntry) {
        smsLogEntry.status = "sent"; // NOT delivered yet!
        smsLogEntry.smsBatchId = batchId;
        smsLogEntry.attempts = attempt;
        smsLogEntry.lastAttemptAt = new Date();
        smsLogEntry.providerResponse = result.data;
        smsLogEntry.errorMessage = "";
        smsLogEntry.errorCode = "";
        await smsLogEntry.save().catch(e => console.warn("SmsLog save warning:", e.message));
      }

      return {
        success: true,
        smsBatchId: batchId,
        recipient: normalizedPhone,
        status: "sent",
        logId: smsLogEntry?._id
      };
    }

    // Classify error: permanent vs transient
    lastError = result.data?.error || result.data?.message || `HTTP ${result.status}`;
    const errorCode = result.data?.code || `HTTP_${result.status}`;

    // Permanent errors: Auth invalid, Bad request, Forbidden
    if (result.status === 401) {
      console.error("❌ TextBee Authentication Error (401 AUTH_INVALID): The API key is invalid, expired, or revoked.");
      if (smsLogEntry) {
        smsLogEntry.status = "failed";
        smsLogEntry.attempts = attempt;
        smsLogEntry.errorMessage = "Invalid or revoked TextBee API key. Check TEXTBEE_API_KEY in backend/.env.";
        smsLogEntry.errorCode = "AUTH_INVALID";
        smsLogEntry.providerResponse = result.data;
        await smsLogEntry.save().catch(() => {});
      }
      return {
        success: false,
        error: "TextBee API key is invalid or revoked. Check server configuration.",
        code: "AUTH_INVALID"
      };
    }

    if (result.status === 400 || result.status === 403 || result.status === 404) {
      console.error(`❌ TextBee Permanent Client Error (${result.status}):`, lastError);
      if (smsLogEntry) {
        smsLogEntry.status = "failed";
        smsLogEntry.attempts = attempt;
        smsLogEntry.errorMessage = String(lastError);
        smsLogEntry.errorCode = errorCode;
        smsLogEntry.providerResponse = result.data;
        await smsLogEntry.save().catch(() => {});
      }
      return {
        success: false,
        error: lastError,
        code: errorCode
      };
    }

    // If rate-limited (429) or transient 5xx / timeout, wait before retrying
    console.warn(`⚠️ TextBee Transient Error (${result.status}): ${lastError}. Retrying attempt ${attempt}/${MAX_RETRIES}...`);
    if (attempt < MAX_RETRIES) {
      const backoffMs = attempt * 2000; // 2s, 4s
      await new Promise(res => setTimeout(res, backoffMs));
    }
  }

  // All attempts exhausted
  if (smsLogEntry) {
    smsLogEntry.status = "failed";
    smsLogEntry.attempts = attempt;
    smsLogEntry.errorMessage = `Failed after ${attempt} attempts: ${lastError}`;
    smsLogEntry.errorCode = `FAILED_AFTER_RETRIES`;
    smsLogEntry.lastAttemptAt = new Date();
    await smsLogEntry.save().catch(() => {});
  }

  return {
    success: false,
    error: `Failed to deliver SMS after ${attempt} attempts: ${lastError}`,
    code: "MAX_RETRIES_EXCEEDED"
  };
}

/**
 * Safely triggers an SMS in the background without blocking the HTTP request thread.
 */
export function sendSmsSafe(options) {
  setImmediate(async () => {
    try {
      await sendSms(options);
    } catch (err) {
      console.error(`💥 Uncaught exception in sendSmsSafe for claim ${options?.claimNumber || "N/A"}:`, err);
    }
  });
}

/**
 * Checks the delivery status of an SMS batch from the TextBee API.
 * Endpoint: GET /api/v1/gateway/devices/:deviceId/sms-batch/:smsBatchId
 *
 * @param {string} smsBatchId
 * @returns {Promise<{ success: boolean, status: string, batch?: Object, error?: string }>}
 */
export async function checkSmsBatchStatus(smsBatchId) {
  if (!smsBatchId) {
    return { success: false, error: "Missing smsBatchId" };
  }

  const apiKey = process.env.TEXTBEE_API_KEY;
  const deviceId = process.env.TEXTBEE_DEVICE_ID;

  if (!apiKey || !deviceId) {
    return { success: false, error: "TextBee configuration missing" };
  }

  const url = `${TEXTBEE_API_BASE}/gateway/devices/${deviceId}/sms-batch/${smsBatchId}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-api-key": apiKey
      },
      signal: controller.signal
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, status: "unknown", error: `HTTP ${response.status}: ${errText}` };
    }

    const json = await response.json();
    const batchData = json.data || json;

    // Detect delivery status
    // textbee batch states: pending, dispatched, sent, delivered, failed
    const providerStatus = (batchData.status || "").toLowerCase();

    let resolvedStatus = "sent";
    if (providerStatus === "delivered") {
      resolvedStatus = "delivered";
    } else if (providerStatus === "failed") {
      resolvedStatus = "failed";
    } else if (providerStatus === "pending" || providerStatus === "dispatched") {
      resolvedStatus = "pending";
    }

    // Update corresponding SmsLog entries
    await SmsLog.updateMany(
      { smsBatchId },
      {
        $set: {
          status: resolvedStatus,
          providerResponse: batchData,
          ...(resolvedStatus === "delivered" ? { deliveredAt: new Date() } : {})
        }
      }
    );

    return {
      success: true,
      status: resolvedStatus,
      batch: batchData
    };
  } catch (err) {
    return { success: false, status: "unknown", error: err.message };
  }
}
