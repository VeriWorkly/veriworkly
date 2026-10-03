import { join } from "node:path";

import { createElement } from "react";
import { Document, Font, Page, Text, renderToBuffer } from "@react-pdf/renderer";
import { beforeAll, describe, expect, it } from "vitest";

import type { DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";

import type { AtsReport } from "@veriworkly/ats-engine";
import type { ResumeData } from "@/types/resume";

import { AtsScoringService, DEFAULT_POLICY } from "@veriworkly/ats-engine";
import { extractResume } from "@veriworkly/ats-engine/node";

import { toAtsDocument } from "@/features/ats/resume-document";
import { buildResumeDocx } from "@/features/documents/export/docx/resume-docx";
import { FONT_IDS, FONT_REGISTRY } from "@/features/documents/constants/fonts";
import { defaultResume } from "@/features/resume/constants/default-resume";
import { registerPdfHyphenation } from "@/templates/pdf/fonts";
import { loadTemplatePdfComponentById, pdfTemplateIds } from "@/templates/resume/pdf";

/**
 * Every template's exported PDF, read back the way an applicant tracking system reads it.
 *
 * Studio scores a saved resume from its fields, which says nothing about the file the user
 * actually sends. This holds the two to the same answer: the PDF, extracted to text and parsed,
 * must recover the same name, contact details, roles, education and skills as the data, and
 * fail no check the data passes. It is what keeps "ATS-friendly" on a template true.
 *
 * It caught, in templates that were all labelled ATS-friendly:
 * - heading tracking of 0.1-0.22em, which extracts as "E X P E R I E N C E" and loses every
 *   section heading (the score fell from 92 to 64);
 * - a headline set beside the name, which extracts as one line and loses the name.
 *
 * The extractor is pdf.js, the engine's own. The tracking limit in
 * `templates/resume/shared/typography.ts` was measured against Poppler and PDFBox as well.
 */

const NOW = new Date("2026-10-01T00:00:00Z");

/**
 * The shipped sample, with a real degree and phone number in place of its tongue-in-cheek
 * "Internet Degree" from "Self-Taught" and "0000000000" — which no ATS would file as education or
 * as a phone, however a template printed them.
 */
function sample(templateId: string, fontFamily: string, headline?: string): ResumeData {
  const resume = structuredClone(defaultResume);
  resume.templateId = templateId;
  resume.customization.fontFamily = fontFamily;
  if (headline !== undefined) resume.basics.headline = headline;
  // The sample's "0000000000" is no number at all, and the engine — rightly — reads no phone
  // from it. A real one shows the number survives the export.
  resume.basics.phone = "+1 415 555 0142";
  resume.education = [
    {
      ...resume.education[0],
      school: "University of Washington",
      degree: "B.S.",
      field: "Computer Science",
      startDate: "2015-09",
      endDate: "2019-06",
      current: false,
    },
  ];
  return resume;
}

async function readBack(resume: ResumeData) {
  const Template = await loadTemplatePdfComponentById(resume.templateId);
  const element = createElement(Template, { resume }) as unknown as ReactElement<DocumentProps>;
  const { text, layout } = await extractResume(await renderToBuffer(element), "pdf");
  return {
    text,
    layout,
    fromPdf: AtsScoringService.check(text, DEFAULT_POLICY, { layout, now: NOW }),
    fromData: AtsScoringService.check(toAtsDocument(resume), DEFAULT_POLICY, { now: NOW }),
  };
}

/** The fields an ATS files, in a form two parses of the same resume should agree on. */
function fields({ parsed }: AtsReport) {
  return {
    name: parsed.name.toLowerCase(),
    email: parsed.email,
    phone: parsed.phone,
    roles: parsed.roles.map((role) => ({
      title: role.title,
      employer: role.employer,
      start: role.start,
      current: role.current,
    })),
    education: parsed.education.length,
    skills: [...parsed.skills].sort(),
  };
}

beforeAll(() => {
  // Production disables hyphenation; without it these measure a different document.
  registerPdfHyphenation();
  for (const font of Object.values(FONT_REGISTRY))
    Font.register({
      family: font.primaryFamily,
      fonts: font.pdfFonts.map((face) => ({
        src: join(process.cwd(), "public", face.src),
        fontWeight: face.fontWeight,
      })),
    });
});

describe("template ATS read-back", () => {
  const cases = pdfTemplateIds.flatMap((templateId) => [
    ...FONT_IDS.map((font) => ({ templateId, font, headline: undefined as string | undefined })),
    // Short enough to sit beside the name if a header lays the two out in a row.
    { templateId, font: FONT_IDS[0], headline: "Senior Engineer" },
  ]);

  it.each(cases)(
    "$templateId in $font (headline: $headline) reads back as its data",
    async ({ templateId, font, headline }) => {
      const { text, layout, fromPdf, fromData } = await readBack(
        sample(templateId, font, headline),
      );
      const failedOnlyInPdf = fromPdf.failedChecks
        .map((rule) => rule.id)
        .filter((id) => !fromData.failedChecks.some((rule) => rule.id === id));

      // Printed on failure: the extracted text is the only way to see what went wrong.
      const context = `\n--- extracted text ---\n${text}`;
      expect(failedOnlyInPdf, context).toEqual([]);
      // Nothing a template draws may read as hidden, and no page is a picture.
      expect(layout, context).toMatchObject({ hiddenTextChars: 0, imageOnlyPages: 0 });
      expect(fields(fromPdf), context).toEqual(fields(fromData));
      expect(
        Math.abs(fromPdf.readinessScore - fromData.readinessScore),
        context,
      ).toBeLessThanOrEqual(3);
    },
    30_000,
  );
});

/**
 * The same read-back catches what candidates add to beat a screener, on this renderer's output
 * rather than on hand-built PDFs: white text on the page, a 1pt keyword line, opacity 0.
 */
describe("hidden text in a react-pdf export", () => {
  const KEYWORDS = "Kubernetes Terraform Kafka GraphQL";

  it.each([
    ["white on white", { color: "#ffffff" }],
    ["a 1pt font", { fontSize: 1 }],
    ["opacity 0", { opacity: 0 }],
  ])("finds keywords hidden as %s", async (_, hiding) => {
    const document = createElement(
      Document,
      null,
      createElement(
        Page,
        { size: "A4", style: { padding: 40, fontFamily: "Geist" } },
        createElement(Text, null, "Jane Doe, Senior Engineer at Acme Corporation"),
        createElement(Text, { style: hiding }, KEYWORDS),
      ),
    ) as unknown as ReactElement<DocumentProps>;
    const { layout } = await extractResume(await renderToBuffer(document), "pdf");
    expect(layout?.hiddenTextSample).toBe(KEYWORDS);
  });
});

/**
 * The Word export, held to the same standard as every PDF template: read back by the engine, it
 * must recover the data's fields and fail no check the data passes.
 */
describe("DOCX export ATS read-back", () => {
  it.each([undefined, "Senior Engineer"])(
    "reads back as its data (headline: %s)",
    async (headline) => {
      const resume = sample("executive-clarity", FONT_IDS[0], headline);
      const blob = await buildResumeDocx(resume);
      const { text, layout } = await extractResume(
        new Uint8Array(await blob.arrayBuffer()),
        "docx",
      );
      const fromDocx = AtsScoringService.check(text, DEFAULT_POLICY, { layout, now: NOW });
      const fromData = AtsScoringService.check(toAtsDocument(resume), DEFAULT_POLICY, { now: NOW });
      const context = `\n--- extracted text ---\n${text}`;

      expect(
        fromDocx.failedChecks
          .map((rule) => rule.id)
          .filter((id) => !fromData.failedChecks.some((rule) => rule.id === id)),
        context,
      ).toEqual([]);
      expect(layout, context).toMatchObject({ hiddenTextChars: 0, tableCount: 0 });
      expect(fields(fromDocx), context).toEqual(fields(fromData));
    },
  );
});
