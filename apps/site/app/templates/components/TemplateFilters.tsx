import Link from "next/link";

import type { TemplateSummary } from "@/config/templates";

import { hrefWithFilters } from "./utils";

type Props = {
  docType: string;
  templates: TemplateSummary[];
  selectedFamily: string;
  selectedLayout: string;
};

function unique(values: string[]) {
  return ["All", ...Array.from(new Set(values))];
}

const TemplateFilters = ({ docType, templates, selectedFamily, selectedLayout }: Props) => {
  const familyOptions = unique(templates.map((template) => template.family));
  const layoutOptions = unique(templates.map((template) => template.layout));

  return (
    <div
      className="border-border bg-card/70 flex flex-col gap-3 rounded-2xl border p-3 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Template filters"
    >
      <div className="flex flex-wrap gap-2">
        {familyOptions.map((family) => {
          const active = selectedFamily === family;

          return (
            <Link
              key={family}
              href={hrefWithFilters(docType, family, selectedLayout)}
              className={[
                "focus-visible:ring-accent rounded-full border px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                active
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border bg-background text-muted hover:text-foreground",
              ].join(" ")}
            >
              {family}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {layoutOptions.map((layout) => {
          const active = selectedLayout === layout;

          return (
            <Link
              key={layout}
              href={hrefWithFilters(docType, selectedFamily, layout)}
              className={[
                "focus-visible:ring-accent rounded-full border px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-muted hover:text-foreground",
              ].join(" ")}
            >
              {layout}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default TemplateFilters;
