import { describe, expect, it, vi } from "vitest";

// The developer's `.env` must not decide the pack defaults this file reads.
vi.mock("dotenv", () => ({ default: { config: vi.fn().mockReturnValue({}) } }));
vi.mock("#services/aiPolicy", () => ({ publicAiActionPolicy: () => ({}) }));

const { productCatalog } = await import("../../src/services/productCatalog.js");

/**
 * V-376: Dodo is the source of truth for prices, and the catalog's display prices must match what
 * customers are actually charged there, in USD cents.
 */
describe("catalog prices match Dodo (V-376)", () => {
  it("prices AI Credits at $5.99/mo and $59.88/yr", () => {
    expect(productCatalog.ai_credits.prices).toEqual({ monthly: 599, annual: 5_988 });
  });

  it("prices Creator Pro at $9.99/mo and $95.88/yr", () => {
    expect(productCatalog.portfolio_pro.prices).toEqual({ monthly: 999, annual: 9_588 });
  });

  it("prices the Job Hunter Bundle at $14.99/mo and $143.88/yr, with passes at $2.99 and $5.99", () => {
    expect(productCatalog.bundle.prices).toEqual({
      one_day: 299,
      seven_day: 599,
      monthly: 1_499,
      annual: 14_388,
    });
  });
});
