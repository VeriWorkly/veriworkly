import { prisma } from "#lib/prisma";
import { EntitlementService } from "#services/entitlementService";
import { ApiError } from "#lib/errors";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export class ProfileImportQuotaService {
  /**
   * Check user quota status.
   * Paid users get unlimited.
   * Free users get once a month for LinkedIn, once a day for GitHub.
   */
  static async checkQuota(userId: string, provider: "linkedin" | "github") {
    const isPaid =
      (await EntitlementService.has(userId, "ai_credits")) ||
      (await EntitlementService.has(userId, "portfolio_publish"));

    if (isPaid) {
      return {
        isPaid: true,
        remaining: 9999,
        limit: 9999,
        resetsInSeconds: 0,
        connectedUsername: null,
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
      const account = await prisma.account.findFirst({
        where: { userId, providerId: "github" },
        select: { accessToken: true },
      });
      if (account?.accessToken) {
        try {
          const response = await fetch("https://api.github.com/user", {
            headers: {
              Accept: "application/vnd.github+json",
              Authorization: `Bearer ${account.accessToken}`,
              "User-Agent": "VeriWorkly-App",
            },
          });
          if (response.ok) {
            const data = await response.json();
            if (data?.login) {
              connectedUsername = data.login;
            }
          }
        } catch {
          // ignore API errors
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
      remaining,
      limit: 1,
      resetsInSeconds,
      connectedUsername,
    };
  }

  /**
   * Consume user quota. Throws ApiError if quota is exceeded.
   */
  static async consumeQuota(userId: string, provider: "linkedin" | "github") {
    const status = await this.checkQuota(userId, provider);
    if (status.isPaid) return;

    if (status.remaining <= 0) {
      const providerLabel = provider === "linkedin" ? "LinkedIn" : "GitHub";
      const timeframe = provider === "linkedin" ? "once a month" : "once a day";
      throw new ApiError(
        429,
        `Free users can only import from ${providerLabel} ${timeframe}. Upgrade to Creator Pro for unlimited imports.`,
        { resetsInSeconds: status.resetsInSeconds },
      );
    }

    if (provider === "linkedin") {
      await prisma.user.update({
        where: { id: userId },
        data: { lastLinkedinImportAt: new Date() },
      });
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: { lastGithubImportAt: new Date() },
      });
    }
  }
}
