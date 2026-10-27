import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { Prisma } from "@prisma/client";

import { prisma } from "#lib/prisma";
import { userAuditHistoryIdsSql } from "#services/admin/adminAuditService";

import { createUserWithSession } from "./helpers/auth.js";
import { adminClient } from "./helpers/admin.js";

/**
 * V-268: a user's audit history includes the admin actions on the records they own. V-272: audit
 * rows say whether their target still exists, and the withdrawals and commissions lists filter by
 * the exact affiliate and return its status.
 */

const admin = adminClient();
const asAdmin = admin.request;

describe("V-268 a user's audit history includes actions on the records they own", () => {
  it("lists entries on the user, their subscription, grant, document, portfolio and API key, and nobody else's", async () => {
    const owner = await createUserWithSession();
    const other = await createUserWithSession();
    const subscription = await prisma.subscription.create({
      data: { userId: owner.id, provider: "dodo", productKey: "portfolio_pro", status: "ACTIVE" },
    });
    const grant = await prisma.entitlementGrant.create({
      data: { userId: owner.id, key: "ai_credits", source: "MANUAL", sourceId: randomUUID() },
    });
    const document = await prisma.document.create({
      data: { userId: owner.id, title: "CV", slug: `cv-${randomUUID()}`, content: {} },
    });
    const publication = await prisma.portfolioPublication.create({
      data: {
        userId: owner.id,
        documentId: document.id,
        subdomain: `v268-${randomUUID().slice(0, 8)}`,
        templateId: "signal",
        snapshot: {},
      },
    });
    const apiKey = await prisma.apiKey.create({
      data: {
        userId: owner.id,
        name: "CI",
        keyHash: randomUUID(),
        keyPrefix: "vw_",
        keySuffix: "abcd",
      },
    });
    const otherDocument = await prisma.document.create({
      data: { userId: other.id, title: "CV", slug: `cv-${randomUUID()}`, content: {} },
    });

    const targets: Array<[string, string]> = [
      ["User", owner.id],
      ["Subscription", subscription.id],
      ["EntitlementGrant", grant.id],
      ["Document", document.id],
      ["PortfolioPublication", publication.id],
      ["ApiKey", apiKey.id],
    ];
    for (const [targetType, targetId] of targets)
      await prisma.adminAuditEntry.create({
        data: { actorId: admin.id, action: "test.action", targetType, targetId },
      });
    await prisma.adminAuditEntry.create({
      data: {
        actorId: admin.id,
        action: "test.action",
        targetType: "Document",
        targetId: otherDocument.id,
      },
    });

    const detail = await asAdmin("get", `/admin/users/${owner.id}`);
    expect(detail.status).toBe(200);
    const entries = detail.body.data.auditEntries as Array<{
      targetType: string;
      targetId: string;
      actor: { id: string } | null;
    }>;
    expect(entries.map((entry) => `${entry.targetType}:${entry.targetId}`).sort()).toEqual(
      targets.map(([type, id]) => `${type}:${id}`).sort(),
    );
    expect(entries[0]!.actor?.id).toBe(admin.id);
  });
});

describe("V-268 the user history stays cheap for a user with a long money history", () => {
  it("reads only the audit entries that target the user's rows, never every ledger row they own", async () => {
    const user = await createUserWithSession();
    const many = 2_000;
    await prisma.$executeRawUnsafe(
      `INSERT INTO "BillingWebhookEvent" ("id", "providerEventId", "userId", "type", "payload", "status", "updatedAt")
         SELECT 'be' || g, 'evt-be-' || g, $1, 'payment.succeeded', '{}'::jsonb, 'PROCESSED', now()
         FROM generate_series(1, ${many}) g`,
      user.id,
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO "AffiliateCommission" ("id", "affiliateId", "providerPaymentId", "amountCents", "rateBps", "updatedAt")
         SELECT 'ac' || g, $1, 'pay-ac-' || g, 100, 2000, now() FROM generate_series(1, ${many}) g`,
      user.id,
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO "AdminAuditEntry" ("id", "action", "targetType", "targetId")
         SELECT 'ae' || g, 'billing.webhook.replay', 'BillingWebhookEvent', 'be' || g
         FROM generate_series(1, 3) g`,
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO "AdminAuditEntry" ("id", "action", "targetType", "targetId")
         SELECT 'aa' || g, 'affiliate.commission.update', 'AffiliateCommission', 'ac' || g
         FROM generate_series(1, 2) g`,
    );
    await prisma.$executeRawUnsafe(
      `ANALYZE "AdminAuditEntry", "BillingWebhookEvent", "AffiliateCommission", "CreditTransaction"`,
    );

    const ids = await prisma.$queryRaw<Array<{ id: string }>>(userAuditHistoryIdsSql(user.id, 20));
    expect(ids.map((row) => row.id).sort()).toEqual(["aa1", "aa2", "ae1", "ae2", "ae3"]);

    const plan = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL enable_seqscan = off");
      const rows = await tx.$queryRaw<Array<{ "QUERY PLAN": string }>>(
        Prisma.sql`EXPLAIN ${userAuditHistoryIdsSql(user.id, 20)}`,
      );
      return rows.map((row) => row["QUERY PLAN"]).join("\n");
    });
    // The ledger is not read at all, and the big tables are probed by primary key from the few
    // audit entries that target them, not scanned for every row the user owns.
    expect(plan).not.toContain("CreditTransaction");
    expect(plan).toContain("BillingWebhookEvent_pkey");
    expect(plan).toContain("AffiliateCommission_pkey");
    expect(plan).not.toMatch(/Seq Scan/);
  });
});

describe("V-272 audit target state and exact affiliate filters", () => {
  it("flags entries whose target is gone or in the trash", async () => {
    const owner = await createUserWithSession();
    const live = await prisma.document.create({
      data: { userId: owner.id, slug: `d-${randomUUID()}`, content: {} },
    });
    const trashed = await prisma.document.create({
      data: { userId: owner.id, slug: `d-${randomUUID()}`, content: {}, deletedAt: new Date() },
    });
    const entry = (targetType: string, targetId: string | null) =>
      prisma.adminAuditEntry.create({
        data: { actorId: admin.id, action: "v272.check", targetType, targetId },
      });
    await entry("Document", live.id);
    await entry("Document", trashed.id);
    await entry("User", "user-that-was-deleted");
    await entry("RoadmapFeature", "feature-that-was-deleted");
    await entry("Cache", "billing:");

    const list = await asAdmin("get", "/admin/audit?action=v272.check&limit=10");
    expect(list.status).toBe(200);
    const state = new Map(
      (
        list.body.data.items as Array<{
          targetId: string;
          targetExists: boolean | null;
          targetDeleted: boolean;
        }>
      ).map((item) => [item.targetId, [item.targetExists, item.targetDeleted]]),
    );
    expect(state.get(live.id)).toEqual([true, false]);
    expect(state.get(trashed.id)).toEqual([true, true]);
    expect(state.get("user-that-was-deleted")).toEqual([false, true]);
    expect(state.get("feature-that-was-deleted")).toEqual([false, true]);
    // Not a database record: nothing to link to, nothing to say.
    expect(state.get("billing:")).toEqual([null, false]);

    const history = await asAdmin("get", `/admin/documents/${trashed.id}`);
    expect(history.body.data.auditEntries[0]).toMatchObject({
      targetExists: true,
      targetDeleted: true,
    });
  });

  it("filters withdrawals and commissions by the exact affiliate, and returns the affiliate status", async () => {
    const ann = await createUserWithSession({ email: "ann@x.test" });
    const joann = await createUserWithSession({ email: "joann@x.test" });
    for (const user of [ann, joann]) {
      await prisma.user.update({
        where: { id: user.id },
        data: { affiliateStatus: user === ann ? "ACTIVE" : "SUSPENDED" },
      });
      await prisma.affiliateWithdrawal.create({ data: { userId: user.id, amountCents: 1_000 } });
      await prisma.affiliateCommission.create({
        data: {
          affiliateId: user.id,
          providerPaymentId: `pay_${randomUUID()}`,
          amountCents: 100,
          rateBps: 2_000,
        },
      });
    }

    const byQuery = await asAdmin("get", "/admin/affiliates/withdrawals?query=ann@x.test");
    expect(byQuery.body.data.items).toHaveLength(2);

    for (const param of ["affiliateId", "userId"]) {
      const exact = await asAdmin("get", `/admin/affiliates/withdrawals?${param}=${ann.id}`);
      expect(exact.status).toBe(200);
      expect(exact.body.data.items.map((item: { userId: string }) => item.userId)).toEqual([
        ann.id,
      ]);
    }

    const commissions = await asAdmin("get", `/admin/affiliates/commissions?userId=${joann.id}`);
    expect(commissions.status).toBe(200);
    expect(commissions.body.data.items).toHaveLength(1);
    expect(commissions.body.data.items[0]).toMatchObject({
      affiliateId: joann.id,
      affiliateStatus: "SUSPENDED",
    });
  });

  it("refuses an affiliateId and a userId that name different affiliates", async () => {
    for (const list of ["withdrawals", "commissions"]) {
      const conflicting = await asAdmin(
        "get",
        `/admin/affiliates/${list}?affiliateId=one&userId=other`,
      );
      expect(conflicting.status, list).toBe(400);
      const same = await asAdmin("get", `/admin/affiliates/${list}?affiliateId=one&userId=one`);
      expect(same.status, list).toBe(200);
    }
  });
});
