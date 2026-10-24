import Image from "next/image";
import { Share2 } from "lucide-react";

import { Card } from "@veriworkly/ui";

import BrandSectionHeader from "./BrandSectionHeader";

const PREVIEW_TITLE = "One profile. Every document.";
const PREVIEW_DESC =
  "Free AI resumes, cover letters and web portfolios. No login required to start.";

const preview = (theme: "light" | "dark") =>
  `/api/og?title=${encodeURIComponent(PREVIEW_TITLE)}&description=${encodeURIComponent(
    PREVIEW_DESC,
  )}&theme=${theme}`;

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

const PARAMS = [
  { param: "title", detail: "Up to 120 characters. Defaults to “VeriWorkly”." },
  { param: "description", detail: "Up to 250 characters." },
  { param: "theme", detail: "light (default) or dark." },
  { param: "showDesc", detail: "Set to false for a title-only card." },
];

const SocialSection = () => {
  return (
    <section id="social" className="scroll-mt-24 space-y-8">
      <BrandSectionHeader
        icon={Share2}
        title="Social & Open Graph"
        description="Share cards are generated from the query string rather than designed one at a time, so no page ever ships without one - and every card uses the same tokens as the site."
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
            Generate your own
          </p>

          <p className="text-muted text-sm leading-relaxed">
            Point an <span className="font-mono">og:image</span> at the endpoint below and it
            renders on request, then caches for a year. Useful when you are writing about a specific
            VeriWorkly feature and want a matching card.
          </p>

          <code className="border-border bg-background text-accent block rounded-xl border p-4 font-mono text-xs leading-relaxed wrap-break-word">
            veriworkly.com/api/og?title=Your+title&amp;description=Your+description
          </code>

          <dl className="divide-border divide-y">
            {PARAMS.map((row) => (
              <div key={row.param} className="flex flex-wrap gap-x-4 gap-y-1 py-2.5 first:pt-0">
                <dt className="text-accent w-28 shrink-0 font-mono text-xs">{row.param}</dt>
                <dd className="text-muted min-w-0 text-xs leading-relaxed">{row.detail}</dd>
              </div>
            ))}
          </dl>

          <p className="text-muted text-xs leading-relaxed">
            Text is sanitised and length-capped on the way in, so the endpoint cannot be used to
            mint a convincing card that says something we didn&apos;t write.
          </p>
        </Card>
      </div>
    </section>
  );
};

export default SocialSection;
