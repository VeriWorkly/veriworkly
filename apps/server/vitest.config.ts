import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

import { BLANKED_CREDENTIALS } from "./tests/integration/env";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@",
        replacement: path.resolve(__dirname, "src"),
      },
      {
        find: /^#(.+)$/,
        replacement: path.resolve(__dirname, "src/$1"),
      },
    ],
  },
  test: {
    include: ["tests/**/*.test.ts"],
    // The integration suite needs a real Postgres and Redis and its own env; it runs through
    // `vitest.integration.config.ts` (`npm run test:integration`), never from here.
    exclude: [...configDefaults.exclude, "tests/integration/**"],
    environment: "node",
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    // Tests change the environment only through `vi.stubEnv`, and every stub is undone before the
    // next test, so no test can leak a variable into the ones after it.
    unstubEnvs: true,
    /**
     * Room for a test that waits in the scheduler on a busy machine. The tests that hit the old
     * 5000ms default mock Redis and Prisma (no real I/O, no timers) and finish in milliseconds
     * once they run; the time was spent queued behind other workers, not in the test.
     */
    testTimeout: 20_000,
    /**
     * Bounded rather than left at the CPU-count default. One worker per core lets this suite
     * saturate the machine, and on a dev box it is never the only thing running, which is what
     * pushed tests past the timeout above. Vitest 4 reads `maxWorkers` (the old
     * `poolOptions.threads.maxThreads` is ignored); `--maxWorkers` on the command line overrides it.
     */
    pool: "threads",
    maxWorkers: 4,
    /**
     * The unit suite reaches no real service. `config.ts` skips dotenv under Vitest, but values
     * in the developer's shell (the owner keeps credentials as Windows User variables) still
     * reach the code, so a test that forgot its mock would call a real AI, mail or Dodo account
     * or open the real database or Redis (V-365). Every credential is blanked and the database
     * and Redis URLs point nowhere. The log level and NODE_ENV are pinned so the logger tests do
     * not depend on the shell either (V-395). The OAuth ids below are dummies the auth module
     * needs to load.
     */
    env: {
      ...Object.fromEntries(BLANKED_CREDENTIALS.map((key) => [key, ""])),
      DODO_PAYMENTS_API_KEY: "",
      DODO_PAYMENTS_WEBHOOK_SECRET: "",
      DATABASE_URL: "postgresql://unit:unit@127.0.0.1:1/unit_suite_has_no_database",
      REDIS_URL: "redis://127.0.0.1:1/0",
      LOG_LEVEL: "info",
      NODE_ENV: "test",
      GOOGLE_CLIENT_ID: "dummy-google-client-id",
      GOOGLE_CLIENT_SECRET: "dummy-google-client-secret",
      GITHUB_CLIENT_ID: "dummy-github-client-id",
      GITHUB_CLIENT_SECRET: "dummy-github-client-secret",
      LINKEDIN_CLIENT_ID: "dummy-linkedin-client-id",
      LINKEDIN_CLIENT_SECRET: "dummy-linkedin-client-secret",
    },
  },
});
