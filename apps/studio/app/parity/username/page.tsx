import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { UsernameHarness } from "./UsernameHarness";

export const metadata: Metadata = {
  title: "Username harness",
  robots: { index: false, follow: false },
};

/**
 * Test-only surface: `tests/browser/editor-behavior.test.ts` sets a username here against a
 * stubbed API, since the real modal sits on the signed-in profile page (S-243).
 *
 * It renders the modal with no auth, so it must never exist in a production build.
 */
export default function UsernameHarnessPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return <UsernameHarness />;
}
