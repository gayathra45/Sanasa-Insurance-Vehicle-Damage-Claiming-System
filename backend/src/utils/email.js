import nodemailer from "nodemailer";
import { Resend } from "resend";
import dotenv from "dotenv";
import mongoose from "mongoose";
dotenv.config({ override: true });

export async function sendEmail(toEmail, subject, htmlBody, textBody) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const senderEmail = process.env.SENDER_EMAIL || "codemapper71@gmail.com";
  const resendKey = process.env.RESEND_API_KEY;

  // 1. Check if SMTP is Gmail (either by host or user email)
  const isGmail = (smtpHost && smtpHost.includes("gmail.com")) || 
                  (smtpUser && smtpUser.trim().toLowerCase().endsWith("@gmail.com"));

  if (isGmail && smtpUser && smtpPass &&
      !smtpUser.includes("your-") &&
      !smtpPass.includes("your-")) {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: smtpUser.trim(), pass: smtpPass.trim() },
    });
    await transporter.sendMail({
      from: `"Sanasa Insurance" <${smtpUser.trim()}>`,
      to: toEmail,
      subject,
      html: htmlBody,
      text: textBody,
    });
    console.log(`✅ Email sent to ${toEmail} via Gmail SMTP Service`);
    return { sent: true };
  }

  // 2. Fallback: Custom SMTP (Mailtrap, etc.)
  const hasCustomSmtp = smtpHost && smtpUser && smtpPass &&
                        !smtpHost.includes("your-") &&
                        !smtpUser.includes("your-") &&
                        !smtpPass.includes("your-");

  if (hasCustomSmtp) {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: smtpPort == 465, // true for 465, false for others
      auth: { user: smtpUser, pass: smtpPass },
    });
    await transporter.sendMail({
      from: `"Sanasa Insurance" <${senderEmail}>`,
      to: toEmail,
      subject,
      html: htmlBody,
      text: textBody,
    });
    console.log(`✅ Email sent to ${toEmail} via Custom SMTP Server (${smtpHost})`);
    return { sent: true };
  }

  const hasResend = resendKey && !resendKey.includes("re_your");
  if (hasResend) {
    const resend = new Resend(resendKey);
    const { error } = await resend.emails.send({
      from: "Sanasa Insurance <onboarding@resend.dev>",
      to: [toEmail],
      subject,
      html: htmlBody,
      text: textBody,
    });
    if (error) throw new Error(error.message || "Resend failed.");
    console.log(`✅ Email sent to ${toEmail} via Resend`);
    return { sent: true };
  }

  console.warn("⚠️ No email credentials configured — Dev Mode.");
  return { sent: false, error: "Email credentials not configured in backend/.env" };
}

/**
 * Format a Date or timestamp string into Sri Lanka Time (Asia/Colombo / UTC+5:30)
 * Example output: "09 Sep 2026, 12:17 AM"
 */
export function formatSriLankaDateTime(date = new Date()) {
  try {
    const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
    if (!d || isNaN(d.getTime())) return String(date || "");
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Colombo",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    }).format(d);
  } catch (err) {
    return new Date().toLocaleString("en-US", { timeZone: "Asia/Colombo" });
  }
}

export function formatSriLankaDate(date = new Date()) {
  try {
    const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
    if (!d || isNaN(d.getTime())) return String(date || "");
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Colombo",
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(d);
  } catch (err) {
    return new Date().toLocaleDateString("en-US", { timeZone: "Asia/Colombo" });
  }
}

export function formatSriLankaTime(date = new Date()) {
  try {
    const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
    if (!d || isNaN(d.getTime())) return String(date || "");
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Colombo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    }).format(d);
  } catch (err) {
    return new Date().toLocaleTimeString("en-US", { timeZone: "Asia/Colombo" });
  }
}

export function getBaseTemplate(title, bodyHtml, footerNote = "Sanasa General Insurance • Sri Lanka") {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap');
          body {
            margin: 0;
            padding: 0;
            background-color: #f3f7f9;
            font-family: 'Outfit', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            -webkit-font-smoothing: antialiased;
          }
          .email-container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(15, 45, 74, 0.08);
            border: 1px solid rgba(15, 45, 74, 0.06);
            overflow: hidden;
          }
          .email-header {
            background: linear-gradient(135deg, #0f2d4a 0%, #1e4670 100%);
            padding: 40px 30px;
            text-align: center;
            border-bottom: 4px solid #00ddff;
          }
          .email-header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 26px;
            font-weight: 700;
            letter-spacing: 0.5px;
          }
          .email-header p {
            color: rgba(255, 255, 255, 0.8);
            margin: 8px 0 0;
            font-size: 14px;
            font-weight: 300;
          }
          .email-body {
            padding: 40px 35px;
            color: #2d3748;
            line-height: 1.7;
            font-size: 15px;
          }
          .email-body h2 {
            color: #0f2d4a;
            font-size: 20px;
            margin-top: 0;
            margin-bottom: 16px;
            font-weight: 600;
          }
          .email-body p {
            margin: 0 0 20px;
            color: #4a5568;
          }
          .data-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            margin: 25px 0;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
          }
          .data-table tr:nth-child(even) {
            background-color: #f7fafc;
          }
          .data-table td {
            padding: 14px 16px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 14px;
          }
          .data-table tr:last-child td {
            border-bottom: none;
          }
          .label {
            font-weight: 600;
            color: #4a5568;
            width: 35%;
            border-right: 1px solid #edf2f7;
          }
          .value {
            color: #1a202c;
            padding-left: 20px;
          }
          .highlight-value {
            color: #0f2d4a;
            font-weight: 700;
          }
          .otp-code {
            display: inline-block;
            background: #f7fafc;
            color: #0f2d4a;
            font-size: 36px;
            font-weight: 700;
            letter-spacing: 8px;
            padding: 16px 32px;
            border-radius: 12px;
            font-family: monospace;
            border: 2px dashed #00ddff;
            margin: 20px 0;
          }
          .email-footer {
            background-color: #f7fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #edf2f7;
            color: #718096;
            font-size: 12px;
          }
          @media only screen and (max-width: 600px) {
            .email-container {
              margin: 0;
              border-radius: 0;
              box-shadow: none;
              border: none;
            }
            .email-body {
              padding: 30px 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="email-header">
            <h1>Sanasa Insurance</h1>
            <p>Reliable Protection, Always Close to You</p>
          </div>
          <div class="email-body">
            ${bodyHtml}
          </div>
          <div class="email-footer">
            <p>${footerNote}</p>
            <p style="margin-top: 10px; font-size: 11px; color: #a0aec0;">
              This is an automated system notification. Please do not reply directly to this email.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function sendAgentActivityEmail(agentEmail, activityType, claim, customMessage = "") {
  try {
    if (!agentEmail || agentEmail.trim() === "") return;
    
    const Agent = mongoose.model("Agent");
    const agent = await Agent.findOne({ email: agentEmail.trim().toLowerCase() });
    const agentName = agent ? agent.name : "Agent";

    const subject = `[Sanasa Activity Update] - Claim: ${claim.claimNumber}`;
    const formattedTime = formatSriLankaDateTime(new Date());
    
    const bodyHtml = `
      <h2>New Claim Activity Update</h2>
      <p>Dear <strong>${agentName}</strong>,</p>
      <p>There has been a new update/activity on a claim assigned to you:</p>
      <table class="data-table" style="border-collapse: collapse; width: 100%; max-width: 500px; margin: 20px 0; font-size: 14px; border: 1px solid #edf2f7;">
        <tr style="border-bottom: 1px solid #edf2f7; background-color: #f7fafc;">
          <td style="padding: 10px; font-weight: bold; width: 150px; color: #4a5568;">Claim Number:</td>
          <td style="padding: 10px; color: #2d3748; font-weight: 600;">${claim.claimNumber}</td>
        </tr>
        <tr style="border-bottom: 1px solid #edf2f7;">
          <td style="padding: 10px; font-weight: bold; color: #4a5568;">Vehicle No:</td>
          <td style="padding: 10px; color: #2d3748;">${claim.vehiclePlate}</td>
        </tr>
        <tr style="border-bottom: 1px solid #edf2f7; background-color: #f7fafc;">
          <td style="padding: 10px; font-weight: bold; color: #4a5568;">Activity:</td>
          <td style="padding: 10px; color: #f97316; font-weight: bold;">${activityType}</td>
        </tr>
        <tr style="border-bottom: 1px solid #edf2f7;">
          <td style="padding: 10px; font-weight: bold; color: #4a5568;">Current Status:</td>
          <td style="padding: 10px; font-weight: bold; color: #2d3748;">${claim.status} (Step ${claim.currentStep})</td>
        </tr>
        <tr style="border-bottom: 1px solid #edf2f7; background-color: #f7fafc;">
          <td style="padding: 10px; font-weight: bold; color: #4a5568;">Updated At:</td>
          <td style="padding: 10px; color: #2d3748;">${formattedTime} (Sri Lanka Time)</td>
        </tr>
      </table>
      ${customMessage ? `<p style="background-color: #ebf8ff; border-left: 4px solid #3182ce; padding: 12px; border-radius: 4px; font-style: italic; font-size: 14px; margin-top: 15px; margin-bottom: 15px;">${customMessage}</p>` : ""}
      <p style="margin-top: 20px;">Please log in to your Agent portal to view the details and proceed with the necessary steps.</p>
    `;

    const htmlBody = getBaseTemplate(subject, bodyHtml);
    await sendEmail(agentEmail.trim().toLowerCase(), subject, htmlBody);
    console.log(`✅ Activity email sent successfully to Agent: ${agentEmail}`);
  } catch (error) {
    console.error("❌ Error sending agent activity email:", error);
  }
}

export async function sendProfileUpdateStatusEmail(userEmail, userName, status, requestType, reviewNote = "", branch = "Galle") {
  try {
    if (!userEmail || userEmail.trim() === "") return;

    const cleanEmail = userEmail.trim().toLowerCase();
    const isApproved = status === "Approved";
    const subject = isApproved
      ? `[Sanasa Insurance] Profile Update Approved - ${branch} Branch`
      : `[Sanasa Insurance] Profile Update Rejected - ${branch} Branch`;

    const formattedTime = formatSriLankaDateTime(new Date());

    const bodyHtml = `
      <h2 style="color: ${isApproved ? '#059669' : '#dc2626'}; margin-top: 0;">
        ${isApproved ? "Profile & Document Changes Approved" : "Profile & Document Changes Rejected"}
      </h2>
      <p>Dear <strong>${userName || "Policy Holder"}</strong>,</p>
      <p>
        Your recent request to update your <strong>${requestType || "Personal Information & Documents"}</strong> 
        has been reviewed by the <strong>${branch} Branch</strong> team.
      </p>

      <table class="data-table" style="border-collapse: collapse; width: 100%; max-width: 540px; margin: 20px 0; font-size: 14px; border: 1px solid #edf2f7; border-radius: 8px; overflow: hidden;">
        <tr style="border-bottom: 1px solid #edf2f7; background-color: #f7fafc;">
          <td style="padding: 12px 16px; font-weight: 600; width: 35%; color: #4a5568;">Review Status:</td>
          <td style="padding: 12px 16px; color: ${isApproved ? '#059669' : '#dc2626'}; font-weight: 700;">
            ${status.toUpperCase()}
          </td>
        </tr>
        <tr style="border-bottom: 1px solid #edf2f7;">
          <td style="padding: 12px 16px; font-weight: 600; color: #4a5568;">Category:</td>
          <td style="padding: 12px 16px; color: #1a202c; font-weight: 600;">${requestType || "Personal & Contact Information"}</td>
        </tr>
        <tr style="border-bottom: 1px solid #edf2f7; background-color: #f7fafc;">
          <td style="padding: 12px 16px; font-weight: 600; color: #4a5568;">Reviewing Branch:</td>
          <td style="padding: 12px 16px; color: #1a202c;">${branch} Branch Office</td>
        </tr>
        <tr style="border-bottom: 1px solid #edf2f7;">
          <td style="padding: 12px 16px; font-weight: 600; color: #4a5568;">Processed At:</td>
          <td style="padding: 12px 16px; color: #1a202c;">${formattedTime} (Sri Lanka Time)</td>
        </tr>
        ${
          reviewNote
            ? `
        <tr style="background-color: ${isApproved ? '#ecfdf5' : '#fef2f2'};">
          <td style="padding: 12px 16px; font-weight: 600; color: #4a5568;">Branch Note / Reason:</td>
          <td style="padding: 12px 16px; color: ${isApproved ? '#065f46' : '#991b1b'}; font-weight: 500;">
            ${reviewNote}
          </td>
        </tr>
        `
            : ""
        }
      </table>

      ${
        isApproved
          ? `
        <p style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 14px; border-radius: 6px; font-size: 14px; color: #065f46;">
          ✅ Your official policy records and verified documents have been updated successfully in our database.
        </p>
      `
          : `
        <p style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px; border-radius: 6px; font-size: 14px; color: #991b1b;">
          ⚠️ Your requested changes were not approved. Please review the branch note above, verify your documents or details, and re-submit if required.
        </p>
      `
      }

      <p style="margin-top: 25px; font-size: 14px; color: #4a5568;">
        You can log in to your Sanasa Insurance Policy Holder portal anytime to view your profile and notifications.
      </p>
    `;

    const htmlBody = getBaseTemplate(subject, bodyHtml, `Sanasa General Insurance • ${branch} Branch`);
    await sendEmail(cleanEmail, subject, htmlBody);
    console.log(`✅ Profile update status email sent successfully to ${cleanEmail}`);
  } catch (error) {
    console.error("❌ Error sending profile update status email:", error);
  }
}

export async function sendAgentProfileUpdateStatusEmail(agentEmail, agentName, agentId, status, requestType, reviewNote = "", branch = "Galle") {
  try {
    if (!agentEmail || agentEmail.trim() === "") return;

    const cleanEmail = agentEmail.trim().toLowerCase();
    const isApproved = status === "Approved";
    const subject = isApproved
      ? `[Sanasa Insurance] Agent Profile Update Approved (${agentId || "Field Agent"}) - ${branch} Branch`
      : `[Sanasa Insurance] Agent Profile Update Rejected (${agentId || "Field Agent"}) - ${branch} Branch`;

    const formattedTime = formatSriLankaDateTime(new Date());

    const bodyHtml = `
      <h2 style="color: ${isApproved ? '#059669' : '#dc2626'}; margin-top: 0;">
        ${isApproved ? "Agent Profile Update Approved" : "Agent Profile Update Rejected"}
      </h2>
      <p>Dear <strong>${agentName || "Insurance Field Agent"}</strong> (ID: <strong>${agentId || "AGT-0001"}</strong>),</p>
      <p>
        Your recent request to update your <strong>${requestType || "Agent Profile & Contact Details"}</strong> 
        has been reviewed and processed by the <strong>${branch} Branch Management</strong>.
      </p>

      <table class="data-table" style="border-collapse: collapse; width: 100%; max-width: 540px; margin: 20px 0; font-size: 14px; border: 1px solid #edf2f7; border-radius: 8px; overflow: hidden;">
        <tr style="border-bottom: 1px solid #edf2f7; background-color: #f7fafc;">
          <td style="padding: 12px 16px; font-weight: 600; width: 35%; color: #4a5568;">Review Status:</td>
          <td style="padding: 12px 16px; color: ${isApproved ? '#059669' : '#dc2626'}; font-weight: 700;">
            ${status.toUpperCase()}
          </td>
        </tr>
        <tr style="border-bottom: 1px solid #edf2f7;">
          <td style="padding: 12px 16px; font-weight: 600; color: #4a5568;">Category:</td>
          <td style="padding: 12px 16px; color: #1a202c; font-weight: 600;">${requestType || "Personal & Contact Information"}</td>
        </tr>
        <tr style="border-bottom: 1px solid #edf2f7; background-color: #f7fafc;">
          <td style="padding: 12px 16px; font-weight: 600; color: #4a5568;">Assigned Branch:</td>
          <td style="padding: 12px 16px; color: #1a202c;">${branch} Branch Office</td>
        </tr>
        <tr style="border-bottom: 1px solid #edf2f7;">
          <td style="padding: 12px 16px; font-weight: 600; color: #4a5568;">Processed At:</td>
          <td style="padding: 12px 16px; color: #1a202c;">${formattedTime} (Sri Lanka Time)</td>
        </tr>
        ${
          reviewNote
            ? `
        <tr style="background-color: ${isApproved ? '#ecfdf5' : '#fef2f2'};">
          <td style="padding: 12px 16px; font-weight: 600; color: #4a5568;">Branch Review Note:</td>
          <td style="padding: 12px 16px; color: ${isApproved ? '#065f46' : '#991b1b'}; font-weight: 500;">
            ${reviewNote}
          </td>
        </tr>
        `
            : ""
        }
      </table>

      ${
        isApproved
          ? `
        <p style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 14px; border-radius: 6px; font-size: 14px; color: #065f46;">
          ✅ Your agent profile credentials, contact details, and settlement information have been updated across Sanasa Insurance systems.
        </p>
      `
          : `
        <p style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px; border-radius: 6px; font-size: 14px; color: #991b1b;">
          ⚠️ Your profile update request was not approved. Please review the branch note above or reach out to your branch staff.
        </p>
      `
      }

      <p style="margin-top: 25px; font-size: 14px; color: #4a5568;">
        You can log in to your Sanasa Agent portal anytime to view your assigned claims and profile records.
      </p>
    `;

    const htmlBody = getBaseTemplate(subject, bodyHtml, `Sanasa General Insurance • ${branch} Branch`);
    await sendEmail(cleanEmail, subject, htmlBody);
    console.log(`✅ Agent profile update status email sent successfully to ${cleanEmail}`);
  } catch (error) {
    console.error("❌ Error sending agent profile update status email:", error);
  }
}

export async function sendBranchProfileUpdateStatusEmail(branchEmail, branchName, staffName, status, requestType, reviewNote = "") {
  try {
    if (!branchEmail || branchEmail.trim() === "") return;

    const cleanEmail = branchEmail.trim().toLowerCase();
    const isApproved = status === "Approved";
    const subject = isApproved
      ? `[Sanasa Insurance] Branch Profile Update Approved — ${branchName || "Branch Office"}`
      : `[Sanasa Insurance] Branch Profile Update Review Decision — ${branchName || "Branch Office"}`;

    const formattedTime = formatSriLankaDateTime(new Date());

    const bodyHtml = `
      <h2 style="color: ${isApproved ? '#059669' : '#dc2626'}; margin-top: 0;">
        ${isApproved ? "Branch Profile Update Approved" : "Branch Profile Update Not Approved"}
      </h2>
      <p>Dear <strong>${staffName || branchName || "Branch Team"}</strong>,</p>
      <p>
        The request to update branch profile and operational details for the <strong>${branchName} Branch</strong> 
        has been reviewed by the <strong>Head Office Administration</strong>.
      </p>

      <table class="data-table" style="border-collapse: collapse; width: 100%; max-width: 540px; margin: 20px 0; font-size: 14px; border: 1px solid #edf2f7; border-radius: 8px; overflow: hidden;">
        <tr style="border-bottom: 1px solid #edf2f7; background-color: #f7fafc;">
          <td style="padding: 12px 16px; font-weight: 600; width: 35%; color: #4a5568;">Review Status:</td>
          <td style="padding: 12px 16px; color: ${isApproved ? '#059669' : '#dc2626'}; font-weight: 700;">
            ${status.toUpperCase()}
          </td>
        </tr>
        <tr style="border-bottom: 1px solid #edf2f7;">
          <td style="padding: 12px 16px; font-weight: 600; color: #4a5568;">Category:</td>
          <td style="padding: 12px 16px; color: #1a202c; font-weight: 600;">${requestType || "Branch Details & Operations"}</td>
        </tr>
        <tr style="border-bottom: 1px solid #edf2f7; background-color: #f7fafc;">
          <td style="padding: 12px 16px; font-weight: 600; color: #4a5568;">Reviewing Authority:</td>
          <td style="padding: 12px 16px; color: #1a202c;">Sanasa General Insurance Head Office</td>
        </tr>
        <tr style="border-bottom: 1px solid #edf2f7;">
          <td style="padding: 12px 16px; font-weight: 600; color: #4a5568;">Processed At:</td>
          <td style="padding: 12px 16px; color: #1a202c;">${formattedTime} (Sri Lanka Time)</td>
        </tr>
        ${
          reviewNote
            ? `
        <tr style="background-color: ${isApproved ? '#ecfdf5' : '#fef2f2'};">
          <td style="padding: 12px 16px; font-weight: 600; color: #4a5568;">Admin Note / Remarks:</td>
          <td style="padding: 12px 16px; color: ${isApproved ? '#065f46' : '#991b1b'}; font-weight: 500;">
            ${reviewNote}
          </td>
        </tr>
        `
            : ""
        }
      </table>

      ${
        isApproved
          ? `
        <p style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 14px; border-radius: 6px; font-size: 14px; color: #065f46;">
          ✅ Your branch details and operational directory have been updated successfully in the centralized Sanasa Insurance database.
        </p>
      `
          : `
        <p style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px; border-radius: 6px; font-size: 14px; color: #991b1b;">
          ⚠️ Your branch modification request was not approved. Please check the remarks above and consult Head Office Administration if needed.
        </p>
      `
      }

      <p style="margin-top: 25px; font-size: 14px; color: #4a5568;">
        You can log in to the Sanasa Branch Office portal to view your branch profile, active claims, and assigned agents.
      </p>
    `;

    const htmlBody = getBaseTemplate(subject, bodyHtml, "Sanasa General Insurance • Head Office");
    await sendEmail(cleanEmail, subject, htmlBody);
    console.log(`✅ Branch profile update status email sent successfully to ${cleanEmail}`);
  } catch (error) {
    console.error("❌ Error sending branch profile update status email:", error);
  }
}

/**
 * Send Policy Renewal Quote Emails to both Policy Holder and Branch Staff
 */
export async function sendRenewalQuoteCalculatedEmails({ user, vehicle, renewal, staffName = "Branch Staff", branch = "Galle" }) {
  try {
    const formattedTime = formatSriLankaDateTime(new Date());
    const totalAmount = renewal.calculation?.totalRenewalAmount || 0;
    const valuation = renewal.calculation?.marketValuation || 0;
    const ncb = renewal.calculation?.noClaimBonusDiscount || 0;
    const expiryStr = formatSriLankaDate(renewal.currentExpiryDate);
    const newExpiryStr = formatSriLankaDate(renewal.newExpiryDate);

    // 1. Send to Policy Holder if email exists
    if (user && user.email) {
      const subject = `[Sanasa Insurance] Vehicle Policy Renewal Quote Ready - ${vehicle.numberPlate}`;
      const policyHolderHtml = `
        <h2 style="color: #0f2d4a; margin-top: 0;">Vehicle Policy Renewal Quote Ready</h2>
        <p>Dear <strong>${user.firstName} ${user.lastName}</strong>,</p>
        <p>
          A comprehensive license and policy coverage renewal quote has been prepared for your registered vehicle 
          by our <strong>${branch} Branch</strong> team.
        </p>

        <table class="data-table" style="border-collapse: collapse; width: 100%; max-width: 540px; margin: 20px 0; font-size: 14px; border: 1px solid #edf2f7; border-radius: 8px; overflow: hidden;">
          <tr style="border-bottom: 1px solid #edf2f7; background-color: #f7fafc;">
            <td style="padding: 12px 16px; font-weight: 600; width: 40%; color: #4a5568;">Vehicle Number:</td>
            <td style="padding: 12px 16px; color: #0f2d4a; font-weight: 700;">${vehicle.numberPlate}</td>
          </tr>
          <tr style="border-bottom: 1px solid #edf2f7;">
            <td style="padding: 12px 16px; font-weight: 600; color: #4a5568;">Make & Model:</td>
            <td style="padding: 12px 16px; color: #1a202c; font-weight: 600;">${vehicle.company} ${vehicle.model} (${vehicle.year || ""})</td>
          </tr>
          <tr style="border-bottom: 1px solid #edf2f7; background-color: #f7fafc;">
            <td style="padding: 12px 16px; font-weight: 600; color: #4a5568;">Policy Number:</td>
            <td style="padding: 12px 16px; color: #1a202c; font-family: monospace;">${vehicle.policyNumber || "N/A"}</td>
          </tr>
          <tr style="border-bottom: 1px solid #edf2f7;">
            <td style="padding: 12px 16px; font-weight: 600; color: #4a5568;">Current Expiration:</td>
            <td style="padding: 12px 16px; color: #dc2626; font-weight: 600;">${expiryStr}</td>
          </tr>
          <tr style="border-bottom: 1px solid #edf2f7; background-color: #f7fafc;">
            <td style="padding: 12px 16px; font-weight: 600; color: #4a5568;">Extended Validity Period:</td>
            <td style="padding: 12px 16px; color: #059669; font-weight: 600;">Until ${newExpiryStr}</td>
          </tr>
          <tr style="border-bottom: 1px solid #edf2f7;">
            <td style="padding: 12px 16px; font-weight: 600; color: #4a5568;">Market Valuation:</td>
            <td style="padding: 12px 16px; color: #1a202c;">LKR ${Number(valuation).toLocaleString()}</td>
          </tr>
          <tr style="border-bottom: 1px solid #edf2f7; background-color: #f7fafc;">
            <td style="padding: 12px 16px; font-weight: 600; color: #4a5568;">No-Claim Bonus (NCB):</td>
            <td style="padding: 12px 16px; color: #059669; font-weight: 600;">${ncb}% Discount Applied</td>
          </tr>
          <tr style="border-bottom: 1px solid #edf2f7; background-color: #eff6ff;">
            <td style="padding: 12px 16px; font-weight: 700; color: #1e3a8a;">Total Renewal Amount:</td>
            <td style="padding: 12px 16px; color: #1e3a8a; font-weight: 800; font-size: 16px;">
              LKR ${Number(totalAmount).toLocaleString()}
            </td>
          </tr>
        </table>

        <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 14px; border-radius: 6px; font-size: 14px; color: #065f46; margin: 20px 0;">
          <strong>Flexible Payment Options Available:</strong>
          <ul style="margin: 8px 0 0; padding-left: 20px;">
            <li><strong>Full 1-Year Payment:</strong> LKR ${Number(totalAmount).toLocaleString()}</li>
            <li><strong>Semi-Annual (2 Installments):</strong> 50% upfront + 50% at 6 months</li>
            <li><strong>Quarterly (4 Installments):</strong> 4 equal payments every 3 months</li>
          </ul>
        </div>

        <p style="margin-top: 20px; font-size: 14px; color: #4a5568;">
          Please log in to your <strong>Sanasa Mobile App</strong> or <strong>Web Portal</strong> under <em>My Vehicles</em> to review details, select your preferred plan, and instantly renew your license coverage with secure online payment.
        </p>
      `;

      const htmlBody = getBaseTemplate(subject, policyHolderHtml, `Sanasa General Insurance • ${branch} Branch`);
      await sendEmail(user.email.trim().toLowerCase(), subject, htmlBody);
      console.log(`✅ Renewal quote notification sent to Policyholder: ${user.email}`);
    }

    // 2. Send to Branch Staff
    let branchEmail = "";
    try {
      const OfficeStaff = mongoose.model("OfficeStaff");
      const branchStaff = await OfficeStaff.findOne({
        branch: { $regex: new RegExp(`^${(branch || user.branch || "").trim()}$`, "i") }
      });
      branchEmail = branchStaff?.email || branchStaff?.managerEmail || "";
    } catch (e) {
      console.warn("Could not find branch staff email:", e);
    }

    if (branchEmail) {
      const branchSubject = `[Branch Record] Policy Renewal Quote Generated — ${vehicle.numberPlate} (${branch} Branch)`;
      const branchHtml = `
        <h2 style="color: #0f2d4a; margin-top: 0;">Policy Renewal Quote Recorded</h2>
        <p>Dear <strong>${branch} Branch Team</strong>,</p>
        <p>
          A new vehicle policy renewal quote has been calculated and dispatched to the policyholder:
        </p>

        <table class="data-table" style="border-collapse: collapse; width: 100%; max-width: 540px; margin: 20px 0; font-size: 14px; border: 1px solid #edf2f7; border-radius: 8px; overflow: hidden;">
          <tr style="border-bottom: 1px solid #edf2f7; background-color: #f7fafc;">
            <td style="padding: 12px 16px; font-weight: 600; width: 40%; color: #4a5568;">Policy Holder Name:</td>
            <td style="padding: 12px 16px; color: #1a202c; font-weight: 700;">${user.firstName} ${user.lastName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #edf2f7;">
            <td style="padding: 12px 16px; font-weight: 600; color: #4a5568;">NIC / Mobile:</td>
            <td style="padding: 12px 16px; color: #1a202c;">${user.nic} | ${user.mobile}</td>
          </tr>
          <tr style="border-bottom: 1px solid #edf2f7; background-color: #f7fafc;">
            <td style="padding: 12px 16px; font-weight: 600; color: #4a5568;">Vehicle Number:</td>
            <td style="padding: 12px 16px; color: #0f2d4a; font-weight: 700;">${vehicle.numberPlate} (${vehicle.company} ${vehicle.model})</td>
          </tr>
          <tr style="border-bottom: 1px solid #edf2f7;">
            <td style="padding: 12px 16px; font-weight: 600; color: #4a5568;">Policy Number:</td>
            <td style="padding: 12px 16px; color: #1a202c; font-family: monospace;">${vehicle.policyNumber || "N/A"}</td>
          </tr>
          <tr style="border-bottom: 1px solid #edf2f7; background-color: #f7fafc;">
            <td style="padding: 12px 16px; font-weight: 600; color: #4a5568;">Total Renewal Amount:</td>
            <td style="padding: 12px 16px; color: #0284c7; font-weight: 800;">LKR ${Number(totalAmount).toLocaleString()}</td>
          </tr>
          <tr style="border-bottom: 1px solid #edf2f7;">
            <td style="padding: 12px 16px; font-weight: 600; color: #4a5568;">Calculated By:</td>
            <td style="padding: 12px 16px; color: #1a202c;">${staffName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #edf2f7; background-color: #f7fafc;">
            <td style="padding: 12px 16px; font-weight: 600; color: #4a5568;">Processed At:</td>
            <td style="padding: 12px 16px; color: #1a202c;">${formattedTime} (Sri Lanka Time)</td>
          </tr>
        </table>
      `;

      const branchBody = getBaseTemplate(branchSubject, branchHtml, `Sanasa General Insurance • ${branch} Branch Operations`);
      await sendEmail(branchEmail.trim().toLowerCase(), branchSubject, branchBody);
      console.log(`✅ Renewal quote record email sent to Branch: ${branchEmail}`);
    }
  } catch (error) {
    console.error("❌ Error sending renewal quote emails:", error);
  }
}

/**
 * Send Policy Renewal Payment Confirmation Emails to both Policy Holder and Branch Staff
 */
export async function sendRenewalPaymentSuccessEmails({ user, vehiclePlate, renewal, installmentPaid = 1, amountPaid, branch = "Galle" }) {
  try {
    const formattedTime = formatSriLankaDateTime(new Date());
    const totalRenewal = renewal.calculation?.totalRenewalAmount || amountPaid;
    const planType = renewal.selectedPlan || "Comprehensive Annual Policy";
    const newExpiry = formatSriLankaDate(renewal.newExpiryDate);

    // 1. Send to Policyholder
    if (user && user.email) {
      const subject = `[Sanasa Insurance] Payment Received & Coverage Extended - ${vehiclePlate}`;
      const policyHolderHtml = `
        <h2 style="color: #059669; margin-top: 0;">Policy Renewal Payment Confirmed</h2>
        <p>Dear <strong>${user.firstName} ${user.lastName}</strong>,</p>
        <p>
          Thank you for renewing your vehicle insurance policy with Sanasa General Insurance. 
          Your payment has been successfully processed and verified.
        </p>

        <table class="data-table" style="border-collapse: collapse; width: 100%; max-width: 540px; margin: 20px 0; font-size: 14px; border: 1px solid #edf2f7; border-radius: 8px; overflow: hidden;">
          <tr style="border-bottom: 1px solid #edf2f7; background-color: #ecfdf5;">
            <td style="padding: 12px 16px; font-weight: 700; width: 40%; color: #065f46;">Payment Status:</td>
            <td style="padding: 12px 16px; color: #059669; font-weight: 800;">VERIFIED & PAID</td>
          </tr>
          <tr style="border-bottom: 1px solid #edf2f7;">
            <td style="padding: 12px 16px; font-weight: 600; color: #4a5568;">Vehicle Number:</td>
            <td style="padding: 12px 16px; color: #0f2d4a; font-weight: 700;">${vehiclePlate}</td>
          </tr>
          <tr style="border-bottom: 1px solid #edf2f7; background-color: #f7fafc;">
            <td style="padding: 12px 16px; font-weight: 600; color: #4a5568;">Selected Plan:</td>
            <td style="padding: 12px 16px; color: #1a202c; font-weight: 600;">${planType}</td>
          </tr>
          <tr style="border-bottom: 1px solid #edf2f7;">
            <td style="padding: 12px 16px; font-weight: 600; color: #4a5568;">Installment Paid:</td>
            <td style="padding: 12px 16px; color: #1a202c;">Installment #${installmentPaid}</td>
          </tr>
          <tr style="border-bottom: 1px solid #edf2f7; background-color: #eff6ff;">
            <td style="padding: 12px 16px; font-weight: 700; color: #1e3a8a;">Amount Paid:</td>
            <td style="padding: 12px 16px; color: #1e3a8a; font-weight: 800; font-size: 16px;">
              LKR ${Number(amountPaid).toLocaleString()}
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #edf2f7;">
            <td style="padding: 12px 16px; font-weight: 600; color: #4a5568;">New Coverage Expiry:</td>
            <td style="padding: 12px 16px; color: #059669; font-weight: 700;">${newExpiry}</td>
          </tr>
          <tr style="border-bottom: 1px solid #edf2f7; background-color: #f7fafc;">
            <td style="padding: 12px 16px; font-weight: 600; color: #4a5568;">Servicing Branch:</td>
            <td style="padding: 12px 16px; color: #1a202c;">${branch} Branch</td>
          </tr>
          <tr style="border-bottom: 1px solid #edf2f7;">
            <td style="padding: 12px 16px; font-weight: 600; color: #4a5568;">Payment Timestamp:</td>
            <td style="padding: 12px 16px; color: #1a202c;">${formattedTime}</td>
          </tr>
        </table>

        <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 14px; border-radius: 6px; font-size: 14px; color: #065f46; margin: 20px 0;">
          ✅ <strong>Official Digital Cover Note:</strong> You can download or print your official stamped Cover Note certificate anytime directly from your Policyholder portal or mobile app under <em>My Vehicles</em>.
        </div>
      `;

      const htmlBody = getBaseTemplate(subject, policyHolderHtml, `Sanasa General Insurance • ${branch} Branch`);
      await sendEmail(user.email.trim().toLowerCase(), subject, htmlBody);
      console.log(`✅ Renewal payment confirmation email sent to Policyholder: ${user.email}`);
    }

    // 2. Send to Branch Staff
    let branchEmail = "";
    try {
      const OfficeStaff = mongoose.model("OfficeStaff");
      const branchStaff = await OfficeStaff.findOne({
        branch: { $regex: new RegExp(`^${(branch || user?.branch || renewal.branch || "").trim()}$`, "i") }
      });
      branchEmail = branchStaff?.email || branchStaff?.managerEmail || "";
    } catch (e) {
      console.warn("Could not find branch staff email:", e);
    }

    if (branchEmail) {
      const branchSubject = `[Payment Received] Vehicle Policy Renewal — ${vehiclePlate} (${branch} Branch)`;
      const branchHtml = `
        <h2 style="color: #059669; margin-top: 0;">Policy Renewal Payment Received</h2>
        <p>Dear <strong>${branch} Branch Staff</strong>,</p>
        <p>
          Online renewal payment has been successfully completed for vehicle <strong>${vehiclePlate}</strong>:
        </p>

        <table class="data-table" style="border-collapse: collapse; width: 100%; max-width: 540px; margin: 20px 0; font-size: 14px; border: 1px solid #edf2f7; border-radius: 8px; overflow: hidden;">
          <tr style="border-bottom: 1px solid #edf2f7; background-color: #f7fafc;">
            <td style="padding: 12px 16px; font-weight: 600; width: 40%; color: #4a5568;">Policyholder:</td>
            <td style="padding: 12px 16px; color: #1a202c; font-weight: 700;">${user ? `${user.firstName} ${user.lastName}` : renewal.ownerName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #edf2f7;">
            <td style="padding: 12px 16px; font-weight: 600; color: #4a5568;">NIC / Phone:</td>
            <td style="padding: 12px 16px; color: #1a202c;">${user?.nic || renewal.nic} | ${user?.mobile || renewal.contactNumber}</td>
          </tr>
          <tr style="border-bottom: 1px solid #edf2f7; background-color: #f7fafc;">
            <td style="padding: 12px 16px; font-weight: 600; color: #4a5568;">Vehicle Number:</td>
            <td style="padding: 12px 16px; color: #0f2d4a; font-weight: 700;">${vehiclePlate}</td>
          </tr>
          <tr style="border-bottom: 1px solid #edf2f7;">
            <td style="padding: 12px 16px; font-weight: 600; color: #4a5568;">Amount Paid:</td>
            <td style="padding: 12px 16px; color: #059669; font-weight: 800;">LKR ${Number(amountPaid).toLocaleString()}</td>
          </tr>
          <tr style="border-bottom: 1px solid #edf2f7; background-color: #f7fafc;">
            <td style="padding: 12px 16px; font-weight: 600; color: #4a5568;">Plan Type:</td>
            <td style="padding: 12px 16px; color: #1a202c;">${planType} (Installment #${installmentPaid})</td>
          </tr>
          <tr style="border-bottom: 1px solid #edf2f7;">
            <td style="padding: 12px 16px; font-weight: 600; color: #4a5568;">New Expiry Date:</td>
            <td style="padding: 12px 16px; color: #059669; font-weight: 700;">${newExpiry}</td>
          </tr>
          <tr style="border-bottom: 1px solid #edf2f7; background-color: #f7fafc;">
            <td style="padding: 12px 16px; font-weight: 600; color: #4a5568;">Payment Received At:</td>
            <td style="padding: 12px 16px; color: #1a202c;">${formattedTime}</td>
          </tr>
        </table>
      `;

      const branchBody = getBaseTemplate(branchSubject, branchHtml, `Sanasa General Insurance • ${branch} Branch Collections`);
      await sendEmail(branchEmail.trim().toLowerCase(), branchSubject, branchBody);
      console.log(`✅ Renewal payment notification sent to Branch: ${branchEmail}`);
    }
  } catch (error) {
    console.error("❌ Error sending renewal payment emails:", error);
  }
}


