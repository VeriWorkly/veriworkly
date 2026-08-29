import { Reveal } from "@/components/marketing/Reveal";
import { PIPELINE_STEPS } from "../../data/pipelineSteps";
import { SCORE_FACTS } from "../../data/scoreFacts";

export function AtsPipelineSection() {
  return (
    <section className="space-y-16 border-t border-border/40 pt-16">
      {/* Top: Pipeline Heading & Connected Cards */}
      <div className="space-y-10">
        <div className="space-y-2 text-left">
          <span className="text-accent font-mono text-[10px] font-bold tracking-widest uppercase">
            Parser Architecture
          </span>
          <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            What an applicant tracking system does to your resume
          </h2>
          <p className="text-muted max-w-2xl text-xs sm:text-sm leading-relaxed">
            Every check in our engine maps directly to one of these 4 stages in standard recruitment software. Understanding the pipeline makes fixing issues straightforward.
          </p>
        </div>

        {/* 4 Steps Horizontal Flow */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PIPELINE_STEPS.map((stage, idx) => (
            <Reveal key={stage.step} delay={idx * 0.06}>
              <div className="border-border/60 bg-card/40 hover:border-accent/40 relative flex h-full flex-col justify-between rounded-3xl border p-6 shadow-sm backdrop-blur-sm transition-all duration-300">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="bg-accent/15 text-accent ring-accent/30 flex size-8 items-center justify-center rounded-lg font-mono text-xs font-bold ring-1">
                      {stage.step}
                    </span>
                    <span className="border-border/60 bg-background text-muted rounded-full border px-2.5 py-0.5 font-mono text-[10px]">
                      {stage.phase}
                    </span>
                  </div>

                  <h3 className="text-foreground text-sm font-bold tracking-tight">
                    {stage.title}
                  </h3>

                  <p className="text-muted text-xs leading-relaxed">
                    {stage.body}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* Bottom: 3 Score Realities */}
      <div className="space-y-6">
        <div className="space-y-1">
          <span className="text-accent font-mono text-[10px] font-bold tracking-widest uppercase">
            Clarity &amp; Transparency
          </span>
          <h3 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
            Three facts every job seeker should know about ATS
          </h3>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {SCORE_FACTS.map((fact, idx) => {
            const Icon = fact.icon;
            return (
              <Reveal key={fact.title} delay={idx * 0.06}>
                <div className="border-border/60 bg-card/40 hover:border-border relative flex h-full flex-col justify-between rounded-2xl border p-6 backdrop-blur-sm transition-all">
                  <div className="space-y-3">
                    <span className="bg-accent/10 text-accent ring-accent/20 flex size-9 items-center justify-center rounded-xl ring-1">
                      <Icon className="size-4.5" />
                    </span>
                    <h4 className="text-foreground text-sm font-bold tracking-tight">
                      {fact.title}
                    </h4>
                    <p className="text-muted text-xs leading-relaxed">
                      {fact.body}
                    </p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default AtsPipelineSection;
