import { Request, Response } from "express";

import prisma from "#utils/prisma";
import { logger } from "#utils/logger";
import { getRedis } from "#utils/redis";
import { createErrorResponse, createSuccessResponse } from "#utils/errors";

export class HealthController {
  /**
   * Comprehensive health check endpoint.
   * Verifies connectivity to the database and Redis.
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */

  static async check(req: Request, res: Response) {
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
