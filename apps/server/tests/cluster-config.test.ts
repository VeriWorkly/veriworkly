import { describe, expect, it, vi } from "vitest";

vi.mock("dotenv", () => ({
  default: {
    config: vi.fn().mockReturnValue({}),
  },
}));

describe("Clustering Configuration", () => {
  it("parses clustering enabled and worker count correctly from environment variables", async () => {
    // Save original process.env
    const originalEnv = { ...process.env };

    try {
      // Temporarily mock environment variables
      process.env.CLUSTERING_ENABLED = "true";
      process.env.WEB_CONCURRENCY = "4";

      // Re-import the config module dynamically to get fresh environment values
      // Note: we delete the module cache in Node, but since we are running via vitest,
      // vitest runs in isolated contexts or handles imports. Let's dynamically import.
      vi.resetModules();
      const { config } = await import("../src/config.ts?t=1");

      expect(config.server.clusteringEnabled).toBe(true);
      expect(config.server.workers).toBe(4);
    } finally {
      // Restore original process.env
      process.env = originalEnv;
      vi.resetModules();
    }
  });

  it("defaults clusteringEnabled to false in test/development environments if not specified", async () => {
    const originalEnv = { ...process.env };

    try {
      delete process.env.CLUSTERING_ENABLED;
      process.env.NODE_ENV = "test";

      vi.resetModules();
      const { config } = await import("../src/config.ts?t=2");

      expect(config.server.clusteringEnabled).toBe(false);
    } finally {
      process.env = originalEnv;
      vi.resetModules();
    }
  });

  it("handles fallback to CPU count when WEB_CONCURRENCY/SERVER_WORKERS are empty", async () => {
    const originalEnv = { ...process.env };

    try {
      delete process.env.WEB_CONCURRENCY;
      delete process.env.SERVER_WORKERS;

      vi.resetModules();
      const { config } = await import("../src/config.ts?t=3");

      expect(config.server.workers).toBeGreaterThanOrEqual(1);
    } finally {
      process.env = originalEnv;
      vi.resetModules();
    }
  });
});
