"use client";

import Link from "next/link";
import { useState } from "react";
import { WandSparkles, Zap, Sparkles, ArrowRight } from "lucide-react";

import { siteConfig } from "@/config/site";

import {
  CREDIT_PACKS,
  CREDIT_PACK_VALID_DAYS,
  PLAN_NAMES,
  PLAN_PRICES,
  annualPerMonth,
  annualSavingsPercent,
  usd,
  type PlanInterval,
} from "@/features/pricing/data/offers";
import { IntervalToggle } from "@/features/pricing/components/IntervalToggle";
import { CheckoutButton, billingPortalHref } from "@/features/pricing/components/CheckoutButton";

const aiFeatures = [
  "1,000 AI credits every month",
  "Tailor resumes, cover letters and portfolio bios",
  "300 ATS scans a month",
  "No portfolio features included",
];

/** AI Credits on its own, plus the one-time packs. Creator Pro is sold once, in the cards above (P-069). */
const CustomPlansSection = () => {
  const [interval, setAiInterval] = useState<PlanInterval>("annual");

  const annual = interval === "annual";
  const price = annual ? annualPerMonth("ai_credits") : PLAN_PRICES.ai_credits.monthly;

  return (
    <section className="border-line relative border-b py-24 lg:py-32">
      <div className="bg-accent/5 pointer-events-none absolute top-40 -right-32 size-96 rounded-full blur-3xl" />
      <div className="mx-auto w-[min(1160px,calc(100%-32px))]">
        <div className="mx-auto max-w-2xl text-center">
          <div className="border-line bg-panel text-accent inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold">
            <Sparkles className="size-3.5" aria-hidden="true" /> AI writing only
          </div>

          <h2 className="text-ink mt-5 text-[clamp(2.4rem,6vw,4rem)] leading-none font-bold tracking-tighter">
            Only need AI writing help?
          </h2>

          <p className="text-ink/75 mt-6 text-base leading-7">
            {PLAN_NAMES.ai_credits} and credit packs buy AI credits only. Your portfolio stays on
            the free plan: Signal and Atelier, with the badge.
          </p>
        </div>

        <article className="border-line bg-panel hover:border-line-strong mx-auto mt-16 flex max-w-2xl flex-col justify-between rounded-[2.2rem] border-2 p-6 shadow-[0_12px_30px_rgba(17,17,15,0.02)] transition-all duration-300 hover:shadow-[0_16px_40px_rgba(17,17,15,0.04)] sm:p-8">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-ink flex items-center gap-2 text-sm font-bold">
                <WandSparkles className="text-accent size-5" aria-hidden="true" />
                {PLAN_NAMES.ai_credits}
              </h3>
              <div className="w-full max-w-xs">
                <IntervalToggle
                  value={interval}
                  onChange={setAiInterval}
                  annualLabel={`Yearly (save ${annualSavingsPercent("ai_credits")}%)`}
                />
              </div>
            </div>

            <ul className="mt-6 flex flex-wrap gap-2">
              {aiFeatures.map((feature) => (
                <li
                  className="border-line bg-paper/60 text-ink/80 rounded-full border px-3 py-1.5 text-xs font-semibold"
                  key={feature}
                >
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="border-line mt-8 flex flex-wrap items-end justify-between gap-4 border-t pt-6">
            <div>
              <span className="text-ink text-3xl font-bold tracking-tight">{usd(price)}</span>
              <span className="text-muted mt-1 block text-xs font-bold">
                {annual
                  ? `per month, ${usd(PLAN_PRICES.ai_credits.annual)} billed yearly`
                  : "per month"}
              </span>
            </div>

            <CheckoutButton
              plan="ai_credits"
              href={`${siteConfig.links.app}/checkout?productKey=ai_credits&interval=${interval}`}
              className="bg-accent hover:bg-accent-strong rounded-xl px-5 py-2.5 font-bold text-white shadow-[0_10px_20px_rgba(37,99,235,0.1)] transition-all duration-150 active:scale-[0.97]"
            >
              Choose {PLAN_NAMES.ai_credits}
            </CheckoutButton>
          </div>
        </article>

        <div className="border-line mx-auto mt-16 max-w-4xl border-t pt-12">
          <div className="from-panel/60 to-panel/20 border-line flex flex-col items-center justify-between gap-8 rounded-[2.2rem] border bg-gradient-to-br p-6 shadow-[0_8px_30px_rgba(17,17,15,0.01)] sm:p-8 md:flex-row">
            <div className="max-w-md">
              <div className="flex items-center gap-2">
                <Zap className="text-accent size-4" aria-hidden="true" />
                <span className="text-accent text-xs font-bold tracking-[0.14em] uppercase">
                  Credit packs
                </span>
              </div>
              <h3 className="text-ink mt-3 text-lg font-bold">Need extra AI credits?</h3>
              <p className="text-muted mt-2 text-sm leading-6">
                Buy a one-time pack, with or without a subscription. Pack credits last{" "}
                <strong className="text-ink font-semibold">{CREDIT_PACK_VALID_DAYS} days</strong>{" "}
                from purchase and go into the same credit balance you use everywhere.
              </p>
              <Link
                href={billingPortalHref}
                className="text-accent mt-4 inline-flex items-center gap-1.5 text-sm font-bold underline-offset-4 hover:underline"
              >
                Buy a pack on the billing page <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>

            <ul className="grid w-full gap-4 sm:grid-cols-3 md:w-auto">
              {CREDIT_PACKS.map((pack) => (
                <li
                  key={pack.credits}
                  className="bg-paper border-line rounded-2xl border p-5 text-center"
                >
                  <span className="text-muted block text-xs font-bold tracking-wider uppercase">
                    {pack.credits.toLocaleString("en-US")} AI credits
                  </span>
                  <span className="text-ink mt-2 block text-2xl font-black">{usd(pack.price)}</span>
                  <span className="text-muted mt-2 block text-xs font-medium">One time</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CustomPlansSection;
