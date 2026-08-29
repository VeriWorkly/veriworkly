import Link from "next/link";
import { ArrowRight, Lock, ShieldCheck, Zap } from "lucide-react";

import { Reveal } from "@/components/marketing/Reveal";
import { ReportPreview } from "./ReportPreview";

export function AtsHero() {
  return (
    <div className="border-border/40 relative border-b pb-20">
      <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-14 xl:gap-16">
        {/* Left Column: Copy & Actions */}
        <div className="flex flex-col items-start space-y-6 text-left lg:col-span-7">
          <Reveal priority>
            <div className="border-border/80 bg-card/60 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs shadow-xs backdrop-blur-md">
              <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-foreground font-mono text-[10px] font-bold tracking-widest uppercase">
                ATS Readiness &amp; Keyword Match Engine
              </span>
              <span className="text-muted/60 font-mono text-[10px]">|</span>
              <span className="text-muted text-[11px]">Free: 0 Account Required</span>
            </div>
          </Reveal>

          <Reveal priority delay={0.06}>
            <h1 className="text-foreground text-[clamp(2.5rem,5vw,4.25rem)] leading-[1.04] font-bold tracking-tight text-balance">
              Is your resume actually <span className="text-accent">ATS-ready?</span>
            </h1>
          </Reveal>

          <Reveal priority delay={0.12}>
            <p className="text-muted max-w-xl text-base leading-relaxed sm:text-lg">
              Over 75% of qualified resumes get filtered out before a human recruiter reads them.
              Check formatting risks, missing keywords, and measurable impact scores in 2 seconds
              using our deterministic rules engine.
            </p>
          </Reveal>

          <Reveal priority delay={0.18}>
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <Link
                href="/ats-checker/scan"
                className="bg-accent text-accent-foreground group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold shadow-md transition-all duration-200 hover:opacity-90 active:scale-[0.97]"
              >
                <span>Scan your resume free</span>
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>

              <a
                href="#how-it-scores"
                className="border-border/80 bg-card/60 text-foreground hover:bg-card inline-flex items-center gap-2 rounded-full border px-6 py-3.5 text-sm font-semibold transition-all duration-200"
              >
                <span>See what it checks</span>
              </a>
            </div>
          </Reveal>

          {/* 3 Micro Trust Indicators */}
          <Reveal priority delay={0.24} className="w-full pt-4">
            <div className="border-border/30 grid grid-cols-3 gap-3 border-t pt-4 text-left">
              <div className="flex items-center gap-2 text-xs">
                <Lock className="text-accent size-3.5 shrink-0" />
                <span className="text-muted text-[11px]">0 Storage: Memory Only</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Zap className="size-3.5 shrink-0 text-emerald-500" />
                <span className="text-muted text-[11px]">Instant 2s Scan</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <ShieldCheck className="size-3.5 shrink-0 text-blue-500" />
                <span className="text-muted text-[11px]">Zero Paywalls on Scores</span>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Right Column: Visual Report Preview */}
        <div className="lg:col-span-5">
          <Reveal delay={0.15}>
            <ReportPreview />
          </Reveal>
        </div>
      </div>
    </div>
  );
}

export default AtsHero;
