import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": rootDir,
      // `server-only` throws outside the react-server condition; tests run plain Node.
      "server-only": path.join(rootDir, "tests", "server-only-stub.ts"),
    },
  },

  test: {
    environment: "node",
    include: ["tests/contracts/**/*.test.ts", "tests/contracts/**/*.test.tsx"],
    globals: false,
    // Several contract tests import app modules cold (the ATS engine, the FAQ data); under
    // full-suite load on Windows that passes the 5 s default (W-056).
    testTimeout: 30_000,
  },
});
