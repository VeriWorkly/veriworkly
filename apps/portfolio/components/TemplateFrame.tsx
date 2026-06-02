"use client";

import { useState } from "react";
import { templates, type TemplateId } from "@/lib/portfolio";

export function TemplateFrame() {
  const [templateId, setTemplateId] = useState<TemplateId>("signal");
  return (
    <div className="mx-auto w-full max-w-[1312px] py-16 max-sm:py-9">
      <div className="mb-7 flex items-end justify-between gap-5 max-sm:flex-col max-sm:items-start">
        <div>
          <p className="mb-2 text-[11px] font-extrabold tracking-[.14em] text-[var(--color-accent-soft)] uppercase">
            Two distinct directions
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-[clamp(2.2rem,5vw,4.5rem)] font-medium tracking-[-.065em]">
            Choose a voice, not a skin.
          </h2>
        </div>
        <div className="flex gap-2" role="tablist" aria-label="Portfolio templates">
          {templates.map((template) => (
            <button
              className="min-h-10 rounded-full border border-[var(--color-panel-20)] px-4 text-xs font-extrabold whitespace-nowrap transition duration-150 hover:-translate-y-0.5 aria-selected:bg-[var(--color-panel)] aria-selected:text-[var(--color-ink)]"
              key={template.id}
              role="tab"
              aria-selected={templateId === template.id}
              onClick={() => setTemplateId(template.id)}
            >
              {template.name}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-panel-18)] bg-[var(--color-panel)] shadow-[0_30px_80px_var(--color-shadow)]">
        <div className="flex min-h-[46px] items-center justify-between gap-4 px-4 font-[family-name:var(--font-mono)] text-[10px] tracking-[.08em] text-[var(--color-muted)] uppercase">
          <span>Live sample · {templateId}</span>
          <a
            className="font-extrabold text-[var(--color-accent)]"
            href={`/templates/${templateId}/preview`}
          >
            Full preview &#8599;
          </a>
        </div>
        <div className="relative h-[680px] overflow-hidden max-sm:h-[590px]">
          <iframe
            className="size-full border-0 bg-[var(--color-panel)]"
            title={`${templateId} template preview`}
            src={`/templates/${templateId}/preview`}
            tabIndex={-1}
          />
        </div>
      </div>
    </div>
  );
}
