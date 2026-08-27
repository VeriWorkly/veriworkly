import { config } from "#config";
import { logger } from "#lib/logger";
import {
  renderAdminContactNotificationEmail,
  renderUserContactConfirmationEmail,
} from "#mail/index";
import { sendMail } from "./transporter.js";

/**
 * Dispatches contact form submission:
 * 1. Admin Alert to the configured ADMIN_EMAIL with Reply-To header pointing to the user.
 * 2. Auto-confirmation receipt to the user acknowledging receipt with response SLA.
 */
export async function sendContactEmail(payload: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<void> {
  const adminEmail = (config.admin.email || "admin@veriworkly.com").trim().toLowerCase();
  const receivedAt = new Date().toUTCString();

  const mailData = {
    name: payload.name.trim(),
    email: payload.email.trim().toLowerCase(),
    subject: payload.subject.trim(),
    message: payload.message.trim(),
    receivedAt,
  };

  logger.info("[Contact] Processing contact submission email dispatch", {
    senderEmail: mailData.email,
    adminRecipient: adminEmail,
    subject: mailData.subject,
  });

  // 1. Team/Admin Notification Email (with replyTo set to customer's email)
  const adminSubject = `[VeriWorkly Contact] ${mailData.subject} from ${mailData.name}`;
  const adminText = `New Contact Submission:\n\nFrom: ${mailData.name} <${mailData.email}>\nSubject: ${mailData.subject}\nReceived: ${receivedAt}\n\nMessage:\n${mailData.message}\n\n---\nReply directly to this email to contact the sender.`;
  const adminHtml = renderAdminContactNotificationEmail(mailData);

  // 2. User Auto-Confirmation Receipt Email
  const userSubject = `We've received your message: "${mailData.subject}" – VeriWorkly`;
  const userText = `Hi ${mailData.name},\n\nThank you for reaching out to VeriWorkly! We've received your message regarding "${mailData.subject}".\n\nOur team is reviewing it and will get back to you within 24 to 48 hours.\n\nYour message copy:\n"${mailData.message}"\n\nBest regards,\nThe VeriWorkly Team\nhttps://veriworkly.com`;
  const userHtml = renderUserContactConfirmationEmail(mailData);

  // Send admin notification first
  await sendMail({
    to: adminEmail,
    replyTo: mailData.email,
    subject: adminSubject,
    text: adminText,
    html: adminHtml,
  });

  // Send user confirmation receipt (best-effort: log error if fails, but don't fail entire submission if admin already received it)
  try {
    await sendMail({
      to: mailData.email,
      subject: userSubject,
      text: userText,
      html: userHtml,
    });
    logger.info("[Contact] User confirmation receipt sent successfully", {
      userEmail: mailData.email,
    });
  } catch (userMailError) {
    logger.warn("[Contact] Failed to send user confirmation receipt email (admin email was delivered)", {
      userEmail: mailData.email,
      error: userMailError instanceof Error ? userMailError.message : String(userMailError),
    });
  }
}

