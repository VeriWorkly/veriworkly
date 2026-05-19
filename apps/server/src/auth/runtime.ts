import { config, isProduction } from "#config";

import { logger } from "#utils/logger";
import { prisma } from "#utils/prisma";

function ensure(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function validateAuthRuntimeConfig(): void {
  ensure(Boolean(config.admin.email), "ADMIN_EMAIL must be configured for admin auth");
  ensure(Boolean(config.auth.secret), "AUTH_SECRET must be configured");
  ensure(Boolean(config.auth.baseUrl), "AUTH_BASE_URL must be configured");

  if (config.auth.emailProvider === "smtp") {
    ensure(Boolean(config.auth.smtpHost), "AUTH_SMTP_HOST must be configured when using SMTP");
    ensure(Boolean(config.auth.smtpUser), "AUTH_SMTP_USER must be configured when using SMTP");
    ensure(Boolean(config.auth.smtpPass), "AUTH_SMTP_PASS must be configured when using SMTP");
  }

  if (isProduction) {
    ensure(
      config.auth.secret !== "dev-auth-secret",
      "AUTH_SECRET must be a strong non-default value in production",
    );
    ensure(
      config.auth.baseUrl.startsWith("https://"),
      "AUTH_BASE_URL must use https in production",
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
