import { config } from "#config";
import { logger } from "#lib/logger";
import { prisma } from "#lib/prisma";
import { notifyOnce, trackBillingNotification } from "#services/billingNotifications";
import type { OperatorAlert } from "#services/mail/operatorMail";

/** Failed attempts after which a billing webhook is dead-lettered and the operator is mailed. */
export const BILLING_WEBHOOK_DEAD_LETTER_RETRIES = 5;
/** How long a processed event with a note keeps `/health/jobs` asking for attention. */
const NOTED_EVENT_WINDOW_MS = 24 * 60 * 60 * 1000;
/**
 * How long a dead-letter keeps it asking (V-371 review): a week to replay or reconcile it. After
 * that it stays in the admin webhook list, but no longer keeps the uptime check red forever.
 */
const DEAD_LETTER_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const ALERT_ERROR_MAX_CHARS = 120;

/**
 * An error as an operator email may show it (V-371 review): its class, its code when it has one,
 * and a generic description. Never the message itself, which can quote customer data (a Prisma
 * error repeats the query's arguments); the full message stays in the log and on the event row.
 */
export function describeErrorForAlert(error: unknown): string {
  const name = error instanceof Error ? error.constructor.name || error.name : "Unknown error";
  const code =
    error && typeof error === "object" && "code" in error && typeof error.code === "string"
      ? ` (${error.code})`
      : "";
  const statusCode =
    error && typeof error === "object" && "statusCode" in error
      ? ` (HTTP ${String(error.statusCode)})`
      : "";
  const what = /^Prisma/.test(name)
    ? "a database request failed"
    : name === "ZodError"
      ? "the event did not have the shape the server expects"
      : "see the server log and the event's error in Admin > Billing > Webhooks";
  return `${name}${code}${statusCode}: ${what}`.slice(0, ALERT_ERROR_MAX_CHARS);
}

/**
 * The billing incidents still open, for `/health/jobs` (V-371): webhooks dead-lettered in the
 * last week, not yet replayed and still replayable, and events processed with a note for a person
 * in the last day.
 */
export async function billingIncidentCounts() {
  const [[failed], notedWebhooks] = await Promise.all([
    // A redacted payload can never be replayed, so it is not an open incident (V-371 review).
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) AS count FROM "BillingWebhookEvent"
      WHERE "status" = 'FAILED'
        AND "retryCount" >= ${BILLING_WEBHOOK_DEAD_LETTER_RETRIES}
        AND "updatedAt" > ${new Date(Date.now() - DEAD_LETTER_WINDOW_MS)}
        AND NOT COALESCE("payload" ->> 'redacted' = 'true', false)`,
    prisma.billingWebhookEvent.count({
      where: {
        status: "PROCESSED",
        error: { not: null },
        createdAt: { gt: new Date(Date.now() - NOTED_EVENT_WINDOW_MS) },
      },
    }),
  ]);
  return { failedWebhooks: Number(failed?.count ?? 0), notedWebhooks };
}

/**
 * Mails a money incident to the operator (ADMIN_EMAIL), once per incident (V-371).
 *
 * Built on the billing notification claims, so an alert is sent at most once per
 * (`kind`, `reference`) and a failed send is retried by the hourly billing job like any billing
 * email. The log line stays as well. Never throws: an incident is recorded whether or not the
 * mail goes out.
 */
export function alertOperator(kind: string, reference: string, alert: OperatorAlert) {
  return trackBillingNotification(sendAlert(kind, reference, alert));
}

async function sendAlert(kind: string, reference: string, alert: OperatorAlert) {
  try {
    const email = config.admin.email;
    const admin = email
      ? await prisma.user.findUnique({ where: { email }, select: { id: true } })
      : null;
    if (!admin) {
      logger.error("Operator alert not mailed: no account for ADMIN_EMAIL", { kind, reference });
      return;
    }
    await notifyOnce(`operator_alert:${kind}`, reference, admin.id, {
      template: "operator_alert",
      details: alert,
    });
  } catch (error) {
    logger.error("Operator alert not mailed", {
      kind,
      reference,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
