"use client";

import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import InteractiveCTAMockup from "@/features/marketing/cta/InteractiveCTAMockup";

const InteractiveCTAGlowCard = ({ children }: { children: ReactNode }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const glowScaleRaw = useTransform(scrollYProgress, [0, 0.5, 1], [0.85, 1.3, 0.85]);
  const glowScale = useSpring(glowScaleRaw, { stiffness: 40, damping: 18 });

  const glowOpacityRaw = useTransform(scrollYProgress, [0, 0.5, 1], [0.12, 0.4, 0.12]);
  const glowOpacity = useSpring(glowOpacityRaw, { stiffness: 40, damping: 18 });

  const glowRotateRaw = useTransform(scrollYProgress, [0, 1], [-8, 8]);
  const glowRotate = useSpring(glowRotateRaw, { stiffness: 40, damping: 18 });

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-[3rem] border border-zinc-200 bg-zinc-50/50 p-10 md:p-20 dark:border-zinc-800/80 dark:bg-[#080808]"
    >
      <motion.div
        style={{ scale: glowScale, opacity: glowOpacity, rotate: glowRotate }}
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,var(--color-accent)_0%,transparent_60%)] blur-2xl"
      />
      <motion.div
        style={{ scale: glowScale, opacity: glowOpacity }}
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,#06b6d4_0%,transparent_55%)] opacity-30 blur-2xl"
      />

      <div className="relative z-10 grid grid-cols-1 items-center gap-16 lg:grid-cols-12 lg:gap-24">
        {children}

        <div className="flex w-full items-center justify-center lg:col-span-5">
          <InteractiveCTAMockup scrollYProgress={scrollYProgress} />
        </div>
      </div>
    </div>
  );
};

export default InteractiveCTAGlowCard;
