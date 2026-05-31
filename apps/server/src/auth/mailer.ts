import nodemailer from "nodemailer";

import { config, isDevelopment } from "#config";

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

function getOtpEmailHeadline(type: AuthOtpEmailPayload["type"]) {
  switch (type) {
    case "email-verification":
      return "Verify your email";
    case "forget-password":
      return "Password reset code";
    case "change-email":
      return "Confirm email change";
    case "sign-in":
    default:
      return "Use this code to sign in";
  }
}

function buildOtpEmailHtml(payload: AuthOtpEmailPayload) {
  const headline = getOtpEmailHeadline(payload.type);

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${headline}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 14px;background:#f4f6fb;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:26px 30px;background:linear-gradient(135deg,#0f172a,#1e293b);color:#ffffff;">
                <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.82;">VeriWorkly</div>
                <h1 style="margin:10px 0 0 0;font-size:24px;line-height:1.25;font-weight:700;">${headline}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:30px;">
                <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#374151;">Hi,</p>
                <p style="margin:0 0 20px 0;font-size:15px;line-height:1.7;color:#374151;">
                  Use the one-time verification code below to continue in VeriWorkly.
                </p>
                <div style="margin:20px 0 22px 0;padding:16px 18px;border:1px dashed #c7d2fe;border-radius:12px;background:#eef2ff;text-align:center;">
                  <div style="font-size:34px;letter-spacing:0.35em;font-weight:700;color:#1d4ed8;">${payload.otp}</div>
                </div>
                <p style="margin:0 0 14px 0;font-size:14px;line-height:1.7;color:#4b5563;">
                  This code expires in a few minutes and can only be used once.
                </p>
                <p style="margin:0;font-size:13px;line-height:1.7;color:#6b7280;">
                  If you did not request this code, you can safely ignore this email.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 30px 26px 30px;">
                <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px 0;" />
                <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.7;">
                  VeriWorkly Security Team
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function sendViaSmtp(payload: AuthOtpEmailPayload) {
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
    to: payload.email,
    subject: getOtpEmailSubject(payload.type),
    text: `Your VeriWorkly verification code is: ${payload.otp}`,
    html: buildOtpEmailHtml(payload),
  });
}

export async function sendAuthOtpEmail(payload: AuthOtpEmailPayload): Promise<void> {
  if (config.auth.emailProvider === "smtp") {
    await sendViaSmtp(payload);
    return;
  }

  if (!isDevelopment) {
    throw new Error("Console OTP provider is only available in development");
  }

  logger.info("OTP generated (dev mode)", {
    email: payload.email,
    otp: payload.otp,
    type: payload.type,
  });
}
