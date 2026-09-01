"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";

/**
 * Honours `prefers-reduced-motion` for every framer-motion animation in the app.
 * The CSS block in `@veriworkly/ui/styles/globals.css` only neutralises CSS
 * animations/transitions - framer-motion drives inline transforms from JS and
 * has to be opted in separately.
 *
 * This stays in the root layout deliberately, and an audit finding suggesting it be
 * pushed down to the animating route groups was declined. The navbar animates
 * (ActionsPill, DesktopNav, MobileMenu all import framer-motion) and renders on every
 * page, so the library is in every route's bundle either way - including /privacy and
 * /terms. Moving the provider would not remove a byte; it would only create routes
 * where a motion-sensitive user's preference is silently ignored.
 *
 * Individual `useReducedMotion` checks in Reveal and elsewhere are a belt-and-braces
 * measure for components that branch on the preference rather than just scaling their
 * animation, not a replacement for this.
 */
export const MotionProvider = ({ children }: { children: ReactNode }) => {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
};
