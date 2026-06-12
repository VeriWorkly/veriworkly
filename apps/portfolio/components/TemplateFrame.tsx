"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ExternalLink } from "lucide-react";

import { templates, type TemplateId } from "@/lib/portfolio";

export function TemplateFrame() {
  const [templateId, setTemplateId] = useState<TemplateId>("signal");

  const selected = templates.find((template) => template.id === templateId) ?? templates[0];

  return (
    <div className="mx-auto w-full max-w-328 py-16 max-sm:py-10">
      <div className="mb-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-end">
        <div>
          <p className="mb-2 text-[11px] font-extrabold tracking-[.14em] text-(--color-accent-soft) uppercase">
            Template library
          </p>

          <h2 className="text-[clamp(2.2rem,5vw,4.5rem)] font-black tracking-[-.04em]">
            Choose a voice, not a skin.
          </h2>
        </div>

        <p className="max-w-md text-sm leading-6 text-(--color-panel)/60 lg:justify-self-end">
          Every template supports the same content. Switch directions without rebuilding your
          portfolio as the library grows.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div
          role="tablist"
          aria-label="Portfolio templates"
          className="grid content-start gap-2 sm:grid-cols-2 lg:grid-cols-1"
        >
          {templates.map((template) => (
            <button
              role="tab"
              key={template.id}
              onClick={() => setTemplateId(template.id)}
              aria-selected={templateId === template.id}
              className="border-panel-20 rounded-sm border p-4 text-left transition duration-150 hover:-translate-y-0.5 aria-selected:border-(--color-panel) aria-selected:bg-white aria-selected:text-(--color-ink)"
            >
              <span className="flex items-center justify-between gap-3 text-sm font-extrabold">
                {template.name}
                <ArrowRight size={14} className="opacity-45" />
              </span>

              <span className="mt-1.5 block text-[11px] leading-5 opacity-60">
                {template.audience}
              </span>
            </button>
          ))}

          <div className="border-panel-20 rounded-sm border border-dashed p-4">
            <p className="text-xs font-extrabold">More directions are coming</p>

            <p className="text-panel/50 mt-1.5 text-[11px] leading-5">
              New templates join the same flexible content system.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow-[0_6px_0_var(--color-accent)]">
          <div className="border-line flex min-h-15.5 flex-wrap items-center justify-between gap-3 border-b px-4">
            <div>
              <p className="text-ink text-sm font-extrabold">{selected.name}</p>
              <p className="text-muted mt-0.5 text-[10px] font-bold tracking-[.08em] uppercase">
                {selected.mood}
              </p>
            </div>

            <Link
              href={`/templates/${templateId}/preview`}
              className="text-accent inline-flex items-center gap-2 text-xs font-extrabold"
            >
              Full preview <ExternalLink size={12} />
            </Link>
          </div>

          <div className="relative h-162.5 overflow-hidden max-sm:h-130">
            <iframe
              tabIndex={-1}
              title={`${templateId} template preview`}
              src={`/templates/${templateId}/preview`}
              className="size-full border-0 bg-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
