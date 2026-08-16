import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import proxy, { looksLikeStaticAssetPath } from "@/proxy";

function requestTo(url: string, init?: { cookie?: string }) {
  // NextRequest does not auto-populate the `host` header from the URL it's
  // constructed with — proxy() reads the hostname off the header, not off
  // request.nextUrl, so it must be set explicitly here.
  const headers: Record<string, string> = { host: new URL(url).host };
  if (init?.cookie) headers.cookie = init.cookie;
  return new NextRequest(url, { headers });
}

describe("looksLikeStaticAssetPath", () => {
  it("matches a real static asset path", () => {
    expect(looksLikeStaticAssetPath("/veriworkly-logo.png")).toBe(true);
    expect(looksLikeStaticAssetPath("/favicon.ico")).toBe(true);
    expect(looksLikeStaticAssetPath("/fonts/outfit.woff2")).toBe(true);
  });

  it("does not treat an app route as a static asset", () => {
    expect(looksLikeStaticAssetPath("/dashboard")).toBe(false);
    expect(looksLikeStaticAssetPath("/editor")).toBe(false);
  });

  it("does not misclassify a route whose non-final segment merely contains a dot", () => {
    // The old `path.includes(".")` heuristic would have wrongly treated this
    // as a static asset and skipped the auth gate.
    expect(looksLikeStaticAssetPath("/user/j.doe/settings")).toBe(false);
  });
});

describe("proxy middleware — platform host auth gate", () => {
  it("redirects away from private workspace routes when there's no session or guest cookie", () => {
    for (const path of ["/dashboard", "/editor", "/billing", "/settings", "/analytics"]) {
      const response = proxy(requestTo(`https://portfolio.veriworkly.com${path}`));
      expect(response.status).toBe(307);
      const location = response.headers.get("location") ?? "";
      expect(location).toContain("/login");
      expect(location).toContain("callbackURL=");
    }
  });

  it("lets an authenticated visitor through to private workspace routes", () => {
    for (const path of ["/dashboard", "/editor", "/billing", "/settings", "/analytics"]) {
      const response = proxy(
        requestTo(`https://portfolio.veriworkly.com${path}`, {
          cookie: "__Secure-veriworkly-auth.session_token=token",
        }),
      );
      expect(response.headers.get("location")).toBeNull();
    }
  });

  it("lets a guest visitor through to private workspace routes when guest cookie is present", () => {
    for (const path of ["/dashboard", "/editor", "/settings", "/analytics"]) {
      const response = proxy(
        requestTo(`https://portfolio.veriworkly.com${path}`, {
          cookie: "veriworkly-guest-mode=true",
        }),
      );
      expect(response.headers.get("location")).toBeNull();
    }
  });

  it("never redirects public platform paths, even without a session or guest cookie", () => {
    for (const path of ["/", "/pricing", "/templates", "/faq"]) {
      const response = proxy(requestTo(`https://portfolio.veriworkly.com${path}`));
      expect(response.headers.get("location")).toBeNull();
    }
  });

  it("never redirects API routes", () => {
    const response = proxy(requestTo("https://portfolio.veriworkly.com/api/render"));
    expect(response.headers.get("location")).toBeNull();
  });

  it("never redirects static asset requests, even without a session", () => {
    const response = proxy(requestTo("https://portfolio.veriworkly.com/veriworkly-logo.png"));
    expect(response.headers.get("location")).toBeNull();
  });
});

describe("proxy middleware — routing rewrites", () => {
  it("rewrites /user/:name and /portfolio/:name to /portfolios/:name on the platform host", () => {
    const cookie = "__Secure-veriworkly-auth.session_token=token";
    const userResponse = proxy(
      requestTo("https://portfolio.veriworkly.com/user/gautam", { cookie }),
    );
    expect(userResponse.headers.get("x-middleware-rewrite")).toContain("/portfolios/gautam");

    const portfolioResponse = proxy(
      requestTo("https://portfolio.veriworkly.com/portfolio/gautam/projects", { cookie }),
    );
    expect(portfolioResponse.headers.get("x-middleware-rewrite")).toContain(
      "/portfolios/gautam/projects",
    );
  });

  it("rewrites a custom subdomain request to /portfolios/:subdomain", () => {
    const response = proxy(requestTo("https://gautam.veriworkly.com/"));
    expect(response.headers.get("x-middleware-rewrite")).toContain("/portfolios/gautam");
  });

  it("passes through an unrecognized host with no rewrite", () => {
    const response = proxy(requestTo("https://example.com/"));
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });
});
