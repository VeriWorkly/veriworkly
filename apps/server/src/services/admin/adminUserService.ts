import type { Prisma } from "@prisma/client";

import { prisma } from "#lib/prisma";
import { ApiError } from "#lib/errors";
import { cacheDel } from "#lib/redis";
import { isAdminUser } from "#lib/isAdminUser";
import { bumpGeneration } from "#lib/cacheGeneration";
import { cacheNamespaces, userProfileCacheKey } from "#lib/cacheKeys";
import { revokeAllSessionsForUser, revokeAllSessionsForUserSafely } from "#auth/sessions";
import { ApiKeyService } from "#services/apiKeyService";
import {
  ADMIN_AUDIT_ACTIONS,
  writeAdminAudit,
  type AdminAuditInput,
  getAuditHistory,
} from "#services/admin/adminAuditService";
import {
  ACCOUNT_DELETION_TRANSACTION,
  assertNoOpenCheckout,
  deleteUserCascade,
  findChargeableSubscription,
  finishAccountDeletion,
  readDeletedUserCacheTargets,
} from "#services/userService";

import type {
  AdminUserListQuery,
  AdminUserUpdateInput,
} from "#validators/admin/adminUserValidator";
import { listPage } from "#utils/pagination";
import { invalidateLeaderboards } from "#services/affiliate/cache";
import { describeAccessForUsers } from "#services/billingService";

const USER_LIST_SELECT = {
  id: true,
  email: true,
  name: true,
  username: true,
  image: true,
  role: true,
  emailVerified: true,
  ambassadorStatus: true,
  affiliateStatus: true,
  affiliateTier: true,
  affiliateCode: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

/** Documents the user has, not the ones in their trash (V-271). */
const LIVE_DOCUMENTS = { where: { deletedAt: null } } satisfies Prisma.User$resumesArgs;

const SUBSCRIPTION_ACTIVE_STATUSES = ["ACTIVE", "PAST_DUE"] as const;

function buildUserOrderBy(sort: AdminUserListQuery["sort"]): Prisma.UserOrderByWithRelationInput {
  switch (sort) {
    case "oldest":
      return { createdAt: "asc" };
    case "name":
      return { name: "asc" };
    case "email":
      return { email: "asc" };
    default:
      return { createdAt: "desc" };
  }
}

function buildUserWhere(query: AdminUserListQuery): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {
    ...(query.role ? { role: query.role } : {}),
    ...(query.affiliateStatus ? { affiliateStatus: query.affiliateStatus } : {}),
    ...(query.ambassadorStatus ? { ambassadorStatus: query.ambassadorStatus } : {}),
  };

  if (query.query) {
    where.OR = [
      { email: { contains: query.query, mode: "insensitive" } },
      { name: { contains: query.query, mode: "insensitive" } },
      { username: { contains: query.query, mode: "insensitive" } },
      { id: query.query },
      { affiliateCode: { equals: query.query, mode: "insensitive" } },
    ];
  }

  // "NONE" means "has no subscription row in a paying state", which is a `none` filter rather
  // than a status equality — a churned user still owns a CANCELED row.
  if (query.subscription === "NONE") {
    where.subscriptions = {
      none: { status: { in: [...SUBSCRIPTION_ACTIVE_STATUSES] } },
    };
  } else if (query.subscription) {
    where.subscriptions = { some: { status: query.subscription } };
  }

  return where;
}

export async function listUsers(query: AdminUserListQuery) {
  const where = buildUserWhere(query);

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        ...USER_LIST_SELECT,
        _count: { select: { resumes: LIVE_DOCUMENTS, apiKeys: true, sessions: true } },
        subscriptions: {
          where: { status: { in: [...SUBSCRIPTION_ACTIVE_STATUSES] } },
          select: { productKey: true, status: true, currentPeriodEnd: true },
          orderBy: { updatedAt: "desc" },
          take: 1,
        },
        portfolioPublication: { select: { subdomain: true, status: true } },
        creditWallet: { select: { balance: true } },
      },
      orderBy: buildUserOrderBy(query.sort),
      take: query.limit,
      skip: query.offset,
    }),
    prisma.user.count({ where }),
  ]);

  // The customer's own access summary, the one the billing page shows (V-266): a pass holder or
  // a pack buyer is never read off `subscription` alone as free. One batch for the whole page.
  const access = await describeAccessForUsers(items.map((item) => item.id));

  return listPage(
    items.map(({ subscriptions, creditWallet, ...user }) => ({
      ...user,
      subscription: subscriptions[0] ?? null,
      creditBalance: creditWallet?.balance ?? 0,
      access: access.get(user.id) ?? null,
    })),
    total,
    query,
  );
}

/**
 * The full 360° view backing `/admin/users/:id`. Everything an operator needs to answer a
 * support ticket is fetched in one round trip so the detail page never fans out to six
 * separate admin endpoints (and never renders half-loaded).
 */
export async function getUserDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...USER_LIST_SELECT,
      autoSyncEnabled: true,
      affiliateEnrolledAt: true,
      lastGithubImportAt: true,
      lastLinkedinImportAt: true,
      _count: {
        select: {
          resumes: LIVE_DOCUMENTS,
          shareLinks: true,
          apiKeys: true,
          sessions: true,
          affiliateReferrals: true,
          portfolioAssets: true,
        },
      },
    },
  });

  if (!user) throw new ApiError(404, "User not found.");

  const [
    subscriptions,
    entitlements,
    wallet,
    creditTransactions,
    documents,
    publication,
    ambassadorApplication,
    affiliateWallet,
    withdrawals,
    apiKeys,
    sessions,
    auditEntries,
    access,
  ] = await Promise.all([
    prisma.subscription.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    prisma.entitlementGrant.findMany({
      where: { userId, revokedAt: null },
      orderBy: { startsAt: "desc" },
      take: 25,
    }),
    prisma.creditWallet.findUnique({ where: { userId } }),
    prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.document.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        type: true,
        slug: true,
        visibility: true,
        updatedAt: true,
        deletedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 25,
    }),
    prisma.portfolioPublication.findUnique({
      where: { userId },
      select: {
        id: true,
        subdomain: true,
        status: true,
        templateId: true,
        publishedAt: true,
        updatedAt: true,
        suspensionReason: true,
        suspendedAt: true,
      },
    }),
    prisma.ambassadorApplication.findUnique({ where: { userId } }),
    prisma.affiliateWallet.findUnique({ where: { userId } }),
    prisma.affiliateWithdrawal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.apiKey.findMany({
      where: { userId },
      // keyHash is never selected anywhere in the admin surface.
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        keySuffix: true,
        scopes: true,
        isActive: true,
        rateLimit: true,
        expiresAt: true,
        revokedAt: true,
        lastUsed: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.session.findMany({
      where: { userId },
      select: { id: true, ipAddress: true, userAgent: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    getAuditHistory("User", userId),
    describeAccessForUsers([userId]),
  ]);

  return {
    user,
    /** What the customer's own billing summary says they have (V-266). */
    access: access.get(userId) ?? null,
    subscriptions,
    entitlements,
    credits: {
      wallet,
      transactions: creditTransactions,
    },
    documents,
    publication,
    ambassadorApplication,
    affiliate: {
      wallet: affiliateWallet,
      withdrawals,
    },
    apiKeys,
    sessions,
    auditEntries,
  };
}

/**
 * Guards any write that would strip privileges from the account named by `ADMIN_EMAIL`.
 * Without this, one bad row action locks every operator out of the admin surface, and the
 * only recovery is a manual database edit.
 */
async function assertNotProtectedAdmin(userId: string, operation: string) {
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  if (!target) throw new ApiError(404, "User not found.");

  if (isAdminUser(target.email))
    throw new ApiError(403, `The configured admin account cannot be ${operation}.`);

  return target;
}

/**
 * The fields of a PATCH that would lock the `ADMIN_EMAIL` account out of the panel (V-073):
 * `adminAuth` requires that account's row to be verified, and a demotion is the other
 * privilege strip. Name, username and sync settings are harmless and stay editable.
 */
function lockoutOperation(input: AdminUserUpdateInput, currentRole: string) {
  if (input.emailVerified === false) return "marked unverified";
  if (input.role && input.role !== currentRole) return "have its role changed";
  return null;
}

/**
 * Profile and privilege edits. The audit entry is written in the same transaction as the
 * update, so a role change can never commit without its record (V-074).
 */
export async function updateUser(
  userId: string,
  input: AdminUserUpdateInput,
  audit: { actorId: string; reason?: string | null },
) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, username: true },
  });

  if (!existing) throw new ApiError(404, "User not found.");

  const lockout = lockoutOperation(input, existing.role);
  if (lockout && isAdminUser(existing.email))
    throw new ApiError(403, `The configured admin account cannot be ${lockout}.`);

  if (input.username && input.username !== existing.username) {
    const taken = await prisma.user.findFirst({
      where: { username: { equals: input.username, mode: "insensitive" }, id: { not: userId } },
      select: { id: true },
    });

    if (taken) throw new ApiError(409, "That username is already taken.");
  }

  const roleChanged = Boolean(input.role && input.role !== existing.role);

  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.username !== undefined ? { username: input.username } : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.emailVerified !== undefined ? { emailVerified: input.emailVerified } : {}),
        ...(input.autoSyncEnabled !== undefined ? { autoSyncEnabled: input.autoSyncEnabled } : {}),
      },
      select: USER_LIST_SELECT,
    });
    await writeAdminAudit(tx, {
      actorId: audit.actorId,
      action: roleChanged ? ADMIN_AUDIT_ACTIONS.userRoleChange : ADMIN_AUDIT_ACTIONS.userUpdate,
      targetType: "User",
      targetId: userId,
      reason: audit.reason,
      metadata: {
        ...(input.role ? { previousRole: existing.role, nextRole: input.role } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.username !== undefined ? { username: input.username } : {}),
        ...(input.emailVerified !== undefined ? { emailVerified: input.emailVerified } : {}),
        ...(input.autoSyncEnabled !== undefined ? { autoSyncEnabled: input.autoSyncEnabled } : {}),
      },
    });
    return user;
  });

  // As the user-side writes do (V-031): the master-profile summary repeats name and auto-sync,
  // and the public affiliate leaderboards show name and username.
  const renamed = input.username !== undefined && input.username !== existing.username;

  await Promise.all([
    cacheDel(userProfileCacheKey(userId)),
    bumpGeneration(cacheNamespaces.masterProfile(userId)),
    ...(input.name !== undefined || input.username !== undefined ? [invalidateLeaderboards()] : []),
    // Public share pages are cached under the username: the old name stops resolving at once, and
    // a cached 404 under the new one is dropped (V-233).
    ...(renamed
      ? [
          bumpGeneration(
            ...[existing.username, input.username]
              .filter((name): name is string => Boolean(name))
              .map((name) => cacheNamespaces.publicShare(name)),
            cacheNamespaces.shareList(userId),
          ),
        ]
      : []),
  ]);

  return { user: updated, previousRole: existing.role, roleChanged };
}

/**
 * Signs the user out everywhere. Used both on its own and as the tail of a role change —
 * a demoted user keeps their old claims until their cached session expires otherwise.
 */
export async function revokeUserSessions(userId: string) {
  const revoked = await revokeAllSessionsForUser(userId);
  await cacheDel(userProfileCacheKey(userId));

  return { revoked };
}

/**
 * Permanent deletion. The audit entry commits in the cascade's transaction: a deletion that
 * happened is always on record, and one that was refused never is (V-074).
 */
export async function deleteUser(userId: string, confirmEmail: string, audit: AdminAuditInput) {
  const target = await assertNotProtectedAdmin(userId, "deleted");

  if (target.email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase())
    throw new ApiError(400, "The confirmation email does not match this account.");

  // Same guard as self-service deletion (V-168): deleting the account does not stop Dodo
  // charging the card, and nothing here can cancel the subscription at the provider.
  const liveSubscription = await findChargeableSubscription(userId);

  if (liveSubscription)
    throw new ApiError(
      409,
      `This account has a subscription that can still be charged (${liveSubscription.id}, ${liveSubscription.productKey}, ${liveSubscription.status}${liveSubscription.cancelAtPeriodEnd ? ", cancelling at period end" : ""}${liveSubscription.currentPeriodEnd ? `, period ends ${liveSubscription.currentPeriodEnd.toISOString().slice(0, 10)}` : ""}). Cancel it in the Dodo dashboard and wait for the cancellation webhook, or for the period to end, before deleting the account.`,
    );

  // An admin can settle an abandoned session with the provider instead of waiting out its day.
  await assertNoOpenCheckout(userId, { askProvider: true });

  // The cascade would drop a withdrawal that is still being paid; the admin resolves it first.
  const openWithdrawal = await prisma.affiliateWithdrawal.findFirst({
    where: { userId, status: { in: ["REQUESTED", "APPROVED"] } },
    select: { id: true, status: true, amountCents: true, currency: true },
  });

  if (openWithdrawal)
    throw new ApiError(
      409,
      `This account has an open affiliate withdrawal (${openWithdrawal.id}, ${openWithdrawal.status}, ${openWithdrawal.amountCents} ${openWithdrawal.currency} cents). Pay or reject it before deleting the account.`,
    );

  // Read while the rows still exist: the exact cache keys are named after them.
  const cacheTargets = await readDeletedUserCacheTargets(userId);

  // Same for the R2 keys: `PortfolioAsset.user` cascades, so after the commit nothing says
  // which objects were this user's (V-018).
  const assetKeys = (
    await prisma.portfolioAsset.findMany({ where: { userId }, select: { key: true } })
  ).map((asset) => asset.key);

  // Both caches must be purged *before* the cascade removes the rows they are found through —
  // otherwise the API keys' `apikey:auth:*` entries and the sessions' better-auth Redis entries
  // outlive the account and keep authenticating. The keys get the revoked marker, not a plain
  // DEL, so a validation racing the cascade cannot re-cache them (V-122). If the transaction
  // below then fails the user is signed out but still exists, which is the safer side to err on.
  await ApiKeyService.markAllRevokedForUser(userId);
  await revokeAllSessionsForUserSafely(userId);

  // Same transaction body as self-service deletion (allocation pre-delete + user cascade),
  // plus the audit row. `AdminAuditEntry.targetId` is not a foreign key, so it survives the
  // row it names. Written after the cascade, whose redaction of entries about the user would
  // otherwise replace this deletion's own reason (V-231).
  await prisma.$transaction(async (tx) => {
    await deleteUserCascade(tx, userId, { actorId: audit.actorId });
    await writeAdminAudit(tx, audit);
  }, ACCOUNT_DELETION_TRANSACTION);

  // Best effort from here on: the account is gone, so nothing may throw back to the admin. The
  // same tail as self-deletion (V-232): the public portfolio is revalidated and the person is told.
  await finishAccountDeletion({
    cacheTargets,
    assetKeys,
    email: target.email,
    name: target.name ?? null,
  });

  return { id: userId, email: target.email };
}
