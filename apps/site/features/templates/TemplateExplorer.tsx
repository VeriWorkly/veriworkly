"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { TemplateCardData } from "./cardFields";

import EmptyState from "./EmptyState";
import TemplateFilters, { ALL, type TemplateFilterState } from "./TemplateFilters";
import TemplateCard, { templateGridClass } from "./TemplateCard";

type Props = {
  templates: TemplateCardData[];
  /** "resume templates", for the result count. */
  noun: string;
};

const NO_FILTERS: TemplateFilterState = { query: "", family: ALL, layout: ALL };

/** Everything a visitor might type to find a template, lowercased once. */
const searchText = (template: TemplateCardData) =>
  [
    template.name,
    template.family,
    template.layout,
    template.shortDescription,
    ...template.tags,
    ...template.audience,
  ]
    .join(" ")
    .toLowerCase();

/**
 * Search and filters over a document type's templates, shown as a gallery.
 *
 * The state starts empty so the server-rendered HTML contains *every* template: the names,
 * descriptions and links are the page's SEO value and must not wait for hydration. A shared
 * `?q=&family=&layout=` link is applied on mount rather than through `useSearchParams`, which
 * would bail the page out of static rendering.
 */
const TemplateExplorer = ({ templates, noun }: Props) => {
  const [filters, setFilters] = useState(NO_FILTERS);

  const familyOptions = useMemo(
    () => Array.from(new Set(templates.map((template) => template.family))),
    [templates],
  );
  const layoutOptions = useMemo(
    () => Array.from(new Set(templates.map((template) => template.layout))),
    [templates],
  );
  const index = useMemo(
    () => templates.map((template) => ({ template, text: searchText(template) })),
    [templates],
  );

  // Adopt a deep link once on the client. Values that no longer exist are ignored rather than
  // yielding an empty gallery.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const family = params.get("family");
    const layout = params.get("layout");

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilters({
      query: params.get("q") ?? "",
      family: family && familyOptions.includes(family) ? family : ALL,
      layout: layout && layoutOptions.includes(layout) ? layout : ALL,
    });
    // Options come from a build-time constant, so this intentionally runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the URL shareable without a navigation: this is view state over data already on the
  // page, so a router push would round-trip the server for nothing.
  const update = useCallback((next: TemplateFilterState) => {
    setFilters(next);

    const params = new URLSearchParams(window.location.search);
    const set = (key: string, value: string, empty: string) =>
      value && value !== empty ? params.set(key, value) : params.delete(key);

    set("q", next.query.trim(), "");
    set("family", next.family, ALL);
    set("layout", next.layout, ALL);

    const query = params.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }, []);

  const visible = useMemo(() => {
    const terms = filters.query.toLowerCase().split(/\s+/).filter(Boolean);

    return index
      .filter(
        ({ template, text }) =>
          (filters.family === ALL || template.family === filters.family) &&
          (filters.layout === ALL || template.layout === filters.layout) &&
          terms.every((term) => text.includes(term)),
      )
      .map(({ template }) => template);
  }, [index, filters]);

  const filtered = filters.query.trim() !== "" || filters.family !== ALL || filters.layout !== ALL;
  const isPortfolio = templates[0]?.documentType === "portfolio-website";

  return (
    <>
      <TemplateFilters
        value={filters}
        onChange={update}
        familyOptions={familyOptions}
        layoutOptions={layoutOptions}
        shown={visible.length}
        total={templates.length}
        noun={noun}
        onReset={filtered ? () => update(NO_FILTERS) : undefined}
      />

      {visible.length ? (
        <ul className={templateGridClass(isPortfolio)}>
          {visible.map((template, position) => (
            <li key={template.id}>
              <TemplateCard template={template} loading={position < 4 ? "eager" : undefined} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState onReset={() => update(NO_FILTERS)} />
      )}
    </>
  );
};

export default TemplateExplorer;
