import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Editor behaviour that only exists in a browser: breakpoint-driven layout, hydration
 * against real local storage, and save failures surfaced to the user.
 *
 * Separate from `vitest.config.ts` (node, seconds) for the same reason the parity suite is:
 * this boots the app and drives Chrome. It reuses the parity harness in
 * `tests/parity/{browser,server}.ts` rather than starting a second one.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": rootDir,
    },
  },

  test: {
    environment: "node",
    include: ["tests/browser/**/*.test.ts"],
    globals: false,
    fileParallelism: false,
    testTimeout: 180_000,
    hookTimeout: 300_000,
  },
});
