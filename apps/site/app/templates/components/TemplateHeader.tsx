import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import type { TemplateSummary } from "@/config/templates";

import { Badge, Button } from "@veriworkly/ui";

import { buildEditorUrl } from "./utils";

export function TemplateDetailHeader({ template }: { template: TemplateSummary }) {
  const editorUrl = buildEditorUrl(template);

  return (
    <header className="border-border bg-card/60 grid gap-8 rounded-3xl border p-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)] lg:items-end">
      <div className="space-y-5">
        <Link
          href={`/templates/${template.documentType}`}
          className="text-muted hover:text-foreground focus-visible:ring-accent inline-flex items-center gap-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to {template.documentTypeLabel.toLowerCase()} templates
        </Link>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{template.documentTypeLabel}</Badge>
            <Badge>{template.family}</Badge>
            <Badge>{template.layout}</Badge>
          </div>

          <h1 className="text-foreground max-w-4xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            {template.name}
          </h1>

          <p className="text-muted max-w-2xl text-base leading-7">{template.description}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {template.tags.map((tag) => (
            <span
              key={tag}
              className="border-border bg-background text-muted rounded-full border px-3 py-1.5 text-sm"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="border-border bg-background rounded-2xl border p-4">
          <p className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
            Primary fit
          </p>
          <p className="text-muted mt-3 text-sm leading-6">{template.bestFor[0]}</p>
        </div>

        <Button asChild size="lg" variant="primary" className="h-12 w-full rounded-full px-6">
          <Link href={editorUrl}>
            Use This Template
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </header>
  );
}
