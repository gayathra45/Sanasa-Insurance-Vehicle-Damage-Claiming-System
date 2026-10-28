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

    const message = `Sanasa Insurance: Claim #${claim.claimNumber} successfully submitted for ${claim.vehiclePlate || "your vehicle"}. Your claim is pending initial branch review. Track progress in the Sanasa app.`;

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

    const agentContact = resolvedAgent?.phone ? ` (${resolvedAgent.phone})` : "";
    const agentName = resolvedAgent?.name || claim.assignedAgent || "an insurance agent";
    const message = `Sanasa Insurance: Claim #${claim.claimNumber} assigned to Agent ${agentName}${agentContact}. The agent will contact you to coordinate vehicle inspection.`;

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

    const message = `Sanasa Insurance: Status of Claim #${claim.claimNumber} updated to: ${newStatus}. Please log in to your Sanasa portal for details.`;

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

    const docList = Array.isArray(requestedDocs) && requestedDocs.length > 0
      ? requestedDocs.slice(0, 2).join(", ")
      : "documents";

    const message = `Sanasa Insurance: Action required for Claim #${claim.claimNumber}. Please upload required documentation (${docList}) via your customer portal to continue processing.`;

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

    const message = `Sanasa Insurance: ${docName} received and verified for Claim #${claim.claimNumber}. Our technical team is reviewing your file.`;

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

    let message = "";
    if (updateType === "scheduled") {
      message = `Sanasa Insurance: Vehicle inspection scheduled for Claim #${claim.claimNumber}${details ? ` on ${details}` : ""}. Agent: ${agent?.name || claim.assignedAgent || "Inspector"}.`;
    } else if (updateType === "rescheduled") {
      message = `Sanasa Insurance: Vehicle inspection rescheduled for Claim #${claim.claimNumber}${details ? ` to ${details}` : ""}.`;
    } else {
      message = `Sanasa Insurance: Physical vehicle inspection for Claim #${claim.claimNumber} has been completed and submitted for branch evaluation.`;
    }

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

    const approvedAmt = amount || claim.approvedAmount || claim.amount;
    const amtStr = approvedAmt ? ` for LKR ${Number(approvedAmt).toLocaleString()}` : "";
    const message = `Sanasa Insurance: Congratulations! Claim #${claim.claimNumber} has been APPROVED${amtStr}. Settlement payout is being prepared for your registered account.`;

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

    const reasonSnippet = reason ? ` Reason: ${reason}.` : "";
    const message = `Sanasa Insurance: Notice regarding Claim #${claim.claimNumber}. Following review, the claim could not be approved.${reasonSnippet} Please contact your branch for questions.`;

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

    const finalAmt = amount || claim.amount || claim.approvedAmount || 0;
    const message = `Sanasa Insurance: Payment settlement of LKR ${Number(finalAmt).toLocaleString()} for Claim #${claim.claimNumber} has been completed. Official payment slip is available in your portal.`;

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

    const message = `Sanasa Insurance: Claim #${claim.claimNumber} has been completed and closed. Thank you for placing your trust in Sanasa General Insurance.`;

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

    const message = `Sanasa Insurance Reminder: Upcoming appointment for Claim #${claim.claimNumber}: ${appointmentText}. Please ensure punctuality.`;

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

    const plate = claim.vehiclePlate || "vehicle";
    const userPhone = user?.mobile ? ` (${user.mobile})` : "";
    const clientName = user?.firstName ? `${user.firstName}${userPhone}` : "Policyholder";

    const message = `Sanasa Agent Alert: New Claim #${claim.claimNumber} assigned to you [${plate}]. Client: ${clientName}. Please review in your agent app to schedule inspection.`;

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

    const message = `Sanasa Agent Alert: Client uploaded ${docName} for Claim #${claim.claimNumber}. Please review updated claim files in the agent portal.`;

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

    const amtStr = amount ? ` (LKR ${Number(amount).toLocaleString()})` : "";
    const message = `Sanasa Agent Alert: Claim #${claim.claimNumber} decision finalized as ${decision.toUpperCase()}${amtStr} by branch office.`;

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
    const message = `Sanasa Agent Alert: Payout of LKR ${Number(finalAmt).toLocaleString()} settled for Claim #${claim.claimNumber}. Case closed.`;

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
