import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { TemplateRenderProps } from "@/types/template";

import { defaultResume } from "@/features/resume/constants/default-resume";
import { loadTemplateComponentById, templateRegistry } from "@/templates";

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
});
