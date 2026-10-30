import { fetchApiData } from "@/utils/fetchApiData";

import type {
  BillingCycle,
  CreditPackKey,
  PlanChangePreview,
  PlanChangeResult,
  ProductKey,
} from "@/features/billing/types";
import {
  checkoutCancelNotice,
  describeCheckoutCancelError,
  type CheckoutCancelResult,
} from "@/features/billing/checkout-rules";

export function beginCheckout(
  productKey: ProductKey,
  interval: BillingCycle | "one_day" | "seven_day",
) {
  return fetchApiData<{ url: string }>("/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ productKey, interval, redirectUrl: "/billing" }),
  });
}
export function openBillingPortal() {
  return fetchApiData<{ url: string }>("/billing/portal", { method: "POST", body: "{}" });
}

export function buyCreditPack(packKey: CreditPackKey) {
  return fetchApiData<{ url: string }>("/billing/credits/checkout", {
    method: "POST",
    body: JSON.stringify({ packKey, redirectUrl: "/billing" }),
  });
}

/** What upgrading the live subscription would charge now and from the next bill (V-202). */
export function previewPlanChange(productKey: ProductKey, interval: BillingCycle) {
  return fetchApiData<PlanChangePreview>("/billing/subscription/change-plan/preview", {
    method: "POST",
    body: JSON.stringify({ productKey, interval }),
  });
}

/**
 * Upgrades the live subscription. The same `idempotencyKey` on a retried click is answered with
 * the first request's result, never a second charge. `confirmed: false` (a 202) means the
 * provider's answer did not arrive: the change may still land, and `/billing/me` shows when.
 */
export function changePlan(productKey: ProductKey, interval: BillingCycle, idempotencyKey: string) {
  return fetchApiData<PlanChangeResult>("/billing/subscription/change-plan", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ productKey, interval, idempotencyKey }),
  });
}

/** Releases the open checkouts nobody is paying; see `CheckoutCancelResult`. */
export function cancelCheckout() {
  return fetchApiData<CheckoutCancelResult>("/billing/checkout/cancel", {
    method: "POST",
    body: "{}",
  });
}

/**
 * Releases a checkout the customer walked away from, which blocks account deletion for up to a
 * day (S-377). Null when nothing is left open, so the deletion can go on; otherwise what to tell
 * the customer: a pack payment still moving is kept, and a refusal says what to do instead.
 */
export async function releaseCheckoutBeforeDeletion(): Promise<string | null> {
  try {
    return checkoutCancelNotice(await cancelCheckout());
  } catch (cause) {
    return describeCheckoutCancelError(cause, "Could not cancel the open checkout.");
  }
}
