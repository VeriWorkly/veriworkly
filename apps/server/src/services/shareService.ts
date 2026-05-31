import { promisify } from "node:util";
import { randomBytes, randomUUID, scrypt, timingSafeEqual, createHash } from "node:crypto";

import { Prisma } from "@prisma/client";

import { config } from "#config";

import { prisma } from "#utils/prisma";
import { getRedis } from "#utils/redis";
import { ApiError } from "#utils/errors";
import { logger } from "#utils/logger";
import { normalizeSlug, normalizeUsername, buildUniqueSlugHelper } from "#utils/slugs";

import { UserService } from "#services/userService";

const scryptAsync = promisify(scrypt);
const VIEW_BUFFER_TTL_SECONDS = 14 * 24 * 60 * 60;
const MAX_BUFFERED_SHARE_VIEWS = 10_000;

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
    const hashedIp = ipAddress
      ? createHash("sha256")
          .update(ipAddress + (config.jwt.secret || "fallback-salt"))
          .digest("hex")
      : null;

    const redis = getRedis();
    const timestamp = Date.now();

    const viewRecord = JSON.stringify({
      shareLinkId,
      ipAddress: hashedIp,
      userAgent: userAgent ?? null,
      timestamp,
    });

    await redis.lPush("share:views:buffer", viewRecord);
    await redis.lTrim("share:views:buffer", 0, MAX_BUFFERED_SHARE_VIEWS - 1);
    await redis.hIncrBy("share:links:view_count", shareLinkId, 1);
    await redis.hSet("share:links:last_viewed", shareLinkId, String(timestamp));
    await redis
      .multi()
      .expire("share:views:buffer", VIEW_BUFFER_TTL_SECONDS)
      .expire("share:links:view_count", VIEW_BUFFER_TTL_SECONDS)
      .expire("share:links:last_viewed", VIEW_BUFFER_TTL_SECONDS)
      .exec();
  }

  static async flushShareViews() {
    const redis = getRedis();

    const hasViews = (await redis.exists("share:views:buffer")) > 0;
    const hasCounts = (await redis.exists("share:links:view_count")) > 0;

    if (!hasViews && !hasCounts) return { flushedViews: 0, flushedLinks: 0 };

    const viewsProcessingKey = "share:views:buffer:processing";
    const countsProcessingKey = "share:links:view_count:processing";
    const lastViewedProcessingKey = "share:links:last_viewed:processing";
    const batchKey = "share:views:processing:batch-id";

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
    await redis.set(batchKey, randomUUID(), { NX: true });
    const batchId = await redis.get(batchKey);

    if (!batchId) throw new Error("Failed to initialize share views batch");

    const shareLinkIds = [
      ...new Set([...parsedViews.map((view) => view.shareLinkId), ...Object.keys(counts)]),
    ];
    const survivingShareLinks = new Set(
      (
        await prisma.shareLink.findMany({
          where: { id: { in: shareLinkIds } },
          select: { id: true },
        })
      ).map((shareLink) => shareLink.id),
    );
    const validViews = parsedViews.filter((view) => survivingShareLinks.has(view.shareLinkId));
    const validCounts = Object.entries(counts).filter(([shareLinkId]) =>
      survivingShareLinks.has(shareLinkId),
    );
    const flushedViews = validViews.length;
    const flushedLinks = validCounts.length;

    try {
      await prisma.$transaction(async (tx) => {
        await tx.viewFlushBatch.create({ data: { id: batchId, kind: "share" } });

        if (validViews.length > 0) {
          await tx.shareView.createMany({
            data: validViews.map((v) => ({
              shareLinkId: v.shareLinkId,
              ipAddress: v.ipAddress,
              userAgent: v.userAgent,
              createdAt: new Date(v.timestamp),
            })),
          });
        }

        for (const [shareLinkId, rawCount] of validCounts) {
          const count = parseInt(rawCount, 10) || 0;
          const tsString = lastViewed[shareLinkId];
          const lastViewedAt = tsString ? new Date(parseInt(tsString, 10)) : new Date();

          await tx.shareLink.update({
            where: { id: shareLinkId },
            data: {
              viewCount: { increment: count },
              lastViewedAt,
            },
          });
        }

        const retentionLimit = new Date();
        retentionLimit.setDate(retentionLimit.getDate() - 30);
        await tx.shareView.deleteMany({
          where: {
            createdAt: { lt: retentionLimit },
          },
        });
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
        throw error;
      }
    }

    const staleCount = shareLinkIds.length - survivingShareLinks.size;
    if (staleCount > 0) logger.warn("Discarded share views for deleted links", { staleCount });

    await redis.del([viewsProcessingKey, countsProcessingKey, lastViewedProcessingKey, batchKey]);

    return { flushedViews, flushedLinks };
  }

  static async createShareLink(
    userId: string,
    documentId: string,
    data: {
      password?: string;
      noExpiry?: boolean;
      expiresAt?: string | Date | null;
      updateSlug?: boolean;
      removePassword?: boolean;
      snapshot: Prisma.InputJsonValue;
    },
  ) {
    const username = await UserService.requireUsernameForUser(userId);
    const document = await prisma.document.findFirst({
      where: { id: documentId, userId, deletedAt: null },
      select: { id: true, slug: true },
    });

    if (!document) throw new ApiError(404, "Document not found");

    const existing = await prisma.shareLink.findUnique({
      where: { userId_documentId: { userId, documentId } },
      select: { id: true, slug: true, passwordHash: true },
    });

    const slug =
      existing && !data.updateSlug
        ? existing.slug
        : await this.buildUniqueShareSlug(userId, document.slug, existing?.id);

    let passwordHash = existing ? existing.passwordHash : null;

    if (data.removePassword) {
      passwordHash = null;
    } else if (data.password) {
      passwordHash = await this.hashPassword(data.password);
    }

    const expiresAt = data.noExpiry ? null : data.expiresAt ? new Date(data.expiresAt) : null;

    const shareLink = existing
      ? await prisma.shareLink.update({
          where: { id: existing.id },
          data: {
            slug,
            snapshot: data.snapshot,
            passwordHash,
            expiresAt,
          },
        })
      : await prisma.shareLink.create({
          data: {
            userId,
            documentId,
            slug,
            snapshot: data.snapshot,
            passwordHash,
            expiresAt,
          },
        });

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

  static async listShareLinks(userId: string, documentId: string) {
    return this.listShareLinksPaginated(userId, documentId);
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

  static async listShareLinksPaginated(
    userId: string,
    documentId: string,
    query?: { limit: number; offset: number },
  ) {
    void query;

    const item = await prisma.shareLink.findUnique({
      where: { userId_documentId: { userId, documentId } },
    });

    const username = await UserService.requireUsernameForUser(userId);

    const items = item
      ? [
          {
            ...item,
            token: item.slug,
            username,
          },
        ]
      : [];

    return { items, total: items.length };
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
