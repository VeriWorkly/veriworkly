import { Reveal } from "@/components/marketing/Reveal";
import { FAILURE_TRAPS } from "../../data/failureTraps";

export function AtsFailureTraps() {
  return (
    <section className="border-border/40 space-y-10 border-t pt-16">
      <div className="space-y-2 text-left">
        <div className="flex items-center gap-2">
          <span className="text-accent font-mono text-[10px] font-bold tracking-widest uppercase">
            Where Resumes Actually Get Lost
          </span>
          <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-rose-600 dark:text-rose-400">
            Common Traps
          </span>
        </div>
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
          The four things that quietly drop you out of a recruiter&rsquo;s search
        </h2>
        <p className="text-muted max-w-2xl text-xs leading-relaxed sm:text-sm">
          Applicant tracking systems index your resume into searchable fields rather than
          auto-rejecting it. These four failures leave those fields empty or wrong, which is what
          actually keeps a qualified application out of the results.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {FAILURE_TRAPS.map((trap, idx) => {
          const Icon = trap.icon;
          return (
            <Reveal key={trap.title} delay={idx * 0.06}>
              <div className="border-border/60 bg-card/40 hover:border-accent/40 relative flex h-full flex-col justify-between rounded-3xl border p-6.5 shadow-md backdrop-blur-sm transition-all duration-300">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 ring-1 ring-rose-500/20 dark:text-rose-400">
                      <Icon className="size-4.5" />
                    </span>
                    <span className="border-border/60 bg-background text-muted rounded-full border px-2.5 py-0.5 font-mono text-[10px]">
                      {trap.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-foreground text-base font-bold tracking-tight">
                      {trap.title}
                    </h3>
                    <p className="text-muted mt-2 text-xs leading-relaxed">{trap.problem}</p>
                  </div>
                </div>

                <div className="border-border/30 bg-muted/10 mt-5 rounded-2xl border p-3.5 text-xs">
                  <span className="text-foreground mb-1 block font-mono text-[11px] font-bold">
                    How to fix it:
                  </span>
                  <p className="text-muted text-[11px] leading-relaxed">{trap.solution}</p>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

export default AtsFailureTraps;
