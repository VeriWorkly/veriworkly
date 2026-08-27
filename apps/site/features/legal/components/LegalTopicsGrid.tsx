import { Reveal } from "@/components/marketing/Reveal";

import type { LegalTopicsGridProps } from "../types";

export function LegalTopicsGrid({
  label = "Executive Summary",
  countLabel,
  topics,
  columns = 4,
}: LegalTopicsGridProps) {
  const dynamicCountLabel = countLabel ?? `${topics.length} Key Tenets`;

  const gridColsClass =
    columns === 3
      ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      : "grid gap-4 sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className="space-y-4 pt-6">
      <div className="flex items-center justify-between">
        <span className="text-accent font-mono text-[10px] font-bold tracking-widest uppercase">
          {label}
        </span>

        <span className="text-muted font-mono text-[11px]">{dynamicCountLabel}</span>
      </div>

      <div className={gridColsClass}>
        {topics.map((topic, idx) => {
          const Icon = topic.icon;
          return (
            <Reveal key={topic.title} delay={idx * 0.05}>
              <div className="border-border/60 bg-card/40 hover:border-accent/40 relative flex h-full flex-col justify-between rounded-2xl border p-5 shadow-xs backdrop-blur-sm transition-all duration-200">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="bg-accent/10 text-accent ring-accent/20 flex size-9 items-center justify-center rounded-xl ring-1">
                      <Icon className="size-4.5" />
                    </span>

                    <span className="border-border/60 bg-background text-muted rounded-full border px-2 py-0.5 font-mono text-[9px] font-semibold">
                      {topic.badge}
                    </span>
                  </div>

                  <h3 className="text-foreground text-sm font-bold tracking-tight">
                    {topic.title}
                  </h3>

                  <p className="text-muted text-xs leading-relaxed">{topic.description}</p>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
