import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * A missing or unreadable private AI config answers a 503 that reaches the client, so its message
 * must not carry server file paths or the working directory; those stay in the server log.
 */

const warn = vi.fn();
vi.mock("#lib/logger", () => ({ logger: { warn, error: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

const { loadPrivateJson } = await import("#services/aiPrivateConfig");

describe("private AI config errors", () => {
  afterEach(() => warn.mockReset());

  it("a missing file answers without its path or the working directory, and logs both", () => {
    const path = "/srv/secret/dir/does-not-exist.json";

    let error: unknown;
    try {
      loadPrivateJson("missing", path, "", "AI policy");
    } catch (caught) {
      error = caught;
    }

    expect(error).toMatchObject({ statusCode: 503, message: "AI policy is not configured." });
    expect((error as Error).message).not.toContain(path);
    expect((error as Error).message).not.toContain(process.cwd());
    expect(JSON.stringify(warn.mock.calls)).toContain(path);
  });

  it("an unreadable file answers without its path", () => {
    // A directory exists but cannot be read as a file.
    const dir = process.cwd();

    let error: unknown;
    try {
      loadPrivateJson("unreadable", dir, "", "AI policy");
    } catch (caught) {
      error = caught;
    }

    expect(error).toMatchObject({ statusCode: 503, message: "AI policy is not configured." });
    expect((error as Error).message).not.toContain(dir);
    expect(JSON.stringify(warn.mock.calls)).toContain("AI policy");
  });
});
