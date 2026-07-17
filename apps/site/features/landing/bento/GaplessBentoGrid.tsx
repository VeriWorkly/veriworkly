"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  useMotionValueEvent,
  useInView,
  animate,
  MotionValue,
} from "framer-motion";
import { Bot, FileText, Globe, Lock, CheckCircle2 } from "lucide-react";
import { cn } from "@veriworkly/ui";
import { useMediaQuery } from "@/hooks/use-media-query";

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  yOffset?: MotionValue<number> | number;
  canHover?: boolean;
}

const BentoCard = ({
  children,
  className = "",
  glowColor = "rgba(59,130,246,0.15)",
  yOffset,
  canHover = true,
}: BentoCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const { left, top } = cardRef.current.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;
    cardRef.current.style.setProperty("--mouse-x", `${x}px`);
    cardRef.current.style.setProperty("--mouse-y", `${y}px`);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      style={{ y: yOffset }}
      className={cn(
        "group relative overflow-hidden rounded-[2.5rem] border border-zinc-200 bg-white p-10 transition-all duration-300 active:scale-[0.98] dark:border-zinc-800/80 dark:bg-[#080808]",
        className,
      )}
    >
      {/* Dynamic Cursor Spotlight Background */}
      <div
        className={`pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 ${
          canHover ? "group-hover:opacity-100" : ""
        }`}
        style={{
          background: `radial-gradient(350px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), ${glowColor}, transparent 80%)`,
        }}
      />
      {/* Dynamic Cursor Spotlight Border */}
      <div
        className={`pointer-events-none absolute inset-0 -z-10 rounded-[2.5rem] p-px opacity-0 transition-opacity duration-300 ${
          canHover ? "group-hover:opacity-100" : ""
        }`}
        style={{
          background: `radial-gradient(180px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), rgba(255,255,255,0.08), transparent)`,
        }}
      />
      {children}
    </motion.div>
  );
};

const AtsGauge = () => {
  const gaugeRef = useRef<HTMLDivElement>(null);
  // Trigger once the gauge scrolls into view, independent of overall page
  // scroll fraction, so the animation reliably completes instead of being
  // pinned to a scroll-progress window that may never be reached.
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

export default function GaplessBentoGrid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const canHover = useMediaQuery("(hover: hover) and (pointer: fine)");

  // Track scroll progress of bento container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  // Parallax offsets for columns - only active on desktop
  const col1YRaw = useTransform(scrollYProgress, [0, 1], isDesktop ? [40, -40] : [0, 0]);
  const col2YRaw = useTransform(scrollYProgress, [0, 1], isDesktop ? [-20, 20] : [0, 0]);

  const col1Y = useSpring(col1YRaw, { stiffness: 50, damping: 20 });
  const col2Y = useSpring(col2YRaw, { stiffness: 50, damping: 20 });

  // Floating keywords text offsets
  const textXRaw = useTransform(scrollYProgress, [0, 1], [-40, 20]);
  const textX = useSpring(textXRaw, { stiffness: 45, damping: 18 });

  // 3D Tilt web portfolio preview frame offset
  const portfolioTiltRaw = useTransform(scrollYProgress, [0, 1], [15, -15]);
  const portfolioTilt = useSpring(portfolioTiltRaw, { stiffness: 50, damping: 20 });

  return (
    <div
      ref={containerRef}
      className="grid grid-flow-dense auto-rows-[340px] grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4"
    >
      {/* Card 1: 2x2 - Resume Engine (Dark Feature Card) */}
      <BentoCard
        className="col-span-1 flex flex-col border-zinc-800 bg-[#060606] sm:col-span-2 sm:row-span-2 dark:border-white/5"
        glowColor="rgba(59,130,246,0.12)"
        yOffset={col1Y}
        canHover={canHover}
      >
        <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
          <Bot className="h-6 w-6 text-white" strokeWidth={1.5} />
        </div>

        <div className="relative z-10 mt-auto w-full sm:w-2/3">
          <h3 className="text-3xl font-semibold tracking-tight text-white">The AI Resume Engine</h3>
          <p className="mt-4 leading-relaxed text-zinc-400">
            Build your master profile once. The AI automatically tailors your resume for specific
            job descriptions, optimizing for ATS systems instantly.
          </p>
        </div>

        {/* Interactive Scroll-Linked ATS Gauge Mockup */}
        <AtsGauge />
      </BentoCard>

      {/* Card 2: 2x1 - Cover Letters */}
      <BentoCard
        className="col-span-1 flex flex-col justify-end border-zinc-200/60 bg-zinc-50/50 sm:col-span-2 sm:row-span-1 dark:border-zinc-800/80 dark:bg-[#0c0c0c]/40"
        glowColor="rgba(6,182,212,0.1)"
        yOffset={col2Y}
        canHover={canHover}
      >
        {/* AI Text Highlight Mockup */}
        <div className="absolute top-8 right-8 hidden w-64 rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs sm:block dark:border-zinc-800 dark:bg-[#0c0c0c]/90">
          <div className="mb-2 flex gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            <div className="font-mono text-[9px] font-semibold tracking-widest text-blue-600 uppercase dark:text-blue-400">
              AI Tailoring
            </div>
          </div>
          <div className="space-y-1.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            I am thrilled to apply for the{" "}
            <motion.span
              style={{ x: textX }}
              className="inline-block rounded bg-blue-100/80 px-1 text-blue-900 dark:bg-blue-950/40 dark:text-blue-300"
            >
              Senior React Developer
            </motion.span>{" "}
            position. My background in{" "}
            <span className="rounded bg-blue-100/80 px-1 text-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
              frontend architecture
            </span>{" "}
            aligns with your goals.
          </div>
        </div>

        <div className="absolute right-8 bottom-8 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-xs transition-transform duration-700 group-hover:scale-110 sm:hidden dark:bg-zinc-950">
          <FileText className="h-5 w-5 text-zinc-900 dark:text-white" strokeWidth={1.5} />
        </div>

        <div className="relative z-10 w-full sm:w-1/2">
          <h3 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            Contextual Cover Letters
          </h3>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            Generate perfectly toned cover letters that map your experience directly to the role
            requirements.
          </p>
        </div>
      </BentoCard>

      {/* Card 3: 1x1 - Custom Portfolios */}
      <BentoCard
        className="col-span-1 flex flex-col justify-between border-zinc-200/60 bg-zinc-50/50 dark:border-zinc-800/80 dark:bg-[#0c0c0c]/40"
        glowColor="rgba(59,130,246,0.1)"
        yOffset={col2Y}
        canHover={canHover}
      >
        {/* Mini Browser UI with 3D Parallax Tilt */}
        <motion.div
          style={{ rotateX: portfolioTilt, rotateY: portfolioTilt }}
          className="absolute -top-4 -right-12 h-32 w-48 rounded-xl border border-zinc-200 bg-white p-2 shadow-xs transition-transform duration-700 group-hover:-translate-x-2 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div className="mb-2 flex h-4 items-center gap-1 border-b border-zinc-100 dark:border-zinc-800">
            <div className="h-1.5 w-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            <div className="h-1.5 w-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-900" />
            <div className="flex-1 space-y-1 pt-1">
              <div className="h-2 w-full rounded bg-zinc-100 dark:bg-zinc-900" />
              <div className="h-2 w-2/3 rounded bg-zinc-100 dark:bg-zinc-900" />
            </div>
          </div>
        </motion.div>

        <div className="relative z-10 mt-auto">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Globe className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <h3 className="text-xl font-semibold text-zinc-900 dark:text-white">Web Portfolios</h3>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Publish instantly to a custom subdomain.
          </p>
        </div>
      </BentoCard>

      {/* Card 4: 1x1 - Privacy */}
      <BentoCard
        className="col-span-1 flex flex-col justify-between border-zinc-800 bg-[#060606] text-white dark:border-white/5"
        glowColor="rgba(16,185,129,0.12)"
        yOffset={col1Y}
        canHover={canHover}
      >
        <div className="relative flex h-16 w-16 items-center justify-center">
          {/* Pulsing Ripple rings */}
          <div
            className="absolute inset-0 animate-ping rounded-full bg-emerald-500/5"
            style={{ animationDuration: "3s" }}
          />
          <div className="absolute inset-2 animate-pulse rounded-full bg-emerald-500/10" />
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl" />
          <Lock className="relative z-10 h-6 w-6 text-emerald-400" strokeWidth={1.5} />
        </div>

        <div className="relative z-10 mt-auto">
          <h3 className="text-xl font-semibold text-white">Privacy First</h3>
          <p className="mt-2 text-sm text-zinc-400">No login required. Local storage only.</p>
        </div>
      </BentoCard>
    </div>
  );
}
