import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ExternalLink, FileText, Globe2 } from "lucide-react";

import type { TemplateSummary } from "@/config/templates";

import { Badge } from "@veriworkly/ui";

import { buildPreviewUrl, getTemplateHref } from "./utils";

type TemplateCardProps = {
  template: TemplateSummary;
};

const TemplateCard = ({ template }: TemplateCardProps) => {
  const previewAlt = `${template.name} ${template.documentTypeLabel.toLowerCase()} template preview`;
  const previewUrl = buildPreviewUrl(template);
  const isPortfolioTemplate = template.documentType === "portfolio-website";

  return (
    <article className="group border-border/70 bg-card/70 hover:border-accent/45 grid overflow-hidden rounded-2xl border shadow-[0_28px_80px_-60px_rgba(15,23,42,0.7)] transition-all duration-200 hover:-translate-y-1 lg:grid-cols-[minmax(260px,0.75fr)_minmax(0,1fr)_minmax(220px,0.52fr)]">
      <Link
        href={getTemplateHref(template)}
        className="border-border/60 relative min-h-96 overflow-hidden border-b bg-[linear-gradient(135deg,var(--background),color-mix(in_srgb,var(--accent)_10%,var(--background)))] p-5 lg:border-r lg:border-b-0"
        aria-label={`Open ${template.name} template details`}
      >
        <div
          className="absolute top-8 right-8 h-24 w-24 rounded-full opacity-15 blur-2xl"
          style={{ backgroundColor: template.accentColor }}
          aria-hidden="true"
        />

        <div className="border-border/70 bg-card/90 text-muted absolute top-4 left-4 z-10 flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium shadow-sm backdrop-blur">
          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
          {template.layout}
        </div>

        {isPortfolioTemplate ? (
          <div className="border-border absolute right-5 bottom-5 h-82 w-[72%] max-w-80 overflow-hidden rounded-2xl border bg-white shadow-[0_28px_70px_-38px_rgba(15,23,42,0.85)] transition-transform duration-200 group-hover:-translate-y-1 group-hover:rotate-1">
            <div className="border-border flex h-9 items-center justify-between border-b px-3 text-[10px] font-semibold">
              <span>{template.editorTemplateId}.veriworkly.com</span>
              <Globe2 className="text-accent h-3.5 w-3.5" aria-hidden="true" />
            </div>
            <div className="bg-background min-h-full p-5">
              <p className="text-muted text-[10px] font-semibold tracking-[0.18em] uppercase">
                Gautam Raj
              </p>
              <h3 className="text-foreground mt-5 max-w-56 text-4xl leading-none font-semibold tracking-[-0.06em]">
                Building VeriWorkly into useful public tools.
              </h3>
              <div className="mt-8 grid gap-2">
                <span className="bg-accent h-3 w-28 rounded-full" />
                <span className="bg-foreground/15 h-3 w-44 rounded-full" />
                <span className="bg-foreground/15 h-3 w-36 rounded-full" />
              </div>
            </div>
          </div>
        ) : (
          <div className="border-border absolute right-5 bottom-5 aspect-8.5/11 h-82 max-h-[calc(100%-3rem)] overflow-hidden rounded-sm border bg-white shadow-[0_28px_70px_-38px_rgba(15,23,42,0.85)] transition-transform duration-200 group-hover:-translate-y-1 group-hover:rotate-1">
            <Image
              fill
              src={template.previewImage}
              alt={previewAlt}
              sizes="(min-width: 1024px) 260px, 80vw"
              className="object-contain object-top"
            />
          </div>
        )}

        <div className="border-border/50 absolute right-16 bottom-1 h-8 w-36 rounded-[50%] border bg-black/10 blur-xl" />
      </Link>

      <div className="flex min-w-0 flex-col justify-between gap-8 p-6 lg:p-7">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="h-2.5 w-10 rounded-full"
              style={{ backgroundColor: template.accentColor }}
              aria-hidden="true"
            />

            <span className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
              {template.documentTypeLabel}
            </span>
          </div>

          <div className="space-y-3">
            <h2 className="text-foreground text-3xl font-semibold tracking-tight">
              {template.name}
            </h2>

            <p className="text-muted max-w-2xl text-sm leading-6">{template.shortDescription}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge>{template.family}</Badge>
            {template.tags.slice(0, 3).map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <ul className="text-muted grid gap-3 text-sm leading-6 sm:grid-cols-2">
            {template.bestFor.slice(0, 2).map((item) => (
              <li key={item} className="flex gap-2">
                <CheckCircle2 className="text-accent mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-4">
            <Link
              className="text-accent hover:text-accent/80 focus-visible:ring-accent inline-flex w-fit items-center gap-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              href={getTemplateHref(template)}
            >
              Review template
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            {previewUrl && (
              <a
                className="text-foreground hover:text-accent focus-visible:ring-accent inline-flex w-fit items-center gap-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                href={previewUrl}
              >
                Live preview
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      </div>

      <aside className="border-border/60 bg-background/70 flex flex-col justify-between gap-6 border-t p-6 lg:border-t-0 lg:border-l">
        <div className="space-y-3">
          <p className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">Best match</p>

          <div className="space-y-2">
            {template.audience.slice(0, 3).map((audience) => (
              <div
                key={audience}
                className="border-border/70 bg-card flex items-center justify-between gap-3 rounded-full border px-3 py-2 text-sm"
              >
                <span className="text-foreground truncate">{audience}</span>
                <span className="bg-accent h-1.5 w-1.5 shrink-0 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        <Link
          href={getTemplateHref(template)}
          className="border-border bg-card hover:border-accent/40 focus-visible:ring-accent text-foreground inline-flex items-center justify-between gap-3 rounded-full border px-4 py-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Open dossier
          <ArrowRight className="text-accent h-4 w-4" aria-hidden="true" />
        </Link>
      </aside>
    </article>
  );
};

export default TemplateCard;
