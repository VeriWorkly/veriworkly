"use client";

import type { ReactNode } from "react";
import { LazyMotion, MotionConfig } from "framer-motion";

const loadFeatures = () => import("./motion-features").then((module) => module.default);

/** Each island keeps reducedMotion="user" (the CSS kill switch misses framer's inline transforms); `strict` throws on a full `motion.*` import. Features load after first paint. */
export const MotionIsland = ({ children }: { children: ReactNode }) => (
  <LazyMotion features={loadFeatures} strict>
    <MotionConfig reducedMotion="user">{children}</MotionConfig>
  </LazyMotion>
);
