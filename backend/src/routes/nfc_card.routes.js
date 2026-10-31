import express from "express";
import crypto from "crypto";
import Stripe from "stripe";
import NfcCard from "../models/nfc_card.model.js";
import NfcCardOrder from "../models/nfc_card_order.model.js";
import OtpVerification from "../models/otp_verification.model.js";
import User from "../models/user.model.js";
import Claim from "../models/claim.model.js";
import { sendSms, normalizeSriLankanPhone } from "../services/smsService.js";
import { uploadToCloudinary } from "../utils/upload.js";

const router = express.Router();

const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is missing from environment variables.");
  }
  return new Stripe(secretKey);
};

// Helper to auto-expire any card whose assignment endDate has passed
async function autoExpireCardIfNeeded(card) {
  if (!card || !card.currentAssignment || !card.currentAssignment.endDate) return card;
  const now = new Date();
  const endDate = new Date(card.currentAssignment.endDate);
  
  if (now > endDate && (card.status === "Active" || card.status === "Scheduled" || card.status === "Temporarily Blocked")) {
    const expiredAsg = {
      assignmentId: card.currentAssignment.assignmentId,
      driverName: card.currentAssignment.driverName,
      driverPhone: card.currentAssignment.driverPhone,
      driverNic: card.currentAssignment.driverNic,
      driverAddress: card.currentAssignment.driverAddress,
      driverPhoto: card.currentAssignment.driverPhoto,
      vehiclePlate: card.currentAssignment.vehiclePlate,
      vehicleType: card.currentAssignment.vehicleType,
      vehicleModel: card.currentAssignment.vehicleModel,
      startDate: card.currentAssignment.startDate,
      endDate: card.currentAssignment.endDate,
      durationType: card.currentAssignment.durationType,
      reason: card.currentAssignment.reason,
      status: "Expired",
      assignedAt: card.currentAssignment.assignedAt,
      endedAt: now,
      endReason: "Auto-expired at duration end",
      assignedBy: card.currentAssignment.assignedBy,
      events: [
        {
          eventType: "Expired",
          timestamp: now,
          performedBy: "System",
          note: "Auto-expired based on assignment end date"
        }
      ]
    };

    card.assignmentHistory = card.assignmentHistory || [];
    card.assignmentHistory.push(expiredAsg);
    card.status = "Available"; // Card becomes available for reassignment
    card.currentAssignment = {
      assignmentId: "",
      driverName: "",
      driverPhone: "",
      driverNic: "",
      driverAddress: "",
      driverPhoto: "",
      vehiclePlate: "",
      vehicleType: "",
      vehicleModel: "",
      startDate: null,
      endDate: null,
      durationType: "",
      reason: "",
      status: "None",
      isBlocked: false,
      blockedAt: null,
      blockedReason: "",
      tokenHash: "",
      rawToken: "",
      accessUrl: "",
      assignedAt: null,
      assignedBy: ""
    };
    await card.save();
  }
  return card;
}

// ==========================================
// 1. CARD ORDERS & PURCHASE WORKFLOW
// ==========================================

/**
 * POST /api/nfc-card/order
 * Create purchase request for a quantity of Optional NFC cards (e.g. 5 cards)
 */
router.post("/order", async (req, res) => {
  try {
    const { policyHolderNic, quantity, reason, notes } = req.body;
    if (!policyHolderNic || !quantity || Number(quantity) < 1) {
      return res.status(400).json({ error: "policyHolderNic and valid quantity (at least 1) are required." });
    }

    const cleanNic = String(policyHolderNic).trim().toUpperCase();
    const user = await User.findOne({ nic: cleanNic });
    if (!user) {
      return res.status(404).json({ error: "Policyholder not found." });
    }

    const qty = Math.min(Math.max(Number(quantity), 1), 50);
    const unitPrice = 500; // LKR 500 per physical NFC card
    const totalAmount = qty * unitPrice;

    const orderNumber = `ORD-NFC-${Date.now().toString().slice(-6)}${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

    const order = new NfcCardOrder({
      orderNumber,
      policyHolderNic: cleanNic,
      policyHolderName: user.fullName || "Policy Holder",
      policyHolderEmail: user.email || "",
      policyHolderPhone: user.phone || "",
      branch: user.branch || "Galle",
      quantity: qty,
      unitPrice,
      totalAmount,
      currency: "LKR",
      reason: reason || "Temporary driver access",
      status: "Pending Payment",
      payment: {
        status: "Pending Payment",
        amountPaid: 0,
        currency: "LKR"
      },
      notes: notes || ""
    });

    await order.save();

    return res.status(201).json({
      success: true,
      message: `Card purchase order for ${qty} NFC cards created successfully.`,
      order
    });
  } catch (err) {
    console.error("POST /api/nfc-card/order error:", err);
    return res.status(500).json({ error: err.message || "Failed to create card purchase order." });
  }
});

/**
 * POST /api/nfc-card/checkout-session
 * Create Stripe Checkout session for NFC Card Order
 */
router.post("/checkout-session", async (req, res) => {
  try {
    const { orderId, policyHolderNic, quantity, reason, notes } = req.body;
    if (!policyHolderNic) {
      return res.status(400).json({ error: "policyHolderNic is required." });
    }

    const cleanNic = String(policyHolderNic).trim().toUpperCase();
    let order = null;

    if (orderId) {
      order = await NfcCardOrder.findById(orderId);
      if (!order) {
        return res.status(404).json({ error: "Card order not found." });
      }
      if (order.policyHolderNic !== cleanNic) {
        return res.status(403).json({ error: "Unauthorized access to this order." });
      }
    } else {
      // Auto-create order from quantity
      const user = await User.findOne({ nic: cleanNic }).lean();
      if (!user) {
        return res.status(404).json({ error: "Policyholder account not found." });
      }

      const qty = Math.min(Math.max(Number(quantity || 1), 1), 50);
      const unitPrice = 500;
      const totalAmount = qty * unitPrice;
      const orderNumber = `ORD-NFC-${Date.now().toString().slice(-6)}${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

      order = new NfcCardOrder({
        orderNumber,
        policyHolderNic: cleanNic,
        policyHolderName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Policy Holder",
        policyHolderEmail: user.email || "",
        policyHolderPhone: user.mobile || user.phone || "",
        branch: user.branch || "Galle",
        quantity: qty,
        unitPrice,
        totalAmount,
        currency: "LKR",
        reason: reason || "Temporary driver access",
        status: "Pending Payment",
        payment: {
          status: "Pending Payment",
          amountPaid: 0,
          currency: "LKR"
        },
        notes: notes || ""
      });

      await order.save();
    }

    if (order.payment?.status === "Paid") {
      return res.status(400).json({ error: "Order fee is already paid." });
    }

    const stripe = getStripe();
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    const unitAmountSubunits = Math.round(order.totalAmount * 100);

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "lkr",
            product_data: {
              name: `SANASA Optional NFC Cards (${order.quantity} Cards)`,
              description: `Order ${order.orderNumber} • ${order.reason || "Temporary driver access"}`
            },
            unit_amount: unitAmountSubunits
          },
          quantity: 1
        }
      ],
      mode: "payment",
      success_url: `${frontendUrl}/Policy_Holder/ThirdParty?nfc_payment_success=true&session_id={CHECKOUT_SESSION_ID}&order_id=${encodeURIComponent(
        order._id.toString()
      )}&order=${encodeURIComponent(order.orderNumber)}`,
      cancel_url: `${frontendUrl}/Policy_Holder/ThirdParty?nfc_payment_cancelled=true&order_id=${encodeURIComponent(
        order._id.toString()
      )}`,
      metadata: {
        type: "nfc_card_purchase",
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        policyHolderNic: order.policyHolderNic,
        quantity: String(order.quantity)
      }
    });

    order.payment.stripeSessionId = session.id;
    await order.save();

    return res.json({
      success: true,
      sessionId: session.id,
      sessionUrl: session.url,
      checkoutUrl: session.url,
      order
    });
  } catch (err) {
    console.error("POST /api/nfc-card/checkout-session error:", err);
    return res.status(500).json({ error: err.message || "Failed to create Stripe checkout session." });
  }
});

/**
 * POST /api/nfc-card/verify-payment
 * Verify Stripe session payment and immediately issue individual physical NFC cards
 */
router.post("/verify-payment", async (req, res) => {
  try {
    const { sessionId, orderId } = req.body;
    if (!sessionId && !orderId) {
      return res.status(400).json({ error: "sessionId or orderId is required." });
    }

    let order = null;
    if (orderId) {
      order = await NfcCardOrder.findById(orderId);
    } else {
      order = await NfcCardOrder.findOne({ "payment.stripeSessionId": sessionId });
    }

    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    if (order.payment?.status === "Paid" && order.issuedCards?.length > 0) {
      return res.json({
        success: true,
        message: "Payment already verified and cards issued.",
        order,
        issuedCards: order.issuedCards
      });
    }

    // Verify session with Stripe if sessionId present
    if (sessionId) {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== "paid") {
        return res.status(400).json({
          error: "Payment not completed on Stripe.",
          paymentStatus: session.payment_status
        });
      }
      order.payment.stripePaymentIntentId = String(session.payment_intent || "");
    }

    order.payment.status = "Paid";
    order.payment.paidAt = new Date();
    order.payment.amountPaid = order.totalAmount;
    order.status = "Fulfilled";

    // Issue distinct physical card records in NfcCard model!
    const issuedList = [];
    for (let i = 0; i < order.quantity; i++) {
      const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
      const cardId = `SANASA-NFC-${Date.now().toString().slice(-4)}${randomSuffix}`;

      const card = new NfcCard({
        cardId,
        policyHolderNic: order.policyHolderNic,
        policyHolderName: order.policyHolderName,
        policyHolderPhone: order.policyHolderPhone,
        branch: order.branch,
        orderId: order._id,
        status: "Available",
        currentAssignment: {
          assignmentId: "",
          driverName: "",
          driverPhone: "",
          driverNic: "",
          driverAddress: "",
          driverPhoto: "",
          vehiclePlate: "",
          vehicleType: "",
          vehicleModel: "",
          startDate: null,
          endDate: null,
          durationType: "",
          reason: "",
          status: "None",
          isBlocked: false,
          blockedAt: null,
          blockedReason: "",
          tokenHash: "",
          rawToken: "",
          accessUrl: "",
          assignedAt: null,
          assignedBy: ""
        },
        assignmentHistory: []
      });

      await card.save();
      issuedList.push({ cardId, issuedAt: new Date() });
    }

    order.issuedCards = issuedList;
    await order.save();

    // Send SMS notification to Policyholder about newly issued physical NFC cards
    if (order.policyHolderPhone) {
      sendSms({
        phone: order.policyHolderPhone,
        message: `[SANASA GENERAL INSURANCE]\nDear ${order.policyHolderName},\nYour payment of LKR ${order.totalAmount} for ${order.quantity} Optional NFC Cards was successful.\n${order.quantity} card records have been issued and are Available in your portal.\nHotline: 0725 575 575`,
        recipientType: "PolicyHolder",
        recipientName: order.policyHolderName,
        eventType: "nfc_cards_issued"
      }).catch((e) => console.warn("Card issue SMS error:", e.message));
    }

    return res.json({
      success: true,
      message: `Payment verified. ${order.quantity} Optional NFC Cards issued successfully.`,
      order,
      issuedCards: issuedList
    });
  } catch (err) {
    console.error("POST /api/nfc-card/verify-payment error:", err);
    return res.status(500).json({ error: err.message || "Failed to verify card order payment." });
  }
});

/**
 * GET /api/nfc-card/orders
 * List card purchase orders for authenticated policyholder
 */
router.get("/orders", async (req, res) => {
  try {
    const nic = req.query.nic || req.query.policyHolderNic || req.headers["x-policy-holder-nic"];
    if (!nic) {
      return res.status(400).json({ error: "policyHolderNic is required." });
    }

    const cleanNic = String(nic).trim().toUpperCase();
    const orders = await NfcCardOrder.find({ policyHolderNic: cleanNic }).sort({ createdAt: -1 });

    return res.json({ success: true, orders });
  } catch (err) {
    console.error("GET /api/nfc-card/orders error:", err);
    return res.status(500).json({ error: "Failed to fetch card orders." });
  }
});

// ==========================================
// 2. INVENTORY & CARD DETAILS
// ==========================================

/**
 * GET /api/nfc-card/inventory
 * List all issued physical cards for the policyholder
 */
router.get("/inventory", async (req, res) => {
  try {
    const nic = req.query.nic || req.query.policyHolderNic || req.headers["x-policy-holder-nic"];
    if (!nic) {
      return res.status(400).json({ error: "policyHolderNic is required." });
    }

    const cleanNic = String(nic).trim().toUpperCase();
    const cards = await NfcCard.find({ policyHolderNic: cleanNic }).sort({ createdAt: -1 });

    // Check each card for auto-expiry and update in-memory response
    const updatedCards = await Promise.all(
      cards.map(async (c) => {
        return await autoExpireCardIfNeeded(c);
      })
    );

    return res.json({ success: true, cards: updatedCards });
  } catch (err) {
    console.error("GET /api/nfc-card/inventory error:", err);
    return res.status(500).json({ error: "Failed to fetch card inventory." });
  }
});

/**
 * GET /api/nfc-card/card/:cardId
 * Fetch full card details including assignment history
 */
router.get("/card/:cardId", async (req, res) => {
  try {
    const { cardId } = req.params;
    let card = await NfcCard.findOne({ cardId: cardId.trim() });
    if (!card) {
      return res.status(404).json({ error: "NFC Card not found." });
    }

    card = await autoExpireCardIfNeeded(card);
    return res.json({ success: true, card });
  } catch (err) {
    console.error("GET /api/nfc-card/card/:cardId error:", err);
    return res.status(500).json({ error: "Failed to fetch card details." });
  }
});

// ==========================================
// 3. OTP VERIFICATION & ASSIGNMENT WORKFLOW
// ==========================================

/**
 * POST /api/nfc-card/request-assignment-otp
 * Generates secure OTP and sends it to Policy Holder's verified phone number
 */
router.post("/request-assignment-otp", async (req, res) => {
  try {
    const { cardId, policyHolderNic } = req.body;
    if (!cardId || !policyHolderNic) {
      return res.status(400).json({ error: "cardId and policyHolderNic are required." });
    }

    const cleanNic = String(policyHolderNic).trim().toUpperCase();
    const card = await NfcCard.findOne({ cardId: cardId.trim(), policyHolderNic: cleanNic });
    if (!card) {
      return res.status(404).json({ error: "Card not found or unauthorized." });
    }

    // Auto-expire card if current assignment finished
    await autoExpireCardIfNeeded(card);

    if (card.status !== "Available" && card.status !== "Expired") {
      return res.status(400).json({
        error: `Card cannot receive a new assignment right now. Current status is ${card.status}.`
      });
    }

    // Fetch verified policyholder user
    const user = await User.findOne({ nic: cleanNic });
    if (!user || !user.phone) {
      return res.status(400).json({
        error: "Policyholder has no verified mobile number registered for OTP delivery."
      });
    }

    const norm = normalizeSriLankanPhone(user.phone);
    if (!norm.isValid) {
      return res.status(400).json({ error: norm.error || "Invalid policyholder phone format." });
    }

    // Rate limiting: check recent OTP request within 45 seconds
    const recentOtp = await OtpVerification.findOne({
      policyHolderNic: cleanNic,
      purpose: "NFC_CARD_ASSIGNMENT",
      cardId: card.cardId,
      createdAt: { $gte: new Date(Date.now() - 45 * 1000) }
    });

    if (recentOtp) {
      return res.status(429).json({
        error: "An OTP was recently sent. Please wait 45 seconds before requesting a new code."
      });
    }

    // Generate cryptographically secure 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    // Remove any older unverified OTPs for this card
    await OtpVerification.deleteMany({
      policyHolderNic: cleanNic,
      purpose: "NFC_CARD_ASSIGNMENT",
      cardId: card.cardId
    });

    // Save new OTP record (auto-expires in 10 minutes via TTL index)
    await OtpVerification.create({
      policyHolderNic: cleanNic,
      phoneNumber: norm.normalized,
      purpose: "NFC_CARD_ASSIGNMENT",
      cardId: card.cardId,
      otpHash,
      attempts: 0,
      maxAttempts: 5,
      isVerified: false
    });

    // Send SMS via TextBee to Policy Holder
    const smsMessage = `[SANASA NFC GATEWAY]\nDear ${user.fullName || "Policyholder"},\nYour security OTP to authorize temporary driver assignment on NFC Card ${card.cardId} is: ${otp}\nThis code is valid for 10 minutes. Do not share it with anyone.\nHotline: 0725 575 575`;

    const smsRes = await sendSms({
      phone: norm.normalized,
      message: smsMessage,
      recipientType: "PolicyHolder",
      recipientName: user.fullName || "Policy Holder",
      eventType: "nfc_assignment_otp",
      idempotencyKey: `nfc_otp_${cleanNic}_${card.cardId}_${Date.now()}`
    });

    const maskedPhone = user.phone.replace(/(\d{3})\d+(\d{3})/, "$1****$2");

    return res.json({
      success: true,
      message: `OTP sent to your verified phone (${maskedPhone}).`,
      phoneMasked: maskedPhone,
      smsDelivered: Boolean(smsRes?.success)
    });
  } catch (err) {
    console.error("POST /api/nfc-card/request-assignment-otp error:", err);
    return res.status(500).json({ error: err.message || "Failed to generate assignment OTP." });
  }
});

/**
 * POST /api/nfc-card/assign-driver
 * Validates Policy Holder OTP, assigns temporary driver to physical card, immediately activates.
 * NO BRANCH APPROVAL REQUIRED!
 */
router.post("/assign-driver", async (req, res) => {
  try {
    const {
      cardId,
      policyHolderNic,
      otp,
      driverName,
      driverPhone,
      driverAddress,
      driverNic,
      driverPhoto,
      vehiclePlate,
      startDate,
      endDate,
      durationType,
      reason
    } = req.body;

    if (!cardId || !policyHolderNic || !otp || !driverName || !driverPhone || !vehiclePlate || !startDate || !endDate) {
      return res.status(400).json({
        error: "cardId, policyHolderNic, otp, driverName, driverPhone, vehiclePlate, startDate, and endDate are required."
      });
    }

    const cleanNic = String(policyHolderNic).trim().toUpperCase();
    const cleanPlate = String(vehiclePlate).trim().toUpperCase();

    // 1. Verify Card Eligibility
    let card = await NfcCard.findOne({ cardId: cardId.trim(), policyHolderNic: cleanNic });
    if (!card) {
      return res.status(404).json({ error: "Card not found or unauthorized." });
    }

    await autoExpireCardIfNeeded(card);
    if (card.status !== "Available" && card.status !== "Expired") {
      return res.status(400).json({
        error: `Card is currently in status "${card.status}". Only Available cards can be assigned a new driver.`
      });
    }

    // 2. Validate Policy Holder OTP
    const otpHash = crypto.createHash("sha256").update(String(otp).trim()).digest("hex");
    const otpRecord = await OtpVerification.findOne({
      policyHolderNic: cleanNic,
      purpose: "NFC_CARD_ASSIGNMENT",
      cardId: card.cardId
    });

    if (!otpRecord) {
      return res.status(400).json({ error: "No active OTP request found. Please request a new verification code." });
    }

    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      return res.status(400).json({ error: "Maximum OTP attempts exceeded. Please request a new code." });
    }

    if (otpRecord.otpHash !== otpHash) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({
        error: `Invalid OTP code. ${otpRecord.maxAttempts - otpRecord.attempts} attempts remaining.`
      });
    }

    // Mark OTP as used and delete to prevent reuse
    await OtpVerification.deleteOne({ _id: otpRecord._id });

    // 3. Validate Dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "Invalid start or end date format." });
    }

    if (end <= start) {
      return res.status(400).json({ error: "End date/time must be later than start date/time." });
    }

    // 4. Validate Vehicle Ownership & Approval
    const user = await User.findOne({ nic: cleanNic });
    if (!user) {
      return res.status(404).json({ error: "Policyholder user record not found." });
    }

    const matchedVehicle = (user.vehicles || []).find(
      (v) => v.numberPlate?.replace(/\s+/g, "").toUpperCase() === cleanPlate.replace(/\s+/g, "").toUpperCase()
    );

    if (!matchedVehicle) {
      return res.status(403).json({
        error: `Vehicle ${cleanPlate} does not belong to your authorized registered vehicles.`
      });
    }

    // 5. Handle optional driver photo upload if base64 provided
    let uploadedPhotoUrl = driverPhoto || "";
    if (driverPhoto && driverPhoto.startsWith("data:image")) {
      try {
        uploadedPhotoUrl = await uploadToCloudinary(driverPhoto, "nfc_drivers");
      } catch (uploadErr) {
        console.warn("Driver photo upload error, retaining original:", uploadErr.message);
      }
    }

    // 6. Generate Cryptographically Secure Assignment Credentials
    const assignmentId = `ASG-${Date.now().toString().slice(-6)}${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const accessUrl = `${frontendUrl}/driver-access/${rawToken}`;

    const now = new Date();
    const isAlreadyStarted = now >= start;
    const initialStatus = isAlreadyStarted ? "Active" : "Scheduled";

    // 7. If card had prior assignment, archive it into assignmentHistory
    if (card.currentAssignment?.assignmentId) {
      card.assignmentHistory = card.assignmentHistory || [];
      card.assignmentHistory.push({
        assignmentId: card.currentAssignment.assignmentId,
        driverName: card.currentAssignment.driverName,
        driverPhone: card.currentAssignment.driverPhone,
        driverNic: card.currentAssignment.driverNic,
        driverAddress: card.currentAssignment.driverAddress,
        driverPhoto: card.currentAssignment.driverPhoto,
        vehiclePlate: card.currentAssignment.vehiclePlate,
        vehicleType: card.currentAssignment.vehicleType,
        vehicleModel: card.currentAssignment.vehicleModel,
        startDate: card.currentAssignment.startDate,
        endDate: card.currentAssignment.endDate,
        durationType: card.currentAssignment.durationType,
        reason: card.currentAssignment.reason,
        status: card.currentAssignment.status || "Expired",
        assignedAt: card.currentAssignment.assignedAt || now,
        endedAt: now,
        endReason: "Reassigned to new driver",
        assignedBy: card.currentAssignment.assignedBy,
        events: []
      });
    }

    // 8. Update Physical Card with New Assignment
    card.status = initialStatus;
    card.currentAssignment = {
      assignmentId,
      driverName: String(driverName).trim(),
      driverPhone: String(driverPhone).trim(),
      driverNic: String(driverNic || "").trim(),
      driverAddress: String(driverAddress || "").trim(),
      driverPhoto: uploadedPhotoUrl,
      vehiclePlate: cleanPlate,
      vehicleType: matchedVehicle.vehicleType || "Car",
      vehicleModel: [matchedVehicle.company, matchedVehicle.model].filter(Boolean).join(" ") || "Vehicle",
      startDate: start,
      endDate: end,
      durationType: durationType || "Custom",
      reason: reason || "Temporary driver authorization",
      status: initialStatus,
      isBlocked: false,
      blockedAt: null,
      blockedReason: "",
      tokenHash,
      rawToken,
      accessUrl,
      assignedAt: now,
      assignedBy: cleanNic
    };

    card.lastActivity = now;
    await card.save();

    // 9. Send Confirmation SMS to Policyholder
    if (user.phone) {
      sendSms({
        phone: user.phone,
        message: `[SANASA NFC GATEWAY]\nDear ${user.fullName},\nTemporary driver ${driverName} was successfully assigned to NFC Card ${card.cardId} for vehicle ${cleanPlate}.\n• Status: ${initialStatus}\n• Duration: Valid until ${end.toLocaleDateString("en-LK")}\n• No branch approval required.\nHotline: 0725 575 575`,
        recipientType: "PolicyHolder",
        recipientName: user.fullName,
        eventType: "nfc_assignment_success"
      }).catch((e) => console.warn("Policyholder assignment SMS error:", e.message));
    }

    // 10. Send SMS to Temporary Driver with Secure Portal Link
    if (driverPhone) {
      sendSms({
        phone: driverPhone,
        message: `[SANASA GENERAL INSURANCE]\nDear ${driverName},\nYou have been authorized by ${user.fullName} to operate vehicle ${cleanPlate} via Digital NFC Card ${card.cardId}.\n• Valid: ${start.toLocaleDateString("en-LK")} to ${end.toLocaleDateString("en-LK")}\n• Portal Pass: ${accessUrl}\n24/7 Assistance: 0725 575 575`,
        recipientType: "ThirdPartyDriver",
        recipientName: driverName,
        eventType: "nfc_driver_welcome"
      }).catch((e) => console.warn("Driver welcome SMS error:", e.message));
    }

    return res.status(200).json({
      success: true,
      message: `Driver ${driverName} assigned and activated successfully on Card ${card.cardId}.`,
      card,
      assignment: card.currentAssignment
    });
  } catch (err) {
    console.error("POST /api/nfc-card/assign-driver error:", err);
    return res.status(500).json({ error: err.message || "Failed to assign driver to NFC card." });
  }
});

// ==========================================
// 4. ACCESS CONTROLS (BLOCK, UNBLOCK, TERMINATE)
// ==========================================

/**
 * POST /api/nfc-card/block-assignment/:cardId
 * Temporarily blocks driver without altering end date or removing history
 */
router.post("/block-assignment/:cardId", async (req, res) => {
  try {
    const { cardId } = req.params;
    const { policyHolderNic, reason } = req.body;

    const card = await NfcCard.findOne({ cardId: cardId.trim() });
    if (!card) {
      return res.status(404).json({ error: "NFC card not found." });
    }

    if (policyHolderNic && card.policyHolderNic !== String(policyHolderNic).trim().toUpperCase()) {
      return res.status(403).json({ error: "Unauthorized access to this card." });
    }

    if (!card.currentAssignment?.assignmentId || card.status === "Available") {
      return res.status(400).json({ error: "Card has no active assignment to block." });
    }

    const now = new Date();
    card.status = "Temporarily Blocked";
    card.currentAssignment.isBlocked = true;
    card.currentAssignment.blockedAt = now;
    card.currentAssignment.blockedReason = reason || "Temporarily blocked by policyholder";
    card.currentAssignment.status = "Temporarily Blocked";

    await card.save();

    return res.json({
      success: true,
      message: `Card ${card.cardId} assignment temporarily blocked. Driver access is suspended.`,
      card
    });
  } catch (err) {
    console.error("POST /block-assignment error:", err);
    return res.status(500).json({ error: "Failed to block card assignment." });
  }
});

/**
 * POST /api/nfc-card/unblock-assignment/:cardId
 * Restores access only if assignment is still valid and within its time window
 */
router.post("/unblock-assignment/:cardId", async (req, res) => {
  try {
    const { cardId } = req.params;
    const { policyHolderNic } = req.body;

    let card = await NfcCard.findOne({ cardId: cardId.trim() });
    if (!card) {
      return res.status(404).json({ error: "NFC card not found." });
    }

    if (policyHolderNic && card.policyHolderNic !== String(policyHolderNic).trim().toUpperCase()) {
      return res.status(403).json({ error: "Unauthorized access to this card." });
    }

    card = await autoExpireCardIfNeeded(card);
    if (!card.currentAssignment?.assignmentId || card.status === "Available") {
      return res.status(400).json({ error: "Card has no active assignment to unblock." });
    }

    const now = new Date();
    if (new Date(card.currentAssignment.endDate) <= now) {
      return res.status(400).json({
        error: "Cannot unblock: this assignment has already reached its duration expiry date."
      });
    }

    const newStatus = now >= new Date(card.currentAssignment.startDate) ? "Active" : "Scheduled";

    card.status = newStatus;
    card.currentAssignment.isBlocked = false;
    card.currentAssignment.blockedAt = null;
    card.currentAssignment.blockedReason = "";
    card.currentAssignment.status = newStatus;

    await card.save();

    return res.json({
      success: true,
      message: `Card ${card.cardId} assignment unblocked successfully. Status restored to ${newStatus}.`,
      card
    });
  } catch (err) {
    console.error("POST /unblock-assignment error:", err);
    return res.status(500).json({ error: "Failed to unblock card assignment." });
  }
});

/**
 * POST /api/nfc-card/terminate-assignment/:cardId
 * Permanently terminates current assignment, revoking driver access and freeing card for reuse
 */
router.post("/terminate-assignment/:cardId", async (req, res) => {
  try {
    const { cardId } = req.params;
    const { policyHolderNic, reason } = req.body;

    const card = await NfcCard.findOne({ cardId: cardId.trim() });
    if (!card) {
      return res.status(404).json({ error: "NFC card not found." });
    }

    if (policyHolderNic && card.policyHolderNic !== String(policyHolderNic).trim().toUpperCase()) {
      return res.status(403).json({ error: "Unauthorized access to this card." });
    }

    if (!card.currentAssignment?.assignmentId) {
      return res.status(400).json({ error: "Card has no active assignment to terminate." });
    }

    const now = new Date();
    const terminatedAsg = {
      assignmentId: card.currentAssignment.assignmentId,
      driverName: card.currentAssignment.driverName,
      driverPhone: card.currentAssignment.driverPhone,
      driverNic: card.currentAssignment.driverNic,
      driverAddress: card.currentAssignment.driverAddress,
      driverPhoto: card.currentAssignment.driverPhoto,
      vehiclePlate: card.currentAssignment.vehiclePlate,
      vehicleType: card.currentAssignment.vehicleType,
      vehicleModel: card.currentAssignment.vehicleModel,
      startDate: card.currentAssignment.startDate,
      endDate: card.currentAssignment.endDate,
      durationType: card.currentAssignment.durationType,
      reason: card.currentAssignment.reason,
      status: "Terminated",
      assignedAt: card.currentAssignment.assignedAt,
      endedAt: now,
      endReason: reason || "Terminated by policyholder",
      assignedBy: card.currentAssignment.assignedBy,
      events: [
        {
          eventType: "Terminated",
          timestamp: now,
          performedBy: String(policyHolderNic || "PolicyHolder"),
          note: reason || "Terminated permanently by policyholder"
        }
      ]
    };

    card.assignmentHistory = card.assignmentHistory || [];
    card.assignmentHistory.push(terminatedAsg);

    // Free physical card record for reassignment!
    card.status = "Available";
    card.currentAssignment = {
      assignmentId: "",
      driverName: "",
      driverPhone: "",
      driverNic: "",
      driverAddress: "",
      driverPhoto: "",
      vehiclePlate: "",
      vehicleType: "",
      vehicleModel: "",
      startDate: null,
      endDate: null,
      durationType: "",
      reason: "",
      status: "None",
      isBlocked: false,
      blockedAt: null,
      blockedReason: "",
      tokenHash: "",
      rawToken: "",
      accessUrl: "",
      assignedAt: null,
      assignedBy: ""
    };

    await card.save();

    return res.json({
      success: true,
      message: `Assignment terminated. Physical card ${card.cardId} is now Available for new driver assignment.`,
      card
    });
  } catch (err) {
    console.error("POST /terminate-assignment error:", err);
    return res.status(500).json({ error: "Failed to terminate card assignment." });
  }
});

/**
 * GET /api/nfc-card/history/:cardId
 * Return complete assignment history for physical card
 */
router.get("/history/:cardId", async (req, res) => {
  try {
    const { cardId } = req.params;
    const card = await NfcCard.findOne({ cardId: cardId.trim() });
    if (!card) {
      return res.status(404).json({ error: "NFC card not found." });
    }

    return res.json({
      success: true,
      cardId: card.cardId,
      currentAssignment: card.currentAssignment,
      assignmentHistory: card.assignmentHistory || []
    });
  } catch (err) {
    console.error("GET /history/:cardId error:", err);
    return res.status(500).json({ error: "Failed to fetch card assignment history." });
  }
});

export default router;
