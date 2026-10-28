import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      // The PDF line breaker, see `templates/pdf/textkit.ts`. Listed before "@".
      {
        find: /^@react-pdf\/textkit$/,
        replacement: path.join(rootDir, "templates/pdf/textkit.ts"),
      },
      { find: "@", replacement: rootDir },
    ],
  },

  test: {
    environment: "node",
    include: ["tests/contracts/**/*.test.ts", "tests/contracts/**/*.test.tsx"],
    globals: false,
    // Bundled rather than loaded by Node, so the alias reaches the textkit import inside them.
    server: { deps: { inline: [/@react-pdf[\\/](renderer|layout)[\\/]/] } },
    // Every test starts from the real implementations and globals, whatever the last one stubbed.
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
    // Several contracts render real PDFs, and the first test in a file imports a large module
    // graph cold; under a full parallel run both can pass the 5 s default and even 20 s.
    testTimeout: 60_000,
  },
});
