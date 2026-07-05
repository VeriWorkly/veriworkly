import "./polyfills.js";
import throng from "throng";
import { config, isDevelopment } from "#config";

import { logger } from "#utils/logger";
import { prisma } from "#utils/prisma";
import { initRedis, closeRedis } from "#utils/redis";

import { validateAiRuntimeConfig } from "#services/aiPolicy";
import { validateAtsAiRuntimeConfig } from "#services/atsAiPolicy";
import { ensureAdminUserExists, validateAuthRuntimeConfig } from "#auth/runtime";

import { startGitHubSyncJob, stopGitHubSyncJob } from "#jobs/githubSyncJob";
import { startViewsFlushJob, stopViewsFlushJob } from "#jobs/viewsFlushJob";
import { startUsageMetricsJob, stopUsageMetricsJob } from "#jobs/usageMetricsJob";
import { startPortfolioAccessJob, stopPortfolioAccessJob } from "#jobs/portfolioAccessJob";

import { app } from "./app.js";

let serverInstance: ReturnType<typeof app.listen> | null = null;

let exitCode = 0;
let isShuttingDown = false;

// Graceful shutdown function inside worker
async function shutdownWorker(id: number, disconnect: () => void) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Worker ${id}: Shutting down gracefully...`);

  if (serverInstance) {
    logger.info(`Worker ${id}: Stopping HTTP server from accepting new requests...`);

    await new Promise<void>((resolve) => {
      serverInstance!.close(() => {
        logger.info(`Worker ${id}: HTTP server stopped.`);
        resolve();
      });

      // Force timeout shutdown in 10s
      setTimeout(() => {
        logger.warn(`Worker ${id}: Graceful HTTP shutdown timeout reached. Continuing.`);
        resolve();
      }, 10000);
    });
  }

  try {
    if (id === 1) {
      logger.info(`Worker ${id}: Stopping background cron jobs...`);
      stopGitHubSyncJob();
      stopViewsFlushJob();
      stopUsageMetricsJob();
      stopPortfolioAccessJob();
    }

    await closeRedis();
    await prisma.$disconnect();

    logger.info(`Worker ${id}: Disconnecting worker.`);

    disconnect();

    if (exitCode !== 0) process.exit(exitCode);
  } catch (error) {
    logger.error(`Worker ${id}: Error during shutdown:`, error);
    disconnect();
    process.exit(1);
  }
}

// Worker process function
async function startWorker(id: number, disconnect: () => void) {
  logger.info(`Worker ${id} starting...`);

  // Handle process signals in worker
  process.on("SIGTERM", () => void shutdownWorker(id, disconnect));
  process.on("SIGINT", () => void shutdownWorker(id, disconnect));

  // Handle uncaught exceptions and unhandled rejections in worker
  process.on("uncaughtException", (error) => {
    logger.error(`Worker ${id}: Uncaught Exception:`, error);
    exitCode = 1;
    void shutdownWorker(id, disconnect);
  });

  process.on("unhandledRejection", (reason) => {
    logger.error(`Worker ${id}: Unhandled Rejection:`, {
      reason: reason instanceof Error ? reason.message : reason,
      stack: reason instanceof Error ? reason.stack : undefined,
    });

    exitCode = 1;

    void shutdownWorker(id, disconnect);
  });

  try {
    // Each worker initializes its own Redis connection
    await initRedis();
    logger.info(`Worker ${id}: Redis connected`);

    // Worker 1 handles initialization routines and cron jobs
    if (id === 1) {
      await ensureAdminUserExists();

      logger.info(`Worker ${id}: Database connected and admin user checked`);

      startGitHubSyncJob();
      startViewsFlushJob();
      startUsageMetricsJob();
      startPortfolioAccessJob();

      logger.info(`Worker ${id}: Background cron jobs started`);
    }

    // Start Express server in worker
    serverInstance = app.listen(config.port, () => {
      logger.info(`Worker ${id}: Server running on port ${config.port} (${config.nodeEnv})`);

      logger.info(`Worker ${id}: IP/rate-limit configuration`, {
        trustProxy: config.server.trustProxy,
        authIpAddressHeaders: config.auth.ipAddressHeaders,
      });

      if (isDevelopment && id === 1) {
        logger.info(`Allowed origins: ${config.allowedOrigins.join(", ")}`);
        logger.info(`http://localhost:${config.port}/api/v1/health`);
      }
    });

    serverInstance.on("error", (err) => {
      logger.error(`Worker ${id}: Server error:`, err);
      exitCode = 1;
      void shutdownWorker(id, disconnect);
    });
  } catch (error) {
    logger.error(`Worker ${id}: Failed to start:`, error);
    exitCode = 1;
    void shutdownWorker(id, disconnect);
  }
}

// Master process configuration check and bootstrap
function main() {
  // Handle uncaught exceptions and unhandled rejections in master process
  process.on("uncaughtException", (error) => {
    logger.error("Master Process: Uncaught Exception:", error);
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("Master Process: Unhandled Rejection:", {
      reason: reason instanceof Error ? reason.message : reason,
      stack: reason instanceof Error ? reason.stack : undefined,
    });

    process.exit(1);
  });

  try {
    // Validate runtime environment configs in master process first (fail-fast)
    validateAuthRuntimeConfig();
    validateAiRuntimeConfig();
    validateAtsAiRuntimeConfig();

    const { clusteringEnabled, workers } = config.server;

    if (clusteringEnabled) {
      logger.info(`Master process starting cluster with ${workers} workers...`);

      throng({
        worker: startWorker,
        count: workers,
        grace: 15000,
      });
    } else {
      logger.info("Clustering disabled. Starting single process worker...");

      // For single process, mock disconnect as noop
      void startWorker(1, () => {
        process.exit(exitCode);
      });
    }
  } catch (error) {
    logger.error("Failed to bootstrap master process:", error);
    process.exit(1);
  }
}

main();

export { app };
export default app;
