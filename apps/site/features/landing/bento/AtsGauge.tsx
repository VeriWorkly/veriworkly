"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useTransform,
  useMotionValueEvent,
  animate,
} from "framer-motion";
import { CheckCircle2 } from "lucide-react";

const AtsGauge = () => {
  const gaugeRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(gaugeRef, { once: true, amount: 0.5 });

  const scoreMV = useMotionValue(0);
  const strokeDashOffset = useTransform(scoreMV, [0, 98], [277, 277 - 271]);

  const [score, setScore] = useState(0);
  useMotionValueEvent(scoreMV, "change", (latest) => setScore(Math.round(latest)));

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(scoreMV, 98, {
      duration: 1.4,
      delay: 0.2,
      ease: [0.23, 1, 0.32, 1],
    });
    return () => controls.stop();
  }, [isInView, scoreMV]);

  return (
    <div
      ref={gaugeRef}
      className="absolute top-1/2 right-10 hidden h-64 w-64 -translate-y-1/2 flex-col items-center justify-center rounded-3xl border border-white/5 bg-white/2 p-6 backdrop-blur-md transition-transform duration-700 ease-out group-hover:scale-[1.03] lg:flex"
    >
      <div className="relative flex h-32 w-32 items-center justify-center">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="currentColor"
            className="text-white/5"
            strokeWidth="5"
          />
          <motion.circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="currentColor"
            className="text-blue-500"
            strokeWidth="5"
            strokeLinecap="round"
            style={{
              strokeDasharray: "277",
              strokeDashoffset: strokeDashOffset,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tracking-tighter text-white">
            <span>{score}</span>
            <span className="text-lg text-zinc-400">%</span>
          </span>
        </div>
      </div>
      <div className="mt-6 flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-400">
        <CheckCircle2 className="h-4 w-4" />
        ATS Optimized
      </div>
    </div>
  );
};

export default AtsGauge;
