"use client";

import { useState } from "react";
import { Sparkles, ShieldCheck } from "lucide-react";

import { siteConfig } from "@/config/site";

import { PriceCard } from "@/features/pricing/components/PriceCard";
import { IntervalToggle } from "@/features/pricing/components/IntervalToggle";

const dayPassFeatures = [
  "Portfolio Pro publishing",
  "25 AI writing credits",
  "ATS and document tools",
  "No auto-renewal",
];

const weekSprintFeatures = [
  "Portfolio Pro publishing",
  "220 AI writing credits",
  "ATS and document tools",
  "No auto-renewal",
];

const bundleFeatures = [
  "Portfolio Pro publishing",
  "1,000 monthly AI credits",
  "ATS and document tools",
  "Cancel anytime",
];

const BundlePricingSection = () => {
  const [bundleInterval, setBundleInterval] = useState<"monthly" | "annual">("annual");

  const bundlePrice =
    bundleInterval === "annual"
      ? { amount: "$9.99", cadence: "/ month", note: "$120 billed yearly", savings: "Save 15%" }
      : {
          amount: "$11.99",
          cadence: "/ month",
          note: "Billed monthly",
          savings: "Flexible monthly",
        };

  return (
    <header className="border-line relative border-b pt-16 pb-20 lg:pt-24 lg:pb-28">
      <div className="bg-accent/12 pointer-events-none absolute top-20 -right-32 size-96 rounded-full blur-3xl" />
      <div className="bg-accent/6 pointer-events-none absolute top-40 -left-32 size-96 rounded-full blur-3xl" />

      <div className="mx-auto w-[min(1160px,calc(100%-32px))]">
        <div className="grid items-end gap-12 lg:grid-cols-[1.35fr_.65fr]">
          <div>
            <p className="border-line bg-panel/60 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold tracking-[0.12em] uppercase backdrop-blur">
              <Sparkles className="text-accent size-3.5" /> Pay for the pace you need
            </p>

            <h1 className="text-ink mt-8 max-w-5xl text-[clamp(3.5rem,9vw,7.6rem)] leading-none font-bold tracking-tighter">
              <span className="sr-only">VeriWorkly Portfolio Pricing: </span>
              One toolkit. <br />{" "}
              <span className="text-accent block sm:inline">Your timeline.</span>
            </h1>
          </div>

          <div className="border-line-strong border-t-2 pt-6">
            <p className="text-ink/75 max-w-md text-base leading-7">
              Get Portfolio Pro and AI credits together for a day, a week, or a full year. No
              oversized commitment before the work earns it.
            </p>

            <div className="text-accent mt-6 flex items-center gap-3 text-xs font-bold uppercase">
              <ShieldCheck className="size-4" /> Secure checkout by Dodo Payments
            </div>
          </div>
        </div>

        <div className="mt-16 grid items-stretch gap-8 md:grid-cols-2 lg:grid-cols-[0.8fr_0.9fr_1.25fr]">
          <PriceCard
            marker="01"
            price="$0.69"
            title="Day Pass"
            cadence="for 24 hours"
            features={dayPassFeatures}
            badge="Single Application"
            href={`${siteConfig.links.app}/checkout?productKey=bundle&interval=one_day`}
            description="A tiny commitment for one focused application, portfolio update, or deadline."
          />

          <PriceCard
            marker="07"
            price="$3.99"
            title="Week Sprint"
            cadence="for 7 days"
            badge="Active Job Hunt"
            features={weekSprintFeatures}
            href={`${siteConfig.links.app}/checkout?productKey=bundle&interval=seven_day`}
            description="Enough runway to refine the full story, apply broadly, and publish with confidence."
          />

          <PriceCard
            featured
            marker="365"
            title="Full Bundle"
            note={bundlePrice.note}
            features={bundleFeatures}
            price={bundlePrice.amount}
            badge={bundlePrice.savings}
            cadence={bundlePrice.cadence}
            href={`${siteConfig.links.app}/checkout?productKey=bundle&interval=${bundleInterval}`}
            description="The complete VeriWorkly workspace for consistent career momentum all year."
            toggle={<IntervalToggle value={bundleInterval} onChange={setBundleInterval} featured />}
          />
        </div>
      </div>
    </header>
  );
};

export default BundlePricingSection;
