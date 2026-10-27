import { afterAll, afterEach, beforeAll } from "vitest";

import { applyServerEnv } from "./env.js";

// Must run before anything imports `#config` (which runs dotenv) or `#lib/prisma` (which reads
// DATABASE_URL at import time). setupFiles execute before the test file's own imports.
applyServerEnv();

const { prisma, closePrisma } = await import("#lib/prisma");
const { initRedis, closeRedis, getRedis } = await import("#lib/redis");

/**
 * Every test file starts from an empty database and an empty Redis db. Tables are truncated in
 * one statement (CASCADE resolves the foreign keys) rather than dropped, so the migrated schema,
 * enums and indexes stay exactly as `migrate deploy` left them.
 */
export async function resetStores(): Promise<void> {
  // The URL was checked in env.ts; this checks where the connection actually landed (V-364).
  const [{ name }] = await prisma.$queryRaw<
    Array<{ name: string }>
  >`SELECT current_database() AS name`;
  if (!name.endsWith("_test"))
    throw new Error(
      `Integration suite refuses to truncate database "${name}": not a _test database.`,
    );

  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;

  if (tables.length) {
    const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
  }

  await getRedis().flushDb();
}

beforeAll(async () => {
  await initRedis();
  await resetStores();
});

/**
 * A billing email is sent fire-and-forget after the webhook answers. One still in flight when a
 * test ends would land after the next test's mock reset and count as that test's mail (V-360).
 * Each test waits here for every send it started. Imported late, so a file's own `vi.mock` of the
 * mail modules is already in place.
 */
afterEach(async () => {
  const { settleBillingNotifications } = await import("#services/billingNotifications");
  await settleBillingNotifications();
});

/**
 * Network handles still open once both stores are closed: a Postgres or Redis client the file
 * opened outside `#lib/prisma`/`#lib/redis` (a second app graph, a raw `pg` client) and never
 * closed. Such a handle keeps the forked worker alive past the run, which Vitest reports only as
 * "Timeout terminating forks worker" with no file name (seen on `credits-ledger.test.ts` in the
 * 2026-10-26 review); failing here names the file instead. Closing sockets settle within a few
 * event-loop turns, so the check waits up to a second before it fails.
 */
async function openNetworkHandles(): Promise<string[]> {
  const network = () => process.getActiveResourcesInfo().filter((name) => /^(TCP|TLS)/.test(name));
  for (let attempt = 0; attempt < 20 && network().length > 0; attempt += 1)
    await new Promise((resolve) => setTimeout(resolve, 50));
  return network();
}

afterAll(async () => {
  await closeRedis();
  await closePrisma();

  const open = await openNetworkHandles();
  if (open.length > 0)
    throw new Error(
      `This file left ${open.length} network handle(s) open (${open.join(", ")}); close every ` +
        "Postgres/Redis client it created before it ends.",
    );
});
