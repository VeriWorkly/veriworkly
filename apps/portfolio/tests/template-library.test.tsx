import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AtelierTemplate from "@/template-library/atelier/AtelierTemplate";
import CipherTemplate from "@/template-library/cipher/CipherTemplate";
import NimbusTemplate from "@/template-library/nimbus/NimbusTemplate";
import SignalTemplate from "@/template-library/signal/SignalTemplate";
import { templatesRegistry } from "@/template-library/registry";
import { createDefaultPortfolio, demoPortfolio } from "@/lib/portfolio";
import type { PortfolioProject } from "@/template-library/types";
import { templates } from "@/templates/catalog/templates";
import TemplateCatalog from "@/features/templates/components/TemplateCatalog";
import { createTemplateSchema } from "@/features/templates/lib/template-schemas";
import * as preview from "@/app/(platform)/templates/[id]/preview/page";
import * as detail from "@/app/(platform)/templates/[id]/page";

/**
 * Contract coverage for every template in the registry.
 *
 * `portfolio-contract.test.tsx` renders Signal and Atelier only, so Nimbus and
 * Cipher — the two *premium* templates — had no test rendering them at all.
 * The table below is asserted against `templatesRegistry` so a fifth template
 * cannot be added without either being covered here or failing this suite.
 */
const TEMPLATES = {
  signal: SignalTemplate,
  atelier: AtelierTemplate,
  nimbus: NimbusTemplate,
  cipher: CipherTemplate,
} as const;

const entries = Object.entries(TEMPLATES) as Array<
  [keyof typeof TEMPLATES, (typeof TEMPLATES)[keyof typeof TEMPLATES]]
>;

describe("template library — registry coverage", () => {
  it("exercises every template the registry exposes", () => {
    expect(Object.keys(TEMPLATES).sort()).toEqual(Object.keys(templatesRegistry).sort());
  });
});

describe.each(entries)("template: %s", (id, Template) => {
  it("renders the demo portfolio without throwing", () => {
    expect(() => renderToStaticMarkup(<Template project={demoPortfolio} />)).not.toThrow();
  });

  it("renders a default (mostly empty) portfolio without throwing", () => {
    expect(() =>
      renderToStaticMarkup(<Template project={createDefaultPortfolio()} />),
    ).not.toThrow();
  });

  it("survives a section whose items are entirely empty objects", () => {
    const content: PortfolioProject = {
      ...createDefaultPortfolio(),
      sections: [
        {
          id: "projects",
          type: "projects",
          title: "Projects",
          visible: true,
          items: [{}, {}, {}],
        },
      ],
    };
    expect(() => renderToStaticMarkup(<Template project={content} />)).not.toThrow();
  });

  it("does not emit a javascript: URL from a malicious item link", () => {
    const content: PortfolioProject = {
      ...createDefaultPortfolio(),
      socialLinks: [{ id: "x", label: "Bad", url: "javascript:alert(1)" }],
      sections: [
        {
          id: "projects",
          type: "projects",
          title: "Projects",
          visible: true,
          items: [{ id: "p", title: "Proj", summary: "s", link: "javascript:alert(1)" }],
        },
      ],
    };
    expect(renderToStaticMarkup(<Template project={content} />)).not.toContain("javascript:");
  });

  it("omits sections marked not visible", () => {
    const content = createDefaultPortfolio();
    content.sections = content.sections.map((section) => ({ ...section, visible: false }));
    const markup = renderToStaticMarkup(<Template project={content} />);
    for (const section of content.sections) {
      // `contact` is deliberately exempt: every template renders its contact
      // block from `project.identity` outside the section loop, so it is not
      // subject to per-section visibility.
      if (section.type === "contact") continue;
      expect(markup).not.toContain(`data-section="${section.type}"`);
    }
  });
});

/**
 * Regressions for TEMPLATE-AUDIT.md §1 — Signal used to supply real-sounding
 * institutions and dates as *fallbacks*, so a blank field published a
 * credential the portfolio owner never entered.
 */
describe("Signal — no fabricated credentials (audit §1)", () => {
  const FABRICATED = [
    "Stanford University",
    "Master of Science",
    "Synthetix Labs",
    "Synthetix Corp",
    "Staff Systems Engineer",
    "SIGGRAPH Academy",
    "SIGGRAPH Journal",
    "US Patent Office",
    "Code For All",
    "Type League",
    "Vertex Systems",
    "Algorithmic Typography Shaders",
    "Layout Stacking System Patent",
    "WebGL Engine Architecture",
    "Class of 2022",
  ];

  function emptySectioned(): PortfolioProject {
    // Every section type Signal renders, each holding one item with no fields
    // set — precisely the shape that used to trigger the invented fallbacks.
    const types = [
      "projects",
      "experience",
      "education",
      "services",
      "skills",
      "certifications",
      "languages",
      "interests",
      "publications",
      "patents",
      "testScores",
      "achievements",
      "volunteer",
      "writing",
      "testimonials",
      "awards",
    ];
    return {
      ...createDefaultPortfolio(),
      sections: types.map((type) => ({
        id: type,
        type,
        title: type,
        visible: true,
        items: [{ id: `${type}-1` }],
      })),
    };
  }

  it("renders no invented institution, employer, or title for blank fields", () => {
    const markup = renderToStaticMarkup(<SignalTemplate project={emptySectioned()} />);
    for (const value of FABRICATED) {
      expect(markup).not.toContain(value);
    }
  });

  it("does not invent a perfect test score or letter grade", () => {
    const markup = renderToStaticMarkup(<SignalTemplate project={emptySectioned()} />);
    expect(markup).not.toContain("100/100");
    expect(markup).not.toContain("Grade A+");
  });

  it("does not invent a five-star rating on an unrated testimonial", () => {
    const markup = renderToStaticMarkup(<SignalTemplate project={emptySectioned()} />);
    expect(markup).not.toContain("★★★★★");
  });

  it("still renders real values when they are supplied", () => {
    const content: PortfolioProject = {
      ...createDefaultPortfolio(),
      sections: [
        {
          id: "education",
          type: "education",
          title: "Education",
          visible: true,
          items: [{ id: "e1", school: "Real University", degree: "BSc", field: "Physics" }],
        },
      ],
    };
    const markup = renderToStaticMarkup(<SignalTemplate project={content} />);
    expect(markup).toContain("Real University");
    expect(markup).toContain("BSc in Physics");
  });
});

/** Regression for audit §7 — `0{index + 1}` rendered "010" at the tenth item. */
describe("index labels pad correctly past nine items (audit §7)", () => {
  function withProjects(count: number): PortfolioProject {
    return {
      ...createDefaultPortfolio(),
      sections: [
        {
          id: "projects",
          type: "projects",
          title: "Projects",
          visible: true,
          items: Array.from({ length: count }, (_, i) => ({
            id: `p${i}`,
            title: `Project ${i + 1}`,
            summary: "Summary.",
          })),
        },
      ],
    };
  }

  it("Signal renders 10 and 11, never 010 or 011", () => {
    const markup = renderToStaticMarkup(<SignalTemplate project={withProjects(11)} />);
    expect(markup).toContain(">10<");
    expect(markup).toContain(">11<");
    expect(markup).not.toContain(">010<");
    expect(markup).not.toContain(">011<");
  });

  it("Atelier renders 10, never 010", () => {
    const content = withProjects(11);
    content.sections.push({
      id: "services",
      type: "services",
      title: "Services",
      visible: true,
      items: Array.from({ length: 11 }, (_, i) => ({ id: `s${i}`, name: `Service ${i + 1}` })),
    });
    const markup = renderToStaticMarkup(<AtelierTemplate project={content} />);
    expect(markup).not.toContain(">010<");
  });
});

/** Regression for audit §5 — the hero's second CTA pointed at a nonexistent #work. */
describe("Signal hero CTA targets a real anchor (audit §5)", () => {
  it("links to the actual projects section id", () => {
    const content = createDefaultPortfolio();
    const projects = content.sections.find((s) => s.type === "projects");
    expect(projects).toBeDefined();
    const markup = renderToStaticMarkup(<SignalTemplate project={content} />);
    expect(markup).not.toContain('href="#work"');
    expect(markup).toContain(`href="#${projects!.id}"`);
  });

  it("omits the CTA entirely when there is no visible projects section", () => {
    const content = createDefaultPortfolio();
    content.sections = content.sections.filter((s) => s.type !== "projects");
    const markup = renderToStaticMarkup(<SignalTemplate project={content} />);
    expect(markup).not.toContain("Explore work");
  });
});

/** Regression for audit §4 — fonts must not be fetched from a third party. */
describe("templates do not reference remote font CDNs (audit §4)", () => {
  it.each(entries)("%s emits no fonts.googleapis.com reference", (_id, Template) => {
    const markup = renderToStaticMarkup(<Template project={demoPortfolio} />);
    expect(markup).not.toContain("fonts.googleapis.com");
    expect(markup).not.toContain("fonts.gstatic.com");
  });
});

describe("template gallery (P-061, P-079)", () => {
  it("marks Nimbus and Cipher as Creator Pro and sends every template to the editor", async () => {
    const html = renderToStaticMarkup(<TemplateCatalog templates={templates} />);

    expect(html.match(/>Creator Pro</g)).toHaveLength(
      templates.filter((template) => template.isPremium).length,
    );
    for (const template of templates) expect(html).toContain(`/editor?template=${template.id}`);
    expect(html).not.toContain('href="/dashboard"');
  });

  it("offers free templates at 0 and gives premium ones no made-up price", async () => {
    for (const template of templates) {
      const schema = createTemplateSchema(template, "https://portfolio.test");

      if (template.isPremium) {
        expect(schema.offers).toBeUndefined();
        expect(schema.description).toContain("Included with Creator Pro");
      } else {
        expect(schema.offers).toMatchObject({ price: "0" });
      }
    }
  });

  it("keeps the demo preview out of search and gives every template a real share image", async () => {
    for (const template of templates) {
      const params = { params: Promise.resolve({ id: template.id }) };
      const previewMeta = await preview.generateMetadata(params);
      const detailMeta = await detail.generateMetadata(params);

      expect(previewMeta.robots).toEqual({ index: false, follow: true });
      const image = JSON.stringify(detailMeta.openGraph?.images);
      if (template.isPremium) expect(image).toContain(`/api/template/${template.id}/og?`);
      else expect(image).toContain(`/og/templates/${template.id}-template-page-og.png`);
    }

    const html = renderToStaticMarkup(
      await preview.default({ params: Promise.resolve({ id: "signal" }) }),
    );
    expect(html).toContain("Demo content.");
  });
});
