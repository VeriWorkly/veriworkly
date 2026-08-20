import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  EXPORT_EXCLUDE_ATTRIBUTE,
  EXPORT_ROOT_ATTRIBUTE,
} from "@/features/documents/export/export-dom-markers";
import { ResumePagedPreview } from "@/features/resume/editor/ResumePagedPreview";

/**
 * The "Export → HTML" action clones the rendered preview out of the DOM.
 *
 * `ResumePagedPreview` renders the resume *twice*: once as the paginated pages the user
 * sees, and once into an off-screen container the paginator measures page breaks against.
 * The export used to clone the stage wrapping both, so every exported file carried a
 * complete hidden duplicate — invisible in a browser, but two of everything to an ATS, a
 * scraper, or a text extractor.
 *
 * This pins the DOM contract the exporter depends on. The full end-to-end assertion (a real
 * export containing the candidate's name exactly once) needs a real browser and lives in
 * `tests/browser/editor-behavior.test.ts`; that test can only stay honest while these
 * markers are where the exporter expects them.
 */

const CANDIDATE = "Ada Lovelace";

function previewMarkup(): string {
  return renderToStaticMarkup(
    <ResumePagedPreview>
      <div id="resume-container">{CANDIDATE}</div>
    </ResumePagedPreview>,
  );
}

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

describe("resume export source contract", () => {
  it("marks exactly one export root in the preview", () => {
    // More than one and `querySelector` picks an arbitrary winner; none and the exporter
    // falls back to cloning the whole stage, which is the original defect.
    expect(occurrences(previewMarkup(), EXPORT_ROOT_ATTRIBUTE)).toBe(1);
  });

  it("keeps the off-screen measuring copy behind the export-exclude marker", () => {
    const markup = previewMarkup();

    expect(occurrences(markup, EXPORT_EXCLUDE_ATTRIBUTE)).toBe(1);

    // DOM order: the measuring container precedes the visible pages container.
    expect(markup.indexOf(EXPORT_EXCLUDE_ATTRIBUTE)).toBeLessThan(
      markup.indexOf(EXPORT_ROOT_ATTRIBUTE),
    );
  });

  it("puts every copy of the resume body outside the export root at rest", () => {
    const markup = previewMarkup();

    // Pagination runs in an effect, so server-rendered pages are empty: the only copy of
    // the document here is the measuring one. If a second, unmarked copy is ever added
    // ahead of the pages container, this catches it.
    expect(occurrences(markup, CANDIDATE)).toBe(1);
    expect(markup.slice(markup.indexOf(EXPORT_ROOT_ATTRIBUTE))).not.toContain(CANDIDATE);
  });
});
