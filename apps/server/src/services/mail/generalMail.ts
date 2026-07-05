import { config } from "#config";

import { escapeHtml } from "#mail/shared/layout.js";

import { sendMail } from "./transporter.js";

/**
 * Send contact form submission to admin
 */
export async function sendContactEmail(payload: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<void> {
  const adminEmail = config.admin.email || "admin@veriworkly.com";

  const escapedName = escapeHtml(payload.name);
  const escapedEmail = escapeHtml(payload.email);
  const escapedSubject = escapeHtml(payload.subject);
  const escapedMessage = escapeHtml(payload.message);

  const mailSubject = `[VeriWorkly Contact] ${payload.subject} from ${payload.name}`;
  const text = `Contact Form Submission:\n\nName: ${payload.name}\nEmail: ${payload.email}\nSubject: ${payload.subject}\nMessage:\n${payload.message}`;
  const html = `
    <h2>New Contact Form Submission</h2>
    <p><strong>Name:</strong> ${escapedName}</p>
    <p><strong>Email:</strong> ${escapedEmail}</p>
    <p><strong>Subject:</strong> ${escapedSubject}</p>
    <p><strong>Message:</strong></p>
    <blockquote style="background: #f9f9f9; padding: 10px; border-left: 3px solid #ccc; white-space: pre-wrap;">
      ${escapedMessage.replace(/\n/g, "<br>")}
    </blockquote>
  `;

  await sendMail({ to: adminEmail, subject: mailSubject, text, html });
}
