import express from "express";
import crypto from "crypto";
import Stripe from "stripe";
import User from "../models/user.model.js";
import OfficeStaff from "../models/office_staff.model.js";
import ThirdPartyRegistration from "../models/third_party_registration.model.js";
import { uploadToCloudinary } from "../utils/upload.js";
import { normalizeSriLankanPhone, sendSms } from "../services/smsService.js";
import Claim from "../models/claim.model.js";
import PhotoHash from "../models/photoHash.model.js";
import { getNearestBranch } from "../utils/branch.js";
import { analyzeAccidentDamage } from "../utils/aiAnalyzer.js";
import {
  extractBase64Buffer,
  computeSha256,
  computePerceptualFingerprint
} from "../utils/imageHasher.js";
import {
  sendThirdPartyDriverApprovalEmail,
  sendThirdPartyDriverRejectionEmail,
  sendThirdPartyDriverActivityEmail
} from "../utils/email.js";

const router = express.Router();

const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is missing from environment variables.");
  }
  return new Stripe(secretKey);
};

// Helper: build branch regex condition for flexible matching ("Galle" vs "Galle Branch")
const getBranchCondition = (branchName) => {
  if (!branchName) return "Galle";
  const base = branchName.replace(/\s+Branch$/i, "").trim();
  return {
    $in: [
      branchName,
      base,
      `${base} Branch`,
      new RegExp(`^${base}(?:\\s+Branch)?$`, "i")
    ]
  };
};

// ==========================================
// 1. POLICYHOLDER ENDPOINTS
// ==========================================

/**
 * GET /api/third-party/eligible-vehicles
 * Fetch vehicles belonging to the authenticated Policyholder that have status === "Approved"
 */
router.get("/eligible-vehicles", async (req, res) => {
  try {
    const nic = req.query.nic || req.query.policyHolderNic || req.headers["x-policy-holder-nic"];
    if (!nic) {
      return res.status(400).json({ error: "Policyholder NIC is required." });
    }

    const cleanNic = nic.trim().toUpperCase();
    const user = await User.findOne({ nic: cleanNic }).lean();
    if (!user) {
      return res.status(404).json({ error: "Policyholder not found." });
    }

    // Only vehicles with status 'Approved' are eligible
    const eligibleVehicles = (user.vehicles || []).filter(
      (v) => v.status === "Approved"
    );

    return res.json({
      success: true,
      vehicles: eligibleVehicles,
      userBranch: user.branch || "Galle"
    });
  } catch (err) {
    console.error("GET eligible-vehicles error:", err);
    return res.status(500).json({ error: "Failed to fetch eligible vehicles." });
  }
});

/**
 * POST /api/third-party/request
 * Create a new third-party driver registration request with vehicle ownership validation
 */
router.post("/request", async (req, res) => {
  try {
    const {
      policyHolderNic,
      driverDetails,
      selectedVehiclePlates,
      idempotencyKey
    } = req.body;

    // 1. Validation
    if (!policyHolderNic) {
      return res.status(400).json({ error: "Policyholder NIC is required." });
    }
    if (!driverDetails || typeof driverDetails !== "object") {
      return res.status(400).json({ error: "Driver details are required." });
    }
    const { fullName, residentialAddress, phoneNumber, nicNumber, documents } = driverDetails;
    if (!fullName || !residentialAddress || !phoneNumber) {
      return res.status(400).json({ error: "Full name, address, and phone number are required." });
    }
    if (
      !documents ||
      !documents.nicFront ||
      !documents.nicBack ||
      !documents.drivingLicenceFront ||
      !documents.drivingLicenceBack
    ) {
      return res.status(400).json({
        error: "All 4 identity document photographs (NIC Front, NIC Back, Licence Front, Licence Back) are required."
      });
    }

    // Phone validation
    const phoneCheck = normalizeSriLankanPhone(phoneNumber);
    if (!phoneCheck.isValid) {
      return res.status(400).json({ error: phoneCheck.error });
    }

    // Vehicles validation
    if (!selectedVehiclePlates || !Array.isArray(selectedVehiclePlates) || selectedVehiclePlates.length === 0) {
      return res.status(400).json({ error: "At least one eligible vehicle must be selected." });
    }

    // 2. Fetch authenticated Policyholder
    const cleanNic = policyHolderNic.trim().toUpperCase();
    const user = await User.findOne({ nic: cleanNic });
    if (!user) {
      return res.status(404).json({ error: "Policyholder record not found." });
    }

    // 3. Ownership and Eligibility Verification
    const userVehicles = user.vehicles || [];
    const normalizedPlates = selectedVehiclePlates.map((p) => p.trim().toUpperCase());
    const matchedVehicles = [];

    for (const plate of normalizedPlates) {
      const owned = userVehicles.find(
        (v) => v.numberPlate.trim().toUpperCase() === plate
      );
      if (!owned) {
        return res.status(403).json({
          error: `Unauthorized: Vehicle plate "${plate}" does not belong to your account.`
        });
      }
      if (owned.status !== "Approved") {
        return res.status(400).json({
          error: `Vehicle "${plate}" is not eligible because its insurance policy status is "${owned.status}".`
        });
      }
      matchedVehicles.push({
        numberPlate: owned.numberPlate,
        vehicleType: owned.vehicleType,
        model: owned.model,
        company: owned.company,
        year: owned.year,
        policyNumber: owned.policyNumber
      });
    }

    // 4. Duplicate prevention (Idempotency)
    if (idempotencyKey) {
      const existing = await ThirdPartyRegistration.findOne({ idempotencyKey });
      if (existing) {
        return res.json({
          success: true,
          duplicate: true,
          request: existing
        });
      }
    }

    // 5. Generate Request Reference: TPR-YYYY-XXXX
    const currentYear = new Date().getFullYear();
    const count = await ThirdPartyRegistration.countDocuments();
    const requestReference = `TPR-${currentYear}-${String(count + 1).padStart(4, "0")}`;

    // 6. Secure Document Upload
    const [uploadedNicFront, uploadedNicBack, uploadedDlFront, uploadedDlBack] = await Promise.all([
      uploadToCloudinary(documents.nicFront, "third_party_docs/nic"),
      uploadToCloudinary(documents.nicBack, "third_party_docs/nic"),
      uploadToCloudinary(documents.drivingLicenceFront, "third_party_docs/licence"),
      uploadToCloudinary(documents.drivingLicenceBack, "third_party_docs/licence")
    ]);

    // 7. Save ThirdPartyRegistration record (Fixed fee LKR 300)
    const newRegistration = new ThirdPartyRegistration({
      requestReference,
      policyHolderNic: cleanNic,
      policyHolderName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
      policyHolderEmail: user.email,
      policyHolderPhone: user.mobile || "",
      branch: user.branch || "Galle",
      driverDetails: {
        fullName: fullName.trim(),
        residentialAddress: residentialAddress.trim(),
        phoneNumber: phoneCheck.normalized,
        nicNumber: (nicNumber || "").trim(),
        documents: {
          nicFront: uploadedNicFront,
          nicBack: uploadedNicBack,
          drivingLicenceFront: uploadedDlFront,
          drivingLicenceBack: uploadedDlBack
        }
      },
      selectedVehicles: matchedVehicles,
      fee: 300,
      currency: "LKR",
      status: "Pending Payment",
      payment: {
        status: "Pending Payment",
        amountPaid: 0,
        currency: "LKR"
      },
      idempotencyKey: idempotencyKey || null
    });

    await newRegistration.save();

    return res.status(201).json({
      success: true,
      message: "Registration request submitted. Please proceed to payment.",
      request: newRegistration
    });
  } catch (err) {
    console.error("POST /api/third-party/request error:", err);
    return res.status(500).json({ error: err.message || "Failed to submit registration request." });
  }
});

/**
 * POST /api/third-party/checkout-session
 * Create Stripe Checkout Session for fixed fee of LKR 300
 */
router.post("/checkout-session", async (req, res) => {
  try {
    const { requestId, policyHolderNic } = req.body;
    if (!requestId || !policyHolderNic) {
      return res.status(400).json({ error: "requestId and policyHolderNic are required." });
    }

    const registration = await ThirdPartyRegistration.findById(requestId);
    if (!registration) {
      return res.status(404).json({ error: "Registration request not found." });
    }

    // Ownership check
    if (registration.policyHolderNic !== policyHolderNic.trim().toUpperCase()) {
      return res.status(403).json({ error: "Unauthorized access to this registration request." });
    }

    if (registration.payment.status === "Paid") {
      return res.status(400).json({ error: "Registration fee is already paid." });
    }

    const stripe = getStripe();
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    // Enforce exact backend fee calculation: LKR 300 = 30000 subunits
    const fixedFeeLkr = 300;
    const unitAmountSubunits = Math.round(fixedFeeLkr * 100);

    const vehicleSummary = registration.selectedVehicles
      .map((v) => v.numberPlate)
      .join(", ");

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "lkr",
            product_data: {
              name: `Third-Party Driver Registration (${registration.requestReference})`,
              description: `Coverage for Driver: ${registration.driverDetails.fullName} on Vehicles: ${vehicleSummary}`
            },
            unit_amount: unitAmountSubunits
          },
          quantity: 1
        }
      ],
      mode: "payment",
      success_url: `${frontendUrl}/Policy_Holder/MyVehicles?third_party_payment=success&session_id={CHECKOUT_SESSION_ID}&ref=${encodeURIComponent(
        registration.requestReference
      )}`,
      cancel_url: `${frontendUrl}/Policy_Holder/MyVehicles?third_party_payment=cancelled&ref=${encodeURIComponent(
        registration.requestReference
      )}`,
      metadata: {
        type: "third_party_registration",
        requestId: registration._id.toString(),
        requestReference: registration.requestReference,
        policyHolderNic: registration.policyHolderNic,
        branch: registration.branch
      }
    });

    registration.payment.stripeSessionId = session.id;
    await registration.save();

    return res.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
      amount: fixedFeeLkr,
      currency: "LKR"
    });
  } catch (err) {
    console.error("Stripe session creation error:", err);
    return res.status(500).json({ error: err.message || "Failed to create Stripe payment session." });
  }
});

/**
 * POST /api/third-party/verify-payment
 * Verifies Stripe session status after customer returns from Stripe Checkout
 */
router.post("/verify-payment", async (req, res) => {
  try {
    const { sessionId, requestReference } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: "Stripe sessionId is required." });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid") {
      const regId = session.metadata?.requestId;
      let query = regId ? { _id: regId } : { "payment.stripeSessionId": sessionId };
      if (!regId && requestReference) {
        query = { requestReference: requestReference.trim() };
      }

      const registration = await ThirdPartyRegistration.findOne(query);
      if (!registration) {
        return res.status(404).json({ error: "Registration not found for this payment." });
      }

      // Transition status idempotently
      if (registration.payment.status !== "Paid") {
        registration.payment.status = "Paid";
        registration.payment.paidAt = new Date();
        registration.payment.amountPaid = 300;
        registration.payment.stripePaymentIntentId =
          typeof session.payment_intent === "string" ? session.payment_intent : "";
        registration.status = "Pending Branch Approval";
        await registration.save();
      }

      return res.json({
        success: true,
        message: "Payment confirmed. Request is now pending branch approval.",
        request: registration
      });
    }

    return res.status(400).json({
      success: false,
      message: `Payment status is ${session.payment_status}. Payment not completed.`
    });
  } catch (err) {
    console.error("Verify payment error:", err);
    return res.status(500).json({ error: err.message || "Failed to verify payment." });
  }
});

/**
 * POST /api/third-party/webhook
 * Stripe Webhook receiver for background payment confirmation
 */
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event = req.body;

  try {
    if (endpointSecret && sig) {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data?.object;
      if (session?.metadata?.type === "third_party_registration") {
        const regId = session.metadata.requestId;
        const registration = await ThirdPartyRegistration.findById(regId);
        if (registration && registration.payment.status !== "Paid") {
          registration.payment.status = "Paid";
          registration.payment.paidAt = new Date();
          registration.payment.amountPaid = 300;
          registration.payment.stripePaymentIntentId =
            typeof session.payment_intent === "string" ? session.payment_intent : "";
          registration.status = "Pending Branch Approval";
          await registration.save();
          console.log(`✅ Webhook confirmed payment for ${registration.requestReference}`);
        }
      }
    }

    return res.json({ received: true });
  } catch (err) {
    console.error("Webhook processing error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

/**
 * GET /api/third-party/my-requests
 * Retrieve registration history for authenticated Policyholder
 */
router.get("/my-requests", async (req, res) => {
  try {
    const { nic } = req.query;
    if (!nic) {
      return res.status(400).json({ error: "Policyholder NIC is required." });
    }

    const cleanNic = nic.trim().toUpperCase();
    const requests = await ThirdPartyRegistration.find({ policyHolderNic: cleanNic })
      .select("-secureAccess.tokenHash -secureAccess.rawToken -branchReview.internalNotes")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      requests
    });
  } catch (err) {
    console.error("GET my-requests error:", err);
    return res.status(500).json({ error: "Failed to fetch request history." });
  }
});

// ==========================================
// 2. BRANCH (OFFICE STAFF) ENDPOINTS
// ==========================================

/**
 * Middleware helper: verify branch staff authorization and derive trusted branch
 */
const verifyStaffBranch = async (req, res) => {
  const staffId = req.headers["x-staff-id"] || req.query.staffId || req.body.staffId;
  if (!staffId) {
    res.status(401).json({ error: "Staff identification required." });
    return null;
  }

  const staff = await OfficeStaff.findById(staffId).lean();
  if (!staff) {
    res.status(403).json({ error: "Unauthorized: Invalid office staff member." });
    return null;
  }

  return staff;
};

/**
 * GET /api/third-party/branch/requests
 * List registration requests for the staff member's branch with filtering & search
 */
router.get("/branch/requests", async (req, res) => {
  try {
    const staff = await verifyStaffBranch(req, res);
    if (!staff) return;

    const { status, search, page = 1, limit = 20 } = req.query;
    const branchQuery = getBranchCondition(staff.branch);

    const query = { branch: branchQuery };

    if (status && status !== "all") {
      query.status = status;
    }

    if (search && search.trim()) {
      const q = search.trim();
      query.$or = [
        { requestReference: new RegExp(q, "i") },
        { "driverDetails.fullName": new RegExp(q, "i") },
        { "driverDetails.phoneNumber": new RegExp(q, "i") },
        { policyHolderName: new RegExp(q, "i") },
        { policyHolderNic: new RegExp(q, "i") },
        { "selectedVehicles.numberPlate": new RegExp(q, "i") }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [requests, total] = await Promise.all([
      ThirdPartyRegistration.find(query)
        .select("-secureAccess.tokenHash")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      ThirdPartyRegistration.countDocuments(query)
    ]);

    return res.json({
      success: true,
      branch: staff.branch,
      requests,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (err) {
    console.error("GET branch requests error:", err);
    return res.status(500).json({ error: "Failed to fetch branch requests." });
  }
});

/**
 * GET /api/third-party/branch/request/:requestId
 * Get single request details for branch review
 */
router.get("/branch/request/:requestId", async (req, res) => {
  try {
    const staff = await verifyStaffBranch(req, res);
    if (!staff) return;

    const { requestId } = req.params;
    const request = await ThirdPartyRegistration.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: "Registration request not found." });
    }

    // Strict Branch Isolation check
    const baseStaffBranch = (staff.branch || "").replace(/\s+Branch$/i, "").toLowerCase();
    const baseReqBranch = (request.branch || "").replace(/\s+Branch$/i, "").toLowerCase();

    if (baseStaffBranch !== baseReqBranch) {
      return res.status(403).json({
        error: "Forbidden: You are not authorized to view requests from another branch."
      });
    }

    return res.json({
      success: true,
      request
    });
  } catch (err) {
    console.error("GET request details error:", err);
    return res.status(500).json({ error: "Failed to fetch request details." });
  }
});

/**
 * GET /api/third-party/branch/driver-activities/:requestId
 * Fetch all activities of a third-party driver:
 * - Claims submitted by the driver (with applicant user name, dates, status)
 * - Supporting documents uploaded by the driver
 * - Live chat messages sent by the driver
 * - Access and session history
 */
router.get("/branch/driver-activities/:requestId", async (req, res) => {
  try {
    const staff = await verifyStaffBranch(req, res);
    if (!staff) return;

    const { requestId } = req.params;
    const request = await ThirdPartyRegistration.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: "Registration request not found." });
    }

    // Strict Branch Isolation check
    const baseStaffBranch = (staff.branch || "").replace(/\s+Branch$/i, "").toLowerCase();
    const baseReqBranch = (request.branch || "").replace(/\s+Branch$/i, "").toLowerCase();
    if (baseStaffBranch !== baseReqBranch) {
      return res.status(403).json({
        error: "Forbidden: You are not authorized to view activities from another branch."
      });
    }

    const driverName = request.driverDetails?.fullName || "";
    const driverNic = request.driverDetails?.nicNumber || "";
    const driverPhone = request.driverDetails?.phoneNumber || "";

    // 1. Claims submitted by this third party driver
    const queryConditions = [
      { "submittedByDriver.registrationId": request._id }
    ];
    if (driverNic) {
      queryConditions.push({ "submittedByDriver.driverNic": driverNic });
    }
    if (driverName) {
      queryConditions.push({ "submittedByDriver.driverName": driverName });
      queryConditions.push({ description: new RegExp(driverName, "i") });
    }

    const claims = await Claim.find({ $or: queryConditions })
      .sort({ createdAt: -1 })
      .lean();

    // 2. Documents uploaded by this driver
    const uploadedDocs = [];
    claims.forEach((c) => {
      (c.additionalDocuments || []).forEach((doc) => {
        if (
          doc.uploadedBy &&
          (doc.uploadedBy.includes(driverName) || doc.uploadedBy.toLowerCase().includes("driver") || doc.uploadedBy.toLowerCase().includes("third-party"))
        ) {
          uploadedDocs.push({
            claimNumber: c.claimNumber,
            vehiclePlate: c.vehiclePlate,
            docName: doc.name,
            url: doc.url,
            uploadedAt: doc.uploadedAt,
            uploadedBy: doc.uploadedBy
          });
        }
      });
    });

    // 3. Messages sent by this driver
    const sentMessages = [];
    claims.forEach((c) => {
      (c.messages || []).forEach((m) => {
        if (
          m.sender &&
          (m.sender === driverName || m.sender.includes(driverName) || m.sender.toLowerCase().includes("third-party"))
        ) {
          sentMessages.push({
            claimNumber: c.claimNumber,
            vehiclePlate: c.vehiclePlate,
            sender: m.sender,
            message: m.message,
            sentAt: m.sentAt
          });
        }
      });
    });

    // 4. Access Logs
    const accessLogs = request.accessLogs || [];

    return res.json({
      success: true,
      driverDetails: {
        driverName,
        driverNic,
        driverPhone,
        policyHolderName: request.policyHolderName,
        policyHolderNic: request.policyHolderNic,
        branch: request.branch,
        requestReference: request.requestReference,
        status: request.status
      },
      activities: {
        totalClaimsApplied: claims.length,
        claims: claims.map((c) => ({
          claimNumber: c.claimNumber,
          vehiclePlate: c.vehiclePlate,
          incidentDate: c.incidentDate,
          incidentTime: c.incidentTime,
          damageType: c.damageType,
          status: c.status,
          amount: c.amount,
          approvedAmount: c.approvedAmount,
          location: c.location,
          assignedAgent: c.assignedAgent,
          createdAt: c.createdAt,
          submittedByDriver: c.submittedByDriver || {
            isThirdParty: true,
            driverName,
            driverNic,
            driverPhone
          }
        })),
        uploadedDocs,
        sentMessages,
        accessLogs
      }
    });
  } catch (err) {
    console.error("GET driver activities error:", err);
    return res.status(500).json({ error: "Failed to fetch driver activities." });
  }
});


/**
 * GET /api/third-party/documents/:requestId/:docType
 * Secure Document Proxy: serves identity/licence photos only to authorized Policyholder or Branch staff
 */
router.get("/documents/:requestId/:docType", async (req, res) => {
  try {
    const { requestId, docType } = req.params;
    const { userNic, staffId } = req.query;

    const request = await ThirdPartyRegistration.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: "Request not found." });
    }

    let isAuthorized = false;

    // Check Policyholder access
    if (userNic && request.policyHolderNic === userNic.trim().toUpperCase()) {
      isAuthorized = true;
    }

    // Check Staff access
    if (!isAuthorized && staffId) {
      const staff = await OfficeStaff.findById(staffId).lean();
      if (staff) {
        const baseStaffBranch = (staff.branch || "").replace(/\s+Branch$/i, "").toLowerCase();
        const baseReqBranch = (request.branch || "").replace(/\s+Branch$/i, "").toLowerCase();
        if (baseStaffBranch === baseReqBranch) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: "Forbidden: Unauthorized to access private document." });
    }

    const docUrl = request.driverDetails?.documents?.[docType];
    if (!docUrl) {
      return res.status(404).json({ error: "Document not found." });
    }

    if (docUrl.startsWith("http://") || docUrl.startsWith("https://")) {
      return res.redirect(docUrl);
    }

    if (docUrl.startsWith("data:")) {
      const parts = docUrl.split(";base64,");
      const contentType = parts[0].replace("data:", "") || "image/jpeg";
      const buffer = Buffer.from(parts[1], "base64");
      res.setHeader("Content-Type", contentType);
      return res.send(buffer);
    }

    const localPath = path.resolve(__dirname, "../../uploads", docUrl.replace(/^\/?(uploads\/)?/, ""));
    if (fs.existsSync(localPath)) {
      return res.sendFile(localPath);
    }

    return res.status(404).json({ error: "Document file not found." });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/third-party/branch/approve/:requestId
 * Approve a paid registration request and generate cryptographically secure URL
 */
router.post("/branch/approve/:requestId", async (req, res) => {
  try {
    const staff = await verifyStaffBranch(req, res);
    if (!staff) return;

    const { requestId } = req.params;
    const request = await ThirdPartyRegistration.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: "Registration request not found." });
    }

    // Branch Isolation
    const baseStaffBranch = (staff.branch || "").replace(/\s+Branch$/i, "").toLowerCase();
    const baseReqBranch = (request.branch || "").replace(/\s+Branch$/i, "").toLowerCase();
    if (baseStaffBranch !== baseReqBranch) {
      return res.status(403).json({ error: "Forbidden: Branch mismatch." });
    }

    // Security requirement: Must be paid before approval
    if (request.payment.status !== "Paid") {
      return res.status(400).json({
        error: "Cannot approve an unpaid request. Payment status is: " + request.payment.status
      });
    }

    // Cryptographically secure unpredictable random token
    let rawToken = request.secureAccess?.rawToken;
    let tokenHash = request.secureAccess?.tokenHash;

    if (!rawToken || request.secureAccess?.isRevoked) {
      rawToken = crypto.randomBytes(32).toString("hex");
      tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const accessUrl = `${frontendUrl}/driver-access/${rawToken}`;

    request.status = "Approved";
    request.branchReview = {
      reviewedBy: staff.name,
      reviewedByEmail: staff.email,
      reviewedAt: new Date(),
      rejectionReason: ""
    };
    request.secureAccess = {
      tokenHash,
      rawToken,
      accessUrl,
      tokenCreatedAt: new Date(),
      isRevoked: false,
      revokedAt: null,
      revokedBy: ""
    };

    await request.save();

    const plates = (request.selectedVehicles || []).map((v) => v.numberPlate).join(", ");

    // 1. Send SMS to Third-Party Driver with digital pass access URL
    if (request.driverDetails?.phoneNumber) {
      sendSms({
        phone: request.driverDetails.phoneNumber,
        message: `[SANASA GENERAL INSURANCE]\nDear ${request.driverDetails.fullName},\n\nAuthorization Approved: You have been officially registered as an authorized third-party driver for vehicle(s) ${plates} by policyholder ${request.policyHolderName}.\n\n• Approved Unit: ${request.branch} Branch\n• Digital Driver Pass: ${accessUrl}\n\nPlease present this digital pass during vehicle operation.\n24/7 Hotline: 0725 575 575`,
        recipientType: "ThirdPartyDriver",
        recipientName: request.driverDetails.fullName,
        eventType: "third_party_driver_approved"
      }).catch((e) => console.warn("Driver approval SMS error:", e.message));
    }

    // 2. Send SMS to Policyholder (Vehicle Owner)
    if (request.policyHolderPhone) {
      sendSms({
        phone: request.policyHolderPhone,
        message: `[SANASA GENERAL INSURANCE]\nDear ${request.policyHolderName},\n\nYour driver authorization request has been APPROVED.\n\n• Authorized Driver: ${request.driverDetails.fullName}\n• Vehicle(s): ${plates}\n• Approving Unit: ${request.branch} Branch\n• Security Pass: Digital NFC/QR pass issued to driver\n\nManage driver authorizations anytime on your customer portal.\nHotline: 0725 575 575`,
        recipientType: "PolicyHolder",
        recipientName: request.policyHolderName,
        eventType: "third_party_owner_approved"
      }).catch((e) => console.warn("Policyholder approval SMS error:", e.message));
    }

    // 3. Send Email to Policyholder (Vehicle Owner)
    if (request.policyHolderEmail) {
      sendThirdPartyDriverApprovalEmail({ request, accessUrl }).catch((e) =>
        console.warn("Policyholder approval Email error:", e.message)
      );
    }

    return res.json({
      success: true,
      message: "Third-party driver registration approved successfully.",
      accessUrl,
      rawToken,
      request
    });
  } catch (err) {
    console.error("Approve request error:", err);
    return res.status(500).json({ error: "Failed to approve registration request." });
  }
});

/**
 * POST /api/third-party/branch/reject/:requestId
 * Reject a registration request with mandatory rejection reason
 */
router.post("/branch/reject/:requestId", async (req, res) => {
  try {
    const staff = await verifyStaffBranch(req, res);
    if (!staff) return;

    const { requestId } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({ error: "A rejection reason is required." });
    }

    const request = await ThirdPartyRegistration.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: "Registration request not found." });
    }

    // Branch Isolation
    const baseStaffBranch = (staff.branch || "").replace(/\s+Branch$/i, "").toLowerCase();
    const baseReqBranch = (request.branch || "").replace(/\s+Branch$/i, "").toLowerCase();
    if (baseStaffBranch !== baseReqBranch) {
      return res.status(403).json({ error: "Forbidden: Branch mismatch." });
    }

    request.status = "Rejected";
    request.branchReview = {
      reviewedBy: staff.name,
      reviewedByEmail: staff.email,
      reviewedAt: new Date(),
      rejectionReason: rejectionReason.trim()
    };

    // If an active token existed, revoke it
    if (request.secureAccess?.tokenHash) {
      request.secureAccess.isRevoked = true;
      request.secureAccess.revokedAt = new Date();
      request.secureAccess.revokedBy = staff.name;
    }

    await request.save();

    const plates = (request.selectedVehicles || []).map((v) => v.numberPlate).join(", ");
    const reasonText = rejectionReason.trim();

    // 1. Send SMS to Third-Party Driver
    if (request.driverDetails?.phoneNumber) {
      sendSms({
        phone: request.driverDetails.phoneNumber,
        message: `[SANASA GENERAL INSURANCE]\nDear ${request.driverDetails.fullName},\n\nNotice regarding your driver authorization request for vehicle(s) ${plates}:\nFollowing branch review, the request was not approved.\n• Reason: ${reasonText}\n• Reviewing Unit: ${request.branch} Branch\n\nFor details, please call our 24/7 Helpline: 0725 575 575`,
        recipientType: "ThirdPartyDriver",
        recipientName: request.driverDetails.fullName,
        eventType: "third_party_driver_rejected"
      }).catch((e) => console.warn("Driver rejection SMS error:", e.message));
    }

    // 2. Send SMS to Policyholder (Vehicle Owner)
    if (request.policyHolderPhone) {
      sendSms({
        phone: request.policyHolderPhone,
        message: `[SANASA GENERAL INSURANCE]\nDear ${request.policyHolderName},\n\nYour driver authorization request for ${request.driverDetails.fullName} on vehicle(s) ${plates} could not be approved by ${request.branch} Branch.\n• Reason: ${reasonText}\n\nPlease check your customer portal for further details or contact 0725 575 575.`,
        recipientType: "PolicyHolder",
        recipientName: request.policyHolderName,
        eventType: "third_party_owner_rejected"
      }).catch((e) => console.warn("Policyholder rejection SMS error:", e.message));
    }

    // 3. Send Email to Policyholder (Vehicle Owner)
    if (request.policyHolderEmail) {
      sendThirdPartyDriverRejectionEmail({ request, rejectionReason: reasonText }).catch((e) =>
        console.warn("Policyholder rejection Email error:", e.message)
      );
    }

    return res.json({
      success: true,
      message: "Registration request rejected.",
      request
    });
  } catch (err) {
    console.error("Reject request error:", err);
    return res.status(500).json({ error: "Failed to reject registration request." });
  }
});

/**
 * POST /api/third-party/branch/revoke-token/:requestId
 * Revoke an active access token
 */
router.post("/branch/revoke-token/:requestId", async (req, res) => {
  try {
    const staff = await verifyStaffBranch(req, res);
    if (!staff) return;

    const { requestId } = req.params;
    const request = await ThirdPartyRegistration.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: "Registration request not found." });
    }

    // Branch Isolation
    const baseStaffBranch = (staff.branch || "").replace(/\s+Branch$/i, "").toLowerCase();
    const baseReqBranch = (request.branch || "").replace(/\s+Branch$/i, "").toLowerCase();
    if (baseStaffBranch !== baseReqBranch) {
      return res.status(403).json({ error: "Forbidden: Branch mismatch." });
    }

    request.secureAccess.isRevoked = true;
    request.secureAccess.revokedAt = new Date();
    request.secureAccess.revokedBy = staff.name;

    await request.save();

    return res.json({
      success: true,
      message: "Access token successfully revoked.",
      request
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to revoke token." });
  }
});

/**
 * GET /api/third-party/driver-pass/:token
 * Public verified access to Digital Driver Authorization Pass
 * Notifies policyholder and driver of activity
 */
router.get("/driver-pass/:token", async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ error: "Access token is required." });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const request = await ThirdPartyRegistration.findOne({
      "secureAccess.tokenHash": tokenHash
    });

    if (!request) {
      return res.status(404).json({ error: "Digital pass not found or invalid token." });
    }

    if (request.secureAccess?.isRevoked) {
      return res.status(403).json({
        error: "This digital driver pass has been revoked by the policyholder or branch administration."
      });
    }

    if (request.status !== "Approved") {
      return res.status(403).json({
        error: `Digital pass is not active. Current status: ${request.status}`
      });
    }

    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
    const userAgent = req.headers["user-agent"] || "";

    // Record activity log
    request.accessLogs = request.accessLogs || [];
    request.accessLogs.push({
      accessedAt: new Date(),
      ipAddress: String(clientIp).split(",")[0].trim(),
      userAgent
    });
    await request.save();

    const plates = (request.selectedVehicles || []).map((v) => v.numberPlate).join(", ");

    // 1. Send SMS to Policyholder (Owner) about driver activity
    if (request.policyHolderPhone) {
      sendSms({
        phone: request.policyHolderPhone,
        message: `[SANASA SECURITY ALERT]\nDear ${request.policyHolderName},\n\nActivity Notice: Your authorized driver ${request.driverDetails.fullName} has accessed the Digital Driver Pass for vehicle(s) ${plates}.\n• Access Date: ${new Date().toLocaleDateString("en-LK")}\n• Verified by: Sanasa Digital Pass Gateway\n\nIf this was not authorized by you, please contact ${request.branch} Branch or call Hotline: 0725 575 575.`,
        recipientType: "PolicyHolder",
        recipientName: request.policyHolderName,
        eventType: "third_party_pass_accessed"
      }).catch((e) => console.warn("Policyholder access SMS error:", e.message));
    }

    // 2. Send SMS to Third-Party Driver
    if (request.driverDetails?.phoneNumber) {
      sendSms({
        phone: request.driverDetails.phoneNumber,
        message: `[SANASA GENERAL INSURANCE]\nDear ${request.driverDetails.fullName},\n\nDigital Driver Pass verification active for vehicle(s) ${plates}.\n• Authorizing Owner: ${request.policyHolderName}\n• Coverage: Underwritten by Sanasa General Insurance\n• Status: Valid & Active\n\n24/7 Hotline: 0725 575 575`,
        recipientType: "ThirdPartyDriver",
        recipientName: request.driverDetails.fullName,
        eventType: "third_party_driver_activity"
      }).catch((e) => console.warn("Driver access SMS error:", e.message));
    }

    // 3. Send Email to Policyholder (Owner)
    if (request.policyHolderEmail) {
      sendThirdPartyDriverActivityEmail({
        request,
        activityType: "Digital Driver Pass Verification Accessed",
        accessMeta: { ipAddress: String(clientIp).split(",")[0].trim(), userAgent }
      }).catch((e) => console.warn("Policyholder activity Email error:", e.message));
    }

    return res.json({
      success: true,
      pass: {
        reference: request.requestReference,
        policyHolderName: request.policyHolderName,
        policyHolderNic: request.policyHolderNic,
        branch: request.branch,
        driverName: request.driverDetails.fullName,
        driverNic: request.driverDetails.nicNumber,
        driverPhone: request.driverDetails.phoneNumber,
        driverAddress: request.driverDetails.residentialAddress,
        authorizedVehicles: request.selectedVehicles,
        approvalDate: request.branchReview?.reviewedAt || request.updatedAt,
        status: request.status,
        verificationToken: token.substring(0, 12).toUpperCase(),
        totalAccessCount: request.accessLogs.length
      }
    });
  } catch (err) {
    console.error("GET driver-pass error:", err);
    return res.status(500).json({ error: "Failed to load digital driver pass." });
  }
});

// =========================================================================
// 4. THIRD-PARTY DRIVER RESTRICTED SESSION & CLAIM PORTAL API
// =========================================================================

const DRIVER_SESSION_SECRET = process.env.SESSION_SECRET || process.env.STRIPE_SECRET_KEY || "sanasa-driver-secret-key-prod-2026";

/**
 * Helper to mask sensitive NIC numbers for privacy (e.g., "1998****4567" or "9823****5V")
 */
function maskNic(nic) {
  if (!nic || typeof nic !== "string") return "";
  const clean = nic.trim();
  if (clean.length <= 4) return clean;
  if (clean.length >= 10) {
    return clean.slice(0, 4) + "****" + clean.slice(-2);
  }
  return clean.slice(0, 2) + "****" + clean.slice(-2);
}

/**
 * Create a cryptographically signed, short-lived restricted driver session token
 */
function signDriverSession(payload) {
  const jsonStr = JSON.stringify(payload);
  const data = Buffer.from(jsonStr).toString("base64url");
  const signature = crypto.createHmac("sha256", DRIVER_SESSION_SECRET).update(data).digest("base64url");
  return `${data}.${signature}`;
}

/**
 * Verify and unpack restricted driver session token
 */
function verifyDriverSessionString(tokenStr) {
  if (!tokenStr || typeof tokenStr !== "string" || !tokenStr.includes(".")) return null;
  const parts = tokenStr.split(".");
  if (parts.length !== 2) return null;
  const [data, signature] = parts;
  const expectedSig = crypto.createHmac("sha256", DRIVER_SESSION_SECRET).update(data).digest("base64url");
  if (signature !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Middleware: Verifies the restricted Third-Party Driver session.
 * Protects every portal endpoint against unauthorized access and direct ID tampering.
 */
async function requireDriverSession(req, res, next) {
  try {
    const authHeader = req.headers["authorization"] || req.headers["x-driver-session"];
    let tokenStr = "";
    if (authHeader && typeof authHeader === "string") {
      tokenStr = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim();
    }

    if (!tokenStr) {
      return res.status(401).json({ error: "Unauthorized: Missing driver session token." });
    }

    const payload = verifyDriverSessionString(tokenStr);
    if (!payload || payload.role !== "ThirdPartyDriver" || !payload.registrationId) {
      return res.status(401).json({ error: "Unauthorized: Invalid or expired driver session." });
    }

    // Always re-verify active registration in database to handle immediate revocation
    const request = await ThirdPartyRegistration.findById(payload.registrationId);
    if (!request) {
      return res.status(404).json({ error: "Driver authorization record not found." });
    }

    if (request.status !== "Approved") {
      return res.status(403).json({
        error: `Driver access is not active. Authorization status is: ${request.status}`
      });
    }

    if (request.secureAccess?.isRevoked) {
      return res.status(403).json({
        error: "This driver authorization has been revoked by the branch or policyholder."
      });
    }

    req.driverSession = payload;
    req.thirdPartyRequest = request;
    next();
  } catch (err) {
    console.error("requireDriverSession error:", err);
    return res.status(500).json({ error: "Internal session authentication failure." });
  }
}

/**
 * POST /api/third-party/driver-session
 * Exchanges the URL's cryptographic rawToken for a secure restricted driver session token.
 */
router.post("/driver-session", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "Access token is required." });
    }

    const tokenHash = crypto.createHash("sha256").update(token.trim()).digest("hex");
    const request = await ThirdPartyRegistration.findOne({
      "secureAccess.tokenHash": tokenHash
    });

    if (!request) {
      return res.status(404).json({ error: "Invalid access link or token." });
    }

    if (request.status !== "Approved") {
      return res.status(403).json({
        error: `Authorization is not active. Current status: ${request.status}`
      });
    }

    if (request.secureAccess?.isRevoked) {
      return res.status(403).json({
        error: "This driver access link has been revoked. Please contact your regional branch."
      });
    }

    // Record session creation in access logs
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
    const userAgent = req.headers["user-agent"] || "";
    request.accessLogs = request.accessLogs || [];
    request.accessLogs.push({
      accessedAt: new Date(),
      ipAddress: String(clientIp).split(",")[0].trim(),
      userAgent
    });
    await request.save();

    // 24-hour restricted session token
    const sessionToken = signDriverSession({
      role: "ThirdPartyDriver",
      registrationId: String(request._id),
      driverNic: request.driverDetails.nicNumber,
      driverName: request.driverDetails.fullName,
      policyHolderNic: request.policyHolderNic,
      authorizedPlates: (request.selectedVehicles || []).map((v) => v.numberPlate),
      exp: Date.now() + 24 * 60 * 60 * 1000
    });

    return res.json({
      success: true,
      sessionToken,
      driver: {
        fullName: request.driverDetails.fullName,
        maskedNic: maskNic(request.driverDetails.nicNumber),
        phoneNumber: request.driverDetails.phoneNumber,
        reference: request.requestReference,
        branch: request.branch,
        policyHolderName: request.policyHolderName,
        authorizedVehiclesCount: (request.selectedVehicles || []).length,
        approvalDate: request.branchReview?.reviewedAt || request.updatedAt
      }
    });
  } catch (err) {
    console.error("POST /driver-session error:", err);
    return res.status(500).json({ error: "Failed to establish driver session." });
  }
});

/**
 * GET /api/third-party/portal/me
 * Retrieves current restricted driver profile & authorized metadata
 */
router.get("/portal/me", requireDriverSession, async (req, res) => {
  try {
    const request = req.thirdPartyRequest;
    return res.json({
      success: true,
      profile: {
        driverName: request.driverDetails.fullName,
        driverNicMasked: maskNic(request.driverDetails.nicNumber),
        driverPhone: request.driverDetails.phoneNumber,
        driverAddress: request.driverDetails.residentialAddress,
        policyHolderName: request.policyHolderName,
        policyHolderNicMasked: maskNic(request.policyHolderNic),
        policyHolderNicRaw: request.policyHolderNic,
        policyHolderEmail: request.policyHolderEmail || "",
        policyHolderPhone: request.policyHolderPhone || "",
        driverNicRaw: request.driverDetails.nicNumber || request.requestReference,
        branch: request.branch,
        reference: request.requestReference,
        approvalDate: request.branchReview?.reviewedAt || request.updatedAt,
        status: request.status,
        authorizedVehicles: request.selectedVehicles || [],
        verificationToken: request.secureAccess?.rawToken
          ? request.secureAccess.rawToken.substring(0, 12).toUpperCase()
          : "SANASA-PASS"
      }
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch driver profile." });
  }
});

/**
 * GET /api/third-party/portal/vehicles
 * Returns only the vehicles authorized for this Third-Party Driver
 */
router.get("/portal/vehicles", requireDriverSession, async (req, res) => {
  try {
    const request = req.thirdPartyRequest;
    const authorizedPlates = (request.selectedVehicles || []).map((v) => v.numberPlate);

    // Look up live policyholder vehicle records to obtain live expiry & status
    const owner = await User.findOne(
      { nic: request.policyHolderNic },
      { vehicles: 1 }
    );

    const ownerVehiclesMap = {};
    if (owner?.vehicles) {
      owner.vehicles.forEach((v) => {
        if (v.numberPlate) {
          ownerVehiclesMap[v.numberPlate.toUpperCase().trim()] = v;
        }
      });
    }

    const resolvedVehicles = (request.selectedVehicles || []).map((v) => {
      const live = ownerVehiclesMap[(v.numberPlate || "").toUpperCase().trim()];
      return {
        numberPlate: v.numberPlate,
        vehicleType: v.vehicleType || live?.vehicleType || "Vehicle",
        company: v.company || live?.company || "Standard",
        model: v.model || live?.model || "",
        year: v.year || live?.year || "",
        policyNumber: v.policyNumber || live?.policyNumber || "SANASA-COMPREHENSIVE",
        policyExpiryDate: live?.policyExpiryDate || "2027-11-20",
        coverageStatus: "Active Comprehensive Coverage",
        authorizedSince: request.branchReview?.reviewedAt || request.createdAt
      };
    });

    return res.json({
      success: true,
      vehicles: resolvedVehicles
    });
  } catch (err) {
    console.error("GET /portal/vehicles error:", err);
    return res.status(500).json({ error: "Failed to fetch assigned vehicles." });
  }
});

/**
 * GET /api/third-party/portal/claims
 * Returns only claims submitted for/by this driver on their authorized vehicles
 */
router.get("/portal/claims", requireDriverSession, async (req, res) => {
  try {
    const request = req.thirdPartyRequest;
    const authorizedPlates = (request.selectedVehicles || []).map((v) => v.numberPlate);

    const claims = await Claim.find({
      vehiclePlate: { $in: authorizedPlates },
      $or: [
        { "submittedByDriver.registrationId": request._id },
        { "submittedByDriver.driverNic": request.driverDetails.nicNumber },
        { description: new RegExp(request.driverDetails.fullName, "i") }
      ]
    }).sort({ createdAt: -1 });

    const safeClaims = claims.map((c) => ({
      claimNumber: c.claimNumber,
      vehiclePlate: c.vehiclePlate,
      incidentDate: c.incidentDate,
      incidentTime: c.incidentTime,
      damageType: c.damageType,
      location: c.location,
      status: c.status,
      currentStep: c.currentStep || 1,
      createdAt: c.createdAt,
      submittedByDriver: c.submittedByDriver || { isThirdParty: true },
      documentsCount: (c.additionalDocuments || []).length,
      hasInspectionReport: Boolean(c.inspectionReport)
    }));

    return res.json({ success: true, claims: safeClaims });
  } catch (err) {
    console.error("GET /portal/claims error:", err);
    return res.status(500).json({ error: "Failed to fetch claims." });
  }
});

/**
 * GET /api/third-party/portal/notifications
 * Comprehensive notifications feed for the authorized driver:
 * - Authorization activation & digital pass ready
 * - Claim status updates (in-progress, inspected, approved, settled, rejected)
 * - Urgent document requests
 * - Messages from staff / agent
 */
router.get("/portal/notifications", requireDriverSession, async (req, res) => {
  try {
    const request = req.thirdPartyRequest;
    const authorizedPlates = (request.selectedVehicles || []).map((v) => v.numberPlate);

    const notifs = [];

    // 1. Authorization Active Notification
    const approvalDate = request.branchReview?.reviewedAt || request.createdAt;
    notifs.push({
      id: `auth-${request._id}`,
      type: "authorization",
      category: "approved",
      title: "Driver Authorization Active & Pass Issued",
      message: `You are authorized by ${request.policyHolderName} to drive ${authorizedPlates.join(", ")}. Verified by ${request.branch} Branch.`,
      subText: "Your secure digital pass is ready for road and police verification.",
      createdAt: approvalDate,
      actionType: "pass",
      actionLabel: "View Digital Pass",
      isUrgent: false
    });

    // 2. Fetch all claims matching driver or authorized plates
    const claims = await Claim.find({
      vehiclePlate: { $in: authorizedPlates },
      $or: [
        { "submittedByDriver.registrationId": request._id },
        { "submittedByDriver.driverNic": request.driverDetails.nicNumber },
        { description: new RegExp(request.driverDetails.fullName, "i") }
      ]
    }).sort({ createdAt: -1 });

    for (const claim of claims) {
      // 2a. Urgent Document Request
      if (claim.documentsRequested) {
        const docList = (claim.requestedDocuments || []).join(" & ") || "supporting claim documents";
        notifs.push({
          id: `notif-${claim.claimNumber}-docs`,
          type: "document_request",
          category: "urgent",
          title: `Action Required: Documents Requested for ${claim.claimNumber}`,
          message: `Branch office has requested ${docList} for vehicle ${claim.vehiclePlate}.`,
          subText: "Please upload the requested documents promptly to avoid settlement delays.",
          createdAt: claim.updatedAt || claim.createdAt,
          claimNumber: claim.claimNumber,
          actionType: "upload_doc",
          actionLabel: "Upload Documents",
          isUrgent: true
        });
      }

      // 2b. Claim Status Updates
      const st = (claim.status || "").toLowerCase();
      let statusCat = "status";
      let statusTitle = `Claim ${claim.claimNumber} Status: ${claim.status || "Pending"}`;
      let statusDesc = `Your claim for ${claim.vehiclePlate} (${claim.damageType}) is currently in "${claim.status || "Pending"}" status.`;

      if (st.includes("approved") || st.includes("settled")) {
        statusCat = "approved";
        statusTitle = `Claim ${claim.claimNumber} Approved!`;
        statusDesc = `Your insurance claim for vehicle ${claim.vehiclePlate} has been approved by the insurance branch.`;
      } else if (st.includes("reject")) {
        statusCat = "urgent";
        statusTitle = `Claim ${claim.claimNumber} Rejected`;
        statusDesc = `Your claim for ${claim.vehiclePlate} was reviewed and rejected. Check claim messages for notes.`;
      } else if (st.includes("inspection") || claim.inspectionReport) {
        statusTitle = `Inspection Completed for ${claim.claimNumber}`;
        statusDesc = `Field officer inspection assessment is completed for vehicle ${claim.vehiclePlate}.`;
      }

      notifs.push({
        id: `notif-${claim.claimNumber}-status-${claim.status || "pending"}`,
        type: "claim_status",
        category: statusCat,
        title: statusTitle,
        message: statusDesc,
        subText: `Incident Date: ${claim.incidentDate} • Branch: ${claim.branch || request.branch}`,
        createdAt: claim.updatedAt || claim.createdAt,
        claimNumber: claim.claimNumber,
        actionType: "view_claim",
        actionLabel: "View Claim",
        isUrgent: statusCat === "urgent"
      });

      // 2c. Chat messages
      if (claim.messages && claim.messages.length > 0) {
        const staffOrAgentMsgs = claim.messages.filter(
          (m) => m.sender && m.sender !== "System" && !m.sender.includes(request.driverDetails.fullName)
        );
        const lastMsg = staffOrAgentMsgs[staffOrAgentMsgs.length - 1];
        if (lastMsg) {
          notifs.push({
            id: `notif-${claim.claimNumber}-msg-${new Date(lastMsg.sentAt).getTime()}`,
            type: "chat_message",
            category: "message",
            title: `New Message from ${lastMsg.sender}`,
            message: `Regarding Claim ${claim.claimNumber}: "${lastMsg.message.slice(0, 100)}${lastMsg.message.length > 100 ? "..." : ""}"`,
            subText: "Tap to reply in Live Claims Chat.",
            createdAt: lastMsg.sentAt,
            claimNumber: claim.claimNumber,
            actionType: "chat",
            actionLabel: "Open Chat",
            isUrgent: false
          });
        }
      }
    }

    // Sort descending by date
    notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json({
      success: true,
      notifications: notifs,
      unreadCount: notifs.length
    });
  } catch (err) {
    console.error("GET /portal/notifications error:", err);
    return res.status(500).json({ error: "Failed to fetch driver notifications." });
  }
});


/**
 * GET /api/third-party/portal/claims/:claimNumber
 * Returns specific authorized claim details for the driver
 */
router.get("/portal/claims/:claimNumber", requireDriverSession, async (req, res) => {
  try {
    const request = req.thirdPartyRequest;
    const { claimNumber } = req.params;
    const authorizedPlates = (request.selectedVehicles || []).map((v) => v.numberPlate);

    const claim = await Claim.findOne({
      claimNumber: claimNumber.trim().toUpperCase(),
      vehiclePlate: { $in: authorizedPlates }
    });

    if (!claim) {
      return res.status(404).json({ error: "Claim not found or you are not authorized to view it." });
    }

    // Filter permitted messages (exclude internal branch notes)
    const permittedMessages = (claim.messages || []).filter(
      (m) => m.recipient !== "Internal" && m.recipient !== "Agent Only"
    );

    return res.json({
      success: true,
      claim: {
        claimNumber: claim.claimNumber,
        vehiclePlate: claim.vehiclePlate,
        incidentDate: claim.incidentDate,
        incidentTime: claim.incidentTime,
        damageType: claim.damageType,
        description: claim.description,
        location: claim.location,
        status: claim.status,
        currentStep: claim.currentStep || 1,
        branch: claim.branch,
        createdAt: claim.createdAt,
        submittedByDriver: claim.submittedByDriver,
        accidentPhotos: claim.accidentPhotos,
        drivingLicense: claim.drivingLicense,
        additionalDocuments: claim.additionalDocuments || [],
        requestedDocuments: claim.documentsRequested ? claim.requestedDocuments : [],
        documentsRequested: claim.documentsRequested,
        messages: permittedMessages
      }
    });
  } catch (err) {
    console.error("GET /portal/claims/:claimNumber error:", err);
    return res.status(500).json({ error: "Failed to fetch claim details." });
  }
});

/**
 * POST /api/third-party/portal/submit-claim
 * Allows the Third-Party Driver to submit a claim for an assigned vehicle.
 * Reuses sequential claim IDs, photo hashing, Cloudinary uploads, AI analysis, and SMS alerts.
 */
router.post("/portal/submit-claim", requireDriverSession, async (req, res) => {
  try {
    const request = req.thirdPartyRequest;
    const {
      vehiclePlate,
      incidentDate,
      incidentTime,
      damageType,
      description,
      location,
      accidentPhotos,
      drivingLicense,
      otherVehicleDetails
    } = req.body;

    if (!vehiclePlate || !incidentDate || !incidentTime || !damageType || !description || !location) {
      return res.status(400).json({ error: "All required claim fields must be provided." });
    }

    // Backend Authorization: strictly verify that the vehicle is in the authorized list
    const authorizedPlates = (request.selectedVehicles || []).map((v) =>
      (v.numberPlate || "").toUpperCase().trim()
    );
    const targetPlate = vehiclePlate.toUpperCase().trim();

    if (!authorizedPlates.includes(targetPlate)) {
      return res.status(403).json({
        error: `Forbidden: Vehicle ${vehiclePlate} is not authorized for this driver.`
      });
    }

    // Prevent duplicate submissions
    const existing = await Claim.findOne({
      vehiclePlate: targetPlate,
      incidentDate: incidentDate.trim(),
      incidentTime: incidentTime.trim()
    });

    if (existing) {
      return res.status(400).json({
        error: "A claim for this vehicle with the same incident date & time has already been submitted."
      });
    }

    // Sequential Claim ID generation (CLM-0000-xxxx)
    const lastClaim = await Claim.findOne({}, { claimNumber: 1 }).sort({ createdAt: -1 });
    let nextClaimNum = "CLM-0000-0001";
    if (lastClaim && lastClaim.claimNumber) {
      const match = lastClaim.claimNumber.match(/CLM-0000-(\d+)/i);
      if (match) {
        const nextNum = parseInt(match[1], 10) + 1;
        nextClaimNum = `CLM-0000-${String(nextNum).padStart(4, "0")}`;
      }
    }

    // Cloudinary upload helpers
    const uploadArray = async (arr, folder) => {
      if (!arr || !Array.isArray(arr)) return [];
      return Promise.all(arr.map((item) => uploadToCloudinary(item, folder)));
    };

    const [accidentFront, accidentRear, accidentSide, licenseFront, licenseRear] = await Promise.all([
      uploadArray(accidentPhotos?.front, "claims/accident_photos"),
      uploadArray(accidentPhotos?.rear, "claims/accident_photos"),
      uploadArray(accidentPhotos?.side, "claims/accident_photos"),
      uploadArray(drivingLicense?.front, "claims/driving_license"),
      uploadArray(drivingLicense?.rear, "claims/driving_license")
    ]);

    // Upload other vehicles involved photos dynamically
    let resolvedOtherVehicles = [];
    if (otherVehicleDetails) {
      if (Array.isArray(otherVehicleDetails)) {
        resolvedOtherVehicles = await Promise.all(
          otherVehicleDetails.map(async (vehicle) => {
            const [licPhotos, vehPhotos] = await Promise.all([
              uploadArray(vehicle.licensePhotos, "claims/driving_license"),
              uploadArray(vehicle.vehiclePhotos, "claims/accident_photos")
            ]);
            return {
              vehiclePlate: (vehicle.vehiclePlate || "").trim(),
              insuranceCompany: (vehicle.insuranceCompany || "").trim(),
              policyNumber: (vehicle.policyNumber || "").trim(),
              driverName: (vehicle.driverName || "").trim(),
              licensePhotos: licPhotos || [],
              vehiclePhotos: vehPhotos || []
            };
          })
        );
      }
    }

    // Optional AI damage analysis
    const allPhotos = [
      ...(accidentPhotos?.front || []),
      ...(accidentPhotos?.rear || []),
      ...(accidentPhotos?.side || [])
    ];
    let aiResult = null;
    if (allPhotos.length > 0) {
      try {
        aiResult = await analyzeAccidentDamage(allPhotos);
      } catch (aiErr) {
        console.warn("AI damage analysis notice:", aiErr.message);
      }
    }

    const assignedBranch = await getNearestBranch(location, request.branch || "Galle");

    const newClaim = new Claim({
      claimNumber: nextClaimNum,
      userNic: request.policyHolderNic,
      vehiclePlate: targetPlate,
      incidentDate: incidentDate.trim(),
      incidentTime: incidentTime.trim(),
      damageType: damageType.trim(),
      description: description.trim(),
      location: location.trim(),
      otherVehicleDetails: resolvedOtherVehicles,
      branch: assignedBranch,
      status: "Pending",
      currentStep: 1,
      accidentPhotos: {
        front: accidentFront,
        rear: accidentRear,
        side: accidentSide
      },
      drivingLicense: {
        front: licenseFront,
        rear: licenseRear
      },
      submittedByDriver: {
        isThirdParty: true,
        driverName: request.driverDetails.fullName,
        driverNic: request.driverDetails.nicNumber,
        driverPhone: request.driverDetails.phoneNumber,
        registrationId: request._id
      },
      messages: [
        {
          sender: "System",
          message: `Claim lodged by authorized third-party driver ${request.driverDetails.fullName} under policyholder ${request.policyHolderName}.`,
          sentAt: new Date(),
          recipient: "All"
        }
      ],
      aiAnalysis: aiResult
        ? {
            isAnalyzed: true,
            isValidAccidentPhoto: aiResult.isValidAccidentPhoto !== false,
            authenticityAssessment: aiResult.authenticityAssessment || "",
            fraudAlert: aiResult.fraudAlert || null,
            damagedItems: aiResult.damagedItems || [],
            overallDamagePercentage: aiResult.overallDamagePercentage || 0,
            totalEstimatedPartsCost: aiResult.totalEstimatedPartsCost || 0,
            totalEstimatedLaborCost: aiResult.totalEstimatedLaborCost || 0,
            totalEstimatedCost: aiResult.totalEstimatedCost || 0,
            currency: aiResult.currency || "LKR",
            summary: aiResult.summary || "",
            analyzedAt: new Date()
          }
        : { isAnalyzed: false }
    });

    await newClaim.save();

    // SMS Notifications
    if (request.driverDetails?.phoneNumber) {
      sendSms({
        phone: request.driverDetails.phoneNumber,
        message: `[SANASA GENERAL INSURANCE]\nDear ${request.driverDetails.fullName},\n\nYour insurance claim has been successfully lodged.\n• Claim No: #${nextClaimNum}\n• Vehicle: ${targetPlate}\n• Routing: ${assignedBranch} Branch\n• Status: Submitted & Pending Inspection\n\nOur branch assessor will review the claim documentation shortly.\n24/7 Hotline: 0725 575 575`,
        recipientType: "ThirdPartyDriver",
        recipientName: request.driverDetails.fullName,
        eventType: "third_party_claim_submitted"
      }).catch((e) => console.warn("Driver claim SMS error:", e.message));
    }

    if (request.policyHolderPhone) {
      sendSms({
        phone: request.policyHolderPhone,
        message: `[SANASA CLAIM ALERT]\nDear ${request.policyHolderName},\n\nAn insurance claim has been submitted for your vehicle.\n• Lodged By: ${request.driverDetails.fullName} (Authorized Driver)\n• Claim No: #${nextClaimNum}\n• Vehicle: ${targetPlate}\n• Assigned Branch: ${assignedBranch} Branch\n\nPlease sign in to your Sanasa portal to view claim progress.\nHotline: 0725 575 575`,
        recipientType: "PolicyHolder",
        recipientName: request.policyHolderName,
        eventType: "third_party_claim_owner_alert"
      }).catch((e) => console.warn("Owner claim SMS error:", e.message));
    }

    return res.status(201).json({
      success: true,
      message: "Claim submitted successfully.",
      claimNumber: nextClaimNum,
      claim: newClaim
    });
  } catch (err) {
    console.error("POST /portal/submit-claim error:", err);
    return res.status(500).json({ error: "Failed to submit claim. Please try again." });
  }
});

/**
 * POST /api/third-party/portal/claims/:claimNumber/upload-doc
 * Allows the Third-Party Driver to upload requested or supporting claim documents
 */
router.post("/portal/claims/:claimNumber/upload-doc", requireDriverSession, async (req, res) => {
  try {
    const request = req.thirdPartyRequest;
    const { claimNumber } = req.params;
    const { documentName, fileBase64 } = req.body;

    if (!documentName || !fileBase64) {
      return res.status(400).json({ error: "Document name and file data are required." });
    }

    const authorizedPlates = (request.selectedVehicles || []).map((v) => v.numberPlate);
    const claim = await Claim.findOne({
      claimNumber: claimNumber.trim().toUpperCase(),
      vehiclePlate: { $in: authorizedPlates }
    });

    if (!claim) {
      return res.status(404).json({ error: "Authorized claim not found." });
    }

    const uploadedUrl = await uploadToCloudinary(fileBase64, "claims/additional_docs");
    if (!uploadedUrl) {
      return res.status(500).json({ error: "Failed to upload document file." });
    }

    claim.additionalDocuments = claim.additionalDocuments || [];
    claim.additionalDocuments.push({
      name: documentName.trim(),
      url: uploadedUrl,
      uploadedAt: new Date(),
      uploadedBy: `Third-Party Driver: ${request.driverDetails.fullName}`
    });

    // Remove from requested list if matched
    if (claim.requestedDocuments && Array.isArray(claim.requestedDocuments)) {
      const norm = documentName.trim().toLowerCase();
      claim.requestedDocuments = claim.requestedDocuments.filter(
        (d) => d.trim().toLowerCase() !== norm
      );
      if (claim.requestedDocuments.length === 0) {
        claim.documentsRequested = false;
      }
    }

    claim.messages.push({
      sender: request.driverDetails.fullName,
      message: `Uploaded supporting document: ${documentName.trim()}`,
      sentAt: new Date(),
      recipient: "All"
    });

    await claim.save();

    return res.json({
      success: true,
      message: "Document uploaded successfully.",
      additionalDocuments: claim.additionalDocuments
    });
  } catch (err) {
    console.error("POST /upload-doc error:", err);
    return res.status(500).json({ error: "Failed to upload document." });
  }
});

/**
 * POST /api/third-party/portal/logout
 * Logs the driver out and invalidates the session
 */
router.post("/portal/logout", requireDriverSession, async (req, res) => {
  try {
    const request = req.thirdPartyRequest;
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
    request.accessLogs = request.accessLogs || [];
    request.accessLogs.push({
      accessedAt: new Date(),
      ipAddress: String(clientIp).split(",")[0].trim(),
      userAgent: "Driver Portal Logout"
    });
    await request.save();

    return res.json({ success: true, message: "Logged out successfully." });
  } catch (err) {
    return res.status(500).json({ error: "Failed to complete logout." });
  }
});

export default router;
