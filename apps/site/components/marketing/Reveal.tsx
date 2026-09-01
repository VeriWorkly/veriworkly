"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";

interface RevealProps extends HTMLMotionProps<"div"> {
  delay?: number;
  /**
   * Set on above-the-fold content. Skips the hidden initial state so the block
   * paints on the server render instead of waiting for hydration - starting the
   * LCP candidate at `opacity: 0` measurably delays it.
   */
  priority?: boolean;
}

export function Reveal({ children, delay = 0, priority = false, ...props }: RevealProps) {
  const shouldReduceMotion = useReducedMotion();
  const skipEntrance = priority || shouldReduceMotion;

  return (
    <motion.div
      initial={skipEntrance ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, delay, ease: [0.23, 1, 0.32, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
