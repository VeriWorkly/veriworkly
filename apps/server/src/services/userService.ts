import { Prisma } from "@prisma/client";

import { prisma } from "#lib/prisma";
import { ApiError } from "#lib/errors";

import { cacheGet, cacheSet, cacheDel } from "#lib/redis";
import { bumpGeneration } from "#lib/cacheGeneration";
import { cacheNamespaces, masterProfileCacheKey, userProfileCacheKey } from "#lib/cacheKeys";
import { logger } from "#lib/logger";
import { usernameInvalidReason } from "#utils/slugs";
import { revokeAllSessionsForUserSafely } from "#auth/sessions";
import {
  invalidatePublicPortfolioCaches,
  revalidatePublicPortfolios,
} from "#utils/portfolioPublicationCache";
import { invalidateAffiliate, invalidateLeaderboards } from "#services/affiliate/cache";
import { AFFILIATE_WALLET_CURRENCY } from "#services/affiliate/constants";
import { ADMIN_AUDIT_ACTIONS } from "#services/admin/adminAuditService";
import { ApiKeyService } from "#services/apiKeyService";
import { CreditService } from "#services/creditService";
import { redactBillingEventsForUser, redactBillingTextForUser } from "#services/deletedAccount";
import { EntitlementService } from "#services/entitlementService";
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
      // The "Documents" figure on the account page (V-186): what the documents list shows, so
      // no soft-deleted (or purged, which are soft-deleted too) rows and no portfolio rows.
      resumes: { where: { deletedAt: null, type: { not: "PORTFOLIO" } } },
    },
  },
} satisfies Prisma.UserSelect;

/**
 * Everything a user deletion removes inside ONE transaction. Shared by the self-service path
 * and the admin path so neither can drift from the other again.
 *
 * Billing records are kept, not deleted (owner decision 5, V-183): Subscription,
 * EntitlementGrant, CreditWallet, CreditTransaction, CreditGrant (and so their allocations) and
 * BillingWebhookEvent have `onDelete: SetNull`, so the cascade detaches them. Pending credit
 * reservations do cascade (they are requests in flight, not money moved), so the wallet's
 * `reserved` total is cleared first; otherwise the detached wallet would hold credits against
 * reservations that no longer exist.
 */
export async function deleteUserCascade(
  tx: Prisma.TransactionClient,
  userId: string,
  options: {
    /** The user has not confirmed losing an affiliate balance: refuse if there is one (V-234). */
    requireAffiliateForfeitConfirmation?: boolean;
    /**
     * The balance the user saw and confirmed: a locked balance above it refuses the deletion again,
     * so money that arrived after the warning is never lost unseen.
     */
    confirmedAffiliateForfeitCents?: number;
    /** Who deletes: an admin, or null for the account owner. Recorded on the forfeit entry. */
    actorId?: string | null;
  } = {},
) {
  // The affiliate balance this deletion forfeits, read with the wallet row locked: a commission
  // released after the pre-check is either in this amount or waits for the deletion to commit.
  const [wallet] = await tx.$queryRaw<
    Array<{ availableCents: number; pendingCents: number; clawbackCents: number }>
  >`
    SELECT "availableCents", "pendingCents", "clawbackCents" FROM "AffiliateWallet"
    WHERE "userId" = ${userId} FOR UPDATE`;
  const forfeit = affiliateForfeit(wallet);
  if (forfeitRefused(forfeit, options)) throw affiliateForfeitError(forfeit);

  await tx.creditWallet.updateMany({ where: { userId }, data: { reserved: 0 } });
  // The kept billing events lose the personal data the provider sent in them (decision 5).
  await redactBillingEventsForUser(tx, userId);
  await redactBillingTextForUser(tx, userId);
  // Commissions not yet paid go with the account (owner decision 10, V-234): marked REVERSED, so a
  // detached row is never counted as money owed to someone who no longer exists.
  const reversed = await tx.affiliateCommission.updateMany({
    where: { affiliateId: userId, status: { in: ["PENDING", "AVAILABLE"] } },
    data: { status: "REVERSED", reversedAt: new Date(), reason: AFFILIATE_FORFEIT_REASON },
  });

  // Cascades to Document, MasterProfile, ShareLink, PortfolioPublication, CreditReservation,
  // ApiKey, Session, and the affiliate/ambassador records; detaches the billing rows above.
  await tx.user.delete({ where: { id: userId } });

  // What was forfeited, kept as a money record (written after the delete, so the account's
  // redaction does not touch it; the owner deleting their own account is recorded as no actor).
  if (forfeit.amountCents > 0 || reversed.count > 0)
    await tx.adminAuditEntry.create({
      data: {
        actorId: options.actorId ?? null,
        action: ADMIN_AUDIT_ACTIONS.affiliateBalanceForfeit,
        targetType: "User",
        targetId: userId,
        // The claw-back the affiliate still owed goes unrecovered with the account.
        metadata: {
          ...forfeit,
          clawbackCents: Math.max(wallet?.clawbackCents ?? 0, 0),
          commissionsReversed: reversed.count,
        },
      },
    });
}

/** An affiliate wallet's unpaid balance, as the forfeit 409 and its audit entry state it. */
function affiliateForfeit(
  wallet: { availableCents: number; pendingCents: number } | undefined | null,
) {
  const availableCents = Math.max(wallet?.availableCents ?? 0, 0);
  const pendingCents = Math.max(wallet?.pendingCents ?? 0, 0);
  return {
    amountCents: availableCents + pendingCents,
    currency: AFFILIATE_WALLET_CURRENCY,
    availableCents,
    pendingCents,
  };
}

/**
 * Whether an unpaid balance stops the deletion: unconfirmed, or above the amount the user confirmed
 * (a client that sends only the boolean confirms whatever is there, as before).
 */
function forfeitRefused(
  forfeit: ReturnType<typeof affiliateForfeit>,
  options: {
    requireAffiliateForfeitConfirmation?: boolean;
    confirmedAffiliateForfeitCents?: number;
  },
) {
  if (forfeit.amountCents <= 0) return false;
  if (options.requireAffiliateForfeitConfirmation) return true;
  return (
    options.confirmedAffiliateForfeitCents !== undefined &&
    forfeit.amountCents > options.confirmedAffiliateForfeitCents
  );
}

function affiliateForfeitError(forfeit: ReturnType<typeof affiliateForfeit>) {
  return new ApiError(
    409,
    `You have ${(forfeit.amountCents / 100).toFixed(2)} USD in unpaid affiliate commissions. Deleting your account forfeits it. Confirm to delete anyway.`,
    { code: "AFFILIATE_BALANCE_FORFEIT", ...forfeit },
  );
}

const AFFILIATE_FORFEIT_REASON = "Forfeited when the account was deleted";

/** Provider statuses under which Dodo can still charge the card. */
const CHARGEABLE_RAW_STATUSES = ["active", "on_hold", "past_due", "paused"] as const;
/**
 * How long an unpaid (`pending`) subscription can still turn into a charge: the life of the
 * checkout session that created it (24 hours, the same as the checkout record in billingService).
 */
const PENDING_CHECKOUT_LIFETIME_MS = 24 * 60 * 60 * 1000;

/**
 * The subscription that would keep charging the card after the account is gone, or `null`.
 *
 * Decision (V-168, V-169): deletion is allowed only when nothing will be charged again, judged
 * on the provider's state as mirrored by the webhooks (`rawStatus`), not on our labels: an admin
 * can edit `status` and `cancelAtPeriodEnd` without Dodo being told, so a row whose `rawStatus`
 * is known is judged on that alone. It counts as live while the provider reports it active
 * (including a scheduled cancellation, which the customer can still undo in the portal), in
 * dunning or paused (`on_hold`, `past_due`, `paused`: Dodo keeps retrying the card), or not yet
 * paid (`pending`, while its checkout can still be paid: a pending row last heard of more than
 * `PENDING_CHECKOUT_LIFETIME_MS` ago is an abandoned checkout). Only a subscription the provider
 * has cancelled, expired or failed lets the account go. A row with no `rawStatus` (made by hand)
 * falls back to its label: ACTIVE or PAST_DUE is live.
 */
export async function findChargeableSubscription(userId: string, now = new Date()) {
  const pendingSince = new Date(now.getTime() - PENDING_CHECKOUT_LIFETIME_MS);
  return prisma.subscription.findFirst({
    where: {
      userId,
      OR: [
        { rawStatus: { in: [...CHARGEABLE_RAW_STATUSES] } },
        {
          rawStatus: "pending",
          OR: [
            { lastWebhookAt: { gte: pendingSince } },
            { lastWebhookAt: null, createdAt: { gte: pendingSince } },
          ],
        },
        { rawStatus: null, status: { in: ["ACTIVE", "PAST_DUE"] } },
      ],
    },
    orderBy: { currentPeriodEnd: "desc" },
    select: {
      id: true,
      status: true,
      rawStatus: true,
      productKey: true,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: true,
    },
  });
}

type ChargeableSubscription = NonNullable<Awaited<ReturnType<typeof findChargeableSubscription>>>;

function formatDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** The 409 the account owner reads: what is blocking deletion and what to do about it. */
export function chargeableSubscriptionMessage(subscription: ChargeableSubscription) {
  if (subscription.status === "ACTIVE" && subscription.cancelAtPeriodEnd)
    return subscription.currentPeriodEnd
      ? `Your subscription is cancelled and ends on ${formatDay(subscription.currentPeriodEnd)}. You can delete your account once it has ended. If you need it deleted sooner, contact support.`
      : "Your subscription is cancelled but has not ended yet. You can delete your account once it has ended. If you need it deleted sooner, contact support.";

  return "Cancel your subscription before deleting your account: open Billing and use Manage Subscription. We cannot cancel it for you, and deleting now would leave you being charged for an account that no longer exists. Once the subscription has ended you can delete your account.";
}

type DeletedUserCacheTargets = {
  userId: string;
  username: string | null;
  documentIds: string[];
  /** Share-link slugs and document slugs: `share:public-readable` is cached under both. */
  publicSlugs: string[];
  subdomain: string | null;
};

/**
 * Read before the delete: once the rows are gone there is no way to name the exact keys
 * (`share:public-readable:{username}:{slug}` in particular keeps serving a deleted user's
 * snapshot for up to an hour otherwise).
 */
export async function readDeletedUserCacheTargets(
  userId: string,
): Promise<DeletedUserCacheTargets | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      username: true,
      resumes: { select: { id: true, slug: true } },
      shareLinks: { select: { slug: true } },
      portfolioPublication: { select: { subdomain: true } },
    },
  });

  if (!user) return null;

  return {
    userId,
    username: user.username,
    documentIds: user.resumes.map((document) => document.id),
    publicSlugs: [
      ...new Set([
        ...user.shareLinks.map((share) => share.slug),
        ...user.resumes.map((document) => document.slug),
      ]),
    ],
    subdomain: user.portfolioPublication?.subdomain ?? null,
  };
}

/**
 * Every per-user cache entry the server writes, dropped after the rows are gone. Best effort:
 * the account is already deleted, so nothing here may throw back to the caller.
 */
export async function purgeDeletedUserCaches(targets: DeletedUserCacheTargets): Promise<void> {
  const { userId, username } = targets;

  await Promise.allSettled([
    cacheDel(userProfileCacheKey(userId)),
    cacheDel(masterProfileCacheKey(userId)),
    // One round trip of INCRs: every document, list and public share variant goes dark at once.
    bumpGeneration(
      ...targets.documentIds.map((documentId) => cacheNamespaces.document(userId, documentId)),
      ...(username ? [cacheNamespaces.publicShare(username)] : []),
      cacheNamespaces.documentList(userId),
      cacheNamespaces.shareList(userId),
      cacheNamespaces.sharedDocumentIds(userId),
    ),
    // credits:summary, credits:history and billing:summary.
    CreditService.invalidate(userId),
    EntitlementService.invalidateEntitlements(userId),
    cacheDel(`billing:history:${userId}`),
    invalidateAffiliate(userId, true),
    ...(targets.subdomain ? [invalidatePublicPortfolioCaches([targets.subdomain])] : []),
  ]);
}

/**
 * After a write to the user row: the account read (`user:profile:v2`) is replaced with the new
 * row, and the master-profile read (`profile:{userId}`, an hour) is dropped, because its summary
 * repeats `name` and `autoSyncEnabled` (V-031). A name or username change also drops the public
 * affiliate leaderboards, which show both for five minutes.
 */
async function refreshUserCaches(
  userId: string,
  updated: unknown,
  { identityChanged = false }: { identityChanged?: boolean } = {},
) {
  await Promise.all([
    cacheSet(userProfileCacheKey(userId), updated, 1800),
    cacheDel(masterProfileCacheKey(userId)),
    ...(identityChanged ? [invalidateLeaderboards()] : []),
  ]);
}

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

    await refreshUserCaches(userId, updated, { identityChanged: true });

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

      await refreshUserCaches(userId, updated, { identityChanged: true });
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

    await refreshUserCaches(userId, updated);
    return updated;
  }

  /**
   * Permanently delete a user account and all associated data across all tables and R2 storage.
   * Satisfies GDPR / DPDP "Right to Erasure".
   * @param userId User ID to delete
   */
  static async deleteUserAccount(
    userId: string,
    options: {
      /** The user saw the unpaid affiliate balance and agreed to lose it (owner decision 10). */
      confirmAffiliateForfeit?: boolean;
      /** The amount the user was shown, in cents; optional for clients that send only the flag. */
      confirmedAffiliateForfeitCents?: number;
    } = {},
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Captured before the delete so the exact cache keys can be purged afterwards. Once the
    // rows are gone the username, slugs and subdomain are unrecoverable, and a cached share
    // snapshot or published portfolio would keep serving a deleted user's page.
    const cacheTargets = await readDeletedUserCacheTargets(userId);

    // Same reason for the R2 keys: `PortfolioAsset.user` cascades, so once the transaction
    // commits there is no row left to say which objects were this user's (V-018).
    const assetKeys = (
      await prisma.portfolioAsset.findMany({ where: { userId }, select: { key: true } })
    ).map((asset) => asset.key);

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
     * Blocking here and telling them to cancel first is the only honest option. What counts
     * as "still billing" is decided in `findChargeableSubscription`.
     */
    const liveSubscription = await findChargeableSubscription(userId);

    if (liveSubscription) {
      throw new ApiError(409, chargeableSubscriptionMessage(liveSubscription));
    }

    /**
     * Refuse to delete while a withdrawal is open. The cascade would remove a REQUESTED or
     * APPROVED `AffiliateWithdrawal` the admin is about to pay (or has already sent money for),
     * leaving no record of the payout on our side.
     */
    const openWithdrawal = await prisma.affiliateWithdrawal.findFirst({
      where: { userId, status: { in: ["REQUESTED", "APPROVED"] } },
      select: { id: true },
    });

    if (openWithdrawal) {
      throw new ApiError(
        409,
        "You have a withdrawal in progress. Wait for it to be paid or rejected before deleting your account.",
      );
    }

    /**
     * An unpaid affiliate balance is forfeited with the account (owner decision 10, V-234): allowed,
     * but only once the user has been told how much. Without the confirmation the request is refused
     * with the amount, so the studio can show it and send the request again with
     * `confirmAffiliateForfeit: true`.
     */
    const forfeit = affiliateForfeit(
      await prisma.affiliateWallet.findUnique({
        where: { userId },
        select: { availableCents: true, pendingCents: true },
      }),
    );
    const forfeitOptions = {
      requireAffiliateForfeitConfirmation: !options.confirmAffiliateForfeit,
      confirmedAffiliateForfeitCents: options.confirmedAffiliateForfeitCents,
    };
    if (forfeitRefused(forfeit, forfeitOptions)) throw affiliateForfeitError(forfeit);

    // The API-key auth cache (`apikey:auth:{hash}`, TTL 300 s) can only be found through the
    // ApiKey rows, so it has to be purged while they still exist; afterwards a deleted
    // account's keys would keep authenticating for five minutes. A plain DEL is not enough: a
    // validation that read the row just before the cascade can re-cache it, so each key gets
    // the revoked marker first (V-122).
    await ApiKeyService.markAllRevokedForUser(userId);

    // better-auth's `findSession` reads its Redis entry before Postgres, so the cascade below
    // deleting the Session rows signs nobody out on its own. Revoke first, while the tokens
    // can still be read; this also clears the `active-sessions-{userId}` index and this app's
    // `auth:session:*` cache. If the transaction then fails the user is signed out but still
    // exists, which is the safer side to err on.
    await revokeAllSessionsForUserSafely(userId);

    /**
     * Order matters here, and it is the reverse of the obvious one.
     *
     * The database delete runs FIRST. R2 objects are unrecoverable, so deleting them
     * before the transaction means a failed transaction leaves the user with an intact
     * account whose images have silently vanished. Deleting the rows first means the
     * worst case is orphaned R2 objects — waste, not data loss for someone who still
     * has an account.
     */
    // The forfeit is checked again under the wallet lock: a balance that appeared after the check
    // above, unconfirmed, refuses the deletion rather than vanish with it.
    await prisma.$transaction((tx) =>
      deleteUserCascade(tx, userId, { ...forfeitOptions, actorId: null }),
    );

    // Best-effort cleanup from here on. The account is already gone, so none of this
    // may throw back to the caller — a failed cache purge or a failed R2 delete must
    // not turn a successful deletion into a 500 the user reads as "it didn't work".
    const subdomain = cacheTargets?.subdomain ?? null;

    await Promise.allSettled([
      PortfolioAssetService.deleteAssetKeys(assetKeys),
      ...(cacheTargets ? [purgeDeletedUserCaches(cacheTargets)] : []),
    ]);

    if (subdomain) void revalidatePublicPortfolios([subdomain]);

    void sendAccountDeletedEmail(user.email, user.name || "").catch((error) => {
      logger.warn("Failed to send account deletion confirmation email", { error });
    });

    return { success: true };
  }
}
