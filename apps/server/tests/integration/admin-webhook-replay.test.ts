import { randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { prisma } from "#lib/prisma";

import { adminClient } from "./helpers/admin.js";
import { createUserWithSession } from "./helpers/auth.js";
import { expectLedgerBalanced, packPayment } from "./helpers/billing.js";

/**
 * V-352: `POST /admin/billing/webhooks/:id/replay` feeds a stored event back through the webhook
 * processor. It is the one admin action that can grant credits or access a second time, so these
 * pin what it does against real Postgres: a failed event grants exactly once however often or
 * however concurrently it is replayed, a row another attempt is still processing is not run in
 * parallel, and a payload redacted by retention or an account deletion is refused clearly.
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

const admin = adminClient();

function replay(eventId: string) {
  return admin
    .request("post", `/admin/billing/webhooks/${eventId}/replay`)
    .send({ reason: "Provider outage, replaying the failed event" });
}

/** A pack purchase stored the way the webhook leaves one whose processing kept failing. */
async function storedEvent(
  userId: string,
  overrides: { status?: "FAILED" | "PROCESSING"; lastAttemptAt?: Date; payload?: object } = {},
) {
  const payment = packPayment(userId, 499, `pay_${randomUUID()}`);
  const row = await prisma.billingWebhookEvent.create({
    data: {
      providerEventId: `evt_${randomUUID()}`,
      type: payment.type,
      payload: overrides.payload ?? payment,
      providerPaymentId: payment.data.payment_id,
      status: overrides.status ?? "FAILED",
      retryCount: 5,
      error: "database timeout",
      lastAttemptAt: overrides.lastAttemptAt ?? new Date(Date.now() - 60 * 60_000),
    },
  });
  return { row, payment };
}

async function balance(userId: string) {
  return (await prisma.creditWallet.findUnique({ where: { userId } }))?.balance ?? 0;
}

describe("admin webhook replay (V-352)", () => {
  it("applies a failed payment once, and a second replay is refused without granting again", async () => {
    const buyer = await createUserWithSession();
    const { row, payment } = await storedEvent(buyer.id);

    const first = await replay(row.id);
    expect(first.status, JSON.stringify(first.body)).toBe(200);
    expect(first.body.data).toMatchObject({ id: row.id, duplicate: false });
    const granted = await balance(buyer.id);
    expect(granted).toBeGreaterThan(0);
    expect(
      await prisma.creditGrant.count({
        where: { userId: buyer.id, sourceId: payment.data.payment_id },
      }),
    ).toBe(1);
    expect(
      (await prisma.billingWebhookEvent.findUniqueOrThrow({ where: { id: row.id } })).status,
    ).toBe("PROCESSED");

    const again = await replay(row.id);
    expect(again.status).toBe(409);
    expect(again.body.message).toBe("This webhook event has already been processed successfully.");
    expect(await balance(buyer.id)).toBe(granted);
    await expectLedgerBalanced(buyer.id);
  });

  it("two admins replaying the same failed event at once grant it once", async () => {
    const buyer = await createUserWithSession();
    const { row, payment } = await storedEvent(buyer.id);

    const responses = await Promise.all([replay(row.id), replay(row.id)]);

    const statuses = responses.map((response) => response.status);
    expect(statuses).toContain(200);
    for (const response of responses)
      expect([200, 409, 503], JSON.stringify(response.body)).toContain(response.status);
    expect(
      await prisma.creditGrant.count({
        where: { userId: buyer.id, sourceId: payment.data.payment_id },
      }),
    ).toBe(1);
    await expectLedgerBalanced(buyer.id);
  });

  it("does not run a row another attempt is still processing", async () => {
    const buyer = await createUserWithSession();
    const { row } = await storedEvent(buyer.id, {
      status: "PROCESSING",
      lastAttemptAt: new Date(),
    });

    const response = await replay(row.id);

    expect(response.status).toBe(503);
    expect(await balance(buyer.id)).toBe(0);
    expect(
      (await prisma.billingWebhookEvent.findUniqueOrThrow({ where: { id: row.id } })).status,
    ).toBe("PROCESSING");
  });

  it("refuses a redacted payload with a clear 409, and grants nothing", async () => {
    const buyer = await createUserWithSession();
    const { row } = await storedEvent(buyer.id, {
      payload: { redacted: true, type: "payment.succeeded" },
    });

    const response = await replay(row.id);

    expect(response.status, JSON.stringify(response.body)).toBe(409);
    expect(response.body.details).toMatchObject({ code: "WEBHOOK_PAYLOAD_REDACTED" });
    expect(response.body.message).toMatch(/payload was removed/);
    expect(await balance(buyer.id)).toBe(0);
    expect(
      (await prisma.billingWebhookEvent.findUniqueOrThrow({ where: { id: row.id } })).status,
    ).toBe("FAILED");
  });

  it("answers 404 for an event that does not exist", async () => {
    const response = await replay(randomUUID());
    expect(response.status).toBe(404);
  });
});
