import { Lock } from "lucide-react";
import type { MotionValue } from "framer-motion";

import BentoCard from "./BentoCard";

interface BentoPrivacyCardProps {
  yOffset: MotionValue<number> | number;
  canHover: boolean;
}

const BentoPrivacyCard = ({ yOffset, canHover }: BentoPrivacyCardProps) => {
  return (
    <BentoCard
      yOffset={yOffset}
      canHover={canHover}
      glowColor="rgba(16,185,129,0.12)"
      className="col-span-1 flex flex-col justify-between border-zinc-800 bg-[#060606] text-white dark:border-white/5"
    >
      <div className="flex items-center justify-between">
        <div className="relative flex h-14 w-14 items-center justify-center sm:h-16 sm:w-16">
          <div
            className="absolute inset-0 animate-ping rounded-full bg-emerald-500/5"
            style={{ animationDuration: "3s" }}
          />
          <div className="absolute inset-2 animate-pulse rounded-full bg-emerald-500/10" />
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl" />

          <Lock className="relative z-10 h-5 w-5 text-emerald-400 sm:h-6 sm:w-6" strokeWidth={1.5} />
        </div>

        <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wide text-emerald-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          Local Vault
        </span>
      </div>

      <div className="relative z-10 mt-6 sm:mt-auto">
        <h3 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">Privacy First</h3>
        <p className="mt-2 text-xs leading-relaxed text-zinc-400 sm:text-sm">
          Client-side PDF compiler. Your master career data remains stored locally on your device.
        </p>
      </div>
    </BentoCard>
  );
};

export default BentoPrivacyCard;
