import { afterEach, describe, expect, it, vi } from "vitest";

import { config } from "#config";
import { notifySiteContentChanged } from "#utils/siteRevalidate";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("notifySiteContentChanged", () => {
  const original = { ...config.site };

  afterEach(() => {
    Object.assign(config.site, original);
    vi.unstubAllGlobals();
  });

  it("calls nothing while the hook is not configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    Object.assign(config.site, { url: "https://veriworkly.com", revalidateSecret: "" });

    notifySiteContentChanged("changelog");
    await flush();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the tag and the secret to the site's revalidate route", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    Object.assign(config.site, { url: "https://veriworkly.com", revalidateSecret: "s".repeat(40) });

    notifySiteContentChanged("roadmap");
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://veriworkly.com/api/revalidate");
    expect(JSON.parse(String(init.body))).toEqual({ secret: "s".repeat(40), tags: ["roadmap"] });
  });

  it("never throws when the site is down", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new Error("ECONNREFUSED"))),
    );
    Object.assign(config.site, { url: "https://veriworkly.com", revalidateSecret: "s".repeat(40) });

    expect(() => notifySiteContentChanged("changelog")).not.toThrow();
    await flush();
  });
});
