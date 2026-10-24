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
  },
});
