import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "#lib/prisma";

import { createUserWithSession } from "./helpers/auth.js";
import {
  asUser,
  billingHistory,
  billingMe,
  DAY_MS,
  deliver,
  expectLedgerBalanced,
  paymentEvent,
  refundEvent,
} from "./helpers/billing.js";

/**
 * V-376: the 1,200-credit pack ($9.99 on Dodo). It sells, grants and reverses exactly like the
 * 250 and 500 packs: AI credits only, into the one credit pool, each grant valid for 90 days from
 * the payment, decided by the product paid for (not by checkout metadata).
 */

const { billingMailMock, dodoMock } = vi.hoisted(() => ({
  billingMailMock: {
    sendPurchaseConfirmationEmail: vi.fn().mockResolvedValue(undefined),
    sendPaymentFailedEmail: vi.fn().mockResolvedValue(undefined),
    sendSubscriptionCancelledEmail: vi.fn().mockResolvedValue(undefined),
    sendPlanChangedEmail: vi.fn().mockResolvedValue(undefined),
  },
  dodoMock: { checkoutCreate: vi.fn() },
}));

vi.mock("#services/mail/billingMail", () => billingMailMock);
vi.mock("dodopayments", async (importOriginal) => {
  const actual = await importOriginal<typeof import("dodopayments")>();
  class MockedDodo extends actual.default {
    constructor(options: ConstructorParameters<typeof actual.default>[0]) {
      super(options);
      Object.assign(this, { checkoutSessions: { create: dodoMock.checkoutCreate } });
    }
  }
  return { ...actual, default: MockedDodo };
});

beforeEach(() => {
  for (const mock of Object.values(billingMailMock)) mock.mockReset().mockResolvedValue(undefined);
  dodoMock.checkoutCreate.mockReset().mockImplementation(async () => ({
    session_id: `cks_${randomUUID()}`,
    checkout_url: `https://checkout.test/${randomUUID()}`,
  }));
});

function pack1200Payment(userId: string, metadataPack = "credit_pack_1200") {
  return paymentEvent({
    userId,
    productId: "prod_pack_1200",
    amount: 999,
    metadata: { veriworkly_user_id: userId, veriworkly_product: metadataPack },
  });
}

describe("the 1,200-credit pack (V-376)", () => {
  it("is in the /billing/me catalog at $9.99 with a 90-day expiry", async () => {
    const user = await createUserWithSession();
    const { creditEconomics } = await billingMe(user);

    expect(creditEconomics.packs).toContainEqual({
      key: "credit_pack_1200",
      name: "1,200 extra credits",
      credits: 1_200,
      price: 999,
      currency: "USD",
      expiresInDays: 90,
      configured: true,
    });
  });

  it("opens a Dodo checkout for the 1,200 pack's product", async () => {
    const user = await createUserWithSession();
    const response = await asUser(user, "post", "/api/v1/billing/credits/checkout").send({
      packKey: "credit_pack_1200",
    });

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(dodoMock.checkoutCreate).toHaveBeenCalledTimes(1);
    expect(dodoMock.checkoutCreate.mock.calls[0]?.[0]).toMatchObject({
      product_cart: [{ product_id: "prod_pack_1200", quantity: 1 }],
      metadata: { veriworkly_user_id: user.id, veriworkly_product: "credit_pack_1200" },
    });
  });

  it("grants 1,200 credits valid for 90 days, names it in history, and a refund takes them back", async () => {
    const buyer = await createUserWithSession();
    const payment = pack1200Payment(buyer.id);
    const purchase = await deliver(payment);
    const paymentId = payment.data.payment_id;
    const paidAt = new Date(payment.data.created_at);

    const grant = await prisma.creditGrant.findFirstOrThrow({
      where: { userId: buyer.id, sourceId: paymentId },
    });
    expect(grant).toMatchObject({
      amount: 1_200,
      remaining: 1_200,
      source: "credit_pack",
    });
    expect(grant.expiresAt?.getTime()).toBe(paidAt.getTime() + 90 * DAY_MS);
    const granted = await prisma.creditTransaction.findFirstOrThrow({
      where: { userId: buyer.id, amount: 1_200 },
    });
    expect(granted.reason).toBe("1,200 extra credits");
    // AI credits only: a pack never unlocks Pro, but its buyer is a payer and never shown as free.
    const me = await billingMe(buyer);
    expect(me.credits.balance).toBe(1_200);
    expect(me.access).toMatchObject({ tier: "credits", isPaying: true, isPaid: false });
    await expectLedgerBalanced(buyer.id);

    const purchased = (await billingHistory(buyer)).find(
      (row) => row.providerEventId === purchase.eventId,
    );
    expect(purchased).toMatchObject({
      type: "payment.succeeded",
      productName: "1,200 extra credits",
      amountCents: 999,
      currency: "USD",
    });

    const refund = await deliver(refundEvent(paymentId, { amount: 999 }));

    expect(
      (
        await prisma.creditGrant.findFirstOrThrow({
          where: { userId: buyer.id, sourceId: paymentId },
        })
      ).remaining,
    ).toBe(0);
    const clawback = await prisma.creditTransaction.findFirstOrThrow({
      where: { userId: buyer.id, type: "REFUND" },
    });
    expect(clawback).toMatchObject({ amount: -1_200, action: "payment_refund" });
    const afterRefund = await billingMe(buyer);
    expect(afterRefund.credits.balance).toBe(0);
    expect(afterRefund.access.tier).toBe("free");
    await expectLedgerBalanced(buyer.id);

    const refunded = (await billingHistory(buyer)).find(
      (row) => row.providerEventId === refund.eventId,
    );
    expect(refunded).toMatchObject({
      type: "refund.succeeded",
      productName: "1,200 extra credits",
      amountCents: 999,
    });
  });

  it("grants what the 1,200 product paid for, whatever pack the metadata names", async () => {
    const buyer = await createUserWithSession();
    const payment = pack1200Payment(buyer.id, "credit_pack_250");
    await deliver(payment);

    const grant = await prisma.creditGrant.findFirstOrThrow({
      where: { userId: buyer.id, sourceId: payment.data.payment_id },
    });
    expect(grant.amount).toBe(1_200);
  });
});
