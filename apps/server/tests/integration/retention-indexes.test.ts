import { describe, expect, it } from "vitest";

import { Prisma } from "@prisma/client";

import { prisma } from "#lib/prisma";
import { RETENTION_CANDIDATES } from "#jobs/retentionJob";

/**
 * V-250: the redact and purge rules picked their rows with "not done yet" predicates no index
 * could see, so every nightly run walked every webhook event ever redacted and every document
 * ever purged, a cost that only grows. Each rule now reads a partial index holding only the rows
 * it still has to do; its query must repeat the index predicate for Postgres to use it.
 */

const cutoff = new Date("2026-01-01T00:00:00Z");

async function planWithoutSeqScan(query: Prisma.Sql): Promise<string> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL enable_seqscan = off");
    const rows = await tx.$queryRaw<Array<{ "QUERY PLAN": string }>>(Prisma.sql`EXPLAIN ${query}`);
    return rows.map((row) => row["QUERY PLAN"]).join("\n");
  });
}

describe("retention rules read partial indexes of the rows still to do (V-250)", () => {
  it.each([
    ["webhookPayloadsRedacted", "BillingWebhookEvent_unredacted_idx"],
    ["deletedDocumentsPurged", "Document_unpurged_deleted_idx"],
    ["deletedShareSnapshotsPurged", "ShareLink_unpurged_idx"],
    ["deletedPublicationSnapshotsPurged", "PortfolioPublication_unpurged_idx"],
    ["deletedDocumentAuditTitlesPurged", "AdminAuditEntry_titled_idx"],
  ] as const)("%s uses %s", async (rule, index) => {
    const plan = await planWithoutSeqScan(RETENTION_CANDIDATES[rule](cutoff, 100));

    expect(plan).toContain(index);
    expect(plan).not.toMatch(/Seq Scan/);
  });
});
