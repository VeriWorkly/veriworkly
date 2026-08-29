import { Reveal } from "@/components/marketing/Reveal";
import { SCORING_DIMENSIONS } from "../../data/categories";

export function AtsCategoriesGrid() {
  return (
    <section id="how-it-scores" className="space-y-10 scroll-mt-28">
      <div className="flex flex-col items-start space-y-2 text-left">
        <span className="text-accent font-mono text-[10px] font-bold tracking-widest uppercase">
          Scoring Dimensions
        </span>
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
          Four categories, computed from your actual text
        </h2>
        <p className="text-muted max-w-2xl text-xs sm:text-sm leading-relaxed">
          Every check runs against the text you provide. There are no fake placeholder scores. The exact weights stay private to prevent gaming, but the evaluation dimensions are 100% transparent.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {SCORING_DIMENSIONS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <Reveal key={item.title} delay={idx * 0.06}>
              <div className="border-border/60 bg-card/40 hover:border-accent/40 relative flex h-full flex-col justify-between rounded-3xl border p-6 shadow-md backdrop-blur-sm transition-all duration-300">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="bg-accent/10 text-accent ring-accent/20 flex size-9 items-center justify-center rounded-xl ring-1">
                      <Icon className="size-4.5" />
                    </span>
                    <span className="border-border/60 bg-background text-muted rounded-full border px-2.5 py-0.5 font-mono text-[10px]">
                      {item.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-foreground text-base font-bold tracking-tight">
                      {item.title}
                    </h3>
                    <p className="text-muted mt-2 text-xs leading-relaxed">
                      {item.body}
                    </p>
                  </div>
                </div>

                <div className="border-border/30 mt-6 space-y-2 border-t pt-4">
                  {item.checks.map((check) => (
                    <div key={check} className="flex items-center gap-2 text-xs">
                      <span className="bg-accent/20 text-accent flex size-3.5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold">
                        ✓
                      </span>
                      <span className="text-foreground/80 font-mono text-[11px]">{check}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

export default AtsCategoriesGrid;
