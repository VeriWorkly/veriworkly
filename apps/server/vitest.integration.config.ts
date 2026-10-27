import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Integration suite: real Postgres + real Redis, requests driven through `app` with supertest.
 * Nothing here is mocked, which is the point. One file at a time (`fileParallelism: false`) in a
 * forked process, because every file starts by truncating the database and flushing the Redis db.
 *
 * Connection targets and the safety rules (a named `_test` database on a local host, a Redis db
 * other than 0) live in `tests/integration/env.ts`. Migrations are applied by
 * `tests/integration/global-setup.ts`.
 */
export default defineConfig({
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "src") },
      { find: /^#(.+)$/, replacement: path.resolve(__dirname, "src/$1") },
    ],
  },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    // A test that needs a different environment uses `vi.stubEnv`; this undoes it before the next.
    unstubEnvs: true,
    pool: "forks",
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    globalSetup: ["tests/integration/global-setup.ts"],
    setupFiles: ["tests/integration/setup.ts"],
  },
});
