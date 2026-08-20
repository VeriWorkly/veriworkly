import { join } from "node:path";
import { createRequire } from "node:module";

import { createElement } from "react";
import { Font, pdf } from "@react-pdf/renderer";
import { beforeAll, describe, expect, it } from "vitest";

import type { ComponentType } from "react";
import type { ResumeData } from "@/types/resume";
import type { CoverLetterContent } from "@/features/cover-letter/types";

import { FONT_REGISTRY } from "@/features/documents/constants/fonts";
import { registerPdfHyphenation } from "@/templates/pdf/fonts";
import { createDefaultCoverLetter } from "@/features/cover-letter/defaults";
import { defaultResume } from "@/features/resume/constants/default-resume";
import { loadTemplatePdfComponentById, pdfTemplateIds } from "@/templates/resume/pdf";
import { coverLetterTemplateRegistry } from "@/templates/cover-letter/registry";

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
  box?: { width?: number };
  style?: { fontSize?: number; fontWeight?: number; letterSpacing?: number };
  lines?: { string?: string }[];
  children?: Node[];
  value?: string;
}

const faces = new Map<string, Face>();

function face(weight: number): Face {
  const key = String(weight >= 600 ? 700 : 400);
  const cached = faces.get(key);
  if (cached) return cached;

  const entry = FONT_REGISTRY.geist.pdfFonts.find((f) => String(f.fontWeight) === key)!;
  const loaded = fontkit.openSync(join(process.cwd(), "public", entry.src)) as Face;

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
 * independent of how textkit chooses its breaks — it may hyphenate, and it may
 * compress a line's spaces by up to half their width rather than break at all
 * (`shrinkWhitespaceFactor`), which `slack` allows for. What it may never do is
 * leave ink outside the column.
 */
function overflowingLines(node: Node, found: string[] = []): string[] {
  if (node.type === "TEXT" && node.lines) {
    const boxPt = node.box?.width ?? 0;
    const fontSizePt = node.style?.fontSize ?? 0;
    const weight = node.style?.fontWeight ?? 400;
    const ls = node.style?.letterSpacing ?? 0;

    if (fontSizePt > 0 && boxPt > 0) {
      const spacePt = widthPt(" ", fontSizePt, weight, ls);

      for (const line of node.lines) {
        const text = (line.string ?? "").replace(/\s+$/, "");

        // A single unbreakable token has nowhere to go; that is the content's
        // problem, not the layout's.
        if (!text.includes(" ")) continue;

        const slack = (text.split(" ").length - 1) * spacePt * 0.5;
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

function resolveLayoutEngine() {
  const fromRenderer = createRequire(require_.resolve("@react-pdf/renderer"));
  return fromRenderer("@react-pdf/layout").default as (
    document: Node,
    fontStore: unknown,
  ) => Promise<Node>;
}

async function layout<P extends object>(Component: ComponentType<P>, props: P): Promise<Node> {
  const instance = pdf(createElement(Component, props) as never) as unknown as {
    container: { document: Node };
    toBuffer: () => Promise<unknown>;
  };

  await instance.toBuffer();
  return resolveLayoutEngine()(instance.container.document, Font);
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

describe("no PDF paragraph is broken for the wrong column", () => {
  beforeAll(() => {
    // Production disables hyphenation; without it these measure a different document.
    registerPdfHyphenation();

    for (const font of Object.values(FONT_REGISTRY)) {
      Font.register({
        family: font.primaryFamily,
        fonts: font.pdfFonts.map((f) => ({
          src: join(process.cwd(), "public", f.src),
          fontWeight: f.fontWeight,
        })),
      });
    }
  });

  for (const templateId of pdfTemplateIds) {
    it(`${templateId} wraps every paragraph inside its column`, async () => {
      const laid = await layout(await loadTemplatePdfComponentById(templateId), {
        resume: wordyResume(templateId),
      });
      const problems = overflowingLines(laid);

      expect(problems, `${templateId}:\n${problems.join("\n")}`).toEqual([]);
    }, 60_000);
  }

  for (const templateId of [
    "professional",
    "veriworkly-special",
    "minimalist",
    "executive",
    "ats-essential",
  ]) {
    it(`${templateId} cover letter wraps every paragraph inside its column`, async () => {
      const laid = await layout(await coverLetterTemplateRegistry.loadPdf(templateId), {
        content: wordyCoverLetter(),
      });
      const problems = overflowingLines(laid);

      expect(problems, `${templateId}:\n${problems.join("\n")}`).toEqual([]);
    }, 60_000);
  }
});
