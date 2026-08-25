"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { TemplateSummary } from "@/config/templates";
import { Reveal } from "@/components/marketing/Reveal";

import EmptyState from "./EmptyState";
import TemplateGroup from "./TemplateGroup";
import TemplateFilters from "./TemplateFilters";
import { getTemplateHref } from "./utils";

const ALL = "All";

type Props = {
  docTypeLabel: string;
  templates: TemplateSummary[];
  familyDescriptions: Record<string, string>;
};

/**
 * Owns the family/layout filter for a document type.
 *
 * Filtering used to live in the page's `searchParams`, which forced the whole route out
 * of static generation just to filter a 2-4 item array compiled from local config.
 * Doing it here keeps `/templates/[docType]` prerendered.
 *
 * The filter state starts at "All" so the server-rendered HTML contains *every*
 * template - the names, descriptions and links are the page's actual SEO value and must
 * not be hidden behind hydration. A shared `?family=&layout=` link is applied on mount
 * instead of via `useSearchParams`, which would trigger a client-render bailout and
 * strip that content from the static HTML.
 */
const TemplateExplorer = ({ docTypeLabel, templates, familyDescriptions }: Props) => {
  const [selectedFamily, setSelectedFamily] = useState(ALL);
  const [selectedLayout, setSelectedLayout] = useState(ALL);

  const familyOptions = useMemo(
    () => Array.from(new Set(templates.map((template) => template.family))),
    [templates],
  );

  const layoutOptions = useMemo(
    () => Array.from(new Set(templates.map((template) => template.layout))),
    [templates],
  );

  // Adopt a deep-linked filter once on the client. Values that no longer exist are
  // ignored rather than yielding an empty board.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const family = params.get("family");
    const layout = params.get("layout");

    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (family && familyOptions.includes(family)) setSelectedFamily(family);
    if (layout && layoutOptions.includes(layout)) setSelectedLayout(layout);
    // Options come from a build-time constant, so this intentionally runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the URL shareable without a navigation: this is view state over data already
  // on the page, so a router push would round-trip the server for nothing.
  const syncUrl = useCallback((family: string, layout: string) => {
    const params = new URLSearchParams(window.location.search);

    if (family === ALL) params.delete("family");
    else params.set("family", family);

    if (layout === ALL) params.delete("layout");
    else params.set("layout", layout);

    const query = params.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }, []);

  const handleFamilyChange = useCallback(
    (family: string) => {
      setSelectedFamily(family);
      syncUrl(family, selectedLayout);
    },
    [selectedLayout, syncUrl],
  );

  const handleLayoutChange = useCallback(
    (layout: string) => {
      setSelectedLayout(layout);
      syncUrl(selectedFamily, layout);
    },
    [selectedFamily, syncUrl],
  );

  const handleReset = useCallback(() => {
    setSelectedFamily(ALL);
    setSelectedLayout(ALL);
    syncUrl(ALL, ALL);
  }, [syncUrl]);

  const visibleTemplates = useMemo(
    () =>
      templates.filter((template) => {
        const familyMatch = selectedFamily === ALL || template.family === selectedFamily;
        const layoutMatch = selectedLayout === ALL || template.layout === selectedLayout;

        return familyMatch && layoutMatch;
      }),
    [templates, selectedFamily, selectedLayout],
  );

  const familyGroups = useMemo(
    () =>
      familyOptions.map((family) => ({
        title: family,
        description: familyDescriptions[family] ?? "",
        items: visibleTemplates.filter((template) => template.family === family),
      })),
    [familyOptions, familyDescriptions, visibleTemplates],
  );

  // With one family and one layout the control offers no real choice - every button
  // would be a no-op. This is the case for portfolio websites today.
  const hasMeaningfulFilters = familyOptions.length > 1 || layoutOptions.length > 1;

  return (
    <>
      {hasMeaningfulFilters && (
        <TemplateFilters
          familyOptions={familyOptions}
          layoutOptions={layoutOptions}
          selectedFamily={selectedFamily}
          selectedLayout={selectedLayout}
          onFamilyChange={handleFamilyChange}
          onLayoutChange={handleLayoutChange}
        />
      )}

      <Reveal
        priority
        className="overflow-hidden rounded-4xl border border-zinc-200 bg-white dark:border-zinc-800/80 dark:bg-[#0c0c0c]"
        aria-label={`${docTypeLabel} template quick comparison`}
      >
        <div className="grid gap-px bg-zinc-200 lg:grid-cols-2 dark:bg-zinc-800">
          {visibleTemplates.map((template) => (
            <Link
              key={template.id}
              href={getTemplateHref(template)}
              className="group bg-white p-5 transition-colors hover:bg-blue-500/5 focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 focus-visible:outline-none dark:bg-[#0c0c0c] dark:hover:bg-blue-500/5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-2">
                  <p className="text-xs font-semibold tracking-[0.18em] text-zinc-400 uppercase dark:text-zinc-500">
                    {template.family}
                  </p>

                  <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                    {template.name}
                  </h2>

                  <p className="line-clamp-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                    {template.shortDescription}
                  </p>
                </div>

                <span
                  className="mt-1 h-3 w-12 shrink-0 rounded-full"
                  style={{ backgroundColor: template.accentColor }}
                  aria-hidden="true"
                />
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {[template.layout, ...template.audience.slice(0, 2)].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-white/5 dark:text-zinc-400"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </Reveal>

      {visibleTemplates.length ? (
        <div className="space-y-12">
          {familyGroups.map(
            (group) => group.items.length > 0 && <TemplateGroup key={group.title} group={group} />,
          )}
        </div>
      ) : (
        <EmptyState onReset={handleReset} />
      )}
    </>
  );
};

export default TemplateExplorer;
