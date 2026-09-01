import { prisma } from "#lib/prisma";
import { cacheGet, cacheSet } from "#lib/redis";

import { ADMIN_TIME_SERIES_TTL_SECONDS, adminTimeSeriesCacheKey } from "#services/admin/cache";

/**
 * Daily time series behind the admin dashboard charts.
 *
 * Prisma's `groupBy` cannot bucket a `DateTime` column by day, so each metric is a raw
 * `date_trunc` query. The gap filling is deliberately done in TypeScript rather than with a
 * SQL `generate_series` join: a day with no rows must still render as a zero point, and doing
 * that in JS keeps every query a plain single-table scan that the existing indexes already
 * cover. Joining against a generated series instead would defeat those indexes.
 *
 * Every query here is a literal template — no identifier is interpolated from input — so the
 * only parameter that ever reaches Postgres is the window start date.
 */

interface DailyRow {
  bucket: Date;
  value: number | bigint | null;
}

/** UTC midnight for `date`, matching the `date_trunc('day', ..., 'UTC')` used in the queries. */
function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function isoDay(date: Date) {
  return startOfUtcDay(date).toISOString().slice(0, 10);
}

/**
 * The ordered list of `YYYY-MM-DD` buckets the charts plot, oldest first and ending on today.
 * Every series returned by this module is aligned to exactly this axis.
 */
function buildBuckets(days: number) {
  const today = startOfUtcDay(new Date());
  const buckets: string[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setUTCDate(day.getUTCDate() - offset);
    buckets.push(isoDay(day));
  }

  return buckets;
}

/** Projects sparse `date_trunc` rows onto the dense bucket axis, filling absent days with 0. */
function alignToBuckets(rows: DailyRow[], buckets: string[]) {
  const byDay = new Map<string, number>();

  for (const row of rows) {
    // `SUM()` comes back from pg as a bigint; `COUNT()` as a number. Normalise both.
    byDay.set(isoDay(row.bucket), Number(row.value ?? 0));
  }

  return buckets.map((bucket) => byDay.get(bucket) ?? 0);
}

/**
 * `days` of daily activity across every metric the dashboard plots.
 *
 * All seven queries run in parallel — serialised, a 90-day window took long enough that the
 * dashboard felt broken, the same reason `getAdminOverview` fans out.
 */
async function buildAdminTimeSeries(days: number) {
  const buckets = buildBuckets(days);
  const since = new Date(`${buckets[0]}T00:00:00.000Z`);

  const [
    signups,
    subscriptions,
    publications,
    documents,
    portfolioViews,
    creditsSpent,
    commissionCents,
  ] = await Promise.all([
    prisma.$queryRaw<DailyRow[]>`
      SELECT date_trunc('day', "createdAt" AT TIME ZONE 'UTC') AS bucket, COUNT(*) AS value
      FROM "User"
      WHERE "createdAt" >= ${since}
      GROUP BY bucket
    `,
    prisma.$queryRaw<DailyRow[]>`
      SELECT date_trunc('day', "createdAt" AT TIME ZONE 'UTC') AS bucket, COUNT(*) AS value
      FROM "Subscription"
      WHERE "createdAt" >= ${since} AND "status" = 'ACTIVE'
      GROUP BY bucket
    `,
    prisma.$queryRaw<DailyRow[]>`
      SELECT date_trunc('day', "publishedAt" AT TIME ZONE 'UTC') AS bucket, COUNT(*) AS value
      FROM "PortfolioPublication"
      WHERE "publishedAt" >= ${since}
      GROUP BY bucket
    `,
    prisma.$queryRaw<DailyRow[]>`
      SELECT date_trunc('day', "createdAt" AT TIME ZONE 'UTC') AS bucket, COUNT(*) AS value
      FROM "Document"
      WHERE "createdAt" >= ${since} AND "deletedAt" IS NULL
      GROUP BY bucket
    `,
    // Already pre-aggregated per day by the view flush job, so this sums rather than counts.
    prisma.$queryRaw<DailyRow[]>`
      SELECT date_trunc('day', "date" AT TIME ZONE 'UTC') AS bucket, SUM("count") AS value
      FROM "PortfolioViewDaily"
      WHERE "date" >= ${since}
      GROUP BY bucket
    `,
    // DEBIT amounts are stored negative; negate so the chart plots spend as a positive number.
    prisma.$queryRaw<DailyRow[]>`
      SELECT date_trunc('day', "createdAt" AT TIME ZONE 'UTC') AS bucket, -SUM("amount") AS value
      FROM "CreditTransaction"
      WHERE "createdAt" >= ${since} AND "type" = 'DEBIT'
      GROUP BY bucket
    `,
    prisma.$queryRaw<DailyRow[]>`
      SELECT date_trunc('day', "createdAt" AT TIME ZONE 'UTC') AS bucket, SUM("amountCents") AS value
      FROM "AffiliateCommission"
      WHERE "createdAt" >= ${since} AND "status" <> 'REVERSED'
      GROUP BY bucket
    `,
  ]);

  return {
    generatedAt: new Date().toISOString(),
    days,
    buckets,
    series: {
      signups: alignToBuckets(signups, buckets),
      subscriptions: alignToBuckets(subscriptions, buckets),
      publications: alignToBuckets(publications, buckets),
      documents: alignToBuckets(documents, buckets),
      portfolioViews: alignToBuckets(portfolioViews, buckets),
      creditsSpent: alignToBuckets(creditsSpent, buckets),
      commissionCents: alignToBuckets(commissionCents, buckets),
    },
  };
}

/**
 * GET /admin/overview/series.
 *
 * Cached the longest of the admin reads: these are historical daily buckets, and every point is
 * a `date_trunc` scan per metric across a window of up to 180 days. Only the newest bucket can
 * still move, so serving a few-minute-old series costs the operator nothing.
 */
export async function getAdminTimeSeries(days: number) {
  const key = adminTimeSeriesCacheKey(days);

  const cached = await cacheGet<Awaited<ReturnType<typeof buildAdminTimeSeries>>>(key);
  if (cached) return cached;

  const series = await buildAdminTimeSeries(days);
  await cacheSet(key, series, ADMIN_TIME_SERIES_TTL_SECONDS);

  return series;
}

export type AdminTimeSeries = Awaited<ReturnType<typeof getAdminTimeSeries>>;
