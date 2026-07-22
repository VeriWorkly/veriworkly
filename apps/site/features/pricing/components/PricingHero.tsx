import React from "react";
import { ShieldCheck, Sparkles } from "lucide-react";
import PriceCard from "./PriceCard";
import IntervalToggle from "./IntervalToggle";
import { type ProductKey, type BillingInterval } from "../data/pricingData";

interface PricingHeroProps {
  bundleInterval: "monthly" | "annual";
  setBundleInterval: (interval: "monthly" | "annual") => void;
  loading: string;
  paymentsBlocked: boolean;
  error: string;
  onCheckout: (productKey: ProductKey, interval: BillingInterval) => void;
}

const PricingHero = ({
  bundleInterval,
  setBundleInterval,
  loading,
  paymentsBlocked,
  error,
  onCheckout,
}: PricingHeroProps) => {
  const bundlePrice =
    bundleInterval === "annual"
      ? { amount: "$11.99", cadence: "/ month", note: "$143.88 billed yearly", savings: "Save 20%" }
      : {
          amount: "$14.99",
          cadence: "/ month",
          note: "Billed monthly",
          savings: "Recommended",
        };

  return (
    <section className="border-border relative border-b pt-24 pb-20 lg:pt-32 lg:pb-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--border)_0.8px,transparent_0.8px)] bg-size-[24px_24px] opacity-25" />
      <div className="bg-accent/12 pointer-events-none absolute top-20 -right-32 size-96 rounded-full blur-3xl" />

      <div className="relative mx-auto w-[min(1180px,calc(100%_-_32px))]">
        <div className="grid items-end gap-12 lg:grid-cols-[1.3fr_.7fr]">
          <div>
            <div className="border-border bg-card text-accent inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold tracking-wider uppercase">
              <Sparkles className="size-3.5" /> Pay for the pace you need
            </div>
            <h1 className="mt-8 max-w-5xl text-[clamp(3.6rem,8vw,7.2rem)] leading-[0.88] font-bold tracking-tighter">
              One workspace.
              <span className="text-accent block">Your timeline.</span>
            </h1>
          </div>

          <div className="border-border border-t pt-6">
            <p className="text-muted max-w-md text-base leading-7">
              Get Creator Pro hosting and AI writing tools together for a weekend, a week, or a full
              year. Zero automatic renewal risk.
            </p>
            <div className="text-accent mt-6 flex items-center gap-3 text-xs font-bold uppercase">
              <ShieldCheck className="size-4" /> Secure checkout by Dodo Payments
            </div>
          </div>
        </div>

        {paymentsBlocked ? (
          <div className="mt-8 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm font-bold text-amber-800 dark:text-amber-300">
            Payments are disabled in production during this phase. Only system administrators can
            perform checkouts.
          </div>
        ) : null}

        {error ? (
          <p className="mt-8 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm font-bold text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <PriceCard
            marker="03"
            title="3-Day Sprint"
            price="$2.99"
            cadence="one-time purchase"
            description="A quick pass to publish your portfolio and tailor resumes for a specific application."
            features={[
              "Creator Pro subdomain hosting",
              "150 AI writing credits",
              "ATS document scanning",
              "Automatically expires",
            ]}
            loading={loading === "bundle:one_day"}
            disabled={paymentsBlocked}
            onCheckout={() => void onCheckout("bundle", "one_day")}
          />

          <PriceCard
            marker="07"
            title="7-Day Hunt"
            price="$5.99"
            cadence="one-time purchase"
            description="Runway to update your story, apply broadly, and publish with full confidence."
            features={[
              "Creator Pro subdomain hosting",
              "400 AI writing credits",
              "ATS document scanning",
              "Automatically expires",
            ]}
            loading={loading === "bundle:seven_day"}
            disabled={paymentsBlocked}
            onCheckout={() => void onCheckout("bundle", "seven_day")}
          />

          <PriceCard
            featured
            marker="365"
            title="Job Hunter Bundle"
            price={bundlePrice.amount}
            cadence={bundlePrice.cadence}
            description="The complete workspace for active job searches, unlocking AI document tools."
            features={[
              "Creator Pro subdomain hosting",
              "1,000 monthly AI credits",
              "Full ATS Tailoring suite",
              "Cancel anytime",
            ]}
            note={bundlePrice.note}
            badge={bundlePrice.savings}
            loading={loading === `bundle:${bundleInterval}`}
            disabled={paymentsBlocked}
            onCheckout={() => void onCheckout("bundle", bundleInterval)}
            toggle={<IntervalToggle value={bundleInterval} onChange={setBundleInterval} />}
          />
        </div>
      </div>
    </section>
  );
};

export default PricingHero;
