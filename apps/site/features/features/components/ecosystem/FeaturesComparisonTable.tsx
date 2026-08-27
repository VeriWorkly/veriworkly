import { Check, X } from "lucide-react";

import { Reveal } from "@/components/marketing/Reveal";

import { COMPARISON_ROWS } from "../../data";

export const FeaturesComparisonTable = () => {
  return (
    <section className="border-border/40 space-y-8 border-t pt-16">
      <div className="mx-auto max-w-2xl space-y-2 text-center">
        <span className="text-accent font-mono text-[10px] font-bold tracking-widest uppercase">
          Why VeriWorkly
        </span>

        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          How we compare to traditional resume websites
        </h2>

        <p className="text-muted text-xs leading-relaxed sm:text-sm">
          We believe in clean tools, transparent policies, and zero hidden paywalls when you click
          download.
        </p>
      </div>

      <Reveal className="border-border/60 bg-card/40 overflow-hidden rounded-3xl border shadow-xl backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-160 border-collapse text-left text-sm">
            <caption className="sr-only">
              Feature comparison between VeriWorkly and traditional career portals
            </caption>

            <thead>
              <tr className="border-border/60 bg-muted/4 text-muted border-b font-mono text-[11px] font-bold tracking-wider uppercase">
                <th scope="col" className="w-2/5 p-4 sm:p-5">
                  Feature
                </th>

                <th scope="col" className="w-[30%] p-4 sm:p-5">
                  Traditional Competitors
                </th>

                <th
                  scope="col"
                  className="bg-accent/6 text-accent border-border/60 w-[30%] border-l p-4 sm:p-5"
                >
                  <div className="flex items-center gap-2">
                    <span className="bg-accent size-2 animate-pulse rounded-full" />
                    <span>VeriWorkly Platform</span>
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-border/40 divide-y">
              {COMPARISON_ROWS.map((row) => {
                return (
                  <tr key={row.feature} className="hover:bg-muted/3 transition-colors">
                    <th
                      scope="row"
                      className="text-foreground p-4 text-xs font-semibold sm:p-5 sm:text-sm"
                    >
                      {row.feature}
                    </th>

                    <td className="text-muted p-4 text-xs sm:p-5 sm:text-sm">
                      <div className="flex items-start gap-2">
                        <span className="bg-destructive/10 text-destructive mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full">
                          <X className="size-3 stroke-[2.5]" />
                        </span>

                        <span>{row.competitor}</span>
                      </div>
                    </td>

                    <td className="bg-accent/3 border-border/60 text-foreground border-l p-4 text-xs sm:p-5 sm:text-sm">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          <Check className="size-3 stroke-[2.5]" />
                        </span>

                        <span className="text-foreground font-medium">{row.veriworkly}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Reveal>
    </section>
  );
};

export default FeaturesComparisonTable;
