import express from "express";
import SmsLog from "../models/sms_log.model.js";
import SmsSetting from "../models/sms_setting.model.js";
import { sendSms, checkSmsBatchStatus, normalizeSriLankanPhone } from "../services/smsService.js";

const router = express.Router();

/**
 * GET /api/sms/health
 * Checks device credentials and provider connectivity.
 */
router.get("/health", async (req, res) => {
  try {
    const apiKey = process.env.TEXTBEE_API_KEY;
    const deviceId = process.env.TEXTBEE_DEVICE_ID;

    if (!apiKey || !deviceId) {
      return res.status(200).json({
        configured: false,
        message: "TEXTBEE_API_KEY or TEXTBEE_DEVICE_ID missing in backend/.env"
      });
    }

    // Call stats endpoint to test credentials
    try {
      const response = await fetch("https://api.textbee.dev/api/v1/gateway/stats", {
        headers: { "x-api-key": apiKey }
      });
      const data = await response.json();

      return res.json({
        configured: true,
        deviceId,
        statusCode: response.status,
        providerValid: response.ok,
        details: data
      });
    } catch (netErr) {
      return res.json({
        configured: true,
        deviceId,
        providerValid: false,
        error: netErr.message
      });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/sms/test
 * Send a verified test SMS to a specified Sri Lankan phone number.
 */
router.post("/test", async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone) {
      return res.status(400).json({ error: "Phone number is required." });
    }

    const testMessage = message || "Sanasa Insurance: This is a verified test SMS from your TextBee SMS Gateway.";

    const result = await sendSms({
      phone,
      message: testMessage,
      claimNumber: "TEST-000",
      eventType: "test_sms",
      categoryKey: "reminders",
      recipientType: "General",
      recipientName: "Test Recipient",
      idempotencyKey: `test_${Date.now()}`
    });

    if (!result.success && !result.duplicate) {
      return res.status(400).json({
        success: false,
        error: result.error,
        code: result.code
      });
    }

    return res.json({
      success: true,
      message: "Test SMS queued with TextBee Android Gateway.",
      data: result
    });
  } catch (err) {
    console.error("POST /api/sms/test error:", err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/sms/logs
 * Retrieve paginated SMS audit logs with search/filter options.
 */
router.get("/logs", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      claimNumber,
      recipientPhone,
      status,
      eventType
    } = req.query;

    const query = {};
    if (claimNumber) query.claimNumber = new RegExp(claimNumber.trim(), "i");
    if (recipientPhone) query.recipientPhone = new RegExp(recipientPhone.trim(), "i");
    if (status) query.status = status;
    if (eventType) query.eventType = eventType;

    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      SmsLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      SmsLog.countDocuments(query)
    ]);

    return res.json({
      success: true,
      logs,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (err) {
    console.error("GET /api/sms/logs error:", err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/sms/settings
 * Retrieve SMS notification category toggles and master switch.
 */
router.get("/settings", async (req, res) => {
  try {
    let settings = await SmsSetting.findOne().lean();
    if (!settings) {
      settings = await SmsSetting.create({
        masterSwitch: true,
        categories: {
          claimSubmission: true,
          agentAssignment: true,
          statusUpdates: true,
          documentRequests: true,
          inspection: true,
          decision: true,
          settlement: true,
          reminders: true
        },
        defaultDeviceId: process.env.TEXTBEE_DEVICE_ID || ""
      });
    }

    return res.json({
      success: true,
      settings,
      configuredDeviceId: process.env.TEXTBEE_DEVICE_ID || ""
    });
  } catch (err) {
    console.error("GET /api/sms/settings error:", err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/sms/settings
 * Update notification category toggles or master kill switch.
 */
router.put("/settings", async (req, res) => {
  try {
    const { masterSwitch, categories, updatedBy } = req.body;

    let settings = await SmsSetting.findOne();
    if (!settings) {
      settings = new SmsSetting();
    }

    if (masterSwitch !== undefined) {
      settings.masterSwitch = Boolean(masterSwitch);
    }

    if (categories && typeof categories === "object") {
      settings.categories = {
        ...settings.categories,
        ...categories
      };
    }

    settings.lastUpdatedBy = updatedBy || "Admin";
    await settings.save();

    return res.json({
      success: true,
      message: "SMS notification settings updated successfully.",
      settings
    });
  } catch (err) {
    console.error("PUT /api/sms/settings error:", err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/sms/status/:smsBatchId
 * Check delivery status of a specific batch ID and synchronize log.
 */
router.get("/status/:smsBatchId", async (req, res) => {
  try {
    const { smsBatchId } = req.params;
    const result = await checkSmsBatchStatus(smsBatchId);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/sms/webhook
 * Webhook receiver for TextBee message delivery reports.
 */
router.post("/webhook", async (req, res) => {
  try {
    const payload = req.body || {};
    console.log("📨 TextBee Webhook received:", JSON.stringify(payload));

    const batchId = payload.smsBatchId || payload.batchId || payload.data?.smsBatchId;
    const event = (payload.event || payload.status || "").toLowerCase();

    if (batchId) {
      let newStatus = "sent";
      if (event.includes("deliver")) {
        newStatus = "delivered";
      } else if (event.includes("fail") || event.includes("error")) {
        newStatus = "failed";
      }

      await SmsLog.updateMany(
        { smsBatchId: batchId },
        {
          $set: {
            status: newStatus,
            providerResponse: payload,
            ...(newStatus === "delivered" ? { deliveredAt: new Date() } : {})
          }
        }
      );
    }

    // Always respond 200 to acknowledge webhook
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("TextBee Webhook error:", err);
    return res.status(200).json({ received: false, error: err.message });
  }
});

export default router;
