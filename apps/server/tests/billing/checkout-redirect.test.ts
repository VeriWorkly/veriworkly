import { describe, expect, it } from "vitest";

import { checkoutSchema, creditPackCheckoutSchema } from "../../src/validators/billingValidator.js";

/** The post-checkout return path must stay on the site: browsers read "\" as "/". */
describe("checkout redirectUrl", () => {
  it.each(["/billing", "/billing?tab=credits", "/a/b#c"])(
    "accepts the same-site path %s",
    (path) => {
      expect(checkoutSchema.parse({ interval: "monthly", redirectUrl: path }).redirectUrl).toBe(
        path,
      );
      expect(
        creditPackCheckoutSchema.parse({ packKey: "credit_pack_250", redirectUrl: path })
          .redirectUrl,
      ).toBe(path);
    },
  );

  it.each(["//evil.com", "/\\evil.com", "/\\/evil.com", "/ok\\..\\x", "https://evil.com", "/a b"])(
    "refuses %s",
    (path) => {
      expect(checkoutSchema.safeParse({ interval: "monthly", redirectUrl: path }).success).toBe(
        false,
      );
      expect(
        creditPackCheckoutSchema.safeParse({ packKey: "credit_pack_250", redirectUrl: path })
          .success,
      ).toBe(false);
    },
  );
});
