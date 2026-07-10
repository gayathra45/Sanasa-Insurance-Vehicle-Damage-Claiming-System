import nodemailer from "nodemailer";
import { Resend } from "resend";
import dotenv from "dotenv";
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
