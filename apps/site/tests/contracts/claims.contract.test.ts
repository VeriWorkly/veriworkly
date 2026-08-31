import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { templateSummaries } from "@/config/templates";
import { COMPETITORS } from "@/features/compare/data/competitors";

/**
 * Claim contract tests.
 *
 * A site audit found that most of what was wrong with this app was not code but
 * *claims*: hand-maintained files drifting away from the data they describe. llms.txt
 * advertised three /compare routes that hard-404 and hid three that exist, and listed
 * every resume template ID without its `resume-` prefix, so all seven links were dead.
 * None of it could fail a build, because nothing asserted the relationship.
 *
 * These tests close that. They are deliberately about cross-file agreement rather than
 * behaviour: each one encodes "we agreed to keep these in sync" as something that
 * breaks CI when it stops being true.
 */

const publicDir = join(__dirname, "..", "..", "public");

const readPublicFile = (name: string) => readFileSync(join(publicDir, name), "utf8");

const llmsTxt = readPublicFile("llms.txt");
const pricingMd = readPublicFile("pricing.md");

/** Every `https://veriworkly.com/...` path llms.txt points at, deduped. */
function internalPathsIn(text: string): string[] {
  const matches = text.matchAll(/https:\/\/veriworkly\.com(\/[^\s`)"']*)/g);

  return [...new Set([...matches].map((m) => m[1]!.replace(/[.,)]+$/, "")))];
}

describe("llms.txt agrees with the template catalog", () => {
  it("names every template by its real, prefixed ID", () => {
    /**
     * The bug this catches: llms.txt listed `executive-clarity` where the catalog ID is
     * `resume-executive-clarity`, so /templates/resume/<id> 404'd for all seven resume
     * templates.
     *
     * Matching on "IDs that already look prefixed" would miss exactly that bug - the
     * broken value has no prefix to match. So instead we take every template ID in the
     * catalog and check that llms.txt does not mention it with the prefix stripped.
     */
    const catalogIds = templateSummaries.map((template) => template.id);

    expect(catalogIds.length).toBeGreaterThan(0);

    const backticked = new Set([...llmsTxt.matchAll(/`([a-z0-9-]+)`/g)].map((match) => match[1]!));

    for (const id of catalogIds) {
      const unprefixed = id.replace(/^(resume|cover-letter|portfolio)-/, "");

      if (unprefixed === id) continue;

      expect(
        backticked,
        `llms.txt names "${unprefixed}" but the catalog ID is "${id}" - the route would 404`,
      ).not.toContain(unprefixed);
    }

    // And every backticked value that looks like a template ID must actually be one.
    const known = new Set(catalogIds);

    for (const id of backticked) {
      if (!/^(resume|cover-letter|portfolio)-/.test(id)) continue;

      expect(known, `llms.txt names "${id}", which is not in the template catalog`).toContain(id);
    }
  });

  it("lists every portfolio template the catalog ships", () => {
    // The bug this catches: /features listing "Signal, Atelier, and Nimbus" while the
    // catalog, llms.txt, and agent.json all ship four including Cipher.
    const portfolioIds = templateSummaries
      .filter((template) => template.id.startsWith("portfolio-"))
      .map((template) => template.id);

    expect(portfolioIds.length).toBeGreaterThan(0);

    for (const id of portfolioIds) {
      expect(llmsTxt, `llms.txt omits the portfolio template "${id}"`).toContain(id);
    }
  });
});

describe("llms.txt agrees with the compare routes", () => {
  // /compare/[competitor] sets `dynamicParams = false`, so a path that is not in
  // COMPETITORS hard-404s rather than rendering. Advertising one to AI crawlers is
  // worse than omitting it.
  const advertised = internalPathsIn(llmsTxt)
    .filter((path) => path.startsWith("/compare/"))
    .map((path) => path.replace("/compare/", ""));

  it("advertises only competitor routes that exist", () => {
    const known = new Set(COMPETITORS.map((competitor) => competitor.id));

    for (const id of advertised) {
      expect(known, `llms.txt advertises /compare/${id}, which would 404`).toContain(id);
    }
  });

  it("advertises every competitor route that exists", () => {
    for (const competitor of COMPETITORS) {
      expect(
        advertised,
        `llms.txt omits /compare/${competitor.id}, which is a real route`,
      ).toContain(competitor.id);
    }
  });
});

describe("published claims stay consistent with the portfolio model", () => {
  /**
   * The launch model, enforced in `portfolioService.publish`: Signal and Atelier are
   * free and publish with a badge; Nimbus and Cipher require a subscription. Copy
   * drifted badly here - nineteen surfaces said publishing was free and unqualified
   * while pricingData and the README said it was a paid entitlement.
   */
  const FREE_TEMPLATES = ["signal", "atelier"];
  const PREMIUM_TEMPLATES = ["nimbus", "cipher"];

  it("pricing.md names the free templates and the badge that comes with them", () => {
    for (const name of FREE_TEMPLATES) {
      expect(pricingMd.toLowerCase()).toContain(name);
    }

    expect(pricingMd).toMatch(/Built with VeriWorkly/i);
  });

  it("pricing.md keeps the premium templates on the paid tiers", () => {
    for (const name of PREMIUM_TEMPLATES) {
      expect(pricingMd.toLowerCase()).toContain(name);
    }
  });

  it("does not claim portfolio publishing is live while it is gated in production", () => {
    // portfolioController blocks publishing in production for every non-admin email,
    // so any present-tense publishing claim is false for all users today. Both files
    // carry an explicit status qualifier until that gate lifts.
    expect(pricingMd).toMatch(/not yet enabled in production/i);
    expect(llmsTxt).toMatch(/not yet enabled in production/i);
  });
});

describe("credit pack expiry is stated consistently", () => {
  it("pricing.md states the 90-day expiry the server enforces", () => {
    // creditPackCatalog.expiresInDays is 90 for both packs, applied in billingService.
    // The FAQ previously said one-time packs "never expire", contradicting our Terms.
    expect(pricingMd).toMatch(/90 days/i);
    expect(pricingMd).not.toMatch(/never expire/i);
  });
});

describe("the ATS hero preview uses the report's own vocabulary", () => {
  it("labels every area with a real category label", async () => {
    // The preview promises what the report will say. It previously used four labels
    // the engine never renders - "Parsing & extraction", "Document structure",
    // "Evidence & impact", "Format risk profile" - so the figure set an expectation
    // the product then broke.
    const preview = readFileSync(
      join(
        __dirname,
        "..",
        "..",
        "features",
        "ats-checker",
        "components",
        "hero",
        "ReportPreview.tsx",
      ),
      "utf8",
    );

    const { categoryMeta } = await import("@/features/ats-checker/data/categories");

    const realLabels = new Set(
      ["parse", "contact", "structure", "content", "format"].map((key) => categoryMeta(key).label),
    );

    const areasBlock = /const AREAS = \[([\s\S]*?)\] as const;/.exec(preview)?.[1] ?? "";

    const previewLabels = [...areasBlock.matchAll(/label: "([^"]+)"/g)].map((match) => match[1]!);

    expect(previewLabels.length).toBeGreaterThan(0);

    for (const label of previewLabels) {
      expect(
        realLabels,
        `ReportPreview shows "${label}", which the real report never renders`,
      ).toContain(label);
    }
  });
});
