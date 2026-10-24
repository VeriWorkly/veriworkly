"use client";

import type { ReactNode } from "react";
import { LazyMotion, MotionConfig, domMax } from "framer-motion";

/** MotionIsland with layout animations (`domMax`), for the landing page and /ambassador. */
export const LayoutMotionIsland = ({ children }: { children: ReactNode }) => (
  <LazyMotion features={domMax} strict>
    <MotionConfig reducedMotion="user">{children}</MotionConfig>
  </LazyMotion>
);
