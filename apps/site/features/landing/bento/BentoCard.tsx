"use client";

import React, { useRef } from "react";
import { motion, MotionValue } from "framer-motion";
import { cn } from "@veriworkly/ui";

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
      <div
        className={`pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 ${
          canHover ? "group-hover:opacity-100" : ""
        }`}
        style={{
          background: `radial-gradient(350px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), ${glowColor}, transparent 80%)`,
        }}
      />
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

export default BentoCard;
