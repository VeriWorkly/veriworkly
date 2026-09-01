import * as React from "react";

import { cn } from "../../utils";

interface AppShellProps {
  children: React.ReactNode;
  navbar?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  mainClassName?: string;
}

/**
 * Renders the one `main` landmark for a page. Nested components must not render their
 * own - a second "main" region makes landmark navigation ambiguous for screen-reader
 * users.
 *
 * The skip link is the first focusable element in the document, satisfying WCAG 2.4.1
 * (Bypass Blocks, Level A). It is visually hidden until focused, so keyboard and
 * screen-reader users can jump past the navbar on every page load instead of tabbing
 * through it each time.
 *
 * `tabIndex={-1}` on the target is required: without it, browsers move the visual
 * viewport to the anchor but leave keyboard focus behind in the navbar, so the next
 * Tab continues from the wrong place and the link accomplishes nothing.
 */
export const AppShell = ({ children, navbar, footer, className, mainClassName }: AppShellProps) => {
  return (
    <div className={cn("flex min-h-screen flex-col", className)}>
      <a
        href="#main-content"
        className="bg-background text-foreground focus-visible:ring-accent sr-only rounded-md px-4 py-2 text-sm font-semibold shadow-lg focus-visible:not-sr-only focus-visible:fixed focus-visible:top-4 focus-visible:left-4 focus-visible:z-100 focus-visible:ring-2 focus-visible:outline-none"
      >
        Skip to main content
      </a>

      {navbar}
      <main id="main-content" tabIndex={-1} className={cn("flex-1", mainClassName)}>
        {children}
      </main>
      {footer}
    </div>
  );
};
