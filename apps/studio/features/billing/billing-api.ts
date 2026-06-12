import { fetchApiData } from "@/utils/fetchApiData";

import type { BillingCycle, ProductKey } from "@/features/billing/types";

export function beginCheckout(productKey: ProductKey, interval: BillingCycle | "seven_day") {
  return fetchApiData<{ url: string }>("/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ productKey, interval, redirectUrl: "/billing" }),
  });
}
export function openBillingPortal() {
  return fetchApiData<{ url: string }>("/billing/portal", { method: "POST", body: "{}" });
}

export function buyCreditPack(packKey: "credit_pack_100") {
  return fetchApiData<{ url: string }>("/billing/credits/checkout", {
    method: "POST",
    body: JSON.stringify({ packKey, redirectUrl: "/billing" }),
  });
}
