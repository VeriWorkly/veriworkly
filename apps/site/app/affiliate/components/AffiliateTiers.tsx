"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

const TiersList = [
  {
    name: "Tier 1: Starter",
    commission: "2% Payout",
    requirement: "0–9 Active Referrals",
    description:
      "Perfect for sharing with friends and peers. Earn recurring commission from day one.",
    style: "bg-card/40 border-border/80 text-foreground",
    accent: "text-muted-foreground",
  },
  {
    name: "Tier 2: Growth",
    commission: "3% Payout",
    requirement: "10–49 Active Referrals",
    description: "Accelerate your earnings. Unlock higher payout rates as your network grows.",
    style: "bg-blue-500/5 border-blue-500/30 dark:border-blue-400/20 text-foreground",
    accent: "text-blue-600 dark:text-blue-400",
    badge: "Most Popular",
  },
  {
    name: "Tier 3: Partner",
    commission: "5% Payout",
    requirement: "50+ Active Referrals",
    description:
      "Designed for content creators, bootcamps, and coaches. Premium payouts & support.",
    style: "bg-zinc-950 border-zinc-800 text-white dark:bg-zinc-900/60 dark:border-zinc-800/80",
    accent: "text-amber-400",
    badge: "VIP Tier",
  },
];

export function AffiliateTiers() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
    },
  };

  return (
    <section className="border-border/30 mx-auto max-w-7xl border-t px-6 py-24 md:py-32">
      <div className="grid items-start gap-12 lg:grid-cols-[1fr_2.5fr]">
        {/* Left Editorial Text */}
        <div className="space-y-6 lg:sticky lg:top-24">
          <h2 className="text-foreground text-4xl leading-tight font-extrabold tracking-tight md:text-5xl">
            Select Your <br />
            <span className="font-serif font-normal text-blue-600 italic dark:text-blue-400">
              Growth Pace.
            </span>
          </h2>
          <p className="text-muted max-w-[30ch] text-base leading-relaxed">
            Our three-tier partner program scales your commission rate dynamically as you refer more
            users.
          </p>
        </div>

        {/* Right Asymmetrical Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid gap-6 md:grid-cols-3"
        >
          {TiersList.map((tier) => (
            <motion.div
              key={tier.name}
              variants={cardVariants}
              whileHover={{
                y: -10,
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
              }}
              className={`flex flex-col justify-between rounded-[24px] border p-8 ${tier.style} group relative min-h-[360px] overflow-hidden transition-shadow duration-300`}
            >
              {/* Card top shine */}
              <div className="absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

              <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between">
                  <span className={`font-mono text-[10px] font-bold tracking-widest uppercase`}>
                    {tier.requirement}
                  </span>
                  {tier.badge && (
                    <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[9px] font-black tracking-widest text-blue-600 uppercase dark:bg-blue-400/10 dark:text-blue-400">
                      {tier.badge}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-bold tracking-tight">{tier.name}</h3>
                  <div
                    className={`py-1 font-mono text-4xl font-black tracking-tight md:text-5xl ${tier.accent}`}
                  >
                    {tier.commission}
                  </div>
                  <p className="text-muted-foreground/80 pt-2 text-sm leading-relaxed">
                    {tier.description}
                  </p>
                </div>
              </div>

              <div className="border-border/10 relative z-10 flex items-center justify-between border-t pt-6 dark:border-zinc-800">
                <span className="text-xs font-bold tracking-wider uppercase transition-colors duration-300 group-hover:text-blue-500 dark:group-hover:text-blue-400">
                  Tier Active
                </span>
                <ArrowUpRight className="text-muted-foreground h-4 w-4 opacity-50 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
