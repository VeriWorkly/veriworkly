import { getBaseLayout, escapeHtml } from "../shared/layout.js";

import { formatDate, formatMoney, summaryTable } from "./billingFormat.js";

/**
 * A subscription charge that failed (V-172): what failed, and what happens next. Owner decision 9
 * (V-215): paid features pause at once (the subscription's grants are revoked on `on_hold`); only
 * a portfolio keeps its grace period and stays online until `graceEndsAt`.
 */
export type PaymentFailedNotice = {
  productName: string;
  amountCents: number | null;
  currency: string | null;
  /** When a published portfolio leaves its grace period if the payment is still outstanding. */
  graceEndsAt: Date;
  /**
   * Whether the plan includes a portfolio (Creator Pro, the bundle): only then does the email
   * mention the portfolio's grace. Missing on claims stored before V-215, read as true.
   */
  includesPortfolio?: boolean;
};

export function paymentFailedParagraphs(details: PaymentFailedNotice): string[] {
  const amount =
    details.amountCents !== null && details.currency
      ? ` of ${formatMoney(details.amountCents, details.currency)}`
      : "";
  const includesPortfolio = details.includesPortfolio !== false;
  return [
    `Your payment${amount} for your ${details.productName} subscription failed. Our payment provider will retry the card automatically.`,
    includesPortfolio
      ? "Pro features are paused until you update your card."
      : `Your ${details.productName} features are paused until you update your card.`,
    ...(includesPortfolio
      ? [`Your portfolio stays online until ${formatDate(details.graceEndsAt)}.`]
      : []),
    "Update your payment method from Billing in VeriWorkly (Manage billing). Nothing you have created is deleted.",
  ];
}

export function renderPaymentFailedEmail(name: string, details: PaymentFailedNotice): string {
  const sanitizedName = escapeHtml(name || "there");
  const product = escapeHtml(details.productName);
  const title = "Payment failed";
  const preheader = `Your payment for ${product} failed. Update your card to continue.`;
  const paragraphs = paymentFailedParagraphs(details)
    .map(
      (text) =>
        `<p style="margin:0 auto 16px auto;font-size:15px;line-height:1.6;color:#5f5c54;text-align:center;max-width:440px;">${escapeHtml(text)}</p>`,
    )
    .join("\n    ");
  const rows: Array<[string, string]> = [["Plan", product]];
  if (details.includesPortfolio !== false)
    rows.push(["Portfolio online until", escapeHtml(formatDate(details.graceEndsAt))]);

  const bodyHtml = `
    <h2 style="margin:0 0 12px 0;font-size:26px;line-height:1.2;font-weight:800;color:#171717;letter-spacing:-0.03em;text-align:center;">
      ${sanitizedName}, your payment did not go through
    </h2>
    ${summaryTable(rows)}
    ${paragraphs}

    <p style="margin:0;font-size:13px;line-height:1.6;color:#8f8c85;text-align:center;">
      Questions? Reach us at info@veriworkly.com.
    </p>
  `;

  return getBaseLayout({ title, preheader, bodyHtml });
}
