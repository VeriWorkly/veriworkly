import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

import { config } from "#config";
import { BillingService } from "#services/billingService";
import { EntitlementService } from "#services/entitlementService";
import { ENTITLEMENT_KEYS } from "#services/productCatalog";

import {
  invalidatePublicPortfolioCaches,
  revalidatePublicPortfolios,
} from "#utils/portfolioPublicationCache";

import { prisma } from "#lib/prisma";
import { logger } from "#lib/logger";
import { ApiError } from "#lib/errors";
import { normalizeSlug, RESERVED_USERNAMES } from "#utils/slugs";
import { cacheGet, cacheSet, cacheDel, cacheDelByPrefix, getRedis } from "#lib/redis";
import { documentListCachePrefix, userProfileCacheKey } from "#lib/cacheKeys";
import { hashForAnalytics } from "#utils/analyticsHash";
import { sendPortfolioUpdatedEmail } from "#services/mail/portfolioMail";

import { portfolioContentSchema, type PortfolioContentInput } from "#validators/portfolioValidator";

const VIEW_BUFFER_TTL_SECONDS = 14 * 24 * 60 * 60;
const MAX_VIEW_BUFFER_FIELDS = 10_000;
// A vanity metric doesn't need per-request precision, but trivially repeatable POSTs shouldn't be
// able to inflate it either — collapse repeat views from the same viewer within this window.
const VIEW_DEDUP_WINDOW_SECONDS = 30 * 60;

function normalizeSubdomain(value: string) {
  const subdomain = normalizeSlug(value, "").replace(/_/g, "-").slice(0, 63);

  if (!subdomain || RESERVED_USERNAMES.has(subdomain))
    throw new ApiError(400, "Choose a valid portfolio subdomain.");

  return subdomain;
}

function utcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function normalizeReferrerHost(referrer?: string) {
  if (!referrer) return "";

  try {
    return new URL(referrer).hostname.toLowerCase().slice(0, 255);
  } catch {
    return "";
  }
}

/**
 * `removeWatermark` arrives inside the client-supplied content payload, so it is a
 * request rather than a fact. The published snapshot must record the server's own
 * decision: a publisher without the `watermark_removal` entitlement always stores
 * `false`, whatever was posted.
 *
 * The public renderer independently guards on `isPremium`, so this is defence in
 * depth - but it also keeps the persisted snapshot honest for everything that reads
 * it later (admin views, support, any future export of the publication).
 */
export function resolveWatermarkFlag(
  requested: boolean | undefined,
  canRemoveWatermark: boolean,
): boolean {
  return canRemoveWatermark ? requested === true : false;
}

function collectAssetIds(content: PortfolioContentInput) {
  const ids = new Set<string>();
  if (content.identity.avatar?.id) ids.add(content.identity.avatar.id);
  if (content.seo.socialImage?.id) ids.add(content.seo.socialImage.id);

  for (const section of content.sections) {
    for (const item of section.items) {
      const cover = item.coverImage;
      if (
        cover &&
        typeof cover === "object" &&
        "id" in cover &&
        typeof cover.id === "string" &&
        cover.id
      ) {
        ids.add(cover.id);
      }
    }
  }

  return [...ids];
}

export class PortfolioService {
  static async listPublicPortfolios(limit?: number, offset?: number) {
    const cacheKey =
      limit !== undefined || offset !== undefined
        ? `portfolio:public:list:${limit || 0}:${offset || 0}`
        : "portfolio:public:list";
    const cached = await cacheGet<Array<{ subdomain: string; updatedAt: string }>>(cacheKey);

    if (cached) return cached;

    const result = await prisma.portfolioPublication.findMany({
      where: { status: { in: ["LIVE", "GRACE"] } },
      select: { subdomain: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
    });

    await cacheSet(cacheKey, result, 300);

    return result;
  }

  static async getPublicPortfolio(subdomain: string) {
    const normalized = normalizeSubdomain(subdomain);
    const cacheKey = `portfolio:public:${normalized}`;

    const cached = await cacheGet<{
      id: string;
      subdomain: string;
      templateId: string;
      snapshot: unknown;
      status: string;
      updatedAt: string;
    }>(cacheKey);

    if (cached) return cached;

    const publication = await prisma.portfolioPublication.findUnique({
      where: { subdomain: normalized },
      select: {
        id: true,
        subdomain: true,
        templateId: true,
        snapshot: true,
        status: true,
        updatedAt: true,
        user: {
          select: {
            subscriptions: {
              where: {
                productKey: { in: ["portfolio_pro", "bundle"] },
                OR: [
                  {
                    status: { in: ["ACTIVE", "TRIALING"] },
                    OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: new Date() } }],
                  },
                  { graceEndsAt: { gt: new Date() } },
                ],
              },
              select: { status: true, graceEndsAt: true },
              orderBy: [{ graceEndsAt: "desc" }, { updatedAt: "desc" }],
              take: 1,
            },
          },
        },
      },
    });

    if (!publication || publication.status === "SUSPENDED") return null;

    const accessSubscription = publication.user.subscriptions[0];
    const graceEndsAt =
      accessSubscription?.status === "ACTIVE" || accessSubscription?.status === "TRIALING"
        ? null
        : (accessSubscription?.graceEndsAt ?? null);

    if (publication.status === "GRACE" && !accessSubscription) {
      await prisma.portfolioPublication.update({
        where: { id: publication.id },
        data: { status: "SUSPENDED", suspendedAt: new Date(), suspensionReason: "grace_expired" },
      });

      await invalidatePublicPortfolioCaches([normalized]);
      void revalidatePublicPortfolios([normalized]);

      return null;
    }

    const isPremium = !!accessSubscription;

    const result = {
      id: publication.id,
      subdomain: publication.subdomain,
      templateId: publication.templateId,
      snapshot: publication.snapshot,
      status: publication.status,
      updatedAt: publication.updatedAt.toISOString(),
      isPremium,
    };

    let ttl = 600;

    if (publication.status === "GRACE" && graceEndsAt) {
      const msLeft = new Date(graceEndsAt).getTime() - Date.now();

      if (msLeft > 0) {
        ttl = Math.min(600, Math.ceil(msLeft / 1000));
      } else {
        ttl = 0;
      }
    }

    if (ttl > 0) await cacheSet(cacheKey, result, ttl);

    return result;
  }

  static async getDraft(userId: string) {
    return prisma.document.findFirst({
      where: { userId, type: "PORTFOLIO", deletedAt: null },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        slug: true,
        templateId: true,
        content: true,
        revision: true,
        updatedAt: true,
      },
    });
  }

  static async getMe(userId: string) {
    const [draft, publication, billing] = await Promise.all([
      this.getDraft(userId),
      prisma.portfolioPublication.findUnique({
        where: { userId },
        select: {
          subdomain: true,
          status: true,
          publishedRevision: true,
          publishedAt: true,
          updatedAt: true,
        },
      }),
      BillingService.getSummary(userId),
    ]);

    return { draft, publication, billing };
  }

  static async getPreview(userId: string, documentId: string) {
    const document = await prisma.document.findFirst({
      where: { id: documentId, userId, type: "PORTFOLIO", deletedAt: null },
      select: { id: true, templateId: true, content: true, revision: true, updatedAt: true },
    });

    if (!document) throw new ApiError(404, "Portfolio draft not found.");

    return document;
  }

  static async isSubdomainAvailable(userId: string, value: string) {
    const subdomain = normalizeSubdomain(value);

    const existing = await prisma.portfolioPublication.findUnique({
      where: { subdomain },
      select: { userId: true },
    });

    return { subdomain, available: !existing || existing.userId === userId };
  }

  static async saveDraft(
    userId: string,
    input: {
      documentId?: string;
      subdomain: string;
      revision?: number;
      snapshot: PortfolioContentInput;
    },
  ) {
    const subdomain = normalizeSubdomain(input.subdomain);

    const existing = input.documentId
      ? await prisma.document.findFirst({
          where: { id: input.documentId, userId, type: "PORTFOLIO", deletedAt: null },
          select: { id: true, revision: true },
        })
      : await prisma.document.findFirst({
          where: { userId, type: "PORTFOLIO", deletedAt: null },
          orderBy: { updatedAt: "desc" },
          select: { id: true, revision: true },
        });

    if (input.documentId && !existing) throw new ApiError(404, "Portfolio draft not found.");

    if (existing && input.revision !== existing.revision)
      throw new ApiError(409, "Portfolio draft changed in another session.", {
        revision: existing.revision,
      });

    try {
      const document = existing
        ? await prisma.document.update({
            where: { id: existing.id },
            data: {
              content: input.snapshot as Prisma.InputJsonValue,
              templateId: input.snapshot.templateId,
              slug: subdomain,
              revision: { increment: 1 },
              lastSyncedAt: new Date(),
            },
            select: {
              id: true,
              slug: true,
              templateId: true,
              content: true,
              revision: true,
              updatedAt: true,
            },
          })
        : await prisma.document.create({
            data: {
              userId,
              type: "PORTFOLIO",
              title: "Portfolio",
              slug: subdomain,
              content: input.snapshot as Prisma.InputJsonValue,
              templateId: input.snapshot.templateId,
              visibility: "PRIVATE",
              lastSyncedAt: new Date(),
            },
            select: {
              id: true,
              slug: true,
              templateId: true,
              content: true,
              revision: true,
              updatedAt: true,
            },
          });

      await Promise.all([
        cacheDel(`document:${userId}:${document.id}`),
        cacheDelByPrefix(documentListCachePrefix(userId)),
        cacheDel(userProfileCacheKey(userId)),
      ]);

      return document;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
        throw new ApiError(
          409,
          "That portfolio subdomain conflicts with an existing document slug.",
        );

      throw error;
    }
  }

  static async publish(
    userId: string,
    input: { documentId: string; subdomain: string; revision: number },
  ) {
    const billing = await BillingService.getSummary(userId);
    const hasSubscription = billing.canPublish;

    const document = await prisma.document.findFirst({
      where: { id: input.documentId, userId, type: "PORTFOLIO", deletedAt: null },
    });

    if (!document) throw new ApiError(404, "Portfolio draft not found.");

    const isPremiumTemplate = document.templateId === "nimbus" || document.templateId === "cipher";

    if (isPremiumTemplate && !hasSubscription) {
      throw new ApiError(
        403,
        `Publishing the premium template "${document.templateId}" requires an active Creator Pro subscription.`,
      );
    }

    if (document.revision !== input.revision) {
      throw new ApiError(409, "Save the latest draft before publishing.");
    }

    const subdomain = normalizeSubdomain(input.subdomain);

    const publishable = portfolioContentSchema.safeParse(document.content);

    if (!publishable.success) {
      throw new ApiError(
        400,
        "Complete the required portfolio details before publishing.",
        publishable.error.flatten(),
      );
    }

    const assetIds = collectAssetIds(publishable.data);
    if (assetIds.length) {
      const ownedAssets = await prisma.portfolioAsset.count({
        where: { id: { in: assetIds }, userId, status: "READY" },
      });
      if (ownedAssets !== assetIds.length)
        throw new ApiError(400, "Portfolio contains an unavailable or invalid image.");
    }

    // See resolveWatermarkFlag: the posted value is a request, not a fact.
    const canRemoveWatermark = await EntitlementService.has(
      userId,
      ENTITLEMENT_KEYS.WATERMARK_REMOVAL,
    );

    const snapshot: PortfolioContentInput = {
      ...publishable.data,
      removeWatermark: resolveWatermarkFlag(publishable.data.removeWatermark, canRemoveWatermark),
    };

    const existingPublication = await prisma.portfolioPublication.findUnique({
      where: { userId },
      select: { documentId: true, subdomain: true, status: true },
    });

    try {
      const publication = await prisma.$transaction(async (tx) => {
        if (existingPublication && existingPublication.documentId !== document.id) {
          await tx.document.update({
            where: { id: existingPublication.documentId },
            data: { visibility: "PRIVATE" },
          });
        }

        await tx.document.update({
          where: { id: document.id },
          data: { visibility: "PUBLIC" },
        });

        return tx.portfolioPublication.upsert({
          where: { userId },
          create: {
            userId,
            documentId: document.id,
            subdomain,
            templateId: document.templateId,
            snapshot: snapshot as Prisma.InputJsonValue,
            publishedRevision: document.revision,
          },
          update: {
            documentId: document.id,
            subdomain,
            templateId: document.templateId,
            snapshot: snapshot as Prisma.InputJsonValue,
            publishedRevision: document.revision,
            status: "LIVE",
            suspensionReason: null,
            suspendedAt: null,
            publishedAt: new Date(),
          },
        });
      });

      const subdomains = [subdomain, existingPublication?.subdomain ?? ""];

      await Promise.all([
        invalidatePublicPortfolioCaches(subdomains),
        cacheDel(`document:${userId}:${document.id}`),
        cacheDelByPrefix(documentListCachePrefix(userId)),
        ...(existingPublication && existingPublication.documentId !== document.id
          ? [cacheDel(`document:${userId}:${existingPublication.documentId}`)]
          : []),
      ]);

      void revalidatePublicPortfolios(subdomains);

      const publicUrl =
        config.nodeEnv === "development"
          ? `http://${publication.subdomain}.localhost:3004`
          : `https://${publication.subdomain}.veriworkly.com`;

      if (existingPublication?.status !== "LIVE") {
        void this.notifyPortfolioLive(userId, publicUrl);
      }

      return { ...publication, publicUrl };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
        throw new ApiError(409, "That portfolio subdomain is already in use.");

      throw error;
    }
  }

  private static async notifyPortfolioLive(userId: string, publicUrl: string) {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
      if (!user?.email) return;

      await sendPortfolioUpdatedEmail(user.email, publicUrl);
    } catch (error) {
      logger.warn("Failed to send portfolio live email", error);
    }
  }

  static async unpublish(userId: string) {
    const publication = await prisma.portfolioPublication.findUnique({ where: { userId } });

    if (!publication) return null;

    const result = await prisma.$transaction(async (tx) => {
      await tx.document.update({
        where: { id: publication.documentId },
        data: { visibility: "PRIVATE" },
      });

      return tx.portfolioPublication.update({
        where: { userId },
        data: {
          status: "SUSPENDED",
          suspensionReason: "user_unpublished",
          suspendedAt: new Date(),
        },
      });
    });

    await Promise.all([
      invalidatePublicPortfolioCaches([publication.subdomain]),
      cacheDel(`document:${userId}:${publication.documentId}`),
      cacheDelByPrefix(documentListCachePrefix(userId)),
    ]);

    void revalidatePublicPortfolios([publication.subdomain]);

    return result;
  }

  static async recordView(subdomain: string, referrer?: string, ipAddress?: string) {
    const publication = await this.getPublicPortfolio(subdomain);

    if (!publication) throw new ApiError(404, "Portfolio not found");

    const redis = getRedis();

    if (ipAddress) {
      const dedupKey = `portfolio:views:dedup:${publication.id}:${hashForAnalytics(ipAddress)}`;
      const isFirstViewInWindow =
        (await redis.set(dedupKey, "1", { NX: true, EX: VIEW_DEDUP_WINDOW_SECONDS })) === "OK";

      if (!isFirstViewInWindow) return;
    }

    const dateKey = utcDay().toISOString().slice(0, 10);
    const referrerHost = normalizeReferrerHost(referrer);

    const key = `portfolio:views:buffer:${dateKey}`;
    let field = `${publication.id}:${referrerHost}`;

    if (!(await redis.hExists(key, field)) && (await redis.hLen(key)) >= MAX_VIEW_BUFFER_FIELDS) {
      field = `${publication.id}:`;
    }
    await redis.hIncrBy(key, field, 1);
    await redis.hIncrBy(`portfolio:views:pending:${publication.id}`, dateKey, 1);
    await redis.expire(key, VIEW_BUFFER_TTL_SECONDS);
    await redis.expire(`portfolio:views:pending:${publication.id}`, VIEW_BUFFER_TTL_SECONDS);
  }

  static async getPendingViewDates() {
    const redis = getRedis();
    const dates = new Set<string>();

    for await (const keys of redis.scanIterator({
      MATCH: "portfolio:views:buffer:*",
      COUNT: 100,
    })) {
      const keyList = Array.isArray(keys) ? keys : [keys];

      for (const key of keyList) {
        const match = /^portfolio:views:buffer:(\d{4}-\d{2}-\d{2})(?::processing)?$/.exec(key);

        if (match) dates.add(match[1]);
      }
    }

    return [...dates].sort();
  }

  static async flushViewsForDate(dateKey: string) {
    const redis = getRedis();
    const key = `portfolio:views:buffer:${dateKey}`;
    const processingKey = `${key}:processing`;
    const batchKey = `${processingKey}:batch-id`;
    const pendingAdjustedKey = `${processingKey}:pending-adjusted`;
    const lockKey = `${key}:flush-lock`;

    // Serialize flush attempts for this date so a manual admin retry overlapping the cron tick
    // (or a rolling deploy briefly running two worker processes) can't race the same batch id and
    // permanently discard that day's buffered views on a unique-constraint rollback.
    const lockAcquired = (await redis.set(lockKey, "1", { NX: true, EX: 120 })) === "OK";

    if (!lockAcquired) return { dateKey, flushedCount: 0, skipped: true as const };

    try {
      if (!(await redis.exists(processingKey))) {
        try {
          await redis.rename(key, processingKey);
        } catch (error) {
          if (error instanceof Error && error.message.includes("no such key"))
            return { dateKey, flushedCount: 0 };

          throw error;
        }
      }

      const data = await redis.hGetAll(processingKey);
      const entries = Object.entries(data);

      if (entries.length === 0) {
        await redis.del([processingKey, batchKey, pendingAdjustedKey]);
        return { dateKey, flushedCount: 0 };
      }

      const date = new Date(`${dateKey}T00:00:00.000Z`);
      await redis.set(batchKey, randomUUID(), { NX: true });
      const batchId = await redis.get(batchKey);

      if (!batchId) throw new Error(`Failed to initialize portfolio views batch for ${dateKey}`);

      const publicationIds = [
        ...new Set(entries.map(([field]) => field.slice(0, field.indexOf(":"))).filter(Boolean)),
      ];
      const survivingPublications = new Set(
        (
          await prisma.portfolioPublication.findMany({
            where: { id: { in: publicationIds } },
            select: { id: true },
          })
        ).map((publication) => publication.id),
      );
      let flushedCount = 0;
      const pendingAdjustments = new Map<string, number>();

      try {
        await prisma.$transaction(async (tx) => {
          await tx.viewFlushBatch.create({ data: { id: batchId, kind: "portfolio" } });

          for (const [field, rawCount] of entries) {
            const separator = field.indexOf(":");
            const publicationId = field.slice(0, separator);
            const referrerHost = field.slice(separator + 1);
            if (!publicationId || !survivingPublications.has(publicationId)) continue;
            const count = parseInt(rawCount, 10) || 0;
            if (count <= 0) continue;
            const pendingKey = `portfolio:views:pending:${publicationId}`;
            pendingAdjustments.set(pendingKey, (pendingAdjustments.get(pendingKey) ?? 0) + count);

            await tx.portfolioViewDaily.upsert({
              where: {
                publicationId_date_referrerHost: {
                  publicationId,
                  date,
                  referrerHost: referrerHost || "",
                },
              },
              create: {
                publicationId,
                date,
                referrerHost: referrerHost || "",
                count,
              },
              update: {
                count: { increment: count },
              },
            });

            flushedCount += count;
          }
        });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
          throw error;
        }

        // We hold the flush lock, so a batch-id collision can only mean a prior attempt already
        // committed this exact batch before crashing without cleaning up Redis. Confirm that
        // rather than assuming it.
        const existingBatch = await prisma.viewFlushBatch.findUnique({ where: { id: batchId } });
        if (!existingBatch) throw error;
      }

      const staleCount = publicationIds.length - survivingPublications.size;
      if (staleCount > 0)
        logger.warn("Discarded portfolio views for deleted publications", { staleCount });

      if (!(await redis.exists(pendingAdjustedKey))) {
        const adjustment = redis.multi();
        for (const [pendingKey, count] of pendingAdjustments) {
          adjustment.hIncrBy(pendingKey, dateKey, -count);
        }
        adjustment.set(pendingAdjustedKey, "1");
        await adjustment.exec();
      }

      await redis.del([processingKey, batchKey, pendingAdjustedKey]);
      return { dateKey, flushedCount };
    } finally {
      await redis.del(lockKey).catch(() => {});
    }
  }

  static async getAnalytics(userId: string) {
    // Visitor analytics is a Creator Pro feature. This is the enforcement point — the
    // dashboard's lock overlay is presentation only, so without this check the numbers
    // were still serialized into the page (and readable straight off the endpoint) for
    // every free account. `canPublish` is the same entitlement the publish path gates on.
    const billing = await BillingService.getSummary(userId);

    if (!billing.canPublish) return { locked: true, totalViews: 0, daily: [], referrers: [] };

    const publication = await prisma.portfolioPublication.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!publication) return { locked: false, totalViews: 0, daily: [], referrers: [] };

    const [totals, daily, referrers] = await Promise.all([
      prisma.portfolioViewDaily.aggregate({
        where: { publicationId: publication.id },
        _sum: { count: true },
      }),

      prisma.portfolioViewDaily.groupBy({
        by: ["date"],
        where: { publicationId: publication.id },
        _sum: { count: true },
        orderBy: { date: "desc" },
        take: 30,
      }),
      prisma.portfolioViewDaily.groupBy({
        by: ["referrerHost"],
        where: { publicationId: publication.id, referrerHost: { not: "" } },
        _sum: { count: true },
        orderBy: { _sum: { count: "desc" } },
        take: 10,
      }),
    ]);

    let totalViews = totals._sum.count ?? 0;
    const dailyMap = new Map<string, number>();

    daily.forEach((item) => {
      const dateStr = item.date.toISOString().slice(0, 10);
      dailyMap.set(dateStr, item._sum.count ?? 0);
    });

    try {
      const pending = await getRedis().hGetAll(`portfolio:views:pending:${publication.id}`);

      for (const [dateStr, rawCount] of Object.entries(pending)) {
        const count = Math.max(0, parseInt(rawCount, 10) || 0);
        totalViews += count;
        dailyMap.set(dateStr, (dailyMap.get(dateStr) ?? 0) + count);
      }
    } catch (err) {
      logger.error("Failed to read buffered portfolio views from Redis", err);
    }

    const sortedDaily = Array.from(dailyMap.entries())
      .map(([dateStr, count]) => ({
        date: new Date(`${dateStr}T00:00:00.000Z`),
        count,
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 30);

    return {
      locked: false,
      totalViews,
      daily: sortedDaily,
      referrers: referrers.map((item) => ({
        host: item.referrerHost,
        count: item._sum.count ?? 0,
      })),
    };
  }
}
