import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ShieldCheck, Sparkles, ExternalLink, LockOpen } from "lucide-react";

import { siteConfig } from "@/config/site";

import { type Competitor } from "../../types";

interface CompareVsHeroProps {
  competitor: Competitor;
}

export const CompareVsHero = ({ competitor }: CompareVsHeroProps) => {
  return (
    <div className="border-border/40 relative mb-4 flex flex-col gap-8 border-b pb-12">
      <div className="relative flex flex-wrap items-center gap-4">
        <div className="border-border/80 bg-background/80 flex items-center gap-3 rounded-2xl border p-2.5 pr-4 shadow-sm backdrop-blur-md">
          <div className="bg-accent/10 ring-accent/20 flex size-10 items-center justify-center rounded-xl p-1.5 ring-1">
            <Image
              width={28}
              height={28}
              alt="VeriWorkly"
              src="/veriworkly-logo.png"
              className="object-contain"
            />
          </div>

          <div className="flex flex-col">
            <span className="text-foreground text-sm font-bold tracking-tight">VeriWorkly</span>

            <span className="text-accent font-mono text-[10px] font-semibold uppercase">
              Free Core Builder
            </span>
          </div>
        </div>

        <span className="text-muted/60 font-mono text-sm font-bold tracking-wider uppercase">
          vs
        </span>

        <div className="border-border/80 bg-background/80 flex items-center gap-3 rounded-2xl border p-2.5 pr-4 shadow-sm backdrop-blur-md">
          <div
            aria-hidden="true"
            style={{ backgroundColor: competitor.color }}
            className="flex size-10 items-center justify-center rounded-xl font-mono text-sm font-bold text-white shadow-sm ring-1 ring-white/20"
          >
            {competitor.initials}
          </div>

          <div className="flex flex-col">
            <span className="text-foreground text-sm font-bold tracking-tight">
              {competitor.name}
            </span>

            <span className="text-muted font-mono text-[10px] font-medium uppercase">
              {competitor.pricingModel.split("-")[0]?.trim() || "Cloud Builder"}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl space-y-4">
        <h1 className="text-foreground text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.05] font-bold tracking-tight text-balance">
          VeriWorkly vs {competitor.name}: An Honest Comparison
        </h1>

        <p className="text-muted max-w-3xl text-base leading-relaxed sm:text-lg">
          {competitor.verdict}
        </p>
      </div>

      <div className="grid max-w-4xl gap-3 sm:grid-cols-3">
        <div className="border-border/50 bg-card/40 flex items-center gap-2.5 rounded-xl border p-3">
          <LockOpen className="text-accent size-4 shrink-0" aria-hidden="true" />

          <div className="text-xs">
            <span className="text-muted block font-mono text-[10px] uppercase">Sign-Up</span>

            <span className="text-foreground font-semibold">No Login Needed</span>
          </div>
        </div>

        <div className="border-border/50 bg-card/40 flex items-center gap-2.5 rounded-xl border p-3">
          <ShieldCheck className="size-4 shrink-0 text-emerald-500" aria-hidden="true" />

          <div className="text-xs">
            <span className="text-muted block font-mono text-[10px] uppercase">Watermarks</span>

            <span className="text-foreground font-semibold">100% Watermark-Free</span>
          </div>
        </div>

        <div className="border-border/50 bg-card/40 flex items-center gap-2.5 rounded-xl border p-3">
          <Sparkles className="text-accent size-4 shrink-0" aria-hidden="true" />

          <div className="text-xs">
            <span className="text-muted block font-mono text-[10px] uppercase">File Formats</span>

            <span className="text-foreground font-semibold">PDF, Word (DOCX) & MD</span>
          </div>
        </div>
      </div>

      <div className="relative flex flex-wrap items-center gap-3 pt-2">
        <Link
          href={siteConfig.links.app}
          className="bg-accent text-accent-foreground inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold shadow-md transition duration-200 ease-out hover:opacity-90 active:scale-[0.97]"
        >
          <span>Start building on VeriWorkly free</span>
          <ArrowRight className="size-4" />
        </Link>

        <a
          target="_blank"
          rel="noopener noreferrer"
          href={competitor.website}
          className="border-border/80 bg-card/60 text-foreground hover:bg-card hover:border-border inline-flex items-center gap-2 rounded-full border px-5 py-3.5 text-sm font-semibold transition duration-200 ease-out active:scale-[0.97]"
        >
          <span>Visit {competitor.name}&apos;s website</span>
          <ExternalLink className="text-muted size-3.5" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
};

export default CompareVsHero;
