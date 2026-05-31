import { v4 as uuidv4 } from "uuid";
import cron from "node-cron";

import { logger } from "#utils/logger";
import { prisma } from "#utils/prisma";
import { getRedis } from "#utils/redis";
import { PortfolioAssetService } from "#services/portfolioAssetService";
import {
  invalidatePublicPortfolioCaches,
  revalidatePublicPortfolios,
} from "#utils/portfolioPublicationCache";

let job: ReturnType<typeof cron.schedule> | null = null;

const RELEASE_LOCK_LUA_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
  else
      return 0
  end
`;

async function suspendExpiredGracePeriods() {
  const redis = getRedis();
  const lockKey = "portfolio:suspension:lock";
  const lockValue = uuidv4();
  const lockTTL = 300; // 5 minutes

  let lockAcquired = false;

  try {
    const lockResult = await redis.set(lockKey, lockValue, {
      NX: true,
      EX: lockTTL,
    });

    lockAcquired = lockResult === "OK";

    if (!lockAcquired) {
      logger.debug("Portfolio grace suspension lock already held by another instance. Skipping.");
      return;
    }

    const now = new Date();
    const expiredPublications = await prisma.portfolioPublication.findMany({
      where: {
        status: "GRACE",
      },
      select: {
        id: true,
        subdomain: true,
        user: {
          select: {
            subscriptions: {
              orderBy: { updatedAt: "desc" },
              take: 1,
              select: { graceEndsAt: true },
            },
          },
        },
      },
    });

    const expired = expiredPublications.filter((publication) => {
      const graceEndsAt = publication.user.subscriptions[0]?.graceEndsAt;
      return !graceEndsAt || graceEndsAt <= now;
    });

    if (expired.length === 0) return;

    const ids = expired.map((publication) => publication.id);
    const subdomains = expired.map((publication) => publication.subdomain);

    await prisma.portfolioPublication.updateMany({
      where: { id: { in: ids } },
      data: { status: "SUSPENDED", suspensionReason: "grace_expired", suspendedAt: now },
    });

    await invalidatePublicPortfolioCaches(subdomains);
    void revalidatePublicPortfolios(subdomains);

    logger.info("Suspended expired portfolio grace periods", { count: expired.length });
  } finally {
    if (lockAcquired) {
      try {
        await redis.eval(RELEASE_LOCK_LUA_SCRIPT, {
          keys: [lockKey],
          arguments: [lockValue],
        });
      } catch (err) {
        logger.error("Failed to release portfolio suspension lock", err);
      }
    }
  }
}

function runPortfolioAccessSweep() {
  void suspendExpiredGracePeriods().catch((error) => {
    logger.error("Failed to suspend expired portfolio grace periods", {
      error: error instanceof Error ? error.message : error,
    });
  });

  void PortfolioAssetService.cleanupStaleAssets().catch((error) => {
    logger.error("Failed to cleanup stale pending portfolio assets", {
      error: error instanceof Error ? error.message : error,
    });
  });
}

export function startPortfolioAccessJob() {
  runPortfolioAccessSweep();
  job = cron.schedule("0 * * * *", runPortfolioAccessSweep);
}

export function stopPortfolioAccessJob() {
  job?.stop();
  job = null;
}
