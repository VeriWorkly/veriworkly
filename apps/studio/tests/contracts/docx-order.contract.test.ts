import { describe, expect, it } from "vitest";

import type { ResumeData } from "@/types/resume";
import type { CoverLetterContent } from "@/features/cover-letter/types";

import { buildCoverLetterDocx } from "@/features/documents/export/docx/document-docx";
import { buildResumeDocx } from "@/features/documents/export/docx/resume-docx";
import { getResumeExportDocument } from "@/features/documents/export/resume-export-document";
import { coverLetterTemplateRegistry } from "@/templates/cover-letter/registry";
import { buildProfessionalFlowItems, getCoverLetterState } from "@/templates/cover-letter/shared";
import { loadTemplatePdfComponentById, pdfTemplateIds } from "@/templates/resume/pdf";
import { unzipDocx } from "@/tests/utils/docx";

import { PARITY_FIXTURES, type ParityFixtureId } from "../parity/fixtures";
import { layoutPages, pdfNodeText } from "../parity/pdf-layout";

/**
 * The Word file is not drawn by a template, so its layout is its own; what must agree with
 * the PDF the template draws is the content and its order. For every template, the
 * document's name, each section heading (renamed ones included) and each entry title — and
 * for a letter, the sender and every paragraph — appear in the DOCX in the order the PDF
 * prints them.
 */

const RESUME_FIXTURES: ParityFixtureId[] = [
  "default",
  "short",
  "dense",
  "date-mm-yyyy",
  "date-yyyy-mm",
  "renamed",
  "custom",
  "rtl",
];

const LETTER_FIXTURES: ParityFixtureId[] = ["default", "short", "dense", "long", "rtl"];

/**
 * Compared without case, whitespace or hyphens: templates uppercase their headings, the PDF
 * breaks words across lines with a hyphen, and the DOCX keeps runs in separate elements.
 */
const key = (text: string) => text.toLowerCase().replace(/[\s­-]+/g, "");

/** The text of a DOCX body, run by run, in document order. */
async function docxText(blob: Blob): Promise<string> {
  const xml = (await unzipDocx(blob)).get("word/document.xml") ?? "";

  return Array.from(xml.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g), (match) => match[1])
    .join(" ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/** The anchors `text` is missing or holds out of order; empty when all are in order. */
function outOfOrder(text: string, anchors: string[]): string[] {
  const haystack = key(text);
  const problems: string[] = [];
  let from = 0;

  for (const anchor of anchors) {
    const at = haystack.indexOf(key(anchor), from);

    if (at === -1) {
      problems.push(
        haystack.includes(key(anchor)) ? `"${anchor}" out of order` : `"${anchor}" missing`,
      );
      continue;
    }

    from = at + key(anchor).length;
  }

  return problems;
}

/** A prefix long enough to be unique, short enough not to straddle a PDF hyphenation. */
const head = (text: string) => text.trim().split(/\s+/).slice(0, 4).join(" ");

function resumeAnchors(resume: ResumeData): string[] {
  const document = getResumeExportDocument(resume);
  const anchors = document.name ? [document.name] : [];

  for (const section of document.sections) {
    anchors.push(section.title);

    if (section.children.kind === "items") {
      for (const item of section.children.items) if (item.title) anchors.push(head(item.title));
    }
  }

  return anchors;
}

describe("the DOCX carries the PDF's content in the PDF's order", () => {
  for (const fixture of RESUME_FIXTURES) {
    it(`resume/${fixture}: every template's PDF and the DOCX agree on order`, async () => {
      const base = PARITY_FIXTURES[fixture].resume();
      const anchors = resumeAnchors(base);
      const docx = await docxText(await buildResumeDocx(base));

      expect(anchors.length).toBeGreaterThan(1);
      expect(outOfOrder(docx, anchors), `docx ${fixture}`).toEqual([]);

      for (const templateId of pdfTemplateIds) {
        const pages = await layoutPages(await loadTemplatePdfComponentById(templateId), {
          resume: { ...base, templateId },
        });
        const pdf = pages.map(pdfNodeText).join(" ");

        expect(outOfOrder(pdf, anchors), `pdf ${templateId}/${fixture}`).toEqual([]);
      }
    }, 120_000);
  }

  for (const fixture of LETTER_FIXTURES) {
    it(`cover letter/${fixture}: every template's PDF and the DOCX agree on order`, async () => {
      const content = PARITY_FIXTURES[fixture].coverLetter() as CoverLetterContent;
      const state = getCoverLetterState(content);
      const anchors = [
        state.senderName,
        ...buildProfessionalFlowItems(state.flow).flatMap((item) =>
          "items" in item ? item.items.map(head) : [head(item.text)],
        ),
      ].filter(Boolean);
      const docx = await docxText(await buildCoverLetterDocx(content));

      expect(outOfOrder(docx, anchors), `docx ${fixture}`).toEqual([]);

      for (const templateId of coverLetterTemplateRegistry.ids) {
        const pages = await layoutPages(await coverLetterTemplateRegistry.loadPdf(templateId), {
          content,
        });
        const pdf = pages.map(pdfNodeText).join(" ");

        expect(outOfOrder(pdf, anchors), `pdf ${templateId}/${fixture}`).toEqual([]);
      }
    }, 120_000);
  }
});

describe("S-401 the DOCX is valid XML whatever was pasted", () => {
  // XML 1.0 forbids C0 controls other than tab, LF and CR; Word refuses or "repairs" the file.
  const FORBIDDEN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/;
  const dirty = (text: string) => `${text}\u0002 x\u001F\u000B\u0000\uFFFE`;

  it("S-401 control characters in a resume never reach the DOCX", async () => {
    const base = PARITY_FIXTURES.default.resume();
    const resume = {
      ...base,
      basics: {
        ...base.basics,
        fullName: dirty(base.basics.fullName),
        headline: dirty(base.basics.headline),
      },
      summary: dirty(base.summary),
      experience: base.experience.map((item) => ({
        ...item,
        role: dirty(item.role),
        highlights: item.highlights.map(dirty),
      })),
    };
    const xml = (await unzipDocx(await buildResumeDocx(resume))).get("word/document.xml") ?? "";

    expect(xml).toContain(base.basics.fullName);
    expect(xml).not.toMatch(FORBIDDEN);
  });

  it("S-401 control characters in a cover letter never reach the DOCX", async () => {
    const content = PARITY_FIXTURES.default.coverLetter() as CoverLetterContent;
    const letter = {
      ...content,
      senderName: dirty(content.senderName),
      body: dirty(content.body),
      subject: dirty(content.subject),
    };
    const xml =
      (await unzipDocx(await buildCoverLetterDocx(letter))).get("word/document.xml") ?? "";

    expect(xml).not.toMatch(FORBIDDEN);
  });
});
