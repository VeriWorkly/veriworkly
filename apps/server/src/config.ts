import os from "node:os";
import dotenv from "dotenv";

import { parseIntegerEnv } from "./config/parseEnv.js";

// Never under Vitest (V-257): a developer's `.env` can hold live credentials and the production
// database URL, and a test run must not inherit them. Tests set the variables they need.
if (!process.env.VITEST) dotenv.config();

function getCpuCount(): number {
  if (typeof os.availableParallelism === "function") return os.availableParallelism();

  return os.cpus().length || 1;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value == null) return fallback;

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

const nodeEnv = process.env.NODE_ENV || "development";

/** The one production check: everything else imports this. */
export const isProduction = nodeEnv === "production";
export const isDevelopment = nodeEnv === "development";

function parseTrustProxy(value: string | undefined): boolean | string | number {
  if (value == null) return false;

  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();

  if (["true", "yes", "on"].includes(lower)) return true;
  if (["false", "no", "off"].includes(lower)) return false;

  const num = Number(trimmed);

  if (!Number.isNaN(num)) return num;

  return trimmed;
}

function getOriginSafe(urlStr: string): string | null {
  try {
    return new URL(urlStr).origin;
  } catch {
    return null;
  }
}

const defaultStudioUrl = isProduction ? "https://app.veriworkly.com" : "http://localhost:3001";
const configuredStudioUrl =
  process.env.STUDIO_URL || process.env.NEXT_PUBLIC_APP_URL || defaultStudioUrl;
const configuredStudioLoginUrl =
  process.env.STUDIO_LOGIN_URL || `${configuredStudioUrl.replace(/\/+$/, "")}/login`;
const studioOrigin = getOriginSafe(configuredStudioUrl);

export const config = {
  nodeEnv,

  port: parseIntegerEnv(process.env.PORT, 8080),

  allowedOrigins: Array.from(
    new Set(
      (
        process.env.ALLOWED_ORIGINS ||
        "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004,http://localhost:8080"
      )
        .split(",")
        .map((origin) => origin.trim())
        .concat(studioOrigin || [])
        .filter(Boolean),
    ),
  ),

  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },

  auth: {
    secret: process.env.AUTH_SECRET || "dev-auth-secret",
    baseUrl: process.env.AUTH_BASE_URL || "http://localhost:8080",
    studioUrl: configuredStudioUrl,
    studioLoginUrl: configuredStudioLoginUrl,
    ipAddressHeaders: (
      process.env.AUTH_IP_ADDRESS_HEADERS ||
      "x-client-ip,x-forwarded-for,x-real-ip,cf-connecting-ip"
    )
      .split(",")
      .map((header) => header.trim().toLowerCase())
      // Never trusted by name: it is honoured only with `x-internal-key` = INTERNAL_API_KEY
      // (`utils/requestIp.ts`), and better-auth would read it from anyone (V-151).
      .filter((header) => Boolean(header) && header !== "x-forwarded-client-ip"),
    sessionTtlSeconds: parseIntegerEnv(process.env.AUTH_SESSION_TTL_SECONDS, 2592000),
    sessionResetTtlOnUse: parseIntegerEnv(process.env.AUTH_SESSION_RESET_TTL_ON_USE, 86400),
    sessionCacheEnabled: parseBoolean(process.env.AUTH_SESSION_CACHE_ENABLED, isProduction),
    sessionCacheMaxAgeSeconds: parseIntegerEnv(process.env.AUTH_SESSION_CACHE_MAX_AGE_SECONDS, 900),
    otpTtlSeconds: parseIntegerEnv(process.env.AUTH_OTP_TTL_SECONDS, 300),
    otpAllowedAttempts: parseIntegerEnv(process.env.AUTH_OTP_ALLOWED_ATTEMPTS, 3),
    emailProvider: process.env.AUTH_EMAIL_PROVIDER || "console",
    emailFrom: process.env.AUTH_EMAIL_FROM || "VeriWorkly <no-reply@veriworkly.com>",
    resendApiKey: process.env.RESEND_API_KEY || "",
    smtpHost: process.env.AUTH_SMTP_HOST || "",
    smtpPort: parseIntegerEnv(process.env.AUTH_SMTP_PORT, 587),
    smtpSecure: parseBoolean(process.env.AUTH_SMTP_SECURE, false),
    smtpUser: process.env.AUTH_SMTP_USER || "",
    smtpPass: process.env.AUTH_SMTP_PASS || "",
    cookieDomain: process.env.AUTH_COOKIE_DOMAIN || undefined,
    googleClientId: process.env.GOOGLE_CLIENT_ID || "",
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    githubClientId: process.env.GITHUB_CLIENT_ID || "",
    githubClientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    linkedinClientId: process.env.LINKEDIN_CLIENT_ID || "",
    linkedinClientSecret: process.env.LINKEDIN_CLIENT_SECRET || "",
  },

  apiKeys: {
    hashSecret: process.env.API_KEY_HASH_SECRET || process.env.AUTH_SECRET || "dev-api-key-secret",
    authCacheTtlSeconds: parseIntegerEnv(process.env.API_KEY_AUTH_CACHE_TTL_SECONDS, 300),
    lastUsedTouchIntervalSeconds: parseIntegerEnv(
      process.env.API_KEY_LAST_USED_TOUCH_INTERVAL_SECONDS,
      300,
    ),
    defaultRateLimit: parseIntegerEnv(process.env.API_KEY_DEFAULT_RATE_LIMIT, 20),
    // Must be a separate knob from the default. When the ceiling was defined as the default,
    // normalizeRateLimit() clamped every requested value back down to it and the per-key
    // rateLimit column could only ever be lowered, never raised.
    maxRateLimit: parseIntegerEnv(process.env.API_KEY_MAX_RATE_LIMIT, 600),
    defaultScopes: (process.env.API_KEY_DEFAULT_SCOPES || "user:read")
      .split(",")
      .map((scope) => scope.trim())
      .filter(Boolean),
    defaultKeyLifetimeDays: parseIntegerEnv(process.env.API_KEY_DEFAULT_LIFETIME_DAYS, 365),
  },

  server: {
    trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
    clusteringEnabled: parseBoolean(process.env.CLUSTERING_ENABLED, isProduction),
    workers: (() => {
      const requested = parseIntegerEnv(
        process.env.WEB_CONCURRENCY || process.env.SERVER_WORKERS,
        0,
      );
      return requested > 0 ? requested : getCpuCount();
    })(),
  },

  admin: {
    email: (process.env.ADMIN_EMAIL || "").toLowerCase(),
  },

  rateLimit: {
    windowMs: parseIntegerEnv(process.env.RATE_LIMIT_WINDOW_MS, 900000),
    maxRequests: parseIntegerEnv(process.env.RATE_LIMIT_MAX_REQUESTS, 100),
    authWindowMs: parseIntegerEnv(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 60000),
    authMaxRequests: parseIntegerEnv(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS, 20),
    // The per-route limits above are keyed by (method, path, ip), so they bound each endpoint
    // independently and never bound a client's total load — with ~40 endpoints one IP could
    // legitimately issue 40x the headline number. This coarse bucket is the ceiling underneath
    // them; it should sit well above any real single-user session.
    globalWindowMs: parseIntegerEnv(process.env.GLOBAL_RATE_LIMIT_WINDOW_MS, 900000),
    globalMaxRequests: parseIntegerEnv(process.env.GLOBAL_RATE_LIMIT_MAX_REQUESTS, 1000),
  },

  logging: {
    level: process.env.LOG_LEVEL || "info",
    // AuditLog gets a row per 4xx/5xx in production. Without pruning it is the fastest-growing
    // table in the schema and nothing else ever deletes from it.
    auditRetentionDays: parseIntegerEnv(process.env.AUDIT_LOG_RETENTION_DAYS, 90),
  },

  ai: {
    apiKey: process.env.AI_API_KEY || "",
    baseUrl: process.env.AI_BASE_URL || "",
    timeoutMs: parseIntegerEnv(process.env.AI_TIMEOUT_MS, 45000),
    rateLimitWindowMs: parseIntegerEnv(process.env.AI_RATE_LIMIT_WINDOW_MS, 60000),
    rateLimitMaxRequests: parseIntegerEnv(process.env.AI_RATE_LIMIT_MAX_REQUESTS, 20),
    siteUrl: process.env.SITE_URL || "",

    // Each private policy is its own file/secret so it's obvious which one governs which
    // feature — general AI writing actions, ATS AI-analysis prompts, and the deterministic
    // ATS scoring engine's rules/weights/keyword dictionary are unrelated concerns that used
    // to live in one combined JSON blob.
    actionsPolicyPath: process.env.AI_ACTIONS_POLICY_PATH || "",
    actionsPolicyJson: process.env.AI_ACTIONS_POLICY_JSON || "",
    atsAiPolicyPath: process.env.ATS_AI_POLICY_PATH || "",
    atsAiPolicyJson: process.env.ATS_AI_POLICY_JSON || "",
    atsEnginePolicyPath: process.env.ATS_ENGINE_POLICY_PATH || "",
    atsEnginePolicyJson: process.env.ATS_ENGINE_POLICY_JSON || "",
  },

  cache: {
    roadmapTtlSeconds: parseIntegerEnv(process.env.ROADMAP_CACHE_TTL_SECONDS, 2592000),
    roadmapStatsTtlSeconds: parseIntegerEnv(process.env.ROADMAP_STATS_CACHE_TTL_SECONDS, 2592000),
    githubStatsTtlSeconds: parseIntegerEnv(process.env.GITHUB_STATS_CACHE_TTL_SECONDS, 43200),
    changelogTtlSeconds: parseIntegerEnv(process.env.CHANGELOG_CACHE_TTL_SECONDS, 2592000),
  },

  metrics: {
    flushCron: process.env.USAGE_METRICS_FLUSH_CRON || "10 0 * * *",
    flushTimezone: process.env.USAGE_METRICS_FLUSH_TIMEZONE || "UTC",
    redisRetentionDays: parseIntegerEnv(process.env.USAGE_METRICS_REDIS_RETENTION_DAYS, 10),
    // `x-internal-key` value that marks a `/stats/events` call as internal (V-024). Unset means
    // no caller is internal.
    statsInternalKey: process.env.STATS_INTERNAL_KEY || "",
  },

  // Trusted server-to-server calls (studio/portfolio SSR): `x-internal-key` equal to this lets
  // the caller name the real client IP in `x-forwarded-client-ip` (V-151). Unset disables it.
  internal: {
    apiKey: process.env.INTERNAL_API_KEY || "",
  },

  github: {
    owner: process.env.GITHUB_OWNER || "",
    repo: process.env.GITHUB_REPO || "",
    token: process.env.GITHUB_TOKEN || "",
    projectUrl: process.env.GITHUB_PROJECT_URL || "",
    syncCron: process.env.GITHUB_SYNC_CRON || "0 0,12 * * *",
    syncTimezone: process.env.GITHUB_SYNC_TIMEZONE || "UTC",
    syncEnabled: parseBoolean(process.env.GITHUB_SYNC_ENABLED, true),
    syncApiKey: process.env.INTERNAL_SYNC_API_KEY || "",
  },

  changelogSync: {
    enabled: parseBoolean(process.env.CHANGELOG_RELEASE_SYNC_ENABLED, true),
    cron: process.env.CHANGELOG_RELEASE_SYNC_CRON || "0 6 * * *",
    timezone: process.env.CHANGELOG_RELEASE_SYNC_TIMEZONE || "UTC",
    // Floor between two startup syncs. Releases ship on a human cadence, so re-scanning
    // GitHub on every boot (and, under `tsx watch`, on every file save) buys nothing.
    minIntervalSeconds: parseIntegerEnv(
      process.env.CHANGELOG_RELEASE_SYNC_MIN_INTERVAL_SECONDS,
      21600,
    ),
  },

  // The marketing site's refresh hook (apps/site/app/api/revalidate). Both unset: off.
  site: {
    url: (process.env.SITE_URL || "").replace(/\/+$/, ""),
    revalidateSecret: process.env.SITE_REVALIDATE_SECRET || "",
  },

  portfolio: {
    graceDays: parseIntegerEnv(process.env.PORTFOLIO_GRACE_DAYS, 7),
    url: process.env.PORTFOLIO_URL || "http://localhost:3004",
    revalidateSecret: process.env.PORTFOLIO_REVALIDATE_SECRET || "dev-revalidate-secret",
  },

  dodo: {
    apiKey: process.env.DODO_PAYMENTS_API_KEY || "",
    webhookSecret: process.env.DODO_PAYMENTS_WEBHOOK_SECRET || "",
    environment: (process.env.DODO_PAYMENTS_ENVIRONMENT || "test_mode") as
      "test_mode" | "live_mode",
    bundleOneDayProductId: process.env.DODO_PAYMENTS_BUNDLE_ONE_DAY_PRODUCT_ID || "",
    bundleSevenDayProductId: process.env.DODO_PAYMENTS_BUNDLE_SEVEN_DAY_PRODUCT_ID || "",
    aiCreditsMonthlyProductId: process.env.DODO_PAYMENTS_AI_CREDITS_MONTHLY_PRODUCT_ID || "",
    aiCreditsAnnualProductId: process.env.DODO_PAYMENTS_AI_CREDITS_ANNUAL_PRODUCT_ID || "",
    portfolioProMonthlyProductId: process.env.DODO_PAYMENTS_PORTFOLIO_PRO_MONTHLY_PRODUCT_ID || "",
    portfolioProAnnualProductId: process.env.DODO_PAYMENTS_PORTFOLIO_PRO_ANNUAL_PRODUCT_ID || "",
    bundleMonthlyProductId: process.env.DODO_PAYMENTS_BUNDLE_MONTHLY_PRODUCT_ID || "",
    bundleAnnualProductId: process.env.DODO_PAYMENTS_BUNDLE_ANNUAL_PRODUCT_ID || "",
    creditPack250ProductId: process.env.DODO_PAYMENTS_CREDIT_PACK_250_PRODUCT_ID || "",
    creditPack500ProductId: process.env.DODO_PAYMENTS_CREDIT_PACK_500_PRODUCT_ID || "",
    // Display prices in USD cents; Dodo charges the product's own price, so keep them in step.
    creditPack250PriceCents: parseIntegerEnv(process.env.CREDIT_PACK_250_PRICE_CENTS, 299),
    creditPack500PriceCents: parseIntegerEnv(process.env.CREDIT_PACK_500_PRICE_CENTS, 499),
    checkoutReturnUrl:
      process.env.DODO_PAYMENTS_CHECKOUT_RETURN_URL ||
      "http://localhost:3001/billing?checkout=complete",
    checkoutCancelUrl:
      process.env.DODO_PAYMENTS_CHECKOUT_CANCEL_URL ||
      "http://localhost:3001/billing?checkout=cancelled",
    portalReturnUrl: process.env.DODO_PAYMENTS_PORTAL_RETURN_URL || "http://localhost:3001/billing",
  },

  r2: {
    endpoint: process.env.R2_ENDPOINT || "",
    bucket: process.env.R2_BUCKET || "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    publicBaseUrl: (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/+$/, ""),
  },

  // Growth programs (affiliate, campus ambassador) are still being finished. They stay on in
  // non-production environments by default so they can be built/tested, and off in production
  // until explicitly turned on via env vars once the program is ready to launch publicly.
  growth: {
    affiliateProgramEnabled: parseBoolean(process.env.AFFILIATE_PROGRAM_ENABLED, !isProduction),
    ambassadorProgramEnabled: parseBoolean(process.env.AMBASSADOR_PROGRAM_ENABLED, !isProduction),
  },
};
