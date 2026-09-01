"use client";

import { useState } from "react";
import { siteConfig } from "@/config/site";
import { ApiRequestError, fetchApiData } from "@/utils/fetchApiData";
import { type ProductKey, type BillingInterval } from "./data/pricingData";

import PricingHero from "./components/PricingHero";
import PricingAlaCarte from "./components/PricingAlaCarte";
import PricingComparison from "./components/PricingComparison";

// `paymentsBlocked` is computed server-side (see app/(marketing)/pricing/page.tsx) from the
// server-only ADMIN_EMAIL, so the admin's email address never reaches the client bundle - only
// this boolean does. The backend's BillingController.assertPaymentsEnabled is still the actual
// enforcement point; this only drives the pre-emptive disabled UI.
import { CurrencyProvider } from "./context/CurrencyContext";

const PricingExperience = ({
  paymentsBlocked,
  inrPerUsd,
}: {
  paymentsBlocked: boolean;
  /** Live USD→INR rate, resolved server-side. Omitted callers get the built-in fallback. */
  inrPerUsd?: number;
}) => {
  const [bundleInterval, setBundleInterval] = useState<"monthly" | "annual">("annual");
  const [customPlan, setCustomPlan] = useState<"portfolio_pro" | "ai_credits">("portfolio_pro");
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");

  const checkout = async (productKey: ProductKey, interval: BillingInterval) => {
    if (paymentsBlocked) return;
    const checkoutKey = `${productKey}:${interval}`;
    setLoading(checkoutKey);
    setError("");

    try {
      const result = await fetchApiData<{ url: string }>("/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ productKey, interval, redirectUrl: "/billing" }),
      });
      window.location.assign(result.url);
    } catch (cause) {
      if (cause instanceof ApiRequestError && cause.status === 401) {
        const params = new URLSearchParams({ productKey, interval });
        window.location.assign(`${siteConfig.links.app}/checkout?${params.toString()}`);
        return;
      }

      setError(cause instanceof Error ? cause.message : "Could not start checkout.");
      setLoading("");
    }
  };

  return (
    <CurrencyProvider inrPerUsd={inrPerUsd}>
      <div className="bg-background text-foreground overflow-hidden">
        <PricingHero
          bundleInterval={bundleInterval}
          setBundleInterval={setBundleInterval}
          loading={loading}
          paymentsBlocked={paymentsBlocked}
          error={error}
          onCheckout={checkout}
        />

        <PricingAlaCarte
          customPlan={customPlan}
          setCustomPlan={setCustomPlan}
          loading={loading}
          paymentsBlocked={paymentsBlocked}
          onCheckout={checkout}
        />

        <PricingComparison
          loading={loading}
          paymentsBlocked={paymentsBlocked}
          onCheckout={checkout}
        />
      </div>
    </CurrencyProvider>
  );
};

export default PricingExperience;
