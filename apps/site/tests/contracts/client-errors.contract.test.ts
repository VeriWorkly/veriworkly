import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

/** Browser crashes reach the API log (W-090): once each, and only in production. */

describe("reportClientError", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  const load = async () => {
    vi.stubGlobal("window", { location: { href: "https://veriworkly.com/pricing" } });
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const { reportClientError } = await import("@/utils/report-client-error");
    return { reportClientError, fetchMock };
  };

  it("posts each error once to the API in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_BACKEND_URL", "https://api.veriworkly.com/api/v1/");
    const { reportClientError, fetchMock } = await load();
    const error = Object.assign(new Error("boom"), { digest: "123" });

    reportClientError(error, "marketing");
    reportClientError(error, "marketing");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.veriworkly.com/api/v1/client-errors");
    expect(JSON.parse(String(init.body))).toMatchObject({
      app: "site",
      boundary: "marketing",
      message: "boom",
      digest: "123",
      url: "https://veriworkly.com/pricing",
    });
  });

  it("sends nothing in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_BACKEND_URL", "https://api.veriworkly.com/api/v1");
    const { reportClientError, fetchMock } = await load();

    reportClientError(new Error("boom"), "root");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("every error boundary reports", () => {
    for (const file of ["app/error.tsx", "app/(marketing)/error.tsx", "app/global-error.tsx"])
      expect(readFileSync(join(__dirname, "..", "..", file), "utf8"), file).toContain(
        "reportClientError(error,",
      );
  });
});
