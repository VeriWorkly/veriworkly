import Link from "next/link";
import type { TemplateSummary } from "@/config/templates";
import { hrefWithFilters } from "./utils";

type Props = {
  docType: string;
  templates: TemplateSummary[];
  selectedFamily: string;
  selectedLayout: string;
};

const unique = (values: string[]) => {
  return ["All", ...Array.from(new Set(values))];
};

const TemplateFilters = ({ docType, templates, selectedFamily, selectedLayout }: Props) => {
  const familyOptions = unique(templates.map((template) => template.family));
  const layoutOptions = unique(templates.map((template) => template.layout));

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-[#0c0c0c]"
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
                "rounded-full border px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 focus-visible:outline-none",
                active
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-zinc-200 bg-white text-zinc-500 hover:text-zinc-900 dark:border-zinc-800 dark:bg-[#0c0c0c] dark:text-zinc-400 dark:hover:text-white",
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
                "rounded-full border px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 focus-visible:outline-none",
                active
                  ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                  : "border-zinc-200 bg-white text-zinc-500 hover:text-zinc-900 dark:border-zinc-800 dark:bg-[#0c0c0c] dark:text-zinc-400 dark:hover:text-white",
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
