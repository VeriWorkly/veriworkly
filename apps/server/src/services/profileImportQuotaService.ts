import { Prisma } from "@prisma/client";

import { prisma } from "#lib/prisma";
import { getRedis } from "#lib/redis";
import { EntitlementService, PAID_ACCESS_PHRASE } from "#services/entitlementService";
import { ApiError } from "#lib/errors";
import { logger } from "#lib/logger";
import { githubGet } from "#services/github/requestPath";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// GitHub's authenticated REST rate limit (5,000 req/hour) is shared across every paid import via
// the single server-side config.github.token, plus the GitHub sync cron job. "Unlimited" paid
// imports must still be capped per-user so one account can't exhaust that shared budget and break
// imports/sync for everyone else — this is deliberately generous, not a real usage ceiling.
const PAID_GITHUB_IMPORT_DAILY_LIMIT = 50;

/** One counter per UTC day, so the cap resets at UTC midnight. */
function paidGithubImportKey(userId: string) {
  return `import:paid-github:${userId}:${new Date().toISOString().slice(0, 10)}`;
}

export class ProfileImportQuotaService {
  /**
   * Check user quota status.
   * Paid users: no LinkedIn limit (`unlimited`, `limit` and `remaining` null) and the real daily
   * GitHub cap. Free users get once a month for LinkedIn, once a day for GitHub.
   * `hasGithubAccount` (GitHub only) says whether a GitHub login is linked, whatever GitHub
   * answers about its token (V-197).
   */
  static async checkQuota(userId: string, provider: "linkedin" | "github") {
    const isPaid = await EntitlementService.isPaid(userId);
    const account =
      provider === "github"
        ? await prisma.account.findFirst({
            where: { userId, providerId: "github" },
            select: { accessToken: true },
          })
        : null;
    const githubLink = provider === "github" ? { hasGithubAccount: Boolean(account) } : {};

    if (isPaid && provider === "linkedin") {
      return {
        isPaid: true,
        unlimited: true,
        remaining: null,
        limit: null,
        resetsInSeconds: 0,
        connectedUsername: null,
      };
    }

    if (isPaid) {
      const used = Number(await getRedis().get(paidGithubImportKey(userId))) || 0;
      const nextUtcMidnight = new Date().setUTCHours(24, 0, 0, 0);
      return {
        isPaid: true,
        unlimited: false,
        remaining: Math.max(0, PAID_GITHUB_IMPORT_DAILY_LIMIT - used),
        limit: PAID_GITHUB_IMPORT_DAILY_LIMIT,
        resetsInSeconds: used > 0 ? Math.ceil((nextUtcMidnight - Date.now()) / 1000) : 0,
        connectedUsername: null,
        ...githubLink,
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        lastLinkedinImportAt: true,
        lastGithubImportAt: true,
      },
    });

    let connectedUsername: string | null = null;
    if (provider === "github") {
      if (account?.accessToken) {
        // The username is a nicety on the quota card: with a deadline (V-243), and a failure is
        // logged and shown as no username, never a failed quota read.
        try {
          const response = await githubGet("https://api.github.com/user", account.accessToken);
          if (response.ok) {
            const data = await response.json();
            if (data?.login) {
              connectedUsername = data.login;
            }
          } else {
            logger.warn("GitHub refused the linked token on the import quota lookup", {
              userId,
              status: response.status,
            });
          }
        } catch (error) {
          logger.warn("GitHub could not be reached for the import quota lookup", {
            userId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    const lastImport =
      provider === "linkedin" ? user?.lastLinkedinImportAt : user?.lastGithubImportAt;
    const limitDuration = provider === "linkedin" ? THIRTY_DAYS_MS : ONE_DAY_MS;

    let resetsInSeconds = 0;
    let remaining = 1;

    if (lastImport) {
      const diff = Date.now() - new Date(lastImport).getTime();
      if (diff < limitDuration) {
        remaining = 0;
        resetsInSeconds = Math.ceil((limitDuration - diff) / 1000);
      }
    }

    return {
      isPaid: false,
      unlimited: false,
      remaining,
      limit: 1,
      resetsInSeconds,
      connectedUsername,
      ...githubLink,
    };
  }

  /**
   * Per-user daily cap on paid GitHub imports, independent of the free-tier quota. Protects the
   * single shared config.github.token's rate-limit budget from being exhausted by one account.
   */
  static async consumePaidGithubImportQuota(userId: string) {
    const redis = getRedis();
    const redisKey = paidGithubImportKey(userId);

    // One MULTI (V-114): a crash between INCR and EXPIRE can no longer leave a key with no TTL.
    const [count] = (await redis
      .multi()
      .incr(redisKey)
      .expire(redisKey, 24 * 60 * 60, "NX")
      .exec()) as unknown as [number, number];

    if (count > PAID_GITHUB_IMPORT_DAILY_LIMIT) {
      throw new ApiError(
        429,
        `You've reached the daily limit of ${PAID_GITHUB_IMPORT_DAILY_LIMIT} GitHub imports. ` +
          "This protects the shared GitHub API budget used by all users. Please try again tomorrow.",
      );
    }
  }

  private static quotaExceeded(provider: "linkedin" | "github", resetsInSeconds: number) {
    const providerLabel = provider === "linkedin" ? "LinkedIn" : "GitHub";
    const timeframe = provider === "linkedin" ? "once a month" : "once a day";

    return new ApiError(
      429,
      `Free accounts can import from ${providerLabel} ${timeframe}. Unlimited imports come with ${PAID_ACCESS_PHRASE}.`,
      { resetsInSeconds },
    );
  }

  /**
   * Read-only eligibility check for a free user, run BEFORE the import does anything that
   * costs money or hits a provider. Consumption happens later, inside the import transaction
   * (`consumeFreeQuota`), so a failed fetch or AI call never burns the month's import.
   */
  static async assertQuotaAvailable(userId: string, provider: "linkedin" | "github") {
    const isPaid = await EntitlementService.isPaid(userId);

    if (isPaid) return;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastLinkedinImportAt: true, lastGithubImportAt: true },
    });

    const lastImport =
      provider === "linkedin" ? user?.lastLinkedinImportAt : user?.lastGithubImportAt;
    const limitDuration = provider === "linkedin" ? THIRTY_DAYS_MS : ONE_DAY_MS;

    if (!lastImport) return;

    const elapsed = Date.now() - new Date(lastImport).getTime();

    if (elapsed < limitDuration) {
      throw this.quotaExceeded(provider, Math.ceil((limitDuration - elapsed) / 1000));
    }
  }

  /**
   * Consume a free user's quota. Throws ApiError if quota is exceeded. Takes the import's
   * transaction client so the consumption commits (or rolls back) with the rest of the import.
   * Paid users do not come through here: the GitHub API-budget cap is
   * `consumePaidGithubImportQuota`, taken before the fetch it protects.
   */
  static async consumeFreeQuota(
    userId: string,
    provider: "linkedin" | "github",
    client: Prisma.TransactionClient = prisma,
  ) {
    const now = new Date();
    const limitDuration = provider === "linkedin" ? THIRTY_DAYS_MS : ONE_DAY_MS;
    const cutoff = new Date(now.getTime() - limitDuration);

    // Atomic check-and-consume: the where clause only matches rows that are actually eligible
    // (never imported, or last import outside the window), so a count of 0 unambiguously means
    // quota was already consumed — no separate read-then-write race is possible, mirroring the
    // updateMany + affected-row-count pattern CreditService uses for balance mutations.
    const result =
      provider === "linkedin"
        ? await client.user.updateMany({
            where: {
              id: userId,
              OR: [{ lastLinkedinImportAt: null }, { lastLinkedinImportAt: { lt: cutoff } }],
            },
            data: { lastLinkedinImportAt: now },
          })
        : await client.user.updateMany({
            where: {
              id: userId,
              OR: [{ lastGithubImportAt: null }, { lastGithubImportAt: { lt: cutoff } }],
            },
            data: { lastGithubImportAt: now },
          });

    if (result.count === 0) {
      const status = await this.checkQuota(userId, provider);
      throw this.quotaExceeded(provider, status.resetsInSeconds);
    }
  }
}
