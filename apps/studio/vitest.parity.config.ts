import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * The parity suite is separate from `vitest.config.ts` because it boots the app
 * and drives a real browser: it takes minutes, not seconds, and needs a
 * Chromium on the machine. `npm run test:contracts` stays fast.
 */
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
    include: ["tests/parity/**/*.test.ts"],
    globals: false,
    // Bundled rather than loaded by Node, so the alias reaches the textkit import inside them.
    server: { deps: { inline: [/@react-pdf[\\/](renderer|layout)[\\/]/] } },
    // Every test starts from the real implementations and globals, whatever the last one stubbed.
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
    // One server, one browser, one page at a time — parallel navigations make
    // the measurements noisy.
    fileParallelism: false,
    testTimeout: 180_000,
    hookTimeout: 300_000,
  },
});
