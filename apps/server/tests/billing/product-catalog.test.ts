import { describe, expect, it, vi } from "vitest";

vi.mock("#config", () => ({
  config: {
    dodo: {
      creditPack250ProductId: "prod_pack_250",
      creditPack500ProductId: "",
      creditPack1200ProductId: "prod_pack_1200",
    },
  },
}));

vi.mock("#services/aiPolicy", () => ({ publicAiActionPolicy: () => ({}) }));

const { creditPackCatalog, creditPackForProductId, isCreditPackKey } =
  await import("../../src/services/productCatalog.js");

describe("isCreditPackKey (V-152)", () => {
  it("accepts the catalog keys only", () => {
    expect(isCreditPackKey("credit_pack_250")).toBe(true);
    expect(isCreditPackKey("credit_pack_500")).toBe(true);
    expect(isCreditPackKey("credit_pack_1200")).toBe(true);
    expect(isCreditPackKey("credit_pack_1000")).toBe(false);
  });

  it("rejects prototype names that `in` would accept", () => {
    for (const name of ["constructor", "toString", "hasOwnProperty", "__proto__", "valueOf"])
      expect(isCreditPackKey(name)).toBe(false);
  });
});

describe("the 1,200-credit pack (V-376)", () => {
  it("is 1,200 AI credits valid for 90 days", () => {
    expect(creditPackCatalog.credit_pack_1200).toMatchObject({
      name: "1,200 extra credits",
      credits: 1_200,
      expiresInDays: 90,
    });
  });

  it("is found by its Dodo product id", () => {
    expect(creditPackForProductId("prod_pack_1200")).toBe("credit_pack_1200");
  });
});
