import { config, isProduction } from "#config";

import { logger } from "#utils/logger";
import { prisma } from "#utils/prisma";

function ensure(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function ensurePositiveInteger(value: number, name: string): void {
  ensure(Number.isInteger(value) && value > 0, `${name} must be a positive integer`);
}

export function validateAuthRuntimeConfig(): void {
  ensure(Boolean(config.admin.email), "ADMIN_EMAIL must be configured for admin auth");
  ensure(Boolean(config.auth.secret), "AUTH_SECRET must be configured");
  ensure(Boolean(config.auth.baseUrl), "AUTH_BASE_URL must be configured");
  ensurePositiveInteger(config.auth.sessionTtlSeconds, "AUTH_SESSION_TTL_SECONDS");
  ensurePositiveInteger(config.auth.sessionResetTtlOnUse, "AUTH_SESSION_RESET_TTL_ON_USE");
  ensurePositiveInteger(
    config.auth.sessionCacheMaxAgeSeconds,
    "AUTH_SESSION_CACHE_MAX_AGE_SECONDS",
  );
  ensurePositiveInteger(config.auth.otpTtlSeconds, "AUTH_OTP_TTL_SECONDS");
  ensurePositiveInteger(config.auth.otpAllowedAttempts, "AUTH_OTP_ALLOWED_ATTEMPTS");
  ensurePositiveInteger(config.apiKeys.authCacheTtlSeconds, "API_KEY_AUTH_CACHE_TTL_SECONDS");
  ensurePositiveInteger(
    config.apiKeys.lastUsedTouchIntervalSeconds,
    "API_KEY_LAST_USED_TOUCH_INTERVAL_SECONDS",
  );

  if (config.auth.emailProvider === "smtp") {
    ensure(Boolean(config.auth.smtpHost), "AUTH_SMTP_HOST must be configured when using SMTP");
    ensure(Boolean(config.auth.smtpUser), "AUTH_SMTP_USER must be configured when using SMTP");
    ensure(Boolean(config.auth.smtpPass), "AUTH_SMTP_PASS must be configured when using SMTP");
  }

  if (isProduction) {
    ensure(config.auth.emailProvider === "smtp", "AUTH_EMAIL_PROVIDER must be smtp in production");
    ensure(
      config.auth.secret !== "dev-auth-secret",
      "AUTH_SECRET must be a strong non-default value in production",
    );
    ensure(
      config.auth.baseUrl.startsWith("https://"),
      "AUTH_BASE_URL must use https in production",
    );
    ensure(config.server.trustProxy !== true, "TRUST_PROXY must use an explicit hop count or CIDR");
    ensure(
      Boolean(process.env.API_KEY_HASH_SECRET) && config.apiKeys.hashSecret !== config.auth.secret,
      "API_KEY_HASH_SECRET must be a dedicated non-empty value in production",
    );
  }
}

export async function ensureAdminUserExists(): Promise<void> {
  const email = config.admin.email;

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true },
  });

  if (!existing) {
    await prisma.user.create({
      data: {
        email,
        name: "Admin",
      },
    });

    logger.info("Admin user created for auth", { email });
    return;
  }

  if (existing.name !== "Admin") {
    await prisma.user.update({
      where: { id: existing.id },
      data: { name: "Admin" },
    });

    logger.info("Admin user normalized for auth", { email });
  }
}
