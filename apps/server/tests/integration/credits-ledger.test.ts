import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { ApiError } from "#lib/errors";
import { prisma } from "#lib/prisma";
import { CreditService, sweepExpiredCredits } from "#services/creditService";

import { createUserWithSession } from "./helpers/auth.js";

/**
 * The credit ledger against the real database. Every scenario ends by asserting the ledger
 * invariant straight from SQL: `balance + reserved == Σ remaining of unexpired grants`, and no
 * wallet or grant ever goes negative. The invariant is stated after a sweep
 * (`sweepExpiredCredits` runs both expiry sweeps; reads no longer do, V-107), because grant
 * expiry is lazy by design.
 */

const HOUR = 60 * 60 * 1000;

type Ledger = { balance: number; reserved: number; unexpired: number };

async function ledgerOf(userId: string): Promise<Ledger> {
  const rows = await prisma.$queryRaw<Array<Ledger>>`
    SELECT w.balance, w.reserved,
      COALESCE((
        SELECT SUM(g.remaining) FROM "CreditGrant" g
        WHERE g."walletId" = w.id AND g.remaining > 0
          AND (g."expiresAt" IS NULL OR g."expiresAt" > NOW())
      ), 0)::int AS unexpired
    FROM "CreditWallet" w WHERE w."userId" = ${userId}
  `;
  expect(rows).toHaveLength(1);
  return rows[0]!;
}

async function expectInvariant(userId: string) {
  const ledger = await ledgerOf(userId);
  expect(ledger.balance).toBeGreaterThanOrEqual(0);
  expect(ledger.reserved).toBeGreaterThanOrEqual(0);
  expect(ledger.balance + ledger.reserved).toBe(ledger.unexpired);

  const negatives = await prisma.$queryRaw<Array<{ wallets: number; grants: number }>>`
    SELECT
      (SELECT COUNT(*) FROM "CreditWallet" WHERE balance < 0 OR reserved < 0)::int AS wallets,
      (SELECT COUNT(*) FROM "CreditGrant" WHERE remaining < 0)::int AS grants
  `;
  expect(negatives[0]).toEqual({ wallets: 0, grants: 0 });
  return ledger;
}

async function grant(userId: string, amount: number, expiresAt: Date | null = null) {
  const id = randomUUID();
  await CreditService.grant(userId, amount, {
    requestId: `grant:${id}`,
    source: "integration",
    sourceId: id,
    expiresAt,
  });
  const row = await prisma.creditGrant.findUniqueOrThrow({
    where: { userId_source_sourceId: { userId, source: "integration", sourceId: id } },
  });
  return row;
}

function statusOf(outcome: PromiseSettledResult<unknown>) {
  if (outcome.status === "fulfilled") return 200;
  if (outcome.reason instanceof ApiError) return outcome.reason.statusCode;
  throw outcome.reason;
}

async function allocationsOf(grantId: string) {
  const sum = await prisma.creditUsageAllocation.aggregate({
    where: { grantId },
    _sum: { amount: true },
  });
  return sum._sum.amount ?? 0;
}

describe("credit ledger invariants against the real database", () => {
  it("(a) commit after the reservation expired is a 409 that touches neither wallet nor grants", async () => {
    const user = await createUserWithSession();
    const g = await grant(user.id, 100);
    const requestId = `req:${randomUUID()}`;
    const reservation = await CreditService.reserve(user.id, 30, "ats_analysis", requestId);
    expect(await ledgerOf(user.id)).toMatchObject({ balance: 70, reserved: 30 });

    await prisma.creditReservation.update({
      where: { id: reservation.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(await CreditService.releaseExpiredReservations(user.id)).toBe(30);

    await expect(
      CreditService.commitReservation(user.id, requestId, { reason: "late commit" }),
    ).rejects.toMatchObject({ statusCode: 409 });

    const wallet = await prisma.creditWallet.findUniqueOrThrow({ where: { userId: user.id } });
    expect(wallet).toMatchObject({ balance: 100, reserved: 0, lifetimeDebited: 0 });
    expect(await allocationsOf(g.id)).toBe(0);
    expect((await prisma.creditGrant.findUniqueOrThrow({ where: { id: g.id } })).remaining).toBe(
      100,
    );
    const stillExpired = await prisma.creditReservation.findFirstOrThrow({
      where: { requestId: `ai:${requestId}` },
    });
    expect(stillExpired.status).toBe("EXPIRED");
    expect(
      await prisma.creditTransaction.count({ where: { userId: user.id, type: "DEBIT" } }),
    ).toBe(0);
    await expectInvariant(user.id);
  });

  it("(b) eight parallel reserve(10) against 75 credits admit exactly seven", async () => {
    const user = await createUserWithSession();
    await grant(user.id, 75);

    const outcomes = await Promise.allSettled(
      Array.from({ length: 8 }, (_, i) =>
        CreditService.reserve(user.id, 10, "ats_analysis", `req:${user.id}:${i}`),
      ),
    );
    const statuses = outcomes.map(statusOf);
    expect(statuses.filter((s) => s === 200)).toHaveLength(7);
    expect(statuses.filter((s) => s === 402 || s === 409)).toHaveLength(1);

    const ledger = await expectInvariant(user.id);
    expect(ledger).toMatchObject({ balance: 5, reserved: 70, unexpired: 75 });
    expect(
      await prisma.creditReservation.count({ where: { userId: user.id, status: "PENDING" } }),
    ).toBe(7);
  });

  it("(c) two concurrent commits that together exceed one grant but fit two both succeed", async () => {
    const user = await createUserWithSession();
    const g1 = await grant(user.id, 40, new Date(Date.now() + HOUR));
    const g2 = await grant(user.id, 40, new Date(Date.now() + 2 * HOUR));
    const r1 = `req:${randomUUID()}`;
    const r2 = `req:${randomUUID()}`;
    await CreditService.reserve(user.id, 30, "ats_analysis", r1);
    await CreditService.reserve(user.id, 30, "ats_analysis", r2);
    expect(await ledgerOf(user.id)).toMatchObject({ balance: 20, reserved: 60 });

    const outcomes = await Promise.allSettled([
      CreditService.commitReservation(user.id, r1, { reason: "c1" }),
      CreditService.commitReservation(user.id, r2, { reason: "c2" }),
    ]);
    expect(outcomes.map(statusOf)).toEqual([200, 200]);

    const [a1, a2] = await Promise.all([allocationsOf(g1.id), allocationsOf(g2.id)]);
    expect(a1).toBeLessThanOrEqual(40);
    expect(a2).toBeLessThanOrEqual(40);
    expect(a1 + a2).toBe(60);
    const grants = await prisma.creditGrant.findMany({ where: { userId: user.id } });
    for (const row of grants) {
      const allocated = await allocationsOf(row.id);
      expect(row.remaining).toBe(row.amount - allocated);
    }
    const ledger = await expectInvariant(user.id);
    expect(ledger).toMatchObject({ balance: 20, reserved: 0, unexpired: 20 });
  });

  it("(d) a grant expiring under a pending reservation never drives the balance negative, and the commit lands on it", async () => {
    const user = await createUserWithSession();
    const g = await grant(user.id, 100, new Date(Date.now() + HOUR));
    const requestId = `req:${randomUUID()}`;
    const reservation = await CreditService.reserve(user.id, 30, "ats_analysis", requestId);
    // Expires after the reservation was taken and before anything else runs.
    await prisma.creditGrant.update({
      where: { id: g.id },
      data: { expiresAt: new Date(reservation.createdAt.getTime() + 1) },
    });

    // The sweep must defer the expiry while the reservation is pending: the reservation's 30
    // credits were carved out of this grant, and the commit filter deliberately still admits a
    // grant that was valid when the reservation was created.
    await sweepExpiredCredits();
    let ledger = await ledgerOf(user.id);
    expect(ledger.balance).toBeGreaterThanOrEqual(0);
    expect(ledger).toMatchObject({ balance: 70, reserved: 30 });

    // A new reservation must not be approved against the expired grant (V-010).
    await expect(
      CreditService.reserve(user.id, 10, "ats_analysis", `req:${randomUUID()}`),
    ).rejects.toMatchObject({ statusCode: 402 });

    // The pending one commits: it was reserved while the grant was valid, and the credits are
    // consistent with the invariant once the deferred expiry sweeps the remainder.
    await expect(
      CreditService.commitReservation(user.id, requestId, { reason: "d" }),
    ).resolves.toMatchObject({ amount: -30 });
    expect(await allocationsOf(g.id)).toBe(30);

    await sweepExpiredCredits();
    ledger = await expectInvariant(user.id);
    expect(ledger).toMatchObject({ balance: 0, reserved: 0, unexpired: 0 });
    const expiry = await prisma.creditTransaction.findFirst({
      where: { userId: user.id, type: "EXPIRATION" },
    });
    expect(expiry?.amount).toBe(-70);
  });

  it("(d2) a stale PENDING reservation plus an expired grant cannot make expireCredits go negative", async () => {
    const user = await createUserWithSession();
    const g = await grant(user.id, 100, new Date(Date.now() + HOUR));
    const requestId = `req:${randomUUID()}`;
    const reservation = await CreditService.reserve(user.id, 30, "ats_analysis", requestId);
    await prisma.creditReservation.update({
      where: { id: reservation.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await prisma.creditGrant.update({
      where: { id: g.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    // Old code: the stale reservation is not counted (expiresAt <= now), the grant's 100 is
    // debited from a balance of 70, and the wallet reads -30.
    await CreditService.expireCredits(user.id);
    let ledger = await ledgerOf(user.id);
    expect(ledger.balance).toBeGreaterThanOrEqual(0);
    expect(ledger.reserved).toBeGreaterThanOrEqual(0);

    // Once the stale reservation is released the expiry can proceed and the books close at zero.
    await CreditService.releaseExpiredReservations(user.id);
    await CreditService.expireCredits(user.id);
    ledger = await expectInvariant(user.id);
    expect(ledger).toMatchObject({ balance: 0, reserved: 0, unexpired: 0 });
  });

  it("(e) consume refuses to eat credits that back pending reservations and records the actor", async () => {
    const user = await createUserWithSession();
    await grant(user.id, 100);
    const requestId = `req:${randomUUID()}`;
    await CreditService.reserve(user.id, 30, "ats_analysis", requestId);

    await expect(
      CreditService.consume(user.id, 80, {
        requestId: `adj:${randomUUID()}`,
        action: "admin_adjustment",
        actorId: "admin_1",
      }),
    ).rejects.toMatchObject({ statusCode: 402 });
    expect(await ledgerOf(user.id)).toMatchObject({ balance: 70, reserved: 30, unexpired: 100 });

    const debit = await CreditService.consume(user.id, 70, {
      requestId: `adj:${randomUUID()}`,
      action: "admin_adjustment",
      actorId: "admin_1",
      metadata: { note: "manual" },
    });
    expect(debit.amount).toBe(-70);
    expect(debit.metadata).toMatchObject({ actorId: "admin_1", note: "manual" });
    expect(await ledgerOf(user.id)).toMatchObject({ balance: 0, reserved: 30, unexpired: 30 });

    await expect(
      CreditService.commitReservation(user.id, requestId, { reason: "e" }),
    ).resolves.toMatchObject({ amount: -30 });
    const ledger = await expectInvariant(user.id);
    expect(ledger).toMatchObject({ balance: 0, reserved: 0, unexpired: 0 });
  });

  it("(e2) consume cannot take credits a pending reservation will commit against an expired grant", async () => {
    const user = await createUserWithSession();
    const g1 = await grant(user.id, 100, new Date(Date.now() + HOUR));
    const g2 = await grant(user.id, 50);
    const requestId = `req:${randomUUID()}`;
    const reservation = await CreditService.reserve(user.id, 30, "ats_analysis", requestId);
    await prisma.creditGrant.update({
      where: { id: g1.id },
      data: { expiresAt: new Date(reservation.createdAt.getTime() + 1) },
    });
    expect(await ledgerOf(user.id)).toMatchObject({ balance: 120, reserved: 30, unexpired: 50 });

    // Old code: balance 120 >= 50, so the debit went through and ate G2, the only unexpired
    // grant — while the pending reservation's commit still relied on it. Now the limit is
    // Σunexpired 50 − reserved 30 = 20.
    await expect(
      CreditService.consume(user.id, 50, { requestId: `adj:${randomUUID()}`, action: "x" }),
    ).rejects.toMatchObject({ statusCode: 402 });
    expect(await ledgerOf(user.id)).toMatchObject({ balance: 120, reserved: 30, unexpired: 50 });
    expect(await allocationsOf(g2.id)).toBe(0);

    await expect(
      CreditService.commitReservation(user.id, requestId, { reason: "e2" }),
    ).resolves.toMatchObject({ amount: -30 });
    expect(await allocationsOf(g1.id)).toBe(30);

    await sweepExpiredCredits();
    const ledger = await expectInvariant(user.id);
    expect(ledger).toMatchObject({ balance: 50, reserved: 0, unexpired: 50 });
  });

  it("(f) two simultaneous reserves with one requestId yield one reservation and one 409", async () => {
    const user = await createUserWithSession();
    await grant(user.id, 100);
    const requestId = `req:${randomUUID()}`;

    const outcomes = await Promise.allSettled([
      CreditService.reserve(user.id, 10, "ats_analysis", requestId),
      CreditService.reserve(user.id, 10, "ats_analysis", requestId),
    ]);
    expect(outcomes.map(statusOf).sort()).toEqual([200, 409]);

    expect(await prisma.creditReservation.count({ where: { requestId: `ai:${requestId}` } })).toBe(
      1,
    );
    const ledger = await expectInvariant(user.id);
    expect(ledger).toMatchObject({ balance: 90, reserved: 10, unexpired: 100 });
  });

  it("(g) release and the expired-reservation sweep stay conditional on PENDING", async () => {
    const user = await createUserWithSession();
    await grant(user.id, 50);
    const requestId = `req:${randomUUID()}`;
    await CreditService.reserve(user.id, 20, "ats_analysis", requestId);

    await expect(CreditService.releaseReservation(user.id, requestId)).resolves.toBe(true);
    await expect(CreditService.releaseReservation(user.id, requestId)).resolves.toBe(false);
    expect(await CreditService.releaseExpiredReservations(user.id)).toBe(0);

    const ledger = await expectInvariant(user.id);
    expect(ledger).toMatchObject({ balance: 50, reserved: 0, unexpired: 50 });
  });

  /**
   * V-406: a reservation's commit racing its release, or the expired-reservation sweep, settles
   * one way only. Either the charge stands (COMMITTED, 20 spent) or the hold is handed back
   * (RELEASED or EXPIRED, nothing spent); never both, never neither, and the ledger balances.
   */
  it.each(["release", "sweep"] as const)(
    "(h) a commit racing the %s settles the reservation exactly once",
    async (rival) => {
      for (let round = 0; round < 6; round += 1) {
        const user = await createUserWithSession();
        await grant(user.id, 50);
        const requestId = `req:${randomUUID()}`;
        await CreditService.reserve(user.id, 20, "ats_analysis", requestId);

        const [commit, other] = await Promise.allSettled([
          CreditService.commitReservation(user.id, requestId, { reason: "race" }),
          rival === "release"
            ? CreditService.releaseReservation(user.id, requestId)
            : // The sweep runs as if the hold had already run out.
              CreditService.releaseExpiredReservations(user.id, new Date(Date.now() + 2 * HOUR)),
        ]);

        const reservation = await prisma.creditReservation.findFirstOrThrow({
          where: { userId: user.id },
        });
        const ledger = await expectInvariant(user.id);
        expect(other.status).toBe("fulfilled");
        const handedBack =
          rival === "release"
            ? (other as PromiseFulfilledResult<boolean>).value === true
            : (other as PromiseFulfilledResult<number>).value === 20;

        if (commit.status === "fulfilled") {
          expect(reservation.status).toBe("COMMITTED");
          expect(handedBack).toBe(false);
          expect(ledger).toMatchObject({ balance: 30, reserved: 0 });
        } else {
          expect(commit.reason).toBeInstanceOf(ApiError);
          expect(reservation.status).toBe(rival === "release" ? "RELEASED" : "EXPIRED");
          expect(handedBack).toBe(true);
          expect(ledger).toMatchObject({ balance: 50, reserved: 0 });
        }
      }
    },
  );

  // The race above is usually won by the commit; this pins the other order, where the hold was
  // handed back first and the late commit must charge nothing.
  it.each(["release", "sweep"] as const)(
    "(h2) a commit that arrives after the %s is refused and charges nothing",
    async (rival) => {
      const user = await createUserWithSession();
      await grant(user.id, 50);
      const requestId = `req:${randomUUID()}`;
      await CreditService.reserve(user.id, 20, "ats_analysis", requestId);

      if (rival === "release")
        await expect(CreditService.releaseReservation(user.id, requestId)).resolves.toBe(true);
      else
        await expect(
          CreditService.releaseExpiredReservations(user.id, new Date(Date.now() + 2 * HOUR)),
        ).resolves.toBe(20);

      await expect(
        CreditService.commitReservation(user.id, requestId, { reason: "late" }),
      ).rejects.toMatchObject({ statusCode: 409 });
      expect(await expectInvariant(user.id)).toMatchObject({ balance: 50, reserved: 0 });
    },
  );
});
