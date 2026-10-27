import { prisma } from "#lib/prisma";

/*
 * Kept apart from shareService on purpose: portfolioService needs this check too (a takedown must
 * stop a republish), and shareService pulls in userService and its auth configuration.
 */

/**
 * Which of these documents a moderator made private: the admin console's "Make private", or a
 * portfolio takedown (force-unpublish, which forces its document private). Both set
 * `Document.moderatedPrivateAt`; a later "Make unlisted" (or a LIVE lift of the portfolio)
 * clears it. The lock is on the row itself, never read from the admin audit log, so audit
 * retention cannot lift a takedown (V-207, owner decision 11). One query for the whole set, so an
 * admin list page can carry it per row (V-199).
 */
export async function moderatorPrivateDocumentIds(documentIds: readonly string[]) {
  const ids = [...new Set(documentIds)];
  if (ids.length === 0) return new Set<string>();

  const rows = await prisma.document.findMany({
    where: { id: { in: ids }, moderatedPrivateAt: { not: null } },
    select: { id: true },
  });

  return new Set(rows.map((row) => row.id));
}

/** `moderatorPrivateDocumentIds` for one document. */
export async function madePrivateByModerator(documentId: string) {
  return (await moderatorPrivateDocumentIds([documentId])).has(documentId);
}
