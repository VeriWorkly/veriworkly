import { logger } from "#lib/logger";
import { initRedis, closeRedis, cacheDelByPrefix } from "#lib/redis";

async function main() {
  try {
    logger.info("Initializing Redis...");
    await initRedis();

    logger.info("Deleting Redis keys starting with 'auth:session:'...");
    await cacheDelByPrefix("auth:session:");

    logger.info("Session cache cleared successfully!");
  } catch (error) {
    logger.error("Failed to clear session cache:", error);
    process.exitCode = 1;
  } finally {
    await closeRedis();
  }
}

void main();
