import nodemailer from "nodemailer";

import { config, isDevelopment } from "#config";

import {
  type LoginAlertMeta,
  renderOtpEmail,
  renderWelcomeEmail,
  renderLoginAlertEmail,
} from "#mail/index";

import { logger } from "#utils/logger";

interface AuthOtpEmailPayload {
  email: string;
  otp: string;
  type: "sign-in" | "email-verification" | "forget-password" | "change-email";
}

function validateSmtpConfig() {
  return Boolean(config.auth.smtpHost && config.auth.smtpUser && config.auth.smtpPass);
}

function getOtpEmailSubject(type: AuthOtpEmailPayload["type"]) {
  switch (type) {
    case "email-verification":
      return "Verify your VeriWorkly email";
    case "forget-password":
      return "Reset your VeriWorkly password";
    case "change-email":
      return "Confirm your VeriWorkly email change";
    case "sign-in":
    default:
      return "Your VeriWorkly sign-in code";
  }
}

async function sendMail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  if (config.auth.emailProvider === "smtp") {
    if (!validateSmtpConfig()) {
      throw new Error("SMTP provider selected but SMTP environment values are incomplete");
    }

    const transporter = nodemailer.createTransport({
      host: config.auth.smtpHost,
      port: config.auth.smtpPort,
      secure: config.auth.smtpSecure,
      auth: {
        user: config.auth.smtpUser,
        pass: config.auth.smtpPass,
      },
    });

    await transporter.sendMail({
      from: config.auth.emailFrom,
      to,
      subject,
      text,
      html,
    });
    return;
  }

  if (!isDevelopment) {
    throw new Error("Console email provider is only available in development");
  }

  logger.info("Email sent to console (dev mode)", {
    to,
    subject,
    text,
  });
}

/**
 * Send authentication OTP email using premium HTML template
 */
export async function sendAuthOtpEmail(payload: AuthOtpEmailPayload): Promise<void> {
  const subject = getOtpEmailSubject(payload.type);
  const text = `Your VeriWorkly verification code is: ${payload.otp}`;
  const html = renderOtpEmail(payload.otp, payload.type);

  await sendMail({ to: payload.email, subject, text, html });
}

/**
 * Send welcome email to a new user
 */
export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  const subject = "Welcome to VeriWorkly!";
  const text = `Welcome to VeriWorkly, ${name}! Start building your professional documents and portfolio today.`;

  // Resolve dashboard URL
  const dashboardUrl = `${config.auth.baseUrl.replace(/\/api\/v1\/auth\/?$/, "")}/dashboard`;
  const html = renderWelcomeEmail(name, dashboardUrl);

  await sendMail({ to: email, subject, text, html });
}

/**
 * Send security login alert email
 */
export async function sendLoginAlertEmail(email: string, meta: LoginAlertMeta): Promise<void> {
  const subject = "Security Alert: New Sign-in Detected";
  const text = `A new login was detected on your VeriWorkly account. IP: ${meta.ip}, Device: ${meta.device}, Time: ${meta.timestamp}`;
  const html = renderLoginAlertEmail(email, meta);

  await sendMail({ to: email, subject, text, html });
}

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
  const mailSubject = `[VeriWorkly Contact] ${payload.subject} from ${payload.name}`;
  const text = `Contact Form Submission:\n\nName: ${payload.name}\nEmail: ${payload.email}\nSubject: ${payload.subject}\nMessage:\n${payload.message}`;
  const html = `
    <h2>New Contact Form Submission</h2>
    <p><strong>Name:</strong> ${payload.name}</p>
    <p><strong>Email:</strong> ${payload.email}</p>
    <p><strong>Subject:</strong> ${payload.subject}</p>
    <p><strong>Message:</strong></p>
    <blockquote style="background: #f9f9f9; padding: 10px; border-left: 3px solid #ccc; white-space: pre-wrap;">
      ${payload.message.replace(/\n/g, "<br>")}
    </blockquote>
  `;

  await sendMail({ to: adminEmail, subject: mailSubject, text, html });
}
