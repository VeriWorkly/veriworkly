import { config } from "#config";

import { assertLocalDatabase, runtimeDatabaseUrls } from "#lib/databaseTarget";
import { logger } from "#lib/logger";
import { prisma } from "#lib/prisma";
import { initRedis, closeRedis } from "#lib/redis";

import { syncGitHubStatsFromGitHub } from "#services/github/index";

async function run() {
  try {
    // `npm run sync:github` writes the roadmap tables: a remote database needs
    // --allow-production (V-209). The scheduled job in the server does not come through here.
    assertLocalDatabase("sync:github", runtimeDatabaseUrls());
    await initRedis();
    await prisma.$queryRaw`SELECT 1`;

    if (!config.github.syncEnabled) {
      logger.info("GitHub sync is disabled. Exiting.");
      return;
    }

    const result = await syncGitHubStatsFromGitHub();

    logger.info("Manual GitHub sync completed", {
      issueCount: result.issueCount,
      syncedAt: result.syncedAt,
    });
  } catch (error) {
    logger.error("Manual GitHub sync failed", error);
    process.exitCode = 1;
  } finally {
    await closeRedis();
    await prisma.$disconnect();
  }
}

void run();
