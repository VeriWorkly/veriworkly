import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { hasPortfolioSessionCookie, isPublicPlatformPath } from "@/proxy";

describe("portfolio auth routing contract", () => {
  it("keeps the portfolio landing and public portfolio views public", () => {
    expect(isPublicPlatformPath("/")).toBe(true);
    expect(isPublicPlatformPath("/pricing")).toBe(true);
    expect(isPublicPlatformPath("/user/gautam")).toBe(true);
    expect(isPublicPlatformPath("/portfolios/gautam")).toBe(true);
    expect(isPublicPlatformPath("/templates/signal/preview")).toBe(true);
  });

  it("makes current and future workspace sections private by default", () => {
    expect(isPublicPlatformPath("/editor")).toBe(false);
    expect(isPublicPlatformPath("/settings")).toBe(false);
    expect(isPublicPlatformPath("/analytics")).toBe(false);
    expect(isPublicPlatformPath("/dashboard")).toBe(false);
    expect(isPublicPlatformPath("/billing")).toBe(false);
    expect(isPublicPlatformPath("/preview/document-1")).toBe(false);
    expect(isPublicPlatformPath("/future-private-page")).toBe(false);
  });

  it("recognizes both production and development auth session cookies", () => {
    const prodRequest = new NextRequest("https://portfolio.veriworkly.com/editor", {
      headers: { cookie: "__Secure-veriworkly-auth.session_token=prod-token" },
    });
    const devRequest = new NextRequest("http://localhost:3004/editor", {
      headers: { cookie: "veriworkly-auth.session_token=dev-token" },
    });

    expect(hasPortfolioSessionCookie(prodRequest)).toBe(true);
    expect(hasPortfolioSessionCookie(devRequest)).toBe(true);
  });
});
