import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(join(__dirname, "..", "..", file), "utf8");

describe("links built from backend text", () => {
  it("release notes never link to another origin through // or /\\", async () => {
    const { sanitizeUrl } =
      await import("@/features/changelog/components/detail/ChangelogRichText");

    expect(sanitizeUrl("/changelog")).toBe("/changelog");
    expect(sanitizeUrl("https://github.com/x")).toBe("https://github.com/x");
    for (const url of ["//evil.test", "/\\evil.test", "javascript:alert(1)", "data:text/html,x"])
      expect(sanitizeUrl(url), url).toBeNull();
  });

  it("httpUrl keeps only absolute http(s) URLs", async () => {
    const { httpUrl } = await import("@/utils/safe-url");

    expect(httpUrl("https://github.com/a")).toBe("https://github.com/a");
    for (const value of ["javascript:alert(1)", "data:x", "/relative", "", 42, null])
      expect(httpUrl(value), String(value)).toBeUndefined();
  });
});

describe("pricing checkout", () => {
  it("opens only an https page on the payment provider", async () => {
    const { safeCheckoutUrl } = await import("@/features/pricing/checkout-url");

    expect(safeCheckoutUrl("https://checkout.dodopayments.com/session/cks_1")).toBe(
      "https://checkout.dodopayments.com/session/cks_1",
    );
    expect(safeCheckoutUrl("https://test.checkout.dodopayments.com/session/x")).not.toBeNull();
    for (const url of [
      "http://checkout.dodopayments.com/x",
      "https://evil.test/x",
      "https://dodopayments.com.evil.test/x",
      "javascript:alert(1)",
      "/billing",
      undefined,
    ])
      expect(safeCheckoutUrl(url), String(url)).toBeNull();

    expect(source("features/pricing/PricingExperience.tsx")).toMatch(
      /const url = safeCheckoutUrl\(result\.url\);[\s\S]*window\.location\.assign\(url\)/,
    );
  });

  it("while one checkout opens, every other button is inert but keeps its label (W-102)", () => {
    const card = source("features/pricing/components/PriceCard.tsx");
    expect(card).toContain("disabled={blocked || busy}");
    expect(card).toContain('{blocked ? "Payments disabled" : `Choose ${title}`}');

    expect(
      source("features/pricing/components/PricingHero.tsx").match(/busy=\{Boolean\(loading\)\}/g),
    ).toHaveLength(3);
    for (const file of ["PricingAlaCarte.tsx", "PricingComparison.tsx"])
      expect(source(`features/pricing/components/${file}`), file).toContain(
        "disabled={paymentsBlocked || Boolean(loading)}",
      );
  });

  it("Back from the checkout page clears the spinner the bfcache restored (W-102)", () => {
    const experience = source("features/pricing/PricingExperience.tsx");
    expect(experience).toMatch(/addEventListener\("pageshow"/);
    expect(experience).toMatch(/if \(event\.persisted\) setLoading\(""\)/);
    expect(experience).toContain("if (paymentsBlocked || loading) return;");
  });
});
