"use client";

import { ArrowUpRight, Check, X, Shield, Clock, BadgeDollarSign, Zap } from "lucide-react";

interface ComparisonRow {
  feature: string;
  description: string;
  veriworkly: {
    value: string;
    description: string;
    icon?: React.ComponentType<{ className?: string }>;
  };
  industry: {
    value: string;
    description: string;
  };
}

const COMPARISON_DATA: ComparisonRow[] = [
  {
    feature: "Commission Structure",
    description: "How payouts scale and compound over time.",
    veriworkly: {
      value: "Up to 5% Recurring",
      description: "Lifetime monthly rewards on active accounts.",
      icon: ArrowUpRight,
    },
    industry: {
      value: "Flat Single-Fee",
      description: "One-time payout per user sign up.",
    },
  },
  {
    feature: "Cookie Attribution Window",
    description: "Days allowed between referral click and signup.",
    veriworkly: {
      value: "60-Day Window",
      description: "Attribution matches custom links up to two months.",
      icon: Clock,
    },
    industry: {
      value: "30-Day Limit",
      description: "Attribution drops after one month.",
    },
  },
  {
    feature: "Withdrawal Threshold",
    description: "Minimum balance required to trigger a transfer.",
    veriworkly: {
      value: "$25.00 Payout",
      description: "Instant access to cashflow limits.",
      icon: BadgeDollarSign,
    },
    industry: {
      value: "$100.00 Floor",
      description: "Funds locked behind high payout gates.",
    },
  },
  {
    feature: "Metric Dispatch Speed",
    description: "Time elapsed before click and conversion logs appear.",
    veriworkly: {
      value: "Real-Time Sync",
      description: "State changes update instantaneously on panels.",
      icon: Zap,
    },
    industry: {
      value: "Monthly Audit",
      description: "Conversions sync on a delayed monthly cycle.",
    },
  },
  {
    feature: "Audience Privacy",
    description: "Tracking compliance and security.",
    veriworkly: {
      value: "Privacy Compliance",
      description: "Cookie-safe tracking without invasive network pixels.",
      icon: Shield,
    },
    industry: {
      value: "Third-Party Cookies",
      description: "Standard third-party script triggers.",
    },
  },
];

const AffiliateComparison = () => {
  return (
    <section className="mx-auto max-w-7xl border-t border-zinc-200/50 px-6 py-24 md:py-32 dark:border-zinc-800/30">
      <div className="space-y-16">
        <div className="max-w-xl space-y-4 text-left">
          <span className="w-fit rounded-full bg-blue-500/10 px-3 py-1 font-mono text-[10px] font-bold tracking-widest text-blue-600 uppercase dark:bg-blue-500/20 dark:text-blue-400">
            Program Comparison
          </span>
          <h2 className="text-foreground text-4xl leading-tight font-bold tracking-tight md:text-5xl">
            How We <br />
            <span className="font-serif font-normal text-blue-600 italic dark:text-blue-400">
              Outperform.
            </span>
          </h2>
          <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
            Compare our partner benefits. We remove standard industry hurdles to align payouts with
            your long-term creative and financial success.
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-zinc-200/60 bg-white/40 shadow-sm backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/20">
          <div className="text-muted-foreground grid grid-cols-1 border-b border-zinc-200/60 bg-zinc-50/50 p-6 font-mono text-xs font-bold tracking-wider uppercase md:grid-cols-3 md:p-8 dark:border-zinc-800 dark:bg-zinc-900/10">
            <div>Program Feature</div>
            <div className="mt-4 flex items-center gap-1.5 text-blue-600 md:mt-0 dark:text-blue-400">
              VeriWorkly
            </div>
            <div className="mt-2 md:mt-0">Standard Networks</div>
          </div>

          <div className="divide-y divide-zinc-200/40 dark:divide-zinc-800/40">
            {COMPARISON_DATA.map((row) => (
              <div
                key={row.feature}
                className="grid grid-cols-1 p-6 transition-colors duration-200 hover:bg-zinc-50/30 md:grid-cols-3 md:p-8 dark:hover:bg-zinc-900/5"
              >
                <div className="flex flex-col justify-center space-y-1 pr-4">
                  <h4 className="text-foreground text-sm font-bold tracking-tight">
                    {row.feature}
                  </h4>
                  <p className="text-muted-foreground max-w-70 text-xs leading-relaxed">
                    {row.description}
                  </p>
                </div>

                <div className="mt-4 flex flex-col justify-center space-y-2.5 pr-4 md:mt-0">
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:bg-blue-500/25 dark:text-blue-400">
                      <Check className="h-3 w-3 stroke-[2.5]" />
                    </div>
                    <span className="text-foreground text-sm font-bold tracking-tight">
                      {row.veriworkly.value}
                    </span>
                  </div>
                  <p className="text-muted-foreground pl-7 text-xs leading-relaxed">
                    {row.veriworkly.description}
                  </p>
                </div>

                <div className="mt-4 flex flex-col justify-center space-y-2.5 border-t border-zinc-200/30 pt-4 pl-0 md:mt-0 md:border-t-0 md:pt-0 md:pl-4 dark:border-zinc-800/30">
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600">
                      <X className="h-3 w-3" />
                    </div>
                    <span className="text-muted-foreground text-sm font-medium tracking-tight">
                      {row.industry.value}
                    </span>
                  </div>
                  <p className="text-muted-foreground/60 pl-7 text-xs leading-relaxed">
                    {row.industry.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AffiliateComparison;
