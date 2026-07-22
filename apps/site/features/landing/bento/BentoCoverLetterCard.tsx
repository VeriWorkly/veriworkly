"use client";

import React from "react";
import { motion, MotionValue } from "framer-motion";
import { FileText } from "lucide-react";
import BentoCard from "./BentoCard";

interface BentoCoverLetterCardProps {
  yOffset: MotionValue<number> | number;
  textX: MotionValue<number> | number;
  canHover: boolean;
}

const BentoCoverLetterCard = ({ yOffset, textX, canHover }: BentoCoverLetterCardProps) => {
  return (
    <BentoCard
      className="col-span-1 flex flex-col justify-end border-zinc-200/60 bg-zinc-50/50 sm:col-span-2 sm:row-span-1 dark:border-zinc-800/80 dark:bg-[#0c0c0c]/40"
      glowColor="rgba(6,182,212,0.1)"
      yOffset={yOffset}
      canHover={canHover}
    >
      <div className="absolute top-8 right-8 hidden w-64 rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs sm:block dark:border-zinc-800 dark:bg-[#0c0c0c]/90">
        <div className="mb-2 flex gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
          <div className="font-mono text-[9px] font-semibold tracking-widest text-blue-600 uppercase dark:text-blue-400">
            AI Tailoring
          </div>
        </div>
        <div className="space-y-1.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          I am thrilled to apply for the{" "}
          <motion.span
            style={{ x: textX }}
            className="inline-block rounded bg-blue-100/80 px-1 text-blue-900 dark:bg-blue-950/40 dark:text-blue-300"
          >
            Senior React Developer
          </motion.span>{" "}
          position. My background in{" "}
          <span className="rounded bg-blue-100/80 px-1 text-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
            frontend architecture
          </span>{" "}
          aligns with your goals.
        </div>
      </div>

      <div className="absolute right-8 bottom-8 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-xs transition-transform duration-700 group-hover:scale-110 sm:hidden dark:bg-zinc-950">
        <FileText className="h-5 w-5 text-zinc-900 dark:text-white" strokeWidth={1.5} />
      </div>

      <div className="relative z-10 w-full sm:w-1/2">
        <h3 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
          Contextual Cover Letters
        </h3>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          Generate perfectly toned cover letters that map your experience directly to the role
          requirements.
        </p>
      </div>
    </BentoCard>
  );
};

export default BentoCoverLetterCard;
