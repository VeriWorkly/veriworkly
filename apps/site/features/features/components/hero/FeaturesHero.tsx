import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

import { siteConfig } from "@/config/site";

import { Reveal } from "@/components/marketing/Reveal";

import { HERO_PILLARS } from "../../data";

export const FeaturesHero = () => {
  return (
    <div className="border-border/40 relative flex flex-col gap-12 border-b pb-16">
      <div className="max-w-4xl space-y-6">
        <Reveal priority>
          <div className="border-border/80 bg-card/60 inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs backdrop-blur-md">
            <span className="bg-accent h-2 w-2 animate-pulse rounded-full" />

            <span className="text-foreground font-mono text-[10px] font-bold tracking-widest uppercase">
              Platform Features
            </span>

            <span className="text-muted/60 font-mono text-[10px]">|</span>

            <span className="text-muted text-[11px]">Local-First &amp; Free Core</span>
          </div>
        </Reveal>

        <Reveal priority delay={0.06}>
          <h1 className="text-foreground text-[clamp(2.5rem,5.5vw,4.25rem)] leading-[1.02] font-bold tracking-tight text-balance">
            One unified career studio. Built without paywalls.
          </h1>
        </Reveal>

        <Reveal priority delay={0.12}>
          <p className="text-muted max-w-3xl text-base leading-relaxed sm:text-lg">
            From AI-assisted resumes and matching cover letters to instant ATS keyword scoring,
            GitHub and LinkedIn imports, web portfolios on your custom subdomain, and multi-format
            downloads, everything you need in a single private workspace.
          </p>
        </Reveal>

        <Reveal delay={0.18}>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href={siteConfig.links.app}
              className="bg-accent text-accent-foreground group inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold shadow-md transition-all duration-200 hover:opacity-90 active:scale-[0.97]"
            >
              <span>Launch free builder</span>
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform group-hover:translate-x-1"
              />
            </Link>

            <Link
              href="/how-it-works"
              className="border-border/80 bg-card/60 text-foreground hover:bg-card inline-flex items-center gap-2 rounded-full border px-5 py-3.5 text-sm font-semibold transition-all duration-200 active:scale-[0.97]"
            >
              <span>How it works</span>
            </Link>

            <a
              target="_blank"
              rel="noreferrer"
              href={siteConfig.links.docs}
              className="border-border/80 bg-card/60 text-muted hover:text-foreground hover:bg-card inline-flex items-center gap-2 rounded-full border px-4 py-3.5 text-sm font-semibold transition-all duration-200"
            >
              <BookOpen className="size-4" />
              <span>Docs</span>
            </a>
          </div>
        </Reveal>
      </div>

      <Reveal delay={0.2}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HERO_PILLARS.map((pillar) => {
            const Icon = pillar.icon;

            return (
              <div
                key={pillar.title}
                className="border-border/60 bg-card/40 hover:border-accent/40 space-y-3 rounded-2xl border p-5 shadow-xs backdrop-blur-sm transition-all duration-200"
              >
                <div className="bg-accent/10 text-accent ring-accent/20 flex size-9 items-center justify-center rounded-xl ring-1">
                  <Icon className="size-4.5" />
                </div>

                <h3 className="text-foreground text-sm font-bold tracking-tight">{pillar.title}</h3>

                <p className="text-muted text-xs leading-relaxed">{pillar.description}</p>
              </div>
            );
          })}
        </div>
      </Reveal>
    </div>
  );
};

export default FeaturesHero;
