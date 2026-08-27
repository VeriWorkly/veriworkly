import { Layers, ShieldCheck, FileCheck } from "lucide-react";

import { Card } from "@veriworkly/ui";

import { type Competitor } from "../../types";

interface CompareDeepDiveSectionProps {
  competitor: Competitor;
}

export const CompareDeepDiveSection = ({ competitor }: CompareDeepDiveSectionProps) => {
  if (!competitor.deepDive || competitor.deepDive.length === 0) return null;

  const pillarIcons = [ShieldCheck, FileCheck, Layers];

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2">
        <span className="text-accent font-mono text-[10px] font-bold tracking-widest uppercase">
          Under the Hood
        </span>

        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          How VeriWorkly and {competitor.name} work differently
        </h2>

        <p className="text-muted max-w-3xl text-sm leading-relaxed">
          Beyond visual templates, how a tool handles your privacy, file downloads, and personal
          data makes a big difference in how easily you can apply to jobs.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {competitor.deepDive.map((pillar, index) => {
          const Icon = pillarIcons[index % pillarIcons.length] || Layers;

          return (
            <Card
              key={pillar.title}
              className="border-border/60 bg-card/40 hover:border-accent/30 relative flex flex-col justify-between overflow-hidden p-6 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="bg-accent/10 text-accent ring-accent/20 flex size-8 items-center justify-center rounded-lg ring-1">
                    <Icon className="size-4" aria-hidden="true" />
                  </div>

                  <h3 className="text-foreground text-base font-bold tracking-tight">
                    {pillar.title}
                  </h3>
                </div>

                <div className="space-y-3 pt-1">
                  <div className="border-border/40 bg-muted/4 rounded-xl border p-3">
                    <span className="text-muted/80 block font-mono text-[10px] font-semibold tracking-wider uppercase">
                      {competitor.name}&apos;s Approach
                    </span>

                    <p className="text-muted mt-1 text-xs leading-relaxed">
                      {pillar.competitorApproach}
                    </p>
                  </div>

                  <div className="border-accent/20 bg-accent/2 rounded-xl border p-3">
                    <span className="text-accent block font-mono text-[10px] font-bold tracking-wider uppercase">
                      VeriWorkly&apos;s Approach
                    </span>

                    <p className="text-foreground/90 mt-1 text-xs leading-relaxed">
                      {pillar.veriworklyApproach}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-border/40 mt-5 border-t pt-3">
                <p className="text-muted text-xs leading-relaxed">
                  <span className="text-foreground font-medium">The difference: </span>
                  {pillar.takeaway}
                </p>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
};

export default CompareDeepDiveSection;
