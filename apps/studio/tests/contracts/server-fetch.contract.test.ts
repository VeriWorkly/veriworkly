import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Server modules import the `server-only` guard (it throws outside a React Server Component)
// and read the incoming request through `next/headers`; both are stubbed per test below.
vi.mock("server-only", () => ({}));
// The checkout page's client half pulls in the UI kit's fonts; only the page's routing is under test.
vi.mock("@/app/(main)/checkout/checkout-redirect", () => ({ CheckoutRedirect: () => null }));

const request = vi.hoisted(() => ({
  cookie: "",
  headers: new Headers(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    toString: () => request.cookie,
    has: (name: string) => request.cookie.split("; ").some((pair) => pair.startsWith(`${name}=`)),
  }),
  headers: async () => request.headers,
}));

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_BACKEND_URL ||= "http://localhost:8080/api/v1";
});

import { fetchCurrentUser } from "@/features/auth/services/current-user";
import {
  getBillingServerData,
  getProgramServerData,
  PROGRAM_UNAVAILABLE,
} from "@/features/billing/billing-server";
import { serverFetch, serverFetchData } from "@/lib/server-fetch";
import { GET as clearExpiredSession } from "@/app/auth/session-expired/route";
import CheckoutPage from "@/app/(main)/checkout/page";
import { siteConfig } from "@/config/site";
import { ApiRequestError } from "@/utils/fetchApiData";

const ORIGINAL_FETCH = globalThis.fetch;
const SESSION = "veriworkly-auth.session_token=live";

let fetchMock: ReturnType<typeof vi.fn>;

function respondWith(status: number, body: unknown) {
  fetchMock = vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
}

function sentHeaders(call = 0) {
  return new Headers((fetchMock.mock.calls[call][1] as RequestInit).headers);
}

beforeEach(() => {
  request.cookie = SESSION;
  request.headers = new Headers({
    "x-forwarded-for": "6.6.6.6, 203.0.113.9",
    "x-real-ip": "203.0.113.9",
  });
  vi.stubEnv("INTERNAL_API_KEY", "k".repeat(32));
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("server fetch contract", () => {
  it("S-151: forwards the browser's IP with the internal key so users stop sharing one rate-limit bucket", async () => {
    respondWith(200, { data: {} });

    await serverFetch("/users/me");

    const headers = sentHeaders();
    expect(headers.get("x-internal-key")).toBe("k".repeat(32));
    expect(headers.get("x-forwarded-client-ip")).toBe("203.0.113.9");
    expect(headers.get("cookie")).toBe(SESSION);
    expect(headers.get("origin")).toBe(new URL(siteConfig.url).origin);
  });

  it("S-151: without X-Real-IP it takes the proxy-added last X-Forwarded-For hop, never the client-written first", async () => {
    respondWith(200, { data: {} });
    request.headers = new Headers({ "x-forwarded-for": "6.6.6.6, 198.51.100.4" });

    await serverFetch("/users/me");
    expect(sentHeaders().get("x-forwarded-client-ip")).toBe("198.51.100.4");

    vi.stubEnv("INTERNAL_API_KEY", "");
    await serverFetch("/users/me");
    expect(sentHeaders(1).has("x-internal-key")).toBe(false);
    expect(sentHeaders(1).has("x-forwarded-client-ip")).toBe(false);
  });

  it("S-171 S-162: every call has a timeout, and Content-Type only travels with a body", async () => {
    respondWith(200, { data: {} });

    await serverFetch("/users/me");
    await serverFetch("/roadmap", { method: "POST", body: "{}" });

    const [, getInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(getInit.signal).toBeInstanceOf(AbortSignal);
    expect(getInit.cache).toBe("no-store");
    expect(sentHeaders(0).has("content-type")).toBe(false);
    expect(sentHeaders(1).get("content-type")).toBe("application/json");
  });

  it("S-052: notFoundAsNull answers null only for a 404 and throws the server's message otherwise", async () => {
    respondWith(404, { message: "Not found" });
    await expect(serverFetchData("/api-keys/x", { notFoundAsNull: true })).resolves.toBeNull();

    respondWith(500, { message: "Database unreachable", details: { code: "DB" } });
    const failure = await serverFetchData("/api-keys/x", { notFoundAsNull: true }).catch(
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(ApiRequestError);
    expect(failure).toMatchObject({ status: 500, message: "Database unreachable", code: "DB" });
  });

  it("S-051: billing reads are null without a session but a server failure rejects", async () => {
    respondWith(401, { message: "Unauthorized" });
    await expect(getBillingServerData("/billing/me")).resolves.toBeNull();

    respondWith(404, { message: "Not found" });
    await expect(getBillingServerData("/billing/me")).resolves.toBeNull();

    respondWith(500, { message: "boom" });
    await expect(getBillingServerData("/billing/me")).rejects.toMatchObject({ status: 500 });
  });

  it("S-087 V-193: a program switched off on the server is 'unavailable', not an empty dashboard", async () => {
    const { readFileSync } = await import("node:fs");
    const flagSource = readFileSync(
      `${process.cwd()}/../server/src/middleware/featureFlag.ts`,
      "utf8",
    );
    const code = flagSource.match(/code: "([A-Z_]+)"/)?.[1];
    expect(code).toBe("PROGRAM_DISABLED");

    respondWith(503, {
      message: "The affiliate program is not available yet. Check back soon.",
      details: { code },
    });
    await expect(getProgramServerData("/affiliates/me")).resolves.toBe(PROGRAM_UNAVAILABLE);

    // Switched off is known by its code, not by the wording: the same text without it is an outage.
    respondWith(503, { message: "The affiliate program is not available yet. Check back soon." });
    await expect(getProgramServerData("/affiliates/me")).rejects.toMatchObject({ status: 503 });

    respondWith(503, {
      message: "Authentication is temporarily unavailable",
      details: { code: "AUTH_UNAVAILABLE" },
    });
    await expect(getProgramServerData("/affiliates/me")).rejects.toMatchObject({ status: 503 });
  });

  it("S-139 S-140 S-185: the current user is null only when the session is rejected; an outage throws", async () => {
    respondWith(200, { data: { id: "u1", email: "a@b.co", autoSyncEnabled: false } });
    await expect(fetchCurrentUser()).resolves.toMatchObject({ id: "u1", autoSyncEnabled: false });

    for (const status of [401, 403]) {
      respondWith(status, { message: "Unauthorized" });
      await expect(fetchCurrentUser(), String(status)).resolves.toBeNull();
    }

    respondWith(503, {
      message: "Authentication is temporarily unavailable",
      details: { code: "AUTH_UNAVAILABLE" },
    });
    await expect(fetchCurrentUser()).rejects.toMatchObject({ code: "AUTH_UNAVAILABLE" });

    respondWith(429, { message: "Too many requests" });
    await expect(fetchCurrentUser()).rejects.toMatchObject({ status: 429 });
  });

  it("S-139: a visitor without a session cookie is a guest without asking the server", async () => {
    respondWith(500, {});
    request.cookie = "veriworkly-guest-mode=true";

    await expect(fetchCurrentUser()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("S-139: the session-expired route clears the cookie on every domain, but only once the API rejects it", async () => {
    respondWith(401, { message: "Unauthorized" });

    const response = await clearExpiredSession(
      new NextRequest("https://app.veriworkly.com/auth/session-expired", {
        headers: { cookie: SESSION },
      }),
    );
    const cleared = response.headers.getSetCookie();

    expect(response.headers.get("location")).toBe(
      "https://app.veriworkly.com/login?session=expired",
    );
    for (const domain of ["", "; Domain=app.veriworkly.com", "; Domain=veriworkly.com"]) {
      expect(cleared).toContain(
        `__Secure-veriworkly-auth.session_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure${domain}`,
      );
      expect(cleared).toContain(
        `veriworkly-auth.session_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${domain}`,
      );
    }
  });

  it("S-139: a link to the session-expired route cannot sign out a live session or a cookieless visitor", async () => {
    respondWith(200, { data: { id: "u1", email: "a@b.co" } });

    const live = await clearExpiredSession(
      new NextRequest("https://app.veriworkly.com/auth/session-expired", {
        headers: { cookie: SESSION },
      }),
    );
    expect(live.headers.getSetCookie()).toEqual([]);
    expect(live.headers.get("location")).toBe("https://app.veriworkly.com/");

    request.cookie = "";
    const cookieless = await clearExpiredSession(
      new NextRequest("https://app.veriworkly.com/auth/session-expired"),
    );
    expect(cookieless.headers.getSetCookie()).toEqual([]);
    expect(cookieless.headers.get("location")).toBe("https://app.veriworkly.com/login");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("S-139: /checkout with a dead session clears it instead of looping through /login", async () => {
    respondWith(401, { message: "Unauthorized" });

    const outcome = await CheckoutPage({
      searchParams: Promise.resolve({ productKey: "bundle", interval: "monthly" }),
    }).catch((error: unknown) => error);

    expect(String((outcome as { digest?: string }).digest)).toContain("/auth/session-expired");
  });
});
