import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ExternalLink, FileText, Globe2 } from "lucide-react";
import type { TemplateSummary } from "@/config/templates";
import { buildPreviewUrl, getTemplateHref } from "./utils";

type TemplateCardProps = {
  template: TemplateSummary;
};

const TemplateCard = ({ template }: TemplateCardProps) => {
  const previewAlt = `${template.name} ${template.documentTypeLabel.toLowerCase()} template preview`;
  const previewUrl = buildPreviewUrl(template);
  const isPortfolioTemplate = template.documentType === "portfolio-website";

  return (
    <article className="group grid overflow-hidden rounded-4xl border border-zinc-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-blue-500/30 hover:shadow-[0_8px_40px_rgba(59,130,246,0.12)] lg:grid-cols-[minmax(260px,0.75fr)_minmax(0,1fr)_minmax(220px,0.52fr)] dark:border-zinc-800/80 dark:bg-[#0c0c0c]">
      <Link
        href={getTemplateHref(template)}
        className="relative min-h-96 overflow-hidden border-b border-zinc-100 bg-linear-to-br from-blue-500/5 to-transparent p-5 lg:border-r lg:border-b-0 dark:border-zinc-900"
        aria-label={`Open ${template.name} template details`}
      >
        <div
          className="absolute top-8 right-8 h-24 w-24 rounded-full opacity-15 blur-2xl"
          style={{ backgroundColor: template.accentColor }}
          aria-hidden="true"
        />

        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-full border border-zinc-200 bg-white/90 px-3 py-1 text-xs font-medium text-zinc-500 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-[#0c0c0c]/90 dark:text-zinc-400">
          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
          {template.layout}
        </div>

        {isPortfolioTemplate ? (
          <div className="absolute right-5 bottom-5 h-82 w-[72%] max-w-80 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_28px_70px_-38px_rgba(15,23,42,0.85)] transition-transform duration-200 group-hover:-translate-y-1 group-hover:rotate-1 dark:border-zinc-800">
            <div className="flex h-9 items-center justify-between border-b border-zinc-200 px-3 text-[10px] font-semibold dark:border-zinc-800">
              <span>{template.editorTemplateId}.veriworkly.com</span>
              <Globe2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            </div>
            <div className="min-h-full bg-white p-5 dark:bg-[#0c0c0c]">
              <p className="text-[10px] font-semibold tracking-[0.18em] text-zinc-400 uppercase">
                Gautam Raj
              </p>
              <h3 className="mt-5 max-w-56 text-4xl leading-none font-semibold tracking-[-0.06em] text-zinc-900 dark:text-white">
                Building VeriWorkly into useful public tools.
              </h3>
              <div className="mt-8 grid gap-2">
                <span className="h-3 w-28 rounded-full bg-blue-500" />
                <span className="h-3 w-44 rounded-full bg-zinc-200 dark:bg-white/10" />
                <span className="h-3 w-36 rounded-full bg-zinc-200 dark:bg-white/10" />
              </div>
            </div>
          </div>
        ) : (
          <div className="absolute right-5 bottom-5 aspect-8.5/11 h-82 max-h-[calc(100%-3rem)] overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-[0_28px_70px_-38px_rgba(15,23,42,0.85)] transition-transform duration-200 group-hover:-translate-y-1 group-hover:rotate-1 dark:border-zinc-800">
            <Image
              fill
              src={template.previewImage}
              alt={previewAlt}
              sizes="(min-width: 1024px) 260px, 80vw"
              className="object-contain object-top"
            />
          </div>
        )}

        <div className="absolute right-16 bottom-1 h-8 w-36 rounded-[50%] border border-zinc-200/50 bg-black/10 blur-xl dark:border-zinc-800/50" />
      </Link>

      <div className="flex min-w-0 flex-col justify-between gap-8 p-6 lg:p-7">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="h-2.5 w-10 rounded-full"
              style={{ backgroundColor: template.accentColor }}
              aria-hidden="true"
            />

            <span className="text-xs font-semibold tracking-[0.18em] text-zinc-400 uppercase dark:text-zinc-500">
              {template.documentTypeLabel}
            </span>
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white">
              {template.name}
            </h2>

            <p className="max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              {template.shortDescription}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-blue-500/15 bg-blue-500/5 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400">
              {template.family}
            </span>
            {template.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:bg-white/5 dark:text-zinc-400"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <ul className="grid gap-3 text-sm leading-6 text-zinc-500 sm:grid-cols-2 dark:text-zinc-400">
            {template.bestFor.slice(0, 2).map((item) => (
              <li key={item} className="flex gap-2">
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0 text-blue-500"
                  aria-hidden="true"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-4">
            <Link
              className="group/link inline-flex w-fit items-center gap-2 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 focus-visible:outline-none dark:text-blue-400 dark:hover:text-blue-300"
              href={getTemplateHref(template)}
            >
              Review template
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover/link:translate-x-1"
                aria-hidden="true"
              />
            </Link>
            {previewUrl && (
              <a
                className="group/link inline-flex w-fit items-center gap-2 text-sm font-semibold text-zinc-800 transition-colors hover:text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 focus-visible:outline-none dark:text-zinc-200 dark:hover:text-blue-400"
                href={previewUrl}
              >
                Live preview
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      </div>

      <aside className="flex flex-col justify-between gap-6 border-t border-zinc-100 bg-zinc-50/60 p-6 lg:border-t-0 lg:border-l dark:border-zinc-900 dark:bg-white/2">
        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-[0.18em] text-zinc-400 uppercase dark:text-zinc-500">
            Best match
          </p>

          <div className="space-y-2">
            {template.audience.slice(0, 3).map((audience) => (
              <div
                key={audience}
                className="flex items-center justify-between gap-3 rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-[#0c0c0c] dark:text-zinc-300"
              >
                <span className="truncate">{audience}</span>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
              </div>
            ))}
          </div>
        </div>

        <Link
          href={getTemplateHref(template)}
          className="inline-flex items-center justify-between gap-3 rounded-full border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 transition-colors hover:border-blue-500/30 hover:text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 focus-visible:outline-none dark:border-zinc-800 dark:bg-[#0c0c0c] dark:text-zinc-200 dark:hover:text-blue-400"
        >
          Open dossier
          <ArrowRight className="h-4 w-4 text-blue-500" aria-hidden="true" />
        </Link>
      </aside>
    </article>
  );
};

export default TemplateCard;
