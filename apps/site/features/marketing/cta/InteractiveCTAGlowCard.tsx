import type { ReactNode } from "react";

import InteractiveCTAMockup from "@/features/marketing/cta/InteractiveCTAMockup";

const InteractiveCTAGlowCard = ({ children }: { children: ReactNode }) => {
  return (
    <div className="relative overflow-hidden rounded-[3rem] border border-zinc-200 bg-zinc-50/50 p-10 md:p-20 dark:border-zinc-800/80 dark:bg-[#080808]">
      <div className="glow-scroll pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,var(--color-accent)_0%,transparent_60%)] blur-2xl" />

      <div className="glow-scroll-still pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,#06b6d4_0%,transparent_55%)] opacity-30 blur-2xl" />

      <div className="relative z-10 grid grid-cols-1 items-center gap-16 lg:grid-cols-12 lg:gap-24">
        {children}

        <div className="flex w-full items-center justify-center lg:col-span-5">
          <InteractiveCTAMockup />
        </div>
      </div>
    </div>
  );
};

export default InteractiveCTAGlowCard;
