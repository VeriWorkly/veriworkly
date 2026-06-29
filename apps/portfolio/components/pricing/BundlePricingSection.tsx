"use client";

import { useState } from "react";
import { Sparkles, ShieldCheck } from "lucide-react";

import { siteConfig } from "@/config/site";

import { PriceCard } from "@/features/pricing/components/PriceCard";
import { IntervalToggle } from "@/features/pricing/components/IntervalToggle";
import { CheckoutButton } from "@/features/pricing/components/CheckoutButton";

const creatorProFeatures = [
  "Custom subdomain mapping",
  "CDN media hosting & storage",
  "Watermark & branding removed",
  "1.5% commerce checkout fee",
  "1 active resume & cover letter",
  "No AI credits included",
];

const bundleFeatures = [
  "Everything in Creator Pro",
  "Unlimited resumes & cover letters",
  "Master Profile unlocked",
  "GitHub & LinkedIn generators",
  "Legacy PDF/DOCX importer",
  "1,000 monthly AI credits",
];

const BundlePricingSection = () => {
  const [bundleInterval, setBundleInterval] = useState<"monthly" | "annual">("annual");

  const creatorProPrice =
    bundleInterval === "annual"
      ? { amount: "$7.99", cadence: "/ month", note: "$95.88 billed yearly", savings: "Save 20%" }
      : {
          amount: "$9.99",
          cadence: "/ month",
          note: "Billed monthly",
          savings: undefined,
        };

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
    <header className="border-line relative border-b pt-16 pb-20 lg:pt-24 lg:pb-28">
      <div className="bg-accent/12 pointer-events-none absolute top-20 -right-32 size-96 rounded-full blur-3xl" />
      <div className="bg-accent/6 pointer-events-none absolute top-40 -left-32 size-96 rounded-full blur-3xl" />

      <div className="mx-auto w-[min(1160px,calc(100%-32px))]">
        <div className="grid items-end gap-12 lg:grid-cols-[1.3fr_.7fr]">
          <div>
            <p className="border-line bg-panel/60 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold tracking-[0.12em] uppercase backdrop-blur">
              <Sparkles className="text-accent size-3.5" /> Premium Career Platform
            </p>

            <h1 className="text-ink mt-8 max-w-5xl text-[clamp(3.5rem,9vw,6.5rem)] leading-none font-bold tracking-tighter">
              <span className="sr-only">VeriWorkly Portfolio Pricing: </span>
              Flexible plans. <br />{" "}
              <span className="text-accent block sm:inline">Built for growth.</span>
            </h1>
          </div>

          <div className="border-line-strong border-t-2 pt-6">
            <p className="text-ink/75 max-w-md text-base leading-7">
              Publish a premium portfolio webpage and write tailormade resumes with our advanced AI
              suite. Select a flexible plan tailored to your timeline.
            </p>

            <div className="text-accent mt-6 flex items-center gap-3 text-xs font-bold uppercase">
              <ShieldCheck className="size-4" /> Secure checkout by Dodo Payments
            </div>
          </div>
        </div>

        {/* Centered Interval Toggle */}
        <div className="mt-14 flex justify-center">
          <div className="w-full max-w-xs">
            <IntervalToggle value={bundleInterval} onChange={setBundleInterval} />
          </div>
        </div>

        {/* Subscription Plans Grid */}
        <div className="mx-auto mt-10 grid max-w-4xl items-stretch gap-8 md:grid-cols-2">
          <PriceCard
            marker="PRO"
            title="Creator Pro"
            note={creatorProPrice.note}
            features={creatorProFeatures}
            price={creatorProPrice.amount}
            badge={creatorProPrice.savings}
            cadence={creatorProPrice.cadence}
            href={`${siteConfig.links.app}/checkout?productKey=portfolio_pro&interval=${bundleInterval}`}
            description="The dedicated web hosting suite for developers, designers, and professional creators."
          />

          <PriceCard
            featured
            marker="BUNDLE"
            title="Job Hunter Bundle"
            note={bundlePrice.note}
            features={bundleFeatures}
            price={bundlePrice.amount}
            badge={bundlePrice.savings}
            cadence={bundlePrice.cadence}
            href={`${siteConfig.links.app}/checkout?productKey=bundle&interval=${bundleInterval}`}
            description="The complete workspace for active job searches, unlocking AI document tailoring and importers."
          />
        </div>

        {/* Transactional Passes Horizontal Strip */}
        <div className="border-line bg-panel mt-20 rounded-[2.2rem] border-2 p-6 shadow-[0_12px_30px_rgba(17,17,15,0.02)] transition-all duration-300 hover:shadow-[0_16px_40px_rgba(17,17,15,0.04)] sm:p-8">
          <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_1.9fr]">
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="bg-accent absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"></span>
                  <span className="bg-accent relative inline-flex h-2 w-2 rounded-full"></span>
                </span>
                <p className="text-accent text-[10px] font-bold tracking-[0.14em] uppercase">
                  Zero Commitment
                </p>
              </div>
              <h3 className="text-ink mt-3 text-xl font-bold tracking-tight sm:text-2xl">
                Just need a quick fix?
              </h3>
              <p className="text-ink/75 mt-2 max-w-sm text-sm leading-6">
                Tailor resumes for that dream role this weekend, or publish a quick update. Our
                passes automatically expire—no recurring charges, no strings attached.
              </p>
            </div>

            <div className="grid w-full gap-4 sm:grid-cols-2">
              {/* 3-Day Sprint */}
              <div className="border-line from-paper to-panel/50 hover:to-panel hover:border-line-strong flex flex-col justify-between rounded-3xl border bg-gradient-to-br p-5 transition-all duration-250 hover:shadow-[0_8px_20px_rgba(17,17,15,0.02)]">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="bg-accent/10 border-accent/25 text-accent rounded-full border px-2.5 py-0.5 text-[9px] font-bold tracking-wider uppercase">
                      3-Day Sprint
                    </span>
                    <span className="text-muted/60 font-mono text-xs font-bold">03</span>
                  </div>
                  <h4 className="text-ink mt-4 text-base font-bold">3-Day Sprint</h4>
                  <p className="text-muted mt-2 text-[11px] leading-5">
                    Portfolio Pro hosting, ATS optimization tools, unlimited downloads, and 150 AI
                    credits.
                  </p>
                </div>

                {/* Dashed Ticket Divider */}
                <div className="border-line my-4 flex items-end justify-between gap-4 border-t border-dashed pt-4">
                  <div>
                    <span className="text-ink text-2xl font-bold tracking-tight">$2.99</span>
                    <span className="text-muted mt-0.5 block text-[9px] leading-none font-bold">
                      one-time
                    </span>
                  </div>
                  <CheckoutButton
                    href={`${siteConfig.links.app}/checkout?productKey=bundle&interval=one_day`}
                    className="bg-accent hover:bg-accent-strong rounded-xl px-4 py-2.5 text-[10px] font-bold text-white transition-all duration-150 active:scale-[0.97]"
                  >
                    Get Pass
                  </CheckoutButton>
                </div>
              </div>

              {/* 7-Day Hunt */}
              <div className="border-line from-paper to-panel/50 hover:to-panel hover:border-line-strong flex flex-col justify-between rounded-3xl border bg-gradient-to-br p-5 transition-all duration-250 hover:shadow-[0_8px_20px_rgba(17,17,15,0.02)]">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="bg-accent/10 border-accent/25 text-accent rounded-full border px-2.5 py-0.5 text-[9px] font-bold tracking-wider uppercase">
                      7-Day Hunt
                    </span>
                    <span className="text-muted/60 font-mono text-xs font-bold">07</span>
                  </div>
                  <h4 className="text-ink mt-4 text-base font-bold">7-Day Hunt</h4>
                  <p className="text-muted mt-2 text-[11px] leading-5">
                    Portfolio Pro hosting, ATS optimization tools, unlimited downloads, and 400 AI
                    credits.
                  </p>
                </div>

                {/* Dashed Ticket Divider */}
                <div className="border-line my-4 flex items-end justify-between gap-4 border-t border-dashed pt-4">
                  <div>
                    <span className="text-ink text-2xl font-bold tracking-tight">$5.99</span>
                    <span className="text-muted mt-0.5 block text-[9px] leading-none font-bold">
                      one-time
                    </span>
                  </div>
                  <CheckoutButton
                    href={`${siteConfig.links.app}/checkout?productKey=bundle&interval=seven_day`}
                    className="bg-accent hover:bg-accent-strong rounded-xl px-4 py-2.5 text-[10px] font-bold text-white transition-all duration-150 active:scale-[0.97]"
                  >
                    Get Pass
                  </CheckoutButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default BundlePricingSection;
