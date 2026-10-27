import type { Prisma } from "@prisma/client";

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
 *   commission and withdrawal changes and payouts): kept 7 years;
 * - takedown records, the moderation decisions that set or lift a takedown (`TAKEDOWN_RECORD`
 *   in retentionJob: every visibility decision, every force-unpublish, and the portfolio status
 *   changes into or out of SUSPENDED): never deleted;
 * - everything else, other moderation entries included (delete, restore, share revoke): 365 days.
 */
export const MONEY_AUDIT_ACTION_PREFIXES = [
  "billing.",
  "affiliate.commission.",
  "affiliate.withdrawal.",
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
      include: { actor: { select: { id: true, name: true, email: true } } },
    }),
    prisma.adminAuditEntry.count({ where }),
  ]);

  return listPage(items, total, query);
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

/** Recent activity strip shown on the admin overview. */
/** The admin actions taken on one record, newest first: the history panel on every detail page. */
export function getAuditHistory(targetType: string, targetId: string, take = 20) {
  return prisma.adminAuditEntry.findMany({
    where: { targetType, targetId },
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { id: true, name: true, email: true } } },
    take,
  });
}

export async function getRecentAuditEntries(take = 15) {
  return prisma.adminAuditEntry.findMany({
    orderBy: { createdAt: "desc" },
    take,
    include: { actor: { select: { id: true, name: true, email: true } } },
  });
}
