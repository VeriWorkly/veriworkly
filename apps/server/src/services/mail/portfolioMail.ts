import { logger } from "#utils/logger";

/**
 * Send portfolio publication/update email
 */
export async function sendPortfolioUpdatedEmail(
  email: string,
  portfolioUrl: string,
): Promise<void> {
  const subject = "Your VeriWorkly Portfolio is Live!";
  const text = `Your portfolio has been updated successfully and is live at ${portfolioUrl}`;

  logger.info("[Portfolio Mail Placeholder] Send portfolio updated email to: ", {
    to: email,
    subject,
    text,
    portfolioUrl,
  });
}
