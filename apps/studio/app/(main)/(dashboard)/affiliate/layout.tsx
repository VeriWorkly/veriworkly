import type { ReactNode } from "react";
import { ComingSoon } from "@/components/dashboard/ComingSoon";
import { isAffiliateProgramEnabled } from "@/lib/feature-flags";

export default function AffiliateLayout({ children }: { children: ReactNode }) {
  if (!isAffiliateProgramEnabled()) {
    return (
      <ComingSoon
        title="Affiliate program coming soon"
        description="We're putting the finishing touches on partner payouts and tracking. Check back soon to start earning commission for referring VeriWorkly."
      />
    );
  }

  return children;
}
