"use client";

import { useState } from "react";
import { Users, Sparkles, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const AffiliateCalculator = () => {
  const [referrals, setReferrals] = useState(50);
  const [selectedPlan, setSelectedPlan] = useState<"pro" | "bundle">("pro");

  const getTierDetails = (count: number) => {
    if (count >= 50) {
      return {
        tier: "Tier 3: Partner",
        rate: 0.05,
        ratePercent: "5%",
        nextTier: null,
        needed: 0,
      };
    }
    if (count >= 10) {
      return {
        tier: "Tier 2: Growth",
        rate: 0.03,
        ratePercent: "3%",
        nextTier: "Tier 3: Partner",
        needed: 50 - count,
      };
    }
    return {
      tier: "Tier 1: Starter",
      rate: 0.02,
      ratePercent: "2%",
      nextTier: "Tier 2: Growth",
      needed: 10 - count,
    };
  };

  const { tier, rate, ratePercent, nextTier, needed } = getTierDetails(referrals);

  const planPrice = selectedPlan === "pro" ? 9.99 : 14.99;
  const monthlyCommissionPerUser = planPrice * rate;
  const monthlyEarnings = referrals * monthlyCommissionPerUser;
  const annualEarnings = monthlyEarnings * 12;

  let progressPercent = 0;
  if (referrals < 10) {
    progressPercent = (referrals / 10) * 100;
  } else if (referrals < 50) {
    progressPercent = ((referrals - 10) / (50 - 10)) * 100;
  } else {
    progressPercent = 100;
  }

  return (
    <section
      id="earnings-calculator"
      className="border-border/30 mx-auto max-w-7xl scroll-mt-24 border-t px-6 py-24 md:py-32"
    >
      <div className="grid items-center gap-16 lg:grid-cols-2">
        <div className="flex flex-col justify-center space-y-8">
          <div className="space-y-4">
            <div className="inline-flex max-w-fit items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-blue-600 dark:bg-blue-500/25 dark:text-blue-400">
              <Sparkles className="h-3 w-3 animate-pulse" />
              <span className="font-mono text-[10px] font-black tracking-widest uppercase">
                Interactive Yield Estimator
              </span>
            </div>
            <h3 className="text-foreground text-4xl leading-[1.15] font-extrabold tracking-tight md:text-5xl">
              Watch Your <br />
              <span className="font-serif font-normal text-blue-600 italic dark:text-blue-400">
                Revenue Compound.
              </span>
            </h3>
            <p className="text-muted max-w-md text-base leading-relaxed">
              Select a target subscription model and adjust the referral slider to simulate active
              subscribers. Calculations respond dynamically to state shifts.
            </p>
          </div>

          <div className="border-border/40 space-y-6 border-t pt-4 dark:border-zinc-800">
            <div className="space-y-1">
              <div className="text-muted font-mono text-[11px] font-bold tracking-widest uppercase">
                Estimated Monthly Recurring Revenue
              </div>
              <div className="text-foreground flex items-baseline font-mono text-6xl font-black tracking-tighter select-none md:text-7xl">
                <span className="text-muted-foreground mr-1 text-3xl font-semibold">$</span>
                <motion.span
                  key={`${monthlyEarnings}-${selectedPlan}`}
                  initial={{ scale: 0.92, opacity: 0.8, filter: "blur(2px)" }}
                  animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                >
                  {monthlyEarnings.toFixed(2)}
                </motion.span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-muted font-mono text-[11px] font-bold tracking-widest uppercase">
                Annual Yield Projection (ARR)
              </div>
              <div className="text-foreground/80 flex items-baseline font-mono text-3xl font-extrabold tracking-tight select-none">
                <span className="text-muted-foreground mr-1 text-base font-medium">$</span>
                <motion.span
                  key={`${annualEarnings}-${selectedPlan}`}
                  initial={{ opacity: 0.8 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {annualEarnings.toFixed(2)}
                </motion.span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-border/80 bg-card/45 relative overflow-hidden rounded-[28px] border p-8 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.08)] backdrop-blur-md md:p-10 dark:border-zinc-800 dark:bg-zinc-900/35">
          <div className="pointer-events-none absolute top-0 right-0 h-40 w-40 rounded-full bg-blue-500/5 blur-3xl" />

          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-foreground flex items-center gap-2 text-sm font-semibold">
                Subscription Plan Level
              </label>
              <div className="border-border/60 grid grid-cols-2 gap-2 rounded-2xl border bg-zinc-100/50 p-1.5 dark:border-zinc-800/80 dark:bg-zinc-950/40">
                <button
                  onClick={() => setSelectedPlan("pro")}
                  className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-200 ${
                    selectedPlan === "pro"
                      ? "bg-white text-blue-600 shadow-sm dark:bg-zinc-900 dark:text-blue-400"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Creator Pro ($9.99/mo)
                </button>
                <button
                  onClick={() => setSelectedPlan("bundle")}
                  className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-200 ${
                    selectedPlan === "bundle"
                      ? "bg-white text-blue-600 shadow-sm dark:bg-zinc-900 dark:text-blue-400"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Job Hunter ($14.99/mo)
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm font-semibold">
                <label className="text-foreground flex items-center gap-2 font-medium">
                  <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Referred Members
                </label>
                <span className="rounded-full border border-blue-500/10 bg-blue-500/5 px-4 py-1.5 font-mono text-lg font-black text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  {referrals} active
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="250"
                step="2"
                value={referrals}
                onChange={(e) => setReferrals(Number(e.target.value))}
                className="custom-slider my-4"
              />

              <div className="text-muted-foreground/60 flex justify-between font-mono text-[9px] font-bold tracking-widest uppercase">
                <span>0 Referrals</span>
                <span>50 (Partner Tier)</span>
                <span>250 Referrals</span>
              </div>
            </div>

            <div className="border-border/80 space-y-4 rounded-2xl border bg-zinc-100/30 p-6 dark:border-zinc-800/80 dark:bg-zinc-950/25">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted font-medium">Current Status:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{tier}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted font-medium">Commission Rate:</span>
                <span className="text-foreground font-mono font-extrabold">
                  {ratePercent} Recurring
                </span>
              </div>

              {nextTier && (
                <div className="border-border/50 space-y-2 border-t pt-3 dark:border-zinc-800/50">
                  <div className="text-muted flex justify-between text-[10px] font-bold tracking-widest uppercase">
                    <span>Progress to {nextTier}</span>
                    <span>{needed} members needed</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-500"
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="text-muted-foreground/80 flex items-start gap-3 rounded-2xl border border-blue-500/10 bg-blue-500/5 p-4 text-xs leading-relaxed">
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <p>
                Calculates yield based on the active plan level select: **Creator Pro ($9.99/mo)**
                or **Job Hunter Bundle ($14.99/mo)**. Commission payouts occur monthly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AffiliateCalculator;
