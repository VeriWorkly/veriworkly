import { logger } from "#lib/logger";
import { initRedis } from "#lib/redis";

import { assertLocalDatabase, isLocalDatabaseUrl } from "#lib/databaseTarget";

/**
 * Shared rules for the seed scripts (`seed:changelog`, `seed:roadmap`).
 *
 * - Every item is validated with the same admin create schema the API uses, and nothing is
 *   written unless every item passes.
 * - Existing rows are never touched: an admin edit (or a sync's enriched PR refs) is not
 *   overwritten by the file. Only ids that are missing are created, in one transaction.
 * - A non-local database or NODE_ENV=production needs `--allow-production`; `--wipe` (delete every
 *   row first) is refused there (V-209).
 * - Read caches are invalidated through the services' own generation bump, never by deleting a
 *   key prefix (which also matched the sync locks, V-072).
 */
export const seedFlags = {
  wipe: process.argv.includes("--wipe"),
  allowProduction: process.argv.includes("--allow-production"),
};

/**
 * Local databases only, whatever NODE_ENV says (V-209): a `.env` with `NODE_ENV=development` can
 * still point at production. A remote database needs `--allow-production`, and `--wipe` is refused
 * there and in production in every case.
 */
export function assertSeedAllowed(
  name: string,
  env: NodeJS.ProcessEnv = process.env,
  argv: readonly string[] = process.argv,
): void {
  const wipe = argv.includes("--wipe");
  const urls = { DATABASE_URL: env.DATABASE_URL, DIRECT_DATABASE_URL: env.DIRECT_DATABASE_URL };
  const remote = Object.values(urls).some((url) => url && !isLocalDatabaseUrl(url));

  if (wipe && (remote || env.NODE_ENV === "production")) {
    throw new Error(`${name}: --wipe is refused against production or any non-local database.`);
  }
  if (env.NODE_ENV === "production" && !argv.includes("--allow-production")) {
    throw new Error(
      `${name}: NODE_ENV=production. Re-run with --allow-production to create the missing rows (existing rows are never changed).`,
    );
  }

  assertLocalDatabase(name, urls, argv);
}

/** Validates every item and throws once, listing each failing item, before anything is written. */
export function parseAll<T>(
  items: unknown[],
  label: (item: unknown, index: number) => string,
  parse: (
    item: unknown,
  ) =>
    | { success: true; data: T }
    | { success: false; error: { issues: Array<{ path: PropertyKey[]; message: string }> } },
): T[] {
  const parsed: T[] = [];
  const problems: string[] = [];

  items.forEach((item, index) => {
    const result = parse(item);
    if (result.success) parsed.push(result.data);
    else
      problems.push(
        `${label(item, index)}: ${result.error.issues.map((issue) => `${issue.path.map(String).join(".") || "(item)"} ${issue.message}`).join("; ")}`,
      );
  });

  if (problems.length > 0) {
    throw new Error(
      `${problems.length} item(s) fail the admin schema:\n  ${problems.join("\n  ")}`,
    );
  }

  return parsed;
}

/** Connects to Redis (5 s cap) and runs the cache invalidation; warns instead of failing. */
export async function invalidateReadCaches(name: string, invalidate: () => Promise<void>) {
  try {
    await Promise.race([
      initRedis(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Redis connect timeout")), 5000),
      ),
    ]);
    await invalidate();
    logger.info(`${name}: read caches invalidated`);
  } catch (error) {
    logger.warn(
      `${name}: skipped the read-cache invalidation (Redis unreachable). If the running server uses this Redis, its public pages serve the old data until the cache TTL.`,
      { error: error instanceof Error ? error.message : String(error) },
    );
  }
}
