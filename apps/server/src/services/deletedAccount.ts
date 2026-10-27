import { Prisma as PrismaNamespace, type Prisma } from "@prisma/client";

import { logger } from "#lib/logger";
import { prisma } from "#lib/prisma";

/*
 * Kept apart from userService on purpose: the billing webhook imports this, and userService
 * pulls in better-auth and its configuration.
 */

/**
 * True when a billing event names an account that has been deleted (V-183): the stored row it
 * refers to is detached (`userId` null), or the user id it carries no longer exists. The
 * webhook records such an event as processed and applies nothing; it must neither fail (the
 * provider would retry it for days) nor write rows for a user that is gone.
 */
export async function isDeletedAccount(
  userId: string | null | undefined,
  storedRow: { userId: string | null } | null,
  context: Record<string, unknown>,
) {
  const deleted =
    (storedRow !== null && storedRow.userId === null) ||
    (typeof userId === "string" &&
      userId.length > 0 &&
      !(await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })));

  if (deleted)
    logger.warn("Billing event for a deleted account; recorded, nothing applied", context);
  return deleted;
}

/*
 * Billing rows outlive the account (owner decision 5); the personal data in them does not.
 *
 * What is kept, and why. A provider event keeps what accounting, refunds and disputes are matched
 * on: the provider's payment, subscription, product and checkout ids, status, amounts, currency,
 * tax, dates and service periods, and our own `veriworkly_*` metadata (opaque ids, which also let
 * a redelivered event be recognised as belonging to a deleted account). The provider's customer
 * id is kept too, on the event and on `Subscription.providerCustomerId`: it names no one by
 * itself (Dodo, as merchant of record, holds the customer's details and tax records), and it is
 * what a refund, chargeback or tax query from the provider is keyed on, and how the admin billing
 * search finds a detached row. `User.billingCustomerId` goes with the user row.
 *
 * What is removed: everything else the provider sent, which is where the personal data sits (the
 * customer's name, email and phone, the billing address, card details, free-form metadata).
 * Unknown fields are dropped, not kept: a field the provider adds later is personal until shown
 * otherwise.
 *
 * Other kept rows hold no customer personal data: ledger and grant rows carry ids, amounts and
 * an admin's reason; affiliate commissions and withdrawals carry amounts and the admin's payout
 * note; billing notifications carry a kind and a payment or subscription id.
 */

const KEPT_EVENT_DATA_FIELDS = [
  "payment_id",
  "subscription_id",
  "product_id",
  "status",
  "total_amount",
  "settlement_amount",
  "settlement_currency",
  "settlement_tax",
  "tax",
  "currency",
  "tax_inclusive",
  "recurring_pre_tax_amount",
  "is_update_payment_method",
  "checkout_session_id",
  "created_at",
  "next_billing_date",
  "previous_billing_date",
  "cancel_at_next_billing_date",
  "cancelled_at",
  "payment_frequency_interval",
  "payment_frequency_count",
  "subscription_period_interval",
  "subscription_period_count",
  "quantity",
  "discount_id",
  "refund_id",
  "dispute_id",
  "amount",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pick(source: Record<string, unknown>, keys: readonly string[]) {
  return Object.fromEntries(keys.filter((key) => key in source).map((key) => [key, source[key]]));
}

/** A stored webhook payload with the personal data removed (see the note above). */
export function redactBillingPayload(payload: unknown): Prisma.InputJsonValue {
  const event = isRecord(payload) ? payload : {};
  const data = isRecord(event.data) ? event.data : {};
  const kept: Record<string, unknown> = pick(data, KEPT_EVENT_DATA_FIELDS);

  if (isRecord(data.customer) && typeof data.customer.customer_id === "string")
    kept.customer = { customer_id: data.customer.customer_id };
  if (Array.isArray(data.product_cart))
    kept.product_cart = data.product_cart
      .filter(isRecord)
      .map((item) => pick(item, ["product_id", "quantity"]));
  if (Array.isArray(data.service_periods))
    kept.service_periods = data.service_periods
      .filter(isRecord)
      .map((period) => pick(period, ["subscription_id", "starts_at", "ends_at"]));
  if (isRecord(data.metadata))
    kept.metadata = Object.fromEntries(
      Object.entries(data.metadata).filter(
        ([key, value]) => key.startsWith("veriworkly_") && typeof value === "string",
      ),
    );

  return {
    ...pick(event, ["type", "timestamp"]),
    data: kept,
    redacted: true,
  } as Prisma.InputJsonValue;
}

/**
 * The webhook events of a user: attributed to them, naming them in their metadata, or about one
 * of their subscriptions. Each branch matches an index (V-237): `userId`, and the expression
 * indexes `BillingWebhookEvent_payload_user_idx` / `_payload_subscription_idx`, whose expressions
 * these `#>>` paths must repeat exactly.
 */
export function billingEventsOfUserSql(userId: string, subscriptionIds: string[]) {
  return PrismaNamespace.sql`
    SELECT "id", "payload" FROM "BillingWebhookEvent"
    WHERE "userId" = ${userId}
      OR ("payload" #>> '{data,metadata,veriworkly_user_id}') = ${userId}
      OR ("payload" #>> '{data,subscription_id}') = ANY(${subscriptionIds}::text[])`;
}

/**
 * Admin audit entries about a user: targeting them or one of their rows, or naming them as the
 * user or owner in their metadata. Deliberately wide (every row the user owns,
 * ledger included); the admin user history reads a narrower, joined form
 * (`userAuditHistoryIdsSql`). `= ANY(ARRAY(subquery))` rather than `IN (subquery)`: inside
 * an OR, `IN` becomes a per-row filter and forces a sequential scan, while the array is computed
 * once and lets each branch use its index (`targetId`, and the `metadata ->> 'userId'` /
 * `'ownerId'` expression indexes) (V-237).
 */
export function auditEntriesAboutUserSql(userId: string) {
  return PrismaNamespace.sql`(
    "targetId" = ANY(ARRAY(
      SELECT ${userId}::text
      UNION SELECT "id" FROM "Subscription" WHERE "userId" = ${userId}
      UNION SELECT "id" FROM "EntitlementGrant" WHERE "userId" = ${userId}
      UNION SELECT "id" FROM "CreditTransaction" WHERE "userId" = ${userId}
      UNION SELECT "id" FROM "AffiliateWithdrawal" WHERE "userId" = ${userId}
      UNION SELECT "id" FROM "AffiliateCommission" WHERE "affiliateId" = ${userId}
      UNION SELECT "id" FROM "Document" WHERE "userId" = ${userId}
      UNION SELECT "id" FROM "PortfolioPublication" WHERE "userId" = ${userId}
      UNION SELECT "id" FROM "ApiKey" WHERE "userId" = ${userId}
      UNION SELECT "id" FROM "ShareLink" WHERE "userId" = ${userId}
      UNION SELECT "id" FROM "AmbassadorApplication" WHERE "userId" = ${userId}
      UNION SELECT "id" FROM "BillingWebhookEvent" WHERE "userId" = ${userId}))
    OR ("metadata" ->> 'userId') = ${userId}
    OR ("metadata" ->> 'ownerId') = ${userId})`;
}

/**
 * Redacts every stored webhook event of a user who is being deleted: the ones attributed to the
 * account, and the ones that never were (a failed event) but name it in their metadata or concern
 * one of its subscriptions. Runs inside the deletion transaction, before the user row goes.
 */
export async function redactBillingEventsForUser(tx: Prisma.TransactionClient, userId: string) {
  const subscriptionIds = (
    await tx.subscription.findMany({
      where: { userId, providerSubId: { not: null } },
      select: { providerSubId: true },
    })
  ).map((row) => row.providerSubId as string);

  const events = await tx.$queryRaw<Array<{ id: string; payload: Prisma.JsonValue }>>(
    billingEventsOfUserSql(userId, subscriptionIds),
  );

  for (const event of events)
    await tx.billingWebhookEvent.update({
      where: { id: event.id },
      data: { payload: redactBillingPayload(event.payload) },
    });
}

/**
 * The free text kept rows can carry about the person, removed when the account is deleted
 * (decision 5): an admin's reason on a credit adjustment and on any entitlement grant or revoke
 * ("goodwill for <name>"), the payout note on a withdrawal (often a payee name or address), the
 * note on the affiliate's commissions, and the reason on admin audit entries about the user.
 * Amounts, ids, statuses and dates stay, and the audit log keeps who did what. Runs inside the
 * deletion transaction, before the user row goes.
 */
export async function redactBillingTextForUser(tx: Prisma.TransactionClient, userId: string) {
  await tx.creditTransaction.updateMany({
    where: { userId, action: "admin_adjustment" },
    data: { reason: REDACTED_REASON, metadata: PrismaNamespace.DbNull },
  });
  // Every source: an admin can revoke a pass (SYSTEM) or a subscription grant with a reason too.
  // Only the free-text keys go; product, interval and actor ids stay.
  await tx.$executeRaw`
    UPDATE "EntitlementGrant"
    SET "metadata" = "metadata" - 'reason' - 'revokeReason'
    WHERE "userId" = ${userId}
      AND jsonb_typeof("metadata") = 'object'
      AND ("metadata" ? 'reason' OR "metadata" ? 'revokeReason')`;
  await tx.affiliateWithdrawal.updateMany({
    where: { userId, payoutNote: { not: null } },
    data: { payoutNote: REDACTED_REASON },
  });
  await tx.affiliateCommission.updateMany({
    where: { affiliateId: userId, reason: { not: null } },
    data: { reason: REDACTED_REASON },
  });
  // The admin log keeps what was done, by whom, to which row and when; the reason an admin typed
  // about this person goes, and so do the identity fields an entry recorded (a renamed name or
  // username, an email, V-231). An entry is about the user when it targets them or one of their
  // rows, or names them as the user or owner in its metadata.
  await tx.$executeRaw`
    UPDATE "AdminAuditEntry"
    SET "reason" = CASE WHEN "reason" IS NULL THEN NULL ELSE ${REDACTED_REASON} END,
        "metadata" = CASE WHEN jsonb_typeof("metadata") = 'object'
          THEN "metadata" - ${AUDIT_IDENTITY_KEYS}::text[] ELSE "metadata" END
    WHERE ("reason" IS NOT NULL
        OR (jsonb_typeof("metadata") = 'object' AND "metadata" ?| ${AUDIT_IDENTITY_KEYS}::text[]))
      AND ${auditEntriesAboutUserSql(userId)}`;
}

const REDACTED_REASON = "Removed with the account";

/** Audit metadata keys that name the person rather than describe the action. */
const AUDIT_IDENTITY_KEYS = ["name", "username", "email", "confirmEmail", "previousEmail"];

/**
 * Redacts one stored event that turned out to belong to a deleted account: the webhook applies
 * nothing for it, and it must not keep the personal data the provider sent after the account was
 * gone. Best effort: the event is processed either way.
 */
export async function redactBillingEvent(eventId: string) {
  try {
    const event = await prisma.billingWebhookEvent.findUnique({
      where: { id: eventId },
      select: { payload: true },
    });
    if (!event) return;
    await prisma.billingWebhookEvent.update({
      where: { id: eventId },
      data: { payload: redactBillingPayload(event.payload) },
    });
  } catch (error) {
    logger.error("Could not redact a deleted account's billing event", {
      eventId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * The webhook's follow-up for an event it could not attribute to a live user: when the event
 * names a deleted account (the same test as `isDeletedAccount`: its user id no longer exists, or
 * the subscription it concerns is detached), its stored payload is redacted.
 */
export async function redactIfForDeletedAccount(eventId: string, data: unknown) {
  const fields = isRecord(data) ? data : {};
  const metadata = isRecord(fields.metadata) ? fields.metadata : {};
  const userId = typeof metadata.veriworkly_user_id === "string" ? metadata.veriworkly_user_id : "";
  const subscriptionId = typeof fields.subscription_id === "string" ? fields.subscription_id : "";

  const deleted =
    (userId.length > 0 &&
      !(await prisma.user.findUnique({ where: { id: userId }, select: { id: true } }))) ||
    (subscriptionId.length > 0 &&
      (
        await prisma.subscription.findUnique({
          where: { providerSubId: subscriptionId },
          select: { userId: true },
        })
      )?.userId === null);

  if (deleted) await redactBillingEvent(eventId);
}
