import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { app } from "#app";
import { prisma } from "#lib/prisma";
import { CreditService } from "#services/creditService";
import { PAYMENT_LOCK_TIMEOUT_MS } from "#services/billingService";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession } from "./helpers/auth.js";
import {
  DAY_MS,
  deliver,
  eventTime,
  expectLedgerBalanced,
  packPayment,
  paymentEvent,
  refundEvent,
  subscriptionEvent,
} from "./helpers/billing.js";

/**
 * Phase 11 group 1, P1 billing: V-273 (a reversal that lands before its payment was applied),
 * V-274 (the pack is the product paid for, not the metadata), V-275 (a failed card update is not
 * dunning), V-276 (a reversed and cancelled period ends now), V-277 (a reversal after deletion,
 * and event types the handler ignores, keep no personal data).
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

beforeEach(() => {
  for (const mock of Object.values(billingMailMock)) mock.mockReset().mockResolvedValue(undefined);
});

async function creditsOf(userId: string) {
  const sum = await prisma.creditGrant.aggregate({ where: { userId }, _sum: { remaining: true } });
  return sum._sum.remaining ?? 0;
}

async function liveGrants(userId: string, key: string) {
  const now = new Date();
  return prisma.entitlementGrant.count({
    where: {
      userId,
      key,
      revokedAt: null,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
  });
}

async function storedEvent(providerEventId: string) {
  return prisma.billingWebhookEvent.findUniqueOrThrow({ where: { providerEventId } });
}

describe("V-273: a full reversal that lands before its payment is applied", () => {
  it("the payment's retry grants nothing, notes it, and the refund is attributed to the customer", async () => {
    const user = await createUserWithSession();
    const payment = packPayment(user.id, 499);
    const paymentId = payment.data.payment_id;
    const paymentEventId = `evt_${randomUUID()}`;

    // The first delivery failed (a transient error); Dodo keeps retrying it.
    await prisma.billingWebhookEvent.create({
      data: {
        providerEventId: paymentEventId,
        type: "payment.succeeded",
        payload: payment,
        providerPaymentId: paymentId,
        amountCents: 499,
        currency: "USD",
        status: "FAILED",
        error: "connection reset",
      },
    });

    // Support refunds it in the Dodo dashboard: nobody owns the payment yet.
    const refund = await deliver(refundEvent(paymentId, { amount: 499 }));
    expect((await storedEvent(refund.eventId)).status).toBe("PROCESSED");

    // The retry succeeds now.
    await deliver(payment, paymentEventId);

    expect(await creditsOf(user.id)).toBe(0);
    const applied = await storedEvent(paymentEventId);
    expect(applied.status).toBe("PROCESSED");
    expect(applied.userId).toBe(user.id);
    expect(applied.error).toMatch(/reversed in full before it was applied/i);
    expect((await storedEvent(refund.eventId)).userId).toBe(user.id);
    await expectLedgerBalanced(user.id);
  });

  it("a partial refund before the payment still lets the payment grant what it bought", async () => {
    const user = await createUserWithSession();
    const payment = packPayment(user.id, 499);
    const paymentEventId = `evt_${randomUUID()}`;
    await prisma.billingWebhookEvent.create({
      data: {
        providerEventId: paymentEventId,
        type: "payment.succeeded",
        payload: payment,
        providerPaymentId: payment.data.payment_id,
        amountCents: 499,
        currency: "USD",
        status: "FAILED",
      },
    });

    const partial = await deliver(
      refundEvent(payment.data.payment_id, { amount: 100, isPartial: true }),
    );
    await deliver(payment, paymentEventId);

    expect(await creditsOf(user.id)).toBe(500);
    // A partial reversal takes nothing back, but it now belongs to the customer (history).
    expect((await storedEvent(partial.eventId)).userId).toBe(user.id);
  });

  it("a refund that lands while the payment is still granting waits for it, then takes it back", async () => {
    const user = await createUserWithSession();
    const payment = packPayment(user.id, 499);
    const paymentId = payment.data.payment_id;

    // Hold the payment between "started granting" and "granted".
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    let granting!: () => void;
    const started = new Promise<void>((resolve) => (granting = resolve));
    const grant = CreditService.grant.bind(CreditService);
    vi.spyOn(CreditService, "grant").mockImplementation(async (...args) => {
      granting();
      await gate;
      return grant(...args);
    });

    const paid = deliver(payment);
    await started;
    const refund = refundEvent(paymentId, { amount: 499 });
    const refunded = deliver(refund);
    // The refund's row is stored before it is applied; give it time to reach the payment.
    for (let i = 0; i < 50; i += 1) {
      const stored = await prisma.billingWebhookEvent.count({
        where: { providerPaymentId: paymentId, type: "refund.succeeded" },
      });
      if (stored > 0) break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
    release();
    await Promise.all([paid, refunded]);

    expect(await creditsOf(user.id)).toBe(0);
    const stored = await prisma.billingWebhookEvent.findFirstOrThrow({
      where: { providerPaymentId: paymentId, type: "refund.succeeded" },
    });
    expect(stored.userId).toBe(user.id);
    await expectLedgerBalanced(user.id);
  });

  it("an event whose work committed is not marked FAILED when the payment lock's transaction errors afterwards", async () => {
    const user = await createUserWithSession();
    const payment = packPayment(user.id, 499);
    const original = prisma.$transaction.bind(prisma) as (...args: unknown[]) => Promise<unknown>;
    vi.spyOn(prisma, "$transaction").mockImplementation((async (...args: unknown[]) => {
      const result = await original(...args);
      // The lock's transaction outlived its timeout after the work had already committed.
      if ((args[1] as { timeout?: number } | undefined)?.timeout === PAYMENT_LOCK_TIMEOUT_MS)
        throw new Error("Transaction already closed: the timeout for this transaction was reached");
      return result;
    }) as never);

    const delivered = await deliver(payment);

    const stored = await storedEvent(delivered.eventId);
    expect(stored.status).toBe("PROCESSED");
    expect(await creditsOf(user.id)).toBe(500);
  });
});

describe("V-274: a credit pack is the product that was paid for", () => {
  it("the 250 pack's product with 500-pack metadata grants 250 and flags the mismatch", async () => {
    const user = await createUserWithSession();
    const payment = paymentEvent({
      userId: user.id,
      productId: "prod_pack_250",
      amount: 299,
      metadata: { veriworkly_user_id: user.id, veriworkly_product: "credit_pack_500" },
    });

    const delivered = await deliver(payment);

    expect(await creditsOf(user.id)).toBe(250);
    const stored = await storedEvent(delivered.eventId);
    expect(stored.error).toMatch(/does not match/i);
    // History names what was paid for, by the same rule.
    expect(stored.productName).toBe("250 extra credits");
  });

  it("a pass's product with pack metadata grants the pass and no pack credits", async () => {
    const user = await createUserWithSession();
    const payment = paymentEvent({
      userId: user.id,
      productId: "prod_bundle_seven_day",
      amount: 599,
      metadata: { veriworkly_user_id: user.id, veriworkly_product: "credit_pack_500" },
    });

    await deliver(payment);

    expect(await liveGrants(user.id, "portfolio_publish")).toBe(1);
    const packGrant = await prisma.creditGrant.count({
      where: { userId: user.id, source: "credit_pack" },
    });
    expect(packGrant).toBe(0);
  });

  it("a subscription charge without a product id never becomes a pack, whatever its metadata says", async () => {
    const user = await createUserWithSession();
    const subscriptionId = `sub_${randomUUID()}`;
    await deliver(
      subscriptionEvent({
        userId: user.id,
        subscriptionId,
        productId: "prod_bundle_monthly",
        status: "active",
        at: eventTime(0),
        nextBillingDate: new Date(Date.now() + 25 * DAY_MS),
      }),
    );
    const payment = paymentEvent({
      userId: user.id,
      subscriptionId,
      productId: "prod_bundle_monthly",
      amount: 1499,
      at: eventTime(1),
      metadata: { veriworkly_user_id: user.id, veriworkly_product: "credit_pack_500" },
    });
    // Subscription charges carry no product_cart (SDK).
    delete (payment.data as Record<string, unknown>).product_cart;

    await deliver(payment);

    expect(
      await prisma.creditGrant.count({ where: { userId: user.id, source: "credit_pack" } }),
    ).toBe(0);
    expect(await creditsOf(user.id)).toBe(1000);
  });
});

describe("V-275: a declined card update is not a failed renewal", () => {
  it("sets no grace date and sends no payment-failed email", async () => {
    const user = await createUserWithSession();
    const subscriptionId = `sub_${randomUUID()}`;
    await deliver(
      subscriptionEvent({
        userId: user.id,
        subscriptionId,
        productId: "prod_portfolio_pro_monthly",
        status: "active",
        at: eventTime(0),
        nextBillingDate: new Date(Date.now() + 20 * DAY_MS),
      }),
    );

    const failed = paymentEvent({
      userId: user.id,
      type: "payment.failed",
      subscriptionId,
      productId: "prod_portfolio_pro_monthly",
      amount: 0,
      at: eventTime(1),
    });
    (failed.data as Record<string, unknown>).is_update_payment_method = true;
    await deliver(failed);

    const row = await prisma.subscription.findUniqueOrThrow({
      where: { providerSubId: subscriptionId },
    });
    expect(row.status).toBe("ACTIVE");
    expect(row.graceEndsAt).toBeNull();
    await new Promise((resolve) => setImmediate(resolve));
    expect(billingMailMock.sendPaymentFailedEmail).not.toHaveBeenCalled();
  });
});

describe("V-276: a fully reversed period that the provider cancels ends now", () => {
  async function paidSubscriber() {
    const user = await createUserWithSession();
    const subscriptionId = `sub_${randomUUID()}`;
    const periodEnd = new Date(Date.now() + 25 * DAY_MS);
    await deliver(
      subscriptionEvent({
        userId: user.id,
        subscriptionId,
        productId: "prod_bundle_monthly",
        status: "active",
        at: eventTime(0),
        nextBillingDate: periodEnd,
      }),
    );
    const payment = paymentEvent({
      userId: user.id,
      subscriptionId,
      productId: "prod_bundle_monthly",
      amount: 1499,
      at: eventTime(1),
    });
    await deliver(payment);
    expect(await liveGrants(user.id, "portfolio_publish")).toBe(1);
    return { user, subscriptionId, periodEnd, paymentId: payment.data.payment_id };
  }

  function cancelled(userId: string, subscriptionId: string, periodEnd: Date, step: number) {
    return subscriptionEvent({
      userId,
      subscriptionId,
      productId: "prod_bundle_monthly",
      status: "cancelled",
      at: eventTime(step),
      // Dodo's cancelled payload may still carry the period's end.
      nextBillingDate: periodEnd,
    });
  }

  it("refund first, cancel after: the cancellation keeps no paid time", async () => {
    const { user, subscriptionId, periodEnd, paymentId } = await paidSubscriber();

    await deliver(refundEvent(paymentId, { amount: 1499 }));
    await deliver(cancelled(user.id, subscriptionId, periodEnd, 5));

    expect(await liveGrants(user.id, "portfolio_publish")).toBe(0);
    const row = await prisma.subscription.findUniqueOrThrow({
      where: { providerSubId: subscriptionId },
    });
    expect(row.currentPeriodEnd!.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("cancel first, refund after: the refund ends the period at once", async () => {
    const { user, subscriptionId, periodEnd, paymentId } = await paidSubscriber();

    await deliver(cancelled(user.id, subscriptionId, periodEnd, 5));
    expect(await liveGrants(user.id, "portfolio_publish")).toBe(1);

    await deliver(refundEvent(paymentId, { amount: 1499 }));

    expect(await liveGrants(user.id, "portfolio_publish")).toBe(0);
  });

  it("a partial refund leaves the cancelled period running", async () => {
    const { user, subscriptionId, periodEnd, paymentId } = await paidSubscriber();

    await deliver(refundEvent(paymentId, { amount: 500, isPartial: true }));
    await deliver(cancelled(user.id, subscriptionId, periodEnd, 5));

    expect(await liveGrants(user.id, "portfolio_publish")).toBe(1);
  });

  /**
   * A renewal, then a plan-change proration charge in the same period (review of V-276): the
   * renewal is what paid the period, so only its full reversal ends access.
   */
  async function renewedThenPlanChange(withServicePeriods: boolean) {
    const user = await createUserWithSession();
    const subscriptionId = `sub_${randomUUID()}`;
    const periodStart = new Date(Date.now() - 5 * DAY_MS);
    const periodEnd = new Date(Date.now() + 25 * DAY_MS);
    await deliver(
      subscriptionEvent({
        userId: user.id,
        subscriptionId,
        productId: "prod_bundle_monthly",
        status: "active",
        at: eventTime(0),
        nextBillingDate: periodEnd,
      }),
    );
    const renewal = paymentEvent({
      userId: user.id,
      subscriptionId,
      productId: "prod_bundle_monthly",
      amount: 1499,
      at: eventTime(1),
      ...(withServicePeriods
        ? { servicePeriod: { startsAt: periodStart, endsAt: periodEnd } }
        : {}),
    });
    await deliver(renewal);
    const planChange = paymentEvent({
      userId: user.id,
      subscriptionId,
      productId: "prod_bundle_monthly",
      amount: 500,
      at: eventTime(2),
      chargeType: "plan_change",
      ...(withServicePeriods ? { servicePeriod: { startsAt: new Date(), endsAt: periodEnd } } : {}),
    });
    await deliver(planChange);
    return {
      user,
      subscriptionId,
      periodEnd,
      renewalId: renewal.data.payment_id,
      planChangeId: planChange.data.payment_id,
    };
  }

  it("with service periods: refunding the plan-change charge keeps access, refunding the renewal ends it", async () => {
    const { user, subscriptionId, periodEnd, renewalId, planChangeId } =
      await renewedThenPlanChange(true);
    await deliver(cancelled(user.id, subscriptionId, periodEnd, 5));

    await deliver(refundEvent(planChangeId, { amount: 500 }));
    expect(await liveGrants(user.id, "portfolio_publish")).toBe(1);

    await deliver(refundEvent(renewalId, { amount: 1499 }));
    expect(await liveGrants(user.id, "portfolio_publish")).toBe(0);
  });

  it("without service periods: the latest renewal that is not a plan change paid the period", async () => {
    const { user, subscriptionId, periodEnd, renewalId, planChangeId } =
      await renewedThenPlanChange(false);

    await deliver(refundEvent(planChangeId, { amount: 500 }));
    await deliver(cancelled(user.id, subscriptionId, periodEnd, 5));
    expect(await liveGrants(user.id, "portfolio_publish")).toBe(1);

    await deliver(refundEvent(renewalId, { amount: 1499 }));
    expect(await liveGrants(user.id, "portfolio_publish")).toBe(0);
  });
});

describe("V-277: no personal data is kept for a deleted account's late events", () => {
  it("a refund after account deletion is stored without the customer's name, email or phone", async () => {
    const user = await createUserWithSession();
    const payment = packPayment(user.id, 499);
    await deliver(payment);

    const deleted = await request(app)
      .delete("/api/v1/users/me")
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", user.cookie);
    expect(deleted.status, JSON.stringify(deleted.body)).toBe(200);

    const refund = refundEvent(payment.data.payment_id, { amount: 499 });
    (refund.data as Record<string, unknown>).customer = {
      customer_id: "cus_test",
      email: "gone@example.test",
      name: "Gone Person",
      phone_number: "+15550100",
    };
    const delivered = await deliver(refund);

    const stored = JSON.stringify((await storedEvent(delivered.eventId)).payload);
    expect(stored).not.toContain("gone@example.test");
    expect(stored).not.toContain("Gone Person");
    expect(stored).not.toContain("+15550100");
  });

  it.each([
    { label: "names the live customer in its metadata", withMetadata: true },
    { label: "carries the live customer's provider customer id only", withMetadata: false },
  ])(
    "a live customer's legacy payment row (applied before userId was written) $label: its refund keeps the payload",
    async ({ withMetadata }) => {
      const user = await createUserWithSession();
      const customerId = `cus_${randomUUID()}`;
      await prisma.user.update({ where: { id: user.id }, data: { billingCustomerId: customerId } });
      const payment = packPayment(user.id, 499);
      (payment.data as Record<string, unknown>).customer = { customer_id: customerId };
      if (!withMetadata) (payment.data as Record<string, unknown>).metadata = {};
      await prisma.billingWebhookEvent.create({
        data: {
          providerEventId: `evt_${randomUUID()}`,
          type: "payment.succeeded",
          payload: payment,
          providerPaymentId: payment.data.payment_id,
          amountCents: 499,
          currency: "USD",
          status: "PROCESSED",
          userId: null,
        },
      });

      const refund = refundEvent(payment.data.payment_id, { amount: 499 });
      (refund.data as Record<string, unknown>).customer = {
        customer_id: customerId,
        email: "live@example.test",
      };
      const delivered = await deliver(refund);

      const stored = await storedEvent(delivered.eventId);
      expect((stored.payload as { redacted?: boolean }).redacted).toBeUndefined();
      expect(JSON.stringify(stored.payload)).toContain("live@example.test");
    },
  );

  it("an event type the handler does not process is stored redacted", async () => {
    const user = await createUserWithSession();
    const delivered = await deliver({
      type: "dunning.started",
      timestamp: new Date().toISOString(),
      data: {
        payment_id: `pay_${randomUUID()}`,
        customer: { customer_id: "cus_test", email: "someone@example.test", name: "Some One" },
        metadata: { veriworkly_user_id: user.id },
      },
    });

    const stored = JSON.stringify((await storedEvent(delivered.eventId)).payload);
    expect(stored).not.toContain("someone@example.test");
    expect(stored).not.toContain("Some One");
    expect(stored).toContain(user.id);
  });
});
