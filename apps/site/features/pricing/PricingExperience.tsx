"use client";

import { useEffect, useState } from "react";
import { siteConfig } from "@/config/site";
import { ApiRequestError, fetchApiData } from "@/utils/fetchApiData";
import { safeCheckoutUrl } from "./checkout-url";
import { type ProductKey, type BillingInterval } from "./data/pricingData";

import PricingHero from "./components/PricingHero";
import PricingAlaCarte from "./components/PricingAlaCarte";
import PricingComparison from "./components/PricingComparison";
import { CurrencyProvider } from "./context/CurrencyContext";

// `paymentsBlocked` only disables the buttons; BillingController.assertPaymentsEnabled is the real gate.

const PricingExperience = ({
  paymentsBlocked,
  inrPerUsd,
}: {
  paymentsBlocked: boolean;
  inrPerUsd?: number;
}) => {
  const [bundleInterval, setBundleInterval] = useState<"monthly" | "annual">("annual");
  const [customPlan, setCustomPlan] = useState<"portfolio_pro" | "ai_credits">("portfolio_pro");
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");

  // Back from the checkout page restores this page from the bfcache with the spinner still on.
  useEffect(() => {
    const reset = (event: PageTransitionEvent) => {
      if (event.persisted) setLoading("");
    };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  const checkout = async (productKey: ProductKey, interval: BillingInterval) => {
    if (paymentsBlocked || loading) return;
    const checkoutKey = `${productKey}:${interval}`;
    setLoading(checkoutKey);
    setError("");

    try {
      const result = await fetchApiData<{ url: string }>("/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ productKey, interval, redirectUrl: "/billing" }),
      });
      const url = safeCheckoutUrl(result.url);
      if (!url) {
        setError("Could not start checkout.");
        setLoading("");
        return;
      }
      window.location.assign(url);
    } catch (cause) {
      if (cause instanceof ApiRequestError && cause.status === 401) {
        const params = new URLSearchParams({ productKey, interval });
        // Studio's checkout, another app's origin: a full page load is the only way there.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
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
