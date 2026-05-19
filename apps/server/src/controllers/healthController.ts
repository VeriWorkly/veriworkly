import { Request, Response } from "express";

import prisma from "#utils/prisma";
import { logger } from "#utils/logger";
import { getRedis } from "#utils/redis";
import { createErrorResponse, createSuccessResponse } from "#utils/errors";

export class HealthController {
  /**
   * Lightweight liveness endpoint.
   * Does not touch external dependencies, so uptime checks do not wake database compute.
   */

  static async check(_req: Request, res: Response) {
    res.json(
      createSuccessResponse(
        {
          status: "ok",
          timestamp: new Date().toISOString(),
        },
        "Server is healthy",
      ),
    );
  }

  /**
   * Comprehensive readiness endpoint.
   * Verifies connectivity to the database and Redis for manual/deploy-time checks.
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */

  static async ready(_req: Request, res: Response) {
    try {
      await prisma.$queryRaw`SELECT 1`;

      const redis = getRedis();
      await redis.ping();

      res.json(
        createSuccessResponse(
          {
            status: "ok",
            database: "connected",
            redis: "connected",
            timestamp: new Date().toISOString(),
          },
          "Server is healthy",
        ),
      );
    } catch (error) {
      logger.error("Health check failed:", error);
      res.status(503).json(createErrorResponse(503, "Service Unavailable"));
    }
  }
}
