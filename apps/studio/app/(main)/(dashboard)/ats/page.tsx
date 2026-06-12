import type { Metadata } from "next";

import { AtsWorkspace } from "@/features/ats/AtsWorkspace";

export const metadata: Metadata = {
  title: "ATS checker",
  description: "Check resume ATS readiness and job match.",
  robots: { index: false, follow: false },
};

export default function AtsPage() {
  return <AtsWorkspace />;
}
