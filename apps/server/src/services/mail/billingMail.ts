import { logger } from "#lib/logger";

/**
 * Send subscription purchase confirmation email
 */
export async function sendSubscriptionPurchasedEmail(
  email: string,
  name: string,
  planName: string,
): Promise<void> {
  const subject = `Welcome to VeriWorkly Pro: ${planName} Activated!`;
  const text = `Hi ${name},\n\nThank you for subscribing! Your account has been upgraded to ${planName}.`;

  logger.info("[Billing Mail Placeholder] Send subscription purchased email to:", {
    to: email,
    name,
    planName,
    subject,
    text,
  });
}

/**
 * Send subscription cancellation email
 */
export async function sendSubscriptionCancelledEmail(email: string, name: string): Promise<void> {
  const subject = "Your VeriWorkly subscription has been cancelled";
  const text = `Hi ${name},\n\nWe're sorry to see you go. Your subscription has been cancelled.`;

  logger.info("[Billing Mail Placeholder] Send subscription cancelled email to:", {
    to: email,
    name,
    subject,
    text,
  });
}
