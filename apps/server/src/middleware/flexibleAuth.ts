import { Request, Response, NextFunction, RequestHandler } from "express";

import { config, isDevelopment } from "#config";

import { apiKeyAuth } from "#middleware/apiKeyAuth";
import { AUTH_UNAVAILABLE_MESSAGE, getSessionUserFromRequest } from "#middleware/auth";
import { apiKeyRateLimit } from "#middleware/apiKeyRateLimit";
import { isWildcardPortfolioOrigin } from "#middleware/cors";

import { logger } from "#lib/logger";
import { createErrorResponse } from "#lib/errors";
import { getRequestIpDetails } from "#utils/requestIp";

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
 *    - Accept valid session cookies from first-party server-to-server requests,
 *      even when Origin/Referer headers are absent.
 *    - Otherwise detect if the request is from a whitelisted origin (our frontend apps).
 *    - If whitelisted:
 *      - Attempt to get Session Auth (sets req.authUser if found) UNLESS skipSession is true.
 *      - Allow the request to continue.
 *    - If NOT whitelisted:
 *      - Enforce API Key Auth (which will fail because no key was provided).
 *
 * The origin check is a convenience gate, not a security boundary (V-256): `Origin` and
 * `Referer` are only trustworthy from a browser, so any other client that sends the studio's
 * origin passes as an anonymous first-party caller. It exists to steer integrations to API keys.
 * Anonymous callers are bounded by the per-IP rate limit and each route's own quota; nothing that
 * spends money or reads an account may rely on this gate (those routes require a session or key).
 */
export function flexibleAuth(options: FlexibleAuthOptions): RequestHandler;
export function flexibleAuth(req: Request, res: Response, next: NextFunction): Promise<void>;
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
  const authorizationHeader = req.headers.authorization;
  const bearerApiKey =
    typeof authorizationHeader === "string" && /^Bearer\s+\S+/i.test(authorizationHeader);

  if (apiKeyHeader || bearerApiKey) {
    await apiKeyAuth(req, res, (err) => {
      if (err) return next(err);
      apiKeyRateLimit(req, res, next).catch(next);
    });
    return;
  }

  const origin = (req.headers.origin as string) || "";
  const referer = (req.headers.referer as string) || "";

  const clientIp = getRequestIpDetails(req).resolvedIp;
  const isLocal = clientIp === "::1" || clientIp === "127.0.0.1" || clientIp.includes("localhost");

  let parsedOrigin = "";

  if (origin) {
    try {
      parsedOrigin = new URL(origin).origin;
    } catch {
      // Invalid URL/origin
    }
  }

  let parsedRefererOrigin = "";

  if (referer) {
    try {
      parsedRefererOrigin = new URL(referer).origin;
    } catch {
      // Invalid URL
    }
  }

  if (
    !options.skipSession &&
    !origin &&
    !referer &&
    req.headers.cookie?.includes("veriworkly-auth")
  ) {
    try {
      const user = await getSessionUserFromRequest(req);

      if (user) {
        req.authUser = user;
        next();
        return;
      }

      res
        .status(401)
        .json(createErrorResponse(401, "Authentication required", { code: "AUTH_REQUIRED" }));
      return;
    } catch {
      // The session store failed (logged in getSessionUserFromRequest): retryable, not a sign-out.
      res
        .status(503)
        .json(createErrorResponse(503, AUTH_UNAVAILABLE_MESSAGE, { code: "AUTH_UNAVAILABLE" }));
      return;
    }
  }

  const isWhitelisted =
    (parsedOrigin && config.allowedOrigins.includes(parsedOrigin)) ||
    (parsedRefererOrigin && config.allowedOrigins.includes(parsedRefererOrigin)) ||
    isWildcardPortfolioOrigin(parsedOrigin, config.allowedOrigins) ||
    isWildcardPortfolioOrigin(parsedRefererOrigin, config.allowedOrigins) ||
    (isDevelopment &&
      (isLocal ||
        (referer && referer.includes("localhost:")) ||
        (origin && origin.includes("localhost:")) ||
        (referer && referer.includes("127.0.0.1:")) ||
        (origin && origin.includes("127.0.0.1:"))));

  if (!isWhitelisted) {
    logger.warn("Request rejected by flexibleAuth: Not whitelisted and no API key", {
      path: req.path,
      origin,
      referer,
      clientIp,
      isDevelopment,
    });

    // Standard error envelope (V-136); the old top-level `code` now lives in `details.code`.
    res
      .status(401)
      .json(
        createErrorResponse(
          401,
          "Authentication required. For programmatic or documentation access, please provide an API key in the X-API-Key header or Authorization bearer token.",
          { code: "API_KEY_REQUIRED" },
        ),
      );
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
      next();
      return;
    }

    next();
    return;
  } catch {
    // A session cookie was sent but the store could not be read. Carrying on as anonymous would
    // turn every signed-in route into a 401 and sign the studio out (V-093).
    res
      .status(503)
      .json(createErrorResponse(503, AUTH_UNAVAILABLE_MESSAGE, { code: "AUTH_UNAVAILABLE" }));
  }
}
