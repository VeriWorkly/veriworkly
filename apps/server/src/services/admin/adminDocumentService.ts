import type { Prisma } from "@prisma/client";
import type { z } from "zod";

import { prisma } from "#lib/prisma";
import { ApiError } from "#lib/errors";
import { bumpGeneration } from "#lib/cacheGeneration";
import { assertDocumentNotPurged, PURGED_DOCUMENT_CONTENT } from "#jobs/retentionJob";
import { cacheNamespaces, documentCacheNamespaces } from "#lib/cacheKeys";

import { isModerationLocked, MODERATION_SUSPENSION_PREFIX } from "#services/portfolioService";
import { moderatorPrivateDocumentIds } from "#services/moderationRecord";
import {
  invalidatePublicPortfolioCaches,
  revalidatePublicPortfolios,
} from "#utils/portfolioPublicationCache";

import type {
  AdminDocumentListQuery,
  adminShareLinkListQuerySchema,
} from "#validators/admin/adminDocumentValidator";
import { listPage } from "#utils/pagination";
import { USER_UNPUBLISHED_REASON } from "#services/portfolioAssetService";
import {
  ADMIN_AUDIT_ACTIONS,
  getAuditHistory,
  writeAdminAudit,
  type AdminAuditInput,
} from "#services/admin/adminAuditService";

type ShareLinkListQuery = z.infer<typeof adminShareLinkListQuerySchema>;

const DOCUMENT_LIST_SELECT = {
  id: true,
  title: true,
  type: true,
  slug: true,
  tags: true,
  templateId: true,
  visibility: true,
  revision: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  user: { select: { id: true, name: true, email: true, username: true } },
  _count: { select: { shareLinks: true } },
} satisfies Prisma.DocumentSelect;

export async function getDocumentSummary() {
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [byType, byVisibility, deleted, createdLast30, shareLinks, shareViews] = await Promise.all([
    prisma.document.groupBy({
      by: ["type"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.document.groupBy({
      by: ["visibility"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.document.count({ where: { deletedAt: { not: null } } }),
    prisma.document.count({ where: { createdAt: { gte: since30 } } }),
    prisma.shareLink.count(),
    prisma.shareLink.aggregate({ _sum: { viewCount: true } }),
  ]);

  return {
    byType: Object.fromEntries(byType.map((row) => [row.type, row._count._all])),
    byVisibility: Object.fromEntries(byVisibility.map((row) => [row.visibility, row._count._all])),
    active: byType.reduce((sum, row) => sum + row._count._all, 0),
    softDeleted: deleted,
    createdLast30Days: createdLast30,
    shareLinks,
    shareViews: shareViews._sum.viewCount ?? 0,
  };
}

export async function listDocuments(query: AdminDocumentListQuery) {
  const where: Prisma.DocumentWhereInput = {
    ...(query.includeDeleted ? {} : { deletedAt: null }),
    ...(query.type ? { type: query.type } : {}),
    ...(query.visibility ? { visibility: query.visibility } : {}),
    ...(query.userId ? { userId: query.userId } : {}),
    ...(query.query
      ? {
          OR: [
            { title: { contains: query.query, mode: "insensitive" } },
            { slug: { contains: query.query, mode: "insensitive" } },
            { id: query.query },
            { user: { email: { contains: query.query, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.document.findMany({
      where,
      // `content` is a full JSON Resume payload — several KB per row. It is never selected in
      // a list view; the detail endpoint is the only place it is read.
      select: DOCUMENT_LIST_SELECT,
      orderBy: query.sort === "newest" ? { createdAt: "desc" } : { updatedAt: "desc" },
      take: query.limit,
      skip: query.offset,
    }),
    prisma.document.count({ where }),
  ]);

  // V-199: whether a moderator made each row private, so "Lift takedown" shows only where it
  // applies. Only a PRIVATE row can be under a takedown; the rest skip the lookup.
  const moderated = await moderatorPrivateDocumentIds(
    items.filter((item) => item.visibility === "PRIVATE").map((item) => item.id),
  );

  return listPage(
    items.map((item) => ({ ...item, moderatorPrivate: moderated.has(item.id) })),
    total,
    query,
  );
}

export async function getDocumentDetail(documentId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      ...DOCUMENT_LIST_SELECT,
      metadata: true,
      schemaVersion: true,
      lastSyncedAt: true,
      shareLinks: {
        select: {
          id: true,
          slug: true,
          viewCount: true,
          lastViewedAt: true,
          expiresAt: true,
          createdAt: true,
          passwordHash: true,
        },
      },
      portfolioPublication: {
        select: { id: true, subdomain: true, status: true, updatedAt: true },
      },
    },
  });

  if (!document) throw new ApiError(404, "Document not found.");

  const [auditEntries, moderated] = await Promise.all([
    getAuditHistory("Document", documentId),
    document.visibility === "PRIVATE"
      ? moderatorPrivateDocumentIds([documentId])
      : Promise.resolve(new Set<string>()),
  ]);

  return {
    document: {
      ...document,
      moderatorPrivate: moderated.has(documentId),
      // Never leak the hash itself — the operator only needs to know a password exists.
      shareLinks: document.shareLinks.map(({ passwordHash, ...share }) => ({
        ...share,
        passwordProtected: Boolean(passwordHash),
      })),
    },
    auditEntries,
  };
}

/**
 * Documents are cached per owner, so every admin mutation has to invalidate using the owner's
 * id rather than the acting admin's. Forgetting this is why moderation used to appear to do
 * nothing for up to an hour.
 */
async function invalidateOwnerDocumentCaches(
  userId: string,
  documentId: string,
  type: string,
  username: string | null,
  shareSlugs: string[],
) {
  await bumpGeneration(
    ...documentCacheNamespaces(userId, documentId),
    cacheNamespaces.sharedDocumentIds(userId),
    // The share list leaves out links on soft-deleted documents (V-030).
    cacheNamespaces.shareList(userId),
    ...(username && shareSlugs.length > 0 ? [cacheNamespaces.publicShare(username)] : []),
  );
}

/**
 * A PORTFOLIO document is the source of a public site, which `getPublicPortfolio` serves from
 * `portfolioPublication` alone — hiding or deleting the document does nothing to the subdomain
 * by itself. Deleting the document therefore also takes the publication down, as a sticky
 * moderation suspension (same rules as `adminPortfolioService.updatePublicationStatus`). A row
 * already under a moderation lock keeps its original reason.
 */
async function takeDownPortfolioPublication(documentId: string, reason: string) {
  const publication = await prisma.portfolioPublication.findUnique({
    where: { documentId },
    select: { id: true, subdomain: true, status: true, suspensionReason: true },
  });

  if (!publication || isModerationLocked(publication)) return;

  await prisma.portfolioPublication.update({
    where: { id: publication.id },
    data: {
      status: "SUSPENDED",
      suspensionReason: `${MODERATION_SUSPENSION_PREFIX}${reason}`,
      suspendedAt: new Date(),
    },
  });

  await invalidatePublicPortfolioCaches([publication.subdomain]);
  void revalidatePublicPortfolios([publication.subdomain]);
}

async function loadDocumentForMutation(documentId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      userId: true,
      type: true,
      title: true,
      visibility: true,
      deletedAt: true,
      // For restoreDocument's purge check (assertDocumentNotPurged).
      content: true,
      user: { select: { username: true } },
      shareLinks: { select: { slug: true } },
    },
  });

  if (!document) throw new ApiError(404, "Document not found.");

  return document;
}

/**
 * A moderator's visibility decision. The audit entry is written in the same transaction as the
 * change: it is the record that makes "Make private" a takedown the owner cannot undo
 * (`madePrivateByModerator`), and the record that a later "Make unlisted" lifted it, so a change
 * without it must not happen.
 *
 * For a PORTFOLIO, only PRIVATE takes the publication down (a sticky moderation suspension).
 * UNLISTED never suspends a site (V-203): on a live portfolio it changes nothing public, and on
 * a moderation-locked one it lifts the lock. The lifted row becomes the owner's own unpublish
 * (`user_unpublished`), not LIVE: the moderation reason does not record what the site was before,
 * and putting it back online is the owner's call, which their Publish now makes.
 */
export async function updateDocumentVisibility(
  documentId: string,
  visibility: "PRIVATE" | "UNLISTED",
  audit: AdminAuditInput,
) {
  const document = await loadDocumentForMutation(documentId);
  const publication =
    document.type === "PORTFOLIO"
      ? await prisma.portfolioPublication.findUnique({
          where: { documentId },
          select: { id: true, subdomain: true, status: true, suspensionReason: true },
        })
      : null;
  const locked = publication !== null && isModerationLocked(publication);
  const takeDown = publication !== null && visibility === "PRIVATE" && !locked;
  const lift = publication !== null && visibility !== "PRIVATE" && locked;

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.document.update({
      where: { id: documentId },
      data: { visibility },
      select: DOCUMENT_LIST_SELECT,
    });
    await writeAdminAudit(tx, {
      ...audit,
      metadata: {
        ...audit.metadata,
        previousVisibility: document.visibility,
        visibility,
        ownerId: document.userId,
      },
    });

    // Both writes are conditional on the state read above: if the owner or another admin moved
    // the publication in between, the decision was made on a stale row, so nothing commits.
    const unchanged = publication && {
      id: publication.id,
      status: publication.status,
      suspensionReason: publication.suspensionReason,
    };
    const assertApplied = ({ count }: { count: number }) => {
      if (count === 0)
        throw new ApiError(409, "The portfolio changed while this was being saved. Try again.");
    };

    if (unchanged && takeDown)
      assertApplied(
        await tx.portfolioPublication.updateMany({
          where: unchanged,
          data: {
            status: "SUSPENDED",
            suspensionReason: `${MODERATION_SUSPENSION_PREFIX}document_hidden`,
            suspendedAt: new Date(),
          },
        }),
      );

    if (publication && unchanged && lift) {
      // Still offline, so `suspendedAt` keeps the date it went down; only the lock goes.
      assertApplied(
        await tx.portfolioPublication.updateMany({
          where: unchanged,
          data: { suspensionReason: USER_UNPUBLISHED_REASON },
        }),
      );
      await writeAdminAudit(tx, {
        actorId: audit.actorId,
        action: ADMIN_AUDIT_ACTIONS.portfolioStatusChange,
        targetType: "PortfolioPublication",
        targetId: publication.id,
        reason: audit.reason,
        metadata: {
          previousStatus: publication.status,
          status: "SUSPENDED",
          previousSuspensionReason: publication.suspensionReason,
          suspensionReason: USER_UNPUBLISHED_REASON,
          subdomain: publication.subdomain,
          documentId,
          ownerId: document.userId,
        },
      });
    }

    return row;
  });

  if (publication && (takeDown || lift)) {
    await invalidatePublicPortfolioCaches([publication.subdomain]);
    void revalidatePublicPortfolios([publication.subdomain]);
  }

  await invalidateOwnerDocumentCaches(
    document.userId,
    documentId,
    document.type,
    document.user.username,
    document.shareLinks.map((share) => share.slug),
  );

  return { document: updated, previousVisibility: document.visibility };
}

export async function softDeleteDocument(documentId: string) {
  const document = await loadDocumentForMutation(documentId);

  if (document.deletedAt) throw new ApiError(409, "Document is already deleted.");

  const updated = await prisma.document.update({
    where: { id: documentId },
    data: { deletedAt: new Date() },
    select: DOCUMENT_LIST_SELECT,
  });

  if (document.type === "PORTFOLIO")
    await takeDownPortfolioPublication(documentId, "document_deleted");

  await invalidateOwnerDocumentCaches(
    document.userId,
    documentId,
    document.type,
    document.user.username,
    document.shareLinks.map((share) => share.slug),
  );

  return updated;
}

export async function restoreDocument(documentId: string) {
  const document = await loadDocumentForMutation(documentId);

  if (!document.deletedAt) throw new ApiError(409, "Document is not deleted.");

  assertDocumentNotPurged(document);

  // Conditional, so a purge that lands between the read above and this write wins (410).
  const restored = await prisma.document.updateMany({
    where: {
      id: documentId,
      deletedAt: { not: null },
      NOT: { content: { equals: PURGED_DOCUMENT_CONTENT as Prisma.InputJsonObject } },
    },
    data: { deletedAt: null },
  });

  if (restored.count === 0) {
    const current = await prisma.document.findUnique({
      where: { id: documentId },
      select: { deletedAt: true, content: true },
    });
    if (!current) throw new ApiError(404, "Document not found.");
    assertDocumentNotPurged(current);
    throw new ApiError(409, "Document is not deleted.");
  }

  const updated = await prisma.document.findUniqueOrThrow({
    where: { id: documentId },
    select: DOCUMENT_LIST_SELECT,
  });

  await invalidateOwnerDocumentCaches(
    document.userId,
    documentId,
    document.type,
    document.user.username,
    document.shareLinks.map((share) => share.slug),
  );

  return updated;
}

export async function listShareLinks(query: ShareLinkListQuery) {
  const where: Prisma.ShareLinkWhereInput = {
    ...(query.userId ? { userId: query.userId } : {}),
    ...(query.query
      ? {
          OR: [
            { slug: { contains: query.query, mode: "insensitive" } },
            { document: { title: { contains: query.query, mode: "insensitive" } } },
            { user: { email: { contains: query.query, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.shareLink.findMany({
      where,
      select: {
        id: true,
        slug: true,
        viewCount: true,
        lastViewedAt: true,
        expiresAt: true,
        createdAt: true,
        passwordHash: true,
        user: { select: { id: true, name: true, email: true, username: true } },
        document: { select: { id: true, title: true, type: true, visibility: true } },
        _count: { select: { views: true } },
      },
      orderBy: query.sort === "views" ? { viewCount: "desc" } : { createdAt: "desc" },
      take: query.limit,
      skip: query.offset,
    }),
    prisma.shareLink.count({ where }),
  ]);

  return listPage(
    items.map(({ passwordHash, ...share }) => ({
      ...share,
      passwordProtected: Boolean(passwordHash),
    })),
    total,
    query,
  );
}

export async function revokeShareLink(shareLinkId: string) {
  const share = await prisma.shareLink.findUnique({
    where: { id: shareLinkId },
    select: {
      id: true,
      slug: true,
      userId: true,
      documentId: true,
      document: { select: { type: true } },
      user: { select: { username: true } },
    },
  });

  if (!share) throw new ApiError(404, "Share link not found.");

  await prisma.shareLink.delete({ where: { id: shareLinkId } });

  await invalidateOwnerDocumentCaches(
    share.userId,
    share.documentId,
    share.document.type,
    share.user.username,
    [share.slug],
  );

  await bumpGeneration(cacheNamespaces.shareList(share.userId));

  return { id: shareLinkId, slug: share.slug };
}
