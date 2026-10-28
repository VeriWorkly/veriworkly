import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

import { buildLlmsFull, buildLlmsIndex } from "@/lib/llms";

import { appRoot } from "./support/collections";

/**
 * Keeps prices, credit amounts, quotas and plan claims in everything the blog ships tied to the
 * server, which owns them. Server values are read from source text with anchored regexes: the
 * services import server config and Prisma.
 */

// CLAIMS_SERVER_SRC points the test at an edited copy, to prove a server change fails it.
const serverSrc = process.env.CLAIMS_SERVER_SRC ?? join(appRoot, "..", "server", "src");
const readServer = (path: string) => readFileSync(join(serverSrc, path), "utf8");

function capture(source: string, pattern: RegExp, label: string): string[] {
  const match = pattern.exec(source);

  if (!match)
    throw new Error(`${label} not found in the server source; update the regex in claims.test.ts`);

  return match.slice(1);
}

const toNumber = (value: string) => Number(value.replace(/[_,]/g, ""));
const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const catalog = readServer("services/productCatalog.ts");
const names = readServer("services/productNames.ts");
const config = readServer("config.ts");
const quota = readServer("services/ats/quota.ts");
const share = readServer("services/shareService.ts");
const affiliate = readServer("services/affiliate/constants.ts");
const importQuota = readServer("services/profileImportQuotaService.ts");

const entry = (key: string) =>
  capture(
    catalog,
    new RegExp(`\\n  ${key}: \\{([\\s\\S]*?)\\n  \\},`),
    `the ${key} catalog entry`,
  )[0]!;

const pricesOf = (key: string) =>
  Object.fromEntries(
    [
      ...capture(entry(key), /prices: \{([^}]*)\}/, `${key} prices`)[0]!.matchAll(
        /(\w+): ([\d_]+)/g,
      ),
    ].map(([, interval, cents]) => [interval!, toNumber(cents!)]),
  ) as Record<string, number>;

const allowanceOf = (key: string) =>
  Object.fromEntries(
    [
      ...capture(
        entry(key),
        /creditAllowance: \{([^}]*)\}/,
        `${key} credit allowance`,
      )[0]!.matchAll(/(\w+): ([\w_ *]+)/g),
    ].map(([, interval, value]) => [interval!, value!.trim()]),
  ) as Record<string, string>;

const nameOf = (table: string, key: string) =>
  capture(names, new RegExp(`${table} = \\{[\\s\\S]*?\\b${key}: "([^"]+)"`), `${table}.${key}`)[0]!;

const SERVER = (() => {
  const ai = pricesOf("ai_credits");
  const pro = pricesOf("portfolio_pro");
  const bundle = pricesOf("bundle");
  const bundleAllowance = allowanceOf("bundle");
  const [monthlyGrant] = capture(
    catalog,
    /ANNUAL_MONTHLY_CREDITS = ([\d_]+);/,
    "monthly grant",
  ).map(toNumber);

  const packs = [
    ...catalog.matchAll(/credit_pack_(\d+): \{[\s\S]*?credits: (\d+),\s*expiresInDays: (\d+),/g),
  ].map(([, key, credits, days]) => {
    const [cents] = capture(
      config,
      new RegExp(`CREDIT_PACK_${key}_PRICE_CENTS, (\\d+)\\)`),
      `the ${key} pack's default price`,
    ).map(toNumber);

    return { credits: Number(credits), days: Number(days), cents: cents! };
  });

  if (packs.length < 3)
    throw new Error("credit packs not found in productCatalog.ts; update the regex");

  const [anonymousHours] = capture(
    quota,
    /ANONYMOUS_WINDOW_SECONDS = (\d+) \* 60 \* 60/,
    "anonymous window",
  ).map(toNumber);
  const [freeHours] = capture(quota, /FREE_WINDOW_SECONDS = (\d+) \* 60 \* 60/, "free window").map(
    toNumber,
  );
  const [paidLimit] = capture(quota, /PAID_LIMIT = (\d+);/, "paid scan limit").map(toNumber);
  const [freeLimit, anonymousLimit] = capture(
    quota,
    /limit: paid \? PAID_LIMIT : userId \? (\d+) : (\d+),/,
    "free and anonymous scan limits",
  ).map(toNumber);

  const shareDays = capture(
    share,
    /SHARE_EXPIRY_DAYS = \[([\d, ]+)\] as const/,
    "share expiry options",
  )[0]!
    .split(",")
    .map(toNumber);
  const [shareDefault] = capture(
    share,
    /DEFAULT_SHARE_EXPIRY_DAYS = (\d+);/,
    "default share expiry",
  ).map(toNumber);

  const [apiKeyDefault] = capture(
    config,
    /API_KEY_DEFAULT_RATE_LIMIT, (\d+)\)/,
    "API key default rate limit",
  ).map(toNumber);
  const [apiKeyMax] = capture(
    config,
    /API_KEY_MAX_RATE_LIMIT, (\d+)\)/,
    "API key max rate limit",
  ).map(toNumber);

  const [withdrawalCents] = capture(
    affiliate,
    /AFFILIATE_MINIMUM_WITHDRAWAL_CENTS = ([\d_]+);/,
    "affiliate minimum withdrawal",
  ).map(toNumber);
  const [githubDaily] = capture(
    importQuota,
    /PAID_GITHUB_IMPORT_DAILY_LIMIT = (\d+);/,
    "paid GitHub import limit",
  ).map(toNumber);

  return {
    products: {
      [nameOf("PRODUCT_NAMES", "ai_credits")]: [ai.monthly!, ai.annual!],
      [nameOf("PRODUCT_NAMES", "portfolio_pro")]: [pro.monthly!, pro.annual!],
      [nameOf("PRODUCT_NAMES", "bundle")]: [bundle.monthly!, bundle.annual!],
      [nameOf("PASS_NAMES", "one_day")]: [bundle.one_day!],
      [nameOf("PASS_NAMES", "seven_day")]: [bundle.seven_day!],
    } as Record<string, number[]>,
    passAllowance: {
      [nameOf("PASS_NAMES", "one_day")]: toNumber(bundleAllowance.one_day!),
      [nameOf("PASS_NAMES", "seven_day")]: toNumber(bundleAllowance.seven_day!),
    } as Record<string, number>,
    catalogCents: new Set([
      ...Object.values(ai),
      ...Object.values(pro),
      ...Object.values(bundle),
      ...packs.map((p) => p.cents),
    ]),
    monthlyGrant: monthlyGrant!,
    packs,
    scans: {
      anonymousLimit: anonymousLimit!,
      anonymousHours: anonymousHours!,
      freeLimit: freeLimit!,
      freeHours: freeHours!,
      paidLimit: paidLimit!,
    },
    shareDays,
    shareDefault: shareDefault!,
    apiKeyLimits: new Set([apiKeyDefault!, apiKeyMax!]),
    withdrawalDollars: withdrawalCents! / 100,
    githubDaily: githubDaily!,
  };
})();

/** One shipped text: a file, or the output of a generated route. */
type Shipped = { name: string; text: string };

const SCANNED_DIRS = ["content/blog", "public", "components", "features", "app", "config"];

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const full = join(dir, item.name);

    if (item.isDirectory()) return walk(full);

    return /\.(mdx?|txt|json|tsx?)$/.test(item.name) ? [full] : [];
  });
}

const shipped: Shipped[] = [
  ...SCANNED_DIRS.flatMap((dir) => walk(join(appRoot, dir))).map((file) => ({
    name: relative(appRoot, file).replace(/\\/g, "/"),
    text: readFileSync(file, "utf8"),
  })),
];

const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 };
const count = (value: string) => NUMBER_WORDS[value.toLowerCase()] ?? toNumber(value);

/** Lines, with YAML folded-block continuations joined so a frontmatter answer reads as one segment. */
const segmentsOf = (text: string) => text.replace(/\n {4,}(?=\S)/g, " ").split(/\r?\n/);

/**
 * Third-party prices and trials, allowed only on these lines and never on a line that mentions
 * VeriWorkly or speaks for us. Every entry must still match a line, so a stale one fails.
 */
const THIRD_PARTY_ALLOWED: { file: string; alsoIn: string[]; reason: string; lines: RegExp[] }[] = [
  {
    file: "content/blog/free-resume-builders-compared.mdx",
    // llms-full.txt reproduces the post's body.
    alsoIn: ["/llms-full.txt"],
    reason:
      "A comparison post: competitors' published prices and trials, checked on their own pages. VeriWorkly's row quotes no price.",
    lines: [
      /^\| \[Teal\]\(/,
      /^\| \[Huntr\]\(/,
      /^\| \[Kickresume\]\(/,
      /^\| \[Novorésumé\]\(/,
      /^\| \[Zety\]\(/,
      /^\| \[Resume Genius\]\(/,
      /^\| \*\*Paywalled export\*\* +\| You build free, pay to download/,
      /^- If there is a trial, what does it renew at and how do you cancel\?$/,
      /^None of this makes these tools bad\. It makes them paid tools with a free trial\./,
    ],
  },
];

const SPEAKS_FOR_US = /veriworkly|\bour\b|\bours\b|\bwe\b|\bus\b/i;

function allowedThirdParty(name: string, segment: string): boolean {
  if (SPEAKS_FOR_US.test(segment)) return false;

  return THIRD_PARTY_ALLOWED.some(
    (entry) =>
      (entry.file === name || entry.alsoIn.includes(name)) &&
      entry.lines.some((line) => line.test(segment)),
  );
}

type Rule = {
  why: string;
  check: (segment: string) => string | null;
  thirdPartyMayQuote?: boolean;
};

/** Dollar amounts that read as a price: with cents, or with a billing period. Not "$2M" or "$340K". */
const PRICE =
  /\$(\d{1,3}(?:,\d{3})*|\d+)(\.\d{2})?(?![\d.]?\d|[kKmMbB])(\s*(?:\/|a|per|every|for)\s*(?:\d+\s+|a\s+|one\s+)?(?:day|week|month|year|mo|yr)s?\b|\s+(?:monthly|yearly|annually|one-time)\b)?/g;

function pricesIn(segment: string): number[] {
  return [...segment.matchAll(PRICE)]
    .filter(([, , cents, period]) => cents || period)
    .map(([, whole, cents]) =>
      Math.round(toNumber(whole!) * 100 + (cents ? Number(cents.slice(1)) : 0)),
    );
}

const forbid = (pattern: RegExp, why: string, thirdPartyMayQuote = false): Rule => ({
  why,
  thirdPartyMayQuote,
  check: (segment) => pattern.exec(segment)?.[0] ?? null,
});

const RULES: Rule[] = [
  {
    why: "every price is a server catalog price or credit-pack default",
    thirdPartyMayQuote: true,
    check: (segment) => {
      const unknown = pricesIn(segment).filter((cents) => !SERVER.catalogCents.has(cents));
      return unknown.length
        ? `price ${unknown.map(dollars).join(", ")} is not in productCatalog.ts or config.ts`
        : null;
    },
  },
  {
    why: "a named product is quoted at its own price",
    check: (segment) => {
      const named = Object.keys(SERVER.products).filter((name) => segment.includes(name));
      const packs = SERVER.packs.filter((pack) =>
        new RegExp(
          `\\b${pack.credits.toLocaleString("en")}(?: extra)? credits?\\b[^.]{0,40}\\bpack|\\bpack[^.]{0,40}\\b${pack.credits.toLocaleString("en")}(?: extra)? credits`,
        ).test(segment),
      );
      if (named.length === 0 && packs.length === 0) return null;

      const allowed = new Set([
        ...named.flatMap((name) => SERVER.products[name]!),
        ...packs.map((pack) => pack.cents),
      ]);
      const wrong = pricesIn(segment).filter((cents) => !allowed.has(cents));

      return wrong.length
        ? `${[...named, ...packs.map((p) => `${p.credits} pack`)].join(" / ")} quoted at ${wrong.map(dollars).join(", ")}`
        : null;
    },
  },
  forbid(
    /\$(?:59\.9[09]|99\.99|143\.99|8\.33)\b/,
    "old prices: annual plans are $59.88, $95.88, $143.88",
  ),
  forbid(
    /\bAI Standalone\b|\bPortfolio Pro\b|\bAI Credits Standalone\b/i,
    "old product names: productNames.ts is the naming table",
  ),
  forbid(
    /\bfree trials?\b|\b\d+-day trials?\b|\btrial periods?\b|(?<!controlled |clinical |field |randomi[sz]ed )\btrials?\b/i,
    "VeriWorkly has no trials: passes, subscriptions and packs are paid up front",
    true,
  ),
  forbid(
    /\b12,?000 (?:AI )?credits\b/i,
    "annual plans grant 1,000 credits each month, not 12,000 up front",
  ),
  forbid(
    /\b(?:credits?|they|balances?)\s+(?:will\s+|can\s+|do\s+)?(?:roll|carry)\s+(?:over|forward)\b|\bcredit rollover\b|\brollover credits\b/i,
    "subscription credits reset monthly and never roll over",
  ),
  forbid(/100% free,? forever/i, "premium templates and AI credits are paid"),
  forbid(/all templates (?:are )?free/i, "Nimbus and Cipher are premium templates"),
  forbid(
    /custom domains? (?:are |is )?(?:supported|included|available)|(?<!not |n't )(?:supports?|offers?|includes?) custom domains?|(?:connect|bring|use) your own domain to (?:your )?(?:veriworkly|portfolio)/i,
    "portfolios do not support custom domains",
  ),
  {
    why: "pass credit allowances match productCatalog.ts",
    check: (segment) => {
      for (const [pass, credits] of Object.entries(SERVER.passAllowance)) {
        const quoted = new RegExp(
          `([\\d,]+) (?:credits )?with the ${pass}|${pass}[^.]{0,30}?\\b([\\d,]+) credits`,
        ).exec(segment);
        if (quoted && count(quoted[1] ?? quoted[2]!) !== credits)
          return `${pass} quoted at ${quoted[0]}, server grants ${credits}`;
      }
      return null;
    },
  },
  {
    why: "credit pack sizes and validity match productCatalog.ts",
    check: (segment) => {
      if (!/\bpacks?\b/i.test(segment)) return null;

      const sizes = new Set(SERVER.packs.map((pack) => pack.credits));
      const list = /((?:[\d,]+, )*[\d,]+,? (?:or|and) [\d,]+) credits/.exec(segment);
      if (list) {
        const quoted = list[1]!.split(/,? (?:or|and) |, /).map(count);
        if (quoted.some((n) => !sizes.has(n)) || quoted.length !== sizes.size)
          return `packs quoted as ${list[0]}, server sells ${[...sizes].join(", ")} credits`;
      }

      const days = /valid for (\d+) days|expires? after (\d+) days/.exec(segment);
      if (days && SERVER.packs.some((pack) => pack.days !== Number(days[1] ?? days[2])))
        return `packs quoted as ${days[0]}, server packs last ${SERVER.packs[0]!.days} days`;

      return null;
    },
  },
  {
    why: "the monthly subscription grant matches productCatalog.ts",
    check: (segment) => {
      const grant = /([\d,]+) (?:AI )?credits (?:each|a|per|every) month/i.exec(segment);
      return grant && count(grant[1]!) !== SERVER.monthlyGrant
        ? `${grant[0]}, server grants ${SERVER.monthlyGrant}`
        : null;
    },
  },
  {
    why: "every quoted credit amount is one the server grants",
    check: (segment) => {
      const known = new Set([
        SERVER.monthlyGrant,
        ...Object.values(SERVER.passAllowance),
        ...SERVER.packs.map((pack) => pack.credits),
      ]);
      const unknown = [
        ...segment.matchAll(/(?<![\d,.])(\d{1,3}(?:,\d{3})+|\d{2,}) (?:extra |AI )?credits\b/g),
      ].filter(([, n]) => !known.has(count(n!)));
      return unknown.length
        ? `${unknown.map((m) => m[0]).join(", ")} is not a server credit amount`
        : null;
    },
  },
  {
    why: "ATS scan quotas match services/ats/quota.ts",
    check: (segment) => {
      const { anonymousLimit, anonymousHours, freeLimit, freeHours, paidLimit } = SERVER.scans;

      for (const match of segment.matchAll(/\b(\w+) scans? (?:every|\/|per) (\d+) hours\b/gi)) {
        const pair = `${count(match[1]!)}/${match[2]}`;
        if (pair !== `${anonymousLimit}/${anonymousHours}` && pair !== `${freeLimit}/${freeHours}`)
          return `"${match[0]}" is neither ${anonymousLimit}/${anonymousHours} h (anonymous) nor ${freeLimit}/${freeHours} h (free)`;
      }

      const daily = /\b(\w+) (?:scans? )?(?:a|per) day (?:with a free account|signed in)/i.exec(
        segment,
      );
      if (daily && count(daily[1]!) * (24 / freeHours) !== freeLimit)
        return `"${daily[0]}", free accounts get ${freeLimit} per ${freeHours} h`;

      const paid = /\b(\d+) scans (?:a|per) (?:month|billing)/i.exec(segment);
      if (paid && Number(paid[1]) !== paidLimit)
        return `"${paid[0]}", paid accounts get ${paidLimit}`;

      return null;
    },
  },
  {
    why: "share-link expiry options and default match services/shareService.ts",
    check: (segment) => {
      const options = /expire (?:after|in) ((?:\d+, )*\d+,? or \d+) days(,? or never)?/i.exec(
        segment,
      );
      if (options) {
        const quoted = options[1]!.split(/,? or |, /).map(Number);
        if (quoted.join(",") !== SERVER.shareDays.join(",") || !options[2])
          return `"${options[0]}", server offers ${SERVER.shareDays.join(", ")} days or never`;
      }

      const fallback = /default is (\d+) days/i.exec(segment);
      if (fallback && /\blinks?\b/i.test(segment) && Number(fallback[1]) !== SERVER.shareDefault)
        return `"${fallback[0]}", server default is ${SERVER.shareDefault} days`;

      return null;
    },
  },
  {
    why: "API key rate limits match the config defaults",
    check: (segment) => {
      if (!/\bAPI keys?\b/i.test(segment)) return null;
      const limit = /(\d+) requests? (?:a|per|\/) ?minute/i.exec(segment);
      return limit && !SERVER.apiKeyLimits.has(Number(limit[1]))
        ? `"${limit[0]}", config allows ${[...SERVER.apiKeyLimits].join(" (default) or ")} (max)`
        : null;
    },
  },
  {
    why: "the affiliate withdrawal minimum matches affiliate/constants.ts",
    check: (segment) => {
      const minimum =
        /at least \$(\d+)[^.]{0,40}withdraw|minimum (?:withdrawal|payout)[^.$]{0,20}\$(\d+)/i.exec(
          segment,
        );
      return minimum && Number(minimum[1] ?? minimum[2]) !== SERVER.withdrawalDollars
        ? `"${minimum[0]}", server minimum is $${SERVER.withdrawalDollars}`
        : null;
    },
  },
  {
    why: "the paid GitHub import cap matches profileImportQuotaService.ts",
    check: (segment) => {
      const cap = /(?:GitHub )?imports? (?:are |is )?capped at (\d+) a day/i.exec(segment);
      return cap && Number(cap[1]) !== SERVER.githubDaily
        ? `"${cap[0]}", server cap is ${SERVER.githubDaily}`
        : null;
    },
  },
];

function offendersIn(files: Shipped[]): string[] {
  const offenders: string[] = [];

  for (const { name, text } of files) {
    segmentsOf(text).forEach((segment) => {
      for (const rule of RULES) {
        const problem = rule.check(segment);
        if (!problem) continue;
        if (rule.thirdPartyMayQuote && allowedThirdParty(name, segment)) continue;

        offenders.push(`${name}: ${problem} (${rule.why}) in: ${segment.trim().slice(0, 160)}`);
      }
    });
  }

  return offenders;
}

describe("claims in everything the blog ships match the server", () => {
  it("reads the server values it checks against", () => {
    expect(SERVER.catalogCents.size).toBeGreaterThan(5);
    expect(SERVER.packs).toHaveLength(3);
    expect(Object.keys(SERVER.products)).toHaveLength(5);
    expect(SERVER.shareDays.length).toBeGreaterThan(1);
  });

  it("scans the files it is about to check", () => {
    const names = shipped.map((file) => file.name);

    expect(names.filter((name) => name.startsWith("content/blog/")).length).toBeGreaterThan(10);
    for (const required of [
      "content/blog/free-resume-builders-compared.mdx",
      "public/pricing.md",
      "public/.well-known/agent.json",
      "components/layout/Footer.tsx",
      "features/landing/components/BlogHero.tsx",
      "app/[slug]/page.tsx",
    ])
      expect(names).toContain(required);
  });

  it("no shipped file makes a claim the server contradicts", () => {
    expect(offendersIn(shipped)).toEqual([]);
  });

  it("the generated llms.txt and llms-full.txt make no such claim", async () => {
    const generated = [
      { name: "/llms.txt", text: buildLlmsIndex() },
      { name: "/llms-full.txt", text: await buildLlmsFull() },
    ];

    expect(offendersIn(generated)).toEqual([]);
  });

  it("every third-party allowance still matches a line, so none outlives its text", () => {
    for (const entry of THIRD_PARTY_ALLOWED) {
      const file = shipped.find((item) => item.name === entry.file);
      expect(file, `${entry.file} is allow-listed but no longer exists`).toBeDefined();

      const segments = segmentsOf(file!.text);
      for (const line of entry.lines)
        expect(
          segments.some((segment) => line.test(segment)),
          `${entry.file}: ${line} matches nothing`,
        ).toBe(true);
    }
  });

  it("the allowance never covers a line about VeriWorkly", () => {
    const own =
      "| [VeriWorkly](https://veriworkly.com) | Yes | One resume. | Pro is $13 every 7 days, with a free trial. |";

    expect(
      offendersIn([{ name: "content/blog/free-resume-builders-compared.mdx", text: own }]),
    ).toHaveLength(2);
  });
});
