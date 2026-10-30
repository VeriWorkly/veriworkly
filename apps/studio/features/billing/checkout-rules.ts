import type { BillingSummary, CatalogProduct, ProductKey } from "@/features/billing/types";
import { ApiRequestError } from "@/utils/fetchApiData";
import { formatCents } from "@/features/admin/utils/admin-format";

/** The server's product names (`productNames.ts`), for products named by key. */
export const PLAN_NAMES: Record<ProductKey, string> = {
  ai_credits: "AI Credits",
  portfolio_pro: "Creator Pro",
  bundle: "Job Hunter Bundle",
};

/** The plan in a few words, for places without room for the billing page's detail. */
export function accessTierLabel(tier: BillingSummary["access"]["tier"]) {
  if (tier === "pass") return "Job Hunter pass";
  if (tier === "credits") return "Credits customer";
  if (tier === "free") return "Free";

  return PLAN_NAMES[tier];
}

/**
 * A renewal whose card failed: the plan is still named (the customer has it), and they are told
 * to fix the card wherever the plan is shown, not only on /billing (S-386). A pause owes nothing.
 */
export function accountPaymentNotice(access: Pick<BillingSummary["access"], "paymentIssue">) {
  return access.paymentIssue ? "Payment failed · update card" : null;
}

export const PAYMENTS_OPEN_SOON =
  "Payments open soon. Purchases are not available yet; nothing has been charged.";

/**
 * Payments are admin-only at launch: the API answers every purchase from anyone else with 403
 * (`assertPaymentsEnabled`). A signed-out buyer gets 401, so 403 on a purchase means only this.
 */
export function isPaymentsClosedError(error: unknown) {
  return error instanceof ApiRequestError && error.status === 403;
}

/** A recurring plan change the server offers instead of a second subscription (V-202). */
export type PlanUpgrade = { productKey: ProductKey; interval: "monthly" | "annual" };

export type CheckoutFailure =
  | { kind: "payments-closed"; message: string }
  /** The customer already has what they asked for: nothing to buy. */
  | { kind: "already-have"; message: string }
  /** A paused or unpaid subscription: fixed in the billing portal, never by a second purchase. */
  | { kind: "manage-billing"; message: string }
  /** A live subscription overlaps the request; the message says how to switch. */
  | { kind: "overlap"; message: string; suggestedProductKey: ProductKey | null }
  /** The live plan can be upgraded in place: offer that change, not a new checkout. */
  | { kind: "upgrade"; message: string; upgrade: PlanUpgrade }
  | { kind: "checkout-locked"; message: string }
  | { kind: "other"; message: string };

/**
 * What a failed checkout or plan change means. The server names each 409 by `details.code`
 * (`checkoutOverlap` and `planChangeError` in billingService); only the checkout lock
 * (`CHECKOUT_IN_PROGRESS`) may be cancelled and retried, because every other 409 answers the
 * retry the same way.
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
    case "SUBSCRIPTION_ENDING":
    case "SUBSCRIPTION_PAUSED":
      return { kind: "manage-billing", message };
    case "CHECKOUT_IN_PROGRESS":
      return { kind: "checkout-locked", message };
    case "UPGRADE_AVAILABLE": {
      const upgrade = (error.details as { upgrade?: Partial<PlanUpgrade> }).upgrade;

      if (
        upgrade &&
        isProductKey(upgrade.productKey) &&
        (upgrade.interval === "monthly" || upgrade.interval === "annual")
      ) {
        return {
          kind: "upgrade",
          message,
          upgrade: { productKey: upgrade.productKey, interval: upgrade.interval },
        };
      }
      return { kind: "overlap", message, suggestedProductKey: "bundle" };
    }
    case "SUBSCRIPTION_OVERLAP": {
      const suggested = (error.details as { suggestedProductKey?: unknown }).suggestedProductKey;

      return {
        kind: "overlap",
        message,
        suggestedProductKey: isProductKey(suggested) ? suggested : null,
      };
    }
  }

  return { kind: "other", message };
}

function isProductKey(value: unknown): value is ProductKey {
  return value === "ai_credits" || value === "portfolio_pro" || value === "bundle";
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

/**
 * What `POST /billing/checkout/cancel` answers: the checkouts it released (`cleared`, product and
 * pack keys) and the credit-pack payments it kept because their money is still moving
 * (`stillProcessing`, by name). A kept pack still blocks account deletion until it lands.
 */
export type CheckoutCancelResult = {
  success: boolean;
  cleared?: string[];
  stillProcessing?: string[];
};

/** The note to show after a cancel that kept a pack payment, or `null` when nothing was kept. */
export function checkoutCancelNotice(result: CheckoutCancelResult | null | undefined) {
  const kept = result?.stillProcessing ?? [];
  if (kept.length === 0) return null;

  return `Your payment for ${kept.join(", ")} is still being processed, so it was kept. It is added to your account when the payment is confirmed.`;
}

/**
 * A refused cancel (409, V-377/V-398). The server keeps a checkout whose payment is moving, and
 * one waiting on the customer (3-D Secure or a bank authorisation) for up to an hour, so the
 * customer is told what to do instead of retrying into the same answer. The server names it
 * `CHECKOUT_STILL_PROCESSING`; a server from before the code is matched on its message. Other
 * refusals ("still being prepared") and failures keep the server's message.
 */
export function describeCheckoutCancelError(error: unknown, fallbackMessage: string) {
  if (isPaymentsClosedError(error)) return PAYMENTS_OPEN_SOON;

  const message = error instanceof Error ? error.message : fallbackMessage;
  const stillProcessing =
    error instanceof ApiRequestError &&
    error.status === 409 &&
    (error.code === "CHECKOUT_STILL_PROCESSING" ||
      (error.code === undefined && /still being processed/i.test(error.message)));

  if (stillProcessing) {
    return `${message} If your bank asked you to confirm the payment (3-D Secure or an authorisation in your banking app), finish that step. An unfinished confirmation is released within an hour, and you can start a new checkout then.`;
  }

  return message;
}
