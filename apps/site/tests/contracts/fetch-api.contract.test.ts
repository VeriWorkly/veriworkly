import { afterEach, describe, expect, it, vi } from "vitest";

process.env.NEXT_PUBLIC_BACKEND_URL ??= "http://127.0.0.1:1/api/v1";

/**
 * A Content-Type header makes a browser request "non-simple", so it pays a CORS preflight
 * before the real request. Reads have no body and must not send one (W-040).
 */
describe("fetchApiData headers", () => {
  afterEach(() => vi.unstubAllGlobals());

  const ok = () =>
    vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () =>
      Response.json({ success: true, message: "ok", data: {} }, { status: 200 }),
    );

  const headersOf = (mock: ReturnType<typeof ok>) => new Headers(mock.mock.calls[0]![1]!.headers);

  it("sends no Content-Type on a GET", async () => {
    const fetchMock = ok();
    vi.stubGlobal("fetch", fetchMock);

    const { fetchApiData } = await import("@/utils/fetchApiData");
    await fetchApiData("/changelog");

    expect(headersOf(fetchMock).has("content-type")).toBe(false);
  });

  it("sends application/json with a body", async () => {
    const fetchMock = ok();
    vi.stubGlobal("fetch", fetchMock);

    const { fetchApiData } = await import("@/utils/fetchApiData");
    await fetchApiData("/contact", { method: "POST", body: JSON.stringify({ a: 1 }) });

    expect(headersOf(fetchMock).get("content-type")).toBe("application/json");
  });

  it("leaves a FormData upload to set its own multipart type", async () => {
    const fetchMock = ok();
    vi.stubGlobal("fetch", fetchMock);

    const { fetchApiData } = await import("@/utils/fetchApiData");
    await fetchApiData("/ats/extract", { method: "POST", body: new FormData() });

    expect(headersOf(fetchMock).has("content-type")).toBe(false);
  });
});

describe("fetchApiData envelopes", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("throws on a 2xx that says success:false or carries no data (W-064)", async () => {
    const { fetchApiData, ApiRequestError } = await import("@/utils/fetchApiData");

    for (const body of [
      { success: false, message: "nope" },
      { success: true, message: "ok" },
    ]) {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => Response.json(body, { status: 200 })),
      );
      await expect(fetchApiData("/changelog")).rejects.toBeInstanceOf(ApiRequestError);
    }
  });
});

describe("server-side calls forward only the auth cookies (W-066)", () => {
  it("keeps veriworkly-auth.* and __Secure-veriworkly-auth.*, drops the rest", async () => {
    const { sessionCookieHeader } = await import("@/lib/server-api");

    expect(
      sessionCookieHeader([
        { name: "veriworkly-theme", value: "dark" },
        { name: "veriworkly-guest-mode", value: "true" },
        { name: "_ga", value: "GA1.1" },
        { name: "veriworkly-auth.session_token", value: "abc.def" },
        { name: "__Secure-veriworkly-auth.session_data", value: "x y" },
      ]),
    ).toBe("veriworkly-auth.session_token=abc.def; __Secure-veriworkly-auth.session_data=x%20y");
  });
});
