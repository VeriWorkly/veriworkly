import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": rootDir,
      // The generated collection imports compiled MDX; tests read the same files from disk.
      "collections/server": path.join(rootDir, "tests", "support", "collections.ts"),
    },
  },

  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: false,
    setupFiles: ["tests/support/setup.ts"],
    // fumadocs imports CSS and extensionless `next/*` paths, which plain Node cannot load; Vite can.
    server: { deps: { inline: [/fumadocs-ui/, /fumadocs-core/] } },
    testTimeout: 30_000,
  },
});
