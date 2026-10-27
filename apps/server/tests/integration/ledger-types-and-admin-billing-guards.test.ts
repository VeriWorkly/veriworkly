import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { app } from "#app";
import { prisma } from "#lib/prisma";
import { CreditService } from "#services/creditService";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";

vi.mock("#services/mail/billingMail", () => ({
  sendPurchaseConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendPaymentFailedEmail: vi.fn().mockResolvedValue(undefined),
  sendSubscriptionCancelledEmail: vi.fn().mockResolvedValue(undefined),
}));

/**
 * V-011: admin adjustments are their own ledger type, so goodwill never reads as paid credit or AI
 * spend. V-200: the customer's history carries no internal reference ids. Money LOWs: a concurrent
 * duplicate debit is a replay, an entitlement cannot be granted already ended, and two revokes
 * of one grant audit once.
 */

const ADMIN = "/api/v1/admin";

let actor: TestUser;
beforeAll(async () => {
  actor = await createUserWithSession({ email: "admin@example.test" });
});

function asAdmin(method: "post" | "delete", url: string) {
  return request(app)[method](url).set("Origin", STUDIO_ORIGIN).set("Cookie", actor.cookie);
}

describe("V-011 admin adjustments are ADJUSTMENT rows", () => {
  it("writes an added and a removed adjustment as ADJUSTMENT, and says when a submit replayed", async () => {
    const user = await createUserWithSession();
    const key = `adj-${randomUUID()}`;

    const added = await asAdmin("post", `${ADMIN}/billing/credits`)
      .set("Idempotency-Key", key)
      .send({ userId: user.id, amount: 40, reason: "Support goodwill credit" });
    expect(added.status).toBe(200);
    expect(added.body.data).toMatchObject({ type: "ADJUSTMENT", amount: 40, replayed: false });

    const replay = await asAdmin("post", `${ADMIN}/billing/credits`)
      .set("Idempotency-Key", key)
      .send({ userId: user.id, amount: 40, reason: "Support goodwill credit" });
    expect(replay.body.data).toMatchObject({ id: added.body.data.id, replayed: true });

    const removed = await asAdmin("post", `${ADMIN}/billing/credits`)
      .set("Idempotency-Key", `adj-${randomUUID()}`)
      .send({ userId: user.id, amount: -10, reason: "Granted twice by mistake" });
    expect(removed.status).toBe(200);
    expect(removed.body.data).toMatchObject({ type: "ADJUSTMENT", amount: -10 });

    const types = await prisma.creditTransaction.findMany({
      where: { userId: user.id },
      select: { type: true },
    });
    expect(types.map((row) => row.type)).toEqual(["ADJUSTMENT", "ADJUSTMENT"]);
    expect(
      (await prisma.creditWallet.findUniqueOrThrow({ where: { userId: user.id } })).balance,
    ).toBe(30);
  });
});

describe("V-011 / V-230 restored credits stay paid credit", () => {
  it("writes a restored credit pack as a paid GRANT, not an ADJUSTMENT", async () => {
    const user = await createUserWithSession();
    const restored = await asAdmin("post", `${ADMIN}/billing/credits`)
      .set("Idempotency-Key", `adj-${randomUUID()}`)
      .send({
        userId: user.id,
        amount: 250,
        kind: "pack",
        reason: "Pack lost in a failed webhook",
      });
    expect(restored.status).toBe(200);
    expect(restored.body.data).toMatchObject({ type: "GRANT", amount: 250 });

    const grant = await prisma.creditGrant.findFirstOrThrow({ where: { userId: user.id } });
    expect(grant.source).toBe("credit_pack");
  });
});

describe("V-200 the customer's credit history", () => {
  it("leaves out reference ids (grant and provider ids)", async () => {
    const user = await createUserWithSession();
    const sourceId = randomUUID();
    await CreditService.grant(user.id, 50, {
      requestId: `grant:${sourceId}`,
      source: "credit_pack",
      sourceId,
      reason: "250 extra credits",
    });

    const response = await request(app)
      .get("/api/v1/billing/credits/history")
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", user.cookie);
    expect(response.status).toBe(200);
    const rows = response.body.data as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ type: "GRANT", amount: 50, reason: "250 extra credits" });
    expect(rows[0]).not.toHaveProperty("referenceId");
  });
});

describe("credit ledger LOWs", () => {
  it("answers a concurrent duplicate debit with the first one's row, not a unique-constraint error", async () => {
    const user = await createUserWithSession();
    const sourceId = randomUUID();
    await CreditService.grant(user.id, 100, {
      requestId: `grant:${sourceId}`,
      source: "integration",
      sourceId,
    });

    const requestId = `debit:${randomUUID()}`;
    const results = await Promise.allSettled(
      Array.from({ length: 4 }, () =>
        CreditService.consume(user.id, 10, { requestId, action: "admin_adjustment" }),
      ),
    );
    const fulfilled = results.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    );
    // Every call either replays the one row or is told to retry; none surfaces a raw P2002.
    for (const result of results)
      if (result.status === "rejected") expect(result.reason).not.toHaveProperty("code", "P2002");
    expect(new Set(fulfilled.map((row) => row.id)).size).toBe(1);
    expect(
      (await prisma.creditWallet.findUniqueOrThrow({ where: { userId: user.id } })).balance,
    ).toBe(90);
  });

  it("refuses an entitlement grant whose end date has passed", async () => {
    const user = await createUserWithSession();
    const response = await asAdmin("post", `${ADMIN}/billing/entitlements`).send({
      userId: user.id,
      key: "ai_credits",
      reason: "Beta tester",
      endsAt: new Date(Date.now() - 60_000).toISOString(),
    });
    expect(response.status).toBe(400);
    expect(response.body.details).toMatchObject({ code: "ENDS_AT_IN_PAST" });
    expect(await prisma.entitlementGrant.count({ where: { userId: user.id } })).toBe(0);
  });

  it("revokes a grant once when two revokes race, with one audit entry", async () => {
    const user = await createUserWithSession();
    const granted = await asAdmin("post", `${ADMIN}/billing/entitlements`).send({
      userId: user.id,
      key: "ai_credits",
      reason: "Beta tester",
    });
    expect(granted.status).toBe(200);
    const grantId = granted.body.data.id as string;

    const responses = await Promise.all(
      [0, 1].map(() =>
        asAdmin("delete", `${ADMIN}/billing/entitlements/${grantId}`).send({ reason: "Beta over" }),
      ),
    );
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(
      await prisma.adminAuditEntry.count({
        where: { action: "billing.entitlement.revoke", targetId: grantId },
      }),
    ).toBe(1);
    // V-418: the audit count says nothing about the grant. It is revoked, once, and the
    // account no longer holds the entitlement through it.
    const grant = await prisma.entitlementGrant.findUniqueOrThrow({ where: { id: grantId } });
    expect(grant.revokedAt).not.toBeNull();
    expect(
      await prisma.entitlementGrant.count({
        where: { userId: user.id, key: "ai_credits", revokedAt: null },
      }),
    ).toBe(0);
    const winner = responses.find((response) => response.status === 200)!;
    expect(new Date(winner.body.data.revokedAt).getTime()).toBe(grant.revokedAt!.getTime());
  });
});
