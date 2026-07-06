import { v4 as uuidv4 } from "uuid";
import cron from "node-cron";

import { logger } from "#lib/logger";
import { prisma } from "#lib/prisma";
import { getRedis } from "#lib/redis";
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
        user: {
          subscriptions: {
            none: {
              productKey: { in: ["portfolio_pro", "bundle"] },
              OR: [
                {
                  status: { in: ["ACTIVE", "TRIALING"] },
                  OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }],
                },
                { graceEndsAt: { gt: now } },
              ],
            },
          },
        },
      },
      select: {
        id: true,
        subdomain: true,
      },
    });

    if (expiredPublications.length === 0) return;

    const ids = expiredPublications.map((publication) => publication.id);
    const subdomains = expiredPublications.map((publication) => publication.subdomain);

    await prisma.portfolioPublication.updateMany({
      where: { id: { in: ids } },
      data: { status: "SUSPENDED", suspensionReason: "grace_expired", suspendedAt: now },
    });

    await invalidatePublicPortfolioCaches(subdomains);
    void revalidatePublicPortfolios(subdomains);

    logger.info("Suspended expired portfolio grace periods", { count: expiredPublications.length });
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
