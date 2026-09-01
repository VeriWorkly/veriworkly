import { prisma } from "#lib/prisma";
import { cacheGet, cacheSet } from "#lib/redis";

import {
  ADMIN_ACTION_QUEUE_TTL_SECONDS,
  ADMIN_OVERVIEW_TTL_SECONDS,
  ADMIN_RECENT_ACTIVITY_TTL_SECONDS,
  adminActionQueueCacheKey,
  adminOverviewCacheKey,
  adminRecentActivityCacheKey,
} from "#services/admin/cache";

import { getAffiliateSummary } from "#services/admin/adminAffiliateService";
import { getAmbassadorSummary } from "#services/admin/adminAmbassadorService";
import { getApiKeySummary } from "#services/admin/adminApiKeyService";
import { getBillingSummary } from "#services/admin/adminBillingService";
import { getDocumentSummary } from "#services/admin/adminDocumentService";
import { getPortfolioSummary } from "#services/admin/adminPortfolioService";
import { getRecentAuditEntries } from "#services/admin/adminAuditService";
import { getJobStatus, getSystemHealth } from "#services/admin/adminSystemService";

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function getUserSummary(days: number) {
  const since = daysAgo(days);
  const previousWindowStart = daysAgo(days * 2);

  const [total, newInWindow, previousWindow, byRole, verified, activeSessions] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: since } } }),
    prisma.user.count({ where: { createdAt: { gte: previousWindowStart, lt: since } } }),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.user.count({ where: { emailVerified: true } }),
    prisma.session.count({ where: { expiresAt: { gt: new Date() } } }),
  ]);

  return {
    total,
    newInWindow,
    previousWindow,
    // Percent change against the immediately preceding window of the same length. A zero
    // baseline has no meaningful percentage, so it is reported as null rather than as Infinity.
    growthPercent:
      previousWindow === 0
        ? null
        : Number((((newInWindow - previousWindow) / previousWindow) * 100).toFixed(1)),
    byRole: Object.fromEntries(byRole.map((row) => [row.role, row._count._all])),
    verified,
    activeSessions,
  };
}

/**
 * The single payload behind `/admin` — every domain summary in one request.
 *
 * Each section is an independent aggregate query set, so this deliberately runs them in
 * parallel: serialized, the overview took long enough that the page felt broken on cold cache.
 */
async function buildAdminOverview(days: number) {
  const [
    users,
    billing,
    portfolios,
    documents,
    affiliates,
    ambassadors,
    apiKeys,
    jobs,
    health,
    recentActivity,
  ] = await Promise.all([
    getUserSummary(days),
    getBillingSummary(),
    getPortfolioSummary(),
    getDocumentSummary(),
    getAffiliateSummary(),
    getAmbassadorSummary(),
    getApiKeySummary(),
    getJobStatus(),
    getSystemHealth(),
    getRecentAuditEntries(15),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    windowDays: days,
    users,
    billing,
    portfolios,
    documents,
    affiliates,
    ambassadors,
    apiKeys,
    jobs,
    health,
    recentActivity,
    /**
     * Everything on this list is a queue an operator is expected to drain. It is computed here
     * rather than in the UI so the nav badge and the dashboard can never disagree.
     */
    actionQueue: {
      pendingAmbassadorApplications: ambassadors.pending,
      pendingWithdrawals: affiliates.pendingWithdrawals.count,
      pendingCommissions: affiliates.commissionsByStatus.PENDING?.count ?? 0,
      failedWebhooks: billing.webhooks.failed,
      suspendedPortfolios: portfolios.suspended,
      pendingPortfolioAssets: jobs.pendingPortfolioAssets,
    },
  };
}

/**
 * Just the operator action queue, as six independent counts.
 *
 * The admin shell renders these as badges on every page, so it needs them on every navigation.
 * Calling `getAdminOverview` for them would run the full set of domain summaries — dozens of
 * aggregate queries — to display six numbers, on a page that may not use anything else from
 * that payload. The counts are duplicated from `getAdminOverview`'s `actionQueue` rather than
 * shared because the two have different cost profiles; the shapes are asserted identical by
 * `AdminActionQueue` on the frontend, which both endpoints satisfy.
 */
async function buildActionQueue() {
  const [
    pendingAmbassadorApplications,
    pendingWithdrawals,
    pendingCommissions,
    failedWebhooks,
    suspendedPortfolios,
    pendingPortfolioAssets,
  ] = await Promise.all([
    prisma.ambassadorApplication.count({ where: { status: "PENDING" } }),
    prisma.affiliateWithdrawal.count({ where: { status: "REQUESTED" } }),
    prisma.affiliateCommission.count({ where: { status: "PENDING" } }),
    prisma.billingWebhookEvent.count({ where: { status: "FAILED" } }),
    prisma.portfolioPublication.count({ where: { status: "SUSPENDED" } }),
    prisma.portfolioAsset.count({ where: { status: "PENDING" } }),
  ]);

  return {
    pendingAmbassadorApplications,
    pendingWithdrawals,
    pendingCommissions,
    failedWebhooks,
    suspendedPortfolios,
    pendingPortfolioAssets,
  };
}

/**
 * Recent signups, publishes and subscriptions in one strip. Separate from the overview because
 * it is cheap to poll and the summary aggregates are not.
 */
async function buildRecentActivity() {
  const [signups, publications, subscriptions, applications] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, email: true, image: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.portfolioPublication.findMany({
      select: {
        id: true,
        subdomain: true,
        status: true,
        publishedAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { publishedAt: "desc" },
      take: 10,
    }),
    prisma.subscription.findMany({
      where: { status: { in: ["ACTIVE"] } },
      select: {
        id: true,
        productKey: true,
        status: true,
        interval: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.ambassadorApplication.findMany({
      where: { status: "PENDING" },
      select: {
        id: true,
        collegeName: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return { signups, publications, subscriptions, applications };
}

/* ── Cached entry points ──────────────────────────────────────────────────────────────
 *
 * Each reader above is an aggregate scan, and all three are re-fetched far more often than the
 * underlying numbers move. See `#services/admin/cache` for the TTL reasoning and for why
 * invalidation (not expiry) is what keeps an operator's own action visible immediately.
 *
 * A cache miss returns `null`, which is unambiguous here: none of these three ever legitimately
 * resolve to `null`, so there is no "cached falsy value" case to distinguish.
 */

/** GET /admin/overview — every domain summary in one payload. */
export async function getAdminOverview(days: number) {
  const key = adminOverviewCacheKey(days);

  const cached = await cacheGet<Awaited<ReturnType<typeof buildAdminOverview>>>(key);
  if (cached) return cached;

  const overview = await buildAdminOverview(days);
  await cacheSet(key, overview, ADMIN_OVERVIEW_TTL_SECONDS);

  return overview;
}

/** GET /admin/overview/queue — the six sidebar badge counts, fetched on every admin page. */
export async function getActionQueue() {
  const key = adminActionQueueCacheKey();

  const cached = await cacheGet<Awaited<ReturnType<typeof buildActionQueue>>>(key);
  if (cached) return cached;

  const queue = await buildActionQueue();
  await cacheSet(key, queue, ADMIN_ACTION_QUEUE_TTL_SECONDS);

  return queue;
}

/** GET /admin/overview/activity — the recent-activity strip. */
export async function getRecentActivity() {
  const key = adminRecentActivityCacheKey();

  const cached = await cacheGet<Awaited<ReturnType<typeof buildRecentActivity>>>(key);
  if (cached) return cached;

  const activity = await buildRecentActivity();
  await cacheSet(key, activity, ADMIN_RECENT_ACTIVITY_TTL_SECONDS);

  return activity;
}
