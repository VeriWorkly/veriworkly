"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";

/**
 * Honours `prefers-reduced-motion` for every framer-motion animation in the app.
 * The CSS block in `@veriworkly/ui/styles/globals.css` only neutralises CSS
 * animations/transitions - framer-motion drives inline transforms from JS and
 * has to be opted in separately.
 */
export const MotionProvider = ({ children }: { children: ReactNode }) => {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
};
