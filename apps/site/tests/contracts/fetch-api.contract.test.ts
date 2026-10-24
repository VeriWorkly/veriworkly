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
});
