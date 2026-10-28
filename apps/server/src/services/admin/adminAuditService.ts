import { Prisma } from "@prisma/client";

import { prisma } from "#lib/prisma";
import { logger } from "#lib/logger";
import { toCreatedAtFilter } from "#validators/admin/adminCommonValidator";

import type { AdminAuditListQuery } from "#validators/admin/adminAuditValidator";
import { listPage } from "#utils/pagination";

/**
 * Canonical action names. Every mutating admin endpoint writes one of these, so the audit
 * filter dropdown can be built from a constant instead of a `SELECT DISTINCT action` that
 * grows a new stray value each time someone hand-types a string at a call site.
 */
export const ADMIN_AUDIT_ACTIONS = {
  userUpdate: "user.update",
  userRoleChange: "user.role.change",
  userDelete: "user.delete",
  userSessionsRevoke: "user.sessions.revoke",

  affiliateUpdate: "affiliate.update",
  affiliateCommissionCreate: "affiliate.commission.create",
  affiliateCommissionUpdate: "affiliate.commission.update",
  affiliateWithdrawalUpdate: "affiliate.withdrawal.update",
  // An unpaid affiliate balance lost with a deleted account (owner decision 10, V-234).
  affiliateBalanceForfeit: "affiliate.balance.forfeit",

  ambassadorApprove: "ambassador.application.approve",
  ambassadorReject: "ambassador.application.reject",

  portfolioStatusChange: "portfolio.status.change",
  portfolioUnpublish: "portfolio.unpublish",

  documentVisibility: "document.visibility.change",
  documentDelete: "document.delete",
  documentRestore: "document.restore",
  shareLinkRevoke: "share_link.revoke",

  subscriptionUpdate: "billing.subscription.update",
  creditGrant: "billing.credit.adjust",
  entitlementGrant: "billing.entitlement.grant",
  entitlementRevoke: "billing.entitlement.revoke",
  webhookReplay: "billing.webhook.replay",

  apiKeyUpdate: "api_key.update",
  apiKeyRevoke: "api_key.revoke",

  githubSync: "system.github.sync",
  cacheFlush: "system.cache.flush",

  // Roadmap and changelog writes publish directly to pages users read. They were the only
  // admin mutations that wrote no audit entry at all, which meant a public-facing edit was the
  // one action the log could not attribute.
  roadmapCreate: "roadmap.feature.create",
  roadmapUpdate: "roadmap.feature.update",
  roadmapDelete: "roadmap.feature.delete",

  changelogCreate: "changelog.entry.create",
  changelogUpdate: "changelog.entry.update",
  changelogDelete: "changelog.entry.delete",
  changelogSync: "changelog.sync",
} as const;

export type AdminAuditAction = (typeof ADMIN_AUDIT_ACTIONS)[keyof typeof ADMIN_AUDIT_ACTIONS];

/**
 * Retention classes (owner decision 11, V-207):
 * - money, by action prefix so an action added later falls into its family (credit adjustments,
 *   entitlement grants and revokes, subscription status and cancel actions, webhook replays,
 *   commission and withdrawal changes and payouts, a forfeited affiliate balance with its
 *   unrecovered claw-back, and an affiliate's tier change, which sets the commission rate,
 *   V-333/V-344): kept 7 years;
 * - takedown records, the moderation decisions that set or lift a takedown (`TAKEDOWN_RECORD`
 *   in retentionJob: every visibility decision, every force-unpublish, and the portfolio status
 *   changes into or out of SUSPENDED): never deleted;
 * - everything else, other moderation entries included (delete, restore, share revoke): 365 days.
 */
export const MONEY_AUDIT_ACTION_PREFIXES = [
  "billing.",
  "affiliate.commission.",
  "affiliate.withdrawal.",
  "affiliate.balance.",
  "affiliate.update",
] as const;

export interface AdminAuditInput {
  actorId: string;
  action: AdminAuditAction;
  targetType: string;
  targetId?: string | null;
  reason?: string | null;
  metadata?: Prisma.InputJsonObject;
}

function auditData(input: AdminAuditInput) {
  return {
    actorId: input.actorId,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId ?? null,
    reason: input.reason ?? null,
    metadata: input.metadata,
  };
}

/**
 * Writes the entry on the caller's transaction, so it commits with the mutation it describes or
 * not at all (V-074). Every action that moves money, access or privileges (credit adjustments,
 * commissions, withdrawals, subscription and entitlement edits, moderation, role changes,
 * deletion) goes through here; a failed audit write fails the action, which is the point.
 */
export function writeAdminAudit(tx: Prisma.TransactionClient, input: AdminAuditInput) {
  return tx.adminAuditEntry.create({ data: auditData(input) });
}

/**
 * Records an admin action after the fact and fails with it (V-291): for an action that is safe to
 * repeat (a session revoke), so a lost record is a 500 the admin retries, never a silent 200.
 */
export function recordAdminAuditOrThrow(input: AdminAuditInput) {
  return prisma.adminAuditEntry.create({ data: auditData(input) });
}

/**
 * Records an admin action after the fact, for the mutations that are not transactional (cache
 * flushes, sync triggers, API-key edits, content pages).
 *
 * Deliberately never throws: an audit-write failure (Postgres hiccup, unique-index surprise)
 * must not roll back an operator action that already succeeded, or the caller would retry a
 * non-idempotent mutation. The failure is logged at error level so it still surfaces.
 */
export async function recordAdminAudit(input: AdminAuditInput) {
  try {
    return await prisma.adminAuditEntry.create({ data: auditData(input) });
  } catch (error) {
    logger.error("Failed to write admin audit entry", { action: input.action, error });
    return null;
  }
}

const AUDIT_ACTOR = {
  actor: { select: { id: true, name: true, email: true } },
} satisfies Prisma.AdminAuditEntryInclude;

/**
 * The tables an audit `targetType` names, and the soft-delete column of the ones that have one.
 * Identifiers come only from this map, never from input. A target type missing here (`Cache`,
 * `GitHubSync`) is not a database record.
 */
const AUDIT_TARGET_TABLES: Record<string, { table: string; deletedAt?: true }> = {
  User: { table: "User" },
  Document: { table: "Document", deletedAt: true },
  ShareLink: { table: "ShareLink" },
  PortfolioPublication: { table: "PortfolioPublication" },
  ApiKey: { table: "ApiKey" },
  Subscription: { table: "Subscription" },
  EntitlementGrant: { table: "EntitlementGrant" },
  BillingWebhookEvent: { table: "BillingWebhookEvent" },
  AffiliateCommission: { table: "AffiliateCommission" },
  AffiliateWithdrawal: { table: "AffiliateWithdrawal" },
  AmbassadorApplication: { table: "AmbassadorApplication" },
  RoadmapFeature: { table: "RoadmapFeature" },
  ChangelogEntry: { table: "ChangelogEntry" },
};

/**
 * Adds whether each entry's target still exists (V-272), so the console does not link an entry
 * on a deleted user, portfolio or roadmap item to a page that 404s:
 * - `targetExists`: the row is there; false once it is gone; null when the target is not a
 *   database record (a cache prefix, a sync run) or the entry names no id;
 * - `targetDeleted`: the row is gone, or soft-deleted (a document in the trash).
 * One primary-key lookup per target type on the page, whatever its length.
 */
export async function withTargetState<T extends { targetType: string; targetId: string | null }>(
  entries: T[],
): Promise<Array<T & { targetExists: boolean | null; targetDeleted: boolean }>> {
  const idsByType = new Map<string, Set<string>>();
  for (const entry of entries) {
    if (!entry.targetId || !AUDIT_TARGET_TABLES[entry.targetType]) continue;
    const ids = idsByType.get(entry.targetType) ?? new Set<string>();
    ids.add(entry.targetId);
    idsByType.set(entry.targetType, ids);
  }

  const found = new Map<string, { deleted: boolean }>();
  await Promise.all(
    [...idsByType].map(async ([type, ids]) => {
      const target = AUDIT_TARGET_TABLES[type]!;
      const rows = await prisma.$queryRaw<Array<{ id: string; deleted: boolean }>>`
        SELECT "id", ${target.deletedAt ? Prisma.sql`"deletedAt" IS NOT NULL` : Prisma.sql`FALSE`} AS deleted
        FROM ${Prisma.raw(`"${target.table}"`)}
        WHERE "id" = ANY(${[...ids]}::text[])`;
      for (const row of rows) found.set(`${type}:${row.id}`, { deleted: row.deleted });
    }),
  );

  return entries.map((entry) => {
    if (!entry.targetId || !AUDIT_TARGET_TABLES[entry.targetType])
      return { ...entry, targetExists: null, targetDeleted: false };
    const row = found.get(`${entry.targetType}:${entry.targetId}`);
    return { ...entry, targetExists: Boolean(row), targetDeleted: !row || row.deleted };
  });
}

export async function listAuditEntries(query: AdminAuditListQuery) {
  const where: Prisma.AdminAuditEntryWhereInput = {
    ...(query.action ? { action: query.action } : {}),
    ...(query.targetType ? { targetType: query.targetType } : {}),
    ...(query.targetId ? { targetId: query.targetId } : {}),
    ...(query.actorId ? { actorId: query.actorId } : {}),
    ...(toCreatedAtFilter(query) ?? {}),
    ...(query.query
      ? {
          OR: [
            { action: { contains: query.query, mode: "insensitive" } },
            { targetType: { contains: query.query, mode: "insensitive" } },
            { targetId: { contains: query.query, mode: "insensitive" } },
            { reason: { contains: query.query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.adminAuditEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: query.limit,
      skip: query.offset,
      include: AUDIT_ACTOR,
    }),
    prisma.adminAuditEntry.count({ where }),
  ]);

  return listPage(await withTargetState(items), total, query);
}

/**
 * Filter dropdown values. `groupBy` runs a SQL `GROUP BY`, so Postgres returns one row per
 * distinct value; Prisma's `distinct` without the `nativeDistinct` preview fetches every row and
 * de-duplicates in memory, i.e. it read the whole audit table twice per page load (V-077).
 */
export async function getAuditFilters() {
  const [targetTypes, actorIds] = await Promise.all([
    prisma.adminAuditEntry.groupBy({
      by: ["targetType"],
      orderBy: { targetType: "asc" },
      take: 100,
    }),
    prisma.adminAuditEntry.groupBy({
      by: ["actorId"],
      where: { actorId: { not: null } },
      orderBy: { actorId: "asc" },
      take: 50,
    }),
  ]);

  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds.map((row) => row.actorId).filter((id) => id !== null) } },
    select: { id: true, name: true, email: true },
    orderBy: { email: "asc" },
  });

  return {
    actions: Object.values(ADMIN_AUDIT_ACTIONS),
    targetTypes: targetTypes.map((entry) => entry.targetType),
    actors,
  };
}

/** The admin actions taken on one record, newest first: the history panel on every detail page. */
export async function getAuditHistory(targetType: string, targetId: string, take = 20) {
  return withTargetState(
    await prisma.adminAuditEntry.findMany({
      where: { targetType, targetId },
      orderBy: { createdAt: "desc" },
      include: AUDIT_ACTOR,
      take,
    }),
  );
}

/**
 * The tables of records a user owns that admin actions target, with the column naming the owner.
 * `CreditTransaction` is not here: no admin action targets a ledger row (adjustments target the
 * user), and a heavy AI user owns thousands of them.
 */
const OWNED_AUDIT_TARGETS: Array<{ type: string; owner: string }> = [
  { type: "Subscription", owner: "userId" },
  { type: "EntitlementGrant", owner: "userId" },
  { type: "Document", owner: "userId" },
  { type: "ShareLink", owner: "userId" },
  { type: "PortfolioPublication", owner: "userId" },
  { type: "ApiKey", owner: "userId" },
  { type: "AmbassadorApplication", owner: "userId" },
  { type: "AffiliateWithdrawal", owner: "userId" },
  { type: "AffiliateCommission", owner: "affiliateId" },
  { type: "BillingWebhookEvent", owner: "userId" },
];

/**
 * The ids of a user's history (V-268), newest first: entries on the account, entries on any record
 * it owns, and entries naming the user as user or owner in their metadata.
 *
 * A bounded union rather than an `ownerId` column: no write path has to remember an owner and no
 * backfill can miss one. Each owned table is joined from the audit side
 * (`targetType` + `targetId`, then the target's primary key and owner), so the cost follows the
 * audit entries that exist, not the thousands of commissions or billing events a user can own.
 * The match is materialized before sorting so Postgres never walks the whole log newest-first.
 * Account deletion keeps its own, wider definition (`auditEntriesAboutUserSql`).
 */
export function userAuditHistoryIdsSql(userId: string, take: number) {
  const owned = OWNED_AUDIT_TARGETS.map(
    ({ type, owner }) => Prisma.sql`
      UNION
      SELECT a."id", a."createdAt" FROM "AdminAuditEntry" a
      JOIN ${Prisma.raw(`"${type}"`)} t ON t."id" = a."targetId"
      WHERE a."targetType" = ${type} AND t.${Prisma.raw(`"${owner}"`)} = ${userId}`,
  );
  return Prisma.sql`
    WITH matched AS MATERIALIZED (
      SELECT "id", "createdAt" FROM "AdminAuditEntry"
      WHERE "targetType" = 'User' AND "targetId" = ${userId}
      ${Prisma.join(owned, "")}
      UNION
      SELECT "id", "createdAt" FROM "AdminAuditEntry" WHERE ("metadata" ->> 'userId') = ${userId}
      UNION
      SELECT "id", "createdAt" FROM "AdminAuditEntry" WHERE ("metadata" ->> 'ownerId') = ${userId}
    )
    SELECT "id" FROM matched ORDER BY "createdAt" DESC, "id" DESC LIMIT ${take}`;
}

export async function getUserAuditHistory(userId: string, take = 20) {
  const ids = await prisma.$queryRaw<Array<{ id: string }>>(userAuditHistoryIdsSql(userId, take));
  if (ids.length === 0) return [];

  const entries = await prisma.adminAuditEntry.findMany({
    where: { id: { in: ids.map((row) => row.id) } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: AUDIT_ACTOR,
  });
  return withTargetState(entries);
}

/** Recent activity strip shown on the admin overview. */
export async function getRecentAuditEntries(take = 15) {
  return withTargetState(
    await prisma.adminAuditEntry.findMany({
      orderBy: { createdAt: "desc" },
      take,
      include: AUDIT_ACTOR,
    }),
  );
}
