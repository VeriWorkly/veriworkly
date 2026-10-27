import request from "supertest";
import { describe, expect, it } from "vitest";

/**
 * V-249 (admin document delete and restore commit with their audit entry, and a delete is
 * conditional) and V-261 (the commission chart adds up one currency, as the affiliate summary
 * does). Real Postgres and Redis.
 */

import { app } from "#app";
import { prisma } from "#lib/prisma";
import { getRedis } from "#lib/redis";
import { getAdminTimeSeries } from "#services/admin/adminTimeSeriesService";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";

let adminPromise: Promise<TestUser> | null = null;
function admin() {
  return (adminPromise ??= createUserWithSession({ email: "admin@example.test" }));
}

function asAdmin(req: request.Test, moderator: TestUser) {
  return req.set("Origin", STUDIO_ORIGIN).set("Cookie", moderator.cookie);
}

async function resume(userId: string) {
  return prisma.document.create({
    data: { userId, type: "RESUME", title: "Resume", slug: `r-${Date.now()}`, content: {} },
  });
}

describe("V-249 admin document delete and restore", () => {
  it("two racing deletes: one succeeds, the other is a 409, and exactly one audit entry exists", async () => {
    const moderator = await admin();
    const owner = await createUserWithSession();
    const document = await resume(owner.id);

    const remove = () =>
      asAdmin(request(app).delete(`/api/v1/admin/documents/${document.id}`), moderator).send({
        reason: "Reported spam",
      });
    const results = await Promise.all([remove(), remove()]);

    expect(results.map((response) => response.status).sort()).toEqual([200, 409]);
    const entries = await prisma.adminAuditEntry.findMany({
      where: { targetId: document.id, action: "document.delete" },
    });
    expect(entries).toHaveLength(1);
    expect(entries[0].reason).toBe("Reported spam");
  });

  it("a restore writes its audit entry with the change, and a second restore is a 409 with no entry", async () => {
    const moderator = await admin();
    const owner = await createUserWithSession();
    const document = await resume(owner.id);
    await prisma.document.update({ where: { id: document.id }, data: { deletedAt: new Date() } });

    const restore = () =>
      asAdmin(request(app).post(`/api/v1/admin/documents/${document.id}/restore`), moderator).send({
        reason: "Appeal accepted",
      });

    expect((await restore()).status).toBe(200);
    expect((await restore()).status).toBe(409);

    const entries = await prisma.adminAuditEntry.findMany({
      where: { targetId: document.id, action: "document.restore" },
    });
    expect(entries).toHaveLength(1);
    expect(entries[0].metadata).toMatchObject({ ownerId: owner.id });
  });
});

describe("V-261 the commission chart sums the wallet currency only", () => {
  it("leaves an INR commission out of the daily cents, as the summary does", async () => {
    await getRedis().flushDb();
    const affiliate = await createUserWithSession();
    await prisma.affiliateCommission.createMany({
      data: [
        { affiliateId: affiliate.id, amountCents: 500, currency: "USD", rateBps: 2000 },
        { affiliateId: affiliate.id, amountCents: 40_000, currency: "INR", rateBps: 2000 },
      ],
    });

    const series = await getAdminTimeSeries(7);
    const total = series.series.commissionCents.reduce((sum, value) => sum + value, 0);
    expect(total).toBe(500);
  });
});
