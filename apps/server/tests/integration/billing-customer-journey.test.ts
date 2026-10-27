import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { app } from "#app";
import { prisma } from "#lib/prisma";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";
import { signDodoWebhook } from "./helpers/webhook.js";

/**
 * Phase 6 track 1 (V-169, V-170, V-172, V-175, V-176, V-177, V-188, owner decision 4): the billing
 * paths a customer walks through, against the real database. The Dodo client is the real SDK
 * (webhook signatures verify for real) with only the outbound calls replaced.
 */

const { billingMailMock, dodoMock } = vi.hoisted(() => ({
  billingMailMock: {
    sendPurchaseConfirmationEmail: vi.fn().mockResolvedValue(undefined),
    sendPaymentFailedEmail: vi.fn().mockResolvedValue(undefined),
    sendSubscriptionCancelledEmail: vi.fn().mockResolvedValue(undefined),
  },
  dodoMock: {
    subscriptionsUpdate: vi.fn(),
    subscriptionsRetrieve: vi.fn(),
    portalCreate: vi.fn(),
    checkoutCreate: vi.fn(),
  },
}));

vi.mock("#services/mail/billingMail", () => billingMailMock);
vi.mock("dodopayments", async (importOriginal) => {
  const actual = await importOriginal<typeof import("dodopayments")>();
  class MockedDodo extends actual.default {
    constructor(options: ConstructorParameters<typeof actual.default>[0]) {
      super(options);
      Object.assign(this, {
        subscriptions: {
          update: dodoMock.subscriptionsUpdate,
          retrieve: dodoMock.subscriptionsRetrieve,
        },
        customers: { customerPortal: { create: dodoMock.portalCreate } },
        checkoutSessions: { create: dodoMock.checkoutCreate },
      });
    }
  }
  return { ...actual, default: MockedDodo };
});

const { addMonthsUtc, runAnnualCreditGrants } = await import("#services/annualCreditService");
const { CreditService, sweepExpiredCredits } = await import("#services/creditService");
const { retryUnsentBillingNotifications } = await import("#services/billingNotifications");

const WEBHOOK_PATH = "/api/v1/billing/webhooks/dodo";
const ADMIN = "/api/v1/admin";
const DAY_MS = 24 * 60 * 60 * 1000;
const PORTFOLIO_KEYS = ["portfolio_publish", "seo_controls", "analytics", "watermark_removal"];

let admin: TestUser;
beforeAll(async () => {
  admin = await createUserWithSession({ email: "admin@example.test" });
});

beforeEach(() => {
  dodoMock.subscriptionsUpdate.mockReset();
  dodoMock.subscriptionsRetrieve.mockReset();
  dodoMock.portalCreate.mockReset();
  dodoMock.checkoutCreate.mockReset();
  billingMailMock.sendPurchaseConfirmationEmail.mockReset().mockResolvedValue(undefined);
  billingMailMock.sendPaymentFailedEmail.mockReset().mockResolvedValue(undefined);
  billingMailMock.sendSubscriptionCancelledEmail.mockReset().mockResolvedValue(undefined);
});

function eventTime(step = 0) {
  return new Date(Date.now() - 60_000 + step * 1000);
}

function subscriptionEvent(input: {
  userId: string;
  subscriptionId: string;
  productId: string;
  status: string;
  at: Date;
  nextBillingDate: Date | null;
  type?: string;
  customerId?: string;
}) {
  return {
    type: input.type ?? `subscription.${input.status}`,
    timestamp: input.at.toISOString(),
    data: {
      subscription_id: input.subscriptionId,
      customer: { customer_id: input.customerId ?? "cus_journey" },
      product_id: input.productId,
      status: input.status,
      cancel_at_next_billing_date: false,
      next_billing_date: input.nextBillingDate ? input.nextBillingDate.toISOString() : null,
      recurring_pre_tax_amount: 599,
      currency: "USD",
      metadata: { veriworkly_user_id: input.userId },
    },
  };
}

function paymentEvent(input: {
  userId: string;
  type?: string;
  paymentId?: string;
  subscriptionId?: string | null;
  productId: string;
  amount: number;
  currency?: string;
  customerId?: string | null;
  metadata?: Record<string, string>;
  at?: Date;
  servicePeriod?: { startsAt: Date; endsAt: Date };
}) {
  const at = input.at ?? eventTime();
  return {
    type: input.type ?? "payment.succeeded",
    timestamp: at.toISOString(),
    data: {
      payment_id: input.paymentId ?? `pay_${randomUUID()}`,
      subscription_id: input.subscriptionId ?? null,
      product_cart: [{ product_id: input.productId, quantity: 1 }],
      total_amount: input.amount,
      settlement_amount: input.amount,
      currency: input.currency ?? "USD",
      settlement_currency: "USD",
      is_update_payment_method: false,
      created_at: at.toISOString(),
      ...(input.customerId === null
        ? {}
        : { customer: { customer_id: input.customerId ?? "cus_one_time" } }),
      ...(input.servicePeriod
        ? {
            service_periods: [
              {
                subscription_id: input.subscriptionId,
                starts_at: input.servicePeriod.startsAt.toISOString(),
                ends_at: input.servicePeriod.endsAt.toISOString(),
              },
            ],
          }
        : {}),
      metadata: input.metadata ?? { veriworkly_user_id: input.userId },
    },
  };
}

async function deliver(event: unknown, id?: string) {
  const body = JSON.stringify(event);
  const headers = signDodoWebhook(body, id ? { id } : {});
  const req = request(app).post(WEBHOOK_PATH);
  for (const [key, value] of Object.entries(headers)) req.set(key, value);
  const response = await req.send(body);
  return { response, eventId: headers["webhook-id"] };
}

async function billingMe(user: TestUser) {
  const response = await request(app)
    .get("/api/v1/billing/me")
    .set("Origin", STUDIO_ORIGIN)
    .set("Cookie", user.cookie);
  expect(response.status).toBe(200);
  return response.body.data;
}

function asUser(user: TestUser, method: "post" | "patch" | "delete", url: string) {
  return request(app)[method](url).set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie);
}

async function activeGrantKeys(userId: string, at = new Date()) {
  const grants = await prisma.entitlementGrant.findMany({
    where: {
      userId,
      startsAt: { lte: at },
      revokedAt: null,
      OR: [{ endsAt: null }, { endsAt: { gt: at } }],
    },
    select: { key: true },
  });
  return grants.map((grant) => grant.key).sort();
}

/** balance + reserved must equal what the grants still hold, at every step. */
async function expectLedgerBalanced(userId: string) {
  const wallet = await prisma.creditWallet.findUnique({ where: { userId } });
  const remaining = await prisma.creditGrant.aggregate({
    where: { userId },
    _sum: { remaining: true },
  });
  expect((wallet?.balance ?? 0) + (wallet?.reserved ?? 0)).toBe(remaining._sum.remaining ?? 0);
}

async function seedSubscription(
  userId: string,
  data: Partial<{
    providerSubId: string | null;
    productKey: string;
    status: "ACTIVE" | "PAST_DUE" | "CANCELED" | "INACTIVE";
    interval: "MONTHLY" | "ANNUAL";
    currentPeriodEnd: Date | null;
    graceEndsAt: Date | null;
    cancelAtPeriodEnd: boolean;
  }> = {},
) {
  return prisma.subscription.create({
    data: {
      userId,
      provider: "dodo",
      providerSubId: data.providerSubId === undefined ? `sub_${randomUUID()}` : data.providerSubId,
      providerCustomerId: "cus_seeded",
      productKey: data.productKey ?? "portfolio_pro",
      interval: data.interval ?? "MONTHLY",
      status: data.status ?? "ACTIVE",
      currentPeriodEnd:
        data.currentPeriodEnd === undefined
          ? new Date(Date.now() + 20 * DAY_MS)
          : data.currentPeriodEnd,
      graceEndsAt: data.graceEndsAt ?? null,
      cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
    },
  });
}

describe("V-169 admin cancel at period end goes through the provider", () => {
  it("schedules the cancellation at Dodo, mirrors the provider's answer and audits it", async () => {
    const user = await createUserWithSession();
    const subscription = await seedSubscription(user.id);
    const nextBilling = new Date(Date.now() + 20 * DAY_MS);
    dodoMock.subscriptionsUpdate.mockResolvedValue({
      subscription_id: subscription.providerSubId,
      status: "active",
      cancel_at_next_billing_date: true,
      next_billing_date: nextBilling.toISOString(),
    });

    const response = await asUser(
      admin,
      "patch",
      `${ADMIN}/billing/subscriptions/${subscription.id}`,
    ).send({ cancelAtPeriodEnd: true, reason: "Customer asked by email" });

    expect(response.status).toBe(200);
    expect(dodoMock.subscriptionsUpdate).toHaveBeenCalledWith(subscription.providerSubId, {
      cancel_at_next_billing_date: true,
    });
    const row = await prisma.subscription.findUniqueOrThrow({ where: { id: subscription.id } });
    expect(row.cancelAtPeriodEnd).toBe(true);
    expect(
      await prisma.adminAuditEntry.count({
        where: { targetId: subscription.id, action: "billing.subscription.update" },
      }),
    ).toBe(1);
  });

  it("changes nothing locally when the provider call fails", async () => {
    const user = await createUserWithSession();
    const subscription = await seedSubscription(user.id);
    dodoMock.subscriptionsUpdate.mockRejectedValue(new Error("provider down"));

    const response = await asUser(
      admin,
      "patch",
      `${ADMIN}/billing/subscriptions/${subscription.id}`,
    ).send({ cancelAtPeriodEnd: true, reason: "Customer asked by email" });

    expect(response.status).toBe(502);
    const row = await prisma.subscription.findUniqueOrThrow({ where: { id: subscription.id } });
    expect(row.cancelAtPeriodEnd).toBe(false);
    expect(await prisma.adminAuditEntry.count({ where: { targetId: subscription.id } })).toBe(0);
  });

  it("resumes a scheduled cancellation at the provider", async () => {
    const user = await createUserWithSession();
    const subscription = await seedSubscription(user.id, { cancelAtPeriodEnd: true });
    dodoMock.subscriptionsUpdate.mockResolvedValue({
      subscription_id: subscription.providerSubId,
      status: "active",
      cancel_at_next_billing_date: false,
      next_billing_date: new Date(Date.now() + 20 * DAY_MS).toISOString(),
    });

    const response = await asUser(
      admin,
      "patch",
      `${ADMIN}/billing/subscriptions/${subscription.id}`,
    ).send({ cancelAtPeriodEnd: false, reason: "Customer changed their mind" });

    expect(response.status).toBe(200);
    expect(dodoMock.subscriptionsUpdate).toHaveBeenCalledWith(subscription.providerSubId, {
      cancel_at_next_billing_date: false,
    });
    expect(
      (await prisma.subscription.findUniqueOrThrow({ where: { id: subscription.id } }))
        .cancelAtPeriodEnd,
    ).toBe(false);
  });

  it("refuses a row the provider does not know", async () => {
    const user = await createUserWithSession();
    const subscription = await seedSubscription(user.id, { providerSubId: null });

    const response = await asUser(
      admin,
      "patch",
      `${ADMIN}/billing/subscriptions/${subscription.id}`,
    ).send({ cancelAtPeriodEnd: true, reason: "Customer asked by email" });

    expect(response.status).toBe(409);
    expect(dodoMock.subscriptionsUpdate).not.toHaveBeenCalled();
    expect(
      (await prisma.subscription.findUniqueOrThrow({ where: { id: subscription.id } }))
        .cancelAtPeriodEnd,
    ).toBe(false);
  });
});

describe("V-170 admin status override moves the entitlements with the label", () => {
  it("grants the product's entitlements on ACTIVE and revokes them on INACTIVE", async () => {
    const user = await createUserWithSession();
    const subscription = await seedSubscription(user.id, { status: "INACTIVE" });
    expect(await activeGrantKeys(user.id)).toEqual([]);

    const activated = await asUser(
      admin,
      "patch",
      `${ADMIN}/billing/subscriptions/${subscription.id}`,
    ).send({ status: "ACTIVE", reason: "Webhook lost, payment confirmed in Dodo" });
    expect(activated.status).toBe(200);
    expect(await activeGrantKeys(user.id)).toEqual([...PORTFOLIO_KEYS].sort());
    expect((await billingMe(user)).plan).toBe("PORTFOLIO_PRO");

    // Ending it locally needs the provider to agree: a failed (never paid) subscription.
    dodoMock.subscriptionsRetrieve.mockResolvedValue({
      subscription_id: subscription.providerSubId,
      status: "failed",
    });
    const deactivated = await asUser(
      admin,
      "patch",
      `${ADMIN}/billing/subscriptions/${subscription.id}`,
    ).send({ status: "INACTIVE", reason: "Chargeback received" });
    expect(deactivated.status).toBe(200);
    expect(await activeGrantKeys(user.id)).toEqual([]);
    expect((await billingMe(user)).plan).toBe("FREE");
  });
});

describe("V-172 dunning is visible", () => {
  it("keeps PAST_DUE with graceEndsAt in /billing/me after the period date has passed", async () => {
    const user = await createUserWithSession();
    const graceEndsAt = new Date(Date.now() + 5 * DAY_MS);
    await seedSubscription(user.id, {
      status: "PAST_DUE",
      currentPeriodEnd: new Date(Date.now() - 2 * DAY_MS),
      graceEndsAt,
    });

    const me = await billingMe(user);
    expect(me.status).toBe("PAST_DUE");
    expect(new Date(me.graceEndsAt).getTime()).toBe(graceEndsAt.getTime());
    expect(me.publicationStatus).toBe("GRACE");
  });

  it("stays PAST_DUE with the payment issue once the grace window is over (V-221)", async () => {
    const user = await createUserWithSession();
    await seedSubscription(user.id, {
      status: "PAST_DUE",
      currentPeriodEnd: new Date(Date.now() - 9 * DAY_MS),
      graceEndsAt: new Date(Date.now() - DAY_MS),
    });
    // Checkout still refuses with PAYMENT_OUTSTANDING (Dodo keeps retrying), so the summary must
    // not describe a free account: the same rule, PAST_DUE is live.
    const me = await billingMe(user);
    expect(me.status).toBe("PAST_DUE");
    expect(me.access.paymentIssue).toBe(true);
    expect(me.publicationStatus).toBe("SUSPENDED");
  });

  it("emails once per failed payment, however often the event is delivered", async () => {
    const user = await createUserWithSession();
    const subscription = await seedSubscription(user.id, { productKey: "ai_credits" });
    const event = paymentEvent({
      type: "payment.failed",
      userId: user.id,
      paymentId: "pay_failed_once",
      subscriptionId: subscription.providerSubId,
      productId: "prod_ai_credits_monthly",
      amount: 599,
    });

    expect((await deliver(event)).response.status).toBe(200);
    expect((await deliver(event)).response.status).toBe(200);

    await vi.waitFor(() => expect(billingMailMock.sendPaymentFailedEmail).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(billingMailMock.sendPaymentFailedEmail).toHaveBeenCalledTimes(1);
    expect(billingMailMock.sendPaymentFailedEmail.mock.calls[0]![1]).toMatchObject({
      productName: "AI Credits",
      amountCents: 599,
      currency: "USD",
    });
    // A failed payment grants nothing.
    expect(await prisma.creditGrant.count({ where: { userId: user.id } })).toBe(0);
  });
});

describe("V-175 one-time buyers reach the billing portal", () => {
  it("stores the customer id from a credit-pack payment and opens the portal with it", async () => {
    const user = await createUserWithSession();
    await deliver(
      paymentEvent({
        userId: user.id,
        productId: "prod_pack_250",
        amount: 499,
        customerId: "cus_pack_buyer",
        metadata: { veriworkly_user_id: user.id, veriworkly_product: "credit_pack_250" },
      }),
    );
    dodoMock.portalCreate.mockResolvedValue({ link: "https://portal.example/session" });

    const response = await asUser(user, "post", "/api/v1/billing/portal");

    expect(response.status).toBe(200);
    expect(response.body.data.url).toBe("https://portal.example/session");
    expect(dodoMock.portalCreate).toHaveBeenCalledWith("cus_pack_buyer", expect.anything());
  });
});

describe("V-176 summary and overlapping checkouts", () => {
  it("describes the live subscription, not the most recently touched dead one", async () => {
    const user = await createUserWithSession();
    await seedSubscription(user.id, {
      productKey: "ai_credits",
      status: "ACTIVE",
      currentPeriodEnd: new Date(Date.now() + 25 * DAY_MS),
    });
    // Updated last, but long over.
    await seedSubscription(user.id, {
      productKey: "portfolio_pro",
      status: "CANCELED",
      currentPeriodEnd: new Date(Date.now() - 40 * DAY_MS),
    });

    const me = await billingMe(user);
    expect(me.status).toBe("ACTIVE");
    expect(me.productKey).toBe("ai_credits");
    expect(new Date(me.currentPeriodEnd).getTime()).toBeGreaterThan(Date.now());
  });

  it("refuses Creator Pro for an AI Credits subscriber and points at the bundle upgrade (V-202)", async () => {
    const user = await createUserWithSession();
    await seedSubscription(user.id, { productKey: "ai_credits" });

    const response = await asUser(user, "post", "/api/v1/billing/checkout").send({
      productKey: "portfolio_pro",
      interval: "monthly",
    });

    expect(response.status).toBe(409);
    expect(response.body.message).toContain("AI Credits");
    expect(response.body.message).toContain("Job Hunter Bundle");
    expect(response.body.details).toMatchObject({
      code: "UPGRADE_AVAILABLE",
      activeProductKey: "ai_credits",
      suggestedProductKey: "bundle",
      upgrade: { productKey: "bundle", interval: "monthly" },
    });
    expect(dodoMock.checkoutCreate).not.toHaveBeenCalled();
  });
});

describe("V-177 purchase confirmation emails", () => {
  it("confirms a pass with its name, price and expiry, once per payment", async () => {
    const user = await createUserWithSession();
    const event = paymentEvent({
      userId: user.id,
      paymentId: "pay_pass_mail",
      productId: "prod_bundle_seven_day",
      amount: 599,
    });
    await deliver(event);
    await deliver(event);

    await vi.waitFor(() =>
      expect(billingMailMock.sendPurchaseConfirmationEmail).toHaveBeenCalledTimes(1),
    );
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(billingMailMock.sendPurchaseConfirmationEmail).toHaveBeenCalledTimes(1);
    const details = billingMailMock.sendPurchaseConfirmationEmail.mock.calls[0]![1];
    expect(details).toMatchObject({
      kind: "pass",
      productName: "7-Day Hunt Pass",
      amountCents: 599,
      currency: "USD",
      renewsAt: null,
    });
    expect(new Date(details.accessEndsAt).getTime()).toBeGreaterThan(Date.now() + 6 * DAY_MS);
  });

  it("confirms a credit pack", async () => {
    const user = await createUserWithSession();
    await deliver(
      paymentEvent({
        userId: user.id,
        productId: "prod_pack_500",
        amount: 899,
        metadata: { veriworkly_user_id: user.id, veriworkly_product: "credit_pack_500" },
      }),
    );
    await vi.waitFor(() =>
      expect(billingMailMock.sendPurchaseConfirmationEmail).toHaveBeenCalledTimes(1),
    );
    expect(billingMailMock.sendPurchaseConfirmationEmail.mock.calls[0]![1]).toMatchObject({
      kind: "credit_pack",
      productName: "500 extra credits",
      amountCents: 899,
      credits: 500,
    });
  });

  it("confirms a subscription that goes from pending to active, naming AI Credits correctly", async () => {
    const user = await createUserWithSession();
    const nextBillingDate = new Date(Date.now() + 30 * DAY_MS);
    const base = {
      userId: user.id,
      subscriptionId: "sub_pending_then_active",
      productId: "prod_ai_credits_monthly",
      nextBillingDate,
    };
    await deliver(subscriptionEvent({ ...base, status: "pending", at: eventTime(0) }));
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(billingMailMock.sendPurchaseConfirmationEmail).not.toHaveBeenCalled();

    await deliver(subscriptionEvent({ ...base, status: "active", at: eventTime(1) }));
    await deliver(
      subscriptionEvent({
        ...base,
        status: "active",
        type: "subscription.renewed",
        at: eventTime(2),
      }),
    );
    await vi.waitFor(() =>
      expect(billingMailMock.sendPurchaseConfirmationEmail).toHaveBeenCalledTimes(1),
    );
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(billingMailMock.sendPurchaseConfirmationEmail).toHaveBeenCalledTimes(1);
    const details = billingMailMock.sendPurchaseConfirmationEmail.mock.calls[0]![1];
    expect(details).toMatchObject({
      kind: "subscription",
      productName: "AI Credits (monthly)",
      amountCents: 599,
      currency: "USD",
    });
    expect(new Date(details.renewsAt).getTime()).toBe(nextBillingDate.getTime());
  });
});

describe("V-188 admin goodwill credits are not a purchase", () => {
  it("leaves a free user free after an admin credit grant, while a pack buyer is paying", async () => {
    const user = await createUserWithSession();
    const granted = await asUser(admin, "post", `${ADMIN}/billing/credits`).send({
      userId: user.id,
      amount: 40,
      reason: "Support goodwill credit",
    });
    expect(granted.status).toBe(200);

    const me = await billingMe(user);
    expect(me.access).toMatchObject({ tier: "free", isPaying: false, creditBalance: 40 });

    await deliver(
      paymentEvent({
        userId: user.id,
        productId: "prod_pack_250",
        amount: 499,
        metadata: { veriworkly_user_id: user.id, veriworkly_product: "credit_pack_250" },
      }),
    );
    expect((await billingMe(user)).access).toMatchObject({
      tier: "credits",
      isPaying: true,
      creditBalance: 290,
    });
  });
});

describe("owner decision: subscription credits reset monthly, nothing rolls over", () => {
  async function annualSubscriber(
    subscriptionId: string,
    productId = "prod_ai_credits_annual",
    periodStart = new Date(Date.now() - 60_000),
  ) {
    const user = await createUserWithSession();
    const periodEnd = addMonthsUtc(periodStart, 12);
    await deliver(
      subscriptionEvent({
        userId: user.id,
        subscriptionId,
        productId,
        status: "active",
        at: eventTime(0),
        nextBillingDate: periodEnd,
      }),
    );
    const payment = paymentEvent({
      userId: user.id,
      subscriptionId,
      productId,
      amount: 5_988,
      at: periodStart,
      servicePeriod: { startsAt: periodStart, endsAt: periodEnd },
    });
    await deliver(payment);
    return { user, periodStart, periodEnd, payment };
  }

  async function creditGrants(userId: string) {
    return prisma.creditGrant.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  }

  async function liveCredits(userId: string, at: Date) {
    const live = await prisma.creditGrant.aggregate({
      where: { userId, remaining: { gt: 0 }, OR: [{ expiresAt: null }, { expiresAt: { gt: at } }] },
      _sum: { remaining: true },
    });
    return live._sum.remaining ?? 0;
  }

  it("grants 1,000 on payment, then one month at a time, each expiring when its month ends", async () => {
    const { user, periodStart, payment } = await annualSubscriber("sub_annual_monthly");

    let grants = await creditGrants(user.id);
    expect(grants.map((grant) => grant.amount)).toEqual([1_000]);
    expect(grants[0]!.expiresAt?.getTime()).toBe(addMonthsUtc(periodStart, 1).getTime());

    // Retried payment and repeated job runs inside month one: nothing new.
    await deliver(payment);
    await runAnnualCreditGrants(new Date(periodStart.getTime() + 10 * DAY_MS));
    await runAnnualCreditGrants(new Date(periodStart.getTime() + 20 * DAY_MS));
    expect((await creditGrants(user.id)).length).toBe(1);

    // Month two, run twice (two workers, a retry): exactly one more grant.
    const monthTwo = new Date(addMonthsUtc(periodStart, 1).getTime() + DAY_MS);
    await Promise.all([runAnnualCreditGrants(monthTwo), runAnnualCreditGrants(monthTwo)]);
    grants = await creditGrants(user.id);
    expect(grants.map((grant) => grant.amount)).toEqual([1_000, 1_000]);
    expect(grants[1]!.expiresAt?.getTime()).toBe(addMonthsUtc(periodStart, 2).getTime());

    // At the month boundary month one's unused credits are swept, not carried over.
    await sweepExpiredCredits(monthTwo);
    expect(await liveCredits(user.id, monthTwo)).toBe(1_000);
    const wallet = await prisma.creditWallet.findUniqueOrThrow({ where: { userId: user.id } });
    expect(wallet.balance).toBe(1_000);
    await expectLedgerBalanced(user.id);
  });

  it("does not grant months that ended while the job was down, never beyond twelve", async () => {
    const { user, periodStart, periodEnd } = await annualSubscriber("sub_annual_catch_up");

    await runAnnualCreditGrants(new Date(periodStart.getTime() + 400 * DAY_MS));
    expect((await creditGrants(user.id)).length).toBe(1);

    // Down from month two to month twelve: only month twelve, which is still running, is granted.
    const lastMonth = new Date(periodEnd.getTime() - DAY_MS);
    await runAnnualCreditGrants(lastMonth);
    const grants = await creditGrants(user.id);
    expect(grants.length).toBe(2);
    expect(grants[1]!.expiresAt?.getTime()).toBe(periodEnd.getTime());
    await sweepExpiredCredits(lastMonth);
    expect(await liveCredits(user.id, lastMonth)).toBe(1_000);
    await expectLedgerBalanced(user.id);
  });

  it("spends the month's credits before a credit pack and leaves the pack alone at the reset", async () => {
    const { user, periodStart } = await annualSubscriber("sub_annual_with_pack");
    await deliver(
      paymentEvent({
        userId: user.id,
        productId: "prod_pack_250",
        amount: 499,
        metadata: { veriworkly_user_id: user.id, veriworkly_product: "credit_pack_250" },
      }),
    );

    await CreditService.consume(user.id, 100, {
      requestId: `spend_${randomUUID()}`,
      action: "ats_analysis",
    });
    const pack = await prisma.creditGrant.findFirstOrThrow({
      where: { userId: user.id, source: "credit_pack" },
    });
    expect(pack.remaining).toBe(250);

    const monthTwo = new Date(addMonthsUtc(periodStart, 1).getTime() + 60_000);
    await sweepExpiredCredits(monthTwo);
    await runAnnualCreditGrants(monthTwo);

    expect((await prisma.creditGrant.findUniqueOrThrow({ where: { id: pack.id } })).remaining).toBe(
      250,
    );
    expect(await liveCredits(user.id, monthTwo)).toBe(1_250);
    await expectLedgerBalanced(user.id);
  });

  it("lets a reservation made before the boundary commit, then expires the rest", async () => {
    const { user, periodStart } = await annualSubscriber("sub_annual_reservation");
    const requestId = `req_${randomUUID()}`;
    await CreditService.reserve(user.id, 30, "ats_analysis", requestId);
    // A long-running request: the reservation is still open when the month ends.
    await prisma.creditReservation.update({
      where: { userId_requestId: { userId: user.id, requestId: `ai:${requestId}` } },
      data: { expiresAt: new Date(periodStart.getTime() + 60 * DAY_MS) },
    });

    const monthTwo = new Date(addMonthsUtc(periodStart, 1).getTime() + 60_000);
    // The sweep's per-wallet steps, for this wallet only (the full sweep visits every test's).
    const sweep = async () => {
      await CreditService.releaseExpiredReservations(user.id, monthTwo);
      return CreditService.expireCredits(user.id, monthTwo);
    };
    // The expiry waits for the reservation; month two is granted meanwhile.
    expect(await sweep()).toBe(0);
    await runAnnualCreditGrants(monthTwo);
    await expectLedgerBalanced(user.id);

    const debit = await CreditService.commitReservation(user.id, requestId, {});
    const allocations = await prisma.creditUsageAllocation.findMany({
      where: { transactionId: debit.id },
      include: { grant: { select: { sourceId: true } } },
    });
    expect(allocations.map((item) => item.grant.sourceId.endsWith(":0"))).toEqual([true]);
    await expectLedgerBalanced(user.id);

    expect(await sweep()).toBe(970);
    expect(await liveCredits(user.id, monthTwo)).toBe(1_000);
    const wallet = await prisma.creditWallet.findUniqueOrThrow({ where: { userId: user.id } });
    expect(wallet).toMatchObject({ balance: 1_000, reserved: 0 });
    await expectLedgerBalanced(user.id);
  });

  it("keeps granting after a cancellation until the paid period ends, judged at each month's start", async () => {
    const { user, periodStart } = await annualSubscriber("sub_annual_cancel");
    // Cancelled during month two, with access paid until day 40.
    const paidUntil = new Date(periodStart.getTime() + 40 * DAY_MS);
    await deliver(
      subscriptionEvent({
        userId: user.id,
        subscriptionId: "sub_annual_cancel",
        productId: "prod_ai_credits_annual",
        status: "cancelled",
        at: eventTime(5),
        nextBillingDate: paidUntil,
      }),
    );

    // Month two started before the paid period ended: granted, although the plan is cancelled now.
    await runAnnualCreditGrants(new Date(addMonthsUtc(periodStart, 1).getTime() + DAY_MS));
    expect((await creditGrants(user.id)).length).toBe(2);

    // Month three starts after it: nothing more, and the schedule stops.
    await runAnnualCreditGrants(new Date(addMonthsUtc(periodStart, 2).getTime() + DAY_MS));
    expect((await creditGrants(user.id)).length).toBe(2);
    const schedule = await prisma.subscriptionCreditSchedule.findFirstOrThrow({
      where: { providerSubId: "sub_annual_cancel" },
    });
    expect(schedule.stoppedAt).not.toBeNull();
    await expectLedgerBalanced(user.id);
  });

  it("keeps an annual plan's monthly credits running after a partial refund", async () => {
    const { user, periodStart, payment } = await annualSubscriber("sub_annual_partial_refund");
    const { response } = await deliver({
      type: "refund.succeeded",
      timestamp: new Date().toISOString(),
      data: {
        refund_id: `ref_${randomUUID()}`,
        payment_id: payment.data.payment_id,
        status: "succeeded",
        is_partial: true,
        amount: 1_000,
        currency: "USD",
        created_at: new Date().toISOString(),
      },
    });
    expect(response.status, JSON.stringify(response.body)).toBe(200);

    await runAnnualCreditGrants(new Date(addMonthsUtc(periodStart, 1).getTime() + DAY_MS));
    expect((await creditGrants(user.id)).length).toBe(2);
    const schedule = await prisma.subscriptionCreditSchedule.findFirstOrThrow({
      where: { providerSubId: "sub_annual_partial_refund" },
    });
    expect(schedule.stoppedAt).toBeNull();
  });

  it("opens no monthly schedule for a legacy holder whose up-front grant is keyed on a bare payment id", async () => {
    const user = await createUserWithSession();
    const subscriptionId = "sub_annual_legacy_bare";
    await deliver(
      subscriptionEvent({
        userId: user.id,
        subscriptionId,
        productId: "prod_ai_credits_annual",
        status: "active",
        at: eventTime(0),
        nextBillingDate: new Date(Date.now() + 200 * DAY_MS),
      }),
    );
    // The oldest legacy grants carry only the payment id, nothing that names the subscription.
    await CreditService.grant(user.id, 12_000, {
      requestId: "subscription-credit:pay_legacy_bare",
      source: "subscription_payment",
      sourceId: "pay_legacy_bare",
      expiresAt: new Date(Date.now() + 200 * DAY_MS),
      reason: "AI Credits credit allowance",
    });

    const startsAt = new Date(Date.now() - 60_000);
    await deliver(
      paymentEvent({
        userId: user.id,
        subscriptionId,
        productId: "prod_ai_credits_annual",
        amount: 4_200,
        servicePeriod: { startsAt, endsAt: addMonthsUtc(startsAt, 12) },
      }),
    );

    expect(
      await prisma.subscriptionCreditSchedule.count({ where: { providerSubId: subscriptionId } }),
    ).toBe(0);
    expect(await liveCredits(user.id, new Date())).toBe(12_000);
  });

  it("stops an annual plan's monthly credits when its payment is refunded", async () => {
    const { user, periodStart, payment } = await annualSubscriber("sub_annual_refunded");
    const { response } = await deliver({
      type: "refund.succeeded",
      timestamp: new Date().toISOString(),
      data: {
        refund_id: `ref_${randomUUID()}`,
        payment_id: payment.data.payment_id,
        status: "succeeded",
        is_partial: false,
        amount: 5_988,
        currency: "USD",
        created_at: new Date().toISOString(),
      },
    });
    expect(response.status, JSON.stringify(response.body)).toBe(200);

    await runAnnualCreditGrants(new Date(addMonthsUtc(periodStart, 1).getTime() + DAY_MS));
    expect((await creditGrants(user.id)).length).toBe(1);
    const schedule = await prisma.subscriptionCreditSchedule.findFirstOrThrow({
      where: { providerSubId: "sub_annual_refunded" },
    });
    expect(schedule.stoppedAt).not.toBeNull();
  });

  it("names the refunded product on the refund's billing history row (V-197)", async () => {
    const { user, payment } = await annualSubscriber("sub_annual_refund_named");
    const refund = await deliver({
      type: "refund.succeeded",
      timestamp: new Date().toISOString(),
      data: {
        refund_id: `ref_${randomUUID()}`,
        payment_id: payment.data.payment_id,
        status: "succeeded",
        is_partial: false,
        amount: 5_988,
        currency: "USD",
        created_at: new Date().toISOString(),
      },
    });
    expect(refund.response.status, JSON.stringify(refund.response.body)).toBe(200);

    const history = await request(app)
      .get("/api/v1/billing/history")
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", user.cookie);
    const row = (history.body.data as Array<Record<string, unknown>>).find(
      (item) => item.providerEventId === refund.eventId,
    );
    expect(row).toMatchObject({
      type: "refund.succeeded",
      productName: "AI Credits (annual)",
      amountCents: 5_988,
      currency: "USD",
    });
  });

  it("stops when the plan changes to one without credits and continues across an AI-to-bundle upgrade", async () => {
    const upgraded = await annualSubscriber("sub_annual_upgrade");
    await deliver(
      subscriptionEvent({
        userId: upgraded.user.id,
        subscriptionId: "sub_annual_upgrade",
        productId: "prod_bundle_annual",
        status: "active",
        type: "subscription.plan_changed",
        at: eventTime(5),
        nextBillingDate: upgraded.periodEnd,
      }),
    );
    await runAnnualCreditGrants(new Date(upgraded.periodStart.getTime() + 32 * DAY_MS));
    expect((await creditGrants(upgraded.user.id)).length).toBe(2);

    const downgraded = await annualSubscriber("sub_annual_downgrade");
    await deliver(
      subscriptionEvent({
        userId: downgraded.user.id,
        subscriptionId: "sub_annual_downgrade",
        productId: "prod_portfolio_pro_annual",
        status: "active",
        type: "subscription.plan_changed",
        at: eventTime(5),
        nextBillingDate: downgraded.periodEnd,
      }),
    );
    await runAnnualCreditGrants(new Date(downgraded.periodStart.getTime() + 32 * DAY_MS));
    expect((await creditGrants(downgraded.user.id)).length).toBe(1);
  });

  it("starts a fresh twelve months on renewal", async () => {
    const { user, periodEnd } = await annualSubscriber("sub_annual_renew");
    const nextEnd = addMonthsUtc(periodEnd, 12);
    await prisma.subscription.update({
      where: { providerSubId: "sub_annual_renew" },
      data: { currentPeriodEnd: nextEnd },
    });
    await deliver(
      paymentEvent({
        userId: user.id,
        subscriptionId: "sub_annual_renew",
        productId: "prod_ai_credits_annual",
        amount: 5_988,
        at: periodEnd,
        servicePeriod: { startsAt: periodEnd, endsAt: nextEnd },
      }),
    );
    // Paid ahead of time: the new year's first month arrives when that year starts.
    expect((await creditGrants(user.id)).length).toBe(1);
    await runAnnualCreditGrants(new Date(periodEnd.getTime() + 60_000));

    const grants = await creditGrants(user.id);
    expect(grants.map((grant) => grant.amount)).toEqual([1_000, 1_000]);
    expect(grants[1]!.expiresAt?.getTime()).toBe(addMonthsUtc(periodEnd, 1).getTime());
    await expectLedgerBalanced(user.id);
  });

  it("opens next year's schedule for a renewal paid more than a week early without service periods", async () => {
    const user = await createUserWithSession();
    const subscriptionId = "sub_annual_early_renewal";
    const firstPaidAt = new Date(Date.now() - 340 * DAY_MS);
    await deliver(
      subscriptionEvent({
        userId: user.id,
        subscriptionId,
        productId: "prod_ai_credits_annual",
        status: "active",
        at: eventTime(0),
        nextBillingDate: new Date(firstPaidAt.getTime() + 365 * DAY_MS),
      }),
    );
    const firstPayment = paymentEvent({
      userId: user.id,
      subscriptionId,
      productId: "prod_ai_credits_annual",
      amount: 5_988,
      at: firstPaidAt,
    });
    await deliver(firstPayment);
    const [first] = await prisma.subscriptionCreditSchedule.findMany({
      where: { providerSubId: subscriptionId },
    });
    expect(first!.periodEnd.getTime()).toBeGreaterThan(Date.now() + 7 * DAY_MS);

    // The renewal, 25 days before the year is up.
    await deliver(
      paymentEvent({
        userId: user.id,
        subscriptionId,
        productId: "prod_ai_credits_annual",
        amount: 5_988,
      }),
    );
    // A redelivery of the first payment opens nothing.
    await deliver(firstPayment);

    const schedules = await prisma.subscriptionCreditSchedule.findMany({
      where: { providerSubId: subscriptionId },
      orderBy: { periodStart: "asc" },
    });
    expect(schedules.length).toBe(2);
    expect(schedules[1]!.periodStart.getTime()).toBe(first!.periodEnd.getTime());

    // Next year's month one is granted when that year starts, and only once the subscription
    // shows the renewed period: a stale ACTIVE label for the old year grants nothing.
    const nextYearStart = new Date(first!.periodEnd.getTime() + 60_000);
    const nextYearGrants = () =>
      prisma.creditGrant.count({
        where: { userId: user.id, sourceId: { startsWith: `${schedules[1]!.id}:` } },
      });
    await runAnnualCreditGrants(nextYearStart);
    expect(await nextYearGrants()).toBe(0);
    expect(
      (
        await prisma.subscriptionCreditSchedule.findUniqueOrThrow({
          where: { id: schedules[1]!.id },
        })
      ).stoppedAt,
    ).toBeNull();

    await deliver(
      subscriptionEvent({
        userId: user.id,
        subscriptionId,
        productId: "prod_ai_credits_annual",
        status: "active",
        type: "subscription.renewed",
        at: eventTime(10),
        nextBillingDate: schedules[1]!.periodEnd,
      }),
    );
    await runAnnualCreditGrants(nextYearStart);
    expect(await nextYearGrants()).toBe(1);
    await expectLedgerBalanced(user.id);
  });

  it("does not read a mid-year plan-change payment without service periods as an early renewal", async () => {
    const user = await createUserWithSession();
    const subscriptionId = "sub_annual_mid_year_change";
    const firstPaidAt = new Date(Date.now() - 180 * DAY_MS);
    await deliver(
      subscriptionEvent({
        userId: user.id,
        subscriptionId,
        productId: "prod_ai_credits_annual",
        status: "active",
        at: eventTime(0),
        nextBillingDate: new Date(firstPaidAt.getTime() + 365 * DAY_MS),
      }),
    );
    const base = { userId: user.id, subscriptionId, productId: "prod_ai_credits_annual" };
    await deliver(paymentEvent({ ...base, amount: 5_988, at: firstPaidAt }));
    // A proration for an upgrade, half-way through the year.
    await deliver(paymentEvent({ ...base, amount: 4_200 }));

    expect(
      await prisma.subscriptionCreditSchedule.count({ where: { providerSubId: subscriptionId } }),
    ).toBe(1);
  });

  it("never cuts a legacy annual holder's up-front 12,000 when a later payment lands", async () => {
    const user = await createUserWithSession();
    const subscriptionId = "sub_annual_legacy";
    const periodStart = new Date(Date.now() - 60_000);
    const periodEnd = addMonthsUtc(periodStart, 12);
    await deliver(
      subscriptionEvent({
        userId: user.id,
        subscriptionId,
        productId: "prod_ai_credits_annual",
        status: "active",
        at: eventTime(0),
        nextBillingDate: periodEnd,
      }),
    );
    // What the previous release granted for an annual payment: the year's credits at once.
    const legacyEnds = new Date(Date.now() + 200 * DAY_MS);
    await CreditService.grant(user.id, 12_000, {
      requestId: "subscription-credit:pay_legacy_annual",
      source: "subscription_payment",
      sourceId: `${subscriptionId}:2026-04-26T00:00:00.000Z`,
      expiresAt: legacyEnds,
      reason: "AI Credits credit allowance",
    });

    await deliver(
      paymentEvent({
        userId: user.id,
        subscriptionId,
        productId: "prod_ai_credits_annual",
        amount: 5_988,
        at: periodStart,
        servicePeriod: { startsAt: periodStart, endsAt: periodEnd },
      }),
    );

    const legacy = await prisma.creditGrant.findFirstOrThrow({
      where: { userId: user.id, amount: 12_000 },
    });
    expect(legacy.expiresAt?.getTime()).toBe(legacyEnds.getTime());
    // A mid-year payment (a plan change) while the up-front year runs opens no monthly schedule
    // on top of it.
    expect(
      await prisma.subscriptionCreditSchedule.count({ where: { providerSubId: subscriptionId } }),
    ).toBe(0);
    expect(await liveCredits(user.id, new Date())).toBe(12_000);

    // The renewal for the period after the legacy year does open one.
    await deliver(
      paymentEvent({
        userId: user.id,
        subscriptionId,
        productId: "prod_ai_credits_annual",
        amount: 5_988,
        servicePeriod: { startsAt: legacyEnds, endsAt: addMonthsUtc(legacyEnds, 12) },
      }),
    );
    expect(
      await prisma.subscriptionCreditSchedule.count({ where: { providerSubId: subscriptionId } }),
    ).toBe(1);
    await expectLedgerBalanced(user.id);
  });

  it("still grants a monthly plan's 1,000 per payment, expiring at the end of the paid month", async () => {
    const user = await createUserWithSession();
    const startsAt = new Date(Date.now() - 60_000);
    const endsAt = addMonthsUtc(startsAt, 1);
    await deliver(
      paymentEvent({
        userId: user.id,
        productId: "prod_bundle_monthly",
        subscriptionId: "sub_bundle_monthly_credits",
        amount: 1_499,
        servicePeriod: { startsAt, endsAt },
      }),
    );
    const grants = await creditGrants(user.id);
    expect(grants.map((grant) => grant.amount)).toEqual([1_000]);
    expect(grants[0]!.expiresAt?.getTime()).toBe(endsAt.getTime());
  });

  it("replaces last month's monthly credits with the renewal's 1,000 instead of adding to them", async () => {
    const user = await createUserWithSession();
    const base = {
      userId: user.id,
      productId: "prod_ai_credits_monthly",
      subscriptionId: "sub_monthly_reset",
      amount: 599,
    };
    const first = paymentEvent(base);
    await deliver(first);
    await CreditService.consume(user.id, 200, {
      requestId: `spend_${randomUUID()}`,
      action: "ats_analysis",
    });

    // The renewal, without service periods; then a redelivery of both payments.
    const renewal = paymentEvent(base);
    await deliver(renewal);
    await deliver(first);
    await deliver(renewal);

    const after = new Date(Date.now() + 60_000);
    await sweepExpiredCredits(after);
    const grants = await creditGrants(user.id);
    expect(grants.length).toBe(2);
    expect(grants[0]!.remaining).toBe(0);
    expect(await liveCredits(user.id, after)).toBe(1_000);
    await expectLedgerBalanced(user.id);
  });

  it("says the credits reset monthly in the purchase confirmation", async () => {
    const user = await createUserWithSession();
    await deliver(
      subscriptionEvent({
        userId: user.id,
        subscriptionId: "sub_annual_note",
        productId: "prod_ai_credits_annual",
        status: "active",
        at: eventTime(0),
        nextBillingDate: new Date(Date.now() + 365 * DAY_MS),
      }),
    );
    await vi.waitFor(() =>
      expect(billingMailMock.sendPurchaseConfirmationEmail).toHaveBeenCalledTimes(1),
    );
    const note: string =
      billingMailMock.sendPurchaseConfirmationEmail.mock.calls[0]![1].creditsNote;
    expect(note).toMatch(/reset|expire/i);
    expect(note).not.toMatch(/roll over until/i);
  });
});

describe("review fixes: admin status edits, dunning overlap and billing mail retries", () => {
  it("refuses a local CANCELED label on a provider subscription the provider still bills", async () => {
    const user = await createUserWithSession();
    const subscription = await seedSubscription(user.id);
    dodoMock.subscriptionsRetrieve.mockResolvedValue({
      subscription_id: subscription.providerSubId,
      status: "active",
    });

    const response = await asUser(
      admin,
      "patch",
      `${ADMIN}/billing/subscriptions/${subscription.id}`,
    ).send({ status: "CANCELED", reason: "Customer asked by email" });

    expect(response.status, JSON.stringify(response.body)).toBe(409);
    expect(dodoMock.subscriptionsRetrieve).toHaveBeenCalledWith(subscription.providerSubId);
    expect(
      (await prisma.subscription.findUniqueOrThrow({ where: { id: subscription.id } })).status,
    ).toBe("ACTIVE");
  });

  it("mirrors a cancellation the provider confirms, raw status included", async () => {
    const user = await createUserWithSession();
    const subscription = await seedSubscription(user.id);
    dodoMock.subscriptionsRetrieve.mockResolvedValue({
      subscription_id: subscription.providerSubId,
      status: "cancelled",
    });

    const response = await asUser(
      admin,
      "patch",
      `${ADMIN}/billing/subscriptions/${subscription.id}`,
    ).send({ status: "CANCELED", reason: "Cancelled in the Dodo dashboard, webhook lost" });

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    const row = await prisma.subscription.findUniqueOrThrow({ where: { id: subscription.id } });
    expect(row).toMatchObject({ status: "CANCELED", rawStatus: "cancelled" });
  });

  it("treats a subscription in dunning as live for checkout even after the grace window", async () => {
    const user = await createUserWithSession();
    await seedSubscription(user.id, {
      productKey: "ai_credits",
      status: "PAST_DUE",
      currentPeriodEnd: new Date(Date.now() - 20 * DAY_MS),
      graceEndsAt: new Date(Date.now() - 5 * DAY_MS),
    });

    const response = await asUser(user, "post", "/api/v1/billing/checkout").send({
      productKey: "ai_credits",
      interval: "monthly",
    });

    expect(response.status, JSON.stringify(response.body)).toBe(409);
    expect(response.body.details).toMatchObject({ code: "PAYMENT_OUTSTANDING" });
    expect(dodoMock.checkoutCreate).not.toHaveBeenCalled();
  });

  it("tells a paused subscriber to resume, not that a payment is outstanding", async () => {
    const user = await createUserWithSession();
    const paused = await seedSubscription(user.id, {
      productKey: "ai_credits",
      status: "PAST_DUE",
      graceEndsAt: new Date(Date.now() + 5 * DAY_MS),
    });
    await prisma.subscription.update({ where: { id: paused.id }, data: { rawStatus: "paused" } });

    const response = await asUser(user, "post", "/api/v1/billing/checkout").send({
      productKey: "ai_credits",
      interval: "monthly",
    });

    expect(response.status, JSON.stringify(response.body)).toBe(409);
    expect(response.body.details).toMatchObject({ code: "SUBSCRIPTION_PAUSED" });
    expect(response.body.message).toMatch(/paused/i);
    expect(response.body.message).not.toMatch(/payment outstanding/i);
  });

  it("shows a subscriber in dunning as paying with a payment issue, not as free", async () => {
    const user = await createUserWithSession();
    await seedSubscription(user.id, {
      productKey: "ai_credits",
      status: "PAST_DUE",
      currentPeriodEnd: new Date(Date.now() - 2 * DAY_MS),
      graceEndsAt: new Date(Date.now() + 5 * DAY_MS),
    });

    const me = await billingMe(user);
    expect(me.access).toMatchObject({ tier: "ai_credits", isPaying: true, paymentIssue: true });
  });

  it("stops retrying a payment-failed email once the subscription has recovered", async () => {
    const user = await createUserWithSession();
    const subscription = await seedSubscription(user.id, { productKey: "ai_credits" });
    billingMailMock.sendPaymentFailedEmail.mockRejectedValueOnce(new Error("smtp down"));
    await deliver(
      paymentEvent({
        type: "payment.failed",
        userId: user.id,
        paymentId: "pay_failed_then_recovered",
        subscriptionId: subscription.providerSubId,
        productId: "prod_ai_credits_monthly",
        amount: 599,
      }),
    );
    await vi.waitFor(() => expect(billingMailMock.sendPaymentFailedEmail).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 200));

    // The card went through on the provider's retry: the subscription is ACTIVE for a new period.
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "ACTIVE", currentPeriodEnd: new Date(Date.now() + 30 * DAY_MS) },
    });
    await retryUnsentBillingNotifications(new Date(Date.now() + 30 * 60_000));
    await retryUnsentBillingNotifications(new Date(Date.now() + 120 * 60_000));

    const sentToUser = billingMailMock.sendPaymentFailedEmail.mock.calls.filter(
      ([email]) => email === user.email,
    );
    expect(sentToUser.length).toBe(1);
  });

  it("refuses to revoke an entitlement a subscription grants, since its next webhook restores it", async () => {
    const user = await createUserWithSession();
    const grant = await prisma.entitlementGrant.create({
      data: { userId: user.id, key: "ai_credits", source: "SUBSCRIPTION", sourceId: "sub_revoke" },
    });

    const response = await asUser(
      admin,
      "delete",
      `${ADMIN}/billing/entitlements/${grant.id}`,
    ).send({ reason: "Chargeback" });

    expect(response.status, JSON.stringify(response.body)).toBe(409);
    expect(response.body.message).toMatch(/subscription/i);
    expect(
      (await prisma.entitlementGrant.findUniqueOrThrow({ where: { id: grant.id } })).revokedAt,
    ).toBeNull();
  });

  it("retries a billing email whose sender crashed after claiming it, and sends it once", async () => {
    const user = await createUserWithSession();
    // What a crash between the claim and the send leaves behind.
    await prisma.billingNotification.create({
      data: {
        userId: user.id,
        kind: "payment_failed",
        reference: "pay_crashed_claim",
        payload: {
          template: "payment_failed",
          details: {
            productName: "AI Credits",
            amountCents: 599,
            currency: "USD",
            graceEndsAt: new Date(Date.now() + 5 * DAY_MS).toISOString(),
          },
        },
        claimedAt: new Date(Date.now() - 30 * 60_000),
      },
    });

    // A fresh claim (still being sent) is left alone.
    await prisma.billingNotification.create({
      data: {
        userId: user.id,
        kind: "payment_failed",
        reference: "pay_in_flight",
        payload: {
          template: "payment_failed",
          details: { productName: "AI Credits", amountCents: 599, currency: "USD" },
        },
        claimedAt: new Date(),
      },
    });

    await Promise.all([retryUnsentBillingNotifications(), retryUnsentBillingNotifications()]);
    await retryUnsentBillingNotifications();

    expect(billingMailMock.sendPaymentFailedEmail).toHaveBeenCalledTimes(1);
    const [email, details] = billingMailMock.sendPaymentFailedEmail.mock.calls[0]!;
    expect(email).toBe(user.email);
    expect(details.graceEndsAt).toBeInstanceOf(Date);
    const rows = await prisma.billingNotification.findMany({
      where: { userId: user.id },
      orderBy: { reference: "asc" },
    });
    expect(rows.map((row) => [row.reference, row.sentAt !== null])).toEqual([
      ["pay_crashed_claim", true],
      ["pay_in_flight", false],
    ]);
  });

  it("keeps a failed send's claim for the retry instead of losing the email", async () => {
    const user = await createUserWithSession();
    const subscription = await seedSubscription(user.id, { productKey: "ai_credits" });
    billingMailMock.sendPaymentFailedEmail.mockRejectedValueOnce(new Error("smtp down"));

    await deliver(
      paymentEvent({
        type: "payment.failed",
        userId: user.id,
        paymentId: "pay_failed_retry",
        subscriptionId: subscription.providerSubId,
        productId: "prod_ai_credits_monthly",
        amount: 599,
      }),
    );
    await vi.waitFor(() => expect(billingMailMock.sendPaymentFailedEmail).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 200));
    const claim = await prisma.billingNotification.findUniqueOrThrow({
      where: { kind_reference: { kind: "payment_failed", reference: "pay_failed_retry" } },
    });
    expect(claim.sentAt).toBeNull();

    await retryUnsentBillingNotifications(new Date(Date.now() + 30 * 60_000));
    const sentToUser = billingMailMock.sendPaymentFailedEmail.mock.calls.filter(
      ([email]) => email === user.email,
    );
    expect(sentToUser.length).toBe(2);
    expect(
      (
        await prisma.billingNotification.findUniqueOrThrow({
          where: { kind_reference: { kind: "payment_failed", reference: "pay_failed_retry" } },
        })
      ).sentAt,
    ).not.toBeNull();
  });
});

describe("V-197 billing payloads carry what the studio shows", () => {
  async function billingHistory(user: TestUser) {
    const response = await request(app)
      .get("/api/v1/billing/history")
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", user.cookie);
    expect(response.status).toBe(200);
    return response.body.data as Array<Record<string, unknown>>;
  }

  it("prices each credit pack in the /billing/me catalog", async () => {
    const user = await createUserWithSession();
    const { creditEconomics } = await billingMe(user);

    expect(creditEconomics.packs).toEqual([
      expect.objectContaining({
        key: "credit_pack_250",
        name: "250 extra credits",
        credits: 250,
        price: 299,
        currency: "USD",
      }),
      expect.objectContaining({
        key: "credit_pack_500",
        name: "500 extra credits",
        credits: 500,
        price: 499,
        currency: "USD",
      }),
    ]);
  });

  it("names the product and amount on each billing history row", async () => {
    const user = await createUserWithSession();
    const pass = await deliver(
      paymentEvent({ userId: user.id, productId: "prod_bundle_seven_day", amount: 599 }),
    );
    const pack = await deliver(
      paymentEvent({
        userId: user.id,
        productId: "prod_pack_250",
        amount: 299,
        metadata: { veriworkly_user_id: user.id, veriworkly_product: "credit_pack_250" },
      }),
    );
    const subscription = await deliver(
      subscriptionEvent({
        userId: user.id,
        subscriptionId: `sub_${randomUUID()}`,
        productId: "prod_ai_credits_monthly",
        status: "active",
        at: eventTime(1),
        nextBillingDate: new Date(Date.now() + 30 * DAY_MS),
      }),
    );
    for (const delivered of [pass, pack, subscription])
      expect(delivered.response.status, JSON.stringify(delivered.response.body)).toBe(200);

    const rows = await billingHistory(user);
    const byEvent = (eventId: string) => rows.find((row) => row.providerEventId === eventId);

    expect(byEvent(pass.eventId)).toMatchObject({
      type: "payment.succeeded",
      productName: "7-Day Hunt Pass",
      amountCents: 599,
      currency: "USD",
    });
    expect(byEvent(pack.eventId)).toMatchObject({
      type: "payment.succeeded",
      productName: "250 extra credits",
      amountCents: 299,
      currency: "USD",
    });
    expect(byEvent(subscription.eventId)).toMatchObject({
      type: "subscription.active",
      productName: "AI Credits (monthly)",
      amountCents: 599,
      currency: "USD",
    });
    // Additive: the existing fields are all still there, and the raw payload is never sent.
    for (const row of rows) {
      expect(row).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          providerEventId: expect.any(String),
          type: expect.any(String),
          createdAt: expect.any(String),
        }),
      );
      expect(row).not.toHaveProperty("payload");
    }
  });

  it("describes a row stored before the columns existed from its payload, and a redacted one as unknown", async () => {
    const user = await createUserWithSession();
    const legacy = paymentEvent({ userId: user.id, productId: "prod_bundle_one_day", amount: 299 });
    await prisma.billingWebhookEvent.createMany({
      data: [
        {
          providerEventId: `evt_legacy_${randomUUID()}`,
          userId: user.id,
          type: legacy.type,
          payload: legacy,
          status: "PROCESSED",
          processedAt: new Date(),
        },
        {
          providerEventId: `evt_redacted_${randomUUID()}`,
          userId: user.id,
          type: "payment.succeeded",
          payload: { redacted: true, type: "payment.succeeded" },
          status: "PROCESSED",
          processedAt: new Date(),
        },
      ],
    });

    const rows = await billingHistory(user);
    expect(rows.find((row) => String(row.providerEventId).startsWith("evt_legacy_"))).toMatchObject(
      { productName: "3-Day Sprint Pass", amountCents: 299, currency: "USD" },
    );
    expect(
      rows.find((row) => String(row.providerEventId).startsWith("evt_redacted_")),
    ).toMatchObject({ productName: null, amountCents: null, currency: null });
  });

  it("the migration backfills intact payloads, names refunds from their payment, and is idempotent", async () => {
    const migration = readFileSync(
      path.resolve(
        __dirname,
        "../../prisma/migrations/20261026160000_ai_replay_and_billing_event_summary/migration.sql",
      ),
      "utf8",
    );
    const statements = migration
      .split(/^-- backfill\r?$/m)
      .slice(1)
      .map((part) => part.slice(0, part.lastIndexOf(";") + 1).trim());
    expect(statements).toHaveLength(2);

    const user = await createUserWithSession();
    const tag = randomUUID();
    const pass = paymentEvent({
      userId: user.id,
      paymentId: `pay_pass_${tag}`,
      productId: "prod_bundle_seven_day",
      amount: 599,
      metadata: {
        veriworkly_user_id: user.id,
        veriworkly_product: "bundle",
        veriworkly_interval: "seven_day",
      },
    });
    const pack = paymentEvent({
      userId: user.id,
      productId: "prod_pack_500",
      amount: 499,
      currency: "usd",
      metadata: { veriworkly_user_id: user.id, veriworkly_product: "credit_pack_500" },
    });
    const subscription = subscriptionEvent({
      userId: user.id,
      subscriptionId: `sub_${tag}`,
      productId: "prod_ai_credits_annual",
      status: "active",
      at: eventTime(),
      nextBillingDate: null,
    });
    subscription.data.metadata = {
      veriworkly_user_id: user.id,
      veriworkly_product: "ai_credits",
      veriworkly_interval: "annual",
    } as typeof subscription.data.metadata;
    const refund = {
      type: "refund.succeeded",
      timestamp: new Date().toISOString(),
      data: { payment_id: `pay_pass_${tag}`, amount: 599, currency: "USD" },
    };
    const rows = [
      ["pass", pass.type, pass, {}],
      ["pack", pack.type, pack, {}],
      ["subscription", subscription.type, subscription, {}],
      ["refund", refund.type, refund, {}],
      ["redacted", "payment.succeeded", { redacted: true, type: "payment.succeeded" }, {}],
      ["kept", pack.type, pack, { productName: "Kept as stored" }],
    ] as const;
    await prisma.billingWebhookEvent.createMany({
      data: rows.map(([name, type, payload, columns]) => ({
        providerEventId: `evt_${name}_${tag}`,
        // What the code of that release stored: a refund of anything but an annual payment was
        // never attributed (V-197); migration 20261027090000 attributes it later (V-205).
        userId: name === "refund" ? null : user.id,
        type,
        payload,
        status: "PROCESSED" as const,
        processedAt: new Date(),
        ...columns,
      })),
    });

    for (let run = 0; run < 2; run++)
      for (const statement of statements) await prisma.$executeRawUnsafe(statement);

    const stored = await prisma.billingWebhookEvent.findMany({
      where: { providerEventId: { endsWith: `_${tag}` } },
      select: { providerEventId: true, productName: true, amountCents: true, currency: true },
    });
    const byName = (name: string) =>
      stored.find((row) => row.providerEventId === `evt_${name}_${tag}`);
    expect(byName("pass")).toMatchObject({
      productName: "7-Day Hunt Pass",
      amountCents: 599,
      currency: "USD",
    });
    expect(byName("pack")).toMatchObject({
      productName: "500 extra credits",
      amountCents: 499,
      currency: "USD",
    });
    expect(byName("subscription")).toMatchObject({
      productName: "AI Credits (annual)",
      amountCents: 599,
      currency: "USD",
    });
    expect(byName("refund")).toMatchObject({
      productName: "7-Day Hunt Pass",
      amountCents: 599,
      currency: "USD",
    });
    expect(byName("redacted")).toMatchObject({
      productName: null,
      amountCents: null,
      currency: null,
    });
    expect(byName("kept")).toMatchObject({ productName: "Kept as stored", amountCents: 499 });
  });
});
