import {
  paymentFailedParagraphs,
  planChangedParagraphs,
  purchaseConfirmationRows,
  purchaseConfirmationTerms,
  renderPaymentFailedEmail,
  renderPlanChangedEmail,
  renderPurchaseConfirmationEmail,
  renderSubscriptionCancelledEmail,
  subscriptionCancelledParagraphs,
  type PaymentFailedNotice,
  type PlanChangedNotice,
  type PurchaseConfirmation,
  type SubscriptionCancelledNotice,
} from "#mail/index";

import { sendMail } from "./transporter.js";

export type {
  PaymentFailedNotice,
  PlanChangedNotice,
  PurchaseConfirmation,
  SubscriptionCancelledNotice,
};

/**
 * Confirms a purchase (V-177): a new or newly paid subscription, a pass or a credit pack. The
 * subject names the product as sold; nothing here calls AI Credits "Pro".
 */
export async function sendPurchaseConfirmationEmail(
  email: string,
  details: PurchaseConfirmation & { name: string },
): Promise<void> {
  const subject = `Your VeriWorkly purchase is confirmed: ${details.productName}`;
  const text = [
    `Hi ${details.name},`,
    "",
    `Thanks for your purchase. ${details.productName} is active on your account now.`,
    "",
    ...purchaseConfirmationRows(details).map(([label, value]) => `${label}: ${value}`),
    "",
    purchaseConfirmationTerms(details),
    "",
    "Receipts and invoices are in Billing, under Manage billing. Questions? Reach us at info@veriworkly.com.",
  ].join("\n");
  const html = renderPurchaseConfirmationEmail(details.name, details);

  await sendMail({ to: email, subject, text, html });
}

/** A subscription charge failed and dunning has started (V-172, V-215). */
export async function sendPaymentFailedEmail(
  email: string,
  details: PaymentFailedNotice & { name: string },
): Promise<void> {
  const subject = `Payment failed for your VeriWorkly ${details.productName} subscription`;
  const text = [
    `Hi ${details.name},`,
    "",
    ...paymentFailedParagraphs(details).flatMap((p) => [p, ""]),
  ]
    .concat("Questions? Reach us at info@veriworkly.com.")
    .join("\n");
  const html = renderPaymentFailedEmail(details.name, details);

  await sendMail({ to: email, subject, text, html });
}

/** A subscription will not renew (V-212): the product and the last day of access. */
export async function sendSubscriptionCancelledEmail(
  email: string,
  details: SubscriptionCancelledNotice & { name: string },
): Promise<void> {
  const subject = `Your VeriWorkly ${details.productName} subscription is cancelled`;
  const text = [
    `Hi ${details.name},`,
    "",
    ...subscriptionCancelledParagraphs(details).flatMap((p) => [p, ""]),
  ]
    .concat("Questions? Reach us at info@veriworkly.com.")
    .join("\n");
  const html = renderSubscriptionCancelledEmail(details.name, details);

  await sendMail({ to: email, subject, text, html });
}

/** A plan change took effect (V-219): the new plan and its renewal. */
export async function sendPlanChangedEmail(
  email: string,
  details: PlanChangedNotice & { name: string },
): Promise<void> {
  const subject = `Your VeriWorkly plan is now ${details.productName}`;
  const text = [
    `Hi ${details.name},`,
    "",
    ...planChangedParagraphs(details).flatMap((p) => [p, ""]),
  ]
    .concat("Questions? Reach us at info@veriworkly.com.")
    .join("\n");
  const html = renderPlanChangedEmail(details.name, details);

  await sendMail({ to: email, subject, text, html });
}
