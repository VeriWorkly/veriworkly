"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ScanSearch } from "lucide-react";

const STEPS_WITH_TARGET = [
  "Reading document structure…",
  "Checking parsing compatibility…",
  "Scanning for measurable impact…",
  "Matching keywords against the target role…",
];

const STEPS_WITHOUT_TARGET = [
  "Reading document structure…",
  "Checking parsing compatibility…",
  "Reviewing content and evidence quality…",
];

const STEP_DURATION_MS = 420;

interface ScanLoaderProps {
  hasTarget: boolean;
}

export function ScanLoader({ hasTarget }: ScanLoaderProps) {
  const steps = hasTarget ? STEPS_WITH_TARGET : STEPS_WITHOUT_TARGET;
  const shouldReduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= steps.length - 1) return;
    const timer = setTimeout(() => setIndex((current) => current + 1), STEP_DURATION_MS);
    return () => clearTimeout(timer);
  }, [index, steps.length]);

  const progress = ((index + 1) / steps.length) * 100;

  return (
    <div
      className="flex min-h-80 flex-col items-center justify-center rounded-3xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-white/2"
      role="status"
      aria-live="polite"
    >
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
        <ScanSearch className="h-6 w-6" aria-hidden="true" />
        <span
          className="absolute inset-0 animate-ping rounded-full bg-blue-500/20"
          aria-hidden="true"
        />
      </span>
      <div className="mt-6 h-6 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="text-sm font-semibold text-zinc-800 dark:text-zinc-100"
          >
            {steps[index]}
          </motion.p>
        </AnimatePresence>
      </div>
      <div
        className="mt-5 h-1.5 w-full max-w-56 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/10"
        aria-hidden="true"
      >
        <motion.div
          className="h-full rounded-full bg-blue-600"
          animate={{ width: `${progress}%` }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.3, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export const SCAN_LOADER_MIN_MS = (hasTarget: boolean) =>
  (hasTarget ? STEPS_WITH_TARGET.length : STEPS_WITHOUT_TARGET.length) * STEP_DURATION_MS;

export default ScanLoader;
