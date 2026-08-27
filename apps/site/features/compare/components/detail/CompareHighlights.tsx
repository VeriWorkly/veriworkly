import { Sparkles, AlertTriangle, ArrowRightLeft, UserCheck } from "lucide-react";

import { Card } from "@veriworkly/ui";

import { type Competitor } from "../../types";

interface CompareHighlightsProps {
  competitor: Competitor;
}

export const CompareHighlights = ({ competitor }: CompareHighlightsProps) => {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2">
        <span className="text-accent font-mono text-[10px] font-bold tracking-widest uppercase">
          Key Takeaways
        </span>

        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          Strengths, trade-offs, and who each tool is best for
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="space-y-3 border-emerald-500/20 bg-emerald-500/3 p-6 backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 ring-1 ring-emerald-500/30">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>

            <p className="font-mono text-[11px] font-bold tracking-wider uppercase">
              What {competitor.name} Does Well
            </p>
          </div>

          <p className="text-muted text-sm leading-relaxed">{competitor.standoutFeature}</p>
        </Card>

        <Card className="space-y-3 border-amber-500/20 bg-amber-500/3 p-6 backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/15 ring-1 ring-amber-500/30">
              <AlertTriangle className="size-4" aria-hidden="true" />
            </span>

            <p className="font-mono text-[11px] font-bold tracking-wider uppercase">Good to Know</p>
          </div>

          <p className="text-muted text-sm leading-relaxed">{competitor.knownLimitation}</p>
        </Card>

        <Card className="border-accent/30 bg-accent/3 space-y-3 p-6 backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg sm:col-span-2 lg:col-span-1">
          <div className="text-accent flex items-center gap-2">
            <span className="bg-accent/15 ring-accent/30 flex size-7 items-center justify-center rounded-lg ring-1">
              <ArrowRightLeft className="size-4" aria-hidden="true" />
            </span>

            <p className="font-mono text-[11px] font-bold tracking-wider uppercase">
              Why People Switch to VeriWorkly
            </p>
          </div>

          <p className="text-muted text-sm leading-relaxed">{competitor.whySwitch}</p>
        </Card>
      </div>

      <div className="border-border/60 bg-card/40 grid gap-6 rounded-2xl border p-6 sm:grid-cols-2">
        <div className="border-border/40 space-y-2 sm:border-r sm:pr-6">
          <div className="text-foreground flex items-center gap-2 text-sm font-semibold">
            <UserCheck className="text-muted size-4" />
            <span>Choose {competitor.name} if:</span>
          </div>

          <p className="text-muted text-xs leading-relaxed sm:text-sm">
            {competitor.bestForCompetitor}
          </p>
        </div>

        <div className="space-y-2 sm:pl-2">
          <div className="text-accent flex items-center gap-2 text-sm font-semibold">
            <UserCheck className="size-4" />
            <span>Choose VeriWorkly if:</span>
          </div>

          <p className="text-muted text-xs leading-relaxed sm:text-sm">
            {competitor.bestForVeriworkly}
          </p>
        </div>
      </div>
    </section>
  );
};

export default CompareHighlights;
