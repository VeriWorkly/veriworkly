import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const revalidateTag = vi.fn();
vi.mock("next/cache", () => ({ revalidateTag }));

/** The API's refresh hook (W-083): closed without a secret, and only the content tags it owns. */

const SECRET = "s".repeat(40);
const call = async (body: unknown) => {
  const { POST } = await import("@/app/api/revalidate/route");
  return POST(
    new Request("http://localhost/api/revalidate", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
};

describe("POST /api/revalidate", () => {
  beforeEach(() => vi.stubEnv("SITE_REVALIDATE_SECRET", SECRET));
  afterEach(() => {
    vi.unstubAllEnvs();
    revalidateTag.mockClear();
  });

  it("refuses everything while no secret is configured", async () => {
    vi.stubEnv("SITE_REVALIDATE_SECRET", "");
    expect((await call({ secret: "", tags: ["changelog"] })).status).toBe(503);
  });

  it("refuses a wrong secret, bad JSON and unknown tags", async () => {
    expect((await call({ secret: "nope", tags: ["changelog"] })).status).toBe(401);
    expect((await call("{")).status).toBe(400);
    expect((await call({ secret: SECRET, tags: ["portfolio"] })).status).toBe(400);
    expect((await call({ secret: SECRET })).status).toBe(400);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("refuses a secret shorter than 32 characters", async () => {
    vi.stubEnv("SITE_REVALIDATE_SECRET", "short");
    expect((await call({ secret: "short", tags: ["changelog"] })).status).toBe(503);
  });

  it("does not read a body over 4 KB", async () => {
    const response = await call({ secret: SECRET, tags: ["changelog"], pad: "x".repeat(5000) });
    expect(response.status).toBe(413);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("expires each named tag once, now rather than stale-while-revalidate (W-083)", async () => {
    const response = await call({ secret: SECRET, tags: ["changelog", "roadmap", "changelog"] });

    expect(response.status).toBe(200);
    expect(revalidateTag.mock.calls).toEqual([
      ["changelog", { expire: 0 }],
      ["roadmap", { expire: 0 }],
    ]);
  });

  it("every cached changelog and roadmap fetch carries its tag", () => {
    for (const [file, tag] of [
      ["features/changelog/services/changelog-backend.ts", "changelog"],
      ["features/roadmap/services/roadmap-backend.ts", "roadmap"],
    ] as const) {
      const source = readFileSync(join(__dirname, "..", "..", file), "utf8");
      const cached = source.match(/next: \{ revalidate: [^}]*\}/g) ?? [];

      expect(cached.length, file).toBeGreaterThan(0);
      for (const options of cached) expect(options, file).toContain(`tags: ["${tag}"]`);
    }
  });
});
