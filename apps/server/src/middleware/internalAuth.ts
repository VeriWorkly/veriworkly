import { Request, Response, NextFunction } from "express";

import { config } from "#config";

import { createErrorResponse } from "#utils/errors";

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
