import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import type { TemplateSummary } from "@/config/templates";

import { buildEditorUrl } from "./utils";

export function TemplateDetailHeader({ template }: { template: TemplateSummary }) {
  const editorUrl = buildEditorUrl(template);

  return (
    <header className="grid gap-8 rounded-4xl border border-zinc-200 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)] lg:items-end dark:border-zinc-800/80 dark:bg-[#0c0c0c]">
      <div className="space-y-5">
        <Link
          href={`/templates/${template.documentType}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 focus-visible:outline-none dark:text-zinc-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to {template.documentTypeLabel.toLowerCase()} templates
        </Link>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-blue-500/15 bg-blue-500/5 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400">
              {template.documentTypeLabel}
            </span>
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:bg-white/5 dark:text-zinc-400">
              {template.family}
            </span>
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:bg-white/5 dark:text-zinc-400">
              {template.layout}
            </span>
          </div>

          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-balance text-zinc-900 sm:text-6xl dark:text-white">
            {template.name}
          </h1>

          <p className="max-w-2xl text-base leading-7 text-zinc-500 dark:text-zinc-400">
            {template.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {template.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-[#080808] dark:text-zinc-400"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-white/5">
          <p className="text-xs font-semibold tracking-[0.18em] text-zinc-400 uppercase dark:text-zinc-500">
            Primary fit
          </p>
          <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            {template.bestFor[0]}
          </p>
        </div>

        <Link
          href={editorUrl}
          className="group flex h-12 w-full items-center justify-center gap-2 rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:bg-blue-600 active:scale-[0.97] dark:bg-white dark:text-zinc-950 dark:hover:bg-blue-500 dark:hover:text-white"
        >
          Use This Template
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          />
        </Link>
      </div>
    </header>
  );
}
