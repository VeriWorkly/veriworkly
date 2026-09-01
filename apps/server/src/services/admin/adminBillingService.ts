import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import type { z } from "zod";

import { prisma } from "#lib/prisma";
import { ApiError } from "#lib/errors";

import { BillingService } from "#services/billingService";
import { CreditService } from "#services/creditService";

import type {
  adminCreditWalletListQuerySchema,
  adminEntitlementListQuerySchema,
  adminSubscriptionListQuerySchema,
  adminSubscriptionUpdateSchema,
  adminWebhookListQuerySchema,
  ENTITLEMENT_KEYS,
} from "#validators/admin/adminBillingValidator";

type SubscriptionListQuery = z.infer<typeof adminSubscriptionListQuerySchema>;
type SubscriptionUpdateInput = z.infer<typeof adminSubscriptionUpdateSchema>;
type EntitlementListQuery = z.infer<typeof adminEntitlementListQuerySchema>;
type WalletListQuery = z.infer<typeof adminCreditWalletListQuerySchema>;
type WebhookListQuery = z.infer<typeof adminWebhookListQuerySchema>;
type EntitlementKey = (typeof ENTITLEMENT_KEYS)[number];

const PAYING_STATUSES = ["ACTIVE", "PAST_DUE"] as const;

const SUBSCRIBER_SELECT = {
  id: true,
  name: true,
  email: true,
  image: true,
} satisfies Prisma.UserSelect;

export async function getBillingSummary() {
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const now = new Date();

  const [
    byStatus,
    byProduct,
    newLast30,
    cancelingSoon,
    walletTotals,
    creditsGranted30,
    creditsSpent30,
    webhooksByStatus,
    failedWebhooks,
    activeEntitlements,
  ] = await Promise.all([
    prisma.subscription.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.subscription.groupBy({
      by: ["productKey"],
      where: { status: { in: [...PAYING_STATUSES] } },
      _count: { _all: true },
    }),
    prisma.subscription.count({
      where: { createdAt: { gte: since30 }, status: { in: [...PAYING_STATUSES] } },
    }),
    prisma.subscription.count({
      where: { cancelAtPeriodEnd: true, status: { in: [...PAYING_STATUSES] } },
    }),
    prisma.creditWallet.aggregate({
      _sum: { balance: true, reserved: true, lifetimeCredited: true, lifetimeDebited: true },
    }),
    prisma.creditTransaction.aggregate({
      where: { createdAt: { gte: since30 }, type: "GRANT" },
      _sum: { amount: true },
    }),
    prisma.creditTransaction.aggregate({
      where: { createdAt: { gte: since30 }, type: "DEBIT" },
      _sum: { amount: true },
    }),
    prisma.billingWebhookEvent.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.billingWebhookEvent.count({ where: { status: "FAILED" } }),
    prisma.entitlementGrant.count({
      where: {
        revokedAt: null,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
    }),
  ]);

  const statusCounts = Object.fromEntries(byStatus.map((row) => [row.status, row._count._all]));

  return {
    subscriptions: {
      byStatus: statusCounts,
      paying: PAYING_STATUSES.reduce((sum, status) => sum + (statusCounts[status] ?? 0), 0),
      byProduct: Object.fromEntries(byProduct.map((row) => [row.productKey, row._count._all])),
      newLast30Days: newLast30,
      cancelingAtPeriodEnd: cancelingSoon,
    },
    credits: {
      balance: walletTotals._sum.balance ?? 0,
      reserved: walletTotals._sum.reserved ?? 0,
      lifetimeCredited: walletTotals._sum.lifetimeCredited ?? 0,
      lifetimeDebited: walletTotals._sum.lifetimeDebited ?? 0,
      grantedLast30Days: creditsGranted30._sum.amount ?? 0,
      // DEBIT rows are stored as negative amounts; report the magnitude.
      spentLast30Days: Math.abs(creditsSpent30._sum.amount ?? 0),
    },
    webhooks: {
      byStatus: Object.fromEntries(webhooksByStatus.map((row) => [row.status, row._count._all])),
      failed: failedWebhooks,
    },
    activeEntitlements,
  };
}

export async function listSubscriptions(query: SubscriptionListQuery) {
  const where: Prisma.SubscriptionWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.productKey ? { productKey: query.productKey } : {}),
    ...(query.interval ? { interval: query.interval } : {}),
    ...(query.query
      ? {
          OR: [
            { user: { email: { contains: query.query, mode: "insensitive" } } },
            { user: { name: { contains: query.query, mode: "insensitive" } } },
            { providerSubId: { equals: query.query } },
            { providerCustomerId: { equals: query.query } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.subscription.findMany({
      where,
      include: { user: { select: SUBSCRIBER_SELECT } },
      orderBy:
        query.sort === "newest"
          ? { createdAt: "desc" }
          : query.sort === "periodEnd"
            ? { currentPeriodEnd: "asc" }
            : { updatedAt: "desc" },
      take: query.limit,
      skip: query.offset,
    }),
    prisma.subscription.count({ where }),
  ]);

  return { items, total, limit: query.limit, offset: query.offset };
}

export async function updateSubscription(subscriptionId: string, input: SubscriptionUpdateInput) {
  const existing = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    select: { id: true, userId: true, status: true, cancelAtPeriodEnd: true },
  });

  if (!existing) throw new ApiError(404, "Subscription not found.");

  const updated = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.cancelAtPeriodEnd !== undefined
        ? { cancelAtPeriodEnd: input.cancelAtPeriodEnd }
        : {}),
      ...(input.currentPeriodEnd !== undefined
        ? { currentPeriodEnd: input.currentPeriodEnd ? new Date(input.currentPeriodEnd) : null }
        : {}),
      ...(input.graceEndsAt !== undefined
        ? { graceEndsAt: input.graceEndsAt ? new Date(input.graceEndsAt) : null }
        : {}),
    },
    include: { user: { select: SUBSCRIBER_SELECT } },
  });

  return { subscription: updated, previous: existing };
}

export async function listCreditWallets(query: WalletListQuery) {
  const where: Prisma.CreditWalletWhereInput = query.query
    ? {
        user: {
          OR: [
            { email: { contains: query.query, mode: "insensitive" } },
            { name: { contains: query.query, mode: "insensitive" } },
            { id: query.query },
          ],
        },
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.creditWallet.findMany({
      where,
      include: { user: { select: SUBSCRIBER_SELECT } },
      orderBy:
        query.sort === "balance"
          ? { balance: "desc" }
          : query.sort === "lifetime"
            ? { lifetimeDebited: "desc" }
            : { updatedAt: "desc" },
      take: query.limit,
      skip: query.offset,
    }),
    prisma.creditWallet.count({ where }),
  ]);

  return { items, total, limit: query.limit, offset: query.offset };
}

export async function adjustCredits(userId: string, amount: number, reason: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) throw new ApiError(404, "User not found.");

  return CreditService.adjust(userId, amount, {
    // A fresh request id per adjustment: CreditService dedupes on it, and reusing one would
    // silently swallow a second, legitimate adjustment with the same amount.
    requestId: `admin-credit:${randomUUID()}`,
    reason,
    action: "admin_adjustment",
  });
}

export async function listEntitlements(query: EntitlementListQuery) {
  const now = new Date();

  const where: Prisma.EntitlementGrantWhereInput = {
    ...(query.userId ? { userId: query.userId } : {}),
    ...(query.key ? { key: query.key } : {}),
    ...(query.active === true
      ? {
          revokedAt: null,
          startsAt: { lte: now },
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        }
      : {}),
    ...(query.active === false
      ? { OR: [{ revokedAt: { not: null } }, { endsAt: { lte: now } }] }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.entitlementGrant.findMany({
      where,
      include: { user: { select: SUBSCRIBER_SELECT } },
      orderBy: { createdAt: "desc" },
      take: query.limit,
      skip: query.offset,
    }),
    prisma.entitlementGrant.count({ where }),
  ]);

  return { items, total, limit: query.limit, offset: query.offset };
}

export async function grantEntitlement(input: {
  userId: string;
  key: EntitlementKey;
  endsAt?: string | null;
  reason: string;
  actorId: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true },
  });

  if (!user) throw new ApiError(404, "User not found.");

  return prisma.entitlementGrant.create({
    data: {
      userId: input.userId,
      key: input.key,
      source: "MANUAL",
      // A unique sourceId per grant keeps the [userId, key, source, sourceId] unique index from
      // rejecting a second manual grant of the same entitlement (e.g. an extension).
      sourceId: randomUUID(),
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      metadata: { reason: input.reason, actorId: input.actorId },
    },
    include: { user: { select: SUBSCRIBER_SELECT } },
  });
}

export async function revokeEntitlement(grantId: string, reason: string, actorId: string) {
  const grant = await prisma.entitlementGrant.findUnique({ where: { id: grantId } });

  if (!grant) throw new ApiError(404, "Entitlement grant not found.");
  if (grant.revokedAt) throw new ApiError(409, "This entitlement is already revoked.");

  return prisma.entitlementGrant.update({
    where: { id: grantId },
    data: {
      revokedAt: new Date(),
      metadata: {
        ...((grant.metadata as Record<string, unknown> | null) ?? {}),
        revokeReason: reason,
        revokedByActorId: actorId,
      },
    },
    include: { user: { select: SUBSCRIBER_SELECT } },
  });
}

export async function listWebhookEvents(query: WebhookListQuery) {
  const where: Prisma.BillingWebhookEventWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.type ? { type: query.type } : {}),
    ...(query.query
      ? {
          OR: [
            { providerEventId: { contains: query.query, mode: "insensitive" } },
            { error: { contains: query.query, mode: "insensitive" } },
            { user: { email: { contains: query.query, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.billingWebhookEvent.findMany({
      where,
      // `payload` is the raw provider event and can be large; the detail endpoint returns it.
      select: {
        id: true,
        providerEventId: true,
        type: true,
        status: true,
        error: true,
        retryCount: true,
        lastAttemptAt: true,
        processedAt: true,
        createdAt: true,
        user: { select: SUBSCRIBER_SELECT },
      },
      orderBy: { createdAt: "desc" },
      take: query.limit,
      skip: query.offset,
    }),
    prisma.billingWebhookEvent.count({ where }),
  ]);

  return { items, total, limit: query.limit, offset: query.offset };
}

export async function getWebhookEvent(eventId: string) {
  const event = await prisma.billingWebhookEvent.findUnique({
    where: { id: eventId },
    include: { user: { select: SUBSCRIBER_SELECT } },
  });

  if (!event) throw new ApiError(404, "Webhook event not found.");

  return event;
}

/**
 * Re-runs a stored provider event through the normal webhook pipeline. This is the recovery
 * path for an event that failed on a transient error (database blip, provider timeout) — the
 * payload is replayed verbatim, so the outcome is identical to the delivery that failed.
 *
 * Already-PROCESSED events are rejected here rather than relying on `processWebhook`'s internal
 * duplicate short-circuit, so the operator gets a clear error instead of a silent no-op.
 */
export async function replayWebhookEvent(eventId: string) {
  const event = await prisma.billingWebhookEvent.findUnique({ where: { id: eventId } });

  if (!event) throw new ApiError(404, "Webhook event not found.");
  if (event.status === "PROCESSED")
    throw new ApiError(409, "This webhook event has already been processed successfully.");

  const result = await BillingService.processWebhook(
    event.providerEventId,
    event.payload as ReturnType<typeof BillingService.unwrapWebhook>,
  );

  return {
    id: event.id,
    providerEventId: event.providerEventId,
    duplicate: result.duplicate,
  };
}
