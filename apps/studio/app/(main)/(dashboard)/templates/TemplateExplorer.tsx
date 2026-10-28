"use client";

import type { KeyboardEvent } from "react";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, FileText } from "lucide-react";

import { Badge, Button, cn } from "@veriworkly/ui";

import { DOCUMENT_TYPES, type DocumentType } from "@/features/documents/core/document-types";

import type { GalleryTemplate } from "./template-gallery";

const TAB_LABELS: Record<DocumentType, string> = {
  RESUME: "Resumes",
  COVER_LETTER: "Cover letters",
};

function TemplateCard({ template }: { template: GalleryTemplate }) {
  return (
    <article className="border-border bg-card flex flex-col overflow-hidden rounded-2xl border shadow-sm">
      <div className="border-border/70 relative h-64 border-b bg-[color-mix(in_oklab,var(--card)_78%,var(--background))]">
        {template.previewImage ? (
          <Image
            fill
            alt={`${template.name} template preview`}
            src={template.previewImage}
            sizes="(min-width: 1280px) 25vw, (min-width: 640px) 45vw, 90vw"
            className="object-cover object-top p-3"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <FileText className="text-accent h-8 w-8" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h2 className="text-lg font-black tracking-tight">{template.name}</h2>
        <p className="text-muted mt-2 line-clamp-3 text-sm leading-6">{template.description}</p>

        {template.tags.length ? (
          <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Template traits">
            {template.tags.slice(0, 3).map((tag) => (
              <li key={tag}>
                <Badge className="px-2 py-0.5 text-xs">{tag}</Badge>
              </li>
            ))}
          </ul>
        ) : null}

        <Button asChild variant="primary" className="mt-5 w-full gap-2 sm:mt-auto">
          <Link href={template.href} aria-label={`Use the ${template.name} template`}>
            Use this template
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </article>
  );
}

export function TemplateExplorer({
  templates,
}: {
  templates: Record<DocumentType, GalleryTemplate[]>;
}) {
  const [active, setActive] = useState<DocumentType>("RESUME");
  const tabRefs = useRef<Partial<Record<DocumentType, HTMLButtonElement | null>>>({});

  // Arrow keys move between tabs, as screen-reader users expect of a tab list.
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;

    event.preventDefault();

    const step = event.key === "ArrowRight" ? 1 : -1;
    const index = DOCUMENT_TYPES.indexOf(active);
    const next = DOCUMENT_TYPES[(index + step + DOCUMENT_TYPES.length) % DOCUMENT_TYPES.length];

    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="space-y-5">
      <div
        role="tablist"
        aria-label="Document type"
        onKeyDown={handleKeyDown}
        className="border-border bg-card inline-flex gap-1 rounded-xl border p-1"
      >
        {DOCUMENT_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            role="tab"
            id={`templates-tab-${type}`}
            aria-selected={active === type}
            aria-controls={`templates-panel-${type}`}
            tabIndex={active === type ? 0 : -1}
            ref={(node) => {
              tabRefs.current[type] = node;
            }}
            onClick={() => setActive(type)}
            className={cn(
              "focus-visible:ring-accent/40 rounded-lg px-4 py-2 text-sm font-bold transition outline-none focus-visible:ring-2",
              active === type
                ? "bg-accent text-accent-foreground"
                : "text-muted hover:bg-background hover:text-foreground",
            )}
          >
            {TAB_LABELS[type]} ({templates[type].length})
          </button>
        ))}
      </div>

      {DOCUMENT_TYPES.map((type) => (
        <div
          key={type}
          role="tabpanel"
          id={`templates-panel-${type}`}
          aria-labelledby={`templates-tab-${type}`}
          hidden={active !== type}
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {templates[type].map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      ))}
    </div>
  );
}
