import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("dotenv", () => ({
  default: {
    config: vi.fn().mockReturnValue({}),
  },
}));

// `config` reads the environment once at import, so each case stubs the variables, then
// re-imports it. The config sets `unstubEnvs: true`, so nothing here outlives its test.
async function loadConfig() {
  vi.resetModules();
  return (await import("../src/config.js")).config;
}

describe("Clustering Configuration", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("parses clustering enabled and worker count correctly from environment variables", async () => {
    vi.stubEnv("CLUSTERING_ENABLED", "true");
    vi.stubEnv("WEB_CONCURRENCY", "4");

    const config = await loadConfig();

    expect(config.server.clusteringEnabled).toBe(true);
    expect(config.server.workers).toBe(4);
  });

  it("defaults clusteringEnabled to false in test/development environments if not specified", async () => {
    vi.stubEnv("CLUSTERING_ENABLED", undefined);
    vi.stubEnv("NODE_ENV", "test");

    const config = await loadConfig();

    expect(config.server.clusteringEnabled).toBe(false);
  });

  it("handles fallback to CPU count when WEB_CONCURRENCY/SERVER_WORKERS are empty", async () => {
    vi.stubEnv("WEB_CONCURRENCY", undefined);
    vi.stubEnv("SERVER_WORKERS", undefined);

    const config = await loadConfig();

    expect(config.server.workers).toBeGreaterThanOrEqual(1);
  });
});
