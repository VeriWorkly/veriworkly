import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { app } from "#app";
import { prisma } from "#lib/prisma";
import { getRedis } from "#lib/redis";
import { settleBillingNotifications } from "#services/billingNotifications";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession } from "./helpers/auth.js";
import {
  asUser,
  DAY_MS,
  deliver,
  eventTime,
  paymentEvent,
  subscriptionEvent,
} from "./helpers/billing.js";

/**
 * Phase 11 group 4a, billing: V-278 a credit-pack checkout blocks account deletion like any other
 * open checkout, V-279 the plan-change email does not tell a downgrader they were charged, V-280
 * provider error text stays out of the response, V-281 a clawed-back or other subscription's
 * legacy annual grant does not hold back a new annual plan's monthly credits.
 */

const { billingMailMock, dodoMock } = vi.hoisted(() => ({
  billingMailMock: {
    sendPurchaseConfirmationEmail: vi.fn().mockResolvedValue(undefined),
    sendPaymentFailedEmail: vi.fn().mockResolvedValue(undefined),
    sendSubscriptionCancelledEmail: vi.fn().mockResolvedValue(undefined),
    sendPlanChangedEmail: vi.fn().mockResolvedValue(undefined),
  },
  dodoMock: { checkoutCreate: vi.fn(), checkoutRetrieve: vi.fn() },
}));

vi.mock("#services/mail/billingMail", () => billingMailMock);
vi.mock("dodopayments", async (importOriginal) => {
  const actual = await importOriginal<typeof import("dodopayments")>();
  class MockedDodo extends actual.default {
    constructor(options: ConstructorParameters<typeof actual.default>[0]) {
      super(options);
      Object.assign(this, {
        checkoutSessions: { create: dodoMock.checkoutCreate, retrieve: dodoMock.checkoutRetrieve },
      });
    }
  }
  return { ...actual, default: MockedDodo };
});

const { CreditService } = await import("#services/creditService");
const { addMonthsUtc } = await import("#services/annualCreditService");

beforeEach(() => {
  for (const mock of Object.values(billingMailMock)) mock.mockReset().mockResolvedValue(undefined);
  dodoMock.checkoutRetrieve.mockReset();
  dodoMock.checkoutCreate.mockReset().mockImplementation(async () => ({
    session_id: `cks_${randomUUID()}`,
    checkout_url: `https://checkout.test/${randomUUID()}`,
  }));
});

function deleteSelf(user: { cookie: string }) {
  return request(app)
    .delete("/api/v1/users/me")
    .set("Origin", STUDIO_ORIGIN)
    .set("Cookie", user.cookie);
}

describe("V-278 an open credit-pack checkout blocks account deletion", () => {
  it("refuses deletion while the pack session is open, and allows it once the pack is paid", async () => {
    const user = await createUserWithSession();
    const opened = await asUser(user, "post", "/api/v1/billing/credits/checkout").send({
      packKey: "credit_pack_500",
    });
    expect(opened.status, JSON.stringify(opened.body)).toBe(200);
    const sessionId = (await dodoMock.checkoutCreate.mock.results[0]!.value).session_id as string;

    const refused = await deleteSelf(user);
    expect(refused.status, JSON.stringify(refused.body)).toBe(409);
    expect(refused.body.details?.code).toBe("CHECKOUT_IN_PROGRESS");
    expect(await prisma.user.count({ where: { id: user.id } })).toBe(1);

    // The pack's payment settles the session it was paid through.
    const payment = paymentEvent({
      userId: user.id,
      productId: "prod_pack_500",
      amount: 499,
      metadata: { veriworkly_user_id: user.id, veriworkly_product: "credit_pack_500" },
    });
    (payment.data as Record<string, unknown>).checkout_session_id = sessionId;
    expect((await deliver(payment)).response.status).toBe(200);

    const deleted = await deleteSelf(user);
    expect(deleted.status, JSON.stringify(deleted.body)).toBe(200);
  });

  it("cancel checkout clears an unpaid pack session at the provider's word", async () => {
    const user = await createUserWithSession();
    await asUser(user, "post", "/api/v1/billing/credits/checkout").send({
      packKey: "credit_pack_250",
    });
    dodoMock.checkoutRetrieve.mockResolvedValueOnce({ payment_status: null });

    const cancelled = await asUser(user, "post", "/api/v1/billing/checkout/cancel");
    expect(cancelled.status, JSON.stringify(cancelled.body)).toBe(200);
    expect(cancelled.body.data.cleared).toEqual(["credit_pack_250"]);

    expect((await deleteSelf(user)).status).toBe(200);
  });

  it("cancel checkout keeps a pack session whose payment is processing, and says so", async () => {
    const user = await createUserWithSession();
    await asUser(user, "post", "/api/v1/billing/credits/checkout").send({
      packKey: "credit_pack_500",
    });
    dodoMock.checkoutRetrieve.mockResolvedValueOnce({ payment_status: "processing" });

    const cancelled = await asUser(user, "post", "/api/v1/billing/checkout/cancel");
    expect(cancelled.status, JSON.stringify(cancelled.body)).toBe(200);
    expect(cancelled.body.data.cleared).toEqual([]);
    expect(cancelled.body.data.stillProcessing).toEqual(["500 extra credits"]);
    // The pack being paid still blocks deletion until its payment lands.
    expect((await deleteSelf(user)).status).toBe(409);
  });

  it("a pack paying in another tab does not stop a subscription checkout from being cancelled", async () => {
    const user = await createUserWithSession();
    await asUser(user, "post", "/api/v1/billing/credits/checkout").send({
      packKey: "credit_pack_500",
    });
    const opened = await asUser(user, "post", "/api/v1/billing/checkout").send({
      productKey: "portfolio_pro",
      interval: "monthly",
    });
    expect(opened.status, JSON.stringify(opened.body)).toBe(200);
    // Packs are asked about first, then the subscription session.
    dodoMock.checkoutRetrieve
      .mockResolvedValueOnce({ payment_status: "processing" })
      .mockResolvedValueOnce({ payment_status: null });

    const cancelled = await asUser(user, "post", "/api/v1/billing/checkout/cancel");
    expect(cancelled.status, JSON.stringify(cancelled.body)).toBe(200);
    expect(cancelled.body.data.cleared).toEqual(["portfolio_pro"]);
    expect(cancelled.body.data.stillProcessing).toHaveLength(1);
    expect(await getRedis().get(`billing:checkout:${user.id}`)).toBeNull();
  });
});

describe("V-280 provider error text never reaches the customer", () => {
  it("cancel checkout answers 503 with a stable code and no provider message", async () => {
    const user = await createUserWithSession();
    await getRedis().set(
      `billing:checkout:${user.id}`,
      JSON.stringify({
        state: "open",
        sessionId: `cks_${randomUUID()}`,
        url: "https://checkout.test/session",
        productKey: "portfolio_pro",
        interval: "monthly",
        createdAt: new Date().toISOString(),
      }),
      { EX: 600 },
    );
    dodoMock.checkoutRetrieve.mockRejectedValueOnce(
      new Error("500 internal_error request_id=req_8f2a upstream=db-replica-3"),
    );

    const response = await asUser(user, "post", "/api/v1/billing/checkout/cancel");
    expect(response.status).toBe(503);
    expect(response.body.details).toEqual({ code: "PROVIDER_UNAVAILABLE" });
    expect(JSON.stringify(response.body)).not.toContain("req_8f2a");
  });
});

describe("V-279 the plan-change email says which way the plan moved", () => {
  it("tells a downgrader the new price applies from the renewal, not that they were charged", async () => {
    const user = await createUserWithSession();
    const subscriptionId = `sub_${randomUUID()}`;
    const periodEnd = new Date(Date.now() + 20 * DAY_MS);
    const event = (productId: string, step: number, type?: string) =>
      subscriptionEvent({
        userId: user.id,
        subscriptionId,
        productId,
        status: "active",
        type,
        at: eventTime(step),
        nextBillingDate: periodEnd,
        amount: productId === "prod_bundle_monthly" ? 1_499 : 599,
      });

    await deliver(event("prod_bundle_monthly", 0));
    await deliver(event("prod_portfolio_pro_monthly", 1, "subscription.plan_changed"));
    await settleBillingNotifications();

    expect(billingMailMock.sendPlanChangedEmail).toHaveBeenCalledTimes(1);
    expect(billingMailMock.sendPlanChangedEmail).toHaveBeenCalledWith(
      user.email,
      expect.objectContaining({ direction: "downgrade" }),
    );
  });

  it("claims neither way when the billing interval changed (monthly to annual is no downgrade)", async () => {
    const user = await createUserWithSession();
    const subscriptionId = `sub_${randomUUID()}`;
    const monthEnd = new Date(Date.now() + 20 * DAY_MS);
    await deliver(
      subscriptionEvent({
        userId: user.id,
        subscriptionId,
        productId: "prod_bundle_monthly",
        status: "active",
        at: eventTime(0),
        nextBillingDate: monthEnd,
        amount: 1_499,
      }),
    );
    // AI Credits annual costs less per month than the Bundle monthly, but it is a year paid up front.
    await deliver(
      subscriptionEvent({
        userId: user.id,
        subscriptionId,
        productId: "prod_ai_credits_annual",
        status: "active",
        type: "subscription.plan_changed",
        at: eventTime(1),
        nextBillingDate: new Date(Date.now() + 365 * DAY_MS),
        amount: 5_988,
      }),
    );
    await settleBillingNotifications();

    expect(billingMailMock.sendPlanChangedEmail).toHaveBeenCalledTimes(1);
    expect(billingMailMock.sendPlanChangedEmail.mock.calls[0]![1]).not.toHaveProperty(
      "direction",
      "downgrade",
    );
    expect(billingMailMock.sendPlanChangedEmail.mock.calls[0]![1].direction).toBeUndefined();
  });
});

describe("V-281 the legacy up-front year only blocks a schedule while it still covers it", () => {
  async function annualPayment(userId: string, subscriptionId: string) {
    const periodStart = new Date(Date.now() - 60_000);
    await deliver(
      subscriptionEvent({
        userId,
        subscriptionId,
        productId: "prod_ai_credits_annual",
        status: "active",
        at: eventTime(0),
        nextBillingDate: addMonthsUtc(periodStart, 12),
      }),
    );
    await deliver(
      paymentEvent({
        userId,
        subscriptionId,
        productId: "prod_ai_credits_annual",
        amount: 5_988,
        servicePeriod: { startsAt: periodStart, endsAt: addMonthsUtc(periodStart, 12) },
      }),
    );
    return prisma.subscriptionCreditSchedule.count({ where: { providerSubId: subscriptionId } });
  }

  async function legacyYear(userId: string, paymentId = `pay_legacy_${randomUUID()}`) {
    await CreditService.grant(userId, 12_000, {
      requestId: `subscription-credit:${paymentId}`,
      source: "subscription_payment",
      // The oldest legacy grants are keyed on the bare payment id.
      sourceId: paymentId,
      expiresAt: new Date(Date.now() + 200 * DAY_MS),
      reason: "AI Credits credit allowance",
    });
    return prisma.creditGrant.findFirstOrThrow({ where: { userId, amount: 12_000 } });
  }

  it("still covers the year when the customer spent it all: no monthly schedule on top", async () => {
    const user = await createUserWithSession();
    const grant = await legacyYear(user.id);
    // Spent, not reversed: nothing left, and no claw-back or refund behind it.
    await prisma.creditGrant.update({ where: { id: grant.id }, data: { remaining: 0 } });

    expect(await annualPayment(user.id, `sub_${randomUUID()}`)).toBe(0);
  });

  it("opens the schedule when a refund clawed the year back, even only in part", async () => {
    const user = await createUserWithSession();
    const grant = await legacyYear(user.id);
    // The wallet holds less than the grant (credits reserved elsewhere), so the claw-back is
    // limited and the grant keeps some `remaining`.
    await prisma.creditWallet.update({ where: { userId: user.id }, data: { balance: 5_000 } });
    expect(await CreditService.clawBackGrant(user.id, grant.id, "Refunded")).toBe(5_000);
    expect(
      (await prisma.creditGrant.findUniqueOrThrow({ where: { id: grant.id } })).remaining,
    ).toBeGreaterThan(0);

    expect(await annualPayment(user.id, `sub_${randomUUID()}`)).toBe(1);
  });

  it("opens the schedule when the year's payment was refunded after it was all spent", async () => {
    const user = await createUserWithSession();
    const paymentId = `pay_legacy_${randomUUID()}`;
    const grant = await legacyYear(user.id, paymentId);
    await prisma.creditGrant.update({ where: { id: grant.id }, data: { remaining: 0 } });
    // Nothing left to claw back, so only the processed full refund says the year was reversed.
    await prisma.billingWebhookEvent.create({
      data: {
        providerEventId: randomUUID(),
        type: "refund.succeeded",
        status: "PROCESSED",
        providerPaymentId: paymentId,
        payload: { type: "refund.succeeded", data: { payment_id: paymentId, is_partial: false } },
      },
    });

    expect(await annualPayment(user.id, `sub_${randomUUID()}`)).toBe(1);
  });

  it("opens the schedule when the legacy grant belongs to another subscription", async () => {
    const user = await createUserWithSession();
    await CreditService.grant(user.id, 12_000, {
      requestId: `subscription-credit:pay_legacy_${randomUUID()}`,
      source: "subscription_payment",
      sourceId: `sub_cancelled_legacy:2026-04-26T00:00:00.000Z`,
      expiresAt: new Date(Date.now() + 200 * DAY_MS),
      reason: "AI Credits credit allowance",
    });

    expect(await annualPayment(user.id, `sub_${randomUUID()}`)).toBe(1);
  });
});
