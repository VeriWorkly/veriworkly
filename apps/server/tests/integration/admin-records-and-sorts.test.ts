import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { app } from "#app";
import { prisma } from "#lib/prisma";
import { BillingService } from "#services/billingService";

import { STUDIO_ORIGIN } from "./env.js";
import { adminClient } from "./helpers/admin.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";
import { packPayment } from "./helpers/billing.js";

/**
 * Phase 11 admin gaps (P2): the overview's pending-commission count matches the nav badge
 * (V-290), privilege and money actions are never done without their audit entry (V-291, V-292),
 * a revoked key cannot be "re-enabled" (V-293), a second suspension keeps the first's date
 * (V-294), a partial roadmap edit keeps an admin-chosen quarter (V-295), and "most recent" sorts
 * put the empty rows last (V-296).
 */

vi.mock("#services/mail/billingMail", () => ({
  sendPurchaseConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendPaymentFailedEmail: vi.fn().mockResolvedValue(undefined),
  sendSubscriptionCancelledEmail: vi.fn().mockResolvedValue(undefined),
  sendPlanChangedEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("#services/mail/portfolioMail", () => ({
  sendPortfolioUpdatedEmail: vi.fn().mockResolvedValue(undefined),
  sendPortfolioFreeTierEmail: vi.fn().mockResolvedValue(undefined),
}));

const admin = adminClient();

/** Makes every INSERT (or UPDATE) on `table` fail until the returned cleanup runs. */
async function refuse(table: string, operation: "INSERT" | "UPDATE" = "INSERT") {
  const name = `test_refuse_${table.toLowerCase()}_${operation.toLowerCase()}`;
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION ${name}() RETURNS trigger AS $$
    BEGIN RAISE EXCEPTION 'refused by test'; END; $$ LANGUAGE plpgsql`);
  await prisma.$executeRawUnsafe(
    `CREATE TRIGGER ${name} BEFORE ${operation} ON "${table}" FOR EACH ROW EXECUTE FUNCTION ${name}()`,
  );
  return async () => {
    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${name} ON "${table}"`);
    await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS ${name}()`);
  };
}

async function withRefused<T>(table: string, run: () => Promise<T>, operation?: "UPDATE") {
  const cleanup = await refuse(table, operation);
  try {
    return await run();
  } finally {
    await cleanup();
  }
}

async function createKey(user: TestUser) {
  const response = await request(app)
    .post("/api/v1/api-keys")
    .set("Origin", STUDIO_ORIGIN)
    .set("Cookie", user.cookie)
    .send({ name: "integration key" });
  expect(response.status, JSON.stringify(response.body)).toBe(201);
  return { id: response.body.data.id as string, key: response.body.data.key as string };
}

const whoAmI = (key: string) => request(app).get("/api/v1/users/me").set("X-API-Key", key);

describe("V-290 pending commissions", () => {
  it("the overview queue and the nav badge count the same commissions, non-USD included", async () => {
    await prisma.affiliateCommission.deleteMany();
    const affiliate = await createUserWithSession();
    const base = { affiliateId: affiliate.id, rateBps: 2_000, status: "PENDING" as const };
    await prisma.affiliateCommission.createMany({
      data: [
        { ...base, providerPaymentId: `pay_${randomUUID()}`, amountCents: 300 },
        { ...base, providerPaymentId: `pay_${randomUUID()}`, amountCents: 900, currency: "EUR" },
      ],
    });

    const overview = await admin.request("get", "/admin/overview");
    const queue = await admin.request("get", "/admin/overview/queue");
    expect(overview.status).toBe(200);
    expect(queue.status).toBe(200);
    expect(queue.body.data.pendingCommissions).toBe(2);
    expect(overview.body.data.actionQueue.pendingCommissions).toBe(2);
  });
});

describe("V-291 an admin action and its audit entry go together", () => {
  it("disabling a key is not applied when its audit entry cannot be written", async () => {
    const owner = await createUserWithSession();
    const key = await createKey(owner);

    const response = await withRefused("AdminAuditEntry", () =>
      admin
        .request("patch", `/admin/api-keys/${key.id}`)
        .send({ isActive: false, reason: "Abuse report" }),
    );
    expect(response.status).toBe(500);

    expect((await prisma.apiKey.findUniqueOrThrow({ where: { id: key.id } })).isActive).toBe(true);
    // The early revoked marker is taken back, so the key still works.
    expect((await whoAmI(key.key)).status).toBe(200);
  });

  it("revoking a key is not applied when its audit entry cannot be written", async () => {
    const owner = await createUserWithSession();
    const key = await createKey(owner);

    const response = await withRefused("AdminAuditEntry", () =>
      admin.request("delete", `/admin/api-keys/${key.id}`).send({ reason: "Abuse report" }),
    );
    expect(response.status).toBe(500);

    expect((await prisma.apiKey.findUniqueOrThrow({ where: { id: key.id } })).revokedAt).toBeNull();
    expect((await whoAmI(key.key)).status).toBe(200);
  });

  it("a revoke with the wrong confirmation leaves the key unrevoked and working", async () => {
    const owner = await createUserWithSession();
    const key = await createKey(owner);

    const response = await admin
      .request("delete", `/admin/api-keys/${key.id}`)
      .send({ reason: "Abuse report", confirm: "vw_wrong" });
    expect(response.status).toBe(400);

    expect((await prisma.apiKey.findUniqueOrThrow({ where: { id: key.id } })).revokedAt).toBeNull();
    // No revoked marker is left behind: the key still authenticates.
    expect((await whoAmI(key.key)).status).toBe(200);
  });

  it("a key disable and revoke each leave one audit entry", async () => {
    const owner = await createUserWithSession();
    const key = await createKey(owner);

    expect(
      (
        await admin
          .request("patch", `/admin/api-keys/${key.id}`)
          .send({ isActive: false, reason: "Abuse report" })
      ).status,
    ).toBe(200);
    expect(
      (await admin.request("delete", `/admin/api-keys/${key.id}`).send({ reason: "Abuse report" }))
        .status,
    ).toBe(200);

    const actions = (
      await prisma.adminAuditEntry.findMany({
        where: { targetId: key.id },
        select: { action: true },
      })
    ).map((entry) => entry.action);
    expect(actions.sort()).toEqual(["api_key.revoke", "api_key.update"]);
  });

  it("a session revoke whose audit entry cannot be written answers 500, not 200", async () => {
    const target = await createUserWithSession();

    const response = await withRefused("AdminAuditEntry", () =>
      admin
        .request("post", `/admin/users/${target.id}/revoke-sessions`)
        .send({ reason: "Account compromise" }),
    );
    expect(response.status).toBe(500);
  });

  it("a webhook replay grants nothing when its audit entry cannot be written", async () => {
    const buyer = await createUserWithSession();
    const payment = packPayment(buyer.id, 499, `pay_${randomUUID()}`);
    const event = await prisma.billingWebhookEvent.create({
      data: {
        providerEventId: `evt_${randomUUID()}`,
        type: payment.type,
        payload: payment,
        providerPaymentId: payment.data.payment_id,
        status: "FAILED",
        retryCount: 5,
        error: "database timeout",
        lastAttemptAt: new Date(Date.now() - 60 * 60_000),
      },
    });

    const refused = await withRefused("AdminAuditEntry", () =>
      admin
        .request("post", `/admin/billing/webhooks/${event.id}/replay`)
        .send({ reason: "Provider outage, replaying" }),
    );
    expect(refused.status).toBe(500);
    expect(await prisma.creditGrant.count({ where: { userId: buyer.id } })).toBe(0);
    expect(
      (await prisma.billingWebhookEvent.findUniqueOrThrow({ where: { id: event.id } })).status,
    ).toBe("FAILED");

    const replayed = await admin
      .request("post", `/admin/billing/webhooks/${event.id}/replay`)
      .send({ reason: "Provider outage, replaying" });
    expect(replayed.status, JSON.stringify(replayed.body)).toBe(200);
    const entries = await prisma.adminAuditEntry.findMany({
      where: { action: "billing.webhook.replay", targetId: event.id },
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.metadata).toMatchObject({ outcome: "applied", duplicate: false });
  });
});

describe("V-292 cancel at period end changed at the provider", () => {
  it("is audited even when the local write fails afterwards", async () => {
    const owner = await createUserWithSession();
    const subscription = await prisma.subscription.create({
      data: {
        userId: owner.id,
        provider: "dodo",
        providerSubId: `sub_${randomUUID()}`,
        productKey: "portfolio_pro",
        status: "ACTIVE",
        currentPeriodEnd: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      },
    });
    vi.spyOn(BillingService, "setProviderCancelAtPeriodEnd").mockResolvedValue({
      cancelAtPeriodEnd: true,
    } as Awaited<ReturnType<typeof BillingService.setProviderCancelAtPeriodEnd>>);

    const response = await withRefused(
      "Subscription",
      () =>
        admin
          .request("patch", `/admin/billing/subscriptions/${subscription.id}`)
          .send({ cancelAtPeriodEnd: true, reason: "Customer asked by email" }),
      "UPDATE",
    );
    expect(response.status).toBe(500);

    const entries = await prisma.adminAuditEntry.findMany({
      where: { targetId: subscription.id },
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.metadata).toMatchObject({
      providerApplied: true,
      localWriteFailed: true,
      providerCancelAtPeriodEnd: true,
    });
  });
});

describe("V-293 a revoked key stays revoked", () => {
  it("re-enabling a revoked key is 409 and changes nothing", async () => {
    const owner = await createUserWithSession();
    const key = await createKey(owner);
    expect(
      (await admin.request("delete", `/admin/api-keys/${key.id}`).send({ reason: "Leaked key" }))
        .status,
    ).toBe(200);

    const enable = await admin
      .request("patch", `/admin/api-keys/${key.id}`)
      .send({ isActive: true, reason: "Customer asked" });
    expect(enable.status).toBe(409);

    const row = await prisma.apiKey.findUniqueOrThrow({ where: { id: key.id } });
    expect(row.isActive).toBe(false);
    expect(row.revokedAt).not.toBeNull();
    expect(
      await prisma.adminAuditEntry.count({ where: { targetId: key.id, action: "api_key.update" } }),
    ).toBe(0);
  });
});

describe("V-293 a revoke that lands between the enable's read and its write", () => {
  it("is not undone: the enable is 409 and the key stays revoked", async () => {
    const owner = await createUserWithSession();
    const key = await createKey(owner);
    expect(
      (
        await admin
          .request("patch", `/admin/api-keys/${key.id}`)
          .send({ isActive: false, reason: "Abuse report" })
      ).status,
    ).toBe(200);

    const findUnique = prisma.apiKey.findUnique.bind(prisma.apiKey);
    vi.spyOn(prisma.apiKey, "findUnique").mockImplementationOnce((async (args: never) => {
      const read = await findUnique(args);
      // Revoked right after the enable read the row as merely disabled.
      await prisma.apiKey.update({
        where: { id: key.id },
        data: { isActive: false, revokedAt: new Date() },
      });
      return read;
    }) as never);

    const enable = await admin
      .request("patch", `/admin/api-keys/${key.id}`)
      .send({ isActive: true, reason: "Customer asked" });
    expect(enable.status).toBe(409);

    const row = await prisma.apiKey.findUniqueOrThrow({ where: { id: key.id } });
    expect(row.isActive).toBe(false);
    expect(row.revokedAt).not.toBeNull();
  });
});

describe("V-294 a second suspension keeps the first one's date", () => {
  it("re-suspending a moderation-locked portfolio does not re-date it", async () => {
    const owner = await createUserWithSession();
    const subdomain = `sus-${randomUUID().slice(0, 8)}`;
    const document = await prisma.document.create({
      data: {
        userId: owner.id,
        type: "PORTFOLIO",
        title: "Portfolio",
        slug: subdomain,
        templateId: "signal",
        content: {},
        visibility: "PUBLIC",
      },
    });
    const publication = await prisma.portfolioPublication.create({
      data: {
        userId: owner.id,
        documentId: document.id,
        subdomain,
        templateId: "signal",
        snapshot: {},
      },
    });

    const first = await admin
      .request("patch", `/admin/portfolios/${publication.id}`)
      .send({ status: "SUSPENDED", reason: "Impersonation report" });
    expect(first.status, JSON.stringify(first.body)).toBe(200);
    const firstRow = await prisma.portfolioPublication.findUniqueOrThrow({
      where: { id: publication.id },
    });

    const second = await admin
      .request("patch", `/admin/portfolios/${publication.id}`)
      .send({ status: "SUSPENDED", reason: "Second report, same site" });
    expect(second.status, JSON.stringify(second.body)).toBe(200);

    const row = await prisma.portfolioPublication.findUniqueOrThrow({
      where: { id: publication.id },
    });
    expect(row.suspendedAt?.toISOString()).toBe(firstRow.suspendedAt?.toISOString());
  });
});

describe("V-295 roadmap quarter", () => {
  it("a partial edit of a done item keeps the quarter an admin chose", async () => {
    const created = await admin.request("post", "/admin/roadmap").send({
      title: "Shipped thing",
      description: "Done",
      status: "done",
      completedAt: "2026-01-15T00:00:00.000Z",
      completedQuarter: "Q4 2026",
    });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    expect(created.body.data.completedQuarter).toBe("Q4 2026");

    const edited = await admin
      .request("put" as "patch", `/admin/roadmap/${created.body.data.id}`)
      .send({ title: "Shipped thing, renamed" });
    expect(edited.status, JSON.stringify(edited.body)).toBe(200);
    expect(edited.body.data.completedQuarter).toBe("Q4 2026");
  });
});

describe("V-296 sorts put empty rows last", () => {
  it("lists recently used API keys before never-used ones", async () => {
    await prisma.apiKey.deleteMany();
    const owner = await createUserWithSession();
    const unused = await createKey(owner);
    const used = await createKey(owner);
    await prisma.apiKey.update({ where: { id: used.id }, data: { lastUsed: new Date() } });

    const list = await admin.request("get", "/admin/api-keys?sort=lastUsed");
    expect(list.status).toBe(200);
    expect(list.body.data.items.map((item: { id: string }) => item.id)).toEqual([
      used.id,
      unused.id,
    ]);
  });

  it("lists top earners before affiliates without a wallet, and pages across both", async () => {
    await prisma.affiliateWallet.deleteMany();
    await prisma.user.updateMany({ data: { affiliateStatus: "NOT_ENROLLED" } });
    const enrol = async (paidCents: number | null) => {
      const user = await createUserWithSession();
      await prisma.user.update({
        where: { id: user.id },
        data: {
          affiliateStatus: "ACTIVE",
          affiliateCode: `c${randomUUID().slice(0, 8)}`,
          affiliateEnrolledAt: new Date(),
        },
      });
      if (paidCents !== null)
        await prisma.affiliateWallet.create({ data: { userId: user.id, paidCents } });
      return user.id;
    };
    const none = await enrol(null);
    const top = await enrol(5_000);
    const second = await enrol(100);

    const all = await admin.request("get", "/admin/affiliates?sort=earnings");
    expect(all.status, JSON.stringify(all.body)).toBe(200);
    expect(all.body.data.items.map((item: { id: string }) => item.id)).toEqual([top, second, none]);
    expect(all.body.data.total).toBe(3);

    const page = await admin.request("get", "/admin/affiliates?sort=earnings&limit=1&offset=2");
    expect(page.body.data.items.map((item: { id: string }) => item.id)).toEqual([none]);
    const straddle = await admin.request("get", "/admin/affiliates?sort=earnings&limit=2&offset=1");
    expect(straddle.body.data.items.map((item: { id: string }) => item.id)).toEqual([second, none]);
  });
});
