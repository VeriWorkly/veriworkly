"use client";

import { useState, useEffect } from "react";
import { siteConfig } from "@/config/site";
import { ApiRequestError, fetchApiData } from "@/utils/fetchApiData";
import { type ProductKey, type BillingInterval } from "./data/pricingData";

import PricingHero from "./components/PricingHero";
import PricingAlaCarte from "./components/PricingAlaCarte";
import PricingComparison from "./components/PricingComparison";

const PricingExperience = () => {
  const [bundleInterval, setBundleInterval] = useState<"monthly" | "annual">("annual");
  const [customPlan, setCustomPlan] = useState<"portfolio_pro" | "ai_credits">("portfolio_pro");
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const [user, setUser] = useState<{ email?: string | null } | null>(null);

  useEffect(() => {
    fetchApiData<{ email: string | null; name: string | null }>("/users/me")
      .then((data) => {
        setUser(data);
      })
      .catch(() => {
        setUser(null);
      });
  }, []);

  const isProd = process.env.NODE_ENV === "production";
  const adminEmail = (
    process.env.NEXT_PUBLIC_ADMIN_EMAIL || "ashragautam25@gmail.com"
  ).toLowerCase();
  const isAdmin = user && user.email && user.email.toLowerCase() === adminEmail;
  const paymentsBlocked = isProd && !isAdmin;

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
    <main className="bg-background text-foreground overflow-hidden">
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
    </main>
  );
};

export default PricingExperience;
