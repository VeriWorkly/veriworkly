import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { siteConfig } from "@/config/site";
import { templateSummaries } from "@/config/templates";
import { COMPETITORS } from "@/features/compare/data/competitors";

/** Cross-file agreement tests: each encodes "we agreed to keep these in sync" as something that breaks CI. */

const publicDir = join(__dirname, "..", "..", "public");

const readPublicFile = (name: string) => readFileSync(join(publicDir, name), "utf8");

const llmsTxt = readPublicFile("llms.txt");
const pricingMd = readPublicFile("pricing.md");

function internalPathsIn(text: string): string[] {
  const matches = text.matchAll(/https:\/\/veriworkly\.com(\/[^\s`)"']*)/g);

  return [...new Set([...matches].map((m) => m[1]!.replace(/[.,)]+$/, "")))];
}

describe("llms.txt agrees with the template catalog", () => {
  it("names every template by its real, prefixed ID", () => {
    /** Checks llms.txt never mentions a catalog ID with its prefix stripped; matching prefixed IDs would miss exactly that bug. */
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
    // Catches /features listing fewer portfolio templates than the catalog ships.
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
  // /compare/[competitor] has dynamicParams = false, so an advertised path outside COMPETITORS hard-404s.
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
  /** The launch model in portfolioService.publish: Signal and Atelier free with a badge; Nimbus and Cipher need a subscription. */
  const FREE_TEMPLATES = ["Signal", "Atelier"];
  const PREMIUM_TEMPLATES = ["Nimbus", "Cipher"];

  /** Splits pricing.md by tier heading so a template is asserted to sit in a particular tier, not just anywhere in the file. */
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
    // portfolioController blocks publishing in production for non-admins, so both files must carry a status qualifier.
    expect(pricingMd).toMatch(/not yet enabled in production/i);
    expect(llmsTxt).toMatch(/not yet enabled in production/i);
  });
});

describe("credit pack expiry is stated consistently", () => {
  it("pricing.md states the 90-day expiry the server enforces", () => {
    // creditPackCatalog.expiresInDays is 90 for both packs (applied in billingService).
    expect(pricingMd).toMatch(/90 days/i);
    expect(pricingMd).not.toMatch(/never expire/i);
  });
});

describe("the ATS hero preview uses the report's own vocabulary", () => {
  it("labels every area with a real category label", async () => {
    // The preview must use only labels the real report renders.
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
  /** Trials were removed (billingService passes no trial_period_days); a re-added trial must not ship while pricing promises none. */
  it("pricing.md states plainly that there are no trials", () => {
    expect(pricingMd).toMatch(/no free trials/i);
  });

  it("pricing.md does not advertise a trial on any tier", () => {
    // Deliberately narrow: matches an offered trial, not prose such as "no free trials".
    expect(pricingMd).not.toMatch(/\d+[- ]day free trial/i);
    expect(pricingMd).not.toMatch(/\*\*Free trial\*\*/i);
  });
});

describe("ATS copy does not overclaim what a bad parse causes", () => {
  /** Formatting changes how a resume is parsed, but a bad parse is recoverable friction, not silent rejection; see AI-REGULATORY-POSTURE.md. */
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

/** No zero-data-retention routing is enforced, so retention claims stay qualified; drop an assertion only in the change that enables ZDR. */
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

    // Disclosure is what makes the narrower claims honest, so it is asserted rather than assumed.
    expect(privacyContent).toMatch(/OpenRouter/);
    expect(privacyContent).toMatch(/Standard Contractual Clauses/);
  });
});

describe("the ATS Engine page agrees with the engine and the docs it points to", () => {
  /** Pins /ats-engine to the installed engine version and the docs tree, both of which drift silently. */
  const docsContent = join(__dirname, "..", "..", "..", "docs-platform", "content");
  const sitemapSource = readFileSync(join(__dirname, "..", "..", "app", "sitemap.ts"), "utf8");

  it("quotes the version of the engine the site installs", async () => {
    const { ENGINE_VERSION } = await import("@veriworkly/ats-engine");
    const { ENGINE_VERSION_LABEL } = await import("@/features/ats-engine/data/content");

    expect(
      ENGINE_VERSION_LABEL,
      "the site now runs another engine: re-measure the sizes and benchmarks in features/ats-engine/data/content.ts, then update the label",
    ).toBe(ENGINE_VERSION);
    // The cold import of the engine takes longer than vitest's 5 s default under full-suite load.
  }, 30_000);

  it("is listed in the sitemap and in llms.txt", () => {
    expect(sitemapSource).toContain("${siteConfig.url}/ats-engine`");
    expect(internalPathsIn(llmsTxt)).toContain("/ats-engine");
  });

  it("links only to docs pages that exist", async () => {
    const { ENGINE_LINKS, SURFACES } = await import("@/features/ats-engine/data/content");

    const docsPaths = [
      ...Object.values(ENGINE_LINKS)
        .filter((url) => new URL(url).hostname === new URL(siteConfig.links.docs).hostname)
        .map((url) => new URL(url).pathname),
      ...SURFACES.map((surface) => surface.docsPath),
    ];

    for (const path of docsPaths) {
      const base = join(docsContent, path === "/ats-engine" ? "/ats-engine/index" : path);
      const exists = [".mdx", ".md"].some((ext) => {
        try {
          readFileSync(`${base}${ext}`);
          return true;
        } catch {
          return false;
        }
      });

      expect(exists, `${path} has no page under apps/docs-platform/content`).toBe(true);
    }
  });

  it("names FAQ entries that exist", async () => {
    const { FAQ_IDS } = await import("@/features/ats-engine/data/content");
    const { faqs } = await import("@/features/faq/data/faqItems");
    const known = new Set(faqs.map((faq) => faq.id));

    for (const id of FAQ_IDS) expect(known, `FAQ "${id}" does not exist`).toContain(id);
  });

  it("demo samples still show what their labels promise", async () => {
    const { check } = await import("@veriworkly/ats-engine");
    const { ENGINE_SAMPLES } = await import("@/features/ats-engine/data/samples");
    const now = new Date("2026-10-01T00:00:00Z");
    const score = (id: string) => {
      const sample = ENGINE_SAMPLES.find((entry) => entry.id === id)!;
      return check(sample.resume, undefined, { jobDescription: sample.posting, now });
    };

    const strong = score("strong");
    expect(strong.failedChecks).toEqual([]);
    expect(strong.jobMatchScore).toBeGreaterThanOrEqual(80);

    const weak = score("needs-work");
    expect(weak.jobMatchScore).toBeLessThan(50);
    expect(weak.failedChecks.map((rule) => rule.id)).toContain("ats-v2.writing.firstPerson");

    const gaming = score("gaming");
    const failed = gaming.failedChecks.map((rule) => rule.id);
    expect(failed).toContain("ats-v2.integrity.promptInjection");
    expect(failed).toContain("ats-v2.integrity.keywordStuffing");
  });
});

describe("privacy, pricing and ambassador copy match the server", () => {
  const repoRoot = join(__dirname, "..", "..", "..", "..");
  const retentionJob = readFileSync(
    join(repoRoot, "apps", "server", "src", "jobs", "retentionJob.ts"),
    "utf8",
  );
  const privacy = readFileSync(
    join(__dirname, "..", "..", "features", "legal", "privacyContent.ts"),
    "utf8",
  );
  const faq = readFileSync(
    join(__dirname, "..", "..", "features", "faq", "data", "faqItems.ts"),
    "utf8",
  );

  /** The default a retention rule falls back to, read from the server source. */
  const retentionDays = (variable: string) => {
    const match = retentionJob.match(new RegExp(`days\\("${variable}", (\\d+)\\)`));
    expect(match, `${variable} default not found in retentionJob.ts`).not.toBeNull();
    return Number(match![1]);
  };

  it("states the retention windows the nightly job enforces", () => {
    const clicks = retentionDays("RETENTION_AFFILIATE_CLICK_DAYS");
    const views = retentionDays("RETENTION_PORTFOLIO_VIEW_DAYS");
    const deleted = retentionDays("RETENTION_DELETED_DOCUMENT_DAYS");

    expect(clicks).toBeGreaterThan(0);
    expect(views).toBe(clicks);
    expect(privacy).toMatch(new RegExp(`after ${clicks} days a click keeps only its count`));
    expect(privacy).toMatch(new RegExp(`older than ${views} days are merged`));
    expect(privacy).toMatch(new RegExp(`${deleted} days after you delete a document`));
    expect(privacy).toMatch(/request log[^"]*deleted after 90 days/);
    expect(retentionJob).toMatch(
      /days\("RETENTION_AUDIT_LOG_DAYS", config\.logging\.auditRetentionDays\)/,
    );
  });

  it("does not say retention is unautomated or that the guest cookie renews", () => {
    expect(privacy).not.toMatch(/not built that automation|not timers enforced/i);
    expect(privacy).not.toMatch(/30 days after your last visit/i);
  });

  it("does not offer LinkedIn import as free: every import spends AI credits", () => {
    expect(pricingMd).not.toMatch(/Free tier:[^\n]*LinkedIn/);
    expect(pricingMd).toMatch(/LinkedIn import is AI-parsed and spends AI credits/);
    expect(faq).toMatch(/Every LinkedIn import spends AI credits/);
  });

  it("does not say documents reach the database only when sync is turned on", () => {
    expect(faq).not.toMatch(/only if you turn on cloud sync/i);
  });

  it("shows no invented ambassador rankings: the server keeps no points ledger", () => {
    const ambassadorDir = join(__dirname, "..", "..", "features", "ambassador");
    const files = readdirSync(ambassadorDir, { recursive: true, withFileTypes: true });
    for (const file of files.filter((entry) => entry.isFile())) {
      const source = readFileSync(join(file.parentPath, file.name), "utf8");
      expect(source, file.name).not.toMatch(/school:\s*"|points:\s*\d/);
    }
  });
});
