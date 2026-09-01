import type { Prisma } from "@prisma/client";

import { prisma } from "#lib/prisma";
import { ApiError } from "#lib/errors";
import { cacheDel } from "#lib/redis";
import { isAdminUser } from "#lib/isAdminUser";
import { userProfileCacheKey } from "#lib/cacheKeys";
import { revokeAllSessionsForUser, revokeAllSessionsForUserSafely } from "#auth/sessions";

import type {
  AdminUserListQuery,
  AdminUserUpdateInput,
} from "#validators/admin/adminUserValidator";

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
        _count: { select: { resumes: true, apiKeys: true, sessions: true } },
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

  return {
    items: items.map(({ subscriptions, creditWallet, ...user }) => ({
      ...user,
      subscription: subscriptions[0] ?? null,
      creditBalance: creditWallet?.balance ?? 0,
    })),
    total,
    limit: query.limit,
    offset: query.offset,
  };
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
          resumes: true,
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
    prisma.adminAuditEntry.findMany({
      where: { targetType: "User", targetId: userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { actor: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  return {
    user,
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
    select: { email: true },
  });

  if (!target) throw new ApiError(404, "User not found.");

  if (isAdminUser(target.email))
    throw new ApiError(403, `The configured admin account cannot be ${operation}.`);

  return target;
}

export async function updateUser(userId: string, input: AdminUserUpdateInput) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, username: true },
  });

  if (!existing) throw new ApiError(404, "User not found.");

  if (input.role && input.role !== existing.role && isAdminUser(existing.email))
    throw new ApiError(403, "The configured admin account cannot have its role changed.");

  if (input.username && input.username !== existing.username) {
    const taken = await prisma.user.findFirst({
      where: { username: { equals: input.username, mode: "insensitive" }, id: { not: userId } },
      select: { id: true },
    });

    if (taken) throw new ApiError(409, "That username is already taken.");
  }

  const updated = await prisma.user.update({
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

  await cacheDel(userProfileCacheKey(userId));

  return { user: updated, previousRole: existing.role };
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

export async function deleteUser(userId: string, confirmEmail: string) {
  const target = await assertNotProtectedAdmin(userId, "deleted");

  if (target.email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase())
    throw new ApiError(400, "The confirmation email does not match this account.");

  // Sessions must be revoked *before* the cascade removes the rows we read tokens from —
  // otherwise their better-auth Redis entries outlive the account and keep authenticating.
  await revokeAllSessionsForUserSafely(userId);

  // Every owned row (documents, publications, wallets, keys, sessions) cascades from User.
  await prisma.user.delete({ where: { id: userId } });
  await cacheDel(userProfileCacheKey(userId));

  return { id: userId, email: target.email };
}
