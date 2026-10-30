import { NextRequest } from "next/server";

import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * S-378: a session cookie the API rejects sends the user through `/auth/session-expired` to
 * sign in again. They must come back where they were headed (a checkout link, an editor deep
 * link), not to `/`.
 */

const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT ${url}`);
});
const requestHeaders = { current: new Headers() };

vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));
vi.mock("next/headers", () => ({
  headers: async () => requestHeaders.current,
  cookies: async () => ({ toString: () => "", has: () => true }),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "" }),
  Geist_Mono: () => ({ variable: "" }),
}));
vi.mock("@/lib/server-fetch", () => ({ hasSessionCookie: async () => true }));
vi.mock("@/features/auth/services/current-user", () => ({ fetchCurrentUser: async () => null }));
vi.mock("@/features/billing/billing-server", () => ({ getBillingServerData: async () => null }));
vi.mock("@/providers/auth-provider", () => ({
  AuthInitializer: () => null,
  InitialUserProvider: ({ children }: { children: unknown }) => children,
}));

const CHECKOUT = "/checkout?productKey=pro&interval=monthly";
const expiredTo = (path: string) => `/auth/session-expired?callbackURL=${encodeURIComponent(path)}`;

describe("S-378 a rejected session cookie keeps where the user was going", () => {
  beforeEach(() => {
    redirect.mockClear();
    requestHeaders.current = new Headers();
  });

  it("S-378 the proxy hands the page its path and query", async () => {
    const { default: proxy } = await import("@/proxy");
    const response = await proxy(
      new NextRequest(`https://app.veriworkly.com${CHECKOUT}`, {
        headers: { cookie: "veriworkly-auth.session_token=dead", "x-pathname": "/spoofed" },
      }),
    );

    expect(response.headers.get("x-middleware-request-x-pathname")).toBe(CHECKOUT);
  });

  it("S-378 the studio layout sends the path on to session-expired", async () => {
    const { default: MainLayout } = await import("@/app/(main)/layout");
    requestHeaders.current = new Headers({ "x-pathname": "/editor/resume/abc?tab=design" });

    await expect(MainLayout({ children: null })).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith(expiredTo("/editor/resume/abc?tab=design"));
  });

  it("S-378 without a usable path the layout still clears the session", async () => {
    const { default: MainLayout } = await import("@/app/(main)/layout");
    requestHeaders.current = new Headers({ "x-pathname": "//evil.example/x" });

    await expect(MainLayout({ children: null })).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/auth/session-expired");
  });

  it("S-378 a checkout link keeps the purchase through session-expired", async () => {
    const { default: CheckoutPage } = await import("@/app/(main)/checkout/page");

    await expect(
      CheckoutPage({
        searchParams: Promise.resolve({ productKey: "pro", interval: "monthly" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith(expiredTo(CHECKOUT));
  });
});
