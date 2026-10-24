"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
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
      className="bg-card flex min-h-80 flex-col items-center justify-center rounded-3xl p-8 text-center"
      role="status"
      aria-live="polite"
    >
      <span className="bg-accent/10 text-accent relative flex h-14 w-14 items-center justify-center rounded-full">
        <ScanSearch className="h-6 w-6" aria-hidden="true" />
        <span
          className="bg-accent/20 absolute inset-0 animate-ping rounded-full motion-reduce:animate-none"
          aria-hidden="true"
        />
      </span>
      <div className="mt-6 h-6 overflow-hidden">
        <AnimatePresence mode="wait">
          <m.p
            key={index}
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="text-base font-semibold"
          >
            {steps[index]}
          </m.p>
        </AnimatePresence>
      </div>
      <div
        className="bg-foreground/8 mt-5 h-1.5 w-full max-w-56 overflow-hidden rounded-full"
        aria-hidden="true"
      >
        <m.div
          className="bg-accent h-full rounded-full"
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
