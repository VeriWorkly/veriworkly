import { config } from "#config";

import {
  type LoginAlertMeta,
  renderOtpEmail,
  renderWelcomeEmail,
  renderLoginAlertEmail,
  renderAccountDeletedEmail,
} from "#mail/index";

import { sendMail } from "./transporter.js";

interface AuthOtpEmailPayload {
  email: string;
  otp: string;
  type: "sign-in" | "email-verification" | "forget-password" | "change-email";
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
  const displayName = !name || name === "Veriworkly User" ? "there" : name;
  const text = `Welcome to VeriWorkly, ${displayName}! Start building your professional documents and portfolio today.`;

  // Resolve dashboard URL
  const dashboardUrl = `${config.auth.baseUrl.replace(/\/api\/v1\/auth\/?$/, "")}/dashboard`;
  const html = renderWelcomeEmail(displayName, dashboardUrl);

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
 * Send account deletion confirmation email
 */
export async function sendAccountDeletedEmail(email: string, name: string): Promise<void> {
  const subject = "Your VeriWorkly Account Has Been Deleted";
  const text = `Hello ${name || "there"},\n\nThis email confirms that your VeriWorkly account has been deleted and all associated data has been permanently removed.`;
  const html = renderAccountDeletedEmail(name);

  await sendMail({ to: email, subject, text, html });
}
