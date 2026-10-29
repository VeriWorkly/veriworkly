"use client";

import { useEffect } from "react";
import { animate, m, useMotionValue, useReducedMotion, useTransform } from "framer-motion";

import { scoreTone, TONE_CLASSES } from "../../data/categories";

const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface ScoreGaugeProps {
  score: number;
  label: string;
  caption?: string;
  size?: "lg" | "sm";
}

const RING_TONE: Record<ReturnType<typeof scoreTone>, string> = {
  good: "text-success",
  warn: "text-warning",
  bad: "text-destructive",
};

export function ScoreGauge({ score, label, caption, size = "lg" }: ScoreGaugeProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const shouldReduceMotion = useReducedMotion();
  const scoreMV = useMotionValue(shouldReduceMotion ? clamped : 0);
  const strokeDashOffset = useTransform(scoreMV, [0, 100], [CIRCUMFERENCE, 0]);
  // Rendered by framer outside React, so the count-up costs no re-render per frame.
  const display = useTransform(scoreMV, Math.round);

  useEffect(() => {
    if (shouldReduceMotion) {
      scoreMV.jump(clamped);
      return;
    }
    const controls = animate(scoreMV, clamped, { duration: 1.1, ease: [0.23, 1, 0.32, 1] });
    return () => controls.stop();
  }, [clamped, scoreMV, shouldReduceMotion]);

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
            className="text-foreground/8"
            strokeWidth="7"
          />
          <m.circle
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
          <m.span
            className={`font-bold tracking-tighter tabular-nums ${
              size === "lg" ? "text-4xl" : "text-3xl"
            }`}
          >
            {display}
          </m.span>
          <span className="text-muted text-sm font-medium">out of 100</span>
        </div>
      </div>
      <div className="text-center">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${TONE_CLASSES[tone].chip}`}
        >
          {label}
        </span>
        {caption ? <p className="text-muted mt-2 max-w-48 text-sm leading-5">{caption}</p> : null}
      </div>
    </div>
  );
}

export default ScoreGauge;
