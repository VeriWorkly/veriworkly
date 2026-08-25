import { Check } from "lucide-react";

import { Card } from "@veriworkly/ui";
import { type Competitor } from "@/config/compare";

const VERIWORKLY_HIGHLIGHTS = [
  "No login required to start building",
  "Full PDF, DOCX, and Markdown exports - no watermark",
  "ATS checker, AI rewriting (credit-metered, cost shown up front), and portfolio publishing included",
  "Local-first storage, with optional cloud sync when you create an account",
];

const ComparePricingSection = ({ competitor }: { competitor: Competitor }) => {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Card className="border-accent/30 relative space-y-4 overflow-hidden border-2 p-6 transition-all duration-300 ease-out hover:-translate-y-1 sm:p-7">
        <div className="bg-accent/10 pointer-events-none absolute -top-16 -right-16 size-48 rounded-full blur-3xl" />

        <div className="relative flex items-center justify-between">
          <p className="text-foreground text-lg font-bold">VeriWorkly</p>
          <span className="bg-accent/10 text-accent rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wide uppercase">
            Free to use
          </span>
        </div>

        <ul className="relative space-y-2.5">
          {VERIWORKLY_HIGHLIGHTS.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm">
              <Check className="text-accent mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span className="text-muted">{item}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="space-y-4 p-6 transition-all duration-300 ease-out hover:-translate-y-1 sm:p-7">
        <div className="flex items-center justify-between">
          <p className="text-foreground text-lg font-bold">{competitor.name}</p>
        </div>

        <p className="text-muted text-sm leading-relaxed">{competitor.pricingSummary}</p>

        <ul className="space-y-2">
          {competitor.paidPlans.map((plan) => (
            <li
              key={plan}
              className="border-border/40 bg-background rounded-xl border px-3.5 py-2 text-sm"
            >
              {plan}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
};

export default ComparePricingSection;
