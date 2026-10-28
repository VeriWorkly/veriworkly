import { randomUUID } from "node:crypto";

import request from "supertest";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { app } from "#app";
import { prisma } from "#lib/prisma";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";

const { mailMock } = vi.hoisted(() => ({
  mailMock: {
    sendPurchaseConfirmationEmail: vi.fn().mockResolvedValue(undefined),
    sendPaymentFailedEmail: vi.fn().mockResolvedValue(undefined),
    sendSubscriptionCancelledEmail: vi.fn().mockResolvedValue(undefined),
    sendPortfolioUpdatedEmail: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("#services/mail/billingMail", () => mailMock);
vi.mock("#services/mail/portfolioMail", () => mailMock);

/**
 * V-074 / V-073 / V-126: the admin actions that move money, access or privileges. Each one must
 * commit its audit entry with the mutation (or not at all), the configured admin account cannot
 * be locked out of the panel, and a credit adjustment replays on its idempotency key.
 */

const ADMIN = "/api/v1/admin";

/** The configured admin (env.ts sets ADMIN_EMAIL); one account shared by every test in the file. */
let actor: TestUser;
beforeAll(async () => {
  actor = await createUserWithSession({ email: "admin@example.test" });
});

function asAdmin(method: "post" | "patch" | "delete", url: string) {
  return request(app)[method](url).set("Origin", STUDIO_ORIGIN).set("Cookie", actor.cookie);
}

/**
 * Makes every `AdminAuditEntry` insert fail at the database, the way a Postgres hiccup or an
 * index surprise would. `NOT VALID` skips the existing rows and still checks new ones.
 */
async function withAuditBlocked<T>(run: () => Promise<T>): Promise<T> {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "AdminAuditEntry" ADD CONSTRAINT "audit_blocked_for_test" CHECK (false) NOT VALID`,
  );
  try {
    return await run();
  } finally {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "AdminAuditEntry" DROP CONSTRAINT "audit_blocked_for_test"`,
    );
  }
}

async function auditCount(action: string, targetId: string) {
  return prisma.adminAuditEntry.count({ where: { action, targetId } });
}

async function seedAffiliate() {
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
      amountCents: 500,
      rateBps: 2_000,
      status: "PENDING",
    },
  });
  const withdrawal = await prisma.affiliateWithdrawal.create({
    data: { userId: affiliate.id, amountCents: 1_000, status: "APPROVED" },
  });
  await prisma.affiliateWallet.create({
    data: { userId: affiliate.id, pendingCents: 500, availableCents: 0, paidCents: 0 },
  });
  return { affiliate, commission, withdrawal };
}

async function seedPublication(userId: string) {
  const suffix = randomUUID().slice(0, 8);
  const document = await prisma.document.create({
    data: { userId, type: "PORTFOLIO", title: "Portfolio", slug: `p-${suffix}`, content: {} },
  });
  return prisma.portfolioPublication.create({
    data: {
      userId,
      documentId: document.id,
      subdomain: `pub-${suffix}`,
      templateId: "nimbus",
      snapshot: {},
      status: "LIVE",
    },
  });
}

describe("V-074 money and privilege admin actions commit with their audit entry", () => {
  it("credit adjustment: the grant rolls back when the audit cannot be written, and a replay audits once", async () => {
    const user = await createUserWithSession();
    const key = `adj-${randomUUID()}`;

    const blocked = await withAuditBlocked(async () =>
      asAdmin("post", `${ADMIN}/billing/credits`)
        .set("Idempotency-Key", key)
        .send({ userId: user.id, amount: 40, reason: "Support goodwill credit" }),
    );
    expect(blocked.status).toBeGreaterThanOrEqual(500);
    expect(await prisma.creditTransaction.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.creditWallet.findUnique({ where: { userId: user.id } })).toBeNull();

    const first = await asAdmin("post", `${ADMIN}/billing/credits`)
      .set("Idempotency-Key", key)
      .send({ userId: user.id, amount: 40, reason: "Support goodwill credit" });
    expect(first.status).toBe(200);
    const replay = await asAdmin("post", `${ADMIN}/billing/credits`)
      .set("Idempotency-Key", key)
      .send({ userId: user.id, amount: 40, reason: "Support goodwill credit" });
    expect(replay.status).toBe(200);
    expect(replay.body.data.id).toBe(first.body.data.id);

    expect(
      (await prisma.creditWallet.findUniqueOrThrow({ where: { userId: user.id } })).balance,
    ).toBe(40);
    const audits = await prisma.adminAuditEntry.findMany({
      where: { action: "billing.credit.adjust", targetId: user.id },
    });
    expect(audits).toHaveLength(1);
    expect(audits[0]!.metadata).toMatchObject({ amount: 40, transactionId: first.body.data.id });
  });

  it("credit adjustment accepts the key as a body field too", async () => {
    const user = await createUserWithSession();
    const idempotencyKey = `adj-${randomUUID()}`;

    for (let i = 0; i < 2; i += 1) {
      const response = await asAdmin("post", `${ADMIN}/billing/credits`).send({
        userId: user.id,
        amount: 25,
        reason: "Support goodwill credit",
        idempotencyKey,
      });
      expect(response.status).toBe(200);
    }

    expect(
      (await prisma.creditWallet.findUniqueOrThrow({ where: { userId: user.id } })).balance,
    ).toBe(25);
  });

  describe("credit adjustment without a client key (V-126)", () => {
    const BUCKET_MS = 10_000;
    const send = (userId: string) =>
      asAdmin("post", `${ADMIN}/billing/credits`).send({
        userId,
        amount: 30,
        reason: "Support goodwill credit",
      });
    const balance = async (userId: string) =>
      (await prisma.creditWallet.findUniqueOrThrow({ where: { userId } })).balance;

    /** Pins the clock to `offset` ms into the current 10-second bucket. */
    function pinClock(offset: number) {
      const start = Math.floor(Date.now() / BUCKET_MS) * BUCKET_MS;
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(start + offset);
      return start;
    }

    afterEach(() => {
      vi.useRealTimers();
    });

    it("an accidental double submit grants once and the second call replays the first", async () => {
      const user = await createUserWithSession();
      pinClock(2_000);

      const first = await send(user.id);
      const second = await send(user.id);

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(second.body.data.id).toBe(first.body.data.id);
      expect(await balance(user.id)).toBe(30);
      expect(await auditCount("billing.credit.adjust", user.id)).toBe(1);
    });

    it("still dedupes a double submit that straddles a bucket boundary", async () => {
      const user = await createUserWithSession();
      const start = pinClock(9_500);

      const first = await send(user.id);
      vi.setSystemTime(start + 10_500);
      const second = await send(user.id);

      expect(second.body.data.id).toBe(first.body.data.id);
      expect(await balance(user.id)).toBe(30);
    });

    it("the same adjustment 15 seconds later is a second, deliberate grant", async () => {
      const user = await createUserWithSession();
      // Two buckets on: the previous-bucket check makes the dedupe window 10 to 20 seconds wide.
      const start = pinClock(6_000);

      const first = await send(user.id);
      vi.setSystemTime(start + 21_000);
      const second = await send(user.id);

      expect(second.status).toBe(200);
      expect(second.body.data.id).not.toBe(first.body.data.id);
      expect(await balance(user.id)).toBe(60);
    });
  });

  it("withdrawal PAID rolls back without its audit entry", async () => {
    const { affiliate, withdrawal } = await seedAffiliate();

    const blocked = await withAuditBlocked(async () =>
      asAdmin("patch", `${ADMIN}/affiliates/withdrawals/${withdrawal.id}`).send({
        status: "PAID",
        payoutNote: "wire sent",
        reason: "Wire confirmed by finance",
      }),
    );
    expect(blocked.status).toBeGreaterThanOrEqual(500);

    const stored = await prisma.affiliateWithdrawal.findUniqueOrThrow({
      where: { id: withdrawal.id },
    });
    expect(stored.status).toBe("APPROVED");
    const wallet = await prisma.affiliateWallet.findUniqueOrThrow({
      where: { userId: affiliate.id },
    });
    expect(wallet.paidCents).toBe(0);

    const paid = await asAdmin("patch", `${ADMIN}/affiliates/withdrawals/${withdrawal.id}`).send({
      status: "PAID",
      payoutNote: "wire sent",
      reason: "Wire confirmed by finance",
    });
    expect(paid.status).toBe(200);
    expect(await auditCount("affiliate.withdrawal.update", withdrawal.id)).toBe(1);
    // V-409: the retry paid the money once: the withdrawal is PAID and the wallet records the
    // 10.00 as paid exactly once, nothing more and nothing left behind.
    const settled = await prisma.affiliateWithdrawal.findUniqueOrThrow({
      where: { id: withdrawal.id },
    });
    expect(settled.status).toBe("PAID");
    const after = await prisma.affiliateWallet.findUniqueOrThrow({
      where: { userId: affiliate.id },
    });
    expect(after).toMatchObject({ paidCents: 1_000, pendingCents: 500, availableCents: 0 });
  });

  it("commission release rolls back without its audit entry", async () => {
    const { affiliate, commission } = await seedAffiliate();

    const blocked = await withAuditBlocked(async () =>
      asAdmin("patch", `${ADMIN}/affiliates/commissions/${commission.id}`).send({
        status: "AVAILABLE",
        reason: "Matured",
      }),
    );
    expect(blocked.status).toBeGreaterThanOrEqual(500);

    const stored = await prisma.affiliateCommission.findUniqueOrThrow({
      where: { id: commission.id },
    });
    expect(stored.status).toBe("PENDING");
    const wallet = await prisma.affiliateWallet.findUniqueOrThrow({
      where: { userId: affiliate.id },
    });
    expect(wallet).toMatchObject({ pendingCents: 500, availableCents: 0 });
  });

  it("manual commission creation rolls back without its audit entry", async () => {
    const { affiliate } = await seedAffiliate();
    const referred = await createUserWithSession();
    await prisma.affiliateReferral.create({
      data: { affiliateId: affiliate.id, referredUserId: referred.id, code: "code" },
    });

    const blocked = await withAuditBlocked(async () =>
      asAdmin("post", `${ADMIN}/affiliates/commissions`).send({
        referredUserId: referred.id,
        providerPaymentId: `pay_${randomUUID()}`,
        purchaseAmountCents: 10_000,
        status: "AVAILABLE",
        reason: "Out-of-band invoice",
      }),
    );
    expect(blocked.status).toBeGreaterThanOrEqual(500);

    expect(
      await prisma.affiliateCommission.count({
        where: { referral: { referredUserId: referred.id } },
      }),
    ).toBe(0);
    const wallet = await prisma.affiliateWallet.findUniqueOrThrow({
      where: { userId: affiliate.id },
    });
    expect(wallet.availableCents).toBe(0);
  });

  it("affiliate tier change rolls back without its audit entry", async () => {
    const { affiliate } = await seedAffiliate();

    const blocked = await withAuditBlocked(async () =>
      asAdmin("patch", `${ADMIN}/affiliates/${affiliate.id}`).send({
        tier: "TIER_3",
        reason: "Top performer",
      }),
    );
    expect(blocked.status).toBeGreaterThanOrEqual(500);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: affiliate.id } })).affiliateTier,
    ).toBe("TIER_1");
  });

  it("subscription edit rolls back without its audit entry", async () => {
    const user = await createUserWithSession();
    const subscription = await prisma.subscription.create({
      data: { userId: user.id, provider: "dodo", status: "ACTIVE", productKey: "portfolio_pro" },
    });

    const blocked = await withAuditBlocked(async () =>
      asAdmin("patch", `${ADMIN}/billing/subscriptions/${subscription.id}`).send({
        status: "CANCELED",
        reason: "Chargeback received",
      }),
    );
    expect(blocked.status).toBeGreaterThanOrEqual(500);
    expect(
      (await prisma.subscription.findUniqueOrThrow({ where: { id: subscription.id } })).status,
    ).toBe("ACTIVE");
  });

  it("entitlement grant and revoke roll back without their audit entries", async () => {
    const user = await createUserWithSession();

    const blockedGrant = await withAuditBlocked(async () =>
      asAdmin("post", `${ADMIN}/billing/entitlements`).send({
        userId: user.id,
        key: "ai_credits",
        reason: "Beta tester",
      }),
    );
    expect(blockedGrant.status).toBeGreaterThanOrEqual(500);
    expect(await prisma.entitlementGrant.count({ where: { userId: user.id } })).toBe(0);

    const granted = await asAdmin("post", `${ADMIN}/billing/entitlements`).send({
      userId: user.id,
      key: "ai_credits",
      reason: "Beta tester",
    });
    expect(granted.status).toBe(200);
    const grantId = granted.body.data.id as string;

    const blockedRevoke = await withAuditBlocked(async () =>
      asAdmin("delete", `${ADMIN}/billing/entitlements/${grantId}`).send({
        reason: "Beta over",
      }),
    );
    expect(blockedRevoke.status).toBeGreaterThanOrEqual(500);
    expect(
      (await prisma.entitlementGrant.findUniqueOrThrow({ where: { id: grantId } })).revokedAt,
    ).toBeNull();
  });

  it("role change rolls back without its audit entry", async () => {
    const user = await createUserWithSession();

    const blocked = await withAuditBlocked(async () =>
      asAdmin("patch", `${ADMIN}/users/${user.id}`).send({
        role: "ADMIN",
        reason: "Promotion",
      }),
    );
    expect(blocked.status).toBeGreaterThanOrEqual(500);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).role).toBe("USER");
  });

  it("user deletion rolls back without its audit entry, and is audited exactly once when it works", async () => {
    const user = await createUserWithSession();

    const blocked = await withAuditBlocked(async () =>
      asAdmin("delete", `${ADMIN}/users/${user.id}`).send({
        confirmEmail: user.email,
        reason: "Account takeover",
      }),
    );
    expect(blocked.status).toBeGreaterThanOrEqual(500);
    expect(await prisma.user.findUnique({ where: { id: user.id } })).not.toBeNull();
    expect(await auditCount("user.delete", user.id)).toBe(0);

    const deleted = await asAdmin("delete", `${ADMIN}/users/${user.id}`).send({
      confirmEmail: user.email,
      reason: "Account takeover",
    });
    expect(deleted.status).toBe(200);
    expect(await prisma.user.findUnique({ where: { id: user.id } })).toBeNull();
    expect(await auditCount("user.delete", user.id)).toBe(1);
  });

  it("portfolio moderation rolls back without its audit entry", async () => {
    const user = await createUserWithSession();
    const publication = await seedPublication(user.id);

    const blocked = await withAuditBlocked(async () =>
      asAdmin("patch", `${ADMIN}/portfolios/${publication.id}`).send({
        status: "SUSPENDED",
        reason: "Impersonates a public figure",
      }),
    );
    expect(blocked.status).toBeGreaterThanOrEqual(500);
    expect(
      (await prisma.portfolioPublication.findUniqueOrThrow({ where: { id: publication.id } }))
        .status,
    ).toBe("LIVE");

    const blockedTakedown = await withAuditBlocked(async () =>
      asAdmin("delete", `${ADMIN}/portfolios/${publication.id}`).send({
        reason: "Impersonates a public figure",
        confirm: publication.subdomain,
      }),
    );
    expect(blockedTakedown.status).toBeGreaterThanOrEqual(500);
    expect(await prisma.portfolioPublication.count({ where: { id: publication.id } })).toBe(1);
  });
});

describe("V-073 the configured admin account cannot be locked out", () => {
  it("refuses emailVerified:false and a role change, allows a name change", async () => {
    const unverify = await asAdmin("patch", `${ADMIN}/users/${actor.id}`).send({
      emailVerified: false,
      reason: "Testing the guard",
    });
    expect(unverify.status).toBe(403);

    // The guard is about a change: the row starts as USER (nothing promotes it), so demotion
    // needs an ADMIN role to demote from.
    await prisma.user.update({ where: { id: actor.id }, data: { role: "ADMIN" } });
    const demote = await asAdmin("patch", `${ADMIN}/users/${actor.id}`).send({
      role: "USER",
      reason: "Testing the guard",
    });
    expect(demote.status).toBe(403);

    const stored = await prisma.user.findUniqueOrThrow({ where: { id: actor.id } });
    expect(stored.emailVerified).toBe(true);
    expect(stored.role).toBe("ADMIN");

    const rename = await asAdmin("patch", `${ADMIN}/users/${actor.id}`).send({
      name: "Operator",
      reason: "Testing the guard",
    });
    expect(rename.status).toBe(200);

    // Still an admin afterwards.
    const list = await request(app)
      .get(`${ADMIN}/users?limit=1`)
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", actor.cookie);
    expect(list.status).toBe(200);
  });

  it("still lets emailVerified be set to true on the admin account", async () => {
    const verify = await asAdmin("patch", `${ADMIN}/users/${actor.id}`).send({
      emailVerified: true,
      reason: "No-op",
    });
    expect(verify.status).toBe(200);
  });
});
