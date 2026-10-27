import { randomUUID } from "node:crypto";

import { z } from "zod";
import DodoPayments from "dodopayments";

import {
  Prisma,
  type EntitlementSource,
  type Subscription as PrismaSubscription,
} from "@prisma/client";

import { config, isProduction } from "#config";

import {
  dodoPaymentSchema,
  dodoWebhookEventSchema,
  dodoSubscriptionSchema,
} from "#validators/billingValidator";

import { prisma } from "#lib/prisma";
import { logger } from "#lib/logger";
import { ApiError } from "#lib/errors";
import { cacheDel, cacheGet, cacheSet, getRedis } from "#lib/redis";
import { acquireJobLock } from "#lib/jobLock";
import { userProfileCacheKey } from "#lib/cacheKeys";
import { PREMIUM_PORTFOLIO_TEMPLATE_IDS } from "#validators/portfolioValidator";
import { EntitlementService, isPaidAccessKey } from "#services/entitlementService";
import { AffiliateService } from "#services/affiliate/index";
import { AFFILIATE_TIER_RATE_BPS } from "#services/affiliate/constants";
import { CreditService } from "#services/creditService";
import { CREDIT_SOURCES } from "#services/creditSources";
import { isDeletedAccount, redactIfForDeletedAccount } from "#services/deletedAccount";
import {
  grantDueMonths,
  openAnnualCreditSchedule,
  subscriptionCreditGrantsWhere,
} from "#services/annualCreditService";
import { notifyOnce } from "#services/billingNotifications";
import type { PurchaseConfirmation } from "#services/mail/billingMail";
import { PRODUCT_NAMES, PASS_NAMES, UNLOCK_PHRASES, purchaseName } from "#services/productNames";
import {
  creditPackCatalog,
  isCreditPackKey,
  ENTITLEMENT_KEYS,
  getProductFromProviderId,
  getProviderProductId,
  isCatalogInterval,
  isProductKey,
  productCatalog,
  PRODUCT_KEYS,
  publicCatalog,
  publicCreditEconomics,
  type CreditPackKey,
  type ProductKey,
  type CatalogInterval,
} from "#services/productCatalog";
import {
  revalidatePublicPortfolios,
  invalidatePublicPortfolioCaches,
} from "#utils/portfolioPublicationCache";

type BillingIntervalInput = "one_day" | "seven_day" | "monthly" | "annual";
/** What a `refund.succeeded` event is read for. */
const refundEventSchema = z.object({
  payment_id: z.string().trim().min(1),
  is_partial: z.boolean().nullish(),
  amount: z.number().int().nullish(),
  currency: z.string().trim().min(1).nullish(),
});
/**
 * What a `dispute.*` event is read for. Dodo sends the disputed amount as a string of minor units
 * ("precision"); anything that is not a whole number is treated as unknown.
 */
const disputeEventSchema = z.object({
  payment_id: z.string().trim().min(1),
  amount: z
    .union([z.string(), z.number()])
    .nullish()
    .transform((value) => {
      const parsed = typeof value === "string" ? Number(value.trim()) : value;
      return typeof parsed === "number" && Number.isSafeInteger(parsed) ? parsed : null;
    }),
  currency: z.string().trim().min(1).nullish(),
});
/**
 * The dispute events in which the money is gone for good: lost at the bank, or accepted by us
 * (conceding a dispute is losing it). Opened, challenged, won, expired and cancelled change
 * nothing: the payment still stands, or stands again.
 */
const LOST_DISPUTE_EVENTS = new Set(["dispute.lost", "dispute.accepted"]);

/** The provider payment a payment, refund or dispute event is about (V-216); null otherwise. */
function eventPaymentId(event: { type: string; data: unknown }) {
  if (!/^(payment|refund|dispute)\./.test(event.type)) return null;
  const data = event.data as { payment_id?: unknown } | null;
  return typeof data?.payment_id === "string" && data.payment_id.trim()
    ? data.payment_id.trim()
    : null;
}

/**
 * What has been reversed of a payment so far (V-216), in its currency's minor units: every stored
 * `refund.succeeded` and lost or accepted dispute for it that was processed, plus the event being
 * applied now. One provider refund or dispute delivered under several event ids counts once (by
 * its `refund_id`/`dispute_id` while the payload lasts); amounts in another currency are left out.
 */
async function reversedSoFar(paymentId: string, eventId: string, currency: string | null) {
  const [row] = await prisma.$queryRaw<Array<{ total: bigint | null }>>`
    SELECT SUM(amount) AS total FROM (
      SELECT DISTINCT ON (key) amount FROM (
        SELECT "amountCents" AS amount, "createdAt",
          COALESCE("payload" -> 'data' ->> 'refund_id', "payload" -> 'data' ->> 'dispute_id', "id") AS key
        FROM "BillingWebhookEvent"
        WHERE "providerPaymentId" = ${paymentId}
          AND "type" IN ('refund.succeeded', 'dispute.lost', 'dispute.accepted')
          AND "amountCents" IS NOT NULL
          AND ("status" = 'PROCESSED' OR "id" = ${eventId})
          AND ("currency" IS NULL OR ${currency}::text IS NULL OR upper("currency") = upper(${currency}::text))
      ) AS reversals
      ORDER BY key, "createdAt" ASC
    ) AS once`;
  return Number(row?.total ?? 0);
}

/** The stored `payment.succeeded` event for a payment: who paid, what, and how much. */
function findPaymentEvent(paymentId: string) {
  return prisma.billingWebhookEvent.findFirst({
    where: { providerPaymentId: paymentId, type: "payment.succeeded" },
    select: { userId: true, productName: true, amountCents: true, currency: true, payload: true },
    orderBy: { createdAt: "asc" },
  });
}
const BILLING_SUMMARY_TTL_SECONDS = 60;
const BILLING_HISTORY_TTL_SECONDS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;
/**
 * One open checkout session per (user, product), remembered for as long as the provider keeps
 * the session payable (Dodo checkout sessions stay valid for 24 hours). Shorter, and a forgotten
 * tab could pay the old session after a new one was opened for the same product: two
 * subscriptions, one customer (V-125). The record goes away earlier when a webhook settles the
 * product or when `cancelCheckout` confirms with the provider that nothing is being paid.
 */
const CHECKOUT_RECORD_TTL_SECONDS = 24 * 60 * 60;
/**
 * The record is stamped after the provider call returns, on our clock: a subscription the
 * provider created for this very session can carry a slightly earlier `created_at`.
 */
const CHECKOUT_SETTLE_CLOCK_SLACK_MS = 5 * 60 * 1000;
/** The claim held while the provider call is in flight, so two clicks at once make one session. */
const CHECKOUT_CLAIM_TTL_SECONDS = 60;
/**
 * The provider call made while the claim is held must finish well inside the claim's TTL: the
 * SDK defaults (60 s timeout, 2 retries) could outlive it, letting a second click claim the key
 * and open a second session. No retries either: creating a session is not idempotent, so a retry
 * after a timeout can leave a payable session behind that nothing tracks.
 */
const CHECKOUT_PROVIDER_TIMEOUT_MS = 20_000;
const CHECKOUT_PROVIDER_MAX_RETRIES = 0;
const CHECKOUT_CLAIM_WAIT_ATTEMPTS = 10;
const CHECKOUT_CLAIM_WAIT_MS = 300;
/** The studio keys its "reset and retry" button on this phrase; keep it when rewording. */
const CHECKOUT_ACTIVE_MESSAGE =
  "A billing checkout is already active. Complete it or try again soon.";
/**
 * `details.code` on every checkout-lock 409 (V-198): the studio tells "a checkout is already open"
 * apart from the overlap codes (`ALREADY_SUBSCRIBED`, `SUBSCRIPTION_OVERLAP`, ...) by this, not by
 * the message.
 */
const CHECKOUT_IN_PROGRESS = { code: "CHECKOUT_IN_PROGRESS" } as const;
/**
 * Provider payment states in which money is moving or has moved: a session in one of these is
 * never cleared by `cancelCheckout`; the webhook settles it.
 */
const PAYMENT_IN_FLIGHT_STATUSES = new Set<string>([
  "succeeded",
  "processing",
  "requires_capture",
  "partially_captured",
  "partially_captured_and_capturable",
  "requires_merchant_action",
]);
/**
 * Must outlive one full processing attempt: the entitlement transaction alone may wait 10 s for
 * a connection and run 20 s, and the pre/post work (event row, cache invalidation, affiliate
 * commission) adds more. The lock is renewed while the attempt runs (`acquireJobLock`), so this
 * is the budget for a Redis stall, not for the attempt itself.
 */
const WEBHOOK_LOCK_TTL_SECONDS = 60;
const WEBHOOK_LOCK_WAIT_ATTEMPTS = 10;
const WEBHOOK_LOCK_WAIT_MS = 300;
const WEBHOOK_IN_FLIGHT_MESSAGE =
  "This webhook event is already being processed by a concurrent request. Please retry.";
/**
 * The only `suspensionReason` values billing is allowed to overwrite: the ones billing itself
 * writes (`applySubscriptionEvent` stores the normalised subscription status) and the grace
 * expiry written by `jobs/portfolioAccessJob` and `portfolioService`. A row suspended for any
 * other reason belongs to someone else: `user_unpublished` (the user's own takedown) and an
 * admin's free-text reason from `adminPortfolioService.updatePublicationStatus` (an abuse
 * takedown). Billing must leave those rows alone, or the next payment would republish them.
 */
export const BILLING_SUSPENSION_REASONS = [
  "ACTIVE",
  "PAST_DUE",
  "CANCELED",
  "INACTIVE",
  "grace_expired",
] as const;

/** Compare-and-delete: only the holder of a checkout claim or record may remove it. */
const compareAndDeleteScript = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  end
  return 0
`;

/**
 * Compare-and-set: replaces our checkout claim with the open record, but only while the key still
 * holds that claim. A claim that expired and was re-claimed by another request is not ours.
 */
const compareAndSetScript = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    redis.call("set", KEYS[1], ARGV[2], "EX", ARGV[3])
    return 1
  end
  return 0
`;

type CheckoutRecord =
  | { state: "claimed"; token: string }
  | {
      state: "open";
      sessionId: string;
      url: string;
      /** Missing on a legacy per-product record, whose key names the product. */
      productKey?: ProductKey;
      interval: BillingIntervalInput;
      createdAt: string;
    };

/**
 * One checkout record per user, whatever the product (V-218): any two subscriptions or passes
 * overlap (V-176), so while one session is open no second one is created. A single key makes that
 * an atomic claim instead of a check across per-product keys followed by a claim of one of them.
 */
function checkoutRecordKey(userId: string) {
  return `billing:checkout:${userId}`;
}

/**
 * The per-product keys used before V-218. Sessions recorded under them stay payable for up to
 * `CHECKOUT_RECORD_TTL_SECONDS` after the deploy, so they are still read (never written) until
 * then.
 */
function legacyCheckoutRecordKey(userId: string, productKey: ProductKey) {
  return `billing:checkout:${userId}:${productKey}`;
}

function parseCheckoutRecord(raw: string | null): CheckoutRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CheckoutRecord;
    return parsed.state === "claimed" || parsed.state === "open" ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Whether a new subscription or pass would overlap what the customer already pays for (V-176).
 * Any live subscription (active in period, or in dunning) blocks a second one: the same product
 * twice is a double charge, the bundle already contains both single products, and AI Credits
 * plus Creator Pro is the bundle at a higher price. The error says what to do instead, and
 * `details` carries the same in machine form for the clients:
 * `{ code, activeProductKey, suggestedProductKey }`. When the live plan can be upgraded to the
 * bundle in place (V-202), the code is `UPGRADE_AVAILABLE` and `upgrade` names the plan change to
 * offer: `{ productKey: "bundle", interval }` for `/billing/subscription/change-plan`.
 */
function checkoutOverlap(
  productKey: ProductKey,
  interval: BillingIntervalInput,
  live: Array<{
    productKey: string;
    status: PrismaSubscription["status"];
    rawStatus: string | null;
    interval: PrismaSubscription["interval"];
    cancelAtPeriodEnd: boolean;
  }>,
) {
  const current = live.find((item) => item.status === "PAST_DUE") ?? live[0];
  if (!current || !isProductKey(current.productKey)) return null;
  const active = current.productKey;
  const activeName = PRODUCT_NAMES[active];
  const requestedName =
    productKey === "bundle" && (interval === "one_day" || interval === "seven_day")
      ? PASS_NAMES[interval]
      : PRODUCT_NAMES[productKey];
  const details = (code: string, suggestedProductKey: ProductKey | null) => ({
    code,
    activeProductKey: active,
    suggestedProductKey,
  });

  // A pause maps to PAST_DUE (nothing is charged until it is resumed), but nothing is owed either.
  if (current.status === "PAST_DUE" && current.rawStatus === "paused")
    return new ApiError(
      409,
      `Your ${activeName} subscription is paused. Resume it from Manage billing instead of starting a new purchase.`,
      details("SUBSCRIPTION_PAUSED", null),
    );
  if (current.status === "PAST_DUE")
    return new ApiError(
      409,
      `Your ${activeName} subscription has a payment outstanding. Update your payment method from Manage billing instead of starting a new purchase.`,
      details("PAYMENT_OUTSTANDING", null),
    );
  if (active === productKey && requestedName === activeName)
    return new ApiError(
      409,
      `You already have an active ${activeName} subscription.`,
      details("ALREADY_SUBSCRIBED", null),
    );
  if (active === "bundle")
    return new ApiError(
      409,
      `Your ${activeName} already includes ${requestedName}.`,
      details("ALREADY_INCLUDED", null),
    );
  if (requestedName !== PRODUCT_NAMES[productKey])
    return new ApiError(
      409,
      `You already have an active ${activeName} subscription. For more AI credits, buy a credit pack instead of a pass.`,
      details("SUBSCRIPTION_OVERLAP", null),
    );
  const upgradeInterval = recurringInterval(current.interval);
  if (live.length === 1 && !current.cancelAtPeriodEnd && upgradeInterval)
    return new ApiError(
      409,
      `You already have an active ${activeName} subscription. ${PRODUCT_NAMES.ai_credits} and ${PRODUCT_NAMES.portfolio_pro} together are the ${PRODUCT_NAMES.bundle}: upgrade ${activeName} to the ${PRODUCT_NAMES.bundle} instead, and pay only the difference for the rest of this billing period.`,
      {
        ...details("UPGRADE_AVAILABLE", "bundle"),
        upgrade: { productKey: "bundle" as const, interval: upgradeInterval },
      },
    );
  return new ApiError(
    409,
    `You already have an active ${activeName} subscription. ${PRODUCT_NAMES.ai_credits} and ${PRODUCT_NAMES.portfolio_pro} together are the ${PRODUCT_NAMES.bundle}: to switch, cancel ${activeName} from Manage billing and subscribe to the ${PRODUCT_NAMES.bundle} when it ends, or contact support to switch now.`,
    details("SUBSCRIPTION_OVERLAP", "bundle"),
  );
}

/** The plan-change interval of a recurring subscription; null for a pass. */
function recurringInterval(interval: PrismaSubscription["interval"]) {
  if (interval === "MONTHLY") return "monthly" as const;
  if (interval === "ANNUAL") return "annual" as const;
  return null;
}

/**
 * Plan changes (V-202). `prorated_immediately_keep_cycle` (owner choice) charges the difference
 * for the rest of the current period now and keeps the renewal date, so the month already granted
 * and an annual schedule stay aligned with the period. A plan-change charge (Dodo's
 * `charge_type: "plan_change"`, or the tag this API adds to the changes it requests) never earns
 * credits itself: the plan-change event grants what the new plan carries (`applyPlanChangeCredits`).
 */
type PlanChangeInterval = "monthly" | "annual";
const PLAN_CHANGE_PRORATION = "prorated_immediately_keep_cycle" as const;
const PLAN_CHANGE_METADATA_KEY = "veriworkly_plan_change";
/** Until the webhook lands or the payment fails; long enough for any provider retry. */
const PLAN_CHANGE_PENDING_TTL_SECONDS = 60 * 60;
/** How long a retry of the same request gets the stored answer. */
const PLAN_CHANGE_RESULT_TTL_SECONDS = 24 * 60 * 60;
/**
 * How long a double click with the same key waits for the first request's answer: as long as that
 * request's provider call can take (the bounded checkout client), plus a margin to store it.
 */
const PLAN_CHANGE_SAME_KEY_WAIT_ATTEMPTS = Math.ceil(
  (CHECKOUT_PROVIDER_TIMEOUT_MS + 2_000) / CHECKOUT_CLAIM_WAIT_MS,
);

type PlanChangeResult = {
  status: "pending";
  productKey: ProductKey;
  interval: PlanChangeInterval;
  paymentId: string | null;
  /** False when the provider call timed out or failed in transit: the change may have applied. */
  confirmed: boolean;
};

function planChangePendingKey(providerSubId: string) {
  return `billing:plan-change:${providerSubId}`;
}

function planChangeResultKey(userId: string, idempotencyKey: string) {
  return `billing:plan-change:result:${userId}:${idempotencyKey}`;
}

function parsePlanChangeResult(raw: string | null): PlanChangeResult | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PlanChangeResult;
    return parsed.status === "pending" ? parsed : null;
  } catch {
    return null;
  }
}

/** The claim or pending record on a subscription, with the request (user + key) that holds it. */
function parsePlanChangePending(raw: string | null): { requestKey?: string } | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { requestKey?: string };
  } catch {
    return null;
  }
}

/** The stored answer for this key, as a replay; a 409 when the key was used for another change. */
async function readPlanChangeReplay(
  resultKey: string,
  productKey: ProductKey,
  interval: PlanChangeInterval,
) {
  const replay = parsePlanChangeResult(await getRedis().get(resultKey));
  if (!replay) return null;
  if (replay.productKey !== productKey || replay.interval !== interval)
    throw planChangeError(
      "IDEMPOTENCY_KEY_REUSED",
      "This idempotency key was already used for a different plan change.",
    );
  return { ...replay, replayed: true };
}

/** A refused plan change: 409 with `details.code`, the way the checkout overlaps answer. */
function planChangeError(code: string, message: string) {
  return new ApiError(409, message, { code });
}

/** A provider refusal: nothing was changed, and the caller may try again. */
function providerPlanChangeError(error: unknown, what: string) {
  if (error instanceof ApiError) return error;
  return new ApiError(502, `The billing provider ${what}, so nothing was changed. Try again.`, {
    code: "PROVIDER_UNAVAILABLE",
    reason: error instanceof Error ? error.message : "provider unavailable",
  });
}

/** `instanceof` against an SDK error class, safe where a test double of the SDK leaves it out. */
function isProviderError(error: unknown, errorClass: unknown) {
  return typeof errorClass === "function" && error instanceof errorClass;
}

/**
 * Whether a failed provider call may still have done what it was asked: a timeout or a dropped
 * connection (the request may have arrived), or a provider 5xx. A 4xx is a refusal.
 */
function providerOutcomeUnknown(error: unknown) {
  if (isProviderError(error, DodoPayments.APIConnectionError)) return true;
  if (!isProviderError(error, DodoPayments.APIError)) return false;
  const status = (error as { status?: number }).status;
  return status === undefined || status >= 500;
}

/** Whether a payment is the charge for a plan change: Dodo's charge type, or our own tag. */
function isPlanChangePayment(payment: {
  metadata: Record<string, string>;
  charge_type?: string | null;
}) {
  return (
    payment.charge_type === "plan_change" || payment.metadata[PLAN_CHANGE_METADATA_KEY] === "1"
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Prisma's interactive-transaction defaults (maxWait 2s / timeout 5s) are tuned for single-shot
 * writes. The entitlement transaction below issues a variable number of sequential upserts, so
 * under pool contention it can exceed 5s and abort with P2028 *after* the provider already
 * charged the customer — leaving billing state behind reality until the webhook is retried.
 */
const BILLING_TRANSACTION_OPTIONS = { timeout: 20_000, maxWait: 10_000 } as const;

function billingSummaryCacheKey(userId: string) {
  return `billing:summary:${userId}`;
}

function billingHistoryCacheKey(userId: string) {
  return `billing:history:${userId}`;
}

function getDodoClient(options: { timeout?: number; maxRetries?: number } = {}) {
  if (!config.dodo.apiKey) throw new ApiError(503, "Billing is not configured.");

  return new DodoPayments({
    bearerToken: config.dodo.apiKey,
    webhookKey: config.dodo.webhookSecret || undefined,
    environment: config.dodo.environment,
    ...options,
  });
}

/** The client that creates checkout sessions: bounded so the call fits inside the claim TTL. */
function getDodoCheckoutClient() {
  return getDodoClient({
    timeout: CHECKOUT_PROVIDER_TIMEOUT_MS,
    maxRetries: CHECKOUT_PROVIDER_MAX_RETRIES,
  });
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

function addMonths(date: Date, months: number) {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}

function addYears(date: Date, years: number) {
  const d = new Date(date.getTime());
  d.setFullYear(d.getFullYear() + years);
  return d;
}

function addCatalogInterval(date: Date, interval: CatalogInterval) {
  // `one_day` is the catalog key of the pass sold as the "3-Day Sprint"; three days is correct.
  if (interval === "one_day") return addDays(date, 3);
  if (interval === "seven_day") return addDays(date, 7);
  if (interval === "annual") return addYears(date, 1);
  return addMonths(date, 1);
}

function toBillingInterval(interval: CatalogInterval) {
  if (interval === "one_day") return "ONE_DAY" as const;
  if (interval === "seven_day") return "SEVEN_DAY" as const;
  if (interval === "annual") return "ANNUAL" as const;
  return "MONTHLY" as const;
}

function fromBillingInterval(interval: PrismaSubscription["interval"]): CatalogInterval {
  if (interval === "ONE_DAY") return "one_day";
  if (interval === "SEVEN_DAY") return "seven_day";
  if (interval === "ANNUAL") return "annual";
  return "monthly";
}

/**
 * The provider's product id is the truth about what is being billed: after a plan change in the
 * Dodo portal the checkout metadata still names the plan the customer started on. Metadata is
 * only consulted for a product id the catalog does not know, and then its interval is validated
 * against the catalog instead of being trusted.
 */
function resolveCatalogProduct(
  productId: string | null | undefined,
  metadata: { veriworkly_product?: string; veriworkly_interval?: string },
): { productKey: ProductKey; interval: CatalogInterval } | null {
  if (productId) {
    const product = getProductFromProviderId(productId);
    if (product) return product;
  }

  const metaProduct = metadata.veriworkly_product;
  const metaInterval = metadata.veriworkly_interval;
  if (
    metaProduct &&
    isProductKey(metaProduct) &&
    metaInterval &&
    isCatalogInterval(metaInterval) &&
    productCatalog[metaProduct].prices[metaInterval] !== undefined
  )
    return { productKey: metaProduct, interval: metaInterval };

  return null;
}

type BillingEventSummary = {
  productName: string | null;
  amountCents: number | null;
  currency: string | null;
};

const UNKNOWN_EVENT_SUMMARY: BillingEventSummary = {
  productName: null,
  amountCents: null,
  currency: null,
};

/**
 * What a billing event was for, as the customer's billing history names it (V-197): the product
 * from the shared naming table and the amount the event carries. Reads a stored event (`{ type,
 * data }`); anything it cannot read, a redacted payload included, is unknown rather than an error.
 */
function summarizeBillingEvent(event: unknown): BillingEventSummary {
  const parsed = dodoWebhookEventSchema.pick({ type: true, data: true }).safeParse(event);
  if (!parsed.success) return UNKNOWN_EVENT_SUMMARY;
  const { type, data } = parsed.data;

  if (type.startsWith("subscription.")) {
    const subscription = dodoSubscriptionSchema.safeParse(data);
    if (!subscription.success) return UNKNOWN_EVENT_SUMMARY;
    const product = resolveCatalogProduct(subscription.data.product_id, subscription.data.metadata);
    return {
      productName: product ? purchaseName(product.productKey, product.interval) : null,
      amountCents: subscription.data.recurring_pre_tax_amount ?? null,
      currency: subscription.data.currency?.toUpperCase() ?? null,
    };
  }

  if (type.startsWith("payment.")) {
    const payment = dodoPaymentSchema.safeParse(data);
    if (!payment.success) return UNKNOWN_EVENT_SUMMARY;
    const { metadata } = payment.data;
    const packKey = metadata.veriworkly_product;
    // Same order as `applyPaymentEvent`: a pack names itself in metadata, anything else is the
    // catalog product its cart names.
    const product = resolveCatalogProduct(
      payment.data.product_cart?.[0]?.product_id ?? payment.data.product_id,
      metadata,
    );
    return {
      productName:
        packKey && isCreditPackKey(packKey)
          ? creditPackCatalog[packKey].name
          : product
            ? purchaseName(product.productKey, product.interval)
            : null,
      amountCents: payment.data.total_amount ?? null,
      currency: payment.data.currency?.toUpperCase() ?? null,
    };
  }

  if (type.startsWith("refund.")) {
    const refund = z
      .object({ amount: z.number().int().nullish(), currency: z.string().trim().min(1).nullish() })
      .safeParse(data);
    if (!refund.success) return UNKNOWN_EVENT_SUMMARY;
    return {
      productName: null,
      amountCents: refund.data.amount ?? null,
      currency: refund.data.currency?.toUpperCase() ?? null,
    };
  }

  if (type.startsWith("dispute.")) {
    const dispute = disputeEventSchema.safeParse(data);
    if (!dispute.success) return UNKNOWN_EVENT_SUMMARY;
    return {
      productName: null,
      amountCents: dispute.data.amount,
      currency: dispute.data.currency?.toUpperCase() ?? null,
    };
  }

  return UNKNOWN_EVENT_SUMMARY;
}

/**
 * `summarizeBillingEvent` for an event being stored. A refund or dispute names no product itself,
 * so it takes the product of the payment it reverses when that payment's event is on file;
 * otherwise null. The lookup never fails the webhook: an unnamed refund is still a correct
 * history row.
 */
async function summarizeStoredEvent(event: {
  type: string;
  data: unknown;
}): Promise<BillingEventSummary> {
  const summary = summarizeBillingEvent(event);
  const paymentId = eventPaymentId(event);
  if (!/^(refund|dispute)\./.test(event.type) || summary.productName || !paymentId) return summary;

  try {
    const payment = await findPaymentEvent(paymentId);
    if (!payment) return summary;
    return {
      ...summary,
      productName: payment.productName ?? summarizeBillingEvent(payment.payload).productName,
    };
  } catch (error) {
    logger.warn("Refund stored without its product name", {
      paymentId,
      error: error instanceof Error ? error.message : String(error),
    });
    return summary;
  }
}

/**
 * Every status the Dodo SDK can report, mapped explicitly. The `Record` over the SDK type makes a
 * new provider status a compile error here rather than a silent `INACTIVE` that revokes access
 * someone is paying for. A status that is not in the table at runtime fails the event.
 */
const SUBSCRIPTION_STATUS_TABLE: Record<
  DodoPayments.SubscriptionStatus,
  { status: PrismaSubscription["status"]; grace: boolean }
> = {
  active: { status: "ACTIVE", grace: false },
  // Dunning after a failed renewal: the paid period is over, the grants go, and the portfolio
  // sits in GRACE for `portfolio.graceDays` while Dodo retries the card.
  on_hold: { status: "PAST_DUE", grace: true },
  past_due: { status: "PAST_DUE", grace: true },
  // A pause is a customer or merchant choice with nothing charged until it is resumed. There is
  // no paid period to honour, but the customer intends to come back, so it gets the same grace
  // as a failed renewal rather than an immediate suspension.
  paused: { status: "PAST_DUE", grace: true },
  // Created but not yet paid (mandate or first charge pending). Nothing is granted, and nothing
  // still inside a paid period is taken away: `applySubscriptionEvent` leaves existing grants
  // untouched for this status.
  pending: { status: "INACTIVE", grace: false },
  // Never paid: no grace.
  failed: { status: "INACTIVE", grace: false },
  // Access runs to `currentPeriodEnd`, then the user is free (see `accessStatus`).
  cancelled: { status: "CANCELED", grace: false },
  expired: { status: "CANCELED", grace: false },
};

function statusFromDodo(rawStatus: string) {
  return Object.prototype.hasOwnProperty.call(SUBSCRIPTION_STATUS_TABLE, rawStatus)
    ? SUBSCRIPTION_STATUS_TABLE[rawStatus as DodoPayments.SubscriptionStatus]
    : null;
}

function accessStatus(
  subscription: Pick<PrismaSubscription, "status" | "currentPeriodEnd" | "graceEndsAt"> | null,
) {
  if (!subscription) return { canPublish: false, publicationStatus: "SUSPENDED" as const };

  const now = new Date();

  if (
    subscription.status === "ACTIVE" &&
    (!subscription.currentPeriodEnd || subscription.currentPeriodEnd > now)
  )
    return { canPublish: true, publicationStatus: "LIVE" as const };

  // Cancellation keeps what was paid for: access until the period the customer paid for ends.
  if (
    subscription.status === "CANCELED" &&
    subscription.currentPeriodEnd &&
    subscription.currentPeriodEnd > now
  )
    return { canPublish: true, publicationStatus: "LIVE" as const };

  if (subscription.graceEndsAt && subscription.graceEndsAt > now)
    return { canPublish: false, publicationStatus: "GRACE" as const };

  return { canPublish: false, publicationStatus: "SUSPENDED" as const };
}

type SubscriptionState = Pick<
  PrismaSubscription,
  "status" | "currentPeriodEnd" | "graceEndsAt" | "updatedAt"
>;

/**
 * Whether a subscription still describes the customer's billing today: active inside its
 * period, cancelled with paid time left, or in dunning while the grace window runs (V-172).
 */
function subscriptionInEffect(subscription: SubscriptionState, now: Date) {
  if (subscription.status === "ACTIVE")
    return !subscription.currentPeriodEnd || subscription.currentPeriodEnd > now;
  if (subscription.status === "CANCELED")
    return Boolean(subscription.currentPeriodEnd && subscription.currentPeriodEnd > now);
  // Dunning is live whether or not the grace window still runs (V-221): the provider keeps
  // retrying the card and checkout refuses a new purchase with PAYMENT_OUTSTANDING, so the
  // summary must keep saying PAST_DUE rather than describe a free account that cannot buy.
  if (subscription.status === "PAST_DUE") return true;
  return false;
}

const SUMMARY_STATUS_RANK: Record<PrismaSubscription["status"], number> = {
  ACTIVE: 0,
  PAST_DUE: 1,
  CANCELED: 2,
  INACTIVE: 3,
};

/**
 * The subscription the billing summary describes (V-176): one in effect if there is any (active
 * first, then dunning, then cancelled with time left; the latest-ending among equals), otherwise
 * the one that ended last. Never simply the row updated last, which can be a dead subscription
 * while another one is what `plan` reflects.
 */
function primarySubscription<T extends SubscriptionState>(subscriptions: T[], now: Date) {
  const live = subscriptions.filter((subscription) => subscriptionInEffect(subscription, now));
  const end = (subscription: T) =>
    subscription.currentPeriodEnd?.getTime() ?? Number.POSITIVE_INFINITY;
  const pool = live.length > 0 ? live : subscriptions;
  return (
    [...pool].sort(
      (left, right) =>
        SUMMARY_STATUS_RANK[left.status] - SUMMARY_STATUS_RANK[right.status] ||
        end(right) - end(left) ||
        right.updatedAt.getTime() - left.updatedAt.getTime(),
    )[0] ?? null
  );
}

/**
 * Two webhook events for one user (an old subscription cancelled while a new one activates)
 * each recompute the portfolio publication from every grant the user holds. Row locks are per
 * subscription, so without this they can read each other's pre-commit state and the last writer
 * suspends a paying customer. Taken first in every billing transaction; released at commit.
 */
export async function lockUserForBilling(tx: Prisma.TransactionClient, userId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
}

/**
 * Publication follows the grants, not one subscription: LIVE while any publish grant is in
 * effect, otherwise `fallback` (or untouched when the caller only added access).
 */
async function reconcilePortfolioPublication(
  tx: Prisma.TransactionClient,
  userId: string,
  at: Date,
  fallback: { publicationStatus: "GRACE" | "SUSPENDED"; suspensionReason: string } | null,
) {
  // Grants are read as of the later of the event and the clock: with events for one user
  // serialised on the advisory lock, an older-stamped event that runs second must still see
  // the grant the newer one just made (it started after this event's own timestamp).
  const now = new Date();
  const asOf = at > now ? at : now;
  const effectivePublishGrant = await tx.entitlementGrant.findFirst({
    where: {
      userId,
      key: ENTITLEMENT_KEYS.PORTFOLIO_PUBLISH,
      startsAt: { lte: asOf },
      revokedAt: null,
      OR: [{ endsAt: null }, { endsAt: { gt: asOf } }],
    },
    select: { endsAt: true },
    orderBy: { endsAt: "desc" },
  });

  // Only rows billing suspended (or never suspended) follow the grants. A row the user took
  // down or an admin suspended stays down whatever billing says; only a republish or the admin
  // brings it back. Written as an OR because `in` alone excludes NULL rows.
  const billingOwned = {
    OR: [{ suspensionReason: null }, { suspensionReason: { in: [...BILLING_SUSPENSION_REASONS] } }],
  };

  if (effectivePublishGrant) {
    await tx.portfolioPublication.updateMany({
      where: { userId, ...billingOwned },
      data: { status: "LIVE", suspensionReason: null, suspendedAt: null },
    });
    return;
  }

  if (!fallback) return;

  // A lapse only reaches publications that needed the grant in the first place: free templates
  // (Signal, Atelier) publish without one and stay LIVE whatever happens to the subscription.
  const lapsedWhere = {
    userId,
    templateId: { in: [...PREMIUM_PORTFOLIO_TEMPLATE_IDS] },
    ...billingOwned,
  };
  if (fallback.publicationStatus !== "SUSPENDED") {
    await tx.portfolioPublication.updateMany({
      where: lapsedWhere,
      data: { status: "GRACE", suspensionReason: null, suspendedAt: null },
    });
    return;
  }
  // `suspendedAt` is when the site went offline: the settle step only brings back a suspension
  // from the last 30 days. A row billing already suspended keeps its date (a redelivered event or
  // an admin reconcile must not restart that window); only its reason follows the latest event.
  await tx.portfolioPublication.updateMany({
    where: { ...lapsedWhere, NOT: { status: "SUSPENDED" } },
    data: {
      status: "SUSPENDED",
      suspensionReason: fallback.suspensionReason,
      suspendedAt: new Date(),
    },
  });
  // An undated suspension stays undated: stamping it now would make a long-dead site look recent
  // to the 30-day restore window.
  await tx.portfolioPublication.updateMany({
    where: { ...lapsedWhere, status: "SUSPENDED" },
    data: { suspensionReason: fallback.suspensionReason },
  });
}

/**
 * The SUBSCRIPTION entitlement grants one subscription earns in a given state: every grant keyed
 * on it is revoked, then the product's entitlements are granted to the period end when the state
 * gives access (active in period, or cancelled with paid time left). The webhook and the admin
 * status override both go through here, so a label and the access it implies cannot disagree
 * (V-170). Must run inside a transaction that holds `lockUserForBilling` for the user.
 */
export async function syncSubscriptionGrants(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    /** The provider subscription id; a row the provider never knew uses its own id. */
    sourceId: string;
    productKey: ProductKey;
    status: PrismaSubscription["status"];
    currentPeriodEnd: Date | null;
    graceEndsAt: Date | null;
    at: Date;
  },
) {
  const access = accessStatus(input);

  await tx.entitlementGrant.updateMany({
    where: { userId: input.userId, source: "SUBSCRIPTION", sourceId: input.sourceId },
    data: { revokedAt: input.at },
  });

  if (access.canPublish) {
    for (const key of productCatalog[input.productKey].entitlements) {
      await tx.entitlementGrant.upsert({
        where: {
          userId_key_source_sourceId: {
            userId: input.userId,
            key,
            source: "SUBSCRIPTION",
            sourceId: input.sourceId,
          },
        },
        create: {
          userId: input.userId,
          key,
          source: "SUBSCRIPTION",
          sourceId: input.sourceId,
          startsAt: input.at,
          endsAt: input.currentPeriodEnd,
          metadata: { productKey: input.productKey },
        },
        update: {
          startsAt: input.at,
          endsAt: input.currentPeriodEnd,
          revokedAt: null,
          metadata: { productKey: input.productKey },
        },
      });
    }
  }

  return access;
}

/**
 * A successful payment for an account that has been deleted (a pass or credit pack bought just
 * before the deletion, or any charge that landed after it): nothing is granted, so the money has
 * to go back by hand. Logged at error and returned as the event's note so it shows in the admin
 * webhook list. Ids and amounts only, no personal data. `null` for a zero-amount payment.
 */
function refundNeededNote(payment: z.infer<typeof dodoPaymentSchema>) {
  if (!payment.total_amount) return null;
  const currency = (payment.currency ?? payment.settlement_currency).toUpperCase();
  const note = `Refund needed: payment ${payment.payment_id} (${payment.total_amount} ${currency} minor units) was taken for a deleted account and granted nothing. Refund it from the Dodo dashboard.`;
  logger.error(note, {
    paymentId: payment.payment_id,
    subscriptionId: payment.subscription_id ?? null,
    amountMinor: payment.total_amount,
    currency,
  });
  return note;
}

/** The confirmation fields every one-time purchase (pass, pack) takes from its payment. */
function oneTimePurchase(
  payment: z.infer<typeof dodoPaymentSchema>,
): Omit<PurchaseConfirmation, "kind" | "productName" | "accessEndsAt" | "credits"> {
  return {
    amountCents: payment.total_amount ?? null,
    currency: payment.currency ?? null,
    amountExcludesTax: false,
    renewsAt: null,
    billingPeriod: null,
    creditsNote: null,
  };
}

type AccessGrant = {
  key: string;
  endsAt: Date | null;
  source: EntitlementSource;
  metadata: Prisma.JsonValue;
};

function isPassGrant(grant: AccessGrant) {
  return (
    grant.source === "SYSTEM" &&
    typeof grant.metadata === "object" &&
    grant.metadata !== null &&
    !Array.isArray(grant.metadata) &&
    grant.metadata.pass === true
  );
}

/** Latest end among the grants; `null` when there are none or when one of them is open-ended. */
function latestEnd(grants: AccessGrant[]) {
  if (grants.length === 0 || grants.some((grant) => grant.endsAt === null)) return null;
  return new Date(Math.max(...grants.map((grant) => (grant.endsAt as Date).getTime())));
}

/** A grant someone paid for: a subscription's or a pass's. Admin comps (MANUAL) and promotions are not. */
function isPurchasedGrant(grant: AccessGrant) {
  return grant.source === "SUBSCRIPTION" || isPassGrant(grant);
}

/**
 * What the customer has and whether they paid for it, derived from the grants in effect (any
 * source) and the credit wallet, so a pass holder or a credit-pack buyer is never described as a
 * free user (owner decision 2). Two separate answers:
 *
 * - `isPaid`: has Pro, the account-wide rule `EntitlementService.isPaid` applies (a subscription,
 *   a pass, or an admin comp of one; an AI Credits subscription counts, as it lifts the document
 *   limit). A credit pack never makes someone paid (owner decision 3).
 * - `isPaying`: the customer actually paid us: a subscription, a pass, or credits that were paid
 *   for (`paidCredits`: packs, plan allowances). An admin comp grant and goodwill credits (which
 *   only add to `creditBalance`) do not (V-188).
 */
/**
 * `dunning`: the product of a subscription in dunning (PAST_DUE, grace running or not: the same
 * rule checkout applies, V-221), or null. Its grants are revoked while the card is retried, but the
 * customer is still a paying subscriber with a payment problem (decision 2), never shown as free.
 * `paymentIssue` is false for a pause, which owes nothing.
 */
function describeAccess(
  grants: AccessGrant[],
  creditBalance: number,
  paidCredits: number,
  dunning: ProductKey | null = null,
  paymentIssue = dunning !== null,
) {
  const portfolio = grants.filter((grant) => grant.key === ENTITLEMENT_KEYS.PORTFOLIO_PUBLISH);
  const ai = grants.filter((grant) => grant.key === ENTITLEMENT_KEYS.AI_CREDITS);
  const passes = grants.filter(isPassGrant);
  const subscribedPortfolio = portfolio.some((grant) => !isPassGrant(grant));
  const subscribedAi = ai.some((grant) => !isPassGrant(grant));

  const tier =
    subscribedPortfolio && subscribedAi
      ? ("bundle" as const)
      : subscribedPortfolio
        ? ("portfolio_pro" as const)
        : subscribedAi
          ? ("ai_credits" as const)
          : passes.length > 0
            ? ("pass" as const)
            : paidCredits > 0
              ? ("credits" as const)
              : ("free" as const);
  // In dunning the revoked grants say nothing about the plan: the subscription does.
  const shownTier = dunning && (tier === "free" || tier === "credits") ? dunning : tier;

  return {
    tier: shownTier,
    isPaid: grants.some((grant) => isPaidAccessKey(grant.key)),
    isPaying: grants.some(isPurchasedGrant) || paidCredits > 0 || dunning !== null,
    paymentIssue,
    passEndsAt: latestEnd(passes),
    portfolioAccessEndsAt: latestEnd(portfolio),
    aiCreditsEndsAt: latestEnd(ai),
    creditBalance,
  };
}

/**
 * Revokes a reversed pass (V-205) and gives back to the passes stacked after it the days it no
 * longer covers (V-220): a pass bought during this one started where this one ended, so with this
 * one gone it starts now (or where this one would have started) instead, and its credits' expiry
 * moves with it. The customer loses no day they paid for. Runs under the billing lock.
 */
async function revokeReversedPass(tx: Prisma.TransactionClient, userId: string, paymentId: string) {
  await lockUserForBilling(tx, userId);
  const grants = await tx.entitlementGrant.findMany({
    where: { userId, source: "SYSTEM", sourceId: paymentId, revokedAt: null },
    select: { startsAt: true, endsAt: true, metadata: true },
  });
  if (grants.length === 0) return { count: 0 };

  const now = new Date();
  const startsAt = new Date(Math.min(...grants.map((grant) => grant.startsAt.getTime())));
  const ends = grants.flatMap((grant) => (grant.endsAt ? [grant.endsAt.getTime()] : []));
  const endsAt = ends.length > 0 ? new Date(Math.max(...ends)) : null;
  const revoked = await tx.entitlementGrant.updateMany({
    where: { userId, source: "SYSTEM", sourceId: paymentId, revokedAt: null },
    data: { revokedAt: now },
  });

  // The days of this pass not yet used: what a pass stacked after it was pushed back by. Never more
  // than the pass's own length: a pass that was itself stacked on an earlier one ends that much
  // after it, and the earlier one's days are not this refund's to give back.
  const interval = (grants[0]?.metadata as { interval?: unknown } | null)?.interval;
  const ownLengthMs = isCatalogInterval(String(interval))
    ? addCatalogInterval(startsAt, interval as CatalogInterval).getTime() - startsAt.getTime()
    : Number.POSITIVE_INFINITY;
  const unusedMs = Math.min(
    endsAt && endsAt > now ? endsAt.getTime() - Math.max(now.getTime(), startsAt.getTime()) : 0,
    ownLengthMs,
  );
  if (unusedMs <= 0) return revoked;

  const stacked = await tx.entitlementGrant.findMany({
    where: {
      userId,
      source: "SYSTEM",
      revokedAt: null,
      sourceId: { not: paymentId },
      startsAt: { gte: startsAt },
      endsAt: { gt: endsAt! },
      metadata: { path: ["pass"], equals: true },
    },
    select: { id: true, sourceId: true, endsAt: true },
  });
  for (const grant of stacked)
    await tx.entitlementGrant.update({
      where: { id: grant.id },
      data: { endsAt: new Date(grant.endsAt!.getTime() - unusedMs) },
    });

  const stackedPayments = [...new Set(stacked.map((grant) => grant.sourceId))];
  if (stackedPayments.length > 0) {
    const credits = await tx.creditGrant.findMany({
      where: {
        userId,
        source: CREDIT_SOURCES.subscriptionPayment,
        sourceId: { in: stackedPayments },
        expiresAt: { gt: now },
      },
      select: { id: true, expiresAt: true },
    });
    for (const credit of credits)
      await tx.creditGrant.update({
        where: { id: credit.id },
        data: { expiresAt: new Date(credit.expiresAt!.getTime() - unusedMs) },
      });
    logger.info("Passes stacked after a reversed pass moved forward", {
      paymentId,
      stackedPayments,
      unusedMs,
    });
  }
  return revoked;
}

export class BillingService {
  static async getLatestSubscription(userId: string) {
    return prisma.subscription.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" } });
  }

  /**
   * The follow-up every billing change owes the user, for callers that edit grants or
   * subscription rows without a provider event (admin edits): the publication is recomputed
   * from the grants in effect, falling back to what the latest portfolio subscription says
   * (GRACE while its grace window runs, otherwise SUSPENDED), and every cache that reflects
   * billing state is cleared. Same lock and same rules as the webhook path.
   */
  static async reconcileAccess(userId: string) {
    const subscription = await prisma.subscription.findFirst({
      where: { userId, productKey: { in: ["portfolio_pro", "bundle"] } },
      orderBy: { updatedAt: "desc" },
    });
    const access = accessStatus(subscription);

    await prisma.$transaction(async (tx) => {
      await lockUserForBilling(tx, userId);
      await reconcilePortfolioPublication(tx, userId, new Date(), {
        publicationStatus: access.publicationStatus === "GRACE" ? "GRACE" : "SUSPENDED",
        suspensionReason: subscription?.status ?? "INACTIVE",
      });
    }, BILLING_TRANSACTION_OPTIONS);

    await this.invalidateAfterBillingChange(userId);
  }

  static async getSummary(userId: string) {
    const cached = await cacheGet<Awaited<ReturnType<typeof BillingService.buildSummary>>>(
      billingSummaryCacheKey(userId),
    );
    if (cached) return cached;
    const result = await this.buildSummary(userId);
    await cacheSet(billingSummaryCacheKey(userId), result, BILLING_SUMMARY_TTL_SECONDS);
    return result;
  }

  private static async buildSummary(userId: string) {
    const at = new Date();
    const [user, subscriptions, activeSubscriptions, activeGrants, wallet, paidCredits] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { id: true },
        }),
        prisma.subscription.findMany({
          where: { userId },
          orderBy: { updatedAt: "desc" },
          take: 50,
        }),
        prisma.subscription.findMany({
          where: {
            userId,
            status: { in: ["ACTIVE"] },
            OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: at } }],
          },
          select: { productKey: true, currentPeriodEnd: true },
        }),
        // Same predicate as EntitlementService.listActive; the rows (not just the keys) are
        // needed to tell a pass from a subscription and to report when access ends.
        prisma.entitlementGrant.findMany({
          where: {
            userId,
            startsAt: { lte: at },
            revokedAt: null,
            OR: [{ endsAt: null }, { endsAt: { gt: at } }],
          },
          select: { key: true, endsAt: true, source: true, metadata: true },
          orderBy: { endsAt: "desc" },
        }),
        CreditService.getWallet(userId),
        CreditService.paidCreditsRemaining(userId, at),
      ]);

    if (!user) throw new ApiError(404, "User not found");
    const entitlements = [...new Set(activeGrants.map((grant) => grant.key))];
    // `available` not `balance`: reads no longer sweep (V-107), so `balance` can still hold
    // expired credits for a while, and those must never make a user look paying.
    const dunning = subscriptions.find(
      (item) => item.status === "PAST_DUE" && isProductKey(item.productKey),
    );
    const access = describeAccess(
      activeGrants,
      wallet.available,
      paidCredits,
      dunning ? (dunning.productKey as ProductKey) : null,
      Boolean(dunning && dunning.rawStatus !== "paused"),
    );
    const entitlementCurrent = entitlements.includes(ENTITLEMENT_KEYS.PORTFOLIO_PUBLISH);
    const hasAiCredits = entitlements.includes(ENTITLEMENT_KEYS.AI_CREDITS);
    const portfolioAccessEndsAt =
      activeSubscriptions
        .filter((item) => item.productKey === "portfolio_pro" || item.productKey === "bundle")
        .map((item) => item.currentPeriodEnd)
        .filter((value): value is Date => Boolean(value))
        .sort((left, right) => right.getTime() - left.getTime())[0] ?? null;
    const plan =
      entitlementCurrent && hasAiCredits
        ? "BUNDLE"
        : entitlementCurrent
          ? "PORTFOLIO_PRO"
          : hasAiCredits
            ? "AI_CREDITS"
            : "FREE";

    // Status, period and grace describe one subscription, chosen the same way `plan` is
    // derived: what is in effect today (V-176). A subscription that is no longer in effect
    // reports INACTIVE, except dunning, which stays PAST_DUE while its grace runs (V-172).
    const subscription = primarySubscription(subscriptions, at);
    const resolvedStatus =
      subscription && subscriptionInEffect(subscription, at) ? subscription.status : "INACTIVE";

    return {
      plan,
      productKey: subscription?.productKey ?? null,
      activeProductKeys: [...new Set(activeSubscriptions.map((item) => item.productKey))],
      status: resolvedStatus,
      interval: subscription?.interval ?? null,
      currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
      graceEndsAt: subscription?.graceEndsAt ?? null,
      canPublish: entitlementCurrent,
      accessEndsAt: portfolioAccessEndsAt,
      publicationStatus: entitlementCurrent
        ? "LIVE"
        : subscription?.graceEndsAt && subscription.graceEndsAt > new Date()
          ? "GRACE"
          : "SUSPENDED",
      entitlements,
      access,
      credits: wallet,
      catalog: publicCatalog(),
      creditEconomics: publicCreditEconomics(),
      addOns: entitlementCurrent
        ? [
            { key: "extra_credits", name: "Extra credit packs" },
            { key: "extra_publish_capacity", name: "Extra publish capacity" },
          ]
        : [],
    };
  }

  static async requirePublishAccess(userId: string) {
    return EntitlementService.require(
      userId,
      ENTITLEMENT_KEYS.PORTFOLIO_PUBLISH,
      `Publishing this template requires ${UNLOCK_PHRASES.portfolioPro}.`,
    );
  }

  /**
   * The customer's billing events, each with the product and amount it was for (V-197). A row
   * stored before those columns existed is described from its payload while the payload lasts;
   * the payload itself is never returned.
   */
  static async getHistory(userId: string) {
    const cached = await cacheGet<Awaited<ReturnType<typeof BillingService.readHistory>>>(
      billingHistoryCacheKey(userId),
    );
    if (cached) return cached;
    const result = await this.readHistory(userId);
    await cacheSet(billingHistoryCacheKey(userId), result, BILLING_HISTORY_TTL_SECONDS);
    return result;
  }

  private static async readHistory(userId: string) {
    const rows = await prisma.billingWebhookEvent.findMany({
      where: { userId, status: "PROCESSED" },
      select: {
        id: true,
        providerEventId: true,
        type: true,
        processedAt: true,
        createdAt: true,
        productName: true,
        amountCents: true,
        currency: true,
        payload: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return rows.map(({ payload, ...row }) => {
      if (row.productName !== null && row.amountCents !== null && row.currency !== null) return row;
      const fromPayload = summarizeBillingEvent(payload);
      return {
        ...row,
        productName: row.productName ?? fromPayload.productName,
        amountCents: row.amountCents ?? fromPayload.amountCents,
        currency: row.currency ?? fromPayload.currency,
      };
    });
  }

  /**
   * Opens a checkout session, or returns the one already open for this user and product.
   *
   * The record in Redis is the purchase idempotency (V-125): keyed per (user, product), claimed
   * before the provider call so two clicks at once make one session, kept for the provider's
   * session lifetime, consumed by the webhook that settles the product, and cleared by
   * `cancelCheckout` only once the provider confirms nothing is being paid. A repeat request for
   * the same interval gets the same URL; a different interval, or an overlapping product, is
   * refused until that session is settled or cleared.
   */
  static async createCheckout(
    userId: string,
    productKey: ProductKey,
    interval: BillingIntervalInput,
    redirectUrl?: string,
  ) {
    const productId = getProviderProductId(productKey, interval);

    if (!productCatalog[productKey].prices[interval])
      throw new ApiError(400, "That billing interval is not available for this product.");
    if (!productId) throw new ApiError(503, "The selected billing product is not configured.");

    // The "has this user subscribed before" lookup that used to sit here existed only
    // to decide trial eligibility. With no trials, it is a query per checkout for a
    // value nothing reads.
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) throw new ApiError(404, "User not found");
    const now = new Date();
    const liveSubscriptions = await prisma.subscription.findMany({
      where: {
        userId,
        OR: [
          {
            status: "ACTIVE",
            OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }],
          },
          // Dunning is live whether or not the grace window is still running: Dodo keeps
          // retrying the card, the same rule account deletion applies (V-168).
          { status: "PAST_DUE" },
        ],
      },
      select: {
        productKey: true,
        status: true,
        rawStatus: true,
        interval: true,
        cancelAtPeriodEnd: true,
      },
    });
    const overlap = checkoutOverlap(productKey, interval, liveSubscriptions);
    if (overlap) throw overlap;

    const redis = getRedis();
    const recordKey = checkoutRecordKey(userId);
    const claim: CheckoutRecord = { state: "claimed", token: randomUUID() };

    // A session recorded per product before V-218 is still open for up to a day after the deploy.
    for (const legacyProduct of PRODUCT_KEYS) {
      const legacy = parseCheckoutRecord(
        await redis.get(legacyCheckoutRecordKey(userId, legacyProduct)),
      );
      if (!legacy) continue;
      if (legacy.state === "open" && legacyProduct === productKey && legacy.interval === interval)
        return { url: legacy.url, reused: true };
      throw new ApiError(409, CHECKOUT_ACTIVE_MESSAGE, CHECKOUT_IN_PROGRESS);
    }

    for (let attempt = 0; ; attempt += 1) {
      const claimed =
        (await redis.set(recordKey, JSON.stringify(claim), {
          NX: true,
          EX: CHECKOUT_CLAIM_TTL_SECONDS,
        })) === "OK";
      if (claimed) break;

      // The user's one open session: the same product and interval gets it back; anything else
      // waits until it is paid, settled or cancelled.
      const existing = parseCheckoutRecord(await redis.get(recordKey));
      if (existing?.state === "open") {
        if (existing.productKey === productKey && existing.interval === interval)
          return { url: existing.url, reused: true };
        throw new ApiError(409, CHECKOUT_ACTIVE_MESSAGE, CHECKOUT_IN_PROGRESS);
      }
      // A claim: a concurrent request is creating the session right now. Wait for it and hand
      // back its URL rather than opening a second one. Gone meanwhile (the other call failed
      // and released it): the loop claims it on the next pass.
      if (attempt >= CHECKOUT_CLAIM_WAIT_ATTEMPTS)
        throw new ApiError(
          409,
          "A checkout is being prepared. Try again in a moment.",
          CHECKOUT_IN_PROGRESS,
        );
      await sleep(CHECKOUT_CLAIM_WAIT_MS);
    }

    try {
      const buildRedirectUrl = (base: string, callback?: string) => {
        if (!callback) return base;

        try {
          const url = new URL(base);
          url.searchParams.set("callbackURL", callback);

          return url.toString();
        } catch {
          const separator = base.includes("?") ? "&" : "?";

          return `${base}${separator}callbackURL=${encodeURIComponent(callback)}`;
        }
      };

      const checkout = await getDodoCheckoutClient().checkoutSessions.create({
        product_cart: [{ product_id: productId, quantity: 1 }],
        customer: { email: user.email, name: user.name || "VeriWorkly User" },
        metadata: {
          veriworkly_user_id: userId,
          veriworkly_product: productKey,
          veriworkly_interval: interval,
        },
        // No trial on any plan. Creator Pro monthly previously received an automatic
        // 7-day trial on a first subscription; it was removed as a product decision.
        // Trials carry disclosure and reminder duties under several US state
        // auto-renewal statutes, and we would rather not offer one than offer one we
        // cannot service properly. Every plan now charges at checkout.
        return_url: buildRedirectUrl(config.dodo.checkoutReturnUrl, redirectUrl),
        cancel_url: buildRedirectUrl(config.dodo.checkoutCancelUrl, redirectUrl),
      });

      if (!checkout.checkout_url)
        throw new ApiError(502, "Billing provider did not return a checkout URL.");

      const record: CheckoutRecord = {
        state: "open",
        sessionId: checkout.session_id,
        url: checkout.checkout_url,
        productKey,
        interval,
        createdAt: new Date().toISOString(),
      };
      const stored = await redis.eval(compareAndSetScript, {
        keys: [recordKey],
        arguments: [
          JSON.stringify(claim),
          JSON.stringify(record),
          String(CHECKOUT_RECORD_TTL_SECONDS),
        ],
      });
      if (Number(stored) !== 1) {
        // Our claim expired while the provider call ran, and the key may now hold another
        // request's session. Overwriting it would leave one of the two sessions payable and
        // untracked, and handing out this URL would invite paying it.
        logger.error("Checkout claim lost before the session was recorded", {
          userId,
          productKey,
          sessionId: checkout.session_id,
        });
        throw new ApiError(409, CHECKOUT_ACTIVE_MESSAGE, CHECKOUT_IN_PROGRESS);
      }

      return { url: checkout.checkout_url, reused: false };
    } catch (error) {
      // Only our own claim: a record another request completed meanwhile stays.
      await redis
        .eval(compareAndDeleteScript, { keys: [recordKey], arguments: [JSON.stringify(claim)] })
        .catch((releaseError) =>
          logger.warn("Failed to release a checkout claim", { userId, error: releaseError }),
        );
      throw error;
    }
  }

  /**
   * Forgets the user's open checkout sessions, but only those the provider confirms are not
   * being paid. A session whose payment succeeded or is processing stays until its webhook
   * settles it: dropping it would let a second session for the same product be opened and paid.
   */
  static async cancelCheckout(userId: string) {
    const redis = getRedis();
    const cleared: ProductKey[] = [];
    const paying: ProductKey[] = [];
    let preparing = false;

    // The user's record, then any per-product record left from before V-218.
    const keys = [
      { key: checkoutRecordKey(userId), legacyProduct: null },
      ...PRODUCT_KEYS.map((legacyProduct) => ({
        key: legacyCheckoutRecordKey(userId, legacyProduct),
        legacyProduct,
      })),
    ];
    for (const { key, legacyProduct } of keys) {
      const raw = await redis.get(key);
      const record = parseCheckoutRecord(raw);
      if (!record) continue;
      if (record.state === "claimed") {
        preparing = true;
        continue;
      }
      const productKey = record.productKey ?? legacyProduct;
      if (!productKey) continue;

      let paymentStatus: string | null | undefined;
      try {
        paymentStatus = (await getDodoClient().checkoutSessions.retrieve(record.sessionId))
          .payment_status;
      } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(
          503,
          "Could not confirm the checkout with the billing provider. Try again in a moment.",
          { reason: error instanceof Error ? error.message : "provider unavailable" },
        );
      }

      if (paymentStatus && PAYMENT_IN_FLIGHT_STATUSES.has(paymentStatus)) {
        paying.push(productKey);
        continue;
      }

      // Compare-and-delete on the exact record read: a webhook or a newer session wins.
      await redis.eval(compareAndDeleteScript, { keys: [key], arguments: [raw as string] });
      cleared.push(productKey);
    }

    if (paying.length > 0)
      throw new ApiError(
        409,
        `A payment for ${paying.map((key) => productCatalog[key].name).join(", ")} is still being processed. Wait for the confirmation before starting another checkout.`,
      );
    if (preparing && cleared.length === 0)
      throw new ApiError(409, "A checkout is still being prepared. Try again in a moment.");

    return { success: true, cleared };
  }

  /**
   * The provider settled this product one way or another; the open-session record is spent, but
   * only when the event is about that session. An event naming another checkout session, or one
   * about a subscription or payment created before the record was opened (a late cancel or
   * renewal of an older subscription), leaves a newer open checkout alone. A claim is a session
   * still being created, which no event can be about yet.
   */
  private static async settleCheckoutRecord(
    userId: string,
    productKey: ProductKey,
    event: { checkoutSessionId?: string | null; createdAt?: string | null },
  ) {
    try {
      const redis = getRedis();
      for (const key of [checkoutRecordKey(userId), legacyCheckoutRecordKey(userId, productKey)]) {
        const raw = await redis.get(key);
        const record = parseCheckoutRecord(raw);
        if (!record || record.state !== "open") continue;
        // The user's one record may be another product's session: an event about this product
        // does not settle it (a legacy per-product record names no product and is this one's).
        if (record.productKey && record.productKey !== productKey) continue;

        if (event.checkoutSessionId) {
          if (event.checkoutSessionId !== record.sessionId) continue;
        } else if (event.createdAt) {
          const eventCreatedAt = Date.parse(event.createdAt);
          const openedAt = Date.parse(record.createdAt);
          if (eventCreatedAt < openedAt - CHECKOUT_SETTLE_CLOCK_SLACK_MS) continue;
        }

        // Compare-and-delete on the exact record read: a session opened meanwhile stays.
        await redis.eval(compareAndDeleteScript, { keys: [key], arguments: [raw as string] });
      }
    } catch (error) {
      logger.warn("Failed to clear a settled checkout record", { error });
    }
  }

  /**
   * Which plan change a customer may make (V-202), as the live subscription it applies to and the
   * provider product it moves to. Only upgrades to the bundle at the same interval are offered:
   * Creator Pro or AI Credits to the Job Hunter Bundle. Downgrades, sideways moves and monthly to
   * annual (or back) are not decided, so they are refused with a code the studio can explain.
   * Only the caller's own subscription is ever looked at.
   */
  private static async resolvePlanChange(
    userId: string,
    productKey: ProductKey,
    interval: PlanChangeInterval,
  ) {
    const now = new Date();
    const live = await prisma.subscription.findMany({
      where: {
        userId,
        OR: [
          {
            status: "ACTIVE",
            OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }],
          },
          { status: "PAST_DUE" },
        ],
      },
      select: {
        providerSubId: true,
        productKey: true,
        status: true,
        rawStatus: true,
        interval: true,
        cancelAtPeriodEnd: true,
      },
    });

    const current = live.find((item) => item.status === "PAST_DUE") ?? live[0];
    if (!current || !isProductKey(current.productKey))
      throw planChangeError(
        "NO_SUBSCRIPTION",
        "You have no active subscription to change. Choose a plan to subscribe instead.",
      );
    const activeName = PRODUCT_NAMES[current.productKey];
    if (live.length > 1 || !current.providerSubId)
      throw planChangeError(
        "PLAN_CHANGE_UNAVAILABLE",
        "This plan cannot be changed here. Contact support and we will switch it for you.",
      );
    if (current.status === "PAST_DUE")
      throw current.rawStatus === "paused"
        ? planChangeError(
            "SUBSCRIPTION_PAUSED",
            `Your ${activeName} subscription is paused. Resume it from Manage billing before changing plans.`,
          )
        : planChangeError(
            "PAYMENT_OUTSTANDING",
            `Your ${activeName} subscription has a payment outstanding. Update your payment method from Manage billing before changing plans.`,
          );

    const currentInterval = recurringInterval(current.interval);
    if (current.productKey === productKey && currentInterval === interval)
      throw planChangeError("ALREADY_SUBSCRIBED", `You already have ${activeName}.`);
    if (productKey !== "bundle" || current.productKey === "bundle")
      throw planChangeError(
        "PLAN_CHANGE_NOT_UPGRADE",
        `Only an upgrade to the ${PRODUCT_NAMES.bundle} can be made here. To move to a smaller plan, cancel ${activeName} from Manage billing and subscribe again when it ends.`,
      );
    if (currentInterval !== interval)
      throw planChangeError(
        "PLAN_CHANGE_INTERVAL",
        `Your ${activeName} plan is billed ${currentInterval === "annual" ? "yearly" : "monthly"}. The upgrade keeps that billing period.`,
      );
    if (current.cancelAtPeriodEnd)
      throw planChangeError(
        "SUBSCRIPTION_ENDING",
        `Your ${activeName} subscription is set to end. Resume it from Manage billing before upgrading.`,
      );

    const providerProductId = getProviderProductId(productKey, interval);
    if (!providerProductId)
      throw new ApiError(503, "The selected billing product is not configured.");

    return {
      providerSubId: current.providerSubId,
      fromProductKey: current.productKey,
      providerProductId,
    };
  }

  /**
   * What an upgrade would cost (V-202): the prorated charge taken now and the plan's price from
   * the next billing date, as Dodo calculates them. Changes nothing.
   */
  static async previewPlanChange(
    userId: string,
    productKey: ProductKey,
    interval: PlanChangeInterval,
  ) {
    const change = await this.resolvePlanChange(userId, productKey, interval);

    let preview: Awaited<ReturnType<DodoPayments["subscriptions"]["previewChangePlan"]>>;
    try {
      preview = await getDodoClient().subscriptions.previewChangePlan(change.providerSubId, {
        product_id: change.providerProductId,
        quantity: 1,
        proration_billing_mode: PLAN_CHANGE_PRORATION,
      });
    } catch (error) {
      throw providerPlanChangeError(error, "could not price the upgrade");
    }

    return {
      productKey,
      interval,
      dueNow: preview.immediate_charge.summary.total_amount,
      currency: preview.immediate_charge.summary.currency.toUpperCase(),
      nextAmount: preview.new_plan.recurring_pre_tax_amount,
      nextBillingDate: preview.new_plan.next_billing_date,
    };
  }

  /**
   * Upgrades the live subscription at the provider (V-202). Nothing local changes here: Dodo
   * charges the prorated difference and, once that payment succeeds (`prevent_change`), sends the
   * plan-change webhook that moves the row, the grants and the credits (`applySubscriptionEvent`).
   *
   * Idempotent end to end:
   * - the same key returns the stored answer without a second provider call, and a double click
   *   with that key waits briefly for the first request's answer and replays it;
   * - a second key while a change is in flight or awaiting its webhook is a 409
   *   `PLAN_CHANGE_PENDING`, as is the provider's own "a plan change is already pending" 409;
   * - a provider refusal (any other 4xx) releases the claim and stores nothing, so the same key can
   *   try again (502 `PROVIDER_UNAVAILABLE`);
   * - a timeout, a dropped connection or a provider 5xx may still have applied the change, so it is
   *   never reported as "nothing changed": the change is recorded as pending (one hour, or until
   *   its webhook or failed payment clears it) and answered `confirmed: false`, which the
   *   controller sends as a 202. Retries with the same key replay that answer.
   */
  static async changePlan(
    userId: string,
    productKey: ProductKey,
    interval: PlanChangeInterval,
    idempotencyKey: string,
  ) {
    const redis = getRedis();
    const resultKey = planChangeResultKey(userId, idempotencyKey);
    const stored = await readPlanChangeReplay(resultKey, productKey, interval);
    if (stored) return stored;

    const change = await this.resolvePlanChange(userId, productKey, interval);
    const pendingKey = planChangePendingKey(change.providerSubId);
    const requestKey = `${userId}:${idempotencyKey}`;
    const claim = JSON.stringify({ state: "claimed", token: randomUUID(), requestKey });

    for (let attempt = 0; ; attempt += 1) {
      const claimed =
        (await redis.set(pendingKey, claim, { NX: true, EX: CHECKOUT_CLAIM_TTL_SECONDS })) === "OK";
      if (claimed) break;

      // A double click with the same key: the first request is talking to the provider. Wait for
      // its answer and replay it, the way a second checkout click waits for the first session.
      const holder = parsePlanChangePending(await redis.get(pendingKey));
      if (
        (holder && holder.requestKey !== requestKey) ||
        attempt >= PLAN_CHANGE_SAME_KEY_WAIT_ATTEMPTS
      )
        throw planChangeError(
          "PLAN_CHANGE_PENDING",
          "A plan change for this subscription is already in progress. It completes once the payment is confirmed.",
        );
      await sleep(CHECKOUT_CLAIM_WAIT_MS);
      const replay = await readPlanChangeReplay(resultKey, productKey, interval);
      if (replay) return replay;
    }

    let result: PlanChangeResult;
    try {
      const response = await getDodoCheckoutClient().subscriptions.changePlan(
        change.providerSubId,
        {
          product_id: change.providerProductId,
          quantity: 1,
          proration_billing_mode: PLAN_CHANGE_PRORATION,
          // No payment, no new plan: the subscription stays as it is until the charge succeeds.
          on_payment_failure: "prevent_change",
          metadata: {
            veriworkly_user_id: userId,
            veriworkly_product: productKey,
            veriworkly_interval: interval,
            [PLAN_CHANGE_METADATA_KEY]: "1",
          },
        },
        { idempotencyKey: `plan-change:${requestKey}` },
      );
      result = {
        status: "pending",
        productKey,
        interval,
        paymentId: response.payment_id ?? null,
        confirmed: true,
      };
    } catch (error) {
      if (!providerOutcomeUnknown(error)) {
        await redis
          .eval(compareAndDeleteScript, { keys: [pendingKey], arguments: [claim] })
          .catch((releaseError) =>
            logger.warn("Failed to release a plan-change claim", { userId, error: releaseError }),
          );
        if (isProviderError(error, DodoPayments.ConflictError))
          throw planChangeError(
            "PLAN_CHANGE_PENDING",
            "A plan change for this subscription is already waiting for its payment. It completes once the payment is confirmed.",
          );
        throw providerPlanChangeError(error, "did not accept the upgrade");
      }
      logger.warn("Plan change sent but not confirmed by the provider; holding it as pending", {
        userId,
        subscriptionId: change.providerSubId,
        to: productKey,
        error: error instanceof Error ? error.message : String(error),
      });
      result = { status: "pending", productKey, interval, paymentId: null, confirmed: false };
    }

    // The pending record keeps a second change off this subscription until the webhook lands (or
    // the payment fails); the result record answers a retry of this request. Written only over our
    // own claim: a failed-payment or plan-change webhook that already cleared the key while the
    // provider call ran must not be undone by a lock that would then stand for an hour.
    const kept = await redis.eval(compareAndSetScript, {
      keys: [pendingKey],
      arguments: [
        claim,
        JSON.stringify({ state: "pending", requestKey, ...result }),
        String(PLAN_CHANGE_PENDING_TTL_SECONDS),
      ],
    });
    if (Number(kept) !== 1)
      logger.info("Plan change settled by its webhook before the request finished", {
        userId,
        subscriptionId: change.providerSubId,
      });
    await redis.set(resultKey, JSON.stringify(result), { EX: PLAN_CHANGE_RESULT_TTL_SECONDS });
    logger.info("Subscription plan change requested", {
      userId,
      subscriptionId: change.providerSubId,
      from: change.fromProductKey,
      to: productKey,
      interval,
      paymentId: result.paymentId,
      confirmed: result.confirmed,
    });

    return { ...result, replayed: false };
  }

  /** The change landed or its payment failed: another one may be requested. Never throws. */
  private static async clearPendingPlanChange(providerSubId: string) {
    try {
      await getRedis().del(planChangePendingKey(providerSubId));
    } catch (error) {
      logger.warn("Failed to clear a pending plan change", { providerSubId, error });
    }
  }

  /**
   * The credits a plan change owes (V-202), once the subscription row shows the new plan. A plan
   * that carries no credits (Creator Pro) moving to one that does (the bundle) gets this month's
   * 1,000 now, ending with the month like every other subscription month; a plan that already
   * carried them (AI Credits) keeps the month it has, so nothing is granted twice.
   *
   * - Monthly: one grant to the period end, keyed on the period, unless an unexpired subscription
   *   grant already covers it.
   * - Annual: the monthly schedule over the paid year, anchored on its start, through the same
   *   `openAnnualCreditSchedule`/`grantDueMonths` path a payment uses (an AI Credits year already
   *   has one covering it and gains nothing; the hourly job grants the months that follow).
   *
   * A downgrade (owner decision, portal only: Bundle to Creator Pro, Bundle to AI Credits) grants
   * nothing here: the month already granted was paid for and stays until it ends (no grant is cut
   * early), and from the next month the new plan's allowance applies (none for Creator Pro: its
   * renewal payment earns nothing, and an annual schedule stops at its next month because
   * `monthEligibility` sees a plan without credits).
   *
   * Safe to repeat: every delivery about the change (the plan change, its `updated`, a redelivery,
   * the proration payment) ends here and finds the credits already granted.
   */
  private static async applyPlanChangeCredits(input: {
    userId: string;
    providerSubId: string;
    productKey: ProductKey;
    interval: CatalogInterval;
    periodStart: Date;
    periodEnd: Date;
  }) {
    const allowance = productCatalog[input.productKey].creditAllowance?.[input.interval] ?? 0;
    if (allowance <= 0) return;

    if (input.interval === "annual") {
      const schedule = await openAnnualCreditSchedule({
        userId: input.userId,
        providerSubId: input.providerSubId,
        productKey: input.productKey,
        // No payment opens it (the proration pays for the plan, not for a year), so it is keyed on
        // the period it covers.
        paymentId: `plan-change:${input.providerSubId}:${input.periodStart.toISOString()}`,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        servicePeriodKnown: true,
      });
      if (schedule) await grantDueMonths(schedule.id);
      return;
    }

    if (input.periodEnd <= new Date()) return;
    const covered = await prisma.creditGrant.findFirst({
      where: {
        userId: input.userId,
        expiresAt: { gt: new Date() },
        AND: [await subscriptionCreditGrantsWhere(input.providerSubId)],
      },
      select: { id: true },
    });
    if (covered) return;

    const period = input.periodEnd.toISOString();
    try {
      await CreditService.grant(input.userId, allowance, {
        requestId: `plan-change-credit:${input.providerSubId}:${period}`,
        source: CREDIT_SOURCES.subscriptionPayment,
        // `<subscription id>:` keeps it in `subscriptionCreditGrantsWhere`, so the next renewal's
        // month replaces it.
        sourceId: `${input.providerSubId}:plan-change:${period}`,
        expiresAt: input.periodEnd,
        reason: `${productCatalog[input.productKey].name} credit allowance`,
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"))
        throw error;
    }
  }

  /**
   * The customer portal (receipts, invoices, cancellation). A subscriber's customer id is on the
   * subscription row; a pass or credit-pack buyer's is the one recorded from their payment
   * (V-175).
   */
  static async createPortal(userId: string) {
    const [subscription, user] = await Promise.all([
      prisma.subscription.findFirst({
        where: { userId, providerCustomerId: { not: null } },
        orderBy: { updatedAt: "desc" },
        select: { providerCustomerId: true },
      }),
      prisma.user.findUnique({ where: { id: userId }, select: { billingCustomerId: true } }),
    ]);
    const customerId = subscription?.providerCustomerId ?? user?.billingCustomerId ?? null;

    if (!customerId) throw new ApiError(409, "No billing account exists yet.");

    const portal = await getDodoClient().customers.customerPortal.create(customerId, {
      return_url: config.dodo.portalReturnUrl,
    });

    return { url: portal.link };
  }

  /**
   * Schedules (or withdraws) a cancellation at the end of the paid period at the provider, and
   * returns what the provider now reports (V-169). Dodo is the system that charges the card, so
   * a cancellation that only exists in our database cancels nothing. Any failure is a 502 before
   * anything local changes; the caller writes the provider's answer, not its own request.
   */
  static async setProviderCancelAtPeriodEnd(providerSubId: string, cancelAtPeriodEnd: boolean) {
    let result: Awaited<ReturnType<DodoPayments["subscriptions"]["update"]>>;
    try {
      result = await getDodoClient().subscriptions.update(providerSubId, {
        cancel_at_next_billing_date: cancelAtPeriodEnd,
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        502,
        "The billing provider did not confirm the change, so nothing was changed. Try again.",
        { reason: error instanceof Error ? error.message : "provider unavailable" },
      );
    }

    return {
      cancelAtPeriodEnd: Boolean(result.cancel_at_next_billing_date),
      status: result.status,
      nextBillingDate: result.next_billing_date ? new Date(result.next_billing_date) : null,
    };
  }

  /**
   * What the provider reports for a subscription right now, as its raw status and the status it
   * maps to. Admin edits that end a subscription locally check this first (the provider charges
   * the card, so only its word can say a subscription has ended). Any failure is a 502.
   */
  static async getProviderSubscriptionState(providerSubId: string) {
    let result: Awaited<ReturnType<DodoPayments["subscriptions"]["retrieve"]>>;
    try {
      result = await getDodoClient().subscriptions.retrieve(providerSubId);
    } catch (error) {
      throw new ApiError(
        502,
        "The billing provider could not be asked about this subscription, so nothing was changed. Try again.",
        { reason: error instanceof Error ? error.message : "provider unavailable" },
      );
    }

    return { rawStatus: result.status, status: statusFromDodo(result.status)?.status ?? null };
  }

  static async createCreditPackCheckout(
    userId: string,
    packKey: CreditPackKey,
    redirectUrl?: string,
  ) {
    const pack = creditPackCatalog[packKey];
    const productId = pack.providerProductId();
    if (!productId) throw new ApiError(503, "Extra credit checkout is not configured.");
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (!user) throw new ApiError(404, "User not found.");

    const appendCallback = (base: string) => {
      const url = new URL(base);
      if (redirectUrl) url.searchParams.set("callbackURL", redirectUrl);
      return url.toString();
    };
    const checkout = await getDodoCheckoutClient().checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: { email: user.email, name: user.name || "VeriWorkly User" },
      metadata: { veriworkly_user_id: userId, veriworkly_product: packKey },
      return_url: appendCallback(config.dodo.checkoutReturnUrl),
      cancel_url: appendCallback(config.dodo.checkoutCancelUrl),
    });
    if (!checkout.checkout_url)
      throw new ApiError(502, "Billing provider did not return a checkout URL.");
    return { url: checkout.checkout_url };
  }

  /**
   * An unsigned webhook mints credits and entitlements for whoever posts it, so the signature is
   * required in every environment. The only exception is an explicit local opt-in: the process
   * must run with `ALLOW_UNSIGNED_WEBHOOKS=1`, outside production, and the request must come
   * from the loopback interface. `NODE_ENV=development` alone (compose's old default) is not
   * enough.
   */
  static allowsUnsignedWebhook(remoteAddress: string | undefined): boolean {
    if (process.env.ALLOW_UNSIGNED_WEBHOOKS !== "1") return false;
    if (isProduction) return false;

    const address = (remoteAddress ?? "").replace(/^::ffff:/i, "");
    return address === "::1" || address.startsWith("127.");
  }

  static unwrapWebhook(body: string, headers: Record<string, string>, remoteAddress?: string) {
    if (!config.dodo.webhookSecret) {
      if (BillingService.allowsUnsignedWebhook(remoteAddress)) {
        try {
          return JSON.parse(body);
        } catch {
          throw new ApiError(400, "Invalid JSON body in unsigned-webhook bypass.");
        }
      }

      throw new ApiError(503, "Billing webhook secret is not configured.");
    }

    try {
      return getDodoClient().webhooks.unwrap(body, { headers, key: config.dodo.webhookSecret });
    } catch (error) {
      // A missing, stale or wrong signature is the caller's problem (a forged or replayed
      // delivery), not a server fault: 400, logged at warn, and no 500 in the audit log.
      if (error instanceof ApiError) throw error;
      throw new ApiError(400, "Invalid webhook signature.", {
        reason: error instanceof Error ? error.message : "verification failed",
      });
    }
  }

  static async processWebhook(
    providerEventId: string,
    event: ReturnType<typeof BillingService.unwrapWebhook>,
  ) {
    const parsedEvent = dodoWebhookEventSchema.parse(event);

    // Token lock, renewed while the attempt runs and released by compare-and-delete (V-127):
    // an attempt that outlives the TTL keeps its lock, and never deletes a retry's.
    const lock = await acquireJobLock(`billing:webhook:lock:${providerEventId}`, {
      ttlMs: WEBHOOK_LOCK_TTL_SECONDS * 1000,
    });

    if (!lock) {
      // A concurrent delivery of the same event is already processing it (webhook retry racing
      // the original, or the provider double-sending). Wait for it to finish rather than racing
      // applySubscriptionEvent/applyPaymentEvent in parallel.
      for (let attempt = 0; attempt < WEBHOOK_LOCK_WAIT_ATTEMPTS; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, WEBHOOK_LOCK_WAIT_MS));

        const existing = await prisma.billingWebhookEvent.findUnique({
          where: { providerEventId },
        });
        if (existing?.status === "PROCESSED") return { duplicate: true };
      }

      throw new ApiError(503, WEBHOOK_IN_FLIGHT_MESSAGE);
    }

    try {
      let stored;

      try {
        stored = await prisma.billingWebhookEvent.create({
          data: {
            providerEventId,
            type: parsedEvent.type,
            payload: parsedEvent as unknown as Prisma.InputJsonValue,
            providerPaymentId: eventPaymentId(parsedEvent),
            ...(await summarizeStoredEvent(parsedEvent)),
            status: "PROCESSING",
            lastAttemptAt: new Date(),
          },
        });
      } catch (error) {
        if (
          error instanceof Error &&
          ((error as { code?: unknown }).code === "P2002" ||
            error.constructor.name === "PrismaClientKnownRequestError")
        ) {
          const existing = await prisma.billingWebhookEvent.findUnique({
            where: { providerEventId },
          });

          if (!existing) throw error;

          if (existing.status === "PROCESSED") return { duplicate: true };

          // The Redis lock was free but the row says an attempt is still running: Redis lost
          // the lock (restart, flush) or the attempt crashed moments ago. Either way, running
          // a second attempt alongside it is the race the lock exists to prevent; tell the
          // provider to retry after the lock budget has passed.
          if (
            existing.status === "PROCESSING" &&
            existing.lastAttemptAt &&
            Date.now() - existing.lastAttemptAt.getTime() < WEBHOOK_LOCK_TTL_SECONDS * 1000
          )
            throw new ApiError(503, WEBHOOK_IN_FLIGHT_MESSAGE);

          stored = await prisma.billingWebhookEvent.update({
            where: { id: existing.id },
            data: {
              status: "PROCESSING",
              retryCount: { increment: 1 },
              lastAttemptAt: new Date(),
            },
          });
        } else {
          throw error;
        }
      }

      try {
        let attributedUserId: string | null = null;
        let note: string | null = null;
        if (parsedEvent.type.startsWith("subscription.")) {
          const subscriptionData = dodoSubscriptionSchema.parse(parsedEvent.data);
          const userId = await this.applySubscriptionEvent(
            subscriptionData,
            new Date(parsedEvent.timestamp),
            parsedEvent.type,
          );
          await prisma.billingWebhookEvent.update({
            where: { id: stored.id },
            data: { userId },
          });
          attributedUserId = userId;
        }
        if (parsedEvent.type === "payment.succeeded") {
          const payment = dodoPaymentSchema.parse(parsedEvent.data);
          const userId = await this.applyPaymentEvent(payment, new Date(parsedEvent.timestamp));
          await prisma.billingWebhookEvent.update({ where: { id: stored.id }, data: { userId } });
          attributedUserId = userId;
          // Applied to nobody: the account is gone, but the money was taken.
          if (!userId) note = refundNeededNote(payment);
        }
        if (parsedEvent.type === "refund.succeeded") {
          const refund = refundEventSchema.parse(parsedEvent.data);
          const reversed = await this.applyPaymentReversal(refund.payment_id, {
            cause: "refund",
            isPartial: refund.is_partial ?? null,
            amount: refund.amount ?? null,
            currency: refund.currency ?? null,
            eventId: stored.id,
          });
          const userId = reversed.userId;
          note = reversed.note;
          if (userId)
            await prisma.billingWebhookEvent.update({ where: { id: stored.id }, data: { userId } });
          attributedUserId = userId;
        }
        if (parsedEvent.type.startsWith("dispute.")) {
          const dispute = disputeEventSchema.parse(parsedEvent.data);
          // Every dispute event belongs to the customer whose payment it is about (admin search,
          // history); only a lost one takes anything back.
          const reversed = LOST_DISPUTE_EVENTS.has(parsedEvent.type)
            ? await this.applyPaymentReversal(dispute.payment_id, {
                cause: "dispute",
                isPartial: null,
                amount: dispute.amount,
                currency: dispute.currency ?? null,
                eventId: stored.id,
              })
            : { userId: await this.paymentOwner(dispute.payment_id), note: null };
          const userId = reversed.userId;
          note = reversed.note;
          if (userId)
            await prisma.billingWebhookEvent.update({ where: { id: stored.id }, data: { userId } });
          attributedUserId = userId;
        }
        if (parsedEvent.type === "payment.failed") {
          const payment = dodoPaymentSchema.parse(parsedEvent.data);
          const userId = await this.applyPaymentFailed(payment, new Date(parsedEvent.timestamp));
          await prisma.billingWebhookEvent.update({ where: { id: stored.id }, data: { userId } });
          attributedUserId = userId;
        }

        // Decision 5: an event for a deleted account is kept without the personal data in it.
        if (!attributedUserId) await redactIfForDeletedAccount(stored.id, parsedEvent.data);

        // The note rides on the event's `error` field, which the admin webhook list shows and
        // searches: a processed event with a note is one a human still has to act on.
        await prisma.billingWebhookEvent.update({
          where: { id: stored.id },
          data: { status: "PROCESSED", processedAt: new Date(), ...(note ? { error: note } : {}) },
        });
        // History lists PROCESSED rows only: one cached before this line would miss the event.
        if (attributedUserId) await cacheDel(billingHistoryCacheKey(attributedUserId));

        return { duplicate: false };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const updatedEvent = await prisma.billingWebhookEvent.update({
          where: { id: stored.id },
          data: { status: "FAILED", error: errorMessage },
        });

        if (updatedEvent.retryCount >= 5) {
          logger.error(
            `CRITICAL: Webhook event ${providerEventId} exceeded max retries. Dead-letter alert!`,
            {
              providerEventId,
              error: errorMessage,
              retryCount: updatedEvent.retryCount,
            },
          );
        }

        throw error;
      }
    } finally {
      await lock.release();
    }
  }

  /** Post-commit work, safe to repeat: every call here is an invalidation, not a mutation. */
  private static async invalidateAfterBillingChange(userId: string) {
    // Grants first: the free-tier move below reads them through the entitlement cache.
    await EntitlementService.invalidateEntitlements(userId);
    await this.settleLapsedPortfolio(userId);

    const publication = await prisma.portfolioPublication.findUnique({
      where: { userId },
      select: { subdomain: true },
    });

    if (publication) {
      await invalidatePublicPortfolioCaches([publication.subdomain]);
      void revalidatePublicPortfolios([publication.subdomain]);
    }

    await cacheDel(userProfileCacheKey(userId));
    await Promise.all([
      cacheDel(billingSummaryCacheKey(userId)),
      cacheDel(billingHistoryCacheKey(userId)),
      // Every grant write in this file and in reconcileAccess's callers ends here (V-108).
      // Bumped again: a reader between the first bump and the writes above may have re-cached.
      EntitlementService.invalidateEntitlements(userId),
    ]);
  }

  /**
   * Decision 6: a premium portfolio this change lapsed (billing suspended it, or its grace is
   * over) moves to its free template now rather than sitting offline until the hourly
   * `portfolioAccessJob`. Moderation and the user's own unpublish are never touched (see
   * `PortfolioService.settleLapsedPortfolioFor`). Never throws: the billing change is committed,
   * and the job settles the row on its next run if this fails.
   */
  private static async settleLapsedPortfolio(userId: string) {
    try {
      // Imported here: portfolioService imports this module at load time.
      const { PortfolioService } = await import("#services/portfolioService");
      await PortfolioService.settleLapsedPortfolioFor(userId);
    } catch (error) {
      logger.warn("Could not move a lapsed portfolio to the free tier; the job will retry", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private static async applySubscriptionEvent(
    subscription: z.infer<typeof dodoSubscriptionSchema>,
    eventTime: Date,
    eventType = "subscription.updated",
  ) {
    const existing = await prisma.subscription.findUnique({
      where: { providerSubId: subscription.subscription_id },
    });

    const userId = subscription.metadata.veriworkly_user_id || existing?.userId;

    if (await isDeletedAccount(userId, existing, { subscriptionId: subscription.subscription_id }))
      return null;
    if (!userId) {
      logger.error("Subscription webhook is missing VeriWorkly user metadata", {
        subscriptionId: subscription.subscription_id,
      });
      throw new ApiError(400, "Subscription webhook is missing VeriWorkly user metadata.");
    }
    if (
      existing?.userId &&
      subscription.metadata.veriworkly_user_id &&
      existing.userId !== subscription.metadata.veriworkly_user_id
    )
      throw new ApiError(400, "Subscription webhook user metadata does not match its owner.");

    // An event older than what the row reflects must not move it backwards. An event with the
    // same timestamp is either a distinct event that also has to apply or a retry of the one
    // that last touched the row after a post-commit failure; the writes below are idempotent,
    // so both cases re-run. A stale event still gets the cache invalidation after this block.
    const staleEvent = Boolean(existing?.lastWebhookAt && existing.lastWebhookAt > eventTime);

    const isNewSubscription = !existing;
    const previousStatus = existing?.status ?? null;

    const mapped = statusFromDodo(subscription.status);
    if (!mapped) {
      logger.error("Subscription webhook carries a provider status the table does not know", {
        subscriptionId: subscription.subscription_id,
        status: subscription.status,
      });
      throw new ApiError(400, `Unknown subscription status "${subscription.status}".`);
    }
    const normalizedStatus = mapped.status;

    const product = resolveCatalogProduct(subscription.product_id, subscription.metadata);
    if (!product) {
      logger.error("Subscription webhook references an unknown product", {
        subscriptionId: subscription.subscription_id,
        productId: subscription.product_id,
        metadata: subscription.metadata,
      });
      throw new ApiError(400, "Subscription webhook references an unknown product.");
    }
    const { productKey, interval: rawInterval } = product;
    const interval = toBillingInterval(rawInterval);

    // The grace window opens once per dunning spell (V-214): a later `on_hold`/`past_due` event
    // (Dodo redelivers `subscription.updated` while it retries the card) keeps the cutoff the
    // payment-failed email already named instead of moving it.
    const graceEndsAt = mapped.grace
      ? existing?.graceEndsAt && existing.graceEndsAt > eventTime
        ? existing.graceEndsAt
        : addDays(eventTime, config.portfolio.graceDays)
      : null;
    // Without a `next_billing_date` only an ACTIVE subscription earns a fresh period from the
    // event; a cancellation, expiry or failure keeps the period the row already holds (or ends
    // now), so no event can hand out access that was never paid for.
    const currentPeriodEnd = subscription.next_billing_date
      ? new Date(subscription.next_billing_date)
      : normalizedStatus === "ACTIVE"
        ? addCatalogInterval(eventTime, rawInterval)
        : (existing?.currentPeriodEnd ?? eventTime);
    // `pending` is unpaid: it grants nothing and must not revoke a period already paid for.
    const touchesGrants = subscription.status !== "pending";

    if (!staleEvent) {
      await prisma.$transaction(async (tx) => {
        await lockUserForBilling(tx, userId);

        const updateResult = await tx.subscription.updateMany({
          where: {
            providerSubId: subscription.subscription_id,
            OR: [{ lastWebhookAt: null }, { lastWebhookAt: { lte: eventTime } }],
          },
          data: {
            providerCustomerId: subscription.customer.customer_id,
            providerPriceId: subscription.product_id,
            productKey,
            interval,
            rawStatus: subscription.status,
            status: normalizedStatus,
            currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancel_at_next_billing_date,
            graceEndsAt,
            lastWebhookAt: eventTime,
          },
        });

        if (updateResult.count === 0) {
          const currentSub = await tx.subscription.findUnique({
            where: { providerSubId: subscription.subscription_id },
            select: { id: true, lastWebhookAt: true },
          });

          if (currentSub) return;

          await tx.subscription.create({
            data: {
              userId,
              provider: "dodo",
              providerCustomerId: subscription.customer.customer_id,
              providerPriceId: subscription.product_id,
              providerSubId: subscription.subscription_id,
              productKey,
              interval,
              rawStatus: subscription.status,
              status: normalizedStatus,
              currentPeriodEnd,
              cancelAtPeriodEnd: subscription.cancel_at_next_billing_date,
              graceEndsAt,
              lastWebhookAt: eventTime,
            },
          });
        }

        // The checkout record (one per user, V-218) is the only thing standing between a
        // customer and a second subscription; if it ever failed, this is the alarm. Any second
        // live subscription is one too many, whatever its product: the same product twice is a
        // double charge, the bundle already holds both, and AI Credits plus Creator Pro is the
        // bundle at a higher price (V-176). Not a reason to fail the event: the customer paid,
        // and the fix is a refund or a plan change by hand.
        if (normalizedStatus === "ACTIVE") {
          const others = await tx.subscription.findMany({
            where: {
              userId,
              providerSubId: { not: subscription.subscription_id },
              OR: [
                {
                  status: "ACTIVE",
                  OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: new Date() } }],
                },
                { status: "PAST_DUE" },
              ],
            },
            select: { providerSubId: true, productKey: true, status: true },
          });
          if (others.length > 0)
            logger.error(
              `CRITICAL: user ${userId} holds more than one live subscription (${[productKey, ...others.map((other) => other.productKey)].join(", ")}); refund or merge the duplicate.`,
              { userId, productKey, subscriptionId: subscription.subscription_id, others },
            );
        }

        const access = accessStatus({ status: normalizedStatus, currentPeriodEnd, graceEndsAt });

        if (touchesGrants)
          await syncSubscriptionGrants(tx, {
            userId,
            sourceId: subscription.subscription_id,
            productKey,
            status: normalizedStatus,
            currentPeriodEnd,
            graceEndsAt,
            at: eventTime,
          });

        // Free templates publish with no publish grant at all, so only an event about a plan
        // that carries `portfolio_publish` may move the publication to GRACE/SUSPENDED, and
        // never an unpaid `pending` one. Everything else leaves it alone (it still becomes
        // LIVE when any publish grant is in effect).
        const governsPublication =
          touchesGrants &&
          productCatalog[productKey].entitlements.includes(ENTITLEMENT_KEYS.PORTFOLIO_PUBLISH);
        await reconcilePortfolioPublication(
          tx,
          userId,
          eventTime,
          governsPublication
            ? {
                publicationStatus: access.publicationStatus === "GRACE" ? "GRACE" : "SUSPENDED",
                suspensionReason: normalizedStatus,
              }
            : null,
        );
      }, BILLING_TRANSACTION_OPTIONS);
    }

    // A plan change (V-202): the transaction above already moved the row and re-synced the grants
    // (the new plan's entitlements, revoking only what it does not include); the credits the new
    // plan carries follow here, and the change is no longer pending.
    const planChanged =
      eventType === "subscription.plan_changed" ||
      Boolean(existing && existing.productKey !== productKey);
    if (planChanged) await this.clearPendingPlanChange(subscription.subscription_id);
    if (!staleEvent && planChanged && normalizedStatus === "ACTIVE")
      await this.applyPlanChangeCredits({
        userId,
        providerSubId: subscription.subscription_id,
        productKey,
        interval: rawInterval,
        periodStart: subscription.previous_billing_date
          ? new Date(subscription.previous_billing_date)
          : rawInterval === "annual"
            ? addYears(currentPeriodEnd, -1)
            : addMonths(currentPeriodEnd, -1),
        periodEnd: currentPeriodEnd,
      });

    // Any outcome settles the open checkout; `pending` is not one yet (the first charge or the
    // mandate is still in flight), and the record must keep a second session closed meanwhile.
    if (subscription.status !== "pending")
      await this.settleCheckoutRecord(userId, productKey, { createdAt: subscription.created_at });
    await this.invalidateAfterBillingChange(userId);

    if (staleEvent) return userId;

    // A purchase is a subscription that becomes ACTIVE for the first time: new, or out of
    // `pending` (V-177). Renewals and recoveries from dunning are not purchases. The claim row
    // keys it on the subscription, so a redelivered activation mails once.
    if (normalizedStatus === "ACTIVE" && (isNewSubscription || previousStatus === "INACTIVE")) {
      const amountFromProvider = subscription.recurring_pre_tax_amount ?? null;
      const allowance = productCatalog[productKey].creditAllowance?.[rawInterval] ?? 0;
      void notifyOnce("purchase_subscription", subscription.subscription_id, userId, {
        template: "purchase_confirmation",
        details: {
          kind: "subscription",
          productName: purchaseName(productKey, rawInterval),
          amountCents: amountFromProvider ?? productCatalog[productKey].prices[rawInterval] ?? null,
          currency: (amountFromProvider !== null && subscription.currency) || "USD",
          amountExcludesTax: amountFromProvider === null || !subscription.tax_inclusive,
          accessEndsAt: currentPeriodEnd,
          renewsAt: subscription.cancel_at_next_billing_date ? null : currentPeriodEnd,
          billingPeriod: rawInterval === "annual" ? "year" : "month",
          credits: null,
          creditsNote:
            allowance <= 0
              ? null
              : (productCatalog[productKey].creditNotes?.[rawInterval] ??
                `${allowance.toLocaleString("en-US")} credits each month. Unused credits expire at the end of the month; nothing rolls over.`),
        },
      });
    } else if (
      // A cancellation scheduled for the end of the period (V-212): Dodo's portal sends it as an
      // `active` subscription with `cancel_at_next_billing_date` turning true (the exact event
      // sequence is unverified, so the flag's false-to-true change is what counts, whichever
      // event carries it).
      (normalizedStatus === "ACTIVE" &&
        subscription.cancel_at_next_billing_date &&
        existing !== null &&
        !existing.cancelAtPeriodEnd) ||
      // Cancelled outright with paid time left. A natural `expired` (end of a period or of a
      // pass) is not a cancellation, and without a future period end there is nothing to promise.
      (previousStatus &&
        previousStatus !== "CANCELED" &&
        normalizedStatus === "CANCELED" &&
        subscription.status !== "expired" &&
        currentPeriodEnd > new Date())
    ) {
      void this.notifyCancellation(
        userId,
        subscription.subscription_id,
        productKey,
        currentPeriodEnd,
      );
    }

    // A plan change that took effect (V-219), confirmed once per subscription, plan and period.
    if (
      planChanged &&
      normalizedStatus === "ACTIVE" &&
      existing &&
      existing.productKey !== productKey &&
      isProductKey(existing.productKey)
    ) {
      const amountFromProvider = subscription.recurring_pre_tax_amount ?? null;
      void notifyOnce(
        "plan_changed",
        `${subscription.subscription_id}:${productKey}:${rawInterval}:${currentPeriodEnd.toISOString().slice(0, 10)}`,
        userId,
        {
          template: "plan_changed",
          details: {
            fromProductName: purchaseName(
              existing.productKey,
              fromBillingInterval(existing.interval),
            ),
            productName: purchaseName(productKey, rawInterval),
            amountCents:
              amountFromProvider ?? productCatalog[productKey].prices[rawInterval] ?? null,
            currency: (amountFromProvider !== null && subscription.currency) || "USD",
            amountExcludesTax: amountFromProvider === null || !subscription.tax_inclusive,
            billingPeriod: rawInterval === "annual" ? "year" : "month",
            renewsAt: subscription.cancel_at_next_billing_date ? null : currentPeriodEnd,
          },
        },
      );
    }

    return userId;
  }

  /**
   * The cancellation confirmation (V-212): once per subscription and period end, whichever path
   * cancelled it (a portal cancel at period end, an outright cancellation, an admin's cancel at the
   * provider), with the product and the last day of access. Never throws.
   */
  static async notifyCancellation(
    userId: string,
    providerSubId: string,
    productKey: string,
    accessEndsAt: Date | null,
  ) {
    await notifyOnce(
      "subscription_cancel_scheduled",
      `${providerSubId}:${accessEndsAt ? accessEndsAt.toISOString().slice(0, 10) : "none"}`,
      userId,
      {
        template: "subscription_cancelled",
        subscriptionId: providerSubId,
        details: {
          productName: isProductKey(productKey) ? PRODUCT_NAMES[productKey] : "VeriWorkly",
          accessEndsAt: accessEndsAt && accessEndsAt > new Date() ? accessEndsAt : null,
        },
      },
    );
  }

  private static async applyPaymentEvent(payment: z.infer<typeof dodoPaymentSchema>, paidAt: Date) {
    const subscription = payment.subscription_id
      ? await prisma.subscription.findUnique({
          where: { providerSubId: payment.subscription_id },
          select: { userId: true, productKey: true, interval: true, currentPeriodEnd: true },
        })
      : null;
    const userId = payment.metadata.veriworkly_user_id || subscription?.userId;
    if (await isDeletedAccount(userId, subscription, { paymentId: payment.payment_id }))
      return null;
    if (!userId) {
      logger.error("Payment webhook cannot be attributed to a user", {
        paymentId: payment.payment_id,
        subscriptionId: payment.subscription_id ?? null,
      });
      throw new ApiError(400, "Payment webhook is missing VeriWorkly user metadata.");
    }

    // The billing portal needs a Dodo customer; a pass or pack buyer has no subscription row to
    // carry one (V-175). The latest payment's customer wins.
    const customerId = payment.customer?.customer_id;
    if (customerId)
      await prisma.user.updateMany({
        where: {
          id: userId,
          OR: [{ billingCustomerId: null }, { billingCustomerId: { not: customerId } }],
        },
        data: { billingCustomerId: customerId },
      });

    // The account settles in USD; customers may still pay in INR by UPI and adaptive pricing can
    // settle elsewhere. Grants are per product, never per currency, so a non-USD settlement is
    // noted for the operator and processed like any other.
    const settlementCurrency = payment.settlement_currency.toUpperCase();
    if (settlementCurrency !== "USD")
      logger.warn(
        `Payment ${payment.payment_id} for user ${userId} settled in ${settlementCurrency}, not USD; grants proceed per product.`,
        {
          paymentId: payment.payment_id,
          settlementCurrency,
          settlementAmount: payment.settlement_amount,
          currency: payment.currency ?? null,
        },
      );

    // A card-update charge is a zero-amount `payment.succeeded`; so is a fully discounted one.
    // Neither earns a renewal allowance.
    const earnsAllowance = !payment.is_update_payment_method && payment.total_amount !== 0;

    // A paid charge on a running subscription ends any grace date a failure left on it, so a later
    // failure starts its own window. A row in dunning keeps its grace until its own event moves it
    // back to ACTIVE (which clears it), so a portfolio is never suspended in between.
    if (payment.subscription_id && earnsAllowance)
      await prisma.subscription.updateMany({
        where: {
          providerSubId: payment.subscription_id,
          status: "ACTIVE",
          graceEndsAt: { not: null },
        },
        data: { graceEndsAt: null },
      });

    const purchasedProduct = payment.metadata.veriworkly_product;
    if (purchasedProduct && isCreditPackKey(purchasedProduct)) {
      const pack = creditPackCatalog[purchasedProduct];
      const expiresAt = addDays(paidAt, pack.expiresInDays);
      await CreditService.grant(userId, pack.credits, {
        requestId: `payment-credit:${payment.payment_id}`,
        source: CREDIT_SOURCES.creditPack,
        sourceId: payment.payment_id,
        expiresAt,
        reason: pack.name,
      });
      void notifyOnce("purchase_payment", payment.payment_id, userId, {
        template: "purchase_confirmation",
        details: {
          ...oneTimePurchase(payment),
          kind: "credit_pack",
          productName: pack.name,
          accessEndsAt: expiresAt,
          credits: pack.credits,
        },
      });
    } else {
      // The stored row already follows the provider's product id (plan changes included); a
      // payment that lands before its subscription row exists resolves from the payload. Only
      // `product_cart[0]` is read: every checkout the API creates is a single-item cart.
      const product =
        subscription && isProductKey(subscription.productKey)
          ? {
              productKey: subscription.productKey,
              interval: fromBillingInterval(subscription.interval),
            }
          : resolveCatalogProduct(
              payment.product_cart?.[0]?.product_id ?? payment.product_id,
              payment.metadata,
            );
      if (!product) {
        logger.error("Payment webhook references an unknown product", {
          paymentId: payment.payment_id,
          subscriptionId: payment.subscription_id ?? null,
          productId: payment.product_cart?.[0]?.product_id ?? payment.product_id ?? null,
          metadata: payment.metadata,
        });
        throw new ApiError(400, "Payment webhook references an unknown product.");
      }
      const { productKey, interval } = product;
      // A subscription payment that names no checkout session is a renewal; the subscription's
      // own events settle its checkout.
      if (payment.checkout_session_id || !payment.subscription_id)
        await this.settleCheckoutRecord(userId, productKey, {
          checkoutSessionId: payment.checkout_session_id,
          createdAt: payment.created_at,
        });

      // The allowance lives at least one catalog interval from the payment. The stored period
      // end is only trusted when it is further out: `payment.succeeded` and
      // `subscription.renewed` have no ordering guarantee, and after dunning recovery the row
      // still holds the period that just ended, so a grant keyed on it would expire at once.
      const intervalEnd = addCatalogInterval(paidAt, interval);
      const periodEndGuess =
        subscription?.currentPeriodEnd && subscription.currentPeriodEnd > intervalEnd
          ? subscription.currentPeriodEnd
          : intervalEnd;

      // A bundle pass is a one-time product: no `subscription.*` event ever follows, so its
      // entitlements are granted here, for the pass window, keyed on the payment id. A pass with
      // a zero total (a 100 % coupon) still grants the entitlements but, by design, no credit
      // allowance (see `earnsAllowance`).
      const isPass =
        !payment.subscription_id &&
        productKey === "bundle" &&
        (interval === "one_day" || interval === "seven_day");

      // When the pass's access ends. A pass bought while another one still runs extends it
      // (V-220): its days start where the running pass ends, so none are paid for twice.
      let passEnd: Date | null = null;
      if (isPass) {
        passEnd = await prisma.$transaction(async (tx) => {
          await lockUserForBilling(tx, userId);

          // Already applied (a redelivery, or a retry after a failure): its window stands, and a
          // grant a refund revoked stays revoked.
          const own = await tx.entitlementGrant.findMany({
            where: { userId, source: "SYSTEM", sourceId: payment.payment_id },
            select: { endsAt: true },
          });
          if (own.length > 0) {
            const ends = own.flatMap((grant) => (grant.endsAt ? [grant.endsAt.getTime()] : []));
            return ends.length > 0 ? new Date(Math.max(...ends)) : intervalEnd;
          }

          const running = await tx.entitlementGrant.findFirst({
            where: {
              userId,
              source: "SYSTEM",
              revokedAt: null,
              endsAt: { gt: paidAt },
              metadata: { path: ["pass"], equals: true },
            },
            orderBy: { endsAt: "desc" },
            select: { endsAt: true },
          });
          const end =
            running?.endsAt && running.endsAt > paidAt
              ? addCatalogInterval(running.endsAt, interval)
              : intervalEnd;

          for (const key of productCatalog.bundle.entitlements)
            await tx.entitlementGrant.create({
              data: {
                userId,
                key,
                source: "SYSTEM",
                sourceId: payment.payment_id,
                startsAt: paidAt,
                endsAt: end,
                metadata: { productKey, interval, pass: true },
              },
            });

          await reconcilePortfolioPublication(tx, userId, paidAt, null);
          return end;
        }, BILLING_TRANSACTION_OPTIONS);
      }

      const allowance =
        productKey === "ai_credits" || productKey === "bundle"
          ? (productCatalog[productKey].creditAllowance?.[interval] ?? 0)
          : 0;

      // The service period this payment pays for, when the payload names one. A subscription
      // payment whose `service_periods` has no entry for its subscription bills usage only and
      // does not extend the period (SDK), so it earns no allowance either.
      const servicePeriod = payment.subscription_id
        ? payment.service_periods?.find(
            (period) => period.subscription_id === payment.subscription_id,
          )
        : undefined;
      const usageOnlyRenewal = Boolean(
        payment.subscription_id && payment.service_periods && !servicePeriod,
      );

      if (allowance > 0 && !earnsAllowance) {
        logger.info("Skipping credit allowance for a zero-amount or card-update payment", {
          paymentId: payment.payment_id,
          subscriptionId: payment.subscription_id ?? null,
          isUpdatePaymentMethod: payment.is_update_payment_method,
          totalAmount: payment.total_amount ?? null,
        });
      } else if (allowance > 0 && usageOnlyRenewal) {
        logger.info("Skipping credit allowance for a usage-only subscription payment", {
          paymentId: payment.payment_id,
          subscriptionId: payment.subscription_id,
        });
      } else if (allowance > 0 && payment.subscription_id && isPlanChangePayment(payment)) {
        // The prorated charge for a plan change (V-202), requested here or in the customer portal:
        // the plan-change event grants what the new plan carries for this period
        // (`applyPlanChangeCredits`), whichever of the two arrives first. Granting here as well
        // would pay the month twice, or reset a month already partly spent.
        logger.info("Plan-change payment: credits follow the plan change", {
          paymentId: payment.payment_id,
          subscriptionId: payment.subscription_id,
        });
      } else if (allowance > 0 && interval === "annual" && payment.subscription_id) {
        // Annual plans deliver 1,000 a month, not the year's allowance up front (owner
        // decision 4): the payment opens the schedule for the period it pays for and grants
        // month one now; `jobs/annualCreditJob` grants the rest as each month starts.
        const schedule = await openAnnualCreditSchedule({
          userId,
          providerSubId: payment.subscription_id,
          productKey,
          paymentId: payment.payment_id,
          periodStart: servicePeriod ? new Date(servicePeriod.starts_at) : paidAt,
          periodEnd: servicePeriod ? new Date(servicePeriod.ends_at) : periodEndGuess,
          servicePeriodKnown: Boolean(servicePeriod),
        });
        // Month one arrives with the payment, or with its period when that starts within a day
        // (a renewal charged just ahead of it); a period further out is the job's to start.
        // No schedule: a legacy up-front year still covers this period.
        if (schedule) {
          const now = new Date();
          const startsSoon =
            schedule.periodStart > now && schedule.periodStart.getTime() - now.getTime() <= DAY_MS;
          await grantDueMonths(schedule.id, startsSoon ? schedule.periodStart : now);
        }
      } else if (allowance > 0) {
        // One allowance per credit month, and nothing rolls over: the grant expires when the
        // month it pays for ends (the service period's end when the payload names one), and it
        // replaces whatever is left of the subscription's earlier credits. When the payload names
        // the service period, the grant is keyed on it so a second successful charge in the same
        // period cannot mint a second allowance. The request id stays per payment, so a retry of
        // this event returns the grant it already made. Without a service period the payment id
        // is the only stable key (the stored period end moves with webhook order and would
        // collide across renewals); a pass has no subscription to key on.
        const sourceId = servicePeriod
          ? `${payment.subscription_id}:${servicePeriod.starts_at}`
          : payment.subscription_id
            ? `${payment.subscription_id}:payment:${payment.payment_id}`
            : payment.payment_id;
        const creditMonthStart = servicePeriod ? new Date(servicePeriod.starts_at) : paidAt;
        // Accepted, customer-favourable: grants have no start date, so a renewal charged before
        // its month starts is spendable at once, and until that start (the cut below never moves
        // earlier than it) last month's remainder is spendable too. For that short overlap two
        // months' credits can be spent; from the new month's start only the new 1,000 is left.

        try {
          await CreditService.grant(userId, allowance, {
            requestId: `subscription-credit:${payment.payment_id}`,
            source: CREDIT_SOURCES.subscriptionPayment,
            sourceId,
            // A pass's credits last as long as the access it bought (V-220).
            expiresAt: servicePeriod
              ? new Date(servicePeriod.ends_at)
              : (passEnd ?? periodEndGuess),
            reason: `${productCatalog[productKey].name} credit allowance`,
            ...(payment.subscription_id
              ? {
                  supersedes: {
                    where: await subscriptionCreditGrantsWhere(payment.subscription_id),
                    at: creditMonthStart,
                  },
                }
              : {}),
          });
        } catch (error) {
          if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"))
            throw error;
          logger.warn("Credit allowance for this service period was already granted", {
            paymentId: payment.payment_id,
            subscriptionId: payment.subscription_id,
            sourceId,
          });
        }
      }

      // Passes have no subscription event, so their confirmation hangs on the payment (V-177).
      if (isPass)
        void notifyOnce("purchase_payment", payment.payment_id, userId, {
          template: "purchase_confirmation",
          details: {
            ...oneTimePurchase(payment),
            kind: "pass",
            productName: PASS_NAMES[interval as "one_day" | "seven_day"],
            accessEndsAt: passEnd ?? intervalEnd,
            credits: earnsAllowance && allowance > 0 ? allowance : null,
          },
        });
    }

    await this.recordAffiliateCommission(userId, payment);
    await this.invalidateAfterBillingChange(userId);
    return userId;
  }

  /**
   * The live account a provider payment belongs to (V-205): the user its stored
   * `payment.succeeded` event was attributed to, else what the payment left behind (the annual
   * schedule it opened, the credits or the pass it granted). Null when the payment is unknown or
   * its account was deleted (those rows are detached, `userId` null).
   */
  private static async paymentOwner(paymentId: string) {
    const payment = await findPaymentEvent(paymentId);
    if (payment?.userId) return payment.userId;
    const [schedule, ledger, pass] = await Promise.all([
      prisma.subscriptionCreditSchedule.findFirst({
        where: { openedByPaymentId: paymentId },
        select: { userId: true },
      }),
      prisma.creditTransaction.findFirst({
        where: {
          requestId: { in: [`payment-credit:${paymentId}`, `subscription-credit:${paymentId}`] },
          userId: { not: null },
        },
        select: { userId: true },
      }),
      prisma.entitlementGrant.findFirst({
        where: { source: "SYSTEM", sourceId: paymentId, userId: { not: null } },
        select: { userId: true },
      }),
    ]);
    return schedule?.userId ?? ledger?.userId ?? pass?.userId ?? null;
  }

  /**
   * A refund or a lost dispute (V-205, V-216). Every one is attributed to the customer whose payment
   * it reverses, so it shows in their billing history. A full reversal takes back what that
   * payment bought:
   *
   * - the credits it granted (a pack, a pass or a month's allowance, found by the ledger request id
   *   keyed on the payment; an annual payment's monthly grants by its schedule), as far as they are
   *   unspent (`CreditService.clawBackGrant`);
   * - an annual payment's schedule, which stops: no further month is granted for a year paid back;
   * - a pass's entitlements, revoked, with the portfolio settled as any lapse is (decision 6);
   * - the affiliate commission on the payment (`reverseCommissionForPayment`).
   *
   * A subscription itself is left to the provider's subscription events: a refund does not cancel
   * it. A partial reversal (a goodwill credit, a proration) takes nothing back.
   *
   * Full or partial: full when the provider says `is_partial: false`, or when everything reversed
   * so far for the payment (refunds and lost disputes, each counted once, `reversedSoFar`) reaches
   * its stored `amountCents`, which outlives the payload redaction; so two partial refunds that add
   * up to the payment, or a partial refund and a lost dispute for the rest, reverse it in full. A lost dispute without a usable
   * amount is a full chargeback; a refund that cannot be classified is logged for a human and
   * treated as partial, so nothing is taken back on a guess.
   *
   * Safe to repeat: claw-backs are keyed per grant, revokes and reversals are conditional. Returns
   * the customer's id, or null when the payment belongs to no live account.
   */
  private static async applyPaymentReversal(
    paymentId: string,
    reversal: {
      cause: "refund" | "dispute";
      isPartial: boolean | null;
      amount: number | null;
      currency: string | null;
      /** The stored row of the event being applied: counted in the total even while PROCESSING. */
      eventId: string;
    },
  ) {
    const [payment, userId] = await Promise.all([
      findPaymentEvent(paymentId),
      this.paymentOwner(paymentId),
    ]);
    const paid = payment?.amountCents ?? null;
    const reversedTotal =
      paid === null
        ? 0
        : await reversedSoFar(paymentId, reversal.eventId, payment?.currency ?? null);

    let full: boolean;
    if (reversal.isPartial === false) full = true;
    // Everything reversed so far reaches the payment: two partial refunds that add up, or a
    // partial refund and a lost dispute for the rest.
    else if (paid !== null && reversedTotal > 0 && reversedTotal >= paid) full = true;
    else if (reversal.isPartial === true || (reversal.amount !== null && paid !== null))
      full = false;
    else if (reversal.cause === "dispute") full = true;
    else {
      full = false;
      logger.error(
        "Refund without is_partial could not be compared with its payment; nothing was taken back. Check it in the Dodo dashboard.",
        { paymentId, amount: reversal.amount, currency: reversal.currency },
      );
    }

    if (!full) {
      logger.info("Partial reversal of a payment; what it bought stays", {
        paymentId,
        cause: reversal.cause,
        amount: reversal.amount,
      });
      return { userId, note: null };
    }

    const schedule = await prisma.subscriptionCreditSchedule.findFirst({
      where: { openedByPaymentId: paymentId },
      select: { id: true, userId: true, providerSubId: true },
    });
    if (schedule) {
      const stopped = await prisma.subscriptionCreditSchedule.updateMany({
        where: { id: schedule.id, stoppedAt: null },
        data: { stoppedAt: new Date() },
      });
      if (stopped.count)
        logger.info("Annual credit schedule stopped: its payment was reversed", {
          scheduleId: schedule.id,
          providerSubId: schedule.providerSubId,
          paymentId,
          cause: reversal.cause,
        });
    }

    const reason = `${payment?.productName ?? "Purchase"} ${reversal.cause === "refund" ? "refunded" : "charged back"}`;
    if (userId) {
      const [ledgerGrants, scheduleGrants] = await Promise.all([
        prisma.creditTransaction.findMany({
          where: {
            userId,
            type: "GRANT",
            requestId: { in: [`payment-credit:${paymentId}`, `subscription-credit:${paymentId}`] },
          },
          select: { referenceId: true },
        }),
        schedule
          ? prisma.creditGrant.findMany({
              where: {
                userId,
                source: CREDIT_SOURCES.annualMonthly,
                sourceId: { startsWith: `${schedule.id}:` },
              },
              select: { id: true },
            })
          : Promise.resolve([]),
      ]);
      const grantIds = new Set([
        ...ledgerGrants.flatMap((row) => (row.referenceId ? [row.referenceId] : [])),
        ...scheduleGrants.map((grant) => grant.id),
      ]);
      for (const grantId of grantIds) await CreditService.clawBackGrant(userId, grantId, reason);

      const revoked = await prisma.$transaction(
        (tx) => revokeReversedPass(tx, userId, paymentId),
        BILLING_TRANSACTION_OPTIONS,
      );
      if (revoked.count) {
        logger.info("Pass revoked: its payment was reversed", { paymentId, userId });
        // The publication follows the grants left, and a lapsed premium site moves to a free
        // template (decision 6); `reconcileAccess` clears every billing cache as well.
        await this.reconcileAccess(userId);
        // A stacked pass's credits may have moved: the credit summary shows their expiry.
        await CreditService.invalidate(userId);
      } else await this.invalidateAfterBillingChange(userId);
    }

    const commission = await AffiliateService.reverseCommissionForPayment(paymentId, reason);
    const note =
      commission && commission.pendingShortfallCents > 0
        ? `Affiliate ledger: commission ${commission.id} was reversed, but the wallet held ${commission.pendingShortfallCents} cents less pending than it. Check the affiliate wallet.`
        : null;
    return { userId, note };
  }

  /**
   * A subscription charge failed: dunning has started (V-172). Nothing changes in access here
   * (the subscription's own `on_hold`/`past_due` event does that); the customer gets one email
   * per failed payment saying what failed and until when the plan is kept. A failed one-time
   * checkout is not mailed: the customer is still on the checkout page and sees it there.
   */
  private static async applyPaymentFailed(
    payment: z.infer<typeof dodoPaymentSchema>,
    failedAt: Date,
  ) {
    const subscription = payment.subscription_id
      ? await prisma.subscription.findUnique({
          where: { providerSubId: payment.subscription_id },
          select: {
            userId: true,
            productKey: true,
            graceEndsAt: true,
            status: true,
            lastWebhookAt: true,
          },
        })
      : null;
    const userId = payment.metadata.veriworkly_user_id || subscription?.userId;
    // Before anything is attributed: a deleted account's event is recorded as processed (and
    // redacted), never written against a user id that no longer exists.
    if (await isDeletedAccount(userId, subscription, { paymentId: payment.payment_id }))
      return null;
    if (!userId || !subscription) return userId ?? null;

    // A declined plan-change charge (V-202) leaves the subscription as it was (`prevent_change`, or
    // a portal change that never applied):
    // nothing is overdue, so no dunning mail; the customer may simply try the upgrade again.
    if (payment.subscription_id && isPlanChangePayment(payment)) {
      await this.clearPendingPlanChange(payment.subscription_id);
      return userId;
    }

    // A declined first charge is a failed checkout, not dunning (V-217): the customer is still on
    // the checkout page. Dodo's `charge_type: "new"` says so; without it, a subscription that was
    // never ACTIVE (still `pending`, or `failed`) says the same, whichever of the subscription
    // event and this one arrives first (their order is unverified).
    if (payment.charge_type === "new" || subscription.status === "INACTIVE") return userId;
    // Dunning only opens on a subscription that is still billing: a late failure for one that has
    // been cancelled, or one older than the subscription's latest event (a renewal that went
    // through after it), owes nothing and sets no grace date.
    if (subscription.status !== "ACTIVE" && subscription.status !== "PAST_DUE") return userId;
    if (subscription.lastWebhookAt && failedAt < subscription.lastWebhookAt) return userId;

    // The grace date the email names is the one the subscription row keeps: the row's own while it
    // runs, else the failure's time plus the grace days (the base the dunning event uses), stored
    // on the row so the `on_hold` event that follows keeps it (V-214) instead of computing its own.
    const now = new Date();
    let graceEndsAt =
      subscription.graceEndsAt && subscription.graceEndsAt > now
        ? subscription.graceEndsAt
        : addDays(failedAt, config.portfolio.graceDays);
    if (graceEndsAt !== subscription.graceEndsAt && payment.subscription_id) {
      await prisma.subscription.updateMany({
        where: {
          providerSubId: payment.subscription_id,
          OR: [{ graceEndsAt: null }, { graceEndsAt: { lte: now } }],
        },
        data: { graceEndsAt },
      });
      // A dunning event that landed first set the row's own: that one stands.
      const stored = await prisma.subscription.findUnique({
        where: { providerSubId: payment.subscription_id },
        select: { graceEndsAt: true },
      });
      if (stored?.graceEndsAt) graceEndsAt = stored.graceEndsAt;
    }
    const productName = isProductKey(subscription.productKey)
      ? PRODUCT_NAMES[subscription.productKey]
      : "VeriWorkly";

    void notifyOnce("payment_failed", payment.payment_id, userId, {
      template: "payment_failed",
      subscriptionId: payment.subscription_id ?? undefined,
      details: {
        productName,
        amountCents: payment.total_amount ?? null,
        currency: payment.currency ?? null,
        graceEndsAt,
        // Owner decision 9 (V-215): Pro pauses at once; only a portfolio keeps its grace.
        includesPortfolio:
          isProductKey(subscription.productKey) &&
          productCatalog[subscription.productKey].entitlements.includes(
            ENTITLEMENT_KEYS.PORTFOLIO_PUBLISH,
          ),
      },
    });
    return userId;
  }

  /**
   * The commission base is the settlement net of the tax collected: `settlement_tax` when Dodo
   * reports it, else `tax` when it is in the settlement currency, else the full settlement. A
   * commission that rounds below one cent is skipped, never a reason to fail the payment.
   */
  private static async recordAffiliateCommission(
    userId: string,
    payment: z.infer<typeof dodoPaymentSchema>,
  ) {
    const referral = await prisma.affiliateReferral.findUnique({
      where: { referredUserId: userId },
      select: { affiliate: { select: { affiliateTier: true, affiliateStatus: true } } },
    });
    if (!referral || referral.affiliate.affiliateStatus !== "ACTIVE") return;

    const settlementCurrency = payment.settlement_currency.toUpperCase();
    const taxCents =
      payment.settlement_tax ??
      (payment.currency && payment.currency.toUpperCase() === settlementCurrency
        ? (payment.tax ?? 0)
        : 0);
    const purchaseAmountCents = Math.max(0, payment.settlement_amount - taxCents);
    const rateBps = AFFILIATE_TIER_RATE_BPS[referral.affiliate.affiliateTier];
    const amountCents = Math.floor((purchaseAmountCents * rateBps) / 10_000);

    if (amountCents < 1) {
      logger.debug("Skipping sub-cent affiliate commission", {
        paymentId: payment.payment_id,
        purchaseAmountCents,
        rateBps,
      });
      return;
    }

    try {
      await AffiliateService.createCommission({
        referredUserId: userId,
        subscriptionId: payment.subscription_id ?? undefined,
        providerPaymentId: payment.payment_id,
        purchaseAmountCents,
        status: "PENDING",
        reason: "Dodo payment succeeded",
        currency: settlementCurrency,
      });
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) return;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return;
      throw error;
    }
  }
}
