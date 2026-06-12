import dotenv from "dotenv";

dotenv.config();

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value == null) return fallback;

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

const defaultAuthSessionCacheEnabled =
  (process.env.NODE_ENV || "development") === "production" ? "true" : "false";

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

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",

  port: parseInt(process.env.PORT || "8080", 10),

  allowedOrigins: (
    process.env.ALLOWED_ORIGINS ||
    "http://localhost:3000,http://localhost:3001,http://localhost:3004"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),

  database: {
    url: process.env.DATABASE_URL || "",
  },

  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
  },

  jwt: {
    secret: process.env.JWT_SECRET || "dev-secret-key",
  },

  auth: {
    secret: process.env.AUTH_SECRET || "dev-auth-secret",
    baseUrl: process.env.AUTH_BASE_URL || "http://localhost:8080",
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
    otpTtlSeconds: parseInt(process.env.AUTH_OTP_TTL_SECONDS || "600", 10),
    otpAllowedAttempts: parseInt(process.env.AUTH_OTP_ALLOWED_ATTEMPTS || "3", 10),
    emailProvider: process.env.AUTH_EMAIL_PROVIDER || "console",
    emailFrom: process.env.AUTH_EMAIL_FROM || "VeriWorkly <no-reply@veriworkly.com>",
    smtpHost: process.env.AUTH_SMTP_HOST || "",
    smtpPort: parseInt(process.env.AUTH_SMTP_PORT || "587", 10),
    smtpSecure: parseBoolean(process.env.AUTH_SMTP_SECURE, false),
    smtpUser: process.env.AUTH_SMTP_USER || "",
    smtpPass: process.env.AUTH_SMTP_PASS || "",
    cookieDomain: process.env.AUTH_COOKIE_DOMAIN || undefined,
  },

  apiKeys: {
    hashSecret: process.env.API_KEY_HASH_SECRET || process.env.AUTH_SECRET || "dev-api-key-secret",
    authCacheTtlSeconds: parseInt(process.env.API_KEY_AUTH_CACHE_TTL_SECONDS || "300", 10),
    lastUsedTouchIntervalSeconds: parseInt(
      process.env.API_KEY_LAST_USED_TOUCH_INTERVAL_SECONDS || "300",
      10,
    ),
    defaultRateLimit: parseInt(process.env.API_KEY_DEFAULT_RATE_LIMIT || "20", 10),
    defaultScopes: (process.env.API_KEY_DEFAULT_SCOPES || "user:read")
      .split(",")
      .map((scope) => scope.trim())
      .filter(Boolean),
    defaultKeyLifetimeDays: parseInt(process.env.API_KEY_DEFAULT_LIFETIME_DAYS || "365", 10),
  },

  server: {
    trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  },

  admin: {
    email: (process.env.ADMIN_EMAIL || "").toLowerCase(),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
    authWindowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || "60000", 10),
    authMaxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || "20", 10),
  },

  logging: {
    level: process.env.LOG_LEVEL || "info",
  },

  ai: {
    apiKey:
      (process.env.NODE_ENV || "development") === "production"
        ? process.env.OPENROUTER_API_KEY || ""
        : process.env.NVIDIA_API_KEY || "",
    baseUrl:
      (process.env.NODE_ENV || "development") === "production"
        ? process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1"
        : process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
    timeoutMs: parseInt(process.env.AI_TIMEOUT_MS || "120000", 10),
    rateLimitWindowMs: parseInt(process.env.AI_RATE_LIMIT_WINDOW_MS || "60000", 10),
    rateLimitMaxRequests: parseInt(process.env.AI_RATE_LIMIT_MAX_REQUESTS || "20", 10),
    siteUrl: process.env.SITE_URL || "",
    privateConfigPath: process.env.AI_PRIVATE_CONFIG_PATH || "",
    privateConfigJson: process.env.AI_PRIVATE_CONFIG_JSON || "",
  },

  cache: {
    roadmapTtlSeconds: parseInt(process.env.ROADMAP_CACHE_TTL_SECONDS || "2592000", 10),
    roadmapStatsTtlSeconds: parseInt(process.env.ROADMAP_STATS_CACHE_TTL_SECONDS || "2592000", 10),
    roadmapTagsTtlSeconds: parseInt(process.env.ROADMAP_TAGS_CACHE_TTL_SECONDS || "2592000", 10),
    githubStatsTtlSeconds: parseInt(process.env.GITHUB_STATS_CACHE_TTL_SECONDS || "43200", 10),
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

  portfolio: {
    graceDays: parseInt(process.env.PORTFOLIO_GRACE_DAYS || "7", 10),
    url: process.env.PORTFOLIO_URL || "http://localhost:3004",
    revalidateSecret: process.env.PORTFOLIO_REVALIDATE_SECRET || "dev-revalidate-secret",
  },

  dodo: {
    apiKey: process.env.DODO_PAYMENTS_API_KEY || "",
    webhookSecret: process.env.DODO_PAYMENTS_WEBHOOK_SECRET || "",
    environment: (process.env.DODO_PAYMENTS_ENVIRONMENT || "test_mode") as
      | "test_mode"
      | "live_mode",
    sevenDayProductId: process.env.DODO_PAYMENTS_SEVEN_DAY_PRODUCT_ID || "",
    monthlyProductId: process.env.DODO_PAYMENTS_MONTHLY_PRODUCT_ID || "",
    annualProductId: process.env.DODO_PAYMENTS_ANNUAL_PRODUCT_ID || "",
    aiCreditsMonthlyProductId: process.env.DODO_PAYMENTS_AI_CREDITS_MONTHLY_PRODUCT_ID || "",
    aiCreditsAnnualProductId: process.env.DODO_PAYMENTS_AI_CREDITS_ANNUAL_PRODUCT_ID || "",
    portfolioProMonthlyProductId: process.env.DODO_PAYMENTS_PORTFOLIO_PRO_MONTHLY_PRODUCT_ID || "",
    portfolioProAnnualProductId: process.env.DODO_PAYMENTS_PORTFOLIO_PRO_ANNUAL_PRODUCT_ID || "",
    bundleMonthlyProductId: process.env.DODO_PAYMENTS_BUNDLE_MONTHLY_PRODUCT_ID || "",
    bundleAnnualProductId: process.env.DODO_PAYMENTS_BUNDLE_ANNUAL_PRODUCT_ID || "",
    creditPack100ProductId: process.env.DODO_PAYMENTS_CREDIT_PACK_100_PRODUCT_ID || "",
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
};

export const isDevelopment = config.nodeEnv === "development";
export const isProduction = config.nodeEnv === "production";
