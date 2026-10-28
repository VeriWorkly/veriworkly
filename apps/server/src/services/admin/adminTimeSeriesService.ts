import { prisma } from "#lib/prisma";
import { cacheGet, cacheSet } from "#lib/redis";

import { ADMIN_TIME_SERIES_TTL_SECONDS, adminTimeSeriesCacheKey } from "#services/admin/cache";
import { AFFILIATE_WALLET_CURRENCY } from "#services/affiliate/constants";

/**
 * Daily time series behind the admin dashboard charts.
 *
 * Prisma's `groupBy` cannot bucket a `DateTime` column by day, so each metric is a raw
 * `date_trunc` query. The gap filling is deliberately done in TypeScript rather than with a
 * SQL `generate_series` join: a day with no rows must still render as a zero point, and doing
 * that in JS keeps every query a plain single-table range scan on the window column (indexed for
 * all but one: `createdAt`, `firstPublishedAt`, `date`, `[type, createdAt]`; `AffiliateCommission`
 * has only `[status, createdAt]`, so its series scans that small table).
 *
 * Day boundaries are UTC regardless of the session `TimeZone` (V-071). Prisma `DateTime` columns
 * are `timestamp without time zone` holding UTC wall-clock time, so the 2-argument
 * `date_trunc('day', "createdAt")` on the bare column already truncates at UTC midnight. Adding
 * `AT TIME ZONE 'UTC'` (or the 3-argument form, which only takes a `timestamptz`) converts to
 * `timestamptz` first and then truncates in the session zone, which moved rows a day on any
 * non-UTC session.
 *
 * Every series counts what was *created* that day, whatever happened to the row afterwards: a
 * subscription cancelled later and a document soft-deleted later stay on their creation day
 * (`getDocumentSummary.createdLast30Days` follows the same rule), and a portfolio counts on the day
 * it first went online, not its latest republish (V-288). The one exception is money:
 * `commissionCents` leaves reversed commissions out (V-267), because a commission taken back was
 * never earned, so a refund shrinks its sale day's bar.
 *
 * Every query here is a literal template — no identifier is interpolated from input — so the
 * only parameter that ever reaches Postgres is the window start date.
 */

interface DailyRow {
  bucket: Date;
  value: number | bigint | null;
}

/** UTC midnight for `date`, matching the `date_trunc('day', <timestamp>)` used in the queries. */
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
      SELECT date_trunc('day', "createdAt") AS bucket, COUNT(*) AS value
      FROM "User"
      WHERE "createdAt" >= ${since}
      GROUP BY bucket
    `,
    prisma.$queryRaw<DailyRow[]>`
      SELECT date_trunc('day', "createdAt") AS bucket, COUNT(*) AS value
      FROM "Subscription"
      WHERE "createdAt" >= ${since}
      GROUP BY bucket
    `,
    prisma.$queryRaw<DailyRow[]>`
      SELECT date_trunc('day', "firstPublishedAt") AS bucket, COUNT(*) AS value
      FROM "PortfolioPublication"
      WHERE "firstPublishedAt" >= ${since}
      GROUP BY bucket
    `,
    prisma.$queryRaw<DailyRow[]>`
      SELECT date_trunc('day', "createdAt") AS bucket, COUNT(*) AS value
      FROM "Document"
      WHERE "createdAt" >= ${since}
      GROUP BY bucket
    `,
    // Already pre-aggregated per day by the view flush job, so this sums rather than counts.
    prisma.$queryRaw<DailyRow[]>`
      SELECT date_trunc('day', "date") AS bucket, SUM("count") AS value
      FROM "PortfolioViewDaily"
      WHERE "date" >= ${since}
      GROUP BY bucket
    `,
    // DEBIT amounts are stored negative; negate so the chart plots spend as a positive number.
    prisma.$queryRaw<DailyRow[]>`
      SELECT date_trunc('day', "createdAt") AS bucket, -SUM("amount") AS value
      FROM "CreditTransaction"
      WHERE "createdAt" >= ${since} AND "type" = 'DEBIT'
      GROUP BY bucket
    `,
    // Cents only add up within one currency: the wallet's, as the affiliate summary sums (V-261).
    // Commission still owed, released or paid; a reversed one (refunded, or a non-USD row replaced
    // by its USD conversion) was never earned, and counting it doubled converted sales (V-267).
    prisma.$queryRaw<DailyRow[]>`
      SELECT date_trunc('day', "createdAt") AS bucket, SUM("amountCents") AS value
      FROM "AffiliateCommission"
      WHERE "createdAt" >= ${since} AND "currency" = ${AFFILIATE_WALLET_CURRENCY}
        AND "status" <> 'REVERSED'
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
  const key = await adminTimeSeriesCacheKey(days);

  const cached = key ? await cacheGet<Awaited<ReturnType<typeof buildAdminTimeSeries>>>(key) : null;
  if (cached) return cached;

  const series = await buildAdminTimeSeries(days);
  if (key) await cacheSet(key, series, ADMIN_TIME_SERIES_TTL_SECONDS);

  return series;
}
