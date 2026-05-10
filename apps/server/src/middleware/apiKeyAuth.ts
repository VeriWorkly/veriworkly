import { Request, Response, NextFunction } from "express";

import { ApiKeyService } from "#services/apiKeyService";

import { logger } from "#utils/logger";
import { createErrorResponse } from "#utils/errors";

/**
 * Middleware to authenticate requests using an API key.
 * It checks for the X-API-Key header.
 */

export const apiKeyAuth = async (req: Request, res: Response, next: NextFunction) => {
  const headerValue = req.headers["x-api-key"];
  const apiKeyHeader = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  if (!apiKeyHeader) {
    return res
      .status(401)
      .json(
        createErrorResponse(401, "API key is missing. Please provide it in the X-API-Key header."),
      );
  }

  const normalizedApiKey = apiKeyHeader.trim();
  const apiKeyPattern = /^vw_[a-f0-9]{64}$/i;

  if (!apiKeyPattern.test(normalizedApiKey)) {
    return res.status(401).json(createErrorResponse(401, "Invalid or inactive API key."));
  }

  try {
    const apiKey = await ApiKeyService.validateKey(normalizedApiKey);

    if (!apiKey) {
      return res.status(401).json(createErrorResponse(401, "Invalid or inactive API key."));
    }

    req.authUser = apiKey.user;
    req.apiKey = apiKey;

    next();
  } catch (error) {
    logger.error("API Key authentication error", error);
    res.status(500).json(createErrorResponse(500, "Internal server error during authentication."));
  }
};
