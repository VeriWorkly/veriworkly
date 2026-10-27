import { isIP } from "node:net";

import { z } from "zod";

import { INTEGER_PATTERN } from "./parseEnv.js";

/**
 * Boot-time validation of the raw environment.
 *
 * It deliberately looks at `process.env` as given, not at the defaulted `config` object: several
 * `config.ts` defaults are development values (`http://localhost:3001/billing...`,
 * `redis://localhost:6379`, `dev-revalidate-secret`) that must never be used silently in
 * production, and once defaulted they are indistinguishable from a deliberate setting.
 *
 * Every problem is collected and reported in a single Error so an operator can fix them all in
 * one pass instead of restarting once per variable.
 *
 * Billing/storage presence (Dodo + R2) stays in `validateBillingAndStorageRuntimeConfig`, and the
 * email-provider rules stay in `validateAuthRuntimeConfig`; this schema does not repeat them.
 */

type RawEnv = Record<string, string | undefined>;

const NODE_ENVS = ["development", "test", "production"] as const;

/** Integer variables read by `config.ts`, `lib/prisma.ts` and `middleware/rateLimit.ts`. */
const INTEGER_VARIABLES: Record<string, { min: number; max?: number }> = {
  PORT: { min: 1, max: 65535 },
  WEB_CONCURRENCY: { min: 1 },
  SERVER_WORKERS: { min: 1 },
  MAX_MEMORY_ENTRIES: { min: 1 },

  DB_POOL_MAX_TOTAL: { min: 1 },
  DB_POOL_MAX: { min: 1 },
  DB_POOL_IDLE_TIMEOUT_MS: { min: 1 },
  DB_POOL_CONNECTION_TIMEOUT_MS: { min: 1 },
  DB_POOL_STATEMENT_TIMEOUT_MS: { min: 1 },
  DB_IDLE_IN_TRANSACTION_TIMEOUT_MS: { min: 1 },

  AUTH_SESSION_TTL_SECONDS: { min: 1 },
  AUTH_SESSION_RESET_TTL_ON_USE: { min: 1 },
  AUTH_SESSION_CACHE_MAX_AGE_SECONDS: { min: 1 },
  AUTH_OTP_TTL_SECONDS: { min: 1 },
  AUTH_OTP_ALLOWED_ATTEMPTS: { min: 1 },
  AUTH_SMTP_PORT: { min: 1, max: 65535 },

  // 0 is refused: both are Redis expiries (SET EX 0 is an error).
  API_KEY_AUTH_CACHE_TTL_SECONDS: { min: 1 },
  API_KEY_LAST_USED_TOUCH_INTERVAL_SECONDS: { min: 1 },
  API_KEY_DEFAULT_RATE_LIMIT: { min: 1 },
  API_KEY_MAX_RATE_LIMIT: { min: 1 },
  API_KEY_DEFAULT_LIFETIME_DAYS: { min: 1 },

  RATE_LIMIT_WINDOW_MS: { min: 1 },
  RATE_LIMIT_MAX_REQUESTS: { min: 1 },
  RATE_LIMIT_REDIS_TIMEOUT_MS: { min: 1 },
  AUTH_RATE_LIMIT_WINDOW_MS: { min: 1 },
  AUTH_RATE_LIMIT_MAX_REQUESTS: { min: 1 },
  GLOBAL_RATE_LIMIT_WINDOW_MS: { min: 1 },
  GLOBAL_RATE_LIMIT_MAX_REQUESTS: { min: 1 },

  AUDIT_LOG_RETENTION_DAYS: { min: 1 },

  RETENTION_EXPIRED_SESSION_DAYS: { min: 0 },
  RETENTION_EXPIRED_VERIFICATION_DAYS: { min: 0 },
  RETENTION_WEBHOOK_PAYLOAD_DAYS: { min: 0 },
  RETENTION_AUDIT_LOG_DAYS: { min: 0 },
  RETENTION_ADMIN_AUDIT_DAYS: { min: 0 },
  RETENTION_CREDIT_RESERVATION_DAYS: { min: 0 },
  RETENTION_CREDIT_REPLAY_DAYS: { min: 0 },
  RETENTION_FLUSH_BATCH_DAYS: { min: 0 },
  RETENTION_AFFILIATE_CLICK_DAYS: { min: 0 },
  RETENTION_PORTFOLIO_VIEW_DAYS: { min: 0 },
  RETENTION_DELETED_DOCUMENT_DAYS: { min: 0 },

  AI_TIMEOUT_MS: { min: 1 },
  AI_RATE_LIMIT_WINDOW_MS: { min: 1 },
  AI_RATE_LIMIT_MAX_REQUESTS: { min: 1 },

  ROADMAP_CACHE_TTL_SECONDS: { min: 1 },
  ROADMAP_STATS_CACHE_TTL_SECONDS: { min: 1 },
  GITHUB_STATS_CACHE_TTL_SECONDS: { min: 1 },
  CHANGELOG_CACHE_TTL_SECONDS: { min: 1 },
  USAGE_METRICS_REDIS_RETENTION_DAYS: { min: 1 },
  CHANGELOG_RELEASE_SYNC_MIN_INTERVAL_SECONDS: { min: 0 },

  PORTFOLIO_GRACE_DAYS: { min: 0 },

  // Credit pack display prices in USD cents; a free or negative pack price is a typo.
  CREDIT_PACK_250_PRICE_CENTS: { min: 1 },
  CREDIT_PACK_500_PRICE_CENTS: { min: 1 },
};

/** Browser-facing URLs that must be public https in production when set. */
const REQUIRED_PUBLIC_URLS = [
  "AUTH_BASE_URL",
  "PORTFOLIO_URL",
  "DODO_PAYMENTS_CHECKOUT_RETURN_URL",
  "DODO_PAYMENTS_CHECKOUT_CANCEL_URL",
  "DODO_PAYMENTS_PORTAL_RETURN_URL",
] as const;

/** Same rule, but unset is fine because the `config.ts` production default is already https. */
const OPTIONAL_PUBLIC_URLS = ["STUDIO_URL", "STUDIO_LOGIN_URL", "SITE_URL"] as const;

/** Example/development values that ship in `.env.example` or as `config.ts` fallbacks. */
const EXAMPLE_AUTH_SECRETS = new Set(["dev-auth-secret", "dev-auth-secret-1234567890"]);
const EXAMPLE_API_KEY_HASH_SECRET = "dev-api-key-secret";
const EXAMPLE_ANALYTICS_HASH_PEPPER = "veriworkly-analytics-pepper";
const EXAMPLE_PORTFOLIO_REVALIDATE_SECRET = "dev-revalidate-secret";
const MIN_AUTH_SECRET_LENGTH = 32;

const INTERNAL_SHARED_SECRETS = ["STATS_INTERNAL_KEY", "INTERNAL_API_KEY"] as const;
const MIN_INTERNAL_SECRET_LENGTH = 32;

/** Names `proxy-addr` (Express `trust proxy`) understands in addition to IPs and CIDRs. */
const TRUST_PROXY_NAMED_RANGES = new Set(["loopback", "linklocal", "uniquelocal"]);
const BOOLEAN_WORDS = new Set(["true", "false", "yes", "no", "on", "off"]);

/** Maps an IPv4-mapped IPv6 address (`::ffff:127.0.0.1` or `::ffff:7f00:1`) to its IPv4 form. */
function unmapIpv4(host: string): string {
  if (!host.startsWith("::ffff:")) return host;

  const rest = host.slice("::ffff:".length);
  if (isIP(rest) === 4) return rest;

  const hex = /^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(rest);
  if (!hex) return host;

  const high = parseInt(hex[1]!, 16);
  const low = parseInt(hex[2]!, 16);
  return [high >> 8, high & 0xff, low >> 8, low & 0xff].join(".");
}

/**
 * The WHATWG parser only normalises hosts for special schemes (http, https, ...). For `redis:`
 * URLs `0177.0.0.1`, `0x7f.1` and `2130706433` stay as written, so re-parse the host as http to
 * get the canonical IPv4 form before the local test.
 */
function canonicalHostname(url: URL): string {
  if (url.protocol === "http:" || url.protocol === "https:") return url.hostname;

  try {
    return new URL(`http://${url.hostname}`).hostname;
  } catch {
    return url.hostname;
  }
}

function isLocalHostname(hostname: string): boolean {
  const host = unmapIpv4(
    hostname
      .replace(/^\[|\]$/g, "")
      .toLowerCase()
      .replace(/\.$/, ""),
  );

  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "::" ||
    /^127\./.test(host)
  );
}

/** Returns why `value` is not a public https URL, or null when it is fine. */
function publicHttpsUrlProblem(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "is not a valid URL";
  }

  if (url.protocol !== "https:") return "must use https:// in production";
  if (isLocalHostname(canonicalHostname(url))) return "must not point at localhost in production";

  return null;
}

function isTrustProxyEntry(entry: string): boolean {
  if (TRUST_PROXY_NAMED_RANGES.has(entry.toLowerCase())) return true;

  const [address, prefix, ...rest] = entry.split("/");
  if (rest.length > 0 || !address) return false;

  const family = isIP(address);
  if (family === 0) return false;
  if (prefix === undefined) return true;
  if (!/^\d+$/.test(prefix)) return false;

  return Number(prefix) <= (family === 4 ? 32 : 128);
}

function addIssue(ctx: z.RefinementCtx, variable: string, message: string): void {
  ctx.addIssue({ code: z.ZodIssueCode.custom, path: [variable], message });
}

function integerSchema(variable: string, { min, max }: { min: number; max?: number }) {
  return z
    .string()
    .optional()
    .superRefine((raw, ctx) => {
      if (raw === undefined) return;

      const value = raw.trim();
      if (!INTEGER_PATTERN.test(value)) {
        addIssue(ctx, variable, `must be an integer, got "${raw}"`);
        return;
      }

      const parsed = Number(value);
      if (!Number.isSafeInteger(parsed)) {
        // parseIntegerEnv would silently fall back to the default for this value.
        addIssue(ctx, variable, `must be an integer, got "${raw}" (too large)`);
        return;
      }
      if (parsed < min || (max !== undefined && parsed > max)) {
        const range = max === undefined ? `>= ${min}` : `between ${min} and ${max}`;
        addIssue(ctx, variable, `must be an integer ${range}, got ${parsed}`);
      }
    });
}

function validateProduction(env: RawEnv, ctx: z.RefinementCtx): void {
  const required = (variable: string, why: string): string | undefined => {
    const value = env[variable];
    if (value === undefined) addIssue(ctx, variable, `is required in production (${why})`);
    return value;
  };

  const statsKey = env.STATS_INTERNAL_KEY;
  if (statsKey !== undefined && statsKey === env.INTERNAL_API_KEY) {
    addIssue(
      ctx,
      "STATS_INTERNAL_KEY",
      "must differ from INTERNAL_API_KEY (one lets a caller write metrics, the other set client IPs)",
    );
  }

  // TRUST_PROXY (V-091): unset/false means every client shares the load balancer's IP for rate
  // limits, OTP throttles and audit attribution; `true` trusts any spoofed X-Forwarded-For.
  const trustProxy = env.TRUST_PROXY?.trim();
  const directExposure = env.DIRECT_EXPOSURE?.trim();

  if (trustProxy === undefined) {
    required(
      "TRUST_PROXY",
      "set it to the number of proxy hops in front of the API, e.g. 1 behind a single nginx, or a comma-separated IP/CIDR list",
    );
  } else if (INTEGER_PATTERN.test(trustProxy)) {
    const hops = Number(trustProxy);
    if (hops < 0) {
      addIssue(ctx, "TRUST_PROXY", "must be a hop count >= 1 or an IP/CIDR list");
    } else if (hops === 0 && directExposure !== "1") {
      addIssue(
        ctx,
        "TRUST_PROXY",
        "is 0, which is only allowed with DIRECT_EXPOSURE=1 (the API is reachable without any proxy in front)",
      );
    }
  } else if (BOOLEAN_WORDS.has(trustProxy.toLowerCase())) {
    addIssue(
      ctx,
      "TRUST_PROXY",
      `must be a hop count >= 1 or an IP/CIDR list, not "${trustProxy}" (true trusts spoofed X-Forwarded-For, false collapses every client onto the proxy's IP)`,
    );
  } else {
    const bad = trustProxy
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => !isTrustProxyEntry(entry));
    if (bad.length > 0) {
      addIssue(
        ctx,
        "TRUST_PROXY",
        `must be a hop count >= 1 or a list of IPs, CIDRs, loopback, linklocal or uniquelocal; invalid entries: ${bad.map((entry) => `"${entry}"`).join(", ")}`,
      );
    }
  }

  if (directExposure !== undefined) {
    if (directExposure !== "1") {
      addIssue(ctx, "DIRECT_EXPOSURE", 'must be "1" or unset');
    } else if (trustProxy !== "0") {
      addIssue(
        ctx,
        "DIRECT_EXPOSURE",
        "=1 requires TRUST_PROXY=0; unset it when a proxy is in front",
      );
    }
  }

  // WEB_CONCURRENCY (V-100): the integer rule already checks the format when it is set.
  required("WEB_CONCURRENCY", "set the number of cluster workers explicitly, e.g. 2");

  required("DATABASE_URL", "Prisma reads it directly and an empty value only fails on first query");

  const redisUrl = required("REDIS_URL", "set it explicitly; localhost is fine on a single server");
  if (redisUrl !== undefined) {
    let parsed: URL | null = null;
    try {
      parsed = new URL(redisUrl);
    } catch {
      addIssue(ctx, "REDIS_URL", "is not a valid URL");
    }
    // A local Redis is normal on a single VPS (bound to loopback), so localhost is allowed; the
    // value only has to be set explicitly so the localhost default is never used by accident.
    if (parsed && parsed.protocol !== "redis:" && parsed.protocol !== "rediss:") {
      addIssue(ctx, "REDIS_URL", "must start with redis:// or rediss://");
    }
  }

  // ALLOWED_ORIGINS also feeds better-auth trustedOrigins, so a localhost entry is a real hole.
  const allowedOrigins = required("ALLOWED_ORIGINS", "the default is a list of localhost origins");
  if (allowedOrigins !== undefined) {
    const problems = allowedOrigins
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
      .map((origin) => {
        const problem = publicHttpsUrlProblem(origin);
        return problem ? `"${origin}" ${problem}` : null;
      })
      .filter((problem): problem is string => problem !== null);

    if (problems.length > 0) addIssue(ctx, "ALLOWED_ORIGINS", problems.join("; "));
  }

  for (const variable of REQUIRED_PUBLIC_URLS) {
    const value = required(variable, "the default points at localhost");
    if (value === undefined) continue;
    const problem = publicHttpsUrlProblem(value);
    if (problem) addIssue(ctx, variable, problem);
  }

  for (const variable of OPTIONAL_PUBLIC_URLS) {
    const value = env[variable];
    if (value === undefined) continue;
    const problem = publicHttpsUrlProblem(value);
    if (problem) addIssue(ctx, variable, problem);
  }

  // Secrets: never echo the value back into logs.
  const authSecret = required("AUTH_SECRET", "better-auth signs sessions with it");
  if (authSecret !== undefined) {
    if (EXAMPLE_AUTH_SECRETS.has(authSecret)) {
      addIssue(ctx, "AUTH_SECRET", "is the example/development value; generate a new one");
    } else if (authSecret.length < MIN_AUTH_SECRET_LENGTH) {
      addIssue(ctx, "AUTH_SECRET", `must be at least ${MIN_AUTH_SECRET_LENGTH} characters`);
    }
  }

  const apiKeyHashSecret = required(
    "API_KEY_HASH_SECRET",
    "otherwise API keys are hashed with AUTH_SECRET or the development value",
  );
  if (apiKeyHashSecret !== undefined) {
    if (apiKeyHashSecret === EXAMPLE_API_KEY_HASH_SECRET) {
      addIssue(ctx, "API_KEY_HASH_SECRET", "is the example/development value; generate a new one");
    } else if (apiKeyHashSecret === authSecret) {
      addIssue(ctx, "API_KEY_HASH_SECRET", "must differ from AUTH_SECRET");
    }
  }

  const pepper = required(
    "ANALYTICS_HASH_PEPPER",
    "the default is the public example value, which makes visitor hashes reversible",
  );
  if (pepper === EXAMPLE_ANALYTICS_HASH_PEPPER) {
    addIssue(ctx, "ANALYTICS_HASH_PEPPER", "is the example value; generate a new one");
  }

  const revalidateSecret = required(
    "PORTFOLIO_REVALIDATE_SECRET",
    "the default is the development value",
  );
  if (revalidateSecret === EXAMPLE_PORTFOLIO_REVALIDATE_SECRET) {
    addIssue(ctx, "PORTFOLIO_REVALIDATE_SECRET", "is the development value; generate a new one");
  }

  // Optional shared secrets sent as `x-internal-key` (V-024, V-151). Unset disables the feature;
  // when set they must be long enough that guessing one is not a way to spoof client IPs or
  // write arbitrary usage metrics.
  for (const variable of INTERNAL_SHARED_SECRETS) {
    const value = env[variable];
    if (value !== undefined && value.length < MIN_INTERNAL_SECRET_LENGTH) {
      addIssue(ctx, variable, `must be at least ${MIN_INTERNAL_SECRET_LENGTH} characters when set`);
    }
  }

  // The site refresh hook (utils/siteRevalidate.ts): optional, but a set secret must be strong
  // and have a site to call.
  const siteSecret = env.SITE_REVALIDATE_SECRET;
  if (siteSecret !== undefined && siteSecret.length < MIN_INTERNAL_SECRET_LENGTH) {
    addIssue(
      ctx,
      "SITE_REVALIDATE_SECRET",
      `must be at least ${MIN_INTERNAL_SECRET_LENGTH} characters when set`,
    );
  }
  if (siteSecret && !env.SITE_URL) {
    addIssue(ctx, "SITE_URL", "is required when SITE_REVALIDATE_SECRET is set");
  }
}

const environmentSchema = z
  .object({
    NODE_ENV: z
      .string()
      .optional()
      .refine((value) => value === undefined || (NODE_ENVS as readonly string[]).includes(value), {
        message: `must be one of ${NODE_ENVS.join(", ")}`,
      }),
    ...Object.fromEntries(
      Object.entries(INTEGER_VARIABLES).map(([variable, bounds]) => [
        variable,
        integerSchema(variable, bounds),
      ]),
    ),
  })
  .passthrough()
  .superRefine((env, ctx) => {
    const ipHeaders = (env as RawEnv).AUTH_IP_ADDRESS_HEADERS;
    if (
      ipHeaders !== undefined &&
      ipHeaders
        .split(",")
        .map((header) => header.trim().toLowerCase())
        .includes("x-forwarded-client-ip")
    ) {
      addIssue(
        ctx,
        "AUTH_IP_ADDRESS_HEADERS",
        "must not include x-forwarded-client-ip: it is only trusted together with x-internal-key = INTERNAL_API_KEY, and better-auth would accept it from any client",
      );
    }

    if (env.NODE_ENV === "production") validateProduction(env as RawEnv, ctx);
  });

/** Drops unset and blank values: compose turns `${VAR}` with VAR unset into an empty string. */
function normalizeEnv(env: RawEnv): RawEnv {
  const normalized: RawEnv = {};
  for (const [key, value] of Object.entries(env)) {
    if (value !== undefined && value.trim() !== "") normalized[key] = value;
  }
  return normalized;
}

function formatEnvironmentIssues(issues: z.ZodIssue[]): string {
  const lines = issues.map((issue) => `  - ${String(issue.path[0] ?? "(env)")}: ${issue.message}`);
  const noun = issues.length === 1 ? "problem" : "problems";

  return [
    `Invalid environment configuration (${issues.length} ${noun}). Fix all of them before starting the server:`,
    ...lines,
  ].join("\n");
}

/**
 * Validates the raw environment and throws one Error listing every failing variable.
 * Production-only rules apply when NODE_ENV=production; NODE_ENV and integer formats are checked
 * in every environment.
 */
export function validateEnvironmentConfig(env: RawEnv = process.env): void {
  const result = environmentSchema.safeParse(normalizeEnv(env));
  if (!result.success) {
    throw new Error(formatEnvironmentIssues(result.error.issues));
  }
}
