import { Request, Response, NextFunction, RequestHandler } from "express";

import { config, isDevelopment } from "#config";

import { apiKeyAuth } from "#middleware/apiKeyAuth";
import { getSessionUserFromRequest } from "#middleware/auth";
import { apiKeyRateLimit } from "#middleware/apiKeyRateLimit";

import { logger } from "#utils/logger";

interface FlexibleAuthOptions {
  skipSession?: boolean;
}

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
 *      - Attempt to get Session Auth (sets req.authUser if found) UNLESS skipSession is true.
 *      - Allow the request to continue.
 *    - If NOT whitelisted:
 *      - Enforce API Key Auth (which will fail because no key was provided).
 */
export function flexibleAuth(
  options: FlexibleAuthOptions,
): RequestHandler;
export function flexibleAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void>;
export function flexibleAuth(
  reqOrOptions: Request | FlexibleAuthOptions = {},
  res?: Response,
  next?: NextFunction,
): RequestHandler | Promise<void> {
  // Support both flexibleAuth and flexibleAuth({ skipSession: true })
  if (res && next && (reqOrOptions as Request).headers) {
    return handleFlexibleAuth({}, reqOrOptions as Request, res, next);
  }

  return async (req: Request, res: Response, next: NextFunction) =>
    handleFlexibleAuth(reqOrOptions as FlexibleAuthOptions, req, res, next);
}

async function handleFlexibleAuth(
  options: FlexibleAuthOptions,
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const apiKeyHeader = req.headers["x-api-key"];

  if (apiKeyHeader) {
    apiKeyAuth(req, res, (err) => {
      if (err) return next(err);
      apiKeyRateLimit(req, res, next);
    });
    return;
  }

  const origin = (req.headers.origin as string) || "";
  const referer = (req.headers.referer as string) || "";

  const clientIp = req.ip || "";
  const isLocal = clientIp === "::1" || clientIp === "127.0.0.1" || clientIp.includes("localhost");

  const isWhitelisted =
    (origin && config.allowedOrigins.some((o) => origin.startsWith(o))) ||
    (referer && config.allowedOrigins.some((o) => referer.startsWith(o))) ||
    (!origin && !referer) ||
    (isDevelopment &&
      (isLocal ||
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

    res.status(401).json({
      success: false,
      message:
        "Authentication required. For programmatic or documentation access, please provide an API key in the X-API-Key header.",
      code: "API_KEY_REQUIRED",
    });
    return;
  }

  if (options.skipSession) {
    next();
    return;
  }

  try {
    const user = await getSessionUserFromRequest(req);

    if (user) {
      req.authUser = user;
    }
    next();
    return;
  } catch {
    // If it's a whitelisted origin, we ignore session errors and let the controller decide
    next();
  }
}
