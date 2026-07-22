"use client";

import { useState } from "react";
import { motion, useTransform, useSpring, type MotionValue } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";

const InteractiveCTAMockup = ({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) => {
  const [isHovered, setIsHovered] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const canHover = useMediaQuery("(hover: hover) and (pointer: fine)");

  const mockupYRaw = useTransform(scrollYProgress, [0, 1], [30, -30]);
  const springY = useSpring(mockupYRaw, { stiffness: 50, damping: 20 });
  const mockupY = useTransform(springY, (v) => (isDesktop ? v : 0));

  return (
    <motion.div style={{ y: mockupY }} className="flex w-full justify-center">
      <motion.div
        className="group/card relative w-full max-w-sm cursor-pointer overflow-hidden rounded-4xl border border-zinc-200 bg-white p-7 shadow-xs dark:border-zinc-800 dark:bg-[#0c0c0c]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={canHover ? { y: -8, scale: 1.02 } : {}}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(150px_circle_at_center,rgba(59,130,246,0.04),transparent)] opacity-0 transition-opacity duration-300 group-hover/card:opacity-100" />

        <div className="mb-5 flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-900">
          <span className="font-mono text-[10px] font-bold tracking-widest text-zinc-400 uppercase">
            Interactive Tailoring
          </span>
          <span className="font-mono text-[10px] text-zinc-400">Hover to scan</span>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <div className="h-3 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-2 w-1/4 rounded bg-zinc-100 dark:bg-zinc-900" />
          </div>

          <div className="space-y-2.5 rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-900 dark:bg-zinc-950/40">
            <div className="h-2.5 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800" />
            <p className="min-h-10 text-[12px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              {!isHovered ? (
                <span>Built responsive templates using standard styling protocols.</span>
              ) : (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-medium text-zinc-900 dark:text-white"
                >
                  Architected{" "}
                  <span className="rounded bg-blue-500/10 px-1 text-blue-600 dark:text-blue-400">
                    Next.js responsive design systems
                  </span>{" "}
                  to optimize Core Web Vitals.
                </motion.span>
              )}
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-900">
            <div className="flex items-center gap-2">
              <CheckCircle2
                className={`h-4 w-4 ${isHovered ? "text-emerald-500" : "text-zinc-300"}`}
              />
              <span className="font-mono text-[10px] font-bold tracking-widest text-zinc-400 uppercase">
                ATS Score
              </span>
            </div>
            <div className="text-right">
              <span
                className={`text-xl font-black ${isHovered ? "animate-pulse text-emerald-500" : "text-zinc-400"}`}
              >
                {isHovered ? "98%" : "72%"}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default InteractiveCTAMockup;
