import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { AdminShellHarness } from "./AdminShellHarness";

export const metadata: Metadata = {
  title: "Admin shell harness",
  robots: { index: false, follow: false },
};

/**
 * Test-only surface: `tests/browser/admin-console.test.ts` drives the admin chrome here (command
 * palette, navigation drawer, sign-out, dashboard sync, the confirmation dialog). The real
 * `/admin` needs the configured admin's session and a live API; the browser test stubs the API
 * calls these controls make instead.
 *
 * It renders the admin shell with no auth, so it must never exist in a production build.
 */
export default function AdminShellHarnessPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return <AdminShellHarness />;
}
