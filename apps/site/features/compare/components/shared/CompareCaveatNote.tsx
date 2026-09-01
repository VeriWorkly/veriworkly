import { Info } from "lucide-react";

import { PRICING_VERIFIED_AT } from "../../data";

interface CompareCaveatNoteProps {
  competitorName: string;
}

export const CompareCaveatNote = ({ competitorName }: CompareCaveatNoteProps) => {
  return (
    <div className="border-border/50 bg-card/30 flex items-start gap-3 rounded-xl border p-4 backdrop-blur-xs">
      <Info className="text-muted mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p className="text-muted text-xs leading-relaxed">
        <span className="text-foreground font-medium">Pricing Note:</span> Pricing and feature
        details for {competitorName} were checked in {PRICING_VERIFIED_AT} from their public pricing
        pages and user reviews. Companies occasionally change their prices, so please check{" "}
        {competitorName}&apos;s website for the most recent numbers.
      </p>
    </div>
  );
};

export default CompareCaveatNote;
