import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { app } from "#app";
import { prisma } from "#lib/prisma";
import { getRedis } from "#lib/redis";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";
import { signDodoWebhook } from "./helpers/webhook.js";

/**
 * V-202: a mid-cycle upgrade from Creator Pro or AI Credits to the Job Hunter Bundle through a
 * Dodo plan change, against the real database. The Dodo client is the real SDK (webhook
 * signatures verify for real) with only the outbound calls replaced.
 */

const { billingMailMock, dodoMock } = vi.hoisted(() => ({
  billingMailMock: {
    sendPurchaseConfirmationEmail: vi.fn().mockResolvedValue(undefined),
    sendPaymentFailedEmail: vi.fn().mockResolvedValue(undefined),
    sendSubscriptionCancelledEmail: vi.fn().mockResolvedValue(undefined),
  },
  dodoMock: {
    previewChangePlan: vi.fn(),
    changePlan: vi.fn(),
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
          previewChangePlan: dodoMock.previewChangePlan,
          changePlan: dodoMock.changePlan,
        },
        checkoutSessions: { create: dodoMock.checkoutCreate },
      });
    }
  }
  return { ...actual, default: MockedDodo };
});

const { addMonthsUtc, runAnnualCreditGrants } = await import("#services/annualCreditService");
const { CreditService } = await import("#services/creditService");

const WEBHOOK_PATH = "/api/v1/billing/webhooks/dodo";
const PREVIEW_PATH = "/api/v1/billing/subscription/change-plan/preview";
const CHANGE_PATH = "/api/v1/billing/subscription/change-plan";
const DAY_MS = 24 * 60 * 60 * 1000;
const PORTFOLIO_KEYS = ["portfolio_publish", "seo_controls", "analytics", "watermark_removal"];
const BUNDLE_KEYS = ["ai_credits", ...PORTFOLIO_KEYS].sort();

beforeEach(() => {
  dodoMock.previewChangePlan.mockReset();
  dodoMock.changePlan.mockReset();
  dodoMock.checkoutCreate.mockReset();
});

let clock = 0;
/** Strictly increasing event times in the recent past, so no event is stale against another. */
function eventTime() {
  clock += 1;
  return new Date(Date.now() - 120_000 + clock * 100);
}

function subscriptionEvent(input: {
  userId: string;
  subscriptionId: string;
  productId: string;
  type?: string;
  status?: string;
  previousBillingDate: Date;
  nextBillingDate: Date;
}) {
  return {
    type: input.type ?? `subscription.${input.status ?? "active"}`,
    timestamp: eventTime().toISOString(),
    data: {
      subscription_id: input.subscriptionId,
      customer: { customer_id: "cus_plan_change" },
      product_id: input.productId,
      status: input.status ?? "active",
      cancel_at_next_billing_date: false,
      previous_billing_date: input.previousBillingDate.toISOString(),
      next_billing_date: input.nextBillingDate.toISOString(),
      recurring_pre_tax_amount: 1499,
      currency: "USD",
      metadata: { veriworkly_user_id: input.userId },
    },
  };
}

function paymentEvent(input: {
  userId: string;
  subscriptionId: string;
  productId: string;
  amount: number;
  type?: string;
  paymentId?: string;
  metadata?: Record<string, string>;
  servicePeriod?: { startsAt: Date; endsAt: Date };
  chargeType?: "new" | "renewal" | "plan_change";
}) {
  const at = eventTime();
  return {
    type: input.type ?? "payment.succeeded",
    timestamp: at.toISOString(),
    data: {
      payment_id: input.paymentId ?? `pay_${randomUUID()}`,
      subscription_id: input.subscriptionId,
      product_cart: [{ product_id: input.productId, quantity: 1 }],
      total_amount: input.amount,
      settlement_amount: input.amount,
      currency: "USD",
      settlement_currency: "USD",
      is_update_payment_method: false,
      created_at: at.toISOString(),
      customer: { customer_id: "cus_plan_change" },
      ...(input.chargeType ? { charge_type: input.chargeType } : {}),
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
  expect(response.status, JSON.stringify(response.body)).toBe(200);
  return headers["webhook-id"]!;
}

function asUser(user: TestUser, path: string, idempotencyKey?: string) {
  const req = request(app).post(path).set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie);
  return idempotencyKey ? req.set("Idempotency-Key", idempotencyKey) : req;
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
  return [...new Set(grants.map((grant) => grant.key))].sort();
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

async function creditGrants(userId: string) {
  return prisma.creditGrant.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { amount: true, remaining: true, source: true, sourceId: true, expiresAt: true },
  });
}

/** A live subscription as its own webhook leaves it: the row, its grants, no credits. */
async function subscribe(
  user: TestUser,
  productId: string,
  options: { previous?: Date; next?: Date } = {},
) {
  const subscriptionId = `sub_${randomUUID()}`;
  const previousBillingDate = options.previous ?? new Date(Date.now() - 10 * DAY_MS);
  const nextBillingDate = options.next ?? new Date(Date.now() + 20 * DAY_MS);
  await deliver(
    subscriptionEvent({
      userId: user.id,
      subscriptionId,
      productId,
      previousBillingDate,
      nextBillingDate,
    }),
  );
  return { subscriptionId, previousBillingDate, nextBillingDate };
}

function planChanged(
  user: TestUser,
  subscription: { subscriptionId: string; previousBillingDate: Date; nextBillingDate: Date },
  productId: string,
  type = "subscription.plan_changed",
) {
  return subscriptionEvent({
    userId: user.id,
    subscriptionId: subscription.subscriptionId,
    productId,
    type,
    previousBillingDate: subscription.previousBillingDate,
    nextBillingDate: subscription.nextBillingDate,
  });
}

describe("V-202 preview", () => {
  it("returns what is due now and what the plan costs next, without changing anything", async () => {
    const user = await createUserWithSession();
    const subscription = await subscribe(user, "prod_portfolio_pro_monthly");
    const nextBilling = subscription.nextBillingDate.toISOString();
    dodoMock.previewChangePlan.mockResolvedValue({
      immediate_charge: {
        effective_at: new Date().toISOString(),
        line_items: [],
        summary: {
          currency: "USD",
          customer_credits: 0,
          customer_credits_currency: "USD",
          settlement_amount: 333,
          settlement_currency: "USD",
          total_amount: 333,
        },
      },
      new_plan: { recurring_pre_tax_amount: 1499, next_billing_date: nextBilling },
    });

    const response = await asUser(user, PREVIEW_PATH).send({
      productKey: "bundle",
      interval: "monthly",
    });

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body.data).toEqual({
      productKey: "bundle",
      interval: "monthly",
      dueNow: 333,
      currency: "USD",
      nextAmount: 1499,
      nextBillingDate: nextBilling,
    });
    expect(dodoMock.previewChangePlan).toHaveBeenCalledWith(subscription.subscriptionId, {
      product_id: "prod_bundle_monthly",
      quantity: 1,
      proration_billing_mode: "prorated_immediately_keep_cycle",
    });
    const row = await prisma.subscription.findUniqueOrThrow({
      where: { providerSubId: subscription.subscriptionId },
    });
    expect(row.productKey).toBe("portfolio_pro");
    expect(await activeGrantKeys(user.id)).toEqual([...PORTFOLIO_KEYS].sort());
  });

  it("a provider failure is a 502 with a code", async () => {
    const user = await createUserWithSession();
    await subscribe(user, "prod_ai_credits_monthly");
    dodoMock.previewChangePlan.mockRejectedValue(new Error("provider down"));

    const response = await asUser(user, PREVIEW_PATH).send({
      productKey: "bundle",
      interval: "monthly",
    });

    expect(response.status).toBe(502);
    expect(response.body.details).toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
  });
});

describe("V-202 change", () => {
  it("asks Dodo for a prorated upgrade that waits for its payment, and leaves local state alone", async () => {
    const user = await createUserWithSession();
    const subscription = await subscribe(user, "prod_portfolio_pro_monthly");
    dodoMock.changePlan.mockResolvedValue({ payment_id: "pay_upgrade" });

    const response = await asUser(user, CHANGE_PATH, "upgrade-1").send({
      productKey: "bundle",
      interval: "monthly",
    });

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body.data).toEqual({
      status: "pending",
      productKey: "bundle",
      interval: "monthly",
      paymentId: "pay_upgrade",
      confirmed: true,
      replayed: false,
    });
    expect(dodoMock.changePlan).toHaveBeenCalledTimes(1);
    const [subscriptionId, params, options] = dodoMock.changePlan.mock.calls[0]!;
    expect(subscriptionId).toBe(subscription.subscriptionId);
    expect(params).toEqual({
      product_id: "prod_bundle_monthly",
      quantity: 1,
      proration_billing_mode: "prorated_immediately_keep_cycle",
      on_payment_failure: "prevent_change",
      metadata: {
        veriworkly_user_id: user.id,
        veriworkly_product: "bundle",
        veriworkly_interval: "monthly",
        veriworkly_plan_change: "1",
      },
    });
    expect(options).toMatchObject({ idempotencyKey: expect.stringContaining("upgrade-1") });

    // Nothing local moves until the provider's webhook says the plan changed.
    const row = await prisma.subscription.findUniqueOrThrow({
      where: { providerSubId: subscription.subscriptionId },
    });
    expect(row.productKey).toBe("portfolio_pro");
    expect(await activeGrantKeys(user.id)).toEqual([...PORTFOLIO_KEYS].sort());
    expect(await prisma.creditGrant.count({ where: { userId: user.id } })).toBe(0);
  });

  it("is idempotent: a retry with the same key replays, a second key is refused while pending", async () => {
    const user = await createUserWithSession();
    await subscribe(user, "prod_portfolio_pro_monthly");
    dodoMock.changePlan.mockResolvedValue({ payment_id: "pay_upgrade_retry" });
    const body = { productKey: "bundle", interval: "monthly" };

    const first = await asUser(user, CHANGE_PATH, "upgrade-retry").send(body);
    const retry = await asUser(user, CHANGE_PATH, "upgrade-retry").send(body);
    const bodyKey = await asUser(user, CHANGE_PATH).send({
      ...body,
      idempotencyKey: "upgrade-retry",
    });
    const another = await asUser(user, CHANGE_PATH, "upgrade-other").send(body);

    expect(first.status).toBe(200);
    expect(retry.status).toBe(200);
    expect(retry.body.data).toEqual({ ...first.body.data, replayed: true });
    expect(bodyKey.body.data).toEqual({ ...first.body.data, replayed: true });
    expect(another.status).toBe(409);
    expect(another.body.details).toMatchObject({ code: "PLAN_CHANGE_PENDING" });
    expect(dodoMock.changePlan).toHaveBeenCalledTimes(1);
  });

  it("refuses a key reused for a different change", async () => {
    const user = await createUserWithSession();
    await subscribe(user, "prod_ai_credits_monthly");
    dodoMock.changePlan.mockResolvedValue({ payment_id: "pay_reuse" });

    await asUser(user, CHANGE_PATH, "reuse").send({ productKey: "bundle", interval: "monthly" });
    const reused = await asUser(user, CHANGE_PATH, "reuse").send({
      productKey: "portfolio_pro",
      interval: "monthly",
    });

    expect(reused.status).toBe(409);
    expect(reused.body.details).toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED" });
    expect(dodoMock.changePlan).toHaveBeenCalledTimes(1);
  });

  it("requires an idempotency key", async () => {
    const user = await createUserWithSession();
    await subscribe(user, "prod_portfolio_pro_monthly");

    const response = await asUser(user, CHANGE_PATH).send({
      productKey: "bundle",
      interval: "monthly",
    });

    expect(response.status).toBe(400);
    expect(dodoMock.changePlan).not.toHaveBeenCalled();
  });

  it("refuses downgrades, sideways moves, interval changes and accounts with nothing to change", async () => {
    const bundleUser = await createUserWithSession();
    await subscribe(bundleUser, "prod_bundle_monthly");
    const proUser = await createUserWithSession();
    await subscribe(proUser, "prod_portfolio_pro_monthly");
    const aiUser = await createUserWithSession();
    await subscribe(aiUser, "prod_ai_credits_annual", {
      previous: new Date(Date.now() - 30 * DAY_MS),
      next: new Date(Date.now() + 335 * DAY_MS),
    });
    const freeUser = await createUserWithSession();

    const cases: Array<[TestUser, Record<string, string>, string]> = [
      [bundleUser, { productKey: "portfolio_pro", interval: "monthly" }, "PLAN_CHANGE_NOT_UPGRADE"],
      [bundleUser, { productKey: "bundle", interval: "monthly" }, "ALREADY_SUBSCRIBED"],
      [proUser, { productKey: "ai_credits", interval: "monthly" }, "PLAN_CHANGE_NOT_UPGRADE"],
      [proUser, { productKey: "bundle", interval: "annual" }, "PLAN_CHANGE_INTERVAL"],
      [aiUser, { productKey: "bundle", interval: "monthly" }, "PLAN_CHANGE_INTERVAL"],
      [freeUser, { productKey: "bundle", interval: "monthly" }, "NO_SUBSCRIPTION"],
    ];
    for (const [user, body, code] of cases) {
      const preview = await asUser(user, PREVIEW_PATH).send(body);
      const change = await asUser(user, CHANGE_PATH, `refused-${randomUUID()}`).send(body);
      expect(preview.status, `${code} preview`).toBe(409);
      expect(preview.body.details, `${code} preview`).toMatchObject({ code });
      expect(change.status, `${code} change`).toBe(409);
      expect(change.body.details, `${code} change`).toMatchObject({ code });
    }
    expect(dodoMock.previewChangePlan).not.toHaveBeenCalled();
    expect(dodoMock.changePlan).not.toHaveBeenCalled();
  });

  it("a provider failure changes nothing and lets the same key try again", async () => {
    const user = await createUserWithSession();
    const subscription = await subscribe(user, "prod_portfolio_pro_monthly");
    dodoMock.changePlan.mockRejectedValueOnce(new Error("provider down"));
    const body = { productKey: "bundle", interval: "monthly" };

    const failed = await asUser(user, CHANGE_PATH, "upgrade-fail").send(body);

    expect(failed.status).toBe(502);
    expect(failed.body.details).toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    const row = await prisma.subscription.findUniqueOrThrow({
      where: { providerSubId: subscription.subscriptionId },
    });
    expect(row.productKey).toBe("portfolio_pro");
    expect(await activeGrantKeys(user.id)).toEqual([...PORTFOLIO_KEYS].sort());

    dodoMock.changePlan.mockResolvedValueOnce({ payment_id: "pay_after_failure" });
    const retried = await asUser(user, CHANGE_PATH, "upgrade-fail").send(body);
    expect(retried.status, JSON.stringify(retried.body)).toBe(200);
    expect(retried.body.data).toMatchObject({ paymentId: "pay_after_failure", replayed: false });
    expect(dodoMock.changePlan).toHaveBeenCalledTimes(2);
  });

  it("a failed upgrade payment frees the subscription for another attempt", async () => {
    const user = await createUserWithSession();
    const subscription = await subscribe(user, "prod_portfolio_pro_monthly");
    dodoMock.changePlan.mockResolvedValue({ payment_id: "pay_declined" });
    const body = { productKey: "bundle", interval: "monthly" };

    expect((await asUser(user, CHANGE_PATH, "declined-1").send(body)).status).toBe(200);
    await deliver(
      paymentEvent({
        userId: user.id,
        type: "payment.failed",
        paymentId: "pay_declined",
        subscriptionId: subscription.subscriptionId,
        productId: "prod_bundle_monthly",
        amount: 333,
        metadata: {
          veriworkly_user_id: user.id,
          veriworkly_product: "bundle",
          veriworkly_interval: "monthly",
          veriworkly_plan_change: "1",
        },
      }),
    );

    const again = await asUser(user, CHANGE_PATH, "declined-2").send(body);
    expect(again.status, JSON.stringify(again.body)).toBe(200);
    expect(dodoMock.changePlan).toHaveBeenCalledTimes(2);
  });
});

describe("V-202 the plan-change webhooks", () => {
  it("Creator Pro to the bundle (monthly): moves the row, grants the bundle and this month's 1,000 once", async () => {
    const user = await createUserWithSession();
    const subscription = await subscribe(user, "prod_portfolio_pro_monthly");
    dodoMock.changePlan.mockResolvedValue({ payment_id: "pay_monthly_upgrade" });
    await asUser(user, CHANGE_PATH, "monthly-upgrade").send({
      productKey: "bundle",
      interval: "monthly",
    });

    const event = planChanged(user, subscription, "prod_bundle_monthly");
    const eventId = await deliver(event);

    const row = await prisma.subscription.findUniqueOrThrow({
      where: { providerSubId: subscription.subscriptionId },
    });
    expect(row).toMatchObject({ productKey: "bundle", interval: "MONTHLY", status: "ACTIVE" });
    expect(await activeGrantKeys(user.id)).toEqual(BUNDLE_KEYS);
    let grants = await creditGrants(user.id);
    expect(grants).toHaveLength(1);
    expect(grants[0]).toMatchObject({ amount: 1000, remaining: 1000 });
    // This month's credits end with this month: the reset rule is unchanged.
    expect(grants[0]!.expiresAt?.toISOString()).toBe(subscription.nextBillingDate.toISOString());
    expect((await CreditService.getWallet(user.id)).available).toBe(1000);

    // The pending marker is gone once the change has landed.
    expect(await getRedis().get(`billing:plan-change:${subscription.subscriptionId}`)).toBeNull();

    // Every other delivery about the same change: a redelivery, the `updated` that accompanies
    // it, and the proration payment (marked by the change request). None adds credits.
    await deliver(event, eventId);
    await deliver(planChanged(user, subscription, "prod_bundle_monthly"));
    await deliver(planChanged(user, subscription, "prod_bundle_monthly", "subscription.updated"));
    await deliver(
      paymentEvent({
        userId: user.id,
        paymentId: "pay_monthly_upgrade",
        subscriptionId: subscription.subscriptionId,
        productId: "prod_bundle_monthly",
        amount: 333,
        metadata: {
          veriworkly_user_id: user.id,
          veriworkly_product: "bundle",
          veriworkly_interval: "monthly",
          veriworkly_plan_change: "1",
        },
      }),
    );

    grants = await creditGrants(user.id);
    expect(grants).toHaveLength(1);
    expect((await CreditService.getWallet(user.id)).available).toBe(1000);
    await expectLedgerBalanced(user.id);

    // The next renewal replaces the month's credits with the bundle's next 1,000.
    const nextEnd = new Date(subscription.nextBillingDate.getTime() + 30 * DAY_MS);
    await deliver(
      paymentEvent({
        userId: user.id,
        subscriptionId: subscription.subscriptionId,
        productId: "prod_bundle_monthly",
        amount: 1499,
        servicePeriod: { startsAt: subscription.nextBillingDate, endsAt: nextEnd },
      }),
    );
    grants = await creditGrants(user.id);
    expect(grants).toHaveLength(2);
    expect(grants[0]!.expiresAt?.toISOString()).toBe(subscription.nextBillingDate.toISOString());
    expect(grants[1]).toMatchObject({ amount: 1000 });
    await expectLedgerBalanced(user.id);
  });

  it("the payment landing before the plan change grants nothing until the change lands", async () => {
    const user = await createUserWithSession();
    const subscription = await subscribe(user, "prod_portfolio_pro_monthly");

    await deliver(
      paymentEvent({
        userId: user.id,
        subscriptionId: subscription.subscriptionId,
        productId: "prod_bundle_monthly",
        amount: 333,
        metadata: {
          veriworkly_user_id: user.id,
          veriworkly_product: "bundle",
          veriworkly_interval: "monthly",
          veriworkly_plan_change: "1",
        },
      }),
    );
    expect(await prisma.creditGrant.count({ where: { userId: user.id } })).toBe(0);

    await deliver(planChanged(user, subscription, "prod_bundle_monthly"));
    expect((await CreditService.getWallet(user.id)).available).toBe(1000);
    expect(await creditGrants(user.id)).toHaveLength(1);
    await expectLedgerBalanced(user.id);
  });

  it("AI Credits to the bundle: keeps this month's credits as they are and adds Creator Pro", async () => {
    const user = await createUserWithSession();
    const subscription = await subscribe(user, "prod_ai_credits_monthly");
    await deliver(
      paymentEvent({
        userId: user.id,
        subscriptionId: subscription.subscriptionId,
        productId: "prod_ai_credits_monthly",
        amount: 599,
        servicePeriod: {
          startsAt: subscription.previousBillingDate,
          endsAt: subscription.nextBillingDate,
        },
      }),
    );
    await CreditService.consume(user.id, 300, { requestId: `spend-${randomUUID()}` });
    expect((await CreditService.getWallet(user.id)).available).toBe(700);

    await deliver(planChanged(user, subscription, "prod_bundle_monthly"));

    expect(await activeGrantKeys(user.id)).toEqual(BUNDLE_KEYS);
    // Both plans carry 1,000 a month: the month already granted stands, nothing is added.
    expect((await CreditService.getWallet(user.id)).available).toBe(700);
    expect(await creditGrants(user.id)).toHaveLength(1);
    await expectLedgerBalanced(user.id);
  });

  it("Creator Pro to the bundle (annual, mid-year): starts the monthly schedule at the current month", async () => {
    const user = await createUserWithSession();
    const previous = new Date(Date.now() - 100 * DAY_MS);
    const next = addMonthsUtc(previous, 12);
    const subscription = await subscribe(user, "prod_portfolio_pro_annual", { previous, next });

    const event = planChanged(user, subscription, "prod_bundle_annual");
    const eventId = await deliver(event);
    await deliver(event, eventId);
    await deliver(planChanged(user, subscription, "prod_bundle_annual", "subscription.updated"));

    expect(await activeGrantKeys(user.id)).toEqual(BUNDLE_KEYS);
    const schedules = await prisma.subscriptionCreditSchedule.findMany({
      where: { providerSubId: subscription.subscriptionId },
    });
    expect(schedules).toHaveLength(1);
    expect(schedules[0]!.periodStart.toISOString()).toBe(previous.toISOString());
    expect(schedules[0]!.periodEnd.toISOString()).toBe(next.toISOString());

    // One month's 1,000, the month running now, ending at its own month boundary.
    let month = 0;
    while (addMonthsUtc(previous, month + 1) <= new Date()) month += 1;
    let grants = await creditGrants(user.id);
    expect(grants).toHaveLength(1);
    expect(grants[0]).toMatchObject({ amount: 1000, sourceId: `${schedules[0]!.id}:${month}` });
    expect(grants[0]!.expiresAt?.toISOString()).toBe(
      addMonthsUtc(previous, month + 1).toISOString(),
    );

    // The hourly job grants nothing more this month, and the next month's 1,000 when it starts.
    await runAnnualCreditGrants(new Date());
    expect(await creditGrants(user.id)).toHaveLength(1);
    await runAnnualCreditGrants(new Date(addMonthsUtc(previous, month + 1).getTime() + 60_000));
    grants = await creditGrants(user.id);
    expect(grants).toHaveLength(2);
    expect(grants[1]).toMatchObject({ amount: 1000, sourceId: `${schedules[0]!.id}:${month + 1}` });
    await expectLedgerBalanced(user.id);
  });
});

describe("V-202 the overlap 409 offers the upgrade", () => {
  it("a Creator Pro subscriber asking for the bundle is pointed at the upgrade", async () => {
    const user = await createUserWithSession();
    await subscribe(user, "prod_portfolio_pro_monthly");

    const response = await asUser(user, "/api/v1/billing/checkout").send({
      productKey: "bundle",
      interval: "monthly",
    });

    expect(response.status).toBe(409);
    expect(response.body.details).toEqual({
      code: "UPGRADE_AVAILABLE",
      activeProductKey: "portfolio_pro",
      suggestedProductKey: "bundle",
      upgrade: { productKey: "bundle", interval: "monthly" },
    });
    expect(dodoMock.checkoutCreate).not.toHaveBeenCalled();
  });
});

const { APIConnectionTimeoutError, ConflictError } = await import("dodopayments");

describe("V-202 review: provider outcomes and double clicks", () => {
  it("a timeout is not a failure: the change is answered as unconfirmed and stays pending", async () => {
    const user = await createUserWithSession();
    const subscription = await subscribe(user, "prod_portfolio_pro_monthly");
    dodoMock.changePlan.mockRejectedValueOnce(new APIConnectionTimeoutError());
    const body = { productKey: "bundle", interval: "monthly" };

    const first = await asUser(user, CHANGE_PATH, "timeout-1").send(body);

    expect(first.status, JSON.stringify(first.body)).toBe(202);
    expect(first.body.data).toEqual({
      status: "pending",
      productKey: "bundle",
      interval: "monthly",
      paymentId: null,
      confirmed: false,
      replayed: false,
    });
    const row = await prisma.subscription.findUniqueOrThrow({
      where: { providerSubId: subscription.subscriptionId },
    });
    expect(row.productKey).toBe("portfolio_pro");

    // The provider may have applied it: neither a retry nor another key asks it again.
    const retry = await asUser(user, CHANGE_PATH, "timeout-1").send(body);
    expect(retry.status).toBe(202);
    expect(retry.body.data).toMatchObject({ confirmed: false, replayed: true });
    const other = await asUser(user, CHANGE_PATH, "timeout-2").send(body);
    expect(other.status).toBe(409);
    expect(other.body.details).toMatchObject({ code: "PLAN_CHANGE_PENDING" });
    expect(dodoMock.changePlan).toHaveBeenCalledTimes(1);
  });

  it("the provider's own pending-change 409 is PLAN_CHANGE_PENDING, not a 502", async () => {
    const user = await createUserWithSession();
    await subscribe(user, "prod_portfolio_pro_monthly");
    dodoMock.changePlan.mockRejectedValueOnce(
      new ConflictError(
        409,
        { message: "pending plan change" },
        "pending plan change",
        new Headers(),
      ),
    );

    const response = await asUser(user, CHANGE_PATH, "conflict-1").send({
      productKey: "bundle",
      interval: "monthly",
    });

    expect(response.status).toBe(409);
    expect(response.body.details).toMatchObject({ code: "PLAN_CHANGE_PENDING" });
  });

  /**
   * A provider call that signals when the first request reaches it and answers only when the test
   * says so (V-355).
   */
  function heldProviderCall(paymentId: string) {
    let reached!: () => void;
    let answer!: () => void;
    const reachedPromise = new Promise<void>((resolve) => (reached = resolve));
    const answered = new Promise<{ payment_id: string }>(
      (resolve) => (answer = () => resolve({ payment_id: paymentId })),
    );
    dodoMock.changePlan.mockImplementation(() => {
      reached();
      return answered;
    });
    return { reached: reachedPromise, answer: () => answer() };
  }

  it("a double click with one key waits for the first answer and replays it", async () => {
    const user = await createUserWithSession();
    await subscribe(user, "prod_portfolio_pro_monthly");
    const provider = heldProviderCall("pay_slow");
    const body = { productKey: "bundle", interval: "monthly" };

    // The second click is sent only once the first holds the claim and is inside the provider
    // call, so which request is the original never depends on scheduling (V-355).
    const firstResponse = asUser(user, CHANGE_PATH, "double-click")
      .send(body)
      .then((r) => r);
    await provider.reached;
    const secondResponse = asUser(user, CHANGE_PATH, "double-click")
      .send(body)
      .then((r) => r);
    setTimeout(provider.answer, 400);
    const [first, second] = await Promise.all([firstResponse, secondResponse]);

    expect(first.status, JSON.stringify(first.body)).toBe(200);
    expect(second.status, JSON.stringify(second.body)).toBe(200);
    expect(second.body.data).toEqual({ ...first.body.data, replayed: true });
    expect(dodoMock.changePlan).toHaveBeenCalledTimes(1);
  });

  it("the second click keeps waiting while a slow provider call is still within its timeout", async () => {
    const user = await createUserWithSession();
    await subscribe(user, "prod_portfolio_pro_monthly");
    const provider = heldProviderCall("pay_slower");
    const body = { productKey: "bundle", interval: "monthly" };

    const firstResponse = asUser(user, CHANGE_PATH, "slow-double-click")
      .send(body)
      .then((r) => r);
    await provider.reached;
    const secondResponse = asUser(user, CHANGE_PATH, "slow-double-click")
      .send(body)
      .then((r) => r);
    setTimeout(provider.answer, 5_000);
    const [first, second] = await Promise.all([firstResponse, secondResponse]);

    expect(first.status, JSON.stringify(first.body)).toBe(200);
    expect(second.status, JSON.stringify(second.body)).toBe(200);
    expect(second.body.data).toEqual({ ...first.body.data, replayed: true });
    expect(dodoMock.changePlan).toHaveBeenCalledTimes(1);
  });

  it("a failed-payment webhook that lands during the provider call is not undone by the request", async () => {
    const user = await createUserWithSession();
    const subscription = await subscribe(user, "prod_portfolio_pro_monthly");
    // The charge is declined and its webhook clears the lock before changePlan returns.
    dodoMock.changePlan.mockImplementation(async () => {
      await deliver(
        paymentEvent({
          userId: user.id,
          type: "payment.failed",
          paymentId: "pay_fast_decline",
          subscriptionId: subscription.subscriptionId,
          productId: "prod_bundle_monthly",
          amount: 333,
          chargeType: "plan_change",
        }),
      );
      return { payment_id: "pay_fast_decline" };
    });

    const first = await asUser(user, CHANGE_PATH, "fast-decline-1").send({
      productKey: "bundle",
      interval: "monthly",
    });
    expect(first.status, JSON.stringify(first.body)).toBe(200);
    expect(await getRedis().get(`billing:plan-change:${subscription.subscriptionId}`)).toBeNull();

    dodoMock.changePlan.mockResolvedValue({ payment_id: "pay_second_try" });
    const again = await asUser(user, CHANGE_PATH, "fast-decline-2").send({
      productKey: "bundle",
      interval: "monthly",
    });
    expect(again.status, JSON.stringify(again.body)).toBe(200);
  });
});

describe("V-202 review: untagged plan-change charges (portal changes)", () => {
  function untaggedChange(user: TestUser, subscriptionId: string, productId: string, amount = 412) {
    return paymentEvent({
      userId: user.id,
      subscriptionId,
      productId,
      amount,
      chargeType: "plan_change",
    });
  }

  it("AI Credits to the bundle, change first: the charge grants nothing and keeps the month", async () => {
    const user = await createUserWithSession();
    const subscription = await subscribe(user, "prod_ai_credits_monthly");
    await deliver(
      paymentEvent({
        userId: user.id,
        subscriptionId: subscription.subscriptionId,
        productId: "prod_ai_credits_monthly",
        amount: 599,
        servicePeriod: {
          startsAt: subscription.previousBillingDate,
          endsAt: subscription.nextBillingDate,
        },
      }),
    );
    await CreditService.consume(user.id, 300, { requestId: `spend-${randomUUID()}` });

    await deliver(planChanged(user, subscription, "prod_bundle_monthly"));
    await deliver(untaggedChange(user, subscription.subscriptionId, "prod_bundle_monthly"));

    expect((await CreditService.getWallet(user.id)).available).toBe(700);
    const grants = await creditGrants(user.id);
    expect(grants).toHaveLength(1);
    expect(grants[0]!.expiresAt?.toISOString()).toBe(subscription.nextBillingDate.toISOString());
    await expectLedgerBalanced(user.id);
  });

  it("Creator Pro to the bundle, charge first: the month's 1,000 arrives once, with the change", async () => {
    const user = await createUserWithSession();
    const subscription = await subscribe(user, "prod_portfolio_pro_monthly");

    await deliver(untaggedChange(user, subscription.subscriptionId, "prod_bundle_monthly"));
    expect(await prisma.creditGrant.count({ where: { userId: user.id } })).toBe(0);
    await deliver(planChanged(user, subscription, "prod_bundle_monthly"));

    const grants = await creditGrants(user.id);
    expect(grants).toHaveLength(1);
    expect(grants[0]).toMatchObject({ amount: 1000 });
    expect(grants[0]!.expiresAt?.toISOString()).toBe(subscription.nextBillingDate.toISOString());
    await expectLedgerBalanced(user.id);
  });

  it("a declined untagged plan-change charge sends no dunning mail", async () => {
    const user = await createUserWithSession();
    const subscription = await subscribe(user, "prod_portfolio_pro_monthly");

    await deliver({
      ...untaggedChange(user, subscription.subscriptionId, "prod_bundle_monthly"),
      type: "payment.failed",
    });

    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(billingMailMock.sendPaymentFailedEmail).not.toHaveBeenCalled();
  });
});

describe("V-202 review: portal downgrades keep the month already granted", () => {
  it("Bundle to Creator Pro (monthly): this month's credits stay to its end, next month grants none", async () => {
    const user = await createUserWithSession();
    const subscription = await subscribe(user, "prod_bundle_monthly");
    await deliver(
      paymentEvent({
        userId: user.id,
        subscriptionId: subscription.subscriptionId,
        productId: "prod_bundle_monthly",
        amount: 1499,
        servicePeriod: {
          startsAt: subscription.previousBillingDate,
          endsAt: subscription.nextBillingDate,
        },
      }),
    );
    await CreditService.consume(user.id, 200, { requestId: `spend-${randomUUID()}` });

    await deliver(planChanged(user, subscription, "prod_portfolio_pro_monthly"));
    await deliver(
      paymentEvent({
        userId: user.id,
        subscriptionId: subscription.subscriptionId,
        productId: "prod_portfolio_pro_monthly",
        amount: 0,
        chargeType: "plan_change",
      }),
    );

    expect(await activeGrantKeys(user.id)).toEqual([...PORTFOLIO_KEYS].sort());
    expect((await CreditService.getWallet(user.id)).available).toBe(800);
    let grants = await creditGrants(user.id);
    expect(grants).toHaveLength(1);
    expect(grants[0]!.expiresAt?.toISOString()).toBe(subscription.nextBillingDate.toISOString());

    // The next month bills Creator Pro: no allowance, and nothing cuts the old month early.
    await deliver(
      paymentEvent({
        userId: user.id,
        subscriptionId: subscription.subscriptionId,
        productId: "prod_portfolio_pro_monthly",
        amount: 999,
        chargeType: "renewal",
        servicePeriod: {
          startsAt: subscription.nextBillingDate,
          endsAt: new Date(subscription.nextBillingDate.getTime() + 30 * DAY_MS),
        },
      }),
    );
    grants = await creditGrants(user.id);
    expect(grants).toHaveLength(1);
    expect(grants[0]!.expiresAt?.toISOString()).toBe(subscription.nextBillingDate.toISOString());
    await expectLedgerBalanced(user.id);
  });

  it("Bundle to Creator Pro (annual): the current month stays, the schedule grants no further month", async () => {
    const user = await createUserWithSession();
    const previous = new Date(Date.now() - 40 * DAY_MS);
    const next = addMonthsUtc(previous, 12);
    const subscription = await subscribe(user, "prod_bundle_annual", { previous, next });
    // A plan-change event onto the bundle opens the schedule (the same path an upgrade takes).
    await deliver(planChanged(user, subscription, "prod_bundle_annual"));
    let month = 0;
    while (addMonthsUtc(previous, month + 1) <= new Date()) month += 1;
    const monthEnd = addMonthsUtc(previous, month + 1);
    expect(await creditGrants(user.id)).toHaveLength(1);

    await deliver(planChanged(user, subscription, "prod_portfolio_pro_annual"));
    await deliver(
      paymentEvent({
        userId: user.id,
        subscriptionId: subscription.subscriptionId,
        productId: "prod_portfolio_pro_annual",
        amount: 0,
        chargeType: "plan_change",
      }),
    );
    await runAnnualCreditGrants(new Date(monthEnd.getTime() + 60_000));

    const grants = await creditGrants(user.id);
    expect(grants).toHaveLength(1);
    expect(grants[0]!.expiresAt?.toISOString()).toBe(monthEnd.toISOString());
    const schedule = await prisma.subscriptionCreditSchedule.findFirstOrThrow({
      where: { providerSubId: subscription.subscriptionId },
    });
    expect(schedule.stoppedAt).not.toBeNull();
    await expectLedgerBalanced(user.id);
  });
});
