"use client";

import React from "react";
import { MotionValue } from "framer-motion";
import { Lock } from "lucide-react";
import BentoCard from "./BentoCard";

interface BentoPrivacyCardProps {
  yOffset: MotionValue<number> | number;
  canHover: boolean;
}

const BentoPrivacyCard = ({ yOffset, canHover }: BentoPrivacyCardProps) => {
  return (
    <BentoCard
      className="col-span-1 flex flex-col justify-between border-zinc-800 bg-[#060606] text-white dark:border-white/5"
      glowColor="rgba(16,185,129,0.12)"
      yOffset={yOffset}
      canHover={canHover}
    >
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div
          className="absolute inset-0 animate-ping rounded-full bg-emerald-500/5"
          style={{ animationDuration: "3s" }}
        />
        <div className="absolute inset-2 animate-pulse rounded-full bg-emerald-500/10" />
        <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl" />
        <Lock className="relative z-10 h-6 w-6 text-emerald-400" strokeWidth={1.5} />
      </div>

      <div className="relative z-10 mt-auto">
        <h3 className="text-xl font-semibold text-white">Privacy First</h3>
        <p className="mt-2 text-sm text-zinc-400">No login required. Local storage only.</p>
      </div>
    </BentoCard>
  );
};

export default BentoPrivacyCard;
