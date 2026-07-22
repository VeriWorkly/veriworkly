"use client";

import React from "react";
import { MotionValue } from "framer-motion";
import { Bot } from "lucide-react";
import BentoCard from "./BentoCard";
import AtsGauge from "./AtsGauge";

interface BentoResumeCardProps {
  yOffset: MotionValue<number> | number;
  canHover: boolean;
}

const BentoResumeCard = ({ yOffset, canHover }: BentoResumeCardProps) => {
  return (
    <BentoCard
      className="col-span-1 flex flex-col border-zinc-800 bg-[#060606] sm:col-span-2 sm:row-span-2 dark:border-white/5"
      glowColor="rgba(59,130,246,0.12)"
      yOffset={yOffset}
      canHover={canHover}
    >
      <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
        <Bot className="h-6 w-6 text-white" strokeWidth={1.5} />
      </div>

      <div className="relative z-10 mt-auto w-full sm:w-2/3">
        <h3 className="text-3xl font-semibold tracking-tight text-white">The AI Resume Engine</h3>
        <p className="mt-4 leading-relaxed text-zinc-400">
          Build your master profile once. The AI automatically tailors your resume for specific job
          descriptions, optimizing for ATS systems instantly.
        </p>
      </div>

      <AtsGauge />
    </BentoCard>
  );
};

export default BentoResumeCard;
