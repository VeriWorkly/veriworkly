import { CheckCircle2 } from "lucide-react";

import { Reveal } from "@/components/marketing/Reveal";

import { ENCRYPTION_BOUNDARIES } from "../../data";

export const DataPartitioningSection = () => {
  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <span className="text-accent font-mono text-[10px] font-bold tracking-widest uppercase">
          Data Isolation &amp; Sandboxing
        </span>

        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          What lives where: Clear data partitioning
        </h2>

        <p className="text-muted max-w-2xl text-sm leading-relaxed">
          We believe in total transparency regarding where your information is processed and stored
          across our client-first stack.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {ENCRYPTION_BOUNDARIES.map((boundary, idx) => (
          <Reveal key={boundary.title} delay={idx * 0.06}>
            <div className="border-border/60 bg-card/40 hover:border-accent/40 relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border p-7 shadow-lg backdrop-blur-sm transition-all duration-300 sm:p-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="bg-accent/15 text-accent ring-accent/30 flex size-9 items-center justify-center rounded-xl font-mono text-xs font-bold ring-1">
                    {boundary.number}
                  </span>

                  <span className="border-border/60 bg-background text-muted rounded-full border px-2.5 py-0.5 font-mono text-[10px]">
                    Sandbox Layer
                  </span>
                </div>

                <h3 className="text-foreground text-lg font-bold tracking-tight">
                  {boundary.title}
                </h3>

                <p className="text-muted text-xs leading-relaxed sm:text-sm">
                  {boundary.description}
                </p>
              </div>

              <div className="border-border/40 mt-6 space-y-2 border-t pt-4">
                {boundary.specs.map((spec) => (
                  <div key={spec} className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="text-accent size-3.5 shrink-0" />

                    <span className="text-foreground/90 font-medium">{spec}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
};

export default DataPartitioningSection;
