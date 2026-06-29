"use client";

import { Crown, WandSparkles, Zap, Sparkles } from "lucide-react";

import { siteConfig } from "@/config/site";

import { CheckoutButton } from "@/features/pricing/components/CheckoutButton";

const CustomPlansSection = () => {
  return (
    <section className="border-line relative border-b py-24 lg:py-32">
      <div className="bg-accent/5 pointer-events-none absolute top-40 -right-32 size-96 rounded-full blur-3xl" />
      <div className="mx-auto w-[min(1160px,calc(100%-32px))]">
        <div className="mx-auto max-w-2xl text-center">
          <div className="border-line bg-panel text-accent inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold">
            <Sparkles className="size-3.5" /> Ala Carte
          </div>

          <h2 className="text-ink mt-5 text-[clamp(2.4rem,6vw,4rem)] leading-none font-bold tracking-tighter">
            Only need one superpower?
          </h2>

          <p className="text-ink/75 mt-6 text-base leading-7">
            Skip the bundle and choose the specific capability that unblocks you today. You can
            always scale up or customize later as your goals evolve.
          </p>
        </div>

        {/* Two side-by-side compact cards */}
        <div className="mx-auto mt-16 grid max-w-4xl items-stretch gap-8 md:grid-cols-2">
          {/* Card Left: Creator Pro */}
          <article className="border-line bg-panel hover:border-line-strong flex flex-col justify-between rounded-[2.2rem] border-2 p-6 shadow-[0_12px_30px_rgba(17,17,15,0.02)] transition-all duration-300 hover:shadow-[0_16px_40px_rgba(17,17,15,0.04)] sm:p-8">
            <div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Crown className="text-accent size-5" />
                  <span className="text-ink text-sm font-bold">Creator Pro</span>
                </div>
                <span className="bg-accent/10 border-accent/15 text-accent rounded-full border px-2.5 py-0.5 text-[9px] font-bold tracking-wider uppercase">
                  Hosting Only
                </span>
              </div>

              <p className="text-ink/75 mt-6 text-sm leading-6">
                Publish a professional web presence under your own subdomain with CDN media hosting,
                watermark removal, and custom metadata controls.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {[
                  "Public subdomain",
                  "Unlimited pageviews",
                  "SEO meta controls",
                  "Watermark removed",
                  "1.5% checkout fee",
                ].map((feature) => (
                  <span
                    className="border-line bg-paper/60 text-ink/80 rounded-full border px-3 py-1.5 text-xs font-semibold"
                    key={feature}
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>

            <div className="border-line mt-8 flex items-end justify-between gap-4 border-t pt-6">
              <div>
                <span className="text-ink text-3xl font-bold tracking-tight">$9.99</span>
                <span className="text-muted mt-1 block text-[10px] font-bold">per month</span>
              </div>

              <CheckoutButton
                href={`${siteConfig.links.app}/checkout?productKey=portfolio_pro&interval=monthly`}
                className="bg-accent hover:bg-accent-strong rounded-xl px-5 py-2.5 font-bold text-white shadow-[0_10px_20px_rgba(37,99,235,0.1)] transition-all duration-150 active:scale-[0.97]"
              >
                Choose Pro
              </CheckoutButton>
            </div>
          </article>

          {/* Card Right: AI Credits Standalone */}
          <article className="border-line bg-panel hover:border-line-strong flex flex-col justify-between rounded-[2.2rem] border-2 p-6 shadow-[0_12px_30px_rgba(17,17,15,0.02)] transition-all duration-300 hover:shadow-[0_16px_40px_rgba(17,17,15,0.04)] sm:p-8">
            <div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <WandSparkles className="text-accent size-5" />
                  <span className="text-ink text-sm font-bold">AI Standalone</span>
                </div>
                <span className="bg-accent/10 border-accent/15 text-accent rounded-full border px-2.5 py-0.5 text-[9px] font-bold tracking-wider uppercase">
                  No Hosting
                </span>
              </div>

              <p className="text-ink/75 mt-6 text-sm leading-6">
                Tailor unlimited documents, scan for ATS optimization, and draft cover letters using
                our full AI suite.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {[
                  "1,000 monthly credits",
                  "Unlimited document drafts",
                  "Resume & Letter Tailoring",
                  "ATS Match Score",
                  "Profile sync keys",
                ].map((feature) => (
                  <span
                    className="border-line bg-paper/60 text-ink/80 rounded-full border px-3 py-1.5 text-xs font-semibold"
                    key={feature}
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>

            <div className="border-line mt-8 flex items-end justify-between gap-4 border-t pt-6">
              <div>
                <span className="text-ink text-3xl font-bold tracking-tight">$5.99</span>
                <span className="text-muted mt-1 block text-[10px] font-bold">per month</span>
              </div>

              <CheckoutButton
                href={`${siteConfig.links.app}/checkout?productKey=ai_credits&interval=monthly`}
                className="bg-accent hover:bg-accent-strong rounded-xl px-5 py-2.5 font-bold text-white shadow-[0_10px_20px_rgba(37,99,235,0.1)] transition-all duration-150 active:scale-[0.97]"
              >
                Choose AI
              </CheckoutButton>
            </div>
          </article>
        </div>

        {/* One-Time Add-on Credit Packs */}
        <div className="border-line mx-auto mt-16 max-w-4xl border-t pt-12">
          <div className="from-panel/60 to-panel/20 border-line flex flex-col items-center justify-between gap-8 rounded-[2.2rem] border bg-gradient-to-br p-6 shadow-[0_8px_30px_rgba(17,17,15,0.01)] sm:p-8 md:flex-row">
            <div className="max-w-md">
              <div className="flex items-center gap-2">
                <Zap className="text-accent size-4" />
                <span className="text-accent text-[10px] font-bold tracking-[0.14em] uppercase">
                  On-Demand Top-ups
                </span>
              </div>
              <h3 className="text-ink mt-3 text-lg font-bold">⚡ Need extra AI capacity?</h3>
              <p className="text-muted mt-2 text-xs leading-5">
                Top up your active subscription with one-time credit packs. While monthly
                subscription allowances reset each billing cycle, your add-on credits remain active
                for <strong className="text-ink font-semibold">90 days</strong>—perfect for
                high-volume campaign sprints.
              </p>
            </div>

            <div className="grid w-full min-w-[280px] gap-4 sm:min-w-[340px] sm:grid-cols-2 md:w-auto">
              {/* 250 credits */}
              <div className="bg-paper border-line hover:border-line-strong rounded-2xl border p-5 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(17,17,15,0.02)]">
                <span className="text-muted block text-[10px] font-bold tracking-wider uppercase">
                  250 AI Credits
                </span>
                <span className="text-ink mt-2 block text-2xl font-black">$2.99</span>
                <span className="text-muted/80 bg-panel mt-2 block inline-block rounded-md px-2 py-0.5 text-[9px] font-medium">
                  One-time purchase
                </span>
              </div>

              {/* 500 credits */}
              <div className="bg-paper border-line hover:border-line-strong rounded-2xl border p-5 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(17,17,15,0.02)]">
                <span className="text-muted block text-[10px] font-bold tracking-wider uppercase">
                  500 AI Credits
                </span>
                <span className="text-ink mt-2 block text-2xl font-black">$4.99</span>
                <span className="text-muted/80 bg-panel mt-2 block inline-block rounded-md px-2 py-0.5 text-[9px] font-medium">
                  One-time purchase
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CustomPlansSection;
