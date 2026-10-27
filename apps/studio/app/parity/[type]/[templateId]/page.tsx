import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { PARITY_FIXTURE_IDS, type ParityFixtureId } from "@/tests/parity/fixtures";
import { PAPER_SIZES, type PaperSize } from "@/templates/shared/page-geometry";

import { ParityClient } from "./ParityClient";

const PARITY_TYPES = ["resume", "cover-letter"] as const;

type ParityType = (typeof PARITY_TYPES)[number];

export const metadata: Metadata = {
  title: "Preview parity harness",
  robots: { index: false, follow: false },
};

/**
 * Test-only surface: `tests/parity/resume-parity.test.ts` and
 * `tests/parity/cover-letter-parity.test.ts` drive a headless
 * Chromium at this route and assert the boxes it measures against the ones
 * react-pdf lays out for the same document.
 *
 * It renders sample data with no auth, no store and no chrome, so it must never
 * exist in a production build.
 */
export default async function ParityPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string; templateId: string }>;
  searchParams: Promise<{ fixture?: string; mode?: string; paper?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();

  const { type, templateId } = await params;
  const { fixture = "default", mode = "raw", paper = "a4" } = await searchParams;

  if (!PARITY_TYPES.includes(type as ParityType)) notFound();
  if (!PARITY_FIXTURE_IDS.includes(fixture as ParityFixtureId)) notFound();
  if (mode !== "raw" && mode !== "paged") notFound();
  if (!PAPER_SIZES.includes(paper as PaperSize)) notFound();

  return (
    <ParityClient
      fixture={fixture as ParityFixtureId}
      mode={mode}
      paperSize={paper as PaperSize}
      templateId={templateId}
      type={type as ParityType}
    />
  );
}
