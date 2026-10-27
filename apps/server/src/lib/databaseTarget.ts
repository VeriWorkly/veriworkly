/**
 * The guard every command that writes to a database outside the running server runs first
 * (V-209): seeds, `db:migrate`, `db:drift`, the smoke boot, the backfills and the manual
 * `sync:github` / `sync:changelog`. A developer's `apps/server/.env` can hold the live production
 * URL with `NODE_ENV=development`, so `NODE_ENV` proves nothing. What counts is where the URL
 * points: every host in every database URL the command would use must be loopback (or a Unix
 * socket), unless the command carries `--allow-production`.
 *
 * No imports, so plain-Node callers (`smoke-boot.mjs` through `dist/`) and tsx scripts share it.
 */

const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1"]);

/** Hides the password in a connection string for messages. */
export function redactUrl(url: string): string {
  return String(url).replace(/\/\/([^:/@]+):[^@]+@/, "//$1:***@");
}

function normaliseHost(host: string): string {
  return host
    .trim()
    .toLowerCase()
    .replace(/^\[(.*)\](:\d+)?$/, "$1")
    .replace(/^([^:]+):\d+$/, "$1");
}

/**
 * Every host a Postgres client could connect to: each entry of the authority (libpq accepts a
 * comma-separated multi-host list) plus any `host` query parameter, which overrides it.
 * An unparseable URL yields `null`, which callers treat as not local.
 */
export function databaseHosts(url: string): string[] | null {
  const match = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]*)([^?#]*)(\?[^#]*)?/i.exec(String(url).trim());
  if (!match) return null;

  const authority = match[1];
  const hosts = authority.slice(authority.lastIndexOf("@") + 1).split(",");
  const query = new URLSearchParams(match[3] ?? "");

  for (const value of query.getAll("host")) hosts.push(...value.split(","));

  return hosts.map(normaliseHost);
}

/** True when every host is loopback or a Unix socket path; an empty host is the socket default. */
export function isLocalDatabaseUrl(url: string): boolean {
  const hosts = databaseHosts(url);
  if (!hosts) return false;

  return hosts.every((host) => host === "" || host.startsWith("/") || LOOPBACK.has(host));
}

/**
 * Throws unless every set URL is local or `argv` carries `--allow-production`. `urls` maps a
 * variable name to its value; unset or empty values are skipped (the command then fails on its
 * own for a missing URL).
 */
export function assertLocalDatabase(
  name: string,
  urls: Record<string, string | undefined>,
  argv: readonly string[] = process.argv,
): { allowedProduction: boolean } {
  if (argv.includes("--allow-production")) return { allowedProduction: true };

  const remote = Object.entries(urls).filter(
    (entry): entry is [string, string] =>
      typeof entry[1] === "string" && entry[1].trim() !== "" && !isLocalDatabaseUrl(entry[1]),
  );

  if (remote.length > 0) {
    const list = remote.map(([key, value]) => `${key}=${redactUrl(value)}`).join(", ");
    throw new Error(
      `${name}: refusing a non-local database (${list}). This command writes to it, and ` +
        "NODE_ENV does not say which database a URL points at. Export a local DATABASE_URL, or " +
        "re-run with --allow-production if you really mean that database.",
    );
  }

  return { allowedProduction: false };
}

/** The URLs the Prisma CLI and the runtime pool read, as `prisma.config.ts` resolves them. */
export function prismaDatabaseUrls(env: NodeJS.ProcessEnv = process.env) {
  return {
    DATABASE_URL: env.DATABASE_URL,
    DIRECT_DATABASE_URL: env.DIRECT_DATABASE_URL,
    SHADOW_DATABASE_URL: env.SHADOW_DATABASE_URL,
  };
}

/** The runtime's own URLs (no shadow database): what a script that opens `#lib/prisma` uses. */
export function runtimeDatabaseUrls(env: NodeJS.ProcessEnv = process.env) {
  return { DATABASE_URL: env.DATABASE_URL, DIRECT_DATABASE_URL: env.DIRECT_DATABASE_URL };
}
