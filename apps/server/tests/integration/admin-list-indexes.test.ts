import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { prisma } from "#lib/prisma";

/**
 * V-070 / V-105 / V-111: the admin lists' default sorts, their ILIKE searches (which also feed the
 * page's count) and the overview's global counts each have an index Postgres can use.
 */

/** The plan Postgres picks when sequential scans are priced out: only indexes can save it. */
async function planWithoutSeqScan(query: Prisma.Sql): Promise<string> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL enable_seqscan = off");
    const rows = await tx.$queryRaw<Array<{ "QUERY PLAN": string }>>(Prisma.sql`EXPLAIN ${query}`);
    return rows.map((row) => row["QUERY PLAN"]).join("\n");
  });
}

describe("admin list indexes (V-070, V-105, V-111)", () => {
  it.each([
    [
      "the document list's default sort",
      Prisma.sql`SELECT id FROM "Document" ORDER BY "updatedAt" DESC LIMIT 20`,
      "Document_updatedAt_idx",
    ],
    [
      "the document title search",
      Prisma.sql`SELECT count(*) FROM "Document" WHERE title ILIKE '%resume%'`,
      "Document_title_trgm_idx",
    ],
    [
      "the share list's newest sort",
      Prisma.sql`SELECT id FROM "ShareLink" ORDER BY "createdAt" DESC LIMIT 20`,
      "ShareLink_createdAt_idx",
    ],
    [
      "the share list's views sort",
      Prisma.sql`SELECT id FROM "ShareLink" ORDER BY "viewCount" DESC LIMIT 20`,
      "ShareLink_viewCount_idx",
    ],
    [
      "the users-by-role filter",
      Prisma.sql`SELECT count(*) FROM "User" WHERE role = 'ADMIN'`,
      "User_role_idx",
    ],
    [
      "the active entitlement count",
      Prisma.sql`SELECT count(*) FROM "EntitlementGrant"
        WHERE "revokedAt" IS NULL AND "startsAt" <= now() AND ("endsAt" IS NULL OR "endsAt" > now())`,
      "EntitlementGrant_revokedAt_endsAt_startsAt_idx",
    ],
  ])("%s uses an index", async (_label, query, index) => {
    expect(await planWithoutSeqScan(query)).toContain(index);
  });

  // On an empty table the planner reads the (userId, slug) unique index in full instead, so these
  // two are checked by name; the plan switches to them once the tables have rows.
  it("has trigram indexes for the document and share slug searches", async () => {
    const rows = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname FROM pg_indexes
      WHERE indexname IN ('Document_slug_trgm_idx', 'ShareLink_slug_trgm_idx')`;
    expect(rows.map((row) => row.indexname).sort()).toEqual([
      "Document_slug_trgm_idx",
      "ShareLink_slug_trgm_idx",
    ]);
  });
});
