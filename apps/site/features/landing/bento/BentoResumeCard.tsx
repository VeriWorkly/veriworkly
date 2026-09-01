import { Bot } from "lucide-react";
import type { MotionValue } from "framer-motion";

import AtsGauge from "./AtsGauge";
import BentoCard from "./BentoCard";

interface BentoResumeCardProps {
  yOffset: MotionValue<number> | number;
  canHover: boolean;
}

const BentoResumeCard = ({ yOffset, canHover }: BentoResumeCardProps) => {
  return (
    <BentoCard
      yOffset={yOffset}
      canHover={canHover}
      glowColor="rgba(59,130,246,0.12)"
      className="col-span-1 flex flex-col justify-between border-zinc-800 bg-[#060606] sm:col-span-2 sm:row-span-2 dark:border-white/5"
    >
      <div className="flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md sm:h-12 sm:w-12 sm:rounded-full">
          <Bot className="h-5 w-5 text-white sm:h-6 sm:w-6" strokeWidth={1.5} />
        </div>

        <div className="flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400 sm:hidden">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
          ATS Score
        </div>
      </div>

      <div className="relative z-10 mt-6 w-full sm:mt-auto sm:w-2/3">
        <h3 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          The AI Resume Engine
        </h3>

        <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:mt-4 sm:text-base">
          Role-Specific Resumes in Seconds. Paste a job description, and the AI highlights your
          relevant achievements and keywords without inventing fake experience.
        </p>
      </div>

      <AtsGauge />
    </BentoCard>
  );
};

export default BentoResumeCard;
