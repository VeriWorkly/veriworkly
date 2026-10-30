import { config } from "#config";

import {
  type LoginAlertMeta,
  renderOtpEmail,
  renderWelcomeEmail,
  renderLoginAlertEmail,
  renderAccountDeletedEmail,
} from "#mail/index";

import { sendMail } from "./transporter.js";

/** The support address the site publishes; mails that say "reply to this email" reply here. */
const SUPPORT_REPLY_TO = "info@veriworkly.com";

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
  const ttlMinutes = Math.max(1, Math.round(config.auth.otpTtlSeconds / 60));
  const html = renderOtpEmail(payload.otp, payload.type, ttlMinutes);

  await sendMail({ to: payload.email, subject, text, html });
}

/**
 * Send welcome email to a new user
 */
export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  const subject = "Welcome to VeriWorkly!";
  const displayName = !name || name === "Veriworkly User" ? "there" : name;
  const text = `Welcome to VeriWorkly, ${displayName}! Start building your professional documents and portfolio today.`;

  // The dashboard is the studio's root. AUTH_BASE_URL is the API host, which has no /dashboard.
  const dashboardUrl = `${config.auth.studioUrl.replace(/\/+$/, "")}/`;
  const html = renderWelcomeEmail(displayName, dashboardUrl);

  await sendMail({ to: email, subject, text, html });
}

/**
 * Send security login alert email
 */
export async function sendLoginAlertEmail(email: string, meta: LoginAlertMeta): Promise<void> {
  const subject = "Security Alert: New Sign-in Detected";
  // The studio profile page signs out every other session (S-376): the one thing to do about a
  // sign-in that was not you, or a session left open on a shared computer. A query, not a
  // #fragment, so it survives the sign-in redirect of a reader who is signed out.
  const sessionsUrl = `${config.auth.studioUrl.replace(/\/+$/, "")}/profile?focus=sessions`;
  const text = `A new login was detected on your VeriWorkly account. IP: ${meta.ip}, Device: ${meta.device}, Time: ${meta.timestamp}. Not you, or signed in on a shared computer? Sign out of all other devices: ${sessionsUrl}`;
  const html = renderLoginAlertEmail(email, meta, sessionsUrl);

  await sendMail({ to: email, subject, text, html, replyTo: SUPPORT_REPLY_TO });
}

/**
 * Send account deletion confirmation email
 */
export async function sendAccountDeletedEmail(email: string, name: string): Promise<void> {
  const subject = "Your VeriWorkly Account Has Been Deleted";
  const text = `Hello ${name || "there"},\n\nThis email confirms that your VeriWorkly account has been deleted. Your profile, documents, share links and portfolio have been removed. Records of payments are kept, by us and our payment provider, for as long as the law requires, and copies may remain in backups until those backups expire.`;
  const html = renderAccountDeletedEmail(name);

  await sendMail({ to: email, subject, text, html, replyTo: SUPPORT_REPLY_TO });
}
