import { NextFunction, Request, Response } from "express";
import { isAPIError } from "better-auth/api";

import { ApiError } from "#lib/errors";
import { logger } from "#lib/logger";

import { convertNodeHeadersToWebHeaders, getSessionFromRequestHeaders } from "#auth/index";

import { cacheGet } from "#lib/redis";
import { cacheSessionUser, getSessionCacheKey } from "#utils/authCache";

export const AUTH_UNAVAILABLE_MESSAGE = "Authentication is temporarily unavailable";

/**
 * V-093: the session store (Postgres, or Redis behind it) failed, so whether the caller is signed
 * in is unknown. A 503 is retryable; a 401 makes the studio sign everyone out on a blip.
 */
export class AuthUnavailableError extends ApiError {
  constructor() {
    super(503, AUTH_UNAVAILABLE_MESSAGE);
    this.name = "AuthUnavailableError";
  }
}

/** better-auth answers a bad or expired session with a 4xx APIError; anything else is the store. */
function isSessionRejection(error: unknown): boolean {
  return isAPIError(error) && error.statusCode < 500;
}

export async function getSessionUserFromRequest(req: Request): Promise<AuthenticatedUser | null> {
  // 1. Per-request cache
  if (req.authUser) return req.authUser;
  if (req._authChecked) return null;

  // 2. Quick check: if no auth cookie is present, skip expensive session lookup
  const cookieHeader = req.headers.cookie || "";

  if (!cookieHeader.includes("veriworkly-auth")) {
    req._authChecked = true;
    return null;
  }

  try {
    // 3. Try Redis cache. The key is derived from the session token alone (so revocation paths,
    //    which only know the token, can clear it). No session-token cookie means nothing to
    //    cache under, not "unauthenticated": better-auth still gets to decide.
    const cacheKey = getSessionCacheKey(cookieHeader);

    const cachedUser = cacheKey ? await cacheGet<AuthenticatedUser>(cacheKey) : null;

    if (cachedUser) {
      req.authUser = cachedUser;
      req._authChecked = true;
      return cachedUser;
    }

    // 4. Perform actual session lookup
    const headers = convertNodeHeadersToWebHeaders(req.headers);
    const session = await getSessionFromRequestHeaders(headers);

    req._authChecked = true;

    if (!session?.user) return null;

    const user = session.user as {
      id?: string;
      email?: string | null;
      name?: string | null;
    };

    if (!user.id) return null;

    const authUser: AuthenticatedUser = {
      id: user.id,
      email: user.email ?? null,
      name: user.name ?? null,
    };

    // Not written if the session was revoked while better-auth was looking it up (V-122).
    if (cacheKey) await cacheSessionUser(cacheKey, authUser);

    req.authUser = authUser;
    return authUser;
  } catch (error) {
    if (isSessionRejection(error)) {
      req._authChecked = true;
      return null;
    }

    // Not cached as "checked": a later lookup in the same request may succeed.
    logger.error("Session lookup failed; auth store unavailable", { error });
    throw new AuthUnavailableError();
  }
}

export async function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  let user: AuthenticatedUser | null = null;
  try {
    user = await getSessionUserFromRequest(req);

    if (!user) throw new ApiError(401, "Authentication required");

    req.authUser = user;
  } catch (error) {
    if (error instanceof ApiError) return next(error);

    return next(new ApiError(401, "Invalid or expired session"));
  }

  next();
}

export function requireAuthUser(req: Request): AuthenticatedUser {
  if (!req.authUser?.id) throw new ApiError(401, "Authentication required");

  return req.authUser;
}
