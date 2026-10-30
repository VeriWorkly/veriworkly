import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/backend", () => ({
  backendApiUrl: (path: string) => `https://api.test${path}`,
}));

import { Watermark, badgeHref } from "@/components/Watermark";
import { sendView } from "@/components/PublicViewTracker";

describe("the badge", () => {
  it("links to the main site with referral tags and keeps the referrer", () => {
    const element = Watermark({ subdomain: "jane" });
    const link = (element.props as { children: ReactElement }).children;
    const props = link.props as Record<string, string>;
    const href = new URL(props.href);

    expect(href.searchParams.get("ref")).toBe("badge");
    expect(href.searchParams.get("utm_source")).toBe("portfolio_badge");
    expect(href.searchParams.get("utm_medium")).toBe("referral");
    expect(href.searchParams.get("utm_content")).toBe("jane");
    expect(props.rel).toBe("noopener");
    expect(props["aria-label"]).toMatch(/^Built with VeriWorkly/);
    expect(badgeHref()).not.toContain("utm_content");
  });
});

describe("the view beacon (P-002)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends text/plain so a subdomain needs no preflight", async () => {
    const sendBeacon = vi.fn(() => true);
    vi.stubGlobal("navigator", { sendBeacon });

    await expect(sendView("jane", "https://x.test")).resolves.toBe(true);

    const [url, blob] = sendBeacon.mock.calls[0] as unknown as [string, Blob];
    expect(url).toBe("https://api.test/portfolios/public/jane/view");
    expect(blob.type).toBe("text/plain;charset=utf-8");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to a keepalive fetch when the beacon is refused", async () => {
    vi.stubGlobal("navigator", { sendBeacon: () => false });
    fetchMock.mockResolvedValue({ ok: true });

    await expect(sendView("jane", "")).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/portfolios/public/jane/view",
      expect.objectContaining({
        keepalive: true,
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
      }),
    );
  });

  it("reports a failed send so the view is retried later", async () => {
    vi.stubGlobal("navigator", {});
    fetchMock.mockResolvedValue({ ok: false });

    await expect(sendView("jane", "")).resolves.toBe(false);
  });
});
