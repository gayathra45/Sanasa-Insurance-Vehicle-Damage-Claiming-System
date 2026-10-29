import User from "../models/user.model.js";
import Agent from "../models/agent.model.js";
import Claim from "../models/claim.model.js";
import { sendSmsSafe } from "./smsService.js";

/**
 * Helper to resolve Policyholder and Agent records for a claim.
 */
async function resolveClaimParties(claimOrClaimNumber) {
  let claim = claimOrClaimNumber;
  if (typeof claimOrClaimNumber === "string") {
    claim = await Claim.findOne({ claimNumber: claimOrClaimNumber.trim().toUpperCase() }).lean();
  }

  if (!claim) return { claim: null, user: null, agent: null };

  const [user, agent] = await Promise.all([
    claim.userNic ? User.findOne({ nic: claim.userNic }).lean() : null,
    claim.assignedAgent
      ? Agent.findOne({
          $or: [{ agentId: claim.assignedAgent }, { name: claim.assignedAgent }, { email: claim.assignedAgent }]
        }).lean()
      : null
  ]);

  return { claim, user, agent };
}

// ==========================================
// ==========================================
// POLICYHOLDER NOTIFICATIONS
// ==========================================

/**
 * 1. Policyholder: Claim successfully submitted & reference number generated
 */
export async function notifyClaimSubmitted(claimData, userData = null) {
  try {
    const { claim, user } = await resolveClaimParties(claimData);
    const resolvedUser = userData || user;
    if (!claim || !resolvedUser?.mobile) return;

    const recipientName = resolvedUser.firstName ? `Dear ${resolvedUser.firstName}, ` : "";
    const vehicle = claim.vehiclePlate ? ` [Vehicle: ${claim.vehiclePlate}]` : "";
    const branchName = claim.branch ? `${claim.branch} Branch` : "Branch Office";

    const message = `[SANASA GENERAL INSURANCE]\n${recipientName}Your insurance claim has been lodged successfully.\n\n• Claim No: #${claim.claimNumber}${vehicle}\n• Status: Initial Review Pending\n• Routed Unit: ${branchName}\n\nOur claims department is reviewing your submission. Track live progress on the customer portal.\n24/7 Hotline: 0725 575 575 | www.sanasainsurance.lk`;

    sendSmsSafe({
      phone: resolvedUser.mobile,
      message,
      claimNumber: claim.claimNumber,
      eventType: "claim_submitted",
      categoryKey: "claimSubmission",
      recipientType: "PolicyHolder",
      recipientName: `${resolvedUser.firstName || ""} ${resolvedUser.lastName || ""}`.trim(),
      idempotencyKey: `${claim.claimNumber}_submitted_${resolvedUser.mobile}`
    });
  } catch (err) {
    console.error("notifyClaimSubmitted error:", err.message);
  }
}

/**
 * 2. Policyholder: Claim assigned to an insurance agent
 */
export async function notifyClaimAssigned(claimData, agentData = null, userData = null) {
  try {
    const { claim, user, agent } = await resolveClaimParties(claimData);
    const resolvedUser = userData || user;
    const resolvedAgent = agentData || agent;
    if (!claim || !resolvedUser?.mobile) return;

    const recipientName = resolvedUser.firstName ? `Dear ${resolvedUser.firstName}, ` : "";
    const agentName = resolvedAgent?.name || claim.assignedAgent || "Authorized Field Assessor";
    const agentContact = resolvedAgent?.phone ? ` (${resolvedAgent.phone})` : "";
    const vehicle = claim.vehiclePlate ? ` [${claim.vehiclePlate}]` : "";

    const message = `[SANASA GENERAL INSURANCE]\n${recipientName}An authorized field assessor has been assigned to your claim.\n\n• Claim No: #${claim.claimNumber}${vehicle}\n• Assigned Assessor: ${agentName}${agentContact}\n• Next Step: Damage Inspection\n\nThe assessor will contact you shortly to schedule the physical damage inspection.\n24/7 Hotline: 0725 575 575`;

    sendSmsSafe({
      phone: resolvedUser.mobile,
      message,
      claimNumber: claim.claimNumber,
      eventType: "claim_assigned",
      categoryKey: "agentAssignment",
      recipientType: "PolicyHolder",
      recipientName: `${resolvedUser.firstName || ""} ${resolvedUser.lastName || ""}`.trim(),
      idempotencyKey: `${claim.claimNumber}_assigned_${claim.assignedAgent}_${resolvedUser.mobile}`
    });
  } catch (err) {
    console.error("notifyClaimAssigned error:", err.message);
  }
}

/**
 * 3. Policyholder: Claim status changed
 */
export async function notifyClaimStatusChanged(claimData, newStatus, userData = null) {
  try {
    const { claim, user } = await resolveClaimParties(claimData);
    const resolvedUser = userData || user;
    if (!claim || !resolvedUser?.mobile) return;

    const recipientName = resolvedUser.firstName ? `Dear ${resolvedUser.firstName}, ` : "";
    const vehicle = claim.vehiclePlate ? ` [${claim.vehiclePlate}]` : "";

    const message = `[SANASA GENERAL INSURANCE]\n${recipientName}There is an update on your claim file.\n\n• Claim No: #${claim.claimNumber}${vehicle}\n• Current Status: ${newStatus.toUpperCase()}\n• Updated: ${new Date().toLocaleDateString("en-LK")}\n\nPlease sign in to your Sanasa portal for complete details and case history.\n24/7 Hotline: 0725 575 575`;

    sendSmsSafe({
      phone: resolvedUser.mobile,
      message,
      claimNumber: claim.claimNumber,
      eventType: "status_changed",
      categoryKey: "statusUpdates",
      recipientType: "PolicyHolder",
      recipientName: `${resolvedUser.firstName || ""} ${resolvedUser.lastName || ""}`.trim(),
      idempotencyKey: `${claim.claimNumber}_status_${newStatus}_${resolvedUser.mobile}`
    });
  } catch (err) {
    console.error("notifyClaimStatusChanged error:", err.message);
  }
}

/**
 * 4. Policyholder: Additional documents requested
 */
export async function notifyDocumentsRequested(claimData, requestedDocs = [], userData = null) {
  try {
    const { claim, user } = await resolveClaimParties(claimData);
    const resolvedUser = userData || user;
    if (!claim || !resolvedUser?.mobile) return;

    const recipientName = resolvedUser.firstName ? `Dear ${resolvedUser.firstName}, ` : "";
    const docList = Array.isArray(requestedDocs) && requestedDocs.length > 0
      ? requestedDocs.join(", ")
      : "Supporting Accident / Garage Documents";
    const vehicle = claim.vehiclePlate ? ` [${claim.vehiclePlate}]` : "";

    const message = `[SANASA GENERAL INSURANCE]\n${recipientName}Action required for your insurance claim.\n\n• Claim No: #${claim.claimNumber}${vehicle}\n• Required Items: ${docList}\n\nPlease upload these documents via your customer portal to enable our assessors to finalize processing.\n24/7 Hotline: 0725 575 575`;

    sendSmsSafe({
      phone: resolvedUser.mobile,
      message,
      claimNumber: claim.claimNumber,
      eventType: "documents_requested",
      categoryKey: "documentRequests",
      recipientType: "PolicyHolder",
      recipientName: `${resolvedUser.firstName || ""} ${resolvedUser.lastName || ""}`.trim(),
      idempotencyKey: `${claim.claimNumber}_docs_requested_${Date.now()}`
    });
  } catch (err) {
    console.error("notifyDocumentsRequested error:", err.message);
  }
}

/**
 * 5. Policyholder: Documents received and verified
 */
export async function notifyDocumentsVerified(claimData, docName = "Document", userData = null) {
  try {
    const { claim, user } = await resolveClaimParties(claimData);
    const resolvedUser = userData || user;
    if (!claim || !resolvedUser?.mobile) return;

    const recipientName = resolvedUser.firstName ? `Dear ${resolvedUser.firstName}, ` : "";
    const vehicle = claim.vehiclePlate ? ` [${claim.vehiclePlate}]` : "";

    const message = `[SANASA GENERAL INSURANCE]\n${recipientName}Document verification confirmed.\n\n• Claim No: #${claim.claimNumber}${vehicle}\n• Verified Item: ${docName}\n• File Status: Verified & Under Technical Appraisal\n\nOur claims assessment board is proceeding with your file evaluation.\n24/7 Hotline: 0725 575 575`;

    sendSmsSafe({
      phone: resolvedUser.mobile,
      message,
      claimNumber: claim.claimNumber,
      eventType: "documents_verified",
      categoryKey: "documentRequests",
      recipientType: "PolicyHolder",
      recipientName: `${resolvedUser.firstName || ""} ${resolvedUser.lastName || ""}`.trim(),
      idempotencyKey: `${claim.claimNumber}_docs_verified_${docName}_${resolvedUser.mobile}`
    });
  } catch (err) {
    console.error("notifyDocumentsVerified error:", err.message);
  }
}

/**
 * 6. Policyholder: Vehicle inspection scheduled or completed
 */
export async function notifyInspectionUpdate(claimData, updateType = "completed", details = "", userData = null) {
  try {
    const { claim, user, agent } = await resolveClaimParties(claimData);
    const resolvedUser = userData || user;
    if (!claim || !resolvedUser?.mobile) return;

    const recipientName = resolvedUser.firstName ? `Dear ${resolvedUser.firstName}, ` : "";
    const vehicle = claim.vehiclePlate ? ` [${claim.vehiclePlate}]` : "";
    const agentName = agent?.name || claim.assignedAgent || "Authorized Field Assessor";

    let updateBody = "";
    if (updateType === "scheduled") {
      updateBody = `• Physical Inspection: SCHEDULED\n• Session: ${details || "As agreed with assessor"}\n• Assigned Assessor: ${agentName}`;
    } else if (updateType === "rescheduled") {
      updateBody = `• Physical Inspection: RESCHEDULED\n• Revised Session: ${details || "Updated appointment"}\n• Assigned Assessor: ${agentName}`;
    } else {
      updateBody = `• Physical Inspection: COMPLETED\n• Status: Damage assessment report submitted to branch underwriting board for valuation.`;
    }

    const message = `[SANASA GENERAL INSURANCE]\n${recipientName}Vehicle inspection update regarding your claim.\n\n• Claim No: #${claim.claimNumber}${vehicle}\n${updateBody}\n\nFor inquiries, please call our 24/7 Hotline: 0725 575 575`;

    sendSmsSafe({
      phone: resolvedUser.mobile,
      message,
      claimNumber: claim.claimNumber,
      eventType: `inspection_${updateType}`,
      categoryKey: "inspection",
      recipientType: "PolicyHolder",
      recipientName: `${resolvedUser.firstName || ""} ${resolvedUser.lastName || ""}`.trim(),
      idempotencyKey: `${claim.claimNumber}_inspection_${updateType}_${Date.now()}`
    });
  } catch (err) {
    console.error("notifyInspectionUpdate error:", err.message);
  }
}

/**
 * 7. Policyholder: Claim approved
 */
export async function notifyClaimApproved(claimData, amount = null, userData = null) {
  try {
    const { claim, user } = await resolveClaimParties(claimData);
    const resolvedUser = userData || user;
    if (!claim || !resolvedUser?.mobile) return;

    const recipientName = resolvedUser.firstName ? `Dear ${resolvedUser.firstName}, ` : "";
    const vehicle = claim.vehiclePlate ? ` [${claim.vehiclePlate}]` : "";
    const approvedAmt = amount || claim.approvedAmount || claim.amount;
    const amtStr = approvedAmt
      ? `• Approved Settlement: LKR ${Number(approvedAmt).toLocaleString("en-LK", { minimumFractionDigits: 2 })}\n`
      : "";

    const message = `[SANASA GENERAL INSURANCE]\n${recipientName}We are pleased to inform you that your claim has been APPROVED.\n\n• Claim No: #${claim.claimNumber}${vehicle}\n${amtStr}• Status: Approved & Queued for Disbursement\n\nPayout processing is underway for direct credit to your registered account.\n24/7 Hotline: 0725 575 575 | www.sanasainsurance.lk`;

    sendSmsSafe({
      phone: resolvedUser.mobile,
      message,
      claimNumber: claim.claimNumber,
      eventType: "claim_approved",
      categoryKey: "decision",
      recipientType: "PolicyHolder",
      recipientName: `${resolvedUser.firstName || ""} ${resolvedUser.lastName || ""}`.trim(),
      idempotencyKey: `${claim.claimNumber}_approved_${resolvedUser.mobile}`
    });
  } catch (err) {
    console.error("notifyClaimApproved error:", err.message);
  }
}

/**
 * 8. Policyholder: Claim rejected with explanation
 */
export async function notifyClaimRejected(claimData, reason = "", userData = null) {
  try {
    const { claim, user } = await resolveClaimParties(claimData);
    const resolvedUser = userData || user;
    if (!claim || !resolvedUser?.mobile) return;

    const recipientName = resolvedUser.firstName ? `Dear ${resolvedUser.firstName}, ` : "";
    const vehicle = claim.vehiclePlate ? ` [${claim.vehiclePlate}]` : "";
    const reasonSnippet = reason ? `• Reason: ${reason}\n` : "";
    const branchName = claim.branch ? `${claim.branch} Branch` : "Branch Administration";

    const message = `[SANASA GENERAL INSURANCE]\n${recipientName}Official notice regarding your insurance claim.\n\n• Claim No: #${claim.claimNumber}${vehicle}\n• Decision: Claim Not Approved\n${reasonSnippet}• Reviewing Unit: ${branchName}\n\nFor questions or appeal procedures, please contact your branch or our customer care desk at 0725 575 575.`;

    sendSmsSafe({
      phone: resolvedUser.mobile,
      message,
      claimNumber: claim.claimNumber,
      eventType: "claim_rejected",
      categoryKey: "decision",
      recipientType: "PolicyHolder",
      recipientName: `${resolvedUser.firstName || ""} ${resolvedUser.lastName || ""}`.trim(),
      idempotencyKey: `${claim.claimNumber}_rejected_${resolvedUser.mobile}`
    });
  } catch (err) {
    console.error("notifyClaimRejected error:", err.message);
  }
}

/**
 * 9. Policyholder: Settlement or payment status updated
 */
export async function notifyPaymentSettled(claimData, amount = null, userData = null) {
  try {
    const { claim, user } = await resolveClaimParties(claimData);
    const resolvedUser = userData || user;
    if (!claim || !resolvedUser?.mobile) return;

    const recipientName = resolvedUser.firstName ? `Dear ${resolvedUser.firstName}, ` : "";
    const vehicle = claim.vehiclePlate ? ` [${claim.vehiclePlate}]` : "";
    const finalAmt = amount || claim.amount || claim.approvedAmount || 0;

    const message = `[SANASA GENERAL INSURANCE]\n${recipientName}Settlement payment notification.\n\n• Claim No: #${claim.claimNumber}${vehicle}\n• Amount Disbursed: LKR ${Number(finalAmt).toLocaleString("en-LK", { minimumFractionDigits: 2 })}\n• Status: Settled & Concluded\n\nYour official settlement voucher is now ready to download on your customer portal.\n24/7 Hotline: 0725 575 575`;

    sendSmsSafe({
      phone: resolvedUser.mobile,
      message,
      claimNumber: claim.claimNumber,
      eventType: "payment_settled",
      categoryKey: "settlement",
      recipientType: "PolicyHolder",
      recipientName: `${resolvedUser.firstName || ""} ${resolvedUser.lastName || ""}`.trim(),
      idempotencyKey: `${claim.claimNumber}_settled_${resolvedUser.mobile}`
    });
  } catch (err) {
    console.error("notifyPaymentSettled error:", err.message);
  }
}

/**
 * 10. Policyholder: Claim closed
 */
export async function notifyClaimClosed(claimData, userData = null) {
  try {
    const { claim, user } = await resolveClaimParties(claimData);
    const resolvedUser = userData || user;
    if (!claim || !resolvedUser?.mobile) return;

    const recipientName = resolvedUser.firstName ? `Dear ${resolvedUser.firstName}, ` : "";
    const vehicle = claim.vehiclePlate ? ` [${claim.vehiclePlate}]` : "";

    const message = `[SANASA GENERAL INSURANCE]\n${recipientName}Your claim file has been finalized and closed.\n\n• Claim No: #${claim.claimNumber}${vehicle}\n• File Status: Officially Closed\n\nThank you for placing your trust in Sanasa General Insurance. Drive safe!\n24/7 Hotline: 0725 575 575 | www.sanasainsurance.lk`;

    sendSmsSafe({
      phone: resolvedUser.mobile,
      message,
      claimNumber: claim.claimNumber,
      eventType: "claim_closed",
      categoryKey: "statusUpdates",
      recipientType: "PolicyHolder",
      recipientName: `${resolvedUser.firstName || ""} ${resolvedUser.lastName || ""}`.trim(),
      idempotencyKey: `${claim.claimNumber}_closed_${resolvedUser.mobile}`
    });
  } catch (err) {
    console.error("notifyClaimClosed error:", err.message);
  }
}

/**
 * 11. Policyholder & Agent: Important appointment reminder
 */
export async function notifyAppointmentReminder(claimData, appointmentText = "", targetType = "PolicyHolder") {
  try {
    const { claim, user, agent } = await resolveClaimParties(claimData);
    if (!claim) return;

    const targetRecipient = targetType === "Agent" ? agent : user;
    const phone = targetType === "Agent" ? (agent?.phone || agent?.mobile) : user?.mobile;
    if (!phone) return;

    const recipientName = targetRecipient?.firstName ? `Dear ${targetRecipient.firstName}, ` : targetRecipient?.name ? `Dear ${targetRecipient.name}, ` : "";
    const vehicle = claim.vehiclePlate ? ` [${claim.vehiclePlate}]` : "";

    const message = `[SANASA GENERAL INSURANCE]\n${recipientName}Reminder for upcoming appointment.\n\n• Claim No: #${claim.claimNumber}${vehicle}\n• Session Details: ${appointmentText}\n\nPlease ensure punctuality or notify us in advance if rescheduling is required.\n24/7 Hotline: 0725 575 575`;

    sendSmsSafe({
      phone,
      message,
      claimNumber: claim.claimNumber,
      eventType: "appointment_reminder",
      categoryKey: "reminders",
      recipientType: targetType,
      recipientName: targetRecipient?.name || `${targetRecipient?.firstName || ""} ${targetRecipient?.lastName || ""}`.trim(),
      idempotencyKey: `${claim.claimNumber}_reminder_${Date.now()}`
    });
  } catch (err) {
    console.error("notifyAppointmentReminder error:", err.message);
  }
}

// ==========================================
// INSURANCE AGENT NOTIFICATIONS
// ==========================================

/**
 * 12. Insurance Agent: New claim assigned
 */
export async function notifyAgentNewClaimAssigned(claimData, agentData = null) {
  try {
    const { claim, user, agent } = await resolveClaimParties(claimData);
    const targetAgent = agentData || agent;
    const agentPhone = targetAgent?.phone || targetAgent?.mobile;
    if (!claim || !agentPhone) return;

    const plate = claim.vehiclePlate || "N/A";
    const userPhone = user?.mobile ? ` (${user.mobile})` : "";
    const clientName = user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() + userPhone : "Policyholder";
    const branchName = claim.branch ? `${claim.branch} Branch` : "Branch Office";

    const message = `[SANASA AGENT DISPATCH]\nNew claim assignment received.\n\n• Claim No: #${claim.claimNumber}\n• Vehicle: ${plate}\n• Policyholder: ${clientName}\n• Branch: ${branchName}\n\nPlease access the Sanasa Agent Mobile App to review accident files and coordinate client inspection.`;

    sendSmsSafe({
      phone: agentPhone,
      message,
      claimNumber: claim.claimNumber,
      eventType: "agent_claim_assigned",
      categoryKey: "agentAssignment",
      recipientType: "Agent",
      recipientName: targetAgent.name || "Agent",
      idempotencyKey: `${claim.claimNumber}_agent_assigned_${agentPhone}`
    });
  } catch (err) {
    console.error("notifyAgentNewClaimAssigned error:", err.message);
  }
}

/**
 * 13. Insurance Agent: New documents uploaded by policyholder
 */
export async function notifyAgentDocumentsUploaded(claimData, docName = "Document", agentData = null) {
  try {
    const { claim, agent } = await resolveClaimParties(claimData);
    const targetAgent = agentData || agent;
    const agentPhone = targetAgent?.phone || targetAgent?.mobile;
    if (!claim || !agentPhone) return;

    const vehicle = claim.vehiclePlate ? ` [${claim.vehiclePlate}]` : "";

    const message = `[SANASA AGENT ALERT]\nPolicyholder has uploaded new documentation.\n\n• Claim No: #${claim.claimNumber}${vehicle}\n• Item Uploaded: ${docName}\n\nPlease review updated evidence in your Agent Portal prior to inspection submission.`;

    sendSmsSafe({
      phone: agentPhone,
      message,
      claimNumber: claim.claimNumber,
      eventType: "agent_docs_uploaded",
      categoryKey: "documentRequests",
      recipientType: "Agent",
      recipientName: targetAgent.name || "Agent",
      idempotencyKey: `${claim.claimNumber}_agent_doc_${docName}_${Date.now()}`
    });
  } catch (err) {
    console.error("notifyAgentDocumentsUploaded error:", err.message);
  }
}

/**
 * 14. Insurance Agent: Claim approved or rejected by authorized reviewer
 */
export async function notifyAgentClaimDecision(claimData, decision = "Approved", amount = null, agentData = null) {
  try {
    const { claim, agent } = await resolveClaimParties(claimData);
    const targetAgent = agentData || agent;
    const agentPhone = targetAgent?.phone || targetAgent?.mobile;
    if (!claim || !agentPhone) return;

    const amtStr = amount ? ` (LKR ${Number(amount).toLocaleString("en-LK", { minimumFractionDigits: 2 })})` : "";
    const vehicle = claim.vehiclePlate ? ` [${claim.vehiclePlate}]` : "";

    const message = `[SANASA AGENT ALERT]\nBranch decision finalized.\n\n• Claim No: #${claim.claimNumber}${vehicle}\n• Decision: ${decision.toUpperCase()}${amtStr}\n• Status: Technical review concluded by branch administration.`;

    sendSmsSafe({
      phone: agentPhone,
      message,
      claimNumber: claim.claimNumber,
      eventType: "agent_claim_decision",
      categoryKey: "decision",
      recipientType: "Agent",
      recipientName: targetAgent.name || "Agent",
      idempotencyKey: `${claim.claimNumber}_agent_decision_${decision}_${agentPhone}`
    });
  } catch (err) {
    console.error("notifyAgentClaimDecision error:", err.message);
  }
}

/**
 * 15. Insurance Agent: Settlement status changed
 */
export async function notifyAgentSettlementChanged(claimData, amount = null, agentData = null) {
  try {
    const { claim, agent } = await resolveClaimParties(claimData);
    const targetAgent = agentData || agent;
    const agentPhone = targetAgent?.phone || targetAgent?.mobile;
    if (!claim || !agentPhone) return;

    const finalAmt = amount || claim.amount || 0;
    const vehicle = claim.vehiclePlate ? ` [${claim.vehiclePlate}]` : "";

    const message = `[SANASA AGENT ALERT]\nSettlement completed.\n\n• Claim No: #${claim.claimNumber}${vehicle}\n• Disbursed Amount: LKR ${Number(finalAmt).toLocaleString("en-LK", { minimumFractionDigits: 2 })}\n• File Status: Closed & Concluded`;

    sendSmsSafe({
      phone: agentPhone,
      message,
      claimNumber: claim.claimNumber,
      eventType: "agent_settlement_changed",
      categoryKey: "settlement",
      recipientType: "Agent",
      recipientName: targetAgent.name || "Agent",
      idempotencyKey: `${claim.claimNumber}_agent_settled_${agentPhone}`
    });
  } catch (err) {
    console.error("notifyAgentSettlementChanged error:", err.message);
  }
}
