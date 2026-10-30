"use client";

import { useState } from "react";
import { Sparkles, ShieldCheck } from "lucide-react";

import { siteConfig } from "@/config/site";

import {
  PASS_NAMES,
  PASS_PRICES,
  PLAN_NAMES,
  PLAN_PRICES,
  annualPerMonth,
  annualSavingsPercent,
  usd,
  type PlanInterval,
  type PlanKey,
} from "@/features/pricing/data/offers";
import { PriceCard } from "@/features/pricing/components/PriceCard";
import { IntervalToggle } from "@/features/pricing/components/IntervalToggle";
import { CheckoutButton } from "@/features/pricing/components/CheckoutButton";

const creatorProFeatures = [
  "Premium templates (Nimbus, Cipher)",
  "No “Built with VeriWorkly” badge",
  "Visitor analytics",
  "SEO controls",
  "Multi-page portfolios",
  "No AI credits included",
];

const bundleFeatures = [
  "Everything in Creator Pro",
  "1,000 AI credits every month",
  "300 ATS scans a month",
  "Higher GitHub and LinkedIn import limits",
];

const passes = [
  { interval: "one_day", days: 3, credits: 150 },
  { interval: "seven_day", days: 7, credits: 400 },
] as const;

const checkoutHref = (productKey: PlanKey, interval: string) =>
  `${siteConfig.links.app}/checkout?productKey=${productKey}&interval=${interval}`;

function planPrice(plan: PlanKey, interval: PlanInterval) {
  if (interval === "monthly")
    return { amount: usd(PLAN_PRICES[plan].monthly), note: "Billed monthly", savings: undefined };

  return {
    amount: usd(annualPerMonth(plan)),
    note: `${usd(PLAN_PRICES[plan].annual)} billed yearly`,
    savings: `Save ${annualSavingsPercent(plan)}%`,
  };
}

const BundlePricingSection = () => {
  const [bundleInterval, setBundleInterval] = useState<PlanInterval>("annual");

  const creatorProPrice = planPrice("portfolio_pro", bundleInterval);
  const bundlePrice = planPrice("bundle", bundleInterval);

  return (
    <header className="border-line relative border-b pt-16 pb-20 lg:pt-24 lg:pb-28">
      <div className="bg-accent/12 pointer-events-none absolute top-20 -right-32 size-96 rounded-full blur-3xl" />
      <div className="bg-accent/6 pointer-events-none absolute top-40 -left-32 size-96 rounded-full blur-3xl" />

      <div className="mx-auto w-[min(1160px,calc(100%-32px))]">
        <div className="grid items-end gap-12 lg:grid-cols-[1.3fr_.7fr]">
          <div>
            <p className="border-line bg-panel/60 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold tracking-[0.12em] uppercase backdrop-blur">
              <Sparkles className="text-accent size-3.5" aria-hidden="true" /> Portfolio pricing
            </p>

            <h1 className="text-ink mt-8 max-w-5xl text-[clamp(3.5rem,9vw,6.5rem)] leading-none font-bold tracking-tighter">
              Publish free. <br />{" "}
              <span className="text-accent block sm:inline">Upgrade when it pays.</span>
            </h1>
          </div>

          <div className="border-line-strong border-t-2 pt-6">
            <p className="text-ink/75 max-w-md text-base leading-7">
              Every portfolio gets its own yourname.veriworkly.com address. Signal and Atelier are
              free and carry a small “Built with VeriWorkly” badge. Paid plans add Nimbus and
              Cipher, remove the badge, and unlock analytics and SEO controls.
            </p>

            <div className="text-accent mt-6 flex items-center gap-3 text-xs font-bold uppercase">
              <ShieldCheck className="size-4" aria-hidden="true" /> Secure checkout by Dodo Payments
            </div>
          </div>
        </div>

        <div className="mt-14 flex justify-center">
          <div className="w-full max-w-xs">
            <IntervalToggle value={bundleInterval} onChange={setBundleInterval} />
          </div>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl items-stretch gap-8 md:grid-cols-2">
          <PriceCard
            marker="PRO"
            plan="portfolio_pro"
            title={PLAN_NAMES.portfolio_pro}
            note={creatorProPrice.note}
            features={creatorProFeatures}
            price={creatorProPrice.amount}
            badge={creatorProPrice.savings}
            cadence="/ month"
            href={checkoutHref("portfolio_pro", bundleInterval)}
            description="For a polished public portfolio, without the AI writing credits."
          />

          <PriceCard
            featured
            marker="BUNDLE"
            plan="bundle"
            title={PLAN_NAMES.bundle}
            note={bundlePrice.note}
            features={bundleFeatures}
            price={bundlePrice.amount}
            badge={bundlePrice.savings ?? "Recommended"}
            cadence="/ month"
            href={checkoutHref("bundle", bundleInterval)}
            description="Creator Pro plus AI writing credits, for an active job search."
          />
        </div>

        <div className="border-line bg-panel mt-20 rounded-[2.2rem] border-2 p-6 shadow-[0_12px_30px_rgba(17,17,15,0.02)] transition-all duration-300 hover:shadow-[0_16px_40px_rgba(17,17,15,0.04)] sm:p-8">
          <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_1.9fr]">
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className="bg-accent absolute inline-flex h-full w-full rounded-full opacity-75 motion-safe:animate-ping"></span>
                  <span className="bg-accent relative inline-flex h-2 w-2 rounded-full"></span>
                </span>
                <p className="text-accent text-xs font-bold tracking-[0.14em] uppercase">
                  One-time passes
                </p>
              </div>
              <h2 className="text-ink mt-3 text-xl font-bold tracking-tight sm:text-2xl">
                Just need a quick fix?
              </h2>
              <p className="text-ink/75 mt-2 max-w-sm text-sm leading-6">
                A pass gives you Creator Pro features and AI credits for a few days. You pay once
                and it ends on its own. Nothing renews.
              </p>
            </div>

            <div className="grid w-full gap-4 sm:grid-cols-2">
              {passes.map((pass) => (
                <div
                  key={pass.interval}
                  className="border-line from-paper to-panel/50 hover:to-panel hover:border-line-strong flex flex-col justify-between rounded-3xl border bg-gradient-to-br p-5 transition-all duration-250 hover:shadow-[0_8px_20px_rgba(17,17,15,0.02)]"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="bg-accent/10 border-accent/25 text-accent rounded-full border px-2.5 py-0.5 text-xs font-bold tracking-wider uppercase">
                        {pass.days} days
                      </span>
                      <span className="text-muted font-mono text-xs font-bold" aria-hidden="true">
                        0{pass.days}
                      </span>
                    </div>
                    <h3 className="text-ink mt-4 text-base font-bold">
                      {PASS_NAMES[pass.interval]}
                    </h3>
                    <p className="text-muted mt-2 text-sm leading-5">
                      {pass.days} days of Creator Pro portfolio features and {pass.credits} AI
                      credits.
                    </p>
                  </div>

                  <div className="border-line my-4 flex items-end justify-between gap-4 border-t border-dashed pt-4">
                    <div>
                      <span className="text-ink text-2xl font-bold tracking-tight">
                        {usd(PASS_PRICES[pass.interval])}
                      </span>
                      <span className="text-muted mt-0.5 block text-xs leading-none font-bold">
                        one time
                      </span>
                    </div>
                    <CheckoutButton
                      href={checkoutHref("bundle", pass.interval)}
                      className="bg-accent hover:bg-accent-strong rounded-xl px-4 py-2.5 text-xs font-bold text-white transition-all duration-150 active:scale-[0.97]"
                    >
                      Get pass
                    </CheckoutButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default BundlePricingSection;
