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
  const FREE_TEMPLATES = ["Signal", "Atelier"];
  const PREMIUM_TEMPLATES = ["Nimbus", "Cipher"];

  /**
   * Splits pricing.md on its `### N. Tier Name` headings, so a template can be asserted
   * to sit in a *particular* tier.
   *
   * The first version of these tests checked only that the word appeared somewhere in
   * the file, which is near-tautological: moving Nimbus into the free tier would still
   * have passed, and that is precisely the drift this file exists to catch.
   */
  const tierSections = (() => {
    const sections = new Map<string, string>();
    const parts = pricingMd.split(/^### /m).slice(1);

    for (const part of parts) {
      const heading = part.slice(0, part.indexOf("\n")).trim();
      sections.set(heading, part);
    }

    return sections;
  })();

  const freeTierBody = [...tierSections.entries()].find(([heading]) =>
    /free tier/i.test(heading),
  )?.[1];

  const paidTierBodies = [...tierSections.entries()]
    .filter(([heading]) => !/free tier/i.test(heading))
    .map(([, body]) => body)
    .join("\n");

  it("parses the tier headings it asserts against", () => {
    // Guards the two tests below from silently passing on an unparsed file.
    expect(freeTierBody, "no '### N. Free Tier' heading found in pricing.md").toBeTruthy();
    expect(tierSections.size).toBeGreaterThan(2);
  });

  it("puts the free core templates in the free tier, with their badge", () => {
    for (const name of FREE_TEMPLATES) {
      expect(freeTierBody, `pricing.md does not offer ${name} on the free tier`).toContain(name);
    }

    expect(freeTierBody, "the free tier does not mention the badge free portfolios carry").toMatch(
      /Built with VeriWorkly/i,
    );
  });

  it("keeps the premium templates out of the free tier", () => {
    for (const name of PREMIUM_TEMPLATES) {
      expect(
        freeTierBody,
        `pricing.md lists the premium template ${name} under the free tier`,
      ).not.toContain(name);

      expect(paidTierBodies, `pricing.md never offers ${name} on a paid tier`).toContain(name);
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

describe("the no-trial policy is stated consistently", () => {
  /**
   * Trials were removed from the product entirely (billingService no longer passes
   * `trial_period_days` to checkout). Before that, the Terms described a trial for
   * "Job Hunter Bundle / Creator Pro" while the code applied one to Creator Pro
   * monthly only — the docs were wrong about a charge users would actually see.
   *
   * These assert the current state so a re-added trial cannot land in code while the
   * published pricing still promises none.
   */
  it("pricing.md states plainly that there are no trials", () => {
    expect(pricingMd).toMatch(/no free trials/i);
  });

  it("pricing.md does not advertise a trial on any tier", () => {
    // Deliberately narrow: matches an offered trial, not the word in prose such as
    // "no free trials" above.
    expect(pricingMd).not.toMatch(/\d+[- ]day free trial/i);
    expect(pricingMd).not.toMatch(/\*\*Free trial\*\*/i);
  });
});

describe("ATS copy does not overclaim what a bad parse causes", () => {
  /**
   * The evidence supports "formatting changes how a resume is parsed" and does not support
   * "a bad parse silently rejects you". Workday's own admin documentation says results "can
   * vary based on resume format and order of words" — which is the premise the product is
   * built on — but the same documentation describes a review step where a candidate can
   * correct parsed data before submitting, and Workday does not autofill Skills or Languages.
   *
   * So a parse failure is recoverable friction that creates real work and a real chance of an
   * uncaught error. It is not a machine binning the application unseen. The stronger claim is
   * the one a competitor's marketing reaches for, it is the easy sentence to write when
   * someone is asked to make this page convert harder, and it is not true. This asserts the
   * current, accurate framing so the overclaim breaks CI instead of shipping.
   *
   * See AI-REGULATORY-POSTURE.md.
   */
  const atsPagePath = join(__dirname, "..", "..", "app", "(marketing)", "ats-checker", "page.tsx");
  const atsCopy = readFileSync(atsPagePath, "utf8");

  /** Phrasings that assert silent, unappealable rejection rather than parsing risk. */
  const OVERCLAIMS = [
    /never (?:be )?(?:seen|read|reaches?|reviewed) by (?:a )?(?:human|person|recruiter)/i,
    /auto(?:matically)?[- ]rejects?/i,
    /(?:resume|application|cv) (?:is |gets? |was )?(?:silently )?(?:binned|discarded|trashed)/i,
    /thrown (?:out|away) by (?:the )?(?:ats|robot|machine|bot)/i,
    /screened out before/i,
    /75% of (?:resumes|applications)/i,
  ];

  it("the ATS checker page claims parsing risk, not silent rejection", () => {
    for (const pattern of OVERCLAIMS) {
      expect(atsCopy, `ATS page copy matches the unsupported claim ${pattern}`).not.toMatch(
        pattern,
      );
    }
  });

  it("llms.txt does not assert silent rejection either", () => {
    for (const pattern of OVERCLAIMS) {
      expect(llmsTxt, `llms.txt matches the unsupported claim ${pattern}`).not.toMatch(pattern);
    }
  });
});

/**
 * Data-handling claims the code cannot substantiate.
 *
 * The privacy policy body is careful — it says provider retention is "outside our direct
 * control" and qualifies training-exclusion with "to the extent we can configure it". Two other
 * surfaces were not: the privacy page's SEO metadata sold "stateless AI processing" as settled
 * fact, and a security card carried a flat "Zero Retention" badge.
 *
 * Neither is enforced anywhere — no zero-data-retention routing flag is set on the AI client —
 * so both were promising something unverifiable. These tests stop that drifting back in. If
 * ZDR routing is genuinely enabled later, the honest move is to delete the relevant assertion
 * here in the same change that turns the flag on, so the claim and its evidence land together.
 */
describe("AI data-handling claims stay within what we can substantiate", () => {
  const privacyPage = readFileSync(
    join(__dirname, "..", "..", "app", "(marketing)", "privacy", "page.tsx"),
    "utf8",
  );
  const securityDiagram = readFileSync(
    join(
      __dirname,
      "..",
      "..",
      "features",
      "security",
      "components",
      "matrix",
      "SecurityBoundaryDiagram.tsx",
    ),
    "utf8",
  );

  /** Absolute retention/statelessness claims about third-party model processing. */
  const UNSUBSTANTIATED = [
    /stateless ai/i,
    /prompts are stateless/i,
    /stateless prompt/i,
    /zero retention/i,
    /never retained/i,
  ];

  for (const [label, source] of [
    ["the privacy page", privacyPage],
    ["the security boundary diagram", securityDiagram],
  ] as const) {
    it(`${label} does not claim statelessness or zero retention`, () => {
      for (const pattern of UNSUBSTANTIATED) {
        expect(source, `${label} matches the unsubstantiated claim ${pattern}`).not.toMatch(
          pattern,
        );
      }
    });
  }

  it("the privacy policy still names the AI subprocessor", () => {
    const privacyContent = readFileSync(
      join(__dirname, "..", "..", "features", "legal", "privacyContent.ts"),
      "utf8",
    );

    // Disclosure is the thing that makes the narrower claims honest, so it is asserted rather
    // than assumed. Losing it would be a regression even though nothing else would break.
    expect(privacyContent).toMatch(/OpenRouter/);
    expect(privacyContent).toMatch(/Standard Contractual Clauses/);
  });
});
