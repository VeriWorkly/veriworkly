import { describe, expect, it, vi } from "vitest";

vi.mock("#config", () => ({
  config: {
    dodo: {
      creditPack250ProductId: "prod_pack_250",
      creditPack500ProductId: "",
    },
  },
}));

vi.mock("#services/aiPolicy", () => ({ publicAiActionPolicy: () => ({}) }));

const { isCreditPackKey } = await import("../../src/services/productCatalog.js");

describe("isCreditPackKey (V-152)", () => {
  it("accepts the catalog keys only", () => {
    expect(isCreditPackKey("credit_pack_250")).toBe(true);
    expect(isCreditPackKey("credit_pack_500")).toBe(true);
    expect(isCreditPackKey("credit_pack_1000")).toBe(false);
  });

  it("rejects prototype names that `in` would accept", () => {
    for (const name of ["constructor", "toString", "hasOwnProperty", "__proto__", "valueOf"])
      expect(isCreditPackKey(name)).toBe(false);
  });
});
