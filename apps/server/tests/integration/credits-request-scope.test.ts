import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { app } from "#app";
import { prisma } from "#lib/prisma";
import { CreditService } from "#services/creditService";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession } from "./helpers/auth.js";

vi.mock("#services/mail/index", () => ({
  sendAccountDeletedEmail: vi.fn().mockResolvedValue(undefined),
}));

/**
 * Two things an account must not be able to do to another account's money: collide with its
 * credit request ids, and take its payout history with it when it is deleted.
 */

async function grant(userId: string, amount: number) {
  const id = randomUUID();
  await CreditService.grant(userId, amount, {
    requestId: `grant:${id}`,
    source: "integration",
    sourceId: id,
  });
}

async function ledger(userId: string) {
  const rows = await prisma.$queryRaw<
    Array<{ balance: number; reserved: number; unexpired: number }>
  >`
    SELECT w.balance, w.reserved,
      COALESCE((
        SELECT SUM(g.remaining) FROM "CreditGrant" g
        WHERE g."walletId" = w.id AND g.remaining > 0
          AND (g."expiresAt" IS NULL OR g."expiresAt" > NOW())
      ), 0)::int AS unexpired
    FROM "CreditWallet" w WHERE w."userId" = ${userId}
  `;
  expect(rows).toHaveLength(1);
  const row = rows[0]!;
  expect(row.balance + row.reserved).toBe(row.unexpired);
  return row;
}

describe("credit request ids are scoped to the user", () => {
  it("two users can reserve, commit and consume under one client request id", async () => {
    const alice = await createUserWithSession();
    const bob = await createUserWithSession();
    await grant(alice.id, 50);
    await grant(bob.id, 50);
    const requestId = `client-${randomUUID()}`;

    const [first, second] = await Promise.all([
      CreditService.reserve(alice.id, 10, "analyze", requestId),
      CreditService.reserve(bob.id, 10, "analyze", requestId),
    ]);
    expect(first.userId).toBe(alice.id);
    expect(second.userId).toBe(bob.id);

    const committed = await Promise.all([
      CreditService.commitReservation(alice.id, requestId, {}),
      CreditService.commitReservation(bob.id, requestId, {}),
    ]);
    expect(committed.map((tx) => tx.userId).sort()).toEqual([alice.id, bob.id].sort());

    // The debit path dedupes per user too: the same id is a fresh charge for the other account.
    const debitId = `debit-${randomUUID()}`;
    await CreditService.consume(alice.id, 5, { requestId: debitId, action: "admin_adjustment" });
    await CreditService.consume(bob.id, 5, { requestId: debitId, action: "admin_adjustment" });

    expect((await ledger(alice.id)).balance).toBe(35);
    expect((await ledger(bob.id)).balance).toBe(35);
  });

  it("the same user reusing a request id still gets the idempotent answer, not a second charge", async () => {
    const user = await createUserWithSession();
    await grant(user.id, 50);
    const requestId = `client-${randomUUID()}`;

    await CreditService.reserve(user.id, 10, "analyze", requestId);
    await expect(CreditService.reserve(user.id, 10, "analyze", requestId)).rejects.toMatchObject({
      statusCode: 409,
    });
    const committed = await CreditService.commitReservation(user.id, requestId, {});

    const debitId = `debit-${randomUUID()}`;
    const debit = await CreditService.consume(user.id, 5, { requestId: debitId });
    const replay = await CreditService.consume(user.id, 5, { requestId: debitId });
    expect(replay.id).toBe(debit.id);
    await expect(CreditService.consume(user.id, 6, { requestId: debitId })).rejects.toMatchObject({
      statusCode: 409,
    });

    expect(committed.amount).toBe(-10);
    expect((await ledger(user.id)).balance).toBe(35);
  });
});

describe("account deletion keeps affiliate money history", () => {
  async function seedPaidAffiliate() {
    const affiliate = await createUserWithSession();
    await prisma.user.update({
      where: { id: affiliate.id },
      data: { affiliateStatus: "ACTIVE", affiliateCode: `code${randomUUID().slice(0, 8)}` },
    });
    const referred = await createUserWithSession();
    const referral = await prisma.affiliateReferral.create({
      data: { affiliateId: affiliate.id, referredUserId: referred.id, code: "code" },
    });
    const commission = await prisma.affiliateCommission.create({
      data: {
        affiliateId: affiliate.id,
        referralId: referral.id,
        providerPaymentId: `pay_${randomUUID()}`,
        amountCents: 1_200,
        rateBps: 2_000,
        status: "PAID",
        paidAt: new Date(),
      },
    });
    const withdrawal = await prisma.affiliateWithdrawal.create({
      data: { userId: affiliate.id, amountCents: 1_200, status: "PAID", paidAt: new Date() },
    });
    await prisma.affiliateWallet.create({ data: { userId: affiliate.id, paidCents: 1_200 } });
    return { affiliate, referred, commission, withdrawal };
  }

  it("self-service deletion of an affiliate leaves the paid commission and withdrawal rows", async () => {
    const { affiliate, commission, withdrawal } = await seedPaidAffiliate();

    const deleted = await request(app)
      .delete("/api/v1/users/me")
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", affiliate.cookie);
    expect(deleted.status).toBe(200);
    expect(await prisma.user.findUnique({ where: { id: affiliate.id } })).toBeNull();

    const storedCommission = await prisma.affiliateCommission.findUnique({
      where: { id: commission.id },
    });
    expect(storedCommission).toMatchObject({
      amountCents: 1_200,
      status: "PAID",
      affiliateId: null,
    });
    const storedWithdrawal = await prisma.affiliateWithdrawal.findUnique({
      where: { id: withdrawal.id },
    });
    expect(storedWithdrawal).toMatchObject({ amountCents: 1_200, status: "PAID", userId: null });
  });

  it("admin deletion keeps them too, and a deleted affiliate's pending commission cannot be released", async () => {
    const { affiliate, commission } = await seedPaidAffiliate();
    const pending = await prisma.affiliateCommission.create({
      data: {
        affiliateId: affiliate.id,
        providerPaymentId: `pay_${randomUUID()}`,
        amountCents: 300,
        rateBps: 2_000,
        status: "PENDING",
      },
    });
    const admin = await createUserWithSession({ email: "admin@example.test" });

    const deleted = await request(app)
      .delete(`/api/v1/admin/users/${affiliate.id}`)
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", admin.cookie)
      .send({ confirmEmail: affiliate.email, reason: "Requested by the user" });
    expect(deleted.status).toBe(200);

    expect(await prisma.affiliateCommission.count({ where: { id: commission.id } })).toBe(1);

    const release = await request(app)
      .patch(`/api/v1/admin/affiliates/commissions/${pending.id}`)
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", admin.cookie)
      .send({ status: "AVAILABLE", reason: "Matured" });
    expect(release.status).toBe(409);
    // Forfeited with the account (owner decision 10, V-234): kept as history, never owed.
    expect(
      (await prisma.affiliateCommission.findUniqueOrThrow({ where: { id: pending.id } })).status,
    ).toBe("REVERSED");
  });
});
