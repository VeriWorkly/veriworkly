import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { app } from "#app";
import { prisma } from "#lib/prisma";
import { invalidateAffiliate } from "#services/affiliate/cache";
import { AffiliateService } from "#services/affiliate/index";
import { deleteUserCascade } from "#services/userService";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";
import { deliver, refundEvent } from "./helpers/billing.js";

/** Phase 11 group 1, P5: V-321 (claw-back netted on withdrawals), V-322 (tier), V-323 (referral). */

const BASE = "/api/v1/affiliates";
const ADMIN_BASE = "/api/v1/admin/affiliates";

let adminPromise: Promise<TestUser> | undefined;
const adminUser = () =>
  (adminPromise ??= createUserWithSession({ email: "admin@example.test", emailVerified: true }));

const wallet = (userId: string) =>
  prisma.affiliateWallet.findUniqueOrThrow({
    where: { userId },
    select: { availableCents: true, clawbackCents: true, paidCents: true },
  });

const asUser = (user: TestUser) => ({
  get: (url: string) =>
    request(app).get(url).set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie),
  post: (url: string) =>
    request(app).post(url).set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie),
  patch: (url: string) =>
    request(app).patch(url).set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie),
});

/** An enrolled affiliate whose session came from a routable address (see affiliate-money). */
async function enrolledAffiliate(sessionIp = "203.0.113.7") {
  const user = await createUserWithSession();
  await prisma.session.updateMany({ where: { userId: user.id }, data: { ipAddress: sessionIp } });
  const response = await asUser(user).post(`${BASE}/enroll`).send({});
  expect(response.status).toBe(200);
  return { user, code: response.body.data.affiliateCode as string };
}

describe("V-323: applying a referral code answers without the referral row", () => {
  it("returns { applied: true }, never the affiliate's id or the shared-address flag", async () => {
    const { user: affiliate, code } = await enrolledAffiliate("127.0.0.1");
    const referred = await createUserWithSession();

    const response = await asUser(referred).post(`${BASE}/referral`).send({ code });

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body.data).toEqual({ applied: true });
    const body = JSON.stringify(response.body);
    expect(body).not.toContain(affiliate.id);
    expect(body).not.toContain("sharedAddressWithAffiliate");
    expect(body).not.toContain("ipHash");
    // The referral itself is recorded as before.
    expect(
      await prisma.affiliateReferral.count({
        where: { affiliateId: affiliate.id, referredUserId: referred.id },
      }),
    ).toBe(1);
  });
});

/** A commission that was released and paid out in an earlier withdrawal. */
async function paidCommission(affiliateId: string, amountCents: number) {
  return prisma.affiliateCommission.create({
    data: {
      affiliateId,
      providerPaymentId: `pay_${randomUUID()}`,
      amountCents,
      rateBps: 200,
      status: "PAID",
      availableAt: new Date(),
      paidAt: new Date(),
    },
  });
}

async function setWallet(userId: string, data: { availableCents: number; clawbackCents?: number }) {
  await prisma.affiliateWallet.update({ where: { userId }, data });
  await invalidateAffiliate(userId);
}

describe("V-321: money owed back can never be withdrawn", () => {
  // Regression for the reversal side (group 7, available first): passes on master too.
  it("the audit scenario end to end: $40 available, a paid $10 commission refunded, $40 is refused and $30 goes through", async () => {
    const { user } = await enrolledAffiliate();
    await setWallet(user.id, { availableCents: 4_000 });
    const commission = await paidCommission(user.id, 1_000);

    await deliver(refundEvent(commission.providerPaymentId!, { amount: 50_000 }));

    expect(await wallet(user.id)).toMatchObject({ availableCents: 3_000, clawbackCents: 0 });
    const all = await asUser(user).post(`${BASE}/withdrawals`).send({ amountCents: 4_000 });
    expect(all.status, JSON.stringify(all.body)).toBe(400);
    const rest = await asUser(user).post(`${BASE}/withdrawals`).send({ amountCents: 3_000 });
    expect(rest.status, JSON.stringify(rest.body)).toBe(200);
  });

  it("a request nets an outstanding claw-back against the available balance", async () => {
    const { user } = await enrolledAffiliate();
    // A claw-back owed beside a positive balance: what the PAID reversal before group 7 left on
    // wallets (it booked the whole amount as claw-back without touching the balance). Every credit
    // since repays a claw-back first, so such wallets only exist from then; this netting is what
    // stops them withdrawing the debt. Fails with the netting in requestWithdrawal reverted.
    await setWallet(user.id, { availableCents: 4_000, clawbackCents: 1_000 });

    const all = await asUser(user).post(`${BASE}/withdrawals`).send({ amountCents: 4_000 });
    expect(all.status, JSON.stringify(all.body)).toBe(400);
    expect((await wallet(user.id)).availableCents).toBe(4_000);

    const me = await asUser(user).get(`${BASE}/me`);
    expect(me.body.data.withdrawableCents).toBe(3_000);

    const net = await asUser(user).post(`${BASE}/withdrawals`).send({ amountCents: 3_000 });
    expect(net.status, JSON.stringify(net.body)).toBe(200);
    expect((await wallet(user.id)).availableCents).toBe(1_000);
  });

  it("a paid commission refunded while a withdrawal holds the balance: approve and paid are refused, reject repays the debt", async () => {
    const admin = await adminUser();
    const { user } = await enrolledAffiliate();
    await setWallet(user.id, { availableCents: 4_000 });
    const requested = await asUser(user).post(`${BASE}/withdrawals`).send({ amountCents: 4_000 });
    expect(requested.status).toBe(200);
    const withdrawalId = requested.body.data.id as string;

    // The balance is reserved, so the whole refund is owed back.
    const commission = await paidCommission(user.id, 1_000);
    await deliver(refundEvent(commission.providerPaymentId!, { amount: 50_000 }));
    expect(await wallet(user.id)).toMatchObject({ availableCents: 0, clawbackCents: 1_000 });

    const approve = await asUser(admin)
      .patch(`${ADMIN_BASE}/withdrawals/${withdrawalId}`)
      .send({ status: "APPROVED", reason: "Reviewed by finance" });
    expect(approve.status, JSON.stringify(approve.body)).toBe(409);
    expect(approve.body.details?.code).toBe("AFFILIATE_CLAWBACK_OUTSTANDING");

    const reject = await asUser(admin).patch(`${ADMIN_BASE}/withdrawals/${withdrawalId}`).send({
      status: "REJECTED",
      payoutNote: "claw-back outstanding",
      reason: "Reviewed by finance",
    });
    expect(reject.status, JSON.stringify(reject.body)).toBe(200);
    expect(await wallet(user.id)).toMatchObject({ availableCents: 3_000, clawbackCents: 0 });
  });

  it("an approved withdrawal can still be marked PAID once a claw-back is owed, and the claw-back stays owed", async () => {
    const admin = await adminUser();
    const { user } = await enrolledAffiliate();
    await setWallet(user.id, { availableCents: 4_000 });
    const requested = await asUser(user).post(`${BASE}/withdrawals`).send({ amountCents: 4_000 });
    const withdrawalId = requested.body.data.id as string;
    const approve = await asUser(admin)
      .patch(`${ADMIN_BASE}/withdrawals/${withdrawalId}`)
      .send({ status: "APPROVED", reason: "Reviewed by finance" });
    expect(approve.status).toBe(200);

    // Refunded after the admin approved (and wired the money by hand).
    const commission = await paidCommission(user.id, 1_000);
    await deliver(refundEvent(commission.providerPaymentId!, { amount: 50_000 }));

    const paid = await asUser(admin)
      .patch(`${ADMIN_BASE}/withdrawals/${withdrawalId}`)
      .send({ status: "PAID", payoutNote: "wire sent", reason: "Reviewed by finance" });
    expect(paid.status, JSON.stringify(paid.body)).toBe(200);
    expect(await wallet(user.id)).toMatchObject({
      availableCents: 0,
      paidCents: 4_000,
      clawbackCents: 1_000,
    });
    // Still owed: the next request is netted against it.
    await setWallet(user.id, { availableCents: 3_000 });
    const next = await asUser(user).post(`${BASE}/withdrawals`).send({ amountCents: 3_000 });
    expect(next.status, JSON.stringify(next.body)).toBe(400);
  });

  it("a request already netted against the claw-back can be approved and paid", async () => {
    const admin = await adminUser();
    const { user } = await enrolledAffiliate();
    // What the pre-group-7 PAID reversal left on a wallet: the balance and a claw-back side by side.
    await setWallet(user.id, { availableCents: 4_000, clawbackCents: 1_000 });

    const requested = await asUser(user).post(`${BASE}/withdrawals`).send({ amountCents: 3_000 });
    expect(requested.status, JSON.stringify(requested.body)).toBe(200);
    const withdrawalId = requested.body.data.id as string;

    const approve = await asUser(admin)
      .patch(`${ADMIN_BASE}/withdrawals/${withdrawalId}`)
      .send({ status: "APPROVED", reason: "Reviewed by finance" });
    expect(approve.status, JSON.stringify(approve.body)).toBe(200);
    const paid = await asUser(admin)
      .patch(`${ADMIN_BASE}/withdrawals/${withdrawalId}`)
      .send({ status: "PAID", payoutNote: "wire sent", reason: "Reviewed by finance" });
    expect(paid.status, JSON.stringify(paid.body)).toBe(200);
    expect(await wallet(user.id)).toMatchObject({ availableCents: 1_000, clawbackCents: 1_000 });
  });
});

describe("V-322: a tier is earned by released commissions, not refundable pending ones", () => {
  async function pendingConversion(code: string) {
    const referred = await createUserWithSession();
    const applied = await asUser(referred).post(`${BASE}/referral`).send({ code });
    expect(applied.status).toBe(200);
    return AffiliateService.createCommission({
      referredUserId: referred.id,
      providerPaymentId: `pay_${randomUUID()}`,
      purchaseAmountCents: 10_000,
      status: "PENDING",
      reason: "Dodo payment succeeded",
    });
  }

  const tierOf = async (userId: string) =>
    (await prisma.user.findUniqueOrThrow({ where: { id: userId } })).affiliateTier;

  it("ten pending purchases that are all refunded never promote", async () => {
    const { user, code } = await enrolledAffiliate();
    const commissions = [];
    for (let i = 0; i < 10; i += 1) commissions.push(await pendingConversion(code));

    expect(await tierOf(user.id)).toBe("TIER_1");
    const me = await asUser(user).get(`${BASE}/me`);
    expect(me.body.data.tierProgress.currentConversions).toBe(0);

    for (const commission of commissions)
      await deliver(refundEvent(commission.providerPaymentId!, { amount: 10_000 }));
    expect(await tierOf(user.id)).toBe("TIER_1");

    // V-405: TIER_1 above holds whether or not refunds count, since none was released. The
    // refunds landed (every commission reversed), and one real conversion released now is the
    // first: had the refunded ten counted, it would be the eleventh and promote.
    const statuses = await prisma.affiliateCommission.findMany({
      where: { id: { in: commissions.map((commission) => commission.id) } },
      select: { status: true },
    });
    expect(statuses.map((row) => row.status)).toEqual(Array(10).fill("REVERSED"));
    const real = await pendingConversion(code);
    await AffiliateService.updateCommission(real.id, "AVAILABLE");
    expect(await tierOf(user.id)).toBe("TIER_1");
    const after = await asUser(user).get(`${BASE}/me`);
    expect(after.body.data.tierProgress.currentConversions).toBe(1);
  });

  it("releasing the tenth commission is what promotes", async () => {
    const { user, code } = await enrolledAffiliate();
    const commissions = [];
    for (let i = 0; i < 10; i += 1) commissions.push(await pendingConversion(code));

    for (const commission of commissions.slice(0, 9))
      await AffiliateService.updateCommission(commission.id, "AVAILABLE");
    expect(await tierOf(user.id)).toBe("TIER_1");

    await AffiliateService.updateCommission(commissions[9].id, "AVAILABLE");
    expect(await tierOf(user.id)).toBe("TIER_2");
  });
});

describe("lock order: releasing commissions while the affiliate deletes their account", () => {
  it("never deadlocks: every release either lands before the deletion or finds the account gone", async () => {
    for (let round = 0; round < 8; round += 1) {
      const { user, code } = await enrolledAffiliate();
      const commissions = [];
      for (let i = 0; i < 3; i += 1) {
        const referred = await createUserWithSession();
        await asUser(referred).post(`${BASE}/referral`).send({ code });
        commissions.push(
          await AffiliateService.createCommission({
            referredUserId: referred.id,
            providerPaymentId: `pay_${randomUUID()}`,
            purchaseAmountCents: 10_000,
            status: "PENDING",
          }),
        );
      }

      const results = await Promise.allSettled([
        ...commissions.map((commission) =>
          AffiliateService.updateCommission(commission.id, "AVAILABLE"),
        ),
        prisma.$transaction((tx) => deleteUserCascade(tx, user.id), { timeout: 20_000 }),
        ...commissions.map((commission) =>
          AffiliateService.updateCommission(commission.id, "REVERSED", "test"),
        ),
      ]);

      const deadlocks = results.filter(
        (result) => result.status === "rejected" && /deadlock/i.test(String(result.reason)),
      );
      expect(deadlocks.map((result) => String((result as PromiseRejectedResult).reason))).toEqual(
        [],
      );

      // V-400: no deadlock is not enough. The deletion committed, and every release or reversal
      // either landed or was refused with a 409: the account was gone, or the release and the
      // reversal of the same commission raced and the other one moved it first. Never another error.
      const deletion = results[commissions.length];
      expect(deletion.status).toBe("fulfilled");
      const others = results.filter((_, index) => index !== commissions.length);
      for (const result of others)
        if (result.status === "rejected") {
          expect(result.reason).toMatchObject({ statusCode: 409 });
          expect([
            "This commission belongs to a deleted account and cannot change.",
            "Only pending commissions can be released.",
            "Only pending, available or paid commissions can be reversed.",
          ]).toContain((result.reason as Error).message);
        }
      expect(await prisma.user.count({ where: { id: user.id } })).toBe(0);
      expect(await prisma.affiliateWallet.count({ where: { userId: user.id } })).toBe(0);
      // The commissions are billing records: kept and detached, never left pointing at the user.
      const rows = await prisma.affiliateCommission.findMany({
        where: { id: { in: commissions.map((commission) => commission.id) } },
      });
      expect(rows).toHaveLength(commissions.length);
      expect(rows.every((row) => row.affiliateId === null)).toBe(true);
    }
  });
});

describe("lock order: a credit grant or AI reservation while the account is deleted", () => {
  const isDeadlock = (result: PromiseSettledResult<unknown>) =>
    result.status === "rejected" && /deadlock|40P01/i.test(String(result.reason));

  /**
   * Locks the wallet, says so through `onLocked`, waits, then writes a row whose foreign key
   * points at the user. The caller starts the deletion only once the lock is held, so the order
   * the test is about is the order that runs (V-400 review).
   */
  async function walletThenUserRow(
    userId: string,
    kind: "grant" | "reservation",
    sourceId: string,
    onLocked: () => void,
  ) {
    return prisma.$transaction(
      async (tx) => {
        const [wallet] = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT "id" FROM "CreditWallet" WHERE "userId" = ${userId} FOR UPDATE`;
        onLocked();
        await new Promise((resolve) => setTimeout(resolve, 400));
        if (kind === "grant")
          await tx.creditGrant.create({
            data: {
              walletId: wallet.id,
              userId,
              amount: 10,
              remaining: 10,
              source: "admin_adjustment",
              sourceId,
            },
          });
        else
          await tx.creditReservation.create({
            data: {
              walletId: wallet.id,
              userId,
              requestId: randomUUID(),
              action: "test",
              cost: 1,
              expiresAt: new Date(Date.now() + 60_000),
            },
          });
      },
      { timeout: 20_000 },
    );
  }

  it.each(["grant", "reservation"] as const)(
    "a %s that locked the wallet first finishes, and the deletion follows it",
    async (kind) => {
      const user = await createUserWithSession();
      await prisma.creditWallet.create({ data: { userId: user.id } });

      const sourceId = randomUUID();
      let locked!: () => void;
      const holdsLock = new Promise<void>((resolve) => (locked = resolve));
      const writer = walletThenUserRow(user.id, kind, sourceId, locked);
      await holdsLock;
      const deletion = prisma.$transaction((tx) => deleteUserCascade(tx, user.id), {
        timeout: 20_000,
      });
      const results = await Promise.allSettled([writer, deletion]);

      expect(
        results
          .filter(isDeadlock)
          .map((result) => String((result as PromiseRejectedResult).reason)),
      ).toEqual([]);
      expect(await prisma.user.count({ where: { id: user.id } })).toBe(0);
      // V-400: no deadlock is not enough. The writer that held the wallet first finished before
      // the deletion, rather than failing with some other error the filter above ignores; a
      // grant is a billing record and survives detached.
      expect(results.map((result) => result.status)).toEqual(["fulfilled", "fulfilled"]);
      if (kind === "grant")
        expect(
          await prisma.creditGrant.count({
            where: { source: "admin_adjustment", sourceId, userId: null },
          }),
        ).toBe(1);
    },
  );
});
