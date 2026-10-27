import type { Prisma } from "@prisma/client";
import type { z } from "zod";

import { prisma } from "#lib/prisma";
import { ApiError } from "#lib/errors";
import { bumpGeneration } from "#lib/cacheGeneration";
import { documentCacheNamespaces } from "#lib/cacheKeys";

import {
  invalidatePublicPortfolioCaches,
  revalidatePublicPortfolios,
} from "#utils/portfolioPublicationCache";
import { MODERATION_SUSPENSION_PREFIX } from "#services/portfolioService";
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

export async function getPortfolioSummary() {
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [byStatus, byTemplate, publishedLast30, views30, views7, totalViews] = await Promise.all([
    prisma.portfolioPublication.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.portfolioPublication.groupBy({
      by: ["templateId"],
      _count: { _all: true },
      orderBy: { _count: { templateId: "desc" } },
      take: 10,
    }),
    prisma.portfolioPublication.count({ where: { publishedAt: { gte: since30 } } }),
    prisma.portfolioViewDaily.aggregate({
      where: { date: { gte: since30 } },
      _sum: { count: true },
    }),
    prisma.portfolioViewDaily.aggregate({
      where: { date: { gte: since7 } },
      _sum: { count: true },
    }),
    prisma.portfolioViewDaily.aggregate({ _sum: { count: true } }),
  ]);

  const counts = Object.fromEntries(byStatus.map((row) => [row.status, row._count._all]));

  return {
    live: counts.LIVE ?? 0,
    grace: counts.GRACE ?? 0,
    suspended: counts.SUSPENDED ?? 0,
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

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.portfolioPublication.update({
      where: { id: publicationId },
      data: {
        status,
        suspensionReason:
          status === "SUSPENDED" ? `${MODERATION_SUSPENSION_PREFIX}${reason}` : null,
        suspendedAt: status === "SUSPENDED" ? new Date() : null,
      },
      select: PUBLICATION_LIST_SELECT,
    });

    if (status !== "SUSPENDED") {
      const lifted = await tx.document.updateMany({
        where: { id: publication.documentId, moderatedPrivateAt: { not: null } },
        data: { moderatedPrivateAt: null, visibility: "PUBLIC" },
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
            visibility: "PUBLIC",
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
          status,
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

  return { publication: updated, previousStatus: publication.status };
}

/**
 * Hard takedown: removes the publication row entirely and forces the source document back to
 * private, so the subdomain is released and nothing can re-serve the old snapshot.
 */
export async function forceUnpublish(publicationId: string, audit?: AdminAuditInput) {
  const publication = await prisma.portfolioPublication.findUnique({
    where: { id: publicationId },
    select: { id: true, userId: true, documentId: true, subdomain: true },
  });

  if (!publication) throw new ApiError(404, "Portfolio publication not found.");

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

    await tx.portfolioPublication.delete({ where: { id: publicationId } });

    // `documentId` names the document in the takedown record, kept forever (decision 11).
    if (audit)
      await writeAdminAudit(tx, {
        ...audit,
        metadata: {
          ...audit.metadata,
          subdomain: publication.subdomain,
          documentId: publication.documentId,
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
    ...(query.status ? { status: query.status } : {}),
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
