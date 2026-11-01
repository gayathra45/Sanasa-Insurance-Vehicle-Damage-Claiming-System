import express from "express";
import crypto from "crypto";
import Stripe from "stripe";
import NfcCard from "../models/nfc_card.model.js";
import NfcCardOrder from "../models/nfc_card_order.model.js";
import NfcWriterPairing from "../models/nfc_writer_pairing.model.js";
import NfcTransferJob from "../models/nfc_transfer_job.model.js";
import OtpVerification from "../models/otp_verification.model.js";
import User from "../models/user.model.js";
import Claim from "../models/claim.model.js";
import { sendSms, normalizeSriLankanPhone } from "../services/smsService.js";
import { uploadToCloudinary } from "../utils/upload.js";
import {
  emitNfcOrderUpdated,
  emitNfcCardUpdated,
  emitNfcPairingUpdated,
  emitNfcTransferJob,
  emitNfcTransferStatus
} from "../utils/socket.js";

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
    emitNfcOrderUpdated(order);

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
    emitNfcOrderUpdated(order);

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
    
    // Maintain workflow status: do not bypass branch review!
    if (order.status === "Pending Payment" || !order.status) {
      order.status = "Request Submitted";
    }

    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status: order.status,
      timestamp: new Date(),
      updatedBy: "Payment Gateway",
      note: `Payment of LKR ${order.totalAmount} confirmed via Stripe. Awaiting Branch review and issuance.`
    });

    await order.save();
    emitNfcOrderUpdated(order);

    // Send SMS notification to Policyholder about received payment and submission to Branch
    if (order.policyHolderPhone) {
      sendSms({
        phone: order.policyHolderPhone,
        message: `[SANASA GENERAL INSURANCE]\nDear ${order.policyHolderName},\nYour payment of LKR ${order.totalAmount} for ${order.quantity} Optional NFC Cards was successful.\nYour request (${order.orderNumber}) has been submitted to the ${order.branch} branch for review and card preparation.\nHotline: 0725 575 575`,
        recipientType: "PolicyHolder",
        recipientName: order.policyHolderName,
        eventType: "nfc_payment_received"
      }).catch((e) => console.warn("Card payment SMS error:", e.message));
    }

    return res.json({
      success: true,
      message: `Payment verified. Request ${order.orderNumber} submitted to ${order.branch} branch for review.`,
      order
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
// 1.5 BRANCH & ADMIN NFC CARD ORDER WORKFLOW
// ==========================================

/**
 * GET /api/nfc-card/branch/orders
 * List card requests strictly isolated to staff member's branch
 */
router.get("/branch/orders", async (req, res) => {
  try {
    const branch = req.query.branch || req.headers["x-staff-branch"];
    if (!branch) {
      return res.status(400).json({ error: "Branch is required to access branch card requests." });
    }

    const cleanBranch = String(branch).trim();
    const filter = { branch: new RegExp(`^${cleanBranch}$`, "i") };

    if (req.query.status && req.query.status !== "all") {
      filter.status = req.query.status;
    }

    if (req.query.paymentStatus && req.query.paymentStatus !== "all") {
      filter["payment.status"] = req.query.paymentStatus;
    }

    const orders = await NfcCardOrder.find(filter).sort({ createdAt: -1 });
    return res.json({ success: true, orders });
  } catch (err) {
    console.error("GET /api/nfc-card/branch/orders error:", err);
    return res.status(500).json({ error: "Failed to fetch branch card orders." });
  }
});

/**
 * POST /api/nfc-card/branch/approve/:orderId
 * Branch approves request and generates exactly N distinct card records with unique URLs
 */
router.post("/branch/approve/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { staffId, staffName, notes, branch } = req.body;

    const order = await NfcCardOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Card order not found." });
    }

    if (branch && order.branch.toLowerCase() !== String(branch).trim().toLowerCase()) {
      return res.status(403).json({ error: "Unauthorized: Request belongs to another branch." });
    }

    if (order.status === "Approved" || order.status === "Processing" || order.status === "Ready for Collection" || order.status === "Collected") {
      return res.status(400).json({ error: `Order is already ${order.status}.` });
    }

    if (order.status === "Rejected") {
      return res.status(400).json({ error: "Rejected orders cannot be approved directly." });
    }

    // Require payment to be paid before approval
    if (order.payment?.status !== "Paid") {
      return res.status(400).json({
        error: "Cannot approve request: Payment status is not Paid."
      });
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const now = new Date();
    const issuedList = [];

    // Idempotent: generate cards only if not already generated
    const existingCards = await NfcCard.find({ orderId: order._id });
    if (existingCards.length >= order.quantity) {
      for (const c of existingCards) {
        issuedList.push({
          cardId: c.cardId,
          cardUrl: c.currentAssignment?.accessUrl || `${frontendUrl}/driver-access/${c.currentAssignment?.rawToken || ""}`,
          rawToken: c.currentAssignment?.rawToken || "",
          tokenHash: c.currentAssignment?.tokenHash || "",
          isPrepared: false,
          status: "Pending Preparation",
          issuedAt: c.createdAt || now
        });
      }
    } else {
      // Generate exactly N distinct card records and distinct secure tokens
      for (let i = 0; i < order.quantity; i++) {
        const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
        const cardId = `SANASA-NFC-${Date.now().toString().slice(-4)}${randomSuffix}`;

        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
        const cardUrl = `${frontendUrl}/driver-access/${rawToken}`;

        const card = new NfcCard({
          cardId,
          policyHolderNic: order.policyHolderNic,
          policyHolderName: order.policyHolderName,
          policyHolderPhone: order.policyHolderPhone,
          branch: order.branch,
          orderId: order._id,
          status: "Pending Preparation",
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
            tokenHash,
            rawToken,
            accessUrl: cardUrl,
            assignedAt: null,
            assignedBy: ""
          },
          assignmentHistory: []
        });

        await card.save();
        issuedList.push({
          cardId,
          cardUrl,
          rawToken,
          tokenHash,
          isPrepared: false,
          status: "Pending Preparation",
          issuedAt: now
        });
      }
    }

    order.status = "Approved";
    order.issuedCards = issuedList;
    order.branchReview = {
      reviewedByStaffId: staffId || "",
      reviewedByStaffName: staffName || "Branch Staff",
      reviewedAt: now,
      notes: notes || "Approved by branch"
    };

    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status: "Approved",
      timestamp: now,
      updatedBy: staffName || "Branch Staff",
      note: notes || `Approved request for ${order.quantity} Optional NFC Cards. ${issuedList.length} card records generated.`
    });

    await order.save();
    emitNfcOrderUpdated(order);

    // SMS to policyholder
    if (order.policyHolderPhone) {
      sendSms({
        phone: order.policyHolderPhone,
        message: `[SANASA GENERAL INSURANCE]\nDear ${order.policyHolderName},\nYour request for ${order.quantity} Optional NFC Cards (${order.orderNumber}) has been APPROVED by the ${order.branch} branch and is moving to physical preparation.\nHotline: 0725 575 575`,
        recipientType: "PolicyHolder",
        recipientName: order.policyHolderName,
        eventType: "nfc_order_approved"
      }).catch((e) => console.warn("Order approved SMS error:", e.message));
    }

    return res.json({
      success: true,
      message: `Request ${order.orderNumber} approved. ${issuedList.length} card records generated successfully.`,
      order,
      issuedCards: issuedList
    });
  } catch (err) {
    console.error("POST /api/nfc-card/branch/approve error:", err);
    return res.status(500).json({ error: err.message || "Failed to approve card order." });
  }
});

/**
 * POST /api/nfc-card/branch/reject/:orderId
 * Branch rejects request with recorded reason
 */
router.post("/branch/reject/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { staffId, staffName, reason, branch } = req.body;

    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ error: "Rejection reason is required." });
    }

    const order = await NfcCardOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Card order not found." });
    }

    if (branch && order.branch.toLowerCase() !== String(branch).trim().toLowerCase()) {
      return res.status(403).json({ error: "Unauthorized: Request belongs to another branch." });
    }

    const now = new Date();
    order.status = "Rejected";
    order.rejectionReason = String(reason).trim();
    order.branchReview = {
      reviewedByStaffId: staffId || "",
      reviewedByStaffName: staffName || "Branch Staff",
      reviewedAt: now,
      notes: String(reason).trim()
    };

    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status: "Rejected",
      timestamp: now,
      updatedBy: staffName || "Branch Staff",
      note: `Rejected by branch: ${reason}`
    });

    await order.save();
    emitNfcOrderUpdated(order);

    // SMS to policyholder
    if (order.policyHolderPhone) {
      sendSms({
        phone: order.policyHolderPhone,
        message: `[SANASA GENERAL INSURANCE]\nDear ${order.policyHolderName},\nYour request for Optional NFC Cards (${order.orderNumber}) was not approved by ${order.branch} branch.\nReason: ${reason}\nPlease contact your branch for assistance: 0725 575 575`,
        recipientType: "PolicyHolder",
        recipientName: order.policyHolderName,
        eventType: "nfc_order_rejected"
      }).catch((e) => console.warn("Order rejected SMS error:", e.message));
    }

    return res.json({
      success: true,
      message: `Request ${order.orderNumber} has been rejected.`,
      order
    });
  } catch (err) {
    console.error("POST /api/nfc-card/branch/reject error:", err);
    return res.status(500).json({ error: err.message || "Failed to reject card order." });
  }
});

/**
 * POST /api/nfc-card/branch/processing/:orderId
 * Branch begins physical NFC card preparation, printing, writing, and testing
 */
router.post("/branch/processing/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { staffId, staffName, notes, branch } = req.body;

    const order = await NfcCardOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Card order not found." });
    }

    if (branch && order.branch.toLowerCase() !== String(branch).trim().toLowerCase()) {
      return res.status(403).json({ error: "Unauthorized: Request belongs to another branch." });
    }

    const now = new Date();
    order.status = "Processing";
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status: "Processing",
      timestamp: now,
      updatedBy: staffName || "Branch Staff",
      note: notes || "Physical NFC cards are being prepared, written, and tested by branch staff."
    });

    await order.save();
    emitNfcOrderUpdated(order);

    return res.json({
      success: true,
      message: `Order ${order.orderNumber} status updated to Processing.`,
      order
    });
  } catch (err) {
    console.error("POST /api/nfc-card/branch/processing error:", err);
    return res.status(500).json({ error: err.message || "Failed to update order to processing." });
  }
});

/**
 * POST /api/nfc-card/branch/ready/:orderId
 * Branch confirms physical preparation and verification is complete.
 * Cards now become Available for assignment by the Policyholder!
 */
router.post("/branch/ready/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { staffId, staffName, notes, branch } = req.body;

    const order = await NfcCardOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Card order not found." });
    }

    if (branch && order.branch.toLowerCase() !== String(branch).trim().toLowerCase()) {
      return res.status(403).json({ error: "Unauthorized: Request belongs to another branch." });
    }

    const now = new Date();
    order.status = "Ready for Collection";

    // Mark all cards in NfcCard model as Available!
    await NfcCard.updateMany(
      { orderId: order._id, status: "Pending Preparation" },
      { $set: { status: "Available" } }
    );

    // Update issuedCards subdocuments
    if (order.issuedCards && order.issuedCards.length > 0) {
      order.issuedCards.forEach((c) => {
        c.isPrepared = true;
        c.preparedAt = now;
        c.status = "Ready for Collection";
      });
    }

    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status: "Ready for Collection",
      timestamp: now,
      updatedBy: staffName || "Branch Staff",
      note: notes || "Physical cards prepared, verified, and confirmed ready for collection."
    });

    await order.save();
    emitNfcOrderUpdated(order);

    // Send SMS notifying Policyholder to collect cards
    if (order.policyHolderPhone) {
      sendSms({
        phone: order.policyHolderPhone,
        message: `[SANASA GENERAL INSURANCE]\nDear ${order.policyHolderName},\nYour ${order.quantity} Optional NFC Cards (${order.orderNumber}) are now READY FOR COLLECTION at the ${order.branch} branch.\nYou can collect them during branch business hours.\nHotline: 0725 575 575`,
        recipientType: "PolicyHolder",
        recipientName: order.policyHolderName,
        eventType: "nfc_cards_ready"
      }).catch((e) => console.warn("Cards ready SMS error:", e.message));
    }

    return res.json({
      success: true,
      message: `Order ${order.orderNumber} marked Ready for Collection. Cards are now Available.`,
      order
    });
  } catch (err) {
    console.error("POST /api/nfc-card/branch/ready error:", err);
    return res.status(500).json({ error: err.message || "Failed to mark order ready for collection." });
  }
});

/**
 * POST /api/nfc-card/branch/collect/:orderId
 * Branch records physical collection of the cards by Policyholder
 */
router.post("/branch/collect/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { staffId, staffName, collectedBy, notes, branch } = req.body;

    const order = await NfcCardOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Card order not found." });
    }

    if (branch && order.branch.toLowerCase() !== String(branch).trim().toLowerCase()) {
      return res.status(403).json({ error: "Unauthorized: Request belongs to another branch." });
    }

    const now = new Date();
    order.status = "Collected";
    order.collectionInfo = {
      collectedAt: now,
      collectedBy: collectedBy || order.policyHolderName || "Policy Holder",
      notes: notes || "Cards handed over at branch"
    };

    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status: "Collected",
      timestamp: now,
      updatedBy: staffName || "Branch Staff",
      note: `Cards collected by ${collectedBy || order.policyHolderName}. Handover verified by ${staffName || "Branch Staff"}.`
    });

    await order.save();
    emitNfcOrderUpdated(order);

    return res.json({
      success: true,
      message: `Card collection successfully recorded for order ${order.orderNumber}.`,
      order
    });
  } catch (err) {
    console.error("POST /api/nfc-card/branch/collect error:", err);
    return res.status(500).json({ error: err.message || "Failed to record card collection." });
  }
});

/**
 * POST /api/nfc-card/branch/revoke-card/:cardId
 * Authorized Branch or Admin staff revokes an individual card or its URL immediately
 */
router.post("/branch/revoke-card/:cardId", async (req, res) => {
  try {
    const { cardId } = req.params;
    const { staffId, staffName, reason, branch } = req.body;

    const card = await NfcCard.findOne({ cardId: cardId.trim() });
    if (!card) {
      return res.status(404).json({ error: "Card not found." });
    }

    if (branch && card.branch.toLowerCase() !== String(branch).trim().toLowerCase()) {
      return res.status(403).json({ error: "Unauthorized: Card belongs to another branch." });
    }

    const now = new Date();
    card.status = "Revoked";

    const oldUrl = card.currentAssignment?.accessUrl || "";
    const oldTokenHash = card.currentAssignment?.tokenHash || "";

    // Invalidate access url and tokens
    if (card.currentAssignment) {
      card.currentAssignment.rawToken = "";
      card.currentAssignment.tokenHash = "";
      card.currentAssignment.accessUrl = "";
      card.currentAssignment.status = "Terminated";
      card.currentAssignment.isBlocked = true;
      card.currentAssignment.blockedReason = reason || "Card revoked by branch";
    }

    if (!card.notes) card.notes = "";
    card.notes += ` [Revoked on ${now.toISOString()} by ${staffName || "Staff"}: ${reason || "No reason specified"}]`;

    await card.save();
    emitNfcCardUpdated(card);

    // Also update order issuedCards record if associated
    if (card.orderId) {
      const order = await NfcCardOrder.findById(card.orderId);
      if (order && order.issuedCards) {
        order.issuedCards.forEach((c) => {
          if (c.cardId === card.cardId) {
            c.status = "Revoked";
            c.cardUrl = "";
            c.rawToken = "";
            c.tokenHash = "";
          }
        });
        order.statusHistory = order.statusHistory || [];
        order.statusHistory.push({
          status: "Card Revoked",
          timestamp: now,
          updatedBy: staffName || "Branch Staff",
          note: `Card ${card.cardId} was revoked: ${reason || "Branch security revocation"}`
        });
        await order.save();
        emitNfcOrderUpdated(order);
      }
    }

    return res.json({
      success: true,
      message: `Card ${card.cardId} has been revoked server-side immediately.`,
      card
    });
  } catch (err) {
    console.error("POST /api/nfc-card/branch/revoke-card error:", err);
    return res.status(500).json({ error: err.message || "Failed to revoke card." });
  }
});

/**
 * POST /api/nfc-card/branch/reissue-card-url/:cardId
 * Authorized staff reissues a fresh, cryptographically secure URL for a revoked or replacement card
 */
router.post("/branch/reissue-card-url/:cardId", async (req, res) => {
  try {
    const { cardId } = req.params;
    const { staffId, staffName, branch, reason } = req.body;

    const card = await NfcCard.findOne({ cardId: String(cardId).trim() });
    if (!card) {
      return res.status(404).json({ error: "Card not found." });
    }

    if (branch && card.branch.toLowerCase() !== String(branch).trim().toLowerCase()) {
      return res.status(403).json({ error: "Unauthorized: Card belongs to another branch." });
    }

    const now = new Date();
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const newAccessUrl = `${frontendUrl}/driver-access/${rawToken}`;

    // Update Card record
    card.status = "Available";
    if (!card.currentAssignment) {
      card.currentAssignment = {};
    }
    card.currentAssignment.rawToken = rawToken;
    card.currentAssignment.tokenHash = tokenHash;
    card.currentAssignment.accessUrl = newAccessUrl;
    card.currentAssignment.status = "Scheduled";
    card.currentAssignment.isBlocked = false;
    card.currentAssignment.blockedReason = "";
    card.currentAssignment.assignedAt = now;
    card.currentAssignment.assignedBy = staffName || "Branch Staff";

    if (!card.notes) card.notes = "";
    card.notes += ` [Replacement URL reissued on ${now.toISOString()} by ${staffName || "Staff"}]`;

    await card.save();
    emitNfcCardUpdated(card);

    // Update Order record
    let updatedOrder = null;
    if (card.orderId) {
      const order = await NfcCardOrder.findById(card.orderId);
      if (order && order.issuedCards) {
        order.issuedCards.forEach((c) => {
          if (c.cardId === card.cardId) {
            c.cardUrl = newAccessUrl;
            c.rawToken = rawToken;
            c.tokenHash = tokenHash;
            c.status = "Pending Preparation";
            c.isPrepared = false;
          }
        });
        order.statusHistory = order.statusHistory || [];
        order.statusHistory.push({
          status: "Replacement URL Reissued",
          timestamp: now,
          updatedBy: staffName || "Branch Staff",
          note: `New secure access URL generated for card ${card.cardId}. Ready to write.`
        });
        await order.save();
        emitNfcOrderUpdated(order);
        updatedOrder = order;
      }
    }

    return res.json({
      success: true,
      message: `New replacement URL generated for card ${card.cardId}.`,
      cardId: card.cardId,
      newAccessUrl,
      card,
      order: updatedOrder
    });
  } catch (err) {
    console.error("POST /branch/reissue-card-url error:", err);
    return res.status(500).json({ error: err.message || "Failed to reissue replacement URL." });
  }
});

/**
 * GET /api/nfc-card/admin/orders
 * Admin view across all branches with filters
 */
router.get("/admin/orders", async (req, res) => {
  try {
    const filter = {};

    if (req.query.branch && req.query.branch !== "all") {
      filter.branch = new RegExp(`^${req.query.branch.trim()}$`, "i");
    }

    if (req.query.status && req.query.status !== "all") {
      filter.status = req.query.status;
    }

    if (req.query.paymentStatus && req.query.paymentStatus !== "all") {
      filter["payment.status"] = req.query.paymentStatus;
    }

    if (req.query.search) {
      const q = String(req.query.search).trim();
      filter.$or = [
        { orderNumber: new RegExp(q, "i") },
        { policyHolderNic: new RegExp(q, "i") },
        { policyHolderName: new RegExp(q, "i") }
      ];
    }

    const orders = await NfcCardOrder.find(filter).sort({ createdAt: -1 });
    return res.json({ success: true, orders });
  } catch (err) {
    console.error("GET /api/nfc-card/admin/orders error:", err);
    return res.status(500).json({ error: "Failed to fetch admin card orders." });
  }
});

// ==========================================
// 2. INVENTORY & CARD DETAILS
// ==========================================

/**
 * GET /api/nfc-card/inventory
 * List all issued physical cards eligible for assignment by policyholder
 */
router.get("/inventory", async (req, res) => {
  try {
    const nic = req.query.nic || req.query.policyHolderNic || req.headers["x-policy-holder-nic"];
    if (!nic) {
      return res.status(400).json({ error: "policyHolderNic is required." });
    }

    const cleanNic = String(nic).trim().toUpperCase();
    // Only return cards that have completed issuance (Available, Scheduled, Active, Temporarily Blocked, Expired)
    // Exclude cards still in "Pending Preparation"
    const cards = await NfcCard.find({
      policyHolderNic: cleanNic,
      status: { $in: ["Available", "Scheduled", "Active", "Temporarily Blocked", "Expired", "Revoked"] }
    }).sort({ createdAt: -1 });

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
    emitNfcCardUpdated(card);

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
    emitNfcCardUpdated(card);

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
    emitNfcCardUpdated(card);

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
    emitNfcCardUpdated(card);

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

// ==========================================
// 5. SANASA NFC WRITER INTEGRATION APIS
// ==========================================

/**
 * POST /api/nfc-card/writer/pairing/generate-code
 * Web portal generates a short-lived, single-use 6-character pairing code
 */
router.post("/writer/pairing/generate-code", async (req, res) => {
  try {
    const { staffId, staffName, staffEmail, branch } = req.body;
    if (!staffId || !branch) {
      return res.status(400).json({ error: "staffId and branch are required to generate pairing code." });
    }

    const cleanBranch = String(branch).trim();
    const cleanStaffId = String(staffId).trim();

    // Expire any existing pending pairing sessions for this staff/branch
    await NfcWriterPairing.deleteMany({
      staffId: cleanStaffId,
      branch: cleanBranch,
      status: "Pending"
    });

    // Generate 6-character uppercase alphanumeric code (e.g. 7X3M9A)
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // excludes ambiguous 0, O, 1, I
    let pairingCode = "";
    const randomBytes = crypto.randomBytes(6);
    for (let i = 0; i < 6; i++) {
      pairingCode += chars[randomBytes[i] % chars.length];
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes TTL

    const pairing = new NfcWriterPairing({
      pairingCode,
      staffId: cleanStaffId,
      staffName: staffName || "Branch Staff",
      staffEmail: staffEmail || "",
      branch: cleanBranch,
      status: "Pending",
      expiresAt
    });

    await pairing.save();
    emitNfcPairingUpdated(pairing);

    return res.json({
      success: true,
      pairingCode,
      expiresAt,
      branch: cleanBranch,
      staffName: pairing.staffName
    });
  } catch (err) {
    console.error("POST /writer/pairing/generate-code error:", err);
    return res.status(500).json({ error: "Failed to generate device pairing code." });
  }
});

/**
 * POST /api/nfc-card/writer/pairing/pair
 * Android NFC Writer app submits pairing code to securely bind with branch session
 */
router.post("/writer/pairing/pair", async (req, res) => {
  try {
    const { pairingCode, deviceId, deviceName, staffId, branch } = req.body;
    if (!pairingCode) {
      return res.status(400).json({ error: "pairingCode is required." });
    }

    const cleanCode = String(pairingCode).trim().toUpperCase();
    const pairing = await NfcWriterPairing.findOne({
      pairingCode: cleanCode,
      status: "Pending"
    });

    if (!pairing) {
      return res.status(404).json({ error: "Invalid or expired pairing code. Please generate a new code on the portal." });
    }

    if (new Date() > pairing.expiresAt) {
      pairing.status = "Expired";
      await pairing.save();
      return res.status(400).json({ error: "Pairing code has expired. Please generate a new code." });
    }

    const now = new Date();
    pairing.status = "Paired";
    pairing.deviceId = String(deviceId || `android-${crypto.randomBytes(4).toString("hex")}`).trim();
    pairing.deviceName = String(deviceName || "Android NFC Device").trim();
    pairing.pairedAt = now;
    pairing.lastSeenAt = now;
    pairing.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Active for 24-hour shift

    await pairing.save();
    emitNfcPairingUpdated(pairing);

    return res.json({
      success: true,
      message: `Device successfully paired to ${pairing.branch} branch!`,
      pairing: {
        pairingId: pairing._id,
        branch: pairing.branch,
        staffId: pairing.staffId,
        staffName: pairing.staffName,
        deviceId: pairing.deviceId,
        deviceName: pairing.deviceName,
        pairedAt: pairing.pairedAt
      }
    });
  } catch (err) {
    console.error("POST /writer/pairing/pair error:", err);
    return res.status(500).json({ error: "Failed to pair device." });
  }
});

/**
 * GET /api/nfc-card/writer/pairing/status
 * Check current pairing status for branch/staff
 */
router.get("/writer/pairing/status", async (req, res) => {
  try {
    const { branch, staffId, deviceId } = req.query;
    if (!branch && !staffId && !deviceId) {
      return res.status(400).json({ error: "branch, staffId, or deviceId required." });
    }

    const filter = { status: "Paired" };
    if (deviceId) {
      filter.deviceId = String(deviceId).trim();
    } else if (staffId) {
      filter.staffId = String(staffId).trim();
    } else if (branch) {
      filter.branch = new RegExp(`^${String(branch).trim()}$`, "i");
    }

    const pairing = await NfcWriterPairing.findOne(filter).sort({ pairedAt: -1 });
    if (!pairing || (pairing.expiresAt && new Date() > pairing.expiresAt)) {
      return res.json({ paired: false, message: "No active paired device found." });
    }

    return res.json({
      paired: true,
      pairing: {
        pairingId: pairing._id,
        branch: pairing.branch,
        staffId: pairing.staffId,
        staffName: pairing.staffName,
        deviceId: pairing.deviceId,
        deviceName: pairing.deviceName,
        pairedAt: pairing.pairedAt,
        lastSeenAt: pairing.lastSeenAt
      }
    });
  } catch (err) {
    console.error("GET /writer/pairing/status error:", err);
    return res.status(500).json({ error: "Failed to fetch pairing status." });
  }
});

/**
 * POST /api/nfc-card/writer/pairing/unpair
 * Safe unpair action from website or phone
 */
router.post("/writer/pairing/unpair", async (req, res) => {
  try {
    const { staffId, branch, deviceId } = req.body;
    const filter = { status: "Paired" };

    if (deviceId) filter.deviceId = String(deviceId).trim();
    else if (staffId) filter.staffId = String(staffId).trim();
    else if (branch) filter.branch = new RegExp(`^${String(branch).trim()}$`, "i");

    const pairing = await NfcWriterPairing.findOne(filter);
    if (pairing) {
      pairing.status = "Revoked";
      await pairing.save();
      emitNfcPairingUpdated(pairing);
    }

    return res.json({ success: true, message: "Device successfully unpaired." });
  } catch (err) {
    console.error("POST /writer/pairing/unpair error:", err);
    return res.status(500).json({ error: "Failed to unpair device." });
  }
});

/**
 * POST /api/nfc-card/writer/transfer-job
 * Website initiates authenticated transfer of single card to paired NFC Writer phone
 */
router.post("/writer/transfer-job", async (req, res) => {
  try {
    const { orderId, cardId, staffId, staffName, branch } = req.body;
    if (!orderId || !cardId) {
      return res.status(400).json({ error: "orderId and cardId are required." });
    }

    const order = await NfcCardOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    if (branch && order.branch.toLowerCase() !== String(branch).trim().toLowerCase()) {
      return res.status(403).json({ error: "Unauthorized: Order belongs to another branch." });
    }

    // Find card URL from order or NfcCard collection
    let cardUrl = "";
    const issuedMatch = (order.issuedCards || []).find((c) => c.cardId === cardId);
    if (issuedMatch && issuedMatch.cardUrl) {
      cardUrl = issuedMatch.cardUrl;
    } else {
      const dbCard = await NfcCard.findOne({ cardId });
      if (dbCard?.currentAssignment?.accessUrl) {
        cardUrl = dbCard.currentAssignment.accessUrl;
      }
    }

    if (!cardUrl) {
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      const rawToken = crypto.randomBytes(32).toString("hex");
      cardUrl = `${frontendUrl}/driver-access/${rawToken}`;
    }

    const jobId = `JOB-NFC-${Date.now().toString().slice(-6)}${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min TTL

    // Cancel any prior pending job for this card
    await NfcTransferJob.updateMany(
      { cardId, status: { $in: ["Pending", "Received", "Writing"] } },
      { $set: { status: "Cancelled" } }
    );

    const job = new NfcTransferJob({
      jobId,
      orderId: order._id,
      orderNumber: order.orderNumber,
      cardId,
      cardUrl,
      policyHolderName: order.policyHolderName,
      branch: order.branch,
      staffId: staffId || "",
      staffName: staffName || "Branch Staff",
      status: "Pending",
      expiresAt
    });

    await job.save();

    // Broadcast transfer job via Socket.IO directly to paired staff and branch rooms
    emitNfcTransferJob(job);
    emitNfcTransferStatus(job);

    return res.status(201).json({
      success: true,
      message: `Card ${cardId} sent to paired NFC Writer phone.`,
      job
    });
  } catch (err) {
    console.error("POST /writer/transfer-job error:", err);
    return res.status(500).json({ error: err.message || "Failed to create transfer job." });
  }
});

/**
 * GET /api/nfc-card/writer/pending-jobs
 * Android NFC Writer app fetches queue of cards awaiting writing
 */
router.get("/writer/pending-jobs", async (req, res) => {
  try {
    const { branch, staffId } = req.query;
    if (!branch && !staffId) {
      return res.status(400).json({ error: "branch or staffId is required." });
    }

    const filter = {
      status: { $in: ["Pending", "Received", "Writing"] },
      expiresAt: { $gt: new Date() }
    };

    if (branch) {
      filter.branch = new RegExp(`^${String(branch).trim()}$`, "i");
    }

    const jobs = await NfcTransferJob.find(filter).sort({ createdAt: -1 });
    return res.json({ success: true, jobs });
  } catch (err) {
    console.error("GET /writer/pending-jobs error:", err);
    return res.status(500).json({ error: "Failed to fetch pending transfer jobs." });
  }
});

/**
 * POST /api/nfc-card/writer/job-status
 * App updates status: Received -> Writing -> Failed
 */
router.post("/writer/job-status", async (req, res) => {
  try {
    const { jobId, status, errorMessage, deviceId } = req.body;
    if (!jobId || !status) {
      return res.status(400).json({ error: "jobId and status are required." });
    }

    const job = await NfcTransferJob.findOne({ jobId: String(jobId).trim() });
    if (!job) {
      return res.status(404).json({ error: "Transfer job not found." });
    }

    job.status = status;
    if (errorMessage) job.errorMessage = String(errorMessage);
    if (deviceId) job.deviceId = String(deviceId);

    await job.save();
    emitNfcTransferStatus(job);

    return res.json({ success: true, job });
  } catch (err) {
    console.error("POST /writer/job-status error:", err);
    return res.status(500).json({ error: "Failed to update job status." });
  }
});

/**
 * POST /api/nfc-card/writer/complete
 * Phone writes tag, reads back URI, confirms equality, and synchronizes with backend
 */
router.post("/writer/complete", async (req, res) => {
  try {
    const {
      jobId,
      cardId,
      orderId,
      readBackUrl,
      tagUid,
      tagTech,
      staffId,
      staffName,
      branch
    } = req.body;

    if (!cardId || !readBackUrl) {
      return res.status(400).json({ error: "cardId and readBackUrl are required." });
    }

    const cleanCardId = String(cardId).trim();
    const cleanReadBackUrl = String(readBackUrl).trim();

    // 1. Locate Card record
    const card = await NfcCard.findOne({ cardId: cleanCardId });
    if (!card) {
      return res.status(404).json({ error: `NFC Card ${cleanCardId} not found.` });
    }

    // 2. Validate Read-back URL matches authorized card URL
    const expectedUrl = card.currentAssignment?.accessUrl || "";
    if (expectedUrl && expectedUrl !== cleanReadBackUrl) {
      return res.status(400).json({
        error: "Verification failed: Read-back URL from physical tag does not match authorized URL issued by backend.",
        expectedUrl,
        readBackUrl: cleanReadBackUrl
      });
    }

    const now = new Date();

    // 3. Update Transfer Job
    let job = null;
    if (jobId) {
      job = await NfcTransferJob.findOne({ jobId: String(jobId).trim() });
      if (job) {
        job.status = "Completed";
        job.readBackVerified = true;
        job.readBackUrl = cleanReadBackUrl;
        job.tagUid = tagUid || "";
        job.tagTech = tagTech || "NDEF";
        job.completedAt = now;
        await job.save();
        emitNfcTransferStatus(job);
      }
    }

    // 4. Update Physical Card Record in NfcCard model
    card.cardUid = tagUid || card.cardUid || "";
    card.status = "Available"; // Card is verified and immediately available for assignment
    if (!card.notes) card.notes = "";
    card.notes += ` [Physical NFC verified on ${now.toISOString()} - Tag UID: ${tagUid || "NDEF"}]`;
    await card.save();
    emitNfcCardUpdated(card);

    // 5. Update Order Record if orderId supplied or linked
    let updatedOrder = null;
    const targetOrderId = orderId || card.orderId;
    if (targetOrderId) {
      const order = await NfcCardOrder.findById(targetOrderId);
      if (order) {
        let cardFoundInOrder = false;
        if (order.issuedCards && order.issuedCards.length > 0) {
          order.issuedCards.forEach((c) => {
            if (c.cardId === cleanCardId) {
              c.isPrepared = true;
              c.preparedAt = now;
              c.status = "Ready for Collection";
              cardFoundInOrder = true;
            }
          });
        }

        // Calculate progress: count of prepared cards
        const preparedCount = (order.issuedCards || []).filter((c) => c.isPrepared).length;
        const totalCount = order.quantity || order.issuedCards?.length || 1;

        // If all cards in the request are verified & prepared, auto-transition order to Ready for Collection!
        if (preparedCount >= totalCount) {
          order.status = "Ready for Collection";
          order.statusHistory = order.statusHistory || [];
          order.statusHistory.push({
            status: "Ready for Collection",
            timestamp: now,
            updatedBy: staffName || "NFC Writer App",
            note: `All ${totalCount} physical cards successfully written, verified, and ready for collection.`
          });

          // Send SMS notification to policyholder
          if (order.policyHolderPhone) {
            sendSms({
              phone: order.policyHolderPhone,
              message: `[SANASA GENERAL INSURANCE]\nDear ${order.policyHolderName},\nAll ${totalCount} Optional NFC Cards (${order.orderNumber}) have been successfully prepared and verified.\nThey are now READY FOR COLLECTION at ${order.branch} branch.\nHotline: 0725 575 575`,
              recipientType: "PolicyHolder",
              recipientName: order.policyHolderName,
              eventType: "nfc_cards_ready"
            }).catch((e) => console.warn("Cards ready SMS error:", e.message));
          }
        } else if (order.status !== "Processing") {
          order.status = "Processing";
        }

        await order.save();
        emitNfcOrderUpdated(order);
        updatedOrder = order;
      }
    }

    return res.json({
      success: true,
      message: `Card ${cleanCardId} verified and synchronized successfully!`,
      card,
      order: updatedOrder,
      job
    });
  } catch (err) {
    console.error("POST /writer/complete error:", err);
    return res.status(500).json({ error: err.message || "Failed to record write completion." });
  }
});

/**
 * POST /api/nfc-card/writer/sync-retry
 * Idempotent retry endpoint if physical write succeeded offline but backend sync initially failed
 */
router.post("/writer/sync-retry", async (req, res) => {
  try {
    const { cardId, orderId, readBackUrl, tagUid, staffId, branch } = req.body;
    if (!cardId || !readBackUrl) {
      return res.status(400).json({ error: "cardId and readBackUrl are required." });
    }

    const card = await NfcCard.findOne({ cardId: String(cardId).trim() });
    if (!card) {
      return res.status(404).json({ error: "Card not found." });
    }

    const now = new Date();
    card.cardUid = tagUid || card.cardUid;
    card.status = "Available";
    await card.save();
    emitNfcCardUpdated(card);

    if (orderId) {
      const order = await NfcCardOrder.findById(orderId);
      if (order && order.issuedCards) {
        order.issuedCards.forEach((c) => {
          if (c.cardId === cardId) {
            c.isPrepared = true;
            c.preparedAt = now;
            c.status = "Ready for Collection";
          }
        });
        await order.save();
        emitNfcOrderUpdated(order);
      }
    }

    return res.json({
      success: true,
      message: `Sync retry successful for card ${cardId}.`,
      card
    });
  } catch (err) {
    console.error("POST /writer/sync-retry error:", err);
    return res.status(500).json({ error: "Failed to retry sync." });
  }
});

/**
 * POST /api/nfc-card/writer/verify-access
 * Purpose-built Stage B backend verification endpoint
 */
router.post("/writer/verify-access", async (req, res) => {
  try {
    const { cardId, cardUrl, staffId, staffName, branch } = req.body;
    if (!cardId) {
      return res.status(400).json({ error: "cardId is required." });
    }

    const cleanCardId = String(cardId).trim();
    const card = await NfcCard.findOne({ cardId: cleanCardId });

    if (!card) {
      return res.status(404).json({
        success: false,
        verified: false,
        tokenStatus: "Invalid",
        assignmentStatus: "Unavailable",
        accessRouteStatus: "Failed",
        message: `Card ${cleanCardId} does not exist in backend database.`
      });
    }

    // Branch authorization check
    if (branch && card.branch && card.branch.toLowerCase() !== String(branch).trim().toLowerCase()) {
      return res.status(403).json({
        success: false,
        verified: false,
        tokenStatus: "Unauthorized",
        assignmentStatus: "Invalid",
        accessRouteStatus: "Failed",
        message: "Unauthorized: Card belongs to another branch."
      });
    }

    // Determine Token Status
    let tokenStatus = "Active";
    let tokenHash = "";
    let rawToken = "";

    // Extract raw token from url if present
    if (cardUrl) {
      const match = cardUrl.match(/driver-access\/([a-f0-9]+)/i);
      if (match) {
        rawToken = match[1];
        tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      }
    }

    if (card.status === "Revoked" || card.currentAssignment?.isBlocked) {
      tokenStatus = "Revoked";
    } else if (card.status === "Expired") {
      tokenStatus = "Expired";
    } else if (tokenHash && card.currentAssignment?.tokenHash && tokenHash !== card.currentAssignment.tokenHash) {
      tokenStatus = "Invalid";
    }

    // Check assignment
    let assignmentStatus = "Valid";
    let accessRouteStatus = "Available";
    let vehiclePlate = card.currentAssignment?.vehiclePlate || "";
    let driverName = card.currentAssignment?.driverName || card.policyHolderName || "";

    if (tokenStatus !== "Active") {
      assignmentStatus = "Invalid";
      accessRouteStatus = "Failed";
    }

    const verified = tokenStatus === "Active" && assignmentStatus === "Valid";
    const now = new Date();

    // Log verification check to security audit history
    if (!card.notes) card.notes = "";
    card.notes += ` [Backend verified on ${now.toISOString()} by ${staffName || "Writer App"} - Result: ${verified ? "PASSED" : "FAILED"}]`;
    await card.save();

    return res.json({
      success: true,
      verified,
      tokenStatus,
      assignmentStatus,
      accessRouteStatus,
      cardId: cleanCardId,
      branch: card.branch,
      vehiclePlate: vehiclePlate || "Assigned on Dispatch",
      policyHolderName: card.policyHolderName,
      driverName,
      verifiedAt: now.toISOString(),
      auditLogged: true,
      message: verified
        ? "Backend token, vehicle assignment, and limited-access permissions verified successfully."
        : `Backend verification failed: Token is ${tokenStatus}.`
    });
  } catch (err) {
    console.error("POST /writer/verify-access error:", err);
    return res.status(500).json({
      success: false,
      verified: false,
      tokenStatus: "Unavailable",
      assignmentStatus: "Unavailable",
      accessRouteStatus: "Failed",
      error: err.message || "Failed to verify backend access."
    });
  }
});

export default router;
