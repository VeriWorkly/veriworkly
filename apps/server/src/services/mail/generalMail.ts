import { createHash } from "node:crypto";

import { config } from "#config";
import { logger } from "#lib/logger";
import {
  contactReceiptFirstName,
  renderAdminContactNotificationEmail,
  renderContactReceiptEmail,
} from "#mail/index";
import { incrementFixedWindow } from "#middleware/rateLimit";
import { sendMail } from "./transporter.js";

const RECEIPTS_PER_RECIPIENT_PER_DAY = 3;
const RECEIPT_WINDOW_SECONDS = 24 * 60 * 60;

/**
 * Per-recipient cap on receipts: the form is anonymous and the `email` field is anyone's address.
 * Keyed on the trimmed, lower-cased address so case variants share one budget. Without Redis the
 * receipt is skipped (the team notification still goes out).
 */
async function claimReceiptSlot(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  const key = `contact:receipt:${createHash("sha256").update(normalized).digest("hex")}`;

  try {
    const { count } = await incrementFixedWindow(key, RECEIPT_WINDOW_SECONDS);
    return count <= RECEIPTS_PER_RECIPIENT_PER_DAY;
  } catch (error) {
    logger.warn("[Contact] Receipt throttle unavailable; skipping the receipt", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Dispatches contact form submission:
 * 1. Admin Alert to the configured ADMIN_EMAIL with Reply-To header pointing to the user.
 * 2. A fixed receipt to the user (capped per recipient per day), with no submitted content.
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

  // No sender identity or subject in the log (V-255): the privacy policy describes server logs
  // as request metadata, and the admin copy of the message is the record.
  logger.info("[Contact] Processing contact submission email dispatch");

  // 1. Team/Admin Notification Email (with replyTo set to customer's email)
  const adminSubject = `[VeriWorkly Contact] ${mailData.subject} from ${mailData.name}`;
  const adminText = `New Contact Submission:\n\nFrom: ${mailData.name} <${mailData.email}>\nSubject: ${mailData.subject}\nReceived: ${receivedAt}\n\nMessage:\n${mailData.message}\n\n---\nReply directly to this email to contact the sender.`;
  const adminHtml = renderAdminContactNotificationEmail(mailData);

  // Send admin notification first
  await sendMail({
    to: adminEmail,
    replyTo: mailData.email,
    subject: adminSubject,
    text: adminText,
    html: adminHtml,
  });

  if (!(await claimReceiptSlot(mailData.email))) {
    logger.warn("[Contact] Receipt suppressed: per-recipient daily cap reached");
    return;
  }

  // 2. User receipt (best-effort: the admin already has the message)
  try {
    await sendMail({
      to: mailData.email,
      ...renderContactReceiptEmail(contactReceiptFirstName(mailData.name)),
    });
    logger.info("[Contact] User confirmation receipt sent successfully");
  } catch (userMailError) {
    logger.warn(
      "[Contact] Failed to send user confirmation receipt email (admin email was delivered)",
      {
        error: userMailError instanceof Error ? userMailError.message : String(userMailError),
      },
    );
  }
}
