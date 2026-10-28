import { promisify } from "node:util";
import { randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";

import { Prisma, type DocumentType } from "@prisma/client";

import { prisma } from "#lib/prisma";
import { getRedis } from "#lib/redis";
import { acquireJobLock } from "#lib/jobLock";
import { bumpGeneration } from "#lib/cacheGeneration";
import { cacheNamespaces, documentCacheNamespaces } from "#lib/cacheKeys";
import { ApiError } from "#lib/errors";
import { logger } from "#lib/logger";
import { normalizeSlug, normalizeUsername, buildUniqueSlugHelper } from "#utils/slugs";
import { hashForAnalytics } from "#utils/analyticsHash";

import { UserService } from "#services/userService";
import { madePrivateByModerator } from "#services/moderationRecord";
import { PURGED_DOCUMENT_CONTENT } from "#jobs/retentionJob";

export { madePrivateByModerator };

const scryptAsync = promisify(scrypt);
const VIEW_BUFFER_TTL_SECONDS = 14 * 24 * 60 * 60;
const MAX_BUFFERED_SHARE_VIEWS = 10_000;
/** Above the flush's whole budget (three statements under the 30 s statement timeout). */
const SHARE_FLUSH_LOCK_SECONDS = 300;
const SHARE_VIEW_RETENTION_DAYS = 30;
const SHARE_VIEW_PRUNE_BATCH_SIZE = 5_000;
const SHARE_VIEW_PRUNE_BUDGET_MS = 20_000;

/**
 * One share view, buffered (V-029): the raw row and the link's counter move together. Past the
 * buffer cap (a flush that has not run, or a flood) the view is neither listed nor counted, and
 * only a drop counter grows, which the flush reports; before, the row was trimmed away while the
 * count kept growing, so `viewCount` and the `ShareView` rows disagreed.
 * KEYS: buffer, counts, last-viewed, dropped. ARGV: record, link id, timestamp, cap, ttl.
 */
const RECORD_SHARE_VIEW_SCRIPT = `
  if redis.call("LLEN", KEYS[1]) >= tonumber(ARGV[4]) then
    redis.call("INCR", KEYS[4])
    redis.call("EXPIRE", KEYS[4], ARGV[5])
    return 0
  end
  redis.call("LPUSH", KEYS[1], ARGV[1])
  redis.call("HINCRBY", KEYS[2], ARGV[2], 1)
  redis.call("HSET", KEYS[3], ARGV[2], ARGV[3])
  redis.call("EXPIRE", KEYS[1], ARGV[5])
  redis.call("EXPIRE", KEYS[2], ARGV[5])
  redis.call("EXPIRE", KEYS[3], ARGV[5])
  return 1
`;
const DROPPED_SHARE_VIEWS_KEY = "share:views:dropped";

type ShareLinkWriteInput = {
  password?: string;
  noExpiry?: boolean;
  expiresAt?: string | Date | null;
  updateSlug?: boolean;
  removePassword?: boolean;
  /** Missing on a refresh keeps the stored value; a new link defaults to true (V-421). */
  allowDownload?: boolean;
  snapshot: Prisma.InputJsonValue;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** How long a share link lasts (owner rule): one of these many days, or never. */
export const SHARE_EXPIRY_DAYS = [7, 14, 30, 90] as const;
const DEFAULT_SHARE_EXPIRY_DAYS = 7;
/** How far a client-computed date may sit from an option: clock skew and a slow request. */
const SHARE_EXPIRY_TOLERANCE_MS = DAY_MS;

/**
 * A share link's expiry (V-412). "Never" is asked for only with `noExpiry: true`; a missing date
 * used to mean never, so every link made through an API key was permanent.
 * - `noExpiry: true`: never.
 * - `expiresAt`: the link's own stored date (the studio's "keep"), or a future date within a day
 *   of 7, 14, 30 or 90 days from now (clients compute it on their own clock). Anything else is 400.
 * - neither: a new link lasts 7 days; a refresh keeps the stored expiry (V-309), the way the
 *   password is kept.
 */
export function resolveShareExpiry(
  data: Pick<ShareLinkWriteInput, "noExpiry" | "expiresAt">,
  existing: { expiresAt: Date | null } | null,
  now = Date.now(),
): Date | null {
  if (data.noExpiry) return null;

  if (data.expiresAt) {
    const requested = new Date(data.expiresAt);
    if (existing?.expiresAt && requested.getTime() === existing.expiresAt.getTime())
      return existing.expiresAt;

    const fits =
      requested.getTime() > now &&
      SHARE_EXPIRY_DAYS.some(
        (days) =>
          Math.abs(requested.getTime() - (now + days * DAY_MS)) <= SHARE_EXPIRY_TOLERANCE_MS,
      );
    if (!fits)
      throw new ApiError(
        400,
        "A share link expires 7, 14, 30 or 90 days from now, or never (noExpiry: true).",
      );
    return requested;
  }

  if (existing) return existing.expiresAt;
  return new Date(now + DEFAULT_SHARE_EXPIRY_DAYS * DAY_MS);
}

/** Documents a share link can point at: a portfolio is published, never shared by link. */
const SHAREABLE_DOCUMENT_TYPES = new Set(["RESUME", "COVER_LETTER"]);

export class ShareService {
  static async hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const derived = (await scryptAsync(password, salt, 64)) as Buffer;

    return `${salt}:${derived.toString("hex")}`;
  }

  static async verifyPassword(password: string, hash: string) {
    const [salt, stored] = hash.split(":");

    if (!salt || !stored) return false;

    const derived = (await scryptAsync(password, salt, 64)) as Buffer;
    const right = Buffer.from(stored, "hex");

    if (derived.length !== right.length) return false;

    return timingSafeEqual(derived, right);
  }

  static isExpired(expiresAt: Date | null | string) {
    if (!expiresAt) return false;

    return new Date(expiresAt).getTime() <= Date.now();
  }

  static async recordShareView(shareLinkId: string, ipAddress?: string, userAgent?: string | null) {
    const hashedIp = ipAddress ? hashForAnalytics(ipAddress) : null;

    const redis = getRedis();
    const timestamp = Date.now();

    const viewRecord = JSON.stringify({
      shareLinkId,
      ipAddress: hashedIp,
      userAgent: userAgent ?? null,
      timestamp,
    });

    // V-114: one script, so a view is one round trip and never half-recorded.
    await redis.eval(RECORD_SHARE_VIEW_SCRIPT, {
      keys: [
        "share:views:buffer",
        "share:links:view_count",
        "share:links:last_viewed",
        DROPPED_SHARE_VIEWS_KEY,
      ],
      arguments: [
        viewRecord,
        shareLinkId,
        String(timestamp),
        String(MAX_BUFFERED_SHARE_VIEWS),
        String(VIEW_BUFFER_TTL_SECONDS),
      ],
    });
  }

  static async flushShareViews() {
    const redis = getRedis();

    const viewsProcessingKey = "share:views:buffer:processing";
    const countsProcessingKey = "share:links:view_count:processing";
    const lastViewedProcessingKey = "share:links:last_viewed:processing";
    const batchKey = "share:views:processing:batch-id";

    const [hasViews, hasCounts, hasLeftovers] = (
      await Promise.all([
        redis.exists("share:views:buffer"),
        redis.exists("share:links:view_count"),
        // V-029: a crashed flush leaves these behind; drain them even when nothing new arrived.
        redis.exists([viewsProcessingKey, countsProcessingKey]),
      ])
    ).map((count) => count > 0);

    if (!hasViews && !hasCounts && !hasLeftovers) return { flushedViews: 0, flushedLinks: 0 };

    const lockKey = "share:views:flush-lock";
    // Serialize flush attempts so a manual admin retry overlapping the cron tick (or a rolling
    // deploy briefly running two worker processes) can't both compute a pre-transaction view
    // count and then have one of them silently discard data on a unique-constraint rollback.
    // The TTL sits above the flush's budget, the lock is renewed while the flush runs, and the
    // release checks the token (V-029, V-127).
    const lock = await acquireJobLock(lockKey, { ttlMs: SHARE_FLUSH_LOCK_SECONDS * 1000 });

    if (!lock) return { flushedViews: 0, flushedLinks: 0, skipped: true as const };

    try {
      if (hasViews && !(await redis.exists(viewsProcessingKey))) {
        try {
          await redis.rename("share:views:buffer", viewsProcessingKey);
        } catch {
          // Ignore
        }
      }

      if (hasCounts && !(await redis.exists(countsProcessingKey))) {
        try {
          await redis.rename("share:links:view_count", countsProcessingKey);
          await redis.rename("share:links:last_viewed", lastViewedProcessingKey);
        } catch {
          // Ignore
        }
      }

      const rawViews = await redis.lRange(viewsProcessingKey, 0, -1);
      const parsedViews: Array<{
        shareLinkId: string;
        ipAddress: string | null;
        userAgent: string | null;
        timestamp: number;
      }> = [];

      for (const raw of rawViews) {
        try {
          parsedViews.push(JSON.parse(raw));
        } catch {
          // Skip malformed
        }
      }

      const counts = await redis.hGetAll(countsProcessingKey);
      const lastViewed = await redis.hGetAll(lastViewedProcessingKey);
      // No TTL on purpose: under volatile-lru a batch id with a TTL could be evicted mid-retry and
      // the retry would commit the same views again under a new id. It is deleted with the batch.
      await redis.set(batchKey, randomUUID(), { NX: true });
      const batchId = await redis.get(batchKey);

      if (!batchId) throw new Error("Failed to initialize share views batch");

      const shareLinkIds = [
        ...new Set([...parsedViews.map((view) => view.shareLinkId), ...Object.keys(counts)]),
      ];
      const surviving = await prisma.shareLink.findMany({
        where: { id: { in: shareLinkIds } },
        select: { id: true, userId: true },
      });
      const survivingShareLinks = new Set(surviving.map((shareLink) => shareLink.id));
      const validViews = parsedViews.filter((view) => survivingShareLinks.has(view.shareLinkId));
      const validCounts = Object.entries(counts).filter(([shareLinkId]) =>
        survivingShareLinks.has(shareLinkId),
      );
      const flushedViews = validViews.length;
      const flushedLinks = validCounts.length;

      // V-110: the counters are one UPDATE … FROM unnest(…) and the batch commits as three
      // statements; the 30-day retention sweep is `pruneShareViews`, outside this transaction.
      const now = Date.now();
      const counters = validCounts.map(([shareLinkId, rawCount]) => {
        const timestamp = parseInt(lastViewed[shareLinkId] ?? "", 10);
        return {
          id: shareLinkId,
          count: parseInt(rawCount, 10) || 0,
          lastViewedAtMs: Number.isFinite(timestamp) ? timestamp : now,
        };
      });

      try {
        await prisma.$transaction([
          prisma.viewFlushBatch.create({ data: { id: batchId, kind: "share" } }),
          prisma.shareView.createMany({
            data: validViews.map((v) => ({
              shareLinkId: v.shareLinkId,
              ipAddress: v.ipAddress,
              userAgent: v.userAgent,
              createdAt: new Date(v.timestamp),
            })),
          }),
          prisma.$executeRaw`
            UPDATE "ShareLink" AS s
            SET "viewCount" = s."viewCount" + v."count",
                "lastViewedAt" = to_timestamp(v."lastViewedAtMs" / 1000.0) AT TIME ZONE 'UTC',
                "updatedAt" = now()
            FROM unnest(
              ${counters.map((c) => c.id)}::text[],
              ${counters.map((c) => c.count)}::int[],
              ${counters.map((c) => c.lastViewedAtMs)}::bigint[]
            ) AS v("id", "count", "lastViewedAtMs")
            WHERE s."id" = v."id"
          `,
        ]);
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
          throw error;
        }

        // We hold the flush lock, so this can only mean a prior attempt already committed this
        // exact batch before crashing without cleaning up Redis. Confirm that rather than
        // assuming it, so a genuine failure doesn't still get reported as success below.
        const existingBatch = await prisma.viewFlushBatch.findUnique({ where: { id: batchId } });
        if (!existingBatch) throw error;
      }

      const staleCount = shareLinkIds.length - survivingShareLinks.size;
      if (staleCount > 0) logger.warn("Discarded share views for deleted links", { staleCount });
      const dropped = Number(await redis.getDel(DROPPED_SHARE_VIEWS_KEY)) || 0;
      if (dropped > 0)
        logger.warn("Share views were dropped at the buffer cap since the last flush", {
          dropped,
          cap: MAX_BUFFERED_SHARE_VIEWS,
        });

      // Committed. A runner that took the lock over meanwhile may be reading the processing
      // keys; deleting them and the batch id under it would let it commit these views again
      // under a fresh id. It finishes the cleanup (its retry hits the batch row and confirms it).
      if (!(await lock.stillOwner())) {
        logger.warn(
          "Share views flush lost its lock after committing; leaving cleanup to the holder",
        );
        return { flushedViews, flushedLinks };
      }

      await redis.del([viewsProcessingKey, countsProcessingKey, lastViewedProcessingKey, batchKey]);

      // The owner's share list shows `viewCount`; it is cached, so the new counts reach it only
      // through a bump (V-188), once per owner whose links were counted.
      const owners = new Set(
        surviving
          .filter((shareLink) => counters.some((counter) => counter.id === shareLink.id))
          .map((shareLink) => cacheNamespaces.shareList(shareLink.userId)),
      );
      if (owners.size > 0) await bumpGeneration(...owners);

      return { flushedViews, flushedLinks };
    } finally {
      await lock.release();
    }
  }

  /**
   * Deletes `ShareView` rows past the 30-day retention window in batches of `batchSize` by id,
   * until none are left or the time budget is spent (V-110). Runs outside the views flush so a
   * large backlog never holds the flush transaction or its connection. Returns rows deleted.
   */
  static async pruneShareViews({
    batchSize = SHARE_VIEW_PRUNE_BATCH_SIZE,
    budgetMs = SHARE_VIEW_PRUNE_BUDGET_MS,
  } = {}) {
    const cutoff = new Date(Date.now() - SHARE_VIEW_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const deadline = Date.now() + budgetMs;
    let deleted = 0;

    while (Date.now() < deadline) {
      const stale = await prisma.shareView.findMany({
        where: { createdAt: { lt: cutoff } },
        select: { id: true },
        take: batchSize,
      });
      if (stale.length === 0) break;

      const result = await prisma.shareView.deleteMany({
        where: { id: { in: stale.map((row) => row.id) } },
      });
      deleted += result.count;
      if (stale.length < batchSize) break;
    }

    return deleted;
  }

  private static async withShareLinkRetry<T>(write: () => Promise<T>): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await write();
      } catch (error) {
        const raced =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
        if (!raced || attempt >= 3) throw error;
      }
    }
  }

  private static async writeShareLink(
    userId: string,
    documentId: string,
    documentSlug: string,
    data: ShareLinkWriteInput,
  ) {
    const existing = await prisma.shareLink.findUnique({
      where: { userId_documentId: { userId, documentId } },
      select: { id: true, slug: true, passwordHash: true, expiresAt: true },
    });

    const slug =
      existing && !data.updateSlug
        ? existing.slug
        : await this.buildUniqueShareSlug(userId, documentSlug, existing?.id);

    let passwordHash = existing ? existing.passwordHash : null;

    if (data.removePassword) {
      passwordHash = null;
    } else if (data.password) {
      passwordHash = await this.hashPassword(data.password);
    }

    const expiresAt = resolveShareExpiry(data, existing);
    // Left out of the write when not sent: the column's default for a new link, the stored value
    // on a refresh (V-421).
    const allowDownload = data.allowDownload;

    const shareLink = existing
      ? await prisma.shareLink.update({
          where: { id: existing.id },
          data: { slug, snapshot: data.snapshot, passwordHash, expiresAt, allowDownload },
        })
      : await prisma.shareLink.create({
          data: {
            userId,
            documentId,
            slug,
            snapshot: data.snapshot,
            passwordHash,
            expiresAt,
            allowDownload,
          },
        });

    return { shareLink, existing };
  }

  static async createShareLink(userId: string, documentId: string, data: ShareLinkWriteInput) {
    const username = await UserService.requireUsernameForUser(userId);
    const document = await prisma.document.findFirst({
      where: { id: documentId, userId, deletedAt: null },
      select: { id: true, slug: true, visibility: true, type: true, moderatedPrivateAt: true },
    });

    if (!document) throw new ApiError(404, "Document not found");
    // Sharing unlists the document below; a portfolio goes public through publishing, and a
    // share link would also be a way around a portfolio takedown.
    if (!SHAREABLE_DOCUMENT_TYPES.has(document.type))
      throw new ApiError(400, "Only résumés and cover letters can be shared by link.");

    // The snapshot is whatever the client posts, so a lock on one document alone was undone by
    // sharing the same content from another, or from a copy made after deleting the locked one
    // (V-302). While one of the account's résumés or cover letters is under a moderator's lock,
    // no link is created or refreshed. A trashed one still counts, or trashing it would be the
    // way round; once retention has purged its content there is nothing left to copy, and the
    // hold lapses. A portfolio takedown does not count: it has its own publish lock. Otherwise
    // lifted with the lock itself.
    if (!document.moderatedPrivateAt) {
      const held = await prisma.document.findFirst({
        where: {
          userId,
          type: { in: [...SHAREABLE_DOCUMENT_TYPES] as DocumentType[] },
          moderatedPrivateAt: { not: null },
          NOT: { content: { equals: PURGED_DOCUMENT_CONTENT as Prisma.InputJsonObject } },
        },
        select: { id: true },
      });
      if (held)
        throw new ApiError(
          403,
          "A moderator made one of your résumés or cover letters private, so new share links are paused until a moderator lifts it.",
        );
    }

    // A share link is reachable by anyone with the URL, so a shared document is UNLISTED, and the
    // public lookup serves no link on a PRIVATE one (V-171). Documents start PRIVATE, so sharing
    // unlists them here, unless a moderator made the document private: then sharing it again
    // would undo the takedown.
    if (document.visibility === "PRIVATE") {
      if (document.moderatedPrivateAt)
        throw new ApiError(403, "This document was made private by a moderator.");

      // Conditional (V-226): a "Make private" committed after the read above wins.
      const unlisted = await prisma.document.updateMany({
        where: { id: document.id, moderatedPrivateAt: null },
        data: { visibility: "UNLISTED" },
      });
      if (unlisted.count === 0)
        throw new ApiError(403, "This document was made private by a moderator.");
      await bumpGeneration(...documentCacheNamespaces(userId, document.id));
    }

    // Find-then-write, so two concurrent shares of one document both pass the find and one
    // create hits the unique key (V-308). The loser runs again and updates the winner's row.
    const { shareLink, existing } = await this.withShareLinkRetry(() =>
      this.writeShareLink(userId, documentId, document.slug, data),
    );

    return {
      shareLink: {
        ...shareLink,
        token: shareLink.slug,
        username,
        documentSlug: document.slug,
        publicPath: `/${username}/${shareLink.slug}`,
      },
      previousSlug: existing?.slug,
    };
  }

  static async listSharedDocumentIds(userId: string, documentIds: string[]) {
    const uniqueDocumentIds = [...new Set(documentIds.filter(Boolean))];

    if (uniqueDocumentIds.length === 0) return [];

    const links = await prisma.shareLink.findMany({
      where: {
        userId,
        documentId: { in: uniqueDocumentIds },
        document: { deletedAt: null },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { documentId: true },
    });

    return [...new Set(links.map((link) => link.documentId))];
  }

  /**
   * One page of a document's share links, and how many there are in all (V-030). Links on a
   * soft-deleted document are not listed. The username is asked for only when there is a link to
   * show, so an account that never chose one can still open an empty list.
   */
  static async listShareLinksPaginated(
    userId: string,
    documentId: string,
    query: { limit: number; offset: number },
  ) {
    const where = { userId, documentId, document: { deletedAt: null } };

    const [links, total] = await Promise.all([
      prisma.shareLink.findMany({
        where,
        // The snapshot is never listed (V-246): up to 1 MB per link, and nothing reads it here.
        omit: { snapshot: true },
        include: { document: { select: { slug: true } } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: query.offset,
        take: query.limit,
      }),
      prisma.shareLink.count({ where }),
    ]);

    if (links.length === 0) return { items: [], total };

    const username = await UserService.requireUsernameForUser(userId);

    const items = links.map(({ document, ...shareLinkData }) => ({
      ...shareLinkData,
      token: shareLinkData.slug,
      username,
      documentSlug: document.slug,
    }));

    return { items, total };
  }

  static async revokeShareLink(userId: string, documentId: string, shareLinkId: string) {
    const username = await UserService.requireUsernameForUser(userId);

    const existing = await prisma.shareLink.findFirst({
      where: { id: shareLinkId, userId, documentId },
      select: { id: true, slug: true },
    });

    if (!existing) throw new ApiError(404, "Share link not found");

    await prisma.shareLink.delete({ where: { id: shareLinkId } });

    return { username, slug: existing.slug };
  }

  /**
   * A link on a PRIVATE document is answered exactly like a missing link (V-171). The link is
   * filtered, not deleted: "Make private" is a reversible moderation step, and setting the
   * document back to UNLISTED brings the same URL back (its password, expiry and view count
   * intact) instead of making the owner share again and send a new URL to everyone. Every
   * visibility change bumps the owner's public-share cache generation, so it applies at once.
   */
  static async getPublicShareLinkByUsernameAndSlug(username: string, slug: string) {
    const user = await prisma.user.findUnique({
      where: { username: normalizeUsername(username) },
      select: { id: true },
    });

    if (!user) throw new ApiError(404, "Link not found");

    const shareLink = await prisma.shareLink.findFirst({
      where: {
        userId: user.id,
        slug: normalizeSlug(slug),
        document: {
          deletedAt: null,
          visibility: { not: "PRIVATE" },
        },
      },
      include: { document: { select: { title: true, slug: true } } },
      orderBy: { createdAt: "desc" },
    });

    if (!shareLink) throw new ApiError(404, "Link not found");
    if (this.isExpired(shareLink.expiresAt)) throw new ApiError(410, "Link expired");

    return shareLink;
  }

  public static async buildUniqueShareSlug(userId: string, slug: string, shareLinkId?: string) {
    return buildUniqueSlugHelper(slug, async (candidate) => {
      const existing = await prisma.shareLink.findFirst({
        where: {
          userId,
          slug: candidate,
          ...(shareLinkId ? { id: { not: shareLinkId } } : {}),
        },
        select: { id: true },
      });
      return !!existing;
    });
  }
}
