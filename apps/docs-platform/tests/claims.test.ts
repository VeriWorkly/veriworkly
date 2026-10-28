import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { GET as agentCard } from "@/app/.well-known/agent.json/route";

import {
  appRoot,
  frontmatter,
  llmsIndexText,
  rel,
  serverMatch,
  serverNumbers,
  serverSource,
  walk,
} from "./helpers/content";

/**
 * Every price, credit amount, quota and limit the docs quote is checked against the server
 * constants that own it, and the claims the audits found false stay out.
 */

type Shipped = { name: string; text: string };

function shippedFiles(card: string): Shipped[] {
  const read = (file: string): Shipped => ({
    name: rel(file),
    text: fs.readFileSync(file, "utf8"),
  });
  const apiDir = path.join(appRoot, "content", "api-reference");

  return [
    ...walk(path.join(appRoot, "content", "docs"), /\.mdx?$/).map(read),
    // Operation pages are generated from the spec; the index and the overviews are hand-written.
    ...walk(apiDir, /\.mdx?$/)
      .filter((file) => !frontmatter(file)._openapi)
      .map(read),
    ...walk(path.join(appRoot, "public"), /\.(md|txt|json)$/)
      .filter((file) => !/[\\/]openapi\.json$/.test(file))
      .map(read),
    ...walk(path.join(appRoot, "features"), /\.tsx?$/).map(read),
    read(path.join(appRoot, "app", "page.tsx")),
    { name: "app/llms.txt (generated)", text: llmsIndexText() },
    { name: "app/.well-known/agent.json (generated)", text: card },
  ].map(({ name, text }) => ({ name, text: stripCode(text) }));
}

/** Fenced code is examples and shell, not claims. */
function stripCode(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/^```[\s\S]*?^```/gm, "");
}

/** Paragraphs, list items and table rows, each joined onto one line. */
function blocks(text: string) {
  return text
    .split(/\n\s*\n|\n(?=\s*(?:[-*+] |\d+\. |\||#|<))/)
    .map((block) => block.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function sentences(text: string) {
  return blocks(text).flatMap((block) => block.split(/(?<=[.!?])\s+(?=[A-Z*_`"(<])/));
}

const NEGATION = /\b(?:no|not|never|none|nothing|without|don't|doesn't|do not|does not|cannot)\b/i;

const files = shippedFiles(await agentCard().text());

const offenders = (find: (file: Shipped) => string[]) =>
  files.flatMap((file) => find(file).map((hit) => `${file.name}: ${hit}`));

// ---------------------------------------------------------------------------------------------
// The server's numbers, read from source text.
// ---------------------------------------------------------------------------------------------

const catalog = serverSource("services/productCatalog.ts");
const names = serverSource("services/productNames.ts");
const config = serverSource("config.ts");
const quota = serverSource("services/ats/quota.ts");
const share = serverSource("services/shareService.ts");
const affiliate = serverSource("services/affiliate/constants.ts");
const apiKeyLimiter = serverSource("middleware/apiKeyRateLimit.ts");

const productName = (key: string) => {
  const match = new RegExp(`\\b${key}: "([^"]+)"`).exec(names);
  if (!match) throw new Error(`productNames.ts has no "${key}" name; update this test.`);
  return match[1]!;
};

const [aiMonthly, aiAnnual] = serverNumbers(
  catalog,
  /\bai_credits: \{[\s\S]*?prices: \{ monthly: ([\d_]+), annual: ([\d_]+) \}/,
  "AI Credits prices",
) as [number, number];
const [proMonthly, proAnnual] = serverNumbers(
  catalog,
  /\bportfolio_pro: \{[\s\S]*?prices: \{ monthly: ([\d_]+), annual: ([\d_]+) \}/,
  "Creator Pro prices",
) as [number, number];
const [oneDay, sevenDay, bundleMonthly, bundleAnnual] = serverNumbers(
  catalog,
  /\bbundle: \{[\s\S]*?prices: \{ one_day: ([\d_]+), seven_day: ([\d_]+), monthly: ([\d_]+), annual: ([\d_]+) \}/,
  "Job Hunter Bundle prices",
) as [number, number, number, number];
const [oneDayCredits, sevenDayCredits, monthlyGrant] = serverNumbers(
  catalog,
  /\bbundle: \{[\s\S]*?creditAllowance: \{\s*one_day: ([\d_]+),\s*seven_day: ([\d_]+),\s*monthly: ([\d_]+),/,
  "bundle credit allowances",
) as [number, number, number];
const [aiMonthlyGrant] = serverNumbers(
  catalog,
  /\bai_credits: \{[\s\S]*?creditAllowance: \{ monthly: ([\d_]+),/,
  "AI Credits monthly grant",
);
const [annualMonthlyGrant] = serverNumbers(
  catalog,
  /ANNUAL_MONTHLY_CREDITS = ([\d_]+);/,
  "annual monthly grant",
);

const packs = [
  ...catalog.matchAll(/(credit_pack_\d+): \{[\s\S]*?credits: (\d+),\s*expiresInDays: (\d+)/g),
].map(([, key, credits, days]) => {
  const [cents] = serverNumbers(
    config,
    new RegExp(`CREDIT_PACK_${credits}_PRICE_CENTS, (\\d+)\\)`),
    `the ${credits} pack's default price`,
  );
  return { name: productName(key!), credits: Number(credits), days: Number(days), cents: cents! };
});

const [minWithdrawal] = serverNumbers(
  affiliate,
  /AFFILIATE_MINIMUM_WITHDRAWAL_CENTS = ([\d_]+);/,
  "affiliate minimum withdrawal",
);

const perMonth = (annual: number) => Math.round(annual / 12);

type Product = { name: string; cents: number[]; credits?: number };

const PRODUCTS: Product[] = [
  { name: productName("ai_credits"), cents: [aiMonthly, aiAnnual, perMonth(aiAnnual)] },
  { name: productName("portfolio_pro"), cents: [proMonthly, proAnnual, perMonth(proAnnual)] },
  {
    name: productName("bundle"),
    cents: [bundleMonthly, bundleAnnual, perMonth(bundleAnnual)],
  },
  { name: productName("one_day"), cents: [oneDay], credits: oneDayCredits },
  { name: productName("seven_day"), cents: [sevenDay], credits: sevenDayCredits },
  ...packs.map((pack) => ({ name: pack.name, cents: [pack.cents], credits: pack.credits })),
];

const cents = (amount: string) => Math.round(Number(amount.replace(/,/g, "")) * 100);
const dollars = (value: number) => `$${(value / 100).toFixed(2)}`;
const amounts = (text: string) =>
  [...text.matchAll(/\$(\d[\d,]*(?:\.\d{2})?)\b/g)].map((m) => m[1]!);

describe("the claims test reads its inputs", () => {
  it("scans the shipped files, including the generated llms.txt", () => {
    expect(files.length).toBeGreaterThan(60);
    for (const name of [
      "public/pricing.md",
      "app/.well-known/agent.json (generated)",
      "app/llms.txt (generated)",
    ])
      expect(files.map((file) => file.name)).toContain(name);
    expect(files.some((file) => file.name === "content/api-reference/billing/overview.mdx")).toBe(
      true,
    );
    expect(files.some((file) => /api-reference\/api-keys\/createApiKey/.test(file.name))).toBe(
      false,
    );
  });

  it("reads every catalog product from the server", () => {
    expect(PRODUCTS.map((product) => product.name)).toEqual([
      "AI Credits",
      "Creator Pro",
      "Job Hunter Bundle",
      "3-Day Sprint Pass",
      "7-Day Hunt Pass",
      "250 extra credits",
      "500 extra credits",
      "1,200 extra credits",
    ]);
  });
});

describe("prices", () => {
  const allowed = new Set([...PRODUCTS.flatMap((product) => product.cents), minWithdrawal!]);

  it("every dollar amount is a catalog price, an annual plan's monthly rate or the payout minimum", () => {
    expect(
      offenders((file) => amounts(file.text).filter((amount) => !allowed.has(cents(amount)))),
    ).toEqual([]);
  });

  it("every price quoted next to a product name is that product's price", () => {
    // Pack names are matched loosely ("250 credits $2.99") as well as by their catalog name.
    const namePatterns = PRODUCTS.map((product) => ({
      product,
      pattern: new RegExp(
        product.name.replace(/ extra credits$/, "(?: extra)? credits").replace(/[.]/g, "\\."),
        "g",
      ),
    }));

    expect(
      offenders((file) =>
        blocks(file.text).flatMap((block) => {
          const marks = namePatterns
            .flatMap(({ product, pattern }) =>
              [...block.matchAll(pattern)].map((m) => ({
                product,
                at: m.index!,
                end: m.index! + m[0].length,
              })),
            )
            .sort((a, b) => a.at - b.at);

          return marks.flatMap((mark, i) => {
            const segment = block.slice(mark.end, marks[i + 1]?.at ?? block.length);
            return amounts(segment)
              .filter((amount) => !mark.product.cents.includes(cents(amount)))
              .map((amount) => `${mark.product.name} quoted at $${amount}`);
          });
        }),
      ),
    ).toEqual([]);
  });

  it("billing-and-credits.mdx and pricing.md quote every catalog price", () => {
    for (const name of ["content/docs/product/billing-and-credits.mdx", "public/pricing.md"]) {
      const text = files.find((file) => file.name === name)!.text;
      for (const product of PRODUCTS)
        for (const value of product.cents.slice(0, 2))
          expect(text, `${name} does not quote ${product.name} at ${dollars(value)}`).toContain(
            dollars(value),
          );
    }
  });

  const OLD: [RegExp, string][] = [
    [/\$(?:59\.90|59\.99|99\.99|143\.99|8\.33)\b/, "an old annual price"],
    [/\bAI Standalone\b/i, "an old product name"],
    [
      /\bPortfolio Pro\b/i,
      "the old name of Creator Pro (the env var DODO_PAYMENTS_PORTFOLIO_PRO_* is fine)",
    ],
  ];

  for (const [pattern, why] of OLD) {
    it(`no shipped file uses ${why}: ${pattern}`, () => {
      expect(offenders((file) => file.text.match(pattern) ?? [])).toEqual([]);
    });
  }
});

describe("credit amounts", () => {
  const allowed = new Set([
    ...packs.map((pack) => pack.credits),
    oneDayCredits,
    sevenDayCredits,
    monthlyGrant,
    aiMonthlyGrant,
    annualMonthlyGrant,
  ]);

  it("every 'N credits' is a pack, a pass or the monthly grant", () => {
    expect(
      offenders((file) =>
        [...file.text.matchAll(/\b(\d{1,3}(?:,\d{3})+|\d{3,})(?: extra| AI)? credits\b/gi)]
          .map((m) => m[1]!)
          .filter((n) => !allowed.has(Number(n.replace(/,/g, ""))))
          .map((n) => `${n} credits`),
      ),
    ).toEqual([]);
  });

  it("each pass is quoted with its own credit amount", () => {
    const passes = PRODUCTS.filter((p) => p.name.endsWith("Pass"));
    expect(
      offenders((file) =>
        blocks(file.text).flatMap((block) =>
          passes.flatMap((pass) => {
            const at = block.indexOf(pass.name);
            if (at === -1) return [];
            const rest = block.slice(at + pass.name.length);
            const other = passes.find((p) => p !== pass && rest.includes(p.name));
            const segment = other ? rest.slice(0, rest.indexOf(other.name)) : rest;
            const quoted = [...segment.matchAll(/(?:\| |\b)(\d{3})(?: credits| \|)/g)].map((m) =>
              Number(m[1]),
            );
            return quoted
              .filter((n) => n !== pass.credits)
              .map((n) => `${pass.name} with ${n} credits`);
          }),
        ),
      ),
    ).toEqual([]);
  });

  it("pack validity is the catalog's", () => {
    const [days] = new Set(packs.map((pack) => pack.days));
    expect(
      offenders((file) =>
        sentences(file.text)
          .filter((s) => /\bpacks?\b/i.test(s) || /extra credits/.test(s))
          .flatMap((s) => [...s.matchAll(/(\d+) days\b/g)].map((m) => Number(m[1])))
          .filter((n) => n !== days)
          .map((n) => `${n} days`),
      ),
    ).toEqual([]);
  });
});

describe("claims that contradict the product rules", () => {
  const RULES: [string, RegExp][] = [
    ["a free trial", /free trial|\b\d+-day trial|trial period/i],
    ["annual credits granted up front", /12,000[^.]{0,40}\b(?:up ?front|at once|immediately)/i],
    ["credits that roll over", /\broll(?:s|ed)? ?over\b|\brollover\b/i],
    ["custom domains for portfolios", /custom domains?\b/i],
  ];

  for (const [what, pattern] of RULES) {
    it(`no sentence claims ${what} (negated sentences and questions are fine)`, () => {
      expect(
        offenders((file) =>
          sentences(file.text).filter(
            (s) => pattern.test(s) && !NEGATION.test(s) && !s.trim().endsWith("?"),
          ),
        ),
      ).toEqual([]);
    });
  }

  for (const pattern of [/100% free,? forever/i, /all templates (?:are )?free/i]) {
    it(`no shipped file says ${pattern}`, () => {
      expect(offenders((file) => file.text.match(pattern) ?? [])).toEqual([]);
    });
  }
});

describe("limits", () => {
  it("ATS scan quotas match ats/quota.ts", () => {
    const [anonHours] = serverNumbers(
      quota,
      /ANONYMOUS_WINDOW_SECONDS = (\d+) \* 60 \* 60;/,
      "anonymous window",
    );
    const [freeHours] = serverNumbers(
      quota,
      /FREE_WINDOW_SECONDS = (\d+) \* 60 \* 60;/,
      "free window",
    );
    const [paid] = serverNumbers(quota, /PAID_LIMIT = (\d+);/, "paid scan limit");
    const [free, anon] = serverNumbers(
      quota,
      /limit: paid \? PAID_LIMIT : userId \? (\d+) : (\d+),/,
      "free and anonymous scan limits",
    );
    const [anonExtract] = serverNumbers(
      quota,
      /ANONYMOUS_EXTRACT_LIMIT = (\d+);/,
      "anonymous upload limit",
    );
    const [freeExtract] = serverNumbers(quota, /FREE_EXTRACT_LIMIT = (\d+);/, "free upload limit");
    // Uploads (text extraction) have their own budget in the same windows.
    const allowed = new Map([
      [anonHours!, [anon!, anonExtract!]],
      [freeHours!, [free!, freeExtract!]],
    ]);
    const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
    const count = (n: string) => words[n.toLowerCase()] ?? Number(n);

    expect(
      offenders((file) => [
        ...[
          ...file.text.matchAll(
            /\b(\d+|one|two|three|four|five|six)(?: scans?| uploads?)? (?:every|\/|per) (\d+) hours\b/gi,
          ),
        ]
          .filter((m) => !allowed.get(Number(m[2]))?.includes(count(m[1]!)))
          .map((m) => m[0]),
        ...[...file.text.matchAll(/\b(\d+) scans? (?:a|per|each|every) month\b/gi)]
          .filter((m) => Number(m[1]) !== paid)
          .map((m) => m[0]),
      ]),
    ).toEqual([]);

    const faq = files.find(
      (file) => file.name === "content/docs/product/ats-checker-faq.mdx",
    )!.text;
    expect(faq).toContain(`every ${anonHours} hours`);
    expect(faq).toContain(`every ${freeHours} hours`);
  });

  it("share-link expiry options and the default match shareService.ts", () => {
    const [list] = serverMatch(
      share,
      /SHARE_EXPIRY_DAYS = \[([\d, ]+)\] as const;/,
      "share expiry options",
    );
    const options = list!.split(",").map(Number);
    const [fallback] = serverNumbers(
      share,
      /DEFAULT_SHARE_EXPIRY_DAYS = (\d+);/,
      "default share expiry",
    );

    expect(
      offenders((file) =>
        sentences(file.text)
          .filter((s) => /\blinks?\b/i.test(s) && /expir|lasts?/i.test(s))
          .flatMap((s) =>
            [...s.matchAll(/((?:\d+(?:,| or| and)?\s*)+)days?\b/g)].flatMap((m) =>
              m[1]!.match(/\d+/g)!.map(Number),
            ),
          )
          .filter((n) => !options.includes(n))
          .map((n) => `${n} days`),
      ),
    ).toEqual([]);

    for (const name of [
      "content/docs/user-guides/exporting-and-sharing.mdx",
      "content/api-reference/shares/overview.mdx",
    ]) {
      const text = files.find((file) => file.name === name)!.text.replace(/\s+/g, " ");
      for (const days of options)
        expect(text, `${name} omits ${days}`).toMatch(new RegExp(`\\b${days}\\b`));
      expect(text, `${name} omits Never`).toMatch(/\bnever\b/i);
      expect(text, `${name} does not give the default`).toMatch(
        new RegExp(`(?:after|lasts) ${fallback} days`),
      );
    }
  });

  it("API key rate limits match config.ts and the limiter's window", () => {
    const [fallback] = serverNumbers(
      config,
      /defaultRateLimit: parseIntegerEnv\(process\.env\.API_KEY_DEFAULT_RATE_LIMIT, (\d+)\)/,
      "API key default rate limit",
    );
    const [max] = serverNumbers(
      config,
      /maxRateLimit: parseIntegerEnv\(process\.env\.API_KEY_MAX_RATE_LIMIT, (\d+)\)/,
      "API key max rate limit",
    );
    const [windowMinutes] = serverNumbers(
      apiKeyLimiter,
      /const WINDOW_MS = (\d+) \* 60 \* 1000;/,
      "API key window",
    );

    const keyBlocks = (file: Shipped) =>
      blocks(file.text).filter(
        (b) =>
          /\b(?:API key|per[- ]key|each key|a key|key's)\b/i.test(b) &&
          /\brequests?\b|\blimit\b/i.test(b),
      );

    expect(
      offenders((file) =>
        keyBlocks(file).flatMap((block) => [
          ...[...block.matchAll(/\b(\d+) requests?\b|\bup to (\d+)\b|\bdefaults? to (\d+)\b/g)]
            .map((m) => Number(m[1] ?? m[2] ?? m[3]))
            .filter((n) => n !== fallback && n !== max)
            .map((n) => `key limit ${n}`),
          ...[...block.matchAll(/\b(?:per |\/ )?(\d+)[- ]min(?:ute)?s?\b/g)]
            .map((m) => Number(m[1]))
            .filter((n) => n !== windowMinutes)
            .map((n) => `key window ${n} minutes`),
          ...[...block.matchAll(/(\d+) requests?[^.|]{0,40}\bby default|defaults? to (\d+)/g)]
            .map((m) => Number(m[1] ?? m[2]))
            .filter((n) => n !== fallback)
            .map((n) => `key default ${n}`),
        ]),
      ),
    ).toEqual([]);

    const env = files.find(
      (file) => file.name === "content/docs/operations/environment-variables.mdx",
    )!.text;
    expect(env).toMatch(
      new RegExp(`\\| \`API_KEY_DEFAULT_RATE_LIMIT\` .*\\| \`${fallback}\` +\\|`),
    );
    expect(env).toMatch(new RegExp(`\\| \`API_KEY_MAX_RATE_LIMIT\` .*\\| \`${max}\` +\\|`));
  });
});
