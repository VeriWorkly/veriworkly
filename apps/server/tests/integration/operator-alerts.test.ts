import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { app } from "#app";
import { logger } from "#lib/logger";
import { prisma } from "#lib/prisma";
import { settleBillingNotifications } from "#services/billingNotifications";

import { INTERNAL_API_KEY_VALUE } from "./env.js";
import { createUserWithSession } from "./helpers/auth.js";
import { deliver, packPayment, subscriptionEvent, WEBHOOK_PATH } from "./helpers/billing.js";
import { signDodoWebhook } from "./helpers/webhook.js";

/**
 * V-371: a money incident reaches a person, not only a log line. A webhook that keeps failing (the
 * customer paid and got nothing) and a processed event that carries a note for a human (a payment
 * taken for a deleted account, an affiliate shortfall) each mail ADMIN_EMAIL once, durably, and
 * `/health/jobs` reports them so the uptime check alerts as well.
 */

const { operatorMailMock } = vi.hoisted(() => ({
  operatorMailMock: { sendOperatorAlertEmail: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("#services/mail/operatorMail", () => operatorMailMock);

const ADMIN_EMAIL = "admin@example.test";

beforeAll(async () => {
  await createUserWithSession({ email: ADMIN_EMAIL });
});

beforeEach(() => {
  operatorMailMock.sendOperatorAlertEmail.mockReset().mockResolvedValue(undefined);
});

/** Delivers a signed event whose processing fails, as the provider's retries would. */
async function deliverFailing(event: unknown, id: string) {
  const body = JSON.stringify(event);
  const headers = signDodoWebhook(body, { id });
  const req = request(app).post(WEBHOOK_PATH);
  for (const [key, value] of Object.entries(headers)) req.set(key, value);
  const response = await req.send(body);
  expect(response.status).toBeGreaterThanOrEqual(400);
}

function healthJobs() {
  return request(app).get("/api/v1/health/jobs").set("x-internal-key", INTERNAL_API_KEY_VALUE);
}

describe("money incidents notify the operator (V-371)", () => {
  it("a webhook that exhausted its retries mails the admin once, and /health/jobs needs attention", async () => {
    const user = await createUserWithSession();
    // A status the server has never heard of fails the event every time.
    const event = subscriptionEvent({
      userId: user.id,
      subscriptionId: `sub_${randomUUID()}`,
      productId: "prod_portfolio_pro_monthly",
      status: "status_from_the_future",
      at: new Date(),
      nextBillingDate: new Date(Date.now() + 86_400_000),
      type: "subscription.active",
    });
    const id = `msg_${randomUUID()}`;

    for (let attempt = 0; attempt < 7; attempt++) {
      await deliverFailing(event, id);
      // The claim is free again only after its lock window; replay that the way time would.
      await prisma.billingWebhookEvent.updateMany({
        where: { providerEventId: id },
        data: { lastAttemptAt: new Date(Date.now() - 60 * 60_000) },
      });
    }
    await settleBillingNotifications();
    const stored = await prisma.billingWebhookEvent.findUniqueOrThrow({
      where: { providerEventId: id },
    });
    expect(stored).toMatchObject({ status: "FAILED" });
    expect(stored.retryCount).toBeGreaterThanOrEqual(5);

    expect(operatorMailMock.sendOperatorAlertEmail).toHaveBeenCalledTimes(1);
    const [to, alert] = operatorMailMock.sendOperatorAlertEmail.mock.calls[0]!;
    expect(to).toBe(ADMIN_EMAIL);
    expect(alert.subject).toContain(id);
    expect(alert.lines.join(" ")).toMatch(/replay/i);
    // Review 6: the raw error can quote customer data (a Prisma error's query arguments); the
    // mail carries only its class and a short generic line.
    expect(stored.error).toBeTruthy();
    expect(alert.lines.join(" ")).not.toContain(stored.error);
    const errorLine = alert.lines.find((line: string) => line.startsWith("Last error:"))!;
    expect(errorLine).toMatch(/^Last error: [A-Za-z]*Error\b/);
    expect(errorLine.length).toBeLessThanOrEqual(160);

    const health = await healthJobs();
    expect(health.status).toBe(200);
    expect(health.body.data.billing).toMatchObject({ failedWebhooks: 1 });
    expect(health.body.data.attention).toBe(true);
  });

  it("a payment taken for a deleted account mails the refund note to the admin", async () => {
    const payment = packPayment(`deleted-${randomUUID()}`, 499);
    const { eventId } = await deliver(payment);
    await settleBillingNotifications();

    expect(operatorMailMock.sendOperatorAlertEmail).toHaveBeenCalledTimes(1);
    const [to, alert] = operatorMailMock.sendOperatorAlertEmail.mock.calls[0]!;
    expect(to).toBe(ADMIN_EMAIL);
    expect(alert.lines.join(" ")).toContain(`Refund needed: payment ${payment.data.payment_id}`);

    // Redelivered: the same event id is a duplicate, and the note is not mailed twice.
    await deliver(payment, eventId);
    await settleBillingNotifications();
    expect(operatorMailMock.sendOperatorAlertEmail).toHaveBeenCalledTimes(1);

    const health = await healthJobs();
    expect(health.body.data.billing.notedWebhooks).toBeGreaterThanOrEqual(1);
    expect(health.body.data.attention).toBe(true);
  });

  it("an ordinary purchase mails nobody and needs no attention", async () => {
    await prisma.billingWebhookEvent.deleteMany({});
    const buyer = await createUserWithSession();
    await deliver(packPayment(buyer.id));
    await settleBillingNotifications();

    expect(operatorMailMock.sendOperatorAlertEmail).not.toHaveBeenCalled();
    const health = await healthJobs();
    expect(health.body.data.billing).toEqual({ failedWebhooks: 0, notedWebhooks: 0 });
    expect(health.body.data.attention).toBe(false);
  });
});

describe("what keeps /health/jobs asking for attention (V-371 review)", () => {
  async function deadLetter(overrides: { payload?: object; daysAgo?: number } = {}) {
    const row = await prisma.billingWebhookEvent.create({
      data: {
        providerEventId: `evt_${randomUUID()}`,
        type: "payment.succeeded",
        payload: overrides.payload ?? { type: "payment.succeeded", data: {} },
        status: "FAILED",
        retryCount: 5,
        error: "database timeout",
      },
    });
    if (overrides.daysAgo)
      await prisma.$executeRaw`
        UPDATE "BillingWebhookEvent"
        SET "createdAt" = now() - make_interval(days => ${overrides.daysAgo}),
            "updatedAt" = now() - make_interval(days => ${overrides.daysAgo}),
            "lastAttemptAt" = now() - make_interval(days => ${overrides.daysAgo})
        WHERE "id" = ${row.id}`;
    return row;
  }

  it("a dead-letter older than seven days no longer counts", async () => {
    await prisma.billingWebhookEvent.deleteMany({});
    await deadLetter({ daysAgo: 8 });

    const health = await healthJobs();
    expect(health.body.data.billing).toEqual({ failedWebhooks: 0, notedWebhooks: 0 });
    expect(health.body.data.attention).toBe(false);

    await deadLetter({ daysAgo: 2 });
    expect((await healthJobs()).body.data.billing.failedWebhooks).toBe(1);
  });

  it("a dead-letter whose payload was redacted, which can never be replayed, does not count", async () => {
    await prisma.billingWebhookEvent.deleteMany({});
    await deadLetter({ payload: { redacted: true, type: "payment.succeeded" } });

    expect((await healthJobs()).body.data.billing.failedWebhooks).toBe(0);
  });
});

describe("the other operator alerts (V-371 review)", () => {
  it("a customer with two live subscriptions is mailed to the admin once", async () => {
    const user = await createUserWithSession();
    const next = new Date(Date.now() + 20 * 86_400_000);
    const first = `sub_${randomUUID()}`;
    const second = `sub_${randomUUID()}`;
    for (const [subscriptionId, productId] of [
      [first, "prod_portfolio_pro_monthly"],
      [second, "prod_ai_credits_monthly"],
    ] as const)
      await deliver(
        subscriptionEvent({
          userId: user.id,
          subscriptionId,
          productId,
          status: "active",
          at: new Date(),
          nextBillingDate: next,
        }),
      );
    await settleBillingNotifications();

    expect(operatorMailMock.sendOperatorAlertEmail).toHaveBeenCalledTimes(1);
    const [to, alert] = operatorMailMock.sendOperatorAlertEmail.mock.calls[0]!;
    expect(to).toBe(ADMIN_EMAIL);
    expect(alert.subject).toContain(user.id);
    expect(alert.lines.join(" ")).toContain(first);
    expect(alert.lines.join(" ")).toContain(second);
  });

  it("with no account for ADMIN_EMAIL, nothing is mailed and the gap is logged", async () => {
    const errors = vi.spyOn(logger, "error");
    await prisma.user.deleteMany({ where: { email: ADMIN_EMAIL } });

    await deliver(packPayment(`deleted-${randomUUID()}`, 499));
    await settleBillingNotifications();

    expect(operatorMailMock.sendOperatorAlertEmail).not.toHaveBeenCalled();
    expect(errors).toHaveBeenCalledWith(
      "Operator alert not mailed: no account for ADMIN_EMAIL",
      expect.objectContaining({ kind: "billing_webhook_note" }),
    );
  });
});
