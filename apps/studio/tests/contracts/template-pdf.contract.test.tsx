import { join } from "node:path";

import { createElement } from "react";
import { Font, renderToBuffer } from "@react-pdf/renderer";
import { beforeAll, describe, expect, it } from "vitest";

import type { ComponentType, ReactElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";

import type { CoverLetterContent } from "@/features/cover-letter/types";

import { createDefaultCoverLetter } from "@/features/cover-letter/defaults";
import { defaultResume } from "@/features/resume/constants/default-resume";
import { FONT_REGISTRY } from "@/features/documents/constants/fonts";
import { registerPdfHyphenation } from "@/templates/pdf/fonts";
import { coverLetterTemplateRegistry } from "@/templates/cover-letter/registry";
import { loadTemplatePdfComponentById, pdfTemplateIds } from "@/templates/resume/pdf";

/**
 * The browser registers PDF fonts from URLs (templates/pdf/fonts.ts). Under
 * Node we register the same faces from disk so the export path is exercised
 * end to end instead of silently falling back to Helvetica.
 */
/**
 * Template components render a `<Document>` but declare their own props, which
 * `renderToBuffer` cannot infer. The cast is confined to this helper.
 */
function pdfElement<P extends object>(
  Template: ComponentType<P>,
  props: P,
): ReactElement<DocumentProps> {
  return createElement(Template, props) as unknown as ReactElement<DocumentProps>;
}

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

describe("resume pdf export contract", () => {
  const resumeWithCredential = {
    ...defaultResume,
    customSections: defaultResume.customSections.map((section) =>
      section.kind === "certifications"
        ? {
            ...section,
            items: [
              {
                id: "cert-1",
                name: "AWS Certified Developer",
                issuer: "Amazon Web Services",
                date: "2024",
                link: "https://verify.example.com/aws-cert",
                referenceId: "CRED-99182",
                description: "Associate level certification.",
                details: ["Scored in the top decile."],
              },
            ],
          }
        : section,
    ),
  };

  for (const templateId of pdfTemplateIds) {
    it(`renders a real PDF for ${templateId}`, async () => {
      const TemplatePdf = await loadTemplatePdfComponentById(templateId);
      const buffer = await renderToBuffer(
        pdfElement(TemplatePdf, { resume: { ...resumeWithCredential, templateId } }),
      );

      expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
      expect(buffer.byteLength).toBeGreaterThan(5_000);
    }, 30_000);
  }
});

describe("cover letter pdf export contract", () => {
  function createContent(
    overrides: Partial<CoverLetterContent["appearance"]> = {},
  ): CoverLetterContent {
    const base = createDefaultCoverLetter("cover-letter-pdf-contract").content;

    return { ...base, appearance: { ...base.appearance, ...overrides } };
  }

  for (const templateId of [
    "professional",
    "veriworkly-special",
    "minimalist",
    "executive",
    "ats-essential",
  ]) {
    it(`renders a real PDF for ${templateId}`, async () => {
      const CoverLetterPdf = await coverLetterTemplateRegistry.loadPdf(templateId);
      const buffer = await renderToBuffer(pdfElement(CoverLetterPdf, { content: createContent() }));

      expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
      expect(buffer.byteLength).toBeGreaterThan(5_000);
    }, 30_000);

    it(`renders ${templateId} with an inverted colour scheme`, async () => {
      const CoverLetterPdf = await coverLetterTemplateRegistry.loadPdf(templateId);
      const buffer = await renderToBuffer(
        pdfElement(CoverLetterPdf, {
          content: createContent({
            textColor: "#f8fafc",
            pageColor: "#0b1220",
            sidebarColor: "#020617",
            accentColor: "#f97316",
          }),
        }),
      );

      expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    }, 30_000);
  }
});
