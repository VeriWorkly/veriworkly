import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  EXPORT_EXCLUDE_ATTRIBUTE,
  EXPORT_ROOT_ATTRIBUTE,
} from "@/features/documents/export/export-dom-markers";
import {
  ResumePagedPreview,
  flowContainerProps,
} from "@/features/resume/editor/ResumePagedPreview";

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
    <ResumePagedPreview paperSize="a4">
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

  it("before the pages are measured, the one copy is the export root, and visible", () => {
    const markup = previewMarkup();

    // Pagination runs in an effect, so the server renders no pages: the whole resume is the
    // document until then — for the server's HTML, a reader with no script, and a screen
    // reader. It is the export root, so nothing exports an empty page meanwhile.
    expect(occurrences(markup, CANDIDATE)).toBe(1);
    expect(occurrences(markup, EXPORT_EXCLUDE_ATTRIBUTE)).toBe(0);

    const root = markup.match(new RegExp(`<div[^>]*${EXPORT_ROOT_ATTRIBUTE}[^>]*>`))?.[0];

    expect(root).toBeDefined();
    expect(markup.slice(markup.indexOf(root!))).toContain(CANDIDATE);
    expect(root).not.toMatch(/aria-hidden|\binert|opacity-0|-10000/);
  });

  it("once pages are drawn, the measuring copy leaves the export, the screen and the tab order", () => {
    const hidden = flowContainerProps(false, 794);
    const shown = flowContainerProps(true, 794);

    expect(hidden).toMatchObject({ [EXPORT_EXCLUDE_ATTRIBUTE]: "true", "aria-hidden": "true" });
    expect(hidden).not.toHaveProperty(EXPORT_ROOT_ATTRIBUTE);
    expect(hidden.className).toContain("opacity-0");
    expect(hidden.style).toMatchObject({ left: -10000, width: 794 });

    expect(shown).toMatchObject({ [EXPORT_ROOT_ATTRIBUTE]: "true" });
    expect(shown).not.toHaveProperty(EXPORT_EXCLUDE_ATTRIBUTE);
    expect(shown).not.toHaveProperty("aria-hidden");
    expect(shown.style).toEqual({ width: 794 });
  });

  it("S-311: keeps the measuring copy's links out of the tab order once it is a copy", () => {
    // S-311: its links are copies the user cannot see.
    expect(flowContainerProps(false, 794)).toMatchObject({ inert: true });
    expect(flowContainerProps(true, 794)).not.toHaveProperty("inert");
  });
});
