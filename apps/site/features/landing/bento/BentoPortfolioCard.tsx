"use client";

import React from "react";
import { motion, MotionValue } from "framer-motion";
import { Globe } from "lucide-react";
import BentoCard from "./BentoCard";

interface BentoPortfolioCardProps {
  yOffset: MotionValue<number> | number;
  portfolioTilt: MotionValue<number> | number;
  canHover: boolean;
}

const BentoPortfolioCard = ({ yOffset, portfolioTilt, canHover }: BentoPortfolioCardProps) => {
  return (
    <BentoCard
      className="col-span-1 flex flex-col justify-between border-zinc-200/60 bg-zinc-50/50 dark:border-zinc-800/80 dark:bg-[#0c0c0c]/40"
      glowColor="rgba(59,130,246,0.1)"
      yOffset={yOffset}
      canHover={canHover}
    >
      <motion.div
        style={{ rotateX: portfolioTilt, rotateY: portfolioTilt }}
        className="absolute -top-4 -right-12 h-32 w-48 rounded-xl border border-zinc-200 bg-white p-2 shadow-xs transition-transform duration-700 group-hover:-translate-x-2 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="mb-2 flex h-4 items-center gap-1 border-b border-zinc-100 dark:border-zinc-800">
          <div className="h-1.5 w-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          <div className="h-1.5 w-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-900" />
          <div className="flex-1 space-y-1 pt-1">
            <div className="h-2 w-full rounded bg-zinc-100 dark:bg-zinc-900" />
            <div className="h-2 w-2/3 rounded bg-zinc-100 dark:bg-zinc-900" />
          </div>
        </div>
      </motion.div>

      <div className="relative z-10 mt-auto">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
          <Globe className="h-5 w-5" strokeWidth={1.5} />
        </div>
        <h3 className="text-xl font-semibold text-zinc-900 dark:text-white">Web Portfolios</h3>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Publish instantly to a custom subdomain.
        </p>
      </div>
    </BentoCard>
  );
};

export default BentoPortfolioCard;
