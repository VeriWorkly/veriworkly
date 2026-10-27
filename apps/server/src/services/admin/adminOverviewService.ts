import { logger } from "#lib/logger";
import { prisma } from "#lib/prisma";
import { cacheGet, cacheSet } from "#lib/redis";
import { singleFlight } from "#lib/cacheGeneration";

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
import { withAccountPlaceholder } from "#services/admin/deletedAccountPlaceholder";
import { getDocumentSummary } from "#services/admin/adminDocumentService";
import {
  getPortfolioSummary,
  SUSPENDED_FOR_REVIEW_WHERE,
} from "#services/admin/adminPortfolioService";
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

/** At most this many overview queries in flight at once (V-069). */
const OVERVIEW_QUERY_CONCURRENCY = 6;

/**
 * A FIFO limiter counted in queries, not tasks. Each section fans out its own `Promise.all`, so a
 * plain per-task limit of 6 would still allow ~40 concurrent queries; instead a section reserves
 * as many slots as it runs queries (capped at the capacity, so the largest section can still run
 * alone). The weights below only affect packing, never correctness.
 */
function createQueryLimiter(capacity: number) {
  let free = capacity;
  const queue: Array<{ cost: number; start: () => void }> = [];

  const pump = () => {
    while (queue.length > 0 && queue[0]!.cost <= free) {
      const next = queue.shift()!;
      free -= next.cost;
      next.start();
    }
  };

  return <T>(queries: number, task: () => Promise<T>) => {
    const cost = Math.min(Math.max(queries, 1), capacity);

    return new Promise<T>((resolve, reject) => {
      queue.push({
        cost,
        start: () => {
          Promise.resolve()
            .then(task)
            .then(resolve, reject)
            .finally(() => {
              free += cost;
              pump();
            });
        },
      });
      pump();
    });
  };
}

/** What a section's slot holds when its queries failed; the rest of the overview still renders. */
const SECTION_ERROR = { error: true } as const;

/**
 * The single payload behind `/admin` — every domain summary in one request.
 *
 * Sections are independent aggregate query sets. They run through a query-counted limiter rather
 * than one `Promise.all` of ≈48 queries, which used to take the whole per-worker pool on a cold
 * load (V-069), and they are settled individually: one failing aggregate puts
 * `{ error: true }` in that section's slot (and `null` in any action-queue count derived from it)
 * instead of turning the whole response into a 500.
 */
async function buildAdminOverview(days: number) {
  const limit = createQueryLimiter(OVERVIEW_QUERY_CONCURRENCY);

  // Weights are each summary's query count (billing 11, affiliates 7, …).
  const results = await Promise.allSettled([
    limit(6, () => getUserSummary(days)),
    limit(11, () => getBillingSummary()),
    limit(6, () => getPortfolioSummary()),
    limit(6, () => getDocumentSummary()),
    limit(7, () => getAffiliateSummary()),
    limit(3, () => getAmbassadorSummary()),
    limit(5, () => getApiKeySummary()),
    limit(4, () => getJobStatus()),
    limit(1, () => getSystemHealth()),
    limit(1, () => getRecentAuditEntries(15)),
  ]);

  const names = [
    "users",
    "billing",
    "portfolios",
    "documents",
    "affiliates",
    "ambassadors",
    "apiKeys",
    "jobs",
    "health",
    "recentActivity",
  ];
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      logger.error("Admin overview section failed", {
        section: names[index],
        error: result.reason,
      });
    }
  });

  const [
    usersResult,
    billingResult,
    portfoliosResult,
    documentsResult,
    affiliatesResult,
    ambassadorsResult,
    apiKeysResult,
    jobsResult,
    healthResult,
    recentActivityResult,
  ] = results;

  const section = <T>(result: PromiseSettledResult<T>) =>
    result.status === "fulfilled" ? result.value : SECTION_ERROR;
  const count = <T>(result: PromiseSettledResult<T>, read: (value: T) => number) =>
    result.status === "fulfilled" ? read(result.value) : null;

  const users = section(usersResult);
  const billing = section(billingResult);
  const portfolios = section(portfoliosResult);
  const documents = section(documentsResult);
  const affiliates = section(affiliatesResult);
  const ambassadors = section(ambassadorsResult);
  const apiKeys = section(apiKeysResult);
  const jobs = section(jobsResult);
  const health = section(healthResult);
  const recentActivity = section(recentActivityResult);

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
     * rather than in the UI so the nav badge and the dashboard can never disagree. A count whose
     * section failed is `null` (unknown), never 0.
     */
    actionQueue: {
      pendingAmbassadorApplications: count(ambassadorsResult, (value) => value.pending),
      pendingWithdrawals: count(affiliatesResult, (value) => value.pendingWithdrawals.count),
      pendingCommissions: count(
        affiliatesResult,
        (value) => value.commissionsByStatus.PENDING?.count ?? 0,
      ),
      failedWebhooks: count(billingResult, (value) => value.webhooks.failed),
      suspendedPortfolios: count(portfoliosResult, (value) => value.suspendedForReview),
      pendingPortfolioAssets: count(jobsResult, (value) => value.pendingPortfolioAssets),
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
    prisma.portfolioPublication.count({ where: SUSPENDED_FOR_REVIEW_WHERE }),
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

  // An ACTIVE row can belong to a deleted account (V-183); the feed shows a placeholder for it.
  return {
    signups,
    publications,
    subscriptions: subscriptions.map(withAccountPlaceholder),
    applications,
  };
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

/**
 * The single-flight lock TTL for the overview build. A concurrent cold reader can wait up to
 * twice this (40 s) on the one building it, but returns as soon as that build is cached. The
 * TTL is long because a cold build is slow exactly when the database is struggling.
 */
const OVERVIEW_SINGLE_FLIGHT_MS = 20_000;

/** True when any section of a built overview failed and holds `SECTION_ERROR`. */
function hasFailedSection(overview: Awaited<ReturnType<typeof buildAdminOverview>>) {
  return Object.values(overview).some((value) => value === SECTION_ERROR);
}

/** GET /admin/overview — every domain summary in one payload. */
export async function getAdminOverview(days: number) {
  type Overview = Awaited<ReturnType<typeof buildAdminOverview>>;

  const key = await adminOverviewCacheKey(days);
  if (!key) return buildAdminOverview(days);

  const readCache = () => cacheGet<Overview>(key);
  const cached = await readCache();
  if (cached) return cached;

  // Concurrent cold requests (several operators, or one tab refocusing) build it once (V-117).
  return singleFlight(
    key,
    OVERVIEW_SINGLE_FLIGHT_MS,
    async () => {
      const overview = await buildAdminOverview(days);
      // A partial overview is served but never cached, so the next request rebuilds it rather
      // than showing a one-off failure for the whole TTL.
      if (!hasFailedSection(overview)) {
        await cacheSet(key, overview, ADMIN_OVERVIEW_TTL_SECONDS);
      }
      return overview;
    },
    readCache,
  );
}

/** GET /admin/overview/queue — the six sidebar badge counts, fetched on every admin page. */
export async function getActionQueue() {
  const key = await adminActionQueueCacheKey();

  const cached = key ? await cacheGet<Awaited<ReturnType<typeof buildActionQueue>>>(key) : null;
  if (cached) return cached;

  const queue = await buildActionQueue();
  if (key) await cacheSet(key, queue, ADMIN_ACTION_QUEUE_TTL_SECONDS);

  return queue;
}

/** GET /admin/overview/activity — the recent-activity strip. */
export async function getRecentActivity() {
  const key = await adminRecentActivityCacheKey();

  const cached = key ? await cacheGet<Awaited<ReturnType<typeof buildRecentActivity>>>(key) : null;
  if (cached) return cached;

  const activity = await buildRecentActivity();
  if (key) await cacheSet(key, activity, ADMIN_RECENT_ACTIVITY_TTL_SECONDS);

  return activity;
}
