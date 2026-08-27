import Link from "next/link";
import { ArrowRight, Terminal, BookOpen } from "lucide-react";

import { siteConfig } from "@/config/site";

import { Reveal } from "@/components/marketing/Reveal";
import { SectionEyebrow } from "@/components/marketing/SectionEyebrow";

import { PIPELINE_NODES } from "../../data";

export const HowItWorksHero = () => {
  return (
    <div className="border-border/60 bg-card/40 relative flex w-full flex-col items-center overflow-hidden rounded-4xl border px-6 pt-28 pb-20 text-center backdrop-blur-md md:pt-32 md:pb-24">
      <div className="surface-grid pointer-events-none absolute inset-0 -z-10 opacity-[0.2]" />
      <div className="bg-accent/10 pointer-events-none absolute top-0 left-1/2 h-105 w-full max-w-225 -translate-x-1/2 rounded-full blur-[140px]" />

      <Reveal priority className="relative z-10 flex max-w-3xl flex-col items-center">
        <SectionEyebrow icon={Terminal} label="End-to-End Workflow" className="mb-6" />

        <h1 className="text-foreground text-[clamp(2.5rem,5.5vw,4.25rem)] leading-[1.04] font-bold tracking-tight text-balance">
          How VeriWorkly Works: From Draft to Dream Job
        </h1>

        <p className="text-muted mt-6 max-w-2xl text-base leading-relaxed sm:text-lg">
          A step-by-step walkthrough of how our local-first studio, AI bullet rewrites, ATS scanner,
          and web portfolios work together without paywalls or privacy trade-offs.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={siteConfig.links.app}
            className="bg-accent text-accent-foreground group inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-sm font-semibold shadow-md transition-all duration-300 hover:opacity-90 active:scale-[0.97]"
          >
            <span>Open Studio</span>
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>

          <a
            target="_blank"
            rel="noreferrer"
            href={siteConfig.links.docs}
            className="border-border/80 bg-background/70 text-foreground hover:bg-card inline-flex h-12 items-center justify-center gap-2 rounded-full border px-6 text-sm font-semibold backdrop-blur-sm transition-colors"
          >
            <BookOpen className="text-accent size-4" />
            <span>Read Platform Docs</span>
          </a>
        </div>
      </Reveal>

      <Reveal
        delay={0.15}
        className="relative z-10 mt-16 flex w-full max-w-5xl flex-wrap items-center justify-center gap-x-3 gap-y-6"
      >
        {PIPELINE_NODES.map((node, idx) => {
          const Icon = node.icon;
          const isLast = idx === PIPELINE_NODES.length - 1;

          return (
            <div key={node.step} className="flex items-center gap-2.5">
              <div className="border-border/60 bg-background/80 hover:border-accent/40 flex flex-col items-center gap-1.5 rounded-2xl border p-3.5 shadow-sm backdrop-blur-xs transition-all duration-200">
                <div className="flex items-center gap-2">
                  <span className="bg-accent/10 text-accent ring-accent/20 flex size-8 items-center justify-center rounded-xl ring-1">
                    <Icon className="size-4" strokeWidth={1.75} />
                  </span>

                  <span className="text-muted font-mono text-[10px] font-bold">{node.step}</span>
                </div>

                <span className="text-foreground text-xs font-bold tracking-tight">
                  {node.label}
                </span>

                <span className="text-muted text-[10px]">{node.desc}</span>
              </div>

              {!isLast && (
                <ArrowRight
                  className="text-muted/50 hidden size-4 shrink-0 sm:block"
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </Reveal>
    </div>
  );
};

export default HowItWorksHero;
