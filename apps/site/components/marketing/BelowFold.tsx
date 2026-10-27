import { Suspense, type ReactNode } from "react";

/**
 * A section below the first screen. `content-visibility` skips its layout until it scrolls
 * near; the Suspense boundary lets React hydrate it as its own unit after the hero, in slices
 * that yield to the browser, instead of inside one long hydration task.
 */
export const BelowFold = ({ children }: { children: ReactNode }) => (
  <div className="below-fold">
    <Suspense>{children}</Suspense>
  </div>
);
