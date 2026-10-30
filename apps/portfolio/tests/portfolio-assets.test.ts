import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.NEXT_PUBLIC_BACKEND_URL = "http://test-backend.local";

const { uploadPortfolioAsset } = await import("@/lib/portfolio-assets");

const file = new File(["png"], "avatar.png", { type: "image/png" });
const prepared = { uploadUrl: "https://bucket.example/put", assetId: "asset-1" };
const completed = { id: "asset-1", url: "https://cdn.example/asset-1.png", extra: "dropped" };

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function stubUpload(steps: {
  uploadUrl?: () => Response;
  put?: () => Response;
  complete?: () => Response;
}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/upload-url"))
        return (steps.uploadUrl ?? (() => json({ data: prepared })))();
      if (url.includes("/complete")) return (steps.complete ?? (() => json({ data: completed })))();
      return (steps.put ?? (() => new Response(null, { status: 200 })))();
    }),
  );
}

describe("portfolio asset upload (P-003)", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("returns the asset reference when every step succeeds", async () => {
    stubUpload({});
    expect(await uploadPortfolioAsset("AVATAR", file)).toEqual({
      ok: true,
      asset: { id: "asset-1", url: "https://cdn.example/asset-1.png" },
    });
  });

  it("shows the server's message when the upload URL is refused", async () => {
    stubUpload({ uploadUrl: () => json({ message: "Too many uploads. Try again later." }, 429) });
    expect(await uploadPortfolioAsset("SOCIAL_IMAGE", file)).toEqual({
      ok: false,
      message: "Too many uploads. Try again later.",
    });
  });

  it("fails when the storage PUT fails, without calling complete", async () => {
    let completeCalled = false;
    stubUpload({
      put: () => new Response(null, { status: 403 }),
      complete: () => {
        completeCalled = true;
        return json({ data: completed });
      },
    });
    const result = await uploadPortfolioAsset("PROJECT_COVER", file);
    expect(result.ok).toBe(false);
    expect(completeCalled).toBe(false);
  });

  it("never yields an asset when complete fails", async () => {
    stubUpload({ complete: () => json({ message: "Upload not found." }, 404) });
    expect(await uploadPortfolioAsset("SOCIAL_IMAGE", file)).toEqual({
      ok: false,
      message: "Upload not found.",
    });
  });

  it("never yields an asset when complete answers without one", async () => {
    stubUpload({ complete: () => json({ data: null }) });
    const result = await uploadPortfolioAsset("SOCIAL_IMAGE", file);
    expect(result.ok).toBe(false);
    expect("asset" in result).toBe(false);
  });

  it("turns a network failure into a message instead of a rejection", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(uploadPortfolioAsset("AVATAR", file)).resolves.toMatchObject({ ok: false });
  });
});

// S5: the browser PUTs the file straight to R2 on the server's presigned URL, so the page's CSP
// has to let it connect there, or every upload fails in production.
describe("the content security policy", () => {
  it("lets the browser upload to the presigned R2 host", async () => {
    const { default: config } = await import("@/next.config");
    const [rule] = await config.headers!();
    const csp = rule.headers.find((header) => header.key === "Content-Security-Policy")!.value;
    const connect = csp.split("; ").find((directive) => directive.startsWith("connect-src"));

    expect(connect).toContain("https://*.r2.cloudflarestorage.com");
  });
});
