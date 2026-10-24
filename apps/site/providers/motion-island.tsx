"use client";

import type { ReactNode } from "react";
import { LazyMotion, MotionConfig, domAnimation } from "framer-motion";

/**
 * Framer for the pages that animate with it, and only those. Components use `m.*`, which
 * carries no animation code of its own; this supplies the `domAnimation` feature set. Pages
 * that need layout animations (layout, layoutId) use LayoutMotionIsland instead; the two live
 * in separate modules so a page only bundles the set it uses.
 *
 * It used to be one MotionConfig in the root layout, which put framer on every route. The
 * CSS reduced-motion kill switch does not reach framer's inline transforms, so each island
 * keeps `reducedMotion="user"` (W-026, W-027). `strict` makes a stray full `motion.*` import
 * throw in development instead of silently re-bundling every feature.
 */
export const MotionIsland = ({ children }: { children: ReactNode }) => (
  <LazyMotion features={domAnimation} strict>
    <MotionConfig reducedMotion="user">{children}</MotionConfig>
  </LazyMotion>
);
