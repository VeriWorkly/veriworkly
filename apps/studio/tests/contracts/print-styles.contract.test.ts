import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { CoverLetterContent } from "@/features/cover-letter/types";
import type { ResumeData } from "@/types/resume";

import { createDefaultCoverLetter } from "@/features/cover-letter/defaults";
import { defaultResume } from "@/features/resume/constants/default-resume";
import { buildHtml } from "@/features/documents/export/export-html";
import { coverLetterTemplateRegistry } from "@/templates/cover-letter/registry";
import { buildCoverLetterHtml } from "@/templates/cover-letter/web";
import { PAPER_SIZES, getPageGeometry } from "@/templates/shared/page-geometry";
import { documentPrintCss } from "@/templates/shared/print-styles";
import { ResumeCanvas, sharePrintCss } from "@/app/share/components/ResumeCanvas";
import { ShareHeaderBar } from "@/app/share/components/ShareHeaderBar";

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "" }),
  Geist_Mono: () => ({ variable: "" }),
}));
vi.mock("@/lib/auth-client", () => ({ authClient: { useSession: () => ({ data: null }) } }));

/**
 * One set of print rules for every exported HTML document.
 *
 * Each cover letter template and the resume export used to carry its own copy of `@page`,
 * the print media query and the break rules, and they had drifted: only the resume asked
 * for `print-color-adjust`, so a cover letter's page colour and rules printed white. The
 * mechanics now live in `templates/shared/print-styles.ts`; these tests keep them there.
 */

const ROOT = process.cwd();

/** Where an exported document's markup is written, and the public share page that prints one. */
const EXPORT_SOURCES = ["templates", join("features", "documents", "export"), join("app", "share")];

/** Print mechanics that may only be spelled out by the shared helper. */
const PRINT_MECHANICS = [/@page\s*\{/, /@media print/, /print-color-adjust:\s*exact/];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);

    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

function onPaper(paperSize: string): {
  letter: CoverLetterContent;
  resume: ResumeData;
} {
  const letter = structuredClone(createDefaultCoverLetter("print").content) as CoverLetterContent;
  const resume = structuredClone(defaultResume);

  letter.appearance = { ...letter.appearance, paperSize: paperSize as "a4" };
  resume.customization = { ...resume.customization, paperSize: paperSize as "a4" };

  return { letter, resume };
}

const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

describe("every exported HTML document prints through the shared rules", () => {
  it("no template or exporter writes its own @page, print query or colour rule", () => {
    const helper = join(ROOT, "templates", "shared", "print-styles.ts");
    const offenders = EXPORT_SOURCES.flatMap((directory) => sourceFiles(join(ROOT, directory)))
      .filter((file) => file !== helper)
      .flatMap((file) => {
        const source = readFileSync(file, "utf8");

        return PRINT_MECHANICS.filter((pattern) => pattern.test(source)).map(
          (pattern) => `${relative(ROOT, file)} ${pattern}`,
        );
      });

    expect(offenders).toEqual([]);
  });

  it("every cover letter template and the resume exporter call the helper", () => {
    const callers = [
      ...coverLetterTemplateRegistry.ids.map((id) =>
        join("templates", "cover-letter", id === "veriworkly-special" ? "veriworkly" : id),
      ),
    ].map((directory) => join(ROOT, directory, "web.tsx"));

    callers.push(join(ROOT, "features", "documents", "export", "export-html.ts"));
    callers.push(join(ROOT, "app", "share", "components", "ResumeCanvas.tsx"));

    for (const file of callers) {
      expect(readFileSync(file, "utf8"), relative(ROOT, file)).toMatch(/documentPrintCss\(/);
    }
  });

  for (const paperSize of PAPER_SIZES) {
    const { widthPx, heightPx } = getPageGeometry(paperSize);
    const pageRule = `@page{size:${widthPx}px ${heightPx}px;`;

    it(`the helper's @page is the ${paperSize} sheet, and colours print exactly`, () => {
      const css = documentPrintCss({ paperSize, sheet: ".page" });

      expect(css.startsWith(pageRule)).toBe(true);
      expect(css).toContain("print-color-adjust:exact");
      expect(css).toContain("-webkit-print-color-adjust:exact");
      expect(css).toMatch(/@media print\{body\{[^}]*padding:0/);
      expect(css).toContain(".page{box-shadow:none!important;margin:0!important;");
    });

    it(`every cover letter template prints one ${paperSize} @page from the helper`, async () => {
      const { letter } = onPaper(paperSize);

      for (const templateId of coverLetterTemplateRegistry.ids) {
        const html = await buildCoverLetterHtml(letter, templateId);

        expect(count(html, "@page"), templateId).toBe(1);
        expect(html, templateId).toContain(pageRule);
        expect(html, templateId).toContain(
          "html{-webkit-print-color-adjust:exact;print-color-adjust:exact}",
        );
        expect(count(html, "@media print"), templateId).toBe(1);
      }
    });

    it(`the share page prints one ${paperSize} sheet per preview page, without its chrome`, () => {
      const { resume } = onPaper(paperSize);
      const html = renderToStaticMarkup(
        createElement(ResumeCanvas, {
          resume,
          sharePreviewId: "share",
          template: createElement("div", { id: "resume-container" }, "Resume"),
        }),
      );
      const css = sharePrintCss(paperSize);

      expect(count(html, "@page"), "one @page").toBe(1);
      // The preview pages are whole sheets already: no page margin on top of theirs.
      expect(css.startsWith(`${pageRule}margin:0}`)).toBe(true);
      expect(css).toContain("[data-resume-pages] > *{box-shadow:none!important;");
      expect(css).toContain("break-after:page}");
      expect(css).toContain("[data-resume-pages]{row-gap:0!important}");
      expect(css).toContain("[data-share-chrome],[data-export-exclude]{display:none!important}");
      // The rules reach the page, and the header they hide is the one the page draws.
      expect(html).toContain(pageRule);
      expect(renderToStaticMarkup(createElement(ShareHeaderBar, { expiresAt: null }))).toContain(
        "data-share-chrome",
      );
    });

    it(`the generated resume HTML prints one ${paperSize} @page from the helper`, () => {
      const html = buildHtml(onPaper(paperSize).resume);

      expect(count(html, "@page"), "generated").toBe(1);
      expect(html).toContain(pageRule);
      expect(html).toContain("print-color-adjust:exact");
    });
  }

  it("an unknown paper size prints A4, as the PDF does", () => {
    expect(documentPrintCss({ paperSize: "legal", sheet: ".page" })).toContain(
      "@page{size:794px 1122px;",
    );
  });
});
