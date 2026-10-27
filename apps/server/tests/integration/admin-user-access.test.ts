import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { app } from "#app";
import { prisma } from "#lib/prisma";
import { CREDIT_SOURCES } from "#services/creditSources";
import { CreditService } from "#services/creditService";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";
import { adminClient } from "./helpers/admin.js";

/**
 * V-266: the admin user list and detail carry the customer's own billing access summary, so a
 * pass holder or a pack buyer is never read as free. V-271: the admin counts say what they mean
 * (an expired API key is not active, a document in the trash is not one the user has).
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const asAdmin = adminClient().request;

function asUser(user: TestUser, path: string) {
  return request(app).get(`/api/v1${path}`).set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie);
}

async function grantCredits(userId: string, amount: number, source: string) {
  const id = randomUUID();
  await CreditService.grant(userId, amount, {
    requestId: `grant:${id}`,
    source,
    sourceId: id,
    expiresAt: new Date(Date.now() + 30 * DAY_MS),
  });
}

async function grantPass(userId: string) {
  const sourceId = `pay_${randomUUID()}`;
  const endsAt = new Date(Date.now() + 7 * DAY_MS);
  for (const key of ["ai_credits", "portfolio_publish"])
    await prisma.entitlementGrant.create({
      data: {
        userId,
        key,
        source: "SYSTEM",
        sourceId,
        endsAt,
        metadata: { productKey: "bundle", interval: "seven_day", pass: true },
      },
    });
  return endsAt;
}

type AccessSummary = {
  tier: string;
  isPaid: boolean;
  isPaying: boolean;
  paymentIssue: boolean;
  passEndsAt: string | null;
  creditBalance: number;
  paidCredits: number;
  creditSources: Record<string, number>;
};

describe("V-266 the admin user list and detail carry the billing access summary", () => {
  it("shows a pass holder, a pack buyer and a goodwill-only user as the billing summary does", async () => {
    const passHolder = await createUserWithSession({ name: "V266 pass" });
    const passEndsAt = await grantPass(passHolder.id);
    const packBuyer = await createUserWithSession({ name: "V266 pack" });
    await grantCredits(packBuyer.id, 500, CREDIT_SOURCES.creditPack);
    await grantCredits(packBuyer.id, 20, CREDIT_SOURCES.adminAdjustment);
    const goodwill = await createUserWithSession({ name: "V266 goodwill" });
    await grantCredits(goodwill.id, 50, CREDIT_SOURCES.adminAdjustment);

    const list = await asAdmin("get", "/admin/users?query=V266&limit=50");
    expect(list.status).toBe(200);
    const byId = new Map(
      (list.body.data.items as Array<{ id: string; access: AccessSummary }>).map((item) => [
        item.id,
        item.access,
      ]),
    );

    expect(byId.get(passHolder.id)).toMatchObject({
      tier: "pass",
      isPaid: true,
      isPaying: true,
      passEndsAt: passEndsAt.toISOString(),
    });
    expect(byId.get(packBuyer.id)).toMatchObject({
      tier: "credits",
      isPaid: false,
      isPaying: true,
      creditBalance: 520,
      paidCredits: 500,
      creditSources: { credit_pack: 500, admin_adjustment: 20 },
    });
    expect(byId.get(goodwill.id)).toMatchObject({
      tier: "free",
      isPaying: false,
      creditBalance: 50,
      paidCredits: 0,
      creditSources: { admin_adjustment: 50 },
    });

    for (const user of [passHolder, packBuyer, goodwill]) {
      const detail = await asAdmin("get", `/admin/users/${user.id}`);
      expect(detail.status).toBe(200);
      const own = await asUser(user, "/billing/me");
      expect(own.status).toBe(200);
      // One rule: the admin sees exactly what the customer's own billing summary says.
      expect(detail.body.data.access).toMatchObject(own.body.data.access);
      expect(byId.get(user.id)).toMatchObject(own.body.data.access);
    }
  });

  it("shows a subscriber in dunning as paying with a payment issue", async () => {
    const user = await createUserWithSession({ name: "V266 dunning" });
    await prisma.subscription.create({
      data: {
        userId: user.id,
        provider: "dodo",
        providerSubId: `sub_${randomUUID()}`,
        productKey: "portfolio_pro",
        status: "PAST_DUE",
        rawStatus: "on_hold",
        graceEndsAt: new Date(Date.now() + 3 * DAY_MS),
      },
    });

    const detail = await asAdmin("get", `/admin/users/${user.id}`);
    expect(detail.body.data.access).toMatchObject({
      tier: "portfolio_pro",
      isPaying: true,
      paymentIssue: true,
    });
  });
});

describe("V-271 admin counts", () => {
  it("counts enabled unexpired API keys as active and only live documents", async () => {
    await prisma.apiKey.deleteMany();
    const user = await createUserWithSession({ name: "V271 counts" });
    const key = (data: object) =>
      prisma.apiKey.create({
        data: {
          userId: user.id,
          name: "k",
          keyHash: randomUUID(),
          keyPrefix: "vw_",
          keySuffix: "abcd",
          ...data,
        },
      });
    await key({});
    await key({ expiresAt: new Date(Date.now() + DAY_MS) });
    await key({ expiresAt: new Date(Date.now() - DAY_MS) });
    await key({ isActive: false });
    await key({ revokedAt: new Date(), isActive: false });
    for (const deletedAt of [null, null, new Date()])
      await prisma.document.create({
        data: { userId: user.id, slug: `d-${randomUUID()}`, content: {}, deletedAt },
      });

    const overview = await asAdmin("get", "/admin/overview?days=7");
    expect(overview.body.data.apiKeys).toMatchObject({ total: 5, active: 2, expired: 1 });

    const list = await asAdmin("get", "/admin/users?query=V271");
    expect(list.body.data.items[0]._count.resumes).toBe(2);
    const detail = await asAdmin("get", `/admin/users/${user.id}`);
    expect(detail.body.data.user._count.resumes).toBe(2);
  });
});
