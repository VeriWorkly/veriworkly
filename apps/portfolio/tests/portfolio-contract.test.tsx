import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AtelierTemplate from "@/template-library/atelier/AtelierTemplate";
import SignalTemplate from "@/template-library/signal/SignalTemplate";
import { createDefaultPortfolio, demoPortfolio, parsePortfolioContent } from "@/lib/portfolio";

describe("portfolio content contract", () => {
  it("seeds signed-in identity without placeholder names", () => {
    const content = createDefaultPortfolio({ name: "Gautam Raj", email: "gautam@veriworkly.com" });
    expect(content.identity.name).toBe("Gautam Raj");
    expect(content.identity.email).toBe("gautam@veriworkly.com");
  });

  it("migrates legacy portfolio snapshots", () => {
    const content = parsePortfolioContent({
      name: "Legacy User",
      email: "legacy@example.com",
      role: "Engineer",
      intro: "Builds products.",
      templateId: "atelier",
      projects: [{ name: "Old project", summary: "Still useful", tags: [], year: "2025" }],
    });
    expect(content.templateId).toBe("atelier");
    expect(content.identity.headline).toBe("Engineer");
    expect(content.sections[0].items).toHaveLength(1);
  });

  it("omits hidden projects and renders empty project sections safely", () => {
    const hidden = createDefaultPortfolio();
    hidden.sections[0].visible = false;
    expect(renderToStaticMarkup(<SignalTemplate project={hidden} />)).not.toContain(
      "Your strongest project",
    );

    const empty = createDefaultPortfolio();
    empty.sections[0].items = [];
    expect(() => renderToStaticMarkup(<AtelierTemplate project={empty} />)).not.toThrow();
  });

  it("renders visible supporting sections in both launch templates", () => {
    const content = createDefaultPortfolio();
    content.sections.push({
      id: "services",
      type: "services",
      title: "Services",
      visible: true,
      items: [{ id: "strategy", title: "Product strategy", summary: "Focused product direction." }],
    });
    expect(renderToStaticMarkup(<SignalTemplate project={content} />)).toContain(
      "Product strategy",
    );
    expect(renderToStaticMarkup(<AtelierTemplate project={content} />)).toContain(
      "Product strategy",
    );
  });

  it("renders sections in the order selected in the editor", () => {
    const content = createDefaultPortfolio();
    content.sections = [
      { id: "services", type: "services", title: "Services first", visible: true, items: [] },
      ...content.sections,
    ];
    const signal = renderToStaticMarkup(<SignalTemplate project={content} />);
    const atelier = renderToStaticMarkup(<AtelierTemplate project={content} />);
    expect(signal.indexOf("Services first")).toBeLessThan(signal.indexOf("Selected work"));
    expect(atelier.indexOf("Services first")).toBeLessThan(
      atelier.indexOf("Your strongest project"),
    );
  });

  it("does not render unsafe or incomplete social links", () => {
    const content = createDefaultPortfolio();
    content.socialLinks = [
      { id: "unsafe", label: "Unsafe", url: "javascript:alert(1)" },
      { id: "incomplete", label: "", url: "" },
      { id: "safe", label: "Website", url: "https://example.com" },
    ];
    const markup = renderToStaticMarkup(<SignalTemplate project={content} />);
    expect(markup).not.toContain("javascript:");
    expect(markup).not.toContain("Unsafe");
    expect(markup).toContain("https://example.com/");
    expect(markup).toContain("Website");
    expect(renderToStaticMarkup(<AtelierTemplate project={content} />)).toContain("Website");
  });

  it("drops unsupported section types from stored snapshots", () => {
    const content = createDefaultPortfolio();
    const parsed = parsePortfolioContent({
      ...content,
      sections: [
        ...content.sections,
        { id: "unknown", type: "script", title: "Unsafe", visible: true, items: [] },
      ],
    });
    expect(parsed.sections.some((section) => section.id === "unknown")).toBe(false);
  });

  it("ships a complete template gallery demo", () => {
    expect(demoPortfolio.sections.map((section) => section.type)).toEqual([
      "projects",
      "experience",
      "services",
      "skills",
      "writing",
      "testimonials",
      "awards",
      "contact",
    ]);
    expect(
      demoPortfolio.sections.find((section) => section.type === "projects")?.items,
    ).toHaveLength(3);
    expect(demoPortfolio.socialLinks).toHaveLength(3);
  });

  it("renders supporting content with section-specific compositions", () => {
    const content = {
      ...demoPortfolio,
      sections: [
        ...demoPortfolio.sections,
        {
          id: "education",
          type: "education",
          title: "Education",
          visible: true,
          items: [
            { id: "course", title: "Systems course", summary: "A focused course.", year: "2024" },
          ],
        },
      ],
    };
    const signal = renderToStaticMarkup(<SignalTemplate project={content} />);
    const atelier = renderToStaticMarkup(<AtelierTemplate project={content} />);
    for (const section of [
      "experience",
      "services",
      "skills",
      "education",
      "writing",
      "testimonials",
      "awards",
    ]) {
      expect(signal).toContain(`data-section="${section}"`);
      expect(atelier).toContain(`data-section="${section}"`);
    }
    expect(signal).toContain("signal-timeline");
    expect(signal).toContain("signal-quote-grid");
    expect(atelier).toContain("atelier-service-list");
    expect(atelier).toContain("atelier-testimonial-list");
  });
});
