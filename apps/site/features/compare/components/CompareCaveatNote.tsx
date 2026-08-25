import { Info } from "lucide-react";

import { PRICING_VERIFIED_AT } from "@/config/compare";

const CompareCaveatNote = ({ competitorName }: { competitorName: string }) => {
  return (
    <div className="border-border/30 bg-muted/[0.04] flex items-start gap-2.5 rounded-2xl border p-4">
      <Info className="text-muted mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p className="text-muted text-xs leading-relaxed">
        Pricing and feature details for {competitorName} were last verified in {PRICING_VERIFIED_AT}{" "}
        from public pricing pages and reviews, and can change without notice - please confirm
        current pricing on {competitorName}&apos;s own site before subscribing.
      </p>
    </div>
  );
};

export default CompareCaveatNote;
