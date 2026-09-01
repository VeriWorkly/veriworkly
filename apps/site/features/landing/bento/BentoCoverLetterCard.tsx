"use client";

import { FileText } from "lucide-react";
import type { MotionValue } from "framer-motion";

import BentoCard from "./BentoCard";

interface BentoCoverLetterCardProps {
  yOffset: MotionValue<number> | number;
  canHover: boolean;
}

const BentoCoverLetterCard = ({ yOffset, canHover }: BentoCoverLetterCardProps) => {
  return (
    <BentoCard
      yOffset={yOffset}
      canHover={canHover}
      glowColor="rgba(6,182,212,0.1)"
      className="col-span-1 flex flex-col justify-between border-zinc-200/60 bg-zinc-50/50 sm:col-span-2 sm:row-span-1 dark:border-zinc-800/80 dark:bg-[#0c0c0c]/40"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 sm:h-12 sm:w-12 sm:rounded-full dark:bg-blue-500/15 dark:text-blue-400">
          <FileText className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />
        </div>

        <div className="w-52 rounded-2xl border border-zinc-200/90 bg-white p-3.5 shadow-2xs sm:w-64 sm:p-4 dark:border-zinc-800 dark:bg-[#0c0c0c]/90">
          <div className="mb-1.5 flex items-center gap-1.5 sm:mb-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />

            <span className="font-mono text-[9px] font-bold tracking-wider text-blue-600 uppercase dark:text-blue-400">
              AI Tailoring
            </span>
          </div>

          <p className="text-[11px] leading-relaxed text-zinc-600 sm:text-xs dark:text-zinc-400">
            Applying for{" "}
            <span className="inline-block rounded bg-blue-100/90 px-1.5 py-0.5 font-medium text-blue-900 dark:bg-blue-950/60 dark:text-blue-300">
              Senior React Developer
            </span>{" "}
            - experience matches requirements.
          </p>
        </div>
      </div>

      <div className="relative z-10 mt-6 w-full sm:mt-auto sm:w-3/5">
        <h3 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl dark:text-white">
          Contextual Cover Letters
        </h3>

        <p className="mt-2 text-xs leading-relaxed text-zinc-500 sm:text-sm dark:text-zinc-400">
          Cover Letters That Don&apos;t Sound Like a Robot. Generate matched cover letters that
          sound like you and directly address the hiring manager&apos;s requirements.
        </p>
      </div>
    </BentoCard>
  );
};

export default BentoCoverLetterCard;
