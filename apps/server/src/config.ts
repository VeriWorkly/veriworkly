import dotenv from "dotenv";

dotenv.config();

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value == null) return fallback;

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

const defaultAuthSessionCacheEnabled =
  (process.env.NODE_ENV || "development") === "production" ? "true" : "false";

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "8080", 10),
  allowedOrigins: (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
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
    sessionCacheEnabled:
      (process.env.AUTH_SESSION_CACHE_ENABLED || defaultAuthSessionCacheEnabled) === "true",
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
    smtpSecure: (process.env.AUTH_SMTP_SECURE || "false") === "true",
    smtpUser: process.env.AUTH_SMTP_USER || "",
    smtpPass: process.env.AUTH_SMTP_PASS || "",
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
    trustProxy: parseBoolean(process.env.TRUST_PROXY, false),
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
    syncEnabled: (process.env.GITHUB_SYNC_ENABLED || "true") === "true",
    syncApiKey: process.env.INTERNAL_SYNC_API_KEY || "",
  },
};

export const isDevelopment = config.nodeEnv === "development";
export const isProduction = config.nodeEnv === "production";
