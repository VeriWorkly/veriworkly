import { NextFunction, Request, Response } from "express";

import { ApiError } from "#utils/errors";
import { config } from "#config";

import { convertNodeHeadersToWebHeaders, getSessionFromRequestHeaders } from "#auth/index";

import { cacheGet, cacheSet } from "#utils/redis";
import { getSessionCacheKey } from "#utils/authCache";

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
    // 3. Try Redis cache (hash a stable session fingerprint to avoid key churn)
    const cacheKey = getSessionCacheKey(cookieHeader);

    if (!cacheKey) {
      req._authChecked = true;
      return null;
    }

    const cachedUser = await cacheGet<AuthenticatedUser>(cacheKey);

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

    await cacheSet(cacheKey, authUser, config.auth.sessionCacheMaxAgeSeconds);

    req.authUser = authUser;
    return authUser;
  } catch {
    req._authChecked = true;
    return null;
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
