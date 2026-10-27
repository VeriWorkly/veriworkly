import { Prisma } from "@prisma/client";

import { logger } from "#lib/logger";
import { prisma } from "#lib/prisma";
import {
  sendPaymentFailedEmail,
  sendPlanChangedEmail,
  sendPurchaseConfirmationEmail,
  sendSubscriptionCancelledEmail,
  type PaymentFailedNotice,
  type PlanChangedNotice,
  type PurchaseConfirmation,
  type SubscriptionCancelledNotice,
} from "#services/mail/billingMail";
import {
  sendPortfolioFreeTierEmail,
  type PortfolioFreeTierNotice,
} from "#services/mail/portfolioMail";
import { sendOperatorAlertEmail, type OperatorAlert } from "#services/mail/operatorMail";

/**
 * Billing emails (V-172, V-177) go out at most once per (kind, reference), and are not lost when
 * the process dies between deciding to send and sending.
 *
 * The `BillingNotification` row is the claim. It is written before the send with what the email
 * says (`payload`: amounts, product names, dates; never the address or the name, which are read
 * from the account at send time) and gets `sentAt` once the send succeeded. A claim without
 * `sentAt` is either being sent right now or was left behind by a failed send or a crash; once it
 * is older than `RETRY_AFTER_MS` the hourly billing job (`jobs/annualCreditJob`) takes it over
 * through a compare-and-set on `claimedAt`, so two runners never send the same claim at once, and
 * a claim marked sent is never sent again. The one gap left is a crash after the provider
 * accepted the mail but before `sentAt` was written, which resends once: an email twice is better
 * than a purchase never confirmed.
 */

export type BillingNotice =
  | { template: "purchase_confirmation"; details: PurchaseConfirmation }
  | {
      template: "payment_failed";
      details: PaymentFailedNotice;
      /** The subscription that failed: a retry is dropped once it has recovered. */
      subscriptionId?: string;
    }
  | { template: "portfolio_free_tier"; details: PortfolioFreeTierNotice }
  | {
      template: "subscription_cancelled";
      details: SubscriptionCancelledNotice;
      /** The subscription that is ending: a retry is dropped once it renews again. */
      subscriptionId?: string;
    }
  | { template: "plan_changed"; details: PlanChangedNotice }
  /** To the operator (ADMIN_EMAIL), not a customer (V-371). */
  | { template: "operator_alert"; details: OperatorAlert };

const TEMPLATES = new Set([
  "purchase_confirmation",
  "payment_failed",
  "portfolio_free_tier",
  "subscription_cancelled",
  "plan_changed",
  "operator_alert",
]);

/** Long enough that a send still in flight is never taken over. */
const RETRY_AFTER_MS = 5 * 60 * 1000;
/** Hourly retries: a claim still failing after this many attempts needs a human. */
const MAX_ATTEMPTS = 6;
const RETRY_BATCH_SIZE = 100;
const DATE_FIELDS = ["accessEndsAt", "renewsAt", "graceEndsAt"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Dates become ISO strings in the JSON column; `revive` turns them back. */
function serialize(notice: BillingNotice): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(notice)) as Prisma.InputJsonValue;
}

function revive(payload: unknown): BillingNotice | null {
  if (!isRecord(payload) || !isRecord(payload.details)) return null;
  if (typeof payload.template !== "string" || !TEMPLATES.has(payload.template)) return null;
  const details: Record<string, unknown> = { ...payload.details };
  for (const field of DATE_FIELDS)
    if (typeof details[field] === "string") details[field] = new Date(details[field] as string);
  return { ...payload, details } as BillingNotice;
}

async function send(notice: BillingNotice, user: { email: string; name: string }) {
  if (notice.template === "purchase_confirmation")
    await sendPurchaseConfirmationEmail(user.email, { ...notice.details, name: user.name });
  else if (notice.template === "payment_failed")
    await sendPaymentFailedEmail(user.email, { ...notice.details, name: user.name });
  else if (notice.template === "subscription_cancelled")
    await sendSubscriptionCancelledEmail(user.email, { ...notice.details, name: user.name });
  else if (notice.template === "plan_changed")
    await sendPlanChangedEmail(user.email, { ...notice.details, name: user.name });
  else if (notice.template === "operator_alert")
    await sendOperatorAlertEmail(user.email, notice.details);
  else await sendPortfolioFreeTierEmail(user.email, { ...notice.details, name: user.name });
}

/**
 * A payment-failed notice that is no longer true: since the failure was recorded the subscription
 * moved again and is ACTIVE with a paid period running (the provider's retry went through).
 * Checked before every retry. A row still ACTIVE but untouched since the failure is not proof of
 * recovery: the failure can land before the subscription's own dunning event.
 */
async function noLongerTrue(notice: BillingNotice, failedAt: Date, now: Date) {
  if (notice.template === "subscription_cancelled") {
    // Resumed since: the subscription renews after all, so "will not renew" is no longer true.
    if (!notice.subscriptionId) return false;
    const subscription = await prisma.subscription.findUnique({
      where: { providerSubId: notice.subscriptionId },
      select: { status: true, cancelAtPeriodEnd: true },
    });
    return subscription?.status === "ACTIVE" && !subscription.cancelAtPeriodEnd;
  }
  if (notice.template !== "payment_failed" || !notice.subscriptionId) return false;
  const subscription = await prisma.subscription.findUnique({
    where: { providerSubId: notice.subscriptionId },
    select: { status: true, currentPeriodEnd: true, updatedAt: true },
  });
  return Boolean(
    subscription?.status === "ACTIVE" &&
    subscription.updatedAt > failedAt &&
    (!subscription.currentPeriodEnd || subscription.currentPeriodEnd > now),
  );
}

async function recipient(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  return user?.email ? { email: user.email, name: user.name || "there" } : null;
}

async function markSent(id: string) {
  await prisma.billingNotification.updateMany({
    where: { id, sentAt: null },
    data: { sentAt: new Date() },
  });
}

/** Sends started by `notifyOnce` that have not finished, most of them fire-and-forget. */
const inFlight = new Set<Promise<void>>();

/**
 * Resolves once every billing email started so far has been sent or has failed, including ones
 * started while it waits. The webhooks start their emails without awaiting them, so this is how
 * a caller (the integration tests, V-354) knows there is no send still to land.
 */
export async function settleBillingNotifications() {
  while (inFlight.size > 0) await Promise.allSettled([...inFlight]);
}

/**
 * Sends a billing email at most once per (kind, reference). A failed send keeps its claim for the
 * retry job. Never throws: the payment is processed whether or not the mail goes out.
 */
export function notifyOnce(
  kind: string,
  reference: string,
  userId: string,
  notice: BillingNotice,
): Promise<void> {
  return trackBillingNotification(sendOnce(kind, reference, userId, notice));
}

/**
 * Counts a send that starts with other work first (an operator alert looks the admin up) as in
 * flight from the start, so `settleBillingNotifications` waits for it too.
 */
export function trackBillingNotification(run: Promise<void>): Promise<void> {
  inFlight.add(run);
  void run.finally(() => inFlight.delete(run));
  return run;
}

async function sendOnce(kind: string, reference: string, userId: string, notice: BillingNotice) {
  try {
    const user = await recipient(userId);
    if (!user) return;

    let claim;
    try {
      claim = await prisma.billingNotification.create({
        data: { kind, reference, userId, payload: serialize(notice) },
        select: { id: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return;
      throw error;
    }

    await send(notice, user);
    await markSent(claim.id);
  } catch (error) {
    logger.warn(`Failed to send the ${kind} email; the billing job will retry it`, {
      reference,
      error,
    });
  }
}

/**
 * Sends the claims nobody finished: unsent, claimed more than `RETRY_AFTER_MS` before `at`. Each
 * is re-claimed by a compare-and-set on `claimedAt` first, so a concurrent run skips it.
 */
export async function retryUnsentBillingNotifications(at = new Date()) {
  const totals = { retried: 0, sent: 0, failed: 0 };
  const due = await prisma.billingNotification.findMany({
    where: {
      sentAt: null,
      claimedAt: { lte: new Date(at.getTime() - RETRY_AFTER_MS) },
      attempts: { lt: MAX_ATTEMPTS },
      userId: { not: null },
      payload: { not: Prisma.DbNull },
    },
    select: {
      id: true,
      kind: true,
      reference: true,
      userId: true,
      payload: true,
      claimedAt: true,
      attempts: true,
      createdAt: true,
    },
    orderBy: { claimedAt: "asc" },
    take: RETRY_BATCH_SIZE,
  });

  for (const row of due) {
    const claimed = await prisma.billingNotification.updateMany({
      where: { id: row.id, sentAt: null, claimedAt: row.claimedAt },
      data: { claimedAt: at, attempts: { increment: 1 } },
    });
    if (!claimed.count) continue;
    totals.retried += 1;

    const notice = revive(row.payload);
    const user = row.userId ? await recipient(row.userId) : null;
    if (!notice || !user) continue;
    if (await noLongerTrue(notice, row.createdAt, new Date())) {
      // Never retried again: the attempts run out rather than marking a send that never happened.
      await prisma.billingNotification.updateMany({
        where: { id: row.id, sentAt: null },
        data: { attempts: MAX_ATTEMPTS },
      });
      continue;
    }

    try {
      await send(notice, user);
      await markSent(row.id);
      totals.sent += 1;
    } catch (error) {
      totals.failed += 1;
      const attempts = row.attempts + 1;
      const log = attempts >= MAX_ATTEMPTS ? logger.error : logger.warn;
      log(
        attempts >= MAX_ATTEMPTS
          ? `Giving up on the ${row.kind} email after ${attempts} attempts`
          : `Retrying the ${row.kind} email failed`,
        { reference: row.reference, attempts, error },
      );
    }
  }

  return totals;
}
