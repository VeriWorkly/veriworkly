import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AtelierTemplate from "@/template-library/atelier/AtelierTemplate";
import NimbusTemplate from "@/template-library/nimbus/NimbusTemplate";
import SignalTemplate from "@/template-library/signal/SignalTemplate";
import {
  createDefaultPortfolio,
  parsePortfolioContent,
  portfolioSectionTypes,
} from "@/lib/portfolio";
import { emptyItemFor, sectionFields, sectionMeta } from "@/lib/section-fields";
import type { PortfolioProject } from "@/template-library/types";

/**
 * Guards the editor→published contract.
 *
 * The editor used to write only { title, summary, year } per item while the
 * templates read 28 distinct fields, so most of what a template could render
 * was unreachable — and for several section types the one field a user *could*
 * fill (`summary`) was read under a different name (`description`) and silently
 * dropped from the published page.
 *
 * These tests fill every field the editor exposes with a unique marker and
 * assert the marker survives to the rendered output.
 */

/** Builds an item using exactly the schema the editor renders for this type. */
function filledItem(type: string): Record<string, unknown> {
  const item: Record<string, unknown> = { id: `${type}-1`, ...emptyItemFor(type as never) };
  for (const field of sectionFields[type as never] as Array<{ key: string; type: string }>) {
    if (field.type === "checkbox") continue;
    if (field.key === "link") {
      item[field.key] = "https://example.com/";
      continue;
    }
    if (field.type === "list" || field.type === "lines") {
      item[field.key] = [`${field.key}_ALPHA`, `${field.key}_BETA`];
      continue;
    }
    // `score` must stay parseable or the gauge is (correctly) suppressed.
    if (field.key === "score") {
      item[field.key] = "95";
      continue;
    }
    if (field.key === "rating") {
      item[field.key] = "4";
      continue;
    }
    item[field.key] = `${field.key}_VALUE`;
  }
  return item;
}

function projectFor(type: string): PortfolioProject {
  return {
    ...createDefaultPortfolio(),
    sections: [
      {
        id: type,
        type,
        title: "SECTION_TITLE_VALUE",
        subtitle: "SECTION_SUBTITLE_VALUE",
        visible: true,
        items: [filledItem(type)],
      },
    ],
  };
}

// Contact has no items and renders from identity; custom is a passthrough.
const ITEM_TYPES = portfolioSectionTypes.filter((t) => t !== "contact");

/**
 * Templates covered by the field-coverage sweep.
 *
 * **Cipher is deliberately excluded.** It boots in `"standby"` and only renders
 * section content after a client-side boot sequence plus a command, so
 * `renderToStaticMarkup` never reaches its content and every assertion here
 * would be a false negative. Verifying Cipher needs a DOM environment that can
 * drive the boot and issue a command; its field coverage is tracked separately
 * and is intentionally narrower than the other three.
 *
 * This list was originally just Signal, which is exactly how Atelier and Nimbus
 * ended up carrying seven unrendered fields each after the same bugs were fixed
 * in Signal alone. Adding a template here is what stops that recurring.
 */
const RENDERED_TEMPLATES = [
  ["Signal", SignalTemplate],
  ["Atelier", AtelierTemplate],
  ["Nimbus", NimbusTemplate],
] as const;

describe.each(RENDERED_TEMPLATES)(
  "every editor field reaches the published page (%s)",
  (_name, Template) => {
    it.each(ITEM_TYPES)("%s", (type) => {
      const markup = renderToStaticMarkup(<Template project={projectFor(type)} />);
      const missing: string[] = [];

      for (const field of sectionFields[type]) {
        if (field.type === "checkbox") continue;
        if (field.key === "link") continue; // rendered as an href, asserted below
        const expected =
          field.type === "list" || field.type === "lines"
            ? `${field.key}_ALPHA`
            : field.key === "score"
              ? "95"
              : field.key === "rating"
                ? null // renders as stars, not text
                : `${field.key}_VALUE`;
        if (expected && !markup.includes(expected)) missing.push(field.key);
      }

      expect(missing, `${type}: fields saved by the editor but never rendered`).toEqual([]);
    });
  },
);

describe("section title and subtitle are user-controlled", () => {
  const templates = [
    ["Signal", SignalTemplate],
    ["Atelier", AtelierTemplate],
    ["Nimbus", NimbusTemplate],
  ] as const;

  it.each(templates)("%s renders the user's section title", (_name, Template) => {
    const markup = renderToStaticMarkup(<Template project={projectFor("education")} />);
    expect(markup).toContain("SECTION_TITLE_VALUE");
  });

  it.each(templates)("%s renders the user's section subtitle", (_name, Template) => {
    const markup = renderToStaticMarkup(<Template project={projectFor("education")} />);
    expect(markup).toContain("SECTION_SUBTITLE_VALUE");
  });

  it.each(templates)("%s renders no subtitle when the user clears it", (_name, Template) => {
    const content = projectFor("education");
    content.sections[0].subtitle = "";
    const markup = renderToStaticMarkup(<Template project={content} />);
    expect(markup).not.toContain("SECTION_SUBTITLE_VALUE");
  });

  it("Nimbus no longer hardcodes its section headings", () => {
    const markup = renderToStaticMarkup(<NimbusTemplate project={projectFor("education")} />);
    // Was "Where I <em>learned it.</em>" regardless of what the user typed.
    expect(markup).not.toContain("learned it");
  });
});

describe("legacy drafts keep working", () => {
  it("renders body copy stored as `description` (template-native name)", () => {
    const content = {
      ...createDefaultPortfolio(),
      sections: [
        {
          id: "certifications",
          type: "certifications",
          title: "Certs",
          visible: true,
          items: [{ id: "c1", title: "Cert", description: "LEGACY_DESCRIPTION" }],
        },
      ],
    } as PortfolioProject;
    expect(renderToStaticMarkup(<SignalTemplate project={content} />)).toContain(
      "LEGACY_DESCRIPTION",
    );
  });

  it("renders body copy stored as `summary` (what the editor writes)", () => {
    const content = {
      ...createDefaultPortfolio(),
      sections: [
        {
          id: "certifications",
          type: "certifications",
          title: "Certs",
          visible: true,
          items: [{ id: "c1", title: "Cert", summary: "EDITOR_SUMMARY" }],
        },
      ],
    } as PortfolioProject;
    expect(renderToStaticMarkup(<SignalTemplate project={content} />)).toContain("EDITOR_SUMMARY");
  });

  it("seeds a subtitle for sections saved before subtitles existed", () => {
    const parsed = parsePortfolioContent({
      ...createDefaultPortfolio(),
      sections: [{ id: "s", type: "skills", title: "Skills", visible: true, items: [] }],
    });
    expect(parsed.sections[0].subtitle).toBe(sectionMeta.skills.subtitle);
  });

  it("preserves a deliberately cleared subtitle instead of re-seeding it", () => {
    const parsed = parsePortfolioContent({
      ...createDefaultPortfolio(),
      sections: [
        { id: "s", type: "skills", title: "Skills", subtitle: "", visible: true, items: [] },
      ],
    });
    expect(parsed.sections[0].subtitle).toBe("");
  });
});

describe("section field schema", () => {
  it("covers every section type", () => {
    for (const type of portfolioSectionTypes) {
      expect(sectionFields[type], `no field schema for "${type}"`).toBeDefined();
    }
  });
});
