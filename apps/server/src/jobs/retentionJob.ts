import { Prisma } from "@prisma/client";
import cron, { type ScheduledTask } from "node-cron";

import { config } from "#config";
import { parseIntegerEnv } from "#config/parseEnv";
import { ApiError } from "#lib/errors";
import { createRunTracker, withJobLock } from "#lib/jobLock";
import { logger } from "#lib/logger";
import { isDraining } from "#lib/shutdown";
import { prisma } from "#lib/prisma";
import { VIEW_ROLLUP_DATE } from "#lib/portfolioViewRollup";
import {
  ADMIN_AUDIT_ACTIONS,
  MONEY_AUDIT_ACTION_PREFIXES,
} from "#services/admin/adminAuditService";

/**
 * Data retention (V-116, PERFORMANCE-AND-SCALING §6): one daily pass that deletes or redacts rows
 * past their window. Every rule is a setting (`RETENTION_*_DAYS`, `0` disables it) and works in
 * bounded batches: each statement touches at most `batchSize` rows picked by a `LIMIT`ed subquery
 * on an indexed column, so no statement holds locks on an unbounded set. A run stops starting new
 * batches once its time budget is spent; whatever is left is picked up by the next night's run.
 *
 * Soft-deleted documents have their content replaced by `PURGED_DOCUMENT_CONTENT` (and title, tags,
 * metadata, slug, share and publication snapshots blanked, V-206), never deleted:
 * the row is the sync tombstone (`listDocumentPage` returns `{ id, deletedAt }` to a device whose
 * cursor predates the delete, and a create with that id answers 409 instead of resurrecting it),
 * and deleting it would also cascade away its ShareLink and PortfolioPublication. There is no
 * `contentPurgedAt` column, so the marker itself is the durable "already purged" record.
 */

const CRON = "15 3 * * *";
const TIMEZONE = "UTC";
const LOCK_NAME = "retention:lock";
const DEFAULT_BATCH_SIZE = 5_000;
const DEFAULT_BUDGET_MS = 4 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type RetentionSetting =
  | "expiredSessions"
  | "expiredVerifications"
  | "webhookPayloads"
  | "unprocessedWebhookPayloads"
  | "auditLogs"
  | "adminAuditEntries"
  | "adminMoneyAuditEntries"
  | "creditReservations"
  | "creditReplays"
  | "flushBatches"
  | "affiliateClicks"
  | "portfolioViews"
  | "deletedDocuments";

export type RetentionSettings = Record<RetentionSetting, number>;

/** Reads the `RETENTION_*_DAYS` settings. Anything not a positive integer disables its rule. */
export function readRetentionSettings(env: NodeJS.ProcessEnv = process.env): RetentionSettings {
  const days = (name: string, fallback: number) => parseIntegerEnv(env[name], fallback);

  return {
    expiredSessions: days("RETENTION_EXPIRED_SESSION_DAYS", 1),
    expiredVerifications: days("RETENTION_EXPIRED_VERIFICATION_DAYS", 1),
    webhookPayloads: days("RETENTION_WEBHOOK_PAYLOAD_DAYS", 30),
    // FAILED and PROCESSING payloads (V-340): kept long enough to replay or investigate, not for good.
    unprocessedWebhookPayloads: days("RETENTION_UNPROCESSED_WEBHOOK_PAYLOAD_DAYS", 180),
    // Falls back to the older AUDIT_LOG_RETENTION_DAYS so an existing deployment keeps its window.
    auditLogs: days("RETENTION_AUDIT_LOG_DAYS", config.logging.auditRetentionDays),
    // Owner decision 11 (V-207): general admin entries a year, money actions 7 years; moderation
    // records (takedowns and their lifts) are never deleted, whatever the settings say.
    adminAuditEntries: days("RETENTION_ADMIN_AUDIT_DAYS", 365),
    adminMoneyAuditEntries: days("RETENTION_ADMIN_MONEY_AUDIT_DAYS", 7 * 365),
    // A reservation row is reserve()'s idempotency record for its requestId: deleting a COMMITTED
    // one lets a late retry reserve again, run the AI call, and then fail the commit on the
    // CreditTransaction.requestId unique. 90 days is far past any client retry.
    creditReservations: days("RETENTION_CREDIT_RESERVATION_DAYS", 90),
    // The stored AI result a retry of a paid request is answered from (V-192) is the user's
    // content: a day covers any client retry, after which a retry answers 409 as it used to.
    creditReplays: days("RETENTION_CREDIT_REPLAY_DAYS", 1),
    flushBatches: days("RETENTION_FLUSH_BATCH_DAYS", 7),
    // Owner decision (2026-10-29): 180 days for both. A click past it loses its IP and user-agent
    // hashes but keeps its row, because the affiliate dashboard and admin stats count rows.
    affiliateClicks: days("RETENTION_AFFILIATE_CLICK_DAYS", 180),
    // Daily view rows past it are folded into one lifetime row per publication and referrer host
    // (VIEW_ROLLUP_DATE), so total views, the SUM over these rows, never shrinks.
    portfolioViews: days("RETENTION_PORTFOLIO_VIEW_DAYS", 180),
    deletedDocuments: days("RETENTION_DELETED_DOCUMENT_DAYS", 30),
  };
}

/** What the purge rule writes over a soft-deleted document's content. */
export const PURGED_DOCUMENT_CONTENT = Object.freeze({ purged: true });
const PURGED_DOCUMENT_JSON = JSON.stringify(PURGED_DOCUMENT_CONTENT);

/**
 * The marker as a SQL literal rather than a bound parameter: the partial indexes the purge rules
 * read (V-250, migration 20261027150000) repeat it in their predicates, and Postgres matches an
 * index predicate against literals only.
 */
const PURGED = Prisma.raw(`'${PURGED_DOCUMENT_JSON}'::jsonb`);

/** A soft-deleted document still holding anything the purge removes. */
const NOT_YET_PURGED = Prisma.sql`("content" <> ${PURGED} OR "title" <> '' OR "tags" <> '{}'
  OR "metadata" IS NOT NULL OR "slug" <> "id")`;

type CandidateQuery = (cutoff: Date, limit: number) => Prisma.Sql;

/**
 * The ids each redact or purge rule still has to do (V-250). Each condition repeats the predicate
 * of the partial index named beside it, which holds only rows not yet done, so a nightly run costs
 * the backlog rather than all of history. tests/integration/retention-indexes.test.ts checks the
 * plans use them.
 */
export const RETENTION_CANDIDATES = {
  // "BillingWebhookEvent_unredacted_idx". A redacted payload is `{ redacted, type }`; FAILED (and
  // PROCESSING) rows keep their payload for the longer window of `unprocessedWebhookPayloads`.
  webhookPayloadsRedacted: (cutoff, limit) => Prisma.sql`
    SELECT "id" FROM "BillingWebhookEvent"
    WHERE "status" = 'PROCESSED' AND ("payload" - 'type') <> '{"redacted": true}'::jsonb
      AND "createdAt" < ${cutoff}
    LIMIT ${limit}`,
  // "Document_unpurged_deleted_idx"
  deletedDocumentsPurged: (cutoff, limit) => Prisma.sql`
    SELECT "id" FROM "Document"
    WHERE "deletedAt" < ${cutoff} AND ${NOT_YET_PURGED}
    LIMIT ${limit}`,
  // "ShareLink_unpurged_idx": shares still holding a snapshot or a title-made slug.
  deletedShareSnapshotsPurged: (cutoff, limit) => Prisma.sql`
    SELECT s."id" FROM "ShareLink" s JOIN "Document" d ON d."id" = s."documentId"
    WHERE (s."snapshot" <> ${PURGED} OR s."slug" <> s."id")
      AND d."deletedAt" < ${cutoff} AND d."content" = ${PURGED}
    LIMIT ${limit}`,
  // "PortfolioPublication_unpurged_idx"
  deletedPublicationSnapshotsPurged: (cutoff, limit) => Prisma.sql`
    SELECT p."id" FROM "PortfolioPublication" p JOIN "Document" d ON d."id" = p."documentId"
    WHERE p."snapshot" <> ${PURGED}
      AND d."deletedAt" < ${cutoff} AND d."content" = ${PURGED}
    LIMIT ${limit}`,
  // "AdminAuditEntry_titled_idx": entries still naming a document by title or slug.
  deletedDocumentAuditTitlesPurged: (cutoff, limit) => Prisma.sql`
    SELECT a."id" FROM "AdminAuditEntry" a
    JOIN "Document" d ON d."id" = COALESCE(
      a."metadata"->>'documentId',
      CASE WHEN a."targetType" = 'Document' THEN a."targetId" END)
    WHERE jsonb_typeof(a."metadata") = 'object' AND a."metadata" ?| ARRAY['title', 'slug']
      AND d."deletedAt" < ${cutoff} AND d."content" = ${PURGED}
    LIMIT ${limit}`,
  // "AffiliateClick_identified_idx": clicks still holding an IP or user-agent hash.
  affiliateClicksAnonymized: (cutoff, limit) => Prisma.sql`
    SELECT "id" FROM "AffiliateClick"
    WHERE ("ipHash" IS NOT NULL OR "userAgentHash" IS NOT NULL) AND "createdAt" < ${cutoff}
    LIMIT ${limit}`,
} satisfies Record<string, CandidateQuery>;

/**
 * Throws 410 for a document the purge rule has already emptied, so a restore cannot bring back a
 * shell. Only the marker counts, never the current window: a document that was simply empty
 * restores, and changing `RETENTION_DELETED_DOCUMENT_DAYS` later cannot make a purged one
 * restorable.
 */
export function assertDocumentNotPurged(document: { content: unknown }): void {
  const { content } = document;

  if (typeof content !== "object" || content === null || Array.isArray(content)) return;
  if (JSON.stringify(content) !== PURGED_DOCUMENT_JSON) return;

  throw new ApiError(
    410,
    "This document was deleted and its content has since been permanently removed.",
  );
}

/** `LIKE` patterns for an action prefix: `_` and `%` in the prefix are literal. */
const likePrefix = (prefix: string) => `${prefix.replace(/[\\_%]/g, (char) => `\\${char}`)}%`;
const MONEY_ACTION_PATTERNS = MONEY_AUDIT_ACTION_PREFIXES.map(likePrefix);

/**
 * A takedown record (decision 11), never deleted: every visibility decision, every
 * force-unpublish, and a portfolio status change into or out of SUSPENDED. COALESCE, so a missing
 * metadata field reads as "not a takedown" instead of a NULL that would keep the row forever.
 */
const TAKEDOWN_RECORD = Prisma.sql`COALESCE(
  "action" IN (${ADMIN_AUDIT_ACTIONS.documentVisibility}, ${ADMIN_AUDIT_ACTIONS.portfolioUnpublish})
  OR ("action" = ${ADMIN_AUDIT_ACTIONS.portfolioStatusChange}
    AND 'SUSPENDED' IN ("metadata"->>'status', "metadata"->>'previousStatus')), FALSE)`;

/** One batch: affect at most `limit` rows older than `cutoff`, return how many were affected. */
type BatchStep = (cutoff: Date, limit: number) => Promise<number>;

// Each subquery filters on the index named beside it; the outer statement then hits the primary key.
const RULES: Array<{ name: string; setting: RetentionSetting; step: BatchStep }> = [
  {
    name: "expiredSessions", // Session(expiresAt)
    setting: "expiredSessions",
    step: (cutoff, limit) => prisma.$executeRaw`
      DELETE FROM "Session" WHERE "id" IN (
        SELECT "id" FROM "Session" WHERE "expiresAt" < ${cutoff} LIMIT ${limit})`,
  },
  {
    name: "expiredVerifications", // Verification(expiresAt)
    setting: "expiredVerifications",
    step: (cutoff, limit) => prisma.$executeRaw`
      DELETE FROM "Verification" WHERE "id" IN (
        SELECT "id" FROM "Verification" WHERE "expiresAt" < ${cutoff} LIMIT ${limit})`,
  },
  {
    // Keeps the row, ids, status and error; FAILED (and PROCESSING) rows keep their payload
    // longer, for a replay or an investigation (`unprocessedWebhookPayloadsRedacted` below).
    name: "webhookPayloadsRedacted", // "BillingWebhookEvent_unredacted_idx" (createdAt)
    setting: "webhookPayloads",
    step: (cutoff, limit) => prisma.$executeRaw`
      UPDATE "BillingWebhookEvent"
      SET "payload" = jsonb_build_object('redacted', true, 'type', "type")
      WHERE "id" IN (${RETENTION_CANDIDATES.webhookPayloadsRedacted(cutoff, limit)})`,
  },
  {
    // V-340: a FAILED event nobody replays, or a PROCESSING one whose handler died, kept the
    // customer's name, email and address for good. After a window long enough for any replay or
    // investigation its payload goes too; the summary columns (product, amount, payment id),
    // status and error stay.
    name: "unprocessedWebhookPayloadsRedacted", // BillingWebhookEvent(status, createdAt)
    setting: "unprocessedWebhookPayloads",
    step: (cutoff, limit) => prisma.$executeRaw`
      UPDATE "BillingWebhookEvent"
      SET "payload" = jsonb_build_object('redacted', true, 'type', "type")
      WHERE "id" IN (
        SELECT "id" FROM "BillingWebhookEvent"
        WHERE "status" IN ('FAILED', 'PROCESSING') AND "createdAt" < ${cutoff}
          AND ("payload" - 'type') <> '{"redacted": true}'::jsonb
        LIMIT ${limit})`,
  },
  {
    name: "auditLogs", // AuditLog(createdAt)
    setting: "auditLogs",
    step: (cutoff, limit) => prisma.$executeRaw`
      DELETE FROM "AuditLog" WHERE "id" IN (
        SELECT "id" FROM "AuditLog" WHERE "createdAt" < ${cutoff} LIMIT ${limit})`,
  },
  {
    name: "adminAuditEntries", // AdminAuditEntry(createdAt)
    setting: "adminAuditEntries",
    step: (cutoff, limit) => prisma.$executeRaw`
      DELETE FROM "AdminAuditEntry" WHERE "id" IN (
        SELECT "id" FROM "AdminAuditEntry"
        WHERE "createdAt" < ${cutoff}
          AND NOT ("action" LIKE ANY(${MONEY_ACTION_PATTERNS}::text[]))
          AND NOT ${TAKEDOWN_RECORD}
        LIMIT ${limit})`,
  },
  {
    name: "adminMoneyAuditEntries", // AdminAuditEntry(createdAt)
    setting: "adminMoneyAuditEntries",
    step: (cutoff, limit) => prisma.$executeRaw`
      DELETE FROM "AdminAuditEntry" WHERE "id" IN (
        SELECT "id" FROM "AdminAuditEntry"
        WHERE "createdAt" < ${cutoff}
          AND "action" LIKE ANY(${MONEY_ACTION_PATTERNS}::text[])
          AND NOT ${TAKEDOWN_RECORD}
        LIMIT ${limit})`,
  },
  {
    // `updatedAt` is when the reservation reached its terminal state; PENDING ones are the credit
    // sweep's, never this job's.
    name: "creditReservations", // CreditReservation(status, updatedAt)
    setting: "creditReservations",
    step: (cutoff, limit) => prisma.$executeRaw`
      DELETE FROM "CreditReservation" WHERE "id" IN (
        SELECT "id" FROM "CreditReservation"
        WHERE "status" IN ('COMMITTED', 'RELEASED', 'EXPIRED') AND "updatedAt" < ${cutoff}
        LIMIT ${limit})`,
  },
  {
    // Only COMMITTED rows carry a replay; `updatedAt` is when it was stored. The partial index
    // holds only rows with a replay, so a run never walks the committed history. The row itself
    // stays: it is still the requestId's idempotency record (the rule above).
    name: "creditReplays", // "CreditReservation_replay_idx" (updatedAt) WHERE replay IS NOT NULL
    setting: "creditReplays",
    step: (cutoff, limit) => prisma.$executeRaw`
      UPDATE "CreditReservation" SET "replay" = NULL
      WHERE "id" IN (
        SELECT "id" FROM "CreditReservation"
        WHERE "replay" IS NOT NULL AND "updatedAt" < ${cutoff}
        LIMIT ${limit})`,
  },
  {
    // Batch markers only guard a crash between the Postgres commit and the Redis cleanup of the
    // same flush, which the next flush resolves; a week is ample. The marker is the P2002
    // double-count guard, so deleting it can only double-count a batch whose Redis cleanup has
    // kept failing for the whole 7 days.
    name: "viewFlushBatches", // ViewFlushBatch(createdAt)
    setting: "flushBatches",
    step: (cutoff, limit) => prisma.$executeRaw`
      DELETE FROM "ViewFlushBatch" WHERE "id" IN (
        SELECT "id" FROM "ViewFlushBatch" WHERE "createdAt" < ${cutoff} LIMIT ${limit})`,
  },
  {
    name: "usageMetricFlushBatches", // UsageMetricFlushBatch(createdAt)
    setting: "flushBatches",
    step: (cutoff, limit) => prisma.$executeRaw`
      DELETE FROM "UsageMetricFlushBatch" WHERE "id" IN (
        SELECT "id" FROM "UsageMetricFlushBatch" WHERE "createdAt" < ${cutoff} LIMIT ${limit})`,
  },
  {
    // The row stays, so click totals do not shrink; the hashes, the only per-visitor data, go.
    name: "affiliateClicks",
    setting: "affiliateClicks",
    step: (cutoff, limit) => prisma.$executeRaw`
      UPDATE "AffiliateClick" SET "ipHash" = NULL, "userAgentHash" = NULL
      WHERE "id" IN (${RETENTION_CANDIDATES.affiliateClicksAnonymized(cutoff, limit)})`,
  },
  {
    // PortfolioViewDaily(date). Each old day row is deleted and its count added to the lifetime
    // row of its publication and referrer host, in one statement, so a failure loses no views.
    // The rollup rows themselves sit at VIEW_ROLLUP_DATE, outside the range the batch reads.
    name: "portfolioViews",
    setting: "portfolioViews",
    step: async (cutoff, limit) => {
      const [{ moved }] = await prisma.$queryRaw<Array<{ moved: bigint }>>`
        WITH moved AS (
          DELETE FROM "PortfolioViewDaily" WHERE "id" IN (
            SELECT "id" FROM "PortfolioViewDaily"
            WHERE "date" < ${cutoff} AND "date" > ${VIEW_ROLLUP_DATE} LIMIT ${limit})
          RETURNING "publicationId", "referrerHost", "count"
        ), folded AS (
          INSERT INTO "PortfolioViewDaily"
            ("id", "publicationId", "date", "referrerHost", "count", "updatedAt")
          SELECT gen_random_uuid()::text, "publicationId", ${VIEW_ROLLUP_DATE}, "referrerHost",
            SUM("count"), now()
          FROM moved GROUP BY "publicationId", "referrerHost"
          ON CONFLICT ("publicationId", "date", "referrerHost") DO UPDATE
            SET "count" = "PortfolioViewDaily"."count" + EXCLUDED."count", "updatedAt" = now()
        )
        SELECT COUNT(*) AS moved FROM moved`;

      return Number(moved);
    },
  },
  {
    // `updatedAt` is left alone: it is the sync cursor, and a purge is not an edit. The conditions
    // are repeated on the outer UPDATE: Postgres re-checks those (not the subselect) against the
    // latest row version, so a document restored after its id was selected is not purged.
    // Everything the user wrote goes (V-206): content, title, tags, metadata, and the slug (made
    // from the title) becomes the id. Rows purged before the other fields were added match on
    // them and are finished on the next run.
    name: "deletedDocumentsPurged", // "Document_unpurged_deleted_idx" (deletedAt)
    setting: "deletedDocuments",
    step: (cutoff, limit) => prisma.$executeRaw`
      UPDATE "Document" SET "content" = ${PURGED}, "title" = '', "tags" = '{}',
          "metadata" = NULL, "slug" = "id"
      WHERE "id" IN (${RETENTION_CANDIDATES.deletedDocumentsPurged(cutoff, limit)})
      AND "deletedAt" < ${cutoff} AND ${NOT_YET_PURGED}`,
  },
  {
    // A share's snapshot is the full printed document, and its slug comes from the title. Only
    // shares of documents the rule above has already purged, which can no longer be restored.
    name: "deletedShareSnapshotsPurged", // "ShareLink_unpurged_idx" (documentId)
    setting: "deletedDocuments",
    step: (cutoff, limit) => prisma.$executeRaw`
      UPDATE "ShareLink" SET "snapshot" = ${PURGED}, "slug" = "id"
      WHERE "id" IN (${RETENTION_CANDIDATES.deletedShareSnapshotsPurged(cutoff, limit)})`,
  },
  {
    // The published portfolio. The row stays (subdomain, status and any moderation state).
    name: "deletedPublicationSnapshotsPurged", // "PortfolioPublication_unpurged_idx" (documentId)
    setting: "deletedDocuments",
    step: (cutoff, limit) => prisma.$executeRaw`
      UPDATE "PortfolioPublication" SET "snapshot" = ${PURGED}
      WHERE "id" IN (${RETENTION_CANDIDATES.deletedPublicationSnapshotsPurged(cutoff, limit)})`,
  },
  {
    // Older admin entries named the document by title (delete, restore) or share slug (revoke).
    // Once the document is purged those go too; the ids, action and reason stay.
    name: "deletedDocumentAuditTitlesPurged", // "AdminAuditEntry_titled_idx"
    setting: "deletedDocuments",
    step: (cutoff, limit) => prisma.$executeRaw`
      UPDATE "AdminAuditEntry" SET "metadata" = "metadata" - 'title' - 'slug'
      WHERE "id" IN (${RETENTION_CANDIDATES.deletedDocumentAuditTitlesPurged(cutoff, limit)})`,
  },
];

type RetentionSummary = {
  /** Rows deleted or redacted per enabled rule. */
  affected: Record<string, number>;
  /** Rules that stopped on the time budget with rows left; the next run continues them. */
  incomplete: string[];
  failed: string[];
  /**
   * The worker began draining (V-342): the rule in flight and every enabled rule after it are in
   * `incomplete`, and the run is not a success.
   */
  stoppedForShutdown?: true;
};

/**
 * Applies every enabled rule once. Each rule always gets at least one batch, so a slow rule early
 * in the list cannot starve the rest; further batches run only while the budget lasts. A rule's
 * failure is logged and the next rule still runs. Never rejects.
 */
export async function applyRetention(
  options: {
    settings?: RetentionSettings;
    batchSize?: number;
    budgetMs?: number;
    now?: Date;
    /** Checked between batches; false (the job lock was lost) ends the run where it stands. */
    stillOwner?: () => Promise<boolean>;
  } = {},
): Promise<RetentionSummary> {
  const settings = options.settings ?? readRetentionSettings();
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  const budgetMs = options.budgetMs ?? DEFAULT_BUDGET_MS;
  const nowMs = (options.now ?? new Date()).getTime();
  const deadline = Date.now() + budgetMs;
  const summary: RetentionSummary = {
    affected: {},
    incomplete: [],
    failed: [],
  };

  for (const rule of RULES) {
    const days = settings[rule.setting];
    if (!Number.isSafeInteger(days) || days <= 0) continue;
    // A worker that is shutting down stops between batches (V-342): each batch is atomic, and the
    // next run carries on, while a statement sent after the drain closed the pool would fail.
    // Every enabled rule left is named as incomplete.
    if (isDraining()) {
      summary.stoppedForShutdown = true;
      if (!summary.incomplete.includes(rule.name)) summary.incomplete.push(rule.name);
      continue;
    }

    const cutoff = new Date(nowMs - days * DAY_MS);
    let affected = 0;

    try {
      for (;;) {
        const count = await rule.step(cutoff, batchSize);
        affected += count;
        if (count < batchSize) break;
        if (
          isDraining() ||
          Date.now() >= deadline ||
          (options.stillOwner && !(await options.stillOwner()))
        ) {
          summary.incomplete.push(rule.name);
          if (isDraining()) summary.stoppedForShutdown = true;
          break;
        }
      }
    } catch (error) {
      summary.failed.push(rule.name);
      logger.error(`Retention rule ${rule.name} failed`, {
        error: error instanceof Error ? error.message : error,
      });
    }

    summary.affected[rule.name] = affected;
  }

  return summary;
}

let job: ScheduledTask | null = null;
const runs = createRunTracker();

/**
 * One locked retention pass. Never rejects: `withJobLock` logs a Redis outage, a held lock or a
 * throw. `applyRetention` contains each rule's failure so the others still run; the run then
 * throws once at the end, so a partial failure is never recorded as a success.
 */
export async function runRetention(reason: "cron" | "manual" = "cron"): Promise<void> {
  await withJobLock(
    LOCK_NAME,
    { ttlMs: 2 * 60_000, renewEveryMs: 30_000, job: "retention" },
    async (stillOwner) => {
      const startedAt = Date.now();
      const summary = await applyRetention({ stillOwner });
      logger.info(`Retention run (${reason}) completed`, {
        ...summary,
        durationMs: Date.now() - startedAt,
      });
      // Every rule ran; a failed one makes the run a failure for `/health/jobs`.
      if (summary.failed.length > 0)
        throw new Error(`Retention rules failed: ${summary.failed.join(", ")}`);
      // Stopped by the drain (V-342): not a failure of any rule, but not a completed run either.
      if (summary.stoppedForShutdown)
        throw new Error(
          `Retention run stopped: the worker is shutting down (${summary.incomplete.join(", ")} left for the next run)`,
        );
    },
  );
}

/** False when every rule is disabled: the job is then not scheduled at all. */
export function isRetentionEnabled(settings: RetentionSettings = readRetentionSettings()): boolean {
  return Object.values(settings).some((days) => Number.isSafeInteger(days) && days > 0);
}

/** Daily at 03:15 UTC. No startup run: a missed night just makes the next one a little larger. */
export function startRetentionJob() {
  if (!isRetentionEnabled()) {
    logger.warn("Data retention is disabled: every RETENTION_*_DAYS rule is 0.");
    return;
  }

  if (job) return;

  job = cron.schedule(CRON, () => runs.track(runRetention("cron")), { timezone: TIMEZONE });
  logger.debug("Retention job scheduled", { cron: CRON, timezone: TIMEZONE });
}

/** Stops scheduling and resolves once the run in progress, if any, has finished. */
export async function stopRetentionJob(): Promise<void> {
  if (job) {
    await job.stop();
    job = null;
    logger.info("Retention job stopped");
  }

  return runs.idle();
}
