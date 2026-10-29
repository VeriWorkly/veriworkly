"use client";

/** Read in the browser: the footer is prerendered, and a build-time year would outlive New Year until the next deploy. */
export function CurrentYear() {
  return <span suppressHydrationWarning>{new Date().getFullYear()}</span>;
}
