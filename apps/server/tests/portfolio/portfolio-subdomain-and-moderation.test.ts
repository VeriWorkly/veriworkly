import { describe, expect, it, vi } from "vitest";

vi.mock("#lib/cacheGeneration", () => ({
  resolveGenerationalKey: vi.fn(async (namespace: string, ...parts: string[]) =>
    [namespace, "g7", ...parts].join(":"),
  ),
  bumpGeneration: vi.fn(async () => undefined),
}));

import {
  normalizePortfolioSubdomain,
  portfolioSubdomainLookupKey,
  RESERVED_SUBDOMAINS,
} from "../../src/utils/slugs.js";
import {
  publicPortfolioCacheKey,
  publicPortfolioListCacheKey,
} from "../../src/utils/portfolioPublicationCache.js";
import {
  isModerationLocked,
  MODERATION_SUSPENSION_PREFIX,
} from "../../src/services/portfolioService.js";

describe("normalizePortfolioSubdomain", () => {
  it("normalises the usual way", () => {
    expect(normalizePortfolioSubdomain(" Gautam_Raj ")).toBe("gautam-raj");
  });

  it("strips a dash left behind by the 63-character cut", () => {
    expect(normalizePortfolioSubdomain(`${"a".repeat(62)}-tail`)).toBe("a".repeat(62));
  });

  it("rejects reserved names, punycode and empty input", () => {
    for (const name of ["list", "mail", "status", "cdn", "dev", "help", "admin", "www"]) {
      expect(RESERVED_SUBDOMAINS.has(name), name).toBe(true);
      expect(normalizePortfolioSubdomain(name), name).toBeNull();
    }
    expect(normalizePortfolioSubdomain("xn--pple-43d")).toBeNull();
    expect(normalizePortfolioSubdomain("---")).toBeNull();
    expect(normalizePortfolioSubdomain("")).toBeNull();
  });

  it("keeps a name the user already holds, even when it is reserved or ends in a dash", () => {
    expect(normalizePortfolioSubdomain("dev", ["dev"])).toBe("dev");
    expect(normalizePortfolioSubdomain(" Dev ", new Set(["dev"]))).toBe("dev");
    expect(normalizePortfolioSubdomain(`${"a".repeat(62)}-x`, [`${"a".repeat(62)}-`])).toBe(
      `${"a".repeat(62)}-`,
    );
    expect(normalizePortfolioSubdomain("dev", ["other"])).toBeNull();
  });

  it("the lookup key is the stored form: no reserved check, no dash strip", () => {
    expect(portfolioSubdomainLookupKey("dev")).toBe("dev");
    expect(portfolioSubdomainLookupKey("xn--pple-43d")).toBe("xn-pple-43d");
    expect(portfolioSubdomainLookupKey("---")).toBe("");
  });
});

describe("public cache keys", () => {
  it("keeps the list and a site called 'list' in separate namespaces", async () => {
    const listKey = await publicPortfolioListCacheKey();
    expect(listKey).not.toBe(publicPortfolioCacheKey("list"));
    expect(publicPortfolioCacheKey("list").startsWith(listKey!)).toBe(false);
    expect(await publicPortfolioListCacheKey(10, 20)).toBe("portfolio:public:list:g7:10:20");
  });
});

describe("isModerationLocked", () => {
  it("locks only a SUSPENDED row with a non-billing, non-user reason", () => {
    expect(
      isModerationLocked({
        status: "SUSPENDED",
        suspensionReason: `${MODERATION_SUSPENSION_PREFIX}spam`,
      }),
    ).toBe(true);
    expect(isModerationLocked({ status: "SUSPENDED", suspensionReason: "legacy free text" })).toBe(
      true,
    );
    expect(isModerationLocked({ status: "SUSPENDED", suspensionReason: "user_unpublished" })).toBe(
      false,
    );
    expect(isModerationLocked({ status: "SUSPENDED", suspensionReason: "CANCELED" })).toBe(false);
    expect(isModerationLocked({ status: "SUSPENDED", suspensionReason: "grace_expired" })).toBe(
      false,
    );
    expect(isModerationLocked({ status: "SUSPENDED", suspensionReason: null })).toBe(false);
    expect(isModerationLocked({ status: "LIVE", suspensionReason: "moderation:x" })).toBe(false);
  });
});
