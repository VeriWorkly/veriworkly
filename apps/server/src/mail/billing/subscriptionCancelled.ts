import { getBaseLayout, escapeHtml } from "../shared/layout.js";

import { formatDate, summaryTable } from "./billingFormat.js";

/**
 * A subscription set to end (V-212): sent once when the customer cancels (at the end of the
 * period, from the portal or through an admin) or the provider cancels with paid time left. Names
 * the product and the last day of access, as the auto-renewal rules expect a cancellation to be
 * confirmed.
 */
export type SubscriptionCancelledNotice = {
  productName: string;
  /** The end of the period already paid for; null when the provider reported none. */
  accessEndsAt: Date | null;
};

/**
 * Sent per subscription, so it says only what this one's end takes away. It never says the
 * account goes free: the customer may still pay for another plan, a pass or credits (V-334,
 * owner decision 2).
 */
export function subscriptionCancelledParagraphs(details: SubscriptionCancelledNotice): string[] {
  return [
    details.accessEndsAt
      ? `Your ${details.productName} subscription is cancelled and will not renew. You keep everything it includes until ${formatDate(details.accessEndsAt)}; after that, what ${details.productName} includes ends. Any other plans, passes or credits you hold are not affected.`
      : `Your ${details.productName} subscription is cancelled and will not renew. Any other plans, passes or credits you hold are not affected.`,
    "Nothing you have created is deleted. Changed your mind? You can resume or resubscribe from Billing in VeriWorkly.",
  ];
}

export function renderSubscriptionCancelledEmail(
  name: string,
  details: SubscriptionCancelledNotice,
): string {
  const sanitizedName = escapeHtml(name || "there");
  const product = escapeHtml(details.productName);
  const title = "Subscription cancelled";
  const preheader = `Your ${product} subscription will not renew.`;
  const rows: Array<[string, string]> = [["Plan", product]];
  if (details.accessEndsAt)
    rows.push(["Access until", escapeHtml(formatDate(details.accessEndsAt))]);
  const paragraphs = subscriptionCancelledParagraphs(details)
    .map(
      (text) =>
        `<p style="margin:0 auto 16px auto;font-size:15px;line-height:1.6;color:#5f5c54;text-align:center;max-width:440px;">${escapeHtml(text)}</p>`,
    )
    .join("\n    ");

  const bodyHtml = `
    <h2 style="margin:0 0 12px 0;font-size:26px;line-height:1.2;font-weight:800;color:#171717;letter-spacing:-0.03em;text-align:center;">
      Your cancellation is confirmed, ${sanitizedName}
    </h2>
    ${summaryTable(rows)}
    ${paragraphs}

    <p style="margin:0;font-size:13px;line-height:1.6;color:#8f8c85;text-align:center;">
      Questions? Reach us at info@veriworkly.com.
    </p>
  `;

  return getBaseLayout({ title, preheader, bodyHtml });
}
