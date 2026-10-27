import { getBaseLayout, escapeHtml } from "../shared/layout.js";

import { formatDate, formatMoney, summaryTable } from "./billingFormat.js";

/**
 * A plan change that took effect (V-219): what changed, what the change cost now, and the price
 * and date of the next renewal. An upgrade's difference for the current period is charged at once
 * (owner decision 8); a downgrade (portal only) is not charged, its lower price applies from the
 * renewal (V-279).
 */
export type PlanChangedNotice = {
  fromProductName: string;
  productName: string;
  /**
   * By catalog price. Missing on a notice queued before V-279: the wording then says neither
   * that the customer was charged nor that they were not.
   */
  direction?: "upgrade" | "downgrade";
  /** The new plan's recurring price, in the currency's minor unit; null when not reported. */
  amountCents: number | null;
  currency: string | null;
  amountExcludesTax: boolean;
  billingPeriod: "month" | "year";
  renewsAt: Date | null;
};

function newPrice(details: PlanChangedNotice) {
  if (details.amountCents === null || !details.currency) return null;
  const price = formatMoney(details.amountCents, details.currency);
  return `${details.amountExcludesTax ? `${price} (before any tax)` : price} per ${details.billingPeriod}`;
}

export function planChangedParagraphs(details: PlanChangedNotice): string[] {
  const price = newPrice(details);
  const cost =
    details.direction === "upgrade"
      ? "The difference for the rest of the current billing period was charged when the change was made."
      : details.direction === "downgrade"
        ? "Nothing extra was charged for this change; the new price applies from your next renewal."
        : "Any difference for the rest of the current billing period was settled when the change was made.";
  return [
    `Your plan changed from ${details.fromProductName} to ${details.productName}. ${cost}`,
    details.renewsAt
      ? `From ${formatDate(details.renewsAt)} your plan renews${price ? ` at ${price}` : ""} until you cancel.`
      : `Your plan renews${price ? ` at ${price}` : ""} until you cancel.`,
    "Receipts and invoices are in Billing, under Manage billing. You can cancel there at any time.",
  ];
}

export function renderPlanChangedEmail(name: string, details: PlanChangedNotice): string {
  const sanitizedName = escapeHtml(name || "there");
  const title = "Plan changed";
  const preheader = `Your plan is now ${escapeHtml(details.productName)}.`;
  const rows: Array<[string, string]> = [
    ["Previous plan", escapeHtml(details.fromProductName)],
    ["New plan", escapeHtml(details.productName)],
  ];
  const price = newPrice(details);
  if (price) rows.push(["Price", escapeHtml(price)]);
  if (details.renewsAt) rows.push(["Next renewal", escapeHtml(formatDate(details.renewsAt))]);
  const paragraphs = planChangedParagraphs(details)
    .map(
      (text) =>
        `<p style="margin:0 auto 16px auto;font-size:15px;line-height:1.6;color:#5f5c54;text-align:center;max-width:440px;">${escapeHtml(text)}</p>`,
    )
    .join("\n    ");

  const bodyHtml = `
    <h2 style="margin:0 0 12px 0;font-size:26px;line-height:1.2;font-weight:800;color:#171717;letter-spacing:-0.03em;text-align:center;">
      ${sanitizedName}, your plan has changed
    </h2>
    ${summaryTable(rows)}
    ${paragraphs}

    <p style="margin:0;font-size:13px;line-height:1.6;color:#8f8c85;text-align:center;">
      Questions? Reach us at info@veriworkly.com.
    </p>
  `;

  return getBaseLayout({ title, preheader, bodyHtml });
}
