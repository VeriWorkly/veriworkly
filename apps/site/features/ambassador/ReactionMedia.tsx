"use client";

import { m, useReducedMotion } from "framer-motion";

import type { ApplyReaction } from "@/features/ambassador/apply-reactions";

export function ReactionMedia({
  reaction,
  className = "",
}: {
  reaction: ApplyReaction;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <figure className={`flex flex-col items-center gap-2 ${className}`}>
      <m.span
        aria-hidden="true"
        className="flex h-20 w-20 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500/10 to-fuchsia-500/10 text-4xl"
        animate={prefersReducedMotion ? undefined : { y: [0, -6, 0], rotate: [0, -6, 6, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 0.8, ease: "easeInOut" }}
      >
        {reaction.emoji}
      </m.span>
      <figcaption className="text-center font-mono text-[10px] tracking-wide text-zinc-400 lowercase dark:text-zinc-500">
        {reaction.caption}
      </figcaption>
    </figure>
  );
}
