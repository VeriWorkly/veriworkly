import { fetchApiData } from "@/utils/fetchApiData";

import type {
  BillingCycle,
  PlanChangePreview,
  PlanChangeResult,
  ProductKey,
} from "@/features/billing/types";

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

export function buyCreditPack(packKey: "credit_pack_250" | "credit_pack_500") {
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

export function cancelCheckout() {
  return fetchApiData<{ success: boolean }>("/billing/checkout/cancel", {
    method: "POST",
    body: "{}",
  });
}
