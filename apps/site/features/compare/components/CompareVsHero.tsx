import Image from "next/image";
import Link from "next/link";

import { siteConfig } from "@/config/site";
import { type Competitor } from "@/config/compare";

const CompareVsHero = ({ competitor }: { competitor: Competitor }) => {
  return (
    <div className="border-border/40 relative mb-4 flex flex-col gap-7 overflow-hidden border-b pb-10">
      <div
        className="pointer-events-none absolute top-8 -right-20 size-72 rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: competitor.color }}
      />

      <div className="relative flex flex-wrap items-center gap-4">
        <div className="border-border bg-background flex size-16 items-center justify-center overflow-hidden rounded-2xl border p-2.5 shadow-sm">
          <Image src="/veriworkly-logo.png" alt="VeriWorkly" width={44} height={44} />
        </div>

        <span className="text-muted/50 font-mono text-lg font-bold">vs</span>

        <div className="relative flex size-16 items-center justify-center">
          <div
            className="absolute inset-0 rounded-2xl opacity-40 blur-lg"
            style={{ backgroundColor: competitor.color }}
            aria-hidden="true"
          />
          <div
            className="relative flex size-16 items-center justify-center rounded-2xl font-mono text-lg font-bold text-white shadow-sm"
            style={{ backgroundColor: competitor.color }}
            aria-hidden="true"
          >
            {competitor.initials}
          </div>
        </div>
      </div>

      <h1 className="text-foreground relative max-w-3xl text-[clamp(2.5rem,6vw,4.25rem)] leading-[0.95] font-bold tracking-tighter text-balance">
        VeriWorkly vs {competitor.name}
      </h1>

      <p className="text-muted relative max-w-2xl text-base leading-relaxed">
        {competitor.positioning}
      </p>

      <div className="relative flex flex-wrap gap-3 pt-1">
        <Link
          href={siteConfig.links.app}
          className="bg-accent text-accent-foreground inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold shadow-sm transition duration-200 ease-out hover:opacity-90 active:scale-[0.97]"
        >
          Start building free - no login
        </Link>

        <Link
          href={competitor.website}
          target="_blank"
          rel="noopener noreferrer"
          className="border-border bg-card text-foreground hover:border-border/80 inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-semibold transition duration-200 ease-out active:scale-[0.97]"
        >
          Visit {competitor.name}
        </Link>
      </div>
    </div>
  );
};

export default CompareVsHero;
