import type { Prisma } from "@prisma/client";
import type { z } from "zod";

import { prisma } from "#lib/prisma";
import { ApiError } from "#lib/errors";
import { assertConfirmation } from "#services/admin/adminConfirmation";
import { bumpGeneration } from "#lib/cacheGeneration";
import { documentCacheNamespaces } from "#lib/cacheKeys";

import {
  invalidatePublicPortfolioCaches,
  revalidatePublicPortfolios,
} from "#utils/portfolioPublicationCache";
import {
  isModerationLocked,
  MODERATION_SUSPENSION_PREFIX,
  PortfolioService,
  rememberReasonBeforeModeration,
} from "#services/portfolioService";
import { BILLING_SUSPENSION_REASONS } from "#services/billingService";
import { logger } from "#lib/logger";
import { USER_UNPUBLISHED_REASON } from "#services/portfolioAssetService";
import {
  ADMIN_AUDIT_ACTIONS,
  writeAdminAudit,
  type AdminAuditInput,
  getAuditHistory,
} from "#services/admin/adminAuditService";
import { isPremiumPortfolioTemplate } from "#validators/portfolioValidator";

import type {
  AdminPortfolioListQuery,
  adminPortfolioAssetListQuerySchema,
} from "#validators/admin/adminPortfolioValidator";
import { listPage } from "#utils/pagination";

type AssetListQuery = z.infer<typeof adminPortfolioAssetListQuerySchema>;

const PUBLICATION_LIST_SELECT = {
  id: true,
  subdomain: true,
  status: true,
  templateId: true,
  publishedRevision: true,
  suspensionReason: true,
  suspendedAt: true,
  publishedAt: true,
  updatedAt: true,
  user: { select: { id: true, name: true, email: true, image: true } },
  document: { select: { id: true, title: true, slug: true, visibility: true, revision: true } },
} satisfies Prisma.PortfolioPublicationSelect;

/**
 * Suspended publications an operator may need to look at (V-248): takedowns and billing
 * suspensions. The owner's own unpublish (and a trashed portfolio, which unpublishes) is
 * theirs to undo and never belongs in the admin action queue.
 */
export const SUSPENDED_FOR_REVIEW_WHERE = {
  status: "SUSPENDED" as const,
  // Spelled with the null case: `NOT { reason }` alone would drop a row with no reason at all.
  OR: [{ suspensionReason: null }, { suspensionReason: { not: USER_UNPUBLISHED_REASON } }],
} satisfies Prisma.PortfolioPublicationWhereInput;

export async function getPortfolioSummary() {
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [byStatus, byTemplate, publishedLast30, views30, views7, totalViews, suspendedForReview] =
    await Promise.all([
      prisma.portfolioPublication.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.portfolioPublication.groupBy({
        by: ["templateId"],
        _count: { _all: true },
        orderBy: { _count: { templateId: "desc" } },
        take: 10,
      }),
      prisma.portfolioPublication.count({ where: { firstPublishedAt: { gte: since30 } } }),
      prisma.portfolioViewDaily.aggregate({
        where: { date: { gte: since30 } },
        _sum: { count: true },
      }),
      prisma.portfolioViewDaily.aggregate({
        where: { date: { gte: since7 } },
        _sum: { count: true },
      }),
      prisma.portfolioViewDaily.aggregate({ _sum: { count: true } }),
      prisma.portfolioPublication.count({ where: SUSPENDED_FOR_REVIEW_WHERE }),
    ]);

  const counts = Object.fromEntries(byStatus.map((row) => [row.status, row._count._all]));

  return {
    live: counts.LIVE ?? 0,
    grace: counts.GRACE ?? 0,
    suspended: counts.SUSPENDED ?? 0,
    suspendedForReview,
    total: Object.values(counts).reduce((sum, value) => sum + value, 0),
    publishedLast30Days: publishedLast30,
    views: {
      total: totalViews._sum.count ?? 0,
      last30Days: views30._sum.count ?? 0,
      last7Days: views7._sum.count ?? 0,
    },
    topTemplates: byTemplate.map((row) => ({
      templateId: row.templateId,
      count: row._count._all,
    })),
  };
}

export async function listPublications(query: AdminPortfolioListQuery) {
  const where: Prisma.PortfolioPublicationWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.templateId ? { templateId: query.templateId } : {}),
    ...(query.query
      ? {
          OR: [
            { subdomain: { contains: query.query, mode: "insensitive" } },
            { user: { email: { contains: query.query, mode: "insensitive" } } },
            { user: { name: { contains: query.query, mode: "insensitive" } } },
            { document: { title: { contains: query.query, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.portfolioPublication.findMany({
      where,
      select: { ...PUBLICATION_LIST_SELECT, _count: { select: { views: true } } },
      orderBy: query.sort === "newest" ? { publishedAt: "desc" } : { updatedAt: "desc" },
      take: query.limit,
      skip: query.offset,
    }),
    prisma.portfolioPublication.count({ where }),
  ]);

  // `views` on the row is a lifetime total, which is a sum over PortfolioViewDaily rather than
  // a column. Sorting by it in SQL would need a raw query, so the "views" sort is applied to
  // the page after the totals are attached — documented here because it is page-local by design.
  const publicationIds = items.map((item) => item.id);

  const viewTotals = publicationIds.length
    ? await prisma.portfolioViewDaily.groupBy({
        by: ["publicationId"],
        where: { publicationId: { in: publicationIds } },
        _sum: { count: true },
      })
    : [];

  const viewsById = new Map(viewTotals.map((row) => [row.publicationId, row._sum.count ?? 0]));

  const withViews = items.map((item) => ({
    ...item,
    totalViews: viewsById.get(item.id) ?? 0,
  }));

  if (query.sort === "views") withViews.sort((a, b) => b.totalViews - a.totalViews);

  return listPage(withViews, total, query);
}

export async function getPublicationDetail(publicationId: string, days = 30) {
  const publication = await prisma.portfolioPublication.findUnique({
    where: { id: publicationId },
    select: {
      ...PUBLICATION_LIST_SELECT,
      publishedRevision: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          createdAt: true,
        },
      },
    },
  });

  if (!publication) throw new ApiError(404, "Portfolio publication not found.");

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [dailyViews, referrers, totalViews, auditEntries] = await Promise.all([
    prisma.portfolioViewDaily.groupBy({
      by: ["date"],
      where: { publicationId, date: { gte: since } },
      _sum: { count: true },
      orderBy: { date: "asc" },
    }),
    prisma.portfolioViewDaily.groupBy({
      by: ["referrerHost"],
      where: { publicationId, date: { gte: since } },
      _sum: { count: true },
      orderBy: { _sum: { count: "desc" } },
      take: 10,
    }),
    prisma.portfolioViewDaily.aggregate({ where: { publicationId }, _sum: { count: true } }),
    getAuditHistory("PortfolioPublication", publicationId),
  ]);

  return {
    publication,
    totalViews: totalViews._sum.count ?? 0,
    dailyViews: dailyViews.map((row) => ({
      date: row.date,
      count: row._sum.count ?? 0,
    })),
    topReferrers: referrers.map((row) => ({
      host: row.referrerHost || "direct",
      count: row._sum.count ?? 0,
    })),
    auditEntries,
  };
}

/**
 * Flushes every cache layer that can keep a suspended portfolio publicly readable: the Redis
 * copy of the publication, the public list, and the portfolio app's ISR cache. Skipping any
 * one of these leaves a taken-down site serving from cache for up to its full TTL.
 */
async function propagatePublicationChange(subdomain: string, userId: string, documentId: string) {
  await Promise.all([
    invalidatePublicPortfolioCaches([subdomain]),
    bumpGeneration(...documentCacheNamespaces(userId, documentId)),
  ]);

  void revalidatePublicPortfolios([subdomain]);
}

/**
 * A suspension from here is a moderation takedown and sticks: the reason is stored with the
 * `moderation:` prefix (see `isModerationLocked` in portfolioService), which the user's
 * Publish/Unpublish and every billing reconciliation leave alone. Setting the status back to
 * LIVE (or GRACE) clears the reason and is the lift path. Either way the site moves on or off the
 * public internet, so the admin audit entry commits in the same transaction (V-074).
 *
 * The lift also lifts a "Make private" on the portfolio's document (V-208): otherwise the site is
 * back online while the document stays locked, and the owner's next Unpublish leaves them unable
 * to publish again. The document goes back to PUBLIC, as a publish leaves it, in the same
 * transaction and with its own audit entry.
 *
 * LIVE and GRACE never override anyone else's decision (V-285): a site the owner unpublished
 * (their own Unpublish, or trashing the document) or billing suspended is refused with 409, as is
 * any site whose document is in the trash. Only the owner's Publish, or billing, brings those back.
 * The write is conditional on the status and reason read here, so a change that commits in
 * between (the owner's unpublish, another moderator) is refused rather than overwritten.
 */
export async function updatePublicationStatus(
  publicationId: string,
  status: "LIVE" | "GRACE" | "SUSPENDED",
  reason: string,
  audit?: AdminAuditInput,
) {
  const publication = await prisma.portfolioPublication.findUnique({
    where: { id: publicationId },
    select: {
      id: true,
      userId: true,
      documentId: true,
      subdomain: true,
      status: true,
      suspensionReason: true,
      reasonBeforeModeration: true,
      templateId: true,
    },
  });

  if (!publication) throw new ApiError(404, "Portfolio publication not found.");

  // GRACE is the courtesy window after a premium lapse; a free template has nothing to lapse.
  if (status === "GRACE" && !isPremiumPortfolioTemplate(publication.templateId))
    throw new ApiError(
      400,
      "A free-template portfolio has no grace period; use LIVE or SUSPENDED.",
    );

  const lifting = status !== "SUSPENDED";
  const locked = isModerationLocked(publication);

  if (lifting && publication.status === "SUSPENDED" && !locked)
    throw new ApiError(
      409,
      publication.suspensionReason === USER_UNPUBLISHED_REASON
        ? "The owner took this portfolio offline. Only the owner can publish it again."
        : "This portfolio is offline for billing. It moves to the free tier and comes back online on its own within the hour.",
    );

  // A lock put over the owner's own unpublish or a billing suspension lifts back to that reason,
  // not online: the lock was the moderator's decision, the suspension under it was not.
  const restoredReason = lifting && locked ? publication.reasonBeforeModeration : null;
  const goesOnline = lifting && !restoredReason;
  // A billing reason comes back dated now: the lock overwrote `suspendedAt`, and the free-tier
  // drop only takes billing suspensions inside its restore window, so a long lock would strand
  // the site offline against owner decision 6. Settled right after the commit, below.
  const restoredBilling =
    restoredReason !== null &&
    (BILLING_SUSPENSION_REASONS as readonly string[]).includes(restoredReason);
  const next = restoredReason
    ? {
        status: "SUSPENDED" as const,
        suspensionReason: restoredReason,
        reasonBeforeModeration: null,
        ...(restoredBilling ? { suspendedAt: new Date() } : {}),
      }
    : status === "SUSPENDED"
      ? {
          status,
          suspensionReason: `${MODERATION_SUSPENSION_PREFIX}${reason}`,
          suspendedAt: new Date(),
          ...rememberReasonBeforeModeration(publication),
        }
      : { status, suspensionReason: null, suspendedAt: null, reasonBeforeModeration: null };

  const updated = await prisma.$transaction(async (tx) => {
    // Every lift takes the owner's billing lock first, as `dropToFreeTier` takes it before its
    // row locks, so the two never wait on each other in opposite orders.
    if (lifting)
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${publication.userId}))`;
    if (goesOnline) {
      // Then the Document row, in the order the owner's delete takes (Document, then the
      // publication): a delete committing first is seen here, and one arriving later finds the
      // site LIVE and takes it down.
      const [source] = await tx.$queryRaw<Array<{ deletedAt: Date | null }>>`
        SELECT "deletedAt" FROM "Document" WHERE "id" = ${publication.documentId}
        FOR NO KEY UPDATE`;
      if (!source || source.deletedAt)
        throw new ApiError(
          409,
          "This portfolio's document is in the trash, so its site cannot go back online.",
        );
    }

    const { count } = await tx.portfolioPublication.updateMany({
      where: {
        id: publicationId,
        status: publication.status,
        suspensionReason: publication.suspensionReason,
        // The owner's unpublish recorded under the lock in between changes where the lift goes.
        reasonBeforeModeration: publication.reasonBeforeModeration,
      },
      data: next,
    });
    if (count === 0)
      throw new ApiError(409, "The portfolio changed while this was being saved. Try again.");

    const row = await tx.portfolioPublication.findUniqueOrThrow({
      where: { id: publicationId },
      select: PUBLICATION_LIST_SELECT,
    });

    if (lifting) {
      // Back to PUBLIC, as a publish leaves it, only when the site goes back online.
      const lifted = await tx.document.updateMany({
        where: { id: publication.documentId, moderatedPrivateAt: { not: null } },
        data: {
          moderatedPrivateAt: null,
          ...(goesOnline ? { visibility: "PUBLIC" as const } : {}),
        },
      });
      if (lifted.count > 0 && audit)
        await writeAdminAudit(tx, {
          actorId: audit.actorId,
          action: ADMIN_AUDIT_ACTIONS.documentVisibility,
          targetType: "Document",
          targetId: publication.documentId,
          reason: audit.reason,
          metadata: {
            previousVisibility: "PRIVATE",
            visibility: goesOnline ? "PUBLIC" : "PRIVATE",
            liftedBy: ADMIN_AUDIT_ACTIONS.portfolioStatusChange,
            publicationId,
            ownerId: publication.userId,
          },
        });
    }
    if (audit)
      await writeAdminAudit(tx, {
        ...audit,
        metadata: {
          ...audit.metadata,
          previousStatus: publication.status,
          status: next.status,
          ...(next.status !== status ? { requestedStatus: status } : {}),
          previousSuspensionReason: publication.suspensionReason,
          suspensionReason: next.suspensionReason,
          subdomain: publication.subdomain,
          ownerId: publication.userId,
        },
      });
    return row;
  });

  await propagatePublicationChange(
    publication.subdomain,
    publication.userId,
    publication.documentId,
  );

  // A restored billing suspension drops to the free tier now rather than at the next hourly run.
  // Committed already, so a failure here is left to that run.
  if (restoredBilling) {
    try {
      if ((await PortfolioService.settleLapsedPortfolioFor(publication.userId)).length > 0)
        return {
          publication: await prisma.portfolioPublication.findUniqueOrThrow({
            where: { id: publicationId },
            select: PUBLICATION_LIST_SELECT,
          }),
          previousStatus: publication.status,
        };
    } catch (error) {
      logger.error("Could not settle a portfolio after lifting a moderation lock", error);
    }
  }

  return { publication: updated, previousStatus: publication.status };
}

/**
 * Hard takedown: the site goes offline as a moderation suspension and the source document is
 * forced private under the moderator lock, so neither the owner's Publish nor making the document
 * visible again brings it back. Lifted by an admin LIVE (`updatePublicationStatus`) or by "Make
 * unlisted" on the document (V-203).
 *
 * The publication row is kept (V-225): deleting it cascaded every `PortfolioViewDaily` row,
 * against the retention decision that daily portfolio views are kept (180 days), and the owner's
 * analytics would be gone if the takedown were ever lifted. The subdomain stays the owner's.
 */
export async function forceUnpublish(
  publicationId: string,
  audit?: AdminAuditInput,
  /** The subdomain the admin retyped (V-082); checked before anything changes. */
  confirm?: string,
) {
  const publication = await prisma.portfolioPublication.findUnique({
    where: { id: publicationId },
    select: {
      id: true,
      userId: true,
      documentId: true,
      subdomain: true,
      status: true,
      suspensionReason: true,
    },
  });

  if (!publication) throw new ApiError(404, "Portfolio publication not found.");
  assertConfirmation(confirm, publication.subdomain, "portfolio's subdomain");

  await prisma.$transaction(async (tx) => {
    // The lock on the row is what `madePrivateByModerator` reads (V-207): the owner cannot make
    // the document visible again after a takedown. An earlier lock keeps its date.
    await tx.document.updateMany({
      where: { id: publication.documentId, moderatedPrivateAt: { not: null } },
      data: { visibility: "PRIVATE" },
    });
    await tx.document.updateMany({
      where: { id: publication.documentId, moderatedPrivateAt: null },
      data: { visibility: "PRIVATE", moderatedPrivateAt: new Date() },
    });

    // Conditional on the state read above, so the reason it keeps for the lift (V-285) is the
    // one the row actually had.
    const { count } = await tx.portfolioPublication.updateMany({
      where: {
        id: publicationId,
        status: publication.status,
        suspensionReason: publication.suspensionReason,
      },
      data: {
        status: "SUSPENDED",
        suspensionReason: `${MODERATION_SUSPENSION_PREFIX}${audit?.reason?.trim() || "force_unpublished"}`,
        suspendedAt: new Date(),
        ...rememberReasonBeforeModeration(publication),
      },
    });
    if (count === 0)
      throw new ApiError(409, "The portfolio changed while this was being saved. Try again.");

    // `documentId` names the document in the takedown record, kept forever (decision 11).
    if (audit)
      await writeAdminAudit(tx, {
        ...audit,
        metadata: {
          ...audit.metadata,
          subdomain: publication.subdomain,
          documentId: publication.documentId,
          previousStatus: publication.status,
          previousSuspensionReason: publication.suspensionReason,
        },
      });
  });

  await propagatePublicationChange(
    publication.subdomain,
    publication.userId,
    publication.documentId,
  );

  return { id: publicationId, subdomain: publication.subdomain };
}

export async function listAssets(query: AssetListQuery) {
  const where: Prisma.PortfolioAssetWhereInput = {
    // A DELETED row is only a hold on a still-valid upload URL (V-224): listed, counted and sized
    // only when asked for by its filter.
    ...(query.status ? { status: query.status } : { status: { not: "DELETED" as const } }),
    ...(query.kind ? { kind: query.kind } : {}),
    ...(query.userId ? { userId: query.userId } : {}),
  };

  const [items, total, sizeTotal] = await Promise.all([
    prisma.portfolioAsset.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: query.limit,
      skip: query.offset,
    }),
    prisma.portfolioAsset.count({ where }),
    prisma.portfolioAsset.aggregate({ where, _sum: { sizeBytes: true } }),
  ]);

  return { ...listPage(items, total, query), totalSizeBytes: sizeTotal._sum.sizeBytes ?? 0 };
}
