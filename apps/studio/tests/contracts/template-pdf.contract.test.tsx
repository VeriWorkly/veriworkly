import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { beforeAll, describe, expect, it } from "vitest";

import type { ComponentType, ReactElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";

import { extractResume } from "@veriworkly/ats-engine/node";

import type { CoverLetterContent } from "@/features/cover-letter/types";

import { createDefaultCoverLetter } from "@/features/cover-letter/defaults";
import { defaultResume } from "@/features/resume/constants/default-resume";
import { coverLetterTemplateRegistry } from "@/templates/cover-letter/registry";
import { loadTemplatePdfComponentById, pdfTemplateIds } from "@/templates/resume/pdf";
import { registerPdfTestFonts } from "@/tests/utils/pdf";

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
  registerPdfTestFonts();
});

describe("resume pdf export contract", () => {
  const resumeWithCredential = {
    ...defaultResume,
    certificates: [
      {
        id: "cert-1",
        title: "AWS Certified Developer",
        issuer: "Amazon Web Services",
        date: "2024-05",
        website: "https://verify.example.com/aws-cert",
        showLink: true,
        referenceId: "CRED-99182",
        description: "Associate level certification.",
      },
    ],
  };

  for (const templateId of pdfTemplateIds) {
    it(`S-037: renders a real PDF for ${templateId}, credential included`, async () => {
      const TemplatePdf = await loadTemplatePdfComponentById(templateId);
      const buffer = await renderToBuffer(
        pdfElement(TemplatePdf, { resume: { ...resumeWithCredential, templateId } }),
      );
      const { text } = await extractResume(buffer, "pdf");

      expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
      // Read back, so a fixture that renders nothing cannot pass.
      expect(text).toContain("AWS Certified Developer");
      expect(text).toContain("CRED-99182");
      expect(text).toContain("Associate level certification.");
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

  /** The PDF's text, read back: a template that renders nothing, or blank glyphs, fails here. */
  async function renderedText(templateId: string, content: CoverLetterContent) {
    const CoverLetterPdf = await coverLetterTemplateRegistry.loadPdf(templateId);
    const buffer = await renderToBuffer(pdfElement(CoverLetterPdf, { content }));

    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    return (await extractResume(buffer, "pdf")).text.replace(/\s+/g, " ");
  }

  for (const templateId of coverLetterTemplateRegistry.ids) {
    it(`S-037: renders a real PDF for ${templateId}, the letter's text included`, async () => {
      const content = createContent();
      const text = await renderedText(templateId, content);

      expect(text).toContain(content.senderName);
      expect(text).toContain(content.recipientName);
      expect(text).toContain(content.subject);
      expect(text).toContain("Built React and TypeScript document workflows");
    }, 30_000);

    it(`S-037: renders ${templateId} with an inverted colour scheme, text included`, async () => {
      const content = createContent({
        textColor: "#f8fafc",
        pageColor: "#0b1220",
        sidebarColor: "#020617",
        accentColor: "#f97316",
      });
      const text = await renderedText(templateId, content);

      expect(text).toContain(content.senderName);
      expect(text).toContain(content.subject);
    }, 30_000);
  }
});

describe("S-366 the PDF's text layer and language", () => {
  const NAME = "Zoë O'Brien-Łukasz 李华";

  it("S-366 characters the PDF cannot draw are left out of the text layer, not written as junk", async () => {
    const TemplatePdf = await loadTemplatePdfComponentById(pdfTemplateIds[0]);
    const resume = {
      ...defaultResume,
      templateId: pdfTemplateIds[0],
      basics: { ...defaultResume.basics, fullName: NAME },
    };
    const { text } = await extractResume(
      await renderToBuffer(pdfElement(TemplatePdf, { resume })),
      "pdf",
    );
    // The warning before the download calls these blank; an ATS must not read anything there.
    const nameLine = text.split("\n").find((line) => line.includes("Zoë")) ?? "";

    expect(nameLine).toContain("Zoë O'Brien-Łukasz");
    expect(nameLine.slice(nameLine.indexOf("Łukasz") + "Łukasz".length).trim()).toBe("");
  }, 30_000);

  it("S-366 a document with a language declares it; one without declares none", async () => {
    const TemplatePdf = await loadTemplatePdfComponentById(pdfTemplateIds[0]);
    const render = async (language?: string) =>
      (
        await renderToBuffer(
          pdfElement(TemplatePdf, {
            resume: { ...defaultResume, templateId: pdfTemplateIds[0], language },
          }),
        )
      ).toString("latin1");

    expect((await render("de-CH")).includes("/Lang (de-CH)")).toBe(true);
    expect((await render(undefined)).includes("/Lang")).toBe(false);

    const CoverLetterPdf = await coverLetterTemplateRegistry.loadPdf(
      coverLetterTemplateRegistry.ids[0],
    );
    const content = { ...createDefaultCoverLetter("s-366").content, language: "fr" };
    const letter = (await renderToBuffer(pdfElement(CoverLetterPdf, { content }))).toString(
      "latin1",
    );

    expect(letter.includes("/Lang (fr)")).toBe(true);
  }, 30_000);
});
