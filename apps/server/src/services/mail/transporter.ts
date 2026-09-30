import nodemailer, { Transporter } from "nodemailer";
import { Resend } from "resend";

import { config, isDevelopment } from "#config";

import { logger } from "#lib/logger";

function validateSmtpConfig() {
  return Boolean(config.auth.smtpHost && config.auth.smtpUser && config.auth.smtpPass);
}

let smtpTransporter: Transporter | null = null;

function getSmtpTransporter() {
  if (!smtpTransporter)
    smtpTransporter = nodemailer.createTransport({
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      host: config.auth.smtpHost,
      port: config.auth.smtpPort,
      secure: config.auth.smtpSecure,
      auth: {
        user: config.auth.smtpUser,
        pass: config.auth.smtpPass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

  return smtpTransporter;
}

let resendClient: Resend | null = null;

function getResendClient() {
  if (!resendClient) {
    resendClient = new Resend(config.auth.resendApiKey);
  }
  return resendClient;
}

/**
 * Base email dispatch handler
 */
export async function sendMail({
  to,
  subject,
  text,
  html,
  replyTo,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}) {
  if (config.auth.emailProvider === "resend") {
    if (!config.auth.resendApiKey) {
      logger.error("[Mail] Missing RESEND_API_KEY for resend email provider");
      throw new Error(
        "Resend provider selected but RESEND_API_KEY environment variable is missing",
      );
    }

    try {
      const resend = getResendClient();
      const { data, error } = await resend.emails.send({
        from: config.auth.emailFrom,
        to,
        subject,
        text,
        html,
        replyTo: replyTo || undefined,
      });

      if (error) {
        logger.error("[Mail] Failed to send email via Resend:", {
          to,
          subject,
          error: error.message,
          name: error.name,
        });
        throw new Error(`Resend email delivery failed: ${error.message}`);
      }

      logger.info("[Mail] Email dispatched successfully via Resend", {
        to,
        subject,
        messageId: data?.id,
      });

      return;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Resend email delivery failed:")) {
        throw error;
      }
      logger.error("[Mail] Unexpected error sending email via Resend:", {
        to,
        subject,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  if (config.auth.emailProvider === "smtp") {
    if (!validateSmtpConfig()) {
      const missing = [
        !config.auth.smtpHost && "AUTH_SMTP_HOST",
        !config.auth.smtpUser && "AUTH_SMTP_USER",
        !config.auth.smtpPass && "AUTH_SMTP_PASS",
      ].filter(Boolean);
      logger.error(`[Mail] Incomplete SMTP config. Missing variables: ${missing.join(", ")}`);
      throw new Error("SMTP provider selected but SMTP environment values are incomplete");
    }

    try {
      const transporter = getSmtpTransporter();

      const info = await transporter.sendMail({
        from: config.auth.emailFrom,
        to,
        replyTo: replyTo || undefined,
        subject,
        text,
        html,
      });

      logger.info("[Mail] Email dispatched successfully via SMTP", {
        to,
        subject,
        messageId: info?.messageId,
        response: info?.response,
      });

      return;
    } catch (error) {
      logger.error("[Mail] Failed to send email via SMTP:", {
        to,
        subject,
        error: error instanceof Error ? error.message : String(error),
        code: (error as Record<string, unknown>)?.code,
      });
      throw error;
    }
  }

  if (!isDevelopment) throw new Error("Console email provider is only available in development");

  logger.info("[Mail] Email sent to console (dev mode)", {
    to,
    replyTo,
    subject,
    text,
  });
}
