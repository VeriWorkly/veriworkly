import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { Prisma } from "@prisma/client";

import { app } from "#app";
import { prisma } from "#lib/prisma";
import { auditEntriesAboutUserSql, billingEventsOfUserSql } from "#services/deletedAccount";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession } from "./helpers/auth.js";

/**
 * V-237: the deletion transaction looked a user's webhook events and admin audit entries up by
 * values inside JSON (and by `targetId` behind a subquery inside an OR), which no index could
 * serve, under Prisma's default 5-second interactive transaction timeout. As those tables grow,
 * deletion would start failing after the sessions and keys were already revoked. Each lookup is
 * now index-backed, and the transaction has a timeout sized for the work.
 */

/** The plan Postgres picks when sequential scans are priced out: only indexes can save it. */
async function planWithoutSeqScan(query: Prisma.Sql): Promise<string> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL enable_seqscan = off");
    const rows = await tx.$queryRaw<Array<{ "QUERY PLAN": string }>>(Prisma.sql`EXPLAIN ${query}`);
    return rows.map((row) => row["QUERY PLAN"]).join("\n");
  });
}

describe("account deletion lookups use indexes (V-237)", () => {
  it("finds a user's webhook events by column, metadata user id and subscription id through indexes", async () => {
    const plan = await planWithoutSeqScan(billingEventsOfUserSql("user-1", ["sub_1", "sub_2"]));

    expect(plan).not.toMatch(/Seq Scan on "BillingWebhookEvent"/);
    expect(plan).toContain("BillingWebhookEvent_payload_user_idx");
    expect(plan).toContain("BillingWebhookEvent_payload_subscription_idx");
  });

  it("finds the admin audit entries about a user through indexes", async () => {
    const plan = await planWithoutSeqScan(
      Prisma.sql`SELECT "id" FROM "AdminAuditEntry" WHERE ${auditEntriesAboutUserSql("user-1")}`,
    );

    expect(plan).not.toMatch(/Seq Scan on "AdminAuditEntry"/);
    expect(plan).toContain("AdminAuditEntry_targetId_idx");
    expect(plan).toContain("AdminAuditEntry_metadata_userId_idx");
    expect(plan).toContain("AdminAuditEntry_metadata_ownerId_idx");
  });

  it("runs the deletion transaction with a timeout sized for the work, not Prisma's 5 s", async () => {
    const user = await createUserWithSession({ email: "leaving@example.test" });
    const transaction = vi.spyOn(prisma, "$transaction");

    const res = await request(app)
      .delete("/api/v1/users/me")
      .set("Origin", STUDIO_ORIGIN)
      .set("Cookie", user.cookie);

    expect(res.status).toBe(200);
    const deletion = transaction.mock.calls.find(([body]) => typeof body === "function");
    expect(deletion?.[1]).toMatchObject({ timeout: expect.any(Number) });
    expect((deletion?.[1] as { timeout: number }).timeout).toBeGreaterThanOrEqual(30_000);
    expect(await prisma.user.findUnique({ where: { id: user.id } })).toBeNull();
  });
});
