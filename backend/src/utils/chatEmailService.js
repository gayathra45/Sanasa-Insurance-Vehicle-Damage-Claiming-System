import { sendEmail } from "./email.js";
import EmailLog from "../models/email_log.model.js";

/**
 * Generates branded SANASA Insurance HTML email for claim chat notifications
 */
function buildChatNotificationHtml({
  recipientName,
  claimNumber,
  senderName,
  senderRole,
  claimStatus,
  actionUrl,
  previewSnippet
}) {
  const brandBlue = "#0284c7";
  const darkNavy = "#102A43";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Message Regarding Claim ${claimNumber}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          <!-- Header Banner -->
          <tr>
            <td style="background-color: ${darkNavy}; padding: 28px 32px; text-align: left;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px;">SANASA</span>
                    <span style="font-size: 14px; font-weight: 600; color: #38bdf8; margin-left: 6px;">GENERAL INSURANCE</span>
                    <div style="font-size: 11px; color: #94a3b8; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;">Vehicle Claims Communication Desk</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a;">
                New Message Regarding Your Claim
              </h2>

              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                Hello <strong>${recipientName || "Valued Customer"}</strong>,
              </p>

              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                You have received a new message regarding insurance claim <strong style="color: ${brandBlue};">${claimNumber}</strong>.
              </p>

              <!-- Claim Summary Card -->
              <div style="background-color: #f1f5f9; border-left: 4px solid ${brandBlue}; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 14px;">
                  <tr>
                    <td style="padding: 4px 0; color: #64748b; width: 130px;">Claim Number:</td>
                    <td style="padding: 4px 0; font-weight: 600; color: #0f172a;">${claimNumber}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #64748b;">Sender:</td>
                    <td style="padding: 4px 0; font-weight: 600; color: #0f172a;">${senderName} ${senderRole ? `(${senderRole})` : ""}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #64748b;">Claim Status:</td>
                    <td style="padding: 4px 0; font-weight: 600; color: #0f172a;">${claimStatus || "In Progress"}</td>
                  </tr>
                  ${previewSnippet ? `
                  <tr>
                    <td style="padding: 8px 0 4px 0; color: #64748b; vertical-align: top;">Preview:</td>
                    <td style="padding: 8px 0 4px 0; color: #334155; font-style: italic;">"${previewSnippet}"</td>
                  </tr>
                  ` : ""}
                </table>
              </div>

              <p style="margin: 0 0 28px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                For your security and privacy, full conversation history and attachments are protected within your authenticated SANASA portal. Please sign in to read and respond.
              </p>

              <!-- Call to Action Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${actionUrl}" style="display: inline-block; background-color: ${brandBlue}; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(2, 132, 199, 0.3);">
                      Open Claim Conversation
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #94a3b8; text-align: center;">
                If the button above doesn't work, copy and paste this link into your browser:<br/>
                <a href="${actionUrl}" style="color: ${brandBlue}; word-break: break-all;">${actionUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 32px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #475569;">
                SANASA General Insurance PLC
              </p>
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b;">
                24/7 Motor Accident Assistance: 011-2303300 | Head Office: Colombo, Sri Lanka
              </p>
              <p style="margin: 8px 0 0 0; font-size: 11px; color: #94a3b8;">
                This automated notification was sent to ${recipientName}. Please do not reply directly to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Dispatches an asynchronous email notification to a recipient's verified email address.
 * Non-blocking: failures are logged in EmailLog without interrupting chat or socket flow.
 */
export async function queueChatEmailNotification({
  recipientEmail,
  recipientName,
  recipientType,
  claimNumber,
  claimStatus,
  senderName,
  senderRole,
  messageText,
  messageId
}) {
  if (!recipientEmail || !recipientEmail.includes("@")) {
    console.warn(`[chatEmailService] Skip email: Invalid or missing email for ${recipientName} (${recipientEmail})`);
    return null;
  }

  const publicFrontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  
  // Direct portal link by role
  let rolePath = "/Policy_Holder/Home";
  if (recipientType === "Agent") rolePath = "/Agent/MyClaims";
  else if (recipientType === "OfficeStaff") rolePath = "/Office_Staff/Claims";
  else if (recipientType === "Admin") rolePath = "/Admin/Claims";
  else if (recipientType === "PolicyHolder") rolePath = "/Policy_Holder/TrackClaims";

  const actionUrl = `${publicFrontendUrl}${rolePath}?claim=${encodeURIComponent(claimNumber)}&openChat=true`;
  const subject = `New Message Regarding Your Insurance Claim [${claimNumber}]`;
  
  // Short safe snippet for privacy (max 80 chars, no sensitive data)
  const previewSnippet = messageText ? messageText.slice(0, 80) + (messageText.length > 80 ? "..." : "") : "";

  const html = buildChatNotificationHtml({
    recipientName,
    claimNumber,
    senderName,
    senderRole,
    claimStatus,
    actionUrl,
    previewSnippet
  });

  const textBody = `
Hello ${recipientName || "Valued Customer"},

You have received a new message regarding insurance claim ${claimNumber}.

Sender: ${senderName} ${senderRole ? `(${senderRole})` : ""}
Claim Status: ${claimStatus || "In Progress"}

Please sign in to your SANASA Insurance account to view the message and respond:
${actionUrl}

Regards,
SANASA General Insurance PLC
  `.trim();

  // Create EmailLog entry
  let emailLogEntry;
  try {
    emailLogEntry = await EmailLog.create({
      recipientEmail,
      recipientName,
      recipientType,
      claimNumber,
      subject,
      status: "queued",
      attempts: 0,
      messageId
    });
  } catch (err) {
    console.error("[chatEmailService] Failed to create EmailLog record:", err.message);
  }

  // Send asynchronously in background without blocking the caller
  setImmediate(async () => {
    try {
      console.log(`[chatEmailService] Sending email to ${recipientEmail} for claim ${claimNumber}...`);
      await sendEmail(recipientEmail, subject, html, textBody);
      
      if (emailLogEntry) {
        emailLogEntry.status = "sent";
        emailLogEntry.attempts = 1;
        emailLogEntry.lastAttemptAt = new Date();
        await emailLogEntry.save();
      }
      console.log(`[chatEmailService] ✅ Email delivered to ${recipientEmail}`);
    } catch (err) {
      console.error(`[chatEmailService] ❌ Failed to deliver email to ${recipientEmail}:`, err.message);
      if (emailLogEntry) {
        emailLogEntry.status = "failed";
        emailLogEntry.attempts = 1;
        emailLogEntry.lastAttemptAt = new Date();
        emailLogEntry.errorMessage = err.message || "Unknown delivery error";
        await emailLogEntry.save().catch(() => {});
      }
    }
  });

  return emailLogEntry;
}
