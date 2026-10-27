import { beforeAll, describe, expect, it } from "vitest";

import { Prisma } from "@prisma/client";

import { prisma } from "#lib/prisma";
import { RETENTION_CANDIDATES } from "#jobs/retentionJob";

/**
 * V-250: the redact and purge rules picked their rows with "not done yet" predicates no index
 * could see, so every nightly run walked every webhook event ever redacted and every document
 * ever purged, a cost that only grows. Each rule now reads a partial index holding only the rows
 * it still has to do; its query must repeat the index predicate for Postgres to use it.
 *
 * The plans are checked against data shaped like the case the indexes exist for (a long history
 * of rows already done, a short backlog still to do) and statistics gathered from that data. On
 * empty tables the planner falls back to whatever statistics an earlier run left in
 * `pg_statistic` (TRUNCATE keeps them, and ANALYZE of an empty table does not replace them), so
 * on a reused database the chosen plan depended on what ran before.
 */

const cutoff = new Date("2026-01-01T00:00:00Z");
const DONE = 300;
const TO_DO = 3;
const PURGED = `'{"purged":true}'::jsonb`;

async function seedHistoryAndBacklog() {
  const deletedAt = "TIMESTAMP '2025-06-01 00:00:00'";
  const statements = [
    `INSERT INTO "User" ("id", "email", "updatedAt")
       SELECT 'u' || g, 'u' || g || '@retention.test', now() FROM generate_series(1, ${DONE}) g`,
    // Every user: one live document and one deleted document already purged.
    `INSERT INTO "Document" ("id", "userId", "slug", "title", "content", "updatedAt")
       SELECT 'l' || g, 'u' || g, 'live-' || g, 'Live', '{"a":1}', now()
       FROM generate_series(1, ${DONE}) g`,
    `INSERT INTO "Document" ("id", "userId", "slug", "title", "content", "updatedAt", "deletedAt")
       SELECT 'p' || g, 'u' || g, 'p' || g, '', ${PURGED}, now(), ${deletedAt}
       FROM generate_series(1, ${DONE}) g`,
    // The backlog: deleted documents still holding their content.
    `INSERT INTO "Document" ("id", "userId", "slug", "title", "content", "updatedAt", "deletedAt")
       SELECT 't' || g, 'u' || g, 'todo-' || g, 'To do', '{"a":1}', now(), ${deletedAt}
       FROM generate_series(1, ${TO_DO}) g`,
    // Shares and publications of purged documents: most already purged, a few still to do.
    `INSERT INTO "ShareLink" ("id", "userId", "documentId", "slug", "snapshot", "updatedAt")
       SELECT 's' || g, 'u' || g, 'p' || g,
              CASE WHEN g <= ${TO_DO} THEN 'share-' || g ELSE 's' || g END,
              CASE WHEN g <= ${TO_DO} THEN '{"a":1}'::jsonb ELSE ${PURGED} END, now()
       FROM generate_series(1, ${DONE}) g`,
    `INSERT INTO "PortfolioPublication" ("id", "userId", "documentId", "subdomain", "templateId", "snapshot", "updatedAt")
       SELECT 'pp' || g, 'u' || g, 'p' || g, 'sub-' || g, 'signal',
              CASE WHEN g <= ${TO_DO} THEN '{"a":1}'::jsonb ELSE ${PURGED} END, now()
       FROM generate_series(1, ${DONE}) g`,
    // Audit entries about purged documents: titles already removed, except the backlog's.
    `INSERT INTO "AdminAuditEntry" ("id", "action", "targetType", "targetId", "metadata")
       SELECT 'a' || g, 'document.delete', 'Document', 'p' || g,
              CASE WHEN g <= ${TO_DO} THEN '{"title":"T"}'::jsonb ELSE '{"reason":"x"}'::jsonb END
       FROM generate_series(1, ${DONE}) g`,
    `INSERT INTO "BillingWebhookEvent" ("id", "providerEventId", "type", "payload", "status", "createdAt", "updatedAt")
       SELECT 'b' || g, 'evt-' || g, 'payment.succeeded',
              CASE WHEN g <= ${TO_DO} THEN '{"type":"payment.succeeded","data":{}}'::jsonb
                   ELSE '{"type":"payment.succeeded","redacted":true}'::jsonb END,
              'PROCESSED', ${deletedAt}, now()
       FROM generate_series(1, ${DONE}) g`,
    `ANALYZE "User", "Document", "ShareLink", "PortfolioPublication", "AdminAuditEntry", "BillingWebhookEvent"`,
  ];

  for (const statement of statements) await prisma.$executeRawUnsafe(statement);
}

async function planWithoutSeqScan(query: Prisma.Sql): Promise<string> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL enable_seqscan = off");
    const rows = await tx.$queryRaw<Array<{ "QUERY PLAN": string }>>(Prisma.sql`EXPLAIN ${query}`);
    return rows.map((row) => row["QUERY PLAN"]).join("\n");
  });
}

describe("retention rules read partial indexes of the rows still to do (V-250)", () => {
  beforeAll(seedHistoryAndBacklog);

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

  it("each rule finds exactly the backlog", async () => {
    for (const rule of Object.keys(RETENTION_CANDIDATES) as Array<
      keyof typeof RETENTION_CANDIDATES
    >) {
      const rows = await prisma.$queryRaw<Array<{ id: string }>>(
        RETENTION_CANDIDATES[rule](cutoff, 100),
      );
      expect(rows, rule).toHaveLength(TO_DO);
    }
  });
});
