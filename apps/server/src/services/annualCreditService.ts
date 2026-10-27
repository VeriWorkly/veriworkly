import type { Prisma } from "@prisma/client";

import { prisma } from "#lib/prisma";
import { logger } from "#lib/logger";
import { CreditService } from "#services/creditService";
import { CREDIT_SOURCES } from "#services/creditSources";
import {
  ANNUAL_CREDIT_MONTHS,
  ANNUAL_MONTHLY_CREDITS,
  isProductKey,
  productCatalog,
} from "#services/productCatalog";

/**
 * Annual plans deliver credits monthly (owner decision 4): 1,000 at the start of each of the
 * twelve months of a paid annual period instead of 12,000 up front. Subscription credits reset
 * monthly and nothing rolls over: each month's grant expires when that month ends, and whatever
 * is left is removed by the credit expiry sweep (`sweepExpiredCredits`) as the next month's 1,000
 * arrives. Credit packs are separate grants with their own 90-day expiry and are never touched by
 * the reset; the ledger spends the soonest-expiring credits first, so the month's credits go
 * before a pack's.
 *
 * Why a schedule row plus a job, rather than a grant per webhook: Dodo bills an annual plan once a
 * year, so months two to twelve have no provider event to hang a grant on. The payment opens the
 * schedule and grants month one at once (the customer sees credits the moment they pay); the
 * hourly job grants each later month when it starts. Both paths run the same `grantDueMonths`,
 * and each grant is keyed `<schedule id>:<month index>` on both the ledger request id and the
 * grant's unique (userId, source, sourceId), so a retried webhook, a second worker or an
 * overlapping job run can never grant a month twice. A month that ended while the job was down is
 * not granted afterwards: its credits would already have expired.
 *
 * A schedule only exists for a period whose payment earned an allowance (`applyPaymentEvent`
 * skips zero-amount and card-update payments), so a 100 % coupon still earns no credits. Every
 * later month is judged at its own start: the subscription must be an annual plan that carries
 * credits and either ACTIVE or cancelled with the paid period still running at that month's start
 * (a cancellation keeps what was paid for). A plan change to Creator Pro or to a monthly plan, or
 * a month that starts after the paid period ended, stops the schedule. An upgrade from AI Credits
 * to the bundle keeps it (both carry 1,000 a month).
 */

export const ANNUAL_CREDIT_SOURCE = CREDIT_SOURCES.annualMonthly;

const DAY_MS = 24 * 60 * 60 * 1000;
/**
 * Without a service period, a payment within a week of a schedule's start belongs to that
 * schedule (a redelivery, a retried charge), as does one more than a week before its end.
 */
const COVERED_MARGIN_MS = 7 * DAY_MS;
/**
 * Without a service period, only a payment within this long of the running schedule's end is read
 * as an early renewal that pays for the next year. Anything earlier in the year (a proration for a
 * plan change, a retried charge) belongs to the running schedule. 30 days covers a renewal paid
 * up to a month ahead; a renewal paid earlier than that still gets its schedule from the payment
 * that follows, or from the service period Dodo sends with current payloads.
 */
const EARLY_RENEWAL_WINDOW_MS = 30 * DAY_MS;
const JOB_BATCH_SIZE = 100;

/** Calendar months in UTC, clamped to the month's last day (31 Jan + 1 month = 28/29 Feb). */
export function addMonthsUtc(date: Date, months: number) {
  const target = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + months,
      1,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(date.getUTCDate(), lastDay));
  return target;
}

function monthSourceId(scheduleId: string, month: number) {
  return `${scheduleId}:${month}`;
}

/**
 * Every subscription credit grant of one provider subscription: its monthly-plan allowances
 * (sourced `<subscription id>:...`) and the monthly grants of its annual schedules. A new month's
 * grant supersedes these (`CreditService.grant`'s `supersedes`); credit packs, passes and admin
 * grants never match.
 *
 * Legacy annual allowances are excluded: before monthly delivery an annual payment granted the
 * year's 12,000 at once as a `subscription_payment` grant, and migration
 * 20261026100000 promises those holders keep them. Since that release a `subscription_payment`
 * grant on a subscription carries one month (1,000) at most, so anything larger is a legacy
 * up-front allowance and is never cut, whatever payment lands on the subscription later.
 */
export async function subscriptionCreditGrantsWhere(
  providerSubId: string,
): Promise<Prisma.CreditGrantWhereInput> {
  const schedules = await prisma.subscriptionCreditSchedule.findMany({
    where: { providerSubId },
    select: { id: true },
  });
  return {
    OR: [
      {
        source: CREDIT_SOURCES.subscriptionPayment,
        sourceId: { startsWith: `${providerSubId}:` },
        amount: { lte: ANNUAL_MONTHLY_CREDITS },
      },
      ...schedules.map((schedule) => ({
        source: ANNUAL_CREDIT_SOURCE,
        sourceId: { startsWith: `${schedule.id}:` },
      })),
    ],
  };
}

/**
 * Opens the schedule for the annual period a payment pays for, or returns the one that already
 * covers it. Serialised per user on the same advisory lock the billing transactions take, so two
 * deliveries of one payment cannot open two schedules.
 *
 * With a service period the period is the payment's own. Without one, a redelivery of the payment
 * that opened a schedule returns that schedule; a payment within `EARLY_RENEWAL_WINDOW_MS` of a
 * running schedule's end (but more than a week before it, and more than a week after its start)
 * is an early renewal and pays for the period that follows; any other payment inside a running
 * schedule (a mid-year plan-change proration) is that schedule's.
 */
/**
 * Whether a legacy up-front year was taken back (V-281): a refund claw-back recorded against the
 * grant (`CreditService.clawBackGrant`, even one the wallet's balance limited), or, when nothing
 * was left to claw back, the payment that granted it reversed in full.
 */
async function legacyYearReversed(
  tx: Prisma.TransactionClient,
  grantId: string,
  isPaymentReversed?: (paymentId: string) => Promise<boolean>,
) {
  const clawback = await tx.creditTransaction.findFirst({
    where: { requestId: `refund-clawback:${grantId}` },
    select: { id: true },
  });
  if (clawback) return true;
  if (!isPaymentReversed) return false;

  const granted = await tx.creditTransaction.findFirst({
    where: { referenceId: grantId, requestId: { startsWith: "subscription-credit:" } },
    select: { requestId: true },
  });
  const paymentId = granted?.requestId?.slice("subscription-credit:".length);
  return paymentId ? isPaymentReversed(paymentId) : false;
}

/** `null` when a legacy up-front annual allowance still covers the payment's period. */
export async function openAnnualCreditSchedule(input: {
  userId: string;
  providerSubId: string;
  productKey: string;
  paymentId: string;
  periodStart: Date;
  periodEnd: Date;
  /** False when the payment named no service period and the period was derived from its date. */
  servicePeriodKnown: boolean;
  /**
   * Whether a provider payment was reversed in full (refunds and lost disputes). Billing passes
   * its own rule; without it only a recorded claw-back counts as a reversal.
   */
  isPaymentReversed?: (paymentId: string) => Promise<boolean>;
}) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.userId}))`;

    const opened = await tx.subscriptionCreditSchedule.findFirst({
      where: { providerSubId: input.providerSubId, openedByPaymentId: input.paymentId },
    });
    if (opened) return opened;

    // A legacy holder's up-front year (12,000 at once, before monthly delivery) that is still
    // running covers this payment: a mid-year plan change opens no monthly schedule on top of it.
    // The renewal for the period after it does (the legacy grant has expired by then).
    const legacyYears = await tx.creditGrant.findMany({
      where: {
        // By owner: the oldest legacy grants are keyed on a bare payment id that names no
        // subscription. Since monthly delivery no subscription grant exceeds 1,000.
        userId: input.userId,
        source: CREDIT_SOURCES.subscriptionPayment,
        amount: { gt: ANNUAL_MONTHLY_CREDITS },
        expiresAt: { gt: new Date(input.periodStart.getTime() + COVERED_MARGIN_MS) },
        // A grant that names a subscription covers only that one: a year left over from a
        // cancelled plan does not hold back a new annual plan's monthly credits (V-281).
        OR: [
          { sourceId: { startsWith: `${input.providerSubId}:` } },
          { NOT: { sourceId: { contains: ":" } } },
        ],
      },
      select: { id: true },
    });
    // Spent or not, a year the customer received still covers it; only a reversed one does not
    // (V-281). `remaining` cannot tell the two apart: a spent year is at 0 too, and a claw-back
    // limited by the wallet's balance leaves some behind.
    for (const grant of legacyYears)
      if (!(await legacyYearReversed(tx, grant.id, input.isPaymentReversed))) return null;

    const coveringAt = (start: Date) =>
      tx.subscriptionCreditSchedule.findFirst({
        where: {
          providerSubId: input.providerSubId,
          periodStart: { lte: new Date(start.getTime() + DAY_MS) },
          periodEnd: { gt: new Date(start.getTime() + COVERED_MARGIN_MS) },
        },
        orderBy: { periodStart: "desc" },
      });

    let periodStart = input.periodStart;
    let periodEnd = input.periodEnd;
    const covering = await coveringAt(periodStart);
    if (covering) {
      const earlyRenewal =
        !input.servicePeriodKnown &&
        periodStart.getTime() >= covering.periodStart.getTime() + COVERED_MARGIN_MS &&
        periodStart.getTime() >= covering.periodEnd.getTime() - EARLY_RENEWAL_WINDOW_MS;
      if (!earlyRenewal) return covering;

      periodStart = covering.periodEnd;
      periodEnd = addMonthsUtc(periodStart, ANNUAL_CREDIT_MONTHS);
      const next = await coveringAt(periodStart);
      if (next) return next;
    }

    return tx.subscriptionCreditSchedule.create({
      data: {
        userId: input.userId,
        providerSubId: input.providerSubId,
        productKey: input.productKey,
        periodStart,
        periodEnd,
        monthlyCredits: ANNUAL_MONTHLY_CREDITS,
        openedByPaymentId: input.paymentId,
      },
    });
  });
}

type ScheduleSubscription = {
  status: "INACTIVE" | "ACTIVE" | "PAST_DUE" | "CANCELED";
  interval: string | null;
  productKey: string;
  currentPeriodEnd: Date | null;
};

/**
 * Whether the month starting at `monthStart` earns its credits, judged at that start rather than
 * on today's state: "grant", "hold" (dunning, a pending change, or an ACTIVE row whose paid
 * period ended before the month starts, i.e. a renewal not yet confirmed: try again on the next
 * run) or "stop" (the schedule is over for good). An ACTIVE label alone never grants a month the
 * subscription has not been paid through: a next-year schedule opened by an early payment waits
 * for the renewal to show in `currentPeriodEnd`.
 */
function monthEligibility(subscription: ScheduleSubscription, monthStart: Date) {
  const carriesCredits =
    isProductKey(subscription.productKey) &&
    (productCatalog[subscription.productKey].creditAllowance?.annual ?? 0) > 0;
  if (subscription.interval !== "ANNUAL" || !carriesCredits) return "stop" as const;
  if (subscription.status === "CANCELED")
    return subscription.currentPeriodEnd && subscription.currentPeriodEnd > monthStart
      ? ("grant" as const)
      : ("stop" as const);
  if (
    subscription.status === "ACTIVE" &&
    (!subscription.currentPeriodEnd || subscription.currentPeriodEnd > monthStart)
  )
    return "grant" as const;
  return "hold" as const;
}

/**
 * Grants the month of the schedule running at `at`, if it is not granted yet. The month the
 * payment opened the schedule for needs nothing else; any other month is judged on the
 * subscription at its start (`monthEligibility`), and stops the schedule for good when it does
 * not qualify.
 */
export async function grantDueMonths(scheduleId: string, at = new Date()) {
  const schedule = await prisma.subscriptionCreditSchedule.findUnique({
    where: { id: scheduleId },
  });
  if (!schedule || schedule.stoppedAt) return 0;

  const granted = new Set(
    (
      await prisma.creditGrant.findMany({
        where: {
          userId: schedule.userId,
          source: ANNUAL_CREDIT_SOURCE,
          sourceId: { startsWith: `${schedule.id}:` },
        },
        select: { sourceId: true },
      })
    ).map((grant) => grant.sourceId),
  );

  let subscription: ScheduleSubscription | null | undefined;
  let count = 0;

  for (let month = 0; month < ANNUAL_CREDIT_MONTHS; month += 1) {
    const monthStart = addMonthsUtc(schedule.periodStart, month);
    if (monthStart > at || monthStart >= schedule.periodEnd) break;
    const nextMonthStart = addMonthsUtc(schedule.periodStart, month + 1);
    let monthEnd = nextMonthStart < schedule.periodEnd ? nextMonthStart : schedule.periodEnd;
    // Over already: its credits would expire the moment they were granted.
    if (monthEnd <= at) continue;
    const sourceId = monthSourceId(schedule.id, month);
    if (granted.has(sourceId)) continue;

    // The payment's own month: the schedule was opened for it.
    const openedForThisMonth =
      month === 0 && monthStart.getTime() <= schedule.createdAt.getTime() + DAY_MS;
    if (!openedForThisMonth) {
      if (subscription === undefined)
        subscription = await prisma.subscription.findUnique({
          where: { providerSubId: schedule.providerSubId },
          select: { status: true, interval: true, productKey: true, currentPeriodEnd: true },
        });
      // No row yet (its event has not landed): wait for the next run rather than stop.
      if (!subscription) return count;
      const eligibility = monthEligibility(subscription, monthStart);
      if (eligibility === "hold") return count;
      if (eligibility === "stop") {
        await prisma.subscriptionCreditSchedule.updateMany({
          where: { id: schedule.id, stoppedAt: null },
          data: { stoppedAt: at },
        });
        logger.info("Annual credit schedule stopped", {
          scheduleId: schedule.id,
          providerSubId: schedule.providerSubId,
          month,
          status: subscription.status,
          interval: subscription.interval,
          productKey: subscription.productKey,
        });
        return count;
      }
      // Cancelled: the month's credits end with the paid period at the latest.
      if (
        subscription.status === "CANCELED" &&
        subscription.currentPeriodEnd &&
        subscription.currentPeriodEnd < monthEnd
      )
        monthEnd = subscription.currentPeriodEnd;
    }

    const productName = isProductKey(schedule.productKey)
      ? productCatalog[schedule.productKey].name
      : "Annual plan";
    await CreditService.grant(schedule.userId, schedule.monthlyCredits, {
      requestId: `annual-credit:${sourceId}`,
      source: ANNUAL_CREDIT_SOURCE,
      sourceId,
      expiresAt: monthEnd,
      reason: `${productName} monthly credits (month ${month + 1} of ${ANNUAL_CREDIT_MONTHS})`,
      // A new month replaces what is left of the subscription's earlier credits.
      supersedes: {
        where: await subscriptionCreditGrantsWhere(schedule.providerSubId),
        at: monthStart,
      },
    });
    count += 1;
  }

  return count;
}

/**
 * The hourly run (`jobs/annualCreditJob`): every open schedule whose period has not ended, in id
 * order, through `grantDueMonths`. A failing schedule is logged and skipped so one bad ledger
 * cannot hold back the rest; the run then throws so `/health/jobs` does not count it.
 */
export async function runAnnualCreditGrants(at = new Date()) {
  const totals = { schedules: 0, granted: 0, failed: 0 };
  let cursor = "";

  for (;;) {
    const due = await prisma.subscriptionCreditSchedule.findMany({
      where: {
        stoppedAt: null,
        periodEnd: { gt: at },
        periodStart: { lte: at },
        id: { gt: cursor },
      },
      select: { id: true },
      orderBy: { id: "asc" },
      take: JOB_BATCH_SIZE,
    });
    if (!due.length) break;

    for (const { id } of due) {
      totals.schedules += 1;
      try {
        totals.granted += await grantDueMonths(id, at);
      } catch (error) {
        totals.failed += 1;
        logger.error("Annual credit grant failed for a schedule", { scheduleId: id, error });
      }
    }
    cursor = due[due.length - 1]!.id;
    if (due.length < JOB_BATCH_SIZE) break;
  }

  return totals;
}
