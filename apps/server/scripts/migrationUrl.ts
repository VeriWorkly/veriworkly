/**
 * Which URL the Prisma CLI migrates through (`prisma.config.ts`). No imports on purpose: Prisma
 * loads the config file outside the app's module aliases.
 *
 * Migrations take a Postgres advisory lock that does not survive a transaction pooler, so a
 * migrate command must reach the database directly (V-251): `DIRECT_DATABASE_URL` when set,
 * otherwise `DATABASE_URL` only if it is not a pooler. Commands that need no database
 * (`prisma generate`, run from the root postinstall) never throw here.
 */

/** Neon's `-pooler` host, PgBouncer's flag, or Supabase's pooler port. */
export function isPoolerUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.includes("-pooler") ||
      parsed.port === "6543" ||
      parsed.searchParams.get("pgbouncer") === "true"
    );
  } catch {
    return false;
  }
}

export function resolveMigrationUrl(
  env: Record<string, string | undefined>,
  argv: readonly string[],
): string | undefined {
  const direct = env.DIRECT_DATABASE_URL;
  if (direct) return direct;

  const fallback = env.DATABASE_URL || undefined;
  if (fallback && argv.includes("migrate") && isPoolerUrl(fallback))
    throw new Error(
      "DATABASE_URL is a connection pooler, where the migration lock does not hold. Set " +
        "DIRECT_DATABASE_URL to the direct (non-pooled) host before running prisma migrate.",
    );

  return fallback;
}
