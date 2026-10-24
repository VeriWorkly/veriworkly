import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

import { templateSummaries } from "@/config/templates";
import { COMPETITORS } from "@/features/compare/data/competitors";
import { compareDescription, compareTitle } from "@/features/compare/data/metadata";
import { releaseHeadline, releaseSummary } from "@/features/changelog/utils/changelog-utils";
import { DESCRIPTION_MAX, TITLE_MAX, fitTitle } from "@/utils/metadata";

/**
 * Google truncates titles past ~60 characters and descriptions past ~160; the 2026-10-24 crawl
 * found 21 marketing pages and every release page over the limit (W-015). Static pages are
 * checked from their source literals, data-driven pages through the helpers that build them.
 */

const appDir = join(__dirname, "..", "..", "app");

function pages(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return pages(full);
    return name === "page.tsx" ? [full] : [];
  });
}

const literal = (raw: string) =>
  raw.slice(1, -1).replace(/\$\{siteConfig\.(shortName|name)\}/g, "VeriWorkly");

describe("static page metadata", () => {
  for (const file of pages(appDir)) {
    const source = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
    const start = source.search(/export (const|async function) (metadata|generateMetadata)/);
    if (start === -1) continue;

    const block = source.slice(start, start + 2500);
    const title = /\n\s*title:\s*(`[^`$]*(?:\$\{siteConfig\.\w+\}[^`$]*)*`|"[^"]*")/.exec(
      block,
    )?.[1];
    const description = /\n\s*description:\s*\n?\s*(`[^`]*`|"[^"]*")/.exec(block)?.[1];
    const route = relative(appDir, file).replace(/\\/g, "/");

    it(`${route} fits the SERP limits`, () => {
      if (title) {
        const text = literal(title).replace(/\$\{page\}/g, "99");
        expect(text.length, `title: ${text}`).toBeLessThanOrEqual(TITLE_MAX);
        expect(text, "title lacks the brand").toContain("VeriWorkly");
      }
      if (description) {
        const text = literal(description);
        expect(text.length, `description: ${text}`).toBeLessThanOrEqual(DESCRIPTION_MAX);
      }
    });
  }
});

describe("data-driven titles", () => {
  it("every template title fits without being cut", () => {
    for (const template of templateSummaries) {
      const title = fitTitle(
        `${template.name} ${template.documentTypeLabel} Template`,
        "VeriWorkly",
      );
      expect(title.length).toBeLessThanOrEqual(TITLE_MAX);
      expect(title, template.id).not.toContain("…");
      expect(template.seo.description.length, template.id).toBeLessThanOrEqual(DESCRIPTION_MAX);
    }
  });

  it("every comparison title and description fits without being cut", () => {
    for (const { name } of COMPETITORS) {
      expect(compareTitle(name)).not.toContain("…");
      expect(compareTitle(name).length).toBeLessThanOrEqual(TITLE_MAX);
      expect(compareDescription(name)).not.toContain("…");
    }
  });

  it("release titles drop the backend's repeated version and never describe with a rule", () => {
    expect(releaseHeadline("v3.21.0 - AI Experience Refresh")).toBe("AI Experience Refresh");
    expect(releaseHeadline("3.7.0-beta.1: Beta")).toBe("Beta");
    expect(releaseHeadline("Profile Core Package")).toBe("Profile Core Package");
    expect(releaseSummary("---")).toBeNull();
    expect(releaseSummary("  ")).toBeNull();
    expect(releaseSummary("Shipped the thing.")).toBe("Shipped the thing.");

    const long = fitTitle(
      "v3.24.3: Next.js 16.3.5 Security Upgrade, Dependency Cleanup, and ATS Engine Modularization",
      "VeriWorkly changelog",
    );
    expect(long.length).toBeLessThanOrEqual(TITLE_MAX);
    expect(long).toMatch(/^v3\.24\.3: Next\.js 16\.3\.5 Security.*… \| VeriWorkly changelog$/);
  });
});
