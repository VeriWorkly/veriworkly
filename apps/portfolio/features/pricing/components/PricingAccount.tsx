"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { backendApiUrl } from "@/lib/backend";

import type { PlanKey } from "@/features/pricing/data/offers";

/** The part of GET /billing/me the pricing page needs. */
export interface PricingBillingSummary {
  status: string;
  productKey: string | null;
  interval?: string | null;
  activeProductKeys?: string[];
}

/** A live subscription (in period, or in dunning). The server refuses a second checkout with 409 for these. */
export interface PricingAccount {
  subscribedTo: PlanKey | null;
  /** A 3- or 7-day pass is stored as a "bundle" row, but it is not the Bundle subscription. */
  onPass: boolean;
}

const PLAN_KEYS: readonly string[] = ["ai_credits", "portfolio_pro", "bundle"];

export function describePricingAccount(summary: PricingBillingSummary | null): PricingAccount {
  const live = Boolean(summary && (summary.status === "ACTIVE" || summary.status === "PAST_DUE"));
  if (live && (summary?.interval === "ONE_DAY" || summary?.interval === "SEVEN_DAY"))
    return { subscribedTo: null, onPass: true };
  const key = live ? (summary?.productKey ?? summary?.activeProductKeys?.[0] ?? null) : null;

  return { subscribedTo: key && PLAN_KEYS.includes(key) ? (key as PlanKey) : null, onPass: false };
}

export const PricingAccountContext = createContext<PricingAccount>({
  subscribedTo: null,
  onPass: false,
});

export const usePricingAccount = () => useContext(PricingAccountContext);

/**
 * Reads the visitor's plan in the browser, so the page itself stays static (P-071). A plain
 * fetch, not authenticatedFetch: an anonymous visitor's 401 is expected here and must not
 * bounce them to the login page.
 */
export function PricingAccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<PricingAccount>({ subscribedTo: null, onPass: false });

  useEffect(() => {
    const controller = new AbortController();

    // Inside the chain so a missing backend URL (backendApiUrl throws) lands in the catch.
    Promise.resolve()
      .then(() =>
        fetch(backendApiUrl("/billing/me"), { credentials: "include", signal: controller.signal }),
      )
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { data?: PricingBillingSummary } | null) => {
        setAccount(describePricingAccount(payload?.data ?? null));
      })
      .catch(() => {
        // Signed out, offline or no backend configured: the static page is already right.
      });

    return () => controller.abort();
  }, []);

  return (
    <PricingAccountContext.Provider value={account}>{children}</PricingAccountContext.Provider>
  );
}
