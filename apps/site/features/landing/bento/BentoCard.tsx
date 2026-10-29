"use client";

import React, { useRef } from "react";

import { cn } from "@veriworkly/ui";

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  drift?: "up" | "down";
}

const BentoCard = ({
  children,
  className = "",
  glowColor = "rgba(59,130,246,0.15)",
  drift,
}: BentoCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const rectRef = useRef<DOMRect | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    rectRef.current ??= cardRef.current.getBoundingClientRect();
    const { left, top } = rectRef.current;

    const x = e.clientX - left;
    const y = e.clientY - top;

    cardRef.current.style.setProperty("--mouse-x", `${x}px`);
    cardRef.current.style.setProperty("--mouse-y", `${y}px`);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => (rectRef.current = null)}
      // Scrolling moves the card under a still pointer, so the cached box is stale.
      onWheel={() => (rectRef.current = null)}
      className={cn(
        "group relative overflow-clip rounded-3xl border border-zinc-200 bg-white p-6 transition-all duration-300 active:scale-[0.98] sm:rounded-[2.5rem] sm:p-8 lg:p-10 dark:border-zinc-800/80 dark:bg-[#080808]",
        drift === "up" && "scroll-shift lg:[--sy0:40px] lg:[--sy1:-40px]",
        drift === "down" && "scroll-shift lg:[--sy0:-20px] lg:[--sy1:20px]",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 pointer-fine:group-hover:opacity-100"
        style={{
          background: `radial-gradient(350px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), ${glowColor}, transparent 80%)`,
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 -z-10 rounded-[2.5rem] p-px opacity-0 transition-opacity duration-300 pointer-fine:group-hover:opacity-100"
        style={{
          background: `radial-gradient(180px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), rgba(255,255,255,0.08), transparent)`,
        }}
      />
      {children}
    </div>
  );
};

export default BentoCard;
