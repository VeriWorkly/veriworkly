import { createHash, randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import type { z } from "zod";

import { prisma } from "#lib/prisma";
import { ApiError } from "#lib/errors";

import {
  BillingService,
  lockUserForBilling,
  syncSubscriptionGrants,
} from "#services/billingService";
import { addMonthsUtc } from "#services/annualCreditService";
import { CreditService } from "#services/creditService";
import { CREDIT_SOURCES } from "#services/creditSources";
import { creditPackCatalog, isProductKey, productCatalog } from "#services/productCatalog";
import { withAccountPlaceholder } from "#services/admin/deletedAccountPlaceholder";
import { writeAdminAudit, type AdminAuditInput } from "#services/admin/adminAuditService";

import type {
  adminCreditWalletListQuerySchema,
  adminEntitlementListQuerySchema,
  adminSubscriptionListQuerySchema,
  adminSubscriptionUpdateSchema,
  adminWebhookListQuerySchema,
  ENTITLEMENT_KEYS,
} from "#validators/admin/adminBillingValidator";
import { listPage } from "#utils/pagination";

type SubscriptionListQuery = z.infer<typeof adminSubscriptionListQuerySchema>;
type SubscriptionUpdateInput = z.infer<typeof adminSubscriptionUpdateSchema>;
type EntitlementListQuery = z.infer<typeof adminEntitlementListQuerySchema>;
type WalletListQuery = z.infer<typeof adminCreditWalletListQuerySchema>;
type WebhookListQuery = z.infer<typeof adminWebhookListQuerySchema>;
type EntitlementKey = (typeof ENTITLEMENT_KEYS)[number];

const PAYING_STATUSES = ["ACTIVE", "PAST_DUE"] as const;

/**
 * A paying subscription of a live account. Billing rows outlive a deleted account (decision 5),
 * detached with `userId` null, and nobody is paying through them any more (V-267).
 */
const LIVE_PAYING_WHERE = {
  status: { in: [...PAYING_STATUSES] },
  userId: { not: null },
} satisfies Prisma.SubscriptionWhereInput;

type RevenueRow = {
  currency: string;
  payments: bigint | number;
  grossCents: bigint | number | null;
  reversedCents: bigint | number | null;
};

/**
 * Money taken, per currency, from the amounts stored on the processed webhook events (V-197):
 * every successful payment once (a payment delivered under several event ids counts once, by its
 * provider payment id), less every refund and lost or accepted dispute once (by its refund or
 * dispute id while the payload lasts, as `reversedSoFar` counts them). A failed or unprocessed
 * event moved no money. Amounts never add up across currencies, so each currency is its own row.
 * `since` null is all time; a reversal counts in the window it happened in.
 */
async function revenueByCurrency(since: Date | null) {
  const rows = await prisma.$queryRaw<RevenueRow[]>`
    WITH payments AS (
      SELECT DISTINCT ON (COALESCE("providerPaymentId", "id"))
        upper("currency") AS currency, "amountCents" AS amount
      FROM "BillingWebhookEvent"
      WHERE "type" = 'payment.succeeded' AND "status" = 'PROCESSED'
        AND "amountCents" IS NOT NULL AND "currency" IS NOT NULL
        AND (${since}::timestamp IS NULL OR "createdAt" >= ${since}::timestamp)
      ORDER BY COALESCE("providerPaymentId", "id"), "createdAt" ASC
    ), reversals AS (
      SELECT DISTINCT ON (COALESCE("payload" -> 'data' ->> 'refund_id', "payload" -> 'data' ->> 'dispute_id', "id"))
        upper("currency") AS currency, "amountCents" AS amount
      FROM "BillingWebhookEvent"
      WHERE "type" IN ('refund.succeeded', 'dispute.lost', 'dispute.accepted')
        AND "status" = 'PROCESSED'
        AND "amountCents" IS NOT NULL AND "currency" IS NOT NULL
        AND (${since}::timestamp IS NULL OR "createdAt" >= ${since}::timestamp)
      ORDER BY COALESCE("payload" -> 'data' ->> 'refund_id', "payload" -> 'data' ->> 'dispute_id', "id"), "createdAt" ASC
    )
    SELECT currency,
      COUNT(*) FILTER (WHERE kind = 'payment') AS payments,
      SUM(amount) FILTER (WHERE kind = 'payment') AS "grossCents",
      SUM(amount) FILTER (WHERE kind = 'reversal') AS "reversedCents"
    FROM (
      SELECT currency, amount, 'payment' AS kind FROM payments
      UNION ALL
      SELECT currency, amount, 'reversal' AS kind FROM reversals
    ) AS money
    GROUP BY currency
    ORDER BY currency`;

  return rows.map((row) => {
    const grossCents = Number(row.grossCents ?? 0);
    const reversedCents = Number(row.reversedCents ?? 0);
    return {
      currency: row.currency,
      payments: Number(row.payments),
      grossCents,
      reversedCents,
      netCents: grossCents - reversedCents,
    };
  });
}

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
    creditsAdjusted30,
    webhooksByStatus,
    activeEntitlements,
    paying,
    revenueLast30Days,
    revenueAllTime,
  ] = await Promise.all([
    prisma.subscription.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.subscription.groupBy({
      by: ["productKey"],
      where: LIVE_PAYING_WHERE,
      _count: { _all: true },
    }),
    prisma.subscription.count({
      where: { createdAt: { gte: since30 }, ...LIVE_PAYING_WHERE },
    }),
    prisma.subscription.count({
      where: { cancelAtPeriodEnd: true, ...LIVE_PAYING_WHERE },
    }),
    // Live accounts only (V-252): a wallet or grant detached by an account deletion is a billing
    // record, not credit anyone can spend or access anyone holds.
    prisma.creditWallet.aggregate({
      where: { userId: { not: null } },
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
    // Admin adjustments (V-011): goodwill and restored credits are neither paid grants nor AI spend.
    prisma.creditTransaction.aggregate({
      where: { createdAt: { gte: since30 }, type: "ADJUSTMENT" },
      _sum: { amount: true },
    }),
    prisma.billingWebhookEvent.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.entitlementGrant.count({
      where: {
        userId: { not: null },
        revokedAt: null,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
    }),
    prisma.subscription.count({ where: LIVE_PAYING_WHERE }),
    revenueByCurrency(since30),
    revenueByCurrency(null),
  ]);

  const statusCounts = Object.fromEntries(byStatus.map((row) => [row.status, row._count._all]));
  const webhookCounts = Object.fromEntries(
    webhooksByStatus.map((row) => [row.status, row._count._all]),
  );

  return {
    subscriptions: {
      // Every row, detached ones included; `paying` and the counts below are live accounts only.
      byStatus: statusCounts,
      paying,
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
      // Net of admin additions and removals, signed.
      adjustedLast30Days: creditsAdjusted30._sum.amount ?? 0,
    },
    webhooks: {
      byStatus: webhookCounts,
      // Read off the groupBy above, not a second `count(status = FAILED)` query (V-069).
      failed: webhookCounts.FAILED ?? 0,
    },
    activeEntitlements,
    /** Per currency, from stored payment amounts; see `revenueByCurrency`. */
    revenue: { last30Days: revenueLast30Days, allTime: revenueAllTime },
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

  return listPage(items.map(withAccountPlaceholder), total, query);
}

/**
 * Support's override for a subscription whose webhook was lost, with two rules the old version
 * broke:
 *
 * - Cancel at period end (and its undo) is a provider action (V-169). Dodo charges the card, so
 *   the change is made there first and the row takes the provider's answer; if the provider call
 *   fails, nothing is written and the admin sees a 502. Should the local write fail after the
 *   provider accepted, the provider's own `subscription.updated` webhook brings the row in line.
 *   A row the provider never knew (no `providerSubId`) cannot be cancelled this way.
 * - Ending a provider subscription locally (CANCELED or INACTIVE) needs the provider to agree:
 *   its current state is fetched first, and the label is refused (409) unless the provider
 *   reports the same, so a local-only label can never stop the deletion guard from seeing a
 *   subscription Dodo still bills. The provider's raw status is stored with it.
 * - A status, period or grace edit moves the access with it (V-170): the subscription's
 *   entitlements are granted or revoked through the webhook's own `syncSubscriptionGrants`, in
 *   the same transaction as the row and the audit entry, so the label never says ACTIVE while
 *   the user stays on the free plan (or the reverse).
 *
 * `reconcileAccess` runs afterwards for the publication and the caches.
 */
export async function updateSubscription(
  subscriptionId: string,
  input: SubscriptionUpdateInput,
  audit: AdminAuditInput,
) {
  const existing = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    select: {
      id: true,
      userId: true,
      status: true,
      cancelAtPeriodEnd: true,
      providerSubId: true,
      productKey: true,
    },
  });

  if (!existing) throw new ApiError(404, "Subscription not found.");
  // Kept after account deletion as a billing record (V-183); there is no account to edit it for.
  if (!existing.userId)
    throw new ApiError(409, "This subscription belongs to a deleted account and is read-only.");
  const userId = existing.userId;

  let providerRawStatus: string | undefined;
  if ((input.status === "CANCELED" || input.status === "INACTIVE") && existing.providerSubId) {
    const provider = await BillingService.getProviderSubscriptionState(existing.providerSubId);
    if (provider.status !== input.status)
      throw new ApiError(
        409,
        `The billing provider still reports this subscription as "${provider.rawStatus}", so it cannot be marked ${input.status} here. Cancel it at the provider (Cancel at period end, or the Dodo dashboard); its webhook updates this row.`,
        { providerStatus: provider.rawStatus },
      );
    providerRawStatus = provider.rawStatus;
  }

  let providerCancelAtPeriodEnd: boolean | undefined;
  if (input.cancelAtPeriodEnd !== undefined) {
    if (!existing.providerSubId)
      throw new ApiError(
        409,
        "This subscription has no provider subscription id, so it cannot be cancelled at the billing provider.",
      );
    providerCancelAtPeriodEnd = (
      await BillingService.setProviderCancelAtPeriodEnd(
        existing.providerSubId,
        input.cancelAtPeriodEnd,
      )
    ).cancelAtPeriodEnd;
  }

  const touchesAccess =
    input.status !== undefined ||
    input.currentPeriodEnd !== undefined ||
    input.graceEndsAt !== undefined;

  const updated = await prisma.$transaction(async (tx) => {
    await lockUserForBilling(tx, userId);
    const subscription = await tx.subscription.update({
      where: { id: subscriptionId },
      data: {
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(providerRawStatus !== undefined ? { rawStatus: providerRawStatus } : {}),
        ...(providerCancelAtPeriodEnd !== undefined
          ? { cancelAtPeriodEnd: providerCancelAtPeriodEnd }
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
    if (touchesAccess && isProductKey(subscription.productKey))
      await syncSubscriptionGrants(tx, {
        userId,
        sourceId: subscription.providerSubId ?? subscription.id,
        productKey: subscription.productKey,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        graceEndsAt: subscription.graceEndsAt,
        at: new Date(),
      });
    await writeAdminAudit(tx, {
      ...audit,
      metadata: {
        ...audit.metadata,
        userId,
        previousStatus: existing.status,
        ...(providerCancelAtPeriodEnd !== undefined
          ? { providerCancelAtPeriodEnd, previousCancelAtPeriodEnd: existing.cancelAtPeriodEnd }
          : {}),
      },
    });
    return subscription;
  });

  await BillingService.reconcileAccess(userId);

  // The customer is told, as on a portal cancel (V-212). The provider's webhook that follows sees
  // the flag already set and sends nothing; the notification key keeps it to one email either way.
  if (providerCancelAtPeriodEnd === true && !existing.cancelAtPeriodEnd && existing.providerSubId)
    void BillingService.notifyCancellation(
      userId,
      existing.providerSubId,
      existing.productKey,
      updated.currentPeriodEnd,
    );

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

  return listPage(items.map(withAccountPlaceholder), total, query);
}

/** Without a client key, identical adjustments this close together are one double submit. */
const ADMIN_CREDIT_DEDUPE_WINDOW_MS = 10_000;

/**
 * What an admin adjustment is (V-230): goodwill credits (never expire, not paid for), a lost
 * credit pack (paid, the pack's 90-day expiry) or a lost subscription month (paid, ends with the
 * current credit month and is replaced by the next one, like every allowance).
 */
export type CreditAdjustmentKind = "goodwill" | "pack" | "subscription_month";

/** What the customer's credit history says when the admin left no note (V-229). */
function defaultCustomerNote(kind: CreditAdjustmentKind, amount: number) {
  if (kind === "pack") return "Credit pack restored by VeriWorkly support";
  if (kind === "subscription_month") return "Monthly plan credits restored by VeriWorkly support";
  return amount > 0
    ? "Credits added by VeriWorkly support"
    : "Credits removed by VeriWorkly support";
}

/**
 * The subscription a restored month belongs to and when its current credit month ends: a live
 * plan that carries credits (AI Credits or the bundle, active in its period or cancelled with paid
 * time left). Monthly plans: the period end. Annual plans: the end of the schedule's current month
 * (owner decision 4: nothing rolls over), else a month from now within the paid period.
 */
async function subscriptionCreditMonth(userId: string, now: Date) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      providerSubId: { not: null },
      productKey: { in: ["ai_credits", "bundle"] },
      status: { in: ["ACTIVE", "CANCELED"] },
      currentPeriodEnd: { gt: now },
    },
    orderBy: { currentPeriodEnd: "desc" },
    select: { providerSubId: true, productKey: true, interval: true, currentPeriodEnd: true },
  });
  if (
    !subscription?.providerSubId ||
    !subscription.currentPeriodEnd ||
    !isProductKey(subscription.productKey) ||
    !productCatalog[subscription.productKey].creditAllowance
  )
    throw new ApiError(
      409,
      "This account has no live plan with monthly credits, so a subscription month cannot be restored. Restore the credits as goodwill instead.",
      { code: "NO_CREDIT_SUBSCRIPTION" },
    );

  let expiresAt = subscription.currentPeriodEnd;
  if (subscription.interval === "ANNUAL") {
    const schedule = await prisma.subscriptionCreditSchedule.findFirst({
      where: {
        providerSubId: subscription.providerSubId,
        periodStart: { lte: now },
        periodEnd: { gt: now },
      },
      orderBy: { periodStart: "desc" },
      select: { periodStart: true, periodEnd: true },
    });
    let monthEnd = addMonthsUtc(now, 1);
    if (schedule)
      for (let month = 1; month <= 12; month += 1) {
        const end = addMonthsUtc(schedule.periodStart, month);
        if (end > now) {
          monthEnd = end < schedule.periodEnd ? end : schedule.periodEnd;
          break;
        }
      }
    if (monthEnd < expiresAt) expiresAt = monthEnd;
  }
  return { providerSubId: subscription.providerSubId, expiresAt };
}

export async function adjustCredits(
  userId: string,
  amount: number,
  reason: string,
  options: {
    actorId: string;
    idempotencyKey?: string;
    kind?: CreditAdjustmentKind;
    customerNote?: string;
    audit: AdminAuditInput;
  },
) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) throw new ApiError(404, "User not found.");
  const kind = options.kind ?? "goodwill";
  if (kind !== "goodwill" && amount < 0)
    throw new ApiError(400, "Only a goodwill adjustment can remove credits.");

  // CreditService dedupes on the request id, per user. With a client-supplied Idempotency-Key a
  // retried submit returns the original transaction. The key carries the admin's id so two
  // operators cannot share one by accident; the same key against a different user is a different
  // request and credits that user.
  if (options.idempotencyKey) {
    const requestId = `admin-credit:${options.actorId}:${options.idempotencyKey}`;
    const replayed = Boolean(
      await prisma.creditTransaction.findUnique({
        where: { userId_requestId: { userId, requestId } },
        select: { id: true },
      }),
    );
    return applyCreditAdjustment(userId, amount, requestId, replayed, { ...options, kind });
  }

  // V-126: the studio sends no key, so a double submit would grant twice. Without one the key is
  // derived from the request itself and a 10-second bucket; the previous bucket is checked too,
  // so a double click across the boundary still replays. The same adjustment made deliberately
  // later lands in a fresh bucket and is a new grant.
  const bucket = Math.floor(Date.now() / ADMIN_CREDIT_DEDUPE_WINDOW_MS);
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify([options.actorId, userId, amount, reason, kind, options.customerNote ?? null]),
    )
    .digest("base64url");
  const derivedRequestId = (at: number) => `admin-credit:auto:${fingerprint}:${at}`;

  for (const candidate of [bucket - 1, bucket]) {
    const existing = await prisma.creditTransaction.findUnique({
      where: { userId_requestId: { userId, requestId: derivedRequestId(candidate) } },
    });
    if (existing) return { transaction: existing, replayed: true };
  }

  return applyCreditAdjustment(userId, amount, derivedRequestId(bucket), false, {
    ...options,
    kind,
  });
}

async function applyCreditAdjustment(
  userId: string,
  amount: number,
  requestId: string,
  replayed: boolean,
  options: {
    actorId: string;
    kind: CreditAdjustmentKind;
    customerNote?: string;
    audit: AdminAuditInput;
  },
) {
  // The source and expiry the credits carry (V-230): a restored pack or month follows the same
  // rules as the one that was lost, and counts as paid credit.
  const now = new Date();
  let grant: { source: string; sourceId: string; expiresAt: Date | null } | undefined;
  if (options.kind === "pack")
    grant = {
      source: CREDIT_SOURCES.creditPack,
      sourceId: `admin:${requestId}`,
      expiresAt: new Date(
        now.getTime() + creditPackCatalog.credit_pack_500.expiresInDays * 24 * 60 * 60 * 1000,
      ),
    };
  else if (options.kind === "subscription_month" && !replayed) {
    const month = await subscriptionCreditMonth(userId, now);
    grant = {
      source: CREDIT_SOURCES.subscriptionPayment,
      // `<subscription id>:` keeps it with the plan's other monthly grants, so the next month's
      // allowance replaces what is left of it (`subscriptionCreditGrantsWhere`).
      sourceId: `${month.providerSubId}:admin:${requestId}`,
      expiresAt: month.expiresAt,
    };
  }

  const transaction = await CreditService.adjust(
    userId,
    amount,
    {
      requestId,
      // The customer reads this line (V-229); the admin's own reason stays in the audit entry.
      reason: options.customerNote ?? defaultCustomerNote(options.kind, amount),
      action: "admin_adjustment",
      actorId: options.actorId,
      metadata: { kind: options.kind },
      // Committed with the ledger rows, and only when a row is written: a replay audits nothing.
      onWrite: async (tx, written) => {
        await writeAdminAudit(tx, {
          ...options.audit,
          metadata: { ...options.audit.metadata, amount, transactionId: written.id },
        });
      },
    },
    grant,
  );

  // `CreditService.grant` returns the stored row for a reused request id without checking
  // that it matches (`consume` does); the comparison belongs here either way.
  if (transaction.amount !== amount)
    throw new ApiError(409, "Idempotency key was already used for a different request.");

  return { transaction, replayed };
}

export async function listEntitlements(query: EntitlementListQuery) {
  const now = new Date();

  const filters: Prisma.EntitlementGrantWhereInput = {
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

  // The search is ANDed on as its own clause: the `active` filters above already own `OR`.
  const where: Prisma.EntitlementGrantWhereInput = query.query
    ? {
        AND: [
          filters,
          {
            user: {
              OR: [
                { email: { contains: query.query, mode: "insensitive" } },
                { name: { contains: query.query, mode: "insensitive" } },
              ],
            },
          },
        ],
      }
    : filters;

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

  return listPage(items.map(withAccountPlaceholder), total, query);
}

export async function grantEntitlement(input: {
  userId: string;
  key: EntitlementKey;
  endsAt?: string | null;
  reason: string;
  actorId: string;
  audit: AdminAuditInput;
}) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true },
  });

  if (!user) throw new ApiError(404, "User not found.");
  // A grant that has already ended would be recorded and audited as access given while giving none.
  if (input.endsAt && new Date(input.endsAt).getTime() <= Date.now())
    throw new ApiError(400, "The entitlement end date must be in the future.", {
      code: "ENDS_AT_IN_PAST",
    });

  const grant = await prisma.$transaction(async (tx) => {
    const created = await tx.entitlementGrant.create({
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
    await writeAdminAudit(tx, {
      ...input.audit,
      metadata: { ...input.audit.metadata, grantId: created.id },
    });
    return created;
  });

  await BillingService.reconcileAccess(input.userId);

  return grant;
}

export async function revokeEntitlement(
  grantId: string,
  reason: string,
  actorId: string,
  audit: AdminAuditInput,
) {
  const grant = await prisma.entitlementGrant.findUnique({ where: { id: grantId } });

  if (!grant) throw new ApiError(404, "Entitlement grant not found.");
  // Kept after account deletion as a billing record (V-183).
  if (!grant.userId)
    throw new ApiError(409, "This entitlement belongs to a deleted account and is read-only.");
  if (grant.revokedAt) throw new ApiError(409, "This entitlement is already revoked.");
  // A subscription's grants follow the subscription: the next webhook would grant this again.
  if (grant.source === "SUBSCRIPTION")
    throw new ApiError(
      409,
      "This entitlement comes from a subscription and its next billing event would restore it. Change or cancel the subscription instead.",
    );

  const revoked = await prisma.$transaction(async (tx) => {
    // Conditional on the grant still being live: two concurrent revokes write one audit entry
    // and the second gets the same 409 as a sequential one.
    const changed = await tx.entitlementGrant.updateMany({
      where: { id: grantId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (!changed.count) throw new ApiError(409, "This entitlement is already revoked.");
    const updated = await tx.entitlementGrant.update({
      where: { id: grantId },
      data: {
        metadata: {
          ...((grant.metadata as Record<string, unknown> | null) ?? {}),
          revokeReason: reason,
          revokedByActorId: actorId,
        },
      },
      include: { user: { select: SUBSCRIBER_SELECT } },
    });
    await writeAdminAudit(tx, {
      ...audit,
      metadata: { ...audit.metadata, key: grant.key, userId: grant.userId },
    });
    return updated;
  });

  await BillingService.reconcileAccess(grant.userId);

  return revoked;
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

  return listPage(items, total, query);
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
  // Retention or an account deletion replaced the payload with a summary (`redacted: true`).
  // What is left cannot be processed faithfully, so say so instead of failing its parse (V-352).
  const payload = event.payload as { redacted?: unknown } | null;
  if (payload && typeof payload === "object" && payload.redacted === true)
    throw new ApiError(
      409,
      "This event's payload was removed by data retention or an account deletion, so it cannot be replayed. Reconcile it from the provider's dashboard instead.",
      { code: "WEBHOOK_PAYLOAD_REDACTED" },
    );

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
