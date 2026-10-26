import express from "express";
import Stripe from "stripe";
import PolicyRenewal from "../models/renewal.model.js";
import User from "../models/user.model.js";

const router = express.Router();

const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is missing from environment variables.");
  }
  return new Stripe(secretKey);
};

/**
 * Helper to compute or normalize a vehicle's policy expiry date.
 * If not explicitly saved, fallback to 1 year after user registration or upcoming 30 days.
 */
function getVehicleExpiryDate(vehicle, userCreatedAt) {
  if (vehicle.policyExpiryDate) {
    return new Date(vehicle.policyExpiryDate);
  }

  // If not explicitly set, default to an upcoming expiration date within 20-30 days
  // so registered vehicles accurately appear in the "Next 1.5 Months" renewal window
  const defaultUpcomingExpiry = new Date();
  defaultUpcomingExpiry.setDate(defaultUpcomingExpiry.getDate() + 25);
  return defaultUpcomingExpiry;
}

/**
 * 1. GET /api/renewals/branch-expiring-vehicles?branch=Galle&all=true
 * Returns branch vehicles expiring in the next 1.5 months (45 days)
 */
router.get("/branch-expiring-vehicles", async (req, res) => {
  try {
    const { branch, all } = req.query;
    if (!branch) {
      return res.status(400).json({ error: "Branch is required." });
    }

    const query = {
      branch: { $regex: new RegExp(`^${branch.trim()}$`, "i") },
      status: "Approved"
    };

    const users = await User.find(query).lean();
    const now = new Date();
    const fortyFiveDaysLater = new Date();
    fortyFiveDaysLater.setDate(now.getDate() + 45);

    const vehicleItems = [];

    for (const u of users) {
      if (!Array.isArray(u.vehicles)) continue;

      for (const v of u.vehicles) {
        if (v.status && v.status !== "Approved") continue;

        const expiryDate = getVehicleExpiryDate(v, u.createdAt);
        const timeDiff = expiryDate.getTime() - now.getTime();
        const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

        const isExpiringWithin1AndHalfMonths = daysRemaining >= -10 && daysRemaining <= 45;

        // If 'all' is not true, only return vehicles within next 45 days
        if (!all && !isExpiringWithin1AndHalfMonths) {
          continue;
        }

        // Check if there is an existing quote in PolicyRenewal
        const existingQuote = await PolicyRenewal.findOne({
          vehiclePlate: v.numberPlate
        })
          .sort({ createdAt: -1 })
          .lean();

        vehicleItems.push({
          owner: {
            id: u._id,
            name: `${u.firstName} ${u.lastName}`,
            nic: u.nic,
            mobile: u.mobile,
            email: u.email,
            address: u.address,
            city: u.city,
            branch: u.branch,
            referenceNumber: u.referenceNumber
          },
          vehicle: {
            ...v,
            calculatedExpiryDate: expiryDate,
            daysRemaining,
            isExpiringWithin1AndHalfMonths
          },
          renewalQuote: existingQuote || null
        });
      }
    }

    // Sort: most imminent expiration first
    vehicleItems.sort((a, b) => a.vehicle.daysRemaining - b.vehicle.daysRemaining);

    res.json({ success: true, count: vehicleItems.length, vehicles: vehicleItems });
  } catch (error) {
    console.error("Error fetching expiring vehicles:", error);
    res.status(500).json({ error: error.message || "Failed to fetch expiring vehicles." });
  }
});

/**
 * 2. POST /api/renewals/calculate-quote
 * Office staff calculates and saves renewal cost & installment structure
 */
router.post("/calculate-quote", async (req, res) => {
  try {
    const {
      nic,
      vehiclePlate,
      marketValuation = 5000000,
      basicPremiumRate = 1.5,
      basicPremium,
      noClaimBonusDiscount = 10,
      adminFee = 1500,
      govtTaxes = 0,
      allowInstallments = true,
      staffId = "",
      staffName = "Branch Staff",
      notes = ""
    } = req.body;

    if (!nic || !vehiclePlate) {
      return res.status(400).json({ error: "NIC and Vehicle Plate are required." });
    }

    const user = await User.findOne({ nic: nic.trim() });
    if (!user) {
      return res.status(404).json({ error: "Policy holder not found." });
    }

    const vehicle = user.vehicles.find(
      (v) => v.numberPlate?.toLowerCase().trim() === vehiclePlate.toLowerCase().trim()
    );
    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found under this user." });
    }

    const currentExpiry = req.body.customExpiryDate
      ? new Date(req.body.customExpiryDate)
      : getVehicleExpiryDate(vehicle, user.createdAt);
    const newExpiry = new Date(currentExpiry);
    newExpiry.setFullYear(newExpiry.getFullYear() + 1);

    // Cost calculations
    const computedBasicPremium = Number(basicPremium) || Math.round((Number(marketValuation) * Number(basicPremiumRate)) / 100);
    const discountAmount = Math.round((computedBasicPremium * Number(noClaimBonusDiscount)) / 100);
    const netPremium = Math.max(0, computedBasicPremium - discountAmount);
    const totalRenewalAmount = Math.round(netPremium + Number(govtTaxes) + Number(adminFee));

    // Build installment plans
    const allowedPaymentModes = [
      {
        planType: "One-Time",
        installmentsCount: 1,
        breakdown: [
          {
            installmentNumber: 1,
            label: "Full Payment (100%)",
            amount: totalRenewalAmount,
            dueOffsetMonths: 0
          }
        ]
      }
    ];

    if (allowInstallments) {
      // 2 Installments: 50% now, 50% in 6 months
      const part2 = Math.round(totalRenewalAmount / 2);
      allowedPaymentModes.push({
        planType: "2-Installments",
        installmentsCount: 2,
        breakdown: [
          {
            installmentNumber: 1,
            label: "1st Installment (50%)",
            amount: part2,
            dueOffsetMonths: 0
          },
          {
            installmentNumber: 2,
            label: "2nd Installment (50%)",
            amount: totalRenewalAmount - part2,
            dueOffsetMonths: 6
          }
        ]
      });

      // 4 Installments: 25% quarterly
      const part4 = Math.round(totalRenewalAmount / 4);
      allowedPaymentModes.push({
        planType: "4-Installments",
        installmentsCount: 4,
        breakdown: [
          { installmentNumber: 1, label: "1st Quarter (25%)", amount: part4, dueOffsetMonths: 0 },
          { installmentNumber: 2, label: "2nd Quarter (25%)", amount: part4, dueOffsetMonths: 3 },
          { installmentNumber: 3, label: "3rd Quarter (25%)", amount: part4, dueOffsetMonths: 6 },
          { installmentNumber: 4, label: "4th Quarter (25%)", amount: totalRenewalAmount - (part4 * 3), dueOffsetMonths: 9 }
        ]
      });
    }

    // Upsert or create PolicyRenewal
    let renewal = await PolicyRenewal.findOne({ vehiclePlate: vehicle.numberPlate });

    if (!renewal) {
      renewal = new PolicyRenewal({
        userId: user._id,
        nic: user.nic,
        ownerName: `${user.firstName} ${user.lastName}`,
        contactNumber: user.mobile,
        branch: user.branch,
        vehiclePlate: vehicle.numberPlate,
        vehicleModel: `${vehicle.company} ${vehicle.model}`,
        vehicleType: vehicle.vehicleType,
        policyNumber: vehicle.policyNumber,
        currentExpiryDate: currentExpiry,
        newExpiryDate: newExpiry
      });
    }

    renewal.currentExpiryDate = currentExpiry;
    renewal.newExpiryDate = newExpiry;
    renewal.calculation = {
      marketValuation: Number(marketValuation),
      basicPremiumRate: Number(basicPremiumRate),
      basicPremium: computedBasicPremium,
      noClaimBonusDiscount: Number(noClaimBonusDiscount),
      discountAmount,
      netPremium,
      govtTaxes: Number(govtTaxes),
      adminFee: Number(adminFee),
      totalRenewalAmount
    };
    renewal.allowedPaymentModes = allowedPaymentModes;
    renewal.calculatedBy = { staffId, staffName, notes };
    renewal.status = "Calculated";

    await renewal.save();

    // Also update vehicle's policyExpiryDate on User record if not yet set
    vehicle.policyExpiryDate = currentExpiry;
    await user.save();

    res.json({ success: true, message: "Renewal quote calculated successfully.", renewal });
  } catch (error) {
    console.error("Error calculating renewal quote:", error);
    res.status(500).json({ error: error.message || "Failed to calculate renewal quote." });
  }
});

/**
 * 3. GET /api/renewals/vehicle-quote/:numberPlate
 * Policy holder fetches calculated renewal quote
 */
router.get("/vehicle-quote/:numberPlate", async (req, res) => {
  try {
    const { numberPlate } = req.params;
    const cleanPlate = numberPlate.trim();

    const renewal = await PolicyRenewal.findOne({
      vehiclePlate: { $regex: new RegExp(`^${cleanPlate}$`, "i") }
    }).sort({ createdAt: -1 });

    // Also find vehicle in user collection to get expiry date
    const user = await User.findOne({
      "vehicles.numberPlate": { $regex: new RegExp(`^${cleanPlate}$`, "i") }
    }).lean();

    let expiryDate = null;
    let daysRemaining = null;

    if (user) {
      const v = user.vehicles.find(
        (veh) => veh.numberPlate?.toLowerCase().trim() === cleanPlate.toLowerCase()
      );
      if (v) {
        expiryDate = getVehicleExpiryDate(v, user.createdAt);
        const now = new Date();
        daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    // Eligible for renewal if within 30 days of expiry AND branch staff has calculated a pending quote
    const isWithin30Days = daysRemaining !== null && daysRemaining <= 30;
    const hasCalculatedQuote = !!renewal && renewal.status === "Calculated";
    const isRenewed = !!renewal && (renewal.status === "Partially_Paid" || renewal.status === "Fully_Paid");

    res.json({
      success: true,
      hasCalculatedQuote,
      isWithin30Days,
      daysRemaining,
      expiryDate,
      isRenewed,
      renewalQuote: renewal || null
    });
  } catch (error) {
    console.error("Error fetching vehicle quote:", error);
    res.status(500).json({ error: error.message || "Failed to fetch vehicle quote." });
  }
});

/**
 * 4. POST /api/renewals/select-plan
 * Policyholder chooses payment plan ("One-Time", "2-Installments", "4-Installments")
 */
router.post("/select-plan", async (req, res) => {
  try {
    const { renewalId, planType } = req.body;
    const renewal = await PolicyRenewal.findById(renewalId);

    if (!renewal) {
      return res.status(404).json({ error: "Renewal record not found." });
    }

    const selectedMode = renewal.allowedPaymentModes.find((m) => m.planType === planType);
    if (!selectedMode) {
      return res.status(400).json({ error: "Invalid payment mode selected." });
    }

    renewal.selectedPlan = planType;

    // Create installment items based on the chosen mode
    const baseDueDate = new Date(renewal.currentExpiryDate);

    renewal.installments = selectedMode.breakdown.map((item) => {
      const due = new Date(baseDueDate);
      due.setMonth(due.getMonth() + (item.dueOffsetMonths || 0));
      return {
        installmentNumber: item.installmentNumber,
        label: item.label,
        amount: item.amount,
        dueDate: due,
        status: "Pending"
      };
    });

    await renewal.save();
    res.json({ success: true, renewal });
  } catch (error) {
    console.error("Error selecting plan:", error);
    res.status(500).json({ error: error.message || "Failed to select plan." });
  }
});

/**
 * 5. POST /api/renewals/create-checkout-session
 * Generates Stripe Checkout Session URL for either full payment or installment #X
 */
router.post("/create-checkout-session", async (req, res) => {
  try {
    const { renewalId, installmentNumber = 1 } = req.body;

    const renewal = await PolicyRenewal.findById(renewalId);
    if (!renewal) {
      return res.status(404).json({ error: "Renewal record not found." });
    }

    let amountToPay = 0;
    let itemTitle = "";
    let itemDescription = "";

    if (renewal.selectedPlan === "One-Time") {
      amountToPay = renewal.calculation.totalRenewalAmount;
      itemTitle = `Full Annual Renewal - ${renewal.vehiclePlate}`;
      itemDescription = `Complete 1-Year Policy Coverage Extension (${renewal.vehicleModel})`;
    } else {
      const targetInst = renewal.installments.find(
        (i) => i.installmentNumber === Number(installmentNumber)
      );
      if (!targetInst) {
        return res.status(400).json({ error: `Installment #${installmentNumber} does not exist.` });
      }
      if (targetInst.status === "Paid") {
        return res.status(400).json({ error: `Installment #${installmentNumber} is already paid.` });
      }
      amountToPay = targetInst.amount;
      itemTitle = `${targetInst.label || `Installment #${installmentNumber}`} - ${renewal.vehiclePlate}`;
      itemDescription = `Sanasa General Insurance Policy ${renewal.policyNumber} (${renewal.vehiclePlate})`;
    }

    const stripe = getStripe();
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    // Stripe amount in cents (LKR supported by Stripe in integer subunits or equivalent)
    const unitAmount = Math.round(amountToPay * 100);

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "lkr",
            product_data: {
              name: itemTitle,
              description: itemDescription
            },
            unit_amount: unitAmount
          },
          quantity: 1
        }
      ],
      mode: "payment",
      success_url: `${frontendUrl}/Policy_Holder/MyVehicles?payment_success=true&session_id={CHECKOUT_SESSION_ID}&plate=${encodeURIComponent(renewal.vehiclePlate)}&inst=${installmentNumber}`,
      cancel_url: `${frontendUrl}/Policy_Holder/MyVehicles?payment_cancelled=true&plate=${encodeURIComponent(renewal.vehiclePlate)}`,
      metadata: {
        renewalId: renewal._id.toString(),
        vehiclePlate: renewal.vehiclePlate,
        installmentNumber: installmentNumber.toString(),
        selectedPlan: renewal.selectedPlan,
        branch: renewal.branch
      }
    });

    res.json({ success: true, checkoutUrl: session.url, sessionId: session.id });
  } catch (error) {
    console.error("Stripe session creation error:", error);
    res.status(500).json({ error: error.message || "Failed to create Stripe payment session." });
  }
});

/**
 * 6. POST /api/renewals/verify-session
 * Called automatically by frontend after Stripe redirects back to verify session and mark as paid immediately
 */
router.post("/verify-session", async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required." });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid") {
      const { renewalId, installmentNumber, vehiclePlate } = session.metadata;

      const renewal = await PolicyRenewal.findById(renewalId);
      if (renewal) {
        if (renewal.selectedPlan === "One-Time") {
          renewal.status = "Fully_Paid";
          if (renewal.installments.length > 0) {
            renewal.installments[0].status = "Paid";
            renewal.installments[0].paidAt = new Date();
            renewal.installments[0].stripeSessionId = sessionId;
          }
        } else {
          const inst = renewal.installments.find(
            (i) => i.installmentNumber === Number(installmentNumber)
          );
          if (inst) {
            inst.status = "Paid";
            inst.paidAt = new Date();
            inst.stripeSessionId = sessionId;
          }

          const allPaid = renewal.installments.every((i) => i.status === "Paid");
          renewal.status = allPaid ? "Fully_Paid" : "Partially_Paid";
        }

        await renewal.save();

        // Extend vehicle policy date on User record
        await User.updateOne(
          { "vehicles.numberPlate": vehiclePlate },
          {
            $set: {
              "vehicles.$.policyExpiryDate": renewal.newExpiryDate,
              "vehicles.$.renewalCycle": `Annual (${new Date(renewal.newExpiryDate).getFullYear()})`
            }
          }
        );

        return res.json({
          success: true,
          message: "Payment successfully verified and updated.",
          renewal
        });
      }
    }

    res.json({ success: false, message: "Payment not completed yet." });
  } catch (error) {
    console.error("Error verifying Stripe session:", error);
    res.status(500).json({ error: error.message || "Failed to verify payment." });
  }
});

/**
 * 7. GET /api/renewals/active-installment/:numberPlate
 * Returns current installment status and reminder data for the policyholder's vehicle details page
 */
router.get("/active-installment/:numberPlate", async (req, res) => {
  try {
    const { numberPlate } = req.params;
    const renewal = await PolicyRenewal.findOne({
      vehiclePlate: { $regex: new RegExp(`^${numberPlate.trim()}$`, "i") }
    }).sort({ createdAt: -1 });

    if (!renewal) {
      return res.json({ success: true, hasActivePlan: false });
    }

    const pendingInstallments = renewal.installments.filter((i) => i.status === "Pending");
    const nextInstallment = pendingInstallments.length > 0 ? pendingInstallments[0] : null;
    const paidInstallments = renewal.installments.filter((i) => i.status === "Paid");

    res.json({
      success: true,
      hasActivePlan: renewal.status === "Partially_Paid" && !!nextInstallment,
      renewal,
      nextInstallment,
      paidCount: paidInstallments.length,
      totalCount: renewal.installments.length,
      isFullyPaid: renewal.status === "Fully_Paid"
    });
  } catch (error) {
    console.error("Error fetching active installment:", error);
    res.status(500).json({ error: error.message || "Failed to fetch installment info." });
  }
});

export default router;
