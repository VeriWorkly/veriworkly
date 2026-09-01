"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

import type { ApplyReaction } from "@/features/ambassador/apply-reactions";

/**
 * The meme slot for a question. Renders a self-hosted image when one is configured, and
 * an animated emoji sticker otherwise, so the flow looks intentional whether or not
 * anyone has committed assets yet.
 *
 * Degrades in three directions:
 *  - no `src` configured  -> emoji sticker
 *  - `src` fails to load  -> emoji sticker (a 404 must not leave a broken-image icon in
 *                            the middle of a signup flow)
 *  - reduced motion       -> emoji sticker, unanimated
 */
export function ReactionMedia({
  reaction,
  className = "",
}: {
  reaction: ApplyReaction;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const [failed, setFailed] = useState(false);

  const showImage = Boolean(reaction.src) && !failed && !prefersReducedMotion;

  return (
    <figure className={`flex flex-col items-center gap-2 ${className}`}>
      {showImage ? (
        <div className="relative h-32 w-full max-w-56 overflow-hidden rounded-2xl border border-zinc-200/70 bg-zinc-100 dark:border-white/10 dark:bg-white/5">
          <Image
            // `showImage` is only true when src is a non-empty string.
            src={reaction.src as string}
            alt={reaction.alt}
            fill
            sizes="224px"
            unoptimized
            className="object-cover"
            onError={() => setFailed(true)}
          />
        </div>
      ) : (
        <motion.span
          aria-hidden="true"
          className="flex h-20 w-20 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500/10 to-fuchsia-500/10 text-4xl"
          animate={prefersReducedMotion ? undefined : { y: [0, -6, 0], rotate: [0, -6, 6, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 0.8, ease: "easeInOut" }}
        >
          {reaction.emoji}
        </motion.span>
      )}
      <figcaption className="text-center font-mono text-[10px] tracking-wide text-zinc-400 lowercase dark:text-zinc-500">
        {reaction.caption}
      </figcaption>
    </figure>
  );
}
