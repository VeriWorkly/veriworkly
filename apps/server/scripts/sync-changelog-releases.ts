import "dotenv/config";

import { assertLocalDatabase, runtimeDatabaseUrls } from "#lib/databaseTarget";
import { logger } from "#lib/logger";
import { prisma } from "#lib/prisma";
import { initRedis, closeRedis } from "#lib/redis";
import { syncChangelogFromGitHubReleases } from "#services/changelog/index";

async function run() {
  try {
    // Writes changelog rows: a remote database needs --allow-production (V-209).
    assertLocalDatabase("sync:changelog", runtimeDatabaseUrls());
    await initRedis();
    await prisma.$queryRaw`SELECT 1`;

    logger.info("Starting live changelog release sync from GitHub...");

    const result = await syncChangelogFromGitHubReleases();

    logger.info("GitHub release sync finished successfully:", result);
  } catch (error) {
    logger.error("GitHub release sync failed:", error);
    process.exitCode = 1;
  } finally {
    await closeRedis();
    await prisma.$disconnect();
    process.exit(process.exitCode ?? 0);
  }
}

void run();
