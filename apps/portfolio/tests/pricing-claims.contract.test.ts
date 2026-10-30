import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  CREDIT_PACKS,
  PASS_NAMES,
  PASS_PRICES,
  PLAN_NAMES,
  PLAN_PRICES,
  PRICING_OFFERS,
  aggregateOffer,
  annualPerMonth,
} from "@/features/pricing/data/offers";
import { faqs } from "@/features/faq/constants";

/**
 * The portfolio app copies its prices, plan names and comparison rows from the site, which is
 * the reference (it matches Dodo and the server's productNames.ts). The site is read as source
 * text, never imported, so the two apps stay independent; a drift on either side fails here.
 */

const appRoot = join(__dirname, "..");
const siteData = join(appRoot, "..", "site", "features", "pricing", "data");
const read = (...parts: string[]) => readFileSync(join(...parts), "utf8");

const siteOffers = read(siteData, "offers.ts");
const sitePricingData = read(siteData, "pricingData.ts");
const portfolioOffers = read(appRoot, "features", "pricing", "data", "offers.ts");
const productNames = read(appRoot, "..", "server", "src", "services", "productNames.ts");

/** The source text of `export const NAME = ...;` with whitespace collapsed. */
function declaration(source: string, name: string) {
  const start = source.indexOf(`export const ${name} `);

  expect(start, `${name} not found`).toBeGreaterThan(-1);

  const lines = source.slice(start).split("\n");
  // One-line declarations end on their first line; multi-line ones at the first closing bracket in column 0.
  const end = lines[0]!.trimEnd().endsWith(";")
    ? 0
    : lines.findIndex((line) => /^[\]}]/.test(line));

  return lines
    .slice(0, end + 1)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

describe("portfolio prices match the site's", () => {
  for (const name of [
    "PLAN_PRICES",
    "PASS_PRICES",
    "CREDIT_PACKS",
    "CREDIT_PACK_VALID_DAYS",
    "PRICING_OFFERS",
  ]) {
    it(`${name} is the site's ${name}`, () => {
      expect(declaration(portfolioOffers, name)).toBe(declaration(siteOffers, name));
    });
  }

  it("the comparison rows are the site's", () => {
    expect(declaration(portfolioOffers, "comparisonRows")).toBe(
      declaration(sitePricingData, "comparisonRows"),
    );
  });

  it("plan and pass names are the server's naming table", () => {
    for (const [key, name] of Object.entries(PLAN_NAMES))
      expect(productNames).toContain(`${key}: "${name}"`);
    for (const [key, name] of Object.entries(PASS_NAMES))
      expect(productNames).toContain(`${key}: "${name}"`);
  });
});

describe("structured data offers", () => {
  const { offers, lowPrice, highPrice, offerCount } = aggregateOffer(
    "https://example.test/pricing",
  );

  it("lists every offer with annual plans priced per year", () => {
    expect(offerCount).toBe(String(PRICING_OFFERS.length));
    expect(lowPrice).toBe("0.00");
    expect(highPrice).toBe("143.88");

    const bundleAnnual = offers.find((offer) => offer.name === "Job Hunter Bundle, annual");
    expect(bundleAnnual?.price).toBe("143.88");
    expect(bundleAnnual?.priceSpecification?.billingDuration.unitCode).toBe("ANN");
  });

  it("marks nothing paid as in stock while checkout is closed", () => {
    for (const offer of offers) {
      expect(offer.availability).toBe(
        offer.price === "0.00" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      );
    }
  });
});

describe("the FAQ quotes the shared prices", () => {
  const text = faqs.map((faq) => faq.answer).join("\n");

  it("quotes every plan's monthly and yearly price", () => {
    for (const plan of Object.keys(PLAN_PRICES) as (keyof typeof PLAN_PRICES)[]) {
      expect(text).toContain(`$${PLAN_PRICES[plan].monthly}`);
      expect(text).toContain(`$${PLAN_PRICES[plan].annual}`);
      expect(text).toContain(`$${annualPerMonth(plan).toFixed(2)}`);
    }
    for (const price of Object.values(PASS_PRICES)) expect(text).toContain(`$${price}`);
    for (const pack of CREDIT_PACKS) expect(text).toContain(`$${pack.price}`);
  });

  it("states the one in-place change and cancel-then-rebuy for the rest (P-011, V-202)", () => {
    const upgrade = faqs.find((faq) => faq.id === "upgrade")!.answer;

    expect(upgrade).toMatch(/upgrade to the Job Hunter Bundle/i);
    expect(upgrade).toMatch(/pay only the difference/i);
    expect(upgrade).toMatch(/cancel/i);
  });

  it("never promises switching between any two plans", () => {
    const text = faqs.map((faq) => `${faq.question}\n${faq.answer}`).join("\n");

    expect(text).not.toMatch(/switch between (?:passes|plans|subscriptions)/i);
    expect(text).not.toMatch(
      /(?:upgrade|downgrade|change) (?:or|and) (?:downgrade|upgrade)[^.]*any/i,
    );
    expect(text).not.toMatch(/(?:any|every) plan change/i);
    expect(text).not.toMatch(/no proration|not prorated|no in-place/i);
  });
});

describe("the machine-readable files agree with the price table", () => {
  const pricingMd = read(appRoot, "public", "pricing.md");
  const llmsTxt = read(appRoot, "public", "llms.txt");

  it("quote every price", () => {
    for (const file of [pricingMd, llmsTxt]) {
      for (const offer of PRICING_OFFERS) {
        if (offer.price > 0) expect(file).toContain(`$${offer.price.toFixed(2)}`);
      }
    }
  });

  it("put Signal and Atelier on the free tier with the badge, Nimbus and Cipher on a paid one", () => {
    const freeTier = pricingMd.split(/^### /m).find((part) => /^\d+\. Free Tier/.test(part));

    expect(freeTier).toBeTruthy();
    expect(freeTier).toMatch(/Signal/);
    expect(freeTier).toMatch(/Atelier/);
    expect(freeTier).toMatch(/Built with VeriWorkly/);
    expect(freeTier).not.toMatch(/Nimbus|Cipher/);
  });

  it("carry the payments-closed notice", () => {
    expect(pricingMd).toMatch(/payments are currently closed/i);
    expect(llmsTxt).toMatch(/payments are currently closed/i);
  });
});

describe("shipped copy stays free of claims the code contradicts", () => {
  const BANNED: Array<[RegExp, string]> = [
    [/draft only/i, "P-063: free users publish Signal and Atelier"],
    [/custom subdomain mapping/i, "SV-02: subdomains are free"],
    [/shared path/i, "SV-09: every site gets its subdomain"],
    [/subdomain (?:needs|requires) a paid plan/i, "SV-09"],
    [/remaining value of your/i, "P-011: only the bundle upgrade is prorated"],
    [/no in-place plan switch|no proration|not prorated/i, "V-202: the bundle upgrade is prorated"],
    [/outbound click/i, "P-066: only views and referrers are recorded"],
    [/custom scripts/i, "P-066: no such feature"],
    [/export your entire/i, "P-066: the portfolio app has no export"],
    [/CDN media hosting|CDN image hosting/i, "P-064: uploads are not plan-gated"],
    [/1 active resume/i, "P-064: Pro lifts the document cap"],
    [/unlimited downloads/i, "P-069: downloads are free on every tier"],
    [/low checkout fees/i, "P-066"],
    [/ala carte/i, "plan-name drift"],
    [
      /ai standalone|credits standalone|draft tier|monthly pro \$/i,
      "plan names come from productNames.ts",
    ],
    [/immediately if you cancel/i, "P-016: packs last 90 days regardless"],
    [/top up your active subscription/i, "P-070: packs need no subscription"],
    [/Only system administrators/i, "P-076: the closure reads as a launch notice"],
  ];

  const SCANNED = ["app", "components", "config", "features", "lib", "public", "templates"];

  function walk(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = join(dir, entry.name);

      if (entry.isDirectory()) return walk(full);

      return /\.(tsx?|json|md|txt)$/.test(entry.name) ? [full] : [];
    });
  }

  const files = [...SCANNED.flatMap((dir) => walk(join(appRoot, dir))), join(appRoot, "README.md")];

  it("scans the files it is about to check", () => {
    expect(files.some((file) => file.endsWith("llms.txt"))).toBe(true);
    expect(files.some((file) => file.endsWith("constants.ts"))).toBe(true);
    expect(files.length).toBeGreaterThan(50);
  });

  for (const [pattern, why] of BANNED) {
    it(`no shipped file says ${pattern} (${why})`, () => {
      const offenders = files.filter((file) => pattern.test(readFileSync(file, "utf8")));

      expect(offenders.map((file) => file.slice(appRoot.length + 1))).toEqual([]);
    });
  }
});
