import express from "express";
import crypto from "crypto";
import Stripe from "stripe";
import User from "../models/user.model.js";
import OfficeStaff from "../models/office_staff.model.js";
import ThirdPartyRegistration from "../models/third_party_registration.model.js";
import { uploadToCloudinary } from "../utils/upload.js";
import { normalizeSriLankanPhone } from "../services/smsService.js";

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
      success_url: `${frontendUrl}/Policy_Holder/ThirdParty?payment_success=true&session_id={CHECKOUT_SESSION_ID}&ref=${encodeURIComponent(
        registration.requestReference
      )}`,
      cancel_url: `${frontendUrl}/Policy_Holder/ThirdParty?payment_cancelled=true&ref=${encodeURIComponent(
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

export default router;
