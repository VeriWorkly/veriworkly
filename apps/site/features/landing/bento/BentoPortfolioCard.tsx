"use client";

import { Globe } from "lucide-react";
import { motion, MotionValue } from "framer-motion";

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
        className="absolute top-4 right-4 h-28 w-44 rounded-xl border border-zinc-200/90 bg-white p-2.5 shadow-2xs transition-transform duration-700 group-hover:-translate-x-1 sm:-top-2 sm:-right-4 sm:h-32 sm:w-48 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="mb-2 flex h-4 items-center justify-between border-b border-zinc-100 pb-1 dark:border-zinc-800">
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-red-400" />
            <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </div>

          <span className="font-mono text-[8px] text-zinc-400">gautam.dev</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative h-7 w-7 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 sm:h-8 sm:w-8">
            <span className="absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full border border-white bg-emerald-500 dark:border-zinc-950" />
          </div>

          <div className="flex-1 space-y-1">
            <div className="h-2 w-full rounded bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-1.5 w-2/3 rounded bg-zinc-100 dark:bg-zinc-800" />
          </div>
        </div>
      </motion.div>

      <div className="relative z-10 mt-28 sm:mt-auto">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
          <Globe className="h-5 w-5" strokeWidth={1.5} />
        </div>

        <h3 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">
          Web Portfolios
        </h3>

        <p className="mt-2 text-xs leading-relaxed text-zinc-500 sm:text-sm dark:text-zinc-400">
          Publish your verified projects instantly to a custom subdomain.
        </p>
      </div>
    </BentoCard>
  );
};

export default BentoPortfolioCard;
