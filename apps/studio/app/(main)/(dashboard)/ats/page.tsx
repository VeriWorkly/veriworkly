import type { Metadata } from "next";

import { AtsWorkspace } from "@/features/ats/AtsWorkspace";

export const metadata: Metadata = {
  title: "ATS checker",
  description: "Check resume ATS readiness and job match.",
  robots: { index: false, follow: false },
};

export default async function AtsPage({
  searchParams,
}: {
  searchParams: Promise<{ document?: string | string[] }>;
}) {
  const { document } = await searchParams;

  // Opened from a resume's editor: that resume is picked for the scan.
  return <AtsWorkspace initialDocumentId={typeof document === "string" ? document : undefined} />;
}
