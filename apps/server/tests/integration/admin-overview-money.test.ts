import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { prisma } from "#lib/prisma";

import { createUserWithSession } from "./helpers/auth.js";
import { adminClient } from "./helpers/admin.js";

/**
 * V-267: the admin overview's money figures. The commission series is wallet-currency only and
 * leaves reversed commissions out, `paying` counts live accounts only, and revenue is reported
 * per currency from the amounts stored on processed payment, refund and dispute events.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const asAdmin = adminClient().request;

describe("V-267 overview money figures", () => {
  it("leaves reversed and non-USD commissions out of the series, deleted accounts out of paying, and reports revenue by currency", async () => {
    // Program-wide figures: start from no money rows at all.
    await prisma.affiliateCommission.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.billingWebhookEvent.deleteMany();
    const affiliate = await createUserWithSession();
    const base = { affiliateId: affiliate.id, rateBps: 2_000 };
    await prisma.affiliateCommission.createMany({
      data: [
        {
          ...base,
          providerPaymentId: `pay_${randomUUID()}`,
          amountCents: 300,
          status: "AVAILABLE",
        },
        { ...base, providerPaymentId: `pay_${randomUUID()}`, amountCents: 700, status: "REVERSED" },
        {
          ...base,
          providerPaymentId: `pay_${randomUUID()}`,
          amountCents: 900,
          currency: "EUR",
          status: "PENDING",
        },
      ],
    });

    const live = await createUserWithSession();
    const sub = (userId: string | null) => ({
      userId,
      provider: "dodo",
      providerSubId: `sub_${randomUUID()}`,
      productKey: "portfolio_pro",
      status: "ACTIVE" as const,
      currentPeriodEnd: new Date(Date.now() + 20 * DAY_MS),
    });
    await prisma.subscription.create({ data: sub(live.id) });
    // Billing rows outlive the account (decision 5): this one belongs to nobody now.
    await prisma.subscription.create({ data: sub(null) });

    const event = (
      type: string,
      amountCents: number,
      currency: string,
      paymentId: string,
      extra: Record<string, unknown> = {},
    ) => ({
      providerEventId: `evt_${randomUUID()}`,
      type,
      payload: { type, data: { payment_id: paymentId, ...extra } },
      amountCents,
      currency,
      providerPaymentId: paymentId,
      status: "PROCESSED" as const,
      processedAt: new Date(),
    });
    await prisma.billingWebhookEvent.createMany({
      data: [
        event("payment.succeeded", 1_200, "USD", "pay_a"),
        // The same payment delivered twice counts once.
        event("payment.succeeded", 1_200, "USD", "pay_a"),
        event("payment.succeeded", 599, "USD", "pay_b"),
        event("payment.succeeded", 1_000, "EUR", "pay_c"),
        event("refund.succeeded", 200, "USD", "pay_a", { refund_id: "ref_1" }),
        event("dispute.lost", 599, "USD", "pay_b", { dispute_id: "dis_1" }),
        // Still in flight, and a dispute that changed nothing: neither moves revenue.
        { ...event("payment.succeeded", 5_000, "USD", "pay_d"), status: "FAILED" as const },
        event("dispute.won", 1_000, "EUR", "pay_c", { dispute_id: "dis_2" }),
      ],
    });

    const series = await asAdmin("get", "/admin/overview/series?days=7");
    expect(series.status).toBe(200);
    const commissionCents = series.body.data.series.commissionCents as number[];
    expect(commissionCents.reduce((sum, value) => sum + value, 0)).toBe(300);

    const overview = await asAdmin("get", "/admin/overview?days=30");
    expect(overview.status).toBe(200);
    const billing = overview.body.data.billing;
    expect(billing.subscriptions.paying).toBe(1);
    expect(billing.revenue.allTime).toEqual([
      { currency: "EUR", payments: 1, grossCents: 1_000, reversedCents: 0, netCents: 1_000 },
      { currency: "USD", payments: 2, grossCents: 1_799, reversedCents: 799, netCents: 1_000 },
    ]);
    expect(billing.revenue.last30Days).toEqual(billing.revenue.allTime);
  });
});
