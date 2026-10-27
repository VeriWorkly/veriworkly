import { randomUUID } from "node:crypto";

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { logger } from "#lib/logger";
import { prisma } from "#lib/prisma";

import { createUserWithSession, type TestUser } from "./helpers/auth.js";
import {
  asUser,
  billingMe,
  DAY_MS,
  deliver,
  eventTime,
  passPayment,
  paymentEvent,
  subscriptionEvent,
} from "./helpers/billing.js";

/**
 * Phase 10 group 1: V-212 cancellation email, V-214 grace kept, V-217 no dunning mail for a first
 * charge, V-218 one checkout per user and the second-subscription alarm, V-219 plan-change email,
 * V-220 a pass bought during a pass extends it, V-221 `paymentIssue` follows checkout's rule.
 */

const { billingMailMock, dodoMock } = vi.hoisted(() => ({
  billingMailMock: {
    sendPurchaseConfirmationEmail: vi.fn().mockResolvedValue(undefined),
    sendPaymentFailedEmail: vi.fn().mockResolvedValue(undefined),
    sendSubscriptionCancelledEmail: vi.fn().mockResolvedValue(undefined),
    sendPlanChangedEmail: vi.fn().mockResolvedValue(undefined),
  },
  dodoMock: {
    subscriptionsUpdate: vi.fn(),
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
        subscriptions: { update: dodoMock.subscriptionsUpdate },
        checkoutSessions: { create: dodoMock.checkoutCreate },
      });
    }
  }
  return { ...actual, default: MockedDodo };
});

let admin: TestUser;
beforeAll(async () => {
  admin = await createUserWithSession({ email: "admin@example.test" });
});

beforeEach(() => {
  for (const mock of Object.values(billingMailMock)) mock.mockReset().mockResolvedValue(undefined);
  dodoMock.subscriptionsUpdate.mockReset();
  dodoMock.checkoutCreate.mockReset().mockImplementation(async () => ({
    session_id: `cks_${randomUUID()}`,
    checkout_url: `https://checkout.test/${randomUUID()}`,
  }));
});

const settle = () => new Promise((resolve) => setTimeout(resolve, 300));

async function subscribed(productId = "prod_portfolio_pro_monthly") {
  const user = await createUserWithSession();
  const subscriptionId = `sub_${randomUUID()}`;
  const periodEnd = new Date(Date.now() + 20 * DAY_MS);
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
  return { user, subscriptionId, periodEnd, productId };
}

describe("V-212 cancellation email", () => {
  it("mails once when a portal cancel schedules the end, naming the product and the date", async () => {
    const { user, subscriptionId, periodEnd, productId } = await subscribed();
    const cancel = (step: number) =>
      subscriptionEvent({
        userId: user.id,
        subscriptionId,
        productId,
        status: "active",
        type: "subscription.updated",
        at: eventTime(step),
        nextBillingDate: periodEnd,
        cancelAtNextBillingDate: true,
      });

    await deliver(cancel(1));
    await vi.waitFor(() =>
      expect(billingMailMock.sendSubscriptionCancelledEmail).toHaveBeenCalledTimes(1),
    );
    expect(billingMailMock.sendSubscriptionCancelledEmail).toHaveBeenCalledWith(
      user.email,
      expect.objectContaining({ productName: "Creator Pro", accessEndsAt: periodEnd }),
    );

    // Redelivered, and the final cancellation at the period's end: still one email.
    await deliver(cancel(2));
    await deliver(
      subscriptionEvent({
        userId: user.id,
        subscriptionId,
        productId,
        status: "cancelled",
        at: eventTime(3),
        nextBillingDate: periodEnd,
      }),
    );
    await settle();
    expect(billingMailMock.sendSubscriptionCancelledEmail).toHaveBeenCalledTimes(1);
  });

  it("mails when an admin schedules the cancellation at the provider", async () => {
    const { user, subscriptionId, periodEnd } = await subscribed();
    const row = await prisma.subscription.findUniqueOrThrow({
      where: { providerSubId: subscriptionId },
    });
    dodoMock.subscriptionsUpdate.mockResolvedValue({
      subscription_id: subscriptionId,
      status: "active",
      cancel_at_next_billing_date: true,
      next_billing_date: periodEnd.toISOString(),
    });

    const response = await asUser(
      admin,
      "patch",
      `/api/v1/admin/billing/subscriptions/${row.id}`,
    ).send({ cancelAtPeriodEnd: true, reason: "Customer asked by email" });
    expect(response.status).toBe(200);
    await vi.waitFor(() =>
      expect(billingMailMock.sendSubscriptionCancelledEmail).toHaveBeenCalledWith(
        user.email,
        expect.objectContaining({ productName: "Creator Pro" }),
      ),
    );
  });
});

describe("V-214 the grace window does not slide", () => {
  it("keeps the first graceEndsAt across repeated dunning events", async () => {
    const { user, subscriptionId, productId } = await subscribed();
    const hold = (step: number, type: string) =>
      subscriptionEvent({
        userId: user.id,
        subscriptionId,
        productId,
        status: "on_hold",
        type,
        at: new Date(Date.now() + step * 60_000),
        nextBillingDate: null,
      });

    await deliver(hold(1, "subscription.on_hold"));
    const first = await prisma.subscription.findUniqueOrThrow({
      where: { providerSubId: subscriptionId },
    });
    await deliver(hold(30, "subscription.updated"));
    const second = await prisma.subscription.findUniqueOrThrow({
      where: { providerSubId: subscriptionId },
    });

    expect(first.graceEndsAt).not.toBeNull();
    expect(second.graceEndsAt?.getTime()).toBe(first.graceEndsAt?.getTime());
  });
});

describe("V-215 / V-217 payment-failed email", () => {
  it("tells a renewing subscriber Pro is paused and the portfolio stays online", async () => {
    const { user, subscriptionId, productId } = await subscribed();
    await deliver(
      paymentEvent({
        userId: user.id,
        type: "payment.failed",
        subscriptionId,
        productId,
        amount: 599,
        chargeType: "renewal",
      }),
    );
    await vi.waitFor(() => expect(billingMailMock.sendPaymentFailedEmail).toHaveBeenCalledTimes(1));
    expect(billingMailMock.sendPaymentFailedEmail).toHaveBeenCalledWith(
      user.email,
      expect.objectContaining({ productName: "Creator Pro", includesPortfolio: true }),
    );
  });

  it("does not dun a first charge that was declined", async () => {
    const user = await createUserWithSession();
    const subscriptionId = `sub_${randomUUID()}`;
    await deliver(
      subscriptionEvent({
        userId: user.id,
        subscriptionId,
        productId: "prod_portfolio_pro_monthly",
        status: "pending",
        at: eventTime(0),
        nextBillingDate: null,
      }),
    );
    const failed = (chargeType?: string) =>
      paymentEvent({
        userId: user.id,
        type: "payment.failed",
        subscriptionId,
        productId: "prod_portfolio_pro_monthly",
        amount: 599,
        chargeType,
      });

    await deliver(failed("new"));
    // Without a charge type the row says it: never ACTIVE.
    await deliver(failed());
    await settle();
    expect(billingMailMock.sendPaymentFailedEmail).not.toHaveBeenCalled();
  });
});

describe("V-221 paymentIssue follows the checkout rule", () => {
  it("reports the payment issue after grace while checkout still refuses with PAYMENT_OUTSTANDING", async () => {
    const user = await createUserWithSession();
    await prisma.subscription.create({
      data: {
        userId: user.id,
        provider: "dodo",
        providerSubId: `sub_${randomUUID()}`,
        productKey: "portfolio_pro",
        interval: "MONTHLY",
        status: "PAST_DUE",
        rawStatus: "on_hold",
        currentPeriodEnd: new Date(Date.now() - 10 * DAY_MS),
        graceEndsAt: new Date(Date.now() - DAY_MS),
      },
    });

    const me = await billingMe(user);
    expect(me.access.paymentIssue).toBe(true);
    expect(me.access.isPaying).toBe(true);
    expect(me.status).toBe("PAST_DUE");

    const checkout = await asUser(user, "post", "/api/v1/billing/checkout").send({
      productKey: "ai_credits",
      interval: "monthly",
    });
    expect(checkout.status).toBe(409);
    expect(checkout.body.details?.code ?? checkout.body.error?.details?.code).toBe(
      "PAYMENT_OUTSTANDING",
    );
  });
});

describe("V-218 one subscription checkout per user", () => {
  it("refuses a second product's checkout while one is open", async () => {
    const user = await createUserWithSession();
    const first = await asUser(user, "post", "/api/v1/billing/checkout").send({
      productKey: "portfolio_pro",
      interval: "monthly",
    });
    expect(first.status, JSON.stringify(first.body)).toBe(200);

    const second = await asUser(user, "post", "/api/v1/billing/checkout").send({
      productKey: "ai_credits",
      interval: "monthly",
    });
    expect(second.status).toBe(409);
    expect(JSON.stringify(second.body)).toContain("CHECKOUT_IN_PROGRESS");
    expect(dodoMock.checkoutCreate).toHaveBeenCalledTimes(1);

    // The same product and interval still gets the session already open.
    const again = await asUser(user, "post", "/api/v1/billing/checkout").send({
      productKey: "portfolio_pro",
      interval: "monthly",
    });
    expect(again.status).toBe(200);
    expect(again.body.data.url).toBe(first.body.data.url);
  });

  it("raises the alarm on any second live subscription, whatever its product", async () => {
    const errors = vi.spyOn(logger, "error");
    const { user } = await subscribed("prod_portfolio_pro_monthly");
    await deliver(
      subscriptionEvent({
        userId: user.id,
        subscriptionId: `sub_${randomUUID()}`,
        productId: "prod_ai_credits_monthly",
        status: "active",
        at: eventTime(1),
        nextBillingDate: new Date(Date.now() + 25 * DAY_MS),
      }),
    );
    expect(
      errors.mock.calls.some(([message]) =>
        /more than one live subscription/i.test(String(message)),
      ),
    ).toBe(true);
  });
});

describe("V-219 plan-change email", () => {
  it("confirms an upgrade once, with the new plan and its renewal", async () => {
    const { user, subscriptionId, periodEnd } = await subscribed("prod_portfolio_pro_monthly");
    const changed = (step: number) =>
      subscriptionEvent({
        userId: user.id,
        subscriptionId,
        productId: "prod_bundle_monthly",
        status: "active",
        type: "subscription.plan_changed",
        at: eventTime(step),
        nextBillingDate: periodEnd,
        amount: 1_499,
      });

    await deliver(changed(1));
    await deliver(changed(2));
    await vi.waitFor(() => expect(billingMailMock.sendPlanChangedEmail).toHaveBeenCalledTimes(1));
    expect(billingMailMock.sendPlanChangedEmail).toHaveBeenCalledWith(
      user.email,
      expect.objectContaining({
        fromProductName: "Creator Pro (monthly)",
        productName: "Job Hunter Bundle (monthly)",
        amountCents: 1_499,
        renewsAt: periodEnd,
      }),
    );
    await settle();
    expect(billingMailMock.sendPlanChangedEmail).toHaveBeenCalledTimes(1);
  });
});

describe("V-220 a pass bought during a pass", () => {
  it("extends from the end of the pass already running", async () => {
    const user = await createUserWithSession();
    const firstAt = new Date(Date.now() - 2 * DAY_MS);
    await deliver(passPayment(user.id, 599, firstAt));
    const firstEnd = (await billingMe(user)).access.passEndsAt as string;
    expect(new Date(firstEnd).getTime()).toBe(firstAt.getTime() + 7 * DAY_MS);

    const second = passPayment(user.id);
    await deliver(second);

    const me = await billingMe(user);
    expect(new Date(me.access.passEndsAt).getTime()).toBe(
      new Date(firstEnd).getTime() + 7 * DAY_MS,
    );
    // Its credits last as long as the access it bought.
    const grant = await prisma.creditGrant.findFirstOrThrow({
      where: { userId: user.id, sourceId: second.data.payment_id },
    });
    expect(grant.expiresAt?.getTime()).toBe(new Date(firstEnd).getTime() + 7 * DAY_MS);

    // A redelivery does not move it again.
    await deliver(second);
    expect(new Date((await billingMe(user)).access.passEndsAt).getTime()).toBe(
      new Date(firstEnd).getTime() + 7 * DAY_MS,
    );
  });
});

describe("review: the payment-failed email names the subscription's own grace date", () => {
  it("uses the failed payment's time and keeps the date when the dunning event follows", async () => {
    const { user, subscriptionId, productId } = await subscribed();
    const failedAt = new Date(Date.now() - 30_000);
    await deliver(
      paymentEvent({
        userId: user.id,
        type: "payment.failed",
        subscriptionId,
        productId,
        amount: 599,
        chargeType: "renewal",
        at: failedAt,
      }),
    );
    await vi.waitFor(() => expect(billingMailMock.sendPaymentFailedEmail).toHaveBeenCalledTimes(1));
    const mailed = billingMailMock.sendPaymentFailedEmail.mock.calls[0]![1].graceEndsAt as Date;

    await deliver(
      subscriptionEvent({
        userId: user.id,
        subscriptionId,
        productId,
        status: "on_hold",
        at: new Date(Date.now() + 60_000),
        nextBillingDate: null,
      }),
    );
    const row = await prisma.subscription.findUniqueOrThrow({
      where: { providerSubId: subscriptionId },
    });
    expect(row.graceEndsAt?.getTime()).toBe(mailed.getTime());
    expect(mailed.getTime() - failedAt.getTime()).toBe(
      (await import("#config")).config.portfolio.graceDays * DAY_MS,
    );
  });
});

describe("review: a payment failure only opens dunning on a live subscription", () => {
  const failure = (user: TestUser, subscriptionId: string, productId: string, at: Date) =>
    paymentEvent({
      userId: user.id,
      type: "payment.failed",
      subscriptionId,
      productId,
      amount: 599,
      chargeType: "renewal",
      at,
    });

  it("ignores a late failure for a cancelled subscription", async () => {
    const { user, subscriptionId, periodEnd, productId } = await subscribed();
    await deliver(
      subscriptionEvent({
        userId: user.id,
        subscriptionId,
        productId,
        status: "cancelled",
        at: eventTime(1),
        nextBillingDate: periodEnd,
      }),
    );

    await deliver(failure(user, subscriptionId, productId, new Date()));
    await settle();

    expect(billingMailMock.sendPaymentFailedEmail).not.toHaveBeenCalled();
    const row = await prisma.subscription.findUniqueOrThrow({
      where: { providerSubId: subscriptionId },
    });
    expect(row.graceEndsAt).toBeNull();
  });

  it("ignores a failure older than the renewal that followed it", async () => {
    const { user, subscriptionId, productId } = await subscribed();
    await deliver(
      subscriptionEvent({
        userId: user.id,
        subscriptionId,
        productId,
        status: "active",
        type: "subscription.renewed",
        at: new Date(),
        nextBillingDate: new Date(Date.now() + 30 * DAY_MS),
      }),
    );

    await deliver(failure(user, subscriptionId, productId, new Date(Date.now() - 10 * 60_000)));
    await settle();

    expect(billingMailMock.sendPaymentFailedEmail).not.toHaveBeenCalled();
    const row = await prisma.subscription.findUniqueOrThrow({
      where: { providerSubId: subscriptionId },
    });
    expect(row.graceEndsAt).toBeNull();
  });

  it("clears the grace date when the renewal is paid", async () => {
    const { user, subscriptionId, productId } = await subscribed();
    await deliver(failure(user, subscriptionId, productId, new Date()));
    expect(
      (await prisma.subscription.findUniqueOrThrow({ where: { providerSubId: subscriptionId } }))
        .graceEndsAt,
    ).not.toBeNull();

    await deliver(
      paymentEvent({
        userId: user.id,
        subscriptionId,
        productId,
        amount: 599,
        chargeType: "renewal",
        at: new Date(Date.now() + 1_000),
      }),
    );

    expect(
      (await prisma.subscription.findUniqueOrThrow({ where: { providerSubId: subscriptionId } }))
        .graceEndsAt,
    ).toBeNull();
  });
});
