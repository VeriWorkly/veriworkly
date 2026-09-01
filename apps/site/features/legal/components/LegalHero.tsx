import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Reveal } from "@/components/marketing/Reveal";

import type { LegalHeroProps } from "../types";

export function LegalHero({
  badgeLabel,
  effectiveDate,
  badgeDotClass = "bg-emerald-500",
  title,
  description,
  primaryAction,
  secondaryAction,
}: LegalHeroProps) {
  return (
    <div className="max-w-4xl space-y-6">
      <Reveal priority>
        <div className="border-border/80 bg-card/60 inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs backdrop-blur-md">
          <span className={`h-2 w-2 animate-pulse rounded-full ${badgeDotClass}`} />

          <span className="text-foreground font-mono text-[10px] font-bold tracking-widest uppercase">
            {badgeLabel}
          </span>

          <span className="text-muted/60 font-mono text-[10px]">|</span>
          <span className="text-muted text-[11px]">Effective: {effectiveDate}</span>
        </div>
      </Reveal>

      <Reveal priority delay={0.06}>
        <h1 className="text-foreground text-[clamp(2.5rem,5.5vw,4.25rem)] leading-[1.02] font-bold tracking-tight text-balance">
          {title}
        </h1>
      </Reveal>

      <Reveal priority delay={0.12}>
        <p className="text-muted max-w-2xl text-base leading-relaxed sm:text-lg">{description}</p>
      </Reveal>

      {(primaryAction || secondaryAction) && (
        <Reveal delay={0.18}>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {primaryAction && (
              <Link
                href={primaryAction.href}
                className="bg-accent text-accent-foreground group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold shadow-md transition-all duration-200 hover:opacity-90 active:scale-[0.97]"
              >
                <span>{primaryAction.label}</span>

                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            )}

            {secondaryAction && (
              <Link
                href={secondaryAction.href}
                className="border-border/80 bg-card/60 text-foreground hover:bg-card inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition-all duration-200"
              >
                <span>{secondaryAction.label}</span>
              </Link>
            )}
          </div>
        </Reveal>
      )}
    </div>
  );
}
