import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { app } from "#app";
import { logger } from "#lib/logger";
import { prisma } from "#lib/prisma";
import { settleBillingNotifications } from "#services/billingNotifications";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";
import { signDodoWebhook } from "./helpers/webhook.js";

const { billingMailMock } = vi.hoisted(() => ({
  billingMailMock: {
    sendPurchaseConfirmationEmail: vi.fn().mockResolvedValue(undefined),
    sendPaymentFailedEmail: vi.fn().mockResolvedValue(undefined),
    sendSubscriptionCancelledEmail: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("#services/mail/billingMail", () => billingMailMock);

const WEBHOOK_PATH = "/api/v1/billing/webhooks/dodo";
const DAY_MS = 24 * 60 * 60 * 1000;
const PORTFOLIO_KEYS = ["portfolio_publish", "seo_controls", "analytics", "watermark_removal"];

/**
 * Event timestamps sit a minute in the past so grants that start "at the event" are already
 * active when `/billing/me` is read in the same test. Successive events for one subscription get
 * strictly increasing timestamps through `step`.
 */
function eventTime(step = 0) {
  return new Date(Date.now() - 60_000 + step * 1000);
}

function subscriptionEvent(input: {
  type?: string;
  userId?: string;
  subscriptionId: string;
  productId: string;
  status: string;
  at: Date;
  nextBillingDate: Date | null;
  cancelAtNext?: boolean;
  metadata?: Record<string, string>;
}) {
  return {
    type: input.type ?? `subscription.${input.status}`,
    timestamp: input.at.toISOString(),
    data: {
      subscription_id: input.subscriptionId,
      customer: { customer_id: "cus_correctness" },
      product_id: input.productId,
      status: input.status,
      cancel_at_next_billing_date: input.cancelAtNext ?? false,
      next_billing_date: input.nextBillingDate ? input.nextBillingDate.toISOString() : null,
      metadata: input.metadata ?? (input.userId ? { veriworkly_user_id: input.userId } : {}),
    },
  };
}

function paymentEvent(input: {
  paymentId?: string;
  userId?: string;
  subscriptionId?: string | null;
  productId?: string;
  totalAmount?: number;
  settlementAmount: number;
  settlementTax?: number | null;
  tax?: number | null;
  currency?: string;
  settlementCurrency?: string;
  isUpdatePaymentMethod?: boolean;
  metadata?: Record<string, string>;
  at?: Date;
}) {
  const at = input.at ?? eventTime();
  return {
    type: "payment.succeeded",
    timestamp: at.toISOString(),
    data: {
      payment_id: input.paymentId ?? `pay_${randomUUID()}`,
      subscription_id: input.subscriptionId ?? null,
      product_cart: input.productId ? [{ product_id: input.productId, quantity: 1 }] : null,
      total_amount: input.totalAmount ?? input.settlementAmount,
      settlement_amount: input.settlementAmount,
      settlement_tax: input.settlementTax ?? null,
      tax: input.tax ?? null,
      currency: input.currency ?? "USD",
      settlement_currency: input.settlementCurrency ?? "USD",
      is_update_payment_method: input.isUpdatePaymentMethod ?? false,
      created_at: at.toISOString(),
      metadata: input.metadata ?? (input.userId ? { veriworkly_user_id: input.userId } : {}),
    },
  };
}

/**
 * Signs and delivers one webhook. The status is checked here (V-399): a "nothing happens" money or
 * access assertion after a delivery that failed proves nothing. A test that expects a refusal
 * passes the status it expects.
 */
async function deliver(event: unknown, id?: string, expectedStatus = 200) {
  const body = JSON.stringify(event);
  const headers = signDodoWebhook(body, id ? { id } : {});
  const req = request(app).post(WEBHOOK_PATH);
  for (const [key, value] of Object.entries(headers)) req.set(key, value);
  const response = await req.send(body);
  expect(response.status, JSON.stringify(response.body)).toBe(expectedStatus);
  return { response, eventId: headers["webhook-id"] };
}

async function eventStatus(eventId: string) {
  const row = await prisma.billingWebhookEvent.findUnique({ where: { providerEventId: eventId } });
  return row?.status ?? null;
}

async function billingMe(user: TestUser) {
  const response = await request(app)
    .get("/api/v1/billing/me")
    .set("Origin", STUDIO_ORIGIN)
    .set("Cookie", user.cookie);
  expect(response.status).toBe(200);
  return response.body.data;
}

/**
 * Defaults to a premium template: since V-042 only Nimbus/Cipher publications follow the
 * subscription into GRACE/SUSPENDED. Tests about free templates pass "signal" explicitly.
 */
async function createPublication(userId: string, templateId: "signal" | "nimbus" = "nimbus") {
  const suffix = randomUUID().slice(0, 8);
  const document = await prisma.document.create({
    data: {
      userId,
      type: "PORTFOLIO",
      title: "Portfolio",
      slug: `portfolio-${suffix}`,
      content: {},
    },
  });
  return prisma.portfolioPublication.create({
    data: {
      userId,
      documentId: document.id,
      subdomain: `pub-${suffix}`,
      templateId,
      snapshot: {},
      status: "LIVE",
    },
  });
}

async function activePublishGrants(userId: string, at = new Date()) {
  return prisma.entitlementGrant.findMany({
    where: {
      userId,
      key: "portfolio_publish",
      startsAt: { lte: at },
      revokedAt: null,
      OR: [{ endsAt: null }, { endsAt: { gt: at } }],
    },
  });
}

async function createReferredUser(tier: "TIER_1" | "TIER_2" | "TIER_3" = "TIER_1") {
  const affiliate = await createUserWithSession();
  await prisma.user.update({
    where: { id: affiliate.id },
    data: {
      affiliateStatus: "ACTIVE",
      affiliateTier: tier,
      affiliateCode: `code-${randomUUID().slice(0, 8)}`,
    },
  });
  const referred = await createUserWithSession();
  await prisma.affiliateReferral.create({
    data: { affiliateId: affiliate.id, referredUserId: referred.id, code: "code" },
  });
  return { affiliate, referred };
}

function expectWithin(
  actual: Date | string | null | undefined,
  expected: Date,
  toleranceMs: number,
) {
  expect(actual).toBeTruthy();
  const value = new Date(actual as string).getTime();
  expect(Math.abs(value - expected.getTime())).toBeLessThanOrEqual(toleranceMs);
}

describe("V-001 renewal credit grant expiry", () => {
  it("expires the renewal allowance about one interval after the payment, not at the stale period end", async () => {
    const user = await createUserWithSession();
    const stalePeriodEnd = new Date(Date.now() - DAY_MS);
    await prisma.subscription.create({
      data: {
        userId: user.id,
        provider: "dodo",
        providerSubId: "sub_stale_period",
        providerCustomerId: "cus_correctness",
        productKey: "ai_credits",
        interval: "MONTHLY",
        status: "ACTIVE",
        rawStatus: "active",
        currentPeriodEnd: stalePeriodEnd,
        lastWebhookAt: new Date(Date.now() - 31 * DAY_MS),
      },
    });

    const { response, eventId } = await deliver(
      paymentEvent({
        userId: user.id,
        subscriptionId: "sub_stale_period",
        settlementAmount: 599,
      }),
    );
    expect(response.status).toBe(200);
    expect(await eventStatus(eventId)).toBe("PROCESSED");

    const grant = await prisma.creditGrant.findFirst({
      where: { userId: user.id, source: "subscription_payment" },
    });
    expect(grant?.amount).toBe(1_000);
    expect(grant?.expiresAt).toBeTruthy();
    const daysAhead = (grant!.expiresAt!.getTime() - Date.now()) / DAY_MS;
    expect(daysAhead).toBeGreaterThan(27);
    expect(daysAhead).toBeLessThan(32);

    // The wallet must still hold the credits after the expiry sweep `getWallet` runs.
    const me = await billingMe(user);
    expect(me.credits.balance).toBe(1_000);
  });
});

describe("V-002 one-time bundle passes", () => {
  it("grants credits and the bundle entitlements for 7 days, shows a paying pass in /billing/me, and is idempotent", async () => {
    const user = await createUserWithSession();
    await createPublication(user.id);
    const paymentId = `pay_pass_${randomUUID().slice(0, 8)}`;
    const at = eventTime();
    const event = paymentEvent({
      paymentId,
      userId: user.id,
      productId: "prod_bundle_seven_day",
      settlementAmount: 599,
      at,
      metadata: {
        veriworkly_user_id: user.id,
        veriworkly_product: "bundle",
        veriworkly_interval: "seven_day",
      },
    });

    const first = await deliver(event);
    expect(first.response.status).toBe(200);
    expect(await eventStatus(first.eventId)).toBe("PROCESSED");

    const credit = await prisma.creditGrant.findFirst({
      where: { userId: user.id, source: "subscription_payment" },
    });
    expect(credit?.amount).toBe(400);
    expectWithin(credit?.expiresAt, new Date(at.getTime() + 7 * DAY_MS), 5 * 60_000);

    const grants = await prisma.entitlementGrant.findMany({
      where: { userId: user.id, source: "SYSTEM", sourceId: paymentId, revokedAt: null },
    });
    expect(grants.map((g) => g.key).sort()).toEqual(["ai_credits", ...PORTFOLIO_KEYS].sort());
    for (const grant of grants) {
      expectWithin(grant.startsAt, at, 5 * 60_000);
      expectWithin(grant.endsAt, new Date(at.getTime() + 7 * DAY_MS), 5 * 60_000);
    }

    const publication = await prisma.portfolioPublication.findUnique({
      where: { userId: user.id },
    });
    expect(publication?.status).toBe("LIVE");

    const me = await billingMe(user);
    expect(me.plan).toBe("BUNDLE");
    expect(me.canPublish).toBe(true);
    expect(me.access).toMatchObject({ tier: "pass", isPaying: true, creditBalance: 400 });
    expectWithin(me.access.passEndsAt, new Date(at.getTime() + 7 * DAY_MS), 5 * 60_000);
    expectWithin(me.access.portfolioAccessEndsAt, new Date(at.getTime() + 7 * DAY_MS), 5 * 60_000);
    expectWithin(me.access.aiCreditsEndsAt, new Date(at.getTime() + 7 * DAY_MS), 5 * 60_000);

    // Same webhook-id: duplicate. New webhook-id for the same payment: no second grant.
    const redelivered = await deliver(event, first.eventId);
    expect(redelivered.response.body.data).toEqual({ duplicate: true });
    const reemitted = await deliver(event);
    expect(reemitted.response.status).toBe(200);
    expect(await prisma.creditGrant.count({ where: { userId: user.id } })).toBe(1);
    expect(
      await prisma.entitlementGrant.count({ where: { userId: user.id, sourceId: paymentId } }),
    ).toBe(["ai_credits", ...PORTFOLIO_KEYS].length);
  });

  it("grants the 3-day pass from product_id alone when the metadata carries no product", async () => {
    const user = await createUserWithSession();
    const at = eventTime();
    const { eventId } = await deliver(
      paymentEvent({
        userId: user.id,
        productId: "prod_bundle_one_day",
        settlementAmount: 299,
        at,
      }),
    );
    expect(await eventStatus(eventId)).toBe("PROCESSED");

    const credit = await prisma.creditGrant.findFirst({ where: { userId: user.id } });
    expect(credit?.amount).toBe(150);
    const grants = await activePublishGrants(user.id);
    expect(grants).toHaveLength(1);
    expectWithin(grants[0].endsAt, new Date(at.getTime() + 3 * DAY_MS), 5 * 60_000);
  });

  it("keeps credit packs credits-only and still reports the buyer as paying", async () => {
    const user = await createUserWithSession();
    const { eventId } = await deliver(
      paymentEvent({
        userId: user.id,
        productId: "prod_pack_250",
        settlementAmount: 499,
        metadata: { veriworkly_user_id: user.id, veriworkly_product: "credit_pack_250" },
      }),
    );
    expect(await eventStatus(eventId)).toBe("PROCESSED");

    expect(await prisma.entitlementGrant.count({ where: { userId: user.id } })).toBe(0);
    const credit = await prisma.creditGrant.findFirst({ where: { userId: user.id } });
    expect(credit?.amount).toBe(250);
    expect(credit?.source).toBe("credit_pack");

    const me = await billingMe(user);
    expect(me.plan).toBe("FREE");
    expect(me.access).toMatchObject({
      tier: "credits",
      isPaying: true,
      passEndsAt: null,
      portfolioAccessEndsAt: null,
      aiCreditsEndsAt: null,
      creditBalance: 250,
    });
  });

  it("reports a never-paid user as free", async () => {
    const user = await createUserWithSession();
    const me = await billingMe(user);
    expect(me.access).toEqual({
      tier: "free",
      isPaid: false,
      isPaying: false,
      paymentIssue: false,
      passEndsAt: null,
      portfolioAccessEndsAt: null,
      aiCreditsEndsAt: null,
      creditBalance: 0,
    });
  });
});

describe("V-004 product_id wins over stale checkout metadata", () => {
  it("follows product_id on a plan change whose metadata still names the old plan", async () => {
    const user = await createUserWithSession();
    const staleMetadata = {
      veriworkly_user_id: user.id,
      veriworkly_product: "ai_credits",
      veriworkly_interval: "monthly",
    };
    const first = await deliver(
      subscriptionEvent({
        subscriptionId: "sub_plan_change",
        productId: "prod_ai_credits_monthly",
        status: "active",
        at: eventTime(0),
        nextBillingDate: new Date(Date.now() + 30 * DAY_MS),
        metadata: staleMetadata,
      }),
    );
    expect(first.response.status).toBe(200);

    const changed = await deliver(
      subscriptionEvent({
        type: "subscription.plan_changed",
        subscriptionId: "sub_plan_change",
        productId: "prod_bundle_annual",
        status: "active",
        at: eventTime(1),
        nextBillingDate: new Date(Date.now() + 365 * DAY_MS),
        metadata: staleMetadata,
      }),
    );
    expect(changed.response.status).toBe(200);

    const row = await prisma.subscription.findUnique({
      where: { providerSubId: "sub_plan_change" },
    });
    expect(row?.productKey).toBe("bundle");
    expect(row?.interval).toBe("ANNUAL");
    expect((await activePublishGrants(user.id)).length).toBe(1);

    const me = await billingMe(user);
    expect(me.plan).toBe("BUNDLE");
    expect(me.access.tier).toBe("bundle");
  });

  it("falls back to metadata only when the product id is unknown, and rejects an invalid metadata interval", async () => {
    const user = await createUserWithSession();
    const ok = await deliver(
      subscriptionEvent({
        subscriptionId: "sub_meta_fallback",
        productId: "prod_not_in_catalog",
        status: "active",
        at: eventTime(0),
        nextBillingDate: new Date(Date.now() + 30 * DAY_MS),
        metadata: {
          veriworkly_user_id: user.id,
          veriworkly_product: "portfolio_pro",
          veriworkly_interval: "monthly",
        },
      }),
    );
    expect(ok.response.status).toBe(200);
    expect(
      (await prisma.subscription.findUnique({ where: { providerSubId: "sub_meta_fallback" } }))
        ?.productKey,
    ).toBe("portfolio_pro");

    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    const bad = await deliver(
      subscriptionEvent({
        subscriptionId: "sub_meta_bad_interval",
        productId: "prod_not_in_catalog",
        status: "active",
        at: eventTime(0),
        nextBillingDate: new Date(Date.now() + 30 * DAY_MS),
        metadata: {
          veriworkly_user_id: user.id,
          veriworkly_product: "portfolio_pro",
          veriworkly_interval: "fortnightly",
        },
      }),
      undefined,
      400,
    );
    expect(bad.response.status).toBeGreaterThanOrEqual(400);
    expect(await eventStatus(bad.eventId)).toBe("FAILED");
    expect(errorSpy).toHaveBeenCalled();
    expect(
      await prisma.subscription.count({ where: { providerSubId: "sub_meta_bad_interval" } }),
    ).toBe(0);
  });
});

describe("V-005 / V-006 status table", () => {
  const future = () => new Date(Date.now() + 30 * DAY_MS);
  const past = () => new Date(Date.now() - 60_000);

  const table: Array<{
    status: string;
    nextBillingDate: () => Date;
    stored: "ACTIVE" | "PAST_DUE" | "INACTIVE" | "CANCELED";
    grace: boolean;
    entitled: boolean;
    /** `FREE_TIER`: LIVE on the free template (Nimbus → Atelier), moved by the webhook itself (decision 6). */
    publication: "LIVE" | "GRACE" | "FREE_TIER";
  }> = [
    {
      status: "active",
      nextBillingDate: future,
      stored: "ACTIVE",
      grace: false,
      entitled: true,
      publication: "LIVE",
    },
    {
      status: "on_hold",
      nextBillingDate: future,
      stored: "PAST_DUE",
      grace: true,
      entitled: false,
      publication: "GRACE",
    },
    {
      status: "past_due",
      nextBillingDate: future,
      stored: "PAST_DUE",
      grace: true,
      entitled: false,
      publication: "GRACE",
    },
    {
      status: "paused",
      nextBillingDate: future,
      stored: "PAST_DUE",
      grace: true,
      entitled: false,
      publication: "GRACE",
    },
    {
      status: "pending",
      nextBillingDate: future,
      stored: "INACTIVE",
      grace: false,
      entitled: true,
      publication: "LIVE",
    },
    {
      status: "failed",
      nextBillingDate: future,
      stored: "INACTIVE",
      grace: false,
      entitled: false,
      publication: "FREE_TIER",
    },
    {
      status: "cancelled",
      nextBillingDate: future,
      stored: "CANCELED",
      grace: false,
      entitled: true,
      publication: "LIVE",
    },
    {
      status: "expired",
      nextBillingDate: past,
      stored: "CANCELED",
      grace: false,
      entitled: false,
      publication: "FREE_TIER",
    },
  ];

  it.each(table)(
    "$status after an active period → $stored, grace=$grace, entitled=$entitled, publication $publication",
    async (row) => {
      const user = await createUserWithSession();
      await createPublication(user.id);
      const subscriptionId = `sub_status_${row.status}`;
      const periodEnd = future();

      const activated = await deliver(
        subscriptionEvent({
          userId: user.id,
          subscriptionId,
          productId: "prod_portfolio_pro_monthly",
          status: "active",
          at: eventTime(0),
          nextBillingDate: periodEnd,
        }),
      );
      expect(activated.response.status).toBe(200);

      const at = eventTime(1);
      const transition = await deliver(
        subscriptionEvent({
          userId: user.id,
          subscriptionId,
          productId: "prod_portfolio_pro_monthly",
          status: row.status,
          at,
          nextBillingDate: row.nextBillingDate(),
        }),
      );
      expect(transition.response.status).toBe(200);
      expect(await eventStatus(transition.eventId)).toBe("PROCESSED");

      const stored = await prisma.subscription.findUnique({
        where: { providerSubId: subscriptionId },
      });
      expect(stored?.status).toBe(row.stored);
      expect(stored?.rawStatus).toBe(row.status);
      if (row.grace)
        expectWithin(stored?.graceEndsAt, new Date(at.getTime() + 7 * DAY_MS), 5 * 60_000);
      else expect(stored?.graceEndsAt).toBeNull();

      const grants = await activePublishGrants(user.id);
      expect(grants.length > 0).toBe(row.entitled);
      if (row.entitled) expectWithin(grants[0].endsAt, periodEnd, 5 * 60_000);

      const publication = await prisma.portfolioPublication.findUnique({
        where: { userId: user.id },
      });
      if (row.publication === "FREE_TIER") {
        expect(publication?.status).toBe("LIVE");
        expect(publication?.templateId).toBe("atelier");
      } else {
        expect(publication?.status).toBe(row.publication);
        expect(publication?.templateId).toBe("nimbus");
      }

      const me = await billingMe(user);
      expect(me.canPublish).toBe(row.entitled);
      // The summary reports INACTIVE once the period has passed (existing contract), whatever the row says.
      expect(me.status).toBe(row.nextBillingDate === past ? "INACTIVE" : row.stored);
    },
  );

  it("fails the event and keeps the previous status on an unknown provider status", async () => {
    const user = await createUserWithSession();
    await deliver(
      subscriptionEvent({
        userId: user.id,
        subscriptionId: "sub_unknown_status",
        productId: "prod_portfolio_pro_monthly",
        status: "active",
        at: eventTime(0),
        nextBillingDate: future(),
      }),
    );
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    const { response, eventId } = await deliver(
      subscriptionEvent({
        userId: user.id,
        subscriptionId: "sub_unknown_status",
        productId: "prod_portfolio_pro_monthly",
        status: "hibernating",
        at: eventTime(1),
        nextBillingDate: future(),
      }),
      undefined,
      400,
    );
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(await eventStatus(eventId)).toBe("FAILED");
    expect(errorSpy).toHaveBeenCalled();
    const stored = await prisma.subscription.findUnique({
      where: { providerSubId: "sub_unknown_status" },
    });
    expect(stored?.status).toBe("ACTIVE");
    expect(stored?.rawStatus).toBe("active");
    expect((await activePublishGrants(user.id)).length).toBe(1);
  });
});

describe("V-149 cancellation email", () => {
  it("sends the cancelled email once on a real transition with a future period end, never on expired", async () => {
    const user = await createUserWithSession();
    const periodEnd = new Date(Date.now() + 20 * DAY_MS);
    const base = {
      userId: user.id,
      subscriptionId: "sub_cancel_mail",
      productId: "prod_portfolio_pro_monthly",
      nextBillingDate: periodEnd,
    };
    await deliver(subscriptionEvent({ ...base, status: "active", at: eventTime(0) }));
    await vi.waitFor(() =>
      expect(billingMailMock.sendPurchaseConfirmationEmail).toHaveBeenCalledTimes(1),
    );

    await deliver(subscriptionEvent({ ...base, status: "cancelled", at: eventTime(1) }));
    await vi.waitFor(() =>
      expect(billingMailMock.sendSubscriptionCancelledEmail).toHaveBeenCalledTimes(1),
    );
    expect((await activePublishGrants(user.id)).length).toBe(1);
    const me = await billingMe(user);
    expect(me.status).toBe("CANCELED");
    expect(me.canPublish).toBe(true);
    expectWithin(me.accessEndsAt ?? me.access.portfolioAccessEndsAt, periodEnd, 5 * 60_000);

    // A second cancelled-state event (portal "updated" with status cancelled) is not a transition.
    await deliver(
      subscriptionEvent({
        ...base,
        type: "subscription.updated",
        status: "cancelled",
        at: eventTime(2),
      }),
    );
    // V-359: wait for every billing send started so far, not a fixed time a late send can miss.
    await settleBillingNotifications();
    expect(billingMailMock.sendSubscriptionCancelledEmail).toHaveBeenCalledTimes(1);
  });

  it("does not send the cancelled email when a subscription or pass simply expires", async () => {
    const user = await createUserWithSession();
    const base = {
      userId: user.id,
      subscriptionId: "sub_expire_mail",
      productId: "prod_portfolio_pro_monthly",
    };
    await deliver(
      subscriptionEvent({
        ...base,
        status: "active",
        at: eventTime(0),
        nextBillingDate: new Date(Date.now() + 30 * DAY_MS),
      }),
    );
    await deliver(
      subscriptionEvent({
        ...base,
        status: "expired",
        at: eventTime(1),
        nextBillingDate: new Date(Date.now() - 60_000),
      }),
    );
    // V-359: wait for every billing send started so far, not a fixed time a late send can miss.
    await settleBillingNotifications();
    expect(billingMailMock.sendSubscriptionCancelledEmail).not.toHaveBeenCalled();
    expect((await activePublishGrants(user.id)).length).toBe(0);
  });
});

describe("V-141 zero-amount and card-update payments", () => {
  async function subscribedUser(subscriptionId: string) {
    const user = await createUserWithSession();
    await deliver(
      subscriptionEvent({
        userId: user.id,
        subscriptionId,
        productId: "prod_ai_credits_monthly",
        status: "active",
        at: eventTime(0),
        nextBillingDate: new Date(Date.now() + 30 * DAY_MS),
      }),
    );
    return user;
  }

  it("grants nothing for is_update_payment_method", async () => {
    const user = await subscribedUser("sub_card_update");
    const { eventId } = await deliver(
      paymentEvent({
        userId: user.id,
        subscriptionId: "sub_card_update",
        settlementAmount: 0,
        totalAmount: 0,
        isUpdatePaymentMethod: true,
      }),
    );
    expect(await eventStatus(eventId)).toBe("PROCESSED");
    expect(await prisma.creditGrant.count({ where: { userId: user.id } })).toBe(0);
  });

  it("grants nothing for a zero total_amount even when the flag is false", async () => {
    const user = await subscribedUser("sub_zero_amount");
    const { eventId } = await deliver(
      paymentEvent({
        userId: user.id,
        subscriptionId: "sub_zero_amount",
        settlementAmount: 0,
        totalAmount: 0,
      }),
    );
    expect(await eventStatus(eventId)).toBe("PROCESSED");
    expect(await prisma.creditGrant.count({ where: { userId: user.id } })).toBe(0);
  });

  it("still grants a normal renewal", async () => {
    const user = await subscribedUser("sub_normal_renewal");
    const { eventId } = await deliver(
      paymentEvent({
        userId: user.id,
        subscriptionId: "sub_normal_renewal",
        settlementAmount: 599,
      }),
    );
    expect(await eventStatus(eventId)).toBe("PROCESSED");
    const grant = await prisma.creditGrant.findFirst({ where: { userId: user.id } });
    expect(grant?.amount).toBe(1_000);
  });
});

describe("V-143 / V-017 affiliate commission", () => {
  it("processes a referred sub-cent payment without creating a commission", async () => {
    const { referred } = await createReferredUser("TIER_1");
    const { eventId } = await deliver(
      paymentEvent({
        userId: referred.id,
        productId: "prod_pack_250",
        settlementAmount: 40,
        metadata: { veriworkly_user_id: referred.id, veriworkly_product: "credit_pack_250" },
      }),
    );
    expect(await eventStatus(eventId)).toBe("PROCESSED");
    expect(await prisma.affiliateCommission.count()).toBe(0);
    expect(await prisma.creditGrant.count({ where: { userId: referred.id } })).toBe(1);
  });

  it("computes the commission net of settlement tax", async () => {
    const { affiliate, referred } = await createReferredUser("TIER_1");
    const paymentId = `pay_tax_${randomUUID().slice(0, 8)}`;
    const { eventId } = await deliver(
      paymentEvent({
        paymentId,
        userId: referred.id,
        productId: "prod_pack_500",
        settlementAmount: 1_099,
        settlementTax: 100,
        metadata: { veriworkly_user_id: referred.id, veriworkly_product: "credit_pack_500" },
      }),
    );
    expect(await eventStatus(eventId)).toBe("PROCESSED");
    const commission = await prisma.affiliateCommission.findUnique({
      where: { providerPaymentId: paymentId },
    });
    expect(commission?.affiliateId).toBe(affiliate.id);
    // 2 % of (1099 - 100) = 19.98 → 19 cents; on the gross amount it would have been 21.
    expect(commission?.amountCents).toBe(19);
  });
});

describe("V-145 non-USD settlement", () => {
  it("grants on an INR settlement and warns", async () => {
    const user = await createUserWithSession();
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
    const { eventId } = await deliver(
      paymentEvent({
        userId: user.id,
        productId: "prod_bundle_seven_day",
        settlementAmount: 49_900,
        currency: "INR",
        settlementCurrency: "INR",
        metadata: {
          veriworkly_user_id: user.id,
          veriworkly_product: "bundle",
          veriworkly_interval: "seven_day",
        },
      }),
    );
    expect(await eventStatus(eventId)).toBe("PROCESSED");
    expect((await prisma.creditGrant.findFirst({ where: { userId: user.id } }))?.amount).toBe(400);
    expect((await activePublishGrants(user.id)).length).toBe(1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("INR"), expect.anything());
  });
});

describe("V-012 events that cannot be attributed", () => {
  it("fails a payment with no user metadata and no known subscription", async () => {
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    const { response, eventId } = await deliver(
      paymentEvent({ productId: "prod_pack_250", settlementAmount: 499, metadata: {} }),
      undefined,
      400,
    );
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(await eventStatus(eventId)).toBe("FAILED");
    expect(errorSpy).toHaveBeenCalled();
  });

  it("fails a payment for an unknown product instead of recording it as processed", async () => {
    const user = await createUserWithSession();
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    const { response, eventId } = await deliver(
      paymentEvent({ userId: user.id, productId: "prod_mystery", settlementAmount: 499 }),
      undefined,
      400,
    );
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(await eventStatus(eventId)).toBe("FAILED");
    expect(errorSpy).toHaveBeenCalled();
    expect(await prisma.creditGrant.count({ where: { userId: user.id } })).toBe(0);
  });
});

describe("V-013 ordering", () => {
  it("applies two distinct events that share a timestamp", async () => {
    const user = await createUserWithSession();
    const at = eventTime(0);
    const base = {
      userId: user.id,
      subscriptionId: "sub_same_ts",
      productId: "prod_portfolio_pro_monthly",
      nextBillingDate: new Date(Date.now() + 30 * DAY_MS),
      at,
    };
    await deliver(subscriptionEvent({ ...base, status: "active" }));
    const second = await deliver(
      subscriptionEvent({
        ...base,
        type: "subscription.updated",
        status: "active",
        cancelAtNext: true,
      }),
    );
    expect(second.response.status).toBe(200);
    const row = await prisma.subscription.findUnique({ where: { providerSubId: "sub_same_ts" } });
    expect(row?.cancelAtPeriodEnd).toBe(true);
  });

  it("still ignores an older event for the row", async () => {
    const user = await createUserWithSession();
    const base = {
      userId: user.id,
      subscriptionId: "sub_older",
      productId: "prod_portfolio_pro_monthly",
      nextBillingDate: new Date(Date.now() + 30 * DAY_MS),
    };
    await deliver(subscriptionEvent({ ...base, status: "active", at: eventTime(5) }));
    const stale = await deliver(subscriptionEvent({ ...base, status: "failed", at: eventTime(1) }));
    expect(stale.response.status).toBe(200);
    expect(await eventStatus(stale.eventId)).toBe("PROCESSED");
    const row = await prisma.subscription.findUnique({ where: { providerSubId: "sub_older" } });
    expect(row?.status).toBe("ACTIVE");
  });
});

describe("V-120 concurrent events for one user", () => {
  it("ends LIVE when an old subscription is cancelled while a new one activates", async () => {
    for (let round = 0; round < 3; round++) {
      const user = await createUserWithSession();
      await createPublication(user.id);
      const oldSub = `sub_old_${round}`;
      const newSub = `sub_new_${round}`;
      await deliver(
        subscriptionEvent({
          userId: user.id,
          subscriptionId: oldSub,
          productId: "prod_portfolio_pro_monthly",
          status: "active",
          at: eventTime(0),
          nextBillingDate: new Date(Date.now() + 30 * DAY_MS),
        }),
      );

      const [cancelled, activated] = await Promise.all([
        deliver(
          subscriptionEvent({
            userId: user.id,
            subscriptionId: oldSub,
            productId: "prod_portfolio_pro_monthly",
            status: "cancelled",
            at: eventTime(1),
            nextBillingDate: new Date(Date.now() - 60_000),
          }),
        ),
        deliver(
          subscriptionEvent({
            userId: user.id,
            subscriptionId: newSub,
            productId: "prod_portfolio_pro_annual",
            status: "active",
            at: eventTime(1),
            nextBillingDate: new Date(Date.now() + 365 * DAY_MS),
          }),
        ),
      ]);
      expect(cancelled.response.status).toBe(200);
      expect(activated.response.status).toBe(200);

      const publication = await prisma.portfolioPublication.findUnique({
        where: { userId: user.id },
      });
      expect(publication?.status).toBe("LIVE");
      const grants = await activePublishGrants(user.id);
      expect(grants.map((g) => g.sourceId)).toEqual([newSub]);
    }
  });
});

describe("free-template publications are not governed by non-portfolio or unpaid events", () => {
  const future = () => new Date(Date.now() + 30 * DAY_MS);

  it("keeps a free-template portfolio LIVE through an ai_credits activation", async () => {
    const user = await createUserWithSession();
    await createPublication(user.id, "signal");
    const { response } = await deliver(
      subscriptionEvent({
        userId: user.id,
        subscriptionId: "sub_free_ai",
        productId: "prod_ai_credits_monthly",
        status: "active",
        at: eventTime(0),
        nextBillingDate: future(),
      }),
    );
    expect(response.status).toBe(200);
    const publication = await prisma.portfolioPublication.findUnique({
      where: { userId: user.id },
    });
    expect(publication?.status).toBe("LIVE");
    expect(publication?.suspensionReason).toBeNull();
  });

  it("keeps a free-template portfolio LIVE through a pending portfolio_pro checkout", async () => {
    const user = await createUserWithSession();
    await createPublication(user.id, "signal");
    const { response } = await deliver(
      subscriptionEvent({
        userId: user.id,
        subscriptionId: "sub_free_pending",
        productId: "prod_portfolio_pro_monthly",
        status: "pending",
        at: eventTime(0),
        nextBillingDate: future(),
      }),
    );
    expect(response.status).toBe(200);
    const publication = await prisma.portfolioPublication.findUnique({
      where: { userId: user.id },
    });
    expect(publication?.status).toBe("LIVE");
    expect(await activePublishGrants(user.id)).toHaveLength(0);
  });

  it("drops a premium-template publication to the free tier when its portfolio_pro subscription is cancelled with the period over", async () => {
    const user = await createUserWithSession();
    await createPublication(user.id, "nimbus");
    const base = {
      userId: user.id,
      subscriptionId: "sub_free_then_pro",
      productId: "prod_portfolio_pro_monthly",
    };
    await deliver(
      subscriptionEvent({ ...base, status: "active", at: eventTime(0), nextBillingDate: future() }),
    );
    expect(
      (await prisma.portfolioPublication.findUnique({ where: { userId: user.id } }))?.status,
    ).toBe("LIVE");

    await deliver(
      subscriptionEvent({
        ...base,
        status: "cancelled",
        at: eventTime(1),
        nextBillingDate: new Date(Date.now() - 60_000),
      }),
    );
    const publication = await prisma.portfolioPublication.findUnique({
      where: { userId: user.id },
    });
    // Decision 6: not offline until the hourly job; the webhook moves it to Atelier and it stays LIVE.
    expect(publication?.status).toBe("LIVE");
    expect(publication?.suspensionReason).toBeNull();
    expect(publication?.templateId).toBe("atelier");
  });
});

describe("hardening: unpublished rows, null next_billing_date, usage-only renewals", () => {
  it("does not republish a portfolio the user took down when a pass is bought", async () => {
    const user = await createUserWithSession();
    const publication = await createPublication(user.id);
    const takenDown = new Date(Date.now() - 2 * DAY_MS);
    await prisma.portfolioPublication.update({
      where: { id: publication.id },
      data: { status: "SUSPENDED", suspensionReason: "user_unpublished", suspendedAt: takenDown },
    });

    const { eventId } = await deliver(
      paymentEvent({
        userId: user.id,
        productId: "prod_bundle_seven_day",
        settlementAmount: 599,
        metadata: {
          veriworkly_user_id: user.id,
          veriworkly_product: "bundle",
          veriworkly_interval: "seven_day",
        },
      }),
    );
    expect(await eventStatus(eventId)).toBe("PROCESSED");
    expect((await activePublishGrants(user.id)).length).toBe(1);

    const after = await prisma.portfolioPublication.findUnique({ where: { id: publication.id } });
    expect(after?.status).toBe("SUSPENDED");
    expect(after?.suspensionReason).toBe("user_unpublished");
    expect(after?.suspendedAt?.getTime()).toBe(takenDown.getTime());
  });

  it("does not republish a user-unpublished portfolio on a subscription activation either", async () => {
    const user = await createUserWithSession();
    const publication = await createPublication(user.id);
    await prisma.portfolioPublication.update({
      where: { id: publication.id },
      data: { status: "SUSPENDED", suspensionReason: "user_unpublished", suspendedAt: new Date() },
    });
    await deliver(
      subscriptionEvent({
        userId: user.id,
        subscriptionId: "sub_unpublished_pro",
        productId: "prod_portfolio_pro_monthly",
        status: "active",
        at: eventTime(0),
        nextBillingDate: new Date(Date.now() + 30 * DAY_MS),
      }),
    );
    const after = await prisma.portfolioPublication.findUnique({ where: { id: publication.id } });
    expect(after?.status).toBe("SUSPENDED");
    expect(after?.suspensionReason).toBe("user_unpublished");
  });

  it("leaves an admin-suspended portfolio down through a subscription activation and a pass purchase", async () => {
    const user = await createUserWithSession();
    const publication = await createPublication(user.id);
    const takenDown = new Date(Date.now() - 2 * DAY_MS);
    // What `adminPortfolioService.updatePublicationStatus` stores: the admin's free-text reason.
    await prisma.portfolioPublication.update({
      where: { id: publication.id },
      data: { status: "SUSPENDED", suspensionReason: "abuse report", suspendedAt: takenDown },
    });

    await deliver(
      subscriptionEvent({
        userId: user.id,
        subscriptionId: "sub_admin_suspended_pro",
        productId: "prod_portfolio_pro_monthly",
        status: "active",
        at: eventTime(0),
        nextBillingDate: new Date(Date.now() + 30 * DAY_MS),
      }),
    );
    const afterSubscription = await prisma.portfolioPublication.findUnique({
      where: { id: publication.id },
    });
    expect(afterSubscription?.status).toBe("SUSPENDED");
    expect(afterSubscription?.suspensionReason).toBe("abuse report");
    expect(afterSubscription?.suspendedAt?.getTime()).toBe(takenDown.getTime());

    const { eventId } = await deliver(
      paymentEvent({
        userId: user.id,
        productId: "prod_bundle_seven_day",
        settlementAmount: 599,
        metadata: {
          veriworkly_user_id: user.id,
          veriworkly_product: "bundle",
          veriworkly_interval: "seven_day",
        },
      }),
    );
    expect(await eventStatus(eventId)).toBe("PROCESSED");
    expect((await activePublishGrants(user.id)).length).toBeGreaterThan(0);

    const afterPass = await prisma.portfolioPublication.findUnique({
      where: { id: publication.id },
    });
    expect(afterPass?.status).toBe("SUSPENDED");
    expect(afterPass?.suspensionReason).toBe("abuse report");
    expect(afterPass?.suspendedAt?.getTime()).toBe(takenDown.getTime());
  });

  it("keeps the stored period end when a cancellation carries no next_billing_date", async () => {
    const user = await createUserWithSession();
    const periodEnd = new Date(Date.now() + 12 * DAY_MS);
    const base = {
      userId: user.id,
      subscriptionId: "sub_cancel_null_nbd",
      productId: "prod_portfolio_pro_monthly",
    };
    await deliver(
      subscriptionEvent({
        ...base,
        status: "active",
        at: eventTime(0),
        nextBillingDate: periodEnd,
      }),
    );
    const { response } = await deliver(
      subscriptionEvent({ ...base, status: "cancelled", at: eventTime(1), nextBillingDate: null }),
    );
    expect(response.status).toBe(200);

    const row = await prisma.subscription.findUnique({
      where: { providerSubId: base.subscriptionId },
    });
    expect(row?.status).toBe("CANCELED");
    expect(row?.currentPeriodEnd?.getTime()).toBe(periodEnd.getTime());
    const grants = await activePublishGrants(user.id);
    expect(grants).toHaveLength(1);
    expect(grants[0].endsAt?.getTime()).toBe(periodEnd.getTime());
  });

  it("ends access now when a failed subscription with no stored period carries no next_billing_date", async () => {
    const user = await createUserWithSession();
    const at = eventTime(0);
    const { response } = await deliver(
      subscriptionEvent({
        userId: user.id,
        subscriptionId: "sub_failed_null_nbd",
        productId: "prod_portfolio_pro_monthly",
        status: "failed",
        at: at,
        nextBillingDate: null,
      }),
    );
    expect(response.status).toBe(200);
    const row = await prisma.subscription.findUnique({
      where: { providerSubId: "sub_failed_null_nbd" },
    });
    expect(row?.status).toBe("INACTIVE");
    expect(row?.currentPeriodEnd?.getTime()).toBe(at.getTime());
    expect(await activePublishGrants(user.id)).toHaveLength(0);
  });

  it("skips the allowance on a usage-only renewal and keys a real renewal on its service period", async () => {
    const user = await createUserWithSession();
    const subscriptionId = "sub_usage_only";
    await deliver(
      subscriptionEvent({
        userId: user.id,
        subscriptionId,
        productId: "prod_ai_credits_monthly",
        status: "active",
        at: eventTime(0),
        nextBillingDate: new Date(Date.now() + 30 * DAY_MS),
      }),
    );

    const usageOnly = paymentEvent({ userId: user.id, subscriptionId, settlementAmount: 120 });
    (usageOnly.data as Record<string, unknown>).service_periods = [
      {
        subscription_id: "sub_somebody_else",
        starts_at: eventTime(0).toISOString(),
        ends_at: new Date(Date.now() + 30 * DAY_MS).toISOString(),
        proration_factor: "1",
      },
    ];
    const first = await deliver(usageOnly);
    expect(await eventStatus(first.eventId)).toBe("PROCESSED");
    expect(await prisma.creditGrant.count({ where: { userId: user.id } })).toBe(0);

    const startsAt = eventTime(0).toISOString();
    const renewal = paymentEvent({ userId: user.id, subscriptionId, settlementAmount: 599 });
    (renewal.data as Record<string, unknown>).service_periods = [
      {
        subscription_id: subscriptionId,
        starts_at: startsAt,
        ends_at: new Date(Date.now() + 30 * DAY_MS).toISOString(),
        proration_factor: "1",
      },
    ];
    const second = await deliver(renewal);
    expect(await eventStatus(second.eventId)).toBe("PROCESSED");
    const grant = await prisma.creditGrant.findFirst({ where: { userId: user.id } });
    expect(grant?.amount).toBe(1_000);
    expect(grant?.sourceId).toBe(`${subscriptionId}:${startsAt}`);

    // A second distinct successful charge for the same period does not mint a second allowance.
    const again = paymentEvent({ userId: user.id, subscriptionId, settlementAmount: 599 });
    (again.data as Record<string, unknown>).service_periods = (
      renewal.data as Record<string, unknown>
    ).service_periods;
    const third = await deliver(again);
    expect(await eventStatus(third.eventId)).toBe("PROCESSED");
    expect(await prisma.creditGrant.count({ where: { userId: user.id } })).toBe(1);
  });
});
