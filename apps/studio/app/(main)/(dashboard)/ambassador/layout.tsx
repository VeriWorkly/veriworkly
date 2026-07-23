import type { ReactNode } from "react";
import { ComingSoon } from "@/components/dashboard/ComingSoon";
import { isAmbassadorProgramEnabled } from "@/lib/feature-flags";

export default function AmbassadorLayout({ children }: { children: ReactNode }) {
  if (!isAmbassadorProgramEnabled()) {
    return (
      <ComingSoon
        title="Ambassador program coming soon"
        description="The Campus Ambassador program is still being set up. Check back soon to apply for student-only perks and support."
      />
    );
  }

  return children;
}
