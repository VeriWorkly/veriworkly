import { Cpu, Database, Globe, Layers, ShieldCheck, type LucideIcon } from "lucide-react";

import { Reveal } from "@/components/marketing/Reveal";

import { WORKFLOW_STEPS } from "../../data";
import type { WorkflowStepItem } from "../../types";

const stepIcons: Record<string, LucideIcon> = {
  "01": Database,
  "02": Layers,
  "03": Cpu,
  "04": ShieldCheck,
  "05": Globe,
};

export const PipelineTimeline = ({ steps = WORKFLOW_STEPS }: { steps?: WorkflowStepItem[] }) => {
  return (
    <div className="relative">
      <div className="from-accent/50 via-border absolute top-2 bottom-2 left-6.75 w-px bg-linear-to-b to-transparent md:left-7.75" />

      <div className="flex flex-col">
        {steps.map((item, idx) => {
          const Icon = stepIcons[item.step] ?? Database;

          return (
            <Reveal
              key={item.step}
              delay={idx * 0.05}
              className="group border-border/40 relative flex gap-6 py-8 first:pt-0 last:pb-0 md:gap-8"
            >
              <span className="border-border/80 bg-card text-accent group-hover:border-accent/50 relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border shadow-xs transition-all duration-300 md:h-16 md:w-16">
                <Icon className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
              </span>

              <div className="min-w-0 flex-1 pt-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-accent font-mono text-xs font-bold">Step {item.step}</span>

                  <h3 className="text-foreground text-xl font-bold tracking-tight md:text-2xl">
                    {item.title}
                  </h3>
                </div>

                <span className="text-muted/80 mt-1 block font-mono text-xs font-semibold tracking-wider uppercase">
                  {item.subtitle}
                </span>

                <p className="text-muted mt-3 max-w-3xl text-sm leading-relaxed md:text-base">
                  {item.description}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="border-border/60 bg-card/60 text-muted inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px]"
                    >
                      <span className="bg-accent h-1.5 w-1.5 rounded-full" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
};

export default PipelineTimeline;
