/**
 * The one place the integration suite decides which Postgres and Redis it talks to, and the
 * environment the server boots with. Imported by the global setup (main process) and by the
 * per-file setup (worker), so both see the same answer without passing state between them.
 *
 * Safety: this suite TRUNCATEs every table and FLUSHes the Redis db it is pointed at, so the
 * target has to say it is disposable (V-258):
 * - the database comes from `INTEGRATION_DATABASE_URL` (`DATABASE_URL` only when CI=true, no default),
 *   its name must end in `_test` (a local development database such as `veriworkly`
 *   is refused even on localhost), and every host in the URL, including a `?host=` parameter or
 *   a multi-host list, must be loopback;
 * - Redis comes only from `INTEGRATION_REDIS_URL` (never the developer's `REDIS_URL`), must be
 *   loopback and must not be db 0.
 * `INTEGRATION_ALLOW_REMOTE=1` lifts only the loopback rule, never the `_test` name or db 0.
 *
 * `apps/server/.env` is never read: `config.ts` skips dotenv under Vitest (V-257), and every
 * third-party credential is blanked below, so a run cannot reach a real AI, mail, OAuth, GitHub
 * or R2 account whatever the developer's shell holds.
 */

const DEFAULT_REDIS_URL = "redis://localhost:6379/15";

type IntegrationEnv = {
  databaseUrl: string;
  redisUrl: string;
  redisDbIndex: number;
};

function parseUrl(url: string): URL {
  try {
    return new URL(url);
  } catch {
    throw new Error(`Integration suite: cannot parse URL "${redact(url)}"`);
  }
}

function redact(url: string): string {
  return url.replace(/\/\/([^:/@]+):[^@]+@/, "//$1:***@");
}

function isLoopbackHost(host: string): boolean {
  const bare = host
    .trim()
    .toLowerCase()
    .replace(/^\[(.*)\](:\d+)?$/, "$1")
    .replace(/^([^:]+):\d+$/, "$1");
  return bare === "localhost" || bare === "127.0.0.1" || bare === "::1";
}

/**
 * Every host a Postgres client could connect to: the authority (which may be a comma-separated
 * multi-host list the WHATWG parser does not split) plus any `host` query parameter, which
 * libpq and node-postgres let override the authority.
 */
function postgresHosts(url: string, parsed: URL): string[] {
  const authority = url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").split(/[/?#]/)[0] ?? "";
  const hostList = authority.slice(authority.lastIndexOf("@") + 1);
  const hosts = hostList.split(",");

  for (const value of parsed.searchParams.getAll("host")) hosts.push(...value.split(","));

  return hosts;
}

export function resolveIntegrationEnv(env: NodeJS.ProcessEnv = process.env): IntegrationEnv {
  // Named on purpose locally, never inferred from the developer's DATABASE_URL, and no default.
  // GitHub Actions (CI=true) sets only DATABASE_URL for its throwaway service container; the
  // loopback and _test rules below still apply to it.
  const databaseUrl =
    env.INTEGRATION_DATABASE_URL || (env.CI === "true" ? env.DATABASE_URL : undefined);
  if (!databaseUrl)
    throw new Error(
      "Integration suite: set INTEGRATION_DATABASE_URL to a local Postgres database whose name " +
        "ends in _test (it truncates every table). DATABASE_URL is used for this only in CI.",
    );
  const redisUrl = env.INTEGRATION_REDIS_URL || DEFAULT_REDIS_URL;
  const allowRemote = env.INTEGRATION_ALLOW_REMOTE === "1";

  const db = parseUrl(databaseUrl);
  const redis = parseUrl(redisUrl);
  const databaseName = decodeURIComponent(db.pathname.replace(/^\//, ""));
  const redisDbIndex = Number.parseInt(redis.pathname.replace(/^\//, "") || "0", 10);

  if (!/_test$/.test(databaseName))
    throw new Error(
      `Integration suite refuses database "${databaseName}" (${redact(databaseUrl)}): it ` +
        "truncates every table, so the database name must end in _test. Create one and point " +
        "INTEGRATION_DATABASE_URL at it.",
    );

  if (!Number.isFinite(redisDbIndex) || redisDbIndex === 0)
    throw new Error(
      `Integration suite refuses Redis db 0 (${redact(redisUrl)}); the local dev server uses it. ` +
        "Set INTEGRATION_REDIS_URL to a db index such as redis://localhost:6379/15.",
    );

  if (!allowRemote) {
    const remote = postgresHosts(databaseUrl, db).find((host) => !isLoopbackHost(host));
    if (remote !== undefined)
      throw new Error(
        `Integration suite refuses a non-local database host "${remote}" (${redact(databaseUrl)}). ` +
          "It truncates every table. Point INTEGRATION_DATABASE_URL at a local Postgres, " +
          "or set INTEGRATION_ALLOW_REMOTE=1 if you really mean it.",
      );
    if (!isLoopbackHost(redis.hostname))
      throw new Error(
        `Integration suite refuses a non-local Redis (${redact(redisUrl)}). It flushes the db.`,
      );
  }

  return { databaseUrl, redisUrl, redisDbIndex };
}

/**
 * Third-party credentials and private policies the server reads. Blanked for the suite so
 * nothing in the developer's shell can make a test call a real service (V-257); a test that
 * needs one stubs the client instead.
 */
export const BLANKED_CREDENTIALS = [
  "AI_API_KEY",
  "AI_BASE_URL",
  "AI_ACTIONS_POLICY_PATH",
  "AI_ACTIONS_POLICY_JSON",
  "ATS_AI_POLICY_PATH",
  "ATS_AI_POLICY_JSON",
  "ATS_ENGINE_POLICY_PATH",
  "ATS_ENGINE_POLICY_JSON",
  "RESEND_API_KEY",
  "AUTH_SMTP_HOST",
  "AUTH_SMTP_USER",
  "AUTH_SMTP_PASS",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "LINKEDIN_CLIENT_ID",
  "LINKEDIN_CLIENT_SECRET",
  "GITHUB_TOKEN",
  "INTERNAL_SYNC_API_KEY",
  "R2_ENDPOINT",
  "R2_BUCKET",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_PUBLIC_BASE_URL",
  "DIRECT_DATABASE_URL",
] as const;

/**
 * The server's own configuration for the suite. Applied with `process.env` assignment before any
 * `#config` import, so `dotenv` (which never overrides) cannot pull `.env` values in underneath.
 */
export function applyServerEnv(target: NodeJS.ProcessEnv = process.env): IntegrationEnv {
  const resolved = resolveIntegrationEnv(target);

  const serverEnv: Record<string, string> = {
    NODE_ENV: "test",
    DATABASE_URL: resolved.databaseUrl,
    REDIS_URL: resolved.redisUrl,
    PORT: "0",
    CLUSTERING_ENABLED: "false",
    WEB_CONCURRENCY: "1",
    TRUST_PROXY: "0",
    LOG_LEVEL: "error",
    ALLOWED_ORIGINS: "http://localhost:3001,http://localhost:3004",
    AUTH_SECRET: "integration-test-auth-secret-0123456789abcdef",
    AUTH_BASE_URL: "http://localhost:8080",
    AUTH_EMAIL_PROVIDER: "console",
    ADMIN_EMAIL: "admin@example.test",
    API_KEY_HASH_SECRET: "integration-test-api-key-secret",
    ANALYTICS_HASH_PEPPER: "integration-test-pepper",
    STUDIO_URL: "http://localhost:3001",
    PORTFOLIO_URL: "http://localhost:3004",
    PORTFOLIO_REVALIDATE_SECRET: "integration-test-revalidate",
    STATS_INTERNAL_KEY: STATS_INTERNAL_KEY_VALUE,
    INTERNAL_API_KEY: INTERNAL_API_KEY_VALUE,
    // Billing: a real Standard Webhooks secret so signed deliveries verify. 32 zero bytes, base64.
    DODO_PAYMENTS_API_KEY: "integration-test-dodo-key",
    DODO_PAYMENTS_WEBHOOK_SECRET: "whsec_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    DODO_PAYMENTS_ENVIRONMENT: "test_mode",
    DODO_PAYMENTS_AI_CREDITS_MONTHLY_PRODUCT_ID: "prod_ai_credits_monthly",
    DODO_PAYMENTS_AI_CREDITS_ANNUAL_PRODUCT_ID: "prod_ai_credits_annual",
    DODO_PAYMENTS_PORTFOLIO_PRO_MONTHLY_PRODUCT_ID: "prod_portfolio_pro_monthly",
    DODO_PAYMENTS_PORTFOLIO_PRO_ANNUAL_PRODUCT_ID: "prod_portfolio_pro_annual",
    DODO_PAYMENTS_BUNDLE_MONTHLY_PRODUCT_ID: "prod_bundle_monthly",
    DODO_PAYMENTS_BUNDLE_ANNUAL_PRODUCT_ID: "prod_bundle_annual",
    DODO_PAYMENTS_BUNDLE_ONE_DAY_PRODUCT_ID: "prod_bundle_one_day",
    DODO_PAYMENTS_BUNDLE_SEVEN_DAY_PRODUCT_ID: "prod_bundle_seven_day",
    DODO_PAYMENTS_CREDIT_PACK_250_PRODUCT_ID: "prod_pack_250",
    DODO_PAYMENTS_CREDIT_PACK_500_PRODUCT_ID: "prod_pack_500",
    DODO_PAYMENTS_CREDIT_PACK_1200_PRODUCT_ID: "prod_pack_1200",
    GITHUB_SYNC_ENABLED: "false",
    CHANGELOG_RELEASE_SYNC_ENABLED: "false",
    AFFILIATE_PROGRAM_ENABLED: "true",
    AMBASSADOR_PROGRAM_ENABLED: "true",
  };

  for (const key of BLANKED_CREDENTIALS) target[key] = "";
  for (const [key, value] of Object.entries(serverEnv)) target[key] = value;

  return resolved;
}

/** Shared secrets sent as `x-internal-key` (V-024 stats, V-151 forwarded client IP). */
export const STATS_INTERNAL_KEY_VALUE = "integration-stats-internal-key-0123456789abcdef";
export const INTERNAL_API_KEY_VALUE = "integration-internal-api-key-0123456789abcdef01";

/** Origin header every browser-style request carries so `flexibleAuth` treats it as first-party. */
export const STUDIO_ORIGIN = "http://localhost:3001";
