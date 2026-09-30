import os from "node:os";
import dotenv from "dotenv";

dotenv.config();

function getCpuCount(): number {
  if (typeof os.availableParallelism === "function") return os.availableParallelism();

  return os.cpus().length || 1;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value == null) return fallback;

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

const defaultAuthSessionCacheEnabled =
  (process.env.NODE_ENV || "development") === "production" ? "true" : "false";

const isProductionEnv = (process.env.NODE_ENV || "development") === "production";

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

const defaultStudioUrl = isProductionEnv ? "https://app.veriworkly.com" : "http://localhost:3001";
const configuredStudioUrl =
  process.env.STUDIO_URL || process.env.NEXT_PUBLIC_APP_URL || defaultStudioUrl;
const configuredStudioLoginUrl =
  process.env.STUDIO_LOGIN_URL || `${configuredStudioUrl.replace(/\/+$/, "")}/login`;
const studioOrigin = getOriginSafe(configuredStudioUrl);

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",

  port: parseInt(process.env.PORT || "8080", 10),

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

  database: {
    url: process.env.DATABASE_URL || "",
  },

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
      .filter(Boolean),
    sessionTtlSeconds: parseInt(process.env.AUTH_SESSION_TTL_SECONDS || "2592000", 10),
    sessionResetTtlOnUse: parseInt(process.env.AUTH_SESSION_RESET_TTL_ON_USE || "86400", 10),
    sessionCacheEnabled: parseBoolean(
      process.env.AUTH_SESSION_CACHE_ENABLED,
      defaultAuthSessionCacheEnabled === "true",
    ),
    sessionCacheMaxAgeSeconds: parseInt(
      process.env.AUTH_SESSION_CACHE_MAX_AGE_SECONDS || "900",
      10,
    ),
    otpTtlSeconds: parseInt(process.env.AUTH_OTP_TTL_SECONDS || "300", 10),
    otpAllowedAttempts: parseInt(process.env.AUTH_OTP_ALLOWED_ATTEMPTS || "3", 10),
    emailProvider: process.env.AUTH_EMAIL_PROVIDER || "console",
    emailFrom: process.env.AUTH_EMAIL_FROM || "VeriWorkly <no-reply@veriworkly.com>",
    resendApiKey: process.env.RESEND_API_KEY || "",
    smtpHost: process.env.AUTH_SMTP_HOST || "",
    smtpPort: parseInt(process.env.AUTH_SMTP_PORT || "587", 10),
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
    authCacheTtlSeconds: parseInt(process.env.API_KEY_AUTH_CACHE_TTL_SECONDS || "300", 10),
    lastUsedTouchIntervalSeconds: parseInt(
      process.env.API_KEY_LAST_USED_TOUCH_INTERVAL_SECONDS || "300",
      10,
    ),
    defaultRateLimit: parseInt(process.env.API_KEY_DEFAULT_RATE_LIMIT || "20", 10),
    // Must be a separate knob from the default. When the ceiling was defined as the default,
    // normalizeRateLimit() clamped every requested value back down to it and the per-key
    // rateLimit column could only ever be lowered, never raised.
    maxRateLimit: parseInt(process.env.API_KEY_MAX_RATE_LIMIT || "600", 10),
    defaultScopes: (process.env.API_KEY_DEFAULT_SCOPES || "user:read")
      .split(",")
      .map((scope) => scope.trim())
      .filter(Boolean),
    defaultKeyLifetimeDays: parseInt(process.env.API_KEY_DEFAULT_LIFETIME_DAYS || "365", 10),
  },

  server: {
    trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
    clusteringEnabled: parseBoolean(
      process.env.CLUSTERING_ENABLED,
      (process.env.NODE_ENV || "development") === "production",
    ),
    workers:
      parseInt(process.env.WEB_CONCURRENCY || process.env.SERVER_WORKERS || "", 10) ||
      getCpuCount(),
  },

  admin: {
    email: (process.env.ADMIN_EMAIL || "").toLowerCase(),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
    authWindowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || "60000", 10),
    authMaxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || "20", 10),
    // The per-route limits above are keyed by (method, path, ip), so they bound each endpoint
    // independently and never bound a client's total load — with ~40 endpoints one IP could
    // legitimately issue 40x the headline number. This coarse bucket is the ceiling underneath
    // them; it should sit well above any real single-user session.
    globalWindowMs: parseInt(process.env.GLOBAL_RATE_LIMIT_WINDOW_MS || "900000", 10),
    globalMaxRequests: parseInt(process.env.GLOBAL_RATE_LIMIT_MAX_REQUESTS || "1000", 10),
  },

  logging: {
    level: process.env.LOG_LEVEL || "info",
    // AuditLog gets a row per 4xx/5xx in production. Without pruning it is the fastest-growing
    // table in the schema and nothing else ever deletes from it.
    auditRetentionDays: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || "90", 10),
  },

  ai: {
    apiKey: process.env.AI_API_KEY || "",
    baseUrl: process.env.AI_BASE_URL || "",
    timeoutMs: parseInt(process.env.AI_TIMEOUT_MS || "120000", 10),
    rateLimitWindowMs: parseInt(process.env.AI_RATE_LIMIT_WINDOW_MS || "60000", 10),
    rateLimitMaxRequests: parseInt(process.env.AI_RATE_LIMIT_MAX_REQUESTS || "20", 10),
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
    roadmapTtlSeconds: parseInt(process.env.ROADMAP_CACHE_TTL_SECONDS || "2592000", 10),
    roadmapStatsTtlSeconds: parseInt(process.env.ROADMAP_STATS_CACHE_TTL_SECONDS || "2592000", 10),
    roadmapTagsTtlSeconds: parseInt(process.env.ROADMAP_TAGS_CACHE_TTL_SECONDS || "2592000", 10),
    githubStatsTtlSeconds: parseInt(process.env.GITHUB_STATS_CACHE_TTL_SECONDS || "43200", 10),
    changelogTtlSeconds: parseInt(process.env.CHANGELOG_CACHE_TTL_SECONDS || "2592000", 10),
  },

  metrics: {
    flushCron: process.env.USAGE_METRICS_FLUSH_CRON || "10 0 * * *",
    flushTimezone: process.env.USAGE_METRICS_FLUSH_TIMEZONE || "UTC",
    redisRetentionDays: parseInt(process.env.USAGE_METRICS_REDIS_RETENTION_DAYS || "10", 10),
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
    minIntervalSeconds: parseInt(
      process.env.CHANGELOG_RELEASE_SYNC_MIN_INTERVAL_SECONDS || "21600",
      10,
    ),
  },

  portfolio: {
    graceDays: parseInt(process.env.PORTFOLIO_GRACE_DAYS || "7", 10),
    url: process.env.PORTFOLIO_URL || "http://localhost:3004",
    revalidateSecret: process.env.PORTFOLIO_REVALIDATE_SECRET || "dev-revalidate-secret",
  },

  dodo: {
    apiKey: process.env.DODO_PAYMENTS_API_KEY || "",
    webhookSecret: process.env.DODO_PAYMENTS_WEBHOOK_SECRET || "",
    environment: (process.env.DODO_PAYMENTS_ENVIRONMENT || "test_mode") as
      "test_mode" | "live_mode",
    portfolioProSevenDayProductId:
      process.env.DODO_PAYMENTS_PORTFOLIO_PRO_SEVEN_DAY_PRODUCT_ID || "",
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
    affiliateProgramEnabled: parseBoolean(process.env.AFFILIATE_PROGRAM_ENABLED, !isProductionEnv),
    ambassadorProgramEnabled: parseBoolean(
      process.env.AMBASSADOR_PROGRAM_ENABLED,
      !isProductionEnv,
    ),
  },
};

export const isDevelopment = config.nodeEnv === "development";
export const isProduction = config.nodeEnv === "production";
