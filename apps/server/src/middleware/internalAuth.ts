import { Request, Response, NextFunction } from "express";

import { config } from "#config";

import { createErrorResponse } from "#utils/errors";

/**
 * Middleware for internal service-to-service communication.
 * Uses a simple static API key (x-internal-api-key).
 * Primarily used for the GitHub synchronization worker.
 */
export function internalApiKeyMiddleware(req: Request, res: Response, next: NextFunction) {
  const headerKey = req.header("x-internal-api-key");

  if (!config.github.syncApiKey) {
    return res
      .status(500)
      .json(createErrorResponse(500, "Internal sync API key is not configured"));
  }

  if (!headerKey || headerKey !== config.github.syncApiKey) {
    return res.status(401).json(createErrorResponse(401, "Unauthorized"));
  }

  next();
}
