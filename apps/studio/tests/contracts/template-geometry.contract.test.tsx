import { join } from "node:path";
import { createRequire } from "node:module";

import { createElement } from "react";
import { Font, pdf } from "@react-pdf/renderer";
import { beforeAll, describe, expect, it } from "vitest";

import type { ComponentType, ReactElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import type { ResumeTypeScale } from "@/templates/resume/shared/typography";

import type { CoverLetterContent } from "@/features/cover-letter/types";

import { FONT_REGISTRY } from "@/features/documents/constants/fonts";
import { registerPdfHyphenation } from "@/templates/pdf/fonts";
import { createDefaultCoverLetter } from "@/features/cover-letter/defaults";
import { defaultResume } from "@/features/resume/constants/default-resume";
import { coverLetterTemplateRegistry } from "@/templates/cover-letter/registry";
import { COVER_LETTER_SCALE, createCoverLetterTokens } from "@/templates/cover-letter/tokens";
import { getCoverLetterPalette } from "@/templates/cover-letter/shared";
import { getResumeRenderStyle } from "@/features/documents/rendering/resume-rendering";
import { pxToPt } from "@/features/resume/constants/resume-layout";
import { DOCUMENT_PAGE_HEIGHT_PX, DOCUMENT_PAGE_WIDTH_PX } from "@/templates/shared/page-geometry";
import { loadTemplatePdfComponentById } from "@/templates/resume/pdf";
import { createResumePdfStyles } from "@/templates/resume/shared/pdf";
import { createResumeTokens } from "@/templates/resume/shared/tokens";
import { pdfText } from "@/templates/shared/text-tokens";

import { boldImpactScale } from "@/templates/resume/bold-impact/skin";
import { corporateBriefScale } from "@/templates/resume/corporate-brief/skin";
import { executiveClarityScale } from "@/templates/resume/executive-clarity/skin";
import { modernMinimalScale } from "@/templates/resume/modern-minimal/skin";
import { precisionAtsScale } from "@/templates/resume/precision-ats/skin";
import { timelineFocusScale } from "@/templates/resume/timeline-focus/skin";
import { veriworklySpecialScale } from "@/templates/resume/veriworkly-special/skin";

/**
 * The preview and the PDF are two layout engines fed from one scale. These
 * tests pin the numbers the PDF actually lays out, because the ways the two
 * engines silently disagree are not visible in the source:
 *
 *  - a bare number in a react-pdf style means points, so it renders 1.333x too
 *    large;
 *  - react-pdf inherits a *computed* line height while CSS re-multiplies the
 *    unitless factor per element;
 *  - `align-items: baseline` resolves to bottom alignment in react-pdf;
 *  - Yoga shrinks a `flexShrink: 0` box when a sibling's minimum content width
 *    does not fit, which CSS never does;
 *  - a `Text` with an explicit width is still sized by its measured content.
 */
const SCALES: Record<string, ResumeTypeScale> = {
  "executive-clarity": executiveClarityScale,
  "precision-ats": precisionAtsScale,
  "modern-minimal": modernMinimalScale,
  "timeline-focus": timelineFocusScale,
  "corporate-brief": corporateBriefScale,
  "bold-impact": boldImpactScale,
  "veriworkly-special": veriworklySpecialScale,
};

const PAGE_PADDING: Record<string, (padding: number) => number> = {
  "precision-ats": (p) => Math.max(24, p * 0.85),
  "modern-minimal": (p) => Math.round(p * 1.2),
};

const SECTION_SPACING: Record<string, (spacing: number) => number> = {
  "precision-ats": (s) => Math.max(10, s * 0.6),
  "modern-minimal": (s) => Math.round(s * 1.05),
};

type Box = { top: number; left: number; width: number; height: number };
type Node = { type: string; box?: Partial<Box>; children?: Node[] };

const toPx = (value = 0) => Number((value / 0.75).toFixed(4));

const box = (node: Node): Box => ({
  top: toPx(node.box?.top),
  left: toPx(node.box?.left),
  width: toPx(node.box?.width),
  height: toPx(node.box?.height),
});

function pdfElement<P extends object>(C: ComponentType<P>, props: P): ReactElement<DocumentProps> {
  return createElement(C, props) as unknown as ReactElement<DocumentProps>;
}

/** `@react-pdf/layout` is a transitive dependency; resolve it via the renderer. */
function resolveLayoutEngine() {
  const fromHere = createRequire(import.meta.url);
  const rendererEntry = fromHere.resolve("@react-pdf/renderer");
  const fromRenderer = createRequire(rendererEntry);

  return fromRenderer("@react-pdf/layout").default as (
    document: Node,
    fontStore: unknown,
  ) => Promise<Node>;
}

async function layoutPages(element: ReactElement<DocumentProps>): Promise<Node[]> {
  const instance = pdf(element) as unknown as {
    container: { document: Node };
    toBuffer: () => Promise<unknown>;
  };

  await instance.toBuffer();

  const laidOut = await resolveLayoutEngine()(instance.container.document, Font);
  return laidOut.children ?? [];
}

async function layoutFirstPage(id: string): Promise<Node> {
  const TemplatePdf = await loadTemplatePdfComponentById(id);
  const pages = await layoutPages(
    pdfElement(TemplatePdf, { resume: { ...defaultResume, templateId: id } }),
  );

  return pages[0];
}

/** Depth-first search for the first node whose laid-out width matches. */
function findByWidth(node: Node, width: number): Node | undefined {
  if (Math.abs(toPx(node.box?.width) - width) < 0.02) return node;

  for (const child of node.children ?? []) {
    const hit = findByWidth(child, width);
    if (hit) return hit;
  }

  return undefined;
}

function findBulletRows(node: Node, found: Node[] = []): Node[] {
  const children = node.children ?? [];
  const [marker, text] = children;

  if (
    children.length === 2 &&
    marker?.type === "VIEW" &&
    marker.children?.length === 1 &&
    marker.children[0]?.type === "TEXT" &&
    text?.type === "TEXT"
  ) {
    found.push(node);
  }

  for (const child of children) findBulletRows(child, found);

  return found;
}

describe("resume pdf styles are derived from the shared scale", () => {
  const style = getResumeRenderStyle(defaultResume);

  for (const [id, scale] of Object.entries(SCALES)) {
    it(`${id} converts every shared value to points`, () => {
      const styles = createResumePdfStyles(style, scale, style.pagePadding);
      const tokens = createResumeTokens(style, scale);

      // Spatial values must be points, i.e. px * 0.75.
      expect(styles.itemRow.columnGap).toBe(pxToPt(scale.gutterGap));
      expect(styles.itemHead.columnGap).toBe(pxToPt(scale.headGap));
      expect(styles.inlineRow.columnGap).toBe(pxToPt(scale.inlineGapX));
      expect(styles.inlineRow.rowGap).toBe(pxToPt(scale.inlineGapY));
      expect(styles.linkInner.columnGap).toBe(pxToPt(scale.iconGap));
      expect(styles.bulletRow.columnGap).toBe(pxToPt(scale.bulletGap));
      expect(styles.rule.height).toBe(pxToPt(scale.hairline));
      expect(styles.gutter.width).toBe(pxToPt(scale.gutterWidth));
      expect(styles.bulletMarkerColumn.width).toBe(pxToPt(scale.bulletIndent - scale.bulletGap));

      // A fixed-size box must be pinned on all three axes. `flexShrink: 0` is
      // NOT enough: react-pdf reads it as `value || 1`, so a declared zero
      // becomes one and the box shrinks whenever a sibling does not fit.
      for (const [name, fixed] of [
        ["gutter", styles.gutter],
        ["bulletMarkerColumn", styles.bulletMarkerColumn],
        ["icon", styles.icon],
      ] as const) {
        expect(fixed.minWidth, `${name} minWidth`).toBe(fixed.width);
        expect(fixed.maxWidth, `${name} maxWidth`).toBe(fixed.width);
      }

      // Baseline alignment means "bottom" in react-pdf, so it must not be used.
      expect(styles.itemHead.alignItems).toBe("flex-start");

      // Every text style pins its own line box instead of inheriting one.
      for (const [name, token] of Object.entries(tokens)) {
        const pdfStyle = (styles as Record<string, { lineHeight?: number; fontSize?: number }>)[
          name
        ];

        if (!pdfStyle) continue;

        expect(pdfStyle.fontSize, `${name} font size`).toBe(pxToPt(token.fontSize));
        expect(
          (pdfStyle.lineHeight ?? 0) * (pdfStyle.fontSize ?? 0),
          `${name} line box`,
        ).toBeCloseTo(pxToPt(token.lineHeight), 6);
      }
    });
  }
});

describe("resume pdf geometry matches the shared scale", () => {
  const style = getResumeRenderStyle(defaultResume);

  beforeAll(() => {
    // Production disables hyphenation; without it these measure a different document.
    registerPdfHyphenation();

    for (const font of Object.values(FONT_REGISTRY)) {
      Font.register({
        family: font.primaryFamily,
        fonts: font.pdfFonts.map((face) => ({
          src: join(process.cwd(), "public", face.src),
          fontWeight: face.fontWeight,
        })),
      });
    }
  });

  for (const [id, scale] of Object.entries(SCALES)) {
    it(`${id} lays out with the intended spacing`, async () => {
      const page = await layoutFirstPage(id);
      const tokens = createResumeTokens(style, scale);
      const problems: string[] = [];

      const near = (actual: number, expected: number, what: string) => {
        if (Math.abs(actual - expected) > 0.02) {
          problems.push(`${what}: got ${actual}, expected ${expected}`);
        }
      };

      near(box(page).width, DOCUMENT_PAGE_WIDTH_PX, "page width");
      near(box(page).height, DOCUMENT_PAGE_HEIGHT_PX, "page height");

      const pagePadding = (PAGE_PADDING[id] ?? ((p: number) => p))(style.pagePadding);
      const sectionSpacing = (SECTION_SPACING[id] ?? ((s: number) => s))(style.sectionSpacing);

      // A section that reaches the bottom of the text area continues on the
      // next page, so react-pdf stretches its box to the break.
      const contentBottom = DOCUMENT_PAGE_HEIGHT_PX - pagePadding;
      const isSplit = (section: Node) =>
        box(section).top + box(section).height >= contentBottom - 0.5;

      const sections = (page.children ?? []).slice(1); // [0] is the skin header

      sections.forEach((section, index) => {
        const children = section.children ?? [];

        // A section is [headingGroup, ...remainingItems], where the group holds
        // the heading and the first item so a page break cannot separate them.
        // The group sits at the section's origin and adds no space of its own,
        // so its children's offsets are still section-relative.
        const group = children[0]?.children ?? [];
        const heading = group[0];
        const items = [...group.slice(1), ...children.slice(1)];
        const label = `${id} section#${index}`;

        if (items.length === 0 || isSplit(section)) return;

        near(
          box(items[0]).top,
          box(heading).top + box(heading).height + scale.headingGap,
          `${label} heading gap`,
        );

        const last = items[items.length - 1];
        near(box(section).height, box(last).top + box(last).height, `${label} trailing space`);

        const gap = items.every((item) => item.type === "TEXT") ? scale.skillGap : scale.itemGap;

        for (let i = 1; i < items.length; i += 1) {
          near(
            box(items[i]).top,
            box(items[i - 1]).top + box(items[i - 1]).height + gap,
            `${label} gap before item ${i}`,
          );
        }
      });

      for (let i = 1; i < sections.length; i += 1) {
        if (isSplit(sections[i - 1])) continue;

        near(
          box(sections[i]).top,
          box(sections[i - 1]).top + box(sections[i - 1]).height + sectionSpacing,
          `${id} spacing before section ${i}`,
        );
      }

      const bulletRows = findBulletRows(page);
      expect(bulletRows.length, `${id} renders bullets`).toBeGreaterThan(0);

      for (const row of bulletRows) {
        const [marker, text] = row.children ?? [];
        near(box(marker).width, scale.bulletIndent - scale.bulletGap, `${id} bullet marker column`);
        near(box(text).left, scale.bulletIndent, `${id} bullet text indent`);
      }

      // Every bullet is a whole number of body line boxes tall.
      //
      // This used to assert that the first bullet was exactly one line, which
      // held only because react-pdf was not wrapping bullet text at all: it
      // breaks lines once, at whatever width Yoga first proposes, so a bullet
      // that overran its column was still reported as a single line — and drawn
      // running off the page. Pinning the column width in the stylesheet fixed
      // the wrapping, at which case a correct bullet became two lines and this
      // assertion started failing. Multiples are what it meant to check.
      const bodyLine = tokens.body.lineHeight;

      for (const [index, row] of bulletRows.entries()) {
        const height = box((row.children ?? [])[1]).height;
        const lines = height / bodyLine;

        if (Math.abs(lines - Math.round(lines)) > 0.01 || lines < 1) {
          problems.push(
            `${id} bullet ${index} line box: ${height} is not a multiple of ${bodyLine}`,
          );
        }
      }

      expect(problems).toEqual([]);
    }, 60_000);
  }
});

describe("cover letter pdf geometry matches the shared scale", () => {
  beforeAll(() => {
    for (const font of Object.values(FONT_REGISTRY)) {
      Font.register({
        family: font.primaryFamily,
        fonts: font.pdfFonts.map((face) => ({
          src: join(process.cwd(), "public", face.src),
          fontWeight: face.fontWeight,
        })),
      });
    }
  });

  for (const templateId of [
    "professional",
    "veriworkly-special",
    "minimalist",
    "executive",
    "ats-essential",
  ]) {
    it(`${templateId} uses the preview's page box and fixed columns`, async () => {
      const content = createDefaultCoverLetter("geometry").content as CoverLetterContent;
      const palette = getCoverLetterPalette(content.appearance);
      const tokens = createCoverLetterTokens(content.appearance, palette);

      const CoverLetterPdf = await coverLetterTemplateRegistry.loadPdf(templateId);
      const [page] = await layoutPages(pdfElement(CoverLetterPdf, { content }));
      const problems: string[] = [];
      const near = (actual: number, expected: number, what: string) => {
        if (Math.abs(actual - expected) > 0.02) {
          problems.push(`${what}: got ${actual}, expected ${expected}`);
        }
      };

      // The page box comes from the shared document geometry — "A4" would be a
      // fraction narrower and wrap long lines differently. Asserting against the
      // constant (not a literal) is what keeps resumes and cover letters from drifting
      // back to describing the same page with two different heights.
      near(box(page).width, DOCUMENT_PAGE_WIDTH_PX, `${templateId} page width`);
      near(box(page).height, DOCUMENT_PAGE_HEIGHT_PX, `${templateId} page height`);

      // Fixed columns must survive Yoga's shrinking. Templates without a fixed
      // header/contact column (stacked, full-width headers) still reserve one for
      // their bullet marker, so that's checked instead.
      const COVER_LETTER_FIXED_WIDTH_BY_TEMPLATE: Record<string, number> = {
        "veriworkly-special": COVER_LETTER_SCALE.railWidth,
        minimalist: COVER_LETTER_SCALE.bulletIndent - COVER_LETTER_SCALE.bulletGap,
        "ats-essential": COVER_LETTER_SCALE.bulletIndent - COVER_LETTER_SCALE.bulletGap,
      };
      const fixedWidth =
        COVER_LETTER_FIXED_WIDTH_BY_TEMPLATE[templateId] ?? COVER_LETTER_SCALE.headerContactWidth;

      const column = findByWidth(page, fixedWidth);
      expect(column, `${templateId} keeps its ${fixedWidth}px column`).toBeDefined();

      // Every token states an absolute line box, so converting it for react-pdf
      // must land on exactly the same height the preview renders.
      for (const [name, token] of Object.entries(tokens)) {
        const converted = pdfText(token);
        const lineBox = converted.lineHeight * converted.fontSize;

        if (Math.abs(lineBox - pxToPt(token.lineHeight)) > 1e-6) {
          problems.push(
            `${templateId}: ${name} line box is ${lineBox}, expected ${pxToPt(token.lineHeight)}`,
          );
        }
      }

      expect(problems).toEqual([]);
    }, 60_000);
  }
});
