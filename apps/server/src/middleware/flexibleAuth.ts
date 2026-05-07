import { Request, Response, NextFunction } from "express";

import { config, isDevelopment } from "#config";

import { apiKeyAuth } from "#middleware/apiKeyAuth";
import { getSessionUserFromRequest } from "#middleware/auth";
import { apiKeyRateLimit } from "#middleware/apiKeyRateLimit";

import { logger } from "#utils/logger";

/**
 * Middleware that allows authentication via either session OR API key.
 *
 * Flow:
 * 1. If X-API-Key is present:
 *    - Authenticate via API Key.
 *    - Apply API Key Rate Limiting.
 *
 * 2. If no API Key:
 *    - Detect if the request is from a whitelisted origin (our frontend apps).
 *    - If whitelisted:
 *      - Attempt to get Session Auth (sets req.authUser if found).
 *      - Allow the request to continue (controllers will decide if authUser is required).
 *    - If NOT whitelisted:
 *      - Enforce API Key Auth (which will fail because no key was provided).
 */

export const flexibleAuth = async (req: Request, res: Response, next: NextFunction) => {
  const apiKeyHeader = req.headers["x-api-key"];

  if (apiKeyHeader) {
    return apiKeyAuth(req, res, (err) => {
      if (err) return next(err);

      return apiKeyRateLimit(req, res, next);
    });
  }

  const origin = (req.headers.origin as string) || "";
  const referer = (req.headers.referer as string) || "";

  const clientIp = req.ip || "";
  const isLocal = clientIp === "::1" || clientIp === "127.0.0.1" || clientIp.includes("localhost");

  const isWhitelisted =
    (origin && config.allowedOrigins.some((o) => origin.startsWith(o))) ||
    (referer && config.allowedOrigins.some((o) => referer.startsWith(o))) ||
    (isDevelopment &&
      (isLocal ||
        (!origin && !referer) ||
        referer.includes("localhost:") ||
        origin.includes("localhost:") ||
        referer.includes("127.0.0.1:") ||
        origin.includes("127.0.0.1:")));

  if (!isWhitelisted) {
    logger.warn("Request rejected by flexibleAuth: Not whitelisted and no API key", {
      path: req.path,
      origin,
      referer,
      clientIp,
      isDevelopment,
    });

    return res.status(401).json({
      success: false,
      message:
        "Authentication required. For programmatic or documentation access, please provide an API key in the X-API-Key header.",
      code: "API_KEY_REQUIRED",
    });
  }

  try {
    const user = await getSessionUserFromRequest(req);

    if (user) {
      req.authUser = user;
    }
    return next();
  } catch {
    // If it's a whitelisted origin, we ignore session errors and let the controller decide (e.g., if it's a public route)
    return next();
  }
};
