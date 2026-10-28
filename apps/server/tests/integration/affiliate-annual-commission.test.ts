import { randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { prisma } from "#lib/prisma";

import {
  deliver,
  enrolledAffiliate,
  eventTime,
  paymentEvent,
  referredUser,
  subscriptionEvent,
} from "./helpers/billing.js";

/**
 * V-376: an affiliate's commission is a share of what the referred customer actually paid (the
 * settlement net of tax, `recordAffiliateCommission`), never a catalog price. These pin it for the
 * annual plans at their Dodo prices, and show a different amount paid moves the commission with it.
 */

const { billingMailMock } = vi.hoisted(() => ({
  billingMailMock: {
    sendPurchaseConfirmationEmail: vi.fn().mockResolvedValue(undefined),
    sendPaymentFailedEmail: vi.fn().mockResolvedValue(undefined),
    sendSubscriptionCancelledEmail: vi.fn().mockResolvedValue(undefined),
    sendPlanChangedEmail: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock("#services/mail/billingMail", () => billingMailMock);

const { addMonthsUtc } = await import("#services/annualCreditService");

/** A referred customer's first annual payment; returns the commission it earned. */
async function annualPurchaseCommission(productId: string, paidCents: number) {
  const { user: affiliate, code } = await enrolledAffiliate();
  const buyer = await referredUser(code);
  const subscriptionId = `sub_${randomUUID()}`;
  const periodStart = new Date(Date.now() - 60_000);
  const periodEnd = addMonthsUtc(periodStart, 12);
  await deliver(
    subscriptionEvent({
      userId: buyer.id,
      subscriptionId,
      productId,
      status: "active",
      at: eventTime(0),
      nextBillingDate: periodEnd,
      amount: paidCents,
    }),
  );
  const payment = paymentEvent({
    userId: buyer.id,
    subscriptionId,
    productId,
    amount: paidCents,
    at: periodStart,
    servicePeriod: { startsAt: periodStart, endsAt: periodEnd },
  });
  await deliver(payment);

  const commission = await prisma.affiliateCommission.findUniqueOrThrow({
    where: { providerPaymentId: payment.data.payment_id },
  });
  expect(commission.affiliateId).toBe(affiliate.id);
  return commission;
}

describe("affiliate commission on an annual plan (V-376)", () => {
  // Tier 1 earns 2 %, rounded down to the cent.
  it.each([
    ["AI Credits", "prod_ai_credits_annual", 5_988, 119],
    ["Creator Pro", "prod_portfolio_pro_annual", 9_588, 191],
    ["Job Hunter Bundle", "prod_bundle_annual", 14_388, 287],
  ])(
    "pays tier 1's share of a %s annual purchase (%s, %i cents paid)",
    async (_name, productId, paid, expected) => {
      const commission = await annualPurchaseCommission(productId, paid);
      expect(commission).toMatchObject({
        amountCents: expected,
        rateBps: 200,
        currency: "USD",
        status: "PENDING",
      });
    },
  );

  it("follows the amount actually paid, not the catalog price", async () => {
    // A discounted Creator Pro annual charge: 2 % of 4_794, not of the 9_588 list price.
    const commission = await annualPurchaseCommission("prod_portfolio_pro_annual", 4_794);
    expect(commission.amountCents).toBe(95);
  });
});
