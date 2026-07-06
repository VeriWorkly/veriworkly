import nodemailer, { Transporter } from "nodemailer";

import { config, isDevelopment } from "#config";

import { logger } from "#lib/logger";

function validateSmtpConfig() {
  return Boolean(config.auth.smtpHost && config.auth.smtpUser && config.auth.smtpPass);
}

let smtpTransporter: Transporter | null = null;

function getSmtpTransporter() {
  if (!smtpTransporter)
    smtpTransporter = nodemailer.createTransport({
      host: config.auth.smtpHost,
      port: config.auth.smtpPort,
      secure: config.auth.smtpSecure,
      auth: {
        user: config.auth.smtpUser,
        pass: config.auth.smtpPass,
      },
    });

  return smtpTransporter;
}

/**
 * Base email dispatch handler
 */
export async function sendMail({
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
    if (!validateSmtpConfig())
      throw new Error("SMTP provider selected but SMTP environment values are incomplete");

    const transporter = getSmtpTransporter();

    await transporter.sendMail({
      from: config.auth.emailFrom,
      to,
      subject,
      text,
      html,
    });

    return;
  }

  if (!isDevelopment) throw new Error("Console email provider is only available in development");

  logger.info("Email sent to console (dev mode)", {
    to,
    subject,
    text,
  });
}
