import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: { "@": rootDir },
  },

  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: false,
    // Page modules are imported cold, which can pass the 5 s default on Windows.
    testTimeout: 30_000,
  },
});
