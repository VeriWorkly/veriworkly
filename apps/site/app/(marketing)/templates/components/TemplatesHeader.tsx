import { Badge } from "@veriworkly/ui";
import type { DocumentTypeSummary, TemplateSummary } from "@/config/templates";

import TemplateFilters from "./TemplateFilters";

type Props = {
  docType: DocumentTypeSummary;
  templates: TemplateSummary[];
  selectedFamily: string;
  selectedLayout: string;
};

const TemplatesHeader = ({ docType, templates, selectedFamily, selectedLayout }: Props) => {
  const layouts = Array.from(new Set(templates.map((template) => template.layout)));
  const families = Array.from(new Set(templates.map((template) => template.family)));

  return (
    <header className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] lg:items-end">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{templates.length} live templates</Badge>
            <Badge>{layouts.join(" + ")}</Badge>
          </div>

          <div className="space-y-4">
            <h1 className="text-foreground max-w-4xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
              Choose by job-to-be-done, then by taste.
            </h1>

            <p className="text-muted max-w-2xl text-base leading-7">
              {docType.description} Each option below is shown as a working document, with enough
              context to decide before opening the editor.
            </p>
          </div>
        </div>

        <div className="border-border bg-card/75 overflow-hidden rounded-2xl border">
          <div className="divide-border grid grid-cols-3 divide-x">
            <div className="p-4">
              <p className="text-foreground text-2xl font-semibold">{templates.length}</p>
              <p className="text-muted text-xs leading-5">ready to use</p>
            </div>

            <div className="p-4">
              <p className="text-foreground text-2xl font-semibold">{families.length}</p>
              <p className="text-muted text-xs leading-5">style systems</p>
            </div>

            <div className="p-4">
              <p className="text-foreground text-2xl font-semibold">{layouts.length}</p>
              <p className="text-muted text-xs leading-5">layout modes</p>
            </div>
          </div>

          <div className="border-border border-t p-5">
            <p className="text-foreground text-sm font-semibold">Optimized for</p>

            <div className="mt-3 flex flex-wrap gap-2">
              {docType.highlights.map((highlight) => (
                <span
                  key={highlight}
                  className="border-border bg-background text-muted rounded-full border px-3 py-1.5 text-sm"
                >
                  {highlight}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <TemplateFilters
        docType={docType.id}
        templates={templates}
        selectedFamily={selectedFamily}
        selectedLayout={selectedLayout}
      />
    </header>
  );
};

export default TemplatesHeader;
