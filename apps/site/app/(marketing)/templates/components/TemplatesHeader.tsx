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
            <span className="rounded-full border border-blue-500/15 bg-blue-500/5 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
              {templates.length} live templates
            </span>
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:bg-white/5 dark:text-zinc-400">
              {layouts.join(" + ")}
            </span>
          </div>

          <div className="space-y-4">
            <h1 className="max-w-4xl text-4xl font-semibold tracking-tighter text-balance text-zinc-900 sm:text-6xl dark:text-white">
              Choose by job-to-be-done, then by taste.
            </h1>

            <p className="max-w-2xl text-base leading-7 text-zinc-500 dark:text-zinc-400">
              {docType.description} Each option below is shown as a working document, with enough
              context to decide before opening the editor.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#0c0c0c]">
          <div className="grid grid-cols-3 divide-x divide-zinc-200 dark:divide-zinc-800">
            <div className="p-4">
              <p className="text-2xl font-semibold text-zinc-900 dark:text-white">
                {templates.length}
              </p>
              <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">ready to use</p>
            </div>

            <div className="p-4">
              <p className="text-2xl font-semibold text-zinc-900 dark:text-white">
                {families.length}
              </p>
              <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">style systems</p>
            </div>

            <div className="p-4">
              <p className="text-2xl font-semibold text-zinc-900 dark:text-white">
                {layouts.length}
              </p>
              <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">layout modes</p>
            </div>
          </div>

          <div className="border-t border-zinc-200 p-5 dark:border-zinc-800">
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">Optimized for</p>

            <div className="mt-3 flex flex-wrap gap-2">
              {docType.highlights.map((highlight) => (
                <span
                  key={highlight}
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-white/5 dark:text-zinc-400"
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
