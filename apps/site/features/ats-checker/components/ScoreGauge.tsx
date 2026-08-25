"use client";

import { useEffect, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from "framer-motion";

import { scoreTone, TONE_CLASSES } from "@/features/ats-checker/categories";

const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface ScoreGaugeProps {
  score: number;
  label: string;
  caption?: string;
  size?: "lg" | "sm";
}

const RING_TONE: Record<ReturnType<typeof scoreTone>, string> = {
  good: "text-emerald-500",
  warn: "text-amber-500",
  bad: "text-red-500",
};

export function ScoreGauge({ score, label, caption, size = "lg" }: ScoreGaugeProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const shouldReduceMotion = useReducedMotion();
  const scoreMV = useMotionValue(shouldReduceMotion ? clamped : 0);
  const strokeDashOffset = useTransform(scoreMV, [0, 100], [CIRCUMFERENCE, 0]);
  const [animated, setAnimated] = useState(0);
  useMotionValueEvent(scoreMV, "change", (latest) => setAnimated(Math.round(latest)));

  useEffect(() => {
    // Counting up is decoration, not information. Under reduced motion there is no animation
    // to run at all - the value below is read straight from the score.
    if (shouldReduceMotion) return;
    const controls = animate(scoreMV, clamped, { duration: 1.1, ease: [0.23, 1, 0.32, 1] });
    return () => controls.stop();
  }, [clamped, scoreMV, shouldReduceMotion]);

  const display = shouldReduceMotion ? clamped : animated;
  const dims = size === "lg" ? 132 : 104;
  const tone = scoreTone(clamped);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative"
        style={{ width: dims, height: dims }}
        role="meter"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${clamped} out of 100`}
      >
        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            className="text-zinc-200 dark:text-white/10"
            strokeWidth="7"
          />
          <motion.circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            className={RING_TONE[tone]}
            strokeWidth="7"
            strokeLinecap="round"
            style={{ strokeDasharray: CIRCUMFERENCE, strokeDashoffset: strokeDashOffset }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`font-semibold tracking-tighter text-zinc-900 tabular-nums dark:text-white ${
              size === "lg" ? "text-4xl" : "text-3xl"
            }`}
          >
            {display}
          </span>
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">out of 100</span>
        </div>
      </div>
      <div className="text-center">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${TONE_CLASSES[tone].chip}`}
        >
          {label}
        </span>
        {caption ? (
          <p className="mt-2 max-w-40 text-xs leading-4 text-zinc-500 dark:text-zinc-400">
            {caption}
          </p>
        ) : null}
      </div>
    </div>
  );
}
