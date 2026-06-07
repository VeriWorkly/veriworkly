"use client";

import { useState } from "react";
import { ArrowRight, ExternalLink } from "lucide-react";
import { templates, type TemplateId } from "@/lib/portfolio";

export function TemplateFrame() {
  const [templateId, setTemplateId] = useState<TemplateId>("signal");
  const selected = templates.find((template) => template.id === templateId) ?? templates[0];

  return (
    <div className="mx-auto w-full max-w-[1312px] py-16 max-sm:py-10">
      <div className="mb-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-end">
        <div>
          <p className="mb-2 text-[11px] font-extrabold tracking-[.14em] text-[var(--color-accent-soft)] uppercase">
            Template library
          </p>
          <h2 className="text-[clamp(2.2rem,5vw,4.5rem)] font-black tracking-[-.04em]">
            Choose a voice, not a skin.
          </h2>
        </div>
        <p className="max-w-md text-sm leading-6 text-[var(--color-panel)]/60 lg:justify-self-end">
          Every template supports the same content. Switch directions without rebuilding your
          portfolio as the library grows.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div
          className="grid content-start gap-2 sm:grid-cols-2 lg:grid-cols-1"
          role="tablist"
          aria-label="Portfolio templates"
        >
          {templates.map((template) => (
            <button
              className="rounded-[var(--radius-sm)] border border-[var(--color-panel-20)] p-4 text-left transition duration-150 hover:-translate-y-0.5 aria-selected:border-[var(--color-panel)] aria-selected:bg-[var(--color-panel)] aria-selected:text-[var(--color-ink)]"
              key={template.id}
              role="tab"
              aria-selected={templateId === template.id}
              onClick={() => setTemplateId(template.id)}
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
          <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--color-panel-20)] p-4">
            <p className="text-xs font-extrabold">More directions are coming</p>
            <p className="mt-1.5 text-[11px] leading-5 text-[var(--color-panel)]/50">
              New templates join the same flexible content system.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-panel)] shadow-[0_6px_0_var(--color-accent)]">
          <div className="flex min-h-[62px] flex-wrap items-center justify-between gap-3 border-b border-[var(--color-line)] px-4">
            <div>
              <p className="text-sm font-extrabold text-[var(--color-ink)]">{selected.name}</p>
              <p className="mt-0.5 text-[10px] font-bold tracking-[.08em] text-[var(--color-muted)] uppercase">
                {selected.mood}
              </p>
            </div>
            <a
              className="inline-flex items-center gap-2 text-xs font-extrabold text-[var(--color-accent)]"
              href={`/templates/${templateId}/preview`}
            >
              Full preview <ExternalLink size={12} />
            </a>
          </div>
          <div className="relative h-[650px] overflow-hidden max-sm:h-[520px]">
            <iframe
              className="size-full border-0 bg-[var(--color-panel)]"
              title={`${templateId} template preview`}
              src={`/templates/${templateId}/preview`}
              tabIndex={-1}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
