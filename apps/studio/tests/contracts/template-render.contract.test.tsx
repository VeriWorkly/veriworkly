import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { TemplateRenderProps } from "@/types/template";

import { createDefaultCoverLetter } from "@/features/cover-letter/defaults";
import { defaultResume } from "@/features/resume/constants/default-resume";
import { loadTemplateComponentById, templateRegistry } from "@/templates";
import { buildCoverLetterHtml } from "@/templates/cover-letter/web";

describe("template render contract", () => {
  it("registers core templates and keeps ids unique", () => {
    const templateIds = templateRegistry.map((template) => template.id);
    const uniqueTemplateIds = new Set(templateIds);

    expect(uniqueTemplateIds.size).toBe(templateIds.length);
    expect(templateIds).toEqual(expect.arrayContaining(["executive-clarity", "precision-ats"]));
  });

  it("renders every registered template for canonical resume data", async () => {
    for (const template of templateRegistry) {
      const TemplateComponent = loadTemplateComponentById(template.id);

      const html = renderToStaticMarkup(
        <TemplateComponent
          resume={{
            ...defaultResume,
            templateId: template.id,
          }}
        />,
      );

      expect(html.length).toBeGreaterThan(500);
      expect(html).toContain(defaultResume.basics.fullName);
    }
  });

  it("returns safely for missing template props", async () => {
    for (const template of templateRegistry) {
      const TemplateComponent = loadTemplateComponentById(template.id);

      expect(() =>
        renderToStaticMarkup(<TemplateComponent {...({} as unknown as TemplateRenderProps)} />),
      ).not.toThrow();

      expect(() =>
        renderToStaticMarkup(
          <TemplateComponent resume={null as unknown as TemplateRenderProps["resume"]} />,
        ),
      ).not.toThrow();
    }
  });

  it("omits basics header when basics section is hidden", async () => {
    const hiddenBasicsResume = {
      ...defaultResume,
      sections: defaultResume.sections.map((section) =>
        section.id === "basics" ? { ...section, visible: false } : section,
      ),
    };

    for (const template of templateRegistry) {
      const TemplateComponent = loadTemplateComponentById(template.id);

      const html = renderToStaticMarkup(
        <TemplateComponent resume={{ ...hiddenBasicsResume, templateId: template.id }} />,
      );

      expect(html).not.toContain(defaultResume.basics.fullName);
    }
  });

  it("omits links when links section is hidden", async () => {
    const linkedResume = {
      ...defaultResume,
      links: {
        displayMode: "icon-username" as const,
        items: [
          {
            id: "portfolio",
            type: "portfolio" as const,
            label: "Portfolio",
            url: "https://example.com/portfolio",
          },
        ],
      },
      sections: defaultResume.sections.map((section) =>
        section.id === "links" ? { ...section, visible: false } : section,
      ),
    };

    for (const template of templateRegistry) {
      const TemplateComponent = loadTemplateComponentById(template.id);

      const html = renderToStaticMarkup(
        <TemplateComponent resume={{ ...linkedResume, templateId: template.id }} />,
      );

      expect(html).not.toContain("Portfolio");
      expect(html).not.toContain("example.com/portfolio");
    }
  });

  it("omits empty resume sections", async () => {
    const emptySectionsResume = {
      ...defaultResume,
      summary: "",
      experience: [],
      education: [],
      projects: [],
      skills: [],
      customSections: [],
    };

    for (const template of templateRegistry) {
      const TemplateComponent = loadTemplateComponentById(template.id);

      const html = renderToStaticMarkup(
        <TemplateComponent resume={{ ...emptySectionsResume, templateId: template.id }} />,
      );

      expect(html).not.toContain("Summary");
      expect(html).not.toContain("Experience");
      expect(html).not.toContain("Education");
      expect(html).not.toContain("Projects");
      expect(html).not.toContain("Skills");
    }
  });

  it("exports professional and veriworkly cover-letter HTML with expected content", () => {
    const content = createDefaultCoverLetter("cover-letter-contract").content;

    for (const templateId of ["professional", "veriworkly-special"]) {
      const html = buildCoverLetterHtml(content, templateId);

      expect(html).toContain(content.senderName);
      expect(html).toContain(content.recipientName);
      expect(html).toContain(content.subject);
      expect(html).toContain("Product Engineer role at Veriworkly");
      expect(html).toContain("Built React and TypeScript document workflows");
      expect(html).toContain("P.S.");
    }
  });

  it("respects hidden cover-letter sections in HTML export", () => {
    const content = {
      ...createDefaultCoverLetter("cover-letter-hidden-sections").content,
      links: {
        displayMode: "icon-username" as const,
        items: [
          {
            id: "github",
            type: "github" as const,
            label: "GitHub",
            url: "https://github.com/veriworkly",
          },
        ],
      },
      appearance: {
        ...createDefaultCoverLetter("cover-letter-hidden-sections").content.appearance,
        hiddenSections: ["letter", "profile", "links", "target"] as const,
      },
    };

    for (const templateId of ["professional", "veriworkly-special"]) {
      const html = buildCoverLetterHtml(content, templateId);

      expect(html).not.toContain(content.senderEmail);
      expect(html).not.toContain("github.com/veriworkly");
      expect(html).not.toContain(content.recipientName);
      expect(html).not.toContain(content.subject);
      expect(html).not.toContain(content.greeting);
      expect(html).not.toContain("P.S.");
    }
  });
});
