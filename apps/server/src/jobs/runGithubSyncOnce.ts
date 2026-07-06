import { config } from "#config";

import { logger } from "#lib/logger";
import { prisma } from "#lib/prisma";
import { initRedis, closeRedis } from "#lib/redis";

import { syncGitHubStatsFromGitHub } from "#services/githubService";

async function run() {
  try {
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
