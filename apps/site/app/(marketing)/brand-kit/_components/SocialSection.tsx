import Image from "next/image";
import { Share2 } from "lucide-react";

import { Card } from "@veriworkly/ui";

import { ogPagePath } from "@/features/og/cards";

import BrandSectionHeader from "./BrandSectionHeader";

const preview = (theme: "light" | "dark") => ogPagePath("brand-kit-preview", { theme });

const ANATOMY = [
  {
    label: "Canvas",
    value: "1200 × 630",
    note: "1.91:1. Open Graph and Twitter both crop toward this ratio.",
  },
  {
    label: "Composition",
    value: "Centred",
    note: "Pill badge, then title, then description, with the domain locked to the bottom.",
  },
  {
    label: "Title",
    value: "84px / 900",
    note: "Drops to 60px past 40 characters. Tracking −0.05em, filled with a Foreground → Muted gradient.",
  },
  {
    label: "Description",
    value: "32px / 500",
    note: "Muted. Capped at 850px wide and 250 characters.",
  },
  {
    label: "Ground",
    value: "Background token",
    note: "Two accent radials in the top corners over a 28px surface grid.",
  },
];

const SOURCES = [
  { source: "page", detail: "A marketing page, by its key in features/og/cards.ts." },
  { source: "changelog", detail: "A release, by its id: the version and its title." },
  { source: "roadmap", detail: "A roadmap item, by its id." },
  { source: "theme", detail: "light (default) or dark." },
];

const SocialSection = () => {
  return (
    <section id="social" className="scroll-mt-24 space-y-8">
      <BrandSectionHeader
        icon={Share2}
        title="Social & Open Graph"
        description="Share cards are drawn from one list of page titles rather than designed one at a time, so no page ever ships without one - and every card uses the same tokens as the site."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {(["light", "dark"] as const).map((theme) => (
          <figure key={theme} className="space-y-2">
            <div className="border-border overflow-hidden rounded-xl border">
              <Image
                src={preview(theme)}
                alt={`VeriWorkly share card, ${theme} theme`}
                width={1200}
                height={630}
                unoptimized
                className="h-auto w-full"
              />
            </div>

            <figcaption className="text-muted font-mono text-xs tracking-wider uppercase">
              theme={theme}
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-5 p-6 sm:p-8">
          <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">Anatomy</p>

          <dl className="divide-border divide-y">
            {ANATOMY.map((row) => (
              <div key={row.label} className="space-y-1 py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <dt className="text-foreground text-sm font-medium">{row.label}</dt>
                  <dd className="text-muted font-mono text-xs tabular-nums">{row.value}</dd>
                </div>

                <p className="text-muted text-xs leading-relaxed">{row.note}</p>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="space-y-5 p-6 sm:p-8">
          <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">
            Where the words come from
          </p>

          <p className="text-muted text-sm leading-relaxed">
            Cards render on request and cache for a year. The image route draws only titles we
            wrote: a page from our list, or a real release or roadmap item. Any other request gets
            the default card, so nobody can mint a VeriWorkly card that says something we
            didn&apos;t write.
          </p>

          <dl className="divide-border divide-y">
            {SOURCES.map((row) => (
              <div key={row.source} className="flex flex-wrap gap-x-4 gap-y-1 py-2.5 first:pt-0">
                <dt className="text-accent w-28 shrink-0 font-mono text-xs">{row.source}</dt>
                <dd className="text-muted min-w-0 text-xs leading-relaxed">{row.detail}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </section>
  );
};

export default SocialSection;
