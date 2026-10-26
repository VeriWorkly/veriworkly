import type { CatalogProduct, ProductKey } from "@/features/billing/types";
import { ApiRequestError } from "@/utils/fetchApiData";
import { formatCents } from "@/features/admin/utils/admin-format";

/** The server's product names (`productNames.ts`), for products named by key. */
export const PLAN_NAMES: Record<ProductKey, string> = {
  ai_credits: "AI Credits",
  portfolio_pro: "Creator Pro",
  bundle: "Job Hunter Bundle",
};

export const PAYMENTS_OPEN_SOON =
  "Payments open soon. Purchases are not available yet; nothing has been charged.";

/**
 * Payments are admin-only at launch: the API answers every purchase from anyone else with 403
 * (`assertPaymentsEnabled`). A signed-out buyer gets 401, so 403 on a purchase means only this.
 */
export function isPaymentsClosedError(error: unknown) {
  return error instanceof ApiRequestError && error.status === 403;
}

/**
 * The checkout lock: an earlier session for an overlapping product is still open. The server
 * sends it without a code and keeps this phrase stable for the studio (`CHECKOUT_ACTIVE_MESSAGE`).
 */
const CHECKOUT_LOCK_PHRASE = "A billing checkout is already active";

export type CheckoutFailure =
  | { kind: "payments-closed"; message: string }
  /** The customer already has what they asked for: nothing to buy. */
  | { kind: "already-have"; message: string }
  /** A paused or unpaid subscription: fixed in the billing portal, never by a second purchase. */
  | { kind: "manage-billing"; message: string }
  /** A live subscription overlaps the request; the message says how to switch. */
  | { kind: "overlap"; message: string; suggestedProductKey: ProductKey | null }
  | { kind: "checkout-locked"; message: string }
  | { kind: "other"; message: string };

/**
 * What a failed checkout means. The server names each overlap 409 by `details.code`
 * (`checkoutOverlap` in billingService); only the lock may be cancelled and retried, because
 * every other 409 answers the retry the same way.
 */
export function describeCheckoutError(error: unknown, fallbackMessage: string): CheckoutFailure {
  if (isPaymentsClosedError(error)) return { kind: "payments-closed", message: PAYMENTS_OPEN_SOON };

  const message = error instanceof Error ? error.message : fallbackMessage;
  if (!(error instanceof ApiRequestError) || error.status !== 409)
    return { kind: "other", message };

  switch (error.code) {
    case "ALREADY_SUBSCRIBED":
    case "ALREADY_INCLUDED":
      return { kind: "already-have", message };
    case "PAYMENT_OUTSTANDING":
    case "SUBSCRIPTION_PAUSED":
      return { kind: "manage-billing", message };
    case "SUBSCRIPTION_OVERLAP": {
      const suggested = (error.details as { suggestedProductKey?: unknown }).suggestedProductKey;

      return {
        kind: "overlap",
        message,
        suggestedProductKey:
          suggested === "ai_credits" || suggested === "portfolio_pro" || suggested === "bundle"
            ? suggested
            : null,
      };
    }
  }

  return {
    kind: !error.code && message.startsWith(CHECKOUT_LOCK_PHRASE) ? "checkout-locked" : "other",
    message,
  };
}

export type CheckoutInterval = keyof CatalogProduct["prices"];

const INTERVAL_LABELS: Record<CheckoutInterval, string> = {
  one_day: "for 3 days",
  seven_day: "for 7 days",
  monthly: "per month",
  annual: "per year",
};

/** One-time passes are sold under the bundle key; customers know them by these names. */
const PASS_NAMES: Partial<Record<CheckoutInterval, string>> = {
  one_day: "3-Day Sprint pass",
  seven_day: "7-Day Hunt pass",
};

export type CheckoutRequest =
  | {
      ok: true;
      productKey: ProductKey;
      interval: CheckoutInterval;
      productName: string;
      priceLabel: string;
    }
  | { ok: false; reason: string };

/**
 * A `/checkout` link names exactly what it sells. A missing or unknown product or interval is
 * refused rather than defaulted: a default silently turned `?productKey=ai_credits` into an
 * annual charge, and a missing product into the most expensive bundle.
 */
export function resolveCheckoutRequest(
  params: { productKey?: string; interval?: string },
  catalog: CatalogProduct[],
): CheckoutRequest {
  const product = catalog.find((item) => item.key === params.productKey);
  if (!product) return { ok: false, reason: "This checkout link does not name a plan we sell." };

  const interval = Object.hasOwn(INTERVAL_LABELS, params.interval ?? "")
    ? (params.interval as CheckoutInterval)
    : null;
  const priceCents = interval ? product.prices[interval] : undefined;

  if (!interval || priceCents === undefined) {
    return { ok: false, reason: `${product.name} is not sold for that billing period.` };
  }

  return {
    ok: true,
    productKey: product.key,
    interval,
    productName: PASS_NAMES[interval] ?? product.name,
    priceLabel: `${formatCents(priceCents, product.currency)} ${INTERVAL_LABELS[interval]}`,
  };
}
