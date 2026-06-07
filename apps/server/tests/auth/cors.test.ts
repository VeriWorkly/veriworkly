import { describe, expect, it } from "vitest";

import { isWildcardPortfolioOrigin } from "../../src/middleware/cors";

describe("CORS wildcard portfolio origin detection", () => {
  const allowedOrigins = [
    "https://veriworkly.com",
    "https://app.veriworkly.com",
    "https://docs.veriworkly.com",
    "https://blog.veriworkly.com",
    "https://portfolio.veriworkly.com",
    "https://api.veriworkly.com",
  ];

  it("does not treat explicit first-party origins as wildcard portfolio origins", () => {
    expect(isWildcardPortfolioOrigin("https://app.veriworkly.com", allowedOrigins)).toBe(false);
    expect(isWildcardPortfolioOrigin("https://portfolio.veriworkly.com", allowedOrigins)).toBe(
      false,
    );
  });

  it("treats unlisted subdomains as wildcard portfolio origins", () => {
    expect(isWildcardPortfolioOrigin("https://alice.veriworkly.com", allowedOrigins)).toBe(true);
  });

  it("treats local portfolio preview subdomains as wildcard portfolio origins", () => {
    expect(isWildcardPortfolioOrigin("http://alice.localhost:3004", allowedOrigins)).toBe(true);
  });
});
