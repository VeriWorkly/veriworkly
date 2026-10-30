import { join } from "node:path";
import { createRequire } from "node:module";

import { createElement } from "react";
import { Font, pdf } from "@react-pdf/renderer";
import { beforeAll, describe, expect, it } from "vitest";

import type { ComponentType } from "react";
import type { ResumeData } from "@/types/resume";
import type { CoverLetterContent } from "@/features/cover-letter/types";

import { FONT_REGISTRY } from "@/features/documents/constants/fonts";
import { createDefaultCoverLetter } from "@/features/cover-letter/defaults";
import { defaultResume } from "@/features/resume/constants/default-resume";
import { loadTemplatePdfComponentById, pdfTemplateIds } from "@/templates/resume/pdf";
import { coverLetterTemplateRegistry } from "@/templates/cover-letter/registry";
import { registerPdfTestFonts, resolveLayoutEngine } from "@/tests/utils/pdf";

/**
 * Every paragraph must be broken into lines at the width of the box it ends up
 * in, not at the width of something else.
 *
 * `@react-pdf/layout` breaks a `Text` exactly once, during Yoga's first measure
 * pass, and then refuses to redo it:
 *
 *     const shouldLayoutText = (node) => isText(node) && !node.lines;
 *
 * A `Text` sized by flex is measured before its width is known, so it is broken
 * for the *container's* width. The paragraph then runs past its own column and
 * off the edge of the page, while the preview — which measures after layout —
 * wraps correctly. Every template therefore states an explicit width on the
 * columns its prose flows in.
 *
 * The check re-wraps each string at the box react-pdf actually gave it and
 * compares the line count. Fewer lines in the PDF than the text needs means it
 * was broken for a wider measure and is now overflowing.
 */

const require_ = createRequire(import.meta.url);
const fontkit = createRequire(require_.resolve("@react-pdf/renderer"))("fontkit");

interface Face {
  unitsPerEm: number;
  layout: (text: string) => { advanceWidth: number };
}

interface Node {
  type: string;
  box?: { top?: number; width?: number; height?: number };
  style?: { fontSize?: number; fontWeight?: number; letterSpacing?: number };
  lines?: {
    string?: string;
    box?: { y: number; height: number };
  }[];
  children?: Node[];
  value?: string;
}

const faces = new Map<string, Face>();

function face(weight: number): Face {
  const key = String(weight >= 600 ? 700 : 400);
  const cached = faces.get(key);
  if (cached) return cached;

  const entry = FONT_REGISTRY.geist.pdfFonts.find((f) => String(f.fontWeight) === key)!;
  const loaded = fontkit.openSync(join(`${__dirname}/../..`, "public", entry.src)) as Face;

  faces.set(key, loaded);
  return loaded;
}

/** Advance width in points, matching how react-pdf shapes the run. */
function widthPt(text: string, fontSizePt: number, weight: number, letterSpacingPt: number) {
  const f = face(weight);
  const advance = (f.layout(text).advanceWidth / f.unitsPerEm) * fontSizePt;

  return advance + letterSpacingPt * [...text].length;
}

/**
 * Measures the lines react-pdf actually produced against the box they sit in.
 *
 * Comparing the drawn line rather than re-deriving a line count keeps the check
 * independent of where the breaks fall. The PDF breaks lines by the browser's rules
 * (`templates/pdf/line-breaks.ts`), which never squeeze a line's spaces to make it fit,
 * so there is no slack beyond float noise: a line's ink stays inside its column.
 */
function overflowingLines(node: Node, found: string[] = []): string[] {
  if (node.type === "TEXT" && node.lines) {
    const boxPt = node.box?.width ?? 0;
    const fontSizePt = node.style?.fontSize ?? 0;
    const weight = node.style?.fontWeight ?? 400;
    const ls = node.style?.letterSpacing ?? 0;

    if (fontSizePt > 0 && boxPt > 0) {
      for (const line of node.lines) {
        const text = (line.string ?? "").replace(/\s+$/, "");

        // A single unbreakable token has nowhere to go; that is the content's
        // problem, not the layout's.
        if (!text.includes(" ")) continue;

        const slack = 0.01;
        const ink = widthPt(text, fontSizePt, weight, ls);

        if (ink > boxPt + slack) {
          found.push(
            `"${text.slice(0, 52).replace(/\s+/g, " ")}…" draws ${(ink / 0.75).toFixed(1)}px ` +
              `in a ${(boxPt / 0.75).toFixed(1)}px column`,
          );
        }
      }
    }
  }

  for (const child of node.children ?? []) overflowingLines(child, found);

  return found;
}

async function layout<P extends object>(Component: ComponentType<P>, props: P): Promise<Node> {
  const instance = pdf(createElement(Component, props) as never) as unknown as {
    container: { document: Node };
    toBuffer: () => Promise<unknown>;
  };

  await instance.toBuffer();
  return resolveLayoutEngine<Node>()(instance.container.document, Font);
}

/** Long enough to need wrapping in every column a template has. */
function wordyResume(templateId: string): ResumeData {
  const resume = structuredClone(defaultResume);
  const sentence =
    "Delivered a measurable improvement to the platform, reducing p99 latency and cutting " +
    "infrastructure spend while keeping the public API contract completely stable throughout.";

  resume.templateId = templateId;
  resume.summary = `${sentence} ${sentence}`;
  resume.experience[0].summary = sentence;
  resume.experience[0].highlights = [sentence, sentence];
  resume.education[0].summary = sentence;
  resume.projects[0].summary = sentence;
  resume.projects[0].highlights = [sentence];
  resume.skills[0].keywords = Array.from({ length: 24 }, (_, i) => `Capability ${i + 1}`);

  return resume;
}

function wordyCoverLetter(): CoverLetterContent {
  const content = structuredClone(
    createDefaultCoverLetter("overflow").content,
  ) as CoverLetterContent;

  content.date = "January 1, 2026";
  content.senderTitle = "Principal Distributed Systems Architect and Platform Reliability Lead";
  content.subject =
    "Application for the Principal Distributed Systems Architect and Platform Reliability Lead role";
  content.recipientName = "The Veriworkly Product and Platform Engineering Hiring Committee";

  return content;
}

beforeAll(() => {
  registerPdfTestFonts();
});

describe("no PDF paragraph is broken for the wrong column", () => {
  for (const templateId of pdfTemplateIds) {
    it(`${templateId} wraps every paragraph inside its column`, async () => {
      const laid = await layout(await loadTemplatePdfComponentById(templateId), {
        resume: wordyResume(templateId),
      });
      const problems = overflowingLines(laid);

      expect(problems, `${templateId}:\n${problems.join("\n")}`).toEqual([]);
    }, 60_000);
  }

  for (const templateId of coverLetterTemplateRegistry.ids) {
    it(`${templateId} cover letter wraps every paragraph inside its column`, async () => {
      const laid = await layout(await coverLetterTemplateRegistry.loadPdf(templateId), {
        content: wordyCoverLetter(),
      });
      const problems = overflowingLines(laid);

      expect(problems, `${templateId}:\n${problems.join("\n")}`).toEqual([]);
    }, 60_000);
  }
});

/** Every laid-out line of text in the tree, in document order. */
function laidOutLines(node: Node, found: NonNullable<Node["lines"]> = []) {
  if (node.type === "TEXT" && node.lines) found.push(...node.lines);
  for (const child of node.children ?? []) laidOutLines(child, found);
  return found;
}

/**
 * The lowest point anything is drawn below the top of its page, in points. A text box can be
 * squeezed shorter than its lines, so the lines are measured, not only the boxes. A text that
 * continues from the previous page keeps its lines' original offsets, and the renderer draws
 * them from the first one's — so does this.
 */
function contentBottom(node: Node, parentTop = 0): number {
  const top = parentTop + (node.box?.top ?? 0);
  const firstLineY = node.lines?.[0]?.box?.y ?? 0;

  return Math.max(
    top + (node.box?.height ?? 0),
    ...(node.lines ?? []).map(
      (line) => top + (line.box?.y ?? 0) - firstLineY + (line.box?.height ?? 0),
    ),
    ...(node.children ?? []).map((child) => contentBottom(child, top)),
  );
}

function longResume(templateId: string): ResumeData {
  const resume = structuredClone(defaultResume);

  resume.templateId = templateId;
  resume.summary = Array.from({ length: 1_500 }, (_, i) => `word${i % 97}`).join(" ");
  resume.experience[0].highlights = Array.from(
    { length: 60 },
    (_, i) => `Bullet ${i + 1}: shipped a change that moved a metric the team was measuring.`,
  );

  return resume;
}

describe("S-103: long content is never clipped by the PDF", () => {
  for (const templateId of pdfTemplateIds) {
    it(`${templateId}: a 1,500-word summary and a 60-bullet role stay inside every page`, async () => {
      const laid = await layout(await loadTemplatePdfComponentById(templateId), {
        resume: longResume(templateId),
      });
      const pages = laid.children ?? [];

      expect(pages.length).toBeGreaterThan(2);

      pages.forEach((page, index) => {
        const bottom = Math.max(...(page.children ?? []).map((child) => contentBottom(child)));

        expect(bottom, `${templateId} page ${index + 1}`).toBeLessThanOrEqual(
          (page.box?.height ?? 0) + 0.5,
        );
      });

      const text = laidOutLines(laid)
        .map((line) => line.string ?? "")
        .join(" ");

      expect(text).toContain("word96");
      expect(text).toContain("Bullet 60:");
    }, 60_000);
  }
});

/** The page each laid-out line of text lands on, by its text. */
function pageOfLine(pages: Node[], needle: string): number {
  return pages.findIndex((page) =>
    laidOutLines(page).some((line) => (line.string ?? "").includes(needle)),
  );
}

describe("a role that fits on a page moves whole, the way the preview moves it", () => {
  for (const templateId of pdfTemplateIds) {
    it(`${templateId}: a role about two thirds of a page tall is not split`, async () => {
      const resume = structuredClone(defaultResume);

      resume.templateId = templateId;
      resume.summary = Array.from({ length: 260 }, (_, i) => `word${i % 53}`).join(" ");
      resume.experience[0].highlights = Array.from(
        { length: 30 },
        (_, i) => `Bullet ${i + 1}: shipped a change that moved the metric we track.`,
      );

      const laid = await layout(await loadTemplatePdfComponentById(templateId), { resume });
      const pages = laid.children ?? [];

      expect(pageOfLine(pages, "Bullet 1:")).toBeGreaterThanOrEqual(0);
      expect(pageOfLine(pages, "Bullet 30:")).toBe(pageOfLine(pages, "Bullet 1:"));
    }, 60_000);
  }
});
