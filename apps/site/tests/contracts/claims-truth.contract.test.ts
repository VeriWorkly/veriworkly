import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The 2026-10-24 site audit found sixteen claims in copy that the code contradicts (FC-1 to
 * FC-16 in apps/site/audit/FINDINGS.md): "no login required" while the studio sends every
 * cookieless visitor to /login, "every preview is the real export" while half the previews
 * are wireframes, "unmetered imports" against a 50-a-day limit, and so on. These tests keep
 * the exact phrases out of everything the site ships, including the machine-readable files,
 * and tie the numbers the site quotes to the server constants that own them.
 */

const siteRoot = join(__dirname, "..", "..");
const publicDir = join(siteRoot, "public");

const llmsTxt = readFileSync(join(publicDir, "llms.txt"), "utf8");
const pricingMd = readFileSync(join(publicDir, "pricing.md"), "utf8");

describe("copy stays free of the claims the audit found false", () => {
  const FALSE_CLAIMS: Array<[RegExp, string]> = [
    [/signing up is only needed/i, "FC-1: guests are capped at one document per type too"],
    [/drafts are not capped/i, "FC-2"],
    [/every preview is the real export/i, "FC-4: eight previews are wireframes"],
    [/the real export, rendered/i, "FC-4"],
    [/free pro access/i, "FC-5: ambassador rewards do not exist yet"],
    [/reward tier breakdown/i, "FC-5"],
    [/do not expire on active accounts/i, "FC-6: packs expire after 90 days"],
    [/zero automatic renewal/i, "FC-7: subscriptions renew"],
    [/no auto-renewal traps/i, "FC-7"],
    [/data archive in one step/i, "FC-9: LinkedIn import is a profile PDF or pasted text"],
    [/language percentages/i, "FC-10: GitHub import maps the primary language only"],
    [/payouts occur monthly/i, "FC-14: payouts are reviewed by hand"],
    [/\bunmetered\b/i, "FC-16: paid GitHub imports are capped at 50 a day"],
    [/stateless (?:ai|prompt)/i, "FC-13 / W-019"],
    [/encrypted postgresql/i, "W-019: storage encryption is the provider's, not ours"],
    [/sort and rank applications/i, "FC-15: /ats-engine says an ATS does not rank"],
  ];

  const SHIPPED_DIRS = ["app", "components", "config", "features", "public"];
  const SKIP = new Set(["openapi.json"]);

  function walk(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = join(dir, entry.name);

      if (entry.isDirectory()) return walk(full);
      if (SKIP.has(entry.name)) return [];

      return /\.(tsx?|json|md|txt)$/.test(entry.name) ? [full] : [];
    });
  }

  const files = SHIPPED_DIRS.flatMap((dir) => walk(join(siteRoot, dir)));

  it("scans the files it is about to check", () => {
    expect(files.length).toBeGreaterThan(100);
    expect(files.some((file) => file.endsWith("llms.txt"))).toBe(true);
    expect(files.some((file) => file.endsWith("agent.json"))).toBe(true);
  });

  for (const [pattern, why] of FALSE_CLAIMS) {
    it(`no shipped file says ${pattern} (${why})`, () => {
      const offenders = files.filter((file) => pattern.test(readFileSync(file, "utf8")));

      expect(offenders.map((file) => file.slice(siteRoot.length + 1))).toEqual([]);
    });
  }
});

/**
 * Every number the site quotes has one owner in apps/server. The site cannot import the
 * services that hold them (they pull in the server config and Prisma), so the constants are
 * read out of the source text with regexes anchored on the declarations. The affiliate
 * constants file is dependency-free and is imported directly.
 */
describe("the numbers on the site match the server's constants", () => {
  const serverServices = join(siteRoot, "..", "server", "src", "services");
  const readServer = (name: string) => readFileSync(join(serverServices, name), "utf8");

  const catalog = readServer("productCatalog.ts");
  const quota = readServer("ats/quota.ts");
  const importQuota = readServer("profileImportQuotaService.ts");

  const numbers = (source: string, pattern: RegExp, label: string) => {
    const match = pattern.exec(source);

    expect(match, `${label} not found in the server source; update the regex`).toBeTruthy();

    return match!.slice(1).map((value) => Number(value.replace(/_/g, "")));
  };

  const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  it("pricing.md quotes every catalog price", () => {
    const bundle = numbers(
      catalog,
      /prices: \{ one_day: ([\d_]+), seven_day: ([\d_]+), monthly: ([\d_]+), annual: ([\d_]+) \}/,
      "bundle prices",
    );
    const pro = numbers(
      catalog,
      /name: "Creator Pro",[\s\S]*?prices: \{ monthly: ([\d_]+), annual: ([\d_]+) \}/,
      "Creator Pro prices",
    );
    const ai = numbers(
      catalog,
      /name: "AI Credits",[\s\S]*?prices: \{ monthly: ([\d_]+), annual: ([\d_]+) \}/,
      "AI Credits prices",
    );

    for (const cents of [...bundle, ...pro, ...ai]) expect(pricingMd).toContain(dollars(cents));

    // llms.txt carries the headline prices only.
    for (const cents of [...bundle, pro[0]!, ai[0]!]) expect(llmsTxt).toContain(dollars(cents));
  });

  it("pricing.md and llms.txt quote the credit packs and their expiry", () => {
    const packs = [...catalog.matchAll(/credits: (\d+),\s*expiresInDays: (\d+)/g)];

    expect(packs.length).toBe(2);

    for (const [, credits, days] of packs) {
      expect(pricingMd).toContain(`${credits} AI Credits`);
      expect(pricingMd).toContain(`${days} days`);
      expect(llmsTxt).toContain(`${credits} credits`);
    }
  });

  it("the FAQ and the ATS tier card quote the scan quotas", async () => {
    const [anonymousHours] = numbers(
      quota,
      /ANONYMOUS_WINDOW_SECONDS = (\d+) \* 60 \* 60/,
      "anonymous window",
    );
    const [freeHours] = numbers(quota, /FREE_WINDOW_SECONDS = (\d+) \* 60 \* 60/, "free window");
    const [paidLimit] = numbers(quota, /PAID_LIMIT = (\d+)/, "paid scan limit");
    const [anonymousExtract] = numbers(
      quota,
      /ANONYMOUS_EXTRACT_LIMIT = (\d+)/,
      "anonymous extract limit",
    );
    const [freeExtract] = numbers(quota, /FREE_EXTRACT_LIMIT = (\d+)/, "free extract limit");

    const { faqs } = await import("@/features/faq/data/faqItems");
    const answer = faqs.find((faq) => faq.id === "ats-checker-limits")!.answer;

    expect(answer).toContain(`every ${freeHours} hours`);
    expect(answer).toContain(`every ${anonymousHours} hours`);
    expect(answer).toContain(`${paidLimit} scans`);
    expect(answer).toContain(
      `(${anonymousExtract} for visitors, ${freeExtract} for free accounts)`,
    );

    const { ATS_TIERS } = await import("@/features/ats-checker/data/pricingTiers");
    const paidTier = ATS_TIERS.find((tier) => tier.name === "AI plan")!;

    expect(paidTier.note).toContain(`${paidLimit} scans`);
  });

  it("affiliate rates and the payout minimum match the server", async () => {
    const { AFFILIATE_TIERS, AFFILIATE_MINIMUM_WITHDRAWAL_CENTS } =
      await import("../../../server/src/services/affiliate/constants");

    const rates = AFFILIATE_TIERS.map((tier) => `${tier.rateBps / 100}%`);

    for (const rate of rates) expect(llmsTxt).toContain(rate);

    const { faqs } = await import("@/features/faq/data/faqItems");
    const answer = faqs.find((faq) => faq.id === "affiliate-ambassador-programs")!.answer;

    expect(answer).toContain(`${rates[0]} to ${rates[rates.length - 1]}`);
    expect(answer).toContain(dollars(AFFILIATE_MINIMUM_WITHDRAWAL_CENTS).replace(".00", ""));
  });

  it("pricing.md quotes the paid GitHub import limit", () => {
    const [limit] = numbers(
      importQuota,
      /PAID_GITHUB_IMPORT_DAILY_LIMIT = (\d+)/,
      "paid GitHub import limit",
    );

    expect(pricingMd).toContain(`${limit} GitHub imports a day`);
  });
});

describe("the machine-readable files state that payments are closed (W-022)", () => {
  // pricing/page.tsx hard-codes PAYMENTS_BLOCKED = true and shows a notice; an agent reading
  // pricing.md or llms.txt must see the same thing, or it will recommend a plan nobody can buy.
  const pageSource = readFileSync(
    join(siteRoot, "app", "(marketing)", "pricing", "page.tsx"),
    "utf8",
  );
  const blocked = /const PAYMENTS_BLOCKED = true/.test(pageSource);

  it.skipIf(!blocked)("pricing.md and llms.txt carry the notice", () => {
    expect(pricingMd).toMatch(/payments are currently closed/i);
    expect(llmsTxt).toMatch(/payments are currently closed/i);
  });

  it.skipIf(blocked)("pricing.md and llms.txt no longer carry the notice", () => {
    expect(pricingMd).not.toMatch(/payments are currently closed/i);
    expect(llmsTxt).not.toMatch(/payments are currently closed/i);
  });
});

describe("structured-data inputs match their sources", () => {
  const catalog = readFileSync(
    join(siteRoot, "..", "server", "src", "services", "productCatalog.ts"),
    "utf8",
  );

  it("the pricing page lists exactly the catalog prices", async () => {
    const { PRICING_OFFERS } = await import("@/features/pricing/data/offers");

    const onPage = new Set(PRICING_OFFERS.map((offer) => Math.round(offer.price * 100)));
    const inCatalog = new Set(
      [...catalog.matchAll(/prices: \{([^}]*)\}/g)].flatMap((match) =>
        [...match[1]!.matchAll(/: ([\d_]+)/g)].map((m) => Number(m[1]!.replace(/_/g, ""))),
      ),
    );

    expect(inCatalog.size).toBeGreaterThan(5);

    for (const cents of inCatalog)
      expect(onPage, `${cents} cents missing on the page`).toContain(cents);
    for (const cents of onPage)
      if (cents !== 0) expect(inCatalog, `${cents} cents is not in the catalog`).toContain(cents);
  });

  it("the template share-image sizes match the files on disk", async () => {
    const sharp = (await import("sharp")).default;
    const { PREVIEW_SIZES } = await import("@/features/templates/data/previewSizes");
    const { templateSummaries } = await import("@/config/templates");

    for (const template of templateSummaries) {
      if (!template.previewImage.endsWith(".png")) continue;

      const { width, height } = await sharp(join(publicDir, template.previewImage)).metadata();

      expect(PREVIEW_SIZES[template.previewImage], template.previewImage).toEqual({
        width,
        height,
      });
    }
  });
});
