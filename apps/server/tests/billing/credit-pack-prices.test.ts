import { afterEach, describe, expect, it, vi } from "vitest";

import { validateEnvironmentConfig } from "../../src/config/environmentSchema.js";

// The developer's `.env` must not decide what the defaults look like.
vi.mock("dotenv", () => ({ default: { config: vi.fn().mockReturnValue({}) } }));
vi.mock("#services/aiPolicy", () => ({ publicAiActionPolicy: () => ({}) }));

/** ADMIN_EMAIL is required in every environment. */
const devEnv = { NODE_ENV: "development", ADMIN_EMAIL: "admin@example.com" };

async function catalogPrices() {
  vi.resetModules();
  const { publicCreditEconomics } = await import("../../src/services/productCatalog.js");
  return Object.fromEntries(
    publicCreditEconomics().packs.map((pack) => [pack.key, [pack.price, pack.currency]]),
  );
}

describe("credit pack prices", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to 299 and 499 USD cents when unset", async () => {
    vi.stubEnv("CREDIT_PACK_250_PRICE_CENTS", undefined);
    vi.stubEnv("CREDIT_PACK_500_PRICE_CENTS", undefined);

    expect(await catalogPrices()).toEqual({
      credit_pack_250: [299, "USD"],
      credit_pack_500: [499, "USD"],
    });
  });

  it("takes CREDIT_PACK_250_PRICE_CENTS and CREDIT_PACK_500_PRICE_CENTS from the environment", async () => {
    vi.stubEnv("CREDIT_PACK_250_PRICE_CENTS", "349");
    vi.stubEnv("CREDIT_PACK_500_PRICE_CENTS", "599");

    expect(await catalogPrices()).toEqual({
      credit_pack_250: [349, "USD"],
      credit_pack_500: [599, "USD"],
    });
  });

  it.each(["0", "-299", "2.99", "abc", "299 cents"])(
    "refuses to boot with a price of %j",
    (value) => {
      for (const variable of ["CREDIT_PACK_250_PRICE_CENTS", "CREDIT_PACK_500_PRICE_CENTS"]) {
        expect(() => validateEnvironmentConfig({ ...devEnv, [variable]: value })).toThrow(variable);
      }
    },
  );

  it("accepts a positive whole number of cents", () => {
    expect(() =>
      validateEnvironmentConfig({
        ...devEnv,
        CREDIT_PACK_250_PRICE_CENTS: "349",
        CREDIT_PACK_500_PRICE_CENTS: "599",
      }),
    ).not.toThrow();
  });
});
