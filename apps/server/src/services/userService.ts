import { Prisma } from "@prisma/client";

import { prisma } from "#lib/prisma";
import { ApiError } from "#lib/errors";

import { cacheGet, cacheSet, cacheDel, cacheDelByPrefix } from "#lib/redis";
import { documentListCachePrefix, userProfileCacheKey } from "#lib/cacheKeys";
import { logger } from "#lib/logger";
import { usernameInvalidReason } from "#utils/slugs";
import { invalidateCacheByToken } from "#utils/authCache";
import {
  invalidatePublicPortfolioCaches,
  revalidatePublicPortfolios,
} from "#utils/portfolioPublicationCache";
import { PortfolioAssetService } from "#services/portfolioAssetService";
import { sendAccountDeletedEmail } from "#services/mail/index";

const userProfileSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  emailVerified: true,
  autoSyncEnabled: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      apiKeys: true,
      shareLinks: true,
      resumes: true,
    },
  },
} satisfies Prisma.UserSelect;

export class UserService {
  static async requireUsernameForUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    if (!user) throw new ApiError(404, "User not found");
    if (!user.username) throw new ApiError(400, "Username required before sharing");

    return user.username;
  }

  /**
   * Get a user by ID with related counts.
   * Results are cached for 30 minutes.
   * @param userId User ID
   */

  static async getUserById(userId: string) {
    const cacheKey = userProfileCacheKey(userId);
    const cached = await cacheGet(cacheKey);

    if (cached) return cached;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: userProfileSelect,
    });

    if (!user) throw new ApiError(404, "User not found");

    await cacheSet(cacheKey, user, 1800);

    return user;
  }

  /**
   * Update a user's name.
   * Invalidates cache upon success.
   * @param userId User ID
   * @param name New name
   */

  static async updateUserName(userId: string, name: string) {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { name },
      select: userProfileSelect,
    });

    await cacheSet(userProfileCacheKey(userId), updated, 1800);

    return updated;
  }

  static async getUsernameAvailability(username: string) {
    const reason = usernameInvalidReason(username);

    if (reason) {
      return { available: false, normalizedUsername: username, reason };
    }

    const existing = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    const available = !existing;

    return {
      available,
      normalizedUsername: username,
      reason: available ? undefined : "taken",
    };
  }

  static async updateUsername(userId: string, username: string) {
    const current = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    });

    if (!current) throw new ApiError(404, "User not found");
    if (current.username === username) return this.getUserById(userId);
    if (current.username) throw new ApiError(409, "Username is locked and cannot be changed");

    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { username },
        select: userProfileSelect,
      });

      await cacheSet(userProfileCacheKey(userId), updated, 1800);
      return updated;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ApiError(409, "Username is already taken");
      }

      throw error;
    }
  }

  static async updateAutoSync(userId: string, enabled: boolean) {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { autoSyncEnabled: enabled },
      select: userProfileSelect,
    });

    await cacheSet(userProfileCacheKey(userId), updated, 1800);
    return updated;
  }

  /**
   * Permanently delete a user account and all associated data across all tables and R2 storage.
   * Satisfies GDPR / DPDP "Right to Erasure".
   * @param userId User ID to delete
   */
  static async deleteUserAccount(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        sessions: { select: { token: true } },
        // Captured before the delete so we can purge the public caches afterwards.
        // Once the row is gone the subdomain is unrecoverable, and a published
        // portfolio left in cache would keep serving a deleted user's page.
        portfolioPublication: { select: { subdomain: true } },
      },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    /**
     * Refuse to delete while billing is live at the provider.
     *
     * We have no way to cancel a Dodo subscription from here — there is no
     * subscription-cancel call anywhere in this codebase, because cancellation happens
     * in Dodo's own customer portal. Deleting the account would therefore drop our
     * Subscription row while the card keeps being charged, and the renewal webhook
     * would arrive for a user that no longer exists, so it could not even be
     * reconciled. The user would be paying for nothing, with no record on our side
     * showing why.
     *
     * Blocking here and telling them to cancel first is the only honest option.
     */
    const liveSubscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] },
        cancelAtPeriodEnd: false,
      },
      select: { id: true },
    });

    if (liveSubscription) {
      throw new ApiError(
        409,
        "Cancel your subscription before deleting your account. Open Billing and use Manage Subscription — we cannot cancel it for you, and deleting now would leave you being charged for an account that no longer exists.",
      );
    }

    /**
     * Order matters here, and it is the reverse of the obvious one.
     *
     * The database delete runs FIRST. R2 objects are unrecoverable, so deleting them
     * before the transaction means a failed transaction leaves the user with an intact
     * account whose images have silently vanished. Deleting the rows first means the
     * worst case is orphaned R2 objects — waste, not data loss for someone who still
     * has an account.
     *
     * `creditUsageAllocation` must go before the user: CreditUsageAllocation.grant is
     * `onDelete: Restrict`, so surviving allocations would block the cascade that
     * removes the user's CreditGrant rows and the whole delete would fail.
     */
    await prisma.$transaction(async (tx) => {
      await tx.creditUsageAllocation.deleteMany({
        where: { transaction: { userId } },
      });

      // Cascades to Document, MasterProfile, ShareLink, PortfolioPublication,
      // CreditWallet, ApiKey, Session, and the affiliate/ambassador records.
      await tx.user.delete({ where: { id: userId } });
    });

    // Best-effort cleanup from here on. The account is already gone, so none of this
    // may throw back to the caller — a failed cache purge or a failed R2 delete must
    // not turn a successful deletion into a 500 the user reads as "it didn't work".
    const subdomain = user.portfolioPublication?.subdomain;

    await Promise.allSettled([
      PortfolioAssetService.deleteAllUserAssets(userId),
      cacheDel(userProfileCacheKey(userId)),
      cacheDelByPrefix(documentListCachePrefix(userId)),
      ...user.sessions.map((session) => invalidateCacheByToken(session.token)),
      ...(subdomain ? [invalidatePublicPortfolioCaches([subdomain])] : []),
    ]);

    if (subdomain) void revalidatePublicPortfolios([subdomain]);

    void sendAccountDeletedEmail(user.email, user.name || "").catch((error) => {
      logger.warn("Failed to send account deletion confirmation email", { error });
    });

    return { success: true };
  }
}
